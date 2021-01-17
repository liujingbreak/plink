"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.poo = void 0;
// tslint:disable: no-console
/**
 * Do not actually import entity other than "type" from here
 * Because we have not set node path yet.
 */
const utils_1 = require("./utils");
const utils_2 = require("./utils");
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const hack_webpack_api_1 = require("./hack-webpack-api");
const path_2 = require("path");
const loaderHooks_1 = require("@wfh/plink/wfh/dist/loaderHooks");
const hack_fork_ts_checker_1 = require("./hack-fork-ts-checker");
// Avoid child process require us!
const deleteExecArgIdx = [];
for (let i = 0, l = process.execArgv.length; i < l; i++) {
    if (i < l - 1 && /^(?:\-r|\-\-require)$/.test(process.execArgv[i]) &&
        /^@wfh\/cra\-scripts($|\/)/.test(process.execArgv[i + 1])) {
        deleteExecArgIdx.push(i);
    }
}
deleteExecArgIdx.reduce((offset, deleteIdx) => {
    process.execArgv.splice(deleteIdx + offset, 2);
    return offset + 2;
}, 0);
// drawPuppy('Loading my poo...');
// saveCmdArgToEnv();
// poo();
function poo() {
    let getCraPaths = require('./cra-scripts-paths').default;
    const reactScriptsPath = path_1.default.resolve('node_modules/react-scripts');
    // const reactDevUtilsPath = Path.resolve('node_modules/react-dev-utils');
    const buildScriptsPath = path_1.default.resolve('node_modules', 'react-scripts', 'scripts', 'build.js');
    const reactWebpackCfg = path_1.default.resolve('node_modules/react-scripts/config/webpack.config.js');
    const reactWebpackDevServerCfg = path_1.default.resolve('node_modules/react-scripts/config/webpackDevServer.config.js');
    const clearConsole = path_1.default.resolve('node_modules/react-dev-utils/clearConsole.js');
    const craPaths = path_1.default.resolve('node_modules/react-scripts/config/paths.js');
    const craPackagesPathPrefix = path_1.default.resolve('node_modules/react-');
    // Disable @pmmmwh/react-refresh-webpack-plugin, since it excludes our node_modules
    // from HMR
    process.env.FAST_REFRESH = 'false';
    loaderHooks_1.hookCommonJsRequire((filename, target, req, resolve) => {
        if (filename.startsWith(reactScriptsPath + path_2.sep)) {
            if (filename === buildScriptsPath) {
                if (target === 'fs-extra' && utils_2.getCmdOptions().buildType === 'lib') {
                    // Disable copy public path
                    return Object.assign({}, fs_extra_1.default, {
                        copySync(src) {
                            console.log('[prepload] skip copy ', src);
                        }
                    });
                }
                if (target === 'webpack') {
                    return hack_webpack_api_1.hackWebpack4Compiler();
                }
            }
            switch (resolve(target)) {
                case reactWebpackCfg:
                    return require('./webpack.config');
                case reactWebpackDevServerCfg:
                    return require('./webpack.devserver.config');
                case clearConsole:
                    return noClearConsole;
                case craPaths:
                    return getCraPaths();
                default:
            }
        }
        else if (filename.startsWith(craPackagesPathPrefix)) {
            switch (resolve(target)) {
                case craPaths:
                    return getCraPaths();
                case clearConsole:
                    return noClearConsole;
                default:
            }
        }
    });
    hack_fork_ts_checker_1.register();
}
exports.poo = poo;
function noClearConsole() {
    // origClearConsole();
    utils_1.drawPuppy('pooed on create-react-app');
}

//# sourceMappingURL=../../../../../../web-fun-house/src/internal/cra-scripts/dist/preload.js.map
