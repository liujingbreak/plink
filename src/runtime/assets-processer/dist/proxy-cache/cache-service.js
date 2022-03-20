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
        })), actions._requestRemote.pipe(op.mergeMap(({ payload }) => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGUtc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNhY2hlLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGdEQUF3QjtBQUV4Qix3REFBMEI7QUFDMUIseUNBQTJCO0FBQzNCLG1EQUFxQztBQUNyQyxvREFBdUI7QUFFdkIsMkNBQTREO0FBQzVELHNEQUEwQjtBQUMxQixzQ0FBNEM7QUFDNUMseUVBQXlFO0FBQ3pFLDhGQUFvRztBQUNwRyxvQ0FBcUQ7QUFDckQsb0VBQW1GO0FBSW5GLE1BQU0sWUFBWSxHQUFHLElBQUEsZ0JBQVEsRUFBQyxVQUFVLENBQUMsQ0FBQztBQUUxQyxTQUFnQixvQkFBb0IsQ0FBQyxTQUFpQixFQUFFLGFBQTRCLEVBQUUsWUFBb0IsRUFDekYsT0FBbUQsRUFBQyxNQUFNLEVBQUUsS0FBSyxFQUFDOztJQUNqRixNQUFNLFlBQVksR0FBRyxJQUFBLDhCQUFpQixrQkFDcEMsWUFBWSxFQUFFLElBQUksRUFDbEIsRUFBRSxFQUFFLEtBQUssRUFDVCxNQUFNLEVBQUUsS0FBSyxFQUNiLG1CQUFtQixFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUNoQyxlQUFlLEVBQUUsSUFBSSxFQUNyQixZQUFZLEVBQUUsS0FBSyxFQUNuQixPQUFPLEVBQUUsS0FBSyxJQUNYLGFBQWEsRUFDaEIsQ0FBQztJQUNILE1BQU0sWUFBWSxHQUFvQjtRQUNwQyxLQUFLLEVBQUUsWUFBWTtRQUNuQixNQUFNLEVBQUUsSUFBQSwyQ0FBbUIsRUFBQyxZQUFZLENBQUM7UUFDekMsUUFBUSxFQUFFLFlBQVk7UUFDdEIsVUFBVSxFQUFFLElBQUksR0FBRyxFQUFFO1FBQ3JCLGNBQWMsRUFBRSxJQUFJLENBQUMsY0FBYyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWM7S0FDckYsQ0FB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QUFNLEdBQUcsR0FBRyxNQUFNLEdBQUcsR0FBRyxDQUFDLFFBQVEsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxnQkFBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUMzRixPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUFKRCw0QkFJQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgSW5jb21pbmdNZXNzYWdlLCBTZXJ2ZXJSZXNwb25zZSB9IGZyb20gJ2h0dHAnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7UmVxdWVzdCwgUmVzcG9uc2UsIE5leHRGdW5jdGlvbn0gZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQge1NlcnZlck9wdGlvbnMsIGNyZWF0ZVByb3h5U2VydmVyfSBmcm9tICdodHRwLXByb3h5JztcbmltcG9ydCBhcGkgZnJvbSAnX19wbGluayc7XG5pbXBvcnQge2xvZzRGaWxlLCBjb25maWd9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuLy8gaW1wb3J0IHsgY3JlYXRlUHJveHlNaWRkbGV3YXJlIGFzIHByb3h5fSBmcm9tICdodHRwLXByb3h5LW1pZGRsZXdhcmUnO1xuaW1wb3J0IHtjcmVhdGVTbGljZSwgY2FzdEJ5QWN0aW9uVHlwZX0gZnJvbSAnQHdmaC9yZWR1eC10b29sa2l0LW9ic2VydmFibGUvZGlzdC90aW55LXJlZHV4LXRvb2xraXQnO1xuaW1wb3J0IHtjcmVhdGVSZXBsYXlSZWFkYWJsZUZhY3Rvcnl9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7aHR0cFByb3h5T2JzZXJ2YWJsZSwgb2JzZXJ2ZVByb3h5UmVzcG9uc2V9IGZyb20gJy4uL2h0dHAtcHJveHktb2JzZXJ2YWJsZSc7XG5pbXBvcnQge1Byb3h5Q2FjaGVTdGF0ZSwgQ2FjaGVEYXRhfSBmcm9tICcuL3R5cGVzJztcblxuXG5jb25zdCBodHRwUHJveHlMb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVByb3h5V2l0aENhY2hlKHByb3h5UGF0aDogc3RyaW5nLCBzZXJ2ZXJPcHRpb25zOiBTZXJ2ZXJPcHRpb25zLCBjYWNoZVJvb3REaXI6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgb3B0czoge21hbnVhbDogYm9vbGVhbjsgbWVtQ2FjaGVMZW5ndGg/OiBudW1iZXJ9ID0ge21hbnVhbDogZmFsc2V9KSB7XG4gIGNvbnN0IGRlZmF1bHRQcm94eSA9IGNyZWF0ZVByb3h5U2VydmVyKHtcbiAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgd3M6IGZhbHNlLFxuICAgIHNlY3VyZTogZmFsc2UsXG4gICAgY29va2llRG9tYWluUmV3cml0ZTogeyAnKic6ICcnIH0sXG4gICAgZm9sbG93UmVkaXJlY3RzOiB0cnVlLFxuICAgIHByb3h5VGltZW91dDogMjAwMDAsXG4gICAgdGltZW91dDogMTAwMDAsXG4gICAgLi4uc2VydmVyT3B0aW9uc1xuICB9KTtcbiAgY29uc3QgaW5pdGlhbFN0YXRlOiBQcm94eUNhY2hlU3RhdGUgPSB7XG4gICAgcHJveHk6IGRlZmF1bHRQcm94eSxcbiAgICBwcm94eSQ6IGh0dHBQcm94eU9ic2VydmFibGUoZGVmYXVsdFByb3h5KSxcbiAgICBjYWNoZURpcjogY2FjaGVSb290RGlyLFxuICAgIGNhY2hlQnlVcmk6IG5ldyBNYXAoKSxcbiAgICBtZW1DYWNoZUxlbmd0aDogb3B0cy5tZW1DYWNoZUxlbmd0aCA9PSBudWxsID8gTnVtYmVyLk1BWF9WQUxVRSA6IG9wdHMubWVtQ2FjaGVMZW5ndGhcbiAgfTtcblxuICBpZiAoIW9wdHMubWFudWFsKSB7XG4gICAgYXBpLmV4cHJlc3NBcHBTZXQoYXBwID0+IHtcbiAgICAgIGFwcC51c2UocHJveHlQYXRoLCAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICAgICAgY29uc3Qga2V5ID0ga2V5T2ZVcmkocmVxLm1ldGhvZCwgcmVxLnVybCk7XG4gICAgICAgIGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyLmhpdENhY2hlKHtrZXksIHJlcSwgcmVzLCBuZXh0fSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuICBjb25zdCBjYWNoZUNvbnRyb2xsZXIgPSBjcmVhdGVTbGljZSh7XG4gICAgaW5pdGlhbFN0YXRlLFxuICAgIG5hbWU6IGBIVFRQLXByb3h5LWNhY2hlLSR7cHJveHlQYXRofWAgLFxuICAgIGRlYnVnQWN0aW9uT25seTogY29uZmlnKCkuY2xpT3B0aW9ucz8udmVyYm9zZSxcbiAgICByZWR1Y2Vyczoge1xuICAgICAgY29uZmlnVHJhbnNmb3JtZXIoczogUHJveHlDYWNoZVN0YXRlLCBwYXlsb2FkOiB7XG4gICAgICAgIHJlbW90ZT86IFByb3h5Q2FjaGVTdGF0ZVsncmVzcG9uc2VUcmFuc2Zvcm1lciddO1xuICAgICAgICBjYWNoZWQ/OiBQcm94eUNhY2hlU3RhdGVbJ2NhY2hlVHJhbnNmb3JtZXInXTtcbiAgICAgIH0pIHtcbiAgICAgICAgaWYgKHBheWxvYWQucmVtb3RlKVxuICAgICAgICAgIHMucmVzcG9uc2VUcmFuc2Zvcm1lciA9IHBheWxvYWQucmVtb3RlO1xuICAgICAgICBpZiAocGF5bG9hZC5jYWNoZWQpXG4gICAgICAgICAgcy5jYWNoZVRyYW5zZm9ybWVyID0gcGF5bG9hZC5jYWNoZWQ7XG4gICAgICB9LFxuICAgICAgaGl0Q2FjaGUoczogUHJveHlDYWNoZVN0YXRlLCBwYXlsb2FkOiB7XG4gICAgICAgIGtleTogc3RyaW5nOyByZXE6IFJlcXVlc3Q7IHJlczogUmVzcG9uc2U7IG5leHQ6IE5leHRGdW5jdGlvbjtcbiAgICAgICAgLyoqIG92ZXJyaWRlIHJlbW90ZSB0YXJnZXQgKi9cbiAgICAgICAgdGFyZ2V0Pzogc3RyaW5nO1xuICAgICAgfSkge30sXG5cbiAgICAgIF9yZXF1ZXN0UmVtb3RlRG9uZShzOiBQcm94eUNhY2hlU3RhdGUsIHBheWxvYWQ6IHtcbiAgICAgICAga2V5OiBzdHJpbmc7IHJlcUhvc3Q6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgcmVzOiBTZXJ2ZXJSZXNwb25zZTtcbiAgICAgICAgZGF0YToge2hlYWRlcnM6IENhY2hlRGF0YVsnaGVhZGVycyddOyByZWFkYWJsZTogSW5jb21pbmdNZXNzYWdlfTtcbiAgICAgIH0pIHt9LFxuXG4gICAgICBfbG9hZEZyb21TdG9yYWdlKHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDoge2tleTogc3RyaW5nOyByZXE6IFJlcXVlc3Q7IHJlczogUmVzcG9uc2U7XG4gICAgICAgICAgICAgICAgICAgICAgIG5leHQ6IE5leHRGdW5jdGlvbjtcbiAgICAgICAgdGFyZ2V0Pzogc3RyaW5nOyB9KSB7XG4gICAgICAgIHMuY2FjaGVCeVVyaS5zZXQocGF5bG9hZC5rZXksICdsb2FkaW5nJyk7XG4gICAgICB9LFxuXG4gICAgICBfcmVxdWVzdFJlbW90ZShzOiBQcm94eUNhY2hlU3RhdGUsIHBheWxvYWQ6IHtrZXk6IHN0cmluZzsgcmVxOiBSZXF1ZXN0OyByZXM6IFJlc3BvbnNlOyBuZXh0OiBOZXh0RnVuY3Rpb247XG4gICAgICAgIHRhcmdldD86IHN0cmluZzsgfSkge1xuICAgICAgICBzLmNhY2hlQnlVcmkuc2V0KHBheWxvYWQua2V5LCAncmVxdWVzdGluZycpO1xuICAgICAgfSxcbiAgICAgIF9zYXZpbmdGaWxlKHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDoge1xuICAgICAgICBrZXk6IHN0cmluZztcbiAgICAgICAgcmVzOiBTZXJ2ZXJSZXNwb25zZTtcbiAgICAgICAgZGF0YTogQ2FjaGVEYXRhO1xuICAgICAgfSkge1xuICAgICAgICBzLmNhY2hlQnlVcmkuc2V0KHBheWxvYWQua2V5LCAnc2F2aW5nJyk7XG4gICAgICB9LFxuICAgICAgX2RvbmUoczogUHJveHlDYWNoZVN0YXRlLCBwYXlsb2FkOiB7XG4gICAgICAgIGtleTogc3RyaW5nO1xuICAgICAgICByZXM6IFNlcnZlclJlc3BvbnNlO1xuICAgICAgICBkYXRhOiBDYWNoZURhdGE7XG4gICAgICB9KSB7XG4gICAgICAgIHMuY2FjaGVCeVVyaS5kZWxldGUocGF5bG9hZC5rZXkpO1xuICAgICAgICAvLyBpZiAocGF5bG9hZC5kYXRhLnN0YXR1c0NvZGUgIT09IDMwNCkge1xuICAgICAgICAvLyAgIGlmIChzLmNhY2hlQnlVcmkuc2l6ZSA+PSBzLm1lbUNhY2hlTGVuZ3RoKSB7XG4gICAgICAgIC8vICAgICAvLyBUT0RPOiBpbXByb3ZlIGZvciBMUlUgYWxnb3JpZ3RobVxuICAgICAgICAvLyAgICAgcy5jYWNoZUJ5VXJpLmRlbGV0ZShwYXlsb2FkLmtleSk7XG4gICAgICAgIC8vICAgICByZXR1cm47XG4gICAgICAgIC8vICAgfVxuICAgICAgICAvLyAgIHMuY2FjaGVCeVVyaS5zZXQocGF5bG9hZC5rZXksIHBheWxvYWQuZGF0YSk7XG4gICAgICAgIC8vIH1cbiAgICAgIH0sXG4gICAgICBfY2xlYW4oczogUHJveHlDYWNoZVN0YXRlLCBrZXk6IHN0cmluZykge1xuICAgICAgICBzLmNhY2hlQnlVcmkuZGVsZXRlKGtleSk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICBjYWNoZUNvbnRyb2xsZXIuZXBpYyhhY3Rpb24kID0+IHtcbiAgICBjb25zdCBhY3Rpb25zID0gY2FzdEJ5QWN0aW9uVHlwZShjYWNoZUNvbnRyb2xsZXIuYWN0aW9ucywgYWN0aW9uJCk7XG5cbiAgICBhc3luYyBmdW5jdGlvbiByZXF1ZXN0aW5nUmVtb3RlKFxuICAgICAga2V5OiBzdHJpbmcsIHJlcUhvc3Q6IHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgICAgIHByb3h5UmVzOiBJbmNvbWluZ01lc3NhZ2UsXG4gICAgICByZXM6IFNlcnZlclJlc3BvbnNlLFxuICAgICAgaGVhZGVyczogW3N0cmluZywgc3RyaW5nIHwgc3RyaW5nW11dW10pIHtcblxuICAgICAgaHR0cFByb3h5TG9nLmRlYnVnKCdjYWNoZSBzaXplOicsIGNhY2hlQ29udHJvbGxlci5nZXRTdGF0ZSgpLmNhY2hlQnlVcmkuc2l6ZSk7XG4gICAgICBjb25zdCBkaXIgPSBQYXRoLmpvaW4oY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCkuY2FjaGVEaXIsIGtleSk7XG4gICAgICBjb25zdCBmaWxlID0gUGF0aC5qb2luKGRpciwgJ2JvZHknKTtcbiAgICAgIGNvbnN0IHN0YXR1c0NvZGUgPSBwcm94eVJlcy5zdGF0dXNDb2RlIHx8IDIwMDtcbiAgICAgIGNvbnN0IHtyZXNwb25zZVRyYW5zZm9ybWVyfSA9IGNhY2hlQ29udHJvbGxlci5nZXRTdGF0ZSgpO1xuICAgICAgaWYgKHN0YXR1c0NvZGUgPT09IDMwNCkge1xuICAgICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fZG9uZSh7a2V5LCByZXMsIGRhdGE6IHtcbiAgICAgICAgICAgIHN0YXR1c0NvZGUsIGhlYWRlcnMsIGJvZHk6IGNyZWF0ZVJlcGxheVJlYWRhYmxlRmFjdG9yeShwcm94eVJlcylcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBodHRwUHJveHlMb2cud2FybignVmVyc2lvbiBpbmZvIGlzIG5vdCByZWNvcmRlZCwgZHVlIHRvIHJlc3BvbnNlIDMwNCBmcm9tJywgcmVzLnJlcS51cmwsICcsXFxuIHlvdSBjYW4gcmVtb3ZlIGV4aXN0aW5nIG5wbS9jYWNoZSBjYWNoZSB0byBhdm9pZCAzMDQnKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKHN0YXR1c0NvZGUgIT09IDIwMCkge1xuICAgICAgICBodHRwUHJveHlMb2cuZXJyb3IoYFJlc3BvbnNlIGNvZGUgaXMgJHtzdGF0dXNDb2RlfSBmb3IgcmVxdWVzdDpgLCByZXMucmVxLnVybCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlc3BvbnNlVHJhbnNmb3JtZXIgPT0gbnVsbCkge1xuICAgICAgICBjb25zdCBkb25lTWtkaXIgPSBmcy5ta2RpcnAoZGlyKTtcbiAgICAgICAgY29uc3QgcmVhZGFibGVGYWMgPSBjcmVhdGVSZXBsYXlSZWFkYWJsZUZhY3RvcnkocHJveHlSZXMsIHVuZGVmaW5lZCxcbiAgICAgICAgICB7ZGVidWdJbmZvOiBrZXksIGV4cGVjdExlbjogcGFyc2VJbnQocHJveHlSZXMuaGVhZGVyc1snY29udGVudC1sZW5ndGgnXSBhcyBzdHJpbmcsIDEwKX0pO1xuICAgICAgICAgLy8gY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuX2RvbmUoe2tleSwgZGF0YToge1xuICAgICAgICAgLy8gICAgICAgc3RhdHVzQ29kZSwgaGVhZGVycywgYm9keTogKCkgPT4gcHJveHlSZXNcbiAgICAgICAgIC8vICAgICB9LCByZXNcbiAgICAgICAgIC8vICAgfSk7XG4gICAgICAgIGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyLl9zYXZpbmdGaWxlKHtrZXksIGRhdGE6IHtcbiAgICAgICAgICAgIHN0YXR1c0NvZGUsIGhlYWRlcnMsIGJvZHk6IHJlYWRhYmxlRmFjXG4gICAgICAgICAgfSwgcmVzXG4gICAgICAgIH0pO1xuICAgICAgICBhd2FpdCBkb25lTWtkaXI7XG4gICAgICAgIHZvaWQgZnMucHJvbWlzZXMud3JpdGVGaWxlKFxuICAgICAgICAgIFBhdGguam9pbihkaXIsICdoZWFkZXIuanNvbicpLFxuICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe3N0YXR1c0NvZGUsIGhlYWRlcnN9LCBudWxsLCAnICAnKSxcbiAgICAgICAgICAndXRmLTgnKTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHJlYWRhYmxlRmFjKClcbiAgICAgICAgICAgIC5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKGZpbGUpKVxuICAgICAgICAgICAgLm9uKCdmaW5pc2gnLCByZXNvbHZlKVxuICAgICAgICAgICAgLm9uKCdlcnJvcicsIHJlamVjdCkpO1xuXG4gICAgICAgICAgY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuX2RvbmUoe2tleSwgZGF0YToge1xuICAgICAgICAgICAgICBzdGF0dXNDb2RlLCBoZWFkZXJzLCBib2R5OiByZWFkYWJsZUZhY1xuICAgICAgICAgICAgfSwgcmVzXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBodHRwUHJveHlMb2cuaW5mbyhgcmVzcG9uc2UgaXMgd3JpdHRlbiB0byAobGVuZ3RoOiAke2hlYWRlcnMuZmluZChpdGVtID0+IGl0ZW1bMF0gPT09ICdjb250ZW50LWxlbmd0aCcpIVsxXSBhcyBzdHJpbmd9KWAsXG4gICAgICAgICAgICBQYXRoLnBvc2l4LnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGZpbGUpKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGh0dHBQcm94eUxvZy5lcnJvcignRmFpbGVkIHRvIHdyaXRlIGNhY2hlIGZpbGUgJyArXG4gICAgICAgICAgICBQYXRoLnBvc2l4LnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGZpbGUpLCBlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmIChyZXFIb3N0ICYmICFyZXFIb3N0LnN0YXJ0c1dpdGgoJ2h0dHAnKSkge1xuICAgICAgICByZXFIb3N0ID0gJ2h0dHA6Ly8nICsgcmVxSG9zdDtcbiAgICAgIH1cblxuICAgICAgY29uc3Qge3JlYWRhYmxlOiB0cmFuc2Zvcm1lZCwgbGVuZ3RofSA9IGF3YWl0IHJlc3BvbnNlVHJhbnNmb3JtZXIoaGVhZGVycywgcmVxSG9zdCwgcHJveHlSZXMpO1xuICAgICAgY29uc3QgbGVuZ3RoSGVhZGVySWR4ID0gaGVhZGVycy5maW5kSW5kZXgocm93ID0+IHJvd1swXSA9PT0gJ2NvbnRlbnQtbGVuZ3RoJyk7XG4gICAgICBpZiAobGVuZ3RoSGVhZGVySWR4ID49IDApXG4gICAgICAgIGhlYWRlcnNbbGVuZ3RoSGVhZGVySWR4XVsxXSA9ICcnICsgbGVuZ3RoO1xuXG4gICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fc2F2aW5nRmlsZSh7a2V5LCByZXMsIGRhdGE6IHtcbiAgICAgICAgICBzdGF0dXNDb2RlLCBoZWFkZXJzLCBib2R5OiB0cmFuc2Zvcm1lZFxuICAgICAgfSB9KTtcblxuICAgICAgYXdhaXQgZnMubWtkaXJwKGRpcik7XG4gICAgICB2b2lkIGZzLnByb21pc2VzLndyaXRlRmlsZShcbiAgICAgICAgUGF0aC5qb2luKGRpciwgJ2hlYWRlci5qc29uJyksXG4gICAgICAgIEpTT04uc3RyaW5naWZ5KHtzdGF0dXNDb2RlLCBoZWFkZXJzfSwgbnVsbCwgJyAgJyksXG4gICAgICAgICd1dGYtOCcpO1xuICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4gdHJhbnNmb3JtZWQoKVxuICAgICAgICAub24oJ2VuZCcsIHJlc29sdmUpXG4gICAgICAgIC5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKGZpbGUpKVxuICAgICAgICAub24oJ2Vycm9yJywgcmVqZWN0KSk7XG5cbiAgICAgIGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyLl9kb25lKHtrZXksIHJlcywgZGF0YToge1xuICAgICAgICAgIHN0YXR1c0NvZGUsIGhlYWRlcnMsIGJvZHk6IHRyYW5zZm9ybWVkXG4gICAgICB9IH0pO1xuICAgICAgaHR0cFByb3h5TG9nLmluZm8oJ3dyaXRlIHJlc3BvbnNlIHRvIGZpbGUnLCBQYXRoLnBvc2l4LnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGZpbGUpLCAnc2l6ZScsIGxlbmd0aCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJ4Lm1lcmdlKFxuICAgICAgYWN0aW9ucy5oaXRDYWNoZS5waXBlKFxuICAgICAgICBvcC5tZXJnZU1hcCggKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICAgIGNvbnN0IHdhaXRDYWNoZUFuZFNlbmRSZXMgPSByeC5yYWNlKGFjdGlvbnMuX2RvbmUsIGFjdGlvbnMuX3NhdmluZ0ZpbGUpLnBpcGUoXG4gICAgICAgICAgICBvcC5maWx0ZXIoYWN0aW9uID0+IGFjdGlvbi5wYXlsb2FkLmtleSA9PT0gcGF5bG9hZC5rZXkpLCAvLyBJbiBjYXNlIGl0IGlzIG9mIHJlZGlyZWN0ZWQgcmVxdWVzdCwgSFBNIGhhcyBkb25lIHBpcGluZyByZXNwb25zZSAoaWdub3JlZCBcIm1hbnVhbCByZXBvbnNlXCIgc2V0dGluZylcbiAgICAgICAgICAgIG9wLnRha2UoMSksXG4gICAgICAgICAgICBvcC5tZXJnZU1hcCgoe3BheWxvYWQ6IHtrZXksIHJlcywgZGF0YX19KSA9PiB7XG4gICAgICAgICAgICAgIGlmIChyZXMud3JpdGFibGVFbmRlZCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUmVzcG9uc2UgaXMgZW5kZWQgZWFybHksIHdoeT8nKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGRhdGEuaGVhZGVycykge1xuICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoZW50cnlbMF0sIGVudHJ5WzFdKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IGRhdGEuc3RhdHVzQ29kZTtcbiAgICAgICAgICAgICAgaHR0cFByb3h5TG9nLmluZm8oJ3JlcGx5IHRvJywgcGF5bG9hZC5rZXkpO1xuICAgICAgICAgICAgICBjb25zdCBwaXBlRXZlbnQkID0gbmV3IHJ4LlN1YmplY3Q8c3RyaW5nPigpO1xuICAgICAgICAgICAgICByZXMub24oJ2ZpbmlzaCcsICgpID0+IHtcbiAgICAgICAgICAgICAgICBwaXBlRXZlbnQkLm5leHQoJ2ZpbmlzaCcpO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAub24oJ2Nsb3NlJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHBpcGVFdmVudCQubmV4dCgnY2xvc2UnKTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgLm9uKCdlcnJvcicsIGVyciA9PiBwaXBlRXZlbnQkLmVycm9yKGVycikpO1xuXG4gICAgICAgICAgICAgIGRhdGEuYm9keSgpLnBpcGUocmVzKTtcbiAgICAgICAgICAgICAgcmV0dXJuIHBpcGVFdmVudCQucGlwZShcbiAgICAgICAgICAgICAgICBvcC5maWx0ZXIoZXZlbnQgPT4gZXZlbnQgPT09ICdmaW5pc2gnIHx8IGV2ZW50ID09PSAnY2xvc2UnKSxcbiAgICAgICAgICAgICAgICBvcC50YXAoZXZlbnQgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKGV2ZW50ID09PSAnY2xvc2UnKVxuICAgICAgICAgICAgICAgICAgICBodHRwUHJveHlMb2cuZXJyb3IoJ1Jlc3BvbnNlIGNvbm5lY3Rpb24gaXMgY2xvc2VkIGVhcmx5Jyk7XG4gICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgb3AudGFrZSgxKSxcbiAgICAgICAgICAgICAgICBvcC5tYXBUbyhrZXkpLFxuICAgICAgICAgICAgICAgIG9wLnRpbWVvdXQoMTIwMDAwKSxcbiAgICAgICAgICAgICAgICBvcC5jYXRjaEVycm9yKGVyciA9PiB7XG4gICAgICAgICAgICAgICAgICBpZiAoIXJlcy5oZWFkZXJzU2VudCkge1xuICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMDtcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZCgpO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZCgpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgcmV0dXJuIHJ4LkVNUFRZO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIG9wLm1hcChrZXkgPT4gaHR0cFByb3h5TG9nLmluZm8oYHJlcGxpZWQ6ICR7a2V5fWApKVxuICAgICAgICAgICk7XG4gICAgICAgICAgY29uc3QgaXRlbSA9IGNhY2hlQ29udHJvbGxlci5nZXRTdGF0ZSgpLmNhY2hlQnlVcmkuZ2V0KHBheWxvYWQua2V5KTtcbiAgICAgICAgICBodHRwUHJveHlMb2cuaW5mbygnaGl0Q2FjaGUgZm9yICcgKyBwYXlsb2FkLmtleSk7XG4gICAgICAgICAgaWYgKGl0ZW0gPT0gbnVsbCkge1xuICAgICAgICAgICAgY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuX2xvYWRGcm9tU3RvcmFnZShwYXlsb2FkKTtcbiAgICAgICAgICAgIHJldHVybiB3YWl0Q2FjaGVBbmRTZW5kUmVzO1xuICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbSA9PT0gJ2xvYWRpbmcnIHx8IGl0ZW0gPT09ICdyZXF1ZXN0aW5nJyB8fCBpdGVtID09PSAnc2F2aW5nJykge1xuICAgICAgICAgICAgcmV0dXJuIHdhaXRDYWNoZUFuZFNlbmRSZXM7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGh0dHBQcm94eUxvZy5pbmZvKCdoaXQgY2FjaGVkJywgcGF5bG9hZC5rZXkpO1xuICAgICAgICAgICAgY29uc3QgdHJhbnNmb3JtZXIgPSBjYWNoZUNvbnRyb2xsZXIuZ2V0U3RhdGUoKS5jYWNoZVRyYW5zZm9ybWVyO1xuICAgICAgICAgICAgaWYgKHRyYW5zZm9ybWVyID09IG51bGwpIHtcbiAgICAgICAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBpdGVtLmhlYWRlcnMpIHtcbiAgICAgICAgICAgICAgICBwYXlsb2FkLnJlcy5zZXRIZWFkZXIoZW50cnlbMF0sIGVudHJ5WzFdKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBwYXlsb2FkLnJlcy5zdGF0dXMoaXRlbS5zdGF0dXNDb2RlKTtcbiAgICAgICAgICAgICAgcmV0dXJuIG5ldyByeC5PYnNlcnZhYmxlPHZvaWQ+KHN1YiA9PiB7XG4gICAgICAgICAgICAgICAgaXRlbS5ib2R5KClcbiAgICAgICAgICAgICAgICAub24oJ2VuZCcsICgpID0+IHtzdWIubmV4dCgpOyBzdWIuY29tcGxldGUoKTsgfSlcbiAgICAgICAgICAgICAgICAucGlwZShwYXlsb2FkLnJlcyk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gcnguZnJvbSh0cmFuc2Zvcm1lcihpdGVtLmhlYWRlcnMsIHBheWxvYWQucmVxLmhlYWRlcnMuaG9zdCwgaXRlbS5ib2R5KCkpKS5waXBlKFxuICAgICAgICAgICAgICBvcC50YWtlKDEpLFxuICAgICAgICAgICAgICBvcC5tZXJnZU1hcCgoe3JlYWRhYmxlLCBsZW5ndGh9KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgbGVuZ3RoSGVhZGVySWR4ID0gaXRlbS5oZWFkZXJzLmZpbmRJbmRleChyb3cgPT4gcm93WzBdID09PSAnY29udGVudC1sZW5ndGgnKTtcbiAgICAgICAgICAgICAgICBpZiAobGVuZ3RoSGVhZGVySWR4ID49IDApXG4gICAgICAgICAgICAgICAgICBpdGVtLmhlYWRlcnNbbGVuZ3RoSGVhZGVySWR4XVsxXSA9ICcnICsgbGVuZ3RoO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgaXRlbS5oZWFkZXJzKSB7XG4gICAgICAgICAgICAgICAgICBwYXlsb2FkLnJlcy5zZXRIZWFkZXIoZW50cnlbMF0sIGVudHJ5WzFdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcGF5bG9hZC5yZXMuc3RhdHVzKGl0ZW0uc3RhdHVzQ29kZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyByeC5PYnNlcnZhYmxlPHZvaWQ+KHN1YiA9PiB7XG4gICAgICAgICAgICAgICAgICByZWFkYWJsZSgpLm9uKCdlbmQnLCAoKSA9PiBzdWIuY29tcGxldGUoKSlcbiAgICAgICAgICAgICAgICAgICAgLnBpcGUocGF5bG9hZC5yZXMpXG4gICAgICAgICAgICAgICAgICAgIC5vbignZXJyb3InLCBlcnIgPT4gc3ViLmVycm9yKGVycikpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pLFxuICAgICAgICBvcC5jYXRjaEVycm9yKGVyciA9PiB7XG4gICAgICAgICAgaHR0cFByb3h5TG9nLmVycm9yKCdGYWlsZWQgdG8gd3JpdGUgcmVzcG9uc2UnLCBlcnIpO1xuICAgICAgICAgIHJldHVybiByeC5FTVBUWTtcbiAgICAgICAgfSlcbiAgICAgICksXG4gICAgICBhY3Rpb25zLl9sb2FkRnJvbVN0b3JhZ2UucGlwZShcbiAgICAgICAgb3AubWVyZ2VNYXAoYXN5bmMgKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBkaXIgPSBQYXRoLmpvaW4oY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCkuY2FjaGVEaXIsIHBheWxvYWQua2V5KTtcbiAgICAgICAgICAgIGNvbnN0IGhGaWxlID0gUGF0aC5qb2luKGRpciwgJ2hlYWRlci5qc29uJyk7XG4gICAgICAgICAgICBjb25zdCBiRmlsZSA9IFBhdGguam9pbihkaXIsICdib2R5Jyk7XG4gICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhoRmlsZSkpIHtcbiAgICAgICAgICAgICAgaHR0cFByb3h5TG9nLmluZm8oJ2xvYWQnLCBwYXlsb2FkLmtleSk7XG4gICAgICAgICAgICAgIGNvbnN0IHRyYW5zZm9ybWVyID0gY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCkuY2FjaGVUcmFuc2Zvcm1lcjtcbiAgICAgICAgICAgICAgaWYgKHRyYW5zZm9ybWVyID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXJzU3RyID0gYXdhaXQgZnMucHJvbWlzZXMucmVhZEZpbGUoaEZpbGUsICd1dGYtOCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHtzdGF0dXNDb2RlLCBoZWFkZXJzfSA9IEpTT04ucGFyc2UoaGVhZGVyc1N0cikgYXMge3N0YXR1c0NvZGU6IG51bWJlcjsgaGVhZGVyczogW3N0cmluZywgc3RyaW5nIHwgc3RyaW5nW11dW119O1xuXG4gICAgICAgICAgICAgICAgY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuX2RvbmUoe2tleTogcGF5bG9hZC5rZXksIHJlczogcGF5bG9hZC5yZXMsXG4gICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1c0NvZGUsXG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcnMsXG4gICAgICAgICAgICAgICAgICAgIGJvZHk6ICgpID0+IGZzLmNyZWF0ZVJlYWRTdHJlYW0oYkZpbGUpXG4gICAgICAgICAgICAgICAgICB9fSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgY29uc3QgaGVhZGVyc1N0ciA9IGF3YWl0IGZzLnByb21pc2VzLnJlYWRGaWxlKGhGaWxlLCAndXRmLTgnKTtcbiAgICAgICAgICAgICAgY29uc3Qge3N0YXR1c0NvZGUsIGhlYWRlcnN9ID0gSlNPTi5wYXJzZShoZWFkZXJzU3RyKSBhcyB7c3RhdHVzQ29kZTogbnVtYmVyOyBoZWFkZXJzOiBbc3RyaW5nLCBzdHJpbmcgfCBzdHJpbmdbXV1bXX07XG4gICAgICAgICAgICAgIGNvbnN0IHtyZWFkYWJsZSwgbGVuZ3RofSA9IGF3YWl0IHRyYW5zZm9ybWVyKGhlYWRlcnMsIHBheWxvYWQucmVxLmhlYWRlcnMuaG9zdCwgZnMuY3JlYXRlUmVhZFN0cmVhbShiRmlsZSkpO1xuICAgICAgICAgICAgICBjb25zdCBsZW5ndGhIZWFkZXJJZHggPSBoZWFkZXJzLmZpbmRJbmRleChyb3cgPT4gcm93WzBdID09PSAnY29udGVudC1sZW5ndGgnKTtcbiAgICAgICAgICAgICAgaWYgKGxlbmd0aEhlYWRlcklkeCA+PSAwKVxuICAgICAgICAgICAgICAgIGhlYWRlcnNbbGVuZ3RoSGVhZGVySWR4XVsxXSA9ICcnICsgbGVuZ3RoO1xuXG4gICAgICAgICAgICAgIGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyLl9kb25lKHtrZXk6IHBheWxvYWQua2V5LFxuICAgICAgICAgICAgICAgIHJlczogcGF5bG9hZC5yZXMsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgc3RhdHVzQ29kZSxcbiAgICAgICAgICAgICAgICAgIGhlYWRlcnMsXG4gICAgICAgICAgICAgICAgICBib2R5OiByZWFkYWJsZVxuICAgICAgICAgICAgICAgIH19KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGh0dHBQcm94eUxvZy5pbmZvKCdObyBleGlzdGluZyBmaWxlIGZvcicsIHBheWxvYWQua2V5KTtcbiAgICAgICAgICAgICAgY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuX3JlcXVlc3RSZW1vdGUocGF5bG9hZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgICAgIGh0dHBQcm94eUxvZy5lcnJvcignRmFpbGVkIHRvIHNhdmUgY2FjaGUgZm9yOiAnICsgcGF5bG9hZC5rZXksIGV4KTtcbiAgICAgICAgICAgIGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyLl9jbGVhbihwYXlsb2FkLmtleSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgKSxcbiAgICAgIGFjdGlvbnMuX3JlcXVlc3RSZW1vdGUucGlwZShcbiAgICAgICAgb3AubWVyZ2VNYXAoKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICAgIGNvbnN0IHByb3h5T3B0czogU2VydmVyT3B0aW9ucyA9IHt9O1xuICAgICAgICAgIGlmIChwYXlsb2FkLnRhcmdldCkge1xuICAgICAgICAgICAgcHJveHlPcHRzLnRhcmdldCA9IHBheWxvYWQudGFyZ2V0O1xuICAgICAgICAgICAgcHJveHlPcHRzLmlnbm9yZVBhdGggPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gcnguZGVmZXIoKCkgPT4ge1xuICAgICAgICAgICAgY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCkucHJveHkud2ViKHBheWxvYWQucmVxLCBwYXlsb2FkLnJlcywgcHJveHlPcHRzKTtcbiAgICAgICAgICAgIHJldHVybiBvYnNlcnZlUHJveHlSZXNwb25zZShjYWNoZUNvbnRyb2xsZXIuZ2V0U3RhdGUoKS5wcm94eSQsIHBheWxvYWQucmVzKTtcbiAgICAgICAgICB9KS5waXBlKFxuICAgICAgICAgICAgb3AubWVyZ2VNYXAoKHtwYXlsb2FkOiBbcHJveHlSZXMsIF9yZXEsIHJlc119KSA9PiB7XG4gICAgICAgICAgICAgIHJldHVybiByZXF1ZXN0aW5nUmVtb3RlKHBheWxvYWQua2V5LCBwYXlsb2FkLnJlcS5oZWFkZXJzLmhvc3QsIHByb3h5UmVzLCByZXMsXG4gICAgICAgICAgICAgICAgT2JqZWN0LmVudHJpZXMocHJveHlSZXMuaGVhZGVycykuZmlsdGVyKGVudHJ5ID0+IGVudHJ5WzFdICE9IG51bGwpIGFzIFtzdHJpbmcsIHN0cmluZyB8IHN0cmluZ1tdXVtdKTtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgb3AuY2F0Y2hFcnJvcihlcnIgPT4ge1xuICAgICAgICAgICAgICBodHRwUHJveHlMb2cud2FybihgUmV0cnkgXCIke3BheWxvYWQucmVxLnVybH1cImAsIGVycik7XG4gICAgICAgICAgICAgIHJldHVybiByeC50aW1lcigxMDAwKS5waXBlKFxuICAgICAgICAgICAgICAgIG9wLm1hcFRvKHJ4LnRocm93RXJyb3IoZXJyKSlcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgb3AucmV0cnkoMylcbiAgICAgICAgICApO1xuICAgICAgICB9KVxuICAgICAgKVxuICAgICkucGlwZShcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFyZ3VtZW50XG4gICAgICBvcC5pZ25vcmVFbGVtZW50cygpLFxuICAgICAgb3AuY2F0Y2hFcnJvcigoZXJyLCBzcmMpID0+IHtcbiAgICAgICAgaHR0cFByb3h5TG9nLmVycm9yKCdIVFRQIHByb3h5IGNhY2hlIGVycm9yJywgZXJyKTtcbiAgICAgICAgcmV0dXJuIHNyYztcbiAgICAgIH0pXG4gICAgKTtcbiAgfSk7XG5cbiAgcmV0dXJuIGNhY2hlQ29udHJvbGxlcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGtleU9mVXJpKG1ldGhvZDogc3RyaW5nLCBwYXRoOiBzdHJpbmcpIHtcbiAgY29uc3QgdXJsID0gbmV3IFVSTCgnaHR0cDovL2YuY29tJyArIHBhdGgpO1xuICBjb25zdCBrZXkgPSBtZXRob2QgKyB1cmwucGF0aG5hbWUgKyAodXJsLnNlYXJjaCA/ICcvJyArIF8udHJpbVN0YXJ0KHVybC5zZWFyY2gsICc/JykgOiAnJyk7XG4gIHJldHVybiBrZXk7XG59XG4iXX0=