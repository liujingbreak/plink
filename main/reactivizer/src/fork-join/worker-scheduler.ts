import type {Worker as NodeWorker} from 'node:worker_threads';
import * as algorithms from '@wfh/algorithms';
import * as rx from 'rxjs';
import {ActionMeta} from '../stream-core';
import {SimplexReactor} from '../simplex-reactor';
import {Broker, BrokerInput, BrokerEvent, brokerOutputTableFor, ThreadExpirationEvents} from './types';

export function applyScheduler(broker: Broker<any>, opts: {
  maxNumOfWorker: number;
  /** Default `false`, in which case the current thread (main) will also be assigned for tasks */
  excludeCurrentThead?: boolean;
  /** Once forked thread has become idle for specific milliseconds,
  * let worker thread (or web worker) "exit" (unsubscribed from parent port),
  * value of `undefined` stands for "never expired"
  */
  threadMaxIdleTime?: number;
  workerFactory(): Worker | NodeWorker;
}) {
  let WORKER_NO_SEQ = 0;
  const brokerForSchedule = broker as unknown as
    SimplexReactor<BrokerInput & BrokerEvent & ThreadExpirationEvents,
    typeof brokerOutputTableFor>;
  const {r, table} = brokerForSchedule;
  let algo: typeof algorithms;
  try {
    algo = require('@wfh/algorithms') as typeof algorithms;
  } catch (e) {
    // Inside Plink
    algo = require('../../../algorithms') as typeof algorithms;
  }
  const s = brokerForSchedule.s.prependController();
  const {RedBlackTree} = algo;
  const workerRankTree = new RedBlackTree<number, number[]>();
  /** Indicate how busy each thread is */
  const ranksByWorkerNo = new Map<number, [worker: Worker | NodeWorker | 'main', rank: number, workerNo: number]>();
  /** Used to check if current workerr can be terminated later */
  const tasksByWorkerNo = new Map<number, [worker: Worker | NodeWorker | 'main', numTasks: number, workerNo: number]>();

  const {maxNumOfWorker} = opts;
  r('assignWorker -> workerAssigned', s.pt.assignWorker.pipe(
    rx.map(([m]) => {
      try {
        const minTreeNode = workerRankTree.minimum();
        if (minTreeNode && (minTreeNode.key === 0 ||
           ranksByWorkerNo.size >= maxNumOfWorker)) {
          const workerNo = minTreeNode.value[0];
          if (ranksByWorkerNo.get(workerNo) == null)
            throw new Error('ranksByWorkerNo has null for ' + workerNo);

          const [worker] = ranksByWorkerNo.get(workerNo)!;
          s.ft.workerAssigned(minTreeNode.value[0], worker, false, minTreeNode.key).dp(m);
        } else if (ranksByWorkerNo.size < maxNumOfWorker) {
          const newWorker = (ranksByWorkerNo.size === 0 && opts.excludeCurrentThead !== true) ? 'main' : opts.workerFactory();
          if (newWorker !== 'main' && WORKER_NO_SEQ === 0) {
            WORKER_NO_SEQ = 1; // 0 is always for "main"
          }
          s.ft.workerAssigned(WORKER_NO_SEQ, newWorker, true, 0).dp(m);
          WORKER_NO_SEQ++;
        }
      } catch (e) {
        broker.dispatchErrorFor(e, m);
      }
    })
  ));

  r('workerAssigned -> changeWorkerRank()', s.pt.workerAssigned.pipe(
    rx.map(([m, workerNo, newWorker, isNew]) => {
      if (opts.excludeCurrentThead === true && newWorker === 'main')
        return;
      if (isNew) {
        ranksByWorkerNo.set(workerNo, [newWorker, 0, workerNo]);
        tasksByWorkerNo.set(workerNo, [newWorker, 0, workerNo]);
        const tnode = workerRankTree.insert(1);
        if (tnode.value) {
          tnode.value.push(workerNo);
        } else {
          tnode.value = [workerNo];
        }
      }
      changeWorkerRank(workerNo, 1);
      const tasks = tasksByWorkerNo.get(workerNo)!;
      tasks[1]++;
      checkNumOfTasks(m, workerNo, tasks[1]);
    })
  ));

  r('newWorkerReady, workerOutputCtl.pt.stopWaiting... -> changeWorkerRank()',
    table.l.allReadyWorkers.pipe(
      rx.switchMap(([, worker$]) => worker$),
      rx.mergeMap(([workerNo, workerOutputCtl]) => rx.merge(
        workerOutputCtl.pt.stopWaiting.pipe(
          rx.tap(() => changeWorkerRank(workerNo, 1)),
          broker.labelError(`worker #${workerNo} stopWaiting -> ...`)
        ),
        workerOutputCtl.pt.wait.pipe(
          rx.tap(() => changeWorkerRank(workerNo, -1)),
          broker.labelError(`worker #${workerNo} wait`)
        ),
        workerOutputCtl.pt.returned.pipe(
          rx.tap(([m]) => {
            changeWorkerRank(workerNo, -1);
            const taskCount = tasksByWorkerNo.get(workerNo);
            if (taskCount) {
              taskCount[1]--;
              checkNumOfTasks(m, workerNo, taskCount[1]);
            } // In case of "excludeCurrentThead", `main` thread is not assigned, tasksByWorkerNo does not contain `workerNo` 0
          }),
          broker.labelError(`worker #${workerNo} returned`)
        )
      ))
    ));

  r('letWorkerExit', s.pt.letWorkerExit.pipe(
    rx.tap(([, workerNo]) => {
      if (ranksByWorkerNo.has(workerNo)) {
        const [, rank] = ranksByWorkerNo.get(workerNo)!;
        ranksByWorkerNo.delete(workerNo);
        const tnode = workerRankTree.search(rank);
        if (tnode) {
          const idx = tnode.value.indexOf(workerNo);
          if (idx >= 0) {
            tnode.value.splice(idx, 1);
            if (tnode.value.length === 0) {
              workerRankTree.deleteNode(tnode);
            }
          }
        }
      }
      if (tasksByWorkerNo.has(workerNo)) {
        tasksByWorkerNo.delete(workerNo);
      }
    })
  ));

  r('letAllWorkerExit', s.at.letAllWorkerExit.pipe(
    rx.exhaustMap(a => {
      let exitCount = 0;
      for (const [worker, , workerNo] of ranksByWorkerNo.values()) {
        if (worker !== 'main') {
          s.ft.letWorkerExit(workerNo).dp(a);
          exitCount++;
        }
      }
      return rx.concat(
        s.at.onWorkerExit.pipe(
          rx.take(exitCount)
        ),
        new rx.Observable((sub) => {
          s.ft.onAllWorkerExit().dp(a);
          sub.complete();
        })
      );
    })
  ));

  r('startExpirationTimer -> letWorkerExit', s.subForTypes(['startExpirationTimer', 'clearExpirationTimer'] as const).groupControllerBy(({p: [workerNo]}) => workerNo).pipe(
    rx.mergeMap(([grouped]) => grouped.pt.startExpirationTimer.pipe(
      rx.switchMap(([m, workerNo]) => rx.timer(opts.threadMaxIdleTime!).pipe(
        rx.takeUntil(grouped.at.clearExpirationTimer),
        rx.tap(() => {
          const [worker] = ranksByWorkerNo.get(workerNo)!;
          if (worker !== 'main') {
            s.ft.letWorkerExit(workerNo).dp(m);
          }
        })
      ))
    ))
  ));

  r('onWorkerExit', s.pt.onWorkerExit.pipe(
    rx.tap(([m, workerNo]) => s.ft.clearExpirationTimer(workerNo).dp(m))
  ));

  function changeWorkerRank(workerNo: number, changeValue: number) {
    const entry = ranksByWorkerNo.get(workerNo)!;
    if (entry == null) // In case of "excludeCurrentThead", `main` thread is not assigned, tasksByWorkerNo does not contain `workerNo` 0
      return;

    const [, rank] = entry;
    const newRank = rank + changeValue;
    entry[1] = newRank;

    const node = workerRankTree.search(rank);
    if (node) {
      const idx = node.value.indexOf(workerNo);
      node.value.splice(idx, 1);
      if (node.value.length === 0)
        workerRankTree.deleteNode(node);
      const tnode = workerRankTree.insert(newRank);
      if (tnode.value)
        tnode.value.push(workerNo);
      else
        tnode.value = [workerNo];
    }
  }

  function checkNumOfTasks(actionMeta: ActionMeta, workerNo: number, numTasks: number) {
    s.ft.workerRankChanged(workerNo, numTasks).dp();
    if (workerNo !== 0 && opts.threadMaxIdleTime != null) {
      if (numTasks === 0)
        s.ft.startExpirationTimer(workerNo).dp(actionMeta);
      else if (numTasks > 0)
        s.ft.clearExpirationTimer(workerNo).dp(actionMeta);
      else {
        throw new Error(`Current thread worker #${workerNo} is ranked to a negative work load value ${numTasks},` +
          ' it could also caused by an unexpected error');
      }
    }
  }
  s.ft.workerAssigned(0, 'main', true, 0).dp(); // Always rank busy level of main thread starting from 1, so that the real first assignment can go to other thread
  return {ranksByWorkerNo, tasksByWorkerNo};
}
