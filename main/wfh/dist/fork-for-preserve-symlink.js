"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.forkFile = exports.isWin32 = void 0;
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const misc_1 = require("./utils/misc");
const os_1 = __importDefault(require("os"));
const log4js_1 = __importDefault(require("log4js"));
exports.isWin32 = os_1.default.platform().indexOf('win32') >= 0;
const log = log4js_1.default.getLogger('plink.fork-for-preserver-symlink');
function forkFile(moduleName) {
    return __awaiter(this, void 0, void 0, function* () {
        process.on('SIGINT', () => {
            // eslint-disable-next-line no-console
            console.log('bye');
            process.exit(0);
        });
        let recovered = false;
        const removed = yield removeNodeModuleSymlink();
        process.on('beforeExit', () => {
            if (recovered)
                return;
            recovered = true;
            for (const { link, content } of removed) {
                if (!fs_1.default.existsSync(link)) {
                    void fs_1.default.promises.symlink(content, link, exports.isWin32 ? 'junction' : 'dir');
                    log.info('recover ' + link);
                }
            }
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
        (0, child_process_1.fork)(path_1.default.resolve(__dirname, 'fork-preserve-symlink-main.js'), argv, {
            env,
            stdio: 'inherit'
        });
        // const {isStateSyncMsg} = require('./store') as typeof _store;
        // cp.on('message', (msg) => {
        //   if (isStateSyncMsg(msg)) {
        //     // const stat = eval('(' + msg.data + ')');
        //   }
        // });
        return;
    });
}
exports.forkFile = forkFile;
/**
 * Temporarily rename <pkg>/node_modules to another name
 * @returns
 */
function removeNodeModuleSymlink() {
    return __awaiter(this, void 0, void 0, function* () {
        const { getState } = require('./editor-helper');
        const links = getState().nodeModuleSymlinks;
        if (links == null)
            return Promise.resolve([]);
        const dones = Array.from(links.values()).map((link) => __awaiter(this, void 0, void 0, function* () {
            let stat;
            try {
                stat = yield fs_1.default.promises.lstat(link);
                if (!stat.isSymbolicLink())
                    return null;
            }
            catch (ex) {
                return null;
            }
            const content = fs_1.default.readlinkSync(link);
            log.info('backup symlink: ' + link);
            yield fs_1.default.promises.unlink(link);
            return { link, content };
        }));
        const res = yield Promise.all(dones);
        return res.filter(item => item != null);
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9yay1mb3ItcHJlc2VydmUtc3ltbGluay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2ZvcmstZm9yLXByZXNlcnZlLXN5bWxpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsZ0RBQXdCO0FBQ3hCLGlEQUFtQztBQUNuQyw0Q0FBb0I7QUFDcEIsdUNBQXNDO0FBR3RDLDRDQUFvQjtBQUVwQixvREFBNEI7QUFDZixRQUFBLE9BQU8sR0FBRyxZQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMzRCxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO0FBRWpFLFNBQXNCLFFBQVEsQ0FBQyxVQUFrQjs7UUFDL0MsT0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO1lBQ3hCLHNDQUFzQztZQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ25CLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEIsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUM7UUFDdEIsTUFBTSxPQUFPLEdBQUcsTUFBTSx1QkFBdUIsRUFBRSxDQUFDO1FBRWhELE9BQU8sQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtZQUM1QixJQUFJLFNBQVM7Z0JBQ1gsT0FBTztZQUNULFNBQVMsR0FBRyxJQUFJLENBQUM7WUFFakIsS0FBSyxNQUFNLEVBQUMsSUFBSSxFQUFFLE9BQU8sRUFBQyxJQUFJLE9BQU8sRUFBRTtnQkFDckMsSUFBSSxDQUFDLFlBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQ3hCLEtBQUssWUFBRSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLElBQUksRUFB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LE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUU3QixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFNLElBQUksRUFBQyxFQUFFO1lBQ3hELElBQUksSUFBMEIsQ0FBQztZQUMvQixJQUFJO2dCQUNGLElBQUksR0FBRyxNQUFNLFlBQUUsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUN2QyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRTtvQkFDeEIsT0FBTyxJQUFJLENBQUM7YUFDYjtZQUFDLE9BQU8sRUFBRSxFQUFFO2dCQUNYLE9BQU8sSUFBSSxDQUFDO2FBQ2I7WUFDRCxNQUFNLE9BQU8sR0FBRyxZQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3RDLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFDLENBQUM7WUFDcEMsTUFBTSxZQUFFLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUMvQixPQUFPLEVBQUMsSUFBSSxFQUFFLE9BQU8sRUFBQyxDQUFDO1FBQ3pCLENBQUMsQ0FBQSxDQUFDLENBQUM7UUFDSCxNQUFNLEdBQUcsR0FBRyxNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDckMsT0FBTyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBc0MsQ0FBQztJQUMvRSxDQUFDO0NBQUEiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7Zm9ya30gZnJvbSAnY2hpbGRfcHJvY2Vzcyc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHtwbGlua0Vudn0gZnJvbSAnLi91dGlscy9taXNjJztcbmltcG9ydCAqIGFzIF9lZGl0b3JIZWxwZXIgZnJvbSAnLi9lZGl0b3ItaGVscGVyJztcbmltcG9ydCAqIGFzIF9zdG9yZSBmcm9tICcuL3N0b3JlJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5cbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmV4cG9ydCBjb25zdCBpc1dpbjMyID0gb3MucGxhdGZvcm0oKS5pbmRleE9mKCd3aW4zMicpID49IDA7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5mb3JrLWZvci1wcmVzZXJ2ZXItc3ltbGluaycpO1xuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZm9ya0ZpbGUobW9kdWxlTmFtZTogc3RyaW5nKSB7XG4gIHByb2Nlc3Mub24oJ1NJR0lOVCcsICgpID0+IHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdieWUnKTtcbiAgICBwcm9jZXNzLmV4aXQoMCk7XG4gIH0pO1xuXG4gIGxldCByZWNvdmVyZWQgPSBmYWxzZTtcbiAgY29uc3QgcmVtb3ZlZCA9IGF3YWl0IHJlbW92ZU5vZGVNb2R1bGVTeW1saW5rKCk7XG5cbiAgcHJvY2Vzcy5vbignYmVmb3JlRXhpdCcsICgpID0+IHtcbiAgICBpZiAocmVjb3ZlcmVkKVxuICAgICAgcmV0dXJuO1xuICAgIHJlY292ZXJlZCA9IHRydWU7XG5cbiAgICBmb3IgKGNvbnN0IHtsaW5rLCBjb250ZW50fSBvZiByZW1vdmVkKSB7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMobGluaykpIHtcbiAgICAgICAgdm9pZCBmcy5wcm9taXNlcy5zeW1saW5rKGNvbnRlbnQsIGxpbmssIGlzV2luMzIgPyAnanVuY3Rpb24nIDogJ2RpcicpO1xuICAgICAgICBsb2cuaW5mbygncmVjb3ZlciAnICsgbGluayk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuXG4gIGxldCBhcmd2ID0gcHJvY2Vzcy5hcmd2LnNsaWNlKDIpO1xuICBjb25zdCBmb3VuZENtZE9wdElkeCA9ICBhcmd2LmZpbmRJbmRleChhcmcgPT4gYXJnID09PSAnLS1jd2QnIHx8IGFyZyA9PT0gJy0tc3BhY2UnKTtcbiAgY29uc3Qgd29ya2RpciA9IGZvdW5kQ21kT3B0SWR4ID49IDAgPyBQYXRoLnJlc29sdmUocGxpbmtFbnYucm9vdERpciwgIGFyZ3ZbZm91bmRDbWRPcHRJZHggKyAxXSkgOiBudWxsO1xuICBpZiAod29ya2Rpcikge1xuICAgIGFyZ3Yuc3BsaWNlKGZvdW5kQ21kT3B0SWR4LCAyKTtcbiAgICAvLyBwcm9jZXNzLmVudi5QTElOS19XT1JLX0RJUiA9IHdvcmtkaXI7XG4gIH1cblxuICBwcm9jZXNzLmV4ZWNBcmd2LnB1c2goJy0tcHJlc2VydmUtc3ltbGlua3MtbWFpbicsICctLXByZXNlcnZlLXN5bWxpbmtzJyk7XG4gIGNvbnN0IGZvdW5kRGVidWdPcHRJZHggPSBhcmd2LmZpbmRJbmRleChhcmcgPT4gYXJnID09PSAnLS1pbnNwZWN0JyB8fCBhcmcgPT09ICctLWluc3BlY3QtYnJrJyk7XG5cbiAgY29uc3QgZW52OiB7W2tleTogc3RyaW5nXTogc3RyaW5nIHwgdW5kZWZpbmVkfSA9IHsuLi5wcm9jZXNzLmVudn07XG4gIGlmIChmb3VuZERlYnVnT3B0SWR4ID49IDApIHtcbiAgICBlbnYuTk9ERV9PUFRJT05TID0gZW52Lk5PREVfT1BUSU9OUyA/IGVudi5OT0RFX09QVElPTlMgKyAnICcgKyBhcmd2W2ZvdW5kRGVidWdPcHRJZHhdIDogYXJndltmb3VuZERlYnVnT3B0SWR4XTtcbiAgICBhcmd2LnNwbGljZShmb3VuZERlYnVnT3B0SWR4LCAxKTtcbiAgfVxuICBjb25zdCBkZWJ1Z09wdElkeCA9IGFyZ3YuZmluZEluZGV4KGFyZyA9PiBhcmcgPT09ICctLWRlYnVnJyk7XG4gIGlmIChkZWJ1Z09wdElkeCA+PSAwKSB7XG4gICAgZW52Lk5PREVfT1BUSU9OUyA9IGVudi5OT0RFX09QVElPTlMgPyBlbnYuTk9ERV9PUFRJT05TICsgJyAtLWluc3BlY3QtYnJrJyA6ICctLWluc3BlY3QtYnJrJztcbiAgICBhcmd2LnNwbGljZShkZWJ1Z09wdElkeCwgMSk7XG4gIH1cblxuICBlbnYuX19wbGlua19mb3JrX21haW4gPSBtb2R1bGVOYW1lO1xuICAvLyBlbnYuX19wbGlua19zYXZlX3N0YXRlID0gJzEnO1xuXG4gIGlmICh3b3JrZGlyKVxuICAgIGVudi5QTElOS19XT1JLX0RJUiA9IHdvcmtkaXI7XG5cbiAgZm9yayhQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnZm9yay1wcmVzZXJ2ZS1zeW1saW5rLW1haW4uanMnKSwgYXJndiwge1xuICAgIGVudixcbiAgICBzdGRpbzogJ2luaGVyaXQnXG4gIH0pO1xuXG4gIC8vIGNvbnN0IHtpc1N0YXRlU3luY01zZ30gPSByZXF1aXJlKCcuL3N0b3JlJykgYXMgdHlwZW9mIF9zdG9yZTtcbiAgLy8gY3Aub24oJ21lc3NhZ2UnLCAobXNnKSA9PiB7XG4gIC8vICAgaWYgKGlzU3RhdGVTeW5jTXNnKG1zZykpIHtcbiAgLy8gICAgIC8vIGNvbnN0IHN0YXQgPSBldmFsKCcoJyArIG1zZy5kYXRhICsgJyknKTtcbiAgLy8gICB9XG4gIC8vIH0pO1xuXG4gIHJldHVybjtcbn1cblxuLyoqXG4gKiBUZW1wb3JhcmlseSByZW5hbWUgPHBrZz4vbm9kZV9tb2R1bGVzIHRvIGFub3RoZXIgbmFtZVxuICogQHJldHVybnMgXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHJlbW92ZU5vZGVNb2R1bGVTeW1saW5rKCkge1xuICBjb25zdCB7Z2V0U3RhdGV9ID0gcmVxdWlyZSgnLi9lZGl0b3ItaGVscGVyJykgYXMgdHlwZW9mIF9lZGl0b3JIZWxwZXI7XG4gIGNvbnN0IGxpbmtzID0gZ2V0U3RhdGUoKS5ub2RlTW9kdWxlU3ltbGlua3M7XG5cbiAgaWYgKGxpbmtzID09IG51bGwpXG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShbXSk7XG5cbiAgY29uc3QgZG9uZXMgPSBBcnJheS5mcm9tKGxpbmtzLnZhbHVlcygpKS5tYXAoYXN5bmMgbGluayA9PiB7XG4gICAgbGV0IHN0YXQ6IGZzLlN0YXRzIHwgdW5kZWZpbmVkO1xuICAgIHRyeSB7XG4gICAgICBzdGF0ID0gYXdhaXQgZnMucHJvbWlzZXMubHN0YXQobGluayk7XG4gICAgaWYgKCFzdGF0LmlzU3ltYm9saWNMaW5rKCkpXG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfVxuICAgIGNvbnN0IGNvbnRlbnQgPSBmcy5yZWFkbGlua1N5bmMobGluayk7XG4gICAgbG9nLmluZm8oJ2JhY2t1cCBzeW1saW5rOiAnICsgbGluayk7XG4gICAgYXdhaXQgZnMucHJvbWlzZXMudW5saW5rKGxpbmspO1xuICAgIHJldHVybiB7bGluaywgY29udGVudH07XG4gIH0pO1xuICBjb25zdCByZXMgPSBhd2FpdCBQcm9taXNlLmFsbChkb25lcyk7XG4gIHJldHVybiByZXMuZmlsdGVyKGl0ZW0gPT4gaXRlbSAhPSBudWxsKSBhcyB7bGluazogc3RyaW5nOyBjb250ZW50OiBzdHJpbmd9W107XG59XG4iXX0=