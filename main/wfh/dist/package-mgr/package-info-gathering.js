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
exports.walkPackages = exports.PackageInstance = void 0;
const _ = __importStar(require("lodash"));
const log4js_1 = require("log4js");
const dir_tree_1 = require("require-injector/dist/dir-tree");
const packageNodeInstance_1 = __importDefault(require("../packageNodeInstance"));
exports.PackageInstance = packageNodeInstance_1.default;
const package_list_helper_1 = require("./package-list-helper");
const lazy_package_factory_1 = require("./lazy-package-factory");
const misc_1 = require("../utils/misc");
const path_1 = __importDefault(require("path"));
const log = log4js_1.getLogger('plink.package-info-gathering');
const { workDir, symlinkDirName } = misc_1.plinkEnv;
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
    log.debug('scan for packages info');
    packageInfo = _walkPackages();
    createPackageDirTree(packageInfo);
    return packageInfo;
}
exports.walkPackages = walkPackages;
function _walkPackages() {
    const info = {
        get allModules() {
            return Object.values(info.moduleMap);
        },
        moduleMap: {},
        dirTree: null
    };
    for (const pk of package_list_helper_1.packages4Workspace()) {
        addPackageToInfo(info, pk);
    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1pbmZvLWdhdGhlcmluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL3BhY2thZ2UtaW5mby1nYXRoZXJpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDBDQUE0QjtBQUM1QixtQ0FBaUM7QUFDakMsNkRBQXVEO0FBQ3ZELGlGQUFxRDtBQWU3QywwQkFmRCw2QkFBZSxDQWVDO0FBZHZCLCtEQUF5RDtBQUV6RCxpRUFBaUQ7QUFDakQsd0NBQXVDO0FBQ3ZDLGdEQUF3QjtBQUN4QixNQUFNLEdBQUcsR0FBRyxrQkFBUyxDQUFDLDhCQUE4QixDQUFDLENBQUM7QUFFdEQsTUFBTSxFQUFDLE9BQU8sRUFBRSxjQUFjLEVBQUMsR0FBRyxlQUFRLENBQUM7QUFTM0MsSUFBSSxXQUF3QixDQUFDO0FBQzdCOzs7Ozs7O0dBT0c7QUFDSCxTQUFnQixZQUFZO0lBQzFCLElBQUksV0FBVztRQUNiLE9BQU8sV0FBVyxDQUFDO0lBQ3JCLEdBQUcsQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQztJQUNwQyxXQUFXLEdBQUcsYUFBYSxFQUFFLENBQUM7SUFDOUIsb0JBQW9CLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDbEMsT0FBTyxXQUFXLENBQUM7QUFDckIsQ0FBQztBQVBELG9DQU9DO0FBRUQsU0FBUyxhQUFhO0lBQ3BCLE1BQU0sSUFBSSxHQUFnQjtRQUN4QixJQUFJLFVBQVU7WUFDWixPQUFPLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3ZDLENBQUM7UUFDRCxTQUFTLEVBQUUsRUFBRTtRQUNiLE9BQU8sRUFBRSxJQUEyQztLQUNyRCxDQUFDO0lBRUYsS0FBSyxNQUFNLEVBQUUsSUFBSSx3Q0FBa0IsRUFBRSxFQUFFO1FBQ3JDLGdCQUFnQixDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztLQUM1QjtJQUVELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQUVELFNBQVMsZ0JBQWdCLENBQUMsSUFBaUIsRUFBRSxHQUFpQjtJQUM1RCxJQUFJLFFBQVEsQ0FBQztJQUNiLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNuQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDckM7U0FBTTtRQUNMLE1BQU0sTUFBTSxHQUFHLGdDQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ25DLCtCQUErQjtRQUMvQixRQUFRLEdBQUcsSUFBSSw2QkFBZSxDQUFDO1lBQzdCLFVBQVUsRUFBRSxHQUFHLENBQUMsSUFBSTtZQUNwQixTQUFTLEVBQUUsTUFBTSxDQUFDLElBQUk7WUFDdEIsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJO1lBQ2QsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJO1lBQ2xCLEtBQUssRUFBRSxHQUFHLENBQUMsS0FBSztZQUNoQixJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUk7WUFDZCxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUk7WUFDZCxRQUFRLEVBQUUsR0FBRyxDQUFDLFFBQVE7U0FDdkIsQ0FBQyxDQUFDO0tBQ0o7SUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsR0FBRyxRQUFRLENBQUM7QUFDL0MsQ0FBQztBQUVELDJDQUEyQztBQUMzQywrQkFBK0I7QUFDL0IsOEJBQThCO0FBQzlCLDBCQUEwQjtBQUMxQixNQUFNO0FBQ04sY0FBYztBQUNkLElBQUk7QUFFSixTQUFTLG9CQUFvQixDQUFDLFdBQXdCO0lBQ3BELE1BQU0sSUFBSSxHQUFHLElBQUksa0JBQU8sRUFBbUIsQ0FBQztJQUM1QyxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7SUFDZCxXQUFXLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUNuQyxJQUFJLEdBQUcsSUFBSSxJQUFJO1lBQ2IsT0FBTztRQUVULElBQUksR0FBRyxDQUFDLFFBQVEsRUFBRTtZQUNoQixJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FDakM7UUFDRCxnR0FBZ0c7UUFDaEcsNEJBQTRCO1FBQzVCLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsY0FBYyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNuRSxtQ0FBbUM7UUFDbkMsd0VBQXdFO1FBQ3hFLElBQUk7UUFDSixLQUFLLEVBQUUsQ0FBQztJQUNWLENBQUMsQ0FBQyxDQUFDO0lBQ0gsR0FBRyxDQUFDLElBQUksQ0FBQyx3Q0FBd0MsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUMxRCxXQUFXLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztBQUM3QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQge0RpclRyZWV9IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3IvZGlzdC9kaXItdHJlZSc7XG5pbXBvcnQgUGFja2FnZUluc3RhbmNlIGZyb20gJy4uL3BhY2thZ2VOb2RlSW5zdGFuY2UnO1xuaW1wb3J0IHtwYWNrYWdlczRXb3Jrc3BhY2V9IGZyb20gJy4vcGFja2FnZS1saXN0LWhlbHBlcic7XG5pbXBvcnQge1BhY2thZ2VJbmZvIGFzIFBhY2thZ2VTdGF0ZX0gZnJvbSAnLi9pbmRleCc7XG5pbXBvcnQge3BhcnNlTmFtZX0gZnJvbSAnLi9sYXp5LXBhY2thZ2UtZmFjdG9yeSc7XG5pbXBvcnQge3BsaW5rRW52fSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuY29uc3QgbG9nID0gZ2V0TG9nZ2VyKCdwbGluay5wYWNrYWdlLWluZm8tZ2F0aGVyaW5nJyk7XG5cbmNvbnN0IHt3b3JrRGlyLCBzeW1saW5rRGlyTmFtZX0gPSBwbGlua0VudjtcbmV4cG9ydCBpbnRlcmZhY2UgUGFja2FnZUluZm8ge1xuICBhbGxNb2R1bGVzOiBQYWNrYWdlSW5zdGFuY2VbXTtcbiAgZGlyVHJlZTogRGlyVHJlZTxQYWNrYWdlSW5zdGFuY2U+O1xuICBtb2R1bGVNYXA6IHtbbmFtZTogc3RyaW5nXTogUGFja2FnZUluc3RhbmNlfTtcbn1cblxuZXhwb3J0IHtQYWNrYWdlSW5zdGFuY2V9O1xuXG5sZXQgcGFja2FnZUluZm86IFBhY2thZ2VJbmZvO1xuLyoqXG4gKiB3YWxrUGFja2FnZXNcbiAqIEBwYXJhbSB7Kn0gY29uZmlnIFxuICogQHBhcmFtIHsqfSBhcmd2IFxuICogQHBhcmFtIHsqfSBwYWNrYWdlVXRpbHMgXG4gKiBAcGFyYW0geyp9IGlnbm9yZUNhY2hlXG4gKiBAcmV0dXJuIHtQYWNrYWdlSW5mb31cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdhbGtQYWNrYWdlcygpIHtcbiAgaWYgKHBhY2thZ2VJbmZvKVxuICAgIHJldHVybiBwYWNrYWdlSW5mbztcbiAgbG9nLmRlYnVnKCdzY2FuIGZvciBwYWNrYWdlcyBpbmZvJyk7XG4gIHBhY2thZ2VJbmZvID0gX3dhbGtQYWNrYWdlcygpO1xuICBjcmVhdGVQYWNrYWdlRGlyVHJlZShwYWNrYWdlSW5mbyk7XG4gIHJldHVybiBwYWNrYWdlSW5mbztcbn1cblxuZnVuY3Rpb24gX3dhbGtQYWNrYWdlcygpOiBQYWNrYWdlSW5mbyB7XG4gIGNvbnN0IGluZm86IFBhY2thZ2VJbmZvID0ge1xuICAgIGdldCBhbGxNb2R1bGVzKCkge1xuICAgICAgcmV0dXJuIE9iamVjdC52YWx1ZXMoaW5mby5tb2R1bGVNYXApO1xuICAgIH0sIC8vIGFycmF5XG4gICAgbW9kdWxlTWFwOiB7fSxcbiAgICBkaXJUcmVlOiBudWxsIGFzIHVua25vd24gYXMgRGlyVHJlZTxQYWNrYWdlSW5zdGFuY2U+XG4gIH07XG5cbiAgZm9yIChjb25zdCBwayBvZiBwYWNrYWdlczRXb3Jrc3BhY2UoKSkge1xuICAgIGFkZFBhY2thZ2VUb0luZm8oaW5mbywgcGspO1xuICB9XG5cbiAgcmV0dXJuIGluZm87XG59XG5cbmZ1bmN0aW9uIGFkZFBhY2thZ2VUb0luZm8oaW5mbzogUGFja2FnZUluZm8sIHBrZzogUGFja2FnZVN0YXRlKSB7XG4gIGxldCBpbnN0YW5jZTtcbiAgaWYgKF8uaGFzKGluZm8ubW9kdWxlTWFwLCBwa2cubmFtZSkpIHtcbiAgICBpbnN0YW5jZSA9IGluZm8ubW9kdWxlTWFwW3BrZy5uYW1lXTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBwYXJzZWQgPSBwYXJzZU5hbWUocGtnLm5hbWUpO1xuICAgIC8vIFRoZXJlIGFyZSBhbHNvIG5vZGUgcGFja2FnZXNcbiAgICBpbnN0YW5jZSA9IG5ldyBQYWNrYWdlSW5zdGFuY2Uoe1xuICAgICAgbW9kdWxlTmFtZTogcGtnLm5hbWUsXG4gICAgICBzaG9ydE5hbWU6IHBhcnNlZC5uYW1lLFxuICAgICAgbmFtZTogcGtnLm5hbWUsXG4gICAgICBsb25nTmFtZTogcGtnLm5hbWUsXG4gICAgICBzY29wZTogcGtnLnNjb3BlLFxuICAgICAgcGF0aDogcGtnLnBhdGgsXG4gICAgICBqc29uOiBwa2cuanNvbixcbiAgICAgIHJlYWxQYXRoOiBwa2cucmVhbFBhdGhcbiAgICB9KTtcbiAgfVxuICBpbmZvLm1vZHVsZU1hcFtpbnN0YW5jZS5sb25nTmFtZV0gPSBpbnN0YW5jZTtcbn1cblxuLy8gZnVuY3Rpb24gdHJpbU5vUGFyc2VTZXR0aW5nKHA6IHN0cmluZykge1xuLy8gICBwID0gcC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4vLyAgIGlmIChwLnN0YXJ0c1dpdGgoJy4vJykpIHtcbi8vICAgICBwID0gcC5zdWJzdHJpbmcoMik7XG4vLyAgIH1cbi8vICAgcmV0dXJuIHA7XG4vLyB9XG5cbmZ1bmN0aW9uIGNyZWF0ZVBhY2thZ2VEaXJUcmVlKHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbykge1xuICBjb25zdCB0cmVlID0gbmV3IERpclRyZWU8UGFja2FnZUluc3RhbmNlPigpO1xuICBsZXQgY291bnQgPSAwO1xuICBwYWNrYWdlSW5mby5hbGxNb2R1bGVzLmZvckVhY2gocGtnID0+IHtcbiAgICBpZiAocGtnID09IG51bGwpXG4gICAgICByZXR1cm47XG5cbiAgICBpZiAocGtnLnJlYWxQYXRoKSB7XG4gICAgICB0cmVlLnB1dERhdGEocGtnLnJlYWxQYXRoLCBwa2cpO1xuICAgIH1cbiAgICAvLyBEb24ndCB0cnVzdCBwa2cucGF0aCwgaXQgaXMgc2V0IGJ5IGNvbW1hbmQgbGluZTogcGxpbmsgc3luYy9pbml0LCBhbmQgbG9hZGVkIGZyb20gc3RhdGUgZmlsZSxcbiAgICAvLyB3aGljaCBpcyBub3QgdXAtdG8tZGF0ZXMuXG4gICAgdHJlZS5wdXREYXRhKFBhdGgucmVzb2x2ZSh3b3JrRGlyLCBzeW1saW5rRGlyTmFtZSwgcGtnLm5hbWUpLCBwa2cpO1xuICAgIC8vIGlmIChwa2cucGF0aCAhPT0gcGtnLnJlYWxQYXRoKSB7XG4gICAgLy8gICB0cmVlLnB1dERhdGEoUGF0aC5yZXNvbHZlKHdvcmtEaXIsIHN5bWxpbmtEaXJOYW1lLCBwa2cubmFtZSksIHBrZyk7XG4gICAgLy8gfVxuICAgIGNvdW50Kys7XG4gIH0pO1xuICBsb2cuaW5mbygnJXMgUGxpbmsgY29tcGxpYW50IG5vZGUgcGFja2FnZXMgZm91bmQnLCBjb3VudCk7XG4gIHBhY2thZ2VJbmZvLmRpclRyZWUgPSB0cmVlO1xufVxuXG4iXX0=