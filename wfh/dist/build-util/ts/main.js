"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const package_instance_1 = __importDefault(require("./package-instance"));
const _ = __importStar(require("lodash"));
const bResolve = require('browser-resolve');
const resolve = require('resolve');
// var chalk = require('chalk');
const log = require('log4js').getLogger('buildUtil.' + Path.basename(__filename, '.js'));
const dir_tree_1 = require("require-injector/dist/dir-tree");
const package_instance_2 = __importDefault(require("./package-instance"));
exports.PackageBrowserInstance = package_instance_2.default;
let packageInfo;
// var packageInfoCacheFile, isFromCache;
/**
 * walkPackages
 * @param {*} config
 * @param {*} argv
 * @param {*} packageUtils
 * @param {*} ignoreCache
 * @return {PackageInfo}
 */
function walkPackages(config, argv, packageUtils) {
    if (packageInfo)
        return packageInfo;
    log.info('scan for packages info');
    packageInfo = _walkPackages(packageUtils, config);
    createPackageDirTree(packageInfo);
    return packageInfo;
}
exports.walkPackages = walkPackages;
function listBundleInfo(_config, _argv, _packageUtils) {
    _config.set('bundlePerPackage', false);
    var packageInfo = walkPackages(_config, _argv, _packageUtils);
    saveCache(packageInfo, _config);
    return packageInfo;
}
exports.listBundleInfo = listBundleInfo;
function saveCache(packageInfo, config) {
    // if (isFromCache)
    // 	return;
    // mkdirp.sync(Path.join(config().rootPath, config().destDir));
    // fs.writeFileSync(packageInfoCacheFile, JSON.stringify(cycle.decycle(packageInfo)));
    // log.debug('write to cache ', packageInfoCacheFile);
}
exports.saveCache = saveCache;
function _walkPackages(packageUtils, config) {
    var nodePaths = [config().nodePath];
    var configBundleInfo = readBundleMapConfig(packageUtils, config);
    var info = {
        allModules: null,
        moduleMap: _.clone(configBundleInfo.moduleMap),
        shortNameMap: _.clone(configBundleInfo.shortNameMap),
        noBundlePackageMap: {},
        bundleMap: configBundleInfo.bundleMap,
        bundleUrlMap: configBundleInfo.bundleUrlMap,
        urlPackageSet: configBundleInfo.urlPackageSet,
        entryPageMap: {},
        dirTree: null
    };
    var bundleMap = info.bundleMap;
    packageUtils.findBrowserPackageByType('*', function (name, entryPath, parsedName, pkJson, packagePath) {
        addPackageToInfo(packageUtils, info, nodePaths, name, parsedName, pkJson, packagePath);
    });
    addPackageToInfo(packageUtils, info, nodePaths, 'dr-comp-package', packageUtils.parseName('dr-comp-package'), require('dr-comp-package/package.json'), packageUtils.findBrowserPackagePath('dr-comp-package'));
    _.each(bundleMap, (packageMap, bundle) => {
        bundleMap[bundle] = _.values(packageMap); // turn Object.<moduleName, packageInstance> to Array.<packageInstance>
    });
    info.allModules = _.values(info.moduleMap);
    return info;
}
function addPackageToInfo(packageUtils, info, nodePaths, name, parsedName, pkJson, packagePath) {
    var entryViews, entryPages;
    var isEntryServerTemplate = true;
    var noParseFiles, instance;
    if (_.has(info.moduleMap, name)) {
        instance = info.moduleMap[name];
    }
    else {
        // There are also node packages
        instance = new package_instance_1.default({
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
    }
    else if (pkJson.dr.entryView) {
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
        mainFile = bResolve.sync(name, { paths: nodePaths });
    }
    catch (err) { }
    instance.init({
        isVendor: false,
        file: mainFile ? fs.realpathSync(mainFile) : null,
        main: pkJson.main,
        style: pkJson.style ? resolveStyle(name, nodePaths) : null,
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
function trimNoParseSetting(p) {
    p = p.replace(/\\/g, '/');
    if (p.startsWith('./')) {
        p = p.substring(2);
    }
    return p;
}
function resolveStyle(name, nodePaths) {
    var entry;
    try {
        return fs.realpathSync(resolve.sync(name, {
            paths: nodePaths,
            packageFilter: (pkg, pkgfile) => {
                entry = pkg.main = pkg.style;
                return pkg;
            }
        }));
    }
    catch (err) {
        log.warn('Can not resolve style file "%s" of package %s', entry, name);
        return null;
    }
}
function readBundleMapConfig(packageUtils, config) {
    const info = {
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
function _readPackageChunkMap(packageUtils, config, info) {
    var bmap = info.bundleMap;
    var mmap = info.moduleMap;
    _.each(config()._package2Chunk, (bundle, moduleName) => {
        try {
            var packagePath = packageUtils.findBrowserPackagePath(moduleName);
            if (!packagePath)
                return;
            var parsedName = packageUtils.parseName(moduleName);
            var instance = new package_instance_1.default({
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
            info.urlPackageSet[moduleName] = 1;
            if (_.has(bmap, bundle) && _.isArray(bmap[bundle]))
                bmap[bundle].push(instance);
            else
                bmap[bundle] = [instance];
        }
        catch (err) {
            log.warn(err);
            throw err;
        }
    });
}
function _readBundles(packageUtils, info, config, isExternal = false) {
    var bmap = info.bundleMap;
    var mmap = info.moduleMap;
    var mapConfig = config().externalBundleMap;
    if (isExternal)
        info.urlPackageSet = {};
    _.forOwn(mapConfig, function (bundleData, bundle) {
        var moduleNames = _.isArray(bundleData.modules) ?
            bundleData.modules : bundleData;
        var bundleModules = _.map(moduleNames, function (moduleName) {
            try {
                var packagePath = packageUtils.findBrowserPackagePath(moduleName);
                var instance = new package_instance_1.default({
                    isVendor: true,
                    bundle,
                    longName: moduleName,
                    shortName: packageUtils.parseName(moduleName).name,
                    packagePath,
                    realPackagePath: fs.realpathSync(packagePath)
                });
                mmap[moduleName] = instance;
                info.shortNameMap[instance.shortName] = instance;
                info.urlPackageSet[moduleName] = 1;
                return instance;
            }
            catch (err) {
                log.warn(err);
                throw err;
            }
        });
        if (isExternal) {
            if (_.isArray(bundleData))
                info.bundleUrlMap[bundle] = bundleData;
            else if (_.has(bundleData, 'URLs'))
                info.bundleUrlMap[bundle] = bundleData.URLs;
            else if (_.isObject(bundleData)) {
                if (!_.has(bundleData, 'js') && !_.has(bundleData, 'css'))
                    throw new Error('config property "externalBundleMap" must be array of object {css: string[], js: string[]}');
                info.bundleUrlMap[bundle] = bundleData; // bundleData.css, bundleData.js
            }
            else {
                info.bundleUrlMap[bundle] = [bundleData];
            }
        }
        else
            bmap[bundle] = bundleModules;
    });
}
function createPackageDirTree(packageInfo) {
    var tree = new dir_tree_1.DirTree();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3RzL2J1aWxkLXV0aWwvdHMvbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNkI7QUFDN0IsdUNBQXlCO0FBQ3pCLDBFQUF3RDtBQUN4RCwwQ0FBNEI7QUFDNUIsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDNUMsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ25DLGdDQUFnQztBQUNoQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQ3pGLDZEQUF1RDtBQUN2RCwwRUFBd0Q7QUFnQmhELGlDQWhCRCwwQkFBc0IsQ0FnQkM7QUFFOUIsSUFBSSxXQUF3QixDQUFDO0FBQzdCLHlDQUF5QztBQUN6Qzs7Ozs7OztHQU9HO0FBQ0gsU0FBZ0IsWUFBWSxDQUFDLE1BQVcsRUFBRSxJQUFTLEVBQUUsWUFBaUI7SUFDckUsSUFBSSxXQUFXO1FBQ2QsT0FBTyxXQUFXLENBQUM7SUFDcEIsR0FBRyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO0lBQ25DLFdBQVcsR0FBRyxhQUFhLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ2xELG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ2xDLE9BQU8sV0FBVyxDQUFDO0FBQ3BCLENBQUM7QUFQRCxvQ0FPQztBQUVELFNBQWdCLGNBQWMsQ0FBQyxPQUFZLEVBQUUsS0FBVSxFQUFFLGFBQWtCO0lBQzFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDdkMsSUFBSSxXQUFXLEdBQUcsWUFBWSxDQUFDLE9BQU8sRUFB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