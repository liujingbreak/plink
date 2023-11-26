import { parentPort, MessageChannel, threadId, isMainThread } from 'worker_threads';
import * as rx from 'rxjs';
import { deserializeAction, serializeAction, actionRelatedToAction, nameOfAction } from '../control';
import { ReactorComposite } from '../epic';
import { workerInputTableFor as inputTableFor, workerOutputTableFor as outputTableFor } from './types';
export { fork } from './common';
// import {createBroker} from './node-worker-broker';
export function createWorkerControl(opts) {
    var _a, _b, _c, _d;
    let mainPort; // parent thread port
    // eslint-disable-next-line @typescript-eslint/ban-types
    const comp = new ReactorComposite(Object.assign(Object.assign({}, (opts !== null && opts !== void 0 ? opts : {})), { inputTableFor: [...((_a = opts === null || opts === void 0 ? void 0 : opts.inputTableFor) !== null && _a !== void 0 ? _a : []), ...inputTableFor], outputTableFor: [...((_b = opts === null || opts === void 0 ? void 0 : opts.outputTableFor) !== null && _b !== void 0 ? _b : []), ...outputTableFor], name: ((_c = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _c !== void 0 ? _c : '') + ('(W/' + (isMainThread ? 'main)' : threadId + '?)')), debug: opts === null || opts === void 0 ? void 0 : opts.debug, log: isMainThread ? opts === null || opts === void 0 ? void 0 : opts.log : (...args) => mainPort === null || mainPort === void 0 ? void 0 : mainPort.postMessage({ type: 'log', p: args }), 
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        debugExcludeTypes: ['log', 'warn', 'wait', 'stopWaiting', ...((_d = opts === null || opts === void 0 ? void 0 : opts.debugExcludeTypes) !== null && _d !== void 0 ? _d : [])], logStyle: 'noParam' }));
    let broker;
    const { r, i, o, outputTable, inputTable } = comp;
    const lo = comp.outputTable.l;
    r('-> workerInited', new rx.Observable(() => {
        const handler = (event) => {
            var _a;
            const msg = event;
            if (msg.type === 'ASSIGN_WORKER_NO') {
                msg.mainPort.postMessage({ type: 'WORKER_READY' });
                mainPort = msg.mainPort;
                const workerNo = msg.workerNo;
                const logPrefix = ((_a = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _a !== void 0 ? _a : '') + '(W/' + workerNo + ')';
                o.dp.workerInited(workerNo, logPrefix, msg.mainPort);
                comp.setName(logPrefix);
            }
        };
        if (parentPort) {
            /* eslint-disable no-restricted-globals */
            parentPort.on('message', handler);
        }
        else {
            o.dp.workerInited('main', '[main]', null);
        }
        return () => parentPort === null || parentPort === void 0 ? void 0 : parentPort.off('message', handler);
    }));
    r('workerInited -> main worker message port listener', outputTable.l.workerInited.pipe(rx.filter(([, , , port]) => port != null), rx.switchMap(([, , , port]) => new rx.Observable(() => {
        function handler(event) {
            const act = event;
            deserializeAction(act, i);
        }
        port.on('message', handler);
        return () => {
            port.close();
            port.off('message', handler);
        };
    }))));
    if (parentPort) {
        r('exit', comp.inputTable.l.exit.pipe(rx.switchMap(() => lo.workerInited), rx.take(1), rx.map(() => {
            comp.destory();
        })));
        r('postMessage wait, stopWaiting, returned message to broker', lo.workerInited.pipe(rx.filter(([, , , port]) => port != null), rx.take(1), rx.switchMap(([, , , port]) => rx.merge(o.at.wait, o.at.stopWaiting, o.at.returned).pipe(rx.map(action => {
            port.postMessage(serializeAction(action));
        })))));
        r('postMessage log to broker (parent thread)', lo.workerInited.pipe(rx.filter(([, , , port]) => port != null), rx.take(1), rx.switchMap(([, , logPrefix, port]) => lo.log.pipe(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        rx.map(([, ...p]) => port === null || port === void 0 ? void 0 : port.postMessage({ type: 'log', p: [logPrefix, ...p] }))))));
    }
    else {
        // main thread
        r('log, warn > console.log', lo.workerInited.pipe(rx.take(1), rx.switchMap(([, , logPrefix]) => rx.merge(lo.log, lo.warn).pipe(
        // eslint-disable-next-line no-console
        rx.map(([, ...p]) => { var _a; return ((_a = opts === null || opts === void 0 ? void 0 : opts.log) !== null && _a !== void 0 ? _a : console.log)(logPrefix, ...p); })))));
    }
    r('"fork" -> mainPort.postMessage, forkByBroker', o.at.fork.pipe(rx.switchMap(a => outputTable.l.workerInited.pipe(rx.map(b => [a, b]), rx.take(1))), rx.mergeMap(([act, [, , , mainPort]]) => {
        const { p: [wrappedAct] } = act;
        const chan = new MessageChannel();
        const error$ = rx.fromEventPattern(h => chan.port1.on('messageerror', h), h => chan.port1.off('messageerror', h));
        const close$ = rx.fromEventPattern(h => chan.port1.on('close', h), h => chan.port1.off('close', h));
        return rx.merge(rx.fromEventPattern(h => chan.port1.on('message', h), h => {
            chan.port1.off('message', h);
            chan.port1.close();
        }).pipe(rx.map(event => deserializeAction(event, i)), rx.take(1), rx.takeUntil(rx.merge(error$, close$))), new rx.Observable(_sub => {
            if (mainPort) {
                const forkByBroker = o.createAction('forkByBroker', wrappedAct, chan.port2);
                mainPort.postMessage(serializeAction(forkByBroker), [chan.port2]);
            }
            else {
                o.dpf.forkByBroker(act, wrappedAct, chan.port2);
            }
        }));
    })));
    r('onFork -> wait for fork action returns, postMessage to forking parent thread', i.pt.onFork.pipe(rx.mergeMap(([, origAct, port]) => {
        return rx.merge(o.core.action$.pipe(actionRelatedToAction(origAct), rx.take(1), rx.map(action => {
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
        })), new rx.Observable(() => {
            deserializeAction(origAct, i);
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
            o.dp.log(`pass action ${nameOfAction(action)} to main thread`);
            port.postMessage(serializeAction(action));
        }
    })));
    return comp;
}
function hasReturnTransferable(payload) {
    var _a;
    return Array.isArray((_a = payload[0]) === null || _a === void 0 ? void 0 : _a.transferList);
}
//# sourceMappingURL=node-worker.js.map