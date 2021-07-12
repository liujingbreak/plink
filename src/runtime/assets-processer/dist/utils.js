"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupHttpProxy = exports.createResponseTimestamp = void 0;
const stream_1 = __importDefault(require("stream"));
const log4js_1 = require("log4js");
const __api_1 = __importDefault(require("__api"));
const lodash_1 = __importDefault(require("lodash"));
const plink_1 = require("@wfh/plink");
const http_proxy_middleware_1 = require("http-proxy-middleware");
const logTime = log4js_1.getLogger(__api_1.default.packageName + '.timestamp');
/**
 * Middleware for printing each response process duration time to log
 * @param req
 * @param res
 * @param next
 */
function createResponseTimestamp(req, res, next) {
    const date = new Date();
    const startTime = date.getTime();
    const end = res.end;
    function print() {
        const now = new Date().getTime();
        logTime.info(`request: ${req.method} ${req.originalUrl} | status: ${res.statusCode}, [response duration: ${now - startTime}ms` +
            `] (since ${date.toLocaleTimeString()} ${startTime}) [${req.header('user-agent')}]`);
    }
    res.end = function (chunk, encoding, cb) {
        const argv = Array.prototype.slice.call(arguments, 0);
        const lastArg = arguments[arguments.length - 1];
        if (typeof lastArg === 'function') {
            const originCb = arguments[arguments.length - 1];
            argv[argv.length - 1] = () => {
                originCb();
                print();
            };
        }
        else if (argv.length === 0) {
            argv.push(null, print);
        }
        else if (argv.length === 1) {
            argv.push(print);
        }
        const ret = end.apply(res, argv);
        return ret;
    };
    next();
}
exports.createResponseTimestamp = createResponseTimestamp;
/**
 * This function uses http-proxy-middleware internally.
 *
 * Create and use an HTTP request proxy for specific request path
 * @param proxyPath
 * @param targetUrl
 */
