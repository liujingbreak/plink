/* eslint-disable no-restricted-globals */
import * as rx from 'rxjs';
import { deserializeAction, serializeAction, actionRelatedToAction, actionRelatedToPayload } from '../control';
import { ReactorComposite } from '../epic';
// import {createBroker} from '../node-worker-broker';
const inputTableFor = ['exit'];
const outputTableFor = ['workerInited', 'log', 'warn'];
export function createWorkerControl(isInWorker, opts) {
    var _a;
    let broker;
    const comp = new ReactorComposite(Object.assign(Object.assign({}, opts), { name: (_a = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _a !== void 0 ? _a : '', inputTableFor,
        outputTableFor, debug: opts === null || opts === void 0 ? void 0 : opts.debug, log: !isInWorker ? opts === null || opts === void 0 ? void 0 : opts.log : (...args) => self.postMessage({ type: 'log', p: args }), debugExcludeTypes: ['log', 'warn'], logStyle: 'noParam' }));
    const { r, i, o } = comp;
    const lo = comp.outputTable.l;
    r('worker$ -> workerInited', new rx.Observable(() => {
        const handler = (event) => {
            var _a;
            const msg = event.data;
            if (msg.type === 'ASSIGN_WORKER_NO') {
                self.postMessage({ type: 'WORKER_READY' });
                const { workerNo } = msg;
                const logPrefix = ((_a = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _a !== void 0 ? _a : '') + '[Worker:' + workerNo + ']';
                o.dp.workerInited(workerNo, logPrefix);
                comp.setName(logPrefix);
            }
            else {
                const act = event;
                deserializeAction(act, i);
            }
        };
        if (isInWorker) {
            /* eslint-disable no-restricted-globals */
            addEventListener('message', handler);
        }
        else {
            o.dp.workerInited('main', '[main]');
        }
        return () => self.removeEventListener('message', handler);
    }));
    if (isInWorker) {
        r('exit', comp.inputTable.l.exit.pipe(rx.switchMap(() => lo.workerInited), rx.take(1), rx.map(() => {
            comp.destory();
        })));
        r('Pass worker wait and awake message to broker', lo.workerInited.pipe(rx.take(1), rx.switchMap(() => rx.merge(o.at.wait, o.at.stopWaiting, o.at.returned)), rx.map(action => {
            self.postMessage(serializeAction(action));
        })));
        r('postMessage log to broker (parent thread)', lo.workerInited.pipe(rx.take(1), rx.switchMap(([, , logPrefix]) => lo.log.pipe(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        rx.map(([, ...p]) => postMessage({ type: 'log', p: [logPrefix, ...p] }))))));
    }
    else {
        r('log, warn > console.log', lo.workerInited.pipe(rx.take(1), rx.switchMap(([, , logPrefix]) => rx.merge(lo.log, lo.warn).pipe(
        // eslint-disable-next-line no-console
        rx.map(([, ...p]) => { var _a; return ((_a = opts === null || opts === void 0 ? void 0 : opts.log) !== null && _a !== void 0 ? _a : console.log)(logPrefix, ...p); })))));
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
        }).pipe(rx.map(event => deserializeAction(event, i)), rx.take(1), rx.takeUntil(rx.merge(error$, error$))), new rx.Observable(_sub => {
            if (isInWorker) {
                const forkByBroker = o.createAction('forkByBroker', wrappedAct, chan.port2);
                postMessage(serializeAction(forkByBroker), '*', [chan.port2]);
            }
            else {
                o.dp.forkByBroker(wrappedAct, chan.port2);
            }
        }));
    })));
    r('On recieving "being forked" message, wait for fork action returns', i.pt.onFork.pipe(rx.mergeMap(([, origAct, port]) => {
        const origId = origAct.i;
        deserializeAction(origAct, i);
        return o.core.action$.pipe(actionRelatedToAction(origId), rx.take(1), rx.map(action => {
            const { p } = action;
            if (hasReturnTransferable(p)) {
                const [{ transferList }] = p;
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                p[0].transferList = null;
                port.postMessage(serializeAction(action), transferList);
            }
            else {
                port.postMessage(serializeAction(action));
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
            broker.o.dp.onWorkerError(-1, { label, detail: err }, 'customized error');
        }
    })));
    return comp;
}
export function fork(comp, actionType, params, resActionType) {
    const forkedAction = comp.o.createAction(actionType, ...params);
    const forkDone = rx.firstValueFrom(comp.i.pt[(resActionType !== null && resActionType !== void 0 ? resActionType : (actionType + 'Resolved'))].pipe(actionRelatedToPayload(forkedAction.i), rx.map(([, res]) => res)));
    comp.o.dp.fork(forkedAction);
    return forkDone;
}
function hasReturnTransferable(payload) {
    var _a;
    return Array.isArray((_a = payload[0]) === null || _a === void 0 ? void 0 : _a.transferList);
}
//# sourceMappingURL=web-worker.js.map