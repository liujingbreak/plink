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
                if (__api_1.default.config().devMode || ((_a = (0, plink_1.config)().cliOptions) === null || _a === void 0 ? void 0 : _a.verbose)) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFDQSxvREFBNEI7QUFDNUIsa0RBQXdCO0FBQ3hCLG9EQUF1QjtBQUN2QixzQ0FBMEM7QUFDMUMsaUVBQStGO0FBRS9GLE1BQU0sT0FBTyxHQUFHLGNBQU0sQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxZQUFZLENBQUMsQ0FBQztBQUVqRTs7Ozs7R0FLRztBQUNILFNBQWdCLHVCQUF1QixDQUFDLEdBQVksRUFBRSxHQUFhLEVBQUUsSUFBa0I7SUFDckYsTUFBTSxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztJQUN4QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7SUFFakMsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQztJQUVwQixTQUFTLEtBQUs7UUFDWixNQUFNLEdBQUcsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2pDLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxXQUFXLGNBQWMsR0FBRyxDQUFDLFVBQVUseUJBQXlCLEdBQUcsR0FBRyxTQUFTLElBQUk7WUFDNUgsWUFBWSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxTQUFTLE1BQU0sR0FBRyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUUsR0FBRyxDQUFDLENBQUM7SUFDMUYsQ0FBQztJQUVELEdBQUcsQ0FBQyxHQUFHLEdBQUcsVUFBUyxLQUFXLEVBQUUsUUFBZ0MsRUFBRSxFQUFlO1FBQy9FLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEQsTUFBTSxPQUFPLEdBQUcsU0FBUyxDQUFDLFNBQVMsQ0FB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QUcsRUFBRSxHQUFHLEVBQUUsR0FBRztnQkFDbkIsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDakIsSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO29CQUNoQixJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7aUJBQzdCO1lBQ0gsQ0FBQztTQUNGLENBQUMsQ0FDSCxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBMUZELHdDQTBGQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7UmVxdWVzdCwgUmVzcG9uc2UsIE5leHRGdW5jdGlvbn0gZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgc3RyZWFtIGZyb20gJ3N0cmVhbSc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge2NvbmZpZywgbG9nZ2VyfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCB7IGNyZWF0ZVByb3h5TWlkZGxld2FyZSBhcyBwcm94eSwgT3B0aW9ucyBhcyBQcm94eU9wdGlvbnN9IGZyb20gJ2h0dHAtcHJveHktbWlkZGxld2FyZSc7XG5cbmNvbnN0IGxvZ1RpbWUgPSBsb2dnZXIuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcudGltZXN0YW1wJyk7XG5cbi8qKlxuICogTWlkZGxld2FyZSBmb3IgcHJpbnRpbmcgZWFjaCByZXNwb25zZSBwcm9jZXNzIGR1cmF0aW9uIHRpbWUgdG8gbG9nXG4gKiBAcGFyYW0gcmVxIFxuICogQHBhcmFtIHJlcyBcbiAqIEBwYXJhbSBuZXh0IFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUmVzcG9uc2VUaW1lc3RhbXAocmVxOiBSZXF1ZXN0LCByZXM6IFJlc3BvbnNlLCBuZXh0OiBOZXh0RnVuY3Rpb24pIHtcbiAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKCk7XG4gIGNvbnN0IHN0YXJ0VGltZSA9IGRhdGUuZ2V0VGltZSgpO1xuXG4gIGNvbnN0IGVuZCA9IHJlcy5lbmQ7XG5cbiAgZnVuY3Rpb24gcHJpbnQoKSB7XG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgbG9nVGltZS5pbmZvKGByZXF1ZXN0OiAke3JlcS5tZXRob2R9ICR7cmVxLm9yaWdpbmFsVXJsfSB8IHN0YXR1czogJHtyZXMuc3RhdHVzQ29kZX0sIFtyZXNwb25zZSBkdXJhdGlvbjogJHtub3cgLSBzdGFydFRpbWV9bXNgICtcbiAgICAgIGBdIChzaW5jZSAke2RhdGUudG9Mb2NhbGVUaW1lU3RyaW5nKCl9ICR7c3RhcnRUaW1lfSkgWyR7cmVxLmhlYWRlcigndXNlci1hZ2VudCcpIX1dYCk7XG4gIH1cblxuICByZXMuZW5kID0gZnVuY3Rpb24oY2h1bms/OiBhbnksIGVuY29kaW5nPzogc3RyaW5nIHwgKCgpID0+IHZvaWQpLCBjYj86ICgpID0+IHZvaWQpIHtcbiAgICBjb25zdCBhcmd2ID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcbiAgICBjb25zdCBsYXN0QXJnID0gYXJndW1lbnRzW2FyZ3VtZW50cy5sZW5ndGggLSAxXTtcbiAgICBpZiAodHlwZW9mIGxhc3RBcmcgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNvbnN0IG9yaWdpbkNiID0gYXJndW1lbnRzW2FyZ3VtZW50cy5sZW5ndGggLSAxXTtcbiAgICAgIGFyZ3ZbYXJndi5sZW5ndGggLSAxXSA9ICgpID0+IHtcbiAgICAgICAgb3JpZ2luQ2IoKTtcbiAgICAgICAgcHJpbnQoKTtcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChhcmd2Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgYXJndi5wdXNoKG51bGwsIHByaW50KTtcbiAgICB9IGVsc2UgaWYgKGFyZ3YubGVuZ3RoID09PSAxKSB7XG4gICAgICBhcmd2LnB1c2gocHJpbnQpO1xuICAgIH1cbiAgICBjb25zdCByZXQgPSBlbmQuYXBwbHkocmVzLCBhcmd2KTtcbiAgICByZXR1cm4gcmV0O1xuICB9O1xuXG4gIG5leHQoKTtcbn1cblxuLyoqXG4gKiBUaGlzIGZ1bmN0aW9uIHVzZXMgaHR0cC1wcm94eS1taWRkbGV3YXJlIGludGVybmFsbHkuXG4gKiBcbiAqIENyZWF0ZSBhbmQgdXNlIGFuIEhUVFAgcmVxdWVzdCBwcm94eSBmb3Igc3BlY2lmaWMgcmVxdWVzdCBwYXRoXG4gKiBAcGFyYW0gcHJveHlQYXRoIFxuICogQHBhcmFtIHRhcmdldFVybCBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldHVwSHR0cFByb3h5KHByb3h5UGF0aDogc3RyaW5nLCBhcGlVcmw6IHN0cmluZyxcbiAgb3B0czoge1xuICAgIC8qKiBCeXBhc3MgQ09SUyByZXN0cmljdCBvbiB0YXJnZXQgc2VydmVyICovXG4gICAgZGVsZXRlT3JpZ2luPzogYm9vbGVhbjtcbiAgICBwYXRoUmV3cml0ZT86IFByb3h5T3B0aW9uc1sncGF0aFJld3JpdGUnXTtcbiAgICBvblByb3h5UmVxPzogUHJveHlPcHRpb25zWydvblByb3h5UmVxJ107XG4gICAgb25Qcm94eVJlcz86IFByb3h5T3B0aW9uc1snb25Qcm94eVJlcyddO1xuICAgIG9uRXJyb3I/OiBQcm94eU9wdGlvbnNbJ29uRXJyb3InXTtcbiAgICBidWZmZXI/OiBQcm94eU9wdGlvbnNbJ2J1ZmZlciddO1xuICAgIHNlbGZIYW5kbGVSZXNwb25zZT86IFByb3h5T3B0aW9uc1snc2VsZkhhbmRsZVJlc3BvbnNlJ107XG4gICAgcHJveHlUaW1lb3V0PzogUHJveHlPcHRpb25zWydwcm94eVRpbWVvdXQnXTtcbiAgfSA9IHt9KSB7XG5cbiAgcHJveHlQYXRoID0gXy50cmltRW5kKHByb3h5UGF0aCwgJy8nKTtcbiAgYXBpVXJsID0gXy50cmltRW5kKGFwaVVybCwgJy8nKTtcbiAgY29uc3QgeyBwcm90b2NvbCwgaG9zdCwgcGF0aG5hbWUgfSA9IG5ldyBVUkwoYXBpVXJsKTtcblxuICBjb25zdCBwYXRQYXRoID0gbmV3IFJlZ0V4cCgnXicgKyBfLmVzY2FwZVJlZ0V4cChwcm94eVBhdGgpICsgJygvfCQpJyk7XG4gIGNvbnN0IGhwbUxvZyA9IGxvZ2dlci5nZXRMb2dnZXIoJ0hQTS4nICsgcHJveHlQYXRoKTtcbiAgYXBpLmV4cHJlc3NBcHBTZXQoYXBwID0+IHtcbiAgICBhcHAudXNlKHByb3h5UGF0aCxcbiAgICAgIHByb3h5KHtcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG1heC1sZW5cbiAgICAgICAgdGFyZ2V0OiBwcm90b2NvbCArICcvLycgKyBob3N0LFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgIHdzOiBmYWxzZSxcbiAgICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgICAgY29va2llRG9tYWluUmV3cml0ZTogeyAnKic6ICcnIH0sXG4gICAgICAgIHBhdGhSZXdyaXRlOiBvcHRzLnBhdGhSZXdyaXRlID8gIG9wdHMucGF0aFJld3JpdGUgOiAocGF0aCwgcmVxKSA9PiB7XG4gICAgICAgICAgLy8gaHBtTG9nLndhcm4oJ3BhdFBhdGg9JywgcGF0UGF0aCwgJ3BhdGg9JywgcGF0aCk7XG4gICAgICAgICAgY29uc3QgcmV0ID0gcGF0aCAmJiBwYXRoLnJlcGxhY2UocGF0UGF0aCwgcGF0aG5hbWUgPT0gbnVsbCA/ICcvJyA6IHBhdGhuYW1lICsgJy8nKTtcbiAgICAgICAgICAvLyBocG1Mb2cuaW5mbyhgcHJveHkgdG8gcGF0aDogJHtyZXEubWV0aG9kfSAke3Byb3RvY29sICsgJy8vJyArIGhvc3R9JHtyZXR9LCByZXEudXJsID0gJHtyZXEudXJsfWApO1xuICAgICAgICAgIHJldHVybiByZXQ7XG4gICAgICAgIH0sXG4gICAgICAgIGxvZ0xldmVsOiAnZGVidWcnLFxuICAgICAgICBsb2dQcm92aWRlcjogcHJvdmlkZXIgPT4gaHBtTG9nLFxuICAgICAgICBwcm94eVRpbWVvdXQ6IG9wdHMucHJveHlUaW1lb3V0ICE9IG51bGwgPyBvcHRzLnByb3h5VGltZW91dCA6IDEwMDAwLFxuICAgICAgICBvblByb3h5UmVxKHByb3h5UmVxLCByZXEsIHJlcykge1xuICAgICAgICAgIGlmIChvcHRzLmRlbGV0ZU9yaWdpbilcbiAgICAgICAgICAgIHByb3h5UmVxLnJlbW92ZUhlYWRlcignT3JpZ2luJyk7IC8vIEJ5cGFzcyBDT1JTIHJlc3RyaWN0IG9uIHRhcmdldCBzZXJ2ZXJcbiAgICAgICAgICBjb25zdCByZWZlcmVyID0gcHJveHlSZXEuZ2V0SGVhZGVyKCdyZWZlcmVyJyk7XG4gICAgICAgICAgaWYgKHJlZmVyZXIpIHtcbiAgICAgICAgICAgIHByb3h5UmVxLnNldEhlYWRlcigncmVmZXJlcicsIGAke3Byb3RvY29sfS8vJHtob3N0fSR7bmV3IFVSTChyZWZlcmVyIGFzIHN0cmluZykucGF0aG5hbWV9YCk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChvcHRzLm9uUHJveHlSZXEpIHtcbiAgICAgICAgICAgIG9wdHMub25Qcm94eVJlcShwcm94eVJlcSwgcmVxLCByZXMpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBocG1Mb2cuaW5mbyhgUHJveHkgcmVxdWVzdCB0byAke3Byb3RvY29sfS8vJHtob3N0fSR7cHJveHlSZXEucGF0aH0gbWV0aG9kOiAke3JlcS5tZXRob2R9LCAke0pTT04uc3RyaW5naWZ5KHByb3h5UmVxLmdldEhlYWRlcnMoKSwgbnVsbCwgJyAgJyl9YCk7XG4gICAgICAgICAgLy8gaWYgKGFwaS5jb25maWcoKS5kZXZNb2RlKVxuICAgICAgICAgIC8vICAgaHBtTG9nLmluZm8oJ29uIHByb3h5IHJlcXVlc3QgaGVhZGVyczogJywgSlNPTi5zdHJpbmdpZnkocHJveHlSZXEuZ2V0SGVhZGVycygpLCBudWxsLCAnICAnKSk7XG4gICAgICAgIH0sXG4gICAgICAgIG9uUHJveHlSZXMoaW5jb21pbmcsIHJlcSwgcmVzKSB7XG4gICAgICAgICAgaW5jb21pbmcuaGVhZGVyc1snQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJ10gPSAnKic7XG4gICAgICAgICAgaWYgKGFwaS5jb25maWcoKS5kZXZNb2RlKSB7XG4gICAgICAgICAgICBocG1Mb2cuaW5mbyhgUHJveHkgcmVjaWV2ZSAke3JlcS5vcmlnaW5hbFVybH0sIHN0YXR1czogJHtpbmNvbWluZy5zdGF0dXNDb2RlIX1cXG5gLFxuICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeShpbmNvbWluZy5oZWFkZXJzLCBudWxsLCAnICAnKSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGhwbUxvZy5pbmZvKGBQcm94eSByZWNpZXZlICR7cmVxLm9yaWdpbmFsVXJsfSwgc3RhdHVzOiAke2luY29taW5nLnN0YXR1c0NvZGUhfWApO1xuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoYXBpLmNvbmZpZygpLmRldk1vZGUgfHwgY29uZmlnKCkuY2xpT3B0aW9ucz8udmVyYm9zZSkge1xuXG4gICAgICAgICAgICBjb25zdCBjdCA9IGluY29taW5nLmhlYWRlcnNbJ2NvbnRlbnQtdHlwZSddO1xuICAgICAgICAgICAgaHBtTG9nLmluZm8oYFJlc3BvbnNlICR7cmVxLm9yaWdpbmFsVXJsfSBoZWFkZXJzOlxcbmAsIGluY29taW5nLnJhd0hlYWRlcnMpO1xuICAgICAgICAgICAgY29uc3QgaXNUZXh0ID0gKGN0ICYmIC9cXGIoanNvbnx0ZXh0KVxcYi9pLnRlc3QoY3QpKTtcbiAgICAgICAgICAgIGlmIChpc1RleHQpIHtcbiAgICAgICAgICAgICAgY29uc3QgYnVmcyA9IFtdIGFzIHN0cmluZ1tdO1xuICAgICAgICAgICAgICBpbmNvbWluZy5waXBlKG5ldyBzdHJlYW0uV3JpdGFibGUoe1xuICAgICAgICAgICAgICAgIHdyaXRlKGNodW5rOiBCdWZmZXIsIGVuYywgY2IpIHtcbiAgICAgICAgICAgICAgICAgIGJ1ZnMucHVzaCgoY2h1bmsudG9TdHJpbmcoKSkpO1xuICAgICAgICAgICAgICAgICAgY2IoKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIGZpbmFsKGNiKSB7XG4gICAgICAgICAgICAgICAgICBocG1Mb2cuaW5mbyhgUmVzcG9uc2UgJHtyZXEub3JpZ2luYWxVcmx9IHRleHQgYm9keTpcXG5gLCBidWZzLmpvaW4oJycpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKG9wdHMub25Qcm94eVJlcykge1xuICAgICAgICAgICAgb3B0cy5vblByb3h5UmVzKGluY29taW5nLCByZXEsIHJlcyk7XG4gICAgICAgICAgfVxuICAgICAgICB9LFxuICAgICAgICBvbkVycm9yKGVyciwgcmVxLCByZXMpIHtcbiAgICAgICAgICBocG1Mb2cud2FybihlcnIpO1xuICAgICAgICAgIGlmIChvcHRzLm9uRXJyb3IpIHtcbiAgICAgICAgICAgIG9wdHMub25FcnJvcihlcnIsIHJlcSwgcmVzKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgKTtcbiAgfSk7XG59XG5cbiJdfQ==