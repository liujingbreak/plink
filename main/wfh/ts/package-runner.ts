/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable  max-len */
import * as _ from 'lodash';
import {PackageInfo, packageOfFileFactory, walkPackages} from './package-mgr/package-info-gathering';
import { nodeInjector, webInjector } from './injector-factory';
import _NodeApi from './package-mgr/node-package-api';
import PackageInstance from './packageNodeInstance';
import { orderPackages } from './package-priority-helper';
import NodePackage from './packageNodeInstance';
import Path from 'path';
import {createLazyPackageFileFinder, packages4Workspace} from './package-utils';
import log4js from 'log4js';
import {isCwdWorkspace, getState, workspaceKey, PackageInfo as PackageState} from './package-mgr';
import {packages4WorkspaceKey} from './package-mgr/package-list-helper';
import chalk from 'chalk';

import {getWorkDir} from './utils/misc';

const log = log4js.getLogger('plink.package-runner');

export interface ServerRunnerEvent {
  file: string;
  functionName: string;
}

export function isServerPackage(pkg: PackageState) {
  const plinkProp = pkg.json.plink || pkg.json.dr;
  return plinkProp && (plinkProp.type === 'server' || (Array.isArray(plinkProp.type) && plinkProp.type.includes('server')));
}

export function readPriorityProperty(json: any) {
  return _.get(json, 'plink.serverPriority', _.get(json, 'dr.serverPriority'));
}

export function runServer(): {started: Promise<unknown>; shutdown(): Promise<void>} {
  let wsKey: string | null | undefined = workspaceKey(getWorkDir());
  wsKey = getState().workspaces.has(wsKey) ? wsKey : getState().currWorkspace;
  if (wsKey == null) {
    throw new Error('Current directory is not a workspace directory');
  }
  const pkgs = Array.from(packages4WorkspaceKey(wsKey, true))
  .filter(isServerPackage);

  const pkgNames = pkgs.map(item => item.name);
  const pkgEntryMap = new Map<string, [file: string | undefined, func: string]>(pkgs.map(item => {
    const info = item.json.plink || item.json.dr!;
    let mainFile = info.serverEntry || item.json.main as string | undefined;
    let funcName = 'activate';
    if (mainFile) {
      const tmp = mainFile.split('#');
      mainFile = tmp[0];
      if (tmp[1])
        funcName = tmp[1];
    }

    return [item.name, [mainFile, funcName]];
  }));

  const started = _runPackages(pkgNames, pkgName => pkgEntryMap.get(pkgName))
  .then(reverseOrderPkgExports => {
    return new Promise<typeof reverseOrderPkgExports>(resolve => setTimeout(() => {
      resolve(reverseOrderPkgExports);
    }, 500));
  });

  // const reverseOrderPkgExports = await runPackages('#activate', pkgs);

  // await new Promise(resolve => setTimeout(resolve, 500));
  return {
    started,
    async shutdown() {
      const reverseOrderPkgExports = await started;
      log.info('shutting down');
      for (const {name, exp} of reverseOrderPkgExports) {
        if (_.isFunction(exp.deactivate)) {
          log.info('deactivate', name);
          await Promise.resolve(exp.deactivate());
        }
      }
    }
  };
}

const apiCache: {[name: string]: any} = {};
// const packageTree = new DirTree<PackageInstance>();

/**
 * Lazily init injector for packages and run specific package only,
 * no fully scanning or ordering on all packages
 */
