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
//# sourceMappingURL=cmd-bootstrap.js.map