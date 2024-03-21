import Path from 'path';
import os from 'os';
import {Worker} from 'node:worker_threads';
import {setupForMainWorker} from '@wfh/reactivizer/dist/fork-join/node-worker-broker';
import {createMyParallelService} from './forkJoin-simplest-sample';

export default function() {
  const mainWorker = createMyParallelService();
  setupForMainWorker(mainWorker, {
    name: 'heavyWork',
    maxNumOfWorker: os.availableParallelism(),
    threadMaxIdleTime: 3000,
    workerFactory() {
      return new Worker(Path.resolve(__dirname, '../dist/samples/myParallelService-worker.js'));
    }
  });

  return mainWorker;
}

