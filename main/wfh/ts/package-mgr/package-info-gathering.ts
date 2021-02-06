import * as _ from 'lodash';
import {getLogger} from 'log4js';
import {DirTree} from 'require-injector/dist/dir-tree';
import PackageInstance from '../packageNodeInstance';
import {packages4Workspace} from './package-list-helper';
import {PackageInfo as PackageState} from './index';
import {parseName} from './lazy-package-factory';
import {getSymlinkForPackage} from '../utils/misc';
const log = getLogger('plink.package-info-gathering');

export interface PackageInfo {
  allModules: PackageInstance[];
  dirTree: DirTree<PackageInstance>;
  moduleMap: {[name: string]: PackageInstance};
}

export {PackageInstance};

let packageInfo: PackageInfo;
/**
 * walkPackages
 * @param {*} config 
 * @param {*} argv 
 * @param {*} packageUtils 
 * @param {*} ignoreCache
 * @return {PackageInfo}
 */
export function walkPackages() {
  if (packageInfo)
    return packageInfo;
  log.debug('scan for packages info');
  packageInfo = _walkPackages();
  createPackageDirTree(packageInfo);
  return packageInfo;
}

function _walkPackages(): PackageInfo {
  const info: PackageInfo = {
    get allModules() {
      return Object.values(info.moduleMap);
    }, // array
    moduleMap: {},
    dirTree: null as unknown as DirTree<PackageInstance>
  };

  for (const pk of packages4Workspace()) {
    addPackageToInfo(info, pk);
  }

  return info;
}

function addPackageToInfo(info: PackageInfo, pkg: PackageState) {
  let instance;
  if (_.has(info.moduleMap, pkg.name)) {
    instance = info.moduleMap[pkg.name];
  } else {
    const parsed = parseName(pkg.name);
    // There are also node packages
    instance = new PackageInstance({
      moduleName: pkg.name,
      shortName: parsed.name,
      name: pkg.name,
      longName: pkg.name,
      scope: pkg.scope,
      path: pkg.path,
      json: pkg.json,
      realPath: pkg.realPath
    });
  }
  info.moduleMap[instance.longName] = instance;
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
  var count = 0;
  packageInfo.allModules.forEach(moduleInstance => {
    if (moduleInstance == null)
      return;
    if (moduleInstance.realPath)
      tree.putData(moduleInstance.realPath, moduleInstance);
    const symlink = getSymlinkForPackage(moduleInstance.longName);
    if (symlink && symlink !== moduleInstance.realPath)
      tree.putData(symlink, moduleInstance);
    count++;
  });
  log.info('%s Plink compliant node packages found', count);
  packageInfo.dirTree = tree;
}

