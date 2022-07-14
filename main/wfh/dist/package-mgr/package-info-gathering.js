"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.walkPackages = exports.packageOfFileFactory = exports.PackageInstance = void 0;
const tslib_1 = require("tslib");
const _ = tslib_1.__importStar(require("lodash"));
const log4js_1 = require("log4js");
const dir_tree_1 = require("require-injector/dist/dir-tree");
const packageNodeInstance_1 = tslib_1.__importDefault(require("../packageNodeInstance"));
exports.PackageInstance = packageNodeInstance_1.default;
const package_list_helper_1 = require("./package-list-helper");
const lazy_package_factory_1 = require("./lazy-package-factory");
const misc_1 = require("../utils/misc");
const lru_cache_1 = tslib_1.__importDefault(require("lru-cache"));
const path_1 = tslib_1.__importDefault(require("path"));
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
//# sourceMappingURL=package-info-gathering.js.map