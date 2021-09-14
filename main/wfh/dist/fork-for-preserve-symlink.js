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
        const cp = (0, child_process_1.fork)(path_1.default.resolve(__dirname, 'fork-preserve-symlink-main.js'), argv, {
            env,
            stdio: 'inherit'
        });
        cp.on('exit', code => {
            if (code != null && code !== 0) {
                process.exit(code);
            }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZm9yay1mb3ItcHJlc2VydmUtc3ltbGluay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2ZvcmstZm9yLXByZXNlcnZlLXN5bWxpbmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsZ0RBQXdCO0FBQ3hCLGlEQUFtQztBQUNuQyw0Q0FBb0I7QUFDcEIsdUNBQXNDO0FBR3RDLDRDQUFvQjtBQUVwQixvREFBNEI7QUFDZixRQUFBLE9BQU8sR0FBRyxZQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMzRCxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO0FBRWpFLFNBQXNCLFFBQVEsQ0FBQyxVQUFrQjs7UUFDL0MsT0FBTyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO1lBQ3hCLHNDQUFzQztZQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ25CLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDbEIsQ0FBQyxDQUFDLENBQUM7UUFFSCxJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUM7UUFDdEIsTUFBTSxPQUFPLEdBQUcsTUFBTSx1QkFBdUIsRUFBRSxDQUFDO1FBRWhELE9BQU8sQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtZQUM1QixJQUFJLFNBQVM7Z0JBQ1gsT0FBTztZQUNULFNBQVMsR0FBRyxJQUFJLENBQUM7WUFFakIsS0FBSyxNQUFNLEVBQUMsSUFBSSxFQUFFLE9BQU8sRUFBQyxJQUFJLE9BQU8sRUFBRTtnQkFDckMsSUFBSSxDQUFDLFlBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUU7b0JBQ3hCLEtBQUssWUFBRSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLElBQUksRUFB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QUM7SUFDL0UsQ0FBQztDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge2Zvcmt9IGZyb20gJ2NoaWxkX3Byb2Nlc3MnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7cGxpbmtFbnZ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5pbXBvcnQgKiBhcyBfZWRpdG9ySGVscGVyIGZyb20gJy4vZWRpdG9yLWhlbHBlcic7XG5pbXBvcnQgKiBhcyBfc3RvcmUgZnJvbSAnLi9zdG9yZSc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuXG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5leHBvcnQgY29uc3QgaXNXaW4zMiA9IG9zLnBsYXRmb3JtKCkuaW5kZXhPZignd2luMzInKSA+PSAwO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuZm9yay1mb3ItcHJlc2VydmVyLXN5bWxpbmsnKTtcblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZvcmtGaWxlKG1vZHVsZU5hbWU6IHN0cmluZykge1xuICBwcm9jZXNzLm9uKCdTSUdJTlQnLCAoKSA9PiB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZygnYnllJyk7XG4gICAgcHJvY2Vzcy5leGl0KDApO1xuICB9KTtcblxuICBsZXQgcmVjb3ZlcmVkID0gZmFsc2U7XG4gIGNvbnN0IHJlbW92ZWQgPSBhd2FpdCByZW1vdmVOb2RlTW9kdWxlU3ltbGluaygpO1xuXG4gIHByb2Nlc3Mub24oJ2JlZm9yZUV4aXQnLCAoKSA9PiB7XG4gICAgaWYgKHJlY292ZXJlZClcbiAgICAgIHJldHVybjtcbiAgICByZWNvdmVyZWQgPSB0cnVlO1xuXG4gICAgZm9yIChjb25zdCB7bGluaywgY29udGVudH0gb2YgcmVtb3ZlZCkge1xuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGxpbmspKSB7XG4gICAgICAgIHZvaWQgZnMucHJvbWlzZXMuc3ltbGluayhjb250ZW50LCBsaW5rLCBpc1dpbjMyID8gJ2p1bmN0aW9uJyA6ICdkaXInKTtcbiAgICAgICAgbG9nLmluZm8oJ3JlY292ZXIgJyArIGxpbmspO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cblxuICBsZXQgYXJndiA9IHByb2Nlc3MuYXJndi5zbGljZSgyKTtcbiAgY29uc3QgZm91bmRDbWRPcHRJZHggPSAgYXJndi5maW5kSW5kZXgoYXJnID0+IGFyZyA9PT0gJy0tY3dkJyB8fCBhcmcgPT09ICctLXNwYWNlJyk7XG4gIGNvbnN0IHdvcmtkaXIgPSBmb3VuZENtZE9wdElkeCA+PSAwID8gUGF0aC5yZXNvbHZlKHBsaW5rRW52LnJvb3REaXIsICBhcmd2W2ZvdW5kQ21kT3B0SWR4ICsgMV0pIDogbnVsbDtcbiAgaWYgKHdvcmtkaXIpIHtcbiAgICBhcmd2LnNwbGljZShmb3VuZENtZE9wdElkeCwgMik7XG4gICAgLy8gcHJvY2Vzcy5lbnYuUExJTktfV09SS19ESVIgPSB3b3JrZGlyO1xuICB9XG5cbiAgcHJvY2Vzcy5leGVjQXJndi5wdXNoKCctLXByZXNlcnZlLXN5bWxpbmtzLW1haW4nLCAnLS1wcmVzZXJ2ZS1zeW1saW5rcycpO1xuICBjb25zdCBmb3VuZERlYnVnT3B0SWR4ID0gYXJndi5maW5kSW5kZXgoYXJnID0+IGFyZyA9PT0gJy0taW5zcGVjdCcgfHwgYXJnID09PSAnLS1pbnNwZWN0LWJyaycpO1xuXG4gIGNvbnN0IGVudjoge1trZXk6IHN0cmluZ106IHN0cmluZyB8IHVuZGVmaW5lZH0gPSB7Li4ucHJvY2Vzcy5lbnZ9O1xuICBpZiAoZm91bmREZWJ1Z09wdElkeCA+PSAwKSB7XG4gICAgZW52Lk5PREVfT1BUSU9OUyA9IGVudi5OT0RFX09QVElPTlMgPyBlbnYuTk9ERV9PUFRJT05TICsgJyAnICsgYXJndltmb3VuZERlYnVnT3B0SWR4XSA6IGFyZ3ZbZm91bmREZWJ1Z09wdElkeF07XG4gICAgYXJndi5zcGxpY2UoZm91bmREZWJ1Z09wdElkeCwgMSk7XG4gIH1cbiAgY29uc3QgZGVidWdPcHRJZHggPSBhcmd2LmZpbmRJbmRleChhcmcgPT4gYXJnID09PSAnLS1kZWJ1ZycpO1xuICBpZiAoZGVidWdPcHRJZHggPj0gMCkge1xuICAgIGVudi5OT0RFX09QVElPTlMgPSBlbnYuTk9ERV9PUFRJT05TID8gZW52Lk5PREVfT1BUSU9OUyArICcgLS1pbnNwZWN0LWJyaycgOiAnLS1pbnNwZWN0LWJyayc7XG4gICAgYXJndi5zcGxpY2UoZGVidWdPcHRJZHgsIDEpO1xuICB9XG5cbiAgZW52Ll9fcGxpbmtfZm9ya19tYWluID0gbW9kdWxlTmFtZTtcbiAgLy8gZW52Ll9fcGxpbmtfc2F2ZV9zdGF0ZSA9ICcxJztcblxuICBpZiAod29ya2RpcilcbiAgICBlbnYuUExJTktfV09SS19ESVIgPSB3b3JrZGlyO1xuXG4gIGNvbnN0IGNwID0gZm9yayhQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnZm9yay1wcmVzZXJ2ZS1zeW1saW5rLW1haW4uanMnKSwgYXJndiwge1xuICAgIGVudixcbiAgICBzdGRpbzogJ2luaGVyaXQnXG4gIH0pO1xuXG4gIGNwLm9uKCdleGl0JywgY29kZSA9PiB7XG4gICAgaWYgKGNvZGUgIT0gbnVsbCAmJiBjb2RlICE9PSAwKSB7XG4gICAgICBwcm9jZXNzLmV4aXQoY29kZSk7XG4gICAgfVxuICB9KTtcblxuICAvLyBjb25zdCB7aXNTdGF0ZVN5bmNNc2d9ID0gcmVxdWlyZSgnLi9zdG9yZScpIGFzIHR5cGVvZiBfc3RvcmU7XG4gIC8vIGNwLm9uKCdtZXNzYWdlJywgKG1zZykgPT4ge1xuICAvLyAgIGlmIChpc1N0YXRlU3luY01zZyhtc2cpKSB7XG4gIC8vICAgICAvLyBjb25zdCBzdGF0ID0gZXZhbCgnKCcgKyBtc2cuZGF0YSArICcpJyk7XG4gIC8vICAgfVxuICAvLyB9KTtcblxuICByZXR1cm47XG59XG5cbi8qKlxuICogVGVtcG9yYXJpbHkgcmVuYW1lIDxwa2c+L25vZGVfbW9kdWxlcyB0byBhbm90aGVyIG5hbWVcbiAqIEByZXR1cm5zIFxuICovXG5hc3luYyBmdW5jdGlvbiByZW1vdmVOb2RlTW9kdWxlU3ltbGluaygpIHtcbiAgY29uc3Qge2dldFN0YXRlfSA9IHJlcXVpcmUoJy4vZWRpdG9yLWhlbHBlcicpIGFzIHR5cGVvZiBfZWRpdG9ySGVscGVyO1xuICBjb25zdCBsaW5rcyA9IGdldFN0YXRlKCkubm9kZU1vZHVsZVN5bWxpbmtzO1xuXG4gIGlmIChsaW5rcyA9PSBudWxsKVxuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoW10pO1xuXG4gIGNvbnN0IGRvbmVzID0gQXJyYXkuZnJvbShsaW5rcy52YWx1ZXMoKSkubWFwKGFzeW5jIGxpbmsgPT4ge1xuICAgIGxldCBzdGF0OiBmcy5TdGF0cyB8IHVuZGVmaW5lZDtcbiAgICB0cnkge1xuICAgICAgc3RhdCA9IGF3YWl0IGZzLnByb21pc2VzLmxzdGF0KGxpbmspO1xuICAgIGlmICghc3RhdC5pc1N5bWJvbGljTGluaygpKVxuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICBjb25zdCBjb250ZW50ID0gZnMucmVhZGxpbmtTeW5jKGxpbmspO1xuICAgIGxvZy5pbmZvKCdiYWNrdXAgc3ltbGluazogJyArIGxpbmspO1xuICAgIGF3YWl0IGZzLnByb21pc2VzLnVubGluayhsaW5rKTtcbiAgICByZXR1cm4ge2xpbmssIGNvbnRlbnR9O1xuICB9KTtcbiAgY29uc3QgcmVzID0gYXdhaXQgUHJvbWlzZS5hbGwoZG9uZXMpO1xuICByZXR1cm4gcmVzLmZpbHRlcihpdGVtID0+IGl0ZW0gIT0gbnVsbCkgYXMge2xpbms6IHN0cmluZzsgY29udGVudDogc3RyaW5nfVtdO1xufVxuIl19