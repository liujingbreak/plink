import * as rx from 'rxjs';
import {ReactorComposite, ReactorCompositeOpt} from '../epic';
// import {timeoutLog} from '../utils';
import {Action, serializeAction, deserializeAction, RxController} from '../control';
import {Broker, BrokerInput, BrokerEvent, brokerOutputTableFor as outputTableFor, ForkWorkerInput, ForkWorkerOutput, WorkerControl, ThreadExpirationEvents} from './types';
import {applyScheduler} from './worker-scheduler';
export * from './types';

interface WorkerProperties {
  no: number;
  worker: Worker;
  port: MessagePort;
  input: ReactorComposite<any, any, any, any>['i'];
  output: ReactorComposite<any, any, any, any>['o'];
  state: 'inited' | 'init' | 'exit';
}
/** Broker manages worker threads, create message channels between child worker threads and main thread, transmits actions
*/
export function createBroker<
  I = Record<never, never>,
  O = Record<never, never>
>(
  workerController: WorkerControl<I, O, any, any>,
  opts?: ReactorCompositeOpt<BrokerInput & ForkWorkerInput, BrokerEvent<I, O> & ForkWorkerOutput & ThreadExpirationEvents>
) {
  const options = opts ? {...opts, outputTableFor} : {outputTableFor};
  const mainWorkerComp = workerController as unknown as ReactorComposite<ForkWorkerInput, ForkWorkerOutput>;

  const broker = new ReactorComposite<
  BrokerInput & ForkWorkerOutput,
  BrokerEvent<I, O>,
  [],
    typeof outputTableFor
  >(options as any);

  const workerProps = new Map<number, WorkerProperties>();

  const {r, i, o} = broker;

  r('workerInited -> newWorkerReady', o.pt.workerInited.pipe(
    rx.filter(([, , , , skipped]) => !skipped),
    rx.tap(([meta, workerNo, , outputCtrl]) => o.dpf.newWorkerReady(meta, workerNo, outputCtrl, workerProps.get(workerNo)!.input))
  ));

  r('ensureInitWorker, message channel -> workerInited, onWorkerExit, onWorkerError', i.pt.ensureInitWorker.pipe(
    rx.mergeMap(([meta, workerNo, worker]) => {
      let props = workerProps.get(workerNo);
      if (props?.state === 'inited') {
        o.dpf.workerInited(meta, workerNo, null, workerProps.get(workerNo)!.output, true);
        return rx.EMPTY;
      } else if (props?.state === 'init') {
        return o.pt.workerInited.pipe(
          rx.filter(() => props?.state === 'inited'),
          rx.take(1),
          rx.tap(() => o.dpf.workerInited(meta, workerNo, null, workerProps.get(workerNo)!.output, true))
        );
      }
      if (props == null) {
        props = {state: 'init'} as WorkerProperties;
        workerProps.set(workerNo, props);
      }
      const chan = new MessageChannel();
      props.port = chan.port1;
      const wo = new RxController<ReactorComposite<any, ForkWorkerOutput & O>['o'] extends RxController<infer T> ? T : unknown>({
        name: '#' + workerNo + ' worker output',
        debugExcludeTypes: (opts as ReactorCompositeOpt<ForkWorkerOutput> | undefined)?.debugExcludeTypes
      });
      const wi = new RxController<ForkWorkerInput & I>({
        name: '#' + workerNo + ' worker input',
        debugExcludeTypes: (opts as ReactorCompositeOpt<ForkWorkerInput> | undefined)?.debugExcludeTypes
      });
      props.input = wi;
      props.output = wo;

      chan.port1.onmessage = ({data: event}: MessageEvent<Action<any> | {type: string}>) => {
        if ((event as {type: string}).type === 'WORKER_READY') {
          props!.state = 'inited';
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
      };

      (worker as Worker).onerror = event => {
        o.dp.onWorkerError(workerNo, event, 'web worker error');
      };

      chan.port1.onmessageerror = event => {
        o.dp.onWorkerError(workerNo, event, 'message error');
      };

      // TODO: web worker does not have 'close' event, I need
      // to.find a way resolve this worker exit notification
      // (worker as Worker).on('exit', code => {
      //   o.dp.onWorkerExit(workerNo, code);
      // });

      (worker as Worker).postMessage({type: 'ASSIGN_WORKER_NO', workerNo, mainPort: chan.port2}, [chan.port2]);
      return wi.core.action$.pipe(
        rx.tap(action => chan.port1.postMessage(serializeAction(action)))
      );
    })
    // rx.takeUntil(o.pt.onWorkerExit.pipe(rx.filter(([id]) => id === )))
  ));

  r('(newWorkerReady) forkByBroker, workerInited -> ensureInitWorker, worker chan postMessage()', o.pt.newWorkerReady.pipe(
    rx.mergeMap(([, fromWorkerNo, workerOutput]) => (workerOutput as unknown as RxController<ForkWorkerOutput>).pt.forkByBroker.pipe(
      rx.mergeMap(async ([, targetAction, port]) => {
        let assignedWorkerNo: number | undefined;
        try {
          const [, assignedWorkerNo_, worker] = await rx.firstValueFrom(o.do.assignWorker(i.at.workerAssigned
            // timeoutLog<typeof i.at.workerAssigned extends rx.Observable<infer T> ? T : never>(3000, () => console.log('worker assignment timeout'))
          ));
          assignedWorkerNo = assignedWorkerNo_;
          const fa = mainWorkerComp.i.createAction('onFork', targetAction, port);

          if (worker === 'main') {
            deserializeAction(fa, mainWorkerComp.i);
          } else {
            await rx.firstValueFrom(i.do.ensureInitWorker(o.at.workerInited, assignedWorkerNo, worker));
            workerProps.get(assignedWorkerNo)!.port.postMessage(serializeAction(fa), [port as MessagePort]);
          }
        } catch (e) {
          if (opts?.log)
            opts.log(`Error encountered when forked by worker #${fromWorkerNo}, to #${assignedWorkerNo ?? ''}`);
          const errorFor = broker.o.createAction('_onErrorFor', e);
          errorFor.r = targetAction.i;
          port.postMessage(serializeAction(errorFor));
          throw e;
        }
      })
    ))
  ));

  r('letWorkerExit -> postMessage to thread worker', i.pt.letWorkerExit.pipe(
    rx.map(([, workerNo]) => {
      const prop = workerProps.get(workerNo)!;
      // eslint-disable-next-line @typescript-eslint/ban-types
      prop.port.postMessage(serializeAction(
        (o as unknown as RxController<ForkWorkerInput>).core.createAction('exit')
      ));
      prop.state = 'exit';
    })
  ));

  o.dp.newWorkerReady(0, workerController.o, workerController.i);
  return broker as unknown as Broker<I, O>;
}

type ScheduleOptions = typeof applyScheduler extends (c: any, o: infer O) => any ? O : unknown;

export function setupForMainWorker<
  I = Record<never, never>,
  O = Record<never, never>
>(workerContoller: WorkerControl<I, O, any, any>,
  opts: ScheduleOptions & ReactorCompositeOpt<BrokerInput & ForkWorkerInput, BrokerEvent<I, O> & ForkWorkerOutput & ThreadExpirationEvents>
): Broker<I, O> {
  const broker = createBroker(workerContoller, opts);
  applyScheduler(broker, opts);
  return broker;
}
