import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {createActionStreamByType, ActionStreamControl} from '@wfh/redux-toolkit-observable/rx-utils';
import {ForkWorkerPoolActions, WorkerEvent} from './worker-impl-util';

type ForkWorkerActions = {
  createWorker(workNo: number): void;
  workerCrearted(workerNo: number, worker: Worker): void;
  onWorkerError(worker: number, msg: any): void;
};

type StreamControlOptions = NonNullable<Parameters<typeof createActionStreamByType>[0]>;

let SEQ = 0;
/**
 * Fork worker pool is different from original worker poll about below features
 * - Pool can create and assign tasks to worker without waiting for worker finishing previous task
 * - Worker can itself fork new task to pool
 *   - Another or same worker can send response of task finishing message back to specific worker through pool
 * - TODO: try minimize duplicate transferred message data
 */
export function createForkWorkerPool(factory: () => rx.Observable<Worker>, opts: {
  concurrent: number;
} & StreamControlOptions) {
  const control = createActionStreamByType<ForkWorkerActions & ForkWorkerPoolActions & WorkerEvent>(opts);
  const {payloadByType, dispatcher, _actionFromObject, _actionToObject, actionByType: abt} = control;
  const workerByNo = new Map<number, Worker>();
  const msgPortByNo = new Map<number, MessagePort>();
  const idleWorkers = new Set<number>();
  const workerLoad = new Map<number, number>();
  let minLoadWorkerNo = -1;
  let workerSeq = 1; // 0 is for master worker

  const poolId = (SEQ++).toString(16);

  rx.merge(
    payloadByType.createWorker.pipe(
      op.mergeMap(workerNo => factory().pipe(op.map(worker => [workerNo, worker] as const))),
      op.mergeMap(([workerNo, worker]) => {
        const ready$ = new rx.ReplaySubject<[workerNo: number, worker: Worker]>(1);
        workerByNo.set(workerNo, worker);
        const chan = new MessageChannel();
        msgPortByNo.set(workerNo, chan.port1);
        workerLoad.set(workerNo, 0);

        chan.port1.onmessage = event => {
          if ((event.data as {type: string}).type === 'WORKER_READY') {
            ready$.next([workerNo, worker]);
            ready$.complete();
          } else if ((event.data as {error?: any}).error) {
            dispatcher.onWorkerError(
              workerNo,
              (event.data as {error?: any}).error
            );
          } else {
            _actionFromObject(event.data);
            // dispatcher.onTaskDone(workerNo, event.data);
          }
        };
        chan.port1.onmessageerror = event => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (event.data.poolId === poolId)
            dispatcher.onWorkerError(workerNo, event.data);
        };
        chan.port1.start();
        worker.postMessage({type: 'ASSIGN_WORKER_NO', data: workerNo, port: chan.port2}, [chan.port2]);
        return ready$;
      }),
      op.map(([workerNo, worker]) => {
        dispatcher.workerCrearted(workerNo, worker);
      })
    ),

    payloadByType.fork.pipe(
      op.mergeMap(([returnPort, fromWorker, forkAction]) => {
        if (idleWorkers.size > 0) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const workerNo = idleWorkers.values().next().value as number;
          return rx.of([returnPort, workerNo, workerByNo.get(workerNo)!, forkAction] as const);
        } else if (workerByNo.size < opts.concurrent) {
          dispatcher.createWorker(workerSeq++);
          return rx.merge(
            payloadByType.workerCrearted.pipe(
              op.take(1),
              // eslint-disable-next-line @typescript-eslint/no-unsafe-return
              op.map(p => [returnPort, ...p, forkAction] as const)
            ),
            new rx.Observable<never>(sub => {
              dispatcher.createWorker(workerSeq++);
              sub.complete();
            })
          );
        } else {
          return rx.of([returnPort, minLoadWorkerNo, workerByNo.get(minLoadWorkerNo)!, forkAction] as const);
        }
      }),
      op.concatMap(([returnPort, toWorker, worker, forkAction]) => {
        return rx.merge(
          abt.onForkedFor.pipe(
            op.take(1),
            op.map(a => {
              const obj = _actionToObject(a);
              worker.postMessage({
                content: obj
              }, [obj.p[0] as MessagePort]);
            })
          ),
          new rx.Observable<never>(sub => {
            dispatcher.onForkedFor(returnPort, forkAction);
            sub.complete();
          })
        );
      })
    )
  ).subscribe();

  return control as ActionStreamControl<ForkWorkerPoolActions>;
}
