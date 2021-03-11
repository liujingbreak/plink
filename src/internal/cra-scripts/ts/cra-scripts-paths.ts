import {getCmdOptions} from './utils';
import {findPackage} from './build-target-helper';
import Path from 'path';
import _ from 'lodash';
import fs from 'fs';
// import type {PlinkEnv} from '@wfh/plink/wfh/dist/node-path';
import pCfg from '@wfh/plink/wfh/dist/config';
import { ConfigHandlerMgr } from '@wfh/plink/wfh/dist/config-handler';
import {ReactScriptsHandler, CraScriptsPaths} from './types';
import fsext from 'fs-extra';
import plink from '__plink';
const log = plink.logger;



let craScriptsPaths: CraScriptsPaths;
export let configFileInPackage: string | undefined | null;

export default function paths() {
  if (craScriptsPaths) {
    return craScriptsPaths;
  }
  const cmdOption = getCmdOptions();
  const foundPkg = findPackage(cmdOption.buildTarget);
  if (foundPkg == null) {
    throw new Error(`Can not find package for name like ${cmdOption.buildTarget}`);
  }
  const {dir, packageJson} = foundPkg;

  const paths: CraScriptsPaths = require(Path.resolve('node_modules/react-scripts/config/paths'));
  const changedPaths = paths;

  if (cmdOption.buildType === 'lib') {
    changedPaths.appBuild = Path.resolve(dir, 'build');
    changedPaths.appIndexJs = Path.resolve(dir, _.get(packageJson, 'dr.cra-lib-entry', 'public_api.ts'));
  } else if (cmdOption.buildType === 'app') {
    changedPaths.appIndexJs = Path.resolve(dir, _.get(packageJson, 'dr.cra-app-entry', 'start.tsx'));
    changedPaths.appBuild = pCfg.resolve('staticDir');
  }
  log.debug(changedPaths);

  pCfg.configHandlerMgrChanged(handler => handler.runEachSync<ReactScriptsHandler>((cfgFile, result, handler) => {
    if (handler.changeCraPaths != null) {
      log.info('Execute CRA scripts paths overrides', cfgFile);
      handler.changeCraPaths(changedPaths);
    }
  }));

  configFileInPackage = Path.resolve(dir, _.get(packageJson, ['dr', 'config-overrides-path'], 'config-overrides.ts'));

  if (fs.existsSync(configFileInPackage)) {
    const cfgMgr = new ConfigHandlerMgr([configFileInPackage]);
    cfgMgr.runEachSync<ReactScriptsHandler>((cfgFile, result, handler) => {
      if (handler.changeCraPaths != null) {
        log.info('Execute CRA scripts paths configuration overrides from ', cfgFile);
        handler.changeCraPaths(changedPaths);
      }
    });
  } else {
    configFileInPackage = null;
  }
  // tslint:disable-next-line: no-console
  // console.log('[cra-scripts-paths] changed react-scripts paths:\n', changedPaths);
  craScriptsPaths = changedPaths;
  fsext.mkdirpSync(changedPaths.appBuild);
  // fork-ts-checker needs this file path
  process.env._plink_cra_scripts_indexJs = changedPaths.appIndexJs;
  process.env._plink_cra_scripts_tsConfig = changedPaths.appTsConfig;
  return changedPaths;
}


