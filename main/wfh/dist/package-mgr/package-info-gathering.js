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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1pbmZvLWdhdGhlcmluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL3BhY2thZ2UtaW5mby1nYXRoZXJpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDBDQUE0QjtBQUM1QixtQ0FBaUM7QUFDakMsNkRBQXVEO0FBQ3ZELGlGQUFxRDtBQWdCN0MsMEJBaEJELDZCQUFlLENBZ0JDO0FBZnZCLCtEQUF5RDtBQUV6RCxpRUFBaUQ7QUFDakQsd0NBQXVDO0FBQ3ZDLDBEQUE0QjtBQUM1QixnREFBd0I7QUFFeEIsTUFBTSxHQUFHLEdBQUcsa0JBQVMsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO0FBQ3RELE1BQU0sRUFBQyxPQUFPLEVBQUUsY0FBYyxFQUFDLEdBQUcsZUFBUSxDQUFDO0FBUzNDLElBQUksdUJBR1MsQ0FBQztBQUNkLGdDQUFnQztBQUNoQzs7Ozs7OztHQU9HO0FBRUgsU0FBZ0Isb0JBQW9CO0lBQ2xDLElBQUksdUJBQXVCLEVBQUU7UUFDM0IsT0FBTyx1QkFBdUIsQ0FBQztLQUNoQztJQUNELE1BQU0sS0FBSyxHQUFHLElBQUksbUJBQUcsQ0FBMEIsRUFBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDO0lBQ3pFLE1BQU0sV0FBVyxHQUFnQixZQUFZLEVBQUUsQ0FBQztJQUVoRCxTQUFTLFlBQVksQ0FBQyxJQUFZO1FBQ2hDLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDNUIsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNWLEtBQUssR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNuRCxJQUFJLEtBQUs7Z0JBQ1AsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDMUI7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUM7SUFDRCx1QkFBdUIsR0FBRyxFQUFDLFdBQVcsRUFBRSxZQUFZLEVBQUMsQ0FBQztJQUN0RCxPQUFPLHVCQUF1QixDQUFDO0FBQ2pDLENBQUM7QUFsQkQsb0RBa0JDO0FBRUQsU0FBZ0IsWUFBWTtJQUMxQixtQkFBbUI7SUFDbkIsd0JBQXdCO0lBQ3hCLEdBQUcsQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQztJQUNwQyxNQUFNLFdBQVcsR0FBZ0I7UUFDL0IsSUFBSSxVQUFVO1lBQ1osT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUM5QyxDQUFDO1FBQ0QsU0FBUyxFQUFFLEVBQUU7UUFDYixPQUFPLEVBQUUsSUFBMkM7S0FDckQsQ0FBQztJQUVGLEtBQUssTUFBTSxFQUFFLElBQUksd0NBQWtCLEVBQUUsRUFBRTtRQUNyQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQzdDO0lBQ0Qsb0JBQW9CLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDbEMsT0FBTyxXQUFXLENBQUM7QUFDckIsQ0FBQztBQWpCRCxvQ0FpQkM7QUFHRCxTQUFTLGdCQUFnQixDQUFDLFNBQW1DLEVBQUUsR0FBaUI7SUFDOUUsSUFBSSxRQUFRLENBQUM7SUFDYixJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUM5QixRQUFRLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUNoQztTQUFNO1FBQ0wsTUFBTSxNQUFNLEdBQUcsZ0NBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkMsK0JBQStCO1FBQy9CLFFBQVEsR0FBRyxJQUFJLDZCQUFlLENBQUM7WUFDN0IsVUFBVSxFQUFFLEdBQUcsQ0FBQyxJQUFJO1lBQ3BCLFNBQVMsRUFBRSxNQUFNLENBQUMsSUFBSTtZQUN0QixJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUk7WUFDZCxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUk7WUFDbEIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxLQUFLO1lBQ2hCLElBQUksRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDO1lBQ3JDLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSTtZQUNkLFFBQVEsRUFBRSxHQUFHLENBQUMsUUFBUTtTQUN2QixDQUFDLENBQUM7S0FDSjtJQUNELFNBQVMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsUUFBUSxDQUFDO0FBQzFDLENBQUM7QUFFRCwyQ0FBMkM7QUFDM0MsK0JBQStCO0FBQy9CLDhCQUE4QjtBQUM5QiwwQkFBMEI7QUFDMUIsTUFBTTtBQUNOLGNBQWM7QUFDZCxJQUFJO0FBRUosU0FBUyxvQkFBb0IsQ0FBQyxXQUF3QjtJQUNwRCxNQUFNLElBQUksR0FBRyxJQUFJLGtCQUFPLEVBQW1CLENBQUM7SUFDNUMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO0lBQ2QsV0FBVyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDbkMsSUFBSSxHQUFHLElBQUksSUFBSTtZQUNiLE9BQU87UUFFVCxJQUFJLEdBQUcsQ0FBQyxRQUFRLEVBQUU7WUFDaEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1NBQ2pDO1FBQ0QsZ0dBQWdHO1FBQ2hHLDRCQUE0QjtRQUM1QixJQUFJLENBQUMsT0FBTyxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLGNBQWMsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDbkUsbUNBQW1DO1FBQ25DLHdFQUF3RTtRQUN4RSxJQUFJO1FBQ0osS0FBSyxFQUFFLENBQUM7SUFDVixDQUFDLENBQUMsQ0FBQztJQUNILEdBQUcsQ0FBQyxJQUFJLENBQUMsd0NBQXdDLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDMUQsV0FBVyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7QUFDN0IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtEaXJUcmVlfSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvZGlyLXRyZWUnO1xuaW1wb3J0IFBhY2thZ2VJbnN0YW5jZSBmcm9tICcuLi9wYWNrYWdlTm9kZUluc3RhbmNlJztcbmltcG9ydCB7cGFja2FnZXM0V29ya3NwYWNlfSBmcm9tICcuL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IHtQYWNrYWdlSW5mbyBhcyBQYWNrYWdlU3RhdGV9IGZyb20gJy4vaW5kZXgnO1xuaW1wb3J0IHtwYXJzZU5hbWV9IGZyb20gJy4vbGF6eS1wYWNrYWdlLWZhY3RvcnknO1xuaW1wb3J0IHtwbGlua0Vudn0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5pbXBvcnQgTFJVIGZyb20gJ2xydS1jYWNoZSc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcblxuY29uc3QgbG9nID0gZ2V0TG9nZ2VyKCdwbGluay5wYWNrYWdlLWluZm8tZ2F0aGVyaW5nJyk7XG5jb25zdCB7d29ya0Rpciwgc3ltbGlua0Rpck5hbWV9ID0gcGxpbmtFbnY7XG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VJbmZvIHtcbiAgYWxsTW9kdWxlczogUGFja2FnZUluc3RhbmNlW107XG4gIGRpclRyZWU6IERpclRyZWU8UGFja2FnZUluc3RhbmNlPjtcbiAgbW9kdWxlTWFwOiB7W25hbWU6IHN0cmluZ106IFBhY2thZ2VJbnN0YW5jZX07XG59XG5cbmV4cG9ydCB7UGFja2FnZUluc3RhbmNlfTtcblxubGV0IGV4aXN0aW5nRmlsZVRvUGtnSGVscGVyOiB7XG4gIHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbztcbiAgZ2V0UGtnT2ZGaWxlKGZpbGU6IHN0cmluZyk6IFBhY2thZ2VJbnN0YW5jZSB8IHVuZGVmaW5lZDtcbn0gfCB1bmRlZmluZWQ7XG4vLyBsZXQgcGFja2FnZUluZm86IFBhY2thZ2VJbmZvO1xuLyoqXG4gKiB3YWxrUGFja2FnZXNcbiAqIEBwYXJhbSB7Kn0gY29uZmlnIFxuICogQHBhcmFtIHsqfSBhcmd2IFxuICogQHBhcmFtIHsqfSBwYWNrYWdlVXRpbHMgXG4gKiBAcGFyYW0geyp9IGlnbm9yZUNhY2hlXG4gKiBAcmV0dXJuIHtQYWNrYWdlSW5mb31cbiAqL1xuXG5leHBvcnQgZnVuY3Rpb24gcGFja2FnZU9mRmlsZUZhY3RvcnkoKSB7XG4gIGlmIChleGlzdGluZ0ZpbGVUb1BrZ0hlbHBlcikge1xuICAgIHJldHVybiBleGlzdGluZ0ZpbGVUb1BrZ0hlbHBlcjtcbiAgfVxuICBjb25zdCBjYWNoZSA9IG5ldyBMUlU8c3RyaW5nLCBQYWNrYWdlSW5zdGFuY2U+KHttYXg6IDIwLCBtYXhBZ2U6IDIwMDAwfSk7XG4gIGNvbnN0IHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbyA9IHdhbGtQYWNrYWdlcygpO1xuXG4gIGZ1bmN0aW9uIGdldFBrZ09mRmlsZShmaWxlOiBzdHJpbmcpOiBQYWNrYWdlSW5zdGFuY2UgfCB1bmRlZmluZWQge1xuICAgIHZhciBmb3VuZCA9IGNhY2hlLmdldChmaWxlKTtcbiAgICBpZiAoIWZvdW5kKSB7XG4gICAgICBmb3VuZCA9IHBhY2thZ2VJbmZvLmRpclRyZWUuZ2V0QWxsRGF0YShmaWxlKS5wb3AoKTtcbiAgICAgIGlmIChmb3VuZClcbiAgICAgICAgY2FjaGUuc2V0KGZpbGUsIGZvdW5kKTtcbiAgICB9XG4gICAgcmV0dXJuIGZvdW5kO1xuICB9XG4gIGV4aXN0aW5nRmlsZVRvUGtnSGVscGVyID0ge3BhY2thZ2VJbmZvLCBnZXRQa2dPZkZpbGV9O1xuICByZXR1cm4gZXhpc3RpbmdGaWxlVG9Qa2dIZWxwZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB3YWxrUGFja2FnZXMoKSB7XG4gIC8vIGlmIChwYWNrYWdlSW5mbylcbiAgLy8gICByZXR1cm4gcGFja2FnZUluZm87XG4gIGxvZy5kZWJ1Zygnc2NhbiBmb3IgcGFja2FnZXMgaW5mbycpO1xuICBjb25zdCBwYWNrYWdlSW5mbzogUGFja2FnZUluZm8gPSB7XG4gICAgZ2V0IGFsbE1vZHVsZXMoKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LnZhbHVlcyhwYWNrYWdlSW5mby5tb2R1bGVNYXApO1xuICAgIH0sIC8vIGFycmF5XG4gICAgbW9kdWxlTWFwOiB7fSxcbiAgICBkaXJUcmVlOiBudWxsIGFzIHVua25vd24gYXMgRGlyVHJlZTxQYWNrYWdlSW5zdGFuY2U+XG4gIH07XG5cbiAgZm9yIChjb25zdCBwayBvZiBwYWNrYWdlczRXb3Jrc3BhY2UoKSkge1xuICAgIGFkZFBhY2thZ2VUb0luZm8ocGFja2FnZUluZm8ubW9kdWxlTWFwLCBwayk7XG4gIH1cbiAgY3JlYXRlUGFja2FnZURpclRyZWUocGFja2FnZUluZm8pO1xuICByZXR1cm4gcGFja2FnZUluZm87XG59XG5cblxuZnVuY3Rpb24gYWRkUGFja2FnZVRvSW5mbyhtb2R1bGVNYXA6IFBhY2thZ2VJbmZvWydtb2R1bGVNYXAnXSwgcGtnOiBQYWNrYWdlU3RhdGUpIHtcbiAgbGV0IGluc3RhbmNlO1xuICBpZiAoXy5oYXMobW9kdWxlTWFwLCBwa2cubmFtZSkpIHtcbiAgICBpbnN0YW5jZSA9IG1vZHVsZU1hcFtwa2cubmFtZV07XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgcGFyc2VkID0gcGFyc2VOYW1lKHBrZy5uYW1lKTtcbiAgICAvLyBUaGVyZSBhcmUgYWxzbyBub2RlIHBhY2thZ2VzXG4gICAgaW5zdGFuY2UgPSBuZXcgUGFja2FnZUluc3RhbmNlKHtcbiAgICAgIG1vZHVsZU5hbWU6IHBrZy5uYW1lLFxuICAgICAgc2hvcnROYW1lOiBwYXJzZWQubmFtZSxcbiAgICAgIG5hbWU6IHBrZy5uYW1lLFxuICAgICAgbG9uZ05hbWU6IHBrZy5uYW1lLFxuICAgICAgc2NvcGU6IHBrZy5zY29wZSxcbiAgICAgIHBhdGg6IFBhdGgucmVzb2x2ZSh3b3JrRGlyLCBwa2cucGF0aCksXG4gICAgICBqc29uOiBwa2cuanNvbixcbiAgICAgIHJlYWxQYXRoOiBwa2cucmVhbFBhdGhcbiAgICB9KTtcbiAgfVxuICBtb2R1bGVNYXBbaW5zdGFuY2UubG9uZ05hbWVdID0gaW5zdGFuY2U7XG59XG5cbi8vIGZ1bmN0aW9uIHRyaW1Ob1BhcnNlU2V0dGluZyhwOiBzdHJpbmcpIHtcbi8vICAgcCA9IHAucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuLy8gICBpZiAocC5zdGFydHNXaXRoKCcuLycpKSB7XG4vLyAgICAgcCA9IHAuc3Vic3RyaW5nKDIpO1xuLy8gICB9XG4vLyAgIHJldHVybiBwO1xuLy8gfVxuXG5mdW5jdGlvbiBjcmVhdGVQYWNrYWdlRGlyVHJlZShwYWNrYWdlSW5mbzogUGFja2FnZUluZm8pIHtcbiAgY29uc3QgdHJlZSA9IG5ldyBEaXJUcmVlPFBhY2thZ2VJbnN0YW5jZT4oKTtcbiAgbGV0IGNvdW50ID0gMDtcbiAgcGFja2FnZUluZm8uYWxsTW9kdWxlcy5mb3JFYWNoKHBrZyA9PiB7XG4gICAgaWYgKHBrZyA9PSBudWxsKVxuICAgICAgcmV0dXJuO1xuXG4gICAgaWYgKHBrZy5yZWFsUGF0aCkge1xuICAgICAgdHJlZS5wdXREYXRhKHBrZy5yZWFsUGF0aCwgcGtnKTtcbiAgICB9XG4gICAgLy8gRG9uJ3QgdHJ1c3QgcGtnLnBhdGgsIGl0IGlzIHNldCBieSBjb21tYW5kIGxpbmU6IHBsaW5rIHN5bmMvaW5pdCwgYW5kIGxvYWRlZCBmcm9tIHN0YXRlIGZpbGUsXG4gICAgLy8gd2hpY2ggaXMgbm90IHVwLXRvLWRhdGVzLlxuICAgIHRyZWUucHV0RGF0YShQYXRoLnJlc29sdmUod29ya0Rpciwgc3ltbGlua0Rpck5hbWUsIHBrZy5uYW1lKSwgcGtnKTtcbiAgICAvLyBpZiAocGtnLnBhdGggIT09IHBrZy5yZWFsUGF0aCkge1xuICAgIC8vICAgdHJlZS5wdXREYXRhKFBhdGgucmVzb2x2ZSh3b3JrRGlyLCBzeW1saW5rRGlyTmFtZSwgcGtnLm5hbWUpLCBwa2cpO1xuICAgIC8vIH1cbiAgICBjb3VudCsrO1xuICB9KTtcbiAgbG9nLmluZm8oJyVzIFBsaW5rIGNvbXBsaWFudCBub2RlIHBhY2thZ2VzIGZvdW5kJywgY291bnQpO1xuICBwYWNrYWdlSW5mby5kaXJUcmVlID0gdHJlZTtcbn1cblxuIl19