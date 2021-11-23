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
exports.createProxyWithCache = exports.setupHttpProxy = exports.createResponseTimestamp = void 0;
const stream_1 = __importDefault(require("stream"));
const __api_1 = __importDefault(require("__api"));
const lodash_1 = __importDefault(require("lodash"));
const utils_1 = require("@wfh/http-server/dist/utils");
const plink_1 = require("@wfh/plink");
const tiny_redux_toolkit_1 = require("@wfh/redux-toolkit-observable/dist/tiny-redux-toolkit");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
// import inspector from 'inspector';
// import fs from 'fs';
const http_proxy_middleware_1 = require("http-proxy-middleware");
// inspector.open(9222, 'localhost', true);
const logTime = plink_1.logger.getLogger(__api_1.default.packageName + '.timestamp');
/**
 * Middleware for printing each response process duration time to log
 * @param req
 * @param res
 * @param next
 */
function createResponseTimestamp(req, res, next) {
    const date = new Date();
    const startTime = date.getTime();
    const end = res.end;
    function print() {
        const now = new Date().getTime();
        logTime.info(`request: ${req.method} ${req.originalUrl} | status: ${res.statusCode}, [response duration: ${now - startTime}ms` +
            `] (since ${date.toLocaleTimeString()} ${startTime}) [${req.header('user-agent')}]`);
    }
    res.end = function (chunk, encoding, cb) {
        const argv = Array.prototype.slice.call(arguments, 0);
        const lastArg = arguments[arguments.length - 1];
        if (typeof lastArg === 'function') {
            const originCb = arguments[arguments.length - 1];
            argv[argv.length - 1] = () => {
                originCb();
                print();
            };
        }
        else if (argv.length === 0) {
            argv.push(null, print);
        }
        else if (argv.length === 1) {
            argv.push(print);
        }
        const ret = end.apply(res, argv);
        return ret;
    };
    next();
}
exports.createResponseTimestamp = createResponseTimestamp;
/**
 * This function uses http-proxy-middleware internally.
 *
 * Be aware with command line option "--verbose", once enable "verbose", this function will
 * read (pipe) remote server response body into a string buffer for any message with content-type is "text" or "json" based
 * Create and use an HTTP request proxy for specific request path
 * @param proxyPath
 * @param targetUrl
 */