function setupHttpProxy(proxyPath, apiUrl, opts = {}) {
    proxyPath = lodash_1.default.trimEnd(proxyPath, '/');
    apiUrl = lodash_1.default.trimEnd(apiUrl, '/');
    const { protocol, host, pathname } = new URL(apiUrl);
    const patPath = new RegExp('^' + lodash_1.default.escapeRegExp(proxyPath) + '(/|$)');
    const hpmLog = log4js_1.getLogger('HPM.' + proxyPath);
    __api_1.default.expressAppSet(app => {
        app.use(proxyPath, http_proxy_middleware_1.createProxyMiddleware({
            // eslint-disable-next-line max-len
            target: protocol + '//' + host,
            changeOrigin: true,
            ws: false,
            secure: false,
            cookieDomainRewrite: { '*': '' },
            pathRewrite: opts.pathRewrite ? opts.pathRewrite : (path, req) => {
                // hpmLog.warn('patPath=', patPath, 'path=', path);
                const ret = path && path.replace(patPath, pathname == null ? '/' : pathname + '/');
                // hpmLog.info(`proxy to path: ${req.method} ${protocol + '//' + host}${ret}, req.url = ${req.url}`);
                return ret;
            },
            logLevel: 'debug',
            logProvider: provider => hpmLog,
            proxyTimeout: opts.proxyTimeout != null ? opts.proxyTimeout : 10000,
            onProxyReq(proxyReq, req, res) {
                if (opts.deleteOrigin)
                    proxyReq.removeHeader('Origin'); // Bypass CORS restrict on target server
                const referer = proxyReq.getHeader('referer');
                if (referer) {
                    proxyReq.setHeader('referer', `${protocol}//${host}${new URL(referer).pathname}`);
                }
                if (opts.onProxyReq) {
                    opts.onProxyReq(proxyReq, req, res);
                }
                hpmLog.info(`Proxy request to ${protocol}//${host}${proxyReq.path} method: ${req.method}, ${JSON.stringify(proxyReq.getHeaders(), null, '  ')}`);
                // if (api.config().devMode)
                //   hpmLog.info('on proxy request headers: ', JSON.stringify(proxyReq.getHeaders(), null, '  '));
            },
            onProxyRes(incoming, req, res) {
                var _a;
                incoming.headers['Access-Control-Allow-Origin'] = '*';
                if (__api_1.default.config().devMode) {
                    hpmLog.info(`Proxy recieve ${req.originalUrl}, status: ${incoming.statusCode}\n`, JSON.stringify(incoming.headers, null, '  '));
                }
                else {
                    hpmLog.info(`Proxy recieve ${req.originalUrl}, status: ${incoming.statusCode}`);
                }
                if (__api_1.default.config().devMode || ((_a = plink_1.config().cliOptions) === null || _a === void 0 ? void 0 : _a.verbose)) {
                    const ct = incoming.headers['content-type'];
                    hpmLog.info(`Response ${req.originalUrl} headers:\n`, incoming.rawHeaders);
                    const isText = (ct && /\b(json|text)\b/i.test(ct));
                    if (isText) {
                        const bufs = [];
                        incoming.pipe(new stream_1.default.Writable({
                            write(chunk, enc, cb) {
                                bufs.push((chunk.toString()));
                                cb();
                            },
                            final(cb) {
                                hpmLog.info(`Response ${req.originalUrl} text body:\n`, bufs.join(''));
                            }
                        }));
                    }
                }
                if (opts.onProxyRes) {
                    opts.onProxyRes(incoming, req, res);
                }
            },
            onError(err, req, res) {
                hpmLog.warn(err);
                if (opts.onError) {
                    opts.onError(err, req, res);
                }
            }
        }));
    });
}
exports.setupHttpProxy = setupHttpProxy;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFDQSxvREFBNEI7QUFDNUIsbUNBQWlDO0FBQ2pDLGtEQUF3QjtBQUN4QixvREFBdUI7QUFDdkIsc0NBQWtDO0FBQ2xDLGlFQUErRjtBQUUvRixNQUFNLE9BQU8sR0FBRyxrQkFBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsWUFBWSxDQUFDLENBQUM7QUFFMUQ7Ozs7O0dBS0c7QUFDSCxTQUFnQix1QkFBdUIsQ0FBQyxHQUFZLEVBQUUsR0FBYSxFQUFFLElBQWtCO0lBQ3JGLE1BQU0sSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7SUFDeEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBRWpDLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUM7SUFFcEIsU0FBUyxLQUFLO1FBQ1osTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNqQyxPQUFPLENBQUMsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLE1BQU0sSUFBSSxHQUFHLENBQUMsV0FBVyxjQUFjLEdBQUcsQ0FBQyxVQUFVLHlCQUF5QixHQUFHLEdBQUcsU0FBUyxJQUFJO1lBQzVILFlBQVksSUFBSSxDQUFDLGtCQUFrQixFQUFFLElBQUksU0FBUyxNQUFNLEdBQUcsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzFGLENBQUM7SUFFRCxHQUFHLENBQUMsR0FBRyxHQUFHLFVBQVMsS0FBVyxFQUFFLFFBQWdDLEVBQUUsRUFBZTtRQUMvRSxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQ2hELElBQUksT0FBTyxPQUFPLEtBQUssVUFBVSxFQUFFO1lBQ2pDLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQ2pELElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxHQUFHLEdBQUcsRUFBRTtnQkFDM0IsUUFBUSxFQUFFLENBQUM7Z0JBQ1gsS0FBSyxFQUFFLENBQUM7WUFDVixDQUFDLENBQUM7U0FDSDthQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDNUIsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDeEI7YUFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1lBQzVCLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7U0FDbEI7UUFDRCxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUNqQyxPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUMsQ0FBQztJQUVGLElBQUksRUFBRSxDQUFDO0FBQ1QsQ0FBQztBQS9CRCwwREErQkM7QUFFRDs7Ozs7O0dBTUc7QUFDSCxTQUFnQixjQUFjLENBQUMsU0FBaUIsRUFBRSxNQUFjLEVBQzlELE9BVUksRUFBRTtJQUVOLFNBQVMsR0FBRyxnQkFBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDdEMsTUFBTSxHQUFHLGdCQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNoQyxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsR0FBRyxJQUFJLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUVyRCxNQUFNLE9BQU8sR0FBRyxJQUFJLE1BQU0sQ0FBQyxHQUFHLEdBQUcsZ0JBQUMsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUM7SUFDdEUsTUFBTSxNQUFNLEdBQUcsa0JBQVMsQ0FBQyxNQUFNLEdBQUcsU0FBUyxDQUFDLENBQUM7SUFDN0MsZUFBRyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsRUFBRTtRQUN0QixHQUFHLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFDZiw2Q0FBSyxDQUFDO1lBQ0osbUNBQW1DO1lBQ25DLE1BQU0sRUFBRSxRQUFRLEdBQUcsSUFBSSxHQUFHLElBQUk7WUFDOUIsWUFBWSxFQUFFLElBQUk7WUFDbEIsRUFBRSxFQUFFLEtBQUs7WUFDVCxNQUFNLEVBQUUsS0FBSztZQUNiLG1CQUFtQixFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtZQUNoQyxXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLEVBQUU7Z0JBQ2hFLG1EQUFtRDtnQkFDbkQsTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFFBQVEsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQyxDQUFDO2dCQUNuRixxR0FBcUc7Z0JBQ3JHLE9BQU8sR0FBRyxDQUFDO1lBQ2IsQ0FBQztZQUNELFFBQVEsRUFBRSxPQUFPO1lBQ2pCLFdBQVcsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDLE1BQU07WUFDL0IsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxLQUFLO1lBQ25FLFVBQVUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLEdBQUc7Z0JBQzNCLElBQUksSUFBSSxDQUFDLFlBQVk7b0JBQ25CLFFBQVEsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyx3Q0FBd0M7Z0JBQzNFLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQzlDLElBQUksT0FBTyxFQUFFO29CQUNYLFFBQVEsQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLEdBQUcsUUFBUSxLQUFLLElBQUksR0FBRyxJQUFJLEdBQUcsQ0FBQyxPQUFpQixDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztpQkFDN0Y7Z0JBQ0QsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFO29CQUNuQixJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7aUJBQ3JDO2dCQUNELE1BQU0sQ0FBQyxJQUFJLENBQUMsb0JBQW9CLFFBQVEsS0FBSyxJQUFJLEdBQUcsUUFBUSxDQUFDLElBQUksWUFBWSxHQUFHLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQ2pKLDRCQUE0QjtnQkFDNUIsa0dBQWtHO1lBQ3BHLENBQUM7WUFDRCxVQUFVLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxHQUFHOztnQkFDM0IsUUFBUSxDQUFDLE9BQU8sQ0FBQyw2QkFBNkIsQ0FBQyxHQUFHLEdBQUcsQ0FBQztnQkFDdEQsSUFBSSxlQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsT0FBTyxFQUFFO29CQUN4QixNQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLENBQUMsV0FBVyxhQUFhLFFBQVEsQ0FBQyxVQUFXLElBQUksRUFDL0UsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO2lCQUNqRDtxQkFBTTtvQkFDTCxNQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixHQUFHLENBQUMsV0FBVyxhQUFhLFFBQVEsQ0FBQyxVQUFXLEVBQUUsQ0FBQyxDQUFDO2lCQUNsRjtnQkFDRCxJQUFJLGVBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxPQUFPLFdBQUksY0FBTSxFQUFFLENBQUMsVUFBVSwwQ0FBRSxPQUFPLENBQUEsRUFBRTtvQkFFeEQsTUFBTSxFQUFFLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztvQkFDNUMsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxXQUFXLGFBQWEsRUFBRSxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7b0JBQzNFLE1BQU0sTUFBTSxHQUFHLENBQUMsRUFBRSxJQUFJLGtCQUFrQixDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO29CQUNuRCxJQUFJLE1BQU0sRUFBRTt3QkFDVixNQUFNLElBQUksR0FBRyxFQUFjLENBQUM7d0JBQzVCLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxnQkFBTSxDQUFDLFFBQVEsQ0FBQzs0QkFDaEMsS0FBSyxDQUFDLEtBQWEsRUFBRSxHQUFHLEVBQUUsRUFBRTtnQ0FDMUIsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0NBQzlCLEVBQUUsRUFBRSxDQUFDOzRCQUNQLENBQUM7NEJBQ0QsS0FBSyxDQUFDLEVBQUU7Z0NBQ04sTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxXQUFXLGVBQWUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7NEJBQ3pFLENBQUM7eUJBQ0YsQ0FBQyxDQUFDLENBQUM7cUJBQ0w7aUJBQ0Y7Z0JBQ0QsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFO29CQUNuQixJQUFJLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7aUJBQ3JDO1lBQ0gsQ0FBQztZQUNELE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUc7Z0JBQ25CLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ2pCLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTtvQkFDaEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2lCQUM3QjtZQUNILENBQUM7U0FDRixDQUFDLENBQ0gsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQTFGRCx3Q0EwRkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1JlcXVlc3QsIFJlc3BvbnNlLCBOZXh0RnVuY3Rpb259IGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IHN0cmVhbSBmcm9tICdzdHJlYW0nO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge2NvbmZpZ30gZnJvbSAnQHdmaC9wbGluayc7XG5pbXBvcnQgeyBjcmVhdGVQcm94eU1pZGRsZXdhcmUgYXMgcHJveHksIE9wdGlvbnMgYXMgUHJveHlPcHRpb25zfSBmcm9tICdodHRwLXByb3h5LW1pZGRsZXdhcmUnO1xuXG5jb25zdCBsb2dUaW1lID0gZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcudGltZXN0YW1wJyk7XG5cbi8qKlxuICogTWlkZGxld2FyZSBmb3IgcHJpbnRpbmcgZWFjaCByZXNwb25zZSBwcm9jZXNzIGR1cmF0aW9uIHRpbWUgdG8gbG9nXG4gKiBAcGFyYW0gcmVxIFxuICogQHBhcmFtIHJlcyBcbiAqIEBwYXJhbSBuZXh0IFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUmVzcG9uc2VUaW1lc3RhbXAocmVxOiBSZXF1ZXN0LCByZXM6IFJlc3BvbnNlLCBuZXh0OiBOZXh0RnVuY3Rpb24pIHtcbiAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKCk7XG4gIGNvbnN0IHN0YXJ0VGltZSA9IGRhdGUuZ2V0VGltZSgpO1xuXG4gIGNvbnN0IGVuZCA9IHJlcy5lbmQ7XG5cbiAgZnVuY3Rpb24gcHJpbnQoKSB7XG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgbG9nVGltZS5pbmZvKGByZXF1ZXN0OiAke3JlcS5tZXRob2R9ICR7cmVxLm9yaWdpbmFsVXJsfSB8IHN0YXR1czogJHtyZXMuc3RhdHVzQ29kZX0sIFtyZXNwb25zZSBkdXJhdGlvbjogJHtub3cgLSBzdGFydFRpbWV9bXNgICtcbiAgICAgIGBdIChzaW5jZSAke2RhdGUudG9Mb2NhbGVUaW1lU3RyaW5nKCl9ICR7c3RhcnRUaW1lfSkgWyR7cmVxLmhlYWRlcigndXNlci1hZ2VudCcpIX1dYCk7XG4gIH1cblxuICByZXMuZW5kID0gZnVuY3Rpb24oY2h1bms/OiBhbnksIGVuY29kaW5nPzogc3RyaW5nIHwgKCgpID0+IHZvaWQpLCBjYj86ICgpID0+IHZvaWQpIHtcbiAgICBjb25zdCBhcmd2ID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcbiAgICBjb25zdCBsYXN0QXJnID0gYXJndW1lbnRzW2FyZ3VtZW50cy5sZW5ndGggLSAxXTtcbiAgICBpZiAodHlwZW9mIGxhc3RBcmcgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNvbnN0IG9yaWdpbkNiID0gYXJndW1lbnRzW2FyZ3VtZW50cy5sZW5ndGggLSAxXTtcbiAgICAgIGFyZ3ZbYXJndi5sZW5ndGggLSAxXSA9ICgpID0+IHtcbiAgICAgICAgb3JpZ2luQ2IoKTtcbiAgICAgICAgcHJpbnQoKTtcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChhcmd2Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgYXJndi5wdXNoKG51bGwsIHByaW50KTtcbiAgICB9IGVsc2UgaWYgKGFyZ3YubGVuZ3RoID09PSAxKSB7XG4gICAgICBhcmd2LnB1c2gocHJpbnQpO1xuICAgIH1cbiAgICBjb25zdCByZXQgPSBlbmQuYXBwbHkocmVzLCBhcmd2KTtcbiAgICByZXR1cm4gcmV0O1xuICB9O1xuXG4gIG5leHQoKTtcbn1cblxuLyoqXG4gKiBUaGlzIGZ1bmN0aW9uIHVzZXMgaHR0cC1wcm94eS1taWRkbGV3YXJlIGludGVybmFsbHkuXG4gKiBcbiAqIENyZWF0ZSBhbmQgdXNlIGFuIEhUVFAgcmVxdWVzdCBwcm94eSBmb3Igc3BlY2lmaWMgcmVxdWVzdCBwYXRoXG4gKiBAcGFyYW0gcHJveHlQYXRoIFxuICogQHBhcmFtIHRhcmdldFVybCBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldHVwSHR0cFByb3h5KHByb3h5UGF0aDogc3RyaW5nLCBhcGlVcmw6IHN0cmluZyxcbiAgb3B0czoge1xuICAgIC8qKiBCeXBhc3MgQ09SUyByZXN0cmljdCBvbiB0YXJnZXQgc2VydmVyICovXG4gICAgZGVsZXRlT3JpZ2luPzogYm9vbGVhbjtcbiAgICBwYXRoUmV3cml0ZT86IFByb3h5T3B0aW9uc1sncGF0aFJld3JpdGUnXTtcbiAgICBvblByb3h5UmVxPzogUHJveHlPcHRpb25zWydvblByb3h5UmVxJ107XG4gICAgb25Qcm94eVJlcz86IFByb3h5T3B0aW9uc1snb25Qcm94eVJlcyddO1xuICAgIG9uRXJyb3I/OiBQcm94eU9wdGlvbnNbJ29uRXJyb3InXTtcbiAgICBidWZmZXI/OiBQcm94eU9wdGlvbnNbJ2J1ZmZlciddO1xuICAgIHNlbGZIYW5kbGVSZXNwb25zZT86IFByb3h5T3B0aW9uc1snc2VsZkhhbmRsZVJlc3BvbnNlJ107XG4gICAgcHJveHlUaW1lb3V0PzogUHJveHlPcHRpb25zWydwcm94eVRpbWVvdXQnXTtcbiAgfSA9IHt9KSB7XG5cbiAgcHJveHlQYXRoID0gXy50cmltRW5kKHByb3h5UGF0aCwgJy8nKTtcbiAgYXBpVXJsID0gXy50cmltRW5kKGFwaVVybCwgJy8nKTtcbiAgY29uc3QgeyBwcm90b2NvbCwgaG9zdCwgcGF0aG5hbWUgfSA9IG5ldyBVUkwoYXBpVXJsKTtcblxuICBjb25zdCBwYXRQYXRoID0gbmV3IFJlZ0V4cCgnXicgKyBfLmVzY2FwZVJlZ0V4cChwcm94eVBhdGgpICsgJygvfCQpJyk7XG4gIGNvbnN0IGhwbUxvZyA9IGdldExvZ2dlcignSFBNLicgKyBwcm94eVBhdGgpO1xuICBhcGkuZXhwcmVzc0FwcFNldChhcHAgPT4ge1xuICAgIGFwcC51c2UocHJveHlQYXRoLFxuICAgICAgcHJveHkoe1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbWF4LWxlblxuICAgICAgICB0YXJnZXQ6IHByb3RvY29sICsgJy8vJyArIGhvc3QsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgd3M6IGZhbHNlLFxuICAgICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgICBjb29raWVEb21haW5SZXdyaXRlOiB7ICcqJzogJycgfSxcbiAgICAgICAgcGF0aFJld3JpdGU6IG9wdHMucGF0aFJld3JpdGUgPyAgb3B0cy5wYXRoUmV3cml0ZSA6IChwYXRoLCByZXEpID0+IHtcbiAgICAgICAgICAvLyBocG1Mb2cud2FybigncGF0UGF0aD0nLCBwYXRQYXRoLCAncGF0aD0nLCBwYXRoKTtcbiAgICAgICAgICBjb25zdCByZXQgPSBwYXRoICYmIHBhdGgucmVwbGFjZShwYXRQYXRoLCBwYXRobmFtZSA9PSBudWxsID8gJy8nIDogcGF0aG5hbWUgKyAnLycpO1xuICAgICAgICAgIC8vIGhwbUxvZy5pbmZvKGBwcm94eSB0byBwYXRoOiAke3JlcS5tZXRob2R9ICR7cHJvdG9jb2wgKyAnLy8nICsgaG9zdH0ke3JldH0sIHJlcS51cmwgPSAke3JlcS51cmx9YCk7XG4gICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgfSxcbiAgICAgICAgbG9nTGV2ZWw6ICdkZWJ1ZycsXG4gICAgICAgIGxvZ1Byb3ZpZGVyOiBwcm92aWRlciA9PiBocG1Mb2csXG4gICAgICAgIHByb3h5VGltZW91dDogb3B0cy5wcm94eVRpbWVvdXQgIT0gbnVsbCA/IG9wdHMucHJveHlUaW1lb3V0IDogMTAwMDAsXG4gICAgICAgIG9uUHJveHlSZXEocHJveHlSZXEsIHJlcSwgcmVzKSB7XG4gICAgICAgICAgaWYgKG9wdHMuZGVsZXRlT3JpZ2luKVxuICAgICAgICAgICAgcHJveHlSZXEucmVtb3ZlSGVhZGVyKCdPcmlnaW4nKTsgLy8gQnlwYXNzIENPUlMgcmVzdHJpY3Qgb24gdGFyZ2V0IHNlcnZlclxuICAgICAgICAgIGNvbnN0IHJlZmVyZXIgPSBwcm94eVJlcS5nZXRIZWFkZXIoJ3JlZmVyZXInKTtcbiAgICAgICAgICBpZiAocmVmZXJlcikge1xuICAgICAgICAgICAgcHJveHlSZXEuc2V0SGVhZGVyKCdyZWZlcmVyJywgYCR7cHJvdG9jb2x9Ly8ke2hvc3R9JHtuZXcgVVJMKHJlZmVyZXIgYXMgc3RyaW5nKS5wYXRobmFtZX1gKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKG9wdHMub25Qcm94eVJlcSkge1xuICAgICAgICAgICAgb3B0cy5vblByb3h5UmVxKHByb3h5UmVxLCByZXEsIHJlcyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGhwbUxvZy5pbmZvKGBQcm94eSByZXF1ZXN0IHRvICR7cHJvdG9jb2x9Ly8ke2hvc3R9JHtwcm94eVJlcS5wYXRofSBtZXRob2Q6ICR7cmVxLm1ldGhvZH0sICR7SlNPTi5zdHJpbmdpZnkocHJveHlSZXEuZ2V0SGVhZGVycygpLCBudWxsLCAnICAnKX1gKTtcbiAgICAgICAgICAvLyBpZiAoYXBpLmNvbmZpZygpLmRldk1vZGUpXG4gICAgICAgICAgLy8gICBocG1Mb2cuaW5mbygnb24gcHJveHkgcmVxdWVzdCBoZWFkZXJzOiAnLCBKU09OLnN0cmluZ2lmeShwcm94eVJlcS5nZXRIZWFkZXJzKCksIG51bGwsICcgICcpKTtcbiAgICAgICAgfSxcbiAgICAgICAgb25Qcm94eVJlcyhpbmNvbWluZywgcmVxLCByZXMpIHtcbiAgICAgICAgICBpbmNvbWluZy5oZWFkZXJzWydBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nXSA9ICcqJztcbiAgICAgICAgICBpZiAoYXBpLmNvbmZpZygpLmRldk1vZGUpIHtcbiAgICAgICAgICAgIGhwbUxvZy5pbmZvKGBQcm94eSByZWNpZXZlICR7cmVxLm9yaWdpbmFsVXJsfSwgc3RhdHVzOiAke2luY29taW5nLnN0YXR1c0NvZGUhfVxcbmAsXG4gICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KGluY29taW5nLmhlYWRlcnMsIG51bGwsICcgICcpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaHBtTG9nLmluZm8oYFByb3h5IHJlY2lldmUgJHtyZXEub3JpZ2luYWxVcmx9LCBzdGF0dXM6ICR7aW5jb21pbmcuc3RhdHVzQ29kZSF9YCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChhcGkuY29uZmlnKCkuZGV2TW9kZSB8fCBjb25maWcoKS5jbGlPcHRpb25zPy52ZXJib3NlKSB7XG5cbiAgICAgICAgICAgIGNvbnN0IGN0ID0gaW5jb21pbmcuaGVhZGVyc1snY29udGVudC10eXBlJ107XG4gICAgICAgICAgICBocG1Mb2cuaW5mbyhgUmVzcG9uc2UgJHtyZXEub3JpZ2luYWxVcmx9IGhlYWRlcnM6XFxuYCwgaW5jb21pbmcucmF3SGVhZGVycyk7XG4gICAgICAgICAgICBjb25zdCBpc1RleHQgPSAoY3QgJiYgL1xcYihqc29ufHRleHQpXFxiL2kudGVzdChjdCkpO1xuICAgICAgICAgICAgaWYgKGlzVGV4dCkge1xuICAgICAgICAgICAgICBjb25zdCBidWZzID0gW10gYXMgc3RyaW5nW107XG4gICAgICAgICAgICAgIGluY29taW5nLnBpcGUobmV3IHN0cmVhbS5Xcml0YWJsZSh7XG4gICAgICAgICAgICAgICAgd3JpdGUoY2h1bms6IEJ1ZmZlciwgZW5jLCBjYikge1xuICAgICAgICAgICAgICAgICAgYnVmcy5wdXNoKChjaHVuay50b1N0cmluZygpKSk7XG4gICAgICAgICAgICAgICAgICBjYigpO1xuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgZmluYWwoY2IpIHtcbiAgICAgICAgICAgICAgICAgIGhwbUxvZy5pbmZvKGBSZXNwb25zZSAke3JlcS5vcmlnaW5hbFVybH0gdGV4dCBib2R5OlxcbmAsIGJ1ZnMuam9pbignJykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAob3B0cy5vblByb3h5UmVzKSB7XG4gICAgICAgICAgICBvcHRzLm9uUHJveHlSZXMoaW5jb21pbmcsIHJlcSwgcmVzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIG9uRXJyb3IoZXJyLCByZXEsIHJlcykge1xuICAgICAgICAgIGhwbUxvZy53YXJuKGVycik7XG4gICAgICAgICAgaWYgKG9wdHMub25FcnJvcikge1xuICAgICAgICAgICAgb3B0cy5vbkVycm9yKGVyciwgcmVxLCByZXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICApO1xuICB9KTtcbn1cblxuIl19