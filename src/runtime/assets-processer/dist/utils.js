"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBufferForHttpProxy = exports.fixRequestBody = exports.createReplayReadableFactory = exports.defaultHttpProxyOptions = exports.defaultProxyOptions = exports.isRedirectableRequest = exports.setupHttpProxy = exports.createResponseTimestamp = void 0;
const tslib_1 = require("tslib");
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
const stream_1 = tslib_1.__importDefault(require("stream"));
const querystring = tslib_1.__importStar(require("querystring"));
const __plink_1 = tslib_1.__importDefault(require("__plink"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const rx = tslib_1.__importStar(require("rxjs"));
const op = tslib_1.__importStar(require("rxjs/operators"));
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
    if (contentType === null || contentType === void 0 ? void 0 : contentType.includes('application/json')) {
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
    if (contentType === null || contentType === void 0 ? void 0 : contentType.includes('application/json')) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsMERBQTBEO0FBQzFELDREQUE0RDtBQUM1RCw0REFBNEI7QUFFNUIsaUVBQTJDO0FBRTNDLDhEQUEwQjtBQUMxQiw0REFBdUI7QUFDdkIsaURBQTJCO0FBQzNCLDJEQUFxQztBQUNyQyx1REFBbUU7QUFDbkUsc0NBQWtDO0FBRWxDLGlFQUErRjtBQUUvRixNQUFNLE9BQU8sR0FBRyxjQUFNLENBQUMsU0FBUyxDQUFDLGlCQUFHLENBQUMsV0FBVyxHQUFHLFlBQVksQ0FBQyxDQUFDO0FBQ2pFOzs7OztHQUtHO0FBQ0gsU0FBZ0IsdUJBQXVCLENBQUMsR0FBWSxFQUFFLEdBQWEsRUFBRSxJQUFrQjtJQUNyRixNQUFNLElBQUksR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO0lBQ3hCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUVqQyxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDO0lBRXBCLFNBQVMsS0FBSztRQUNaLE1BQU0sR0FBRyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDakMsT0FBTyxDQUFDLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxNQUFNLElBQUksR0FBRyxDQUFDLFdBQVcsY0FBYyxHQUFHLENBQUMsVUFBVSx5QkFBeUIsR0FBRyxHQUFHLFNBQVMsSUFBSTtZQUM1SCxZQUFZLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLFNBQVMsTUFBTSxHQUFHLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBRSxHQUFHLENBQUMsQ0FBQztJQUMxRixDQUFDO0lBRUQsR0FBRyxDQUFDLEdBQUcsR0FBRyxVQUFTLE1BQVksRUFBRSxTQUFpQyxFQUFFLEdBQWdCO1FBQ2xGLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxTQUFTLENBQUMsS0FBSyxD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TTtTQUNuQixDQUFDO0tBQ0g7U0FBTSxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDaEMsT0FBTztZQUNMLFFBQVEsRUFBRSxJQUFJLGdCQUFNLENBQUMsUUFBUSxDQUFDO2dCQUM1QixJQUFJO29CQUNGLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQ2hCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ2xCLENBQUM7YUFDRixDQUFDO1lBQ0YsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO1NBQ3BCLENBQUM7S0FDSDtBQUNILENBQUM7QUF4Q0QsNERBd0NDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hcmd1bWVudCAqL1xuLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50ICovXG5pbXBvcnQgc3RyZWFtIGZyb20gJ3N0cmVhbSc7XG5pbXBvcnQge0NsaWVudFJlcXVlc3QsIEluY29taW5nTWVzc2FnZX0gZnJvbSAnaHR0cCc7XG5pbXBvcnQgKiBhcyBxdWVyeXN0cmluZyBmcm9tICdxdWVyeXN0cmluZyc7XG5pbXBvcnQge1JlcXVlc3QsIFJlc3BvbnNlLCBOZXh0RnVuY3Rpb259IGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IGFwaSBmcm9tICdfX3BsaW5rJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7cmVhZENvbXByZXNzZWRSZXNwb25zZX0gZnJvbSAnQHdmaC9odHRwLXNlcnZlci9kaXN0L3V0aWxzJztcbmltcG9ydCB7bG9nZ2VyfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCB7U2VydmVyT3B0aW9uc30gZnJvbSAnaHR0cC1wcm94eSc7XG5pbXBvcnQgeyBjcmVhdGVQcm94eU1pZGRsZXdhcmUgYXMgcHJveHksIE9wdGlvbnMgYXMgUHJveHlPcHRpb25zfSBmcm9tICdodHRwLXByb3h5LW1pZGRsZXdhcmUnO1xuXG5jb25zdCBsb2dUaW1lID0gbG9nZ2VyLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLnRpbWVzdGFtcCcpO1xuLyoqXG4gKiBNaWRkbGV3YXJlIGZvciBwcmludGluZyBlYWNoIHJlc3BvbnNlIHByb2Nlc3MgZHVyYXRpb24gdGltZSB0byBsb2dcbiAqIEBwYXJhbSByZXEgXG4gKiBAcGFyYW0gcmVzIFxuICogQHBhcmFtIG5leHQgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSZXNwb25zZVRpbWVzdGFtcChyZXE6IFJlcXVlc3QsIHJlczogUmVzcG9uc2UsIG5leHQ6IE5leHRGdW5jdGlvbikge1xuICBjb25zdCBkYXRlID0gbmV3IERhdGUoKTtcbiAgY29uc3Qgc3RhcnRUaW1lID0gZGF0ZS5nZXRUaW1lKCk7XG5cbiAgY29uc3QgZW5kID0gcmVzLmVuZDtcblxuICBmdW5jdGlvbiBwcmludCgpIHtcbiAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICBsb2dUaW1lLmluZm8oYHJlcXVlc3Q6ICR7cmVxLm1ldGhvZH0gJHtyZXEub3JpZ2luYWxVcmx9IHwgc3RhdHVzOiAke3Jlcy5zdGF0dXNDb2RlfSwgW3Jlc3BvbnNlIGR1cmF0aW9uOiAke25vdyAtIHN0YXJ0VGltZX1tc2AgK1xuICAgICAgYF0gKHNpbmNlICR7ZGF0ZS50b0xvY2FsZVRpbWVTdHJpbmcoKX0gJHtzdGFydFRpbWV9KSBbJHtyZXEuaGVhZGVyKCd1c2VyLWFnZW50JykhfV1gKTtcbiAgfVxuXG4gIHJlcy5lbmQgPSBmdW5jdGlvbihfY2h1bms/OiBhbnksIF9lbmNvZGluZz86IHN0cmluZyB8ICgoKSA9PiB2b2lkKSwgX2NiPzogKCkgPT4gdm9pZCkge1xuICAgIGNvbnN0IGFyZ3YgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICAgIGNvbnN0IGxhc3RBcmcgPSBhcmd1bWVudHNbYXJndW1lbnRzLmxlbmd0aCAtIDFdO1xuICAgIGlmICh0eXBlb2YgbGFzdEFyZyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY29uc3Qgb3JpZ2luQ2IgPSBhcmd1bWVudHNbYXJndW1lbnRzLmxlbmd0aCAtIDFdO1xuICAgICAgYXJndlthcmd2Lmxlbmd0aCAtIDFdID0gKCkgPT4ge1xuICAgICAgICBvcmlnaW5DYigpO1xuICAgICAgICBwcmludCgpO1xuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKGFyZ3YubGVuZ3RoID09PSAwKSB7XG4gICAgICBhcmd2LnB1c2gobnVsbCwgcHJpbnQpO1xuICAgIH0gZWxzZSBpZiAoYXJndi5sZW5ndGggPT09IDEpIHtcbiAgICAgIGFyZ3YucHVzaChwcmludCk7XG4gICAgfVxuICAgIGNvbnN0IHJldCA9IGVuZC5hcHBseShyZXMsIGFyZ3YgYXMgYW55KTtcbiAgICByZXR1cm4gcmV0O1xuICB9O1xuXG4gIG5leHQoKTtcbn1cblxuLyoqXG4gKiBUaGlzIGZ1bmN0aW9uIHVzZXMgaHR0cC1wcm94eS1taWRkbGV3YXJlIGludGVybmFsbHkuXG4gKiBcbiAqIEJlIGF3YXJlIHdpdGggY29tbWFuZCBsaW5lIG9wdGlvbiBcIi0tdmVyYm9zZVwiLCBvbmNlIGVuYWJsZSBcInZlcmJvc2VcIiwgdGhpcyBmdW5jdGlvbiB3aWxsXG4gKiByZWFkIChwaXBlKSByZW1vdGUgc2VydmVyIHJlc3BvbnNlIGJvZHkgaW50byBhIHN0cmluZyBidWZmZXIgZm9yIGFueSBtZXNzYWdlIHdpdGggY29udGVudC10eXBlIGlzIFwidGV4dFwiIG9yIFwianNvblwiIGJhc2VkXG4gKiBDcmVhdGUgYW5kIHVzZSBhbiBIVFRQIHJlcXVlc3QgcHJveHkgZm9yIHNwZWNpZmljIHJlcXVlc3QgcGF0aFxuICogQHBhcmFtIHByb3h5UGF0aCBcbiAqIEBwYXJhbSB0YXJnZXRVcmwgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXR1cEh0dHBQcm94eShwcm94eVBhdGg6IHN0cmluZywgdGFyZ2V0VXJsOiBzdHJpbmcsXG4gIG9wdHM6IHtcbiAgICAvKiogQnlwYXNzIENPUlMgcmVzdHJpY3Qgb24gdGFyZ2V0IHNlcnZlciwgZGVmYXVsdCBpcyB0cnVlICovXG4gICAgZGVsZXRlT3JpZ2luPzogYm9vbGVhbjtcbiAgICBwYXRoUmV3cml0ZT86IFByb3h5T3B0aW9uc1sncGF0aFJld3JpdGUnXTtcbiAgICBvblByb3h5UmVxPzogUHJveHlPcHRpb25zWydvblByb3h5UmVxJ107XG4gICAgb25Qcm94eVJlcz86IFByb3h5T3B0aW9uc1snb25Qcm94eVJlcyddO1xuICAgIG9uRXJyb3I/OiBQcm94eU9wdGlvbnNbJ29uRXJyb3InXTtcbiAgICBidWZmZXI/OiBQcm94eU9wdGlvbnNbJ2J1ZmZlciddO1xuICAgIHNlbGZIYW5kbGVSZXNwb25zZT86IFByb3h5T3B0aW9uc1snc2VsZkhhbmRsZVJlc3BvbnNlJ107XG4gICAgcHJveHlUaW1lb3V0PzogUHJveHlPcHRpb25zWydwcm94eVRpbWVvdXQnXTtcbiAgfSA9IHt9KSB7XG5cbiAgcHJveHlQYXRoID0gXy50cmltRW5kKHByb3h5UGF0aCwgJy8nKTtcbiAgdGFyZ2V0VXJsID0gXy50cmltRW5kKHRhcmdldFVybCwgJy8nKTtcblxuICBjb25zdCBkZWZhdWx0T3B0ID0gZGVmYXVsdFByb3h5T3B0aW9ucyhwcm94eVBhdGgsIHRhcmdldFVybCk7XG5cbiAgY29uc3QgcHJveHlNaWRPcHQ6IFByb3h5T3B0aW9ucyA9IHtcbiAgICAuLi5kZWZhdWx0T3B0LFxuICAgIG9uUHJveHlSZXEoLi4uYXJncykge1xuICAgICAgY29uc3Qgb3JpZ0hlYWRlciA9IGFyZ3NbMF0uZ2V0SGVhZGVyKCdPcmlnaW4nKTtcbiAgICAgIGRlZmF1bHRPcHQub25Qcm94eVJlcSguLi5hcmdzKTtcblxuICAgICAgaWYgKG9wdHMuZGVsZXRlT3JpZ2luID09PSBmYWxzZSkge1xuICAgICAgICAvLyBSZWNvdmVyIHJlbW92ZWQgaGVhZGVyIFwiT3JpZ2luXCJcbiAgICAgICAgYXJnc1swXS5zZXRIZWFkZXIoJ09yaWdpbicsIG9yaWdIZWFkZXIgYXMgc3RyaW5nKTtcbiAgICAgIH1cbiAgICAgIGlmIChvcHRzLm9uUHJveHlSZXEpXG4gICAgICAgIG9wdHMub25Qcm94eVJlcSguLi5hcmdzKTtcbiAgICB9LFxuICAgIG9uUHJveHlSZXMoLi4uYXJncykge1xuICAgICAgaWYgKG9wdHMub25Qcm94eVJlcylcbiAgICAgICAgb3B0cy5vblByb3h5UmVzKC4uLmFyZ3MpO1xuICAgICAgZGVmYXVsdE9wdC5vblByb3h5UmVzKC4uLmFyZ3MpO1xuICAgIH0sXG4gICAgb25FcnJvciguLi5hcmdzKSB7XG4gICAgICBkZWZhdWx0T3B0Lm9uRXJyb3IoLi4uYXJncyk7XG4gICAgICBpZiAob3B0cy5vbkVycm9yKVxuICAgICAgICBvcHRzLm9uRXJyb3IoLi4uYXJncyk7XG4gICAgfVxuICB9O1xuXG5cbiAgYXBpLmV4cHJlc3NBcHBTZXQoYXBwID0+IHtcbiAgICBhcHAudXNlKHByb3h5UGF0aCwgcHJveHkocHJveHlNaWRPcHQpKTtcbiAgfSk7XG59XG5cbi8qXG4gKiBUaGlzIGludGVyZmFjZSBpcyBub3QgZXhwb3NlZCBieSBodHRwLXByb3h5LW1pZGRsZXdhcmUsIGl0IGlzIHVzZWQgd2hlbiBvcHRpb24gXCJmb2xsb3dSZWRpcmVjdFwiXG4gKiBpcyBlbmFibGVkLCBtb3N0IGxpa2VseSB0aGlzIGlzIGJlaGF2aW9yIG9mIGh0dHAtcHJveHlcbiAqL1xuaW50ZXJmYWNlIFJlZGlyZWN0YWJsZVJlcXVlc3Qge1xuICBfY3VycmVudFJlcXVlc3Q6IENsaWVudFJlcXVlc3Q7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1JlZGlyZWN0YWJsZVJlcXVlc3QocmVxOiB1bmtub3duKTogcmVxIGlzIFJlZGlyZWN0YWJsZVJlcXVlc3Qge1xuICByZXR1cm4gKHJlcSBhcyBSZWRpcmVjdGFibGVSZXF1ZXN0KS5fY3VycmVudFJlcXVlc3QgIT0gbnVsbDtcbn1cblxuLyoqXG4gKiBPcHRpb25zIG9mIGh0dHAtcHJveHktbWlkZGxld2FyZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZGVmYXVsdFByb3h5T3B0aW9ucyhwcm94eVBhdGg6IHN0cmluZywgdGFyZ2V0VXJsOiBzdHJpbmcpIHtcbiAgcHJveHlQYXRoID0gXy50cmltRW5kKHByb3h5UGF0aCwgJy8nKTtcbiAgdGFyZ2V0VXJsID0gXy50cmltRW5kKHRhcmdldFVybCwgJy8nKTtcbiAgY29uc3QgeyBwcm90b2NvbCwgaG9zdCwgcGF0aG5hbWUgfSA9IG5ldyBVUkwodGFyZ2V0VXJsKTtcblxuICBjb25zdCBwYXRQYXRoID0gbmV3IFJlZ0V4cCgnXicgKyBfLmVzY2FwZVJlZ0V4cChwcm94eVBhdGgpICsgJygvfCQpJyk7XG4gIGNvbnN0IGhwbUxvZyA9IGxvZ2dlci5nZXRMb2dnZXIoJ0hQTS4nICsgdGFyZ2V0VXJsKTtcblxuICBjb25zdCBwcm94eU1pZE9wdDogUHJveHlPcHRpb25zICYgIHtbSyBpbiAncGF0aFJld3JpdGUnIHwgJ29uUHJveHlSZXEnIHwgJ29uUHJveHlSZXMnIHwgJ29uRXJyb3InXTogTm9uTnVsbGFibGU8UHJveHlPcHRpb25zW0tdPn0gPSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG1heC1sZW5cbiAgICB0YXJnZXQ6IHByb3RvY29sICsgJy8vJyArIGhvc3QsXG4gICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgIHdzOiBmYWxzZSxcbiAgICBzZWN1cmU6IGZhbHNlLFxuICAgIGNvb2tpZURvbWFpblJld3JpdGU6IHsgJyonOiAnJyB9LFxuICAgIHBhdGhSZXdyaXRlOiAocGF0aCwgX3JlcSkgPT4ge1xuICAgICAgLy8gaHBtTG9nLndhcm4oJ3BhdFBhdGg9JywgcGF0UGF0aCwgJ3BhdGg9JywgcGF0aCk7XG4gICAgICBjb25zdCByZXQgPSBwYXRoICYmIHBhdGgucmVwbGFjZShwYXRQYXRoLCBfLnRyaW1FbmQocGF0aG5hbWUsICcvJykgKyAnLycpO1xuICAgICAgLy8gaHBtTG9nLmluZm8oYHByb3h5IHRvIHBhdGg6ICR7cmVxLm1ldGhvZH0gJHtwcm90b2NvbCArICcvLycgKyBob3N0fSR7cmV0fSwgcmVxLnVybCA9ICR7cmVxLnVybH1gKTtcbiAgICAgIHJldHVybiByZXQ7XG4gICAgfSxcbiAgICBsb2dMZXZlbDogJ2RlYnVnJyxcbiAgICBsb2dQcm92aWRlcjogX3Byb3ZpZGVyID0+IGhwbUxvZyxcbiAgICBwcm94eVRpbWVvdXQ6IDEwMDAwLFxuICAgIG9uUHJveHlSZXEocHJveHlSZXEsIHJlcSwgX3JlcywgLi4uX3Jlc3QpIHtcbiAgICAgIC8vIFRoaXMgcHJveHlSZXEgY291bGQgYmUgXCJSZWRpcmVjdFJlcXVlc3RcIiBpZiBvcHRpb24gXCJmb2xsb3dSZWRpcmVjdFwiIGlzIG9uXG4gICAgICBpZiAoaXNSZWRpcmVjdGFibGVSZXF1ZXN0KHByb3h5UmVxKSkge1xuICAgICAgICBocG1Mb2cud2FybihgUmVkaXJlY3QgcmVxdWVzdCB0byAke3Byb3RvY29sfS8vJHtob3N0fSR7cHJveHlSZXEuX2N1cnJlbnRSZXF1ZXN0LnBhdGh9IG1ldGhvZDogJHtyZXEubWV0aG9kIHx8ICd1a25vd24nfSwgJHtKU09OLnN0cmluZ2lmeShcbiAgICAgICAgICBwcm94eVJlcS5fY3VycmVudFJlcXVlc3QuZ2V0SGVhZGVycygpLCBudWxsLCAnICAnKX1gKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHByb3h5UmVxLnJlbW92ZUhlYWRlcignT3JpZ2luJyk7IC8vIEJ5cGFzcyBDT1JTIHJlc3RyaWN0IG9uIHRhcmdldCBzZXJ2ZXJcbiAgICAgICAgY29uc3QgcmVmZXJlciA9IHByb3h5UmVxLmdldEhlYWRlcigncmVmZXJlcicpO1xuICAgICAgICBpZiAodHlwZW9mIHJlZmVyZXIgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgcHJveHlSZXEuc2V0SGVhZGVyKCdyZWZlcmVyJywgYCR7cHJvdG9jb2x9Ly8ke2hvc3R9JHtuZXcgVVJMKHJlZmVyZXIpLnBhdGhuYW1lfWApO1xuICAgICAgICB9XG4gICAgICAgIGhwbUxvZy5pbmZvKGBQcm94eSByZXF1ZXN0IHRvICR7cHJvdG9jb2x9Ly8ke2hvc3R9JHtwcm94eVJlcS5wYXRofSBtZXRob2Q6ICR7cmVxLm1ldGhvZCB8fCAndWtub3duJ30sICR7SlNPTi5zdHJpbmdpZnkoXG4gICAgICAgICAgcHJveHlSZXEuZ2V0SGVhZGVycygpLCBudWxsLCAnICAnKX1gKTtcbiAgICAgIH1cbiAgICB9LFxuICAgIG9uUHJveHlSZXMoaW5jb21pbmcsIHJlcSwgX3Jlcykge1xuICAgICAgaW5jb21pbmcuaGVhZGVyc1snQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJ10gPSAnKic7XG4gICAgICBpZiAoYXBpLmNvbmZpZygpLmRldk1vZGUpIHtcbiAgICAgICAgaHBtTG9nLmluZm8oYFByb3h5IHJlY2lldmUgJHtyZXEudXJsIHx8ICcnfSwgc3RhdHVzOiAke2luY29taW5nLnN0YXR1c0NvZGUhfVxcbmAsXG4gICAgICAgICAgSlNPTi5zdHJpbmdpZnkoaW5jb21pbmcuaGVhZGVycywgbnVsbCwgJyAgJykpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaHBtTG9nLmluZm8oYFByb3h5IHJlY2lldmUgJHtyZXEudXJsIHx8ICcnfSwgc3RhdHVzOiAke2luY29taW5nLnN0YXR1c0NvZGUhfWApO1xuICAgICAgfVxuICAgICAgaWYgKGFwaS5jb25maWcoKS5kZXZNb2RlKSB7XG5cbiAgICAgICAgY29uc3QgY3QgPSBpbmNvbWluZy5oZWFkZXJzWydjb250ZW50LXR5cGUnXTtcbiAgICAgICAgaHBtTG9nLmluZm8oYFJlc3BvbnNlICR7cmVxLnVybCB8fCAnJ30gaGVhZGVyczpcXG5gLCBpbmNvbWluZy5oZWFkZXJzKTtcbiAgICAgICAgY29uc3QgaXNUZXh0ID0gKGN0ICYmIC9cXGIoanNvbnx0ZXh0KVxcYi9pLnRlc3QoY3QpKTtcbiAgICAgICAgaWYgKGlzVGV4dCkge1xuICAgICAgICAgIGlmICghaW5jb21pbmcuY29tcGxldGUpIHtcbiAgICAgICAgICAgIGNvbnN0IGJ1ZnMgPSBbXSBhcyBzdHJpbmdbXTtcbiAgICAgICAgICAgIHZvaWQgcmVhZENvbXByZXNzZWRSZXNwb25zZShpbmNvbWluZywgbmV3IHN0cmVhbS5Xcml0YWJsZSh7XG4gICAgICAgICAgICAgIHdyaXRlKGNodW5rOiBCdWZmZXIgfCBzdHJpbmcsIF9lbmMsIGNiKSB7XG4gICAgICAgICAgICAgICAgYnVmcy5wdXNoKEJ1ZmZlci5pc0J1ZmZlcihjaHVuaykgPyBjaHVuay50b1N0cmluZygpIDogY2h1bmspO1xuICAgICAgICAgICAgICAgIGNiKCk7XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGZpbmFsKF9jYikge1xuICAgICAgICAgICAgICAgIGhwbUxvZy5pbmZvKGBSZXNwb25zZSAke3JlcS51cmwgfHwgJyd9IHRleHQgYm9keTpcXG5gLCBidWZzLmpvaW4oJycpKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgIH0gZWxzZSBpZiAoKGluY29taW5nIGFzIHtib2R5PzogQnVmZmVyIHwgc3RyaW5nfSkuYm9keSkge1xuICAgICAgICAgICAgaHBtTG9nLmluZm8oYFJlc3BvbnNlICR7cmVxLnVybCB8fCAnJ30gdGV4dCBib2R5OlxcbmAsIChpbmNvbWluZyBhcyB7Ym9keT86IEJ1ZmZlciB8IHN0cmluZ30pLnRvU3RyaW5nKCkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgb25FcnJvcihlcnIsIF9yZXEsIF9yZXMpIHtcbiAgICAgIGhwbUxvZy53YXJuKGVycik7XG4gICAgfVxuICB9O1xuICByZXR1cm4gcHJveHlNaWRPcHQ7XG59XG5cbi8qKiBPcHRpb25zIG9mIGh0dHAtcHJveHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRlZmF1bHRIdHRwUHJveHlPcHRpb25zKHRhcmdldD86IHN0cmluZyk6IFNlcnZlck9wdGlvbnMge1xuICByZXR1cm4ge1xuICAgIHRhcmdldCxcbiAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgd3M6IGZhbHNlLFxuICAgIHNlY3VyZTogZmFsc2UsXG4gICAgY29va2llRG9tYWluUmV3cml0ZTogeyAnKic6ICcnIH0sXG4gICAgLy8gbG9nTGV2ZWw6ICdkZWJ1ZycsXG4gICAgLy8gbG9nUHJvdmlkZXI6IHByb3ZpZGVyID0+IGhwbUxvZyxcbiAgICBwcm94eVRpbWVvdXQ6IDEwMDAwXG4gIH07XG59XG5cbmNvbnN0IGxvZyA9IGxvZ2dlci5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy5jcmVhdGVSZXBsYXlSZWFkYWJsZUZhY3RvcnknKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVJlcGxheVJlYWRhYmxlRmFjdG9yeShcbiAgcmVhZGFibGU6IE5vZGVKUy5SZWFkYWJsZVN0cmVhbSwgdHJhbnNmb3Jtcz86IE5vZGVKUy5SZWFkV3JpdGVTdHJlYW1bXSxcbiAgb3B0cz86IHtkZWJ1Z0luZm8/OiBzdHJpbmc7IGV4cGVjdExlbj86IG51bWJlcn1cbikge1xuICBjb25zdCBidWYkID0gbmV3IHJ4LlJlcGxheVN1YmplY3Q8QnVmZmVyPigpO1xuICBsZXQgY2FjaGVCdWZMZW4gPSAwO1xuICBjb25zdCBjYWNoZVdyaXRlciA9IG5ldyBzdHJlYW0uV3JpdGFibGUoe1xuICAgIHdyaXRlKGNodW5rOiBCdWZmZXIsIF9lbmMsIGNiKSB7XG4gICAgICBjYWNoZUJ1ZkxlbiArPSBjaHVuay5sZW5ndGg7XG4gICAgICAvLyBsb2cud2FybignY2FjaGUgdXBkYXRlZDonLCBjYWNoZUJ1Zkxlbik7XG4gICAgICBidWYkLm5leHQoY2h1bmspO1xuICAgICAgY2IoKTtcbiAgICB9LFxuICAgIGZpbmFsKGNiKSB7XG4gICAgICBidWYkLmNvbXBsZXRlKCk7XG4gICAgICBpZiAoY2FjaGVCdWZMZW4gPT09IDAgfHwgKG9wdHM/LmV4cGVjdExlbiAhPSBudWxsICYmIG9wdHM/LmV4cGVjdExlbiA+IGNhY2hlQnVmTGVuICkpIHtcbiAgICAgICAgbG9nLmVycm9yKChvcHRzPy5kZWJ1Z0luZm8gfHwgJycpICsgYCwgY2FjaGUgY29tcGxldGVkIGxlbmd0aCBpcyAke2NhY2hlQnVmTGVufSB3aGljaCBpcyBsZXNzIHRoYW4gZXhwZWN0ZWQgJHtvcHRzIS5leHBlY3RMZW4hfWApO1xuICAgICAgICBjYihuZXcgRXJyb3IoJ0NhY2hlIGxlbmd0aCBkb2VzIG5vdCBtZWV0IGV4cGVjdGVkIGxlbmd0aCcpKTtcbiAgICAgIH1cbiAgICAgIGNiKCk7XG4gICAgfVxuICB9KTtcblxuICBsZXQgY2FjaGluZyA9IGZhbHNlO1xuICAvLyBsZXQgcmVhZGVyQ291bnQgPSAwO1xuXG4gIHJldHVybiAoKSA9PiB7XG4gICAgLy8gcmVhZGVyQ291bnQrKztcbiAgICAvLyBsZXQgYnVmZmVyTGVuZ3RoU3VtID0gMDtcbiAgICAvLyBjb25zdCByZWFkZXJJZCA9IHJlYWRlckNvdW50O1xuICAgIGNvbnN0IHJlYWRDYWxsJCA9IG5ldyByeC5TdWJqZWN0PHN0cmVhbS5SZWFkYWJsZT4oKTtcbiAgICBjb25zdCByZWFkYWJsZVN0cmVhbSA9IG5ldyBzdHJlYW0uUmVhZGFibGUoe1xuICAgICAgcmVhZChfc2l6ZSkge1xuICAgICAgICByZWFkQ2FsbCQubmV4dCh0aGlzKTtcbiAgICAgICAgaWYgKCFjYWNoaW5nKSB7XG4gICAgICAgICAgY2FjaGluZyA9IHRydWU7XG4gICAgICAgICAgY29uc3Qgc3RyZWFtcyA9IFtyZWFkYWJsZSxcbiAgICAgICAgICAgIC4uLih0cmFuc2Zvcm1zIHx8IFtdKSwgY2FjaGVXcml0ZXJdIGFzIEFycmF5PE5vZGVKUy5SZWFkYWJsZVN0cmVhbSB8IE5vZGVKUy5Xcml0YWJsZVN0cmVhbSB8IE5vZGVKUy5SZWFkV3JpdGVTdHJlYW0+O1xuICAgICAgICAgIC8vIFRvIHdvcmthcm91bmQgTm9kZUpTIDE2IGJ1Z1xuICAgICAgICAgIHN0cmVhbXMucmVkdWNlKFxuICAgICAgICAgICAgKHByZXYsIGN1cnIpID0+IChwcmV2IGFzIE5vZGVKUy5SZWFkYWJsZVN0cmVhbSlcbiAgICAgICAgICAgIC5waXBlKGN1cnIgYXMgTm9kZUpTLlJlYWRXcml0ZVN0cmVhbSkpXG4gICAgICAgICAgICAub24oJ2Vycm9yJywgZXJyID0+IGxvZy5lcnJvcihlcnIpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcnguemlwKHJlYWRDYWxsJCwgYnVmJClcbiAgICAgIC5waXBlKFxuICAgICAgICBvcC5tYXAoKFtyZWFkYWJsZSwgYnVmXSwgX2lkeCkgPT4ge1xuICAgICAgICAgIHJlYWRhYmxlLnB1c2goYnVmKTtcbiAgICAgICAgICAvLyBidWZmZXJMZW5ndGhTdW0gKz0gYnVmLmxlbmd0aDtcbiAgICAgICAgICAvLyBsb2cuZGVidWcoYHJlYWRlcjogJHtyZWFkZXJJZH0sIHJlYWRzICgke2lkeH0pICR7YnVmZmVyTGVuZ3RoU3VtfWApO1xuICAgICAgICB9KSxcbiAgICAgICAgb3AuZmluYWxpemUoKCkgPT4ge1xuICAgICAgICAgIHJlYWRhYmxlU3RyZWFtLnB1c2gobnVsbCk7XG4gICAgICAgIH0pXG4gICAgICApLnN1YnNjcmliZSgpO1xuXG4gICAgcmV0dXJuIHJlYWRhYmxlU3RyZWFtO1xuICB9O1xufVxuXG4vKipcbiAqIFRoaXMgaXMgbm90IHdvcmtpbmcgZm9yIFBPU1QgcmVxdWVzdCBhY2NvcmRpbmcgdG8gbXkgZXhwZXJpZW5jZSBpbiBOb2RlIDE2LjMuMCwgZHVlIHRvXG4gKiBieSB0aGUgdGltZSBub2RlLWh0dHAtcHJveHkgZW1pdHMgZXZlbnQgXCJwcm94eVJlcVwiLCBgcmVxLnBpcGUocHJveHlSZXEpYCBoYXMgYWxyZWFkeVxuICogYmVlbiBleGVjdXRlZCwgbWVhbmluZyB0aGUgcHJveHlSZXEgaGFzIFwiZW5kXCIgaXRzZWxmIGFzIHJlYWN0aW5nIHRvIHJlcS5jb21wbGV0ZTogdHJ1ZSBcbiAqIG9yIGVuZCBldmVudC5cbiAqXG4gKiBGaXggcHJveGllZCBib2R5IGlmIGJvZHlQYXJzZXIgaXMgaW52b2x2ZWQuXG4gKiBDb3BpZWQgZnJvbSBodHRwczovL2dpdGh1Yi5jb20vY2hpbXVyYWkvaHR0cC1wcm94eS1taWRkbGV3YXJlL2Jsb2IvbWFzdGVyL3NyYy9oYW5kbGVycy9maXgtcmVxdWVzdC1ib2R5LnRzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaXhSZXF1ZXN0Qm9keShwcm94eVJlcTogQ2xpZW50UmVxdWVzdCwgcmVxOiBJbmNvbWluZ01lc3NhZ2UpOiB2b2lkIHtcbiAgY29uc3QgcmVxdWVzdEJvZHkgPSAocmVxIGFzIFJlcXVlc3QpLmJvZHk7XG5cbiAgaWYgKCFyZXF1ZXN0Qm9keSB8fCAhT2JqZWN0LmtleXMocmVxdWVzdEJvZHkpLmxlbmd0aCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvbnN0IGNvbnRlbnRUeXBlID0gcHJveHlSZXEuZ2V0SGVhZGVyKCdDb250ZW50LVR5cGUnKSBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGNvbnN0IHdyaXRlQm9keSA9IChib2R5RGF0YTogc3RyaW5nKSA9PiB7XG4gICAgaWYgKHByb3h5UmVxLmhlYWRlcnNTZW50KSB7XG4gICAgICBsb2cuZXJyb3IoJ3Byb3h5IHJlcXVlc3QgaGVhZGVyIGlzIHNlbnQgZWFybGllciB0aGFuIHRoZSBtb21lbnQgb2YgZml4UmVxdWVzdEJvZHkoKSEnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gZGVlcGNvZGUgaWdub3JlIENvbnRlbnRMZW5ndGhJbkNvZGU6IGJvZHlQYXJzZXIgZml4XG4gICAgICBjb25zdCBsZW4gPSBCdWZmZXIuYnl0ZUxlbmd0aChib2R5RGF0YSk7XG4gICAgICBwcm94eVJlcS5zZXRIZWFkZXIoJ0NvbnRlbnQtTGVuZ3RoJywgbGVuKTtcbiAgICAgIGxvZy5pbmZvKCdmaXggcHJveHkgYm9keScsIGNvbnRlbnRUeXBlLCBsZW4pO1xuICAgICAgcHJveHlSZXEud3JpdGUoYm9keURhdGEpO1xuICAgIH1cbiAgfTtcblxuICBpZiAoY29udGVudFR5cGU/LmluY2x1ZGVzKCdhcHBsaWNhdGlvbi9qc29uJykpIHtcbiAgICB3cml0ZUJvZHkoSlNPTi5zdHJpbmdpZnkocmVxdWVzdEJvZHkpKTtcbiAgfSBlbHNlIGlmIChjb250ZW50VHlwZT8uaW5jbHVkZXMoJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCcpKSB7XG4gICAgd3JpdGVCb2R5KHF1ZXJ5c3RyaW5nLnN0cmluZ2lmeShyZXF1ZXN0Qm9keSkpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVCdWZmZXJGb3JIdHRwUHJveHkocmVxOiBJbmNvbWluZ01lc3NhZ2UpIHtcbiAgY29uc3QgY29udGVudFR5cGUgPSByZXEuaGVhZGVyc1snY29udGVudC10eXBlJ107XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLW1lbWJlci1hY2Nlc3NcbiAgY29uc3QgYm9keSA9IChyZXEgYXMgYW55KS5ib2R5O1xuICBpZiAoYm9keSA9PSBudWxsKVxuICAgIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgaWYgKGNvbnRlbnRUeXBlPy5pbmNsdWRlcygnYXBwbGljYXRpb24vanNvbicpKSB7XG4gICAgY29uc3QgYnVmID0gQnVmZmVyLmZyb20oSlNPTi5zdHJpbmdpZnkoYm9keSkpO1xuICAgIHJldHVybiB7XG4gICAgICByZWFkYWJsZTogbmV3IHN0cmVhbS5SZWFkYWJsZSh7XG4gICAgICAgIHJlYWQoKSB7XG4gICAgICAgICAgdGhpcy5wdXNoKGJ1Zik7XG4gICAgICAgICAgdGhpcy5wdXNoKG51bGwpO1xuICAgICAgICB9XG4gICAgICB9KSxcbiAgICAgIGxlbmd0aDogYnVmLmxlbmd0aFxuICAgIH07XG4gIH0gZWxzZSBpZiAoY29udGVudFR5cGU/LmluY2x1ZGVzKCdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnKSkge1xuICAgIGNvbnN0IGJ1ZiA9IEJ1ZmZlci5mcm9tKHF1ZXJ5c3RyaW5nLnN0cmluZ2lmeShib2R5KSk7XG4gICAgcmV0dXJuIHtcbiAgICAgIHJlYWRhYmxlOiBuZXcgc3RyZWFtLlJlYWRhYmxlKHtcbiAgICAgICAgcmVhZCgpIHtcbiAgICAgICAgICB0aGlzLnB1c2goYnVmKTtcbiAgICAgICAgICB0aGlzLnB1c2gobnVsbCk7XG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICAgbGVuZ3RoOiBidWYubGVuZ3RoXG4gICAgfTtcbiAgfSBlbHNlIGlmIChCdWZmZXIuaXNCdWZmZXIoYm9keSkpIHtcbiAgICByZXR1cm4ge1xuICAgICAgcmVhZGFibGU6IG5ldyBzdHJlYW0uUmVhZGFibGUoe1xuICAgICAgICByZWFkKCkge1xuICAgICAgICAgIHRoaXMucHVzaChib2R5KTtcbiAgICAgICAgICB0aGlzLnB1c2gobnVsbCk7XG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICAgbGVuZ3RoOiBib2R5Lmxlbmd0aFxuICAgIH07XG4gIH1cbn1cblxuIl19