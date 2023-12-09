import * as rx from 'rxjs';
export function applyScheduler(broker, opts) {
    let WORKER_NO_SEQ = 0;
    const { r, o, i, outputTable } = broker;
    let algo;
    try {
        algo = require('@wfh/algorithms');
    }
    catch (e) {
        // Inside Plink
        algo = require('../../packages/algorithms');
    }
    const { RedBlackTree } = algo;
    const workerRankTree = new RedBlackTree();
    const ranksByWorkerNo = new Map();
    const { maxNumOfWorker } = opts;
    r('assignWorker -> workerAssigned', outputTable.l.assignWorker.pipe(rx.map(([m]) => {
        if (ranksByWorkerNo.size < maxNumOfWorker) {
            const newWorker = (ranksByWorkerNo.size === 0 && opts.excludeCurrentThead !== true) ? 'main' : opts.workerFactory();
            ranksByWorkerNo.set(WORKER_NO_SEQ, [newWorker, 0]);
            const tnode = workerRankTree.insert(1);
            if (tnode.value) {
                tnode.value.push(WORKER_NO_SEQ);
            }
            else {
                tnode.value = [WORKER_NO_SEQ];
            }
            i.dpf.workerAssigned(m, WORKER_NO_SEQ, newWorker);
            WORKER_NO_SEQ++;
        }
        else {
            const treeNode = workerRankTree.minimum();
            if (treeNode == null)
                throw new Error('minimum node is null');
            const workerNo = treeNode.value[0];
            if (ranksByWorkerNo.get(workerNo) == null)
                throw new Error('ranksByWorkerNo has null for ' + workerNo);
            const [worker] = ranksByWorkerNo.get(workerNo);
            i.dpf.workerAssigned(m, treeNode.value[0], worker);
        }
    })));
    r('workerAssigned -> changeWorkerRank()', i.pt.workerAssigned.pipe(rx.map(([m, workerNo]) => {
        changeWorkerRank(m, workerNo, 1);
    })));
    r('newWorkerReady, workerOutputCtl.pt.stopWaiting... -> changeWorkerRank()', outputTable.l.newWorkerReady.pipe(rx.mergeMap(([m, workerNo, workerOutputCtl]) => rx.merge(workerOutputCtl.pt.stopWaiting.pipe(rx.tap(() => changeWorkerRank(m, workerNo, 1)), broker.labelError('stopWaiting -> ...')), rx.merge(workerOutputCtl.pt.wait, workerOutputCtl.pt.returned).pipe(rx.tap(() => changeWorkerRank(m, workerNo, -1)), broker.labelError('returned -> ...'))))));
    r('onWorkerExit', o.pt.onWorkerExit.pipe(rx.tap(([, workerNo]) => {
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
    r('letAllWorkerExit', i.at.letAllWorkerExit.pipe(rx.exhaustMap(a => {
        const num = ranksByWorkerNo.size;
        for (const [worker] of ranksByWorkerNo.values()) {
            if (worker !== 'main')
                i.dpf.letWorkerExit(a, worker);
        }
        return rx.concat(o.at.onWorkerExit.pipe(rx.take(ranksByWorkerNo.get(0)[0] === 'main' ? num - 1 : num)), new rx.Observable((sub) => {
            o.dpf.onAllWorkerExit(a);
            sub.complete();
        }));
    })));
    r('', o.subForTypes(['startExpirationTimer', 'clearExpirationTimer']).groupControllerBy(({ p: [workerNo] }) => workerNo).pipe(rx.mergeMap(([grouped]) => grouped.pt.startExpirationTimer.pipe(rx.switchMap(([m, workerNo]) => rx.timer(opts.threadMaxIdleTime).pipe(rx.takeUntil(grouped.at.clearExpirationTimer), rx.tap(() => {
        const [worker] = ranksByWorkerNo.get(workerNo);
        if (worker !== 'main') {
            i.dpf.letWorkerExit(m, worker);
        }
    })))))));
    function changeWorkerRank(actionMeta, workerNo, changeValue) {
        const entry = ranksByWorkerNo.get(workerNo);
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
        if (opts.threadMaxIdleTime != null) {
            if (newRank === 0)
                o.dpf.startExpirationTimer(actionMeta, workerNo);
            else
                o.dpf.clearExpirationTimer(actionMeta, workerNo);
        }
    }
    return ranksByWorkerNo;
}
//# sourceMappingURL=worker-scheduler.js.map