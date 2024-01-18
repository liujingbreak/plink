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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.forkMergeSort = void 0;
/* eslint-disable no-console */
const node_path_1 = __importDefault(require("node:path"));
const node_util_1 = require("node:util");
const worker_threads_1 = require("worker_threads");
const node_perf_hooks_1 = require("node:perf_hooks");
const node_os_1 = __importDefault(require("node:os"));
const rx = __importStar(require("rxjs"));
const globals_1 = require("@jest/globals");
const plink_1 = require("@wfh/plink");
const sorter_1 = require("../res/sorter");
const node_worker_broker_1 = require("../fork-join/node-worker-broker");
const worker_scheduler_1 = require("../fork-join/worker-scheduler");
const log = (0, plink_1.log4File)(__filename);
async function forkMergeSort(threadMode, workerNum, autoExpirated) {
    const num = 30;
    const testArr = createSharedArryForTest(0, num);
    const sorter = (0, sorter_1.createSorter)(null, {
        name: 'sorter',
        debug: true,
        log(...msg) {
            log.info('[sorter]', ...msg.map(item => (0, node_util_1.inspect)(item, { showHidden: false, depth: 0, compact: true })));
        }
    });
    let workerIsAssigned = false;
    sorter.o.dp.log('worker created');
    const workers = [];
    const broker = (0, node_worker_broker_1.createBroker)(sorter, {
        name: 'broker',
        debug: true,
        log(...msg) {
            log.info('[broker]', ...msg);
        }
        // debugExcludeTypes: ['workerInited', 'ensureInitWorker', 'forkByBroker', 'wait', 'stopWaiting'],
        // logStyle: 'noParam'
    });
    broker.o.pt.onWorkerError.pipe(rx.tap(([, workerNo, error, type]) => console.error(type, 'worker #', workerNo, error))).subscribe();
    const { i, o } = broker;
    const numOfWorkers = workerNum !== null && workerNum !== void 0 ? workerNum : node_os_1.default.availableParallelism();
    let scheduleState;
    if (threadMode === 'scheduler') {
        scheduleState = (0, worker_scheduler_1.applyScheduler)(broker, {
            maxNumOfWorker: numOfWorkers,
            excludeCurrentThead: false,
            threadMaxIdleTime: autoExpirated,
            workerFactory() {
                return new worker_threads_1.Worker(node_path_1.default.resolve(__dirname, '../../dist/res/sort-worker.js'));
            }
        });
    }
    else if (threadMode === 'excludeMainThread') {
        scheduleState = (0, worker_scheduler_1.applyScheduler)(broker, {
            maxNumOfWorker: numOfWorkers,
            excludeCurrentThead: true,
            threadMaxIdleTime: autoExpirated,
            workerFactory() {
                return new worker_threads_1.Worker(node_path_1.default.resolve(__dirname, '../../dist/res/sort-worker.js'));
            }
        });
    }
    else {
        sorter.r('on assignWorker -> workerAssigned', rx.merge(
        // Mimic a thread pool's job
        o.pt.assignWorker.pipe(rx.map(([m], idx) => {
            if (threadMode === 'mainOnly')
                i.dpf.workerAssigned(m, 0, 'main');
            else if (threadMode === 'singleWorker') {
                let worker;
                let workerNo = 1;
                if (workers.length > 0) {
                    worker = workers[0][0];
                }
                else {
                    worker = new worker_threads_1.Worker(node_path_1.default.resolve(__dirname, '../../dist/res/sort-worker.js'));
                    workerNo = workers.length + 1;
                    workers.push([worker, workerNo]);
                }
                i.dpf.workerAssigned(m, workerNo, worker);
            }
            else if (threadMode === 'newWorker') {
                const worker = new worker_threads_1.Worker(node_path_1.default.resolve(__dirname, '../../dist/res/sort-worker.js'));
                workers.push([worker, idx]);
                i.dpf.workerAssigned(m, idx++, worker);
            }
            else {
                let worker;
                const workerNo = workers.length + 1;
                if (Math.random() <= 0.5) {
                    if (workers.length > 0) {
                        worker = workers[0][0];
                    }
                    else {
                        worker = new worker_threads_1.Worker(node_path_1.default.resolve(__dirname, '../../dist/res/sort-worker.js'));
                        workers.push([worker, workerNo]);
                    }
                    i.dpf.workerAssigned(m, workerNo, worker);
                }
                else
                    i.dpf.workerAssigned(m, 0, 'main');
            }
            workerIsAssigned = true;
        }), rx.ignoreElements()), rx.merge(broker.error$.pipe(rx.map(([label, err]) => console.error('Broker', label, 'on error', err))), o.pt.onWorkerError.pipe(rx.map(([, workNo, err, type]) => console.error('Worker', workNo, 'on', type !== null && type !== void 0 ? type : 'error', err)))).pipe(rx.take(1), rx.map(() => {
            sorter.dispose();
            // for (const worker of workers)
            //   i.dp.letWorkerExit(worker);
            // workers.splice(0);
        }))));
    }
    sorter.o.dp.log('Initial test array', testArr);
    node_perf_hooks_1.performance.mark(threadMode + '/sort start');
    // call main sort function
    await rx.firstValueFrom(sorter.i.do.sortAllInWorker(sorter.o.at.sortAllInWorkerResolved, testArr.buffer, 0, num, Math.round(num / numOfWorkers / 2)));
    node_perf_hooks_1.performance.measure(`measure ${numOfWorkers}`, threadMode + '/sort start');
    const performanceEntry = node_perf_hooks_1.performance.getEntriesByName(`measure ${numOfWorkers}`)[0];
    // eslint-disable-next-line no-console
    console.log(performanceEntry.name, performanceEntry.duration, 'ms');
    node_perf_hooks_1.performance.clearMeasures();
    node_perf_hooks_1.performance.clearMarks();
    if (!['scheduler', 'excludeMainThread'].includes(threadMode)) {
        (0, globals_1.expect)(workerIsAssigned).toBe(true);
    }
    sorter.o.dp.log('-----------------------------\nsorted:', testArr);
    if (['scheduler', 'excludeMainThread'].includes(threadMode)) {
        await new Promise(r => setTimeout(r, 500));
        console.log('Ranks of workers:', [...scheduleState.ranksByWorkerNo.entries()].map(([workerNo, [worker, rank]]) => `#${worker === 'main' ? worker : workerNo}: ${rank}`));
        console.log('Num of tasks of workers:', [...scheduleState.tasksByWorkerNo.entries()].map(([workerNo, [worker, rank]]) => `#${worker === 'main' ? worker : workerNo}: ${rank}`));
        for (const [, [, rank]] of scheduleState.tasksByWorkerNo.entries()) {
            (0, globals_1.expect)(rank).toBe(0);
        }
        for (const [, [, rank]] of scheduleState.ranksByWorkerNo.entries()) {
            (0, globals_1.expect)(rank).toBe(0);
        }
    }
    const latestBrokerEvents = broker.outputTable.addActions('onWorkerExit').l;
    if (['scheduler', 'excludeMainThread'].includes(threadMode)) {
        if (autoExpirated == null)
            await rx.firstValueFrom(i.do.letAllWorkerExit(o.at.onAllWorkerExit));
    }
    else if (threadMode !== 'mainOnly') {
        for (const [, workerNo] of workers)
            i.dp.letWorkerExit(workerNo);
        await rx.lastValueFrom(latestBrokerEvents.onWorkerExit.pipe(rx.take(workers.length)));
    }
}
exports.forkMergeSort = forkMergeSort;
function createSharedArryForTest(from, to) {
    const size = to - from;
    const buf = new SharedArrayBuffer(4 * size);
    const testArr = new Float32Array(buf, 0, size);
    const initArr = new Array(size);
    for (let i = 0; i < size; i++) {
        initArr[i] = i + from;
    }
    shuffleArray(initArr, testArr);
    return testArr;
}
function shuffleArray(arr, target) {
    let arrEffectiveLen = arr.length;
    for (let i = 0, l = arr.length; i < l; i++) {
        const pos = Math.floor(Math.random() * arrEffectiveLen--);
        // console.log(`(${pos}, ${arr.length})`, '-', arr[pos]);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        target[i] = arr[pos];
        if (pos !== arr.length - 1)
            arr[pos] = arr.pop();
        else
            arr.pop();
    }
}
//# sourceMappingURL=fork-merge-sort.js.map