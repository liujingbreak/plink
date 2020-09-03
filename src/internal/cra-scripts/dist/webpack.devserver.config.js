"use strict";
// import {printConfig} from './utils';
const origDevServerConfig = require('react-scripts/config/webpackDevServer.config');
module.exports = function (proxy, allowedHost) {
    const devServerCfg = origDevServerConfig.apply(this, arguments);
    devServerCfg.stats = 'normal';
    // tslint:disable-next-line: no-console
    // console.log('Dev server configure:', printConfig(devServerCfg));
    return devServerCfg;
};

//# sourceMappingURL=webpack.devserver.config.js.map
