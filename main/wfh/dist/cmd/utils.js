"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.arrayOptionFn = exports.hlDesc = exports.hl = exports.lookupPackageJson = exports.findPackagesByNames = exports.completePackageName = void 0;
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const package_mgr_1 = require("../package-mgr");
const misc_1 = require("../utils/misc");
function* completePackageName(state, guessingNames) {
    for (const pkg of findPackagesByNames(state, guessingNames)) {
        if (pkg) {
            yield pkg.name;
        }
        else {
            yield null;
        }
    }
}
exports.completePackageName = completePackageName;
function* findPackagesByNames(state, guessingNames) {
    if (guessingNames === undefined) {
        guessingNames = state;
        state = (0, package_mgr_1.getState)();
    }
    const config = require('../config').default;
    const prefixes = ['', ...config().packageScopes.map(scope => `@${scope}/`)];
    const available = state.srcPackages;
    for (const gn of guessingNames) {
        let found = false;
        for (const prefix of prefixes) {
            const name = prefix + gn;
            if (name === '@wfh/plink' && state.linkedDrcp) {
                yield state.linkedDrcp;
                found = true;
                break;
            }
            const pkg = available.get(name);
            if (pkg) {
                yield pkg;
                found = true;
                break;
            }
            else {
                const pkjsonFile = lookupPackageJson(gn);
                if (pkjsonFile) {
                    yield (0, package_mgr_1.createPackageInfo)(pkjsonFile, true);
                    found = true;
                    break;
                }
            }
        }
        if (!found) {
            yield null;
        }
    }
}
exports.findPackagesByNames = findPackagesByNames;
/**
 * Look up package.json file in environment variable NODE_PATH
 * @param moduleName
 */
function lookupPackageJson(moduleName) {
    for (const p of [misc_1.plinkEnv.workDir, misc_1.plinkEnv.rootDir]) {
        const test = path_1.default.resolve(p, misc_1.plinkEnv.symlinkDirName, moduleName, 'package.json');
        if (fs_extra_1.default.existsSync(test)) {
            return test;
        }
    }
    return null;
}
exports.lookupPackageJson = lookupPackageJson;
function hl(text) {
    return chalk_1.default.green(text);
}
exports.hl = hl;
function hlDesc(text) {
    return chalk_1.default.gray(text);
}
exports.hlDesc = hlDesc;
function arrayOptionFn(curr, prev) {
    if (prev)
        prev.push(curr);
    return prev;
}
exports.arrayOptionFn = arrayOptionFn;
//# sourceMappingURL=utils.js.map