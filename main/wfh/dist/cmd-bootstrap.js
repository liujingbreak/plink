#!/usr/bin/env node
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
/* eslint-disable no-console */
require("./node-path");
// import checkNode from './utils/node-version-check';
const chalk_1 = __importDefault(require("chalk"));
const bootstrap_process_1 = require("./utils/bootstrap-process");
const fork_for_preserve_symlink_1 = require("./fork-for-preserve-symlink");
const worker_threads_1 = require("worker_threads");
const startTime = new Date().getTime();
(function run() {
    return __awaiter(this, void 0, void 0, function* () {
        process.on('exit', () => {
            // eslint-disable-next-line no-console
            console.log((process.send || !worker_threads_1.isMainThread ? `[P${process.pid}.T${worker_threads_1.threadId}] ` : '') +
                chalk_1.default.green(`Done in ${new Date().getTime() - startTime} ms`));
        });
        let storeSettingDispatcher;
        if (process.send) {
            // current process is forked
            (0, bootstrap_process_1.initAsChildProcess)(true);
        }
        else {
            storeSettingDispatcher = (0, bootstrap_process_1.initProcess)();
        }
        if ((process.env.NODE_PRESERVE_SYMLINKS !== '1' && process.execArgv.indexOf('--preserve-symlinks') < 0)) {
            if (storeSettingDispatcher)
                storeSettingDispatcher.changeActionOnExit('none');
            void (0, fork_for_preserve_symlink_1.forkFile)('@wfh/plink/wfh/dist/cmd-bootstrap');
            return;
        }
        yield new Promise(resolve => process.nextTick(resolve));
        return require('./cmd/cli').createCommands(startTime);
    });
})().catch(err => {
    console.log(err);
    process.exit(1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLWJvb3RzdHJhcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2NtZC1ib290c3RyYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsK0JBQStCO0FBQy9CLHVCQUFxQjtBQUNyQixzREFBc0Q7QUFDdEQsa0RBQTBCO0FBQzFCLGlFQUEwRTtBQUUxRSwyRUFBcUQ7QUFDckQsbURBQXNEO0FBRXRELE1BQU0sU0FBUyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7QUFFdkMsQ0FBQyxTQUFlLEdBQUc7O1FBRWpCLE9BQU8sQ0FBQyxFQUFFLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRTtZQUN0QixzQ0FBc0M7WUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyw2QkFBWSxDQUFDLENBQUMsQ0FBQyxLQUFLLE9BQU8sQ0FBQyxHQUFHLEtBQUsseUJBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ2xGLGVBQUssQ0FBQyxLQUFLLENBQUMsV0FBVyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLFNBQVMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNuRSxDQUFDLENBQUMsQ0FBQztRQUNILElBQUksc0JBQWtFLENBQUM7UUFDdkUsSUFBSSxPQUFPLENBQUMsSUFBSSxFQUFFO1lBQ2hCLDRCQUE0QjtZQUM1QixJQUFBLHNDQUFrQixFQUFDLElBQUksQ0FBQyxDQUFDO1NBQzFCO2FBQU07WUFDTCxzQkFBc0IsR0FBRyxJQUFBLCtCQUFXLEdBQUUsQ0FBQztTQUN4QztRQUNELElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLHNCQUFzQixLQUFLLEdBQUcsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFO1lBQ3ZHLElBQUksc0JBQXNCO2dCQUN4QixzQkFBc0IsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNwRCxLQUFLLElBQUEsb0NBQVEsRUFBQyxtQ0FBbUMsQ0FBQyxDQUFDO1lBQ25ELE9BQU87U0FDUjtRQUNELE1BQU0sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFFeEQsT0FBUSxPQUFPLENBQUMsV0FBVyxDQUFpQixDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUN6RSxDQUFDO0NBQUEsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxFQUFFO0lBQ2YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNqQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xCLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuLyogZXNsaW50LWRpc2FibGUgbm8tY29uc29sZSAqL1xuaW1wb3J0ICcuL25vZGUtcGF0aCc7XG4vLyBpbXBvcnQgY2hlY2tOb2RlIGZyb20gJy4vdXRpbHMvbm9kZS12ZXJzaW9uLWNoZWNrJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQge2luaXRQcm9jZXNzLCBpbml0QXNDaGlsZFByb2Nlc3N9IGZyb20gJy4vdXRpbHMvYm9vdHN0cmFwLXByb2Nlc3MnO1xuaW1wb3J0ICogYXMgX2NsaSBmcm9tICcuL2NtZC9jbGknO1xuaW1wb3J0IHtmb3JrRmlsZX0gZnJvbSAnLi9mb3JrLWZvci1wcmVzZXJ2ZS1zeW1saW5rJztcbmltcG9ydCB7aXNNYWluVGhyZWFkLCB0aHJlYWRJZH0gZnJvbSAnd29ya2VyX3RocmVhZHMnO1xuXG5jb25zdCBzdGFydFRpbWUgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcblxuKGFzeW5jIGZ1bmN0aW9uIHJ1bigpIHtcblxuICBwcm9jZXNzLm9uKCdleGl0JywgKCkgPT4ge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coKHByb2Nlc3Muc2VuZCB8fCAhaXNNYWluVGhyZWFkID8gYFtQJHtwcm9jZXNzLnBpZH0uVCR7dGhyZWFkSWR9XSBgIDogJycpICtcbiAgICAgIGNoYWxrLmdyZWVuKGBEb25lIGluICR7bmV3IERhdGUoKS5nZXRUaW1lKCkgLSBzdGFydFRpbWV9IG1zYCkpO1xuICB9KTtcbiAgbGV0IHN0b3JlU2V0dGluZ0Rpc3BhdGNoZXI6IFJldHVyblR5cGU8dHlwZW9mIGluaXRQcm9jZXNzPiB8IHVuZGVmaW5lZDtcbiAgaWYgKHByb2Nlc3Muc2VuZCkge1xuICAgIC8vIGN1cnJlbnQgcHJvY2VzcyBpcyBmb3JrZWRcbiAgICBpbml0QXNDaGlsZFByb2Nlc3ModHJ1ZSk7XG4gIH0gZWxzZSB7XG4gICAgc3RvcmVTZXR0aW5nRGlzcGF0Y2hlciA9IGluaXRQcm9jZXNzKCk7XG4gIH1cbiAgaWYgKChwcm9jZXNzLmVudi5OT0RFX1BSRVNFUlZFX1NZTUxJTktTICE9PSAnMScgJiYgcHJvY2Vzcy5leGVjQXJndi5pbmRleE9mKCctLXByZXNlcnZlLXN5bWxpbmtzJykgPCAwKSkge1xuICAgIGlmIChzdG9yZVNldHRpbmdEaXNwYXRjaGVyKVxuICAgICAgc3RvcmVTZXR0aW5nRGlzcGF0Y2hlci5jaGFuZ2VBY3Rpb25PbkV4aXQoJ25vbmUnKTtcbiAgICB2b2lkIGZvcmtGaWxlKCdAd2ZoL3BsaW5rL3dmaC9kaXN0L2NtZC1ib290c3RyYXAnKTtcbiAgICByZXR1cm47XG4gIH1cbiAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBwcm9jZXNzLm5leHRUaWNrKHJlc29sdmUpKTtcblxuICByZXR1cm4gKHJlcXVpcmUoJy4vY21kL2NsaScpIGFzIHR5cGVvZiBfY2xpKS5jcmVhdGVDb21tYW5kcyhzdGFydFRpbWUpO1xufSkoKS5jYXRjaChlcnIgPT4ge1xuICBjb25zb2xlLmxvZyhlcnIpO1xuICBwcm9jZXNzLmV4aXQoMSk7XG59KTtcbiJdfQ==