import {parentPort, MessageChannel as NodeMessagechannel, threadId, isMainThread} from 'worker_threads';
import * as rx from 'rxjs';
import {Action, ActionFunctions, deserializeAction, serializeAction, nameOfAction, RxController} from './control';
import {ReactorComposite, InferFuncReturnEvents} from './epic';
import {ForkWorkerInput, ForkWorkerOutput} from './types';
import {Broker, createBroker} from './node-worker-broker';

export function createWorkerControl<I extends ActionFunctions = Record<string, never>>() {
  // eslint-disable-next-line no-console
  console.log('create worker control');
  // eslint-disable-next-line @typescript-eslint/ban-types
  const ctx = new ReactorComposite<ForkWorkerInput, ForkWorkerOutput<I>>({debug: '[Thread]' + (isMainThread ? 'main' : threadId)});
  let broker: Broker<I> | undefined;

  ctx.startAll();
  const {r, i, o} = ctx;
  const latest = i.createLatestPayloadsFor('exit');

  if (parentPort) {
    const handler = (event: {type?: string; data: number}) => {
      const msg = event;
      if (msg.type === 'ASSIGN_WORKER_NO') {
        parentPort!.postMessage({type: 'WORKER_READY'});
      } else {
        const act = event as unknown as Action<ForkWorkerInput>;
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
  }
  r('On output "fork" request message', o.at.fork.pipe(
    rx.mergeMap(act => {
      const {p: [wrappedAct]} = act;
      const wrappedActId = wrappedAct.i;
      const wrappedActCompletedType = nameOfAction(wrappedAct) + 'Completed';
      const chan = new NodeMessagechannel();
      act.p[1] = chan.port2;
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
          h => chan.port1.off('message', h)
        ).pipe(
          rx.map(event => deserializeAction(event, i)),
          rx.takeUntil(rx.merge(
            error$,
            close$,
            (i as RxController<any>).pt[wrappedActCompletedType].pipe(
              rx.filter(([, callerId]) => callerId === wrappedActId)
            )))
        ),
        new rx.Observable<void>(_sub => {
          if (parentPort) {
            act = serializeAction(act);
            parentPort.postMessage(act, [chan.port2]);
          } else {
            if (broker == null) {
              broker = createBroker<I>(i, {debug: 'ForkJoin-broker'});
              o.dp.brokerCreated(broker);
            }
            broker.i.dp.fork(wrappedAct);
          }
        })
      );
    })
  ));

  r('On recieving "being forked" message, wait for fork action returns', i.pt.fork.pipe(
    rx.mergeMap(([, origAct, port]) => {
      const origId = origAct.i;
      deserializeAction(origAct, i);
      const origType = nameOfAction(origAct);
      const typeOfResolved = origType + 'Resolved';
      const typeOfCompleted = origType + 'Completed';
      return rx.merge(
        (o as RxController<any>).at[typeOfResolved].pipe(
          rx.filter(({p: [_ret, callerId]}) => callerId === origId),
          rx.map(action => [action, false] as const)
        ),
        (o as RxController<any>).at[typeOfCompleted].pipe(
          rx.filter(({p: [callerId]}) => callerId === origId),
          rx.map(action => [action, true] as const)
        )
      ).pipe(
        rx.map(([action, isCompleted]) => {
          port!.postMessage(serializeAction(action));
          if (isCompleted) {
            port!.close();
          }
          return isCompleted;
        }),
        rx.takeWhile(isComplete => !isComplete)
      );
    })
  ));
  return ctx as unknown as ReactorComposite<I & ForkWorkerInput, ForkWorkerOutput<I>>;
}

export function reativizeRecursiveFuncs<
  I extends ActionFunctions,
  O extends ActionFunctions,
  // eslint-disable-next-line space-before-function-paren
  F extends {[s: string]: (...a: any[]) => any}
>(ctx: ReactorComposite<I, O>, fObject: F) {
  ctx.reactivize(fObject);
  return ctx as ReactorComposite<InferFuncReturnEvents<F> & I & F, InferFuncReturnEvents<F> & O>;
}
