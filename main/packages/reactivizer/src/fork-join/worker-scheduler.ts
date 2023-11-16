import type {Worker as NodeWorker} from 'node:worker_threads';
import * as algorithms from '@wfh/algorithms';
import * as rx from 'rxjs';
import {Broker} from './types';

export function applyScheduler(broker: Broker, opts: {
  maxNumOfWorker: number;
  /** Default `false`, in which case the current thread (main) will also be assigned for tasks */
  excludeCurrentThead?: boolean;
  workerFactory(): Worker | NodeWorker;
}) {
  let WORKER_NO_SEQ = 0;
  const {r, o, i, outputTable} = broker;
  let algo: typeof algorithms;
  try {
    algo = require('@wfh/algorithms') as typeof algorithms;
  } catch (e) {
    // Inside Plink
    algo = require('../../packages/algorithms') as typeof algorithms;
  }
  const {RedBlackTree} = algo;
  const workerRankTree = new RedBlackTree<number, number[]>();
  const ranksByWorkerNo = new Map<number, [worker: Worker | NodeWorker | 'main', rank: number]>();

  let {maxNumOfWorker} = opts;
  if (opts.excludeCurrentThead === true) {
    maxNumOfWorker--;
  }

  r('assignWorker -> workerAssigned', outputTable.l.assignWorker.pipe(
    rx.map(([m]) => {
      if (ranksByWorkerNo.size < maxNumOfWorker) {
        const newWorker = (ranksByWorkerNo.size === 0 && opts.excludeCurrentThead !== true) ? 'main' : opts.workerFactory();
        ranksByWorkerNo.set(WORKER_NO_SEQ, [newWorker, 0]);
        const tnode = workerRankTree.insert(1);
        if (tnode.value) {
          tnode.value.push(WORKER_NO_SEQ);
        } else {
          tnode.value = [WORKER_NO_SEQ];
        }
        i.dpf.workerAssigned(m, WORKER_NO_SEQ, newWorker);
        WORKER_NO_SEQ++;
      } else {
        const treeNode = workerRankTree.minimum()!;
        if (treeNode == null)
          throw new Error('minimum node is null');
        const workerNo = treeNode.value[0];
        if (ranksByWorkerNo.get(workerNo) == null)
          throw new Error('ranksByWorkerNo has null for ' + workerNo);
        const [worker] = ranksByWorkerNo.get(workerNo)!;
        i.dpf.workerAssigned(m, treeNode.value[0], worker);
      }
    })
  ));

  r('workerAssigned -> changeWorkerRank()', i.pt.workerAssigned.pipe(
    rx.map(([, workerNo]) => {
      changeWorkerRank(workerNo, 1);
    })
  ));

  r('newWorkerReady, workerOutputCtl.pt.stopWaiting... -> changeWorkerRank()',
    outputTable.l.newWorkerReady.pipe(
      rx.mergeMap(([, workerNo, workerOutputCtl]) => rx.merge(
        workerOutputCtl.pt.stopWaiting.pipe(
          rx.tap(() => changeWorkerRank(workerNo, 1))
        ),
        rx.merge(workerOutputCtl.pt.wait, workerOutputCtl.pt.returned).pipe(
          rx.tap(() => changeWorkerRank(workerNo, -1))
        )
      ))
    ));

  // r(rx.merge(i.pt.onWorkerWait, i.pt.onWorkerReturned).pipe(
  //   rx.map(([, workerNo]) => changeWorkerRank(workerNo, -1))
  // ));

  r('onWorkerExit', o.pt.onWorkerExit.pipe(
    rx.tap(([, workerNo]) => {
      if (ranksByWorkerNo.has(workerNo)) {
        const [, rank] = ranksByWorkerNo.get(workerNo)!;
        ranksByWorkerNo.delete(workerNo);
        const tnode = workerRankTree.search(rank);
        if (tnode) {
          const idx = tnode.value.indexOf(workerNo);
          if (idx >= 0) {
            tnode.value.splice(idx, 1);
          }
        }
      }
    })
  ));

  r('letAllWorkerExit', i.at.letAllWorkerExit.pipe(
    rx.exhaustMap(a => {
      const num = ranksByWorkerNo.size;
      for (const [worker] of ranksByWorkerNo.values()) {
        if (worker !== 'main')
          i.dpf.letWorkerExit(a, worker);
      }
      return rx.concat(
        o.at.onWorkerExit.pipe(
          rx.take(ranksByWorkerNo.get(0)![0] === 'main' ? num - 1 : num)
        ),
        new rx.Observable((sub) => {
          o.dpf.onAllWorkerExit(a);
          sub.complete();
        })
      );
    })
  ));

  function changeWorkerRank(workerNo: number, changeValue: number) {
    const entry = ranksByWorkerNo.get(workerNo)!;
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

  return ranksByWorkerNo;
}

