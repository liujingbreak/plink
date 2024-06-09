import * as rx from 'rxjs';
import {SimplexReactorOptions} from '../reactor-base';
import {SimplexReactor, BaseActions} from '../simplex-reactor';
import {deserializeAction2, RxController2} from '../control2';
import {Action, serializeAction, InferPayload} from '../control';
import {Broker, BrokerInput, BrokerEvent, brokerOutputTableFor as tableFor, ForkWorkerInput, ForkWorkerOutput, WorkerControl, ThreadExpirationEvents} from './types';
import {applyScheduler} from './worker-scheduler';
export * from './types';

interface WorkerProperties {
  no: number;
  worker: Worker;
  port: MessagePort;
  input: RxController2<any>;
  output: RxController2<any>;
  state: 'inited' | 'init' | 'exit';
}
/** Broker manages worker threads, create message channels between child worker threads and main thread, transmits actions
*/
export function createBroker<I = Record<never, never>>(
  workerController: WorkerControl<I, any>,
  opts?: SimplexReactorOptions<BrokerInput & ForkWorkerInput & BrokerEvent<I> & ForkWorkerOutput & ThreadExpirationEvents>
) {
  const options = opts ? {...opts, tableFor} : {tableFor};
  const mainWorkerComp = workerController as unknown as SimplexReactor<ForkWorkerInput & ForkWorkerOutput>;
  const broker = new SimplexReactor<BrokerInput & ForkWorkerOutput & BrokerEvent<I>,
    typeof tableFor>(options as any);
  broker.table.addActions(...tableFor);
  const workerProps = new Map<number, WorkerProperties>();
  const allReadyWorkers = new Set<InferPayload<BrokerEvent<I>['newWorkerReady']>>();
  const {r, s} = broker;

  r('workerInited -> newWorkerReady', s.pt.workerInited.pipe(
    rx.filter(([, , , , skipped]) => !skipped),
    rx.tap(([meta, workerNo, , outputCtrl]) => s.ft.newWorkerReady(workerNo, outputCtrl, workerProps.get(workerNo)!.input).dp(meta))
  ));

  r('ensureInitWorker, message channel -> workerInited, onWorkerExit, onWorkerError', s.pt.ensureInitWorker.pipe(
    rx.mergeMap(([meta, workerNo, worker]) => {
      let props = workerProps.get(workerNo);
      if (props?.state === 'inited') {
        s.ft.workerInited(workerNo, null, workerProps.get(workerNo)!.output, true).dp(meta);
        return rx.EMPTY;
      } else if (props?.state === 'init') {
        return s.pt.workerInited.pipe(
          rx.filter(() => props?.state === 'inited'),
          rx.take(1),
          rx.tap(() => s.ft.workerInited(workerNo, null, workerProps.get(workerNo)!.output, true).dp(meta))
        );
      }
      if (props == null) {
        props = {state: 'init'} as WorkerProperties;
        workerProps.set(workerNo, props);
      }
      const chan = new MessageChannel();
      props.port = chan.port1;
      const wo = new RxController2<ForkWorkerInput & ForkWorkerOutput & I>({
        name: '#' + workerNo + ' worker output',
        debugExcludeTypes: (opts as SimplexReactorOptions<ForkWorkerOutput> | undefined)?.debugExcludeTypes
      });
      const wi = new RxController2<ForkWorkerInput & ForkWorkerOutput & I>({
        name: '#' + workerNo + ' worker input',
        debugExcludeTypes: (opts as SimplexReactorOptions<ForkWorkerInput> | undefined)?.debugExcludeTypes
      });
      props.input = wi;
      props.output = wo;

      chan.port1.onmessage = ({data: event}: MessageEvent<Action<any> | {type: string}>) => {
        if ((event as {type: string}).type === 'WORKER_READY') {
          props.state = 'inited';
          s.ft.workerInited(workerNo, null, wo, false).dp(meta);
        } else if ((event as {type: string}).type === 'log') {
          // eslint-disable-next-line no-console
          (opts?.log ?? console.log)(...(event as unknown as {p: [any, ...any[]]}).p);
        } else if ((event as {error?: any}).error) {
          s.ft.onWorkerError(
            workerNo,
            (event as {error?: any}).error,
            'customized error'
          ).dp();
        } else {
          const data = event as MessageEvent<Action<any>>;
          deserializeAction2(data, wo);
        }
      };

      (worker as Worker).onerror = event => {
        s.ft.onWorkerError(workerNo, event, 'web worker error').dp();
        broker.dispatchErrorFor(event, meta);
      };

      chan.port1.onmessageerror = event => {
        s.ft.onWorkerError(workerNo, event, 'message errror').dp();
        broker.dispatchErrorFor(event, meta);
      };

      // TODO: web worker does not have 'close' event, I need
      // to.find a way resolve this worker exit notification
      // (worker as Worker).on('exit', code => {
      //   s.dp.onWorkerExit(workerNo, code);
      // });

      (worker as Worker).postMessage({type: 'ASSIGN_WORKER_NO', workerNo, mainPort: chan.port2}, [chan.port2]);
      return wi.action$.pipe(
        rx.tap(action => chan.port1.postMessage(serializeAction(action)))
      );
    })
    // rx.takeUntil(s.pt.onWorkerExit.pipe(rx.filter(([id]) => id === )))
  ));

  r('(newWorkerReady) forkByBroker, workerInited -> ensureInitWorker, worker chan postMessage()',
    s.pt.newWorkerReady.pipe(
      rx.tap(([, ...props]) => {
        allReadyWorkers.add(props);
      }),
      rx.mergeMap(([, fromWorkerNo, workerOutput]) => (workerOutput as unknown as RxController2<ForkWorkerOutput>).pt.forkByBroker.pipe(
        rx.mergeMap(async ([, targetAction, port]) => {
          let assignedWorkerNo: number | undefined;
          try {
            const [, assignedWorkerNo_, worker] = await rx.firstValueFrom(s.ft.assignWorker().od(s.pt.workerAssigned
            // timeoutLog<typeof s.at.workerAssigned extends rx.Observable<infer T> ? T : never>(3000, () => console.log('worker assignment timeout'))
            ));
            assignedWorkerNo = assignedWorkerNo_;
            const fa = mainWorkerComp.s.createAction('onFork', [targetAction, port]);

            if (worker === 'main') {
              deserializeAction2(fa, mainWorkerComp.s);
            } else {
              await rx.firstValueFrom(s.ft.ensureInitWorker(assignedWorkerNo, worker).od(s.pt.workerInited));
              workerProps.get(assignedWorkerNo)!.port.postMessage(serializeAction(fa), [port as MessagePort]);
            }
          } catch (e) {
            if (opts?.log)
              opts.log(`Error encountered when forked by worker #${fromWorkerNo}, to #${assignedWorkerNo ?? ''}`);
            const errorFor = (broker.s as unknown as RxController2<BaseActions>).createAction('__onError', [e]);
            errorFor.r = targetAction.i;
            port.postMessage(serializeAction(errorFor));
            throw e;
          }
        })
      ))
    ));

  r('letWorkerExit -> postMessage to thread worker', s.pt.letWorkerExit.pipe(
    rx.map(([, workerNo]) => {
      const prop = workerProps.get(workerNo)!;
      // eslint-disable-next-line @typescript-eslint/ban-types
      prop.port.postMessage(serializeAction(
        (s as unknown as RxController2<ForkWorkerInput>).createAction('exit')
      ));
      prop.state = 'exit';
    })
  ));

  r('mainThreadInit', s.pt.mainThreadInit.pipe(
    rx.tap(() => {
      broker.s.ft.workerAssigned(0, 'main', true, 0).dp();
      broker.s.ft.newWorkerReady(0, workerController.s, workerController.s).dp();
    })
  ));
  s.ft.mainThreadInit().dp();
  s.ft.allReadyWorkers<I>(allReadyWorkers).dp();
  return broker as unknown as Broker<I>;
}

type ScheduleOptions = typeof applyScheduler extends (c: any, o: infer O) => any ? O : unknown;

export function setupForMainWorker<
  I = Record<never, never>
>(workerController: WorkerControl<I, any>,
  brokerCreationOptions: ScheduleOptions & SimplexReactorOptions<BrokerInput & ForkWorkerInput & BrokerEvent<I> & ForkWorkerOutput & ThreadExpirationEvents>
): Broker<I> {
  const broker = createBroker(workerController, brokerCreationOptions);
  applyScheduler(broker, brokerCreationOptions);
  return broker;
}
