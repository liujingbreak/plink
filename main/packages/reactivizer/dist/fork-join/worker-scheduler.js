"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyScheduler = void 0;
const rx = __importStar(require("rxjs"));
function applyScheduler(broker, opts) {
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
    const tasksByWorkerNo = new Map();
    const { maxNumOfWorker } = opts;
    r('assignWorker -> workerAssigned', outputTable.l.assignWorker.pipe(rx.map(([m]) => {
        try {
            const minTreeNode = workerRankTree.minimum();
            if (minTreeNode && (minTreeNode.key === 0 ||
                ranksByWorkerNo.size >= maxNumOfWorker)) {
                const workerNo = minTreeNode.value[0];
                if (ranksByWorkerNo.get(workerNo) == null)
                    throw new Error('ranksByWorkerNo has null for ' + workerNo);
                const [worker] = ranksByWorkerNo.get(workerNo);
                i.dpf.workerAssigned(m, minTreeNode.value[0], worker);
            }
            if (ranksByWorkerNo.size < maxNumOfWorker) {
                const newWorker = (ranksByWorkerNo.size === 0 && opts.excludeCurrentThead !== true) ? 'main' : opts.workerFactory();
                if (newWorker !== 'main' && WORKER_NO_SEQ === 0) {
                    WORKER_NO_SEQ = 1; // 0 is always for "main"
                }
                ranksByWorkerNo.set(WORKER_NO_SEQ, [newWorker, 0, WORKER_NO_SEQ]);
                tasksByWorkerNo.set(WORKER_NO_SEQ, [newWorker, 0, WORKER_NO_SEQ]);
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
        }
        catch (e) {
            broker.dispatchErrorFor(e, m);
        }
    })));
    r('workerAssigned -> changeWorkerRank()', i.pt.workerAssigned.pipe(rx.map(([m, workerNo]) => {
        changeWorkerRank(workerNo, 1);
        const tasks = tasksByWorkerNo.get(workerNo);
        tasks[1]++;
        checkNumOfTasks(m, workerNo, tasks[1]);
    })));
    r('newWorkerReady, workerOutputCtl.pt.stopWaiting... -> changeWorkerRank()', outputTable.l.newWorkerReady.pipe(rx.mergeMap(([m, workerNo, workerOutputCtl]) => rx.merge(workerOutputCtl.pt.stopWaiting.pipe(rx.tap(() => changeWorkerRank(workerNo, 1)), broker.labelError(`worker #${workerNo} stopWaiting -> ...`)), workerOutputCtl.pt.wait.pipe(rx.tap(() => changeWorkerRank(workerNo, -1)), broker.labelError(`worker #${workerNo} wait`)), workerOutputCtl.pt.returned.pipe(rx.tap(() => {
        changeWorkerRank(workerNo, -1);
        const taskCount = tasksByWorkerNo.get(workerNo);
        if (taskCount) {
            taskCount[1]--;
            checkNumOfTasks(m, workerNo, taskCount[1]);
        } // In case of "excludeCurrentThead", `main` thread is not assigned, tasksByWorkerNo does not contain `workerNo` 0
    }), broker.labelError(`worker #${workerNo} returned`))))));
    r('letWorkerExit', i.pt.letWorkerExit.pipe(rx.tap(([, workerNo]) => {
        if (ranksByWorkerNo.has(workerNo)) {
            const [, rank] = ranksByWorkerNo.get(workerNo);
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
    })));
    r('letAllWorkerExit', i.at.letAllWorkerExit.pipe(rx.exhaustMap(a => {
        const num = ranksByWorkerNo.size;
        for (const [worker, , workerNo] of ranksByWorkerNo.values()) {
            if (worker !== 'main')
                i.dpf.letWorkerExit(a, workerNo);
        }
        return rx.concat(o.at.onWorkerExit.pipe(rx.take(opts.excludeCurrentThead !== true ? num : num - 1)), new rx.Observable((sub) => {
            o.dpf.onAllWorkerExit(a);
            sub.complete();
        }));
    })));
    r('startExpirationTimer -> letWorkerExit', o.subForTypes(['startExpirationTimer', 'clearExpirationTimer']).groupControllerBy(({ p: [workerNo] }) => workerNo).pipe(rx.mergeMap(([grouped]) => grouped.pt.startExpirationTimer.pipe(rx.switchMap(([m, workerNo]) => rx.timer(opts.threadMaxIdleTime).pipe(rx.takeUntil(grouped.at.clearExpirationTimer), rx.tap(() => {
        const [worker] = ranksByWorkerNo.get(workerNo);
        if (worker !== 'main') {
            i.dpf.letWorkerExit(m, workerNo);
        }
    })))))));
    r('onWorkerExit', o.pt.onWorkerExit.pipe(rx.tap(([m, workerNo]) => o.dpf.clearExpirationTimer(m, workerNo))));
    function changeWorkerRank(workerNo, changeValue) {
        const entry = ranksByWorkerNo.get(workerNo);
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
    function checkNumOfTasks(actionMeta, workerNo, numTasks) {
        o.dp.workerRankChanged(workerNo, numTasks);
        if (workerNo !== 0 && opts.threadMaxIdleTime != null) {
            if (numTasks === 0)
                o.dpf.startExpirationTimer(actionMeta, workerNo);
            else if (numTasks > 0)
                o.dpf.clearExpirationTimer(actionMeta, workerNo);
            else {
                throw new Error(`Current thread worker #${workerNo} is ranked to a negative work load value ${numTasks},` +
                    ' it could also caused by an unexpected error');
            }
        }
    }
    return { ranksByWorkerNo, tasksByWorkerNo };
}
exports.applyScheduler = applyScheduler;
//# sourceMappingURL=worker-scheduler.js.map