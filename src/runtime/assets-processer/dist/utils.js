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
exports.fixRequestBody = exports.createReplayReadableFactory = exports.defaultHttpProxyOptions = exports.defaultProxyOptions = exports.isRedirectableRequest = exports.setupHttpProxy = exports.createResponseTimestamp = void 0;
const stream_1 = __importDefault(require("stream"));
const querystring = __importStar(require("querystring"));
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
exports.isRedirectableRequest = isRedirectableRequest;
/**
 * Options of http-proxy-middleware
 */
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
                hpmLog.warn(`Redirect request to ${protocol}//${host}${proxyReq._currentRequest.path} method: ${req.method || 'uknown'}, ${JSON.stringify(proxyReq._currentRequest.getHeaders(), null, '  ')}`);
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
/** Options of http-proxy
 */
function defaultHttpProxyOptions(target) {
    return {
        target,
        changeOrigin: true,
        ws: false,
        secure: false,
        cookieDomainRewrite: { '*': '' },
        // logLevel: 'debug',
        // logProvider: provider => hpmLog,
        proxyTimeout: 10000
    };
}
exports.defaultHttpProxyOptions = defaultHttpProxyOptions;
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
/**
 * Fix proxied body if bodyParser is involved.
 * Copied from https://github.com/chimurai/http-proxy-middleware/blob/master/src/handlers/fix-request-body.ts
 */
