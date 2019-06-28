/* tslint:disable max-line-length */
import NodePackage from './packageNodeInstance';
import Events = require('events');
import * as _ from 'lodash';
import {PackageInfo, packageInstance} from './build-util/ts';
// import Package from './packageNodeInstance';
import {orderPackages} from './package-priority-helper';
import {walkPackages} from './build-util/ts';
const LRU = require('lru-cache');
const config = require('../lib/config');
const packageUtils = require('../lib/packageMgr/packageUtils');
// const NodeApi = require('../lib/nodeApi');
// const {nodeInjector} = require('../lib/injectorFactory');
import {webInjector, nodeInjector} from './injector-factory';

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
  return orderPackages(components, (pkInstance: packageInstance)  => {
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
  [packageInstance[], {eventBus: Events}] {
  const NodeApi = require('../lib/nodeApi');
  const proto = NodeApi.prototype;
  proto.argv = argv;
  const packageInfo: PackageInfo = walkPackages(config, packageUtils);
  proto.packageInfo = packageInfo;
  const cache = LRU(20);
  proto.findPackageByFile = function(file: string) {
    var found = cache.get(file);
    if (!found) {
      found = packageInfo.dirTree.getAllData(file).pop();
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

export function initWebInjector(packages: packageInstance[], apiPrototype: any) {
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

function setupNodeInjectorFor(pkInstance: packageInstance, NodeApi: any) {
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

function getApiForPackage(pkInstance: any, NodeApi: any) {
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
