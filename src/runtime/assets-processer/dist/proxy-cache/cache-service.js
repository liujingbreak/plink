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
const __plink_1 = __importDefault(require("__plink"));
const plink_1 = require("@wfh/plink");
const http_proxy_middleware_1 = require("http-proxy-middleware");
const tiny_redux_toolkit_1 = require("@wfh/redux-toolkit-observable/dist/tiny-redux-toolkit");
const utils_1 = require("../utils");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGUtc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNhY2hlLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGdEQUF3QjtBQUV4Qix3REFBMEI7QUFDMUIseUNBQTJCO0FBQzNCLG1EQUFxQztBQUNyQyxvREFBdUI7QUFFdkIsc0RBQTBCO0FBQzFCLHNDQUFvRDtBQUNwRCxpRUFBNkY7QUFDN0YsOEZBQW9HO0FBQ3BHLG9DQUEwRTtBQUcxRSxNQUFNLFlBQVksR0FBRyxjQUFNLENBQUMsU0FBUyxDQUFDLElBQUEsZ0JBQVEsRUFBQyxVQUFVLENBQUMsQ0FBQyxRQUFRLEdBQUcsWUFBWSxDQUFDLENBQUM7QUFFcEYsU0FBZ0Isb0JBQW9CLENBQUMsU0FBaUIsRUFBRSxTQUFpQixFQUFFLFlBQW9CLEVBQzlFLE9BQW1ELEVBQUMsTUFBTSxFQUFFLEtBQUssRUFBQzs7SUFDakYsTUFBTSxZQUFZLEdBQW9CO1FBQ3BDLDJEQUEyRDtRQUMzRCxRQUFRLEVBQUUsWUFBWTtRQUN0QixVQUFVLEVBQUUsSUFBSSxHQUFHLEVBQUU7UUFDckIsY0FBYyxFQUFFLElBQUksQ0FBQyxjQUFjLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYztLQUNyRixDQUFDO0lBRUYsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUU7UUFDaEIsaUJBQUcsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDdEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFFO2dCQUNwQyxNQUFNLEdBQUcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQzFDLGVBQWUsQ0FBQyxnQkFB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Q0FDRixFQUNELGdCQUFnQixDQUFDLElBQUksQ0FDbkIsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFDVixFQUFFLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FDL0QsQ0FDRixDQUFDLENBQ0gsQ0FDRixDQUFDLElBQUksQ0FDSixFQUFFLENBQUMsY0FBYyxFQUFFLEVBQ25CLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDekIsWUFBWSxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNsRCxPQUFPLEdBQUcsQ0FBQztRQUNiLENBQUMsQ0FBQyxDQUNILENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILE9BQU8sZUFBZSxDQUFDO0FBQ3pCLENBQUM7QUEvV0Qsb0RBK1dDO0FBRUQsU0FBZ0IsUUFBUSxDQUFDLE1BQWMsRUFBRSxJQUFZO0lBQ25ELE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUMzQyxNQUFNLEdBQUcsR0FBRyxNQUFNLEdBQUcsR0FBRyxDQUFDLFFBQVEsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxnQkFBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUMzRixPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUFKRCw0QkFJQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgSW5jb21pbmdNZXNzYWdlLCBTZXJ2ZXJSZXNwb25zZSB9IGZyb20gJ2h0dHAnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7UmVxdWVzdCwgUmVzcG9uc2UsIE5leHRGdW5jdGlvbn0gZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgYXBpIGZyb20gJ19fcGxpbmsnO1xuaW1wb3J0IHtsb2dnZXIsIGxvZzRGaWxlLCBjb25maWd9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IHsgY3JlYXRlUHJveHlNaWRkbGV3YXJlIGFzIHByb3h5LCBPcHRpb25zIGFzIEhwbU9wdGlvbnN9IGZyb20gJ2h0dHAtcHJveHktbWlkZGxld2FyZSc7XG5pbXBvcnQge2NyZWF0ZVNsaWNlLCBjYXN0QnlBY3Rpb25UeXBlfSBmcm9tICdAd2ZoL3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZS9kaXN0L3RpbnktcmVkdXgtdG9vbGtpdCc7XG5pbXBvcnQge2NyZWF0ZVJlcGxheVJlYWRhYmxlRmFjdG9yeSwgZGVmYXVsdFByb3h5T3B0aW9uc30gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHtQcm94eUNhY2hlU3RhdGUsIENhY2hlRGF0YX0gZnJvbSAnLi90eXBlcyc7XG5cbmNvbnN0IGh0dHBQcm94eUxvZyA9IGxvZ2dlci5nZXRMb2dnZXIobG9nNEZpbGUoX19maWxlbmFtZSkuY2F0ZWdvcnkgKyAnI2h0dHBQcm94eScpO1xuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUHJveHlXaXRoQ2FjaGUocHJveHlQYXRoOiBzdHJpbmcsIHRhcmdldFVybDogc3RyaW5nLCBjYWNoZVJvb3REaXI6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgb3B0czoge21hbnVhbDogYm9vbGVhbjsgbWVtQ2FjaGVMZW5ndGg/OiBudW1iZXJ9ID0ge21hbnVhbDogZmFsc2V9KSB7XG4gIGNvbnN0IGluaXRpYWxTdGF0ZTogUHJveHlDYWNoZVN0YXRlID0ge1xuICAgIC8vIHByb3h5T3B0aW9uczogZGVmYXVsdFByb3h5T3B0aW9ucyhwcm94eVBhdGgsIHRhcmdldFVybCksXG4gICAgY2FjaGVEaXI6IGNhY2hlUm9vdERpcixcbiAgICBjYWNoZUJ5VXJpOiBuZXcgTWFwKCksXG4gICAgbWVtQ2FjaGVMZW5ndGg6IG9wdHMubWVtQ2FjaGVMZW5ndGggPT0gbnVsbCA/IE51bWJlci5NQVhfVkFMVUUgOiBvcHRzLm1lbUNhY2hlTGVuZ3RoXG4gIH07XG5cbiAgaWYgKCFvcHRzLm1hbnVhbCkge1xuICAgIGFwaS5leHByZXNzQXBwU2V0KGFwcCA9PiB7XG4gICAgICBhcHAudXNlKHByb3h5UGF0aCwgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgICAgIGNvbnN0IGtleSA9IGtleU9mVXJpKHJlcS5tZXRob2QsIHJlcS51cmwpO1xuICAgICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5oaXRDYWNoZSh7a2V5LCByZXEsIHJlcywgbmV4dH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbiAgY29uc3QgY2FjaGVDb250cm9sbGVyID0gY3JlYXRlU2xpY2Uoe1xuICAgIGluaXRpYWxTdGF0ZSxcbiAgICBuYW1lOiBgSFRUUC1wcm94eS1jYWNoZS0ke3Byb3h5UGF0aH1gICxcbiAgICBkZWJ1Z0FjdGlvbk9ubHk6IGNvbmZpZygpLmNsaU9wdGlvbnM/LnZlcmJvc2UsXG4gICAgcmVkdWNlcnM6IHtcbiAgICAgIGNvbmZpZ3VyZVByb3h5KHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDogSHBtT3B0aW9ucykge1xuICAgICAgfSxcbiAgICAgIGNvbmZpZ1RyYW5zZm9ybWVyKHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDoge1xuICAgICAgICByZW1vdGU/OiBQcm94eUNhY2hlU3RhdGVbJ3Jlc3BvbnNlVHJhbnNmb3JtZXInXTtcbiAgICAgICAgY2FjaGVkPzogUHJveHlDYWNoZVN0YXRlWydjYWNoZVRyYW5zZm9ybWVyJ107XG4gICAgICB9KSB7XG4gICAgICAgIGlmIChwYXlsb2FkLnJlbW90ZSlcbiAgICAgICAgICBzLnJlc3BvbnNlVHJhbnNmb3JtZXIgPSBwYXlsb2FkLnJlbW90ZTtcbiAgICAgICAgaWYgKHBheWxvYWQuY2FjaGVkKVxuICAgICAgICAgIHMuY2FjaGVUcmFuc2Zvcm1lciA9IHBheWxvYWQuY2FjaGVkO1xuICAgICAgfSxcbiAgICAgIGhpdENhY2hlKHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDoge2tleTogc3RyaW5nOyByZXE6IFJlcXVlc3Q7IHJlczogUmVzcG9uc2U7IG5leHQ6IE5leHRGdW5jdGlvbn0pIHt9LFxuXG4gICAgICBfcmVxdWVzdFJlbW90ZURvbmUoczogUHJveHlDYWNoZVN0YXRlLCBwYXlsb2FkOiB7XG4gICAgICAgIGtleTogc3RyaW5nOyByZXFIb3N0OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIHJlczogU2VydmVyUmVzcG9uc2U7XG4gICAgICAgIGRhdGE6IHtoZWFkZXJzOiBDYWNoZURhdGFbJ2hlYWRlcnMnXTsgcmVhZGFibGU6IEluY29taW5nTWVzc2FnZX07XG4gICAgICB9KSB7fSxcblxuICAgICAgX2xvYWRGcm9tU3RvcmFnZShzOiBQcm94eUNhY2hlU3RhdGUsIHBheWxvYWQ6IHtrZXk6IHN0cmluZzsgcmVxOiBSZXF1ZXN0OyByZXM6IFJlc3BvbnNlOyBuZXh0OiBOZXh0RnVuY3Rpb259KSB7XG4gICAgICAgIHMuY2FjaGVCeVVyaS5zZXQocGF5bG9hZC5rZXksICdsb2FkaW5nJyk7XG4gICAgICB9LFxuXG4gICAgICBfcmVxdWVzdFJlbW90ZShzOiBQcm94eUNhY2hlU3RhdGUsIHBheWxvYWQ6IHtrZXk6IHN0cmluZzsgcmVxOiBSZXF1ZXN0OyByZXM6IFJlc3BvbnNlOyBuZXh0OiBOZXh0RnVuY3Rpb259KSB7XG4gICAgICAgIHMuY2FjaGVCeVVyaS5zZXQocGF5bG9hZC5rZXksICdyZXF1ZXN0aW5nJyk7XG4gICAgICB9LFxuICAgICAgX3NhdmluZ0ZpbGUoczogUHJveHlDYWNoZVN0YXRlLCBwYXlsb2FkOiB7XG4gICAgICAgIGtleTogc3RyaW5nO1xuICAgICAgICByZXM6IFNlcnZlclJlc3BvbnNlO1xuICAgICAgICBkYXRhOiBDYWNoZURhdGE7XG4gICAgICB9KSB7XG4gICAgICAgIHMuY2FjaGVCeVVyaS5zZXQocGF5bG9hZC5rZXksICdzYXZpbmcnKTtcbiAgICAgIH0sXG4gICAgICBfZG9uZShzOiBQcm94eUNhY2hlU3RhdGUsIHBheWxvYWQ6IHtcbiAgICAgICAga2V5OiBzdHJpbmc7XG4gICAgICAgIHJlczogU2VydmVyUmVzcG9uc2U7XG4gICAgICAgIGRhdGE6IENhY2hlRGF0YTtcbiAgICAgIH0pIHtcbiAgICAgICAgcy5jYWNoZUJ5VXJpLmRlbGV0ZShwYXlsb2FkLmtleSk7XG4gICAgICAgIC8vIGlmIChwYXlsb2FkLmRhdGEuc3RhdHVzQ29kZSAhPT0gMzA0KSB7XG4gICAgICAgIC8vICAgaWYgKHMuY2FjaGVCeVVyaS5zaXplID49IHMubWVtQ2FjaGVMZW5ndGgpIHtcbiAgICAgICAgLy8gICAgIC8vIFRPRE86IGltcHJvdmUgZm9yIExSVSBhbGdvcmlndGhtXG4gICAgICAgIC8vICAgICBzLmNhY2hlQnlVcmkuZGVsZXRlKHBheWxvYWQua2V5KTtcbiAgICAgICAgLy8gICAgIHJldHVybjtcbiAgICAgICAgLy8gICB9XG4gICAgICAgIC8vICAgcy5jYWNoZUJ5VXJpLnNldChwYXlsb2FkLmtleSwgcGF5bG9hZC5kYXRhKTtcbiAgICAgICAgLy8gfVxuICAgICAgfSxcbiAgICAgIF9jbGVhbihzOiBQcm94eUNhY2hlU3RhdGUsIGtleTogc3RyaW5nKSB7XG4gICAgICAgIHMuY2FjaGVCeVVyaS5kZWxldGUoa2V5KTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIGNhY2hlQ29udHJvbGxlci5lcGljKGFjdGlvbiQgPT4ge1xuICAgIGNvbnN0IGRlZmF1bHRQcm94eU9wdCA9IGRlZmF1bHRQcm94eU9wdGlvbnMocHJveHlQYXRoLCB0YXJnZXRVcmwpO1xuICAgIGNvbnN0IHByb3h5RXJyb3IkID0gbmV3IHJ4LlN1YmplY3Q8UGFyYW1ldGVyczwodHlwZW9mIGRlZmF1bHRQcm94eU9wdClbJ29uRXJyb3InXT4+KCk7XG4gICAgY29uc3QgcHJveHlSZXMkID0gbmV3IHJ4LlN1YmplY3Q8UGFyYW1ldGVyczwodHlwZW9mIGRlZmF1bHRQcm94eU9wdClbJ29uUHJveHlSZXMnXT4+KCk7XG5cbiAgICBsZXQgcHJveHlNaWRkbGV3YXJlJCA9IG5ldyByeC5SZXBsYXlTdWJqZWN0PFJldHVyblR5cGU8dHlwZW9mIHByb3h5Pj4oMSk7XG4gICAgY29uc3QgYWN0aW9ucyA9IGNhc3RCeUFjdGlvblR5cGUoY2FjaGVDb250cm9sbGVyLmFjdGlvbnMsIGFjdGlvbiQpO1xuXG4gICAgYXN5bmMgZnVuY3Rpb24gcmVxdWVzdGluZ1JlbW90ZShrZXk6IHN0cmluZywgcmVxSG9zdDogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJveHlSZXM6IEluY29taW5nTWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlczogU2VydmVyUmVzcG9uc2UsIGhlYWRlcnM6IFtzdHJpbmcsIHN0cmluZyB8IHN0cmluZ1tdXVtdKSB7XG4gICAgICBodHRwUHJveHlMb2cuZGVidWcoJ2NhY2hlIHNpemU6JywgY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCkuY2FjaGVCeVVyaS5zaXplKTtcbiAgICAgIGNvbnN0IGRpciA9IFBhdGguam9pbihjYWNoZUNvbnRyb2xsZXIuZ2V0U3RhdGUoKS5jYWNoZURpciwga2V5KTtcbiAgICAgIGNvbnN0IGZpbGUgPSBQYXRoLmpvaW4oZGlyLCAnYm9keScpO1xuICAgICAgY29uc3Qgc3RhdHVzQ29kZSA9IHByb3h5UmVzLnN0YXR1c0NvZGUgfHwgMjAwO1xuICAgICAgY29uc3Qge3Jlc3BvbnNlVHJhbnNmb3JtZXJ9ID0gY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCk7XG4gICAgICBpZiAoc3RhdHVzQ29kZSA9PT0gMzA0KSB7XG4gICAgICAgIGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyLl9kb25lKHtrZXksIHJlcywgZGF0YToge1xuICAgICAgICAgICAgc3RhdHVzQ29kZSwgaGVhZGVycywgYm9keTogY3JlYXRlUmVwbGF5UmVhZGFibGVGYWN0b3J5KHByb3h5UmVzKVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGh0dHBQcm94eUxvZy53YXJuKCdWZXJzaW9uIGluZm8gaXMgbm90IHJlY29yZGVkLCBkdWUgdG8gcmVzcG9uc2UgMzA0IGZyb20nLCByZXMucmVxLnVybCwgJyxcXG4geW91IGNhbiByZW1vdmUgZXhpc3RpbmcgbnBtL2NhY2hlIGNhY2hlIHRvIGF2b2lkIDMwNCcpO1xuICAgICAgICByZXR1cm4gcnguRU1QVFk7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZXNwb25zZVRyYW5zZm9ybWVyID09IG51bGwpIHtcbiAgICAgICAgY29uc3QgZG9uZU1rZGlyID0gZnMubWtkaXJwKGRpcik7XG4gICAgICAgIGNvbnN0IHJlYWRhYmxlRmFjID0gY3JlYXRlUmVwbGF5UmVhZGFibGVGYWN0b3J5KHByb3h5UmVzLCB1bmRlZmluZWQsXG4gICAgICAgICAge2RlYnVnSW5mbzoga2V5LCBleHBlY3RMZW46IHBhcnNlSW50KHByb3h5UmVzLmhlYWRlcnNbJ2NvbnRlbnQtbGVuZ3RoJ10gYXMgc3RyaW5nLCAxMCl9KTtcbiAgICAgICAgIC8vIGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyLl9kb25lKHtrZXksIGRhdGE6IHtcbiAgICAgICAgIC8vICAgICAgIHN0YXR1c0NvZGUsIGhlYWRlcnMsIGJvZHk6ICgpID0+IHByb3h5UmVzXG4gICAgICAgICAvLyAgICAgfSwgcmVzXG4gICAgICAgICAvLyAgIH0pO1xuICAgICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fc2F2aW5nRmlsZSh7a2V5LCBkYXRhOiB7XG4gICAgICAgICAgICBzdGF0dXNDb2RlLCBoZWFkZXJzLCBib2R5OiByZWFkYWJsZUZhY1xuICAgICAgICAgIH0sIHJlc1xuICAgICAgICB9KTtcbiAgICAgICAgYXdhaXQgZG9uZU1rZGlyO1xuICAgICAgICB2b2lkIGZzLnByb21pc2VzLndyaXRlRmlsZShcbiAgICAgICAgICBQYXRoLmpvaW4oZGlyLCAnaGVhZGVyLmpzb24nKSxcbiAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHtzdGF0dXNDb2RlLCBoZWFkZXJzfSwgbnVsbCwgJyAgJyksXG4gICAgICAgICAgJ3V0Zi04Jyk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiByZWFkYWJsZUZhYygpXG4gICAgICAgICAgICAucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbShmaWxlKSlcbiAgICAgICAgICAgIC5vbignZmluaXNoJywgcmVzb2x2ZSlcbiAgICAgICAgICAgIC5vbignZXJyb3InLCByZWplY3QpKTtcblxuICAgICAgICAgIGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyLl9kb25lKHtrZXksIGRhdGE6IHtcbiAgICAgICAgICAgICAgc3RhdHVzQ29kZSwgaGVhZGVycywgYm9keTogcmVhZGFibGVGYWNcbiAgICAgICAgICAgIH0sIHJlc1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgaHR0cFByb3h5TG9nLmluZm8oYHJlc3BvbnNlIGlzIHdyaXR0ZW4gdG8gKGxlbmd0aDogJHtoZWFkZXJzLmZpbmQoaXRlbSA9PiBpdGVtWzBdID09PSAnY29udGVudC1sZW5ndGgnKSFbMV0gYXMgc3RyaW5nfSlgLFxuICAgICAgICAgICAgUGF0aC5wb3NpeC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBmaWxlKSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBodHRwUHJveHlMb2cuZXJyb3IoJ0ZhaWxlZCB0byB3cml0ZSBjYWNoZSBmaWxlICcgK1xuICAgICAgICAgICAgUGF0aC5wb3NpeC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBmaWxlKSwgZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAocmVxSG9zdCAmJiAhcmVxSG9zdC5zdGFydHNXaXRoKCdodHRwJykpIHtcbiAgICAgICAgcmVxSG9zdCA9ICdodHRwOi8vJyArIHJlcUhvc3Q7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHtyZWFkYWJsZTogdHJhbnNmb3JtZWQsIGxlbmd0aH0gPSBhd2FpdCByZXNwb25zZVRyYW5zZm9ybWVyKGhlYWRlcnMsIHJlcUhvc3QsIHByb3h5UmVzKTtcbiAgICAgIGNvbnN0IGxlbmd0aEhlYWRlcklkeCA9IGhlYWRlcnMuZmluZEluZGV4KHJvdyA9PiByb3dbMF0gPT09ICdjb250ZW50LWxlbmd0aCcpO1xuICAgICAgaWYgKGxlbmd0aEhlYWRlcklkeCA+PSAwKVxuICAgICAgICBoZWFkZXJzW2xlbmd0aEhlYWRlcklkeF1bMV0gPSAnJyArIGxlbmd0aDtcblxuICAgICAgY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuX3NhdmluZ0ZpbGUoe2tleSwgcmVzLCBkYXRhOiB7XG4gICAgICAgICAgc3RhdHVzQ29kZSwgaGVhZGVycywgYm9keTogdHJhbnNmb3JtZWRcbiAgICAgIH0gfSk7XG5cbiAgICAgIGF3YWl0IGZzLm1rZGlycChkaXIpO1xuICAgICAgdm9pZCBmcy5wcm9taXNlcy53cml0ZUZpbGUoXG4gICAgICAgIFBhdGguam9pbihkaXIsICdoZWFkZXIuanNvbicpLFxuICAgICAgICBKU09OLnN0cmluZ2lmeSh7c3RhdHVzQ29kZSwgaGVhZGVyc30sIG51bGwsICcgICcpLFxuICAgICAgICAndXRmLTgnKTtcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHRyYW5zZm9ybWVkKClcbiAgICAgICAgLm9uKCdlbmQnLCByZXNvbHZlKVxuICAgICAgICAucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbShmaWxlKSlcbiAgICAgICAgLm9uKCdlcnJvcicsIHJlamVjdCkpO1xuXG4gICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fZG9uZSh7a2V5LCByZXMsIGRhdGE6IHtcbiAgICAgICAgICBzdGF0dXNDb2RlLCBoZWFkZXJzLCBib2R5OiB0cmFuc2Zvcm1lZFxuICAgICAgfSB9KTtcbiAgICAgIGh0dHBQcm94eUxvZy5pbmZvKCd3cml0ZSByZXNwb25zZSB0byBmaWxlJywgUGF0aC5wb3NpeC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBmaWxlKSwgJ3NpemUnLCBsZW5ndGgpO1xuICAgIH1cblxuICAgIHJldHVybiByeC5tZXJnZShcbiAgICAgIGFjdGlvbnMuY29uZmlndXJlUHJveHkucGlwZShcbiAgICAgICAgb3AubWFwKCh7cGF5bG9hZDogZXh0cmFPcHR9KSA9PiB7XG4gICAgICAgICAgcHJveHlNaWRkbGV3YXJlJC5uZXh0KHByb3h5KHtcbiAgICAgICAgICAgIC4uLmRlZmF1bHRQcm94eU9wdCxcbiAgICAgICAgICAgIGZvbGxvd1JlZGlyZWN0czogdHJ1ZSxcbiAgICAgICAgICAgIC4uLmV4dHJhT3B0LFxuICAgICAgICAgICAgb25Qcm94eVJlcyguLi5hcmdzKSB7XG4gICAgICAgICAgICAgIHByb3h5UmVzJC5uZXh0KGFyZ3MpO1xuICAgICAgICAgICAgICBkZWZhdWx0UHJveHlPcHQub25Qcm94eVJlcyguLi5hcmdzKTtcbiAgICAgICAgICAgICAgaWYgKGV4dHJhT3B0Lm9uUHJveHlSZXMpXG4gICAgICAgICAgICAgICAgZXh0cmFPcHQub25Qcm94eVJlcyguLi5hcmdzKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKC4uLmFyZ3MpIHtcbiAgICAgICAgICAgICAgZGVmYXVsdFByb3h5T3B0Lm9uRXJyb3IoLi4uYXJncyk7XG4gICAgICAgICAgICAgIHByb3h5RXJyb3IkLm5leHQoYXJncyk7XG4gICAgICAgICAgICAgIGlmIChleHRyYU9wdC5vbkVycm9yKVxuICAgICAgICAgICAgICAgIGV4dHJhT3B0Lm9uRXJyb3IoLi4uYXJncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9KVxuICAgICAgKSxcbiAgICAgIGFjdGlvbnMuaGl0Q2FjaGUucGlwZShcbiAgICAgICAgb3AubWVyZ2VNYXAoICh7cGF5bG9hZH0pID0+IHtcbiAgICAgICAgICBjb25zdCB3YWl0Q2FjaGVBbmRTZW5kUmVzID0gcngucmFjZShhY3Rpb25zLl9kb25lLCBhY3Rpb25zLl9zYXZpbmdGaWxlKS5waXBlKFxuICAgICAgICAgICAgb3AuZmlsdGVyKGFjdGlvbiA9PiBhY3Rpb24ucGF5bG9hZC5rZXkgPT09IHBheWxvYWQua2V5KSwgLy8gSW4gY2FzZSBpdCBpcyBvZiByZWRpcmVjdGVkIHJlcXVlc3QsIEhQTSBoYXMgZG9uZSBwaXBpbmcgcmVzcG9uc2UgKGlnbm9yZWQgXCJtYW51YWwgcmVwb25zZVwiIHNldHRpbmcpXG4gICAgICAgICAgICBvcC50YWtlKDEpLFxuICAgICAgICAgICAgb3AubWVyZ2VNYXAoKHtwYXlsb2FkOiB7a2V5LCByZXMsIGRhdGF9fSkgPT4ge1xuICAgICAgICAgICAgICBpZiAocmVzLndyaXRhYmxlRW5kZWQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Jlc3BvbnNlIGlzIGVuZGVkIGVhcmx5LCB3aHk/Jyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBkYXRhLmhlYWRlcnMpIHtcbiAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKGVudHJ5WzBdLCBlbnRyeVsxXSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSBkYXRhLnN0YXR1c0NvZGU7XG4gICAgICAgICAgICAgIGh0dHBQcm94eUxvZy5pbmZvKCdyZXBseSB0bycsIHBheWxvYWQua2V5KTtcbiAgICAgICAgICAgICAgY29uc3QgcGlwZUV2ZW50JCA9IG5ldyByeC5TdWJqZWN0PHN0cmluZz4oKTtcbiAgICAgICAgICAgICAgcmVzLm9uKCdmaW5pc2gnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgcGlwZUV2ZW50JC5uZXh0KCdmaW5pc2gnKTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgLm9uKCdjbG9zZScsICgpID0+IHtcbiAgICAgICAgICAgICAgICBwaXBlRXZlbnQkLm5leHQoJ2Nsb3NlJyk7XG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIC5vbignZXJyb3InLCBlcnIgPT4gcGlwZUV2ZW50JC5lcnJvcihlcnIpKTtcblxuICAgICAgICAgICAgICBkYXRhLmJvZHkoKS5waXBlKHJlcyk7XG4gICAgICAgICAgICAgIHJldHVybiBwaXBlRXZlbnQkLnBpcGUoXG4gICAgICAgICAgICAgICAgb3AuZmlsdGVyKGV2ZW50ID0+IGV2ZW50ID09PSAnZmluaXNoJyB8fCBldmVudCA9PT0gJ2Nsb3NlJyksXG4gICAgICAgICAgICAgICAgb3AudGFwKGV2ZW50ID0+IHtcbiAgICAgICAgICAgICAgICAgIGlmIChldmVudCA9PT0gJ2Nsb3NlJylcbiAgICAgICAgICAgICAgICAgICAgaHR0cFByb3h5TG9nLmVycm9yKCdSZXNwb25zZSBjb25uZWN0aW9uIGlzIGNsb3NlZCBlYXJseScpO1xuICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgIG9wLnRha2UoMSksXG4gICAgICAgICAgICAgICAgb3AubWFwVG8oa2V5KSxcbiAgICAgICAgICAgICAgICBvcC50aW1lb3V0KDEyMDAwMCksXG4gICAgICAgICAgICAgICAgb3AuY2F0Y2hFcnJvcihlcnIgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKCFyZXMuaGVhZGVyc1NlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIHJldHVybiByeC5FTVBUWTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBvcC5tYXAoa2V5ID0+IGh0dHBQcm94eUxvZy5pbmZvKGByZXBsaWVkOiAke2tleX1gKSlcbiAgICAgICAgICApO1xuICAgICAgICAgIGNvbnN0IGl0ZW0gPSBjYWNoZUNvbnRyb2xsZXIuZ2V0U3RhdGUoKS5jYWNoZUJ5VXJpLmdldChwYXlsb2FkLmtleSk7XG4gICAgICAgICAgaHR0cFByb3h5TG9nLmluZm8oJ2hpdENhY2hlIGZvciAnICsgcGF5bG9hZC5rZXkgKyAnLCcgKyBpdGVtKTtcbiAgICAgICAgICBpZiAoaXRlbSA9PSBudWxsKSB7XG4gICAgICAgICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fbG9hZEZyb21TdG9yYWdlKHBheWxvYWQpO1xuICAgICAgICAgICAgcmV0dXJuIHdhaXRDYWNoZUFuZFNlbmRSZXM7XG4gICAgICAgICAgfSBlbHNlIGlmIChpdGVtID09PSAnbG9hZGluZycgfHwgaXRlbSA9PT0gJ3JlcXVlc3RpbmcnIHx8IGl0ZW0gPT09ICdzYXZpbmcnKSB7XG4gICAgICAgICAgICByZXR1cm4gd2FpdENhY2hlQW5kU2VuZFJlcztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaHR0cFByb3h5TG9nLmluZm8oJ2hpdCBjYWNoZWQnLCBwYXlsb2FkLmtleSk7XG4gICAgICAgICAgICBjb25zdCB0cmFuc2Zvcm1lciA9IGNhY2hlQ29udHJvbGxlci5nZXRTdGF0ZSgpLmNhY2hlVHJhbnNmb3JtZXI7XG4gICAgICAgICAgICBpZiAodHJhbnNmb3JtZXIgPT0gbnVsbCkge1xuICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGl0ZW0uaGVhZGVycykge1xuICAgICAgICAgICAgICAgIHBheWxvYWQucmVzLnNldEhlYWRlcihlbnRyeVswXSwgZW50cnlbMV0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHBheWxvYWQucmVzLnN0YXR1cyhpdGVtLnN0YXR1c0NvZGUpO1xuICAgICAgICAgICAgICByZXR1cm4gbmV3IHJ4Lk9ic2VydmFibGU8dm9pZD4oc3ViID0+IHtcbiAgICAgICAgICAgICAgICBpdGVtLmJvZHkoKVxuICAgICAgICAgICAgICAgIC5vbignZW5kJywgKCkgPT4ge3N1Yi5uZXh0KCk7IHN1Yi5jb21wbGV0ZSgpOyB9KVxuICAgICAgICAgICAgICAgIC5waXBlKHBheWxvYWQucmVzKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiByeC5mcm9tKHRyYW5zZm9ybWVyKGl0ZW0uaGVhZGVycywgcGF5bG9hZC5yZXEuaGVhZGVycy5ob3N0LCBpdGVtLmJvZHkoKSkpLnBpcGUoXG4gICAgICAgICAgICAgIG9wLnRha2UoMSksXG4gICAgICAgICAgICAgIG9wLm1lcmdlTWFwKCh7cmVhZGFibGUsIGxlbmd0aH0pID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBsZW5ndGhIZWFkZXJJZHggPSBpdGVtLmhlYWRlcnMuZmluZEluZGV4KHJvdyA9PiByb3dbMF0gPT09ICdjb250ZW50LWxlbmd0aCcpO1xuICAgICAgICAgICAgICAgIGlmIChsZW5ndGhIZWFkZXJJZHggPj0gMClcbiAgICAgICAgICAgICAgICAgIGl0ZW0uaGVhZGVyc1tsZW5ndGhIZWFkZXJJZHhdWzFdID0gJycgKyBsZW5ndGg7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBpdGVtLmhlYWRlcnMpIHtcbiAgICAgICAgICAgICAgICAgIHBheWxvYWQucmVzLnNldEhlYWRlcihlbnRyeVswXSwgZW50cnlbMV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwYXlsb2FkLnJlcy5zdGF0dXMoaXRlbS5zdGF0dXNDb2RlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IHJ4Lk9ic2VydmFibGU8dm9pZD4oc3ViID0+IHtcbiAgICAgICAgICAgICAgICAgIHJlYWRhYmxlKCkub24oJ2VuZCcsICgpID0+IHN1Yi5jb21wbGV0ZSgpKVxuICAgICAgICAgICAgICAgICAgICAucGlwZShwYXlsb2FkLnJlcylcbiAgICAgICAgICAgICAgICAgICAgLm9uKCdlcnJvcicsIGVyciA9PiBzdWIuZXJyb3IoZXJyKSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfSksXG4gICAgICAgIG9wLmNhdGNoRXJyb3IoZXJyID0+IHtcbiAgICAgICAgICBodHRwUHJveHlMb2cuZXJyb3IoJ0ZhaWxlZCB0byB3cml0ZSByZXNwb25zZScsIGVycik7XG4gICAgICAgICAgcmV0dXJuIHJ4LkVNUFRZO1xuICAgICAgICB9KVxuICAgICAgKSxcbiAgICAgIGFjdGlvbnMuX2xvYWRGcm9tU3RvcmFnZS5waXBlKFxuICAgICAgICBvcC5tZXJnZU1hcChhc3luYyAoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGRpciA9IFBhdGguam9pbihjYWNoZUNvbnRyb2xsZXIuZ2V0U3RhdGUoKS5jYWNoZURpciwgcGF5bG9hZC5rZXkpO1xuICAgICAgICAgICAgY29uc3QgaEZpbGUgPSBQYXRoLmpvaW4oZGlyLCAnaGVhZGVyLmpzb24nKTtcbiAgICAgICAgICAgIGNvbnN0IGJGaWxlID0gUGF0aC5qb2luKGRpciwgJ2JvZHknKTtcbiAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKGhGaWxlKSkge1xuICAgICAgICAgICAgICBodHRwUHJveHlMb2cuaW5mbygnbG9hZCcsIHBheWxvYWQua2V5KTtcbiAgICAgICAgICAgICAgY29uc3QgdHJhbnNmb3JtZXIgPSBjYWNoZUNvbnRyb2xsZXIuZ2V0U3RhdGUoKS5jYWNoZVRyYW5zZm9ybWVyO1xuICAgICAgICAgICAgICBpZiAodHJhbnNmb3JtZXIgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlcnNTdHIgPSBhd2FpdCBmcy5wcm9taXNlcy5yZWFkRmlsZShoRmlsZSwgJ3V0Zi04Jyk7XG4gICAgICAgICAgICAgICAgY29uc3Qge3N0YXR1c0NvZGUsIGhlYWRlcnN9ID0gSlNPTi5wYXJzZShoZWFkZXJzU3RyKSBhcyB7c3RhdHVzQ29kZTogbnVtYmVyOyBoZWFkZXJzOiBbc3RyaW5nLCBzdHJpbmcgfCBzdHJpbmdbXV1bXX07XG5cbiAgICAgICAgICAgICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fZG9uZSh7a2V5OiBwYXlsb2FkLmtleSwgcmVzOiBwYXlsb2FkLnJlcyxcbiAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzQ29kZSxcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVycyxcbiAgICAgICAgICAgICAgICAgICAgYm9keTogKCkgPT4gZnMuY3JlYXRlUmVhZFN0cmVhbShiRmlsZSlcbiAgICAgICAgICAgICAgICAgIH19KTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBjb25zdCBoZWFkZXJzU3RyID0gYXdhaXQgZnMucHJvbWlzZXMucmVhZEZpbGUoaEZpbGUsICd1dGYtOCcpO1xuICAgICAgICAgICAgICBjb25zdCB7c3RhdHVzQ29kZSwgaGVhZGVyc30gPSBKU09OLnBhcnNlKGhlYWRlcnNTdHIpIGFzIHtzdGF0dXNDb2RlOiBudW1iZXI7IGhlYWRlcnM6IFtzdHJpbmcsIHN0cmluZyB8IHN0cmluZ1tdXVtdfTtcbiAgICAgICAgICAgICAgY29uc3Qge3JlYWRhYmxlLCBsZW5ndGh9ID0gYXdhaXQgdHJhbnNmb3JtZXIoaGVhZGVycywgcGF5bG9hZC5yZXEuaGVhZGVycy5ob3N0LCBmcy5jcmVhdGVSZWFkU3RyZWFtKGJGaWxlKSk7XG4gICAgICAgICAgICAgIGNvbnN0IGxlbmd0aEhlYWRlcklkeCA9IGhlYWRlcnMuZmluZEluZGV4KHJvdyA9PiByb3dbMF0gPT09ICdjb250ZW50LWxlbmd0aCcpO1xuICAgICAgICAgICAgICBpZiAobGVuZ3RoSGVhZGVySWR4ID49IDApXG4gICAgICAgICAgICAgICAgaGVhZGVyc1tsZW5ndGhIZWFkZXJJZHhdWzFdID0gJycgKyBsZW5ndGg7XG5cbiAgICAgICAgICAgICAgY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuX2RvbmUoe2tleTogcGF5bG9hZC5rZXksXG4gICAgICAgICAgICAgICAgcmVzOiBwYXlsb2FkLnJlcyxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICBzdGF0dXNDb2RlLFxuICAgICAgICAgICAgICAgICAgaGVhZGVycyxcbiAgICAgICAgICAgICAgICAgIGJvZHk6IHJlYWRhYmxlXG4gICAgICAgICAgICAgICAgfX0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgaHR0cFByb3h5TG9nLmluZm8oJ05vIGV4aXN0aW5nIGZpbGUgZm9yJywgcGF5bG9hZC5rZXkpO1xuICAgICAgICAgICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fcmVxdWVzdFJlbW90ZShwYXlsb2FkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICAgICAgaHR0cFByb3h5TG9nLmVycm9yKCdGYWlsZWQgdG8gc2F2ZSBjYWNoZSBmb3I6ICcgKyBwYXlsb2FkLmtleSwgZXgpO1xuICAgICAgICAgICAgY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuX2NsZWFuKHBheWxvYWQua2V5KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICApLFxuICAgICAgYWN0aW9ucy5fcmVxdWVzdFJlbW90ZS5waXBlKFxuICAgICAgICBvcC5tZXJnZU1hcCgoe3BheWxvYWR9KSA9PiByeC5tZXJnZShcbiAgICAgICAgICByeC5yYWNlKFxuICAgICAgICAgICAgcHJveHlSZXMkLnBpcGUoXG4gICAgICAgICAgICAgIG9wLmZpbHRlcigoWywgLCByZXNdKSA9PiByZXMgPT09IHBheWxvYWQucmVzKSxcbiAgICAgICAgICAgICAgb3AudGFrZSgxKSxcbiAgICAgICAgICAgICAgb3AubWVyZ2VNYXAoKFtwcm94eVJlcywgb3JpZ1JlcSwgc2VydmVyUmVzXSkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiByeC5kZWZlcigoKSA9PiByZXF1ZXN0aW5nUmVtb3RlKHBheWxvYWQua2V5LCBwYXlsb2FkLnJlcS5oZWFkZXJzLmhvc3QsIHByb3h5UmVzLCBzZXJ2ZXJSZXMsXG4gICAgICAgICAgICAgICAgICBPYmplY3QuZW50cmllcyhwcm94eVJlcy5oZWFkZXJzKVxuICAgICAgICAgICAgICAgICAgLmZpbHRlcihlbnRyeSA9PiBlbnRyeVsxXSAhPSBudWxsKSBhcyBbc3RyaW5nLCBzdHJpbmcgfCBzdHJpbmdbXV1bXSkpXG4gICAgICAgICAgICAgICAgLnBpcGUoXG4gICAgICAgICAgICAgICAgICBvcC50aW1lb3V0KDE1MDAwKVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICApLFxuICAgICAgICAgICAgcHJveHlFcnJvciQucGlwZShcbiAgICAgICAgICAgICAgb3AuZmlsdGVyKChbZXJyLCBvcmlnUmVxLCBzZXJ2ZXJSZXNdKSA9PiBzZXJ2ZXJSZXMgPT09IHBheWxvYWQucmVzKSxcbiAgICAgICAgICAgICAgb3AudGFrZSgxKSxcbiAgICAgICAgICAgICAgb3AubWFwKChbZXJyXSkgPT4ge1xuICAgICAgICAgICAgICAgIGh0dHBQcm94eUxvZy5lcnJvcignSFBNIGVycm9yJywgZXJyKTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIClcbiAgICAgICAgICApLFxuICAgICAgICAgIHByb3h5TWlkZGxld2FyZSQucGlwZShcbiAgICAgICAgICAgIG9wLnRha2UoMSksXG4gICAgICAgICAgICBvcC5tYXAocHJveHkgPT4gcHJveHkocGF5bG9hZC5yZXEsIHBheWxvYWQucmVzLCBwYXlsb2FkLm5leHQpKVxuICAgICAgICAgIClcbiAgICAgICAgKSlcbiAgICAgIClcbiAgICApLnBpcGUoXG4gICAgICBvcC5pZ25vcmVFbGVtZW50cygpLFxuICAgICAgb3AuY2F0Y2hFcnJvcigoZXJyLCBzcmMpID0+IHtcbiAgICAgICAgaHR0cFByb3h5TG9nLmVycm9yKCdIVFRQIHByb3h5IGNhY2hlIGVycm9yJywgZXJyKTtcbiAgICAgICAgcmV0dXJuIHNyYztcbiAgICAgIH0pXG4gICAgKTtcbiAgfSk7XG5cbiAgcmV0dXJuIGNhY2hlQ29udHJvbGxlcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGtleU9mVXJpKG1ldGhvZDogc3RyaW5nLCBwYXRoOiBzdHJpbmcpIHtcbiAgY29uc3QgdXJsID0gbmV3IFVSTCgnaHR0cDovL2YuY29tJyArIHBhdGgpO1xuICBjb25zdCBrZXkgPSBtZXRob2QgKyB1cmwucGF0aG5hbWUgKyAodXJsLnNlYXJjaCA/ICcvJyArIF8udHJpbVN0YXJ0KHVybC5zZWFyY2gsICc/JykgOiAnJyk7XG4gIHJldHVybiBrZXk7XG59XG4iXX0=