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
    minWorkers: number,
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
  _dataWorkerAdded(no: number): void;
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
  const msgPortByNo = new Map<number, MessagePort>();
  const idleWorkers = new Set<number>();
  const poolId = (SEQ++).toString(16);
  let workerSeq = 0;
  const workerByDataKey = new Map<string, number>();
  const dataWorkerSet = new Set<number>();
  const taskById = new Map<string, {task: T; key?: string; cb: TaskCallback}>();
  /** Queued tasks which has "dataKey" to specific worker */
  const tasksForAssignedWorker = new Map<number, string[]>();

  const {actionByType, payloadByType, dispatcher} =
    createActionStreamByType<PoolActions<T>>(opts);

  // Handle `addTask` and `addTaskForPatitionData`,
  // use `mergeMap(, concurrent) to controll number of parallel "non-idle" workers
  rx.merge(
    rx.merge(
      payloadByType.addTaskForPatitionData.pipe(
        op.map(([key, task, cb]) => [key, null, task, cb] as const)
      ),
      payloadByType.addTask.pipe(
        op.map(payload => [null, null, ...payload] as const)
      ),
      payloadByType._addTaskToSpecificWorker.pipe(
        op.map(([worker, task, cb]) => {
          return [null, worker, task, cb] as const;
        })
      )
    ).pipe(
      op.mergeMap(([dataKey, worker, task, cb]) => {
        const taskId = poolId + '/T' + (TASK_SEQ++).toString(16);
        taskById.set(taskId, {task, cb, key: dataKey != null ? dataKey + '' : undefined});
        return assignWorker(taskId, dataKey, worker).pipe(
          waitForWorkerIdle(taskId, task)
        );
      }, opts.concurrent)
    ),

    payloadByType.addTaskForAllData.pipe(
      op.mergeMap(([task, minWorkers, sub]) => {
        const callbackSub = new rx.Subject<any>();
        return rx.merge(
          // Collect all callbacks to array
          callbackSub.pipe(
            op.take(minWorkers),
            op.map(content => {
              sub.next(content);
            }),
            op.catchError(err => {
              sub.error(err);
              return rx.EMPTY;
            }),
            op.finalize(() => sub.complete())
          ),
          // Wait for number of dataWorker being greater than `minWorkers`,
          // then emit `dispatcher._addTaskToSpecificWorker`
          rx.concat(
            rx.defer(() => rx.of(dataWorkerSet.size)),
            payloadByType._dataWorkerAdded.pipe(op.map(() => dataWorkerSet.size))
          ).pipe(
            op.filter(size => size >= minWorkers),
            op.take(1),
            op.map(() => {
              for (const worker of dataWorkerSet) {
                dispatcher._addTaskToSpecificWorker(
                  worker,
                  task,
                  (err, content) => {
                    if (err) callbackSub.error(err);
                    else {
                      callbackSub.next(content);
                    }
                  }
                );
              }
            })
          )
        );
      })
    ),

    // Create new worker, register event listerners on worker
    payloadByType.createWorker.pipe(
      op.mergeMap(workerNo =>
        factory().pipe(
          op.mergeMap(worker => {
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
      ),
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
    payloadByType.onTaskRun.pipe(
      op.mergeMap(([worker, taskId]) => {
        const taskData = taskById.get(taskId);

        return rx
          .merge(
            payloadByType.onWorkerError.pipe(
              op.filter(([w]) => w === worker),
              op.map(([w, msg]) => {
                if (taskData) {
                  if (taskData.cb) {
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                    msg.workerNo = w;
                    taskData?.cb(
                      msg instanceof Error ? msg : new Error(msg),
                      msg
                    );
                  }
                  taskById.delete(taskId);
                }
              })
            ),
            payloadByType.onTaskDone.pipe(
              op.filter(([w]) => w === worker),
              op.map(([, msg]) => {
                if (taskData) {
                  if (taskData.cb) taskData?.cb(null, msg);
                  taskById.delete(taskId);
                }
              })
            ),
            rx.timer(5000).pipe(
              op.map(() => {
                console.error(`worker ${worker} timeout, terminating it`);
                throw new Error(`worker ${worker} timeout, terminating it`);
              })
            )
          )
          .pipe(
            op.take(1),
            op.map(() => {
              const queue = tasksForAssignedWorker.get(worker);
              if (queue && queue.length > 0) {
                const taskId = queue.shift()!;
                dispatcher.onTaskRun(worker, taskId);
                const msg = {
                  taskId,
                  poolId,
                  content: taskById.get(taskId)!.task
                } as WorkerMsgData<T>;
                // eslint-disable-next-line no-console
                console.log('worker pool postMessage for assigned', msg);
                msgPortByNo.get(worker)?.postMessage(msg);
              } else {
                dispatcher._workerIdle(worker);
              }
            }),
            op.catchError((err, src) => {
              const workerObj = workerByNo.get(worker);
              workerObj?.terminate();
              msgPortByNo.get(worker)?.close();
              msgPortByNo.delete(worker);
              workerByNo.delete(worker);
              dataWorkerSet.delete(worker);
              for (const [key, workerNo] of workerByDataKey.entries()) {
                if (workerNo === worker) {
                  workerByDataKey.delete(key);
                }
              }
              const remainingTasks = tasksForAssignedWorker.get(worker);
              tasksForAssignedWorker.delete(worker);
              dispatcher.onWorkerError(worker, 'task timeout: ' + taskId);
              if (remainingTasks) {
                for (const taskId of remainingTasks) {
                  const taskEntry = taskById.get(taskId);
                  if (taskEntry?.key) {
                    dispatcher.addTaskForPatitionData(taskEntry.key, taskEntry.task, taskEntry.cb);
                  } else if (taskEntry) {
                    dispatcher.addTask(taskEntry.task, taskEntry.cb);
                  }
                }
              }
              return rx.EMPTY;
            })
          );
      })
    ),

    // Once a task is `idle`, check options about whether it should be terminated to release thread resource
    payloadByType._workerIdle.pipe(
      op.map(w => {
        if (
          idleWorkers.size >= (opts.maxIdleWorkers ?? Number.MAX_VALUE) &&
          !dataWorkerSet.has(w)
        ) {
          workerByNo.get(w)?.terminate();
          msgPortByNo.get(w)?.close();
          workerByNo.delete(w);
          msgPortByNo.delete(w);
        } else {
          idleWorkers.add(w);
        }
      })
    )
  )
    .pipe(
      op.catchError((err, _src) => {
        console.error(err);
        throw err;
      })
    )
    .subscribe();

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
        if (!dataWorkerSet.has(no)) {
          dataWorkerSet.add(no);
          dispatcher._dataWorkerAdded(no);
        }
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
              if (!dataWorkerSet.has(no)) {
                dataWorkerSet.add(no);
                dispatcher._dataWorkerAdded(no);
              }
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
        op.mergeMap(worker =>
          rx
            .merge(
              payloadByType._workerIdle.pipe(op.filter(no => worker === no)),
              payloadByType.onWorkerError.pipe(
                op.filter(([no]) => worker === no)
              ),
              rx.defer(() => {
                dispatcher.onTaskRun(worker, taskId);
                const msg = {
                  taskId,
                  poolId,
                  content: taskMsg
                } as WorkerMsgData<T>;
                // eslint-disable-next-line no-console
                console.log('worker pool postMessage', msg);
                msgPortByNo.get(worker)?.postMessage(msg);
                return rx.EMPTY;
              })
            )
            .pipe(op.take(1))
        )
      );
    };
  }

  return {
    execute(msg: T) {
      return new Promise((resolve, reject) => {
        dispatcher.addTask(msg, (err, content) => {
          if (err) return reject(err);
          resolve(content);
        });
      });
    },

    executeForKey(msg: T, dataKey: string | number) {
      return new Promise((resolve, reject) => {
        dispatcher.addTaskForPatitionData(dataKey, msg, (err, content) => {
          if (err) return reject(err);
          resolve(content);
        });
      });
    },

    executeAllWorker(msg: T, minumNumOfWorker: number) {
      return new rx.Observable<WorkerMsgData<T>['content']>(sub => {
        dispatcher.addTaskForAllData(msg, minumNumOfWorker, sub);
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

