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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.forkMergeSort = forkMergeSort;
/* eslint-disable no-console */
const node_path_1 = __importDefault(require("node:path"));
const fs_1 = __importDefault(require("fs"));
const worker_threads_1 = require("worker_threads");
const node_perf_hooks_1 = require("node:perf_hooks");
const node_os_1 = __importDefault(require("node:os"));
const rx = __importStar(require("rxjs"));
const globals_1 = require("@jest/globals");
const nodejs_utils_1 = require("../nodejs-utils");
const sorter_1 = require("../res/sorter");
const node_worker_broker_1 = require("../fork-join/node-worker-broker");
const worker_scheduler_1 = require("../fork-join/worker-scheduler");
const logout = fs_1.default.createWriteStream('fork-merge-sort-test.output.log', 'utf8');
const stdoutLogger = (...msgs) => {
    logout.write((0, nodejs_utils_1.formatToConciseNoColor)(...msgs));
    logout.write('\n');
    // process.stdout.write(formatToConcise(...msgs));
    // process.stdout.write('\n');
};
async function forkMergeSort(threadMode, workerNum, autoExpirated) {
    const num = 3000;
    const testArr = createSharedArryForTest(0, num);
    const sorter = (0, sorter_1.createSorter)(null, {
        name: 'sorter',
        debug: true,
        log: stdoutLogger
    });
    let workerIsAssigned = false;
    sorter.s.ft.log('worker created').dp();
    const workers = [];
    const broker = (0, node_worker_broker_1.createBroker)(sorter, {
        name: 'broker',
        debug: true,
        log: stdoutLogger,
        debugExcludeTypes: ['workerAssigned', 'workerInited', 'ensureInitWorker', 'newWorkerReady', 'forkByBroker', 'wait', 'stopWaiting', 'assignWorker', 'clearExpirationTimer']
    });
    broker.s.pt.onWorkerError.pipe(rx.tap(([, workerNo, error, type]) => console.error(type, 'worker #', workerNo, error))).subscribe();
    broker.table.l.allReadyWorkers.pipe(rx.switchMap(([, worker$]) => worker$), rx.map(([, , input]) => input.ft.changeConfig({ debug: true }).dp())).subscribe();
    const { s } = broker;
    const numOfWorkers = workerNum !== null && workerNum !== void 0 ? workerNum : node_os_1.default.availableParallelism();
    console.log('numOfWorkers:', numOfWorkers);
    let scheduleState;
    if (threadMode === 'scheduler') {
        broker.config({ debug: true });
        // process.env.NODE_ENV = 'development';
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
        s.pt.assignWorker.pipe(rx.map(([m], idx) => {
            if (threadMode === 'mainOnly')
                s.ft.workerAssigned(0, 'main').dp(m);
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
                s.ft.workerAssigned(workerNo, worker).dp(m);
            }
            else if (threadMode === 'newWorker') {
                const worker = new worker_threads_1.Worker(node_path_1.default.resolve(__dirname, '../../dist/res/sort-worker.js'));
                workers.push([worker, idx]);
                s.ft.workerAssigned(idx++, worker).dp(m);
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
                    s.ft.workerAssigned(workerNo, worker).dp(m);
                }
                else
                    s.ft.workerAssigned(0, 'main').dp(m);
            }
            workerIsAssigned = true;
        }), rx.ignoreElements()), rx.merge(broker.error$.pipe(rx.map(([label, err]) => console.error('Broker', label, 'on error', err))), s.pt.onWorkerError.pipe(rx.map(([, workNo, err, type]) => console.error('Worker', workNo, 'on', type !== null && type !== void 0 ? type : 'error', err)))).pipe(rx.take(1), rx.map(() => {
            sorter.dispose();
            // for (const worker of workers)
            //   s.dp.letWorkerExit(worker);
            // workers.splice(0);
        }))));
    }
    sorter.s.ft.log('Initial test array', testArr).dp();
    node_perf_hooks_1.performance.mark(threadMode + '/sort start');
    // call main sort function
    await rx.firstValueFrom(sorter.s.ft.sortAllInWorker(testArr.buffer, 0, num, Math.round(num / numOfWorkers / 2)).do(sorter.s.at.sortAllInWorkerResolved));
    node_perf_hooks_1.performance.measure(`measure ${numOfWorkers}`, threadMode + '/sort start');
    const performanceEntry = node_perf_hooks_1.performance.getEntriesByName(`measure ${numOfWorkers}`)[0];
    // eslint-disable-next-line no-console
    console.log('Performance entry #' + performanceEntry.name + ':', performanceEntry.duration, 'ms');
    node_perf_hooks_1.performance.clearMeasures();
    node_perf_hooks_1.performance.clearMarks();
    if (!['scheduler', 'excludeMainThread'].includes(threadMode)) {
        (0, globals_1.expect)(workerIsAssigned).toBe(true);
    }
    sorter.s.ft.log('-----------------------------\nsorted:', testArr).dp();
    if (['scheduler', 'excludeMainThread'].includes(threadMode)) {
        await new Promise(r => setTimeout(r, 500));
        console.log('Ranks of workers:', [...scheduleState.ranksByWorkerNo.entries()].map(([workerNo, [worker, rank]]) => `#${worker === 'main' ? worker : workerNo}: ${rank}`));
        console.log('Num of tasks of workers:', [...scheduleState.tasksByWorkerNo.entries()].map(([workerNo, [worker, rank]]) => `#${worker === 'main' ? worker : workerNo}: ${rank}`));
        for (const [, [workerNo, rank]] of scheduleState.tasksByWorkerNo.entries()) {
            (0, globals_1.expect)(rank).toBe(workerNo === 'main' ? 1 : 0);
        }
        for (const [, [workerNo, rank]] of scheduleState.ranksByWorkerNo.entries()) {
            (0, globals_1.expect)(rank).toBe(workerNo === 'main' ? 1 : 0);
        }
    }
    const latestBrokerEvents = broker.table.addActions('onWorkerExit').l;
    if (['scheduler', 'excludeMainThread'].includes(threadMode)) {
        if (autoExpirated == null)
            await rx.firstValueFrom(s.ft.letAllWorkerExit().do(s.at.onAllWorkerExit));
    }
    else if (threadMode !== 'mainOnly') {
        for (const [, workerNo] of workers)
            s.ft.letWorkerExit(workerNo).dp();
        await rx.lastValueFrom(latestBrokerEvents.onWorkerExit.pipe(rx.take(workers.length)));
    }
    logout.close();
}
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