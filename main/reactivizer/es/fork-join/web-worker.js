/* eslint-disable no-restricted-globals */
import * as rx from 'rxjs';
import { serializeAction } from '../control';
import { ReactorComposite2, deserializeAction2, actionRelatedToAction, nameOfAction } from '..';
import { workerInputTableFor as inputTableFor, workerOutputTableFor as outputTableFor } from './types';
import { applySharedReactors } from './worker-common';
export { setIdleDuring } from './common';
// import {createBroker} from './node-worker-broker';
export function createWorkerControl(isInWorker, opts) {
    var _a, _b, _c, _d;
    let mainPort; // parent thread port
    const comp = new ReactorComposite2(Object.assign(Object.assign({}, (opts !== null && opts !== void 0 ? opts : {})), { inputTableFor: [...((_a = opts === null || opts === void 0 ? void 0 : opts.inputTableFor) !== null && _a !== void 0 ? _a : []), ...inputTableFor], outputTableFor: [...((_b = opts === null || opts === void 0 ? void 0 : opts.outputTableFor) !== null && _b !== void 0 ? _b : []), ...outputTableFor], name: 'unknown worker No', debug: opts === null || opts === void 0 ? void 0 : opts.debug, log: !isInWorker ? opts === null || opts === void 0 ? void 0 : opts.log : (...args) => mainPort === null || mainPort === void 0 ? void 0 : mainPort.postMessage({ type: 'log', p: args }), 
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        debugExcludeTypes: ['log', 'warn', ...((_c = opts === null || opts === void 0 ? void 0 : opts.debugExcludeTypes) !== null && _c !== void 0 ? _c : [])], debugIncludeTypes: opts === null || opts === void 0 ? void 0 : opts.debugIncludeTypes }));
    const { r, i, o, outputTable } = comp;
    r('-> workerInited', new rx.Observable(() => {
        const handler = (event) => {
            var _a;
            const msg = event.data;
            if (msg.type === 'ASSIGN_WORKER_NO') {
                msg.mainPort.postMessage({ type: 'WORKER_READY' });
                mainPort = msg.mainPort;
                const workerNo = msg.workerNo;
                const logPrefix = ((_a = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _a !== void 0 ? _a : '') + '(W/' + workerNo + ')';
                o.ft.workerInited(workerNo, logPrefix, msg.mainPort).dp();
                comp.setName(logPrefix);
            }
        };
        if (isInWorker) {
            /* eslint-disable no-restricted-globals */
            addEventListener('message', handler);
        }
        else {
            o.ft.workerInited('main', '[main]', null).dp();
        }
        return () => self.removeEventListener('message', handler);
    }));
    r('workerInited -> main worker message port listener', o.pt.workerInited.pipe(rx.filter(([, , , port]) => port != null), rx.switchMap(([, , , port]) => new rx.Observable(() => {
        function handler(event) {
            const act = event.data;
            deserializeAction2(act, i);
        }
        port.addEventListener('message', handler);
        return () => {
            port.close();
            port.removeEventListener('message', handler);
        };
    }))));
    // eslint-disable-next-line no-console
    applySharedReactors(!isInWorker, comp, (_d = opts === null || opts === void 0 ? void 0 : opts.log) !== null && _d !== void 0 ? _d : console.log);
    r('"fork" -> forkByBroker', o.pt.fork.pipe(rx.switchMap(a => outputTable.l.workerInited.pipe(rx.map(b => [a, b]), rx.take(1))), rx.mergeMap(([[m, forkActionName, ...forkActionParams], [, , , mainPort]]) => {
        const wrappedAct = o.createAction(forkActionName, forkActionParams);
        const chan = new MessageChannel();
        const error$ = new rx.Observable(sub => {
            chan.port1.onmessageerror = err => sub.next(err);
            return () => chan.port1.onmessageerror = null;
        });
        return rx.merge(new rx.Observable(sub => {
            chan.port1.onmessage = msg => sub.next(msg.data);
            return () => chan.port1.onmessage = null;
        }).pipe(rx.map(event => deserializeAction2(event, i)), rx.take(1), rx.takeUntil(rx.merge(error$, error$))), error$.pipe(rx.tap(err => comp.dispatchErrorFor(err, wrappedAct))), i.action$.pipe(actionRelatedToAction(wrappedAct), rx.tap(retAction => {
            const replyFork = i.createAction(nameOfAction(retAction), retAction.p);
            replyFork.r = m.i; // the original action is related to `wrappedAct`, now it is related to "fork" action
            i.actionUpstream.next(replyFork);
        }), rx.take(1)), new rx.Observable(_sub => {
            if (mainPort) {
                const forkByBroker = o.createAction('forkByBroker', [wrappedAct, chan.port2]);
                mainPort.postMessage(serializeAction(forkByBroker), [chan.port2]);
            }
            else {
                o.ft.forkByBroker(wrappedAct, chan.port2).dp(m);
            }
        }));
    })));
    return comp;
}
export function createWorkerControlOfFn(recursiveFuncs, isInWorker, opts) {
    const ctl = createWorkerControl(isInWorker, opts).reativizeRecursiveFuncs(recursiveFuncs);
    return ctl;
}
//# sourceMappingURL=web-worker.js.map