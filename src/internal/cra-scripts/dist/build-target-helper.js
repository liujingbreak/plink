"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findPackage = void 0;
const lodash_1 = __importDefault(require("lodash"));
// import fs from 'fs-extra';
// import Path from 'path';
const package_mgr_1 = require("dr-comp-package/wfh/dist/package-mgr");
const utils_1 = require("dr-comp-package/wfh/dist/cmd/utils");
function _findPackage(shortName) {
    const pkg = Array.from(utils_1.findPackagesByNames(package_mgr_1.getState(), [shortName]))[0];
    if (pkg == null)
        return null;
    return {
        name: pkg.name,
        packageJson: pkg.json,
        dir: pkg.realPath
    };
}
exports.findPackage = lodash_1.default.memoize(_findPackage);

//# sourceMappingURL=build-target-helper.js.map
