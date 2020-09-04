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
    // packageUtils.findAllPackages((
    //   name: string, path: string, parsedName: {scope: string, name: string}, pkJson: any, realPath: string) => {
    //   // console.log(path, realPath)
    //   addPackageToInfo(info, name, parsedName, pkJson, path, realPath);
    // });
    for (const pk of packageUtils.packages4CurrentWorkspace()) {
        addPackageToInfo(info, pk.name, { name: pk.shortName, scope: pk.scope }, pk.json, pk.path, pk.realPath);
    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3RzL2J1aWxkLXV0aWwvdHMvbWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsMkNBQTZCO0FBQzdCLDBDQUE0QjtBQUM1QixnQ0FBZ0M7QUFDaEMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUN6Riw2REFBdUQ7QUFDdkQsMEVBQXdEO0FBYWhELGlDQWJELDBCQUFzQixDQWFDO0FBWjlCLGtFQUFvRDtBQUNwRCwwREFBa0M7QUFDbEMsbURBQW9EO0FBWXBELElBQUksV0FBd0IsQ0FBQztBQUM3Qjs7Ozs7OztHQU9HO0FBQ0gsU0FBZ0IsWUFBWTtJQUMxQixJQUFJLFdBQVc7UUFDYixPQUFPLFdBQVcsQ0FBQztJQUNyQixHQUFHLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUM7SUFDbkMsV0FBVyxHQUFHLGFBQWEsRUFBRSxDQUFDO0lBQzlCLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ2xDLE9BQU8sV0FBVyxDQUFDO0FBQ3JCLENBQUM7QUFQRCxvQ0FPQztBQUVELFNBQWdCLGNBQWM7SUFDNUIsZ0JBQU0sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDdEMsTUFBTSxXQUFXLEdBQUcsWUFBWSxFQUFFLENBQUM7SUFDbkMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3ZCLE9BQU8sV0FBVyxDQUFDO0FBQ3JCLENBQUM7QUFMRCx3Q0FLQztBQUdELFNBQWdCLFNBQVMsQ0FBQyxXQUF3QjtJQUNoRCxtQkFBbUI7SUFDbkIsV0FBVztJQUNYLCtEQUErRDtJQUMvRCxzRkFBc0Y7SUFDdEYsc0RBQXNEO0FBQ3hE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LFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUMzRCxLQUFLLEVBQUUsQ0FBQztJQUNWLENBQUMsQ0FBQyxDQUFDO0lBQ0gsR0FBRyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUMxQyxXQUFXLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztBQUM3QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbi8vIHZhciBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ2J1aWxkVXRpbC4nICsgUGF0aC5iYXNlbmFtZShfX2ZpbGVuYW1lLCAnLmpzJykpO1xuaW1wb3J0IHtEaXJUcmVlfSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvZGlyLXRyZWUnO1xuaW1wb3J0IFBhY2thZ2VCcm93c2VySW5zdGFuY2UgZnJvbSAnLi9wYWNrYWdlLWluc3RhbmNlJztcbmltcG9ydCAqIGFzIHBhY2thZ2VVdGlscyBmcm9tICcuLi8uLi9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vLi4vY29uZmlnJztcbmltcG9ydCB7Y3JlYXRlUGFja2FnZUluZm99IGZyb20gJy4uLy4uL3BhY2thZ2UtbWdyJztcblxuZXhwb3J0IGludGVyZmFjZSBCdW5kbGVJbmZvIHtcbiAgbW9kdWxlTWFwOiB7W25hbWU6IHN0cmluZ106IFBhY2thZ2VCcm93c2VySW5zdGFuY2V9O1xufVxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlSW5mbyBleHRlbmRzIEJ1bmRsZUluZm8ge1xuICBhbGxNb2R1bGVzOiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlW107XG4gIGRpclRyZWU6IERpclRyZWU8UGFja2FnZUJyb3dzZXJJbnN0YW5jZT47XG59XG5cbmV4cG9ydCB7UGFja2FnZUJyb3dzZXJJbnN0YW5jZX07XG5cbmxldCBwYWNrYWdlSW5mbzogUGFja2FnZUluZm87XG4vKipcbiAqIHdhbGtQYWNrYWdlc1xuICogQHBhcmFtIHsqfSBjb25maWcgXG4gKiBAcGFyYW0geyp9IGFyZ3YgXG4gKiBAcGFyYW0geyp9IHBhY2thZ2VVdGlscyBcbiAqIEBwYXJhbSB7Kn0gaWdub3JlQ2FjaGVcbiAqIEByZXR1cm4ge1BhY2thZ2VJbmZvfVxuICovXG5leHBvcnQgZnVuY3Rpb24gd2Fsa1BhY2thZ2VzKCkge1xuICBpZiAocGFja2FnZUluZm8pXG4gICAgcmV0dXJuIHBhY2thZ2VJbmZvO1xuICBsb2cuaW5mbygnc2NhbiBmb3IgcGFja2FnZXMgaW5mbycpO1xuICBwYWNrYWdlSW5mbyA9IF93YWxrUGFja2FnZXMoKTtcbiAgY3JlYXRlUGFja2FnZURpclRyZWUocGFja2FnZUluZm8pO1xuICByZXR1cm4gcGFja2FnZUluZm87XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaXN0QnVuZGxlSW5mbygpIHtcbiAgY29uZmlnLnNldCgnYnVuZGxlUGVyUGFja2FnZScsIGZhbHNlKTtcbiAgY29uc3QgcGFja2FnZUluZm8gPSB3YWxrUGFja2FnZXMoKTtcbiAgc2F2ZUNhY2hlKHBhY2thZ2VJbmZvKTtcbiAgcmV0dXJuIHBhY2thZ2VJbmZvO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBzYXZlQ2FjaGUocGFja2FnZUluZm86IFBhY2thZ2VJbmZvKSB7XG4gIC8vIGlmIChpc0Zyb21DYWNoZSlcbiAgLy8gXHRyZXR1cm47XG4gIC8vIG1rZGlycC5zeW5jKFBhdGguam9pbihjb25maWcoKS5yb290UGF0aCwgY29uZmlnKCkuZGVzdERpcikpO1xuICAvLyBmcy53cml0ZUZpbGVTeW5jKHBhY2thZ2VJbmZvQ2FjaGVGaWxlLCBKU09OLnN0cmluZ2lmeShjeWNsZS5kZWN5Y2xlKHBhY2thZ2VJbmZvKSkpO1xuICAvLyBsb2cuZGVidWcoJ3dyaXRlIHRvIGNhY2hlICcsIHBhY2thZ2VJbmZvQ2FjaGVGaWxlKTtcbn1cblxuZnVuY3Rpb24gX3dhbGtQYWNrYWdlcygpOiBQYWNrYWdlSW5mbyB7XG4gIC8vIGNvbnN0IG5vZGVQYXRocyA9IHByb2Nlc3MuZW52Lk5PREVfUEFUSCEuc3BsaXQoUGF0aC5kZWxpbWl0ZXIpO1xuICBjb25zdCBjb25maWdCdW5kbGVJbmZvOiBCdW5kbGVJbmZvID0ge1xuICAgIG1vZHVsZU1hcDoge31cbiAgfTtcbiAgY29uc3QgaW5mbzogUGFja2FnZUluZm8gPSB7XG4gICAgYWxsTW9kdWxlczogbnVsbCBhcyB1bmtub3duIGFzIFBhY2thZ2VCcm93c2VySW5zdGFuY2VbXSwgLy8gYXJyYXlcbiAgICBtb2R1bGVNYXA6IF8uY2xvbmUoY29uZmlnQnVuZGxlSW5mby5tb2R1bGVNYXApLFxuICAgIGRpclRyZWU6IG51bGwgYXMgdW5rbm93biBhcyBEaXJUcmVlPFBhY2thZ2VCcm93c2VySW5zdGFuY2U+XG4gIH07XG5cbiAgLy8gcGFja2FnZVV0aWxzLmZpbmRBbGxQYWNrYWdlcygoXG4gIC8vICAgbmFtZTogc3RyaW5nLCBwYXRoOiBzdHJpbmcsIHBhcnNlZE5hbWU6IHtzY29wZTogc3RyaW5nLCBuYW1lOiBzdHJpbmd9LCBwa0pzb246IGFueSwgcmVhbFBhdGg6IHN0cmluZykgPT4ge1xuICAvLyAgIC8vIGNvbnNvbGUubG9nKHBhdGgsIHJlYWxQYXRoKVxuICAvLyAgIGFkZFBhY2thZ2VUb0luZm8oaW5mbywgbmFtZSwgcGFyc2VkTmFtZSwgcGtKc29uLCBwYXRoLCByZWFsUGF0aCk7XG4gIC8vIH0pO1xuICBmb3IgKGNvbnN0IHBrIG9mIHBhY2thZ2VVdGlscy5wYWNrYWdlczRDdXJyZW50V29ya3NwYWNlKCkpIHtcbiAgICBhZGRQYWNrYWdlVG9JbmZvKGluZm8sIHBrLm5hbWUsIHtuYW1lOiBway5zaG9ydE5hbWUsIHNjb3BlOiBway5zY29wZX0sIHBrLmpzb24sIHBrLnBhdGgsIHBrLnJlYWxQYXRoKTtcbiAgfVxuICBjb25zdCBkcmNwUGtnID0gY3JlYXRlUGFja2FnZUluZm8ocGFja2FnZVV0aWxzLmZpbmRQYWNrYWdlSnNvblBhdGgoJ2RyLWNvbXAtcGFja2FnZScpISk7XG4gIGFkZFBhY2thZ2VUb0luZm8oaW5mbywgJ2RyLWNvbXAtcGFja2FnZScsXG4gICAge3Njb3BlOiBkcmNwUGtnLnNjb3BlLCBuYW1lOiBkcmNwUGtnLnNob3J0TmFtZX0sXG4gICAgcmVxdWlyZSgnZHItY29tcC1wYWNrYWdlL3BhY2thZ2UuanNvbicpLCBkcmNwUGtnLnBhdGgsIGRyY3BQa2cucmVhbFBhdGgpO1xuXG4gIGluZm8uYWxsTW9kdWxlcyA9IF8udmFsdWVzKGluZm8ubW9kdWxlTWFwKTtcblxuICByZXR1cm4gaW5mbztcbn1cblxuZnVuY3Rpb24gYWRkUGFja2FnZVRvSW5mbyhpbmZvOiBQYWNrYWdlSW5mbywgbmFtZTogc3RyaW5nLFxuICBwYXJzZWROYW1lOiB7c2NvcGU6IHN0cmluZywgbmFtZTogc3RyaW5nfSwgcGtKc29uOiBhbnksIHBhY2thZ2VQYXRoOiBzdHJpbmcsIHJlYWxQYWNrYWdlUGF0aDogc3RyaW5nKSB7XG4gIGxldCBub1BhcnNlRmlsZXMsIGluc3RhbmNlO1xuICBpZiAoXy5oYXMoaW5mby5tb2R1bGVNYXAsIG5hbWUpKSB7XG4gICAgaW5zdGFuY2UgPSBpbmZvLm1vZHVsZU1hcFtuYW1lXTtcbiAgfSBlbHNlIHtcbiAgICAvLyBUaGVyZSBhcmUgYWxzbyBub2RlIHBhY2thZ2VzXG4gICAgaW5zdGFuY2UgPSBuZXcgUGFja2FnZUJyb3dzZXJJbnN0YW5jZSh7fSk7XG4gIH1cbiAgaWYgKCFwa0pzb24uZHIpIHtcbiAgICBwa0pzb24uZHIgPSB7fTtcbiAgfVxuICBpZiAocGtKc29uLmRyLm5vUGFyc2UpIHtcbiAgICBub1BhcnNlRmlsZXMgPSBbXS5jb25jYXQocGtKc29uLmRyLm5vUGFyc2UpLm1hcCh0cmltTm9QYXJzZVNldHRpbmcpO1xuICB9XG4gIGlmIChwa0pzb24uZHIuYnJvd3NlcmlmeU5vUGFyc2UpIHtcbiAgICBub1BhcnNlRmlsZXMgPSBbXS5jb25jYXQocGtKc29uLmRyLmJyb3dzZXJpZnlOb1BhcnNlKS5tYXAodHJpbU5vUGFyc2VTZXR0aW5nKTtcbiAgfVxuICBpbnN0YW5jZS5pbml0KHtcbiAgICBsb25nTmFtZTogbmFtZSxcbiAgICByZWFsUGFja2FnZVBhdGgsXG4gICAgcGFja2FnZVBhdGgsXG4gICAgc2hvcnROYW1lOiBwYXJzZWROYW1lLm5hbWUsXG4gICAgaXNWZW5kb3I6IGZhbHNlLFxuICAgIHBhcnNlZE5hbWUsXG4gICAgYnJvd3NlcmlmeU5vUGFyc2U6IG5vUGFyc2VGaWxlcyxcbiAgICB0cmFuc2xhdGFibGU6ICFfLmhhcyhwa0pzb24sICdkci50cmFuc2xhdGFibGUnKSB8fCBfLmdldChwa0pzb24sICdkci50cmFuc2xhdGFibGUnKSxcbiAgICBkcjogcGtKc29uLmRyLFxuICAgIGpzb246IHBrSnNvbixcbiAgICBpMThuOiBwa0pzb24uZHIuaTE4biA/IHBrSnNvbi5kci5pMThuIDogbnVsbCxcbiAgICBhcHBUeXBlOiBwa0pzb24uZHIuYXBwVHlwZVxuICB9KTtcbiAgaW5mby5tb2R1bGVNYXBbaW5zdGFuY2UubG9uZ05hbWVdID0gaW5zdGFuY2U7XG59XG5cbmZ1bmN0aW9uIHRyaW1Ob1BhcnNlU2V0dGluZyhwOiBzdHJpbmcpIHtcbiAgcCA9IHAucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICBpZiAocC5zdGFydHNXaXRoKCcuLycpKSB7XG4gICAgcCA9IHAuc3Vic3RyaW5nKDIpO1xuICB9XG4gIHJldHVybiBwO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVQYWNrYWdlRGlyVHJlZShwYWNrYWdlSW5mbzogUGFja2FnZUluZm8pIHtcbiAgY29uc3QgdHJlZSA9IG5ldyBEaXJUcmVlPFBhY2thZ2VCcm93c2VySW5zdGFuY2U+KCk7XG4gIHZhciBjb3VudCA9IDA7XG4gIHBhY2thZ2VJbmZvLmFsbE1vZHVsZXMuZm9yRWFjaChtb2R1bGVJbnN0YW5jZSA9PiB7XG4gICAgLy8gbG9nLmluZm8obW9kdWxlSW5zdGFuY2UubG9uZ05hbWUpO1xuICAgIGlmIChtb2R1bGVJbnN0YW5jZSA9PSBudWxsKVxuICAgICAgcmV0dXJuO1xuICAgIGlmIChtb2R1bGVJbnN0YW5jZS5yZWFsUGFja2FnZVBhdGgpXG4gICAgICB0cmVlLnB1dERhdGEobW9kdWxlSW5zdGFuY2UucmVhbFBhY2thZ2VQYXRoLCBtb2R1bGVJbnN0YW5jZSk7XG4gICAgaWYgKG1vZHVsZUluc3RhbmNlLnBhY2thZ2VQYXRoICE9PSBtb2R1bGVJbnN0YW5jZS5yZWFsUGFja2FnZVBhdGgpXG4gICAgICB0cmVlLnB1dERhdGEobW9kdWxlSW5zdGFuY2UucGFja2FnZVBhdGgsIG1vZHVsZUluc3RhbmNlKTtcbiAgICBjb3VudCsrO1xuICB9KTtcbiAgbG9nLmluZm8oJ1RvdGFsICVzIG5vZGUgcGFja2FnZXMnLCBjb3VudCk7XG4gIHBhY2thZ2VJbmZvLmRpclRyZWUgPSB0cmVlO1xufVxuXG4iXX0=