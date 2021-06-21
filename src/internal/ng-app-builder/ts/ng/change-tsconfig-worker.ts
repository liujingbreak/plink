import {parentPort, workerData} from 'worker_threads';
import {createTsConfig, ParialBrowserOptions} from './change-tsconfig';
import {initCli, DrcpBuilderOptions} from './common';
import {injectorSetup} from './injector-setup';
import memstats from '@wfh/plink/wfh/dist/utils/mem-stats';

export interface Data {
  tsconfigFile: string;
  reportDir: string;
  ngOptions: ParialBrowserOptions;
  deployUrl: string | undefined;
  baseHref?: string;
  drcpBuilderOptions: DrcpBuilderOptions;
}

const {
  tsconfigFile,
  reportDir,
  ngOptions,
  deployUrl,
  baseHref,
  drcpBuilderOptions
} = workerData as Data;

/* eslint-disable no-console */
// console.log(workerData);
memstats();
initCli(drcpBuilderOptions)
.then((drcpConfig) => {
  injectorSetup(deployUrl, baseHref);
  const create: typeof createTsConfig = require('./change-tsconfig').createTsConfig;
  const content = create(tsconfigFile, ngOptions, reportDir);

  parentPort!.postMessage({log: memstats()});
  parentPort!.postMessage({result: content});
});
