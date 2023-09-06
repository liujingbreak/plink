import {Worker as NodeWorker} from 'worker_threads';
import * as rx from 'rxjs';
import {ReactorComposite} from './epic';
import {Action, ActionFunctions, serializeAction, deserializeAction, RxController, nameOfAction} from './control';
import {BrokerInput, BrokerEvent, ForkWorkerInput, ForkWorkerOutput} from './types';

/** WA - Worker output Message
*/
export function createBroker<WA extends ActionFunctions = Record<string, never>>(
  mainWorkerInput: RxController<ForkWorkerInput & any>,
  opts?: ConstructorParameters<typeof ReactorComposite>[0]
) {
  const comp = new ReactorComposite<BrokerInput, BrokerEvent>(opts);

  const workerInitState = new Map<number, 'DONE' | 'WIP'>();

  const {r, i, o} = comp;
  comp.startAll();

  r('ensureInitWorker', i.pt.ensureInitWorker.pipe(
    rx.mergeMap(([meta, workerNo, worker]) => {
      if (workerInitState.get(workerNo) === 'DONE') {
        o.dpf.workerInited(meta, workerNo, null, true);
        return rx.EMPTY;
      } else if (workerInitState.get(workerNo) === 'WIP') {
        return o.pt.workerInited.pipe(
          rx.filter(() => workerInitState.get(workerNo) === 'DONE'),
          rx.take(1),
          rx.tap(() => o.dpf.workerInited(meta, workerNo, null, true))
        );
      }

      workerInitState.set(workerNo, 'WIP');

      (worker as NodeWorker).on('message', (event: Action<WA, keyof WA> | {type: string}) => {
        if ((event as {type: string}).type === 'WORKER_READY') {
          workerInitState.set(workerNo, 'DONE');
          o.dpf.workerInited(meta, workerNo, null, false);
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
          o.dp.actionFromWorker(data as unknown as Action<ForkWorkerOutput<any>>, workerNo);
        }
      });

      (worker as NodeWorker).on('error', event => {
        o.dp.onWorkerError(workerNo, event);
      });

      (worker as NodeWorker).on('messageerror', event => {
        o.dp.onWorkerError(workerNo, event);
      });

      (worker as NodeWorker).on('exit', event => {
        o.dp.onWorkerExit(workerNo, event);
      });

      (worker as NodeWorker).postMessage({type: 'ASSIGN_WORKER_NO', workerNo});
      return rx.EMPTY;
    })
    // rx.takeUntil(o.pt.onWorkerExit.pipe(rx.filter(([id]) => id === )))
  ));

  r('On fork', i.at.fork.pipe(
    rx.mergeMap(async forkAction => {
      const [, workerNo, worker] = await rx.firstValueFrom(o.do.assignWorker(i.at.workerAssigned));

      if (worker === 'main') {
        deserializeAction(forkAction, mainWorkerInput);
      } else {
        await rx.firstValueFrom(i.do.ensureInitWorker(o.at.workerInited, workerNo, worker));
        worker.postMessage(serializeAction(forkAction), [forkAction.p[1]!]);
      }
    })
  ));

  r('dispatch action of actionFromWorker to broker\'s upStream', o.pt.actionFromWorker.pipe(
    rx.map(([, action, workerNo]) => {
      if (nameOfAction(action) === 'wait')
        i.dp.onWorkerWait(workerNo);
      else if (nameOfAction(action) === 'stopWaiting')
        i.dp.onWorkerAwake(workerNo);
      else
        deserializeAction(action, i); // fork action
    })
  ));

  r(i.pt.letWorkerExit.pipe(
    rx.map(([, worker]) => {
      // eslint-disable-next-line @typescript-eslint/ban-types
      (worker as NodeWorker).postMessage(serializeAction(
        (o as unknown as RxController<ForkWorkerInput>).core.createAction('exit')
      ));
    })
  ));
  return comp as unknown as Broker<WA>;
}

export type Broker<WA extends ActionFunctions = Record<string, never>> = ReactorComposite<BrokerInput, BrokerEvent & WA>;
