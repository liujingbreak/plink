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
exports.fork = exports.reativizeRecursiveFuncs = exports.createWorkerControl = void 0;
/* eslint-disable no-restricted-globals */
const rx = __importStar(require("rxjs"));
const control_1 = require("./control");
const epic_1 = require("./epic");
// import {createBroker} from './node-worker-broker';
function createWorkerControl(isInWorker, opts) {
    const inputTableFor = ['exit'];
    const outputTableFor = ['log', 'warn'];
    let broker;
    const [workerNo$, actionMsg$, dispatchStop$] = isInWorker ?
        initWorker() :
        [rx.of('main'), rx.EMPTY, new rx.Subject()];
    return workerNo$.pipe(rx.map(workerNo => {
        const logPrefix = '[Worker:' + (!isInWorker ? 'main]' : workerNo + ']');
        const comp = new epic_1.ReactorComposite(Object.assign(Object.assign({}, opts), { name: logPrefix, inputTableFor,
            outputTableFor, debug: opts === null || opts === void 0 ? void 0 : opts.debug, log: !isInWorker ? opts === null || opts === void 0 ? void 0 : opts.log : (...args) => self.postMessage({ type: 'log', p: args }), debugExcludeTypes: ['log', 'warn'], logStyle: 'noParam' }));
        const { r, i, o } = comp;
        const latest = comp.inputTable;
        const lo = comp.outputTable.l;
        if (isInWorker) {
            r('exit', latest.l.exit.pipe(rx.map(() => {
                comp.destory();
                dispatchStop$.next();
            })));
            r('Pass worker wait and awake message to broker', rx.merge(o.at.wait, o.at.stopWaiting, o.at.returned).pipe(rx.map(action => {
                self.postMessage((0, control_1.serializeAction)(action));
            })));
            r(lo.log.pipe(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            rx.map(([, ...p]) => postMessage({ type: 'log', p: [logPrefix, ...p] }))));
        }
        else {
            r(rx.merge(lo.log, lo.warn).pipe(
            // eslint-disable-next-line no-console
            rx.map(([, ...p]) => { var _a; return ((_a = opts === null || opts === void 0 ? void 0 : opts.log) !== null && _a !== void 0 ? _a : console.log)(logPrefix, ...p); })));
        }
        r('On output "fork" request message', o.at.fork.pipe(rx.mergeMap(act => {
            const { p: [wrappedAct] } = act;
            const chan = new MessageChannel();
            const error$ = new rx.Observable(sub => {
                chan.port1.onmessageerror = err => sub.next(err);
                return () => chan.port1.onmessageerror = null;
            });
            return rx.merge(new rx.Observable(sub => {
                chan.port1.onmessage = msg => sub.next(msg.data);
                return () => chan.port1.onmessage = null;
            }).pipe(rx.map(event => (0, control_1.deserializeAction)(event, i)), rx.take(1), rx.takeUntil(rx.merge(error$, error$))), new rx.Observable(_sub => {
                if (isInWorker) {
                    const forkByBroker = o.createAction('forkByBroker', wrappedAct, chan.port2);
                    postMessage((0, control_1.serializeAction)(forkByBroker), '*', [chan.port2]);
                }
                else {
                    o.dp.forkByBroker(wrappedAct, chan.port2);
                }
            }));
        })));
        r('On recieving "being forked" message, wait for fork action returns', i.pt.onFork.pipe(rx.mergeMap(([, origAct, port]) => {
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
            if (isInWorker) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                self.postMessage({ error: { label, detail: err } });
            }
            else if (broker) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                broker.o.dp.onWorkerError(-1, { label, detail: err });
            }
        })));
        actionMsg$.pipe(rx.tap(action => (0, control_1.deserializeAction)(action, i)), rx.takeUntil(dispatchStop$)).subscribe();
        return comp;
    }));
}
exports.createWorkerControl = createWorkerControl;
function initWorker() {
    const workerNo$ = new rx.ReplaySubject(1);
    const actionMsg$ = new rx.ReplaySubject(5);
    const stop$ = new rx.Subject();
    const handler = (event) => {
        const msg = event.data;
        if (msg.type === 'ASSIGN_WORKER_NO') {
            self.postMessage({ type: 'WORKER_READY' });
            workerNo$.next(msg.data);
        }
        else {
            const act = event;
            actionMsg$.next(act);
        }
    };
    /* eslint-disable no-restricted-globals */
    addEventListener('message', handler);
    stop$.pipe(rx.map(() => self.removeEventListener('message', handler)), rx.take(1)).subscribe();
    return [workerNo$.asObservable(), actionMsg$.asObservable(), stop$];
}
function reativizeRecursiveFuncs(comp, fObject) {
    comp.reactivize(fObject);
    return comp;
}
exports.reativizeRecursiveFuncs = reativizeRecursiveFuncs;
function fork(comp, actionType, params, resActionType) {
    const forkedAction = comp.o.createAction(actionType, ...params);
    const forkDone = rx.firstValueFrom(comp.i.pt[(resActionType !== null && resActionType !== void 0 ? resActionType : (actionType + 'Resolved'))].pipe((0, control_1.actionRelatedToPayload)(forkedAction.i), rx.map(([, res]) => res)));
    comp.o.dp.fork(forkedAction);
    return forkDone;
}
exports.fork = fork;
function hasReturnTransferable(payload) {
    var _a;
    return Array.isArray((_a = payload[0]) === null || _a === void 0 ? void 0 : _a.transferList);
}
//# sourceMappingURL=forkJoin-web-worker.js.map