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
exports.apply = void 0;
const algorithms_1 = require("@wfh/algorithms");
const rx = __importStar(require("rxjs"));
let SEQ = 0;
function apply(broker, opts) {
    const { r, o, i } = broker;
    const workerRankTree = new algorithms_1.RedBlackTree();
    const ranksByWorkerNo = new Map();
    r(o.pt.assignWorker.pipe(rx.map(([m]) => {
        if (ranksByWorkerNo.size < opts.maxNumOfWorker) {
            const newWorker = opts.workerFactory();
            ranksByWorkerNo.set(SEQ, [newWorker, 0]);
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
            if (treeNode == null)
                throw new Error('minimum node is null');
            const workerNo = treeNode.value[0];
            if (ranksByWorkerNo.get(workerNo) == null)
                throw new Error('ranksByWorkerNo has null for ' + workerNo);
            const [worker] = ranksByWorkerNo.get(workerNo);
            i.dpf.workerAssigned(m, treeNode.value[0], worker);
        }
    })));
    r(i.pt.workerAssigned.pipe(rx.map(([, workerNo]) => {
        changeWorkerRank(workerNo, 1);
    })));
    r(o.pt.newWorkerReady.pipe(rx.mergeMap(([, workerNo, workerOutputCtl]) => rx.merge(workerOutputCtl.pt.stopWaiting.pipe(rx.tap(() => changeWorkerRank(workerNo, 1))), rx.merge(workerOutputCtl.pt.wait, workerOutputCtl.pt.returned).pipe(rx.tap(() => changeWorkerRank(workerNo, -1)))))));
    // r(rx.merge(i.pt.onWorkerWait, i.pt.onWorkerReturned).pipe(
    //   rx.map(([, workerNo]) => changeWorkerRank(workerNo, -1))
    // ));
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
    r(i.at.letAllWorkerExit.pipe(rx.exhaustMap(a => {
        const num = ranksByWorkerNo.size;
        for (const [worker] of ranksByWorkerNo.values())
            i.dp.letWorkerExit(worker);
        return rx.concat(o.at.onWorkerExit.pipe(rx.take(num)), new rx.Observable((sub) => {
            o.dpf.onAllWorkerExit(a);
            sub.complete();
        }));
    })));
    function changeWorkerRank(workerNo, changeValue) {
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
    }
    return ranksByWorkerNo;
}
exports.apply = apply;
//# sourceMappingURL=worker-scheduler.js.map