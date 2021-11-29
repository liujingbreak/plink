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
exports.testable = exports.createProxyWithCache = exports.setupHttpProxy = exports.createResponseTimestamp = void 0;
const stream_1 = __importDefault(require("stream"));
const path_1 = __importDefault(require("path"));
const __api_1 = __importDefault(require("__api"));
const lodash_1 = __importDefault(require("lodash"));
const utils_1 = require("@wfh/http-server/dist/utils");
const plink_1 = require("@wfh/plink");
const tiny_redux_toolkit_1 = require("@wfh/redux-toolkit-observable/dist/tiny-redux-toolkit");
const fs_extra_1 = __importDefault(require("fs-extra"));
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const inspector_1 = __importDefault(require("inspector"));
const http_proxy_middleware_1 = require("http-proxy-middleware");
inspector_1.default.open(9222, 'localhost', true);
const logTime = plink_1.logger.getLogger(__api_1.default.packageName + '.timestamp');
const log = (0, plink_1.log4File)(__filename);
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
    __api_1.default.expressAppSet(app => {
        app.use(proxyPath, (0, http_proxy_middleware_1.createProxyMiddleware)(proxyMidOpt));
    });
}
exports.setupHttpProxy = setupHttpProxy;
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
            // if (opts.deleteOrigin)
            proxyReq.removeHeader('Origin'); // Bypass CORS restrict on target server
            const referer = proxyReq.getHeader('referer');
            if (typeof referer === 'string') {
                proxyReq.setHeader('referer', `${protocol}//${host}${new URL(referer).pathname}`);
            }
            hpmLog.info(`Proxy request to ${protocol}//${host}${proxyReq.path} method: ${req.method || 'uknown'}, ${JSON.stringify(proxyReq.getHeaders(), null, '  ')}`);
        },
        onProxyRes(incoming, req, res) {
            incoming.headers['Access-Control-Allow-Origin'] = '*';
            if (__api_1.default.config().devMode) {
                hpmLog.info(`Proxy recieve ${req.url || ''}, status: ${incoming.statusCode}\n`, JSON.stringify(incoming.headers, null, '  '));
            }
            else {
                hpmLog.info(`Proxy recieve ${req.url || ''}, status: ${incoming.statusCode}`);
            }
            if (__api_1.default.config().devMode) {
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
function createProxyWithCache(proxyPath, targetUrl, cacheRootDir) {
    debugger;
    const initialState = {
        cacheDir: cacheRootDir,
        cacheByUri: new Map()
    };
    __api_1.default.expressAppSet(app => {
        app.use(proxyPath, (req, res, next) => {
            const key = keyOfUri(req.method, req.url);
            cacheService.actionDispatcher.hitCache({ key, req, res, next });
        });
    });
    const cacheService = (0, tiny_redux_toolkit_1.createSlice)({
        initialState,
        name: proxyPath,
        reducers: {
            hitCache(s, payload) { },
            _addToCache(s, payload) { },
            _loadFromStorage(s, payload) {
                s.cacheByUri.set(payload.key, 'loading');
            },
            _requestRemote(s, payload) {
                s.cacheByUri.set(payload.key, 'requesting');
            },
            _gotCache(s, payload) {
                // s.cacheByUri.set(payload.key, payload.data);
                s.cacheByUri.delete(payload.key);
            }
        }
    });
    cacheService.epic(action$ => {
        const proxyOpt = defaultProxyOptions(proxyPath, targetUrl);
        const proxyError$ = new rx.Subject();
        const proxyRes$ = new rx.Subject();
        const proxyMiddleware = (0, http_proxy_middleware_1.createProxyMiddleware)(Object.assign(Object.assign({}, proxyOpt), { onProxyRes(...args) {
                proxyRes$.next(args);
                proxyOpt.onProxyRes(...args);
            },
            onError(...args) {
                proxyOpt.onError(...args);
                proxyError$.next(args);
            } }));
        const actions = (0, tiny_redux_toolkit_1.castByActionType)(cacheService.actions, action$);
        return rx.merge(actions.hitCache.pipe(op.mergeMap(({ payload }) => {
            const item = cacheService.getState().cacheByUri.get(payload.key);
            if (item == null) {
                cacheService.actionDispatcher._loadFromStorage(payload);
                return rx.EMPTY;
            }
            else if (item === 'loading' || item === 'requesting') {
                return actions._gotCache.pipe(op.filter(action => action.payload.key === payload.key), op.take(1), op.map(({ payload: { data } }) => {
                    for (const entry of data.headers) {
                        payload.res.setHeader(entry[0], entry[1]);
                    }
                    payload.res.end(data.body);
                }));
            }
            else {
                sendRes(payload.res, item.headers, item.body);
                return rx.EMPTY;
            }
        })), actions._loadFromStorage.pipe(op.map(async ({ payload }) => {
            const hFile = path_1.default.resolve(cacheService.getState().cacheDir, payload.key, payload.key + '.header.json');
            const bFile = path_1.default.resolve(cacheService.getState().cacheDir, payload.key, payload.key + '.body');
            if (fs_extra_1.default.existsSync(hFile)) {
                const [headersStr, body] = await Promise.all([
                    fs_extra_1.default.promises.readFile(hFile, 'utf-8'),
                    fs_extra_1.default.promises.readFile(bFile)
                ]);
                const headers = JSON.parse(headersStr);
                cacheService.actionDispatcher._gotCache({ key: payload.key, data: {
                        headers,
                        body
                    } });
                sendRes(payload.res, headers, body);
            }
            else {
                cacheService.actionDispatcher._requestRemote(payload);
            }
        })), actions._requestRemote.pipe(op.mergeMap(({ payload }) => rx.merge(rx.race(proxyRes$.pipe(op.filter(([proxyRes, origReq]) => origReq === payload.req), op.take(1), op.map(([proxyRes]) => {
            cacheService.actionDispatcher._addToCache({
                key: payload.key,
                data: {
                    headers: Object.entries(proxyRes.headers).filter(entry => entry[1] != null),
                    readable: proxyRes
                }
            });
        })), proxyError$.pipe(op.filter(([err, origReq]) => origReq === payload.req), op.take(1), op.map(() => { }))), rx.defer(() => proxyMiddleware(payload.req, payload.res, payload.next)).pipe(op.ignoreElements())))), actions._addToCache.pipe(op.mergeMap(async ({ payload: { key, data } }) => {
            log.info('cache size:', cacheService.getState().cacheByUri.size);
            const dir = path_1.default.resolve(cacheService.getState().cacheDir, key);
            await fs_extra_1.default.mkdirp(dir);
            const fileWriter = fs_extra_1.default.createWriteStream(path_1.default.join(dir, key + '.body'), { flags: 'w' });
            const bodyBufs = [];
            let completeBody;
            await Promise.all([
                new Promise((resolve, reject) => {
                    stream_1.default.pipeline(data.readable, new stream_1.default.Transform({
                        transform(chunk, enc) {
                            bodyBufs.push(chunk);
                            this.push(chunk);
                        },
                        flush(cb) {
                            completeBody = Buffer.concat(bodyBufs);
                            cacheService.actionDispatcher._gotCache({ key, data: {
                                    headers: data.headers,
                                    body: completeBody
                                } });
                            cb();
                        }
                    }), fileWriter, err => {
                        if (err)
                            return reject(err);
                        resolve();
                    });
                }),
                fs_extra_1.default.promises.writeFile(path_1.default.join(dir, key + '.header.json'), JSON.stringify(data.headers, null, '  '), 'utf-8')
            ]);
        }))).pipe(op.ignoreElements(), op.catchError((err, src) => src));
    });
}
exports.createProxyWithCache = createProxyWithCache;
function sendRes(res, headers, body) {
    for (const [name, value] of headers) {
        res.setHeader(name, value);
    }
    if (Buffer.isBuffer(body))
        res.end(body);
    else
        stream_1.default.pipeline(body, res);
}
function keyOfUri(method, uri) {
    const url = new URL(method + ':/' + uri);
    const key = method + '/' + url.pathname + (url.search ? '/' + lodash_1.default.trimStart(url.search, '?') : '');
    return key;
}
exports.testable = {
    keyOfUri
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0RBQTRCO0FBQzVCLGdEQUF3QjtBQUV4QixrREFBd0I7QUFDeEIsb0RBQXVCO0FBQ3ZCLHVEQUFtRTtBQUNuRSxzQ0FBNEM7QUFDNUMsOEZBQW9HO0FBQ3BHLHdEQUEwQjtBQUUxQix5Q0FBMkI7QUFDM0IsbURBQXFDO0FBQ3JDLDBEQUFrQztBQUNsQyxpRUFBK0Y7QUFFL0YsbUJBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUN4QyxNQUFNLE9BQU8sR0FBRyxjQUFNLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsWUFBWSxDQUFDLENBQUM7QUFDakUsTUFBTSxHQUFHLEdBQUcsSUFBQSxnQkFBUSxFQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pDOzs7OztHQUtHO0FBQ0gsU0FBZ0IsdUJBQXVCLENBQUMsR0FBWSxFQUFFLEdBQWEsRUFBRSxJQUFrQjtJQUNyRixNQUFNLElBQUksR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO0lBQ3hCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztJQUVqQyxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsR0FBRyxDQUFDO0lBRXBCLFNBQVMsS0FBSztRQUNaLE1BQU0sR0FBRyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDakMsT0FBTyxDQUFDLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxNQUFNLElBQUksR0FBRyxDQUFDLFdBQVcsY0FBYyxHQUFHLENBQUMsVUFBVSx5QkFBeUIsR0FBRyxHQUFHLFNBQVMsSUFBSTtZQUM1SCxZQUFZLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLFNBQVMsTUFBTSxHQUFHLENBQUMsTUFB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QUFDLGNBQWMsRUFBRSxFQUNuQixFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsR0FBRyxDQUFDLENBQ2pDLENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFqTEQsb0RBaUxDO0FBRUQsU0FBUyxPQUFPLENBQUMsR0FBYSxFQUFFLE9BQXNDLEVBQUUsSUFBOEI7SUFDcEcsS0FBSyxNQUFNLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLE9BQU8sRUFBRTtRQUNuQyxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztLQUM1QjtJQUNELElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7UUFDdkIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQzs7UUFFZCxnQkFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7QUFDL0IsQ0FBQztBQUVELFNBQVMsUUFBUSxDQUFDLE1BQWMsRUFBRSxHQUFXO0lBQzNDLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLE1BQU0sR0FBRyxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUM7SUFDekMsTUFBTSxHQUFHLEdBQUcsTUFBTSxHQUFHLEdBQUcsR0FBRyxHQUFHLENBQUMsUUFBUSxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLGdCQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ2pHLE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQztBQUVZLFFBQUEsUUFBUSxHQUFHO0lBQ3RCLFFBQVE7Q0FDVCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHN0cmVhbSBmcm9tICdzdHJlYW0nO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge1JlcXVlc3QsIFJlc3BvbnNlLCBOZXh0RnVuY3Rpb259IGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtyZWFkQ29tcHJlc3NlZFJlc3BvbnNlfSBmcm9tICdAd2ZoL2h0dHAtc2VydmVyL2Rpc3QvdXRpbHMnO1xuaW1wb3J0IHtsb2dnZXIsIGxvZzRGaWxlfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCB7Y3JlYXRlU2xpY2UsIGNhc3RCeUFjdGlvblR5cGV9IGZyb20gJ0B3ZmgvcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlL2Rpc3QvdGlueS1yZWR1eC10b29sa2l0JztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5cbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IGluc3BlY3RvciBmcm9tICdpbnNwZWN0b3InO1xuaW1wb3J0IHsgY3JlYXRlUHJveHlNaWRkbGV3YXJlIGFzIHByb3h5LCBPcHRpb25zIGFzIFByb3h5T3B0aW9uc30gZnJvbSAnaHR0cC1wcm94eS1taWRkbGV3YXJlJztcblxuaW5zcGVjdG9yLm9wZW4oOTIyMiwgJ2xvY2FsaG9zdCcsIHRydWUpO1xuY29uc3QgbG9nVGltZSA9IGxvZ2dlci5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lICsgJy50aW1lc3RhbXAnKTtcbmNvbnN0IGxvZyA9IGxvZzRGaWxlKF9fZmlsZW5hbWUpO1xuLyoqXG4gKiBNaWRkbGV3YXJlIGZvciBwcmludGluZyBlYWNoIHJlc3BvbnNlIHByb2Nlc3MgZHVyYXRpb24gdGltZSB0byBsb2dcbiAqIEBwYXJhbSByZXEgXG4gKiBAcGFyYW0gcmVzIFxuICogQHBhcmFtIG5leHQgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSZXNwb25zZVRpbWVzdGFtcChyZXE6IFJlcXVlc3QsIHJlczogUmVzcG9uc2UsIG5leHQ6IE5leHRGdW5jdGlvbikge1xuICBjb25zdCBkYXRlID0gbmV3IERhdGUoKTtcbiAgY29uc3Qgc3RhcnRUaW1lID0gZGF0ZS5nZXRUaW1lKCk7XG5cbiAgY29uc3QgZW5kID0gcmVzLmVuZDtcblxuICBmdW5jdGlvbiBwcmludCgpIHtcbiAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgICBsb2dUaW1lLmluZm8oYHJlcXVlc3Q6ICR7cmVxLm1ldGhvZH0gJHtyZXEub3JpZ2luYWxVcmx9IHwgc3RhdHVzOiAke3Jlcy5zdGF0dXNDb2RlfSwgW3Jlc3BvbnNlIGR1cmF0aW9uOiAke25vdyAtIHN0YXJ0VGltZX1tc2AgK1xuICAgICAgYF0gKHNpbmNlICR7ZGF0ZS50b0xvY2FsZVRpbWVTdHJpbmcoKX0gJHtzdGFydFRpbWV9KSBbJHtyZXEuaGVhZGVyKCd1c2VyLWFnZW50JykhfV1gKTtcbiAgfVxuXG4gIHJlcy5lbmQgPSBmdW5jdGlvbihjaHVuaz86IGFueSwgZW5jb2Rpbmc/OiBzdHJpbmcgfCAoKCkgPT4gdm9pZCksIGNiPzogKCkgPT4gdm9pZCkge1xuICAgIGNvbnN0IGFyZ3YgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuICAgIGNvbnN0IGxhc3RBcmcgPSBhcmd1bWVudHNbYXJndW1lbnRzLmxlbmd0aCAtIDFdO1xuICAgIGlmICh0eXBlb2YgbGFzdEFyZyA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgY29uc3Qgb3JpZ2luQ2IgPSBhcmd1bWVudHNbYXJndW1lbnRzLmxlbmd0aCAtIDFdO1xuICAgICAgYXJndlthcmd2Lmxlbmd0aCAtIDFdID0gKCkgPT4ge1xuICAgICAgICBvcmlnaW5DYigpO1xuICAgICAgICBwcmludCgpO1xuICAgICAgfTtcbiAgICB9IGVsc2UgaWYgKGFyZ3YubGVuZ3RoID09PSAwKSB7XG4gICAgICBhcmd2LnB1c2gobnVsbCwgcHJpbnQpO1xuICAgIH0gZWxzZSBpZiAoYXJndi5sZW5ndGggPT09IDEpIHtcbiAgICAgIGFyZ3YucHVzaChwcmludCk7XG4gICAgfVxuICAgIGNvbnN0IHJldCA9IGVuZC5hcHBseShyZXMsIGFyZ3YpO1xuICAgIHJldHVybiByZXQ7XG4gIH07XG5cbiAgbmV4dCgpO1xufVxuXG4vKipcbiAqIFRoaXMgZnVuY3Rpb24gdXNlcyBodHRwLXByb3h5LW1pZGRsZXdhcmUgaW50ZXJuYWxseS5cbiAqIFxuICogQmUgYXdhcmUgd2l0aCBjb21tYW5kIGxpbmUgb3B0aW9uIFwiLS12ZXJib3NlXCIsIG9uY2UgZW5hYmxlIFwidmVyYm9zZVwiLCB0aGlzIGZ1bmN0aW9uIHdpbGxcbiAqIHJlYWQgKHBpcGUpIHJlbW90ZSBzZXJ2ZXIgcmVzcG9uc2UgYm9keSBpbnRvIGEgc3RyaW5nIGJ1ZmZlciBmb3IgYW55IG1lc3NhZ2Ugd2l0aCBjb250ZW50LXR5cGUgaXMgXCJ0ZXh0XCIgb3IgXCJqc29uXCIgYmFzZWRcbiAqIENyZWF0ZSBhbmQgdXNlIGFuIEhUVFAgcmVxdWVzdCBwcm94eSBmb3Igc3BlY2lmaWMgcmVxdWVzdCBwYXRoXG4gKiBAcGFyYW0gcHJveHlQYXRoIFxuICogQHBhcmFtIHRhcmdldFVybCBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldHVwSHR0cFByb3h5KHByb3h5UGF0aDogc3RyaW5nLCB0YXJnZXRVcmw6IHN0cmluZyxcbiAgb3B0czoge1xuICAgIC8qKiBCeXBhc3MgQ09SUyByZXN0cmljdCBvbiB0YXJnZXQgc2VydmVyLCBkZWZhdWx0IGlzIHRydWUgKi9cbiAgICBkZWxldGVPcmlnaW4/OiBib29sZWFuO1xuICAgIHBhdGhSZXdyaXRlPzogUHJveHlPcHRpb25zWydwYXRoUmV3cml0ZSddO1xuICAgIG9uUHJveHlSZXE/OiBQcm94eU9wdGlvbnNbJ29uUHJveHlSZXEnXTtcbiAgICBvblByb3h5UmVzPzogUHJveHlPcHRpb25zWydvblByb3h5UmVzJ107XG4gICAgb25FcnJvcj86IFByb3h5T3B0aW9uc1snb25FcnJvciddO1xuICAgIGJ1ZmZlcj86IFByb3h5T3B0aW9uc1snYnVmZmVyJ107XG4gICAgc2VsZkhhbmRsZVJlc3BvbnNlPzogUHJveHlPcHRpb25zWydzZWxmSGFuZGxlUmVzcG9uc2UnXTtcbiAgICBwcm94eVRpbWVvdXQ/OiBQcm94eU9wdGlvbnNbJ3Byb3h5VGltZW91dCddO1xuICB9ID0ge30pIHtcblxuICBwcm94eVBhdGggPSBfLnRyaW1FbmQocHJveHlQYXRoLCAnLycpO1xuICB0YXJnZXRVcmwgPSBfLnRyaW1FbmQodGFyZ2V0VXJsLCAnLycpO1xuXG4gIGNvbnN0IGRlZmF1bHRPcHQgPSBkZWZhdWx0UHJveHlPcHRpb25zKHByb3h5UGF0aCwgdGFyZ2V0VXJsKTtcblxuICBjb25zdCBwcm94eU1pZE9wdDogUHJveHlPcHRpb25zID0ge1xuICAgIC4uLmRlZmF1bHRPcHQsXG4gICAgb25Qcm94eVJlcSguLi5hcmdzKSB7XG4gICAgICBjb25zdCBvcmlnSGVhZGVyID0gYXJnc1swXS5nZXRIZWFkZXIoJ09yaWdpbicpO1xuICAgICAgZGVmYXVsdE9wdC5vblByb3h5UmVxKC4uLmFyZ3MpO1xuXG4gICAgICBpZiAob3B0cy5kZWxldGVPcmlnaW4gPT09IGZhbHNlKSB7XG4gICAgICAgIC8vIFJlY292ZXIgcmVtb3ZlZCBoZWFkZXIgXCJPcmlnaW5cIlxuICAgICAgICBhcmdzWzBdLnNldEhlYWRlcignT3JpZ2luJywgb3JpZ0hlYWRlciBhcyBzdHJpbmcpO1xuICAgICAgfVxuICAgICAgaWYgKG9wdHMub25Qcm94eVJlcSlcbiAgICAgICAgb3B0cy5vblByb3h5UmVxKC4uLmFyZ3MpO1xuICAgIH0sXG4gICAgb25Qcm94eVJlcyguLi5hcmdzKSB7XG4gICAgICBpZiAob3B0cy5vblByb3h5UmVzKVxuICAgICAgICBvcHRzLm9uUHJveHlSZXMoLi4uYXJncyk7XG4gICAgICBkZWZhdWx0T3B0Lm9uUHJveHlSZXMoLi4uYXJncyk7XG4gICAgfSxcbiAgICBvbkVycm9yKC4uLmFyZ3MpIHtcbiAgICAgIGRlZmF1bHRPcHQub25FcnJvciguLi5hcmdzKTtcbiAgICAgIGlmIChvcHRzLm9uRXJyb3IpXG4gICAgICAgIG9wdHMub25FcnJvciguLi5hcmdzKTtcbiAgICB9XG4gIH07XG5cblxuICBhcGkuZXhwcmVzc0FwcFNldChhcHAgPT4ge1xuICAgIGFwcC51c2UocHJveHlQYXRoLCBwcm94eShwcm94eU1pZE9wdCkpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gZGVmYXVsdFByb3h5T3B0aW9ucyhwcm94eVBhdGg6IHN0cmluZywgdGFyZ2V0VXJsOiBzdHJpbmcpIHtcbiAgcHJveHlQYXRoID0gXy50cmltRW5kKHByb3h5UGF0aCwgJy8nKTtcbiAgdGFyZ2V0VXJsID0gXy50cmltRW5kKHRhcmdldFVybCwgJy8nKTtcbiAgY29uc3QgeyBwcm90b2NvbCwgaG9zdCwgcGF0aG5hbWUgfSA9IG5ldyBVUkwodGFyZ2V0VXJsKTtcblxuICBjb25zdCBwYXRQYXRoID0gbmV3IFJlZ0V4cCgnXicgKyBfLmVzY2FwZVJlZ0V4cChwcm94eVBhdGgpICsgJygvfCQpJyk7XG4gIGNvbnN0IGhwbUxvZyA9IGxvZ2dlci5nZXRMb2dnZXIoJ0hQTS4nICsgcHJveHlQYXRoKTtcblxuICBjb25zdCBwcm94eU1pZE9wdDogUHJveHlPcHRpb25zICYgIHtbSyBpbiAncGF0aFJld3JpdGUnIHwgJ29uUHJveHlSZXEnIHwgJ29uUHJveHlSZXMnIHwgJ29uRXJyb3InXTogTm9uTnVsbGFibGU8UHJveHlPcHRpb25zW0tdPn0gPSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG1heC1sZW5cbiAgICB0YXJnZXQ6IHByb3RvY29sICsgJy8vJyArIGhvc3QsXG4gICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgIHdzOiBmYWxzZSxcbiAgICBzZWN1cmU6IGZhbHNlLFxuICAgIGNvb2tpZURvbWFpblJld3JpdGU6IHsgJyonOiAnJyB9LFxuICAgIHBhdGhSZXdyaXRlOiAocGF0aCwgcmVxKSA9PiB7XG4gICAgICAvLyBocG1Mb2cud2FybigncGF0UGF0aD0nLCBwYXRQYXRoLCAncGF0aD0nLCBwYXRoKTtcbiAgICAgIGNvbnN0IHJldCA9IHBhdGggJiYgcGF0aC5yZXBsYWNlKHBhdFBhdGgsIF8udHJpbUVuZChwYXRobmFtZSwgJy8nKSArICcvJyk7XG4gICAgICAvLyBocG1Mb2cuaW5mbyhgcHJveHkgdG8gcGF0aDogJHtyZXEubWV0aG9kfSAke3Byb3RvY29sICsgJy8vJyArIGhvc3R9JHtyZXR9LCByZXEudXJsID0gJHtyZXEudXJsfWApO1xuICAgICAgcmV0dXJuIHJldDtcbiAgICB9LFxuICAgIGxvZ0xldmVsOiAnZGVidWcnLFxuICAgIGxvZ1Byb3ZpZGVyOiBwcm92aWRlciA9PiBocG1Mb2csXG4gICAgcHJveHlUaW1lb3V0OiAxMDAwMCxcbiAgICBvblByb3h5UmVxKHByb3h5UmVxLCByZXEsIHJlcywgLi4ucmVzdCkge1xuICAgICAgLy8gaWYgKG9wdHMuZGVsZXRlT3JpZ2luKVxuICAgICAgcHJveHlSZXEucmVtb3ZlSGVhZGVyKCdPcmlnaW4nKTsgLy8gQnlwYXNzIENPUlMgcmVzdHJpY3Qgb24gdGFyZ2V0IHNlcnZlclxuICAgICAgY29uc3QgcmVmZXJlciA9IHByb3h5UmVxLmdldEhlYWRlcigncmVmZXJlcicpO1xuICAgICAgaWYgKHR5cGVvZiByZWZlcmVyID09PSAnc3RyaW5nJykge1xuICAgICAgICBwcm94eVJlcS5zZXRIZWFkZXIoJ3JlZmVyZXInLCBgJHtwcm90b2NvbH0vLyR7aG9zdH0ke25ldyBVUkwocmVmZXJlcikucGF0aG5hbWV9YCk7XG4gICAgICB9XG4gICAgICBocG1Mb2cuaW5mbyhgUHJveHkgcmVxdWVzdCB0byAke3Byb3RvY29sfS8vJHtob3N0fSR7cHJveHlSZXEucGF0aH0gbWV0aG9kOiAke3JlcS5tZXRob2QgfHwgJ3Vrbm93bid9LCAke0pTT04uc3RyaW5naWZ5KHByb3h5UmVxLmdldEhlYWRlcnMoKSwgbnVsbCwgJyAgJyl9YCk7XG4gICAgfSxcbiAgICBvblByb3h5UmVzKGluY29taW5nLCByZXEsIHJlcykge1xuICAgICAgaW5jb21pbmcuaGVhZGVyc1snQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJ10gPSAnKic7XG4gICAgICBpZiAoYXBpLmNvbmZpZygpLmRldk1vZGUpIHtcbiAgICAgICAgaHBtTG9nLmluZm8oYFByb3h5IHJlY2lldmUgJHtyZXEudXJsIHx8ICcnfSwgc3RhdHVzOiAke2luY29taW5nLnN0YXR1c0NvZGUhfVxcbmAsXG4gICAgICAgICAgSlNPTi5zdHJpbmdpZnkoaW5jb21pbmcuaGVhZGVycywgbnVsbCwgJyAgJykpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgaHBtTG9nLmluZm8oYFByb3h5IHJlY2lldmUgJHtyZXEudXJsIHx8ICcnfSwgc3RhdHVzOiAke2luY29taW5nLnN0YXR1c0NvZGUhfWApO1xuICAgICAgfVxuICAgICAgaWYgKGFwaS5jb25maWcoKS5kZXZNb2RlKSB7XG5cbiAgICAgICAgY29uc3QgY3QgPSBpbmNvbWluZy5oZWFkZXJzWydjb250ZW50LXR5cGUnXTtcbiAgICAgICAgaHBtTG9nLmluZm8oYFJlc3BvbnNlICR7cmVxLnVybCB8fCAnJ30gaGVhZGVyczpcXG5gLCBpbmNvbWluZy5oZWFkZXJzKTtcbiAgICAgICAgY29uc3QgaXNUZXh0ID0gKGN0ICYmIC9cXGIoanNvbnx0ZXh0KVxcYi9pLnRlc3QoY3QpKTtcbiAgICAgICAgaWYgKGlzVGV4dCkge1xuICAgICAgICAgIGlmICghaW5jb21pbmcuY29tcGxldGUpIHtcbiAgICAgICAgICAgIGNvbnN0IGJ1ZnMgPSBbXSBhcyBzdHJpbmdbXTtcbiAgICAgICAgICAgIHZvaWQgcmVhZENvbXByZXNzZWRSZXNwb25zZShpbmNvbWluZywgbmV3IHN0cmVhbS5Xcml0YWJsZSh7XG4gICAgICAgICAgICAgIHdyaXRlKGNodW5rOiBCdWZmZXIgfCBzdHJpbmcsIGVuYywgY2IpIHtcbiAgICAgICAgICAgICAgICBidWZzLnB1c2goQnVmZmVyLmlzQnVmZmVyKGNodW5rKSA/IGNodW5rLnRvU3RyaW5nKCkgOiBjaHVuayk7XG4gICAgICAgICAgICAgICAgY2IoKTtcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgZmluYWwoY2IpIHtcbiAgICAgICAgICAgICAgICBocG1Mb2cuaW5mbyhgUmVzcG9uc2UgJHtyZXEudXJsIHx8ICcnfSB0ZXh0IGJvZHk6XFxuYCwgYnVmcy5qb2luKCcnKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKChpbmNvbWluZyBhcyB7Ym9keT86IEJ1ZmZlciB8IHN0cmluZ30pLmJvZHkpIHtcbiAgICAgICAgICAgIGhwbUxvZy5pbmZvKGBSZXNwb25zZSAke3JlcS51cmwgfHwgJyd9IHRleHQgYm9keTpcXG5gLCAoaW5jb21pbmcgYXMge2JvZHk/OiBCdWZmZXIgfCBzdHJpbmd9KS50b1N0cmluZygpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIG9uRXJyb3IoZXJyLCByZXEsIHJlcykge1xuICAgICAgaHBtTG9nLndhcm4oZXJyKTtcbiAgICB9XG4gIH07XG4gIHJldHVybiBwcm94eU1pZE9wdDtcbn1cblxudHlwZSBQcm94eUNhY2hlU3RhdGUgPSB7XG4gIGNhY2hlRGlyOiBzdHJpbmc7XG4gIGNhY2hlQnlVcmk6IE1hcDxzdHJpbmcsIENhY2hlRGF0YSB8ICdsb2FkaW5nJyB8ICdyZXF1ZXN0aW5nJz47XG4gIGVycm9yPzogRXJyb3I7XG59O1xuXG50eXBlIENhY2hlRGF0YSA9IHtcbiAgaGVhZGVyczogW3N0cmluZywgc3RyaW5nIHwgc3RyaW5nW11dW107XG4gIGJvZHk6IEJ1ZmZlcjtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVQcm94eVdpdGhDYWNoZShwcm94eVBhdGg6IHN0cmluZywgdGFyZ2V0VXJsOiBzdHJpbmcsIGNhY2hlUm9vdERpcjogc3RyaW5nKSB7XG4gIGRlYnVnZ2VyO1xuICBjb25zdCBpbml0aWFsU3RhdGU6IFByb3h5Q2FjaGVTdGF0ZSA9IHtcbiAgICBjYWNoZURpcjogY2FjaGVSb290RGlyLFxuICAgIGNhY2hlQnlVcmk6IG5ldyBNYXAoKVxuICB9O1xuXG4gIGFwaS5leHByZXNzQXBwU2V0KGFwcCA9PiB7XG4gICAgYXBwLnVzZShwcm94eVBhdGgsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgICAgY29uc3Qga2V5ID0ga2V5T2ZVcmkocmVxLm1ldGhvZCwgcmVxLnVybCk7XG4gICAgICBjYWNoZVNlcnZpY2UuYWN0aW9uRGlzcGF0Y2hlci5oaXRDYWNoZSh7a2V5LCByZXEsIHJlcywgbmV4dH0pO1xuICAgIH0pO1xuICB9KTtcblxuICBjb25zdCBjYWNoZVNlcnZpY2UgPSBjcmVhdGVTbGljZSh7XG4gICAgaW5pdGlhbFN0YXRlLFxuICAgIG5hbWU6IHByb3h5UGF0aCxcbiAgICByZWR1Y2Vyczoge1xuICAgICAgaGl0Q2FjaGUoczogUHJveHlDYWNoZVN0YXRlLCBwYXlsb2FkOiB7a2V5OiBzdHJpbmc7IHJlcTogUmVxdWVzdDsgcmVzOiBSZXNwb25zZTsgbmV4dDogTmV4dEZ1bmN0aW9ufSkge30sXG5cbiAgICAgIF9hZGRUb0NhY2hlKHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDoge1xuICAgICAgICBrZXk6IHN0cmluZztcbiAgICAgICAgZGF0YToge2hlYWRlcnM6IENhY2hlRGF0YVsnaGVhZGVycyddOyByZWFkYWJsZTogc3RyZWFtLlJlYWRhYmxlfTtcbiAgICAgIH0pIHt9LFxuXG4gICAgICBfbG9hZEZyb21TdG9yYWdlKHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDoge2tleTogc3RyaW5nOyByZXE6IFJlcXVlc3Q7IHJlczogUmVzcG9uc2U7IG5leHQ6IE5leHRGdW5jdGlvbn0pIHtcbiAgICAgICAgcy5jYWNoZUJ5VXJpLnNldChwYXlsb2FkLmtleSwgJ2xvYWRpbmcnKTtcbiAgICAgIH0sXG5cbiAgICAgIF9yZXF1ZXN0UmVtb3RlKHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDoge2tleTogc3RyaW5nOyByZXE6IFJlcXVlc3Q7IHJlczogUmVzcG9uc2U7IG5leHQ6IE5leHRGdW5jdGlvbn0pIHtcbiAgICAgICAgcy5jYWNoZUJ5VXJpLnNldChwYXlsb2FkLmtleSwgJ3JlcXVlc3RpbmcnKTtcbiAgICAgIH0sXG4gICAgICBfZ290Q2FjaGUoczogUHJveHlDYWNoZVN0YXRlLCBwYXlsb2FkOiB7XG4gICAgICAgIGtleTogc3RyaW5nO1xuICAgICAgICBkYXRhOiBDYWNoZURhdGE7XG4gICAgICB9KSB7XG4gICAgICAgIC8vIHMuY2FjaGVCeVVyaS5zZXQocGF5bG9hZC5rZXksIHBheWxvYWQuZGF0YSk7XG4gICAgICAgIHMuY2FjaGVCeVVyaS5kZWxldGUocGF5bG9hZC5rZXkpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgY2FjaGVTZXJ2aWNlLmVwaWMoYWN0aW9uJCA9PiB7XG4gICAgY29uc3QgcHJveHlPcHQgPSBkZWZhdWx0UHJveHlPcHRpb25zKHByb3h5UGF0aCwgdGFyZ2V0VXJsKTtcblxuICAgIGNvbnN0IHByb3h5RXJyb3IkID0gbmV3IHJ4LlN1YmplY3Q8UGFyYW1ldGVyczwodHlwZW9mIHByb3h5T3B0KVsnb25FcnJvciddPj4oKTtcbiAgICBjb25zdCBwcm94eVJlcyQgPSBuZXcgcnguU3ViamVjdDxQYXJhbWV0ZXJzPCh0eXBlb2YgcHJveHlPcHQpWydvblByb3h5UmVzJ10+PigpO1xuXG4gICAgY29uc3QgcHJveHlNaWRkbGV3YXJlID0gcHJveHkoe1xuICAgICAgLi4ucHJveHlPcHQsXG4gICAgICBvblByb3h5UmVzKC4uLmFyZ3MpIHtcbiAgICAgICAgcHJveHlSZXMkLm5leHQoYXJncyk7XG4gICAgICAgIHByb3h5T3B0Lm9uUHJveHlSZXMoLi4uYXJncyk7XG4gICAgICB9LFxuICAgICAgb25FcnJvciguLi5hcmdzKSB7XG4gICAgICAgIHByb3h5T3B0Lm9uRXJyb3IoLi4uYXJncyk7XG4gICAgICAgIHByb3h5RXJyb3IkLm5leHQoYXJncyk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgY29uc3QgYWN0aW9ucyA9IGNhc3RCeUFjdGlvblR5cGUoY2FjaGVTZXJ2aWNlLmFjdGlvbnMsIGFjdGlvbiQpO1xuXG4gICAgcmV0dXJuIHJ4Lm1lcmdlKFxuICAgICAgYWN0aW9ucy5oaXRDYWNoZS5waXBlKFxuICAgICAgICBvcC5tZXJnZU1hcCggKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICAgIGNvbnN0IGl0ZW0gPSBjYWNoZVNlcnZpY2UuZ2V0U3RhdGUoKS5jYWNoZUJ5VXJpLmdldChwYXlsb2FkLmtleSk7XG4gICAgICAgICAgaWYgKGl0ZW0gPT0gbnVsbCkge1xuICAgICAgICAgICAgY2FjaGVTZXJ2aWNlLmFjdGlvbkRpc3BhdGNoZXIuX2xvYWRGcm9tU3RvcmFnZShwYXlsb2FkKTtcbiAgICAgICAgICAgIHJldHVybiByeC5FTVBUWTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0gPT09ICdsb2FkaW5nJyB8fCBpdGVtID09PSAncmVxdWVzdGluZycpIHtcbiAgICAgICAgICAgIHJldHVybiBhY3Rpb25zLl9nb3RDYWNoZS5waXBlKFxuICAgICAgICAgICAgICBvcC5maWx0ZXIoYWN0aW9uID0+IGFjdGlvbi5wYXlsb2FkLmtleSA9PT0gcGF5bG9hZC5rZXkpLFxuICAgICAgICAgICAgICBvcC50YWtlKDEpLFxuICAgICAgICAgICAgICBvcC5tYXAoKHtwYXlsb2FkOiB7ZGF0YX19KSA9PiB7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBkYXRhLmhlYWRlcnMpIHtcbiAgICAgICAgICAgICAgICAgIHBheWxvYWQucmVzLnNldEhlYWRlcihlbnRyeVswXSwgZW50cnlbMV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwYXlsb2FkLnJlcy5lbmQoZGF0YS5ib2R5KTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNlbmRSZXMocGF5bG9hZC5yZXMsIGl0ZW0uaGVhZGVycywgaXRlbS5ib2R5KTtcbiAgICAgICAgICAgIHJldHVybiByeC5FTVBUWTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICApLFxuICAgICAgYWN0aW9ucy5fbG9hZEZyb21TdG9yYWdlLnBpcGUoXG4gICAgICAgIG9wLm1hcChhc3luYyAoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgICAgY29uc3QgaEZpbGUgPSBQYXRoLnJlc29sdmUoY2FjaGVTZXJ2aWNlLmdldFN0YXRlKCkuY2FjaGVEaXIsIHBheWxvYWQua2V5LCBwYXlsb2FkLmtleSArICcuaGVhZGVyLmpzb24nKTtcbiAgICAgICAgICBjb25zdCBiRmlsZSA9IFBhdGgucmVzb2x2ZShjYWNoZVNlcnZpY2UuZ2V0U3RhdGUoKS5jYWNoZURpciwgcGF5bG9hZC5rZXksIHBheWxvYWQua2V5ICsgJy5ib2R5Jyk7XG4gICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoaEZpbGUpKSB7XG4gICAgICAgICAgICBjb25zdCBbaGVhZGVyc1N0ciwgYm9keV0gPSBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgICAgICAgICAgIGZzLnByb21pc2VzLnJlYWRGaWxlKGhGaWxlLCAndXRmLTgnKSxcbiAgICAgICAgICAgICAgZnMucHJvbWlzZXMucmVhZEZpbGUoYkZpbGUpXG4gICAgICAgICAgICBdKTtcbiAgICAgICAgICAgIGNvbnN0IGhlYWRlcnMgPSBKU09OLnBhcnNlKGhlYWRlcnNTdHIpIGFzIFtzdHJpbmcsIHN0cmluZyB8IHN0cmluZ1tdXVtdO1xuICAgICAgICAgICAgY2FjaGVTZXJ2aWNlLmFjdGlvbkRpc3BhdGNoZXIuX2dvdENhY2hlKHtrZXk6IHBheWxvYWQua2V5LCBkYXRhOiB7XG4gICAgICAgICAgICAgIGhlYWRlcnMsXG4gICAgICAgICAgICAgIGJvZHlcbiAgICAgICAgICAgIH19KTtcbiAgICAgICAgICAgIHNlbmRSZXMocGF5bG9hZC5yZXMsIGhlYWRlcnMsIGJvZHkpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYWNoZVNlcnZpY2UuYWN0aW9uRGlzcGF0Y2hlci5fcmVxdWVzdFJlbW90ZShwYXlsb2FkKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICApLFxuICAgICAgYWN0aW9ucy5fcmVxdWVzdFJlbW90ZS5waXBlKFxuICAgICAgICBvcC5tZXJnZU1hcCgoe3BheWxvYWR9KSA9PiByeC5tZXJnZShcbiAgICAgICAgICByeC5yYWNlKFxuICAgICAgICAgICAgcHJveHlSZXMkLnBpcGUoXG4gICAgICAgICAgICAgIG9wLmZpbHRlcigoW3Byb3h5UmVzLCBvcmlnUmVxXSkgPT4gb3JpZ1JlcSA9PT0gcGF5bG9hZC5yZXEpLFxuICAgICAgICAgICAgICBvcC50YWtlKDEpLFxuICAgICAgICAgICAgICBvcC5tYXAoKFtwcm94eVJlc10pID0+IHtcbiAgICAgICAgICAgICAgICBjYWNoZVNlcnZpY2UuYWN0aW9uRGlzcGF0Y2hlci5fYWRkVG9DYWNoZSh7XG4gICAgICAgICAgICAgICAgICBrZXk6IHBheWxvYWQua2V5LFxuICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXJzOiBPYmplY3QuZW50cmllcyhwcm94eVJlcy5oZWFkZXJzKS5maWx0ZXIoZW50cnkgPT4gZW50cnlbMV0gIT0gbnVsbCkgYXMgW3N0cmluZywgc3RyaW5nIHwgc3RyaW5nW11dW10sXG4gICAgICAgICAgICAgICAgICAgIHJlYWRhYmxlOiBwcm94eVJlc1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgKSxcbiAgICAgICAgICAgIHByb3h5RXJyb3IkLnBpcGUoXG4gICAgICAgICAgICAgIG9wLmZpbHRlcigoW2Vyciwgb3JpZ1JlcV0pID0+IG9yaWdSZXEgPT09IHBheWxvYWQucmVxKSxcbiAgICAgICAgICAgICAgb3AudGFrZSgxKSxcbiAgICAgICAgICAgICAgb3AubWFwKCgpID0+IHt9KVxuICAgICAgICAgICAgKVxuICAgICAgICAgICksXG4gICAgICAgICAgcnguZGVmZXIoKCkgPT4gcHJveHlNaWRkbGV3YXJlKHBheWxvYWQucmVxLCBwYXlsb2FkLnJlcywgcGF5bG9hZC5uZXh0KSkucGlwZShcbiAgICAgICAgICAgIG9wLmlnbm9yZUVsZW1lbnRzKClcbiAgICAgICAgICApXG4gICAgICAgICkpXG4gICAgICApLFxuICAgICAgYWN0aW9ucy5fYWRkVG9DYWNoZS5waXBlKFxuICAgICAgICBvcC5tZXJnZU1hcChhc3luYyAoe3BheWxvYWQ6IHtrZXksIGRhdGF9fSkgPT4ge1xuICAgICAgICAgIGxvZy5pbmZvKCdjYWNoZSBzaXplOicsIGNhY2hlU2VydmljZS5nZXRTdGF0ZSgpLmNhY2hlQnlVcmkuc2l6ZSk7XG4gICAgICAgICAgY29uc3QgZGlyID0gUGF0aC5yZXNvbHZlKGNhY2hlU2VydmljZS5nZXRTdGF0ZSgpLmNhY2hlRGlyLCBrZXkpO1xuICAgICAgICAgIGF3YWl0IGZzLm1rZGlycChkaXIpO1xuICAgICAgICAgIGNvbnN0IGZpbGVXcml0ZXIgPSBmcy5jcmVhdGVXcml0ZVN0cmVhbShQYXRoLmpvaW4oZGlyLCBrZXkgKyAnLmJvZHknKSwge2ZsYWdzOiAndyd9KTtcbiAgICAgICAgICBjb25zdCBib2R5QnVmczogQnVmZmVyW10gPSBbXTtcbiAgICAgICAgICBsZXQgY29tcGxldGVCb2R5OiBCdWZmZXI7XG4gICAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgICAgICAgICAgbmV3IFByb21pc2U8dm9pZD4oKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgICAgICAgICBzdHJlYW0ucGlwZWxpbmUoXG4gICAgICAgICAgICAgICAgZGF0YS5yZWFkYWJsZSxcbiAgICAgICAgICAgICAgICBuZXcgc3RyZWFtLlRyYW5zZm9ybSh7XG4gICAgICAgICAgICAgICAgICB0cmFuc2Zvcm0oY2h1bmssIGVuYykge1xuICAgICAgICAgICAgICAgICAgICBib2R5QnVmcy5wdXNoKGNodW5rKTtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5wdXNoKGNodW5rKTtcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICBmbHVzaChjYikge1xuICAgICAgICAgICAgICAgICAgICBjb21wbGV0ZUJvZHkgPSBCdWZmZXIuY29uY2F0KGJvZHlCdWZzKTtcbiAgICAgICAgICAgICAgICAgICAgY2FjaGVTZXJ2aWNlLmFjdGlvbkRpc3BhdGNoZXIuX2dvdENhY2hlKHtrZXksIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgICBoZWFkZXJzOiBkYXRhLmhlYWRlcnMsXG4gICAgICAgICAgICAgICAgICAgICAgYm9keTogY29tcGxldGVCb2R5XG4gICAgICAgICAgICAgICAgICAgIH19KTtcbiAgICAgICAgICAgICAgICAgICAgY2IoKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICBmaWxlV3JpdGVyLFxuICAgICAgICAgICAgICAgIGVyciA9PiB7XG4gICAgICAgICAgICAgICAgICBpZiAoZXJyKSByZXR1cm4gcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBmcy5wcm9taXNlcy53cml0ZUZpbGUoXG4gICAgICAgICAgICAgIFBhdGguam9pbihkaXIsIGtleSArICcuaGVhZGVyLmpzb24nKSxcbiAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoZGF0YS5oZWFkZXJzLCBudWxsLCAnICAnKSxcbiAgICAgICAgICAgICAgJ3V0Zi04JylcbiAgICAgICAgICBdKTtcbiAgICAgICAgfSlcbiAgICAgIClcbiAgICApLnBpcGUoXG4gICAgICBvcC5pZ25vcmVFbGVtZW50cygpLFxuICAgICAgb3AuY2F0Y2hFcnJvcigoZXJyLCBzcmMpID0+IHNyYylcbiAgICApO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gc2VuZFJlcyhyZXM6IFJlc3BvbnNlLCBoZWFkZXJzOiBbc3RyaW5nLCBzdHJpbmcgfCBzdHJpbmdbXV1bXSwgYm9keTogQnVmZmVyIHwgc3RyZWFtLlJlYWRhYmxlKSB7XG4gIGZvciAoY29uc3QgW25hbWUsIHZhbHVlXSBvZiBoZWFkZXJzKSB7XG4gICAgcmVzLnNldEhlYWRlcihuYW1lLCB2YWx1ZSk7XG4gIH1cbiAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihib2R5KSlcbiAgICByZXMuZW5kKGJvZHkpO1xuICBlbHNlXG4gICAgc3RyZWFtLnBpcGVsaW5lKGJvZHksIHJlcyk7XG59XG5cbmZ1bmN0aW9uIGtleU9mVXJpKG1ldGhvZDogc3RyaW5nLCB1cmk6IHN0cmluZykge1xuICBjb25zdCB1cmwgPSBuZXcgVVJMKG1ldGhvZCArICc6LycgKyB1cmkpO1xuICBjb25zdCBrZXkgPSBtZXRob2QgKyAnLycgKyB1cmwucGF0aG5hbWUgKyAodXJsLnNlYXJjaCA/ICcvJyArIF8udHJpbVN0YXJ0KHVybC5zZWFyY2gsICc/JykgOiAnJyk7XG4gIHJldHVybiBrZXk7XG59XG5cbmV4cG9ydCBjb25zdCB0ZXN0YWJsZSA9IHtcbiAga2V5T2ZVcmlcbn07XG4iXX0=