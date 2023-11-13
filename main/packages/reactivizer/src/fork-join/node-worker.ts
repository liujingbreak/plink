import type {promises as fsPromises} from 'node:fs';
import type {X509Certificate} from 'node:crypto';
import type {Blob} from 'node:buffer';
import {parentPort, MessageChannel as NodeMessagechannel, threadId, isMainThread, MessagePort} from 'worker_threads';
import * as rx from 'rxjs';
import {Action, ActionFunctions, deserializeAction, serializeAction, RxController,
  actionRelatedToAction, InferPayload, actionRelatedToPayload} from '../control';
import {ReactorComposite, ReactorCompositeOpt} from '../epic';
import {Broker, ForkWorkerInput, ForkWorkerOutput} from './types';
// import {createBroker} from './node-worker-broker';

const inputTableFor = ['exit'] as const;
const outputTableFor = ['workerInited', 'log', 'warn'] as const;

export function createWorkerControl<
  I extends ActionFunctions = Record<string, never>,
  O extends ActionFunctions = Record<string, never>
>(
  opts?: ReactorCompositeOpt<ForkWorkerInput & ForkWorkerOutput & I & O>
): ReactorComposite<ForkWorkerInput & I, ForkWorkerOutput & O> {
  // eslint-disable-next-line @typescript-eslint/ban-types
  const comp = new ReactorComposite<ForkWorkerInput, ForkWorkerOutput, typeof inputTableFor, typeof outputTableFor>({
    ...(opts ?? {}),
    inputTableFor,
    outputTableFor,
    name: (opts?.name ?? '') + ('[Thread:' + (isMainThread ? 'main]' : threadId + ']')),
    debug: opts?.debug,
    log: isMainThread ? opts?.log : (...args) => parentPort?.postMessage({type: 'log', p: args}),
    debugExcludeTypes: ['log', 'warn'],
    logStyle: 'noParam'
  });
  let broker: Broker | undefined;

  const {r, i, o} = comp;
  const lo = comp.outputTable.l;

  r('worker$ -> workerInited', new rx.Observable(() => {
    const handler = (event: {type?: string; workerNo: number}) => {
      const msg = event;
      if (msg.type === 'ASSIGN_WORKER_NO') {
        parentPort!.postMessage({type: 'WORKER_READY'});
        const workerNo = msg.workerNo;
        const logPrefix = (opts?.name ?? '') + '[Worker:' + workerNo + ']';
        o.dp.workerInited(workerNo, logPrefix);
        comp.setName(logPrefix);
      } else {
        const act = event as unknown as Action<any>;
        deserializeAction(act, i);
      }
    };
    if (parentPort) {
      /* eslint-disable no-restricted-globals */
      parentPort.on('message', handler);
    } else {
      o.dp.workerInited('main', '[main]');
    }
    return () => parentPort?.off('message', handler);
  }));


  if (parentPort) {
    r('exit', comp.inputTable.l.exit.pipe(
      rx.switchMap(() => lo.workerInited),
      rx.take(1),
      rx.map(() => {
        comp.destory();
      })
    ));

    r('postMessage wait, stopWaiting, returned message to broker', lo.workerInited.pipe(
      rx.take(1),
      rx.switchMap(() => rx.merge(
        o.at.wait,
        o.at.stopWaiting,
        o.at.returned
      )),
      rx.map(action => {
        parentPort?.postMessage(serializeAction(action));
      })
    ));

    r('postMessage log to broker (parent thread)', lo.workerInited.pipe(
      rx.take(1),
      rx.switchMap(([, , logPrefix]) => lo.log.pipe(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        rx.map(([, ...p]) => parentPort?.postMessage({type: 'log', p: [logPrefix, ...p]}))
      ))
    ));
  } else {
    // main thread
    r('log, warn > console.log', lo.workerInited.pipe(
      rx.take(1),
      rx.switchMap(([, , logPrefix]) => rx.merge(lo.log, lo.warn).pipe(
        // eslint-disable-next-line no-console
        rx.map(([, ...p]) => (opts?.log ?? console.log)(logPrefix, ...p))
      ))
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
        broker.o.dp.onWorkerError(-1, {label, detail: err}, 'customized error');
      }
    })
  ));

  return comp as unknown as ReactorComposite<ForkWorkerInput & I, ForkWorkerOutput & O>;
}

export function fork< I extends ActionFunctions, O extends ForkWorkerOutput, K extends string & keyof I, R extends keyof I = `${K}Resolved`>(
  comp: ReactorComposite<I, O>,
  actionName: K & string,
  params: InferPayload<I[K]>,
  resActionName?: R
): Promise<InferPayload<I[R]>[0]> {
  const forkedAction = comp.o.createAction(actionName, ...params);
  const forkDone = rx.firstValueFrom(comp.i.pt[(resActionName ?? (actionName + 'Resolved')) as keyof I].pipe(
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
