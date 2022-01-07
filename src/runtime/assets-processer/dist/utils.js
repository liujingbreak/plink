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
const http_proxy_middleware_1 = require("http-proxy-middleware");
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
    res.end = function (_chunk, _encoding, _cb) {
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
    return req._currentRequest != null;
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
        pathRewrite: (path, _req) => {
            // hpmLog.warn('patPath=', patPath, 'path=', path);
            const ret = path && path.replace(patPath, lodash_1.default.trimEnd(pathname, '/') + '/');
            // hpmLog.info(`proxy to path: ${req.method} ${protocol + '//' + host}${ret}, req.url = ${req.url}`);
            return ret;
        },
        logLevel: 'debug',
        logProvider: _provider => hpmLog,
        proxyTimeout: 10000,
        onProxyReq(proxyReq, req, _res, ..._rest) {
            // This proxyReq could be "RedirectRequest" if option "followRedirect" is on
            if (isRedirectableRequest(proxyReq)) {
                hpmLog.info(`Redirect request to ${protocol}//${host}${proxyReq._currentRequest.path} method: ${req.method || 'uknown'}, ${JSON.stringify(proxyReq._currentRequest.getHeaders(), null, '  ')}`);
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
        onProxyRes(incoming, req, _res) {
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
                            write(chunk, _enc, cb) {
                                bufs.push(Buffer.isBuffer(chunk) ? chunk.toString() : chunk);
                                cb();
                            },
                            final(_cb) {
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
        onError(err, _req, _res) {
            hpmLog.warn(err);
        }
    };
    return proxyMidOpt;
}
exports.defaultProxyOptions = defaultProxyOptions;
const log = plink_1.logger.getLogger(__plink_1.default.packageName + '.createReplayReadableFactory');
function createReplayReadableFactory(readable, transforms, opts) {
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
            if (cacheBufLen === 0 || ((opts === null || opts === void 0 ? void 0 : opts.expectLen) != null && (opts === null || opts === void 0 ? void 0 : opts.expectLen) > cacheBufLen)) {
                log.error(((opts === null || opts === void 0 ? void 0 : opts.debugInfo) || '') + `, cache completed length is ${cacheBufLen} which is less than expected ${opts.expectLen}`);
                cb(new Error('Cache length does not meet expected length'));
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
            .pipe(op.map(([readable, buf], _idx) => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0RBQTRCO0FBRzVCLHNEQUEwQjtBQUMxQixvREFBdUI7QUFDdkIseUNBQTJCO0FBQzNCLG1EQUFxQztBQUNyQyx1REFBbUU7QUFDbkUsc0NBQWtDO0FBRWxDLGlFQUErRjtBQUUvRixNQUFNLE9BQU8sR0FBRyxjQUFNLENBQUMsU0FBUyxDQUFDLGlCQUFHLENBQUMsV0FBVyxHQUFHLFlBQVksQ0FBQyxDQUFDO0FBQ2pFOzs7OztHQUtHO0FBQ0gsU0FBZ0IsdUJBQXVCLENBQUMsR0FBWSxFQUFFLEdBQWEsRUFBRSxJQUFrQjtJQUNyRixNQUFNLElBQUksR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO0lBQ3hCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUVqQyxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDO0lBRXBCLFNBQVMsS0FBSztRQUNaLE1BQU0sR0FBRyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDakMsT0FBTyxDQUFDLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxNQUFNLElBQUksR0FBRyxDQUFDLFdBQVcsY0FBYyxHQUFHLENBQUMsVUFBVSx5QkFBeUIsR0FBRyxHQUFHLFNBQVMsSUFBSTtZQUM1SCxZQUFZLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLFNBQVMsTUFBTSxHQUFHLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBRSxHQUFHLENBQUMsQ0FBQztJQUMxRixDQUFDO0lBRUQsR0FBRyxDQUFDLEdBQUcsR0FBRyxVQUFTLE1BQVksRUFBRSxTQUFpQyxFQUFFLEdBQWdCO1FBQ2xGLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxTQUFT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b0JBQ3ZILDhCQUE4QjtvQkFDOUIsT0FBTyxDQUFDLE1BQU0sQ0FDWixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRSxDQUFFLElBQThCO3lCQUM5QyxJQUFJLENBQUMsSUFBOEIsQ0FBQyxDQUFDO3lCQUNyQyxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2lCQUN2QztZQUNILENBQUM7U0FDRixDQUFDLENBQUM7UUFFSCxFQUFFLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUM7YUFDcEIsSUFBSSxDQUNILEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUMvQixRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ25CLGlDQUFpQztZQUNqQyx1RUFBdUU7UUFDekUsQ0FBQyxDQUFDLEVBQ0YsRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7WUFDZixjQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzVCLENBQUMsQ0FBQyxDQUNILENBQUMsU0FBUyxFQUFFLENBQUM7UUFFaEIsT0FBTyxjQUFjLENBQUM7SUFDeEIsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQTdERCxrRUE2REMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgc3RyZWFtIGZyb20gJ3N0cmVhbSc7XG5pbXBvcnQge0NsaWVudFJlcXVlc3R9IGZyb20gJ2h0dHAnO1xuaW1wb3J0IHtSZXF1ZXN0LCBSZXNwb25zZSwgTmV4dEZ1bmN0aW9ufSBmcm9tICdleHByZXNzJztcbmltcG9ydCBhcGkgZnJvbSAnX19wbGluayc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQge3JlYWRDb21wcmVzc2VkUmVzcG9uc2V9IGZyb20gJ0B3ZmgvaHR0cC1zZXJ2ZXIvZGlzdC91dGlscyc7XG5pbXBvcnQge2xvZ2dlcn0gZnJvbSAnQHdmaC9wbGluayc7XG5cbmltcG9ydCB7IGNyZWF0ZVByb3h5TWlkZGxld2FyZSBhcyBwcm94eSwgT3B0aW9ucyBhcyBQcm94eU9wdGlvbnN9IGZyb20gJ2h0dHAtcHJveHktbWlkZGxld2FyZSc7XG5cbmNvbnN0IGxvZ1RpbWUgPSBsb2dnZXIuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcudGltZXN0YW1wJyk7XG4vKipcbiAqIE1pZGRsZXdhcmUgZm9yIHByaW50aW5nIGVhY2ggcmVzcG9uc2UgcHJvY2VzcyBkdXJhdGlvbiB0aW1lIHRvIGxvZ1xuICogQHBhcmFtIHJlcSBcbiAqIEBwYXJhbSByZXMgXG4gKiBAcGFyYW0gbmV4dCBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVJlc3BvbnNlVGltZXN0YW1wKHJlcTogUmVxdWVzdCwgcmVzOiBSZXNwb25zZSwgbmV4dDogTmV4dEZ1bmN0aW9uKSB7XG4gIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSgpO1xuICBjb25zdCBzdGFydFRpbWUgPSBkYXRlLmdldFRpbWUoKTtcblxuICBjb25zdCBlbmQgPSByZXMuZW5kO1xuXG4gIGZ1bmN0aW9uIHByaW50KCkge1xuICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgIGxvZ1RpbWUuaW5mbyhgcmVxdWVzdDogJHtyZXEubWV0aG9kfSAke3JlcS5vcmlnaW5hbFVybH0gfCBzdGF0dXM6ICR7cmVzLnN0YXR1c0NvZGV9LCBbcmVzcG9uc2UgZHVyYXRpb246ICR7bm93IC0gc3RhcnRUaW1lfW1zYCArXG4gICAgICBgXSAoc2luY2UgJHtkYXRlLnRvTG9jYWxlVGltZVN0cmluZygpfSAke3N0YXJ0VGltZX0pIFske3JlcS5oZWFkZXIoJ3VzZXItYWdlbnQnKSF9XWApO1xuICB9XG5cbiAgcmVzLmVuZCA9IGZ1bmN0aW9uKF9jaHVuaz86IGFueSwgX2VuY29kaW5nPzogc3RyaW5nIHwgKCgpID0+IHZvaWQpLCBfY2I/OiAoKSA9PiB2b2lkKSB7XG4gICAgY29uc3QgYXJndiA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gICAgY29uc3QgbGFzdEFyZyA9IGFyZ3VtZW50c1thcmd1bWVudHMubGVuZ3RoIC0gMV07XG4gICAgaWYgKHR5cGVvZiBsYXN0QXJnID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjb25zdCBvcmlnaW5DYiA9IGFyZ3VtZW50c1thcmd1bWVudHMubGVuZ3RoIC0gMV07XG4gICAgICBhcmd2W2FyZ3YubGVuZ3RoIC0gMV0gPSAoKSA9PiB7XG4gICAgICAgIG9yaWdpbkNiKCk7XG4gICAgICAgIHByaW50KCk7XG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAoYXJndi5sZW5ndGggPT09IDApIHtcbiAgICAgIGFyZ3YucHVzaChudWxsLCBwcmludCk7XG4gICAgfSBlbHNlIGlmIChhcmd2Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgYXJndi5wdXNoKHByaW50KTtcbiAgICB9XG4gICAgY29uc3QgcmV0ID0gZW5kLmFwcGx5KHJlcywgYXJndik7XG4gICAgcmV0dXJuIHJldDtcbiAgfTtcblxuICBuZXh0KCk7XG59XG5cbi8qKlxuICogVGhpcyBmdW5jdGlvbiB1c2VzIGh0dHAtcHJveHktbWlkZGxld2FyZSBpbnRlcm5hbGx5LlxuICogXG4gKiBCZSBhd2FyZSB3aXRoIGNvbW1hbmQgbGluZSBvcHRpb24gXCItLXZlcmJvc2VcIiwgb25jZSBlbmFibGUgXCJ2ZXJib3NlXCIsIHRoaXMgZnVuY3Rpb24gd2lsbFxuICogcmVhZCAocGlwZSkgcmVtb3RlIHNlcnZlciByZXNwb25zZSBib2R5IGludG8gYSBzdHJpbmcgYnVmZmVyIGZvciBhbnkgbWVzc2FnZSB3aXRoIGNvbnRlbnQtdHlwZSBpcyBcInRleHRcIiBvciBcImpzb25cIiBiYXNlZFxuICogQ3JlYXRlIGFuZCB1c2UgYW4gSFRUUCByZXF1ZXN0IHByb3h5IGZvciBzcGVjaWZpYyByZXF1ZXN0IHBhdGhcbiAqIEBwYXJhbSBwcm94eVBhdGggXG4gKiBAcGFyYW0gdGFyZ2V0VXJsIFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBIdHRwUHJveHkocHJveHlQYXRoOiBzdHJpbmcsIHRhcmdldFVybDogc3RyaW5nLFxuICBvcHRzOiB7XG4gICAgLyoqIEJ5cGFzcyBDT1JTIHJlc3RyaWN0IG9uIHRhcmdldCBzZXJ2ZXIsIGRlZmF1bHQgaXMgdHJ1ZSAqL1xuICAgIGRlbGV0ZU9yaWdpbj86IGJvb2xlYW47XG4gICAgcGF0aFJld3JpdGU/OiBQcm94eU9wdGlvbnNbJ3BhdGhSZXdyaXRlJ107XG4gICAgb25Qcm94eVJlcT86IFByb3h5T3B0aW9uc1snb25Qcm94eVJlcSddO1xuICAgIG9uUHJveHlSZXM/OiBQcm94eU9wdGlvbnNbJ29uUHJveHlSZXMnXTtcbiAgICBvbkVycm9yPzogUHJveHlPcHRpb25zWydvbkVycm9yJ107XG4gICAgYnVmZmVyPzogUHJveHlPcHRpb25zWydidWZmZXInXTtcbiAgICBzZWxmSGFuZGxlUmVzcG9uc2U/OiBQcm94eU9wdGlvbnNbJ3NlbGZIYW5kbGVSZXNwb25zZSddO1xuICAgIHByb3h5VGltZW91dD86IFByb3h5T3B0aW9uc1sncHJveHlUaW1lb3V0J107XG4gIH0gPSB7fSkge1xuXG4gIHByb3h5UGF0aCA9IF8udHJpbUVuZChwcm94eVBhdGgsICcvJyk7XG4gIHRhcmdldFVybCA9IF8udHJpbUVuZCh0YXJnZXRVcmwsICcvJyk7XG5cbiAgY29uc3QgZGVmYXVsdE9wdCA9IGRlZmF1bHRQcm94eU9wdGlvbnMocHJveHlQYXRoLCB0YXJnZXRVcmwpO1xuXG4gIGNvbnN0IHByb3h5TWlkT3B0OiBQcm94eU9wdGlvbnMgPSB7XG4gICAgLi4uZGVmYXVsdE9wdCxcbiAgICBvblByb3h5UmVxKC4uLmFyZ3MpIHtcbiAgICAgIGNvbnN0IG9yaWdIZWFkZXIgPSBhcmdzWzBdLmdldEhlYWRlcignT3JpZ2luJyk7XG4gICAgICBkZWZhdWx0T3B0Lm9uUHJveHlSZXEoLi4uYXJncyk7XG5cbiAgICAgIGlmIChvcHRzLmRlbGV0ZU9yaWdpbiA9PT0gZmFsc2UpIHtcbiAgICAgICAgLy8gUmVjb3ZlciByZW1vdmVkIGhlYWRlciBcIk9yaWdpblwiXG4gICAgICAgIGFyZ3NbMF0uc2V0SGVhZGVyKCdPcmlnaW4nLCBvcmlnSGVhZGVyIGFzIHN0cmluZyk7XG4gICAgICB9XG4gICAgICBpZiAob3B0cy5vblByb3h5UmVxKVxuICAgICAgICBvcHRzLm9uUHJveHlSZXEoLi4uYXJncyk7XG4gICAgfSxcbiAgICBvblByb3h5UmVzKC4uLmFyZ3MpIHtcbiAgICAgIGlmIChvcHRzLm9uUHJveHlSZXMpXG4gICAgICAgIG9wdHMub25Qcm94eVJlcyguLi5hcmdzKTtcbiAgICAgIGRlZmF1bHRPcHQub25Qcm94eVJlcyguLi5hcmdzKTtcbiAgICB9LFxuICAgIG9uRXJyb3IoLi4uYXJncykge1xuICAgICAgZGVmYXVsdE9wdC5vbkVycm9yKC4uLmFyZ3MpO1xuICAgICAgaWYgKG9wdHMub25FcnJvcilcbiAgICAgICAgb3B0cy5vbkVycm9yKC4uLmFyZ3MpO1xuICAgIH1cbiAgfTtcblxuXG4gIGFwaS5leHByZXNzQXBwU2V0KGFwcCA9PiB7XG4gICAgYXBwLnVzZShwcm94eVBhdGgsIHByb3h5KHByb3h5TWlkT3B0KSk7XG4gIH0pO1xufVxuXG4vKlxuICogVGhpcyBpbnRlcmZhY2UgaXMgbm90IGV4cG9zZWQgYnkgaHR0cC1wcm94eS1taWRkbGV3YXJlLCBpdCBpcyB1c2VkIHdoZW4gb3B0aW9uIFwiZm9sbG93UmVkaXJlY3RcIlxuICogaXMgZW5hYmxlZCwgbW9zdCBsaWtlbHkgdGhpcyBpcyBiZWhhdmlvciBvZiBodHRwLXByb3h5XG4gKi9cbmludGVyZmFjZSBSZWRpcmVjdGFibGVSZXF1ZXN0IHtcbiAgX2N1cnJlbnRSZXF1ZXN0OiBDbGllbnRSZXF1ZXN0O1xufVxuXG5mdW5jdGlvbiBpc1JlZGlyZWN0YWJsZVJlcXVlc3QocmVxOiB1bmtub3duKTogcmVxIGlzIFJlZGlyZWN0YWJsZVJlcXVlc3Qge1xuICByZXR1cm4gKHJlcSBhcyBSZWRpcmVjdGFibGVSZXF1ZXN0KS5fY3VycmVudFJlcXVlc3QgIT0gbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlZmF1bHRQcm94eU9wdGlvbnMocHJveHlQYXRoOiBzdHJpbmcsIHRhcmdldFVybDogc3RyaW5nKSB7XG4gIHByb3h5UGF0aCA9IF8udHJpbUVuZChwcm94eVBhdGgsICcvJyk7XG4gIHRhcmdldFVybCA9IF8udHJpbUVuZCh0YXJnZXRVcmwsICcvJyk7XG4gIGNvbnN0IHsgcHJvdG9jb2wsIGhvc3QsIHBhdGhuYW1lIH0gPSBuZXcgVVJMKHRhcmdldFVybCk7XG5cbiAgY29uc3QgcGF0UGF0aCA9IG5ldyBSZWdFeHAoJ14nICsgXy5lc2NhcGVSZWdFeHAocHJveHlQYXRoKSArICcoL3wkKScpO1xuICBjb25zdCBocG1Mb2cgPSBsb2dnZXIuZ2V0TG9nZ2VyKCdIUE0uJyArIHRhcmdldFVybCk7XG5cbiAgY29uc3QgcHJveHlNaWRPcHQ6IFByb3h5T3B0aW9ucyAmICB7W0sgaW4gJ3BhdGhSZXdyaXRlJyB8ICdvblByb3h5UmVxJyB8ICdvblByb3h5UmVzJyB8ICdvbkVycm9yJ106IE5vbk51bGxhYmxlPFByb3h5T3B0aW9uc1tLXT59ID0ge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBtYXgtbGVuXG4gICAgdGFyZ2V0OiBwcm90b2NvbCArICcvLycgKyBob3N0LFxuICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICB3czogZmFsc2UsXG4gICAgc2VjdXJlOiBmYWxzZSxcbiAgICBjb29raWVEb21haW5SZXdyaXRlOiB7ICcqJzogJycgfSxcbiAgICBwYXRoUmV3cml0ZTogKHBhdGgsIF9yZXEpID0+IHtcbiAgICAgIC8vIGhwbUxvZy53YXJuKCdwYXRQYXRoPScsIHBhdFBhdGgsICdwYXRoPScsIHBhdGgpO1xuICAgICAgY29uc3QgcmV0ID0gcGF0aCAmJiBwYXRoLnJlcGxhY2UocGF0UGF0aCwgXy50cmltRW5kKHBhdGhuYW1lLCAnLycpICsgJy8nKTtcbiAgICAgIC8vIGhwbUxvZy5pbmZvKGBwcm94eSB0byBwYXRoOiAke3JlcS5tZXRob2R9ICR7cHJvdG9jb2wgKyAnLy8nICsgaG9zdH0ke3JldH0sIHJlcS51cmwgPSAke3JlcS51cmx9YCk7XG4gICAgICByZXR1cm4gcmV0O1xuICAgIH0sXG4gICAgbG9nTGV2ZWw6ICdkZWJ1ZycsXG4gICAgbG9nUHJvdmlkZXI6IF9wcm92aWRlciA9PiBocG1Mb2csXG4gICAgcHJveHlUaW1lb3V0OiAxMDAwMCxcbiAgICBvblByb3h5UmVxKHByb3h5UmVxLCByZXEsIF9yZXMsIC4uLl9yZXN0KSB7XG4gICAgICAvLyBUaGlzIHByb3h5UmVxIGNvdWxkIGJlIFwiUmVkaXJlY3RSZXF1ZXN0XCIgaWYgb3B0aW9uIFwiZm9sbG93UmVkaXJlY3RcIiBpcyBvblxuICAgICAgaWYgKGlzUmVkaXJlY3RhYmxlUmVxdWVzdChwcm94eVJlcSkpIHtcbiAgICAgICAgaHBtTG9nLmluZm8oYFJlZGlyZWN0IHJlcXVlc3QgdG8gJHtwcm90b2NvbH0vLyR7aG9zdH0ke3Byb3h5UmVxLl9jdXJyZW50UmVxdWVzdC5wYXRofSBtZXRob2Q6ICR7cmVxLm1ldGhvZCB8fCAndWtub3duJ30sICR7SlNPTi5zdHJpbmdpZnkoXG4gICAgICAgICAgcHJveHlSZXEuX2N1cnJlbnRSZXF1ZXN0LmdldEhlYWRlcnMoKSwgbnVsbCwgJyAgJyl9YCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwcm94eVJlcS5yZW1vdmVIZWFkZXIoJ09yaWdpbicpOyAvLyBCeXBhc3MgQ09SUyByZXN0cmljdCBvbiB0YXJnZXQgc2VydmVyXG4gICAgICAgIGNvbnN0IHJlZmVyZXIgPSBwcm94eVJlcS5nZXRIZWFkZXIoJ3JlZmVyZXInKTtcbiAgICAgICAgaWYgKHR5cGVvZiByZWZlcmVyID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIHByb3h5UmVxLnNldEhlYWRlcigncmVmZXJlcicsIGAke3Byb3RvY29sfS8vJHtob3N0fSR7bmV3IFVSTChyZWZlcmVyKS5wYXRobmFtZX1gKTtcbiAgICAgICAgfVxuICAgICAgICBocG1Mb2cuaW5mbyhgUHJveHkgcmVxdWVzdCB0byAke3Byb3RvY29sfS8vJHtob3N0fSR7cHJveHlSZXEucGF0aH0gbWV0aG9kOiAke3JlcS5tZXRob2QgfHwgJ3Vrbm93bid9LCAke0pTT04uc3RyaW5naWZ5KFxuICAgICAgICAgIHByb3h5UmVxLmdldEhlYWRlcnMoKSwgbnVsbCwgJyAgJyl9YCk7XG4gICAgICB9XG4gICAgfSxcbiAgICBvblByb3h5UmVzKGluY29taW5nLCByZXEsIF9yZXMpIHtcbiAgICAgIGluY29taW5nLmhlYWRlcnNbJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbiddID0gJyonO1xuICAgICAgaWYgKGFwaS5jb25maWcoKS5kZXZNb2RlKSB7XG4gICAgICAgIGhwbUxvZy5pbmZvKGBQcm94eSByZWNpZXZlICR7cmVxLnVybCB8fCAnJ30sIHN0YXR1czogJHtpbmNvbWluZy5zdGF0dXNDb2RlIX1cXG5gLFxuICAgICAgICAgIEpTT04uc3RyaW5naWZ5KGluY29taW5nLmhlYWRlcnMsIG51bGwsICcgICcpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGhwbUxvZy5pbmZvKGBQcm94eSByZWNpZXZlICR7cmVxLnVybCB8fCAnJ30sIHN0YXR1czogJHtpbmNvbWluZy5zdGF0dXNDb2RlIX1gKTtcbiAgICAgIH1cbiAgICAgIGlmIChhcGkuY29uZmlnKCkuZGV2TW9kZSkge1xuXG4gICAgICAgIGNvbnN0IGN0ID0gaW5jb21pbmcuaGVhZGVyc1snY29udGVudC10eXBlJ107XG4gICAgICAgIGhwbUxvZy5pbmZvKGBSZXNwb25zZSAke3JlcS51cmwgfHwgJyd9IGhlYWRlcnM6XFxuYCwgaW5jb21pbmcuaGVhZGVycyk7XG4gICAgICAgIGNvbnN0IGlzVGV4dCA9IChjdCAmJiAvXFxiKGpzb258dGV4dClcXGIvaS50ZXN0KGN0KSk7XG4gICAgICAgIGlmIChpc1RleHQpIHtcbiAgICAgICAgICBpZiAoIWluY29taW5nLmNvbXBsZXRlKSB7XG4gICAgICAgICAgICBjb25zdCBidWZzID0gW10gYXMgc3RyaW5nW107XG4gICAgICAgICAgICB2b2lkIHJlYWRDb21wcmVzc2VkUmVzcG9uc2UoaW5jb21pbmcsIG5ldyBzdHJlYW0uV3JpdGFibGUoe1xuICAgICAgICAgICAgICB3cml0ZShjaHVuazogQnVmZmVyIHwgc3RyaW5nLCBfZW5jLCBjYikge1xuICAgICAgICAgICAgICAgIGJ1ZnMucHVzaChCdWZmZXIuaXNCdWZmZXIoY2h1bmspID8gY2h1bmsudG9TdHJpbmcoKSA6IGNodW5rKTtcbiAgICAgICAgICAgICAgICBjYigpO1xuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBmaW5hbChfY2IpIHtcbiAgICAgICAgICAgICAgICBocG1Mb2cuaW5mbyhgUmVzcG9uc2UgJHtyZXEudXJsIHx8ICcnfSB0ZXh0IGJvZHk6XFxuYCwgYnVmcy5qb2luKCcnKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKChpbmNvbWluZyBhcyB7Ym9keT86IEJ1ZmZlciB8IHN0cmluZ30pLmJvZHkpIHtcbiAgICAgICAgICAgIGhwbUxvZy5pbmZvKGBSZXNwb25zZSAke3JlcS51cmwgfHwgJyd9IHRleHQgYm9keTpcXG5gLCAoaW5jb21pbmcgYXMge2JvZHk/OiBCdWZmZXIgfCBzdHJpbmd9KS50b1N0cmluZygpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIG9uRXJyb3IoZXJyLCBfcmVxLCBfcmVzKSB7XG4gICAgICBocG1Mb2cud2FybihlcnIpO1xuICAgIH1cbiAgfTtcbiAgcmV0dXJuIHByb3h5TWlkT3B0O1xufVxuXG5jb25zdCBsb2cgPSBsb2dnZXIuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuY3JlYXRlUmVwbGF5UmVhZGFibGVGYWN0b3J5Jyk7XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSZXBsYXlSZWFkYWJsZUZhY3RvcnkoXG4gIHJlYWRhYmxlOiBOb2RlSlMuUmVhZGFibGVTdHJlYW0sIHRyYW5zZm9ybXM/OiBOb2RlSlMuUmVhZFdyaXRlU3RyZWFtW10sXG4gIG9wdHM/OiB7ZGVidWdJbmZvPzogc3RyaW5nOyBleHBlY3RMZW4/OiBudW1iZXJ9XG4pIHtcbiAgY29uc3QgYnVmJCA9IG5ldyByeC5SZXBsYXlTdWJqZWN0PEJ1ZmZlcj4oKTtcbiAgbGV0IGNhY2hlQnVmTGVuID0gMDtcbiAgY29uc3QgY2FjaGVXcml0ZXIgPSBuZXcgc3RyZWFtLldyaXRhYmxlKHtcbiAgICB3cml0ZShjaHVuazogQnVmZmVyLCBfZW5jLCBjYikge1xuICAgICAgY2FjaGVCdWZMZW4gKz0gY2h1bmsubGVuZ3RoO1xuICAgICAgLy8gbG9nLndhcm4oJ2NhY2hlIHVwZGF0ZWQ6JywgY2FjaGVCdWZMZW4pO1xuICAgICAgYnVmJC5uZXh0KGNodW5rKTtcbiAgICAgIGNiKCk7XG4gICAgfSxcbiAgICBmaW5hbChjYikge1xuICAgICAgYnVmJC5jb21wbGV0ZSgpO1xuICAgICAgaWYgKGNhY2hlQnVmTGVuID09PSAwIHx8IChvcHRzPy5leHBlY3RMZW4gIT0gbnVsbCAmJiBvcHRzPy5leHBlY3RMZW4gPiBjYWNoZUJ1ZkxlbiApKSB7XG4gICAgICAgIGxvZy5lcnJvcigob3B0cz8uZGVidWdJbmZvIHx8ICcnKSArIGAsIGNhY2hlIGNvbXBsZXRlZCBsZW5ndGggaXMgJHtjYWNoZUJ1Zkxlbn0gd2hpY2ggaXMgbGVzcyB0aGFuIGV4cGVjdGVkICR7b3B0cyEuZXhwZWN0TGVuIX1gKTtcbiAgICAgICAgY2IobmV3IEVycm9yKCdDYWNoZSBsZW5ndGggZG9lcyBub3QgbWVldCBleHBlY3RlZCBsZW5ndGgnKSk7XG4gICAgICB9XG4gICAgICBjYigpO1xuICAgIH1cbiAgfSk7XG5cbiAgbGV0IGNhY2hpbmcgPSBmYWxzZTtcbiAgLy8gbGV0IHJlYWRlckNvdW50ID0gMDtcblxuICByZXR1cm4gKCkgPT4ge1xuICAgIC8vIHJlYWRlckNvdW50Kys7XG4gICAgLy8gbGV0IGJ1ZmZlckxlbmd0aFN1bSA9IDA7XG4gICAgLy8gY29uc3QgcmVhZGVySWQgPSByZWFkZXJDb3VudDtcbiAgICBjb25zdCByZWFkQ2FsbCQgPSBuZXcgcnguU3ViamVjdDxzdHJlYW0uUmVhZGFibGU+KCk7XG4gICAgY29uc3QgcmVhZGFibGVTdHJlYW0gPSBuZXcgc3RyZWFtLlJlYWRhYmxlKHtcbiAgICAgIHJlYWQoX3NpemUpIHtcbiAgICAgICAgcmVhZENhbGwkLm5leHQodGhpcyk7XG4gICAgICAgIGlmICghY2FjaGluZykge1xuICAgICAgICAgIGNhY2hpbmcgPSB0cnVlO1xuICAgICAgICAgIGNvbnN0IHN0cmVhbXMgPSBbcmVhZGFibGUsXG4gICAgICAgICAgICAuLi4odHJhbnNmb3JtcyB8fCBbXSksIGNhY2hlV3JpdGVyXSBhcyBBcnJheTxOb2RlSlMuUmVhZGFibGVTdHJlYW0gfCBOb2RlSlMuV3JpdGFibGVTdHJlYW0gfCBOb2RlSlMuUmVhZFdyaXRlU3RyZWFtPjtcbiAgICAgICAgICAvLyBUbyB3b3JrYXJvdW5kIE5vZGVKUyAxNiBidWdcbiAgICAgICAgICBzdHJlYW1zLnJlZHVjZShcbiAgICAgICAgICAgIChwcmV2LCBjdXJyKSA9PiAocHJldiBhcyBOb2RlSlMuUmVhZGFibGVTdHJlYW0pXG4gICAgICAgICAgICAucGlwZShjdXJyIGFzIE5vZGVKUy5SZWFkV3JpdGVTdHJlYW0pKVxuICAgICAgICAgICAgLm9uKCdlcnJvcicsIGVyciA9PiBsb2cuZXJyb3IoZXJyKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJ4LnppcChyZWFkQ2FsbCQsIGJ1ZiQpXG4gICAgICAucGlwZShcbiAgICAgICAgb3AubWFwKChbcmVhZGFibGUsIGJ1Zl0sIF9pZHgpID0+IHtcbiAgICAgICAgICByZWFkYWJsZS5wdXNoKGJ1Zik7XG4gICAgICAgICAgLy8gYnVmZmVyTGVuZ3RoU3VtICs9IGJ1Zi5sZW5ndGg7XG4gICAgICAgICAgLy8gbG9nLmRlYnVnKGByZWFkZXI6ICR7cmVhZGVySWR9LCByZWFkcyAoJHtpZHh9KSAke2J1ZmZlckxlbmd0aFN1bX1gKTtcbiAgICAgICAgfSksXG4gICAgICAgIG9wLmZpbmFsaXplKCgpID0+IHtcbiAgICAgICAgICByZWFkYWJsZVN0cmVhbS5wdXNoKG51bGwpO1xuICAgICAgICB9KVxuICAgICAgKS5zdWJzY3JpYmUoKTtcblxuICAgIHJldHVybiByZWFkYWJsZVN0cmVhbTtcbiAgfTtcbn1cblxuIl19