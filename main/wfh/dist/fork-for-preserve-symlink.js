"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.forkFile = exports.isWin32 = void 0;
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const log4js_1 = __importDefault(require("log4js"));
const misc_1 = require("./utils/misc");
exports.isWin32 = os_1.default.platform().indexOf('win32') >= 0;
const log = log4js_1.default.getLogger('plink.fork-for-preserver-symlink');
async function forkFile(moduleName) {
    process.on('SIGINT', () => {
        // eslint-disable-next-line no-console
        console.log('bye');
        recoverNodeModuleSymlink();
        process.exit(0);
    });
    let recovered = false;
    const removed = await removeNodeModuleSymlink();
    process.on('beforeExit', () => {
        recoverNodeModuleSymlink();
    });
    let argv = process.argv.slice(2);
    const foundCmdOptIdx = argv.findIndex(arg => arg === '--cwd' || arg === '--space');
    const workdir = foundCmdOptIdx >= 0 ? path_1.default.resolve(misc_1.plinkEnv.rootDir, argv[foundCmdOptIdx + 1]) : null;
    if (workdir) {
        argv.splice(foundCmdOptIdx, 2);
        // process.env.PLINK_WORK_DIR = workdir;
    }
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
    // env.__plink_save_state = '1';
    if (workdir)
        env.PLINK_WORK_DIR = workdir;
    const cp = (0, child_process_1.fork)(path_1.default.resolve(__dirname, 'fork-preserve-symlink-main.js'), argv, {
        env,
        stdio: 'inherit'
    });
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
        log.info('backup symlink: ' + link);
        await fs_1.default.promises.unlink(link);
        return { link, content };
    });
    const res = await Promise.all(dones);
    return res.filter(item => item != null);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9yay1mb3ItcHJlc2VydmUtc3ltbGluay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2ZvcmstZm9yLXByZXNlcnZlLXN5bWxpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsZ0RBQXdCO0FBQ3hCLGlEQUFtQztBQUNuQyw0Q0FBb0I7QUFDcEIsNENBQW9CO0FBQ3BCLG9EQUE0QjtBQUM1Qix1Q0FBc0M7QUFJekIsUUFBQSxPQUFPLEdBQUcsWUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDM0QsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsa0NBQWtDLENBQUMsQ0FBQztBQUUxRCxLQUFLLFVBQVUsUUFBUSxDQUFDLFVBQWtCO0lBQy9DLE9BQU8sQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtRQUN4QixzQ0FBc0M7UUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUNuQix3QkFBd0IsRUFBRSxDQUFDO1FBQzNCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDbEIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUM7SUFDdEIsTUFBTSxPQUFPLEdBQUcsTUFBTSx1QkFBdUIsRUFBRSxDQUFDO0lBRWhELE9BQU8sQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtRQUM1Qix3QkFBd0IsRUFBRSxDQUFDO0lBQzdCLENBQUMsQ0FBQyxDQUFDO0lBR0gsSUFBSSxJQUFJLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFDakMsTUFBTSxjQUFjLEdBQUksSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxPQUFPLElBQUksR0FBRyxLQUFLLFNB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ZXNDb250ZW50IjpbImltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtmb3JrfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtwbGlua0Vudn0gZnJvbSAnLi91dGlscy9taXNjJztcbmltcG9ydCAqIGFzIF9lZGl0b3JIZWxwZXIgZnJvbSAnLi9lZGl0b3ItaGVscGVyJztcbmltcG9ydCAqIGFzIF9zdG9yZSBmcm9tICcuL3N0b3JlJztcblxuZXhwb3J0IGNvbnN0IGlzV2luMzIgPSBvcy5wbGF0Zm9ybSgpLmluZGV4T2YoJ3dpbjMyJykgPj0gMDtcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLmZvcmstZm9yLXByZXNlcnZlci1zeW1saW5rJyk7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmb3JrRmlsZShtb2R1bGVOYW1lOiBzdHJpbmcpIHtcbiAgcHJvY2Vzcy5vbignU0lHSU5UJywgKCkgPT4ge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coJ2J5ZScpO1xuICAgIHJlY292ZXJOb2RlTW9kdWxlU3ltbGluaygpO1xuICAgIHByb2Nlc3MuZXhpdCgwKTtcbiAgfSk7XG5cbiAgbGV0IHJlY292ZXJlZCA9IGZhbHNlO1xuICBjb25zdCByZW1vdmVkID0gYXdhaXQgcmVtb3ZlTm9kZU1vZHVsZVN5bWxpbmsoKTtcblxuICBwcm9jZXNzLm9uKCdiZWZvcmVFeGl0JywgKCkgPT4ge1xuICAgIHJlY292ZXJOb2RlTW9kdWxlU3ltbGluaygpO1xuICB9KTtcblxuXG4gIGxldCBhcmd2ID0gcHJvY2Vzcy5hcmd2LnNsaWNlKDIpO1xuICBjb25zdCBmb3VuZENtZE9wdElkeCA9ICBhcmd2LmZpbmRJbmRleChhcmcgPT4gYXJnID09PSAnLS1jd2QnIHx8IGFyZyA9PT0gJy0tc3BhY2UnKTtcbiAgY29uc3Qgd29ya2RpciA9IGZvdW5kQ21kT3B0SWR4ID49IDAgPyBQYXRoLnJlc29sdmUocGxpbmtFbnYucm9vdERpciwgIGFyZ3ZbZm91bmRDbWRPcHRJZHggKyAxXSkgOiBudWxsO1xuICBpZiAod29ya2Rpcikge1xuICAgIGFyZ3Yuc3BsaWNlKGZvdW5kQ21kT3B0SWR4LCAyKTtcbiAgICAvLyBwcm9jZXNzLmVudi5QTElOS19XT1JLX0RJUiA9IHdvcmtkaXI7XG4gIH1cblxuICBwcm9jZXNzLmV4ZWNBcmd2LnB1c2goJy0tcHJlc2VydmUtc3ltbGlua3MtbWFpbicsICctLXByZXNlcnZlLXN5bWxpbmtzJyk7XG4gIGNvbnN0IGZvdW5kRGVidWdPcHRJZHggPSBhcmd2LmZpbmRJbmRleChhcmcgPT4gYXJnID09PSAnLS1pbnNwZWN0JyB8fCBhcmcgPT09ICctLWluc3BlY3QtYnJrJyk7XG5cbiAgY29uc3QgZW52OiB7W2tleTogc3RyaW5nXTogc3RyaW5nIHwgdW5kZWZpbmVkfSA9IHsuLi5wcm9jZXNzLmVudn07XG4gIGlmIChmb3VuZERlYnVnT3B0SWR4ID49IDApIHtcbiAgICBlbnYuTk9ERV9PUFRJT05TID0gZW52Lk5PREVfT1BUSU9OUyA/IGVudi5OT0RFX09QVElPTlMgKyAnICcgKyBhcmd2W2ZvdW5kRGVidWdPcHRJZHhdIDogYXJndltmb3VuZERlYnVnT3B0SWR4XTtcbiAgICBhcmd2LnNwbGljZShmb3VuZERlYnVnT3B0SWR4LCAxKTtcbiAgfVxuICBjb25zdCBkZWJ1Z09wdElkeCA9IGFyZ3YuZmluZEluZGV4KGFyZyA9PiBhcmcgPT09ICctLWRlYnVnJyk7XG4gIGlmIChkZWJ1Z09wdElkeCA+PSAwKSB7XG4gICAgZW52Lk5PREVfT1BUSU9OUyA9IGVudi5OT0RFX09QVElPTlMgPyBlbnYuTk9ERV9PUFRJT05TICsgJyAtLWluc3BlY3QtYnJrJyA6ICctLWluc3BlY3QtYnJrJztcbiAgICBhcmd2LnNwbGljZShkZWJ1Z09wdElkeCwgMSk7XG4gIH1cblxuICBlbnYuX19wbGlua19mb3JrX21haW4gPSBtb2R1bGVOYW1lO1xuICAvLyBlbnYuX19wbGlua19zYXZlX3N0YXRlID0gJzEnO1xuXG4gIGlmICh3b3JrZGlyKVxuICAgIGVudi5QTElOS19XT1JLX0RJUiA9IHdvcmtkaXI7XG5cbiAgY29uc3QgY3AgPSBmb3JrKFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdmb3JrLXByZXNlcnZlLXN5bWxpbmstbWFpbi5qcycpLCBhcmd2LCB7XG4gICAgZW52LFxuICAgIHN0ZGlvOiAnaW5oZXJpdCdcbiAgfSk7XG5cbiAgY3Aub24oJ2V4aXQnLCBjb2RlID0+IHtcbiAgICBpZiAoY29kZSAhPSBudWxsICYmIGNvZGUgIT09IDApIHtcbiAgICAgIHByb2Nlc3MuZXhpdChjb2RlKTtcbiAgICB9XG4gIH0pO1xuXG4gIGZ1bmN0aW9uIHJlY292ZXJOb2RlTW9kdWxlU3ltbGluaygpIHtcbiAgICBpZiAocmVjb3ZlcmVkKVxuICAgICAgcmV0dXJuO1xuICAgIHJlY292ZXJlZCA9IHRydWU7XG5cbiAgICBmb3IgKGNvbnN0IHtsaW5rLCBjb250ZW50fSBvZiByZW1vdmVkKSB7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMobGluaykpIHtcbiAgICAgICAgdm9pZCBmcy5wcm9taXNlcy5zeW1saW5rKGNvbnRlbnQsIGxpbmssIGlzV2luMzIgPyAnanVuY3Rpb24nIDogJ2RpcicpO1xuICAgICAgICBsb2cuaW5mbygncmVjb3ZlciAnICsgbGluayk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbi8qKlxuICogVGVtcG9yYXJpbHkgcmVuYW1lIDxwa2c+L25vZGVfbW9kdWxlcyB0byBhbm90aGVyIG5hbWVcbiAqIEByZXR1cm5zIFxuICovXG5hc3luYyBmdW5jdGlvbiByZW1vdmVOb2RlTW9kdWxlU3ltbGluaygpIHtcbiAgY29uc3Qge2dldFN0YXRlfSA9IHJlcXVpcmUoJy4vZWRpdG9yLWhlbHBlcicpIGFzIHR5cGVvZiBfZWRpdG9ySGVscGVyO1xuICBjb25zdCBsaW5rcyA9IGdldFN0YXRlKCkubm9kZU1vZHVsZVN5bWxpbmtzO1xuXG4gIGlmIChsaW5rcyA9PSBudWxsKVxuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoW10pO1xuXG4gIGNvbnN0IGRvbmVzID0gQXJyYXkuZnJvbShsaW5rcy52YWx1ZXMoKSkubWFwKGFzeW5jIGxpbmsgPT4ge1xuICAgIGxldCBzdGF0OiBmcy5TdGF0cyB8IHVuZGVmaW5lZDtcbiAgICB0cnkge1xuICAgICAgc3RhdCA9IGF3YWl0IGZzLnByb21pc2VzLmxzdGF0KGxpbmspO1xuICAgIGlmICghc3RhdC5pc1N5bWJvbGljTGluaygpKVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkbGlua1N5bmMobGluayk7XG4gICAgbG9nLmluZm8oJ2JhY2t1cCBzeW1saW5rOiAnICsgbGluayk7XG4gICAgYXdhaXQgZnMucHJvbWlzZXMudW5saW5rKGxpbmspO1xuICAgIHJldHVybiB7bGluaywgY29udGVudH07XG4gIH0pO1xuICBjb25zdCByZXMgPSBhd2FpdCBQcm9taXNlLmFsbChkb25lcyk7XG4gIHJldHVybiByZXMuZmlsdGVyKGl0ZW0gPT4gaXRlbSAhPSBudWxsKSBhcyB7bGluazogc3RyaW5nOyBjb250ZW50OiBzdHJpbmd9W107XG59XG5cbiJdfQ==