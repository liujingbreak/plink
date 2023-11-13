import { parentPort, MessageChannel as NodeMessagechannel, threadId, isMainThread } from 'worker_threads';
import * as rx from 'rxjs';
import { deserializeAction, serializeAction, actionRelatedToAction, actionRelatedToPayload } from '../control';
import { ReactorComposite } from '../epic';
// import {createBroker} from './node-worker-broker';
const inputTableFor = ['exit'];
const outputTableFor = ['workerInited', 'log', 'warn'];
export function createWorkerControl(opts) {
    var _a;
    // eslint-disable-next-line @typescript-eslint/ban-types
    const comp = new ReactorComposite(Object.assign(Object.assign({}, (opts !== null && opts !== void 0 ? opts : {})), { inputTableFor,
        outputTableFor, name: ((_a = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _a !== void 0 ? _a : '') + ('[Thread:' + (isMainThread ? 'main]' : threadId + ']')), debug: opts === null || opts === void 0 ? void 0 : opts.debug, log: isMainThread ? opts === null || opts === void 0 ? void 0 : opts.log : (...args) => parentPort === null || parentPort === void 0 ? void 0 : parentPort.postMessage({ type: 'log', p: args }), debugExcludeTypes: ['log', 'warn'], logStyle: 'noParam' }));
    let broker;
    const { r, i, o } = comp;
    const lo = comp.outputTable.l;
    r('worker$ -> workerInited', new rx.Observable(() => {
        const handler = (event) => {
            var _a;
            const msg = event;
            if (msg.type === 'ASSIGN_WORKER_NO') {
                parentPort.postMessage({ type: 'WORKER_READY' });
                const workerNo = msg.workerNo;
                const logPrefix = ((_a = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _a !== void 0 ? _a : '') + '[Worker:' + workerNo + ']';
                o.dp.workerInited(workerNo, logPrefix);
                comp.setName(logPrefix);
            }
            else {
                const act = event;
                deserializeAction(act, i);
            }
        };
        if (parentPort) {
            /* eslint-disable no-restricted-globals */
            parentPort.on('message', handler);
        }
        else {
            o.dp.workerInited('main', '[main]');
        }
        return () => parentPort === null || parentPort === void 0 ? void 0 : parentPort.off('message', handler);
    }));
    if (parentPort) {
        r('exit', comp.inputTable.l.exit.pipe(rx.switchMap(() => lo.workerInited), rx.take(1), rx.map(() => {
            comp.destory();
        })));
        r('postMessage wait, stopWaiting, returned message to broker', lo.workerInited.pipe(rx.take(1), rx.switchMap(() => rx.merge(o.at.wait, o.at.stopWaiting, o.at.returned)), rx.map(action => {
            parentPort === null || parentPort === void 0 ? void 0 : parentPort.postMessage(serializeAction(action));
        })));
        r('postMessage log to broker (parent thread)', lo.workerInited.pipe(rx.take(1), rx.switchMap(([, , logPrefix]) => lo.log.pipe(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        rx.map(([, ...p]) => parentPort === null || parentPort === void 0 ? void 0 : parentPort.postMessage({ type: 'log', p: [logPrefix, ...p] }))))));
    }
    else {
        // main thread
        r('log, warn > console.log', lo.workerInited.pipe(rx.take(1), rx.switchMap(([, , logPrefix]) => rx.merge(lo.log, lo.warn).pipe(
        // eslint-disable-next-line no-console
        rx.map(([, ...p]) => { var _a; return ((_a = opts === null || opts === void 0 ? void 0 : opts.log) !== null && _a !== void 0 ? _a : console.log)(logPrefix, ...p); })))));
    }
    r('On output "fork" request message', o.at.fork.pipe(rx.mergeMap(act => {
        const { p: [wrappedAct] } = act;
        const chan = new NodeMessagechannel();
        const error$ = rx.fromEventPattern(h => chan.port1.on('messageerror', h), h => chan.port1.off('messageerror', h));
        const close$ = rx.fromEventPattern(h => chan.port1.on('close', h), h => chan.port1.off('close', h));
        return rx.merge(rx.fromEventPattern(h => chan.port1.on('message', h), h => {
            chan.port1.off('message', h);
            chan.port1.close();
        }).pipe(rx.map(event => deserializeAction(event, i)), rx.take(1), rx.takeUntil(rx.merge(error$, close$))), new rx.Observable(_sub => {
            if (parentPort) {
                const forkByBroker = o.createAction('forkByBroker', wrappedAct, chan.port2);
                parentPort.postMessage(serializeAction(forkByBroker), [chan.port2]);
            }
            else {
                o.dp.forkByBroker(wrappedAct, chan.port2);
            }
        }));
    })));
    r('onFork -> wait for fork action returns, postMessage to forking parent thread', i.pt.onFork.pipe(rx.mergeMap(([, origAct, port]) => {
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
        if (parentPort) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            parentPort.postMessage({ error: { label, detail: err } });
        }
        else if (broker) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            broker.o.dp.onWorkerError(-1, { label, detail: err }, 'customized error');
        }
    })));
    return comp;
}
export function fork(comp, actionName, params, resActionName) {
    const forkedAction = comp.o.createAction(actionName, ...params);
    const forkDone = rx.firstValueFrom(comp.i.pt[(resActionName !== null && resActionName !== void 0 ? resActionName : (actionName + 'Resolved'))].pipe(actionRelatedToPayload(forkedAction.i), rx.map(([, res]) => res)));
    comp.o.dp.fork(forkedAction);
    return forkDone;
}
function hasReturnTransferable(payload) {
    var _a;
    return Array.isArray((_a = payload[0]) === null || _a === void 0 ? void 0 : _a.transferList);
}
//# sourceMappingURL=node-worker.js.map