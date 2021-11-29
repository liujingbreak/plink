#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable no-console */
require("./node-path");
// import checkNode from './utils/node-version-check';
const worker_threads_1 = require("worker_threads");
const chalk_1 = __importDefault(require("chalk"));
const bootstrap_process_1 = require("./utils/bootstrap-process");
const fork_for_preserve_symlink_1 = require("./fork-for-preserve-symlink");
const startTime = new Date().getTime();
(async function run() {
    let storeSettingDispatcher;
    if (process.send) {
        // current process is forked
        (0, bootstrap_process_1.initAsChildProcess)(true);
    }
    else {
        process.on('exit', (code) => {
            // eslint-disable-next-line no-console
            console.log((process.send || !worker_threads_1.isMainThread ? `[P${process.pid}.T${worker_threads_1.threadId}] ` : '') +
                chalk_1.default.green(`${code !== 0 ? 'Failed' : 'Done'} in ${new Date().getTime() - startTime} ms`));
        });
        storeSettingDispatcher = (0, bootstrap_process_1.initProcess)();
    }
    if ((process.env.NODE_PRESERVE_SYMLINKS !== '1' && process.execArgv.indexOf('--preserve-symlinks') < 0)) {
        if (storeSettingDispatcher)
            storeSettingDispatcher.changeActionOnExit('none');
        void (0, fork_for_preserve_symlink_1.forkFile)('@wfh/plink/wfh/dist/cmd-bootstrap');
        return;
    }
    await new Promise(resolve => process.nextTick(resolve));
    return require('./cmd/cli').createCommands(startTime);
})().catch(err => {
    console.log(err);
    process.exit(1);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLWJvb3RzdHJhcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2NtZC1ib290c3RyYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQ0EsK0JBQStCO0FBQy9CLHVCQUFxQjtBQUNyQixzREFBc0Q7QUFDdEQsbURBQXNEO0FBQ3RELGtEQUEwQjtBQUMxQixpRUFBMEU7QUFFMUUsMkVBQXFEO0FBRXJELE1BQU0sU0FBUyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7QUFFdkMsQ0FBQyxLQUFLLFVBQVUsR0FBRztJQUVqQixJQUFJLHNCQUFrRSxDQUFDO0lBQ3ZFLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtRQUNoQiw0QkFBNEI7UUFDNUIsSUFBQSxzQ0FBa0IsRUFBQyxJQUFJLENBQUMsQ0FBQztLQUMxQjtTQUFNO1FBQ0wsT0FBTyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUMxQixzQ0FBc0M7WUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyw2QkFBWSxDQUFDLENBQUMsQ0FBQyxLQUFLLE9BQU8sQ0FBQyxHQUFHLEtBQUsseUJBQVEsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ2xGLGVBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sT0FBTyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLFNBQVMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNoRyxDQUFDLENBQUMsQ0FBQztRQUNILHNCQUFzQixHQUFHLElBQUEsK0JBQVcsR0FBRSxDQUFDO0tBQ3hDO0lBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLEtBQUssR0FBRyxJQUFJLE9BQU8sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUU7UUFDdkcsSUFBSSxzQkFBc0I7WUFDeEIsc0JBQXNCLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDcEQsS0FBSyxJQUFBLG9DQUFRLEVBQUMsbUNBQW1DLENBQUMsQ0FBQztRQUNuRCxPQUFPO0tBQ1I7SUFDRCxNQUFNLElBQUksT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0lBRXhELE9BQVEsT0FBTyxDQUFDLFdBQVcsQ0FBaUIsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDekUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUU7SUFDZixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ2pCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEIsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG4vKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG5pbXBvcnQgJy4vbm9kZS1wYXRoJztcbi8vIGltcG9ydCBjaGVja05vZGUgZnJvbSAnLi91dGlscy9ub2RlLXZlcnNpb24tY2hlY2snO1xuaW1wb3J0IHtpc01haW5UaHJlYWQsIHRocmVhZElkfSBmcm9tICd3b3JrZXJfdGhyZWFkcyc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHtpbml0UHJvY2VzcywgaW5pdEFzQ2hpbGRQcm9jZXNzfSBmcm9tICcuL3V0aWxzL2Jvb3RzdHJhcC1wcm9jZXNzJztcbmltcG9ydCAqIGFzIF9jbGkgZnJvbSAnLi9jbWQvY2xpJztcbmltcG9ydCB7Zm9ya0ZpbGV9IGZyb20gJy4vZm9yay1mb3ItcHJlc2VydmUtc3ltbGluayc7XG5cbmNvbnN0IHN0YXJ0VGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXG4oYXN5bmMgZnVuY3Rpb24gcnVuKCkge1xuXG4gIGxldCBzdG9yZVNldHRpbmdEaXNwYXRjaGVyOiBSZXR1cm5UeXBlPHR5cGVvZiBpbml0UHJvY2Vzcz4gfCB1bmRlZmluZWQ7XG4gIGlmIChwcm9jZXNzLnNlbmQpIHtcbiAgICAvLyBjdXJyZW50IHByb2Nlc3MgaXMgZm9ya2VkXG4gICAgaW5pdEFzQ2hpbGRQcm9jZXNzKHRydWUpO1xuICB9IGVsc2Uge1xuICAgIHByb2Nlc3Mub24oJ2V4aXQnLCAoY29kZSkgPT4ge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKChwcm9jZXNzLnNlbmQgfHwgIWlzTWFpblRocmVhZCA/IGBbUCR7cHJvY2Vzcy5waWR9LlQke3RocmVhZElkfV0gYCA6ICcnKSArXG4gICAgICAgIGNoYWxrLmdyZWVuKGAke2NvZGUgIT09IDAgPyAnRmFpbGVkJyA6ICdEb25lJ30gaW4gJHtuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHN0YXJ0VGltZX0gbXNgKSk7XG4gICAgfSk7XG4gICAgc3RvcmVTZXR0aW5nRGlzcGF0Y2hlciA9IGluaXRQcm9jZXNzKCk7XG4gIH1cbiAgaWYgKChwcm9jZXNzLmVudi5OT0RFX1BSRVNFUlZFX1NZTUxJTktTICE9PSAnMScgJiYgcHJvY2Vzcy5leGVjQXJndi5pbmRleE9mKCctLXByZXNlcnZlLXN5bWxpbmtzJykgPCAwKSkge1xuICAgIGlmIChzdG9yZVNldHRpbmdEaXNwYXRjaGVyKVxuICAgICAgc3RvcmVTZXR0aW5nRGlzcGF0Y2hlci5jaGFuZ2VBY3Rpb25PbkV4aXQoJ25vbmUnKTtcbiAgICB2b2lkIGZvcmtGaWxlKCdAd2ZoL3BsaW5rL3dmaC9kaXN0L2NtZC1ib290c3RyYXAnKTtcbiAgICByZXR1cm47XG4gIH1cbiAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBwcm9jZXNzLm5leHRUaWNrKHJlc29sdmUpKTtcblxuICByZXR1cm4gKHJlcXVpcmUoJy4vY21kL2NsaScpIGFzIHR5cGVvZiBfY2xpKS5jcmVhdGVDb21tYW5kcyhzdGFydFRpbWUpO1xufSkoKS5jYXRjaChlcnIgPT4ge1xuICBjb25zb2xlLmxvZyhlcnIpO1xuICBwcm9jZXNzLmV4aXQoMSk7XG59KTtcbiJdfQ==