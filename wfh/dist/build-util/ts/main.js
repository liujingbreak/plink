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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3RzL2J1aWxkLXV0aWwvdHMvbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7QUFBQSwyQ0FBNkI7QUFDN0IsdUNBQXlCO0FBQ3pCLDBFQUF3RDtBQUN4RCwwQ0FBNEI7QUFDNUIsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDNUMsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQ25DLGdDQUFnQztBQUNoQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQ3pGLDZEQUF1RDtBQUN2RCwwRUFBd0Q7QUFnQmhELGlDQWhCRCwwQkFBc0IsQ0FnQkM7QUFFOUIsSUFBSSxXQUF3QixDQUFDO0FBQzdCLHlDQUF5QztBQUN6Qzs7Ozs7OztHQU9HO0FBQ0gsU0FBZ0IsWUFBWSxDQUFDLE1BQVcsRUFBRSxZQUFpQjtJQUMxRCxJQUFJLFdBQVc7UUFDZCxPQUFPLFdBQVcsQ0FBQztJQUNwQixHQUFHLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUM7SUFDbkMsV0FBVyxHQUFHLGFBQWEsQ0FBQyxZQUFZLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDbEQsb0JBQW9CLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDbEMsT0FBTyxXQUFXLENBQUM7QUFDcEIsQ0FBQztBQVBELG9DQU9DO0FBRUQsU0FBZ0IsY0FBYyxDQUFDLE9BQVksRUFBRSxhQUFrQjtJQUM5RCxPQUFPLENBQUMsR0FBRyxDQUFDLGtCQUFrQixFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3ZDLE1BQU0sV0FBVyxHQUFHLFlBQVksQ0FBQyxPQUFPLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFD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LElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUMxRCxLQUFLLEVBQUUsQ0FBQztJQUNULENBQUMsQ0FBQyxDQUFDO0lBQ0gsR0FBRyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUMxQyxXQUFXLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztBQUM1QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCBwYWNrYWdlQnJvd3Nlckluc3RhbmNlIGZyb20gJy4vcGFja2FnZS1pbnN0YW5jZSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5jb25zdCBiUmVzb2x2ZSA9IHJlcXVpcmUoJ2Jyb3dzZXItcmVzb2x2ZScpO1xuY29uc3QgcmVzb2x2ZSA9IHJlcXVpcmUoJ3Jlc29sdmUnKTtcbi8vIHZhciBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ2J1aWxkVXRpbC4nICsgUGF0aC5iYXNlbmFtZShfX2ZpbGVuYW1lLCAnLmpzJykpO1xuaW1wb3J0IHtEaXJUcmVlfSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvZGlyLXRyZWUnO1xuaW1wb3J0IFBhY2thZ2VCcm93c2VySW5zdGFuY2UgZnJvbSAnLi9wYWNrYWdlLWluc3RhbmNlJztcblxuZXhwb3J0IGludGVyZmFjZSBCdW5kbGVJbmZvIHtcblx0bW9kdWxlTWFwOiB7W25hbWU6IHN0cmluZ106IFBhY2thZ2VCcm93c2VySW5zdGFuY2V9O1xuXHRzaG9ydE5hbWVNYXA6IHtbbmFtZTogc3RyaW5nXTogUGFja2FnZUJyb3dzZXJJbnN0YW5jZX07XG5cdGJ1bmRsZU1hcDoge1tuYW1lOiBzdHJpbmddOiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlW119O1xuXHRidW5kbGVVcmxNYXA6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nW10gfHtjc3M/OiBzdHJpbmdbXSwganM/OiBzdHJpbmdbXX19O1xuXHR1cmxQYWNrYWdlU2V0OiB7W25hbWU6IHN0cmluZ106IG51bWJlcn0gfCBudWxsO1xufVxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlSW5mbyBleHRlbmRzIEJ1bmRsZUluZm8ge1xuXHRhbGxNb2R1bGVzOiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlW107XG5cdGRpclRyZWU6IERpclRyZWU8UGFja2FnZUJyb3dzZXJJbnN0YW5jZT47XG5cdG5vQnVuZGxlUGFja2FnZU1hcDoge1tuYW1lOiBzdHJpbmddOiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlfTtcblx0ZW50cnlQYWdlTWFwOiB7W3BhZ2U6IHN0cmluZ106IFBhY2thZ2VCcm93c2VySW5zdGFuY2V9O1xufVxuXG5leHBvcnQge1BhY2thZ2VCcm93c2VySW5zdGFuY2V9O1xuXG5sZXQgcGFja2FnZUluZm86IFBhY2thZ2VJbmZvO1xuLy8gdmFyIHBhY2thZ2VJbmZvQ2FjaGVGaWxlLCBpc0Zyb21DYWNoZTtcbi8qKlxuICogd2Fsa1BhY2thZ2VzXG4gKiBAcGFyYW0geyp9IGNvbmZpZyBcbiAqIEBwYXJhbSB7Kn0gYXJndiBcbiAqIEBwYXJhbSB7Kn0gcGFja2FnZVV0aWxzIFxuICogQHBhcmFtIHsqfSBpZ25vcmVDYWNoZVxuICogQHJldHVybiB7UGFja2FnZUluZm99XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3YWxrUGFja2FnZXMoY29uZmlnOiBhbnksIHBhY2thZ2VVdGlsczogYW55KSB7XG5cdGlmIChwYWNrYWdlSW5mbylcblx0XHRyZXR1cm4gcGFja2FnZUluZm87XG5cdGxvZy5pbmZvKCdzY2FuIGZvciBwYWNrYWdlcyBpbmZvJyk7XG5cdHBhY2thZ2VJbmZvID0gX3dhbGtQYWNrYWdlcyhwYWNrYWdlVXRpbHMsIGNvbmZpZyk7XG5cdGNyZWF0ZVBhY2thZ2VEaXJUcmVlKHBhY2thZ2VJbmZvKTtcblx0cmV0dXJuIHBhY2thZ2VJbmZvO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbGlzdEJ1bmRsZUluZm8oX2NvbmZpZzogYW55LCBfcGFja2FnZVV0aWxzOiBhbnkpIHtcblx0X2NvbmZpZy5zZXQoJ2J1bmRsZVBlclBhY2thZ2UnLCBmYWxzZSk7XG5cdGNvbnN0IHBhY2thZ2VJbmZvID0gd2Fsa1BhY2thZ2VzKF9jb25maWcsIF9wYWNrYWdlVXRpbHMpO1xuXHRzYXZlQ2FjaGUocGFja2FnZUluZm8sIF9jb25maWcpO1xuXHRyZXR1cm4gcGFja2FnZUluZm87XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHNhdmVDYWNoZShwYWNrYWdlSW5mbzogUGFja2FnZUluZm8sIGNvbmZpZzogYW55KSB7XG5cdC8vIGlmIChpc0Zyb21DYWNoZSlcblx0Ly8gXHRyZXR1cm47XG5cdC8vIG1rZGlycC5zeW5jKFBhdGguam9pbihjb25maWcoKS5yb290UGF0aCwgY29uZmlnKCkuZGVzdERpcikpO1xuXHQvLyBmcy53cml0ZUZpbGVTeW5jKHBhY2thZ2VJbmZvQ2FjaGVGaWxlLCBKU09OLnN0cmluZ2lmeShjeWNsZS5kZWN5Y2xlKHBhY2thZ2VJbmZvKSkpO1xuXHQvLyBsb2cuZGVidWcoJ3dyaXRlIHRvIGNhY2hlICcsIHBhY2thZ2VJbmZvQ2FjaGVGaWxlKTtcbn1cblxuZnVuY3Rpb24gX3dhbGtQYWNrYWdlcyhwYWNrYWdlVXRpbHM6IGFueSwgY29uZmlnOiBhbnkpOiBQYWNrYWdlSW5mbyB7XG5cdGNvbnN0IG5vZGVQYXRocyA9IFtjb25maWcoKS5ub2RlUGF0aF07XG5cdGNvbnN0IGNvbmZpZ0J1bmRsZUluZm8gPSByZWFkQnVuZGxlTWFwQ29uZmlnKHBhY2thZ2VVdGlscywgY29uZmlnKTtcblx0Y29uc3QgaW5mbzogUGFja2FnZUluZm8gPSB7XG5cdFx0YWxsTW9kdWxlczogbnVsbCBhcyB1bmtub3duIGFzIFBhY2thZ2VCcm93c2VySW5zdGFuY2VbXSwgLy8gYXJyYXlcblx0XHRtb2R1bGVNYXA6IF8uY2xvbmUoY29uZmlnQnVuZGxlSW5mby5tb2R1bGVNYXApLFxuXHRcdHNob3J0TmFtZU1hcDogXy5jbG9uZShjb25maWdCdW5kbGVJbmZvLnNob3J0TmFtZU1hcCksXG5cdFx0bm9CdW5kbGVQYWNrYWdlTWFwOiB7fSxcblx0XHRidW5kbGVNYXA6IGNvbmZpZ0J1bmRsZUluZm8uYnVuZGxlTWFwLFxuXHRcdGJ1bmRsZVVybE1hcDogY29uZmlnQnVuZGxlSW5mby5idW5kbGVVcmxNYXAsXG5cdFx0dXJsUGFja2FnZVNldDogY29uZmlnQnVuZGxlSW5mby51cmxQYWNrYWdlU2V0LFxuXHRcdGVudHJ5UGFnZU1hcDoge30sXG5cdFx0ZGlyVHJlZTogbnVsbCBhcyB1bmtub3duIGFzIERpclRyZWU8UGFja2FnZUJyb3dzZXJJbnN0YW5jZT5cblx0fTtcblx0Y29uc3QgYnVuZGxlTWFwID0gaW5mby5idW5kbGVNYXA7XG5cblx0cGFja2FnZVV0aWxzLmZpbmRCcm93c2VyUGFja2FnZUJ5VHlwZSgnKicsIGZ1bmN0aW9uKFxuXHRcdG5hbWU6IHN0cmluZywgZW50cnlQYXRoOiBzdHJpbmcsIHBhcnNlZE5hbWU6IHtzY29wZTogc3RyaW5nLCBuYW1lOiBzdHJpbmd9LCBwa0pzb246IGFueSwgcGFja2FnZVBhdGg6IHN0cmluZykge1xuXHRcdGFkZFBhY2thZ2VUb0luZm8ocGFja2FnZVV0aWxzLCBpbmZvLCBub2RlUGF0aHMsIG5hbWUsIHBhcnNlZE5hbWUsIHBrSnNvbiwgcGFja2FnZVBhdGgpO1xuXHR9KTtcblx0YWRkUGFja2FnZVRvSW5mbyhwYWNrYWdlVXRpbHMsIGluZm8sIG5vZGVQYXRocywgJ2RyLWNvbXAtcGFja2FnZScsXG5cdFx0cGFja2FnZVV0aWxzLnBhcnNlTmFtZSgnZHItY29tcC1wYWNrYWdlJyksXG5cdFx0cmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL3BhY2thZ2UuanNvbicpLCBwYWNrYWdlVXRpbHMuZmluZEJyb3dzZXJQYWNrYWdlUGF0aCgnZHItY29tcC1wYWNrYWdlJykpO1xuXHRfLmVhY2goYnVuZGxlTWFwLCAocGFja2FnZU1hcCwgYnVuZGxlKSA9PiB7XG5cdFx0YnVuZGxlTWFwW2J1bmRsZV0gPSBfLnZhbHVlcyhwYWNrYWdlTWFwKTsgLy8gdHVybiBPYmplY3QuPG1vZHVsZU5hbWUsIHBhY2thZ2VJbnN0YW5jZT4gdG8gQXJyYXkuPHBhY2thZ2VJbnN0YW5jZT5cblx0fSk7XG5cdGluZm8uYWxsTW9kdWxlcyA9IF8udmFsdWVzKGluZm8ubW9kdWxlTWFwKTtcblxuXHRyZXR1cm4gaW5mbztcbn1cblxuZnVuY3Rpb24gYWRkUGFja2FnZVRvSW5mbyhwYWNrYWdlVXRpbHM6IGFueSwgaW5mbzogUGFja2FnZUluZm8sIG5vZGVQYXRoczogc3RyaW5nW10sIG5hbWU6IHN0cmluZyxcblx0cGFyc2VkTmFtZToge3Njb3BlOiBzdHJpbmcsIG5hbWU6IHN0cmluZ30sIHBrSnNvbjogYW55LCBwYWNrYWdlUGF0aDogc3RyaW5nKSB7XG5cdHZhciBlbnRyeVZpZXdzLCBlbnRyeVBhZ2VzO1xuXHR2YXIgaXNFbnRyeVNlcnZlclRlbXBsYXRlID0gdHJ1ZTtcblx0dmFyIG5vUGFyc2VGaWxlcywgaW5zdGFuY2U7XG5cdGlmIChfLmhhcyhpbmZvLm1vZHVsZU1hcCwgbmFtZSkpIHtcblx0XHRpbnN0YW5jZSA9IGluZm8ubW9kdWxlTWFwW25hbWVdO1xuXHR9IGVsc2Uge1xuXHRcdC8vIFRoZXJlIGFyZSBhbHNvIG5vZGUgcGFja2FnZXNcblx0XHRpbnN0YW5jZSA9IG5ldyBwYWNrYWdlQnJvd3Nlckluc3RhbmNlKHtcblx0XHRcdGlzVmVuZG9yOiB0cnVlLFxuXHRcdFx0YnVuZGxlOiBudWxsLFxuXHRcdFx0bG9uZ05hbWU6IG5hbWUsXG5cdFx0XHRzaG9ydE5hbWU6IHBhY2thZ2VVdGlscy5wYXJzZU5hbWUobmFtZSkubmFtZSxcblx0XHRcdHBhY2thZ2VQYXRoLFxuXHRcdFx0cmVhbFBhY2thZ2VQYXRoOiBmcy5yZWFscGF0aFN5bmMocGFja2FnZVBhdGgpXG5cdFx0fSk7XG5cdH1cblx0aWYgKCFwa0pzb24uZHIpIHtcblx0XHRwa0pzb24uZHIgPSB7fTtcblx0fVxuXHRpZiAocGtKc29uLmRyLmVudHJ5UGFnZSkge1xuXHRcdGlzRW50cnlTZXJ2ZXJUZW1wbGF0ZSA9IGZhbHNlO1xuXHRcdGVudHJ5UGFnZXMgPSBbXS5jb25jYXQocGtKc29uLmRyLmVudHJ5UGFnZSk7XG5cdFx0aW5mby5lbnRyeVBhZ2VNYXBbbmFtZV0gPSBpbnN0YW5jZTtcblx0fSBlbHNlIGlmIChwa0pzb24uZHIuZW50cnlWaWV3KSB7XG5cdFx0aXNFbnRyeVNlcnZlclRlbXBsYXRlID0gdHJ1ZTtcblx0XHRlbnRyeVZpZXdzID0gW10uY29uY2F0KHBrSnNvbi5kci5lbnRyeVZpZXcpO1xuXHRcdGluZm8uZW50cnlQYWdlTWFwW25hbWVdID0gaW5zdGFuY2U7XG5cdH1cblx0aWYgKHBrSnNvbi5kci5ub1BhcnNlKSB7XG5cdFx0bm9QYXJzZUZpbGVzID0gW10uY29uY2F0KHBrSnNvbi5kci5ub1BhcnNlKS5tYXAodHJpbU5vUGFyc2VTZXR0aW5nKTtcblx0fVxuXHRpZiAocGtKc29uLmRyLmJyb3dzZXJpZnlOb1BhcnNlKSB7XG5cdFx0bm9QYXJzZUZpbGVzID0gW10uY29uY2F0KHBrSnNvbi5kci5icm93c2VyaWZ5Tm9QYXJzZSkubWFwKHRyaW1Ob1BhcnNlU2V0dGluZyk7XG5cdH1cblx0dmFyIG1haW5GaWxlO1xuXHR0cnkge1xuXHRcdC8vIEZvciBwYWNrYWdlIGxpa2UgZTJldGVzdCwgaXQgY291bGQgaGF2ZSBubyBtYWluIGZpbGVcblx0XHRtYWluRmlsZSA9IGJSZXNvbHZlLnN5bmMobmFtZSwge3BhdGhzOiBub2RlUGF0aHN9KTtcblx0fSBjYXRjaCAoZXJyKSB7fVxuXHRpbnN0YW5jZS5pbml0KHtcblx0XHRpc1ZlbmRvcjogZmFsc2UsXG5cdFx0ZmlsZTogbWFpbkZpbGUgPyBmcy5yZWFscGF0aFN5bmMobWFpbkZpbGUpIDogdW5kZWZpbmVkLCAvLyBwYWNrYWdlLmpzb24gXCJicm93c2VyXCJcblx0XHRtYWluOiBwa0pzb24ubWFpbiwgLy8gcGFja2FnZS5qc29uIFwibWFpblwiXG5cdFx0c3R5bGU6IHBrSnNvbi5zdHlsZSA/IHJlc29sdmVTdHlsZShuYW1lLCBub2RlUGF0aHMpIDogdW5kZWZpbmVkLFxuXHRcdHBhcnNlZE5hbWUsXG5cdFx0ZW50cnlQYWdlcyxcblx0XHRlbnRyeVZpZXdzLFxuXHRcdGJyb3dzZXJpZnlOb1BhcnNlOiBub1BhcnNlRmlsZXMsXG5cdFx0aXNFbnRyeVNlcnZlclRlbXBsYXRlLFxuXHRcdHRyYW5zbGF0YWJsZTogIV8uaGFzKHBrSnNvbiwgJ2RyLnRyYW5zbGF0YWJsZScpIHx8IF8uZ2V0KHBrSnNvbiwgJ2RyLnRyYW5zbGF0YWJsZScpLFxuXHRcdGRyOiBwa0pzb24uZHIsXG5cdFx0anNvbjogcGtKc29uLFxuXHRcdGNvbXBpbGVyOiBwa0pzb24uZHIuY29tcGlsZXIsXG5cdFx0YnJvd3NlcjogcGtKc29uLmJyb3dzZXIsXG5cdFx0aTE4bjogcGtKc29uLmRyLmkxOG4gPyBwa0pzb24uZHIuaTE4biA6IG51bGwsXG5cdFx0YXBwVHlwZTogcGtKc29uLmRyLmFwcFR5cGVcblx0fSk7XG5cdGlmIChpbnN0YW5jZS5maWxlID09IG51bGwgJiYgKGluc3RhbmNlLmVudHJ5UGFnZXMgfHwgaW5zdGFuY2UuZW50cnlWaWV3cykpXG5cdFx0dGhyb3cgbmV3IEVycm9yKGBFbnRyeSBwYWNrYWdlIFwiJHtpbnN0YW5jZS5sb25nTmFtZX1cIidzIFwiYnJvd3NlclwiIG9yIFwibWFpblwiIGZpbGUgJHttYWluRmlsZX0gZG9lc24ndCBleGlzdCFgKTtcblx0aW5mby5tb2R1bGVNYXBbaW5zdGFuY2UubG9uZ05hbWVdID0gaW5zdGFuY2U7XG5cdGluZm8uc2hvcnROYW1lTWFwW2luc3RhbmNlLnNob3J0TmFtZV0gPSBpbnN0YW5jZTtcblx0aWYgKCFpbnN0YW5jZS5idW5kbGUpXG5cdFx0aW5mby5ub0J1bmRsZVBhY2thZ2VNYXBbaW5zdGFuY2UubG9uZ05hbWVdID0gaW5zdGFuY2U7XG59XG5cbmZ1bmN0aW9uIHRyaW1Ob1BhcnNlU2V0dGluZyhwOiBzdHJpbmcpIHtcblx0cCA9IHAucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXHRpZiAocC5zdGFydHNXaXRoKCcuLycpKSB7XG5cdFx0cCA9IHAuc3Vic3RyaW5nKDIpO1xuXHR9XG5cdHJldHVybiBwO1xufVxuXG5mdW5jdGlvbiByZXNvbHZlU3R5bGUobmFtZTogc3RyaW5nLCBub2RlUGF0aHM6IHN0cmluZ1tdKSB7XG5cdHZhciBlbnRyeTtcblx0dHJ5IHtcblx0XHRyZXR1cm4gZnMucmVhbHBhdGhTeW5jKHJlc29sdmUuc3luYyhuYW1lLCB7XG5cdFx0XHRwYXRoczogbm9kZVBhdGhzLFxuXHRcdFx0cGFja2FnZUZpbHRlcjogKHBrZzogYW55LCBwa2dmaWxlOiBhbnkpID0+IHtcblx0XHRcdFx0ZW50cnkgPSBwa2cubWFpbiA9IHBrZy5zdHlsZTtcblx0XHRcdFx0cmV0dXJuIHBrZztcblx0XHRcdH1cblx0XHR9KSk7XG5cdH0gY2F0Y2ggKGVycikge1xuXHRcdGxvZy53YXJuKCdDYW4gbm90IHJlc29sdmUgc3R5bGUgZmlsZSBcIiVzXCIgb2YgcGFja2FnZSAlcycsIGVudHJ5LCBuYW1lKTtcblx0XHRyZXR1cm4gbnVsbDtcblx0fVxufVxuXG5mdW5jdGlvbiByZWFkQnVuZGxlTWFwQ29uZmlnKHBhY2thZ2VVdGlsczogYW55LCBjb25maWc6IGFueSkge1xuXHRjb25zdCBpbmZvOiBCdW5kbGVJbmZvID0ge1xuXHRcdG1vZHVsZU1hcDoge30sXG5cdFx0LyoqIEB0eXBlIHtPYmplY3QuPGJ1bmRsZU5hbWUsIE9iamVjdC48bW9kdWxlTmFtZSwgcGFja2FnZUluc3RhbmNlPj59ICovXG5cdFx0YnVuZGxlTWFwOiB7fSxcblx0XHRzaG9ydE5hbWVNYXA6IHt9LFxuXHRcdC8qKiBAdHlwZSB7T2JqZWN0LjxidW5kbGVOYW1lLCBVUkxbXT59ICovXG5cdFx0YnVuZGxlVXJsTWFwOiB7fSxcblx0XHR1cmxQYWNrYWdlU2V0OiBudWxsXG5cdH07XG5cdF9yZWFkQnVuZGxlcyhwYWNrYWdlVXRpbHMsIGluZm8sIGNvbmZpZywgdHJ1ZSk7XG5cdF9yZWFkUGFja2FnZUNodW5rTWFwKHBhY2thZ2VVdGlscywgY29uZmlnLCBpbmZvKTtcblx0cmV0dXJuIGluZm87XG59XG5cbmZ1bmN0aW9uIF9yZWFkUGFja2FnZUNodW5rTWFwKHBhY2thZ2VVdGlsczogYW55LCBjb25maWc6IGFueSwgaW5mbzogQnVuZGxlSW5mbykge1xuXHRjb25zdCBibWFwID0gaW5mby5idW5kbGVNYXA7XG5cdGNvbnN0IG1tYXAgPSBpbmZvLm1vZHVsZU1hcDtcblx0Xy5lYWNoKGNvbmZpZygpLl9wYWNrYWdlMkNodW5rLCAoYnVuZGxlLCBtb2R1bGVOYW1lKSA9PiB7XG5cdFx0dHJ5IHtcblx0XHRcdGNvbnN0IHBhY2thZ2VQYXRoID0gcGFja2FnZVV0aWxzLmZpbmRCcm93c2VyUGFja2FnZVBhdGgobW9kdWxlTmFtZSk7XG5cdFx0XHRpZiAoIXBhY2thZ2VQYXRoKVxuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHRjb25zdCBwYXJzZWROYW1lID0gcGFja2FnZVV0aWxzLnBhcnNlTmFtZShtb2R1bGVOYW1lKTtcblx0XHRcdGNvbnN0IGluc3RhbmNlID0gbmV3IHBhY2thZ2VCcm93c2VySW5zdGFuY2Uoe1xuXHRcdFx0XHRpc1ZlbmRvcjogdHJ1ZSxcblx0XHRcdFx0YnVuZGxlLFxuXHRcdFx0XHRsb25nTmFtZTogbW9kdWxlTmFtZSxcblx0XHRcdFx0cGFyc2VkTmFtZSxcblx0XHRcdFx0c2hvcnROYW1lOiBwYXJzZWROYW1lLm5hbWUsXG5cdFx0XHRcdHBhY2thZ2VQYXRoLFxuXHRcdFx0XHRyZWFsUGFja2FnZVBhdGg6IGZzLnJlYWxwYXRoU3luYyhwYWNrYWdlUGF0aClcblx0XHRcdH0pO1xuXHRcdFx0bW1hcFttb2R1bGVOYW1lXSA9IGluc3RhbmNlO1xuXHRcdFx0aW5mby5zaG9ydE5hbWVNYXBbcGFyc2VkTmFtZS5uYW1lXSA9IGluc3RhbmNlO1xuXHRcdFx0aWYgKGluZm8udXJsUGFja2FnZVNldClcblx0XHRcdFx0aW5mby51cmxQYWNrYWdlU2V0W21vZHVsZU5hbWVdID0gMTtcblx0XHRcdGlmIChfLmhhcyhibWFwLCBidW5kbGUpICYmIF8uaXNBcnJheShibWFwW2J1bmRsZV0pKVxuXHRcdFx0XHRibWFwW2J1bmRsZV0ucHVzaChpbnN0YW5jZSk7XG5cdFx0XHRlbHNlXG5cdFx0XHRcdGJtYXBbYnVuZGxlXSA9IFtpbnN0YW5jZV07XG5cdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRsb2cud2FybihlcnIpO1xuXHRcdFx0dGhyb3cgZXJyO1xuXHRcdH1cblx0fSk7XG59XG5cbmZ1bmN0aW9uIF9yZWFkQnVuZGxlcyhwYWNrYWdlVXRpbHM6IGFueSwgaW5mbzogQnVuZGxlSW5mbywgY29uZmlnOiBhbnksIGlzRXh0ZXJuYWwgPSBmYWxzZSkge1xuXHRjb25zdCBibWFwID0gaW5mby5idW5kbGVNYXA7XG5cdGNvbnN0IG1tYXAgPSBpbmZvLm1vZHVsZU1hcDtcblxuXHRpbnRlcmZhY2UgRWJtVHlwZTEge1xuXHRcdFVSTHM6IHN0cmluZ1tdO1xuXHRcdG1vZHVsZXM6IHN0cmluZ1tdO1xuXHR9XG5cdGludGVyZmFjZSBFYm1UeXBlMiB7XG5cdFx0anM/OiBzdHJpbmdbXTtcblx0XHRjc3M/OiBzdHJpbmdbXTtcblx0fVxuXHR0eXBlIEVibVR5cGUgPSBFYm1UeXBlMSB8IEVibVR5cGUyIHwgc3RyaW5nO1xuXG5cdGNvbnN0IG1hcENvbmZpZyA9IGNvbmZpZygpLmV4dGVybmFsQnVuZGxlTWFwIGFzIHtbazogc3RyaW5nXTogc3RyaW5nW10gfCBFYm1UeXBlfTtcblx0aWYgKGlzRXh0ZXJuYWwpXG5cdFx0aW5mby51cmxQYWNrYWdlU2V0ID0ge307XG5cdF8uZm9yT3duKG1hcENvbmZpZywgZnVuY3Rpb24oYnVuZGxlRGF0YSwgYnVuZGxlKSB7XG5cdFx0Y29uc3QgbW9kdWxlTmFtZXM6IHN0cmluZ1tdID0gXy5pc0FycmF5KChidW5kbGVEYXRhIGFzIEVibVR5cGUxKS5tb2R1bGVzKSA/XG5cdFx0XHQoYnVuZGxlRGF0YSBhcyBFYm1UeXBlMSkubW9kdWxlcyA6IGJ1bmRsZURhdGEgYXMgc3RyaW5nW107XG5cdFx0Y29uc3QgYnVuZGxlTW9kdWxlcyA9IF8ubWFwKG1vZHVsZU5hbWVzLCBmdW5jdGlvbihtb2R1bGVOYW1lKSB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRjb25zdCBwYWNrYWdlUGF0aCA9IHBhY2thZ2VVdGlscy5maW5kQnJvd3NlclBhY2thZ2VQYXRoKG1vZHVsZU5hbWUpO1xuXHRcdFx0XHRjb25zdCBpbnN0YW5jZSA9IG5ldyBwYWNrYWdlQnJvd3Nlckluc3RhbmNlKHtcblx0XHRcdFx0XHRpc1ZlbmRvcjogdHJ1ZSxcblx0XHRcdFx0XHRidW5kbGUsXG5cdFx0XHRcdFx0bG9uZ05hbWU6IG1vZHVsZU5hbWUsXG5cdFx0XHRcdFx0c2hvcnROYW1lOiBwYWNrYWdlVXRpbHMucGFyc2VOYW1lKG1vZHVsZU5hbWUpLm5hbWUsXG5cdFx0XHRcdFx0cGFja2FnZVBhdGgsXG5cdFx0XHRcdFx0cmVhbFBhY2thZ2VQYXRoOiBmcy5yZWFscGF0aFN5bmMocGFja2FnZVBhdGgpXG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRtbWFwW21vZHVsZU5hbWVdID0gaW5zdGFuY2U7XG5cdFx0XHRcdGluZm8uc2hvcnROYW1lTWFwW2luc3RhbmNlLnNob3J0TmFtZV0gPSBpbnN0YW5jZTtcblx0XHRcdFx0aWYgKGluZm8udXJsUGFja2FnZVNldClcblx0XHRcdFx0XHRpbmZvLnVybFBhY2thZ2VTZXRbbW9kdWxlTmFtZV0gPSAxO1xuXHRcdFx0XHRyZXR1cm4gaW5zdGFuY2U7XG5cdFx0XHR9IGNhdGNoIChlcnIpIHtcblx0XHRcdFx0bG9nLndhcm4oZXJyKTtcblx0XHRcdFx0dGhyb3cgZXJyO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdGlmIChpc0V4dGVybmFsKSB7XG5cdFx0XHRpZiAoXy5pc0FycmF5KGJ1bmRsZURhdGEpKVxuXHRcdFx0XHRpbmZvLmJ1bmRsZVVybE1hcFtidW5kbGVdID0gYnVuZGxlRGF0YTtcblx0XHRcdGVsc2UgaWYgKF8uaGFzKGJ1bmRsZURhdGEsICdVUkxzJykpXG5cdFx0XHRcdGluZm8uYnVuZGxlVXJsTWFwW2J1bmRsZV0gPSAoYnVuZGxlRGF0YSBhcyBFYm1UeXBlMSkuVVJMcztcblx0XHRcdGVsc2UgaWYgKF8uaXNPYmplY3QoYnVuZGxlRGF0YSkpIHtcblx0XHRcdFx0aWYgKCFfLmhhcyhidW5kbGVEYXRhLCAnanMnKSAmJiAhXy5oYXMoYnVuZGxlRGF0YSwgJ2NzcycpKVxuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcignY29uZmlnIHByb3BlcnR5IFwiZXh0ZXJuYWxCdW5kbGVNYXBcIiBtdXN0IGJlIGFycmF5IG9mIG9iamVjdCB7Y3NzOiBzdHJpbmdbXSwganM6IHN0cmluZ1tdfScpO1xuXHRcdFx0XHRpbmZvLmJ1bmRsZVVybE1hcFtidW5kbGVdID0gYnVuZGxlRGF0YSBhcyBFYm1UeXBlMjsgLy8gYnVuZGxlRGF0YS5jc3MsIGJ1bmRsZURhdGEuanNcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGluZm8uYnVuZGxlVXJsTWFwW2J1bmRsZV0gPSBbYnVuZGxlRGF0YSBhcyBzdHJpbmddO1xuXHRcdFx0fVxuXHRcdH0gZWxzZVxuXHRcdFx0Ym1hcFtidW5kbGVdID0gYnVuZGxlTW9kdWxlcztcblx0fSk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVBhY2thZ2VEaXJUcmVlKHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbykge1xuXHRjb25zdCB0cmVlID0gbmV3IERpclRyZWU8UGFja2FnZUJyb3dzZXJJbnN0YW5jZT4oKTtcblx0dmFyIGNvdW50ID0gMDtcblx0cGFja2FnZUluZm8uYWxsTW9kdWxlcy5mb3JFYWNoKG1vZHVsZUluc3RhbmNlID0+IHtcblx0XHQvLyBsb2cuaW5mbyhtb2R1bGVJbnN0YW5jZS5sb25nTmFtZSk7XG5cdFx0aWYgKG1vZHVsZUluc3RhbmNlID09IG51bGwpXG5cdFx0XHRyZXR1cm47XG5cdFx0aWYgKG1vZHVsZUluc3RhbmNlLnJlYWxQYWNrYWdlUGF0aClcblx0XHRcdHRyZWUucHV0RGF0YShtb2R1bGVJbnN0YW5jZS5yZWFsUGFja2FnZVBhdGgsIG1vZHVsZUluc3RhbmNlKTtcblx0XHRpZiAobW9kdWxlSW5zdGFuY2UucGFja2FnZVBhdGggIT09IG1vZHVsZUluc3RhbmNlLnJlYWxQYWNrYWdlUGF0aClcblx0XHRcdHRyZWUucHV0RGF0YShtb2R1bGVJbnN0YW5jZS5wYWNrYWdlUGF0aCwgbW9kdWxlSW5zdGFuY2UpO1xuXHRcdGNvdW50Kys7XG5cdH0pO1xuXHRsb2cuaW5mbygnVG90YWwgJXMgbm9kZSBwYWNrYWdlcycsIGNvdW50KTtcblx0cGFja2FnZUluZm8uZGlyVHJlZSA9IHRyZWU7XG59XG4iXX0=