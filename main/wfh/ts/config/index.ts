/* eslint-disable prefer-const, max-len */
require('yamlify/register');
import _ from 'lodash';
import fs from 'fs';
import Path from 'path';
import chalk from 'chalk';
import {ConfigHandlerMgr, DrcpConfig, ConfigHandler} from '../config-handler';
import {GlobalOptions as CliOptions} from '../cmd/types';
import {getLanIPv4} from '../utils/network-util';
// import {PlinkEnv} from '../node-path';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import log4js from 'log4js';
import {dispatcher, getState, DrcpSettings} from './config-slice';
// Refactor: circular reference
import * as _pkgList from '../package-mgr/package-list-helper';
import * as _pkgMgr from '../package-mgr';
import {plinkEnv} from '../utils/misc';
import {PackageSettingInterf} from './config.types';

const log = log4js.getLogger('plink.config');
// const yamljs = require('yamljs');
import yamljs from 'yamljs';
const {rootDir} = plinkEnv;

let rootPath = rootDir;

export const configHandlerMgr$ = new rx.BehaviorSubject<ConfigHandlerMgr | undefined>(undefined);

/**
 * read and return configuration
 * @name config
 * @return {object} setting
 */
const config = (): DrcpSettings => {
  return getState() as DrcpSettings;
};

config.initSync = (argv: CliOptions) => {
  dispatcher.saveCliOption(argv);
  if (process.env.PLINK_CLI_OPTS == null) {
    // For child process, worker thread to access cli options
    process.env.PLINK_CLI_OPTS = JSON.stringify(argv);
  }
  load(argv);
  return getState() as DrcpSettings;
};


config.reload = function reload() {
  const argv = getState().cliOptions!;
  load(argv);
  return getState() as DrcpSettings;
};

config.set = function(path: string, value: any) {
  dispatcher._change(setting => {
    _.set(setting, path, value);
  });
  return getState();
};

config.get = function(propPath: string, defaultValue: any) {
  return _.get(getState(), propPath, defaultValue);
};


/**
 * Resolve a path based on `rootPath`
 * @name resolve
 * @memberof config
 * @param  {string} property name or property path, like "name", "name.childProp[1]"
 * @return {string}     absolute path
 */
config.resolve = function(pathPropName: 'rootPath' | 'destDir'|'staticDir'|'serverDir', ...paths: string[]) {
  const args: string[] = [rootPath, getState()[pathPropName], ...paths];
  return Path.resolve(...args);
};

// config.configureStore = configureStore;

config.configHandlerMgr = configHandlerMgr$;

config.configHandlerMgrChanged = function(cb: (handler: ConfigHandlerMgr) => void) {
  configHandlerMgr$.pipe(
    op.distinctUntilChanged(),
    op.filter(handler => handler != null),
    op.tap(handler => cb(handler!))
  ).subscribe();
};

config.change = function(reducer: (setting: DrcpSettings) => void ) {
  return dispatcher._change(reducer);
}

// config.configHandlerMgrCreated = function(cb: (handler: ConfigHandlerMgr) => Promise<any> | void): Promise<void> {
//   return configHandlerMgr$.pipe(
//     op.distinctUntilChanged(),
//     op.filter(handler => handler != null),
//     op.concatMap(handler => Promise.resolve(cb(handler!))),
//     op.take(1)
//   ).toPromise();
// };

function load(cliOption: CliOptions) {
  dispatcher._change(s => {
    s.localIP = getLanIPv4();
  });
  const pkgSettingFiles = loadPackageSettings();
  const configFileList = cliOption.config || [];
  configFileList.forEach(localConfigPath => mergeFromYamlJsonFile(localConfigPath));
  const handlers = new ConfigHandlerMgr(
    configFileList.filter(name => /\.[tj]s$/.test(name))
      .map<[file: string, expName: string]>(item => [Path.resolve(item), 'default'])
      .concat(pkgSettingFiles)
  );
  configHandlerMgr$.next(handlers);
  dispatcher._change(draft => {
    handlers.runEachSync<ConfigHandler>((_file, obj, handler) => {
      if (handler.onConfig) {
        return handler.onConfig(draft as DrcpSettings, draft.cliOptions!);
      }
    });
  });
  validateConfig();

  dispatcher._change(s => {
    s.port = normalizePort(s.port);
  });
  mergeFromCliArgs(getState().cliOptions!);
}

function mergeFromYamlJsonFile(localConfigPath: string) {
  if (!fs.existsSync(localConfigPath)) {
    // eslint-disable-next-line no-console
    log.info(chalk.yellow(' File does not exist: %s', localConfigPath));
    return;
  }
  // eslint-disable-next-line no-console
  log.info(` Read ${localConfigPath}`);
  var configObj: {[key: string]: any};

  const matched = /\.([^.]+)$/.exec(localConfigPath);

  let suffix = matched ? matched[1] : null;
  if (suffix === 'yaml' || suffix === 'yml') {
    configObj = yamljs.parse(fs.readFileSync(localConfigPath, 'utf8'));
  } else if (suffix === 'json') {
    configObj = require(Path.resolve(localConfigPath));
  } else {
    return;
  }

  dispatcher._change(setting => {
    _.assignWith(setting, configObj, (objValue, srcValue, key, object, source) => {
      if (_.isObject(objValue) && !Array.isArray(objValue)) {
        // We only merge 1st and 2nd level properties
        return _.assign(objValue, srcValue);
      }
    });
  });
}

