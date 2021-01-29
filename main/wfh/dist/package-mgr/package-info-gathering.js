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
const log = log4js_1.getLogger('plink.package-info-gethering');
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
    log.info('Total %s node packages', count);
    packageInfo.dirTree = tree;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1pbmZvLWdhdGhlcmluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL3BhY2thZ2UtaW5mby1nYXRoZXJpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDBDQUE0QjtBQUM1QixtQ0FBaUM7QUFDakMsNkRBQXVEO0FBQ3ZELGlGQUFxRDtBQWE3QywwQkFiRCw2QkFBZSxDQWFDO0FBWnZCLCtEQUF5RDtBQUV6RCxpRUFBaUQ7QUFDakQsd0NBQW1EO0FBQ25ELE1BQU0sR0FBRyxHQUFHLGtCQUFTLENBQUMsOEJBQThCLENBQUMsQ0FBQztBQVV0RCxJQUFJLFdBQXdCLENBQUM7QUFDN0I7Ozs7Ozs7R0FPRztBQUNILFNBQWdCLFlBQVk7SUFDMUIsSUFBSSxXQUFXO1FBQ2IsT0FBTyxXQUFXLENBQUM7SUFDckIsR0FBRyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO0lBQ25DLFdBQVcsR0FBRyxhQUFhLEVBQUUsQ0FBQztJQUM5QixvQkFBb0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNsQyxPQUFPLFdBQVcsQ0FBQztBQUNyQixDQUFDO0FBUEQsb0NBT0M7QUFFRCxTQUFTLGFBQWE7SUFDcEIsTUFBTSxJQUFJLEdBQWdCO1FBQ3hCLElBQUksVUFBVTtZQUNaLE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdkMsQ0FBQztRQUNELFNBQVMsRUFBRSxFQUFFO1FBQ2IsT0FBTyxFQUFFLElBQTJDO0tBQ3JELENBQUM7SUFFRixLQUFLLE1BQU0sRUFBRSxJQUFJLHdDQUFrQixFQUFFLEVBQUU7UUFDckMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0tBQzVCO0lBRUQsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxJQUFpQixFQUFFLEdBQWlCO0lBQzVELElBQUksUUFBUSxDQUFDO0lBQ2IsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ25DLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztLQUNyQztTQUFNO1FBQ0wsTUFBTSxNQUFNLEdBQUcsZ0NBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDbkMsK0JBQStCO1FBQy9CLFFBQVEsR0FBRyxJQUFJLDZCQUFlLENBQUM7WUFDN0IsVUFBVSxFQUFFLEdBQUcsQ0FBQyxJQUFJO1lBQ3BCLFNBQVMsRUFBRSxNQUFNLENBQUMsSUFBSTtZQUN0QixJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUk7WUFDZCxRQUFRLEVBQUUsR0FBRyxDQUFDLElBQUk7WUFDbEIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxLQUFLO1lBQ2hCLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSTtZQUNkLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSTtZQUNkLFFBQVEsRUFBRSxHQUFHLENBQUMsUUFBUTtTQUN2QixDQUFDLENBQUM7S0FDSjtJQUNELElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxHQUFHLFFBQVEsQ0FBQztBQUMvQyxDQUFDO0FBRUQsMkNBQTJDO0FBQzNDLCtCQUErQjtBQUMvQiw4QkFBOEI7QUFDOUIsMEJBQTBCO0FBQzFCLE1BQU07QUFDTixjQUFjO0FBQ2QsSUFBSTtBQUVKLFNBQVMsb0JBQW9CLENBQUMsV0FBd0I7SUFDcEQsTUFBTSxJQUFJLEdBQUcsSUFBSSxrQkFBTyxFQUFtQixDQUFDO0lBQzVDLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQztJQUNkLFdBQVcsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxFQUFFO1FBQzlDLElBQUksY0FBYyxJQUFJLElBQUk7WUFDeEIsT0FBTztRQUNULElBQUksY0FBYyxDQUFDLFFBQVE7WUFDekIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLGNBQWMsQ0FBQyxDQUFDO1FBQ3hELE1BQU0sT0FBTyxHQUFHLDJCQUFvQixDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUM5RCxJQUFJLE9BQU8sSUFBSSxPQUFPLEtBQUssY0FBYyxDQUFDLFFBQVE7WUFDaEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDeEMsS0FBSyxFQUFFLENBQUM7SUFDVixDQUFDLENBQUMsQ0FBQztJQUNILEdBQUcsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDMUMsV0FBVyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUM7QUFDN0IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtEaXJUcmVlfSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvZGlyLXRyZWUnO1xuaW1wb3J0IFBhY2thZ2VJbnN0YW5jZSBmcm9tICcuLi9wYWNrYWdlTm9kZUluc3RhbmNlJztcbmltcG9ydCB7cGFja2FnZXM0V29ya3NwYWNlfSBmcm9tICcuL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IHtQYWNrYWdlSW5mbyBhcyBQYWNrYWdlU3RhdGV9IGZyb20gJy4vaW5kZXgnO1xuaW1wb3J0IHtwYXJzZU5hbWV9IGZyb20gJy4vbGF6eS1wYWNrYWdlLWZhY3RvcnknO1xuaW1wb3J0IHtnZXRTeW1saW5rRm9yUGFja2FnZX0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLnBhY2thZ2UtaW5mby1nZXRoZXJpbmcnKTtcblxuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlSW5mbyB7XG4gIGFsbE1vZHVsZXM6IFBhY2thZ2VJbnN0YW5jZVtdO1xuICBkaXJUcmVlOiBEaXJUcmVlPFBhY2thZ2VJbnN0YW5jZT47XG4gIG1vZHVsZU1hcDoge1tuYW1lOiBzdHJpbmddOiBQYWNrYWdlSW5zdGFuY2V9O1xufVxuXG5leHBvcnQge1BhY2thZ2VJbnN0YW5jZX07XG5cbmxldCBwYWNrYWdlSW5mbzogUGFja2FnZUluZm87XG4vKipcbiAqIHdhbGtQYWNrYWdlc1xuICogQHBhcmFtIHsqfSBjb25maWcgXG4gKiBAcGFyYW0geyp9IGFyZ3YgXG4gKiBAcGFyYW0geyp9IHBhY2thZ2VVdGlscyBcbiAqIEBwYXJhbSB7Kn0gaWdub3JlQ2FjaGVcbiAqIEByZXR1cm4ge1BhY2thZ2VJbmZvfVxuICovXG5leHBvcnQgZnVuY3Rpb24gd2Fsa1BhY2thZ2VzKCkge1xuICBpZiAocGFja2FnZUluZm8pXG4gICAgcmV0dXJuIHBhY2thZ2VJbmZvO1xuICBsb2cuaW5mbygnc2NhbiBmb3IgcGFja2FnZXMgaW5mbycpO1xuICBwYWNrYWdlSW5mbyA9IF93YWxrUGFja2FnZXMoKTtcbiAgY3JlYXRlUGFja2FnZURpclRyZWUocGFja2FnZUluZm8pO1xuICByZXR1cm4gcGFja2FnZUluZm87XG59XG5cbmZ1bmN0aW9uIF93YWxrUGFja2FnZXMoKTogUGFja2FnZUluZm8ge1xuICBjb25zdCBpbmZvOiBQYWNrYWdlSW5mbyA9IHtcbiAgICBnZXQgYWxsTW9kdWxlcygpIHtcbiAgICAgIHJldHVybiBPYmplY3QudmFsdWVzKGluZm8ubW9kdWxlTWFwKTtcbiAgICB9LCAvLyBhcnJheVxuICAgIG1vZHVsZU1hcDoge30sXG4gICAgZGlyVHJlZTogbnVsbCBhcyB1bmtub3duIGFzIERpclRyZWU8UGFja2FnZUluc3RhbmNlPlxuICB9O1xuXG4gIGZvciAoY29uc3QgcGsgb2YgcGFja2FnZXM0V29ya3NwYWNlKCkpIHtcbiAgICBhZGRQYWNrYWdlVG9JbmZvKGluZm8sIHBrKTtcbiAgfVxuXG4gIHJldHVybiBpbmZvO1xufVxuXG5mdW5jdGlvbiBhZGRQYWNrYWdlVG9JbmZvKGluZm86IFBhY2thZ2VJbmZvLCBwa2c6IFBhY2thZ2VTdGF0ZSkge1xuICBsZXQgaW5zdGFuY2U7XG4gIGlmIChfLmhhcyhpbmZvLm1vZHVsZU1hcCwgcGtnLm5hbWUpKSB7XG4gICAgaW5zdGFuY2UgPSBpbmZvLm1vZHVsZU1hcFtwa2cubmFtZV07XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgcGFyc2VkID0gcGFyc2VOYW1lKHBrZy5uYW1lKTtcbiAgICAvLyBUaGVyZSBhcmUgYWxzbyBub2RlIHBhY2thZ2VzXG4gICAgaW5zdGFuY2UgPSBuZXcgUGFja2FnZUluc3RhbmNlKHtcbiAgICAgIG1vZHVsZU5hbWU6IHBrZy5uYW1lLFxuICAgICAgc2hvcnROYW1lOiBwYXJzZWQubmFtZSxcbiAgICAgIG5hbWU6IHBrZy5uYW1lLFxuICAgICAgbG9uZ05hbWU6IHBrZy5uYW1lLFxuICAgICAgc2NvcGU6IHBrZy5zY29wZSxcbiAgICAgIHBhdGg6IHBrZy5wYXRoLFxuICAgICAganNvbjogcGtnLmpzb24sXG4gICAgICByZWFsUGF0aDogcGtnLnJlYWxQYXRoXG4gICAgfSk7XG4gIH1cbiAgaW5mby5tb2R1bGVNYXBbaW5zdGFuY2UubG9uZ05hbWVdID0gaW5zdGFuY2U7XG59XG5cbi8vIGZ1bmN0aW9uIHRyaW1Ob1BhcnNlU2V0dGluZyhwOiBzdHJpbmcpIHtcbi8vICAgcCA9IHAucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuLy8gICBpZiAocC5zdGFydHNXaXRoKCcuLycpKSB7XG4vLyAgICAgcCA9IHAuc3Vic3RyaW5nKDIpO1xuLy8gICB9XG4vLyAgIHJldHVybiBwO1xuLy8gfVxuXG5mdW5jdGlvbiBjcmVhdGVQYWNrYWdlRGlyVHJlZShwYWNrYWdlSW5mbzogUGFja2FnZUluZm8pIHtcbiAgY29uc3QgdHJlZSA9IG5ldyBEaXJUcmVlPFBhY2thZ2VJbnN0YW5jZT4oKTtcbiAgdmFyIGNvdW50ID0gMDtcbiAgcGFja2FnZUluZm8uYWxsTW9kdWxlcy5mb3JFYWNoKG1vZHVsZUluc3RhbmNlID0+IHtcbiAgICBpZiAobW9kdWxlSW5zdGFuY2UgPT0gbnVsbClcbiAgICAgIHJldHVybjtcbiAgICBpZiAobW9kdWxlSW5zdGFuY2UucmVhbFBhdGgpXG4gICAgICB0cmVlLnB1dERhdGEobW9kdWxlSW5zdGFuY2UucmVhbFBhdGgsIG1vZHVsZUluc3RhbmNlKTtcbiAgICBjb25zdCBzeW1saW5rID0gZ2V0U3ltbGlua0ZvclBhY2thZ2UobW9kdWxlSW5zdGFuY2UubG9uZ05hbWUpO1xuICAgIGlmIChzeW1saW5rICYmIHN5bWxpbmsgIT09IG1vZHVsZUluc3RhbmNlLnJlYWxQYXRoKVxuICAgICAgdHJlZS5wdXREYXRhKHN5bWxpbmssIG1vZHVsZUluc3RhbmNlKTtcbiAgICBjb3VudCsrO1xuICB9KTtcbiAgbG9nLmluZm8oJ1RvdGFsICVzIG5vZGUgcGFja2FnZXMnLCBjb3VudCk7XG4gIHBhY2thZ2VJbmZvLmRpclRyZWUgPSB0cmVlO1xufVxuXG4iXX0=