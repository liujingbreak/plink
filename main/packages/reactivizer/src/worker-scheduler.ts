import type {Worker as NodeWorker} from 'node:worker_threads';
import {RedBlackTree} from '@wfh/algorithms';
import * as rx from 'rxjs';
import {Broker} from './types';

let SEQ = 0;

export function apply(broker: Broker, opts: {
  maxNumOfWorker: number;
  workerFactory(): Worker | NodeWorker;
}) {
  const {r, o, i} = broker;
  const workerRankTree = new RedBlackTree<number, number[]>();
  const ranksByWorkerNo = new Map<number, [worker: Worker | NodeWorker, rank: number]>();

  r(o.pt.assignWorker.pipe(
    rx.map(([m]) => {
      if (ranksByWorkerNo.size < opts.maxNumOfWorker) {
        const newWorker = opts.workerFactory();
        ranksByWorkerNo.set(SEQ, [newWorker, 0]);
        const tnode = workerRankTree.insert(1);
        if (tnode.value) {
          tnode.value.push(SEQ);
        } else {
          tnode.value = [SEQ];
        }
        i.dpf.workerAssigned(m, SEQ, newWorker);
        SEQ++;
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

  r(i.pt.workerAssigned.pipe(
    rx.map(([, workerNo]) => {
      changeWorkerRank(workerNo, 1);
    })
  ));

  r(o.pt.newWorkerReady.pipe(
    rx.mergeMap(([, workerNo,  workerOutputCtl]) => rx.merge(
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

  r(o.pt.onWorkerExit.pipe(
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

  r(i.at.letAllWorkerExit.pipe(
    rx.exhaustMap(a => {
      const num = ranksByWorkerNo.size;
      for (const [worker] of ranksByWorkerNo.values())
        i.dp.letWorkerExit(worker);
      return rx.concat(
        o.at.onWorkerExit.pipe(
          rx.take(num)
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

