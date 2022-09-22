"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// eslint-disable  no-console
const path_1 = tslib_1.__importDefault(require("path"));
const node_cluster_1 = tslib_1.__importDefault(require("node:cluster"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const log4js_1 = tslib_1.__importDefault(require("log4js"));
const log4js_appenders_1 = require("./utils/log4js-appenders");
// import config from './config';
const log = log4js_1.default.getLogger('plink.log-config');
function default_1(configObj) {
    const { rootPath } = configObj;
    log.info('[log-config] log4js at', require.resolve('log4js'));
    const log4jsConfig = path_1.default.join(rootPath, 'log4js.js');
    if (!fs_extra_1.default.existsSync(log4jsConfig)) {
        log.info('Logging configuration is not found %s', log4jsConfig);
        return;
    }
    fs_extra_1.default.mkdirpSync(path_1.default.resolve(rootPath, 'logs'));
    try {
        let localSetting = require(log4jsConfig);
        if (localSetting.setup instanceof Function) {
            localSetting = localSetting.setup(configObj);
        }
        // Same logic as bootstrap-process#configDefaultLog()
        if (node_cluster_1.default.isWorker) {
            for (const key of Object.keys(localSetting.appenders)) {
                localSetting.appenders[key] = { type: log4js_appenders_1.doNothingAppender, name: 'ignore cluster' };
            }
        }
        else if (process.env.__plinkLogMainPid !== process.pid + '' && process.send) {
            for (const key of Object.keys(localSetting.appenders)) {
                localSetting.appenders[key] = { type: log4js_appenders_1.childProcessAppender, name: 'send to parent' };
            }
        }
        log4js_1.default.configure(localSetting);
        log.info(`\n\nPID:${process.pid} -------------- ${new Date().toLocaleString()} ----------------\n`);
    }
    catch (e) {
        log.error(e);
    }
}
exports.default = default_1;
//# sourceMappingURL=log-config.js.map