import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {createActionStreamByType} from '@wfh/redux-toolkit-observable/rx-utils';

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
  const {payloadByType, dispatcher} = createActionStreamByType<ForkWorkerActions>(opts);
  const workerByNo = new Map<number, Worker>();
  const msgPortByNo = new Map<number, MessagePort>();
  const poolId = (SEQ++).toString(16);

  rx.merge(
    payloadByType.createWorker.pipe(
      op.mergeMap(workerNo => factory().pipe(op.map(worker => [workerNo, worker] as const))),
      op.map(([workerNo, worker]) => {
        const ready$ = new rx.ReplaySubject<[workerNo: number, worker: Worker]>(1);
        workerByNo.set(workerNo, worker);
        const chan = new MessageChannel();
        msgPortByNo.set(workerNo, chan.port1);

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
            dispatcher.onTaskDone(workerNo, event.data);
          }
        };
        chan.port1.onmessageerror = event => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (event.data.poolId === poolId)
            dispatcher.onWorkerError(workerNo, event.data);
        };
        chan.port1.start();
        // chan.port1.onerror = event => {
        //   dispatcher.onWorkerError(workerNo, event);
        // };
        worker.postMessage({type: 'ASSIGN_WORKER_NO', data: workerNo, port: chan.port2}, [chan.port2]);
        return ready$;
      })
    )
  ).subscribe();
}
