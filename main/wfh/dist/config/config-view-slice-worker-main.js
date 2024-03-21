"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMainWorkerAndBroker = void 0;
const tslib_1 = require("tslib");
const node_path_1 = tslib_1.__importDefault(require("node:path"));
const node_worker_threads_1 = require("node:worker_threads");
const os_1 = tslib_1.__importDefault(require("os"));
const node_worker_broker_1 = require("../../../packages/reactivizer/dist/fork-join/node-worker-broker");
const config_view_slice_worker_1 = require("./config-view-slice-worker");
function createMainWorkerAndBroker(debug = false) {
    const parallel = os_1.default.availableParallelism();
    const mainService = (0, config_view_slice_worker_1.createService)(debug);
    (0, node_worker_broker_1.setupForMainWorker)(mainService, {
        name: 'configViewSliceWorkerBroker',
        debug: false,
        // debugExcludeTypes: ['workerRankChanged', 'assignWorker', 'newWorkerReady'],
        debugIncludeTypes: ['workerAssigned'],
        maxNumOfWorker: parallel,
        excludeCurrentThead: true,
        threadMaxIdleTime: 500,
        workerFactory() {
            return new node_worker_threads_1.Worker(node_path_1.default.resolve(__dirname, './config-view-slice-worker-worker.js'));
        }
    });
    return mainService;
}
exports.createMainWorkerAndBroker = createMainWorkerAndBroker;
//# sourceMappingURL=config-view-slice-worker-main.js.map