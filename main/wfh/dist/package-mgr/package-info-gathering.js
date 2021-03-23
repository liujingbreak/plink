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
        if (pkg.path !== pkg.realPath)
            tree.putData(pkg.path, pkg);
        count++;
    });
    log.info('%s Plink compliant node packages found', count);
    packageInfo.dirTree = tree;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1pbmZvLWdhdGhlcmluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL3BhY2thZ2UtaW5mby1nYXRoZXJpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDBDQUE0QjtBQUM1QixtQ0FBaUM7QUFDakMsNkRBQXVEO0FBQ3ZELGlGQUFxRDtBQVk3QywwQkFaRCw2QkFBZSxDQVlDO0FBWHZCLCtEQUF5RDtBQUV6RCxpRUFBaUQ7QUFDakQsTUFBTSxHQUFHLEdBQUcsa0JBQVMsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO0FBVXRELElBQUksV0FBd0IsQ0FBQztBQUM3Qjs7Ozs7OztHQU9HO0FBQ0gsU0FBZ0IsWUFBWTtJQUMxQixJQUFJLFdBQVc7UUFDYixPQUFPLFdBQVcsQ0FBQztJQUNyQixHQUFHLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUM7SUFDcEMsV0FBVyxHQUFHLGFBQWEsRUFBRSxDQUFDO0lBQzlCLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ2xDLE9BQU8sV0FBVyxDQUFDO0FBQ3JCLENBQUM7QUFQRCxvQ0FPQztBQUVELFNBQVMsYUFBYTtJQUNwQixNQUFNLElBQUksR0FBZ0I7UUFDeEIsSUFBSSxVQUFVO1lBQ1osT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN2QyxDQUFDO1FBQ0QsU0FBUyxFQUFFLEVBQUU7UUFDYixPQUFPLEVBQUUsSUFBMkM7S0FDckQsQ0FBQztJQUVGLEtBQUssTUFBTSxFQUFFLElBQUksd0NBQWtCLEVBQUUsRUFBRTtRQUNyQyxnQkFBZ0IsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7S0FDNUI7SUFFRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUM7QUFFRCxTQUFTLGdCQUFnQixDQUFDLElBQWlCLEVBQUUsR0FBaUI7SUFDNUQsSUFBSSxRQUFRLENBQUM7SUFDYixJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDbkMsUUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ3JDO1NBQU07UUFDTCxNQUFNLE1BQU0sR0FBRyxnQ0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNuQywrQkFBK0I7UUFDL0IsUUFBUSxHQUFHLElBQUksNkJBQWUsQ0FBQztZQUM3QixVQUFVLEVBQUUsR0FBRyxDQUFDLElBQUk7WUFDcEIsU0FBUyxFQUFFLE1BQU0sQ0FBQyxJQUFJO1lBQ3RCLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSTtZQUNkLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSTtZQUNsQixLQUFLLEVBQUUsR0FBRyxDQUFDLEtBQUs7WUFDaEIsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJO1lBQ2QsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJO1lBQ2QsUUFBUSxFQUFFLEdBQUcsQ0FBQyxRQUFRO1NBQ3ZCLENBQUMsQ0FBQztLQUNKO0lBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEdBQUcsUUFBUSxDQUFDO0FBQy9DLENBQUM7QUFFRCwyQ0FBMkM7QUFDM0MsK0JBQStCO0FBQy9CLDhCQUE4QjtBQUM5QiwwQkFBMEI7QUFDMUIsTUFBTTtBQUNOLGNBQWM7QUFDZCxJQUFJO0FBRUosU0FBUyxvQkFBb0IsQ0FBQyxXQUF3QjtJQUNwRCxNQUFNLElBQUksR0FBRyxJQUFJLGtCQUFPLEVBQW1CLENBQUM7SUFDNUMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFDO0lBQ2QsV0FBVyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUU7UUFDbkMsSUFBSSxHQUFHLElBQUksSUFBSTtZQUNiLE9BQU87UUFDVCxJQUFJLEdBQUcsQ0FBQyxRQUFRO1lBQ2QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2xDLHNEQUFzRDtRQUN0RCxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssR0FBRyxDQUFDLFFBQVE7WUFDM0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzlCLEtBQUssRUFBRSxDQUFDO0lBQ1YsQ0FBQyxDQUFDLENBQUM7SUFDSCxHQUFHLENBQUMsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzFELFdBQVcsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO0FBQzdCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7RGlyVHJlZX0gZnJvbSAncmVxdWlyZS1pbmplY3Rvci9kaXN0L2Rpci10cmVlJztcbmltcG9ydCBQYWNrYWdlSW5zdGFuY2UgZnJvbSAnLi4vcGFja2FnZU5vZGVJbnN0YW5jZSc7XG5pbXBvcnQge3BhY2thZ2VzNFdvcmtzcGFjZX0gZnJvbSAnLi9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCB7UGFja2FnZUluZm8gYXMgUGFja2FnZVN0YXRlfSBmcm9tICcuL2luZGV4JztcbmltcG9ydCB7cGFyc2VOYW1lfSBmcm9tICcuL2xhenktcGFja2FnZS1mYWN0b3J5JztcbmNvbnN0IGxvZyA9IGdldExvZ2dlcigncGxpbmsucGFja2FnZS1pbmZvLWdhdGhlcmluZycpO1xuXG5leHBvcnQgaW50ZXJmYWNlIFBhY2thZ2VJbmZvIHtcbiAgYWxsTW9kdWxlczogUGFja2FnZUluc3RhbmNlW107XG4gIGRpclRyZWU6IERpclRyZWU8UGFja2FnZUluc3RhbmNlPjtcbiAgbW9kdWxlTWFwOiB7W25hbWU6IHN0cmluZ106IFBhY2thZ2VJbnN0YW5jZX07XG59XG5cbmV4cG9ydCB7UGFja2FnZUluc3RhbmNlfTtcblxubGV0IHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbztcbi8qKlxuICogd2Fsa1BhY2thZ2VzXG4gKiBAcGFyYW0geyp9IGNvbmZpZyBcbiAqIEBwYXJhbSB7Kn0gYXJndiBcbiAqIEBwYXJhbSB7Kn0gcGFja2FnZVV0aWxzIFxuICogQHBhcmFtIHsqfSBpZ25vcmVDYWNoZVxuICogQHJldHVybiB7UGFja2FnZUluZm99XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3YWxrUGFja2FnZXMoKSB7XG4gIGlmIChwYWNrYWdlSW5mbylcbiAgICByZXR1cm4gcGFja2FnZUluZm87XG4gIGxvZy5kZWJ1Zygnc2NhbiBmb3IgcGFja2FnZXMgaW5mbycpO1xuICBwYWNrYWdlSW5mbyA9IF93YWxrUGFja2FnZXMoKTtcbiAgY3JlYXRlUGFja2FnZURpclRyZWUocGFja2FnZUluZm8pO1xuICByZXR1cm4gcGFja2FnZUluZm87XG59XG5cbmZ1bmN0aW9uIF93YWxrUGFja2FnZXMoKTogUGFja2FnZUluZm8ge1xuICBjb25zdCBpbmZvOiBQYWNrYWdlSW5mbyA9IHtcbiAgICBnZXQgYWxsTW9kdWxlcygpIHtcbiAgICAgIHJldHVybiBPYmplY3QudmFsdWVzKGluZm8ubW9kdWxlTWFwKTtcbiAgICB9LCAvLyBhcnJheVxuICAgIG1vZHVsZU1hcDoge30sXG4gICAgZGlyVHJlZTogbnVsbCBhcyB1bmtub3duIGFzIERpclRyZWU8UGFja2FnZUluc3RhbmNlPlxuICB9O1xuXG4gIGZvciAoY29uc3QgcGsgb2YgcGFja2FnZXM0V29ya3NwYWNlKCkpIHtcbiAgICBhZGRQYWNrYWdlVG9JbmZvKGluZm8sIHBrKTtcbiAgfVxuXG4gIHJldHVybiBpbmZvO1xufVxuXG5mdW5jdGlvbiBhZGRQYWNrYWdlVG9JbmZvKGluZm86IFBhY2thZ2VJbmZvLCBwa2c6IFBhY2thZ2VTdGF0ZSkge1xuICBsZXQgaW5zdGFuY2U7XG4gIGlmIChfLmhhcyhpbmZvLm1vZHVsZU1hcCwgcGtnLm5hbWUpKSB7XG4gICAgaW5zdGFuY2UgPSBpbmZvLm1vZHVsZU1hcFtwa2cubmFtZV07XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgcGFyc2VkID0gcGFyc2VOYW1lKHBrZy5uYW1lKTtcbiAgICAvLyBUaGVyZSBhcmUgYWxzbyBub2RlIHBhY2thZ2VzXG4gICAgaW5zdGFuY2UgPSBuZXcgUGFja2FnZUluc3RhbmNlKHtcbiAgICAgIG1vZHVsZU5hbWU6IHBrZy5uYW1lLFxuICAgICAgc2hvcnROYW1lOiBwYXJzZWQubmFtZSxcbiAgICAgIG5hbWU6IHBrZy5uYW1lLFxuICAgICAgbG9uZ05hbWU6IHBrZy5uYW1lLFxuICAgICAgc2NvcGU6IHBrZy5zY29wZSxcbiAgICAgIHBhdGg6IHBrZy5wYXRoLFxuICAgICAganNvbjogcGtnLmpzb24sXG4gICAgICByZWFsUGF0aDogcGtnLnJlYWxQYXRoXG4gICAgfSk7XG4gIH1cbiAgaW5mby5tb2R1bGVNYXBbaW5zdGFuY2UubG9uZ05hbWVdID0gaW5zdGFuY2U7XG59XG5cbi8vIGZ1bmN0aW9uIHRyaW1Ob1BhcnNlU2V0dGluZyhwOiBzdHJpbmcpIHtcbi8vICAgcCA9IHAucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuLy8gICBpZiAocC5zdGFydHNXaXRoKCcuLycpKSB7XG4vLyAgICAgcCA9IHAuc3Vic3RyaW5nKDIpO1xuLy8gICB9XG4vLyAgIHJldHVybiBwO1xuLy8gfVxuXG5mdW5jdGlvbiBjcmVhdGVQYWNrYWdlRGlyVHJlZShwYWNrYWdlSW5mbzogUGFja2FnZUluZm8pIHtcbiAgY29uc3QgdHJlZSA9IG5ldyBEaXJUcmVlPFBhY2thZ2VJbnN0YW5jZT4oKTtcbiAgdmFyIGNvdW50ID0gMDtcbiAgcGFja2FnZUluZm8uYWxsTW9kdWxlcy5mb3JFYWNoKHBrZyA9PiB7XG4gICAgaWYgKHBrZyA9PSBudWxsKVxuICAgICAgcmV0dXJuO1xuICAgIGlmIChwa2cucmVhbFBhdGgpXG4gICAgICB0cmVlLnB1dERhdGEocGtnLnJlYWxQYXRoLCBwa2cpO1xuICAgIC8vIGNvbnN0IHN5bWxpbmsgPSBnZXRTeW1saW5rRm9yUGFja2FnZShwa2cubG9uZ05hbWUpO1xuICAgIGlmIChwa2cucGF0aCAhPT0gcGtnLnJlYWxQYXRoKVxuICAgICAgdHJlZS5wdXREYXRhKHBrZy5wYXRoLCBwa2cpO1xuICAgIGNvdW50Kys7XG4gIH0pO1xuICBsb2cuaW5mbygnJXMgUGxpbmsgY29tcGxpYW50IG5vZGUgcGFja2FnZXMgZm91bmQnLCBjb3VudCk7XG4gIHBhY2thZ2VJbmZvLmRpclRyZWUgPSB0cmVlO1xufVxuXG4iXX0=