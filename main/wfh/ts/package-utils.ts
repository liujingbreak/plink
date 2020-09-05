import LRU from 'lru-cache';
import PackageBrowserInstance from './build-util/ts/package-instance';
import LazyPackageFactory from './build-util/ts/lazy-package-factory';
import {getState, pathToProjKey, pathToWorkspace, PackageInfo} from './package-mgr';
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

  for (const pkg of allPackages(_types, recipeType, projectDir)) {
    callback(pkg.name, pkg.path, {scope: pkg.scope, name: pkg.shortName}, pkg.json, pkg.realPath, pkg.isInstalled);
  }
}

/** Including installed package from all workspaces, unlike packages4CurrentWorkspace() which only include
 * linked and installed
 * packages that are depended in current workspace package.json file
 */
export function* allPackages(_types?: PackageType | PackageType[],
  recipeType?: 'src' | 'installed', projectDir?: string): Generator<PackageInfo> {

  // const wsKey = pathToWorkspace(process.cwd());

  if (recipeType !== 'installed') {
    if (projectDir) {
      const projKey = pathToProjKey(projectDir);
      const pkgNames = getState().project2Packages.get(projKey);
      if (pkgNames == null)
        return;
      for (const pkgName of pkgNames) {
        const pkg = getState().srcPackages.get(pkgName);
        if (pkg) {
          yield pkg;
        }
      }
    } else {
      for (const pkg of getState().srcPackages.values()) {
        yield pkg;
      }
    }
  }
  if (recipeType !== 'src') {
    for (const ws of getState().workspaces.values()) {
      const installed = ws.installedComponents;
      if (installed) {
        for (const comp of installed.values()) {
          yield comp;
        }
      }
    }
  }
}

export function* packages4Workspace(workspaceDir?: string) {
  const wsKey = pathToWorkspace(workspaceDir || process.cwd());
  const ws = getState().workspaces.get(wsKey);
  if (!ws)
    return;

  const linked = getState().srcPackages;
  const installed = ws.installedComponents;
  for (const [pkName] of ws.linkedDependencies) {
    const pk = linked.get(pkName);
    if (pk == null)
      throw new Error(`Missing package ${pkName} in current workspace`);
    yield pk;
  }
  for (const [pkName] of ws.linkedDevDependencies) {
    const pk = linked.get(pkName);
    if (pk == null)
      throw new Error(`Missing package ${pkName} in current workspace`);
    yield pk;
  }
  if (installed) {
    for (const comp of installed.values()) {
      yield comp;
    }
  }
}
