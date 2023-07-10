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

  addTaskForAllData<R>(
    msg: T,
    result: rx.Subscriber<WorkerMsgData<R>['content']>
  ): void;

  _addTaskToSpecificWorker<R>(
    workerNo: number,
    msg: T,
    cb: null | ((err: Error | null, content: WorkerMsgData<R>['content']) => void)
  ): void;

  onTaskDone(worker: number, msg: WorkerMsgData<unknown>): void;
  onTaskRun(worker: number, taskId: string): void;
  onWorkerError(worker: number, msg: any): void;
  createWorker(no: number): void;
  _workerCreated(w: Worker, workerNo: number): void;
  _workerIdle(w: number): void;
  terminateAll(): void;
};

let SEQ = 0;
let TASK_SEQ = 0;
export type WorkerMsgData<R = any> = {
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
  const workerByNo = new Map<number, Worker>();
  const idleWorkers = new Set<number>();
  const poolId = (SEQ++).toString(16);
  let workerSeq = 0;
  const workerByDataKey = new Map<string, number>();
  const dataWorkerSet = new Set<number>();
  const taskById = new Map<string, {task: T; cb: TaskCallback}>();
  /** Queued tasks which has "dataKey" to specific worker */
  const tasksForAssignedWorker = new Map<number, string[]>();

  const {actionByType, payloadByType, dispatcher} = createActionStreamByType<PoolActions<T>>(opts);

  // Handle `addTask` and `addTaskForPatitionData`,
  // use `mergeMap(, concurrent) to controll number of parallel "non-idle" workers
  rx.merge(
    rx.merge(
      payloadByType.addTaskForPatitionData.pipe(
        op.map(([key, task, cb]) => [key, null, task, cb] as const)
      ),
      payloadByType.addTask.pipe(
        op.map((payload) => ([null, null, ...payload] as const))
      ),
      payloadByType._addTaskToSpecificWorker.pipe(
        op.map(([worker, task, cb]) => {
          return [null, worker, task, cb] as const;
        })
      )
    ).pipe(
      op.mergeMap(([dataKey, worker, task, cb]) => {
        const taskId = poolId + '/T' + (TASK_SEQ++).toString(16);
        taskById.set(taskId, {task, cb});
        return assignWorker(taskId, dataKey, worker).pipe(
          waitForWorkerIdle(taskId, task)
        );
      }, opts.concurrent)
    ),

    payloadByType.addTaskForAllData.pipe(
      op.mergeMap(([task, sub]) => {
        const callbackSub = new rx.Subject<any>();
        return rx.merge(
          // collect all callbacks to array
          callbackSub.pipe(
            op.take(dataWorkerSet.size),
            op.map(content => {
              sub.next(content);
            }),
            op.catchError(err => { sub.error(err); return rx.EMPTY; }),
            op.finalize(() => sub.complete())
          ),
          rx.defer(() => {
            for (const worker of dataWorkerSet) {
              dispatcher._addTaskToSpecificWorker(
                worker, task,
                (err, content) => {
                  if (err)
                    callbackSub.error(err);
                  else {
                    callbackSub.next(content);
                  }
                }
              );
            }
            return rx.EMPTY;
          })
        );
      })
    ),

    // Create new worker, register event listerners on worker
    actionByType.createWorker.pipe(
      op.mergeMap(({payload: workerNo}) => factory().pipe(
        op.mergeMap(worker => {
          const ready$ = new rx.ReplaySubject<[workerNo: number, worker: Worker]>(1);
          workerByNo.set(workerNo, worker);

          worker.onmessage = event => {
            if ((event.data as {type: string}).type === 'WORKER_READY') {
              ready$.next([workerNo, worker]);
              ready$.complete();
            } else if ((event.data as {error?: any}).error) {
              dispatcher.onWorkerError(workerNo, (event.data as {error?: any}).error);
            } else {
              dispatcher.onTaskDone(workerNo, event.data);
            }
          };
          worker.onmessageerror = event => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (event.data.poolId === poolId)
              dispatcher.onWorkerError(workerNo, event.data);
          };
          worker.onerror = event => {
            dispatcher.onWorkerError(workerNo, event);
          };
          worker.postMessage({type: 'ASSIGN_WORKER_NO', data: workerNo});
          return ready$;
        })
      )),
      op.map(([workerNo, worker]) => {
        dispatcher._workerCreated(worker, workerNo);
      })
    ),

    // Observe `onTaskRun` event,
    // when current worker encounters error
    // or that task is finished,
    // - call `callback` function for that task
    // - Remove task from queque
    // - check if there is more task waiting in queue and run it
    // - set task to "idle"
    actionByType.onTaskRun.pipe(
      op.mergeMap(({payload: [worker, taskId]}) => {
        const taskData = taskById.get(taskId);

        return rx.merge(
          payloadByType.onWorkerError.pipe(
            op.filter(([w]) => w === worker),
            op.map(([w, msg]) => {
              if (taskData) {
                if (taskData.cb) {
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                  msg.workerNo = w;
                  taskData?.cb(msg instanceof Error ? msg : new Error(msg), msg);
                }
                taskById.delete(taskId);
              }
            })
          ),
          payloadByType.onTaskDone.pipe(
            op.filter(([w]) => w === worker),
            op.map(([, msg]) => {
              if (taskData) {
                if (taskData.cb)
                  taskData?.cb(null, msg);
                taskById.delete(taskId);
              }
            })
          )
        ).pipe(
          op.take(1),
          op.map(() => {
            const queue = tasksForAssignedWorker.get(worker);
            if (queue && queue.length > 0) {
              const taskId = queue.shift()!;
              dispatcher.onTaskRun(worker, taskId);
              const msg = {taskId, poolId, content: taskById.get(taskId)!.task} as WorkerMsgData<T>;
              // eslint-disable-next-line no-console
              console.log('worker pool postMessage for assigned', msg);
              workerByNo.get(worker)?.postMessage(msg);
            } else {
              dispatcher._workerIdle(worker);
            }
          })
        );
      })
    ),

    // Once a task is `idle`, check options about whether it should be terminated to release thread resource
    actionByType._workerIdle.pipe(
      op.map(({payload: w}) => {
        if (idleWorkers.size >= (opts.maxIdleWorkers ?? Number.MAX_VALUE) && !dataWorkerSet.has(w)) {
          workerByNo.get(w)?.terminate();
        } else {
          idleWorkers.add(w);
        }
      })
    )
  ).pipe(
    op.catchError((err, src) => {
      console.error(err);
      return src;
    })
  ).subscribe();

  /** @return Observable<Worker> or rx.EMPTY if the worker is in-progress
   */
  function assignWorker(
    taskId: string,
    dataKey: string | number | null,
    workerNo?: number | null
  ): rx.Observable<number> {

    const key = dataKey ? dataKey + '' : null;
    workerNo = workerNo ?? (key != null ? workerByDataKey.get(key) : null);
    if (workerNo != null) {
      // There is previously assigned worker
      if (idleWorkers.has(workerNo)) {
        // The worker is idle
        idleWorkers.delete(workerNo);
        return rx.of(workerNo);
      } else {
        // But the worker is busy
        let queue = tasksForAssignedWorker.get(workerNo);
        if (queue == null) {
          queue = [];
          tasksForAssignedWorker.set(workerNo, queue);
        }
        queue.push(taskId);
        return rx.EMPTY;
      }

    } else if (idleWorkers.size > 0) {
      const no = idleWorkers.values().next().value as number;
      idleWorkers.delete(no);
      if (key) {
        workerByDataKey.set(key, no);
        dataWorkerSet.add(no);
      }
      return rx.of(no);
    } else {
      const newWorkerNo = workerSeq++;
      // Create a new worker and associate it with dataKey
      return rx.merge(
        actionByType._workerCreated.pipe(
          op.filter(({payload: [w, no]}) => no === newWorkerNo),
          op.take(1),
          op.map(({payload: [, no]}) => {
            if (key) {
              workerByDataKey.set(key, no);
              dataWorkerSet.add(no);
            }
            return no;
          })
        ),
        rx.defer(() => {
          dispatcher.createWorker(newWorkerNo);
          return rx.EMPTY;
        })
      );
    }
  }

  function waitForWorkerIdle(taskId: string, taskMsg: T) {
    return function(worker$: rx.Observable<number>) {
      return worker$.pipe(
        // wait for `_workerIdle`
        op.mergeMap(worker => rx.merge(
          actionByType._workerIdle.pipe(
            op.filter(({payload: w}) => worker === w),
            op.take(1)
          ),
          rx.defer(() => {
            dispatcher.onTaskRun(worker, taskId);
            const msg = {taskId, poolId, content: taskMsg} as WorkerMsgData<T>;
            // eslint-disable-next-line no-console
            console.log('worker pool postMessage', msg);
            workerByNo.get(worker)?.postMessage(msg);
            return rx.EMPTY;
          })
        ))
      );
    };
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

    executeForKey(msg: T, dataKey: string | number) {
      return new Promise((resolve, reject) => {
        dispatcher.addTaskForPatitionData(dataKey, msg, (err, content) => {
          if (err)
            return reject(err);
          resolve(content);
        });
      });
    },

    executeAllWorker(msg: T) {
      return new rx.Observable<WorkerMsgData<T>['content']>(sub => {
        dispatcher.addTaskForAllData(msg, sub);
      });
    },

    terminateAll() {
      for (const [no, w] of workerByNo) {
        w.terminate();
        workerByNo.delete(no);
      }
    }
  };
}

