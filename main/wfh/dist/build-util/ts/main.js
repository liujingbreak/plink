"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveCache = exports.listBundleInfo = exports.walkPackages = exports.PackageBrowserInstance = void 0;
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
function walkPackages(config, packageUtils) {
    if (packageInfo)
        return packageInfo;
    log.info('scan for packages info');
    packageInfo = _walkPackages(packageUtils, config);
    createPackageDirTree(packageInfo);
    return packageInfo;
}
exports.walkPackages = walkPackages;
function listBundleInfo(_config, _packageUtils) {
    _config.set('bundlePerPackage', false);
    const packageInfo = walkPackages(_config, _packageUtils);
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
    const nodePaths = [config().nodePath];
    const configBundleInfo = readBundleMapConfig(packageUtils, config);
    const info = {
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
    const bundleMap = info.bundleMap;
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
        file: mainFile ? fs.realpathSync(mainFile) : undefined,
        main: pkJson.main,
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
    const bmap = info.bundleMap;
    const mmap = info.moduleMap;
    _.each(config()._package2Chunk, (bundle, moduleName) => {
        try {
            const packagePath = packageUtils.findBrowserPackagePath(moduleName);
            if (!packagePath)
                return;
            const parsedName = packageUtils.parseName(moduleName);
            const instance = new package_instance_1.default({
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
        }
        catch (err) {
            log.warn(err);
            throw err;
        }
    });
}
function _readBundles(packageUtils, info, config, isExternal = false) {
    const bmap = info.bundleMap;
    const mmap = info.moduleMap;
    const mapConfig = config().externalBundleMap;
    if (isExternal)
        info.urlPackageSet = {};
    _.forOwn(mapConfig, function (bundleData, bundle) {
        const moduleNames = _.isArray(bundleData.modules) ?
            bundleData.modules : bundleData;
        const bundleModules = _.map(moduleNames, function (moduleName) {
            try {
                const packagePath = packageUtils.findBrowserPackagePath(moduleName);
                const instance = new package_instance_1.default({
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
    const tree = new dir_tree_1.DirTree();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3RzL2J1aWxkLXV0aWwvdHMvbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkNBQTZCO0FBQzdCLHVDQUF5QjtBQUN6QiwwRUFBd0Q7QUFDeEQsMENBQTRCO0FBQzVCLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBQzVDLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNuQyxnQ0FBZ0M7QUFDaEMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUN6Riw2REFBdUQ7QUFDdkQsMEVBQXdEO0FBZ0JoRCxpQ0FoQkQsMEJBQXNCLENBZ0JDO0FBRTlCLElBQUksV0FBd0IsQ0FBQztBQUM3Qix5Q0FBeUM7QUFDekM7Ozs7Ozs7R0FPRztBQUNILFNBQWdCLFlBQVksQ0FBQyxNQUFXLEVBQUUsWUFBaUI7SUFDekQsSUFBSSxXQUFXO1FBQ2IsT0FBTyxXQUFXLENBQUM7SUFDckIsR0FBRyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO0lBQ25DLFdBQVcsR0FBRyxhQUFhLENBQUMsWUFBWSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ2xELG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ2xDLE9BQU8sV0FBVyxDQUFDO0FBQ3JCLENBQUM7QUFQRCxvQ0FPQztBQUVELFNBQWdCLGNBQWMsQ0FBQyxPQUFZLEVBQUUsYUFBa0I7SUFDN0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUN2QyxNQUFNLFdBQVcsR0FBRyxZQUFZLENBQUMsT0FBTyxFQUFFLGFBQWEs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QUFDLGVBQWU7WUFDL0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsV0FBVyxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQzNELEtBQUssRUFBRSxDQUFDO0lBQ1YsQ0FBQyxDQUFDLENBQUM7SUFDSCxHQUFHLENBQUMsSUFBSSxDQUFDLHdCQUF3QixFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzFDLFdBQVcsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO0FBQzdCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHBhY2thZ2VCcm93c2VySW5zdGFuY2UgZnJvbSAnLi9wYWNrYWdlLWluc3RhbmNlJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmNvbnN0IGJSZXNvbHZlID0gcmVxdWlyZSgnYnJvd3Nlci1yZXNvbHZlJyk7XG5jb25zdCByZXNvbHZlID0gcmVxdWlyZSgncmVzb2x2ZScpO1xuLy8gdmFyIGNoYWxrID0gcmVxdWlyZSgnY2hhbGsnKTtcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignYnVpbGRVdGlsLicgKyBQYXRoLmJhc2VuYW1lKF9fZmlsZW5hbWUsICcuanMnKSk7XG5pbXBvcnQge0RpclRyZWV9IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3IvZGlzdC9kaXItdHJlZSc7XG5pbXBvcnQgUGFja2FnZUJyb3dzZXJJbnN0YW5jZSBmcm9tICcuL3BhY2thZ2UtaW5zdGFuY2UnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEJ1bmRsZUluZm8ge1xuICBtb2R1bGVNYXA6IHtbbmFtZTogc3RyaW5nXTogUGFja2FnZUJyb3dzZXJJbnN0YW5jZX07XG4gIHNob3J0TmFtZU1hcDoge1tuYW1lOiBzdHJpbmddOiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlfTtcbiAgYnVuZGxlTWFwOiB7W25hbWU6IHN0cmluZ106IFBhY2thZ2VCcm93c2VySW5zdGFuY2VbXX07XG4gIGJ1bmRsZVVybE1hcDoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmdbXSB8e2Nzcz86IHN0cmluZ1tdLCBqcz86IHN0cmluZ1tdfX07XG4gIHVybFBhY2thZ2VTZXQ6IHtbbmFtZTogc3RyaW5nXTogbnVtYmVyfSB8IG51bGw7XG59XG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VJbmZvIGV4dGVuZHMgQnVuZGxlSW5mbyB7XG4gIGFsbE1vZHVsZXM6IFBhY2thZ2VCcm93c2VySW5zdGFuY2VbXTtcbiAgZGlyVHJlZTogRGlyVHJlZTxQYWNrYWdlQnJvd3Nlckluc3RhbmNlPjtcbiAgbm9CdW5kbGVQYWNrYWdlTWFwOiB7W25hbWU6IHN0cmluZ106IFBhY2thZ2VCcm93c2VySW5zdGFuY2V9O1xuICBlbnRyeVBhZ2VNYXA6IHtbcGFnZTogc3RyaW5nXTogUGFja2FnZUJyb3dzZXJJbnN0YW5jZX07XG59XG5cbmV4cG9ydCB7UGFja2FnZUJyb3dzZXJJbnN0YW5jZX07XG5cbmxldCBwYWNrYWdlSW5mbzogUGFja2FnZUluZm87XG4vLyB2YXIgcGFja2FnZUluZm9DYWNoZUZpbGUsIGlzRnJvbUNhY2hlO1xuLyoqXG4gKiB3YWxrUGFja2FnZXNcbiAqIEBwYXJhbSB7Kn0gY29uZmlnIFxuICogQHBhcmFtIHsqfSBhcmd2IFxuICogQHBhcmFtIHsqfSBwYWNrYWdlVXRpbHMgXG4gKiBAcGFyYW0geyp9IGlnbm9yZUNhY2hlXG4gKiBAcmV0dXJuIHtQYWNrYWdlSW5mb31cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdhbGtQYWNrYWdlcyhjb25maWc6IGFueSwgcGFja2FnZVV0aWxzOiBhbnkpIHtcbiAgaWYgKHBhY2thZ2VJbmZvKVxuICAgIHJldHVybiBwYWNrYWdlSW5mbztcbiAgbG9nLmluZm8oJ3NjYW4gZm9yIHBhY2thZ2VzIGluZm8nKTtcbiAgcGFja2FnZUluZm8gPSBfd2Fsa1BhY2thZ2VzKHBhY2thZ2VVdGlscywgY29uZmlnKTtcbiAgY3JlYXRlUGFja2FnZURpclRyZWUocGFja2FnZUluZm8pO1xuICByZXR1cm4gcGFja2FnZUluZm87XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaXN0QnVuZGxlSW5mbyhfY29uZmlnOiBhbnksIF9wYWNrYWdlVXRpbHM6IGFueSkge1xuICBfY29uZmlnLnNldCgnYnVuZGxlUGVyUGFja2FnZScsIGZhbHNlKTtcbiAgY29uc3QgcGFja2FnZUluZm8gPSB3YWxrUGFja2FnZXMoX2NvbmZpZywgX3BhY2thZ2VVdGlscyk7XG4gIHNhdmVDYWNoZShwYWNrYWdlSW5mbywgX2NvbmZpZyk7XG4gIHJldHVybiBwYWNrYWdlSW5mbztcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gc2F2ZUNhY2hlKHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbywgY29uZmlnOiBhbnkpIHtcbiAgLy8gaWYgKGlzRnJvbUNhY2hlKVxuICAvLyBcdHJldHVybjtcbiAgLy8gbWtkaXJwLnN5bmMoUGF0aC5qb2luKGNvbmZpZygpLnJvb3RQYXRoLCBjb25maWcoKS5kZXN0RGlyKSk7XG4gIC8vIGZzLndyaXRlRmlsZVN5bmMocGFja2FnZUluZm9DYWNoZUZpbGUsIEpTT04uc3RyaW5naWZ5KGN5Y2xlLmRlY3ljbGUocGFja2FnZUluZm8pKSk7XG4gIC8vIGxvZy5kZWJ1Zygnd3JpdGUgdG8gY2FjaGUgJywgcGFja2FnZUluZm9DYWNoZUZpbGUpO1xufVxuXG5mdW5jdGlvbiBfd2Fsa1BhY2thZ2VzKHBhY2thZ2VVdGlsczogYW55LCBjb25maWc6IGFueSk6IFBhY2thZ2VJbmZvIHtcbiAgY29uc3Qgbm9kZVBhdGhzID0gW2NvbmZpZygpLm5vZGVQYXRoXTtcbiAgY29uc3QgY29uZmlnQnVuZGxlSW5mbyA9IHJlYWRCdW5kbGVNYXBDb25maWcocGFja2FnZVV0aWxzLCBjb25maWcpO1xuICBjb25zdCBpbmZvOiBQYWNrYWdlSW5mbyA9IHtcbiAgICBhbGxNb2R1bGVzOiBudWxsIGFzIHVua25vd24gYXMgUGFja2FnZUJyb3dzZXJJbnN0YW5jZVtdLCAvLyBhcnJheVxuICAgIG1vZHVsZU1hcDogXy5jbG9uZShjb25maWdCdW5kbGVJbmZvLm1vZHVsZU1hcCksXG4gICAgc2hvcnROYW1lTWFwOiBfLmNsb25lKGNvbmZpZ0J1bmRsZUluZm8uc2hvcnROYW1lTWFwKSxcbiAgICBub0J1bmRsZVBhY2thZ2VNYXA6IHt9LFxuICAgIGJ1bmRsZU1hcDogY29uZmlnQnVuZGxlSW5mby5idW5kbGVNYXAsXG4gICAgYnVuZGxlVXJsTWFwOiBjb25maWdCdW5kbGVJbmZvLmJ1bmRsZVVybE1hcCxcbiAgICB1cmxQYWNrYWdlU2V0OiBjb25maWdCdW5kbGVJbmZvLnVybFBhY2thZ2VTZXQsXG4gICAgZW50cnlQYWdlTWFwOiB7fSxcbiAgICBkaXJUcmVlOiBudWxsIGFzIHVua25vd24gYXMgRGlyVHJlZTxQYWNrYWdlQnJvd3Nlckluc3RhbmNlPlxuICB9O1xuICBjb25zdCBidW5kbGVNYXAgPSBpbmZvLmJ1bmRsZU1hcDtcblxuICBwYWNrYWdlVXRpbHMuZmluZEJyb3dzZXJQYWNrYWdlQnlUeXBlKCcqJywgZnVuY3Rpb24oXG4gICAgbmFtZTogc3RyaW5nLCBlbnRyeVBhdGg6IHN0cmluZywgcGFyc2VkTmFtZToge3Njb3BlOiBzdHJpbmcsIG5hbWU6IHN0cmluZ30sIHBrSnNvbjogYW55LCBwYWNrYWdlUGF0aDogc3RyaW5nKSB7XG4gICAgYWRkUGFja2FnZVRvSW5mbyhwYWNrYWdlVXRpbHMsIGluZm8sIG5vZGVQYXRocywgbmFtZSwgcGFyc2VkTmFtZSwgcGtKc29uLCBwYWNrYWdlUGF0aCk7XG4gIH0pO1xuICBhZGRQYWNrYWdlVG9JbmZvKHBhY2thZ2VVdGlscywgaW5mbywgbm9kZVBhdGhzLCAnZHItY29tcC1wYWNrYWdlJyxcbiAgICBwYWNrYWdlVXRpbHMucGFyc2VOYW1lKCdkci1jb21wLXBhY2thZ2UnKSxcbiAgICByZXF1aXJlKCdkci1jb21wLXBhY2thZ2UvcGFja2FnZS5qc29uJyksIHBhY2thZ2VVdGlscy5maW5kQnJvd3NlclBhY2thZ2VQYXRoKCdkci1jb21wLXBhY2thZ2UnKSk7XG4gIF8uZWFjaChidW5kbGVNYXAsIChwYWNrYWdlTWFwLCBidW5kbGUpID0+IHtcbiAgICBidW5kbGVNYXBbYnVuZGxlXSA9IF8udmFsdWVzKHBhY2thZ2VNYXApOyAvLyB0dXJuIE9iamVjdC48bW9kdWxlTmFtZSwgcGFja2FnZUluc3RhbmNlPiB0byBBcnJheS48cGFja2FnZUluc3RhbmNlPlxuICB9KTtcbiAgaW5mby5hbGxNb2R1bGVzID0gXy52YWx1ZXMoaW5mby5tb2R1bGVNYXApO1xuXG4gIHJldHVybiBpbmZvO1xufVxuXG5mdW5jdGlvbiBhZGRQYWNrYWdlVG9JbmZvKHBhY2thZ2VVdGlsczogYW55LCBpbmZvOiBQYWNrYWdlSW5mbywgbm9kZVBhdGhzOiBzdHJpbmdbXSwgbmFtZTogc3RyaW5nLFxuICBwYXJzZWROYW1lOiB7c2NvcGU6IHN0cmluZywgbmFtZTogc3RyaW5nfSwgcGtKc29uOiBhbnksIHBhY2thZ2VQYXRoOiBzdHJpbmcpIHtcbiAgdmFyIGVudHJ5Vmlld3MsIGVudHJ5UGFnZXM7XG4gIHZhciBpc0VudHJ5U2VydmVyVGVtcGxhdGUgPSB0cnVlO1xuICB2YXIgbm9QYXJzZUZpbGVzLCBpbnN0YW5jZTtcbiAgaWYgKF8uaGFzKGluZm8ubW9kdWxlTWFwLCBuYW1lKSkge1xuICAgIGluc3RhbmNlID0gaW5mby5tb2R1bGVNYXBbbmFtZV07XG4gIH0gZWxzZSB7XG4gICAgLy8gVGhlcmUgYXJlIGFsc28gbm9kZSBwYWNrYWdlc1xuICAgIGluc3RhbmNlID0gbmV3IHBhY2thZ2VCcm93c2VySW5zdGFuY2Uoe1xuICAgICAgaXNWZW5kb3I6IHRydWUsXG4gICAgICBidW5kbGU6IG51bGwsXG4gICAgICBsb25nTmFtZTogbmFtZSxcbiAgICAgIHNob3J0TmFtZTogcGFja2FnZVV0aWxzLnBhcnNlTmFtZShuYW1lKS5uYW1lLFxuICAgICAgcGFja2FnZVBhdGgsXG4gICAgICByZWFsUGFja2FnZVBhdGg6IGZzLnJlYWxwYXRoU3luYyhwYWNrYWdlUGF0aClcbiAgICB9KTtcbiAgfVxuICBpZiAoIXBrSnNvbi5kcikge1xuICAgIHBrSnNvbi5kciA9IHt9O1xuICB9XG4gIGlmIChwa0pzb24uZHIuZW50cnlQYWdlKSB7XG4gICAgaXNFbnRyeVNlcnZlclRlbXBsYXRlID0gZmFsc2U7XG4gICAgZW50cnlQYWdlcyA9IFtdLmNvbmNhdChwa0pzb24uZHIuZW50cnlQYWdlKTtcbiAgICBpbmZvLmVudHJ5UGFnZU1hcFtuYW1lXSA9IGluc3RhbmNlO1xuICB9IGVsc2UgaWYgKHBrSnNvbi5kci5lbnRyeVZpZXcpIHtcbiAgICBpc0VudHJ5U2VydmVyVGVtcGxhdGUgPSB0cnVlO1xuICAgIGVudHJ5Vmlld3MgPSBbXS5jb25jYXQocGtKc29uLmRyLmVudHJ5Vmlldyk7XG4gICAgaW5mby5lbnRyeVBhZ2VNYXBbbmFtZV0gPSBpbnN0YW5jZTtcbiAgfVxuICBpZiAocGtKc29uLmRyLm5vUGFyc2UpIHtcbiAgICBub1BhcnNlRmlsZXMgPSBbXS5jb25jYXQocGtKc29uLmRyLm5vUGFyc2UpLm1hcCh0cmltTm9QYXJzZVNldHRpbmcpO1xuICB9XG4gIGlmIChwa0pzb24uZHIuYnJvd3NlcmlmeU5vUGFyc2UpIHtcbiAgICBub1BhcnNlRmlsZXMgPSBbXS5jb25jYXQocGtKc29uLmRyLmJyb3dzZXJpZnlOb1BhcnNlKS5tYXAodHJpbU5vUGFyc2VTZXR0aW5nKTtcbiAgfVxuICB2YXIgbWFpbkZpbGU7XG4gIHRyeSB7XG4gICAgLy8gRm9yIHBhY2thZ2UgbGlrZSBlMmV0ZXN0LCBpdCBjb3VsZCBoYXZlIG5vIG1haW4gZmlsZVxuICAgIG1haW5GaWxlID0gYlJlc29sdmUuc3luYyhuYW1lLCB7cGF0aHM6IG5vZGVQYXRoc30pO1xuICB9IGNhdGNoIChlcnIpIHt9XG4gIGluc3RhbmNlLmluaXQoe1xuICAgIGlzVmVuZG9yOiBmYWxzZSxcbiAgICBmaWxlOiBtYWluRmlsZSA/IGZzLnJlYWxwYXRoU3luYyhtYWluRmlsZSkgOiB1bmRlZmluZWQsIC8vIHBhY2thZ2UuanNvbiBcImJyb3dzZXJcIlxuICAgIG1haW46IHBrSnNvbi5tYWluLCAvLyBwYWNrYWdlLmpzb24gXCJtYWluXCJcbiAgICBzdHlsZTogcGtKc29uLnN0eWxlID8gcmVzb2x2ZVN0eWxlKG5hbWUsIG5vZGVQYXRocykgOiB1bmRlZmluZWQsXG4gICAgcGFyc2VkTmFtZSxcbiAgICBlbnRyeVBhZ2VzLFxuICAgIGVudHJ5Vmlld3MsXG4gICAgYnJvd3NlcmlmeU5vUGFyc2U6IG5vUGFyc2VGaWxlcyxcbiAgICBpc0VudHJ5U2VydmVyVGVtcGxhdGUsXG4gICAgdHJhbnNsYXRhYmxlOiAhXy5oYXMocGtKc29uLCAnZHIudHJhbnNsYXRhYmxlJykgfHwgXy5nZXQocGtKc29uLCAnZHIudHJhbnNsYXRhYmxlJyksXG4gICAgZHI6IHBrSnNvbi5kcixcbiAgICBqc29uOiBwa0pzb24sXG4gICAgY29tcGlsZXI6IHBrSnNvbi5kci5jb21waWxlcixcbiAgICBicm93c2VyOiBwa0pzb24uYnJvd3NlcixcbiAgICBpMThuOiBwa0pzb24uZHIuaTE4biA/IHBrSnNvbi5kci5pMThuIDogbnVsbCxcbiAgICBhcHBUeXBlOiBwa0pzb24uZHIuYXBwVHlwZVxuICB9KTtcbiAgaWYgKGluc3RhbmNlLmZpbGUgPT0gbnVsbCAmJiAoaW5zdGFuY2UuZW50cnlQYWdlcyB8fCBpbnN0YW5jZS5lbnRyeVZpZXdzKSlcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEVudHJ5IHBhY2thZ2UgXCIke2luc3RhbmNlLmxvbmdOYW1lfVwiJ3MgXCJicm93c2VyXCIgb3IgXCJtYWluXCIgZmlsZSAke21haW5GaWxlfSBkb2Vzbid0IGV4aXN0IWApO1xuICBpbmZvLm1vZHVsZU1hcFtpbnN0YW5jZS5sb25nTmFtZV0gPSBpbnN0YW5jZTtcbiAgaW5mby5zaG9ydE5hbWVNYXBbaW5zdGFuY2Uuc2hvcnROYW1lXSA9IGluc3RhbmNlO1xuICBpZiAoIWluc3RhbmNlLmJ1bmRsZSlcbiAgICBpbmZvLm5vQnVuZGxlUGFja2FnZU1hcFtpbnN0YW5jZS5sb25nTmFtZV0gPSBpbnN0YW5jZTtcbn1cblxuZnVuY3Rpb24gdHJpbU5vUGFyc2VTZXR0aW5nKHA6IHN0cmluZykge1xuICBwID0gcC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIGlmIChwLnN0YXJ0c1dpdGgoJy4vJykpIHtcbiAgICBwID0gcC5zdWJzdHJpbmcoMik7XG4gIH1cbiAgcmV0dXJuIHA7XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVTdHlsZShuYW1lOiBzdHJpbmcsIG5vZGVQYXRoczogc3RyaW5nW10pIHtcbiAgdmFyIGVudHJ5O1xuICB0cnkge1xuICAgIHJldHVybiBmcy5yZWFscGF0aFN5bmMocmVzb2x2ZS5zeW5jKG5hbWUsIHtcbiAgICAgIHBhdGhzOiBub2RlUGF0aHMsXG4gICAgICBwYWNrYWdlRmlsdGVyOiAocGtnOiBhbnksIHBrZ2ZpbGU6IGFueSkgPT4ge1xuICAgICAgICBlbnRyeSA9IHBrZy5tYWluID0gcGtnLnN0eWxlO1xuICAgICAgICByZXR1cm4gcGtnO1xuICAgICAgfVxuICAgIH0pKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgbG9nLndhcm4oJ0NhbiBub3QgcmVzb2x2ZSBzdHlsZSBmaWxlIFwiJXNcIiBvZiBwYWNrYWdlICVzJywgZW50cnksIG5hbWUpO1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlYWRCdW5kbGVNYXBDb25maWcocGFja2FnZVV0aWxzOiBhbnksIGNvbmZpZzogYW55KSB7XG4gIGNvbnN0IGluZm86IEJ1bmRsZUluZm8gPSB7XG4gICAgbW9kdWxlTWFwOiB7fSxcbiAgICAvKiogQHR5cGUge09iamVjdC48YnVuZGxlTmFtZSwgT2JqZWN0Ljxtb2R1bGVOYW1lLCBwYWNrYWdlSW5zdGFuY2U+Pn0gKi9cbiAgICBidW5kbGVNYXA6IHt9LFxuICAgIHNob3J0TmFtZU1hcDoge30sXG4gICAgLyoqIEB0eXBlIHtPYmplY3QuPGJ1bmRsZU5hbWUsIFVSTFtdPn0gKi9cbiAgICBidW5kbGVVcmxNYXA6IHt9LFxuICAgIHVybFBhY2thZ2VTZXQ6IG51bGxcbiAgfTtcbiAgX3JlYWRCdW5kbGVzKHBhY2thZ2VVdGlscywgaW5mbywgY29uZmlnLCB0cnVlKTtcbiAgX3JlYWRQYWNrYWdlQ2h1bmtNYXAocGFja2FnZVV0aWxzLCBjb25maWcsIGluZm8pO1xuICByZXR1cm4gaW5mbztcbn1cblxuZnVuY3Rpb24gX3JlYWRQYWNrYWdlQ2h1bmtNYXAocGFja2FnZVV0aWxzOiBhbnksIGNvbmZpZzogYW55LCBpbmZvOiBCdW5kbGVJbmZvKSB7XG4gIGNvbnN0IGJtYXAgPSBpbmZvLmJ1bmRsZU1hcDtcbiAgY29uc3QgbW1hcCA9IGluZm8ubW9kdWxlTWFwO1xuICBfLmVhY2goY29uZmlnKCkuX3BhY2thZ2UyQ2h1bmssIChidW5kbGUsIG1vZHVsZU5hbWUpID0+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcGFja2FnZVBhdGggPSBwYWNrYWdlVXRpbHMuZmluZEJyb3dzZXJQYWNrYWdlUGF0aChtb2R1bGVOYW1lKTtcbiAgICAgIGlmICghcGFja2FnZVBhdGgpXG4gICAgICAgIHJldHVybjtcbiAgICAgIGNvbnN0IHBhcnNlZE5hbWUgPSBwYWNrYWdlVXRpbHMucGFyc2VOYW1lKG1vZHVsZU5hbWUpO1xuICAgICAgY29uc3QgaW5zdGFuY2UgPSBuZXcgcGFja2FnZUJyb3dzZXJJbnN0YW5jZSh7XG4gICAgICAgIGlzVmVuZG9yOiB0cnVlLFxuICAgICAgICBidW5kbGUsXG4gICAgICAgIGxvbmdOYW1lOiBtb2R1bGVOYW1lLFxuICAgICAgICBwYXJzZWROYW1lLFxuICAgICAgICBzaG9ydE5hbWU6IHBhcnNlZE5hbWUubmFtZSxcbiAgICAgICAgcGFja2FnZVBhdGgsXG4gICAgICAgIHJlYWxQYWNrYWdlUGF0aDogZnMucmVhbHBhdGhTeW5jKHBhY2thZ2VQYXRoKVxuICAgICAgfSk7XG4gICAgICBtbWFwW21vZHVsZU5hbWVdID0gaW5zdGFuY2U7XG4gICAgICBpbmZvLnNob3J0TmFtZU1hcFtwYXJzZWROYW1lLm5hbWVdID0gaW5zdGFuY2U7XG4gICAgICBpZiAoaW5mby51cmxQYWNrYWdlU2V0KVxuICAgICAgICBpbmZvLnVybFBhY2thZ2VTZXRbbW9kdWxlTmFtZV0gPSAxO1xuICAgICAgaWYgKF8uaGFzKGJtYXAsIGJ1bmRsZSkgJiYgXy5pc0FycmF5KGJtYXBbYnVuZGxlXSkpXG4gICAgICAgIGJtYXBbYnVuZGxlXS5wdXNoKGluc3RhbmNlKTtcbiAgICAgIGVsc2VcbiAgICAgICAgYm1hcFtidW5kbGVdID0gW2luc3RhbmNlXTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGxvZy53YXJuKGVycik7XG4gICAgICB0aHJvdyBlcnI7XG4gICAgfVxuICB9KTtcbn1cblxuZnVuY3Rpb24gX3JlYWRCdW5kbGVzKHBhY2thZ2VVdGlsczogYW55LCBpbmZvOiBCdW5kbGVJbmZvLCBjb25maWc6IGFueSwgaXNFeHRlcm5hbCA9IGZhbHNlKSB7XG4gIGNvbnN0IGJtYXAgPSBpbmZvLmJ1bmRsZU1hcDtcbiAgY29uc3QgbW1hcCA9IGluZm8ubW9kdWxlTWFwO1xuXG4gIGludGVyZmFjZSBFYm1UeXBlMSB7XG4gICAgVVJMczogc3RyaW5nW107XG4gICAgbW9kdWxlczogc3RyaW5nW107XG4gIH1cbiAgaW50ZXJmYWNlIEVibVR5cGUyIHtcbiAgICBqcz86IHN0cmluZ1tdO1xuICAgIGNzcz86IHN0cmluZ1tdO1xuICB9XG4gIHR5cGUgRWJtVHlwZSA9IEVibVR5cGUxIHwgRWJtVHlwZTIgfCBzdHJpbmc7XG5cbiAgY29uc3QgbWFwQ29uZmlnID0gY29uZmlnKCkuZXh0ZXJuYWxCdW5kbGVNYXAgYXMge1trOiBzdHJpbmddOiBzdHJpbmdbXSB8IEVibVR5cGV9O1xuICBpZiAoaXNFeHRlcm5hbClcbiAgICBpbmZvLnVybFBhY2thZ2VTZXQgPSB7fTtcbiAgXy5mb3JPd24obWFwQ29uZmlnLCBmdW5jdGlvbihidW5kbGVEYXRhLCBidW5kbGUpIHtcbiAgICBjb25zdCBtb2R1bGVOYW1lczogc3RyaW5nW10gPSBfLmlzQXJyYXkoKGJ1bmRsZURhdGEgYXMgRWJtVHlwZTEpLm1vZHVsZXMpID9cbiAgICAgIChidW5kbGVEYXRhIGFzIEVibVR5cGUxKS5tb2R1bGVzIDogYnVuZGxlRGF0YSBhcyBzdHJpbmdbXTtcbiAgICBjb25zdCBidW5kbGVNb2R1bGVzID0gXy5tYXAobW9kdWxlTmFtZXMsIGZ1bmN0aW9uKG1vZHVsZU5hbWUpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHBhY2thZ2VQYXRoID0gcGFja2FnZVV0aWxzLmZpbmRCcm93c2VyUGFja2FnZVBhdGgobW9kdWxlTmFtZSk7XG4gICAgICAgIGNvbnN0IGluc3RhbmNlID0gbmV3IHBhY2thZ2VCcm93c2VySW5zdGFuY2Uoe1xuICAgICAgICAgIGlzVmVuZG9yOiB0cnVlLFxuICAgICAgICAgIGJ1bmRsZSxcbiAgICAgICAgICBsb25nTmFtZTogbW9kdWxlTmFtZSxcbiAgICAgICAgICBzaG9ydE5hbWU6IHBhY2thZ2VVdGlscy5wYXJzZU5hbWUobW9kdWxlTmFtZSkubmFtZSxcbiAgICAgICAgICBwYWNrYWdlUGF0aCxcbiAgICAgICAgICByZWFsUGFja2FnZVBhdGg6IGZzLnJlYWxwYXRoU3luYyhwYWNrYWdlUGF0aClcbiAgICAgICAgfSk7XG4gICAgICAgIG1tYXBbbW9kdWxlTmFtZV0gPSBpbnN0YW5jZTtcbiAgICAgICAgaW5mby5zaG9ydE5hbWVNYXBbaW5zdGFuY2Uuc2hvcnROYW1lXSA9IGluc3RhbmNlO1xuICAgICAgICBpZiAoaW5mby51cmxQYWNrYWdlU2V0KVxuICAgICAgICAgIGluZm8udXJsUGFja2FnZVNldFttb2R1bGVOYW1lXSA9IDE7XG4gICAgICAgIHJldHVybiBpbnN0YW5jZTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICBsb2cud2FybihlcnIpO1xuICAgICAgICB0aHJvdyBlcnI7XG4gICAgICB9XG4gICAgfSk7XG4gICAgaWYgKGlzRXh0ZXJuYWwpIHtcbiAgICAgIGlmIChfLmlzQXJyYXkoYnVuZGxlRGF0YSkpXG4gICAgICAgIGluZm8uYnVuZGxlVXJsTWFwW2J1bmRsZV0gPSBidW5kbGVEYXRhO1xuICAgICAgZWxzZSBpZiAoXy5oYXMoYnVuZGxlRGF0YSwgJ1VSTHMnKSlcbiAgICAgICAgaW5mby5idW5kbGVVcmxNYXBbYnVuZGxlXSA9IChidW5kbGVEYXRhIGFzIEVibVR5cGUxKS5VUkxzO1xuICAgICAgZWxzZSBpZiAoXy5pc09iamVjdChidW5kbGVEYXRhKSkge1xuICAgICAgICBpZiAoIV8uaGFzKGJ1bmRsZURhdGEsICdqcycpICYmICFfLmhhcyhidW5kbGVEYXRhLCAnY3NzJykpXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdjb25maWcgcHJvcGVydHkgXCJleHRlcm5hbEJ1bmRsZU1hcFwiIG11c3QgYmUgYXJyYXkgb2Ygb2JqZWN0IHtjc3M6IHN0cmluZ1tdLCBqczogc3RyaW5nW119Jyk7XG4gICAgICAgIGluZm8uYnVuZGxlVXJsTWFwW2J1bmRsZV0gPSBidW5kbGVEYXRhIGFzIEVibVR5cGUyOyAvLyBidW5kbGVEYXRhLmNzcywgYnVuZGxlRGF0YS5qc1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaW5mby5idW5kbGVVcmxNYXBbYnVuZGxlXSA9IFtidW5kbGVEYXRhIGFzIHN0cmluZ107XG4gICAgICB9XG4gICAgfSBlbHNlXG4gICAgICBibWFwW2J1bmRsZV0gPSBidW5kbGVNb2R1bGVzO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlUGFja2FnZURpclRyZWUocGFja2FnZUluZm86IFBhY2thZ2VJbmZvKSB7XG4gIGNvbnN0IHRyZWUgPSBuZXcgRGlyVHJlZTxQYWNrYWdlQnJvd3Nlckluc3RhbmNlPigpO1xuICB2YXIgY291bnQgPSAwO1xuICBwYWNrYWdlSW5mby5hbGxNb2R1bGVzLmZvckVhY2gobW9kdWxlSW5zdGFuY2UgPT4ge1xuICAgIC8vIGxvZy5pbmZvKG1vZHVsZUluc3RhbmNlLmxvbmdOYW1lKTtcbiAgICBpZiAobW9kdWxlSW5zdGFuY2UgPT0gbnVsbClcbiAgICAgIHJldHVybjtcbiAgICBpZiAobW9kdWxlSW5zdGFuY2UucmVhbFBhY2thZ2VQYXRoKVxuICAgICAgdHJlZS5wdXREYXRhKG1vZHVsZUluc3RhbmNlLnJlYWxQYWNrYWdlUGF0aCwgbW9kdWxlSW5zdGFuY2UpO1xuICAgIGlmIChtb2R1bGVJbnN0YW5jZS5wYWNrYWdlUGF0aCAhPT0gbW9kdWxlSW5zdGFuY2UucmVhbFBhY2thZ2VQYXRoKVxuICAgICAgdHJlZS5wdXREYXRhKG1vZHVsZUluc3RhbmNlLnBhY2thZ2VQYXRoLCBtb2R1bGVJbnN0YW5jZSk7XG4gICAgY291bnQrKztcbiAgfSk7XG4gIGxvZy5pbmZvKCdUb3RhbCAlcyBub2RlIHBhY2thZ2VzJywgY291bnQpO1xuICBwYWNrYWdlSW5mby5kaXJUcmVlID0gdHJlZTtcbn1cblxuIl19