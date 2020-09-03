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
const _ = __importStar(require("lodash"));
// var chalk = require('chalk');
const log = require('log4js').getLogger('buildUtil.' + Path.basename(__filename, '.js'));
const dir_tree_1 = require("require-injector/dist/dir-tree");
const package_instance_1 = __importDefault(require("./package-instance"));
exports.PackageBrowserInstance = package_instance_1.default;
const packageUtils = __importStar(require("../../package-utils"));
const config_1 = __importDefault(require("../../config"));
const package_mgr_1 = require("../../package-mgr");
let packageInfo;
/**
 * walkPackages
 * @param {*} config
 * @param {*} argv
 * @param {*} packageUtils
 * @param {*} ignoreCache
 * @return {PackageInfo}
 */
function walkPackages() {
    if (packageInfo)
        return packageInfo;
    log.info('scan for packages info');
    packageInfo = _walkPackages();
    createPackageDirTree(packageInfo);
    return packageInfo;
}
exports.walkPackages = walkPackages;
function listBundleInfo() {
    config_1.default.set('bundlePerPackage', false);
    const packageInfo = walkPackages();
    saveCache(packageInfo);
    return packageInfo;
}
exports.listBundleInfo = listBundleInfo;
function saveCache(packageInfo) {
    // if (isFromCache)
    // 	return;
    // mkdirp.sync(Path.join(config().rootPath, config().destDir));
    // fs.writeFileSync(packageInfoCacheFile, JSON.stringify(cycle.decycle(packageInfo)));
    // log.debug('write to cache ', packageInfoCacheFile);
}
exports.saveCache = saveCache;
function _walkPackages() {
    // const nodePaths = process.env.NODE_PATH!.split(Path.delimiter);
    const configBundleInfo = {
        moduleMap: {}
    };
    const info = {
        allModules: null,
        moduleMap: _.clone(configBundleInfo.moduleMap),
        dirTree: null
    };
    packageUtils.findAllPackages((name, path, parsedName, pkJson, realPath) => {
        // console.log(path, realPath)
        addPackageToInfo(info, name, parsedName, pkJson, path, realPath);
    });
    const drcpPkg = package_mgr_1.createPackageInfo(packageUtils.findPackageJsonPath('dr-comp-package'));
    addPackageToInfo(info, 'dr-comp-package', { scope: drcpPkg.scope, name: drcpPkg.shortName }, require('dr-comp-package/package.json'), drcpPkg.path, drcpPkg.realPath);
    info.allModules = _.values(info.moduleMap);
    return info;
}
function addPackageToInfo(info, name, parsedName, pkJson, packagePath, realPackagePath) {
    let noParseFiles, instance;
    if (_.has(info.moduleMap, name)) {
        instance = info.moduleMap[name];
    }
    else {
        // There are also node packages
        instance = new package_instance_1.default({});
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
function trimNoParseSetting(p) {
    p = p.replace(/\\/g, '/');
    if (p.startsWith('./')) {
        p = p.substring(2);
    }
    return p;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3RzL2J1aWxkLXV0aWwvdHMvbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkNBQTZCO0FBQzdCLDBDQUE0QjtBQUM1QixnQ0FBZ0M7QUFDaEMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUN6Riw2REFBdUQ7QUFDdkQsMEVBQXdEO0FBYWhELGlDQWJELDBCQUFzQixDQWFDO0FBWjlCLGtFQUFvRDtBQUNwRCwwREFBa0M7QUFDbEMsbURBQW9EO0FBWXBELElBQUksV0FBd0IsQ0FBQztBQUM3Qjs7Ozs7OztHQU9HO0FBQ0gsU0FBZ0IsWUFBWTtJQUMxQixJQUFJLFdBQVc7UUFDYixPQUFPLFdBQVcsQ0FBQztJQUNyQixHQUFHLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUM7SUFDbkMsV0FBVyxHQUFHLGFBQWEsRUFBRSxDQUFDO0lBQzlCLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ2xDLE9BQU8sV0FBVyxDQUFDO0FBQ3JCLENBQUM7QUFQRCxvQ0FPQztBQUVELFNBQWdCLGNBQWM7SUFDNUIsZ0JBQU0sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDdEMsTUFBTSxXQUFXLEdBQUcsWUFBWSxFQUFFLENBQUM7SUFDbkMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3ZCLE9BQU8sV0FBVyxDQUFDO0FBQ3JCLENBQUM7QUFMRCx3Q0FLQztBQUdELFNBQWdCLFNBQVMsQ0FBQyxXQUF3QjtJQUNoRCxtQkFBbUI7SUFDbkIsV0FBVztJQUNYLCtEQUErRDtJQUMvRCxzRkFBc0Y7SUFDdEYsc0RBQXNEO0FBQ3hE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LEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDMUMsV0FBVyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7QUFDN0IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG4vLyB2YXIgY2hhbGsgPSByZXF1aXJlKCdjaGFsaycpO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdidWlsZFV0aWwuJyArIFBhdGguYmFzZW5hbWUoX19maWxlbmFtZSwgJy5qcycpKTtcbmltcG9ydCB7RGlyVHJlZX0gZnJvbSAncmVxdWlyZS1pbmplY3Rvci9kaXN0L2Rpci10cmVlJztcbmltcG9ydCBQYWNrYWdlQnJvd3Nlckluc3RhbmNlIGZyb20gJy4vcGFja2FnZS1pbnN0YW5jZSc7XG5pbXBvcnQgKiBhcyBwYWNrYWdlVXRpbHMgZnJvbSAnLi4vLi4vcGFja2FnZS11dGlscyc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4uLy4uL2NvbmZpZyc7XG5pbXBvcnQge2NyZWF0ZVBhY2thZ2VJbmZvfSBmcm9tICcuLi8uLi9wYWNrYWdlLW1ncic7XG5cbmV4cG9ydCBpbnRlcmZhY2UgQnVuZGxlSW5mbyB7XG4gIG1vZHVsZU1hcDoge1tuYW1lOiBzdHJpbmddOiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlfTtcbn1cbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZUluZm8gZXh0ZW5kcyBCdW5kbGVJbmZvIHtcbiAgYWxsTW9kdWxlczogUGFja2FnZUJyb3dzZXJJbnN0YW5jZVtdO1xuICBkaXJUcmVlOiBEaXJUcmVlPFBhY2thZ2VCcm93c2VySW5zdGFuY2U+O1xufVxuXG5leHBvcnQge1BhY2thZ2VCcm93c2VySW5zdGFuY2V9O1xuXG5sZXQgcGFja2FnZUluZm86IFBhY2thZ2VJbmZvO1xuLyoqXG4gKiB3YWxrUGFja2FnZXNcbiAqIEBwYXJhbSB7Kn0gY29uZmlnIFxuICogQHBhcmFtIHsqfSBhcmd2IFxuICogQHBhcmFtIHsqfSBwYWNrYWdlVXRpbHMgXG4gKiBAcGFyYW0geyp9IGlnbm9yZUNhY2hlXG4gKiBAcmV0dXJuIHtQYWNrYWdlSW5mb31cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdhbGtQYWNrYWdlcygpIHtcbiAgaWYgKHBhY2thZ2VJbmZvKVxuICAgIHJldHVybiBwYWNrYWdlSW5mbztcbiAgbG9nLmluZm8oJ3NjYW4gZm9yIHBhY2thZ2VzIGluZm8nKTtcbiAgcGFja2FnZUluZm8gPSBfd2Fsa1BhY2thZ2VzKCk7XG4gIGNyZWF0ZVBhY2thZ2VEaXJUcmVlKHBhY2thZ2VJbmZvKTtcbiAgcmV0dXJuIHBhY2thZ2VJbmZvO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbGlzdEJ1bmRsZUluZm8oKSB7XG4gIGNvbmZpZy5zZXQoJ2J1bmRsZVBlclBhY2thZ2UnLCBmYWxzZSk7XG4gIGNvbnN0IHBhY2thZ2VJbmZvID0gd2Fsa1BhY2thZ2VzKCk7XG4gIHNhdmVDYWNoZShwYWNrYWdlSW5mbyk7XG4gIHJldHVybiBwYWNrYWdlSW5mbztcbn1cblxuXG5leHBvcnQgZnVuY3Rpb24gc2F2ZUNhY2hlKHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbykge1xuICAvLyBpZiAoaXNGcm9tQ2FjaGUpXG4gIC8vIFx0cmV0dXJuO1xuICAvLyBta2RpcnAuc3luYyhQYXRoLmpvaW4oY29uZmlnKCkucm9vdFBhdGgsIGNvbmZpZygpLmRlc3REaXIpKTtcbiAgLy8gZnMud3JpdGVGaWxlU3luYyhwYWNrYWdlSW5mb0NhY2hlRmlsZSwgSlNPTi5zdHJpbmdpZnkoY3ljbGUuZGVjeWNsZShwYWNrYWdlSW5mbykpKTtcbiAgLy8gbG9nLmRlYnVnKCd3cml0ZSB0byBjYWNoZSAnLCBwYWNrYWdlSW5mb0NhY2hlRmlsZSk7XG59XG5cbmZ1bmN0aW9uIF93YWxrUGFja2FnZXMoKTogUGFja2FnZUluZm8ge1xuICAvLyBjb25zdCBub2RlUGF0aHMgPSBwcm9jZXNzLmVudi5OT0RFX1BBVEghLnNwbGl0KFBhdGguZGVsaW1pdGVyKTtcbiAgY29uc3QgY29uZmlnQnVuZGxlSW5mbzogQnVuZGxlSW5mbyA9IHtcbiAgICBtb2R1bGVNYXA6IHt9XG4gIH07XG4gIGNvbnN0IGluZm86IFBhY2thZ2VJbmZvID0ge1xuICAgIGFsbE1vZHVsZXM6IG51bGwgYXMgdW5rbm93biBhcyBQYWNrYWdlQnJvd3Nlckluc3RhbmNlW10sIC8vIGFycmF5XG4gICAgbW9kdWxlTWFwOiBfLmNsb25lKGNvbmZpZ0J1bmRsZUluZm8ubW9kdWxlTWFwKSxcbiAgICBkaXJUcmVlOiBudWxsIGFzIHVua25vd24gYXMgRGlyVHJlZTxQYWNrYWdlQnJvd3Nlckluc3RhbmNlPlxuICB9O1xuXG4gIHBhY2thZ2VVdGlscy5maW5kQWxsUGFja2FnZXMoKFxuICAgIG5hbWU6IHN0cmluZywgcGF0aDogc3RyaW5nLCBwYXJzZWROYW1lOiB7c2NvcGU6IHN0cmluZywgbmFtZTogc3RyaW5nfSwgcGtKc29uOiBhbnksIHJlYWxQYXRoOiBzdHJpbmcpID0+IHtcbiAgICAvLyBjb25zb2xlLmxvZyhwYXRoLCByZWFsUGF0aClcbiAgICBhZGRQYWNrYWdlVG9JbmZvKGluZm8sIG5hbWUsIHBhcnNlZE5hbWUsIHBrSnNvbiwgcGF0aCwgcmVhbFBhdGgpO1xuICB9KTtcbiAgY29uc3QgZHJjcFBrZyA9IGNyZWF0ZVBhY2thZ2VJbmZvKHBhY2thZ2VVdGlscy5maW5kUGFja2FnZUpzb25QYXRoKCdkci1jb21wLXBhY2thZ2UnKSEpO1xuICBhZGRQYWNrYWdlVG9JbmZvKGluZm8sICdkci1jb21wLXBhY2thZ2UnLFxuICAgIHtzY29wZTogZHJjcFBrZy5zY29wZSwgbmFtZTogZHJjcFBrZy5zaG9ydE5hbWV9LFxuICAgIHJlcXVpcmUoJ2RyLWNvbXAtcGFja2FnZS9wYWNrYWdlLmpzb24nKSwgZHJjcFBrZy5wYXRoLCBkcmNwUGtnLnJlYWxQYXRoKTtcblxuICBpbmZvLmFsbE1vZHVsZXMgPSBfLnZhbHVlcyhpbmZvLm1vZHVsZU1hcCk7XG5cbiAgcmV0dXJuIGluZm87XG59XG5cbmZ1bmN0aW9uIGFkZFBhY2thZ2VUb0luZm8oaW5mbzogUGFja2FnZUluZm8sIG5hbWU6IHN0cmluZyxcbiAgcGFyc2VkTmFtZToge3Njb3BlOiBzdHJpbmcsIG5hbWU6IHN0cmluZ30sIHBrSnNvbjogYW55LCBwYWNrYWdlUGF0aDogc3RyaW5nLCByZWFsUGFja2FnZVBhdGg6IHN0cmluZykge1xuICBsZXQgbm9QYXJzZUZpbGVzLCBpbnN0YW5jZTtcbiAgaWYgKF8uaGFzKGluZm8ubW9kdWxlTWFwLCBuYW1lKSkge1xuICAgIGluc3RhbmNlID0gaW5mby5tb2R1bGVNYXBbbmFtZV07XG4gIH0gZWxzZSB7XG4gICAgLy8gVGhlcmUgYXJlIGFsc28gbm9kZSBwYWNrYWdlc1xuICAgIGluc3RhbmNlID0gbmV3IFBhY2thZ2VCcm93c2VySW5zdGFuY2Uoe30pO1xuICB9XG4gIGlmICghcGtKc29uLmRyKSB7XG4gICAgcGtKc29uLmRyID0ge307XG4gIH1cbiAgaWYgKHBrSnNvbi5kci5ub1BhcnNlKSB7XG4gICAgbm9QYXJzZUZpbGVzID0gW10uY29uY2F0KHBrSnNvbi5kci5ub1BhcnNlKS5tYXAodHJpbU5vUGFyc2VTZXR0aW5nKTtcbiAgfVxuICBpZiAocGtKc29uLmRyLmJyb3dzZXJpZnlOb1BhcnNlKSB7XG4gICAgbm9QYXJzZUZpbGVzID0gW10uY29uY2F0KHBrSnNvbi5kci5icm93c2VyaWZ5Tm9QYXJzZSkubWFwKHRyaW1Ob1BhcnNlU2V0dGluZyk7XG4gIH1cbiAgaW5zdGFuY2UuaW5pdCh7XG4gICAgbG9uZ05hbWU6IG5hbWUsXG4gICAgcmVhbFBhY2thZ2VQYXRoLFxuICAgIHBhY2thZ2VQYXRoLFxuICAgIHNob3J0TmFtZTogcGFyc2VkTmFtZS5uYW1lLFxuICAgIGlzVmVuZG9yOiBmYWxzZSxcbiAgICBwYXJzZWROYW1lLFxuICAgIGJyb3dzZXJpZnlOb1BhcnNlOiBub1BhcnNlRmlsZXMsXG4gICAgdHJhbnNsYXRhYmxlOiAhXy5oYXMocGtKc29uLCAnZHIudHJhbnNsYXRhYmxlJykgfHwgXy5nZXQocGtKc29uLCAnZHIudHJhbnNsYXRhYmxlJyksXG4gICAgZHI6IHBrSnNvbi5kcixcbiAgICBqc29uOiBwa0pzb24sXG4gICAgaTE4bjogcGtKc29uLmRyLmkxOG4gPyBwa0pzb24uZHIuaTE4biA6IG51bGwsXG4gICAgYXBwVHlwZTogcGtKc29uLmRyLmFwcFR5cGVcbiAgfSk7XG4gIGluZm8ubW9kdWxlTWFwW2luc3RhbmNlLmxvbmdOYW1lXSA9IGluc3RhbmNlO1xufVxuXG5mdW5jdGlvbiB0cmltTm9QYXJzZVNldHRpbmcocDogc3RyaW5nKSB7XG4gIHAgPSBwLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgaWYgKHAuc3RhcnRzV2l0aCgnLi8nKSkge1xuICAgIHAgPSBwLnN1YnN0cmluZygyKTtcbiAgfVxuICByZXR1cm4gcDtcbn1cblxuZnVuY3Rpb24gY3JlYXRlUGFja2FnZURpclRyZWUocGFja2FnZUluZm86IFBhY2thZ2VJbmZvKSB7XG4gIGNvbnN0IHRyZWUgPSBuZXcgRGlyVHJlZTxQYWNrYWdlQnJvd3Nlckluc3RhbmNlPigpO1xuICB2YXIgY291bnQgPSAwO1xuICBwYWNrYWdlSW5mby5hbGxNb2R1bGVzLmZvckVhY2gobW9kdWxlSW5zdGFuY2UgPT4ge1xuICAgIC8vIGxvZy5pbmZvKG1vZHVsZUluc3RhbmNlLmxvbmdOYW1lKTtcbiAgICBpZiAobW9kdWxlSW5zdGFuY2UgPT0gbnVsbClcbiAgICAgIHJldHVybjtcbiAgICBpZiAobW9kdWxlSW5zdGFuY2UucmVhbFBhY2thZ2VQYXRoKVxuICAgICAgdHJlZS5wdXREYXRhKG1vZHVsZUluc3RhbmNlLnJlYWxQYWNrYWdlUGF0aCwgbW9kdWxlSW5zdGFuY2UpO1xuICAgIGlmIChtb2R1bGVJbnN0YW5jZS5wYWNrYWdlUGF0aCAhPT0gbW9kdWxlSW5zdGFuY2UucmVhbFBhY2thZ2VQYXRoKVxuICAgICAgdHJlZS5wdXREYXRhKG1vZHVsZUluc3RhbmNlLnBhY2thZ2VQYXRoLCBtb2R1bGVJbnN0YW5jZSk7XG4gICAgY291bnQrKztcbiAgfSk7XG4gIGxvZy5pbmZvKCdUb3RhbCAlcyBub2RlIHBhY2thZ2VzJywgY291bnQpO1xuICBwYWNrYWdlSW5mby5kaXJUcmVlID0gdHJlZTtcbn1cblxuIl19