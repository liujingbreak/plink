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
    r(o.at.assignWorker.pipe(rx.map(() => {
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
            SEQ++;
        }
        else {
            const treeNode = workerRankTree.minimum();
            const workerNo = treeNode.value[0];
            const [worker] = ranksByWorkerNo.get(workerNo);
            i.dp.workerAssigned(treeNode.value[0], worker);
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
        const [, rank] = ranksByWorkerNo.get(workerNo);
        const node = workerRankTree.search(rank);
        if (node) {
            const idx = node.value.indexOf(workerNo);
            node.value.splice(idx, 1);
            const tnode = workerRankTree.insert(rank + changeValue);
            if (tnode.value)
                tnode.value.push(workerNo);
            else
                tnode.value = [workerNo];
        }
    }
}
exports.apply = apply;
//# sourceMappingURL=worker-scheduler.js.map