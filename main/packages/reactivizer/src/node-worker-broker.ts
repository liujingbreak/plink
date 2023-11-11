/* eslint-disable @typescript-eslint/indent */
import {Worker as NodeWorker, MessagePort as NodeMessagePort} from 'worker_threads';
import * as rx from 'rxjs';
import {DuplexOptions} from './duplex';
import {ReactorComposite} from './epic';
// import {timeoutLog} from './utils';
import {Action, ActionFunctions, serializeAction, deserializeAction, RxController} from './control';
import {Broker, BrokerInput, BrokerEvent, ForkWorkerInput, ForkWorkerOutput} from './types';

/** WA - Worker output Message
*/
export function createBroker<
  I extends ActionFunctions = Record<string, never>,
  O extends ActionFunctions = Record<string, never>,
  WA extends ActionFunctions = Record<string, never>
>(
  mainWorker: ReactorComposite<ForkWorkerInput & I, ForkWorkerOutput & O>,
  opts?: DuplexOptions<BrokerInput & O & BrokerEvent & ForkWorkerOutput>
) {
  const mainWorkerComp = mainWorker as unknown as ReactorComposite<ForkWorkerInput, ForkWorkerOutput>;
  const comp = new ReactorComposite<BrokerInput & ForkWorkerOutput, BrokerEvent>(opts as any);

  const workerInitState = new Map<number, 'DONE' | 'WIP'>();

  const {r, i, o} = comp;
  // comp.startAll();
  const workerOutputs = new Map<number, RxController<ForkWorkerOutput>>();

  r('Emit newWorkerReady event', o.pt.workerInited.pipe(
    rx.filter(([, , , , skipped]) => !skipped),
    rx.tap(([meta, workerNo, , outputCtrl]) => o.dpf.newWorkerReady(meta, workerNo, outputCtrl))
  ));

  r('ensureInitWorker', i.pt.ensureInitWorker.pipe(
    rx.mergeMap(([meta, workerNo, worker]) => {
      if (workerInitState.get(workerNo) === 'DONE') {
        o.dpf.workerInited(meta, workerNo, null, workerOutputs.get(workerNo)!, true);
        return rx.EMPTY;
      } else if (workerInitState.get(workerNo) === 'WIP') {
        return o.pt.workerInited.pipe(
          rx.filter(() => workerInitState.get(workerNo) === 'DONE'),
          rx.take(1),
          rx.tap(() => o.dpf.workerInited(meta, workerNo, null, workerOutputs.get(workerNo)!, true))
        );
      }

      workerInitState.set(workerNo, 'WIP');

      (worker as NodeWorker).on('message', (event: Action<WA, keyof WA> | {type: string}) => {
        if ((event as {type: string}).type === 'WORKER_READY') {
          workerInitState.set(workerNo, 'DONE');
          const wo = new RxController<ForkWorkerOutput>();
          workerOutputs.set(workerNo, wo);
          o.dpf.workerInited(meta, workerNo, null, wo, false);
        } else if ((event as {type: string}).type === 'log') {
          // eslint-disable-next-line no-console
          (opts?.log ?? console.log)(...(event as unknown as {p: [any, ...any[]]}).p);
        } else if ((event as {error?: any}).error) {
          o.dp.onWorkerError(
            workerNo,
            (event as {error?: any}).error
          );
        } else {
          const data = event as MessageEvent<Action<any, keyof any>>;
          let wo = workerOutputs.get(workerNo);
          if (wo == null) {
            wo = new RxController<ForkWorkerOutput>();
            workerOutputs.set(workerNo, wo);
          }
          deserializeAction(data, wo);
        }
      });

      (worker as NodeWorker).on('error', event => {
        o.dp.onWorkerError(workerNo, event);
      });

      (worker as NodeWorker).on('messageerror', event => {
        o.dp.onWorkerError(workerNo, event);
      });

      (worker as NodeWorker).on('exit', code => {
        o.dp.onWorkerExit(workerNo, code);
      });

      (worker as NodeWorker).postMessage({type: 'ASSIGN_WORKER_NO', workerNo});
      return rx.EMPTY;
    })
    // rx.takeUntil(o.pt.onWorkerExit.pipe(rx.filter(([id]) => id === )))
  ));

  r('On forkFromWorker', rx.merge(
    o.pt.newWorkerReady.pipe(
      rx.mergeMap(([, , workerOutput]) => workerOutput.pt.forkByBroker)
    ),
    mainWorkerComp.o.pt.forkByBroker
  ).pipe(
    rx.mergeMap(async ([, targetAction, port]) => {
      const [, assignedWorkerNo, worker] = await rx.firstValueFrom(o.do.assignWorker(i.at.workerAssigned
        // timeoutLog<typeof i.at.workerAssigned extends rx.Observable<infer T> ? T : never>(3000, () => console.log('worker assignment timeout'))
      ));
      const fa = mainWorkerComp.i.createAction('onFork', targetAction, port);

      if (worker === 'main') {
        deserializeAction(fa, mainWorkerComp.i);
      } else {
        await rx.firstValueFrom(i.do.ensureInitWorker(o.at.workerInited, assignedWorkerNo, worker));
        worker.postMessage(serializeAction(fa), [port as NodeMessagePort]);
      }
    })
  ));

  r('letWorkerExit -> postMessage to thread worker', i.pt.letWorkerExit.pipe(
    rx.map(([, worker]) => {
      // eslint-disable-next-line @typescript-eslint/ban-types
      (worker as NodeWorker).postMessage(serializeAction(
        (o as unknown as RxController<ForkWorkerInput>).core.createAction('exit')
      ));
    })
  ));
  return comp as unknown as Broker<WA>;
}

