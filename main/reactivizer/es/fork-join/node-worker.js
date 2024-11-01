import { inspect } from 'node:util';
import { parentPort, MessageChannel, threadId, isMainThread } from 'worker_threads';
import * as rx from 'rxjs';
import { serializeAction } from '../control';
import { deserializeAction2, actionRelatedToAction } from '..';
import { SimplexReactor } from '../simplex-reactor';
import { workerActionTableFor } from './types';
import { applySharedReactors } from './worker-common';
export { setIdleDuring } from './common';
const inspectOptions = { depth: 0, showHidden: false, compact: true, maxStringLength: 20 };
/**
 * @param opts.log if value is `undefined` and current createWorkerControl() is for creating instance in a forked thread, by default log messages will
 * be transfered to main worker thread, but message will be trimmed by `util.inspect(..., {depth: 1, showHidden: false})`.
 */
export function createWorkerControl(opts) {
    var _a, _b, _c;
    let mainPort; // Broker's message port
    // eslint-disable-next-line @typescript-eslint/ban-types
    const comp = new SimplexReactor(Object.assign(Object.assign({}, (opts !== null && opts !== void 0 ? opts : {})), { tableFor: (opts === null || opts === void 0 ? void 0 : opts.tableFor) ? [...workerActionTableFor, ...opts.tableFor] : workerActionTableFor, name: ((_a = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _a !== void 0 ? _a : '') + ('(W/' + (isMainThread ? 'main)' : threadId + '?)')), debug: opts === null || opts === void 0 ? void 0 : opts.debug, log: isMainThread ?
            opts === null || opts === void 0 ? void 0 : opts.log :
            (...args) => mainPort === null || mainPort === void 0 ? void 0 : mainPort.postMessage({
                type: 'log',
                p: args.map(arg => {
                    const type = typeof arg;
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                    return type === 'string' ? arg : inspect(arg, inspectOptions);
                })
            }), 
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        debugExcludeTypes: ['log', 'warn', 'wait', 'stopWaiting', ...((_b = opts === null || opts === void 0 ? void 0 : opts.debugExcludeTypes) !== null && _b !== void 0 ? _b : [])], debugIncludeTypes: opts === null || opts === void 0 ? void 0 : opts.debugIncludeTypes }));
    const { r, s, table } = comp;
    // eslint-disable-next-line no-console
    applySharedReactors(isMainThread, comp, (_c = opts === null || opts === void 0 ? void 0 : opts.log) !== null && _c !== void 0 ? _c : console.log);
    r('inited -> main worker message port listener', s.pt.inited.pipe(rx.filter(([, , , port]) => port != null), rx.switchMap(([, , , port]) => new rx.Observable(() => {
        function handler(event) {
            const act = event;
            deserializeAction2(act, s);
        }
        port.on('message', handler);
        return () => {
            port.close();
            port.off('message', handler);
        };
    }))));
    r('-> inited', new rx.Observable(() => {
        const handler = (event) => {
            var _a;
            const msg = event;
            if (msg.type === 'ASSIGN_WORKER_NO') {
                mainPort = msg.mainPort;
                mainPort.postMessage({ type: 'WORKER_READY' });
                const workerNo = msg.workerNo;
                const logPrefix = ((_a = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _a !== void 0 ? _a : '') + '(W/' + workerNo + ')';
                s.ft.inited(workerNo, logPrefix, mainPort).dp();
                comp.s.setName(logPrefix);
            }
        };
        if (parentPort) {
            /* eslint-disable no-restricted-globals */
            parentPort.on('message', handler);
        }
        else {
            s.ft.inited('main', '[main]', null).dp();
        }
        return () => parentPort === null || parentPort === void 0 ? void 0 : parentPort.off('message', handler);
    }));
    r('"fork" -> mainPort.postMessage, forkByBroker', s.pt.fork.pipe(rx.switchMap(a => table.l.inited.pipe(rx.map(b => [a, b]), rx.take(1))), rx.mergeMap(([[m, forkActionName, ...forkActionParams], [, , , mainPort]]) => {
        const wrappedAct = s.createAction(forkActionName, forkActionParams);
        const chan = new MessageChannel();
        const error$ = rx.fromEventPattern(h => chan.port1.addListener('messageerror', h), h => chan.port1.removeListener('messageerror', h));
        const close$ = rx.fromEventPattern(h => chan.port1.on('close', h), h => chan.port1.off('close', h));
        return rx.merge(rx.fromEventPattern(h => chan.port1.on('message', h), h => {
            chan.port1.off('message', h);
            chan.port1.close();
        }).pipe(rx.map(event => {
            s.ft.onForkReturn(event).dp();
        }), rx.take(1), rx.takeUntil(rx.merge(error$, close$))), error$.pipe(rx.tap(err => comp.dispatchErrorFor(err, wrappedAct))), s.pt.onForkReturn.pipe(rx.map(([, retAction]) => retAction), actionRelatedToAction(wrappedAct), rx.tap(retAction => {
            const replyFork = s.createAction(retAction.t, retAction.p);
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
// eslint-disable-next-line space-before-function-paren
export function createWorkerControlOfFn(recursiveFuncs, opts) {
    const ctl = createWorkerControl(opts).reactivize(recursiveFuncs);
    return ctl;
}
//# sourceMappingURL=node-worker.js.map