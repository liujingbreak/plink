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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.commandProxy = exports.createResponseTimestamp = void 0;
const log4js_1 = require("log4js");
const __api_1 = __importDefault(require("__api"));
const Url = __importStar(require("url"));
const lodash_1 = __importDefault(require("lodash"));
const http_proxy_middleware_1 = __importDefault(require("http-proxy-middleware"));
const hpmLog = log4js_1.getLogger(__api_1.default.packageName + '.commandProxy');
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
 * Create and use an HTTP request proxy for specific request path
 * @param proxyPath
 * @param targetUrl
 */
function commandProxy(proxyPath, targetUrl) {
    proxyPath = lodash_1.default.trimEnd(proxyPath, '/');
    targetUrl = lodash_1.default.trimEnd(targetUrl, '/');
    const { protocol, host, pathname } = Url.parse(targetUrl, false, true);
    const patPath = new RegExp(`^${proxyPath}/`);
    // http proxy middleware must be used without any body-parser middleware, so `api.expressAppSet` can put it above other
    // middlewares
    __api_1.default.expressAppSet(app => {
        app.use(proxyPath, http_proxy_middleware_1.default({
            // tslint:disable-next-line: max-line-length
            target: protocol + '//' + host,
            changeOrigin: true,
            ws: false,
            cookieDomainRewrite: { '*': '' },
            pathRewrite: (path, req) => {
                const ret = path.replace(patPath, pathname == null ? '' : pathname);
                hpmLog.info(`proxy to path: ${protocol + '//' + host}${ret}, req.url = ${req.url}`);
                return ret;
            },
            logLevel: 'debug',
            logProvider: provider => hpmLog,
            proxyTimeout: 15000
            // onProxyReq(proxyReq, req, res) {
            //   const referer = proxyReq.getHeader('referer');
            //   if (referer) {
            //     proxyReq.setHeader('referer', `${protocol}//${host}${Url.parse(referer as string).pathname}`);
            //   }
            // },
            // onProxyRes(incoming) {
            //   log.info('Proxy recieve ' + incoming.statusCode + '\n');
            // }
        }));
    });
}
exports.commandProxy = commandProxy;

//# sourceMappingURL=utils.js.map
