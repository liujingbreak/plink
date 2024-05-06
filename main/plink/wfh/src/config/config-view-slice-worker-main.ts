import Path from 'node:path';
import {Worker} from 'node:worker_threads';
import os from 'os';
import {setupForMainWorker} from '@wfh/reactivizer/dist/fork-join/node-worker-broker';
import {createService} from './config-view-slice-worker';

export function createMainWorkerAndBroker(debug = false) {
  const parallel = os.availableParallelism();
  const mainService = createService(debug);
  setupForMainWorker(mainService, {
    name: 'configViewSliceWorkerBroker',
    debug: false,
    // debugExcludeTypes: ['workerRankChanged', 'assignWorker', 'newWorkerReady'],
    debugIncludeTypes: ['workerAssigned'],
    maxNumOfWorker: parallel,
    excludeCurrentThead: true,
    threadMaxIdleTime: 500,
    workerFactory() {
      return new Worker(Path.resolve(__dirname, './config-view-slice-worker-worker.js'));
    }
  });
  return mainService;
}
