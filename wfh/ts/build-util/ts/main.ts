import * as Path from 'path';
import * as fs from 'fs';
import packageBrowserInstance from './package-instance';
import * as _ from 'lodash';
const bResolve = require('browser-resolve');
const resolve = require('resolve');
// var chalk = require('chalk');
const log = require('log4js').getLogger('buildUtil.' + Path.basename(__filename, '.js'));
import {DirTree} from 'require-injector/dist/dir-tree';
import PackageBrowserInstance from './package-instance';

export interface BundleInfo {
  moduleMap: {[name: string]: PackageBrowserInstance};
  shortNameMap: {[name: string]: PackageBrowserInstance};
  bundleMap: {[name: string]: PackageBrowserInstance[]};
  bundleUrlMap: {[name: string]: string[] |{css?: string[], js?: string[]}};
  urlPackageSet: {[name: string]: number} | null;
}
export interface PackageInfo extends BundleInfo {
  allModules: PackageBrowserInstance[];
  dirTree: DirTree<PackageBrowserInstance>;
  noBundlePackageMap: {[name: string]: PackageBrowserInstance};
  entryPageMap: {[page: string]: PackageBrowserInstance};
}

export {PackageBrowserInstance};

let packageInfo: PackageInfo;
// var packageInfoCacheFile, isFromCache;
/**
 * walkPackages
 * @param {*} config 
 * @param {*} argv 
 * @param {*} packageUtils 
 * @param {*} ignoreCache
 * @return {PackageInfo}
 */
export function walkPackages(config: any, packageUtils: any) {
  if (packageInfo)
    return packageInfo;
  log.info('scan for packages info');
  packageInfo = _walkPackages(packageUtils, config);
  createPackageDirTree(packageInfo);
  return packageInfo;
}

export function listBundleInfo(_config: any, _packageUtils: any) {
  _config.set('bundlePerPackage', false);
  const packageInfo = walkPackages(_config, _packageUtils);
  saveCache(packageInfo, _config);
  return packageInfo;
}


export function saveCache(packageInfo: PackageInfo, config: any) {
  // if (isFromCache)
  // 	return;
  // mkdirp.sync(Path.join(config().rootPath, config().destDir));
  // fs.writeFileSync(packageInfoCacheFile, JSON.stringify(cycle.decycle(packageInfo)));
  // log.debug('write to cache ', packageInfoCacheFile);
}

function _walkPackages(packageUtils: any, config: any): PackageInfo {
  const nodePaths = [config().nodePath];
  const configBundleInfo = readBundleMapConfig(packageUtils, config);
  const info: PackageInfo = {
    allModules: null as unknown as PackageBrowserInstance[], // array
    moduleMap: _.clone(configBundleInfo.moduleMap),
    shortNameMap: _.clone(configBundleInfo.shortNameMap),
    noBundlePackageMap: {},
    bundleMap: configBundleInfo.bundleMap,
    bundleUrlMap: configBundleInfo.bundleUrlMap,
    urlPackageSet: configBundleInfo.urlPackageSet,
    entryPageMap: {},
    dirTree: null as unknown as DirTree<PackageBrowserInstance>
  };
  const bundleMap = info.bundleMap;

  packageUtils.findBrowserPackageByType('*', function(
    name: string, entryPath: string, parsedName: {scope: string, name: string}, pkJson: any, packagePath: string) {
    addPackageToInfo(packageUtils, info, nodePaths, name, parsedName, pkJson, packagePath);
  });
  addPackageToInfo(packageUtils, info, nodePaths, 'dr-comp-package',
    packageUtils.parseName('dr-comp-package'),
    require('dr-comp-package/package.json'), packageUtils.findBrowserPackagePath('dr-comp-package'));
  _.each(bundleMap, (packageMap, bundle) => {
    bundleMap[bundle] = _.values(packageMap); // turn Object.<moduleName, packageInstance> to Array.<packageInstance>
  });
  info.allModules = _.values(info.moduleMap);

  return info;
}

function addPackageToInfo(packageUtils: any, info: PackageInfo, nodePaths: string[], name: string,
  parsedName: {scope: string, name: string}, pkJson: any, packagePath: string) {
  var entryViews, entryPages;
  var isEntryServerTemplate = true;
  var noParseFiles, instance;
  if (_.has(info.moduleMap, name)) {
    instance = info.moduleMap[name];
  } else {
    // There are also node packages
    instance = new packageBrowserInstance({
      isVendor: true,
      bundle: null,
      longName: name,
      shortName: packageUtils.parseName(name).name,
      packagePath,
      realPackagePath: fs.realpathSync(packagePath)
    });
  }
  if (!pkJson.dr) {
    pkJson.dr = {};
  }
  if (pkJson.dr.entryPage) {
    isEntryServerTemplate = false;
    entryPages = [].concat(pkJson.dr.entryPage);
    info.entryPageMap[name] = instance;
  } else if (pkJson.dr.entryView) {
    isEntryServerTemplate = true;
    entryViews = [].concat(pkJson.dr.entryView);
    info.entryPageMap[name] = instance;
  }
  if (pkJson.dr.noParse) {
    noParseFiles = [].concat(pkJson.dr.noParse).map(trimNoParseSetting);
  }
  if (pkJson.dr.browserifyNoParse) {
    noParseFiles = [].concat(pkJson.dr.browserifyNoParse).map(trimNoParseSetting);
  }
  var mainFile;
  try {
    // For package like e2etest, it could have no main file
    mainFile = bResolve.sync(name, {paths: nodePaths});
  } catch (err) {}
  instance.init({
    isVendor: false,
    file: mainFile ? fs.realpathSync(mainFile) : undefined, // package.json "browser"
    main: pkJson.main, // package.json "main"
    style: pkJson.style ? resolveStyle(name, nodePaths) : undefined,
    parsedName,
    entryPages,
    entryViews,
    browserifyNoParse: noParseFiles,
    isEntryServerTemplate,
    translatable: !_.has(pkJson, 'dr.translatable') || _.get(pkJson, 'dr.translatable'),
    dr: pkJson.dr,
    json: pkJson,
    compiler: pkJson.dr.compiler,
    browser: pkJson.browser,
    i18n: pkJson.dr.i18n ? pkJson.dr.i18n : null,
    appType: pkJson.dr.appType
  });
  if (instance.file == null && (instance.entryPages || instance.entryViews))
    throw new Error(`Entry package "${instance.longName}"'s "browser" or "main" file ${mainFile} doesn't exist!`);
  info.moduleMap[instance.longName] = instance;
  info.shortNameMap[instance.shortName] = instance;
  if (!instance.bundle)
    info.noBundlePackageMap[instance.longName] = instance;
}

