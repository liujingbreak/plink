import * as rx from 'rxjs';
// import {timeoutLog} from '../utils';
import { ReactorComposite2 } from '../reactor-composite';
import { deserializeAction2, RxController2 } from '../control2';
import { serializeAction, deserializeAction } from '../control';
import { brokerOutputTableFor as outputTableFor } from './types';
import { applyScheduler } from './worker-scheduler';
export * from './types';
/** Broker manages worker threads, create message channels between child worker threads and main thread, transmits actions
*/
export function createBroker(workerController, opts) {
    const options = opts ? Object.assign(Object.assign({}, opts), { outputTableFor }) : { outputTableFor };
    const mainWorkerComp = workerController;
    const broker = new ReactorComposite2(options);
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
        const chan = new MessageChannel();
        props.port = chan.port1;
        const wo = new RxController2({
            name: '#' + workerNo + ' worker output',
            debugExcludeTypes: opts === null || opts === void 0 ? void 0 : opts.debugExcludeTypes
        });
        const wi = new RxController2({
            name: '#' + workerNo + ' worker input',
            debugExcludeTypes: opts === null || opts === void 0 ? void 0 : opts.debugExcludeTypes
        });
        props.input = wi;
        props.output = wo;
        chan.port1.onmessage = ({ data: event }) => {
            var _a;
            if (event.type === 'WORKER_READY') {
                props.state = 'inited';
                o.ft.workerInited(workerNo, null, wo, false).dp(meta);
            }
            else if (event.type === 'log') {
                // eslint-disable-next-line no-console
                ((_a = opts === null || opts === void 0 ? void 0 : opts.log) !== null && _a !== void 0 ? _a : console.log)(...event.p);
            }
            else if (event.error) {
                o.ft.onWorkerError(workerNo, event.error, 'customized error').dp();
            }
            else {
                const data = event;
                deserializeAction2(data, wo);
            }
        };
        worker.onerror = event => {
            o.ft.onWorkerError(workerNo, event, 'web worker error').dp();
            broker.dispatchErrorFor(event, meta);
        };
        chan.port1.onmessageerror = event => {
            o.ft.onWorkerError(workerNo, event, 'message errror').dp();
            broker.dispatchErrorFor(event, meta);
        };
        // TODO: web worker does not have 'close' event, I need
        // to.find a way resolve this worker exit notification
        // (worker as Worker).on('exit', code => {
        //   o.dp.onWorkerExit(workerNo, code);
        // });
        worker.postMessage({ type: 'ASSIGN_WORKER_NO', workerNo, mainPort: chan.port2 }, [chan.port2]);
        return wi.action$.pipe(rx.tap(action => chan.port1.postMessage(serializeAction(action))));
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
            const fa = mainWorkerComp.i.createAction('onFork', targetAction, port);
            if (worker === 'main') {
                deserializeAction(fa, mainWorkerComp.i);
            }
            else {
                await rx.firstValueFrom(i.ft.ensureInitWorker(assignedWorkerNo, worker).do(o.at.workerInited));
                workerProps.get(assignedWorkerNo).port.postMessage(serializeAction(fa), [port]);
            }
        }
        catch (e) {
            if (opts === null || opts === void 0 ? void 0 : opts.log)
                opts.log(`Error encountered when forked by worker #${fromWorkerNo}, to #${assignedWorkerNo !== null && assignedWorkerNo !== void 0 ? assignedWorkerNo : ''}`);
            const errorFor = broker.o.createAction('__onErrorFor', [e]);
            errorFor.r = targetAction.i;
            port.postMessage(serializeAction(errorFor));
            throw e;
        }
    })))));
    r('letWorkerExit -> postMessage to thread worker', i.pt.letWorkerExit.pipe(rx.map(([, workerNo]) => {
        const prop = workerProps.get(workerNo);
        // eslint-disable-next-line @typescript-eslint/ban-types
        prop.port.postMessage(serializeAction(o.createAction('exit')));
        prop.state = 'exit';
    })));
    r('mainThreadInit', i.pt.mainThreadInit.pipe(rx.tap(() => {
        broker.i.ft.workerAssigned(0, 'main', true, 0).dp();
        broker.o.ft.newWorkerReady(0, workerController.o, workerController.i).dp();
    })));
    return broker;
}
export function setupForMainWorker(workerController, opts) {
    const broker = createBroker(workerController, opts);
    applyScheduler(broker, opts);
    broker.i.ft.mainThreadInit().dp();
    return broker;
}
//# sourceMappingURL=web-worker-broker.js.map