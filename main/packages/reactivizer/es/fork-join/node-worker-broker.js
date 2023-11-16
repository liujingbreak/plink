/* eslint-disable @typescript-eslint/indent */
import { MessageChannel } from 'worker_threads';
import * as rx from 'rxjs';
import { ReactorComposite } from '../epic';
// import {timeoutLog} from '../utils';
import { serializeAction, deserializeAction, RxController } from '../control';
import { brokerOutputTableFor as outputTableFor } from './types';
import { applyScheduler } from './worker-scheduler';
/** WA - Worker output Message
*/
export function createBroker(workerController, opts) {
    const options = opts ? Object.assign(Object.assign({}, opts), { outputTableFor }) : { outputTableFor };
    const mainWorkerComp = workerController;
    const broker = new ReactorComposite(options);
    const workerInitState = new Map();
    const { r, i, o, outputTable } = broker;
    const workerOutputs = new Map();
    o.dp.portOfWorker(new Map());
    r('workerInited -> newWorkerReady', o.pt.workerInited.pipe(rx.filter(([, , , , skipped]) => !skipped), rx.tap(([meta, workerNo, , outputCtrl]) => o.dpf.newWorkerReady(meta, workerNo, outputCtrl))));
    r('ensureInitWorker -> workerInited, onWorkerExit', i.pt.ensureInitWorker.pipe(rx.withLatestFrom(outputTable.l.portOfWorker), rx.mergeMap(([[meta, workerNo, worker], [, portOfWorker]]) => {
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
        chan.port1.on('message', (event) => {
            var _a;
            if (event.type === 'WORKER_READY') {
                workerInitState.set(workerNo, 'DONE');
                const wo = new RxController();
                workerOutputs.set(workerNo, wo);
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
                let wo = workerOutputs.get(workerNo);
                if (wo == null) {
                    wo = new RxController();
                    workerOutputs.set(workerNo, wo);
                }
                deserializeAction(data, wo);
            }
        });
        worker.on('error', event => {
            o.dp.onWorkerError(workerNo, event, 'Node.js error');
        });
        chan.port1.on('messageerror', event => {
            o.dp.onWorkerError(workerNo, event, 'message errror');
        });
        worker.on('exit', code => {
            o.dp.onWorkerExit(workerNo, code);
        });
        worker.postMessage({ type: 'ASSIGN_WORKER_NO', workerNo, mainPort: chan.port2 }, [chan.port2]);
        return rx.EMPTY;
    })
    // rx.takeUntil(o.pt.onWorkerExit.pipe(rx.filter(([id]) => id === )))
    ));
    r('(newWorkerReady) forkByBroker, workerInited -> ensureInitWorker', outputTable.l.newWorkerReady.pipe(rx.mergeMap(([, , workerOutput]) => workerOutput.pt.forkByBroker), rx.switchMap(a => outputTable.l.portOfWorker.pipe(rx.take(1), rx.map(b => [a, b]))), rx.mergeMap(async ([[, targetAction, port], [, portOfWorker]]) => {
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
    o.dp.newWorkerReady(0, mainWorkerComp.o);
    return broker;
}
export function setupForMainWorker(workerContoller, opts) {
    const broker = createBroker(workerContoller, opts);
    applyScheduler(broker, opts);
    return broker;
}
//# sourceMappingURL=node-worker-broker.js.map