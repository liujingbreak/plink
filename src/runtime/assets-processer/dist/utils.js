"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupHttpProxy = exports.createResponseTimestamp = void 0;
const stream_1 = __importDefault(require("stream"));
const __api_1 = __importDefault(require("__api"));
const lodash_1 = __importDefault(require("lodash"));
const plink_1 = require("@wfh/plink");
const http_proxy_middleware_1 = require("http-proxy-middleware");
const logTime = plink_1.logger.getLogger(__api_1.default.packageName + '.timestamp');
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
    const hpmLog = plink_1.logger.getLogger('HPM.' + proxyPath);
    __api_1.default.expressAppSet(app => {
        app.use(proxyPath, (0, http_proxy_middleware_1.createProxyMiddleware)({
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
            onProxyReq(proxyReq, req, res, opt) {
                if (opts.deleteOrigin)
                    proxyReq.removeHeader('Origin'); // Bypass CORS restrict on target server
                const referer = proxyReq.getHeader('referer');
                if (referer) {
                    proxyReq.setHeader('referer', `${protocol}//${host}${new URL(referer).pathname}`);
                }
                if (opts.onProxyReq) {
                    opts.onProxyReq(proxyReq, req, res, opt);
                }
                hpmLog.info(`Proxy request to ${protocol}//${host}${proxyReq.path} method: ${req.method}, ${JSON.stringify(proxyReq.getHeaders(), null, '  ')}`);
                // if (api.config().devMode)
                //   hpmLog.info('on proxy request headers: ', JSON.stringify(proxyReq.getHeaders(), null, '  '));
            },
            onProxyRes(incoming, req, res) {
                var _a;
                incoming.headers['Access-Control-Allow-Origin'] = '*';
                if (__api_1.default.config().devMode) {
                    hpmLog.info(`Proxy recieve ${req.url}, status: ${incoming.statusCode}\n`, JSON.stringify(incoming.headers, null, '  '));
                }
                else {
                    hpmLog.info(`Proxy recieve ${req.url}, status: ${incoming.statusCode}`);
                }
                if (__api_1.default.config().devMode || ((_a = (0, plink_1.config)().cliOptions) === null || _a === void 0 ? void 0 : _a.verbose)) {
                    const ct = incoming.headers['content-type'];
                    hpmLog.info(`Response ${req.url} headers:\n`, incoming.rawHeaders);
                    const isText = (ct && /\b(json|text)\b/i.test(ct));
                    if (isText) {
                        const bufs = [];
                        incoming.pipe(new stream_1.default.Writable({
                            write(chunk, enc, cb) {
                                bufs.push((chunk.toString()));
                                cb();
                            },
                            final(cb) {
                                hpmLog.info(`Response ${req.url} text body:\n`, bufs.join(''));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFDQSxvREFBNEI7QUFDNUIsa0RBQXdCO0FBQ3hCLG9EQUF1QjtBQUN2QixzQ0FBMEM7QUFDMUMsaUVBQStGO0FBRS9GLE1BQU0sT0FBTyxHQUFHLGNBQU0sQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxZQUFZLENBQUMsQ0FBQztBQUVqRTs7Ozs7R0FLRztBQUNILFNBQWdCLHVCQUF1QixDQUFDLEdBQVksRUFBRSxHQUFhLEVBQUUsSUFBa0I7SUFDckYsTUFBTSxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztJQUN4QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7SUFFakMsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQztJQUVwQixTQUFTLEtBQUs7UUFDWixNQUFNLEdBQUcsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2pDLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxXQUFXLGNBQWMsR0FBRyxDQUFDLFVBQVUseUJBQXlCLEdBQUcsR0FBRyxTQUFTLElBQUk7WUFDNUgsWUFBWSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxTQUFTLE1BQU0sR0FBRyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUUsR0FBRyxDQUFDLENBQUM7SUFDMUYsQ0FBQztJQUVELEdBQUcsQ0FBQyxHQUFHLEdBQUcsVUFBUyxLQUFXLEVBQUUsUUFBZ0MsRUFBRSxFQUFlO1FBQy9FLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEQsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FB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QUM7WUFDRCxPQUFPLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHO2dCQUNuQixNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNqQixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7b0JBQ2hCLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQztpQkFDN0I7WUFDSCxDQUFDO1NBQ0YsQ0FBQyxDQUNILENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUExRkQsd0NBMEZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtSZXF1ZXN0LCBSZXNwb25zZSwgTmV4dEZ1bmN0aW9ufSBmcm9tICdleHByZXNzJztcbmltcG9ydCBzdHJlYW0gZnJvbSAnc3RyZWFtJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7Y29uZmlnLCBsb2dnZXJ9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IHsgY3JlYXRlUHJveHlNaWRkbGV3YXJlIGFzIHByb3h5LCBPcHRpb25zIGFzIFByb3h5T3B0aW9uc30gZnJvbSAnaHR0cC1wcm94eS1taWRkbGV3YXJlJztcblxuY29uc3QgbG9nVGltZSA9IGxvZ2dlci5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy50aW1lc3RhbXAnKTtcblxuLyoqXG4gKiBNaWRkbGV3YXJlIGZvciBwcmludGluZyBlYWNoIHJlc3BvbnNlIHByb2Nlc3MgZHVyYXRpb24gdGltZSB0byBsb2dcbiAqIEBwYXJhbSByZXEgXG4gKiBAcGFyYW0gcmVzIFxuICogQHBhcmFtIG5leHQgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSZXNwb25zZVRpbWVzdGFtcChyZXE6IFJlcXVlc3QsIHJlczogUmVzcG9uc2UsIG5leHQ6IE5leHRGdW5jdGlvbikge1xuICBjb25zdCBkYXRlID0gbmV3IERhdGUoKTtcbiAgY29uc3Qgc3RhcnRUaW1lID0gZGF0ZS5nZXRUaW1lKCk7XG5cbiAgY29uc3QgZW5kID0gcmVzLmVuZDtcblxuICBmdW5jdGlvbiBwcmludCgpIHtcbiAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICBsb2dUaW1lLmluZm8oYHJlcXVlc3Q6ICR7cmVxLm1ldGhvZH0gJHtyZXEub3JpZ2luYWxVcmx9IHwgc3RhdHVzOiAke3Jlcy5zdGF0dXNDb2RlfSwgW3Jlc3BvbnNlIGR1cmF0aW9uOiAke25vdyAtIHN0YXJ0VGltZX1tc2AgK1xuICAgICAgYF0gKHNpbmNlICR7ZGF0ZS50b0xvY2FsZVRpbWVTdHJpbmcoKX0gJHtzdGFydFRpbWV9KSBbJHtyZXEuaGVhZGVyKCd1c2VyLWFnZW50JykhfV1gKTtcbiAgfVxuXG4gIHJlcy5lbmQgPSBmdW5jdGlvbihjaHVuaz86IGFueSwgZW5jb2Rpbmc/OiBzdHJpbmcgfCAoKCkgPT4gdm9pZCksIGNiPzogKCkgPT4gdm9pZCkge1xuICAgIGNvbnN0IGFyZ3YgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICAgIGNvbnN0IGxhc3RBcmcgPSBhcmd1bWVudHNbYXJndW1lbnRzLmxlbmd0aCAtIDFdO1xuICAgIGlmICh0eXBlb2YgbGFzdEFyZyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY29uc3Qgb3JpZ2luQ2IgPSBhcmd1bWVudHNbYXJndW1lbnRzLmxlbmd0aCAtIDFdO1xuICAgICAgYXJndlthcmd2Lmxlbmd0aCAtIDFdID0gKCkgPT4ge1xuICAgICAgICBvcmlnaW5DYigpO1xuICAgICAgICBwcmludCgpO1xuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKGFyZ3YubGVuZ3RoID09PSAwKSB7XG4gICAgICBhcmd2LnB1c2gobnVsbCwgcHJpbnQpO1xuICAgIH0gZWxzZSBpZiAoYXJndi5sZW5ndGggPT09IDEpIHtcbiAgICAgIGFyZ3YucHVzaChwcmludCk7XG4gICAgfVxuICAgIGNvbnN0IHJldCA9IGVuZC5hcHBseShyZXMsIGFyZ3YpO1xuICAgIHJldHVybiByZXQ7XG4gIH07XG5cbiAgbmV4dCgpO1xufVxuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gdXNlcyBodHRwLXByb3h5LW1pZGRsZXdhcmUgaW50ZXJuYWxseS5cbiAqIFxuICogQ3JlYXRlIGFuZCB1c2UgYW4gSFRUUCByZXF1ZXN0IHByb3h5IGZvciBzcGVjaWZpYyByZXF1ZXN0IHBhdGhcbiAqIEBwYXJhbSBwcm94eVBhdGggXG4gKiBAcGFyYW0gdGFyZ2V0VXJsIFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBIdHRwUHJveHkocHJveHlQYXRoOiBzdHJpbmcsIGFwaVVybDogc3RyaW5nLFxuICBvcHRzOiB7XG4gICAgLyoqIEJ5cGFzcyBDT1JTIHJlc3RyaWN0IG9uIHRhcmdldCBzZXJ2ZXIgKi9cbiAgICBkZWxldGVPcmlnaW4/OiBib29sZWFuO1xuICAgIHBhdGhSZXdyaXRlPzogUHJveHlPcHRpb25zWydwYXRoUmV3cml0ZSddO1xuICAgIG9uUHJveHlSZXE/OiBQcm94eU9wdGlvbnNbJ29uUHJveHlSZXEnXTtcbiAgICBvblByb3h5UmVzPzogUHJveHlPcHRpb25zWydvblByb3h5UmVzJ107XG4gICAgb25FcnJvcj86IFByb3h5T3B0aW9uc1snb25FcnJvciddO1xuICAgIGJ1ZmZlcj86IFByb3h5T3B0aW9uc1snYnVmZmVyJ107XG4gICAgc2VsZkhhbmRsZVJlc3BvbnNlPzogUHJveHlPcHRpb25zWydzZWxmSGFuZGxlUmVzcG9uc2UnXTtcbiAgICBwcm94eVRpbWVvdXQ/OiBQcm94eU9wdGlvbnNbJ3Byb3h5VGltZW91dCddO1xuICB9ID0ge30pIHtcblxuICBwcm94eVBhdGggPSBfLnRyaW1FbmQocHJveHlQYXRoLCAnLycpO1xuICBhcGlVcmwgPSBfLnRyaW1FbmQoYXBpVXJsLCAnLycpO1xuICBjb25zdCB7IHByb3RvY29sLCBob3N0LCBwYXRobmFtZSB9ID0gbmV3IFVSTChhcGlVcmwpO1xuXG4gIGNvbnN0IHBhdFBhdGggPSBuZXcgUmVnRXhwKCdeJyArIF8uZXNjYXBlUmVnRXhwKHByb3h5UGF0aCkgKyAnKC98JCknKTtcbiAgY29uc3QgaHBtTG9nID0gbG9nZ2VyLmdldExvZ2dlcignSFBNLicgKyBwcm94eVBhdGgpO1xuICBhcGkuZXhwcmVzc0FwcFNldChhcHAgPT4ge1xuICAgIGFwcC51c2UocHJveHlQYXRoLFxuICAgICAgcHJveHkoe1xuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbWF4LWxlblxuICAgICAgICB0YXJnZXQ6IHByb3RvY29sICsgJy8vJyArIGhvc3QsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgd3M6IGZhbHNlLFxuICAgICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgICBjb29raWVEb21haW5SZXdyaXRlOiB7ICcqJzogJycgfSxcbiAgICAgICAgcGF0aFJld3JpdGU6IG9wdHMucGF0aFJld3JpdGUgPyAgb3B0cy5wYXRoUmV3cml0ZSA6IChwYXRoLCByZXEpID0+IHtcbiAgICAgICAgICAvLyBocG1Mb2cud2FybigncGF0UGF0aD0nLCBwYXRQYXRoLCAncGF0aD0nLCBwYXRoKTtcbiAgICAgICAgICBjb25zdCByZXQgPSBwYXRoICYmIHBhdGgucmVwbGFjZShwYXRQYXRoLCBwYXRobmFtZSA9PSBudWxsID8gJy8nIDogcGF0aG5hbWUgKyAnLycpO1xuICAgICAgICAgIC8vIGhwbUxvZy5pbmZvKGBwcm94eSB0byBwYXRoOiAke3JlcS5tZXRob2R9ICR7cHJvdG9jb2wgKyAnLy8nICsgaG9zdH0ke3JldH0sIHJlcS51cmwgPSAke3JlcS51cmx9YCk7XG4gICAgICAgICAgcmV0dXJuIHJldDtcbiAgICAgICAgfSxcbiAgICAgICAgbG9nTGV2ZWw6ICdkZWJ1ZycsXG4gICAgICAgIGxvZ1Byb3ZpZGVyOiBwcm92aWRlciA9PiBocG1Mb2csXG4gICAgICAgIHByb3h5VGltZW91dDogb3B0cy5wcm94eVRpbWVvdXQgIT0gbnVsbCA/IG9wdHMucHJveHlUaW1lb3V0IDogMTAwMDAsXG4gICAgICAgIG9uUHJveHlSZXEocHJveHlSZXEsIHJlcSwgcmVzLCBvcHQpIHtcbiAgICAgICAgICBpZiAob3B0cy5kZWxldGVPcmlnaW4pXG4gICAgICAgICAgICBwcm94eVJlcS5yZW1vdmVIZWFkZXIoJ09yaWdpbicpOyAvLyBCeXBhc3MgQ09SUyByZXN0cmljdCBvbiB0YXJnZXQgc2VydmVyXG4gICAgICAgICAgY29uc3QgcmVmZXJlciA9IHByb3h5UmVxLmdldEhlYWRlcigncmVmZXJlcicpO1xuICAgICAgICAgIGlmIChyZWZlcmVyKSB7XG4gICAgICAgICAgICBwcm94eVJlcS5zZXRIZWFkZXIoJ3JlZmVyZXInLCBgJHtwcm90b2NvbH0vLyR7aG9zdH0ke25ldyBVUkwocmVmZXJlciBhcyBzdHJpbmcpLnBhdGhuYW1lfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAob3B0cy5vblByb3h5UmVxKSB7XG4gICAgICAgICAgICBvcHRzLm9uUHJveHlSZXEocHJveHlSZXEsIHJlcSwgcmVzLCBvcHQpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBocG1Mb2cuaW5mbyhgUHJveHkgcmVxdWVzdCB0byAke3Byb3RvY29sfS8vJHtob3N0fSR7cHJveHlSZXEucGF0aH0gbWV0aG9kOiAke3JlcS5tZXRob2QhfSwgJHtKU09OLnN0cmluZ2lmeShwcm94eVJlcS5nZXRIZWFkZXJzKCksIG51bGwsICcgICcpfWApO1xuICAgICAgICAgIC8vIGlmIChhcGkuY29uZmlnKCkuZGV2TW9kZSlcbiAgICAgICAgICAvLyAgIGhwbUxvZy5pbmZvKCdvbiBwcm94eSByZXF1ZXN0IGhlYWRlcnM6ICcsIEpTT04uc3RyaW5naWZ5KHByb3h5UmVxLmdldEhlYWRlcnMoKSwgbnVsbCwgJyAgJykpO1xuICAgICAgICB9LFxuICAgICAgICBvblByb3h5UmVzKGluY29taW5nLCByZXEsIHJlcykge1xuICAgICAgICAgIGluY29taW5nLmhlYWRlcnNbJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbiddID0gJyonO1xuICAgICAgICAgIGlmIChhcGkuY29uZmlnKCkuZGV2TW9kZSkge1xuICAgICAgICAgICAgaHBtTG9nLmluZm8oYFByb3h5IHJlY2lldmUgJHtyZXEudXJsIX0sIHN0YXR1czogJHtpbmNvbWluZy5zdGF0dXNDb2RlIX1cXG5gLFxuICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeShpbmNvbWluZy5oZWFkZXJzLCBudWxsLCAnICAnKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGhwbUxvZy5pbmZvKGBQcm94eSByZWNpZXZlICR7cmVxLnVybCF9LCBzdGF0dXM6ICR7aW5jb21pbmcuc3RhdHVzQ29kZSF9YCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChhcGkuY29uZmlnKCkuZGV2TW9kZSB8fCBjb25maWcoKS5jbGlPcHRpb25zPy52ZXJib3NlKSB7XG5cbiAgICAgICAgICAgIGNvbnN0IGN0ID0gaW5jb21pbmcuaGVhZGVyc1snY29udGVudC10eXBlJ107XG4gICAgICAgICAgICBocG1Mb2cuaW5mbyhgUmVzcG9uc2UgJHtyZXEudXJsIX0gaGVhZGVyczpcXG5gLCBpbmNvbWluZy5yYXdIZWFkZXJzKTtcbiAgICAgICAgICAgIGNvbnN0IGlzVGV4dCA9IChjdCAmJiAvXFxiKGpzb258dGV4dClcXGIvaS50ZXN0KGN0KSk7XG4gICAgICAgICAgICBpZiAoaXNUZXh0KSB7XG4gICAgICAgICAgICAgIGNvbnN0IGJ1ZnMgPSBbXSBhcyBzdHJpbmdbXTtcbiAgICAgICAgICAgICAgaW5jb21pbmcucGlwZShuZXcgc3RyZWFtLldyaXRhYmxlKHtcbiAgICAgICAgICAgICAgICB3cml0ZShjaHVuazogQnVmZmVyLCBlbmMsIGNiKSB7XG4gICAgICAgICAgICAgICAgICBidWZzLnB1c2goKGNodW5rLnRvU3RyaW5nKCkpKTtcbiAgICAgICAgICAgICAgICAgIGNiKCk7XG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICBmaW5hbChjYikge1xuICAgICAgICAgICAgICAgICAgaHBtTG9nLmluZm8oYFJlc3BvbnNlICR7cmVxLnVybCF9IHRleHQgYm9keTpcXG5gLCBidWZzLmpvaW4oJycpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKG9wdHMub25Qcm94eVJlcykge1xuICAgICAgICAgICAgb3B0cy5vblByb3h5UmVzKGluY29taW5nLCByZXEsIHJlcyk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBvbkVycm9yKGVyciwgcmVxLCByZXMpIHtcbiAgICAgICAgICBocG1Mb2cud2FybihlcnIpO1xuICAgICAgICAgIGlmIChvcHRzLm9uRXJyb3IpIHtcbiAgICAgICAgICAgIG9wdHMub25FcnJvcihlcnIsIHJlcSwgcmVzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKTtcbiAgfSk7XG59XG5cbiJdfQ==