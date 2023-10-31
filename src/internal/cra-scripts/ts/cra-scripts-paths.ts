// import {findPackage} from './build-target-helper';
import Path from 'node:path';
import fs from 'fs';
import _ from 'lodash';
// import type {PlinkEnv} from '@wfh/plink/wfh/dist/node-path';
import pCfg from '@wfh/plink/wfh/dist/config';
import {ConfigHandlerMgr} from '@wfh/plink/wfh/dist/config-handler';
import fsext from 'fs-extra';
import {log4File, config, plinkEnv} from '@wfh/plink';
import {extractDllName, outputPathForDllName} from './webpack-dll';
import {ReactScriptsHandler, CraScriptsPaths, PKG_LIB_ENTRY_PROP, PKG_LIB_ENTRY_DEFAULT, PKG_APP_ENTRY_PROP,
  PKG_APP_ENTRY_DEFAULT} from './types';
import {getCmdOptions} from './utils';
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

  const paths = require(Path.resolve('node_modules/react-scripts/config/paths')) as CraScriptsPaths;
  const changedPaths = paths;

  const {pkg: firstEntryPkg, file: firstEntryFile} = cmdOption.buildTargets[0];
  if (cmdOption.buildType === 'lib') {
    if (firstEntryPkg == null)
      throw new Error(`First entry file must be inside a Plink package, ${cmdOption.buildTargets[0].file}`);
    const packageJson = firstEntryPkg.json;
    const plinkProps = packageJson.plink ? packageJson.plink : packageJson.dr;
    const {realPath: pkgDir} = firstEntryPkg!;
    changedPaths.appBuild = Path.resolve(pkgDir, 'build');
    changedPaths.appIndexJs = firstEntryFile ?? Path.resolve(pkgDir, _.get(plinkProps, [PKG_LIB_ENTRY_PROP], PKG_LIB_ENTRY_DEFAULT));
  } else if (cmdOption.buildType === 'app') {
    if (firstEntryPkg == null)
      throw new Error(`First entry file must be inside a Plink package, ${cmdOption.buildTargets[0].file}`);
    const packageJson = firstEntryPkg.json;
    const plinkProps = packageJson.plink ? packageJson.plink : packageJson.dr;
    const {realPath: pkgDir} = firstEntryPkg!;
    changedPaths.appIndexJs = firstEntryFile ?? Path.resolve(pkgDir, _.get(plinkProps, [PKG_APP_ENTRY_PROP], PKG_APP_ENTRY_DEFAULT));
    // CRA also accepts process.env.BUILD_PATH as appBuild value
    changedPaths.appBuild = pCfg.resolve('staticDir');
  } else if (cmdOption.buildType === 'dll') {
    const [dllName] = extractDllName(cmdOption.buildTargets);
    changedPaths.appBuild = outputPathForDllName(dllName);
    changedPaths.appIndexJs = cmdOption.buildTargets[0].file!; // Webpack configuration property entry will be changed in webpack-dll
  }

  changedPaths.appWebpackCache = Path.join(plinkEnv.distDir, 'webpack-cache');
  changedPaths.appTsBuildInfoFile = Path.resolve(plinkEnv.distDir, 'cra-scripts.forked-ts-checker.tsbuildinfo.json');

  if (firstEntryPkg) {
    configFileInPackage = Path.resolve(firstEntryPkg.realPath, _.get(firstEntryPkg.json, ['config-overrides-path'], 'config-overrides.ts'));

    if (fs.existsSync(configFileInPackage)) {
      const cfgMgr = new ConfigHandlerMgr([configFileInPackage]);
      cfgMgr.runEachSync<ReactScriptsHandler>((cfgFile, result, handler) => {
        if (handler.changeCraPaths != null) {
          log.info('Execute CRA scripts paths configuration overrides from ', cfgFile);
          handler.changeCraPaths(changedPaths, config().cliOptions!.env!, cmdOption);
        }
      });
    }
  } else {
    configFileInPackage = null;
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  pCfg.configHandlerMgrChanged(handler => handler.runEachSync<ReactScriptsHandler>((cfgFile, _result, handler) => {
    if (handler.changeCraPaths != null) {
      log.info('Execute CRA scripts paths configuration', cfgFile);
      handler.changeCraPaths(changedPaths, config().cliOptions!.env!, cmdOption);
    }
  }));
  if (!changedPaths.publicUrlOrPath.endsWith('/'))
    changedPaths.publicUrlOrPath += '/';
  // eslint-disable-next-line no-console
  // console.log('[cra-scripts-paths] changed react-scripts paths:\n', changedPaths);
  craScriptsPaths = changedPaths;
  fsext.mkdirpSync(changedPaths.appBuild);
  // fork-ts-checker needs this file path
  // process.env._plink_cra_scripts_indexJs = changedPaths.appIndexJs;
  process.env._plink_cra_scripts_tsConfig = changedPaths.appTsConfig;
  // log.warn(changedPaths);
  return changedPaths;
}


