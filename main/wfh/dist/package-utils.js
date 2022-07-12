"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findPackageByType = exports.findPackageJsonPath = exports.findAllPackages = exports.lookForPackages = exports.createLazyPackageFileFinder = exports.packages4Workspace = exports.packages4WorkspaceKey = exports.allPackages = void 0;
const lru_cache_1 = __importDefault(require("lru-cache"));
const lazy_package_factory_1 = __importDefault(require("./package-mgr/lazy-package-factory"));
const package_mgr_1 = require("./package-mgr");
// import * as Path from 'path';
const lodash_1 = __importDefault(require("lodash"));
// import log4js from 'log4js';
// import * as fs from 'fs';
const utils_1 = require("./cmd/utils");
Object.defineProperty(exports, "findPackageJsonPath", { enumerable: true, get: function () { return utils_1.lookupPackageJson; } });
const misc_1 = require("./utils/misc");
const path_1 = __importDefault(require("path"));
const package_list_helper_1 = require("./package-mgr/package-list-helper");
Object.defineProperty(exports, "allPackages", { enumerable: true, get: function () { return package_list_helper_1.allPackages; } });
Object.defineProperty(exports, "packages4WorkspaceKey", { enumerable: true, get: function () { return package_list_helper_1.packages4WorkspaceKey; } });
Object.defineProperty(exports, "packages4Workspace", { enumerable: true, get: function () { return package_list_helper_1.packages4Workspace; } });
// const log = log4js.getLogger('plink.package-utils');
const lazyPackageFactory = new lazy_package_factory_1.default((0, package_list_helper_1.allPackages)());
function createLazyPackageFileFinder() {
    const cache = new lru_cache_1.default({ max: 20, maxAge: 20000 });
    return function (file) {
        let found = cache.get(file);
        if (!found) {
            found = lazyPackageFactory.getPackageByPath(file);
            if (found)
                cache.set(file, found);
        }
        return found;
    };
}
exports.createLazyPackageFileFinder = createLazyPackageFileFinder;
function lookForPackages(packageList, cb) {
    for (const pkg of (0, utils_1.findPackagesByNames)((0, package_mgr_1.getState)(), Array.isArray(packageList) ? packageList : [packageList])) {
        if (pkg == null)
            continue;
        cb(pkg.name, path_1.default.join(misc_1.plinkEnv.workDir, pkg.path), { name: pkg.shortName, scope: pkg.scope }, pkg.json, pkg.realPath, pkg.isInstalled);
    }
}
exports.lookForPackages = lookForPackages;
function findAllPackages(packageList, callback, recipeType, projectDir) {
    // oldPu.findAllPackages.apply(oldPu, arguments);
    if (lodash_1.default.isFunction(callback) && packageList) {
        lookForPackages([].concat(packageList), callback);
        return;
    }
    else if (lodash_1.default.isFunction(packageList)) {
        // arguments.length <= 2
        projectDir = recipeType;
        recipeType = callback;
        callback = packageList;
    }
    return findPackageByType('*', callback, recipeType, projectDir);
}
exports.findAllPackages = findAllPackages;
function findPackageByType(_types, callback, recipeType, projectDir) {
    const arr = Array.isArray(projectDir) ? projectDir : projectDir == null ? projectDir : [projectDir];
    for (const pkg of (0, package_list_helper_1.allPackages)(_types, recipeType, arr)) {
        callback(pkg.name, path_1.default.join(misc_1.plinkEnv.workDir, pkg.path), { scope: pkg.scope, name: pkg.shortName }, pkg.json, pkg.realPath, pkg.isInstalled);
    }
}
exports.findPackageByType = findPackageByType;
//# sourceMappingURL=package-utils.js.map