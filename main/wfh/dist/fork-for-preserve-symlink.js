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
        if (code != null && code !== 0) {
            onChildExit$.error(new Error('Child process exit with code: ' + code));
            return;
            // process.exit(code);
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9yay1mb3ItcHJlc2VydmUtc3ltbGluay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2ZvcmstZm9yLXByZXNlcnZlLXN5bWxpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGdEQUF3QjtBQUN4QixpREFBaUQ7QUFDakQsbURBQXdDO0FBQ3hDLDRDQUFvQjtBQUNwQiw0Q0FBb0I7QUFDcEIsb0RBQTRCO0FBQzVCLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMsa0RBQTBCO0FBQzFCLHVDQUFzQztBQUt6QixRQUFBLE9BQU8sR0FBRyxZQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMzRCxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO0FBRWpFLFNBQWdCLG1CQUFtQjtJQUNqQyxJQUFJLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUNqQyxNQUFNLGNBQWMsR0FBSSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLE9BQU8sSUFBSSxHQUFHLEtBQUssU0FBUyxDQUFDLENBQUM7SUFDcEYsTUFBTSxPQUFPLEdBQUcsY0FBYyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxlQUFRLENBQUMsT0FBTyxFQUFHLElBQUksQ0FBQyxjQUFjLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQ3ZHLElBQUksT0FBTyxFQUFFO1FBQ1gsSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDL0Isd0NBQXdDO0tBQ3pDO0lBQ0QsT0FBTyxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUMs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QUFDL0UsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtmb3JrLCBDaGlsZFByb2Nlc3N9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IHt0aHJlYWRJZH0gZnJvbSAnd29ya2VyX3RocmVhZHMnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQge3BsaW5rRW52fSBmcm9tICcuL3V0aWxzL21pc2MnO1xuaW1wb3J0ICogYXMgX2VkaXRvckhlbHBlciBmcm9tICcuL2VkaXRvci1oZWxwZXInO1xuaW1wb3J0ICogYXMgYm9vdHN0cmFwUHJvYyBmcm9tICcuL3V0aWxzL2Jvb3RzdHJhcC1wcm9jZXNzJztcbmltcG9ydCAqIGFzIHN0b3JlIGZyb20gJy4vc3RvcmUnO1xuXG5leHBvcnQgY29uc3QgaXNXaW4zMiA9IG9zLnBsYXRmb3JtKCkuaW5kZXhPZignd2luMzInKSA+PSAwO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuZm9yay1mb3ItcHJlc2VydmVyLXN5bWxpbmsnKTtcblxuZXhwb3J0IGZ1bmN0aW9uIHdvcmtEaXJDaGFuZ2VkQnlDbGkoKSB7XG4gIGxldCBhcmd2ID0gcHJvY2Vzcy5hcmd2LnNsaWNlKDIpO1xuICBjb25zdCBmb3VuZENtZE9wdElkeCA9ICBhcmd2LmZpbmRJbmRleChhcmcgPT4gYXJnID09PSAnLS1jd2QnIHx8IGFyZyA9PT0gJy0tc3BhY2UnKTtcbiAgY29uc3Qgd29ya2RpciA9IGZvdW5kQ21kT3B0SWR4ID49IDAgPyBQYXRoLnJlc29sdmUocGxpbmtFbnYucm9vdERpciwgIGFyZ3ZbZm91bmRDbWRPcHRJZHggKyAxXSkgOiBudWxsO1xuICBpZiAod29ya2Rpcikge1xuICAgIGFyZ3Yuc3BsaWNlKGZvdW5kQ21kT3B0SWR4LCAyKTtcbiAgICAvLyBwcm9jZXNzLmVudi5QTElOS19XT1JLX0RJUiA9IHdvcmtkaXI7XG4gIH1cbiAgcmV0dXJuIHt3b3JrZGlyLCBhcmd2fTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gcnVuKG1vZHVsZU5hbWU6IHN0cmluZywgb3B0czoge1xuICAgIHN0YXRlRXhpdEFjdGlvbj86ICdzYXZlJyB8ICdzZW5kJyB8ICdub25lJztcbiAgICBoYW5kbGVTaHV0ZG93bk1zZz86IGJvb2xlYW47XG4gIH0sXG4gIGJvb3RTdHJhcDogKCkgPT4gKCgpID0+IChyeC5PYnNlcnZhYmxlSW5wdXQ8dW5rbm93bj4gfCB2b2lkKSlbXSkge1xuXG4gIGlmICgocHJvY2Vzcy5lbnYuTk9ERV9QUkVTRVJWRV9TWU1MSU5LUyAhPT0gJzEnICYmIHByb2Nlc3MuZXhlY0FyZ3YuaW5kZXhPZignLS1wcmVzZXJ2ZS1zeW1saW5rcycpIDwgMCkpIHtcbiAgICB2b2lkIGZvcmtGaWxlKG1vZHVsZU5hbWUsIG9wdHMuaGFuZGxlU2h1dGRvd25Nc2cgIT0gbnVsbCA/IG9wdHMuaGFuZGxlU2h1dGRvd25Nc2cgOiBmYWxzZSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29uc3Qge2luaXRQcm9jZXNzLCBleGl0SG9va3N9ID0gcmVxdWlyZSgnLi91dGlscy9ib290c3RyYXAtcHJvY2VzcycpIGFzIHR5cGVvZiBib290c3RyYXBQcm9jO1xuXG4gIGluaXRQcm9jZXNzKG9wdHMuc3RhdGVFeGl0QWN0aW9uIHx8ICdub25lJywgKGNvZGUpID0+IHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGBQbGluayBbUCR7cHJvY2Vzcy5waWR9LlQke3RocmVhZElkfV0gYCArXG4gICAgICBjaGFsay5ncmVlbihgJHtjb2RlICE9PSAwID8gJ3N0b3BwZWQgd2l0aCBmYWlsdXJlcycgOiAnaXMgc2h1dGRvd24nfWApKTtcbiAgfSwgb3B0cy5oYW5kbGVTaHV0ZG93bk1zZyk7XG5cbiAgLy8gTXVzdCBiZSBpbnZva2VkIGFmdGVyIGluaXRQcm9jZXNzLCBvdGhlcndpc2Ugc3RvcmUgaXMgbm90IHJlYWR5IChlbXB0eSlcbiAgZXhpdEhvb2tzLnB1c2goLi4uYm9vdFN0cmFwKCkpO1xufVxuXG4vKiogcnVuIGluIG1haW4gcHJvY2VzcyAqL1xuYXN5bmMgZnVuY3Rpb24gZm9ya0ZpbGUobW9kdWxlTmFtZTogc3RyaW5nLCBoYW5kbGVTaHV0ZG93bk1zZzogYm9vbGVhbikge1xuICBsZXQgcmVjb3ZlcmVkID0gZmFsc2U7XG4gIGNvbnN0IHtpbml0UHJvY2VzcywgZXhpdEhvb2tzfSA9IHJlcXVpcmUoJy4vdXRpbHMvYm9vdHN0cmFwLXByb2Nlc3MnKSBhcyB0eXBlb2YgYm9vdHN0cmFwUHJvYztcbiAgY29uc3Qge3N0YXRlRmFjdG9yeX0gPSByZXF1aXJlKCcuL3N0b3JlJykgYXMgdHlwZW9mIHN0b3JlO1xuICBsZXQgY3A6IENoaWxkUHJvY2VzcyB8IHVuZGVmaW5lZDtcblxuICBpbml0UHJvY2Vzcygnbm9uZScsICgpID0+IHtcbiAgICByZWNvdmVyTm9kZU1vZHVsZVN5bWxpbmsoKTtcbiAgfSk7XG5cbiAgLy8gcmVtb3ZlTm9kZU1vZHVsZVN5bWxpbmsgbmVlZHMgRWRpdG9yLWhlbHBlciwgYW5kIGVkaXRvci1oZWxwZXIgbmVlZHMgc3RvcmUgYmVpbmcgY29uZmlndXJlZCFcbiAgc3RhdGVGYWN0b3J5LmNvbmZpZ3VyZVN0b3JlKCk7XG4gIGNvbnN0IHJlbW92ZWQgPSBhd2FpdCByZW1vdmVOb2RlTW9kdWxlU3ltbGluaygpO1xuXG4gIGNvbnN0IHt3b3JrZGlyLCBhcmd2fSA9IHdvcmtEaXJDaGFuZ2VkQnlDbGkoKTtcblxuICBwcm9jZXNzLmV4ZWNBcmd2LnB1c2goJy0tcHJlc2VydmUtc3ltbGlua3MtbWFpbicsICctLXByZXNlcnZlLXN5bWxpbmtzJyk7XG4gIGNvbnN0IGZvdW5kRGVidWdPcHRJZHggPSBhcmd2LmZpbmRJbmRleChhcmcgPT4gYXJnID09PSAnLS1pbnNwZWN0JyB8fCBhcmcgPT09ICctLWluc3BlY3QtYnJrJyk7XG5cbiAgY29uc3QgZW52OiB7W2tleTogc3RyaW5nXTogc3RyaW5nIHwgdW5kZWZpbmVkfSA9IHsuLi5wcm9jZXNzLmVudn07XG4gIGlmIChmb3VuZERlYnVnT3B0SWR4ID49IDApIHtcbiAgICBlbnYuTk9ERV9PUFRJT05TID0gZW52Lk5PREVfT1BUSU9OUyA/IGVudi5OT0RFX09QVElPTlMgKyAnICcgKyBhcmd2W2ZvdW5kRGVidWdPcHRJZHhdIDogYXJndltmb3VuZERlYnVnT3B0SWR4XTtcbiAgICBhcmd2LnNwbGljZShmb3VuZERlYnVnT3B0SWR4LCAxKTtcbiAgfVxuICBjb25zdCBkZWJ1Z09wdElkeCA9IGFyZ3YuZmluZEluZGV4KGFyZyA9PiBhcmcgPT09ICctLWRlYnVnJyk7XG4gIGlmIChkZWJ1Z09wdElkeCA+PSAwKSB7XG4gICAgZW52Lk5PREVfT1BUSU9OUyA9IGVudi5OT0RFX09QVElPTlMgPyBlbnYuTk9ERV9PUFRJT05TICsgJyAtLWluc3BlY3QtYnJrJyA6ICctLWluc3BlY3QtYnJrJztcbiAgICBhcmd2LnNwbGljZShkZWJ1Z09wdElkeCwgMSk7XG4gIH1cblxuICBlbnYuX19wbGlua19mb3JrX21haW4gPSBtb2R1bGVOYW1lO1xuXG4gIGlmICh3b3JrZGlyKVxuICAgIGVudi5QTElOS19XT1JLX0RJUiA9IHdvcmtkaXI7XG5cbiAgY3AgPSBmb3JrKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdmb3JrLXByZXNlcnZlLXN5bWxpbmstbWFpbi5qcycpLCBhcmd2LCB7XG4gICAgZW52LFxuICAgIHN0ZGlvOiAnaW5oZXJpdCdcbiAgfSk7XG5cbiAgaWYgKGhhbmRsZVNodXRkb3duTXNnKSB7XG4gICAgY29uc3QgcHJvY2Vzc01zZyQgPSByeC5mcm9tRXZlbnRQYXR0ZXJuPHN0cmluZz4oaCA9PiBwcm9jZXNzLm9uKCdtZXNzYWdlJywgaCksIGggPT4gcHJvY2Vzcy5vZmYoJ21lc3NhZ2UnLCBoKSk7XG4gICAgY29uc3QgcHJvY2Vzc0V4aXQkID0gcnguZnJvbUV2ZW50UGF0dGVybiggaCA9PiBwcm9jZXNzLm9uKCdTSUdJTlQnLCBoKSwgaCA9PiBwcm9jZXNzLm9mZignU0lHSU5UJywgaCkpO1xuXG4gICAgcngubWVyZ2UocHJvY2Vzc0V4aXQkLCBwcm9jZXNzTXNnJC5waXBlKFxuICAgICAgb3AuZmlsdGVyKG1zZyA9PiBtc2cgPT09ICdzaHV0ZG93bicpXG4gICAgKSkucGlwZShcbiAgICAgIG9wLnRha2UoMSksXG4gICAgICBvcC50YXAoKCkgPT4ge1xuICAgICAgICBjcCEuc2VuZCgnc2h1dGRvd24nKTtcbiAgICAgIH0pXG4gICAgKS5zdWJzY3JpYmUoKTtcbiAgfVxuXG4gIGNvbnN0IG9uQ2hpbGRFeGl0JCA9IG5ldyByeC5SZXBsYXlTdWJqZWN0PG51bWJlcj4oKTtcbiAgY3Aub25jZSgnZXhpdCcsIGNvZGUgPT4ge1xuICAgIGlmIChjb2RlICE9IG51bGwgJiYgY29kZSAhPT0gMCkge1xuICAgICAgb25DaGlsZEV4aXQkLmVycm9yKG5ldyBFcnJvcignQ2hpbGQgcHJvY2VzcyBleGl0IHdpdGggY29kZTogJyArIGNvZGUpKTtcbiAgICAgIHJldHVybjtcbiAgICAgIC8vIHByb2Nlc3MuZXhpdChjb2RlKTtcbiAgICB9XG4gICAgb25DaGlsZEV4aXQkLm5leHQoY29kZSB8fCAwKTtcbiAgICBvbkNoaWxkRXhpdCQuY29tcGxldGUoKTtcbiAgfSk7XG4gIGV4aXRIb29rcy5wdXNoKCgpID0+IG9uQ2hpbGRFeGl0JCk7XG5cbiAgZnVuY3Rpb24gcmVjb3Zlck5vZGVNb2R1bGVTeW1saW5rKCkge1xuICAgIGlmIChyZWNvdmVyZWQpXG4gICAgICByZXR1cm47XG4gICAgcmVjb3ZlcmVkID0gdHJ1ZTtcblxuICAgIGZvciAoY29uc3Qge2xpbmssIGNvbnRlbnR9IG9mIHJlbW92ZWQpIHtcbiAgICAgIGlmICghZnMuZXhpc3RzU3luYyhsaW5rKSkge1xuICAgICAgICB2b2lkIGZzLnByb21pc2VzLnN5bWxpbmsoY29udGVudCwgbGluaywgaXNXaW4zMiA/ICdqdW5jdGlvbicgOiAnZGlyJyk7XG4gICAgICAgIGxvZy5pbmZvKCdyZWNvdmVyICcgKyBsaW5rKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuLyoqXG4gKiBUZW1wb3JhcmlseSByZW5hbWUgPHBrZz4vbm9kZV9tb2R1bGVzIHRvIGFub3RoZXIgbmFtZVxuICogQHJldHVybnMgXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHJlbW92ZU5vZGVNb2R1bGVTeW1saW5rKCkge1xuICBjb25zdCB7Z2V0U3RhdGV9ID0gcmVxdWlyZSgnLi9lZGl0b3ItaGVscGVyJykgYXMgdHlwZW9mIF9lZGl0b3JIZWxwZXI7XG4gIGNvbnN0IGxpbmtzID0gZ2V0U3RhdGUoKS5ub2RlTW9kdWxlU3ltbGlua3M7XG4gIGlmIChsaW5rcyA9PSBudWxsKVxuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoW10pO1xuXG4gIGNvbnN0IGRvbmVzID0gQXJyYXkuZnJvbShsaW5rcy52YWx1ZXMoKSkubWFwKGFzeW5jIGxpbmsgPT4ge1xuICAgIGxldCBzdGF0OiBmcy5TdGF0cyB8IHVuZGVmaW5lZDtcbiAgICB0cnkge1xuICAgICAgc3RhdCA9IGF3YWl0IGZzLnByb21pc2VzLmxzdGF0KGxpbmspO1xuICAgIGlmICghc3RhdC5pc1N5bWJvbGljTGluaygpKVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkbGlua1N5bmMobGluayk7XG4gICAgYXdhaXQgZnMucHJvbWlzZXMudW5saW5rKGxpbmspO1xuICAgIHJldHVybiB7bGluaywgY29udGVudH07XG4gIH0pO1xuICBjb25zdCByZXMgPSBhd2FpdCBQcm9taXNlLmFsbChkb25lcyk7XG4gIHJldHVybiByZXMuZmlsdGVyKGl0ZW0gPT4gaXRlbSAhPSBudWxsKSBhcyB7bGluazogc3RyaW5nOyBjb250ZW50OiBzdHJpbmd9W107XG59XG5cbiJdfQ==