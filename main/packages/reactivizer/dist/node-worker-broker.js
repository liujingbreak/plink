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
const control_1 = require("./control");
/** WA - Worker output Message
*/
function createBroker(mainWorker, opts) {
    const mainWorkerComp = mainWorker;
    const comp = new epic_1.ReactorComposite(opts);
    const workerInitState = new Map();
    const { r, i, o } = comp;
    comp.startAll();
    r(mainWorkerComp.o.pt.forkByBroker.pipe(rx.map(([, wrappedAct, port]) => {
        i.dp.forkFromWorker(-1, wrappedAct, port);
    })));
    r('ensureInitWorker', i.pt.ensureInitWorker.pipe(rx.mergeMap(([meta, workerNo, worker]) => {
        if (workerInitState.get(workerNo) === 'DONE') {
            o.dpf.workerInited(meta, workerNo, null, true);
            return rx.EMPTY;
        }
        else if (workerInitState.get(workerNo) === 'WIP') {
            return o.pt.workerInited.pipe(rx.filter(() => workerInitState.get(workerNo) === 'DONE'), rx.take(1), rx.tap(() => o.dpf.workerInited(meta, workerNo, null, true)));
        }
        workerInitState.set(workerNo, 'WIP');
        worker.on('message', (event) => {
            var _a;
            if (event.type === 'WORKER_READY') {
                workerInitState.set(workerNo, 'DONE');
                o.dpf.workerInited(meta, workerNo, null, false);
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
                o.dp.actionFromWorker(data, workerNo);
            }
        });
        worker.on('error', event => {
            o.dp.onWorkerError(workerNo, event);
        });
        worker.on('messageerror', event => {
            o.dp.onWorkerError(workerNo, event);
        });
        worker.on('exit', code => {
            o.dp.onWorkerExit(workerNo, code);
        });
        worker.postMessage({ type: 'ASSIGN_WORKER_NO', workerNo });
        return rx.EMPTY;
    })
    // rx.takeUntil(o.pt.onWorkerExit.pipe(rx.filter(([id]) => id === )))
    ));
    r('On fork', i.at.forkFromWorker.pipe(rx.mergeMap(async (forkAction) => {
        const [, workerNo, worker] = await rx.firstValueFrom(o.do.assignWorker(i.at.workerAssigned));
        if (worker === 'main') {
            (0, control_1.deserializeAction)(forkAction, mainWorkerComp.i);
        }
        else {
            await rx.firstValueFrom(i.do.ensureInitWorker(o.at.workerInited, workerNo, worker));
            worker.postMessage((0, control_1.serializeAction)(forkAction), [forkAction.p[2]]);
        }
    })));
    r('dispatch action of actionFromWorker to broker\'s upStream', o.pt.actionFromWorker.pipe(rx.map(([, action, workerNo]) => {
        const type = (0, control_1.nameOfAction)(action);
        if (type === 'wait')
            i.dp.onWorkerWait(workerNo);
        else if (type === 'stopWaiting')
            i.dp.onWorkerAwake(workerNo);
        else if (type === 'fork')
            (0, control_1.deserializeAction)(action, i); // fork action
    })));
    r(i.pt.letWorkerExit.pipe(rx.map(([, worker]) => {
        // eslint-disable-next-line @typescript-eslint/ban-types
        worker.postMessage((0, control_1.serializeAction)(o.core.createAction('exit')));
    })));
    return comp;
}
exports.createBroker = createBroker;
//# sourceMappingURL=node-worker-broker.js.map