import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {createActionStreamByType} from '@wfh/redux-toolkit-observable/rx-utils';

type StreamControlOptions = NonNullable<Parameters<typeof createActionStreamByType>[0]>;

type PoolActions<T> = {
  addTask<R>(msg: T, cb: null | ((err: Error | null, content: WorkerMsgData<R>['content']) => void)): void;
  onTaskDone(worker: Worker, msg: WorkerMsgData<unknown>): void;
  onTaskError(worker: Worker, msg: any): void;
  createWorker(): void;
  _workerCreated(w: Worker): void;
  terminateAll(): void;
};

let SEQ = 0;
let TASK_SEQ = 0;
type WorkerMsgData<R> = {
  taskId: string;
  poolId: string;
  content: R;
};
/**
 * Features:
 *  - create new worker
 *  - subscribe to worker message
 *  - create a worker message sender
 */
export function createReactiveWorkerPool<T = any>(factory: () => rx.Observable<Worker>, opts: {
  concurrent: number;
  maxIdleWorkers?: number;
} & StreamControlOptions) {
  const idleWorkers: Worker[] = [];
  const allWorkers: Worker[] = [];
  const poolId = 'worker-pool:' + SEQ++;

  const {actionOfType, dispatcher} = createActionStreamByType<PoolActions<T>>(opts);
  // A singleton stream to control concurrency

  rx.merge(
    actionOfType('addTask').pipe(
      op.mergeMap(({payload: [task, cb]}) => {
        const taskId = poolId + ':' + TASK_SEQ++;
        const worker$ = idleWorkers.length > 0 ?
          rx.of(idleWorkers.pop()!)
          :
          rx.merge(
            actionOfType('_workerCreated').pipe(
              op.map(({payload}) => payload),
              op.take(1)
            ),
            rx.defer(() => {
              dispatcher.createWorker();
              return rx.EMPTY;
            })
          );

        return worker$.pipe(
          // Send task and wait for "onTaskDone"
          op.concatMap(worker => rx.merge(
            actionOfType('onTaskDone').pipe(
              op.filter(({payload: [w, res]}) => worker === w && res.taskId === taskId),
              op.take(1),
              op.takeUntil(actionOfType('onTaskError').pipe(
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                op.filter(({payload: [w, res]}) => worker === w && (res.taskId === taskId || res.taskId == null))
              ))
            ),
            rx.defer(() => {
              worker.postMessage({taskId, poolId, content: task} as WorkerMsgData<T>);
              return rx.EMPTY;
            })
          )),
          // Put worker back to idle list or terminate it
          op.map(({payload: [w, msg]}) => {
            if (idleWorkers.length >= (opts.maxIdleWorkers ?? Number.MAX_VALUE)) {
              w.terminate();
            } else {
              idleWorkers.push(w);
            }
            if (cb)
              cb(null, msg.content);
          })
        );
      }, opts.concurrent)
    ),

    actionOfType('createWorker').pipe(
      op.mergeMap(() => factory()),
      op.map(worker => {
        allWorkers.push(worker);
        worker.onmessage = event => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (event.data.poolId === poolId)
            dispatcher.onTaskDone(worker, event.data);
        };
        worker.onmessageerror = event => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          if (event.data.poolId === poolId)
            dispatcher.onTaskError(worker, event.data);
        };
        worker.onerror = event => {
          dispatcher.onTaskError(worker, event);
        };
        dispatcher._workerCreated(worker);
      })
    )
  ).subscribe();

  return {
    execute(msg: T) {
      return new Promise((resolve, reject) => {
        dispatcher.addTask(msg, (err, content) => {
          if (err)
            return reject(err);
          resolve(content);
        });
      });
    },

    terminateAll() {
      for (const w of allWorkers) {
        w.terminate();
        allWorkers.splice(0);
      }
    }
  };
}

