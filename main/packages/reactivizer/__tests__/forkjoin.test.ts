/* eslint-disable no-console */
import Path from 'node:path';
import os from 'node:os';
import {Worker} from 'node:worker_threads';
import {initProcess, initConfig, logConfig, log4File} from '@wfh/plink';
import * as rx from 'rxjs';
import {describe, it, expect, beforeEach}  from '@jest/globals';
import {createSorter} from '../src/res/sorter';
import {createBroker} from '../src/node-worker-broker';
import {apply} from '../src/worker-scheduler';

initProcess('none');
logConfig(initConfig({})());
const log = log4File(__filename);

describe('forkjoin worker', () => {
  const num = 20;
  let testArr: Float32Array;

  beforeEach(() => {
    testArr = createSharedArryForTest(0, num);
  });
  it.skip('messUp function', () => {
    const arr = createSharedArryForTest(0, 20);
    console.log(arr);
    expect(new Set(arr).size).toEqual(20);
  });

  it.skip('main worker can recursively fork main worker and perform merge-sort', async () => {
    await forkMergeSort('mainOnly');
  }, 50000);

  it.skip('single worker can fork another worker and perform merge-sort', async () => {
    await forkMergeSort('singleWorker');
  }, 50000);

  it.skip('main worker and wokers can fork another worker or main worker itself', async () => {
    await forkMergeSort('mix');
  }, 50000);

  it('Scheduled workers can fork another worker or main worker itself', async () => {
    await forkMergeSort('scheduler');
  }, 50000);

  async function forkMergeSort(threadMode: 'scheduler' | 'mainOnly' | 'singleWorker' | 'mix' | 'newWorker') {
    const sorter = createSorter({
      debug: false,
      log(...msg) {
        log.info(...msg);
      }
    });
    let workerIsAssigned = false;

    sorter.o.dp.log('worker created');
    const workers = [] as Worker[];

    const broker = createBroker(sorter, {
      debug: 'broker',
      log(...msg) {
        log.info(...msg);
      },
      debugExcludeTypes: ['workerInited', 'ensureInitWorker'],
      logStyle: 'noParam'
    });

    const {i, o} = broker;
    const numOfWorkers = os.cpus().length > 0 ? os.cpus().length - 1 : 3;

    if (threadMode === 'scheduler') {
      apply(broker, {
        maxNumOfWorker: numOfWorkers,
        workerFactory() {
          return new Worker(Path.resolve(__dirname, '../dist/res/sort-worker.js'));
        }
      });
    } else {
      sorter.r(rx.merge(
        // Mimic a thread pool's job
        o.pt.assignWorker.pipe(
          rx.map(([m], idx) => {
            if (threadMode === 'mainOnly')
              i.dpf.workerAssigned(m, -1, 'main');
            else if (threadMode === 'singleWorker') {
              let worker: Worker;
              if (workers.length > 0) {
                worker = workers[0];
              } else {
                worker = new Worker(Path.resolve(__dirname, '../dist/res/sort-worker.js'));
                workers.push(worker);
              }
              i.dpf.workerAssigned(m, workers.length, worker);
            } else if (threadMode === 'newWorker') {
              const worker = new Worker(Path.resolve(__dirname, '../dist/res/sort-worker.js'));
              workers.push(worker);
              i.dpf.workerAssigned(m, idx++, worker);
            } else {
              let worker: Worker;
              if (Math.random() <= 0.5) {
                if (workers.length > 0) {
                  worker = workers[0];
                } else {
                  worker = new Worker(Path.resolve(__dirname, '../dist/res/sort-worker.js'));
                  workers.push(worker);
                }
                i.dpf.workerAssigned(m, workers.length, worker);
              } else
                i.dpf.workerAssigned(m, -1, 'main');
            }
            workerIsAssigned = true;
          }),
          rx.ignoreElements()
        ),
        rx.merge(
          o.pt.onError.pipe(rx.map(([, label, err]) => console.error('Broker', label, 'on error', err))),
          o.pt.onWorkerError.pipe(rx.map(([, workNo, err]) => console.error('Worker', workNo, 'on error', err)))
        ).pipe(
          rx.take(1),
          rx.map(() => {
            sorter.i.dp.stopAll();
            for (const worker of workers)
              i.dp.letWorkerExit(worker);
            workers.splice(0);
          })
        )
      ));
    }

    sorter.o.dp.log('Initial test array', testArr);

    // call main sort function
    await rx.firstValueFrom(sorter.i.do.sort(
      sorter.o.at.sortCompleted, testArr.buffer as SharedArrayBuffer, 0, num, 8
    ));

    if (threadMode !== 'scheduler') {
      expect(workerIsAssigned).toBe(true);
    }
    sorter.o.dp.log('-----------------------------\nsorted:', testArr);

    const latestBrokerEvents = o.createLatestPayloadsFor('onWorkerExit');
    if (threadMode === 'scheduler') {
      void rx.firstValueFrom(i.do.letAllWorkerExit(o.at.onAllWorkerExit));
      broker.i.dp.stopAll();
      sorter.i.dp.stopAll();
    } else if (threadMode !== 'mainOnly') {
      for (const worker of workers)
        i.dp.letWorkerExit(worker);
      await rx.lastValueFrom(latestBrokerEvents.onWorkerExit.pipe(rx.take(workers.length)));
    }
  }
});

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

