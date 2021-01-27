/* tslint:disable max-line-length */
import * as _ from 'lodash';
import LRU from 'lru-cache';
import {PackageInfo, walkPackages} from './package-mgr/package-info-gathering';
import { nodeInjector, webInjector } from './injector-factory';
import _NodeApi from './package-mgr/node-package-api';
import PackageInstance from './packageNodeInstance';
import { orderPackages } from './package-priority-helper';
import NodePackage from './packageNodeInstance';
import Path from 'path';
import Events from 'events';
import {createLazyPackageFileFinder, packages4Workspace} from './package-utils';
import log4js from 'log4js';
import config from './config';
import {isCwdWorkspace, getState, workspaceKey, PackageInfo as PackageState} from './package-mgr';
import {packages4WorkspaceKey} from './package-mgr/package-list-helper';
import chalk from 'chalk';
import {getSymlinkForPackage} from './utils/misc';

const log = log4js.getLogger('package-runner');

export interface ServerRunnerEvent {
  file: string;
  functionName: string;
}

export function isServerPackage(pkg: PackageState) {
  return pkg.json.dr && pkg.json.dr.type && (pkg.json.dr.type === 'server' || (pkg.json.dr.type  as string[]).includes('server'));
}

export function readPriorityProperty(json: any) {
  return _.get(json, 'dr.serverPriority');
}

