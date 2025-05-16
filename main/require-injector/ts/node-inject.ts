import Module from 'module';
import EventEmitter from 'events';
import Path from 'path';
import * as fs from 'fs';
import _ from 'lodash';
import log4js from 'log4js';
import {DirTree} from './dir-tree';


import {FactoryMap, FactoryMapInterf, FactoryMapCollection, FactoryFunc} from './factory-map';
export {FactoryMap, FactoryMapInterf, FactoryMapCollection};
const log = log4js.getLogger('require-injector.node-inject');

const emptyFactoryMap = {
  factory: emptryChainableFunction,
  substitute: emptryChainableFunction,
  alias: emptryChainableFunction,
  replaceCode: emptryChainableFunction,
  value:  emptryChainableFunction
} as FactoryMapInterf;

export interface InjectorOption {
  /**
	 * default is process.cwd(), used to resolve relative path in `.fromDir(path)`
	 */
  basedir?: string;
  /**
	 * default is false, if you only use this module as Browserify or Webpack's transform,
	 * you don't want injection work on Node side, no kidnapping on `Module.prototype.require`,
	 * set this property to `true`
	 */
  noNode?: boolean;
  // resolve?: (path: string) => string;
  resolveOpts?: any;
  debug?: boolean;
}

/**
 * browser-resolve options
 */
export interface ResolveOption {
  basedir?: string;
}
class Injector extends EventEmitter.EventEmitter {

  dirTree: DirTree<FactoryMap>;
  oldRequire: NodeJS.Require;
  config: InjectorOption = {};

  constructor(opts?: InjectorOption) {
    super();
    // this.sortedDirs = [];
    this.dirTree = new DirTree();
    // this.injectionScopeMap = {};
    this.oldRequire = Module.prototype.require;
    this._initOption(opts);
  }

  cleanup() {
    Module.prototype.require = this.oldRequire;
    // this.sortedDirs.splice(0);
    this.dirTree = new DirTree();
    // var self = this;
    // _.each(_.keys(self.injectionScopeMap), function(key) {
    // 	delete self.injectionScopeMap[key];
    // });
    this.config = {};
    if (this.config.debug)
      log.debug('cleanup');
  }

  fromPackage(packageName: string | string[], resolveOpts?: ResolveOption): FactoryMapInterf {
    if (Array.isArray(packageName)) {
      // eslint-disable-next-line prefer-rest-params
      const args = [].slice.call(arguments) as any[];
      const factoryMaps = _.map(packageName, single => {
        args[0] = single;
        // eslint-disable-next-line prefer-spread
        return this._fromPackage.apply(this, args as [any]);
      });
      return new FactoryMapCollection(factoryMaps);
    } else {
      return this._fromPackage(packageName, resolveOpts);
    }
  }

  _fromPackage(packageName: string, resolveOpts?: ResolveOption): FactoryMapInterf {
    // var resolveSync = resolve;
    if (!resolveOpts) {
      resolveOpts = this.config.resolveOpts;
    }
    let dir = resolveOpts?.basedir || process.cwd();
    const {root: rootDir} = Path.parse(dir);
    let jsonPath: string | undefined;
    do {
      const testPkgJson = Path.resolve(dir, 'node_modules', packageName, 'package.json');
      if (fs.existsSync(testPkgJson)) {
        jsonPath = testPkgJson;
        break;
      } else {
        dir = Path.dirname(dir);
      }
    } while (dir !== rootDir);
    if (jsonPath == null) {
      log.info(packageName + ' is not Found, will be skipped from .fromPackage()');
      return emptyFactoryMap;
    }
    const path = Path.dirname(jsonPath);
    return this._fromDir(path, this.dirTree);
  }

  fromRoot(): FactoryMapInterf {
    return this._fromDir('', this.dirTree);
  }

  fromDir(dir: string | string[]): FactoryMapInterf {
    if (_.isArray(dir)) {
      const args = [].slice.call(arguments) as any[];
      const factoryMaps = _.map(dir, single => {
        args[0] = single;
        return this.resolveFromDir.apply(this, args as [any]);
      });
      return new FactoryMapCollection(factoryMaps);
    } else {
      return this.resolveFromDir(dir);
    }
  }

