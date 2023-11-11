import type {promises as fsPromises} from 'node:fs';
import type {X509Certificate} from 'node:crypto';
import type {Blob} from 'node:buffer';
import {parentPort, MessageChannel as NodeMessagechannel, threadId, isMainThread, MessagePort} from 'worker_threads';
import * as rx from 'rxjs';
import {Action, ActionFunctions, deserializeAction, serializeAction, RxController,
  actionRelatedToAction, InferPayload, actionRelatedToPayload} from './control';
import {ReactorComposite} from './epic';
import {Broker, ForkWorkerInput, ForkWorkerOutput} from './types';
import {DuplexOptions} from './duplex';
// import {createBroker} from './node-worker-broker';

export function createWorkerControl<I extends ActionFunctions = Record<string, never>>(
  opts?: DuplexOptions<ForkWorkerInput & ForkWorkerOutput>
): Promise<ReactorComposite<ForkWorkerInput & I, ForkWorkerOutput>> {
  const inputTableFor = ['exit'] as const;
  const outputTableFor = ['log', 'warn'] as const;
  // eslint-disable-next-line @typescript-eslint/ban-types
  const comp = new ReactorComposite<ForkWorkerInput, ForkWorkerOutput, typeof inputTableFor, typeof outputTableFor>({
    ...(opts ?? {}),
    inputTableFor,
    outputTableFor,
    name: ('[Thread:' + (isMainThread ? 'main]' : threadId + ']')),
    debug: opts?.debug,
    log: isMainThread ? opts?.log : (...args) => parentPort?.postMessage({type: 'log', p: args}),
    debugExcludeTypes: ['log', 'warn'],
    logStyle: 'noParam'
  });
  let broker: Broker | undefined;

  const [workerNo$, actionMsg$, dispatchStop$] = parentPort ?
    initWorker() :
    [rx.of('main') as rx.Observable<string | number>, rx.EMPTY as rx.Observable<Action<any>>, new rx.Subject<void>()] as const;

  return rx.firstValueFrom(workerNo$.pipe(
    rx.map(workerNo => {
      const logPrefix = '[Worker:' + (!parentPort ? 'main]' : workerNo + ']');
      const {r, i, o} = comp;
      const latest = comp.inputTable;
      const lo = comp.outputTable.l;

      if (parentPort) {
        r('exit', latest.l.exit.pipe(
          rx.map(() => {
            comp.destory();
            dispatchStop$.next();
          })
        ));

        r('postMessage wait, stopWaiting, returned message to broker', rx.merge(
          o.at.wait,
          o.at.stopWaiting,
          o.at.returned
        ).pipe(
          rx.map(action => {
            parentPort?.postMessage(serializeAction(action));
          })
        ));

        r('postMessage log to broker (parent thread)', lo.log.pipe(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          rx.map(([, ...p]) => parentPort?.postMessage({type: 'log', p: [logPrefix, ...p]}))
        ));
      } else {
        // main thread
        r('log, warn > console.log', rx.merge(lo.log, lo.warn).pipe(
          // eslint-disable-next-line no-console
          rx.map(([, ...p]) => (opts?.log ?? console.log)(logPrefix, ...p))
        ));
      }
      r('On output "fork" request message', o.at.fork.pipe(
        rx.mergeMap(act => {
          const {p: [wrappedAct]} = act;
          const chan = new NodeMessagechannel();
          const error$ = rx.fromEventPattern(
            h => chan.port1.on('messageerror', h),
            h => chan.port1.off('messageerror', h)
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
              rx.map(event => deserializeAction(event, i)),
              rx.take(1),
              rx.takeUntil(rx.merge(error$, close$))
            ),
            new rx.Observable<void>(_sub => {
              if (parentPort) {
                const forkByBroker = o.createAction('forkByBroker', wrappedAct, chan.port2);
                parentPort.postMessage(serializeAction(forkByBroker), [chan.port2]);
              } else {
                o.dp.forkByBroker(wrappedAct, chan.port2);
              }
            })
          );
        })
      ));

      r('onFork -> wait for fork action returns, postMessage to forking parent thread', i.pt.onFork.pipe(
        rx.mergeMap(([, origAct, port]) => {
          const origId = origAct.i;
          deserializeAction(origAct, i);
          return o.core.action$.pipe(
            actionRelatedToAction(origId),
            rx.take(1),
            rx.map(action => {
              const {p} = action;
              if (hasReturnTransferable(p)) {
                const [{transferList}] = p;
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                (p[0] as any).transferList = null;
                port.postMessage(serializeAction(action), transferList);
              } else {
                port.postMessage(serializeAction(action));
              }
              o.dp.returned();
            })
          );
        })
      ));

      r('Pass error to broker', comp.error$.pipe(
        rx.map(([label, err]) => {
          if (parentPort) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            parentPort.postMessage({error: {label, detail: err}});
          } else if (broker) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            broker.o.dp.onWorkerError(-1, {label, detail: err});
          }
        })
      ));

      actionMsg$.pipe(
        rx.tap(action => deserializeAction(action, i)),
        rx.takeUntil(dispatchStop$)
      ).subscribe();
      return comp as unknown as ReactorComposite<ForkWorkerInput & I, ForkWorkerOutput>;
    })
  ));
}

function initWorker() {
  const workerNo$ = new rx.ReplaySubject<string | number>(1);
  const actionMsg$ = new rx.ReplaySubject<Action<any>>(5);
  const stop$ = new rx.Subject<void>();

  const handler = (event: {type?: string; data: number}) => {
    const msg = event;
    if (msg.type === 'ASSIGN_WORKER_NO') {
      parentPort!.postMessage({type: 'WORKER_READY'});
      workerNo$.next(msg.data);
    } else {
      const act = event as unknown as Action<any>;
      actionMsg$.next(act);
    }
  };
  /* eslint-disable no-restricted-globals */
  parentPort!.on('message', handler);
  stop$.pipe(
    rx.map(() => self.removeEventListener('message', handler)),
    rx.take(1)
  ).subscribe();

  return [workerNo$.asObservable(), actionMsg$.asObservable(), stop$] as const;
}

export function fork< I extends ActionFunctions, O extends ForkWorkerOutput, K extends string & keyof I, R extends keyof I = `${K}Resolved`>(
  comp: ReactorComposite<I, O>,
  actionName: K & string, params: InferPayload<I[K]>,
  resActionType?: R
): Promise<InferPayload<I[R]>[0]> {
  const forkedAction = comp.o.createAction(actionName, ...params);
  const forkDone = rx.firstValueFrom(comp.i.pt[(resActionType ?? (actionName + 'Resolved')) as keyof I].pipe(
    actionRelatedToPayload(forkedAction.i),
    rx.map(([, res]) => res)
  ));
  (comp.o as unknown as RxController<ForkWorkerOutput>).dp.fork(forkedAction);
  return forkDone;
}

export type ForkTransferablePayload<T = unknown> = {
  content: T;
  transferList: (ArrayBuffer | MessagePort | fsPromises.FileHandle | X509Certificate | Blob)[];
};

function hasReturnTransferable(payload: Action<any>['p']): payload is [ForkTransferablePayload, ...unknown[]] {
  return Array.isArray((payload[0] as ForkTransferablePayload | undefined)?.transferList);
}
