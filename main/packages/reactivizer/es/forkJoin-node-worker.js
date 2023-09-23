import { parentPort, MessageChannel as NodeMessagechannel, threadId, isMainThread } from 'worker_threads';
import * as rx from 'rxjs';
import { deserializeAction, serializeAction, nameOfAction, actionRelatedToAction, actionRelatedToPayload } from './control';
import { ReactorComposite } from './epic';
// import {createBroker} from './node-worker-broker';
export function createWorkerControl(opts) {
    // eslint-disable-next-line @typescript-eslint/ban-types
    const comp = new ReactorComposite(Object.assign(Object.assign({}, opts), { debug: (opts === null || opts === void 0 ? void 0 : opts.debug) ? ('[Thread:' + (isMainThread ? 'main]' : threadId + ']')) : false, log: isMainThread ? opts === null || opts === void 0 ? void 0 : opts.log : (...args) => parentPort === null || parentPort === void 0 ? void 0 : parentPort.postMessage({ type: 'log', p: args }), debugExcludeTypes: ['log', 'warn'], logStyle: 'noParam' }));
    let broker;
    comp.startAll();
    const { r, i, o } = comp;
    const latest = i.createLatestPayloadsFor('exit');
    const lo = o.createLatestPayloadsFor('log', 'warn');
    const logPrefix = '[Thread:' + (isMainThread ? 'main]' : threadId + ']');
    if (parentPort) {
        const handler = (event) => {
            const msg = event;
            if (msg.type === 'ASSIGN_WORKER_NO') {
                parentPort.postMessage({ type: 'WORKER_READY' });
            }
            else {
                const act = event;
                deserializeAction(act, i);
            }
        };
        /* eslint-disable no-restricted-globals */
        parentPort === null || parentPort === void 0 ? void 0 : parentPort.on('message', handler);
        r('exit', latest.exit.pipe(rx.map(() => {
            comp.destory();
            parentPort === null || parentPort === void 0 ? void 0 : parentPort.off('message', handler);
        })));
        r('Pass worker wait and awake message to broker', rx.merge(o.at.wait, o.at.stopWaiting, o.at.returned).pipe(rx.map(action => {
            parentPort === null || parentPort === void 0 ? void 0 : parentPort.postMessage(serializeAction(action));
        })));
        r(lo.log.pipe(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        rx.map(([, ...p]) => parentPort === null || parentPort === void 0 ? void 0 : parentPort.postMessage({ type: 'log', p: [logPrefix, ...p] }))));
    }
    else {
        r(rx.merge(lo.log, lo.warn).pipe(
        // eslint-disable-next-line no-console
        rx.map(([, ...p]) => { var _a; return ((_a = opts === null || opts === void 0 ? void 0 : opts.log) !== null && _a !== void 0 ? _a : console.log)(logPrefix, ...p); })));
    }
    r('On output "fork" request message', o.at.fork.pipe(rx.mergeMap(act => {
        const { p: [wrappedAct] } = act;
        const wrappedActId = wrappedAct.i;
        const wrappedActCompletedType = nameOfAction(wrappedAct) + 'Completed';
        const chan = new NodeMessagechannel();
        const error$ = rx.fromEventPattern(h => chan.port1.on('messageerror', h), h => chan.port1.off('messageerror', h));
        const close$ = rx.fromEventPattern(h => chan.port1.on('close', h), h => chan.port1.off('close', h));
        return rx.merge(rx.fromEventPattern(h => chan.port1.on('message', h), h => {
            chan.port1.off('message', h);
            chan.port1.close();
        }).pipe(rx.map(event => deserializeAction(event, i)), rx.take(1), rx.takeUntil(rx.merge(error$, close$, i.at[wrappedActCompletedType].pipe(actionRelatedToAction(wrappedActId))))), new rx.Observable(_sub => {
            if (parentPort) {
                const forkByBroker = o.createAction('forkByBroker', wrappedAct, chan.port2);
                parentPort.postMessage(serializeAction(forkByBroker), [chan.port2]);
            }
            else {
                o.dp.forkByBroker(wrappedAct, chan.port2);
            }
        }));
    })));
    r('On recieving "being forked" message, wait for fork action returns', i.pt.onFork.pipe(rx.mergeMap(([, origAct, port]) => {
        const origId = origAct.i;
        deserializeAction(origAct, i);
        const origType = nameOfAction(origAct);
        const typeOfResolved = origType + 'Resolved';
        const typeOfCompleted = origType + 'Completed';
        return rx.merge(o.at[typeOfResolved].pipe(actionRelatedToAction(origId), rx.map(action => [action, false])), o.at[typeOfCompleted].pipe(actionRelatedToAction(origId), rx.map(action => [action, true]))).pipe(rx.map(([action, isCompleted]) => {
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
            if (isCompleted) {
                o.dp.returned();
            }
            return isCompleted;
        }), rx.takeWhile(isComplete => !isComplete));
    })));
    r('Pass error to broker', comp.error$.pipe(rx.map(([label, err]) => {
        if (parentPort) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            parentPort.postMessage({ error: { label, detail: err } });
        }
        else if (broker) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            broker.o.dp.onWorkerError(-1, { label, detail: err });
        }
    })));
    return comp;
}
export function reativizeRecursiveFuncs(comp, fObject) {
    comp.reactivize(fObject);
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
//# sourceMappingURL=forkJoin-node-worker.js.map