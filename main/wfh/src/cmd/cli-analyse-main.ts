import Path from 'path';
import os from 'os';
import {Worker} from 'node:worker_threads';
import {setupForMainWorker} from '../../../packages/reactivizer/dist/fork-join/node-worker-broker';
import {createService} from './cli-analyse-service';

export default function() {
  const mainWorker = createService();
  setupForMainWorker(mainWorker, {
    name: 'ts-analyser-broker',
    debug: false,
    excludeCurrentThead: true,
    maxNumOfWorker: os.availableParallelism(),
    threadMaxIdleTime: 1000,
    workerFactory() {
      return new Worker(Path.resolve(__dirname, './cli-analyse-worker.js'));
    }
  });

  return mainWorker;
}
