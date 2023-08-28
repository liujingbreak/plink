import {Worker as NodeWorker} from 'worker_threads';
import * as rx from 'rxjs';
import {ReactorComposite} from './epic';
import {Action, ActionFunctions, serializeAction, deserializeAction, RxController} from './control';
import {BrokerInput, BrokerEvent, ForkWorkerInput} from './types';

/** WA - Worker output Message
*/
export function createBroker<WA extends ActionFunctions = Record<string, never>>(
  mainWorkerInput: RxController<ForkWorkerInput>,
  opts?: ConstructorParameters<typeof ReactorComposite>[0]
) {
  const ctx = new ReactorComposite<BrokerInput, BrokerEvent>(opts);
  const l = ctx.i.createLatestPayloadsFor('workerAssigned');

  const workerInitState = new Map<number, 'DONE' | 'WIP'>();

  const {r, i, o} = ctx;
  ctx.startAll();
  r(i.pt.ensureInitWorker.pipe(
    rx.mergeMap(([id, workerNo, worker]) => {
      if (workerInitState.get(workerNo) === 'DONE') {
        o.dp.workerInited(workerNo, null, id, true);
        return rx.EMPTY;
      } else if (workerInitState.get(workerNo) === 'WIP') {
        return o.pt.workerInited.pipe(
          rx.filter(() => workerInitState.get(workerNo) === 'DONE'),
          rx.take(1)
        );
      }
      (worker as NodeWorker).on('message', (event: Action<WA, keyof WA> | {type: string}) => {
        if ((event as {type: string}).type === 'WORKER_READY') {
          workerInitState.set(workerNo, 'DONE');
          o.dp.workerInited(workerNo, null, id, false);
        } else if ((event as {error?: any}).error) {
          o.dp.onWorkerError(
            workerNo,
            (event as {error?: any}).error
          );
        } else {
          const {data} = event as MessageEvent<Action<any, keyof any>>;
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          deserializeAction(data, o);
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

  r(i.at.fork.pipe(
    rx.mergeMap(async forkAction => {
      const waitWorkerAssignment = l.workerAssigned.pipe(
        rx.filter(([, aId]) => aId === assignId)
      );
      const assignId = o.dp.assignWorker();
      const [, , workerNo, worker] = await rx.firstValueFrom(waitWorkerAssignment);
      if (worker === 'main') {
        mainWorkerInput.core.actionUpstream.next(forkAction as Action<any>);
      } else {
        console.log('ensureInitWorker', workerNo);
        const initId = i.dp.ensureInitWorker(workerNo, worker);
        await rx.firstValueFrom(o.pt.workerInited.pipe(
          rx.map(([, , , id]) => id === initId)
        ));
        console.log('postMessage to worker', forkAction);
        worker.postMessage(serializeAction(forkAction), [forkAction.p[1]!]);
      }
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
  return ctx as unknown as Broker<WA>;
}

export type Broker<WA extends ActionFunctions = any> = ReactorComposite<BrokerInput, BrokerEvent & WA>;
