import { parentPort, isMainThread} from 'worker_threads';
import * as _tscmd from '@wfh/plink/wfh/dist/ts-cmd';
import {buildTsd} from './tsd-generate';

import {initConfig, initAsChildProcess} from '@wfh/plink/wfh/dist/utils/bootstrap-process';
(async function() {
  // console.log(process.env);
  if (!isMainThread) {
    initAsChildProcess();
    initConfig(JSON.parse(process.env.PLINK_CLI_OPTS!));
  }
  await buildTsd();
})().catch(err => {
  if (parentPort)
    parentPort.postMessage(err);
});
