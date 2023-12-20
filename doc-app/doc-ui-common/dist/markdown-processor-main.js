"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markdownProcessor = exports.setupBroker = void 0;
const tslib_1 = require("tslib");
const node_util_1 = require("node:util");
const worker_threads_1 = require("worker_threads");
const path_1 = tslib_1.__importDefault(require("path"));
const os_1 = tslib_1.__importDefault(require("os"));
const node_worker_broker_1 = require("@wfh/reactivizer/dist/fork-join/node-worker-broker");
const plink_1 = require("@wfh/plink");
const markdown_processor_1 = require("./markdown-processor");
Object.defineProperty(exports, "markdownProcessor", { enumerable: true, get: function () { return markdown_processor_1.markdownProcessor; } });
const log = (0, plink_1.log4File)(__filename);
const PRIMITIVE_TYPES = { number: true, string: true, boolean: true };
const has = Object.prototype.hasOwnProperty;
function isPrimitiveValue(value) {
    return has.call(PRIMITIVE_TYPES, typeof value);
}
function setupBroker(excludeCurrentThead = true, maxNumOfWorker) {
    const broker = (0, node_worker_broker_1.setupForMainWorker)(markdown_processor_1.markdownProcessor, {
        name: 'broker',
        maxNumOfWorker: maxNumOfWorker !== null && maxNumOfWorker !== void 0 ? maxNumOfWorker : os_1.default.availableParallelism() - 1,
        threadMaxIdleTime: 4000,
        debug: false,
        excludeCurrentThead,
        log(msg, ...args) {
            log.info(msg, ...args.map(item => isPrimitiveValue(item) ? item : (0, node_util_1.inspect)(item, { showHidden: false, depth: 0, compact: true })));
        },
        debugExcludeTypes: ['workerInited'],
        workerFactory() {
            return new worker_threads_1.Worker(path_1.default.resolve(__dirname, '../dist/markdown-processor-worker.js'));
        }
    });
    return broker;
}
exports.setupBroker = setupBroker;
//# sourceMappingURL=markdown-processor-main.js.map