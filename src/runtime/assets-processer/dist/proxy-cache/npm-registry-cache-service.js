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
const path_1 = __importDefault(require("path"));
const stream_1 = require("stream");
const fs_1 = __importDefault(require("fs"));
const zlib_1 = __importDefault(require("zlib"));
const plink_1 = require("@wfh/plink");
const app_server_1 = require("@wfh/plink/wfh/dist/app-server");
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const _ = __importStar(require("lodash"));
const tiny_redux_toolkit_1 = require("@wfh/redux-toolkit-observable/dist/tiny-redux-toolkit");
const cache_service_1 = require("./cache-service");
const log = (0, plink_1.log4File)(__filename);
function createNpmRegistryServer(api) {
    var _a;
    const setting = (0, plink_1.config)()['@wfh/assets-processer'].npmRegistryCacheServer;
    if (setting == null)
        return;
    const DEFAULT_HOST = setting.host || (`http://localhost${(0, plink_1.config)().port !== 80 ? ':' + (0, plink_1.config)().port : ''}`);
    const STATE_FILE = path_1.default.resolve(setting.cacheDir || plink_1.config.resolve('destDir'), 'npm-registry-cache.json');
    const servePath = path_1.default.posix.join(setting.path || '/registry', 'versions');
    log.info('NPM registry cache is serving at ', servePath);
    const versionsCacheCtl = (0, cache_service_1.createProxyWithCache)(servePath, setting.registry || 'https://registry.npmjs.org', path_1.default.posix.join(setting.cacheDir || plink_1.config.resolve('destDir'), 'versions'));
    const tarballDir = path_1.default.resolve(setting.cacheDir || plink_1.config.resolve('destDir'), 'download-tarballs');
    const pkgDownloadRouter = api.express.Router();
    const serveTarballPath = path_1.default.posix.join(setting.path || '/registry', '_tarballs');
    api.use(serveTarballPath, pkgDownloadRouter);
    pkgDownloadRouter.get('/:pkgName/:version', (req, res) => {
        log.info('incoming request download tarball', req.url);
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
        const cacheSvcByOrigin = new Map();
        if (fs_1.default.existsSync(STATE_FILE)) {
            void fs_1.default.promises.readFile(STATE_FILE, 'utf-8')
                .then(content => {
                log.info('Read cache state file:', STATE_FILE);
                pkgDownloadCtl.actionDispatcher.load(JSON.parse(content));
            });
        }
        app_server_1.shutdownHooks.push(() => {
            log.info('Save changed', STATE_FILE);
            return fs_1.default.promises.writeFile(STATE_FILE, JSON.stringify(pkgDownloadCtl.getState(), null, '  '));
        });
        return rx.merge(actionByType.fetchTarball.pipe(op.mergeMap(({ payload }) => {
            return pkgDownloadCtl.getStore().pipe(op.map(s => _.get(s, [payload.pkgName, payload.version])), op.distinctUntilChanged(), op.filter(value => value != null), op.take(1), op.map(url => {
                try {
                    const { origin, host, pathname } = new URL(url);
                    let service = cacheSvcByOrigin.get(origin);
                    if (service == null) {
                        log.info('create download proxy intance for', origin);
                        service = (0, cache_service_1.createProxyWithCache)(origin, origin, path_1.default.join(tarballDir, host.replace(/:/g, '_')), { manual: true, memCacheLength: 0 });
                        cacheSvcByOrigin.set(origin, service);
                        service.actionDispatcher.configureProxy({
                            pathRewrite(_path, req) {
                                const { params: { pkgName, version } } = req;
                                const url = pkgDownloadCtl.getState()[pkgName][version];
                                const { pathname } = new URL(url);
                                return pathname;
                            }
                        });
                    }
                    service.actionDispatcher.hitCache({
                        key: (0, cache_service_1.keyOfUri)(payload.req.method, pathname),
                        req: payload.req, res: payload.res,
                        next: () => { }
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
    versionsCacheCtl.actionDispatcher.configureProxy({
        selfHandleResponse: true
    });
    versionsCacheCtl.actionDispatcher.configTransformer({
        remote: createTransformer(true),
        cached: createTransformer(false)
    });
    function createTransformer(trackRemoteUrl) {
        return (headers, reqHost, source) => {
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
                    catch (e) {
                        log.error(fragments, e);
                        return cb(null, '');
                    }
                }
            });
            transformers.push(processTrans);
            if (compresser)
                transformers.push(compresser);
            // NodeJS bug: https://github.com/nodejs/node/issues/40191
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call
            return new Promise(resolve => {
                transformers.concat(new stream_1.Writable({
                    write(chunk, enc, cb) {
                        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
                        bufLength += buffer.length;
                        subject.next(buffer);
                        cb();
                    },
                    final(cb) {
                        subject.complete();
                        cb();
                        resolve(bufLength);
                    }
                }))
                    .reduce((prev, curr) => prev.pipe(curr), source);
            })
                .then(bufLength => {
                return {
                    length: bufLength,
                    readable: () => new stream_1.Readable({
                        read() {
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
            });
        };
    }
}
exports.default = createNpmRegistryServer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnBtLXJlZ2lzdHJ5LWNhY2hlLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJucG0tcmVnaXN0cnktY2FjaGUtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnREFBd0I7QUFDeEIsbUNBQXFEO0FBQ3JELDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsc0NBQThEO0FBQzlELCtEQUE2RDtBQUM3RCx5Q0FBMkI7QUFDM0IsbURBQXFDO0FBQ3JDLDBDQUE0QjtBQUU1Qiw4RkFBb0c7QUFFcEcsbURBQStEO0FBRS9ELE1BQU0sR0FBRyxHQUFHLElBQUEsZ0JBQVEsRUFBQyxVQUFVLENBQUMsQ0FBQztBQU9qQyxTQUF3Qix1QkFBdUIsQ0FBQyxHQUFxQjs7SUFDbkUsTUFBTSxPQUFPLEdBQUcsSUFBQSxjQUFNLEdBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLHNCQUFzQixDQUFDO0lBQ3pFLElBQUksT0FBTyxJQUFJLElBQUk7UUFDakIsT0FBTztJQUNULE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyxtQkFBbUIsSUFBQSxjQUFNLEdBQUUsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBQSxjQUFNLEdBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDNUcsTUFBTSxVQUFVLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxJQUFJLGNBQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUseUJBQXlCLENBQUMsQ0FBQztJQUUxRyxNQUFNLFNBQVMsR0FBRyxjQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUMzRSxHQUFHLENBQUMsSUFBSSxDQUFDLG1D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Q0FBQyxDQUFDO2lCQUNELElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRTtnQkFFaEIsT0FBTztvQkFDTCxNQUFNLEVBQUUsU0FBUztvQkFDakIsUUFBUSxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksaUJBQVEsQ0FBQzt3QkFDM0IsSUFBSTs0QkFDRixNQUFNLElBQUksR0FBRyxJQUFJLENBQUM7NEJBQ2xCLE9BQU8sQ0FBQyxTQUFTLENBQUM7Z0NBQ2xCLElBQUksQ0FBQyxHQUFHO29DQUNOLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7Z0NBQ2pCLENBQUM7Z0NBQ0QsS0FBSyxDQUFDLEdBQUc7b0NBQ1AsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztnQ0FDcEIsQ0FBQztnQ0FDRCxRQUFRO29DQUNOLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0NBQ2xCLENBQUM7NkJBQ0YsQ0FBQyxDQUFDO3dCQUNILENBQUM7cUJBQ0YsQ0FBQztpQkFDSCxDQUFDO1lBQ0osQ0FBQyxDQUFDLENBQUM7UUFDTCxDQUFDLENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQztBQXhPRCwwQ0F3T0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7VHJhbnNmb3JtLCBXcml0YWJsZSwgUmVhZGFibGV9IGZyb20gJ3N0cmVhbSc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHpsaWIgZnJvbSAnemxpYic7XG5pbXBvcnQge2NvbmZpZywgbG9nNEZpbGUsIEV4dGVuc2lvbkNvbnRleHR9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IHtzaHV0ZG93bkhvb2tzfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L2FwcC1zZXJ2ZXInO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge1JlcXVlc3QsIFJlc3BvbnNlfSBmcm9tICdleHByZXNzJztcbmltcG9ydCB7Y3JlYXRlU2xpY2UsIGNhc3RCeUFjdGlvblR5cGV9IGZyb20gJ0B3ZmgvcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlL2Rpc3QvdGlueS1yZWR1eC10b29sa2l0JztcbmltcG9ydCB7Q2FjaGVEYXRhLCBOcG1SZWdpc3RyeVZlcnNpb25Kc29uLCBUYXJiYWxsc0luZm8sIFRyYW5zZm9ybWVyfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7Y3JlYXRlUHJveHlXaXRoQ2FjaGUsIGtleU9mVXJpfSBmcm9tICcuL2NhY2hlLXNlcnZpY2UnO1xuXG5jb25zdCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcblxudHlwZSBQa2dEb3dubG9hZFJlcXVlc3RQYXJhbXMgPSB7XG4gIHBrZ05hbWU6IHN0cmluZztcbiAgdmVyc2lvbjogc3RyaW5nO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY3JlYXRlTnBtUmVnaXN0cnlTZXJ2ZXIoYXBpOiBFeHRlbnNpb25Db250ZXh0KSB7XG4gIGNvbnN0IHNldHRpbmcgPSBjb25maWcoKVsnQHdmaC9hc3NldHMtcHJvY2Vzc2VyJ10ubnBtUmVnaXN0cnlDYWNoZVNlcnZlcjtcbiAgaWYgKHNldHRpbmcgPT0gbnVsbClcbiAgICByZXR1cm47XG4gIGNvbnN0IERFRkFVTFRfSE9TVCA9IHNldHRpbmcuaG9zdCB8fCAoYGh0dHA6Ly9sb2NhbGhvc3Qke2NvbmZpZygpLnBvcnQgIT09IDgwID8gJzonICsgY29uZmlnKCkucG9ydCA6ICcnfWApO1xuICBjb25zdCBTVEFURV9GSUxFID0gUGF0aC5yZXNvbHZlKHNldHRpbmcuY2FjaGVEaXIgfHwgY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInKSwgJ25wbS1yZWdpc3RyeS1jYWNoZS5qc29uJyk7XG5cbiAgY29uc3Qgc2VydmVQYXRoID0gUGF0aC5wb3NpeC5qb2luKHNldHRpbmcucGF0aCB8fCAnL3JlZ2lzdHJ5JywgJ3ZlcnNpb25zJyk7XG4gIGxvZy5pbmZvKCdOUE0gcmVnaXN0cnkgY2FjaGUgaXMgc2VydmluZyBhdCAnLCBzZXJ2ZVBhdGgpO1xuICBjb25zdCB2ZXJzaW9uc0NhY2hlQ3RsID0gY3JlYXRlUHJveHlXaXRoQ2FjaGUoc2VydmVQYXRoLFxuICAgIHNldHRpbmcucmVnaXN0cnkgfHwgJ2h0dHBzOi8vcmVnaXN0cnkubnBtanMub3JnJyxcbiAgICBQYXRoLnBvc2l4LmpvaW4oc2V0dGluZy5jYWNoZURpciB8fCBjb25maWcucmVzb2x2ZSgnZGVzdERpcicpLCAndmVyc2lvbnMnKVxuICApO1xuXG4gIGNvbnN0IHRhcmJhbGxEaXIgPSBQYXRoLnJlc29sdmUoc2V0dGluZy5jYWNoZURpciB8fCBjb25maWcucmVzb2x2ZSgnZGVzdERpcicpLCAnZG93bmxvYWQtdGFyYmFsbHMnKTtcblxuICBjb25zdCBwa2dEb3dubG9hZFJvdXRlciA9IGFwaS5leHByZXNzLlJvdXRlcigpO1xuXG4gIGNvbnN0IHNlcnZlVGFyYmFsbFBhdGggPSBQYXRoLnBvc2l4LmpvaW4oc2V0dGluZy5wYXRoIHx8ICcvcmVnaXN0cnknLCAnX3RhcmJhbGxzJyk7XG5cbiAgYXBpLnVzZShzZXJ2ZVRhcmJhbGxQYXRoLCBwa2dEb3dubG9hZFJvdXRlcik7XG4gIHBrZ0Rvd25sb2FkUm91dGVyLmdldCgnLzpwa2dOYW1lLzp2ZXJzaW9uJywgKHJlcSwgcmVzKSA9PiB7XG4gICAgbG9nLmluZm8oJ2luY29taW5nIHJlcXVlc3QgZG93bmxvYWQgdGFyYmFsbCcsIHJlcS51cmwpO1xuICAgIHBrZ0Rvd25sb2FkQ3RsLmFjdGlvbkRpc3BhdGNoZXIuZmV0Y2hUYXJiYWxsKHtcbiAgICAgIHJlcSwgcmVzLCBwa2dOYW1lOiByZXEucGFyYW1zLnBrZ05hbWUsIHZlcnNpb246IHJlcS5wYXJhbXMudmVyc2lvbn0pO1xuICB9KTtcblxuICBjb25zdCBwa2dEb3dubG9hZEN0bCA9IGNyZWF0ZVNsaWNlKHtcbiAgICBuYW1lOiAncGtnQ2FjaGUnLFxuICAgIGluaXRpYWxTdGF0ZToge30gYXMgVGFyYmFsbHNJbmZvLFxuICAgIHJlZHVjZXJzOiB7XG4gICAgICBsb2FkKHM6IFRhcmJhbGxzSW5mbywgZGF0YTogVGFyYmFsbHNJbmZvKSB7XG4gICAgICAgIE9iamVjdC5hc3NpZ24ocywgZGF0YSk7XG4gICAgICB9LFxuICAgICAgYWRkKHM6IFRhcmJhbGxzSW5mbywgcGF5bG9hZDoge3BrZ05hbWU6IHN0cmluZzsgdmVyc2lvbnM6IHtbdmVyc2lvbjogc3RyaW5nXTogc3RyaW5nfX0pIHtcbiAgICAgICAgbGV0IHBrZ0VudHJ5ID0gc1twYXlsb2FkLnBrZ05hbWVdO1xuICAgICAgICBpZiAocGtnRW50cnkgPT0gbnVsbClcbiAgICAgICAgICBzW3BheWxvYWQucGtnTmFtZV0gPSBwYXlsb2FkLnZlcnNpb25zO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgc1twYXlsb2FkLnBrZ05hbWVdID0gey4uLnBrZ0VudHJ5LCAuLi5wYXlsb2FkLnZlcnNpb25zfTtcbiAgICAgIH0sXG4gICAgICBmZXRjaFRhcmJhbGwoX3M6IFRhcmJhbGxzSW5mbyxcbiAgICAgICAgX3BheWxvYWQ6IHtyZXE6IFJlcXVlc3Q8UGtnRG93bmxvYWRSZXF1ZXN0UGFyYW1zPjsgcmVzOiBSZXNwb25zZTsgcGtnTmFtZTogc3RyaW5nOyB2ZXJzaW9uOiBzdHJpbmd9KSB7XG4gICAgICB9XG4gICAgfSxcbiAgICBkZWJ1Z0FjdGlvbk9ubHk6ICEhY29uZmlnKCkuY2xpT3B0aW9ucz8udmVyYm9zZVxuICB9KTtcblxuICBwa2dEb3dubG9hZEN0bC5lcGljKGFjdGlvbiQgPT4ge1xuICAgIGNvbnN0IGFjdGlvbkJ5VHlwZSA9IGNhc3RCeUFjdGlvblR5cGUocGtnRG93bmxvYWRDdGwuYWN0aW9ucywgYWN0aW9uJCk7XG4gICAgLy8gY29uc3QgZmV0Y2hBY3Rpb25TdGF0ZSA9IG5ldyBNYXA8c3RyaW5nLCBSZXNwb25zZVtdPigpO1xuICAgIC8vIG1hcCBrZXkgaXMgaG9zdCBuYW1lIG9mIHJlbW90ZSB0YXJiYWxsIHNlcnZlclxuICAgIGNvbnN0IGNhY2hlU3ZjQnlPcmlnaW4gPSBuZXcgTWFwPHN0cmluZywgUmV0dXJuVHlwZTx0eXBlb2YgY3JlYXRlUHJveHlXaXRoQ2FjaGU+PigpO1xuXG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoU1RBVEVfRklMRSkpIHtcbiAgICAgIHZvaWQgZnMucHJvbWlzZXMucmVhZEZpbGUoU1RBVEVfRklMRSwgJ3V0Zi04JylcbiAgICAgIC50aGVuKGNvbnRlbnQgPT4ge1xuICAgICAgICBsb2cuaW5mbygnUmVhZCBjYWNoZSBzdGF0ZSBmaWxlOicsIFNUQVRFX0ZJTEUpO1xuICAgICAgICBwa2dEb3dubG9hZEN0bC5hY3Rpb25EaXNwYXRjaGVyLmxvYWQoSlNPTi5wYXJzZShjb250ZW50KSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgc2h1dGRvd25Ib29rcy5wdXNoKCgpID0+IHtcbiAgICAgIGxvZy5pbmZvKCdTYXZlIGNoYW5nZWQnLCBTVEFURV9GSUxFKTtcbiAgICAgIHJldHVybiBmcy5wcm9taXNlcy53cml0ZUZpbGUoU1RBVEVfRklMRSwgSlNPTi5zdHJpbmdpZnkocGtnRG93bmxvYWRDdGwuZ2V0U3RhdGUoKSwgbnVsbCwgJyAgJykpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJ4Lm1lcmdlKFxuICAgICAgIGFjdGlvbkJ5VHlwZS5mZXRjaFRhcmJhbGwucGlwZShcbiAgICAgICAgb3AubWVyZ2VNYXAoKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICAgIHJldHVybiBwa2dEb3dubG9hZEN0bC5nZXRTdG9yZSgpLnBpcGUoXG4gICAgICAgICAgICBvcC5tYXAocyA9PiBfLmdldChzLCBbcGF5bG9hZC5wa2dOYW1lLCBwYXlsb2FkLnZlcnNpb25dKSksXG4gICAgICAgICAgICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgICAgICAgb3AuZmlsdGVyKHZhbHVlID0+IHZhbHVlICE9IG51bGwpLFxuICAgICAgICAgICAgb3AudGFrZSgxKSxcbiAgICAgICAgICAgIG9wLm1hcCh1cmwgPT4ge1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHtvcmlnaW4sIGhvc3QsIHBhdGhuYW1lfSA9IG5ldyBVUkwodXJsKTtcbiAgICAgICAgICAgICAgICBsZXQgc2VydmljZSA9IGNhY2hlU3ZjQnlPcmlnaW4uZ2V0KG9yaWdpbik7XG4gICAgICAgICAgICAgICAgaWYgKHNlcnZpY2UgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgbG9nLmluZm8oJ2NyZWF0ZSBkb3dubG9hZCBwcm94eSBpbnRhbmNlIGZvcicsIG9yaWdpbik7XG4gICAgICAgICAgICAgICAgICBzZXJ2aWNlID0gY3JlYXRlUHJveHlXaXRoQ2FjaGUob3JpZ2luLCBvcmlnaW4sXG4gICAgICAgICAgICAgICAgICAgIFBhdGguam9pbih0YXJiYWxsRGlyLCBob3N0LnJlcGxhY2UoLzovZywgJ18nKSksXG4gICAgICAgICAgICAgICAgICAgIHsgbWFudWFsOiB0cnVlLCBtZW1DYWNoZUxlbmd0aDogMCB9KTtcbiAgICAgICAgICAgICAgICAgIGNhY2hlU3ZjQnlPcmlnaW4uc2V0KG9yaWdpbiwgc2VydmljZSk7XG4gICAgICAgICAgICAgICAgICBzZXJ2aWNlLmFjdGlvbkRpc3BhdGNoZXIuY29uZmlndXJlUHJveHkoe1xuICAgICAgICAgICAgICAgICAgICBwYXRoUmV3cml0ZShfcGF0aCwgcmVxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3Qge3BhcmFtczoge3BrZ05hbWUsIHZlcnNpb259fSA9IChyZXEgYXMgUmVxdWVzdDxQa2dEb3dubG9hZFJlcXVlc3RQYXJhbXM+KTtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSBwa2dEb3dubG9hZEN0bC5nZXRTdGF0ZSgpW3BrZ05hbWVdW3ZlcnNpb25dO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHtwYXRobmFtZX0gPSBuZXcgVVJMKHVybCk7XG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhdGhuYW1lO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2VydmljZS5hY3Rpb25EaXNwYXRjaGVyLmhpdENhY2hlKHtcbiAgICAgICAgICAgICAgICAgIGtleToga2V5T2ZVcmkocGF5bG9hZC5yZXEubWV0aG9kLCBwYXRobmFtZSksXG4gICAgICAgICAgICAgICAgICByZXE6IHBheWxvYWQucmVxLCByZXM6IHBheWxvYWQucmVzLFxuICAgICAgICAgICAgICAgICAgbmV4dDogKCkgPT4ge31cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGxvZy5lcnJvcignRmFpbGVkIGZvciBkb3dubG9hZCBVUkw6JyArIHVybCwgZSk7XG4gICAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICApO1xuICAgICAgICB9KVxuICAgICAgKVxuICAgICkucGlwZShcbiAgICAgIG9wLmlnbm9yZUVsZW1lbnRzKCksXG4gICAgICBvcC5jYXRjaEVycm9yKChlcnIsIHNyYykgPT4ge1xuICAgICAgICBsb2cuZXJyb3IoZXJyKTtcbiAgICAgICAgcmV0dXJuIHNyYzsgLy8gcmUtc3Vic3JpYmUgb24gZmFpbFxuICAgICAgfSlcbiAgICApO1xuICB9KTtcblxuXG4gIHZlcnNpb25zQ2FjaGVDdGwuYWN0aW9uRGlzcGF0Y2hlci5jb25maWd1cmVQcm94eSh7XG4gICAgc2VsZkhhbmRsZVJlc3BvbnNlOiB0cnVlXG4gIH0pO1xuXG4gIHZlcnNpb25zQ2FjaGVDdGwuYWN0aW9uRGlzcGF0Y2hlci5jb25maWdUcmFuc2Zvcm1lcih7XG4gICAgcmVtb3RlOiBjcmVhdGVUcmFuc2Zvcm1lcih0cnVlKSxcbiAgICBjYWNoZWQ6IGNyZWF0ZVRyYW5zZm9ybWVyKGZhbHNlKVxuICB9KTtcblxuICBmdW5jdGlvbiBjcmVhdGVUcmFuc2Zvcm1lcih0cmFja1JlbW90ZVVybDogYm9vbGVhbik6IFRyYW5zZm9ybWVyIHtcbiAgICByZXR1cm4gKGhlYWRlcnM6IENhY2hlRGF0YVsnaGVhZGVycyddLCByZXFIb3N0OiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICAgICAgICAgIHNvdXJjZTogTm9kZUpTLlJlYWRhYmxlU3RyZWFtKSA9PiB7XG4gICAgICBsZXQgZnJhZ21lbnRzID0gJyc7XG4gICAgICBsZXQgYnVmTGVuZ3RoID0gMDtcbiAgICAgIGNvbnN0IHN1YmplY3QgPSBuZXcgcnguUmVwbGF5U3ViamVjdDxCdWZmZXI+KCk7XG4gICAgICBsZXQgZGVjb21wcmVzczogTm9kZUpTLlJlYWRXcml0ZVN0cmVhbSB8IHVuZGVmaW5lZDtcbiAgICAgIGxldCBjb21wcmVzc2VyOiBOb2RlSlMuUmVhZFdyaXRlU3RyZWFtIHwgdW5kZWZpbmVkO1xuICAgICAgY29uc3QgZW5jb2RpbmdIZWFkZXIgPSBoZWFkZXJzLmZpbmQoKFtuYW1lXSkgPT4gbmFtZSA9PT0gJ2NvbnRlbnQtZW5jb2RpbmcnKTtcbiAgICAgIGNvbnN0IGNvbnRlbnRFbmNvZGluZyA9IGVuY29kaW5nSGVhZGVyID8gZW5jb2RpbmdIZWFkZXJbMV0gOiAnJztcbiAgICAgIHN3aXRjaCAoY29udGVudEVuY29kaW5nKSB7XG4gICAgICAgIGNhc2UgJ2JyJzpcbiAgICAgICAgICBkZWNvbXByZXNzID0gemxpYi5jcmVhdGVCcm90bGlEZWNvbXByZXNzKCk7XG4gICAgICAgICAgY29tcHJlc3NlciA9IHpsaWIuY3JlYXRlQnJvdGxpQ29tcHJlc3MoKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgLy8gT3IsIGp1c3QgdXNlIHpsaWIuY3JlYXRlVW56aXAoKSB0byBoYW5kbGUgYm90aCBvZiB0aGUgZm9sbG93aW5nIGNhc2VzOlxuICAgICAgICBjYXNlICdnemlwJzpcbiAgICAgICAgICBkZWNvbXByZXNzID0gemxpYi5jcmVhdGVHdW56aXAoKTtcbiAgICAgICAgICBjb21wcmVzc2VyID0gemxpYi5jcmVhdGVHemlwKCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgJ2RlZmxhdGUnOlxuICAgICAgICAgIGRlY29tcHJlc3MgPSB6bGliLmNyZWF0ZUluZmxhdGUoKTtcbiAgICAgICAgICBjb21wcmVzc2VyID0gemxpYi5jcmVhdGVEZWZsYXRlKCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICB9XG4gICAgICBjb25zdCB0cmFuc2Zvcm1lcnMgPSBkZWNvbXByZXNzID8gW2RlY29tcHJlc3NdIDogW107XG4gICAgICBjb25zdCBwcm9jZXNzVHJhbnMgPSBuZXcgVHJhbnNmb3JtKHtcbiAgICAgICAgdHJhbnNmb3JtKGNodW5rLCBfZW5jb2RlLCBjYikge1xuICAgICAgICAgIGlmIChCdWZmZXIuaXNCdWZmZXIoY2h1bmspKSB7XG4gICAgICAgICAgICBmcmFnbWVudHMgKz0gY2h1bmsudG9TdHJpbmcoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZnJhZ21lbnRzICs9IGNodW5rIGFzIHN0cmluZztcbiAgICAgICAgICB9XG4gICAgICAgICAgY2IoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZmx1c2goY2IpIHtcbiAgICAgICAgICBpZiAoZnJhZ21lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGNiKG51bGwsICcnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKGZyYWdtZW50cykgYXMgTnBtUmVnaXN0cnlWZXJzaW9uSnNvbjtcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtOiB7W3Zlcjogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuXG4gICAgICAgICAgICBmb3IgKGNvbnN0IFt2ZXIsIHZlcnNpb25FbnRyeV0gb2YgT2JqZWN0LmVudHJpZXMoanNvbi52ZXJzaW9ucykpIHtcbiAgICAgICAgICAgICAgY29uc3Qgb3JpZ1RhcmJhbGxVcmwgPSBwYXJhbVt2ZXJdID0gdmVyc2lvbkVudHJ5LmRpc3QudGFyYmFsbDtcbiAgICAgICAgICAgICAgY29uc3QgdXJsT2JqID0gbmV3IFVSTChvcmlnVGFyYmFsbFVybCk7XG4gICAgICAgICAgICAgIGNvbnN0IHVybCA9IHZlcnNpb25FbnRyeS5kaXN0LnRhcmJhbGwgPSAocmVxSG9zdCB8fCBERUZBVUxUX0hPU1QpICtcbiAgICAgICAgICAgICAgICBgJHtzZXJ2ZVRhcmJhbGxQYXRofS8ke2VuY29kZVVSSUNvbXBvbmVudChqc29uLm5hbWUpfS8ke2VuY29kZVVSSUNvbXBvbmVudCh2ZXIpfSR7dXJsT2JqLnNlYXJjaH1gO1xuICAgICAgICAgICAgICBpZiAoIXVybC5zdGFydHNXaXRoKCdodHRwJykpXG4gICAgICAgICAgICAgICAgdmVyc2lvbkVudHJ5LmRpc3QudGFyYmFsbCA9ICdodHRwOi8vJyArIHVybDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0cmFja1JlbW90ZVVybClcbiAgICAgICAgICAgICAgcGtnRG93bmxvYWRDdGwuYWN0aW9uRGlzcGF0Y2hlci5hZGQoe3BrZ05hbWU6IGpzb24ubmFtZSwgdmVyc2lvbnM6IHBhcmFtfSk7XG5cbiAgICAgICAgICAgIGNiKG51bGwsIEpTT04uc3RyaW5naWZ5KGpzb24pKTtcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBsb2cuZXJyb3IoZnJhZ21lbnRzLCBlKTtcbiAgICAgICAgICAgIHJldHVybiBjYihudWxsLCAnJyk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHRyYW5zZm9ybWVycy5wdXNoKHByb2Nlc3NUcmFucyk7XG4gICAgICBpZiAoY29tcHJlc3NlcilcbiAgICAgICAgdHJhbnNmb3JtZXJzLnB1c2goY29tcHJlc3Nlcik7XG4gICAgICAvLyBOb2RlSlMgYnVnOiBodHRwczovL2dpdGh1Yi5jb20vbm9kZWpzL25vZGUvaXNzdWVzLzQwMTkxXG4gICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1jYWxsXG4gICAgICByZXR1cm4gbmV3IFByb21pc2U8bnVtYmVyPihyZXNvbHZlID0+IHtcbiAgICAgICAgKHRyYW5zZm9ybWVycyBhcyBBcnJheTxOb2RlSlMuUmVhZFdyaXRlU3RyZWFtIHwgTm9kZUpTLldyaXRhYmxlU3RyZWFtPikuY29uY2F0KG5ldyBXcml0YWJsZSh7XG4gICAgICAgICAgd3JpdGUoY2h1bmssIGVuYywgY2IpIHtcbiAgICAgICAgICAgIGNvbnN0IGJ1ZmZlciA9IEJ1ZmZlci5pc0J1ZmZlcihjaHVuaykgPyBjaHVuayA6IEJ1ZmZlci5mcm9tKGNodW5rKTtcbiAgICAgICAgICAgIGJ1Zkxlbmd0aCArPSBidWZmZXIubGVuZ3RoO1xuICAgICAgICAgICAgc3ViamVjdC5uZXh0KGJ1ZmZlcik7XG4gICAgICAgICAgICBjYigpO1xuICAgICAgICAgIH0sXG4gICAgICAgICAgZmluYWwoY2IpIHtcbiAgICAgICAgICAgIHN1YmplY3QuY29tcGxldGUoKTtcbiAgICAgICAgICAgIGNiKCk7XG4gICAgICAgICAgICByZXNvbHZlKGJ1Zkxlbmd0aCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KSlcbiAgICAgICAgLnJlZHVjZSgocHJldiwgY3VycikgPT4gcHJldi5waXBlKGN1cnIpIGFzIE5vZGVKUy5SZWFkYWJsZVN0cmVhbSwgc291cmNlKTtcbiAgICAgIH0pXG4gICAgICAudGhlbihidWZMZW5ndGggPT4ge1xuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgbGVuZ3RoOiBidWZMZW5ndGgsXG4gICAgICAgICAgcmVhZGFibGU6ICgpID0+IG5ldyBSZWFkYWJsZSh7XG4gICAgICAgICAgICByZWFkKCkge1xuICAgICAgICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgICAgICAgc3ViamVjdC5zdWJzY3JpYmUoe1xuICAgICAgICAgICAgICBuZXh0KGJ1Zikge1xuICAgICAgICAgICAgICAgIHNlbGYucHVzaChidWYpO1xuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBlcnJvcihlcnIpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmRlc3Ryb3koZXJyKTtcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY29tcGxldGUoKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5wdXNoKG51bGwpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KVxuICAgICAgICB9O1xuICAgICAgfSk7XG4gICAgfTtcbiAgfVxufVxuIl19