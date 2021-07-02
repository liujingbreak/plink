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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFDQSxvREFBNEI7QUFDNUIsbUNBQWlDO0FBQ2pDLGtEQUF3QjtBQUN4QixvREFBdUI7QUFDdkIsc0NBQWtDO0FBQ2xDLGlFQUErRjtBQUUvRixNQUFNLE9BQU8sR0FBRyxrQkFBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsWUFBWSxDQUFDLENBQUM7QUFFMUQ7Ozs7O0dBS0c7QUFDSCxTQUFnQix1QkFBdUIsQ0FBQyxHQUFZLEVBQUUsR0FBYSxFQUFFLElBQWtCO0lBQ3JGLE1BQU0sSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7SUFDeEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBRWpDLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUM7SUFFcEIsU0FBUyxLQUFLO1FBQ1osTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNqQyxPQUFPLENBQUMsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLE1BQU0sSUFBSSxHQUFHLENBQUMsV0FBVyxjQUFjLEdBQUcsQ0FBQyxVQUFVLHlCQUF5QixHQUFHLEdBQUcsU0FBUyxJQUFJO1lBQzVILFlBQVksSUFBSSxDQUFDLGtCQUFrQixFQUFFLElBQUksU0FBUyxNQUFNLEdBQUcsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzFGLENBQUM7SUFFRCxHQUFHLENBQUMsR0FBRyxHQUFHLFVBQVMsS0FBVyxFQUFFLFFBQWdDLEVBQUUsRUFBZTtRQUMvRSxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sT0FBTyxHQUFHLFNBQVMsQ0FBQyxTQUFT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QixJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7aUJBQzdCO1lBQ0gsQ0FBQztTQUNGLENBQUMsQ0FDSCxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBekZELHdDQXlGQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7UmVxdWVzdCwgUmVzcG9uc2UsIE5leHRGdW5jdGlvbn0gZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgc3RyZWFtIGZyb20gJ3N0cmVhbSc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7Y29uZmlnfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCB7IGNyZWF0ZVByb3h5TWlkZGxld2FyZSBhcyBwcm94eSwgT3B0aW9ucyBhcyBQcm94eU9wdGlvbnN9IGZyb20gJ2h0dHAtcHJveHktbWlkZGxld2FyZSc7XG5cbmNvbnN0IGxvZ1RpbWUgPSBnZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy50aW1lc3RhbXAnKTtcblxuLyoqXG4gKiBNaWRkbGV3YXJlIGZvciBwcmludGluZyBlYWNoIHJlc3BvbnNlIHByb2Nlc3MgZHVyYXRpb24gdGltZSB0byBsb2dcbiAqIEBwYXJhbSByZXEgXG4gKiBAcGFyYW0gcmVzIFxuICogQHBhcmFtIG5leHQgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSZXNwb25zZVRpbWVzdGFtcChyZXE6IFJlcXVlc3QsIHJlczogUmVzcG9uc2UsIG5leHQ6IE5leHRGdW5jdGlvbikge1xuICBjb25zdCBkYXRlID0gbmV3IERhdGUoKTtcbiAgY29uc3Qgc3RhcnRUaW1lID0gZGF0ZS5nZXRUaW1lKCk7XG5cbiAgY29uc3QgZW5kID0gcmVzLmVuZDtcblxuICBmdW5jdGlvbiBwcmludCgpIHtcbiAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICBsb2dUaW1lLmluZm8oYHJlcXVlc3Q6ICR7cmVxLm1ldGhvZH0gJHtyZXEub3JpZ2luYWxVcmx9IHwgc3RhdHVzOiAke3Jlcy5zdGF0dXNDb2RlfSwgW3Jlc3BvbnNlIGR1cmF0aW9uOiAke25vdyAtIHN0YXJ0VGltZX1tc2AgK1xuICAgICAgYF0gKHNpbmNlICR7ZGF0ZS50b0xvY2FsZVRpbWVTdHJpbmcoKX0gJHtzdGFydFRpbWV9KSBbJHtyZXEuaGVhZGVyKCd1c2VyLWFnZW50JykhfV1gKTtcbiAgfVxuXG4gIHJlcy5lbmQgPSBmdW5jdGlvbihjaHVuaz86IGFueSwgZW5jb2Rpbmc/OiBzdHJpbmcgfCAoKCkgPT4gdm9pZCksIGNiPzogKCkgPT4gdm9pZCkge1xuICAgIGNvbnN0IGFyZ3YgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICAgIGNvbnN0IGxhc3RBcmcgPSBhcmd1bWVudHNbYXJndW1lbnRzLmxlbmd0aCAtIDFdO1xuICAgIGlmICh0eXBlb2YgbGFzdEFyZyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY29uc3Qgb3JpZ2luQ2IgPSBhcmd1bWVudHNbYXJndW1lbnRzLmxlbmd0aCAtIDFdO1xuICAgICAgYXJndlthcmd2Lmxlbmd0aCAtIDFdID0gKCkgPT4ge1xuICAgICAgICBvcmlnaW5DYigpO1xuICAgICAgICBwcmludCgpO1xuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKGFyZ3YubGVuZ3RoID09PSAwKSB7XG4gICAgICBhcmd2LnB1c2gobnVsbCwgcHJpbnQpO1xuICAgIH0gZWxzZSBpZiAoYXJndi5sZW5ndGggPT09IDEpIHtcbiAgICAgIGFyZ3YucHVzaChwcmludCk7XG4gICAgfVxuICAgIGNvbnN0IHJldCA9IGVuZC5hcHBseShyZXMsIGFyZ3YpO1xuICAgIHJldHVybiByZXQ7XG4gIH07XG5cbiAgbmV4dCgpO1xufVxuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gdXNlcyBodHRwLXByb3h5LW1pZGRsZXdhcmUgaW50ZXJuYWxseS5cbiAqIFxuICogQ3JlYXRlIGFuZCB1c2UgYW4gSFRUUCByZXF1ZXN0IHByb3h5IGZvciBzcGVjaWZpYyByZXF1ZXN0IHBhdGhcbiAqIEBwYXJhbSBwcm94eVBhdGggXG4gKiBAcGFyYW0gdGFyZ2V0VXJsIFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBIdHRwUHJveHkocHJveHlQYXRoOiBzdHJpbmcsIGFwaVVybDogc3RyaW5nLFxuICBvcHRzOiB7XG4gICAgLyoqIEJ5cGFzcyBDT1JTIHJlc3RyaWN0IG9uIHRhcmdldCBzZXJ2ZXIgKi9cbiAgICBkZWxldGVPcmlnaW4/OiBib29sZWFuO1xuICAgIHBhdGhSZXdyaXRlPzogUHJveHlPcHRpb25zWydwYXRoUmV3cml0ZSddO1xuICAgIG9uUHJveHlSZXE/OiBQcm94eU9wdGlvbnNbJ29uUHJveHlSZXEnXTtcbiAgICBvblByb3h5UmVzPzogUHJveHlPcHRpb25zWydvblByb3h5UmVzJ107XG4gICAgb25FcnJvcj86IFByb3h5T3B0aW9uc1snb25FcnJvciddO1xuICAgIGJ1ZmZlcj86IFByb3h5T3B0aW9uc1snYnVmZmVyJ107XG4gICAgc2VsZkhhbmRsZVJlc3BvbnNlPzogUHJveHlPcHRpb25zWydzZWxmSGFuZGxlUmVzcG9uc2UnXTtcbiAgICBwcm94eVRpbWVvdXQ/OiBQcm94eU9wdGlvbnNbJ3Byb3h5VGltZW91dCddO1xuICB9ID0ge30pIHtcblxuICBwcm94eVBhdGggPSBfLnRyaW1FbmQocHJveHlQYXRoLCAnLycpO1xuICBhcGlVcmwgPSBfLnRyaW1FbmQoYXBpVXJsLCAnLycpO1xuICBjb25zdCB7IHByb3RvY29sLCBob3N0LCBwYXRobmFtZSB9ID0gbmV3IFVSTChhcGlVcmwpO1xuXG4gIGNvbnN0IHBhdFBhdGggPSBuZXcgUmVnRXhwKCdeJyArIF8uZXNjYXBlUmVnRXhwKHByb3h5UGF0aCkgKyAnKC98JCknKTtcbiAgY29uc3QgaHBtTG9nID0gZ2V0TG9nZ2VyKCdIUE0uJyArIHByb3h5UGF0aCk7XG4gIGFwaS5leHByZXNzQXBwU2V0KGFwcCA9PiB7XG4gICAgYXBwLnVzZShwcm94eVBhdGgsXG4gICAgICBwcm94eSh7XG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBtYXgtbGVuXG4gICAgICAgIHRhcmdldDogcHJvdG9jb2wgKyAnLy8nICsgaG9zdCxcbiAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICB3czogZmFsc2UsXG4gICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICAgIGNvb2tpZURvbWFpblJld3JpdGU6IHsgJyonOiAnJyB9LFxuICAgICAgICBwYXRoUmV3cml0ZTogb3B0cy5wYXRoUmV3cml0ZSA/ICBvcHRzLnBhdGhSZXdyaXRlIDogKHBhdGgsIHJlcSkgPT4ge1xuICAgICAgICAgIC8vIGhwbUxvZy53YXJuKCdwYXRQYXRoPScsIHBhdFBhdGgsICdwYXRoPScsIHBhdGgpO1xuICAgICAgICAgIGNvbnN0IHJldCA9IHBhdGggJiYgcGF0aC5yZXBsYWNlKHBhdFBhdGgsIHBhdGhuYW1lID09IG51bGwgPyAnLycgOiBwYXRobmFtZSArICcvJyk7XG4gICAgICAgICAgLy8gaHBtTG9nLmluZm8oYHByb3h5IHRvIHBhdGg6ICR7cmVxLm1ldGhvZH0gJHtwcm90b2NvbCArICcvLycgKyBob3N0fSR7cmV0fSwgcmVxLnVybCA9ICR7cmVxLnVybH1gKTtcbiAgICAgICAgICByZXR1cm4gcmV0O1xuICAgICAgICB9LFxuICAgICAgICBsb2dMZXZlbDogJ2RlYnVnJyxcbiAgICAgICAgbG9nUHJvdmlkZXI6IHByb3ZpZGVyID0+IGhwbUxvZyxcbiAgICAgICAgcHJveHlUaW1lb3V0OiBvcHRzLnByb3h5VGltZW91dCAhPSBudWxsID8gb3B0cy5wcm94eVRpbWVvdXQgOiAxMDAwMCxcbiAgICAgICAgb25Qcm94eVJlcShwcm94eVJlcSwgcmVxLCByZXMpIHtcbiAgICAgICAgICBpZiAob3B0cy5kZWxldGVPcmlnaW4pXG4gICAgICAgICAgICBwcm94eVJlcS5yZW1vdmVIZWFkZXIoJ09yaWdpbicpOyAvLyBCeXBhc3MgQ09SUyByZXN0cmljdCBvbiB0YXJnZXQgc2VydmVyXG4gICAgICAgICAgY29uc3QgcmVmZXJlciA9IHByb3h5UmVxLmdldEhlYWRlcigncmVmZXJlcicpO1xuICAgICAgICAgIGlmIChyZWZlcmVyKSB7XG4gICAgICAgICAgICBwcm94eVJlcS5zZXRIZWFkZXIoJ3JlZmVyZXInLCBgJHtwcm90b2NvbH0vLyR7aG9zdH0ke25ldyBVUkwocmVmZXJlciBhcyBzdHJpbmcpLnBhdGhuYW1lfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAob3B0cy5vblByb3h5UmVxKSB7XG4gICAgICAgICAgICBvcHRzLm9uUHJveHlSZXEocHJveHlSZXEsIHJlcSwgcmVzKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaHBtTG9nLmluZm8oYFByb3h5IHJlcXVlc3QgdG8gJHtwcm90b2NvbH0vLyR7aG9zdH0ke3Byb3h5UmVxLnBhdGh9IG1ldGhvZDogJHtyZXEubWV0aG9kfSwgJHtKU09OLnN0cmluZ2lmeShwcm94eVJlcS5nZXRIZWFkZXJzKCksIG51bGwsICcgICcpfWApO1xuICAgICAgICAgIC8vIGlmIChhcGkuY29uZmlnKCkuZGV2TW9kZSlcbiAgICAgICAgICAvLyAgIGhwbUxvZy5pbmZvKCdvbiBwcm94eSByZXF1ZXN0IGhlYWRlcnM6ICcsIEpTT04uc3RyaW5naWZ5KHByb3h5UmVxLmdldEhlYWRlcnMoKSwgbnVsbCwgJyAgJykpO1xuICAgICAgICB9LFxuICAgICAgICBvblByb3h5UmVzKGluY29taW5nLCByZXEsIHJlcykge1xuICAgICAgICAgIGluY29taW5nLmhlYWRlcnNbJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbiddID0gJyonO1xuICAgICAgICAgIGlmIChhcGkuY29uZmlnKCkuZGV2TW9kZSkge1xuICAgICAgICAgICAgaHBtTG9nLmluZm8oYFByb3h5IHJlY2lldmUgJHtyZXEub3JpZ2luYWxVcmx9LCBzdGF0dXM6ICR7aW5jb21pbmcuc3RhdHVzQ29kZSF9XFxuYCxcbiAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoaW5jb21pbmcuaGVhZGVycywgbnVsbCwgJyAgJykpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBocG1Mb2cuaW5mbyhgUHJveHkgcmVjaWV2ZSAke3JlcS5vcmlnaW5hbFVybH0sIHN0YXR1czogJHtpbmNvbWluZy5zdGF0dXNDb2RlIX1gKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGFwaS5jb25maWcoKS5kZXZNb2RlIHx8IGNvbmZpZygpLmNsaU9wdGlvbnM/LnZlcmJvc2UpIHtcblxuICAgICAgICAgICAgY29uc3QgY3QgPSBpbmNvbWluZy5oZWFkZXJzWydjb250ZW50LXR5cGUnXTtcbiAgICAgICAgICAgIGNvbnN0IGlzVGV4dCA9IChjdCAmJiAvXFxiKGpzb258dGV4dClcXGIvaS50ZXN0KGN0KSk7XG4gICAgICAgICAgICBpZiAoaXNUZXh0KSB7XG4gICAgICAgICAgICAgIGNvbnN0IGJ1ZnMgPSBbXSBhcyBzdHJpbmdbXTtcbiAgICAgICAgICAgICAgaW5jb21pbmcucGlwZShuZXcgc3RyZWFtLldyaXRhYmxlKHtcbiAgICAgICAgICAgICAgICB3cml0ZShjaHVuazogQnVmZmVyLCBlbmMsIGNiKSB7XG4gICAgICAgICAgICAgICAgICBidWZzLnB1c2goKGNodW5rLnRvU3RyaW5nKCkpKTtcbiAgICAgICAgICAgICAgICAgIGNiKCk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmaW5hbChjYikge1xuICAgICAgICAgICAgICAgICAgaHBtTG9nLmluZm8oYFJlc3BvbnNlICR7cmVxLm9yaWdpbmFsVXJsfSB0ZXh0IGJvZHk6XFxuYCwgYnVmcy5qb2luKCcnKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChvcHRzLm9uUHJveHlSZXMpIHtcbiAgICAgICAgICAgIG9wdHMub25Qcm94eVJlcyhpbmNvbWluZywgcmVxLCByZXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgb25FcnJvcihlcnIsIHJlcSwgcmVzKSB7XG4gICAgICAgICAgaHBtTG9nLndhcm4oZXJyKTtcbiAgICAgICAgICBpZiAob3B0cy5vbkVycm9yKSB7XG4gICAgICAgICAgICBvcHRzLm9uRXJyb3IoZXJyLCByZXEsIHJlcyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KVxuICAgICk7XG4gIH0pO1xufVxuXG4iXX0=