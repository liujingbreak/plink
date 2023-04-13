"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.forkFile = exports.workDirChangedByCli = exports.isWin32 = void 0;
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const log4js_1 = __importDefault(require("log4js"));
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const misc_1 = require("./utils/misc");
exports.isWin32 = os_1.default.platform().indexOf('win32') >= 0;
const log = log4js_1.default.getLogger('plink.fork-for-preserver-symlink');
function workDirChangedByCli() {
    const argv = process.argv.slice(2);
    const foundCmdOptIdx = argv.findIndex(arg => arg === '--cwd' || arg === '--space');
    const workdir = foundCmdOptIdx >= 0 ? path_1.default.resolve(misc_1.plinkEnv.rootDir, argv[foundCmdOptIdx + 1]) : null;
    if (workdir) {
        argv.splice(foundCmdOptIdx, 2);
        // process.env.PLINK_WORK_DIR = workdir;
    }
    return { workdir, argv };
}
exports.workDirChangedByCli = workDirChangedByCli;
/**
 * @returns promise<number> if a child process is forked to apply "--preserve-symlinks", or `undefined` no new child process is created
 */
function run(moduleName, opts) {
    if ((process.env.NODE_PRESERVE_SYMLINKS !== '1' && process.execArgv.indexOf('--preserve-symlinks') < 0)) {
        return forkFile(moduleName, opts || {}).exited;
    }
    // In case it is already under "preserve-symlinks" mode
    const { workdir } = workDirChangedByCli();
    const { runModule } = require('./fork-module-wrapper');
    const file = resolveTargetModule(moduleName, workdir || process.env.PLINK_WORK_DIR || process.cwd());
    runModule(file, opts === null || opts === void 0 ? void 0 : opts.stateExitAction);
}
exports.default = run;
/** run in main process, mayby in PM2 as a cluster process,
* Unlike `run(modulename, opts)` this function will always fork a child process, it is conditionally executed inside `run(modulename, opts)`
*/
function forkFile(moduleName, opts) {
    let recovered = false;
    const { initProcess, exitHooks } = require('./utils/bootstrap-process');
    const { stateFactory } = require('./store');
    exitHooks.push(() => removed.then((removeResolved) => {
        if (recovered)
            return;
        recovered = true;
        for (const { link, content } of removeResolved) {
            if (!fs_1.default.existsSync(link)) {
                void fs_1.default.promises.symlink(content, link, exports.isWin32 ? 'junction' : 'dir');
                log.info('recover ' + link);
            }
        }
    }));
    process.env.__plinkLogMainPid = '-1';
    initProcess('none');
    // removeNodeModuleSymlink needs Editor-helper, and editor-helper needs store being configured!
    stateFactory.configureStore();
    const removed = removeNodeModuleSymlink();
    const { workdir, argv } = workDirChangedByCli();
    // process.execArgv.push('--preserve-symlinks-main', '--preserve-symlinks');
    const foundDebugOptIdx = argv.findIndex(arg => arg === '--inspect' || arg === '--inspect-brk');
    const env = process.env;
    if (foundDebugOptIdx >= 0) {
        env.NODE_OPTIONS = env.NODE_OPTIONS ? env.NODE_OPTIONS + ' ' + argv[foundDebugOptIdx] : argv[foundDebugOptIdx];
        argv.splice(foundDebugOptIdx, 1);
    }
    const debugOptIdx = argv.findIndex(arg => arg === '--debug');
    if (debugOptIdx >= 0) {
        env.NODE_OPTIONS = env.NODE_OPTIONS ? env.NODE_OPTIONS + ' --inspect-brk' : '--inspect-brk';
        argv.splice(debugOptIdx, 1);
    }
    // env.__plink_fork_main = moduleName;
    if (workdir)
        env.PLINK_WORK_DIR = workdir;
    const file = resolveTargetModule(moduleName, workdir || process.env.PLINK_WORK_DIR || process.cwd());
    const cp = (0, child_process_1.fork)(path_1.default.resolve(misc_1.plinkEnv.rootDir, 'node_modules/@wfh/plink/wfh/dist/fork-module-wrapper.js'), argv, Object.assign({ execArgv: process.execArgv.concat(['--preserve-symlinks-main', '--preserve-symlinks']), stdio: 'inherit' }, (opts ? opts : {})));
    cp.send(JSON.stringify({ type: 'plink-fork-wrapper', opts, moduleFile: file }));
    if (opts === null || opts === void 0 ? void 0 : opts.handleShutdownMsg) {
        const processMsg$ = rx.fromEventPattern(h => process.on('message', h), h => process.off('message', h));
        processMsg$.pipe(op.filter(msg => msg === 'shutdown'), op.take(1), op.tap(() => {
            cp.send('shutdown');
        })).subscribe();
    }
    const onChildExit$ = new rx.ReplaySubject();
    cp.once('exit', code => {
        // if (code !== 0) {
        // console.log('child process exits:', code);
        // }
        onChildExit$.next(code || 0);
        onChildExit$.complete();
    });
    exitHooks.push(() => onChildExit$);
    return {
        childProcess: cp,
        exited: onChildExit$.toPromise()
    };
}
exports.forkFile = forkFile;
/**
 * Temporarily rename <pkg>/node_modules to another name
 * @returns
 */
async function removeNodeModuleSymlink() {
    const { getState } = require('./editor-helper');
    const links = getState().nodeModuleSymlinks;
    if (links == null)
        return Promise.resolve([]);
    const dones = Array.from(links.values()).map(async (link) => {
        let stat;
        try {
            stat = await fs_1.default.promises.lstat(link);
            if (!stat.isSymbolicLink())
                return null;
        }
        catch (ex) {
            return null;
        }
        const content = fs_1.default.readlinkSync(link);
        await fs_1.default.promises.unlink(link);
        return { link, content };
    });
    const res = await Promise.all(dones);
    return res.filter(item => item != null);
}
/**
 *
 * @param tModule module name like "@foo/bar/dist/index.js", "@foo/bar/dist/index"
 * @param workDir
 * @returns complete resolved path like "/Users/superhero/project/server-space/node_modules/@foo/bar/dist/index.js"
 */
function resolveTargetModule(tModule, workDir) {
    if (!path_1.default.extname(tModule)) {
        tModule += '.js';
    }
    const root = path_1.default.parse(workDir).root;
    let dir = workDir;
    let target;
    for (;;) {
        target = path_1.default.resolve(dir, 'node_modules', tModule);
        if (fs_1.default.existsSync(target))
            break;
        else {
            if (dir === root) {
                throw new Error('Can not require module ' + tModule + ' from directory ' + workDir);
            }
            dir = path_1.default.dirname(dir);
        }
    }
    return target;
}
//# sourceMappingURL=fork-for-preserve-symlink.js.map