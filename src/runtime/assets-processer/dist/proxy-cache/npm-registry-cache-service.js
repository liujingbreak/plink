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
    const versionsCacheCtl = (0, cache_service_1.createProxyWithCache)(servePath, {
        selfHandleResponse: true,
        target: setting.registry || 'https://registry.npmjs.org'
    }, path_1.default.posix.join(setting.cacheDir || plink_1.config.resolve('destDir'), 'versions'));
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
                        service = (0, cache_service_1.createProxyWithCache)(origin, {
                            target: url
                        }, path_1.default.join(tarballDir, host.replace(/:/g, '_')), { manual: true, memCacheLength: 0 });
                        cacheSvcByOrigin.set(origin, service);
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
}
exports.default = createNpmRegistryServer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnBtLXJlZ2lzdHJ5LWNhY2hlLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJucG0tcmVnaXN0cnktY2FjaGUtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnREFBd0I7QUFDeEIsbUNBQTZFO0FBQzdFLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsc0NBQThEO0FBQzlELCtEQUE2RDtBQUM3RCx5Q0FBMkI7QUFDM0IsbURBQXFDO0FBQ3JDLDBDQUE0QjtBQUU1Qiw4RkFBb0c7QUFFcEcsbURBQStEO0FBRS9ELE1BQU0sR0FBRyxHQUFHLElBQUEsZ0JBQVEsRUFBQyxVQUFVLENBQUMsQ0FBQztBQU9qQyxTQUF3Qix1QkFBdUIsQ0FBQyxHQUFxQjs7SUFDbkUsTUFBTSxPQUFPLEdBQUcsSUFBQSxjQUFNLEdBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLHNCQUFzQixDQUFDO0lBQ3pFLElBQUksT0FBTyxJQUFJLElBQUk7UUFDakIsT0FBTztJQUNULE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyxtQkFBbUIsSUFBQSxjQUFNLEdBQUUsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBQSxjQUFNLEdBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDNUcsTUFBTSxVQUFVLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxJQUFJLGNBQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUseUJBQXlCLENBQUMsQ0FBQztJQUUxRyxNQUFNLFNBQVMsR0FBRyxjQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUMzRSxHQUFHLENBQUMsSUFBSSxDQUFDLG1D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UUFDSixDQUFDLENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQztBQTVORCwwQ0E0TkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7VHJhbnNmb3JtLCBXcml0YWJsZSwgUmVhZGFibGUsIHByb21pc2VzIGFzIHN0cmVhbVByb219IGZyb20gJ3N0cmVhbSc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHpsaWIgZnJvbSAnemxpYic7XG5pbXBvcnQge2NvbmZpZywgbG9nNEZpbGUsIEV4dGVuc2lvbkNvbnRleHR9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IHtzaHV0ZG93bkhvb2tzfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L2FwcC1zZXJ2ZXInO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge1JlcXVlc3QsIFJlc3BvbnNlfSBmcm9tICdleHByZXNzJztcbmltcG9ydCB7Y3JlYXRlU2xpY2UsIGNhc3RCeUFjdGlvblR5cGV9IGZyb20gJ0B3ZmgvcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlL2Rpc3QvdGlueS1yZWR1eC10b29sa2l0JztcbmltcG9ydCB7Q2FjaGVEYXRhLCBOcG1SZWdpc3RyeVZlcnNpb25Kc29uLCBUYXJiYWxsc0luZm8sIFRyYW5zZm9ybWVyfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7Y3JlYXRlUHJveHlXaXRoQ2FjaGUsIGtleU9mVXJpfSBmcm9tICcuL2NhY2hlLXNlcnZpY2UnO1xuXG5jb25zdCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcblxudHlwZSBQa2dEb3dubG9hZFJlcXVlc3RQYXJhbXMgPSB7XG4gIHBrZ05hbWU6IHN0cmluZztcbiAgdmVyc2lvbjogc3RyaW5nO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY3JlYXRlTnBtUmVnaXN0cnlTZXJ2ZXIoYXBpOiBFeHRlbnNpb25Db250ZXh0KSB7XG4gIGNvbnN0IHNldHRpbmcgPSBjb25maWcoKVsnQHdmaC9hc3NldHMtcHJvY2Vzc2VyJ10ubnBtUmVnaXN0cnlDYWNoZVNlcnZlcjtcbiAgaWYgKHNldHRpbmcgPT0gbnVsbClcbiAgICByZXR1cm47XG4gIGNvbnN0IERFRkFVTFRfSE9TVCA9IHNldHRpbmcuaG9zdCB8fCAoYGh0dHA6Ly9sb2NhbGhvc3Qke2NvbmZpZygpLnBvcnQgIT09IDgwID8gJzonICsgY29uZmlnKCkucG9ydCA6ICcnfWApO1xuICBjb25zdCBTVEFURV9GSUxFID0gUGF0aC5yZXNvbHZlKHNldHRpbmcuY2FjaGVEaXIgfHwgY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInKSwgJ25wbS1yZWdpc3RyeS1jYWNoZS5qc29uJyk7XG5cbiAgY29uc3Qgc2VydmVQYXRoID0gUGF0aC5wb3NpeC5qb2luKHNldHRpbmcucGF0aCB8fCAnL3JlZ2lzdHJ5JywgJ3ZlcnNpb25zJyk7XG4gIGxvZy5pbmZvKCdOUE0gcmVnaXN0cnkgY2FjaGUgaXMgc2VydmluZyBhdCAnLCBzZXJ2ZVBhdGgpO1xuICBjb25zdCB2ZXJzaW9uc0NhY2hlQ3RsID0gY3JlYXRlUHJveHlXaXRoQ2FjaGUoc2VydmVQYXRoLCB7XG4gICAgICBzZWxmSGFuZGxlUmVzcG9uc2U6IHRydWUsXG4gICAgICB0YXJnZXQ6IHNldHRpbmcucmVnaXN0cnkgfHwgJ2h0dHBzOi8vcmVnaXN0cnkubnBtanMub3JnJ1xuICAgIH0sXG4gICAgUGF0aC5wb3NpeC5qb2luKHNldHRpbmcuY2FjaGVEaXIgfHwgY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInKSwgJ3ZlcnNpb25zJylcbiAgKTtcblxuICBjb25zdCB0YXJiYWxsRGlyID0gUGF0aC5yZXNvbHZlKHNldHRpbmcuY2FjaGVEaXIgfHwgY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInKSwgJ2Rvd25sb2FkLXRhcmJhbGxzJyk7XG4gIGNvbnN0IHBrZ0Rvd25sb2FkUm91dGVyID0gYXBpLmV4cHJlc3MuUm91dGVyKCk7XG4gIGNvbnN0IHNlcnZlVGFyYmFsbFBhdGggPSBQYXRoLnBvc2l4LmpvaW4oc2V0dGluZy5wYXRoIHx8ICcvcmVnaXN0cnknLCAnX3RhcmJhbGxzJyk7XG5cbiAgYXBpLnVzZShzZXJ2ZVRhcmJhbGxQYXRoLCBwa2dEb3dubG9hZFJvdXRlcik7XG4gIHBrZ0Rvd25sb2FkUm91dGVyLmdldCgnLzpwa2dOYW1lLzp2ZXJzaW9uJywgKHJlcSwgcmVzKSA9PiB7XG4gICAgbG9nLmluZm8oJ2luY29taW5nIHJlcXVlc3QgZG93bmxvYWQgdGFyYmFsbCcsIHJlcS51cmwpO1xuICAgIHBrZ0Rvd25sb2FkQ3RsLmFjdGlvbkRpc3BhdGNoZXIuZmV0Y2hUYXJiYWxsKHtcbiAgICAgIHJlcSwgcmVzLCBwa2dOYW1lOiByZXEucGFyYW1zLnBrZ05hbWUsIHZlcnNpb246IHJlcS5wYXJhbXMudmVyc2lvbn0pO1xuICB9KTtcblxuICBjb25zdCBwa2dEb3dubG9hZEN0bCA9IGNyZWF0ZVNsaWNlKHtcbiAgICBuYW1lOiAncGtnQ2FjaGUnLFxuICAgIGluaXRpYWxTdGF0ZToge30gYXMgVGFyYmFsbHNJbmZvLFxuICAgIHJlZHVjZXJzOiB7XG4gICAgICBsb2FkKHM6IFRhcmJhbGxzSW5mbywgZGF0YTogVGFyYmFsbHNJbmZvKSB7XG4gICAgICAgIE9iamVjdC5hc3NpZ24ocywgZGF0YSk7XG4gICAgICB9LFxuICAgICAgYWRkKHM6IFRhcmJhbGxzSW5mbywgcGF5bG9hZDoge3BrZ05hbWU6IHN0cmluZzsgdmVyc2lvbnM6IHtbdmVyc2lvbjogc3RyaW5nXTogc3RyaW5nfX0pIHtcbiAgICAgICAgbGV0IHBrZ0VudHJ5ID0gc1twYXlsb2FkLnBrZ05hbWVdO1xuICAgICAgICBpZiAocGtnRW50cnkgPT0gbnVsbClcbiAgICAgICAgICBzW3BheWxvYWQucGtnTmFtZV0gPSBwYXlsb2FkLnZlcnNpb25zO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgc1twYXlsb2FkLnBrZ05hbWVdID0gey4uLnBrZ0VudHJ5LCAuLi5wYXlsb2FkLnZlcnNpb25zfTtcbiAgICAgIH0sXG4gICAgICBmZXRjaFRhcmJhbGwoX3M6IFRhcmJhbGxzSW5mbyxcbiAgICAgICAgX3BheWxvYWQ6IHtyZXE6IFJlcXVlc3Q8UGtnRG93bmxvYWRSZXF1ZXN0UGFyYW1zPjsgcmVzOiBSZXNwb25zZTsgcGtnTmFtZTogc3RyaW5nOyB2ZXJzaW9uOiBzdHJpbmd9KSB7XG4gICAgICB9XG4gICAgfSxcbiAgICBkZWJ1Z0FjdGlvbk9ubHk6ICEhY29uZmlnKCkuY2xpT3B0aW9ucz8udmVyYm9zZVxuICB9KTtcblxuICBwa2dEb3dubG9hZEN0bC5lcGljKGFjdGlvbiQgPT4ge1xuICAgIGNvbnN0IGFjdGlvbkJ5VHlwZSA9IGNhc3RCeUFjdGlvblR5cGUocGtnRG93bmxvYWRDdGwuYWN0aW9ucywgYWN0aW9uJCk7XG4gICAgLy8gY29uc3QgZmV0Y2hBY3Rpb25TdGF0ZSA9IG5ldyBNYXA8c3RyaW5nLCBSZXNwb25zZVtdPigpO1xuICAgIC8vIG1hcCBrZXkgaXMgaG9zdCBuYW1lIG9mIHJlbW90ZSB0YXJiYWxsIHNlcnZlclxuICAgIGNvbnN0IGNhY2hlU3ZjQnlPcmlnaW4gPSBuZXcgTWFwPHN0cmluZywgUmV0dXJuVHlwZTx0eXBlb2YgY3JlYXRlUHJveHlXaXRoQ2FjaGU+PigpO1xuXG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoU1RBVEVfRklMRSkpIHtcbiAgICAgIHZvaWQgZnMucHJvbWlzZXMucmVhZEZpbGUoU1RBVEVfRklMRSwgJ3V0Zi04JylcbiAgICAgIC50aGVuKGNvbnRlbnQgPT4ge1xuICAgICAgICBsb2cuaW5mbygnUmVhZCBjYWNoZSBzdGF0ZSBmaWxlOicsIFNUQVRFX0ZJTEUpO1xuICAgICAgICBwa2dEb3dubG9hZEN0bC5hY3Rpb25EaXNwYXRjaGVyLmxvYWQoSlNPTi5wYXJzZShjb250ZW50KSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgc2h1dGRvd25Ib29rcy5wdXNoKCgpID0+IHtcbiAgICAgIGxvZy5pbmZvKCdTYXZlIGNoYW5nZWQnLCBTVEFURV9GSUxFKTtcbiAgICAgIHJldHVybiBmcy5wcm9taXNlcy53cml0ZUZpbGUoU1RBVEVfRklMRSwgSlNPTi5zdHJpbmdpZnkocGtnRG93bmxvYWRDdGwuZ2V0U3RhdGUoKSwgbnVsbCwgJyAgJykpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJ4Lm1lcmdlKFxuICAgICAgIGFjdGlvbkJ5VHlwZS5mZXRjaFRhcmJhbGwucGlwZShcbiAgICAgICAgb3AubWVyZ2VNYXAoKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICAgIHJldHVybiBwa2dEb3dubG9hZEN0bC5nZXRTdG9yZSgpLnBpcGUoXG4gICAgICAgICAgICBvcC5tYXAocyA9PiBfLmdldChzLCBbcGF5bG9hZC5wa2dOYW1lLCBwYXlsb2FkLnZlcnNpb25dKSksXG4gICAgICAgICAgICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgICAgICAgb3AuZmlsdGVyKHZhbHVlID0+IHZhbHVlICE9IG51bGwpLFxuICAgICAgICAgICAgb3AudGFrZSgxKSxcbiAgICAgICAgICAgIG9wLm1hcCh1cmwgPT4ge1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IHtvcmlnaW4sIGhvc3QsIHBhdGhuYW1lfSA9IG5ldyBVUkwodXJsKTtcbiAgICAgICAgICAgICAgICBsZXQgc2VydmljZSA9IGNhY2hlU3ZjQnlPcmlnaW4uZ2V0KG9yaWdpbik7XG4gICAgICAgICAgICAgICAgaWYgKHNlcnZpY2UgPT0gbnVsbCkge1xuICAgICAgICAgICAgICAgICAgbG9nLmluZm8oJ2NyZWF0ZSBkb3dubG9hZCBwcm94eSBpbnRhbmNlIGZvcicsIG9yaWdpbik7XG4gICAgICAgICAgICAgICAgICBzZXJ2aWNlID0gY3JlYXRlUHJveHlXaXRoQ2FjaGUob3JpZ2luLCB7XG4gICAgICAgICAgICAgICAgICAgIHRhcmdldDogdXJsXG4gICAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgICAgICBQYXRoLmpvaW4odGFyYmFsbERpciwgaG9zdC5yZXBsYWNlKC86L2csICdfJykpLFxuICAgICAgICAgICAgICAgICAgICB7IG1hbnVhbDogdHJ1ZSwgbWVtQ2FjaGVMZW5ndGg6IDAgfSk7XG4gICAgICAgICAgICAgICAgICBjYWNoZVN2Y0J5T3JpZ2luLnNldChvcmlnaW4sIHNlcnZpY2UpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBzZXJ2aWNlLmFjdGlvbkRpc3BhdGNoZXIuaGl0Q2FjaGUoe1xuICAgICAgICAgICAgICAgICAga2V5OiBrZXlPZlVyaShwYXlsb2FkLnJlcS5tZXRob2QsIHBhdGhuYW1lKSxcbiAgICAgICAgICAgICAgICAgIHJlcTogcGF5bG9hZC5yZXEsIHJlczogcGF5bG9hZC5yZXMsXG4gICAgICAgICAgICAgICAgICBuZXh0OiAoKSA9PiB7fVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgbG9nLmVycm9yKCdGYWlsZWQgZm9yIGRvd25sb2FkIFVSTDonICsgdXJsLCBlKTtcbiAgICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICk7XG4gICAgICAgIH0pXG4gICAgICApXG4gICAgKS5waXBlKFxuICAgICAgb3AuaWdub3JlRWxlbWVudHMoKSxcbiAgICAgIG9wLmNhdGNoRXJyb3IoKGVyciwgc3JjKSA9PiB7XG4gICAgICAgIGxvZy5lcnJvcihlcnIpO1xuICAgICAgICByZXR1cm4gc3JjOyAvLyByZS1zdWJzcmliZSBvbiBmYWlsXG4gICAgICB9KVxuICAgICk7XG4gIH0pO1xuXG4gIHZlcnNpb25zQ2FjaGVDdGwuYWN0aW9uRGlzcGF0Y2hlci5jb25maWdUcmFuc2Zvcm1lcih7XG4gICAgcmVtb3RlOiBjcmVhdGVUcmFuc2Zvcm1lcih0cnVlKSxcbiAgICBjYWNoZWQ6IGNyZWF0ZVRyYW5zZm9ybWVyKGZhbHNlKVxuICB9KTtcblxuICBmdW5jdGlvbiBjcmVhdGVUcmFuc2Zvcm1lcih0cmFja1JlbW90ZVVybDogYm9vbGVhbik6IFRyYW5zZm9ybWVyIHtcbiAgICByZXR1cm4gYXN5bmMgKGhlYWRlcnM6IENhY2hlRGF0YVsnaGVhZGVycyddLCByZXFIb3N0OiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICAgICBzb3VyY2U6IE5vZGVKUy5SZWFkYWJsZVN0cmVhbSkgPT4ge1xuICAgICAgbGV0IGZyYWdtZW50cyA9ICcnO1xuICAgICAgbGV0IGJ1Zkxlbmd0aCA9IDA7XG4gICAgICBjb25zdCBzdWJqZWN0ID0gbmV3IHJ4LlJlcGxheVN1YmplY3Q8QnVmZmVyPigpO1xuICAgICAgbGV0IGRlY29tcHJlc3M6IE5vZGVKUy5SZWFkV3JpdGVTdHJlYW0gfCB1bmRlZmluZWQ7XG4gICAgICBsZXQgY29tcHJlc3NlcjogTm9kZUpTLlJlYWRXcml0ZVN0cmVhbSB8IHVuZGVmaW5lZDtcbiAgICAgIGNvbnN0IGVuY29kaW5nSGVhZGVyID0gaGVhZGVycy5maW5kKChbbmFtZV0pID0+IG5hbWUgPT09ICdjb250ZW50LWVuY29kaW5nJyk7XG4gICAgICBjb25zdCBjb250ZW50RW5jb2RpbmcgPSBlbmNvZGluZ0hlYWRlciA/IGVuY29kaW5nSGVhZGVyWzFdIDogJyc7XG4gICAgICBzd2l0Y2ggKGNvbnRlbnRFbmNvZGluZykge1xuICAgICAgICBjYXNlICdicic6XG4gICAgICAgICAgZGVjb21wcmVzcyA9IHpsaWIuY3JlYXRlQnJvdGxpRGVjb21wcmVzcygpO1xuICAgICAgICAgIGNvbXByZXNzZXIgPSB6bGliLmNyZWF0ZUJyb3RsaUNvbXByZXNzKCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vIE9yLCBqdXN0IHVzZSB6bGliLmNyZWF0ZVVuemlwKCkgdG8gaGFuZGxlIGJvdGggb2YgdGhlIGZvbGxvd2luZyBjYXNlczpcbiAgICAgICAgY2FzZSAnZ3ppcCc6XG4gICAgICAgICAgZGVjb21wcmVzcyA9IHpsaWIuY3JlYXRlR3VuemlwKCk7XG4gICAgICAgICAgY29tcHJlc3NlciA9IHpsaWIuY3JlYXRlR3ppcCgpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdkZWZsYXRlJzpcbiAgICAgICAgICBkZWNvbXByZXNzID0gemxpYi5jcmVhdGVJbmZsYXRlKCk7XG4gICAgICAgICAgY29tcHJlc3NlciA9IHpsaWIuY3JlYXRlRGVmbGF0ZSgpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgfVxuICAgICAgY29uc3QgdHJhbnNmb3JtZXJzOiBhbnlbXSA9IGRlY29tcHJlc3MgPyBbZGVjb21wcmVzc10gOiBbXTtcbiAgICAgIGNvbnN0IHByb2Nlc3NUcmFucyA9IG5ldyBUcmFuc2Zvcm0oe1xuICAgICAgICB0cmFuc2Zvcm0oY2h1bmssIF9lbmNvZGUsIGNiKSB7XG4gICAgICAgICAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihjaHVuaykpIHtcbiAgICAgICAgICAgIGZyYWdtZW50cyArPSBjaHVuay50b1N0cmluZygpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmcmFnbWVudHMgKz0gY2h1bmsgYXMgc3RyaW5nO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYigpO1xuICAgICAgICB9LFxuICAgICAgICBmbHVzaChjYikge1xuICAgICAgICAgIGlmIChmcmFnbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gY2IobnVsbCwgJycpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QganNvbiA9IEpTT04ucGFyc2UoZnJhZ21lbnRzKSBhcyBOcG1SZWdpc3RyeVZlcnNpb25Kc29uO1xuICAgICAgICAgICAgY29uc3QgcGFyYW06IHtbdmVyOiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG5cbiAgICAgICAgICAgIGZvciAoY29uc3QgW3ZlciwgdmVyc2lvbkVudHJ5XSBvZiBPYmplY3QuZW50cmllcyhqc29uLnZlcnNpb25zKSkge1xuICAgICAgICAgICAgICBjb25zdCBvcmlnVGFyYmFsbFVybCA9IHBhcmFtW3Zlcl0gPSB2ZXJzaW9uRW50cnkuZGlzdC50YXJiYWxsO1xuICAgICAgICAgICAgICBjb25zdCB1cmxPYmogPSBuZXcgVVJMKG9yaWdUYXJiYWxsVXJsKTtcbiAgICAgICAgICAgICAgY29uc3QgdXJsID0gdmVyc2lvbkVudHJ5LmRpc3QudGFyYmFsbCA9IChyZXFIb3N0IHx8IERFRkFVTFRfSE9TVCkgK1xuICAgICAgICAgICAgICAgIGAke3NlcnZlVGFyYmFsbFBhdGh9LyR7ZW5jb2RlVVJJQ29tcG9uZW50KGpzb24ubmFtZSl9LyR7ZW5jb2RlVVJJQ29tcG9uZW50KHZlcil9JHt1cmxPYmouc2VhcmNofWA7XG4gICAgICAgICAgICAgIGlmICghdXJsLnN0YXJ0c1dpdGgoJ2h0dHAnKSlcbiAgICAgICAgICAgICAgICB2ZXJzaW9uRW50cnkuZGlzdC50YXJiYWxsID0gJ2h0dHA6Ly8nICsgdXJsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRyYWNrUmVtb3RlVXJsKVxuICAgICAgICAgICAgICBwa2dEb3dubG9hZEN0bC5hY3Rpb25EaXNwYXRjaGVyLmFkZCh7cGtnTmFtZToganNvbi5uYW1lLCB2ZXJzaW9uczogcGFyYW19KTtcblxuICAgICAgICAgICAgY2IobnVsbCwgSlNPTi5zdHJpbmdpZnkoanNvbikpO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGxvZy5lcnJvcihmcmFnbWVudHMsIGUpO1xuICAgICAgICAgICAgcmV0dXJuIGNiKG51bGwsICcnKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgdHJhbnNmb3JtZXJzLnB1c2gocHJvY2Vzc1RyYW5zKTtcbiAgICAgIGlmIChjb21wcmVzc2VyKVxuICAgICAgICB0cmFuc2Zvcm1lcnMucHVzaChjb21wcmVzc2VyKTtcblxuICAgICAgdHJhbnNmb3JtZXJzLnB1c2goIG5ldyBXcml0YWJsZSh7XG4gICAgICAgICAgd3JpdGUoY2h1bmtfMSwgX2VuYywgY2JfMikge1xuICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gQnVmZmVyLmlzQnVmZmVyKGNodW5rXzEpID8gY2h1bmtfMSA6IEJ1ZmZlci5mcm9tKGNodW5rXzEgYXMgc3RyaW5nKTtcbiAgICAgICAgICAgIGJ1Zkxlbmd0aCArPSBidWZmZXIubGVuZ3RoO1xuICAgICAgICAgICAgc3ViamVjdC5uZXh0KGJ1ZmZlcik7XG4gICAgICAgICAgICBjYl8yKCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBmaW5hbChjYl8zKSB7XG4gICAgICAgICAgICBzdWJqZWN0LmNvbXBsZXRlKCk7XG4gICAgICAgICAgICBjYl8zKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgKTtcbiAgICAgIC8vIE5vZGVKUyBidWc6IGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlanMvbm9kZS9pc3N1ZXMvNDAxOTE6XG4gICAgICAvLyBzdHJlYW0ucHJvbWlzZXMucGlwZWxpbmUgZG9lc24ndCBzdXBwb3J0IGFycmF5cyBvZiBzdHJlYW1zIHNpbmNlIG5vZGUgMTYuMTBcbiAgICAgIGNvbnN0IGRvbmU6IFByb21pc2U8dW5rbm93bj4gPSAoc3RyZWFtUHJvbS5waXBlbGluZSBhcyBhbnkpKHNvdXJjZSwgLi4udHJhbnNmb3JtZXJzKTtcbiAgICAgIGF3YWl0IGRvbmU7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlbmd0aDogYnVmTGVuZ3RoLFxuICAgICAgICByZWFkYWJsZTogKCkgPT4gbmV3IFJlYWRhYmxlKHtcbiAgICAgICAgICByZWFkKCkge1xuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby10aGlzLWFsaWFzXG4gICAgICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHN1YmplY3Quc3Vic2NyaWJlKHtcbiAgICAgICAgICAgICAgbmV4dChidWYpIHtcbiAgICAgICAgICAgICAgICBzZWxmLnB1c2goYnVmKTtcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgZXJyb3IoZXJyKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5kZXN0cm95KGVycik7XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbXBsZXRlKCkge1xuICAgICAgICAgICAgICAgIHNlbGYucHVzaChudWxsKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgfTtcbiAgICB9O1xuICB9XG59XG4iXX0=