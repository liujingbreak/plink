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
// import inspector from 'inspector';
const log = (0, log4js_1.getLogger)('plink.package-info-gathering');
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
    existingFileToPkgHelper = { packageInfo, getPkgOfFile };
    return existingFileToPkgHelper;
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
    for (const pk of (0, package_list_helper_1.packages4Workspace)()) {
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
        const parsed = (0, lazy_package_factory_1.parseName)(pkg.name);
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
        // if (pkg.name === '@bk/trade-aggr') {
        //   inspector.open(9222, 'localhost', true);
        //   debugger;
        // }
        count++;
    });
    log.info('%s Plink compliant node packages found', count);
    packageInfo.dirTree = tree;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1pbmZvLWdhdGhlcmluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL3BhY2thZ2UtaW5mby1nYXRoZXJpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDBDQUE0QjtBQUM1QixtQ0FBaUM7QUFDakMsNkRBQXVEO0FBQ3ZELGlGQUFxRDtBQWlCN0MsMEJBakJELDZCQUFlLENBaUJDO0FBaEJ2QiwrREFBeUQ7QUFFekQsaUVBQWlEO0FBQ2pELHdDQUF1QztBQUN2QywwREFBNEI7QUFDNUIsZ0RBQXdCO0FBQ3hCLHFDQUFxQztBQUVyQyxNQUFNLEdBQUcsR0FBRyxJQUFBLGtCQUFTLEVBQUMsOEJBQThCLENBQUMsQ0FBQztBQUN0RCxNQUFNLEVBQUMsT0FBTyxFQUFFLGNBQWMsRUFBQyxHQUFHLGVBQVEsQ0FBQztBQVMzQyxJQUFJLHVCQUdTLENBQUM7QUFDZCxnQ0FBZ0M7QUFDaEM7Ozs7Ozs7R0FPRztBQUVILFNBQWdCLG9CQUFvQjtJQUNsQyxJQUFJLHVCQUF1QixFQUFFO1FBQzNCLE9BQU8sdUJBQXVCLENBQUM7S0FDaEM7SUFDRCxNQUFNLEtBQUssR0FBRyxJQUFJLG1CQUFHLENBQTBCLEVBQUMsR0FBRyxFQUFFLEVBQUUsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQztJQUN6RSxNQUFNLFdBQVcsR0FBZ0IsWUFBWSxFQUFFLENBQUM7SUFFaEQsU0FBUyxZQUFZLENBQUMsSUFBWTtRQUNoQyxJQUFJLEtBQUssR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzVCLElBQUksQ0FBQyxLQUFLLEVBQUU7WUFDVixLQUFLLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDbkQsSUFBSSxLQUFLO2dCQUNQLEtBQUssQ0FBQyxH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QTZDO1FBQzdDLGNBQWM7UUFDZCxJQUFJO1FBQ0osS0FBSyxFQUFFLENBQUM7SUFDVixDQUFDLENBQUMsQ0FBQztJQUNILEdBQUcsQ0FBQyxJQUFJLENBQUMsd0NBQXdDLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDMUQsV0FBVyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7QUFDN0IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtEaXJUcmVlfSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvZGlyLXRyZWUnO1xuaW1wb3J0IFBhY2thZ2VJbnN0YW5jZSBmcm9tICcuLi9wYWNrYWdlTm9kZUluc3RhbmNlJztcbmltcG9ydCB7cGFja2FnZXM0V29ya3NwYWNlfSBmcm9tICcuL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IHtQYWNrYWdlSW5mbyBhcyBQYWNrYWdlU3RhdGV9IGZyb20gJy4vaW5kZXgnO1xuaW1wb3J0IHtwYXJzZU5hbWV9IGZyb20gJy4vbGF6eS1wYWNrYWdlLWZhY3RvcnknO1xuaW1wb3J0IHtwbGlua0Vudn0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5pbXBvcnQgTFJVIGZyb20gJ2xydS1jYWNoZSc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbi8vIGltcG9ydCBpbnNwZWN0b3IgZnJvbSAnaW5zcGVjdG9yJztcblxuY29uc3QgbG9nID0gZ2V0TG9nZ2VyKCdwbGluay5wYWNrYWdlLWluZm8tZ2F0aGVyaW5nJyk7XG5jb25zdCB7d29ya0Rpciwgc3ltbGlua0Rpck5hbWV9ID0gcGxpbmtFbnY7XG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VJbmZvIHtcbiAgYWxsTW9kdWxlczogUGFja2FnZUluc3RhbmNlW107XG4gIGRpclRyZWU6IERpclRyZWU8UGFja2FnZUluc3RhbmNlPjtcbiAgbW9kdWxlTWFwOiB7W25hbWU6IHN0cmluZ106IFBhY2thZ2VJbnN0YW5jZX07XG59XG5cbmV4cG9ydCB7UGFja2FnZUluc3RhbmNlfTtcblxubGV0IGV4aXN0aW5nRmlsZVRvUGtnSGVscGVyOiB7XG4gIHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbztcbiAgZ2V0UGtnT2ZGaWxlKGZpbGU6IHN0cmluZyk6IFBhY2thZ2VJbnN0YW5jZSB8IHVuZGVmaW5lZDtcbn0gfCB1bmRlZmluZWQ7XG4vLyBsZXQgcGFja2FnZUluZm86IFBhY2thZ2VJbmZvO1xuLyoqXG4gKiB3YWxrUGFja2FnZXNcbiAqIEBwYXJhbSB7Kn0gY29uZmlnIFxuICogQHBhcmFtIHsqfSBhcmd2IFxuICogQHBhcmFtIHsqfSBwYWNrYWdlVXRpbHMgXG4gKiBAcGFyYW0geyp9IGlnbm9yZUNhY2hlXG4gKiBAcmV0dXJuIHtQYWNrYWdlSW5mb31cbiAqL1xuXG5leHBvcnQgZnVuY3Rpb24gcGFja2FnZU9mRmlsZUZhY3RvcnkoKSB7XG4gIGlmIChleGlzdGluZ0ZpbGVUb1BrZ0hlbHBlcikge1xuICAgIHJldHVybiBleGlzdGluZ0ZpbGVUb1BrZ0hlbHBlcjtcbiAgfVxuICBjb25zdCBjYWNoZSA9IG5ldyBMUlU8c3RyaW5nLCBQYWNrYWdlSW5zdGFuY2U+KHttYXg6IDIwLCBtYXhBZ2U6IDIwMDAwfSk7XG4gIGNvbnN0IHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbyA9IHdhbGtQYWNrYWdlcygpO1xuXG4gIGZ1bmN0aW9uIGdldFBrZ09mRmlsZShmaWxlOiBzdHJpbmcpOiBQYWNrYWdlSW5zdGFuY2UgfCB1bmRlZmluZWQge1xuICAgIHZhciBmb3VuZCA9IGNhY2hlLmdldChmaWxlKTtcbiAgICBpZiAoIWZvdW5kKSB7XG4gICAgICBmb3VuZCA9IHBhY2thZ2VJbmZvLmRpclRyZWUuZ2V0QWxsRGF0YShmaWxlKS5wb3AoKTtcbiAgICAgIGlmIChmb3VuZClcbiAgICAgICAgY2FjaGUuc2V0KGZpbGUsIGZvdW5kKTtcbiAgICB9XG4gICAgcmV0dXJuIGZvdW5kO1xuICB9XG4gIGV4aXN0aW5nRmlsZVRvUGtnSGVscGVyID0ge3BhY2thZ2VJbmZvLCBnZXRQa2dPZkZpbGV9O1xuICByZXR1cm4gZXhpc3RpbmdGaWxlVG9Qa2dIZWxwZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3YWxrUGFja2FnZXMoKSB7XG4gIC8vIGlmIChwYWNrYWdlSW5mbylcbiAgLy8gICByZXR1cm4gcGFja2FnZUluZm87XG4gIGxvZy5kZWJ1Zygnc2NhbiBmb3IgcGFja2FnZXMgaW5mbycpO1xuICBjb25zdCBwYWNrYWdlSW5mbzogUGFja2FnZUluZm8gPSB7XG4gICAgZ2V0IGFsbE1vZHVsZXMoKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LnZhbHVlcyhwYWNrYWdlSW5mby5tb2R1bGVNYXApO1xuICAgIH0sIC8vIGFycmF5XG4gICAgbW9kdWxlTWFwOiB7fSxcbiAgICBkaXJUcmVlOiBudWxsIGFzIHVua25vd24gYXMgRGlyVHJlZTxQYWNrYWdlSW5zdGFuY2U+XG4gIH07XG5cbiAgZm9yIChjb25zdCBwayBvZiBwYWNrYWdlczRXb3Jrc3BhY2UoKSkge1xuICAgIGFkZFBhY2thZ2VUb0luZm8ocGFja2FnZUluZm8ubW9kdWxlTWFwLCBwayk7XG4gIH1cblxuICBjcmVhdGVQYWNrYWdlRGlyVHJlZShwYWNrYWdlSW5mbyk7XG4gIHJldHVybiBwYWNrYWdlSW5mbztcbn1cblxuXG5mdW5jdGlvbiBhZGRQYWNrYWdlVG9JbmZvKG1vZHVsZU1hcDogUGFja2FnZUluZm9bJ21vZHVsZU1hcCddLCBwa2c6IFBhY2thZ2VTdGF0ZSkge1xuICBsZXQgaW5zdGFuY2U7XG4gIGlmIChfLmhhcyhtb2R1bGVNYXAsIHBrZy5uYW1lKSkge1xuICAgIGluc3RhbmNlID0gbW9kdWxlTWFwW3BrZy5uYW1lXTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBwYXJzZWQgPSBwYXJzZU5hbWUocGtnLm5hbWUpO1xuICAgIC8vIFRoZXJlIGFyZSBhbHNvIG5vZGUgcGFja2FnZXNcbiAgICBpbnN0YW5jZSA9IG5ldyBQYWNrYWdlSW5zdGFuY2Uoe1xuICAgICAgbW9kdWxlTmFtZTogcGtnLm5hbWUsXG4gICAgICBzaG9ydE5hbWU6IHBhcnNlZC5uYW1lLFxuICAgICAgbmFtZTogcGtnLm5hbWUsXG4gICAgICBsb25nTmFtZTogcGtnLm5hbWUsXG4gICAgICBzY29wZTogcGtnLnNjb3BlLFxuICAgICAgcGF0aDogUGF0aC5yZXNvbHZlKHdvcmtEaXIsIHBrZy5wYXRoKSxcbiAgICAgIGpzb246IHBrZy5qc29uLFxuICAgICAgcmVhbFBhdGg6IHBrZy5yZWFsUGF0aFxuICAgIH0pO1xuICB9XG4gIG1vZHVsZU1hcFtpbnN0YW5jZS5sb25nTmFtZV0gPSBpbnN0YW5jZTtcbn1cblxuLy8gZnVuY3Rpb24gdHJpbU5vUGFyc2VTZXR0aW5nKHA6IHN0cmluZykge1xuLy8gICBwID0gcC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4vLyAgIGlmIChwLnN0YXJ0c1dpdGgoJy4vJykpIHtcbi8vICAgICBwID0gcC5zdWJzdHJpbmcoMik7XG4vLyAgIH1cbi8vICAgcmV0dXJuIHA7XG4vLyB9XG5cbmZ1bmN0aW9uIGNyZWF0ZVBhY2thZ2VEaXJUcmVlKHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbykge1xuICBjb25zdCB0cmVlID0gbmV3IERpclRyZWU8UGFja2FnZUluc3RhbmNlPigpO1xuICBsZXQgY291bnQgPSAwO1xuICBwYWNrYWdlSW5mby5hbGxNb2R1bGVzLmZvckVhY2gocGtnID0+IHtcbiAgICBpZiAocGtnID09IG51bGwpXG4gICAgICByZXR1cm47XG5cbiAgICBpZiAocGtnLnJlYWxQYXRoKSB7XG4gICAgICB0cmVlLnB1dERhdGEocGtnLnJlYWxQYXRoLCBwa2cpO1xuICAgIH1cbiAgICAvLyBEb24ndCB0cnVzdCBwa2cucGF0aCwgaXQgaXMgc2V0IGJ5IGNvbW1hbmQgbGluZTogcGxpbmsgc3luYy9pbml0LCBhbmQgbG9hZGVkIGZyb20gc3RhdGUgZmlsZSxcbiAgICAvLyB3aGljaCBpcyBub3QgdXAtdG8tZGF0ZXMuXG4gICAgdHJlZS5wdXREYXRhKFBhdGgucmVzb2x2ZSh3b3JrRGlyLCBzeW1saW5rRGlyTmFtZSwgcGtnLm5hbWUpLCBwa2cpO1xuICAgIC8vIGlmIChwa2cucGF0aCAhPT0gcGtnLnJlYWxQYXRoKSB7XG4gICAgLy8gICB0cmVlLnB1dERhdGEoUGF0aC5yZXNvbHZlKHdvcmtEaXIsIHN5bWxpbmtEaXJOYW1lLCBwa2cubmFtZSksIHBrZyk7XG4gICAgLy8gfVxuICAgIC8vIGlmIChwa2cubmFtZSA9PT0gJ0Biay90cmFkZS1hZ2dyJykge1xuICAgIC8vICAgaW5zcGVjdG9yLm9wZW4oOTIyMiwgJ2xvY2FsaG9zdCcsIHRydWUpO1xuICAgIC8vICAgZGVidWdnZXI7XG4gICAgLy8gfVxuICAgIGNvdW50Kys7XG4gIH0pO1xuICBsb2cuaW5mbygnJXMgUGxpbmsgY29tcGxpYW50IG5vZGUgcGFja2FnZXMgZm91bmQnLCBjb3VudCk7XG4gIHBhY2thZ2VJbmZvLmRpclRyZWUgPSB0cmVlO1xufVxuXG4iXX0=