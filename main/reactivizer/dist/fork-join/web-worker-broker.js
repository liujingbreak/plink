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
exports.createBroker = createBroker;
exports.setupForMainWorker = setupForMainWorker;
const rx = __importStar(require("rxjs"));
const simplex_reactor_1 = require("../simplex-reactor");
const control2_1 = require("../control2");
const control_1 = require("../control");
const types_1 = require("./types");
const worker_scheduler_1 = require("./worker-scheduler");
__exportStar(require("./types"), exports);
/** Broker manages worker threads, create message channels between child worker threads and main thread, transmits actions
*/
function createBroker(workerController, opts) {
    const options = opts ? Object.assign(Object.assign({}, opts), { tableFor: types_1.brokerOutputTableFor }) : { tableFor: types_1.brokerOutputTableFor };
    const mainWorkerComp = workerController;
    const broker = new simplex_reactor_1.SimplexReactor(options);
    broker.table.addActions(...types_1.brokerOutputTableFor);
    const workerProps = new Map();
    const allReadyWorkers = new rx.ReplaySubject();
    const { r, s } = broker;
    r('workerInited -> newWorkerReady', s.pt.workerInited.pipe(rx.filter(([, , , , skipped]) => !skipped), rx.tap(([meta, workerNo, , outputCtrl]) => s.ft.newWorkerReady(workerNo, outputCtrl, workerProps.get(workerNo).input).dp(meta))));
    r('ensureInitWorker, message channel -> workerInited, onWorkerExit, onWorkerError', s.pt.ensureInitWorker.pipe(rx.mergeMap(([meta, workerNo, worker]) => {
        let props = workerProps.get(workerNo);
        if ((props === null || props === void 0 ? void 0 : props.state) === 'inited') {
            s.ft.workerInited(workerNo, null, workerProps.get(workerNo).output, true).dp(meta);
            return rx.EMPTY;
        }
        else if ((props === null || props === void 0 ? void 0 : props.state) === 'init') {
            return s.pt.workerInited.pipe(rx.filter(() => (props === null || props === void 0 ? void 0 : props.state) === 'inited'), rx.take(1), rx.tap(() => s.ft.workerInited(workerNo, null, workerProps.get(workerNo).output, true).dp(meta)));
        }
        if (props == null) {
            props = { state: 'init' };
            workerProps.set(workerNo, props);
        }
        const chan = new MessageChannel();
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
        chan.port1.onmessage = ({ data: event }) => {
            var _a;
            if (event.type === 'WORKER_READY') {
                props.state = 'inited';
                s.ft.workerInited(workerNo, null, wo, false).dp(meta);
            }
            else if (event.type === 'log') {
                // eslint-disable-next-line no-console
                ((_a = opts === null || opts === void 0 ? void 0 : opts.log) !== null && _a !== void 0 ? _a : console.log)(...event.p);
            }
            else if (event.error) {
                s.ft.onWorkerError(workerNo, event.error, 'customized error').dp();
            }
            else {
                const data = event;
                (0, control2_1.deserializeAction2)(data, wo);
            }
        };
        worker.onerror = event => {
            s.ft.onWorkerError(workerNo, event, 'web worker error').dp();
            broker.dispatchErrorFor(event, meta);
        };
        chan.port1.onmessageerror = event => {
            s.ft.onWorkerError(workerNo, event, 'message errror').dp();
            broker.dispatchErrorFor(event, meta);
        };
        // TODO: web worker does not have 'close' event, I need
        // to.find a way resolve this worker exit notification
        // (worker as Worker).on('exit', code => {
        //   s.dp.onWorkerExit(workerNo, code);
        // });
        worker.postMessage({ type: 'ASSIGN_WORKER_NO', workerNo, mainPort: chan.port2 }, [chan.port2]);
        return wi.action$.pipe(rx.tap(action => chan.port1.postMessage((0, control_1.serializeAction)(action))));
    })
    // rx.takeUntil(s.pt.onWorkerExit.pipe(rx.filter(([id]) => id === )))
    ));
    r('(newWorkerReady) forkByBroker, workerInited -> ensureInitWorker, worker chan postMessage()', s.pt.newWorkerReady.pipe(rx.tap(([, ...props]) => {
        allReadyWorkers.next(props);
    }), rx.mergeMap(([, fromWorkerNo, workerOutput]) => workerOutput.pt.forkByBroker.pipe(rx.mergeMap(async ([, targetAction, port]) => {
        let assignedWorkerNo;
        try {
            const [, assignedWorkerNo_, worker] = await rx.firstValueFrom(s.ft.assignWorker().od(s.pt.workerAssigned
            // timeoutLog<typeof s.at.workerAssigned extends rx.Observable<infer T> ? T : never>(3000, () => console.log('worker assignment timeout'))
            ));
            assignedWorkerNo = assignedWorkerNo_;
            const fa = mainWorkerComp.s.createAction('onFork', [targetAction, port]);
            if (worker === 'main') {
                (0, control2_1.deserializeAction2)(fa, mainWorkerComp.s);
            }
            else {
                await rx.firstValueFrom(s.ft.ensureInitWorker(assignedWorkerNo, worker).od(s.pt.workerInited));
                workerProps.get(assignedWorkerNo).port.postMessage((0, control_1.serializeAction)(fa), [port]);
            }
        }
        catch (e) {
            if (opts === null || opts === void 0 ? void 0 : opts.log)
                opts.log(`Error encountered when forked by worker #${fromWorkerNo}, to #${assignedWorkerNo !== null && assignedWorkerNo !== void 0 ? assignedWorkerNo : ''}`);
            const errorFor = broker.s.createAction('__onError', [e]);
            errorFor.r = targetAction.i;
            port.postMessage((0, control_1.serializeAction)(errorFor));
            throw e;
        }
    })))));
    r('letWorkerExit -> postMessage to thread worker', s.pt.letWorkerExit.pipe(rx.map(([, workerNo]) => {
        const prop = workerProps.get(workerNo);
        // eslint-disable-next-line @typescript-eslint/ban-types
        prop.port.postMessage((0, control_1.serializeAction)(s.createAction('exit')));
        prop.state = 'exit';
    })));
    r('mainThreadInit', s.pt.mainThreadInit.pipe(rx.tap(() => {
        broker.s.ft.newWorkerReady(0, workerController.s, workerController.s).dp();
    })));
    s.ft.mainThreadInit().dp();
    s.ft.allReadyWorkers(allReadyWorkers).dp();
    return broker;
}
function setupForMainWorker(workerController, brokerCreationOptions) {
    const broker = createBroker(workerController, brokerCreationOptions);
    (0, worker_scheduler_1.applyScheduler)(broker, brokerCreationOptions);
    return broker;
}
//# sourceMappingURL=web-worker-broker.js.map