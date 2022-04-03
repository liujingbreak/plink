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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY21kLWJvb3RzdHJhcC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2NtZC1ib290c3RyYXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQ0EsK0JBQStCO0FBQy9CLHVCQUFxQjtBQUNyQixzREFBc0Q7QUFDdEQsbURBQXNEO0FBQ3RELGtEQUEwQjtBQUUxQiw0RkFBaUU7QUFFakUsTUFBTSxTQUFTLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztBQUV2QyxJQUFBLG1DQUFzQixFQUFDLG1DQUFtQyxFQUFFO0lBQzFELGVBQWUsRUFBRSxNQUFNO0lBQ3ZCLGlCQUFpQixFQUFFLEtBQUs7Q0FDekIsRUFBRSxHQUFHLEVBQUU7SUFFTixPQUFPLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksRUFBRSxFQUFFO1FBQzFCLHNDQUFzQztRQUN0QyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxDQUFDLDZCQUFZLENBQUMsQ0FBQyxDQUFDLEtBQUssT0FBTyxDQUFDLEdBQUcsS0FBSyx5QkFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNsRixlQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxNQUFNLE9BQU8sSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxTQUFTLEtBQUssQ0FBQyxDQUFDLENBQUM7SUFDaEcsQ0FBQyxDQUFDLENBQUM7SUFFSCxLQUFNLE9BQU8sQ0FBQyxXQUFXLENBQWlCLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQ3JFLE9BQU8sRUFBRSxDQUFDO0FBQ1osQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG4vKiBlc2xpbnQtZGlzYWJsZSBuby1jb25zb2xlICovXG5pbXBvcnQgJy4vbm9kZS1wYXRoJztcbi8vIGltcG9ydCBjaGVja05vZGUgZnJvbSAnLi91dGlscy9ub2RlLXZlcnNpb24tY2hlY2snO1xuaW1wb3J0IHtpc01haW5UaHJlYWQsIHRocmVhZElkfSBmcm9tICd3b3JrZXJfdGhyZWFkcyc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0ICogYXMgX2NsaSBmcm9tICcuL2NtZC9jbGknO1xuaW1wb3J0IHJ1bldpdGhQcmVzZXJ2ZVN5bWxpbmsgZnJvbSAnLi9mb3JrLWZvci1wcmVzZXJ2ZS1zeW1saW5rJztcblxuY29uc3Qgc3RhcnRUaW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG5cbnJ1bldpdGhQcmVzZXJ2ZVN5bWxpbmsoJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvY21kLWJvb3RzdHJhcCcsIHtcbiAgc3RhdGVFeGl0QWN0aW9uOiAnc2F2ZScsXG4gIGhhbmRsZVNodXRkb3duTXNnOiBmYWxzZVxufSwgKCkgPT4ge1xuXG4gIHByb2Nlc3Mub24oJ2V4aXQnLCAoY29kZSkgPT4ge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coKHByb2Nlc3Muc2VuZCB8fCAhaXNNYWluVGhyZWFkID8gYFtQJHtwcm9jZXNzLnBpZH0uVCR7dGhyZWFkSWR9XSBgIDogJycpICtcbiAgICAgIGNoYWxrLmdyZWVuKGAke2NvZGUgIT09IDAgPyAnRmFpbGVkJyA6ICdEb25lJ30gaW4gJHtuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHN0YXJ0VGltZX0gbXNgKSk7XG4gIH0pO1xuXG4gIHZvaWQgKHJlcXVpcmUoJy4vY21kL2NsaScpIGFzIHR5cGVvZiBfY2xpKS5jcmVhdGVDb21tYW5kcyhzdGFydFRpbWUpO1xuICByZXR1cm4gW107XG59KTtcblxuIl19