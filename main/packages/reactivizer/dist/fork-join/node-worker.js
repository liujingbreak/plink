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
exports.fork = exports.createWorkerControl = void 0;
const worker_threads_1 = require("worker_threads");
const rx = __importStar(require("rxjs"));
const control_1 = require("../control");
const epic_1 = require("../epic");
// import {createBroker} from './node-worker-broker';
const inputTableFor = ['exit'];
const outputTableFor = ['workerInited', 'log', 'warn'];
function createWorkerControl(opts) {
    var _a;
    // eslint-disable-next-line @typescript-eslint/ban-types
    const comp = new epic_1.ReactorComposite(Object.assign(Object.assign({}, (opts !== null && opts !== void 0 ? opts : {})), { inputTableFor,
        outputTableFor, name: ((_a = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _a !== void 0 ? _a : '') + ('[Thread:' + (worker_threads_1.isMainThread ? 'main]' : worker_threads_1.threadId + ']')), debug: opts === null || opts === void 0 ? void 0 : opts.debug, log: worker_threads_1.isMainThread ? opts === null || opts === void 0 ? void 0 : opts.log : (...args) => worker_threads_1.parentPort === null || worker_threads_1.parentPort === void 0 ? void 0 : worker_threads_1.parentPort.postMessage({ type: 'log', p: args }), debugExcludeTypes: ['log', 'warn'], logStyle: 'noParam' }));
    let broker;
    const { r, i, o } = comp;
    const lo = comp.outputTable.l;
    r('worker$ -> workerInited', new rx.Observable(() => {
        const handler = (event) => {
            var _a;
            const msg = event;
            if (msg.type === 'ASSIGN_WORKER_NO') {
                worker_threads_1.parentPort.postMessage({ type: 'WORKER_READY' });
                const workerNo = msg.workerNo;
                const logPrefix = ((_a = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _a !== void 0 ? _a : '') + '[Worker:' + workerNo + ']';
                o.dp.workerInited(workerNo, logPrefix);
                comp.setName(logPrefix);
            }
            else {
                const act = event;
                (0, control_1.deserializeAction)(act, i);
            }
        };
        if (worker_threads_1.parentPort) {
            /* eslint-disable no-restricted-globals */
            worker_threads_1.parentPort.on('message', handler);
        }
        else {
            o.dp.workerInited('main', '[main]');
        }
        return () => worker_threads_1.parentPort === null || worker_threads_1.parentPort === void 0 ? void 0 : worker_threads_1.parentPort.off('message', handler);
    }));
    if (worker_threads_1.parentPort) {
        r('exit', comp.inputTable.l.exit.pipe(rx.switchMap(() => lo.workerInited), rx.take(1), rx.map(() => {
            comp.destory();
        })));
        r('postMessage wait, stopWaiting, returned message to broker', lo.workerInited.pipe(rx.take(1), rx.switchMap(() => rx.merge(o.at.wait, o.at.stopWaiting, o.at.returned)), rx.map(action => {
            worker_threads_1.parentPort === null || worker_threads_1.parentPort === void 0 ? void 0 : worker_threads_1.parentPort.postMessage((0, control_1.serializeAction)(action));
        })));
        r('postMessage log to broker (parent thread)', lo.workerInited.pipe(rx.take(1), rx.switchMap(([, , logPrefix]) => lo.log.pipe(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        rx.map(([, ...p]) => worker_threads_1.parentPort === null || worker_threads_1.parentPort === void 0 ? void 0 : worker_threads_1.parentPort.postMessage({ type: 'log', p: [logPrefix, ...p] }))))));
    }
    else {
        // main thread
        r('log, warn > console.log', lo.workerInited.pipe(rx.take(1), rx.switchMap(([, , logPrefix]) => rx.merge(lo.log, lo.warn).pipe(
        // eslint-disable-next-line no-console
        rx.map(([, ...p]) => { var _a; return ((_a = opts === null || opts === void 0 ? void 0 : opts.log) !== null && _a !== void 0 ? _a : console.log)(logPrefix, ...p); })))));
    }
    r('On output "fork" request message', o.at.fork.pipe(rx.mergeMap(act => {
        const { p: [wrappedAct] } = act;
        const chan = new worker_threads_1.MessageChannel();
        const error$ = rx.fromEventPattern(h => chan.port1.on('messageerror', h), h => chan.port1.off('messageerror', h));
        const close$ = rx.fromEventPattern(h => chan.port1.on('close', h), h => chan.port1.off('close', h));
        return rx.merge(rx.fromEventPattern(h => chan.port1.on('message', h), h => {
            chan.port1.off('message', h);
            chan.port1.close();
        }).pipe(rx.map(event => (0, control_1.deserializeAction)(event, i)), rx.take(1), rx.takeUntil(rx.merge(error$, close$))), new rx.Observable(_sub => {
            if (worker_threads_1.parentPort) {
                const forkByBroker = o.createAction('forkByBroker', wrappedAct, chan.port2);
                worker_threads_1.parentPort.postMessage((0, control_1.serializeAction)(forkByBroker), [chan.port2]);
            }
            else {
                o.dp.forkByBroker(wrappedAct, chan.port2);
            }
        }));
    })));
    r('onFork -> wait for fork action returns, postMessage to forking parent thread', i.pt.onFork.pipe(rx.mergeMap(([, origAct, port]) => {
        const origId = origAct.i;
        (0, control_1.deserializeAction)(origAct, i);
        return o.core.action$.pipe((0, control_1.actionRelatedToAction)(origId), rx.take(1), rx.map(action => {
            const { p } = action;
            if (hasReturnTransferable(p)) {
                const [{ transferList }] = p;
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                p[0].transferList = null;
                port.postMessage((0, control_1.serializeAction)(action), transferList);
            }
            else {
                port.postMessage((0, control_1.serializeAction)(action));
            }
            o.dp.returned();
        }));
    })));
    r('Pass error to broker', comp.error$.pipe(rx.map(([label, err]) => {
        if (worker_threads_1.parentPort) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            worker_threads_1.parentPort.postMessage({ error: { label, detail: err } });
        }
        else if (broker) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            broker.o.dp.onWorkerError(-1, { label, detail: err }, 'customized error');
        }
    })));
    return comp;
}
exports.createWorkerControl = createWorkerControl;
function fork(comp, actionName, params, resActionName) {
    const forkedAction = comp.o.createAction(actionName, ...params);
    const forkDone = rx.firstValueFrom(comp.i.pt[(resActionName !== null && resActionName !== void 0 ? resActionName : (actionName + 'Resolved'))].pipe((0, control_1.actionRelatedToPayload)(forkedAction.i), rx.map(([, res]) => res)));
    comp.o.dp.fork(forkedAction);
    return forkDone;
}
exports.fork = fork;
function hasReturnTransferable(payload) {
    var _a;
    return Array.isArray((_a = payload[0]) === null || _a === void 0 ? void 0 : _a.transferList);
}
//# sourceMappingURL=node-worker.js.map