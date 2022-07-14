"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reinstallWithLinkedPlink = void 0;
const tslib_1 = require("tslib");
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
const path_1 = tslib_1.__importDefault(require("path"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const misc_1 = require("../utils/misc");
const package_mgr_1 = require("../package-mgr");
/**
 *
 * @return a function to write the original package.json file back
 */
async function reinstallWithLinkedPlink(opt) {
    const rootDir = (0, misc_1.getRootDir)();
    const pkjsonFile = path_1.default.resolve(rootDir, 'package.json');
    const origPkJsonStr = fs_1.default.readFileSync(pkjsonFile, 'utf8');
    const pkJson = JSON.parse(origPkJsonStr);
    const isPlinkLinked = (0, package_mgr_1.getState)().linkedDrcp != null;
    const linkedPkgs = (0, package_mgr_1.getState)().srcPackages;
    if (pkJson.dependencies) {
        for (const dep of Object.keys(pkJson.dependencies)) {
            if (linkedPkgs.has(dep)) {
                delete pkJson.dependencies[dep];
            }
        }
        if (isPlinkLinked)
            delete pkJson.dependencies['@wfh/plink'];
    }
    if (pkJson.devDependencies) {
        for (const dep of Object.keys(pkJson.devDependencies)) {
            if (linkedPkgs.has(dep)) {
                delete pkJson.devDependencies[dep];
            }
        }
        if (isPlinkLinked)
            delete pkJson.devDependencies['@wfh/plink'];
    }
    const str = JSON.stringify(pkJson, null, '  ');
    // eslint-disable-next-line no-console
    console.log('Install with package.json:', str);
    await (0, package_mgr_1.installInDir)(rootDir, { isForce: false, cache: opt.cache,
        useYarn: opt.useYarn, useNpmCi: opt.useCi, offline: opt.offline }, origPkJsonStr, str);
}
exports.reinstallWithLinkedPlink = reinstallWithLinkedPlink;
//# sourceMappingURL=cli-link-plink.js.map