function fixRequestBody(proxyReq, req) {
    const requestBody = req.body;
    if (!requestBody || !Object.keys(requestBody).length) {
        return;
    }
    const contentType = proxyReq.getHeader('Content-Type');
    const writeBody = (bodyData) => {
        // deepcode ignore ContentLengthInCode: bodyParser fix
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
    };
    if (contentType && contentType.includes('application/json')) {
        writeBody(JSON.stringify(requestBody));
    }
    if (contentType === 'application/x-www-form-urlencoded') {
        writeBody(querystring.stringify(requestBody));
    }
}
exports.fixRequestBody = fixRequestBody;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0RBQTRCO0FBRTVCLHlEQUEyQztBQUUzQyxzREFBMEI7QUFDMUIsb0RBQXVCO0FBQ3ZCLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMsdURBQW1FO0FBQ25FLHNDQUFrQztBQUVsQyxpRUFBK0Y7QUFFL0YsTUFBTSxPQUFPLEdBQUcsY0FBTSxDQUFDLFNBQVMsQ0FBQyxpQkFBRyxDQUFDLFdBQVcsR0FBRyxZQUFZLENBQUMsQ0FBQztBQUNqRTs7Ozs7R0FLRztBQUNILFNBQWdCLHVCQUF1QixDQUFDLEdBQVksRUFBRSxHQUFhLEVBQUUsSUFBa0I7SUFDckYsTUFBTSxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztJQUN4QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7SUFFakMsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQztJQUVwQixTQUFTLEtBQUs7UUFDWixNQUFNLEdBQUcsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2pDLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxXQUFXLGNBQWMsR0FBRyxDQUFDLFVBQVUseUJBQXlCLEdBQUcsR0FBRyxTQUFTLElBQUk7WUFDNUgsWUFBWSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxTQUFTLE1BQU0sR0FBRyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUUsR0FBRyxDQUFDLENBQUM7SUFDMUYsQ0FBQztJQUVELEdBQUcsQ0FBQyxHQUFHLEdBQUcsVUFBUyxNQUFZLEVBQUUsU0FBaUMsRUFBRSxHQUFnQjtRQUNsRixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJ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O0FBRUQ7OztHQUdHO0FBQ0gsU0FBZ0IsY0FBYyxDQUFDLFFBQXVCLEVBQUUsR0FBb0I7SUFDMUUsTUFBTSxXQUFXLEdBQUksR0FBZSxDQUFDLElBQUksQ0FBQztJQUUxQyxJQUFJLENBQUMsV0FBVyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxNQUFNLEVBQUU7UUFDcEQsT0FBTztLQUNSO0lBRUQsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQVcsQ0FBQztJQUNqRSxNQUFNLFNBQVMsR0FBRyxDQUFDLFFBQWdCLEVBQUUsRUFBRTtRQUNyQyxzREFBc0Q7UUFDdEQsUUFBUSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFDbEUsUUFBUSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUMzQixDQUFDLENBQUM7SUFFRixJQUFJLFdBQVcsSUFBSSxXQUFXLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLEVBQUU7UUFDM0QsU0FBUyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztLQUN4QztJQUVELElBQUksV0FBVyxLQUFLLG1DQUFtQyxFQUFFO1FBQ3ZELFNBQVMsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7S0FDL0M7QUFDSCxDQUFDO0FBckJELHdDQXFCQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBzdHJlYW0gZnJvbSAnc3RyZWFtJztcbmltcG9ydCB7Q2xpZW50UmVxdWVzdCwgSW5jb21pbmdNZXNzYWdlfSBmcm9tICdodHRwJztcbmltcG9ydCAqIGFzIHF1ZXJ5c3RyaW5nIGZyb20gJ3F1ZXJ5c3RyaW5nJztcbmltcG9ydCB7UmVxdWVzdCwgUmVzcG9uc2UsIE5leHRGdW5jdGlvbn0gZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgYXBpIGZyb20gJ19fcGxpbmsnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtyZWFkQ29tcHJlc3NlZFJlc3BvbnNlfSBmcm9tICdAd2ZoL2h0dHAtc2VydmVyL2Rpc3QvdXRpbHMnO1xuaW1wb3J0IHtsb2dnZXJ9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IHtTZXJ2ZXJPcHRpb25zfSBmcm9tICdodHRwLXByb3h5JztcbmltcG9ydCB7IGNyZWF0ZVByb3h5TWlkZGxld2FyZSBhcyBwcm94eSwgT3B0aW9ucyBhcyBQcm94eU9wdGlvbnN9IGZyb20gJ2h0dHAtcHJveHktbWlkZGxld2FyZSc7XG5cbmNvbnN0IGxvZ1RpbWUgPSBsb2dnZXIuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcudGltZXN0YW1wJyk7XG4vKipcbiAqIE1pZGRsZXdhcmUgZm9yIHByaW50aW5nIGVhY2ggcmVzcG9uc2UgcHJvY2VzcyBkdXJhdGlvbiB0aW1lIHRvIGxvZ1xuICogQHBhcmFtIHJlcSBcbiAqIEBwYXJhbSByZXMgXG4gKiBAcGFyYW0gbmV4dCBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVJlc3BvbnNlVGltZXN0YW1wKHJlcTogUmVxdWVzdCwgcmVzOiBSZXNwb25zZSwgbmV4dDogTmV4dEZ1bmN0aW9uKSB7XG4gIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSgpO1xuICBjb25zdCBzdGFydFRpbWUgPSBkYXRlLmdldFRpbWUoKTtcblxuICBjb25zdCBlbmQgPSByZXMuZW5kO1xuXG4gIGZ1bmN0aW9uIHByaW50KCkge1xuICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgIGxvZ1RpbWUuaW5mbyhgcmVxdWVzdDogJHtyZXEubWV0aG9kfSAke3JlcS5vcmlnaW5hbFVybH0gfCBzdGF0dXM6ICR7cmVzLnN0YXR1c0NvZGV9LCBbcmVzcG9uc2UgZHVyYXRpb246ICR7bm93IC0gc3RhcnRUaW1lfW1zYCArXG4gICAgICBgXSAoc2luY2UgJHtkYXRlLnRvTG9jYWxlVGltZVN0cmluZygpfSAke3N0YXJ0VGltZX0pIFske3JlcS5oZWFkZXIoJ3VzZXItYWdlbnQnKSF9XWApO1xuICB9XG5cbiAgcmVzLmVuZCA9IGZ1bmN0aW9uKF9jaHVuaz86IGFueSwgX2VuY29kaW5nPzogc3RyaW5nIHwgKCgpID0+IHZvaWQpLCBfY2I/OiAoKSA9PiB2b2lkKSB7XG4gICAgY29uc3QgYXJndiA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gICAgY29uc3QgbGFzdEFyZyA9IGFyZ3VtZW50c1thcmd1bWVudHMubGVuZ3RoIC0gMV07XG4gICAgaWYgKHR5cGVvZiBsYXN0QXJnID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjb25zdCBvcmlnaW5DYiA9IGFyZ3VtZW50c1thcmd1bWVudHMubGVuZ3RoIC0gMV07XG4gICAgICBhcmd2W2FyZ3YubGVuZ3RoIC0gMV0gPSAoKSA9PiB7XG4gICAgICAgIG9yaWdpbkNiKCk7XG4gICAgICAgIHByaW50KCk7XG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAoYXJndi5sZW5ndGggPT09IDApIHtcbiAgICAgIGFyZ3YucHVzaChudWxsLCBwcmludCk7XG4gICAgfSBlbHNlIGlmIChhcmd2Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgYXJndi5wdXNoKHByaW50KTtcbiAgICB9XG4gICAgY29uc3QgcmV0ID0gZW5kLmFwcGx5KHJlcywgYXJndik7XG4gICAgcmV0dXJuIHJldDtcbiAgfTtcblxuICBuZXh0KCk7XG59XG5cbi8qKlxuICogVGhpcyBmdW5jdGlvbiB1c2VzIGh0dHAtcHJveHktbWlkZGxld2FyZSBpbnRlcm5hbGx5LlxuICogXG4gKiBCZSBhd2FyZSB3aXRoIGNvbW1hbmQgbGluZSBvcHRpb24gXCItLXZlcmJvc2VcIiwgb25jZSBlbmFibGUgXCJ2ZXJib3NlXCIsIHRoaXMgZnVuY3Rpb24gd2lsbFxuICogcmVhZCAocGlwZSkgcmVtb3RlIHNlcnZlciByZXNwb25zZSBib2R5IGludG8gYSBzdHJpbmcgYnVmZmVyIGZvciBhbnkgbWVzc2FnZSB3aXRoIGNvbnRlbnQtdHlwZSBpcyBcInRleHRcIiBvciBcImpzb25cIiBiYXNlZFxuICogQ3JlYXRlIGFuZCB1c2UgYW4gSFRUUCByZXF1ZXN0IHByb3h5IGZvciBzcGVjaWZpYyByZXF1ZXN0IHBhdGhcbiAqIEBwYXJhbSBwcm94eVBhdGggXG4gKiBAcGFyYW0gdGFyZ2V0VXJsIFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBIdHRwUHJveHkocHJveHlQYXRoOiBzdHJpbmcsIHRhcmdldFVybDogc3RyaW5nLFxuICBvcHRzOiB7XG4gICAgLyoqIEJ5cGFzcyBDT1JTIHJlc3RyaWN0IG9uIHRhcmdldCBzZXJ2ZXIsIGRlZmF1bHQgaXMgdHJ1ZSAqL1xuICAgIGRlbGV0ZU9yaWdpbj86IGJvb2xlYW47XG4gICAgcGF0aFJld3JpdGU/OiBQcm94eU9wdGlvbnNbJ3BhdGhSZXdyaXRlJ107XG4gICAgb25Qcm94eVJlcT86IFByb3h5T3B0aW9uc1snb25Qcm94eVJlcSddO1xuICAgIG9uUHJveHlSZXM/OiBQcm94eU9wdGlvbnNbJ29uUHJveHlSZXMnXTtcbiAgICBvbkVycm9yPzogUHJveHlPcHRpb25zWydvbkVycm9yJ107XG4gICAgYnVmZmVyPzogUHJveHlPcHRpb25zWydidWZmZXInXTtcbiAgICBzZWxmSGFuZGxlUmVzcG9uc2U/OiBQcm94eU9wdGlvbnNbJ3NlbGZIYW5kbGVSZXNwb25zZSddO1xuICAgIHByb3h5VGltZW91dD86IFByb3h5T3B0aW9uc1sncHJveHlUaW1lb3V0J107XG4gIH0gPSB7fSkge1xuXG4gIHByb3h5UGF0aCA9IF8udHJpbUVuZChwcm94eVBhdGgsICcvJyk7XG4gIHRhcmdldFVybCA9IF8udHJpbUVuZCh0YXJnZXRVcmwsICcvJyk7XG5cbiAgY29uc3QgZGVmYXVsdE9wdCA9IGRlZmF1bHRQcm94eU9wdGlvbnMocHJveHlQYXRoLCB0YXJnZXRVcmwpO1xuXG4gIGNvbnN0IHByb3h5TWlkT3B0OiBQcm94eU9wdGlvbnMgPSB7XG4gICAgLi4uZGVmYXVsdE9wdCxcbiAgICBvblByb3h5UmVxKC4uLmFyZ3MpIHtcbiAgICAgIGNvbnN0IG9yaWdIZWFkZXIgPSBhcmdzWzBdLmdldEhlYWRlcignT3JpZ2luJyk7XG4gICAgICBkZWZhdWx0T3B0Lm9uUHJveHlSZXEoLi4uYXJncyk7XG5cbiAgICAgIGlmIChvcHRzLmRlbGV0ZU9yaWdpbiA9PT0gZmFsc2UpIHtcbiAgICAgICAgLy8gUmVjb3ZlciByZW1vdmVkIGhlYWRlciBcIk9yaWdpblwiXG4gICAgICAgIGFyZ3NbMF0uc2V0SGVhZGVyKCdPcmlnaW4nLCBvcmlnSGVhZGVyIGFzIHN0cmluZyk7XG4gICAgICB9XG4gICAgICBpZiAob3B0cy5vblByb3h5UmVxKVxuICAgICAgICBvcHRzLm9uUHJveHlSZXEoLi4uYXJncyk7XG4gICAgfSxcbiAgICBvblByb3h5UmVzKC4uLmFyZ3MpIHtcbiAgICAgIGlmIChvcHRzLm9uUHJveHlSZXMpXG4gICAgICAgIG9wdHMub25Qcm94eVJlcyguLi5hcmdzKTtcbiAgICAgIGRlZmF1bHRPcHQub25Qcm94eVJlcyguLi5hcmdzKTtcbiAgICB9LFxuICAgIG9uRXJyb3IoLi4uYXJncykge1xuICAgICAgZGVmYXVsdE9wdC5vbkVycm9yKC4uLmFyZ3MpO1xuICAgICAgaWYgKG9wdHMub25FcnJvcilcbiAgICAgICAgb3B0cy5vbkVycm9yKC4uLmFyZ3MpO1xuICAgIH1cbiAgfTtcblxuXG4gIGFwaS5leHByZXNzQXBwU2V0KGFwcCA9PiB7XG4gICAgYXBwLnVzZShwcm94eVBhdGgsIHByb3h5KHByb3h5TWlkT3B0KSk7XG4gIH0pO1xufVxuXG4vKlxuICogVGhpcyBpbnRlcmZhY2UgaXMgbm90IGV4cG9zZWQgYnkgaHR0cC1wcm94eS1taWRkbGV3YXJlLCBpdCBpcyB1c2VkIHdoZW4gb3B0aW9uIFwiZm9sbG93UmVkaXJlY3RcIlxuICogaXMgZW5hYmxlZCwgbW9zdCBsaWtlbHkgdGhpcyBpcyBiZWhhdmlvciBvZiBodHRwLXByb3h5XG4gKi9cbmludGVyZmFjZSBSZWRpcmVjdGFibGVSZXF1ZXN0IHtcbiAgX2N1cnJlbnRSZXF1ZXN0OiBDbGllbnRSZXF1ZXN0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNSZWRpcmVjdGFibGVSZXF1ZXN0KHJlcTogdW5rbm93bik6IHJlcSBpcyBSZWRpcmVjdGFibGVSZXF1ZXN0IHtcbiAgcmV0dXJuIChyZXEgYXMgUmVkaXJlY3RhYmxlUmVxdWVzdCkuX2N1cnJlbnRSZXF1ZXN0ICE9IG51bGw7XG59XG5cbi8qKlxuICogT3B0aW9ucyBvZiBodHRwLXByb3h5LW1pZGRsZXdhcmVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZmF1bHRQcm94eU9wdGlvbnMocHJveHlQYXRoOiBzdHJpbmcsIHRhcmdldFVybDogc3RyaW5nKSB7XG4gIHByb3h5UGF0aCA9IF8udHJpbUVuZChwcm94eVBhdGgsICcvJyk7XG4gIHRhcmdldFVybCA9IF8udHJpbUVuZCh0YXJnZXRVcmwsICcvJyk7XG4gIGNvbnN0IHsgcHJvdG9jb2wsIGhvc3QsIHBhdGhuYW1lIH0gPSBuZXcgVVJMKHRhcmdldFVybCk7XG5cbiAgY29uc3QgcGF0UGF0aCA9IG5ldyBSZWdFeHAoJ14nICsgXy5lc2NhcGVSZWdFeHAocHJveHlQYXRoKSArICcoL3wkKScpO1xuICBjb25zdCBocG1Mb2cgPSBsb2dnZXIuZ2V0TG9nZ2VyKCdIUE0uJyArIHRhcmdldFVybCk7XG5cbiAgY29uc3QgcHJveHlNaWRPcHQ6IFByb3h5T3B0aW9ucyAmICB7W0sgaW4gJ3BhdGhSZXdyaXRlJyB8ICdvblByb3h5UmVxJyB8ICdvblByb3h5UmVzJyB8ICdvbkVycm9yJ106IE5vbk51bGxhYmxlPFByb3h5T3B0aW9uc1tLXT59ID0ge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBtYXgtbGVuXG4gICAgdGFyZ2V0OiBwcm90b2NvbCArICcvLycgKyBob3N0LFxuICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICB3czogZmFsc2UsXG4gICAgc2VjdXJlOiBmYWxzZSxcbiAgICBjb29raWVEb21haW5SZXdyaXRlOiB7ICcqJzogJycgfSxcbiAgICBwYXRoUmV3cml0ZTogKHBhdGgsIF9yZXEpID0+IHtcbiAgICAgIC8vIGhwbUxvZy53YXJuKCdwYXRQYXRoPScsIHBhdFBhdGgsICdwYXRoPScsIHBhdGgpO1xuICAgICAgY29uc3QgcmV0ID0gcGF0aCAmJiBwYXRoLnJlcGxhY2UocGF0UGF0aCwgXy50cmltRW5kKHBhdGhuYW1lLCAnLycpICsgJy8nKTtcbiAgICAgIC8vIGhwbUxvZy5pbmZvKGBwcm94eSB0byBwYXRoOiAke3JlcS5tZXRob2R9ICR7cHJvdG9jb2wgKyAnLy8nICsgaG9zdH0ke3JldH0sIHJlcS51cmwgPSAke3JlcS51cmx9YCk7XG4gICAgICByZXR1cm4gcmV0O1xuICAgIH0sXG4gICAgbG9nTGV2ZWw6ICdkZWJ1ZycsXG4gICAgbG9nUHJvdmlkZXI6IF9wcm92aWRlciA9PiBocG1Mb2csXG4gICAgcHJveHlUaW1lb3V0OiAxMDAwMCxcbiAgICBvblByb3h5UmVxKHByb3h5UmVxLCByZXEsIF9yZXMsIC4uLl9yZXN0KSB7XG4gICAgICAvLyBUaGlzIHByb3h5UmVxIGNvdWxkIGJlIFwiUmVkaXJlY3RSZXF1ZXN0XCIgaWYgb3B0aW9uIFwiZm9sbG93UmVkaXJlY3RcIiBpcyBvblxuICAgICAgaWYgKGlzUmVkaXJlY3RhYmxlUmVxdWVzdChwcm94eVJlcSkpIHtcbiAgICAgICAgaHBtTG9nLndhcm4oYFJlZGlyZWN0IHJlcXVlc3QgdG8gJHtwcm90b2NvbH0vLyR7aG9zdH0ke3Byb3h5UmVxLl9jdXJyZW50UmVxdWVzdC5wYXRofSBtZXRob2Q6ICR7cmVxLm1ldGhvZCB8fCAndWtub3duJ30sICR7SlNPTi5zdHJpbmdpZnkoXG4gICAgICAgICAgcHJveHlSZXEuX2N1cnJlbnRSZXF1ZXN0LmdldEhlYWRlcnMoKSwgbnVsbCwgJyAgJyl9YCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwcm94eVJlcS5yZW1vdmVIZWFkZXIoJ09yaWdpbicpOyAvLyBCeXBhc3MgQ09SUyByZXN0cmljdCBvbiB0YXJnZXQgc2VydmVyXG4gICAgICAgIGNvbnN0IHJlZmVyZXIgPSBwcm94eVJlcS5nZXRIZWFkZXIoJ3JlZmVyZXInKTtcbiAgICAgICAgaWYgKHR5cGVvZiByZWZlcmVyID09PSAnc3RyaW5nJykge1xuICAgICAgICAgIHByb3h5UmVxLnNldEhlYWRlcigncmVmZXJlcicsIGAke3Byb3RvY29sfS8vJHtob3N0fSR7bmV3IFVSTChyZWZlcmVyKS5wYXRobmFtZX1gKTtcbiAgICAgICAgfVxuICAgICAgICBocG1Mb2cuaW5mbyhgUHJveHkgcmVxdWVzdCB0byAke3Byb3RvY29sfS8vJHtob3N0fSR7cHJveHlSZXEucGF0aH0gbWV0aG9kOiAke3JlcS5tZXRob2QgfHwgJ3Vrbm93bid9LCAke0pTT04uc3RyaW5naWZ5KFxuICAgICAgICAgIHByb3h5UmVxLmdldEhlYWRlcnMoKSwgbnVsbCwgJyAgJyl9YCk7XG4gICAgICB9XG4gICAgfSxcbiAgICBvblByb3h5UmVzKGluY29taW5nLCByZXEsIF9yZXMpIHtcbiAgICAgIGluY29taW5nLmhlYWRlcnNbJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbiddID0gJyonO1xuICAgICAgaWYgKGFwaS5jb25maWcoKS5kZXZNb2RlKSB7XG4gICAgICAgIGhwbUxvZy5pbmZvKGBQcm94eSByZWNpZXZlICR7cmVxLnVybCB8fCAnJ30sIHN0YXR1czogJHtpbmNvbWluZy5zdGF0dXNDb2RlIX1cXG5gLFxuICAgICAgICAgIEpTT04uc3RyaW5naWZ5KGluY29taW5nLmhlYWRlcnMsIG51bGwsICcgICcpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGhwbUxvZy5pbmZvKGBQcm94eSByZWNpZXZlICR7cmVxLnVybCB8fCAnJ30sIHN0YXR1czogJHtpbmNvbWluZy5zdGF0dXNDb2RlIX1gKTtcbiAgICAgIH1cbiAgICAgIGlmIChhcGkuY29uZmlnKCkuZGV2TW9kZSkge1xuXG4gICAgICAgIGNvbnN0IGN0ID0gaW5jb21pbmcuaGVhZGVyc1snY29udGVudC10eXBlJ107XG4gICAgICAgIGhwbUxvZy5pbmZvKGBSZXNwb25zZSAke3JlcS51cmwgfHwgJyd9IGhlYWRlcnM6XFxuYCwgaW5jb21pbmcuaGVhZGVycyk7XG4gICAgICAgIGNvbnN0IGlzVGV4dCA9IChjdCAmJiAvXFxiKGpzb258dGV4dClcXGIvaS50ZXN0KGN0KSk7XG4gICAgICAgIGlmIChpc1RleHQpIHtcbiAgICAgICAgICBpZiAoIWluY29taW5nLmNvbXBsZXRlKSB7XG4gICAgICAgICAgICBjb25zdCBidWZzID0gW10gYXMgc3RyaW5nW107XG4gICAgICAgICAgICB2b2lkIHJlYWRDb21wcmVzc2VkUmVzcG9uc2UoaW5jb21pbmcsIG5ldyBzdHJlYW0uV3JpdGFibGUoe1xuICAgICAgICAgICAgICB3cml0ZShjaHVuazogQnVmZmVyIHwgc3RyaW5nLCBfZW5jLCBjYikge1xuICAgICAgICAgICAgICAgIGJ1ZnMucHVzaChCdWZmZXIuaXNCdWZmZXIoY2h1bmspID8gY2h1bmsudG9TdHJpbmcoKSA6IGNodW5rKTtcbiAgICAgICAgICAgICAgICBjYigpO1xuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBmaW5hbChfY2IpIHtcbiAgICAgICAgICAgICAgICBocG1Mb2cuaW5mbyhgUmVzcG9uc2UgJHtyZXEudXJsIHx8ICcnfSB0ZXh0IGJvZHk6XFxuYCwgYnVmcy5qb2luKCcnKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKChpbmNvbWluZyBhcyB7Ym9keT86IEJ1ZmZlciB8IHN0cmluZ30pLmJvZHkpIHtcbiAgICAgICAgICAgIGhwbUxvZy5pbmZvKGBSZXNwb25zZSAke3JlcS51cmwgfHwgJyd9IHRleHQgYm9keTpcXG5gLCAoaW5jb21pbmcgYXMge2JvZHk/OiBCdWZmZXIgfCBzdHJpbmd9KS50b1N0cmluZygpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIG9uRXJyb3IoZXJyLCBfcmVxLCBfcmVzKSB7XG4gICAgICBocG1Mb2cud2FybihlcnIpO1xuICAgIH1cbiAgfTtcbiAgcmV0dXJuIHByb3h5TWlkT3B0O1xufVxuXG4vKiogT3B0aW9ucyBvZiBodHRwLXByb3h5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0SHR0cFByb3h5T3B0aW9ucyh0YXJnZXQ/OiBzdHJpbmcpOiBTZXJ2ZXJPcHRpb25zIHtcbiAgcmV0dXJuIHtcbiAgICB0YXJnZXQsXG4gICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgIHdzOiBmYWxzZSxcbiAgICBzZWN1cmU6IGZhbHNlLFxuICAgIGNvb2tpZURvbWFpblJld3JpdGU6IHsgJyonOiAnJyB9LFxuICAgIC8vIGxvZ0xldmVsOiAnZGVidWcnLFxuICAgIC8vIGxvZ1Byb3ZpZGVyOiBwcm92aWRlciA9PiBocG1Mb2csXG4gICAgcHJveHlUaW1lb3V0OiAxMDAwMFxuICB9O1xufVxuXG5jb25zdCBsb2cgPSBsb2dnZXIuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSArICcuY3JlYXRlUmVwbGF5UmVhZGFibGVGYWN0b3J5Jyk7XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSZXBsYXlSZWFkYWJsZUZhY3RvcnkoXG4gIHJlYWRhYmxlOiBOb2RlSlMuUmVhZGFibGVTdHJlYW0sIHRyYW5zZm9ybXM/OiBOb2RlSlMuUmVhZFdyaXRlU3RyZWFtW10sXG4gIG9wdHM/OiB7ZGVidWdJbmZvPzogc3RyaW5nOyBleHBlY3RMZW4/OiBudW1iZXJ9XG4pIHtcbiAgY29uc3QgYnVmJCA9IG5ldyByeC5SZXBsYXlTdWJqZWN0PEJ1ZmZlcj4oKTtcbiAgbGV0IGNhY2hlQnVmTGVuID0gMDtcbiAgY29uc3QgY2FjaGVXcml0ZXIgPSBuZXcgc3RyZWFtLldyaXRhYmxlKHtcbiAgICB3cml0ZShjaHVuazogQnVmZmVyLCBfZW5jLCBjYikge1xuICAgICAgY2FjaGVCdWZMZW4gKz0gY2h1bmsubGVuZ3RoO1xuICAgICAgLy8gbG9nLndhcm4oJ2NhY2hlIHVwZGF0ZWQ6JywgY2FjaGVCdWZMZW4pO1xuICAgICAgYnVmJC5uZXh0KGNodW5rKTtcbiAgICAgIGNiKCk7XG4gICAgfSxcbiAgICBmaW5hbChjYikge1xuICAgICAgYnVmJC5jb21wbGV0ZSgpO1xuICAgICAgaWYgKGNhY2hlQnVmTGVuID09PSAwIHx8IChvcHRzPy5leHBlY3RMZW4gIT0gbnVsbCAmJiBvcHRzPy5leHBlY3RMZW4gPiBjYWNoZUJ1ZkxlbiApKSB7XG4gICAgICAgIGxvZy5lcnJvcigob3B0cz8uZGVidWdJbmZvIHx8ICcnKSArIGAsIGNhY2hlIGNvbXBsZXRlZCBsZW5ndGggaXMgJHtjYWNoZUJ1Zkxlbn0gd2hpY2ggaXMgbGVzcyB0aGFuIGV4cGVjdGVkICR7b3B0cyEuZXhwZWN0TGVuIX1gKTtcbiAgICAgICAgY2IobmV3IEVycm9yKCdDYWNoZSBsZW5ndGggZG9lcyBub3QgbWVldCBleHBlY3RlZCBsZW5ndGgnKSk7XG4gICAgICB9XG4gICAgICBjYigpO1xuICAgIH1cbiAgfSk7XG5cbiAgbGV0IGNhY2hpbmcgPSBmYWxzZTtcbiAgLy8gbGV0IHJlYWRlckNvdW50ID0gMDtcblxuICByZXR1cm4gKCkgPT4ge1xuICAgIC8vIHJlYWRlckNvdW50Kys7XG4gICAgLy8gbGV0IGJ1ZmZlckxlbmd0aFN1bSA9IDA7XG4gICAgLy8gY29uc3QgcmVhZGVySWQgPSByZWFkZXJDb3VudDtcbiAgICBjb25zdCByZWFkQ2FsbCQgPSBuZXcgcnguU3ViamVjdDxzdHJlYW0uUmVhZGFibGU+KCk7XG4gICAgY29uc3QgcmVhZGFibGVTdHJlYW0gPSBuZXcgc3RyZWFtLlJlYWRhYmxlKHtcbiAgICAgIHJlYWQoX3NpemUpIHtcbiAgICAgICAgcmVhZENhbGwkLm5leHQodGhpcyk7XG4gICAgICAgIGlmICghY2FjaGluZykge1xuICAgICAgICAgIGNhY2hpbmcgPSB0cnVlO1xuICAgICAgICAgIGNvbnN0IHN0cmVhbXMgPSBbcmVhZGFibGUsXG4gICAgICAgICAgICAuLi4odHJhbnNmb3JtcyB8fCBbXSksIGNhY2hlV3JpdGVyXSBhcyBBcnJheTxOb2RlSlMuUmVhZGFibGVTdHJlYW0gfCBOb2RlSlMuV3JpdGFibGVTdHJlYW0gfCBOb2RlSlMuUmVhZFdyaXRlU3RyZWFtPjtcbiAgICAgICAgICAvLyBUbyB3b3JrYXJvdW5kIE5vZGVKUyAxNiBidWdcbiAgICAgICAgICBzdHJlYW1zLnJlZHVjZShcbiAgICAgICAgICAgIChwcmV2LCBjdXJyKSA9PiAocHJldiBhcyBOb2RlSlMuUmVhZGFibGVTdHJlYW0pXG4gICAgICAgICAgICAucGlwZShjdXJyIGFzIE5vZGVKUy5SZWFkV3JpdGVTdHJlYW0pKVxuICAgICAgICAgICAgLm9uKCdlcnJvcicsIGVyciA9PiBsb2cuZXJyb3IoZXJyKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJ4LnppcChyZWFkQ2FsbCQsIGJ1ZiQpXG4gICAgICAucGlwZShcbiAgICAgICAgb3AubWFwKChbcmVhZGFibGUsIGJ1Zl0sIF9pZHgpID0+IHtcbiAgICAgICAgICByZWFkYWJsZS5wdXNoKGJ1Zik7XG4gICAgICAgICAgLy8gYnVmZmVyTGVuZ3RoU3VtICs9IGJ1Zi5sZW5ndGg7XG4gICAgICAgICAgLy8gbG9nLmRlYnVnKGByZWFkZXI6ICR7cmVhZGVySWR9LCByZWFkcyAoJHtpZHh9KSAke2J1ZmZlckxlbmd0aFN1bX1gKTtcbiAgICAgICAgfSksXG4gICAgICAgIG9wLmZpbmFsaXplKCgpID0+IHtcbiAgICAgICAgICByZWFkYWJsZVN0cmVhbS5wdXNoKG51bGwpO1xuICAgICAgICB9KVxuICAgICAgKS5zdWJzY3JpYmUoKTtcblxuICAgIHJldHVybiByZWFkYWJsZVN0cmVhbTtcbiAgfTtcbn1cblxuLyoqXG4gKiBGaXggcHJveGllZCBib2R5IGlmIGJvZHlQYXJzZXIgaXMgaW52b2x2ZWQuXG4gKiBDb3BpZWQgZnJvbSBodHRwczovL2dpdGh1Yi5jb20vY2hpbXVyYWkvaHR0cC1wcm94eS1taWRkbGV3YXJlL2Jsb2IvbWFzdGVyL3NyYy9oYW5kbGVycy9maXgtcmVxdWVzdC1ib2R5LnRzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaXhSZXF1ZXN0Qm9keShwcm94eVJlcTogQ2xpZW50UmVxdWVzdCwgcmVxOiBJbmNvbWluZ01lc3NhZ2UpOiB2b2lkIHtcbiAgY29uc3QgcmVxdWVzdEJvZHkgPSAocmVxIGFzIFJlcXVlc3QpLmJvZHk7XG5cbiAgaWYgKCFyZXF1ZXN0Qm9keSB8fCAhT2JqZWN0LmtleXMocmVxdWVzdEJvZHkpLmxlbmd0aCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IGNvbnRlbnRUeXBlID0gcHJveHlSZXEuZ2V0SGVhZGVyKCdDb250ZW50LVR5cGUnKSBhcyBzdHJpbmc7XG4gIGNvbnN0IHdyaXRlQm9keSA9IChib2R5RGF0YTogc3RyaW5nKSA9PiB7XG4gICAgLy8gZGVlcGNvZGUgaWdub3JlIENvbnRlbnRMZW5ndGhJbkNvZGU6IGJvZHlQYXJzZXIgZml4XG4gICAgcHJveHlSZXEuc2V0SGVhZGVyKCdDb250ZW50LUxlbmd0aCcsIEJ1ZmZlci5ieXRlTGVuZ3RoKGJvZHlEYXRhKSk7XG4gICAgcHJveHlSZXEud3JpdGUoYm9keURhdGEpO1xuICB9O1xuXG4gIGlmIChjb250ZW50VHlwZSAmJiBjb250ZW50VHlwZS5pbmNsdWRlcygnYXBwbGljYXRpb24vanNvbicpKSB7XG4gICAgd3JpdGVCb2R5KEpTT04uc3RyaW5naWZ5KHJlcXVlc3RCb2R5KSk7XG4gIH1cblxuICBpZiAoY29udGVudFR5cGUgPT09ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnKSB7XG4gICAgd3JpdGVCb2R5KHF1ZXJ5c3RyaW5nLnN0cmluZ2lmeShyZXF1ZXN0Qm9keSkpO1xuICB9XG59XG4iXX0=