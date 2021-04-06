import * as _ from 'lodash';
import {getLogger} from 'log4js';
import {DirTree} from 'require-injector/dist/dir-tree';
import PackageInstance from '../packageNodeInstance';
import {packages4Workspace} from './package-list-helper';
import {PackageInfo as PackageState} from './index';
import {parseName} from './lazy-package-factory';
import {plinkEnv} from '../utils/misc';
import LRU from 'lru-cache';
import Path from 'path';

const log = getLogger('plink.package-info-gathering');
const {workDir, symlinkDirName} = plinkEnv;
export interface PackageInfo {
  allModules: PackageInstance[];
  dirTree: DirTree<PackageInstance>;
  moduleMap: {[name: string]: PackageInstance};
}

export {PackageInstance};

let existingFileToPkgHelper: {
  packageInfo: PackageInfo;
  getPkgOfFile(file: string): PackageInstance | undefined;
} | undefined;
// let packageInfo: PackageInfo;
/**
 * walkPackages
 * @param {*} config 
 * @param {*} argv 
 * @param {*} packageUtils 
 * @param {*} ignoreCache
 * @return {PackageInfo}
 */

export function packageOfFileFactory() {
  if (existingFileToPkgHelper) {
    return existingFileToPkgHelper;
  }
  const cache = new LRU<string, PackageInstance>({max: 20, maxAge: 20000});
  const packageInfo: PackageInfo = walkPackages();

  function getPkgOfFile(file: string): PackageInstance | undefined {
    var found = cache.get(file);
    if (!found) {
      found = packageInfo.dirTree.getAllData(file).pop();
      if (found)
        cache.set(file, found);
    }
    return found;
  }
  const res = {packageInfo, getPkgOfFile};
  existingFileToPkgHelper = res;
  return res;
}

export function walkPackages() {
  // if (packageInfo)
  //   return packageInfo;
  log.debug('scan for packages info');
  const packageInfo: PackageInfo = {
    get allModules() {
      return Object.values(packageInfo.moduleMap);
    }, // array
    moduleMap: {},
    dirTree: null as unknown as DirTree<PackageInstance>
  };

  for (const pk of packages4Workspace()) {
    addPackageToInfo(packageInfo.moduleMap, pk);
  }
  createPackageDirTree(packageInfo);
  return packageInfo;
}


function addPackageToInfo(moduleMap: PackageInfo['moduleMap'], pkg: PackageState) {
  let instance;
  if (_.has(moduleMap, pkg.name)) {
    instance = moduleMap[pkg.name];
  } else {
    const parsed = parseName(pkg.name);
    // There are also node packages
    instance = new PackageInstance({
      moduleName: pkg.name,
      shortName: parsed.name,
      name: pkg.name,
      longName: pkg.name,
      scope: pkg.scope,
      path: Path.resolve(workDir, pkg.path),
      json: pkg.json,
      realPath: pkg.realPath
    });
  }
  moduleMap[instance.longName] = instance;
}

// function trimNoParseSetting(p: string) {
//   p = p.replace(/\\/g, '/');
//   if (p.startsWith('./')) {
//     p = p.substring(2);
//   }
//   return p;
// }

function createPackageDirTree(packageInfo: PackageInfo) {
  const tree = new DirTree<PackageInstance>();
  let count = 0;
  packageInfo.allModules.forEach(pkg => {
    if (pkg == null)
      return;

    if (pkg.realPath) {
      tree.putData(pkg.realPath, pkg);
    }
    // Don't trust pkg.path, it is set by command line: plink sync/init, and loaded from state file,
    // which is not up-to-dates.
    tree.putData(Path.resolve(workDir, symlinkDirName, pkg.name), pkg);
    // if (pkg.path !== pkg.realPath) {
    //   tree.putData(Path.resolve(workDir, symlinkDirName, pkg.name), pkg);
    // }
    count++;
  });
  log.info('%s Plink compliant node packages found', count);
  packageInfo.dirTree = tree;
}

