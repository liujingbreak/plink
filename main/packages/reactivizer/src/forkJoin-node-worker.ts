import type {promises as fsPromises} from 'node:fs';
import type {X509Certificate} from 'node:crypto';
import type {Blob} from 'node:buffer';
import {parentPort, MessageChannel as NodeMessagechannel, threadId, isMainThread, MessagePort} from 'worker_threads';
import * as rx from 'rxjs';
import {Action, ActionFunctions, deserializeAction, serializeAction, RxController,
  actionRelatedToAction, InferPayload, actionRelatedToPayload} from './control';
import {ReactorComposite, InferFuncReturnEvents} from './epic';
import {Broker, ForkWorkerInput, ForkWorkerOutput} from './types';
import {DuplexOptions} from './duplex';
// import {createBroker} from './node-worker-broker';

export function createWorkerControl<I extends ActionFunctions | unknown = unknown>(opts?: DuplexOptions<ForkWorkerInput & ForkWorkerOutput>) {
  // eslint-disable-next-line @typescript-eslint/ban-types
  const comp = new ReactorComposite<ForkWorkerInput, ForkWorkerOutput>({
    ...opts,
    debug: opts?.debug ? ('[Thread:' + (isMainThread ? 'main]' : threadId + ']')) : false,
    log: isMainThread ? opts?.log : (...args) => parentPort?.postMessage({type: 'log', p: args}),
    debugExcludeTypes: ['log', 'warn'],
    logStyle: 'noParam'
  });
  let broker: Broker | undefined;

  comp.startAll();
  const {r, i, o} = comp;
  const latest = i.createLatestPayloadsFor('exit');
  const lo = o.createLatestPayloadsFor('log', 'warn');

  const logPrefix = '[Thread:' + (isMainThread ? 'main]' : threadId + ']');
  if (parentPort) {
    const handler = (event: {type?: string; data: number}) => {
      const msg = event;
      if (msg.type === 'ASSIGN_WORKER_NO') {
        parentPort!.postMessage({type: 'WORKER_READY'});
      } else {
        const act = event as unknown as Action<any>;
        deserializeAction(act, i);
      }
    };
    /* eslint-disable no-restricted-globals */
    parentPort?.on('message', handler);

    r('exit', latest.exit.pipe(
      rx.map(() => {
        comp.destory();
        parentPort?.off('message', handler);
      })
    ));

    r('Pass worker wait and awake message to broker', rx.merge(
      o.at.wait,
      o.at.stopWaiting,
      o.at.returned
    ).pipe(
      rx.map(action => {
        parentPort?.postMessage(serializeAction(action));
      })
    ));

    r(lo.log.pipe(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      rx.map(([, ...p]) => parentPort?.postMessage({type: 'log', p: [logPrefix, ...p]}))
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
  return comp as unknown as ReactorComposite<I extends unknown ? ForkWorkerInput : ForkWorkerInput & I, ForkWorkerOutput>;
}

export function reativizeRecursiveFuncs<
  I extends ActionFunctions,
  O extends ActionFunctions,
  // eslint-disable-next-line space-before-function-paren
  F extends {[s: string]: (...a: any[]) => any}
>(comp: ReactorComposite<I, O>, fObject: F) {
  comp.reactivize(fObject);
  return comp as unknown as ReactorComposite<InferFuncReturnEvents<F> & I & F, InferFuncReturnEvents<F> & O>;
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

export type ForkTransferablePayload<T = unknown> = {
  content: T;
  transferList: (ArrayBuffer | MessagePort | fsPromises.FileHandle | X509Certificate | Blob)[];
};

function hasReturnTransferable(payload: Action<any>['p']): payload is [ForkTransferablePayload, ...unknown[]] {
  return Array.isArray((payload[0] as ForkTransferablePayload | undefined)?.transferList);
}
