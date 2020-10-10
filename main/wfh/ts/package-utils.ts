import LRU from 'lru-cache';
import PackageBrowserInstance from './package-mgr/package-instance';
import LazyPackageFactory from './package-mgr/lazy-package-factory';
import {getState} from './package-mgr';
// import * as Path from 'path';
import _ from 'lodash';
// import log4js from 'log4js';
// import * as fs from 'fs';
import {lookupPackageJson, findPackagesByNames} from './cmd/utils';
import {PackageType, allPackages, packages4WorkspaceKey, packages4Workspace} from './package-mgr/package-list-helper';
export {PackageType, allPackages, packages4WorkspaceKey, packages4Workspace};

// const log = log4js.getLogger('wfh.package-utils');

const lazyPackageFactory = new LazyPackageFactory(allPackages());

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

// export type PackageType = '*' | 'build' | 'core';

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
    projectDir = recipeType;
    recipeType = callback as 'src' | 'installed';
    callback = packageList;
  }
  return findPackageByType('*', callback as FindPackageCb, recipeType as 'src' | 'installed',
    projectDir);
}

// export {eachRecipe} from './recipe-manager';

export {lookupPackageJson as findPackageJsonPath};

export function findPackageByType(_types: PackageType | PackageType[],
  callback: FindPackageCb, recipeType?: 'src' | 'installed', projectDir?: string[] | string) {

  const arr = Array.isArray(projectDir) ? projectDir : projectDir == null ? projectDir : [projectDir];
  for (const pkg of allPackages(_types, recipeType, arr)) {
    callback(pkg.name, pkg.path, {scope: pkg.scope, name: pkg.shortName}, pkg.json, pkg.realPath, pkg.isInstalled);
  }
}

