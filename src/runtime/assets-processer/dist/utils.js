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
const inspector_1 = __importDefault(require("inspector"));
const http_proxy_middleware_1 = require("http-proxy-middleware");
inspector_1.default.open(9222, 'localhost');
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
                debugger;
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
                log.error(((opts === null || opts === void 0 ? void 0 : opts.debugInfo) || '') + `, cache completed length is ${cacheBufLen} which is less than expected ${opts === null || opts === void 0 ? void 0 : opts.expectLen}`);
                throw new Error('Cache length does not meet expected length');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0RBQTRCO0FBRzVCLHNEQUEwQjtBQUMxQixvREFBdUI7QUFDdkIseUNBQTJCO0FBQzNCLG1EQUFxQztBQUNyQyx1REFBbUU7QUFDbkUsc0NBQWtDO0FBRWxDLDBEQUFrQztBQUNsQyxpRUFBK0Y7QUFFL0YsbUJBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO0FBQ2xDLE1BQU0sT0FBTyxHQUFHLGNBQU0sQ0FBQyxTQUFTLENBQUMsaUJBQUcsQ0FBQyxXQUFXLEdBQUcsWUFBWSxDQUFDLENBQUM7QUFDakU7Ozs7O0dBS0c7QUFDSCxTQUFnQix1QkFBdUIsQ0FBQyxHQUFZLEVBQUUsR0FBYSxFQUFFLElBQWtCO0lBQ3JGLE1BQU0sSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7SUFDeEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBRWpDLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUM7SUFFcEIsU0FBUyxLQUFLO1FBQ1osTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNqQyxPQUFPLENBQUMsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLE1BQU0sSUFBSSxHQUFHLENBQUMsV0FBVyxjQUFjLEdBQUcsQ0FBQyxVQUFVLHlCQUF5QixHQUFHLEdBQUcsU0FBUyxJQUFJO1lBQzVILFlBQVksSUFBSSxDQUFDLGtCQUFrQixFQUFFLElBQUksU0FBUyxNQUFNLEdBQUcsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzFGLENBQUM7SUFFRCxHQUFHLENBQUMsR0FBRyxHQUFHLFVBQVMsS0FBVyxFQUFFLFFBQWdDLEVBQUUsRUFBZTtR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QztvQkFDZixNQUFNLE9BQU8sR0FBRyxDQUFDLFFBQVE7d0JBQ3ZCLEdBQUcsQ0FBQyxVQUFVLElBQUksRUFBRSxDQUFDLEVBQUUsV0FBVyxDQUFrRixDQUFDO29CQUN2SCw4QkFBOEI7b0JBQzlCLE9BQU8sQ0FBQyxNQUFNLENBQ1osQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBRSxJQUE4Qjt5QkFDOUMsSUFBSSxDQUFDLElBQThCLENBQUMsQ0FBQzt5QkFDckMsRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztpQkFDdkM7WUFDSCxDQUFDO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsRUFBRSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDO2FBQ3BCLElBQUksQ0FDSCxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDOUIsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNuQixpQ0FBaUM7WUFDakMsdUVBQXVFO1FBQ3pFLENBQUMsQ0FBQyxFQUNGLEVBQUUsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFO1lBQ2YsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1QixDQUFDLENBQUMsQ0FDSCxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBRWhCLE9BQU8sY0FBYyxDQUFDO0lBQ3hCLENBQUMsQ0FBQztBQUNKLENBQUM7QUE3REQsa0VBNkRDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHN0cmVhbSBmcm9tICdzdHJlYW0nO1xuaW1wb3J0IHtDbGllbnRSZXF1ZXN0fSBmcm9tICdodHRwJztcbmltcG9ydCB7UmVxdWVzdCwgUmVzcG9uc2UsIE5leHRGdW5jdGlvbn0gZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgYXBpIGZyb20gJ19fcGxpbmsnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtyZWFkQ29tcHJlc3NlZFJlc3BvbnNlfSBmcm9tICdAd2ZoL2h0dHAtc2VydmVyL2Rpc3QvdXRpbHMnO1xuaW1wb3J0IHtsb2dnZXJ9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuXG5pbXBvcnQgaW5zcGVjdG9yIGZyb20gJ2luc3BlY3Rvcic7XG5pbXBvcnQgeyBjcmVhdGVQcm94eU1pZGRsZXdhcmUgYXMgcHJveHksIE9wdGlvbnMgYXMgUHJveHlPcHRpb25zfSBmcm9tICdodHRwLXByb3h5LW1pZGRsZXdhcmUnO1xuXG5pbnNwZWN0b3Iub3Blbig5MjIyLCAnbG9jYWxob3N0Jyk7XG5jb25zdCBsb2dUaW1lID0gbG9nZ2VyLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLnRpbWVzdGFtcCcpO1xuLyoqXG4gKiBNaWRkbGV3YXJlIGZvciBwcmludGluZyBlYWNoIHJlc3BvbnNlIHByb2Nlc3MgZHVyYXRpb24gdGltZSB0byBsb2dcbiAqIEBwYXJhbSByZXEgXG4gKiBAcGFyYW0gcmVzIFxuICogQHBhcmFtIG5leHQgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSZXNwb25zZVRpbWVzdGFtcChyZXE6IFJlcXVlc3QsIHJlczogUmVzcG9uc2UsIG5leHQ6IE5leHRGdW5jdGlvbikge1xuICBjb25zdCBkYXRlID0gbmV3IERhdGUoKTtcbiAgY29uc3Qgc3RhcnRUaW1lID0gZGF0ZS5nZXRUaW1lKCk7XG5cbiAgY29uc3QgZW5kID0gcmVzLmVuZDtcblxuICBmdW5jdGlvbiBwcmludCgpIHtcbiAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICBsb2dUaW1lLmluZm8oYHJlcXVlc3Q6ICR7cmVxLm1ldGhvZH0gJHtyZXEub3JpZ2luYWxVcmx9IHwgc3RhdHVzOiAke3Jlcy5zdGF0dXNDb2RlfSwgW3Jlc3BvbnNlIGR1cmF0aW9uOiAke25vdyAtIHN0YXJ0VGltZX1tc2AgK1xuICAgICAgYF0gKHNpbmNlICR7ZGF0ZS50b0xvY2FsZVRpbWVTdHJpbmcoKX0gJHtzdGFydFRpbWV9KSBbJHtyZXEuaGVhZGVyKCd1c2VyLWFnZW50JykhfV1gKTtcbiAgfVxuXG4gIHJlcy5lbmQgPSBmdW5jdGlvbihjaHVuaz86IGFueSwgZW5jb2Rpbmc/OiBzdHJpbmcgfCAoKCkgPT4gdm9pZCksIGNiPzogKCkgPT4gdm9pZCkge1xuICAgIGNvbnN0IGFyZ3YgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICAgIGNvbnN0IGxhc3RBcmcgPSBhcmd1bWVudHNbYXJndW1lbnRzLmxlbmd0aCAtIDFdO1xuICAgIGlmICh0eXBlb2YgbGFzdEFyZyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY29uc3Qgb3JpZ2luQ2IgPSBhcmd1bWVudHNbYXJndW1lbnRzLmxlbmd0aCAtIDFdO1xuICAgICAgYXJndlthcmd2Lmxlbmd0aCAtIDFdID0gKCkgPT4ge1xuICAgICAgICBvcmlnaW5DYigpO1xuICAgICAgICBwcmludCgpO1xuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKGFyZ3YubGVuZ3RoID09PSAwKSB7XG4gICAgICBhcmd2LnB1c2gobnVsbCwgcHJpbnQpO1xuICAgIH0gZWxzZSBpZiAoYXJndi5sZW5ndGggPT09IDEpIHtcbiAgICAgIGFyZ3YucHVzaChwcmludCk7XG4gICAgfVxuICAgIGNvbnN0IHJldCA9IGVuZC5hcHBseShyZXMsIGFyZ3YpO1xuICAgIHJldHVybiByZXQ7XG4gIH07XG5cbiAgbmV4dCgpO1xufVxuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gdXNlcyBodHRwLXByb3h5LW1pZGRsZXdhcmUgaW50ZXJuYWxseS5cbiAqIFxuICogQmUgYXdhcmUgd2l0aCBjb21tYW5kIGxpbmUgb3B0aW9uIFwiLS12ZXJib3NlXCIsIG9uY2UgZW5hYmxlIFwidmVyYm9zZVwiLCB0aGlzIGZ1bmN0aW9uIHdpbGxcbiAqIHJlYWQgKHBpcGUpIHJlbW90ZSBzZXJ2ZXIgcmVzcG9uc2UgYm9keSBpbnRvIGEgc3RyaW5nIGJ1ZmZlciBmb3IgYW55IG1lc3NhZ2Ugd2l0aCBjb250ZW50LXR5cGUgaXMgXCJ0ZXh0XCIgb3IgXCJqc29uXCIgYmFzZWRcbiAqIENyZWF0ZSBhbmQgdXNlIGFuIEhUVFAgcmVxdWVzdCBwcm94eSBmb3Igc3BlY2lmaWMgcmVxdWVzdCBwYXRoXG4gKiBAcGFyYW0gcHJveHlQYXRoIFxuICogQHBhcmFtIHRhcmdldFVybCBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldHVwSHR0cFByb3h5KHByb3h5UGF0aDogc3RyaW5nLCB0YXJnZXRVcmw6IHN0cmluZyxcbiAgb3B0czoge1xuICAgIC8qKiBCeXBhc3MgQ09SUyByZXN0cmljdCBvbiB0YXJnZXQgc2VydmVyLCBkZWZhdWx0IGlzIHRydWUgKi9cbiAgICBkZWxldGVPcmlnaW4/OiBib29sZWFuO1xuICAgIHBhdGhSZXdyaXRlPzogUHJveHlPcHRpb25zWydwYXRoUmV3cml0ZSddO1xuICAgIG9uUHJveHlSZXE/OiBQcm94eU9wdGlvbnNbJ29uUHJveHlSZXEnXTtcbiAgICBvblByb3h5UmVzPzogUHJveHlPcHRpb25zWydvblByb3h5UmVzJ107XG4gICAgb25FcnJvcj86IFByb3h5T3B0aW9uc1snb25FcnJvciddO1xuICAgIGJ1ZmZlcj86IFByb3h5T3B0aW9uc1snYnVmZmVyJ107XG4gICAgc2VsZkhhbmRsZVJlc3BvbnNlPzogUHJveHlPcHRpb25zWydzZWxmSGFuZGxlUmVzcG9uc2UnXTtcbiAgICBwcm94eVRpbWVvdXQ/OiBQcm94eU9wdGlvbnNbJ3Byb3h5VGltZW91dCddO1xuICB9ID0ge30pIHtcblxuICBwcm94eVBhdGggPSBfLnRyaW1FbmQocHJveHlQYXRoLCAnLycpO1xuICB0YXJnZXRVcmwgPSBfLnRyaW1FbmQodGFyZ2V0VXJsLCAnLycpO1xuXG4gIGNvbnN0IGRlZmF1bHRPcHQgPSBkZWZhdWx0UHJveHlPcHRpb25zKHByb3h5UGF0aCwgdGFyZ2V0VXJsKTtcblxuICBjb25zdCBwcm94eU1pZE9wdDogUHJveHlPcHRpb25zID0ge1xuICAgIC4uLmRlZmF1bHRPcHQsXG4gICAgb25Qcm94eVJlcSguLi5hcmdzKSB7XG4gICAgICBjb25zdCBvcmlnSGVhZGVyID0gYXJnc1swXS5nZXRIZWFkZXIoJ09yaWdpbicpO1xuICAgICAgZGVmYXVsdE9wdC5vblByb3h5UmVxKC4uLmFyZ3MpO1xuXG4gICAgICBpZiAob3B0cy5kZWxldGVPcmlnaW4gPT09IGZhbHNlKSB7XG4gICAgICAgIC8vIFJlY292ZXIgcmVtb3ZlZCBoZWFkZXIgXCJPcmlnaW5cIlxuICAgICAgICBhcmdzWzBdLnNldEhlYWRlcignT3JpZ2luJywgb3JpZ0hlYWRlciBhcyBzdHJpbmcpO1xuICAgICAgfVxuICAgICAgaWYgKG9wdHMub25Qcm94eVJlcSlcbiAgICAgICAgb3B0cy5vblByb3h5UmVxKC4uLmFyZ3MpO1xuICAgIH0sXG4gICAgb25Qcm94eVJlcyguLi5hcmdzKSB7XG4gICAgICBpZiAob3B0cy5vblByb3h5UmVzKVxuICAgICAgICBvcHRzLm9uUHJveHlSZXMoLi4uYXJncyk7XG4gICAgICBkZWZhdWx0T3B0Lm9uUHJveHlSZXMoLi4uYXJncyk7XG4gICAgfSxcbiAgICBvbkVycm9yKC4uLmFyZ3MpIHtcbiAgICAgIGRlZmF1bHRPcHQub25FcnJvciguLi5hcmdzKTtcbiAgICAgIGlmIChvcHRzLm9uRXJyb3IpXG4gICAgICAgIG9wdHMub25FcnJvciguLi5hcmdzKTtcbiAgICB9XG4gIH07XG5cblxuICBhcGkuZXhwcmVzc0FwcFNldChhcHAgPT4ge1xuICAgIGFwcC51c2UocHJveHlQYXRoLCBwcm94eShwcm94eU1pZE9wdCkpO1xuICB9KTtcbn1cblxuLypcbiAqIFRoaXMgaW50ZXJmYWNlIGlzIG5vdCBleHBvc2VkIGJ5IGh0dHAtcHJveHktbWlkZGxld2FyZSwgaXQgaXMgdXNlZCB3aGVuIG9wdGlvbiBcImZvbGxvd1JlZGlyZWN0XCJcbiAqIGlzIGVuYWJsZWQsIG1vc3QgbGlrZWx5IHRoaXMgaXMgYmVoYXZpb3Igb2YgaHR0cC1wcm94eVxuICovXG5pbnRlcmZhY2UgUmVkaXJlY3RhYmxlUmVxdWVzdCB7XG4gIF9jdXJyZW50UmVxdWVzdDogQ2xpZW50UmVxdWVzdDtcbn1cblxuZnVuY3Rpb24gaXNSZWRpcmVjdGFibGVSZXF1ZXN0KHJlcTogdW5rbm93bik6IHJlcSBpcyBSZWRpcmVjdGFibGVSZXF1ZXN0IHtcbiAgcmV0dXJuIChyZXEgYXMgUmVkaXJlY3RhYmxlUmVxdWVzdCkuX2N1cnJlbnRSZXF1ZXN0ICE9IG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0UHJveHlPcHRpb25zKHByb3h5UGF0aDogc3RyaW5nLCB0YXJnZXRVcmw6IHN0cmluZykge1xuICBwcm94eVBhdGggPSBfLnRyaW1FbmQocHJveHlQYXRoLCAnLycpO1xuICB0YXJnZXRVcmwgPSBfLnRyaW1FbmQodGFyZ2V0VXJsLCAnLycpO1xuICBjb25zdCB7IHByb3RvY29sLCBob3N0LCBwYXRobmFtZSB9ID0gbmV3IFVSTCh0YXJnZXRVcmwpO1xuXG4gIGNvbnN0IHBhdFBhdGggPSBuZXcgUmVnRXhwKCdeJyArIF8uZXNjYXBlUmVnRXhwKHByb3h5UGF0aCkgKyAnKC98JCknKTtcbiAgY29uc3QgaHBtTG9nID0gbG9nZ2VyLmdldExvZ2dlcignSFBNLicgKyB0YXJnZXRVcmwpO1xuXG4gIGNvbnN0IHByb3h5TWlkT3B0OiBQcm94eU9wdGlvbnMgJiAge1tLIGluICdwYXRoUmV3cml0ZScgfCAnb25Qcm94eVJlcScgfCAnb25Qcm94eVJlcycgfCAnb25FcnJvciddOiBOb25OdWxsYWJsZTxQcm94eU9wdGlvbnNbS10+fSA9IHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbWF4LWxlblxuICAgIHRhcmdldDogcHJvdG9jb2wgKyAnLy8nICsgaG9zdCxcbiAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgd3M6IGZhbHNlLFxuICAgIHNlY3VyZTogZmFsc2UsXG4gICAgY29va2llRG9tYWluUmV3cml0ZTogeyAnKic6ICcnIH0sXG4gICAgcGF0aFJld3JpdGU6IChwYXRoLCByZXEpID0+IHtcbiAgICAgIC8vIGhwbUxvZy53YXJuKCdwYXRQYXRoPScsIHBhdFBhdGgsICdwYXRoPScsIHBhdGgpO1xuICAgICAgY29uc3QgcmV0ID0gcGF0aCAmJiBwYXRoLnJlcGxhY2UocGF0UGF0aCwgXy50cmltRW5kKHBhdGhuYW1lLCAnLycpICsgJy8nKTtcbiAgICAgIC8vIGhwbUxvZy5pbmZvKGBwcm94eSB0byBwYXRoOiAke3JlcS5tZXRob2R9ICR7cHJvdG9jb2wgKyAnLy8nICsgaG9zdH0ke3JldH0sIHJlcS51cmwgPSAke3JlcS51cmx9YCk7XG4gICAgICByZXR1cm4gcmV0O1xuICAgIH0sXG4gICAgbG9nTGV2ZWw6ICdkZWJ1ZycsXG4gICAgbG9nUHJvdmlkZXI6IHByb3ZpZGVyID0+IGhwbUxvZyxcbiAgICBwcm94eVRpbWVvdXQ6IDEwMDAwLFxuICAgIG9uUHJveHlSZXEocHJveHlSZXEsIHJlcSwgcmVzLCAuLi5yZXN0KSB7XG4gICAgICAvLyBUaGlzIHByb3h5UmVxIGNvdWxkIGJlIFwiUmVkaXJlY3RSZXF1ZXN0XCIgaWYgb3B0aW9uIFwiZm9sbG93UmVkaXJlY3RcIiBpcyBvblxuICAgICAgaWYgKGlzUmVkaXJlY3RhYmxlUmVxdWVzdChwcm94eVJlcSkpIHtcbiAgICAgICAgZGVidWdnZXI7XG4gICAgICAgIGhwbUxvZy5pbmZvKGBQcm94eSByZXF1ZXN0IHRvICR7cHJvdG9jb2x9Ly8ke2hvc3R9JHtwcm94eVJlcS5fY3VycmVudFJlcXVlc3QucGF0aH0gbWV0aG9kOiAke3JlcS5tZXRob2QgfHwgJ3Vrbm93bid9LCAke0pTT04uc3RyaW5naWZ5KFxuICAgICAgICAgIHByb3h5UmVxLl9jdXJyZW50UmVxdWVzdC5nZXRIZWFkZXJzKCksIG51bGwsICcgICcpfWApO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcHJveHlSZXEucmVtb3ZlSGVhZGVyKCdPcmlnaW4nKTsgLy8gQnlwYXNzIENPUlMgcmVzdHJpY3Qgb24gdGFyZ2V0IHNlcnZlclxuICAgICAgICBjb25zdCByZWZlcmVyID0gcHJveHlSZXEuZ2V0SGVhZGVyKCdyZWZlcmVyJyk7XG4gICAgICAgIGlmICh0eXBlb2YgcmVmZXJlciA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICBwcm94eVJlcS5zZXRIZWFkZXIoJ3JlZmVyZXInLCBgJHtwcm90b2NvbH0vLyR7aG9zdH0ke25ldyBVUkwocmVmZXJlcikucGF0aG5hbWV9YCk7XG4gICAgICAgIH1cbiAgICAgICAgaHBtTG9nLmluZm8oYFByb3h5IHJlcXVlc3QgdG8gJHtwcm90b2NvbH0vLyR7aG9zdH0ke3Byb3h5UmVxLnBhdGh9IG1ldGhvZDogJHtyZXEubWV0aG9kIHx8ICd1a25vd24nfSwgJHtKU09OLnN0cmluZ2lmeShcbiAgICAgICAgICBwcm94eVJlcS5nZXRIZWFkZXJzKCksIG51bGwsICcgICcpfWApO1xuICAgICAgfVxuICAgIH0sXG4gICAgb25Qcm94eVJlcyhpbmNvbWluZywgcmVxLCByZXMpIHtcbiAgICAgIGluY29taW5nLmhlYWRlcnNbJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbiddID0gJyonO1xuICAgICAgaWYgKGFwaS5jb25maWcoKS5kZXZNb2RlKSB7XG4gICAgICAgIGhwbUxvZy5pbmZvKGBQcm94eSByZWNpZXZlICR7cmVxLnVybCB8fCAnJ30sIHN0YXR1czogJHtpbmNvbWluZy5zdGF0dXNDb2RlIX1cXG5gLFxuICAgICAgICAgIEpTT04uc3RyaW5naWZ5KGluY29taW5nLmhlYWRlcnMsIG51bGwsICcgICcpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGhwbUxvZy5pbmZvKGBQcm94eSByZWNpZXZlICR7cmVxLnVybCB8fCAnJ30sIHN0YXR1czogJHtpbmNvbWluZy5zdGF0dXNDb2RlIX1gKTtcbiAgICAgIH1cbiAgICAgIGlmIChhcGkuY29uZmlnKCkuZGV2TW9kZSkge1xuXG4gICAgICAgIGNvbnN0IGN0ID0gaW5jb21pbmcuaGVhZGVyc1snY29udGVudC10eXBlJ107XG4gICAgICAgIGhwbUxvZy5pbmZvKGBSZXNwb25zZSAke3JlcS51cmwgfHwgJyd9IGhlYWRlcnM6XFxuYCwgaW5jb21pbmcuaGVhZGVycyk7XG4gICAgICAgIGNvbnN0IGlzVGV4dCA9IChjdCAmJiAvXFxiKGpzb258dGV4dClcXGIvaS50ZXN0KGN0KSk7XG4gICAgICAgIGlmIChpc1RleHQpIHtcbiAgICAgICAgICBpZiAoIWluY29taW5nLmNvbXBsZXRlKSB7XG4gICAgICAgICAgICBjb25zdCBidWZzID0gW10gYXMgc3RyaW5nW107XG4gICAgICAgICAgICB2b2lkIHJlYWRDb21wcmVzc2VkUmVzcG9uc2UoaW5jb21pbmcsIG5ldyBzdHJlYW0uV3JpdGFibGUoe1xuICAgICAgICAgICAgICB3cml0ZShjaHVuazogQnVmZmVyIHwgc3RyaW5nLCBlbmMsIGNiKSB7XG4gICAgICAgICAgICAgICAgYnVmcy5wdXNoKEJ1ZmZlci5pc0J1ZmZlcihjaHVuaykgPyBjaHVuay50b1N0cmluZygpIDogY2h1bmspO1xuICAgICAgICAgICAgICAgIGNiKCk7XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGZpbmFsKGNiKSB7XG4gICAgICAgICAgICAgICAgaHBtTG9nLmluZm8oYFJlc3BvbnNlICR7cmVxLnVybCB8fCAnJ30gdGV4dCBib2R5OlxcbmAsIGJ1ZnMuam9pbignJykpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KSk7XG4gICAgICAgICAgfSBlbHNlIGlmICgoaW5jb21pbmcgYXMge2JvZHk/OiBCdWZmZXIgfCBzdHJpbmd9KS5ib2R5KSB7XG4gICAgICAgICAgICBocG1Mb2cuaW5mbyhgUmVzcG9uc2UgJHtyZXEudXJsIHx8ICcnfSB0ZXh0IGJvZHk6XFxuYCwgKGluY29taW5nIGFzIHtib2R5PzogQnVmZmVyIHwgc3RyaW5nfSkudG9TdHJpbmcoKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBvbkVycm9yKGVyciwgcmVxLCByZXMpIHtcbiAgICAgIGhwbUxvZy53YXJuKGVycik7XG4gICAgfVxuICB9O1xuICByZXR1cm4gcHJveHlNaWRPcHQ7XG59XG5cbmNvbnN0IGxvZyA9IGxvZ2dlci5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5jcmVhdGVSZXBsYXlSZWFkYWJsZUZhY3RvcnknKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVJlcGxheVJlYWRhYmxlRmFjdG9yeShcbiAgcmVhZGFibGU6IE5vZGVKUy5SZWFkYWJsZVN0cmVhbSwgdHJhbnNmb3Jtcz86IE5vZGVKUy5SZWFkV3JpdGVTdHJlYW1bXSxcbiAgb3B0cz86IHtkZWJ1Z0luZm8/OiBzdHJpbmc7IGV4cGVjdExlbj86IG51bWJlcn1cbikge1xuICBjb25zdCBidWYkID0gbmV3IHJ4LlJlcGxheVN1YmplY3Q8QnVmZmVyPigpO1xuICBsZXQgY2FjaGVCdWZMZW4gPSAwO1xuICBjb25zdCBjYWNoZVdyaXRlciA9IG5ldyBzdHJlYW0uV3JpdGFibGUoe1xuICAgIHdyaXRlKGNodW5rOiBCdWZmZXIsIF9lbmMsIGNiKSB7XG4gICAgICBjYWNoZUJ1ZkxlbiArPSBjaHVuay5sZW5ndGg7XG4gICAgICAvLyBsb2cud2FybignY2FjaGUgdXBkYXRlZDonLCBjYWNoZUJ1Zkxlbik7XG4gICAgICBidWYkLm5leHQoY2h1bmspO1xuICAgICAgY2IoKTtcbiAgICB9LFxuICAgIGZpbmFsKGNiKSB7XG4gICAgICBidWYkLmNvbXBsZXRlKCk7XG4gICAgICBpZiAoY2FjaGVCdWZMZW4gPT09IDAgfHwgKG9wdHM/LmV4cGVjdExlbiAhPSBudWxsICYmIG9wdHM/LmV4cGVjdExlbiA+IGNhY2hlQnVmTGVuICkpIHtcbiAgICAgICAgbG9nLmVycm9yKChvcHRzPy5kZWJ1Z0luZm8gfHwgJycpICsgYCwgY2FjaGUgY29tcGxldGVkIGxlbmd0aCBpcyAke2NhY2hlQnVmTGVufSB3aGljaCBpcyBsZXNzIHRoYW4gZXhwZWN0ZWQgJHtvcHRzPy5leHBlY3RMZW59YCk7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignQ2FjaGUgbGVuZ3RoIGRvZXMgbm90IG1lZXQgZXhwZWN0ZWQgbGVuZ3RoJyk7XG4gICAgICB9XG4gICAgICBjYigpO1xuICAgIH1cbiAgfSk7XG5cbiAgbGV0IGNhY2hpbmcgPSBmYWxzZTtcbiAgLy8gbGV0IHJlYWRlckNvdW50ID0gMDtcblxuICByZXR1cm4gKCkgPT4ge1xuICAgIC8vIHJlYWRlckNvdW50Kys7XG4gICAgLy8gbGV0IGJ1ZmZlckxlbmd0aFN1bSA9IDA7XG4gICAgLy8gY29uc3QgcmVhZGVySWQgPSByZWFkZXJDb3VudDtcbiAgICBjb25zdCByZWFkQ2FsbCQgPSBuZXcgcnguU3ViamVjdDxzdHJlYW0uUmVhZGFibGU+KCk7XG4gICAgY29uc3QgcmVhZGFibGVTdHJlYW0gPSBuZXcgc3RyZWFtLlJlYWRhYmxlKHtcbiAgICAgIHJlYWQoX3NpemUpIHtcbiAgICAgICAgcmVhZENhbGwkLm5leHQodGhpcyk7XG4gICAgICAgIGlmICghY2FjaGluZykge1xuICAgICAgICAgIGNhY2hpbmcgPSB0cnVlO1xuICAgICAgICAgIGNvbnN0IHN0cmVhbXMgPSBbcmVhZGFibGUsXG4gICAgICAgICAgICAuLi4odHJhbnNmb3JtcyB8fCBbXSksIGNhY2hlV3JpdGVyXSBhcyBBcnJheTxOb2RlSlMuUmVhZGFibGVTdHJlYW0gfCBOb2RlSlMuV3JpdGFibGVTdHJlYW0gfCBOb2RlSlMuUmVhZFdyaXRlU3RyZWFtPjtcbiAgICAgICAgICAvLyBUbyB3b3JrYXJvdW5kIE5vZGVKUyAxNiBidWdcbiAgICAgICAgICBzdHJlYW1zLnJlZHVjZShcbiAgICAgICAgICAgIChwcmV2LCBjdXJyKSA9PiAocHJldiBhcyBOb2RlSlMuUmVhZGFibGVTdHJlYW0pXG4gICAgICAgICAgICAucGlwZShjdXJyIGFzIE5vZGVKUy5SZWFkV3JpdGVTdHJlYW0pKVxuICAgICAgICAgICAgLm9uKCdlcnJvcicsIGVyciA9PiBsb2cuZXJyb3IoZXJyKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJ4LnppcChyZWFkQ2FsbCQsIGJ1ZiQpXG4gICAgICAucGlwZShcbiAgICAgICAgb3AubWFwKChbcmVhZGFibGUsIGJ1Zl0sIGlkeCkgPT4ge1xuICAgICAgICAgIHJlYWRhYmxlLnB1c2goYnVmKTtcbiAgICAgICAgICAvLyBidWZmZXJMZW5ndGhTdW0gKz0gYnVmLmxlbmd0aDtcbiAgICAgICAgICAvLyBsb2cuZGVidWcoYHJlYWRlcjogJHtyZWFkZXJJZH0sIHJlYWRzICgke2lkeH0pICR7YnVmZmVyTGVuZ3RoU3VtfWApO1xuICAgICAgICB9KSxcbiAgICAgICAgb3AuZmluYWxpemUoKCkgPT4ge1xuICAgICAgICAgIHJlYWRhYmxlU3RyZWFtLnB1c2gobnVsbCk7XG4gICAgICAgIH0pXG4gICAgICApLnN1YnNjcmliZSgpO1xuXG4gICAgcmV0dXJuIHJlYWRhYmxlU3RyZWFtO1xuICB9O1xufVxuXG4iXX0=