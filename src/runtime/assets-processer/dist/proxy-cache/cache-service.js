"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
const http_proxy_1 = require("http-proxy");
const chalk_1 = __importDefault(require("chalk"));
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
        cacheDir: cacheRootDir,
        cacheByUri: new Map(),
        memCacheLength: opts.memCacheLength == null ? Number.MAX_VALUE : opts.memCacheLength
    };
    const proxy$ = (0, http_proxy_observable_1.httpProxyObservable)(defaultProxy);
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
        const dispatcher = cacheController.actionDispatcher;
        async function requestingRemote(key, reqHost, proxyRes, res, headers) {
            httpProxyLog.debug('cache size:', cacheController.getState().cacheByUri.size);
            const dir = path_1.default.join(cacheController.getState().cacheDir, key);
            const file = path_1.default.join(dir, 'body');
            const statusCode = proxyRes.statusCode || 200;
            const { responseTransformer } = cacheController.getState();
            if (statusCode === 304) {
                dispatcher._done({ key, res, data: {
                        statusCode, headers, body: (0, utils_1.createReplayReadableFactory)(proxyRes)
                    }
                });
                httpProxyLog.warn('Version info is not recorded, due to response 304 from', res.req.url, ',\n you can remove existing npm/cache cache to avoid 304');
                return;
            }
            if (statusCode !== 200) {
                httpProxyLog.error(`Response code is ${statusCode} for request:`, res.req.url);
                dispatcher._done({ key, res, data: { statusCode, headers, body: () => proxyRes } });
                return;
            }
            if (responseTransformer == null) {
                const doneMkdir = fs_extra_1.default.mkdirp(dir);
                const readableFac = (0, utils_1.createReplayReadableFactory)(proxyRes, undefined, { debugInfo: key, expectLen: parseInt(proxyRes.headers['content-length'], 10) });
                // dispatcher._done({key, data: {
                //       statusCode, headers, body: () => proxyRes
                //     }, res
                //   });
                dispatcher._savingFile({ key, data: {
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
                    dispatcher._done({ key, data: {
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
            dispatcher._savingFile({ key, res, data: {
                    statusCode, headers, body: transformed
                } });
            await fs_extra_1.default.mkdirp(dir);
            void fs_extra_1.default.promises.writeFile(path_1.default.join(dir, 'header.json'), JSON.stringify({ statusCode, headers }, null, '  '), 'utf-8');
            await new Promise((resolve, reject) => transformed()
                .on('end', resolve)
                .pipe(fs_extra_1.default.createWriteStream(file))
                .on('error', reject));
            dispatcher._done({ key, res, data: {
                    statusCode, headers, body: transformed
                } });
            httpProxyLog.info('write response to file', path_1.default.posix.relative(process.cwd(), file), 'size', length);
        }
        return rx.merge(actions.hitCache.pipe(op.mergeMap(({ payload }) => {
            const waitCacheAndSendRes = actions._done.pipe(
            // In case it is of redirected request, HPM has done piping response (ignored "manual reponse" setting)
            op.filter(action => action.payload.key === payload.key), op.take(1), op.mergeMap(({ payload: { key, res, data } }) => {
                if (res.writableEnded) {
                    throw new Error('Response is ended early, why?');
                }
                for (const entry of data.headers) {
                    res.setHeader(entry[0], entry[1]);
                }
                res.statusCode = data.statusCode;
                const pipeEvent$ = new rx.Subject();
                res.on('finish', () => {
                    pipeEvent$.next('finish');
                })
                    .on('close', () => {
                    pipeEvent$.next('close');
                })
                    .on('error', err => pipeEvent$.error(err));
                data.body().pipe(res);
                httpProxyLog.info('pipe response of', payload.key);
                return pipeEvent$.pipe(op.filter(event => event === 'finish' || event === 'close'), op.tap(event => {
                    if (event === 'close')
                        httpProxyLog.error('Response connection is closed early', key, 'expect content-lenth', data.headers['content-length']);
                }), op.take(1), op.mapTo(key)
                // op.timeout(120000),
                // op.catchError(err => {
                // httpProxyLog.error(err);
                // if (!res.headersSent) {
                // res.statusCode = 500;
                // res.end();
                // } else {
                // res.end();
                // }
                // return rx.EMPTY;
                // })
                );
            }), op.tap(key => httpProxyLog.info(`replied: ${key}`)));
            const item = cacheController.getState().cacheByUri.get(payload.key);
            httpProxyLog.info('hitCache for ' + payload.key);
            let finished$;
            if (item == null) {
                finished$ = rx.merge(waitCacheAndSendRes, rx.defer(() => {
                    dispatcher._loadFromStorage(payload);
                    return rx.EMPTY;
                }));
            }
            else if (item === 'loading' || item === 'requesting' || item === 'saving') {
                finished$ = waitCacheAndSendRes;
            }
            else {
                httpProxyLog.info('hit cached', payload.key);
                const transformer = cacheController.getState().cacheTransformer;
                if (transformer == null) {
                    for (const entry of item.headers) {
                        payload.res.setHeader(entry[0], entry[1]);
                    }
                    payload.res.status(item.statusCode);
                    finished$ = new rx.Observable(sub => {
                        item.body()
                            .on('end', () => { sub.next(); sub.complete(); })
                            .pipe(payload.res);
                    });
                }
                else {
                    finished$ = rx.from(transformer(item.headers, payload.req.headers.host, item.body())).pipe(op.take(1), op.mergeMap(({ readable, length }) => {
                        const lengthHeaderIdx = item.headers.findIndex(row => row[0] === 'content-length');
                        if (lengthHeaderIdx >= 0)
                            item.headers[lengthHeaderIdx][1] = '' + length;
                        for (const entry of item.headers) {
                            payload.res.setHeader(entry[0], entry[1]);
                        }
                        payload.res.status(item.statusCode);
                        return stream_1.default.promises.pipeline(readable(), payload.res);
                    }));
                }
            }
            return rx.timer(5000, 5000).pipe(op.takeUntil(finished$), op.map(idx => {
                const item = cacheController.getState().cacheByUri.get(payload.key);
                httpProxyLog.info(`${chalk_1.default.blue(payload.key)} [${typeof item === 'string' ? item : 'cached'}] has been processed for ${chalk_1.default.yellow((idx + 1) * 5 + 's')}`);
                return item;
            }), op.count(), op.tap(() => httpProxyLog.info(`${chalk_1.default.green(payload.key)} is finished`)), op.timeout(60000), op.catchError((err) => {
                httpProxyLog.error('Failed to write response', err);
                return rx.EMPTY;
            }));
        }, 5)), actions._loadFromStorage.pipe(op.mergeMap(async ({ payload }) => {
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
                        dispatcher._done({ key: payload.key, res: payload.res,
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
                    dispatcher._done({ key: payload.key,
                        res: payload.res,
                        data: {
                            statusCode,
                            headers,
                            body: readable
                        } });
                }
                else {
                    httpProxyLog.info('No existing file for', payload.key);
                    dispatcher._requestRemote(payload);
                }
            }
            catch (ex) {
                httpProxyLog.error('Failed to save cache for: ' + payload.key, ex);
                dispatcher._clean(payload.key);
            }
        })), actions._requestRemote.pipe(op.mergeMap(({ payload }) => {
            const proxyOpts = {};
            if (payload.target) {
                proxyOpts.target = payload.target;
                proxyOpts.ignorePath = true;
            }
            return rx.defer(() => {
                cacheController.getState().proxy.web(payload.req, payload.res, proxyOpts);
                return (0, http_proxy_observable_1.observeProxyResponse)(proxy$, payload.res);
            }).pipe(op.mergeMap(({ payload: [proxyRes, _req, res] }) => {
                return requestingRemote(payload.key, payload.req.headers.host, proxyRes, res, Object.entries(proxyRes.headers).filter(entry => entry[1] != null));
            }), op.catchError(err => {
                httpProxyLog.warn(`Retry "${payload.req.url}"`, err);
                return rx.timer(1000).pipe(op.mapTo(rx.throwError(err)));
            }), op.retry(3));
        })), proxy$.proxyReq.pipe(op.tap(({ payload: [proxyReq, req, res, opts] }) => {
            const target = opts.target;
            httpProxyLog.info('Request', target.hostname, target.pathname);
        })), proxy$.econnreset.pipe(op.tap(({ payload: [err] }) => {
            httpProxyLog.info('econnreset', err);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGUtc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNhY2hlLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnREFBd0I7QUFFeEIsb0RBQTRCO0FBRTVCLHdEQUEwQjtBQUMxQix5Q0FBMkI7QUFDM0IsbURBQXFDO0FBQ3JDLG9EQUF1QjtBQUV2QiwyQ0FBNEQ7QUFDNUQsa0RBQTBCO0FBQzFCLHNEQUEwQjtBQUMxQixzQ0FBNEM7QUFDNUMseUVBQXlFO0FBQ3pFLDhGQUFvRztBQUNwRyxvQ0FBcUQ7QUFDckQsb0VBQW1GO0FBSW5GLE1BQU0sWUFBWSxHQUFHLElBQUEsZ0JBQVEsRUFBQyxVQUFVLENBQUMsQ0FBQztBQUUxQyxTQUFnQixvQkFBb0IsQ0FBQyxTQUFpQixFQUFFLGFBQTRCLEVBQUUsWUFBb0IsRUFDekYsT0FBbUQsRUFBQyxNQUFNLEVBQUUsS0FBSyxFQUFDOztJQUNqRixNQUFNLFlBQVksR0FBRyxJQUFBLDhCQUFpQixrQkFDcEMsWUFBWSxFQUFFLElBQUksRUFDbEIsRUFBRSxFQUFFLEtBQUssRUFDVCxNQUFNLEVBQUUsS0FBSyxFQUNiLG1CQUFtQixFQUFFLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUNoQyxlQUFlLEVBQUUsSUFBSSxFQUNyQixZQUFZLEVBQUUsS0FBSyxFQUNuQixPQUFPLEVBQUUsS0FBSyxJQUNYLGFBQWEsRUFDaEIsQ0FBQztJQUNILE1BQU0sWUFBWSxHQUFvQjtRQUNwQyxLQUFLLEVBQUUsWUFBWTtRQUNuQixRQUFRLEVBQUUsWUFBWTtRQUN0QixVQUFVLEVBQUUsSUFBSSxHQUFHLEVBQUU7UUFDckIsY0FBYyxFQUFFLElBQUksQ0FBQyxjQUFjLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsY0FBYztLQUNyRixDQUFDO0lBRUYsTUFBTSxN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LENBQUMsQ0FDSCxDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7SUFFSCxPQUFPLGVBQWUsQ0FBQztBQUN6QixDQUFDO0FBN1lELG9EQTZZQztBQUVELFNBQWdCLFFBQVEsQ0FBQyxNQUFjLEVBQUUsSUFBWTtJQUNuRCxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDM0MsTUFBTSxHQUFHLEdBQUcsTUFBTSxHQUFHLEdBQUcsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsZ0JBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDM0YsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBSkQsNEJBSUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IEluY29taW5nTWVzc2FnZSwgU2VydmVyUmVzcG9uc2UgfSBmcm9tICdodHRwJztcbmltcG9ydCBzdHJlYW0gZnJvbSAnc3RyZWFtJztcbmltcG9ydCB1cmwgZnJvbSAndXJsJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge1JlcXVlc3QsIFJlc3BvbnNlLCBOZXh0RnVuY3Rpb259IGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IHtTZXJ2ZXJPcHRpb25zLCBjcmVhdGVQcm94eVNlcnZlcn0gZnJvbSAnaHR0cC1wcm94eSc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IGFwaSBmcm9tICdfX3BsaW5rJztcbmltcG9ydCB7bG9nNEZpbGUsIGNvbmZpZ30gZnJvbSAnQHdmaC9wbGluayc7XG4vLyBpbXBvcnQgeyBjcmVhdGVQcm94eU1pZGRsZXdhcmUgYXMgcHJveHl9IGZyb20gJ2h0dHAtcHJveHktbWlkZGxld2FyZSc7XG5pbXBvcnQge2NyZWF0ZVNsaWNlLCBjYXN0QnlBY3Rpb25UeXBlfSBmcm9tICdAd2ZoL3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZS9kaXN0L3RpbnktcmVkdXgtdG9vbGtpdCc7XG5pbXBvcnQge2NyZWF0ZVJlcGxheVJlYWRhYmxlRmFjdG9yeX0gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHtodHRwUHJveHlPYnNlcnZhYmxlLCBvYnNlcnZlUHJveHlSZXNwb25zZX0gZnJvbSAnLi4vaHR0cC1wcm94eS1vYnNlcnZhYmxlJztcbmltcG9ydCB7UHJveHlDYWNoZVN0YXRlLCBDYWNoZURhdGF9IGZyb20gJy4vdHlwZXMnO1xuXG5cbmNvbnN0IGh0dHBQcm94eUxvZyA9IGxvZzRGaWxlKF9fZmlsZW5hbWUpO1xuXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlUHJveHlXaXRoQ2FjaGUocHJveHlQYXRoOiBzdHJpbmcsIHNlcnZlck9wdGlvbnM6IFNlcnZlck9wdGlvbnMsIGNhY2hlUm9vdERpcjogc3RyaW5nLFxuICAgICAgICAgICAgICAgICBvcHRzOiB7bWFudWFsOiBib29sZWFuOyBtZW1DYWNoZUxlbmd0aD86IG51bWJlcn0gPSB7bWFudWFsOiBmYWxzZX0pIHtcbiAgY29uc3QgZGVmYXVsdFByb3h5ID0gY3JlYXRlUHJveHlTZXJ2ZXIoe1xuICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICB3czogZmFsc2UsXG4gICAgc2VjdXJlOiBmYWxzZSxcbiAgICBjb29raWVEb21haW5SZXdyaXRlOiB7ICcqJzogJycgfSxcbiAgICBmb2xsb3dSZWRpcmVjdHM6IHRydWUsXG4gICAgcHJveHlUaW1lb3V0OiAyMDAwMCxcbiAgICB0aW1lb3V0OiAxMDAwMCxcbiAgICAuLi5zZXJ2ZXJPcHRpb25zXG4gIH0pO1xuICBjb25zdCBpbml0aWFsU3RhdGU6IFByb3h5Q2FjaGVTdGF0ZSA9IHtcbiAgICBwcm94eTogZGVmYXVsdFByb3h5LFxuICAgIGNhY2hlRGlyOiBjYWNoZVJvb3REaXIsXG4gICAgY2FjaGVCeVVyaTogbmV3IE1hcCgpLFxuICAgIG1lbUNhY2hlTGVuZ3RoOiBvcHRzLm1lbUNhY2hlTGVuZ3RoID09IG51bGwgPyBOdW1iZXIuTUFYX1ZBTFVFIDogb3B0cy5tZW1DYWNoZUxlbmd0aFxuICB9O1xuXG4gIGNvbnN0IHByb3h5JCA9IGh0dHBQcm94eU9ic2VydmFibGUoZGVmYXVsdFByb3h5KTtcblxuICBpZiAoIW9wdHMubWFudWFsKSB7XG4gICAgYXBpLmV4cHJlc3NBcHBTZXQoYXBwID0+IHtcbiAgICAgIGFwcC51c2UocHJveHlQYXRoLCAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICAgICAgY29uc3Qga2V5ID0ga2V5T2ZVcmkocmVxLm1ldGhvZCwgcmVxLnVybCk7XG4gICAgICAgIGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyLmhpdENhY2hlKHtrZXksIHJlcSwgcmVzLCBuZXh0fSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuICBjb25zdCBjYWNoZUNvbnRyb2xsZXIgPSBjcmVhdGVTbGljZSh7XG4gICAgaW5pdGlhbFN0YXRlLFxuICAgIG5hbWU6IGBIVFRQLXByb3h5LWNhY2hlLSR7cHJveHlQYXRofWAgLFxuICAgIGRlYnVnQWN0aW9uT25seTogY29uZmlnKCkuY2xpT3B0aW9ucz8udmVyYm9zZSxcbiAgICByZWR1Y2Vyczoge1xuICAgICAgY29uZmlnVHJhbnNmb3JtZXIoczogUHJveHlDYWNoZVN0YXRlLCBwYXlsb2FkOiB7XG4gICAgICAgIHJlbW90ZT86IFByb3h5Q2FjaGVTdGF0ZVsncmVzcG9uc2VUcmFuc2Zvcm1lciddO1xuICAgICAgICBjYWNoZWQ/OiBQcm94eUNhY2hlU3RhdGVbJ2NhY2hlVHJhbnNmb3JtZXInXTtcbiAgICAgIH0pIHtcbiAgICAgICAgaWYgKHBheWxvYWQucmVtb3RlKVxuICAgICAgICAgIHMucmVzcG9uc2VUcmFuc2Zvcm1lciA9IHBheWxvYWQucmVtb3RlO1xuICAgICAgICBpZiAocGF5bG9hZC5jYWNoZWQpXG4gICAgICAgICAgcy5jYWNoZVRyYW5zZm9ybWVyID0gcGF5bG9hZC5jYWNoZWQ7XG4gICAgICB9LFxuICAgICAgaGl0Q2FjaGUoczogUHJveHlDYWNoZVN0YXRlLCBwYXlsb2FkOiB7XG4gICAgICAgIGtleTogc3RyaW5nOyByZXE6IFJlcXVlc3Q7IHJlczogUmVzcG9uc2U7IG5leHQ6IE5leHRGdW5jdGlvbjtcbiAgICAgICAgLyoqIG92ZXJyaWRlIHJlbW90ZSB0YXJnZXQgKi9cbiAgICAgICAgdGFyZ2V0Pzogc3RyaW5nO1xuICAgICAgfSkge30sXG5cbiAgICAgIF9yZXF1ZXN0UmVtb3RlRG9uZShzOiBQcm94eUNhY2hlU3RhdGUsIHBheWxvYWQ6IHtcbiAgICAgICAga2V5OiBzdHJpbmc7IHJlcUhvc3Q6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgcmVzOiBTZXJ2ZXJSZXNwb25zZTtcbiAgICAgICAgZGF0YToge2hlYWRlcnM6IENhY2hlRGF0YVsnaGVhZGVycyddOyByZWFkYWJsZTogSW5jb21pbmdNZXNzYWdlfTtcbiAgICAgIH0pIHt9LFxuXG4gICAgICBfbG9hZEZyb21TdG9yYWdlKHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDoge2tleTogc3RyaW5nOyByZXE6IFJlcXVlc3Q7IHJlczogUmVzcG9uc2U7XG4gICAgICAgICAgICAgICAgICAgICAgIG5leHQ6IE5leHRGdW5jdGlvbjtcbiAgICAgICAgdGFyZ2V0Pzogc3RyaW5nOyB9KSB7XG4gICAgICAgIHMuY2FjaGVCeVVyaS5zZXQocGF5bG9hZC5rZXksICdsb2FkaW5nJyk7XG4gICAgICB9LFxuXG4gICAgICBfcmVxdWVzdFJlbW90ZShzOiBQcm94eUNhY2hlU3RhdGUsIHBheWxvYWQ6IHtrZXk6IHN0cmluZzsgcmVxOiBSZXF1ZXN0OyByZXM6IFJlc3BvbnNlOyBuZXh0OiBOZXh0RnVuY3Rpb247XG4gICAgICAgIHRhcmdldD86IHN0cmluZzsgfSkge1xuICAgICAgICBzLmNhY2hlQnlVcmkuc2V0KHBheWxvYWQua2V5LCAncmVxdWVzdGluZycpO1xuICAgICAgfSxcbiAgICAgIF9zYXZpbmdGaWxlKHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDoge1xuICAgICAgICBrZXk6IHN0cmluZztcbiAgICAgICAgcmVzOiBTZXJ2ZXJSZXNwb25zZTtcbiAgICAgICAgZGF0YTogQ2FjaGVEYXRhO1xuICAgICAgfSkge1xuICAgICAgICBzLmNhY2hlQnlVcmkuc2V0KHBheWxvYWQua2V5LCAnc2F2aW5nJyk7XG4gICAgICB9LFxuICAgICAgX2RvbmUoczogUHJveHlDYWNoZVN0YXRlLCBwYXlsb2FkOiB7XG4gICAgICAgIGtleTogc3RyaW5nO1xuICAgICAgICByZXM6IFNlcnZlclJlc3BvbnNlO1xuICAgICAgICBkYXRhOiBDYWNoZURhdGE7XG4gICAgICB9KSB7XG4gICAgICAgIHMuY2FjaGVCeVVyaS5kZWxldGUocGF5bG9hZC5rZXkpO1xuICAgICAgICAvLyBpZiAocGF5bG9hZC5kYXRhLnN0YXR1c0NvZGUgIT09IDMwNCkge1xuICAgICAgICAvLyAgIGlmIChzLmNhY2hlQnlVcmkuc2l6ZSA+PSBzLm1lbUNhY2hlTGVuZ3RoKSB7XG4gICAgICAgIC8vICAgICAvLyBUT0RPOiBpbXByb3ZlIGZvciBMUlUgYWxnb3JpZ3RobVxuICAgICAgICAvLyAgICAgcy5jYWNoZUJ5VXJpLmRlbGV0ZShwYXlsb2FkLmtleSk7XG4gICAgICAgIC8vICAgICByZXR1cm47XG4gICAgICAgIC8vICAgfVxuICAgICAgICAvLyAgIHMuY2FjaGVCeVVyaS5zZXQocGF5bG9hZC5rZXksIHBheWxvYWQuZGF0YSk7XG4gICAgICAgIC8vIH1cbiAgICAgIH0sXG4gICAgICBfY2xlYW4oczogUHJveHlDYWNoZVN0YXRlLCBrZXk6IHN0cmluZykge1xuICAgICAgICBzLmNhY2hlQnlVcmkuZGVsZXRlKGtleSk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcblxuICBjYWNoZUNvbnRyb2xsZXIuZXBpYyhhY3Rpb24kID0+IHtcbiAgICBjb25zdCBhY3Rpb25zID0gY2FzdEJ5QWN0aW9uVHlwZShjYWNoZUNvbnRyb2xsZXIuYWN0aW9ucywgYWN0aW9uJCk7XG4gICAgY29uc3QgZGlzcGF0Y2hlciA9IGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyO1xuXG4gICAgYXN5bmMgZnVuY3Rpb24gcmVxdWVzdGluZ1JlbW90ZShcbiAgICAgIGtleTogc3RyaW5nLCByZXFIb3N0OiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICAgICBwcm94eVJlczogSW5jb21pbmdNZXNzYWdlLFxuICAgICAgcmVzOiBTZXJ2ZXJSZXNwb25zZSxcbiAgICAgIGhlYWRlcnM6IFtzdHJpbmcsIHN0cmluZyB8IHN0cmluZ1tdXVtdKSB7XG5cbiAgICAgIGh0dHBQcm94eUxvZy5kZWJ1ZygnY2FjaGUgc2l6ZTonLCBjYWNoZUNvbnRyb2xsZXIuZ2V0U3RhdGUoKS5jYWNoZUJ5VXJpLnNpemUpO1xuICAgICAgY29uc3QgZGlyID0gUGF0aC5qb2luKGNhY2hlQ29udHJvbGxlci5nZXRTdGF0ZSgpLmNhY2hlRGlyLCBrZXkpO1xuICAgICAgY29uc3QgZmlsZSA9IFBhdGguam9pbihkaXIsICdib2R5Jyk7XG4gICAgICBjb25zdCBzdGF0dXNDb2RlID0gcHJveHlSZXMuc3RhdHVzQ29kZSB8fCAyMDA7XG4gICAgICBjb25zdCB7cmVzcG9uc2VUcmFuc2Zvcm1lcn0gPSBjYWNoZUNvbnRyb2xsZXIuZ2V0U3RhdGUoKTtcbiAgICAgIGlmIChzdGF0dXNDb2RlID09PSAzMDQpIHtcbiAgICAgICAgZGlzcGF0Y2hlci5fZG9uZSh7a2V5LCByZXMsIGRhdGE6IHtcbiAgICAgICAgICAgIHN0YXR1c0NvZGUsIGhlYWRlcnMsIGJvZHk6IGNyZWF0ZVJlcGxheVJlYWRhYmxlRmFjdG9yeShwcm94eVJlcylcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICBodHRwUHJveHlMb2cud2FybignVmVyc2lvbiBpbmZvIGlzIG5vdCByZWNvcmRlZCwgZHVlIHRvIHJlc3BvbnNlIDMwNCBmcm9tJywgcmVzLnJlcS51cmwsICcsXFxuIHlvdSBjYW4gcmVtb3ZlIGV4aXN0aW5nIG5wbS9jYWNoZSBjYWNoZSB0byBhdm9pZCAzMDQnKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKHN0YXR1c0NvZGUgIT09IDIwMCkge1xuICAgICAgICBodHRwUHJveHlMb2cuZXJyb3IoYFJlc3BvbnNlIGNvZGUgaXMgJHtzdGF0dXNDb2RlfSBmb3IgcmVxdWVzdDpgLCByZXMucmVxLnVybCk7XG4gICAgICAgIGRpc3BhdGNoZXIuX2RvbmUoe2tleSwgcmVzLCBkYXRhOiB7c3RhdHVzQ29kZSwgaGVhZGVycywgYm9keTogKCkgPT4gcHJveHlSZXN9fSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlc3BvbnNlVHJhbnNmb3JtZXIgPT0gbnVsbCkge1xuICAgICAgICBjb25zdCBkb25lTWtkaXIgPSBmcy5ta2RpcnAoZGlyKTtcbiAgICAgICAgY29uc3QgcmVhZGFibGVGYWMgPSBjcmVhdGVSZXBsYXlSZWFkYWJsZUZhY3RvcnkocHJveHlSZXMsIHVuZGVmaW5lZCxcbiAgICAgICAgICB7ZGVidWdJbmZvOiBrZXksIGV4cGVjdExlbjogcGFyc2VJbnQocHJveHlSZXMuaGVhZGVyc1snY29udGVudC1sZW5ndGgnXSBhcyBzdHJpbmcsIDEwKX0pO1xuICAgICAgICAgLy8gZGlzcGF0Y2hlci5fZG9uZSh7a2V5LCBkYXRhOiB7XG4gICAgICAgICAvLyAgICAgICBzdGF0dXNDb2RlLCBoZWFkZXJzLCBib2R5OiAoKSA9PiBwcm94eVJlc1xuICAgICAgICAgLy8gICAgIH0sIHJlc1xuICAgICAgICAgLy8gICB9KTtcbiAgICAgICAgZGlzcGF0Y2hlci5fc2F2aW5nRmlsZSh7a2V5LCBkYXRhOiB7XG4gICAgICAgICAgICBzdGF0dXNDb2RlLCBoZWFkZXJzLCBib2R5OiByZWFkYWJsZUZhY1xuICAgICAgICAgIH0sIHJlc1xuICAgICAgICB9KTtcbiAgICAgICAgYXdhaXQgZG9uZU1rZGlyO1xuICAgICAgICB2b2lkIGZzLnByb21pc2VzLndyaXRlRmlsZShcbiAgICAgICAgICBQYXRoLmpvaW4oZGlyLCAnaGVhZGVyLmpzb24nKSxcbiAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHtzdGF0dXNDb2RlLCBoZWFkZXJzfSwgbnVsbCwgJyAgJyksXG4gICAgICAgICAgJ3V0Zi04Jyk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiByZWFkYWJsZUZhYygpXG4gICAgICAgICAgICAucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbShmaWxlKSlcbiAgICAgICAgICAgIC5vbignZmluaXNoJywgcmVzb2x2ZSlcbiAgICAgICAgICAgIC5vbignZXJyb3InLCByZWplY3QpKTtcblxuICAgICAgICAgIGRpc3BhdGNoZXIuX2RvbmUoe2tleSwgZGF0YToge1xuICAgICAgICAgICAgICBzdGF0dXNDb2RlLCBoZWFkZXJzLCBib2R5OiByZWFkYWJsZUZhY1xuICAgICAgICAgICAgfSwgcmVzXG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBodHRwUHJveHlMb2cuaW5mbyhgcmVzcG9uc2UgaXMgd3JpdHRlbiB0byAobGVuZ3RoOiAke2hlYWRlcnMuZmluZChpdGVtID0+IGl0ZW1bMF0gPT09ICdjb250ZW50LWxlbmd0aCcpIVsxXSBhcyBzdHJpbmd9KWAsXG4gICAgICAgICAgICBQYXRoLnBvc2l4LnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGZpbGUpKTtcbiAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgIGh0dHBQcm94eUxvZy5lcnJvcignRmFpbGVkIHRvIHdyaXRlIGNhY2hlIGZpbGUgJyArXG4gICAgICAgICAgICBQYXRoLnBvc2l4LnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGZpbGUpLCBlKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmIChyZXFIb3N0ICYmICFyZXFIb3N0LnN0YXJ0c1dpdGgoJ2h0dHAnKSkge1xuICAgICAgICByZXFIb3N0ID0gJ2h0dHA6Ly8nICsgcmVxSG9zdDtcbiAgICAgIH1cblxuICAgICAgY29uc3Qge3JlYWRhYmxlOiB0cmFuc2Zvcm1lZCwgbGVuZ3RofSA9IGF3YWl0IHJlc3BvbnNlVHJhbnNmb3JtZXIoaGVhZGVycywgcmVxSG9zdCwgcHJveHlSZXMpO1xuICAgICAgY29uc3QgbGVuZ3RoSGVhZGVySWR4ID0gaGVhZGVycy5maW5kSW5kZXgocm93ID0+IHJvd1swXSA9PT0gJ2NvbnRlbnQtbGVuZ3RoJyk7XG4gICAgICBpZiAobGVuZ3RoSGVhZGVySWR4ID49IDApXG4gICAgICAgIGhlYWRlcnNbbGVuZ3RoSGVhZGVySWR4XVsxXSA9ICcnICsgbGVuZ3RoO1xuXG4gICAgICBkaXNwYXRjaGVyLl9zYXZpbmdGaWxlKHtrZXksIHJlcywgZGF0YToge1xuICAgICAgICAgIHN0YXR1c0NvZGUsIGhlYWRlcnMsIGJvZHk6IHRyYW5zZm9ybWVkXG4gICAgICB9IH0pO1xuXG4gICAgICBhd2FpdCBmcy5ta2RpcnAoZGlyKTtcbiAgICAgIHZvaWQgZnMucHJvbWlzZXMud3JpdGVGaWxlKFxuICAgICAgICBQYXRoLmpvaW4oZGlyLCAnaGVhZGVyLmpzb24nKSxcbiAgICAgICAgSlNPTi5zdHJpbmdpZnkoe3N0YXR1c0NvZGUsIGhlYWRlcnN9LCBudWxsLCAnICAnKSxcbiAgICAgICAgJ3V0Zi04Jyk7XG4gICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB0cmFuc2Zvcm1lZCgpXG4gICAgICAgIC5vbignZW5kJywgcmVzb2x2ZSlcbiAgICAgICAgLnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0oZmlsZSkpXG4gICAgICAgIC5vbignZXJyb3InLCByZWplY3QpKTtcblxuICAgICAgZGlzcGF0Y2hlci5fZG9uZSh7a2V5LCByZXMsIGRhdGE6IHtcbiAgICAgICAgICBzdGF0dXNDb2RlLCBoZWFkZXJzLCBib2R5OiB0cmFuc2Zvcm1lZFxuICAgICAgfSB9KTtcbiAgICAgIGh0dHBQcm94eUxvZy5pbmZvKCd3cml0ZSByZXNwb25zZSB0byBmaWxlJywgUGF0aC5wb3NpeC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBmaWxlKSwgJ3NpemUnLCBsZW5ndGgpO1xuICAgIH1cblxuICAgIHJldHVybiByeC5tZXJnZShcbiAgICAgIGFjdGlvbnMuaGl0Q2FjaGUucGlwZShcbiAgICAgICAgb3AubWVyZ2VNYXAoICh7cGF5bG9hZH0pID0+IHtcbiAgICAgICAgICBjb25zdCB3YWl0Q2FjaGVBbmRTZW5kUmVzID0gYWN0aW9ucy5fZG9uZS5waXBlKFxuICAgICAgICAgICAgLy8gSW4gY2FzZSBpdCBpcyBvZiByZWRpcmVjdGVkIHJlcXVlc3QsIEhQTSBoYXMgZG9uZSBwaXBpbmcgcmVzcG9uc2UgKGlnbm9yZWQgXCJtYW51YWwgcmVwb25zZVwiIHNldHRpbmcpXG4gICAgICAgICAgICBvcC5maWx0ZXIoYWN0aW9uID0+IGFjdGlvbi5wYXlsb2FkLmtleSA9PT0gcGF5bG9hZC5rZXkpLFxuICAgICAgICAgICAgb3AudGFrZSgxKSxcbiAgICAgICAgICAgIG9wLm1lcmdlTWFwKCh7cGF5bG9hZDoge2tleSwgcmVzLCBkYXRhfX0pID0+IHtcbiAgICAgICAgICAgICAgaWYgKHJlcy53cml0YWJsZUVuZGVkKSB7XG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdSZXNwb25zZSBpcyBlbmRlZCBlYXJseSwgd2h5PycpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgZGF0YS5oZWFkZXJzKSB7XG4gICAgICAgICAgICAgICAgcmVzLnNldEhlYWRlcihlbnRyeVswXSwgZW50cnlbMV0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gZGF0YS5zdGF0dXNDb2RlO1xuICAgICAgICAgICAgICBjb25zdCBwaXBlRXZlbnQkID0gbmV3IHJ4LlN1YmplY3Q8J2ZpbmlzaCcgfCAnY2xvc2UnPigpO1xuICAgICAgICAgICAgICByZXMub24oJ2ZpbmlzaCcsICgpID0+IHtcbiAgICAgICAgICAgICAgICBwaXBlRXZlbnQkLm5leHQoJ2ZpbmlzaCcpO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAub24oJ2Nsb3NlJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHBpcGVFdmVudCQubmV4dCgnY2xvc2UnKTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgLm9uKCdlcnJvcicsIGVyciA9PiBwaXBlRXZlbnQkLmVycm9yKGVycikpO1xuXG4gICAgICAgICAgICAgIGRhdGEuYm9keSgpLnBpcGUocmVzKTtcbiAgICAgICAgICAgICAgaHR0cFByb3h5TG9nLmluZm8oJ3BpcGUgcmVzcG9uc2Ugb2YnLCBwYXlsb2FkLmtleSk7XG5cbiAgICAgICAgICAgICAgcmV0dXJuIHBpcGVFdmVudCQucGlwZShcbiAgICAgICAgICAgICAgICBvcC5maWx0ZXIoZXZlbnQgPT4gZXZlbnQgPT09ICdmaW5pc2gnIHx8IGV2ZW50ID09PSAnY2xvc2UnKSxcbiAgICAgICAgICAgICAgICBvcC50YXAoZXZlbnQgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKGV2ZW50ID09PSAnY2xvc2UnKVxuICAgICAgICAgICAgICAgICAgICBodHRwUHJveHlMb2cuZXJyb3IoJ1Jlc3BvbnNlIGNvbm5lY3Rpb24gaXMgY2xvc2VkIGVhcmx5Jywga2V5LFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgJ2V4cGVjdCBjb250ZW50LWxlbnRoJywgZGF0YS5oZWFkZXJzWydjb250ZW50LWxlbmd0aCddKTtcbiAgICAgICAgICAgICAgICB9KSxcbiAgICAgICAgICAgICAgICBvcC50YWtlKDEpLFxuICAgICAgICAgICAgICAgIG9wLm1hcFRvKGtleSlcbiAgICAgICAgICAgICAgICAvLyBvcC50aW1lb3V0KDEyMDAwMCksXG4gICAgICAgICAgICAgICAgLy8gb3AuY2F0Y2hFcnJvcihlcnIgPT4ge1xuICAgICAgICAgICAgICAgICAgLy8gaHR0cFByb3h5TG9nLmVycm9yKGVycik7XG4gICAgICAgICAgICAgICAgICAvLyBpZiAoIXJlcy5oZWFkZXJzU2VudCkge1xuICAgICAgICAgICAgICAgICAgICAvLyByZXMuc3RhdHVzQ29kZSA9IDUwMDtcbiAgICAgICAgICAgICAgICAgICAgLy8gcmVzLmVuZCgpO1xuICAgICAgICAgICAgICAgICAgLy8gfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gcmVzLmVuZCgpO1xuICAgICAgICAgICAgICAgICAgLy8gfVxuICAgICAgICAgICAgICAgICAgLy8gcmV0dXJuIHJ4LkVNUFRZO1xuICAgICAgICAgICAgICAgIC8vIH0pXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIG9wLnRhcChrZXkgPT4gaHR0cFByb3h5TG9nLmluZm8oYHJlcGxpZWQ6ICR7a2V5fWApKVxuICAgICAgICAgICk7XG4gICAgICAgICAgY29uc3QgaXRlbSA9IGNhY2hlQ29udHJvbGxlci5nZXRTdGF0ZSgpLmNhY2hlQnlVcmkuZ2V0KHBheWxvYWQua2V5KTtcbiAgICAgICAgICBodHRwUHJveHlMb2cuaW5mbygnaGl0Q2FjaGUgZm9yICcgKyBwYXlsb2FkLmtleSk7XG5cbiAgICAgICAgICBsZXQgZmluaXNoZWQkOiByeC5PYnNlcnZhYmxlPHVua25vd24+IHwgdW5kZWZpbmVkO1xuXG4gICAgICAgICAgaWYgKGl0ZW0gPT0gbnVsbCkge1xuICAgICAgICAgICAgZmluaXNoZWQkID0gcngubWVyZ2UoXG4gICAgICAgICAgICAgIHdhaXRDYWNoZUFuZFNlbmRSZXMsXG4gICAgICAgICAgICAgIHJ4LmRlZmVyKCgpID0+IHtcbiAgICAgICAgICAgICAgICBkaXNwYXRjaGVyLl9sb2FkRnJvbVN0b3JhZ2UocGF5bG9hZCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJ4LkVNUFRZO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0gPT09ICdsb2FkaW5nJyB8fCBpdGVtID09PSAncmVxdWVzdGluZycgfHwgaXRlbSA9PT0gJ3NhdmluZycpIHtcbiAgICAgICAgICAgIGZpbmlzaGVkJCA9IHdhaXRDYWNoZUFuZFNlbmRSZXM7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGh0dHBQcm94eUxvZy5pbmZvKCdoaXQgY2FjaGVkJywgcGF5bG9hZC5rZXkpO1xuICAgICAgICAgICAgY29uc3QgdHJhbnNmb3JtZXIgPSBjYWNoZUNvbnRyb2xsZXIuZ2V0U3RhdGUoKS5jYWNoZVRyYW5zZm9ybWVyO1xuICAgICAgICAgICAgaWYgKHRyYW5zZm9ybWVyID09IG51bGwpIHtcbiAgICAgICAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBpdGVtLmhlYWRlcnMpIHtcbiAgICAgICAgICAgICAgICBwYXlsb2FkLnJlcy5zZXRIZWFkZXIoZW50cnlbMF0sIGVudHJ5WzFdKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBwYXlsb2FkLnJlcy5zdGF0dXMoaXRlbS5zdGF0dXNDb2RlKTtcbiAgICAgICAgICAgICAgZmluaXNoZWQkID0gbmV3IHJ4Lk9ic2VydmFibGU8dm9pZD4oc3ViID0+IHtcbiAgICAgICAgICAgICAgICBpdGVtLmJvZHkoKVxuICAgICAgICAgICAgICAgIC5vbignZW5kJywgKCkgPT4ge3N1Yi5uZXh0KCk7IHN1Yi5jb21wbGV0ZSgpOyB9KVxuICAgICAgICAgICAgICAgIC5waXBlKHBheWxvYWQucmVzKTtcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBmaW5pc2hlZCQgPSByeC5mcm9tKHRyYW5zZm9ybWVyKGl0ZW0uaGVhZGVycywgcGF5bG9hZC5yZXEuaGVhZGVycy5ob3N0LCBpdGVtLmJvZHkoKSkpLnBpcGUoXG4gICAgICAgICAgICAgICAgb3AudGFrZSgxKSxcbiAgICAgICAgICAgICAgICBvcC5tZXJnZU1hcCgoe3JlYWRhYmxlLCBsZW5ndGh9KSA9PiB7XG4gICAgICAgICAgICAgICAgICBjb25zdCBsZW5ndGhIZWFkZXJJZHggPSBpdGVtLmhlYWRlcnMuZmluZEluZGV4KHJvdyA9PiByb3dbMF0gPT09ICdjb250ZW50LWxlbmd0aCcpO1xuICAgICAgICAgICAgICAgICAgaWYgKGxlbmd0aEhlYWRlcklkeCA+PSAwKVxuICAgICAgICAgICAgICAgICAgICBpdGVtLmhlYWRlcnNbbGVuZ3RoSGVhZGVySWR4XVsxXSA9ICcnICsgbGVuZ3RoO1xuICAgICAgICAgICAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBpdGVtLmhlYWRlcnMpIHtcbiAgICAgICAgICAgICAgICAgICAgcGF5bG9hZC5yZXMuc2V0SGVhZGVyKGVudHJ5WzBdLCBlbnRyeVsxXSk7XG4gICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICBwYXlsb2FkLnJlcy5zdGF0dXMoaXRlbS5zdGF0dXNDb2RlKTtcbiAgICAgICAgICAgICAgICAgIHJldHVybiBzdHJlYW0ucHJvbWlzZXMucGlwZWxpbmUoXG4gICAgICAgICAgICAgICAgICAgIHJlYWRhYmxlKCksIHBheWxvYWQucmVzXG4gICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIHJ4LnRpbWVyKDUwMDAsIDUwMDApLnBpcGUoXG4gICAgICAgICAgICBvcC50YWtlVW50aWwoZmluaXNoZWQkKSxcbiAgICAgICAgICAgIG9wLm1hcChpZHggPT4ge1xuICAgICAgICAgICAgICBjb25zdCBpdGVtID0gY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCkuY2FjaGVCeVVyaS5nZXQocGF5bG9hZC5rZXkpO1xuICAgICAgICAgICAgICBodHRwUHJveHlMb2cuaW5mbyhgJHtjaGFsay5ibHVlKHBheWxvYWQua2V5KX0gWyR7dHlwZW9mIGl0ZW0gPT09ICdzdHJpbmcnID8gaXRlbSA6ICdjYWNoZWQnfV0gaGFzIGJlZW4gcHJvY2Vzc2VkIGZvciAke2NoYWxrLnllbGxvdygoaWR4ICsgMSkgKiA1ICsgJ3MnKX1gKTtcbiAgICAgICAgICAgICAgcmV0dXJuIGl0ZW07XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIG9wLmNvdW50KCksXG4gICAgICAgICAgICBvcC50YXAoKCkgPT4gaHR0cFByb3h5TG9nLmluZm8oYCR7Y2hhbGsuZ3JlZW4ocGF5bG9hZC5rZXkpfSBpcyBmaW5pc2hlZGApKSxcbiAgICAgICAgICAgIG9wLnRpbWVvdXQoNjAwMDApLFxuICAgICAgICAgICAgb3AuY2F0Y2hFcnJvcigoZXJyKSA9PiB7XG4gICAgICAgICAgICAgIGh0dHBQcm94eUxvZy5lcnJvcignRmFpbGVkIHRvIHdyaXRlIHJlc3BvbnNlJywgZXJyKTtcbiAgICAgICAgICAgICAgcmV0dXJuIHJ4LkVNUFRZO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICApO1xuICAgICAgICB9LCA1KVxuICAgICAgKSxcbiAgICAgIGFjdGlvbnMuX2xvYWRGcm9tU3RvcmFnZS5waXBlKFxuICAgICAgICBvcC5tZXJnZU1hcChhc3luYyAoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGRpciA9IFBhdGguam9pbihjYWNoZUNvbnRyb2xsZXIuZ2V0U3RhdGUoKS5jYWNoZURpciwgcGF5bG9hZC5rZXkpO1xuICAgICAgICAgICAgY29uc3QgaEZpbGUgPSBQYXRoLmpvaW4oZGlyLCAnaGVhZGVyLmpzb24nKTtcbiAgICAgICAgICAgIGNvbnN0IGJGaWxlID0gUGF0aC5qb2luKGRpciwgJ2JvZHknKTtcbiAgICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKGhGaWxlKSkge1xuICAgICAgICAgICAgICBodHRwUHJveHlMb2cuaW5mbygnbG9hZCcsIHBheWxvYWQua2V5KTtcbiAgICAgICAgICAgICAgY29uc3QgdHJhbnNmb3JtZXIgPSBjYWNoZUNvbnRyb2xsZXIuZ2V0U3RhdGUoKS5jYWNoZVRyYW5zZm9ybWVyO1xuICAgICAgICAgICAgICBpZiAodHJhbnNmb3JtZXIgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGhlYWRlcnNTdHIgPSBhd2FpdCBmcy5wcm9taXNlcy5yZWFkRmlsZShoRmlsZSwgJ3V0Zi04Jyk7XG4gICAgICAgICAgICAgICAgY29uc3Qge3N0YXR1c0NvZGUsIGhlYWRlcnN9ID0gSlNPTi5wYXJzZShoZWFkZXJzU3RyKSBhcyB7c3RhdHVzQ29kZTogbnVtYmVyOyBoZWFkZXJzOiBbc3RyaW5nLCBzdHJpbmcgfCBzdHJpbmdbXV1bXX07XG5cbiAgICAgICAgICAgICAgICBkaXNwYXRjaGVyLl9kb25lKHtrZXk6IHBheWxvYWQua2V5LCByZXM6IHBheWxvYWQucmVzLFxuICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXNDb2RlLFxuICAgICAgICAgICAgICAgICAgICBoZWFkZXJzLFxuICAgICAgICAgICAgICAgICAgICBib2R5OiAoKSA9PiBmcy5jcmVhdGVSZWFkU3RyZWFtKGJGaWxlKVxuICAgICAgICAgICAgICAgICAgfX0pO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGNvbnN0IGhlYWRlcnNTdHIgPSBhd2FpdCBmcy5wcm9taXNlcy5yZWFkRmlsZShoRmlsZSwgJ3V0Zi04Jyk7XG4gICAgICAgICAgICAgIGNvbnN0IHtzdGF0dXNDb2RlLCBoZWFkZXJzfSA9IEpTT04ucGFyc2UoaGVhZGVyc1N0cikgYXMge3N0YXR1c0NvZGU6IG51bWJlcjsgaGVhZGVyczogW3N0cmluZywgc3RyaW5nIHwgc3RyaW5nW11dW119O1xuICAgICAgICAgICAgICBjb25zdCB7cmVhZGFibGUsIGxlbmd0aH0gPSBhd2FpdCB0cmFuc2Zvcm1lcihoZWFkZXJzLCBwYXlsb2FkLnJlcS5oZWFkZXJzLmhvc3QsIGZzLmNyZWF0ZVJlYWRTdHJlYW0oYkZpbGUpKTtcbiAgICAgICAgICAgICAgY29uc3QgbGVuZ3RoSGVhZGVySWR4ID0gaGVhZGVycy5maW5kSW5kZXgocm93ID0+IHJvd1swXSA9PT0gJ2NvbnRlbnQtbGVuZ3RoJyk7XG4gICAgICAgICAgICAgIGlmIChsZW5ndGhIZWFkZXJJZHggPj0gMClcbiAgICAgICAgICAgICAgICBoZWFkZXJzW2xlbmd0aEhlYWRlcklkeF1bMV0gPSAnJyArIGxlbmd0aDtcblxuICAgICAgICAgICAgICBkaXNwYXRjaGVyLl9kb25lKHtrZXk6IHBheWxvYWQua2V5LFxuICAgICAgICAgICAgICAgIHJlczogcGF5bG9hZC5yZXMsXG4gICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgc3RhdHVzQ29kZSxcbiAgICAgICAgICAgICAgICAgIGhlYWRlcnMsXG4gICAgICAgICAgICAgICAgICBib2R5OiByZWFkYWJsZVxuICAgICAgICAgICAgICAgIH19KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGh0dHBQcm94eUxvZy5pbmZvKCdObyBleGlzdGluZyBmaWxlIGZvcicsIHBheWxvYWQua2V5KTtcbiAgICAgICAgICAgICAgZGlzcGF0Y2hlci5fcmVxdWVzdFJlbW90ZShwYXlsb2FkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICAgICAgaHR0cFByb3h5TG9nLmVycm9yKCdGYWlsZWQgdG8gc2F2ZSBjYWNoZSBmb3I6ICcgKyBwYXlsb2FkLmtleSwgZXgpO1xuICAgICAgICAgICAgZGlzcGF0Y2hlci5fY2xlYW4ocGF5bG9hZC5rZXkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICksXG4gICAgICBhY3Rpb25zLl9yZXF1ZXN0UmVtb3RlLnBpcGUoXG4gICAgICAgIG9wLm1lcmdlTWFwKCh7cGF5bG9hZH0pID0+IHtcbiAgICAgICAgICBjb25zdCBwcm94eU9wdHM6IFNlcnZlck9wdGlvbnMgPSB7fTtcbiAgICAgICAgICBpZiAocGF5bG9hZC50YXJnZXQpIHtcbiAgICAgICAgICAgIHByb3h5T3B0cy50YXJnZXQgPSBwYXlsb2FkLnRhcmdldDtcbiAgICAgICAgICAgIHByb3h5T3B0cy5pZ25vcmVQYXRoID0gdHJ1ZTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmV0dXJuIHJ4LmRlZmVyKCgpID0+IHtcbiAgICAgICAgICAgIGNhY2hlQ29udHJvbGxlci5nZXRTdGF0ZSgpLnByb3h5LndlYihwYXlsb2FkLnJlcSwgcGF5bG9hZC5yZXMsIHByb3h5T3B0cyk7XG4gICAgICAgICAgICByZXR1cm4gb2JzZXJ2ZVByb3h5UmVzcG9uc2UocHJveHkkLCBwYXlsb2FkLnJlcyk7XG4gICAgICAgICAgfSkucGlwZShcbiAgICAgICAgICAgIG9wLm1lcmdlTWFwKCh7cGF5bG9hZDogW3Byb3h5UmVzLCBfcmVxLCByZXNdfSkgPT4ge1xuICAgICAgICAgICAgICByZXR1cm4gcmVxdWVzdGluZ1JlbW90ZShwYXlsb2FkLmtleSwgcGF5bG9hZC5yZXEuaGVhZGVycy5ob3N0LCBwcm94eVJlcywgcmVzLFxuICAgICAgICAgICAgICAgIE9iamVjdC5lbnRyaWVzKHByb3h5UmVzLmhlYWRlcnMpLmZpbHRlcihlbnRyeSA9PiBlbnRyeVsxXSAhPSBudWxsKSBhcyBbc3RyaW5nLCBzdHJpbmcgfCBzdHJpbmdbXV1bXSk7XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIG9wLmNhdGNoRXJyb3IoZXJyID0+IHtcbiAgICAgICAgICAgICAgaHR0cFByb3h5TG9nLndhcm4oYFJldHJ5IFwiJHtwYXlsb2FkLnJlcS51cmx9XCJgLCBlcnIpO1xuICAgICAgICAgICAgICByZXR1cm4gcngudGltZXIoMTAwMCkucGlwZShcbiAgICAgICAgICAgICAgICBvcC5tYXBUbyhyeC50aHJvd0Vycm9yKGVycikpXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIG9wLnJldHJ5KDMpXG4gICAgICAgICAgKTtcbiAgICAgICAgfSlcbiAgICAgICksXG4gICAgICBwcm94eSQucHJveHlSZXEucGlwZShcbiAgICAgICAgb3AudGFwKCh7cGF5bG9hZDogW3Byb3h5UmVxLCByZXEsIHJlcywgb3B0c119KSA9PiB7XG4gICAgICAgICAgY29uc3QgdGFyZ2V0ID0gb3B0cy50YXJnZXQgYXMgdXJsLlVybDtcbiAgICAgICAgICBodHRwUHJveHlMb2cuaW5mbygnUmVxdWVzdCcsIHRhcmdldC5ob3N0bmFtZSwgdGFyZ2V0LnBhdGhuYW1lKTtcbiAgICAgICAgfSlcbiAgICAgICksXG4gICAgICBwcm94eSQuZWNvbm5yZXNldC5waXBlKFxuICAgICAgICBvcC50YXAoKHtwYXlsb2FkOiBbZXJyXX0pID0+IHtcbiAgICAgICAgICBodHRwUHJveHlMb2cuaW5mbygnZWNvbm5yZXNldCcsIGVycik7XG4gICAgICAgIH0pXG4gICAgICApXG4gICAgKS5waXBlKFxuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXJndW1lbnRcbiAgICAgIG9wLmlnbm9yZUVsZW1lbnRzKCksXG4gICAgICBvcC5jYXRjaEVycm9yKChlcnIsIHNyYykgPT4ge1xuICAgICAgICBodHRwUHJveHlMb2cuZXJyb3IoJ0hUVFAgcHJveHkgY2FjaGUgZXJyb3InLCBlcnIpO1xuICAgICAgICByZXR1cm4gc3JjO1xuICAgICAgfSlcbiAgICApO1xuICB9KTtcblxuICByZXR1cm4gY2FjaGVDb250cm9sbGVyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24ga2V5T2ZVcmkobWV0aG9kOiBzdHJpbmcsIHBhdGg6IHN0cmluZykge1xuICBjb25zdCB1cmwgPSBuZXcgVVJMKCdodHRwOi8vZi5jb20nICsgcGF0aCk7XG4gIGNvbnN0IGtleSA9IG1ldGhvZCArIHVybC5wYXRobmFtZSArICh1cmwuc2VhcmNoID8gJy8nICsgXy50cmltU3RhcnQodXJsLnNlYXJjaCwgJz8nKSA6ICcnKTtcbiAgcmV0dXJuIGtleTtcbn1cbiJdfQ==