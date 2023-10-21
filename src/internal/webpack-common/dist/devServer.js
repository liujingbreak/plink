"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const plink_1 = require("@wfh/plink");
const assets_processer_setting_1 = require("@wfh/assets-processer/isom/assets-processer-setting");
const static_middleware_1 = require("@wfh/assets-processer/dist/static-middleware");
const log = (0, plink_1.log4File)(__filename);
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
    const origin = webpackConfig.devServer.onBeforeSetupMiddleware;
    devServer.host = '0.0.0.0';
    devServer.onBeforeSetupMiddleware = function (devServer) {
        // To elimiate HMR web socket issue:
        //   Error [ERR_HTTP_HEADERS_SENT]: Cannot set headers after they are sent to the client
        // at ServerResponse.setHeader (_http_outgoing.js:470:11)
        // at Array.write (/Users/liujing/bk/credit-appl/node_modules/finalhandler/index.js:285:9)
        // at listener (/Users/liujing/bk/credit-appl/node_modules/on-finished/index.js:169:15)
        // at onFinish (/Users/liujing/bk/credit-appl/node_modules/on-finished/index.js:100:5)
        // at callback (/Users/liujing/bk/credit-appl/node_modules/ee-first/index.js:55:10)
        devServer.app.use((req, res, next) => {
            const old = res.setHeader;
            // const oldEnd = res.end;
            res.setHeader = function (...args) {
                try {
                    return old.apply(res, args);
                }
                catch (e) {
                    if (e.code === 'ERR_HTTP_HEADERS_SENT') {
                        log.warn('Cannot set headers after they are sent to the client');
                    }
                    else {
                        throw e;
                    }
                }
                return res;
            };
            next();
        });
        if (origin)
            origin.call(this, devServer);
        const staticHandler = (0, static_middleware_1.createStaticRoute)(plink_1.config.resolve('staticDir'), (0, assets_processer_setting_1.getSetting)().cacheControlMaxAge);
        devServer.app.use((req, res, next) => {
            if (req.url.indexOf('/dll/') >= 0) {
                log.debug('DLL resource request:', req.url);
                staticHandler(req, res, next);
            }
            else {
                next();
            }
        });
    };
    devServer.compress = true;
    if (devServer.headers == null)
        devServer.headers = {};
    // CORS enablement
    devServer.headers['Access-Control-Allow-Origin'] = '*';
    devServer.headers['Access-Control-Allow-Headers'] = '*';
    devServer.static.watch = false;
}
exports.default = default_1;
//# sourceMappingURL=devServer.js.map