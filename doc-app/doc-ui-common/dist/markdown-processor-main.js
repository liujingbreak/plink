"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const os_1 = tslib_1.__importDefault(require("os"));
const node_worker_broker_1 = require("@wfh/reactivizer/dist/fork-join/node-worker-broker");
const markdown_processor_1 = require("./markdown-processor");
(0, node_worker_broker_1.setupForMainWorker)(markdown_processor_1.markdownProcessor, {
    name: 'heavyWork',
    maxNumOfWorker: os_1.default.availableParallelism(),
    workerFactory() {
        return new Worker(path_1.default.resolve(__dirname, 'markdown-processor-worker.js'));
    }
});
//# sourceMappingURL=markdown-processor-main.js.map