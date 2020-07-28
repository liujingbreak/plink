import LRU from 'lru-cache';
import PackageBrowserInstance from './build-util/ts/package-instance';
import LazyPackageFactory from './build-util/ts/lazy-package-factory';
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
  packagePath: string) => void;

export function lookForPackages(packageList: string[], cb: FindPackageCb): void {
  return oldPu.lookForPackages(packageList, cb);
}

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
