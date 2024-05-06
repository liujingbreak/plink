import { inspect } from 'node:util';
import { parentPort, MessageChannel, threadId, isMainThread } from 'worker_threads';
import * as rx from 'rxjs';
import { serializeAction } from '../control';
import { deserializeAction2, actionRelatedToAction, nameOfAction } from '..';
import { ReactorComposite2 } from '../reactor-composite';
import { workerInputTableFor as inputTableFor, workerOutputTableFor as outputTableFor } from './types';
import { applySharedReactors } from './worker-common';
export { setIdleDuring } from './common';
/**
 * @param opts.log if value is `undefined` and current createWorkerControl() is for creating instance in a forked thread, by default log messages will
 * be transfered to main worker thread, but message will be trimmed by `util.inspect(..., {depth: 1, showHidden: false})`.
 */
export function createWorkerControl(opts) {
    var _a, _b, _c, _d, _e;
    let mainPort; // parent thread port
    // eslint-disable-next-line @typescript-eslint/ban-types
    const comp = new ReactorComposite2(Object.assign(Object.assign({}, (opts !== null && opts !== void 0 ? opts : {})), { inputTableFor: [...((_a = opts === null || opts === void 0 ? void 0 : opts.inputTableFor) !== null && _a !== void 0 ? _a : []), ...inputTableFor], outputTableFor: [...((_b = opts === null || opts === void 0 ? void 0 : opts.outputTableFor) !== null && _b !== void 0 ? _b : []), ...outputTableFor], name: ((_c = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _c !== void 0 ? _c : '') + ('(W/' + (isMainThread ? 'main)' : threadId + '?)')), debug: opts === null || opts === void 0 ? void 0 : opts.debug, log: isMainThread ?
            opts === null || opts === void 0 ? void 0 : opts.log :
            (...args) => mainPort === null || mainPort === void 0 ? void 0 : mainPort.postMessage({
                type: 'log',
                p: args.map(arg => {
                    const type = typeof arg;
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                    return type === 'string' ? arg : inspect(arg, { depth: 0, showHidden: false, compact: true, maxStringLength: 20 });
                })
            }), 
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        debugExcludeTypes: ['log', 'warn', 'wait', 'stopWaiting', ...((_d = opts === null || opts === void 0 ? void 0 : opts.debugExcludeTypes) !== null && _d !== void 0 ? _d : [])], debugIncludeTypes: opts === null || opts === void 0 ? void 0 : opts.debugIncludeTypes }));
    const { r, i, o, outputTable } = comp;
    r('-> workerInited', new rx.Observable(() => {
        const handler = (event) => {
            var _a;
            const msg = event;
            if (msg.type === 'ASSIGN_WORKER_NO') {
                msg.mainPort.postMessage({ type: 'WORKER_READY' });
                mainPort = msg.mainPort;
                const workerNo = msg.workerNo;
                const logPrefix = ((_a = opts === null || opts === void 0 ? void 0 : opts.name) !== null && _a !== void 0 ? _a : '') + '(W/' + workerNo + ')';
                o.ft.workerInited(workerNo, logPrefix, msg.mainPort).dp();
                comp.setName(logPrefix);
            }
        };
        if (parentPort) {
            /* eslint-disable no-restricted-globals */
            parentPort.on('message', handler);
        }
        else {
            o.ft.workerInited('main', '[main]', null).dp();
        }
        return () => parentPort === null || parentPort === void 0 ? void 0 : parentPort.off('message', handler);
    }));
    r('workerInited -> main worker message port listener', o.pt.workerInited.pipe(rx.filter(([, , , port]) => port != null), rx.switchMap(([, , , port]) => new rx.Observable(() => {
        function handler(event) {
            const act = event;
            deserializeAction2(act, i);
            // o.ft.log('message action.p=', act.p[0]).dp();
        }
        port.on('message', handler);
        return () => {
            port.close();
            port.off('message', handler);
        };
    }))));
    // eslint-disable-next-line no-console
    applySharedReactors(isMainThread, comp, (_e = opts === null || opts === void 0 ? void 0 : opts.log) !== null && _e !== void 0 ? _e : console.log);
    r('"fork" -> mainPort.postMessage, forkByBroker', o.pt.fork.pipe(rx.switchMap(a => outputTable.l.workerInited.pipe(rx.map(b => [a, b]), rx.take(1))), rx.mergeMap(([[m, forkActionName, ...forkActionParams], [, , , mainPort]]) => {
        const wrappedAct = o.createAction(forkActionName, forkActionParams);
        const chan = new MessageChannel();
        const error$ = rx.fromEventPattern(h => chan.port1.addListener('messageerror', h), h => chan.port1.removeListener('messageerror', h));
        const close$ = rx.fromEventPattern(h => chan.port1.on('close', h), h => chan.port1.off('close', h));
        return rx.merge(rx.fromEventPattern(h => chan.port1.on('message', h), h => {
            chan.port1.off('message', h);
            chan.port1.close();
        }).pipe(rx.map(event => deserializeAction2(event, i)), rx.take(1), rx.takeUntil(rx.merge(error$, close$))), error$.pipe(rx.tap(err => o.ft._onErrorFor(err).dp(wrappedAct))), i.action$.pipe(actionRelatedToAction(wrappedAct), rx.tap(retAction => {
            const replyFork = i.createAction(nameOfAction(retAction), retAction.p);
            replyFork.r = m.i;
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
export function createWorkerControlOfFn(recursiveFuncs, opts) {
    const ctl = createWorkerControl(opts).reativizeRecursiveFuncs(recursiveFuncs);
    return ctl;
}
//# sourceMappingURL=node-worker.js.map