export async function runServer() {
  let wsKey: string | null | undefined = workspaceKey(process.cwd());
  wsKey = getState().workspaces.has(wsKey) ? wsKey : getState().currWorkspace;
  if (wsKey == null) {
    throw new Error('Current directory is not a workspace directory');
  }
  const pkgs = Array.from(packages4WorkspaceKey(wsKey, true))
  .filter(isServerPackage)
  .map(item => item.name);

  const reverseOrderPkgExports = await runPackages('#activate', pkgs);

  await new Promise(resolve => setTimeout(resolve, 500));
  return async () => {
    log.info('shutting down');
    for (const {name, exp} of reverseOrderPkgExports) {
      if (_.isFunction(exp.deactivate)) {
        log.info('deactivate', name);
        await Promise.resolve(exp.deactivate());
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
export async function runSinglePackage({target, args}: {target: string, args: string[]}) {
  if (!isCwdWorkspace()) {
    return Promise.reject(new Error('Current directory is not a workspace directory'));
  }
  const passinArgv = {};
  // console.log(args);
  // throw new Error('stop');
  for (let i = 0, l = args.length; i < l; i++) {
    const key = args[i];
    if (key.startsWith('-')) {
      if (i === args.length - 1 || args[i + 1].startsWith('-')) {
        passinArgv[_.trimStart(key, '-')] = true;
      } else {
        passinArgv[key] = args[i + 1];
        i++;
      }
    }
  }
  prepareLazyNodeInjector(passinArgv);
  const [file, func] = target.split('#');

  const guessingFile: string[] = [
    file,
    Path.resolve(file),
    ...(config().packageScopes as string[]).map(scope => `@${scope}/${file}`)
  ];
  const foundModule = guessingFile.find(target => {
    try {
      require.resolve(target);
      return true;
    } catch (ex) {
      return false;
    }
  });

  if (!foundModule) {
    throw new Error(`Could not find target module from paths like:\n${guessingFile.join('\n')}`);
  }
  const _exports = require(foundModule);
  if (!_.has(_exports, func)) {
    log.error(`There is no export function: ${func}, existing export members are:\n` +
    `${Object.keys(_exports).filter(name => typeof (_exports[name]) === 'function').map(name => name + '()').join('\n')}`);
    return;
  }
  await Promise.resolve(_exports[func].apply(global, args || []));
}

export async function runPackages(target: string, includePackages: Iterable<string>): Promise<{name: string; exp: any}[]> {
  const includeNameSet = new Set<string>(includePackages);
  const pkgExportsInReverOrder: {name: string; exp: any}[] = [];

  const [fileToRun, funcToRun] = (target as string).split('#');
  const [packages, proto] = initInjectorForNodePackages(walkPackages());
  const components = packages.filter(pk => {
    // setupNodeInjectorFor(pk, NodeApi); // All component package should be able to access '__api', even they are not included
    if ((includeNameSet.size === 0 || includeNameSet.has(pk.longName) || includeNameSet.has(pk.shortName))) {
      try {
        if (fileToRun)
          require.resolve(pk.longName + '/' + fileToRun);
        else
          require.resolve(pk.longName);
        return true;
      } catch (err) {
        return false;
      }
    }
    return false;
  });

  const packageNamesInOrder: string[] = [];

  await orderPackages(components.map(item => ({name: item.longName, priority: _.get(item.json, 'dr.serverPriority')})),
  pkInstance  => {
    packageNamesInOrder.push(pkInstance.name);
    const mod = pkInstance.name + ( fileToRun ? '/' + fileToRun : '');
    log.debug('require(%s)', JSON.stringify(mod));
    const fileExports = require(mod);
    pkgExportsInReverOrder.unshift({name: pkInstance.name, exp: fileExports});
    if (_.isFunction(fileExports[funcToRun])) {
      log.info(funcToRun + ` ${chalk.cyan(mod)}`);
      return fileExports[funcToRun]();
    }
  });
  (proto.eventBus as Events.EventEmitter).emit('done', {file: fileToRun, functionName: funcToRun} as ServerRunnerEvent);
  const NodeApi: typeof _NodeApi = require('./package-mgr/node-package-api');
  NodeApi.prototype.eventBus.emit('packagesActivated', includeNameSet);
  return pkgExportsInReverOrder;
}

export function initInjectorForNodePackages(packageInfo: PackageInfo):
  [PackageInstance[], _NodeApi] {
  const NodeApi: typeof _NodeApi = require('./package-mgr/node-package-api');
  const proto = NodeApi.prototype;
  proto.argv = {};
  proto.packageInfo = packageInfo;
  const cache = new LRU<string, PackageInstance>({max: 20, maxAge: 20000});
  proto.findPackageByFile = function(file: string): PackageInstance | undefined {
    var found = cache.get(file);
    if (!found) {
      found = packageInfo.dirTree.getAllData(file).pop();
      if (found)
        cache.set(file, found);
    }
    return found;
  };
  proto.getNodeApiForPackage = function(packageInstance: PackageInstance) {
    return getApiForPackage(packageInstance, NodeApi);
  };
  packageInfo.allModules.forEach(pk => {
    setupNodeInjectorFor(pk, NodeApi); // All component package should be able to access '__api', even they are not included
  });
  return [packageInfo.allModules, proto];
}

export function initWebInjector(packages: PackageInstance[], apiPrototype: any) {
  _.each(packages, pack => {
    webInjector.addPackage(pack.longName, pack.path);
  });
  webInjector.fromAllPackages()
  .replaceCode('__api', '__api')
  .substitute(/^([^{]*)\{locale\}(.*)$/,
    (_filePath: string, match: RegExpExecArray) => match[1] + apiPrototype.getBuildLocale() + match[2]);

  webInjector.readInjectFile('module-resolve.browser');
  apiPrototype.browserInjector = webInjector;
}

/**
 * Support `import api from '__api';`
 * @param argv 
 */
export function prepareLazyNodeInjector(argv?: {[key: string]: any}) {
  const NodeApi: typeof _NodeApi = require('./package-mgr/node-package-api');
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
      path: pkg.path,
      json: pkg.json,
      realPath: pkg.realPath
    });
    const drTypes = ([] as string[]).concat(_.get(pkg, 'json.dr.type'));
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

function setupNodeInjectorFor(pkInstance: PackageInstance, NodeApi: typeof _NodeApi ) {
  function apiFactory() {
    return getApiForPackage(pkInstance, NodeApi);
  }
  nodeInjector.fromDir(pkInstance.realPath)
  .value('__injector', nodeInjector)
  .factory('__api', apiFactory);
  const symlinkDir = getSymlinkForPackage(pkInstance.name);
  if (symlinkDir) {
    nodeInjector.fromDir(symlinkDir)
    .value('__injector', nodeInjector)
    .factory('__api', apiFactory);
  }
}

function getApiForPackage(pkInstance: NodePackage, NodeApi: typeof _NodeApi) {
  if (_.has(apiCache, pkInstance.longName)) {
    return apiCache[pkInstance.longName];
  }

  const api = new NodeApi(pkInstance.longName, pkInstance);
  // api.constructor = NodeApi;
  pkInstance.api = api;
  apiCache[pkInstance.longName] = api;
  api.default = api; // For ES6 import syntax
  return api;
}
