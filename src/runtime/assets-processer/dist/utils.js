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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsbUNBQWlDO0FBQ2pDLGtEQUF3QjtBQUN4Qix5Q0FBMkI7QUFDM0Isb0RBQXVCO0FBQ3ZCLGtGQUEwQztBQUMxQyxNQUFNLE1BQU0sR0FBRyxrQkFBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsZUFBZSxDQUFDLENBQUM7QUFFNUQsTUFBTSxPQUFPLEdBQUcsa0JBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxHQUFHLFlBQVksQ0FBQyxDQUFDO0FBRTFEOzs7OztHQUtHO0FBQ0gsU0FBZ0IsdUJBQXVCLENBQUMsR0FBWSxFQUFFLEdBQWEsRUFBRSxJQUFrQjtJQUNyRixNQUFNLElBQUksR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO0lBQ3hCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUVqQyxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDO0lBRXBCLFNBQVMsS0FBSztRQUNaLE1BQU0sR0FBRyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDakMsT0FBTyxDQUFDLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxNQUFNLElBQUksR0FBRyxDQUFDLFdBQVcsY0FBYyxHQUFHLENBQUMsVUFBVSx5QkFBeUIsR0FBRyxHQUFHLFNBQVMsSUFBSTtZQUM1SCxZQUFZLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLFNBQVMsTUFBTSxHQUFHLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN6RixDQUFDO0lBRUQsR0FBRyxDQUFDLEdBQUcsR0FBRyxVQUFTLEtBQVcsRUFBRSxRQUFnQyxFQUFFLEVBQWU7UUFDL0UsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENB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QyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7UmVxdWVzdCwgUmVzcG9uc2UsIE5leHRGdW5jdGlvbn0gZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0ICogYXMgVXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHByb3h5IGZyb20gJ2h0dHAtcHJveHktbWlkZGxld2FyZSc7XG5jb25zdCBocG1Mb2cgPSBnZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5jb21tYW5kUHJveHknKTtcblxuY29uc3QgbG9nVGltZSA9IGdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLnRpbWVzdGFtcCcpO1xuXG4vKipcbiAqIE1pZGRsZXdhcmUgZm9yIHByaW50aW5nIGVhY2ggcmVzcG9uc2UgcHJvY2VzcyBkdXJhdGlvbiB0aW1lIHRvIGxvZ1xuICogQHBhcmFtIHJlcSBcbiAqIEBwYXJhbSByZXMgXG4gKiBAcGFyYW0gbmV4dCBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVJlc3BvbnNlVGltZXN0YW1wKHJlcTogUmVxdWVzdCwgcmVzOiBSZXNwb25zZSwgbmV4dDogTmV4dEZ1bmN0aW9uKSB7XG4gIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSgpO1xuICBjb25zdCBzdGFydFRpbWUgPSBkYXRlLmdldFRpbWUoKTtcblxuICBjb25zdCBlbmQgPSByZXMuZW5kO1xuXG4gIGZ1bmN0aW9uIHByaW50KCkge1xuICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgIGxvZ1RpbWUuaW5mbyhgcmVxdWVzdDogJHtyZXEubWV0aG9kfSAke3JlcS5vcmlnaW5hbFVybH0gfCBzdGF0dXM6ICR7cmVzLnN0YXR1c0NvZGV9LCBbcmVzcG9uc2UgZHVyYXRpb246ICR7bm93IC0gc3RhcnRUaW1lfW1zYCArXG4gICAgICBgXSAoc2luY2UgJHtkYXRlLnRvTG9jYWxlVGltZVN0cmluZygpfSAke3N0YXJ0VGltZX0pIFske3JlcS5oZWFkZXIoJ3VzZXItYWdlbnQnKX1dYCk7XG4gIH1cblxuICByZXMuZW5kID0gZnVuY3Rpb24oY2h1bms/OiBhbnksIGVuY29kaW5nPzogc3RyaW5nIHwgKCgpID0+IHZvaWQpLCBjYj86ICgpID0+IHZvaWQpIHtcbiAgICBjb25zdCBhcmd2ID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcbiAgICBjb25zdCBsYXN0QXJnID0gYXJndW1lbnRzW2FyZ3VtZW50cy5sZW5ndGggLSAxXTtcbiAgICBpZiAodHlwZW9mIGxhc3RBcmcgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNvbnN0IG9yaWdpbkNiID0gYXJndW1lbnRzW2FyZ3VtZW50cy5sZW5ndGggLSAxXTtcbiAgICAgIGFyZ3ZbYXJndi5sZW5ndGggLSAxXSA9ICgpID0+IHtcbiAgICAgICAgb3JpZ2luQ2IoKTtcbiAgICAgICAgcHJpbnQoKTtcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChhcmd2Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgYXJndi5wdXNoKG51bGwsIHByaW50KTtcbiAgICB9IGVsc2UgaWYgKGFyZ3YubGVuZ3RoID09PSAxKSB7XG4gICAgICBhcmd2LnB1c2gocHJpbnQpO1xuICAgIH1cbiAgICBjb25zdCByZXQgPSBlbmQuYXBwbHkocmVzLCBhcmd2KTtcbiAgICByZXR1cm4gcmV0O1xuICB9O1xuXG4gIG5leHQoKTtcbn1cblxuLyoqXG4gKiBDcmVhdGUgYW5kIHVzZSBhbiBIVFRQIHJlcXVlc3QgcHJveHkgZm9yIHNwZWNpZmljIHJlcXVlc3QgcGF0aFxuICogQHBhcmFtIHByb3h5UGF0aCBcbiAqIEBwYXJhbSB0YXJnZXRVcmwgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21tYW5kUHJveHkocHJveHlQYXRoOiBzdHJpbmcsIHRhcmdldFVybDogc3RyaW5nKSB7XG4gIHByb3h5UGF0aCA9IF8udHJpbUVuZChwcm94eVBhdGgsICcvJyk7XG4gIHRhcmdldFVybCA9IF8udHJpbUVuZCh0YXJnZXRVcmwsICcvJyk7XG4gIGNvbnN0IHtwcm90b2NvbCwgaG9zdCwgcGF0aG5hbWV9ID0gVXJsLnBhcnNlKHRhcmdldFVybCwgZmFsc2UsIHRydWUpO1xuXG4gIGNvbnN0IHBhdFBhdGggPSBuZXcgUmVnRXhwKGBeJHtwcm94eVBhdGh9L2ApO1xuXG4gIC8vIGh0dHAgcHJveHkgbWlkZGxld2FyZSBtdXN0IGJlIHVzZWQgd2l0aG91dCBhbnkgYm9keS1wYXJzZXIgbWlkZGxld2FyZSwgc28gYGFwaS5leHByZXNzQXBwU2V0YCBjYW4gcHV0IGl0IGFib3ZlIG90aGVyXG4gIC8vIG1pZGRsZXdhcmVzXG4gIGFwaS5leHByZXNzQXBwU2V0KGFwcCA9PiB7XG4gICAgYXBwLnVzZShwcm94eVBhdGgsIHByb3h5KHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbWF4LWxpbmUtbGVuZ3RoXG4gICAgICB0YXJnZXQ6IHByb3RvY29sICsgJy8vJyArIGhvc3QsXG4gICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICB3czogZmFsc2UsXG4gICAgICBjb29raWVEb21haW5SZXdyaXRlOiB7JyonOiAnJ30sXG4gICAgICBwYXRoUmV3cml0ZTogKHBhdGgsIHJlcSkgPT4ge1xuICAgICAgICBjb25zdCByZXQgPSBwYXRoLnJlcGxhY2UocGF0UGF0aCwgcGF0aG5hbWUgPT0gbnVsbCA/ICcnIDogcGF0aG5hbWUgKTtcbiAgICAgICAgaHBtTG9nLmluZm8oYHByb3h5IHRvIHBhdGg6ICR7cHJvdG9jb2wgKyAnLy8nICsgaG9zdH0ke3JldH0sIHJlcS51cmwgPSAke3JlcS51cmx9YCk7XG4gICAgICAgIHJldHVybiByZXQ7XG4gICAgICB9LFxuICAgICAgbG9nTGV2ZWw6ICdkZWJ1ZycsXG4gICAgICBsb2dQcm92aWRlcjogcHJvdmlkZXIgPT4gaHBtTG9nLFxuICAgICAgcHJveHlUaW1lb3V0OiAxNTAwMFxuICAgICAgLy8gb25Qcm94eVJlcShwcm94eVJlcSwgcmVxLCByZXMpIHtcbiAgICAgIC8vICAgY29uc3QgcmVmZXJlciA9IHByb3h5UmVxLmdldEhlYWRlcigncmVmZXJlcicpO1xuICAgICAgLy8gICBpZiAocmVmZXJlcikge1xuICAgICAgLy8gICAgIHByb3h5UmVxLnNldEhlYWRlcigncmVmZXJlcicsIGAke3Byb3RvY29sfS8vJHtob3N0fSR7VXJsLnBhcnNlKHJlZmVyZXIgYXMgc3RyaW5nKS5wYXRobmFtZX1gKTtcbiAgICAgIC8vICAgfVxuICAgICAgLy8gfSxcbiAgICAgIC8vIG9uUHJveHlSZXMoaW5jb21pbmcpIHtcbiAgICAgIC8vICAgbG9nLmluZm8oJ1Byb3h5IHJlY2lldmUgJyArIGluY29taW5nLnN0YXR1c0NvZGUgKyAnXFxuJyk7XG4gICAgICAvLyB9XG4gICAgfSkpO1xuICB9KTtcbn1cblxuIl19