"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
// import {printConfig} from './utils';
const devServer_1 = __importDefault(require("@wfh/webpack-common/dist/devServer"));
const origDevServerConfig = require('react-scripts/config/webpackDevServer.config');
module.exports = function (proxy, allowedHost) {
    const devServerCfg = origDevServerConfig.apply(this, arguments);
    devServerCfg.stats = 'normal';
    devServerCfg.quiet = false;
    devServer_1.default({ devServer: devServerCfg });
    // tslint:disable-next-line: no-console
    // console.log('Dev server configure:', printConfig(devServerCfg));
    return devServerCfg;
};

//# sourceMappingURL=webpack.devserver.config.js.map
