import LRU from 'lru-cache';
import PackageBrowserInstance from './build-util/ts/package-instance';
import LazyPackageFactory from './build-util/ts/lazy-package-factory';
import * as recipeMgr from './recipe-manager';
import {PackageInfo, createPackageInfo, getState} from './package-mgr';
import * as Path from 'path';
import _ from 'lodash';
import log4js from 'log4js';
import * as fs from 'fs';
import {findPackageJsonPath, findPackagesByNames} from './cmd/utils';

const log = log4js.getLogger('wfh.package-utils');

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
  /** @Deprecated empty string */
  entryPath: string,
  parsedName: {name: string, scope: string},
  json: any,
  packagePath: string,
  isInstalled: boolean) => void;

export function lookForPackages(packageList: string[], cb: FindPackageCb): void {
  for (const pkg of findPackagesByNames(getState(), packageList)) {
    if (pkg == null)
      continue;
    cb(pkg.name, '', {name: pkg.shortName, scope: pkg.scope}, pkg.json, pkg.realPath, pkg.isInstalled);
  }
}

export type PackageType = '*' | 'build' | 'core';

export function findAllPackages(callback: FindPackageCb,
  recipeType?: 'src' | 'installed',
  projectDir?: string | string[]): void;
export function findAllPackages(packageList: string[] | string,
  callback: FindPackageCb,
  recipeType?: 'src' | 'installed',
  projectDir?: string | string[]): void;
export function findAllPackages(packageList: string[] | string | FindPackageCb,
  callback?: FindPackageCb | 'src' | 'installed',
  recipeType?: string | string[],
  projectDir?: string | string[]) {
  // oldPu.findAllPackages.apply(oldPu, arguments);

  if (_.isFunction(callback) && packageList) {
    lookForPackages(([] as string[]).concat(packageList as (string[] | string)), callback);
    return;
  } else if (_.isFunction(packageList)) {
    // arguments.length <= 2
    projectDir = recipeType as string | undefined;
    recipeType = callback as 'src' | 'installed';
    callback = packageList;
  }

  return _findPackageByType('*', callback as FindPackageCb, recipeType as 'src' | 'installed',
    projectDir as string | undefined);
}

export {eachRecipe} from './recipe-manager';



class EntryFileFinder {
  private packageRecipeMap = new Map<string, string>();

  findByRecipeJson(recipePkjsonFile: string, isInstalled: boolean,
    eachCallback: (packageInfo: PackageInfo) => void) {
    const pj = JSON.parse(fs.readFileSync(recipePkjsonFile, 'utf-8'));
    if (!pj.dependencies) {
      return;
    }

    _.forOwn(Object.assign({}, pj.dependencies, pj.devDependencies), (version, name) => {
      if (isInstalled) {
        if (this.packageRecipeMap.has(name)) {
          log.warn('Duplicate component dependency "%s" found in "%s" and "%s"',
            name, this.packageRecipeMap.get(name), recipePkjsonFile);
          return;
        }
        this.packageRecipeMap.set(name, recipePkjsonFile);
      }
      const srcPkg = getState().srcPackages.get(name);
      if (srcPkg) {
        return eachCallback(srcPkg);
      }

      const pkJsonFile = findPackageJsonPath(name);
      if (pkJsonFile == null) {
        log.warn('Package %s does not exist', name);
        return;
      }
      const pkg = createPackageInfo(pkJsonFile);

      eachCallback(pkg);
    });
  }
}

function _findPackageByType(_types: PackageType | PackageType[],
  callback: FindPackageCb, recipeType: 'src' | 'installed', projectDir?: string) {

  const entryFileFindler = new EntryFileFinder();
  const types = ([] as PackageType[]).concat(_types);

  const srcCompSet = new Map<string, [boolean, string]>();
  // tslint:disable-next-line: max-line-length
  // To avoid return duplicate components, some times duplicate component in associated projects, installed recipe or peer
  // dependency (recipe)

  if (recipeType === 'src') {
    if (projectDir) {
      recipeMgr.eachRecipeSrc(projectDir, (src, recipeDir) => {
        if (recipeDir)
          findEntryFiles(Path.resolve(recipeDir, 'package.json'), false);
      });
    } else {
      recipeMgr.eachRecipeSrc((src, recipeDir) => {
        if (recipeDir)
          findEntryFiles(Path.resolve(recipeDir, 'package.json'), false);
      });
    }
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
    entryFileFindler.findByRecipeJson(recipe, isInstalled, pkg => {
      if (!_.has(pkg.json, 'dr'))
        return;
      const name = pkg.name;
      var packageType = _.get(pkg.json, 'dr.type');
      packageType = packageType ? [].concat(packageType) : [];
      const existing = srcCompSet.get(pkg.name);
      if (existing && existing[0] === isInstalled && existing[1] !== recipe) {
        console.error('Duplicate package %s found in recipe "%s" and "%s"', name, recipe, srcCompSet.get(name));
      }
      if (existing)
        return;
      srcCompSet.set(name, [isInstalled, recipe]);
      if (_.includes(types, '*') || _.intersection(types, packageType).length > 0) {
        // _checkDuplicate(packageSet, name, parsedName, pkJson, packagePath);
        callback(name, '', {name: pkg.shortName, scope: pkg.scope}, pkg.json, pkg.realPath, isInstalled);
      }
    });
  }
}
