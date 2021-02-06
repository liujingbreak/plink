"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const log4js_1 = __importDefault(require("log4js"));
// import {getLanIPv4} from '@wfh/plink/wfh/dist/utils/network-util';
const log = log4js_1.default.getLogger('config-webpack');
/**
 * Avoid process exit when encountering Error like ERR_HTTP_HEADERS_SENT
 * Allow CORS
 * @param webpackConfig
 */
function default_1(webpackConfig) {
    if (!webpackConfig.devServer) {
        return;
    }
    const devServer = webpackConfig.devServer;
    const origin = webpackConfig.devServer.before;
    devServer.host = '0.0.0.0';
    devServer.before = function before(app) {
        // To elimiate HMR web socket issue:
        //   Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client
        // at ServerResponse.setHeader (_http_outgoing.js:470:11)
        // at Array.write (/Users/liujing/bk/credit-appl/node_modules/finalhandler/index.js:285:9)
        // at listener (/Users/liujing/bk/credit-appl/node_modules/on-finished/index.js:169:15)
        // at onFinish (/Users/liujing/bk/credit-appl/node_modules/on-finished/index.js:100:5)
        // at callback (/Users/liujing/bk/credit-appl/node_modules/ee-first/index.js:55:10)
        app.use((req, res, next) => {
            const old = res.setHeader;
            // const oldEnd = res.end;
            res.setHeader = function () {
                try {
                    old.apply(res, arguments);
                }
                catch (e) {
                    if (e.code === 'ERR_HTTP_HEADERS_SENT') {
                        log.warn('Cannot set headers after they are sent to the client');
                    }
                    else {
                        throw e;
                    }
                }
            };
            next();
        });
        if (origin)
            origin.apply(this, arguments);
    };
    devServer.compress = true;
    if (devServer.headers == null)
        devServer.headers = {};
    // CORS enablement
    devServer.headers['Access-Control-Allow-Origin'] = '*';
    devServer.headers['Access-Control-Allow-Headers'] = '*';
}
exports.default = default_1;
//# sourceMappingURL=devServer.js.map