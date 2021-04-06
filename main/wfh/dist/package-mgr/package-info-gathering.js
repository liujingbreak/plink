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
exports.walkPackages = exports.packageOfFileFactory = exports.PackageInstance = void 0;
const _ = __importStar(require("lodash"));
const log4js_1 = require("log4js");
const dir_tree_1 = require("require-injector/dist/dir-tree");
const packageNodeInstance_1 = __importDefault(require("../packageNodeInstance"));
exports.PackageInstance = packageNodeInstance_1.default;
const package_list_helper_1 = require("./package-list-helper");
const lazy_package_factory_1 = require("./lazy-package-factory");
const misc_1 = require("../utils/misc");
const lru_cache_1 = __importDefault(require("lru-cache"));
const path_1 = __importDefault(require("path"));
const log = log4js_1.getLogger('plink.package-info-gathering');
const { workDir, symlinkDirName } = misc_1.plinkEnv;
let existingFileToPkgHelper;
// let packageInfo: PackageInfo;
/**
 * walkPackages
 * @param {*} config
 * @param {*} argv
 * @param {*} packageUtils
 * @param {*} ignoreCache
 * @return {PackageInfo}
 */
function packageOfFileFactory() {
    if (existingFileToPkgHelper) {
        return existingFileToPkgHelper;
    }
    const cache = new lru_cache_1.default({ max: 20, maxAge: 20000 });
    const packageInfo = walkPackages();
    function getPkgOfFile(file) {
        var found = cache.get(file);
        if (!found) {
            found = packageInfo.dirTree.getAllData(file).pop();
            if (found)
                cache.set(file, found);
        }
        return found;
    }
    const res = { packageInfo, getPkgOfFile };
    existingFileToPkgHelper = res;
    return res;
}
exports.packageOfFileFactory = packageOfFileFactory;
function walkPackages() {
    // if (packageInfo)
    //   return packageInfo;
    log.debug('scan for packages info');
    const packageInfo = {
        get allModules() {
            return Object.values(packageInfo.moduleMap);
        },
        moduleMap: {},
        dirTree: null
    };
    for (const pk of package_list_helper_1.packages4Workspace()) {
        addPackageToInfo(packageInfo.moduleMap, pk);
    }
    createPackageDirTree(packageInfo);
    return packageInfo;
}
exports.walkPackages = walkPackages;
function addPackageToInfo(moduleMap, pkg) {
    let instance;
    if (_.has(moduleMap, pkg.name)) {
        instance = moduleMap[pkg.name];
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
            path: path_1.default.resolve(workDir, pkg.path),
            json: pkg.json,
            realPath: pkg.realPath
        });
    }
    moduleMap[instance.longName] = instance;
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
    let count = 0;
    packageInfo.allModules.forEach(pkg => {
        if (pkg == null)
            return;
        if (pkg.realPath) {
            tree.putData(pkg.realPath, pkg);
        }
        // Don't trust pkg.path, it is set by command line: plink sync/init, and loaded from state file,
        // which is not up-to-dates.
        tree.putData(path_1.default.resolve(workDir, symlinkDirName, pkg.name), pkg);
        // if (pkg.path !== pkg.realPath) {
        //   tree.putData(Path.resolve(workDir, symlinkDirName, pkg.name), pkg);
        // }
        count++;
    });
    log.info('%s Plink compliant node packages found', count);
    packageInfo.dirTree = tree;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1pbmZvLWdhdGhlcmluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL3BhY2thZ2UtaW5mby1nYXRoZXJpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDBDQUE0QjtBQUM1QixtQ0FBaUM7QUFDakMsNkRBQXVEO0FBQ3ZELGlGQUFxRDtBQWdCN0MsMEJBaEJELDZCQUFlLENBZ0JDO0FBZnZCLCtEQUF5RDtBQUV6RCxpRUFBaUQ7QUFDakQsd0NBQXVDO0FBQ3ZDLDBEQUE0QjtBQUM1QixnREFBd0I7QUFFeEIsTUFBTSxHQUFHLEdBQUcsa0JBQVMsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO0FBQ3RELE1BQU0sRUFBQyxPQUFPLEVBQUUsY0FBYyxFQUFDLEdBQUcsZUFBUSxDQUFDO0FBUzNDLElBQUksdUJBR1MsQ0FBQztBQUNkLGdDQUFnQztBQUNoQzs7Ozs7OztHQU9HO0FBRUgsU0FBZ0Isb0JBQW9CO0lBQ2xDLElBQUksdUJBQXVCLEVBQUU7UUFDM0IsT0FBTyx1QkFBdUIsQ0FBQztLQUNoQztJQUNELE1BQU0sS0FBSyxHQUFHLElBQUksbUJBQUcsQ0FBMEIsRUFBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDO0lBQ3pFLE1BQU0sV0FBVyxHQUFnQixZQUFZLEVBQUUsQ0FBQztJQUVoRCxTQUFTLFlBQVksQ0FBQyxJQUFZO1FBQ2hDLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDNUIsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNWLEtBQUssR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNuRCxJQUFJLEtBQUs7Z0JBQ1AsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUs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Q1YsQ0FBQyxDQUFDLENBQUM7SUFDSCxHQUFHLENBQUMsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzFELFdBQVcsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO0FBQzdCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7RGlyVHJlZX0gZnJvbSAncmVxdWlyZS1pbmplY3Rvci9kaXN0L2Rpci10cmVlJztcbmltcG9ydCBQYWNrYWdlSW5zdGFuY2UgZnJvbSAnLi4vcGFja2FnZU5vZGVJbnN0YW5jZSc7XG5pbXBvcnQge3BhY2thZ2VzNFdvcmtzcGFjZX0gZnJvbSAnLi9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCB7UGFja2FnZUluZm8gYXMgUGFja2FnZVN0YXRlfSBmcm9tICcuL2luZGV4JztcbmltcG9ydCB7cGFyc2VOYW1lfSBmcm9tICcuL2xhenktcGFja2FnZS1mYWN0b3J5JztcbmltcG9ydCB7cGxpbmtFbnZ9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0IExSVSBmcm9tICdscnUtY2FjaGUnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5cbmNvbnN0IGxvZyA9IGdldExvZ2dlcigncGxpbmsucGFja2FnZS1pbmZvLWdhdGhlcmluZycpO1xuY29uc3Qge3dvcmtEaXIsIHN5bWxpbmtEaXJOYW1lfSA9IHBsaW5rRW52O1xuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlSW5mbyB7XG4gIGFsbE1vZHVsZXM6IFBhY2thZ2VJbnN0YW5jZVtdO1xuICBkaXJUcmVlOiBEaXJUcmVlPFBhY2thZ2VJbnN0YW5jZT47XG4gIG1vZHVsZU1hcDoge1tuYW1lOiBzdHJpbmddOiBQYWNrYWdlSW5zdGFuY2V9O1xufVxuXG5leHBvcnQge1BhY2thZ2VJbnN0YW5jZX07XG5cbmxldCBleGlzdGluZ0ZpbGVUb1BrZ0hlbHBlcjoge1xuICBwYWNrYWdlSW5mbzogUGFja2FnZUluZm87XG4gIGdldFBrZ09mRmlsZShmaWxlOiBzdHJpbmcpOiBQYWNrYWdlSW5zdGFuY2UgfCB1bmRlZmluZWQ7XG59IHwgdW5kZWZpbmVkO1xuLy8gbGV0IHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbztcbi8qKlxuICogd2Fsa1BhY2thZ2VzXG4gKiBAcGFyYW0geyp9IGNvbmZpZyBcbiAqIEBwYXJhbSB7Kn0gYXJndiBcbiAqIEBwYXJhbSB7Kn0gcGFja2FnZVV0aWxzIFxuICogQHBhcmFtIHsqfSBpZ25vcmVDYWNoZVxuICogQHJldHVybiB7UGFja2FnZUluZm99XG4gKi9cblxuZXhwb3J0IGZ1bmN0aW9uIHBhY2thZ2VPZkZpbGVGYWN0b3J5KCkge1xuICBpZiAoZXhpc3RpbmdGaWxlVG9Qa2dIZWxwZXIpIHtcbiAgICByZXR1cm4gZXhpc3RpbmdGaWxlVG9Qa2dIZWxwZXI7XG4gIH1cbiAgY29uc3QgY2FjaGUgPSBuZXcgTFJVPHN0cmluZywgUGFja2FnZUluc3RhbmNlPih7bWF4OiAyMCwgbWF4QWdlOiAyMDAwMH0pO1xuICBjb25zdCBwYWNrYWdlSW5mbzogUGFja2FnZUluZm8gPSB3YWxrUGFja2FnZXMoKTtcblxuICBmdW5jdGlvbiBnZXRQa2dPZkZpbGUoZmlsZTogc3RyaW5nKTogUGFja2FnZUluc3RhbmNlIHwgdW5kZWZpbmVkIHtcbiAgICB2YXIgZm91bmQgPSBjYWNoZS5nZXQoZmlsZSk7XG4gICAgaWYgKCFmb3VuZCkge1xuICAgICAgZm91bmQgPSBwYWNrYWdlSW5mby5kaXJUcmVlLmdldEFsbERhdGEoZmlsZSkucG9wKCk7XG4gICAgICBpZiAoZm91bmQpXG4gICAgICAgIGNhY2hlLnNldChmaWxlLCBmb3VuZCk7XG4gICAgfVxuICAgIHJldHVybiBmb3VuZDtcbiAgfVxuICBjb25zdCByZXMgPSB7cGFja2FnZUluZm8sIGdldFBrZ09mRmlsZX07XG4gIGV4aXN0aW5nRmlsZVRvUGtnSGVscGVyID0gcmVzO1xuICByZXR1cm4gcmVzO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd2Fsa1BhY2thZ2VzKCkge1xuICAvLyBpZiAocGFja2FnZUluZm8pXG4gIC8vICAgcmV0dXJuIHBhY2thZ2VJbmZvO1xuICBsb2cuZGVidWcoJ3NjYW4gZm9yIHBhY2thZ2VzIGluZm8nKTtcbiAgY29uc3QgcGFja2FnZUluZm86IFBhY2thZ2VJbmZvID0ge1xuICAgIGdldCBhbGxNb2R1bGVzKCkge1xuICAgICAgcmV0dXJuIE9iamVjdC52YWx1ZXMocGFja2FnZUluZm8ubW9kdWxlTWFwKTtcbiAgICB9LCAvLyBhcnJheVxuICAgIG1vZHVsZU1hcDoge30sXG4gICAgZGlyVHJlZTogbnVsbCBhcyB1bmtub3duIGFzIERpclRyZWU8UGFja2FnZUluc3RhbmNlPlxuICB9O1xuXG4gIGZvciAoY29uc3QgcGsgb2YgcGFja2FnZXM0V29ya3NwYWNlKCkpIHtcbiAgICBhZGRQYWNrYWdlVG9JbmZvKHBhY2thZ2VJbmZvLm1vZHVsZU1hcCwgcGspO1xuICB9XG4gIGNyZWF0ZVBhY2thZ2VEaXJUcmVlKHBhY2thZ2VJbmZvKTtcbiAgcmV0dXJuIHBhY2thZ2VJbmZvO1xufVxuXG5cbmZ1bmN0aW9uIGFkZFBhY2thZ2VUb0luZm8obW9kdWxlTWFwOiBQYWNrYWdlSW5mb1snbW9kdWxlTWFwJ10sIHBrZzogUGFja2FnZVN0YXRlKSB7XG4gIGxldCBpbnN0YW5jZTtcbiAgaWYgKF8uaGFzKG1vZHVsZU1hcCwgcGtnLm5hbWUpKSB7XG4gICAgaW5zdGFuY2UgPSBtb2R1bGVNYXBbcGtnLm5hbWVdO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IHBhcnNlZCA9IHBhcnNlTmFtZShwa2cubmFtZSk7XG4gICAgLy8gVGhlcmUgYXJlIGFsc28gbm9kZSBwYWNrYWdlc1xuICAgIGluc3RhbmNlID0gbmV3IFBhY2thZ2VJbnN0YW5jZSh7XG4gICAgICBtb2R1bGVOYW1lOiBwa2cubmFtZSxcbiAgICAgIHNob3J0TmFtZTogcGFyc2VkLm5hbWUsXG4gICAgICBuYW1lOiBwa2cubmFtZSxcbiAgICAgIGxvbmdOYW1lOiBwa2cubmFtZSxcbiAgICAgIHNjb3BlOiBwa2cuc2NvcGUsXG4gICAgICBwYXRoOiBQYXRoLnJlc29sdmUod29ya0RpciwgcGtnLnBhdGgpLFxuICAgICAganNvbjogcGtnLmpzb24sXG4gICAgICByZWFsUGF0aDogcGtnLnJlYWxQYXRoXG4gICAgfSk7XG4gIH1cbiAgbW9kdWxlTWFwW2luc3RhbmNlLmxvbmdOYW1lXSA9IGluc3RhbmNlO1xufVxuXG4vLyBmdW5jdGlvbiB0cmltTm9QYXJzZVNldHRpbmcocDogc3RyaW5nKSB7XG4vLyAgIHAgPSBwLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbi8vICAgaWYgKHAuc3RhcnRzV2l0aCgnLi8nKSkge1xuLy8gICAgIHAgPSBwLnN1YnN0cmluZygyKTtcbi8vICAgfVxuLy8gICByZXR1cm4gcDtcbi8vIH1cblxuZnVuY3Rpb24gY3JlYXRlUGFja2FnZURpclRyZWUocGFja2FnZUluZm86IFBhY2thZ2VJbmZvKSB7XG4gIGNvbnN0IHRyZWUgPSBuZXcgRGlyVHJlZTxQYWNrYWdlSW5zdGFuY2U+KCk7XG4gIGxldCBjb3VudCA9IDA7XG4gIHBhY2thZ2VJbmZvLmFsbE1vZHVsZXMuZm9yRWFjaChwa2cgPT4ge1xuICAgIGlmIChwa2cgPT0gbnVsbClcbiAgICAgIHJldHVybjtcblxuICAgIGlmIChwa2cucmVhbFBhdGgpIHtcbiAgICAgIHRyZWUucHV0RGF0YShwa2cucmVhbFBhdGgsIHBrZyk7XG4gICAgfVxuICAgIC8vIERvbid0IHRydXN0IHBrZy5wYXRoLCBpdCBpcyBzZXQgYnkgY29tbWFuZCBsaW5lOiBwbGluayBzeW5jL2luaXQsIGFuZCBsb2FkZWQgZnJvbSBzdGF0ZSBmaWxlLFxuICAgIC8vIHdoaWNoIGlzIG5vdCB1cC10by1kYXRlcy5cbiAgICB0cmVlLnB1dERhdGEoUGF0aC5yZXNvbHZlKHdvcmtEaXIsIHN5bWxpbmtEaXJOYW1lLCBwa2cubmFtZSksIHBrZyk7XG4gICAgLy8gaWYgKHBrZy5wYXRoICE9PSBwa2cucmVhbFBhdGgpIHtcbiAgICAvLyAgIHRyZWUucHV0RGF0YShQYXRoLnJlc29sdmUod29ya0Rpciwgc3ltbGlua0Rpck5hbWUsIHBrZy5uYW1lKSwgcGtnKTtcbiAgICAvLyB9XG4gICAgY291bnQrKztcbiAgfSk7XG4gIGxvZy5pbmZvKCclcyBQbGluayBjb21wbGlhbnQgbm9kZSBwYWNrYWdlcyBmb3VuZCcsIGNvdW50KTtcbiAgcGFja2FnZUluZm8uZGlyVHJlZSA9IHRyZWU7XG59XG5cbiJdfQ==