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
exports.keyOfUri = exports.createProxyWithCache = void 0;
const path_1 = __importDefault(require("path"));
const stream_1 = __importDefault(require("stream"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const lodash_1 = __importDefault(require("lodash"));
const __plink_1 = __importDefault(require("__plink"));
const plink_1 = require("@wfh/plink");
const http_proxy_middleware_1 = require("http-proxy-middleware");
const tiny_redux_toolkit_1 = require("@wfh/redux-toolkit-observable/dist/tiny-redux-toolkit");
const utils_1 = require("../utils");
const log = (0, plink_1.log4File)(__filename);
const httpProxyLog = plink_1.logger.getLogger(log.category + '#httpProxy');
function createProxyWithCache(proxyPath, targetUrl, cacheRootDir, opts = { manual: false }) {
    var _a;
    const initialState = {
        // proxyOptions: defaultProxyOptions(proxyPath, targetUrl),
        cacheDir: cacheRootDir,
        cacheByUri: new Map(),
        responseTransformer: [],
        cacheTransformer: []
    };
    if (!opts.manual) {
        __plink_1.default.expressAppSet(app => {
            app.use(proxyPath, (req, res, next) => {
                const key = keyOfUri(req.method, req.url);
                cacheController.actionDispatcher.hitCache({ key, req, res, next });
            });
        });
    }
    const cacheController = (0, tiny_redux_toolkit_1.createSlice)({
        initialState,
        name: `HTTP-proxy-cache-${proxyPath}`,
        debug: (_a = (0, plink_1.config)().cliOptions) === null || _a === void 0 ? void 0 : _a.verbose,
        reducers: {
            configureProxy(s, payload) {
            },
            configTransformer(s, payload) {
                if (payload.remote)
                    s.responseTransformer = payload.remote;
                if (payload.cached)
                    s.cacheTransformer = payload.cached;
            },
            hitCache(s, payload) { },
            _addToCache(s, payload) { },
            _loadFromStorage(s, payload) {
                s.cacheByUri.set(payload.key, 'loading');
            },
            _requestRemote(s, payload) {
                s.cacheByUri.set(payload.key, 'requesting');
            },
            _gotCache(s, payload) {
                if (payload.data.statusCode !== 304)
                    s.cacheByUri.set(payload.key, payload.data);
            }
        }
    });
    cacheController.epic(action$ => {
        const defaultProxyOpt = (0, utils_1.defaultProxyOptions)(proxyPath, targetUrl);
        const proxyError$ = new rx.Subject();
        const proxyRes$ = new rx.Subject();
        let proxyMiddleware$ = new rx.ReplaySubject(1);
        const actions = (0, tiny_redux_toolkit_1.castByActionType)(cacheController.actions, action$);
        function changeCachedResponse(headers, reqHost, body) {
            if (reqHost && !reqHost.startsWith('http')) {
                // TODO: support case of HTTPS
                reqHost = 'http://' + reqHost;
            }
            const { cacheTransformer } = cacheController.getState();
            const transformers = lodash_1.default.flatten(cacheTransformer.map(entry => entry(headers, reqHost)));
            return transformBuffer(body, ...transformers).pipe(op.map(changedBody => ({
                headers: headers.map(item => item[0] === 'content-length' ?
                    [item[0], changedBody.length + ''] :
                    item),
                body: changedBody
            })));
        }
        return rx.merge(actions.configureProxy.pipe(op.map(({ payload: extraOpt }) => {
            proxyMiddleware$.next((0, http_proxy_middleware_1.createProxyMiddleware)(Object.assign(Object.assign(Object.assign(Object.assign({}, defaultProxyOpt), { followRedirects: true }), extraOpt), { onProxyRes(...args) {
                    proxyRes$.next(args);
                    defaultProxyOpt.onProxyRes(...args);
                    if (extraOpt.onProxyRes)
                        extraOpt.onProxyRes(...args);
                },
                onError(...args) {
                    defaultProxyOpt.onError(...args);
                    proxyError$.next(args);
                    if (extraOpt.onError)
                        extraOpt.onError(...args);
                } })));
        })), actions.hitCache.pipe(op.mergeMap(({ payload }) => {
            const waitCacheAndSendRes = actions._gotCache.pipe(op.filter(action => action.payload.key === payload.key &&
                payload.res.writableEnded !== true), // In case it is of redirected request, HPM has done piping response (ignored "manual reponse" setting)
            op.take(1), op.map(({ payload: { data } }) => {
                for (const entry of data.headers) {
                    payload.res.setHeader(entry[0], entry[1]);
                }
                payload.res.status(data.statusCode);
                payload.res.end(data.body);
            }));
            const item = cacheController.getState().cacheByUri.get(payload.key);
            if (item == null) {
                cacheController.actionDispatcher._loadFromStorage(payload);
                return waitCacheAndSendRes;
            }
            else if (item === 'loading' || item === 'requesting') {
                return waitCacheAndSendRes;
            }
            else {
                httpProxyLog.info('hit cached', payload.key);
                return changeCachedResponse(item.headers, payload.req.headers.host, item.body).pipe(op.map(data => {
                    sendRes(payload.res, item.statusCode, data.headers, data.body);
                }));
            }
        })), actions._loadFromStorage.pipe(op.mergeMap(async ({ payload }) => {
            const dir = path_1.default.join(cacheController.getState().cacheDir, payload.key);
            const hFile = path_1.default.join(dir, 'header.json');
            const bFile = path_1.default.join(dir, 'body');
            if (fs_extra_1.default.existsSync(hFile)) {
                httpProxyLog.info('load', payload.key);
                const [headersStr, body] = await Promise.all([
                    fs_extra_1.default.promises.readFile(hFile, 'utf-8'),
                    fs_extra_1.default.promises.readFile(bFile)
                ]);
                const { statusCode, headers } = JSON.parse(headersStr);
                const data = await changeCachedResponse(headers, payload.req.headers.host, body).toPromise();
                cacheController.actionDispatcher._gotCache({ key: payload.key, data: {
                        statusCode,
                        headers: data.headers,
                        body: data.body
                    } });
                // sendRes(payload.res, statusCode, headers, body);
            }
            else {
                log.info('No existing file for', payload.key);
                cacheController.actionDispatcher._requestRemote(payload);
            }
        })), actions._requestRemote.pipe(op.mergeMap(({ payload }) => rx.merge(rx.race(proxyRes$.pipe(op.filter(([proxyRes, origReq]) => origReq === payload.req), op.take(1), op.map(([proxyRes, origReq]) => {
            // log.warn('origReq host', origReq.headers.host);
            cacheController.actionDispatcher._addToCache({
                key: payload.key, reqHost: origReq.headers.host,
                res: payload.res,
                data: {
                    headers: Object.entries(proxyRes.headers)
                        .filter(entry => entry[1] != null),
                    readable: proxyRes
                }
            });
        })), proxyError$.pipe(op.filter(([err, origReq]) => origReq === payload.req), op.take(1), op.map(() => { }))), proxyMiddleware$.pipe(op.take(1), op.map(proxy => proxy(payload.req, payload.res, payload.next)))))), actions._addToCache.pipe(op.mergeMap(({ payload: { key, reqHost, res, data } }) => {
            httpProxyLog.debug('cache size:', cacheController.getState().cacheByUri.size);
            const dir = path_1.default.join(cacheController.getState().cacheDir, key);
            const file = path_1.default.join(dir, 'body');
            const statusCode = data.readable.statusCode || 200;
            const { responseTransformer } = cacheController.getState();
            if (reqHost && !reqHost.startsWith('http')) {
                reqHost = 'http://' + reqHost;
            }
            return (statusCode === 200 ? pipeToBuffer(data.readable, ...(responseTransformer ?
                lodash_1.default.flatten(responseTransformer.map(entry => entry(data.headers, reqHost))) :
                [])) :
                pipeToBuffer(data.readable)).pipe(op.mergeMap(async (buf) => {
                // log.warn('content-length:', buf.length);
                const lengthHeaderIdx = data.headers.findIndex(row => row[0] === 'content-length');
                if (lengthHeaderIdx >= 0)
                    data.headers[lengthHeaderIdx][1] = '' + buf.length;
                cacheController.actionDispatcher._gotCache({ key, data: {
                        statusCode,
                        headers: data.headers,
                        body: buf
                    } });
                if (statusCode === 304) {
                    log.warn('Version info is not recorded, due to response 304 from', res.req.url, ',\n you can remove existing npm/cache cache to avoid 304');
                    return rx.EMPTY;
                }
                await fs_extra_1.default.mkdirp(path_1.default.dirname(file));
                await Promise.all([
                    fs_extra_1.default.promises.writeFile(file, buf),
                    fs_extra_1.default.promises.writeFile(path_1.default.join(dir, 'header.json'), JSON.stringify({ statusCode, headers: data.headers }, null, '  '), 'utf-8')
                ]);
                httpProxyLog.info('write response to file', path_1.default.posix.relative(process.cwd(), file), 'size', buf.length);
            }), op.catchError((err, src) => {
                httpProxyLog.error('HTTP proxy cache error: failed to cache response', err);
                if (fs_extra_1.default.existsSync(dir)) {
                    return rx.defer(() => fs_extra_1.default.remove(dir)).pipe(op.take(1), op.ignoreElements() // for better TS type inference
                    );
                }
                return rx.EMPTY;
            }));
        }))).pipe(op.ignoreElements(), op.catchError((err, src) => {
            httpProxyLog.error('HTTP proxy cache error', err);
            return src;
        }));
    });
    return cacheController;
}
exports.createProxyWithCache = createProxyWithCache;
function pipeToBuffer(source, ...transformers) {
    return new rx.Observable(sub => {
        const bodyBufs = [];
        let completeBody;
        if (source.complete) {
            sub.error(new Error('response is completed earlier'));
        }
        else {
            const streams = [
                source,
                ...transformers,
                new stream_1.default.Writable({
                    write(chunk, enc, cb) {
                        bodyBufs.push(chunk);
                        cb();
                    }
                })
            ];
            stream_1.default.pipeline(streams, (err) => {
                if (err)
                    return sub.error(err);
                completeBody = Buffer.concat(bodyBufs);
                sub.next(completeBody);
                sub.complete();
            });
        }
        return () => {
            // I am not sure if this is proper cancelling of a stream pipeline
            source.pause();
            source.destroy();
        };
    });
}
function transformBuffer(source, ...transformers) {
    return new rx.Observable(sub => {
        const inputStream = new stream_1.default.Readable({
            read(_size) {
                this.push(source);
                this.push(null);
            }
        });
        const bodyBufs = [];
        let completeBody;
        stream_1.default.pipeline([inputStream, ...transformers, new stream_1.default.Writable({
                write(chunk, enc, cb) {
                    bodyBufs.push(chunk);
                    cb();
                }
            })], (err) => {
            if (err)
                return sub.error(err);
            completeBody = Buffer.concat(bodyBufs);
            sub.next(completeBody);
            sub.complete();
        });
    });
}
function sendRes(res, statusCode, headers, body) {
    res.status(statusCode);
    for (const [name, value] of headers) {
        res.setHeader(name, value);
    }
    if (Buffer.isBuffer(body))
        res.end(body);
    else
        stream_1.default.pipeline(body, res);
}
function keyOfUri(method, path) {
    const url = new URL('http://f.com' + path);
    const key = method + url.pathname + (url.search ? '/' + lodash_1.default.trimStart(url.search, '?') : '');
    return key;
}
exports.keyOfUri = keyOfUri;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGUtc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNhY2hlLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGdEQUF3QjtBQUN4QixvREFBNEI7QUFFNUIsd0RBQTBCO0FBQzFCLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMsb0RBQXVCO0FBRXZCLHNEQUEwQjtBQUMxQixzQ0FBb0Q7QUFDcEQsaUVBQTZGO0FBQzdGLDhGQUFvRztBQUNwRyxvQ0FBNkM7QUFHN0MsTUFBTSxHQUFHLEdBQUcsSUFBQSxnQkFBUSxFQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pDLE1BQU0sWUFBWSxHQUFHLGNBQU0sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsR0FBRyxZQUFZLENBQUMsQ0FBQztBQUVuRSxTQUFnQixvQkFBb0IsQ0FBQyxTQUFpQixFQUFFLFNBQWlCLEVBQUUsWUFBb0IsRUFDOUUsT0FBMEIsRUFBQyxNQUFNLEVBQUUsS0FBSyxFQUFDOztJQUN4RCxNQUFNLFlBQVksR0FBb0I7UUFDcEMsMkRBQTJEO1FBQzNELFFBQVEsRUFBRSxZQUFZO1FBQ3RCLFVBQVUsRUFBRSxJQUFJLEdBQUcsRUFBRTtRQUNyQixtQkFBbUIsRUFBRSxFQUFFO1FBQ3ZCLGdCQUFnQixFQUFFLEVBQUU7S0FDckIsQ0FBQztJQUVGLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO1FBQ2hCLGlCQUFHLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3RCLEdBQUcsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRTtnQkFDcEMsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUMxQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsUUFB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QXNDLEVBQUUsSUFBOEI7SUFDeEgsR0FBRyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUN2QixLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksT0FBTyxFQUFFO1FBQ25DLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO0tBQzVCO0lBQ0QsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztRQUN2QixHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDOztRQUVkLGdCQUFNLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztBQUMvQixDQUFDO0FBRUQsU0FBZ0IsUUFBUSxDQUFDLE1BQWMsRUFBRSxJQUFZO0lBQ25ELE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUMzQyxNQUFNLEdBQUcsR0FBRyxNQUFNLEdBQUcsR0FBRyxDQUFDLFFBQVEsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxnQkFBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUMzRixPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUFKRCw0QkFJQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHN0cmVhbSBmcm9tICdzdHJlYW0nO1xuaW1wb3J0IHsgSW5jb21pbmdNZXNzYWdlIH0gZnJvbSAnaHR0cCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtSZXF1ZXN0LCBSZXNwb25zZSwgTmV4dEZ1bmN0aW9ufSBmcm9tICdleHByZXNzJztcbmltcG9ydCBhcGkgZnJvbSAnX19wbGluayc7XG5pbXBvcnQge2xvZ2dlciwgbG9nNEZpbGUsIGNvbmZpZ30gZnJvbSAnQHdmaC9wbGluayc7XG5pbXBvcnQgeyBjcmVhdGVQcm94eU1pZGRsZXdhcmUgYXMgcHJveHksIE9wdGlvbnMgYXMgSHBtT3B0aW9uc30gZnJvbSAnaHR0cC1wcm94eS1taWRkbGV3YXJlJztcbmltcG9ydCB7Y3JlYXRlU2xpY2UsIGNhc3RCeUFjdGlvblR5cGV9IGZyb20gJ0B3ZmgvcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlL2Rpc3QvdGlueS1yZWR1eC10b29sa2l0JztcbmltcG9ydCB7ZGVmYXVsdFByb3h5T3B0aW9uc30gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHtQcm94eUNhY2hlU3RhdGUsIENhY2hlRGF0YX0gZnJvbSAnLi90eXBlcyc7XG5cbmNvbnN0IGxvZyA9IGxvZzRGaWxlKF9fZmlsZW5hbWUpO1xuY29uc3QgaHR0cFByb3h5TG9nID0gbG9nZ2VyLmdldExvZ2dlcihsb2cuY2F0ZWdvcnkgKyAnI2h0dHBQcm94eScpO1xuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUHJveHlXaXRoQ2FjaGUocHJveHlQYXRoOiBzdHJpbmcsIHRhcmdldFVybDogc3RyaW5nLCBjYWNoZVJvb3REaXI6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgb3B0czoge21hbnVhbDogYm9vbGVhbn0gPSB7bWFudWFsOiBmYWxzZX0pIHtcbiAgY29uc3QgaW5pdGlhbFN0YXRlOiBQcm94eUNhY2hlU3RhdGUgPSB7XG4gICAgLy8gcHJveHlPcHRpb25zOiBkZWZhdWx0UHJveHlPcHRpb25zKHByb3h5UGF0aCwgdGFyZ2V0VXJsKSxcbiAgICBjYWNoZURpcjogY2FjaGVSb290RGlyLFxuICAgIGNhY2hlQnlVcmk6IG5ldyBNYXAoKSxcbiAgICByZXNwb25zZVRyYW5zZm9ybWVyOiBbXSxcbiAgICBjYWNoZVRyYW5zZm9ybWVyOiBbXVxuICB9O1xuXG4gIGlmICghb3B0cy5tYW51YWwpIHtcbiAgICBhcGkuZXhwcmVzc0FwcFNldChhcHAgPT4ge1xuICAgICAgYXBwLnVzZShwcm94eVBhdGgsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgICAgICBjb25zdCBrZXkgPSBrZXlPZlVyaShyZXEubWV0aG9kLCByZXEudXJsKTtcbiAgICAgICAgY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuaGl0Q2FjaGUoe2tleSwgcmVxLCByZXMsIG5leHR9KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG4gIGNvbnN0IGNhY2hlQ29udHJvbGxlciA9IGNyZWF0ZVNsaWNlKHtcbiAgICBpbml0aWFsU3RhdGUsXG4gICAgbmFtZTogYEhUVFAtcHJveHktY2FjaGUtJHtwcm94eVBhdGh9YCAsXG4gICAgZGVidWc6IGNvbmZpZygpLmNsaU9wdGlvbnM/LnZlcmJvc2UsXG4gICAgcmVkdWNlcnM6IHtcbiAgICAgIGNvbmZpZ3VyZVByb3h5KHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDogSHBtT3B0aW9ucykge1xuICAgICAgfSxcbiAgICAgIGNvbmZpZ1RyYW5zZm9ybWVyKHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDoge1xuICAgICAgICByZW1vdGU/OiBQcm94eUNhY2hlU3RhdGVbJ3Jlc3BvbnNlVHJhbnNmb3JtZXInXTtcbiAgICAgICAgY2FjaGVkPzogUHJveHlDYWNoZVN0YXRlWydjYWNoZVRyYW5zZm9ybWVyJ107XG4gICAgICB9KSB7XG4gICAgICAgIGlmIChwYXlsb2FkLnJlbW90ZSlcbiAgICAgICAgICBzLnJlc3BvbnNlVHJhbnNmb3JtZXIgPSBwYXlsb2FkLnJlbW90ZTtcbiAgICAgICAgaWYgKHBheWxvYWQuY2FjaGVkKVxuICAgICAgICAgIHMuY2FjaGVUcmFuc2Zvcm1lciA9IHBheWxvYWQuY2FjaGVkO1xuICAgICAgfSxcbiAgICAgIGhpdENhY2hlKHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDoge2tleTogc3RyaW5nOyByZXE6IFJlcXVlc3Q7IHJlczogUmVzcG9uc2U7IG5leHQ6IE5leHRGdW5jdGlvbn0pIHt9LFxuXG4gICAgICBfYWRkVG9DYWNoZShzOiBQcm94eUNhY2hlU3RhdGUsIHBheWxvYWQ6IHtcbiAgICAgICAga2V5OiBzdHJpbmc7IHJlcUhvc3Q6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgcmVzOiBSZXNwb25zZTtcbiAgICAgICAgZGF0YToge2hlYWRlcnM6IENhY2hlRGF0YVsnaGVhZGVycyddOyByZWFkYWJsZTogSW5jb21pbmdNZXNzYWdlfTtcbiAgICAgIH0pIHt9LFxuXG4gICAgICBfbG9hZEZyb21TdG9yYWdlKHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDoge2tleTogc3RyaW5nOyByZXE6IFJlcXVlc3Q7IHJlczogUmVzcG9uc2U7IG5leHQ6IE5leHRGdW5jdGlvbn0pIHtcbiAgICAgICAgcy5jYWNoZUJ5VXJpLnNldChwYXlsb2FkLmtleSwgJ2xvYWRpbmcnKTtcbiAgICAgIH0sXG5cbiAgICAgIF9yZXF1ZXN0UmVtb3RlKHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDoge2tleTogc3RyaW5nOyByZXE6IFJlcXVlc3Q7IHJlczogUmVzcG9uc2U7IG5leHQ6IE5leHRGdW5jdGlvbn0pIHtcbiAgICAgICAgcy5jYWNoZUJ5VXJpLnNldChwYXlsb2FkLmtleSwgJ3JlcXVlc3RpbmcnKTtcbiAgICAgIH0sXG4gICAgICBfZ290Q2FjaGUoczogUHJveHlDYWNoZVN0YXRlLCBwYXlsb2FkOiB7XG4gICAgICAgIGtleTogc3RyaW5nO1xuICAgICAgICBkYXRhOiBDYWNoZURhdGE7XG4gICAgICB9KSB7XG4gICAgICAgIGlmIChwYXlsb2FkLmRhdGEuc3RhdHVzQ29kZSAhPT0gMzA0KVxuICAgICAgICAgIHMuY2FjaGVCeVVyaS5zZXQocGF5bG9hZC5rZXksIHBheWxvYWQuZGF0YSk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICBjYWNoZUNvbnRyb2xsZXIuZXBpYyhhY3Rpb24kID0+IHtcbiAgICBjb25zdCBkZWZhdWx0UHJveHlPcHQgPSBkZWZhdWx0UHJveHlPcHRpb25zKHByb3h5UGF0aCwgdGFyZ2V0VXJsKTtcblxuICAgIGNvbnN0IHByb3h5RXJyb3IkID0gbmV3IHJ4LlN1YmplY3Q8UGFyYW1ldGVyczwodHlwZW9mIGRlZmF1bHRQcm94eU9wdClbJ29uRXJyb3InXT4+KCk7XG4gICAgY29uc3QgcHJveHlSZXMkID0gbmV3IHJ4LlN1YmplY3Q8UGFyYW1ldGVyczwodHlwZW9mIGRlZmF1bHRQcm94eU9wdClbJ29uUHJveHlSZXMnXT4+KCk7XG5cbiAgICBsZXQgcHJveHlNaWRkbGV3YXJlJCA9IG5ldyByeC5SZXBsYXlTdWJqZWN0PFJldHVyblR5cGU8dHlwZW9mIHByb3h5Pj4oMSk7XG4gICAgY29uc3QgYWN0aW9ucyA9IGNhc3RCeUFjdGlvblR5cGUoY2FjaGVDb250cm9sbGVyLmFjdGlvbnMsIGFjdGlvbiQpO1xuXG4gICAgZnVuY3Rpb24gY2hhbmdlQ2FjaGVkUmVzcG9uc2UoaGVhZGVyczogQ2FjaGVEYXRhWydoZWFkZXJzJ10sIHJlcUhvc3Q6IHN0cmluZyB8IHVuZGVmaW5lZCwgYm9keTogQnVmZmVyKSB7XG4gICAgICBpZiAocmVxSG9zdCAmJiAhcmVxSG9zdC5zdGFydHNXaXRoKCdodHRwJykpIHtcbiAgICAgICAgLy8gVE9ETzogc3VwcG9ydCBjYXNlIG9mIEhUVFBTXG4gICAgICAgIHJlcUhvc3QgPSAnaHR0cDovLycgKyByZXFIb3N0O1xuICAgICAgfVxuICAgICAgY29uc3Qge2NhY2hlVHJhbnNmb3JtZXJ9ID0gY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCk7XG4gICAgICBjb25zdCB0cmFuc2Zvcm1lcnMgPSBfLmZsYXR0ZW4oY2FjaGVUcmFuc2Zvcm1lci5tYXAoZW50cnkgPT4gZW50cnkoaGVhZGVycywgcmVxSG9zdCkpKTtcbiAgICAgIHJldHVybiB0cmFuc2Zvcm1CdWZmZXIoYm9keSwgLi4udHJhbnNmb3JtZXJzKS5waXBlKFxuICAgICAgICBvcC5tYXAoY2hhbmdlZEJvZHkgPT4gKHtcbiAgICAgICAgICBoZWFkZXJzOiBoZWFkZXJzLm1hcChpdGVtID0+IGl0ZW1bMF0gPT09ICdjb250ZW50LWxlbmd0aCcgP1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBbaXRlbVswXSwgY2hhbmdlZEJvZHkubGVuZ3RoICsgJyddIGFzIFtzdHJpbmcsIHN0cmluZ10gOlxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtKSxcbiAgICAgICAgICBib2R5OiBjaGFuZ2VkQm9keVxuICAgICAgICB9KSlcbiAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJ4Lm1lcmdlKFxuICAgICAgYWN0aW9ucy5jb25maWd1cmVQcm94eS5waXBlKFxuICAgICAgICBvcC5tYXAoKHtwYXlsb2FkOiBleHRyYU9wdH0pID0+IHtcbiAgICAgICAgICBwcm94eU1pZGRsZXdhcmUkLm5leHQocHJveHkoe1xuICAgICAgICAgICAgLi4uZGVmYXVsdFByb3h5T3B0LFxuICAgICAgICAgICAgZm9sbG93UmVkaXJlY3RzOiB0cnVlLFxuICAgICAgICAgICAgLi4uZXh0cmFPcHQsXG4gICAgICAgICAgICBvblByb3h5UmVzKC4uLmFyZ3MpIHtcbiAgICAgICAgICAgICAgcHJveHlSZXMkLm5leHQoYXJncyk7XG4gICAgICAgICAgICAgIGRlZmF1bHRQcm94eU9wdC5vblByb3h5UmVzKC4uLmFyZ3MpO1xuICAgICAgICAgICAgICBpZiAoZXh0cmFPcHQub25Qcm94eVJlcylcbiAgICAgICAgICAgICAgICBleHRyYU9wdC5vblByb3h5UmVzKC4uLmFyZ3MpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoLi4uYXJncykge1xuICAgICAgICAgICAgICBkZWZhdWx0UHJveHlPcHQub25FcnJvciguLi5hcmdzKTtcbiAgICAgICAgICAgICAgcHJveHlFcnJvciQubmV4dChhcmdzKTtcbiAgICAgICAgICAgICAgaWYgKGV4dHJhT3B0Lm9uRXJyb3IpXG4gICAgICAgICAgICAgICAgZXh0cmFPcHQub25FcnJvciguLi5hcmdzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KSk7XG4gICAgICAgIH0pXG4gICAgICApLFxuICAgICAgYWN0aW9ucy5oaXRDYWNoZS5waXBlKFxuICAgICAgICBvcC5tZXJnZU1hcCggKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICAgIGNvbnN0IHdhaXRDYWNoZUFuZFNlbmRSZXMgPSBhY3Rpb25zLl9nb3RDYWNoZS5waXBlKFxuICAgICAgICAgICAgb3AuZmlsdGVyKGFjdGlvbiA9PiBhY3Rpb24ucGF5bG9hZC5rZXkgPT09IHBheWxvYWQua2V5ICYmXG4gICAgICAgICAgICAgIHBheWxvYWQucmVzLndyaXRhYmxlRW5kZWQgIT09IHRydWUpLCAvLyBJbiBjYXNlIGl0IGlzIG9mIHJlZGlyZWN0ZWQgcmVxdWVzdCwgSFBNIGhhcyBkb25lIHBpcGluZyByZXNwb25zZSAoaWdub3JlZCBcIm1hbnVhbCByZXBvbnNlXCIgc2V0dGluZylcbiAgICAgICAgICAgIG9wLnRha2UoMSksXG4gICAgICAgICAgICBvcC5tYXAoKHtwYXlsb2FkOiB7ZGF0YX19KSA9PiB7XG4gICAgICAgICAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgZGF0YS5oZWFkZXJzKSB7XG4gICAgICAgICAgICAgICAgcGF5bG9hZC5yZXMuc2V0SGVhZGVyKGVudHJ5WzBdLCBlbnRyeVsxXSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcGF5bG9hZC5yZXMuc3RhdHVzKGRhdGEuc3RhdHVzQ29kZSk7XG4gICAgICAgICAgICAgIHBheWxvYWQucmVzLmVuZChkYXRhLmJvZHkpO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICApO1xuICAgICAgICAgIGNvbnN0IGl0ZW0gPSBjYWNoZUNvbnRyb2xsZXIuZ2V0U3RhdGUoKS5jYWNoZUJ5VXJpLmdldChwYXlsb2FkLmtleSk7XG4gICAgICAgICAgaWYgKGl0ZW0gPT0gbnVsbCkge1xuICAgICAgICAgICAgY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuX2xvYWRGcm9tU3RvcmFnZShwYXlsb2FkKTtcbiAgICAgICAgICAgIHJldHVybiB3YWl0Q2FjaGVBbmRTZW5kUmVzO1xuICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbSA9PT0gJ2xvYWRpbmcnIHx8IGl0ZW0gPT09ICdyZXF1ZXN0aW5nJykge1xuICAgICAgICAgICAgcmV0dXJuIHdhaXRDYWNoZUFuZFNlbmRSZXM7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGh0dHBQcm94eUxvZy5pbmZvKCdoaXQgY2FjaGVkJywgcGF5bG9hZC5rZXkpO1xuICAgICAgICAgICAgcmV0dXJuIGNoYW5nZUNhY2hlZFJlc3BvbnNlKGl0ZW0uaGVhZGVycywgcGF5bG9hZC5yZXEuaGVhZGVycy5ob3N0LCBpdGVtLmJvZHkpLnBpcGUoXG4gICAgICAgICAgICAgIG9wLm1hcChkYXRhID0+IHtcbiAgICAgICAgICAgICAgICBzZW5kUmVzKHBheWxvYWQucmVzLCBpdGVtLnN0YXR1c0NvZGUsIGRhdGEuaGVhZGVycywgZGF0YS5ib2R5KTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgKSxcbiAgICAgIGFjdGlvbnMuX2xvYWRGcm9tU3RvcmFnZS5waXBlKFxuICAgICAgICBvcC5tZXJnZU1hcChhc3luYyAoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgICAgY29uc3QgZGlyID0gUGF0aC5qb2luKGNhY2hlQ29udHJvbGxlci5nZXRTdGF0ZSgpLmNhY2hlRGlyLCBwYXlsb2FkLmtleSk7XG4gICAgICAgICAgY29uc3QgaEZpbGUgPSBQYXRoLmpvaW4oZGlyLCAnaGVhZGVyLmpzb24nKTtcbiAgICAgICAgICBjb25zdCBiRmlsZSA9IFBhdGguam9pbihkaXIsICdib2R5Jyk7XG4gICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoaEZpbGUpKSB7XG4gICAgICAgICAgICBodHRwUHJveHlMb2cuaW5mbygnbG9hZCcsIHBheWxvYWQua2V5KTtcbiAgICAgICAgICAgIGNvbnN0IFtoZWFkZXJzU3RyLCBib2R5XSA9IGF3YWl0IFByb21pc2UuYWxsKFtcbiAgICAgICAgICAgICAgZnMucHJvbWlzZXMucmVhZEZpbGUoaEZpbGUsICd1dGYtOCcpLFxuICAgICAgICAgICAgICBmcy5wcm9taXNlcy5yZWFkRmlsZShiRmlsZSlcbiAgICAgICAgICAgIF0pO1xuICAgICAgICAgICAgY29uc3Qge3N0YXR1c0NvZGUsIGhlYWRlcnN9ID0gSlNPTi5wYXJzZShoZWFkZXJzU3RyKSBhcyB7c3RhdHVzQ29kZTogbnVtYmVyOyBoZWFkZXJzOiBbc3RyaW5nLCBzdHJpbmcgfCBzdHJpbmdbXV1bXX07XG4gICAgICAgICAgICBjb25zdCBkYXRhID0gYXdhaXQgY2hhbmdlQ2FjaGVkUmVzcG9uc2UoaGVhZGVycywgcGF5bG9hZC5yZXEuaGVhZGVycy5ob3N0LCBib2R5KS50b1Byb21pc2UoKTtcbiAgICAgICAgICAgIGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyLl9nb3RDYWNoZSh7a2V5OiBwYXlsb2FkLmtleSwgZGF0YToge1xuICAgICAgICAgICAgICBzdGF0dXNDb2RlLFxuICAgICAgICAgICAgICBoZWFkZXJzOiBkYXRhLmhlYWRlcnMsXG4gICAgICAgICAgICAgIGJvZHk6IGRhdGEuYm9keVxuICAgICAgICAgICAgfX0pO1xuICAgICAgICAgICAgLy8gc2VuZFJlcyhwYXlsb2FkLnJlcywgc3RhdHVzQ29kZSwgaGVhZGVycywgYm9keSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGxvZy5pbmZvKCdObyBleGlzdGluZyBmaWxlIGZvcicsIHBheWxvYWQua2V5KTtcbiAgICAgICAgICAgIGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyLl9yZXF1ZXN0UmVtb3RlKHBheWxvYWQpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICksXG4gICAgICBhY3Rpb25zLl9yZXF1ZXN0UmVtb3RlLnBpcGUoXG4gICAgICAgIG9wLm1lcmdlTWFwKCh7cGF5bG9hZH0pID0+IHJ4Lm1lcmdlKFxuICAgICAgICAgIHJ4LnJhY2UoXG4gICAgICAgICAgICBwcm94eVJlcyQucGlwZShcbiAgICAgICAgICAgICAgb3AuZmlsdGVyKChbcHJveHlSZXMsIG9yaWdSZXFdKSA9PiBvcmlnUmVxID09PSBwYXlsb2FkLnJlcSksXG4gICAgICAgICAgICAgIG9wLnRha2UoMSksXG4gICAgICAgICAgICAgIG9wLm1hcCgoW3Byb3h5UmVzLCBvcmlnUmVxXSkgPT4ge1xuICAgICAgICAgICAgICAgIC8vIGxvZy53YXJuKCdvcmlnUmVxIGhvc3QnLCBvcmlnUmVxLmhlYWRlcnMuaG9zdCk7XG4gICAgICAgICAgICAgICAgY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuX2FkZFRvQ2FjaGUoe1xuICAgICAgICAgICAgICAgICAga2V5OiBwYXlsb2FkLmtleSwgcmVxSG9zdDogb3JpZ1JlcS5oZWFkZXJzLmhvc3QsXG4gICAgICAgICAgICAgICAgICByZXM6IHBheWxvYWQucmVzLFxuICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBoZWFkZXJzOiBPYmplY3QuZW50cmllcyhwcm94eVJlcy5oZWFkZXJzKVxuICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGVudHJ5ID0+IGVudHJ5WzFdICE9IG51bGwpIGFzIFtzdHJpbmcsIHN0cmluZyB8IHN0cmluZ1tdXVtdLFxuICAgICAgICAgICAgICAgICAgICByZWFkYWJsZTogcHJveHlSZXNcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICksXG4gICAgICAgICAgICBwcm94eUVycm9yJC5waXBlKFxuICAgICAgICAgICAgICBvcC5maWx0ZXIoKFtlcnIsIG9yaWdSZXFdKSA9PiBvcmlnUmVxID09PSBwYXlsb2FkLnJlcSksXG4gICAgICAgICAgICAgIG9wLnRha2UoMSksXG4gICAgICAgICAgICAgIG9wLm1hcCgoKSA9PiB7fSlcbiAgICAgICAgICAgIClcbiAgICAgICAgICApLFxuICAgICAgICAgIHByb3h5TWlkZGxld2FyZSQucGlwZShcbiAgICAgICAgICAgIG9wLnRha2UoMSksXG4gICAgICAgICAgICBvcC5tYXAocHJveHkgPT4gcHJveHkocGF5bG9hZC5yZXEsIHBheWxvYWQucmVzLCBwYXlsb2FkLm5leHQpKVxuICAgICAgICAgIClcbiAgICAgICAgKSlcbiAgICAgICksXG4gICAgICBhY3Rpb25zLl9hZGRUb0NhY2hlLnBpcGUoXG4gICAgICAgIG9wLm1lcmdlTWFwKCh7cGF5bG9hZDoge2tleSwgcmVxSG9zdCwgcmVzLCBkYXRhfX0pID0+IHtcbiAgICAgICAgICBodHRwUHJveHlMb2cuZGVidWcoJ2NhY2hlIHNpemU6JywgY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCkuY2FjaGVCeVVyaS5zaXplKTtcbiAgICAgICAgICBjb25zdCBkaXIgPSBQYXRoLmpvaW4oY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCkuY2FjaGVEaXIsIGtleSk7XG4gICAgICAgICAgY29uc3QgZmlsZSA9IFBhdGguam9pbihkaXIsICdib2R5Jyk7XG4gICAgICAgICAgY29uc3Qgc3RhdHVzQ29kZSA9IGRhdGEucmVhZGFibGUuc3RhdHVzQ29kZSB8fCAyMDA7XG4gICAgICAgICAgY29uc3Qge3Jlc3BvbnNlVHJhbnNmb3JtZXJ9ID0gY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCk7XG4gICAgICAgICAgaWYgKHJlcUhvc3QgJiYgIXJlcUhvc3Quc3RhcnRzV2l0aCgnaHR0cCcpKSB7XG4gICAgICAgICAgICByZXFIb3N0ID0gJ2h0dHA6Ly8nICsgcmVxSG9zdDtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIChzdGF0dXNDb2RlID09PSAyMDAgPyBwaXBlVG9CdWZmZXIoZGF0YS5yZWFkYWJsZSxcbiAgICAgICAgICAgIC4uLihyZXNwb25zZVRyYW5zZm9ybWVyID9cbiAgICAgICAgICAgICAgICBfLmZsYXR0ZW4ocmVzcG9uc2VUcmFuc2Zvcm1lci5tYXAoZW50cnkgPT4gZW50cnkoZGF0YS5oZWFkZXJzLCByZXFIb3N0KSkpIDpcbiAgICAgICAgICAgICAgICBbXSkgKSA6XG4gICAgICAgICAgICBwaXBlVG9CdWZmZXIoZGF0YS5yZWFkYWJsZSlcbiAgICAgICAgICApLnBpcGUoXG4gICAgICAgICAgICBvcC5tZXJnZU1hcChhc3luYyBidWYgPT4ge1xuICAgICAgICAgICAgICAvLyBsb2cud2FybignY29udGVudC1sZW5ndGg6JywgYnVmLmxlbmd0aCk7XG4gICAgICAgICAgICAgIGNvbnN0IGxlbmd0aEhlYWRlcklkeCA9IGRhdGEuaGVhZGVycy5maW5kSW5kZXgocm93ID0+IHJvd1swXSA9PT0gJ2NvbnRlbnQtbGVuZ3RoJyk7XG4gICAgICAgICAgICAgIGlmIChsZW5ndGhIZWFkZXJJZHggPj0gMClcbiAgICAgICAgICAgICAgICBkYXRhLmhlYWRlcnNbbGVuZ3RoSGVhZGVySWR4XVsxXSA9ICcnICsgYnVmLmxlbmd0aDtcblxuICAgICAgICAgICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fZ290Q2FjaGUoe2tleSwgZGF0YToge1xuICAgICAgICAgICAgICAgIHN0YXR1c0NvZGUsXG4gICAgICAgICAgICAgICAgaGVhZGVyczogZGF0YS5oZWFkZXJzLFxuICAgICAgICAgICAgICAgIGJvZHk6IGJ1ZlxuICAgICAgICAgICAgICB9fSk7XG4gICAgICAgICAgICAgIGlmIChzdGF0dXNDb2RlID09PSAzMDQpIHtcbiAgICAgICAgICAgICAgICBsb2cud2FybignVmVyc2lvbiBpbmZvIGlzIG5vdCByZWNvcmRlZCwgZHVlIHRvIHJlc3BvbnNlIDMwNCBmcm9tJywgcmVzLnJlcS51cmwsICcsXFxuIHlvdSBjYW4gcmVtb3ZlIGV4aXN0aW5nIG5wbS9jYWNoZSBjYWNoZSB0byBhdm9pZCAzMDQnKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcnguRU1QVFk7XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBhd2FpdCBmcy5ta2RpcnAoUGF0aC5kaXJuYW1lKGZpbGUpKTtcbiAgICAgICAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwoW1xuICAgICAgICAgICAgICAgIGZzLnByb21pc2VzLndyaXRlRmlsZShmaWxlLCBidWYpLFxuICAgICAgICAgICAgICAgIGZzLnByb21pc2VzLndyaXRlRmlsZShcbiAgICAgICAgICAgICAgICAgIFBhdGguam9pbihkaXIsICdoZWFkZXIuanNvbicpLFxuICAgICAgICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7c3RhdHVzQ29kZSwgaGVhZGVyczogZGF0YS5oZWFkZXJzfSwgbnVsbCwgJyAgJyksXG4gICAgICAgICAgICAgICAgICAndXRmLTgnKVxuICAgICAgICAgICAgICAgIF0pO1xuICAgICAgICAgICAgICBodHRwUHJveHlMb2cuaW5mbygnd3JpdGUgcmVzcG9uc2UgdG8gZmlsZScsIFBhdGgucG9zaXgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgZmlsZSksICdzaXplJywgYnVmLmxlbmd0aCk7XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIG9wLmNhdGNoRXJyb3IoKGVyciwgc3JjKSA9PiB7XG4gICAgICAgICAgICAgIGh0dHBQcm94eUxvZy5lcnJvcignSFRUUCBwcm94eSBjYWNoZSBlcnJvcjogZmFpbGVkIHRvIGNhY2hlIHJlc3BvbnNlJywgZXJyKTtcbiAgICAgICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoZGlyKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiByeC5kZWZlcigoKSA9PiBmcy5yZW1vdmUoZGlyKSkucGlwZShvcC50YWtlKDEpLFxuICAgICAgICAgICAgICAgICAgb3AuaWdub3JlRWxlbWVudHMoKSAvLyBmb3IgYmV0dGVyIFRTIHR5cGUgaW5mZXJlbmNlXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXR1cm4gcnguRU1QVFk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICk7XG4gICAgICAgIH0pXG4gICAgICApXG4gICAgKS5waXBlKFxuICAgICAgb3AuaWdub3JlRWxlbWVudHMoKSxcbiAgICAgIG9wLmNhdGNoRXJyb3IoKGVyciwgc3JjKSA9PiB7XG4gICAgICAgIGh0dHBQcm94eUxvZy5lcnJvcignSFRUUCBwcm94eSBjYWNoZSBlcnJvcicsIGVycik7XG4gICAgICAgIHJldHVybiBzcmM7XG4gICAgICB9KVxuICAgICk7XG4gIH0pO1xuXG4gIHJldHVybiBjYWNoZUNvbnRyb2xsZXI7XG59XG5cbmZ1bmN0aW9uIHBpcGVUb0J1ZmZlcihzb3VyY2U6IEluY29taW5nTWVzc2FnZSwgLi4udHJhbnNmb3JtZXJzOiBOb2RlSlMuUmVhZFdyaXRlU3RyZWFtW10pIHtcbiAgcmV0dXJuIG5ldyByeC5PYnNlcnZhYmxlPEJ1ZmZlcj4oc3ViID0+IHtcbiAgICBjb25zdCBib2R5QnVmczogQnVmZmVyW10gPSBbXTtcbiAgICBsZXQgY29tcGxldGVCb2R5OiBCdWZmZXI7XG4gICAgaWYgKHNvdXJjZS5jb21wbGV0ZSkge1xuICAgICAgc3ViLmVycm9yKG5ldyBFcnJvcigncmVzcG9uc2UgaXMgY29tcGxldGVkIGVhcmxpZXInKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHN0cmVhbXM6IEFycmF5PHN0cmVhbS5SZWFkYWJsZSB8IE5vZGVKUy5Xcml0YWJsZVN0cmVhbSB8IE5vZGVKUy5SZWFkV3JpdGVTdHJlYW0+ID0gW1xuICAgICAgICBzb3VyY2UsXG4gICAgICAgIC4uLnRyYW5zZm9ybWVycyxcbiAgICAgICAgbmV3IHN0cmVhbS5Xcml0YWJsZSh7XG4gICAgICAgICAgd3JpdGUoY2h1bmssIGVuYywgY2IpIHtcbiAgICAgICAgICAgIGJvZHlCdWZzLnB1c2goY2h1bmspO1xuICAgICAgICAgICAgY2IoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXTtcbiAgICAgIHN0cmVhbS5waXBlbGluZShzdHJlYW1zLFxuICAgICAgICAoZXJyOiBOb2RlSlMuRXJybm9FeGNlcHRpb24gfCBudWxsKSA9PiB7XG4gICAgICAgICAgaWYgKGVycikgcmV0dXJuIHN1Yi5lcnJvcihlcnIpO1xuICAgICAgICAgIGNvbXBsZXRlQm9keSA9IEJ1ZmZlci5jb25jYXQoYm9keUJ1ZnMpO1xuICAgICAgICAgIHN1Yi5uZXh0KGNvbXBsZXRlQm9keSk7XG4gICAgICAgICAgc3ViLmNvbXBsZXRlKCk7XG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgfVxuICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAvLyBJIGFtIG5vdCBzdXJlIGlmIHRoaXMgaXMgcHJvcGVyIGNhbmNlbGxpbmcgb2YgYSBzdHJlYW0gcGlwZWxpbmVcbiAgICAgIHNvdXJjZS5wYXVzZSgpO1xuICAgICAgc291cmNlLmRlc3Ryb3koKTtcbiAgICB9O1xuICB9KTtcbn1cblxuZnVuY3Rpb24gdHJhbnNmb3JtQnVmZmVyKHNvdXJjZTogQnVmZmVyLCAuLi50cmFuc2Zvcm1lcnM6IE5vZGVKUy5SZWFkV3JpdGVTdHJlYW1bXSkge1xuICByZXR1cm4gbmV3IHJ4Lk9ic2VydmFibGU8QnVmZmVyPihzdWIgPT4ge1xuICAgIGNvbnN0IGlucHV0U3RyZWFtID0gbmV3IHN0cmVhbS5SZWFkYWJsZSh7XG4gICAgICByZWFkKF9zaXplKSB7XG4gICAgICAgIHRoaXMucHVzaChzb3VyY2UpO1xuICAgICAgICB0aGlzLnB1c2gobnVsbCk7XG4gICAgICB9XG4gICAgfSk7XG4gICAgY29uc3QgYm9keUJ1ZnM6IEJ1ZmZlcltdID0gW107XG4gICAgbGV0IGNvbXBsZXRlQm9keTogQnVmZmVyO1xuXG4gICAgc3RyZWFtLnBpcGVsaW5lKFtpbnB1dFN0cmVhbSwgLi4udHJhbnNmb3JtZXJzLCBuZXcgc3RyZWFtLldyaXRhYmxlKHtcbiAgICAgICAgd3JpdGUoY2h1bmssIGVuYywgY2IpIHtcbiAgICAgICAgICBib2R5QnVmcy5wdXNoKGNodW5rKTtcbiAgICAgICAgICBjYigpO1xuICAgICAgICB9XG4gICAgICB9KV0sXG4gICAgICAoZXJyOiBOb2RlSlMuRXJybm9FeGNlcHRpb24gfCBudWxsKSA9PiB7XG4gICAgICAgIGlmIChlcnIpIHJldHVybiBzdWIuZXJyb3IoZXJyKTtcbiAgICAgICAgY29tcGxldGVCb2R5ID0gQnVmZmVyLmNvbmNhdChib2R5QnVmcyk7XG4gICAgICAgIHN1Yi5uZXh0KGNvbXBsZXRlQm9keSk7XG4gICAgICAgIHN1Yi5jb21wbGV0ZSgpO1xuICAgICAgfVxuICAgICk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBzZW5kUmVzKHJlczogUmVzcG9uc2UsIHN0YXR1c0NvZGU6IG51bWJlciwgaGVhZGVyczogW3N0cmluZywgc3RyaW5nIHwgc3RyaW5nW11dW10sIGJvZHk6IEJ1ZmZlciB8IHN0cmVhbS5SZWFkYWJsZSkge1xuICByZXMuc3RhdHVzKHN0YXR1c0NvZGUpO1xuICBmb3IgKGNvbnN0IFtuYW1lLCB2YWx1ZV0gb2YgaGVhZGVycykge1xuICAgIHJlcy5zZXRIZWFkZXIobmFtZSwgdmFsdWUpO1xuICB9XG4gIGlmIChCdWZmZXIuaXNCdWZmZXIoYm9keSkpXG4gICAgcmVzLmVuZChib2R5KTtcbiAgZWxzZVxuICAgIHN0cmVhbS5waXBlbGluZShib2R5LCByZXMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24ga2V5T2ZVcmkobWV0aG9kOiBzdHJpbmcsIHBhdGg6IHN0cmluZykge1xuICBjb25zdCB1cmwgPSBuZXcgVVJMKCdodHRwOi8vZi5jb20nICsgcGF0aCk7XG4gIGNvbnN0IGtleSA9IG1ldGhvZCArIHVybC5wYXRobmFtZSArICh1cmwuc2VhcmNoID8gJy8nICsgXy50cmltU3RhcnQodXJsLnNlYXJjaCwgJz8nKSA6ICcnKTtcbiAgcmV0dXJuIGtleTtcbn1cbiJdfQ==