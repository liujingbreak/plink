import type {promises as fsPromises} from 'node:fs';
import type {X509Certificate} from 'node:crypto';
import type {Blob} from 'node:buffer';
import {parentPort, MessageChannel as NodeMessagechannel, threadId, isMainThread, MessagePort} from 'worker_threads';
import * as rx from 'rxjs';
import {Action, ActionFunctions, deserializeAction, serializeAction,
  actionRelatedToAction} from '../control';
import {ReactorComposite, ReactorCompositeOpt} from '../epic';
import {Broker, ForkWorkerInput, ForkWorkerOutput, workerInputTableFor as inputTableFor,
  workerOutputTableFor as outputTableFor, WorkerControl} from './types';

export {fork} from './common';
export {WorkerControl} from './types';
// import {createBroker} from './node-worker-broker';

export function createWorkerControl<
  I extends ActionFunctions = Record<string, never>,
  O extends ActionFunctions = Record<string, never>,
  LI extends ReadonlyArray<keyof I> = readonly [],
  LO extends ReadonlyArray<keyof O> = readonly []
>(
  opts?: ReactorCompositeOpt<ForkWorkerInput & ForkWorkerOutput & I & O>
) {
  let mainPort: MessagePort | undefined; // parent thread port
  // eslint-disable-next-line @typescript-eslint/ban-types
  const comp = new ReactorComposite<ForkWorkerInput, ForkWorkerOutput, typeof inputTableFor, typeof outputTableFor>({
    ...(opts ?? {}),
    inputTableFor: [...(opts?.inputTableFor ?? []), ...inputTableFor],
    outputTableFor: [...(opts?.outputTableFor ?? []), ...outputTableFor],
    name: (opts?.name ?? '') + ('[Thread:' + (isMainThread ? 'main]' : threadId + ']')),
    debug: opts?.debug,
    log: isMainThread ? opts?.log : (...args) => mainPort?.postMessage({type: 'log', p: args}),
    debugExcludeTypes: ['log', 'warn'],
    logStyle: 'noParam'
  });
  let broker: Broker | undefined;

  const {r, i, o, outputTable} = comp;
  const lo = comp.outputTable.l;

  r('-> workerInited', new rx.Observable(() => {
    const handler = (event: {type?: string; workerNo: number; mainPort: MessagePort}) => {
      const msg = event;
      if (msg.type === 'ASSIGN_WORKER_NO') {
        msg.mainPort.postMessage({type: 'WORKER_READY'});
        mainPort = msg.mainPort;
        const workerNo = msg.workerNo;
        const logPrefix = (opts?.name ?? '') + '[Worker:' + workerNo + ']';
        o.dp.workerInited(workerNo, logPrefix, msg.mainPort);
        comp.setName(logPrefix);
      }
    };
    if (parentPort) {
      /* eslint-disable no-restricted-globals */
      parentPort.on('message', handler);
    } else {
      o.dp.workerInited('main', '[main]', null);
    }
    return () => parentPort?.off('message', handler);
  }));

  r('workerInited -> main worker message port listener', outputTable.l.workerInited.pipe(
    rx.filter(([, , , port]) => port != null),
    rx.switchMap(([, , , port]) => new rx.Observable(() => {
      function handler(event: unknown) {
        const act = event as Action<any>;
        deserializeAction(act, i);
      }
      (port as MessagePort).on('message', handler);
      return () => {
        (port as MessagePort).close();
        (port as MessagePort).off('message', handler);
      };
    }))
  ));

  if (parentPort) {
    r('exit', comp.inputTable.l.exit.pipe(
      rx.switchMap(() => lo.workerInited),
      rx.take(1),
      rx.map(() => {
        comp.destory();
      })
    ));

    r('postMessage wait, stopWaiting, returned message to broker', lo.workerInited.pipe(
      rx.filter(([, , , port]) => port != null),
      rx.take(1),
      rx.switchMap(([, , , port]) => rx.merge(
        o.at.wait,
        o.at.stopWaiting,
        o.at.returned
      ).pipe(
        rx.map(action => {
          port!.postMessage(serializeAction(action));
        })
      ))
    ));

    r('postMessage log to broker (parent thread)', lo.workerInited.pipe(
      rx.filter(([, , , port]) => port != null),
      rx.take(1),
      rx.switchMap(([, , logPrefix, port]) => lo.log.pipe(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        rx.map(([, ...p]) => port?.postMessage({type: 'log', p: [logPrefix, ...p]}))
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

  r('"fork" -> mainPort.postMessage, forkByBroker', o.at.fork.pipe(
    rx.switchMap(a => outputTable.l.workerInited.pipe(rx.map(b => [a, b] as const), rx.take(1))),
    rx.mergeMap(([act, [, , , mainPort]]) => {
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
          if (mainPort) {
            const forkByBroker = o.createAction('forkByBroker', wrappedAct, chan.port2);
            mainPort.postMessage(serializeAction(forkByBroker), [chan.port2]);
          } else {
            o.dpf.forkByBroker(act, wrappedAct, chan.port2);
          }
        })
      );
    })
  ));

  r('onFork -> wait for fork action returns, postMessage to forking parent thread', i.pt.onFork.pipe(
    rx.mergeMap(([, origAct, port]) => {
      return rx.merge(
        o.core.action$.pipe(
          actionRelatedToAction(origAct),
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
        ),
        new rx.Observable(() => {
          deserializeAction(origAct, i);
        })
      );
    })
  ));

  r('Pass error to broker', comp.error$.pipe(
    rx.switchMap(a => outputTable.l.workerInited.pipe(
      rx.map(b => [a, b] as const),
      rx.take(1)
    )),
    rx.map(([[label, err], [, , , mainPort]]) => {
      if (mainPort) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        (mainPort as MessagePort).postMessage({error: {label, detail: err}});
      } else if (broker) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        broker.o.dp.onWorkerError(-1, {label, detail: err}, 'customized error');
      }
    })
  ));

  return comp as unknown as WorkerControl<I, O, LI, LO>;
}

export type ForkTransferablePayload<T = unknown> = {
  content: T;
  transferList: (ArrayBuffer | MessagePort | fsPromises.FileHandle | X509Certificate | Blob)[];
};

function hasReturnTransferable(payload: Action<any>['p']): payload is [ForkTransferablePayload, ...unknown[]] {
  return Array.isArray((payload[0] as ForkTransferablePayload | undefined)?.transferList);
}
