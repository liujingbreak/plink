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
        log.info('incoming request download tarball', req.params.pkgName);
        pkgDownloadCtl.actionDispatcher.fetchTarball({ req, res, pkgName: req.params.pkgName, version: req.params.version });
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
        debug: !!((_a = (0, plink_1.config)().cliOptions) === null || _a === void 0 ? void 0 : _a.verbose)
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
                    const { origin, pathname } = new URL(url);
                    let service = cacheSvcByOrigin.get(origin);
                    if (service == null) {
                        log.info('create download proxy intance for', origin);
                        service = (0, cache_service_1.createProxyWithCache)(origin, origin, tarballDir, { manual: true });
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
        remote: [createTransformer(true)],
        cached: [createTransformer(false)]
    });
    function createTransformer(trackRemoteUrl) {
        return (headers, reqHost) => {
            let buffer = '';
            let decompress;
            let compresser;
            const encodingHeader = headers.find(([name, value]) => name === 'content-encoding');
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
                        buffer += chunk.toString();
                    }
                    else {
                        buffer += chunk;
                    }
                    cb();
                },
                flush(cb) {
                    try {
                        const json = JSON.parse(buffer);
                        const param = {};
                        for (const [ver, versionEntry] of Object.entries(json.versions)) {
                            param[ver] = versionEntry.dist.tarball;
                            versionEntry.dist.tarball = (reqHost || DEFAULT_HOST) + `${serveTarballPath}/${encodeURIComponent(json.name)}/${encodeURIComponent(ver)}`;
                            // log.info('rewrite tarball download URL to ' + versionEntry.dist.tarball);
                        }
                        if (trackRemoteUrl)
                            pkgDownloadCtl.actionDispatcher.add({ pkgName: json.name, versions: param });
                        cb(null, JSON.stringify(json));
                    }
                    catch (e) {
                        log.error(e);
                        return cb(e);
                    }
                }
            });
            transformers.push(processTrans);
            if (compresser)
                transformers.push(compresser);
            return transformers;
        };
    }
}
exports.default = createNpmRegistryServer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnBtLXJlZ2lzdHJ5LWNhY2hlLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJucG0tcmVnaXN0cnktY2FjaGUtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnREFBd0I7QUFDeEIsbUNBQWlDO0FBQ2pDLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsc0NBQThEO0FBQzlELCtEQUE2RDtBQUM3RCx5Q0FBMkI7QUFDM0IsbURBQXFDO0FBQ3JDLDBDQUE0QjtBQUU1Qiw4RkFBb0c7QUFFcEcsbURBQStEO0FBRS9ELE1BQU0sR0FBRyxHQUFHLElBQUEsZ0JBQVEsRUFBQyxVQUFVLENBQUMsQ0FBQztBQU9qQyxTQUF3Qix1QkFBdUIsQ0FBQyxHQUFxQjs7SUFDbkUsTUFBTSxPQUFPLEdBQUcsSUFBQSxjQUFNLEdBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLHNCQUFzQixDQUFDO0lBQ3pFLElBQUksT0FBTyxJQUFJLElBQUk7UUFDakIsT0FBTztJQUNULE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxJQUFJLElBQUksQ0FBQyxtQkFBbUIsSUFBQSxjQUFNLEdBQUUsQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsSUFBQSxjQUFNLEdBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFDNUcsTUFBTSxVQUFVLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxJQUFJLGNBQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUseUJBQXlCLENBQUMsQ0FBQztJQUUxRyxNQUFNLFNBQVMsR0FBRyxjQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUMzRSxHQUFHLENBQUMsSUFBSSxDQUFDLG1D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QUksTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEVBQUU7NEJBQy9ELEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQzs0QkFDdkMsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxPQUFPLElBQUksWUFBWSxDQUFDLEdBQUcsR0FBRyxnQkFBZ0IsSUFBSSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksa0JBQWtCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQzs0QkFDMUksNEVBQTRFO3lCQUM3RTt3QkFDRCxJQUFJLGNBQWM7NEJBQ2hCLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsRUFBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFDLENBQUMsQ0FBQzt3QkFFN0UsRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7cUJBQ2hDO29CQUFDLE9BQU8sQ0FBQyxFQUFFO3dCQUNWLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7d0JBQ2IsT0FBTyxFQUFFLENBQUMsQ0FBVSxDQUFDLENBQUM7cUJBQ3ZCO2dCQUNILENBQUM7YUFDRixDQUFDLENBQUM7WUFDSCxZQUFZLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ2hDLElBQUksVUFBVTtnQkFDWixZQUFZLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2hDLE9BQU8sWUFBWSxDQUFDO1FBQ3RCLENBQUMsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDO0FBdExELDBDQXNMQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtUcmFuc2Zvcm19IGZyb20gJ3N0cmVhbSc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHpsaWIgZnJvbSAnemxpYic7XG5pbXBvcnQge2NvbmZpZywgbG9nNEZpbGUsIEV4dGVuc2lvbkNvbnRleHR9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IHtzaHV0ZG93bkhvb2tzfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L2FwcC1zZXJ2ZXInO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge1JlcXVlc3QsIFJlc3BvbnNlfSBmcm9tICdleHByZXNzJztcbmltcG9ydCB7Y3JlYXRlU2xpY2UsIGNhc3RCeUFjdGlvblR5cGV9IGZyb20gJ0B3ZmgvcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlL2Rpc3QvdGlueS1yZWR1eC10b29sa2l0JztcbmltcG9ydCB7Q2FjaGVEYXRhLCBOcG1SZWdpc3RyeVZlcnNpb25Kc29uLCBUYXJiYWxsc0luZm99IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtjcmVhdGVQcm94eVdpdGhDYWNoZSwga2V5T2ZVcml9IGZyb20gJy4vY2FjaGUtc2VydmljZSc7XG5cbmNvbnN0IGxvZyA9IGxvZzRGaWxlKF9fZmlsZW5hbWUpO1xuXG50eXBlIFBrZ0Rvd25sb2FkUmVxdWVzdFBhcmFtcyA9IHtcbiAgcGtnTmFtZTogc3RyaW5nO1xuICB2ZXJzaW9uOiBzdHJpbmc7XG59O1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjcmVhdGVOcG1SZWdpc3RyeVNlcnZlcihhcGk6IEV4dGVuc2lvbkNvbnRleHQpIHtcbiAgY29uc3Qgc2V0dGluZyA9IGNvbmZpZygpWydAd2ZoL2Fzc2V0cy1wcm9jZXNzZXInXS5ucG1SZWdpc3RyeUNhY2hlU2VydmVyO1xuICBpZiAoc2V0dGluZyA9PSBudWxsKVxuICAgIHJldHVybjtcbiAgY29uc3QgREVGQVVMVF9IT1NUID0gc2V0dGluZy5ob3N0IHx8IChgaHR0cDovL2xvY2FsaG9zdCR7Y29uZmlnKCkucG9ydCAhPT0gODAgPyAnOicgKyBjb25maWcoKS5wb3J0IDogJyd9YCk7XG4gIGNvbnN0IFNUQVRFX0ZJTEUgPSBQYXRoLnJlc29sdmUoc2V0dGluZy5jYWNoZURpciB8fCBjb25maWcucmVzb2x2ZSgnZGVzdERpcicpLCAnbnBtLXJlZ2lzdHJ5LWNhY2hlLmpzb24nKTtcblxuICBjb25zdCBzZXJ2ZVBhdGggPSBQYXRoLnBvc2l4LmpvaW4oc2V0dGluZy5wYXRoIHx8ICcvcmVnaXN0cnknLCAndmVyc2lvbnMnKTtcbiAgbG9nLmluZm8oJ05QTSByZWdpc3RyeSBjYWNoZSBpcyBzZXJ2aW5nIGF0ICcsIHNlcnZlUGF0aCk7XG4gIGNvbnN0IHZlcnNpb25zQ2FjaGVDdGwgPSBjcmVhdGVQcm94eVdpdGhDYWNoZShzZXJ2ZVBhdGgsXG4gICAgc2V0dGluZy5yZWdpc3RyeSB8fCAnaHR0cHM6Ly9yZWdpc3RyeS5ucG1qcy5vcmcnLFxuICAgIFBhdGgucG9zaXguam9pbihzZXR0aW5nLmNhY2hlRGlyIHx8IGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJyksICd2ZXJzaW9ucycpXG4gICk7XG5cbiAgY29uc3QgdGFyYmFsbERpciA9IFBhdGgucmVzb2x2ZShzZXR0aW5nLmNhY2hlRGlyIHx8IGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJyksICdkb3dubG9hZC10YXJiYWxscycpO1xuXG4gIGNvbnN0IHBrZ0Rvd25sb2FkUm91dGVyID0gYXBpLmV4cHJlc3MuUm91dGVyKCk7XG5cbiAgY29uc3Qgc2VydmVUYXJiYWxsUGF0aCA9IFBhdGgucG9zaXguam9pbihzZXR0aW5nLnBhdGggfHwgJy9yZWdpc3RyeScsICdfdGFyYmFsbHMnKTtcblxuICBhcGkudXNlKHNlcnZlVGFyYmFsbFBhdGgsIHBrZ0Rvd25sb2FkUm91dGVyKTtcbiAgcGtnRG93bmxvYWRSb3V0ZXIuZ2V0KCcvOnBrZ05hbWUvOnZlcnNpb24nLCAocmVxLCByZXMpID0+IHtcbiAgICBsb2cuaW5mbygnaW5jb21pbmcgcmVxdWVzdCBkb3dubG9hZCB0YXJiYWxsJywgcmVxLnBhcmFtcy5wa2dOYW1lKTtcbiAgICBwa2dEb3dubG9hZEN0bC5hY3Rpb25EaXNwYXRjaGVyLmZldGNoVGFyYmFsbCh7cmVxLCByZXMsIHBrZ05hbWU6IHJlcS5wYXJhbXMucGtnTmFtZSwgdmVyc2lvbjogcmVxLnBhcmFtcy52ZXJzaW9ufSk7XG4gIH0pO1xuXG4gIGNvbnN0IHBrZ0Rvd25sb2FkQ3RsID0gY3JlYXRlU2xpY2Uoe1xuICAgIG5hbWU6ICdwa2dDYWNoZScsXG4gICAgaW5pdGlhbFN0YXRlOiB7fSBhcyBUYXJiYWxsc0luZm8sXG4gICAgcmVkdWNlcnM6IHtcbiAgICAgIGxvYWQoczogVGFyYmFsbHNJbmZvLCBkYXRhOiBUYXJiYWxsc0luZm8pIHtcbiAgICAgICAgT2JqZWN0LmFzc2lnbihzLCBkYXRhKTtcbiAgICAgIH0sXG4gICAgICBhZGQoczogVGFyYmFsbHNJbmZvLCBwYXlsb2FkOiB7cGtnTmFtZTogc3RyaW5nOyB2ZXJzaW9uczoge1t2ZXJzaW9uOiBzdHJpbmddOiBzdHJpbmd9fSkge1xuICAgICAgICBsZXQgcGtnRW50cnkgPSBzW3BheWxvYWQucGtnTmFtZV07XG4gICAgICAgIGlmIChwa2dFbnRyeSA9PSBudWxsKVxuICAgICAgICAgIHNbcGF5bG9hZC5wa2dOYW1lXSA9IHBheWxvYWQudmVyc2lvbnM7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBzW3BheWxvYWQucGtnTmFtZV0gPSB7Li4ucGtnRW50cnksIC4uLnBheWxvYWQudmVyc2lvbnN9O1xuICAgICAgfSxcbiAgICAgIGZldGNoVGFyYmFsbChfczogVGFyYmFsbHNJbmZvLFxuICAgICAgICBfcGF5bG9hZDoge3JlcTogUmVxdWVzdDxQa2dEb3dubG9hZFJlcXVlc3RQYXJhbXM+OyByZXM6IFJlc3BvbnNlOyBwa2dOYW1lOiBzdHJpbmc7IHZlcnNpb246IHN0cmluZ30pIHtcbiAgICAgIH1cbiAgICB9LFxuICAgIGRlYnVnOiAhIWNvbmZpZygpLmNsaU9wdGlvbnM/LnZlcmJvc2VcbiAgfSk7XG5cbiAgcGtnRG93bmxvYWRDdGwuZXBpYyhhY3Rpb24kID0+IHtcbiAgICBjb25zdCBhY3Rpb25CeVR5cGUgPSBjYXN0QnlBY3Rpb25UeXBlKHBrZ0Rvd25sb2FkQ3RsLmFjdGlvbnMsIGFjdGlvbiQpO1xuICAgIC8vIGNvbnN0IGZldGNoQWN0aW9uU3RhdGUgPSBuZXcgTWFwPHN0cmluZywgUmVzcG9uc2VbXT4oKTtcbiAgICAvLyBtYXAga2V5IGlzIGhvc3QgbmFtZSBvZiByZW1vdGUgdGFyYmFsbCBzZXJ2ZXJcbiAgICBjb25zdCBjYWNoZVN2Y0J5T3JpZ2luID0gbmV3IE1hcDxzdHJpbmcsIFJldHVyblR5cGU8dHlwZW9mIGNyZWF0ZVByb3h5V2l0aENhY2hlPj4oKTtcblxuICAgIGlmIChmcy5leGlzdHNTeW5jKFNUQVRFX0ZJTEUpKSB7XG4gICAgICB2b2lkIGZzLnByb21pc2VzLnJlYWRGaWxlKFNUQVRFX0ZJTEUsICd1dGYtOCcpXG4gICAgICAudGhlbihjb250ZW50ID0+IHtcbiAgICAgICAgbG9nLmluZm8oJ1JlYWQgY2FjaGUgc3RhdGUgZmlsZTonLCBTVEFURV9GSUxFKTtcbiAgICAgICAgcGtnRG93bmxvYWRDdGwuYWN0aW9uRGlzcGF0Y2hlci5sb2FkKEpTT04ucGFyc2UoY29udGVudCkpO1xuICAgICAgfSk7XG4gICAgfVxuICAgIHNodXRkb3duSG9va3MucHVzaCgoKSA9PiB7XG4gICAgICBsb2cuaW5mbygnU2F2ZSBjaGFuZ2VkJywgU1RBVEVfRklMRSk7XG4gICAgICByZXR1cm4gZnMucHJvbWlzZXMud3JpdGVGaWxlKFNUQVRFX0ZJTEUsIEpTT04uc3RyaW5naWZ5KHBrZ0Rvd25sb2FkQ3RsLmdldFN0YXRlKCksIG51bGwsICcgICcpKTtcbiAgICB9KTtcblxuICAgIHJldHVybiByeC5tZXJnZShcbiAgICAgICBhY3Rpb25CeVR5cGUuZmV0Y2hUYXJiYWxsLnBpcGUoXG4gICAgICAgIG9wLm1lcmdlTWFwKCh7cGF5bG9hZH0pID0+IHtcbiAgICAgICAgICByZXR1cm4gcGtnRG93bmxvYWRDdGwuZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgICAgICAgb3AubWFwKHMgPT4gXy5nZXQocywgW3BheWxvYWQucGtnTmFtZSwgcGF5bG9hZC52ZXJzaW9uXSkpLFxuICAgICAgICAgICAgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgICAgICAgIG9wLmZpbHRlcih2YWx1ZSA9PiB2YWx1ZSAhPSBudWxsKSxcbiAgICAgICAgICAgIG9wLnRha2UoMSksXG4gICAgICAgICAgICBvcC5tYXAodXJsID0+IHtcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBjb25zdCB7b3JpZ2luLCBwYXRobmFtZX0gPSBuZXcgVVJMKHVybCk7XG4gICAgICAgICAgICAgICAgbGV0IHNlcnZpY2UgPSBjYWNoZVN2Y0J5T3JpZ2luLmdldChvcmlnaW4pO1xuICAgICAgICAgICAgICAgIGlmIChzZXJ2aWNlID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICAgIGxvZy5pbmZvKCdjcmVhdGUgZG93bmxvYWQgcHJveHkgaW50YW5jZSBmb3InLCBvcmlnaW4pO1xuICAgICAgICAgICAgICAgICAgc2VydmljZSA9IGNyZWF0ZVByb3h5V2l0aENhY2hlKG9yaWdpbiwgb3JpZ2luLFxuICAgICAgICAgICAgICAgICAgICB0YXJiYWxsRGlyLFxuICAgICAgICAgICAgICAgICAgICB7IG1hbnVhbDogdHJ1ZSB9KTtcbiAgICAgICAgICAgICAgICAgIGNhY2hlU3ZjQnlPcmlnaW4uc2V0KG9yaWdpbiwgc2VydmljZSk7XG4gICAgICAgICAgICAgICAgICBzZXJ2aWNlLmFjdGlvbkRpc3BhdGNoZXIuY29uZmlndXJlUHJveHkoe1xuICAgICAgICAgICAgICAgICAgICBwYXRoUmV3cml0ZShfcGF0aCwgcmVxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgY29uc3Qge3BhcmFtczoge3BrZ05hbWUsIHZlcnNpb259fSA9IChyZXEgYXMgUmVxdWVzdDxQa2dEb3dubG9hZFJlcXVlc3RQYXJhbXM+KTtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCB1cmwgPSBwa2dEb3dubG9hZEN0bC5nZXRTdGF0ZSgpW3BrZ05hbWVdW3ZlcnNpb25dO1xuICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHtwYXRobmFtZX0gPSBuZXcgVVJMKHVybCk7XG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhdGhuYW1lO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgc2VydmljZS5hY3Rpb25EaXNwYXRjaGVyLmhpdENhY2hlKHtcbiAgICAgICAgICAgICAgICAgIGtleToga2V5T2ZVcmkocGF5bG9hZC5yZXEubWV0aG9kLCBwYXRobmFtZSksXG4gICAgICAgICAgICAgICAgICByZXE6IHBheWxvYWQucmVxLCByZXM6IHBheWxvYWQucmVzLFxuICAgICAgICAgICAgICAgICAgbmV4dDogKCkgPT4ge31cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGxvZy5lcnJvcignRmFpbGVkIGZvciBkb3dubG9hZCBVUkw6JyArIHVybCwgZSk7XG4gICAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICApO1xuICAgICAgICB9KVxuICAgICAgKVxuICAgICkucGlwZShcbiAgICAgIG9wLmlnbm9yZUVsZW1lbnRzKCksXG4gICAgICBvcC5jYXRjaEVycm9yKChlcnIsIHNyYykgPT4ge1xuICAgICAgICBsb2cuZXJyb3IoZXJyKTtcbiAgICAgICAgcmV0dXJuIHNyYzsgLy8gcmUtc3Vic3JpYmUgb24gZmFpbFxuICAgICAgfSlcbiAgICApO1xuICB9KTtcblxuXG4gIHZlcnNpb25zQ2FjaGVDdGwuYWN0aW9uRGlzcGF0Y2hlci5jb25maWd1cmVQcm94eSh7XG4gICAgc2VsZkhhbmRsZVJlc3BvbnNlOiB0cnVlXG4gIH0pO1xuXG4gIHZlcnNpb25zQ2FjaGVDdGwuYWN0aW9uRGlzcGF0Y2hlci5jb25maWdUcmFuc2Zvcm1lcih7XG4gICAgcmVtb3RlOiBbIGNyZWF0ZVRyYW5zZm9ybWVyKHRydWUpXSxcbiAgICBjYWNoZWQ6IFtjcmVhdGVUcmFuc2Zvcm1lcihmYWxzZSldXG4gIH0pO1xuXG4gIGZ1bmN0aW9uIGNyZWF0ZVRyYW5zZm9ybWVyKHRyYWNrUmVtb3RlVXJsOiBib29sZWFuKSB7XG4gICAgcmV0dXJuIChoZWFkZXJzOiBDYWNoZURhdGFbJ2hlYWRlcnMnXSwgcmVxSG9zdDogc3RyaW5nIHwgdW5kZWZpbmVkKSA9PiB7XG4gICAgICBsZXQgYnVmZmVyID0gJyc7XG4gICAgICBsZXQgZGVjb21wcmVzczogVHJhbnNmb3JtIHwgdW5kZWZpbmVkO1xuICAgICAgbGV0IGNvbXByZXNzZXI6IFRyYW5zZm9ybSB8IHVuZGVmaW5lZDtcbiAgICAgIGNvbnN0IGVuY29kaW5nSGVhZGVyID0gaGVhZGVycy5maW5kKChbbmFtZSwgdmFsdWVdKSA9PiBuYW1lID09PSAnY29udGVudC1lbmNvZGluZycpO1xuICAgICAgY29uc3QgY29udGVudEVuY29kaW5nID0gZW5jb2RpbmdIZWFkZXIgPyBlbmNvZGluZ0hlYWRlclsxXSA6ICcnO1xuICAgICAgc3dpdGNoIChjb250ZW50RW5jb2RpbmcpIHtcbiAgICAgICAgY2FzZSAnYnInOlxuICAgICAgICAgIGRlY29tcHJlc3MgPSB6bGliLmNyZWF0ZUJyb3RsaURlY29tcHJlc3MoKTtcbiAgICAgICAgICBjb21wcmVzc2VyID0gemxpYi5jcmVhdGVCcm90bGlDb21wcmVzcygpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBPciwganVzdCB1c2UgemxpYi5jcmVhdGVVbnppcCgpIHRvIGhhbmRsZSBib3RoIG9mIHRoZSBmb2xsb3dpbmcgY2FzZXM6XG4gICAgICAgIGNhc2UgJ2d6aXAnOlxuICAgICAgICAgIGRlY29tcHJlc3MgPSB6bGliLmNyZWF0ZUd1bnppcCgpO1xuICAgICAgICAgIGNvbXByZXNzZXIgPSB6bGliLmNyZWF0ZUd6aXAoKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnZGVmbGF0ZSc6XG4gICAgICAgICAgZGVjb21wcmVzcyA9IHpsaWIuY3JlYXRlSW5mbGF0ZSgpO1xuICAgICAgICAgIGNvbXByZXNzZXIgPSB6bGliLmNyZWF0ZURlZmxhdGUoKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgIH1cbiAgICAgIGNvbnN0IHRyYW5zZm9ybWVycyA9IGRlY29tcHJlc3MgPyBbZGVjb21wcmVzc10gOiBbXTtcbiAgICAgIGNvbnN0IHByb2Nlc3NUcmFucyA9IG5ldyBUcmFuc2Zvcm0oe1xuICAgICAgICB0cmFuc2Zvcm0oY2h1bmssIF9lbmNvZGUsIGNiKSB7XG4gICAgICAgICAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihjaHVuaykpIHtcbiAgICAgICAgICAgIGJ1ZmZlciArPSBjaHVuay50b1N0cmluZygpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBidWZmZXIgKz0gY2h1bmsgYXMgc3RyaW5nO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYigpO1xuICAgICAgICB9LFxuICAgICAgICBmbHVzaChjYikge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBqc29uID0gSlNPTi5wYXJzZShidWZmZXIpIGFzIE5wbVJlZ2lzdHJ5VmVyc2lvbkpzb247XG4gICAgICAgICAgICBjb25zdCBwYXJhbToge1t2ZXI6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcbiAgICAgICAgICAgIGZvciAoY29uc3QgW3ZlciwgdmVyc2lvbkVudHJ5XSBvZiBPYmplY3QuZW50cmllcyhqc29uLnZlcnNpb25zKSkge1xuICAgICAgICAgICAgICBwYXJhbVt2ZXJdID0gdmVyc2lvbkVudHJ5LmRpc3QudGFyYmFsbDtcbiAgICAgICAgICAgICAgdmVyc2lvbkVudHJ5LmRpc3QudGFyYmFsbCA9IChyZXFIb3N0IHx8IERFRkFVTFRfSE9TVCkgKyBgJHtzZXJ2ZVRhcmJhbGxQYXRofS8ke2VuY29kZVVSSUNvbXBvbmVudChqc29uLm5hbWUpfS8ke2VuY29kZVVSSUNvbXBvbmVudCh2ZXIpfWA7XG4gICAgICAgICAgICAgIC8vIGxvZy5pbmZvKCdyZXdyaXRlIHRhcmJhbGwgZG93bmxvYWQgVVJMIHRvICcgKyB2ZXJzaW9uRW50cnkuZGlzdC50YXJiYWxsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh0cmFja1JlbW90ZVVybClcbiAgICAgICAgICAgICAgcGtnRG93bmxvYWRDdGwuYWN0aW9uRGlzcGF0Y2hlci5hZGQoe3BrZ05hbWU6IGpzb24ubmFtZSwgdmVyc2lvbnM6IHBhcmFtfSk7XG5cbiAgICAgICAgICAgIGNiKG51bGwsIEpTT04uc3RyaW5naWZ5KGpzb24pKTtcbiAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBsb2cuZXJyb3IoZSk7XG4gICAgICAgICAgICByZXR1cm4gY2IoZSBhcyBFcnJvcik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHRyYW5zZm9ybWVycy5wdXNoKHByb2Nlc3NUcmFucyk7XG4gICAgICBpZiAoY29tcHJlc3NlcilcbiAgICAgICAgdHJhbnNmb3JtZXJzLnB1c2goY29tcHJlc3Nlcik7XG4gICAgICByZXR1cm4gdHJhbnNmb3JtZXJzO1xuICAgIH07XG4gIH1cbn1cblxuXG4iXX0=