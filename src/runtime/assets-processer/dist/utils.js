"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
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
exports.setupHttpProxy = exports.createResponseTimestamp = void 0;
const stream_1 = __importDefault(require("stream"));
const log4js_1 = require("log4js");
const __api_1 = __importDefault(require("__api"));
const Url = __importStar(require("url"));
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
                    proxyReq.setHeader('referer', `${protocol}//${host}${Url.parse(referer).pathname}`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0Esb0RBQTRCO0FBQzVCLG1DQUFpQztBQUNqQyxrREFBd0I7QUFDeEIseUNBQTJCO0FBQzNCLG9EQUF1QjtBQUN2QixzQ0FBa0M7QUFDbEMsaUVBQStGO0FBRS9GLE1BQU0sT0FBTyxHQUFHLGtCQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxZQUFZLENBQUMsQ0FBQztBQUUxRDs7Ozs7R0FLRztBQUNILFNBQWdCLHVCQUF1QixDQUFDLEdBQVksRUFBRSxHQUFhLEVBQUUsSUFBa0I7SUFDckYsTUFBTSxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztJQUN4QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7SUFFakMsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQztJQUVwQixTQUFTLEtBQUs7UUFDWixNQUFNLEdBQUcsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2pDLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxXQUFXLGNBQWMsR0FBRyxDQUFDLFVBQVUseUJBQXlCLEdBQUcsR0FBRyxTQUFTLElBQUk7WUFDNUgsWUFBWSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxTQUFTLE1BQU0sR0FBRyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUUsR0FBRyxDQUFDLENBQUM7SUFDMUYsQ0FBQztJQUVELEdBQUcsQ0FBQyxHQUFHLEdBQUcsVUFBUyxLQUFXLEVBQUUsUUFBZ0MsRUFBRSxFQUFlO1FBQy9FLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEQsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDaEQsSUFBSSxPQUFPLE9BQU8sS0FBSyxVQUFVLEVBQUU7WUFDakMsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDakQsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLEdBQUcsR0FBRyxFQUFFO2dCQUMzQixRQUFRLEVBQUUsQ0FBQztnQkFDWCxLQUFLLEVBQUUsQ0FBQztZQUNWLENBQUMsQ0FBQztTQUNIO2FBQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRTtZQUM1QixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztTQUN4QjthQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7WUFDNUIsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUNsQjtRQUNELE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQ2pDLE9BQU8sR0FBRyxDQUFDO0lBQ2IsQ0FBQyxDQUFDO0lBRUYsSUFBSSxFQUFFLENBQUM7QUFDVCxDQUFDO0FBL0JELDBEQStCQztBQUVEOzs7Ozs7R0FNRztBQUNILFNBQWdCLGNBQWMsQ0FBQyxTQUFpQixFQUFFLE1BQWMsRUFDOUQsT0FVSSxFQUFFO0lBRU4sU0FBUyxHQUFHLGdCQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQztJQUN0QyxNQUFNLEdBQUcsZ0JBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQ2hDLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxHQUFHLElBQUksR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBRXJELE1BQU0sT0FBTyxHQUFHLElBQUksTUFBTSxDQUFDLEdBQUcsR0FBRyxnQkFBQyxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsR0FBRyxPQUFPLENBQUMsQ0FBQztJQUN0RSxNQUFNLE1BQU0sR0FBRyxrQkFBUyxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUMsQ0FBQztJQUM3QyxlQUFHLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1FBQ3RCLEdBQUcsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUNmLDZDQUFLLENBQUM7WUFDSixtQ0FBbUM7WUFDbkMsTUFBTSxFQUFFLFFBQVEsR0FBRyxJQUFJLEdBQUcsSUFBSTtZQUM5QixZQUFZLEVBQUUsSUFBSTtZQUNsQixFQUFFLEVBQUUsS0FBSztZQUNULG1CQUFtQixFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRTtZQUNoQyxXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLEVBQUU7Z0JBQ2hFLG1EQUFtRDtnQkFDbkQsTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLFFBQVEsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQyxDQUFDO2dCQUNuRixxR0FBcUc7Z0JBQ3JHLE9BQU8sR0FBRyxDQUFDO1lBQ2IsQ0FBQztZQUNELFFBQVEsRUFBRSxPQUFPO1lBQ2pCLFdBQVcsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDLE1BQU07WUFDL0IsWUFBWSxFQUFFLElBQUksQ0FBQyxZQUFZLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxLQUFLO1lBQ25FLFVBQVUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLEdBQUc7Z0JBQzNCLElBQUksSUFBSSxDQUFDLFlBQVk7b0JBQ25CLFFBQVEsQ0FBQyxZQUFZLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyx3Q0FBd0M7Z0JBQzNFLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLENBQUM7Z0JBQzlDLElBQUksT0FBTyxFQUFFO29CQUNYLFFBQVEsQ0FBQyxTQUFTLENBQUMsU0FBUyxFQUFFLEdBQUcsUUFBUSxLQUFLLElBQUksR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQWlCLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO2lCQUMvRjtnQkFDRCxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUU7b0JBQ25CLElBQUksQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztpQkFDckM7Z0JBQ0QsTUFBTSxDQUFDLElBQUksQ0FBQyxvQkFBb0IsUUFBUSxLQUFLLElBQUksR0FBRyxRQUFRLENBQUMsSUFBSSxZQUFZLEdBQUcsQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDakosNEJBQTRCO2dCQUM1QixrR0FBa0c7WUFDcEcsQ0FBQztZQUNELFVBQVUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLEdBQUc7O2dCQUMzQixRQUFRLENBQUMsT0FBTyxDQUFDLDZCQUE2QixDQUFDLEdBQUcsR0FBRyxDQUFDO2dCQUN0RCxJQUFJLGVBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxPQUFPLEVBQUU7b0JBQ3hCLE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsQ0FBQyxXQUFXLGFBQWEsUUFBUSxDQUFDLFVBQVcsSUFBSSxFQUMvRSxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7aUJBQ2pEO3FCQUFNO29CQUNMLE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsQ0FBQyxXQUFXLGFBQWEsUUFBUSxDQUFDLFVBQVcsRUFBRSxDQUFDLENBQUM7aUJBQ2xGO2dCQUNELElBQUksZUFBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLE9BQU8sV0FBSSxjQUFNLEVBQUUsQ0FBQyxVQUFVLDBDQUFFLE9BQU8sQ0FBQSxFQUFFO29CQUV4RCxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFDO29CQUM1QyxNQUFNLE1BQU0sR0FBRyxDQUFDLEVBQUUsSUFBSSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztvQkFDbkQsSUFBSSxNQUFNLEVBQUU7d0JBQ1YsTUFBTSxJQUFJLEdBQUcsRUFBYyxDQUFDO3dCQUM1QixRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksZ0JBQU0sQ0FBQyxRQUFRLENBQUM7NEJBQ2hDLEtBQUssQ0FBQyxLQUFhLEVBQUUsR0FBRyxFQUFFLEVBQUU7Z0NBQzFCLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO2dDQUM5QixFQUFFLEVBQUUsQ0FBQzs0QkFDUCxDQUFDOzRCQUNELEtBQUssQ0FBQyxFQUFFO2dDQUNOLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsV0FBVyxlQUFlLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDOzRCQUN6RSxDQUFDO3lCQUNGLENBQUMsQ0FBQyxDQUFDO3FCQUNMO2lCQUNGO2dCQUNELElBQUksSUFBSSxDQUFDLFVBQVUsRUFBRTtvQkFDbkIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2lCQUNyQztZQUNILENBQUM7WUFDRCxPQUFPLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHO2dCQUNuQixNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNqQixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7b0JBQ2hCLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztpQkFDN0I7WUFDSCxDQUFDO1NBQ0YsQ0FBQyxDQUNILENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUF4RkQsd0NBd0ZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtSZXF1ZXN0LCBSZXNwb25zZSwgTmV4dEZ1bmN0aW9ufSBmcm9tICdleHByZXNzJztcbmltcG9ydCBzdHJlYW0gZnJvbSAnc3RyZWFtJztcbmltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgKiBhcyBVcmwgZnJvbSAndXJsJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge2NvbmZpZ30gZnJvbSAnQHdmaC9wbGluayc7XG5pbXBvcnQgeyBjcmVhdGVQcm94eU1pZGRsZXdhcmUgYXMgcHJveHksIE9wdGlvbnMgYXMgUHJveHlPcHRpb25zfSBmcm9tICdodHRwLXByb3h5LW1pZGRsZXdhcmUnO1xuXG5jb25zdCBsb2dUaW1lID0gZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcudGltZXN0YW1wJyk7XG5cbi8qKlxuICogTWlkZGxld2FyZSBmb3IgcHJpbnRpbmcgZWFjaCByZXNwb25zZSBwcm9jZXNzIGR1cmF0aW9uIHRpbWUgdG8gbG9nXG4gKiBAcGFyYW0gcmVxIFxuICogQHBhcmFtIHJlcyBcbiAqIEBwYXJhbSBuZXh0IFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUmVzcG9uc2VUaW1lc3RhbXAocmVxOiBSZXF1ZXN0LCByZXM6IFJlc3BvbnNlLCBuZXh0OiBOZXh0RnVuY3Rpb24pIHtcbiAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKCk7XG4gIGNvbnN0IHN0YXJ0VGltZSA9IGRhdGUuZ2V0VGltZSgpO1xuXG4gIGNvbnN0IGVuZCA9IHJlcy5lbmQ7XG5cbiAgZnVuY3Rpb24gcHJpbnQoKSB7XG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgbG9nVGltZS5pbmZvKGByZXF1ZXN0OiAke3JlcS5tZXRob2R9ICR7cmVxLm9yaWdpbmFsVXJsfSB8IHN0YXR1czogJHtyZXMuc3RhdHVzQ29kZX0sIFtyZXNwb25zZSBkdXJhdGlvbjogJHtub3cgLSBzdGFydFRpbWV9bXNgICtcbiAgICAgIGBdIChzaW5jZSAke2RhdGUudG9Mb2NhbGVUaW1lU3RyaW5nKCl9ICR7c3RhcnRUaW1lfSkgWyR7cmVxLmhlYWRlcigndXNlci1hZ2VudCcpIX1dYCk7XG4gIH1cblxuICByZXMuZW5kID0gZnVuY3Rpb24oY2h1bms/OiBhbnksIGVuY29kaW5nPzogc3RyaW5nIHwgKCgpID0+IHZvaWQpLCBjYj86ICgpID0+IHZvaWQpIHtcbiAgICBjb25zdCBhcmd2ID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcbiAgICBjb25zdCBsYXN0QXJnID0gYXJndW1lbnRzW2FyZ3VtZW50cy5sZW5ndGggLSAxXTtcbiAgICBpZiAodHlwZW9mIGxhc3RBcmcgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNvbnN0IG9yaWdpbkNiID0gYXJndW1lbnRzW2FyZ3VtZW50cy5sZW5ndGggLSAxXTtcbiAgICAgIGFyZ3ZbYXJndi5sZW5ndGggLSAxXSA9ICgpID0+IHtcbiAgICAgICAgb3JpZ2luQ2IoKTtcbiAgICAgICAgcHJpbnQoKTtcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChhcmd2Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgYXJndi5wdXNoKG51bGwsIHByaW50KTtcbiAgICB9IGVsc2UgaWYgKGFyZ3YubGVuZ3RoID09PSAxKSB7XG4gICAgICBhcmd2LnB1c2gocHJpbnQpO1xuICAgIH1cbiAgICBjb25zdCByZXQgPSBlbmQuYXBwbHkocmVzLCBhcmd2KTtcbiAgICByZXR1cm4gcmV0O1xuICB9O1xuXG4gIG5leHQoKTtcbn1cblxuLyoqXG4gKiBUaGlzIGZ1bmN0aW9uIHVzZXMgaHR0cC1wcm94eS1taWRkbGV3YXJlIGludGVybmFsbHkuXG4gKiBcbiAqIENyZWF0ZSBhbmQgdXNlIGFuIEhUVFAgcmVxdWVzdCBwcm94eSBmb3Igc3BlY2lmaWMgcmVxdWVzdCBwYXRoXG4gKiBAcGFyYW0gcHJveHlQYXRoIFxuICogQHBhcmFtIHRhcmdldFVybCBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldHVwSHR0cFByb3h5KHByb3h5UGF0aDogc3RyaW5nLCBhcGlVcmw6IHN0cmluZyxcbiAgb3B0czoge1xuICAgIC8qKiBCeXBhc3MgQ09SUyByZXN0cmljdCBvbiB0YXJnZXQgc2VydmVyICovXG4gICAgZGVsZXRlT3JpZ2luPzogYm9vbGVhbjtcbiAgICBwYXRoUmV3cml0ZT86IFByb3h5T3B0aW9uc1sncGF0aFJld3JpdGUnXTtcbiAgICBvblByb3h5UmVxPzogUHJveHlPcHRpb25zWydvblByb3h5UmVxJ107XG4gICAgb25Qcm94eVJlcz86IFByb3h5T3B0aW9uc1snb25Qcm94eVJlcyddO1xuICAgIG9uRXJyb3I/OiBQcm94eU9wdGlvbnNbJ29uRXJyb3InXTtcbiAgICBidWZmZXI/OiBQcm94eU9wdGlvbnNbJ2J1ZmZlciddO1xuICAgIHNlbGZIYW5kbGVSZXNwb25zZT86IFByb3h5T3B0aW9uc1snc2VsZkhhbmRsZVJlc3BvbnNlJ107XG4gICAgcHJveHlUaW1lb3V0PzogUHJveHlPcHRpb25zWydwcm94eVRpbWVvdXQnXTtcbiAgfSA9IHt9KSB7XG5cbiAgcHJveHlQYXRoID0gXy50cmltRW5kKHByb3h5UGF0aCwgJy8nKTtcbiAgYXBpVXJsID0gXy50cmltRW5kKGFwaVVybCwgJy8nKTtcbiAgY29uc3QgeyBwcm90b2NvbCwgaG9zdCwgcGF0aG5hbWUgfSA9IG5ldyBVUkwoYXBpVXJsKTtcblxuICBjb25zdCBwYXRQYXRoID0gbmV3IFJlZ0V4cCgnXicgKyBfLmVzY2FwZVJlZ0V4cChwcm94eVBhdGgpICsgJygvfCQpJyk7XG4gIGNvbnN0IGhwbUxvZyA9IGdldExvZ2dlcignSFBNLicgKyBwcm94eVBhdGgpO1xuICBhcGkuZXhwcmVzc0FwcFNldChhcHAgPT4ge1xuICAgIGFwcC51c2UocHJveHlQYXRoLFxuICAgICAgcHJveHkoe1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbWF4LWxlblxuICAgICAgICB0YXJnZXQ6IHByb3RvY29sICsgJy8vJyArIGhvc3QsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgd3M6IGZhbHNlLFxuICAgICAgICBjb29raWVEb21haW5SZXdyaXRlOiB7ICcqJzogJycgfSxcbiAgICAgICAgcGF0aFJld3JpdGU6IG9wdHMucGF0aFJld3JpdGUgPyAgb3B0cy5wYXRoUmV3cml0ZSA6IChwYXRoLCByZXEpID0+IHtcbiAgICAgICAgICAvLyBocG1Mb2cud2FybigncGF0UGF0aD0nLCBwYXRQYXRoLCAncGF0aD0nLCBwYXRoKTtcbiAgICAgICAgICBjb25zdCByZXQgPSBwYXRoICYmIHBhdGgucmVwbGFjZShwYXRQYXRoLCBwYXRobmFtZSA9PSBudWxsID8gJy8nIDogcGF0aG5hbWUgKyAnLycpO1xuICAgICAgICAgIC8vIGhwbUxvZy5pbmZvKGBwcm94eSB0byBwYXRoOiAke3JlcS5tZXRob2R9ICR7cHJvdG9jb2wgKyAnLy8nICsgaG9zdH0ke3JldH0sIHJlcS51cmwgPSAke3JlcS51cmx9YCk7XG4gICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgfSxcbiAgICAgICAgbG9nTGV2ZWw6ICdkZWJ1ZycsXG4gICAgICAgIGxvZ1Byb3ZpZGVyOiBwcm92aWRlciA9PiBocG1Mb2csXG4gICAgICAgIHByb3h5VGltZW91dDogb3B0cy5wcm94eVRpbWVvdXQgIT0gbnVsbCA/IG9wdHMucHJveHlUaW1lb3V0IDogMTAwMDAsXG4gICAgICAgIG9uUHJveHlSZXEocHJveHlSZXEsIHJlcSwgcmVzKSB7XG4gICAgICAgICAgaWYgKG9wdHMuZGVsZXRlT3JpZ2luKVxuICAgICAgICAgICAgcHJveHlSZXEucmVtb3ZlSGVhZGVyKCdPcmlnaW4nKTsgLy8gQnlwYXNzIENPUlMgcmVzdHJpY3Qgb24gdGFyZ2V0IHNlcnZlclxuICAgICAgICAgIGNvbnN0IHJlZmVyZXIgPSBwcm94eVJlcS5nZXRIZWFkZXIoJ3JlZmVyZXInKTtcbiAgICAgICAgICBpZiAocmVmZXJlcikge1xuICAgICAgICAgICAgcHJveHlSZXEuc2V0SGVhZGVyKCdyZWZlcmVyJywgYCR7cHJvdG9jb2x9Ly8ke2hvc3R9JHtVcmwucGFyc2UocmVmZXJlciBhcyBzdHJpbmcpLnBhdGhuYW1lfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAob3B0cy5vblByb3h5UmVxKSB7XG4gICAgICAgICAgICBvcHRzLm9uUHJveHlSZXEocHJveHlSZXEsIHJlcSwgcmVzKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaHBtTG9nLmluZm8oYFByb3h5IHJlcXVlc3QgdG8gJHtwcm90b2NvbH0vLyR7aG9zdH0ke3Byb3h5UmVxLnBhdGh9IG1ldGhvZDogJHtyZXEubWV0aG9kfSwgJHtKU09OLnN0cmluZ2lmeShwcm94eVJlcS5nZXRIZWFkZXJzKCksIG51bGwsICcgICcpfWApO1xuICAgICAgICAgIC8vIGlmIChhcGkuY29uZmlnKCkuZGV2TW9kZSlcbiAgICAgICAgICAvLyAgIGhwbUxvZy5pbmZvKCdvbiBwcm94eSByZXF1ZXN0IGhlYWRlcnM6ICcsIEpTT04uc3RyaW5naWZ5KHByb3h5UmVxLmdldEhlYWRlcnMoKSwgbnVsbCwgJyAgJykpO1xuICAgICAgICB9LFxuICAgICAgICBvblByb3h5UmVzKGluY29taW5nLCByZXEsIHJlcykge1xuICAgICAgICAgIGluY29taW5nLmhlYWRlcnNbJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbiddID0gJyonO1xuICAgICAgICAgIGlmIChhcGkuY29uZmlnKCkuZGV2TW9kZSkge1xuICAgICAgICAgICAgaHBtTG9nLmluZm8oYFByb3h5IHJlY2lldmUgJHtyZXEub3JpZ2luYWxVcmx9LCBzdGF0dXM6ICR7aW5jb21pbmcuc3RhdHVzQ29kZSF9XFxuYCxcbiAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoaW5jb21pbmcuaGVhZGVycywgbnVsbCwgJyAgJykpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBocG1Mb2cuaW5mbyhgUHJveHkgcmVjaWV2ZSAke3JlcS5vcmlnaW5hbFVybH0sIHN0YXR1czogJHtpbmNvbWluZy5zdGF0dXNDb2RlIX1gKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGFwaS5jb25maWcoKS5kZXZNb2RlIHx8IGNvbmZpZygpLmNsaU9wdGlvbnM/LnZlcmJvc2UpIHtcblxuICAgICAgICAgICAgY29uc3QgY3QgPSBpbmNvbWluZy5oZWFkZXJzWydjb250ZW50LXR5cGUnXTtcbiAgICAgICAgICAgIGNvbnN0IGlzVGV4dCA9IChjdCAmJiAvXFxiKGpzb258dGV4dClcXGIvaS50ZXN0KGN0KSk7XG4gICAgICAgICAgICBpZiAoaXNUZXh0KSB7XG4gICAgICAgICAgICAgIGNvbnN0IGJ1ZnMgPSBbXSBhcyBzdHJpbmdbXTtcbiAgICAgICAgICAgICAgaW5jb21pbmcucGlwZShuZXcgc3RyZWFtLldyaXRhYmxlKHtcbiAgICAgICAgICAgICAgICB3cml0ZShjaHVuazogQnVmZmVyLCBlbmMsIGNiKSB7XG4gICAgICAgICAgICAgICAgICBidWZzLnB1c2goKGNodW5rLnRvU3RyaW5nKCkpKTtcbiAgICAgICAgICAgICAgICAgIGNiKCk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmaW5hbChjYikge1xuICAgICAgICAgICAgICAgICAgaHBtTG9nLmluZm8oYFJlc3BvbnNlICR7cmVxLm9yaWdpbmFsVXJsfSB0ZXh0IGJvZHk6XFxuYCwgYnVmcy5qb2luKCcnKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChvcHRzLm9uUHJveHlSZXMpIHtcbiAgICAgICAgICAgIG9wdHMub25Qcm94eVJlcyhpbmNvbWluZywgcmVxLCByZXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgb25FcnJvcihlcnIsIHJlcSwgcmVzKSB7XG4gICAgICAgICAgaHBtTG9nLndhcm4oZXJyKTtcbiAgICAgICAgICBpZiAob3B0cy5vbkVycm9yKSB7XG4gICAgICAgICAgICBvcHRzLm9uRXJyb3IoZXJyLCByZXEsIHJlcyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICk7XG4gIH0pO1xufVxuXG4iXX0=