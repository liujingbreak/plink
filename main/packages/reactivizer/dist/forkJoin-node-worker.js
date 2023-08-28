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
exports.reativizeRecursiveFuncs = exports.createWorkerControl = void 0;
const worker_threads_1 = require("worker_threads");
const rx = __importStar(require("rxjs"));
const control_1 = require("./control");
const epic_1 = require("./epic");
const node_worker_broker_1 = require("./node-worker-broker");
function createWorkerControl() {
    // eslint-disable-next-line no-console
    console.log('create worker control');
    // eslint-disable-next-line @typescript-eslint/ban-types
    const ctx = new epic_1.ReactorComposite({ debug: '[Thread]' + (worker_threads_1.isMainThread ? 'main' : worker_threads_1.threadId) });
    let broker;
    ctx.startAll();
    const { r, i, o } = ctx;
    const latest = i.createLatestPayloadsFor('exit');
    if (worker_threads_1.parentPort) {
        const handler = (event) => {
            const msg = event;
            if (msg.type === 'ASSIGN_WORKER_NO') {
                worker_threads_1.parentPort.postMessage({ type: 'WORKER_READY' });
            }
            else {
                const act = event;
                (0, control_1.deserializeAction)(act, i);
            }
        };
        /* eslint-disable no-restricted-globals */
        worker_threads_1.parentPort === null || worker_threads_1.parentPort === void 0 ? void 0 : worker_threads_1.parentPort.on('message', handler);
        r('exit', latest.exit.pipe(rx.map(() => {
            i.dp.stopAll();
            worker_threads_1.parentPort === null || worker_threads_1.parentPort === void 0 ? void 0 : worker_threads_1.parentPort.off('message', handler);
        })));
    }
    r('On output "fork" request message', o.at.fork.pipe(rx.mergeMap(act => {
        const { p: [wrappedAct] } = act;
        const wrappedActId = wrappedAct.i;
        const wrappedActCompletedType = (0, control_1.nameOfAction)(wrappedAct) + 'Completed';
        const chan = new worker_threads_1.MessageChannel();
        act.p[1] = chan.port2;
        const error$ = rx.fromEventPattern(h => chan.port1.on('messageerror', h), h => chan.port1.off('messageerror', h));
        const close$ = rx.fromEventPattern(h => chan.port1.on('close', h), h => chan.port1.off('close', h));
        return rx.merge(rx.fromEventPattern(h => chan.port1.on('message', h), h => chan.port1.off('message', h)).pipe(rx.map(event => (0, control_1.deserializeAction)(event, i)), rx.takeUntil(rx.merge(error$, close$, i.pt[wrappedActCompletedType].pipe(rx.filter(([, callerId]) => callerId === wrappedActId))))), new rx.Observable(_sub => {
            if (worker_threads_1.parentPort) {
                act = (0, control_1.serializeAction)(act);
                worker_threads_1.parentPort.postMessage(act, [chan.port2]);
            }
            else {
                if (broker == null) {
                    broker = (0, node_worker_broker_1.createBroker)(i, { debug: 'ForkJoin-broker' });
                    o.dp.brokerCreated(broker);
                }
                broker.i.dp.fork(wrappedAct);
            }
        }));
    })));
    r('On recieving "being forked" message, wait for fork action returns', i.pt.fork.pipe(rx.mergeMap(([, origAct, port]) => {
        const origId = origAct.i;
        (0, control_1.deserializeAction)(origAct, i);
        const origType = (0, control_1.nameOfAction)(origAct);
        const typeOfResolved = origType + 'Resolved';
        const typeOfCompleted = origType + 'Completed';
        return rx.merge(o.at[typeOfResolved].pipe(rx.filter(({ p: [_ret, callerId] }) => callerId === origId), rx.map(action => [action, false])), o.at[typeOfCompleted].pipe(rx.filter(({ p: [callerId] }) => callerId === origId), rx.map(action => [action, true]))).pipe(rx.map(([action, isCompleted]) => {
            port.postMessage((0, control_1.serializeAction)(action));
            if (isCompleted) {
                port.close();
            }
            return isCompleted;
        }), rx.takeWhile(isComplete => !isComplete));
    })));
    return ctx;
}
exports.createWorkerControl = createWorkerControl;
function reativizeRecursiveFuncs(ctx, fObject) {
    ctx.reactivize(fObject);
    return ctx;
}
exports.reativizeRecursiveFuncs = reativizeRecursiveFuncs;
//# sourceMappingURL=forkJoin-node-worker.js.map