import { RedBlackTree } from '@wfh/algorithms';
import * as rx from 'rxjs';
let SEQ = 0;
export function apply(broker, opts) {
    const { r, o, i } = broker;
    const workerRankTree = new RedBlackTree();
    const ranksByWorkerNo = new Map();
    r(o.pt.assignWorker.pipe(rx.map(([m]) => {
        if (ranksByWorkerNo.size < opts.maxNumOfWorker) {
            const newWorker = opts.workerFactory();
            ranksByWorkerNo.set(SEQ, [newWorker, 1]);
            const tnode = workerRankTree.insert(1);
            if (tnode.value) {
                tnode.value.push(SEQ);
            }
            else {
                tnode.value = [SEQ];
            }
            i.dpf.workerAssigned(m, SEQ, newWorker);
            SEQ++;
        }
        else {
            const treeNode = workerRankTree.minimum();
            const workerNo = treeNode.value[0];
            const [worker] = ranksByWorkerNo.get(workerNo);
            i.dpf.workerAssigned(m, treeNode.value[0], worker);
        }
    })));
    r(rx.merge(i.pt.onWorkerAwake, i.pt.workerAssigned).pipe(rx.map(([, workerNo]) => {
        changeWorkerRank(workerNo, 1);
    })));
    r(i.pt.onWorkerWait.pipe(rx.map(([, workerNo]) => changeWorkerRank(workerNo, -1))));
    r(o.pt.onWorkerExit.pipe(rx.tap(([, workerNo]) => {
        if (ranksByWorkerNo.has(workerNo)) {
            const [, rank] = ranksByWorkerNo.get(workerNo);
            ranksByWorkerNo.delete(workerNo);
            const tnode = workerRankTree.search(rank);
            if (tnode) {
                const idx = tnode.value.indexOf(workerNo);
                if (idx >= 0) {
                    tnode.value.splice(idx, 1);
                }
            }
        }
    })));
    r(i.at.stopAll.pipe());
    function changeWorkerRank(workerNo, changeValue) {
        const entry = ranksByWorkerNo.get(workerNo);
        const [, rank] = entry;
        const newRank = rank + changeValue;
        entry[1] = newRank;
        const node = workerRankTree.search(rank);
        if (node) {
            const idx = node.value.indexOf(workerNo);
            node.value.splice(idx, 1);
            const tnode = workerRankTree.insert(newRank);
            if (tnode.value)
                tnode.value.push(workerNo);
            else
                tnode.value = [workerNo];
        }
    }
}
//# sourceMappingURL=worker-scheduler.js.map