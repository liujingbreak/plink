"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const module_1 = __importDefault(require("module"));
const path_2 = require("path");
utils_1.drawPuppy('Loading my poo...');
utils_1.saveCmdArgToEnv();
poo();
function poo() {
    const getCraPaths = require('./cra-scripts-paths').default;
    const reactScriptsPath = `${path_2.sep}node_modules${path_2.sep}react-scripts${path_2.sep}`;
    const reactDevUtilsPath = `${path_2.sep}node_modules${path_2.sep}react-dev-utils${path_2.sep}`;
    const buildScriptsPath = path_1.default.join('node_modules', 'react-scripts', 'scripts', 'build.js');
    const superReq = module_1.default.prototype.require;
    // TODO: Should use require-injector new version
    module_1.default.prototype.require = function (target) {
        if (this.filename.indexOf(reactScriptsPath) >= 0) {
            if (this.filename.endsWith(buildScriptsPath)) {
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
            switch (target) {
                case '../config/webpack.config':
                    target = require.resolve('./webpack.config');
                    // console.log(this.filename, target);
                    break;
                case '../config/webpackDevServer.config':
                    target = require.resolve('./webpack.devserver.config');
                    break;
                default:
                    if (target.endsWith('/clearConsole')) {
                        return clearConsole;
                    }
                    else if (target.endsWith('/paths') &&
                        /[\\/]react-scripts[\\/]config[\\/]paths$/.test(path_2.resolve(path_2.dirname(this.filename), target))) {
                        // console.log(`[preload] source: ${this.filename},\n  target: react-scripts/config/paths`);
                        return getCraPaths();
                    }
            }
        }
        else if (this.filename.indexOf(reactDevUtilsPath) >= 0) {
            if (target.endsWith('/clearConsole')) {
                return clearConsole;
            }
        }
        return superReq.call(this, target);
    };
}
function clearConsole() {
    // origClearConsole();
    utils_1.drawPuppy('pooed on create-react-app');
}
require(path_1.default.resolve('node_modules/react-scripts/bin/react-scripts.js'));

//# sourceMappingURL=preload.js.map
