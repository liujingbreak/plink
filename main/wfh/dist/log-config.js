"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// eslint-disable  no-console
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
// import config from './config';
const log4js_1 = __importDefault(require("log4js"));
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
    // const opt = {
    //   cwd: rootPath,
    //   reloadSecs: 9999
    // };
    // if (reloadSec !== undefined)
    //   opt.reloadSecs = reloadSec;
    try {
        let localSetting = require(log4jsConfig);
        if (localSetting.setup instanceof Function) {
            localSetting = localSetting.setup(configObj);
        }
        log4js_1.default.configure(localSetting);
        log4js_1.default.getLogger('logConfig').info(`\n\n-------------- Log ${new Date().toLocaleString()} ----------------\n`);
        void Promise.resolve().then(() => __importStar(require('./store'))).then(store => store.startLogging());
    }
    catch (e) {
        log.error(e);
        // log.info('\nIt seems current log4js configure file is outdated, please delete\n\t' + log4jsConfig +
        // 	'\n  and run "drcp init" to get a new one.\n');
        // // log4js.configure({
        // // 	appenders: {out: {type: 'stdout'}},
        // // 	categories: {default: {appenders: ['out'], level: 'info'}}
        // // });
    }
}
exports.default = default_1;
//# sourceMappingURL=log-config.js.map