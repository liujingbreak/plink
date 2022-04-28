"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
exports.createBufferForHttpProxy = exports.fixRequestBody = exports.createReplayReadableFactory = exports.defaultHttpProxyOptions = exports.defaultProxyOptions = exports.isRedirectableRequest = exports.setupHttpProxy = exports.createResponseTimestamp = void 0;
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
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
 * This is not working for POST request according to my experience in Node 16.3.0, due to
 * by the time node-http-proxy emits event "proxyReq", `req.pipe(proxyReq)` has already
 * been executed, meaning the proxyReq has "end" itself as reacting to req.complete: true
 * or end event.
 *
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
        if (proxyReq.headersSent) {
            log.error('proxy request header is sent earlier than the moment of fixRequestBody()!');
        }
        else {
            // deepcode ignore ContentLengthInCode: bodyParser fix
            const len = Buffer.byteLength(bodyData);
            proxyReq.setHeader('Content-Length', len);
            log.info('fix proxy body', contentType, len);
            proxyReq.write(bodyData);
        }
    };
    if (contentType && contentType.includes('application/json')) {
        writeBody(JSON.stringify(requestBody));
    }
    else if (contentType === null || contentType === void 0 ? void 0 : contentType.includes('application/x-www-form-urlencoded')) {
        writeBody(querystring.stringify(requestBody));
    }
}
exports.fixRequestBody = fixRequestBody;
function createBufferForHttpProxy(req) {
    const contentType = req.headers['content-type'];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const body = req.body;
    if (body == null)
        return undefined;
    if (contentType && contentType.includes('application/json')) {
        const buf = Buffer.from(JSON.stringify(body));
        return {
            readable: new stream_1.default.Readable({
                read() {
                    this.push(buf);
                    this.push(null);
                }
            }),
            length: buf.length
        };
    }
    else if (contentType === null || contentType === void 0 ? void 0 : contentType.includes('application/x-www-form-urlencoded')) {
        const buf = Buffer.from(querystring.stringify(body));
        return {
            readable: new stream_1.default.Readable({
                read() {
                    this.push(buf);
                    this.push(null);
                }
            }),
            length: buf.length
        };
    }
    else if (Buffer.isBuffer(body)) {
        return {
            readable: new stream_1.default.Readable({
                read() {
                    this.push(body);
                    this.push(null);
                }
            }),
            length: body.length
        };
    }
}
exports.createBufferForHttpProxy = createBufferForHttpProxy;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDBEQUEwRDtBQUMxRCw0REFBNEQ7QUFDNUQsb0RBQTRCO0FBRTVCLHlEQUEyQztBQUUzQyxzREFBMEI7QUFDMUIsb0RBQXVCO0FBQ3ZCLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMsdURBQW1FO0FBQ25FLHNDQUFrQztBQUVsQyxpRUFBK0Y7QUFFL0YsTUFBTSxPQUFPLEdBQUcsY0FBTSxDQUFDLFNBQVMsQ0FBQyxpQkFBRyxDQUFDLFdBQVcsR0FBRyxZQUFZLENBQUMsQ0FBQztBQUNqRTs7Ozs7R0FLRztBQUNILFNBQWdCLHVCQUF1QixDQUFDLEdBQVksRUFBRSxHQUFhLEVBQUUsSUFBa0I7SUFDckYsTUFBTSxJQUFJLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQztJQUN4QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7SUFFakMsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLEdBQUcsQ0FBQztJQUVwQixTQUFTLEtBQUs7UUFDWixNQUFNLEdBQUcsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2pDLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsTUFBTSxJQUFJLEdBQUcsQ0FBQyxXQUFXLGNBQWMsR0FBRyxDQUFDLFVBQVUseUJBQXlCLEdBQUcsR0FBRyxTQUFTLElBQUk7WUFDNUgsWUFBWSxJQUFJLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxTQUFTLE1BQU0sR0FBRyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUUsR0FBRyxDQUFDLENBQUM7SUFDMUYsQ0FBQztJQUVELEdBQUcsQ0FBQyxHQUFHLEdBQUcsVUFBUyxNQUFZLEVBQUUsU0FBaUMsRUFBRSxHQUFnQjtRQUNsRixNQUFNLElBQUksR0FBRyxL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TUFBTTtTQUNuQixDQUFDO0tBQ0g7U0FBTSxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDaEMsT0FBTztZQUNMLFFBQVEsRUFBRSxJQUFJLGdCQUFNLENBQUMsUUFBUSxDQUFDO2dCQUM1QixJQUFJO29CQUNGLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ2hCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ2xCLENBQUM7YUFDRixDQUFDO1lBQ0YsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO1NBQ3BCLENBQUM7S0FDSDtBQUNILENBQUM7QUF4Q0QsNERBd0NDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hcmd1bWVudCAqL1xuLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50ICovXG5pbXBvcnQgc3RyZWFtIGZyb20gJ3N0cmVhbSc7XG5pbXBvcnQge0NsaWVudFJlcXVlc3QsIEluY29taW5nTWVzc2FnZX0gZnJvbSAnaHR0cCc7XG5pbXBvcnQgKiBhcyBxdWVyeXN0cmluZyBmcm9tICdxdWVyeXN0cmluZyc7XG5pbXBvcnQge1JlcXVlc3QsIFJlc3BvbnNlLCBOZXh0RnVuY3Rpb259IGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IGFwaSBmcm9tICdfX3BsaW5rJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7cmVhZENvbXByZXNzZWRSZXNwb25zZX0gZnJvbSAnQHdmaC9odHRwLXNlcnZlci9kaXN0L3V0aWxzJztcbmltcG9ydCB7bG9nZ2VyfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCB7U2VydmVyT3B0aW9uc30gZnJvbSAnaHR0cC1wcm94eSc7XG5pbXBvcnQgeyBjcmVhdGVQcm94eU1pZGRsZXdhcmUgYXMgcHJveHksIE9wdGlvbnMgYXMgUHJveHlPcHRpb25zfSBmcm9tICdodHRwLXByb3h5LW1pZGRsZXdhcmUnO1xuXG5jb25zdCBsb2dUaW1lID0gbG9nZ2VyLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLnRpbWVzdGFtcCcpO1xuLyoqXG4gKiBNaWRkbGV3YXJlIGZvciBwcmludGluZyBlYWNoIHJlc3BvbnNlIHByb2Nlc3MgZHVyYXRpb24gdGltZSB0byBsb2dcbiAqIEBwYXJhbSByZXEgXG4gKiBAcGFyYW0gcmVzIFxuICogQHBhcmFtIG5leHQgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSZXNwb25zZVRpbWVzdGFtcChyZXE6IFJlcXVlc3QsIHJlczogUmVzcG9uc2UsIG5leHQ6IE5leHRGdW5jdGlvbikge1xuICBjb25zdCBkYXRlID0gbmV3IERhdGUoKTtcbiAgY29uc3Qgc3RhcnRUaW1lID0gZGF0ZS5nZXRUaW1lKCk7XG5cbiAgY29uc3QgZW5kID0gcmVzLmVuZDtcblxuICBmdW5jdGlvbiBwcmludCgpIHtcbiAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICBsb2dUaW1lLmluZm8oYHJlcXVlc3Q6ICR7cmVxLm1ldGhvZH0gJHtyZXEub3JpZ2luYWxVcmx9IHwgc3RhdHVzOiAke3Jlcy5zdGF0dXNDb2RlfSwgW3Jlc3BvbnNlIGR1cmF0aW9uOiAke25vdyAtIHN0YXJ0VGltZX1tc2AgK1xuICAgICAgYF0gKHNpbmNlICR7ZGF0ZS50b0xvY2FsZVRpbWVTdHJpbmcoKX0gJHtzdGFydFRpbWV9KSBbJHtyZXEuaGVhZGVyKCd1c2VyLWFnZW50JykhfV1gKTtcbiAgfVxuXG4gIHJlcy5lbmQgPSBmdW5jdGlvbihfY2h1bms/OiBhbnksIF9lbmNvZGluZz86IHN0cmluZyB8ICgoKSA9PiB2b2lkKSwgX2NiPzogKCkgPT4gdm9pZCkge1xuICAgIGNvbnN0IGFyZ3YgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICAgIGNvbnN0IGxhc3RBcmcgPSBhcmd1bWVudHNbYXJndW1lbnRzLmxlbmd0aCAtIDFdO1xuICAgIGlmICh0eXBlb2YgbGFzdEFyZyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY29uc3Qgb3JpZ2luQ2IgPSBhcmd1bWVudHNbYXJndW1lbnRzLmxlbmd0aCAtIDFdO1xuICAgICAgYXJndlthcmd2Lmxlbmd0aCAtIDFdID0gKCkgPT4ge1xuICAgICAgICBvcmlnaW5DYigpO1xuICAgICAgICBwcmludCgpO1xuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKGFyZ3YubGVuZ3RoID09PSAwKSB7XG4gICAgICBhcmd2LnB1c2gobnVsbCwgcHJpbnQpO1xuICAgIH0gZWxzZSBpZiAoYXJndi5sZW5ndGggPT09IDEpIHtcbiAgICAgIGFyZ3YucHVzaChwcmludCk7XG4gICAgfVxuICAgIGNvbnN0IHJldCA9IGVuZC5hcHBseShyZXMsIGFyZ3YgYXMgYW55KTtcbiAgICByZXR1cm4gcmV0O1xuICB9O1xuXG4gIG5leHQoKTtcbn1cblxuLyoqXG4gKiBUaGlzIGZ1bmN0aW9uIHVzZXMgaHR0cC1wcm94eS1taWRkbGV3YXJlIGludGVybmFsbHkuXG4gKiBcbiAqIEJlIGF3YXJlIHdpdGggY29tbWFuZCBsaW5lIG9wdGlvbiBcIi0tdmVyYm9zZVwiLCBvbmNlIGVuYWJsZSBcInZlcmJvc2VcIiwgdGhpcyBmdW5jdGlvbiB3aWxsXG4gKiByZWFkIChwaXBlKSByZW1vdGUgc2VydmVyIHJlc3BvbnNlIGJvZHkgaW50byBhIHN0cmluZyBidWZmZXIgZm9yIGFueSBtZXNzYWdlIHdpdGggY29udGVudC10eXBlIGlzIFwidGV4dFwiIG9yIFwianNvblwiIGJhc2VkXG4gKiBDcmVhdGUgYW5kIHVzZSBhbiBIVFRQIHJlcXVlc3QgcHJveHkgZm9yIHNwZWNpZmljIHJlcXVlc3QgcGF0aFxuICogQHBhcmFtIHByb3h5UGF0aCBcbiAqIEBwYXJhbSB0YXJnZXRVcmwgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXR1cEh0dHBQcm94eShwcm94eVBhdGg6IHN0cmluZywgdGFyZ2V0VXJsOiBzdHJpbmcsXG4gIG9wdHM6IHtcbiAgICAvKiogQnlwYXNzIENPUlMgcmVzdHJpY3Qgb24gdGFyZ2V0IHNlcnZlciwgZGVmYXVsdCBpcyB0cnVlICovXG4gICAgZGVsZXRlT3JpZ2luPzogYm9vbGVhbjtcbiAgICBwYXRoUmV3cml0ZT86IFByb3h5T3B0aW9uc1sncGF0aFJld3JpdGUnXTtcbiAgICBvblByb3h5UmVxPzogUHJveHlPcHRpb25zWydvblByb3h5UmVxJ107XG4gICAgb25Qcm94eVJlcz86IFByb3h5T3B0aW9uc1snb25Qcm94eVJlcyddO1xuICAgIG9uRXJyb3I/OiBQcm94eU9wdGlvbnNbJ29uRXJyb3InXTtcbiAgICBidWZmZXI/OiBQcm94eU9wdGlvbnNbJ2J1ZmZlciddO1xuICAgIHNlbGZIYW5kbGVSZXNwb25zZT86IFByb3h5T3B0aW9uc1snc2VsZkhhbmRsZVJlc3BvbnNlJ107XG4gICAgcHJveHlUaW1lb3V0PzogUHJveHlPcHRpb25zWydwcm94eVRpbWVvdXQnXTtcbiAgfSA9IHt9KSB7XG5cbiAgcHJveHlQYXRoID0gXy50cmltRW5kKHByb3h5UGF0aCwgJy8nKTtcbiAgdGFyZ2V0VXJsID0gXy50cmltRW5kKHRhcmdldFVybCwgJy8nKTtcblxuICBjb25zdCBkZWZhdWx0T3B0ID0gZGVmYXVsdFByb3h5T3B0aW9ucyhwcm94eVBhdGgsIHRhcmdldFVybCk7XG5cbiAgY29uc3QgcHJveHlNaWRPcHQ6IFByb3h5T3B0aW9ucyA9IHtcbiAgICAuLi5kZWZhdWx0T3B0LFxuICAgIG9uUHJveHlSZXEoLi4uYXJncykge1xuICAgICAgY29uc3Qgb3JpZ0hlYWRlciA9IGFyZ3NbMF0uZ2V0SGVhZGVyKCdPcmlnaW4nKTtcbiAgICAgIGRlZmF1bHRPcHQub25Qcm94eVJlcSguLi5hcmdzKTtcblxuICAgICAgaWYgKG9wdHMuZGVsZXRlT3JpZ2luID09PSBmYWxzZSkge1xuICAgICAgICAvLyBSZWNvdmVyIHJlbW92ZWQgaGVhZGVyIFwiT3JpZ2luXCJcbiAgICAgICAgYXJnc1swXS5zZXRIZWFkZXIoJ09yaWdpbicsIG9yaWdIZWFkZXIgYXMgc3RyaW5nKTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRzLm9uUHJveHlSZXEpXG4gICAgICAgIG9wdHMub25Qcm94eVJlcSguLi5hcmdzKTtcbiAgICB9LFxuICAgIG9uUHJveHlSZXMoLi4uYXJncykge1xuICAgICAgaWYgKG9wdHMub25Qcm94eVJlcylcbiAgICAgICAgb3B0cy5vblByb3h5UmVzKC4uLmFyZ3MpO1xuICAgICAgZGVmYXVsdE9wdC5vblByb3h5UmVzKC4uLmFyZ3MpO1xuICAgIH0sXG4gICAgb25FcnJvciguLi5hcmdzKSB7XG4gICAgICBkZWZhdWx0T3B0Lm9uRXJyb3IoLi4uYXJncyk7XG4gICAgICBpZiAob3B0cy5vbkVycm9yKVxuICAgICAgICBvcHRzLm9uRXJyb3IoLi4uYXJncyk7XG4gICAgfVxuICB9O1xuXG5cbiAgYXBpLmV4cHJlc3NBcHBTZXQoYXBwID0+IHtcbiAgICBhcHAudXNlKHByb3h5UGF0aCwgcHJveHkocHJveHlNaWRPcHQpKTtcbiAgfSk7XG59XG5cbi8qXG4gKiBUaGlzIGludGVyZmFjZSBpcyBub3QgZXhwb3NlZCBieSBodHRwLXByb3h5LW1pZGRsZXdhcmUsIGl0IGlzIHVzZWQgd2hlbiBvcHRpb24gXCJmb2xsb3dSZWRpcmVjdFwiXG4gKiBpcyBlbmFibGVkLCBtb3N0IGxpa2VseSB0aGlzIGlzIGJlaGF2aW9yIG9mIGh0dHAtcHJveHlcbiAqL1xuaW50ZXJmYWNlIFJlZGlyZWN0YWJsZVJlcXVlc3Qge1xuICBfY3VycmVudFJlcXVlc3Q6IENsaWVudFJlcXVlc3Q7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1JlZGlyZWN0YWJsZVJlcXVlc3QocmVxOiB1bmtub3duKTogcmVxIGlzIFJlZGlyZWN0YWJsZVJlcXVlc3Qge1xuICByZXR1cm4gKHJlcSBhcyBSZWRpcmVjdGFibGVSZXF1ZXN0KS5fY3VycmVudFJlcXVlc3QgIT0gbnVsbDtcbn1cblxuLyoqXG4gKiBPcHRpb25zIG9mIGh0dHAtcHJveHktbWlkZGxld2FyZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVmYXVsdFByb3h5T3B0aW9ucyhwcm94eVBhdGg6IHN0cmluZywgdGFyZ2V0VXJsOiBzdHJpbmcpIHtcbiAgcHJveHlQYXRoID0gXy50cmltRW5kKHByb3h5UGF0aCwgJy8nKTtcbiAgdGFyZ2V0VXJsID0gXy50cmltRW5kKHRhcmdldFVybCwgJy8nKTtcbiAgY29uc3QgeyBwcm90b2NvbCwgaG9zdCwgcGF0aG5hbWUgfSA9IG5ldyBVUkwodGFyZ2V0VXJsKTtcblxuICBjb25zdCBwYXRQYXRoID0gbmV3IFJlZ0V4cCgnXicgKyBfLmVzY2FwZVJlZ0V4cChwcm94eVBhdGgpICsgJygvfCQpJyk7XG4gIGNvbnN0IGhwbUxvZyA9IGxvZ2dlci5nZXRMb2dnZXIoJ0hQTS4nICsgdGFyZ2V0VXJsKTtcblxuICBjb25zdCBwcm94eU1pZE9wdDogUHJveHlPcHRpb25zICYgIHtbSyBpbiAncGF0aFJld3JpdGUnIHwgJ29uUHJveHlSZXEnIHwgJ29uUHJveHlSZXMnIHwgJ29uRXJyb3InXTogTm9uTnVsbGFibGU8UHJveHlPcHRpb25zW0tdPn0gPSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG1heC1sZW5cbiAgICB0YXJnZXQ6IHByb3RvY29sICsgJy8vJyArIGhvc3QsXG4gICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgIHdzOiBmYWxzZSxcbiAgICBzZWN1cmU6IGZhbHNlLFxuICAgIGNvb2tpZURvbWFpblJld3JpdGU6IHsgJyonOiAnJyB9LFxuICAgIHBhdGhSZXdyaXRlOiAocGF0aCwgX3JlcSkgPT4ge1xuICAgICAgLy8gaHBtTG9nLndhcm4oJ3BhdFBhdGg9JywgcGF0UGF0aCwgJ3BhdGg9JywgcGF0aCk7XG4gICAgICBjb25zdCByZXQgPSBwYXRoICYmIHBhdGgucmVwbGFjZShwYXRQYXRoLCBfLnRyaW1FbmQocGF0aG5hbWUsICcvJykgKyAnLycpO1xuICAgICAgLy8gaHBtTG9nLmluZm8oYHByb3h5IHRvIHBhdGg6ICR7cmVxLm1ldGhvZH0gJHtwcm90b2NvbCArICcvLycgKyBob3N0fSR7cmV0fSwgcmVxLnVybCA9ICR7cmVxLnVybH1gKTtcbiAgICAgIHJldHVybiByZXQ7XG4gICAgfSxcbiAgICBsb2dMZXZlbDogJ2RlYnVnJyxcbiAgICBsb2dQcm92aWRlcjogX3Byb3ZpZGVyID0+IGhwbUxvZyxcbiAgICBwcm94eVRpbWVvdXQ6IDEwMDAwLFxuICAgIG9uUHJveHlSZXEocHJveHlSZXEsIHJlcSwgX3JlcywgLi4uX3Jlc3QpIHtcbiAgICAgIC8vIFRoaXMgcHJveHlSZXEgY291bGQgYmUgXCJSZWRpcmVjdFJlcXVlc3RcIiBpZiBvcHRpb24gXCJmb2xsb3dSZWRpcmVjdFwiIGlzIG9uXG4gICAgICBpZiAoaXNSZWRpcmVjdGFibGVSZXF1ZXN0KHByb3h5UmVxKSkge1xuICAgICAgICBocG1Mb2cud2FybihgUmVkaXJlY3QgcmVxdWVzdCB0byAke3Byb3RvY29sfS8vJHtob3N0fSR7cHJveHlSZXEuX2N1cnJlbnRSZXF1ZXN0LnBhdGh9IG1ldGhvZDogJHtyZXEubWV0aG9kIHx8ICd1a25vd24nfSwgJHtKU09OLnN0cmluZ2lmeShcbiAgICAgICAgICBwcm94eVJlcS5fY3VycmVudFJlcXVlc3QuZ2V0SGVhZGVycygpLCBudWxsLCAnICAnKX1gKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHByb3h5UmVxLnJlbW92ZUhlYWRlcignT3JpZ2luJyk7IC8vIEJ5cGFzcyBDT1JTIHJlc3RyaWN0IG9uIHRhcmdldCBzZXJ2ZXJcbiAgICAgICAgY29uc3QgcmVmZXJlciA9IHByb3h5UmVxLmdldEhlYWRlcigncmVmZXJlcicpO1xuICAgICAgICBpZiAodHlwZW9mIHJlZmVyZXIgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgcHJveHlSZXEuc2V0SGVhZGVyKCdyZWZlcmVyJywgYCR7cHJvdG9jb2x9Ly8ke2hvc3R9JHtuZXcgVVJMKHJlZmVyZXIpLnBhdGhuYW1lfWApO1xuICAgICAgICB9XG4gICAgICAgIGhwbUxvZy5pbmZvKGBQcm94eSByZXF1ZXN0IHRvICR7cHJvdG9jb2x9Ly8ke2hvc3R9JHtwcm94eVJlcS5wYXRofSBtZXRob2Q6ICR7cmVxLm1ldGhvZCB8fCAndWtub3duJ30sICR7SlNPTi5zdHJpbmdpZnkoXG4gICAgICAgICAgcHJveHlSZXEuZ2V0SGVhZGVycygpLCBudWxsLCAnICAnKX1gKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIG9uUHJveHlSZXMoaW5jb21pbmcsIHJlcSwgX3Jlcykge1xuICAgICAgaW5jb21pbmcuaGVhZGVyc1snQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJ10gPSAnKic7XG4gICAgICBpZiAoYXBpLmNvbmZpZygpLmRldk1vZGUpIHtcbiAgICAgICAgaHBtTG9nLmluZm8oYFByb3h5IHJlY2lldmUgJHtyZXEudXJsIHx8ICcnfSwgc3RhdHVzOiAke2luY29taW5nLnN0YXR1c0NvZGUhfVxcbmAsXG4gICAgICAgICAgSlNPTi5zdHJpbmdpZnkoaW5jb21pbmcuaGVhZGVycywgbnVsbCwgJyAgJykpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaHBtTG9nLmluZm8oYFByb3h5IHJlY2lldmUgJHtyZXEudXJsIHx8ICcnfSwgc3RhdHVzOiAke2luY29taW5nLnN0YXR1c0NvZGUhfWApO1xuICAgICAgfVxuICAgICAgaWYgKGFwaS5jb25maWcoKS5kZXZNb2RlKSB7XG5cbiAgICAgICAgY29uc3QgY3QgPSBpbmNvbWluZy5oZWFkZXJzWydjb250ZW50LXR5cGUnXTtcbiAgICAgICAgaHBtTG9nLmluZm8oYFJlc3BvbnNlICR7cmVxLnVybCB8fCAnJ30gaGVhZGVyczpcXG5gLCBpbmNvbWluZy5oZWFkZXJzKTtcbiAgICAgICAgY29uc3QgaXNUZXh0ID0gKGN0ICYmIC9cXGIoanNvbnx0ZXh0KVxcYi9pLnRlc3QoY3QpKTtcbiAgICAgICAgaWYgKGlzVGV4dCkge1xuICAgICAgICAgIGlmICghaW5jb21pbmcuY29tcGxldGUpIHtcbiAgICAgICAgICAgIGNvbnN0IGJ1ZnMgPSBbXSBhcyBzdHJpbmdbXTtcbiAgICAgICAgICAgIHZvaWQgcmVhZENvbXByZXNzZWRSZXNwb25zZShpbmNvbWluZywgbmV3IHN0cmVhbS5Xcml0YWJsZSh7XG4gICAgICAgICAgICAgIHdyaXRlKGNodW5rOiBCdWZmZXIgfCBzdHJpbmcsIF9lbmMsIGNiKSB7XG4gICAgICAgICAgICAgICAgYnVmcy5wdXNoKEJ1ZmZlci5pc0J1ZmZlcihjaHVuaykgPyBjaHVuay50b1N0cmluZygpIDogY2h1bmspO1xuICAgICAgICAgICAgICAgIGNiKCk7XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGZpbmFsKF9jYikge1xuICAgICAgICAgICAgICAgIGhwbUxvZy5pbmZvKGBSZXNwb25zZSAke3JlcS51cmwgfHwgJyd9IHRleHQgYm9keTpcXG5gLCBidWZzLmpvaW4oJycpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoKGluY29taW5nIGFzIHtib2R5PzogQnVmZmVyIHwgc3RyaW5nfSkuYm9keSkge1xuICAgICAgICAgICAgaHBtTG9nLmluZm8oYFJlc3BvbnNlICR7cmVxLnVybCB8fCAnJ30gdGV4dCBib2R5OlxcbmAsIChpbmNvbWluZyBhcyB7Ym9keT86IEJ1ZmZlciB8IHN0cmluZ30pLnRvU3RyaW5nKCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgb25FcnJvcihlcnIsIF9yZXEsIF9yZXMpIHtcbiAgICAgIGhwbUxvZy53YXJuKGVycik7XG4gICAgfVxuICB9O1xuICByZXR1cm4gcHJveHlNaWRPcHQ7XG59XG5cbi8qKiBPcHRpb25zIG9mIGh0dHAtcHJveHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZmF1bHRIdHRwUHJveHlPcHRpb25zKHRhcmdldD86IHN0cmluZyk6IFNlcnZlck9wdGlvbnMge1xuICByZXR1cm4ge1xuICAgIHRhcmdldCxcbiAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgd3M6IGZhbHNlLFxuICAgIHNlY3VyZTogZmFsc2UsXG4gICAgY29va2llRG9tYWluUmV3cml0ZTogeyAnKic6ICcnIH0sXG4gICAgLy8gbG9nTGV2ZWw6ICdkZWJ1ZycsXG4gICAgLy8gbG9nUHJvdmlkZXI6IHByb3ZpZGVyID0+IGhwbUxvZyxcbiAgICBwcm94eVRpbWVvdXQ6IDEwMDAwXG4gIH07XG59XG5cbmNvbnN0IGxvZyA9IGxvZ2dlci5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5jcmVhdGVSZXBsYXlSZWFkYWJsZUZhY3RvcnknKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVJlcGxheVJlYWRhYmxlRmFjdG9yeShcbiAgcmVhZGFibGU6IE5vZGVKUy5SZWFkYWJsZVN0cmVhbSwgdHJhbnNmb3Jtcz86IE5vZGVKUy5SZWFkV3JpdGVTdHJlYW1bXSxcbiAgb3B0cz86IHtkZWJ1Z0luZm8/OiBzdHJpbmc7IGV4cGVjdExlbj86IG51bWJlcn1cbikge1xuICBjb25zdCBidWYkID0gbmV3IHJ4LlJlcGxheVN1YmplY3Q8QnVmZmVyPigpO1xuICBsZXQgY2FjaGVCdWZMZW4gPSAwO1xuICBjb25zdCBjYWNoZVdyaXRlciA9IG5ldyBzdHJlYW0uV3JpdGFibGUoe1xuICAgIHdyaXRlKGNodW5rOiBCdWZmZXIsIF9lbmMsIGNiKSB7XG4gICAgICBjYWNoZUJ1ZkxlbiArPSBjaHVuay5sZW5ndGg7XG4gICAgICAvLyBsb2cud2FybignY2FjaGUgdXBkYXRlZDonLCBjYWNoZUJ1Zkxlbik7XG4gICAgICBidWYkLm5leHQoY2h1bmspO1xuICAgICAgY2IoKTtcbiAgICB9LFxuICAgIGZpbmFsKGNiKSB7XG4gICAgICBidWYkLmNvbXBsZXRlKCk7XG4gICAgICBpZiAoY2FjaGVCdWZMZW4gPT09IDAgfHwgKG9wdHM/LmV4cGVjdExlbiAhPSBudWxsICYmIG9wdHM/LmV4cGVjdExlbiA+IGNhY2hlQnVmTGVuICkpIHtcbiAgICAgICAgbG9nLmVycm9yKChvcHRzPy5kZWJ1Z0luZm8gfHwgJycpICsgYCwgY2FjaGUgY29tcGxldGVkIGxlbmd0aCBpcyAke2NhY2hlQnVmTGVufSB3aGljaCBpcyBsZXNzIHRoYW4gZXhwZWN0ZWQgJHtvcHRzIS5leHBlY3RMZW4hfWApO1xuICAgICAgICBjYihuZXcgRXJyb3IoJ0NhY2hlIGxlbmd0aCBkb2VzIG5vdCBtZWV0IGV4cGVjdGVkIGxlbmd0aCcpKTtcbiAgICAgIH1cbiAgICAgIGNiKCk7XG4gICAgfVxuICB9KTtcblxuICBsZXQgY2FjaGluZyA9IGZhbHNlO1xuICAvLyBsZXQgcmVhZGVyQ291bnQgPSAwO1xuXG4gIHJldHVybiAoKSA9PiB7XG4gICAgLy8gcmVhZGVyQ291bnQrKztcbiAgICAvLyBsZXQgYnVmZmVyTGVuZ3RoU3VtID0gMDtcbiAgICAvLyBjb25zdCByZWFkZXJJZCA9IHJlYWRlckNvdW50O1xuICAgIGNvbnN0IHJlYWRDYWxsJCA9IG5ldyByeC5TdWJqZWN0PHN0cmVhbS5SZWFkYWJsZT4oKTtcbiAgICBjb25zdCByZWFkYWJsZVN0cmVhbSA9IG5ldyBzdHJlYW0uUmVhZGFibGUoe1xuICAgICAgcmVhZChfc2l6ZSkge1xuICAgICAgICByZWFkQ2FsbCQubmV4dCh0aGlzKTtcbiAgICAgICAgaWYgKCFjYWNoaW5nKSB7XG4gICAgICAgICAgY2FjaGluZyA9IHRydWU7XG4gICAgICAgICAgY29uc3Qgc3RyZWFtcyA9IFtyZWFkYWJsZSxcbiAgICAgICAgICAgIC4uLih0cmFuc2Zvcm1zIHx8IFtdKSwgY2FjaGVXcml0ZXJdIGFzIEFycmF5PE5vZGVKUy5SZWFkYWJsZVN0cmVhbSB8IE5vZGVKUy5Xcml0YWJsZVN0cmVhbSB8IE5vZGVKUy5SZWFkV3JpdGVTdHJlYW0+O1xuICAgICAgICAgIC8vIFRvIHdvcmthcm91bmQgTm9kZUpTIDE2IGJ1Z1xuICAgICAgICAgIHN0cmVhbXMucmVkdWNlKFxuICAgICAgICAgICAgKHByZXYsIGN1cnIpID0+IChwcmV2IGFzIE5vZGVKUy5SZWFkYWJsZVN0cmVhbSlcbiAgICAgICAgICAgIC5waXBlKGN1cnIgYXMgTm9kZUpTLlJlYWRXcml0ZVN0cmVhbSkpXG4gICAgICAgICAgICAub24oJ2Vycm9yJywgZXJyID0+IGxvZy5lcnJvcihlcnIpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcnguemlwKHJlYWRDYWxsJCwgYnVmJClcbiAgICAgIC5waXBlKFxuICAgICAgICBvcC5tYXAoKFtyZWFkYWJsZSwgYnVmXSwgX2lkeCkgPT4ge1xuICAgICAgICAgIHJlYWRhYmxlLnB1c2goYnVmKTtcbiAgICAgICAgICAvLyBidWZmZXJMZW5ndGhTdW0gKz0gYnVmLmxlbmd0aDtcbiAgICAgICAgICAvLyBsb2cuZGVidWcoYHJlYWRlcjogJHtyZWFkZXJJZH0sIHJlYWRzICgke2lkeH0pICR7YnVmZmVyTGVuZ3RoU3VtfWApO1xuICAgICAgICB9KSxcbiAgICAgICAgb3AuZmluYWxpemUoKCkgPT4ge1xuICAgICAgICAgIHJlYWRhYmxlU3RyZWFtLnB1c2gobnVsbCk7XG4gICAgICAgIH0pXG4gICAgICApLnN1YnNjcmliZSgpO1xuXG4gICAgcmV0dXJuIHJlYWRhYmxlU3RyZWFtO1xuICB9O1xufVxuXG4vKipcbiAqIFRoaXMgaXMgbm90IHdvcmtpbmcgZm9yIFBPU1QgcmVxdWVzdCBhY2NvcmRpbmcgdG8gbXkgZXhwZXJpZW5jZSBpbiBOb2RlIDE2LjMuMCwgZHVlIHRvXG4gKiBieSB0aGUgdGltZSBub2RlLWh0dHAtcHJveHkgZW1pdHMgZXZlbnQgXCJwcm94eVJlcVwiLCBgcmVxLnBpcGUocHJveHlSZXEpYCBoYXMgYWxyZWFkeVxuICogYmVlbiBleGVjdXRlZCwgbWVhbmluZyB0aGUgcHJveHlSZXEgaGFzIFwiZW5kXCIgaXRzZWxmIGFzIHJlYWN0aW5nIHRvIHJlcS5jb21wbGV0ZTogdHJ1ZSBcbiAqIG9yIGVuZCBldmVudC5cbiAqXG4gKiBGaXggcHJveGllZCBib2R5IGlmIGJvZHlQYXJzZXIgaXMgaW52b2x2ZWQuXG4gKiBDb3BpZWQgZnJvbSBodHRwczovL2dpdGh1Yi5jb20vY2hpbXVyYWkvaHR0cC1wcm94eS1taWRkbGV3YXJlL2Jsb2IvbWFzdGVyL3NyYy9oYW5kbGVycy9maXgtcmVxdWVzdC1ib2R5LnRzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaXhSZXF1ZXN0Qm9keShwcm94eVJlcTogQ2xpZW50UmVxdWVzdCwgcmVxOiBJbmNvbWluZ01lc3NhZ2UpOiB2b2lkIHtcbiAgY29uc3QgcmVxdWVzdEJvZHkgPSAocmVxIGFzIFJlcXVlc3QpLmJvZHk7XG5cbiAgaWYgKCFyZXF1ZXN0Qm9keSB8fCAhT2JqZWN0LmtleXMocmVxdWVzdEJvZHkpLmxlbmd0aCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IGNvbnRlbnRUeXBlID0gcHJveHlSZXEuZ2V0SGVhZGVyKCdDb250ZW50LVR5cGUnKSBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGNvbnN0IHdyaXRlQm9keSA9IChib2R5RGF0YTogc3RyaW5nKSA9PiB7XG4gICAgaWYgKHByb3h5UmVxLmhlYWRlcnNTZW50KSB7XG4gICAgICBsb2cuZXJyb3IoJ3Byb3h5IHJlcXVlc3QgaGVhZGVyIGlzIHNlbnQgZWFybGllciB0aGFuIHRoZSBtb21lbnQgb2YgZml4UmVxdWVzdEJvZHkoKSEnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gZGVlcGNvZGUgaWdub3JlIENvbnRlbnRMZW5ndGhJbkNvZGU6IGJvZHlQYXJzZXIgZml4XG4gICAgICBjb25zdCBsZW4gPSBCdWZmZXIuYnl0ZUxlbmd0aChib2R5RGF0YSk7XG4gICAgICBwcm94eVJlcS5zZXRIZWFkZXIoJ0NvbnRlbnQtTGVuZ3RoJywgbGVuKTtcbiAgICAgIGxvZy5pbmZvKCdmaXggcHJveHkgYm9keScsIGNvbnRlbnRUeXBlLCBsZW4pO1xuICAgICAgcHJveHlSZXEud3JpdGUoYm9keURhdGEpO1xuICAgIH1cbiAgfTtcblxuICBpZiAoY29udGVudFR5cGUgJiYgY29udGVudFR5cGUuaW5jbHVkZXMoJ2FwcGxpY2F0aW9uL2pzb24nKSkge1xuICAgIHdyaXRlQm9keShKU09OLnN0cmluZ2lmeShyZXF1ZXN0Qm9keSkpO1xuICB9IGVsc2UgaWYgKGNvbnRlbnRUeXBlPy5pbmNsdWRlcygnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJykpIHtcbiAgICB3cml0ZUJvZHkocXVlcnlzdHJpbmcuc3RyaW5naWZ5KHJlcXVlc3RCb2R5KSk7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUJ1ZmZlckZvckh0dHBQcm94eShyZXE6IEluY29taW5nTWVzc2FnZSkge1xuICBjb25zdCBjb250ZW50VHlwZSA9IHJlcS5oZWFkZXJzWydjb250ZW50LXR5cGUnXTtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtbWVtYmVyLWFjY2Vzc1xuICBjb25zdCBib2R5ID0gKHJlcSBhcyBhbnkpLmJvZHk7XG4gIGlmIChib2R5ID09IG51bGwpXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcblxuICBpZiAoY29udGVudFR5cGUgJiYgY29udGVudFR5cGUuaW5jbHVkZXMoJ2FwcGxpY2F0aW9uL2pzb24nKSkge1xuICAgIGNvbnN0IGJ1ZiA9IEJ1ZmZlci5mcm9tKEpTT04uc3RyaW5naWZ5KGJvZHkpKTtcbiAgICByZXR1cm4ge1xuICAgICAgcmVhZGFibGU6IG5ldyBzdHJlYW0uUmVhZGFibGUoe1xuICAgICAgICByZWFkKCkge1xuICAgICAgICAgIHRoaXMucHVzaChidWYpO1xuICAgICAgICAgIHRoaXMucHVzaChudWxsKTtcbiAgICAgICAgfVxuICAgICAgfSksXG4gICAgICBsZW5ndGg6IGJ1Zi5sZW5ndGhcbiAgICB9O1xuICB9IGVsc2UgaWYgKGNvbnRlbnRUeXBlPy5pbmNsdWRlcygnYXBwbGljYXRpb24veC13d3ctZm9ybS11cmxlbmNvZGVkJykpIHtcbiAgICBjb25zdCBidWYgPSBCdWZmZXIuZnJvbShxdWVyeXN0cmluZy5zdHJpbmdpZnkoYm9keSkpO1xuICAgIHJldHVybiB7XG4gICAgICByZWFkYWJsZTogbmV3IHN0cmVhbS5SZWFkYWJsZSh7XG4gICAgICAgIHJlYWQoKSB7XG4gICAgICAgICAgdGhpcy5wdXNoKGJ1Zik7XG4gICAgICAgICAgdGhpcy5wdXNoKG51bGwpO1xuICAgICAgICB9XG4gICAgICB9KSxcbiAgICAgIGxlbmd0aDogYnVmLmxlbmd0aFxuICAgIH07XG4gIH0gZWxzZSBpZiAoQnVmZmVyLmlzQnVmZmVyKGJvZHkpKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlYWRhYmxlOiBuZXcgc3RyZWFtLlJlYWRhYmxlKHtcbiAgICAgICAgcmVhZCgpIHtcbiAgICAgICAgICB0aGlzLnB1c2goYm9keSk7XG4gICAgICAgICAgdGhpcy5wdXNoKG51bGwpO1xuICAgICAgICB9XG4gICAgICB9KSxcbiAgICAgIGxlbmd0aDogYm9keS5sZW5ndGhcbiAgICB9O1xuICB9XG59XG5cbiJdfQ==