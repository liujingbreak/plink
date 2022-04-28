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
exports.workDirChangedByCli = exports.isWin32 = void 0;
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const worker_threads_1 = require("worker_threads");
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const log4js_1 = __importDefault(require("log4js"));
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const chalk_1 = __importDefault(require("chalk"));
const misc_1 = require("./utils/misc");
exports.isWin32 = os_1.default.platform().indexOf('win32') >= 0;
const log = log4js_1.default.getLogger('plink.fork-for-preserver-symlink');
function workDirChangedByCli() {
    let argv = process.argv.slice(2);
    const foundCmdOptIdx = argv.findIndex(arg => arg === '--cwd' || arg === '--space');
    const workdir = foundCmdOptIdx >= 0 ? path_1.default.resolve(misc_1.plinkEnv.rootDir, argv[foundCmdOptIdx + 1]) : null;
    if (workdir) {
        argv.splice(foundCmdOptIdx, 2);
        // process.env.PLINK_WORK_DIR = workdir;
    }
    return { workdir, argv };
}
exports.workDirChangedByCli = workDirChangedByCli;
function run(moduleName, opts, bootStrap) {
    if ((process.env.NODE_PRESERVE_SYMLINKS !== '1' && process.execArgv.indexOf('--preserve-symlinks') < 0)) {
        void forkFile(moduleName, opts.handleShutdownMsg != null ? opts.handleShutdownMsg : false);
        return;
    }
    const { initProcess, exitHooks } = require('./utils/bootstrap-process');
    initProcess(opts.stateExitAction || 'none', (code) => {
        // eslint-disable-next-line no-console
        console.log(`Plink process ${process.pid} thread ${worker_threads_1.threadId} ` +
            chalk_1.default.green(`${code !== 0 ? 'ends with failures' : 'ends'}`));
    }, opts.handleShutdownMsg);
    // Must be invoked after initProcess, otherwise store is not ready (empty)
    const funcs = bootStrap();
    if (Array.isArray(funcs))
        exitHooks.push(...funcs);
}
exports.default = run;
/** run in main process */
async function forkFile(moduleName, handleShutdownMsg) {
    let recovered = false;
    const { initProcess, exitHooks } = require('./utils/bootstrap-process');
    const { stateFactory } = require('./store');
    let cp;
    initProcess('none', () => {
        recoverNodeModuleSymlink();
    });
    // removeNodeModuleSymlink needs Editor-helper, and editor-helper needs store being configured!
    stateFactory.configureStore();
    const removed = await removeNodeModuleSymlink();
    const { workdir, argv } = workDirChangedByCli();
    process.execArgv.push('--preserve-symlinks-main', '--preserve-symlinks');
    const foundDebugOptIdx = argv.findIndex(arg => arg === '--inspect' || arg === '--inspect-brk');
    const env = Object.assign({}, process.env);
    if (foundDebugOptIdx >= 0) {
        env.NODE_OPTIONS = env.NODE_OPTIONS ? env.NODE_OPTIONS + ' ' + argv[foundDebugOptIdx] : argv[foundDebugOptIdx];
        argv.splice(foundDebugOptIdx, 1);
    }
    const debugOptIdx = argv.findIndex(arg => arg === '--debug');
    if (debugOptIdx >= 0) {
        env.NODE_OPTIONS = env.NODE_OPTIONS ? env.NODE_OPTIONS + ' --inspect-brk' : '--inspect-brk';
        argv.splice(debugOptIdx, 1);
    }
    env.__plink_fork_main = moduleName;
    if (workdir)
        env.PLINK_WORK_DIR = workdir;
    cp = (0, child_process_1.fork)(path_1.default.resolve(__dirname, 'fork-preserve-symlink-main.js'), argv, {
        env,
        stdio: 'inherit'
    });
    if (handleShutdownMsg) {
        const processMsg$ = rx.fromEventPattern(h => process.on('message', h), h => process.off('message', h));
        // const processExit$ = rx.fromEventPattern( h => process.on('SIGINT', h), h => process.off('SIGINT', h));
        rx.merge(processMsg$.pipe(op.filter(msg => msg === 'shutdown'))).pipe(op.take(1), op.tap(() => {
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
    function recoverNodeModuleSymlink() {
        if (recovered)
            return;
        recovered = true;
        for (const { link, content } of removed) {
            if (!fs_1.default.existsSync(link)) {
                void fs_1.default.promises.symlink(content, link, exports.isWin32 ? 'junction' : 'dir');
                log.info('recover ' + link);
            }
        }
    }
}
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9yay1mb3ItcHJlc2VydmUtc3ltbGluay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2ZvcmstZm9yLXByZXNlcnZlLXN5bWxpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnREFBd0I7QUFDeEIsaURBQWlEO0FBQ2pELG1EQUF3QztBQUN4Qyw0Q0FBb0I7QUFDcEIsNENBQW9CO0FBQ3BCLG9EQUE0QjtBQUM1Qix5Q0FBMkI7QUFDM0IsbURBQXFDO0FBQ3JDLGtEQUEwQjtBQUMxQix1Q0FBc0M7QUFLekIsUUFBQSxPQUFPLEdBQUcsWUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDM0QsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsa0NBQWtDLENBQUMsQ0FBQztBQUVqRSxTQUFnQixtQkFBbUI7SUFDakMsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakMsTUFBTSxjQUFjLEdBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxPQUFPLElBQUksR0FBRyxLQUFLLFNBQVMsQ0FBQyxDQUFDO0lBQ3BGLE1BQU0sT0FBTyxHQUFHLGNBQWMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsZUFBUSxDQUFDLE9BQU8sRUFBRyxJQUFJLENBQUMsY0FBYyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztJQUN2RyxJQUFJLE9BQU8sRUFBRTtRQUNYLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQy9CLHdDQUF3QztLQUN6QztJQUNELE9BQU8sRUFBQyxPQUFPLEVBQUUsSUFBSSxF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SUFBSSxLQUFLLElBQUksSUFBSTtRQUNmLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUU3QixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUMsSUFBSSxFQUFDLEVBQUU7UUFDeEQsSUFBSSxJQUEwQixDQUFDO1FBQy9CLElBQUk7WUFDRixJQUFJLEdBQUcsTUFBTSxZQUFFLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN2QyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRTtnQkFDeEIsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ1gsT0FBTyxJQUFJLENBQUM7U0FDYjtRQUVELE1BQU0sT0FBTyxHQUFHLFlBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEMsTUFBTSxZQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMvQixPQUFPLEVBQUMsSUFBSSxFQUFFLE9BQU8sRUFBQyxDQUFDO0lBQ3pCLENBQUMsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxHQUFHLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3JDLE9BQU8sR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksSUFBSSxJQUFJLENBQXNDLENBQUM7QUFDL0UsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtmb3JrLCBDaGlsZFByb2Nlc3N9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHt0aHJlYWRJZH0gZnJvbSAnd29ya2VyX3RocmVhZHMnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQge3BsaW5rRW52fSBmcm9tICcuL3V0aWxzL21pc2MnO1xuaW1wb3J0ICogYXMgX2VkaXRvckhlbHBlciBmcm9tICcuL2VkaXRvci1oZWxwZXInO1xuaW1wb3J0ICogYXMgYm9vdHN0cmFwUHJvYyBmcm9tICcuL3V0aWxzL2Jvb3RzdHJhcC1wcm9jZXNzJztcbmltcG9ydCAqIGFzIHN0b3JlIGZyb20gJy4vc3RvcmUnO1xuXG5leHBvcnQgY29uc3QgaXNXaW4zMiA9IG9zLnBsYXRmb3JtKCkuaW5kZXhPZignd2luMzInKSA+PSAwO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuZm9yay1mb3ItcHJlc2VydmVyLXN5bWxpbmsnKTtcblxuZXhwb3J0IGZ1bmN0aW9uIHdvcmtEaXJDaGFuZ2VkQnlDbGkoKSB7XG4gIGxldCBhcmd2ID0gcHJvY2Vzcy5hcmd2LnNsaWNlKDIpO1xuICBjb25zdCBmb3VuZENtZE9wdElkeCA9ICBhcmd2LmZpbmRJbmRleChhcmcgPT4gYXJnID09PSAnLS1jd2QnIHx8IGFyZyA9PT0gJy0tc3BhY2UnKTtcbiAgY29uc3Qgd29ya2RpciA9IGZvdW5kQ21kT3B0SWR4ID49IDAgPyBQYXRoLnJlc29sdmUocGxpbmtFbnYucm9vdERpciwgIGFyZ3ZbZm91bmRDbWRPcHRJZHggKyAxXSkgOiBudWxsO1xuICBpZiAod29ya2Rpcikge1xuICAgIGFyZ3Yuc3BsaWNlKGZvdW5kQ21kT3B0SWR4LCAyKTtcbiAgICAvLyBwcm9jZXNzLmVudi5QTElOS19XT1JLX0RJUiA9IHdvcmtkaXI7XG4gIH1cbiAgcmV0dXJuIHt3b3JrZGlyLCBhcmd2fTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcnVuKG1vZHVsZU5hbWU6IHN0cmluZywgb3B0czoge1xuICAgIHN0YXRlRXhpdEFjdGlvbj86ICdzYXZlJyB8ICdzZW5kJyB8ICdub25lJztcbiAgICBoYW5kbGVTaHV0ZG93bk1zZz86IGJvb2xlYW47XG4gIH0sXG4gIGJvb3RTdHJhcDogKCkgPT4gKChBcnJheTwoKSA9PiByeC5PYnNlcnZhYmxlSW5wdXQ8dW5rbm93bj4+KSB8IHZvaWQpKSB7XG5cbiAgaWYgKChwcm9jZXNzLmVudi5OT0RFX1BSRVNFUlZFX1NZTUxJTktTICE9PSAnMScgJiYgcHJvY2Vzcy5leGVjQXJndi5pbmRleE9mKCctLXByZXNlcnZlLXN5bWxpbmtzJykgPCAwKSkge1xuICAgIHZvaWQgZm9ya0ZpbGUobW9kdWxlTmFtZSwgb3B0cy5oYW5kbGVTaHV0ZG93bk1zZyAhPSBudWxsID8gb3B0cy5oYW5kbGVTaHV0ZG93bk1zZyA6IGZhbHNlKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCB7aW5pdFByb2Nlc3MsIGV4aXRIb29rc30gPSByZXF1aXJlKCcuL3V0aWxzL2Jvb3RzdHJhcC1wcm9jZXNzJykgYXMgdHlwZW9mIGJvb3RzdHJhcFByb2M7XG5cbiAgaW5pdFByb2Nlc3Mob3B0cy5zdGF0ZUV4aXRBY3Rpb24gfHwgJ25vbmUnLCAoY29kZSkgPT4ge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coYFBsaW5rIHByb2Nlc3MgJHtwcm9jZXNzLnBpZH0gdGhyZWFkICR7dGhyZWFkSWR9IGAgK1xuICAgICAgY2hhbGsuZ3JlZW4oYCR7Y29kZSAhPT0gMCA/ICdlbmRzIHdpdGggZmFpbHVyZXMnIDogJ2VuZHMnfWApKTtcbiAgfSwgb3B0cy5oYW5kbGVTaHV0ZG93bk1zZyk7XG5cbiAgLy8gTXVzdCBiZSBpbnZva2VkIGFmdGVyIGluaXRQcm9jZXNzLCBvdGhlcndpc2Ugc3RvcmUgaXMgbm90IHJlYWR5IChlbXB0eSlcbiAgY29uc3QgZnVuY3MgPSBib290U3RyYXAoKTtcbiAgaWYgKEFycmF5LmlzQXJyYXkoZnVuY3MpKVxuICAgIGV4aXRIb29rcy5wdXNoKC4uLmZ1bmNzKTtcbn1cblxuLyoqIHJ1biBpbiBtYWluIHByb2Nlc3MgKi9cbmFzeW5jIGZ1bmN0aW9uIGZvcmtGaWxlKG1vZHVsZU5hbWU6IHN0cmluZywgaGFuZGxlU2h1dGRvd25Nc2c6IGJvb2xlYW4pIHtcbiAgbGV0IHJlY292ZXJlZCA9IGZhbHNlO1xuICBjb25zdCB7aW5pdFByb2Nlc3MsIGV4aXRIb29rc30gPSByZXF1aXJlKCcuL3V0aWxzL2Jvb3RzdHJhcC1wcm9jZXNzJykgYXMgdHlwZW9mIGJvb3RzdHJhcFByb2M7XG4gIGNvbnN0IHtzdGF0ZUZhY3Rvcnl9ID0gcmVxdWlyZSgnLi9zdG9yZScpIGFzIHR5cGVvZiBzdG9yZTtcbiAgbGV0IGNwOiBDaGlsZFByb2Nlc3MgfCB1bmRlZmluZWQ7XG5cbiAgaW5pdFByb2Nlc3MoJ25vbmUnLCAoKSA9PiB7XG4gICAgcmVjb3Zlck5vZGVNb2R1bGVTeW1saW5rKCk7XG4gIH0pO1xuXG4gIC8vIHJlbW92ZU5vZGVNb2R1bGVTeW1saW5rIG5lZWRzIEVkaXRvci1oZWxwZXIsIGFuZCBlZGl0b3ItaGVscGVyIG5lZWRzIHN0b3JlIGJlaW5nIGNvbmZpZ3VyZWQhXG4gIHN0YXRlRmFjdG9yeS5jb25maWd1cmVTdG9yZSgpO1xuICBjb25zdCByZW1vdmVkID0gYXdhaXQgcmVtb3ZlTm9kZU1vZHVsZVN5bWxpbmsoKTtcblxuICBjb25zdCB7d29ya2RpciwgYXJndn0gPSB3b3JrRGlyQ2hhbmdlZEJ5Q2xpKCk7XG5cbiAgcHJvY2Vzcy5leGVjQXJndi5wdXNoKCctLXByZXNlcnZlLXN5bWxpbmtzLW1haW4nLCAnLS1wcmVzZXJ2ZS1zeW1saW5rcycpO1xuICBjb25zdCBmb3VuZERlYnVnT3B0SWR4ID0gYXJndi5maW5kSW5kZXgoYXJnID0+IGFyZyA9PT0gJy0taW5zcGVjdCcgfHwgYXJnID09PSAnLS1pbnNwZWN0LWJyaycpO1xuXG4gIGNvbnN0IGVudjoge1trZXk6IHN0cmluZ106IHN0cmluZyB8IHVuZGVmaW5lZH0gPSB7Li4ucHJvY2Vzcy5lbnZ9O1xuICBpZiAoZm91bmREZWJ1Z09wdElkeCA+PSAwKSB7XG4gICAgZW52Lk5PREVfT1BUSU9OUyA9IGVudi5OT0RFX09QVElPTlMgPyBlbnYuTk9ERV9PUFRJT05TICsgJyAnICsgYXJndltmb3VuZERlYnVnT3B0SWR4XSA6IGFyZ3ZbZm91bmREZWJ1Z09wdElkeF07XG4gICAgYXJndi5zcGxpY2UoZm91bmREZWJ1Z09wdElkeCwgMSk7XG4gIH1cbiAgY29uc3QgZGVidWdPcHRJZHggPSBhcmd2LmZpbmRJbmRleChhcmcgPT4gYXJnID09PSAnLS1kZWJ1ZycpO1xuICBpZiAoZGVidWdPcHRJZHggPj0gMCkge1xuICAgIGVudi5OT0RFX09QVElPTlMgPSBlbnYuTk9ERV9PUFRJT05TID8gZW52Lk5PREVfT1BUSU9OUyArICcgLS1pbnNwZWN0LWJyaycgOiAnLS1pbnNwZWN0LWJyayc7XG4gICAgYXJndi5zcGxpY2UoZGVidWdPcHRJZHgsIDEpO1xuICB9XG5cbiAgZW52Ll9fcGxpbmtfZm9ya19tYWluID0gbW9kdWxlTmFtZTtcblxuICBpZiAod29ya2RpcilcbiAgICBlbnYuUExJTktfV09SS19ESVIgPSB3b3JrZGlyO1xuXG4gIGNwID0gZm9yayhQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnZm9yay1wcmVzZXJ2ZS1zeW1saW5rLW1haW4uanMnKSwgYXJndiwge1xuICAgIGVudixcbiAgICBzdGRpbzogJ2luaGVyaXQnXG4gIH0pO1xuXG4gIGlmIChoYW5kbGVTaHV0ZG93bk1zZykge1xuICAgIGNvbnN0IHByb2Nlc3NNc2ckID0gcnguZnJvbUV2ZW50UGF0dGVybjxzdHJpbmc+KGggPT4gcHJvY2Vzcy5vbignbWVzc2FnZScsIGgpLCBoID0+IHByb2Nlc3Mub2ZmKCdtZXNzYWdlJywgaCkpO1xuICAgIC8vIGNvbnN0IHByb2Nlc3NFeGl0JCA9IHJ4LmZyb21FdmVudFBhdHRlcm4oIGggPT4gcHJvY2Vzcy5vbignU0lHSU5UJywgaCksIGggPT4gcHJvY2Vzcy5vZmYoJ1NJR0lOVCcsIGgpKTtcblxuICAgIHJ4Lm1lcmdlKHByb2Nlc3NNc2ckLnBpcGUoXG4gICAgICBvcC5maWx0ZXIobXNnID0+IG1zZyA9PT0gJ3NodXRkb3duJylcbiAgICApKS5waXBlKFxuICAgICAgb3AudGFrZSgxKSxcbiAgICAgIG9wLnRhcCgoKSA9PiB7XG4gICAgICAgIGNwIS5zZW5kKCdzaHV0ZG93bicpO1xuICAgICAgfSlcbiAgICApLnN1YnNjcmliZSgpO1xuICB9XG5cbiAgY29uc3Qgb25DaGlsZEV4aXQkID0gbmV3IHJ4LlJlcGxheVN1YmplY3Q8bnVtYmVyPigpO1xuICBjcC5vbmNlKCdleGl0JywgY29kZSA9PiB7XG4gICAgLy8gaWYgKGNvZGUgIT09IDApIHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKCdjaGlsZCBwcm9jZXNzIGV4aXRzOicsIGNvZGUpO1xuICAgIC8vIH1cbiAgICBvbkNoaWxkRXhpdCQubmV4dChjb2RlIHx8IDApO1xuICAgIG9uQ2hpbGRFeGl0JC5jb21wbGV0ZSgpO1xuICB9KTtcbiAgZXhpdEhvb2tzLnB1c2goKCkgPT4gb25DaGlsZEV4aXQkKTtcblxuICBmdW5jdGlvbiByZWNvdmVyTm9kZU1vZHVsZVN5bWxpbmsoKSB7XG4gICAgaWYgKHJlY292ZXJlZClcbiAgICAgIHJldHVybjtcbiAgICByZWNvdmVyZWQgPSB0cnVlO1xuXG4gICAgZm9yIChjb25zdCB7bGluaywgY29udGVudH0gb2YgcmVtb3ZlZCkge1xuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGxpbmspKSB7XG4gICAgICAgIHZvaWQgZnMucHJvbWlzZXMuc3ltbGluayhjb250ZW50LCBsaW5rLCBpc1dpbjMyID8gJ2p1bmN0aW9uJyA6ICdkaXInKTtcbiAgICAgICAgbG9nLmluZm8oJ3JlY292ZXIgJyArIGxpbmspO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFRlbXBvcmFyaWx5IHJlbmFtZSA8cGtnPi9ub2RlX21vZHVsZXMgdG8gYW5vdGhlciBuYW1lXG4gKiBAcmV0dXJuc1xuICovXG5hc3luYyBmdW5jdGlvbiByZW1vdmVOb2RlTW9kdWxlU3ltbGluaygpIHtcbiAgY29uc3Qge2dldFN0YXRlfSA9IHJlcXVpcmUoJy4vZWRpdG9yLWhlbHBlcicpIGFzIHR5cGVvZiBfZWRpdG9ySGVscGVyO1xuICBjb25zdCBsaW5rcyA9IGdldFN0YXRlKCkubm9kZU1vZHVsZVN5bWxpbmtzO1xuICBpZiAobGlua3MgPT0gbnVsbClcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKFtdKTtcblxuICBjb25zdCBkb25lcyA9IEFycmF5LmZyb20obGlua3MudmFsdWVzKCkpLm1hcChhc3luYyBsaW5rID0+IHtcbiAgICBsZXQgc3RhdDogZnMuU3RhdHMgfCB1bmRlZmluZWQ7XG4gICAgdHJ5IHtcbiAgICAgIHN0YXQgPSBhd2FpdCBmcy5wcm9taXNlcy5sc3RhdChsaW5rKTtcbiAgICBpZiAoIXN0YXQuaXNTeW1ib2xpY0xpbmsoKSlcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBjb250ZW50ID0gZnMucmVhZGxpbmtTeW5jKGxpbmspO1xuICAgIGF3YWl0IGZzLnByb21pc2VzLnVubGluayhsaW5rKTtcbiAgICByZXR1cm4ge2xpbmssIGNvbnRlbnR9O1xuICB9KTtcbiAgY29uc3QgcmVzID0gYXdhaXQgUHJvbWlzZS5hbGwoZG9uZXMpO1xuICByZXR1cm4gcmVzLmZpbHRlcihpdGVtID0+IGl0ZW0gIT0gbnVsbCkgYXMge2xpbms6IHN0cmluZzsgY29udGVudDogc3RyaW5nfVtdO1xufVxuXG4iXX0=