export async function runSinglePackage({target, args}: {target: string; args: string[]}) {
  if (!isCwdWorkspace()) {
    return Promise.reject(new Error('Current directory is not a workspace directory'));
  }
  const [pkgInfo] = initInjectorForNodePackages();

  const [file, func] = target.split('#');
  const pkgNameMatch = /((?:@[^/]+\/)?[a-zA-Z0-9_-]+)\/$/.exec(file);
  let moduleName = Path.resolve(file);
  if (pkgNameMatch && pkgNameMatch[1] && _.has(pkgInfo.moduleMap, pkgNameMatch[1])) {
    moduleName = file;
  }
  const _exports = require(Path.resolve(getWorkDir(), 'node_modules', moduleName));
  if (!_.has(_exports, func)) {
    log.error(`There is no export function: ${func}, existing export members are:\n` +
    `${Object.keys(_exports).filter(name => typeof (_exports[name]) === 'function').map(name => name + '()').join('\n')}`);
    return;
  }
  await Promise.resolve(_exports[func].apply(global, args || []));
}

export function runPackages(target: string, includePackages: Iterable<string>): Promise<{name: string; exp: any}[]> {

  return _runPackages(includePackages, () => target.split('#') as [string, string]);
}

async function _runPackages(includePackages: Iterable<string>,
  targetOfPkg: (pkg: string) => [fileToRun: string | undefined, funcToRun: string] | undefined | null
): Promise<{name: string; exp: any}[]> {
  const includeNameSet = new Set<string>(includePackages);
  const pkgExportsInReverOrder: {name: string; exp: any}[] = [];

  const [packageInfo, proto] = initInjectorForNodePackages();
  const components = packageInfo.allModules.filter(pk => {
    const target = targetOfPkg(pk.name);
    if (target == null)
      return false;
    const [fileToRun] = target;
    // setupRequireInjects(pk, NodeApi); // All component package should be able to access '__api', even they are not included
    if ((includeNameSet.size === 0 || includeNameSet.has(pk.longName) || includeNameSet.has(pk.shortName))) {
      try {
        if (fileToRun)
          require.resolve(Path.resolve(getWorkDir(), 'node_modules', pk.longName, fileToRun));
        else
          require.resolve(Path.resolve(getWorkDir(), 'node_modules', pk.longName));
        return true;
      } catch (err) {
        return false;
      }
    }
    return false;
  });

  const packageNamesInOrder: string[] = [];
  const NodeApi: typeof _NodeApi = require('./package-mgr/node-package-api').default;


  await orderPackages(components.map(item => ({
    name: item.longName,
    priority: _.get(item.json, 'plink.serverPriority', _.get(item.json, 'dr.serverPriority'))
  })),
    pkInstance  => {
      const [fileToRun, funcToRun] = targetOfPkg(pkInstance.name)!;
      packageNamesInOrder.push(pkInstance.name);
      const mod = pkInstance.name + ( fileToRun ? '/' + fileToRun : '');
      log.debug('require(%sf)', JSON.stringify(mod));
      const fileExports = require(Path.resolve(getWorkDir(), 'node_modules', mod));
      pkgExportsInReverOrder.unshift({name: pkInstance.name, exp: fileExports});
      if (_.isFunction(fileExports[funcToRun])) {
        log.info(funcToRun + ` ${chalk.cyan(mod)}`);
        return fileExports[funcToRun](getApiForPackage(packageInfo.moduleMap[pkInstance.name], NodeApi));
      }
  });
  (proto.eventBus ).emit('done', {});
  NodeApi.prototype.eventBus.emit('packagesActivated', includeNameSet);
  return pkgExportsInReverOrder;
}

/**
 * So that we can use `import api from '__plink'` anywhere in our package
 */
export function initInjectorForNodePackages():
  [PackageInfo, _NodeApi] {
  const {getPkgOfFile, packageInfo} = packageOfFileFactory();
  // const packageInfo: PackageInfo = walkPackages();
  const NodeApi: typeof _NodeApi = require('./package-mgr/node-package-api').default;
  const proto = NodeApi.prototype;
  proto.argv = {};
  proto.packageInfo = packageInfo;

  proto.findPackageByFile = getPkgOfFile;
  proto.getNodeApiForPackage = function(packageInstance: PackageInstance) {
    return getApiForPackage(packageInstance, NodeApi);
  };
  proto.browserInjector = webInjector;
  packageInfo.allModules.forEach(pk => {
    setupRequireInjects(pk, NodeApi); // All component package should be able to access '__api', even they are not included
  });
  nodeInjector.readInjectFile();
  webInjector.readInjectFile('module-resolve.browser');
  return [packageInfo, proto];
}

