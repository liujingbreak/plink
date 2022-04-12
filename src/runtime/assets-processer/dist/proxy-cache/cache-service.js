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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGUtc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNhY2hlLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGdEQUF3QjtBQUV4QixvREFBNEI7QUFFNUIsd0RBQTBCO0FBQzFCLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMsb0RBQXVCO0FBRXZCLDJDQUE0RDtBQUM1RCxrREFBMEI7QUFDMUIsc0RBQTBCO0FBQzFCLHNDQUE0QztBQUM1Qyx5RUFBeUU7QUFDekUsOEZBQW9HO0FBQ3BHLG9DQUFxRDtBQUNyRCxvRUFBbUY7QUFJbkYsTUFBTSxZQUFZLEdBQUcsSUFBQSxnQkFBUSxFQUFDLFVBQVUsQ0FBQyxDQUFDO0FBRTFDLFNBQWdCLG9CQUFvQixDQUFDLFNBQWlCLEVBQUUsYUFBNEIsRUFBRSxZQUFvQixFQUN6RixPQUFtRCxFQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUM7O0lBQ2pGLE1BQU0sWUFBWSxHQUFHLElBQUEsOEJBQWlCLGtCQUNwQyxZQUFZLEVBQUUsSUFBSSxFQUNsQixFQUFFLEVBQUUsS0FBSyxFQUNULE1BQU0sRUFBRSxLQUFLLEVBQ2IsbUJBQW1CLEVBQUUsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQ2hDLGVBQWUsRUFBRSxJQUFJLEVBQ3JCLFlBQVksRUFBRSxLQUFLLEVBQ25CLE9BQU8sRUFBRSxLQUFLLElBQ1gsYUFBYSxFQUNoQixDQUFDO0lBQ0gsTUFBTSxZQUFZLEdBQW9CO1FBQ3BDLEtBQUssRUFBRSxZQUFZO1FBQ25CLFFBQVEsRUFBRSxZQUFZO1FBQ3RCLFVBQVUsRUFBRSxJQUFJLEdBQUcsRUFBRTtRQUNyQixjQUFjLEVBQUUsSUFBSSxDQUFDLGNBQWMsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxjQUFjO0tBQ3JGLENBQUM7SUFFRixNQUFNLE1BQU0sR0FBRyxJQUFBLDJDQUFtQixFQUFDLFlBQVksQ0FBQyxDQUFDO0lBRWpELElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO1FBQ2hCLGlCQUFHLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3RCLEdBQUcsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRTtnQkFDcEMsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUMxQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDLEVBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztZQUNuRSxDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUFDO0tBQ0o7SUFDRCxNQUFNLGVBQWUsR0FBRyxJQUFBLGdDQUFXLEVBQUM7UUFDbEMsWUFBWTtRQUNaLElBQUksRUFBRSxvQkFBb0IsU0FBUyxFQUFFO1FBQ3JDLGVBQWUsRUFBRSxNQUFBLElBQUEsY0FBTSxHQUFFLENBQUMsVUFBVSwwQ0FBRSxPQUFPO1FBQzdDLFFBQVEsRUFBRTtZQUNSLGlCQUFpQixDQUFDLENBQWtCLEVBQUUsT0FHckM7Z0JBQ0MsSUFBSSxPQUFPLENBQUMsTUFBTTtvQkFDaEIsQ0FBQyxDQUFDLG1CQUFtQixHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUM7Z0JBQ3pDLElBQUksT0FBTyxDQUFDLE1BQU07b0JBQ2hCLENBQUMsQ0FBQyxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDO1lBQ3hDLENBQUM7WUFDRCxRQUFRLENBQUMsQ0FBa0IsRUFBRSxPQUk1QixJQUFHLENBQUM7WUFFTCxrQkFBa0IsQ0FBQyxDQUFrQixFQUFFLE9BSXRDLElBQUcsQ0FBQztZQUVMLGdCQUFnQixDQUFDLENBQWtCLEVBQUUsT0FFakI7Z0JBQ2xCLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDM0MsQ0FBQztZQUVELGNBQWMsQ0FBQyxDQUFrQixFQUFFLE9BQ2Y7Z0JBQ2xCLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsWUFBWSxDQUFDLENBQUM7WUFDOUMsQ0FBQztZQUNELFdBQVcsQ0FBQyxDQUFrQixFQUFFLE9BSS9CO2dCQUNDLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsUUFBUSxDQUFDLENBQUM7WUFDMUMsQ0FBQztZQUNELEtBQUssQ0FBQyxDQUFrQixFQUFFLE9BSXpCO2dCQUNDLENBQUMsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDakMseUNBQXlDO2dCQUN6QyxpREFBaUQ7Z0JBQ2pELDBDQUEwQztnQkFDMUMsd0NBQXdDO2dCQUN4QyxjQUFjO2dCQUNkLE1BQU07Z0JBQ04saURBQWlEO2dCQUNqRCxJQUFJO1lBQ04sQ0FBQztZQUNELE1BQU0sQ0FBQyxDQUFrQixFQUFFLEdBQVc7Z0JBQ3BDLENBQUMsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQzNCLENBQUM7U0FDRjtLQUNGLENBQUMsQ0FBQztJQUVILGVBQWUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDN0IsTUFBTSxPQUFPLEdBQUcsSUFBQSxxQ0FBZ0IsRUFBQyxlQUFlLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBQ25FLE1BQU0sVUFBVSxHQUFHLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQztRQUVwRCxLQUFLLFVBQVUsZ0JBQWdCLENBQzdCLEdBQVcsRUFBRSxPQUEyQixFQUN4QyxRQUF5QixFQUN6QixHQUFtQixFQUNuQixPQUFzQztZQUV0QyxZQUFZLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxlQUFlLENBQUMsUUFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzlFLE1BQU0sR0FBRyxHQUFHLGNBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNoRSxNQUFNLElBQUksR0FBRyxjQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUNwQyxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsVUFBVSxJQUFJLEdBQUcsQ0FBQztZQUM5QyxNQUFNLEVBQUMsbUJBQW1CLEVBQUMsR0FBRyxlQUFlLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDekQsSUFBSSxVQUFVLEtBQUssR0FBRyxFQUFFO2dCQUN0QixVQUFVLENBQUMsS0FBSyxDQUFDLEVBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUU7d0JBQzlCLFVBQVUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUEsbUNBQTJCLEVBQUMsUUFBUSxDQUFDO3FCQUNqRTtpQkFDRixDQUFDLENBQUM7Z0JBQ0gsWUFBWSxDQUFDLElBQUksQ0FBQyx3REFBd0QsRUFBRSxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSwwREFBMEQsQ0FBQyxDQUFDO2dCQUNySixPQUFPO2FBQ1I7WUFDRCxJQUFJLFVBQVUsS0FBSyxHQUFHLEVBQUU7Z0JBQ3RCLFlBQVksQ0FBQyxLQUFLLENBQUMsb0JBQW9CLFVBQVUsZUFBZSxFQUFFLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQy9FLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLElBQUksRUFBRSxFQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLFFBQVEsRUFBQyxFQUFDLENBQUMsQ0FBQztnQkFDaEYsT0FBTzthQUNSO1lBRUQsSUFBSSxtQkFBbUIsSUFBSSxJQUFJLEVBQUU7Z0JBQy9CLE1BQU0sU0FBUyxHQUFHLGtCQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNqQyxNQUFNLFdBQVcsR0FBRyxJQUFBLG1DQUEyQixFQUFDLFFBQVEsRUFBRSxTQUFTLEVBQ2pFLEVBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQVcsRUFBRSxFQUFFLENBQUMsRUFBQyxDQUFDLENBQUM7Z0JBQzFGLGlDQUFpQztnQkFDakMsa0RBQWtEO2dCQUNsRCxhQUFhO2dCQUNiLFFBQVE7Z0JBQ1QsVUFBVSxDQUFDLFdBQVcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUU7d0JBQy9CLFVBQVUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVc7cUJBQ3ZDLEVBQUUsR0FBRztpQkFDUCxDQUFDLENBQUM7Z0JBQ0gsTUFBTSxTQUFTLENBQUM7Z0JBQ2hCLEtBQUssa0JBQUUsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUN4QixjQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxhQUFhLENBQUMsRUFDM0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUMsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQ25ELE9BQU8sQ0FBQyxDQUFDO2dCQUVYLElBQUk7b0JBQ0YsTUFBTSxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLFdBQVcsRUFBRTt5QkFDakQsSUFBSSxDQUFDLGtCQUFFLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7eUJBQ2hDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDO3lCQUNyQixFQUFFLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7b0JBRXhCLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBQyxHQUFHLEVBQUUsSUFBSSxFQUFFOzRCQUN6QixVQUFVLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXO3lCQUN2QyxFQUFFLEdBQUc7cUJBQ1AsQ0FBQyxDQUFDO29CQUVILFlBQVksQ0FBQyxJQUFJLENBQUMsbUNBQW1DLE9BQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssZ0JBQWdCLENBQUUsQ0FBQyxDQUFDLENBQVcsR0FBRyxFQUN0SCxjQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztpQkFDN0M7Z0JBQUMsT0FBTyxDQUFDLEVBQUU7b0JBQ1YsWUFBWSxDQUFDLEtBQUssQ0FBQyw2QkFBNkI7d0JBQzlDLGNBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztpQkFDaEQ7Z0JBRUQsT0FBTzthQUNSO1lBQ0QsSUFBSSxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFO2dCQUMxQyxPQUFPLEdBQUcsU0FBUyxHQUFHLE9BQU8sQ0FBQzthQUMvQjtZQUVELE1BQU0sRUFBQyxRQUFRLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBQyxHQUFHLE1BQU0sbUJBQW1CLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQztZQUM5RixNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLGdCQUFnQixDQUFDLENBQUM7WUFDOUUsSUFBSSxlQUFlLElBQUksQ0FBQztnQkFDdEIsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxNQUFNLENBQUM7WUFFNUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxFQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFO29CQUNwQyxVQUFVLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXO2lCQUN6QyxFQUFFLENBQUMsQ0FBQztZQUVMLE1BQU0sa0JBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDckIsS0FBSyxrQkFBRSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQ3hCLGNBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLGFBQWEsQ0FBQyxFQUM3QixJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUMsVUFBVSxFQUFFLE9BQU8sRUFBQyxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsRUFDakQsT0FBTyxDQUFDLENBQUM7WUFDWCxNQUFNLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsV0FBVyxFQUFFO2lCQUNqRCxFQUFFLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQztpQkFDbEIsSUFBSSxDQUFDLGtCQUFFLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7aUJBQ2hDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQztZQUV4QixVQUFVLENBQUMsS0FBSyxDQUFDLEVBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUU7b0JBQzlCLFVBQVUsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVc7aUJBQ3pDLEVBQUUsQ0FBQyxDQUFDO1lBQ0wsWUFBWSxDQUFDLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxjQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3hHLENBQUM7UUFFRCxPQUFPLEVBQUUsQ0FBQyxLQUFLLENBQ2IsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQ25CLEVBQUUsQ0FBQyxRQUFRLENBQUUsQ0FBQyxFQUFDLE9BQU8sRUFBQyxFQUFFLEVBQUU7WUFDekIsTUFBTSxtQkFBbUIsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUk7WUFDNUMsdUdBQXVHO1lBQ3ZHLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEdBQUcsS0FBSyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQ3ZELEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQ1YsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUMsT0FBTyxFQUFFLEVBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUMsRUFBQyxFQUFFLEVBQUU7Z0JBQzFDLElBQUksR0FBRyxDQUFDLGFBQWEsRUFBRTtvQkFDckIsTUFBTSxJQUFJLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxDQUFDO2lCQUNsRDtnQkFDRCxLQUFLLE1BQU0sS0FBSyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUU7b0JBQ2hDLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2lCQUNuQztnQkFDRCxHQUFHLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUM7Z0JBQ2pDLE1BQU0sVUFBVSxHQUFHLElBQUksRUFBRSxDQUFDLE9BQU8sRUFBc0IsQ0FBQztnQkFDeEQsR0FBRyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFO29CQUNwQixVQUFVLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUM1QixDQUFDLENBQUM7cUJBQ0QsRUFBRSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUU7b0JBQ2hCLFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQzNCLENBQUMsQ0FBQztxQkFDRCxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO2dCQUUzQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUN0QixZQUFZLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFFbkQsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUNwQixFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxLQUFLLFFBQVEsSUFBSSxLQUFLLEtBQUssT0FBTyxDQUFDLEVBQzNELEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUU7b0JBQ2IsSUFBSSxLQUFLLEtBQUssT0FBTzt3QkFDbkIsWUFBWSxDQUFDLEtBQUssQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQzFDLHNCQUFzQixFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO2dCQUMvRSxDQUFDLENBQUMsRUFDRixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUNWLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO2dCQUNiLHNCQUFzQjtnQkFDdEIseUJBQXlCO2dCQUN2QiwyQkFBMkI7Z0JBQzNCLDBCQUEwQjtnQkFDeEIsd0JBQXdCO2dCQUN4QixhQUFhO2dCQUNmLFdBQVc7Z0JBQ1QsYUFBYTtnQkFDZixJQUFJO2dCQUNKLG1CQUFtQjtnQkFDckIsS0FBSztpQkFDTixDQUFDO1lBQ0osQ0FBQyxDQUFDLEVBQ0YsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsWUFBWSxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQ3BELENBQUM7WUFDRixNQUFNLElBQUksR0FBRyxlQUFlLENBQUMsUUFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDcEUsWUFBWSxDQUFDLElBQUksQ0FBQyxlQUFlLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBRWpELElBQUksU0FBNkMsQ0FBQztZQUVsRCxJQUFJLElBQUksSUFBSSxJQUFJLEVBQUU7Z0JBQ2hCLFNBQVMsR0FBRyxFQUFFLENBQUMsS0FBSyxDQUNsQixtQkFBbUIsRUFDbkIsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUU7b0JBQ1osVUFBVSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUNyQyxPQUFPLEVBQUUsQ0FBQyxLQUFLLENBQUM7Z0JBQ2xCLENBQUMsQ0FBQyxDQUNILENBQUM7YUFDSDtpQkFBTSxJQUFJLElBQUksS0FBSyxTQUFTLElBQUksSUFBSSxLQUFLLFlBQVksSUFBSSxJQUFJLEtBQUssUUFBUSxFQUFFO2dCQUMzRSxTQUFTLEdBQUcsbUJBQW1CLENBQUM7YUFDakM7aUJBQU07Z0JBQ0wsWUFBWSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUM3QyxNQUFNLFdBQVcsR0FBRyxlQUFlLENBQUMsUUFBUSxFQUFFLENBQUMsZ0JBQWdCLENBQUM7Z0JBQ2hFLElBQUksV0FBVyxJQUFJLElBQUksRUFBRTtvQkFDdkIsS0FBSyxNQUFNLEtBQUssSUFBSSxJQUFJLENBQUMsT0FBTyxFQUFFO3dCQUNoQyxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7cUJBQzNDO29CQUNELE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztvQkFDcEMsU0FBUyxHQUFHLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBTyxHQUFHLENBQUMsRUFBRTt3QkFDeEMsSUFBSSxDQUFDLElBQUksRUFBRTs2QkFDVixFQUFFLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxHQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQzs2QkFDL0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDckIsQ0FBQyxDQUFDLENBQUM7aUJBQ0o7cUJBQU07b0JBQ0wsU0FBUyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUN4RixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUNWLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUMsRUFBRSxFQUFFO3dCQUNqQyxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxnQkFBZ0IsQ0FBQyxDQUFDO3dCQUNuRixJQUFJLGVBQWUsSUFBSSxDQUFDOzRCQUN0QixJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxNQUFNLENBQUM7d0JBQ2pELEtBQUssTUFBTSxLQUFLLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRTs0QkFDaEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO3lCQUMzQzt3QkFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7d0JBQ3BDLE9BQU8sZ0JBQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUM3QixRQUFRLEVBQUUsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUN4QixDQUFDO29CQUNKLENBQUMsQ0FBQyxDQUNILENBQUM7aUJBQ0g7YUFDRjtZQUVELE9BQU8sRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUM5QixFQUFFLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxFQUN2QixFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFO2dCQUNYLE1BQU0sSUFBSSxHQUFHLGVBQWUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDcEUsWUFBWSxDQUFDLElBQUksQ0FBQyxHQUFHLGVBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLE9BQU8sSUFBSSxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLDRCQUE0QixlQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7Z0JBQzVKLE9BQU8sSUFBSSxDQUFDO1lBQ2QsQ0FBQyxDQUFDLEVBQ0YsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUNWLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxHQUFHLGVBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQyxFQUMxRSxFQUFFLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUNqQixFQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7Z0JBQ3BCLFlBQVksQ0FBQyxLQUFLLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQ3BELE9BQU8sRUFBRSxDQUFDLEtBQUssQ0FBQztZQUNsQixDQUFDLENBQUMsQ0FDSCxDQUFDO1FBQ0osQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUNOLEVBQ0QsT0FBTyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FDM0IsRUFBRSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsRUFBQyxPQUFPLEVBQUMsRUFBRSxFQUFFO1lBQzlCLElBQUk7Z0JBQ0YsTUFBTSxHQUFHLEdBQUcsY0FBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDeEUsTUFBTSxLQUFLLEdBQUcsY0FBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsYUFBYSxDQUFDLENBQUM7Z0JBQzVDLE1BQU0sS0FBSyxHQUFHLGNBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDO2dCQUNyQyxJQUFJLGtCQUFFLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFFO29CQUN4QixZQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ3ZDLE1BQU0sV0FBVyxHQUFHLGVBQWUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQztvQkFDaEUsSUFBSSxXQUFXLElBQUksSUFBSSxFQUFFO3dCQUN2QixNQUFNLFVBQVUsR0FBRyxNQUFNLGtCQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUM7d0JBQzlELE1BQU0sRUFBQyxVQUFVLEVBQUUsT0FBTyxFQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQWlFLENBQUM7d0JBRXJILFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUc7NEJBQ2xELElBQUksRUFBRTtnQ0FDSixVQUFVO2dDQUNWLE9BQU87Z0NBQ1AsSUFBSSxFQUFFLEdBQUcsRUFBRSxDQUFDLGtCQUFFLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDOzZCQUN2QyxFQUFDLENBQUMsQ0FBQzt3QkFDTixPQUFPO3FCQUNSO29CQUVELE1BQU0sVUFBVSxHQUFHLE1BQU0sa0JBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQztvQkFDOUQsTUFBTSxFQUFDLFVBQVUsRUFBRSxPQUFPLEVBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBaUUsQ0FBQztvQkFDckgsTUFBTSxFQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUMsR0FBRyxNQUFNLFdBQVcsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLGtCQUFFLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztvQkFDNUcsTUFBTSxlQUFlLEdBQUcsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxnQkFBZ0IsQ0FBQyxDQUFDO29CQUM5RSxJQUFJLGVBQWUsSUFBSSxDQUFDO3dCQUN0QixPQUFPLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLE1BQU0sQ0FBQztvQkFFNUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxFQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRzt3QkFDaEMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHO3dCQUNoQixJQUFJLEVBQUU7NEJBQ0osVUFBVTs0QkFDVixPQUFPOzRCQUNQLElBQUksRUFBRSxRQUFRO3lCQUNmLEVBQUMsQ0FBQyxDQUFDO2lCQUNQO3FCQUFNO29CQUNMLFlBQVksQ0FBQyxJQUFJLENBQUMsc0JBQXNCLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUN2RCxVQUFVLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2lCQUNwQzthQUNGO1lBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQ1gsWUFBWSxDQUFDLEtBQUssQ0FBQyw0QkFBNEIsR0FBRyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUNuRSxVQUFVLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNoQztRQUNILENBQUMsQ0FBQyxDQUNILEVBQ0QsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQ3pCLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFDLE9BQU8sRUFBQyxFQUFFLEVBQUU7WUFDeEIsTUFBTSxTQUFTLEdBQWtCLEVBQUUsQ0FBQztZQUNwQyxJQUFJLE9BQU8sQ0FBQyxNQUFNLEVBQUU7Z0JBQ2xCLFNBQVMsQ0FBQyxNQUFNLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztnQkFDbEMsU0FBUyxDQUFDLFVBQVUsR0FBRyxJQUFJLENBQUM7YUFDN0I7WUFDRCxPQUFPLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFO2dCQUNuQixlQUFlLENBQUMsUUFBUSxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsU0FBUyxDQUFDLENBQUM7Z0JBQzFFLE9BQU8sSUFBQSw0Q0FBb0IsRUFBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ25ELENBQUMsQ0FBQyxDQUFDLElBQUksQ0FDTCxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBQyxPQUFPLEVBQUUsQ0FBQyxRQUFRLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFDLEVBQUUsRUFBRTtnQkFDL0MsT0FBTyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUMxRSxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFrQyxDQUFDLENBQUM7WUFDekcsQ0FBQyxDQUFDLEVBQ0YsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtnQkFDbEIsWUFBWSxDQUFDLElBQUksQ0FBQyxVQUFVLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQ3JELE9BQU8sRUFBRSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQ3hCLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUM3QixDQUFDO1lBQ0osQ0FBQyxDQUFDLEVBQ0YsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FDWixDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQ0gsRUFDRCxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FDbEIsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTyxFQUFFLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLEVBQUMsRUFBRSxFQUFFO1lBQy9DLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFpQixDQUFDO1lBQ3RDLFlBQVksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLE1BQU0sQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQ2pFLENBQUMsQ0FBQyxDQUNILEVBQ0QsTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQ3BCLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFDLE9BQU8sRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFDLEVBQUUsRUFBRTtZQUMxQixZQUFZLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUN2QyxDQUFDLENBQUMsQ0FDSCxDQUNGLENBQUMsSUFBSTtRQUNKLGlFQUFpRTtRQUNqRSxFQUFFLENBQUMsY0FBYyxFQUFFLEVBQ25CLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDekIsWUFBWSxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNsRCxPQUFPLEdBQUcsQ0FBQztRQUNiLENBQUMsQ0FBQyxDQUNILENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILE9BQU8sZUFBZSxDQUFDO0FBQ3pCLENBQUM7QUE3WUQsb0RBNllDO0FBRUQsU0FBZ0IsUUFBUSxDQUFDLE1BQWMsRUFBRSxJQUFZO0lBQ25ELE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUMzQyxNQUFNLEdBQUcsR0FBRyxNQUFNLEdBQUcsR0FBRyxDQUFDLFFBQVEsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxnQkFBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUMzRixPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUFKRCw0QkFJQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgSW5jb21pbmdNZXNzYWdlLCBTZXJ2ZXJSZXNwb25zZSB9IGZyb20gJ2h0dHAnO1xuaW1wb3J0IHN0cmVhbSBmcm9tICdzdHJlYW0nO1xuaW1wb3J0IHVybCBmcm9tICd1cmwnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7UmVxdWVzdCwgUmVzcG9uc2UsIE5leHRGdW5jdGlvbn0gZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQge1NlcnZlck9wdGlvbnMsIGNyZWF0ZVByb3h5U2VydmVyfSBmcm9tICdodHRwLXByb3h5JztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgYXBpIGZyb20gJ19fcGxpbmsnO1xuaW1wb3J0IHtsb2c0RmlsZSwgY29uZmlnfSBmcm9tICdAd2ZoL3BsaW5rJztcbi8vIGltcG9ydCB7IGNyZWF0ZVByb3h5TWlkZGxld2FyZSBhcyBwcm94eX0gZnJvbSAnaHR0cC1wcm94eS1taWRkbGV3YXJlJztcbmltcG9ydCB7Y3JlYXRlU2xpY2UsIGNhc3RCeUFjdGlvblR5cGV9IGZyb20gJ0B3ZmgvcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlL2Rpc3QvdGlueS1yZWR1eC10b29sa2l0JztcbmltcG9ydCB7Y3JlYXRlUmVwbGF5UmVhZGFibGVGYWN0b3J5fSBmcm9tICcuLi91dGlscyc7XG5pbXBvcnQge2h0dHBQcm94eU9ic2VydmFibGUsIG9ic2VydmVQcm94eVJlc3BvbnNlfSBmcm9tICcuLi9odHRwLXByb3h5LW9ic2VydmFibGUnO1xuaW1wb3J0IHtQcm94eUNhY2hlU3RhdGUsIENhY2hlRGF0YX0gZnJvbSAnLi90eXBlcyc7XG5cblxuY29uc3QgaHR0cFByb3h5TG9nID0gbG9nNEZpbGUoX19maWxlbmFtZSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVQcm94eVdpdGhDYWNoZShwcm94eVBhdGg6IHN0cmluZywgc2VydmVyT3B0aW9uczogU2VydmVyT3B0aW9ucywgY2FjaGVSb290RGlyOiBzdHJpbmcsXG4gICAgICAgICAgICAgICAgIG9wdHM6IHttYW51YWw6IGJvb2xlYW47IG1lbUNhY2hlTGVuZ3RoPzogbnVtYmVyfSA9IHttYW51YWw6IGZhbHNlfSkge1xuICBjb25zdCBkZWZhdWx0UHJveHkgPSBjcmVhdGVQcm94eVNlcnZlcih7XG4gICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgIHdzOiBmYWxzZSxcbiAgICBzZWN1cmU6IGZhbHNlLFxuICAgIGNvb2tpZURvbWFpblJld3JpdGU6IHsgJyonOiAnJyB9LFxuICAgIGZvbGxvd1JlZGlyZWN0czogdHJ1ZSxcbiAgICBwcm94eVRpbWVvdXQ6IDIwMDAwLFxuICAgIHRpbWVvdXQ6IDEwMDAwLFxuICAgIC4uLnNlcnZlck9wdGlvbnNcbiAgfSk7XG4gIGNvbnN0IGluaXRpYWxTdGF0ZTogUHJveHlDYWNoZVN0YXRlID0ge1xuICAgIHByb3h5OiBkZWZhdWx0UHJveHksXG4gICAgY2FjaGVEaXI6IGNhY2hlUm9vdERpcixcbiAgICBjYWNoZUJ5VXJpOiBuZXcgTWFwKCksXG4gICAgbWVtQ2FjaGVMZW5ndGg6IG9wdHMubWVtQ2FjaGVMZW5ndGggPT0gbnVsbCA/IE51bWJlci5NQVhfVkFMVUUgOiBvcHRzLm1lbUNhY2hlTGVuZ3RoXG4gIH07XG5cbiAgY29uc3QgcHJveHkkID0gaHR0cFByb3h5T2JzZXJ2YWJsZShkZWZhdWx0UHJveHkpO1xuXG4gIGlmICghb3B0cy5tYW51YWwpIHtcbiAgICBhcGkuZXhwcmVzc0FwcFNldChhcHAgPT4ge1xuICAgICAgYXBwLnVzZShwcm94eVBhdGgsIChyZXEsIHJlcywgbmV4dCkgPT4ge1xuICAgICAgICBjb25zdCBrZXkgPSBrZXlPZlVyaShyZXEubWV0aG9kLCByZXEudXJsKTtcbiAgICAgICAgY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuaGl0Q2FjaGUoe2tleSwgcmVxLCByZXMsIG5leHR9KTtcbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG4gIGNvbnN0IGNhY2hlQ29udHJvbGxlciA9IGNyZWF0ZVNsaWNlKHtcbiAgICBpbml0aWFsU3RhdGUsXG4gICAgbmFtZTogYEhUVFAtcHJveHktY2FjaGUtJHtwcm94eVBhdGh9YCAsXG4gICAgZGVidWdBY3Rpb25Pbmx5OiBjb25maWcoKS5jbGlPcHRpb25zPy52ZXJib3NlLFxuICAgIHJlZHVjZXJzOiB7XG4gICAgICBjb25maWdUcmFuc2Zvcm1lcihzOiBQcm94eUNhY2hlU3RhdGUsIHBheWxvYWQ6IHtcbiAgICAgICAgcmVtb3RlPzogUHJveHlDYWNoZVN0YXRlWydyZXNwb25zZVRyYW5zZm9ybWVyJ107XG4gICAgICAgIGNhY2hlZD86IFByb3h5Q2FjaGVTdGF0ZVsnY2FjaGVUcmFuc2Zvcm1lciddO1xuICAgICAgfSkge1xuICAgICAgICBpZiAocGF5bG9hZC5yZW1vdGUpXG4gICAgICAgICAgcy5yZXNwb25zZVRyYW5zZm9ybWVyID0gcGF5bG9hZC5yZW1vdGU7XG4gICAgICAgIGlmIChwYXlsb2FkLmNhY2hlZClcbiAgICAgICAgICBzLmNhY2hlVHJhbnNmb3JtZXIgPSBwYXlsb2FkLmNhY2hlZDtcbiAgICAgIH0sXG4gICAgICBoaXRDYWNoZShzOiBQcm94eUNhY2hlU3RhdGUsIHBheWxvYWQ6IHtcbiAgICAgICAga2V5OiBzdHJpbmc7IHJlcTogUmVxdWVzdDsgcmVzOiBSZXNwb25zZTsgbmV4dDogTmV4dEZ1bmN0aW9uO1xuICAgICAgICAvKiogb3ZlcnJpZGUgcmVtb3RlIHRhcmdldCAqL1xuICAgICAgICB0YXJnZXQ/OiBzdHJpbmc7XG4gICAgICB9KSB7fSxcblxuICAgICAgX3JlcXVlc3RSZW1vdGVEb25lKHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDoge1xuICAgICAgICBrZXk6IHN0cmluZzsgcmVxSG9zdDogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgICAgICByZXM6IFNlcnZlclJlc3BvbnNlO1xuICAgICAgICBkYXRhOiB7aGVhZGVyczogQ2FjaGVEYXRhWydoZWFkZXJzJ107IHJlYWRhYmxlOiBJbmNvbWluZ01lc3NhZ2V9O1xuICAgICAgfSkge30sXG5cbiAgICAgIF9sb2FkRnJvbVN0b3JhZ2UoczogUHJveHlDYWNoZVN0YXRlLCBwYXlsb2FkOiB7a2V5OiBzdHJpbmc7IHJlcTogUmVxdWVzdDsgcmVzOiBSZXNwb25zZTtcbiAgICAgICAgICAgICAgICAgICAgICAgbmV4dDogTmV4dEZ1bmN0aW9uO1xuICAgICAgICB0YXJnZXQ/OiBzdHJpbmc7IH0pIHtcbiAgICAgICAgcy5jYWNoZUJ5VXJpLnNldChwYXlsb2FkLmtleSwgJ2xvYWRpbmcnKTtcbiAgICAgIH0sXG5cbiAgICAgIF9yZXF1ZXN0UmVtb3RlKHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDoge2tleTogc3RyaW5nOyByZXE6IFJlcXVlc3Q7IHJlczogUmVzcG9uc2U7IG5leHQ6IE5leHRGdW5jdGlvbjtcbiAgICAgICAgdGFyZ2V0Pzogc3RyaW5nOyB9KSB7XG4gICAgICAgIHMuY2FjaGVCeVVyaS5zZXQocGF5bG9hZC5rZXksICdyZXF1ZXN0aW5nJyk7XG4gICAgICB9LFxuICAgICAgX3NhdmluZ0ZpbGUoczogUHJveHlDYWNoZVN0YXRlLCBwYXlsb2FkOiB7XG4gICAgICAgIGtleTogc3RyaW5nO1xuICAgICAgICByZXM6IFNlcnZlclJlc3BvbnNlO1xuICAgICAgICBkYXRhOiBDYWNoZURhdGE7XG4gICAgICB9KSB7XG4gICAgICAgIHMuY2FjaGVCeVVyaS5zZXQocGF5bG9hZC5rZXksICdzYXZpbmcnKTtcbiAgICAgIH0sXG4gICAgICBfZG9uZShzOiBQcm94eUNhY2hlU3RhdGUsIHBheWxvYWQ6IHtcbiAgICAgICAga2V5OiBzdHJpbmc7XG4gICAgICAgIHJlczogU2VydmVyUmVzcG9uc2U7XG4gICAgICAgIGRhdGE6IENhY2hlRGF0YTtcbiAgICAgIH0pIHtcbiAgICAgICAgcy5jYWNoZUJ5VXJpLmRlbGV0ZShwYXlsb2FkLmtleSk7XG4gICAgICAgIC8vIGlmIChwYXlsb2FkLmRhdGEuc3RhdHVzQ29kZSAhPT0gMzA0KSB7XG4gICAgICAgIC8vICAgaWYgKHMuY2FjaGVCeVVyaS5zaXplID49IHMubWVtQ2FjaGVMZW5ndGgpIHtcbiAgICAgICAgLy8gICAgIC8vIFRPRE86IGltcHJvdmUgZm9yIExSVSBhbGdvcmlndGhtXG4gICAgICAgIC8vICAgICBzLmNhY2hlQnlVcmkuZGVsZXRlKHBheWxvYWQua2V5KTtcbiAgICAgICAgLy8gICAgIHJldHVybjtcbiAgICAgICAgLy8gICB9XG4gICAgICAgIC8vICAgcy5jYWNoZUJ5VXJpLnNldChwYXlsb2FkLmtleSwgcGF5bG9hZC5kYXRhKTtcbiAgICAgICAgLy8gfVxuICAgICAgfSxcbiAgICAgIF9jbGVhbihzOiBQcm94eUNhY2hlU3RhdGUsIGtleTogc3RyaW5nKSB7XG4gICAgICAgIHMuY2FjaGVCeVVyaS5kZWxldGUoa2V5KTtcbiAgICAgIH1cbiAgICB9XG4gIH0pO1xuXG4gIGNhY2hlQ29udHJvbGxlci5lcGljKGFjdGlvbiQgPT4ge1xuICAgIGNvbnN0IGFjdGlvbnMgPSBjYXN0QnlBY3Rpb25UeXBlKGNhY2hlQ29udHJvbGxlci5hY3Rpb25zLCBhY3Rpb24kKTtcbiAgICBjb25zdCBkaXNwYXRjaGVyID0gY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXI7XG5cbiAgICBhc3luYyBmdW5jdGlvbiByZXF1ZXN0aW5nUmVtb3RlKFxuICAgICAga2V5OiBzdHJpbmcsIHJlcUhvc3Q6IHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgICAgIHByb3h5UmVzOiBJbmNvbWluZ01lc3NhZ2UsXG4gICAgICByZXM6IFNlcnZlclJlc3BvbnNlLFxuICAgICAgaGVhZGVyczogW3N0cmluZywgc3RyaW5nIHwgc3RyaW5nW11dW10pIHtcblxuICAgICAgaHR0cFByb3h5TG9nLmRlYnVnKCdjYWNoZSBzaXplOicsIGNhY2hlQ29udHJvbGxlci5nZXRTdGF0ZSgpLmNhY2hlQnlVcmkuc2l6ZSk7XG4gICAgICBjb25zdCBkaXIgPSBQYXRoLmpvaW4oY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCkuY2FjaGVEaXIsIGtleSk7XG4gICAgICBjb25zdCBmaWxlID0gUGF0aC5qb2luKGRpciwgJ2JvZHknKTtcbiAgICAgIGNvbnN0IHN0YXR1c0NvZGUgPSBwcm94eVJlcy5zdGF0dXNDb2RlIHx8IDIwMDtcbiAgICAgIGNvbnN0IHtyZXNwb25zZVRyYW5zZm9ybWVyfSA9IGNhY2hlQ29udHJvbGxlci5nZXRTdGF0ZSgpO1xuICAgICAgaWYgKHN0YXR1c0NvZGUgPT09IDMwNCkge1xuICAgICAgICBkaXNwYXRjaGVyLl9kb25lKHtrZXksIHJlcywgZGF0YToge1xuICAgICAgICAgICAgc3RhdHVzQ29kZSwgaGVhZGVycywgYm9keTogY3JlYXRlUmVwbGF5UmVhZGFibGVGYWN0b3J5KHByb3h5UmVzKVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGh0dHBQcm94eUxvZy53YXJuKCdWZXJzaW9uIGluZm8gaXMgbm90IHJlY29yZGVkLCBkdWUgdG8gcmVzcG9uc2UgMzA0IGZyb20nLCByZXMucmVxLnVybCwgJyxcXG4geW91IGNhbiByZW1vdmUgZXhpc3RpbmcgbnBtL2NhY2hlIGNhY2hlIHRvIGF2b2lkIDMwNCcpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoc3RhdHVzQ29kZSAhPT0gMjAwKSB7XG4gICAgICAgIGh0dHBQcm94eUxvZy5lcnJvcihgUmVzcG9uc2UgY29kZSBpcyAke3N0YXR1c0NvZGV9IGZvciByZXF1ZXN0OmAsIHJlcy5yZXEudXJsKTtcbiAgICAgICAgZGlzcGF0Y2hlci5fZG9uZSh7a2V5LCByZXMsIGRhdGE6IHtzdGF0dXNDb2RlLCBoZWFkZXJzLCBib2R5OiAoKSA9PiBwcm94eVJlc319KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICBpZiAocmVzcG9uc2VUcmFuc2Zvcm1lciA9PSBudWxsKSB7XG4gICAgICAgIGNvbnN0IGRvbmVNa2RpciA9IGZzLm1rZGlycChkaXIpO1xuICAgICAgICBjb25zdCByZWFkYWJsZUZhYyA9IGNyZWF0ZVJlcGxheVJlYWRhYmxlRmFjdG9yeShwcm94eVJlcywgdW5kZWZpbmVkLFxuICAgICAgICAgIHtkZWJ1Z0luZm86IGtleSwgZXhwZWN0TGVuOiBwYXJzZUludChwcm94eVJlcy5oZWFkZXJzWydjb250ZW50LWxlbmd0aCddIGFzIHN0cmluZywgMTApfSk7XG4gICAgICAgICAvLyBkaXNwYXRjaGVyLl9kb25lKHtrZXksIGRhdGE6IHtcbiAgICAgICAgIC8vICAgICAgIHN0YXR1c0NvZGUsIGhlYWRlcnMsIGJvZHk6ICgpID0+IHByb3h5UmVzXG4gICAgICAgICAvLyAgICAgfSwgcmVzXG4gICAgICAgICAvLyAgIH0pO1xuICAgICAgICBkaXNwYXRjaGVyLl9zYXZpbmdGaWxlKHtrZXksIGRhdGE6IHtcbiAgICAgICAgICAgIHN0YXR1c0NvZGUsIGhlYWRlcnMsIGJvZHk6IHJlYWRhYmxlRmFjXG4gICAgICAgICAgfSwgcmVzXG4gICAgICAgIH0pO1xuICAgICAgICBhd2FpdCBkb25lTWtkaXI7XG4gICAgICAgIHZvaWQgZnMucHJvbWlzZXMud3JpdGVGaWxlKFxuICAgICAgICAgIFBhdGguam9pbihkaXIsICdoZWFkZXIuanNvbicpLFxuICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkoe3N0YXR1c0NvZGUsIGhlYWRlcnN9LCBudWxsLCAnICAnKSxcbiAgICAgICAgICAndXRmLTgnKTtcblxuICAgICAgICB0cnkge1xuICAgICAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHJlYWRhYmxlRmFjKClcbiAgICAgICAgICAgIC5waXBlKGZzLmNyZWF0ZVdyaXRlU3RyZWFtKGZpbGUpKVxuICAgICAgICAgICAgLm9uKCdmaW5pc2gnLCByZXNvbHZlKVxuICAgICAgICAgICAgLm9uKCdlcnJvcicsIHJlamVjdCkpO1xuXG4gICAgICAgICAgZGlzcGF0Y2hlci5fZG9uZSh7a2V5LCBkYXRhOiB7XG4gICAgICAgICAgICAgIHN0YXR1c0NvZGUsIGhlYWRlcnMsIGJvZHk6IHJlYWRhYmxlRmFjXG4gICAgICAgICAgICB9LCByZXNcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIGh0dHBQcm94eUxvZy5pbmZvKGByZXNwb25zZSBpcyB3cml0dGVuIHRvIChsZW5ndGg6ICR7aGVhZGVycy5maW5kKGl0ZW0gPT4gaXRlbVswXSA9PT0gJ2NvbnRlbnQtbGVuZ3RoJykhWzFdIGFzIHN0cmluZ30pYCxcbiAgICAgICAgICAgIFBhdGgucG9zaXgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgZmlsZSkpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgaHR0cFByb3h5TG9nLmVycm9yKCdGYWlsZWQgdG8gd3JpdGUgY2FjaGUgZmlsZSAnICtcbiAgICAgICAgICAgIFBhdGgucG9zaXgucmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgZmlsZSksIGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKHJlcUhvc3QgJiYgIXJlcUhvc3Quc3RhcnRzV2l0aCgnaHR0cCcpKSB7XG4gICAgICAgIHJlcUhvc3QgPSAnaHR0cDovLycgKyByZXFIb3N0O1xuICAgICAgfVxuXG4gICAgICBjb25zdCB7cmVhZGFibGU6IHRyYW5zZm9ybWVkLCBsZW5ndGh9ID0gYXdhaXQgcmVzcG9uc2VUcmFuc2Zvcm1lcihoZWFkZXJzLCByZXFIb3N0LCBwcm94eVJlcyk7XG4gICAgICBjb25zdCBsZW5ndGhIZWFkZXJJZHggPSBoZWFkZXJzLmZpbmRJbmRleChyb3cgPT4gcm93WzBdID09PSAnY29udGVudC1sZW5ndGgnKTtcbiAgICAgIGlmIChsZW5ndGhIZWFkZXJJZHggPj0gMClcbiAgICAgICAgaGVhZGVyc1tsZW5ndGhIZWFkZXJJZHhdWzFdID0gJycgKyBsZW5ndGg7XG5cbiAgICAgIGRpc3BhdGNoZXIuX3NhdmluZ0ZpbGUoe2tleSwgcmVzLCBkYXRhOiB7XG4gICAgICAgICAgc3RhdHVzQ29kZSwgaGVhZGVycywgYm9keTogdHJhbnNmb3JtZWRcbiAgICAgIH0gfSk7XG5cbiAgICAgIGF3YWl0IGZzLm1rZGlycChkaXIpO1xuICAgICAgdm9pZCBmcy5wcm9taXNlcy53cml0ZUZpbGUoXG4gICAgICAgIFBhdGguam9pbihkaXIsICdoZWFkZXIuanNvbicpLFxuICAgICAgICBKU09OLnN0cmluZ2lmeSh7c3RhdHVzQ29kZSwgaGVhZGVyc30sIG51bGwsICcgICcpLFxuICAgICAgICAndXRmLTgnKTtcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHRyYW5zZm9ybWVkKClcbiAgICAgICAgLm9uKCdlbmQnLCByZXNvbHZlKVxuICAgICAgICAucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbShmaWxlKSlcbiAgICAgICAgLm9uKCdlcnJvcicsIHJlamVjdCkpO1xuXG4gICAgICBkaXNwYXRjaGVyLl9kb25lKHtrZXksIHJlcywgZGF0YToge1xuICAgICAgICAgIHN0YXR1c0NvZGUsIGhlYWRlcnMsIGJvZHk6IHRyYW5zZm9ybWVkXG4gICAgICB9IH0pO1xuICAgICAgaHR0cFByb3h5TG9nLmluZm8oJ3dyaXRlIHJlc3BvbnNlIHRvIGZpbGUnLCBQYXRoLnBvc2l4LnJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGZpbGUpLCAnc2l6ZScsIGxlbmd0aCk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJ4Lm1lcmdlKFxuICAgICAgYWN0aW9ucy5oaXRDYWNoZS5waXBlKFxuICAgICAgICBvcC5tZXJnZU1hcCggKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICAgIGNvbnN0IHdhaXRDYWNoZUFuZFNlbmRSZXMgPSBhY3Rpb25zLl9kb25lLnBpcGUoXG4gICAgICAgICAgICAvLyBJbiBjYXNlIGl0IGlzIG9mIHJlZGlyZWN0ZWQgcmVxdWVzdCwgSFBNIGhhcyBkb25lIHBpcGluZyByZXNwb25zZSAoaWdub3JlZCBcIm1hbnVhbCByZXBvbnNlXCIgc2V0dGluZylcbiAgICAgICAgICAgIG9wLmZpbHRlcihhY3Rpb24gPT4gYWN0aW9uLnBheWxvYWQua2V5ID09PSBwYXlsb2FkLmtleSksXG4gICAgICAgICAgICBvcC50YWtlKDEpLFxuICAgICAgICAgICAgb3AubWVyZ2VNYXAoKHtwYXlsb2FkOiB7a2V5LCByZXMsIGRhdGF9fSkgPT4ge1xuICAgICAgICAgICAgICBpZiAocmVzLndyaXRhYmxlRW5kZWQpIHtcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1Jlc3BvbnNlIGlzIGVuZGVkIGVhcmx5LCB3aHk/Jyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgZm9yIChjb25zdCBlbnRyeSBvZiBkYXRhLmhlYWRlcnMpIHtcbiAgICAgICAgICAgICAgICByZXMuc2V0SGVhZGVyKGVudHJ5WzBdLCBlbnRyeVsxXSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSBkYXRhLnN0YXR1c0NvZGU7XG4gICAgICAgICAgICAgIGNvbnN0IHBpcGVFdmVudCQgPSBuZXcgcnguU3ViamVjdDwnZmluaXNoJyB8ICdjbG9zZSc+KCk7XG4gICAgICAgICAgICAgIHJlcy5vbignZmluaXNoJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHBpcGVFdmVudCQubmV4dCgnZmluaXNoJyk7XG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgIC5vbignY2xvc2UnLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgcGlwZUV2ZW50JC5uZXh0KCdjbG9zZScpO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAub24oJ2Vycm9yJywgZXJyID0+IHBpcGVFdmVudCQuZXJyb3IoZXJyKSk7XG5cbiAgICAgICAgICAgICAgZGF0YS5ib2R5KCkucGlwZShyZXMpO1xuICAgICAgICAgICAgICBodHRwUHJveHlMb2cuaW5mbygncGlwZSByZXNwb25zZSBvZicsIHBheWxvYWQua2V5KTtcblxuICAgICAgICAgICAgICByZXR1cm4gcGlwZUV2ZW50JC5waXBlKFxuICAgICAgICAgICAgICAgIG9wLmZpbHRlcihldmVudCA9PiBldmVudCA9PT0gJ2ZpbmlzaCcgfHwgZXZlbnQgPT09ICdjbG9zZScpLFxuICAgICAgICAgICAgICAgIG9wLnRhcChldmVudCA9PiB7XG4gICAgICAgICAgICAgICAgICBpZiAoZXZlbnQgPT09ICdjbG9zZScpXG4gICAgICAgICAgICAgICAgICAgIGh0dHBQcm94eUxvZy5lcnJvcignUmVzcG9uc2UgY29ubmVjdGlvbiBpcyBjbG9zZWQgZWFybHknLCBrZXksXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAnZXhwZWN0IGNvbnRlbnQtbGVudGgnLCBkYXRhLmhlYWRlcnNbJ2NvbnRlbnQtbGVuZ3RoJ10pO1xuICAgICAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgICAgIG9wLnRha2UoMSksXG4gICAgICAgICAgICAgICAgb3AubWFwVG8oa2V5KVxuICAgICAgICAgICAgICAgIC8vIG9wLnRpbWVvdXQoMTIwMDAwKSxcbiAgICAgICAgICAgICAgICAvLyBvcC5jYXRjaEVycm9yKGVyciA9PiB7XG4gICAgICAgICAgICAgICAgICAvLyBodHRwUHJveHlMb2cuZXJyb3IoZXJyKTtcbiAgICAgICAgICAgICAgICAgIC8vIGlmICghcmVzLmhlYWRlcnNTZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xuICAgICAgICAgICAgICAgICAgICAvLyByZXMuZW5kKCk7XG4gICAgICAgICAgICAgICAgICAvLyB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAvLyByZXMuZW5kKCk7XG4gICAgICAgICAgICAgICAgICAvLyB9XG4gICAgICAgICAgICAgICAgICAvLyByZXR1cm4gcnguRU1QVFk7XG4gICAgICAgICAgICAgICAgLy8gfSlcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgb3AudGFwKGtleSA9PiBodHRwUHJveHlMb2cuaW5mbyhgcmVwbGllZDogJHtrZXl9YCkpXG4gICAgICAgICAgKTtcbiAgICAgICAgICBjb25zdCBpdGVtID0gY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCkuY2FjaGVCeVVyaS5nZXQocGF5bG9hZC5rZXkpO1xuICAgICAgICAgIGh0dHBQcm94eUxvZy5pbmZvKCdoaXRDYWNoZSBmb3IgJyArIHBheWxvYWQua2V5KTtcblxuICAgICAgICAgIGxldCBmaW5pc2hlZCQ6IHJ4Lk9ic2VydmFibGU8dW5rbm93bj4gfCB1bmRlZmluZWQ7XG5cbiAgICAgICAgICBpZiAoaXRlbSA9PSBudWxsKSB7XG4gICAgICAgICAgICBmaW5pc2hlZCQgPSByeC5tZXJnZShcbiAgICAgICAgICAgICAgd2FpdENhY2hlQW5kU2VuZFJlcyxcbiAgICAgICAgICAgICAgcnguZGVmZXIoKCkgPT4ge1xuICAgICAgICAgICAgICAgIGRpc3BhdGNoZXIuX2xvYWRGcm9tU3RvcmFnZShwYXlsb2FkKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcnguRU1QVFk7XG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbSA9PT0gJ2xvYWRpbmcnIHx8IGl0ZW0gPT09ICdyZXF1ZXN0aW5nJyB8fCBpdGVtID09PSAnc2F2aW5nJykge1xuICAgICAgICAgICAgZmluaXNoZWQkID0gd2FpdENhY2hlQW5kU2VuZFJlcztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaHR0cFByb3h5TG9nLmluZm8oJ2hpdCBjYWNoZWQnLCBwYXlsb2FkLmtleSk7XG4gICAgICAgICAgICBjb25zdCB0cmFuc2Zvcm1lciA9IGNhY2hlQ29udHJvbGxlci5nZXRTdGF0ZSgpLmNhY2hlVHJhbnNmb3JtZXI7XG4gICAgICAgICAgICBpZiAodHJhbnNmb3JtZXIgPT0gbnVsbCkge1xuICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGl0ZW0uaGVhZGVycykge1xuICAgICAgICAgICAgICAgIHBheWxvYWQucmVzLnNldEhlYWRlcihlbnRyeVswXSwgZW50cnlbMV0pO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHBheWxvYWQucmVzLnN0YXR1cyhpdGVtLnN0YXR1c0NvZGUpO1xuICAgICAgICAgICAgICBmaW5pc2hlZCQgPSBuZXcgcnguT2JzZXJ2YWJsZTx2b2lkPihzdWIgPT4ge1xuICAgICAgICAgICAgICAgIGl0ZW0uYm9keSgpXG4gICAgICAgICAgICAgICAgLm9uKCdlbmQnLCAoKSA9PiB7c3ViLm5leHQoKTsgc3ViLmNvbXBsZXRlKCk7IH0pXG4gICAgICAgICAgICAgICAgLnBpcGUocGF5bG9hZC5yZXMpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGZpbmlzaGVkJCA9IHJ4LmZyb20odHJhbnNmb3JtZXIoaXRlbS5oZWFkZXJzLCBwYXlsb2FkLnJlcS5oZWFkZXJzLmhvc3QsIGl0ZW0uYm9keSgpKSkucGlwZShcbiAgICAgICAgICAgICAgICBvcC50YWtlKDEpLFxuICAgICAgICAgICAgICAgIG9wLm1lcmdlTWFwKCh7cmVhZGFibGUsIGxlbmd0aH0pID0+IHtcbiAgICAgICAgICAgICAgICAgIGNvbnN0IGxlbmd0aEhlYWRlcklkeCA9IGl0ZW0uaGVhZGVycy5maW5kSW5kZXgocm93ID0+IHJvd1swXSA9PT0gJ2NvbnRlbnQtbGVuZ3RoJyk7XG4gICAgICAgICAgICAgICAgICBpZiAobGVuZ3RoSGVhZGVySWR4ID49IDApXG4gICAgICAgICAgICAgICAgICAgIGl0ZW0uaGVhZGVyc1tsZW5ndGhIZWFkZXJJZHhdWzFdID0gJycgKyBsZW5ndGg7XG4gICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGl0ZW0uaGVhZGVycykge1xuICAgICAgICAgICAgICAgICAgICBwYXlsb2FkLnJlcy5zZXRIZWFkZXIoZW50cnlbMF0sIGVudHJ5WzFdKTtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIHBheWxvYWQucmVzLnN0YXR1cyhpdGVtLnN0YXR1c0NvZGUpO1xuICAgICAgICAgICAgICAgICAgcmV0dXJuIHN0cmVhbS5wcm9taXNlcy5waXBlbGluZShcbiAgICAgICAgICAgICAgICAgICAgcmVhZGFibGUoKSwgcGF5bG9hZC5yZXNcbiAgICAgICAgICAgICAgICAgICk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG5cbiAgICAgICAgICByZXR1cm4gcngudGltZXIoNTAwMCwgNTAwMCkucGlwZShcbiAgICAgICAgICAgIG9wLnRha2VVbnRpbChmaW5pc2hlZCQpLFxuICAgICAgICAgICAgb3AubWFwKGlkeCA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBjYWNoZUNvbnRyb2xsZXIuZ2V0U3RhdGUoKS5jYWNoZUJ5VXJpLmdldChwYXlsb2FkLmtleSk7XG4gICAgICAgICAgICAgIGh0dHBQcm94eUxvZy5pbmZvKGAke2NoYWxrLmJsdWUocGF5bG9hZC5rZXkpfSBbJHt0eXBlb2YgaXRlbSA9PT0gJ3N0cmluZycgPyBpdGVtIDogJ2NhY2hlZCd9XSBoYXMgYmVlbiBwcm9jZXNzZWQgZm9yICR7Y2hhbGsueWVsbG93KChpZHggKyAxKSAqIDUgKyAncycpfWApO1xuICAgICAgICAgICAgICByZXR1cm4gaXRlbTtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgb3AuY291bnQoKSxcbiAgICAgICAgICAgIG9wLnRhcCgoKSA9PiBodHRwUHJveHlMb2cuaW5mbyhgJHtjaGFsay5ncmVlbihwYXlsb2FkLmtleSl9IGlzIGZpbmlzaGVkYCkpLFxuICAgICAgICAgICAgb3AudGltZW91dCg2MDAwMCksXG4gICAgICAgICAgICBvcC5jYXRjaEVycm9yKChlcnIpID0+IHtcbiAgICAgICAgICAgICAgaHR0cFByb3h5TG9nLmVycm9yKCdGYWlsZWQgdG8gd3JpdGUgcmVzcG9uc2UnLCBlcnIpO1xuICAgICAgICAgICAgICByZXR1cm4gcnguRU1QVFk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICk7XG4gICAgICAgIH0sIDUpXG4gICAgICApLFxuICAgICAgYWN0aW9ucy5fbG9hZEZyb21TdG9yYWdlLnBpcGUoXG4gICAgICAgIG9wLm1lcmdlTWFwKGFzeW5jICh7cGF5bG9hZH0pID0+IHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgZGlyID0gUGF0aC5qb2luKGNhY2hlQ29udHJvbGxlci5nZXRTdGF0ZSgpLmNhY2hlRGlyLCBwYXlsb2FkLmtleSk7XG4gICAgICAgICAgICBjb25zdCBoRmlsZSA9IFBhdGguam9pbihkaXIsICdoZWFkZXIuanNvbicpO1xuICAgICAgICAgICAgY29uc3QgYkZpbGUgPSBQYXRoLmpvaW4oZGlyLCAnYm9keScpO1xuICAgICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoaEZpbGUpKSB7XG4gICAgICAgICAgICAgIGh0dHBQcm94eUxvZy5pbmZvKCdsb2FkJywgcGF5bG9hZC5rZXkpO1xuICAgICAgICAgICAgICBjb25zdCB0cmFuc2Zvcm1lciA9IGNhY2hlQ29udHJvbGxlci5nZXRTdGF0ZSgpLmNhY2hlVHJhbnNmb3JtZXI7XG4gICAgICAgICAgICAgIGlmICh0cmFuc2Zvcm1lciA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyc1N0ciA9IGF3YWl0IGZzLnByb21pc2VzLnJlYWRGaWxlKGhGaWxlLCAndXRmLTgnKTtcbiAgICAgICAgICAgICAgICBjb25zdCB7c3RhdHVzQ29kZSwgaGVhZGVyc30gPSBKU09OLnBhcnNlKGhlYWRlcnNTdHIpIGFzIHtzdGF0dXNDb2RlOiBudW1iZXI7IGhlYWRlcnM6IFtzdHJpbmcsIHN0cmluZyB8IHN0cmluZ1tdXVtdfTtcblxuICAgICAgICAgICAgICAgIGRpc3BhdGNoZXIuX2RvbmUoe2tleTogcGF5bG9hZC5rZXksIHJlczogcGF5bG9hZC5yZXMsXG4gICAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICAgIHN0YXR1c0NvZGUsXG4gICAgICAgICAgICAgICAgICAgIGhlYWRlcnMsXG4gICAgICAgICAgICAgICAgICAgIGJvZHk6ICgpID0+IGZzLmNyZWF0ZVJlYWRTdHJlYW0oYkZpbGUpXG4gICAgICAgICAgICAgICAgICB9fSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgY29uc3QgaGVhZGVyc1N0ciA9IGF3YWl0IGZzLnByb21pc2VzLnJlYWRGaWxlKGhGaWxlLCAndXRmLTgnKTtcbiAgICAgICAgICAgICAgY29uc3Qge3N0YXR1c0NvZGUsIGhlYWRlcnN9ID0gSlNPTi5wYXJzZShoZWFkZXJzU3RyKSBhcyB7c3RhdHVzQ29kZTogbnVtYmVyOyBoZWFkZXJzOiBbc3RyaW5nLCBzdHJpbmcgfCBzdHJpbmdbXV1bXX07XG4gICAgICAgICAgICAgIGNvbnN0IHtyZWFkYWJsZSwgbGVuZ3RofSA9IGF3YWl0IHRyYW5zZm9ybWVyKGhlYWRlcnMsIHBheWxvYWQucmVxLmhlYWRlcnMuaG9zdCwgZnMuY3JlYXRlUmVhZFN0cmVhbShiRmlsZSkpO1xuICAgICAgICAgICAgICBjb25zdCBsZW5ndGhIZWFkZXJJZHggPSBoZWFkZXJzLmZpbmRJbmRleChyb3cgPT4gcm93WzBdID09PSAnY29udGVudC1sZW5ndGgnKTtcbiAgICAgICAgICAgICAgaWYgKGxlbmd0aEhlYWRlcklkeCA+PSAwKVxuICAgICAgICAgICAgICAgIGhlYWRlcnNbbGVuZ3RoSGVhZGVySWR4XVsxXSA9ICcnICsgbGVuZ3RoO1xuXG4gICAgICAgICAgICAgIGRpc3BhdGNoZXIuX2RvbmUoe2tleTogcGF5bG9hZC5rZXksXG4gICAgICAgICAgICAgICAgcmVzOiBwYXlsb2FkLnJlcyxcbiAgICAgICAgICAgICAgICBkYXRhOiB7XG4gICAgICAgICAgICAgICAgICBzdGF0dXNDb2RlLFxuICAgICAgICAgICAgICAgICAgaGVhZGVycyxcbiAgICAgICAgICAgICAgICAgIGJvZHk6IHJlYWRhYmxlXG4gICAgICAgICAgICAgICAgfX0pO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgaHR0cFByb3h5TG9nLmluZm8oJ05vIGV4aXN0aW5nIGZpbGUgZm9yJywgcGF5bG9hZC5rZXkpO1xuICAgICAgICAgICAgICBkaXNwYXRjaGVyLl9yZXF1ZXN0UmVtb3RlKHBheWxvYWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICAgICAgICBodHRwUHJveHlMb2cuZXJyb3IoJ0ZhaWxlZCB0byBzYXZlIGNhY2hlIGZvcjogJyArIHBheWxvYWQua2V5LCBleCk7XG4gICAgICAgICAgICBkaXNwYXRjaGVyLl9jbGVhbihwYXlsb2FkLmtleSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgKSxcbiAgICAgIGFjdGlvbnMuX3JlcXVlc3RSZW1vdGUucGlwZShcbiAgICAgICAgb3AubWVyZ2VNYXAoKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICAgIGNvbnN0IHByb3h5T3B0czogU2VydmVyT3B0aW9ucyA9IHt9O1xuICAgICAgICAgIGlmIChwYXlsb2FkLnRhcmdldCkge1xuICAgICAgICAgICAgcHJveHlPcHRzLnRhcmdldCA9IHBheWxvYWQudGFyZ2V0O1xuICAgICAgICAgICAgcHJveHlPcHRzLmlnbm9yZVBhdGggPSB0cnVlO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gcnguZGVmZXIoKCkgPT4ge1xuICAgICAgICAgICAgY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCkucHJveHkud2ViKHBheWxvYWQucmVxLCBwYXlsb2FkLnJlcywgcHJveHlPcHRzKTtcbiAgICAgICAgICAgIHJldHVybiBvYnNlcnZlUHJveHlSZXNwb25zZShwcm94eSQsIHBheWxvYWQucmVzKTtcbiAgICAgICAgICB9KS5waXBlKFxuICAgICAgICAgICAgb3AubWVyZ2VNYXAoKHtwYXlsb2FkOiBbcHJveHlSZXMsIF9yZXEsIHJlc119KSA9PiB7XG4gICAgICAgICAgICAgIHJldHVybiByZXF1ZXN0aW5nUmVtb3RlKHBheWxvYWQua2V5LCBwYXlsb2FkLnJlcS5oZWFkZXJzLmhvc3QsIHByb3h5UmVzLCByZXMsXG4gICAgICAgICAgICAgICAgT2JqZWN0LmVudHJpZXMocHJveHlSZXMuaGVhZGVycykuZmlsdGVyKGVudHJ5ID0+IGVudHJ5WzFdICE9IG51bGwpIGFzIFtzdHJpbmcsIHN0cmluZyB8IHN0cmluZ1tdXVtdKTtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgb3AuY2F0Y2hFcnJvcihlcnIgPT4ge1xuICAgICAgICAgICAgICBodHRwUHJveHlMb2cud2FybihgUmV0cnkgXCIke3BheWxvYWQucmVxLnVybH1cImAsIGVycik7XG4gICAgICAgICAgICAgIHJldHVybiByeC50aW1lcigxMDAwKS5waXBlKFxuICAgICAgICAgICAgICAgIG9wLm1hcFRvKHJ4LnRocm93RXJyb3IoZXJyKSlcbiAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIH0pLFxuICAgICAgICAgICAgb3AucmV0cnkoMylcbiAgICAgICAgICApO1xuICAgICAgICB9KVxuICAgICAgKSxcbiAgICAgIHByb3h5JC5wcm94eVJlcS5waXBlKFxuICAgICAgICBvcC50YXAoKHtwYXlsb2FkOiBbcHJveHlSZXEsIHJlcSwgcmVzLCBvcHRzXX0pID0+IHtcbiAgICAgICAgICBjb25zdCB0YXJnZXQgPSBvcHRzLnRhcmdldCBhcyB1cmwuVXJsO1xuICAgICAgICAgIGh0dHBQcm94eUxvZy5pbmZvKCdSZXF1ZXN0JywgdGFyZ2V0Lmhvc3RuYW1lLCB0YXJnZXQucGF0aG5hbWUpO1xuICAgICAgICB9KVxuICAgICAgKSxcbiAgICAgIHByb3h5JC5lY29ubnJlc2V0LnBpcGUoXG4gICAgICAgIG9wLnRhcCgoe3BheWxvYWQ6IFtlcnJdfSkgPT4ge1xuICAgICAgICAgIGh0dHBQcm94eUxvZy5pbmZvKCdlY29ubnJlc2V0JywgZXJyKTtcbiAgICAgICAgfSlcbiAgICAgIClcbiAgICApLnBpcGUoXG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hcmd1bWVudFxuICAgICAgb3AuaWdub3JlRWxlbWVudHMoKSxcbiAgICAgIG9wLmNhdGNoRXJyb3IoKGVyciwgc3JjKSA9PiB7XG4gICAgICAgIGh0dHBQcm94eUxvZy5lcnJvcignSFRUUCBwcm94eSBjYWNoZSBlcnJvcicsIGVycik7XG4gICAgICAgIHJldHVybiBzcmM7XG4gICAgICB9KVxuICAgICk7XG4gIH0pO1xuXG4gIHJldHVybiBjYWNoZUNvbnRyb2xsZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBrZXlPZlVyaShtZXRob2Q6IHN0cmluZywgcGF0aDogc3RyaW5nKSB7XG4gIGNvbnN0IHVybCA9IG5ldyBVUkwoJ2h0dHA6Ly9mLmNvbScgKyBwYXRoKTtcbiAgY29uc3Qga2V5ID0gbWV0aG9kICsgdXJsLnBhdGhuYW1lICsgKHVybC5zZWFyY2ggPyAnLycgKyBfLnRyaW1TdGFydCh1cmwuc2VhcmNoLCAnPycpIDogJycpO1xuICByZXR1cm4ga2V5O1xufVxuIl19