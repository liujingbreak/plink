/* eslint-disable @typescript-eslint/indent */
import {Worker, MessagePort, MessageChannel} from 'worker_threads';
import * as rx from 'rxjs';
import {ReactorComposite, ReactorCompositeOpt} from '../epic';
// import {timeoutLog} from '../utils';
import {Action, ActionFunctions, serializeAction, deserializeAction, RxController} from '../control';
import {Broker, BrokerInput, BrokerEvent, brokerOutputTableFor as outputTableFor, ForkWorkerInput, ForkWorkerOutput, WorkerControl} from './types';
import {applyScheduler} from './worker-scheduler';
export * from './types';

/** Broker manages worker threads, create message channels between child worker threads and main thread, transmits actions
*/
export function createBroker<
  I extends ActionFunctions = Record<string, never>,
  O extends ActionFunctions = Record<string, never>,
  LI extends ReadonlyArray<keyof I> = readonly [],
  LO extends ReadonlyArray<keyof O> = readonly []
>(
  workerController: ReactorComposite<ForkWorkerInput & I, ForkWorkerOutput & O, LI, LO>,
  opts?: ReactorCompositeOpt<BrokerInput & O & BrokerEvent<ReactorComposite<ForkWorkerInput & I, ForkWorkerOutput & O, any, any>> & ForkWorkerOutput>
) {
  const options = opts ? {...opts, outputTableFor} : {outputTableFor};
  const mainWorkerComp = workerController as unknown as ReactorComposite<ForkWorkerInput, ForkWorkerOutput>;

  const broker = new ReactorComposite<
    BrokerInput & ForkWorkerOutput,
    BrokerEvent<WorkerControl<I, O, LI, LO>>,
    [],
    typeof outputTableFor
  >(options as any);

  const workerInitState = new Map<number, 'DONE' | 'WIP'>();

  const {r, i, o, outputTable} = broker;
  const workerOutputs = new Map<number, RxController<ForkWorkerOutput & O>>();

  o.dp.portOfWorker(new Map());
  r('workerInited -> newWorkerReady', o.pt.workerInited.pipe(
    rx.filter(([, , , , skipped]) => !skipped),
    rx.switchMap(a => outputTable.l.workerInputs.pipe(
      rx.map(([, map]) => map.get(a[1])),
      rx.filter(b => b != null),
      rx.take(1),
      rx.map(b => [a, b] as const)
    )),
    rx.tap(([[meta, workerNo, , outputCtrl], inputRx]) => o.dpf.newWorkerReady(meta, workerNo, outputCtrl, inputRx!))
  ));

  r('ensureInitWorker, message channel -> workerInited, onWorkerExit, onWorkerError', i.pt.ensureInitWorker.pipe(
    rx.withLatestFrom(outputTable.l.portOfWorker, outputTable.l.workerInputs),
    rx.mergeMap(([[meta, workerNo, worker], [, portOfWorker], [, wiByWorkerNo]]) => {
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
      const chan = new MessageChannel();
      portOfWorker.set(worker, chan.port1);
      o.dp.portOfWorker(portOfWorker);
      const wo = new RxController<ForkWorkerOutput & O>({name: '#' + workerNo + ' worker output', debug: opts?.debug, log: opts?.log});
      workerOutputs.set(workerNo, wo);
      const wi = new RxController<ForkWorkerInput & I>({name: '#' + workerNo + ' worker input', debug: opts?.debug, log: opts?.log});
      wiByWorkerNo.set(workerNo, wi);
      o.dp.workerInputs(wiByWorkerNo);

      chan.port1.on('message', (event: Action<any> | {type: string}) => {
        if ((event as {type: string}).type === 'WORKER_READY') {
          workerInitState.set(workerNo, 'DONE');
          o.dpf.workerInited(meta, workerNo, null, wo, false);
        } else if ((event as {type: string}).type === 'log') {
          // eslint-disable-next-line no-console
          (opts?.log ?? console.log)(...(event as unknown as {p: [any, ...any[]]}).p);
        } else if ((event as {error?: any}).error) {
          o.dp.onWorkerError(
            workerNo,
            (event as {error?: any}).error,
            'customized error'
          );
        } else {
          const data = event as MessageEvent<Action<any, keyof any>>;
          deserializeAction(data, wo);
        }
      });

      (worker as Worker).on('error', event => {
        o.dp.onWorkerError(workerNo, event, 'Node.js error');
      });

      chan.port1.on('messageerror', event => {
        o.dp.onWorkerError(workerNo, event, 'message errror');
      });

      (worker as Worker).on('exit', code => {
        o.dp.onWorkerExit(workerNo, code);
      });

      (worker as Worker).postMessage({type: 'ASSIGN_WORKER_NO', workerNo, mainPort: chan.port2}, [chan.port2]);
      return wi.core.action$.pipe(
        rx.tap(action => chan.port1.postMessage(serializeAction(action)))
      );
    })
    // rx.takeUntil(o.pt.onWorkerExit.pipe(rx.filter(([id]) => id === )))
  ));

  r('(newWorkerReady) forkByBroker, workerInited -> ensureInitWorker, worker chan postMessage()', outputTable.l.newWorkerReady.pipe(
    rx.mergeMap(([, , workerOutput]) => (workerOutput as unknown as RxController<ForkWorkerOutput>).pt.forkByBroker),
    rx.switchMap(a => outputTable.l.portOfWorker.pipe(rx.take(1), rx.map(b => [a, b] as const))),
    rx.mergeMap(async ([[, targetAction, port], [, portOfWorker]]) => {
      const [, assignedWorkerNo, worker] = await rx.firstValueFrom(o.do.assignWorker(i.at.workerAssigned
        // timeoutLog<typeof i.at.workerAssigned extends rx.Observable<infer T> ? T : never>(3000, () => console.log('worker assignment timeout'))
      ));
      const fa = mainWorkerComp.i.createAction('onFork', targetAction, port);

      if (worker === 'main') {
        deserializeAction(fa, mainWorkerComp.i);
      } else {
        await rx.firstValueFrom(i.do.ensureInitWorker(o.at.workerInited, assignedWorkerNo, worker));
        portOfWorker.get(worker)!.postMessage(serializeAction(fa), [port as MessagePort]);
      }
    })
  ));

  r('letWorkerExit -> postMessage to thread worker', i.pt.letWorkerExit.pipe(
    rx.switchMap(a => outputTable.l.portOfWorker.pipe(rx.take(1), rx.map(b => [a, b] as const))),
    rx.map(([[, worker], [, portOfWorker]]) => {
      // eslint-disable-next-line @typescript-eslint/ban-types
      (portOfWorker.get(worker) as MessagePort).postMessage(serializeAction(
        (o as unknown as RxController<ForkWorkerInput>).core.createAction('exit')
      ));
    })
  ));


  const workerInputMap = new Map<number, RxController<ForkWorkerInput & I>>();
  workerInputMap.set(0, workerController.i);
  o.dp.workerInputs(workerInputMap);
  o.dp.newWorkerReady(0, workerController.o, workerController.i);
  return broker as unknown as Broker<WorkerControl<I, O, LI, LO>>;
}

type ScheduleOptions = typeof applyScheduler extends (c: any, o: infer O) => any ? O : unknown;

export function setupForMainWorker<
  I extends ActionFunctions = Record<string, never>,
  O extends ActionFunctions = Record<string, never>,
  LI extends ReadonlyArray<keyof I> = readonly [],
  LO extends ReadonlyArray<keyof O> = readonly []
>(workerContoller: WorkerControl<I, O, LI, LO>,
  opts: ScheduleOptions & ReactorCompositeOpt<BrokerInput & O &
    BrokerEvent<ReactorComposite<ForkWorkerInput & I, ForkWorkerOutput & O, any, any>> &
    ForkWorkerInput & ForkWorkerOutput>
 ): Broker<WorkerControl<I, O, LI, LO>> {

  const broker = createBroker(workerContoller, opts);
  applyScheduler(broker, opts);
  return broker;
}
