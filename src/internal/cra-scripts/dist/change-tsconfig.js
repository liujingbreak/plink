"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeTsConfigFile = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const misc_1 = require("@wfh/plink/wfh/dist/utils/misc");
const package_mgr_1 = require("@wfh/plink/wfh/dist/package-mgr");
const plink_1 = require("@wfh/plink");
const typescript_1 = tslib_1.__importDefault(require("typescript"));
const utils_1 = require("./utils");
// const log = log4File(__filename);
function changeTsConfigFile(entryFile) {
    // const craOptions = getCmdOptions();
    const rootDir = (0, misc_1.closestCommonParentDir)(Array.from((0, package_mgr_1.getState)().project2Packages.keys()).map(prjDir => path_1.default.resolve(plink_1.plinkEnv.rootDir, prjDir))).replace(/\\/g, '/');
    // const rootDir = plinkEnv.workDir;
    const tsconfigJson = typescript_1.default.readConfigFile(process.env._plink_cra_scripts_tsConfig, (file) => fs_1.default.readFileSync(file, 'utf-8')).config;
    // JSON.parse(fs.readFileSync(process.env._plink_cra_scripts_tsConfig!, 'utf8'));
    const tsconfigDir = path_1.default.dirname(process.env._plink_cra_scripts_tsConfig);
    // CRA does not allow we configure "compilerOptions.paths" in _plink_cra_scripts_tsConfig
    // (see create-react-app/packages/react-scripts/scripts/utils/verifyTypeScriptSetup.js)
    // therefore, initial paths is always empty.
    // const pathMapping: {[key: string]: string[]} = tsconfigJson.compilerOptions.paths = {};
    if (tsconfigJson.compilerOptions.baseUrl == null) {
        tsconfigJson.compilerOptions.baseUrl = './';
    }
    tsconfigJson.compilerOptions.preserveSymlinks = false;
    // tsconfigJson.compilerOptions.paths = pathMapping;
    (0, plink_1.setTsCompilerOptForNodePath)(tsconfigDir, './', tsconfigJson.compilerOptions, {
        workspaceDir: plink_1.plinkEnv.workDir,
        noSymlinks: true
        // realPackagePaths: true
    });
    (0, utils_1.runTsConfigHandlers)(tsconfigJson.compilerOptions);
    tsconfigJson.files = [path_1.default.relative(plink_1.plinkEnv.workDir, entryFile)];
    tsconfigJson.include = [];
    tsconfigJson.compilerOptions.rootDir = rootDir;
    const co = typescript_1.default.parseJsonConfigFileContent(tsconfigJson, typescript_1.default.sys, plink_1.plinkEnv.workDir.replace(/\\/g, '/'), undefined, process.env._plink_cra_scripts_tsConfig).options;
    return { tsconfigJson, compilerOptions: co };
}
exports.changeTsConfigFile = changeTsConfigFile;
//# sourceMappingURL=change-tsconfig.js.map