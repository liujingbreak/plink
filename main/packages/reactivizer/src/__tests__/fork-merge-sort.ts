/* eslint-disable no-console */
import Path from 'node:path';
import {inspect} from 'node:util';
import {Worker} from 'worker_threads';
import {performance} from 'node:perf_hooks';
import os from 'node:os';
import * as rx from 'rxjs';
import {expect}  from '@jest/globals';
import {log4File} from '@wfh/plink';
import {createSorter} from '../res/sorter';
import {createBroker} from '../fork-join/node-worker-broker';
import {applyScheduler} from '../fork-join/worker-scheduler';

const log = log4File(__filename);

export async function forkMergeSort(threadMode: 'scheduler' | 'mainOnly' | 'singleWorker' | 'mix' | 'newWorker' | 'excludeMainThread',
  workerNum?: number, autoExpirated?: number) {
  const num = 30;
  const testArr = createSharedArryForTest(0, num);
  const sorter = createSorter(null, {
    name: 'sorter',
    debug: true,
    log(...msg) {
      log.info('[sorter]', ...msg.map(item => inspect(item, {showHidden: false, depth: 0, compact: true})));
    }
  });
  let workerIsAssigned = false;

  sorter.o.dp.log('worker created');
  const workers = [] as [Worker, number][];

  const broker = createBroker(sorter, {
    name: 'broker',
    debug: true,
    log(...msg) {
      log.info('[broker]', ...msg);
    }
    // debugExcludeTypes: ['workerInited', 'ensureInitWorker', 'forkByBroker', 'wait', 'stopWaiting'],
    // logStyle: 'noParam'
  });

  broker.o.pt.onWorkerError.pipe(
    rx.tap(([, workerNo, error, type]) => console.error(type, 'worker #', workerNo, error))
  ).subscribe();

  const {i, o} = broker;
  const numOfWorkers = workerNum ?? os.availableParallelism();

  let scheduleState: ReturnType<typeof applyScheduler> | undefined;
  if (threadMode === 'scheduler') {
    scheduleState = applyScheduler(broker, {
      maxNumOfWorker: numOfWorkers,
      excludeCurrentThead: false,
      threadMaxIdleTime: autoExpirated,
      workerFactory() {
        return new Worker(Path.resolve(__dirname, '../../dist/res/sort-worker.js'));
      }
    });
  } else if (threadMode === 'excludeMainThread') {
    scheduleState = applyScheduler(broker, {
      maxNumOfWorker: numOfWorkers,
      excludeCurrentThead: true,
      threadMaxIdleTime: autoExpirated,
      workerFactory() {
        return new Worker(Path.resolve(__dirname, '../../dist/res/sort-worker.js'));
      }
    });
  } else {
    sorter.r('on assignWorker -> workerAssigned', rx.merge(
      // Mimic a thread pool's job
      o.pt.assignWorker.pipe(
        rx.map(([m], idx) => {
          if (threadMode === 'mainOnly')
            i.dpf.workerAssigned(m, 0, 'main');
          else if (threadMode === 'singleWorker') {
            let worker: Worker;
            let workerNo = 1;
            if (workers.length > 0) {
              worker = workers[0][0];
            } else {
              worker = new Worker(Path.resolve(__dirname, '../../dist/res/sort-worker.js'));
              workerNo = workers.length + 1;
              workers.push([worker, workerNo]);
            }
            i.dpf.workerAssigned(m, workerNo, worker);
          } else if (threadMode === 'newWorker') {
            const worker = new Worker(Path.resolve(__dirname, '../../dist/res/sort-worker.js'));
            workers.push([worker, idx]);
            i.dpf.workerAssigned(m, idx++, worker);
          } else {
            let worker: Worker;
            const workerNo = workers.length + 1;
            if (Math.random() <= 0.5) {
              if (workers.length > 0) {
                worker = workers[0][0];
              } else {
                worker = new Worker(Path.resolve(__dirname, '../../dist/res/sort-worker.js'));
                workers.push([worker, workerNo]);
              }
              i.dpf.workerAssigned(m, workerNo, worker);
            } else
              i.dpf.workerAssigned(m, 0, 'main');
          }
          workerIsAssigned = true;
        }),
        rx.ignoreElements()
      ),
      rx.merge(
        broker.error$.pipe(rx.map(([label, err]) => console.error('Broker', label, 'on error', err))),
        o.pt.onWorkerError.pipe(rx.map(([, workNo, err, type]) => console.error('Worker', workNo, 'on', type ?? 'error', err)))
      ).pipe(
        rx.take(1),
        rx.map(() => {
          sorter.dispose();
          // for (const worker of workers)
          //   i.dp.letWorkerExit(worker);
          // workers.splice(0);
        })
      )
    ));
  }

  sorter.o.dp.log('Initial test array', testArr);


  performance.mark(threadMode + '/sort start');
  // call main sort function
  await rx.firstValueFrom(sorter.i.do.sortAllInWorker(
    sorter.o.at.sortAllInWorkerResolved, testArr.buffer as SharedArrayBuffer, 0, num, Math.round(num / numOfWorkers / 2)
  ));
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
    console.log('Ranks of workers:', [...scheduleState!.ranksByWorkerNo.entries()].map(([workerNo, [worker, rank]]) => `#${worker === 'main' ? worker : workerNo}: ${rank}`));
    console.log('Num of tasks of workers:', [...scheduleState!.tasksByWorkerNo.entries()].map(([workerNo, [worker, rank]]) => `#${worker === 'main' ? worker : workerNo}: ${rank}`));
    for (const [, [, rank]] of scheduleState!.tasksByWorkerNo.entries()) {
      expect(rank).toBe(0);
    }
    for (const [, [, rank]] of scheduleState!.ranksByWorkerNo.entries()) {
      expect(rank).toBe(0);
    }
  }

  const latestBrokerEvents = broker.outputTable.addActions('onWorkerExit').l;
  if (['scheduler', 'excludeMainThread'].includes(threadMode)) {
    if (autoExpirated == null)
      await rx.firstValueFrom(i.do.letAllWorkerExit(o.at.onAllWorkerExit));
  } else if (threadMode !== 'mainOnly') {
    for (const [, workerNo] of workers)
      i.dp.letWorkerExit(workerNo);
    await rx.lastValueFrom(latestBrokerEvents.onWorkerExit.pipe(rx.take(workers.length)));
  }
}
function createSharedArryForTest(from: number, to: number) {
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

function shuffleArray(arr: number[], target: {[i: number]: any}) {
  let arrEffectiveLen = arr.length;
  for (let i = 0, l = arr.length; i < l; i++) {
    const pos = Math.floor(Math.random() * arrEffectiveLen--);
    // console.log(`(${pos}, ${arr.length})`, '-', arr[pos]);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    target[i] = arr[pos];
    if (pos !== arr.length - 1)
      arr[pos] = arr.pop()!;
    else
      arr.pop();
  }
}
