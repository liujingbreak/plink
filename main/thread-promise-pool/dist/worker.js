"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const worker_threads_1 = require("worker_threads");
if (worker_threads_1.workerData) {
    executeOnEvent(worker_threads_1.workerData);
}
if (!worker_threads_1.isMainThread) {
    worker_threads_1.parentPort.on('message', executeOnEvent);
}
function executeOnEvent(data) {
    return __awaiter(this, void 0, void 0, function* () {
        if (data.exit) {
            process.exit(0);
            return;
        }
        try {
            const result = yield Promise.resolve(require(data.file)[data.exportFn](...(data.args || [])));
            if (result.transferList) {
                const transferList = result.transferList;
                delete result.transferList;
                worker_threads_1.parentPort.postMessage({ type: 'wait', data: result }, transferList);
            }
            else {
                worker_threads_1.parentPort.postMessage({ type: 'wait', data: result });
            }
        }
        catch (ex) {
            worker_threads_1.parentPort.postMessage({
                type: 'error',
                data: ex
            });
        }
    });
}

//# sourceMappingURL=worker.js.map
