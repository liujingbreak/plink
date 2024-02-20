"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const worker_threads_1 = require("worker_threads");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const cli_1 = require("./cmd/cli");
const startTime = new Date().getTime();
process.on('exit', (code) => {
    // eslint-disable-next-line no-console
    console.log((process.send || !worker_threads_1.isMainThread ? `[P${process.pid}.T${worker_threads_1.threadId}] ` : '') +
        chalk_1.default.green(`${code !== 0 ? 'Failed' : 'Done'} in ${new Date().getTime() - startTime} ms`));
});
void (0, cli_1.createCommands)(startTime);
//# sourceMappingURL=_cmd-bootstrap.js.map