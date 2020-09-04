import * as Path from 'path';
import * as _ from 'lodash';
// var chalk = require('chalk');
const log = require('log4js').getLogger('buildUtil.' + Path.basename(__filename, '.js'));
import {DirTree} from 'require-injector/dist/dir-tree';
import PackageBrowserInstance from './package-instance';
import * as packageUtils from '../../package-utils';
import config from '../../config';
import {createPackageInfo} from '../../package-mgr';

export interface BundleInfo {
  moduleMap: {[name: string]: PackageBrowserInstance};
}
export interface PackageInfo extends BundleInfo {
  allModules: PackageBrowserInstance[];
  dirTree: DirTree<PackageBrowserInstance>;
}

export {PackageBrowserInstance};

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
    allModules: null as unknown as PackageBrowserInstance[], // array
    moduleMap: _.clone(configBundleInfo.moduleMap),
    dirTree: null as unknown as DirTree<PackageBrowserInstance>
  };

  // packageUtils.findAllPackages((
  //   name: string, path: string, parsedName: {scope: string, name: string}, pkJson: any, realPath: string) => {
  //   // console.log(path, realPath)
  //   addPackageToInfo(info, name, parsedName, pkJson, path, realPath);
  // });
  for (const pk of packageUtils.packages4CurrentWorkspace()) {
    addPackageToInfo(info, pk.name, {name: pk.shortName, scope: pk.scope}, pk.json, pk.path, pk.realPath);
  }
  const drcpPkg = createPackageInfo(packageUtils.findPackageJsonPath('dr-comp-package')!);
  addPackageToInfo(info, 'dr-comp-package',
    {scope: drcpPkg.scope, name: drcpPkg.shortName},
    require('dr-comp-package/package.json'), drcpPkg.path, drcpPkg.realPath);

  info.allModules = _.values(info.moduleMap);

  return info;
}

function addPackageToInfo(info: PackageInfo, name: string,
  parsedName: {scope: string, name: string}, pkJson: any, packagePath: string, realPackagePath: string) {
  let noParseFiles, instance;
  if (_.has(info.moduleMap, name)) {
    instance = info.moduleMap[name];
  } else {
    // There are also node packages
    instance = new PackageBrowserInstance({});
  }
  if (!pkJson.dr) {
    pkJson.dr = {};
  }
  if (pkJson.dr.noParse) {
    noParseFiles = [].concat(pkJson.dr.noParse).map(trimNoParseSetting);
  }
  if (pkJson.dr.browserifyNoParse) {
    noParseFiles = [].concat(pkJson.dr.browserifyNoParse).map(trimNoParseSetting);
  }
  instance.init({
    longName: name,
    realPackagePath,
    packagePath,
    shortName: parsedName.name,
    isVendor: false,
    parsedName,
    browserifyNoParse: noParseFiles,
    translatable: !_.has(pkJson, 'dr.translatable') || _.get(pkJson, 'dr.translatable'),
    dr: pkJson.dr,
    json: pkJson,
    i18n: pkJson.dr.i18n ? pkJson.dr.i18n : null,
    appType: pkJson.dr.appType
  });
  info.moduleMap[instance.longName] = instance;
}

function trimNoParseSetting(p: string) {
  p = p.replace(/\\/g, '/');
  if (p.startsWith('./')) {
    p = p.substring(2);
  }
  return p;
}

function createPackageDirTree(packageInfo: PackageInfo) {
  const tree = new DirTree<PackageBrowserInstance>();
  var count = 0;
  packageInfo.allModules.forEach(moduleInstance => {
    // log.info(moduleInstance.longName);
    if (moduleInstance == null)
      return;
    if (moduleInstance.realPackagePath)
      tree.putData(moduleInstance.realPackagePath, moduleInstance);
    if (moduleInstance.packagePath !== moduleInstance.realPackagePath)
      tree.putData(moduleInstance.packagePath, moduleInstance);
    count++;
  });
  log.info('Total %s node packages', count);
  packageInfo.dirTree = tree;
}

