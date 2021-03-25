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
    packageInfo.allModules.forEach(pkg => {
        if (pkg == null)
            return;
        if (pkg.realPath)
            tree.putData(pkg.realPath, pkg);
        // const symlink = getSymlinkForPackage(pkg.longName);
        // log.warn(pkg.path);
        if (pkg.path !== pkg.realPath)
            tree.putData(pkg.path, pkg);
        count++;
    });
    log.info('%s Plink compliant node packages found', count);
    packageInfo.dirTree = tree;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1pbmZvLWdhdGhlcmluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL3BhY2thZ2UtaW5mby1nYXRoZXJpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDBDQUE0QjtBQUM1QixtQ0FBaUM7QUFDakMsNkRBQXVEO0FBQ3ZELGlGQUFxRDtBQVk3QywwQkFaRCw2QkFBZSxDQVlDO0FBWHZCLCtEQUF5RDtBQUV6RCxpRUFBaUQ7QUFDakQsTUFBTSxHQUFHLEdBQUcsa0JBQVMsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO0FBVXRELElBQUksV0FBd0IsQ0FBQztBQUM3Qjs7Ozs7OztHQU9HO0FBQ0gsU0FBZ0IsWUFBWTtJQUMxQixJQUFJLFdBQVc7UUFDYixPQUFPLFdBQVcsQ0FBQztJQUNyQixHQUFHLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUM7SUFDcEMsV0FBVyxHQUFHLGFBQWEsRUFBRSxDQUFDO0lBQzlCLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ2xDLE9BQU8sV0FBVyxDQUFDO0FBQ3JCLENBQUM7QUFQRCxvQ0FPQztBQUVELFNBQVMsYUFBYTtJQUNwQixNQUFNLElBQUksR0FBZ0I7UUFDeEIsSUFBSSxVQUFVO1lBQ1osT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN2QyxDQUFDO1FBQ0QsU0FBUyxFQUFFLEVBQUU7UUFDYixPQUFPLEVBQUUsSUFBMkM7S0FDckQsQ0FBQztJQUVGLEtBQUssTUFBTSxFQUFFLElBQUksd0NBQWtCLEVBQUUsRUFBRTtRQUNyQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7S0FDNUI7SUFFRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUM7QUFFRCxTQUFTLGdCQUFnQixDQUFDLElBQWlCLEVBQUUsR0FBaUI7SUFDNUQsSUFBSSxRQUFRLENBQUM7SUFDYixJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDbkMsUUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ3JDO1NBQU07UUFDTCxNQUFNLE1BQU0sR0FBRyxnQ0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuQywrQkFBK0I7UUFDL0IsUUFBUSxHQUFHLElBQUksNkJBQWUsQ0FBQztZQUM3QixVQUFVLEVBQUUsR0FBRyxDQUFDLElBQUk7WUFDcEIsU0FBUyxFQUFFLE1BQU0sQ0FBQyxJQUFJO1lBQ3RCLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSTtZQUNkLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSTtZQUNsQixLQUFLLEVBQUUsR0FBRyxDQUFDLEtBQUs7WUFDaEIsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJO1lBQ2QsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJO1lBQ2QsUUFBUSxFQUFFLEdBQUcsQ0FBQyxRQUFRO1NBQ3ZCLENBQUMsQ0FBQztLQUNKO0lBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsUUFBUSxDQUFDO0FBQy9DLENBQUM7QUFFRCwyQ0FBMkM7QUFDM0MsK0JBQStCO0FBQy9CLDhCQUE4QjtBQUM5QiwwQkFBMEI7QUFDMUIsTUFBTTtBQUNOLGNBQWM7QUFDZCxJQUFJO0FBRUosU0FBUyxvQkFBb0IsQ0FBQyxXQUF3QjtJQUNwRCxNQUFNLElBQUksR0FBRyxJQUFJLGtCQUFPLEVBQW1CLENBQUM7SUFDNUMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO0lBQ2QsV0FBVyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDbkMsSUFBSSxHQUFHLElBQUksSUFBSTtZQUNiLE9BQU87UUFDVCxJQUFJLEdBQUcsQ0FBQyxRQUFRO1lBQ2QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2xDLHNEQUFzRDtRQUN0RCxzQkFBc0I7UUFDdEIsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxRQUFRO1lBQzNCLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUM5QixLQUFLLEVBQUUsQ0FBQztJQUNWLENBQUMsQ0FBQyxDQUFDO0lBQ0gsR0FBRyxDQUFDLElBQUksQ0FBQyx3Q0FBd0MsRUFBRSxLQUFLLENBQUMsQ0FBQztJQUMxRCxXQUFXLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQztBQUM3QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQge0RpclRyZWV9IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3IvZGlzdC9kaXItdHJlZSc7XG5pbXBvcnQgUGFja2FnZUluc3RhbmNlIGZyb20gJy4uL3BhY2thZ2VOb2RlSW5zdGFuY2UnO1xuaW1wb3J0IHtwYWNrYWdlczRXb3Jrc3BhY2V9IGZyb20gJy4vcGFja2FnZS1saXN0LWhlbHBlcic7XG5pbXBvcnQge1BhY2thZ2VJbmZvIGFzIFBhY2thZ2VTdGF0ZX0gZnJvbSAnLi9pbmRleCc7XG5pbXBvcnQge3BhcnNlTmFtZX0gZnJvbSAnLi9sYXp5LXBhY2thZ2UtZmFjdG9yeSc7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLnBhY2thZ2UtaW5mby1nYXRoZXJpbmcnKTtcblxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlSW5mbyB7XG4gIGFsbE1vZHVsZXM6IFBhY2thZ2VJbnN0YW5jZVtdO1xuICBkaXJUcmVlOiBEaXJUcmVlPFBhY2thZ2VJbnN0YW5jZT47XG4gIG1vZHVsZU1hcDoge1tuYW1lOiBzdHJpbmddOiBQYWNrYWdlSW5zdGFuY2V9O1xufVxuXG5leHBvcnQge1BhY2thZ2VJbnN0YW5jZX07XG5cbmxldCBwYWNrYWdlSW5mbzogUGFja2FnZUluZm87XG4vKipcbiAqIHdhbGtQYWNrYWdlc1xuICogQHBhcmFtIHsqfSBjb25maWcgXG4gKiBAcGFyYW0geyp9IGFyZ3YgXG4gKiBAcGFyYW0geyp9IHBhY2thZ2VVdGlscyBcbiAqIEBwYXJhbSB7Kn0gaWdub3JlQ2FjaGVcbiAqIEByZXR1cm4ge1BhY2thZ2VJbmZvfVxuICovXG5leHBvcnQgZnVuY3Rpb24gd2Fsa1BhY2thZ2VzKCkge1xuICBpZiAocGFja2FnZUluZm8pXG4gICAgcmV0dXJuIHBhY2thZ2VJbmZvO1xuICBsb2cuZGVidWcoJ3NjYW4gZm9yIHBhY2thZ2VzIGluZm8nKTtcbiAgcGFja2FnZUluZm8gPSBfd2Fsa1BhY2thZ2VzKCk7XG4gIGNyZWF0ZVBhY2thZ2VEaXJUcmVlKHBhY2thZ2VJbmZvKTtcbiAgcmV0dXJuIHBhY2thZ2VJbmZvO1xufVxuXG5mdW5jdGlvbiBfd2Fsa1BhY2thZ2VzKCk6IFBhY2thZ2VJbmZvIHtcbiAgY29uc3QgaW5mbzogUGFja2FnZUluZm8gPSB7XG4gICAgZ2V0IGFsbE1vZHVsZXMoKSB7XG4gICAgICByZXR1cm4gT2JqZWN0LnZhbHVlcyhpbmZvLm1vZHVsZU1hcCk7XG4gICAgfSwgLy8gYXJyYXlcbiAgICBtb2R1bGVNYXA6IHt9LFxuICAgIGRpclRyZWU6IG51bGwgYXMgdW5rbm93biBhcyBEaXJUcmVlPFBhY2thZ2VJbnN0YW5jZT5cbiAgfTtcblxuICBmb3IgKGNvbnN0IHBrIG9mIHBhY2thZ2VzNFdvcmtzcGFjZSgpKSB7XG4gICAgYWRkUGFja2FnZVRvSW5mbyhpbmZvLCBwayk7XG4gIH1cblxuICByZXR1cm4gaW5mbztcbn1cblxuZnVuY3Rpb24gYWRkUGFja2FnZVRvSW5mbyhpbmZvOiBQYWNrYWdlSW5mbywgcGtnOiBQYWNrYWdlU3RhdGUpIHtcbiAgbGV0IGluc3RhbmNlO1xuICBpZiAoXy5oYXMoaW5mby5tb2R1bGVNYXAsIHBrZy5uYW1lKSkge1xuICAgIGluc3RhbmNlID0gaW5mby5tb2R1bGVNYXBbcGtnLm5hbWVdO1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IHBhcnNlZCA9IHBhcnNlTmFtZShwa2cubmFtZSk7XG4gICAgLy8gVGhlcmUgYXJlIGFsc28gbm9kZSBwYWNrYWdlc1xuICAgIGluc3RhbmNlID0gbmV3IFBhY2thZ2VJbnN0YW5jZSh7XG4gICAgICBtb2R1bGVOYW1lOiBwa2cubmFtZSxcbiAgICAgIHNob3J0TmFtZTogcGFyc2VkLm5hbWUsXG4gICAgICBuYW1lOiBwa2cubmFtZSxcbiAgICAgIGxvbmdOYW1lOiBwa2cubmFtZSxcbiAgICAgIHNjb3BlOiBwa2cuc2NvcGUsXG4gICAgICBwYXRoOiBwa2cucGF0aCxcbiAgICAgIGpzb246IHBrZy5qc29uLFxuICAgICAgcmVhbFBhdGg6IHBrZy5yZWFsUGF0aFxuICAgIH0pO1xuICB9XG4gIGluZm8ubW9kdWxlTWFwW2luc3RhbmNlLmxvbmdOYW1lXSA9IGluc3RhbmNlO1xufVxuXG4vLyBmdW5jdGlvbiB0cmltTm9QYXJzZVNldHRpbmcocDogc3RyaW5nKSB7XG4vLyAgIHAgPSBwLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbi8vICAgaWYgKHAuc3RhcnRzV2l0aCgnLi8nKSkge1xuLy8gICAgIHAgPSBwLnN1YnN0cmluZygyKTtcbi8vICAgfVxuLy8gICByZXR1cm4gcDtcbi8vIH1cblxuZnVuY3Rpb24gY3JlYXRlUGFja2FnZURpclRyZWUocGFja2FnZUluZm86IFBhY2thZ2VJbmZvKSB7XG4gIGNvbnN0IHRyZWUgPSBuZXcgRGlyVHJlZTxQYWNrYWdlSW5zdGFuY2U+KCk7XG4gIHZhciBjb3VudCA9IDA7XG4gIHBhY2thZ2VJbmZvLmFsbE1vZHVsZXMuZm9yRWFjaChwa2cgPT4ge1xuICAgIGlmIChwa2cgPT0gbnVsbClcbiAgICAgIHJldHVybjtcbiAgICBpZiAocGtnLnJlYWxQYXRoKVxuICAgICAgdHJlZS5wdXREYXRhKHBrZy5yZWFsUGF0aCwgcGtnKTtcbiAgICAvLyBjb25zdCBzeW1saW5rID0gZ2V0U3ltbGlua0ZvclBhY2thZ2UocGtnLmxvbmdOYW1lKTtcbiAgICAvLyBsb2cud2Fybihwa2cucGF0aCk7XG4gICAgaWYgKHBrZy5wYXRoICE9PSBwa2cucmVhbFBhdGgpXG4gICAgICB0cmVlLnB1dERhdGEocGtnLnBhdGgsIHBrZyk7XG4gICAgY291bnQrKztcbiAgfSk7XG4gIGxvZy5pbmZvKCclcyBQbGluayBjb21wbGlhbnQgbm9kZSBwYWNrYWdlcyBmb3VuZCcsIGNvdW50KTtcbiAgcGFja2FnZUluZm8uZGlyVHJlZSA9IHRyZWU7XG59XG5cbiJdfQ==