/* eslint-disable no-restricted-globals */
import * as rx from 'rxjs';
import {Action, ActionFunctions, serializeAction} from '../control';
import {ReactorComposite2, ReactorCompositeOpt, deserializeAction2, actionRelatedToAction, nameOfAction} from '..';
import {InferFuncReturnEvents, ActionFactoryOfPlainType} from '../inferred-types';
import {ForkWorkerInput, ForkWorkerOutput, workerInputTableFor as inputTableFor,
  workerOutputTableFor as outputTableFor, WorkerControl} from './types';
import {applySharedReactors} from './worker-common';

export {setIdleDuring} from './common';
export {WorkerControl} from './types';
// import {createBroker} from './node-worker-broker';

export function createWorkerControl<
  I extends ActionFunctions = Record<string, never>,
  O extends ActionFunctions = Record<string, never>,
  LI extends ReadonlyArray<keyof I> = readonly [],
  LO extends ReadonlyArray<keyof O> = readonly []
>(
  isInWorker: boolean,
  opts?: ReactorCompositeOpt<ForkWorkerInput & ForkWorkerOutput & I, ForkWorkerOutput & O>
) {
  let mainPort: MessagePort | undefined; // parent thread port
  const comp = new ReactorComposite2<ForkWorkerInput, ForkWorkerOutput, typeof inputTableFor, typeof outputTableFor>({
    ...(opts ?? {}),
    inputTableFor: [...(opts?.inputTableFor ?? []), ...inputTableFor],
    outputTableFor: [...(opts?.outputTableFor ?? []), ...outputTableFor],
    name: 'unknown worker No',
    debug: opts?.debug,
    log: !isInWorker ? opts?.log : (...args) => mainPort?.postMessage({type: 'log', p: args}),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    debugExcludeTypes: ['log', 'warn', ...(opts?.debugExcludeTypes ?? [] as any)],
    debugIncludeTypes: opts?.debugIncludeTypes as any[]
  });

  const {r, i, o, outputTable} = comp;

  r('-> workerInited', new rx.Observable(() => {
    const handler = (event: MessageEvent<{type?: string; workerNo: number; mainPort: MessagePort}>) => {
      const msg = event.data;
      if (msg.type === 'ASSIGN_WORKER_NO') {
        msg.mainPort.postMessage({type: 'WORKER_READY'});
        mainPort = msg.mainPort;
        const workerNo = msg.workerNo;
        const logPrefix = (opts?.name ?? '') + '(W/' + workerNo + ')';
        o.ft.workerInited(workerNo, logPrefix, msg.mainPort).dp();
        comp.setName(logPrefix);
      }
    };
    if (isInWorker) {
      /* eslint-disable no-restricted-globals */
      addEventListener('message', handler);
    } else {
      o.ft.workerInited('main', '[main]', null).dp();
    }
    return () => self.removeEventListener('message', handler);
  }));

  r('workerInited -> main worker message port listener', o.pt.workerInited.pipe(
    rx.filter(([, , , port]) => port != null),
    rx.switchMap(([, , , port]) => new rx.Observable(() => {
      function handler(event: MessageEvent) {
        const act = event.data as Action<any>;
        deserializeAction2(act, i);
      }
      (port as MessagePort).addEventListener('message', handler);
      return () => {
        (port as MessagePort).close();
        (port as MessagePort).removeEventListener('message', handler);
      };
    }))
  ));

  // eslint-disable-next-line no-console
  applySharedReactors(!isInWorker, comp, opts?.log ?? console.log);

  r('"fork" -> forkByBroker', o.pt.fork.pipe(
    rx.switchMap(a => outputTable.l.workerInited.pipe(rx.map(b => [a, b] as const), rx.take(1))),
    rx.mergeMap(([[m, forkActionName, ...forkActionParams], [, , , mainPort]]) => {
      const wrappedAct = o.createAction(forkActionName as keyof ForkWorkerOutput, forkActionParams);
      const chan = new MessageChannel();
      const error$ = new rx.Observable<any>(sub => {
        chan.port1.onmessageerror = err => sub.next(err);
        return () => chan.port1.onmessageerror = null;
      });
      return rx.merge(
        new rx.Observable<MessageEvent<any>['data']>(sub => {
          chan.port1.onmessage = msg => sub.next(msg.data);
          return () => chan.port1.onmessage = null;
        }).pipe(
          rx.map(event => deserializeAction2(event, i)),
          rx.take(1),
          rx.takeUntil(rx.merge(error$, error$))
        ),
        error$.pipe(
          rx.tap(err => comp.dispatchErrorFor(err, wrappedAct))
        ),
        i.action$.pipe(
          actionRelatedToAction(wrappedAct),
          rx.tap(retAction => {
            const replyFork = i.createAction(
              nameOfAction(retAction) as keyof ForkWorkerInput,
              retAction.p as any
            );
            replyFork.r = m.i; // the original action is related to `wrappedAct`, now it is related to "fork" action
            i.actionUpstream.next(replyFork);
          }),
          rx.take(1)
        ),
        new rx.Observable<void>(_sub => {
          if (mainPort) {
            const forkByBroker = o.createAction('forkByBroker', [wrappedAct, chan.port2]);
            (mainPort as MessagePort).postMessage(serializeAction(forkByBroker), [chan.port2]);
          } else {
            o.ft.forkByBroker(wrappedAct, chan.port2).dp(m);
          }
        })
      );
    })
  ));

  return comp as unknown as WorkerControl<I, O, LI, LO>;
}

export type WebForkTransferablePayload<T = unknown> = {
  content: T;
  transferList: (ArrayBuffer | MessagePort)[];
};

export function createWorkerControlOfFn<F extends ActionFunctions>(
  recursiveFuncs: F,
  isInWorker: boolean,
  opts?: ReactorCompositeOpt<any, any>) {
  const ctl = createWorkerControl(isInWorker, opts).reativizeRecursiveFuncs(recursiveFuncs);
  return ctl as WorkerControl<InferFuncReturnEvents<F> & ActionFactoryOfPlainType<F>, InferFuncReturnEvents<F>>;
}

