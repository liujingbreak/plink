/* eslint-disable no-restricted-globals */
import * as rx from 'rxjs';
import {Action, ActionFunctions, serializeAction} from '../control';
import {SimplexReactor} from '../simplex-reactor';
import {deserializeAction2, actionRelatedToAction, nameOfAction} from '..';
import {InferFuncReturnEvents, ActionFactoryOfPlainType, SimplexReactorMergeOptions} from '../inferred-types';
import {SimplexReactorOptions} from '../reactor-base';
import {ForkWorkerInput, ForkWorkerOutput, WorkerControl, workerActionTableFor} from './types';
import {applySharedReactors} from './worker-common';

export {setIdleDuring} from './common';
export {WorkerControl} from './types';
// import {createBroker} from './node-worker-broker';

export function createWorkerControl<
  I = Record<string, never>,
  LI extends ReadonlyArray<keyof I> = readonly []
>(
  isInWorker: boolean,
  opts?: SimplexReactorMergeOptions<SimplexReactor<ForkWorkerInput & ForkWorkerOutput, typeof workerActionTableFor>, SimplexReactor<I, LI>>
) {
  let mainPort: MessagePort | undefined; // Broker's message port
  const comp = new SimplexReactor<ForkWorkerInput & ForkWorkerOutput, typeof workerActionTableFor>({
    ...(opts ?? {}),
    tableFor: workerActionTableFor,
    name: 'unknown worker No',
    debug: opts?.debug,
    log: !isInWorker ? opts?.log : (...args) => mainPort?.postMessage({type: 'log', p: args}),
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    debugExcludeTypes: ['log', 'warn', 'wait', 'stopWaiting', ...(opts?.debugExcludeTypes ?? [] as any)],
    debugIncludeTypes: opts?.debugIncludeTypes as any[]
  });
  const {r, s, table} = comp;
  // eslint-disable-next-line no-console
  applySharedReactors(!isInWorker, comp, opts?.log ?? console.log);

  r('inited -> main worker message port listener', s.pt.inited.pipe(
    rx.filter(([, , , port]) => port != null),
    rx.switchMap(([, , , port]) => new rx.Observable(() => {
      function handler(event: MessageEvent) {
        const act = event.data as Action<any>;
        deserializeAction2(act, s);
      }
      (port as MessagePort).addEventListener('message', handler);
      return () => {
        (port as MessagePort).close();
        (port as MessagePort).removeEventListener('message', handler);
      };
    }))
  ));
  r('-> inited', new rx.Observable(() => {
    const handler = (event: MessageEvent<{type?: string; workerNo: number; mainPort: MessagePort}>) => {
      const msg = event.data;
      if (msg.type === 'ASSIGN_WORKER_NO') {
        mainPort = msg.mainPort;
        mainPort.postMessage({type: 'WORKER_READY'});
        const workerNo = msg.workerNo;
        const logPrefix = (opts?.name ?? '') + '(W/' + workerNo + ')';
        s.ft.inited(workerNo, logPrefix, mainPort).dp();
        comp.s.setName(logPrefix);
      }
    };
    if (isInWorker) {
      /* eslint-disable no-restricted-globals */
      addEventListener('message', handler);
    } else {
      s.ft.inited('main', '[main]', null).dp();
    }
    return () => self.removeEventListener('message', handler);
  }));

  r('"fork" -> forkByBroker', s.pt.fork.pipe(
    rx.switchMap(a => table.l.inited.pipe(rx.map(b => [a, b] as const), rx.take(1))),
    rx.mergeMap(([[m, forkActionName, ...forkActionParams], [, , , mainPort]]) => {
      const wrappedAct = s.createAction(forkActionName as keyof ForkWorkerOutput, forkActionParams);
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
          rx.map(event => {
            s.ft.onForkReturn(event as Action<any>).dp();
          }),
          rx.take(1),
          rx.takeUntil(error$)
        ),
        error$.pipe(
          rx.tap(err => comp.dispatchErrorFor(err, wrappedAct))
        ),
        s.pt.onForkReturn.pipe(
          rx.map(([, retAction]) => retAction),
          actionRelatedToAction(wrappedAct),
          rx.tap(retAction => {
            const replyFork = s.createAction(
              nameOfAction(retAction) as keyof ForkWorkerInput,
              retAction.p as any
            );
            replyFork.r = m.i; // the original action is related to `wrappedAct`, now it is related to "fork" action
            s.actionUpstream.next(replyFork);
          }),
          rx.take(1)
        ),
        new rx.Observable<void>(_sub => {
          if (mainPort) {
            const forkByBroker = s.createAction('forkByBroker', [wrappedAct, chan.port2]);
            (mainPort as MessagePort).postMessage(serializeAction(forkByBroker), [chan.port2]);
          } else {
            s.ft.forkByBroker(wrappedAct, chan.port2).dp(m);
          }
        })
      );
    })
  ));

  return comp as unknown as WorkerControl<I, LI>;
}

export type WebForkTransferablePayload<T = unknown> = {
  content: T;
  transferList: (ArrayBuffer | MessagePort)[];
};

export function createWorkerControlOfFn<F extends ActionFunctions>(
  recursiveFuncs: F,
  isInWorker: boolean,
  opts?: SimplexReactorOptions<any, any>) {
  const ctl = createWorkerControl(isInWorker, opts).reactivize(recursiveFuncs);
  return ctl as WorkerControl<InferFuncReturnEvents<F> & ActionFactoryOfPlainType<F> & InferFuncReturnEvents<F>>;
}

