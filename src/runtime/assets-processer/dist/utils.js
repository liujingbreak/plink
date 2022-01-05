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
exports.createReplayReadableFactory = exports.defaultProxyOptions = exports.setupHttpProxy = exports.createResponseTimestamp = void 0;
const stream_1 = __importDefault(require("stream"));
const __plink_1 = __importDefault(require("__plink"));
const lodash_1 = __importDefault(require("lodash"));
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
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
    const hpmLog = plink_1.logger.getLogger('HPM.' + targetUrl);
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
const log = plink_1.logger.getLogger(__plink_1.default.packageName + '.createReplayReadableFactory');
function createReplayReadableFactory(readable, transforms, debugInfo) {
    const buf$ = new rx.ReplaySubject();
    let cacheBufLen = 0;
    const cacheWriter = new stream_1.default.Writable({
        write(chunk, _enc, cb) {
            cacheBufLen += chunk.length;
            // log.warn('cache updated:', cacheBufLen);
            buf$.next(chunk);
            cb();
        },
        final(cb) {
            buf$.complete();
            if (cacheBufLen === 0) {
                log.warn((debugInfo || '') + ', cache completed length is 0');
            }
            cb();
        }
    });
    let caching = false;
    // let readerCount = 0;
    return () => {
        // readerCount++;
        // let bufferLengthSum = 0;
        // const readerId = readerCount;
        const readCall$ = new rx.Subject();
        const readableStream = new stream_1.default.Readable({
            read(_size) {
                readCall$.next(this);
                if (!caching) {
                    caching = true;
                    const streams = [readable,
                        ...(transforms || []), cacheWriter];
                    // To workaround NodeJS 16 bug
                    streams.reduce((prev, curr) => prev
                        .pipe(curr))
                        .on('error', err => log.error(err));
                }
            }
        });
        rx.zip(readCall$, buf$)
            .pipe(op.map(([readable, buf], idx) => {
            readable.push(buf);
            // bufferLengthSum += buf.length;
            // log.debug(`reader: ${readerId}, reads (${idx}) ${bufferLengthSum}`);
        }), op.finalize(() => {
            readableStream.push(null);
        })).subscribe();
        return readableStream;
    };
}
exports.createReplayReadableFactory = createReplayReadableFactory;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0RBQTRCO0FBRzVCLHNEQUEwQjtBQUMxQixvREFBdUI7QUFDdkIseUNBQTJCO0FBQzNCLG1EQUFxQztBQUNyQyx1REFBbUU7QUFDbkUsc0NBQWtDO0FBRWxDLHFDQUFxQztBQUNyQyxpRUFBK0Y7QUFFL0YsMkNBQTJDO0FBQzNDLE1BQU0sT0FBTyxHQUFHLGNBQU0sQ0FBQyxTQUFTLENBQUMsaUJBQUcsQ0FBQyxXQUFXLEdBQUcsWUFBWSxDQUFDLENBQUM7QUFDakU7Ozs7O0dBS0c7QUFDSCxTQUFnQix1QkFBdUIsQ0FBQyxHQUFZLEVBQUUsR0FBYSxFQUFFLElBQWtCO0lBQ3JGLE1BQU0sSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7SUFDeEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBRWpDLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUM7SUFFcEIsU0FBUyxLQUFLO1FBQ1osTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNqQyxPQUFPLENBQUMsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLE1BQU0sSUFBSSxHQUFHLENBQUMsV0FBVyxjQUFjLEdBQUcsQ0FBQyxVQUFVLHlCQUF5QixHQUFHLEdBQUcsU0FBUyxJQUFJO1lBQzVILFlBQVksSUFBSSxDQUFDLGtCQUFrQixFQUFFLElBQUksU0FBUyxNQUFNLEdBQUcsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzFGLENBQUM7SUFFRCxHQUFHLENBQUMsR0FBRyxHQUFHLFVBQVMsS0FBVyxFQUFFLFFBQWdDLEVBQUUsRUFBZTtRQUMvRSxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFD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U0FDRixDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUM7YUFDcEIsSUFBSSxDQUNILEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUM5QixRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ25CLGlDQUFpQztZQUNqQyx1RUFBdUU7UUFDekUsQ0FBQyxDQUFDLEVBQ0YsRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7WUFDZixjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzVCLENBQUMsQ0FBQyxDQUNILENBQUMsU0FBUyxFQUFFLENBQUM7UUFFaEIsT0FBTyxjQUFjLENBQUM7SUFDeEIsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQTVERCxrRUE0REMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgc3RyZWFtIGZyb20gJ3N0cmVhbSc7XG5pbXBvcnQge0NsaWVudFJlcXVlc3R9IGZyb20gJ2h0dHAnO1xuaW1wb3J0IHtSZXF1ZXN0LCBSZXNwb25zZSwgTmV4dEZ1bmN0aW9ufSBmcm9tICdleHByZXNzJztcbmltcG9ydCBhcGkgZnJvbSAnX19wbGluayc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge3JlYWRDb21wcmVzc2VkUmVzcG9uc2V9IGZyb20gJ0B3ZmgvaHR0cC1zZXJ2ZXIvZGlzdC91dGlscyc7XG5pbXBvcnQge2xvZ2dlcn0gZnJvbSAnQHdmaC9wbGluayc7XG5cbi8vIGltcG9ydCBpbnNwZWN0b3IgZnJvbSAnaW5zcGVjdG9yJztcbmltcG9ydCB7IGNyZWF0ZVByb3h5TWlkZGxld2FyZSBhcyBwcm94eSwgT3B0aW9ucyBhcyBQcm94eU9wdGlvbnN9IGZyb20gJ2h0dHAtcHJveHktbWlkZGxld2FyZSc7XG5cbi8vIGluc3BlY3Rvci5vcGVuKDkyMjIsICdsb2NhbGhvc3QnLCB0cnVlKTtcbmNvbnN0IGxvZ1RpbWUgPSBsb2dnZXIuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcudGltZXN0YW1wJyk7XG4vKipcbiAqIE1pZGRsZXdhcmUgZm9yIHByaW50aW5nIGVhY2ggcmVzcG9uc2UgcHJvY2VzcyBkdXJhdGlvbiB0aW1lIHRvIGxvZ1xuICogQHBhcmFtIHJlcSBcbiAqIEBwYXJhbSByZXMgXG4gKiBAcGFyYW0gbmV4dCBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVJlc3BvbnNlVGltZXN0YW1wKHJlcTogUmVxdWVzdCwgcmVzOiBSZXNwb25zZSwgbmV4dDogTmV4dEZ1bmN0aW9uKSB7XG4gIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSgpO1xuICBjb25zdCBzdGFydFRpbWUgPSBkYXRlLmdldFRpbWUoKTtcblxuICBjb25zdCBlbmQgPSByZXMuZW5kO1xuXG4gIGZ1bmN0aW9uIHByaW50KCkge1xuICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgIGxvZ1RpbWUuaW5mbyhgcmVxdWVzdDogJHtyZXEubWV0aG9kfSAke3JlcS5vcmlnaW5hbFVybH0gfCBzdGF0dXM6ICR7cmVzLnN0YXR1c0NvZGV9LCBbcmVzcG9uc2UgZHVyYXRpb246ICR7bm93IC0gc3RhcnRUaW1lfW1zYCArXG4gICAgICBgXSAoc2luY2UgJHtkYXRlLnRvTG9jYWxlVGltZVN0cmluZygpfSAke3N0YXJ0VGltZX0pIFske3JlcS5oZWFkZXIoJ3VzZXItYWdlbnQnKSF9XWApO1xuICB9XG5cbiAgcmVzLmVuZCA9IGZ1bmN0aW9uKGNodW5rPzogYW55LCBlbmNvZGluZz86IHN0cmluZyB8ICgoKSA9PiB2b2lkKSwgY2I/OiAoKSA9PiB2b2lkKSB7XG4gICAgY29uc3QgYXJndiA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gICAgY29uc3QgbGFzdEFyZyA9IGFyZ3VtZW50c1thcmd1bWVudHMubGVuZ3RoIC0gMV07XG4gICAgaWYgKHR5cGVvZiBsYXN0QXJnID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjb25zdCBvcmlnaW5DYiA9IGFyZ3VtZW50c1thcmd1bWVudHMubGVuZ3RoIC0gMV07XG4gICAgICBhcmd2W2FyZ3YubGVuZ3RoIC0gMV0gPSAoKSA9PiB7XG4gICAgICAgIG9yaWdpbkNiKCk7XG4gICAgICAgIHByaW50KCk7XG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAoYXJndi5sZW5ndGggPT09IDApIHtcbiAgICAgIGFyZ3YucHVzaChudWxsLCBwcmludCk7XG4gICAgfSBlbHNlIGlmIChhcmd2Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgYXJndi5wdXNoKHByaW50KTtcbiAgICB9XG4gICAgY29uc3QgcmV0ID0gZW5kLmFwcGx5KHJlcywgYXJndik7XG4gICAgcmV0dXJuIHJldDtcbiAgfTtcblxuICBuZXh0KCk7XG59XG5cbi8qKlxuICogVGhpcyBmdW5jdGlvbiB1c2VzIGh0dHAtcHJveHktbWlkZGxld2FyZSBpbnRlcm5hbGx5LlxuICogXG4gKiBCZSBhd2FyZSB3aXRoIGNvbW1hbmQgbGluZSBvcHRpb24gXCItLXZlcmJvc2VcIiwgb25jZSBlbmFibGUgXCJ2ZXJib3NlXCIsIHRoaXMgZnVuY3Rpb24gd2lsbFxuICogcmVhZCAocGlwZSkgcmVtb3RlIHNlcnZlciByZXNwb25zZSBib2R5IGludG8gYSBzdHJpbmcgYnVmZmVyIGZvciBhbnkgbWVzc2FnZSB3aXRoIGNvbnRlbnQtdHlwZSBpcyBcInRleHRcIiBvciBcImpzb25cIiBiYXNlZFxuICogQ3JlYXRlIGFuZCB1c2UgYW4gSFRUUCByZXF1ZXN0IHByb3h5IGZvciBzcGVjaWZpYyByZXF1ZXN0IHBhdGhcbiAqIEBwYXJhbSBwcm94eVBhdGggXG4gKiBAcGFyYW0gdGFyZ2V0VXJsIFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBIdHRwUHJveHkocHJveHlQYXRoOiBzdHJpbmcsIHRhcmdldFVybDogc3RyaW5nLFxuICBvcHRzOiB7XG4gICAgLyoqIEJ5cGFzcyBDT1JTIHJlc3RyaWN0IG9uIHRhcmdldCBzZXJ2ZXIsIGRlZmF1bHQgaXMgdHJ1ZSAqL1xuICAgIGRlbGV0ZU9yaWdpbj86IGJvb2xlYW47XG4gICAgcGF0aFJld3JpdGU/OiBQcm94eU9wdGlvbnNbJ3BhdGhSZXdyaXRlJ107XG4gICAgb25Qcm94eVJlcT86IFByb3h5T3B0aW9uc1snb25Qcm94eVJlcSddO1xuICAgIG9uUHJveHlSZXM/OiBQcm94eU9wdGlvbnNbJ29uUHJveHlSZXMnXTtcbiAgICBvbkVycm9yPzogUHJveHlPcHRpb25zWydvbkVycm9yJ107XG4gICAgYnVmZmVyPzogUHJveHlPcHRpb25zWydidWZmZXInXTtcbiAgICBzZWxmSGFuZGxlUmVzcG9uc2U/OiBQcm94eU9wdGlvbnNbJ3NlbGZIYW5kbGVSZXNwb25zZSddO1xuICAgIHByb3h5VGltZW91dD86IFByb3h5T3B0aW9uc1sncHJveHlUaW1lb3V0J107XG4gIH0gPSB7fSkge1xuXG4gIHByb3h5UGF0aCA9IF8udHJpbUVuZChwcm94eVBhdGgsICcvJyk7XG4gIHRhcmdldFVybCA9IF8udHJpbUVuZCh0YXJnZXRVcmwsICcvJyk7XG5cbiAgY29uc3QgZGVmYXVsdE9wdCA9IGRlZmF1bHRQcm94eU9wdGlvbnMocHJveHlQYXRoLCB0YXJnZXRVcmwpO1xuXG4gIGNvbnN0IHByb3h5TWlkT3B0OiBQcm94eU9wdGlvbnMgPSB7XG4gICAgLi4uZGVmYXVsdE9wdCxcbiAgICBvblByb3h5UmVxKC4uLmFyZ3MpIHtcbiAgICAgIGNvbnN0IG9yaWdIZWFkZXIgPSBhcmdzWzBdLmdldEhlYWRlcignT3JpZ2luJyk7XG4gICAgICBkZWZhdWx0T3B0Lm9uUHJveHlSZXEoLi4uYXJncyk7XG5cbiAgICAgIGlmIChvcHRzLmRlbGV0ZU9yaWdpbiA9PT0gZmFsc2UpIHtcbiAgICAgICAgLy8gUmVjb3ZlciByZW1vdmVkIGhlYWRlciBcIk9yaWdpblwiXG4gICAgICAgIGFyZ3NbMF0uc2V0SGVhZGVyKCdPcmlnaW4nLCBvcmlnSGVhZGVyIGFzIHN0cmluZyk7XG4gICAgICB9XG4gICAgICBpZiAob3B0cy5vblByb3h5UmVxKVxuICAgICAgICBvcHRzLm9uUHJveHlSZXEoLi4uYXJncyk7XG4gICAgfSxcbiAgICBvblByb3h5UmVzKC4uLmFyZ3MpIHtcbiAgICAgIGlmIChvcHRzLm9uUHJveHlSZXMpXG4gICAgICAgIG9wdHMub25Qcm94eVJlcyguLi5hcmdzKTtcbiAgICAgIGRlZmF1bHRPcHQub25Qcm94eVJlcyguLi5hcmdzKTtcbiAgICB9LFxuICAgIG9uRXJyb3IoLi4uYXJncykge1xuICAgICAgZGVmYXVsdE9wdC5vbkVycm9yKC4uLmFyZ3MpO1xuICAgICAgaWYgKG9wdHMub25FcnJvcilcbiAgICAgICAgb3B0cy5vbkVycm9yKC4uLmFyZ3MpO1xuICAgIH1cbiAgfTtcblxuXG4gIGFwaS5leHByZXNzQXBwU2V0KGFwcCA9PiB7XG4gICAgYXBwLnVzZShwcm94eVBhdGgsIHByb3h5KHByb3h5TWlkT3B0KSk7XG4gIH0pO1xufVxuXG4vKlxuICogVGhpcyBpbnRlcmZhY2UgaXMgbm90IGV4cG9zZWQgYnkgaHR0cC1wcm94eS1taWRkbGV3YXJlLCBpdCBpcyB1c2VkIHdoZW4gb3B0aW9uIFwiZm9sbG93UmVkaXJlY3RcIlxuICogaXMgZW5hYmxlZCwgbW9zdCBsaWtlbHkgdGhpcyBpcyBiZWhhdmlvciBvZiBodHRwLXByb3h5XG4gKi9cbmludGVyZmFjZSBSZWRpcmVjdGFibGVSZXF1ZXN0IHtcbiAgX2N1cnJlbnRSZXF1ZXN0OiBDbGllbnRSZXF1ZXN0O1xufVxuXG5mdW5jdGlvbiBpc1JlZGlyZWN0YWJsZVJlcXVlc3QocmVxOiB1bmtub3duKTogcmVxIGlzIFJlZGlyZWN0YWJsZVJlcXVlc3Qge1xuICByZXR1cm4gKHJlcSBhcyBSZWRpcmVjdGFibGVSZXF1ZXN0KS5fY3VycmVudFJlcXVlc3QgIT09IG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0UHJveHlPcHRpb25zKHByb3h5UGF0aDogc3RyaW5nLCB0YXJnZXRVcmw6IHN0cmluZykge1xuICBwcm94eVBhdGggPSBfLnRyaW1FbmQocHJveHlQYXRoLCAnLycpO1xuICB0YXJnZXRVcmwgPSBfLnRyaW1FbmQodGFyZ2V0VXJsLCAnLycpO1xuICBjb25zdCB7IHByb3RvY29sLCBob3N0LCBwYXRobmFtZSB9ID0gbmV3IFVSTCh0YXJnZXRVcmwpO1xuXG4gIGNvbnN0IHBhdFBhdGggPSBuZXcgUmVnRXhwKCdeJyArIF8uZXNjYXBlUmVnRXhwKHByb3h5UGF0aCkgKyAnKC98JCknKTtcbiAgY29uc3QgaHBtTG9nID0gbG9nZ2VyLmdldExvZ2dlcignSFBNLicgKyB0YXJnZXRVcmwpO1xuXG4gIGNvbnN0IHByb3h5TWlkT3B0OiBQcm94eU9wdGlvbnMgJiAge1tLIGluICdwYXRoUmV3cml0ZScgfCAnb25Qcm94eVJlcScgfCAnb25Qcm94eVJlcycgfCAnb25FcnJvciddOiBOb25OdWxsYWJsZTxQcm94eU9wdGlvbnNbS10+fSA9IHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbWF4LWxlblxuICAgIHRhcmdldDogcHJvdG9jb2wgKyAnLy8nICsgaG9zdCxcbiAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgd3M6IGZhbHNlLFxuICAgIHNlY3VyZTogZmFsc2UsXG4gICAgY29va2llRG9tYWluUmV3cml0ZTogeyAnKic6ICcnIH0sXG4gICAgcGF0aFJld3JpdGU6IChwYXRoLCByZXEpID0+IHtcbiAgICAgIC8vIGhwbUxvZy53YXJuKCdwYXRQYXRoPScsIHBhdFBhdGgsICdwYXRoPScsIHBhdGgpO1xuICAgICAgY29uc3QgcmV0ID0gcGF0aCAmJiBwYXRoLnJlcGxhY2UocGF0UGF0aCwgXy50cmltRW5kKHBhdGhuYW1lLCAnLycpICsgJy8nKTtcbiAgICAgIC8vIGhwbUxvZy5pbmZvKGBwcm94eSB0byBwYXRoOiAke3JlcS5tZXRob2R9ICR7cHJvdG9jb2wgKyAnLy8nICsgaG9zdH0ke3JldH0sIHJlcS51cmwgPSAke3JlcS51cmx9YCk7XG4gICAgICByZXR1cm4gcmV0O1xuICAgIH0sXG4gICAgbG9nTGV2ZWw6ICdkZWJ1ZycsXG4gICAgbG9nUHJvdmlkZXI6IHByb3ZpZGVyID0+IGhwbUxvZyxcbiAgICBwcm94eVRpbWVvdXQ6IDEwMDAwLFxuICAgIG9uUHJveHlSZXEocHJveHlSZXEsIHJlcSwgcmVzLCAuLi5yZXN0KSB7XG4gICAgICAvLyBUaGlzIHByb3h5UmVxIGNvdWxkIGJlIFwiUmVkaXJlY3RSZXF1ZXN0XCIgaWYgb3B0aW9uIFwiZm9sbG93UmVkaXJlY3RcIiBpcyBvblxuICAgICAgaWYgKGlzUmVkaXJlY3RhYmxlUmVxdWVzdChwcm94eVJlcSkpIHtcbiAgICAgICAgaHBtTG9nLmluZm8oYFByb3h5IHJlcXVlc3QgdG8gJHtwcm90b2NvbH0vLyR7aG9zdH0ke3Byb3h5UmVxLl9jdXJyZW50UmVxdWVzdC5wYXRofSBtZXRob2Q6ICR7cmVxLm1ldGhvZCB8fCAndWtub3duJ30sICR7SlNPTi5zdHJpbmdpZnkoXG4gICAgICAgICAgcHJveHlSZXEuX2N1cnJlbnRSZXF1ZXN0LmdldEhlYWRlcnMoKSwgbnVsbCwgJyAgJyl9YCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwcm94eVJlcS5yZW1vdmVIZWFkZXIoJ09yaWdpbicpOyAvLyBCeXBhc3MgQ09SUyByZXN0cmljdCBvbiB0YXJnZXQgc2VydmVyXG4gICAgICAgIGNvbnN0IHJlZmVyZXIgPSBwcm94eVJlcS5nZXRIZWFkZXIoJ3JlZmVyZXInKTtcbiAgICAgICAgaWYgKHR5cGVvZiByZWZlcmVyID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIHByb3h5UmVxLnNldEhlYWRlcigncmVmZXJlcicsIGAke3Byb3RvY29sfS8vJHtob3N0fSR7bmV3IFVSTChyZWZlcmVyKS5wYXRobmFtZX1gKTtcbiAgICAgICAgfVxuICAgICAgICBocG1Mb2cuaW5mbyhgUHJveHkgcmVxdWVzdCB0byAke3Byb3RvY29sfS8vJHtob3N0fSR7cHJveHlSZXEucGF0aH0gbWV0aG9kOiAke3JlcS5tZXRob2QgfHwgJ3Vrbm93bid9LCAke0pTT04uc3RyaW5naWZ5KFxuICAgICAgICAgIHByb3h5UmVxLmdldEhlYWRlcnMoKSwgbnVsbCwgJyAgJyl9YCk7XG4gICAgICB9XG4gICAgfSxcbiAgICBvblByb3h5UmVzKGluY29taW5nLCByZXEsIHJlcykge1xuICAgICAgaW5jb21pbmcuaGVhZGVyc1snQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJ10gPSAnKic7XG4gICAgICBpZiAoYXBpLmNvbmZpZygpLmRldk1vZGUpIHtcbiAgICAgICAgaHBtTG9nLmluZm8oYFByb3h5IHJlY2lldmUgJHtyZXEudXJsIHx8ICcnfSwgc3RhdHVzOiAke2luY29taW5nLnN0YXR1c0NvZGUhfVxcbmAsXG4gICAgICAgICAgSlNPTi5zdHJpbmdpZnkoaW5jb21pbmcuaGVhZGVycywgbnVsbCwgJyAgJykpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaHBtTG9nLmluZm8oYFByb3h5IHJlY2lldmUgJHtyZXEudXJsIHx8ICcnfSwgc3RhdHVzOiAke2luY29taW5nLnN0YXR1c0NvZGUhfWApO1xuICAgICAgfVxuICAgICAgaWYgKGFwaS5jb25maWcoKS5kZXZNb2RlKSB7XG5cbiAgICAgICAgY29uc3QgY3QgPSBpbmNvbWluZy5oZWFkZXJzWydjb250ZW50LXR5cGUnXTtcbiAgICAgICAgaHBtTG9nLmluZm8oYFJlc3BvbnNlICR7cmVxLnVybCB8fCAnJ30gaGVhZGVyczpcXG5gLCBpbmNvbWluZy5oZWFkZXJzKTtcbiAgICAgICAgY29uc3QgaXNUZXh0ID0gKGN0ICYmIC9cXGIoanNvbnx0ZXh0KVxcYi9pLnRlc3QoY3QpKTtcbiAgICAgICAgaWYgKGlzVGV4dCkge1xuICAgICAgICAgIGlmICghaW5jb21pbmcuY29tcGxldGUpIHtcbiAgICAgICAgICAgIGNvbnN0IGJ1ZnMgPSBbXSBhcyBzdHJpbmdbXTtcbiAgICAgICAgICAgIHZvaWQgcmVhZENvbXByZXNzZWRSZXNwb25zZShpbmNvbWluZywgbmV3IHN0cmVhbS5Xcml0YWJsZSh7XG4gICAgICAgICAgICAgIHdyaXRlKGNodW5rOiBCdWZmZXIgfCBzdHJpbmcsIGVuYywgY2IpIHtcbiAgICAgICAgICAgICAgICBidWZzLnB1c2goQnVmZmVyLmlzQnVmZmVyKGNodW5rKSA/IGNodW5rLnRvU3RyaW5nKCkgOiBjaHVuayk7XG4gICAgICAgICAgICAgICAgY2IoKTtcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgZmluYWwoY2IpIHtcbiAgICAgICAgICAgICAgICBocG1Mb2cuaW5mbyhgUmVzcG9uc2UgJHtyZXEudXJsIHx8ICcnfSB0ZXh0IGJvZHk6XFxuYCwgYnVmcy5qb2luKCcnKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKChpbmNvbWluZyBhcyB7Ym9keT86IEJ1ZmZlciB8IHN0cmluZ30pLmJvZHkpIHtcbiAgICAgICAgICAgIGhwbUxvZy5pbmZvKGBSZXNwb25zZSAke3JlcS51cmwgfHwgJyd9IHRleHQgYm9keTpcXG5gLCAoaW5jb21pbmcgYXMge2JvZHk/OiBCdWZmZXIgfCBzdHJpbmd9KS50b1N0cmluZygpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIG9uRXJyb3IoZXJyLCByZXEsIHJlcykge1xuICAgICAgaHBtTG9nLndhcm4oZXJyKTtcbiAgICB9XG4gIH07XG4gIHJldHVybiBwcm94eU1pZE9wdDtcbn1cblxuY29uc3QgbG9nID0gbG9nZ2VyLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLmNyZWF0ZVJlcGxheVJlYWRhYmxlRmFjdG9yeScpO1xuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUmVwbGF5UmVhZGFibGVGYWN0b3J5KFxuICByZWFkYWJsZTogTm9kZUpTLlJlYWRhYmxlU3RyZWFtLCB0cmFuc2Zvcm1zPzogTm9kZUpTLlJlYWRXcml0ZVN0cmVhbVtdLFxuICBkZWJ1Z0luZm8/OiBzdHJpbmdcbikge1xuICBjb25zdCBidWYkID0gbmV3IHJ4LlJlcGxheVN1YmplY3Q8QnVmZmVyPigpO1xuICBsZXQgY2FjaGVCdWZMZW4gPSAwO1xuICBjb25zdCBjYWNoZVdyaXRlciA9IG5ldyBzdHJlYW0uV3JpdGFibGUoe1xuICAgIHdyaXRlKGNodW5rOiBCdWZmZXIsIF9lbmMsIGNiKSB7XG4gICAgICBjYWNoZUJ1ZkxlbiArPSBjaHVuay5sZW5ndGg7XG4gICAgICAvLyBsb2cud2FybignY2FjaGUgdXBkYXRlZDonLCBjYWNoZUJ1Zkxlbik7XG4gICAgICBidWYkLm5leHQoY2h1bmspO1xuICAgICAgY2IoKTtcbiAgICB9LFxuICAgIGZpbmFsKGNiKSB7XG4gICAgICBidWYkLmNvbXBsZXRlKCk7XG4gICAgICBpZiAoY2FjaGVCdWZMZW4gPT09IDApIHtcbiAgICAgICAgbG9nLndhcm4oKGRlYnVnSW5mbyB8fCAnJykgKyAnLCBjYWNoZSBjb21wbGV0ZWQgbGVuZ3RoIGlzIDAnKTtcbiAgICAgIH1cbiAgICAgIGNiKCk7XG4gICAgfVxuICB9KTtcblxuICBsZXQgY2FjaGluZyA9IGZhbHNlO1xuICAvLyBsZXQgcmVhZGVyQ291bnQgPSAwO1xuXG4gIHJldHVybiAoKSA9PiB7XG4gICAgLy8gcmVhZGVyQ291bnQrKztcbiAgICAvLyBsZXQgYnVmZmVyTGVuZ3RoU3VtID0gMDtcbiAgICAvLyBjb25zdCByZWFkZXJJZCA9IHJlYWRlckNvdW50O1xuICAgIGNvbnN0IHJlYWRDYWxsJCA9IG5ldyByeC5TdWJqZWN0PHN0cmVhbS5SZWFkYWJsZT4oKTtcbiAgICBjb25zdCByZWFkYWJsZVN0cmVhbSA9IG5ldyBzdHJlYW0uUmVhZGFibGUoe1xuICAgICAgcmVhZChfc2l6ZSkge1xuICAgICAgICByZWFkQ2FsbCQubmV4dCh0aGlzKTtcbiAgICAgICAgaWYgKCFjYWNoaW5nKSB7XG4gICAgICAgICAgY2FjaGluZyA9IHRydWU7XG4gICAgICAgICAgY29uc3Qgc3RyZWFtcyA9IFtyZWFkYWJsZSxcbiAgICAgICAgICAgIC4uLih0cmFuc2Zvcm1zIHx8IFtdKSwgY2FjaGVXcml0ZXJdIGFzIEFycmF5PE5vZGVKUy5SZWFkYWJsZVN0cmVhbSB8IE5vZGVKUy5Xcml0YWJsZVN0cmVhbSB8IE5vZGVKUy5SZWFkV3JpdGVTdHJlYW0+O1xuICAgICAgICAgIC8vIFRvIHdvcmthcm91bmQgTm9kZUpTIDE2IGJ1Z1xuICAgICAgICAgIHN0cmVhbXMucmVkdWNlKFxuICAgICAgICAgICAgKHByZXYsIGN1cnIpID0+IChwcmV2IGFzIE5vZGVKUy5SZWFkYWJsZVN0cmVhbSlcbiAgICAgICAgICAgIC5waXBlKGN1cnIgYXMgTm9kZUpTLlJlYWRXcml0ZVN0cmVhbSkpXG4gICAgICAgICAgICAub24oJ2Vycm9yJywgZXJyID0+IGxvZy5lcnJvcihlcnIpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcnguemlwKHJlYWRDYWxsJCwgYnVmJClcbiAgICAgIC5waXBlKFxuICAgICAgICBvcC5tYXAoKFtyZWFkYWJsZSwgYnVmXSwgaWR4KSA9PiB7XG4gICAgICAgICAgcmVhZGFibGUucHVzaChidWYpO1xuICAgICAgICAgIC8vIGJ1ZmZlckxlbmd0aFN1bSArPSBidWYubGVuZ3RoO1xuICAgICAgICAgIC8vIGxvZy5kZWJ1ZyhgcmVhZGVyOiAke3JlYWRlcklkfSwgcmVhZHMgKCR7aWR4fSkgJHtidWZmZXJMZW5ndGhTdW19YCk7XG4gICAgICAgIH0pLFxuICAgICAgICBvcC5maW5hbGl6ZSgoKSA9PiB7XG4gICAgICAgICAgcmVhZGFibGVTdHJlYW0ucHVzaChudWxsKTtcbiAgICAgICAgfSlcbiAgICAgICkuc3Vic2NyaWJlKCk7XG5cbiAgICByZXR1cm4gcmVhZGFibGVTdHJlYW07XG4gIH07XG59XG5cbiJdfQ==