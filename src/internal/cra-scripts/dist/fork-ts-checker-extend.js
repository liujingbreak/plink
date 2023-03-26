"use strict";
/**
 * This file is not used actually. This is an attempt to patch Tsconfig file of fock-ts-checker-webpack-plugin 4.1.6.
 * The actual working solution is hack-fork-ts-checker.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ForkTsCheckerExtend = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const fork_ts_checker_webpack_plugin_1 = tslib_1.__importDefault(require("fork-ts-checker-webpack-plugin"));
const misc_1 = require("@wfh/plink/wfh/dist/utils/misc");
const package_mgr_1 = require("@wfh/plink/wfh/dist/package-mgr");
const plink_1 = require("@wfh/plink");
const typescript_1 = tslib_1.__importDefault(require("typescript"));
const utils_1 = require("./utils");
// const log = log4File(__filename);
class ForkTsCheckerExtend extends fork_ts_checker_webpack_plugin_1.default {
    constructor(opts) {
        if (opts != null) {
            const plinkRoot = plink_1.plinkEnv.rootDir;
            const rootDir = (0, misc_1.closestCommonParentDir)(Array.from((0, package_mgr_1.getState)().project2Packages.keys())
                .map(prjDir => path_1.default.resolve(plinkRoot, prjDir))).replace(/\\/g, '/');
            const tsconfigJson = typescript_1.default.readConfigFile(opts.tsconfig, (file) => fs_1.default.readFileSync(file, 'utf-8')).config;
            const tsconfigDir = path_1.default.dirname(opts.tsconfig);
            // CRA does not allow we configure "compilerOptions.paths"
            // (see create-react-app/packages/react-scripts/scripts/utils/verifyTypeScriptSetup.js)
            // therefore, initial paths is always empty.
            const pathMapping = tsconfigJson.compilerOptions.paths = {};
            if (tsconfigJson.compilerOptions.baseUrl == null) {
                tsconfigJson.compilerOptions.baseUrl = './';
            }
            for (const [name, { realPath }] of (0, package_mgr_1.getState)().srcPackages.entries() || []) {
                const realDir = path_1.default.relative(tsconfigDir, realPath).replace(/\\/g, '/');
                pathMapping[name] = [realDir];
                pathMapping[name + '/*'] = [realDir + '/*'];
            }
            if ((0, package_mgr_1.getState)().linkedDrcp) {
                const drcpDir = path_1.default.relative(tsconfigDir, (0, package_mgr_1.getState)().linkedDrcp.realPath).replace(/\\/g, '/');
                pathMapping['@wfh/plink'] = [drcpDir];
                pathMapping['@wfh/plink/*'] = [drcpDir + '/*'];
            }
            tsconfigJson.compilerOptions.paths = pathMapping;
            (0, plink_1.setTsCompilerOptForNodePath)(tsconfigDir, './', tsconfigJson.compilerOptions, {
                workspaceDir: plink_1.plinkEnv.workDir || process.cwd()
            });
            (0, utils_1.runTsConfigHandlers)(tsconfigJson.compilerOptions);
            tsconfigJson.include = [path_1.default.relative(plink_1.plinkEnv.workDir || process.cwd(), process.env._plink_cra_scripts_indexJs)];
            tsconfigJson.compilerOptions.rootDir = rootDir;
            opts.compilerOptions = tsconfigJson.compilerOptions;
        }
        super(opts);
    }
}
exports.ForkTsCheckerExtend = ForkTsCheckerExtend;
//# sourceMappingURL=fork-ts-checker-extend.js.map