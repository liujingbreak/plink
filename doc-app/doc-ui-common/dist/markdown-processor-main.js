"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markdownProcessor = exports.setupBroker = void 0;
const tslib_1 = require("tslib");
const worker_threads_1 = require("worker_threads");
const path_1 = tslib_1.__importDefault(require("path"));
const os_1 = tslib_1.__importDefault(require("os"));
const node_worker_broker_1 = require("@wfh/reactivizer/dist/fork-join/node-worker-broker");
const plink_1 = require("@wfh/plink");
const markdown_processor_1 = require("./markdown-processor");
Object.defineProperty(exports, "markdownProcessor", { enumerable: true, get: function () { return markdown_processor_1.markdownProcessor; } });
const log = (0, plink_1.log4File)(__filename);
function setupBroker(excludeCurrentThead = false) {
    const broker = (0, node_worker_broker_1.setupForMainWorker)(markdown_processor_1.markdownProcessor, {
        name: 'broker',
        maxNumOfWorker: os_1.default.availableParallelism(),
        debug: true,
        excludeCurrentThead,
        log(...args) {
            log.info(...args);
        },
        logStyle: 'noParam',
        workerFactory() {
            return new worker_threads_1.Worker(path_1.default.resolve(__dirname, '../dist/markdown-processor-worker.js'));
        }
    });
    return broker;
}
exports.setupBroker = setupBroker;
//# sourceMappingURL=markdown-processor-main.js.map