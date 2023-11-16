import Path from 'path';
import os from 'os';
import {setupForMainWorker} from '@wfh/reactivizer/dist/fork-join/node-worker-broker';
import {markdownProcessor} from './markdown-processor';

setupForMainWorker(markdownProcessor, {
  name: 'heavyWork',
  maxNumOfWorker: os.availableParallelism(),
  workerFactory() {
    return new Worker(Path.resolve(__dirname, 'markdown-processor-worker.js'));
  }
});

export {markdownProcessor};
