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
const inspector_1 = __importDefault(require("inspector"));
inspector_1.default.open(9222, 'localhost');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGUtc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNhY2hlLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGdEQUF3QjtBQUV4Qix3REFBMEI7QUFDMUIseUNBQTJCO0FBQzNCLG1EQUFxQztBQUNyQyxvREFBdUI7QUFFdkIsc0RBQTBCO0FBQzFCLHNDQUFvRDtBQUNwRCxpRUFBNkY7QUFDN0YsOEZBQW9HO0FBQ3BHLG9DQUEwRTtBQUUxRSwwREFBa0M7QUFFbEMsbUJBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLFdBQVcsQ0FBQyxDQUFDO0FBQ2xDLE1BQU0sWUFBWSxHQUFHLGNBQU0sQ0FBQyxTQUFTLENBQUMsSUFBQSxnQkFBUSxFQUFDLFVBQVUsQ0FBQyxDQUFDLFFBQVEsR0FBRyxZQUFZLENBQUMsQ0FBQztBQUNwRixNQUFNLGVBQWUsR0FBRyxJQUFJLEdBQUcsQ0FBaUIsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFFaEcsU0FBZ0Isb0JBQW9CLENBQUMsU0FBaUIsRUFBRSxTQUFpQixFQUFFLFlBQW9CLEVBQzlFLE9BQW1ELEVBQUMsTUFBTSxFQUFFLEtBQUssRUFBQzs7SUFDakYsTUFBTSxZQUFZLEdBQW9CO1FBQ3BDLDJEQUEyRDtRQUMzRCxRQUFRLEVBQUUsWUFBWTtRQUN0QixVQUFVLEVBQUUsSUFBSSxHQUFHLEVBQUU7UUFDckIsY0FBYyxFQUFFLElBQUksQ0FBQyxjQUFjLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYztLQUNyRixDQUFDO0lBRUYsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFN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QUFDLENBQUM7SUFFSCxPQUFPLGVBQWUsQ0FBQztBQUN6QixDQUFDO0FBdFhELG9EQXNYQztBQUVELFNBQWdCLFFBQVEsQ0FBQyxNQUFjLEVBQUUsSUFBWTtJQUNuRCxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDM0MsTUFBTSxHQUFHLEdBQUcsTUFBTSxHQUFHLEdBQUcsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsZ0JBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDM0YsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBSkQsNEJBSUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IEluY29taW5nTWVzc2FnZSwgU2VydmVyUmVzcG9uc2UgfSBmcm9tICdodHRwJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge1JlcXVlc3QsIFJlc3BvbnNlLCBOZXh0RnVuY3Rpb259IGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IGFwaSBmcm9tICdfX3BsaW5rJztcbmltcG9ydCB7bG9nZ2VyLCBsb2c0RmlsZSwgY29uZmlnfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCB7IGNyZWF0ZVByb3h5TWlkZGxld2FyZSBhcyBwcm94eSwgT3B0aW9ucyBhcyBIcG1PcHRpb25zfSBmcm9tICdodHRwLXByb3h5LW1pZGRsZXdhcmUnO1xuaW1wb3J0IHtjcmVhdGVTbGljZSwgY2FzdEJ5QWN0aW9uVHlwZX0gZnJvbSAnQHdmaC9yZWR1eC10b29sa2l0LW9ic2VydmFibGUvZGlzdC90aW55LXJlZHV4LXRvb2xraXQnO1xuaW1wb3J0IHtjcmVhdGVSZXBsYXlSZWFkYWJsZUZhY3RvcnksIGRlZmF1bHRQcm94eU9wdGlvbnN9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7UHJveHlDYWNoZVN0YXRlLCBDYWNoZURhdGF9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IGluc3BlY3RvciBmcm9tICdpbnNwZWN0b3InO1xuXG5pbnNwZWN0b3Iub3Blbig5MjIyLCAnbG9jYWxob3N0Jyk7XG5jb25zdCBodHRwUHJveHlMb2cgPSBsb2dnZXIuZ2V0TG9nZ2VyKGxvZzRGaWxlKF9fZmlsZW5hbWUpLmNhdGVnb3J5ICsgJyNodHRwUHJveHknKTtcbmNvbnN0IFJFRElSRUNUX1NUQVRVUyA9IG5ldyBNYXA8bnVtYmVyLCBudW1iZXI+KFszMDEsIDMwMiwgMzA3LCAzMDhdLm1hcChjb2RlID0+IFtjb2RlLCBjb2RlXSkpO1xuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUHJveHlXaXRoQ2FjaGUocHJveHlQYXRoOiBzdHJpbmcsIHRhcmdldFVybDogc3RyaW5nLCBjYWNoZVJvb3REaXI6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgb3B0czoge21hbnVhbDogYm9vbGVhbjsgbWVtQ2FjaGVMZW5ndGg/OiBudW1iZXJ9ID0ge21hbnVhbDogZmFsc2V9KSB7XG4gIGNvbnN0IGluaXRpYWxTdGF0ZTogUHJveHlDYWNoZVN0YXRlID0ge1xuICAgIC8vIHByb3h5T3B0aW9uczogZGVmYXVsdFByb3h5T3B0aW9ucyhwcm94eVBhdGgsIHRhcmdldFVybCksXG4gICAgY2FjaGVEaXI6IGNhY2hlUm9vdERpcixcbiAgICBjYWNoZUJ5VXJpOiBuZXcgTWFwKCksXG4gICAgbWVtQ2FjaGVMZW5ndGg6IG9wdHMubWVtQ2FjaGVMZW5ndGggPT0gbnVsbCA/IE51bWJlci5NQVhfVkFMVUUgOiBvcHRzLm1lbUNhY2hlTGVuZ3RoXG4gIH07XG5cbiAgaWYgKCFvcHRzLm1hbnVhbCkge1xuICAgIGFwaS5leHByZXNzQXBwU2V0KGFwcCA9PiB7XG4gICAgICBhcHAudXNlKHByb3h5UGF0aCwgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgICAgIGNvbnN0IGtleSA9IGtleU9mVXJpKHJlcS5tZXRob2QsIHJlcS51cmwpO1xuICAgICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5oaXRDYWNoZSh7a2V5LCByZXEsIHJlcywgbmV4dH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbiAgY29uc3QgY2FjaGVDb250cm9sbGVyID0gY3JlYXRlU2xpY2Uoe1xuICAgIGluaXRpYWxTdGF0ZSxcbiAgICBuYW1lOiBgSFRUUC1wcm94eS1jYWNoZS0ke3Byb3h5UGF0aH1gICxcbiAgICBkZWJ1Z0FjdGlvbk9ubHk6IGNvbmZpZygpLmNsaU9wdGlvbnM/LnZlcmJvc2UsXG4gICAgcmVkdWNlcnM6IHtcbiAgICAgIGNvbmZpZ3VyZVByb3h5KHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDogSHBtT3B0aW9ucykge1xuICAgICAgfSxcbiAgICAgIGNvbmZpZ1RyYW5zZm9ybWVyKHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDoge1xuICAgICAgICByZW1vdGU/OiBQcm94eUNhY2hlU3RhdGVbJ3Jlc3BvbnNlVHJhbnNmb3JtZXInXTtcbiAgICAgICAgY2FjaGVkPzogUHJveHlDYWNoZVN0YXRlWydjYWNoZVRyYW5zZm9ybWVyJ107XG4gICAgICB9KSB7XG4gICAgICAgIGlmIChwYXlsb2FkLnJlbW90ZSlcbiAgICAgICAgICBzLnJlc3BvbnNlVHJhbnNmb3JtZXIgPSBwYXlsb2FkLnJlbW90ZTtcbiAgICAgICAgaWYgKHBheWxvYWQuY2FjaGVkKVxuICAgICAgICAgIHMuY2FjaGVUcmFuc2Zvcm1lciA9IHBheWxvYWQuY2FjaGVkO1xuICAgICAgfSxcbiAgICAgIGhpdENhY2hlKHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDoge2tleTogc3RyaW5nOyByZXE6IFJlcXVlc3Q7IHJlczogUmVzcG9uc2U7IG5leHQ6IE5leHRGdW5jdGlvbn0pIHt9LFxuXG4gICAgICBfcmVxdWVzdFJlbW90ZURvbmUoczogUHJveHlDYWNoZVN0YXRlLCBwYXlsb2FkOiB7XG4gICAgICAgIGtleTogc3RyaW5nOyByZXFIb3N0OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIHJlczogU2VydmVyUmVzcG9uc2U7XG4gICAgICAgIGRhdGE6IHtoZWFkZXJzOiBDYWNoZURhdGFbJ2hlYWRlcnMnXTsgcmVhZGFibGU6IEluY29taW5nTWVzc2FnZX07XG4gICAgICB9KSB7fSxcblxuICAgICAgX2xvYWRGcm9tU3RvcmFnZShzOiBQcm94eUNhY2hlU3RhdGUsIHBheWxvYWQ6IHtrZXk6IHN0cmluZzsgcmVxOiBSZXF1ZXN0OyByZXM6IFJlc3BvbnNlOyBuZXh0OiBOZXh0RnVuY3Rpb259KSB7XG4gICAgICAgIHMuY2FjaGVCeVVyaS5zZXQocGF5bG9hZC5rZXksICdsb2FkaW5nJyk7XG4gICAgICB9LFxuXG4gICAgICBfcmVxdWVzdFJlbW90ZShzOiBQcm94eUNhY2hlU3RhdGUsIHBheWxvYWQ6IHtrZXk6IHN0cmluZzsgcmVxOiBSZXF1ZXN0OyByZXM6IFJlc3BvbnNlOyBuZXh0OiBOZXh0RnVuY3Rpb259KSB7XG4gICAgICAgIHMuY2FjaGVCeVVyaS5zZXQocGF5bG9hZC5rZXksICdyZXF1ZXN0aW5nJyk7XG4gICAgICB9LFxuICAgICAgX3NhdmluZ0ZpbGUoczogUHJveHlDYWNoZVN0YXRlLCBwYXlsb2FkOiB7XG4gICAgICAgIGtleTogc3RyaW5nO1xuICAgICAgICByZXM6IFNlcnZlclJlc3BvbnNlO1xuICAgICAgICBkYXRhOiBDYWNoZURhdGE7XG4gICAgICB9KSB7XG4gICAgICAgIHMuY2FjaGVCeVVyaS5zZXQocGF5bG9hZC5rZXksICdzYXZpbmcnKTtcbiAgICAgIH0sXG4gICAgICBfZG9uZShzOiBQcm94eUNhY2hlU3RhdGUsIHBheWxvYWQ6IHtcbiAgICAgICAga2V5OiBzdHJpbmc7XG4gICAgICAgIHJlczogU2VydmVyUmVzcG9uc2U7XG4gICAgICAgIGRhdGE6IENhY2hlRGF0YTtcbiAgICAgIH0pIHtcbiAgICAgICAgcy5jYWNoZUJ5VXJpLmRlbGV0ZShwYXlsb2FkLmtleSk7XG4gICAgICAgIC8vIGlmIChwYXlsb2FkLmRhdGEuc3RhdHVzQ29kZSAhPT0gMzA0KSB7XG4gICAgICAgIC8vICAgaWYgKHMuY2FjaGVCeVVyaS5zaXplID49IHMubWVtQ2FjaGVMZW5ndGgpIHtcbiAgICAgICAgLy8gICAgIC8vIFRPRE86IGltcHJvdmUgZm9yIExSVSBhbGdvcmlndGhtXG4gICAgICAgIC8vICAgICBzLmNhY2hlQnlVcmkuZGVsZXRlKHBheWxvYWQua2V5KTtcbiAgICAgICAgLy8gICAgIHJldHVybjtcbiAgICAgICAgLy8gICB9XG4gICAgICAgIC8vICAgcy5jYWNoZUJ5VXJpLnNldChwYXlsb2FkLmtleSwgcGF5bG9hZC5kYXRhKTtcbiAgICAgICAgLy8gfVxuICAgICAgfSxcbiAgICAgIF9jbGVhbihzOiBQcm94eUNhY2hlU3RhdGUsIGtleTogc3RyaW5nKSB7XG4gICAgICAgIHMuY2FjaGVCeVVyaS5kZWxldGUoa2V5KTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIGNhY2hlQ29udHJvbGxlci5lcGljKGFjdGlvbiQgPT4ge1xuICAgIGNvbnN0IGRlZmF1bHRQcm94eU9wdCA9IGRlZmF1bHRQcm94eU9wdGlvbnMocHJveHlQYXRoLCB0YXJnZXRVcmwpO1xuICAgIGNvbnN0IHByb3h5RXJyb3IkID0gbmV3IHJ4LlN1YmplY3Q8UGFyYW1ldGVyczwodHlwZW9mIGRlZmF1bHRQcm94eU9wdClbJ29uRXJyb3InXT4+KCk7XG4gICAgY29uc3QgcHJveHlSZXMkID0gbmV3IHJ4LlN1YmplY3Q8UGFyYW1ldGVyczwodHlwZW9mIGRlZmF1bHRQcm94eU9wdClbJ29uUHJveHlSZXMnXT4+KCk7XG5cbiAgICBsZXQgcHJveHlNaWRkbGV3YXJlJCA9IG5ldyByeC5SZXBsYXlTdWJqZWN0PFJldHVyblR5cGU8dHlwZW9mIHByb3h5Pj4oMSk7XG4gICAgY29uc3QgYWN0aW9ucyA9IGNhc3RCeUFjdGlvblR5cGUoY2FjaGVDb250cm9sbGVyLmFjdGlvbnMsIGFjdGlvbiQpO1xuXG4gICAgYXN5bmMgZnVuY3Rpb24gcmVxdWVzdGluZ1JlbW90ZShrZXk6IHN0cmluZywgcmVxSG9zdDogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcHJveHlSZXM6IEluY29taW5nTWVzc2FnZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlczogU2VydmVyUmVzcG9uc2UsIGhlYWRlcnM6IFtzdHJpbmcsIHN0cmluZyB8IHN0cmluZ1tdXVtdKSB7XG4gICAgICBodHRwUHJveHlMb2cuZGVidWcoJ2NhY2hlIHNpemU6JywgY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCkuY2FjaGVCeVVyaS5zaXplKTtcbiAgICAgIGNvbnN0IGRpciA9IFBhdGguam9pbihjYWNoZUNvbnRyb2xsZXIuZ2V0U3RhdGUoKS5jYWNoZURpciwga2V5KTtcbiAgICAgIGNvbnN0IGZpbGUgPSBQYXRoLmpvaW4oZGlyLCAnYm9keScpO1xuICAgICAgY29uc3Qgc3RhdHVzQ29kZSA9IHByb3h5UmVzLnN0YXR1c0NvZGUgfHwgMjAwO1xuICAgICAgY29uc3Qge3Jlc3BvbnNlVHJhbnNmb3JtZXJ9ID0gY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCk7XG4gICAgICBpZiAoc3RhdHVzQ29kZSA9PT0gMzA0KSB7XG4gICAgICAgIGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyLl9kb25lKHtrZXksIHJlcywgZGF0YToge1xuICAgICAgICAgICAgc3RhdHVzQ29kZSwgaGVhZGVycywgYm9keTogY3JlYXRlUmVwbGF5UmVhZGFibGVGYWN0b3J5KHByb3h5UmVzKVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGh0dHBQcm94eUxvZy53YXJuKCdWZXJzaW9uIGluZm8gaXMgbm90IHJlY29yZGVkLCBkdWUgdG8gcmVzcG9uc2UgMzA0IGZyb20nLCByZXMucmVxLnVybCwgJyxcXG4geW91IGNhbiByZW1vdmUgZXhpc3RpbmcgbnBtL2NhY2hlIGNhY2hlIHRvIGF2b2lkIDMwNCcpO1xuICAgICAgICByZXR1cm4gcnguRU1QVFk7XG4gICAgICB9XG5cbiAgICAgIGlmIChyZXNwb25zZVRyYW5zZm9ybWVyID09IG51bGwpIHtcbiAgICAgICAgY29uc3QgZG9uZU1rZGlyID0gZnMubWtkaXJwKGRpcik7XG4gICAgICAgIGNvbnN0IHJlYWRhYmxlRmFjID0gY3JlYXRlUmVwbGF5UmVhZGFibGVGYWN0b3J5KHByb3h5UmVzLCB1bmRlZmluZWQsXG4gICAgICAgICAge2RlYnVnSW5mbzoga2V5LCBleHBlY3RMZW46IHBhcnNlSW50KHByb3h5UmVzLmhlYWRlcnNbJ2NvbnRlbnQtbGVuZ3RoJ10gYXMgc3RyaW5nLCAxMCl9KTtcbiAgICAgICAgIC8vIGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyLl9kb25lKHtrZXksIGRhdGE6IHtcbiAgICAgICAgIC8vICAgICAgIHN0YXR1c0NvZGUsIGhlYWRlcnMsIGJvZHk6ICgpID0+IHByb3h5UmVzXG4gICAgICAgICAvLyAgICAgfSwgcmVzXG4gICAgICAgICAvLyAgIH0pO1xuICAgICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fc2F2aW5nRmlsZSh7a2V5LCBkYXRhOiB7XG4gICAgICAgICAgICBzdGF0dXNDb2RlLCBoZWFkZXJzLCBib2R5OiByZWFkYWJsZUZhY1xuICAgICAgICAgIH0sIHJlc1xuICAgICAgICB9KTtcbiAgICAgICAgYXdhaXQgZG9uZU1rZGlyO1xuICAgICAgICB2b2lkIGZzLnByb21pc2VzLndyaXRlRmlsZShcbiAgICAgICAgICBQYXRoLmpvaW4oZGlyLCAnaGVhZGVyLmpzb24nKSxcbiAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHtzdGF0dXNDb2RlLCBoZWFkZXJzfSwgbnVsbCwgJyAgJyksXG4gICAgICAgICAgJ3V0Zi04Jyk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiByZWFkYWJsZUZhYygpXG4gICAgICAgICAgICAucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbShmaWxlKSlcbiAgICAgICAgICAgIC5vbignZmluaXNoJywgcmVzb2x2ZSlcbiAgICAgICAgICAgIC5vbignZXJyb3InLCByZWplY3QpKTtcblxuICAgICAgICAgIGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyLl9kb25lKHtrZXksIGRhdGE6IHtcbiAgICAgICAgICAgICAgc3RhdHVzQ29kZSwgaGVhZGVycywgYm9keTogcmVhZGFibGVGYWNcbiAgICAgICAgICAgIH0sIHJlc1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgaHR0cFByb3h5TG9nLmluZm8oYHJlc3BvbnNlIGlzIHdyaXR0ZW4gdG8gKGxlbmd0aDogJHtoZWFkZXJzLmZpbmQoaXRlbSA9PiBpdGVtWzBdID09PSAnY29udGVudC1sZW5ndGgnKSFbMV0gYXMgc3RyaW5nfSlgLFxuICAgICAgICAgICAgUGF0aC5wb3NpeC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBmaWxlKSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBodHRwUHJveHlMb2cuZXJyb3IoJ0ZhaWxlZCB0byB3cml0ZSBjYWNoZSBmaWxlICcgK1xuICAgICAgICAgICAgUGF0aC5wb3NpeC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBmaWxlKSwgZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAocmVxSG9zdCAmJiAhcmVxSG9zdC5zdGFydHNXaXRoKCdodHRwJykpIHtcbiAgICAgICAgcmVxSG9zdCA9ICdodHRwOi8vJyArIHJlcUhvc3Q7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHtyZWFkYWJsZTogdHJhbnNmb3JtZWQsIGxlbmd0aH0gPSBhd2FpdCByZXNwb25zZVRyYW5zZm9ybWVyKGhlYWRlcnMsIHJlcUhvc3QsIHByb3h5UmVzKTtcbiAgICAgIGNvbnN0IGxlbmd0aEhlYWRlcklkeCA9IGhlYWRlcnMuZmluZEluZGV4KHJvdyA9PiByb3dbMF0gPT09ICdjb250ZW50LWxlbmd0aCcpO1xuICAgICAgaWYgKGxlbmd0aEhlYWRlcklkeCA+PSAwKVxuICAgICAgICBoZWFkZXJzW2xlbmd0aEhlYWRlcklkeF1bMV0gPSAnJyArIGxlbmd0aDtcblxuICAgICAgY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuX3NhdmluZ0ZpbGUoe2tleSwgcmVzLCBkYXRhOiB7XG4gICAgICAgICAgc3RhdHVzQ29kZSwgaGVhZGVycywgYm9keTogdHJhbnNmb3JtZWRcbiAgICAgIH0gfSk7XG5cbiAgICAgIGF3YWl0IGZzLm1rZGlycChkaXIpO1xuICAgICAgdm9pZCBmcy5wcm9taXNlcy53cml0ZUZpbGUoXG4gICAgICAgIFBhdGguam9pbihkaXIsICdoZWFkZXIuanNvbicpLFxuICAgICAgICBKU09OLnN0cmluZ2lmeSh7c3RhdHVzQ29kZSwgaGVhZGVyc30sIG51bGwsICcgICcpLFxuICAgICAgICAndXRmLTgnKTtcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHRyYW5zZm9ybWVkKClcbiAgICAgICAgLm9uKCdlbmQnLCByZXNvbHZlKVxuICAgICAgICAucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbShmaWxlKSlcbiAgICAgICAgLm9uKCdlcnJvcicsIHJlamVjdCkpO1xuXG4gICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fZG9uZSh7a2V5LCByZXMsIGRhdGE6IHtcbiAgICAgICAgICBzdGF0dXNDb2RlLCBoZWFkZXJzLCBib2R5OiB0cmFuc2Zvcm1lZFxuICAgICAgfSB9KTtcbiAgICAgIGh0dHBQcm94eUxvZy5pbmZvKCd3cml0ZSByZXNwb25zZSB0byBmaWxlJywgUGF0aC5wb3NpeC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBmaWxlKSwgJ3NpemUnLCBsZW5ndGgpO1xuICAgIH1cblxuICAgIHJldHVybiByeC5tZXJnZShcbiAgICAgIGFjdGlvbnMuY29uZmlndXJlUHJveHkucGlwZShcbiAgICAgICAgb3AubWFwKCh7cGF5bG9hZDogZXh0cmFPcHR9KSA9PiB7XG4gICAgICAgICAgcHJveHlNaWRkbGV3YXJlJC5uZXh0KHByb3h5KHtcbiAgICAgICAgICAgIC4uLmRlZmF1bHRQcm94eU9wdCxcbiAgICAgICAgICAgIGZvbGxvd1JlZGlyZWN0czogdHJ1ZSxcbiAgICAgICAgICAgIGxvZ0xldmVsOiBjb25maWcoKS5jbGlPcHRpb25zPy52ZXJib3NlID8gJ2RlYnVnJyA6XG4gICAgICAgICAgICAgICdpbmZvJyxcbiAgICAgICAgICAgIHByb3h5VGltZW91dDogMjAwMDAsXG4gICAgICAgICAgICAuLi5leHRyYU9wdCxcbiAgICAgICAgICAgIG9uUHJveHlSZXMoLi4uYXJncykge1xuICAgICAgICAgICAgICBpZiAoUkVESVJFQ1RfU1RBVFVTLmhhcyhhcmdzWzBdLnN0YXR1c0NvZGUgfHwgMjAwKSkge1xuICAgICAgICAgICAgICAgIGh0dHBQcm94eUxvZy5pbmZvKCdza2lwIHJlZGlyZWN0ZWQgcmVzcG9uc2UnKTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcHJveHlSZXMkLm5leHQoYXJncyk7XG4gICAgICAgICAgICAgIGRlZmF1bHRQcm94eU9wdC5vblByb3h5UmVzKC4uLmFyZ3MpO1xuICAgICAgICAgICAgICBpZiAoZXh0cmFPcHQub25Qcm94eVJlcylcbiAgICAgICAgICAgICAgICBleHRyYU9wdC5vblByb3h5UmVzKC4uLmFyZ3MpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG9uRXJyb3IoLi4uYXJncykge1xuICAgICAgICAgICAgICBkZWZhdWx0UHJveHlPcHQub25FcnJvciguLi5hcmdzKTtcbiAgICAgICAgICAgICAgcHJveHlFcnJvciQubmV4dChhcmdzKTtcbiAgICAgICAgICAgICAgaWYgKGV4dHJhT3B0Lm9uRXJyb3IpXG4gICAgICAgICAgICAgICAgZXh0cmFPcHQub25FcnJvciguLi5hcmdzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KSk7XG4gICAgICAgIH0pXG4gICAgICApLFxuICAgICAgYWN0aW9ucy5oaXRDYWNoZS5waXBlKFxuICAgICAgICBvcC5tZXJnZU1hcCggKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICAgIGNvbnN0IHdhaXRDYWNoZUFuZFNlbmRSZXMgPSByeC5yYWNlKGFjdGlvbnMuX2RvbmUsIGFjdGlvbnMuX3NhdmluZ0ZpbGUpLnBpcGUoXG4gICAgICAgICAgICBvcC5maWx0ZXIoYWN0aW9uID0+IGFjdGlvbi5wYXlsb2FkLmtleSA9PT0gcGF5bG9hZC5rZXkpLCAvLyBJbiBjYXNlIGl0IGlzIG9mIHJlZGlyZWN0ZWQgcmVxdWVzdCwgSFBNIGhhcyBkb25lIHBpcGluZyByZXNwb25zZSAoaWdub3JlZCBcIm1hbnVhbCByZXBvbnNlXCIgc2V0dGluZylcbiAgICAgICAgICAgIG9wLnRha2UoMSksXG4gICAgICAgICAgICBvcC5tZXJnZU1hcCgoe3BheWxvYWQ6IHtrZXksIHJlcywgZGF0YX19KSA9PiB7XG4gICAgICAgICAgICAgIGlmIChyZXMud3JpdGFibGVFbmRlZCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUmVzcG9uc2UgaXMgZW5kZWQgZWFybHksIHdoeT8nKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGRhdGEuaGVhZGVycykge1xuICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoZW50cnlbMF0sIGVudHJ5WzFdKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IGRhdGEuc3RhdHVzQ29kZTtcbiAgICAgICAgICAgICAgaHR0cFByb3h5TG9nLmluZm8oJ3JlcGx5IHRvJywgcGF5bG9hZC5rZXkpO1xuICAgICAgICAgICAgICBjb25zdCBwaXBlRXZlbnQkID0gbmV3IHJ4LlN1YmplY3Q8c3RyaW5nPigpO1xuICAgICAgICAgICAgICByZXMub24oJ2ZpbmlzaCcsICgpID0+IHtcbiAgICAgICAgICAgICAgICBwaXBlRXZlbnQkLm5leHQoJ2ZpbmlzaCcpO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAub24oJ2Nsb3NlJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHBpcGVFdmVudCQubmV4dCgnY2xvc2UnKTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgLm9uKCdlcnJvcicsIGVyciA9PiBwaXBlRXZlbnQkLmVycm9yKGVycikpO1xuXG4gICAgICAgICAgICAgIGRhdGEuYm9keSgpLnBpcGUocmVzKTtcbiAgICAgICAgICAgICAgcmV0dXJuIHBpcGVFdmVudCQucGlwZShcbiAgICAgICAgICAgICAgICBvcC5maWx0ZXIoZXZlbnQgPT4gZXZlbnQgPT09ICdmaW5pc2gnIHx8IGV2ZW50ID09PSAnY2xvc2UnKSxcbiAgICAgICAgICAgICAgICBvcC50YXAoZXZlbnQgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKGV2ZW50ID09PSAnY2xvc2UnKVxuICAgICAgICAgICAgICAgICAgICBodHRwUHJveHlMb2cuZXJyb3IoJ1Jlc3BvbnNlIGNvbm5lY3Rpb24gaXMgY2xvc2VkIGVhcmx5Jyk7XG4gICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgb3AudGFrZSgxKSxcbiAgICAgICAgICAgICAgICBvcC5tYXBUbyhrZXkpLFxuICAgICAgICAgICAgICAgIG9wLnRpbWVvdXQoMTIwMDAwKSxcbiAgICAgICAgICAgICAgICBvcC5jYXRjaEVycm9yKGVyciA9PiB7XG4gICAgICAgICAgICAgICAgICBpZiAoIXJlcy5oZWFkZXJzU2VudCkge1xuICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMDtcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZCgpO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZCgpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgcmV0dXJuIHJ4LkVNUFRZO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIG9wLm1hcChrZXkgPT4gaHR0cFByb3h5TG9nLmluZm8oYHJlcGxpZWQ6ICR7a2V5fWApKVxuICAgICAgICAgICk7XG4gICAgICAgICAgY29uc3QgaXRlbSA9IGNhY2hlQ29udHJvbGxlci5nZXRTdGF0ZSgpLmNhY2hlQnlVcmkuZ2V0KHBheWxvYWQua2V5KTtcbiAgICAgICAgICBodHRwUHJveHlMb2cuaW5mbygnaGl0Q2FjaGUgZm9yICcgKyBwYXlsb2FkLmtleSArICcsJyArIGl0ZW0pO1xuICAgICAgICAgIGlmIChpdGVtID09IG51bGwpIHtcbiAgICAgICAgICAgIGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyLl9sb2FkRnJvbVN0b3JhZ2UocGF5bG9hZCk7XG4gICAgICAgICAgICByZXR1cm4gd2FpdENhY2hlQW5kU2VuZFJlcztcbiAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0gPT09ICdsb2FkaW5nJyB8fCBpdGVtID09PSAncmVxdWVzdGluZycgfHwgaXRlbSA9PT0gJ3NhdmluZycpIHtcbiAgICAgICAgICAgIHJldHVybiB3YWl0Q2FjaGVBbmRTZW5kUmVzO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBodHRwUHJveHlMb2cuaW5mbygnaGl0IGNhY2hlZCcsIHBheWxvYWQua2V5KTtcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zZm9ybWVyID0gY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCkuY2FjaGVUcmFuc2Zvcm1lcjtcbiAgICAgICAgICAgIGlmICh0cmFuc2Zvcm1lciA9PSBudWxsKSB7XG4gICAgICAgICAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgaXRlbS5oZWFkZXJzKSB7XG4gICAgICAgICAgICAgICAgcGF5bG9hZC5yZXMuc2V0SGVhZGVyKGVudHJ5WzBdLCBlbnRyeVsxXSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcGF5bG9hZC5yZXMuc3RhdHVzKGl0ZW0uc3RhdHVzQ29kZSk7XG4gICAgICAgICAgICAgIHJldHVybiBuZXcgcnguT2JzZXJ2YWJsZTx2b2lkPihzdWIgPT4ge1xuICAgICAgICAgICAgICAgIGl0ZW0uYm9keSgpXG4gICAgICAgICAgICAgICAgLm9uKCdlbmQnLCAoKSA9PiB7c3ViLm5leHQoKTsgc3ViLmNvbXBsZXRlKCk7IH0pXG4gICAgICAgICAgICAgICAgLnBpcGUocGF5bG9hZC5yZXMpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHJ4LmZyb20odHJhbnNmb3JtZXIoaXRlbS5oZWFkZXJzLCBwYXlsb2FkLnJlcS5oZWFkZXJzLmhvc3QsIGl0ZW0uYm9keSgpKSkucGlwZShcbiAgICAgICAgICAgICAgb3AudGFrZSgxKSxcbiAgICAgICAgICAgICAgb3AubWVyZ2VNYXAoKHtyZWFkYWJsZSwgbGVuZ3RofSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGxlbmd0aEhlYWRlcklkeCA9IGl0ZW0uaGVhZGVycy5maW5kSW5kZXgocm93ID0+IHJvd1swXSA9PT0gJ2NvbnRlbnQtbGVuZ3RoJyk7XG4gICAgICAgICAgICAgICAgaWYgKGxlbmd0aEhlYWRlcklkeCA+PSAwKVxuICAgICAgICAgICAgICAgICAgaXRlbS5oZWFkZXJzW2xlbmd0aEhlYWRlcklkeF1bMV0gPSAnJyArIGxlbmd0aDtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGl0ZW0uaGVhZGVycykge1xuICAgICAgICAgICAgICAgICAgcGF5bG9hZC5yZXMuc2V0SGVhZGVyKGVudHJ5WzBdLCBlbnRyeVsxXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHBheWxvYWQucmVzLnN0YXR1cyhpdGVtLnN0YXR1c0NvZGUpO1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgcnguT2JzZXJ2YWJsZTx2b2lkPihzdWIgPT4ge1xuICAgICAgICAgICAgICAgICAgcmVhZGFibGUoKS5vbignZW5kJywgKCkgPT4gc3ViLmNvbXBsZXRlKCkpXG4gICAgICAgICAgICAgICAgICAgIC5waXBlKHBheWxvYWQucmVzKVxuICAgICAgICAgICAgICAgICAgICAub24oJ2Vycm9yJywgZXJyID0+IHN1Yi5lcnJvcihlcnIpKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICB9KSxcbiAgICAgICAgb3AuY2F0Y2hFcnJvcihlcnIgPT4ge1xuICAgICAgICAgIGh0dHBQcm94eUxvZy5lcnJvcignRmFpbGVkIHRvIHdyaXRlIHJlc3BvbnNlJywgZXJyKTtcbiAgICAgICAgICByZXR1cm4gcnguRU1QVFk7XG4gICAgICAgIH0pXG4gICAgICApLFxuICAgICAgYWN0aW9ucy5fbG9hZEZyb21TdG9yYWdlLnBpcGUoXG4gICAgICAgIG9wLm1lcmdlTWFwKGFzeW5jICh7cGF5bG9hZH0pID0+IHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgZGlyID0gUGF0aC5qb2luKGNhY2hlQ29udHJvbGxlci5nZXRTdGF0ZSgpLmNhY2hlRGlyLCBwYXlsb2FkLmtleSk7XG4gICAgICAgICAgICBjb25zdCBoRmlsZSA9IFBhdGguam9pbihkaXIsICdoZWFkZXIuanNvbicpO1xuICAgICAgICAgICAgY29uc3QgYkZpbGUgPSBQYXRoLmpvaW4oZGlyLCAnYm9keScpO1xuICAgICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoaEZpbGUpKSB7XG4gICAgICAgICAgICAgIGh0dHBQcm94eUxvZy5pbmZvKCdsb2FkJywgcGF5bG9hZC5rZXkpO1xuICAgICAgICAgICAgICBjb25zdCB0cmFuc2Zvcm1lciA9IGNhY2hlQ29udHJvbGxlci5nZXRTdGF0ZSgpLmNhY2hlVHJhbnNmb3JtZXI7XG4gICAgICAgICAgICAgIGlmICh0cmFuc2Zvcm1lciA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyc1N0ciA9IGF3YWl0IGZzLnByb21pc2VzLnJlYWRGaWxlKGhGaWxlLCAndXRmLTgnKTtcbiAgICAgICAgICAgICAgICBjb25zdCB7c3RhdHVzQ29kZSwgaGVhZGVyc30gPSBKU09OLnBhcnNlKGhlYWRlcnNTdHIpIGFzIHtzdGF0dXNDb2RlOiBudW1iZXI7IGhlYWRlcnM6IFtzdHJpbmcsIHN0cmluZyB8IHN0cmluZ1tdXVtdfTtcblxuICAgICAgICAgICAgICAgIGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyLl9kb25lKHtrZXk6IHBheWxvYWQua2V5LCByZXM6IHBheWxvYWQucmVzLFxuICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXNDb2RlLFxuICAgICAgICAgICAgICAgICAgICBoZWFkZXJzLFxuICAgICAgICAgICAgICAgICAgICBib2R5OiAoKSA9PiBmcy5jcmVhdGVSZWFkU3RyZWFtKGJGaWxlKVxuICAgICAgICAgICAgICAgICAgfX0pO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGNvbnN0IGhlYWRlcnNTdHIgPSBhd2FpdCBmcy5wcm9taXNlcy5yZWFkRmlsZShoRmlsZSwgJ3V0Zi04Jyk7XG4gICAgICAgICAgICAgIGNvbnN0IHtzdGF0dXNDb2RlLCBoZWFkZXJzfSA9IEpTT04ucGFyc2UoaGVhZGVyc1N0cikgYXMge3N0YXR1c0NvZGU6IG51bWJlcjsgaGVhZGVyczogW3N0cmluZywgc3RyaW5nIHwgc3RyaW5nW11dW119O1xuICAgICAgICAgICAgICBjb25zdCB7cmVhZGFibGUsIGxlbmd0aH0gPSBhd2FpdCB0cmFuc2Zvcm1lcihoZWFkZXJzLCBwYXlsb2FkLnJlcS5oZWFkZXJzLmhvc3QsIGZzLmNyZWF0ZVJlYWRTdHJlYW0oYkZpbGUpKTtcbiAgICAgICAgICAgICAgY29uc3QgbGVuZ3RoSGVhZGVySWR4ID0gaGVhZGVycy5maW5kSW5kZXgocm93ID0+IHJvd1swXSA9PT0gJ2NvbnRlbnQtbGVuZ3RoJyk7XG4gICAgICAgICAgICAgIGlmIChsZW5ndGhIZWFkZXJJZHggPj0gMClcbiAgICAgICAgICAgICAgICBoZWFkZXJzW2xlbmd0aEhlYWRlcklkeF1bMV0gPSAnJyArIGxlbmd0aDtcblxuICAgICAgICAgICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fZG9uZSh7a2V5OiBwYXlsb2FkLmtleSxcbiAgICAgICAgICAgICAgICByZXM6IHBheWxvYWQucmVzLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgIHN0YXR1c0NvZGUsXG4gICAgICAgICAgICAgICAgICBoZWFkZXJzLFxuICAgICAgICAgICAgICAgICAgYm9keTogcmVhZGFibGVcbiAgICAgICAgICAgICAgICB9fSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBodHRwUHJveHlMb2cuaW5mbygnTm8gZXhpc3RpbmcgZmlsZSBmb3InLCBwYXlsb2FkLmtleSk7XG4gICAgICAgICAgICAgIGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyLl9yZXF1ZXN0UmVtb3RlKHBheWxvYWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICAgICAgICBodHRwUHJveHlMb2cuZXJyb3IoJ0ZhaWxlZCB0byBzYXZlIGNhY2hlIGZvcjogJyArIHBheWxvYWQua2V5LCBleCk7XG4gICAgICAgICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fY2xlYW4ocGF5bG9hZC5rZXkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICksXG4gICAgICBhY3Rpb25zLl9yZXF1ZXN0UmVtb3RlLnBpcGUoXG4gICAgICAgIG9wLm1lcmdlTWFwKCh7cGF5bG9hZH0pID0+IHJ4Lm1lcmdlKFxuICAgICAgICAgIHJ4LnJhY2UoXG4gICAgICAgICAgICBwcm94eVJlcyQucGlwZShcbiAgICAgICAgICAgICAgb3AuZmlsdGVyKChbLCAsIHJlc10pID0+IHJlcyA9PT0gcGF5bG9hZC5yZXMpLFxuICAgICAgICAgICAgICBvcC50YWtlKDEpLFxuICAgICAgICAgICAgICBvcC5tZXJnZU1hcCgoW3Byb3h5UmVzLCBvcmlnUmVxLCBzZXJ2ZXJSZXNdKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJ4LmRlZmVyKCgpID0+IHJlcXVlc3RpbmdSZW1vdGUocGF5bG9hZC5rZXksIHBheWxvYWQucmVxLmhlYWRlcnMuaG9zdCwgcHJveHlSZXMsIHNlcnZlclJlcyxcbiAgICAgICAgICAgICAgICAgIE9iamVjdC5lbnRyaWVzKHByb3h5UmVzLmhlYWRlcnMpXG4gICAgICAgICAgICAgICAgICAuZmlsdGVyKGVudHJ5ID0+IGVudHJ5WzFdICE9IG51bGwpIGFzIFtzdHJpbmcsIHN0cmluZyB8IHN0cmluZ1tdXVtdKSlcbiAgICAgICAgICAgICAgICAucGlwZShcbiAgICAgICAgICAgICAgICAgIG9wLnRpbWVvdXQoMTUwMDApXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICksXG4gICAgICAgICAgICBwcm94eUVycm9yJC5waXBlKFxuICAgICAgICAgICAgICBvcC5maWx0ZXIoKFtlcnIsIG9yaWdSZXEsIHNlcnZlclJlc10pID0+IHNlcnZlclJlcyA9PT0gcGF5bG9hZC5yZXMpLFxuICAgICAgICAgICAgICBvcC50YWtlKDEpLFxuICAgICAgICAgICAgICBvcC5tYXAoKFtlcnJdKSA9PiB7XG4gICAgICAgICAgICAgICAgaHR0cFByb3h5TG9nLmVycm9yKCdIUE0gZXJyb3InLCBlcnIpO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgKVxuICAgICAgICAgICksXG4gICAgICAgICAgcHJveHlNaWRkbGV3YXJlJC5waXBlKFxuICAgICAgICAgICAgb3AudGFrZSgxKSxcbiAgICAgICAgICAgIG9wLm1hcChwcm94eSA9PiBwcm94eShwYXlsb2FkLnJlcSwgcGF5bG9hZC5yZXMsIHBheWxvYWQubmV4dCkpXG4gICAgICAgICAgKVxuICAgICAgICApKVxuICAgICAgKVxuICAgICkucGlwZShcbiAgICAgIG9wLmlnbm9yZUVsZW1lbnRzKCksXG4gICAgICBvcC5jYXRjaEVycm9yKChlcnIsIHNyYykgPT4ge1xuICAgICAgICBodHRwUHJveHlMb2cuZXJyb3IoJ0hUVFAgcHJveHkgY2FjaGUgZXJyb3InLCBlcnIpO1xuICAgICAgICByZXR1cm4gc3JjO1xuICAgICAgfSlcbiAgICApO1xuICB9KTtcblxuICByZXR1cm4gY2FjaGVDb250cm9sbGVyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24ga2V5T2ZVcmkobWV0aG9kOiBzdHJpbmcsIHBhdGg6IHN0cmluZykge1xuICBjb25zdCB1cmwgPSBuZXcgVVJMKCdodHRwOi8vZi5jb20nICsgcGF0aCk7XG4gIGNvbnN0IGtleSA9IG1ldGhvZCArIHVybC5wYXRobmFtZSArICh1cmwuc2VhcmNoID8gJy8nICsgXy50cmltU3RhcnQodXJsLnNlYXJjaCwgJz8nKSA6ICcnKTtcbiAgcmV0dXJuIGtleTtcbn1cbiJdfQ==