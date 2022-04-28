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
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const stream_1 = require("stream");
const fs_1 = __importDefault(require("fs"));
const zlib_1 = __importDefault(require("zlib"));
const plink_1 = require("@wfh/plink");
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const _ = __importStar(require("lodash"));
const proxy_agent_1 = __importDefault(require("proxy-agent"));
const tiny_redux_toolkit_1 = require("@wfh/redux-toolkit-observable/dist/tiny-redux-toolkit");
const chalk_1 = __importDefault(require("chalk"));
const cache_service_1 = require("./cache-service");
// import insp from 'inspector';
// insp.open(9222, '0.0.0.0', true);
const isWin = os_1.default.platform().indexOf('win32') >= 0;
const log = (0, plink_1.log4File)(__filename);
function createNpmRegistryServer(api) {
    var _a;
    const setting = (0, plink_1.config)()['@wfh/assets-processer'].npmRegistryCacheServer;
    if (setting == null)
        return;
    const DEFAULT_HOST = setting.host || (`http://localhost${(0, plink_1.config)().port !== 80 ? ':' + (0, plink_1.config)().port : ''}`);
    const STATE_FILE = path_1.default.resolve(setting.cacheDir || plink_1.config.resolve('destDir'), 'npm-registry-cache.json');
    const servePath = path_1.default.posix.join(setting.path || '/registry', 'versions');
    const envVarDesc = `${isWin ? 'set' : 'export'} npm_config_registry=http://${(0, plink_1.config)().localIP}:${(0, plink_1.config)().port}${servePath}`;
    log.info('NPM registry cache is serving at ', servePath, '\n' +
        `You can set environment variable: ${chalk_1.default.cyan(envVarDesc)}`);
    const versionsCacheCtl = (0, cache_service_1.createProxyWithCache)(servePath, {
        selfHandleResponse: true,
        target: setting.registry || 'https://registry.npmjs.org',
        agent: setting.proxy ? new proxy_agent_1.default(setting.proxy) : undefined
    }, path_1.default.posix.join(setting.cacheDir || plink_1.config.resolve('destDir'), 'versions'));
    const tarballDir = path_1.default.resolve(setting.cacheDir || plink_1.config.resolve('destDir'), 'download-tarballs');
    const pkgDownloadRouter = api.express.Router();
    const serveTarballPath = path_1.default.posix.join(setting.path || '/registry', '_tarballs');
    api.expressAppSet(app => app.use(serveTarballPath, pkgDownloadRouter));
    pkgDownloadRouter.get('/:pkgName/:version', (req, res) => {
        pkgDownloadCtl.actionDispatcher.fetchTarball({
            req, res, pkgName: req.params.pkgName, version: req.params.version
        });
    });
    const pkgDownloadCtl = (0, tiny_redux_toolkit_1.createSlice)({
        name: 'pkgCache',
        initialState: {},
        reducers: {
            load(s, data) {
                Object.assign(s, data);
            },
            add(s, payload) {
                let pkgEntry = s[payload.pkgName];
                if (pkgEntry == null)
                    s[payload.pkgName] = payload.versions;
                else
                    s[payload.pkgName] = Object.assign(Object.assign({}, pkgEntry), payload.versions);
            },
            fetchTarball(_s, _payload) {
            }
        },
        debugActionOnly: !!((_a = (0, plink_1.config)().cliOptions) === null || _a === void 0 ? void 0 : _a.verbose)
    });
    pkgDownloadCtl.epic(action$ => {
        const actionByType = (0, tiny_redux_toolkit_1.castByActionType)(pkgDownloadCtl.actions, action$);
        // const fetchActionState = new Map<string, Response[]>();
        // map key is host name of remote tarball server
        // const cacheSvcByOrigin = new Map<string, ReturnType<typeof createProxyWithCache>>();
        const tarballCacheSerivce = (0, cache_service_1.createProxyWithCache)('', { followRedirects: true, selfHandleResponse: true }, tarballDir);
        if (fs_1.default.existsSync(STATE_FILE)) {
            void fs_1.default.promises.readFile(STATE_FILE, 'utf-8')
                .then(content => {
                log.info('Read cache state file:', STATE_FILE);
                pkgDownloadCtl.actionDispatcher.load(JSON.parse(content));
            });
        }
        return rx.merge(actionByType.fetchTarball.pipe(op.mergeMap(({ payload }) => {
            return pkgDownloadCtl.getStore().pipe(op.map(s => _.get(s, [payload.pkgName, payload.version])), op.distinctUntilChanged(), op.filter(value => value != null), op.take(1), op.map(url => {
                log.info('incoming request download', url);
                try {
                    tarballCacheSerivce.actionDispatcher.hitCache({
                        key: url.replace(/^https?:\//g, ''),
                        req: payload.req, res: payload.res,
                        next: () => { },
                        target: url
                    });
                }
                catch (e) {
                    log.error('Failed for download URL:' + url, e);
                    throw e;
                }
            }));
        }))).pipe(op.ignoreElements(), op.catchError((err, src) => {
            log.error(err);
            return src; // re-subsribe on fail
        }));
    });
    versionsCacheCtl.actionDispatcher.configTransformer({
        remote: createTransformer(true),
        cached: createTransformer(false)
    });
    function createTransformer(trackRemoteUrl) {
        return async (headers, reqHost, source) => {
            let fragments = '';
            let bufLength = 0;
            const subject = new rx.ReplaySubject();
            let decompress;
            let compresser;
            const encodingHeader = headers.find(([name]) => name === 'content-encoding');
            const contentEncoding = encodingHeader ? encodingHeader[1] : '';
            switch (contentEncoding) {
                case 'br':
                    decompress = zlib_1.default.createBrotliDecompress();
                    compresser = zlib_1.default.createBrotliCompress();
                    break;
                // Or, just use zlib.createUnzip() to handle both of the following cases:
                case 'gzip':
                    decompress = zlib_1.default.createGunzip();
                    compresser = zlib_1.default.createGzip();
                    break;
                case 'deflate':
                    decompress = zlib_1.default.createInflate();
                    compresser = zlib_1.default.createDeflate();
                    break;
                default:
            }
            const transformers = decompress ? [decompress] : [];
            const processTrans = new stream_1.Transform({
                transform(chunk, _encode, cb) {
                    if (Buffer.isBuffer(chunk)) {
                        fragments += chunk.toString();
                    }
                    else {
                        fragments += chunk;
                    }
                    cb();
                },
                flush(cb) {
                    if (fragments.length === 0) {
                        return cb(null, '');
                    }
                    try {
                        const json = JSON.parse(fragments);
                        const param = {};
                        if (json.versions) {
                            for (const [ver, versionEntry] of Object.entries(json.versions)) {
                                const origTarballUrl = param[ver] = versionEntry.dist.tarball;
                                const urlObj = new URL(origTarballUrl);
                                const url = versionEntry.dist.tarball = (reqHost || DEFAULT_HOST) +
                                    `${serveTarballPath}/${encodeURIComponent(json.name)}/${encodeURIComponent(ver)}${urlObj.search}`;
                                if (!url.startsWith('http'))
                                    versionEntry.dist.tarball = 'http://' + url;
                            }
                            if (trackRemoteUrl)
                                pkgDownloadCtl.actionDispatcher.add({ pkgName: json.name, versions: param });
                            cb(null, JSON.stringify(json));
                        }
                        else {
                            log.info('Skip transform', fragments);
                            cb(null, fragments);
                        }
                    }
                    catch (e) {
                        log.error(fragments, e);
                        return cb(null, '');
                    }
                }
            });
            transformers.push(processTrans);
            if (compresser)
                transformers.push(compresser);
            transformers.push(new stream_1.Writable({
                write(chunk_1, _enc, cb_2) {
                    const buffer = Buffer.isBuffer(chunk_1) ? chunk_1 : Buffer.from(chunk_1);
                    bufLength += buffer.length;
                    subject.next(buffer);
                    cb_2();
                },
                final(cb_3) {
                    subject.complete();
                    cb_3();
                }
            }));
            // NodeJS bug: https://github.com/nodejs/node/issues/40191:
            // stream.promises.pipeline doesn't support arrays of streams since node 16.10
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
            const done = stream_1.promises.pipeline(source, ...transformers);
            await done;
            return {
                length: bufLength,
                readable: () => new stream_1.Readable({
                    read() {
                        // eslint-disable-next-line @typescript-eslint/no-this-alias
                        const self = this;
                        subject.subscribe({
                            next(buf) {
                                self.push(buf);
                            },
                            error(err) {
                                self.destroy(err);
                            },
                            complete() {
                                self.push(null);
                            }
                        });
                    }
                })
            };
        };
    }
    return () => {
        log.info('Save changed', STATE_FILE);
        return fs_1.default.promises.writeFile(STATE_FILE, JSON.stringify(pkgDownloadCtl.getState(), null, '  '));
    };
}
exports.default = createNpmRegistryServer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnBtLXJlZ2lzdHJ5LWNhY2hlLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJucG0tcmVnaXN0cnktY2FjaGUtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsZ0RBQXdCO0FBQ3hCLDRDQUFvQjtBQUNwQixtQ0FBNkU7QUFDN0UsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QixzQ0FBOEQ7QUFDOUQseUNBQTJCO0FBQzNCLG1EQUFxQztBQUNyQywwQ0FBNEI7QUFFNUIsOERBQXFDO0FBQ3JDLDhGQUFvRztBQUNwRyxrREFBMEI7QUFFMUIsbURBQXFEO0FBQ3JELGdDQUFnQztBQUNoQyxvQ0FBb0M7QUFDcEMsTUFBTSxLQUFLLEdBQUcsWUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDbEQsTUFBTSxHQUFHLEdBQUcsSUFBQSxnQkFBUSxFQUFDLFVBQVUsQ0FBQyxDQUFDO0FBT2pDLFNBQXdCLHVCQUF1QixDQUFDLEdBQXFCOztJQUNuRSxNQUFNLE9BQU8sR0FBRyxJQUFBLGNBQU0sR0FBRSxDQUFDLHVCQUF1QixDQUFDLENBQUMsc0JBQXNCLENBQUM7SUFDekUsSUFBSSxPQUFPLElBQUksSUFBSTtRQUNqQixPQUFPO0lBQ1QsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLElBQUksSUFBSSxDQUFDLG1CQUFtQixJQUFBLGNBQU0sR0FBRSxDQUFDLElBQUksS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxJQUFBLGNBQU0sR0FBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztJQUM1RyxNQUFNLFVBQVUsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLElBQUksY0FBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSx5QkFB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Q0FBQztRQUNKLENBQUMsQ0FBQztJQUNKLENBQUM7SUFFRCxPQUFPLEdBQUcsRUFBRTtRQUNWLEdBQUcsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBQ3JDLE9BQU8sWUFBRSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ2xHLENBQUMsQ0FBQztBQUNKLENBQUM7QUFqT0QsMENBaU9DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgb3MgZnJvbSAnb3MnO1xuaW1wb3J0IHtUcmFuc2Zvcm0sIFdyaXRhYmxlLCBSZWFkYWJsZSwgcHJvbWlzZXMgYXMgc3RyZWFtUHJvbX0gZnJvbSAnc3RyZWFtJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgemxpYiBmcm9tICd6bGliJztcbmltcG9ydCB7Y29uZmlnLCBsb2c0RmlsZSwgRXh0ZW5zaW9uQ29udGV4dH0gZnJvbSAnQHdmaC9wbGluayc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7UmVxdWVzdCwgUmVzcG9uc2V9IGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IFByb3h5QWdlbnQgZnJvbSAncHJveHktYWdlbnQnO1xuaW1wb3J0IHtjcmVhdGVTbGljZSwgY2FzdEJ5QWN0aW9uVHlwZX0gZnJvbSAnQHdmaC9yZWR1eC10b29sa2l0LW9ic2VydmFibGUvZGlzdC90aW55LXJlZHV4LXRvb2xraXQnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7Q2FjaGVEYXRhLCBOcG1SZWdpc3RyeVZlcnNpb25Kc29uLCBUYXJiYWxsc0luZm8sIFRyYW5zZm9ybWVyfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7Y3JlYXRlUHJveHlXaXRoQ2FjaGV9IGZyb20gJy4vY2FjaGUtc2VydmljZSc7XG4vLyBpbXBvcnQgaW5zcCBmcm9tICdpbnNwZWN0b3InO1xuLy8gaW5zcC5vcGVuKDkyMjIsICcwLjAuMC4wJywgdHJ1ZSk7XG5jb25zdCBpc1dpbiA9IG9zLnBsYXRmb3JtKCkuaW5kZXhPZignd2luMzInKSA+PSAwO1xuY29uc3QgbG9nID0gbG9nNEZpbGUoX19maWxlbmFtZSk7XG5cbnR5cGUgUGtnRG93bmxvYWRSZXF1ZXN0UGFyYW1zID0ge1xuICBwa2dOYW1lOiBzdHJpbmc7XG4gIHZlcnNpb246IHN0cmluZztcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNyZWF0ZU5wbVJlZ2lzdHJ5U2VydmVyKGFwaTogRXh0ZW5zaW9uQ29udGV4dCkge1xuICBjb25zdCBzZXR0aW5nID0gY29uZmlnKClbJ0B3ZmgvYXNzZXRzLXByb2Nlc3NlciddLm5wbVJlZ2lzdHJ5Q2FjaGVTZXJ2ZXI7XG4gIGlmIChzZXR0aW5nID09IG51bGwpXG4gICAgcmV0dXJuO1xuICBjb25zdCBERUZBVUxUX0hPU1QgPSBzZXR0aW5nLmhvc3QgfHwgKGBodHRwOi8vbG9jYWxob3N0JHtjb25maWcoKS5wb3J0ICE9PSA4MCA/ICc6JyArIGNvbmZpZygpLnBvcnQgOiAnJ31gKTtcbiAgY29uc3QgU1RBVEVfRklMRSA9IFBhdGgucmVzb2x2ZShzZXR0aW5nLmNhY2hlRGlyIHx8IGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJyksICducG0tcmVnaXN0cnktY2FjaGUuanNvbicpO1xuXG4gIGNvbnN0IHNlcnZlUGF0aCA9IFBhdGgucG9zaXguam9pbihzZXR0aW5nLnBhdGggfHwgJy9yZWdpc3RyeScsICd2ZXJzaW9ucycpO1xuICBjb25zdCBlbnZWYXJEZXNjID0gYCR7aXNXaW4gPyAnc2V0JyA6ICdleHBvcnQnfSBucG1fY29uZmlnX3JlZ2lzdHJ5PWh0dHA6Ly8ke2NvbmZpZygpLmxvY2FsSVB9OiR7Y29uZmlnKCkucG9ydH0ke3NlcnZlUGF0aH1gO1xuICBsb2cuaW5mbygnTlBNIHJlZ2lzdHJ5IGNhY2hlIGlzIHNlcnZpbmcgYXQgJywgc2VydmVQYXRoLCAnXFxuJyArXG4gICAgYFlvdSBjYW4gc2V0IGVudmlyb25tZW50IHZhcmlhYmxlOiAke2NoYWxrLmN5YW4oZW52VmFyRGVzYyl9YCk7XG5cbiAgY29uc3QgdmVyc2lvbnNDYWNoZUN0bCA9IGNyZWF0ZVByb3h5V2l0aENhY2hlKHNlcnZlUGF0aCwge1xuICAgICAgc2VsZkhhbmRsZVJlc3BvbnNlOiB0cnVlLFxuICAgICAgdGFyZ2V0OiBzZXR0aW5nLnJlZ2lzdHJ5IHx8ICdodHRwczovL3JlZ2lzdHJ5Lm5wbWpzLm9yZycsXG4gICAgICBhZ2VudDogc2V0dGluZy5wcm94eSA/IG5ldyBQcm94eUFnZW50KHNldHRpbmcucHJveHkpIDogdW5kZWZpbmVkXG4gICAgfSxcbiAgICBQYXRoLnBvc2l4LmpvaW4oc2V0dGluZy5jYWNoZURpciB8fCBjb25maWcucmVzb2x2ZSgnZGVzdERpcicpLCAndmVyc2lvbnMnKVxuICApO1xuXG4gIGNvbnN0IHRhcmJhbGxEaXIgPSBQYXRoLnJlc29sdmUoc2V0dGluZy5jYWNoZURpciB8fCBjb25maWcucmVzb2x2ZSgnZGVzdERpcicpLCAnZG93bmxvYWQtdGFyYmFsbHMnKTtcbiAgY29uc3QgcGtnRG93bmxvYWRSb3V0ZXIgPSBhcGkuZXhwcmVzcy5Sb3V0ZXIoKTtcbiAgY29uc3Qgc2VydmVUYXJiYWxsUGF0aCA9IFBhdGgucG9zaXguam9pbihzZXR0aW5nLnBhdGggfHwgJy9yZWdpc3RyeScsICdfdGFyYmFsbHMnKTtcblxuICBhcGkuZXhwcmVzc0FwcFNldChhcHAgPT4gYXBwLnVzZShzZXJ2ZVRhcmJhbGxQYXRoLCBwa2dEb3dubG9hZFJvdXRlcikpO1xuXG4gIHBrZ0Rvd25sb2FkUm91dGVyLmdldDxQa2dEb3dubG9hZFJlcXVlc3RQYXJhbXM+KCcvOnBrZ05hbWUvOnZlcnNpb24nLCAocmVxLCByZXMpID0+IHtcbiAgICBwa2dEb3dubG9hZEN0bC5hY3Rpb25EaXNwYXRjaGVyLmZldGNoVGFyYmFsbCh7XG4gICAgICByZXEsIHJlcywgcGtnTmFtZTogcmVxLnBhcmFtcy5wa2dOYW1lLCB2ZXJzaW9uOiByZXEucGFyYW1zLnZlcnNpb259KTtcbiAgfSk7XG5cbiAgY29uc3QgcGtnRG93bmxvYWRDdGwgPSBjcmVhdGVTbGljZSh7XG4gICAgbmFtZTogJ3BrZ0NhY2hlJyxcbiAgICBpbml0aWFsU3RhdGU6IHt9IGFzIFRhcmJhbGxzSW5mbyxcbiAgICByZWR1Y2Vyczoge1xuICAgICAgbG9hZChzOiBUYXJiYWxsc0luZm8sIGRhdGE6IFRhcmJhbGxzSW5mbykge1xuICAgICAgICBPYmplY3QuYXNzaWduKHMsIGRhdGEpO1xuICAgICAgfSxcbiAgICAgIGFkZChzOiBUYXJiYWxsc0luZm8sIHBheWxvYWQ6IHtwa2dOYW1lOiBzdHJpbmc7IHZlcnNpb25zOiB7W3ZlcnNpb246IHN0cmluZ106IHN0cmluZ319KSB7XG4gICAgICAgIGxldCBwa2dFbnRyeSA9IHNbcGF5bG9hZC5wa2dOYW1lXTtcbiAgICAgICAgaWYgKHBrZ0VudHJ5ID09IG51bGwpXG4gICAgICAgICAgc1twYXlsb2FkLnBrZ05hbWVdID0gcGF5bG9hZC52ZXJzaW9ucztcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHNbcGF5bG9hZC5wa2dOYW1lXSA9IHsuLi5wa2dFbnRyeSwgLi4ucGF5bG9hZC52ZXJzaW9uc307XG4gICAgICB9LFxuICAgICAgZmV0Y2hUYXJiYWxsKF9zOiBUYXJiYWxsc0luZm8sXG4gICAgICAgIF9wYXlsb2FkOiB7cmVxOiBSZXF1ZXN0PFBrZ0Rvd25sb2FkUmVxdWVzdFBhcmFtcz47IHJlczogUmVzcG9uc2U7IHBrZ05hbWU6IHN0cmluZzsgdmVyc2lvbjogc3RyaW5nfSkge1xuICAgICAgfVxuICAgIH0sXG4gICAgZGVidWdBY3Rpb25Pbmx5OiAhIWNvbmZpZygpLmNsaU9wdGlvbnM/LnZlcmJvc2VcbiAgfSk7XG5cbiAgcGtnRG93bmxvYWRDdGwuZXBpYyhhY3Rpb24kID0+IHtcbiAgICBjb25zdCBhY3Rpb25CeVR5cGUgPSBjYXN0QnlBY3Rpb25UeXBlKHBrZ0Rvd25sb2FkQ3RsLmFjdGlvbnMsIGFjdGlvbiQpO1xuICAgIC8vIGNvbnN0IGZldGNoQWN0aW9uU3RhdGUgPSBuZXcgTWFwPHN0cmluZywgUmVzcG9uc2VbXT4oKTtcbiAgICAvLyBtYXAga2V5IGlzIGhvc3QgbmFtZSBvZiByZW1vdGUgdGFyYmFsbCBzZXJ2ZXJcbiAgICAvLyBjb25zdCBjYWNoZVN2Y0J5T3JpZ2luID0gbmV3IE1hcDxzdHJpbmcsIFJldHVyblR5cGU8dHlwZW9mIGNyZWF0ZVByb3h5V2l0aENhY2hlPj4oKTtcbiAgICBjb25zdCB0YXJiYWxsQ2FjaGVTZXJpdmNlID0gY3JlYXRlUHJveHlXaXRoQ2FjaGUoJycsIHtmb2xsb3dSZWRpcmVjdHM6IHRydWUsIHNlbGZIYW5kbGVSZXNwb25zZTogdHJ1ZX0sXG4gICAgICB0YXJiYWxsRGlyKTtcblxuICAgIGlmIChmcy5leGlzdHNTeW5jKFNUQVRFX0ZJTEUpKSB7XG4gICAgICB2b2lkIGZzLnByb21pc2VzLnJlYWRGaWxlKFNUQVRFX0ZJTEUsICd1dGYtOCcpXG4gICAgICAudGhlbihjb250ZW50ID0+IHtcbiAgICAgICAgbG9nLmluZm8oJ1JlYWQgY2FjaGUgc3RhdGUgZmlsZTonLCBTVEFURV9GSUxFKTtcbiAgICAgICAgcGtnRG93bmxvYWRDdGwuYWN0aW9uRGlzcGF0Y2hlci5sb2FkKEpTT04ucGFyc2UoY29udGVudCkpO1xuICAgICAgfSk7XG4gICAgfVxuXG4gICAgcmV0dXJuIHJ4Lm1lcmdlKFxuICAgICAgIGFjdGlvbkJ5VHlwZS5mZXRjaFRhcmJhbGwucGlwZShcbiAgICAgICAgb3AubWVyZ2VNYXAoKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICAgIHJldHVybiBwa2dEb3dubG9hZEN0bC5nZXRTdG9yZSgpLnBpcGUoXG4gICAgICAgICAgICBvcC5tYXAocyA9PiBfLmdldChzLCBbcGF5bG9hZC5wa2dOYW1lLCBwYXlsb2FkLnZlcnNpb25dKSksXG4gICAgICAgICAgICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgICAgICAgb3AuZmlsdGVyKHZhbHVlID0+IHZhbHVlICE9IG51bGwpLFxuICAgICAgICAgICAgb3AudGFrZSgxKSxcbiAgICAgICAgICAgIG9wLm1hcCh1cmwgPT4ge1xuICAgICAgICAgICAgICBsb2cuaW5mbygnaW5jb21pbmcgcmVxdWVzdCBkb3dubG9hZCcsIHVybCk7XG4gICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgdGFyYmFsbENhY2hlU2VyaXZjZS5hY3Rpb25EaXNwYXRjaGVyLmhpdENhY2hlKHtcbiAgICAgICAgICAgICAgICAgIGtleTogdXJsLnJlcGxhY2UoL15odHRwcz86XFwvL2csICcnKSxcbiAgICAgICAgICAgICAgICAgIHJlcTogcGF5bG9hZC5yZXEsIHJlczogcGF5bG9hZC5yZXMsXG4gICAgICAgICAgICAgICAgICBuZXh0OiAoKSA9PiB7fSxcbiAgICAgICAgICAgICAgICAgIHRhcmdldDogdXJsXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBsb2cuZXJyb3IoJ0ZhaWxlZCBmb3IgZG93bmxvYWQgVVJMOicgKyB1cmwsIGUpO1xuICAgICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgKTtcbiAgICAgICAgfSlcbiAgICAgIClcbiAgICApLnBpcGUoXG4gICAgICBvcC5pZ25vcmVFbGVtZW50cygpLFxuICAgICAgb3AuY2F0Y2hFcnJvcigoZXJyLCBzcmMpID0+IHtcbiAgICAgICAgbG9nLmVycm9yKGVycik7XG4gICAgICAgIHJldHVybiBzcmM7IC8vIHJlLXN1YnNyaWJlIG9uIGZhaWxcbiAgICAgIH0pXG4gICAgKTtcbiAgfSk7XG5cbiAgdmVyc2lvbnNDYWNoZUN0bC5hY3Rpb25EaXNwYXRjaGVyLmNvbmZpZ1RyYW5zZm9ybWVyKHtcbiAgICByZW1vdGU6IGNyZWF0ZVRyYW5zZm9ybWVyKHRydWUpLFxuICAgIGNhY2hlZDogY3JlYXRlVHJhbnNmb3JtZXIoZmFsc2UpXG4gIH0pO1xuXG4gIGZ1bmN0aW9uIGNyZWF0ZVRyYW5zZm9ybWVyKHRyYWNrUmVtb3RlVXJsOiBib29sZWFuKTogVHJhbnNmb3JtZXIge1xuICAgIHJldHVybiBhc3luYyAoaGVhZGVyczogQ2FjaGVEYXRhWydoZWFkZXJzJ10sIHJlcUhvc3Q6IHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgICAgIHNvdXJjZTogTm9kZUpTLlJlYWRhYmxlU3RyZWFtKSA9PiB7XG4gICAgICBsZXQgZnJhZ21lbnRzID0gJyc7XG4gICAgICBsZXQgYnVmTGVuZ3RoID0gMDtcbiAgICAgIGNvbnN0IHN1YmplY3QgPSBuZXcgcnguUmVwbGF5U3ViamVjdDxCdWZmZXI+KCk7XG4gICAgICBsZXQgZGVjb21wcmVzczogTm9kZUpTLlJlYWRXcml0ZVN0cmVhbSB8IHVuZGVmaW5lZDtcbiAgICAgIGxldCBjb21wcmVzc2VyOiBOb2RlSlMuUmVhZFdyaXRlU3RyZWFtIHwgdW5kZWZpbmVkO1xuICAgICAgY29uc3QgZW5jb2RpbmdIZWFkZXIgPSBoZWFkZXJzLmZpbmQoKFtuYW1lXSkgPT4gbmFtZSA9PT0gJ2NvbnRlbnQtZW5jb2RpbmcnKTtcbiAgICAgIGNvbnN0IGNvbnRlbnRFbmNvZGluZyA9IGVuY29kaW5nSGVhZGVyID8gZW5jb2RpbmdIZWFkZXJbMV0gOiAnJztcbiAgICAgIHN3aXRjaCAoY29udGVudEVuY29kaW5nKSB7XG4gICAgICAgIGNhc2UgJ2JyJzpcbiAgICAgICAgICBkZWNvbXByZXNzID0gemxpYi5jcmVhdGVCcm90bGlEZWNvbXByZXNzKCk7XG4gICAgICAgICAgY29tcHJlc3NlciA9IHpsaWIuY3JlYXRlQnJvdGxpQ29tcHJlc3MoKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gT3IsIGp1c3QgdXNlIHpsaWIuY3JlYXRlVW56aXAoKSB0byBoYW5kbGUgYm90aCBvZiB0aGUgZm9sbG93aW5nIGNhc2VzOlxuICAgICAgICBjYXNlICdnemlwJzpcbiAgICAgICAgICBkZWNvbXByZXNzID0gemxpYi5jcmVhdGVHdW56aXAoKTtcbiAgICAgICAgICBjb21wcmVzc2VyID0gemxpYi5jcmVhdGVHemlwKCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2RlZmxhdGUnOlxuICAgICAgICAgIGRlY29tcHJlc3MgPSB6bGliLmNyZWF0ZUluZmxhdGUoKTtcbiAgICAgICAgICBjb21wcmVzc2VyID0gemxpYi5jcmVhdGVEZWZsYXRlKCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICB9XG4gICAgICBjb25zdCB0cmFuc2Zvcm1lcnM6IGFueVtdID0gZGVjb21wcmVzcyA/IFtkZWNvbXByZXNzXSA6IFtdO1xuICAgICAgY29uc3QgcHJvY2Vzc1RyYW5zID0gbmV3IFRyYW5zZm9ybSh7XG4gICAgICAgIHRyYW5zZm9ybShjaHVuaywgX2VuY29kZSwgY2IpIHtcbiAgICAgICAgICBpZiAoQnVmZmVyLmlzQnVmZmVyKGNodW5rKSkge1xuICAgICAgICAgICAgZnJhZ21lbnRzICs9IGNodW5rLnRvU3RyaW5nKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZyYWdtZW50cyArPSBjaHVuayBhcyBzdHJpbmc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNiKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGZsdXNoKGNiKSB7XG4gICAgICAgICAgaWYgKGZyYWdtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgIHJldHVybiBjYihudWxsLCAnJyk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBqc29uID0gSlNPTi5wYXJzZShmcmFnbWVudHMpIGFzIE5wbVJlZ2lzdHJ5VmVyc2lvbkpzb247XG4gICAgICAgICAgICBjb25zdCBwYXJhbToge1t2ZXI6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcblxuICAgICAgICAgICAgaWYgKGpzb24udmVyc2lvbnMpIHtcbiAgICAgICAgICAgICAgZm9yIChjb25zdCBbdmVyLCB2ZXJzaW9uRW50cnldIG9mIE9iamVjdC5lbnRyaWVzKGpzb24udmVyc2lvbnMpKSB7XG4gICAgICAgICAgICAgICAgY29uc3Qgb3JpZ1RhcmJhbGxVcmwgPSBwYXJhbVt2ZXJdID0gdmVyc2lvbkVudHJ5LmRpc3QudGFyYmFsbDtcbiAgICAgICAgICAgICAgICBjb25zdCB1cmxPYmogPSBuZXcgVVJMKG9yaWdUYXJiYWxsVXJsKTtcbiAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSB2ZXJzaW9uRW50cnkuZGlzdC50YXJiYWxsID0gKHJlcUhvc3QgfHwgREVGQVVMVF9IT1NUKSArXG4gICAgICAgICAgICAgICAgICBgJHtzZXJ2ZVRhcmJhbGxQYXRofS8ke2VuY29kZVVSSUNvbXBvbmVudChqc29uLm5hbWUpfS8ke2VuY29kZVVSSUNvbXBvbmVudCh2ZXIpfSR7dXJsT2JqLnNlYXJjaH1gO1xuICAgICAgICAgICAgICAgIGlmICghdXJsLnN0YXJ0c1dpdGgoJ2h0dHAnKSlcbiAgICAgICAgICAgICAgICAgIHZlcnNpb25FbnRyeS5kaXN0LnRhcmJhbGwgPSAnaHR0cDovLycgKyB1cmw7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgaWYgKHRyYWNrUmVtb3RlVXJsKVxuICAgICAgICAgICAgICAgIHBrZ0Rvd25sb2FkQ3RsLmFjdGlvbkRpc3BhdGNoZXIuYWRkKHtwa2dOYW1lOiBqc29uLm5hbWUsIHZlcnNpb25zOiBwYXJhbX0pO1xuXG4gICAgICAgICAgICAgIGNiKG51bGwsIEpTT04uc3RyaW5naWZ5KGpzb24pKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIGxvZy5pbmZvKCdTa2lwIHRyYW5zZm9ybScsIGZyYWdtZW50cyk7XG4gICAgICAgICAgICAgIGNiKG51bGwsIGZyYWdtZW50cyk7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBsb2cuZXJyb3IoZnJhZ21lbnRzLCBlKTtcbiAgICAgICAgICAgIHJldHVybiBjYihudWxsLCAnJyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHRyYW5zZm9ybWVycy5wdXNoKHByb2Nlc3NUcmFucyk7XG4gICAgICBpZiAoY29tcHJlc3NlcilcbiAgICAgICAgdHJhbnNmb3JtZXJzLnB1c2goY29tcHJlc3Nlcik7XG5cbiAgICAgIHRyYW5zZm9ybWVycy5wdXNoKCBuZXcgV3JpdGFibGUoe1xuICAgICAgICAgIHdyaXRlKGNodW5rXzEsIF9lbmMsIGNiXzIpIHtcbiAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IEJ1ZmZlci5pc0J1ZmZlcihjaHVua18xKSA/IGNodW5rXzEgOiBCdWZmZXIuZnJvbShjaHVua18xIGFzIHN0cmluZyk7XG4gICAgICAgICAgICBidWZMZW5ndGggKz0gYnVmZmVyLmxlbmd0aDtcbiAgICAgICAgICAgIHN1YmplY3QubmV4dChidWZmZXIpO1xuICAgICAgICAgICAgY2JfMigpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgZmluYWwoY2JfMykge1xuICAgICAgICAgICAgc3ViamVjdC5jb21wbGV0ZSgpO1xuICAgICAgICAgICAgY2JfMygpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgICAvLyBOb2RlSlMgYnVnOiBodHRwczovL2dpdGh1Yi5jb20vbm9kZWpzL25vZGUvaXNzdWVzLzQwMTkxOlxuICAgICAgLy8gc3RyZWFtLnByb21pc2VzLnBpcGVsaW5lIGRvZXNuJ3Qgc3VwcG9ydCBhcnJheXMgb2Ygc3RyZWFtcyBzaW5jZSBub2RlIDE2LjEwXG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50LCBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWNhbGxcbiAgICAgIGNvbnN0IGRvbmU6IFByb21pc2U8dW5rbm93bj4gPSAoc3RyZWFtUHJvbS5waXBlbGluZSBhcyBhbnkpKHNvdXJjZSwgLi4udHJhbnNmb3JtZXJzKTtcbiAgICAgIGF3YWl0IGRvbmU7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlbmd0aDogYnVmTGVuZ3RoLFxuICAgICAgICByZWFkYWJsZTogKCkgPT4gbmV3IFJlYWRhYmxlKHtcbiAgICAgICAgICByZWFkKCkge1xuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby10aGlzLWFsaWFzXG4gICAgICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHN1YmplY3Quc3Vic2NyaWJlKHtcbiAgICAgICAgICAgICAgbmV4dChidWYpIHtcbiAgICAgICAgICAgICAgICBzZWxmLnB1c2goYnVmKTtcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgZXJyb3IoZXJyKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5kZXN0cm95KGVycik7XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbXBsZXRlKCkge1xuICAgICAgICAgICAgICAgIHNlbGYucHVzaChudWxsKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgfTtcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuICgpID0+IHtcbiAgICBsb2cuaW5mbygnU2F2ZSBjaGFuZ2VkJywgU1RBVEVfRklMRSk7XG4gICAgcmV0dXJuIGZzLnByb21pc2VzLndyaXRlRmlsZShTVEFURV9GSUxFLCBKU09OLnN0cmluZ2lmeShwa2dEb3dubG9hZEN0bC5nZXRTdGF0ZSgpLCBudWxsLCAnICAnKSk7XG4gIH07XG59XG4iXX0=