"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const os_1 = tslib_1.__importDefault(require("os"));
const node_worker_threads_1 = require("node:worker_threads");
const node_worker_broker_1 = require("../../../packages/reactivizer/dist/fork-join/node-worker-broker");
const cli_analyse_service_1 = require("./cli-analyse-service");
function default_1() {
    const mainWorker = (0, cli_analyse_service_1.createService)();
    (0, node_worker_broker_1.setupForMainWorker)(mainWorker, {
        name: 'ts-analyser-broker',
        debug: false,
        excludeCurrentThead: true,
        maxNumOfWorker: os_1.default.availableParallelism(),
        threadMaxIdleTime: 1000,
        workerFactory() {
            return new node_worker_threads_1.Worker(path_1.default.resolve(__dirname, './cli-analyse-worker.js'));
        }
    });
    return mainWorker;
}
exports.default = default_1;
//# sourceMappingURL=cli-analyse-main.js.map