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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupForMainWorker = exports.createBroker = void 0;
/* eslint-disable @typescript-eslint/indent */
const worker_threads_1 = require("worker_threads");
const rx = __importStar(require("rxjs"));
const reactor_composite_1 = require("../reactor-composite");
// import {timeoutLog} from '../utils';
const control_1 = require("../control");
const control2_1 = require("../control2");
const types_1 = require("./types");
const worker_scheduler_1 = require("./worker-scheduler");
__exportStar(require("./types"), exports);
/** Broker manages worker threads, create message channels between child worker threads and main thread, transmits actions
*/
function createBroker(workerController, opts) {
    const options = opts ? Object.assign(Object.assign({}, opts), { outputTableFor: types_1.brokerOutputTableFor }) : { outputTableFor: types_1.brokerOutputTableFor };
    const mainWorkerComp = workerController;
    const broker = new reactor_composite_1.ReactorComposite2(options);
    const workerProps = new Map();
    const { r, i, o } = broker;
    r('workerInited -> newWorkerReady', o.pt.workerInited.pipe(rx.filter(([, , , , skipped]) => !skipped), rx.tap(([meta, workerNo, , outputCtrl]) => o.ft.newWorkerReady(workerNo, outputCtrl, workerProps.get(workerNo).input).dp(meta))));
    r('ensureInitWorker, message channel -> workerInited, onWorkerExit, onWorkerError', i.pt.ensureInitWorker.pipe(rx.mergeMap(([meta, workerNo, worker]) => {
        let props = workerProps.get(workerNo);
        if ((props === null || props === void 0 ? void 0 : props.state) === 'inited') {
            o.ft.workerInited(workerNo, null, workerProps.get(workerNo).output, true).dp(meta);
            return rx.EMPTY;
        }
        else if ((props === null || props === void 0 ? void 0 : props.state) === 'init') {
            return o.pt.workerInited.pipe(rx.filter(() => (props === null || props === void 0 ? void 0 : props.state) === 'inited'), rx.take(1), rx.tap(() => o.ft.workerInited(workerNo, null, workerProps.get(workerNo).output, true).dp(meta)));
        }
        if (props == null) {
            props = { state: 'init' };
            workerProps.set(workerNo, props);
        }
        const chan = new worker_threads_1.MessageChannel();
        props.port = chan.port1;
        const wo = new control2_1.RxController2({
            name: '#' + workerNo + ' worker output',
            debugExcludeTypes: opts === null || opts === void 0 ? void 0 : opts.debugExcludeTypes
        });
        const wi = new control2_1.RxController2({
            name: '#' + workerNo + ' worker input',
            debugExcludeTypes: opts === null || opts === void 0 ? void 0 : opts.debugExcludeTypes
        });
        props.input = wi;
        props.output = wo;
        chan.port1.on('message', (event) => {
            var _a;
            if (event.type === 'WORKER_READY') {
                props.state = 'inited';
                o.ft.workerInited(workerNo, null, wo, false).dp(meta);
            }
            else if (event.type === 'log') {
                const p = event.p;
                // eslint-disable-next-line no-console
                ((_a = opts === null || opts === void 0 ? void 0 : opts.log) !== null && _a !== void 0 ? _a : console.log)(...p);
            }
            else if (event.error) {
                o.ft.onWorkerError(workerNo, event.error, 'customized error').dp();
            }
            else {
                const data = event;
                (0, control2_1.deserializeAction2)(data, wo);
            }
        });
        worker.on('error', event => {
            o.ft.onWorkerError(workerNo, event, 'Node.js error').dp();
            o.ft._onErrorFor(event).dp(meta);
        });
        chan.port1.on('messageerror', event => {
            o.ft.onWorkerError(workerNo, event, 'message errror').dp();
            o.ft._onErrorFor(event).dp(meta);
        });
        worker.on('exit', code => {
            o.ft.onWorkerExit(workerNo, code).dp();
        });
        worker.postMessage({ type: 'ASSIGN_WORKER_NO', workerNo, mainPort: chan.port2 }, [chan.port2]);
        return wi.action$.pipe(rx.tap(action => chan.port1.postMessage((0, control_1.serializeAction)(action))));
    })
    // rx.takeUntil(o.pt.onWorkerExit.pipe(rx.filter(([id]) => id === )))
    ));
    r('(newWorkerReady) forkByBroker, workerInited -> ensureInitWorker, worker chan postMessage()', o.pt.newWorkerReady.pipe(rx.mergeMap(([, fromWorkerNo, workerOutput]) => workerOutput.pt.forkByBroker.pipe(rx.mergeMap(async ([, targetAction, port]) => {
        let assignedWorkerNo;
        try {
            const [, assignedWorkerNo_, worker] = await rx.firstValueFrom(o.ft.assignWorker().do(i.at.workerAssigned
            // timeoutLog<typeof i.at.workerAssigned extends rx.Observable<infer T> ? T : never>(3000, () => console.log('worker assignment timeout'))
            ));
            assignedWorkerNo = assignedWorkerNo_;
            const fa = mainWorkerComp.i.createAction('onFork', [targetAction, port]);
            if (worker === 'main') {
                (0, control2_1.deserializeAction2)(fa, mainWorkerComp.i);
            }
            else {
                await rx.firstValueFrom(i.ft.ensureInitWorker(assignedWorkerNo, worker).do(o.at.workerInited));
                workerProps.get(assignedWorkerNo).port.postMessage((0, control_1.serializeAction)(fa), [port]);
            }
        }
        catch (e) {
            if (opts === null || opts === void 0 ? void 0 : opts.log)
                opts.log(`Error encountered when forked by worker #${fromWorkerNo}, to #${assignedWorkerNo !== null && assignedWorkerNo !== void 0 ? assignedWorkerNo : ''}`, e);
            const errorFor = broker.o.createAction('_onErrorFor', [e]);
            errorFor.r = targetAction.i;
            port.postMessage((0, control_1.serializeAction)(errorFor));
            throw e;
        }
    })))));
    r('letWorkerExit -> postMessage to thread worker', i.pt.letWorkerExit.pipe(rx.map(([, workerNo]) => {
        const prop = workerProps.get(workerNo);
        // eslint-disable-next-line @typescript-eslint/ban-types
        prop.port.postMessage((0, control_1.serializeAction)(o.createAction('exit')));
        prop.state = 'exit';
    })));
    r('mainThreadInit', i.pt.mainThreadInit.pipe(rx.tap(() => {
        broker.i.ft.workerAssigned(0, 'main', true, 0).dp();
        broker.o.ft.newWorkerReady(0, workerController.o, workerController.i).dp();
    })));
    return broker;
}
exports.createBroker = createBroker;
function setupForMainWorker(workerController, brokerCreationOptions) {
    const broker = createBroker(workerController, brokerCreationOptions);
    (0, worker_scheduler_1.applyScheduler)(broker, brokerCreationOptions);
    broker.i.ft.mainThreadInit().dp();
    return broker;
}
exports.setupForMainWorker = setupForMainWorker;
//# sourceMappingURL=node-worker-broker.js.map