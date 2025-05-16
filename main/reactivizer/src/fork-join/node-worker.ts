import {inspect} from 'node:util';
import type {promises as fsPromises} from 'node:fs';
import type {X509Certificate} from 'node:crypto';
import type {Blob} from 'node:buffer';
import {parentPort, MessageChannel, threadId, isMainThread, MessagePort} from 'worker_threads';
import * as rx from 'rxjs';
import {Action, serializeAction, ActionFunctions} from '../control';
import {deserializeAction2, actionRelatedToAction} from '..';
import {SimplexReactor} from '../simplex-reactor';
import {InferFuncReturnEvents, ActionFactoryOfPlainType} from '../inferred-types';
import {SimplexReactorCfgOpts} from '../reactor-base';
import {ForkWorkerInput, ForkWorkerOutput, WorkerControl, workerActionTableFor} from './types';
import {applySharedReactors} from './worker-common';

export {setIdleDuring} from './common';
export {WorkerControl} from './types';

const inspectOptions = {depth: 0, showHidden: false, compact: true, maxStringLength: 20};
/**
 * @param opts.log if value is `undefined` and current createWorkerControl() is for creating instance in a forked thread, by default log messages will
 * be transfered to main worker thread, but message will be trimmed by `util.inspect(..., {depth: 1, showHidden: false})`.
 */
export function createWorkerControl<
  I = Record<string, never>,
  LI extends readonly (keyof I)[] = readonly []
>(
  opts?: SimplexReactorCfgOpts<ForkWorkerInput & ForkWorkerOutput, I, LI>
) {
  let mainPort: MessagePort | undefined; // Broker's message port
  const comp = new SimplexReactor<ForkWorkerInput & ForkWorkerOutput, typeof workerActionTableFor>({
    ...(opts ?? {}),
    tableFor: opts?.tableFor ? [...workerActionTableFor, ...opts.tableFor] as unknown as typeof workerActionTableFor : workerActionTableFor,
    name: (opts?.name ?? '') + ('(W/' + (isMainThread ? 'main)' : threadId + '?)')),
    enableLog: opts?.enableLog,
    log: isMainThread ?
      opts?.log :
        (...args) => mainPort?.postMessage({
          type: 'log',
          p: args.map(arg => {
            const type = typeof arg;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            return type === 'string' ? arg : inspect(arg, inspectOptions);
          })}),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    debugExcludeTypes: ['log', 'warn', 'wait', 'stopWaiting', ...(opts?.debugExcludeTypes ?? [] as any)],
    debugIncludeTypes: opts?.debugIncludeTypes as any[]
  });
  const {r, s, table} = comp;
  // eslint-disable-next-line no-console
  applySharedReactors(isMainThread, comp, opts?.log ?? console.log);

  r('inited -> main worker message port listener', s.pt.inited.pipe(
    rx.filter(([, , , port]) => port != null),
    rx.switchMap(([, , , port]) => new rx.Observable(() => {
      function handler(event: unknown) {
        const act = event as Action<any>;
        deserializeAction2(act, s);
      }
      (port as MessagePort).on('message', handler);
      return () => {
        (port as MessagePort).close();
        (port as MessagePort).off('message', handler);
      };
    }))
  ));
  r('-> inited', new rx.Observable(() => {
    const handler = (event: {type?: string; workerNo: number; mainPort: MessagePort}) => {
      const msg = event;
      if (msg.type === 'ASSIGN_WORKER_NO') {
        mainPort = msg.mainPort;
        mainPort.postMessage({type: 'WORKER_READY'});
        const workerNo = msg.workerNo;
        const logPrefix = (opts?.name ?? '') + '(W/' + workerNo + ')';
        s.ft.inited(workerNo, logPrefix, mainPort).dp();
        comp.s.setName(logPrefix);
      }
    };
    if (parentPort) {
      parentPort.on('message', handler);
    } else {
      s.ft.inited('main', '[main]', null).dp();
    }
    return () => parentPort?.off('message', handler);
  }));

  r('"fork" -> mainPort.postMessage, forkByBroker', s.pt.fork.pipe(
    rx.switchMap(a => table.l.inited.pipe(rx.map(b => [a, b] as const), rx.take(1))),
    rx.mergeMap(([[m, forkActionName, ...forkActionParams], [, , , mainPort]]) => {
      const wrappedAct = s.createAction(forkActionName as keyof ForkWorkerOutput, forkActionParams);
      const chan = new MessageChannel();
      const error$ = rx.fromEventPattern(
        h => chan.port1.addListener('messageerror', h),
        h => chan.port1.removeListener('messageerror', h)
      );
      const close$ = rx.fromEventPattern(
        h => chan.port1.on('close', h),
        h => chan.port1.off('close', h)
      );
      return rx.merge(
        rx.fromEventPattern(
          h => chan.port1.on('message', h),
          h => {
            chan.port1.off('message', h);
            chan.port1.close();
          }
        ).pipe(
          rx.map(event => {
            s.ft.onForkReturn(event as Action<any>).dp();
          }),
          rx.take(1),
          rx.takeUntil(rx.merge(error$, close$))
        ),
        error$.pipe(
          rx.tap(err => {comp.dispatchErrorFor(err, wrappedAct);})
        ),
        s.pt.onForkReturn.pipe(
          rx.map(([, retAction]) => retAction),
          actionRelatedToAction(wrappedAct),
          rx.tap(retAction => {
            const replyFork = s.createAction(
              retAction.t as keyof ForkWorkerInput,
              retAction.p as any
            );
            replyFork.r = m.i; // the original action is related to `wrappedAct`, now it is related to "fork" action
            s.actionUpstream.next(replyFork);
          }),
          rx.take(1)
        ),
        new rx.Observable<void>(() => {
          if (mainPort) {
            const forkByBroker = s.createAction('forkByBroker', [wrappedAct, chan.port2]);
            mainPort.postMessage(serializeAction(forkByBroker), [chan.port2]);
          } else {
            s.ft.forkByBroker(wrappedAct, chan.port2).dp(m);
          }
        })
      );
    })
  ));

  return comp as unknown as WorkerControl<I, LI>;
}

export interface ForkTransferablePayload<T = unknown> {
  content: T;
  transferList: (ArrayBuffer | MessagePort | fsPromises.FileHandle | X509Certificate | Blob)[];
}

export function createWorkerControlOfFn<F extends ActionFunctions, LI extends (keyof ActionFactoryOfPlainType<F> & InferFuncReturnEvents<F>)[]>(
  recursiveFuncs: F,
  opts?: SimplexReactorCfgOpts<ForkWorkerInput & ForkWorkerOutput, ActionFactoryOfPlainType<F> & InferFuncReturnEvents<F>, LI>
) {
  const ctl = createWorkerControl(opts).reactivize(recursiveFuncs);
  return ctl as WorkerControl<ActionFactoryOfPlainType<F> & InferFuncReturnEvents<F>>;
}
