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
exports.saveCache = exports.walkPackages = exports.PackageInstance = void 0;
const Path = __importStar(require("path"));
const _ = __importStar(require("lodash"));
// var chalk = require('chalk');
const log = require('log4js').getLogger('buildUtil.' + Path.basename(__filename, '.js'));
const dir_tree_1 = require("require-injector/dist/dir-tree");
const packageNodeInstance_1 = __importDefault(require("../packageNodeInstance"));
exports.PackageInstance = packageNodeInstance_1.default;
const package_list_helper_1 = require("./package-list-helper");
const lazy_package_factory_1 = require("./lazy-package-factory");
const misc_1 = require("../utils/misc");
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
function saveCache(packageInfo) {
    // if (isFromCache)
    // 	return;
    // mkdirp.sync(Path.join(config().rootPath, config().destDir));
    // fs.writeFileSync(packageInfoCacheFile, JSON.stringify(cycle.decycle(packageInfo)));
    // log.debug('write to cache ', packageInfoCacheFile);
}
exports.saveCache = saveCache;
function _walkPackages() {
    const configBundleInfo = {
        moduleMap: {}
    };
    const info = {
        allModules: null,
        moduleMap: _.clone(configBundleInfo.moduleMap),
        dirTree: null
    };
    for (const pk of package_list_helper_1.packages4Workspace()) {
        addPackageToInfo(info, pk);
    }
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
        const symlink = misc_1.getSymlinkForPackage(moduleInstance.longName);
        if (symlink && symlink !== moduleInstance.realPath)
            tree.putData(symlink, moduleInstance);
        count++;
    });
    log.info('Total %s node packages', count);
    packageInfo.dirTree = tree;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1pbmZvLWdhdGhlcmluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL3BhY2thZ2UtaW5mby1nYXRoZXJpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDJDQUE2QjtBQUM3QiwwQ0FBNEI7QUFDNUIsZ0NBQWdDO0FBQ2hDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDekYsNkRBQXVEO0FBQ3ZELGlGQUFxRDtBQWE3QywwQkFiRCw2QkFBZSxDQWFDO0FBWnZCLCtEQUF5RDtBQUV6RCxpRUFBaUQ7QUFDakQsd0NBQW1EO0FBV25ELElBQUksV0FBd0IsQ0FBQztBQUM3Qjs7Ozs7OztHQU9HO0FBQ0gsU0FBZ0IsWUFBWTtJQUMxQixJQUFJLFdBQVc7UUFDYixPQUFPLFdBQVcsQ0FBQztJQUNyQixHQUFHLENBQUMsSUFBSSxDQUFDLHdCQUF3QixDQUFDLENBQUM7SUFDbkMsV0FBVyxHQUFHLGFBQWEsRUFBRSxDQUFDO0lBQzlCLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ2xDLE9BQU8sV0FBVyxDQUFDO0FBQ3JCLENBQUM7QUFQRCxvQ0FPQztBQUVELFNBQWdCLFNBQVMsQ0FBQyxXQUF3QjtJQUNoRCxtQkFBbUI7SUFDbkIsV0FBVztJQUNYLCtEQUErRDtJQUMvRCxzRkFBc0Y7SUFDdEYsc0RBQXNEO0FBQ3hELENBQUM7QUFORCw4QkFNQztBQUVELFNBQVMsYUFBYTtJQUNwQixNQUFNLGdCQUFnQixHQUFlO1FBQ25DLFNBQVMsRUFBRSxFQUFFO0tBQ2QsQ0FBQztJQUNGLE1BQU0sSUFBSSxHQUFnQjtRQUN4QixVQUFVLEVBQUUsSUFBb0M7UUFDaEQsU0FBUyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxDQUFDO1FBQzlDLE9BQU8sRUFBRSxJQUEyQztLQUNyRCxDQUFDO0lBRUYsS0FBSyxNQUFNLEVBQUUsSUFBSSx3Q0FBa0IsRUFBRSxFQUFFO1FBQ3JDLGdCQUFnQixDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztLQUM1QjtJQUVELElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7SUFFM0MsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxJQUFpQixFQUFFLEdBQWlCO0lBQzVELElBQUksUUFBUSxDQUFDO0lBQ2IsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ25DLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUNyQztTQUFNO1FBQ0wsTUFBTSxNQUFNLEdBQUcsZ0NBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkMsK0JBQStCO1FBQy9CLFFBQVEsR0FBRyxJQUFJLDZCQUFlLENBQUM7WUFDN0IsVUFBVSxFQUFFLEdBQUcsQ0FBQyxJQUFJO1lBQ3BCLFNBQVMsRUFBRSxNQUFNLENBQUMsSUFBSTtZQUN0QixJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUk7WUFDZCxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUk7WUFDbEIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxLQUFLO1lBQ2hCLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSTtZQUNkLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSTtZQUNkLFFBQVEsRUFBRSxHQUFHLENBQUMsUUFBUTtTQUN2QixDQUFDLENBQUM7S0FDSjtJQUNELElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLFFBQVEsQ0FBQztBQUMvQyxDQUFDO0FBRUQsMkNBQTJDO0FBQzNDLCtCQUErQjtBQUMvQiw4QkFBOEI7QUFDOUIsMEJBQTBCO0FBQzFCLE1BQU07QUFDTixjQUFjO0FBQ2QsSUFBSTtBQUVKLFNBQVMsb0JBQW9CLENBQUMsV0FBd0I7SUFDcEQsTUFBTSxJQUFJLEdBQUcsSUFBSSxrQkFBTyxFQUFtQixDQUFDO0lBQzVDLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQztJQUNkLFdBQVcsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxFQUFFO1FBQzlDLElBQUksY0FBYyxJQUFJLElBQUk7WUFDeEIsT0FBTztRQUNULElBQUksY0FBYyxDQUFDLFFBQVE7WUFDekIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ3hELE1BQU0sT0FBTyxHQUFHLDJCQUFvQixDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM5RCxJQUFJLE9BQU8sSUFBSSxPQUFPLEtBQUssY0FBYyxDQUFDLFFBQVE7WUFDaEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDeEMsS0FBSyxFQUFFLENBQUM7SUFDVixDQUFDLENBQUMsQ0FBQztJQUNILEdBQUcsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDMUMsV0FBVyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7QUFDN0IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG4vLyB2YXIgY2hhbGsgPSByZXF1aXJlKCdjaGFsaycpO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdidWlsZFV0aWwuJyArIFBhdGguYmFzZW5hbWUoX19maWxlbmFtZSwgJy5qcycpKTtcbmltcG9ydCB7RGlyVHJlZX0gZnJvbSAncmVxdWlyZS1pbmplY3Rvci9kaXN0L2Rpci10cmVlJztcbmltcG9ydCBQYWNrYWdlSW5zdGFuY2UgZnJvbSAnLi4vcGFja2FnZU5vZGVJbnN0YW5jZSc7XG5pbXBvcnQge3BhY2thZ2VzNFdvcmtzcGFjZX0gZnJvbSAnLi9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCB7UGFja2FnZUluZm8gYXMgUGFja2FnZVN0YXRlfSBmcm9tICcuL2luZGV4JztcbmltcG9ydCB7cGFyc2VOYW1lfSBmcm9tICcuL2xhenktcGFja2FnZS1mYWN0b3J5JztcbmltcG9ydCB7Z2V0U3ltbGlua0ZvclBhY2thZ2V9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuZXhwb3J0IGludGVyZmFjZSBCdW5kbGVJbmZvIHtcbiAgbW9kdWxlTWFwOiB7W25hbWU6IHN0cmluZ106IFBhY2thZ2VJbnN0YW5jZX07XG59XG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VJbmZvIGV4dGVuZHMgQnVuZGxlSW5mbyB7XG4gIGFsbE1vZHVsZXM6IFBhY2thZ2VJbnN0YW5jZVtdO1xuICBkaXJUcmVlOiBEaXJUcmVlPFBhY2thZ2VJbnN0YW5jZT47XG59XG5cbmV4cG9ydCB7UGFja2FnZUluc3RhbmNlfTtcblxubGV0IHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbztcbi8qKlxuICogd2Fsa1BhY2thZ2VzXG4gKiBAcGFyYW0geyp9IGNvbmZpZyBcbiAqIEBwYXJhbSB7Kn0gYXJndiBcbiAqIEBwYXJhbSB7Kn0gcGFja2FnZVV0aWxzIFxuICogQHBhcmFtIHsqfSBpZ25vcmVDYWNoZVxuICogQHJldHVybiB7UGFja2FnZUluZm99XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3YWxrUGFja2FnZXMoKSB7XG4gIGlmIChwYWNrYWdlSW5mbylcbiAgICByZXR1cm4gcGFja2FnZUluZm87XG4gIGxvZy5pbmZvKCdzY2FuIGZvciBwYWNrYWdlcyBpbmZvJyk7XG4gIHBhY2thZ2VJbmZvID0gX3dhbGtQYWNrYWdlcygpO1xuICBjcmVhdGVQYWNrYWdlRGlyVHJlZShwYWNrYWdlSW5mbyk7XG4gIHJldHVybiBwYWNrYWdlSW5mbztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNhdmVDYWNoZShwYWNrYWdlSW5mbzogUGFja2FnZUluZm8pIHtcbiAgLy8gaWYgKGlzRnJvbUNhY2hlKVxuICAvLyBcdHJldHVybjtcbiAgLy8gbWtkaXJwLnN5bmMoUGF0aC5qb2luKGNvbmZpZygpLnJvb3RQYXRoLCBjb25maWcoKS5kZXN0RGlyKSk7XG4gIC8vIGZzLndyaXRlRmlsZVN5bmMocGFja2FnZUluZm9DYWNoZUZpbGUsIEpTT04uc3RyaW5naWZ5KGN5Y2xlLmRlY3ljbGUocGFja2FnZUluZm8pKSk7XG4gIC8vIGxvZy5kZWJ1Zygnd3JpdGUgdG8gY2FjaGUgJywgcGFja2FnZUluZm9DYWNoZUZpbGUpO1xufVxuXG5mdW5jdGlvbiBfd2Fsa1BhY2thZ2VzKCk6IFBhY2thZ2VJbmZvIHtcbiAgY29uc3QgY29uZmlnQnVuZGxlSW5mbzogQnVuZGxlSW5mbyA9IHtcbiAgICBtb2R1bGVNYXA6IHt9XG4gIH07XG4gIGNvbnN0IGluZm86IFBhY2thZ2VJbmZvID0ge1xuICAgIGFsbE1vZHVsZXM6IG51bGwgYXMgdW5rbm93biBhcyBQYWNrYWdlSW5zdGFuY2VbXSwgLy8gYXJyYXlcbiAgICBtb2R1bGVNYXA6IF8uY2xvbmUoY29uZmlnQnVuZGxlSW5mby5tb2R1bGVNYXApLFxuICAgIGRpclRyZWU6IG51bGwgYXMgdW5rbm93biBhcyBEaXJUcmVlPFBhY2thZ2VJbnN0YW5jZT5cbiAgfTtcblxuICBmb3IgKGNvbnN0IHBrIG9mIHBhY2thZ2VzNFdvcmtzcGFjZSgpKSB7XG4gICAgYWRkUGFja2FnZVRvSW5mbyhpbmZvLCBwayk7XG4gIH1cblxuICBpbmZvLmFsbE1vZHVsZXMgPSBfLnZhbHVlcyhpbmZvLm1vZHVsZU1hcCk7XG5cbiAgcmV0dXJuIGluZm87XG59XG5cbmZ1bmN0aW9uIGFkZFBhY2thZ2VUb0luZm8oaW5mbzogUGFja2FnZUluZm8sIHBrZzogUGFja2FnZVN0YXRlKSB7XG4gIGxldCBpbnN0YW5jZTtcbiAgaWYgKF8uaGFzKGluZm8ubW9kdWxlTWFwLCBwa2cubmFtZSkpIHtcbiAgICBpbnN0YW5jZSA9IGluZm8ubW9kdWxlTWFwW3BrZy5uYW1lXTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBwYXJzZWQgPSBwYXJzZU5hbWUocGtnLm5hbWUpO1xuICAgIC8vIFRoZXJlIGFyZSBhbHNvIG5vZGUgcGFja2FnZXNcbiAgICBpbnN0YW5jZSA9IG5ldyBQYWNrYWdlSW5zdGFuY2Uoe1xuICAgICAgbW9kdWxlTmFtZTogcGtnLm5hbWUsXG4gICAgICBzaG9ydE5hbWU6IHBhcnNlZC5uYW1lLFxuICAgICAgbmFtZTogcGtnLm5hbWUsXG4gICAgICBsb25nTmFtZTogcGtnLm5hbWUsXG4gICAgICBzY29wZTogcGtnLnNjb3BlLFxuICAgICAgcGF0aDogcGtnLnBhdGgsXG4gICAgICBqc29uOiBwa2cuanNvbixcbiAgICAgIHJlYWxQYXRoOiBwa2cucmVhbFBhdGhcbiAgICB9KTtcbiAgfVxuICBpbmZvLm1vZHVsZU1hcFtpbnN0YW5jZS5sb25nTmFtZV0gPSBpbnN0YW5jZTtcbn1cblxuLy8gZnVuY3Rpb24gdHJpbU5vUGFyc2VTZXR0aW5nKHA6IHN0cmluZykge1xuLy8gICBwID0gcC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4vLyAgIGlmIChwLnN0YXJ0c1dpdGgoJy4vJykpIHtcbi8vICAgICBwID0gcC5zdWJzdHJpbmcoMik7XG4vLyAgIH1cbi8vICAgcmV0dXJuIHA7XG4vLyB9XG5cbmZ1bmN0aW9uIGNyZWF0ZVBhY2thZ2VEaXJUcmVlKHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbykge1xuICBjb25zdCB0cmVlID0gbmV3IERpclRyZWU8UGFja2FnZUluc3RhbmNlPigpO1xuICB2YXIgY291bnQgPSAwO1xuICBwYWNrYWdlSW5mby5hbGxNb2R1bGVzLmZvckVhY2gobW9kdWxlSW5zdGFuY2UgPT4ge1xuICAgIGlmIChtb2R1bGVJbnN0YW5jZSA9PSBudWxsKVxuICAgICAgcmV0dXJuO1xuICAgIGlmIChtb2R1bGVJbnN0YW5jZS5yZWFsUGF0aClcbiAgICAgIHRyZWUucHV0RGF0YShtb2R1bGVJbnN0YW5jZS5yZWFsUGF0aCwgbW9kdWxlSW5zdGFuY2UpO1xuICAgIGNvbnN0IHN5bWxpbmsgPSBnZXRTeW1saW5rRm9yUGFja2FnZShtb2R1bGVJbnN0YW5jZS5sb25nTmFtZSk7XG4gICAgaWYgKHN5bWxpbmsgJiYgc3ltbGluayAhPT0gbW9kdWxlSW5zdGFuY2UucmVhbFBhdGgpXG4gICAgICB0cmVlLnB1dERhdGEoc3ltbGluaywgbW9kdWxlSW5zdGFuY2UpO1xuICAgIGNvdW50Kys7XG4gIH0pO1xuICBsb2cuaW5mbygnVG90YWwgJXMgbm9kZSBwYWNrYWdlcycsIGNvdW50KTtcbiAgcGFja2FnZUluZm8uZGlyVHJlZSA9IHRyZWU7XG59XG5cbiJdfQ==