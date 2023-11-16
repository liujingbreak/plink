import Path from 'path';
import * as _ from 'lodash';
import {getLogger} from 'log4js';
import LRU from 'lru-cache';
import {DirTree} from '../../../packages/require-injector/dist/dir-tree';
import PackageInstance from '../packageNodeInstance';
import {plinkEnv} from '../utils/misc';
import {packages4Workspace} from './package-list-helper';
import {parseName} from './lazy-package-factory';
import {PackageInfo as PackageState} from './index';
// import inspector from 'inspector';

const log = getLogger('plink.package-info-gathering');

const {workDir, symlinkDirName} = plinkEnv;
export interface PackageInfo {
  allModules: PackageInstance[];
  dirTree: DirTree<PackageInstance>;
  moduleMap: Map<string, PackageInstance>;
}

export {PackageInstance};

let existingFileToPkgHelper: {
  packageInfo: PackageInfo;
  getPkgOfFile(file: string): PackageInstance | undefined;
} | undefined;
// let packageInfo: PackageInfo;

export function packageOfFileFactory() {
  if (existingFileToPkgHelper) {
    return existingFileToPkgHelper;
  }
  const cache = new LRU<string, PackageInstance>({max: 20, maxAge: 20000});
  const packageInfo: PackageInfo = walkPackages();

  function getPkgOfFile(file: string): PackageInstance | undefined {
    let found = cache.get(file);
    if (!found) {
      found = packageInfo.dirTree.getAllData(file).pop();
      if (found)
        cache.set(file, found);
    }
    return found;
  }
  existingFileToPkgHelper = {packageInfo, getPkgOfFile};
  return existingFileToPkgHelper;
}

export function walkPackages() {
  // if (packageInfo)
  //   return packageInfo;
  log.info('scan for packages info');
  const packageInfo: PackageInfo = {
    get allModules() {
      return [...packageInfo.moduleMap.values()];
    }, // array
    moduleMap: new Map(),
    dirTree: null as unknown as DirTree<PackageInstance>
  };

  for (const pk of packages4Workspace()) {
    addPackageToInfo(packageInfo.moduleMap, pk);
  }

  createPackageDirTree(packageInfo);
  return packageInfo;
}


function addPackageToInfo(moduleMap: PackageInfo['moduleMap'], pkg: PackageState) {
  let instance = moduleMap.get(pkg.name);
  if (instance == null) {
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
      realPath: pkg.realPath,
      orig: pkg
    });
  }
  moduleMap.set(instance.longName, instance);
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
    // if (pkg.name === '@bk/trade-aggr') {
    //   inspector.open(9222, 'localhost', true);
    //   debugger;
    // }
    count++;
  });
  log.info('%s Plink compliant node packages found', count);
  packageInfo.dirTree = tree;
}

