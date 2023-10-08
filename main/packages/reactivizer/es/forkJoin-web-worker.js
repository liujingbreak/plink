/* eslint-disable no-restricted-globals */
import * as rx from 'rxjs';
import { deserializeAction, serializeAction, actionRelatedToAction, actionRelatedToPayload } from './control';
import { ReactorComposite } from './epic';
// import {createBroker} from './node-worker-broker';
export function createWorkerControl(isInWorker, opts) {
    const inputTableFor = ['exit'];
    const outputTableFor = ['log', 'warn'];
    let broker;
    const [workerNo$, actionMsg$, dispatchStop$] = isInWorker ?
        initWorker() :
        [rx.of('main'), rx.EMPTY, new rx.Subject()];
    return workerNo$.pipe(rx.map(workerNo => {
        const logPrefix = '[Worker:' + (!isInWorker ? 'main]' : workerNo + ']');
        const comp = new ReactorComposite(Object.assign(Object.assign({}, opts), { name: logPrefix, inputTableFor,
            outputTableFor, debug: opts === null || opts === void 0 ? void 0 : opts.debug, log: !isInWorker ? opts === null || opts === void 0 ? void 0 : opts.log : (...args) => self.postMessage({ type: 'log', p: args }), debugExcludeTypes: ['log', 'warn'], logStyle: 'noParam' }));
        const { r, i, o } = comp;
        const latest = comp.inputTable;
        const lo = comp.outputTable.l;
        if (isInWorker) {
            r('exit', latest.l.exit.pipe(rx.map(() => {
                comp.destory();
                dispatchStop$.next();
            })));
            r('Pass worker wait and awake message to broker', rx.merge(o.at.wait, o.at.stopWaiting, o.at.returned).pipe(rx.map(action => {
                self.postMessage(serializeAction(action));
            })));
            r(lo.log.pipe(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            rx.map(([, ...p]) => postMessage({ type: 'log', p: [logPrefix, ...p] }))));
        }
        else {
            r(rx.merge(lo.log, lo.warn).pipe(
            // eslint-disable-next-line no-console
            rx.map(([, ...p]) => { var _a; return ((_a = opts === null || opts === void 0 ? void 0 : opts.log) !== null && _a !== void 0 ? _a : console.log)(logPrefix, ...p); })));
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
        const msg = event.data;
        if (msg.type === 'ASSIGN_WORKER_NO') {
            self.postMessage({ type: 'WORKER_READY' });
            workerNo$.next(msg.data);
        }
        else {
            const act = event;
            actionMsg$.next(act);
        }
    };
    /* eslint-disable no-restricted-globals */
    addEventListener('message', handler);
    stop$.pipe(rx.map(() => self.removeEventListener('message', handler)), rx.take(1)).subscribe();
    return [workerNo$.asObservable(), actionMsg$.asObservable(), stop$];
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
//# sourceMappingURL=forkJoin-web-worker.js.map