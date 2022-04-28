"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1pbmZvLWdhdGhlcmluZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL3BhY2thZ2UtaW5mby1nYXRoZXJpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSwwQ0FBNEI7QUFDNUIsbUNBQWlDO0FBQ2pDLDZEQUF1RDtBQUN2RCxpRkFBcUQ7QUFpQjdDLDBCQWpCRCw2QkFBZSxDQWlCQztBQWhCdkIsK0RBQXlEO0FBRXpELGlFQUFpRDtBQUNqRCx3Q0FBdUM7QUFDdkMsMERBQTRCO0FBQzVCLGdEQUF3QjtBQUN4QixxQ0FBcUM7QUFFckMsTUFBTSxHQUFHLEdBQUcsSUFBQSxrQkFBUyxFQUFDLDhCQUE4QixDQUFDLENBQUM7QUFDdEQsTUFBTSxFQUFDLE9BQU8sRUFBRSxjQUFjLEVBQUMsR0FBRyxlQUFRLENBQUM7QUFTM0MsSUFBSSx1QkFHUyxDQUFDO0FBQ2QsZ0NBQWdDO0FBQ2hDOzs7Ozs7O0dBT0c7QUFFSCxTQUFnQixvQkFBb0I7SUFDbEMsSUFBSSx1QkFBdUIsRUFBRTtRQUMzQixPQUFPLHVCQUF1QixDQUFDO0tBQ2hDO0lBQ0QsTUFBTSxLQUFLLEdBQUcsSUFBSSxtQkFBRyxDQUEwQixFQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUM7SUFDekUsTUFBTSxXQUFXLEdBQWdCLFlBQVksRUFBRSxDQUFDO0lBRWhELFNBQVMsWUFBWSxDQUFDLElBQVk7UUFDaEMsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1QixJQUFJLENBQUMsS0FBSyxFQUFFO1lBQ1YsS0FBSyxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ25ELElBQUksS0FBSztnQkFDUCxLQUFLLENB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LDZDQUE2QztRQUM3QyxjQUFjO1FBQ2QsSUFBSTtRQUNKLEtBQUssRUFBRSxDQUFDO0lBQ1YsQ0FBQyxDQUFDLENBQUM7SUFDSCxHQUFHLENBQUMsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzFELFdBQVcsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDO0FBQzdCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7RGlyVHJlZX0gZnJvbSAncmVxdWlyZS1pbmplY3Rvci9kaXN0L2Rpci10cmVlJztcbmltcG9ydCBQYWNrYWdlSW5zdGFuY2UgZnJvbSAnLi4vcGFja2FnZU5vZGVJbnN0YW5jZSc7XG5pbXBvcnQge3BhY2thZ2VzNFdvcmtzcGFjZX0gZnJvbSAnLi9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCB7UGFja2FnZUluZm8gYXMgUGFja2FnZVN0YXRlfSBmcm9tICcuL2luZGV4JztcbmltcG9ydCB7cGFyc2VOYW1lfSBmcm9tICcuL2xhenktcGFja2FnZS1mYWN0b3J5JztcbmltcG9ydCB7cGxpbmtFbnZ9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0IExSVSBmcm9tICdscnUtY2FjaGUnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG4vLyBpbXBvcnQgaW5zcGVjdG9yIGZyb20gJ2luc3BlY3Rvcic7XG5cbmNvbnN0IGxvZyA9IGdldExvZ2dlcigncGxpbmsucGFja2FnZS1pbmZvLWdhdGhlcmluZycpO1xuY29uc3Qge3dvcmtEaXIsIHN5bWxpbmtEaXJOYW1lfSA9IHBsaW5rRW52O1xuZXhwb3J0IGludGVyZmFjZSBQYWNrYWdlSW5mbyB7XG4gIGFsbE1vZHVsZXM6IFBhY2thZ2VJbnN0YW5jZVtdO1xuICBkaXJUcmVlOiBEaXJUcmVlPFBhY2thZ2VJbnN0YW5jZT47XG4gIG1vZHVsZU1hcDoge1tuYW1lOiBzdHJpbmddOiBQYWNrYWdlSW5zdGFuY2V9O1xufVxuXG5leHBvcnQge1BhY2thZ2VJbnN0YW5jZX07XG5cbmxldCBleGlzdGluZ0ZpbGVUb1BrZ0hlbHBlcjoge1xuICBwYWNrYWdlSW5mbzogUGFja2FnZUluZm87XG4gIGdldFBrZ09mRmlsZShmaWxlOiBzdHJpbmcpOiBQYWNrYWdlSW5zdGFuY2UgfCB1bmRlZmluZWQ7XG59IHwgdW5kZWZpbmVkO1xuLy8gbGV0IHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbztcbi8qKlxuICogd2Fsa1BhY2thZ2VzXG4gKiBAcGFyYW0geyp9IGNvbmZpZyBcbiAqIEBwYXJhbSB7Kn0gYXJndiBcbiAqIEBwYXJhbSB7Kn0gcGFja2FnZVV0aWxzIFxuICogQHBhcmFtIHsqfSBpZ25vcmVDYWNoZVxuICogQHJldHVybiB7UGFja2FnZUluZm99XG4gKi9cblxuZXhwb3J0IGZ1bmN0aW9uIHBhY2thZ2VPZkZpbGVGYWN0b3J5KCkge1xuICBpZiAoZXhpc3RpbmdGaWxlVG9Qa2dIZWxwZXIpIHtcbiAgICByZXR1cm4gZXhpc3RpbmdGaWxlVG9Qa2dIZWxwZXI7XG4gIH1cbiAgY29uc3QgY2FjaGUgPSBuZXcgTFJVPHN0cmluZywgUGFja2FnZUluc3RhbmNlPih7bWF4OiAyMCwgbWF4QWdlOiAyMDAwMH0pO1xuICBjb25zdCBwYWNrYWdlSW5mbzogUGFja2FnZUluZm8gPSB3YWxrUGFja2FnZXMoKTtcblxuICBmdW5jdGlvbiBnZXRQa2dPZkZpbGUoZmlsZTogc3RyaW5nKTogUGFja2FnZUluc3RhbmNlIHwgdW5kZWZpbmVkIHtcbiAgICB2YXIgZm91bmQgPSBjYWNoZS5nZXQoZmlsZSk7XG4gICAgaWYgKCFmb3VuZCkge1xuICAgICAgZm91bmQgPSBwYWNrYWdlSW5mby5kaXJUcmVlLmdldEFsbERhdGEoZmlsZSkucG9wKCk7XG4gICAgICBpZiAoZm91bmQpXG4gICAgICAgIGNhY2hlLnNldChmaWxlLCBmb3VuZCk7XG4gICAgfVxuICAgIHJldHVybiBmb3VuZDtcbiAgfVxuICBleGlzdGluZ0ZpbGVUb1BrZ0hlbHBlciA9IHtwYWNrYWdlSW5mbywgZ2V0UGtnT2ZGaWxlfTtcbiAgcmV0dXJuIGV4aXN0aW5nRmlsZVRvUGtnSGVscGVyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gd2Fsa1BhY2thZ2VzKCkge1xuICAvLyBpZiAocGFja2FnZUluZm8pXG4gIC8vICAgcmV0dXJuIHBhY2thZ2VJbmZvO1xuICBsb2cuZGVidWcoJ3NjYW4gZm9yIHBhY2thZ2VzIGluZm8nKTtcbiAgY29uc3QgcGFja2FnZUluZm86IFBhY2thZ2VJbmZvID0ge1xuICAgIGdldCBhbGxNb2R1bGVzKCkge1xuICAgICAgcmV0dXJuIE9iamVjdC52YWx1ZXMocGFja2FnZUluZm8ubW9kdWxlTWFwKTtcbiAgICB9LCAvLyBhcnJheVxuICAgIG1vZHVsZU1hcDoge30sXG4gICAgZGlyVHJlZTogbnVsbCBhcyB1bmtub3duIGFzIERpclRyZWU8UGFja2FnZUluc3RhbmNlPlxuICB9O1xuXG4gIGZvciAoY29uc3QgcGsgb2YgcGFja2FnZXM0V29ya3NwYWNlKCkpIHtcbiAgICBhZGRQYWNrYWdlVG9JbmZvKHBhY2thZ2VJbmZvLm1vZHVsZU1hcCwgcGspO1xuICB9XG5cbiAgY3JlYXRlUGFja2FnZURpclRyZWUocGFja2FnZUluZm8pO1xuICByZXR1cm4gcGFja2FnZUluZm87XG59XG5cblxuZnVuY3Rpb24gYWRkUGFja2FnZVRvSW5mbyhtb2R1bGVNYXA6IFBhY2thZ2VJbmZvWydtb2R1bGVNYXAnXSwgcGtnOiBQYWNrYWdlU3RhdGUpIHtcbiAgbGV0IGluc3RhbmNlO1xuICBpZiAoXy5oYXMobW9kdWxlTWFwLCBwa2cubmFtZSkpIHtcbiAgICBpbnN0YW5jZSA9IG1vZHVsZU1hcFtwa2cubmFtZV07XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgcGFyc2VkID0gcGFyc2VOYW1lKHBrZy5uYW1lKTtcbiAgICAvLyBUaGVyZSBhcmUgYWxzbyBub2RlIHBhY2thZ2VzXG4gICAgaW5zdGFuY2UgPSBuZXcgUGFja2FnZUluc3RhbmNlKHtcbiAgICAgIG1vZHVsZU5hbWU6IHBrZy5uYW1lLFxuICAgICAgc2hvcnROYW1lOiBwYXJzZWQubmFtZSxcbiAgICAgIG5hbWU6IHBrZy5uYW1lLFxuICAgICAgbG9uZ05hbWU6IHBrZy5uYW1lLFxuICAgICAgc2NvcGU6IHBrZy5zY29wZSxcbiAgICAgIHBhdGg6IFBhdGgucmVzb2x2ZSh3b3JrRGlyLCBwa2cucGF0aCksXG4gICAgICBqc29uOiBwa2cuanNvbixcbiAgICAgIHJlYWxQYXRoOiBwa2cucmVhbFBhdGhcbiAgICB9KTtcbiAgfVxuICBtb2R1bGVNYXBbaW5zdGFuY2UubG9uZ05hbWVdID0gaW5zdGFuY2U7XG59XG5cbi8vIGZ1bmN0aW9uIHRyaW1Ob1BhcnNlU2V0dGluZyhwOiBzdHJpbmcpIHtcbi8vICAgcCA9IHAucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuLy8gICBpZiAocC5zdGFydHNXaXRoKCcuLycpKSB7XG4vLyAgICAgcCA9IHAuc3Vic3RyaW5nKDIpO1xuLy8gICB9XG4vLyAgIHJldHVybiBwO1xuLy8gfVxuXG5mdW5jdGlvbiBjcmVhdGVQYWNrYWdlRGlyVHJlZShwYWNrYWdlSW5mbzogUGFja2FnZUluZm8pIHtcbiAgY29uc3QgdHJlZSA9IG5ldyBEaXJUcmVlPFBhY2thZ2VJbnN0YW5jZT4oKTtcbiAgbGV0IGNvdW50ID0gMDtcbiAgcGFja2FnZUluZm8uYWxsTW9kdWxlcy5mb3JFYWNoKHBrZyA9PiB7XG4gICAgaWYgKHBrZyA9PSBudWxsKVxuICAgICAgcmV0dXJuO1xuXG4gICAgaWYgKHBrZy5yZWFsUGF0aCkge1xuICAgICAgdHJlZS5wdXREYXRhKHBrZy5yZWFsUGF0aCwgcGtnKTtcbiAgICB9XG4gICAgLy8gRG9uJ3QgdHJ1c3QgcGtnLnBhdGgsIGl0IGlzIHNldCBieSBjb21tYW5kIGxpbmU6IHBsaW5rIHN5bmMvaW5pdCwgYW5kIGxvYWRlZCBmcm9tIHN0YXRlIGZpbGUsXG4gICAgLy8gd2hpY2ggaXMgbm90IHVwLXRvLWRhdGVzLlxuICAgIHRyZWUucHV0RGF0YShQYXRoLnJlc29sdmUod29ya0Rpciwgc3ltbGlua0Rpck5hbWUsIHBrZy5uYW1lKSwgcGtnKTtcbiAgICAvLyBpZiAocGtnLnBhdGggIT09IHBrZy5yZWFsUGF0aCkge1xuICAgIC8vICAgdHJlZS5wdXREYXRhKFBhdGgucmVzb2x2ZSh3b3JrRGlyLCBzeW1saW5rRGlyTmFtZSwgcGtnLm5hbWUpLCBwa2cpO1xuICAgIC8vIH1cbiAgICAvLyBpZiAocGtnLm5hbWUgPT09ICdAYmsvdHJhZGUtYWdncicpIHtcbiAgICAvLyAgIGluc3BlY3Rvci5vcGVuKDkyMjIsICdsb2NhbGhvc3QnLCB0cnVlKTtcbiAgICAvLyAgIGRlYnVnZ2VyO1xuICAgIC8vIH1cbiAgICBjb3VudCsrO1xuICB9KTtcbiAgbG9nLmluZm8oJyVzIFBsaW5rIGNvbXBsaWFudCBub2RlIHBhY2thZ2VzIGZvdW5kJywgY291bnQpO1xuICBwYWNrYWdlSW5mby5kaXJUcmVlID0gdHJlZTtcbn1cblxuIl19