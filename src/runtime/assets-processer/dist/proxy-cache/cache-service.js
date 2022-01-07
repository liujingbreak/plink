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
const REDIRECT_STATUS = new Map([301, 302, 307, 308].map(code => [code, code]));
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
            var _a;
            proxyMiddleware$.next((0, http_proxy_middleware_1.createProxyMiddleware)(Object.assign(Object.assign(Object.assign(Object.assign({}, defaultProxyOpt), { followRedirects: true, logLevel: ((_a = (0, plink_1.config)().cliOptions) === null || _a === void 0 ? void 0 : _a.verbose) ? 'debug' :
                    'info', proxyTimeout: 20000 }), extraOpt), { onProxyRes(...args) {
                    if (REDIRECT_STATUS.has(args[0].statusCode || 200)) {
                        httpProxyLog.info('skip redirected response');
                        return;
                    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGUtc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNhY2hlLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGdEQUF3QjtBQUV4Qix3REFBMEI7QUFDMUIseUNBQTJCO0FBQzNCLG1EQUFxQztBQUNyQyxvREFBdUI7QUFFdkIsc0RBQTBCO0FBQzFCLHNDQUFvRDtBQUNwRCxpRUFBNkY7QUFDN0YsOEZBQW9HO0FBQ3BHLG9DQUEwRTtBQUcxRSxNQUFNLFlBQVksR0FBRyxjQUFNLENBQUMsU0FBUyxDQUFDLElBQUEsZ0JBQVEsRUFBQyxVQUFVLENBQUMsQ0FBQyxRQUFRLEdBQUcsWUFBWSxDQUFDLENBQUM7QUFDcEYsTUFBTSxlQUFlLEdBQUcsSUFBSSxHQUFHLENBQWlCLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBRWhHLFNBQWdCLG9CQUFvQixDQUFDLFNBQWlCLEVBQUUsU0FBaUIsRUFBRSxZQUFvQixFQUM5RSxPQUFtRCxFQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUM7O0lBQ2pGLE1BQU0sWUFBWSxHQUFvQjtRQUNwQywyREFBMkQ7UUFDM0QsUUFBUSxFQUFFLFlBQVk7UUFDdEIsVUFBVSxFQUFFLElBQUksR0FBRyxFQUFFO1FBQ3JCLGNBQWMsRUFBRSxJQUFJLENBQUMsY0FBYyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWM7S0FDckYsQ0FBQztJQUVGLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO1FBQ2hCLGlCQUFHLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3RCLEdBQUcsQ0FBQyxH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QUFRLENBQUMsTUFBYyxFQUFFLElBQVk7SUFDbkQsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQzNDLE1BQU0sR0FBRyxHQUFHLE1BQU0sR0FBRyxHQUFHLENBQUMsUUFBUSxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLGdCQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQzNGLE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQztBQUpELDRCQUlDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBJbmNvbWluZ01lc3NhZ2UsIFNlcnZlclJlc3BvbnNlIH0gZnJvbSAnaHR0cCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtSZXF1ZXN0LCBSZXNwb25zZSwgTmV4dEZ1bmN0aW9ufSBmcm9tICdleHByZXNzJztcbmltcG9ydCBhcGkgZnJvbSAnX19wbGluayc7XG5pbXBvcnQge2xvZ2dlciwgbG9nNEZpbGUsIGNvbmZpZ30gZnJvbSAnQHdmaC9wbGluayc7XG5pbXBvcnQgeyBjcmVhdGVQcm94eU1pZGRsZXdhcmUgYXMgcHJveHksIE9wdGlvbnMgYXMgSHBtT3B0aW9uc30gZnJvbSAnaHR0cC1wcm94eS1taWRkbGV3YXJlJztcbmltcG9ydCB7Y3JlYXRlU2xpY2UsIGNhc3RCeUFjdGlvblR5cGV9IGZyb20gJ0B3ZmgvcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlL2Rpc3QvdGlueS1yZWR1eC10b29sa2l0JztcbmltcG9ydCB7Y3JlYXRlUmVwbGF5UmVhZGFibGVGYWN0b3J5LCBkZWZhdWx0UHJveHlPcHRpb25zfSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge1Byb3h5Q2FjaGVTdGF0ZSwgQ2FjaGVEYXRhfSBmcm9tICcuL3R5cGVzJztcblxuY29uc3QgaHR0cFByb3h5TG9nID0gbG9nZ2VyLmdldExvZ2dlcihsb2c0RmlsZShfX2ZpbGVuYW1lKS5jYXRlZ29yeSArICcjaHR0cFByb3h5Jyk7XG5jb25zdCBSRURJUkVDVF9TVEFUVVMgPSBuZXcgTWFwPG51bWJlciwgbnVtYmVyPihbMzAxLCAzMDIsIDMwNywgMzA4XS5tYXAoY29kZSA9PiBbY29kZSwgY29kZV0pKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVByb3h5V2l0aENhY2hlKHByb3h5UGF0aDogc3RyaW5nLCB0YXJnZXRVcmw6IHN0cmluZywgY2FjaGVSb290RGlyOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgIG9wdHM6IHttYW51YWw6IGJvb2xlYW47IG1lbUNhY2hlTGVuZ3RoPzogbnVtYmVyfSA9IHttYW51YWw6IGZhbHNlfSkge1xuICBjb25zdCBpbml0aWFsU3RhdGU6IFByb3h5Q2FjaGVTdGF0ZSA9IHtcbiAgICAvLyBwcm94eU9wdGlvbnM6IGRlZmF1bHRQcm94eU9wdGlvbnMocHJveHlQYXRoLCB0YXJnZXRVcmwpLFxuICAgIGNhY2hlRGlyOiBjYWNoZVJvb3REaXIsXG4gICAgY2FjaGVCeVVyaTogbmV3IE1hcCgpLFxuICAgIG1lbUNhY2hlTGVuZ3RoOiBvcHRzLm1lbUNhY2hlTGVuZ3RoID09IG51bGwgPyBOdW1iZXIuTUFYX1ZBTFVFIDogb3B0cy5tZW1DYWNoZUxlbmd0aFxuICB9O1xuXG4gIGlmICghb3B0cy5tYW51YWwpIHtcbiAgICBhcGkuZXhwcmVzc0FwcFNldChhcHAgPT4ge1xuICAgICAgYXBwLnVzZShwcm94eVBhdGgsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgICAgICBjb25zdCBrZXkgPSBrZXlPZlVyaShyZXEubWV0aG9kLCByZXEudXJsKTtcbiAgICAgICAgY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuaGl0Q2FjaGUoe2tleSwgcmVxLCByZXMsIG5leHR9KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG4gIGNvbnN0IGNhY2hlQ29udHJvbGxlciA9IGNyZWF0ZVNsaWNlKHtcbiAgICBpbml0aWFsU3RhdGUsXG4gICAgbmFtZTogYEhUVFAtcHJveHktY2FjaGUtJHtwcm94eVBhdGh9YCAsXG4gICAgZGVidWdBY3Rpb25Pbmx5OiBjb25maWcoKS5jbGlPcHRpb25zPy52ZXJib3NlLFxuICAgIHJlZHVjZXJzOiB7XG4gICAgICBjb25maWd1cmVQcm94eShzOiBQcm94eUNhY2hlU3RhdGUsIHBheWxvYWQ6IEhwbU9wdGlvbnMpIHtcbiAgICAgIH0sXG4gICAgICBjb25maWdUcmFuc2Zvcm1lcihzOiBQcm94eUNhY2hlU3RhdGUsIHBheWxvYWQ6IHtcbiAgICAgICAgcmVtb3RlPzogUHJveHlDYWNoZVN0YXRlWydyZXNwb25zZVRyYW5zZm9ybWVyJ107XG4gICAgICAgIGNhY2hlZD86IFByb3h5Q2FjaGVTdGF0ZVsnY2FjaGVUcmFuc2Zvcm1lciddO1xuICAgICAgfSkge1xuICAgICAgICBpZiAocGF5bG9hZC5yZW1vdGUpXG4gICAgICAgICAgcy5yZXNwb25zZVRyYW5zZm9ybWVyID0gcGF5bG9hZC5yZW1vdGU7XG4gICAgICAgIGlmIChwYXlsb2FkLmNhY2hlZClcbiAgICAgICAgICBzLmNhY2hlVHJhbnNmb3JtZXIgPSBwYXlsb2FkLmNhY2hlZDtcbiAgICAgIH0sXG4gICAgICBoaXRDYWNoZShzOiBQcm94eUNhY2hlU3RhdGUsIHBheWxvYWQ6IHtrZXk6IHN0cmluZzsgcmVxOiBSZXF1ZXN0OyByZXM6IFJlc3BvbnNlOyBuZXh0OiBOZXh0RnVuY3Rpb259KSB7fSxcblxuICAgICAgX3JlcXVlc3RSZW1vdGVEb25lKHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDoge1xuICAgICAgICBrZXk6IHN0cmluZzsgcmVxSG9zdDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICByZXM6IFNlcnZlclJlc3BvbnNlO1xuICAgICAgICBkYXRhOiB7aGVhZGVyczogQ2FjaGVEYXRhWydoZWFkZXJzJ107IHJlYWRhYmxlOiBJbmNvbWluZ01lc3NhZ2V9O1xuICAgICAgfSkge30sXG5cbiAgICAgIF9sb2FkRnJvbVN0b3JhZ2UoczogUHJveHlDYWNoZVN0YXRlLCBwYXlsb2FkOiB7a2V5OiBzdHJpbmc7IHJlcTogUmVxdWVzdDsgcmVzOiBSZXNwb25zZTsgbmV4dDogTmV4dEZ1bmN0aW9ufSkge1xuICAgICAgICBzLmNhY2hlQnlVcmkuc2V0KHBheWxvYWQua2V5LCAnbG9hZGluZycpO1xuICAgICAgfSxcblxuICAgICAgX3JlcXVlc3RSZW1vdGUoczogUHJveHlDYWNoZVN0YXRlLCBwYXlsb2FkOiB7a2V5OiBzdHJpbmc7IHJlcTogUmVxdWVzdDsgcmVzOiBSZXNwb25zZTsgbmV4dDogTmV4dEZ1bmN0aW9ufSkge1xuICAgICAgICBzLmNhY2hlQnlVcmkuc2V0KHBheWxvYWQua2V5LCAncmVxdWVzdGluZycpO1xuICAgICAgfSxcbiAgICAgIF9zYXZpbmdGaWxlKHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDoge1xuICAgICAgICBrZXk6IHN0cmluZztcbiAgICAgICAgcmVzOiBTZXJ2ZXJSZXNwb25zZTtcbiAgICAgICAgZGF0YTogQ2FjaGVEYXRhO1xuICAgICAgfSkge1xuICAgICAgICBzLmNhY2hlQnlVcmkuc2V0KHBheWxvYWQua2V5LCAnc2F2aW5nJyk7XG4gICAgICB9LFxuICAgICAgX2RvbmUoczogUHJveHlDYWNoZVN0YXRlLCBwYXlsb2FkOiB7XG4gICAgICAgIGtleTogc3RyaW5nO1xuICAgICAgICByZXM6IFNlcnZlclJlc3BvbnNlO1xuICAgICAgICBkYXRhOiBDYWNoZURhdGE7XG4gICAgICB9KSB7XG4gICAgICAgIHMuY2FjaGVCeVVyaS5kZWxldGUocGF5bG9hZC5rZXkpO1xuICAgICAgICAvLyBpZiAocGF5bG9hZC5kYXRhLnN0YXR1c0NvZGUgIT09IDMwNCkge1xuICAgICAgICAvLyAgIGlmIChzLmNhY2hlQnlVcmkuc2l6ZSA+PSBzLm1lbUNhY2hlTGVuZ3RoKSB7XG4gICAgICAgIC8vICAgICAvLyBUT0RPOiBpbXByb3ZlIGZvciBMUlUgYWxnb3JpZ3RobVxuICAgICAgICAvLyAgICAgcy5jYWNoZUJ5VXJpLmRlbGV0ZShwYXlsb2FkLmtleSk7XG4gICAgICAgIC8vICAgICByZXR1cm47XG4gICAgICAgIC8vICAgfVxuICAgICAgICAvLyAgIHMuY2FjaGVCeVVyaS5zZXQocGF5bG9hZC5rZXksIHBheWxvYWQuZGF0YSk7XG4gICAgICAgIC8vIH1cbiAgICAgIH0sXG4gICAgICBfY2xlYW4oczogUHJveHlDYWNoZVN0YXRlLCBrZXk6IHN0cmluZykge1xuICAgICAgICBzLmNhY2hlQnlVcmkuZGVsZXRlKGtleSk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICBjYWNoZUNvbnRyb2xsZXIuZXBpYyhhY3Rpb24kID0+IHtcbiAgICBjb25zdCBkZWZhdWx0UHJveHlPcHQgPSBkZWZhdWx0UHJveHlPcHRpb25zKHByb3h5UGF0aCwgdGFyZ2V0VXJsKTtcbiAgICBjb25zdCBwcm94eUVycm9yJCA9IG5ldyByeC5TdWJqZWN0PFBhcmFtZXRlcnM8KHR5cGVvZiBkZWZhdWx0UHJveHlPcHQpWydvbkVycm9yJ10+PigpO1xuICAgIGNvbnN0IHByb3h5UmVzJCA9IG5ldyByeC5TdWJqZWN0PFBhcmFtZXRlcnM8KHR5cGVvZiBkZWZhdWx0UHJveHlPcHQpWydvblByb3h5UmVzJ10+PigpO1xuXG4gICAgbGV0IHByb3h5TWlkZGxld2FyZSQgPSBuZXcgcnguUmVwbGF5U3ViamVjdDxSZXR1cm5UeXBlPHR5cGVvZiBwcm94eT4+KDEpO1xuICAgIGNvbnN0IGFjdGlvbnMgPSBjYXN0QnlBY3Rpb25UeXBlKGNhY2hlQ29udHJvbGxlci5hY3Rpb25zLCBhY3Rpb24kKTtcblxuICAgIGFzeW5jIGZ1bmN0aW9uIHJlcXVlc3RpbmdSZW1vdGUoa2V5OiBzdHJpbmcsIHJlcUhvc3Q6IHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHByb3h5UmVzOiBJbmNvbWluZ01lc3NhZ2UsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXM6IFNlcnZlclJlc3BvbnNlLCBoZWFkZXJzOiBbc3RyaW5nLCBzdHJpbmcgfCBzdHJpbmdbXV1bXSkge1xuICAgICAgaHR0cFByb3h5TG9nLmRlYnVnKCdjYWNoZSBzaXplOicsIGNhY2hlQ29udHJvbGxlci5nZXRTdGF0ZSgpLmNhY2hlQnlVcmkuc2l6ZSk7XG4gICAgICBjb25zdCBkaXIgPSBQYXRoLmpvaW4oY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCkuY2FjaGVEaXIsIGtleSk7XG4gICAgICBjb25zdCBmaWxlID0gUGF0aC5qb2luKGRpciwgJ2JvZHknKTtcbiAgICAgIGNvbnN0IHN0YXR1c0NvZGUgPSBwcm94eVJlcy5zdGF0dXNDb2RlIHx8IDIwMDtcbiAgICAgIGNvbnN0IHtyZXNwb25zZVRyYW5zZm9ybWVyfSA9IGNhY2hlQ29udHJvbGxlci5nZXRTdGF0ZSgpO1xuICAgICAgaWYgKHN0YXR1c0NvZGUgPT09IDMwNCkge1xuICAgICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fZG9uZSh7a2V5LCByZXMsIGRhdGE6IHtcbiAgICAgICAgICAgIHN0YXR1c0NvZGUsIGhlYWRlcnMsIGJvZHk6IGNyZWF0ZVJlcGxheVJlYWRhYmxlRmFjdG9yeShwcm94eVJlcylcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBodHRwUHJveHlMb2cud2FybignVmVyc2lvbiBpbmZvIGlzIG5vdCByZWNvcmRlZCwgZHVlIHRvIHJlc3BvbnNlIDMwNCBmcm9tJywgcmVzLnJlcS51cmwsICcsXFxuIHlvdSBjYW4gcmVtb3ZlIGV4aXN0aW5nIG5wbS9jYWNoZSBjYWNoZSB0byBhdm9pZCAzMDQnKTtcbiAgICAgICAgcmV0dXJuIHJ4LkVNUFRZO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVzcG9uc2VUcmFuc2Zvcm1lciA9PSBudWxsKSB7XG4gICAgICAgIGNvbnN0IGRvbmVNa2RpciA9IGZzLm1rZGlycChkaXIpO1xuICAgICAgICBjb25zdCByZWFkYWJsZUZhYyA9IGNyZWF0ZVJlcGxheVJlYWRhYmxlRmFjdG9yeShwcm94eVJlcywgdW5kZWZpbmVkLFxuICAgICAgICAgIHtkZWJ1Z0luZm86IGtleSwgZXhwZWN0TGVuOiBwYXJzZUludChwcm94eVJlcy5oZWFkZXJzWydjb250ZW50LWxlbmd0aCddIGFzIHN0cmluZywgMTApfSk7XG4gICAgICAgICAvLyBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fZG9uZSh7a2V5LCBkYXRhOiB7XG4gICAgICAgICAvLyAgICAgICBzdGF0dXNDb2RlLCBoZWFkZXJzLCBib2R5OiAoKSA9PiBwcm94eVJlc1xuICAgICAgICAgLy8gICAgIH0sIHJlc1xuICAgICAgICAgLy8gICB9KTtcbiAgICAgICAgY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuX3NhdmluZ0ZpbGUoe2tleSwgZGF0YToge1xuICAgICAgICAgICAgc3RhdHVzQ29kZSwgaGVhZGVycywgYm9keTogcmVhZGFibGVGYWNcbiAgICAgICAgICB9LCByZXNcbiAgICAgICAgfSk7XG4gICAgICAgIGF3YWl0IGRvbmVNa2RpcjtcbiAgICAgICAgdm9pZCBmcy5wcm9taXNlcy53cml0ZUZpbGUoXG4gICAgICAgICAgUGF0aC5qb2luKGRpciwgJ2hlYWRlci5qc29uJyksXG4gICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7c3RhdHVzQ29kZSwgaGVhZGVyc30sIG51bGwsICcgICcpLFxuICAgICAgICAgICd1dGYtOCcpO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4gcmVhZGFibGVGYWMoKVxuICAgICAgICAgICAgLnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0oZmlsZSkpXG4gICAgICAgICAgICAub24oJ2ZpbmlzaCcsIHJlc29sdmUpXG4gICAgICAgICAgICAub24oJ2Vycm9yJywgcmVqZWN0KSk7XG5cbiAgICAgICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fZG9uZSh7a2V5LCBkYXRhOiB7XG4gICAgICAgICAgICAgIHN0YXR1c0NvZGUsIGhlYWRlcnMsIGJvZHk6IHJlYWRhYmxlRmFjXG4gICAgICAgICAgICB9LCByZXNcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGh0dHBQcm94eUxvZy5pbmZvKGByZXNwb25zZSBpcyB3cml0dGVuIHRvIChsZW5ndGg6ICR7aGVhZGVycy5maW5kKGl0ZW0gPT4gaXRlbVswXSA9PT0gJ2NvbnRlbnQtbGVuZ3RoJykhWzFdIGFzIHN0cmluZ30pYCxcbiAgICAgICAgICAgIFBhdGgucG9zaXgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgZmlsZSkpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgaHR0cFByb3h5TG9nLmVycm9yKCdGYWlsZWQgdG8gd3JpdGUgY2FjaGUgZmlsZSAnICtcbiAgICAgICAgICAgIFBhdGgucG9zaXgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgZmlsZSksIGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKHJlcUhvc3QgJiYgIXJlcUhvc3Quc3RhcnRzV2l0aCgnaHR0cCcpKSB7XG4gICAgICAgIHJlcUhvc3QgPSAnaHR0cDovLycgKyByZXFIb3N0O1xuICAgICAgfVxuXG4gICAgICBjb25zdCB7cmVhZGFibGU6IHRyYW5zZm9ybWVkLCBsZW5ndGh9ID0gYXdhaXQgcmVzcG9uc2VUcmFuc2Zvcm1lcihoZWFkZXJzLCByZXFIb3N0LCBwcm94eVJlcyk7XG4gICAgICBjb25zdCBsZW5ndGhIZWFkZXJJZHggPSBoZWFkZXJzLmZpbmRJbmRleChyb3cgPT4gcm93WzBdID09PSAnY29udGVudC1sZW5ndGgnKTtcbiAgICAgIGlmIChsZW5ndGhIZWFkZXJJZHggPj0gMClcbiAgICAgICAgaGVhZGVyc1tsZW5ndGhIZWFkZXJJZHhdWzFdID0gJycgKyBsZW5ndGg7XG5cbiAgICAgIGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyLl9zYXZpbmdGaWxlKHtrZXksIHJlcywgZGF0YToge1xuICAgICAgICAgIHN0YXR1c0NvZGUsIGhlYWRlcnMsIGJvZHk6IHRyYW5zZm9ybWVkXG4gICAgICB9IH0pO1xuXG4gICAgICBhd2FpdCBmcy5ta2RpcnAoZGlyKTtcbiAgICAgIHZvaWQgZnMucHJvbWlzZXMud3JpdGVGaWxlKFxuICAgICAgICBQYXRoLmpvaW4oZGlyLCAnaGVhZGVyLmpzb24nKSxcbiAgICAgICAgSlNPTi5zdHJpbmdpZnkoe3N0YXR1c0NvZGUsIGhlYWRlcnN9LCBudWxsLCAnICAnKSxcbiAgICAgICAgJ3V0Zi04Jyk7XG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB0cmFuc2Zvcm1lZCgpXG4gICAgICAgIC5vbignZW5kJywgcmVzb2x2ZSlcbiAgICAgICAgLnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0oZmlsZSkpXG4gICAgICAgIC5vbignZXJyb3InLCByZWplY3QpKTtcblxuICAgICAgY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuX2RvbmUoe2tleSwgcmVzLCBkYXRhOiB7XG4gICAgICAgICAgc3RhdHVzQ29kZSwgaGVhZGVycywgYm9keTogdHJhbnNmb3JtZWRcbiAgICAgIH0gfSk7XG4gICAgICBodHRwUHJveHlMb2cuaW5mbygnd3JpdGUgcmVzcG9uc2UgdG8gZmlsZScsIFBhdGgucG9zaXgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgZmlsZSksICdzaXplJywgbGVuZ3RoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcngubWVyZ2UoXG4gICAgICBhY3Rpb25zLmNvbmZpZ3VyZVByb3h5LnBpcGUoXG4gICAgICAgIG9wLm1hcCgoe3BheWxvYWQ6IGV4dHJhT3B0fSkgPT4ge1xuICAgICAgICAgIHByb3h5TWlkZGxld2FyZSQubmV4dChwcm94eSh7XG4gICAgICAgICAgICAuLi5kZWZhdWx0UHJveHlPcHQsXG4gICAgICAgICAgICBmb2xsb3dSZWRpcmVjdHM6IHRydWUsXG4gICAgICAgICAgICBsb2dMZXZlbDogY29uZmlnKCkuY2xpT3B0aW9ucz8udmVyYm9zZSA/ICdkZWJ1ZycgOlxuICAgICAgICAgICAgICAnaW5mbycsXG4gICAgICAgICAgICBwcm94eVRpbWVvdXQ6IDIwMDAwLFxuICAgICAgICAgICAgLi4uZXh0cmFPcHQsXG4gICAgICAgICAgICBvblByb3h5UmVzKC4uLmFyZ3MpIHtcbiAgICAgICAgICAgICAgaWYgKFJFRElSRUNUX1NUQVRVUy5oYXMoYXJnc1swXS5zdGF0dXNDb2RlIHx8IDIwMCkpIHtcbiAgICAgICAgICAgICAgICBodHRwUHJveHlMb2cuaW5mbygnc2tpcCByZWRpcmVjdGVkIHJlc3BvbnNlJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHByb3h5UmVzJC5uZXh0KGFyZ3MpO1xuICAgICAgICAgICAgICBkZWZhdWx0UHJveHlPcHQub25Qcm94eVJlcyguLi5hcmdzKTtcbiAgICAgICAgICAgICAgaWYgKGV4dHJhT3B0Lm9uUHJveHlSZXMpXG4gICAgICAgICAgICAgICAgZXh0cmFPcHQub25Qcm94eVJlcyguLi5hcmdzKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKC4uLmFyZ3MpIHtcbiAgICAgICAgICAgICAgZGVmYXVsdFByb3h5T3B0Lm9uRXJyb3IoLi4uYXJncyk7XG4gICAgICAgICAgICAgIHByb3h5RXJyb3IkLm5leHQoYXJncyk7XG4gICAgICAgICAgICAgIGlmIChleHRyYU9wdC5vbkVycm9yKVxuICAgICAgICAgICAgICAgIGV4dHJhT3B0Lm9uRXJyb3IoLi4uYXJncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9KVxuICAgICAgKSxcbiAgICAgIGFjdGlvbnMuaGl0Q2FjaGUucGlwZShcbiAgICAgICAgb3AubWVyZ2VNYXAoICh7cGF5bG9hZH0pID0+IHtcbiAgICAgICAgICBjb25zdCB3YWl0Q2FjaGVBbmRTZW5kUmVzID0gcngucmFjZShhY3Rpb25zLl9kb25lLCBhY3Rpb25zLl9zYXZpbmdGaWxlKS5waXBlKFxuICAgICAgICAgICAgb3AuZmlsdGVyKGFjdGlvbiA9PiBhY3Rpb24ucGF5bG9hZC5rZXkgPT09IHBheWxvYWQua2V5KSwgLy8gSW4gY2FzZSBpdCBpcyBvZiByZWRpcmVjdGVkIHJlcXVlc3QsIEhQTSBoYXMgZG9uZSBwaXBpbmcgcmVzcG9uc2UgKGlnbm9yZWQgXCJtYW51YWwgcmVwb25zZVwiIHNldHRpbmcpXG4gICAgICAgICAgICBvcC50YWtlKDEpLFxuICAgICAgICAgICAgb3AubWVyZ2VNYXAoKHtwYXlsb2FkOiB7a2V5LCByZXMsIGRhdGF9fSkgPT4ge1xuICAgICAgICAgICAgICBpZiAocmVzLndyaXRhYmxlRW5kZWQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Jlc3BvbnNlIGlzIGVuZGVkIGVhcmx5LCB3aHk/Jyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBkYXRhLmhlYWRlcnMpIHtcbiAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKGVudHJ5WzBdLCBlbnRyeVsxXSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSBkYXRhLnN0YXR1c0NvZGU7XG4gICAgICAgICAgICAgIGh0dHBQcm94eUxvZy5pbmZvKCdyZXBseSB0bycsIHBheWxvYWQua2V5KTtcbiAgICAgICAgICAgICAgY29uc3QgcGlwZUV2ZW50JCA9IG5ldyByeC5TdWJqZWN0PHN0cmluZz4oKTtcbiAgICAgICAgICAgICAgcmVzLm9uKCdmaW5pc2gnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgcGlwZUV2ZW50JC5uZXh0KCdmaW5pc2gnKTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgLm9uKCdjbG9zZScsICgpID0+IHtcbiAgICAgICAgICAgICAgICBwaXBlRXZlbnQkLm5leHQoJ2Nsb3NlJyk7XG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIC5vbignZXJyb3InLCBlcnIgPT4gcGlwZUV2ZW50JC5lcnJvcihlcnIpKTtcblxuICAgICAgICAgICAgICBkYXRhLmJvZHkoKS5waXBlKHJlcyk7XG4gICAgICAgICAgICAgIHJldHVybiBwaXBlRXZlbnQkLnBpcGUoXG4gICAgICAgICAgICAgICAgb3AuZmlsdGVyKGV2ZW50ID0+IGV2ZW50ID09PSAnZmluaXNoJyB8fCBldmVudCA9PT0gJ2Nsb3NlJyksXG4gICAgICAgICAgICAgICAgb3AudGFwKGV2ZW50ID0+IHtcbiAgICAgICAgICAgICAgICAgIGlmIChldmVudCA9PT0gJ2Nsb3NlJylcbiAgICAgICAgICAgICAgICAgICAgaHR0cFByb3h5TG9nLmVycm9yKCdSZXNwb25zZSBjb25uZWN0aW9uIGlzIGNsb3NlZCBlYXJseScpO1xuICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgIG9wLnRha2UoMSksXG4gICAgICAgICAgICAgICAgb3AubWFwVG8oa2V5KSxcbiAgICAgICAgICAgICAgICBvcC50aW1lb3V0KDEyMDAwMCksXG4gICAgICAgICAgICAgICAgb3AuY2F0Y2hFcnJvcihlcnIgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKCFyZXMuaGVhZGVyc1NlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA1MDA7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJlcy5lbmQoKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIHJldHVybiByeC5FTVBUWTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBvcC5tYXAoa2V5ID0+IGh0dHBQcm94eUxvZy5pbmZvKGByZXBsaWVkOiAke2tleX1gKSlcbiAgICAgICAgICApO1xuICAgICAgICAgIGNvbnN0IGl0ZW0gPSBjYWNoZUNvbnRyb2xsZXIuZ2V0U3RhdGUoKS5jYWNoZUJ5VXJpLmdldChwYXlsb2FkLmtleSk7XG4gICAgICAgICAgaHR0cFByb3h5TG9nLmluZm8oJ2hpdENhY2hlIGZvciAnICsgcGF5bG9hZC5rZXkgKyAnLCcgKyBpdGVtKTtcbiAgICAgICAgICBpZiAoaXRlbSA9PSBudWxsKSB7XG4gICAgICAgICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fbG9hZEZyb21TdG9yYWdlKHBheWxvYWQpO1xuICAgICAgICAgICAgcmV0dXJuIHdhaXRDYWNoZUFuZFNlbmRSZXM7XG4gICAgICAgICAgfSBlbHNlIGlmIChpdGVtID09PSAnbG9hZGluZycgfHwgaXRlbSA9PT0gJ3JlcXVlc3RpbmcnIHx8IGl0ZW0gPT09ICdzYXZpbmcnKSB7XG4gICAgICAgICAgICByZXR1cm4gd2FpdENhY2hlQW5kU2VuZFJlcztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaHR0cFByb3h5TG9nLmluZm8oJ2hpdCBjYWNoZWQnLCBwYXlsb2FkLmtleSk7XG4gICAgICAgICAgICBjb25zdCB0cmFuc2Zvcm1lciA9IGNhY2hlQ29udHJvbGxlci5nZXRTdGF0ZSgpLmNhY2hlVHJhbnNmb3JtZXI7XG4gICAgICAgICAgICBpZiAodHJhbnNmb3JtZXIgPT0gbnVsbCkge1xuICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGl0ZW0uaGVhZGVycykge1xuICAgICAgICAgICAgICAgIHBheWxvYWQucmVzLnNldEhlYWRlcihlbnRyeVswXSwgZW50cnlbMV0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHBheWxvYWQucmVzLnN0YXR1cyhpdGVtLnN0YXR1c0NvZGUpO1xuICAgICAgICAgICAgICByZXR1cm4gbmV3IHJ4Lk9ic2VydmFibGU8dm9pZD4oc3ViID0+IHtcbiAgICAgICAgICAgICAgICBpdGVtLmJvZHkoKVxuICAgICAgICAgICAgICAgIC5vbignZW5kJywgKCkgPT4ge3N1Yi5uZXh0KCk7IHN1Yi5jb21wbGV0ZSgpOyB9KVxuICAgICAgICAgICAgICAgIC5waXBlKHBheWxvYWQucmVzKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiByeC5mcm9tKHRyYW5zZm9ybWVyKGl0ZW0uaGVhZGVycywgcGF5bG9hZC5yZXEuaGVhZGVycy5ob3N0LCBpdGVtLmJvZHkoKSkpLnBpcGUoXG4gICAgICAgICAgICAgIG9wLnRha2UoMSksXG4gICAgICAgICAgICAgIG9wLm1lcmdlTWFwKCh7cmVhZGFibGUsIGxlbmd0aH0pID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBsZW5ndGhIZWFkZXJJZHggPSBpdGVtLmhlYWRlcnMuZmluZEluZGV4KHJvdyA9PiByb3dbMF0gPT09ICdjb250ZW50LWxlbmd0aCcpO1xuICAgICAgICAgICAgICAgIGlmIChsZW5ndGhIZWFkZXJJZHggPj0gMClcbiAgICAgICAgICAgICAgICAgIGl0ZW0uaGVhZGVyc1tsZW5ndGhIZWFkZXJJZHhdWzFdID0gJycgKyBsZW5ndGg7XG4gICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBpdGVtLmhlYWRlcnMpIHtcbiAgICAgICAgICAgICAgICAgIHBheWxvYWQucmVzLnNldEhlYWRlcihlbnRyeVswXSwgZW50cnlbMV0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwYXlsb2FkLnJlcy5zdGF0dXMoaXRlbS5zdGF0dXNDb2RlKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV3IHJ4Lk9ic2VydmFibGU8dm9pZD4oc3ViID0+IHtcbiAgICAgICAgICAgICAgICAgIHJlYWRhYmxlKCkub24oJ2VuZCcsICgpID0+IHN1Yi5jb21wbGV0ZSgpKVxuICAgICAgICAgICAgICAgICAgICAucGlwZShwYXlsb2FkLnJlcylcbiAgICAgICAgICAgICAgICAgICAgLm9uKCdlcnJvcicsIGVyciA9PiBzdWIuZXJyb3IoZXJyKSk7XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgfSksXG4gICAgICAgIG9wLmNhdGNoRXJyb3IoZXJyID0+IHtcbiAgICAgICAgICBodHRwUHJveHlMb2cuZXJyb3IoJ0ZhaWxlZCB0byB3cml0ZSByZXNwb25zZScsIGVycik7XG4gICAgICAgICAgcmV0dXJuIHJ4LkVNUFRZO1xuICAgICAgICB9KVxuICAgICAgKSxcbiAgICAgIGFjdGlvbnMuX2xvYWRGcm9tU3RvcmFnZS5waXBlKFxuICAgICAgICBvcC5tZXJnZU1hcChhc3luYyAoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGRpciA9IFBhdGguam9pbihjYWNoZUNvbnRyb2xsZXIuZ2V0U3RhdGUoKS5jYWNoZURpciwgcGF5bG9hZC5rZXkpO1xuICAgICAgICAgICAgY29uc3QgaEZpbGUgPSBQYXRoLmpvaW4oZGlyLCAnaGVhZGVyLmpzb24nKTtcbiAgICAgICAgICAgIGNvbnN0IGJGaWxlID0gUGF0aC5qb2luKGRpciwgJ2JvZHknKTtcbiAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKGhGaWxlKSkge1xuICAgICAgICAgICAgICBodHRwUHJveHlMb2cuaW5mbygnbG9hZCcsIHBheWxvYWQua2V5KTtcbiAgICAgICAgICAgICAgY29uc3QgdHJhbnNmb3JtZXIgPSBjYWNoZUNvbnRyb2xsZXIuZ2V0U3RhdGUoKS5jYWNoZVRyYW5zZm9ybWVyO1xuICAgICAgICAgICAgICBpZiAodHJhbnNmb3JtZXIgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlcnNTdHIgPSBhd2FpdCBmcy5wcm9taXNlcy5yZWFkRmlsZShoRmlsZSwgJ3V0Zi04Jyk7XG4gICAgICAgICAgICAgICAgY29uc3Qge3N0YXR1c0NvZGUsIGhlYWRlcnN9ID0gSlNPTi5wYXJzZShoZWFkZXJzU3RyKSBhcyB7c3RhdHVzQ29kZTogbnVtYmVyOyBoZWFkZXJzOiBbc3RyaW5nLCBzdHJpbmcgfCBzdHJpbmdbXV1bXX07XG5cbiAgICAgICAgICAgICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fZG9uZSh7a2V5OiBwYXlsb2FkLmtleSwgcmVzOiBwYXlsb2FkLnJlcyxcbiAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzQ29kZSxcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVycyxcbiAgICAgICAgICAgICAgICAgICAgYm9keTogKCkgPT4gZnMuY3JlYXRlUmVhZFN0cmVhbShiRmlsZSlcbiAgICAgICAgICAgICAgICAgIH19KTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBjb25zdCBoZWFkZXJzU3RyID0gYXdhaXQgZnMucHJvbWlzZXMucmVhZEZpbGUoaEZpbGUsICd1dGYtOCcpO1xuICAgICAgICAgICAgICBjb25zdCB7c3RhdHVzQ29kZSwgaGVhZGVyc30gPSBKU09OLnBhcnNlKGhlYWRlcnNTdHIpIGFzIHtzdGF0dXNDb2RlOiBudW1iZXI7IGhlYWRlcnM6IFtzdHJpbmcsIHN0cmluZyB8IHN0cmluZ1tdXVtdfTtcbiAgICAgICAgICAgICAgY29uc3Qge3JlYWRhYmxlLCBsZW5ndGh9ID0gYXdhaXQgdHJhbnNmb3JtZXIoaGVhZGVycywgcGF5bG9hZC5yZXEuaGVhZGVycy5ob3N0LCBmcy5jcmVhdGVSZWFkU3RyZWFtKGJGaWxlKSk7XG4gICAgICAgICAgICAgIGNvbnN0IGxlbmd0aEhlYWRlcklkeCA9IGhlYWRlcnMuZmluZEluZGV4KHJvdyA9PiByb3dbMF0gPT09ICdjb250ZW50LWxlbmd0aCcpO1xuICAgICAgICAgICAgICBpZiAobGVuZ3RoSGVhZGVySWR4ID49IDApXG4gICAgICAgICAgICAgICAgaGVhZGVyc1tsZW5ndGhIZWFkZXJJZHhdWzFdID0gJycgKyBsZW5ndGg7XG5cbiAgICAgICAgICAgICAgY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuX2RvbmUoe2tleTogcGF5bG9hZC5rZXksXG4gICAgICAgICAgICAgICAgcmVzOiBwYXlsb2FkLnJlcyxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICBzdGF0dXNDb2RlLFxuICAgICAgICAgICAgICAgICAgaGVhZGVycyxcbiAgICAgICAgICAgICAgICAgIGJvZHk6IHJlYWRhYmxlXG4gICAgICAgICAgICAgICAgfX0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgaHR0cFByb3h5TG9nLmluZm8oJ05vIGV4aXN0aW5nIGZpbGUgZm9yJywgcGF5bG9hZC5rZXkpO1xuICAgICAgICAgICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fcmVxdWVzdFJlbW90ZShwYXlsb2FkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICAgICAgaHR0cFByb3h5TG9nLmVycm9yKCdGYWlsZWQgdG8gc2F2ZSBjYWNoZSBmb3I6ICcgKyBwYXlsb2FkLmtleSwgZXgpO1xuICAgICAgICAgICAgY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuX2NsZWFuKHBheWxvYWQua2V5KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICApLFxuICAgICAgYWN0aW9ucy5fcmVxdWVzdFJlbW90ZS5waXBlKFxuICAgICAgICBvcC5tZXJnZU1hcCgoe3BheWxvYWR9KSA9PiByeC5tZXJnZShcbiAgICAgICAgICByeC5yYWNlKFxuICAgICAgICAgICAgcHJveHlSZXMkLnBpcGUoXG4gICAgICAgICAgICAgIG9wLmZpbHRlcigoWywgLCByZXNdKSA9PiByZXMgPT09IHBheWxvYWQucmVzKSxcbiAgICAgICAgICAgICAgb3AudGFrZSgxKSxcbiAgICAgICAgICAgICAgb3AubWVyZ2VNYXAoKFtwcm94eVJlcywgb3JpZ1JlcSwgc2VydmVyUmVzXSkgPT4ge1xuICAgICAgICAgICAgICAgIHJldHVybiByeC5kZWZlcigoKSA9PiByZXF1ZXN0aW5nUmVtb3RlKHBheWxvYWQua2V5LCBwYXlsb2FkLnJlcS5oZWFkZXJzLmhvc3QsIHByb3h5UmVzLCBzZXJ2ZXJSZXMsXG4gICAgICAgICAgICAgICAgICBPYmplY3QuZW50cmllcyhwcm94eVJlcy5oZWFkZXJzKVxuICAgICAgICAgICAgICAgICAgLmZpbHRlcihlbnRyeSA9PiBlbnRyeVsxXSAhPSBudWxsKSBhcyBbc3RyaW5nLCBzdHJpbmcgfCBzdHJpbmdbXV1bXSkpXG4gICAgICAgICAgICAgICAgLnBpcGUoXG4gICAgICAgICAgICAgICAgICBvcC50aW1lb3V0KDE1MDAwKVxuICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICApLFxuICAgICAgICAgICAgcHJveHlFcnJvciQucGlwZShcbiAgICAgICAgICAgICAgb3AuZmlsdGVyKChbZXJyLCBvcmlnUmVxLCBzZXJ2ZXJSZXNdKSA9PiBzZXJ2ZXJSZXMgPT09IHBheWxvYWQucmVzKSxcbiAgICAgICAgICAgICAgb3AudGFrZSgxKSxcbiAgICAgICAgICAgICAgb3AubWFwKChbZXJyXSkgPT4ge1xuICAgICAgICAgICAgICAgIGh0dHBQcm94eUxvZy5lcnJvcignSFBNIGVycm9yJywgZXJyKTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIClcbiAgICAgICAgICApLFxuICAgICAgICAgIHByb3h5TWlkZGxld2FyZSQucGlwZShcbiAgICAgICAgICAgIG9wLnRha2UoMSksXG4gICAgICAgICAgICBvcC5tYXAocHJveHkgPT4gcHJveHkocGF5bG9hZC5yZXEsIHBheWxvYWQucmVzLCBwYXlsb2FkLm5leHQpKVxuICAgICAgICAgIClcbiAgICAgICAgKSlcbiAgICAgIClcbiAgICApLnBpcGUoXG4gICAgICBvcC5pZ25vcmVFbGVtZW50cygpLFxuICAgICAgb3AuY2F0Y2hFcnJvcigoZXJyLCBzcmMpID0+IHtcbiAgICAgICAgaHR0cFByb3h5TG9nLmVycm9yKCdIVFRQIHByb3h5IGNhY2hlIGVycm9yJywgZXJyKTtcbiAgICAgICAgcmV0dXJuIHNyYztcbiAgICAgIH0pXG4gICAgKTtcbiAgfSk7XG5cbiAgcmV0dXJuIGNhY2hlQ29udHJvbGxlcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGtleU9mVXJpKG1ldGhvZDogc3RyaW5nLCBwYXRoOiBzdHJpbmcpIHtcbiAgY29uc3QgdXJsID0gbmV3IFVSTCgnaHR0cDovL2YuY29tJyArIHBhdGgpO1xuICBjb25zdCBrZXkgPSBtZXRob2QgKyB1cmwucGF0aG5hbWUgKyAodXJsLnNlYXJjaCA/ICcvJyArIF8udHJpbVN0YXJ0KHVybC5zZWFyY2gsICc/JykgOiAnJyk7XG4gIHJldHVybiBrZXk7XG59XG4iXX0=