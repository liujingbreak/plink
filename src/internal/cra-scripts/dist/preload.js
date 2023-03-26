"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.poo = void 0;
const tslib_1 = require("tslib");
/* eslint-disable no-console */
/**
 * Do not actually import entity other than "type" from here
 * Because we have not set node path yet.
 */
const path_1 = tslib_1.__importDefault(require("path"));
const path_2 = require("path");
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const loaderHooks_1 = require("@wfh/plink/wfh/dist/loaderHooks");
const utils_1 = require("./utils");
const utils_2 = require("./utils");
const hack_webpack_api_1 = require("./hack-webpack-api");
const hack_fork_ts_checker_1 = require("./hack-fork-ts-checker");
// Avoid child process require us!
const deleteExecArgIdx = [];
for (let i = 0, l = process.execArgv.length; i < l; i++) {
    if (i < l - 1 && /^(?:-r|--require)$/.test(process.execArgv[i]) &&
        /^@wfh\/cra-scripts($|\/)/.test(process.execArgv[i + 1])) {
        deleteExecArgIdx.push(i);
    }
}
deleteExecArgIdx.reduce((offset, deleteIdx) => {
    process.execArgv.splice(deleteIdx + offset, 2);
    return offset + 2;
}, 0);
function poo() {
    const getCraPaths = require('./cra-scripts-paths').default;
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
    (0, loaderHooks_1.hookCommonJsRequire)((filename, target, req, resolve) => {
        if (filename.startsWith(reactScriptsPath + path_2.sep)) {
            if (filename === buildScriptsPath) {
                if (target === 'fs-extra' && (0, utils_2.getCmdOptions)().buildType === 'lib') {
                    // Disable copy public path
                    return Object.assign({}, fs_extra_1.default, {
                        copySync(src) {
                            console.log('[prepload] skip copy ', src);
                        }
                    });
                }
                if (target === 'webpack') {
                    return (0, hack_webpack_api_1.hackWebpack4Compiler)();
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
            if (target === 'react-dev-utils/openBrowser') {
                return require('./cra-open-browser').default;
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
    (0, hack_fork_ts_checker_1.register)();
}
exports.poo = poo;
function noClearConsole() {
    // origClearConsole();
    (0, utils_1.drawPuppy)('pooed on create-react-app');
}
//# sourceMappingURL=preload.js.map