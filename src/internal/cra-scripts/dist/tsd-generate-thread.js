"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const worker_threads_1 = require("worker_threads");
const bootstrap_process_1 = require("@wfh/plink/wfh/dist/utils/bootstrap-process");
(async function () {
    if (!worker_threads_1.isMainThread) {
        (0, bootstrap_process_1.initAsChildProcess)();
        (0, bootstrap_process_1.initConfig)(JSON.parse(process.env.PLINK_CLI_OPTS));
    }
    const { buildTsd } = require('./tsd-generate');
    await buildTsd();
})().catch(err => {
    if (worker_threads_1.parentPort)
        worker_threads_1.parentPort.postMessage(err);
});
//# sourceMappingURL=tsd-generate-thread.js.map