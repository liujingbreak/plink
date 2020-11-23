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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
const packageUtils = __importStar(require("../package-utils"));
const config_1 = __importDefault(require("../config"));
const index_1 = require("./index");
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
    // packageUtils.findAllPackages((
    //   name: string, path: string, parsedName: {scope: string, name: string}, pkJson: any, realPath: string) => {
    //   // console.log(path, realPath)
    //   addPackageToInfo(info, name, parsedName, pkJson, path, realPath);
    // });
    for (const pk of packageUtils.packages4Workspace()) {
        addPackageToInfo(info, pk.name, { name: pk.shortName, scope: pk.scope }, pk.json, pk.path, pk.realPath);
    }
    const drcpPkg = index_1.createPackageInfo(packageUtils.findPackageJsonPath('@wfh/plink'));
    addPackageToInfo(info, '@wfh/plink', { scope: drcpPkg.scope, name: drcpPkg.shortName }, require('@wfh/plink/package.json'), drcpPkg.path, drcpPkg.realPath);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1pbmZvLWdhdGhlcmluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL3BhY2thZ2UtaW5mby1nYXRoZXJpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3QiwwQ0FBNEI7QUFDNUIsZ0NBQWdDO0FBQ2hDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDekYsNkRBQXVEO0FBQ3ZELDBFQUF3RDtBQWFoRCxpQ0FiRCwwQkFBc0IsQ0FhQztBQVo5QiwrREFBaUQ7QUFDakQsdURBQStCO0FBQy9CLG1DQUEwQztBQVkxQyxJQUFJLFdBQXdCLENBQUM7QUFDN0I7Ozs7Ozs7R0FPRztBQUNILFNBQWdCLFlBQVk7SUFDMUIsSUFBSSxXQUFXO1FBQ2IsT0FBTyxXQUFXLENBQUM7SUFDckIsR0FBRyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO0lBQ25DLFdBQVcsR0FBRyxhQUFhLEVBQUUsQ0FBQztJQUM5QixvQkFBb0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNsQyxPQUFPLFdBQVcsQ0FBQztBQUNyQixDQUFDO0FBUEQsb0NBT0M7QUFFRCxTQUFnQixjQUFjO0lBQzVCLGdCQUFNLENBQUMsR0FBRyxDQUFDLGtCQUFrQixFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQ3RDLE1BQU0sV0FBVyxHQUFHLFlBQVksRUFBRSxDQUFDO0lBQ25DLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUN2QixPQUFPLFdBQVcsQ0FBQztBQUNyQixDQUFDO0FBTEQsd0NBS0M7QUFHRCxTQUFnQixTQUFTLENBQUMsV0FBd0I7SUFDaEQsbUJBQW1CO0lBQ25CLFdBQVc7SUFDWCwrREFBK0Q7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QUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUMzRCxLQUFLLEVBQUUsQ0FBQztJQUNWLENBQUMsQ0FBQyxDQUFDO0lBQ0gsR0FBRyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUMxQyxXQUFXLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztBQUM3QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbi8vIHZhciBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ2J1aWxkVXRpbC4nICsgUGF0aC5iYXNlbmFtZShfX2ZpbGVuYW1lLCAnLmpzJykpO1xuaW1wb3J0IHtEaXJUcmVlfSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvZGlyLXRyZWUnO1xuaW1wb3J0IFBhY2thZ2VCcm93c2VySW5zdGFuY2UgZnJvbSAnLi9wYWNrYWdlLWluc3RhbmNlJztcbmltcG9ydCAqIGFzIHBhY2thZ2VVdGlscyBmcm9tICcuLi9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCB7Y3JlYXRlUGFja2FnZUluZm99IGZyb20gJy4vaW5kZXgnO1xuXG5leHBvcnQgaW50ZXJmYWNlIEJ1bmRsZUluZm8ge1xuICBtb2R1bGVNYXA6IHtbbmFtZTogc3RyaW5nXTogUGFja2FnZUJyb3dzZXJJbnN0YW5jZX07XG59XG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VJbmZvIGV4dGVuZHMgQnVuZGxlSW5mbyB7XG4gIGFsbE1vZHVsZXM6IFBhY2thZ2VCcm93c2VySW5zdGFuY2VbXTtcbiAgZGlyVHJlZTogRGlyVHJlZTxQYWNrYWdlQnJvd3Nlckluc3RhbmNlPjtcbn1cblxuZXhwb3J0IHtQYWNrYWdlQnJvd3Nlckluc3RhbmNlfTtcblxubGV0IHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbztcbi8qKlxuICogd2Fsa1BhY2thZ2VzXG4gKiBAcGFyYW0geyp9IGNvbmZpZyBcbiAqIEBwYXJhbSB7Kn0gYXJndiBcbiAqIEBwYXJhbSB7Kn0gcGFja2FnZVV0aWxzIFxuICogQHBhcmFtIHsqfSBpZ25vcmVDYWNoZVxuICogQHJldHVybiB7UGFja2FnZUluZm99XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3YWxrUGFja2FnZXMoKSB7XG4gIGlmIChwYWNrYWdlSW5mbylcbiAgICByZXR1cm4gcGFja2FnZUluZm87XG4gIGxvZy5pbmZvKCdzY2FuIGZvciBwYWNrYWdlcyBpbmZvJyk7XG4gIHBhY2thZ2VJbmZvID0gX3dhbGtQYWNrYWdlcygpO1xuICBjcmVhdGVQYWNrYWdlRGlyVHJlZShwYWNrYWdlSW5mbyk7XG4gIHJldHVybiBwYWNrYWdlSW5mbztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGxpc3RCdW5kbGVJbmZvKCkge1xuICBjb25maWcuc2V0KCdidW5kbGVQZXJQYWNrYWdlJywgZmFsc2UpO1xuICBjb25zdCBwYWNrYWdlSW5mbyA9IHdhbGtQYWNrYWdlcygpO1xuICBzYXZlQ2FjaGUocGFja2FnZUluZm8pO1xuICByZXR1cm4gcGFja2FnZUluZm87XG59XG5cblxuZXhwb3J0IGZ1bmN0aW9uIHNhdmVDYWNoZShwYWNrYWdlSW5mbzogUGFja2FnZUluZm8pIHtcbiAgLy8gaWYgKGlzRnJvbUNhY2hlKVxuICAvLyBcdHJldHVybjtcbiAgLy8gbWtkaXJwLnN5bmMoUGF0aC5qb2luKGNvbmZpZygpLnJvb3RQYXRoLCBjb25maWcoKS5kZXN0RGlyKSk7XG4gIC8vIGZzLndyaXRlRmlsZVN5bmMocGFja2FnZUluZm9DYWNoZUZpbGUsIEpTT04uc3RyaW5naWZ5KGN5Y2xlLmRlY3ljbGUocGFja2FnZUluZm8pKSk7XG4gIC8vIGxvZy5kZWJ1Zygnd3JpdGUgdG8gY2FjaGUgJywgcGFja2FnZUluZm9DYWNoZUZpbGUpO1xufVxuXG5mdW5jdGlvbiBfd2Fsa1BhY2thZ2VzKCk6IFBhY2thZ2VJbmZvIHtcbiAgLy8gY29uc3Qgbm9kZVBhdGhzID0gcHJvY2Vzcy5lbnYuTk9ERV9QQVRIIS5zcGxpdChQYXRoLmRlbGltaXRlcik7XG4gIGNvbnN0IGNvbmZpZ0J1bmRsZUluZm86IEJ1bmRsZUluZm8gPSB7XG4gICAgbW9kdWxlTWFwOiB7fVxuICB9O1xuICBjb25zdCBpbmZvOiBQYWNrYWdlSW5mbyA9IHtcbiAgICBhbGxNb2R1bGVzOiBudWxsIGFzIHVua25vd24gYXMgUGFja2FnZUJyb3dzZXJJbnN0YW5jZVtdLCAvLyBhcnJheVxuICAgIG1vZHVsZU1hcDogXy5jbG9uZShjb25maWdCdW5kbGVJbmZvLm1vZHVsZU1hcCksXG4gICAgZGlyVHJlZTogbnVsbCBhcyB1bmtub3duIGFzIERpclRyZWU8UGFja2FnZUJyb3dzZXJJbnN0YW5jZT5cbiAgfTtcblxuICAvLyBwYWNrYWdlVXRpbHMuZmluZEFsbFBhY2thZ2VzKChcbiAgLy8gICBuYW1lOiBzdHJpbmcsIHBhdGg6IHN0cmluZywgcGFyc2VkTmFtZToge3Njb3BlOiBzdHJpbmcsIG5hbWU6IHN0cmluZ30sIHBrSnNvbjogYW55LCByZWFsUGF0aDogc3RyaW5nKSA9PiB7XG4gIC8vICAgLy8gY29uc29sZS5sb2cocGF0aCwgcmVhbFBhdGgpXG4gIC8vICAgYWRkUGFja2FnZVRvSW5mbyhpbmZvLCBuYW1lLCBwYXJzZWROYW1lLCBwa0pzb24sIHBhdGgsIHJlYWxQYXRoKTtcbiAgLy8gfSk7XG4gIGZvciAoY29uc3QgcGsgb2YgcGFja2FnZVV0aWxzLnBhY2thZ2VzNFdvcmtzcGFjZSgpKSB7XG4gICAgYWRkUGFja2FnZVRvSW5mbyhpbmZvLCBway5uYW1lLCB7bmFtZTogcGsuc2hvcnROYW1lLCBzY29wZTogcGsuc2NvcGV9LCBway5qc29uLCBway5wYXRoLCBway5yZWFsUGF0aCk7XG4gIH1cbiAgY29uc3QgZHJjcFBrZyA9IGNyZWF0ZVBhY2thZ2VJbmZvKHBhY2thZ2VVdGlscy5maW5kUGFja2FnZUpzb25QYXRoKCdAd2ZoL3BsaW5rJykhKTtcbiAgYWRkUGFja2FnZVRvSW5mbyhpbmZvLCAnQHdmaC9wbGluaycsXG4gICAge3Njb3BlOiBkcmNwUGtnLnNjb3BlLCBuYW1lOiBkcmNwUGtnLnNob3J0TmFtZX0sXG4gICAgcmVxdWlyZSgnQHdmaC9wbGluay9wYWNrYWdlLmpzb24nKSwgZHJjcFBrZy5wYXRoLCBkcmNwUGtnLnJlYWxQYXRoKTtcblxuICBpbmZvLmFsbE1vZHVsZXMgPSBfLnZhbHVlcyhpbmZvLm1vZHVsZU1hcCk7XG5cbiAgcmV0dXJuIGluZm87XG59XG5cbmZ1bmN0aW9uIGFkZFBhY2thZ2VUb0luZm8oaW5mbzogUGFja2FnZUluZm8sIG5hbWU6IHN0cmluZyxcbiAgcGFyc2VkTmFtZToge3Njb3BlOiBzdHJpbmcsIG5hbWU6IHN0cmluZ30sIHBrSnNvbjogYW55LCBwYWNrYWdlUGF0aDogc3RyaW5nLCByZWFsUGFja2FnZVBhdGg6IHN0cmluZykge1xuICBsZXQgbm9QYXJzZUZpbGVzLCBpbnN0YW5jZTtcbiAgaWYgKF8uaGFzKGluZm8ubW9kdWxlTWFwLCBuYW1lKSkge1xuICAgIGluc3RhbmNlID0gaW5mby5tb2R1bGVNYXBbbmFtZV07XG4gIH0gZWxzZSB7XG4gICAgLy8gVGhlcmUgYXJlIGFsc28gbm9kZSBwYWNrYWdlc1xuICAgIGluc3RhbmNlID0gbmV3IFBhY2thZ2VCcm93c2VySW5zdGFuY2Uoe30pO1xuICB9XG4gIGlmICghcGtKc29uLmRyKSB7XG4gICAgcGtKc29uLmRyID0ge307XG4gIH1cbiAgaWYgKHBrSnNvbi5kci5ub1BhcnNlKSB7XG4gICAgbm9QYXJzZUZpbGVzID0gW10uY29uY2F0KHBrSnNvbi5kci5ub1BhcnNlKS5tYXAodHJpbU5vUGFyc2VTZXR0aW5nKTtcbiAgfVxuICBpZiAocGtKc29uLmRyLmJyb3dzZXJpZnlOb1BhcnNlKSB7XG4gICAgbm9QYXJzZUZpbGVzID0gW10uY29uY2F0KHBrSnNvbi5kci5icm93c2VyaWZ5Tm9QYXJzZSkubWFwKHRyaW1Ob1BhcnNlU2V0dGluZyk7XG4gIH1cbiAgaW5zdGFuY2UuaW5pdCh7XG4gICAgbG9uZ05hbWU6IG5hbWUsXG4gICAgcmVhbFBhY2thZ2VQYXRoLFxuICAgIHBhY2thZ2VQYXRoLFxuICAgIHNob3J0TmFtZTogcGFyc2VkTmFtZS5uYW1lLFxuICAgIGlzVmVuZG9yOiBmYWxzZSxcbiAgICBwYXJzZWROYW1lLFxuICAgIGJyb3dzZXJpZnlOb1BhcnNlOiBub1BhcnNlRmlsZXMsXG4gICAgdHJhbnNsYXRhYmxlOiAhXy5oYXMocGtKc29uLCAnZHIudHJhbnNsYXRhYmxlJykgfHwgXy5nZXQocGtKc29uLCAnZHIudHJhbnNsYXRhYmxlJyksXG4gICAgZHI6IHBrSnNvbi5kcixcbiAgICBqc29uOiBwa0pzb24sXG4gICAgaTE4bjogcGtKc29uLmRyLmkxOG4gPyBwa0pzb24uZHIuaTE4biA6IG51bGwsXG4gICAgYXBwVHlwZTogcGtKc29uLmRyLmFwcFR5cGVcbiAgfSk7XG4gIGluZm8ubW9kdWxlTWFwW2luc3RhbmNlLmxvbmdOYW1lXSA9IGluc3RhbmNlO1xufVxuXG5mdW5jdGlvbiB0cmltTm9QYXJzZVNldHRpbmcocDogc3RyaW5nKSB7XG4gIHAgPSBwLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgaWYgKHAuc3RhcnRzV2l0aCgnLi8nKSkge1xuICAgIHAgPSBwLnN1YnN0cmluZygyKTtcbiAgfVxuICByZXR1cm4gcDtcbn1cblxuZnVuY3Rpb24gY3JlYXRlUGFja2FnZURpclRyZWUocGFja2FnZUluZm86IFBhY2thZ2VJbmZvKSB7XG4gIGNvbnN0IHRyZWUgPSBuZXcgRGlyVHJlZTxQYWNrYWdlQnJvd3Nlckluc3RhbmNlPigpO1xuICB2YXIgY291bnQgPSAwO1xuICBwYWNrYWdlSW5mby5hbGxNb2R1bGVzLmZvckVhY2gobW9kdWxlSW5zdGFuY2UgPT4ge1xuICAgIC8vIGxvZy5pbmZvKG1vZHVsZUluc3RhbmNlLmxvbmdOYW1lKTtcbiAgICBpZiAobW9kdWxlSW5zdGFuY2UgPT0gbnVsbClcbiAgICAgIHJldHVybjtcbiAgICBpZiAobW9kdWxlSW5zdGFuY2UucmVhbFBhY2thZ2VQYXRoKVxuICAgICAgdHJlZS5wdXREYXRhKG1vZHVsZUluc3RhbmNlLnJlYWxQYWNrYWdlUGF0aCwgbW9kdWxlSW5zdGFuY2UpO1xuICAgIGlmIChtb2R1bGVJbnN0YW5jZS5wYWNrYWdlUGF0aCAhPT0gbW9kdWxlSW5zdGFuY2UucmVhbFBhY2thZ2VQYXRoKVxuICAgICAgdHJlZS5wdXREYXRhKG1vZHVsZUluc3RhbmNlLnBhY2thZ2VQYXRoLCBtb2R1bGVJbnN0YW5jZSk7XG4gICAgY291bnQrKztcbiAgfSk7XG4gIGxvZy5pbmZvKCdUb3RhbCAlcyBub2RlIHBhY2thZ2VzJywgY291bnQpO1xuICBwYWNrYWdlSW5mby5kaXJUcmVlID0gdHJlZTtcbn1cblxuIl19