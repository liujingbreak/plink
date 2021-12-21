"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultProxyOptions = exports.setupHttpProxy = exports.createResponseTimestamp = void 0;
const stream_1 = __importDefault(require("stream"));
const __plink_1 = __importDefault(require("__plink"));
const lodash_1 = __importDefault(require("lodash"));
const utils_1 = require("@wfh/http-server/dist/utils");
const plink_1 = require("@wfh/plink");
// import inspector from 'inspector';
const http_proxy_middleware_1 = require("http-proxy-middleware");
// inspector.open(9222, 'localhost', true);
const logTime = plink_1.logger.getLogger(__plink_1.default.packageName + '.timestamp');
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
 * Be aware with command line option "--verbose", once enable "verbose", this function will
 * read (pipe) remote server response body into a string buffer for any message with content-type is "text" or "json" based
 * Create and use an HTTP request proxy for specific request path
 * @param proxyPath
 * @param targetUrl
 */
function setupHttpProxy(proxyPath, targetUrl, opts = {}) {
    proxyPath = lodash_1.default.trimEnd(proxyPath, '/');
    targetUrl = lodash_1.default.trimEnd(targetUrl, '/');
    const defaultOpt = defaultProxyOptions(proxyPath, targetUrl);
    const proxyMidOpt = Object.assign(Object.assign({}, defaultOpt), { onProxyReq(...args) {
            const origHeader = args[0].getHeader('Origin');
            defaultOpt.onProxyReq(...args);
            if (opts.deleteOrigin === false) {
                // Recover removed header "Origin"
                args[0].setHeader('Origin', origHeader);
            }
            if (opts.onProxyReq)
                opts.onProxyReq(...args);
        },
        onProxyRes(...args) {
            if (opts.onProxyRes)
                opts.onProxyRes(...args);
            defaultOpt.onProxyRes(...args);
        },
        onError(...args) {
            defaultOpt.onError(...args);
            if (opts.onError)
                opts.onError(...args);
        } });
    __plink_1.default.expressAppSet(app => {
        app.use(proxyPath, (0, http_proxy_middleware_1.createProxyMiddleware)(proxyMidOpt));
    });
}
exports.setupHttpProxy = setupHttpProxy;
function isRedirectableRequest(req) {
    return req._currentRequest !== null;
}
function defaultProxyOptions(proxyPath, targetUrl) {
    proxyPath = lodash_1.default.trimEnd(proxyPath, '/');
    targetUrl = lodash_1.default.trimEnd(targetUrl, '/');
    const { protocol, host, pathname } = new URL(targetUrl);
    const patPath = new RegExp('^' + lodash_1.default.escapeRegExp(proxyPath) + '(/|$)');
    const hpmLog = plink_1.logger.getLogger('HPM.' + proxyPath);
    const proxyMidOpt = {
        // eslint-disable-next-line max-len
        target: protocol + '//' + host,
        changeOrigin: true,
        ws: false,
        secure: false,
        cookieDomainRewrite: { '*': '' },
        pathRewrite: (path, req) => {
            // hpmLog.warn('patPath=', patPath, 'path=', path);
            const ret = path && path.replace(patPath, lodash_1.default.trimEnd(pathname, '/') + '/');
            // hpmLog.info(`proxy to path: ${req.method} ${protocol + '//' + host}${ret}, req.url = ${req.url}`);
            return ret;
        },
        logLevel: 'debug',
        logProvider: provider => hpmLog,
        proxyTimeout: 10000,
        onProxyReq(proxyReq, req, res, ...rest) {
            // This proxyReq could be "RedirectRequest" if option "followRedirect" is on
            if (isRedirectableRequest(proxyReq)) {
                hpmLog.info(`Proxy request to ${protocol}//${host}${proxyReq._currentRequest.path} method: ${req.method || 'uknown'}, ${JSON.stringify(proxyReq._currentRequest.getHeaders(), null, '  ')}`);
            }
            else {
                proxyReq.removeHeader('Origin'); // Bypass CORS restrict on target server
                const referer = proxyReq.getHeader('referer');
                if (typeof referer === 'string') {
                    proxyReq.setHeader('referer', `${protocol}//${host}${new URL(referer).pathname}`);
                }
                hpmLog.info(`Proxy request to ${protocol}//${host}${proxyReq.path} method: ${req.method || 'uknown'}, ${JSON.stringify(proxyReq.getHeaders(), null, '  ')}`);
            }
        },
        onProxyRes(incoming, req, res) {
            incoming.headers['Access-Control-Allow-Origin'] = '*';
            if (__plink_1.default.config().devMode) {
                hpmLog.info(`Proxy recieve ${req.url || ''}, status: ${incoming.statusCode}\n`, JSON.stringify(incoming.headers, null, '  '));
            }
            else {
                hpmLog.info(`Proxy recieve ${req.url || ''}, status: ${incoming.statusCode}`);
            }
            if (__plink_1.default.config().devMode) {
                const ct = incoming.headers['content-type'];
                hpmLog.info(`Response ${req.url || ''} headers:\n`, incoming.headers);
                const isText = (ct && /\b(json|text)\b/i.test(ct));
                if (isText) {
                    if (!incoming.complete) {
                        const bufs = [];
                        void (0, utils_1.readCompressedResponse)(incoming, new stream_1.default.Writable({
                            write(chunk, enc, cb) {
                                bufs.push(Buffer.isBuffer(chunk) ? chunk.toString() : chunk);
                                cb();
                            },
                            final(cb) {
                                hpmLog.info(`Response ${req.url || ''} text body:\n`, bufs.join(''));
                            }
                        }));
                    }
                    else if (incoming.body) {
                        hpmLog.info(`Response ${req.url || ''} text body:\n`, incoming.toString());
                    }
                }
            }
        },
        onError(err, req, res) {
            hpmLog.warn(err);
        }
    };
    return proxyMidOpt;
}
exports.defaultProxyOptions = defaultProxyOptions;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7QUFBQSxvREFBNEI7QUFHNUIsc0RBQTBCO0FBQzFCLG9EQUF1QjtBQUN2Qix1REFBbUU7QUFDbkUsc0NBQWtDO0FBRWxDLHFDQUFxQztBQUNyQyxpRUFBK0Y7QUFFL0YsMkNBQTJDO0FBQzNDLE1BQU0sT0FBTyxHQUFHLGNBQU0sQ0FBQyxTQUFTLENBQUMsaUJBQUcsQ0FBQyxXQUFXLEdBQUcsWUFBWSxDQUFDLENBQUM7QUFDakU7Ozs7O0dBS0c7QUFDSCxTQUFnQix1QkFBdUIsQ0FBQyxHQUFZLEVBQUUsR0FBYSxFQUFFLElBQWtCO0lBQ3JGLE1BQU0sSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7SUFDeEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBRWpDLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUM7SUFFcEIsU0FBUyxLQUFLO1FBQ1osTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNqQyxPQUFPLENBQUMsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLE1BQU0sSUFBSSxHQUFHLENBQUMsV0FBVyxjQUFjLEdBQUcsQ0FBQyxVQUFVLHlCQUF5QixHQUFHLEdBQUcsU0FBUyxJQUFJO1lBQzVILFlBQVksSUFBSSxDQUFDLGtCQUFrQixFQUFFLElBQUksU0FBUyxNQUFNLEdBQUcsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzFGLENBQUM7SUFFRCxHQUFHLENBQUMsR0FBRyxHQUFHLFVBQVMsS0FBVyxFQUFFLFFBQWdDLEVBQUUsRUFBZTtRQUMvRSxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFD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Q0FDN0QsRUFBRSxFQUFFLENBQUM7NEJBQ1AsQ0FBQzs0QkFDRCxLQUFLLENBQUMsRUFBRTtnQ0FDTixNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLEdBQUcsSUFBSSxFQUFFLGVBQWUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7NEJBQ3ZFLENBQUM7eUJBQ0YsQ0FBQyxDQUFDLENBQUM7cUJBQ0w7eUJBQU0sSUFBSyxRQUFxQyxDQUFDLElBQUksRUFBRTt3QkFDdEQsTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxHQUFHLElBQUksRUFBRSxlQUFlLEVBQUcsUUFBcUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO3FCQUMxRztpQkFDRjthQUNGO1FBQ0gsQ0FBQztRQUNELE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUc7WUFDbkIsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNuQixDQUFDO0tBQ0YsQ0FBQztJQUNGLE9BQU8sV0FBVyxDQUFDO0FBQ3JCLENBQUM7QUEzRUQsa0RBMkVDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHN0cmVhbSBmcm9tICdzdHJlYW0nO1xuaW1wb3J0IHtDbGllbnRSZXF1ZXN0fSBmcm9tICdodHRwJztcbmltcG9ydCB7UmVxdWVzdCwgUmVzcG9uc2UsIE5leHRGdW5jdGlvbn0gZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgYXBpIGZyb20gJ19fcGxpbmsnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7cmVhZENvbXByZXNzZWRSZXNwb25zZX0gZnJvbSAnQHdmaC9odHRwLXNlcnZlci9kaXN0L3V0aWxzJztcbmltcG9ydCB7bG9nZ2VyfSBmcm9tICdAd2ZoL3BsaW5rJztcblxuLy8gaW1wb3J0IGluc3BlY3RvciBmcm9tICdpbnNwZWN0b3InO1xuaW1wb3J0IHsgY3JlYXRlUHJveHlNaWRkbGV3YXJlIGFzIHByb3h5LCBPcHRpb25zIGFzIFByb3h5T3B0aW9uc30gZnJvbSAnaHR0cC1wcm94eS1taWRkbGV3YXJlJztcblxuLy8gaW5zcGVjdG9yLm9wZW4oOTIyMiwgJ2xvY2FsaG9zdCcsIHRydWUpO1xuY29uc3QgbG9nVGltZSA9IGxvZ2dlci5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy50aW1lc3RhbXAnKTtcbi8qKlxuICogTWlkZGxld2FyZSBmb3IgcHJpbnRpbmcgZWFjaCByZXNwb25zZSBwcm9jZXNzIGR1cmF0aW9uIHRpbWUgdG8gbG9nXG4gKiBAcGFyYW0gcmVxIFxuICogQHBhcmFtIHJlcyBcbiAqIEBwYXJhbSBuZXh0IFxuICovXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUmVzcG9uc2VUaW1lc3RhbXAocmVxOiBSZXF1ZXN0LCByZXM6IFJlc3BvbnNlLCBuZXh0OiBOZXh0RnVuY3Rpb24pIHtcbiAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKCk7XG4gIGNvbnN0IHN0YXJ0VGltZSA9IGRhdGUuZ2V0VGltZSgpO1xuXG4gIGNvbnN0IGVuZCA9IHJlcy5lbmQ7XG5cbiAgZnVuY3Rpb24gcHJpbnQoKSB7XG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gICAgbG9nVGltZS5pbmZvKGByZXF1ZXN0OiAke3JlcS5tZXRob2R9ICR7cmVxLm9yaWdpbmFsVXJsfSB8IHN0YXR1czogJHtyZXMuc3RhdHVzQ29kZX0sIFtyZXNwb25zZSBkdXJhdGlvbjogJHtub3cgLSBzdGFydFRpbWV9bXNgICtcbiAgICAgIGBdIChzaW5jZSAke2RhdGUudG9Mb2NhbGVUaW1lU3RyaW5nKCl9ICR7c3RhcnRUaW1lfSkgWyR7cmVxLmhlYWRlcigndXNlci1hZ2VudCcpIX1dYCk7XG4gIH1cblxuICByZXMuZW5kID0gZnVuY3Rpb24oY2h1bms/OiBhbnksIGVuY29kaW5nPzogc3RyaW5nIHwgKCgpID0+IHZvaWQpLCBjYj86ICgpID0+IHZvaWQpIHtcbiAgICBjb25zdCBhcmd2ID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKTtcbiAgICBjb25zdCBsYXN0QXJnID0gYXJndW1lbnRzW2FyZ3VtZW50cy5sZW5ndGggLSAxXTtcbiAgICBpZiAodHlwZW9mIGxhc3RBcmcgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgIGNvbnN0IG9yaWdpbkNiID0gYXJndW1lbnRzW2FyZ3VtZW50cy5sZW5ndGggLSAxXTtcbiAgICAgIGFyZ3ZbYXJndi5sZW5ndGggLSAxXSA9ICgpID0+IHtcbiAgICAgICAgb3JpZ2luQ2IoKTtcbiAgICAgICAgcHJpbnQoKTtcbiAgICAgIH07XG4gICAgfSBlbHNlIGlmIChhcmd2Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgYXJndi5wdXNoKG51bGwsIHByaW50KTtcbiAgICB9IGVsc2UgaWYgKGFyZ3YubGVuZ3RoID09PSAxKSB7XG4gICAgICBhcmd2LnB1c2gocHJpbnQpO1xuICAgIH1cbiAgICBjb25zdCByZXQgPSBlbmQuYXBwbHkocmVzLCBhcmd2KTtcbiAgICByZXR1cm4gcmV0O1xuICB9O1xuXG4gIG5leHQoKTtcbn1cblxuLyoqXG4gKiBUaGlzIGZ1bmN0aW9uIHVzZXMgaHR0cC1wcm94eS1taWRkbGV3YXJlIGludGVybmFsbHkuXG4gKiBcbiAqIEJlIGF3YXJlIHdpdGggY29tbWFuZCBsaW5lIG9wdGlvbiBcIi0tdmVyYm9zZVwiLCBvbmNlIGVuYWJsZSBcInZlcmJvc2VcIiwgdGhpcyBmdW5jdGlvbiB3aWxsXG4gKiByZWFkIChwaXBlKSByZW1vdGUgc2VydmVyIHJlc3BvbnNlIGJvZHkgaW50byBhIHN0cmluZyBidWZmZXIgZm9yIGFueSBtZXNzYWdlIHdpdGggY29udGVudC10eXBlIGlzIFwidGV4dFwiIG9yIFwianNvblwiIGJhc2VkXG4gKiBDcmVhdGUgYW5kIHVzZSBhbiBIVFRQIHJlcXVlc3QgcHJveHkgZm9yIHNwZWNpZmljIHJlcXVlc3QgcGF0aFxuICogQHBhcmFtIHByb3h5UGF0aCBcbiAqIEBwYXJhbSB0YXJnZXRVcmwgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXR1cEh0dHBQcm94eShwcm94eVBhdGg6IHN0cmluZywgdGFyZ2V0VXJsOiBzdHJpbmcsXG4gIG9wdHM6IHtcbiAgICAvKiogQnlwYXNzIENPUlMgcmVzdHJpY3Qgb24gdGFyZ2V0IHNlcnZlciwgZGVmYXVsdCBpcyB0cnVlICovXG4gICAgZGVsZXRlT3JpZ2luPzogYm9vbGVhbjtcbiAgICBwYXRoUmV3cml0ZT86IFByb3h5T3B0aW9uc1sncGF0aFJld3JpdGUnXTtcbiAgICBvblByb3h5UmVxPzogUHJveHlPcHRpb25zWydvblByb3h5UmVxJ107XG4gICAgb25Qcm94eVJlcz86IFByb3h5T3B0aW9uc1snb25Qcm94eVJlcyddO1xuICAgIG9uRXJyb3I/OiBQcm94eU9wdGlvbnNbJ29uRXJyb3InXTtcbiAgICBidWZmZXI/OiBQcm94eU9wdGlvbnNbJ2J1ZmZlciddO1xuICAgIHNlbGZIYW5kbGVSZXNwb25zZT86IFByb3h5T3B0aW9uc1snc2VsZkhhbmRsZVJlc3BvbnNlJ107XG4gICAgcHJveHlUaW1lb3V0PzogUHJveHlPcHRpb25zWydwcm94eVRpbWVvdXQnXTtcbiAgfSA9IHt9KSB7XG5cbiAgcHJveHlQYXRoID0gXy50cmltRW5kKHByb3h5UGF0aCwgJy8nKTtcbiAgdGFyZ2V0VXJsID0gXy50cmltRW5kKHRhcmdldFVybCwgJy8nKTtcblxuICBjb25zdCBkZWZhdWx0T3B0ID0gZGVmYXVsdFByb3h5T3B0aW9ucyhwcm94eVBhdGgsIHRhcmdldFVybCk7XG5cbiAgY29uc3QgcHJveHlNaWRPcHQ6IFByb3h5T3B0aW9ucyA9IHtcbiAgICAuLi5kZWZhdWx0T3B0LFxuICAgIG9uUHJveHlSZXEoLi4uYXJncykge1xuICAgICAgY29uc3Qgb3JpZ0hlYWRlciA9IGFyZ3NbMF0uZ2V0SGVhZGVyKCdPcmlnaW4nKTtcbiAgICAgIGRlZmF1bHRPcHQub25Qcm94eVJlcSguLi5hcmdzKTtcblxuICAgICAgaWYgKG9wdHMuZGVsZXRlT3JpZ2luID09PSBmYWxzZSkge1xuICAgICAgICAvLyBSZWNvdmVyIHJlbW92ZWQgaGVhZGVyIFwiT3JpZ2luXCJcbiAgICAgICAgYXJnc1swXS5zZXRIZWFkZXIoJ09yaWdpbicsIG9yaWdIZWFkZXIgYXMgc3RyaW5nKTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRzLm9uUHJveHlSZXEpXG4gICAgICAgIG9wdHMub25Qcm94eVJlcSguLi5hcmdzKTtcbiAgICB9LFxuICAgIG9uUHJveHlSZXMoLi4uYXJncykge1xuICAgICAgaWYgKG9wdHMub25Qcm94eVJlcylcbiAgICAgICAgb3B0cy5vblByb3h5UmVzKC4uLmFyZ3MpO1xuICAgICAgZGVmYXVsdE9wdC5vblByb3h5UmVzKC4uLmFyZ3MpO1xuICAgIH0sXG4gICAgb25FcnJvciguLi5hcmdzKSB7XG4gICAgICBkZWZhdWx0T3B0Lm9uRXJyb3IoLi4uYXJncyk7XG4gICAgICBpZiAob3B0cy5vbkVycm9yKVxuICAgICAgICBvcHRzLm9uRXJyb3IoLi4uYXJncyk7XG4gICAgfVxuICB9O1xuXG5cbiAgYXBpLmV4cHJlc3NBcHBTZXQoYXBwID0+IHtcbiAgICBhcHAudXNlKHByb3h5UGF0aCwgcHJveHkocHJveHlNaWRPcHQpKTtcbiAgfSk7XG59XG5cbi8qXG4gKiBUaGlzIGludGVyZmFjZSBpcyBub3QgZXhwb3NlZCBieSBodHRwLXByb3h5LW1pZGRsZXdhcmUsIGl0IGlzIHVzZWQgd2hlbiBvcHRpb24gXCJmb2xsb3dSZWRpcmVjdFwiXG4gKiBpcyBlbmFibGVkLCBtb3N0IGxpa2VseSB0aGlzIGlzIGJlaGF2aW9yIG9mIGh0dHAtcHJveHlcbiAqL1xuaW50ZXJmYWNlIFJlZGlyZWN0YWJsZVJlcXVlc3Qge1xuICBfY3VycmVudFJlcXVlc3Q6IENsaWVudFJlcXVlc3Q7XG59XG5cbmZ1bmN0aW9uIGlzUmVkaXJlY3RhYmxlUmVxdWVzdChyZXE6IHVua25vd24pOiByZXEgaXMgUmVkaXJlY3RhYmxlUmVxdWVzdCB7XG4gIHJldHVybiAocmVxIGFzIFJlZGlyZWN0YWJsZVJlcXVlc3QpLl9jdXJyZW50UmVxdWVzdCAhPT0gbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlZmF1bHRQcm94eU9wdGlvbnMocHJveHlQYXRoOiBzdHJpbmcsIHRhcmdldFVybDogc3RyaW5nKSB7XG4gIHByb3h5UGF0aCA9IF8udHJpbUVuZChwcm94eVBhdGgsICcvJyk7XG4gIHRhcmdldFVybCA9IF8udHJpbUVuZCh0YXJnZXRVcmwsICcvJyk7XG4gIGNvbnN0IHsgcHJvdG9jb2wsIGhvc3QsIHBhdGhuYW1lIH0gPSBuZXcgVVJMKHRhcmdldFVybCk7XG5cbiAgY29uc3QgcGF0UGF0aCA9IG5ldyBSZWdFeHAoJ14nICsgXy5lc2NhcGVSZWdFeHAocHJveHlQYXRoKSArICcoL3wkKScpO1xuICBjb25zdCBocG1Mb2cgPSBsb2dnZXIuZ2V0TG9nZ2VyKCdIUE0uJyArIHByb3h5UGF0aCk7XG5cbiAgY29uc3QgcHJveHlNaWRPcHQ6IFByb3h5T3B0aW9ucyAmICB7W0sgaW4gJ3BhdGhSZXdyaXRlJyB8ICdvblByb3h5UmVxJyB8ICdvblByb3h5UmVzJyB8ICdvbkVycm9yJ106IE5vbk51bGxhYmxlPFByb3h5T3B0aW9uc1tLXT59ID0ge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBtYXgtbGVuXG4gICAgdGFyZ2V0OiBwcm90b2NvbCArICcvLycgKyBob3N0LFxuICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICB3czogZmFsc2UsXG4gICAgc2VjdXJlOiBmYWxzZSxcbiAgICBjb29raWVEb21haW5SZXdyaXRlOiB7ICcqJzogJycgfSxcbiAgICBwYXRoUmV3cml0ZTogKHBhdGgsIHJlcSkgPT4ge1xuICAgICAgLy8gaHBtTG9nLndhcm4oJ3BhdFBhdGg9JywgcGF0UGF0aCwgJ3BhdGg9JywgcGF0aCk7XG4gICAgICBjb25zdCByZXQgPSBwYXRoICYmIHBhdGgucmVwbGFjZShwYXRQYXRoLCBfLnRyaW1FbmQocGF0aG5hbWUsICcvJykgKyAnLycpO1xuICAgICAgLy8gaHBtTG9nLmluZm8oYHByb3h5IHRvIHBhdGg6ICR7cmVxLm1ldGhvZH0gJHtwcm90b2NvbCArICcvLycgKyBob3N0fSR7cmV0fSwgcmVxLnVybCA9ICR7cmVxLnVybH1gKTtcbiAgICAgIHJldHVybiByZXQ7XG4gICAgfSxcbiAgICBsb2dMZXZlbDogJ2RlYnVnJyxcbiAgICBsb2dQcm92aWRlcjogcHJvdmlkZXIgPT4gaHBtTG9nLFxuICAgIHByb3h5VGltZW91dDogMTAwMDAsXG4gICAgb25Qcm94eVJlcShwcm94eVJlcSwgcmVxLCByZXMsIC4uLnJlc3QpIHtcbiAgICAgIC8vIFRoaXMgcHJveHlSZXEgY291bGQgYmUgXCJSZWRpcmVjdFJlcXVlc3RcIiBpZiBvcHRpb24gXCJmb2xsb3dSZWRpcmVjdFwiIGlzIG9uXG4gICAgICBpZiAoaXNSZWRpcmVjdGFibGVSZXF1ZXN0KHByb3h5UmVxKSkge1xuICAgICAgICBocG1Mb2cuaW5mbyhgUHJveHkgcmVxdWVzdCB0byAke3Byb3RvY29sfS8vJHtob3N0fSR7cHJveHlSZXEuX2N1cnJlbnRSZXF1ZXN0LnBhdGh9IG1ldGhvZDogJHtyZXEubWV0aG9kIHx8ICd1a25vd24nfSwgJHtKU09OLnN0cmluZ2lmeShcbiAgICAgICAgICBwcm94eVJlcS5fY3VycmVudFJlcXVlc3QuZ2V0SGVhZGVycygpLCBudWxsLCAnICAnKX1gKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHByb3h5UmVxLnJlbW92ZUhlYWRlcignT3JpZ2luJyk7IC8vIEJ5cGFzcyBDT1JTIHJlc3RyaWN0IG9uIHRhcmdldCBzZXJ2ZXJcbiAgICAgICAgY29uc3QgcmVmZXJlciA9IHByb3h5UmVxLmdldEhlYWRlcigncmVmZXJlcicpO1xuICAgICAgICBpZiAodHlwZW9mIHJlZmVyZXIgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgcHJveHlSZXEuc2V0SGVhZGVyKCdyZWZlcmVyJywgYCR7cHJvdG9jb2x9Ly8ke2hvc3R9JHtuZXcgVVJMKHJlZmVyZXIpLnBhdGhuYW1lfWApO1xuICAgICAgICB9XG4gICAgICAgIGhwbUxvZy5pbmZvKGBQcm94eSByZXF1ZXN0IHRvICR7cHJvdG9jb2x9Ly8ke2hvc3R9JHtwcm94eVJlcS5wYXRofSBtZXRob2Q6ICR7cmVxLm1ldGhvZCB8fCAndWtub3duJ30sICR7SlNPTi5zdHJpbmdpZnkoXG4gICAgICAgICAgcHJveHlSZXEuZ2V0SGVhZGVycygpLCBudWxsLCAnICAnKX1gKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIG9uUHJveHlSZXMoaW5jb21pbmcsIHJlcSwgcmVzKSB7XG4gICAgICBpbmNvbWluZy5oZWFkZXJzWydBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nXSA9ICcqJztcbiAgICAgIGlmIChhcGkuY29uZmlnKCkuZGV2TW9kZSkge1xuICAgICAgICBocG1Mb2cuaW5mbyhgUHJveHkgcmVjaWV2ZSAke3JlcS51cmwgfHwgJyd9LCBzdGF0dXM6ICR7aW5jb21pbmcuc3RhdHVzQ29kZSF9XFxuYCxcbiAgICAgICAgICBKU09OLnN0cmluZ2lmeShpbmNvbWluZy5oZWFkZXJzLCBudWxsLCAnICAnKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBocG1Mb2cuaW5mbyhgUHJveHkgcmVjaWV2ZSAke3JlcS51cmwgfHwgJyd9LCBzdGF0dXM6ICR7aW5jb21pbmcuc3RhdHVzQ29kZSF9YCk7XG4gICAgICB9XG4gICAgICBpZiAoYXBpLmNvbmZpZygpLmRldk1vZGUpIHtcblxuICAgICAgICBjb25zdCBjdCA9IGluY29taW5nLmhlYWRlcnNbJ2NvbnRlbnQtdHlwZSddO1xuICAgICAgICBocG1Mb2cuaW5mbyhgUmVzcG9uc2UgJHtyZXEudXJsIHx8ICcnfSBoZWFkZXJzOlxcbmAsIGluY29taW5nLmhlYWRlcnMpO1xuICAgICAgICBjb25zdCBpc1RleHQgPSAoY3QgJiYgL1xcYihqc29ufHRleHQpXFxiL2kudGVzdChjdCkpO1xuICAgICAgICBpZiAoaXNUZXh0KSB7XG4gICAgICAgICAgaWYgKCFpbmNvbWluZy5jb21wbGV0ZSkge1xuICAgICAgICAgICAgY29uc3QgYnVmcyA9IFtdIGFzIHN0cmluZ1tdO1xuICAgICAgICAgICAgdm9pZCByZWFkQ29tcHJlc3NlZFJlc3BvbnNlKGluY29taW5nLCBuZXcgc3RyZWFtLldyaXRhYmxlKHtcbiAgICAgICAgICAgICAgd3JpdGUoY2h1bms6IEJ1ZmZlciB8IHN0cmluZywgZW5jLCBjYikge1xuICAgICAgICAgICAgICAgIGJ1ZnMucHVzaChCdWZmZXIuaXNCdWZmZXIoY2h1bmspID8gY2h1bmsudG9TdHJpbmcoKSA6IGNodW5rKTtcbiAgICAgICAgICAgICAgICBjYigpO1xuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBmaW5hbChjYikge1xuICAgICAgICAgICAgICAgIGhwbUxvZy5pbmZvKGBSZXNwb25zZSAke3JlcS51cmwgfHwgJyd9IHRleHQgYm9keTpcXG5gLCBidWZzLmpvaW4oJycpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoKGluY29taW5nIGFzIHtib2R5PzogQnVmZmVyIHwgc3RyaW5nfSkuYm9keSkge1xuICAgICAgICAgICAgaHBtTG9nLmluZm8oYFJlc3BvbnNlICR7cmVxLnVybCB8fCAnJ30gdGV4dCBib2R5OlxcbmAsIChpbmNvbWluZyBhcyB7Ym9keT86IEJ1ZmZlciB8IHN0cmluZ30pLnRvU3RyaW5nKCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgb25FcnJvcihlcnIsIHJlcSwgcmVzKSB7XG4gICAgICBocG1Mb2cud2FybihlcnIpO1xuICAgIH1cbiAgfTtcbiAgcmV0dXJuIHByb3h5TWlkT3B0O1xufVxuIl19