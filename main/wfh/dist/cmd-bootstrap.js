#!/usr/bin/env node
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
/* eslint-disable no-console */
require("./node-path");
// import checkNode from './utils/node-version-check';
const chalk_1 = __importDefault(require("chalk"));
const bootstrap_process_1 = require("./utils/bootstrap-process");
const child_process_1 = require("child_process");
const misc_1 = require("./utils/misc");
const path_1 = __importDefault(require("path"));
const startTime = new Date().getTime();
process.on('exit', () => {
    // eslint-disable-next-line no-console
    console.log(chalk_1.default.green(`Done in ${new Date().getTime() - startTime} ms`));
});
(function run() {
    return __awaiter(this, void 0, void 0, function* () {
        if (process.send) {
            // current process is forked
            bootstrap_process_1.initAsChildProcess(true);
        }
        else {
            bootstrap_process_1.initProcess();
        }
        yield new Promise(resolve => process.nextTick(resolve));
        const argv = process.argv.slice(2);
        const foundCmdOptIdx = argv.findIndex(arg => arg === '--cwd');
        if (foundCmdOptIdx >= 0) {
            const workdir = path_1.default.resolve(misc_1.plinkEnv.rootDir, argv[foundCmdOptIdx + 1]);
            if (workdir) {
                const pkgMgr = (yield Promise.resolve().then(() => __importStar(require('./package-mgr/index'))));
                if (pkgMgr.getState().workspaces.has(pkgMgr.workspaceKey(workdir))) {
                    const newArgv = argv.concat();
                    newArgv.splice(foundCmdOptIdx, 2);
                    child_process_1.fork(__filename, newArgv, { cwd: workdir });
                    return;
                }
            }
            console.log(chalk_1.default.yellow(workdir + ' is not an existing worktree space'));
        }
        return require('./cmd/cli').createCommands(startTime);
    });
})().catch(err => {
    console.log(err);
    process.exit(1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLWJvb3RzdHJhcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2NtZC1ib290c3RyYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLCtCQUErQjtBQUMvQix1QkFBcUI7QUFDckIsc0RBQXNEO0FBQ3RELGtEQUEwQjtBQUMxQixpRUFBMEU7QUFFMUUsaURBQW1DO0FBQ25DLHVDQUFzQztBQUN0QyxnREFBd0I7QUFFeEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUV2QyxPQUFPLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUU7SUFDdEIsc0NBQXNDO0lBQ3RDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBSyxDQUFDLEtBQUssQ0FBQyxXQUFXLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsU0FBUyxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQzdFLENBQUMsQ0FBQyxDQUFDO0FBRUgsQ0FBQyxTQUFlLEdBQUc7O1FBQ2pCLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtZQUNoQiw0QkFBNEI7WUFDNUIsc0NBQWtCLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDMUI7YUFBTTtZQUNMLCtCQUFXLEVBQUUsQ0FBQztTQUNmO1FBQ0QsTUFBTSxJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztRQUV4RCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQyxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxLQUFLLE9BQU8sQ0FBQyxDQUFDO1FBQzlELElBQUksY0FBYyxJQUFJLENBQUMsRUFBRTtZQUN2QixNQUFNLE9BQU8sR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLGVBQVEsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLGNBQWMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ3pFLElBQUksT0FBTyxFQUFFO2dCQUNYLE1BQU0sTUFBTSxHQUFHLENBQUMsd0RBQWEscUJBQXFCLEdBQUMsQ0FBQyxDQUFDO2dCQUNyRCxJQUFJLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRTtvQkFDbEUsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO29CQUM5QixPQUFPLENBQUMsTUFBTSxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDbEMsb0JBQUksQ0FBQyxVQUFVLEVBQUUsT0FBTyxFQUFFLEVBQUMsR0FBRyxFQUFFLE9BQU8sRUFBQyxDQUFDLENBQUM7b0JBQzFDLE9BQU87aUJBQ1I7YUFDRjtZQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsZUFBSyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEdBQUcsb0NBQW9DLENBQUMsQ0FBQyxDQUFDO1NBQzNFO1FBQ0QsT0FBUSxPQUFPLENBQUMsV0FBVyxDQUFpQixDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUN6RSxDQUFDO0NBQUEsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0lBQ2YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNqQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xCLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuaW1wb3J0ICcuL25vZGUtcGF0aCc7XG4vLyBpbXBvcnQgY2hlY2tOb2RlIGZyb20gJy4vdXRpbHMvbm9kZS12ZXJzaW9uLWNoZWNrJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQge2luaXRQcm9jZXNzLCBpbml0QXNDaGlsZFByb2Nlc3N9IGZyb20gJy4vdXRpbHMvYm9vdHN0cmFwLXByb2Nlc3MnO1xuaW1wb3J0ICogYXMgX2NsaSBmcm9tICcuL2NtZC9jbGknO1xuaW1wb3J0IHtmb3JrfSBmcm9tICdjaGlsZF9wcm9jZXNzJztcbmltcG9ydCB7cGxpbmtFbnZ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcblxuY29uc3Qgc3RhcnRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cbnByb2Nlc3Mub24oJ2V4aXQnLCAoKSA9PiB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gIGNvbnNvbGUubG9nKGNoYWxrLmdyZWVuKGBEb25lIGluICR7bmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzdGFydFRpbWV9IG1zYCkpO1xufSk7XG5cbihhc3luYyBmdW5jdGlvbiBydW4oKSB7XG4gIGlmIChwcm9jZXNzLnNlbmQpIHtcbiAgICAvLyBjdXJyZW50IHByb2Nlc3MgaXMgZm9ya2VkXG4gICAgaW5pdEFzQ2hpbGRQcm9jZXNzKHRydWUpO1xuICB9IGVsc2Uge1xuICAgIGluaXRQcm9jZXNzKCk7XG4gIH1cbiAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBwcm9jZXNzLm5leHRUaWNrKHJlc29sdmUpKTtcblxuICBjb25zdCBhcmd2ID0gcHJvY2Vzcy5hcmd2LnNsaWNlKDIpO1xuICBjb25zdCBmb3VuZENtZE9wdElkeCA9IGFyZ3YuZmluZEluZGV4KGFyZyA9PiBhcmcgPT09ICctLWN3ZCcpO1xuICBpZiAoZm91bmRDbWRPcHRJZHggPj0gMCkge1xuICAgIGNvbnN0IHdvcmtkaXIgPSBQYXRoLnJlc29sdmUocGxpbmtFbnYucm9vdERpciwgYXJndltmb3VuZENtZE9wdElkeCArIDFdKTtcbiAgICBpZiAod29ya2Rpcikge1xuICAgICAgY29uc3QgcGtnTWdyID0gKGF3YWl0IGltcG9ydCgnLi9wYWNrYWdlLW1nci9pbmRleCcpKTtcbiAgICAgIGlmIChwa2dNZ3IuZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmhhcyhwa2dNZ3Iud29ya3NwYWNlS2V5KHdvcmtkaXIpKSkge1xuICAgICAgICBjb25zdCBuZXdBcmd2ID0gYXJndi5jb25jYXQoKTtcbiAgICAgICAgbmV3QXJndi5zcGxpY2UoZm91bmRDbWRPcHRJZHgsIDIpO1xuICAgICAgICBmb3JrKF9fZmlsZW5hbWUsIG5ld0FyZ3YsIHtjd2Q6IHdvcmtkaXJ9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zb2xlLmxvZyhjaGFsay55ZWxsb3cod29ya2RpciArICcgaXMgbm90IGFuIGV4aXN0aW5nIHdvcmt0cmVlIHNwYWNlJykpO1xuICB9XG4gIHJldHVybiAocmVxdWlyZSgnLi9jbWQvY2xpJykgYXMgdHlwZW9mIF9jbGkpLmNyZWF0ZUNvbW1hbmRzKHN0YXJ0VGltZSk7XG59KSgpLmNhdGNoKGVyciA9PiB7XG4gIGNvbnNvbGUubG9nKGVycik7XG4gIHByb2Nlc3MuZXhpdCgxKTtcbn0pO1xuIl19