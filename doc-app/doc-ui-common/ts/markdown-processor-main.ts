import {inspect} from 'node:util';
import {Worker} from 'worker_threads';
import Path from 'path';
import os from 'os';
import {setupForMainWorker} from '@wfh/reactivizer/dist/fork-join/node-worker-broker';
import {log4File} from '@wfh/plink';
import {markdownProcessor} from './markdown-processor';

const log = log4File(__filename);

const PRIMITIVE_TYPES = {number: true, string: true, boolean: true};

const has = Object.prototype.hasOwnProperty;
function isPrimitiveValue(value: any): value is (string | number | boolean) {
  return has.call(PRIMITIVE_TYPES, typeof value);
}

export function setupBroker(excludeCurrentThead = true, maxNumOfWorker?: number) {
  const broker = setupForMainWorker(markdownProcessor, {
    name: 'broker',
    maxNumOfWorker: maxNumOfWorker ?? os.availableParallelism() - 1,
    threadMaxIdleTime: 4000,
    debug: false,
    excludeCurrentThead,
    log(msg, ...args) {
      log.info(msg, ...args.map(item => isPrimitiveValue(item) ? item : inspect(item, {showHidden: false, depth: 0, compact: true})));
    },
    debugExcludeTypes: ['workerInited'],
    workerFactory() {
      return new Worker(Path.resolve(__dirname, '../dist/markdown-processor-worker.js'));
    }
  });

  return broker;
}

export {markdownProcessor};
