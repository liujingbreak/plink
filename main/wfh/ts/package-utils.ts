import LRU from 'lru-cache';
import PackageBrowserInstance from './build-util/ts/package-instance';
import LazyPackageFactory from './build-util/ts/lazy-package-factory';
import * as recipeMgr from './recipe-manager';
import {PackageInfo, createPackageInfo} from './package-mgr';
import * as Path from 'path';
import _ from 'lodash';
import log4js from 'log4js';
import * as fs from 'fs';
const log = log4js.getLogger('wfh.package-utils');
const oldPu = require('../lib/packageMgr/packageUtils');

const lazyPackageFactory = new LazyPackageFactory();

export function createLazyPackageFileFinder() {
  const cache = new LRU<string, PackageBrowserInstance>({max: 20, maxAge: 20000});
  return function(file: string): PackageBrowserInstance | undefined {
    let found = cache.get(file);
    if (!found) {
      found = lazyPackageFactory.getPackageByPath(file)!;
      if (found)
        cache.set(file, found);
    }
    return found;
  };
}

export type FindPackageCb = (fullName: string,
  entryPath: string,
  parsedName: {name: string, scope: string},
  json: any,
  packagePath: string,
  isInstalled: boolean) => void;

export function lookForPackages(packageList: string[], cb: FindPackageCb): void {
  return oldPu.lookForPackages(packageList, cb);
}

export type PackageType = '*' | 'build' | 'core';

export function findAllPackages(callback: FindPackageCb,
  recipeType?: 'src' | 'installed',
  projectDir?: string | string[]): void;
export function findAllPackages(packageList: string[] | string,
  callback: FindPackageCb,
  recipeType?: 'src' | 'installed',
  projectDir?: string | string[]): void;
export function findAllPackages(arg1: string[] | string | FindPackageCb,
  arg2?: FindPackageCb | 'src' | 'installed',
  arg3?: string | string[],
  arg4?: string | string[]) {
  oldPu.findAllPackages.apply(oldPu, arguments);
}

export {eachRecipe} from './recipe-manager';

class EntryFileFinder {
  private packageRecipeMap: {[key: string]: any} = {};

  constructor(private resolveFn: unknown) {

  }

  findByRecipeJson(recipePkjsonFile: string, isInstalled: boolean,
    eachCallback: (packageInfo: PackageInfo) => void) {
    const resolveFn = this.resolveFn;
    const self = this;
    const pj = JSON.parse(fs.readFileSync(recipePkjsonFile, 'utf-8'));
    if (!pj.dependencies) {
      return;
    }

    _.forOwn(Object.assign({}, pj.dependencies, pj.devDependencies), function(version, name) {
      if (isInstalled) {
        if (_.has(self.packageRecipeMap, name)) {
          log.warn('Duplicate component dependency "%s" found in "%s" and "%s"',
            name, self.packageRecipeMap[name], recipePkjsonFile);
          return;
        }
        self.packageRecipeMap[name] = recipePkjsonFile;
      }
      var parsedName = parseName(name);
      var packagePath = resolveFn.findPackagePath(name);
      if (!packagePath) {
        log.debug('Package %s does not exist', chalk.cyan(name));
        return;
      }
      var packageJsonFile = Path.join(packagePath, 'package.json');
      var json = JSON.parse(fs.readFileSync(packageJsonFile, 'utf-8'));
      var entryPath;
      // if (typeof (json.browser || json.main)
      // 	entryPath = Path.resolve(packagePath, json.browser || json.main);
      // else
      // 	entryPath = null;

      eachCallback(name, entryPath, parsedName, json, packagePath);
    });
  }
}

function _findPackageByType(_types: PackageType | PackageType[],
  callback: FindPackageCb, resolver, recipeType: 'src' | 'installed', projectDir: string) {

  const entryFileFindler = new EntryFileFinder(resolver);
  const types = ([] as PackageType[]).concat(_types);

  const srcCompSet = new Map();
  // tslint:disable-next-line: max-line-length
  // To avoid return duplicate components, some times duplicate component in associated projects, installed recipe or peer
  // dependency (recipe)

  if (recipeType === 'src') {
    recipeMgr.eachRecipeSrc(projectDir, (src, recipeDir) => {
      if (recipeDir)
        findEntryFiles(Path.resolve(recipeDir, 'package.json'), false);
    });
  } else if (recipeType === 'installed') {
    recipeMgr.eachInstalledRecipe((dir, isInstalled, fileName) => {
      return findEntryFiles(Path.resolve(dir, fileName), true);
    });
  } else {
    recipeMgr.eachRecipe((recipeDir, isInstalled, fileName) => {
      findEntryFiles(Path.resolve(recipeDir, fileName), isInstalled);
    });
  }

  function findEntryFiles(recipe: string, isInstalled: boolean) {
    entryFileFindler.findByRecipeJson(recipe, isInstalled, function(name, entryPath, parsedName, pkJson, packagePath) {
      if (!_.has(pkJson, 'dr'))
        return;
      var packageType = _.get(pkJson, 'dr.type');
      packageType = packageType ? [].concat(packageType) : [];
      const existing = srcCompSet.get(name);
      if (existing && existing[0] === isInstalled && existing[1] !== recipe) {
        console.error('Duplicate package %s found in recipe "%s" and "%s"', name, recipe, srcCompSet.get(name));
      }
      if (existing)
        return;
      srcCompSet.set(name, [isInstalled, recipe]);
      if (_.includes(types, '*') || _.intersection(types, packageType).length > 0) {
        // _checkDuplicate(packageSet, name, parsedName, pkJson, packagePath);
        callback(name, entryPath, parsedName, pkJson, packagePath, isInstalled);
      }
    });
  }
}
