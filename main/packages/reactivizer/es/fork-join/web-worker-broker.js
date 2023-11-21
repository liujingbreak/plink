import * as rx from 'rxjs';
import { ReactorComposite } from '../epic';
// import {timeoutLog} from '../utils';
import { serializeAction, deserializeAction, RxController } from '../control';
import { brokerOutputTableFor as outputTableFor } from './types';
import { applyScheduler } from './worker-scheduler';
export * from './types';
/** Broker manages worker threads, create message channels between child worker threads and main thread, transmits actions
*/
export function createBroker(workerController, opts) {
    const options = opts ? Object.assign(Object.assign({}, opts), { outputTableFor }) : { outputTableFor };
    const mainWorkerComp = workerController;
    const broker = new ReactorComposite(options);
    const workerInitState = new Map();
    const { r, i, o, outputTable } = broker;
    const workerOutputs = new Map();
    o.dp.portOfWorker(new Map());
    r('workerInited -> newWorkerReady', o.pt.workerInited.pipe(rx.filter(([, , , , skipped]) => !skipped), rx.switchMap(a => outputTable.l.workerInputs.pipe(rx.map(([, map]) => map.get(a[1])), rx.filter(b => b != null), rx.take(1), rx.map(b => [a, b]))), rx.tap(([[meta, workerNo, , outputCtrl], inputRx]) => o.dpf.newWorkerReady(meta, workerNo, outputCtrl, inputRx))));
    r('ensureInitWorker, message channel -> workerInited, onWorkerExit, onWorkerError', i.pt.ensureInitWorker.pipe(rx.withLatestFrom(outputTable.l.portOfWorker, outputTable.l.workerInputs), rx.mergeMap(([[meta, workerNo, worker], [, portOfWorker], [, wiByWorkerNo]]) => {
        if (workerInitState.get(workerNo) === 'DONE') {
            o.dpf.workerInited(meta, workerNo, null, workerOutputs.get(workerNo), true);
            return rx.EMPTY;
        }
        else if (workerInitState.get(workerNo) === 'WIP') {
            return o.pt.workerInited.pipe(rx.filter(() => workerInitState.get(workerNo) === 'DONE'), rx.take(1), rx.tap(() => o.dpf.workerInited(meta, workerNo, null, workerOutputs.get(workerNo), true)));
        }
        workerInitState.set(workerNo, 'WIP');
        const chan = new MessageChannel();
        portOfWorker.set(worker, chan.port1);
        o.dp.portOfWorker(portOfWorker);
        const wo = new RxController({ name: '#' + workerNo + ' worker output', debug: opts === null || opts === void 0 ? void 0 : opts.debug, log: opts === null || opts === void 0 ? void 0 : opts.log });
        workerOutputs.set(workerNo, wo);
        const wi = new RxController({ name: '#' + workerNo + ' worker input', debug: opts === null || opts === void 0 ? void 0 : opts.debug, log: opts === null || opts === void 0 ? void 0 : opts.log });
        wiByWorkerNo.set(workerNo, wi);
        o.dp.workerInputs(wiByWorkerNo);
        chan.port1.onmessage = ({ data: event }) => {
            var _a;
            if (event.type === 'WORKER_READY') {
                workerInitState.set(workerNo, 'DONE');
                o.dpf.workerInited(meta, workerNo, null, wo, false);
            }
            else if (event.type === 'log') {
                // eslint-disable-next-line no-console
                ((_a = opts === null || opts === void 0 ? void 0 : opts.log) !== null && _a !== void 0 ? _a : console.log)(...event.p);
            }
            else if (event.error) {
                o.dp.onWorkerError(workerNo, event.error, 'customized error');
            }
            else {
                const data = event;
                deserializeAction(data, wo);
            }
        };
        worker.onerror = event => {
            o.dp.onWorkerError(workerNo, event, 'web worker error');
        };
        chan.port1.onmessageerror = event => {
            o.dp.onWorkerError(workerNo, event, 'message error');
        };
        // TODO: web worker does not have 'close' event, I need
        // to.find a way resolve this worker exit notification
        // (worker as Worker).on('exit', code => {
        //   o.dp.onWorkerExit(workerNo, code);
        // });
        worker.postMessage({ type: 'ASSIGN_WORKER_NO', workerNo, mainPort: chan.port2 }, [chan.port2]);
        return wi.core.action$.pipe(rx.tap(action => chan.port1.postMessage(serializeAction(action))));
    })
    // rx.takeUntil(o.pt.onWorkerExit.pipe(rx.filter(([id]) => id === )))
    ));
    r('(newWorkerReady) forkByBroker, workerInited -> ensureInitWorker, worker chan postMessage()', outputTable.l.newWorkerReady.pipe(rx.mergeMap(([, , workerOutput]) => workerOutput.pt.forkByBroker), rx.switchMap(a => outputTable.l.portOfWorker.pipe(rx.take(1), rx.map(b => [a, b]))), rx.mergeMap(async ([[, targetAction, port], [, portOfWorker]]) => {
        const [, assignedWorkerNo, worker] = await rx.firstValueFrom(o.do.assignWorker(i.at.workerAssigned
        // timeoutLog<typeof i.at.workerAssigned extends rx.Observable<infer T> ? T : never>(3000, () => console.log('worker assignment timeout'))
        ));
        const fa = mainWorkerComp.i.createAction('onFork', targetAction, port);
        if (worker === 'main') {
            deserializeAction(fa, mainWorkerComp.i);
        }
        else {
            await rx.firstValueFrom(i.do.ensureInitWorker(o.at.workerInited, assignedWorkerNo, worker));
            portOfWorker.get(worker).postMessage(serializeAction(fa), [port]);
        }
    })));
    r('letWorkerExit -> postMessage to thread worker', i.pt.letWorkerExit.pipe(rx.switchMap(a => outputTable.l.portOfWorker.pipe(rx.take(1), rx.map(b => [a, b]))), rx.map(([[, worker], [, portOfWorker]]) => {
        // eslint-disable-next-line @typescript-eslint/ban-types
        portOfWorker.get(worker).postMessage(serializeAction(o.core.createAction('exit')));
    })));
    const workerInputMap = new Map();
    workerInputMap.set(0, workerController.i);
    o.dp.workerInputs(workerInputMap);
    o.dp.newWorkerReady(0, workerController.o, workerController.i);
    return broker;
}
export function setupForMainWorker(workerContoller, opts) {
    const broker = createBroker(workerContoller, opts);
    applyScheduler(broker, opts);
    return broker;
}
//# sourceMappingURL=web-worker-broker.js.map