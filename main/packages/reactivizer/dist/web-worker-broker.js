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
exports.createBroker = void 0;
const rx = __importStar(require("rxjs"));
const epic_1 = require("./epic");
// import {timeoutLog} from './utils';
const control_1 = require("./control");
/** WA - Worker output Message
*/
function createBroker(mainWorker, opts) {
    const mainWorkerComp = mainWorker;
    const comp = new epic_1.ReactorComposite(opts);
    const workerInitState = new Map();
    const { r, i, o } = comp;
    const workerOutputs = new Map();
    r('Emit newWorkerReady event', o.pt.workerInited.pipe(rx.filter(([, , , , skipped]) => !skipped), rx.tap(([meta, workerNo, , outputCtrl]) => o.dpf.newWorkerReady(meta, workerNo, outputCtrl))));
    r('ensureInitWorker', i.pt.ensureInitWorker.pipe(rx.mergeMap(([meta, workerNo, worker]) => {
        if (workerInitState.get(workerNo) === 'DONE') {
            o.dpf.workerInited(meta, workerNo, null, workerOutputs.get(workerNo), true);
            return rx.EMPTY;
        }
        else if (workerInitState.get(workerNo) === 'WIP') {
            return o.pt.workerInited.pipe(rx.filter(() => workerInitState.get(workerNo) === 'DONE'), rx.take(1), rx.tap(() => o.dpf.workerInited(meta, workerNo, null, workerOutputs.get(workerNo), true)));
        }
        workerInitState.set(workerNo, 'WIP');
        worker.onmessage = ({ data: event }) => {
            var _a;
            if (event.type === 'WORKER_READY') {
                workerInitState.set(workerNo, 'DONE');
                const wo = new control_1.RxController();
                workerOutputs.set(workerNo, wo);
                o.dpf.workerInited(meta, workerNo, null, wo, false);
            }
            else if (event.type === 'log') {
                // eslint-disable-next-line no-console
                ((_a = opts === null || opts === void 0 ? void 0 : opts.log) !== null && _a !== void 0 ? _a : console.log)(...event.p);
            }
            else if (event.error) {
                o.dp.onWorkerError(workerNo, event.error);
            }
            else {
                const data = event;
                let wo = workerOutputs.get(workerNo);
                if (wo == null) {
                    wo = new control_1.RxController();
                    workerOutputs.set(workerNo, wo);
                }
                (0, control_1.deserializeAction)(data, wo);
            }
        };
        worker.onerror = event => {
            o.dp.onWorkerError(workerNo, event);
        };
        worker.onmessageerror = event => {
            o.dp.onWorkerError(workerNo, event);
        };
        // TODO: web worker does not have 'close' event, I need
        // to.find a way resolve this worker exit notification
        // (worker as Worker).on('exit', code => {
        //   o.dp.onWorkerExit(workerNo, code);
        // });
        worker.postMessage({ type: 'ASSIGN_WORKER_NO', workerNo });
        return rx.EMPTY;
    })
    // rx.takeUntil(o.pt.onWorkerExit.pipe(rx.filter(([id]) => id === )))
    ));
    r('On forkFromWorker', rx.merge(o.pt.newWorkerReady.pipe(rx.mergeMap(([, , workerOutput]) => workerOutput.pt.forkByBroker)), mainWorkerComp.o.pt.forkByBroker).pipe(rx.mergeMap(async ([, targetAction, port]) => {
        const [, assignedWorkerNo, worker] = await rx.firstValueFrom(o.do.assignWorker(i.at.workerAssigned
        // timeoutLog<typeof i.at.workerAssigned extends rx.Observable<infer T> ? T : never>(3000, () => console.log('worker assignment timeout'))
        ));
        const fa = mainWorkerComp.i.createAction('onFork', targetAction, port);
        if (worker === 'main') {
            (0, control_1.deserializeAction)(fa, mainWorkerComp.i);
        }
        else {
            await rx.firstValueFrom(i.do.ensureInitWorker(o.at.workerInited, assignedWorkerNo, worker));
            worker.postMessage((0, control_1.serializeAction)(fa), [port]);
        }
    })));
    r(i.pt.letWorkerExit.pipe(rx.map(([, worker]) => {
        // eslint-disable-next-line @typescript-eslint/ban-types
        worker.postMessage((0, control_1.serializeAction)(o.core.createAction('exit')));
    })));
    return comp;
}
exports.createBroker = createBroker;
//# sourceMappingURL=web-worker-broker.js.map