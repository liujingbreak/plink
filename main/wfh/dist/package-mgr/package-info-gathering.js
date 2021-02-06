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
const log = log4js_1.getLogger('plink.package-info-gathering');
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
    log.info('%s Plink compliant node packages found', count);
    packageInfo.dirTree = tree;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1pbmZvLWdhdGhlcmluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL3BhY2thZ2UtaW5mby1nYXRoZXJpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDBDQUE0QjtBQUM1QixtQ0FBaUM7QUFDakMsNkRBQXVEO0FBQ3ZELGlGQUFxRDtBQWE3QywwQkFiRCw2QkFBZSxDQWFDO0FBWnZCLCtEQUF5RDtBQUV6RCxpRUFBaUQ7QUFDakQsd0NBQW1EO0FBQ25ELE1BQU0sR0FBRyxHQUFHLGtCQUFTLENBQUMsOEJBQThCLENBQUMsQ0FBQztBQVV0RCxJQUFJLFdBQXdCLENBQUM7QUFDN0I7Ozs7Ozs7R0FPRztBQUNILFNBQWdCLFlBQVk7SUFDMUIsSUFBSSxXQUFXO1FBQ2IsT0FBTyxXQUFXLENBQUM7SUFDckIsR0FBRyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO0lBQ3BDLFdBQVcsR0FBRyxhQUFhLEVBQUUsQ0FBQztJQUM5QixvQkFBb0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNsQyxPQUFPLFdBQVcsQ0FBQztBQUNyQixDQUFDO0FBUEQsb0NBT0M7QUFFRCxTQUFTLGFBQWE7SUFDcEIsTUFBTSxJQUFJLEdBQWdCO1FBQ3hCLElBQUksVUFBVTtZQUNaLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdkMsQ0FBQztRQUNELFNBQVMsRUFBRSxFQUFFO1FBQ2IsT0FBTyxFQUFFLElBQTJDO0tBQ3JELENBQUM7SUFFRixLQUFLLE1BQU0sRUFBRSxJQUFJLHdDQUFrQixFQUFFLEVBQUU7UUFDckMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQzVCO0lBRUQsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxJQUFpQixFQUFFLEdBQWlCO0lBQzVELElBQUksUUFBUSxDQUFDO0lBQ2IsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ25DLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUNyQztTQUFNO1FBQ0wsTUFBTSxNQUFNLEdBQUcsZ0NBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkMsK0JBQStCO1FBQy9CLFFBQVEsR0FBRyxJQUFJLDZCQUFlLENBQUM7WUFDN0IsVUFBVSxFQUFFLEdBQUcsQ0FBQyxJQUFJO1lBQ3BCLFNBQVMsRUFBRSxNQUFNLENBQUMsSUFBSTtZQUN0QixJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUk7WUFDZCxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUk7WUFDbEIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxLQUFLO1lBQ2hCLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSTtZQUNkLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSTtZQUNkLFFBQVEsRUFBRSxHQUFHLENBQUMsUUFBUTtTQUN2QixDQUFDLENBQUM7S0FDSjtJQUNELElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLFFBQVEsQ0FBQztBQUMvQyxDQUFDO0FBRUQsMkNBQTJDO0FBQzNDLCtCQUErQjtBQUMvQiw4QkFBOEI7QUFDOUIsMEJBQTBCO0FBQzFCLE1BQU07QUFDTixjQUFjO0FBQ2QsSUFBSTtBQUVKLFNBQVMsb0JBQW9CLENBQUMsV0FBd0I7SUFDcEQsTUFBTSxJQUFJLEdBQUcsSUFBSSxrQkFBTyxFQUFtQixDQUFDO0lBQzVDLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQztJQUNkLFdBQVcsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxFQUFFO1FBQzlDLElBQUksY0FBYyxJQUFJLElBQUk7WUFDeEIsT0FBTztRQUNULElBQUksY0FBYyxDQUFDLFFBQVE7WUFDekIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ3hELE1BQU0sT0FBTyxHQUFHLDJCQUFvQixDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM5RCxJQUFJLE9BQU8sSUFBSSxPQUFPLEtBQUssY0FBYyxDQUFDLFFBQVE7WUFDaEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDeEMsS0FBSyxFQUFFLENBQUM7SUFDVixDQUFDLENBQUMsQ0FBQztJQUNILEdBQUcsQ0FBQyxJQUFJLENBQUMsd0NBQXdDLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDMUQsV0FBVyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7QUFDN0IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtEaXJUcmVlfSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvZGlyLXRyZWUnO1xuaW1wb3J0IFBhY2thZ2VJbnN0YW5jZSBmcm9tICcuLi9wYWNrYWdlTm9kZUluc3RhbmNlJztcbmltcG9ydCB7cGFja2FnZXM0V29ya3NwYWNlfSBmcm9tICcuL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IHtQYWNrYWdlSW5mbyBhcyBQYWNrYWdlU3RhdGV9IGZyb20gJy4vaW5kZXgnO1xuaW1wb3J0IHtwYXJzZU5hbWV9IGZyb20gJy4vbGF6eS1wYWNrYWdlLWZhY3RvcnknO1xuaW1wb3J0IHtnZXRTeW1saW5rRm9yUGFja2FnZX0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLnBhY2thZ2UtaW5mby1nYXRoZXJpbmcnKTtcblxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlSW5mbyB7XG4gIGFsbE1vZHVsZXM6IFBhY2thZ2VJbnN0YW5jZVtdO1xuICBkaXJUcmVlOiBEaXJUcmVlPFBhY2thZ2VJbnN0YW5jZT47XG4gIG1vZHVsZU1hcDoge1tuYW1lOiBzdHJpbmddOiBQYWNrYWdlSW5zdGFuY2V9O1xufVxuXG5leHBvcnQge1BhY2thZ2VJbnN0YW5jZX07XG5cbmxldCBwYWNrYWdlSW5mbzogUGFja2FnZUluZm87XG4vKipcbiAqIHdhbGtQYWNrYWdlc1xuICogQHBhcmFtIHsqfSBjb25maWcgXG4gKiBAcGFyYW0geyp9IGFyZ3YgXG4gKiBAcGFyYW0geyp9IHBhY2thZ2VVdGlscyBcbiAqIEBwYXJhbSB7Kn0gaWdub3JlQ2FjaGVcbiAqIEByZXR1cm4ge1BhY2thZ2VJbmZvfVxuICovXG5leHBvcnQgZnVuY3Rpb24gd2Fsa1BhY2thZ2VzKCkge1xuICBpZiAocGFja2FnZUluZm8pXG4gICAgcmV0dXJuIHBhY2thZ2VJbmZvO1xuICBsb2cuZGVidWcoJ3NjYW4gZm9yIHBhY2thZ2VzIGluZm8nKTtcbiAgcGFja2FnZUluZm8gPSBfd2Fsa1BhY2thZ2VzKCk7XG4gIGNyZWF0ZVBhY2thZ2VEaXJUcmVlKHBhY2thZ2VJbmZvKTtcbiAgcmV0dXJuIHBhY2thZ2VJbmZvO1xufVxuXG5mdW5jdGlvbiBfd2Fsa1BhY2thZ2VzKCk6IFBhY2thZ2VJbmZvIHtcbiAgY29uc3QgaW5mbzogUGFja2FnZUluZm8gPSB7XG4gICAgZ2V0IGFsbE1vZHVsZXMoKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LnZhbHVlcyhpbmZvLm1vZHVsZU1hcCk7XG4gICAgfSwgLy8gYXJyYXlcbiAgICBtb2R1bGVNYXA6IHt9LFxuICAgIGRpclRyZWU6IG51bGwgYXMgdW5rbm93biBhcyBEaXJUcmVlPFBhY2thZ2VJbnN0YW5jZT5cbiAgfTtcblxuICBmb3IgKGNvbnN0IHBrIG9mIHBhY2thZ2VzNFdvcmtzcGFjZSgpKSB7XG4gICAgYWRkUGFja2FnZVRvSW5mbyhpbmZvLCBwayk7XG4gIH1cblxuICByZXR1cm4gaW5mbztcbn1cblxuZnVuY3Rpb24gYWRkUGFja2FnZVRvSW5mbyhpbmZvOiBQYWNrYWdlSW5mbywgcGtnOiBQYWNrYWdlU3RhdGUpIHtcbiAgbGV0IGluc3RhbmNlO1xuICBpZiAoXy5oYXMoaW5mby5tb2R1bGVNYXAsIHBrZy5uYW1lKSkge1xuICAgIGluc3RhbmNlID0gaW5mby5tb2R1bGVNYXBbcGtnLm5hbWVdO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IHBhcnNlZCA9IHBhcnNlTmFtZShwa2cubmFtZSk7XG4gICAgLy8gVGhlcmUgYXJlIGFsc28gbm9kZSBwYWNrYWdlc1xuICAgIGluc3RhbmNlID0gbmV3IFBhY2thZ2VJbnN0YW5jZSh7XG4gICAgICBtb2R1bGVOYW1lOiBwa2cubmFtZSxcbiAgICAgIHNob3J0TmFtZTogcGFyc2VkLm5hbWUsXG4gICAgICBuYW1lOiBwa2cubmFtZSxcbiAgICAgIGxvbmdOYW1lOiBwa2cubmFtZSxcbiAgICAgIHNjb3BlOiBwa2cuc2NvcGUsXG4gICAgICBwYXRoOiBwa2cucGF0aCxcbiAgICAgIGpzb246IHBrZy5qc29uLFxuICAgICAgcmVhbFBhdGg6IHBrZy5yZWFsUGF0aFxuICAgIH0pO1xuICB9XG4gIGluZm8ubW9kdWxlTWFwW2luc3RhbmNlLmxvbmdOYW1lXSA9IGluc3RhbmNlO1xufVxuXG4vLyBmdW5jdGlvbiB0cmltTm9QYXJzZVNldHRpbmcocDogc3RyaW5nKSB7XG4vLyAgIHAgPSBwLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbi8vICAgaWYgKHAuc3RhcnRzV2l0aCgnLi8nKSkge1xuLy8gICAgIHAgPSBwLnN1YnN0cmluZygyKTtcbi8vICAgfVxuLy8gICByZXR1cm4gcDtcbi8vIH1cblxuZnVuY3Rpb24gY3JlYXRlUGFja2FnZURpclRyZWUocGFja2FnZUluZm86IFBhY2thZ2VJbmZvKSB7XG4gIGNvbnN0IHRyZWUgPSBuZXcgRGlyVHJlZTxQYWNrYWdlSW5zdGFuY2U+KCk7XG4gIHZhciBjb3VudCA9IDA7XG4gIHBhY2thZ2VJbmZvLmFsbE1vZHVsZXMuZm9yRWFjaChtb2R1bGVJbnN0YW5jZSA9PiB7XG4gICAgaWYgKG1vZHVsZUluc3RhbmNlID09IG51bGwpXG4gICAgICByZXR1cm47XG4gICAgaWYgKG1vZHVsZUluc3RhbmNlLnJlYWxQYXRoKVxuICAgICAgdHJlZS5wdXREYXRhKG1vZHVsZUluc3RhbmNlLnJlYWxQYXRoLCBtb2R1bGVJbnN0YW5jZSk7XG4gICAgY29uc3Qgc3ltbGluayA9IGdldFN5bWxpbmtGb3JQYWNrYWdlKG1vZHVsZUluc3RhbmNlLmxvbmdOYW1lKTtcbiAgICBpZiAoc3ltbGluayAmJiBzeW1saW5rICE9PSBtb2R1bGVJbnN0YW5jZS5yZWFsUGF0aClcbiAgICAgIHRyZWUucHV0RGF0YShzeW1saW5rLCBtb2R1bGVJbnN0YW5jZSk7XG4gICAgY291bnQrKztcbiAgfSk7XG4gIGxvZy5pbmZvKCclcyBQbGluayBjb21wbGlhbnQgbm9kZSBwYWNrYWdlcyBmb3VuZCcsIGNvdW50KTtcbiAgcGFja2FnZUluZm8uZGlyVHJlZSA9IHRyZWU7XG59XG5cbiJdfQ==