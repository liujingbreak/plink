/* tslint:disable max-line-length */
import * as _ from 'lodash';
import LRU from 'lru-cache';
import { LazyPackageFactory, PackageInfo, packageInstance as PackageBrowserInstance, walkPackages } from './build-util/ts';
// const NodeApi = require('../lib/nodeApi');
// const {nodeInjector} = require('../lib/injectorFactory');
import { nodeInjector, webInjector } from './injector-factory';
import _NodeApi from './package-mgr/node-package-api';
// import Package from './packageNodeInstance';
import { orderPackages, PackageInstance } from './package-priority-helper';
import NodePackage from './packageNodeInstance';
import Events = require('events');

const config = require('../lib/config');
const packageUtils = require('../lib/packageMgr/packageUtils');

const log = require('log4js').getLogger('package-runner');

export interface ServerRunnerEvent {
  file: string;
  functionName: string;
}
export class ServerRunner {
  // packageCache: {[shortName: string]: NodePackage} = {};
  // corePackages: {[shortName: string]: NodePackage} = {};
  deactivatePackages: NodePackage[];

  async shutdownServer() {
    log.info('shutting down');
    await this._deactivatePackages(this.deactivatePackages);
  }

  protected async _deactivatePackages(comps: NodePackage[]) {
    for (const comp of comps) {
      const exp = require(comp.longName);
      if (_.isFunction(exp.deactivate)) {
        log.info('deactivate', comp.longName);
        await Promise.resolve(exp.deactivate());
      }
    }
  }
}

const apiCache: {[name: string]: any} = {};
// const packageTree = new DirTree<PackageBrowserInstance>();
const lazyPackageFactory = new LazyPackageFactory();

/**
 * Lazily init injector for packages and run specific package only,
 * no fully scanning or ordering on all packages
 */
export async function runSinglePackage(argv: {target: string, arguments: string[], [key: string]: any}) {
  const NodeApi: typeof _NodeApi = require('./package-mgr/node-package-api');
  const proto = NodeApi.prototype;
  proto.argv = argv;
  let packageInfo: PackageInfo;

  Object.defineProperty(proto, 'packageInfo', {
    get() {
      if (packageInfo == null)
        packageInfo = walkPackages(config, packageUtils);
      return packageInfo;
    }
  });
  const cache = new LRU<string, PackageBrowserInstance>({max: 20, maxAge: 20000});
  proto.findPackageByFile = function(file: string): PackageBrowserInstance | undefined {
    let found = cache.get(file);
    if (!found) {
      found = lazyPackageFactory.getPackageByPath(file)!;
      if (found)
        cache.set(file, found);
    }
    return found;
  };
  proto.getNodeApiForPackage = function(packageInstance: any) {
    return getApiForPackage(packageInstance, NodeApi);
  };
  nodeInjector.fromRoot()
  .value('__injector', nodeInjector)
  .factory('__api', (sourceFilePath: string) => {
    const packageInstance = proto.findPackageByFile(sourceFilePath);
    return getApiForPackage(packageInstance, NodeApi);
  });
  // console.log(nodeInjector.dirTree.traverse());

  const [file, func] = argv.target.split('#');
  const packageScopes = config().packageScopes;
  let guessingFile = file;
  for (const scope of packageScopes) {
    try {
      require.resolve(guessingFile);
      break;
    } catch (ex) {
      guessingFile = `@${scope}/${file}`;
    }
  }
  const _exports = require(guessingFile);
  if (!_.has(_exports, func)) {
    log.error(`There is no export function: ${func}, existing export members are:\n` +
    `${Object.keys(_exports).filter(name => typeof (_exports[name]) === 'function').map(name => name + '()').join('\n')}`);
    return;
  }
  await Promise.resolve(_exports[func].apply(global, argv.arguments || []));
}

export function runPackages(argv: {target: string, package: string[], [key: string]: any}) {
  // const NodeApi = require('../lib/nodeApi');
  const includeNameSet = new Set<string>();
  argv.package.forEach(name => includeNameSet.add(name));
  const [fileToRun, funcToRun] = (argv.target as string).split('#');
  const [packages, proto] = initInjectorForNodePackages(argv);
  const components = packages.filter(pk => {
    // setupNodeInjectorFor(pk, NodeApi); // All component package should be able to access '__api', even they are not included
    if ((includeNameSet.size === 0 || includeNameSet.has(pk.longName) || includeNameSet.has(pk.shortName)) &&
      pk.dr != null) {
      try {
        require.resolve(pk.longName + '/' + fileToRun);
        return true;
      } catch (err) {
        return false;
      }
    }
    return false;
  });
  return orderPackages(components, (pkInstance: PackageInstance)  => {
    const mod = pkInstance.longName + '/' + fileToRun;
    log.info('require(%s)', JSON.stringify(mod));
    const fileExports: any = require(mod);
    if (_.isFunction(fileExports[funcToRun])) {
      log.info('Run %s %s()', mod, funcToRun);
      return fileExports[funcToRun]();
    }
  })
  .then(() => {
    (proto.eventBus as Events).emit('done', {file: fileToRun, functionName: funcToRun} as ServerRunnerEvent);
  });
}

export function initInjectorForNodePackages(argv: {[key: string]: any}):
  [PackageBrowserInstance[], {eventBus: Events}] {
  const NodeApi: typeof _NodeApi = require('./package-mgr/node-package-api');
  const proto = NodeApi.prototype;
  proto.argv = argv;
  const packageInfo: PackageInfo = walkPackages(config, packageUtils);
  proto.packageInfo = packageInfo;
  const cache = new LRU<string, PackageBrowserInstance>({max: 20, maxAge: 20000});
  proto.findPackageByFile = function(file: string): PackageBrowserInstance | undefined {
    var found = cache.get(file);
    if (!found) {
      found = packageInfo.dirTree.getAllData(file).pop();
      if (found)
        cache.set(file, found);
    }
    return found;
  };
  proto.getNodeApiForPackage = function(packageInstance: any) {
    return getApiForPackage(packageInstance, NodeApi);
  };
  const drPackages = packageInfo.allModules.filter(pk => {
    if (pk.dr) {
      setupNodeInjectorFor(pk, NodeApi); // All component package should be able to access '__api', even they are not included
      return true;
    }
    return false;
  });
  return [drPackages, proto];
}

export function initWebInjector(packages: PackageBrowserInstance[], apiPrototype: any) {
  _.each(packages, pack => {
    if (pack.dr) {
      // no vendor package's path information
      webInjector.addPackage(pack.longName, pack.packagePath);
    }
  });
  webInjector.fromAllPackages()
  .replaceCode('__api', '__api')
  .substitute(/^([^{]*)\{locale\}(.*)$/,
    (_filePath: string, match: RegExpExecArray) => match[1] + apiPrototype.getBuildLocale() + match[2]);

  const done = webInjector.readInjectFile('module-resolve.browser');
  apiPrototype.browserInjector = webInjector;
  return done;
}

function setupNodeInjectorFor(pkInstance: PackageBrowserInstance, NodeApi: typeof _NodeApi ) {
  function apiFactory() {
    return getApiForPackage(pkInstance, NodeApi);
  }
  nodeInjector.fromDir(pkInstance.realPackagePath)
  .value('__injector', nodeInjector)
  .factory('__api', apiFactory);
  nodeInjector.fromDir(pkInstance.packagePath)
  .value('__injector', nodeInjector)
  .factory('__api', apiFactory);
  // nodeInjector.default = nodeInjector; // For ES6 import syntax
}

function getApiForPackage(pkInstance: any, NodeApi: typeof _NodeApi) {
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

