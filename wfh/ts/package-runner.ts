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
const NodeApi = require('../lib/nodeApi');
const {nodeInjector} = require('../lib/injectorFactory');


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

export function runPackages(argv: any) {
  const includeNameSet = new Set<string>();
  (argv.package as string[]).forEach(name => includeNameSet.add(name));

  const [fileToRun, funcToRun] = (argv.target as string).split('#');
  const NodeApi = require('../lib/nodeApi');
  const proto = NodeApi.prototype;
  proto.argv = argv;
  // const walkPackages = require('./build-util/ts').walkPackages;
  const packageInfo: PackageInfo = walkPackages(config, argv, packageUtils);
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
    return getApiForPackage(packageInstance);
  };
  const components = packageInfo.allModules.filter(pk => {
    setupNodeInjectorFor(pk); // All component package should be able to access '__api', even they are not included

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

function setupNodeInjectorFor(pkInstance: packageInstance) {
  function apiFactory() {
    return getApiForPackage(pkInstance);
  }
  nodeInjector.fromPackage(pkInstance.longName, pkInstance.realPackagePath)
  .value('__injector', nodeInjector)
  .factory('__api', apiFactory);
  nodeInjector.fromPackage(pkInstance.longName, pkInstance.packagePath)
  .value('__injector', nodeInjector)
  .factory('__api', apiFactory);
  nodeInjector.default = nodeInjector; // For ES6 import syntax
}

function getApiForPackage(pkInstance: any) {
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
