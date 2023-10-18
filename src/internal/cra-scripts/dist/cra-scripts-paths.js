"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfigFileInPackage = void 0;
const tslib_1 = require("tslib");
// import {findPackage} from './build-target-helper';
const node_path_1 = tslib_1.__importDefault(require("node:path"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
// import type {PlinkEnv} from '@wfh/plink/wfh/dist/node-path';
const config_1 = tslib_1.__importDefault(require("@wfh/plink/wfh/dist/config"));
const config_handler_1 = require("@wfh/plink/wfh/dist/config-handler");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const plink_1 = require("@wfh/plink");
const types_1 = require("./types");
const utils_1 = require("./utils");
const log = (0, plink_1.log4File)(__filename);
let craScriptsPaths;
let configFileInPackage;
function getConfigFileInPackage() {
    if (configFileInPackage) {
        return configFileInPackage;
    }
    else {
        paths();
        return configFileInPackage;
    }
}
exports.getConfigFileInPackage = getConfigFileInPackage;
function paths() {
    if (craScriptsPaths) {
        return craScriptsPaths;
    }
    const cmdOption = (0, utils_1.getCmdOptions)();
    const foundPkg = [...(0, plink_1.findPackagesByNames)([cmdOption.buildTarget])][0];
    if (foundPkg == null) {
        throw new Error(`Can not find package for name like ${cmdOption.buildTarget}`);
    }
    const { json: packageJson, realPath: pkgDir, path: pkgSymlinkDir } = foundPkg;
    const paths = require(node_path_1.default.resolve('node_modules/react-scripts/config/paths'));
    const changedPaths = paths;
    const plinkProps = packageJson.plink ? packageJson.plink : packageJson.dr;
    if (cmdOption.buildType === 'lib') {
        changedPaths.appBuild = node_path_1.default.resolve(pkgDir, 'build');
        changedPaths.appIndexJs = node_path_1.default.resolve(pkgDir, lodash_1.default.get(plinkProps, [types_1.PKG_LIB_ENTRY_PROP], types_1.PKG_LIB_ENTRY_DEFAULT));
        changedPaths.plinkEntryFileSymlink = node_path_1.default.resolve(pkgSymlinkDir, lodash_1.default.get(plinkProps, [types_1.PKG_LIB_ENTRY_PROP], types_1.PKG_LIB_ENTRY_DEFAULT));
    }
    else if (cmdOption.buildType === 'app') {
        changedPaths.appIndexJs = node_path_1.default.resolve(pkgDir, lodash_1.default.get(plinkProps, [types_1.PKG_APP_ENTRY_PROP], types_1.PKG_APP_ENTRY_DEFAULT));
        changedPaths.plinkEntryFileSymlink = node_path_1.default.resolve(pkgSymlinkDir, lodash_1.default.get(plinkProps, [types_1.PKG_APP_ENTRY_PROP], types_1.PKG_APP_ENTRY_DEFAULT));
        changedPaths.appBuild = config_1.default.resolve('staticDir');
    }
    changedPaths.appWebpackCache = node_path_1.default.join(plink_1.plinkEnv.distDir, 'webpack-cache');
    changedPaths.appTsBuildInfoFile = node_path_1.default.resolve(plink_1.plinkEnv.distDir, 'cra-scripts.forked-ts-checker.tsbuildinfo.json');
    configFileInPackage = node_path_1.default.resolve(pkgDir, lodash_1.default.get(plinkProps, ['config-overrides-path'], 'config-overrides.ts'));
    if (fs_1.default.existsSync(configFileInPackage)) {
        const cfgMgr = new config_handler_1.ConfigHandlerMgr([configFileInPackage]);
        cfgMgr.runEachSync((cfgFile, result, handler) => {
            if (handler.changeCraPaths != null) {
                log.info('Execute CRA scripts paths configuration overrides from ', cfgFile);
                handler.changeCraPaths(changedPaths, (0, plink_1.config)().cliOptions.env, cmdOption);
            }
        });
    }
    else {
        configFileInPackage = null;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    config_1.default.configHandlerMgrChanged(handler => handler.runEachSync((cfgFile, _result, handler) => {
        if (handler.changeCraPaths != null) {
            log.info('Execute CRA scripts paths configuration', cfgFile);
            handler.changeCraPaths(changedPaths, (0, plink_1.config)().cliOptions.env, cmdOption);
        }
    }));
    if (!changedPaths.publicUrlOrPath.endsWith('/'))
        changedPaths.publicUrlOrPath += '/';
    // eslint-disable-next-line no-console
    // console.log('[cra-scripts-paths] changed react-scripts paths:\n', changedPaths);
    craScriptsPaths = changedPaths;
    fs_extra_1.default.mkdirpSync(changedPaths.appBuild);
    // fork-ts-checker needs this file path
    // process.env._plink_cra_scripts_indexJs = changedPaths.appIndexJs;
    process.env._plink_cra_scripts_tsConfig = changedPaths.appTsConfig;
    // log.warn(changedPaths);
    return changedPaths;
}
exports.default = paths;
//# sourceMappingURL=cra-scripts-paths.js.map