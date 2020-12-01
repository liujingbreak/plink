"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configFileInPackage = void 0;
const utils_1 = require("./utils");
const build_target_helper_1 = require("./build-target-helper");
const path_1 = __importDefault(require("path"));
const lodash_1 = __importDefault(require("lodash"));
const fs_1 = __importDefault(require("fs"));
// import type {PlinkEnv} from '@wfh/plink/wfh/dist/node-path';
const config_1 = __importDefault(require("@wfh/plink/wfh/dist/config"));
const config_handler_1 = require("@wfh/plink/wfh/dist/config-handler");
const log4js_1 = __importDefault(require("log4js"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const log = log4js_1.default.getLogger('cra-scripts-paths');
let craScriptsPaths;
function paths() {
    if (craScriptsPaths) {
        return craScriptsPaths;
    }
    const cmdOption = utils_1.getCmdOptions();
    const foundPkg = build_target_helper_1.findPackage(cmdOption.buildTarget);
    if (foundPkg == null) {
        throw new Error(`Can not find package for name like ${cmdOption.buildTarget}`);
    }
    const { dir, packageJson } = foundPkg;
    const paths = require(path_1.default.resolve('node_modules/react-scripts/config/paths'));
    const changedPaths = paths;
    // console.log('[debug] ', foundPkg);
    if (cmdOption.buildType === 'lib') {
        changedPaths.appBuild = path_1.default.resolve(dir, 'build');
        changedPaths.appIndexJs = path_1.default.resolve(dir, lodash_1.default.get(packageJson, 'dr.cra-lib-entry', 'public_api.ts'));
    }
    else if (cmdOption.buildType === 'app') {
        changedPaths.appIndexJs = path_1.default.resolve(dir, lodash_1.default.get(packageJson, 'dr.cra-app-entry', 'start.tsx'));
        changedPaths.appBuild = config_1.default.resolve('staticDir');
    }
    config_1.default.configHandlerMgr().runEachSync((cfgFile, result, handler) => {
        if (handler.changeCraPaths != null) {
            log.info('Execute CRA scripts paths overrides', cfgFile);
            handler.changeCraPaths(changedPaths);
        }
    });
    exports.configFileInPackage = path_1.default.resolve(dir, lodash_1.default.get(packageJson, ['dr', 'config-overrides-path'], 'config-overrides.ts'));
    if (fs_1.default.existsSync(exports.configFileInPackage)) {
        const cfgMgr = new config_handler_1.ConfigHandlerMgr([exports.configFileInPackage]);
        cfgMgr.runEachSync((cfgFile, result, handler) => {
            if (handler.changeCraPaths != null) {
                log.info('Execute CRA scripts paths configuration overrides from ', cfgFile);
                handler.changeCraPaths(changedPaths);
            }
        });
    }
    else {
        exports.configFileInPackage = null;
    }
    // tslint:disable-next-line: no-console
    // console.log('[cra-scripts-paths] changed react-scripts paths:\n', changedPaths);
    craScriptsPaths = changedPaths;
    fs_extra_1.default.mkdirpSync(changedPaths.appBuild);
    return changedPaths;
}
exports.default = paths;

//# sourceMappingURL=cra-scripts-paths.js.map
