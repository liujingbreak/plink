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
exports.saveCache = exports.listBundleInfo = exports.walkPackages = exports.PackageInstance = void 0;
const Path = __importStar(require("path"));
const _ = __importStar(require("lodash"));
// var chalk = require('chalk');
const log = require('log4js').getLogger('buildUtil.' + Path.basename(__filename, '.js'));
const dir_tree_1 = require("require-injector/dist/dir-tree");
const packageNodeInstance_1 = __importDefault(require("../packageNodeInstance"));
exports.PackageInstance = packageNodeInstance_1.default;
const packageUtils = __importStar(require("../package-utils"));
const config_1 = __importDefault(require("../config"));
const lazy_package_factory_1 = require("./lazy-package-factory");
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
    for (const pk of packageUtils.packages4Workspace()) {
        addPackageToInfo(info, pk);
    }
    // if (getState().linkedDrcp) {
    //   addPackageToInfo(info, getState().linkedDrcp!);
    // }
    info.allModules = _.values(info.moduleMap);
    return info;
}
function addPackageToInfo(info, pkg) {
    let instance;
    if (_.has(info.moduleMap, pkg.name)) {
        instance = info.moduleMap[pkg.name];
    }
    else {
        const parsed = lazy_package_factory_1.parseName(pkg.name);
        // There are also node packages
        instance = new packageNodeInstance_1.default({
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
function createPackageDirTree(packageInfo) {
    const tree = new dir_tree_1.DirTree();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1pbmZvLWdhdGhlcmluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL3BhY2thZ2UtaW5mby1nYXRoZXJpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3QiwwQ0FBNEI7QUFDNUIsZ0NBQWdDO0FBQ2hDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDekYsNkRBQXVEO0FBQ3ZELGlGQUFxRDtBQWE3QywwQkFiRCw2QkFBZSxDQWFDO0FBWnZCLCtEQUFpRDtBQUNqRCx1REFBK0I7QUFFL0IsaUVBQWlEO0FBV2pELElBQUksV0FBd0IsQ0FBQztBQUM3Qjs7Ozs7OztHQU9HO0FBQ0gsU0FBZ0IsWUFBWTtJQUMxQixJQUFJLFdBQVc7UUFDYixPQUFPLFdBQVcsQ0FBQztJQUNyQixHQUFHLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUM7SUFDbkMsV0FBVyxHQUFHLGFBQWEsRUFBRSxDQUFDO0lBQzlCLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ2xDLE9BQU8sV0FBVyxDQUFDO0FBQ3JCLENBQUM7QUFQRCxvQ0FPQztBQUVELFNBQWdCLGNBQWM7SUFDNUIsZ0JBQU0sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDdEMsTUFBTSxXQUFXLEdBQUcsWUFBWSxFQUFFLENBQUM7SUFDbkMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ3ZCLE9BQU8sV0FBVyxDQUFDO0FBQ3JCLENBQUM7QUFMRCx3Q0FLQztBQUdELFNBQWdCLFNBQVMsQ0FBQyxXQUF3QjtJQUNoRCxtQkFBbUI7SUFDbkIsV0FBVztJQUNYLCtEQUErRDtJ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bmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbi8vIHZhciBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ2J1aWxkVXRpbC4nICsgUGF0aC5iYXNlbmFtZShfX2ZpbGVuYW1lLCAnLmpzJykpO1xuaW1wb3J0IHtEaXJUcmVlfSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvZGlyLXRyZWUnO1xuaW1wb3J0IFBhY2thZ2VJbnN0YW5jZSBmcm9tICcuLi9wYWNrYWdlTm9kZUluc3RhbmNlJztcbmltcG9ydCAqIGFzIHBhY2thZ2VVdGlscyBmcm9tICcuLi9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbmltcG9ydCB7UGFja2FnZUluZm8gYXMgUGFja2FnZVN0YXRlfSBmcm9tICcuL2luZGV4JztcbmltcG9ydCB7cGFyc2VOYW1lfSBmcm9tICcuL2xhenktcGFja2FnZS1mYWN0b3J5JztcbmV4cG9ydCBpbnRlcmZhY2UgQnVuZGxlSW5mbyB7XG4gIG1vZHVsZU1hcDoge1tuYW1lOiBzdHJpbmddOiBQYWNrYWdlSW5zdGFuY2V9O1xufVxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlSW5mbyBleHRlbmRzIEJ1bmRsZUluZm8ge1xuICBhbGxNb2R1bGVzOiBQYWNrYWdlSW5zdGFuY2VbXTtcbiAgZGlyVHJlZTogRGlyVHJlZTxQYWNrYWdlSW5zdGFuY2U+O1xufVxuXG5leHBvcnQge1BhY2thZ2VJbnN0YW5jZX07XG5cbmxldCBwYWNrYWdlSW5mbzogUGFja2FnZUluZm87XG4vKipcbiAqIHdhbGtQYWNrYWdlc1xuICogQHBhcmFtIHsqfSBjb25maWcgXG4gKiBAcGFyYW0geyp9IGFyZ3YgXG4gKiBAcGFyYW0geyp9IHBhY2thZ2VVdGlscyBcbiAqIEBwYXJhbSB7Kn0gaWdub3JlQ2FjaGVcbiAqIEByZXR1cm4ge1BhY2thZ2VJbmZvfVxuICovXG5leHBvcnQgZnVuY3Rpb24gd2Fsa1BhY2thZ2VzKCkge1xuICBpZiAocGFja2FnZUluZm8pXG4gICAgcmV0dXJuIHBhY2thZ2VJbmZvO1xuICBsb2cuaW5mbygnc2NhbiBmb3IgcGFja2FnZXMgaW5mbycpO1xuICBwYWNrYWdlSW5mbyA9IF93YWxrUGFja2FnZXMoKTtcbiAgY3JlYXRlUGFja2FnZURpclRyZWUocGFja2FnZUluZm8pO1xuICByZXR1cm4gcGFja2FnZUluZm87XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBsaXN0QnVuZGxlSW5mbygpIHtcbiAgY29uZmlnLnNldCgnYnVuZGxlUGVyUGFja2FnZScsIGZhbHNlKTtcbiAgY29uc3QgcGFja2FnZUluZm8gPSB3YWxrUGFja2FnZXMoKTtcbiAgc2F2ZUNhY2hlKHBhY2thZ2VJbmZvKTtcbiAgcmV0dXJuIHBhY2thZ2VJbmZvO1xufVxuXG5cbmV4cG9ydCBmdW5jdGlvbiBzYXZlQ2FjaGUocGFja2FnZUluZm86IFBhY2thZ2VJbmZvKSB7XG4gIC8vIGlmIChpc0Zyb21DYWNoZSlcbiAgLy8gXHRyZXR1cm47XG4gIC8vIG1rZGlycC5zeW5jKFBhdGguam9pbihjb25maWcoKS5yb290UGF0aCwgY29uZmlnKCkuZGVzdERpcikpO1xuICAvLyBmcy53cml0ZUZpbGVTeW5jKHBhY2thZ2VJbmZvQ2FjaGVGaWxlLCBKU09OLnN0cmluZ2lmeShjeWNsZS5kZWN5Y2xlKHBhY2thZ2VJbmZvKSkpO1xuICAvLyBsb2cuZGVidWcoJ3dyaXRlIHRvIGNhY2hlICcsIHBhY2thZ2VJbmZvQ2FjaGVGaWxlKTtcbn1cblxuZnVuY3Rpb24gX3dhbGtQYWNrYWdlcygpOiBQYWNrYWdlSW5mbyB7XG4gIC8vIGNvbnN0IG5vZGVQYXRocyA9IHByb2Nlc3MuZW52Lk5PREVfUEFUSCEuc3BsaXQoUGF0aC5kZWxpbWl0ZXIpO1xuICBjb25zdCBjb25maWdCdW5kbGVJbmZvOiBCdW5kbGVJbmZvID0ge1xuICAgIG1vZHVsZU1hcDoge31cbiAgfTtcbiAgY29uc3QgaW5mbzogUGFja2FnZUluZm8gPSB7XG4gICAgYWxsTW9kdWxlczogbnVsbCBhcyB1bmtub3duIGFzIFBhY2thZ2VJbnN0YW5jZVtdLCAvLyBhcnJheVxuICAgIG1vZHVsZU1hcDogXy5jbG9uZShjb25maWdCdW5kbGVJbmZvLm1vZHVsZU1hcCksXG4gICAgZGlyVHJlZTogbnVsbCBhcyB1bmtub3duIGFzIERpclRyZWU8UGFja2FnZUluc3RhbmNlPlxuICB9O1xuXG4gIGZvciAoY29uc3QgcGsgb2YgcGFja2FnZVV0aWxzLnBhY2thZ2VzNFdvcmtzcGFjZSgpKSB7XG4gICAgYWRkUGFja2FnZVRvSW5mbyhpbmZvLCBwayk7XG4gIH1cbiAgLy8gaWYgKGdldFN0YXRlKCkubGlua2VkRHJjcCkge1xuICAvLyAgIGFkZFBhY2thZ2VUb0luZm8oaW5mbywgZ2V0U3RhdGUoKS5saW5rZWREcmNwISk7XG4gIC8vIH1cblxuICBpbmZvLmFsbE1vZHVsZXMgPSBfLnZhbHVlcyhpbmZvLm1vZHVsZU1hcCk7XG5cbiAgcmV0dXJuIGluZm87XG59XG5cbmZ1bmN0aW9uIGFkZFBhY2thZ2VUb0luZm8oaW5mbzogUGFja2FnZUluZm8sIHBrZzogUGFja2FnZVN0YXRlKSB7XG4gIGxldCBpbnN0YW5jZTtcbiAgaWYgKF8uaGFzKGluZm8ubW9kdWxlTWFwLCBwa2cubmFtZSkpIHtcbiAgICBpbnN0YW5jZSA9IGluZm8ubW9kdWxlTWFwW3BrZy5uYW1lXTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBwYXJzZWQgPSBwYXJzZU5hbWUocGtnLm5hbWUpO1xuICAgIC8vIFRoZXJlIGFyZSBhbHNvIG5vZGUgcGFja2FnZXNcbiAgICBpbnN0YW5jZSA9IG5ldyBQYWNrYWdlSW5zdGFuY2Uoe1xuICAgICAgbW9kdWxlTmFtZTogcGtnLm5hbWUsXG4gICAgICBzaG9ydE5hbWU6IHBhcnNlZC5uYW1lLFxuICAgICAgbmFtZTogcGtnLm5hbWUsXG4gICAgICBsb25nTmFtZTogcGtnLm5hbWUsXG4gICAgICBzY29wZTogcGtnLnNjb3BlLFxuICAgICAgcGF0aDogcGtnLnBhdGgsXG4gICAgICBqc29uOiBwa2cuanNvbixcbiAgICAgIHJlYWxQYXRoOiBwa2cucmVhbFBhdGhcbiAgICB9KTtcbiAgfVxuICBpbmZvLm1vZHVsZU1hcFtpbnN0YW5jZS5sb25nTmFtZV0gPSBpbnN0YW5jZTtcbn1cblxuLy8gZnVuY3Rpb24gdHJpbU5vUGFyc2VTZXR0aW5nKHA6IHN0cmluZykge1xuLy8gICBwID0gcC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4vLyAgIGlmIChwLnN0YXJ0c1dpdGgoJy4vJykpIHtcbi8vICAgICBwID0gcC5zdWJzdHJpbmcoMik7XG4vLyAgIH1cbi8vICAgcmV0dXJuIHA7XG4vLyB9XG5cbmZ1bmN0aW9uIGNyZWF0ZVBhY2thZ2VEaXJUcmVlKHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbykge1xuICBjb25zdCB0cmVlID0gbmV3IERpclRyZWU8UGFja2FnZUluc3RhbmNlPigpO1xuICB2YXIgY291bnQgPSAwO1xuICBwYWNrYWdlSW5mby5hbGxNb2R1bGVzLmZvckVhY2gobW9kdWxlSW5zdGFuY2UgPT4ge1xuICAgIGlmIChtb2R1bGVJbnN0YW5jZSA9PSBudWxsKVxuICAgICAgcmV0dXJuO1xuICAgIGlmIChtb2R1bGVJbnN0YW5jZS5yZWFsUGF0aClcbiAgICAgIHRyZWUucHV0RGF0YShtb2R1bGVJbnN0YW5jZS5yZWFsUGF0aCwgbW9kdWxlSW5zdGFuY2UpO1xuICAgIGlmIChtb2R1bGVJbnN0YW5jZS5wYXRoICE9PSBtb2R1bGVJbnN0YW5jZS5yZWFsUGF0aClcbiAgICAgIHRyZWUucHV0RGF0YShtb2R1bGVJbnN0YW5jZS5wYXRoLCBtb2R1bGVJbnN0YW5jZSk7XG4gICAgY291bnQrKztcbiAgfSk7XG4gIGxvZy5pbmZvKCdUb3RhbCAlcyBub2RlIHBhY2thZ2VzJywgY291bnQpO1xuICBwYWNrYWdlSW5mby5kaXJUcmVlID0gdHJlZTtcbn1cblxuIl19