  resolveFromDir(dir: string): FactoryMapInterf {
    const path = this.config.basedir ?
      Path.resolve(this.config.basedir, dir) : Path.resolve(dir);
    return this._fromDir(path, this.dirTree);
  }

  /**
	 * Recursively build dirTree, subDirMap
	 * @param  {string} path new directory
	 * @param  {Array<string>} dirs [description]
	 * @return {[type]}      [description]
	 */
  _fromDir(path: string, tree: DirTree<FactoryMap>): FactoryMap {
    let factory: FactoryMap | undefined;
    const linked = parseSymlink(path);
    if (linked !== path) {
      log.debug('%s is symbolic link path to %s', path, linked);
      factory = this._createFactoryMapFor(linked, tree);
    }
    return this._createFactoryMapFor(path, tree, factory);
  }

  _createFactoryMapFor(path = '', tree: DirTree<FactoryMap>, existingFactory?: FactoryMap): FactoryMap {
    // path = this._pathToSortKey(path);
    if (!existingFactory) {
      let f = tree.getData(path);
      if (f) {
        return f;
      } else {
        f = new FactoryMap(this.config);
        tree.putData(path, f);
        return f;
      }
    } else {
      tree.putData(path, existingFactory);
      return existingFactory;
    }
  }

  /**
	 * Return array of configured FactoryMap for source code file depends on the file's location.
	 * Later on, you can call `factoryMap.matchRequire(name)` to get exact inject value
	 * @return {FactoryMap[]} Empty array if there is no injector configured for current file
	 */
  factoryMapsForFile(fromFile: string): FactoryMap[] {
    const fmaps = this.dirTree.getAllData(fromFile);
    return _.reverse(fmaps);
  }

  testable() {
    return this;
  }
  protected _initOption(opts?: InjectorOption) {
    if (opts)
      this.config = opts;

    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this;
    if (!_.get(opts, 'noNode')) {
      Module.prototype.require = function(path) {
        return self.replacingRequire(this, path);
      } as NodeJS.Require;
    }
  }
  protected inject(calleeModule: Module, name: string) {
    if (calleeModule.filename == null)
      return this.oldRequire.call(calleeModule, name);
    const fmaps = this.factoryMapsForFile(calleeModule.filename);
    if (fmaps.length === 0)
      return this.oldRequire.call(calleeModule, name);
    let injected;
    const match = _.some(fmaps, factoryMap => {
      const injector = factoryMap.matchRequire(name);
      if (injector == null) {
        return false;
      }
      if (this.config.debug) {
        log.debug('inject %s', name);
      }
      injected = factoryMap.getInjected(injector, calleeModule.filename, calleeModule, this.oldRequire);
      this.emit('inject', calleeModule.filename);
      return true;
    });
    if (!match)
      return this.oldRequire.call(calleeModule, name);
    return injected;
  }

  protected replacingRequire(calleeModule: Module, path: string) {
    try {
      return this.inject(calleeModule, path);
    } catch (e: any) {
      if (this.config.debug)
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        log.debug('require from : ', calleeModule.filename, e.message);
      throw e;
    }
  }
}

export {Injector as default, Injector as NodeInjector};

/**
 * If a path contains symbolic link, return the exact real path
 * Unlike fs.realpath, it also works for nonexist path
 */
export function parseSymlink(path: string) {
  try {
    fs.accessSync(path, fs.constants.F_OK);
    return fs.realpathSync(path);
  } catch (e) {}
  path = Path.resolve(path);
  const parsed = Path.parse(path);
  let dir = parsed.root;
  const pathElements = path.split(Path.sep).slice(1);
  pathElements.some((el, index) => {
    if (!_.endsWith(dir, Path.sep))
      dir += Path.sep;
    dir += el;
    try {
      fs.accessSync(dir, fs.constants.F_OK);
    } catch (e) {
      const restPart = pathElements.slice(index + 1).join(Path.sep);
      dir += restPart.length > 0 ? Path.sep + restPart : restPart;
      return true;
    }
    if (fs.lstatSync(dir).isSymbolicLink()) {
      const link = fs.readlinkSync(dir);
      dir = Path.resolve(Path.dirname(dir), link);
    }
    return false;
  });
  return dir;
}

function emptryChainableFunction(name: string | RegExp, RegExp: string| FactoryFunc): FactoryMapInterf {
  return emptyFactoryMap;
}
