import {getCmdOptions} from './utils';
// import {findPackage} from './build-target-helper';
import Path from 'path';
import _ from 'lodash';
import fs from 'fs';
// import type {PlinkEnv} from '@wfh/plink/wfh/dist/node-path';
import pCfg from '@wfh/plink/wfh/dist/config';
import { ConfigHandlerMgr } from '@wfh/plink/wfh/dist/config-handler';
import {ReactScriptsHandler, CraScriptsPaths, PKG_LIB_ENTRY_PROP, PKG_LIB_ENTRY_DEFAULT, PKG_APP_ENTRY_PROP,
  PKG_APP_ENTRY_DEFAULT} from './types';
import fsext from 'fs-extra';
import {log4File, config, findPackagesByNames} from '@wfh/plink';
const log = log4File(__filename);

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
  const foundPkg = [...findPackagesByNames([cmdOption.buildTarget])][0];
  if (foundPkg == null) {
    throw new Error(`Can not find package for name like ${cmdOption.buildTarget}`);
  }
  const {realPath: dir, json: packageJson, path: pkgDir} = foundPkg;

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

  configFileInPackage = Path.resolve(pkgDir, _.get(plinkProps, ['config-overrides-path'], 'config-overrides.ts'));

  if (fs.existsSync(configFileInPackage)) {
    const cfgMgr = new ConfigHandlerMgr([configFileInPackage]);
    cfgMgr.runEachSync<ReactScriptsHandler>((cfgFile, result, handler) => {
      if (handler.changeCraPaths != null) {
        log.info('Execute CRA scripts paths configuration overrides from ', cfgFile);
        handler.changeCraPaths(changedPaths, config().cliOptions!.env!, cmdOption);
      }
    });
  } else {
    configFileInPackage = null;
  }
  pCfg.configHandlerMgrChanged(handler => handler.runEachSync<ReactScriptsHandler>((cfgFile, result, handler) => {
    if (handler.changeCraPaths != null) {
      log.info('Execute CRA scripts paths overrides', cfgFile);
      handler.changeCraPaths(changedPaths, config().cliOptions?.env!, cmdOption);
    }
  }));
  // eslint-disable-next-line no-console
  // console.log('[cra-scripts-paths] changed react-scripts paths:\n', changedPaths);
  craScriptsPaths = changedPaths;
  fsext.mkdirpSync(changedPaths.appBuild);
  // fork-ts-checker needs this file path
  process.env._plink_cra_scripts_indexJs = changedPaths.appIndexJs;
  process.env._plink_cra_scripts_tsConfig = changedPaths.appTsConfig;
  // log.warn(changedPaths);
  return changedPaths;
}


