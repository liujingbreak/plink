"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.keyOfUri = exports.createProxyWithCache = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const stream_1 = tslib_1.__importDefault(require("stream"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const rx = tslib_1.__importStar(require("rxjs"));
const op = tslib_1.__importStar(require("rxjs/operators"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const http_proxy_1 = require("http-proxy");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const __plink_1 = tslib_1.__importDefault(require("__plink"));
const plink_1 = require("@wfh/plink");
// import { createProxyMiddleware as proxy} from 'http-proxy-middleware';
const tiny_redux_toolkit_1 = require("@wfh/redux-toolkit-observable/dist/tiny-redux-toolkit");
const utils_1 = require("@wfh/assets-processer/dist/utils");
const http_proxy_observable_1 = require("@wfh/assets-processer/dist/http-proxy-observable");
const httpProxyLog = (0, plink_1.log4File)(__filename);
function createProxyWithCache(proxyPath, serverOptions, cacheRootDir, opts = { manual: false }) {
    var _a;
    const defaultProxy = (0, http_proxy_1.createProxyServer)(Object.assign({ changeOrigin: true, ws: false, secure: false, cookieDomainRewrite: { '*': '' }, followRedirects: true, proxyTimeout: 20000, timeout: 10000 }, serverOptions));
    const initialState = {
        cacheDir: cacheRootDir,
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
//# sourceMappingURL=cache-service.js.map