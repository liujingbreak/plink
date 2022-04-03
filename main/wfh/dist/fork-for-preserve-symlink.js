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
        console.log(`Plink process ${process.pid} thread ${worker_threads_1.threadId} ` +
            chalk_1.default.green(`${code !== 0 ? 'ends with failures' : 'ends'}`));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9yay1mb3ItcHJlc2VydmUtc3ltbGluay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2ZvcmstZm9yLXByZXNlcnZlLXN5bWxpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGdEQUF3QjtBQUN4QixpREFBaUQ7QUFDakQsbURBQXdDO0FBQ3hDLDRDQUFvQjtBQUNwQiw0Q0FBb0I7QUFDcEIsb0RBQTRCO0FBQzVCLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMsa0RBQTBCO0FBQzFCLHVDQUFzQztBQUt6QixRQUFBLE9BQU8sR0FBRyxZQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMzRCxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO0FBRWpFLFNBQWdCLG1CQUFtQjtJQUNqQyxJQUFJLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqQyxNQUFNLGNBQWMsR0FBSSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLE9BQU8sSUFBSSxHQUFHLEtBQUssU0FBUyxDQUFDLENBQUM7SUFDcEYsTUFBTSxPQUFPLEdBQUcsY0FBYyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxlQUFRLENBQUMsT0FBTyxFQUFHLElBQUksQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQ3ZHLElBQUksT0FBTyxFQUFFO1FBQ1gsSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDL0Isd0NBQXdDO0tBQ3pDO0lBQ0QsT0FBTyxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUMs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S0FBSyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBQyxJQUFJLEVBQUMsRUFBRTtRQUN4RCxJQUFJLElBQTBCLENBQUM7UUFDL0IsSUFBSTtZQUNGLElBQUksR0FBRyxNQUFNLFlBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFO2dCQUN4QixPQUFPLElBQUksQ0FBQztTQUNiO1FBQUMsT0FBTyxFQUFFLEVBQUU7WUFDWCxPQUFPLElBQUksQ0FBQztTQUNiO1FBRUQsTUFBTSxPQUFPLEdBQUcsWUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0QyxNQUFNLFlBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQy9CLE9BQU8sRUFBQyxJQUFJLEVBQUUsT0FBTyxFQUFDLENBQUM7SUFDekIsQ0FBQyxDQUFDLENBQUM7SUFDSCxNQUFNLEdBQUcsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDckMsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBc0MsQ0FBQztBQUMvRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge2ZvcmssIENoaWxkUHJvY2Vzc30gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQge3RocmVhZElkfSBmcm9tICd3b3JrZXJfdGhyZWFkcyc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7cGxpbmtFbnZ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5pbXBvcnQgKiBhcyBfZWRpdG9ySGVscGVyIGZyb20gJy4vZWRpdG9yLWhlbHBlcic7XG5pbXBvcnQgKiBhcyBib290c3RyYXBQcm9jIGZyb20gJy4vdXRpbHMvYm9vdHN0cmFwLXByb2Nlc3MnO1xuaW1wb3J0ICogYXMgc3RvcmUgZnJvbSAnLi9zdG9yZSc7XG5cbmV4cG9ydCBjb25zdCBpc1dpbjMyID0gb3MucGxhdGZvcm0oKS5pbmRleE9mKCd3aW4zMicpID49IDA7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5mb3JrLWZvci1wcmVzZXJ2ZXItc3ltbGluaycpO1xuXG5leHBvcnQgZnVuY3Rpb24gd29ya0RpckNoYW5nZWRCeUNsaSgpIHtcbiAgbGV0IGFyZ3YgPSBwcm9jZXNzLmFyZ3Yuc2xpY2UoMik7XG4gIGNvbnN0IGZvdW5kQ21kT3B0SWR4ID0gIGFyZ3YuZmluZEluZGV4KGFyZyA9PiBhcmcgPT09ICctLWN3ZCcgfHwgYXJnID09PSAnLS1zcGFjZScpO1xuICBjb25zdCB3b3JrZGlyID0gZm91bmRDbWRPcHRJZHggPj0gMCA/IFBhdGgucmVzb2x2ZShwbGlua0Vudi5yb290RGlyLCAgYXJndltmb3VuZENtZE9wdElkeCArIDFdKSA6IG51bGw7XG4gIGlmICh3b3JrZGlyKSB7XG4gICAgYXJndi5zcGxpY2UoZm91bmRDbWRPcHRJZHgsIDIpO1xuICAgIC8vIHByb2Nlc3MuZW52LlBMSU5LX1dPUktfRElSID0gd29ya2RpcjtcbiAgfVxuICByZXR1cm4ge3dvcmtkaXIsIGFyZ3Z9O1xufVxuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBydW4obW9kdWxlTmFtZTogc3RyaW5nLCBvcHRzOiB7XG4gICAgc3RhdGVFeGl0QWN0aW9uPzogJ3NhdmUnIHwgJ3NlbmQnIHwgJ25vbmUnO1xuICAgIGhhbmRsZVNodXRkb3duTXNnPzogYm9vbGVhbjtcbiAgfSxcbiAgYm9vdFN0cmFwOiAoKSA9PiAoKCkgPT4gKHJ4Lk9ic2VydmFibGVJbnB1dDx1bmtub3duPiB8IHZvaWQpKVtdKSB7XG5cbiAgaWYgKChwcm9jZXNzLmVudi5OT0RFX1BSRVNFUlZFX1NZTUxJTktTICE9PSAnMScgJiYgcHJvY2Vzcy5leGVjQXJndi5pbmRleE9mKCctLXByZXNlcnZlLXN5bWxpbmtzJykgPCAwKSkge1xuICAgIHZvaWQgZm9ya0ZpbGUobW9kdWxlTmFtZSwgb3B0cy5oYW5kbGVTaHV0ZG93bk1zZyAhPSBudWxsID8gb3B0cy5oYW5kbGVTaHV0ZG93bk1zZyA6IGZhbHNlKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb25zdCB7aW5pdFByb2Nlc3MsIGV4aXRIb29rc30gPSByZXF1aXJlKCcuL3V0aWxzL2Jvb3RzdHJhcC1wcm9jZXNzJykgYXMgdHlwZW9mIGJvb3RzdHJhcFByb2M7XG5cbiAgaW5pdFByb2Nlc3Mob3B0cy5zdGF0ZUV4aXRBY3Rpb24gfHwgJ25vbmUnLCAoY29kZSkgPT4ge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coYFBsaW5rIHByb2Nlc3MgJHtwcm9jZXNzLnBpZH0gdGhyZWFkICR7dGhyZWFkSWR9IGAgK1xuICAgICAgY2hhbGsuZ3JlZW4oYCR7Y29kZSAhPT0gMCA/ICdlbmRzIHdpdGggZmFpbHVyZXMnIDogJ2VuZHMnfWApKTtcbiAgfSwgb3B0cy5oYW5kbGVTaHV0ZG93bk1zZyk7XG5cbiAgLy8gTXVzdCBiZSBpbnZva2VkIGFmdGVyIGluaXRQcm9jZXNzLCBvdGhlcndpc2Ugc3RvcmUgaXMgbm90IHJlYWR5IChlbXB0eSlcbiAgZXhpdEhvb2tzLnB1c2goLi4uYm9vdFN0cmFwKCkpO1xufVxuXG4vKiogcnVuIGluIG1haW4gcHJvY2VzcyAqL1xuYXN5bmMgZnVuY3Rpb24gZm9ya0ZpbGUobW9kdWxlTmFtZTogc3RyaW5nLCBoYW5kbGVTaHV0ZG93bk1zZzogYm9vbGVhbikge1xuICBsZXQgcmVjb3ZlcmVkID0gZmFsc2U7XG4gIGNvbnN0IHtpbml0UHJvY2VzcywgZXhpdEhvb2tzfSA9IHJlcXVpcmUoJy4vdXRpbHMvYm9vdHN0cmFwLXByb2Nlc3MnKSBhcyB0eXBlb2YgYm9vdHN0cmFwUHJvYztcbiAgY29uc3Qge3N0YXRlRmFjdG9yeX0gPSByZXF1aXJlKCcuL3N0b3JlJykgYXMgdHlwZW9mIHN0b3JlO1xuICBsZXQgY3A6IENoaWxkUHJvY2VzcyB8IHVuZGVmaW5lZDtcblxuICBpbml0UHJvY2Vzcygnbm9uZScsICgpID0+IHtcbiAgICByZWNvdmVyTm9kZU1vZHVsZVN5bWxpbmsoKTtcbiAgfSk7XG5cbiAgLy8gcmVtb3ZlTm9kZU1vZHVsZVN5bWxpbmsgbmVlZHMgRWRpdG9yLWhlbHBlciwgYW5kIGVkaXRvci1oZWxwZXIgbmVlZHMgc3RvcmUgYmVpbmcgY29uZmlndXJlZCFcbiAgc3RhdGVGYWN0b3J5LmNvbmZpZ3VyZVN0b3JlKCk7XG4gIGNvbnN0IHJlbW92ZWQgPSBhd2FpdCByZW1vdmVOb2RlTW9kdWxlU3ltbGluaygpO1xuXG4gIGNvbnN0IHt3b3JrZGlyLCBhcmd2fSA9IHdvcmtEaXJDaGFuZ2VkQnlDbGkoKTtcblxuICBwcm9jZXNzLmV4ZWNBcmd2LnB1c2goJy0tcHJlc2VydmUtc3ltbGlua3MtbWFpbicsICctLXByZXNlcnZlLXN5bWxpbmtzJyk7XG4gIGNvbnN0IGZvdW5kRGVidWdPcHRJZHggPSBhcmd2LmZpbmRJbmRleChhcmcgPT4gYXJnID09PSAnLS1pbnNwZWN0JyB8fCBhcmcgPT09ICctLWluc3BlY3QtYnJrJyk7XG5cbiAgY29uc3QgZW52OiB7W2tleTogc3RyaW5nXTogc3RyaW5nIHwgdW5kZWZpbmVkfSA9IHsuLi5wcm9jZXNzLmVudn07XG4gIGlmIChmb3VuZERlYnVnT3B0SWR4ID49IDApIHtcbiAgICBlbnYuTk9ERV9PUFRJT05TID0gZW52Lk5PREVfT1BUSU9OUyA/IGVudi5OT0RFX09QVElPTlMgKyAnICcgKyBhcmd2W2ZvdW5kRGVidWdPcHRJZHhdIDogYXJndltmb3VuZERlYnVnT3B0SWR4XTtcbiAgICBhcmd2LnNwbGljZShmb3VuZERlYnVnT3B0SWR4LCAxKTtcbiAgfVxuICBjb25zdCBkZWJ1Z09wdElkeCA9IGFyZ3YuZmluZEluZGV4KGFyZyA9PiBhcmcgPT09ICctLWRlYnVnJyk7XG4gIGlmIChkZWJ1Z09wdElkeCA+PSAwKSB7XG4gICAgZW52Lk5PREVfT1BUSU9OUyA9IGVudi5OT0RFX09QVElPTlMgPyBlbnYuTk9ERV9PUFRJT05TICsgJyAtLWluc3BlY3QtYnJrJyA6ICctLWluc3BlY3QtYnJrJztcbiAgICBhcmd2LnNwbGljZShkZWJ1Z09wdElkeCwgMSk7XG4gIH1cblxuICBlbnYuX19wbGlua19mb3JrX21haW4gPSBtb2R1bGVOYW1lO1xuXG4gIGlmICh3b3JrZGlyKVxuICAgIGVudi5QTElOS19XT1JLX0RJUiA9IHdvcmtkaXI7XG5cbiAgY3AgPSBmb3JrKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdmb3JrLXByZXNlcnZlLXN5bWxpbmstbWFpbi5qcycpLCBhcmd2LCB7XG4gICAgZW52LFxuICAgIHN0ZGlvOiAnaW5oZXJpdCdcbiAgfSk7XG5cbiAgaWYgKGhhbmRsZVNodXRkb3duTXNnKSB7XG4gICAgY29uc3QgcHJvY2Vzc01zZyQgPSByeC5mcm9tRXZlbnRQYXR0ZXJuPHN0cmluZz4oaCA9PiBwcm9jZXNzLm9uKCdtZXNzYWdlJywgaCksIGggPT4gcHJvY2Vzcy5vZmYoJ21lc3NhZ2UnLCBoKSk7XG4gICAgLy8gY29uc3QgcHJvY2Vzc0V4aXQkID0gcnguZnJvbUV2ZW50UGF0dGVybiggaCA9PiBwcm9jZXNzLm9uKCdTSUdJTlQnLCBoKSwgaCA9PiBwcm9jZXNzLm9mZignU0lHSU5UJywgaCkpO1xuXG4gICAgcngubWVyZ2UocHJvY2Vzc01zZyQucGlwZShcbiAgICAgIG9wLmZpbHRlcihtc2cgPT4gbXNnID09PSAnc2h1dGRvd24nKVxuICAgICkpLnBpcGUoXG4gICAgICBvcC50YWtlKDEpLFxuICAgICAgb3AudGFwKCgpID0+IHtcbiAgICAgICAgY3AhLnNlbmQoJ3NodXRkb3duJyk7XG4gICAgICB9KVxuICAgICkuc3Vic2NyaWJlKCk7XG4gIH1cblxuICBjb25zdCBvbkNoaWxkRXhpdCQgPSBuZXcgcnguUmVwbGF5U3ViamVjdDxudW1iZXI+KCk7XG4gIGNwLm9uY2UoJ2V4aXQnLCBjb2RlID0+IHtcbiAgICAvLyBpZiAoY29kZSAhPT0gMCkge1xuICAgICAgLy8gY29uc29sZS5sb2coJ2NoaWxkIHByb2Nlc3MgZXhpdHM6JywgY29kZSk7XG4gICAgLy8gfVxuICAgIG9uQ2hpbGRFeGl0JC5uZXh0KGNvZGUgfHwgMCk7XG4gICAgb25DaGlsZEV4aXQkLmNvbXBsZXRlKCk7XG4gIH0pO1xuICBleGl0SG9va3MucHVzaCgoKSA9PiBvbkNoaWxkRXhpdCQpO1xuXG4gIGZ1bmN0aW9uIHJlY292ZXJOb2RlTW9kdWxlU3ltbGluaygpIHtcbiAgICBpZiAocmVjb3ZlcmVkKVxuICAgICAgcmV0dXJuO1xuICAgIHJlY292ZXJlZCA9IHRydWU7XG5cbiAgICBmb3IgKGNvbnN0IHtsaW5rLCBjb250ZW50fSBvZiByZW1vdmVkKSB7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMobGluaykpIHtcbiAgICAgICAgdm9pZCBmcy5wcm9taXNlcy5zeW1saW5rKGNvbnRlbnQsIGxpbmssIGlzV2luMzIgPyAnanVuY3Rpb24nIDogJ2RpcicpO1xuICAgICAgICBsb2cuaW5mbygncmVjb3ZlciAnICsgbGluayk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogVGVtcG9yYXJpbHkgcmVuYW1lIDxwa2c+L25vZGVfbW9kdWxlcyB0byBhbm90aGVyIG5hbWVcbiAqIEByZXR1cm5zXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHJlbW92ZU5vZGVNb2R1bGVTeW1saW5rKCkge1xuICBjb25zdCB7Z2V0U3RhdGV9ID0gcmVxdWlyZSgnLi9lZGl0b3ItaGVscGVyJykgYXMgdHlwZW9mIF9lZGl0b3JIZWxwZXI7XG4gIGNvbnN0IGxpbmtzID0gZ2V0U3RhdGUoKS5ub2RlTW9kdWxlU3ltbGlua3M7XG4gIGlmIChsaW5rcyA9PSBudWxsKVxuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoW10pO1xuXG4gIGNvbnN0IGRvbmVzID0gQXJyYXkuZnJvbShsaW5rcy52YWx1ZXMoKSkubWFwKGFzeW5jIGxpbmsgPT4ge1xuICAgIGxldCBzdGF0OiBmcy5TdGF0cyB8IHVuZGVmaW5lZDtcbiAgICB0cnkge1xuICAgICAgc3RhdCA9IGF3YWl0IGZzLnByb21pc2VzLmxzdGF0KGxpbmspO1xuICAgIGlmICghc3RhdC5pc1N5bWJvbGljTGluaygpKVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkbGlua1N5bmMobGluayk7XG4gICAgYXdhaXQgZnMucHJvbWlzZXMudW5saW5rKGxpbmspO1xuICAgIHJldHVybiB7bGluaywgY29udGVudH07XG4gIH0pO1xuICBjb25zdCByZXMgPSBhd2FpdCBQcm9taXNlLmFsbChkb25lcyk7XG4gIHJldHVybiByZXMuZmlsdGVyKGl0ZW0gPT4gaXRlbSAhPSBudWxsKSBhcyB7bGluazogc3RyaW5nOyBjb250ZW50OiBzdHJpbmd9W107XG59XG5cbiJdfQ==