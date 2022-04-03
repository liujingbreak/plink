"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
        console.log(`Plink [P${process.pid}.T${worker_threads_1.threadId}] ` +
            chalk_1.default.green(`${code !== 0 ? 'stopped with failures' : 'is shutdown'}`));
    }, opts.handleShutdownMsg);
    // Must be invoked after initProcess, otherwise store is not ready (empty)
    exitHooks.push(...bootStrap());
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
        const processExit$ = rx.fromEventPattern(h => process.on('SIGINT', h), h => process.off('SIGINT', h));
        rx.merge(processExit$, processMsg$.pipe(op.filter(msg => msg === 'shutdown'))).pipe(op.take(1), op.tap(() => {
            cp.send('shutdown');
        })).subscribe();
    }
    const onChildExit$ = new rx.ReplaySubject();
    cp.once('exit', code => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9yay1mb3ItcHJlc2VydmUtc3ltbGluay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2ZvcmstZm9yLXByZXNlcnZlLXN5bWxpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGdEQUF3QjtBQUN4QixpREFBaUQ7QUFDakQsbURBQXdDO0FBQ3hDLDRDQUFvQjtBQUNwQiw0Q0FBb0I7QUFDcEIsb0RBQTRCO0FBQzVCLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMsa0RBQTBCO0FBQzFCLHVDQUFzQztBQUt6QixRQUFBLE9BQU8sR0FBRyxZQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMzRCxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO0FBRWpFLFNBQWdCLG1CQUFtQjtJQUNqQyxJQUFJLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqQyxNQUFNLGNBQWMsR0FBSSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLE9BQU8sSUFBSSxHQUFHLEtBQUssU0FBUyxDQUFDLENBQUM7SUFDcEYsTUFBTSxPQUFPLEdBQUcsY0FBYyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxlQUFRLENBQUMsT0FBTyxFQUFHLElBQUksQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQ3ZHLElBQUksT0FBTyxFQUFFO1FBQ1gsSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDL0Isd0NBQXdDO0tBQ3pDO0lBQ0QsT0FBTyxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUMs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QixDQUFDO0lBQ3RFLE1BQU0sS0FBSyxHQUFHLFFBQVEsRUFBRSxDQUFDLGtCQUFrQixDQUFDO0lBQzVDLElBQUksS0FBSyxJQUFJLElBQUk7UUFDZixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLENBQUM7SUFFN0IsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFDLElBQUksRUFBQyxFQUFFO1FBQ3hELElBQUksSUFBMEIsQ0FBQztRQUMvQixJQUFJO1lBQ0YsSUFBSSxHQUFHLE1BQU0sWUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdkMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUU7Z0JBQ3hCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFBQyxPQUFPLEVBQUUsRUFBRTtZQUNYLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxNQUFNLE9BQU8sR0FBRyxZQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sWUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL0IsT0FBTyxFQUFDLElBQUksRUFBRSxPQUFPLEVBQUMsQ0FBQztJQUN6QixDQUFDLENBQUMsQ0FBQztJQUNILE1BQU0sR0FBRyxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNyQyxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFzQyxDQUFDO0FBQy9FLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7Zm9yaywgQ2hpbGRQcm9jZXNzfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7dGhyZWFkSWR9IGZyb20gJ3dvcmtlcl90aHJlYWRzJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHtwbGlua0Vudn0gZnJvbSAnLi91dGlscy9taXNjJztcbmltcG9ydCAqIGFzIF9lZGl0b3JIZWxwZXIgZnJvbSAnLi9lZGl0b3ItaGVscGVyJztcbmltcG9ydCAqIGFzIGJvb3RzdHJhcFByb2MgZnJvbSAnLi91dGlscy9ib290c3RyYXAtcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBzdG9yZSBmcm9tICcuL3N0b3JlJztcblxuZXhwb3J0IGNvbnN0IGlzV2luMzIgPSBvcy5wbGF0Zm9ybSgpLmluZGV4T2YoJ3dpbjMyJykgPj0gMDtcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLmZvcmstZm9yLXByZXNlcnZlci1zeW1saW5rJyk7XG5cbmV4cG9ydCBmdW5jdGlvbiB3b3JrRGlyQ2hhbmdlZEJ5Q2xpKCkge1xuICBsZXQgYXJndiA9IHByb2Nlc3MuYXJndi5zbGljZSgyKTtcbiAgY29uc3QgZm91bmRDbWRPcHRJZHggPSAgYXJndi5maW5kSW5kZXgoYXJnID0+IGFyZyA9PT0gJy0tY3dkJyB8fCBhcmcgPT09ICctLXNwYWNlJyk7XG4gIGNvbnN0IHdvcmtkaXIgPSBmb3VuZENtZE9wdElkeCA+PSAwID8gUGF0aC5yZXNvbHZlKHBsaW5rRW52LnJvb3REaXIsICBhcmd2W2ZvdW5kQ21kT3B0SWR4ICsgMV0pIDogbnVsbDtcbiAgaWYgKHdvcmtkaXIpIHtcbiAgICBhcmd2LnNwbGljZShmb3VuZENtZE9wdElkeCwgMik7XG4gICAgLy8gcHJvY2Vzcy5lbnYuUExJTktfV09SS19ESVIgPSB3b3JrZGlyO1xuICB9XG4gIHJldHVybiB7d29ya2RpciwgYXJndn07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHJ1bihtb2R1bGVOYW1lOiBzdHJpbmcsIG9wdHM6IHtcbiAgICBzdGF0ZUV4aXRBY3Rpb24/OiAnc2F2ZScgfCAnc2VuZCcgfCAnbm9uZSc7XG4gICAgaGFuZGxlU2h1dGRvd25Nc2c/OiBib29sZWFuO1xuICB9LFxuICBib290U3RyYXA6ICgpID0+ICgoKSA9PiAocnguT2JzZXJ2YWJsZUlucHV0PHVua25vd24+IHwgdm9pZCkpW10pIHtcblxuICBpZiAoKHByb2Nlc3MuZW52Lk5PREVfUFJFU0VSVkVfU1lNTElOS1MgIT09ICcxJyAmJiBwcm9jZXNzLmV4ZWNBcmd2LmluZGV4T2YoJy0tcHJlc2VydmUtc3ltbGlua3MnKSA8IDApKSB7XG4gICAgdm9pZCBmb3JrRmlsZShtb2R1bGVOYW1lLCBvcHRzLmhhbmRsZVNodXRkb3duTXNnICE9IG51bGwgPyBvcHRzLmhhbmRsZVNodXRkb3duTXNnIDogZmFsc2UpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IHtpbml0UHJvY2VzcywgZXhpdEhvb2tzfSA9IHJlcXVpcmUoJy4vdXRpbHMvYm9vdHN0cmFwLXByb2Nlc3MnKSBhcyB0eXBlb2YgYm9vdHN0cmFwUHJvYztcblxuICBpbml0UHJvY2VzcyhvcHRzLnN0YXRlRXhpdEFjdGlvbiB8fCAnbm9uZScsIChjb2RlKSA9PiB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhgUGxpbmsgW1Ake3Byb2Nlc3MucGlkfS5UJHt0aHJlYWRJZH1dIGAgK1xuICAgICAgY2hhbGsuZ3JlZW4oYCR7Y29kZSAhPT0gMCA/ICdzdG9wcGVkIHdpdGggZmFpbHVyZXMnIDogJ2lzIHNodXRkb3duJ31gKSk7XG4gIH0sIG9wdHMuaGFuZGxlU2h1dGRvd25Nc2cpO1xuXG4gIC8vIE11c3QgYmUgaW52b2tlZCBhZnRlciBpbml0UHJvY2Vzcywgb3RoZXJ3aXNlIHN0b3JlIGlzIG5vdCByZWFkeSAoZW1wdHkpXG4gIGV4aXRIb29rcy5wdXNoKC4uLmJvb3RTdHJhcCgpKTtcbn1cblxuLyoqIHJ1biBpbiBtYWluIHByb2Nlc3MgKi9cbmFzeW5jIGZ1bmN0aW9uIGZvcmtGaWxlKG1vZHVsZU5hbWU6IHN0cmluZywgaGFuZGxlU2h1dGRvd25Nc2c6IGJvb2xlYW4pIHtcbiAgbGV0IHJlY292ZXJlZCA9IGZhbHNlO1xuICBjb25zdCB7aW5pdFByb2Nlc3MsIGV4aXRIb29rc30gPSByZXF1aXJlKCcuL3V0aWxzL2Jvb3RzdHJhcC1wcm9jZXNzJykgYXMgdHlwZW9mIGJvb3RzdHJhcFByb2M7XG4gIGNvbnN0IHtzdGF0ZUZhY3Rvcnl9ID0gcmVxdWlyZSgnLi9zdG9yZScpIGFzIHR5cGVvZiBzdG9yZTtcbiAgbGV0IGNwOiBDaGlsZFByb2Nlc3MgfCB1bmRlZmluZWQ7XG5cbiAgaW5pdFByb2Nlc3MoJ25vbmUnLCAoKSA9PiB7XG4gICAgcmVjb3Zlck5vZGVNb2R1bGVTeW1saW5rKCk7XG4gIH0pO1xuXG4gIC8vIHJlbW92ZU5vZGVNb2R1bGVTeW1saW5rIG5lZWRzIEVkaXRvci1oZWxwZXIsIGFuZCBlZGl0b3ItaGVscGVyIG5lZWRzIHN0b3JlIGJlaW5nIGNvbmZpZ3VyZWQhXG4gIHN0YXRlRmFjdG9yeS5jb25maWd1cmVTdG9yZSgpO1xuICBjb25zdCByZW1vdmVkID0gYXdhaXQgcmVtb3ZlTm9kZU1vZHVsZVN5bWxpbmsoKTtcblxuICBjb25zdCB7d29ya2RpciwgYXJndn0gPSB3b3JrRGlyQ2hhbmdlZEJ5Q2xpKCk7XG5cbiAgcHJvY2Vzcy5leGVjQXJndi5wdXNoKCctLXByZXNlcnZlLXN5bWxpbmtzLW1haW4nLCAnLS1wcmVzZXJ2ZS1zeW1saW5rcycpO1xuICBjb25zdCBmb3VuZERlYnVnT3B0SWR4ID0gYXJndi5maW5kSW5kZXgoYXJnID0+IGFyZyA9PT0gJy0taW5zcGVjdCcgfHwgYXJnID09PSAnLS1pbnNwZWN0LWJyaycpO1xuXG4gIGNvbnN0IGVudjoge1trZXk6IHN0cmluZ106IHN0cmluZyB8IHVuZGVmaW5lZH0gPSB7Li4ucHJvY2Vzcy5lbnZ9O1xuICBpZiAoZm91bmREZWJ1Z09wdElkeCA+PSAwKSB7XG4gICAgZW52Lk5PREVfT1BUSU9OUyA9IGVudi5OT0RFX09QVElPTlMgPyBlbnYuTk9ERV9PUFRJT05TICsgJyAnICsgYXJndltmb3VuZERlYnVnT3B0SWR4XSA6IGFyZ3ZbZm91bmREZWJ1Z09wdElkeF07XG4gICAgYXJndi5zcGxpY2UoZm91bmREZWJ1Z09wdElkeCwgMSk7XG4gIH1cbiAgY29uc3QgZGVidWdPcHRJZHggPSBhcmd2LmZpbmRJbmRleChhcmcgPT4gYXJnID09PSAnLS1kZWJ1ZycpO1xuICBpZiAoZGVidWdPcHRJZHggPj0gMCkge1xuICAgIGVudi5OT0RFX09QVElPTlMgPSBlbnYuTk9ERV9PUFRJT05TID8gZW52Lk5PREVfT1BUSU9OUyArICcgLS1pbnNwZWN0LWJyaycgOiAnLS1pbnNwZWN0LWJyayc7XG4gICAgYXJndi5zcGxpY2UoZGVidWdPcHRJZHgsIDEpO1xuICB9XG5cbiAgZW52Ll9fcGxpbmtfZm9ya19tYWluID0gbW9kdWxlTmFtZTtcblxuICBpZiAod29ya2RpcilcbiAgICBlbnYuUExJTktfV09SS19ESVIgPSB3b3JrZGlyO1xuXG4gIGNwID0gZm9yayhQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnZm9yay1wcmVzZXJ2ZS1zeW1saW5rLW1haW4uanMnKSwgYXJndiwge1xuICAgIGVudixcbiAgICBzdGRpbzogJ2luaGVyaXQnXG4gIH0pO1xuXG4gIGlmIChoYW5kbGVTaHV0ZG93bk1zZykge1xuICAgIGNvbnN0IHByb2Nlc3NNc2ckID0gcnguZnJvbUV2ZW50UGF0dGVybjxzdHJpbmc+KGggPT4gcHJvY2Vzcy5vbignbWVzc2FnZScsIGgpLCBoID0+IHByb2Nlc3Mub2ZmKCdtZXNzYWdlJywgaCkpO1xuICAgIGNvbnN0IHByb2Nlc3NFeGl0JCA9IHJ4LmZyb21FdmVudFBhdHRlcm4oIGggPT4gcHJvY2Vzcy5vbignU0lHSU5UJywgaCksIGggPT4gcHJvY2Vzcy5vZmYoJ1NJR0lOVCcsIGgpKTtcblxuICAgIHJ4Lm1lcmdlKHByb2Nlc3NFeGl0JCwgcHJvY2Vzc01zZyQucGlwZShcbiAgICAgIG9wLmZpbHRlcihtc2cgPT4gbXNnID09PSAnc2h1dGRvd24nKVxuICAgICkpLnBpcGUoXG4gICAgICBvcC50YWtlKDEpLFxuICAgICAgb3AudGFwKCgpID0+IHtcbiAgICAgICAgY3AhLnNlbmQoJ3NodXRkb3duJyk7XG4gICAgICB9KVxuICAgICkuc3Vic2NyaWJlKCk7XG4gIH1cblxuICBjb25zdCBvbkNoaWxkRXhpdCQgPSBuZXcgcnguUmVwbGF5U3ViamVjdDxudW1iZXI+KCk7XG4gIGNwLm9uY2UoJ2V4aXQnLCBjb2RlID0+IHtcbiAgICBvbkNoaWxkRXhpdCQubmV4dChjb2RlIHx8IDApO1xuICAgIG9uQ2hpbGRFeGl0JC5jb21wbGV0ZSgpO1xuICB9KTtcbiAgZXhpdEhvb2tzLnB1c2goKCkgPT4gb25DaGlsZEV4aXQkKTtcblxuICBmdW5jdGlvbiByZWNvdmVyTm9kZU1vZHVsZVN5bWxpbmsoKSB7XG4gICAgaWYgKHJlY292ZXJlZClcbiAgICAgIHJldHVybjtcbiAgICByZWNvdmVyZWQgPSB0cnVlO1xuXG4gICAgZm9yIChjb25zdCB7bGluaywgY29udGVudH0gb2YgcmVtb3ZlZCkge1xuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGxpbmspKSB7XG4gICAgICAgIHZvaWQgZnMucHJvbWlzZXMuc3ltbGluayhjb250ZW50LCBsaW5rLCBpc1dpbjMyID8gJ2p1bmN0aW9uJyA6ICdkaXInKTtcbiAgICAgICAgbG9nLmluZm8oJ3JlY292ZXIgJyArIGxpbmspO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG4vKipcbiAqIFRlbXBvcmFyaWx5IHJlbmFtZSA8cGtnPi9ub2RlX21vZHVsZXMgdG8gYW5vdGhlciBuYW1lXG4gKiBAcmV0dXJucyBcbiAqL1xuYXN5bmMgZnVuY3Rpb24gcmVtb3ZlTm9kZU1vZHVsZVN5bWxpbmsoKSB7XG4gIGNvbnN0IHtnZXRTdGF0ZX0gPSByZXF1aXJlKCcuL2VkaXRvci1oZWxwZXInKSBhcyB0eXBlb2YgX2VkaXRvckhlbHBlcjtcbiAgY29uc3QgbGlua3MgPSBnZXRTdGF0ZSgpLm5vZGVNb2R1bGVTeW1saW5rcztcbiAgaWYgKGxpbmtzID09IG51bGwpXG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShbXSk7XG5cbiAgY29uc3QgZG9uZXMgPSBBcnJheS5mcm9tKGxpbmtzLnZhbHVlcygpKS5tYXAoYXN5bmMgbGluayA9PiB7XG4gICAgbGV0IHN0YXQ6IGZzLlN0YXRzIHwgdW5kZWZpbmVkO1xuICAgIHRyeSB7XG4gICAgICBzdGF0ID0gYXdhaXQgZnMucHJvbWlzZXMubHN0YXQobGluayk7XG4gICAgaWYgKCFzdGF0LmlzU3ltYm9saWNMaW5rKCkpXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuXG4gICAgY29uc3QgY29udGVudCA9IGZzLnJlYWRsaW5rU3luYyhsaW5rKTtcbiAgICBhd2FpdCBmcy5wcm9taXNlcy51bmxpbmsobGluayk7XG4gICAgcmV0dXJuIHtsaW5rLCBjb250ZW50fTtcbiAgfSk7XG4gIGNvbnN0IHJlcyA9IGF3YWl0IFByb21pc2UuYWxsKGRvbmVzKTtcbiAgcmV0dXJuIHJlcy5maWx0ZXIoaXRlbSA9PiBpdGVtICE9IG51bGwpIGFzIHtsaW5rOiBzdHJpbmc7IGNvbnRlbnQ6IHN0cmluZ31bXTtcbn1cblxuIl19