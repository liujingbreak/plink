import RJ, {InjectorOption} from 'require-injector';
import _config from './config';
import {DrcpSettings} from './config/config-slice';
import {FactoryMapCollection, FactoryMapInterf} from 'require-injector/dist/factory-map';
import * as _ from 'lodash';
import * as fs from 'fs';
import * as Path from 'path';
import log4js from 'log4js';
import {getRootDir, getWorkDir} from './utils/misc';
const log = log4js.getLogger('plink.injector-factory');

const packageNamePathMap = new Map<string, {symlink?: string; realPath: string;}>();

const emptyFactoryMap = {
  factory: emptryChainableFunction,
  substitute: emptryChainableFunction,
  value: emptryChainableFunction,
  alias: emptryChainableFunction
};

export class DrPackageInjector extends RJ {
  constructor(resolve: InjectorOption['resolve'], protected noNode = false) {
    super({
      basedir: getRootDir(),
      resolve,
      // debug: config.devMode,
      noNode
    });
  }

  addPackage(name: string, dir: string, symlinkDir?: string) {
    log.debug('add %s %s', name, dir);
    packageNamePathMap.set(name, {symlink: symlinkDir, realPath: dir});
  }

  fromPlinkPackage(name: string | string[], dir?: string | string[]) {
    const names = ([] as string[]).concat(name);
    if (dir) {
      const dirs = ([] as string[]).concat(dir);
      let i = 0;
      if (names.length !== dirs.length)
        throw new Error('fromComponent(name, dir)\'s be called with 2 Array of same length');
      for (const nm of names as string[]) {
        this.addPackage(nm, dirs[i++]);
      }
    }
    const factoryMaps: FactoryMapInterf[] = [];
    for (const nm of names) {
      const paths = packageNamePathMap.get(nm);
      if (paths) {
        factoryMaps.push(super.fromDir(paths.realPath));
        if (paths.symlink) {
          factoryMaps.push(super.fromDir(paths.symlink));
        }
      } else {
        factoryMaps.push(super.fromPackage(nm));
      }
    }
    return new FactoryMapCollection(factoryMaps);
  }

  fromAllComponents() {
    const realpaths = Array.from(packageNamePathMap.values())
      .map(item => item.realPath);
    const symlinks = Array.from(packageNamePathMap.values())
    .map(item => item.symlink).filter(dir => dir != null);
    return super.fromDir(realpaths.concat(symlinks as string[]));
  }

  fromAllPackages() {
    return this.fromAllComponents();
  }

  notFromPackages(...excludePackages: string[]) {
    const names = _.difference(_.keys(packageNamePathMap), excludePackages);
    const dirs = names.map(pkName => packageNamePathMap[pkName]);
    log.debug('from ' + dirs);
    return super.fromDir(dirs);
  }

  readInjectFile(fileNameWithoutExt?: string) {

    if (!fileNameWithoutExt)
      fileNameWithoutExt = 'module-resolve.server';
    _.uniq([
      Path.resolve(getRootDir(), fileNameWithoutExt),
      Path.resolve(getWorkDir(), fileNameWithoutExt)
    ]).forEach(file => {
      const file1 = fs.existsSync(file + '.ts') ? file + '.ts' : file + '.js';
      if (fs.existsSync(file1)) {
        log.debug('execute internal ' + file1);
        let exported = require(file1);
        if (exported.default)
          exported = exported.default;
        exported(this);
      } else {
        log.debug(file1 + ' doesn\'t exist, skip it.');
      }
    });

    return doInjectorConfigSync(this, !this.noNode);
  }


}

export let nodeInjector = new DrPackageInjector(require.resolve, false);

export let webInjector = new DrPackageInjector(undefined, true);

export interface InjectorConfigHandler {
  /** For Node.js runtime, replace module in "require()" or import syntax */
  setupNodeInjector?(factory: DrPackageInjector, setting: DrcpSettings): void;
  /** For Client framework build tool (React, Angular), replace module in "require()" or import syntax */
  setupWebInjector?(factory: DrPackageInjector, setting: DrcpSettings): void;
}

/** @deprecated */
export function doInjectorConfig(factory: DrPackageInjector, isNode = false) {
  const config: typeof _config = require('./config').default;
  config.configHandlerMgrChanged(handler => {
    handler.runEach<InjectorConfigHandler>((file: string, lastResult: any, handler) => {
      if (isNode && handler.setupNodeInjector)
        handler.setupNodeInjector(factory, config());
      else if (!isNode && handler.setupWebInjector)
        handler.setupWebInjector(factory, config());
    }, 'Injector configuration for ' + (isNode ? 'Node.js runtime' : 'client side build tool'));
  });
}

export function doInjectorConfigSync(factory: DrPackageInjector, isNode = false) {
  const config: typeof _config = require('./config').default;
  config.configHandlerMgrChanged(handler => {
    handler.runEachSync<InjectorConfigHandler>((file: string, lastResult: any, handler) => {
      if (isNode && handler.setupNodeInjector)
        handler.setupNodeInjector(factory, config());
      else if (!isNode && handler.setupWebInjector)
        handler.setupWebInjector(factory, config());
    }, 'Injector configuration for ' + (isNode ? 'Node.js runtime' : 'client side build tool'));
  });
}

function emptryChainableFunction() {
  return emptyFactoryMap;
}
