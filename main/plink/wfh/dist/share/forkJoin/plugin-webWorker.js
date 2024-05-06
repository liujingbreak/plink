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
exports.createWebWorkerPlugin = void 0;
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const rx_utils_1 = require("@wfh/redux-toolkit-observable/es/rx-utils");
function createWebWorkerPlugin() {
    const ctrl = (0, rx_utils_1.createActionStreamByType)();
    const { payloadByType: pt, dispatcher, actionByType: at, _actionFromObject, objectToAction } = ctrl;
    rx.merge(pt.pluginDoInitWorker.pipe(op.map(([workerNo, worker, actionSubject]) => {
        const chan = new MessageChannel();
        chan.port1.onmessage = event => {
            if (event.data.type === 'WORKER_READY') {
                dispatcher.pluginDoneInitWorker(workerNo, chan.port1);
            }
            else if (event.data.error) {
                dispatcher.onWorkerError(workerNo, event.data.error);
            }
            else {
                actionSubject.next(objectToAction(event.data));
            }
        };
        chan.port1.onmessageerror = event => {
            dispatcher.onWorkerError(workerNo, event.data);
        };
        worker.postMessage({ type: 'ASSIGN_WORKER_NO', workerNo, port: chan.port2 }, [chan.port2]);
    })), pt.pluginWorkerOnInit.pipe(op.switchMap(() => new rx.Observable(_sub => {
        const handler = (event) => {
            const msg = event.data;
            if (msg.type === 'ASSIGN_WORKER_NO') {
                msg.port.postMessage({ type: 'WORKER_READY' });
                dispatcher.pluginWorkerDoneInit(msg.workerNo, msg.port);
                msg.port.onmessage = (event) => {
                    if (process.env.NODE_ENV === 'development') {
                        // eslint-disable-next-line no-console
                        console.log(`worker #${msg.workerNo} recieve message from master`, msg);
                    }
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                    _actionFromObject(event.data);
                };
            }
        };
        // eslint-disable-next-line no-restricted-globals
        self.onmessage = handler;
    })), op.takeUntil(at.pluginWorkerOnDestory)), pt.pluginCreateReturnPort.pipe(op.map(workerNo => {
        const chan = new MessageChannel();
        const workerMsgHandler = (event) => {
            const { data: msg } = event;
            if (process.env.NODE_ENV === 'development') {
                // eslint-disable-next-line no-console
                console.log(`worker #${workerNo} recieve message from forked worker`, msg);
            }
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            _actionFromObject(msg);
            chan.port1.removeEventListener('message', workerMsgHandler);
            chan.port1.close();
        };
        chan.port1.addEventListener('message', workerMsgHandler);
        chan.port1.start();
        dispatcher.pluginDoneCreateReturnPort(chan.port2);
    })), pt.pluginPostMsgTo.pipe(op.map(([port, content, transfers]) => {
        // eslint-disable-next-line no-restricted-globals
        port.postMessage(content, transfers);
    }))).pipe(op.catchError((err, src) => {
        console.error(err);
        return src;
    })).subscribe();
    return [ctrl, rx_utils_1.createActionStreamByType];
}
exports.createWebWorkerPlugin = createWebWorkerPlugin;
//# sourceMappingURL=plugin-webWorker.js.map