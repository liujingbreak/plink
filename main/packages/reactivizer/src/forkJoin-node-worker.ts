import type {promises as fsPromises} from 'node:fs';
import type {X509Certificate} from 'node:crypto';
import type {Blob} from 'node:buffer';
import {parentPort, MessageChannel as NodeMessagechannel, threadId, isMainThread, MessagePort} from 'worker_threads';
import * as rx from 'rxjs';
import {Action, ActionFunctions, deserializeAction, serializeAction, nameOfAction, RxController, actionRelatedToAction} from './control';
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
    debugExcludeTypes: ['log', 'warn', 'wait', 'stopWaiting'],
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
        i.dp.stopAll();
        parentPort?.off('message', handler);
      })
    ));

    r('Pass worker wait and awake message to broker', rx.merge(
      o.at.wait,
      o.at.stopWaiting
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
      const wrappedActId = wrappedAct.i;
      const wrappedActCompletedType = nameOfAction(wrappedAct) + 'Completed';
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
          rx.takeUntil(rx.merge(
            error$,
            close$,
            (i as RxController<any>).at[wrappedActCompletedType].pipe(
              actionRelatedToAction(wrappedActId)
            )))
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
      const origType = nameOfAction(origAct);
      const typeOfResolved = origType + 'Resolved';
      const typeOfCompleted = origType + 'Completed';
      return rx.merge(
        (o as RxController<any>).at[typeOfResolved].pipe(
          actionRelatedToAction(origId),
          rx.map(action => [action, false] as const)
        ),
        (o as RxController<any>).at[typeOfCompleted].pipe(
          actionRelatedToAction(origId),
          rx.map(action => [action, true] as const)
        )
      ).pipe(
        rx.map(([action, isCompleted]) => {
          const {p} = action;
          if (hasReturnTransferable(p)) {
            const [{transferList}] = p;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            (p[0] as any).transferList = null;
            port.postMessage(serializeAction(action), transferList);
          } else {
            port.postMessage(serializeAction(action));
          }
          return isCompleted;
        }),
        rx.takeWhile(isComplete => !isComplete)
      );
    })
  ));

  r('Pass error to broker', o.pt.onError.pipe(
    rx.map(([, label, err]) => {
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

export type ForkTransferablePayload<T = unknown> = {
  content: T;
  transferList: (ArrayBuffer | MessagePort | fsPromises.FileHandle | X509Certificate | Blob)[];
};

function hasReturnTransferable(payload: Action<any>['p']): payload is [ForkTransferablePayload, ...unknown[]] {
  return Array.isArray((payload[0] as ForkTransferablePayload | undefined)?.transferList);
}
