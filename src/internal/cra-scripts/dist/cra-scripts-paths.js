"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
const build_target_helper_1 = require("./build-target-helper");
const path_1 = __importDefault(require("path"));
const lodash_1 = __importDefault(require("lodash"));
const { rootDir } = JSON.parse(process.env.__plink);
function paths() {
    const cmdPublicUrl = utils_1.getCmdOptions().publicUrl;
    if (cmdPublicUrl) {
        process.env.PUBLIC_URL = cmdPublicUrl + '';
    }
    const paths = require(path_1.default.resolve('node_modules/react-scripts/config/paths'));
    const changedPaths = paths;
    const cmdOption = utils_1.getCmdOptions();
    const foundPkg = build_target_helper_1.findPackage(cmdOption.buildTarget);
    if (foundPkg == null) {
        throw new Error(`Can not find package for name like ${cmdOption.buildTarget}`);
    }
    const { dir, packageJson } = foundPkg;
    // console.log('[debug] ', cmdOption);
    if (cmdOption.buildType === 'lib') {
        changedPaths.appBuild = path_1.default.resolve(dir, 'build');
        changedPaths.appIndexJs = path_1.default.resolve(dir, lodash_1.default.get(packageJson, 'dr.cra-build-entry', 'public_api.ts'));
    }
    else if (cmdOption.buildType === 'app') {
        changedPaths.appBuild = path_1.default.resolve(rootDir, 'dist/static');
    }
    // tslint:disable-next-line: no-console
    // console.log('[cra-scripts-paths] changed react-scripts paths:\n', changedPaths);
    return changedPaths;
}
exports.default = paths;

//# sourceMappingURL=cra-scripts-paths.js.map
