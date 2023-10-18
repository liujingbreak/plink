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
const path_1 = __importDefault(require("path"));
const _ = __importStar(require("lodash"));
const log4js_1 = require("log4js");
const dir_tree_1 = require("require-injector/dist/dir-tree");
const lru_cache_1 = __importDefault(require("lru-cache"));
const packageNodeInstance_1 = __importDefault(require("../packageNodeInstance"));
exports.PackageInstance = packageNodeInstance_1.default;
const misc_1 = require("../utils/misc");
const package_list_helper_1 = require("./package-list-helper");
const lazy_package_factory_1 = require("./lazy-package-factory");
// import inspector from 'inspector';
const log = (0, log4js_1.getLogger)('plink.package-info-gathering');
const { workDir, symlinkDirName } = misc_1.plinkEnv;
let existingFileToPkgHelper;
// let packageInfo: PackageInfo;
function packageOfFileFactory() {
    if (existingFileToPkgHelper) {
        return existingFileToPkgHelper;
    }
    const cache = new lru_cache_1.default({ max: 20, maxAge: 20000 });
    const packageInfo = walkPackages();
    function getPkgOfFile(file) {
        let found = cache.get(file);
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