import LRU from 'lru-cache';
import PackageBrowserInstance from './build-util/ts/package-instance';
import LazyPackageFactory from './build-util/ts/lazy-package-factory';
import {getState, pathToProjKey, pathToWorkspace} from './package-mgr';
// import * as Path from 'path';
import _ from 'lodash';
// import log4js from 'log4js';
// import * as fs from 'fs';
import {lookupPackageJson, findPackagesByNames} from './cmd/utils';

// const log = log4js.getLogger('wfh.package-utils');

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
  packagePath: string,
  parsedName: {name: string, scope: string},
  json: any,
  realPackagePath: string,
  isInstalled: boolean) => void;

export function lookForPackages(packageList: string[] | string, cb: FindPackageCb): void {
  for (const pkg of findPackagesByNames(getState(), Array.isArray(packageList) ? packageList : [packageList])) {
    if (pkg == null)
      continue;
    cb(pkg.name, pkg.path, {name: pkg.shortName, scope: pkg.scope}, pkg.json, pkg.realPath, pkg.isInstalled);
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

  return findPackageByType('*', callback as FindPackageCb, recipeType as 'src' | 'installed',
    projectDir as string | undefined);
}

// export {eachRecipe} from './recipe-manager';

export {lookupPackageJson as findPackageJsonPath};

export function findPackageByType(_types: PackageType | PackageType[],
  callback: FindPackageCb, recipeType?: 'src' | 'installed', projectDir?: string) {

  const wsKey = pathToWorkspace(process.cwd());

  if (recipeType !== 'installed') {
    if (projectDir) {
      const projKey = pathToProjKey(projectDir);
      const pkgNames = getState().project2Packages.get(projKey);
      if (pkgNames == null)
        return;
      for (const pkgName of pkgNames) {
        const pkg = getState().srcPackages.get(pkgName);
        if (pkg) {
          callback(pkg.name, pkg.path, {scope: pkg.scope, name: pkg.shortName}, pkg.json, pkg.realPath, false);
        }
      }
    } else {
      for (const pkg of getState().srcPackages.values()) {
        callback(pkg.name, pkg.path, {scope: pkg.scope, name: pkg.shortName}, pkg.json, pkg.realPath, false);
      }
    }
  }
  if (recipeType !== 'src') {
    const workspace = getState().workspaces.get(wsKey);
    if (workspace) {
      if (workspace.installedComponents) {
        for (const pkg of workspace.installedComponents.values()) {
          callback(pkg.name, pkg.path, {scope: pkg.scope, name: pkg.shortName}, pkg.json, pkg.realPath, true);
        }
      }
    }
  }

}
