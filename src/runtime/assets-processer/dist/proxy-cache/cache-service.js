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
const inspector_1 = __importDefault(require("inspector"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const lodash_1 = __importDefault(require("lodash"));
const __plink_1 = __importDefault(require("__plink"));
const plink_1 = require("@wfh/plink");
const http_proxy_middleware_1 = require("http-proxy-middleware");
const tiny_redux_toolkit_1 = require("@wfh/redux-toolkit-observable/dist/tiny-redux-toolkit");
const utils_1 = require("../utils");
inspector_1.default.open(9222);
const httpProxyLog = plink_1.logger.getLogger((0, plink_1.log4File)(__filename).category + '#httpProxy');
function createProxyWithCache(proxyPath, targetUrl, cacheRootDir, opts = { manual: false }) {
    var _a;
    const initialState = {
        // proxyOptions: defaultProxyOptions(proxyPath, targetUrl),
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
            configureProxy(s, payload) {
            },
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
        const defaultProxyOpt = (0, utils_1.defaultProxyOptions)(proxyPath, targetUrl);
        const proxyError$ = new rx.Subject();
        const proxyRes$ = new rx.Subject();
        let proxyMiddleware$ = new rx.ReplaySubject(1);
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
                const readableFac = (0, utils_1.createReplayReadableFactory)(proxyRes, undefined, key);
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
        })), actions._requestRemote.pipe(op.mergeMap(({ payload }) => rx.merge(rx.race(proxyRes$.pipe(op.filter(([, , res]) => res === payload.res), op.take(1), op.mergeMap(([proxyRes, origReq, serverRes]) => {
            return rx.defer(() => requestingRemote(payload.key, payload.req.headers.host, proxyRes, serverRes, Object.entries(proxyRes.headers)
                .filter(entry => entry[1] != null)))
                .pipe(op.timeout(15000));
        })), proxyError$.pipe(op.filter(([err, origReq, serverRes]) => serverRes === payload.res), op.take(1), op.map(([err]) => {
            httpProxyLog.error('HPM error', err);
        }))), proxyMiddleware$.pipe(op.take(1), op.map(proxy => proxy(payload.req, payload.res, payload.next))))))).pipe(op.ignoreElements(), op.catchError((err, src) => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGUtc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNhY2hlLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGdEQUF3QjtBQUV4QiwwREFBa0M7QUFDbEMsd0RBQTBCO0FBQzFCLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMsb0RBQXVCO0FBRXZCLHNEQUEwQjtBQUMxQixzQ0FBb0Q7QUFDcEQsaUVBQTZGO0FBQzdGLDhGQUFvRztBQUNwRyxvQ0FBMEU7QUFHMUUsbUJBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDckIsTUFBTSxZQUFZLEdBQUcsY0FBTSxDQUFDLFNBQVMsQ0FBQyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUMsUUFBUSxHQUFHLFlBQVksQ0FBQyxDQUFDO0FBRXBGLFNBQWdCLG9CQUFvQixDQUFDLFNBQWlCLEVBQUUsU0FBaUIsRUFBRSxZQUFvQixFQUM5RSxPQUFtRCxFQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUM7O0lBQ2pGLE1BQU0sWUFBWSxHQUFvQjtRQUNwQywyREFBMkQ7UUFDM0QsUUFBUSxFQUFFLFlBQVk7UUFDdEIsVUFBVSxFQUFFLElBQUksR0FBRyxFQUFFO1FBQ3JCLGNBQWMsRUFBRSxJQUFJLENBQUMsY0FBYyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWM7S0FDckYsQ0FBQztJQUVGLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO1FBQ2hCLGlCQUFHLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3RCLEdBQUcsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRTtnQkFDcEMsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxN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Q0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQ1YsRUFBRSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQy9ELENBQ0YsQ0FBQyxDQUNILENBQ0YsQ0FBQyxJQUFJLENBQ0osRUFBRSxDQUFDLGNBQWMsRUFBRSxFQUNuQixFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQ3pCLFlBQVksQ0FBQyxLQUFLLENBQUMsd0JBQXdCLEVBQUUsR0FBRyxDQUFDLENBQUM7WUFDbEQsT0FBTyxHQUFHLENBQUM7UUFDYixDQUFDLENBQUMsQ0FDSCxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxPQUFPLGVBQWUsQ0FBQztBQUN6QixDQUFDO0FBOVdELG9EQThXQztBQUVELFNBQWdCLFFBQVEsQ0FBQyxNQUFjLEVBQUUsSUFBWTtJQUNuRCxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDM0MsTUFBTSxHQUFHLEdBQUcsTUFBTSxHQUFHLEdBQUcsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsZ0JBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDM0YsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBSkQsNEJBSUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IEluY29taW5nTWVzc2FnZSwgU2VydmVyUmVzcG9uc2UgfSBmcm9tICdodHRwJztcbmltcG9ydCBpbnNwZWN0b3IgZnJvbSAnaW5zcGVjdG9yJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge1JlcXVlc3QsIFJlc3BvbnNlLCBOZXh0RnVuY3Rpb259IGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IGFwaSBmcm9tICdfX3BsaW5rJztcbmltcG9ydCB7bG9nZ2VyLCBsb2c0RmlsZSwgY29uZmlnfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCB7IGNyZWF0ZVByb3h5TWlkZGxld2FyZSBhcyBwcm94eSwgT3B0aW9ucyBhcyBIcG1PcHRpb25zfSBmcm9tICdodHRwLXByb3h5LW1pZGRsZXdhcmUnO1xuaW1wb3J0IHtjcmVhdGVTbGljZSwgY2FzdEJ5QWN0aW9uVHlwZX0gZnJvbSAnQHdmaC9yZWR1eC10b29sa2l0LW9ic2VydmFibGUvZGlzdC90aW55LXJlZHV4LXRvb2xraXQnO1xuaW1wb3J0IHtjcmVhdGVSZXBsYXlSZWFkYWJsZUZhY3RvcnksIGRlZmF1bHRQcm94eU9wdGlvbnN9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7UHJveHlDYWNoZVN0YXRlLCBDYWNoZURhdGF9IGZyb20gJy4vdHlwZXMnO1xuXG5pbnNwZWN0b3Iub3Blbig5MjIyKTtcbmNvbnN0IGh0dHBQcm94eUxvZyA9IGxvZ2dlci5nZXRMb2dnZXIobG9nNEZpbGUoX19maWxlbmFtZSkuY2F0ZWdvcnkgKyAnI2h0dHBQcm94eScpO1xuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUHJveHlXaXRoQ2FjaGUocHJveHlQYXRoOiBzdHJpbmcsIHRhcmdldFVybDogc3RyaW5nLCBjYWNoZVJvb3REaXI6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgb3B0czoge21hbnVhbDogYm9vbGVhbjsgbWVtQ2FjaGVMZW5ndGg/OiBudW1iZXJ9ID0ge21hbnVhbDogZmFsc2V9KSB7XG4gIGNvbnN0IGluaXRpYWxTdGF0ZTogUHJveHlDYWNoZVN0YXRlID0ge1xuICAgIC8vIHByb3h5T3B0aW9uczogZGVmYXVsdFByb3h5T3B0aW9ucyhwcm94eVBhdGgsIHRhcmdldFVybCksXG4gICAgY2FjaGVEaXI6IGNhY2hlUm9vdERpcixcbiAgICBjYWNoZUJ5VXJpOiBuZXcgTWFwKCksXG4gICAgbWVtQ2FjaGVMZW5ndGg6IG9wdHMubWVtQ2FjaGVMZW5ndGggPT0gbnVsbCA/IE51bWJlci5NQVhfVkFMVUUgOiBvcHRzLm1lbUNhY2hlTGVuZ3RoXG4gIH07XG5cbiAgaWYgKCFvcHRzLm1hbnVhbCkge1xuICAgIGFwaS5leHByZXNzQXBwU2V0KGFwcCA9PiB7XG4gICAgICBhcHAudXNlKHByb3h5UGF0aCwgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgICAgIGNvbnN0IGtleSA9IGtleU9mVXJpKHJlcS5tZXRob2QsIHJlcS51cmwpO1xuICAgICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5oaXRDYWNoZSh7a2V5LCByZXEsIHJlcywgbmV4dH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbiAgY29uc3QgY2FjaGVDb250cm9sbGVyID0gY3JlYXRlU2xpY2Uoe1xuICAgIGluaXRpYWxTdGF0ZSxcbiAgICBuYW1lOiBgSFRUUC1wcm94eS1jYWNoZS0ke3Byb3h5UGF0aH1gICxcbiAgICBkZWJ1Z0FjdGlvbk9ubHk6IGNvbmZpZygpLmNsaU9wdGlvbnM/LnZlcmJvc2UsXG4gICAgcmVkdWNlcnM6IHtcbiAgICAgIGNvbmZpZ3VyZVByb3h5KHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDogSHBtT3B0aW9ucykge1xuICAgICAgfSxcbiAgICAgIGNvbmZpZ1RyYW5zZm9ybWVyKHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDoge1xuICAgICAgICByZW1vdGU/OiBQcm94eUNhY2hlU3RhdGVbJ3Jlc3BvbnNlVHJhbnNmb3JtZXInXTtcbiAgICAgICAgY2FjaGVkPzogUHJveHlDYWNoZVN0YXRlWydjYWNoZVRyYW5zZm9ybWVyJ107XG4gICAgICB9KSB7XG4gICAgICAgIGlmIChwYXlsb2FkLnJlbW90ZSlcbiAgICAgICAgICBzLnJlc3BvbnNlVHJhbnNmb3JtZXIgPSBwYXlsb2FkLnJlbW90ZTtcbiAgICAgICAgaWYgKHBheWxvYWQuY2FjaGVkKVxuICAgICAgICAgIHMuY2FjaGVUcmFuc2Zvcm1lciA9IHBheWxvYWQuY2FjaGVkO1xuICAgICAgfSxcbiAgICAgIGhpdENhY2hlKHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDoge2tleTogc3RyaW5nOyByZXE6IFJlcXVlc3Q7IHJlczogUmVzcG9uc2U7IG5leHQ6IE5leHRGdW5jdGlvbn0pIHt9LFxuXG4gICAgICBfcmVxdWVzdFJlbW90ZURvbmUoczogUHJveHlDYWNoZVN0YXRlLCBwYXlsb2FkOiB7XG4gICAgICAgIGtleTogc3RyaW5nOyByZXFIb3N0OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIHJlczogU2VydmVyUmVzcG9uc2U7XG4gICAgICAgIGRhdGE6IHtoZWFkZXJzOiBDYWNoZURhdGFbJ2hlYWRlcnMnXTsgcmVhZGFibGU6IEluY29taW5nTWVzc2FnZX07XG4gICAgICB9KSB7fSxcblxuICAgICAgX2xvYWRGcm9tU3RvcmFnZShzOiBQcm94eUNhY2hlU3RhdGUsIHBheWxvYWQ6IHtrZXk6IHN0cmluZzsgcmVxOiBSZXF1ZXN0OyByZXM6IFJlc3BvbnNlOyBuZXh0OiBOZXh0RnVuY3Rpb259KSB7XG4gICAgICAgIHMuY2FjaGVCeVVyaS5zZXQocGF5bG9hZC5rZXksICdsb2FkaW5nJyk7XG4gICAgICB9LFxuXG4gICAgICBfcmVxdWVzdFJlbW90ZShzOiBQcm94eUNhY2hlU3RhdGUsIHBheWxvYWQ6IHtrZXk6IHN0cmluZzsgcmVxOiBSZXF1ZXN0OyByZXM6IFJlc3BvbnNlOyBuZXh0OiBOZXh0RnVuY3Rpb259KSB7XG4gICAgICAgIHMuY2FjaGVCeVVyaS5zZXQocGF5bG9hZC5rZXksICdyZXF1ZXN0aW5nJyk7XG4gICAgICB9LFxuICAgICAgX3NhdmluZ0ZpbGUoczogUHJveHlDYWNoZVN0YXRlLCBwYXlsb2FkOiB7XG4gICAgICAgIGtleTogc3RyaW5nO1xuICAgICAgICByZXM6IFNlcnZlclJlc3BvbnNlO1xuICAgICAgICBkYXRhOiBDYWNoZURhdGE7XG4gICAgICB9KSB7XG4gICAgICAgIHMuY2FjaGVCeVVyaS5zZXQocGF5bG9hZC5rZXksICdzYXZpbmcnKTtcbiAgICAgIH0sXG4gICAgICBfZG9uZShzOiBQcm94eUNhY2hlU3RhdGUsIHBheWxvYWQ6IHtcbiAgICAgICAga2V5OiBzdHJpbmc7XG4gICAgICAgIHJlczogU2VydmVyUmVzcG9uc2U7XG4gICAgICAgIGRhdGE6IENhY2hlRGF0YTtcbiAgICAgIH0pIHtcbiAgICAgICAgcy5jYWNoZUJ5VXJpLmRlbGV0ZShwYXlsb2FkLmtleSk7XG4gICAgICAgIC8vIGlmIChwYXlsb2FkLmRhdGEuc3RhdHVzQ29kZSAhPT0gMzA0KSB7XG4gICAgICAgIC8vICAgaWYgKHMuY2FjaGVCeVVyaS5zaXplID49IHMubWVtQ2FjaGVMZW5ndGgpIHtcbiAgICAgICAgLy8gICAgIC8vIFRPRE86IGltcHJvdmUgZm9yIExSVSBhbGdvcmlndGhtXG4gICAgICAgIC8vICAgICBzLmNhY2hlQnlVcmkuZGVsZXRlKHBheWxvYWQua2V5KTtcbiAgICAgICAgLy8gICAgIHJldHVybjtcbiAgICAgICAgLy8gICB9XG4gICAgICAgIC8vICAgcy5jYWNoZUJ5VXJpLnNldChwYXlsb2FkLmtleSwgcGF5bG9hZC5kYXRhKTtcbiAgICAgICAgLy8gfVxuICAgICAgfSxcbiAgICAgIF9jbGVhbihzOiBQcm94eUNhY2hlU3RhdGUsIGtleTogc3RyaW5nKSB7XG4gICAgICAgIHMuY2FjaGVCeVVyaS5kZWxldGUoa2V5KTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIGNhY2hlQ29udHJvbGxlci5lcGljKGFjdGlvbiQgPT4ge1xuICAgIGNvbnN0IGRlZmF1bHRQcm94eU9wdCA9IGRlZmF1bHRQcm94eU9wdGlvbnMocHJveHlQYXRoLCB0YXJnZXRVcmwpO1xuICAgIGNvbnN0IHByb3h5RXJyb3IkID0gbmV3IHJ4LlN1YmplY3Q8UGFyYW1ldGVyczwodHlwZW9mIGRlZmF1bHRQcm94eU9wdClbJ29uRXJyb3InXT4+KCk7XG4gICAgY29uc3QgcHJveHlSZXMkID0gbmV3IHJ4LlN1YmplY3Q8UGFyYW1ldGVyczwodHlwZW9mIGRlZmF1bHRQcm94eU9wdClbJ29uUHJveHlSZXMnXT4+KCk7XG5cbiAgICBsZXQgcHJveHlNaWRkbGV3YXJlJCA9IG5ldyByeC5SZXBsYXlTdWJqZWN0PFJldHVyblR5cGU8dHlwZW9mIHByb3h5Pj4oMSk7XG4gICAgY29uc3QgYWN0aW9ucyA9IGNhc3RCeUFjdGlvblR5cGUoY2FjaGVDb250cm9sbGVyLmFjdGlvbnMsIGFjdGlvbiQpO1xuXG4gICAgYXN5bmMgZnVuY3Rpb24gcmVxdWVzdGluZ1JlbW90ZShrZXk6IHN0cmluZywgcmVxSG9zdDogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJveHlSZXM6IEluY29taW5nTWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlczogU2VydmVyUmVzcG9uc2UsIGhlYWRlcnM6IFtzdHJpbmcsIHN0cmluZyB8IHN0cmluZ1tdXVtdKSB7XG4gICAgICBodHRwUHJveHlMb2cuZGVidWcoJ2NhY2hlIHNpemU6JywgY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCkuY2FjaGVCeVVyaS5zaXplKTtcbiAgICAgIGNvbnN0IGRpciA9IFBhdGguam9pbihjYWNoZUNvbnRyb2xsZXIuZ2V0U3RhdGUoKS5jYWNoZURpciwga2V5KTtcbiAgICAgIGNvbnN0IGZpbGUgPSBQYXRoLmpvaW4oZGlyLCAnYm9keScpO1xuICAgICAgY29uc3Qgc3RhdHVzQ29kZSA9IHByb3h5UmVzLnN0YXR1c0NvZGUgfHwgMjAwO1xuICAgICAgY29uc3Qge3Jlc3BvbnNlVHJhbnNmb3JtZXJ9ID0gY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCk7XG4gICAgICBpZiAoc3RhdHVzQ29kZSA9PT0gMzA0KSB7XG4gICAgICAgIGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyLl9kb25lKHtrZXksIHJlcywgZGF0YToge1xuICAgICAgICAgICAgc3RhdHVzQ29kZSwgaGVhZGVycywgYm9keTogY3JlYXRlUmVwbGF5UmVhZGFibGVGYWN0b3J5KHByb3h5UmVzKVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGh0dHBQcm94eUxvZy53YXJuKCdWZXJzaW9uIGluZm8gaXMgbm90IHJlY29yZGVkLCBkdWUgdG8gcmVzcG9uc2UgMzA0IGZyb20nLCByZXMucmVxLnVybCwgJyxcXG4geW91IGNhbiByZW1vdmUgZXhpc3RpbmcgbnBtL2NhY2hlIGNhY2hlIHRvIGF2b2lkIDMwNCcpO1xuICAgICAgICByZXR1cm4gcnguRU1QVFk7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZXNwb25zZVRyYW5zZm9ybWVyID09IG51bGwpIHtcbiAgICAgICAgY29uc3QgZG9uZU1rZGlyID0gZnMubWtkaXJwKGRpcik7XG4gICAgICAgIGNvbnN0IHJlYWRhYmxlRmFjID0gY3JlYXRlUmVwbGF5UmVhZGFibGVGYWN0b3J5KHByb3h5UmVzLCB1bmRlZmluZWQsIGtleSk7XG4gICAgICAgICAvLyBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fZG9uZSh7a2V5LCBkYXRhOiB7XG4gICAgICAgICAvLyAgICAgICBzdGF0dXNDb2RlLCBoZWFkZXJzLCBib2R5OiAoKSA9PiBwcm94eVJlc1xuICAgICAgICAgLy8gICAgIH0sIHJlc1xuICAgICAgICAgLy8gICB9KTtcbiAgICAgICAgY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuX3NhdmluZ0ZpbGUoe2tleSwgZGF0YToge1xuICAgICAgICAgICAgc3RhdHVzQ29kZSwgaGVhZGVycywgYm9keTogcmVhZGFibGVGYWNcbiAgICAgICAgICB9LCByZXNcbiAgICAgICAgfSk7XG4gICAgICAgIGF3YWl0IGRvbmVNa2RpcjtcbiAgICAgICAgdm9pZCBmcy5wcm9taXNlcy53cml0ZUZpbGUoXG4gICAgICAgICAgUGF0aC5qb2luKGRpciwgJ2hlYWRlci5qc29uJyksXG4gICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7c3RhdHVzQ29kZSwgaGVhZGVyc30sIG51bGwsICcgICcpLFxuICAgICAgICAgICd1dGYtOCcpO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4gcmVhZGFibGVGYWMoKVxuICAgICAgICAgICAgLnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0oZmlsZSkpXG4gICAgICAgICAgICAub24oJ2ZpbmlzaCcsIHJlc29sdmUpXG4gICAgICAgICAgICAub24oJ2Vycm9yJywgcmVqZWN0KSk7XG5cbiAgICAgICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fZG9uZSh7a2V5LCBkYXRhOiB7XG4gICAgICAgICAgICAgIHN0YXR1c0NvZGUsIGhlYWRlcnMsIGJvZHk6IHJlYWRhYmxlRmFjXG4gICAgICAgICAgICB9LCByZXNcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGh0dHBQcm94eUxvZy5pbmZvKGByZXNwb25zZSBpcyB3cml0dGVuIHRvIChsZW5ndGg6ICR7aGVhZGVycy5maW5kKGl0ZW0gPT4gaXRlbVswXSA9PT0gJ2NvbnRlbnQtbGVuZ3RoJykhWzFdIGFzIHN0cmluZ30pYCxcbiAgICAgICAgICAgIFBhdGgucG9zaXgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgZmlsZSkpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgaHR0cFByb3h5TG9nLmVycm9yKCdGYWlsZWQgdG8gd3JpdGUgY2FjaGUgZmlsZSAnICtcbiAgICAgICAgICAgIFBhdGgucG9zaXgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgZmlsZSksIGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKHJlcUhvc3QgJiYgIXJlcUhvc3Quc3RhcnRzV2l0aCgnaHR0cCcpKSB7XG4gICAgICAgIHJlcUhvc3QgPSAnaHR0cDovLycgKyByZXFIb3N0O1xuICAgICAgfVxuXG4gICAgICBjb25zdCB7cmVhZGFibGU6IHRyYW5zZm9ybWVkLCBsZW5ndGh9ID0gYXdhaXQgcmVzcG9uc2VUcmFuc2Zvcm1lcihoZWFkZXJzLCByZXFIb3N0LCBwcm94eVJlcyk7XG4gICAgICBjb25zdCBsZW5ndGhIZWFkZXJJZHggPSBoZWFkZXJzLmZpbmRJbmRleChyb3cgPT4gcm93WzBdID09PSAnY29udGVudC1sZW5ndGgnKTtcbiAgICAgIGlmIChsZW5ndGhIZWFkZXJJZHggPj0gMClcbiAgICAgICAgaGVhZGVyc1tsZW5ndGhIZWFkZXJJZHhdWzFdID0gJycgKyBsZW5ndGg7XG5cbiAgICAgIGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyLl9zYXZpbmdGaWxlKHtrZXksIHJlcywgZGF0YToge1xuICAgICAgICAgIHN0YXR1c0NvZGUsIGhlYWRlcnMsIGJvZHk6IHRyYW5zZm9ybWVkXG4gICAgICB9IH0pO1xuXG4gICAgICBhd2FpdCBmcy5ta2RpcnAoZGlyKTtcbiAgICAgIHZvaWQgZnMucHJvbWlzZXMud3JpdGVGaWxlKFxuICAgICAgICBQYXRoLmpvaW4oZGlyLCAnaGVhZGVyLmpzb24nKSxcbiAgICAgICAgSlNPTi5zdHJpbmdpZnkoe3N0YXR1c0NvZGUsIGhlYWRlcnN9LCBudWxsLCAnICAnKSxcbiAgICAgICAgJ3V0Zi04Jyk7XG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB0cmFuc2Zvcm1lZCgpXG4gICAgICAgIC5vbignZW5kJywgcmVzb2x2ZSlcbiAgICAgICAgLnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0oZmlsZSkpXG4gICAgICAgIC5vbignZXJyb3InLCByZWplY3QpKTtcblxuICAgICAgY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuX2RvbmUoe2tleSwgcmVzLCBkYXRhOiB7XG4gICAgICAgICAgc3RhdHVzQ29kZSwgaGVhZGVycywgYm9keTogdHJhbnNmb3JtZWRcbiAgICAgIH0gfSk7XG4gICAgICBodHRwUHJveHlMb2cuaW5mbygnd3JpdGUgcmVzcG9uc2UgdG8gZmlsZScsIFBhdGgucG9zaXgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgZmlsZSksICdzaXplJywgbGVuZ3RoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcngubWVyZ2UoXG4gICAgICBhY3Rpb25zLmNvbmZpZ3VyZVByb3h5LnBpcGUoXG4gICAgICAgIG9wLm1hcCgoe3BheWxvYWQ6IGV4dHJhT3B0fSkgPT4ge1xuICAgICAgICAgIHByb3h5TWlkZGxld2FyZSQubmV4dChwcm94eSh7XG4gICAgICAgICAgICAuLi5kZWZhdWx0UHJveHlPcHQsXG4gICAgICAgICAgICBmb2xsb3dSZWRpcmVjdHM6IHRydWUsXG4gICAgICAgICAgICAuLi5leHRyYU9wdCxcbiAgICAgICAgICAgIG9uUHJveHlSZXMoLi4uYXJncykge1xuICAgICAgICAgICAgICBwcm94eVJlcyQubmV4dChhcmdzKTtcbiAgICAgICAgICAgICAgZGVmYXVsdFByb3h5T3B0Lm9uUHJveHlSZXMoLi4uYXJncyk7XG4gICAgICAgICAgICAgIGlmIChleHRyYU9wdC5vblByb3h5UmVzKVxuICAgICAgICAgICAgICAgIGV4dHJhT3B0Lm9uUHJveHlSZXMoLi4uYXJncyk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgb25FcnJvciguLi5hcmdzKSB7XG4gICAgICAgICAgICAgIGRlZmF1bHRQcm94eU9wdC5vbkVycm9yKC4uLmFyZ3MpO1xuICAgICAgICAgICAgICBwcm94eUVycm9yJC5uZXh0KGFyZ3MpO1xuICAgICAgICAgICAgICBpZiAoZXh0cmFPcHQub25FcnJvcilcbiAgICAgICAgICAgICAgICBleHRyYU9wdC5vbkVycm9yKC4uLmFyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0pKTtcbiAgICAgICAgfSlcbiAgICAgICksXG4gICAgICBhY3Rpb25zLmhpdENhY2hlLnBpcGUoXG4gICAgICAgIG9wLm1lcmdlTWFwKCAoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgICAgY29uc3Qgd2FpdENhY2hlQW5kU2VuZFJlcyA9IHJ4LnJhY2UoYWN0aW9ucy5fZG9uZSwgYWN0aW9ucy5fc2F2aW5nRmlsZSkucGlwZShcbiAgICAgICAgICAgIG9wLmZpbHRlcihhY3Rpb24gPT4gYWN0aW9uLnBheWxvYWQua2V5ID09PSBwYXlsb2FkLmtleSksIC8vIEluIGNhc2UgaXQgaXMgb2YgcmVkaXJlY3RlZCByZXF1ZXN0LCBIUE0gaGFzIGRvbmUgcGlwaW5nIHJlc3BvbnNlIChpZ25vcmVkIFwibWFudWFsIHJlcG9uc2VcIiBzZXR0aW5nKVxuICAgICAgICAgICAgb3AudGFrZSgxKSxcbiAgICAgICAgICAgIG9wLm1lcmdlTWFwKCh7cGF5bG9hZDoge2tleSwgcmVzLCBkYXRhfX0pID0+IHtcbiAgICAgICAgICAgICAgaWYgKHJlcy53cml0YWJsZUVuZGVkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdSZXNwb25zZSBpcyBlbmRlZCBlYXJseSwgd2h5PycpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgZGF0YS5oZWFkZXJzKSB7XG4gICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihlbnRyeVswXSwgZW50cnlbMV0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gZGF0YS5zdGF0dXNDb2RlO1xuICAgICAgICAgICAgICBodHRwUHJveHlMb2cuaW5mbygncmVwbHkgdG8nLCBwYXlsb2FkLmtleSk7XG4gICAgICAgICAgICAgIGNvbnN0IHBpcGVFdmVudCQgPSBuZXcgcnguU3ViamVjdDxzdHJpbmc+KCk7XG4gICAgICAgICAgICAgIHJlcy5vbignZmluaXNoJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHBpcGVFdmVudCQubmV4dCgnZmluaXNoJyk7XG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIC5vbignY2xvc2UnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgcGlwZUV2ZW50JC5uZXh0KCdjbG9zZScpO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAub24oJ2Vycm9yJywgZXJyID0+IHBpcGVFdmVudCQuZXJyb3IoZXJyKSk7XG5cbiAgICAgICAgICAgICAgZGF0YS5ib2R5KCkucGlwZShyZXMpO1xuICAgICAgICAgICAgICByZXR1cm4gcGlwZUV2ZW50JC5waXBlKFxuICAgICAgICAgICAgICAgIG9wLmZpbHRlcihldmVudCA9PiBldmVudCA9PT0gJ2ZpbmlzaCcgfHwgZXZlbnQgPT09ICdjbG9zZScpLFxuICAgICAgICAgICAgICAgIG9wLnRhcChldmVudCA9PiB7XG4gICAgICAgICAgICAgICAgICBpZiAoZXZlbnQgPT09ICdjbG9zZScpXG4gICAgICAgICAgICAgICAgICAgIGh0dHBQcm94eUxvZy5lcnJvcignUmVzcG9uc2UgY29ubmVjdGlvbiBpcyBjbG9zZWQgZWFybHknKTtcbiAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICBvcC50YWtlKDEpLFxuICAgICAgICAgICAgICAgIG9wLm1hcFRvKGtleSksXG4gICAgICAgICAgICAgICAgb3AudGltZW91dCgxMjAwMDApLFxuICAgICAgICAgICAgICAgIG9wLmNhdGNoRXJyb3IoZXJyID0+IHtcbiAgICAgICAgICAgICAgICAgIGlmICghcmVzLmhlYWRlcnNTZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKCk7XG4gICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXMuZW5kKCk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICByZXR1cm4gcnguRU1QVFk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgb3AubWFwKGtleSA9PiBodHRwUHJveHlMb2cuaW5mbyhgcmVwbGllZDogJHtrZXl9YCkpXG4gICAgICAgICAgKTtcbiAgICAgICAgICBjb25zdCBpdGVtID0gY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCkuY2FjaGVCeVVyaS5nZXQocGF5bG9hZC5rZXkpO1xuICAgICAgICAgIGh0dHBQcm94eUxvZy5pbmZvKCdoaXRDYWNoZSBmb3IgJyArIHBheWxvYWQua2V5ICsgJywnICsgaXRlbSk7XG4gICAgICAgICAgaWYgKGl0ZW0gPT0gbnVsbCkge1xuICAgICAgICAgICAgY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuX2xvYWRGcm9tU3RvcmFnZShwYXlsb2FkKTtcbiAgICAgICAgICAgIHJldHVybiB3YWl0Q2FjaGVBbmRTZW5kUmVzO1xuICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbSA9PT0gJ2xvYWRpbmcnIHx8IGl0ZW0gPT09ICdyZXF1ZXN0aW5nJyB8fCBpdGVtID09PSAnc2F2aW5nJykge1xuICAgICAgICAgICAgcmV0dXJuIHdhaXRDYWNoZUFuZFNlbmRSZXM7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGh0dHBQcm94eUxvZy5pbmZvKCdoaXQgY2FjaGVkJywgcGF5bG9hZC5rZXkpO1xuICAgICAgICAgICAgY29uc3QgdHJhbnNmb3JtZXIgPSBjYWNoZUNvbnRyb2xsZXIuZ2V0U3RhdGUoKS5jYWNoZVRyYW5zZm9ybWVyO1xuICAgICAgICAgICAgaWYgKHRyYW5zZm9ybWVyID09IG51bGwpIHtcbiAgICAgICAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBpdGVtLmhlYWRlcnMpIHtcbiAgICAgICAgICAgICAgICBwYXlsb2FkLnJlcy5zZXRIZWFkZXIoZW50cnlbMF0sIGVudHJ5WzFdKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBwYXlsb2FkLnJlcy5zdGF0dXMoaXRlbS5zdGF0dXNDb2RlKTtcbiAgICAgICAgICAgICAgcmV0dXJuIG5ldyByeC5PYnNlcnZhYmxlPHZvaWQ+KHN1YiA9PiB7XG4gICAgICAgICAgICAgICAgaXRlbS5ib2R5KClcbiAgICAgICAgICAgICAgICAub24oJ2VuZCcsICgpID0+IHtzdWIubmV4dCgpOyBzdWIuY29tcGxldGUoKTsgfSlcbiAgICAgICAgICAgICAgICAucGlwZShwYXlsb2FkLnJlcyk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gcnguZnJvbSh0cmFuc2Zvcm1lcihpdGVtLmhlYWRlcnMsIHBheWxvYWQucmVxLmhlYWRlcnMuaG9zdCwgaXRlbS5ib2R5KCkpKS5waXBlKFxuICAgICAgICAgICAgICBvcC50YWtlKDEpLFxuICAgICAgICAgICAgICBvcC5tZXJnZU1hcCgoe3JlYWRhYmxlLCBsZW5ndGh9KSA9PiB7XG4gICAgICAgICAgICAgICAgY29uc3QgbGVuZ3RoSGVhZGVySWR4ID0gaXRlbS5oZWFkZXJzLmZpbmRJbmRleChyb3cgPT4gcm93WzBdID09PSAnY29udGVudC1sZW5ndGgnKTtcbiAgICAgICAgICAgICAgICBpZiAobGVuZ3RoSGVhZGVySWR4ID49IDApXG4gICAgICAgICAgICAgICAgICBpdGVtLmhlYWRlcnNbbGVuZ3RoSGVhZGVySWR4XVsxXSA9ICcnICsgbGVuZ3RoO1xuICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgaXRlbS5oZWFkZXJzKSB7XG4gICAgICAgICAgICAgICAgICBwYXlsb2FkLnJlcy5zZXRIZWFkZXIoZW50cnlbMF0sIGVudHJ5WzFdKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcGF5bG9hZC5yZXMuc3RhdHVzKGl0ZW0uc3RhdHVzQ29kZSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIG5ldyByeC5PYnNlcnZhYmxlPHZvaWQ+KHN1YiA9PiB7XG4gICAgICAgICAgICAgICAgICByZWFkYWJsZSgpLm9uKCdlbmQnLCAoKSA9PiBzdWIuY29tcGxldGUoKSlcbiAgICAgICAgICAgICAgICAgICAgLnBpcGUocGF5bG9hZC5yZXMpXG4gICAgICAgICAgICAgICAgICAgIC5vbignZXJyb3InLCBlcnIgPT4gc3ViLmVycm9yKGVycikpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pLFxuICAgICAgICBvcC5jYXRjaEVycm9yKGVyciA9PiB7XG4gICAgICAgICAgaHR0cFByb3h5TG9nLmVycm9yKCdGYWlsZWQgdG8gd3JpdGUgcmVzcG9uc2UnLCBlcnIpO1xuICAgICAgICAgIHJldHVybiByeC5FTVBUWTtcbiAgICAgICAgfSlcbiAgICAgICksXG4gICAgICBhY3Rpb25zLl9sb2FkRnJvbVN0b3JhZ2UucGlwZShcbiAgICAgICAgb3AubWVyZ2VNYXAoYXN5bmMgKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBkaXIgPSBQYXRoLmpvaW4oY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCkuY2FjaGVEaXIsIHBheWxvYWQua2V5KTtcbiAgICAgICAgICAgIGNvbnN0IGhGaWxlID0gUGF0aC5qb2luKGRpciwgJ2hlYWRlci5qc29uJyk7XG4gICAgICAgICAgICBjb25zdCBiRmlsZSA9IFBhdGguam9pbihkaXIsICdib2R5Jyk7XG4gICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhoRmlsZSkpIHtcbiAgICAgICAgICAgICAgaHR0cFByb3h5TG9nLmluZm8oJ2xvYWQnLCBwYXlsb2FkLmtleSk7XG4gICAgICAgICAgICAgIGNvbnN0IHRyYW5zZm9ybWVyID0gY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCkuY2FjaGVUcmFuc2Zvcm1lcjtcbiAgICAgICAgICAgICAgaWYgKHRyYW5zZm9ybWVyID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXJzU3RyID0gYXdhaXQgZnMucHJvbWlzZXMucmVhZEZpbGUoaEZpbGUsICd1dGYtOCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHtzdGF0dXNDb2RlLCBoZWFkZXJzfSA9IEpTT04ucGFyc2UoaGVhZGVyc1N0cikgYXMge3N0YXR1c0NvZGU6IG51bWJlcjsgaGVhZGVyczogW3N0cmluZywgc3RyaW5nIHwgc3RyaW5nW11dW119O1xuXG4gICAgICAgICAgICAgICAgY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuX2RvbmUoe2tleTogcGF5bG9hZC5rZXksIHJlczogcGF5bG9hZC5yZXMsXG4gICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1c0NvZGUsXG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcnMsXG4gICAgICAgICAgICAgICAgICAgIGJvZHk6ICgpID0+IGZzLmNyZWF0ZVJlYWRTdHJlYW0oYkZpbGUpXG4gICAgICAgICAgICAgICAgICB9fSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgY29uc3QgaGVhZGVyc1N0ciA9IGF3YWl0IGZzLnByb21pc2VzLnJlYWRGaWxlKGhGaWxlLCAndXRmLTgnKTtcbiAgICAgICAgICAgICAgY29uc3Qge3N0YXR1c0NvZGUsIGhlYWRlcnN9ID0gSlNPTi5wYXJzZShoZWFkZXJzU3RyKSBhcyB7c3RhdHVzQ29kZTogbnVtYmVyOyBoZWFkZXJzOiBbc3RyaW5nLCBzdHJpbmcgfCBzdHJpbmdbXV1bXX07XG4gICAgICAgICAgICAgIGNvbnN0IHtyZWFkYWJsZSwgbGVuZ3RofSA9IGF3YWl0IHRyYW5zZm9ybWVyKGhlYWRlcnMsIHBheWxvYWQucmVxLmhlYWRlcnMuaG9zdCwgZnMuY3JlYXRlUmVhZFN0cmVhbShiRmlsZSkpO1xuICAgICAgICAgICAgICBjb25zdCBsZW5ndGhIZWFkZXJJZHggPSBoZWFkZXJzLmZpbmRJbmRleChyb3cgPT4gcm93WzBdID09PSAnY29udGVudC1sZW5ndGgnKTtcbiAgICAgICAgICAgICAgaWYgKGxlbmd0aEhlYWRlcklkeCA+PSAwKVxuICAgICAgICAgICAgICAgIGhlYWRlcnNbbGVuZ3RoSGVhZGVySWR4XVsxXSA9ICcnICsgbGVuZ3RoO1xuXG4gICAgICAgICAgICAgIGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyLl9kb25lKHtrZXk6IHBheWxvYWQua2V5LFxuICAgICAgICAgICAgICAgIHJlczogcGF5bG9hZC5yZXMsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgc3RhdHVzQ29kZSxcbiAgICAgICAgICAgICAgICAgIGhlYWRlcnMsXG4gICAgICAgICAgICAgICAgICBib2R5OiByZWFkYWJsZVxuICAgICAgICAgICAgICAgIH19KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGh0dHBQcm94eUxvZy5pbmZvKCdObyBleGlzdGluZyBmaWxlIGZvcicsIHBheWxvYWQua2V5KTtcbiAgICAgICAgICAgICAgY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuX3JlcXVlc3RSZW1vdGUocGF5bG9hZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgICAgIGh0dHBQcm94eUxvZy5lcnJvcignRmFpbGVkIHRvIHNhdmUgY2FjaGUgZm9yOiAnICsgcGF5bG9hZC5rZXksIGV4KTtcbiAgICAgICAgICAgIGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyLl9jbGVhbihwYXlsb2FkLmtleSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgKSxcbiAgICAgIGFjdGlvbnMuX3JlcXVlc3RSZW1vdGUucGlwZShcbiAgICAgICAgb3AubWVyZ2VNYXAoKHtwYXlsb2FkfSkgPT4gcngubWVyZ2UoXG4gICAgICAgICAgcngucmFjZShcbiAgICAgICAgICAgIHByb3h5UmVzJC5waXBlKFxuICAgICAgICAgICAgICBvcC5maWx0ZXIoKFssICwgcmVzXSkgPT4gcmVzID09PSBwYXlsb2FkLnJlcyksXG4gICAgICAgICAgICAgIG9wLnRha2UoMSksXG4gICAgICAgICAgICAgIG9wLm1lcmdlTWFwKChbcHJveHlSZXMsIG9yaWdSZXEsIHNlcnZlclJlc10pID0+IHtcbiAgICAgICAgICAgICAgICByZXR1cm4gcnguZGVmZXIoKCkgPT4gcmVxdWVzdGluZ1JlbW90ZShwYXlsb2FkLmtleSwgcGF5bG9hZC5yZXEuaGVhZGVycy5ob3N0LCBwcm94eVJlcywgc2VydmVyUmVzLFxuICAgICAgICAgICAgICAgICAgT2JqZWN0LmVudHJpZXMocHJveHlSZXMuaGVhZGVycylcbiAgICAgICAgICAgICAgICAgIC5maWx0ZXIoZW50cnkgPT4gZW50cnlbMV0gIT0gbnVsbCkgYXMgW3N0cmluZywgc3RyaW5nIHwgc3RyaW5nW11dW10pKVxuICAgICAgICAgICAgICAgIC5waXBlKFxuICAgICAgICAgICAgICAgICAgb3AudGltZW91dCgxNTAwMClcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgKSxcbiAgICAgICAgICAgIHByb3h5RXJyb3IkLnBpcGUoXG4gICAgICAgICAgICAgIG9wLmZpbHRlcigoW2Vyciwgb3JpZ1JlcSwgc2VydmVyUmVzXSkgPT4gc2VydmVyUmVzID09PSBwYXlsb2FkLnJlcyksXG4gICAgICAgICAgICAgIG9wLnRha2UoMSksXG4gICAgICAgICAgICAgIG9wLm1hcCgoW2Vycl0pID0+IHtcbiAgICAgICAgICAgICAgICBodHRwUHJveHlMb2cuZXJyb3IoJ0hQTSBlcnJvcicsIGVycik7XG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICApXG4gICAgICAgICAgKSxcbiAgICAgICAgICBwcm94eU1pZGRsZXdhcmUkLnBpcGUoXG4gICAgICAgICAgICBvcC50YWtlKDEpLFxuICAgICAgICAgICAgb3AubWFwKHByb3h5ID0+IHByb3h5KHBheWxvYWQucmVxLCBwYXlsb2FkLnJlcywgcGF5bG9hZC5uZXh0KSlcbiAgICAgICAgICApXG4gICAgICAgICkpXG4gICAgICApXG4gICAgKS5waXBlKFxuICAgICAgb3AuaWdub3JlRWxlbWVudHMoKSxcbiAgICAgIG9wLmNhdGNoRXJyb3IoKGVyciwgc3JjKSA9PiB7XG4gICAgICAgIGh0dHBQcm94eUxvZy5lcnJvcignSFRUUCBwcm94eSBjYWNoZSBlcnJvcicsIGVycik7XG4gICAgICAgIHJldHVybiBzcmM7XG4gICAgICB9KVxuICAgICk7XG4gIH0pO1xuXG4gIHJldHVybiBjYWNoZUNvbnRyb2xsZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBrZXlPZlVyaShtZXRob2Q6IHN0cmluZywgcGF0aDogc3RyaW5nKSB7XG4gIGNvbnN0IHVybCA9IG5ldyBVUkwoJ2h0dHA6Ly9mLmNvbScgKyBwYXRoKTtcbiAgY29uc3Qga2V5ID0gbWV0aG9kICsgdXJsLnBhdGhuYW1lICsgKHVybC5zZWFyY2ggPyAnLycgKyBfLnRyaW1TdGFydCh1cmwuc2VhcmNoLCAnPycpIDogJycpO1xuICByZXR1cm4ga2V5O1xufVxuIl19