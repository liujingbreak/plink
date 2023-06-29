import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {createActionStreamByType} from '@wfh/redux-toolkit-observable/rx-utils';

type StreamControlOptions = NonNullable<Parameters<typeof createActionStreamByType>[0]>;

type PoolActions<T> = {
  addTask<R>(msg: T, cb: null | ((err: Error | null, content: WorkerMsgData<R>['content']) => void)): void;
  addTaskForPatitionData<R>(
    dataPartitionKey: string | number,
    msg: T,
    cb: null | ((err: Error | null, content: WorkerMsgData<R>['content']) => void)): void;

  onTaskDone(worker: Worker, msg: WorkerMsgData<unknown>): void;
  onTaskRun(worker: Worker, taskId: string): void;
  onTaskError(worker: Worker, msg: any): void;
  createWorker(): void;
  _workerCreated(w: Worker): void;
  _workerIdle(w: Worker): void;
  terminateAll(): void;
};

let SEQ = 0;
let TASK_SEQ = 0;
type WorkerMsgData<R> = {
  taskId: string;
  poolId: string;
  content: R;
};

type TaskCallback = Parameters<PoolActions<any>['addTaskForPatitionData']>[2];
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
  const idleWorkers = new Set<Worker>();
  const allWorkers: Worker[] = [];
  const poolId = 'worker-pool:' + SEQ++;
  const workerByDataKey = new Map<string, Worker>();
  const dataWorkerSet = new Set<Worker>();
  const taskById = new Map<string, {task: T; cb: TaskCallback}>();
  /** Queued tasks which has "dataKey" to specific worker */
  const tasksForAssignedWorker = new Map<Worker, string[]>();

  const {actionByType, dispatcher} = createActionStreamByType<PoolActions<T>>(opts);
  // A singleton stream to control concurrency

  rx.merge(
    rx.merge(
      actionByType.addTaskForPatitionData.pipe(
        op.map(({payload}) => payload)
      ),
      actionByType.addTask.pipe(
        op.map(({payload}) => ([null, ...payload] as const))
      )
    ).pipe(
      op.mergeMap(([dataKey, task, cb]) => {
        const taskId = poolId + ':' + TASK_SEQ++;
        taskById.set(taskId, {task, cb});
        const worker$ = assignWorker(dataKey, taskId);

        return worker$.pipe(
          // wait for `_workerIdle`
          op.concatMap(worker => rx.merge(
            actionByType._workerIdle.pipe(
              op.filter(({payload: w}) => worker === w),
              // op.takeUntil(actionByType.onTaskError.pipe(
              //   // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              //   op.filter(({payload: [w, res]}) => worker === w && (res.taskId === taskId || res.taskId == null))
              // ))
            ),
            rx.defer(() => {
              dispatcher.onTaskRun(worker, taskId);
              worker.postMessage({taskId, poolId, content: task} as WorkerMsgData<T>);
              return rx.EMPTY;
            })
          ))
        );
      }, opts.concurrent)
    ),

    actionByType.createWorker.pipe(
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
    ),

    actionByType.onTaskDone.pipe(
      op.map(({payload: [w, msg]}) => {
        const taskData = taskById.get(msg.taskId);
        if (taskData) {
          if (taskData.cb)
            taskData?.cb(null, msg);
          taskById.delete(msg.taskId);
        }
        const queue = tasksForAssignedWorker.get(w);
        if (queue && queue.length > 0) {
          const taskId = queue.shift()!;
          dispatcher.onTaskRun(w, taskId);
          w.postMessage({taskId, poolId, content: taskById.get(taskId)!.task} as WorkerMsgData<T>);
        } else {
          dispatcher._workerIdle(w);
        }
      })
    ),

    actionByType._workerIdle.pipe(
      op.map(({payload: w}) => {
        if (idleWorkers.size >= (opts.maxIdleWorkers ?? Number.MAX_VALUE) && !dataWorkerSet.has(w)) {
          w.terminate();
        } else {
          idleWorkers.add(w);
        }
      })
    )
  ).subscribe();

  function assignWorker(
    dataKey: string | number | null,
    taskId: string
  ): rx.Observable<Worker> {

    if (dataKey != null) {
      const key = dataKey + '';
      const worker = workerByDataKey.get(key);
      if (worker) {
        // There is previously assigned worker
        if (idleWorkers.has(worker)) {
          // The worker is idle
          idleWorkers.delete(worker);
          return rx.of(worker);
        } else {
          // But the worker is busy
          let queue = tasksForAssignedWorker.get(worker);
          if (queue == null) {
            queue = [];
            tasksForAssignedWorker.set(worker, queue);
          }
          queue.push(taskId);
          return rx.EMPTY;
        }

      } else {
        // Create a new worker and associate it with dataKey
        return rx.merge(
          actionByType._workerCreated.pipe(
            op.take(1),
            op.map(({payload: worker}) => {
              workerByDataKey.set(key, worker);
              dataWorkerSet.add(worker);
              return worker;
            })
          ),
          rx.defer(() => {
            dispatcher.createWorker();
            return rx.EMPTY;
          })
        );
      }

    } else {
      if (idleWorkers.size > 0) {
        const worker = idleWorkers.values().next().value as Worker;
        idleWorkers.delete(worker);
        return rx.of(worker);
      } else {
        return rx.merge(
          actionByType._workerCreated.pipe(
            op.take(1),
            op.map(({payload}) => payload)
          ),
          rx.defer(() => {
            dispatcher.createWorker();
            return rx.EMPTY;
          })
        );
      }
    }
  }

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

    executeStatefully(msg: T, dataKey: string | number) {
      return new Promise((resolve, reject) => {
        dispatcher.addTaskForPatitionData(dataKey, msg, (err, content) => {
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

