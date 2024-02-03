import type {MessagePort} from 'worker_threads';
import type {promises as fsPromises} from 'node:fs';
import type {X509Certificate} from 'node:crypto';
import type {Blob} from 'node:buffer';
import * as rx from 'rxjs';
import {deserializeAction2, ReactorComposite2, Action, serializeAction, actionRelatedToAction, nameOfAction} from '..';
import {ForkWorkerInput, ForkWorkerOutput, workerInputTableFor as inputTableFor,
  workerOutputTableFor as outputTableFor} from './types';

export function applySharedReactors(isMainWorker: boolean,
  comp: ReactorComposite2<ForkWorkerInput, ForkWorkerOutput, typeof inputTableFor, typeof outputTableFor>,
  log: (...a: any[]) => any
) {
  const {r, i, o, outputTable, inputTable} = comp;
  const lo = comp.outputTable.l;
  if (!isMainWorker) {
    r('exit', comp.inputTable.l.exit.pipe(
      rx.switchMap(() => lo.workerInited),
      rx.take(1),
      rx.map(() => {
        comp.dispose();
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
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        rx.tap(([, ...p]) => log(logPrefix, ...p))
      ))
    ));
  }

  r('onFork -> wait for fork action returns, postMessage to forking parent thread', i.pt.onFork.pipe(
    rx.mergeMap(([, origAct, port]) => {
      return rx.merge(
        o.action$.pipe(
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
            o.ft.returned().dp();
          })
        ),
        new rx.Observable(() => {
          deserializeAction2(origAct, i);
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
        mainPort.postMessage({error: {label, detail: err}});
      } // else if (broker) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      // broker.o.dp.onWorkerError(-1, {label, detail: err}, 'customized error');
      // }
    })
  ));

  r('setLiftUpActions -> postMessage to main thread',
    inputTable.l.setLiftUpActions.pipe(
      rx.mergeMap(([, action$]) => action$),
      rx.withLatestFrom(outputTable.l.workerInited),
      rx.tap(([action, [, , , port]]) => {
        if (port) {
          o.ft.log(`pass action ${nameOfAction(action) as string} to main thread`).dp();
          port.postMessage(serializeAction(action));
        }
      })
    ));
}

export type ForkTransferablePayload<T = unknown> = {
  content: T;
  transferList: (ArrayBuffer | MessagePort | fsPromises.FileHandle | X509Certificate | Blob)[];
};

function hasReturnTransferable(payload: Action<any>['p']): payload is [ForkTransferablePayload, ...unknown[]] {
  return Array.isArray((payload[0] as ForkTransferablePayload | undefined)?.transferList);
}
