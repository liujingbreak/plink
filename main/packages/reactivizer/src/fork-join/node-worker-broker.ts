/* eslint-disable @typescript-eslint/indent */
import {Worker as NodeWorker, MessagePort as NodeMessagePort, MessageChannel} from 'worker_threads';
import * as rx from 'rxjs';
import {ReactorComposite, ReactorCompositeOpt} from '../epic';
// import {timeoutLog} from '../utils';
import {Action, ActionFunctions, serializeAction, deserializeAction, RxController} from '../control';
import {Broker, BrokerInput, BrokerEvent, brokerOutputTableFor as outputTableFor, ForkWorkerInput, ForkWorkerOutput} from './types';
import {applyScheduler} from './worker-scheduler';

/** WA - Worker output Message
*/
export function createBroker<
  I extends ActionFunctions = Record<string, never>,
  O extends ActionFunctions = Record<string, never>,
  WA extends ActionFunctions = Record<string, never>
>(
  workerController: ReactorComposite<ForkWorkerInput & I, ForkWorkerOutput & O, any, any>,
  opts?: ReactorCompositeOpt<BrokerInput & O & BrokerEvent & ForkWorkerOutput>
) {
  const options = opts ? {...opts, outputTableFor} : {outputTableFor};
  const mainWorkerComp = workerController as unknown as ReactorComposite<ForkWorkerInput, ForkWorkerOutput>;

  const broker = new ReactorComposite<BrokerInput & ForkWorkerOutput, BrokerEvent, [], typeof outputTableFor>(options as any);

  const workerInitState = new Map<number, 'DONE' | 'WIP'>();

  const {r, i, o, outputTable} = broker;
  const workerOutputs = new Map<number, RxController<ForkWorkerOutput>>();

  o.dp.portOfWorker(new Map());
  r('workerInited -> newWorkerReady', o.pt.workerInited.pipe(
    rx.filter(([, , , , skipped]) => !skipped),
    rx.tap(([meta, workerNo, , outputCtrl]) => o.dpf.newWorkerReady(meta, workerNo, outputCtrl))
  ));

  r('ensureInitWorker -> workerInited, onWorkerExit', i.pt.ensureInitWorker.pipe(
    rx.withLatestFrom(outputTable.l.portOfWorker),
    rx.mergeMap(([[meta, workerNo, worker], [, portOfWorker]]) => {
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

      chan.port1.on('message', (event: Action<WA, keyof WA> | {type: string}) => {
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
            (event as {error?: any}).error,
            'customized error'
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
        o.dp.onWorkerError(workerNo, event, 'Node.js error');
      });

      chan.port1.on('messageerror', event => {
        o.dp.onWorkerError(workerNo, event, 'message errror');
      });

      (worker as NodeWorker).on('exit', code => {
        o.dp.onWorkerExit(workerNo, code);
      });

      (worker as NodeWorker).postMessage({type: 'ASSIGN_WORKER_NO', workerNo, mainPort: chan.port2}, [chan.port2]);
      return rx.EMPTY;
    })
    // rx.takeUntil(o.pt.onWorkerExit.pipe(rx.filter(([id]) => id === )))
  ));

  r('(newWorkerReady) forkByBroker, workerInited -> ensureInitWorker', outputTable.l.newWorkerReady.pipe(
    rx.mergeMap(([, , workerOutput]) => workerOutput.pt.forkByBroker),
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
        portOfWorker.get(worker)!.postMessage(serializeAction(fa), [port as NodeMessagePort]);
      }
    })
  ));

  r('letWorkerExit -> postMessage to thread worker', i.pt.letWorkerExit.pipe(
    rx.switchMap(a => outputTable.l.portOfWorker.pipe(rx.take(1), rx.map(b => [a, b] as const))),
    rx.map(([[, worker], [, portOfWorker]]) => {
      // eslint-disable-next-line @typescript-eslint/ban-types
      (portOfWorker.get(worker) as NodeMessagePort).postMessage(serializeAction(
        (o as unknown as RxController<ForkWorkerInput>).core.createAction('exit')
      ));
    })
  ));

  o.dp.newWorkerReady(0, mainWorkerComp.o);
  return broker as unknown as Broker<WA>;
}

type ScheduleOptions = typeof applyScheduler extends (c: any, o: infer O) => any ? O : unknown;

export function setupForMainWorker<
  I extends ActionFunctions = Record<string, never>,
  O extends ActionFunctions = Record<string, never>
>(workerContoller: ReactorComposite<ForkWorkerInput & I, ForkWorkerOutput & O, any, any>,
  opts: ScheduleOptions & ReactorCompositeOpt<BrokerInput & O & BrokerEvent & ForkWorkerInput & ForkWorkerOutput>) {
  const broker = createBroker(workerContoller, opts);
  applyScheduler(broker, opts);
  return broker;
}
