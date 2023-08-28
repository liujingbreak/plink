/* eslint-disable no-console */
import Path from 'node:path';
import {Worker} from 'node:worker_threads';
import * as rx from 'rxjs';
import {describe, it, expect}  from '@jest/globals';
import {sorter} from '../src/res/sort-worker';

describe('forkjoin worker', () => {
  it('main worker can fork another worker and perform merge-sort', async () => {
    // const broker = createBroker<ForkWorkerOutput<typeof sortActions>>();
    const worker = new Worker(Path.resolve(__dirname, '../dist/res/sort-worker.js'));
    let workerIsAssigned = false;

    // eslint-disable-next-line no-console
    console.log('worker created');

    const sorterLatestEvents = sorter.o.createLatestPayloadsFor('brokerCreated', 'sortCompleted');
    sorter.r(sorterLatestEvents.brokerCreated.pipe(
      rx.take(1),
      rx.mergeMap(([, {o, i}]) => rx.merge(
        // Mimic a thread pool's job
        o.pt.assignWorker.pipe(
          rx.map(([id]) => {
            if (Math.random() <= 0.99)
              i.dp.workerAssigned(id, 0, worker);
            else
              i.dp.workerAssigned(id, -1, 'main');
            workerIsAssigned = true;
          })
        ),
        o.pt.workerInited.pipe(
          rx.filter(([, , , _initId, skippped]) => !skippped),
          rx.take(2),
          rx.reduce((acc, [, workerNo, port]) => {
            // eslint-disable-next-line no-console
            console.log('worker', workerNo, 'is initialized');
            expect(port).toBeNull();
            acc.add(workerNo);

            return acc;
          }, new Set<number>()),
          rx.map(workerNoSet => {
            console.log('worker assigned', [...workerNoSet.values()]);
          })
        )
      ))
    ));

    console.log('create SharedArrayBuffer');

    const buf = new SharedArrayBuffer(4 * 15);
    const testArr = new Float32Array(buf, 0, 15);
    const initArr = new Array(15);
    for (let i = 0; i < 15; i++) {
      initArr[i] = i + 5;
    }
    messUp(initArr, testArr);
    console.log('Initial test array', testArr);

    const sortDone = rx.firstValueFrom(sorterLatestEvents.sortCompleted.pipe(
      rx.filter(([, resolveId]) => sortId === resolveId )
    ));
    const sortId = sorter.i.dp.sort(buf, 0, 15);

    await sortDone;
    console.log('sorted:', testArr);

    const [, {i}] = await rx.firstValueFrom(sorterLatestEvents.brokerCreated);
    i.dp.letWorkerExit(worker);
    expect(workerIsAssigned).toBe(true);
  }, 8000);
});

function messUp(arr: number[], target: {[i: number]: any}) {
  for (let i = 0, l = arr.length; i < l; i++) {
    const pos = Math.floor(Math.random() * arr.length);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    target[i] = arr[pos];
    arr[pos] = arr.pop()!;
  }
}

