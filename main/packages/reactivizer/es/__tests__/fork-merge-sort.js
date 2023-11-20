/* eslint-disable no-console */
import Path from 'node:path';
import { Worker } from 'worker_threads';
import { performance } from 'node:perf_hooks';
import os from 'node:os';
import * as rx from 'rxjs';
import { expect } from '@jest/globals';
import { log4File } from '@wfh/plink';
import { createSorter } from '../res/sorter';
import { createBroker } from '../fork-join/node-worker-broker';
import { applyScheduler } from '../fork-join/worker-scheduler';
const log = log4File(__filename);
export async function forkMergeSort(threadMode, workerNum) {
    const num = 30;
    const testArr = createSharedArryForTest(0, num);
    const sorter = createSorter(null, {
        name: 'sorter',
        debug: false,
        log(...msg) {
            log.info(...msg);
        }
    });
    let workerIsAssigned = false;
    sorter.o.dp.log('worker created');
    const workers = [];
    const broker = createBroker(sorter, {
        name: 'broker',
        debug: true,
        log(...msg) {
            log.info(...msg);
        },
        debugExcludeTypes: ['workerInited', 'ensureInitWorker'],
        logStyle: 'noParam'
    });
    broker.o.pt.onWorkerError.pipe(rx.tap(([, workerNo, error, type]) => console.error(type, 'worker #', workerNo, error))).subscribe();
    const { i, o } = broker;
    const numOfWorkers = workerNum !== null && workerNum !== void 0 ? workerNum : os.availableParallelism();
    let ranksByWorkerNo;
    if (threadMode === 'scheduler') {
        ranksByWorkerNo = applyScheduler(broker, {
            maxNumOfWorker: numOfWorkers,
            excludeCurrentThead: false,
            workerFactory() {
                return new Worker(Path.resolve(__dirname, '../../dist/res/sort-worker.js'));
            }
        });
    }
    else if (threadMode === 'excludeMainThread') {
        ranksByWorkerNo = applyScheduler(broker, {
            maxNumOfWorker: numOfWorkers,
            excludeCurrentThead: true,
            workerFactory() {
                return new Worker(Path.resolve(__dirname, '../../dist/res/sort-worker.js'));
            }
        });
    }
    else {
        sorter.r('on assignWorker -> workerAssigned', rx.merge(
        // Mimic a thread pool's job
        o.pt.assignWorker.pipe(rx.map(([m], idx) => {
            if (threadMode === 'mainOnly')
                i.dpf.workerAssigned(m, -1, 'main');
            else if (threadMode === 'singleWorker') {
                let worker;
                if (workers.length > 0) {
                    worker = workers[0];
                }
                else {
                    worker = new Worker(Path.resolve(__dirname, '../../dist/res/sort-worker.js'));
                    workers.push(worker);
                }
                i.dpf.workerAssigned(m, workers.length, worker);
            }
            else if (threadMode === 'newWorker') {
                const worker = new Worker(Path.resolve(__dirname, '../../dist/res/sort-worker.js'));
                workers.push(worker);
                i.dpf.workerAssigned(m, idx++, worker);
            }
            else {
                let worker;
                if (Math.random() <= 0.5) {
                    if (workers.length > 0) {
                        worker = workers[0];
                    }
                    else {
                        worker = new Worker(Path.resolve(__dirname, '../../dist/res/sort-worker.js'));
                        workers.push(worker);
                    }
                    i.dpf.workerAssigned(m, workers.length, worker);
                }
                else
                    i.dpf.workerAssigned(m, -1, 'main');
            }
            workerIsAssigned = true;
        }), rx.ignoreElements()), rx.merge(broker.error$.pipe(rx.map(([label, err]) => console.error('Broker', label, 'on error', err))), o.pt.onWorkerError.pipe(rx.map(([, workNo, err, type]) => console.error('Worker', workNo, 'on', type !== null && type !== void 0 ? type : 'error', err)))).pipe(rx.take(1), rx.map(() => {
            sorter.destory();
            for (const worker of workers)
                i.dp.letWorkerExit(worker);
            workers.splice(0);
        }))));
    }
    sorter.o.dp.log('Initial test array', testArr);
    performance.mark(threadMode + '/sort start');
    // call main sort function
    await rx.firstValueFrom(sorter.i.do.sortAllInWorker(sorter.o.at.sortAllInWorkerResolved, testArr.buffer, 0, num, num / numOfWorkers / 2));
    performance.measure(`measure ${numOfWorkers}`, threadMode + '/sort start');
    const performanceEntry = performance.getEntriesByName(`measure ${numOfWorkers}`)[0];
    // eslint-disable-next-line no-console
    console.log(performanceEntry.name, performanceEntry.duration, 'ms');
    performance.clearMeasures();
    performance.clearMarks();
    if (!['scheduler', 'excludeMainThread'].includes(threadMode)) {
        expect(workerIsAssigned).toBe(true);
    }
    sorter.o.dp.log('-----------------------------\nsorted:', testArr);
    if (['scheduler', 'excludeMainThread'].includes(threadMode)) {
        await new Promise(r => setTimeout(r, 500));
        console.log('Ranks of workers:', [...ranksByWorkerNo.entries()].map(([workerNo, [worker, rank]]) => `#${worker === 'main' ? worker : workerNo}: ${rank}`));
        for (const [, [, rank]] of ranksByWorkerNo.entries()) {
            // console.log('Rank of worker ' + workerKey + `: ${rank}`);
            expect(rank).toBe(0);
        }
    }
    const latestBrokerEvents = broker.outputTable.addActions('onWorkerExit').l;
    if (['scheduler', 'excludeMainThread'].includes(threadMode)) {
        await rx.firstValueFrom(i.do.letAllWorkerExit(o.at.onAllWorkerExit));
        broker.destory();
        sorter.destory();
    }
    else if (threadMode !== 'mainOnly') {
        for (const worker of workers)
            i.dp.letWorkerExit(worker);
        await rx.lastValueFrom(latestBrokerEvents.onWorkerExit.pipe(rx.take(workers.length)));
    }
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