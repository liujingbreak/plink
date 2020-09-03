"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const utils_1 = require("./utils");
const build_target_helper_1 = require("./build-target-helper");
const path_1 = tslib_1.__importDefault(require("path"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const drcpWorkdir = findDrcpWorkdir();
function paths() {
    const cmdPublicUrl = utils_1.getCmdOptions().argv.get('publicUrl') || utils_1.getCmdOptions().argv.get('public-url');
    if (cmdPublicUrl) {
        process.env.PUBLIC_URL = cmdPublicUrl + '';
    }
    const paths = require(path_1.default.resolve('node_modules/react-scripts/config/paths'));
    const changedPaths = paths;
    const cmdOption = utils_1.getCmdOptions();
    const { dir, packageJson } = build_target_helper_1.findPackage(cmdOption.buildTarget);
    // console.log('[debug] ', cmdOption);
    if (cmdOption.buildType === 'lib') {
        changedPaths.appBuild = path_1.default.resolve(dir, 'build');
        changedPaths.appIndexJs = path_1.default.resolve(dir, lodash_1.default.get(packageJson, 'dr.cra-build-entry', 'public_api.ts'));
    }
    else if (cmdOption.buildType === 'app') {
        changedPaths.appBuild = path_1.default.resolve(drcpWorkdir, 'dist/static');
        // const {dir} = findPackage(cmdOption.buildTarget);
        // changedPaths.appBuild = Path.resolve(dir, 'build');
        // changedPaths.appIndexJs = Path.resolve(dir, _.get(packageJson, 'dr.cra-serve-entry', 'serve_index.ts'));
    }
    // tslint:disable-next-line: no-console
    console.log('[cra-scripts-paths] changed react-scripts paths:\n', changedPaths);
    return changedPaths;
}
exports.default = paths;
function findDrcpWorkdir() {
    let dir = path_1.default.resolve();
    let parent = null;
    while (true) {
        const testDir = path_1.default.resolve(dir, 'node_modules', 'dr-comp-package');
        if (fs_1.default.existsSync(testDir)) {
            return dir;
        }
        parent = path_1.default.dirname(dir);
        if (parent === dir || parent == null)
            throw new Error('Can not find DRCP workspace');
        dir = parent;
    }
}

//# sourceMappingURL=cra-scripts-paths.js.map
