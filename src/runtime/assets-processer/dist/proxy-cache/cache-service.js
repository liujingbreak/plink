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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGUtc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNhY2hlLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGdEQUF3QjtBQUd4QixvREFBNEI7QUFFNUIsd0RBQTBCO0FBQzFCLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMsb0RBQXVCO0FBRXZCLDJDQUE0RDtBQUM1RCxrREFBMEI7QUFDMUIsc0RBQTBCO0FBQzFCLHNDQUE0QztBQUM1Qyx5RUFBeUU7QUFDekUsOEZBQW9HO0FBQ3BHLG9DQUFxRDtBQUNyRCxvRUFBbUY7QUFJbkYsTUFBTSxZQUFZLEdBQUcsSUFBQSxnQkFBUSxFQUFDLFVBQVUsQ0FBQyxDQUFDO0FBRTFDLFNBQWdCLG9CQUFvQixDQUFDLFNBQWlCLEVBQUUsYUFBNEIsRUFBRSxZQUFvQixFQUN6RixPQUFtRCxFQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUM7O0lBQ2pGLE1BQU0sWUFBWSxHQUFHLElBQUEsOEJBQWlCLGtCQUNwQyxZQUFZLEVBQUUsSUFBSSxFQUNsQixFQUFFLEVBQUUsS0FBSyxFQUNULE1BQU0sRUFBRSxLQUFLLEVBQ2IsbUJBQW1CLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQ2hDLGVBQWUsRUFBRSxJQUFJLEVBQ3JCLFlBQVksRUFBRSxLQUFLLEVBQ25CLE9BQU8sRUFBRSxLQUFLLElBQ1gsYUFBYSxFQUNoQixDQUFDO0lBQ0gsTUFBTSxZQUFZLEdBQW9CO1FBQ3BDLEtBQUssRUFBRSxZQUFZO1FBQ25CLFFBQVEsRUFBRSxZQUFZO1FBQ3RCLFVBQVUsRUFBRSxJQUFJLEdBQUcsRUFBRTtRQUNyQixjQUFjLEVBQUUsSUFBSSxDQUFDLGNBQWMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjO0tBQ3JGLENBQUM7SUFFRixNQUFNLE1BQU0sR0FBRyxJQUFBLDJDQUFtQixFQUFDLFlBQVksQ0FBQyxDQUFDO0lBRWpELElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO1FBQ2hCLGlCQUFHLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3RCLEdBQUcsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRTtnQkFDcEMsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUMxQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLEVBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztZQUNuRSxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO0tBQ0o7SUFDRCxNQUFNLGVBQWUsR0FBRyxJQUFBLGdDQUFXLEVBQUM7UUFDbEMsWUFBWTtRQUNaLElBQUksRUFBRSxvQkFBb0IsU0FBUyxFQUFFO1FBQ3JDLGVBQWUsRUFBRSxNQUFBLElBQUEsY0FBTSxHQUFFLENBQUMsVUFBVSwwQ0FBRSxPQUFPO1FBQzdDLFFBQVEsRUFBRTtZQUNSLGlCQUFpQixDQUFDLENBQWtCLEVBQUUsT0FHckM7Z0JBQ0MsSUFBSSxPQUFPLENBQUMsTUFBTTtvQkFDaEIsQ0FBQyxDQUFDLG1CQUFtQixHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7Z0JBQ3pDLElBQUksT0FBTyxDQUFDLE1BQU07b0JBQ2hCLENBQUMsQ0FBQyxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO1lBQ3hDLENBQUM7WUFDRCxRQUFRLENBQUMsQ0FBa0IsRUFBRSxPQUk1QixJQUFHLENBQUM7WUFFTCxrQkFBa0IsQ0FBQyxDQUFrQixFQUFFLE9BSXRDLElBQUcsQ0FBQztZQUVMLGdCQUFnQixDQUFDLENBQWtCLEVBQUUsT0FFakI7Z0JBQ2xCLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDM0MsQ0FBQztZQUVELGNBQWMsQ0FBQyxDQUFrQixFQUFFLE9BQ2Y7Z0JBQ2xCLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDOUMsQ0FBQztZQUNELFdBQVcsQ0FBQyxDQUFrQixFQUFFLE9BSS9CO2dCQUNDLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDMUMsQ0FBQztZQUNELEtBQUssQ0FBQyxDQUFrQixFQUFFLE9BSXpCO2dCQUNDLENBQUMsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDakMseUNBQXlDO2dCQUN6QyxpREFBaUQ7Z0JBQ2pELDBDQUEwQztnQkFDMUMsd0NBQXdDO2dCQUN4QyxjQUFjO2dCQUNkLE1BQU07Z0JBQ04saURBQWlEO2dCQUNqRCxJQUFJO1lBQ04sQ0FBQztZQUNELE1BQU0sQ0FBQyxDQUFrQixFQUFFLEdBQVc7Z0JBQ3BDLENBQUMsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzNCLENBQUM7U0FDRjtLQUNGLENBQUMsQ0FBQztJQUVILGVBQWUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDN0IsTUFBTSxPQUFPLEdBQUcsSUFBQSxxQ0FBZ0IsRUFBQyxlQUFlLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ25FLE1BQU0sVUFBVSxHQUFHLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQztRQUVwRCxLQUFLLFVBQVUsZ0JBQWdCLENBQzdCLEdBQVcsRUFBRSxPQUEyQixFQUN4QyxRQUF5QixFQUN6QixHQUFtQixFQUNuQixPQUFzQztZQUV0QyxZQUFZLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxlQUFlLENBQUMsUUFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzlFLE1BQU0sR0FBRyxHQUFHLGNBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNoRSxNQUFNLElBQUksR0FBRyxjQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUNwQyxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsVUFBVSxJQUFJLEdBQUcsQ0FBQztZQUM5QyxNQUFNLEVBQUMsbUJBQW1CLEVBQUMsR0FBRyxlQUFlLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDekQsSUFBSSxVQUFVLEtBQUssR0FBRyxFQUFFO2dCQUN0QixVQUFVLENBQUMsS0FBSyxDQUFDLEVBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUU7d0JBQzlCLFVBQVUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUEsbUNBQTJCLEVBQUMsUUFBUSxDQUFDO3FCQUNqRTtpQkFDRixDQUFDLENBQUM7Z0JBQ0gsWUFBWSxDQUFDLElBQUksQ0FBQyx3REFBd0QsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSwwREFBMEQsQ0FBQyxDQUFDO2dCQUNySixPQUFPO2FBQ1I7WUFDRCxJQUFJLFVBQVUsS0FBSyxHQUFHLEVBQUU7Z0JBQ3RCLFlBQVksQ0FBQyxLQUFLLENBQUMsb0JBQW9CLFVBQVUsZUFBZSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQy9FLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLFFBQVEsRUFBQyxFQUFDLENBQUMsQ0FBQztnQkFDaEYsT0FBTzthQUNSO1lBRUQsSUFBSSxtQkFBbUIsSUFBSSxJQUFJLEVBQUU7Z0JBQy9CLE1BQU0sU0FBUyxHQUFHLGtCQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNqQyxNQUFNLFdBQVcsR0FBRyxJQUFBLG1DQUEyQixFQUFDLFFBQVEsRUFBRSxTQUFTLEVBQ2pFLEVBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQVcsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLENBQUM7Z0JBQzFGLGlDQUFpQztnQkFDakMsa0RBQWtEO2dCQUNsRCxhQUFhO2dCQUNiLFFBQVE7Z0JBQ1QsVUFBVSxDQUFDLFdBQVcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUU7d0JBQy9CLFVBQVUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVc7cUJBQ3ZDLEVBQUUsR0FBRztpQkFDUCxDQUFDLENBQUM7Z0JBQ0gsTUFBTSxTQUFTLENBQUM7Z0JBQ2hCLEtBQUssa0JBQUUsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUN4QixjQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxhQUFhLENBQUMsRUFDM0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQ25ELE9BQU8sQ0FBQyxDQUFDO2dCQUVYLElBQUk7b0JBQ0YsTUFBTSxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLFdBQVcsRUFBRTt5QkFDakQsSUFBSSxDQUFDLGtCQUFFLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7eUJBQ2hDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDO3lCQUNyQixFQUFFLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7b0JBRXhCLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBQyxHQUFHLEVBQUUsSUFBSSxFQUFFOzRCQUN6QixVQUFVLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXO3lCQUN2QyxFQUFFLEdBQUc7cUJBQ1AsQ0FBQyxDQUFDO29CQUVILFlBQVksQ0FBQyxJQUFJLENBQUMsbUNBQW1DLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssZ0JBQWdCLENBQUUsQ0FBQyxDQUFDLENBQVcsR0FBRyxFQUN0SCxjQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztpQkFDN0M7Z0JBQUMsT0FBTyxDQUFDLEVBQUU7b0JBQ1YsWUFBWSxDQUFDLEtBQUssQ0FBQyw2QkFBNkI7d0JBQzlDLGNBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztpQkFDaEQ7Z0JBRUQsT0FBTzthQUNSO1lBQ0QsSUFBSSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUMxQyxPQUFPLEdBQUcsU0FBUyxHQUFHLE9BQU8sQ0FBQzthQUMvQjtZQUVELE1BQU0sRUFBQyxRQUFRLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBQyxHQUFHLE1BQU0sbUJBQW1CLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQztZQUM5RixNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLGdCQUFnQixDQUFDLENBQUM7WUFDOUUsSUFBSSxlQUFlLElBQUksQ0FBQztnQkFDdEIsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxNQUFNLENBQUM7WUFFNUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFO29CQUNwQyxVQUFVLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXO2lCQUN6QyxFQUFFLENBQUMsQ0FBQztZQUVMLE1BQU0sa0JBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDckIsS0FBSyxrQkFBRSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQ3hCLGNBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLGFBQWEsQ0FBQyxFQUM3QixJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUMsVUFBVSxFQUFFLE9BQU8sRUFBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsRUFDakQsT0FBTyxDQUFDLENBQUM7WUFDWCxNQUFNLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsV0FBVyxFQUFFO2lCQUNqRCxFQUFFLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQztpQkFDbEIsSUFBSSxDQUFDLGtCQUFFLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQ2hDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUV4QixVQUFVLENBQUMsS0FBSyxDQUFDLEVBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUU7b0JBQzlCLFVBQVUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVc7aUJBQ3pDLEVBQUUsQ0FBQyxDQUFDO1lBQ0wsWUFBWSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxjQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3hHLENBQUM7UUFFRCxPQUFPLEVBQUUsQ0FBQyxLQUFLLENBQ2IsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQ25CLEVBQUUsQ0FBQyxRQUFRLENBQUUsQ0FBQyxFQUFDLE9BQU8sRUFBQyxFQUFFLEVBQUU7WUFDekIsTUFBTSxtQkFBbUIsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUk7WUFDNUMsdUdBQXVHO1lBQ3ZHLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsS0FBSyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQ3ZELEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQ1YsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUMsT0FBTyxFQUFFLEVBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUMsRUFBQyxFQUFFLEVBQUU7Z0JBQzFDLElBQUksR0FBRyxDQUFDLGFBQWEsRUFBRTtvQkFDckIsTUFBTSxJQUFJLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO2lCQUNsRDtnQkFDRCxLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7b0JBQ2hDLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUNuQztnQkFDRCxHQUFHLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7Z0JBQ2pDLE1BQU0sVUFBVSxHQUFHLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBc0IsQ0FBQztnQkFDeEQsR0FBRyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO29CQUNwQixVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUM1QixDQUFDLENBQUM7cUJBQ0QsRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7b0JBQ2hCLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQzNCLENBQUMsQ0FBQztxQkFDRCxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUUzQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUN0QixZQUFZLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFFbkQsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUNwQixFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxLQUFLLFFBQVEsSUFBSSxLQUFLLEtBQUssT0FBTyxDQUFDLEVBQzNELEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7b0JBQ2IsSUFBSSxLQUFLLEtBQUssT0FBTzt3QkFDbkIsWUFBWSxDQUFDLEtBQUssQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQzFDLHNCQUFzQixFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO2dCQUMvRSxDQUFDLENBQUMsRUFDRixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUNWLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO2dCQUNiLHNCQUFzQjtnQkFDdEIseUJBQXlCO2dCQUN2QiwyQkFBMkI7Z0JBQzNCLDBCQUEwQjtnQkFDeEIsd0JBQXdCO2dCQUN4QixhQUFhO2dCQUNmLFdBQVc7Z0JBQ1QsYUFBYTtnQkFDZixJQUFJO2dCQUNKLG1CQUFtQjtnQkFDckIsS0FBSztpQkFDTixDQUFDO1lBQ0osQ0FBQyxDQUFDLEVBQ0YsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsWUFBWSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQ3BELENBQUM7WUFDRixNQUFNLElBQUksR0FBRyxlQUFlLENBQUMsUUFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDcEUsWUFBWSxDQUFDLElBQUksQ0FBQyxlQUFlLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBRWpELElBQUksU0FBNkMsQ0FBQztZQUVsRCxJQUFJLElBQUksSUFBSSxJQUFJLEVBQUU7Z0JBQ2hCLFNBQVMsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUNsQixtQkFBbUIsRUFDbkIsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUU7b0JBQ1osVUFBVSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUNyQyxPQUFPLEVBQUUsQ0FBQyxLQUFLLENBQUM7Z0JBQ2xCLENBQUMsQ0FBQyxDQUNILENBQUM7YUFDSDtpQkFBTSxJQUFJLElBQUksS0FBSyxTQUFTLElBQUksSUFBSSxLQUFLLFlBQVksSUFBSSxJQUFJLEtBQUssUUFBUSxFQUFFO2dCQUMzRSxTQUFTLEdBQUcsbUJBQW1CLENBQUM7YUFDakM7aUJBQU07Z0JBQ0wsWUFBWSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUM3QyxNQUFNLFdBQVcsR0FBRyxlQUFlLENBQUMsUUFBUSxFQUFFLENBQUMsZ0JBQWdCLENBQUM7Z0JBQ2hFLElBQUksV0FBVyxJQUFJLElBQUksRUFBRTtvQkFDdkIsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO3dCQUNoQyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7cUJBQzNDO29CQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFDcEMsU0FBUyxHQUFHLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBTyxHQUFHLENBQUMsRUFBRTt3QkFDeEMsSUFBSSxDQUFDLElBQUksRUFBRTs2QkFDVixFQUFFLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxHQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQzs2QkFDL0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDckIsQ0FBQyxDQUFDLENBQUM7aUJBQ0o7cUJBQU07b0JBQ0wsU0FBUyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUN4RixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUNWLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUMsRUFBRSxFQUFFO3dCQUNqQyxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxnQkFBZ0IsQ0FBQyxDQUFDO3dCQUNuRixJQUFJLGVBQWUsSUFBSSxDQUFDOzRCQUN0QixJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxNQUFNLENBQUM7d0JBQ2pELEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTs0QkFDaEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO3lCQUMzQzt3QkFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7d0JBQ3BDLE9BQU8sZ0JBQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUM3QixRQUFRLEVBQUUsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUN4QixDQUFDO29CQUNKLENBQUMsQ0FBQyxDQUNILENBQUM7aUJBQ0g7YUFDRjtZQUVELE9BQU8sRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUM5QixFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUN2QixFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUNYLE1BQU0sSUFBSSxHQUFHLGVBQWUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDcEUsWUFBWSxDQUFDLElBQUksQ0FBQyxHQUFHLGVBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLE9BQU8sSUFBSSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLDRCQUE0QixlQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQzVKLE9BQU8sSUFBSSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQ0YsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUNWLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxHQUFHLGVBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxFQUMxRSxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUNqQixFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7Z0JBQ3BCLFlBQVksQ0FBQyxLQUFLLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQ3BELE9BQU8sRUFBRSxDQUFDLEtBQUssQ0FBQztZQUNsQixDQUFDLENBQUMsQ0FDSCxDQUFDO1FBQ0osQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUNOLEVBQ0QsT0FBTyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FDM0IsRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBQyxPQUFPLEVBQUMsRUFBRSxFQUFFO1lBQzlCLElBQUk7Z0JBQ0YsTUFBTSxHQUFHLEdBQUcsY0FBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDeEUsTUFBTSxLQUFLLEdBQUcsY0FBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsYUFBYSxDQUFDLENBQUM7Z0JBQzVDLE1BQU0sS0FBSyxHQUFHLGNBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUNyQyxJQUFJLGtCQUFFLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFO29CQUN4QixZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ3ZDLE1BQU0sV0FBVyxHQUFHLGVBQWUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQztvQkFDaEUsSUFBSSxXQUFXLElBQUksSUFBSSxFQUFFO3dCQUN2QixNQUFNLFVBQVUsR0FBRyxNQUFNLGtCQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7d0JBQzlELE1BQU0sRUFBQyxVQUFVLEVBQUUsT0FBTyxFQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQWlFLENBQUM7d0JBRXJILFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUc7NEJBQ2xELElBQUksRUFBRTtnQ0FDSixVQUFVO2dDQUNWLE9BQU87Z0NBQ1AsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLGtCQUFFLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDOzZCQUN2QyxFQUFDLENBQUMsQ0FBQzt3QkFDTixPQUFPO3FCQUNSO29CQUVELE1BQU0sVUFBVSxHQUFHLE1BQU0sa0JBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztvQkFDOUQsTUFBTSxFQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBaUUsQ0FBQztvQkFDckgsTUFBTSxFQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUMsR0FBRyxNQUFNLFdBQVcsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLGtCQUFFLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztvQkFDNUcsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxnQkFBZ0IsQ0FBQyxDQUFDO29CQUM5RSxJQUFJLGVBQWUsSUFBSSxDQUFDO3dCQUN0QixPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLE1BQU0sQ0FBQztvQkFFNUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRzt3QkFDaEMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHO3dCQUNoQixJQUFJLEVBQUU7NEJBQ0osVUFBVTs0QkFDVixPQUFPOzRCQUNQLElBQUksRUFBRSxRQUFRO3lCQUNmLEVBQUMsQ0FBQyxDQUFDO2lCQUNQO3FCQUFNO29CQUNMLFlBQVksQ0FBQyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUN2RCxVQUFVLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2lCQUNwQzthQUNGO1lBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQ1gsWUFBWSxDQUFDLEtBQUssQ0FBQyw0QkFBNEIsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUNuRSxVQUFVLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNoQztRQUNILENBQUMsQ0FBQyxDQUNILEVBQ0QsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQ3pCLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFDLE9BQU8sRUFBQyxFQUFFLEVBQUU7WUFDeEIsTUFBTSxTQUFTLEdBQWtCLEVBQUUsQ0FBQztZQUNwQyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUU7Z0JBQ2xCLFNBQVMsQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztnQkFDbEMsU0FBUyxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7YUFDN0I7WUFDRCxPQUFPLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFO2dCQUNuQixlQUFlLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQzFFLE9BQU8sSUFBQSw0Q0FBb0IsRUFBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ25ELENBQUMsQ0FBQyxDQUFDLElBQUksQ0FDTCxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBQyxPQUFPLEVBQUUsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFDLEVBQUUsRUFBRTtnQkFDL0MsT0FBTyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUMxRSxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFrQyxDQUFDLENBQUM7WUFDekcsQ0FBQyxDQUFDLEVBQ0YsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDbEIsWUFBWSxDQUFDLElBQUksQ0FBQyxVQUFVLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQ3JELE9BQU8sRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQ3hCLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUM3QixDQUFDO1lBQ0osQ0FBQyxDQUFDLEVBQ0YsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FDWixDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQ0gsRUFDRCxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FDbEIsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTyxFQUFFLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLEVBQUMsRUFBRSxFQUFFO1lBQy9DLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFpQixDQUFDO1lBQ3RDLFlBQVksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2pFLENBQUMsQ0FBQyxDQUNILEVBQ0QsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQ3BCLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEVBQUUsRUFBRTtZQUMxQixZQUFZLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN2QyxDQUFDLENBQUMsQ0FDSCxDQUNGLENBQUMsSUFBSTtRQUNKLGlFQUFpRTtRQUNqRSxFQUFFLENBQUMsY0FBYyxFQUFFLEVBQ25CLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDekIsWUFBWSxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNsRCxPQUFPLEdBQUcsQ0FBQztRQUNiLENBQUMsQ0FBQyxDQUNILENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILE9BQU8sZUFBZSxDQUFDO0FBQ3pCLENBQUM7QUE3WUQsb0RBNllDO0FBRUQsU0FBZ0IsUUFBUSxDQUFDLE1BQWMsRUFBRSxJQUFZO0lBQ25ELE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUMzQyxNQUFNLEdBQUcsR0FBRyxNQUFNLEdBQUcsR0FBRyxDQUFDLFFBQVEsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxnQkFBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUMzRixPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUFKRCw0QkFJQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgSW5jb21pbmdNZXNzYWdlLCBTZXJ2ZXJSZXNwb25zZSB9IGZyb20gJ2h0dHAnO1xuaW1wb3J0IHV0aWwgZnJvbSAndXRpbCc7XG5pbXBvcnQgc3RyZWFtIGZyb20gJ3N0cmVhbSc7XG5pbXBvcnQgdXJsIGZyb20gJ3VybCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtSZXF1ZXN0LCBSZXNwb25zZSwgTmV4dEZ1bmN0aW9ufSBmcm9tICdleHByZXNzJztcbmltcG9ydCB7U2VydmVyT3B0aW9ucywgY3JlYXRlUHJveHlTZXJ2ZXJ9IGZyb20gJ2h0dHAtcHJveHknO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBhcGkgZnJvbSAnX19wbGluayc7XG5pbXBvcnQge2xvZzRGaWxlLCBjb25maWd9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuLy8gaW1wb3J0IHsgY3JlYXRlUHJveHlNaWRkbGV3YXJlIGFzIHByb3h5fSBmcm9tICdodHRwLXByb3h5LW1pZGRsZXdhcmUnO1xuaW1wb3J0IHtjcmVhdGVTbGljZSwgY2FzdEJ5QWN0aW9uVHlwZX0gZnJvbSAnQHdmaC9yZWR1eC10b29sa2l0LW9ic2VydmFibGUvZGlzdC90aW55LXJlZHV4LXRvb2xraXQnO1xuaW1wb3J0IHtjcmVhdGVSZXBsYXlSZWFkYWJsZUZhY3Rvcnl9IGZyb20gJy4uL3V0aWxzJztcbmltcG9ydCB7aHR0cFByb3h5T2JzZXJ2YWJsZSwgb2JzZXJ2ZVByb3h5UmVzcG9uc2V9IGZyb20gJy4uL2h0dHAtcHJveHktb2JzZXJ2YWJsZSc7XG5pbXBvcnQge1Byb3h5Q2FjaGVTdGF0ZSwgQ2FjaGVEYXRhfSBmcm9tICcuL3R5cGVzJztcblxuXG5jb25zdCBodHRwUHJveHlMb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVByb3h5V2l0aENhY2hlKHByb3h5UGF0aDogc3RyaW5nLCBzZXJ2ZXJPcHRpb25zOiBTZXJ2ZXJPcHRpb25zLCBjYWNoZVJvb3REaXI6IHN0cmluZyxcbiAgICAgICAgICAgICAgICAgb3B0czoge21hbnVhbDogYm9vbGVhbjsgbWVtQ2FjaGVMZW5ndGg/OiBudW1iZXJ9ID0ge21hbnVhbDogZmFsc2V9KSB7XG4gIGNvbnN0IGRlZmF1bHRQcm94eSA9IGNyZWF0ZVByb3h5U2VydmVyKHtcbiAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgd3M6IGZhbHNlLFxuICAgIHNlY3VyZTogZmFsc2UsXG4gICAgY29va2llRG9tYWluUmV3cml0ZTogeyAnKic6ICcnIH0sXG4gICAgZm9sbG93UmVkaXJlY3RzOiB0cnVlLFxuICAgIHByb3h5VGltZW91dDogMjAwMDAsXG4gICAgdGltZW91dDogMTAwMDAsXG4gICAgLi4uc2VydmVyT3B0aW9uc1xuICB9KTtcbiAgY29uc3QgaW5pdGlhbFN0YXRlOiBQcm94eUNhY2hlU3RhdGUgPSB7XG4gICAgcHJveHk6IGRlZmF1bHRQcm94eSxcbiAgICBjYWNoZURpcjogY2FjaGVSb290RGlyLFxuICAgIGNhY2hlQnlVcmk6IG5ldyBNYXAoKSxcbiAgICBtZW1DYWNoZUxlbmd0aDogb3B0cy5tZW1DYWNoZUxlbmd0aCA9PSBudWxsID8gTnVtYmVyLk1BWF9WQUxVRSA6IG9wdHMubWVtQ2FjaGVMZW5ndGhcbiAgfTtcblxuICBjb25zdCBwcm94eSQgPSBodHRwUHJveHlPYnNlcnZhYmxlKGRlZmF1bHRQcm94eSk7XG5cbiAgaWYgKCFvcHRzLm1hbnVhbCkge1xuICAgIGFwaS5leHByZXNzQXBwU2V0KGFwcCA9PiB7XG4gICAgICBhcHAudXNlKHByb3h5UGF0aCwgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgICAgIGNvbnN0IGtleSA9IGtleU9mVXJpKHJlcS5tZXRob2QsIHJlcS51cmwpO1xuICAgICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5oaXRDYWNoZSh7a2V5LCByZXEsIHJlcywgbmV4dH0pO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbiAgY29uc3QgY2FjaGVDb250cm9sbGVyID0gY3JlYXRlU2xpY2Uoe1xuICAgIGluaXRpYWxTdGF0ZSxcbiAgICBuYW1lOiBgSFRUUC1wcm94eS1jYWNoZS0ke3Byb3h5UGF0aH1gICxcbiAgICBkZWJ1Z0FjdGlvbk9ubHk6IGNvbmZpZygpLmNsaU9wdGlvbnM/LnZlcmJvc2UsXG4gICAgcmVkdWNlcnM6IHtcbiAgICAgIGNvbmZpZ1RyYW5zZm9ybWVyKHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDoge1xuICAgICAgICByZW1vdGU/OiBQcm94eUNhY2hlU3RhdGVbJ3Jlc3BvbnNlVHJhbnNmb3JtZXInXTtcbiAgICAgICAgY2FjaGVkPzogUHJveHlDYWNoZVN0YXRlWydjYWNoZVRyYW5zZm9ybWVyJ107XG4gICAgICB9KSB7XG4gICAgICAgIGlmIChwYXlsb2FkLnJlbW90ZSlcbiAgICAgICAgICBzLnJlc3BvbnNlVHJhbnNmb3JtZXIgPSBwYXlsb2FkLnJlbW90ZTtcbiAgICAgICAgaWYgKHBheWxvYWQuY2FjaGVkKVxuICAgICAgICAgIHMuY2FjaGVUcmFuc2Zvcm1lciA9IHBheWxvYWQuY2FjaGVkO1xuICAgICAgfSxcbiAgICAgIGhpdENhY2hlKHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDoge1xuICAgICAgICBrZXk6IHN0cmluZzsgcmVxOiBSZXF1ZXN0OyByZXM6IFJlc3BvbnNlOyBuZXh0OiBOZXh0RnVuY3Rpb247XG4gICAgICAgIC8qKiBvdmVycmlkZSByZW1vdGUgdGFyZ2V0ICovXG4gICAgICAgIHRhcmdldD86IHN0cmluZztcbiAgICAgIH0pIHt9LFxuXG4gICAgICBfcmVxdWVzdFJlbW90ZURvbmUoczogUHJveHlDYWNoZVN0YXRlLCBwYXlsb2FkOiB7XG4gICAgICAgIGtleTogc3RyaW5nOyByZXFIb3N0OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICAgIHJlczogU2VydmVyUmVzcG9uc2U7XG4gICAgICAgIGRhdGE6IHtoZWFkZXJzOiBDYWNoZURhdGFbJ2hlYWRlcnMnXTsgcmVhZGFibGU6IEluY29taW5nTWVzc2FnZX07XG4gICAgICB9KSB7fSxcblxuICAgICAgX2xvYWRGcm9tU3RvcmFnZShzOiBQcm94eUNhY2hlU3RhdGUsIHBheWxvYWQ6IHtrZXk6IHN0cmluZzsgcmVxOiBSZXF1ZXN0OyByZXM6IFJlc3BvbnNlO1xuICAgICAgICAgICAgICAgICAgICAgICBuZXh0OiBOZXh0RnVuY3Rpb247XG4gICAgICAgIHRhcmdldD86IHN0cmluZzsgfSkge1xuICAgICAgICBzLmNhY2hlQnlVcmkuc2V0KHBheWxvYWQua2V5LCAnbG9hZGluZycpO1xuICAgICAgfSxcblxuICAgICAgX3JlcXVlc3RSZW1vdGUoczogUHJveHlDYWNoZVN0YXRlLCBwYXlsb2FkOiB7a2V5OiBzdHJpbmc7IHJlcTogUmVxdWVzdDsgcmVzOiBSZXNwb25zZTsgbmV4dDogTmV4dEZ1bmN0aW9uO1xuICAgICAgICB0YXJnZXQ/OiBzdHJpbmc7IH0pIHtcbiAgICAgICAgcy5jYWNoZUJ5VXJpLnNldChwYXlsb2FkLmtleSwgJ3JlcXVlc3RpbmcnKTtcbiAgICAgIH0sXG4gICAgICBfc2F2aW5nRmlsZShzOiBQcm94eUNhY2hlU3RhdGUsIHBheWxvYWQ6IHtcbiAgICAgICAga2V5OiBzdHJpbmc7XG4gICAgICAgIHJlczogU2VydmVyUmVzcG9uc2U7XG4gICAgICAgIGRhdGE6IENhY2hlRGF0YTtcbiAgICAgIH0pIHtcbiAgICAgICAgcy5jYWNoZUJ5VXJpLnNldChwYXlsb2FkLmtleSwgJ3NhdmluZycpO1xuICAgICAgfSxcbiAgICAgIF9kb25lKHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDoge1xuICAgICAgICBrZXk6IHN0cmluZztcbiAgICAgICAgcmVzOiBTZXJ2ZXJSZXNwb25zZTtcbiAgICAgICAgZGF0YTogQ2FjaGVEYXRhO1xuICAgICAgfSkge1xuICAgICAgICBzLmNhY2hlQnlVcmkuZGVsZXRlKHBheWxvYWQua2V5KTtcbiAgICAgICAgLy8gaWYgKHBheWxvYWQuZGF0YS5zdGF0dXNDb2RlICE9PSAzMDQpIHtcbiAgICAgICAgLy8gICBpZiAocy5jYWNoZUJ5VXJpLnNpemUgPj0gcy5tZW1DYWNoZUxlbmd0aCkge1xuICAgICAgICAvLyAgICAgLy8gVE9ETzogaW1wcm92ZSBmb3IgTFJVIGFsZ29yaWd0aG1cbiAgICAgICAgLy8gICAgIHMuY2FjaGVCeVVyaS5kZWxldGUocGF5bG9hZC5rZXkpO1xuICAgICAgICAvLyAgICAgcmV0dXJuO1xuICAgICAgICAvLyAgIH1cbiAgICAgICAgLy8gICBzLmNhY2hlQnlVcmkuc2V0KHBheWxvYWQua2V5LCBwYXlsb2FkLmRhdGEpO1xuICAgICAgICAvLyB9XG4gICAgICB9LFxuICAgICAgX2NsZWFuKHM6IFByb3h5Q2FjaGVTdGF0ZSwga2V5OiBzdHJpbmcpIHtcbiAgICAgICAgcy5jYWNoZUJ5VXJpLmRlbGV0ZShrZXkpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgY2FjaGVDb250cm9sbGVyLmVwaWMoYWN0aW9uJCA9PiB7XG4gICAgY29uc3QgYWN0aW9ucyA9IGNhc3RCeUFjdGlvblR5cGUoY2FjaGVDb250cm9sbGVyLmFjdGlvbnMsIGFjdGlvbiQpO1xuICAgIGNvbnN0IGRpc3BhdGNoZXIgPSBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlcjtcblxuICAgIGFzeW5jIGZ1bmN0aW9uIHJlcXVlc3RpbmdSZW1vdGUoXG4gICAgICBrZXk6IHN0cmluZywgcmVxSG9zdDogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICAgICAgcHJveHlSZXM6IEluY29taW5nTWVzc2FnZSxcbiAgICAgIHJlczogU2VydmVyUmVzcG9uc2UsXG4gICAgICBoZWFkZXJzOiBbc3RyaW5nLCBzdHJpbmcgfCBzdHJpbmdbXV1bXSkge1xuXG4gICAgICBodHRwUHJveHlMb2cuZGVidWcoJ2NhY2hlIHNpemU6JywgY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCkuY2FjaGVCeVVyaS5zaXplKTtcbiAgICAgIGNvbnN0IGRpciA9IFBhdGguam9pbihjYWNoZUNvbnRyb2xsZXIuZ2V0U3RhdGUoKS5jYWNoZURpciwga2V5KTtcbiAgICAgIGNvbnN0IGZpbGUgPSBQYXRoLmpvaW4oZGlyLCAnYm9keScpO1xuICAgICAgY29uc3Qgc3RhdHVzQ29kZSA9IHByb3h5UmVzLnN0YXR1c0NvZGUgfHwgMjAwO1xuICAgICAgY29uc3Qge3Jlc3BvbnNlVHJhbnNmb3JtZXJ9ID0gY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCk7XG4gICAgICBpZiAoc3RhdHVzQ29kZSA9PT0gMzA0KSB7XG4gICAgICAgIGRpc3BhdGNoZXIuX2RvbmUoe2tleSwgcmVzLCBkYXRhOiB7XG4gICAgICAgICAgICBzdGF0dXNDb2RlLCBoZWFkZXJzLCBib2R5OiBjcmVhdGVSZXBsYXlSZWFkYWJsZUZhY3RvcnkocHJveHlSZXMpXG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaHR0cFByb3h5TG9nLndhcm4oJ1ZlcnNpb24gaW5mbyBpcyBub3QgcmVjb3JkZWQsIGR1ZSB0byByZXNwb25zZSAzMDQgZnJvbScsIHJlcy5yZXEudXJsLCAnLFxcbiB5b3UgY2FuIHJlbW92ZSBleGlzdGluZyBucG0vY2FjaGUgY2FjaGUgdG8gYXZvaWQgMzA0Jyk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIGlmIChzdGF0dXNDb2RlICE9PSAyMDApIHtcbiAgICAgICAgaHR0cFByb3h5TG9nLmVycm9yKGBSZXNwb25zZSBjb2RlIGlzICR7c3RhdHVzQ29kZX0gZm9yIHJlcXVlc3Q6YCwgcmVzLnJlcS51cmwpO1xuICAgICAgICBkaXNwYXRjaGVyLl9kb25lKHtrZXksIHJlcywgZGF0YToge3N0YXR1c0NvZGUsIGhlYWRlcnMsIGJvZHk6ICgpID0+IHByb3h5UmVzfX0pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGlmIChyZXNwb25zZVRyYW5zZm9ybWVyID09IG51bGwpIHtcbiAgICAgICAgY29uc3QgZG9uZU1rZGlyID0gZnMubWtkaXJwKGRpcik7XG4gICAgICAgIGNvbnN0IHJlYWRhYmxlRmFjID0gY3JlYXRlUmVwbGF5UmVhZGFibGVGYWN0b3J5KHByb3h5UmVzLCB1bmRlZmluZWQsXG4gICAgICAgICAge2RlYnVnSW5mbzoga2V5LCBleHBlY3RMZW46IHBhcnNlSW50KHByb3h5UmVzLmhlYWRlcnNbJ2NvbnRlbnQtbGVuZ3RoJ10gYXMgc3RyaW5nLCAxMCl9KTtcbiAgICAgICAgIC8vIGRpc3BhdGNoZXIuX2RvbmUoe2tleSwgZGF0YToge1xuICAgICAgICAgLy8gICAgICAgc3RhdHVzQ29kZSwgaGVhZGVycywgYm9keTogKCkgPT4gcHJveHlSZXNcbiAgICAgICAgIC8vICAgICB9LCByZXNcbiAgICAgICAgIC8vICAgfSk7XG4gICAgICAgIGRpc3BhdGNoZXIuX3NhdmluZ0ZpbGUoe2tleSwgZGF0YToge1xuICAgICAgICAgICAgc3RhdHVzQ29kZSwgaGVhZGVycywgYm9keTogcmVhZGFibGVGYWNcbiAgICAgICAgICB9LCByZXNcbiAgICAgICAgfSk7XG4gICAgICAgIGF3YWl0IGRvbmVNa2RpcjtcbiAgICAgICAgdm9pZCBmcy5wcm9taXNlcy53cml0ZUZpbGUoXG4gICAgICAgICAgUGF0aC5qb2luKGRpciwgJ2hlYWRlci5qc29uJyksXG4gICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh7c3RhdHVzQ29kZSwgaGVhZGVyc30sIG51bGwsICcgICcpLFxuICAgICAgICAgICd1dGYtOCcpO1xuXG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4gcmVhZGFibGVGYWMoKVxuICAgICAgICAgICAgLnBpcGUoZnMuY3JlYXRlV3JpdGVTdHJlYW0oZmlsZSkpXG4gICAgICAgICAgICAub24oJ2ZpbmlzaCcsIHJlc29sdmUpXG4gICAgICAgICAgICAub24oJ2Vycm9yJywgcmVqZWN0KSk7XG5cbiAgICAgICAgICBkaXNwYXRjaGVyLl9kb25lKHtrZXksIGRhdGE6IHtcbiAgICAgICAgICAgICAgc3RhdHVzQ29kZSwgaGVhZGVycywgYm9keTogcmVhZGFibGVGYWNcbiAgICAgICAgICAgIH0sIHJlc1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgaHR0cFByb3h5TG9nLmluZm8oYHJlc3BvbnNlIGlzIHdyaXR0ZW4gdG8gKGxlbmd0aDogJHtoZWFkZXJzLmZpbmQoaXRlbSA9PiBpdGVtWzBdID09PSAnY29udGVudC1sZW5ndGgnKSFbMV0gYXMgc3RyaW5nfSlgLFxuICAgICAgICAgICAgUGF0aC5wb3NpeC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBmaWxlKSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBodHRwUHJveHlMb2cuZXJyb3IoJ0ZhaWxlZCB0byB3cml0ZSBjYWNoZSBmaWxlICcgK1xuICAgICAgICAgICAgUGF0aC5wb3NpeC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBmaWxlKSwgZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAocmVxSG9zdCAmJiAhcmVxSG9zdC5zdGFydHNXaXRoKCdodHRwJykpIHtcbiAgICAgICAgcmVxSG9zdCA9ICdodHRwOi8vJyArIHJlcUhvc3Q7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHtyZWFkYWJsZTogdHJhbnNmb3JtZWQsIGxlbmd0aH0gPSBhd2FpdCByZXNwb25zZVRyYW5zZm9ybWVyKGhlYWRlcnMsIHJlcUhvc3QsIHByb3h5UmVzKTtcbiAgICAgIGNvbnN0IGxlbmd0aEhlYWRlcklkeCA9IGhlYWRlcnMuZmluZEluZGV4KHJvdyA9PiByb3dbMF0gPT09ICdjb250ZW50LWxlbmd0aCcpO1xuICAgICAgaWYgKGxlbmd0aEhlYWRlcklkeCA+PSAwKVxuICAgICAgICBoZWFkZXJzW2xlbmd0aEhlYWRlcklkeF1bMV0gPSAnJyArIGxlbmd0aDtcblxuICAgICAgZGlzcGF0Y2hlci5fc2F2aW5nRmlsZSh7a2V5LCByZXMsIGRhdGE6IHtcbiAgICAgICAgICBzdGF0dXNDb2RlLCBoZWFkZXJzLCBib2R5OiB0cmFuc2Zvcm1lZFxuICAgICAgfSB9KTtcblxuICAgICAgYXdhaXQgZnMubWtkaXJwKGRpcik7XG4gICAgICB2b2lkIGZzLnByb21pc2VzLndyaXRlRmlsZShcbiAgICAgICAgUGF0aC5qb2luKGRpciwgJ2hlYWRlci5qc29uJyksXG4gICAgICAgIEpTT04uc3RyaW5naWZ5KHtzdGF0dXNDb2RlLCBoZWFkZXJzfSwgbnVsbCwgJyAgJyksXG4gICAgICAgICd1dGYtOCcpO1xuICAgICAgYXdhaXQgbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4gdHJhbnNmb3JtZWQoKVxuICAgICAgICAub24oJ2VuZCcsIHJlc29sdmUpXG4gICAgICAgIC5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKGZpbGUpKVxuICAgICAgICAub24oJ2Vycm9yJywgcmVqZWN0KSk7XG5cbiAgICAgIGRpc3BhdGNoZXIuX2RvbmUoe2tleSwgcmVzLCBkYXRhOiB7XG4gICAgICAgICAgc3RhdHVzQ29kZSwgaGVhZGVycywgYm9keTogdHJhbnNmb3JtZWRcbiAgICAgIH0gfSk7XG4gICAgICBodHRwUHJveHlMb2cuaW5mbygnd3JpdGUgcmVzcG9uc2UgdG8gZmlsZScsIFBhdGgucG9zaXgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgZmlsZSksICdzaXplJywgbGVuZ3RoKTtcbiAgICB9XG5cbiAgICByZXR1cm4gcngubWVyZ2UoXG4gICAgICBhY3Rpb25zLmhpdENhY2hlLnBpcGUoXG4gICAgICAgIG9wLm1lcmdlTWFwKCAoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgICAgY29uc3Qgd2FpdENhY2hlQW5kU2VuZFJlcyA9IGFjdGlvbnMuX2RvbmUucGlwZShcbiAgICAgICAgICAgIC8vIEluIGNhc2UgaXQgaXMgb2YgcmVkaXJlY3RlZCByZXF1ZXN0LCBIUE0gaGFzIGRvbmUgcGlwaW5nIHJlc3BvbnNlIChpZ25vcmVkIFwibWFudWFsIHJlcG9uc2VcIiBzZXR0aW5nKVxuICAgICAgICAgICAgb3AuZmlsdGVyKGFjdGlvbiA9PiBhY3Rpb24ucGF5bG9hZC5rZXkgPT09IHBheWxvYWQua2V5KSxcbiAgICAgICAgICAgIG9wLnRha2UoMSksXG4gICAgICAgICAgICBvcC5tZXJnZU1hcCgoe3BheWxvYWQ6IHtrZXksIHJlcywgZGF0YX19KSA9PiB7XG4gICAgICAgICAgICAgIGlmIChyZXMud3JpdGFibGVFbmRlZCkge1xuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignUmVzcG9uc2UgaXMgZW5kZWQgZWFybHksIHdoeT8nKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGRhdGEuaGVhZGVycykge1xuICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoZW50cnlbMF0sIGVudHJ5WzFdKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IGRhdGEuc3RhdHVzQ29kZTtcbiAgICAgICAgICAgICAgY29uc3QgcGlwZUV2ZW50JCA9IG5ldyByeC5TdWJqZWN0PCdmaW5pc2gnIHwgJ2Nsb3NlJz4oKTtcbiAgICAgICAgICAgICAgcmVzLm9uKCdmaW5pc2gnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgcGlwZUV2ZW50JC5uZXh0KCdmaW5pc2gnKTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgLm9uKCdjbG9zZScsICgpID0+IHtcbiAgICAgICAgICAgICAgICBwaXBlRXZlbnQkLm5leHQoJ2Nsb3NlJyk7XG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIC5vbignZXJyb3InLCBlcnIgPT4gcGlwZUV2ZW50JC5lcnJvcihlcnIpKTtcblxuICAgICAgICAgICAgICBkYXRhLmJvZHkoKS5waXBlKHJlcyk7XG4gICAgICAgICAgICAgIGh0dHBQcm94eUxvZy5pbmZvKCdwaXBlIHJlc3BvbnNlIG9mJywgcGF5bG9hZC5rZXkpO1xuXG4gICAgICAgICAgICAgIHJldHVybiBwaXBlRXZlbnQkLnBpcGUoXG4gICAgICAgICAgICAgICAgb3AuZmlsdGVyKGV2ZW50ID0+IGV2ZW50ID09PSAnZmluaXNoJyB8fCBldmVudCA9PT0gJ2Nsb3NlJyksXG4gICAgICAgICAgICAgICAgb3AudGFwKGV2ZW50ID0+IHtcbiAgICAgICAgICAgICAgICAgIGlmIChldmVudCA9PT0gJ2Nsb3NlJylcbiAgICAgICAgICAgICAgICAgICAgaHR0cFByb3h5TG9nLmVycm9yKCdSZXNwb25zZSBjb25uZWN0aW9uIGlzIGNsb3NlZCBlYXJseScsIGtleSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICdleHBlY3QgY29udGVudC1sZW50aCcsIGRhdGEuaGVhZGVyc1snY29udGVudC1sZW5ndGgnXSk7XG4gICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgb3AudGFrZSgxKSxcbiAgICAgICAgICAgICAgICBvcC5tYXBUbyhrZXkpXG4gICAgICAgICAgICAgICAgLy8gb3AudGltZW91dCgxMjAwMDApLFxuICAgICAgICAgICAgICAgIC8vIG9wLmNhdGNoRXJyb3IoZXJyID0+IHtcbiAgICAgICAgICAgICAgICAgIC8vIGh0dHBQcm94eUxvZy5lcnJvcihlcnIpO1xuICAgICAgICAgICAgICAgICAgLy8gaWYgKCFyZXMuaGVhZGVyc1NlbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gcmVzLnN0YXR1c0NvZGUgPSA1MDA7XG4gICAgICAgICAgICAgICAgICAgIC8vIHJlcy5lbmQoKTtcbiAgICAgICAgICAgICAgICAgIC8vIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHJlcy5lbmQoKTtcbiAgICAgICAgICAgICAgICAgIC8vIH1cbiAgICAgICAgICAgICAgICAgIC8vIHJldHVybiByeC5FTVBUWTtcbiAgICAgICAgICAgICAgICAvLyB9KVxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBvcC50YXAoa2V5ID0+IGh0dHBQcm94eUxvZy5pbmZvKGByZXBsaWVkOiAke2tleX1gKSlcbiAgICAgICAgICApO1xuICAgICAgICAgIGNvbnN0IGl0ZW0gPSBjYWNoZUNvbnRyb2xsZXIuZ2V0U3RhdGUoKS5jYWNoZUJ5VXJpLmdldChwYXlsb2FkLmtleSk7XG4gICAgICAgICAgaHR0cFByb3h5TG9nLmluZm8oJ2hpdENhY2hlIGZvciAnICsgcGF5bG9hZC5rZXkpO1xuXG4gICAgICAgICAgbGV0IGZpbmlzaGVkJDogcnguT2JzZXJ2YWJsZTx1bmtub3duPiB8IHVuZGVmaW5lZDtcblxuICAgICAgICAgIGlmIChpdGVtID09IG51bGwpIHtcbiAgICAgICAgICAgIGZpbmlzaGVkJCA9IHJ4Lm1lcmdlKFxuICAgICAgICAgICAgICB3YWl0Q2FjaGVBbmRTZW5kUmVzLFxuICAgICAgICAgICAgICByeC5kZWZlcigoKSA9PiB7XG4gICAgICAgICAgICAgICAgZGlzcGF0Y2hlci5fbG9hZEZyb21TdG9yYWdlKHBheWxvYWQpO1xuICAgICAgICAgICAgICAgIHJldHVybiByeC5FTVBUWTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfSBlbHNlIGlmIChpdGVtID09PSAnbG9hZGluZycgfHwgaXRlbSA9PT0gJ3JlcXVlc3RpbmcnIHx8IGl0ZW0gPT09ICdzYXZpbmcnKSB7XG4gICAgICAgICAgICBmaW5pc2hlZCQgPSB3YWl0Q2FjaGVBbmRTZW5kUmVzO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBodHRwUHJveHlMb2cuaW5mbygnaGl0IGNhY2hlZCcsIHBheWxvYWQua2V5KTtcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zZm9ybWVyID0gY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCkuY2FjaGVUcmFuc2Zvcm1lcjtcbiAgICAgICAgICAgIGlmICh0cmFuc2Zvcm1lciA9PSBudWxsKSB7XG4gICAgICAgICAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgaXRlbS5oZWFkZXJzKSB7XG4gICAgICAgICAgICAgICAgcGF5bG9hZC5yZXMuc2V0SGVhZGVyKGVudHJ5WzBdLCBlbnRyeVsxXSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcGF5bG9hZC5yZXMuc3RhdHVzKGl0ZW0uc3RhdHVzQ29kZSk7XG4gICAgICAgICAgICAgIGZpbmlzaGVkJCA9IG5ldyByeC5PYnNlcnZhYmxlPHZvaWQ+KHN1YiA9PiB7XG4gICAgICAgICAgICAgICAgaXRlbS5ib2R5KClcbiAgICAgICAgICAgICAgICAub24oJ2VuZCcsICgpID0+IHtzdWIubmV4dCgpOyBzdWIuY29tcGxldGUoKTsgfSlcbiAgICAgICAgICAgICAgICAucGlwZShwYXlsb2FkLnJlcyk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgZmluaXNoZWQkID0gcnguZnJvbSh0cmFuc2Zvcm1lcihpdGVtLmhlYWRlcnMsIHBheWxvYWQucmVxLmhlYWRlcnMuaG9zdCwgaXRlbS5ib2R5KCkpKS5waXBlKFxuICAgICAgICAgICAgICAgIG9wLnRha2UoMSksXG4gICAgICAgICAgICAgICAgb3AubWVyZ2VNYXAoKHtyZWFkYWJsZSwgbGVuZ3RofSkgPT4ge1xuICAgICAgICAgICAgICAgICAgY29uc3QgbGVuZ3RoSGVhZGVySWR4ID0gaXRlbS5oZWFkZXJzLmZpbmRJbmRleChyb3cgPT4gcm93WzBdID09PSAnY29udGVudC1sZW5ndGgnKTtcbiAgICAgICAgICAgICAgICAgIGlmIChsZW5ndGhIZWFkZXJJZHggPj0gMClcbiAgICAgICAgICAgICAgICAgICAgaXRlbS5oZWFkZXJzW2xlbmd0aEhlYWRlcklkeF1bMV0gPSAnJyArIGxlbmd0aDtcbiAgICAgICAgICAgICAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgaXRlbS5oZWFkZXJzKSB7XG4gICAgICAgICAgICAgICAgICAgIHBheWxvYWQucmVzLnNldEhlYWRlcihlbnRyeVswXSwgZW50cnlbMV0pO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgcGF5bG9hZC5yZXMuc3RhdHVzKGl0ZW0uc3RhdHVzQ29kZSk7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gc3RyZWFtLnByb21pc2VzLnBpcGVsaW5lKFxuICAgICAgICAgICAgICAgICAgICByZWFkYWJsZSgpLCBwYXlsb2FkLnJlc1xuICAgICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIHJldHVybiByeC50aW1lcig1MDAwLCA1MDAwKS5waXBlKFxuICAgICAgICAgICAgb3AudGFrZVVudGlsKGZpbmlzaGVkJCksXG4gICAgICAgICAgICBvcC5tYXAoaWR4ID0+IHtcbiAgICAgICAgICAgICAgY29uc3QgaXRlbSA9IGNhY2hlQ29udHJvbGxlci5nZXRTdGF0ZSgpLmNhY2hlQnlVcmkuZ2V0KHBheWxvYWQua2V5KTtcbiAgICAgICAgICAgICAgaHR0cFByb3h5TG9nLmluZm8oYCR7Y2hhbGsuYmx1ZShwYXlsb2FkLmtleSl9IFske3R5cGVvZiBpdGVtID09PSAnc3RyaW5nJyA/IGl0ZW0gOiAnY2FjaGVkJ31dIGhhcyBiZWVuIHByb2Nlc3NlZCBmb3IgJHtjaGFsay55ZWxsb3coKGlkeCArIDEpICogNSArICdzJyl9YCk7XG4gICAgICAgICAgICAgIHJldHVybiBpdGVtO1xuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBvcC5jb3VudCgpLFxuICAgICAgICAgICAgb3AudGFwKCgpID0+IGh0dHBQcm94eUxvZy5pbmZvKGAke2NoYWxrLmdyZWVuKHBheWxvYWQua2V5KX0gaXMgZmluaXNoZWRgKSksXG4gICAgICAgICAgICBvcC50aW1lb3V0KDYwMDAwKSxcbiAgICAgICAgICAgIG9wLmNhdGNoRXJyb3IoKGVycikgPT4ge1xuICAgICAgICAgICAgICBodHRwUHJveHlMb2cuZXJyb3IoJ0ZhaWxlZCB0byB3cml0ZSByZXNwb25zZScsIGVycik7XG4gICAgICAgICAgICAgIHJldHVybiByeC5FTVBUWTtcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgKTtcbiAgICAgICAgfSwgNSlcbiAgICAgICksXG4gICAgICBhY3Rpb25zLl9sb2FkRnJvbVN0b3JhZ2UucGlwZShcbiAgICAgICAgb3AubWVyZ2VNYXAoYXN5bmMgKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBkaXIgPSBQYXRoLmpvaW4oY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCkuY2FjaGVEaXIsIHBheWxvYWQua2V5KTtcbiAgICAgICAgICAgIGNvbnN0IGhGaWxlID0gUGF0aC5qb2luKGRpciwgJ2hlYWRlci5qc29uJyk7XG4gICAgICAgICAgICBjb25zdCBiRmlsZSA9IFBhdGguam9pbihkaXIsICdib2R5Jyk7XG4gICAgICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhoRmlsZSkpIHtcbiAgICAgICAgICAgICAgaHR0cFByb3h5TG9nLmluZm8oJ2xvYWQnLCBwYXlsb2FkLmtleSk7XG4gICAgICAgICAgICAgIGNvbnN0IHRyYW5zZm9ybWVyID0gY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCkuY2FjaGVUcmFuc2Zvcm1lcjtcbiAgICAgICAgICAgICAgaWYgKHRyYW5zZm9ybWVyID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBoZWFkZXJzU3RyID0gYXdhaXQgZnMucHJvbWlzZXMucmVhZEZpbGUoaEZpbGUsICd1dGYtOCcpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHtzdGF0dXNDb2RlLCBoZWFkZXJzfSA9IEpTT04ucGFyc2UoaGVhZGVyc1N0cikgYXMge3N0YXR1c0NvZGU6IG51bWJlcjsgaGVhZGVyczogW3N0cmluZywgc3RyaW5nIHwgc3RyaW5nW11dW119O1xuXG4gICAgICAgICAgICAgICAgZGlzcGF0Y2hlci5fZG9uZSh7a2V5OiBwYXlsb2FkLmtleSwgcmVzOiBwYXlsb2FkLnJlcyxcbiAgICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgICAgc3RhdHVzQ29kZSxcbiAgICAgICAgICAgICAgICAgICAgaGVhZGVycyxcbiAgICAgICAgICAgICAgICAgICAgYm9keTogKCkgPT4gZnMuY3JlYXRlUmVhZFN0cmVhbShiRmlsZSlcbiAgICAgICAgICAgICAgICAgIH19KTtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBjb25zdCBoZWFkZXJzU3RyID0gYXdhaXQgZnMucHJvbWlzZXMucmVhZEZpbGUoaEZpbGUsICd1dGYtOCcpO1xuICAgICAgICAgICAgICBjb25zdCB7c3RhdHVzQ29kZSwgaGVhZGVyc30gPSBKU09OLnBhcnNlKGhlYWRlcnNTdHIpIGFzIHtzdGF0dXNDb2RlOiBudW1iZXI7IGhlYWRlcnM6IFtzdHJpbmcsIHN0cmluZyB8IHN0cmluZ1tdXVtdfTtcbiAgICAgICAgICAgICAgY29uc3Qge3JlYWRhYmxlLCBsZW5ndGh9ID0gYXdhaXQgdHJhbnNmb3JtZXIoaGVhZGVycywgcGF5bG9hZC5yZXEuaGVhZGVycy5ob3N0LCBmcy5jcmVhdGVSZWFkU3RyZWFtKGJGaWxlKSk7XG4gICAgICAgICAgICAgIGNvbnN0IGxlbmd0aEhlYWRlcklkeCA9IGhlYWRlcnMuZmluZEluZGV4KHJvdyA9PiByb3dbMF0gPT09ICdjb250ZW50LWxlbmd0aCcpO1xuICAgICAgICAgICAgICBpZiAobGVuZ3RoSGVhZGVySWR4ID49IDApXG4gICAgICAgICAgICAgICAgaGVhZGVyc1tsZW5ndGhIZWFkZXJJZHhdWzFdID0gJycgKyBsZW5ndGg7XG5cbiAgICAgICAgICAgICAgZGlzcGF0Y2hlci5fZG9uZSh7a2V5OiBwYXlsb2FkLmtleSxcbiAgICAgICAgICAgICAgICByZXM6IHBheWxvYWQucmVzLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgIHN0YXR1c0NvZGUsXG4gICAgICAgICAgICAgICAgICBoZWFkZXJzLFxuICAgICAgICAgICAgICAgICAgYm9keTogcmVhZGFibGVcbiAgICAgICAgICAgICAgICB9fSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBodHRwUHJveHlMb2cuaW5mbygnTm8gZXhpc3RpbmcgZmlsZSBmb3InLCBwYXlsb2FkLmtleSk7XG4gICAgICAgICAgICAgIGRpc3BhdGNoZXIuX3JlcXVlc3RSZW1vdGUocGF5bG9hZCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgICAgIGh0dHBQcm94eUxvZy5lcnJvcignRmFpbGVkIHRvIHNhdmUgY2FjaGUgZm9yOiAnICsgcGF5bG9hZC5rZXksIGV4KTtcbiAgICAgICAgICAgIGRpc3BhdGNoZXIuX2NsZWFuKHBheWxvYWQua2V5KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICApLFxuICAgICAgYWN0aW9ucy5fcmVxdWVzdFJlbW90ZS5waXBlKFxuICAgICAgICBvcC5tZXJnZU1hcCgoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgICAgY29uc3QgcHJveHlPcHRzOiBTZXJ2ZXJPcHRpb25zID0ge307XG4gICAgICAgICAgaWYgKHBheWxvYWQudGFyZ2V0KSB7XG4gICAgICAgICAgICBwcm94eU9wdHMudGFyZ2V0ID0gcGF5bG9hZC50YXJnZXQ7XG4gICAgICAgICAgICBwcm94eU9wdHMuaWdub3JlUGF0aCA9IHRydWU7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiByeC5kZWZlcigoKSA9PiB7XG4gICAgICAgICAgICBjYWNoZUNvbnRyb2xsZXIuZ2V0U3RhdGUoKS5wcm94eS53ZWIocGF5bG9hZC5yZXEsIHBheWxvYWQucmVzLCBwcm94eU9wdHMpO1xuICAgICAgICAgICAgcmV0dXJuIG9ic2VydmVQcm94eVJlc3BvbnNlKHByb3h5JCwgcGF5bG9hZC5yZXMpO1xuICAgICAgICAgIH0pLnBpcGUoXG4gICAgICAgICAgICBvcC5tZXJnZU1hcCgoe3BheWxvYWQ6IFtwcm94eVJlcywgX3JlcSwgcmVzXX0pID0+IHtcbiAgICAgICAgICAgICAgcmV0dXJuIHJlcXVlc3RpbmdSZW1vdGUocGF5bG9hZC5rZXksIHBheWxvYWQucmVxLmhlYWRlcnMuaG9zdCwgcHJveHlSZXMsIHJlcyxcbiAgICAgICAgICAgICAgICBPYmplY3QuZW50cmllcyhwcm94eVJlcy5oZWFkZXJzKS5maWx0ZXIoZW50cnkgPT4gZW50cnlbMV0gIT0gbnVsbCkgYXMgW3N0cmluZywgc3RyaW5nIHwgc3RyaW5nW11dW10pO1xuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBvcC5jYXRjaEVycm9yKGVyciA9PiB7XG4gICAgICAgICAgICAgIGh0dHBQcm94eUxvZy53YXJuKGBSZXRyeSBcIiR7cGF5bG9hZC5yZXEudXJsfVwiYCwgZXJyKTtcbiAgICAgICAgICAgICAgcmV0dXJuIHJ4LnRpbWVyKDEwMDApLnBpcGUoXG4gICAgICAgICAgICAgICAgb3AubWFwVG8ocngudGhyb3dFcnJvcihlcnIpKVxuICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBvcC5yZXRyeSgzKVxuICAgICAgICAgICk7XG4gICAgICAgIH0pXG4gICAgICApLFxuICAgICAgcHJveHkkLnByb3h5UmVxLnBpcGUoXG4gICAgICAgIG9wLnRhcCgoe3BheWxvYWQ6IFtwcm94eVJlcSwgcmVxLCByZXMsIG9wdHNdfSkgPT4ge1xuICAgICAgICAgIGNvbnN0IHRhcmdldCA9IG9wdHMudGFyZ2V0IGFzIHVybC5Vcmw7XG4gICAgICAgICAgaHR0cFByb3h5TG9nLmluZm8oJ1JlcXVlc3QnLCB0YXJnZXQuaG9zdG5hbWUsIHRhcmdldC5wYXRobmFtZSk7XG4gICAgICAgIH0pXG4gICAgICApLFxuICAgICAgcHJveHkkLmVjb25ucmVzZXQucGlwZShcbiAgICAgICAgb3AudGFwKCh7cGF5bG9hZDogW2Vycl19KSA9PiB7XG4gICAgICAgICAgaHR0cFByb3h5TG9nLmluZm8oJ2Vjb25ucmVzZXQnLCBlcnIpO1xuICAgICAgICB9KVxuICAgICAgKVxuICAgICkucGlwZShcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFyZ3VtZW50XG4gICAgICBvcC5pZ25vcmVFbGVtZW50cygpLFxuICAgICAgb3AuY2F0Y2hFcnJvcigoZXJyLCBzcmMpID0+IHtcbiAgICAgICAgaHR0cFByb3h5TG9nLmVycm9yKCdIVFRQIHByb3h5IGNhY2hlIGVycm9yJywgZXJyKTtcbiAgICAgICAgcmV0dXJuIHNyYztcbiAgICAgIH0pXG4gICAgKTtcbiAgfSk7XG5cbiAgcmV0dXJuIGNhY2hlQ29udHJvbGxlcjtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGtleU9mVXJpKG1ldGhvZDogc3RyaW5nLCBwYXRoOiBzdHJpbmcpIHtcbiAgY29uc3QgdXJsID0gbmV3IFVSTCgnaHR0cDovL2YuY29tJyArIHBhdGgpO1xuICBjb25zdCBrZXkgPSBtZXRob2QgKyB1cmwucGF0aG5hbWUgKyAodXJsLnNlYXJjaCA/ICcvJyArIF8udHJpbVN0YXJ0KHVybC5zZWFyY2gsICc/JykgOiAnJyk7XG4gIHJldHVybiBrZXk7XG59XG4iXX0=