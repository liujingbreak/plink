/* eslint-disable no-restricted-globals */
import * as rx from 'rxjs';
import {Action, ActionFunctions, deserializeAction, serializeAction, RxController,
  actionRelatedToAction, InferPayload, actionRelatedToPayload} from './control';
import {ReactorComposite, InferFuncReturnEvents} from './epic';
import {Broker, ForkWorkerInput, ForkWorkerOutput} from './types';
import {DuplexOptions} from './duplex';
// import {createBroker} from './node-worker-broker';

export function createWorkerControl<I extends ActionFunctions = Record<string, never>>(isInWorker: boolean, opts?: DuplexOptions<ForkWorkerInput & ForkWorkerOutput>) {
  const inputTableFor = ['exit'] as const;
  const outputTableFor = ['log', 'warn'] as const;
  let broker: Broker | undefined;

  const [workerNo$, actionMsg$, dispatchStop$] = isInWorker ?
    initWorker() :
    [rx.of('main') as rx.Observable<string | number>, rx.EMPTY as rx.Observable<Action<any>>, new rx.Subject<void>()] as const;

  return workerNo$.pipe(
    rx.map(workerNo => {
      const logPrefix = '[Worker:' + (!isInWorker ? 'main]' : workerNo + ']');
      const comp = new ReactorComposite<ForkWorkerInput, ForkWorkerOutput, typeof inputTableFor, typeof outputTableFor>({
        ...opts,
        name: logPrefix,
        inputTableFor,
        outputTableFor,
        debug: opts?.debug,
        log: !isInWorker ? opts?.log : (...args) => self.postMessage({type: 'log', p: args}),
        debugExcludeTypes: ['log', 'warn'],
        logStyle: 'noParam'
      });
      const {r, i, o} = comp;
      const latest = comp.inputTable;
      const lo = comp.outputTable.l;

      if (isInWorker) {
        r('exit', latest.l.exit.pipe(
          rx.map(() => {
            comp.destory();
            dispatchStop$.next();
          })
        ));

        r('Pass worker wait and awake message to broker', rx.merge(
          o.at.wait,
          o.at.stopWaiting,
          o.at.returned
        ).pipe(
          rx.map(action => {
            self.postMessage(serializeAction(action));
          })
        ));

        r(lo.log.pipe(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          rx.map(([, ...p]) => postMessage({type: 'log', p: [logPrefix, ...p]}))
        ));
      } else {
        r(rx.merge(lo.log, lo.warn).pipe(
          // eslint-disable-next-line no-console
          rx.map(([, ...p]) => (opts?.log ?? console.log)(logPrefix, ...p))
        ));
      }
      r('On output "fork" request message', o.at.fork.pipe(
        rx.mergeMap(act => {
          const {p: [wrappedAct]} = act;
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
              rx.map(event => deserializeAction(event, i)),
              rx.take(1),
              rx.takeUntil(rx.merge(error$, error$))
            ),
            new rx.Observable<void>(_sub => {
              if (isInWorker) {
                const forkByBroker = o.createAction('forkByBroker', wrappedAct, chan.port2);
                postMessage(serializeAction(forkByBroker), '*', [chan.port2]);
              } else {
                o.dp.forkByBroker(wrappedAct, chan.port2);
              }
            })
          );
        })
      ));

      r('On recieving "being forked" message, wait for fork action returns', i.pt.onFork.pipe(
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
                (port as MessagePort).postMessage(serializeAction(action), transferList);
              } else {
                (port as MessagePort).postMessage(serializeAction(action));
              }
              o.dp.returned();
            })
          );
        })
      ));

      r('Pass error to broker', comp.error$.pipe(
        rx.map(([label, err]) => {
          if (isInWorker) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            self.postMessage({error: {label, detail: err}});
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
  );
}

function initWorker() {
  const workerNo$ = new rx.ReplaySubject<string | number>(1);
  const actionMsg$ = new rx.ReplaySubject<Action<any>>(5);
  const stop$ = new rx.Subject<void>();

  const handler = (event: MessageEvent<{type?: string; data: number}>) => {
    const msg = event.data;
    if (msg.type === 'ASSIGN_WORKER_NO') {
      self.postMessage({type: 'WORKER_READY'});
      workerNo$.next(msg.data);
    } else {
      const act = event as unknown as Action<any>;
      actionMsg$.next(act);
    }
  };
  /* eslint-disable no-restricted-globals */
  addEventListener('message', handler);
  stop$.pipe(
    rx.map(() => self.removeEventListener('message', handler)),
    rx.take(1)
  ).subscribe();

  return [workerNo$.asObservable(), actionMsg$.asObservable(), stop$] as const;
}

export function reativizeRecursiveFuncs<
  I extends ActionFunctions,
  O extends ActionFunctions,
  LI extends ReadonlyArray<keyof I>,
  LO extends ReadonlyArray<keyof O>,
  // eslint-disable-next-line space-before-function-paren
  F extends {[s: string]: (...a: any[]) => any}
>(comp: ReactorComposite<I, O, LI, LO>, fObject: F) {
  comp.reactivize(fObject);
  return comp as unknown as ReactorComposite< InferFuncReturnEvents<F> & I & F, InferFuncReturnEvents<F> & O, LI, LO >;
}

export function fork< I extends ActionFunctions, O extends ForkWorkerOutput, K extends string & keyof I, R extends keyof I = `${K}Resolved`>(
  comp: ReactorComposite<I, O>,
  actionType: K & string, params: InferPayload<I[K]>,
  resActionType?: R
): Promise<InferPayload<I[R]>[0]> {
  const forkedAction = comp.o.createAction(actionType, ...params);
  const forkDone = rx.firstValueFrom(comp.i.pt[(resActionType ?? (actionType + 'Resolved')) as keyof I].pipe(
    actionRelatedToPayload(forkedAction.i),
    rx.map(([, res]) => res)
  ));
  (comp.o as unknown as RxController<ForkWorkerOutput>).dp.fork(forkedAction);
  return forkDone;
}

export type WebForkTransferablePayload<T = unknown> = {
  content: T;
  transferList: (ArrayBuffer | MessagePort)[];
};

function hasReturnTransferable(payload: Action<any>['p']): payload is [WebForkTransferablePayload, ...unknown[]] {
  return Array.isArray((payload[0] as WebForkTransferablePayload | undefined)?.transferList);
}
