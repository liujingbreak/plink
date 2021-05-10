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
import {log4File, config} from '@wfh/plink';
const log = log4File(__filename);

export const PKG_LIB_ENTRY_PROP = 'cra-lib-entry';
export const PKG_LIB_ENTRY_DEFAULT = 'public_api.ts';
export const PKG_APP_ENTRY_PROP = 'cra-app-entry';
export const PKG_APP_ENTRY_DEFAULT = 'start.tsx';

let craScriptsPaths: CraScriptsPaths;
let configFileInPackage: string | undefined | null;

export function getConfigFileInPackage() {
  if (configFileInPackage) {
    return configFileInPackage;
  } else {
    paths();
    return configFileInPackage;
  }
}

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

  const plinkProps = packageJson.plink ? packageJson.plink : packageJson.dr;
  if (cmdOption.buildType === 'lib') {
    changedPaths.appBuild = Path.resolve(dir, 'build');
    changedPaths.appIndexJs = Path.resolve(dir, _.get(plinkProps, [PKG_LIB_ENTRY_PROP], PKG_LIB_ENTRY_DEFAULT));
  } else if (cmdOption.buildType === 'app') {
    changedPaths.appIndexJs = Path.resolve(dir, _.get(plinkProps, [PKG_APP_ENTRY_PROP], PKG_APP_ENTRY_DEFAULT));
    changedPaths.appBuild = pCfg.resolve('staticDir');
  }
  log.debug(changedPaths);

  pCfg.configHandlerMgrChanged(handler => handler.runEachSync<ReactScriptsHandler>((cfgFile, result, handler) => {
    if (handler.changeCraPaths != null) {
      log.info('Execute CRA scripts paths overrides', cfgFile);
      handler.changeCraPaths(changedPaths, config().cliOptions?.env!, cmdOption);
    }
  }));

  configFileInPackage = Path.resolve(dir, _.get(plinkProps, ['config-overrides-path'], 'config-overrides.ts'));

  if (fs.existsSync(configFileInPackage)) {
    const cfgMgr = new ConfigHandlerMgr([configFileInPackage]);
    cfgMgr.runEachSync<ReactScriptsHandler>((cfgFile, result, handler) => {
      if (handler.changeCraPaths != null) {
        log.info('Execute CRA scripts paths configuration overrides from ', cfgFile);
        handler.changeCraPaths(changedPaths, config().cliOptions?.env!, cmdOption);
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
  // log.warn(changedPaths);
  return changedPaths;
}


