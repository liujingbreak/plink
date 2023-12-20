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
exports.createWorkerControl = exports.setIdleDuring = exports.fork = void 0;
/* eslint-disable no-restricted-globals */
const rx = __importStar(require("rxjs"));
const control_1 = require("../control");
const epic_1 = require("../epic");
const types_1 = require("./types");
var common_1 = require("./common");
Object.defineProperty(exports, "fork", { enumerable: true, get: function () { return common_1.fork; } });
Object.defineProperty(exports, "setIdleDuring", { enumerable: true, get: function () { return common_1.setIdleDuring; } });
// import {createBroker} from './node-worker-broker';
function createWorkerControl(isInWorker, opts) {
    var _a, _b, _c;
    let mainPort; // parent thread port
    const comp = new epic_1.ReactorComposite(Object.assign(Object.assign({}, (opts !== null && opts !== void 0 ? opts : {})), { inputTableFor: [...((_a = opts === null || opts === void 0 ? void 0 : opts.inputTableFor) !== null && _a !== void 0 ? _a : []), ...types_1.workerInputTableFor], outputTableFor: [...((_b = opts === null || opts === void 0 ? void 0 : opts.outputTableFor) !== null && _b !== void 0 ? _b : []), ...types_1.workerOutputTableFor], name: 'unknown worker No', debug: opts === null || opts === void 0 ? void 0 : opts.debug, log: !isInWorker ? opts === null || opts === void 0 ? void 0 : opts.log : (...args) => mainPort === null || mainPort === void 0 ? void 0 : mainPort.postMessage({ type: 'log', p: args }), 
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        debugExcludeTypes: ['log', 'warn', ...((_c = opts === null || opts === void 0 ? void 0 : opts.debugExcludeTypes) !== null && _c !== void 0 ? _c : [])] }));
    let broker;
    const { r, i, o, outputTable, inputTable } = comp;
    const lo = comp.outputTable.l;
    r('-> workerInited', new rx.Observable(() => {
        const handler = (event) => {
            var _a;
            const msg = event.data;
            if (msg.type === 'ASSIGN_WORKER_NO') {
                msg.mainPort.postMessage({ type: 'WORKER_READY' });
                mainPort = msg.mainPort;
                const workerNo = msg.workerNo;
                const logPrefix = ((_a = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _a !== void 0 ? _a : '') + '(W/' + workerNo + ')';
                o.dp.workerInited(workerNo, logPrefix, msg.mainPort);
                comp.setName(logPrefix);
            }
        };
        if (isInWorker) {
            /* eslint-disable no-restricted-globals */
            addEventListener('message', handler);
        }
        else {
            o.dp.workerInited('main', '[main]', null);
        }
        return () => self.removeEventListener('message', handler);
    }));
    r('workerInited -> main worker message port listener', o.pt.workerInited.pipe(rx.filter(([, , , port]) => port != null), rx.switchMap(([, , , port]) => new rx.Observable(() => {
        function handler(event) {
            const act = event.data;
            (0, control_1.deserializeAction)(act, i);
        }
        port.addEventListener('message', handler);
        return () => {
            port.close();
            port.removeEventListener('message', handler);
        };
    }))));
    if (isInWorker) {
        r('exit', comp.inputTable.l.exit.pipe(rx.switchMap(() => lo.workerInited), rx.take(1), rx.map(() => {
            comp.dispose();
        })));
        r('postMessage wait, stopWaiting, returned message to broker', lo.workerInited.pipe(rx.filter(([, , , port]) => port != null), rx.take(1), rx.switchMap(([, , , port]) => rx.merge(o.at.wait, o.at.stopWaiting, o.at.returned).pipe(rx.map(action => {
            port.postMessage((0, control_1.serializeAction)(action));
        })))));
        r('postMessage log to broker (parent thread)', lo.workerInited.pipe(rx.filter(([, , , port]) => port != null), rx.take(1), rx.switchMap(([, , logPrefix, port]) => lo.log.pipe(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        rx.map(([, ...p]) => port.postMessage({ type: 'log', p: [logPrefix, ...p] }))))));
    }
    else {
        // main thread
        r('log, warn > console.log', lo.workerInited.pipe(rx.take(1), rx.switchMap(([, , logPrefix]) => rx.merge(lo.log, lo.warn).pipe(
        // eslint-disable-next-line no-console
        rx.map(([, ...p]) => { var _a; return ((_a = opts === null || opts === void 0 ? void 0 : opts.log) !== null && _a !== void 0 ? _a : console.log)(logPrefix, ...p); })))));
    }
    r('"fork" -> forkByBroker', o.at.fork.pipe(rx.switchMap(a => outputTable.l.workerInited.pipe(rx.map(b => [a, b]), rx.take(1))), rx.mergeMap(([act, [, , , mainPort]]) => {
        const { p: [wrappedAct] } = act;
        const chan = new MessageChannel();
        const error$ = new rx.Observable(sub => {
            chan.port1.onmessageerror = err => sub.next(err);
            return () => chan.port1.onmessageerror = null;
        });
        return rx.merge(new rx.Observable(sub => {
            chan.port1.onmessage = msg => sub.next(msg.data);
            return () => chan.port1.onmessage = null;
        }).pipe(rx.map(event => (0, control_1.deserializeAction)(event, i)), rx.take(1), rx.takeUntil(rx.merge(error$, error$))), error$.pipe(rx.tap(err => o.dpf._onErrorFor(wrappedAct, err))), new rx.Observable(_sub => {
            if (mainPort) {
                const forkByBroker = o.createAction('forkByBroker', wrappedAct, chan.port2);
                mainPort.postMessage((0, control_1.serializeAction)(forkByBroker), [chan.port2]);
            }
            else {
                o.dpf.forkByBroker(act, wrappedAct, chan.port2);
            }
        }));
    })));
    r('onFork -> wait for fork action returns, postMessage to forking parent thread', i.pt.onFork.pipe(rx.mergeMap(([, origAct, port]) => {
        return rx.merge(o.core.action$.pipe((0, control_1.actionRelatedToAction)(origAct), rx.take(1), rx.map(action => {
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
        })), new rx.Observable(() => {
            (0, control_1.deserializeAction)(origAct, i);
        }));
    })));
    r('Pass error to broker', comp.error$.pipe(rx.switchMap(a => outputTable.l.workerInited.pipe(rx.map(b => [a, b]), rx.take(1))), rx.map(([[label, err], [, , , mainPort]]) => {
        if (mainPort) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            mainPort.postMessage({ error: { label, detail: err } });
        }
        else if (broker) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            broker.o.dp.onWorkerError(-1, { label, detail: err }, 'customized error');
        }
    })));
    r('setLiftUpActions -> postMessage to main thread', inputTable.l.setLiftUpActions.pipe(rx.mergeMap(([, action$]) => action$), rx.withLatestFrom(outputTable.l.workerInited), rx.tap(([action, [, , , port]]) => {
        if (port) {
            o.dp.log(`pass action ${(0, control_1.nameOfAction)(action)} to main thread`);
            port.postMessage((0, control_1.serializeAction)(action));
        }
    })));
    return comp;
}
exports.createWorkerControl = createWorkerControl;
function hasReturnTransferable(payload) {
    var _a;
    return Array.isArray((_a = payload[0]) === null || _a === void 0 ? void 0 : _a.transferList);
}
//# sourceMappingURL=web-worker.js.map