import RJ, {InjectorOption} from 'require-injector';
import {doInjectorConfig} from './require-injectors';
import {FactoryMapCollection, FactoryMapInterf} from 'require-injector/dist/factory-map';
// import {ResolveOption} from 'require-injector/dist/node-inject';
import * as _ from 'lodash';
import * as fs from 'fs';
import * as Path from 'path';
import log4js from 'log4js';
const log = log4js.getLogger('wfh.injectorFactory');

const packageNamePathMap: {[name: string]: string} = {};

const emptyFactoryMap = {
  factory: emptryChainableFunction,
  substitute: emptryChainableFunction,
  value: emptryChainableFunction,
  alias: emptryChainableFunction
};

export class DrPackageInjector extends RJ {
  constructor(resolve: InjectorOption['resolve'], protected noNode = false) {
    super({
      basedir: process.cwd(),
      resolve,
      // debug: config.devMode,
      noNode
    });
  }

  addPackage(name: string, dir: string) {
    log.debug('add %s %s', name, dir);
    packageNamePathMap[name] = dir;
  }

  fromComponent(name: string | string[], dir?: string | string[]) {
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
      if (_.has(packageNamePathMap, nm)) {
        factoryMaps.push(super.fromDir(packageNamePathMap[nm]));
      } else {
        factoryMaps.push(super.fromPackage(nm));
      }
    }
    return new FactoryMapCollection(factoryMaps);
  }

  fromAllComponents() {
    return super.fromDir(_.values(packageNamePathMap));
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

  readInjectFile(fileNameWithoutExt: string) {

    if (!fileNameWithoutExt)
      fileNameWithoutExt = 'module-resolve.server';
    _.uniq([
      Path.resolve('./', fileNameWithoutExt),
      Path.resolve(process.cwd(), fileNameWithoutExt)
    ]).forEach(file => {
      const file1 = fs.existsSync(file + '.ts') ? file + '.ts' : file + '.js';
      if (fs.existsSync(file1)) {
        log.debug('execute internal ' + file1);
        let exported = require(file1);
        if (exported.default)
          exported = exported.default;
        exported(this);
      } else {
        log.info(file1 + ' doesn\'t exist');
      }
    });

    return doInjectorConfig(this, !this.noNode);
  }
}

export let nodeInjector = new DrPackageInjector(require.resolve, false);
export let webInjector = new DrPackageInjector(undefined, true);


function emptryChainableFunction() {
  return emptyFactoryMap;
}
