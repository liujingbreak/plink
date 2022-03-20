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
const fork_for_preserve_symlink_1 = __importDefault(require("./fork-for-preserve-symlink"));
const startTime = new Date().getTime();
(0, fork_for_preserve_symlink_1.default)('@wfh/plink/wfh/dist/cmd-bootstrap', {
    stateExitAction: 'save',
    handleShutdownMsg: false
}, () => {
    process.on('exit', (code) => {
        // eslint-disable-next-line no-console
        console.log((process.send || !worker_threads_1.isMainThread ? `[P${process.pid}.T${worker_threads_1.threadId}] ` : '') +
            chalk_1.default.green(`${code !== 0 ? 'Failed' : 'Done'} in ${new Date().getTime() - startTime} ms`));
    });
    void require('./cmd/cli').createCommands(startTime);
    return [];
});
// (async function run() {
//
//   let storeSettingDispatcher: ReturnType<typeof initProcess> | undefined;
//   if (process.send) {
//     // current process is forked
//     initAsChildProcess('save');
//   } else {
//     process.on('exit', (code) => {
//       // eslint-disable-next-line no-console
//       console.log((process.send || !isMainThread ? `[P${process.pid}.T${threadId}] ` : '') +
//         chalk.green(`${code !== 0 ? 'Failed' : 'Done'} in ${new Date().getTime() - startTime} ms`));
//     });
//     storeSettingDispatcher = initProcess();
//   }
//   if ((process.env.NODE_PRESERVE_SYMLINKS !== '1' && process.execArgv.indexOf('--preserve-symlinks') < 0)) {
//     if (storeSettingDispatcher)
//       storeSettingDispatcher.changeActionOnExit('none');
//     void forkFile('@wfh/plink/wfh/dist/cmd-bootstrap');
//     return;
//   }
//   await new Promise(resolve => process.nextTick(resolve));
//
//   return (require('./cmd/cli') as typeof _cli).createCommands(startTime);
// })().catch(err => {
//   console.log(err);
//   process.exit(1);
// });
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLWJvb3RzdHJhcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2NtZC1ib290c3RyYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQ0EsK0JBQStCO0FBQy9CLHVCQUFxQjtBQUNyQixzREFBc0Q7QUFDdEQsbURBQXNEO0FBQ3RELGtEQUEwQjtBQUUxQiw0RkFBaUU7QUFFakUsTUFBTSxTQUFTLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUV2QyxJQUFBLG1DQUFzQixFQUFDLG1DQUFtQyxFQUFFO0lBQzFELGVBQWUsRUFBRSxNQUFNO0lBQ3ZCLGlCQUFpQixFQUFFLEtBQUs7Q0FDekIsRUFBRSxHQUFHLEVBQUU7SUFFTixPQUFPLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1FBQzFCLHNDQUFzQztRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxDQUFDLDZCQUFZLENBQUMsQ0FBQyxDQUFDLEtBQUssT0FBTyxDQUFDLEdBQUcsS0FBSyx5QkFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNsRixlQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLE9BQU8sSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxTQUFTLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDaEcsQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFNLE9BQU8sQ0FBQyxXQUFXLENBQWlCLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3JFLE9BQU8sRUFBRSxDQUFDO0FBQ1osQ0FBQyxDQUFDLENBQUM7QUFDSCwwQkFBMEI7QUFDMUIsRUFBRTtBQUNGLDRFQUE0RTtBQUM1RSx3QkFBd0I7QUFDeEIsbUNBQW1DO0FBQ25DLGtDQUFrQztBQUNsQyxhQUFhO0FBQ2IscUNBQXFDO0FBQ3JDLCtDQUErQztBQUMvQywrRkFBK0Y7QUFDL0YsdUdBQXVHO0FBQ3ZHLFVBQVU7QUFDViw4Q0FBOEM7QUFDOUMsTUFBTTtBQUNOLCtHQUErRztBQUMvRyxrQ0FBa0M7QUFDbEMsMkRBQTJEO0FBQzNELDBEQUEwRDtBQUMxRCxjQUFjO0FBQ2QsTUFBTTtBQUNOLDZEQUE2RDtBQUM3RCxFQUFFO0FBQ0YsNEVBQTRFO0FBQzVFLHNCQUFzQjtBQUN0QixzQkFBc0I7QUFDdEIscUJBQXFCO0FBQ3JCLE1BQU0iLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG4vKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG5pbXBvcnQgJy4vbm9kZS1wYXRoJztcbi8vIGltcG9ydCBjaGVja05vZGUgZnJvbSAnLi91dGlscy9ub2RlLXZlcnNpb24tY2hlY2snO1xuaW1wb3J0IHtpc01haW5UaHJlYWQsIHRocmVhZElkfSBmcm9tICd3b3JrZXJfdGhyZWFkcyc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0ICogYXMgX2NsaSBmcm9tICcuL2NtZC9jbGknO1xuaW1wb3J0IHJ1bldpdGhQcmVzZXJ2ZVN5bWxpbmsgZnJvbSAnLi9mb3JrLWZvci1wcmVzZXJ2ZS1zeW1saW5rJztcblxuY29uc3Qgc3RhcnRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cbnJ1bldpdGhQcmVzZXJ2ZVN5bWxpbmsoJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvY21kLWJvb3RzdHJhcCcsIHtcbiAgc3RhdGVFeGl0QWN0aW9uOiAnc2F2ZScsXG4gIGhhbmRsZVNodXRkb3duTXNnOiBmYWxzZVxufSwgKCkgPT4ge1xuXG4gIHByb2Nlc3Mub24oJ2V4aXQnLCAoY29kZSkgPT4ge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coKHByb2Nlc3Muc2VuZCB8fCAhaXNNYWluVGhyZWFkID8gYFtQJHtwcm9jZXNzLnBpZH0uVCR7dGhyZWFkSWR9XSBgIDogJycpICtcbiAgICAgIGNoYWxrLmdyZWVuKGAke2NvZGUgIT09IDAgPyAnRmFpbGVkJyA6ICdEb25lJ30gaW4gJHtuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHN0YXJ0VGltZX0gbXNgKSk7XG4gIH0pO1xuXG4gIHZvaWQgKHJlcXVpcmUoJy4vY21kL2NsaScpIGFzIHR5cGVvZiBfY2xpKS5jcmVhdGVDb21tYW5kcyhzdGFydFRpbWUpO1xuICByZXR1cm4gW107XG59KTtcbi8vIChhc3luYyBmdW5jdGlvbiBydW4oKSB7XG4vL1xuLy8gICBsZXQgc3RvcmVTZXR0aW5nRGlzcGF0Y2hlcjogUmV0dXJuVHlwZTx0eXBlb2YgaW5pdFByb2Nlc3M+IHwgdW5kZWZpbmVkO1xuLy8gICBpZiAocHJvY2Vzcy5zZW5kKSB7XG4vLyAgICAgLy8gY3VycmVudCBwcm9jZXNzIGlzIGZvcmtlZFxuLy8gICAgIGluaXRBc0NoaWxkUHJvY2Vzcygnc2F2ZScpO1xuLy8gICB9IGVsc2Uge1xuLy8gICAgIHByb2Nlc3Mub24oJ2V4aXQnLCAoY29kZSkgPT4ge1xuLy8gICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbi8vICAgICAgIGNvbnNvbGUubG9nKChwcm9jZXNzLnNlbmQgfHwgIWlzTWFpblRocmVhZCA/IGBbUCR7cHJvY2Vzcy5waWR9LlQke3RocmVhZElkfV0gYCA6ICcnKSArXG4vLyAgICAgICAgIGNoYWxrLmdyZWVuKGAke2NvZGUgIT09IDAgPyAnRmFpbGVkJyA6ICdEb25lJ30gaW4gJHtuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHN0YXJ0VGltZX0gbXNgKSk7XG4vLyAgICAgfSk7XG4vLyAgICAgc3RvcmVTZXR0aW5nRGlzcGF0Y2hlciA9IGluaXRQcm9jZXNzKCk7XG4vLyAgIH1cbi8vICAgaWYgKChwcm9jZXNzLmVudi5OT0RFX1BSRVNFUlZFX1NZTUxJTktTICE9PSAnMScgJiYgcHJvY2Vzcy5leGVjQXJndi5pbmRleE9mKCctLXByZXNlcnZlLXN5bWxpbmtzJykgPCAwKSkge1xuLy8gICAgIGlmIChzdG9yZVNldHRpbmdEaXNwYXRjaGVyKVxuLy8gICAgICAgc3RvcmVTZXR0aW5nRGlzcGF0Y2hlci5jaGFuZ2VBY3Rpb25PbkV4aXQoJ25vbmUnKTtcbi8vICAgICB2b2lkIGZvcmtGaWxlKCdAd2ZoL3BsaW5rL3dmaC9kaXN0L2NtZC1ib290c3RyYXAnKTtcbi8vICAgICByZXR1cm47XG4vLyAgIH1cbi8vICAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBwcm9jZXNzLm5leHRUaWNrKHJlc29sdmUpKTtcbi8vXG4vLyAgIHJldHVybiAocmVxdWlyZSgnLi9jbWQvY2xpJykgYXMgdHlwZW9mIF9jbGkpLmNyZWF0ZUNvbW1hbmRzKHN0YXJ0VGltZSk7XG4vLyB9KSgpLmNhdGNoKGVyciA9PiB7XG4vLyAgIGNvbnNvbGUubG9nKGVycik7XG4vLyAgIHByb2Nlc3MuZXhpdCgxKTtcbi8vIH0pO1xuIl19