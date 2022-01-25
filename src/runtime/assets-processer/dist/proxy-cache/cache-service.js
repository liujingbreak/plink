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
const httpProxyLog = plink_1.logger.getLogger((0, plink_1.log4File)(__filename).category + '#httpProxy');
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
                return rx.EMPTY;
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
            httpProxyLog.info('hitCache for ' + payload.key + ',' + item);
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
                proxyOpts.ignorePath = true;
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
        }))).pipe(op.ignoreElements(), op.catchError((err, src) => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGUtc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNhY2hlLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGdEQUF3QjtBQUV4Qix3REFBMEI7QUFDMUIseUNBQTJCO0FBQzNCLG1EQUFxQztBQUNyQyxvREFBdUI7QUFFdkIsMkNBQTREO0FBQzVELHNEQUEwQjtBQUMxQixzQ0FBb0Q7QUFDcEQseUVBQXlFO0FBQ3pFLDhGQUFvRztBQUNwRyxvQ0FBcUQ7QUFDckQsb0VBQW1GO0FBSW5GLE1BQU0sWUFBWSxHQUFHLGNBQU0sQ0FBQyxTQUFTLENBQUMsSUFBQSxnQkFBUSxFQUFDLFVBQVUsQ0FBQyxDQUFDLFFBQVEsR0FBRyxZQUFZLENBQUMsQ0FBQztBQUVwRixTQUFnQixvQkFBb0IsQ0FBQyxTQUFpQixFQUFFLGFBQTRCLEVBQUUsWUFBb0IsRUFDekYsT0FBbUQsRUFBQyxNQUFNLEVBQUUsS0FBSyxFQUFDOztJQUNqRixNQUFNLFlBQVksR0FBRyxJQUFBLDhCQUFpQixrQkFDcEMsWUFBWSxFQUFFLElBQUksRUFDbEIsRUFBRSxFQUFFLEtBQUssRUFDVCxNQUFNLEVBQUUsS0FBSyxFQUNiLG1CQUFtQixFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUNoQyxlQUFlLEVBQUUsSUFBSSxFQUNyQixZQUFZLEVBQUUsS0FBSyxFQUNuQixPQUFPLEVBQUUsS0FBSyxJQUNYLGFBQWEsRUFDaEIsQ0FBQztJQUNILE1BQU0sWUFBWSxHQUFvQjtRQUNwQyxLQUFLLEVBQUUsWUFBWTtRQUNuQixNQUFNLEVBQUUsSUFBQSwyQ0FBbUIsRUFBQyxZQUFZLENBQUM7UUFDekMsUUFBUSxFQUFFLFlBQVk7UUFDdEIsVUFBVSxFQUFFLElBQUksR0FBRyxFQUFFO1FBQ3JCLGNBQWMsRUFBRSxJQUFJLENBQUMsY0FBYyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFD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QWMsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUMzQyxNQUFNLEdBQUcsR0FBRyxNQUFNLEdBQUcsR0FBRyxDQUFDLFFBQVEsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxnQkFBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUMzRixPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUFKRCw0QkFJQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgSW5jb21pbmdNZXNzYWdlLCBTZXJ2ZXJSZXNwb25zZSB9IGZyb20gJ2h0dHAnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7UmVxdWVzdCwgUmVzcG9uc2UsIE5leHRGdW5jdGlvbn0gZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQge1NlcnZlck9wdGlvbnMsIGNyZWF0ZVByb3h5U2VydmVyfSBmcm9tICdodHRwLXByb3h5JztcbmltcG9ydCBhcGkgZnJvbSAnX19wbGluayc7XG5pbXBvcnQge2xvZ2dlciwgbG9nNEZpbGUsIGNvbmZpZ30gZnJvbSAnQHdmaC9wbGluayc7XG4vLyBpbXBvcnQgeyBjcmVhdGVQcm94eU1pZGRsZXdhcmUgYXMgcHJveHl9IGZyb20gJ2h0dHAtcHJveHktbWlkZGxld2FyZSc7XG5pbXBvcnQge2NyZWF0ZVNsaWNlLCBjYXN0QnlBY3Rpb25UeXBlfSBmcm9tICdAd2ZoL3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZS9kaXN0L3RpbnktcmVkdXgtdG9vbGtpdCc7XG5pbXBvcnQge2NyZWF0ZVJlcGxheVJlYWRhYmxlRmFjdG9yeX0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHtodHRwUHJveHlPYnNlcnZhYmxlLCBvYnNlcnZlUHJveHlSZXNwb25zZX0gZnJvbSAnLi4vaHR0cC1wcm94eS1vYnNlcnZhYmxlJztcbmltcG9ydCB7UHJveHlDYWNoZVN0YXRlLCBDYWNoZURhdGF9IGZyb20gJy4vdHlwZXMnO1xuXG5cbmNvbnN0IGh0dHBQcm94eUxvZyA9IGxvZ2dlci5nZXRMb2dnZXIobG9nNEZpbGUoX19maWxlbmFtZSkuY2F0ZWdvcnkgKyAnI2h0dHBQcm94eScpO1xuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUHJveHlXaXRoQ2FjaGUocHJveHlQYXRoOiBzdHJpbmcsIHNlcnZlck9wdGlvbnM6IFNlcnZlck9wdGlvbnMsIGNhY2hlUm9vdERpcjogc3RyaW5nLFxuICAgICAgICAgICAgICAgICBvcHRzOiB7bWFudWFsOiBib29sZWFuOyBtZW1DYWNoZUxlbmd0aD86IG51bWJlcn0gPSB7bWFudWFsOiBmYWxzZX0pIHtcbiAgY29uc3QgZGVmYXVsdFByb3h5ID0gY3JlYXRlUHJveHlTZXJ2ZXIoe1xuICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICB3czogZmFsc2UsXG4gICAgc2VjdXJlOiBmYWxzZSxcbiAgICBjb29raWVEb21haW5SZXdyaXRlOiB7ICcqJzogJycgfSxcbiAgICBmb2xsb3dSZWRpcmVjdHM6IHRydWUsXG4gICAgcHJveHlUaW1lb3V0OiAyMDAwMCxcbiAgICB0aW1lb3V0OiAxMDAwMCxcbiAgICAuLi5zZXJ2ZXJPcHRpb25zXG4gIH0pO1xuICBjb25zdCBpbml0aWFsU3RhdGU6IFByb3h5Q2FjaGVTdGF0ZSA9IHtcbiAgICBwcm94eTogZGVmYXVsdFByb3h5LFxuICAgIHByb3h5JDogaHR0cFByb3h5T2JzZXJ2YWJsZShkZWZhdWx0UHJveHkpLFxuICAgIGNhY2hlRGlyOiBjYWNoZVJvb3REaXIsXG4gICAgY2FjaGVCeVVyaTogbmV3IE1hcCgpLFxuICAgIG1lbUNhY2hlTGVuZ3RoOiBvcHRzLm1lbUNhY2hlTGVuZ3RoID09IG51bGwgPyBOdW1iZXIuTUFYX1ZBTFVFIDogb3B0cy5tZW1DYWNoZUxlbmd0aFxuICB9O1xuXG4gIGlmICghb3B0cy5tYW51YWwpIHtcbiAgICBhcGkuZXhwcmVzc0FwcFNldChhcHAgPT4ge1xuICAgICAgYXBwLnVzZShwcm94eVBhdGgsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgICAgICBjb25zdCBrZXkgPSBrZXlPZlVyaShyZXEubWV0aG9kLCByZXEudXJsKTtcbiAgICAgICAgY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuaGl0Q2FjaGUoe2tleSwgcmVxLCByZXMsIG5leHR9KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG4gIGNvbnN0IGNhY2hlQ29udHJvbGxlciA9IGNyZWF0ZVNsaWNlKHtcbiAgICBpbml0aWFsU3RhdGUsXG4gICAgbmFtZTogYEhUVFAtcHJveHktY2FjaGUtJHtwcm94eVBhdGh9YCAsXG4gICAgZGVidWdBY3Rpb25Pbmx5OiBjb25maWcoKS5jbGlPcHRpb25zPy52ZXJib3NlLFxuICAgIHJlZHVjZXJzOiB7XG4gICAgICBjb25maWdUcmFuc2Zvcm1lcihzOiBQcm94eUNhY2hlU3RhdGUsIHBheWxvYWQ6IHtcbiAgICAgICAgcmVtb3RlPzogUHJveHlDYWNoZVN0YXRlWydyZXNwb25zZVRyYW5zZm9ybWVyJ107XG4gICAgICAgIGNhY2hlZD86IFByb3h5Q2FjaGVTdGF0ZVsnY2FjaGVUcmFuc2Zvcm1lciddO1xuICAgICAgfSkge1xuICAgICAgICBpZiAocGF5bG9hZC5yZW1vdGUpXG4gICAgICAgICAgcy5yZXNwb25zZVRyYW5zZm9ybWVyID0gcGF5bG9hZC5yZW1vdGU7XG4gICAgICAgIGlmIChwYXlsb2FkLmNhY2hlZClcbiAgICAgICAgICBzLmNhY2hlVHJhbnNmb3JtZXIgPSBwYXlsb2FkLmNhY2hlZDtcbiAgICAgIH0sXG4gICAgICBoaXRDYWNoZShzOiBQcm94eUNhY2hlU3RhdGUsIHBheWxvYWQ6IHtcbiAgICAgICAga2V5OiBzdHJpbmc7IHJlcTogUmVxdWVzdDsgcmVzOiBSZXNwb25zZTsgbmV4dDogTmV4dEZ1bmN0aW9uO1xuICAgICAgICAvKiogb3ZlcnJpZGUgcmVtb3RlIHRhcmdldCAqL1xuICAgICAgICB0YXJnZXQ/OiBzdHJpbmc7XG4gICAgICB9KSB7fSxcblxuICAgICAgX3JlcXVlc3RSZW1vdGVEb25lKHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDoge1xuICAgICAgICBrZXk6IHN0cmluZzsgcmVxSG9zdDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICByZXM6IFNlcnZlclJlc3BvbnNlO1xuICAgICAgICBkYXRhOiB7aGVhZGVyczogQ2FjaGVEYXRhWydoZWFkZXJzJ107IHJlYWRhYmxlOiBJbmNvbWluZ01lc3NhZ2V9O1xuICAgICAgfSkge30sXG5cbiAgICAgIF9sb2FkRnJvbVN0b3JhZ2UoczogUHJveHlDYWNoZVN0YXRlLCBwYXlsb2FkOiB7a2V5OiBzdHJpbmc7IHJlcTogUmVxdWVzdDsgcmVzOiBSZXNwb25zZTtcbiAgICAgICAgICAgICAgICAgICAgICAgbmV4dDogTmV4dEZ1bmN0aW9uO1xuICAgICAgICB0YXJnZXQ/OiBzdHJpbmc7IH0pIHtcbiAgICAgICAgcy5jYWNoZUJ5VXJpLnNldChwYXlsb2FkLmtleSwgJ2xvYWRpbmcnKTtcbiAgICAgIH0sXG5cbiAgICAgIF9yZXF1ZXN0UmVtb3RlKHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDoge2tleTogc3RyaW5nOyByZXE6IFJlcXVlc3Q7IHJlczogUmVzcG9uc2U7IG5leHQ6IE5leHRGdW5jdGlvbjtcbiAgICAgICAgdGFyZ2V0Pzogc3RyaW5nOyB9KSB7XG4gICAgICAgIHMuY2FjaGVCeVVyaS5zZXQocGF5bG9hZC5rZXksICdyZXF1ZXN0aW5nJyk7XG4gICAgICB9LFxuICAgICAgX3NhdmluZ0ZpbGUoczogUHJveHlDYWNoZVN0YXRlLCBwYXlsb2FkOiB7XG4gICAgICAgIGtleTogc3RyaW5nO1xuICAgICAgICByZXM6IFNlcnZlclJlc3BvbnNlO1xuICAgICAgICBkYXRhOiBDYWNoZURhdGE7XG4gICAgICB9KSB7XG4gICAgICAgIHMuY2FjaGVCeVVyaS5zZXQocGF5bG9hZC5rZXksICdzYXZpbmcnKTtcbiAgICAgIH0sXG4gICAgICBfZG9uZShzOiBQcm94eUNhY2hlU3RhdGUsIHBheWxvYWQ6IHtcbiAgICAgICAga2V5OiBzdHJpbmc7XG4gICAgICAgIHJlczogU2VydmVyUmVzcG9uc2U7XG4gICAgICAgIGRhdGE6IENhY2hlRGF0YTtcbiAgICAgIH0pIHtcbiAgICAgICAgcy5jYWNoZUJ5VXJpLmRlbGV0ZShwYXlsb2FkLmtleSk7XG4gICAgICAgIC8vIGlmIChwYXlsb2FkLmRhdGEuc3RhdHVzQ29kZSAhPT0gMzA0KSB7XG4gICAgICAgIC8vICAgaWYgKHMuY2FjaGVCeVVyaS5zaXplID49IHMubWVtQ2FjaGVMZW5ndGgpIHtcbiAgICAgICAgLy8gICAgIC8vIFRPRE86IGltcHJvdmUgZm9yIExSVSBhbGdvcmlndGhtXG4gICAgICAgIC8vICAgICBzLmNhY2hlQnlVcmkuZGVsZXRlKHBheWxvYWQua2V5KTtcbiAgICAgICAgLy8gICAgIHJldHVybjtcbiAgICAgICAgLy8gICB9XG4gICAgICAgIC8vICAgcy5jYWNoZUJ5VXJpLnNldChwYXlsb2FkLmtleSwgcGF5bG9hZC5kYXRhKTtcbiAgICAgICAgLy8gfVxuICAgICAgfSxcbiAgICAgIF9jbGVhbihzOiBQcm94eUNhY2hlU3RhdGUsIGtleTogc3RyaW5nKSB7XG4gICAgICAgIHMuY2FjaGVCeVVyaS5kZWxldGUoa2V5KTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIGNhY2hlQ29udHJvbGxlci5lcGljKGFjdGlvbiQgPT4ge1xuICAgIGNvbnN0IGFjdGlvbnMgPSBjYXN0QnlBY3Rpb25UeXBlKGNhY2hlQ29udHJvbGxlci5hY3Rpb25zLCBhY3Rpb24kKTtcblxuICAgIGFzeW5jIGZ1bmN0aW9uIHJlcXVlc3RpbmdSZW1vdGUoXG4gICAgICBrZXk6IHN0cmluZywgcmVxSG9zdDogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICAgICAgcHJveHlSZXM6IEluY29taW5nTWVzc2FnZSxcbiAgICAgIHJlczogU2VydmVyUmVzcG9uc2UsXG4gICAgICBoZWFkZXJzOiBbc3RyaW5nLCBzdHJpbmcgfCBzdHJpbmdbXV1bXSkge1xuXG4gICAgICBodHRwUHJveHlMb2cuZGVidWcoJ2NhY2hlIHNpemU6JywgY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCkuY2FjaGVCeVVyaS5zaXplKTtcbiAgICAgIGNvbnN0IGRpciA9IFBhdGguam9pbihjYWNoZUNvbnRyb2xsZXIuZ2V0U3RhdGUoKS5jYWNoZURpciwga2V5KTtcbiAgICAgIGNvbnN0IGZpbGUgPSBQYXRoLmpvaW4oZGlyLCAnYm9keScpO1xuICAgICAgY29uc3Qgc3RhdHVzQ29kZSA9IHByb3h5UmVzLnN0YXR1c0NvZGUgfHwgMjAwO1xuICAgICAgY29uc3Qge3Jlc3BvbnNlVHJhbnNmb3JtZXJ9ID0gY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCk7XG4gICAgICBpZiAoc3RhdHVzQ29kZSA9PT0gMzA0KSB7XG4gICAgICAgIGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyLl9kb25lKHtrZXksIHJlcywgZGF0YToge1xuICAgICAgICAgICAgc3RhdHVzQ29kZSwgaGVhZGVycywgYm9keTogY3JlYXRlUmVwbGF5UmVhZGFibGVGYWN0b3J5KHByb3h5UmVzKVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGh0dHBQcm94eUxvZy53YXJuKCdWZXJzaW9uIGluZm8gaXMgbm90IHJlY29yZGVkLCBkdWUgdG8gcmVzcG9uc2UgMzA0IGZyb20nLCByZXMucmVxLnVybCwgJyxcXG4geW91IGNhbiByZW1vdmUgZXhpc3RpbmcgbnBtL2NhY2hlIGNhY2hlIHRvIGF2b2lkIDMwNCcpO1xuICAgICAgICByZXR1cm4gcnguRU1QVFk7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZXNwb25zZVRyYW5zZm9ybWVyID09IG51bGwpIHtcbiAgICAgICAgY29uc3QgZG9uZU1rZGlyID0gZnMubWtkaXJwKGRpcik7XG4gICAgICAgIGNvbnN0IHJlYWRhYmxlRmFjID0gY3JlYXRlUmVwbGF5UmVhZGFibGVGYWN0b3J5KHByb3h5UmVzLCB1bmRlZmluZWQsXG4gICAgICAgICAge2RlYnVnSW5mbzoga2V5LCBleHBlY3RMZW46IHBhcnNlSW50KHByb3h5UmVzLmhlYWRlcnNbJ2NvbnRlbnQtbGVuZ3RoJ10gYXMgc3RyaW5nLCAxMCl9KTtcbiAgICAgICAgIC8vIGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyLl9kb25lKHtrZXksIGRhdGE6IHtcbiAgICAgICAgIC8vICAgICAgIHN0YXR1c0NvZGUsIGhlYWRlcnMsIGJvZHk6ICgpID0+IHByb3h5UmVzXG4gICAgICAgICAvLyAgICAgfSwgcmVzXG4gICAgICAgICAvLyAgIH0pO1xuICAgICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fc2F2aW5nRmlsZSh7a2V5LCBkYXRhOiB7XG4gICAgICAgICAgICBzdGF0dXNDb2RlLCBoZWFkZXJzLCBib2R5OiByZWFkYWJsZUZhY1xuICAgICAgICAgIH0sIHJlc1xuICAgICAgICB9KTtcbiAgICAgICAgYXdhaXQgZG9uZU1rZGlyO1xuICAgICAgICB2b2lkIGZzLnByb21pc2VzLndyaXRlRmlsZShcbiAgICAgICAgICBQYXRoLmpvaW4oZGlyLCAnaGVhZGVyLmpzb24nKSxcbiAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHtzdGF0dXNDb2RlLCBoZWFkZXJzfSwgbnVsbCwgJyAgJyksXG4gICAgICAgICAgJ3V0Zi04Jyk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiByZWFkYWJsZUZhYygpXG4gICAgICAgICAgICAucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbShmaWxlKSlcbiAgICAgICAgICAgIC5vbignZmluaXNoJywgcmVzb2x2ZSlcbiAgICAgICAgICAgIC5vbignZXJyb3InLCByZWplY3QpKTtcblxuICAgICAgICAgIGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyLl9kb25lKHtrZXksIGRhdGE6IHtcbiAgICAgICAgICAgICAgc3RhdHVzQ29kZSwgaGVhZGVycywgYm9keTogcmVhZGFibGVGYWNcbiAgICAgICAgICAgIH0sIHJlc1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgaHR0cFByb3h5TG9nLmluZm8oYHJlc3BvbnNlIGlzIHdyaXR0ZW4gdG8gKGxlbmd0aDogJHtoZWFkZXJzLmZpbmQoaXRlbSA9PiBpdGVtWzBdID09PSAnY29udGVudC1sZW5ndGgnKSFbMV0gYXMgc3RyaW5nfSlgLFxuICAgICAgICAgICAgUGF0aC5wb3NpeC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBmaWxlKSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBodHRwUHJveHlMb2cuZXJyb3IoJ0ZhaWxlZCB0byB3cml0ZSBjYWNoZSBmaWxlICcgK1xuICAgICAgICAgICAgUGF0aC5wb3NpeC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBmaWxlKSwgZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAocmVxSG9zdCAmJiAhcmVxSG9zdC5zdGFydHNXaXRoKCdodHRwJykpIHtcbiAgICAgICAgcmVxSG9zdCA9ICdodHRwOi8vJyArIHJlcUhvc3Q7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHtyZWFkYWJsZTogdHJhbnNmb3JtZWQsIGxlbmd0aH0gPSBhd2FpdCByZXNwb25zZVRyYW5zZm9ybWVyKGhlYWRlcnMsIHJlcUhvc3QsIHByb3h5UmVzKTtcbiAgICAgIGNvbnN0IGxlbmd0aEhlYWRlcklkeCA9IGhlYWRlcnMuZmluZEluZGV4KHJvdyA9PiByb3dbMF0gPT09ICdjb250ZW50LWxlbmd0aCcpO1xuICAgICAgaWYgKGxlbmd0aEhlYWRlcklkeCA+PSAwKVxuICAgICAgICBoZWFkZXJzW2xlbmd0aEhlYWRlcklkeF1bMV0gPSAnJyArIGxlbmd0aDtcblxuICAgICAgY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuX3NhdmluZ0ZpbGUoe2tleSwgcmVzLCBkYXRhOiB7XG4gICAgICAgICAgc3RhdHVzQ29kZSwgaGVhZGVycywgYm9keTogdHJhbnNmb3JtZWRcbiAgICAgIH0gfSk7XG5cbiAgICAgIGF3YWl0IGZzLm1rZGlycChkaXIpO1xuICAgICAgdm9pZCBmcy5wcm9taXNlcy53cml0ZUZpbGUoXG4gICAgICAgIFBhdGguam9pbihkaXIsICdoZWFkZXIuanNvbicpLFxuICAgICAgICBKU09OLnN0cmluZ2lmeSh7c3RhdHVzQ29kZSwgaGVhZGVyc30sIG51bGwsICcgICcpLFxuICAgICAgICAndXRmLTgnKTtcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHRyYW5zZm9ybWVkKClcbiAgICAgICAgLm9uKCdlbmQnLCByZXNvbHZlKVxuICAgICAgICAucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbShmaWxlKSlcbiAgICAgICAgLm9uKCdlcnJvcicsIHJlamVjdCkpO1xuXG4gICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fZG9uZSh7a2V5LCByZXMsIGRhdGE6IHtcbiAgICAgICAgICBzdGF0dXNDb2RlLCBoZWFkZXJzLCBib2R5OiB0cmFuc2Zvcm1lZFxuICAgICAgfSB9KTtcbiAgICAgIGh0dHBQcm94eUxvZy5pbmZvKCd3cml0ZSByZXNwb25zZSB0byBmaWxlJywgUGF0aC5wb3NpeC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBmaWxlKSwgJ3NpemUnLCBsZW5ndGgpO1xuICAgIH1cblxuICAgIHJldHVybiByeC5tZXJnZShcbiAgICAgIGFjdGlvbnMuaGl0Q2FjaGUucGlwZShcbiAgICAgICAgb3AubWVyZ2VNYXAoICh7cGF5bG9hZH0pID0+IHtcbiAgICAgICAgICBjb25zdCB3YWl0Q2FjaGVBbmRTZW5kUmVzID0gcngucmFjZShhY3Rpb25zLl9kb25lLCBhY3Rpb25zLl9zYXZpbmdGaWxlKS5waXBlKFxuICAgICAgICAgICAgb3AuZmlsdGVyKGFjdGlvbiA9PiBhY3Rpb24ucGF5bG9hZC5rZXkgPT09IHBheWxvYWQua2V5KSwgLy8gSW4gY2FzZSBpdCBpcyBvZiByZWRpcmVjdGVkIHJlcXVlc3QsIEhQTSBoYXMgZG9uZSBwaXBpbmcgcmVzcG9uc2UgKGlnbm9yZWQgXCJtYW51YWwgcmVwb25zZVwiIHNldHRpbmcpXG4gICAgICAgICAgICBvcC50YWtlKDEpLFxuICAgICAgICAgICAgb3AubWVyZ2VNYXAoKHtwYXlsb2FkOiB7a2V5LCByZXMsIGRhdGF9fSkgPT4ge1xuICAgICAgICAgICAgICBpZiAocmVzLndyaXRhYmxlRW5kZWQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Jlc3BvbnNlIGlzIGVuZGVkIGVhcmx5LCB3aHk/Jyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBkYXRhLmhlYWRlcnMpIHtcbiAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKGVudHJ5WzBdLCBlbnRyeVsxXSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSBkYXRhLnN0YXR1c0NvZGU7XG4gICAgICAgICAgICAgIGh0dHBQcm94eUxvZy5pbmZvKCdyZXBseSB0bycsIHBheWxvYWQua2V5KTtcbiAgICAgICAgICAgICAgY29uc3QgcGlwZUV2ZW50JCA9IG5ldyByeC5TdWJqZWN0PHN0cmluZz4oKTtcbiAgICAgICAgICAgICAgcmVzLm9uKCdmaW5pc2gnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgcGlwZUV2ZW50JC5uZXh0KCdmaW5pc2gnKTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgLm9uKCdjbG9zZScsICgpID0+IHtcbiAgICAgICAgICAgICAgICBwaXBlRXZlbnQkLm5leHQoJ2Nsb3NlJyk7XG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIC5vbignZXJyb3InLCBlcnIgPT4gcGlwZUV2ZW50JC5lcnJvcihlcnIpKTtcblxuICAgICAgICAgICAgICBkYXRhLmJvZHkoKS5waXBlKHJlcyk7XG4gICAgICAgICAgICAgIHJldHVybiBwaXBlRXZlbnQkLnBpcGUoXG4gICAgICAgICAgICAgICAgb3AuZmlsdGVyKGV2ZW50ID0+IGV2ZW50ID09PSAnZmluaXNoJyB8fCBldmVudCA9PT0gJ2Nsb3NlJyksXG4gICAgICAgICAgICAgICAgb3AudGFwKGV2ZW50ID0+IHtcbiAgICAgICAgICAgICAgICAgIGlmIChldmVudCA9PT0gJ2Nsb3NlJylcbiAgICAgICAgICAgICAgICAgICAgaHR0cFByb3h5TG9nLmVycm9yKCdSZXNwb25zZSBjb25uZWN0aW9uIGlzIGNsb3NlZCBlYXJseScpO1xuICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgIG9wLnRha2UoMSksXG4gICAgICAgICAgICAgICAgb3AubWFwVG8oa2V5KSxcbiAgICAgICAgICAgICAgICBvcC50aW1lb3V0KDEyMDAwMCksXG4gICAgICAgICAgICAgICAgb3AuY2F0Y2hFcnJvcihlcnIgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKCFyZXMuaGVhZGVyc1NlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIHJldHVybiByeC5FTVBUWTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBvcC5tYXAoa2V5ID0+IGh0dHBQcm94eUxvZy5pbmZvKGByZXBsaWVkOiAke2tleX1gKSlcbiAgICAgICAgICApO1xuICAgICAgICAgIGNvbnN0IGl0ZW0gPSBjYWNoZUNvbnRyb2xsZXIuZ2V0U3RhdGUoKS5jYWNoZUJ5VXJpLmdldChwYXlsb2FkLmtleSk7XG4gICAgICAgICAgaHR0cFByb3h5TG9nLmluZm8oJ2hpdENhY2hlIGZvciAnICsgcGF5bG9hZC5rZXkgKyAnLCcgKyBpdGVtKTtcbiAgICAgICAgICBpZiAoaXRlbSA9PSBudWxsKSB7XG4gICAgICAgICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fbG9hZEZyb21TdG9yYWdlKHBheWxvYWQpO1xuICAgICAgICAgICAgcmV0dXJuIHdhaXRDYWNoZUFuZFNlbmRSZXM7XG4gICAgICAgICAgfSBlbHNlIGlmIChpdGVtID09PSAnbG9hZGluZycgfHwgaXRlbSA9PT0gJ3JlcXVlc3RpbmcnIHx8IGl0ZW0gPT09ICdzYXZpbmcnKSB7XG4gICAgICAgICAgICByZXR1cm4gd2FpdENhY2hlQW5kU2VuZFJlcztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaHR0cFByb3h5TG9nLmluZm8oJ2hpdCBjYWNoZWQnLCBwYXlsb2FkLmtleSk7XG4gICAgICAgICAgICBjb25zdCB0cmFuc2Zvcm1lciA9IGNhY2hlQ29udHJvbGxlci5nZXRTdGF0ZSgpLmNhY2hlVHJhbnNmb3JtZXI7XG4gICAgICAgICAgICBpZiAodHJhbnNmb3JtZXIgPT0gbnVsbCkge1xuICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGl0ZW0uaGVhZGVycykge1xuICAgICAgICAgICAgICAgIHBheWxvYWQucmVzLnNldEhlYWRlcihlbnRyeVswXSwgZW50cnlbMV0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHBheWxvYWQucmVzLnN0YXR1cyhpdGVtLnN0YXR1c0NvZGUpO1xuICAgICAgICAgICAgICByZXR1cm4gbmV3IHJ4Lk9ic2VydmFibGU8dm9pZD4oc3ViID0+IHtcbiAgICAgICAgICAgICAgICBpdGVtLmJvZHkoKVxuICAgICAgICAgICAgICAgIC5vbignZW5kJywgKCkgPT4ge3N1Yi5uZXh0KCk7IHN1Yi5jb21wbGV0ZSgpOyB9KVxuICAgICAgICAgICAgICAgIC5waXBlKHBheWxvYWQucmVzKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiByeC5mcm9tKHRyYW5zZm9ybWVyKGl0ZW0uaGVhZGVycywgcGF5bG9hZC5yZXEuaGVhZGVycy5ob3N0LCBpdGVtLmJvZHkoKSkpLnBpcGUoXG4gICAgICAgICAgICAgIG9wLnRha2UoMSksXG4gICAgICAgICAgICAgIG9wLm1lcmdlTWFwKCh7cmVhZGFibGUsIGxlbmd0aH0pID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBsZW5ndGhIZWFkZXJJZHggPSBpdGVtLmhlYWRlcnMuZmluZEluZGV4KHJvdyA9PiByb3dbMF0gPT09ICdjb250ZW50LWxlbmd0aCcpO1xuICAgICAgICAgICAgICAgIGlmIChsZW5ndGhIZWFkZXJJZHggPj0gMClcbiAgICAgICAgICAgICAgICAgIGl0ZW0uaGVhZGVyc1tsZW5ndGhIZWFkZXJJZHhdWzFdID0gJycgKyBsZW5ndGg7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBpdGVtLmhlYWRlcnMpIHtcbiAgICAgICAgICAgICAgICAgIHBheWxvYWQucmVzLnNldEhlYWRlcihlbnRyeVswXSwgZW50cnlbMV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwYXlsb2FkLnJlcy5zdGF0dXMoaXRlbS5zdGF0dXNDb2RlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IHJ4Lk9ic2VydmFibGU8dm9pZD4oc3ViID0+IHtcbiAgICAgICAgICAgICAgICAgIHJlYWRhYmxlKCkub24oJ2VuZCcsICgpID0+IHN1Yi5jb21wbGV0ZSgpKVxuICAgICAgICAgICAgICAgICAgICAucGlwZShwYXlsb2FkLnJlcylcbiAgICAgICAgICAgICAgICAgICAgLm9uKCdlcnJvcicsIGVyciA9PiBzdWIuZXJyb3IoZXJyKSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfSksXG4gICAgICAgIG9wLmNhdGNoRXJyb3IoZXJyID0+IHtcbiAgICAgICAgICBodHRwUHJveHlMb2cuZXJyb3IoJ0ZhaWxlZCB0byB3cml0ZSByZXNwb25zZScsIGVycik7XG4gICAgICAgICAgcmV0dXJuIHJ4LkVNUFRZO1xuICAgICAgICB9KVxuICAgICAgKSxcbiAgICAgIGFjdGlvbnMuX2xvYWRGcm9tU3RvcmFnZS5waXBlKFxuICAgICAgICBvcC5tZXJnZU1hcChhc3luYyAoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGRpciA9IFBhdGguam9pbihjYWNoZUNvbnRyb2xsZXIuZ2V0U3RhdGUoKS5jYWNoZURpciwgcGF5bG9hZC5rZXkpO1xuICAgICAgICAgICAgY29uc3QgaEZpbGUgPSBQYXRoLmpvaW4oZGlyLCAnaGVhZGVyLmpzb24nKTtcbiAgICAgICAgICAgIGNvbnN0IGJGaWxlID0gUGF0aC5qb2luKGRpciwgJ2JvZHknKTtcbiAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKGhGaWxlKSkge1xuICAgICAgICAgICAgICBodHRwUHJveHlMb2cuaW5mbygnbG9hZCcsIHBheWxvYWQua2V5KTtcbiAgICAgICAgICAgICAgY29uc3QgdHJhbnNmb3JtZXIgPSBjYWNoZUNvbnRyb2xsZXIuZ2V0U3RhdGUoKS5jYWNoZVRyYW5zZm9ybWVyO1xuICAgICAgICAgICAgICBpZiAodHJhbnNmb3JtZXIgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlcnNTdHIgPSBhd2FpdCBmcy5wcm9taXNlcy5yZWFkRmlsZShoRmlsZSwgJ3V0Zi04Jyk7XG4gICAgICAgICAgICAgICAgY29uc3Qge3N0YXR1c0NvZGUsIGhlYWRlcnN9ID0gSlNPTi5wYXJzZShoZWFkZXJzU3RyKSBhcyB7c3RhdHVzQ29kZTogbnVtYmVyOyBoZWFkZXJzOiBbc3RyaW5nLCBzdHJpbmcgfCBzdHJpbmdbXV1bXX07XG5cbiAgICAgICAgICAgICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fZG9uZSh7a2V5OiBwYXlsb2FkLmtleSwgcmVzOiBwYXlsb2FkLnJlcyxcbiAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzQ29kZSxcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVycyxcbiAgICAgICAgICAgICAgICAgICAgYm9keTogKCkgPT4gZnMuY3JlYXRlUmVhZFN0cmVhbShiRmlsZSlcbiAgICAgICAgICAgICAgICAgIH19KTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBjb25zdCBoZWFkZXJzU3RyID0gYXdhaXQgZnMucHJvbWlzZXMucmVhZEZpbGUoaEZpbGUsICd1dGYtOCcpO1xuICAgICAgICAgICAgICBjb25zdCB7c3RhdHVzQ29kZSwgaGVhZGVyc30gPSBKU09OLnBhcnNlKGhlYWRlcnNTdHIpIGFzIHtzdGF0dXNDb2RlOiBudW1iZXI7IGhlYWRlcnM6IFtzdHJpbmcsIHN0cmluZyB8IHN0cmluZ1tdXVtdfTtcbiAgICAgICAgICAgICAgY29uc3Qge3JlYWRhYmxlLCBsZW5ndGh9ID0gYXdhaXQgdHJhbnNmb3JtZXIoaGVhZGVycywgcGF5bG9hZC5yZXEuaGVhZGVycy5ob3N0LCBmcy5jcmVhdGVSZWFkU3RyZWFtKGJGaWxlKSk7XG4gICAgICAgICAgICAgIGNvbnN0IGxlbmd0aEhlYWRlcklkeCA9IGhlYWRlcnMuZmluZEluZGV4KHJvdyA9PiByb3dbMF0gPT09ICdjb250ZW50LWxlbmd0aCcpO1xuICAgICAgICAgICAgICBpZiAobGVuZ3RoSGVhZGVySWR4ID49IDApXG4gICAgICAgICAgICAgICAgaGVhZGVyc1tsZW5ndGhIZWFkZXJJZHhdWzFdID0gJycgKyBsZW5ndGg7XG5cbiAgICAgICAgICAgICAgY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuX2RvbmUoe2tleTogcGF5bG9hZC5rZXksXG4gICAgICAgICAgICAgICAgcmVzOiBwYXlsb2FkLnJlcyxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICBzdGF0dXNDb2RlLFxuICAgICAgICAgICAgICAgICAgaGVhZGVycyxcbiAgICAgICAgICAgICAgICAgIGJvZHk6IHJlYWRhYmxlXG4gICAgICAgICAgICAgICAgfX0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgaHR0cFByb3h5TG9nLmluZm8oJ05vIGV4aXN0aW5nIGZpbGUgZm9yJywgcGF5bG9hZC5rZXkpO1xuICAgICAgICAgICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fcmVxdWVzdFJlbW90ZShwYXlsb2FkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICAgICAgaHR0cFByb3h5TG9nLmVycm9yKCdGYWlsZWQgdG8gc2F2ZSBjYWNoZSBmb3I6ICcgKyBwYXlsb2FkLmtleSwgZXgpO1xuICAgICAgICAgICAgY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuX2NsZWFuKHBheWxvYWQua2V5KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICApLFxuICAgICAgYWN0aW9ucy5fcmVxdWVzdFJlbW90ZS5waXBlKFxuICAgICAgICAvLyB3YWl0IGZvciBwcm94eSBiZWluZyBjcmVhdGVkXG4gICAgICAgIC8vIG9wLm1lcmdlTWFwKGFjdGlvbiA9PiBjYWNoZUNvbnRyb2xsZXIuZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgICAvLyAgIG9wLm1hcChzID0+IHMucHJveHkpLFxuICAgICAgICAvLyAgIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICAgIC8vICAgb3AuZmlsdGVyKHByb3h5ID0+IHByb3h5ICE9IG51bGwpLFxuICAgICAgICAvLyAgIG9wLm1hcFRvKHtwcm94eSwgcGF5bG9hZDogYWN0aW9uLnBheWxvYWR9KVxuICAgICAgICAvLyApKSxcbiAgICAgICAgb3AubWVyZ2VNYXAoKHtwYXlsb2FkfSkgPT4ge1xuXG4gICAgICAgICAgY29uc3QgcHJveHlPcHRzOiBTZXJ2ZXJPcHRpb25zID0ge307XG4gICAgICAgICAgaWYgKHBheWxvYWQudGFyZ2V0KSB7XG4gICAgICAgICAgICBwcm94eU9wdHMudGFyZ2V0ID0gcGF5bG9hZC50YXJnZXQ7XG4gICAgICAgICAgICBwcm94eU9wdHMuaWdub3JlUGF0aCA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiByeC5kZWZlcigoKSA9PiB7XG4gICAgICAgICAgICBjYWNoZUNvbnRyb2xsZXIuZ2V0U3RhdGUoKS5wcm94eS53ZWIocGF5bG9hZC5yZXEsIHBheWxvYWQucmVzLCBwcm94eU9wdHMpO1xuICAgICAgICAgICAgcmV0dXJuIG9ic2VydmVQcm94eVJlc3BvbnNlKGNhY2hlQ29udHJvbGxlci5nZXRTdGF0ZSgpLnByb3h5JCwgcGF5bG9hZC5yZXMpO1xuICAgICAgICAgIH0pLnBpcGUoXG4gICAgICAgICAgICBvcC5tZXJnZU1hcCgoe3BheWxvYWQ6IFtwcm94eVJlcywgX3JlcSwgcmVzXX0pID0+IHtcbiAgICAgICAgICAgICAgcmV0dXJuIHJlcXVlc3RpbmdSZW1vdGUocGF5bG9hZC5rZXksIHBheWxvYWQucmVxLmhlYWRlcnMuaG9zdCwgcHJveHlSZXMsIHJlcyxcbiAgICAgICAgICAgICAgICBPYmplY3QuZW50cmllcyhwcm94eVJlcy5oZWFkZXJzKS5maWx0ZXIoZW50cnkgPT4gZW50cnlbMV0gIT0gbnVsbCkgYXMgW3N0cmluZywgc3RyaW5nIHwgc3RyaW5nW11dW10pO1xuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBvcC5jYXRjaEVycm9yKGVyciA9PiB7XG4gICAgICAgICAgICAgIGh0dHBQcm94eUxvZy53YXJuKGBSZXRyeSBcIiR7cGF5bG9hZC5yZXEudXJsfVwiYCwgZXJyKTtcbiAgICAgICAgICAgICAgcmV0dXJuIHJ4LnRpbWVyKDEwMDApLnBpcGUoXG4gICAgICAgICAgICAgICAgb3AubWFwVG8ocngudGhyb3dFcnJvcihlcnIpKVxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBvcC5yZXRyeSgzKVxuICAgICAgICAgICk7XG4gICAgICAgIH0pXG4gICAgICApXG4gICAgKS5waXBlKFxuICAgICAgb3AuaWdub3JlRWxlbWVudHMoKSxcbiAgICAgIG9wLmNhdGNoRXJyb3IoKGVyciwgc3JjKSA9PiB7XG4gICAgICAgIGh0dHBQcm94eUxvZy5lcnJvcignSFRUUCBwcm94eSBjYWNoZSBlcnJvcicsIGVycik7XG4gICAgICAgIHJldHVybiBzcmM7XG4gICAgICB9KVxuICAgICk7XG4gIH0pO1xuXG4gIHJldHVybiBjYWNoZUNvbnRyb2xsZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBrZXlPZlVyaShtZXRob2Q6IHN0cmluZywgcGF0aDogc3RyaW5nKSB7XG4gIGNvbnN0IHVybCA9IG5ldyBVUkwoJ2h0dHA6Ly9mLmNvbScgKyBwYXRoKTtcbiAgY29uc3Qga2V5ID0gbWV0aG9kICsgdXJsLnBhdGhuYW1lICsgKHVybC5zZWFyY2ggPyAnLycgKyBfLnRyaW1TdGFydCh1cmwuc2VhcmNoLCAnPycpIDogJycpO1xuICByZXR1cm4ga2V5O1xufVxuIl19