"use strict";
const tslib_1 = require("tslib");
const devServer_1 = tslib_1.__importDefault(require("@wfh/webpack-common/dist/devServer"));
const plink_1 = require("@wfh/plink");
const utils_1 = require("./utils");
const log = plink_1.logger.getLogger('@wfh/cra-scripts.webpack.devserver.config');
const origDevServerConfig = require('react-scripts/config/webpackDevServer.config');
module.exports = function (...args) {
    // eslint-disable-next-line prefer-rest-params
    const devServerCfg = origDevServerConfig.apply(this, args);
    // devServerCfg.stats = 'normal';
    // devServerCfg.quiet = false;
    (0, devServer_1.default)({ devServer: devServerCfg });
    // if (devServerCfg.watchOptions?.ignored) {
    //   delete devServerCfg.watchOptions.ignored;
    // }
    log.info('Dev server configure:', (0, utils_1.printConfig)(devServerCfg));
    return devServerCfg;
};
//# sourceMappingURL=webpack.devserver.config.js.map