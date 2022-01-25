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
            });
        };
    }
}
exports.default = createNpmRegistryServer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnBtLXJlZ2lzdHJ5LWNhY2hlLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJucG0tcmVnaXN0cnktY2FjaGUtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnREFBd0I7QUFDeEIsbUNBQXFEO0FBQ3JELDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsc0NBQThEO0FBQzlELCtEQUE2RDtBQUM3RCx5Q0FBMkI7QUFDM0IsbURBQXFDO0FBQ3JDLDBDQUE0QjtBQUU1Qiw4RkFBb0c7QUFFcEcsbURBQStEO0FBRS9ELE1BQU0sR0FBRyxHQUFHLElBQUEsZ0JBQVEsRUFBQyxVQUFVLENBQUMsQ0FBQztBQU9qQyxTQUF3Qix1QkFBdUIsQ0FBQyxHQUFxQjs7SUFDbkUsTUFBTSxPQUFPLEdBQUcsSUFBQSxjQUFNLEdBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLHNCQUFzQixDQUFDO0lBQ3pFLElBQUksT0FBTyxJQUFJLElBQUk7UUFDakIsT0FBTztJQUNULE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyxtQkFBbUIsSUFBQSxjQUFNLEdBQUUsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBQSxjQUFNLEdBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDNUcsTUFBTSxVQUFVLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxJQUFJLGNBQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUseUJBQXlCLENBQUMsQ0FBQztJQUUxRyxNQUFNLFNBQVMsR0FBRyxjQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUMzRSxHQUFHLENBQUMsSUFBSSxDQUFDLG1D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QUNwQixDQUFDO2dDQUNELFFBQVE7b0NBQ04sSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQ0FDbEIsQ0FBQzs2QkFDRixDQUFDLENBQUM7d0JBQ0gsQ0FBQztxQkFDRixDQUFDO2lCQUNILENBQUM7WUFDSixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDO0FBOU5ELDBDQThOQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtUcmFuc2Zvcm0sIFdyaXRhYmxlLCBSZWFkYWJsZX0gZnJvbSAnc3RyZWFtJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgemxpYiBmcm9tICd6bGliJztcbmltcG9ydCB7Y29uZmlnLCBsb2c0RmlsZSwgRXh0ZW5zaW9uQ29udGV4dH0gZnJvbSAnQHdmaC9wbGluayc7XG5pbXBvcnQge3NodXRkb3duSG9va3N9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvYXBwLXNlcnZlcic7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7UmVxdWVzdCwgUmVzcG9uc2V9IGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IHtjcmVhdGVTbGljZSwgY2FzdEJ5QWN0aW9uVHlwZX0gZnJvbSAnQHdmaC9yZWR1eC10b29sa2l0LW9ic2VydmFibGUvZGlzdC90aW55LXJlZHV4LXRvb2xraXQnO1xuaW1wb3J0IHtDYWNoZURhdGEsIE5wbVJlZ2lzdHJ5VmVyc2lvbkpzb24sIFRhcmJhbGxzSW5mbywgVHJhbnNmb3JtZXJ9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtjcmVhdGVQcm94eVdpdGhDYWNoZSwga2V5T2ZVcml9IGZyb20gJy4vY2FjaGUtc2VydmljZSc7XG5cbmNvbnN0IGxvZyA9IGxvZzRGaWxlKF9fZmlsZW5hbWUpO1xuXG50eXBlIFBrZ0Rvd25sb2FkUmVxdWVzdFBhcmFtcyA9IHtcbiAgcGtnTmFtZTogc3RyaW5nO1xuICB2ZXJzaW9uOiBzdHJpbmc7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjcmVhdGVOcG1SZWdpc3RyeVNlcnZlcihhcGk6IEV4dGVuc2lvbkNvbnRleHQpIHtcbiAgY29uc3Qgc2V0dGluZyA9IGNvbmZpZygpWydAd2ZoL2Fzc2V0cy1wcm9jZXNzZXInXS5ucG1SZWdpc3RyeUNhY2hlU2VydmVyO1xuICBpZiAoc2V0dGluZyA9PSBudWxsKVxuICAgIHJldHVybjtcbiAgY29uc3QgREVGQVVMVF9IT1NUID0gc2V0dGluZy5ob3N0IHx8IChgaHR0cDovL2xvY2FsaG9zdCR7Y29uZmlnKCkucG9ydCAhPT0gODAgPyAnOicgKyBjb25maWcoKS5wb3J0IDogJyd9YCk7XG4gIGNvbnN0IFNUQVRFX0ZJTEUgPSBQYXRoLnJlc29sdmUoc2V0dGluZy5jYWNoZURpciB8fCBjb25maWcucmVzb2x2ZSgnZGVzdERpcicpLCAnbnBtLXJlZ2lzdHJ5LWNhY2hlLmpzb24nKTtcblxuICBjb25zdCBzZXJ2ZVBhdGggPSBQYXRoLnBvc2l4LmpvaW4oc2V0dGluZy5wYXRoIHx8ICcvcmVnaXN0cnknLCAndmVyc2lvbnMnKTtcbiAgbG9nLmluZm8oJ05QTSByZWdpc3RyeSBjYWNoZSBpcyBzZXJ2aW5nIGF0ICcsIHNlcnZlUGF0aCk7XG4gIGNvbnN0IHZlcnNpb25zQ2FjaGVDdGwgPSBjcmVhdGVQcm94eVdpdGhDYWNoZShzZXJ2ZVBhdGgsIHtcbiAgICAgIHNlbGZIYW5kbGVSZXNwb25zZTogdHJ1ZSxcbiAgICAgIHRhcmdldDogc2V0dGluZy5yZWdpc3RyeSB8fCAnaHR0cHM6Ly9yZWdpc3RyeS5ucG1qcy5vcmcnXG4gICAgfSxcbiAgICBQYXRoLnBvc2l4LmpvaW4oc2V0dGluZy5jYWNoZURpciB8fCBjb25maWcucmVzb2x2ZSgnZGVzdERpcicpLCAndmVyc2lvbnMnKVxuICApO1xuXG4gIGNvbnN0IHRhcmJhbGxEaXIgPSBQYXRoLnJlc29sdmUoc2V0dGluZy5jYWNoZURpciB8fCBjb25maWcucmVzb2x2ZSgnZGVzdERpcicpLCAnZG93bmxvYWQtdGFyYmFsbHMnKTtcbiAgY29uc3QgcGtnRG93bmxvYWRSb3V0ZXIgPSBhcGkuZXhwcmVzcy5Sb3V0ZXIoKTtcbiAgY29uc3Qgc2VydmVUYXJiYWxsUGF0aCA9IFBhdGgucG9zaXguam9pbihzZXR0aW5nLnBhdGggfHwgJy9yZWdpc3RyeScsICdfdGFyYmFsbHMnKTtcblxuICBhcGkudXNlKHNlcnZlVGFyYmFsbFBhdGgsIHBrZ0Rvd25sb2FkUm91dGVyKTtcbiAgcGtnRG93bmxvYWRSb3V0ZXIuZ2V0KCcvOnBrZ05hbWUvOnZlcnNpb24nLCAocmVxLCByZXMpID0+IHtcbiAgICBsb2cuaW5mbygnaW5jb21pbmcgcmVxdWVzdCBkb3dubG9hZCB0YXJiYWxsJywgcmVxLnVybCk7XG4gICAgcGtnRG93bmxvYWRDdGwuYWN0aW9uRGlzcGF0Y2hlci5mZXRjaFRhcmJhbGwoe1xuICAgICAgcmVxLCByZXMsIHBrZ05hbWU6IHJlcS5wYXJhbXMucGtnTmFtZSwgdmVyc2lvbjogcmVxLnBhcmFtcy52ZXJzaW9ufSk7XG4gIH0pO1xuXG4gIGNvbnN0IHBrZ0Rvd25sb2FkQ3RsID0gY3JlYXRlU2xpY2Uoe1xuICAgIG5hbWU6ICdwa2dDYWNoZScsXG4gICAgaW5pdGlhbFN0YXRlOiB7fSBhcyBUYXJiYWxsc0luZm8sXG4gICAgcmVkdWNlcnM6IHtcbiAgICAgIGxvYWQoczogVGFyYmFsbHNJbmZvLCBkYXRhOiBUYXJiYWxsc0luZm8pIHtcbiAgICAgICAgT2JqZWN0LmFzc2lnbihzLCBkYXRhKTtcbiAgICAgIH0sXG4gICAgICBhZGQoczogVGFyYmFsbHNJbmZvLCBwYXlsb2FkOiB7cGtnTmFtZTogc3RyaW5nOyB2ZXJzaW9uczoge1t2ZXJzaW9uOiBzdHJpbmddOiBzdHJpbmd9fSkge1xuICAgICAgICBsZXQgcGtnRW50cnkgPSBzW3BheWxvYWQucGtnTmFtZV07XG4gICAgICAgIGlmIChwa2dFbnRyeSA9PSBudWxsKVxuICAgICAgICAgIHNbcGF5bG9hZC5wa2dOYW1lXSA9IHBheWxvYWQudmVyc2lvbnM7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBzW3BheWxvYWQucGtnTmFtZV0gPSB7Li4ucGtnRW50cnksIC4uLnBheWxvYWQudmVyc2lvbnN9O1xuICAgICAgfSxcbiAgICAgIGZldGNoVGFyYmFsbChfczogVGFyYmFsbHNJbmZvLFxuICAgICAgICBfcGF5bG9hZDoge3JlcTogUmVxdWVzdDxQa2dEb3dubG9hZFJlcXVlc3RQYXJhbXM+OyByZXM6IFJlc3BvbnNlOyBwa2dOYW1lOiBzdHJpbmc7IHZlcnNpb246IHN0cmluZ30pIHtcbiAgICAgIH1cbiAgICB9LFxuICAgIGRlYnVnQWN0aW9uT25seTogISFjb25maWcoKS5jbGlPcHRpb25zPy52ZXJib3NlXG4gIH0pO1xuXG4gIHBrZ0Rvd25sb2FkQ3RsLmVwaWMoYWN0aW9uJCA9PiB7XG4gICAgY29uc3QgYWN0aW9uQnlUeXBlID0gY2FzdEJ5QWN0aW9uVHlwZShwa2dEb3dubG9hZEN0bC5hY3Rpb25zLCBhY3Rpb24kKTtcbiAgICAvLyBjb25zdCBmZXRjaEFjdGlvblN0YXRlID0gbmV3IE1hcDxzdHJpbmcsIFJlc3BvbnNlW10+KCk7XG4gICAgLy8gbWFwIGtleSBpcyBob3N0IG5hbWUgb2YgcmVtb3RlIHRhcmJhbGwgc2VydmVyXG4gICAgY29uc3QgY2FjaGVTdmNCeU9yaWdpbiA9IG5ldyBNYXA8c3RyaW5nLCBSZXR1cm5UeXBlPHR5cGVvZiBjcmVhdGVQcm94eVdpdGhDYWNoZT4+KCk7XG5cbiAgICBpZiAoZnMuZXhpc3RzU3luYyhTVEFURV9GSUxFKSkge1xuICAgICAgdm9pZCBmcy5wcm9taXNlcy5yZWFkRmlsZShTVEFURV9GSUxFLCAndXRmLTgnKVxuICAgICAgLnRoZW4oY29udGVudCA9PiB7XG4gICAgICAgIGxvZy5pbmZvKCdSZWFkIGNhY2hlIHN0YXRlIGZpbGU6JywgU1RBVEVfRklMRSk7XG4gICAgICAgIHBrZ0Rvd25sb2FkQ3RsLmFjdGlvbkRpc3BhdGNoZXIubG9hZChKU09OLnBhcnNlKGNvbnRlbnQpKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICBzaHV0ZG93bkhvb2tzLnB1c2goKCkgPT4ge1xuICAgICAgbG9nLmluZm8oJ1NhdmUgY2hhbmdlZCcsIFNUQVRFX0ZJTEUpO1xuICAgICAgcmV0dXJuIGZzLnByb21pc2VzLndyaXRlRmlsZShTVEFURV9GSUxFLCBKU09OLnN0cmluZ2lmeShwa2dEb3dubG9hZEN0bC5nZXRTdGF0ZSgpLCBudWxsLCAnICAnKSk7XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcngubWVyZ2UoXG4gICAgICAgYWN0aW9uQnlUeXBlLmZldGNoVGFyYmFsbC5waXBlKFxuICAgICAgICBvcC5tZXJnZU1hcCgoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHBrZ0Rvd25sb2FkQ3RsLmdldFN0b3JlKCkucGlwZShcbiAgICAgICAgICAgIG9wLm1hcChzID0+IF8uZ2V0KHMsIFtwYXlsb2FkLnBrZ05hbWUsIHBheWxvYWQudmVyc2lvbl0pKSxcbiAgICAgICAgICAgIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICAgICAgICBvcC5maWx0ZXIodmFsdWUgPT4gdmFsdWUgIT0gbnVsbCksXG4gICAgICAgICAgICBvcC50YWtlKDEpLFxuICAgICAgICAgICAgb3AubWFwKHVybCA9PiB7XG4gICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3Qge29yaWdpbiwgaG9zdCwgcGF0aG5hbWV9ID0gbmV3IFVSTCh1cmwpO1xuICAgICAgICAgICAgICAgIGxldCBzZXJ2aWNlID0gY2FjaGVTdmNCeU9yaWdpbi5nZXQob3JpZ2luKTtcbiAgICAgICAgICAgICAgICBpZiAoc2VydmljZSA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgICBsb2cuaW5mbygnY3JlYXRlIGRvd25sb2FkIHByb3h5IGludGFuY2UgZm9yJywgb3JpZ2luKTtcbiAgICAgICAgICAgICAgICAgIHNlcnZpY2UgPSBjcmVhdGVQcm94eVdpdGhDYWNoZShvcmlnaW4sIHtcbiAgICAgICAgICAgICAgICAgICAgdGFyZ2V0OiB1cmxcbiAgICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgICAgICAgIFBhdGguam9pbih0YXJiYWxsRGlyLCBob3N0LnJlcGxhY2UoLzovZywgJ18nKSksXG4gICAgICAgICAgICAgICAgICAgIHsgbWFudWFsOiB0cnVlLCBtZW1DYWNoZUxlbmd0aDogMCB9KTtcbiAgICAgICAgICAgICAgICAgIGNhY2hlU3ZjQnlPcmlnaW4uc2V0KG9yaWdpbiwgc2VydmljZSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHNlcnZpY2UuYWN0aW9uRGlzcGF0Y2hlci5oaXRDYWNoZSh7XG4gICAgICAgICAgICAgICAgICBrZXk6IGtleU9mVXJpKHBheWxvYWQucmVxLm1ldGhvZCwgcGF0aG5hbWUpLFxuICAgICAgICAgICAgICAgICAgcmVxOiBwYXlsb2FkLnJlcSwgcmVzOiBwYXlsb2FkLnJlcyxcbiAgICAgICAgICAgICAgICAgIG5leHQ6ICgpID0+IHt9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgICAgICBsb2cuZXJyb3IoJ0ZhaWxlZCBmb3IgZG93bmxvYWQgVVJMOicgKyB1cmwsIGUpO1xuICAgICAgICAgICAgICAgIHRocm93IGU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgKTtcbiAgICAgICAgfSlcbiAgICAgIClcbiAgICApLnBpcGUoXG4gICAgICBvcC5pZ25vcmVFbGVtZW50cygpLFxuICAgICAgb3AuY2F0Y2hFcnJvcigoZXJyLCBzcmMpID0+IHtcbiAgICAgICAgbG9nLmVycm9yKGVycik7XG4gICAgICAgIHJldHVybiBzcmM7IC8vIHJlLXN1YnNyaWJlIG9uIGZhaWxcbiAgICAgIH0pXG4gICAgKTtcbiAgfSk7XG5cbiAgdmVyc2lvbnNDYWNoZUN0bC5hY3Rpb25EaXNwYXRjaGVyLmNvbmZpZ1RyYW5zZm9ybWVyKHtcbiAgICByZW1vdGU6IGNyZWF0ZVRyYW5zZm9ybWVyKHRydWUpLFxuICAgIGNhY2hlZDogY3JlYXRlVHJhbnNmb3JtZXIoZmFsc2UpXG4gIH0pO1xuXG4gIGZ1bmN0aW9uIGNyZWF0ZVRyYW5zZm9ybWVyKHRyYWNrUmVtb3RlVXJsOiBib29sZWFuKTogVHJhbnNmb3JtZXIge1xuICAgIHJldHVybiAoaGVhZGVyczogQ2FjaGVEYXRhWydoZWFkZXJzJ10sIHJlcUhvc3Q6IHN0cmluZyB8IHVuZGVmaW5lZCxcbiAgICAgICAgICAgc291cmNlOiBOb2RlSlMuUmVhZGFibGVTdHJlYW0pID0+IHtcbiAgICAgIGxldCBmcmFnbWVudHMgPSAnJztcbiAgICAgIGxldCBidWZMZW5ndGggPSAwO1xuICAgICAgY29uc3Qgc3ViamVjdCA9IG5ldyByeC5SZXBsYXlTdWJqZWN0PEJ1ZmZlcj4oKTtcbiAgICAgIGxldCBkZWNvbXByZXNzOiBOb2RlSlMuUmVhZFdyaXRlU3RyZWFtIHwgdW5kZWZpbmVkO1xuICAgICAgbGV0IGNvbXByZXNzZXI6IE5vZGVKUy5SZWFkV3JpdGVTdHJlYW0gfCB1bmRlZmluZWQ7XG4gICAgICBjb25zdCBlbmNvZGluZ0hlYWRlciA9IGhlYWRlcnMuZmluZCgoW25hbWVdKSA9PiBuYW1lID09PSAnY29udGVudC1lbmNvZGluZycpO1xuICAgICAgY29uc3QgY29udGVudEVuY29kaW5nID0gZW5jb2RpbmdIZWFkZXIgPyBlbmNvZGluZ0hlYWRlclsxXSA6ICcnO1xuICAgICAgc3dpdGNoIChjb250ZW50RW5jb2RpbmcpIHtcbiAgICAgICAgY2FzZSAnYnInOlxuICAgICAgICAgIGRlY29tcHJlc3MgPSB6bGliLmNyZWF0ZUJyb3RsaURlY29tcHJlc3MoKTtcbiAgICAgICAgICBjb21wcmVzc2VyID0gemxpYi5jcmVhdGVCcm90bGlDb21wcmVzcygpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBPciwganVzdCB1c2UgemxpYi5jcmVhdGVVbnppcCgpIHRvIGhhbmRsZSBib3RoIG9mIHRoZSBmb2xsb3dpbmcgY2FzZXM6XG4gICAgICAgIGNhc2UgJ2d6aXAnOlxuICAgICAgICAgIGRlY29tcHJlc3MgPSB6bGliLmNyZWF0ZUd1bnppcCgpO1xuICAgICAgICAgIGNvbXByZXNzZXIgPSB6bGliLmNyZWF0ZUd6aXAoKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnZGVmbGF0ZSc6XG4gICAgICAgICAgZGVjb21wcmVzcyA9IHpsaWIuY3JlYXRlSW5mbGF0ZSgpO1xuICAgICAgICAgIGNvbXByZXNzZXIgPSB6bGliLmNyZWF0ZURlZmxhdGUoKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgIH1cbiAgICAgIGNvbnN0IHRyYW5zZm9ybWVycyA9IGRlY29tcHJlc3MgPyBbZGVjb21wcmVzc10gOiBbXTtcbiAgICAgIGNvbnN0IHByb2Nlc3NUcmFucyA9IG5ldyBUcmFuc2Zvcm0oe1xuICAgICAgICB0cmFuc2Zvcm0oY2h1bmssIF9lbmNvZGUsIGNiKSB7XG4gICAgICAgICAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihjaHVuaykpIHtcbiAgICAgICAgICAgIGZyYWdtZW50cyArPSBjaHVuay50b1N0cmluZygpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmcmFnbWVudHMgKz0gY2h1bmsgYXMgc3RyaW5nO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYigpO1xuICAgICAgICB9LFxuICAgICAgICBmbHVzaChjYikge1xuICAgICAgICAgIGlmIChmcmFnbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gY2IobnVsbCwgJycpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QganNvbiA9IEpTT04ucGFyc2UoZnJhZ21lbnRzKSBhcyBOcG1SZWdpc3RyeVZlcnNpb25Kc29uO1xuICAgICAgICAgICAgY29uc3QgcGFyYW06IHtbdmVyOiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG5cbiAgICAgICAgICAgIGZvciAoY29uc3QgW3ZlciwgdmVyc2lvbkVudHJ5XSBvZiBPYmplY3QuZW50cmllcyhqc29uLnZlcnNpb25zKSkge1xuICAgICAgICAgICAgICBjb25zdCBvcmlnVGFyYmFsbFVybCA9IHBhcmFtW3Zlcl0gPSB2ZXJzaW9uRW50cnkuZGlzdC50YXJiYWxsO1xuICAgICAgICAgICAgICBjb25zdCB1cmxPYmogPSBuZXcgVVJMKG9yaWdUYXJiYWxsVXJsKTtcbiAgICAgICAgICAgICAgY29uc3QgdXJsID0gdmVyc2lvbkVudHJ5LmRpc3QudGFyYmFsbCA9IChyZXFIb3N0IHx8IERFRkFVTFRfSE9TVCkgK1xuICAgICAgICAgICAgICAgIGAke3NlcnZlVGFyYmFsbFBhdGh9LyR7ZW5jb2RlVVJJQ29tcG9uZW50KGpzb24ubmFtZSl9LyR7ZW5jb2RlVVJJQ29tcG9uZW50KHZlcil9JHt1cmxPYmouc2VhcmNofWA7XG4gICAgICAgICAgICAgIGlmICghdXJsLnN0YXJ0c1dpdGgoJ2h0dHAnKSlcbiAgICAgICAgICAgICAgICB2ZXJzaW9uRW50cnkuZGlzdC50YXJiYWxsID0gJ2h0dHA6Ly8nICsgdXJsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRyYWNrUmVtb3RlVXJsKVxuICAgICAgICAgICAgICBwa2dEb3dubG9hZEN0bC5hY3Rpb25EaXNwYXRjaGVyLmFkZCh7cGtnTmFtZToganNvbi5uYW1lLCB2ZXJzaW9uczogcGFyYW19KTtcblxuICAgICAgICAgICAgY2IobnVsbCwgSlNPTi5zdHJpbmdpZnkoanNvbikpO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGxvZy5lcnJvcihmcmFnbWVudHMsIGUpO1xuICAgICAgICAgICAgcmV0dXJuIGNiKG51bGwsICcnKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgdHJhbnNmb3JtZXJzLnB1c2gocHJvY2Vzc1RyYW5zKTtcbiAgICAgIGlmIChjb21wcmVzc2VyKVxuICAgICAgICB0cmFuc2Zvcm1lcnMucHVzaChjb21wcmVzc2VyKTtcbiAgICAgIC8vIE5vZGVKUyBidWc6IGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlanMvbm9kZS9pc3N1ZXMvNDAxOTFcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWNhbGxcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxudW1iZXI+KHJlc29sdmUgPT4ge1xuICAgICAgICAodHJhbnNmb3JtZXJzIGFzIEFycmF5PE5vZGVKUy5SZWFkV3JpdGVTdHJlYW0gfCBOb2RlSlMuV3JpdGFibGVTdHJlYW0+KS5jb25jYXQobmV3IFdyaXRhYmxlKHtcbiAgICAgICAgICB3cml0ZShjaHVuaywgZW5jLCBjYikge1xuICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gQnVmZmVyLmlzQnVmZmVyKGNodW5rKSA/IGNodW5rIDogQnVmZmVyLmZyb20oY2h1bmspO1xuICAgICAgICAgICAgYnVmTGVuZ3RoICs9IGJ1ZmZlci5sZW5ndGg7XG4gICAgICAgICAgICBzdWJqZWN0Lm5leHQoYnVmZmVyKTtcbiAgICAgICAgICAgIGNiKCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBmaW5hbChjYikge1xuICAgICAgICAgICAgc3ViamVjdC5jb21wbGV0ZSgpO1xuICAgICAgICAgICAgY2IoKTtcbiAgICAgICAgICAgIHJlc29sdmUoYnVmTGVuZ3RoKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pKVxuICAgICAgICAucmVkdWNlKChwcmV2LCBjdXJyKSA9PiBwcmV2LnBpcGUoY3VycikgYXMgTm9kZUpTLlJlYWRhYmxlU3RyZWFtLCBzb3VyY2UpO1xuICAgICAgfSlcbiAgICAgIC50aGVuKGJ1Zkxlbmd0aCA9PiB7XG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICBsZW5ndGg6IGJ1Zkxlbmd0aCxcbiAgICAgICAgICByZWFkYWJsZTogKCkgPT4gbmV3IFJlYWRhYmxlKHtcbiAgICAgICAgICAgIHJlYWQoKSB7XG4gICAgICAgICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdGhpcy1hbGlhc1xuICAgICAgICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgICAgICAgc3ViamVjdC5zdWJzY3JpYmUoe1xuICAgICAgICAgICAgICBuZXh0KGJ1Zikge1xuICAgICAgICAgICAgICAgIHNlbGYucHVzaChidWYpO1xuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBlcnJvcihlcnIpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmRlc3Ryb3koZXJyKTtcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY29tcGxldGUoKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5wdXNoKG51bGwpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KVxuICAgICAgICB9O1xuICAgICAgfSk7XG4gICAgfTtcbiAgfVxufVxuIl19