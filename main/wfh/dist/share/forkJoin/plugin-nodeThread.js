"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNodeThreadPlugin = void 0;
const node_worker_threads_1 = require("node:worker_threads");
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const rx_utils_1 = require("../../../../packages/redux-toolkit-observable/dist/rx-utils");
function createNodeThreadPlugin() {
    const ctrl = (0, rx_utils_1.createActionStreamByType)();
    const { payloadByType: pt, actionByType: at, objectToAction, dispatcher, _actionFromObject } = ctrl;
    rx.merge(pt.pluginDoInitWorker.pipe(op.map(([workerNo, worker, actionSubject]) => {
        worker.on('message', event => {
            if (event.type === 'WORKER_READY') {
                dispatcher.pluginDoneInitWorker(workerNo, node_worker_threads_1.parentPort);
            }
            else if (event.error) {
                dispatcher.pluginOnError(workerNo, event.error);
            }
            else {
                actionSubject.next(objectToAction(event));
            }
        });
        worker.on('messageerror', error => {
            dispatcher.pluginOnError(workerNo, error);
        });
        worker.postMessage({ type: 'ASSIGN_WORKER_NO', data: workerNo });
    })), pt.pluginWorkerOnInit.pipe(op.switchMap(() => new rx.Observable(_sub => {
        const handler = (event) => {
            const msg = event;
            if (msg.type === 'ASSIGN_WORKER_NO') {
                node_worker_threads_1.parentPort.postMessage({ type: 'WORKER_READY' });
                dispatcher.pluginWorkerDoneInit(msg.data, node_worker_threads_1.parentPort);
            }
        };
        /* eslint-disable no-restricted-globals */
        node_worker_threads_1.parentPort === null || node_worker_threads_1.parentPort === void 0 ? void 0 : node_worker_threads_1.parentPort.addListener('message', handler);
        return () => node_worker_threads_1.parentPort === null || node_worker_threads_1.parentPort === void 0 ? void 0 : node_worker_threads_1.parentPort.removeListener('message', handler);
    })), op.takeUntil(at.pluginWorkerOnDestory)), pt.pluginCreateReturnPort.pipe(op.map(workerNo => {
        const chan = new node_worker_threads_1.MessageChannel();
        const workerMsgHandler = (msg) => {
            if (process.env.NODE_ENV === 'development') {
                // eslint-disable-next-line no-console
                console.log(`worker #${workerNo} recieve message from forked worker`, msg);
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            _actionFromObject(msg);
            chan.port1.close();
        };
        chan.port1.once('message', workerMsgHandler);
        chan.port1.start();
        dispatcher.pluginDoneCreateReturnPort(chan.port2);
    })), pt.pluginPostMsgTo.pipe(op.map(([content, transfers]) => {
        node_worker_threads_1.parentPort.postMessage(content, transfers);
    }))).pipe(op.catchError((err, src) => {
        console.error(err);
        return src;
    })).subscribe();
    return [ctrl, rx_utils_1.createActionStreamByType];
}
exports.createNodeThreadPlugin = createNodeThreadPlugin;
//# sourceMappingURL=plugin-nodeThread.js.map