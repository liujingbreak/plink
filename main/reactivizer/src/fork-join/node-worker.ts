import {inspect} from 'node:util';
import type {promises as fsPromises} from 'node:fs';
import type {X509Certificate} from 'node:crypto';
import type {Blob} from 'node:buffer';
import {parentPort, MessageChannel, threadId, isMainThread, MessagePort} from 'worker_threads';
import * as rx from 'rxjs';
import {Action, serializeAction, ActionFunctions} from '../control';
import {deserializeAction2, actionRelatedToAction, nameOfAction} from '..';
import {ReactorComposite2} from '../reactor-composite';
import {ReactorCompositeOpt} from '../epic';
import {InferFuncReturnEvents, ActionFactoryOfPlainType} from '../inferred-types';
import {ForkWorkerInput, ForkWorkerOutput, workerInputTableFor as inputTableFor,
  workerOutputTableFor as outputTableFor, WorkerControl} from './types';
import {applySharedReactors} from './worker-common';

export {setIdleDuring} from './common';
export {WorkerControl} from './types';

/**
 * @param opts.log if value is `undefined` and current createWorkerControl() is for creating instance in a forked thread, by default log messages will
 * be transfered to main worker thread, but message will be trimmed by `util.inspect(..., {depth: 1, showHidden: false})`.
 */
export function createWorkerControl<
  I = Record<string, never>,
  O = Record<string, never>,
  LI extends ReadonlyArray<keyof I> = readonly [],
  LO extends ReadonlyArray<keyof O> = readonly []
>(
  opts?: ReactorCompositeOpt<ForkWorkerInput & ForkWorkerOutput & I, ForkWorkerOutput & O>
) {
  let mainPort: MessagePort | undefined; // parent thread port
  // eslint-disable-next-line @typescript-eslint/ban-types
  const comp = new ReactorComposite2<ForkWorkerInput, ForkWorkerOutput, typeof inputTableFor, typeof outputTableFor>({
    ...(opts ?? {}),
    inputTableFor: [...(opts?.inputTableFor ?? []), ...inputTableFor],
    outputTableFor: [...(opts?.outputTableFor ?? []), ...outputTableFor],
    name: (opts?.name ?? '') + ('(W/' + (isMainThread ? 'main)' : threadId + '?)')),
    debug: opts?.debug,
    log: isMainThread ?
      opts?.log :
      (...args) => mainPort?.postMessage({
        type: 'log',
        p: args.map(arg => {
          const type = typeof arg;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return type === 'string' ? arg : inspect(arg, {depth: 0, showHidden: false, compact: true, maxStringLength: 20});
        })}),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    debugExcludeTypes: ['log', 'warn', 'wait', 'stopWaiting', ...(opts?.debugExcludeTypes ?? [] as any)],
    debugIncludeTypes: opts?.debugIncludeTypes as any[]
    // logStyle: 'noParam'
  });

  const {r, i, o, outputTable} = comp;

  r('-> workerInited', new rx.Observable(() => {
    const handler = (event: {type?: string; workerNo: number; mainPort: MessagePort}) => {
      const msg = event;
      if (msg.type === 'ASSIGN_WORKER_NO') {
        msg.mainPort.postMessage({type: 'WORKER_READY'});
        mainPort = msg.mainPort;
        const workerNo = msg.workerNo;
        const logPrefix = (opts?.name ?? '') + '(W/' + workerNo + ')';
        o.ft.workerInited(workerNo, logPrefix, msg.mainPort).dp();
        comp.setName(logPrefix);
      }
    };
    if (parentPort) {
      /* eslint-disable no-restricted-globals */
      parentPort.on('message', handler);
    } else {
      o.ft.workerInited('main', '[main]', null).dp();
    }
    return () => parentPort?.off('message', handler);
  }));

  r('workerInited -> main worker message port listener', o.pt.workerInited.pipe(
    rx.filter(([, , , port]) => port != null),
    rx.switchMap(([, , , port]) => new rx.Observable(() => {
      function handler(event: unknown) {
        const act = event as Action<any>;
        deserializeAction2(act, i);
        // o.ft.log('message action.p=', act.p[0]).dp();
      }
      (port as MessagePort).on('message', handler);
      return () => {
        (port as MessagePort).close();
        (port as MessagePort).off('message', handler);
      };
    }))
  ));

  // eslint-disable-next-line no-console
  applySharedReactors(isMainThread, comp, opts?.log ?? console.log);

  r('"fork" -> mainPort.postMessage, forkByBroker', o.pt.fork.pipe(
    rx.switchMap(a => outputTable.l.workerInited.pipe(rx.map(b => [a, b] as const), rx.take(1))),
    rx.mergeMap(([[m, forkActionName, ...forkActionParams], [, , , mainPort]]) => {
      const wrappedAct = o.createAction(forkActionName as keyof ForkWorkerOutput, forkActionParams);
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
          rx.map(event => deserializeAction2(event, i)),
          rx.take(1),
          rx.takeUntil(rx.merge(error$, close$))
        ),
        error$.pipe(
          rx.tap(err => o.ft._onErrorFor(err).dp(wrappedAct))
        ),
        i.action$.pipe(
          actionRelatedToAction(wrappedAct),
          rx.tap(retAction => {
            const replyFork = i.createAction(
              nameOfAction(retAction) as keyof ForkWorkerInput,
              retAction.p
            );
            replyFork.r = m.i;
            i.actionUpstream.next(replyFork);
          }),
          rx.take(1)
        ),
        new rx.Observable<void>(_sub => {
          if (mainPort) {
            const forkByBroker = o.createAction('forkByBroker', [wrappedAct, chan.port2]);
            mainPort.postMessage(serializeAction(forkByBroker), [chan.port2]);
          } else {
            o.ft.forkByBroker(wrappedAct, chan.port2).dp(m);
          }
        })
      );
    })
  ));

  return comp as unknown as WorkerControl<I, O, LI, LO>;
}

export type ForkTransferablePayload<T = unknown> = {
  content: T;
  transferList: (ArrayBuffer | MessagePort | fsPromises.FileHandle | X509Certificate | Blob)[];
};

export function createWorkerControlOfFn<F extends ActionFunctions>(
  recursiveFuncs: F,
  opts?: ReactorCompositeOpt<any, any>) {
  const ctl = createWorkerControl(opts).reativizeRecursiveFuncs(recursiveFuncs);
  return ctl as WorkerControl<InferFuncReturnEvents<F> & ActionFactoryOfPlainType<F>, InferFuncReturnEvents<F>>;
}
