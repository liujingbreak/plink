"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testHttpProxyServer = exports.createBufferForHttpProxy = exports.fixRequestBody = exports.createReplayReadableFactory = exports.defaultHttpProxyOptions = exports.defaultProxyOptions = exports.isRedirectableRequest = exports.setupHttpProxy = exports.createResponseTimestamp = void 0;
const tslib_1 = require("tslib");
/* eslint-disable prefer-rest-params */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
const stream_1 = tslib_1.__importDefault(require("stream"));
const querystring = tslib_1.__importStar(require("querystring"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const rx = tslib_1.__importStar(require("rxjs"));
const op = tslib_1.__importStar(require("rxjs/operators"));
// import {readCompressedResponse} from '@wfh/http-server/dist/utils';
const plink_1 = require("@wfh/plink");
const http_proxy_1 = tslib_1.__importDefault(require("http-proxy"));
const http_proxy_observable_1 = require("./http-proxy-observable");
const pkgLog = (0, plink_1.log4File)(__filename);
const logTime = plink_1.logger.getLogger(pkgLog.name + '.timestamp');
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
    const api = require('__api');
    const proxyServer = new http_proxy_1.default(defaultOpt);
    const obs = (0, http_proxy_observable_1.httpProxyObservable)(proxyServer);
    if (opts.deleteOrigin) {
        obs.proxyReq.pipe(op.map(({ payload: [pReq, req, res] }) => {
            pReq.removeHeader('Origin');
        })).subscribe();
    }
    obs.proxyRes.pipe(op.map(({ payload: [pRes, req, res] }) => {
        if (pRes.headers['access-control-allow-origin'] || res.hasHeader('Access-Control-Allow-Origin')) {
            res.setHeader('Access-Control-Allow-Origin', '*');
        }
    })).subscribe();
    proxyServer.on('error', (err, _req, _res, targetOrSocket) => log.error('proxy error', err, targetOrSocket));
    proxyServer.on('econnreset', (_pReq, _req, _res, target) => log.error('proxy connection reset', target.toString()));
    api.expressAppSet(app => {
        app.use(proxyPath, (req, res, next) => {
            log.warn('handle proxy path', proxyPath);
            (0, http_proxy_observable_1.observeProxyResponse)(obs, res).pipe(op.map(({ payload: [proxyRes] }) => {
                if (proxyRes.statusCode === 404) {
                    next();
                }
            })).subscribe();
            proxyServer.web(req, res);
        });
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
    // const patPath = new RegExp('^' + _.escapeRegExp(proxyPath) + '(/|$)');
    // const hpmLog = logger.getLogger('HPM.' + targetUrl);
    const proxyMidOpt = {
        // eslint-disable-next-line max-len
        target: targetUrl,
        changeOrigin: true,
        ws: false,
        secure: false,
        cookieDomainRewrite: { '*': '' },
        // pathRewrite: (path, _req) => {
        //   // hpmLog.warn('patPath=', patPath, 'path=', path);
        //   const ret = path && path.replace(patPath, _.trimEnd(pathname, '/') + '/');
        //   // hpmLog.info(`proxy to path: ${req.method} ${protocol + '//' + host}${ret}, req.url = ${req.url}`);
        //   return ret;
        // },
        proxyTimeout: 10000
        // onProxyReq(proxyReq, req, _res, ..._rest) {
        //   // This proxyReq could be "RedirectRequest" if option "followRedirect" is on
        //   if (isRedirectableRequest(proxyReq)) {
        //     hpmLog.warn(`Redirect request to ${protocol}//${host}${proxyReq._currentRequest.path} method: ${req.method || 'uknown'}, ${JSON.stringify(
        //       proxyReq._currentRequest.getHeaders(), null, '  ')}`);
        //   } else {
        //     proxyReq.removeHeader('Origin'); // Bypass CORS restrict on target server
        //     const referer = proxyReq.getHeader('referer');
        //     if (typeof referer === 'string') {
        //       proxyReq.setHeader('referer', `${protocol}//${host}${new URL(referer).pathname}`);
        //     }
        //     hpmLog.info(`Proxy request to ${protocol}//${host}${proxyReq.path} method: ${req.method || 'uknown'}, ${JSON.stringify(
        //       proxyReq.getHeaders(), null, '  ')}`);
        //   }
        // },
        // onProxyRes(incoming, req, _res) {
        //   incoming.headers['Access-Control-Allow-Origin'] = '*';
        //   if (config().devMode) {
        //     hpmLog.info(`Proxy recieve ${req.url || ''}, status: ${incoming.statusCode!}\n`,
        //       JSON.stringify(incoming.headers, null, '  '));
        //   } else {
        //     hpmLog.info(`Proxy recieve ${req.url || ''}, status: ${incoming.statusCode!}`);
        //   }
        //   if (config().devMode) {
        //     const ct = incoming.headers['content-type'];
        //     hpmLog.info(`Response ${req.url || ''} headers:\n`, incoming.headers);
        //     const isText = (ct && /\b(json|text)\b/i.test(ct));
        //     if (isText) {
        //       if (!incoming.complete) {
        //         const bufs = [] as string[];
        //         void readCompressedResponse(incoming, new stream.Writable({
        //           write(chunk: Buffer | string, _enc, cb) {
        //             bufs.push(Buffer.isBuffer(chunk) ? chunk.toString() : chunk);
        //             cb();
        //           },
        //           final(_cb) {
        //             hpmLog.info(`Response ${req.url || ''} text body:\n`, bufs.join(''));
        //           }
        //         }));
        //       } else if ((incoming as {body?: Buffer | string}).body) {
        //         hpmLog.info(`Response ${req.url || ''} text body:\n`, (incoming as {body?: Buffer | string}).toString());
        //       }
        //     }
        //   }
        // },
        // onError(err, _req, _res) {
        //   hpmLog.warn(err);
        // }
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
        proxyTimeout: 10000
    };
}
exports.defaultHttpProxyOptions = defaultHttpProxyOptions;
const log = plink_1.logger.getLogger(pkgLog.name + '.createReplayReadableFactory');
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
function createBufferForHttpProxy(req, replaceBody) {
    const contentType = req.headers['content-type'];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const body = replaceBody != null ? replaceBody : req.body;
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
function testHttpProxyServer() {
    const { runServer } = require('@wfh/plink/wfh/dist/package-runner');
    const shutdown = runServer().shutdown;
    plink_1.config.change(setting => {
        setting['@wfh/assets-processer'].httpProxy = { '/takeMeToPing': 'http://localhost:14333/ping' };
    });
    plink_1.exitHooks.push(shutdown);
}
exports.testHttpProxyServer = testHttpProxyServer;
//# sourceMappingURL=utils.js.map