function mergeFromCliArgs(cliOpt: CliOptions) {
  if (!cliOpt.prop)
    return;
  for (let propPair of cliOpt.prop) {
    const propSet = propPair.split('=');
    let propPath = propSet[0];
    if (_.startsWith(propSet[0], '['))
      propPath = JSON.parse(propSet[0]);
    let value: any;
    try {
      value = JSON.parse(propSet[1]);
    } catch (e) {
      value = propSet[1] === 'undefined' ? undefined : propSet[1];
    }
    dispatcher._change(s => _.set(s, propPath, value));
    // eslint-disable-next-line no-console
    log.info(`[config] set ${propPath} = ${value as string}`);
  }
}


function validateConfig() {
  // TODO: json schema validation
}

// function trimTailSlash(url: string) {
//   if (url === '/') {
//     return url;
//   }
//   return _.endsWith(url, '/') ? url.substring(0, url.length - 1) : url;
// }

function normalizePort(val: string | number) {
  let port: number = typeof val === 'string' ? parseInt(val, 10) : val;

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return 8080;
}

type PackageInfo = ReturnType<(typeof _pkgList)['packages4Workspace']> extends Generator<infer T> ? T : unknown;

/**
 * @returns [defaultValueFile, exportName, dtsFile]
 */
export function* getPackageSettingFiles(workspaceKey: string, includePkg?: Set<string>): Generator<[
  /** relative path within package realpath, without ext file name */
  typeFileWithoutExt: string,
  typeExportName: string,
  /** relative path of js file, which exports default value or factory function of default value */
  jsFile: string,
  defaultExportName: string,
  pkg: PackageInfo
]> {
  const {packages4WorkspaceKey} = require('../package-mgr/package-list-helper') as typeof _pkgList;
  for (const pkg of packages4WorkspaceKey(workspaceKey, true)) {
    if (includePkg && !includePkg.has(pkg.name))
      continue;

    try {
      const dr = pkg.json.dr || pkg.json.plink!;
      if (dr == null || typeof dr.setting !== 'object') {
        continue;
      }
      const setting = dr.setting;
      log.debug('getPackageSettingFiles', pkg.name, setting);
      let [valueFile, valueExport] = setting.value.split('#', 2);

      // Check value file
      const ext = Path.extname(valueFile);
      if (ext === '') {
        valueFile = valueFile + '.js';
      }
      if (valueExport == null)
        valueExport = 'default';

      const absFile = Path.resolve(pkg.realPath, valueFile);
      if (!fs.existsSync(absFile)) {
        log.warn(`Package ${pkg.name}'s configure file "${absFile}" does not exist, skipped.`);
        continue;
      }
      // Check dts type file
      let [typeFile, typeExportName] = setting.type.split('#', 2);
      let typeFileExt = Path.extname(typeFile);
      if (typeFileExt === '') {
        typeFile += '.dts';
      }

      const absTypeFile = Path.resolve(pkg.realPath, typeFileExt);
      if (!fs.existsSync(absTypeFile)) {
        log.warn(`Package setting ${pkg.name}'s dts file "${absTypeFile}" does not exist, skipped.`);
        continue;
      }
      if (typeExportName == null) {
        log.error(`Incorrect package config property format "${setting.type}" in ${pkg.realPath + Path.sep}package.json` +
          ', correct format is "<dts-file-relative-path>#<TS-type-export-name>"');
        continue;
      }
      yield [typeFile.replace(/\.[^./\\]+$/g, ''), typeExportName, valueFile, valueExport, pkg];
    } catch (err) {
      log.warn(`Skip loading setting of package ${pkg.name}, due to (this might be caused by incorrect package.json format)`, err);
    }
  }
}
/**
 * @returns absulte path of setting JS files which contains exports named with "default"
 */
function loadPackageSettings(): [file: string, exportName: string][] {
  const {workspaceKey, isCwdWorkspace} = require('../package-mgr') as typeof _pkgMgr;
  if (!isCwdWorkspace()) {
    log.debug('Not in a workspace, skip loading package settings');
    return [];
  }
  const jsFiles: [file: string, exportName: string][] = [];
  for (const [_typeFile, _typeExport, jsFile, defaultSettingExport, pkg] of getPackageSettingFiles(workspaceKey(plinkEnv.workDir))) {
    try {
      const absFile = Path.resolve(pkg.realPath, jsFile);
      const exps = require(absFile);
      const defaultSettingFactory: PackageSettingInterf<any> = exps[defaultSettingExport];

      if (typeof defaultSettingFactory === 'function') {
        const value = defaultSettingFactory(getState().cliOptions!);
        dispatcher._change(s => s[pkg.name] = value);
      } else {
        log.warn(`Failed to load package setting from ${pkg.name}/${jsFile}.\n Export name "${defaultSettingExport}" is not found`);
      }
      if (defaultSettingFactory != null) {
        jsFiles.push([absFile, defaultSettingExport]);
      }
    } catch (err) {
      log.error(`Failed to load package setting from ${pkg.name}/${jsFile}.'${defaultSettingExport}`, err);
    }
  }
  return jsFiles;
}
export default (config as DrcpConfig);