/**
 * @deprecated
 * Support `import api from '__api';`
 * @param argv 
 */
export function prepareLazyNodeInjector(argv?: {[key: string]: any}) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const NodeApi: typeof _NodeApi = require('./package-mgr/node-package-api').default;
  const proto = NodeApi.prototype;
  proto.argv = argv || {};
  let packageInfo: PackageInfo;

  Object.defineProperty(proto, 'packageInfo', {
    get() {
      if (packageInfo == null)
        packageInfo = walkPackages();
      return packageInfo;
    }
  });
  proto.findPackageByFile = createLazyPackageFileFinder();
  proto.getNodeApiForPackage = function(packageInstance: NodePackage) {
    return getApiForPackage(packageInstance, NodeApi);
  };
  nodeInjector.fromRoot()
  // .alias('log4js', Path.resolve(config().rootPath, 'node_modules/log4js'))
  .value('__injector', nodeInjector)
  .factory('__api', (sourceFilePath: string) => {
    const packageInstance = proto.findPackageByFile(sourceFilePath);
    if (packageInstance)
      return getApiForPackage(packageInstance, NodeApi);
    return null;
  });
}

export function mapPackagesByType(types: string[], onEachPackage: (nodePackage: NodePackage) => void) {
  const packagesMap: {[type: string]: NodePackage[]} = {};
  types.forEach(type => {
    packagesMap[type] = [];
  });

  for (const pkg of packages4Workspace()) {
    const name = pkg.name;
    const pkInstance = new NodePackage({
      moduleName: name,
      shortName: pkg.shortName,
      name,
      longName: name,
      scope: pkg.scope,
      path: Path.resolve(getWorkDir(), pkg.path),
      json: pkg.json,
      realPath: pkg.realPath
    });
    const drTypes = ([] as string[]).concat(_.get(pkg.json, 'plink.type', _.get(pkg.json, 'dr.type')));
    for (const type of types) {
      if (!_.includes(drTypes, type))
        continue;
      packagesMap[type].push(pkInstance);
    }
    if (onEachPackage) {
      onEachPackage(pkInstance);
    }
  }
  return packagesMap;
}

function setupRequireInjects(pkInstance: PackageInstance, NodeApi: typeof _NodeApi ) {
  function apiFactory() {
    return getApiForPackage(pkInstance, NodeApi) as unknown;
  }
  nodeInjector.addPackage(pkInstance.longName, pkInstance.realPath,
    pkInstance.path === pkInstance.realPath ? undefined : pkInstance.path);
  nodeInjector.fromDir(pkInstance.realPath)
  .value('__injector', nodeInjector)
  .factory('__api', apiFactory)
  .factory('__plink', apiFactory);

  // webInjector.fromDir(pkInstance.realPath)
  // .replaceCode('__api', '__api');
  // .substitute(/^([^{]*)\{locale\}(.*)$/,
  //   (_filePath: string, match: RegExpExecArray) => match[1] + apiPrototype.getBuildLocale() + match[2]);
  const symlinkDir = pkInstance.path !== pkInstance.realPath ? pkInstance.path : null;
  if (symlinkDir) {
    nodeInjector.fromDir(symlinkDir)
    .value('__injector', nodeInjector)
    .factory('__plink', apiFactory);

    // webInjector.fromDir(symlinkDir)
    // .replaceCode('__api', '__api');
  }
}

function getApiForPackage(pkInstance: NodePackage, NodeApi: typeof _NodeApi) {
  if (_.has(apiCache, pkInstance.longName)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return apiCache[pkInstance.longName];
  }

  const api = new NodeApi(pkInstance.longName, pkInstance);
  apiCache[pkInstance.longName] = api;
  api.default = api; // For ES6 import syntax
  return api;
}
