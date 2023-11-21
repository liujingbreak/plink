import {Worker} from 'worker_threads';
import Path from 'path';
import os from 'os';
import {setupForMainWorker, Broker} from '@wfh/reactivizer/dist/fork-join/node-worker-broker';
import {log4File} from '@wfh/plink';
import {markdownProcessor} from './markdown-processor';

const log = log4File(__filename);

export function setupBroker(excludeCurrentThead = false, maxNumOfWorker?: number) {
  const broker: Broker<typeof markdownProcessor> = setupForMainWorker(markdownProcessor, {
    name: 'broker',
    maxNumOfWorker: maxNumOfWorker ?? os.availableParallelism(),
    debug: false,
    excludeCurrentThead,
    log(...args: [any]) {
      log.info(...args);
    },
    logStyle: 'noParam',
    workerFactory() {
      return new Worker(Path.resolve(__dirname, '../dist/markdown-processor-worker.js'));
    }
  });

  return broker;
}

export {markdownProcessor};
