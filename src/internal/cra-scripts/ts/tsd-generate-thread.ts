import { workerData, parentPort} from 'worker_threads';
import * as _tscmd from '@wfh/plink/wfh/dist/ts-cmd';

import {initConfig, initProcess} from '@wfh/plink/wfh/dist/utils/bootstrap-process';

(async function() {
  initProcess();
  initConfig({config: [], prop: []});
  const {tsc} = require('@wfh/plink/wfh/dist/ts-cmd') as typeof _tscmd;
  await tsc(workerData as _tscmd.TscCmdParam);
})().catch(err => parentPort!.postMessage(err));
