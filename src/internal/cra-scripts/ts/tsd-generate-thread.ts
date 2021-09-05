import { parentPort, isMainThread} from 'worker_threads';
import * as tsdGen from './tsd-generate';

import {initConfig, initAsChildProcess} from '@wfh/plink/wfh/dist/utils/bootstrap-process';
(async function() {
  if (!isMainThread) {
    initAsChildProcess();
    initConfig(JSON.parse(process.env.PLINK_CLI_OPTS!));
  }
  const {buildTsd} = require('./tsd-generate') as typeof tsdGen;
  await buildTsd();
})().catch(err => {
  if (parentPort)
    parentPort.postMessage(err);
});
