import {getCmdOptions} from './utils';
import {findPackage} from './build-target-helper';
import Path from 'path';
import _ from 'lodash';
import fs from 'fs';
// import type {PlinkEnv} from '@wfh/plink/wfh/dist/node-path';
import pCfg from '@wfh/plink/wfh/dist/config';
import { ConfigHandlerMgr } from '@wfh/plink/wfh/dist/config-handler';
import {ReactScriptsHandler} from './types';
import log4js from 'log4js';
import fsext from 'fs-extra';
const log = log4js.getLogger('cra-scripts-paths');

export interface CraScriptsPaths {
  dotenv: string;
  appPath: string;
  appBuild: string;
  appPublic: string;
  appHtml: string;
  appIndexJs: string;
  appPackageJson: string;
  appSrc: string;
  appTsConfig: string;
  appJsConfig: string;
  yarnLockFile: string;
  testsSetup: string;
  proxySetup: string;
  appNodeModules: string;
  publicUrlOrPath: string;
  // These properties only exist before ejecting:
  ownPath: string;
  ownNodeModules: string; // This is empty on npm 3
  appTypeDeclarations: string;
  ownTypeDeclarations: string;
}

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

  // console.log('[debug] ', foundPkg);
  if (cmdOption.buildType === 'lib') {
    changedPaths.appBuild = Path.resolve(dir, 'build');
    changedPaths.appIndexJs = Path.resolve(dir, _.get(packageJson, 'dr.cra-lib-entry', 'public_api.ts'));
  } else if (cmdOption.buildType === 'app') {
    changedPaths.appIndexJs = Path.resolve(dir, _.get(packageJson, 'dr.cra-app-entry', 'start.tsx'));
    changedPaths.appBuild = pCfg.resolve('staticDir');
  }

  pCfg.configHandlerMgr().runEachSync<ReactScriptsHandler>((cfgFile, result, handler) => {
    if (handler.changeCraPaths != null) {
      log.info('Execute CRA scripts paths overrides', cfgFile);
      handler.changeCraPaths(changedPaths);
    }
  });

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


