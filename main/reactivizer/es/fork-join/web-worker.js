/* eslint-disable no-restricted-globals */
import * as rx from 'rxjs';
import { serializeAction } from '../control';
import { SimplexReactor } from '../simplex-reactor';
import { deserializeAction2, actionRelatedToAction, nameOfAction } from '..';
import { workerActionTableFor } from './types';
import { applySharedReactors } from './worker-common';
export { setIdleDuring } from './common';
// import {createBroker} from './node-worker-broker';
export function createWorkerControl(isInWorker, opts) {
    var _a, _b;
    let mainPort; // Broker's message port
    const comp = new SimplexReactor(Object.assign(Object.assign({}, (opts !== null && opts !== void 0 ? opts : {})), { tableFor: workerActionTableFor, name: 'unknown worker No', debug: opts === null || opts === void 0 ? void 0 : opts.debug, log: !isInWorker ? opts === null || opts === void 0 ? void 0 : opts.log : (...args) => mainPort === null || mainPort === void 0 ? void 0 : mainPort.postMessage({ type: 'log', p: args }), 
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        debugExcludeTypes: ['log', 'warn', 'wait', 'stopWaiting', ...((_a = opts === null || opts === void 0 ? void 0 : opts.debugExcludeTypes) !== null && _a !== void 0 ? _a : [])], debugIncludeTypes: opts === null || opts === void 0 ? void 0 : opts.debugIncludeTypes }));
    const { r, s, table } = comp;
    // eslint-disable-next-line no-console
    applySharedReactors(!isInWorker, comp, (_b = opts === null || opts === void 0 ? void 0 : opts.log) !== null && _b !== void 0 ? _b : console.log);
    r('inited -> main worker message port listener', s.pt.inited.pipe(rx.filter(([, , , port]) => port != null), rx.switchMap(([, , , port]) => new rx.Observable(() => {
        function handler(event) {
            const act = event.data;
            deserializeAction2(act, s);
        }
        port.addEventListener('message', handler);
        return () => {
            port.close();
            port.removeEventListener('message', handler);
        };
    }))));
    r('-> inited', new rx.Observable(() => {
        const handler = (event) => {
            var _a;
            const msg = event.data;
            if (msg.type === 'ASSIGN_WORKER_NO') {
                mainPort = msg.mainPort;
                mainPort.postMessage({ type: 'WORKER_READY' });
                const workerNo = msg.workerNo;
                const logPrefix = ((_a = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _a !== void 0 ? _a : '') + '(W/' + workerNo + ')';
                s.ft.inited(workerNo, logPrefix, mainPort).dp();
                comp.s.setName(logPrefix);
            }
        };
        if (isInWorker) {
            /* eslint-disable no-restricted-globals */
            addEventListener('message', handler);
        }
        else {
            s.ft.inited('main', '[main]', null).dp();
        }
        return () => self.removeEventListener('message', handler);
    }));
    r('"fork" -> forkByBroker', s.pt.fork.pipe(rx.switchMap(a => table.l.inited.pipe(rx.map(b => [a, b]), rx.take(1))), rx.mergeMap(([[m, forkActionName, ...forkActionParams], [, , , mainPort]]) => {
        const wrappedAct = s.createAction(forkActionName, forkActionParams);
        const chan = new MessageChannel();
        const error$ = new rx.Observable(sub => {
            chan.port1.onmessageerror = err => sub.next(err);
            return () => chan.port1.onmessageerror = null;
        });
        return rx.merge(new rx.Observable(sub => {
            chan.port1.onmessage = msg => sub.next(msg.data);
            return () => chan.port1.onmessage = null;
        }).pipe(rx.map(event => {
            s.ft.onForkReturn(event).dp();
        }), rx.take(1), rx.takeUntil(error$)), error$.pipe(rx.tap(err => comp.dispatchErrorFor(err, wrappedAct))), s.pt.onForkReturn.pipe(rx.map(([, retAction]) => retAction), actionRelatedToAction(wrappedAct), rx.tap(retAction => {
            const replyFork = s.createAction(nameOfAction(retAction), retAction.p);
            replyFork.r = m.i; // the original action is related to `wrappedAct`, now it is related to "fork" action
            s.actionUpstream.next(replyFork);
        }), rx.take(1)), new rx.Observable(_sub => {
            if (mainPort) {
                const forkByBroker = s.createAction('forkByBroker', [wrappedAct, chan.port2]);
                mainPort.postMessage(serializeAction(forkByBroker), [chan.port2]);
            }
            else {
                s.ft.forkByBroker(wrappedAct, chan.port2).dp(m);
            }
        }));
    })));
    return comp;
}
export function createWorkerControlOfFn(recursiveFuncs, isInWorker, opts) {
    const ctl = createWorkerControl(isInWorker, opts).reactivize(recursiveFuncs);
    return ctl;
}
//# sourceMappingURL=web-worker.js.map