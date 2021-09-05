/* eslint-disable no-console */
import {Worker, isMainThread, threadId} from 'worker_threads';
import * as boot from '@wfh/plink/wfh/dist/utils/bootstrap-process';
// import inspector from 'inspector';

export default function() {
  console.log('cli-debug, start a thread', __filename, process.execArgv);
  const wk = new Worker(__filename);
  console.log('run worker', wk.threadId);
  wk.on('exit', code => {
    console.log('thread exit');
  });
}

let inspectPort = 9229;

if (!isMainThread) {
  console.log(inspectPort, 'Inside thread', __filename);
  // inspector.open(inspectPort++, 'localhost', true);
  const {initConfig, initAsChildProcess} = require('@wfh/plink/wfh/dist/utils/bootstrap-process') as typeof boot;

  initAsChildProcess();
  // require('@wfh/plink/wfh/dist/store');
  // console.log(Object.keys(require.cache));
  console.log('cli-debug ---------------------');
  // debugger;
  initConfig(JSON.parse(process.env.PLINK_CLI_OPTS!));


  console.log(process.pid, threadId);
}
