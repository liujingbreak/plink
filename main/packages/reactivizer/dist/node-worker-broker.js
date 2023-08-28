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
function createBroker(mainWorkerInput, opts) {
    const ctx = new epic_1.ReactorComposite(opts);
    const workerInitState = new Map();
    const { r, i, o } = ctx;
    ctx.startAll();
    r(i.pt.ensureInitWorker.pipe(rx.mergeMap(([id, workerNo, worker]) => {
        if (workerInitState.get(workerNo) === 'DONE') {
            o.dp.workerInited(workerNo, null, id, true);
            return rx.EMPTY;
        }
        else if (workerInitState.get(workerNo) === 'WIP') {
            return o.pt.workerInited.pipe(rx.filter(() => workerInitState.get(workerNo) === 'DONE'), rx.take(1));
        }
        worker.on('message', (event) => {
            if (event.type === 'WORKER_READY') {
                workerInitState.set(workerNo, 'DONE');
                o.dp.workerInited(workerNo, null, id, false);
            }
            else if (event.error) {
                o.dp.onWorkerError(workerNo, event.error);
            }
            else {
                const { data } = event;
                // eslint-disable-next-line @typescript-eslint/no-unsafe-call
                (0, control_1.deserializeAction)(data, o);
            }
        });
        worker.on('error', event => {
            o.dp.onWorkerError(workerNo, event);
        });
        worker.on('messageerror', event => {
            o.dp.onWorkerError(workerNo, event);
        });
        worker.on('exit', event => {
            o.dp.onWorkerExit(workerNo, event);
        });
        worker.postMessage({ type: 'ASSIGN_WORKER_NO', workerNo });
        return rx.EMPTY;
    })
    // rx.takeUntil(o.pt.onWorkerExit.pipe(rx.filter(([id]) => id === )))
    ));
    r(i.at.fork.pipe(rx.mergeMap(async (forkAction) => {
        const waitWorkerAssignment = i.pt.workerAssigned.pipe(rx.filter(([, aId]) => aId === assignId));
        const assignId = o.dp.assignWorker();
        const [, , workerNo, worker] = await rx.firstValueFrom(waitWorkerAssignment);
        if (worker === 'main') {
            mainWorkerInput.core.actionUpstream.next(forkAction);
        }
        else {
            console.log('ensureInitWorker', workerNo);
            i.dp.ensureInitWorker(workerNo, worker);
            worker.postMessage((0, control_1.serializeAction)(forkAction), [forkAction.p[1]]);
        }
    })));
    r(i.pt.letWorkerExit.pipe(rx.map(([, worker]) => {
        // eslint-disable-next-line @typescript-eslint/ban-types
        worker.postMessage((0, control_1.serializeAction)(o.core.createAction('exit')));
    })));
    return ctx;
}
exports.createBroker = createBroker;
//# sourceMappingURL=node-worker-broker.js.map