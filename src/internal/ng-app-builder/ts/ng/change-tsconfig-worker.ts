import {parentPort, workerData} from 'worker_threads';
import {createTsConfig, ParialBrowserOptions} from './change-tsconfig';
import {initCli, DrcpBuilderOptions} from './common';
import {injectorSetup} from './injector-setup';
import { DrcpSetting } from '../configurable';
import {PackageInfo} from '@wfh/plink/wfh/dist/package-mgr/package-info-gathering';
import memstats from '@wfh/plink/wfh/dist/utils/mem-stats';

export interface Data {
  tsconfigFile: string;
  reportDir: string;
  config: DrcpSetting;
  ngOptions: ParialBrowserOptions;
  packageInfo: PackageInfo;
  deployUrl: string | undefined;
  baseHref?: string;
  drcpBuilderOptions: DrcpBuilderOptions;
}

const {
  tsconfigFile,
  reportDir,
  config,
  ngOptions,
  packageInfo,
  deployUrl,
  baseHref,
  drcpBuilderOptions
} = workerData as Data;

// tslint:disable: no-console
// console.log(workerData);
memstats();
initCli(drcpBuilderOptions)
.then((drcpConfig) => {
  injectorSetup(deployUrl, baseHref);
  const create: typeof createTsConfig = require('./change-tsconfig').createTsConfig;
  const content = create(tsconfigFile, ngOptions, config, packageInfo, reportDir);

  parentPort!.postMessage({log: memstats()});
  parentPort!.postMessage({result: content});
});
