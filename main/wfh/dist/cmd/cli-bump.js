"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const package_mgr_1 = require("../package-mgr");
const process_utils_1 = require("../process-utils");
const utils_1 = require("./utils");
const log4js_1 = __importDefault(require("log4js"));
// import Path from 'path';
require("../editor-helper");
const log = log4js_1.default.getLogger('plin.cli-bump');
async function default_1(options) {
    if (options.packages.length > 0) {
        await bumpPackages(options.packages, options.increVersion);
    }
    else if (options.project.length > 0) {
        const pkgNames = options.project.map(proj => (0, package_mgr_1.pathToProjKey)(proj)).reduce((pkgs, proj) => {
            const pkgsOfProj = (0, package_mgr_1.getState)().project2Packages.get(proj);
            if (pkgsOfProj)
                pkgs.push(...pkgsOfProj);
            return pkgs;
        }, []);
        await bumpPackages(pkgNames, options.increVersion);
    }
    await new Promise(resolve => setImmediate(resolve));
    package_mgr_1.actionDispatcher.scanAndSyncPackages({});
}
exports.default = default_1;
async function bumpPackages(pkgNames, increVersion) {
    await Promise.all(Array.from((0, utils_1.findPackagesByNames)((0, package_mgr_1.getState)(), pkgNames)).filter((pkg, idx) => {
        const rs = pkg != null;
        if (!rs) {
            log.error(`Can not find package for name like: ${pkgNames[idx]}`);
        }
        return rs;
    }).map((pkg) => {
        log.info(`bump ${pkg.name} version`);
        const pkDir = pkg.realPath;
        return (0, process_utils_1.exe)('npm', 'version', increVersion, '--no-commit-hooks', '--no-git-tag-version', { cwd: pkDir }).promise;
    }));
}
//# sourceMappingURL=cli-bump.js.map