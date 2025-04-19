"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const worker_threads_1 = require("worker_threads");
const reactor_factory_1 = require("../reactor-factory");
const sqlite_api_1 = require("../sqlite-log/sqlite-api");
// eslint-disable-next-line no-console
console.log('-- test worker begins');
const logger = (0, sqlite_api_1.useAsInitOption)(null, true);
const testWorkerServiceFac = new reactor_factory_1.BaseReactorFactory({
    name: 'testWorkerService'
});
const service = testWorkerServiceFac.setting({
    enableLog: true
}).create();
service.ft.test2Action('111').dp();
service.ft.test2Action('222').dp();
service.ft.test2Action('333').dp();
void logger.waitForPending().then(() => {
    worker_threads_1.parentPort === null || worker_threads_1.parentPort === void 0 ? void 0 : worker_threads_1.parentPort.postMessage('done');
});
//# sourceMappingURL=sqlite-log.test-worker.js.map