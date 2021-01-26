import * as Path from 'path';
import * as _ from 'lodash';
// var chalk = require('chalk');
const log = require('log4js').getLogger('buildUtil.' + Path.basename(__filename, '.js'));
import {DirTree} from 'require-injector/dist/dir-tree';
import PackageInstance from '../packageNodeInstance';
import * as packageUtils from '../package-utils';
import config from '../config';
import {PackageInfo as PackageState} from './index';
import {parseName} from './lazy-package-factory';
export interface BundleInfo {
  moduleMap: {[name: string]: PackageInstance};
}
export interface PackageInfo extends BundleInfo {
  allModules: PackageInstance[];
  dirTree: DirTree<PackageInstance>;
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
  log.info('scan for packages info');
  packageInfo = _walkPackages();
  createPackageDirTree(packageInfo);
  return packageInfo;
}

export function listBundleInfo() {
  config.set('bundlePerPackage', false);
  const packageInfo = walkPackages();
  saveCache(packageInfo);
  return packageInfo;
}


export function saveCache(packageInfo: PackageInfo) {
  // if (isFromCache)
  // 	return;
  // mkdirp.sync(Path.join(config().rootPath, config().destDir));
  // fs.writeFileSync(packageInfoCacheFile, JSON.stringify(cycle.decycle(packageInfo)));
  // log.debug('write to cache ', packageInfoCacheFile);
}

function _walkPackages(): PackageInfo {
  // const nodePaths = process.env.NODE_PATH!.split(Path.delimiter);
  const configBundleInfo: BundleInfo = {
    moduleMap: {}
  };
  const info: PackageInfo = {
    allModules: null as unknown as PackageInstance[], // array
    moduleMap: _.clone(configBundleInfo.moduleMap),
    dirTree: null as unknown as DirTree<PackageInstance>
  };

  for (const pk of packageUtils.packages4Workspace()) {
    addPackageToInfo(info, pk);
  }
  // if (getState().linkedDrcp) {
  //   addPackageToInfo(info, getState().linkedDrcp!);
  // }

  info.allModules = _.values(info.moduleMap);

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
    if (moduleInstance.path !== moduleInstance.realPath)
      tree.putData(moduleInstance.path, moduleInstance);
    count++;
  });
  log.info('Total %s node packages', count);
  packageInfo.dirTree = tree;
}

