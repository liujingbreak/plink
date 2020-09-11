"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.findPackage = void 0;
const lodash_1 = __importDefault(require("lodash"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const packageScopes = ['@bk', '@dr'];
function findPackageJson(name) {
    const file = name + '/package.json';
    const guessingFile = [
        file,
        ...packageScopes.map(scope => `${scope}/${file}`)
    ];
    let resolved;
    const foundModule = guessingFile.find(target => {
        try {
            resolved = require.resolve(target);
            return true;
        }
        catch (ex) {
            return false;
        }
    });
    if (!foundModule) {
        throw new Error(`Could not resolve package.json from paths like:\n${guessingFile.join('\n')}`);
    }
    return resolved;
}
function _findPackage(shortName) {
    const jsonFile = findPackageJson(shortName);
    const pkJson = JSON.parse(fs_extra_1.default.readFileSync(jsonFile, 'utf8'));
    const pkDir = path_1.default.dirname(jsonFile);
    return {
        name: pkJson.name,
        packageJson: pkJson,
        dir: pkDir
    };
}
exports.findPackage = lodash_1.default.memoize(_findPackage);

//# sourceMappingURL=build-target-helper.js.map
