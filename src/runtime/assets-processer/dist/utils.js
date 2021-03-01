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
const log4js_1 = require("log4js");
const __api_1 = __importDefault(require("__api"));
const Url = __importStar(require("url"));
const lodash_1 = __importDefault(require("lodash"));
const http_proxy_middleware_1 = __importDefault(require("http-proxy-middleware"));
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
    const { protocol, host, pathname } = Url.parse(apiUrl, false, true);
    const patPath = new RegExp('^' + proxyPath + '/');
    const hpmLog = log4js_1.getLogger('HPM.' + proxyPath);
    __api_1.default.expressAppSet(app => {
        app.use(proxyPath, http_proxy_middleware_1.default({
            // tslint:disable-next-line: max-line-length
            target: protocol + '//' + host,
            changeOrigin: true,
            ws: false,
            cookieDomainRewrite: { '*': '' },
            pathRewrite: (path, req) => {
                const ret = path && path.replace(patPath, pathname == null ? '/' : pathname + '/');
                // log.info(`proxy to path: ${req.method} ${protocol + '//' + host}${ret}, req.url = ${req.url}`);
                return ret;
            },
            logLevel: 'debug',
            logProvider: provider => hpmLog,
            proxyTimeout: 10000,
            onProxyReq(proxyReq, req, res) {
                if (opts.deleteOrigin)
                    proxyReq.removeHeader('Origin'); // Bypass CORS restrict on target server
                hpmLog.info(`Proxy request to ${proxyReq.protocol}//${proxyReq.host}${proxyReq.path} method: ${proxyReq.method}, ${JSON.stringify(proxyReq.getHeaders(), null, '  ')}`);
                const referer = proxyReq.getHeader('referer');
                if (referer) {
                    proxyReq.setHeader('referer', `${protocol}//${host}${Url.parse(referer).pathname}`);
                }
                // if (api.config().devMode)
                //   hpmLog.info('on proxy request headers: ', JSON.stringify(proxyReq.getHeaders(), null, '  '));
            },
            onProxyRes(incoming) {
                incoming.headers['Access-Control-Allow-Origin'] = '*';
                hpmLog.info('Proxy recieve ' + incoming.statusCode + '\n');
                if (__api_1.default.config().devMode)
                    hpmLog.info('Proxy recieve ' + incoming.statusCode + '\n', JSON.stringify(incoming.headers, null, '  '));
            }
        }));
    });
}
exports.setupHttpProxy = setupHttpProxy;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0EsbUNBQWlDO0FBQ2pDLGtEQUF3QjtBQUN4Qix5Q0FBMkI7QUFDM0Isb0RBQXVCO0FBQ3ZCLGtGQUEwQztBQUUxQyxNQUFNLE9BQU8sR0FBRyxrQkFBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsWUFBWSxDQUFDLENBQUM7QUFFMUQ7Ozs7O0dBS0c7QUFDSCxTQUFnQix1QkFBdUIsQ0FBQyxHQUFZLEVBQUUsR0FBYSxFQUFFLElBQWtCO0lBQ3JGLE1BQU0sSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7SUFDeEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBRWpDLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUM7SUFFcEIsU0FBUyxLQUFLO1FBQ1osTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNqQyxPQUFPLENBQUMsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLE1BQU0sSUFBSSxHQUFHLENBQUMsV0FBVyxjQUFjLEdBQUcsQ0FBQyxVQUFVLHlCQUF5QixHQUFHLEdBQUcsU0FBUyxJQUFJO1lBQzVILFlBQVksSUFBSSxDQUFDLGtCQUFrQixFQUFFLElBQUksU0FBUyxNQUFNLEdBQUcsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3pGLENBQUM7SUFFRCxHQUFHLENBQUMsR0FBRyxHQUFHLFVBQVMsS0FBVyxFQUFFLFFBQWdDLEVBQUUsRUFBZTtRQUMvRSxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FB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U0FBUyxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUN4SyxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDO2dCQUM5QyxJQUFJLE9BQU8sRUFBRTtvQkFDWCxRQUFRLENBQUMsU0FBUyxDQUFDLFNBQVMsRUFBRSxHQUFHLFFBQVEsS0FBSyxJQUFJLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFpQixDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQztpQkFDL0Y7Z0JBQ0QsNEJBQTRCO2dCQUM1QixrR0FBa0c7WUFDcEcsQ0FBQztZQUNELFVBQVUsQ0FBQyxRQUFRO2dCQUNqQixRQUFRLENBQUMsT0FBTyxDQUFDLDZCQUE2QixDQUFDLEdBQUcsR0FBRyxDQUFDO2dCQUN0RCxNQUFNLENBQUMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLENBQUM7Z0JBQzNELElBQUksZUFBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLE9BQU87b0JBQ3RCLE1BQU0sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLFVBQVUsR0FBRyxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQzdHLENBQUM7U0FDRixDQUFDLENBQ0gsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQTdDRCx3Q0E2Q0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1JlcXVlc3QsIFJlc3BvbnNlLCBOZXh0RnVuY3Rpb259IGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCAqIGFzIFVybCBmcm9tICd1cmwnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBwcm94eSBmcm9tICdodHRwLXByb3h5LW1pZGRsZXdhcmUnO1xuXG5jb25zdCBsb2dUaW1lID0gZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcudGltZXN0YW1wJyk7XG5cbi8qKlxuICogTWlkZGxld2FyZSBmb3IgcHJpbnRpbmcgZWFjaCByZXNwb25zZSBwcm9jZXNzIGR1cmF0aW9uIHRpbWUgdG8gbG9nXG4gKiBAcGFyYW0gcmVxIFxuICogQHBhcmFtIHJlcyBcbiAqIEBwYXJhbSBuZXh0IFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUmVzcG9uc2VUaW1lc3RhbXAocmVxOiBSZXF1ZXN0LCByZXM6IFJlc3BvbnNlLCBuZXh0OiBOZXh0RnVuY3Rpb24pIHtcbiAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKCk7XG4gIGNvbnN0IHN0YXJ0VGltZSA9IGRhdGUuZ2V0VGltZSgpO1xuXG4gIGNvbnN0IGVuZCA9IHJlcy5lbmQ7XG5cbiAgZnVuY3Rpb24gcHJpbnQoKSB7XG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgbG9nVGltZS5pbmZvKGByZXF1ZXN0OiAke3JlcS5tZXRob2R9ICR7cmVxLm9yaWdpbmFsVXJsfSB8IHN0YXR1czogJHtyZXMuc3RhdHVzQ29kZX0sIFtyZXNwb25zZSBkdXJhdGlvbjogJHtub3cgLSBzdGFydFRpbWV9bXNgICtcbiAgICAgIGBdIChzaW5jZSAke2RhdGUudG9Mb2NhbGVUaW1lU3RyaW5nKCl9ICR7c3RhcnRUaW1lfSkgWyR7cmVxLmhlYWRlcigndXNlci1hZ2VudCcpfV1gKTtcbiAgfVxuXG4gIHJlcy5lbmQgPSBmdW5jdGlvbihjaHVuaz86IGFueSwgZW5jb2Rpbmc/OiBzdHJpbmcgfCAoKCkgPT4gdm9pZCksIGNiPzogKCkgPT4gdm9pZCkge1xuICAgIGNvbnN0IGFyZ3YgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICAgIGNvbnN0IGxhc3RBcmcgPSBhcmd1bWVudHNbYXJndW1lbnRzLmxlbmd0aCAtIDFdO1xuICAgIGlmICh0eXBlb2YgbGFzdEFyZyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY29uc3Qgb3JpZ2luQ2IgPSBhcmd1bWVudHNbYXJndW1lbnRzLmxlbmd0aCAtIDFdO1xuICAgICAgYXJndlthcmd2Lmxlbmd0aCAtIDFdID0gKCkgPT4ge1xuICAgICAgICBvcmlnaW5DYigpO1xuICAgICAgICBwcmludCgpO1xuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKGFyZ3YubGVuZ3RoID09PSAwKSB7XG4gICAgICBhcmd2LnB1c2gobnVsbCwgcHJpbnQpO1xuICAgIH0gZWxzZSBpZiAoYXJndi5sZW5ndGggPT09IDEpIHtcbiAgICAgIGFyZ3YucHVzaChwcmludCk7XG4gICAgfVxuICAgIGNvbnN0IHJldCA9IGVuZC5hcHBseShyZXMsIGFyZ3YpO1xuICAgIHJldHVybiByZXQ7XG4gIH07XG5cbiAgbmV4dCgpO1xufVxuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gdXNlcyBodHRwLXByb3h5LW1pZGRsZXdhcmUgaW50ZXJuYWxseS5cbiAqIFxuICogQ3JlYXRlIGFuZCB1c2UgYW4gSFRUUCByZXF1ZXN0IHByb3h5IGZvciBzcGVjaWZpYyByZXF1ZXN0IHBhdGhcbiAqIEBwYXJhbSBwcm94eVBhdGggXG4gKiBAcGFyYW0gdGFyZ2V0VXJsIFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBIdHRwUHJveHkocHJveHlQYXRoOiBzdHJpbmcsIGFwaVVybDogc3RyaW5nLFxuICBvcHRzOiB7LyoqIEJ5cGFzcyBDT1JTIHJlc3RyaWN0IG9uIHRhcmdldCBzZXJ2ZXIgKi8gZGVsZXRlT3JpZ2luPzogYm9vbGVhbn0gPSB7fSkge1xuXG4gIHByb3h5UGF0aCA9IF8udHJpbUVuZChwcm94eVBhdGgsICcvJyk7XG4gIGFwaVVybCA9IF8udHJpbUVuZChhcGlVcmwsICcvJyk7XG4gIGNvbnN0IHsgcHJvdG9jb2wsIGhvc3QsIHBhdGhuYW1lIH0gPSBVcmwucGFyc2UoYXBpVXJsLCBmYWxzZSwgdHJ1ZSk7XG5cbiAgY29uc3QgcGF0UGF0aCA9IG5ldyBSZWdFeHAoJ14nICsgcHJveHlQYXRoICsgJy8nKTtcbiAgY29uc3QgaHBtTG9nID0gZ2V0TG9nZ2VyKCdIUE0uJyArIHByb3h5UGF0aCk7XG4gIGFwaS5leHByZXNzQXBwU2V0KGFwcCA9PiB7XG4gICAgYXBwLnVzZShwcm94eVBhdGgsXG4gICAgICBwcm94eSh7XG4gICAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbWF4LWxpbmUtbGVuZ3RoXG4gICAgICAgIHRhcmdldDogcHJvdG9jb2wgKyAnLy8nICsgaG9zdCxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICB3czogZmFsc2UsXG4gICAgICAgIGNvb2tpZURvbWFpblJld3JpdGU6IHsgJyonOiAnJyB9LFxuICAgICAgICBwYXRoUmV3cml0ZTogKHBhdGgsIHJlcSkgPT4ge1xuICAgICAgICAgIGNvbnN0IHJldCA9IHBhdGggJiYgcGF0aC5yZXBsYWNlKHBhdFBhdGgsIHBhdGhuYW1lID09IG51bGwgPyAnLycgOiBwYXRobmFtZSArICcvJyk7XG4gICAgICAgICAgLy8gbG9nLmluZm8oYHByb3h5IHRvIHBhdGg6ICR7cmVxLm1ldGhvZH0gJHtwcm90b2NvbCArICcvLycgKyBob3N0fSR7cmV0fSwgcmVxLnVybCA9ICR7cmVxLnVybH1gKTtcbiAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICB9LFxuICAgICAgICBsb2dMZXZlbDogJ2RlYnVnJyxcbiAgICAgICAgbG9nUHJvdmlkZXI6IHByb3ZpZGVyID0+IGhwbUxvZyxcbiAgICAgICAgcHJveHlUaW1lb3V0OiAxMDAwMCxcbiAgICAgICAgb25Qcm94eVJlcShwcm94eVJlcSwgcmVxLCByZXMpIHtcbiAgICAgICAgICBpZiAob3B0cy5kZWxldGVPcmlnaW4pXG4gICAgICAgICAgICBwcm94eVJlcS5yZW1vdmVIZWFkZXIoJ09yaWdpbicpOyAvLyBCeXBhc3MgQ09SUyByZXN0cmljdCBvbiB0YXJnZXQgc2VydmVyXG4gICAgICAgICAgaHBtTG9nLmluZm8oYFByb3h5IHJlcXVlc3QgdG8gJHtwcm94eVJlcS5wcm90b2NvbH0vLyR7cHJveHlSZXEuaG9zdH0ke3Byb3h5UmVxLnBhdGh9IG1ldGhvZDogJHtwcm94eVJlcS5tZXRob2R9LCAke0pTT04uc3RyaW5naWZ5KHByb3h5UmVxLmdldEhlYWRlcnMoKSwgbnVsbCwgJyAgJyl9YCk7XG4gICAgICAgICAgY29uc3QgcmVmZXJlciA9IHByb3h5UmVxLmdldEhlYWRlcigncmVmZXJlcicpO1xuICAgICAgICAgIGlmIChyZWZlcmVyKSB7XG4gICAgICAgICAgICBwcm94eVJlcS5zZXRIZWFkZXIoJ3JlZmVyZXInLCBgJHtwcm90b2NvbH0vLyR7aG9zdH0ke1VybC5wYXJzZShyZWZlcmVyIGFzIHN0cmluZykucGF0aG5hbWV9YCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIC8vIGlmIChhcGkuY29uZmlnKCkuZGV2TW9kZSlcbiAgICAgICAgICAvLyAgIGhwbUxvZy5pbmZvKCdvbiBwcm94eSByZXF1ZXN0IGhlYWRlcnM6ICcsIEpTT04uc3RyaW5naWZ5KHByb3h5UmVxLmdldEhlYWRlcnMoKSwgbnVsbCwgJyAgJykpO1xuICAgICAgICB9LFxuICAgICAgICBvblByb3h5UmVzKGluY29taW5nKSB7XG4gICAgICAgICAgaW5jb21pbmcuaGVhZGVyc1snQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJ10gPSAnKic7XG4gICAgICAgICAgaHBtTG9nLmluZm8oJ1Byb3h5IHJlY2lldmUgJyArIGluY29taW5nLnN0YXR1c0NvZGUgKyAnXFxuJyk7XG4gICAgICAgICAgaWYgKGFwaS5jb25maWcoKS5kZXZNb2RlKVxuICAgICAgICAgICAgaHBtTG9nLmluZm8oJ1Byb3h5IHJlY2lldmUgJyArIGluY29taW5nLnN0YXR1c0NvZGUgKyAnXFxuJywgSlNPTi5zdHJpbmdpZnkoaW5jb21pbmcuaGVhZGVycywgbnVsbCwgJyAgJykpO1xuICAgICAgICB9XG4gICAgICB9KVxuICAgICk7XG4gIH0pO1xufVxuXG4iXX0=