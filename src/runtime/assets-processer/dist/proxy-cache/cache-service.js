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
const fs_extra_1 = __importDefault(require("fs-extra"));
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const lodash_1 = __importDefault(require("lodash"));
const http_proxy_1 = require("http-proxy");
const __plink_1 = __importDefault(require("__plink"));
const plink_1 = require("@wfh/plink");
// import { createProxyMiddleware as proxy} from 'http-proxy-middleware';
const tiny_redux_toolkit_1 = require("@wfh/redux-toolkit-observable/dist/tiny-redux-toolkit");
const utils_1 = require("../utils");
const http_proxy_observable_1 = require("../http-proxy-observable");
const httpProxyLog = (0, plink_1.log4File)(__filename);
function createProxyWithCache(proxyPath, serverOptions, cacheRootDir, opts = { manual: false }) {
    var _a;
    const defaultProxy = (0, http_proxy_1.createProxyServer)(Object.assign({ changeOrigin: true, ws: false, secure: false, cookieDomainRewrite: { '*': '' }, followRedirects: true, proxyTimeout: 20000, timeout: 10000 }, serverOptions));
    const initialState = {
        proxy: defaultProxy,
        proxy$: (0, http_proxy_observable_1.httpProxyObservable)(defaultProxy),
        cacheDir: cacheRootDir,
        cacheByUri: new Map(),
        memCacheLength: opts.memCacheLength == null ? Number.MAX_VALUE : opts.memCacheLength
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
        debugActionOnly: (_a = (0, plink_1.config)().cliOptions) === null || _a === void 0 ? void 0 : _a.verbose,
        reducers: {
            configTransformer(s, payload) {
                if (payload.remote)
                    s.responseTransformer = payload.remote;
                if (payload.cached)
                    s.cacheTransformer = payload.cached;
            },
            hitCache(s, payload) { },
            _requestRemoteDone(s, payload) { },
            _loadFromStorage(s, payload) {
                s.cacheByUri.set(payload.key, 'loading');
            },
            _requestRemote(s, payload) {
                s.cacheByUri.set(payload.key, 'requesting');
            },
            _savingFile(s, payload) {
                s.cacheByUri.set(payload.key, 'saving');
            },
            _done(s, payload) {
                s.cacheByUri.delete(payload.key);
                // if (payload.data.statusCode !== 304) {
                //   if (s.cacheByUri.size >= s.memCacheLength) {
                //     // TODO: improve for LRU algorigthm
                //     s.cacheByUri.delete(payload.key);
                //     return;
                //   }
                //   s.cacheByUri.set(payload.key, payload.data);
                // }
            },
            _clean(s, key) {
                s.cacheByUri.delete(key);
            }
        }
    });
    cacheController.epic(action$ => {
        const actions = (0, tiny_redux_toolkit_1.castByActionType)(cacheController.actions, action$);
        async function requestingRemote(key, reqHost, proxyRes, res, headers) {
            httpProxyLog.debug('cache size:', cacheController.getState().cacheByUri.size);
            const dir = path_1.default.join(cacheController.getState().cacheDir, key);
            const file = path_1.default.join(dir, 'body');
            const statusCode = proxyRes.statusCode || 200;
            const { responseTransformer } = cacheController.getState();
            if (statusCode === 304) {
                cacheController.actionDispatcher._done({ key, res, data: {
                        statusCode, headers, body: (0, utils_1.createReplayReadableFactory)(proxyRes)
                    }
                });
                httpProxyLog.warn('Version info is not recorded, due to response 304 from', res.req.url, ',\n you can remove existing npm/cache cache to avoid 304');
                return;
            }
            if (statusCode !== 200) {
                httpProxyLog.error(`Response code is ${statusCode} for request:`, res.req.url);
                return;
            }
            if (responseTransformer == null) {
                const doneMkdir = fs_extra_1.default.mkdirp(dir);
                const readableFac = (0, utils_1.createReplayReadableFactory)(proxyRes, undefined, { debugInfo: key, expectLen: parseInt(proxyRes.headers['content-length'], 10) });
                // cacheController.actionDispatcher._done({key, data: {
                //       statusCode, headers, body: () => proxyRes
                //     }, res
                //   });
                cacheController.actionDispatcher._savingFile({ key, data: {
                        statusCode, headers, body: readableFac
                    }, res
                });
                await doneMkdir;
                void fs_extra_1.default.promises.writeFile(path_1.default.join(dir, 'header.json'), JSON.stringify({ statusCode, headers }, null, '  '), 'utf-8');
                try {
                    await new Promise((resolve, reject) => readableFac()
                        .pipe(fs_extra_1.default.createWriteStream(file))
                        .on('finish', resolve)
                        .on('error', reject));
                    cacheController.actionDispatcher._done({ key, data: {
                            statusCode, headers, body: readableFac
                        }, res
                    });
                    httpProxyLog.info(`response is written to (length: ${headers.find(item => item[0] === 'content-length')[1]})`, path_1.default.posix.relative(process.cwd(), file));
                }
                catch (e) {
                    httpProxyLog.error('Failed to write cache file ' +
                        path_1.default.posix.relative(process.cwd(), file), e);
                }
                return;
            }
            if (reqHost && !reqHost.startsWith('http')) {
                reqHost = 'http://' + reqHost;
            }
            const { readable: transformed, length } = await responseTransformer(headers, reqHost, proxyRes);
            const lengthHeaderIdx = headers.findIndex(row => row[0] === 'content-length');
            if (lengthHeaderIdx >= 0)
                headers[lengthHeaderIdx][1] = '' + length;
            cacheController.actionDispatcher._savingFile({ key, res, data: {
                    statusCode, headers, body: transformed
                } });
            await fs_extra_1.default.mkdirp(dir);
            void fs_extra_1.default.promises.writeFile(path_1.default.join(dir, 'header.json'), JSON.stringify({ statusCode, headers }, null, '  '), 'utf-8');
            await new Promise((resolve, reject) => transformed()
                .on('end', resolve)
                .pipe(fs_extra_1.default.createWriteStream(file))
                .on('error', reject));
            cacheController.actionDispatcher._done({ key, res, data: {
                    statusCode, headers, body: transformed
                } });
            httpProxyLog.info('write response to file', path_1.default.posix.relative(process.cwd(), file), 'size', length);
        }
        return rx.merge(actions.hitCache.pipe(op.mergeMap(({ payload }) => {
            const waitCacheAndSendRes = rx.race(actions._done, actions._savingFile).pipe(op.filter(action => action.payload.key === payload.key), // In case it is of redirected request, HPM has done piping response (ignored "manual reponse" setting)
            op.take(1), op.mergeMap(({ payload: { key, res, data } }) => {
                if (res.writableEnded) {
                    throw new Error('Response is ended early, why?');
                }
                for (const entry of data.headers) {
                    res.setHeader(entry[0], entry[1]);
                }
                res.statusCode = data.statusCode;
                httpProxyLog.info('reply to', payload.key);
                const pipeEvent$ = new rx.Subject();
                res.on('finish', () => {
                    pipeEvent$.next('finish');
                })
                    .on('close', () => {
                    pipeEvent$.next('close');
                })
                    .on('error', err => pipeEvent$.error(err));
                data.body().pipe(res);
                return pipeEvent$.pipe(op.filter(event => event === 'finish' || event === 'close'), op.tap(event => {
                    if (event === 'close')
                        httpProxyLog.error('Response connection is closed early');
                }), op.take(1), op.mapTo(key), op.timeout(120000), op.catchError(err => {
                    if (!res.headersSent) {
                        res.statusCode = 500;
                        res.end();
                    }
                    else {
                        res.end();
                    }
                    return rx.EMPTY;
                }));
            }), op.map(key => httpProxyLog.info(`replied: ${key}`)));
            const item = cacheController.getState().cacheByUri.get(payload.key);
            httpProxyLog.info('hitCache for ' + payload.key);
            if (item == null) {
                cacheController.actionDispatcher._loadFromStorage(payload);
                return waitCacheAndSendRes;
            }
            else if (item === 'loading' || item === 'requesting' || item === 'saving') {
                return waitCacheAndSendRes;
            }
            else {
                httpProxyLog.info('hit cached', payload.key);
                const transformer = cacheController.getState().cacheTransformer;
                if (transformer == null) {
                    for (const entry of item.headers) {
                        payload.res.setHeader(entry[0], entry[1]);
                    }
                    payload.res.status(item.statusCode);
                    return new rx.Observable(sub => {
                        item.body()
                            .on('end', () => { sub.next(); sub.complete(); })
                            .pipe(payload.res);
                    });
                }
                return rx.from(transformer(item.headers, payload.req.headers.host, item.body())).pipe(op.take(1), op.mergeMap(({ readable, length }) => {
                    const lengthHeaderIdx = item.headers.findIndex(row => row[0] === 'content-length');
                    if (lengthHeaderIdx >= 0)
                        item.headers[lengthHeaderIdx][1] = '' + length;
                    for (const entry of item.headers) {
                        payload.res.setHeader(entry[0], entry[1]);
                    }
                    payload.res.status(item.statusCode);
                    return new rx.Observable(sub => {
                        readable().on('end', () => sub.complete())
                            .pipe(payload.res)
                            .on('error', err => sub.error(err));
                    });
                }));
            }
        }), op.catchError(err => {
            httpProxyLog.error('Failed to write response', err);
            return rx.EMPTY;
        })), actions._loadFromStorage.pipe(op.mergeMap(async ({ payload }) => {
            try {
                const dir = path_1.default.join(cacheController.getState().cacheDir, payload.key);
                const hFile = path_1.default.join(dir, 'header.json');
                const bFile = path_1.default.join(dir, 'body');
                if (fs_extra_1.default.existsSync(hFile)) {
                    httpProxyLog.info('load', payload.key);
                    const transformer = cacheController.getState().cacheTransformer;
                    if (transformer == null) {
                        const headersStr = await fs_extra_1.default.promises.readFile(hFile, 'utf-8');
                        const { statusCode, headers } = JSON.parse(headersStr);
                        cacheController.actionDispatcher._done({ key: payload.key, res: payload.res,
                            data: {
                                statusCode,
                                headers,
                                body: () => fs_extra_1.default.createReadStream(bFile)
                            } });
                        return;
                    }
                    const headersStr = await fs_extra_1.default.promises.readFile(hFile, 'utf-8');
                    const { statusCode, headers } = JSON.parse(headersStr);
                    const { readable, length } = await transformer(headers, payload.req.headers.host, fs_extra_1.default.createReadStream(bFile));
                    const lengthHeaderIdx = headers.findIndex(row => row[0] === 'content-length');
                    if (lengthHeaderIdx >= 0)
                        headers[lengthHeaderIdx][1] = '' + length;
                    cacheController.actionDispatcher._done({ key: payload.key,
                        res: payload.res,
                        data: {
                            statusCode,
                            headers,
                            body: readable
                        } });
                }
                else {
                    httpProxyLog.info('No existing file for', payload.key);
                    cacheController.actionDispatcher._requestRemote(payload);
                }
            }
            catch (ex) {
                httpProxyLog.error('Failed to save cache for: ' + payload.key, ex);
                cacheController.actionDispatcher._clean(payload.key);
            }
        })), actions._requestRemote.pipe(
        // wait for proxy being created
        // op.mergeMap(action => cacheController.getStore().pipe(
        //   op.map(s => s.proxy),
        //   op.distinctUntilChanged(),
        //   op.filter(proxy => proxy != null),
        //   op.mapTo({proxy, payload: action.payload})
        // )),
        op.mergeMap(({ payload }) => {
            const proxyOpts = {};
            if (payload.target) {
                proxyOpts.target = payload.target;
                // proxyOpts.ignorePath = true;
            }
            return rx.defer(() => {
                cacheController.getState().proxy.web(payload.req, payload.res, proxyOpts);
                return (0, http_proxy_observable_1.observeProxyResponse)(cacheController.getState().proxy$, payload.res);
            }).pipe(op.mergeMap(({ payload: [proxyRes, _req, res] }) => {
                return requestingRemote(payload.key, payload.req.headers.host, proxyRes, res, Object.entries(proxyRes.headers).filter(entry => entry[1] != null));
            }), op.catchError(err => {
                httpProxyLog.warn(`Retry "${payload.req.url}"`, err);
                return rx.timer(1000).pipe(op.mapTo(rx.throwError(err)));
            }), op.retry(3));
        }))).pipe(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        op.ignoreElements(), op.catchError((err, src) => {
            httpProxyLog.error('HTTP proxy cache error', err);
            return src;
        }));
    });
    return cacheController;
}
exports.createProxyWithCache = createProxyWithCache;
function keyOfUri(method, path) {
    const url = new URL('http://f.com' + path);
    const key = method + url.pathname + (url.search ? '/' + lodash_1.default.trimStart(url.search, '?') : '');
    return key;
}
exports.keyOfUri = keyOfUri;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGUtc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNhY2hlLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGdEQUF3QjtBQUV4Qix3REFBMEI7QUFDMUIseUNBQTJCO0FBQzNCLG1EQUFxQztBQUNyQyxvREFBdUI7QUFFdkIsMkNBQTREO0FBQzVELHNEQUEwQjtBQUMxQixzQ0FBNEM7QUFDNUMseUVBQXlFO0FBQ3pFLDhGQUFvRztBQUNwRyxvQ0FBcUQ7QUFDckQsb0VBQW1GO0FBSW5GLE1BQU0sWUFBWSxHQUFHLElBQUEsZ0JBQVEsRUFBQyxVQUFVLENBQUMsQ0FBQztBQUUxQyxTQUFnQixvQkFBb0IsQ0FBQyxTQUFpQixFQUFFLGFBQTRCLEVBQUUsWUFBb0IsRUFDekYsT0FBbUQsRUFBQyxNQUFNLEVBQUUsS0FBSyxFQUFDOztJQUNqRixNQUFNLFlBQVksR0FBRyxJQUFBLDhCQUFpQixrQkFDcEMsWUFBWSxFQUFFLElBQUksRUFDbEIsRUFBRSxFQUFFLEtBQUssRUFDVCxNQUFNLEVBQUUsS0FBSyxFQUNiLG1CQUFtQixFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUNoQyxlQUFlLEVBQUUsSUFBSSxFQUNyQixZQUFZLEVBQUUsS0FBSyxFQUNuQixPQUFPLEVBQUUsS0FBSyxJQUNYLGFBQWEsRUFDaEIsQ0FBQztJQUNILE1BQU0sWUFBWSxHQUFvQjtRQUNwQyxLQUFLLEVBQUUsWUFBWTtRQUNuQixNQUFNLEVBQUUsSUFBQSwyQ0FBbUIsRUFBQyxZQUFZLENBQUM7UUFDekMsUUFBUSxFQUFFLFlBQVk7UUFDdEIsVUFBVSxFQUFFLElBQUksR0FBRyxFQUFFO1FBQ3JCLGNBQWMsRUFBRSxJQUFJLENBQUMsY0FBYyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWM7S0FDckYsQ0FB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bkQsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQzNDLE1BQU0sR0FBRyxHQUFHLE1BQU0sR0FBRyxHQUFHLENBQUMsUUFBUSxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLGdCQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzNGLE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQztBQUpELDRCQUlDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBJbmNvbWluZ01lc3NhZ2UsIFNlcnZlclJlc3BvbnNlIH0gZnJvbSAnaHR0cCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtSZXF1ZXN0LCBSZXNwb25zZSwgTmV4dEZ1bmN0aW9ufSBmcm9tICdleHByZXNzJztcbmltcG9ydCB7U2VydmVyT3B0aW9ucywgY3JlYXRlUHJveHlTZXJ2ZXJ9IGZyb20gJ2h0dHAtcHJveHknO1xuaW1wb3J0IGFwaSBmcm9tICdfX3BsaW5rJztcbmltcG9ydCB7bG9nNEZpbGUsIGNvbmZpZ30gZnJvbSAnQHdmaC9wbGluayc7XG4vLyBpbXBvcnQgeyBjcmVhdGVQcm94eU1pZGRsZXdhcmUgYXMgcHJveHl9IGZyb20gJ2h0dHAtcHJveHktbWlkZGxld2FyZSc7XG5pbXBvcnQge2NyZWF0ZVNsaWNlLCBjYXN0QnlBY3Rpb25UeXBlfSBmcm9tICdAd2ZoL3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZS9kaXN0L3RpbnktcmVkdXgtdG9vbGtpdCc7XG5pbXBvcnQge2NyZWF0ZVJlcGxheVJlYWRhYmxlRmFjdG9yeX0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHtodHRwUHJveHlPYnNlcnZhYmxlLCBvYnNlcnZlUHJveHlSZXNwb25zZX0gZnJvbSAnLi4vaHR0cC1wcm94eS1vYnNlcnZhYmxlJztcbmltcG9ydCB7UHJveHlDYWNoZVN0YXRlLCBDYWNoZURhdGF9IGZyb20gJy4vdHlwZXMnO1xuXG5cbmNvbnN0IGh0dHBQcm94eUxvZyA9IGxvZzRGaWxlKF9fZmlsZW5hbWUpO1xuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUHJveHlXaXRoQ2FjaGUocHJveHlQYXRoOiBzdHJpbmcsIHNlcnZlck9wdGlvbnM6IFNlcnZlck9wdGlvbnMsIGNhY2hlUm9vdERpcjogc3RyaW5nLFxuICAgICAgICAgICAgICAgICBvcHRzOiB7bWFudWFsOiBib29sZWFuOyBtZW1DYWNoZUxlbmd0aD86IG51bWJlcn0gPSB7bWFudWFsOiBmYWxzZX0pIHtcbiAgY29uc3QgZGVmYXVsdFByb3h5ID0gY3JlYXRlUHJveHlTZXJ2ZXIoe1xuICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICB3czogZmFsc2UsXG4gICAgc2VjdXJlOiBmYWxzZSxcbiAgICBjb29raWVEb21haW5SZXdyaXRlOiB7ICcqJzogJycgfSxcbiAgICBmb2xsb3dSZWRpcmVjdHM6IHRydWUsXG4gICAgcHJveHlUaW1lb3V0OiAyMDAwMCxcbiAgICB0aW1lb3V0OiAxMDAwMCxcbiAgICAuLi5zZXJ2ZXJPcHRpb25zXG4gIH0pO1xuICBjb25zdCBpbml0aWFsU3RhdGU6IFByb3h5Q2FjaGVTdGF0ZSA9IHtcbiAgICBwcm94eTogZGVmYXVsdFByb3h5LFxuICAgIHByb3h5JDogaHR0cFByb3h5T2JzZXJ2YWJsZShkZWZhdWx0UHJveHkpLFxuICAgIGNhY2hlRGlyOiBjYWNoZVJvb3REaXIsXG4gICAgY2FjaGVCeVVyaTogbmV3IE1hcCgpLFxuICAgIG1lbUNhY2hlTGVuZ3RoOiBvcHRzLm1lbUNhY2hlTGVuZ3RoID09IG51bGwgPyBOdW1iZXIuTUFYX1ZBTFVFIDogb3B0cy5tZW1DYWNoZUxlbmd0aFxuICB9O1xuXG4gIGlmICghb3B0cy5tYW51YWwpIHtcbiAgICBhcGkuZXhwcmVzc0FwcFNldChhcHAgPT4ge1xuICAgICAgYXBwLnVzZShwcm94eVBhdGgsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgICAgICBjb25zdCBrZXkgPSBrZXlPZlVyaShyZXEubWV0aG9kLCByZXEudXJsKTtcbiAgICAgICAgY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuaGl0Q2FjaGUoe2tleSwgcmVxLCByZXMsIG5leHR9KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG4gIGNvbnN0IGNhY2hlQ29udHJvbGxlciA9IGNyZWF0ZVNsaWNlKHtcbiAgICBpbml0aWFsU3RhdGUsXG4gICAgbmFtZTogYEhUVFAtcHJveHktY2FjaGUtJHtwcm94eVBhdGh9YCAsXG4gICAgZGVidWdBY3Rpb25Pbmx5OiBjb25maWcoKS5jbGlPcHRpb25zPy52ZXJib3NlLFxuICAgIHJlZHVjZXJzOiB7XG4gICAgICBjb25maWdUcmFuc2Zvcm1lcihzOiBQcm94eUNhY2hlU3RhdGUsIHBheWxvYWQ6IHtcbiAgICAgICAgcmVtb3RlPzogUHJveHlDYWNoZVN0YXRlWydyZXNwb25zZVRyYW5zZm9ybWVyJ107XG4gICAgICAgIGNhY2hlZD86IFByb3h5Q2FjaGVTdGF0ZVsnY2FjaGVUcmFuc2Zvcm1lciddO1xuICAgICAgfSkge1xuICAgICAgICBpZiAocGF5bG9hZC5yZW1vdGUpXG4gICAgICAgICAgcy5yZXNwb25zZVRyYW5zZm9ybWVyID0gcGF5bG9hZC5yZW1vdGU7XG4gICAgICAgIGlmIChwYXlsb2FkLmNhY2hlZClcbiAgICAgICAgICBzLmNhY2hlVHJhbnNmb3JtZXIgPSBwYXlsb2FkLmNhY2hlZDtcbiAgICAgIH0sXG4gICAgICBoaXRDYWNoZShzOiBQcm94eUNhY2hlU3RhdGUsIHBheWxvYWQ6IHtcbiAgICAgICAga2V5OiBzdHJpbmc7IHJlcTogUmVxdWVzdDsgcmVzOiBSZXNwb25zZTsgbmV4dDogTmV4dEZ1bmN0aW9uO1xuICAgICAgICAvKiogb3ZlcnJpZGUgcmVtb3RlIHRhcmdldCAqL1xuICAgICAgICB0YXJnZXQ/OiBzdHJpbmc7XG4gICAgICB9KSB7fSxcblxuICAgICAgX3JlcXVlc3RSZW1vdGVEb25lKHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDoge1xuICAgICAgICBrZXk6IHN0cmluZzsgcmVxSG9zdDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICByZXM6IFNlcnZlclJlc3BvbnNlO1xuICAgICAgICBkYXRhOiB7aGVhZGVyczogQ2FjaGVEYXRhWydoZWFkZXJzJ107IHJlYWRhYmxlOiBJbmNvbWluZ01lc3NhZ2V9O1xuICAgICAgfSkge30sXG5cbiAgICAgIF9sb2FkRnJvbVN0b3JhZ2UoczogUHJveHlDYWNoZVN0YXRlLCBwYXlsb2FkOiB7a2V5OiBzdHJpbmc7IHJlcTogUmVxdWVzdDsgcmVzOiBSZXNwb25zZTtcbiAgICAgICAgICAgICAgICAgICAgICAgbmV4dDogTmV4dEZ1bmN0aW9uO1xuICAgICAgICB0YXJnZXQ/OiBzdHJpbmc7IH0pIHtcbiAgICAgICAgcy5jYWNoZUJ5VXJpLnNldChwYXlsb2FkLmtleSwgJ2xvYWRpbmcnKTtcbiAgICAgIH0sXG5cbiAgICAgIF9yZXF1ZXN0UmVtb3RlKHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDoge2tleTogc3RyaW5nOyByZXE6IFJlcXVlc3Q7IHJlczogUmVzcG9uc2U7IG5leHQ6IE5leHRGdW5jdGlvbjtcbiAgICAgICAgdGFyZ2V0Pzogc3RyaW5nOyB9KSB7XG4gICAgICAgIHMuY2FjaGVCeVVyaS5zZXQocGF5bG9hZC5rZXksICdyZXF1ZXN0aW5nJyk7XG4gICAgICB9LFxuICAgICAgX3NhdmluZ0ZpbGUoczogUHJveHlDYWNoZVN0YXRlLCBwYXlsb2FkOiB7XG4gICAgICAgIGtleTogc3RyaW5nO1xuICAgICAgICByZXM6IFNlcnZlclJlc3BvbnNlO1xuICAgICAgICBkYXRhOiBDYWNoZURhdGE7XG4gICAgICB9KSB7XG4gICAgICAgIHMuY2FjaGVCeVVyaS5zZXQocGF5bG9hZC5rZXksICdzYXZpbmcnKTtcbiAgICAgIH0sXG4gICAgICBfZG9uZShzOiBQcm94eUNhY2hlU3RhdGUsIHBheWxvYWQ6IHtcbiAgICAgICAga2V5OiBzdHJpbmc7XG4gICAgICAgIHJlczogU2VydmVyUmVzcG9uc2U7XG4gICAgICAgIGRhdGE6IENhY2hlRGF0YTtcbiAgICAgIH0pIHtcbiAgICAgICAgcy5jYWNoZUJ5VXJpLmRlbGV0ZShwYXlsb2FkLmtleSk7XG4gICAgICAgIC8vIGlmIChwYXlsb2FkLmRhdGEuc3RhdHVzQ29kZSAhPT0gMzA0KSB7XG4gICAgICAgIC8vICAgaWYgKHMuY2FjaGVCeVVyaS5zaXplID49IHMubWVtQ2FjaGVMZW5ndGgpIHtcbiAgICAgICAgLy8gICAgIC8vIFRPRE86IGltcHJvdmUgZm9yIExSVSBhbGdvcmlndGhtXG4gICAgICAgIC8vICAgICBzLmNhY2hlQnlVcmkuZGVsZXRlKHBheWxvYWQua2V5KTtcbiAgICAgICAgLy8gICAgIHJldHVybjtcbiAgICAgICAgLy8gICB9XG4gICAgICAgIC8vICAgcy5jYWNoZUJ5VXJpLnNldChwYXlsb2FkLmtleSwgcGF5bG9hZC5kYXRhKTtcbiAgICAgICAgLy8gfVxuICAgICAgfSxcbiAgICAgIF9jbGVhbihzOiBQcm94eUNhY2hlU3RhdGUsIGtleTogc3RyaW5nKSB7XG4gICAgICAgIHMuY2FjaGVCeVVyaS5kZWxldGUoa2V5KTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIGNhY2hlQ29udHJvbGxlci5lcGljKGFjdGlvbiQgPT4ge1xuICAgIGNvbnN0IGFjdGlvbnMgPSBjYXN0QnlBY3Rpb25UeXBlKGNhY2hlQ29udHJvbGxlci5hY3Rpb25zLCBhY3Rpb24kKTtcblxuICAgIGFzeW5jIGZ1bmN0aW9uIHJlcXVlc3RpbmdSZW1vdGUoXG4gICAgICBrZXk6IHN0cmluZywgcmVxSG9zdDogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICAgICAgcHJveHlSZXM6IEluY29taW5nTWVzc2FnZSxcbiAgICAgIHJlczogU2VydmVyUmVzcG9uc2UsXG4gICAgICBoZWFkZXJzOiBbc3RyaW5nLCBzdHJpbmcgfCBzdHJpbmdbXV1bXSkge1xuXG4gICAgICBodHRwUHJveHlMb2cuZGVidWcoJ2NhY2hlIHNpemU6JywgY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCkuY2FjaGVCeVVyaS5zaXplKTtcbiAgICAgIGNvbnN0IGRpciA9IFBhdGguam9pbihjYWNoZUNvbnRyb2xsZXIuZ2V0U3RhdGUoKS5jYWNoZURpciwga2V5KTtcbiAgICAgIGNvbnN0IGZpbGUgPSBQYXRoLmpvaW4oZGlyLCAnYm9keScpO1xuICAgICAgY29uc3Qgc3RhdHVzQ29kZSA9IHByb3h5UmVzLnN0YXR1c0NvZGUgfHwgMjAwO1xuICAgICAgY29uc3Qge3Jlc3BvbnNlVHJhbnNmb3JtZXJ9ID0gY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCk7XG4gICAgICBpZiAoc3RhdHVzQ29kZSA9PT0gMzA0KSB7XG4gICAgICAgIGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyLl9kb25lKHtrZXksIHJlcywgZGF0YToge1xuICAgICAgICAgICAgc3RhdHVzQ29kZSwgaGVhZGVycywgYm9keTogY3JlYXRlUmVwbGF5UmVhZGFibGVGYWN0b3J5KHByb3h5UmVzKVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGh0dHBQcm94eUxvZy53YXJuKCdWZXJzaW9uIGluZm8gaXMgbm90IHJlY29yZGVkLCBkdWUgdG8gcmVzcG9uc2UgMzA0IGZyb20nLCByZXMucmVxLnVybCwgJyxcXG4geW91IGNhbiByZW1vdmUgZXhpc3RpbmcgbnBtL2NhY2hlIGNhY2hlIHRvIGF2b2lkIDMwNCcpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoc3RhdHVzQ29kZSAhPT0gMjAwKSB7XG4gICAgICAgIGh0dHBQcm94eUxvZy5lcnJvcihgUmVzcG9uc2UgY29kZSBpcyAke3N0YXR1c0NvZGV9IGZvciByZXF1ZXN0OmAsIHJlcy5yZXEudXJsKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVzcG9uc2VUcmFuc2Zvcm1lciA9PSBudWxsKSB7XG4gICAgICAgIGNvbnN0IGRvbmVNa2RpciA9IGZzLm1rZGlycChkaXIpO1xuICAgICAgICBjb25zdCByZWFkYWJsZUZhYyA9IGNyZWF0ZVJlcGxheVJlYWRhYmxlRmFjdG9yeShwcm94eVJlcywgdW5kZWZpbmVkLFxuICAgICAgICAgIHtkZWJ1Z0luZm86IGtleSwgZXhwZWN0TGVuOiBwYXJzZUludChwcm94eVJlcy5oZWFkZXJzWydjb250ZW50LWxlbmd0aCddIGFzIHN0cmluZywgMTApfSk7XG4gICAgICAgICAvLyBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fZG9uZSh7a2V5LCBkYXRhOiB7XG4gICAgICAgICAvLyAgICAgICBzdGF0dXNDb2RlLCBoZWFkZXJzLCBib2R5OiAoKSA9PiBwcm94eVJlc1xuICAgICAgICAgLy8gICAgIH0sIHJlc1xuICAgICAgICAgLy8gICB9KTtcbiAgICAgICAgY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuX3NhdmluZ0ZpbGUoe2tleSwgZGF0YToge1xuICAgICAgICAgICAgc3RhdHVzQ29kZSwgaGVhZGVycywgYm9keTogcmVhZGFibGVGYWNcbiAgICAgICAgICB9LCByZXNcbiAgICAgICAgfSk7XG4gICAgICAgIGF3YWl0IGRvbmVNa2RpcjtcbiAgICAgICAgdm9pZCBmcy5wcm9taXNlcy53cml0ZUZpbGUoXG4gICAgICAgICAgUGF0aC5qb2luKGRpciwgJ2hlYWRlci5qc29uJyksXG4gICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7c3RhdHVzQ29kZSwgaGVhZGVyc30sIG51bGwsICcgICcpLFxuICAgICAgICAgICd1dGYtOCcpO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4gcmVhZGFibGVGYWMoKVxuICAgICAgICAgICAgLnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0oZmlsZSkpXG4gICAgICAgICAgICAub24oJ2ZpbmlzaCcsIHJlc29sdmUpXG4gICAgICAgICAgICAub24oJ2Vycm9yJywgcmVqZWN0KSk7XG5cbiAgICAgICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fZG9uZSh7a2V5LCBkYXRhOiB7XG4gICAgICAgICAgICAgIHN0YXR1c0NvZGUsIGhlYWRlcnMsIGJvZHk6IHJlYWRhYmxlRmFjXG4gICAgICAgICAgICB9LCByZXNcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGh0dHBQcm94eUxvZy5pbmZvKGByZXNwb25zZSBpcyB3cml0dGVuIHRvIChsZW5ndGg6ICR7aGVhZGVycy5maW5kKGl0ZW0gPT4gaXRlbVswXSA9PT0gJ2NvbnRlbnQtbGVuZ3RoJykhWzFdIGFzIHN0cmluZ30pYCxcbiAgICAgICAgICAgIFBhdGgucG9zaXgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgZmlsZSkpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgaHR0cFByb3h5TG9nLmVycm9yKCdGYWlsZWQgdG8gd3JpdGUgY2FjaGUgZmlsZSAnICtcbiAgICAgICAgICAgIFBhdGgucG9zaXgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgZmlsZSksIGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKHJlcUhvc3QgJiYgIXJlcUhvc3Quc3RhcnRzV2l0aCgnaHR0cCcpKSB7XG4gICAgICAgIHJlcUhvc3QgPSAnaHR0cDovLycgKyByZXFIb3N0O1xuICAgICAgfVxuXG4gICAgICBjb25zdCB7cmVhZGFibGU6IHRyYW5zZm9ybWVkLCBsZW5ndGh9ID0gYXdhaXQgcmVzcG9uc2VUcmFuc2Zvcm1lcihoZWFkZXJzLCByZXFIb3N0LCBwcm94eVJlcyk7XG4gICAgICBjb25zdCBsZW5ndGhIZWFkZXJJZHggPSBoZWFkZXJzLmZpbmRJbmRleChyb3cgPT4gcm93WzBdID09PSAnY29udGVudC1sZW5ndGgnKTtcbiAgICAgIGlmIChsZW5ndGhIZWFkZXJJZHggPj0gMClcbiAgICAgICAgaGVhZGVyc1tsZW5ndGhIZWFkZXJJZHhdWzFdID0gJycgKyBsZW5ndGg7XG5cbiAgICAgIGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyLl9zYXZpbmdGaWxlKHtrZXksIHJlcywgZGF0YToge1xuICAgICAgICAgIHN0YXR1c0NvZGUsIGhlYWRlcnMsIGJvZHk6IHRyYW5zZm9ybWVkXG4gICAgICB9IH0pO1xuXG4gICAgICBhd2FpdCBmcy5ta2RpcnAoZGlyKTtcbiAgICAgIHZvaWQgZnMucHJvbWlzZXMud3JpdGVGaWxlKFxuICAgICAgICBQYXRoLmpvaW4oZGlyLCAnaGVhZGVyLmpzb24nKSxcbiAgICAgICAgSlNPTi5zdHJpbmdpZnkoe3N0YXR1c0NvZGUsIGhlYWRlcnN9LCBudWxsLCAnICAnKSxcbiAgICAgICAgJ3V0Zi04Jyk7XG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB0cmFuc2Zvcm1lZCgpXG4gICAgICAgIC5vbignZW5kJywgcmVzb2x2ZSlcbiAgICAgICAgLnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0oZmlsZSkpXG4gICAgICAgIC5vbignZXJyb3InLCByZWplY3QpKTtcblxuICAgICAgY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuX2RvbmUoe2tleSwgcmVzLCBkYXRhOiB7XG4gICAgICAgICAgc3RhdHVzQ29kZSwgaGVhZGVycywgYm9keTogdHJhbnNmb3JtZWRcbiAgICAgIH0gfSk7XG4gICAgICBodHRwUHJveHlMb2cuaW5mbygnd3JpdGUgcmVzcG9uc2UgdG8gZmlsZScsIFBhdGgucG9zaXgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgZmlsZSksICdzaXplJywgbGVuZ3RoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcngubWVyZ2UoXG4gICAgICBhY3Rpb25zLmhpdENhY2hlLnBpcGUoXG4gICAgICAgIG9wLm1lcmdlTWFwKCAoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgICAgY29uc3Qgd2FpdENhY2hlQW5kU2VuZFJlcyA9IHJ4LnJhY2UoYWN0aW9ucy5fZG9uZSwgYWN0aW9ucy5fc2F2aW5nRmlsZSkucGlwZShcbiAgICAgICAgICAgIG9wLmZpbHRlcihhY3Rpb24gPT4gYWN0aW9uLnBheWxvYWQua2V5ID09PSBwYXlsb2FkLmtleSksIC8vIEluIGNhc2UgaXQgaXMgb2YgcmVkaXJlY3RlZCByZXF1ZXN0LCBIUE0gaGFzIGRvbmUgcGlwaW5nIHJlc3BvbnNlIChpZ25vcmVkIFwibWFudWFsIHJlcG9uc2VcIiBzZXR0aW5nKVxuICAgICAgICAgICAgb3AudGFrZSgxKSxcbiAgICAgICAgICAgIG9wLm1lcmdlTWFwKCh7cGF5bG9hZDoge2tleSwgcmVzLCBkYXRhfX0pID0+IHtcbiAgICAgICAgICAgICAgaWYgKHJlcy53cml0YWJsZUVuZGVkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdSZXNwb25zZSBpcyBlbmRlZCBlYXJseSwgd2h5PycpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgZGF0YS5oZWFkZXJzKSB7XG4gICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihlbnRyeVswXSwgZW50cnlbMV0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gZGF0YS5zdGF0dXNDb2RlO1xuICAgICAgICAgICAgICBodHRwUHJveHlMb2cuaW5mbygncmVwbHkgdG8nLCBwYXlsb2FkLmtleSk7XG4gICAgICAgICAgICAgIGNvbnN0IHBpcGVFdmVudCQgPSBuZXcgcnguU3ViamVjdDxzdHJpbmc+KCk7XG4gICAgICAgICAgICAgIHJlcy5vbignZmluaXNoJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHBpcGVFdmVudCQubmV4dCgnZmluaXNoJyk7XG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIC5vbignY2xvc2UnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgcGlwZUV2ZW50JC5uZXh0KCdjbG9zZScpO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAub24oJ2Vycm9yJywgZXJyID0+IHBpcGVFdmVudCQuZXJyb3IoZXJyKSk7XG5cbiAgICAgICAgICAgICAgZGF0YS5ib2R5KCkucGlwZShyZXMpO1xuICAgICAgICAgICAgICByZXR1cm4gcGlwZUV2ZW50JC5waXBlKFxuICAgICAgICAgICAgICAgIG9wLmZpbHRlcihldmVudCA9PiBldmVudCA9PT0gJ2ZpbmlzaCcgfHwgZXZlbnQgPT09ICdjbG9zZScpLFxuICAgICAgICAgICAgICAgIG9wLnRhcChldmVudCA9PiB7XG4gICAgICAgICAgICAgICAgICBpZiAoZXZlbnQgPT09ICdjbG9zZScpXG4gICAgICAgICAgICAgICAgICAgIGh0dHBQcm94eUxvZy5lcnJvcignUmVzcG9uc2UgY29ubmVjdGlvbiBpcyBjbG9zZWQgZWFybHknKTtcbiAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICBvcC50YWtlKDEpLFxuICAgICAgICAgICAgICAgIG9wLm1hcFRvKGtleSksXG4gICAgICAgICAgICAgICAgb3AudGltZW91dCgxMjAwMDApLFxuICAgICAgICAgICAgICAgIG9wLmNhdGNoRXJyb3IoZXJyID0+IHtcbiAgICAgICAgICAgICAgICAgIGlmICghcmVzLmhlYWRlcnNTZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKCk7XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICByZXR1cm4gcnguRU1QVFk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgb3AubWFwKGtleSA9PiBodHRwUHJveHlMb2cuaW5mbyhgcmVwbGllZDogJHtrZXl9YCkpXG4gICAgICAgICAgKTtcbiAgICAgICAgICBjb25zdCBpdGVtID0gY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCkuY2FjaGVCeVVyaS5nZXQocGF5bG9hZC5rZXkpO1xuICAgICAgICAgIGh0dHBQcm94eUxvZy5pbmZvKCdoaXRDYWNoZSBmb3IgJyArIHBheWxvYWQua2V5KTtcbiAgICAgICAgICBpZiAoaXRlbSA9PSBudWxsKSB7XG4gICAgICAgICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fbG9hZEZyb21TdG9yYWdlKHBheWxvYWQpO1xuICAgICAgICAgICAgcmV0dXJuIHdhaXRDYWNoZUFuZFNlbmRSZXM7XG4gICAgICAgICAgfSBlbHNlIGlmIChpdGVtID09PSAnbG9hZGluZycgfHwgaXRlbSA9PT0gJ3JlcXVlc3RpbmcnIHx8IGl0ZW0gPT09ICdzYXZpbmcnKSB7XG4gICAgICAgICAgICByZXR1cm4gd2FpdENhY2hlQW5kU2VuZFJlcztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaHR0cFByb3h5TG9nLmluZm8oJ2hpdCBjYWNoZWQnLCBwYXlsb2FkLmtleSk7XG4gICAgICAgICAgICBjb25zdCB0cmFuc2Zvcm1lciA9IGNhY2hlQ29udHJvbGxlci5nZXRTdGF0ZSgpLmNhY2hlVHJhbnNmb3JtZXI7XG4gICAgICAgICAgICBpZiAodHJhbnNmb3JtZXIgPT0gbnVsbCkge1xuICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGl0ZW0uaGVhZGVycykge1xuICAgICAgICAgICAgICAgIHBheWxvYWQucmVzLnNldEhlYWRlcihlbnRyeVswXSwgZW50cnlbMV0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHBheWxvYWQucmVzLnN0YXR1cyhpdGVtLnN0YXR1c0NvZGUpO1xuICAgICAgICAgICAgICByZXR1cm4gbmV3IHJ4Lk9ic2VydmFibGU8dm9pZD4oc3ViID0+IHtcbiAgICAgICAgICAgICAgICBpdGVtLmJvZHkoKVxuICAgICAgICAgICAgICAgIC5vbignZW5kJywgKCkgPT4ge3N1Yi5uZXh0KCk7IHN1Yi5jb21wbGV0ZSgpOyB9KVxuICAgICAgICAgICAgICAgIC5waXBlKHBheWxvYWQucmVzKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiByeC5mcm9tKHRyYW5zZm9ybWVyKGl0ZW0uaGVhZGVycywgcGF5bG9hZC5yZXEuaGVhZGVycy5ob3N0LCBpdGVtLmJvZHkoKSkpLnBpcGUoXG4gICAgICAgICAgICAgIG9wLnRha2UoMSksXG4gICAgICAgICAgICAgIG9wLm1lcmdlTWFwKCh7cmVhZGFibGUsIGxlbmd0aH0pID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBsZW5ndGhIZWFkZXJJZHggPSBpdGVtLmhlYWRlcnMuZmluZEluZGV4KHJvdyA9PiByb3dbMF0gPT09ICdjb250ZW50LWxlbmd0aCcpO1xuICAgICAgICAgICAgICAgIGlmIChsZW5ndGhIZWFkZXJJZHggPj0gMClcbiAgICAgICAgICAgICAgICAgIGl0ZW0uaGVhZGVyc1tsZW5ndGhIZWFkZXJJZHhdWzFdID0gJycgKyBsZW5ndGg7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBpdGVtLmhlYWRlcnMpIHtcbiAgICAgICAgICAgICAgICAgIHBheWxvYWQucmVzLnNldEhlYWRlcihlbnRyeVswXSwgZW50cnlbMV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwYXlsb2FkLnJlcy5zdGF0dXMoaXRlbS5zdGF0dXNDb2RlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IHJ4Lk9ic2VydmFibGU8dm9pZD4oc3ViID0+IHtcbiAgICAgICAgICAgICAgICAgIHJlYWRhYmxlKCkub24oJ2VuZCcsICgpID0+IHN1Yi5jb21wbGV0ZSgpKVxuICAgICAgICAgICAgICAgICAgICAucGlwZShwYXlsb2FkLnJlcylcbiAgICAgICAgICAgICAgICAgICAgLm9uKCdlcnJvcicsIGVyciA9PiBzdWIuZXJyb3IoZXJyKSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfSksXG4gICAgICAgIG9wLmNhdGNoRXJyb3IoZXJyID0+IHtcbiAgICAgICAgICBodHRwUHJveHlMb2cuZXJyb3IoJ0ZhaWxlZCB0byB3cml0ZSByZXNwb25zZScsIGVycik7XG4gICAgICAgICAgcmV0dXJuIHJ4LkVNUFRZO1xuICAgICAgICB9KVxuICAgICAgKSxcbiAgICAgIGFjdGlvbnMuX2xvYWRGcm9tU3RvcmFnZS5waXBlKFxuICAgICAgICBvcC5tZXJnZU1hcChhc3luYyAoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGRpciA9IFBhdGguam9pbihjYWNoZUNvbnRyb2xsZXIuZ2V0U3RhdGUoKS5jYWNoZURpciwgcGF5bG9hZC5rZXkpO1xuICAgICAgICAgICAgY29uc3QgaEZpbGUgPSBQYXRoLmpvaW4oZGlyLCAnaGVhZGVyLmpzb24nKTtcbiAgICAgICAgICAgIGNvbnN0IGJGaWxlID0gUGF0aC5qb2luKGRpciwgJ2JvZHknKTtcbiAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKGhGaWxlKSkge1xuICAgICAgICAgICAgICBodHRwUHJveHlMb2cuaW5mbygnbG9hZCcsIHBheWxvYWQua2V5KTtcbiAgICAgICAgICAgICAgY29uc3QgdHJhbnNmb3JtZXIgPSBjYWNoZUNvbnRyb2xsZXIuZ2V0U3RhdGUoKS5jYWNoZVRyYW5zZm9ybWVyO1xuICAgICAgICAgICAgICBpZiAodHJhbnNmb3JtZXIgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlcnNTdHIgPSBhd2FpdCBmcy5wcm9taXNlcy5yZWFkRmlsZShoRmlsZSwgJ3V0Zi04Jyk7XG4gICAgICAgICAgICAgICAgY29uc3Qge3N0YXR1c0NvZGUsIGhlYWRlcnN9ID0gSlNPTi5wYXJzZShoZWFkZXJzU3RyKSBhcyB7c3RhdHVzQ29kZTogbnVtYmVyOyBoZWFkZXJzOiBbc3RyaW5nLCBzdHJpbmcgfCBzdHJpbmdbXV1bXX07XG5cbiAgICAgICAgICAgICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fZG9uZSh7a2V5OiBwYXlsb2FkLmtleSwgcmVzOiBwYXlsb2FkLnJlcyxcbiAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzQ29kZSxcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVycyxcbiAgICAgICAgICAgICAgICAgICAgYm9keTogKCkgPT4gZnMuY3JlYXRlUmVhZFN0cmVhbShiRmlsZSlcbiAgICAgICAgICAgICAgICAgIH19KTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBjb25zdCBoZWFkZXJzU3RyID0gYXdhaXQgZnMucHJvbWlzZXMucmVhZEZpbGUoaEZpbGUsICd1dGYtOCcpO1xuICAgICAgICAgICAgICBjb25zdCB7c3RhdHVzQ29kZSwgaGVhZGVyc30gPSBKU09OLnBhcnNlKGhlYWRlcnNTdHIpIGFzIHtzdGF0dXNDb2RlOiBudW1iZXI7IGhlYWRlcnM6IFtzdHJpbmcsIHN0cmluZyB8IHN0cmluZ1tdXVtdfTtcbiAgICAgICAgICAgICAgY29uc3Qge3JlYWRhYmxlLCBsZW5ndGh9ID0gYXdhaXQgdHJhbnNmb3JtZXIoaGVhZGVycywgcGF5bG9hZC5yZXEuaGVhZGVycy5ob3N0LCBmcy5jcmVhdGVSZWFkU3RyZWFtKGJGaWxlKSk7XG4gICAgICAgICAgICAgIGNvbnN0IGxlbmd0aEhlYWRlcklkeCA9IGhlYWRlcnMuZmluZEluZGV4KHJvdyA9PiByb3dbMF0gPT09ICdjb250ZW50LWxlbmd0aCcpO1xuICAgICAgICAgICAgICBpZiAobGVuZ3RoSGVhZGVySWR4ID49IDApXG4gICAgICAgICAgICAgICAgaGVhZGVyc1tsZW5ndGhIZWFkZXJJZHhdWzFdID0gJycgKyBsZW5ndGg7XG5cbiAgICAgICAgICAgICAgY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuX2RvbmUoe2tleTogcGF5bG9hZC5rZXksXG4gICAgICAgICAgICAgICAgcmVzOiBwYXlsb2FkLnJlcyxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICBzdGF0dXNDb2RlLFxuICAgICAgICAgICAgICAgICAgaGVhZGVycyxcbiAgICAgICAgICAgICAgICAgIGJvZHk6IHJlYWRhYmxlXG4gICAgICAgICAgICAgICAgfX0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgaHR0cFByb3h5TG9nLmluZm8oJ05vIGV4aXN0aW5nIGZpbGUgZm9yJywgcGF5bG9hZC5rZXkpO1xuICAgICAgICAgICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fcmVxdWVzdFJlbW90ZShwYXlsb2FkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICAgICAgaHR0cFByb3h5TG9nLmVycm9yKCdGYWlsZWQgdG8gc2F2ZSBjYWNoZSBmb3I6ICcgKyBwYXlsb2FkLmtleSwgZXgpO1xuICAgICAgICAgICAgY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuX2NsZWFuKHBheWxvYWQua2V5KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICApLFxuICAgICAgYWN0aW9ucy5fcmVxdWVzdFJlbW90ZS5waXBlKFxuICAgICAgICAvLyB3YWl0IGZvciBwcm94eSBiZWluZyBjcmVhdGVkXG4gICAgICAgIC8vIG9wLm1lcmdlTWFwKGFjdGlvbiA9PiBjYWNoZUNvbnRyb2xsZXIuZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgICAvLyAgIG9wLm1hcChzID0+IHMucHJveHkpLFxuICAgICAgICAvLyAgIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICAgIC8vICAgb3AuZmlsdGVyKHByb3h5ID0+IHByb3h5ICE9IG51bGwpLFxuICAgICAgICAvLyAgIG9wLm1hcFRvKHtwcm94eSwgcGF5bG9hZDogYWN0aW9uLnBheWxvYWR9KVxuICAgICAgICAvLyApKSxcbiAgICAgICAgb3AubWVyZ2VNYXAoKHtwYXlsb2FkfSkgPT4ge1xuXG4gICAgICAgICAgY29uc3QgcHJveHlPcHRzOiBTZXJ2ZXJPcHRpb25zID0ge307XG4gICAgICAgICAgaWYgKHBheWxvYWQudGFyZ2V0KSB7XG4gICAgICAgICAgICBwcm94eU9wdHMudGFyZ2V0ID0gcGF5bG9hZC50YXJnZXQ7XG4gICAgICAgICAgICAvLyBwcm94eU9wdHMuaWdub3JlUGF0aCA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiByeC5kZWZlcigoKSA9PiB7XG4gICAgICAgICAgICBjYWNoZUNvbnRyb2xsZXIuZ2V0U3RhdGUoKS5wcm94eS53ZWIocGF5bG9hZC5yZXEsIHBheWxvYWQucmVzLCBwcm94eU9wdHMpO1xuICAgICAgICAgICAgcmV0dXJuIG9ic2VydmVQcm94eVJlc3BvbnNlKGNhY2hlQ29udHJvbGxlci5nZXRTdGF0ZSgpLnByb3h5JCwgcGF5bG9hZC5yZXMpO1xuICAgICAgICAgIH0pLnBpcGUoXG4gICAgICAgICAgICBvcC5tZXJnZU1hcCgoe3BheWxvYWQ6IFtwcm94eVJlcywgX3JlcSwgcmVzXX0pID0+IHtcbiAgICAgICAgICAgICAgcmV0dXJuIHJlcXVlc3RpbmdSZW1vdGUocGF5bG9hZC5rZXksIHBheWxvYWQucmVxLmhlYWRlcnMuaG9zdCwgcHJveHlSZXMsIHJlcyxcbiAgICAgICAgICAgICAgICBPYmplY3QuZW50cmllcyhwcm94eVJlcy5oZWFkZXJzKS5maWx0ZXIoZW50cnkgPT4gZW50cnlbMV0gIT0gbnVsbCkgYXMgW3N0cmluZywgc3RyaW5nIHwgc3RyaW5nW11dW10pO1xuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBvcC5jYXRjaEVycm9yKGVyciA9PiB7XG4gICAgICAgICAgICAgIGh0dHBQcm94eUxvZy53YXJuKGBSZXRyeSBcIiR7cGF5bG9hZC5yZXEudXJsfVwiYCwgZXJyKTtcbiAgICAgICAgICAgICAgcmV0dXJuIHJ4LnRpbWVyKDEwMDApLnBpcGUoXG4gICAgICAgICAgICAgICAgb3AubWFwVG8ocngudGhyb3dFcnJvcihlcnIpKVxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBvcC5yZXRyeSgzKVxuICAgICAgICAgICk7XG4gICAgICAgIH0pXG4gICAgICApXG4gICAgKS5waXBlKFxuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXJndW1lbnRcbiAgICAgIG9wLmlnbm9yZUVsZW1lbnRzKCksXG4gICAgICBvcC5jYXRjaEVycm9yKChlcnIsIHNyYykgPT4ge1xuICAgICAgICBodHRwUHJveHlMb2cuZXJyb3IoJ0hUVFAgcHJveHkgY2FjaGUgZXJyb3InLCBlcnIpO1xuICAgICAgICByZXR1cm4gc3JjO1xuICAgICAgfSlcbiAgICApO1xuICB9KTtcblxuICByZXR1cm4gY2FjaGVDb250cm9sbGVyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24ga2V5T2ZVcmkobWV0aG9kOiBzdHJpbmcsIHBhdGg6IHN0cmluZykge1xuICBjb25zdCB1cmwgPSBuZXcgVVJMKCdodHRwOi8vZi5jb20nICsgcGF0aCk7XG4gIGNvbnN0IGtleSA9IG1ldGhvZCArIHVybC5wYXRobmFtZSArICh1cmwuc2VhcmNoID8gJy8nICsgXy50cmltU3RhcnQodXJsLnNlYXJjaCwgJz8nKSA6ICcnKTtcbiAgcmV0dXJuIGtleTtcbn1cbiJdfQ==