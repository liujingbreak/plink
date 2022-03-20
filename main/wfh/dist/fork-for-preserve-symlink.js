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
    const { initProcess } = require('./utils/bootstrap-process');
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
    cp.on('exit', code => {
        if (code != null && code !== 0) {
            process.exit(code);
        }
    });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9yay1mb3ItcHJlc2VydmUtc3ltbGluay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2ZvcmstZm9yLXByZXNlcnZlLXN5bWxpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGdEQUF3QjtBQUN4QixpREFBaUQ7QUFDakQsbURBQXdDO0FBQ3hDLDRDQUFvQjtBQUNwQiw0Q0FBb0I7QUFDcEIsb0RBQTRCO0FBQzVCLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMsa0RBQTBCO0FBQzFCLHVDQUFzQztBQUt6QixRQUFBLE9BQU8sR0FBRyxZQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMzRCxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO0FBRWpFLFNBQWdCLG1CQUFtQjtJQUNqQyxJQUFJLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqQyxNQUFNLGNBQWMsR0FBSSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLE9BQU8sSUFBSSxHQUFHLEtBQUssU0FBUyxDQUFDLENBQUM7SUFDcEYsTUFBTSxPQUFPLEdBQUcsY0FBYyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxlQUFRLENBQUMsT0FBTyxFQUFHLElBQUksQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQ3ZHLElBQUksT0FBTyxFQUFFO1FBQ1gsSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDL0Isd0NBQXdDO0tBQ3pDO0lBQ0QsT0FBTyxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUMs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QUFPLENBQUMsRUFBRSxDQUFDLENBQUM7SUFFN0IsTUFBTSxLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFDLElBQUksRUFBQyxFQUFFO1FBQ3hELElBQUksSUFBMEIsQ0FBQztRQUMvQixJQUFJO1lBQ0YsSUFBSSxHQUFHLE1BQU0sWUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdkMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUU7Z0JBQ3hCLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFBQyxPQUFPLEVBQUUsRUFBRTtZQUNYLE9BQU8sSUFBSSxDQUFDO1NBQ2I7UUFFRCxNQUFNLE9BQU8sR0FBRyxZQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RDLE1BQU0sWUFBRSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDL0IsT0FBTyxFQUFDLElBQUksRUFBRSxPQUFPLEVBQUMsQ0FBQztJQUN6QixDQUFDLENBQUMsQ0FBQztJQUNILE1BQU0sR0FBRyxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNyQyxPQUFPLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFzQyxDQUFDO0FBQy9FLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7Zm9yaywgQ2hpbGRQcm9jZXNzfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7dGhyZWFkSWR9IGZyb20gJ3dvcmtlcl90aHJlYWRzJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHtwbGlua0Vudn0gZnJvbSAnLi91dGlscy9taXNjJztcbmltcG9ydCAqIGFzIF9lZGl0b3JIZWxwZXIgZnJvbSAnLi9lZGl0b3ItaGVscGVyJztcbmltcG9ydCAqIGFzIGJvb3RzdHJhcFByb2MgZnJvbSAnLi91dGlscy9ib290c3RyYXAtcHJvY2Vzcyc7XG5pbXBvcnQgKiBhcyBzdG9yZSBmcm9tICcuL3N0b3JlJztcblxuZXhwb3J0IGNvbnN0IGlzV2luMzIgPSBvcy5wbGF0Zm9ybSgpLmluZGV4T2YoJ3dpbjMyJykgPj0gMDtcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLmZvcmstZm9yLXByZXNlcnZlci1zeW1saW5rJyk7XG5cbmV4cG9ydCBmdW5jdGlvbiB3b3JrRGlyQ2hhbmdlZEJ5Q2xpKCkge1xuICBsZXQgYXJndiA9IHByb2Nlc3MuYXJndi5zbGljZSgyKTtcbiAgY29uc3QgZm91bmRDbWRPcHRJZHggPSAgYXJndi5maW5kSW5kZXgoYXJnID0+IGFyZyA9PT0gJy0tY3dkJyB8fCBhcmcgPT09ICctLXNwYWNlJyk7XG4gIGNvbnN0IHdvcmtkaXIgPSBmb3VuZENtZE9wdElkeCA+PSAwID8gUGF0aC5yZXNvbHZlKHBsaW5rRW52LnJvb3REaXIsICBhcmd2W2ZvdW5kQ21kT3B0SWR4ICsgMV0pIDogbnVsbDtcbiAgaWYgKHdvcmtkaXIpIHtcbiAgICBhcmd2LnNwbGljZShmb3VuZENtZE9wdElkeCwgMik7XG4gICAgLy8gcHJvY2Vzcy5lbnYuUExJTktfV09SS19ESVIgPSB3b3JrZGlyO1xuICB9XG4gIHJldHVybiB7d29ya2RpciwgYXJndn07XG59XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIHJ1bihtb2R1bGVOYW1lOiBzdHJpbmcsIG9wdHM6IHtcbiAgICBzdGF0ZUV4aXRBY3Rpb24/OiAnc2F2ZScgfCAnc2VuZCcgfCAnbm9uZSc7XG4gICAgaGFuZGxlU2h1dGRvd25Nc2c/OiBib29sZWFuO1xuICB9LFxuICBib290U3RyYXA6ICgpID0+ICgoKSA9PiAocnguT2JzZXJ2YWJsZUlucHV0PHVua25vd24+IHwgdm9pZCkpW10pIHtcblxuICBpZiAoKHByb2Nlc3MuZW52Lk5PREVfUFJFU0VSVkVfU1lNTElOS1MgIT09ICcxJyAmJiBwcm9jZXNzLmV4ZWNBcmd2LmluZGV4T2YoJy0tcHJlc2VydmUtc3ltbGlua3MnKSA8IDApKSB7XG4gICAgdm9pZCBmb3JrRmlsZShtb2R1bGVOYW1lLCBvcHRzLmhhbmRsZVNodXRkb3duTXNnICE9IG51bGwgPyBvcHRzLmhhbmRsZVNodXRkb3duTXNnIDogZmFsc2UpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IHtpbml0UHJvY2VzcywgZXhpdEhvb2tzfSA9IHJlcXVpcmUoJy4vdXRpbHMvYm9vdHN0cmFwLXByb2Nlc3MnKSBhcyB0eXBlb2YgYm9vdHN0cmFwUHJvYztcblxuICBpbml0UHJvY2VzcyhvcHRzLnN0YXRlRXhpdEFjdGlvbiB8fCAnbm9uZScsIChjb2RlKSA9PiB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhgUGxpbmsgW1Ake3Byb2Nlc3MucGlkfS5UJHt0aHJlYWRJZH1dIGAgK1xuICAgICAgY2hhbGsuZ3JlZW4oYCR7Y29kZSAhPT0gMCA/ICdzdG9wcGVkIHdpdGggZmFpbHVyZXMnIDogJ2lzIHNodXRkb3duJ31gKSk7XG4gIH0sIG9wdHMuaGFuZGxlU2h1dGRvd25Nc2cpO1xuXG4gIC8vIE11c3QgYmUgaW52b2tlZCBhZnRlciBpbml0UHJvY2Vzcywgb3RoZXJ3aXNlIHN0b3JlIGlzIG5vdCByZWFkeSAoZW1wdHkpXG4gIGV4aXRIb29rcy5wdXNoKC4uLmJvb3RTdHJhcCgpKTtcbn1cblxuLyoqIHJ1biBpbiBtYWluIHByb2Nlc3MgKi9cbmFzeW5jIGZ1bmN0aW9uIGZvcmtGaWxlKG1vZHVsZU5hbWU6IHN0cmluZywgaGFuZGxlU2h1dGRvd25Nc2c6IGJvb2xlYW4pIHtcbiAgbGV0IHJlY292ZXJlZCA9IGZhbHNlO1xuICBjb25zdCB7aW5pdFByb2Nlc3N9ID0gcmVxdWlyZSgnLi91dGlscy9ib290c3RyYXAtcHJvY2VzcycpIGFzIHR5cGVvZiBib290c3RyYXBQcm9jO1xuICBjb25zdCB7c3RhdGVGYWN0b3J5fSA9IHJlcXVpcmUoJy4vc3RvcmUnKSBhcyB0eXBlb2Ygc3RvcmU7XG4gIGxldCBjcDogQ2hpbGRQcm9jZXNzIHwgdW5kZWZpbmVkO1xuXG4gIGluaXRQcm9jZXNzKCdub25lJywgKCkgPT4ge1xuICAgIHJlY292ZXJOb2RlTW9kdWxlU3ltbGluaygpO1xuICB9KTtcblxuICAvLyByZW1vdmVOb2RlTW9kdWxlU3ltbGluayBuZWVkcyBFZGl0b3ItaGVscGVyLCBhbmQgZWRpdG9yLWhlbHBlciBuZWVkcyBzdG9yZSBiZWluZyBjb25maWd1cmVkIVxuICBzdGF0ZUZhY3RvcnkuY29uZmlndXJlU3RvcmUoKTtcbiAgY29uc3QgcmVtb3ZlZCA9IGF3YWl0IHJlbW92ZU5vZGVNb2R1bGVTeW1saW5rKCk7XG5cbiAgY29uc3Qge3dvcmtkaXIsIGFyZ3Z9ID0gd29ya0RpckNoYW5nZWRCeUNsaSgpO1xuXG4gIHByb2Nlc3MuZXhlY0FyZ3YucHVzaCgnLS1wcmVzZXJ2ZS1zeW1saW5rcy1tYWluJywgJy0tcHJlc2VydmUtc3ltbGlua3MnKTtcbiAgY29uc3QgZm91bmREZWJ1Z09wdElkeCA9IGFyZ3YuZmluZEluZGV4KGFyZyA9PiBhcmcgPT09ICctLWluc3BlY3QnIHx8IGFyZyA9PT0gJy0taW5zcGVjdC1icmsnKTtcblxuICBjb25zdCBlbnY6IHtba2V5OiBzdHJpbmddOiBzdHJpbmcgfCB1bmRlZmluZWR9ID0gey4uLnByb2Nlc3MuZW52fTtcbiAgaWYgKGZvdW5kRGVidWdPcHRJZHggPj0gMCkge1xuICAgIGVudi5OT0RFX09QVElPTlMgPSBlbnYuTk9ERV9PUFRJT05TID8gZW52Lk5PREVfT1BUSU9OUyArICcgJyArIGFyZ3ZbZm91bmREZWJ1Z09wdElkeF0gOiBhcmd2W2ZvdW5kRGVidWdPcHRJZHhdO1xuICAgIGFyZ3Yuc3BsaWNlKGZvdW5kRGVidWdPcHRJZHgsIDEpO1xuICB9XG4gIGNvbnN0IGRlYnVnT3B0SWR4ID0gYXJndi5maW5kSW5kZXgoYXJnID0+IGFyZyA9PT0gJy0tZGVidWcnKTtcbiAgaWYgKGRlYnVnT3B0SWR4ID49IDApIHtcbiAgICBlbnYuTk9ERV9PUFRJT05TID0gZW52Lk5PREVfT1BUSU9OUyA/IGVudi5OT0RFX09QVElPTlMgKyAnIC0taW5zcGVjdC1icmsnIDogJy0taW5zcGVjdC1icmsnO1xuICAgIGFyZ3Yuc3BsaWNlKGRlYnVnT3B0SWR4LCAxKTtcbiAgfVxuXG4gIGVudi5fX3BsaW5rX2ZvcmtfbWFpbiA9IG1vZHVsZU5hbWU7XG5cbiAgaWYgKHdvcmtkaXIpXG4gICAgZW52LlBMSU5LX1dPUktfRElSID0gd29ya2RpcjtcblxuICBjcCA9IGZvcmsoUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2ZvcmstcHJlc2VydmUtc3ltbGluay1tYWluLmpzJyksIGFyZ3YsIHtcbiAgICBlbnYsXG4gICAgc3RkaW86ICdpbmhlcml0J1xuICB9KTtcblxuICBpZiAoaGFuZGxlU2h1dGRvd25Nc2cpIHtcbiAgICBjb25zdCBwcm9jZXNzTXNnJCA9IHJ4LmZyb21FdmVudFBhdHRlcm48c3RyaW5nPihoID0+IHByb2Nlc3Mub24oJ21lc3NhZ2UnLCBoKSwgaCA9PiBwcm9jZXNzLm9mZignbWVzc2FnZScsIGgpKTtcbiAgICBjb25zdCBwcm9jZXNzRXhpdCQgPSByeC5mcm9tRXZlbnRQYXR0ZXJuKCBoID0+IHByb2Nlc3Mub24oJ1NJR0lOVCcsIGgpLCBoID0+IHByb2Nlc3Mub2ZmKCdTSUdJTlQnLCBoKSk7XG5cbiAgICByeC5tZXJnZShwcm9jZXNzRXhpdCQsIHByb2Nlc3NNc2ckLnBpcGUoXG4gICAgICBvcC5maWx0ZXIobXNnID0+IG1zZyA9PT0gJ3NodXRkb3duJylcbiAgICApKS5waXBlKFxuICAgICAgb3AudGFrZSgxKSxcbiAgICAgIG9wLnRhcCgoKSA9PiB7XG4gICAgICAgIGNwIS5zZW5kKCdzaHV0ZG93bicpO1xuICAgICAgfSlcbiAgICApLnN1YnNjcmliZSgpO1xuICB9XG5cbiAgY3Aub24oJ2V4aXQnLCBjb2RlID0+IHtcbiAgICBpZiAoY29kZSAhPSBudWxsICYmIGNvZGUgIT09IDApIHtcbiAgICAgIHByb2Nlc3MuZXhpdChjb2RlKTtcbiAgICB9XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIHJlY292ZXJOb2RlTW9kdWxlU3ltbGluaygpIHtcbiAgICBpZiAocmVjb3ZlcmVkKVxuICAgICAgcmV0dXJuO1xuICAgIHJlY292ZXJlZCA9IHRydWU7XG5cbiAgICBmb3IgKGNvbnN0IHtsaW5rLCBjb250ZW50fSBvZiByZW1vdmVkKSB7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMobGluaykpIHtcbiAgICAgICAgdm9pZCBmcy5wcm9taXNlcy5zeW1saW5rKGNvbnRlbnQsIGxpbmssIGlzV2luMzIgPyAnanVuY3Rpb24nIDogJ2RpcicpO1xuICAgICAgICBsb2cuaW5mbygncmVjb3ZlciAnICsgbGluayk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogVGVtcG9yYXJpbHkgcmVuYW1lIDxwa2c+L25vZGVfbW9kdWxlcyB0byBhbm90aGVyIG5hbWVcbiAqIEByZXR1cm5zIFxuICovXG5hc3luYyBmdW5jdGlvbiByZW1vdmVOb2RlTW9kdWxlU3ltbGluaygpIHtcbiAgY29uc3Qge2dldFN0YXRlfSA9IHJlcXVpcmUoJy4vZWRpdG9yLWhlbHBlcicpIGFzIHR5cGVvZiBfZWRpdG9ySGVscGVyO1xuICBjb25zdCBsaW5rcyA9IGdldFN0YXRlKCkubm9kZU1vZHVsZVN5bWxpbmtzO1xuICBpZiAobGlua3MgPT0gbnVsbClcbiAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKFtdKTtcblxuICBjb25zdCBkb25lcyA9IEFycmF5LmZyb20obGlua3MudmFsdWVzKCkpLm1hcChhc3luYyBsaW5rID0+IHtcbiAgICBsZXQgc3RhdDogZnMuU3RhdHMgfCB1bmRlZmluZWQ7XG4gICAgdHJ5IHtcbiAgICAgIHN0YXQgPSBhd2FpdCBmcy5wcm9taXNlcy5sc3RhdChsaW5rKTtcbiAgICBpZiAoIXN0YXQuaXNTeW1ib2xpY0xpbmsoKSlcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9XG5cbiAgICBjb25zdCBjb250ZW50ID0gZnMucmVhZGxpbmtTeW5jKGxpbmspO1xuICAgIGF3YWl0IGZzLnByb21pc2VzLnVubGluayhsaW5rKTtcbiAgICByZXR1cm4ge2xpbmssIGNvbnRlbnR9O1xuICB9KTtcbiAgY29uc3QgcmVzID0gYXdhaXQgUHJvbWlzZS5hbGwoZG9uZXMpO1xuICByZXR1cm4gcmVzLmZpbHRlcihpdGVtID0+IGl0ZW0gIT0gbnVsbCkgYXMge2xpbms6IHN0cmluZzsgY29udGVudDogc3RyaW5nfVtdO1xufVxuXG4iXX0=