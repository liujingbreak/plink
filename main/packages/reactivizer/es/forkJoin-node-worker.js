import { parentPort, MessageChannel as NodeMessagechannel, threadId, isMainThread } from 'worker_threads';
import * as rx from 'rxjs';
import { deserializeAction, serializeAction, actionRelatedToAction, actionRelatedToPayload } from './control';
import { ReactorComposite } from './epic';
export { reativizeRecursiveFuncs } from './forkJoin-web-worker';
// import {createBroker} from './node-worker-broker';
export function createWorkerControl(opts) {
    const inputTableFor = ['exit'];
    const outputTableFor = ['log', 'warn'];
    // eslint-disable-next-line @typescript-eslint/ban-types
    const comp = new ReactorComposite(Object.assign(Object.assign({}, (opts !== null && opts !== void 0 ? opts : {})), { inputTableFor,
        outputTableFor, name: ('[Thread:' + (isMainThread ? 'main]' : threadId + ']')), debug: opts === null || opts === void 0 ? void 0 : opts.debug, log: isMainThread ? opts === null || opts === void 0 ? void 0 : opts.log : (...args) => parentPort === null || parentPort === void 0 ? void 0 : parentPort.postMessage({ type: 'log', p: args }), debugExcludeTypes: ['log', 'warn'], logStyle: 'noParam' }));
    let broker;
    const [workerNo$, actionMsg$, dispatchStop$] = parentPort ?
        initWorker() :
        [rx.of('main'), rx.EMPTY, new rx.Subject()];
    return workerNo$.pipe(rx.map(workerNo => {
        const logPrefix = '[Worker:' + (!parentPort ? 'main]' : workerNo + ']');
        const { r, i, o } = comp;
        const latest = comp.inputTable;
        const lo = comp.outputTable.l;
        if (parentPort) {
            r('exit', latest.l.exit.pipe(rx.map(() => {
                comp.destory();
                dispatchStop$.next();
            })));
            r('Pass worker wait and awake message to broker', rx.merge(o.at.wait, o.at.stopWaiting, o.at.returned).pipe(rx.map(action => {
                parentPort === null || parentPort === void 0 ? void 0 : parentPort.postMessage(serializeAction(action));
            })));
            r(lo.log.pipe(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            rx.map(([, ...p]) => parentPort === null || parentPort === void 0 ? void 0 : parentPort.postMessage({ type: 'log', p: [logPrefix, ...p] }))));
        }
        else {
            // main thread
            r(rx.merge(lo.log, lo.warn).pipe(
            // eslint-disable-next-line no-console
            rx.map(([, ...p]) => { var _a; return ((_a = opts === null || opts === void 0 ? void 0 : opts.log) !== null && _a !== void 0 ? _a : console.log)(logPrefix, ...p); })));
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
            if (parentPort) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                parentPort.postMessage({ error: { label, detail: err } });
            }
            else if (broker) {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                broker.o.dp.onWorkerError(-1, { label, detail: err });
            }
        })));
        actionMsg$.pipe(rx.tap(action => deserializeAction(action, i)), rx.takeUntil(dispatchStop$)).subscribe();
        return comp;
    }));
}
function initWorker() {
    const workerNo$ = new rx.ReplaySubject(1);
    const actionMsg$ = new rx.ReplaySubject(5);
    const stop$ = new rx.Subject();
    const handler = (event) => {
        const msg = event;
        if (msg.type === 'ASSIGN_WORKER_NO') {
            parentPort.postMessage({ type: 'WORKER_READY' });
            workerNo$.next(msg.data);
        }
        else {
            const act = event;
            actionMsg$.next(act);
        }
    };
    /* eslint-disable no-restricted-globals */
    parentPort.on('message', handler);
    stop$.pipe(rx.map(() => self.removeEventListener('message', handler)), rx.take(1)).subscribe();
    return [workerNo$.asObservable(), actionMsg$.asObservable(), stop$];
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