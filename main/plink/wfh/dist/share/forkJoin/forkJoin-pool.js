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
exports.createForkWorkerPool = void 0;
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const rb_tree_1 = require("../algorithms/rb-tree");
/**
 * Fork worker pool is different from original worker poll about below features
 * - Pool can create and assign tasks to worker without waiting for worker finishing previous task
 * - Worker can itself fork new task to pool
 *   - Another or same worker can send response of task finishing message back to specific worker through pool
 * - TODO: try minimize duplicate transferred message data
 */
function createForkWorkerPool(factory, plugin, casbt, opts) {
    const control = casbt(opts);
    const { payloadByType, dispatcher, _actionToObject, createAction } = control;
    const workerByNo = new Map();
    // const actionsFromWorker = new Map<number, rx.Subject<RecursiveTaskActions<Record<string, never>>>>();
    const workerPortMap = new Map();
    const idleWorkers = new Set();
    const workerLoad = new Map();
    /** key is work load or worker, value is workerNo */
    const workLoadTree = new rb_tree_1.RedBlackTree();
    let workerSeq = 1; // 0 is for master worker
    // const poolId = (SEQ++).toString(16);
    rx.merge(payloadByType.createWorker.pipe(op.map(workerNo => [workerNo, factory()]), op.mergeMap(([workerNo, worker]) => {
        workerByNo.set(workerNo, worker);
        const workerSpecificCtl = casbt();
        const { payloadByType: payloadFromWorker } = workerSpecificCtl;
        plugin.dispatcher.pluginDoInitWorker(workerNo, worker, workerSpecificCtl.dispatchStream);
        return rx.merge(plugin.payloadByType.pluginDoneInitWorker.pipe(op.filter(([workerNo0]) => workerNo === workerNo0), op.take(1), op.map(([workerNo, port1]) => {
            workerLoad.set(workerNo, 0);
            workerPortMap.set(workerNo, port1);
            dispatcher.workerCrearted(workerNo, worker);
        })), rx.merge(payloadFromWorker.waitForJoin, payloadFromWorker.tellPoolReturned.pipe(op.map(callerWorker => {
            dispatcher.workerLoadChange(callerWorker, true);
        }))).pipe(op.map(() => {
            dispatcher.workerLoadChange(workerNo, false);
        })));
    })), payloadByType.workerLoadChange.pipe(op.map(([worker, incrementOrDecline]) => {
        const origin = workerLoad.get(worker);
        if (origin == null) {
            workerLoad.set(worker, incrementOrDecline ? 1 : -1);
            const node = workLoadTree.insert(1);
            if (node.value != null) {
                node.value.push(worker);
            }
            else {
                node.value = [worker];
            }
        }
        else {
            const newValue = incrementOrDecline ? origin + 1 : origin - 1;
            workerLoad.set(worker, newValue);
            const node = workLoadTree.search(origin);
            if (node != null) {
                workLoadTree.deleteNode(node);
            }
            else {
                const newNode = workLoadTree.insert(newValue);
                if (newNode.value)
                    newNode.value.push(worker);
                else
                    newNode.value = [worker];
            }
        }
    })), payloadByType.fork.pipe(op.mergeMap(([returnPort, fromWorker, forkAction]) => {
        if (idleWorkers.size > 0) {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const workerNo = idleWorkers.values().next().value;
            return rx.of([returnPort, workerNo, fromWorker, forkAction]);
        }
        else if (workerByNo.size < opts.concurrent) {
            dispatcher.createWorker(workerSeq++);
            return rx.merge(payloadByType.workerCrearted.pipe(op.take(1), 
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return
            op.map(([workerNo]) => [returnPort, workerNo, fromWorker, forkAction])), new rx.Observable(sub => {
                dispatcher.createWorker(workerSeq++);
                sub.complete();
            }));
        }
        else {
            const min = workLoadTree.minimum();
            return rx.of([returnPort, min.value[0], fromWorker, forkAction]);
        }
    }), op.map(([returnPort, toWorker, fromWorker, forkAction]) => {
        const rawOnForkedForAction = createAction('onForkedFor', returnPort, fromWorker, forkAction);
        plugin.dispatcher.pluginPostMsgTo(workerPortMap.get(toWorker), _actionToObject(rawOnForkedForAction), [returnPort]);
        dispatcher.workerLoadChange(toWorker, true);
    }))).pipe(op.catchError((err, src) => {
        console.error(err);
        return src;
    })).subscribe();
    return control;
}
exports.createForkWorkerPool = createForkWorkerPool;
//# sourceMappingURL=forkJoin-pool.js.map