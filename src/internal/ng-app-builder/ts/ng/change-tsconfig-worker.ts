import {parentPort, workerData, isMainThread} from 'worker_threads';
import {createTsConfig, ParialBrowserOptions} from './change-tsconfig';
import {initCli, DrcpBuilderOptions} from './common';
import {injectorSetup} from './injector-setup';
import { DrcpSetting } from '../configurable';
import {PackageInfo} from 'dr-comp-package/wfh/dist/build-util/ts/main';
import memstats from 'dr-comp-package/wfh/dist/utils/mem-stats';

export interface Data {
  tsconfigFile: string;
  reportFile: string;
  config: DrcpSetting;
  ngOptions: ParialBrowserOptions;
  packageInfo: PackageInfo;
  deployUrl: string | undefined;
  baseHref?: string;
  drcpBuilderOptions: DrcpBuilderOptions;
}

if (!isMainThread) {
  const {
    tsconfigFile,
    reportFile,
    config,
    ngOptions,
    packageInfo,
    deployUrl,
    baseHref,
    drcpBuilderOptions
  } = workerData as Data;

  // console.log('hey');
  // console.log(workerData);

  initCli(drcpBuilderOptions)
  .then((drcpConfig) => {
    return injectorSetup(packageInfo, drcpBuilderOptions.drcpArgs, deployUrl, baseHref);
  }).then(() => {
    const create: typeof createTsConfig = require('./change-tsconfig').createTsConfig;
    const content = create(tsconfigFile, ngOptions, config, packageInfo, reportFile);

    parentPort!.postMessage(content);
    memstats();
    process.exit(0);
  });

}
