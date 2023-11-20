/* eslint-disable no-restricted-globals */
import * as rx from 'rxjs';
import { deserializeAction, serializeAction, actionRelatedToAction } from '../control';
import { ReactorComposite } from '../epic';
// import {createBroker} from '../node-worker-broker';
import { workerInputTableFor as inputTableFor, workerOutputTableFor as outputTableFor } from './types';
export { fork } from './common';
export function createWorkerControl(isInWorker, opts) {
    var _a, _b, _c;
    let broker;
    let mainPort; // parent thread port
    const comp = new ReactorComposite(Object.assign(Object.assign({}, opts), { name: (_a = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _a !== void 0 ? _a : '', inputTableFor: [...((_b = opts === null || opts === void 0 ? void 0 : opts.inputTableFor) !== null && _b !== void 0 ? _b : []), ...inputTableFor], outputTableFor: [...((_c = opts === null || opts === void 0 ? void 0 : opts.outputTableFor) !== null && _c !== void 0 ? _c : []), ...outputTableFor], debug: opts === null || opts === void 0 ? void 0 : opts.debug, log: !isInWorker ? opts === null || opts === void 0 ? void 0 : opts.log : (...args) => mainPort === null || mainPort === void 0 ? void 0 : mainPort.postMessage({ type: 'log', p: args }), debugExcludeTypes: ['log', 'warn'], logStyle: 'noParam' }));
    const { r, i, o, outputTable } = comp;
    const lo = comp.outputTable.l;
    r('worker$ -> workerInited', new rx.Observable(() => {
        const handler = (event) => {
            var _a;
            const msg = event.data;
            if (msg.type === 'ASSIGN_WORKER_NO') {
                msg.mainPort.postMessage({ type: 'WORKER_READY' });
                const { workerNo } = msg;
                const logPrefix = ((_a = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _a !== void 0 ? _a : '') + '[Worker:' + workerNo + ']';
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
    r('workerInited -> main worker message port listener', outputTable.l.workerInited.pipe(rx.filter(([, , , port]) => port != null), rx.switchMap(([, , , port]) => new rx.Observable(() => {
        function handler(event) {
            const act = event.data;
            deserializeAction(act, i);
        }
        port.addEventListener('message', handler);
        return () => { port.removeEventListener('message', handler); };
    }))));
    if (isInWorker) {
        r('exit', comp.inputTable.l.exit.pipe(rx.switchMap(() => lo.workerInited), rx.take(1), rx.map(() => {
            comp.destory();
        })));
        r('Pass worker wait and awake message to broker', lo.workerInited.pipe(rx.filter(([, , , port]) => port != null), rx.take(1), rx.switchMap(([, , , port]) => rx.merge(o.at.wait, o.at.stopWaiting, o.at.returned).pipe(rx.map(action => {
            port.postMessage(serializeAction(action));
        })))));
        r('postMessage log to broker (parent thread)', lo.workerInited.pipe(rx.filter(([, , , port]) => port != null), rx.take(1), rx.switchMap(([, , logPrefix, port]) => lo.log.pipe(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        rx.map(([, ...p]) => port.postMessage({ type: 'log', p: [logPrefix, ...p] }))))));
    }
    else {
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
        }).pipe(rx.map(event => deserializeAction(event, i)), rx.take(1), rx.takeUntil(rx.merge(error$, error$))), new rx.Observable(_sub => {
            if (mainPort) {
                const forkByBroker = o.createAction('forkByBroker', wrappedAct, chan.port2);
                mainPort.postMessage(serializeAction(forkByBroker), [chan.port2]);
            }
            else {
                o.dpf.forkByBroker(act, wrappedAct, chan.port2);
            }
        }));
    })));
    r('On recieving "being forked" message, wait for fork action returns', i.pt.onFork.pipe(rx.mergeMap(([, origAct, port]) => {
        deserializeAction(origAct, i);
        return o.core.action$.pipe(actionRelatedToAction(origAct), rx.take(1), rx.map(action => {
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
    return comp;
}
function hasReturnTransferable(payload) {
    var _a;
    return Array.isArray((_a = payload[0]) === null || _a === void 0 ? void 0 : _a.transferList);
}
//# sourceMappingURL=web-worker.js.map