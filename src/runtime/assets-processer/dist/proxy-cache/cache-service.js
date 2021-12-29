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
                const readableFac = (0, utils_1.createReplayReadableFactory)(proxyRes);
                // cacheController.actionDispatcher._done({key, data: {
                //       statusCode, headers, body: readableFac
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
                if (res.writableEnded)
                    return rx.EMPTY;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FjaGUtc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImNhY2hlLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGdEQUF3QjtBQUV4QiwwREFBa0M7QUFDbEMsd0RBQTBCO0FBQzFCLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMsb0RBQXVCO0FBRXZCLHNEQUEwQjtBQUMxQixzQ0FBb0Q7QUFDcEQsaUVBQTZGO0FBQzdGLDhGQUFvRztBQUNwRyxvQ0FBMEU7QUFHMUUsbUJBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDckIsTUFBTSxZQUFZLEdBQUcsY0FBTSxDQUFDLFNBQVMsQ0FBQyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUMsUUFBUSxHQUFHLFlBQVksQ0FBQyxDQUFDO0FBRXBGLFNBQWdCLG9CQUFvQixDQUFDLFNBQWlCLEVBQUUsU0FBaUIsRUFBRSxZQUFvQixFQUM5RSxPQUFtRCxFQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUM7O0lBQ2pGLE1BQU0sWUFBWSxHQUFvQjtRQUNwQywyREFBMkQ7UUFDM0QsUUFBUSxFQUFFLFlBQVk7UUFDdEIsVUFBVSxFQUFFLElBQUksR0FBRyxFQUFFO1FBQ3JCLGNBQWMsRUFBRSxJQUFJLENBQUMsY0FBYyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGNBQWM7S0FDckYsQ0FBQztJQUVGLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFO1FBQ2hCLGlCQUFHLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ3RCLEdBQUcsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsRUFBRTtnQkFDcEMsTUFBTSxHQUFHLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxN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RyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLEdBQUcsRUFBRSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FDL0QsQ0FDRixDQUFDLENBQ0gsQ0FDRixDQUFDLElBQUksQ0FDSixFQUFFLENBQUMsY0FBYyxFQUFFLEVBQ25CLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDekIsWUFBWSxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNsRCxPQUFPLEdBQUcsQ0FBQztRQUNiLENBQUMsQ0FBQyxDQUNILENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUVILE9BQU8sZUFBZSxDQUFDO0FBQ3pCLENBQUM7QUE5V0Qsb0RBOFdDO0FBRUQsU0FBZ0IsUUFBUSxDQUFDLE1BQWMsRUFBRSxJQUFZO0lBQ25ELE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsQ0FBQztJQUMzQyxNQUFNLEdBQUcsR0FBRyxNQUFNLEdBQUcsR0FBRyxDQUFDLFFBQVEsR0FBRyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxnQkFBQyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUMzRixPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUM7QUFKRCw0QkFJQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgSW5jb21pbmdNZXNzYWdlLCBTZXJ2ZXJSZXNwb25zZSB9IGZyb20gJ2h0dHAnO1xuaW1wb3J0IGluc3BlY3RvciBmcm9tICdpbnNwZWN0b3InO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7UmVxdWVzdCwgUmVzcG9uc2UsIE5leHRGdW5jdGlvbn0gZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgYXBpIGZyb20gJ19fcGxpbmsnO1xuaW1wb3J0IHtsb2dnZXIsIGxvZzRGaWxlLCBjb25maWd9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IHsgY3JlYXRlUHJveHlNaWRkbGV3YXJlIGFzIHByb3h5LCBPcHRpb25zIGFzIEhwbU9wdGlvbnN9IGZyb20gJ2h0dHAtcHJveHktbWlkZGxld2FyZSc7XG5pbXBvcnQge2NyZWF0ZVNsaWNlLCBjYXN0QnlBY3Rpb25UeXBlfSBmcm9tICdAd2ZoL3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZS9kaXN0L3RpbnktcmVkdXgtdG9vbGtpdCc7XG5pbXBvcnQge2NyZWF0ZVJlcGxheVJlYWRhYmxlRmFjdG9yeSwgZGVmYXVsdFByb3h5T3B0aW9uc30gZnJvbSAnLi4vdXRpbHMnO1xuaW1wb3J0IHtQcm94eUNhY2hlU3RhdGUsIENhY2hlRGF0YX0gZnJvbSAnLi90eXBlcyc7XG5cbmluc3BlY3Rvci5vcGVuKDkyMjIpO1xuY29uc3QgaHR0cFByb3h5TG9nID0gbG9nZ2VyLmdldExvZ2dlcihsb2c0RmlsZShfX2ZpbGVuYW1lKS5jYXRlZ29yeSArICcjaHR0cFByb3h5Jyk7XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVQcm94eVdpdGhDYWNoZShwcm94eVBhdGg6IHN0cmluZywgdGFyZ2V0VXJsOiBzdHJpbmcsIGNhY2hlUm9vdERpcjogc3RyaW5nLFxuICAgICAgICAgICAgICAgICBvcHRzOiB7bWFudWFsOiBib29sZWFuOyBtZW1DYWNoZUxlbmd0aD86IG51bWJlcn0gPSB7bWFudWFsOiBmYWxzZX0pIHtcbiAgY29uc3QgaW5pdGlhbFN0YXRlOiBQcm94eUNhY2hlU3RhdGUgPSB7XG4gICAgLy8gcHJveHlPcHRpb25zOiBkZWZhdWx0UHJveHlPcHRpb25zKHByb3h5UGF0aCwgdGFyZ2V0VXJsKSxcbiAgICBjYWNoZURpcjogY2FjaGVSb290RGlyLFxuICAgIGNhY2hlQnlVcmk6IG5ldyBNYXAoKSxcbiAgICBtZW1DYWNoZUxlbmd0aDogb3B0cy5tZW1DYWNoZUxlbmd0aCA9PSBudWxsID8gTnVtYmVyLk1BWF9WQUxVRSA6IG9wdHMubWVtQ2FjaGVMZW5ndGhcbiAgfTtcblxuICBpZiAoIW9wdHMubWFudWFsKSB7XG4gICAgYXBpLmV4cHJlc3NBcHBTZXQoYXBwID0+IHtcbiAgICAgIGFwcC51c2UocHJveHlQYXRoLCAocmVxLCByZXMsIG5leHQpID0+IHtcbiAgICAgICAgY29uc3Qga2V5ID0ga2V5T2ZVcmkocmVxLm1ldGhvZCwgcmVxLnVybCk7XG4gICAgICAgIGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyLmhpdENhY2hlKHtrZXksIHJlcSwgcmVzLCBuZXh0fSk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuICBjb25zdCBjYWNoZUNvbnRyb2xsZXIgPSBjcmVhdGVTbGljZSh7XG4gICAgaW5pdGlhbFN0YXRlLFxuICAgIG5hbWU6IGBIVFRQLXByb3h5LWNhY2hlLSR7cHJveHlQYXRofWAgLFxuICAgIGRlYnVnQWN0aW9uT25seTogY29uZmlnKCkuY2xpT3B0aW9ucz8udmVyYm9zZSxcbiAgICByZWR1Y2Vyczoge1xuICAgICAgY29uZmlndXJlUHJveHkoczogUHJveHlDYWNoZVN0YXRlLCBwYXlsb2FkOiBIcG1PcHRpb25zKSB7XG4gICAgICB9LFxuICAgICAgY29uZmlnVHJhbnNmb3JtZXIoczogUHJveHlDYWNoZVN0YXRlLCBwYXlsb2FkOiB7XG4gICAgICAgIHJlbW90ZT86IFByb3h5Q2FjaGVTdGF0ZVsncmVzcG9uc2VUcmFuc2Zvcm1lciddO1xuICAgICAgICBjYWNoZWQ/OiBQcm94eUNhY2hlU3RhdGVbJ2NhY2hlVHJhbnNmb3JtZXInXTtcbiAgICAgIH0pIHtcbiAgICAgICAgaWYgKHBheWxvYWQucmVtb3RlKVxuICAgICAgICAgIHMucmVzcG9uc2VUcmFuc2Zvcm1lciA9IHBheWxvYWQucmVtb3RlO1xuICAgICAgICBpZiAocGF5bG9hZC5jYWNoZWQpXG4gICAgICAgICAgcy5jYWNoZVRyYW5zZm9ybWVyID0gcGF5bG9hZC5jYWNoZWQ7XG4gICAgICB9LFxuICAgICAgaGl0Q2FjaGUoczogUHJveHlDYWNoZVN0YXRlLCBwYXlsb2FkOiB7a2V5OiBzdHJpbmc7IHJlcTogUmVxdWVzdDsgcmVzOiBSZXNwb25zZTsgbmV4dDogTmV4dEZ1bmN0aW9ufSkge30sXG5cbiAgICAgIF9yZXF1ZXN0UmVtb3RlRG9uZShzOiBQcm94eUNhY2hlU3RhdGUsIHBheWxvYWQ6IHtcbiAgICAgICAga2V5OiBzdHJpbmc7IHJlcUhvc3Q6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICAgICAgcmVzOiBTZXJ2ZXJSZXNwb25zZTtcbiAgICAgICAgZGF0YToge2hlYWRlcnM6IENhY2hlRGF0YVsnaGVhZGVycyddOyByZWFkYWJsZTogSW5jb21pbmdNZXNzYWdlfTtcbiAgICAgIH0pIHt9LFxuXG4gICAgICBfbG9hZEZyb21TdG9yYWdlKHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDoge2tleTogc3RyaW5nOyByZXE6IFJlcXVlc3Q7IHJlczogUmVzcG9uc2U7IG5leHQ6IE5leHRGdW5jdGlvbn0pIHtcbiAgICAgICAgcy5jYWNoZUJ5VXJpLnNldChwYXlsb2FkLmtleSwgJ2xvYWRpbmcnKTtcbiAgICAgIH0sXG5cbiAgICAgIF9yZXF1ZXN0UmVtb3RlKHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDoge2tleTogc3RyaW5nOyByZXE6IFJlcXVlc3Q7IHJlczogUmVzcG9uc2U7IG5leHQ6IE5leHRGdW5jdGlvbn0pIHtcbiAgICAgICAgcy5jYWNoZUJ5VXJpLnNldChwYXlsb2FkLmtleSwgJ3JlcXVlc3RpbmcnKTtcbiAgICAgIH0sXG4gICAgICBfc2F2aW5nRmlsZShzOiBQcm94eUNhY2hlU3RhdGUsIHBheWxvYWQ6IHtcbiAgICAgICAga2V5OiBzdHJpbmc7XG4gICAgICAgIHJlczogU2VydmVyUmVzcG9uc2U7XG4gICAgICAgIGRhdGE6IENhY2hlRGF0YTtcbiAgICAgIH0pIHtcbiAgICAgICAgcy5jYWNoZUJ5VXJpLnNldChwYXlsb2FkLmtleSwgJ3NhdmluZycpO1xuICAgICAgfSxcbiAgICAgIF9kb25lKHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDoge1xuICAgICAgICBrZXk6IHN0cmluZztcbiAgICAgICAgcmVzOiBTZXJ2ZXJSZXNwb25zZTtcbiAgICAgICAgZGF0YTogQ2FjaGVEYXRhO1xuICAgICAgfSkge1xuICAgICAgICBzLmNhY2hlQnlVcmkuZGVsZXRlKHBheWxvYWQua2V5KTtcbiAgICAgICAgLy8gaWYgKHBheWxvYWQuZGF0YS5zdGF0dXNDb2RlICE9PSAzMDQpIHtcbiAgICAgICAgLy8gICBpZiAocy5jYWNoZUJ5VXJpLnNpemUgPj0gcy5tZW1DYWNoZUxlbmd0aCkge1xuICAgICAgICAvLyAgICAgLy8gVE9ETzogaW1wcm92ZSBmb3IgTFJVIGFsZ29yaWd0aG1cbiAgICAgICAgLy8gICAgIHMuY2FjaGVCeVVyaS5kZWxldGUocGF5bG9hZC5rZXkpO1xuICAgICAgICAvLyAgICAgcmV0dXJuO1xuICAgICAgICAvLyAgIH1cbiAgICAgICAgLy8gICBzLmNhY2hlQnlVcmkuc2V0KHBheWxvYWQua2V5LCBwYXlsb2FkLmRhdGEpO1xuICAgICAgICAvLyB9XG4gICAgICB9LFxuICAgICAgX2NsZWFuKHM6IFByb3h5Q2FjaGVTdGF0ZSwga2V5OiBzdHJpbmcpIHtcbiAgICAgICAgcy5jYWNoZUJ5VXJpLmRlbGV0ZShrZXkpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG5cbiAgY2FjaGVDb250cm9sbGVyLmVwaWMoYWN0aW9uJCA9PiB7XG4gICAgY29uc3QgZGVmYXVsdFByb3h5T3B0ID0gZGVmYXVsdFByb3h5T3B0aW9ucyhwcm94eVBhdGgsIHRhcmdldFVybCk7XG4gICAgY29uc3QgcHJveHlFcnJvciQgPSBuZXcgcnguU3ViamVjdDxQYXJhbWV0ZXJzPCh0eXBlb2YgZGVmYXVsdFByb3h5T3B0KVsnb25FcnJvciddPj4oKTtcbiAgICBjb25zdCBwcm94eVJlcyQgPSBuZXcgcnguU3ViamVjdDxQYXJhbWV0ZXJzPCh0eXBlb2YgZGVmYXVsdFByb3h5T3B0KVsnb25Qcm94eVJlcyddPj4oKTtcblxuICAgIGxldCBwcm94eU1pZGRsZXdhcmUkID0gbmV3IHJ4LlJlcGxheVN1YmplY3Q8UmV0dXJuVHlwZTx0eXBlb2YgcHJveHk+PigxKTtcbiAgICBjb25zdCBhY3Rpb25zID0gY2FzdEJ5QWN0aW9uVHlwZShjYWNoZUNvbnRyb2xsZXIuYWN0aW9ucywgYWN0aW9uJCk7XG5cbiAgICBhc3luYyBmdW5jdGlvbiByZXF1ZXN0aW5nUmVtb3RlKGtleTogc3RyaW5nLCByZXFIb3N0OiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwcm94eVJlczogSW5jb21pbmdNZXNzYWdlLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzOiBTZXJ2ZXJSZXNwb25zZSwgaGVhZGVyczogW3N0cmluZywgc3RyaW5nIHwgc3RyaW5nW11dW10pIHtcbiAgICAgIGh0dHBQcm94eUxvZy5kZWJ1ZygnY2FjaGUgc2l6ZTonLCBjYWNoZUNvbnRyb2xsZXIuZ2V0U3RhdGUoKS5jYWNoZUJ5VXJpLnNpemUpO1xuICAgICAgY29uc3QgZGlyID0gUGF0aC5qb2luKGNhY2hlQ29udHJvbGxlci5nZXRTdGF0ZSgpLmNhY2hlRGlyLCBrZXkpO1xuICAgICAgY29uc3QgZmlsZSA9IFBhdGguam9pbihkaXIsICdib2R5Jyk7XG4gICAgICBjb25zdCBzdGF0dXNDb2RlID0gcHJveHlSZXMuc3RhdHVzQ29kZSB8fCAyMDA7XG4gICAgICBjb25zdCB7cmVzcG9uc2VUcmFuc2Zvcm1lcn0gPSBjYWNoZUNvbnRyb2xsZXIuZ2V0U3RhdGUoKTtcbiAgICAgIGlmIChzdGF0dXNDb2RlID09PSAzMDQpIHtcbiAgICAgICAgY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuX2RvbmUoe2tleSwgcmVzLCBkYXRhOiB7XG4gICAgICAgICAgICBzdGF0dXNDb2RlLCBoZWFkZXJzLCBib2R5OiBjcmVhdGVSZXBsYXlSZWFkYWJsZUZhY3RvcnkocHJveHlSZXMpXG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgaHR0cFByb3h5TG9nLndhcm4oJ1ZlcnNpb24gaW5mbyBpcyBub3QgcmVjb3JkZWQsIGR1ZSB0byByZXNwb25zZSAzMDQgZnJvbScsIHJlcy5yZXEudXJsLCAnLFxcbiB5b3UgY2FuIHJlbW92ZSBleGlzdGluZyBucG0vY2FjaGUgY2FjaGUgdG8gYXZvaWQgMzA0Jyk7XG4gICAgICAgIHJldHVybiByeC5FTVBUWTtcbiAgICAgIH1cblxuICAgICAgaWYgKHJlc3BvbnNlVHJhbnNmb3JtZXIgPT0gbnVsbCkge1xuICAgICAgICBjb25zdCBkb25lTWtkaXIgPSBmcy5ta2RpcnAoZGlyKTtcblxuICAgICAgICBjb25zdCByZWFkYWJsZUZhYyA9IGNyZWF0ZVJlcGxheVJlYWRhYmxlRmFjdG9yeShwcm94eVJlcyk7XG4gICAgICAgIC8vIGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyLl9kb25lKHtrZXksIGRhdGE6IHtcbiAgICAgICAgLy8gICAgICAgc3RhdHVzQ29kZSwgaGVhZGVycywgYm9keTogcmVhZGFibGVGYWNcbiAgICAgICAgLy8gICAgIH0sIHJlc1xuICAgICAgICAvLyAgIH0pO1xuICAgICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fc2F2aW5nRmlsZSh7a2V5LCBkYXRhOiB7XG4gICAgICAgICAgICBzdGF0dXNDb2RlLCBoZWFkZXJzLCBib2R5OiByZWFkYWJsZUZhY1xuICAgICAgICAgIH0sIHJlc1xuICAgICAgICB9KTtcbiAgICAgICAgYXdhaXQgZG9uZU1rZGlyO1xuICAgICAgICB2b2lkIGZzLnByb21pc2VzLndyaXRlRmlsZShcbiAgICAgICAgICBQYXRoLmpvaW4oZGlyLCAnaGVhZGVyLmpzb24nKSxcbiAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KHtzdGF0dXNDb2RlLCBoZWFkZXJzfSwgbnVsbCwgJyAgJyksXG4gICAgICAgICAgJ3V0Zi04Jyk7XG5cbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBhd2FpdCBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiByZWFkYWJsZUZhYygpXG4gICAgICAgICAgICAucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbShmaWxlKSlcbiAgICAgICAgICAgIC5vbignZmluaXNoJywgcmVzb2x2ZSlcbiAgICAgICAgICAgIC5vbignZXJyb3InLCByZWplY3QpKTtcblxuICAgICAgICAgIGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyLl9kb25lKHtrZXksIGRhdGE6IHtcbiAgICAgICAgICAgICAgc3RhdHVzQ29kZSwgaGVhZGVycywgYm9keTogcmVhZGFibGVGYWNcbiAgICAgICAgICAgIH0sIHJlc1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgaHR0cFByb3h5TG9nLmluZm8oYHJlc3BvbnNlIGlzIHdyaXR0ZW4gdG8gKGxlbmd0aDogJHtoZWFkZXJzLmZpbmQoaXRlbSA9PiBpdGVtWzBdID09PSAnY29udGVudC1sZW5ndGgnKSFbMV0gYXMgc3RyaW5nfSlgLFxuICAgICAgICAgICAgUGF0aC5wb3NpeC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBmaWxlKSk7XG4gICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICBodHRwUHJveHlMb2cuZXJyb3IoJ0ZhaWxlZCB0byB3cml0ZSBjYWNoZSBmaWxlICcgK1xuICAgICAgICAgICAgUGF0aC5wb3NpeC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBmaWxlKSwgZSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAocmVxSG9zdCAmJiAhcmVxSG9zdC5zdGFydHNXaXRoKCdodHRwJykpIHtcbiAgICAgICAgcmVxSG9zdCA9ICdodHRwOi8vJyArIHJlcUhvc3Q7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHtyZWFkYWJsZTogdHJhbnNmb3JtZWQsIGxlbmd0aH0gPSBhd2FpdCByZXNwb25zZVRyYW5zZm9ybWVyKGhlYWRlcnMsIHJlcUhvc3QsIHByb3h5UmVzKTtcbiAgICAgIGNvbnN0IGxlbmd0aEhlYWRlcklkeCA9IGhlYWRlcnMuZmluZEluZGV4KHJvdyA9PiByb3dbMF0gPT09ICdjb250ZW50LWxlbmd0aCcpO1xuICAgICAgaWYgKGxlbmd0aEhlYWRlcklkeCA+PSAwKVxuICAgICAgICBoZWFkZXJzW2xlbmd0aEhlYWRlcklkeF1bMV0gPSAnJyArIGxlbmd0aDtcblxuICAgICAgY2FjaGVDb250cm9sbGVyLmFjdGlvbkRpc3BhdGNoZXIuX3NhdmluZ0ZpbGUoe2tleSwgcmVzLCBkYXRhOiB7XG4gICAgICAgICAgc3RhdHVzQ29kZSwgaGVhZGVycywgYm9keTogdHJhbnNmb3JtZWRcbiAgICAgIH0gfSk7XG5cbiAgICAgIGF3YWl0IGZzLm1rZGlycChkaXIpO1xuICAgICAgdm9pZCBmcy5wcm9taXNlcy53cml0ZUZpbGUoXG4gICAgICAgIFBhdGguam9pbihkaXIsICdoZWFkZXIuanNvbicpLFxuICAgICAgICBKU09OLnN0cmluZ2lmeSh7c3RhdHVzQ29kZSwgaGVhZGVyc30sIG51bGwsICcgICcpLFxuICAgICAgICAndXRmLTgnKTtcbiAgICAgIGF3YWl0IG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHRyYW5zZm9ybWVkKClcbiAgICAgICAgLm9uKCdlbmQnLCByZXNvbHZlKVxuICAgICAgICAucGlwZShmcy5jcmVhdGVXcml0ZVN0cmVhbShmaWxlKSlcbiAgICAgICAgLm9uKCdlcnJvcicsIHJlamVjdCkpO1xuXG4gICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fZG9uZSh7a2V5LCByZXMsIGRhdGE6IHtcbiAgICAgICAgICBzdGF0dXNDb2RlLCBoZWFkZXJzLCBib2R5OiB0cmFuc2Zvcm1lZFxuICAgICAgfSB9KTtcbiAgICAgIGh0dHBQcm94eUxvZy5pbmZvKCd3cml0ZSByZXNwb25zZSB0byBmaWxlJywgUGF0aC5wb3NpeC5yZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBmaWxlKSwgJ3NpemUnLCBsZW5ndGgpO1xuICAgIH1cblxuICAgIHJldHVybiByeC5tZXJnZShcbiAgICAgIGFjdGlvbnMuY29uZmlndXJlUHJveHkucGlwZShcbiAgICAgICAgb3AubWFwKCh7cGF5bG9hZDogZXh0cmFPcHR9KSA9PiB7XG4gICAgICAgICAgcHJveHlNaWRkbGV3YXJlJC5uZXh0KHByb3h5KHtcbiAgICAgICAgICAgIC4uLmRlZmF1bHRQcm94eU9wdCxcbiAgICAgICAgICAgIGZvbGxvd1JlZGlyZWN0czogdHJ1ZSxcbiAgICAgICAgICAgIC4uLmV4dHJhT3B0LFxuICAgICAgICAgICAgb25Qcm94eVJlcyguLi5hcmdzKSB7XG4gICAgICAgICAgICAgIHByb3h5UmVzJC5uZXh0KGFyZ3MpO1xuICAgICAgICAgICAgICBkZWZhdWx0UHJveHlPcHQub25Qcm94eVJlcyguLi5hcmdzKTtcbiAgICAgICAgICAgICAgaWYgKGV4dHJhT3B0Lm9uUHJveHlSZXMpXG4gICAgICAgICAgICAgICAgZXh0cmFPcHQub25Qcm94eVJlcyguLi5hcmdzKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBvbkVycm9yKC4uLmFyZ3MpIHtcbiAgICAgICAgICAgICAgZGVmYXVsdFByb3h5T3B0Lm9uRXJyb3IoLi4uYXJncyk7XG4gICAgICAgICAgICAgIHByb3h5RXJyb3IkLm5leHQoYXJncyk7XG4gICAgICAgICAgICAgIGlmIChleHRyYU9wdC5vbkVycm9yKVxuICAgICAgICAgICAgICAgIGV4dHJhT3B0Lm9uRXJyb3IoLi4uYXJncyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSkpO1xuICAgICAgICB9KVxuICAgICAgKSxcbiAgICAgIGFjdGlvbnMuaGl0Q2FjaGUucGlwZShcbiAgICAgICAgb3AubWVyZ2VNYXAoICh7cGF5bG9hZH0pID0+IHtcbiAgICAgICAgICBjb25zdCB3YWl0Q2FjaGVBbmRTZW5kUmVzID0gcngucmFjZShhY3Rpb25zLl9kb25lLCBhY3Rpb25zLl9zYXZpbmdGaWxlKS5waXBlKFxuICAgICAgICAgICAgb3AuZmlsdGVyKGFjdGlvbiA9PiBhY3Rpb24ucGF5bG9hZC5rZXkgPT09IHBheWxvYWQua2V5KSwgLy8gSW4gY2FzZSBpdCBpcyBvZiByZWRpcmVjdGVkIHJlcXVlc3QsIEhQTSBoYXMgZG9uZSBwaXBpbmcgcmVzcG9uc2UgKGlnbm9yZWQgXCJtYW51YWwgcmVwb25zZVwiIHNldHRpbmcpXG4gICAgICAgICAgICBvcC50YWtlKDEpLFxuICAgICAgICAgICAgb3AubWVyZ2VNYXAoKHtwYXlsb2FkOiB7a2V5LCByZXMsIGRhdGF9fSkgPT4ge1xuICAgICAgICAgICAgICBpZiAocmVzLndyaXRhYmxlRW5kZWQpXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJ4LkVNUFRZO1xuICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGRhdGEuaGVhZGVycykge1xuICAgICAgICAgICAgICAgIHJlcy5zZXRIZWFkZXIoZW50cnlbMF0sIGVudHJ5WzFdKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IGRhdGEuc3RhdHVzQ29kZTtcbiAgICAgICAgICAgICAgaHR0cFByb3h5TG9nLmluZm8oJ3JlcGx5IHRvJywgcGF5bG9hZC5rZXkpO1xuICAgICAgICAgICAgICBjb25zdCBwaXBlRXZlbnQkID0gbmV3IHJ4LlN1YmplY3Q8c3RyaW5nPigpO1xuICAgICAgICAgICAgICByZXMub24oJ2ZpbmlzaCcsICgpID0+IHtcbiAgICAgICAgICAgICAgICBwaXBlRXZlbnQkLm5leHQoJ2ZpbmlzaCcpO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAub24oJ2Nsb3NlJywgKCkgPT4ge1xuICAgICAgICAgICAgICAgIHBpcGVFdmVudCQubmV4dCgnY2xvc2UnKTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgLm9uKCdlcnJvcicsIGVyciA9PiBwaXBlRXZlbnQkLmVycm9yKGVycikpO1xuXG4gICAgICAgICAgICAgIGRhdGEuYm9keSgpLnBpcGUocmVzKTtcbiAgICAgICAgICAgICAgcmV0dXJuIHBpcGVFdmVudCQucGlwZShcbiAgICAgICAgICAgICAgICBvcC5maWx0ZXIoZXZlbnQgPT4gZXZlbnQgPT09ICdmaW5pc2gnIHx8IGV2ZW50ID09PSAnY2xvc2UnKSxcbiAgICAgICAgICAgICAgICBvcC50YXAoZXZlbnQgPT4ge1xuICAgICAgICAgICAgICAgICAgaWYgKGV2ZW50ID09PSAnY2xvc2UnKVxuICAgICAgICAgICAgICAgICAgICBodHRwUHJveHlMb2cuZXJyb3IoJ1Jlc3BvbnNlIGNvbm5lY3Rpb24gaXMgY2xvc2VkIGVhcmx5Jyk7XG4gICAgICAgICAgICAgICAgfSksXG4gICAgICAgICAgICAgICAgb3AudGFrZSgxKSxcbiAgICAgICAgICAgICAgICBvcC5tYXBUbyhrZXkpLFxuICAgICAgICAgICAgICAgIG9wLnRpbWVvdXQoMTIwMDAwKSxcbiAgICAgICAgICAgICAgICBvcC5jYXRjaEVycm9yKGVyciA9PiB7XG4gICAgICAgICAgICAgICAgICBpZiAoIXJlcy5oZWFkZXJzU2VudCkge1xuICAgICAgICAgICAgICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDUwMDtcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZCgpO1xuICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzLmVuZCgpO1xuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgcmV0dXJuIHJ4LkVNUFRZO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICk7XG4gICAgICAgICAgICB9KSxcbiAgICAgICAgICAgIG9wLm1hcChrZXkgPT4gaHR0cFByb3h5TG9nLmluZm8oYHJlcGxpZWQ6ICR7a2V5fWApKVxuICAgICAgICAgICk7XG4gICAgICAgICAgY29uc3QgaXRlbSA9IGNhY2hlQ29udHJvbGxlci5nZXRTdGF0ZSgpLmNhY2hlQnlVcmkuZ2V0KHBheWxvYWQua2V5KTtcbiAgICAgICAgICBodHRwUHJveHlMb2cuaW5mbygnaGl0Q2FjaGUgZm9yICcgKyBwYXlsb2FkLmtleSArICcsJyArIGl0ZW0pO1xuICAgICAgICAgIGlmIChpdGVtID09IG51bGwpIHtcbiAgICAgICAgICAgIGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyLl9sb2FkRnJvbVN0b3JhZ2UocGF5bG9hZCk7XG4gICAgICAgICAgICByZXR1cm4gd2FpdENhY2hlQW5kU2VuZFJlcztcbiAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW0gPT09ICdsb2FkaW5nJyB8fCBpdGVtID09PSAncmVxdWVzdGluZycgfHwgaXRlbSA9PT0gJ3NhdmluZycpIHtcbiAgICAgICAgICAgIHJldHVybiB3YWl0Q2FjaGVBbmRTZW5kUmVzO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBodHRwUHJveHlMb2cuaW5mbygnaGl0IGNhY2hlZCcsIHBheWxvYWQua2V5KTtcbiAgICAgICAgICAgIGNvbnN0IHRyYW5zZm9ybWVyID0gY2FjaGVDb250cm9sbGVyLmdldFN0YXRlKCkuY2FjaGVUcmFuc2Zvcm1lcjtcbiAgICAgICAgICAgIGlmICh0cmFuc2Zvcm1lciA9PSBudWxsKSB7XG4gICAgICAgICAgICAgIGZvciAoY29uc3QgZW50cnkgb2YgaXRlbS5oZWFkZXJzKSB7XG4gICAgICAgICAgICAgICAgcGF5bG9hZC5yZXMuc2V0SGVhZGVyKGVudHJ5WzBdLCBlbnRyeVsxXSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcGF5bG9hZC5yZXMuc3RhdHVzKGl0ZW0uc3RhdHVzQ29kZSk7XG4gICAgICAgICAgICAgIHJldHVybiBuZXcgcnguT2JzZXJ2YWJsZTx2b2lkPihzdWIgPT4ge1xuICAgICAgICAgICAgICAgIGl0ZW0uYm9keSgpXG4gICAgICAgICAgICAgICAgLm9uKCdlbmQnLCAoKSA9PiB7c3ViLm5leHQoKTsgc3ViLmNvbXBsZXRlKCk7IH0pXG4gICAgICAgICAgICAgICAgLnBpcGUocGF5bG9hZC5yZXMpO1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHJ4LmZyb20odHJhbnNmb3JtZXIoaXRlbS5oZWFkZXJzLCBwYXlsb2FkLnJlcS5oZWFkZXJzLmhvc3QsIGl0ZW0uYm9keSgpKSkucGlwZShcbiAgICAgICAgICAgICAgb3AudGFrZSgxKSxcbiAgICAgICAgICAgICAgb3AubWVyZ2VNYXAoKHtyZWFkYWJsZSwgbGVuZ3RofSkgPT4ge1xuICAgICAgICAgICAgICAgIGNvbnN0IGxlbmd0aEhlYWRlcklkeCA9IGl0ZW0uaGVhZGVycy5maW5kSW5kZXgocm93ID0+IHJvd1swXSA9PT0gJ2NvbnRlbnQtbGVuZ3RoJyk7XG4gICAgICAgICAgICAgICAgaWYgKGxlbmd0aEhlYWRlcklkeCA+PSAwKVxuICAgICAgICAgICAgICAgICAgaXRlbS5oZWFkZXJzW2xlbmd0aEhlYWRlcklkeF1bMV0gPSAnJyArIGxlbmd0aDtcbiAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIGl0ZW0uaGVhZGVycykge1xuICAgICAgICAgICAgICAgICAgcGF5bG9hZC5yZXMuc2V0SGVhZGVyKGVudHJ5WzBdLCBlbnRyeVsxXSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHBheWxvYWQucmVzLnN0YXR1cyhpdGVtLnN0YXR1c0NvZGUpO1xuICAgICAgICAgICAgICAgIHJldHVybiBuZXcgcnguT2JzZXJ2YWJsZTx2b2lkPihzdWIgPT4ge1xuICAgICAgICAgICAgICAgICAgcmVhZGFibGUoKS5vbignZW5kJywgKCkgPT4gc3ViLmNvbXBsZXRlKCkpXG4gICAgICAgICAgICAgICAgICAgIC5waXBlKHBheWxvYWQucmVzKVxuICAgICAgICAgICAgICAgICAgICAub24oJ2Vycm9yJywgZXJyID0+IHN1Yi5lcnJvcihlcnIpKTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICB9KSxcbiAgICAgICAgb3AuY2F0Y2hFcnJvcihlcnIgPT4ge1xuICAgICAgICAgIGh0dHBQcm94eUxvZy5lcnJvcignRmFpbGVkIHRvIHdyaXRlIHJlc3BvbnNlJywgZXJyKTtcbiAgICAgICAgICByZXR1cm4gcnguRU1QVFk7XG4gICAgICAgIH0pXG4gICAgICApLFxuICAgICAgYWN0aW9ucy5fbG9hZEZyb21TdG9yYWdlLnBpcGUoXG4gICAgICAgIG9wLm1lcmdlTWFwKGFzeW5jICh7cGF5bG9hZH0pID0+IHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgZGlyID0gUGF0aC5qb2luKGNhY2hlQ29udHJvbGxlci5nZXRTdGF0ZSgpLmNhY2hlRGlyLCBwYXlsb2FkLmtleSk7XG4gICAgICAgICAgICBjb25zdCBoRmlsZSA9IFBhdGguam9pbihkaXIsICdoZWFkZXIuanNvbicpO1xuICAgICAgICAgICAgY29uc3QgYkZpbGUgPSBQYXRoLmpvaW4oZGlyLCAnYm9keScpO1xuICAgICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoaEZpbGUpKSB7XG4gICAgICAgICAgICAgIGh0dHBQcm94eUxvZy5pbmZvKCdsb2FkJywgcGF5bG9hZC5rZXkpO1xuICAgICAgICAgICAgICBjb25zdCB0cmFuc2Zvcm1lciA9IGNhY2hlQ29udHJvbGxlci5nZXRTdGF0ZSgpLmNhY2hlVHJhbnNmb3JtZXI7XG4gICAgICAgICAgICAgIGlmICh0cmFuc2Zvcm1lciA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGVyc1N0ciA9IGF3YWl0IGZzLnByb21pc2VzLnJlYWRGaWxlKGhGaWxlLCAndXRmLTgnKTtcbiAgICAgICAgICAgICAgICBjb25zdCB7c3RhdHVzQ29kZSwgaGVhZGVyc30gPSBKU09OLnBhcnNlKGhlYWRlcnNTdHIpIGFzIHtzdGF0dXNDb2RlOiBudW1iZXI7IGhlYWRlcnM6IFtzdHJpbmcsIHN0cmluZyB8IHN0cmluZ1tdXVtdfTtcblxuICAgICAgICAgICAgICAgIGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyLl9kb25lKHtrZXk6IHBheWxvYWQua2V5LCByZXM6IHBheWxvYWQucmVzLFxuICAgICAgICAgICAgICAgICAgZGF0YToge1xuICAgICAgICAgICAgICAgICAgICBzdGF0dXNDb2RlLFxuICAgICAgICAgICAgICAgICAgICBoZWFkZXJzLFxuICAgICAgICAgICAgICAgICAgICBib2R5OiAoKSA9PiBmcy5jcmVhdGVSZWFkU3RyZWFtKGJGaWxlKVxuICAgICAgICAgICAgICAgICAgfX0pO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGNvbnN0IGhlYWRlcnNTdHIgPSBhd2FpdCBmcy5wcm9taXNlcy5yZWFkRmlsZShoRmlsZSwgJ3V0Zi04Jyk7XG4gICAgICAgICAgICAgIGNvbnN0IHtzdGF0dXNDb2RlLCBoZWFkZXJzfSA9IEpTT04ucGFyc2UoaGVhZGVyc1N0cikgYXMge3N0YXR1c0NvZGU6IG51bWJlcjsgaGVhZGVyczogW3N0cmluZywgc3RyaW5nIHwgc3RyaW5nW11dW119O1xuICAgICAgICAgICAgICBjb25zdCB7cmVhZGFibGUsIGxlbmd0aH0gPSBhd2FpdCB0cmFuc2Zvcm1lcihoZWFkZXJzLCBwYXlsb2FkLnJlcS5oZWFkZXJzLmhvc3QsIGZzLmNyZWF0ZVJlYWRTdHJlYW0oYkZpbGUpKTtcbiAgICAgICAgICAgICAgY29uc3QgbGVuZ3RoSGVhZGVySWR4ID0gaGVhZGVycy5maW5kSW5kZXgocm93ID0+IHJvd1swXSA9PT0gJ2NvbnRlbnQtbGVuZ3RoJyk7XG4gICAgICAgICAgICAgIGlmIChsZW5ndGhIZWFkZXJJZHggPj0gMClcbiAgICAgICAgICAgICAgICBoZWFkZXJzW2xlbmd0aEhlYWRlcklkeF1bMV0gPSAnJyArIGxlbmd0aDtcblxuICAgICAgICAgICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fZG9uZSh7a2V5OiBwYXlsb2FkLmtleSxcbiAgICAgICAgICAgICAgICByZXM6IHBheWxvYWQucmVzLFxuICAgICAgICAgICAgICAgIGRhdGE6IHtcbiAgICAgICAgICAgICAgICAgIHN0YXR1c0NvZGUsXG4gICAgICAgICAgICAgICAgICBoZWFkZXJzLFxuICAgICAgICAgICAgICAgICAgYm9keTogcmVhZGFibGVcbiAgICAgICAgICAgICAgICB9fSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICBodHRwUHJveHlMb2cuaW5mbygnTm8gZXhpc3RpbmcgZmlsZSBmb3InLCBwYXlsb2FkLmtleSk7XG4gICAgICAgICAgICAgIGNhY2hlQ29udHJvbGxlci5hY3Rpb25EaXNwYXRjaGVyLl9yZXF1ZXN0UmVtb3RlKHBheWxvYWQpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICAgICAgICBodHRwUHJveHlMb2cuZXJyb3IoJ0ZhaWxlZCB0byBzYXZlIGNhY2hlIGZvcjogJyArIHBheWxvYWQua2V5LCBleCk7XG4gICAgICAgICAgICBjYWNoZUNvbnRyb2xsZXIuYWN0aW9uRGlzcGF0Y2hlci5fY2xlYW4ocGF5bG9hZC5rZXkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICksXG4gICAgICBhY3Rpb25zLl9yZXF1ZXN0UmVtb3RlLnBpcGUoXG4gICAgICAgIG9wLm1lcmdlTWFwKCh7cGF5bG9hZH0pID0+IHJ4Lm1lcmdlKFxuICAgICAgICAgIHJ4LnJhY2UoXG4gICAgICAgICAgICBwcm94eVJlcyQucGlwZShcbiAgICAgICAgICAgICAgb3AuZmlsdGVyKChbLCAsIHJlc10pID0+IHJlcyA9PT0gcGF5bG9hZC5yZXMpLFxuICAgICAgICAgICAgICBvcC50YWtlKDEpLFxuICAgICAgICAgICAgICBvcC5tZXJnZU1hcCgoW3Byb3h5UmVzLCBvcmlnUmVxLCBzZXJ2ZXJSZXNdKSA9PiB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJ4LmRlZmVyKCgpID0+IHJlcXVlc3RpbmdSZW1vdGUocGF5bG9hZC5rZXksIHBheWxvYWQucmVxLmhlYWRlcnMuaG9zdCwgcHJveHlSZXMsIHNlcnZlclJlcyxcbiAgICAgICAgICAgICAgICAgIE9iamVjdC5lbnRyaWVzKHByb3h5UmVzLmhlYWRlcnMpXG4gICAgICAgICAgICAgICAgICAuZmlsdGVyKGVudHJ5ID0+IGVudHJ5WzFdICE9IG51bGwpIGFzIFtzdHJpbmcsIHN0cmluZyB8IHN0cmluZ1tdXVtdKSlcbiAgICAgICAgICAgICAgICAucGlwZShcbiAgICAgICAgICAgICAgICAgIG9wLnRpbWVvdXQoMTUwMDApXG4gICAgICAgICAgICAgICAgKTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICksXG4gICAgICAgICAgICBwcm94eUVycm9yJC5waXBlKFxuICAgICAgICAgICAgICBvcC5maWx0ZXIoKFtlcnIsIG9yaWdSZXEsIHNlcnZlclJlc10pID0+IHNlcnZlclJlcyA9PT0gcGF5bG9hZC5yZXMpLFxuICAgICAgICAgICAgICBvcC50YWtlKDEpLFxuICAgICAgICAgICAgICBvcC5tYXAoKFtlcnJdKSA9PiB7XG4gICAgICAgICAgICAgICAgaHR0cFByb3h5TG9nLmVycm9yKCdIUE0gZXJyb3InLCBlcnIpO1xuICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgKVxuICAgICAgICAgICksXG4gICAgICAgICAgcHJveHlNaWRkbGV3YXJlJC5waXBlKFxuICAgICAgICAgICAgb3AudGFrZSgxKSxcbiAgICAgICAgICAgIG9wLm1hcChwcm94eSA9PiBwcm94eShwYXlsb2FkLnJlcSwgcGF5bG9hZC5yZXMsIHBheWxvYWQubmV4dCkpXG4gICAgICAgICAgKVxuICAgICAgICApKVxuICAgICAgKVxuICAgICkucGlwZShcbiAgICAgIG9wLmlnbm9yZUVsZW1lbnRzKCksXG4gICAgICBvcC5jYXRjaEVycm9yKChlcnIsIHNyYykgPT4ge1xuICAgICAgICBodHRwUHJveHlMb2cuZXJyb3IoJ0hUVFAgcHJveHkgY2FjaGUgZXJyb3InLCBlcnIpO1xuICAgICAgICByZXR1cm4gc3JjO1xuICAgICAgfSlcbiAgICApO1xuICB9KTtcblxuICByZXR1cm4gY2FjaGVDb250cm9sbGVyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24ga2V5T2ZVcmkobWV0aG9kOiBzdHJpbmcsIHBhdGg6IHN0cmluZykge1xuICBjb25zdCB1cmwgPSBuZXcgVVJMKCdodHRwOi8vZi5jb20nICsgcGF0aCk7XG4gIGNvbnN0IGtleSA9IG1ldGhvZCArIHVybC5wYXRobmFtZSArICh1cmwuc2VhcmNoID8gJy8nICsgXy50cmltU3RhcnQodXJsLnNlYXJjaCwgJz8nKSA6ICcnKTtcbiAgcmV0dXJuIGtleTtcbn1cbiJdfQ==