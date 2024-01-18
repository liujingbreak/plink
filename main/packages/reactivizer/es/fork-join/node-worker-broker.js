/* eslint-disable @typescript-eslint/indent */
import { MessageChannel } from 'worker_threads';
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
    const workerProps = new Map();
    const { r, i, o } = broker;
    r('workerInited -> newWorkerReady', o.pt.workerInited.pipe(rx.filter(([, , , , skipped]) => !skipped), rx.tap(([meta, workerNo, , outputCtrl]) => o.dpf.newWorkerReady(meta, workerNo, outputCtrl, workerProps.get(workerNo).input))));
    r('ensureInitWorker, message channel -> workerInited, onWorkerExit, onWorkerError', i.pt.ensureInitWorker.pipe(rx.mergeMap(([meta, workerNo, worker]) => {
        let props = workerProps.get(workerNo);
        if ((props === null || props === void 0 ? void 0 : props.state) === 'inited') {
            o.dpf.workerInited(meta, workerNo, null, workerProps.get(workerNo).output, true);
            return rx.EMPTY;
        }
        else if ((props === null || props === void 0 ? void 0 : props.state) === 'init') {
            return o.pt.workerInited.pipe(rx.filter(() => (props === null || props === void 0 ? void 0 : props.state) === 'inited'), rx.take(1), rx.tap(() => o.dpf.workerInited(meta, workerNo, null, workerProps.get(workerNo).output, true)));
        }
        if (props == null) {
            props = { state: 'init' };
            workerProps.set(workerNo, props);
        }
        const chan = new MessageChannel();
        props.port = chan.port1;
        const wo = new RxController({
            name: '#' + workerNo + ' worker output',
            debugExcludeTypes: opts === null || opts === void 0 ? void 0 : opts.debugExcludeTypes
        });
        const wi = new RxController({
            name: '#' + workerNo + ' worker input',
            debugExcludeTypes: opts === null || opts === void 0 ? void 0 : opts.debugExcludeTypes
        });
        props.input = wi;
        props.output = wo;
        chan.port1.on('message', (event) => {
            var _a;
            if (event.type === 'WORKER_READY') {
                props.state = 'inited';
                o.dpf.workerInited(meta, workerNo, null, wo, false);
            }
            else if (event.type === 'log') {
                const p = event.p;
                // eslint-disable-next-line no-console
                ((_a = opts === null || opts === void 0 ? void 0 : opts.log) !== null && _a !== void 0 ? _a : console.log)(p.join(' '));
            }
            else if (event.error) {
                o.dp.onWorkerError(workerNo, event.error, 'customized error');
            }
            else {
                const data = event;
                deserializeAction(data, wo);
            }
        });
        worker.on('error', event => {
            o.dp.onWorkerError(workerNo, event, 'Node.js error');
            o.dpf._onErrorFor(meta, event);
        });
        chan.port1.on('messageerror', event => {
            o.dp.onWorkerError(workerNo, event, 'message errror');
            o.dpf._onErrorFor(meta, event);
        });
        worker.on('exit', code => {
            o.dp.onWorkerExit(workerNo, code);
        });
        worker.postMessage({ type: 'ASSIGN_WORKER_NO', workerNo, mainPort: chan.port2 }, [chan.port2]);
        return wi.core.action$.pipe(rx.tap(action => chan.port1.postMessage(serializeAction(action))));
    })
    // rx.takeUntil(o.pt.onWorkerExit.pipe(rx.filter(([id]) => id === )))
    ));
    r('(newWorkerReady) forkByBroker, workerInited -> ensureInitWorker, worker chan postMessage()', o.pt.newWorkerReady.pipe(rx.mergeMap(([, fromWorkerNo, workerOutput]) => workerOutput.pt.forkByBroker.pipe(rx.mergeMap(async ([, targetAction, port]) => {
        let assignedWorkerNo;
        try {
            const [, assignedWorkerNo_, worker] = await rx.firstValueFrom(o.do.assignWorker(i.at.workerAssigned
            // timeoutLog<typeof i.at.workerAssigned extends rx.Observable<infer T> ? T : never>(3000, () => console.log('worker assignment timeout'))
            ));
            assignedWorkerNo = assignedWorkerNo_;
            const fa = mainWorkerComp.i.createAction('onFork', targetAction, port);
            if (worker === 'main') {
                deserializeAction(fa, mainWorkerComp.i);
            }
            else {
                await rx.firstValueFrom(i.do.ensureInitWorker(o.at.workerInited, assignedWorkerNo, worker));
                workerProps.get(assignedWorkerNo).port.postMessage(serializeAction(fa), [port]);
            }
        }
        catch (e) {
            if (opts === null || opts === void 0 ? void 0 : opts.log)
                opts.log(`Error encountered when forked by worker #${fromWorkerNo}, to #${assignedWorkerNo !== null && assignedWorkerNo !== void 0 ? assignedWorkerNo : ''}`, e);
            const errorFor = broker.o.createAction('_onErrorFor', e);
            errorFor.r = targetAction.i;
            port.postMessage(serializeAction(errorFor));
            throw e;
        }
    })))));
    r('letWorkerExit -> postMessage to thread worker', i.pt.letWorkerExit.pipe(rx.map(([, workerNo]) => {
        const prop = workerProps.get(workerNo);
        // eslint-disable-next-line @typescript-eslint/ban-types
        prop.port.postMessage(serializeAction(o.core.createAction('exit')));
        prop.state = 'exit';
    })));
    o.dp.newWorkerReady(0, workerController.o, workerController.i);
    return broker;
}
export function setupForMainWorker(workerContoller, opts) {
    const broker = createBroker(workerContoller, opts);
    applyScheduler(broker, opts);
    return broker;
}
//# sourceMappingURL=node-worker-broker.js.map