function setupHttpProxy(proxyPath, targetUrl, opts = {}) {
    proxyPath = lodash_1.default.trimEnd(proxyPath, '/');
    targetUrl = lodash_1.default.trimEnd(targetUrl, '/');
    const defaultOpt = defaultProxyOptions(proxyPath, targetUrl);
    const proxyMidOpt = Object.assign(Object.assign({}, defaultOpt), { onProxyReq(...args) {
            const origHeader = args[0].getHeader('Origin');
            defaultOpt.onProxyReq(...args);
            if (opts.deleteOrigin === false) {
                // Recover removed header "Origin"
                args[0].setHeader('Origin', origHeader);
            }
            if (opts.onProxyReq)
                opts.onProxyReq(...args);
        },
        onProxyRes(...args) {
            if (opts.onProxyRes)
                opts.onProxyRes(...args);
            defaultOpt.onProxyRes(...args);
        },
        onError(...args) {
            defaultOpt.onError(...args);
            if (opts.onError)
                opts.onError(...args);
        } });
    __api_1.default.expressAppSet(app => {
        app.use(proxyPath, (0, http_proxy_middleware_1.createProxyMiddleware)(proxyMidOpt));
    });
}
exports.setupHttpProxy = setupHttpProxy;
function defaultProxyOptions(proxyPath, targetUrl) {
    proxyPath = lodash_1.default.trimEnd(proxyPath, '/');
    targetUrl = lodash_1.default.trimEnd(targetUrl, '/');
    const { protocol, host, pathname } = new URL(targetUrl);
    const patPath = new RegExp('^' + lodash_1.default.escapeRegExp(proxyPath) + '(/|$)');
    const hpmLog = plink_1.logger.getLogger('HPM.' + proxyPath);
    const proxyMidOpt = {
        // eslint-disable-next-line max-len
        target: protocol + '//' + host,
        changeOrigin: true,
        ws: false,
        secure: false,
        cookieDomainRewrite: { '*': '' },
        pathRewrite: (path, req) => {
            // hpmLog.warn('patPath=', patPath, 'path=', path);
            const ret = path && path.replace(patPath, lodash_1.default.trimEnd(pathname, '/') + '/');
            // hpmLog.info(`proxy to path: ${req.method} ${protocol + '//' + host}${ret}, req.url = ${req.url}`);
            return ret;
        },
        logLevel: 'debug',
        logProvider: provider => hpmLog,
        proxyTimeout: 10000,
        onProxyReq(proxyReq, req, res, ...rest) {
            // if (opts.deleteOrigin)
            proxyReq.removeHeader('Origin'); // Bypass CORS restrict on target server
            const referer = proxyReq.getHeader('referer');
            if (referer) {
                proxyReq.setHeader('referer', `${protocol}//${host}${new URL(referer).pathname}`);
            }
            hpmLog.info(`Proxy request to ${protocol}//${host}${proxyReq.path} method: ${req.method || 'uknown'}, ${JSON.stringify(proxyReq.getHeaders(), null, '  ')}`);
        },
        onProxyRes(incoming, req, res) {
            var _a;
            incoming.headers['Access-Control-Allow-Origin'] = '*';
            if (__api_1.default.config().devMode) {
                hpmLog.info(`Proxy recieve ${req.url || ''}, status: ${incoming.statusCode}\n`, JSON.stringify(incoming.headers, null, '  '));
            }
            else {
                hpmLog.info(`Proxy recieve ${req.url || ''}, status: ${incoming.statusCode}`);
            }
            if (__api_1.default.config().devMode || ((_a = (0, plink_1.config)().cliOptions) === null || _a === void 0 ? void 0 : _a.verbose)) {
                const ct = incoming.headers['content-type'];
                hpmLog.info(`Response ${req.url || ''} headers:\n`, incoming.headers);
                const isText = (ct && /\b(json|text)\b/i.test(ct));
                if (isText) {
                    if (!incoming.complete) {
                        const bufs = [];
                        void (0, utils_1.readCompressedResponse)(incoming, new stream_1.default.Writable({
                            write(chunk, enc, cb) {
                                bufs.push(Buffer.isBuffer(chunk) ? chunk.toString() : chunk);
                                cb();
                            },
                            final(cb) {
                                hpmLog.info(`Response ${req.url || ''} text body:\n`, bufs.join(''));
                            }
                        }));
                    }
                    else if (incoming.body) {
                        hpmLog.info(`Response ${req.url || ''} text body:\n`, incoming.toString());
                    }
                }
            }
        },
        onError(err, req, res) {
            hpmLog.warn(err);
        }
    };
    return proxyMidOpt;
}
function createProxyWithCache(proxyPath, cacheRootDir) {
    const initialState = {
        cacheDir: cacheRootDir,
        cacheByUri: new Map()
    };
    const slice = (0, tiny_redux_toolkit_1.createSlice)({
        initialState,
        name: proxyPath,
        reducers: {
            getCached(s, { method, uri }) { },
            _loadCache(s, key) {
                s.cacheByUri.set(key, { loading: true, saving: false });
            },
            _cacheLoaded(s, payload) {
                s.cacheByUri.set(payload.key, { loading: false, saving: false, data: {
                        headers: payload.headers,
                        body: payload.body
                    } });
            },
            // _saveCache(s: ProxyCacheState, payload: {key: string; buffer: Buffer}) {},
            _doneCache(s, key) { }
        }
    });
    slice.addEpic(slice => action$ => {
        const actions = (0, tiny_redux_toolkit_1.castByActionType)(slice.actions, action$);
        // const loadActionByKey: Map<string, rx.Observable<string>>;
        // const saveActionByKey: Map<string, rx.Observable<string>>;
        return rx.merge(actions.getCached.pipe(op.mergeMap(async ({ payload }) => {
            const key = keyOfUri(payload);
            const item = slice.getState().cacheByUri.get(key);
            if (item == null) {
                slice.actionDispatcher._loadCache(key);
                const cFile = path_1.default.resolve(slice.getState().cacheDir, key, 'header.json');
                if (fs_extra_1.default.existsSync(cFile)) {
                    return Promise.all([
                        fs_extra_1.default.promises.readFile(cFile, 'utf-8'),
                        fs_extra_1.default.promises.readFile(path_1.default.resolve(slice.getState().cacheDir, key, 'body'))
                    ]).then(([headers, body]) => {
                        slice.actionDispatcher._cacheLoaded({ key, headers: JSON.parse(headers), body });
                    });
                }
                await fs_extra_1.default.mkdirp(path_1.default.resolve(slice.getState().cacheDir, key));
            }
        }))).pipe(op.ignoreElements());
    });
}
exports.createProxyWithCache = createProxyWithCache;
function keyOfUri({ method, uri }) {
    const url = new URL(method + ':/' + uri);
    const key = method + '/' + url.pathname + (url.search ? '/' + lodash_1.default.trimStart(url.search, '?') : '');
    return key;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1dGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQ0Esb0RBQTRCO0FBQzVCLGtEQUF3QjtBQUN4QixvREFBdUI7QUFDdkIsdURBQW1FO0FBQ25FLHNDQUEwQztBQUMxQyw4RkFBb0c7QUFDcEcsd0RBQTBCO0FBQzFCLGdEQUF3QjtBQUV4Qix5Q0FBMkI7QUFDM0IsbURBQXFDO0FBQ3JDLHFDQUFxQztBQUNyQyx1QkFBdUI7QUFDdkIsaUVBQStGO0FBRS9GLDJDQUEyQztBQUMzQyxNQUFNLE9BQU8sR0FBRyxjQUFNLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEdBQUcsWUFBWSxDQUFDLENBQUM7QUFFakU7Ozs7O0dBS0c7QUFDSCxTQUFnQix1QkFBdUIsQ0FBQyxHQUFZLEVBQUUsR0FBYSxFQUFFLElBQWtCO0lBQ3JGLE1BQU0sSUFBSSxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7SUFDeEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBRWpDLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUM7SUFFcEIsU0FBUyxLQUFLO1FBQ1osTUFBTSxHQUFHLEdBQUcsSUFBSSxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNqQyxPQUFPLENBQUMsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLE1BQU0sSUFBSSxHQUFHLENBQUMsV0FBVyxjQUFjLEdBQUcsQ0FBQyxVQUFVLHlCQUF5QixHQUFHLEdBQUcsU0FBUyxJQUFJO1lBQzVILFlBQVksSUFBSSxDQUFDLGtCQUFrQixFQUFFLElBQUksU0FBUyxNQUFNLEdBQUcsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFFLEdBQUcsQ0FBQyxDQUFDO0lBQzFGLENBQUM7SUFFRCxHQUFHLENBQUMsR0FBRyxHQUFHLFVBQVMsS0FBVyxFQUFFLFFBQWdD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QUFRLEVBQUUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDO3FCQUMzRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEVBQUUsRUFBRTt3QkFDMUIsS0FBSyxDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxFQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQXVCLEVBQUUsSUFBSSxFQUFDLENBQUMsQ0FBQztvQkFDdkcsQ0FBQyxDQUFDLENBQUM7aUJBQ0o7Z0JBQ0QsTUFBTSxrQkFBRSxDQUFDLE1BQU0sQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQzthQUMvRDtRQUNILENBQUMsQ0FBQyxDQUNILENBQ0YsQ0FBQyxJQUFJLENBQ0osRUFBRSxDQUFDLGNBQWMsRUFBRSxDQUNwQixDQUFDO0lBQ0osQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBdERELG9EQXNEQztBQUVELFNBQVMsUUFBUSxDQUFDLEVBQUMsTUFBTSxFQUFFLEdBQUcsRUFBZ0M7SUFDNUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsTUFBTSxHQUFHLElBQUksR0FBRyxHQUFHLENBQUMsQ0FBQztJQUN6QyxNQUFNLEdBQUcsR0FBRyxNQUFNLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsZ0JBQUMsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7SUFDakcsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtSZXF1ZXN0LCBSZXNwb25zZSwgTmV4dEZ1bmN0aW9ufSBmcm9tICdleHByZXNzJztcbmltcG9ydCBzdHJlYW0gZnJvbSAnc3RyZWFtJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7cmVhZENvbXByZXNzZWRSZXNwb25zZX0gZnJvbSAnQHdmaC9odHRwLXNlcnZlci9kaXN0L3V0aWxzJztcbmltcG9ydCB7Y29uZmlnLCBsb2dnZXJ9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IHtjcmVhdGVTbGljZSwgY2FzdEJ5QWN0aW9uVHlwZX0gZnJvbSAnQHdmaC9yZWR1eC10b29sa2l0LW9ic2VydmFibGUvZGlzdC90aW55LXJlZHV4LXRvb2xraXQnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuXG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbi8vIGltcG9ydCBpbnNwZWN0b3IgZnJvbSAnaW5zcGVjdG9yJztcbi8vIGltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgeyBjcmVhdGVQcm94eU1pZGRsZXdhcmUgYXMgcHJveHksIE9wdGlvbnMgYXMgUHJveHlPcHRpb25zfSBmcm9tICdodHRwLXByb3h5LW1pZGRsZXdhcmUnO1xuXG4vLyBpbnNwZWN0b3Iub3Blbig5MjIyLCAnbG9jYWxob3N0JywgdHJ1ZSk7XG5jb25zdCBsb2dUaW1lID0gbG9nZ2VyLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUgKyAnLnRpbWVzdGFtcCcpO1xuXG4vKipcbiAqIE1pZGRsZXdhcmUgZm9yIHByaW50aW5nIGVhY2ggcmVzcG9uc2UgcHJvY2VzcyBkdXJhdGlvbiB0aW1lIHRvIGxvZ1xuICogQHBhcmFtIHJlcSBcbiAqIEBwYXJhbSByZXMgXG4gKiBAcGFyYW0gbmV4dCBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVJlc3BvbnNlVGltZXN0YW1wKHJlcTogUmVxdWVzdCwgcmVzOiBSZXNwb25zZSwgbmV4dDogTmV4dEZ1bmN0aW9uKSB7XG4gIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZSgpO1xuICBjb25zdCBzdGFydFRpbWUgPSBkYXRlLmdldFRpbWUoKTtcblxuICBjb25zdCBlbmQgPSByZXMuZW5kO1xuXG4gIGZ1bmN0aW9uIHByaW50KCkge1xuICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgIGxvZ1RpbWUuaW5mbyhgcmVxdWVzdDogJHtyZXEubWV0aG9kfSAke3JlcS5vcmlnaW5hbFVybH0gfCBzdGF0dXM6ICR7cmVzLnN0YXR1c0NvZGV9LCBbcmVzcG9uc2UgZHVyYXRpb246ICR7bm93IC0gc3RhcnRUaW1lfW1zYCArXG4gICAgICBgXSAoc2luY2UgJHtkYXRlLnRvTG9jYWxlVGltZVN0cmluZygpfSAke3N0YXJ0VGltZX0pIFske3JlcS5oZWFkZXIoJ3VzZXItYWdlbnQnKSF9XWApO1xuICB9XG5cbiAgcmVzLmVuZCA9IGZ1bmN0aW9uKGNodW5rPzogYW55LCBlbmNvZGluZz86IHN0cmluZyB8ICgoKSA9PiB2b2lkKSwgY2I/OiAoKSA9PiB2b2lkKSB7XG4gICAgY29uc3QgYXJndiA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMCk7XG4gICAgY29uc3QgbGFzdEFyZyA9IGFyZ3VtZW50c1thcmd1bWVudHMubGVuZ3RoIC0gMV07XG4gICAgaWYgKHR5cGVvZiBsYXN0QXJnID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICBjb25zdCBvcmlnaW5DYiA9IGFyZ3VtZW50c1thcmd1bWVudHMubGVuZ3RoIC0gMV07XG4gICAgICBhcmd2W2FyZ3YubGVuZ3RoIC0gMV0gPSAoKSA9PiB7XG4gICAgICAgIG9yaWdpbkNiKCk7XG4gICAgICAgIHByaW50KCk7XG4gICAgICB9O1xuICAgIH0gZWxzZSBpZiAoYXJndi5sZW5ndGggPT09IDApIHtcbiAgICAgIGFyZ3YucHVzaChudWxsLCBwcmludCk7XG4gICAgfSBlbHNlIGlmIChhcmd2Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgYXJndi5wdXNoKHByaW50KTtcbiAgICB9XG4gICAgY29uc3QgcmV0ID0gZW5kLmFwcGx5KHJlcywgYXJndik7XG4gICAgcmV0dXJuIHJldDtcbiAgfTtcblxuICBuZXh0KCk7XG59XG5cbi8qKlxuICogVGhpcyBmdW5jdGlvbiB1c2VzIGh0dHAtcHJveHktbWlkZGxld2FyZSBpbnRlcm5hbGx5LlxuICogXG4gKiBCZSBhd2FyZSB3aXRoIGNvbW1hbmQgbGluZSBvcHRpb24gXCItLXZlcmJvc2VcIiwgb25jZSBlbmFibGUgXCJ2ZXJib3NlXCIsIHRoaXMgZnVuY3Rpb24gd2lsbFxuICogcmVhZCAocGlwZSkgcmVtb3RlIHNlcnZlciByZXNwb25zZSBib2R5IGludG8gYSBzdHJpbmcgYnVmZmVyIGZvciBhbnkgbWVzc2FnZSB3aXRoIGNvbnRlbnQtdHlwZSBpcyBcInRleHRcIiBvciBcImpzb25cIiBiYXNlZFxuICogQ3JlYXRlIGFuZCB1c2UgYW4gSFRUUCByZXF1ZXN0IHByb3h5IGZvciBzcGVjaWZpYyByZXF1ZXN0IHBhdGhcbiAqIEBwYXJhbSBwcm94eVBhdGggXG4gKiBAcGFyYW0gdGFyZ2V0VXJsIFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBIdHRwUHJveHkocHJveHlQYXRoOiBzdHJpbmcsIHRhcmdldFVybDogc3RyaW5nLFxuICBvcHRzOiB7XG4gICAgLyoqIEJ5cGFzcyBDT1JTIHJlc3RyaWN0IG9uIHRhcmdldCBzZXJ2ZXIsIGRlZmF1bHQgaXMgdHJ1ZSAqL1xuICAgIGRlbGV0ZU9yaWdpbj86IGJvb2xlYW47XG4gICAgcGF0aFJld3JpdGU/OiBQcm94eU9wdGlvbnNbJ3BhdGhSZXdyaXRlJ107XG4gICAgb25Qcm94eVJlcT86IFByb3h5T3B0aW9uc1snb25Qcm94eVJlcSddO1xuICAgIG9uUHJveHlSZXM/OiBQcm94eU9wdGlvbnNbJ29uUHJveHlSZXMnXTtcbiAgICBvbkVycm9yPzogUHJveHlPcHRpb25zWydvbkVycm9yJ107XG4gICAgYnVmZmVyPzogUHJveHlPcHRpb25zWydidWZmZXInXTtcbiAgICBzZWxmSGFuZGxlUmVzcG9uc2U/OiBQcm94eU9wdGlvbnNbJ3NlbGZIYW5kbGVSZXNwb25zZSddO1xuICAgIHByb3h5VGltZW91dD86IFByb3h5T3B0aW9uc1sncHJveHlUaW1lb3V0J107XG4gIH0gPSB7fSkge1xuXG4gIHByb3h5UGF0aCA9IF8udHJpbUVuZChwcm94eVBhdGgsICcvJyk7XG4gIHRhcmdldFVybCA9IF8udHJpbUVuZCh0YXJnZXRVcmwsICcvJyk7XG5cbiAgY29uc3QgZGVmYXVsdE9wdCA9IGRlZmF1bHRQcm94eU9wdGlvbnMocHJveHlQYXRoLCB0YXJnZXRVcmwpO1xuXG4gIGNvbnN0IHByb3h5TWlkT3B0OiBQcm94eU9wdGlvbnMgPSB7XG4gICAgLi4uZGVmYXVsdE9wdCxcbiAgICBvblByb3h5UmVxKC4uLmFyZ3MpIHtcbiAgICAgIGNvbnN0IG9yaWdIZWFkZXIgPSBhcmdzWzBdLmdldEhlYWRlcignT3JpZ2luJyk7XG4gICAgICBkZWZhdWx0T3B0Lm9uUHJveHlSZXEoLi4uYXJncyk7XG5cbiAgICAgIGlmIChvcHRzLmRlbGV0ZU9yaWdpbiA9PT0gZmFsc2UpIHtcbiAgICAgICAgLy8gUmVjb3ZlciByZW1vdmVkIGhlYWRlciBcIk9yaWdpblwiXG4gICAgICAgIGFyZ3NbMF0uc2V0SGVhZGVyKCdPcmlnaW4nLCBvcmlnSGVhZGVyIGFzIHN0cmluZyk7XG4gICAgICB9XG4gICAgICBpZiAob3B0cy5vblByb3h5UmVxKVxuICAgICAgICBvcHRzLm9uUHJveHlSZXEoLi4uYXJncyk7XG4gICAgfSxcbiAgICBvblByb3h5UmVzKC4uLmFyZ3MpIHtcbiAgICAgIGlmIChvcHRzLm9uUHJveHlSZXMpXG4gICAgICAgIG9wdHMub25Qcm94eVJlcyguLi5hcmdzKTtcbiAgICAgIGRlZmF1bHRPcHQub25Qcm94eVJlcyguLi5hcmdzKTtcbiAgICB9LFxuICAgIG9uRXJyb3IoLi4uYXJncykge1xuICAgICAgZGVmYXVsdE9wdC5vbkVycm9yKC4uLmFyZ3MpO1xuICAgICAgaWYgKG9wdHMub25FcnJvcilcbiAgICAgICAgb3B0cy5vbkVycm9yKC4uLmFyZ3MpO1xuICAgIH1cbiAgfTtcblxuXG4gIGFwaS5leHByZXNzQXBwU2V0KGFwcCA9PiB7XG4gICAgYXBwLnVzZShwcm94eVBhdGgsIHByb3h5KHByb3h5TWlkT3B0KSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBkZWZhdWx0UHJveHlPcHRpb25zKHByb3h5UGF0aDogc3RyaW5nLCB0YXJnZXRVcmw6IHN0cmluZykge1xuICBwcm94eVBhdGggPSBfLnRyaW1FbmQocHJveHlQYXRoLCAnLycpO1xuICB0YXJnZXRVcmwgPSBfLnRyaW1FbmQodGFyZ2V0VXJsLCAnLycpO1xuICBjb25zdCB7IHByb3RvY29sLCBob3N0LCBwYXRobmFtZSB9ID0gbmV3IFVSTCh0YXJnZXRVcmwpO1xuXG4gIGNvbnN0IHBhdFBhdGggPSBuZXcgUmVnRXhwKCdeJyArIF8uZXNjYXBlUmVnRXhwKHByb3h5UGF0aCkgKyAnKC98JCknKTtcbiAgY29uc3QgaHBtTG9nID0gbG9nZ2VyLmdldExvZ2dlcignSFBNLicgKyBwcm94eVBhdGgpO1xuXG4gIGNvbnN0IHByb3h5TWlkT3B0OiBQcm94eU9wdGlvbnMgJiAge1tLIGluICdwYXRoUmV3cml0ZScgfCAnb25Qcm94eVJlcScgfCAnb25Qcm94eVJlcycgfCAnb25FcnJvciddOiBOb25OdWxsYWJsZTxQcm94eU9wdGlvbnNbS10+fSA9IHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbWF4LWxlblxuICAgIHRhcmdldDogcHJvdG9jb2wgKyAnLy8nICsgaG9zdCxcbiAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgd3M6IGZhbHNlLFxuICAgIHNlY3VyZTogZmFsc2UsXG4gICAgY29va2llRG9tYWluUmV3cml0ZTogeyAnKic6ICcnIH0sXG4gICAgcGF0aFJld3JpdGU6IChwYXRoLCByZXEpID0+IHtcbiAgICAgIC8vIGhwbUxvZy53YXJuKCdwYXRQYXRoPScsIHBhdFBhdGgsICdwYXRoPScsIHBhdGgpO1xuICAgICAgY29uc3QgcmV0ID0gcGF0aCAmJiBwYXRoLnJlcGxhY2UocGF0UGF0aCwgXy50cmltRW5kKHBhdGhuYW1lLCAnLycpICsgJy8nKTtcbiAgICAgIC8vIGhwbUxvZy5pbmZvKGBwcm94eSB0byBwYXRoOiAke3JlcS5tZXRob2R9ICR7cHJvdG9jb2wgKyAnLy8nICsgaG9zdH0ke3JldH0sIHJlcS51cmwgPSAke3JlcS51cmx9YCk7XG4gICAgICByZXR1cm4gcmV0O1xuICAgIH0sXG4gICAgbG9nTGV2ZWw6ICdkZWJ1ZycsXG4gICAgbG9nUHJvdmlkZXI6IHByb3ZpZGVyID0+IGhwbUxvZyxcbiAgICBwcm94eVRpbWVvdXQ6IDEwMDAwLFxuICAgIG9uUHJveHlSZXEocHJveHlSZXEsIHJlcSwgcmVzLCAuLi5yZXN0KSB7XG4gICAgICAvLyBpZiAob3B0cy5kZWxldGVPcmlnaW4pXG4gICAgICBwcm94eVJlcS5yZW1vdmVIZWFkZXIoJ09yaWdpbicpOyAvLyBCeXBhc3MgQ09SUyByZXN0cmljdCBvbiB0YXJnZXQgc2VydmVyXG4gICAgICBjb25zdCByZWZlcmVyID0gcHJveHlSZXEuZ2V0SGVhZGVyKCdyZWZlcmVyJyk7XG4gICAgICBpZiAocmVmZXJlcikge1xuICAgICAgICBwcm94eVJlcS5zZXRIZWFkZXIoJ3JlZmVyZXInLCBgJHtwcm90b2NvbH0vLyR7aG9zdH0ke25ldyBVUkwocmVmZXJlciBhcyBzdHJpbmcpLnBhdGhuYW1lfWApO1xuICAgICAgfVxuICAgICAgaHBtTG9nLmluZm8oYFByb3h5IHJlcXVlc3QgdG8gJHtwcm90b2NvbH0vLyR7aG9zdH0ke3Byb3h5UmVxLnBhdGh9IG1ldGhvZDogJHtyZXEubWV0aG9kIHx8ICd1a25vd24nfSwgJHtKU09OLnN0cmluZ2lmeShwcm94eVJlcS5nZXRIZWFkZXJzKCksIG51bGwsICcgICcpfWApO1xuICAgIH0sXG4gICAgb25Qcm94eVJlcyhpbmNvbWluZywgcmVxLCByZXMpIHtcbiAgICAgIGluY29taW5nLmhlYWRlcnNbJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbiddID0gJyonO1xuICAgICAgaWYgKGFwaS5jb25maWcoKS5kZXZNb2RlKSB7XG4gICAgICAgIGhwbUxvZy5pbmZvKGBQcm94eSByZWNpZXZlICR7cmVxLnVybCB8fCAnJ30sIHN0YXR1czogJHtpbmNvbWluZy5zdGF0dXNDb2RlIX1cXG5gLFxuICAgICAgICAgIEpTT04uc3RyaW5naWZ5KGluY29taW5nLmhlYWRlcnMsIG51bGwsICcgICcpKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGhwbUxvZy5pbmZvKGBQcm94eSByZWNpZXZlICR7cmVxLnVybCB8fCAnJ30sIHN0YXR1czogJHtpbmNvbWluZy5zdGF0dXNDb2RlIX1gKTtcbiAgICAgIH1cbiAgICAgIGlmIChhcGkuY29uZmlnKCkuZGV2TW9kZSB8fCBjb25maWcoKS5jbGlPcHRpb25zPy52ZXJib3NlKSB7XG5cbiAgICAgICAgY29uc3QgY3QgPSBpbmNvbWluZy5oZWFkZXJzWydjb250ZW50LXR5cGUnXTtcbiAgICAgICAgaHBtTG9nLmluZm8oYFJlc3BvbnNlICR7cmVxLnVybCB8fCAnJ30gaGVhZGVyczpcXG5gLCBpbmNvbWluZy5oZWFkZXJzKTtcbiAgICAgICAgY29uc3QgaXNUZXh0ID0gKGN0ICYmIC9cXGIoanNvbnx0ZXh0KVxcYi9pLnRlc3QoY3QpKTtcbiAgICAgICAgaWYgKGlzVGV4dCkge1xuICAgICAgICAgIGlmICghaW5jb21pbmcuY29tcGxldGUpIHtcbiAgICAgICAgICAgIGNvbnN0IGJ1ZnMgPSBbXSBhcyBzdHJpbmdbXTtcbiAgICAgICAgICAgIHZvaWQgcmVhZENvbXByZXNzZWRSZXNwb25zZShpbmNvbWluZywgbmV3IHN0cmVhbS5Xcml0YWJsZSh7XG4gICAgICAgICAgICAgIHdyaXRlKGNodW5rOiBCdWZmZXIgfCBzdHJpbmcsIGVuYywgY2IpIHtcbiAgICAgICAgICAgICAgICBidWZzLnB1c2goQnVmZmVyLmlzQnVmZmVyKGNodW5rKSA/IGNodW5rLnRvU3RyaW5nKCkgOiBjaHVuayk7XG4gICAgICAgICAgICAgICAgY2IoKTtcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgZmluYWwoY2IpIHtcbiAgICAgICAgICAgICAgICBocG1Mb2cuaW5mbyhgUmVzcG9uc2UgJHtyZXEudXJsIHx8ICcnfSB0ZXh0IGJvZHk6XFxuYCwgYnVmcy5qb2luKCcnKSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKChpbmNvbWluZyBhcyB7Ym9keT86IEJ1ZmZlciB8IHN0cmluZ30pLmJvZHkpIHtcbiAgICAgICAgICAgIGhwbUxvZy5pbmZvKGBSZXNwb25zZSAke3JlcS51cmwgfHwgJyd9IHRleHQgYm9keTpcXG5gLCAoaW5jb21pbmcgYXMge2JvZHk/OiBCdWZmZXIgfCBzdHJpbmd9KS50b1N0cmluZygpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9LFxuICAgIG9uRXJyb3IoZXJyLCByZXEsIHJlcykge1xuICAgICAgaHBtTG9nLndhcm4oZXJyKTtcbiAgICB9XG4gIH07XG4gIHJldHVybiBwcm94eU1pZE9wdDtcbn1cblxudHlwZSBQcm94eUNhY2hlU3RhdGUgPSB7XG4gIGNhY2hlRGlyOiBzdHJpbmc7XG4gIGNhY2hlQnlVcmk6IE1hcDxzdHJpbmcsIHtcbiAgICAvKiogbG9hZGluZyBmcm9tIHN0b3JhZ2UgKi9cbiAgICBsb2FkaW5nOiBib29sZWFuO1xuICAgIC8qKiBzYXZpbmcgdG8gc3RvcmFnZSAqL1xuICAgIHNhdmluZzogYm9vbGVhbjtcbiAgICAvKiogaW1tdXRhYmxlIGNhY2hlZCBidWZmZXIgKi9cbiAgICBkYXRhPzoge1xuICAgICAgaGVhZGVyczogW3N0cmluZywgc3RyaW5nXVtdO1xuICAgICAgYm9keTogQnVmZmVyO1xuICAgIH07XG4gIH0+O1xuICBlcnJvcj86IEVycm9yO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVByb3h5V2l0aENhY2hlKHByb3h5UGF0aDogc3RyaW5nLCBjYWNoZVJvb3REaXI6IHN0cmluZykge1xuICBjb25zdCBpbml0aWFsU3RhdGU6IFByb3h5Q2FjaGVTdGF0ZSA9IHtcbiAgICBjYWNoZURpcjogY2FjaGVSb290RGlyLFxuICAgIGNhY2hlQnlVcmk6IG5ldyBNYXAoKVxuICB9O1xuICBjb25zdCBzbGljZSA9IGNyZWF0ZVNsaWNlKHtcbiAgICBpbml0aWFsU3RhdGUsXG4gICAgbmFtZTogcHJveHlQYXRoLFxuICAgIHJlZHVjZXJzOiB7XG4gICAgICBnZXRDYWNoZWQoczogUHJveHlDYWNoZVN0YXRlLCB7bWV0aG9kLCB1cml9OiB7bWV0aG9kOiBzdHJpbmc7IHVyaTogc3RyaW5nfSkge30sXG4gICAgICBfbG9hZENhY2hlKHM6IFByb3h5Q2FjaGVTdGF0ZSwga2V5OiBzdHJpbmcpIHtcbiAgICAgICAgcy5jYWNoZUJ5VXJpLnNldChrZXksIHtsb2FkaW5nOiB0cnVlLCBzYXZpbmc6IGZhbHNlfSk7XG4gICAgICB9LFxuICAgICAgX2NhY2hlTG9hZGVkKHM6IFByb3h5Q2FjaGVTdGF0ZSwgcGF5bG9hZDoge2tleTogc3RyaW5nOyBoZWFkZXJzOiBbc3RyaW5nLCBzdHJpbmddW107IGJvZHk6IEJ1ZmZlcn0pIHtcbiAgICAgICAgcy5jYWNoZUJ5VXJpLnNldChwYXlsb2FkLmtleSwge2xvYWRpbmc6IGZhbHNlLCBzYXZpbmc6IGZhbHNlLCBkYXRhOiB7XG4gICAgICAgICAgaGVhZGVyczogcGF5bG9hZC5oZWFkZXJzLFxuICAgICAgICAgIGJvZHk6IHBheWxvYWQuYm9keVxuICAgICAgICB9fSk7XG4gICAgICB9LFxuICAgICAgLy8gX3NhdmVDYWNoZShzOiBQcm94eUNhY2hlU3RhdGUsIHBheWxvYWQ6IHtrZXk6IHN0cmluZzsgYnVmZmVyOiBCdWZmZXJ9KSB7fSxcbiAgICAgIF9kb25lQ2FjaGUoczogUHJveHlDYWNoZVN0YXRlLCBrZXk6IHN0cmluZykge31cbiAgICB9XG4gIH0pO1xuXG4gIHNsaWNlLmFkZEVwaWMoc2xpY2UgPT4gYWN0aW9uJCA9PiB7XG4gICAgY29uc3QgYWN0aW9ucyA9IGNhc3RCeUFjdGlvblR5cGUoc2xpY2UuYWN0aW9ucywgYWN0aW9uJCk7XG4gICAgLy8gY29uc3QgbG9hZEFjdGlvbkJ5S2V5OiBNYXA8c3RyaW5nLCByeC5PYnNlcnZhYmxlPHN0cmluZz4+O1xuICAgIC8vIGNvbnN0IHNhdmVBY3Rpb25CeUtleTogTWFwPHN0cmluZywgcnguT2JzZXJ2YWJsZTxzdHJpbmc+PjtcblxuICAgIHJldHVybiByeC5tZXJnZShcbiAgICAgIGFjdGlvbnMuZ2V0Q2FjaGVkLnBpcGUoXG4gICAgICAgIG9wLm1lcmdlTWFwKGFzeW5jICh7cGF5bG9hZH0pID0+IHtcbiAgICAgICAgICBjb25zdCBrZXkgPSBrZXlPZlVyaShwYXlsb2FkKTtcbiAgICAgICAgICBjb25zdCBpdGVtID0gc2xpY2UuZ2V0U3RhdGUoKS5jYWNoZUJ5VXJpLmdldChrZXkpO1xuXG4gICAgICAgICAgaWYgKGl0ZW0gPT0gbnVsbCkge1xuICAgICAgICAgICAgc2xpY2UuYWN0aW9uRGlzcGF0Y2hlci5fbG9hZENhY2hlKGtleSk7XG4gICAgICAgICAgICBjb25zdCBjRmlsZSA9IFBhdGgucmVzb2x2ZShzbGljZS5nZXRTdGF0ZSgpLmNhY2hlRGlyLCBrZXksICdoZWFkZXIuanNvbicpO1xuICAgICAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoY0ZpbGUpKSB7XG4gICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLmFsbChbXG4gICAgICAgICAgICAgICAgZnMucHJvbWlzZXMucmVhZEZpbGUoY0ZpbGUsICd1dGYtOCcpLFxuICAgICAgICAgICAgICAgIGZzLnByb21pc2VzLnJlYWRGaWxlKFBhdGgucmVzb2x2ZShzbGljZS5nZXRTdGF0ZSgpLmNhY2hlRGlyLCBrZXksICdib2R5JykpXG4gICAgICAgICAgICAgIF0pLnRoZW4oKFtoZWFkZXJzLCBib2R5XSkgPT4ge1xuICAgICAgICAgICAgICAgIHNsaWNlLmFjdGlvbkRpc3BhdGNoZXIuX2NhY2hlTG9hZGVkKHtrZXksIGhlYWRlcnM6IEpTT04ucGFyc2UoaGVhZGVycykgYXMgW3N0cmluZywgc3RyaW5nXVtdLCBib2R5fSk7XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgYXdhaXQgZnMubWtkaXJwKFBhdGgucmVzb2x2ZShzbGljZS5nZXRTdGF0ZSgpLmNhY2hlRGlyLCBrZXkpKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICApXG4gICAgKS5waXBlKFxuICAgICAgb3AuaWdub3JlRWxlbWVudHMoKVxuICAgICk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBrZXlPZlVyaSh7bWV0aG9kLCB1cml9OiB7bWV0aG9kOiBzdHJpbmc7IHVyaTogc3RyaW5nfSkge1xuICBjb25zdCB1cmwgPSBuZXcgVVJMKG1ldGhvZCArICc6LycgKyB1cmkpO1xuICBjb25zdCBrZXkgPSBtZXRob2QgKyAnLycgKyB1cmwucGF0aG5hbWUgKyAodXJsLnNlYXJjaCA/ICcvJyArIF8udHJpbVN0YXJ0KHVybC5zZWFyY2gsICc/JykgOiAnJyk7XG4gIHJldHVybiBrZXk7XG59XG4iXX0=