function trimNoParseSetting(p: string) {
  p = p.replace(/\\/g, '/');
  if (p.startsWith('./')) {
    p = p.substring(2);
  }
  return p;
}

function resolveStyle(name: string, nodePaths: string[]) {
  var entry;
  try {
    return fs.realpathSync(resolve.sync(name, {
      paths: nodePaths,
      packageFilter: (pkg: any, pkgfile: any) => {
        entry = pkg.main = pkg.style;
        return pkg;
      }
    }));
  } catch (err) {
    log.warn('Can not resolve style file "%s" of package %s', entry, name);
    return null;
  }
}

function readBundleMapConfig(packageUtils: any, config: any) {
  const info: BundleInfo = {
    moduleMap: {},
    /** @type {Object.<bundleName, Object.<moduleName, packageInstance>>} */
    bundleMap: {},
    shortNameMap: {},
    /** @type {Object.<bundleName, URL[]>} */
    bundleUrlMap: {},
    urlPackageSet: null
  };
  _readBundles(packageUtils, info, config, true);
  _readPackageChunkMap(packageUtils, config, info);
  return info;
}

function _readPackageChunkMap(packageUtils: any, config: any, info: BundleInfo) {
  const bmap = info.bundleMap;
  const mmap = info.moduleMap;
  _.each(config()._package2Chunk, (bundle, moduleName) => {
    try {
      const packagePath = packageUtils.findBrowserPackagePath(moduleName);
      if (!packagePath)
        return;
      const parsedName = packageUtils.parseName(moduleName);
      const instance = new packageBrowserInstance({
        isVendor: true,
        bundle,
        longName: moduleName,
        parsedName,
        shortName: parsedName.name,
        packagePath,
        realPackagePath: fs.realpathSync(packagePath)
      });
      mmap[moduleName] = instance;
      info.shortNameMap[parsedName.name] = instance;
      if (info.urlPackageSet)
        info.urlPackageSet[moduleName] = 1;
      if (_.has(bmap, bundle) && _.isArray(bmap[bundle]))
        bmap[bundle].push(instance);
      else
        bmap[bundle] = [instance];
    } catch (err) {
      log.warn(err);
      throw err;
    }
  });
}

function _readBundles(packageUtils: any, info: BundleInfo, config: any, isExternal = false) {
  const bmap = info.bundleMap;
  const mmap = info.moduleMap;

  interface EbmType1 {
    URLs: string[];
    modules: string[];
  }
  interface EbmType2 {
    js?: string[];
    css?: string[];
  }
  type EbmType = EbmType1 | EbmType2 | string;

  const mapConfig = config().externalBundleMap as {[k: string]: string[] | EbmType};
  if (isExternal)
    info.urlPackageSet = {};
  _.forOwn(mapConfig, function(bundleData, bundle) {
    const moduleNames: string[] = _.isArray((bundleData as EbmType1).modules) ?
      (bundleData as EbmType1).modules : bundleData as string[];
    const bundleModules = _.map(moduleNames, function(moduleName) {
      try {
        const packagePath = packageUtils.findBrowserPackagePath(moduleName);
        const instance = new packageBrowserInstance({
          isVendor: true,
          bundle,
          longName: moduleName,
          shortName: packageUtils.parseName(moduleName).name,
          packagePath,
          realPackagePath: fs.realpathSync(packagePath)
        });
        mmap[moduleName] = instance;
        info.shortNameMap[instance.shortName] = instance;
        if (info.urlPackageSet)
          info.urlPackageSet[moduleName] = 1;
        return instance;
      } catch (err) {
        log.warn(err);
        throw err;
      }
    });
    if (isExternal) {
      if (_.isArray(bundleData))
        info.bundleUrlMap[bundle] = bundleData;
      else if (_.has(bundleData, 'URLs'))
        info.bundleUrlMap[bundle] = (bundleData as EbmType1).URLs;
      else if (_.isObject(bundleData)) {
        if (!_.has(bundleData, 'js') && !_.has(bundleData, 'css'))
          throw new Error('config property "externalBundleMap" must be array of object {css: string[], js: string[]}');
        info.bundleUrlMap[bundle] = bundleData as EbmType2; // bundleData.css, bundleData.js
      } else {
        info.bundleUrlMap[bundle] = [bundleData as string];
      }
    } else
      bmap[bundle] = bundleModules;
  });
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
