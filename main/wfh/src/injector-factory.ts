import * as fs from 'fs';
import * as Path from 'path';
import RJ from 'require-injector';
import {FactoryMapCollection, FactoryMapInterf} from 'require-injector/dist/factory-map';
import * as _ from 'lodash';
import log4js from 'log4js';
import _config from './config';
import {PlinkSettings} from './config/config-slice';
import {getRootDir, getWorkDir} from './utils/misc';
const log = log4js.getLogger('plink.injector-factory');

const packageNamePathMap = new Map<string, {symlink?: string; realPath: string}>();

const emptyFactoryMap = {
  factory: emptryChainableFunction,
  substitute: emptryChainableFunction,
  value: emptryChainableFunction,
  alias: emptryChainableFunction
};

export class DrPackageInjector extends RJ {
  constructor(protected noNode = false) {
    super({
      basedir: getRootDir(),
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
      for (const nm of names ) {
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
    const names = _.difference([...packageNamePathMap.keys()], excludePackages);
    const dirs = names.map(pkName => packageNamePathMap.get(pkName)!.realPath);
    const symdirs = names.map(pkName => packageNamePathMap.get(pkName)!.symlink!);
    log.debug('from ' + dirs);
    return super.fromDir(dirs.concat(symdirs));
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

export const nodeInjector = new DrPackageInjector(false);

export const webInjector = new DrPackageInjector(true);

export interface InjectorConfigHandler {
  /** For Client framework build tool (React, Angular), replace module in "require()" or import syntax */
  setupWebInjector?(factory: DrPackageInjector, allSetting: PlinkSettings): void;
  /** For Node.js runtime, replace module in "require()" or import syntax */
  setupNodeInjector?(factory: DrPackageInjector, allSetting: PlinkSettings): void;
}

export function doInjectorConfigSync(factory: DrPackageInjector, isNode = false) {
  const config: typeof _config = require('./config').default;
  config.configHandlerMgrChanged(handler => {
    handler.runEachSync<InjectorConfigHandler>((_file: string, _lastResult: any, handler) => {
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

/** @deprecated */
export function doInjectorConfig(factory: DrPackageInjector, isNode = false) {
  const config: typeof _config = require('./config').default;
  config.configHandlerMgrChanged(handler => {
    void handler.runEach<InjectorConfigHandler>((_file: string, _lastResult: any, handler) => {
      if (isNode && handler.setupNodeInjector)
        handler.setupNodeInjector(factory, config());
      else if (!isNode && handler.setupWebInjector)
        handler.setupWebInjector(factory, config());
    }, 'Injector configuration for ' + (isNode ? 'Node.js runtime' : 'client side build tool'));
  });
}
