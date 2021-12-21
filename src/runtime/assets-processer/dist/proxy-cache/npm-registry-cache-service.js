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
    const STATE_FILE = path_1.default.resolve(setting.cacheDir || plink_1.config.resolve('destDir'), 'npm-registry-cache.json');
    const versionsCacheCtl = (0, cache_service_1.createProxyWithCache)(path_1.default.posix.join(setting.path || '/registry', 'versions'), setting.registry || 'https://registry.npmjs.org', path_1.default.posix.join(setting.cacheDir || plink_1.config.resolve('destDir'), 'versions'));
    const tarballDir = path_1.default.resolve(setting.cacheDir || plink_1.config.resolve('destDir'), 'tarballs');
    const pkgDownloadRouter = api.express.Router();
    api.use(path_1.default.posix.join(setting.path || '/registry', '_tarballs'), pkgDownloadRouter);
    pkgDownloadRouter.get('/:pkgName/:version', (req, res) => {
    });
    const pkgDownloadCtl = (0, tiny_redux_toolkit_1.createSlice)({
        name: 'pkgCache',
        initialState: {},
        reducers: {
            load(s, data) {
                s = Object.assign({}, data);
            },
            add(s, payload) {
                let pkgEntry = s[payload.pkgName];
                if (pkgEntry == null)
                    pkgEntry = s[payload.pkgName] = {};
                pkgEntry[payload.version] = payload.origUrl;
            },
            fetchTarball(_s, _payload) {
            },
            fetchTarballDone(_s, _payload) { }
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
                pkgDownloadCtl.actionDispatcher.load(JSON.parse(content));
            });
        }
        return rx.merge(
        // After state is loaded and changed, add a server shutdown hook to save state to file
        actionByType.load.pipe(op.switchMap(_action => pkgDownloadCtl.getStore()), op.take(1), op.map(() => {
            app_server_1.shutdownHook$.next(() => {
                log.info('Save changed npm-registry-cache');
                return fs_1.default.promises.writeFile(STATE_FILE, JSON.stringify(pkgDownloadCtl.getState()));
            });
        })), actionByType.fetchTarball.pipe(op.mergeMap(({ payload }) => {
            return pkgDownloadCtl.getStore().pipe(op.map(s => _.get(s, [payload.pkgName, payload.version])), op.distinctUntilChanged(), op.filter(value => value != null), op.take(1), op.map(url => {
                const { origin, pathname } = new URL(url);
                let service = cacheSvcByOrigin.get(origin);
                if (service == null) {
                    service = (0, cache_service_1.createProxyWithCache)(`/${payload.pkgName}/${payload.version}`, origin, tarballDir, { manual: true,
                        pathRewrite(_path, _req) {
                            return pathname;
                        }
                    });
                    cacheSvcByOrigin.set(origin, service);
                }
                service.actionDispatcher.hitCache({
                    key: (0, cache_service_1.keyOfUri)(payload.req.method, url),
                    req: payload.req, res: payload.res,
                    next: () => { }
                });
            }));
        }))).pipe(op.ignoreElements(), op.catchError((err, src) => {
            log.error(err);
            return src; // re-subsribe on fail
        }));
    });
    versionsCacheCtl.actionDispatcher.configureProxy({
        selfHandleResponse: true
    });
    versionsCacheCtl.actionDispatcher.configTransformer([
        (headers) => {
            let buffer = '';
            let decompress;
            let compresser;
            switch (headers['content-encoding']) {
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
            transformers.push();
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
                    const json = JSON.parse(buffer);
                    const hostHeader = headers.find(([headerName, value]) => headerName.toLowerCase() === 'host');
                    const host = hostHeader[1];
                    for (const [ver, versionEntry] of Object.entries(json.versions)) {
                        pkgDownloadCtl.actionDispatcher.add({ pkgName: json.name, version: ver, origUrl: versionEntry.dist.tarball });
                        versionEntry.dist.tarball = host + `/_tarballs/${encodeURIComponent(json.name)}/${encodeURIComponent(ver)}`;
                        log.info('rewrite tarball download URL to ' + versionEntry.dist.tarball);
                    }
                    cb(null, JSON.stringify(json));
                }
            });
            transformers.push(processTrans);
            if (compresser)
                transformers.push(compresser);
            return transformers;
        }
    ]);
}
exports.default = createNpmRegistryServer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnBtLXJlZ2lzdHJ5LWNhY2hlLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJucG0tcmVnaXN0cnktY2FjaGUtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnREFBd0I7QUFDeEIsbUNBQWlDO0FBQ2pDLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsc0NBQThEO0FBQzlELCtEQUE2RDtBQUM3RCx5Q0FBMkI7QUFDM0IsbURBQXFDO0FBQ3JDLDBDQUE0QjtBQUU1Qiw4RkFBb0c7QUFFcEcsbURBQStEO0FBRS9ELE1BQU0sR0FBRyxHQUFHLElBQUEsZ0JBQVEsRUFBQyxVQUFVLENBQUMsQ0FBQztBQUVqQyxTQUF3Qix1QkFBdUIsQ0FBQyxHQUFxQjs7SUFDbkUsTUFBTSxPQUFPLEdBQUcsSUFBQSxjQUFNLEdBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLHNCQUFzQixDQUFDO0lBQ3pFLElBQUksT0FBTyxJQUFJLElBQUk7UUFDakIsT0FBTztJQUNULE1BQU0sVUFBVSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsSUFBSSxjQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLHlCQUF5QixDQUFDLENBQUM7SUFFMUcsTUFBTSxnQkFBZ0IsR0FBRyxJQUFBLG9DQUFvQixFQUFDLGNBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksV0FBVyxFQUFFLFVBQVUsQ0FBQyxFQUNwRyxPQUFPLENBQUMsUUFBUSxJQUFJLDRCQUE0QixFQUNoRCxjQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxJQUFJLGNBQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQzNFLENBQUM7SUFFRixNQUFNLFVBQVUsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLE9B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LEdBQUcsQ0FBQyxFQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFDLENBQUMsQ0FBQzt3QkFDNUcsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxHQUFHLGNBQWMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7d0JBQzVHLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0NBQWtDLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztxQkFDMUU7b0JBQ0QsRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ2pDLENBQUM7YUFDRixDQUFDLENBQUM7WUFDSCxZQUFZLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ2hDLElBQUksVUFBVTtnQkFDWixZQUFZLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2hDLE9BQU8sWUFBWSxDQUFDO1FBQ3RCLENBQUM7S0FDRixDQUFDLENBQUM7QUFDTCxDQUFDO0FBL0pELDBDQStKQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtUcmFuc2Zvcm19IGZyb20gJ3N0cmVhbSc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHpsaWIgZnJvbSAnemxpYic7XG5pbXBvcnQge2NvbmZpZywgbG9nNEZpbGUsIEV4dGVuc2lvbkNvbnRleHR9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IHtzaHV0ZG93bkhvb2skfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L2FwcC1zZXJ2ZXInO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge1JlcXVlc3QsIFJlc3BvbnNlfSBmcm9tICdleHByZXNzJztcbmltcG9ydCB7Y3JlYXRlU2xpY2UsIGNhc3RCeUFjdGlvblR5cGV9IGZyb20gJ0B3ZmgvcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlL2Rpc3QvdGlueS1yZWR1eC10b29sa2l0JztcbmltcG9ydCB7TnBtUmVnaXN0cnlWZXJzaW9uSnNvbiwgVGFyYmFsbHNJbmZvfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7Y3JlYXRlUHJveHlXaXRoQ2FjaGUsIGtleU9mVXJpfSBmcm9tICcuL2NhY2hlLXNlcnZpY2UnO1xuXG5jb25zdCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY3JlYXRlTnBtUmVnaXN0cnlTZXJ2ZXIoYXBpOiBFeHRlbnNpb25Db250ZXh0KSB7XG4gIGNvbnN0IHNldHRpbmcgPSBjb25maWcoKVsnQHdmaC9hc3NldHMtcHJvY2Vzc2VyJ10ubnBtUmVnaXN0cnlDYWNoZVNlcnZlcjtcbiAgaWYgKHNldHRpbmcgPT0gbnVsbClcbiAgICByZXR1cm47XG4gIGNvbnN0IFNUQVRFX0ZJTEUgPSBQYXRoLnJlc29sdmUoc2V0dGluZy5jYWNoZURpciB8fCBjb25maWcucmVzb2x2ZSgnZGVzdERpcicpLCAnbnBtLXJlZ2lzdHJ5LWNhY2hlLmpzb24nKTtcblxuICBjb25zdCB2ZXJzaW9uc0NhY2hlQ3RsID0gY3JlYXRlUHJveHlXaXRoQ2FjaGUoUGF0aC5wb3NpeC5qb2luKHNldHRpbmcucGF0aCB8fCAnL3JlZ2lzdHJ5JywgJ3ZlcnNpb25zJyksXG4gICAgc2V0dGluZy5yZWdpc3RyeSB8fCAnaHR0cHM6Ly9yZWdpc3RyeS5ucG1qcy5vcmcnLFxuICAgIFBhdGgucG9zaXguam9pbihzZXR0aW5nLmNhY2hlRGlyIHx8IGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJyksICd2ZXJzaW9ucycpXG4gICk7XG5cbiAgY29uc3QgdGFyYmFsbERpciA9IFBhdGgucmVzb2x2ZShzZXR0aW5nLmNhY2hlRGlyIHx8IGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJyksICd0YXJiYWxscycpO1xuXG4gIGNvbnN0IHBrZ0Rvd25sb2FkUm91dGVyID0gYXBpLmV4cHJlc3MuUm91dGVyKCk7XG5cbiAgYXBpLnVzZShQYXRoLnBvc2l4LmpvaW4oc2V0dGluZy5wYXRoIHx8ICcvcmVnaXN0cnknLCAnX3RhcmJhbGxzJyksIHBrZ0Rvd25sb2FkUm91dGVyKTtcbiAgcGtnRG93bmxvYWRSb3V0ZXIuZ2V0KCcvOnBrZ05hbWUvOnZlcnNpb24nLCAocmVxLCByZXMpID0+IHtcbiAgfSk7XG5cbiAgY29uc3QgcGtnRG93bmxvYWRDdGwgPSBjcmVhdGVTbGljZSh7XG4gICAgbmFtZTogJ3BrZ0NhY2hlJyxcbiAgICBpbml0aWFsU3RhdGU6IHt9IGFzIFRhcmJhbGxzSW5mbyxcbiAgICByZWR1Y2Vyczoge1xuICAgICAgbG9hZChzOiBUYXJiYWxsc0luZm8sIGRhdGE6IFRhcmJhbGxzSW5mbykge1xuICAgICAgICBzID0ge1xuICAgICAgICAgIC4uLmRhdGFcbiAgICAgICAgfTtcbiAgICAgIH0sXG4gICAgICBhZGQoczogVGFyYmFsbHNJbmZvLCBwYXlsb2FkOiB7cGtnTmFtZTogc3RyaW5nOyB2ZXJzaW9uOiBzdHJpbmc7IG9yaWdVcmw6IHN0cmluZ30pIHtcbiAgICAgICAgbGV0IHBrZ0VudHJ5ID0gc1twYXlsb2FkLnBrZ05hbWVdO1xuICAgICAgICBpZiAocGtnRW50cnkgPT0gbnVsbClcbiAgICAgICAgICBwa2dFbnRyeSA9IHNbcGF5bG9hZC5wa2dOYW1lXSA9IHt9O1xuICAgICAgICBwa2dFbnRyeVtwYXlsb2FkLnZlcnNpb25dID0gcGF5bG9hZC5vcmlnVXJsO1xuICAgICAgfSxcbiAgICAgIGZldGNoVGFyYmFsbChfczogVGFyYmFsbHNJbmZvLFxuICAgICAgICBfcGF5bG9hZDoge3JlcTogUmVxdWVzdDsgcmVzOiBSZXNwb25zZSwgcGtnTmFtZTogc3RyaW5nOyB2ZXJzaW9uOiBzdHJpbmc7IHVybDogc3RyaW5nfSkge1xuICAgICAgfSxcbiAgICAgIGZldGNoVGFyYmFsbERvbmUoX3M6IFRhcmJhbGxzSW5mbywgX3BheWxvYWQ6IHtwa2dOYW1lOiBzdHJpbmc7IHZlcnNpb246IHN0cmluZ30pIHt9XG4gICAgfSxcbiAgICBkZWJ1ZzogISFjb25maWcoKS5jbGlPcHRpb25zPy52ZXJib3NlXG4gIH0pO1xuXG4gIHBrZ0Rvd25sb2FkQ3RsLmVwaWMoYWN0aW9uJCA9PiB7XG4gICAgY29uc3QgYWN0aW9uQnlUeXBlID0gY2FzdEJ5QWN0aW9uVHlwZShwa2dEb3dubG9hZEN0bC5hY3Rpb25zLCBhY3Rpb24kKTtcbiAgICAvLyBjb25zdCBmZXRjaEFjdGlvblN0YXRlID0gbmV3IE1hcDxzdHJpbmcsIFJlc3BvbnNlW10+KCk7XG4gICAgLy8gbWFwIGtleSBpcyBob3N0IG5hbWUgb2YgcmVtb3RlIHRhcmJhbGwgc2VydmVyXG4gICAgY29uc3QgY2FjaGVTdmNCeU9yaWdpbiA9IG5ldyBNYXA8c3RyaW5nLCBSZXR1cm5UeXBlPHR5cGVvZiBjcmVhdGVQcm94eVdpdGhDYWNoZT4+KCk7XG5cbiAgICBpZiAoZnMuZXhpc3RzU3luYyhTVEFURV9GSUxFKSkge1xuICAgICAgdm9pZCBmcy5wcm9taXNlcy5yZWFkRmlsZShTVEFURV9GSUxFLCAndXRmLTgnKVxuICAgICAgLnRoZW4oY29udGVudCA9PiB7XG4gICAgICAgIHBrZ0Rvd25sb2FkQ3RsLmFjdGlvbkRpc3BhdGNoZXIubG9hZChKU09OLnBhcnNlKGNvbnRlbnQpKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgICByZXR1cm4gcngubWVyZ2UoXG4gICAgICAvLyBBZnRlciBzdGF0ZSBpcyBsb2FkZWQgYW5kIGNoYW5nZWQsIGFkZCBhIHNlcnZlciBzaHV0ZG93biBob29rIHRvIHNhdmUgc3RhdGUgdG8gZmlsZVxuICAgICAgYWN0aW9uQnlUeXBlLmxvYWQucGlwZShcbiAgICAgICAgb3Auc3dpdGNoTWFwKF9hY3Rpb24gPT4gcGtnRG93bmxvYWRDdGwuZ2V0U3RvcmUoKSksXG4gICAgICAgIG9wLnRha2UoMSksXG4gICAgICAgIG9wLm1hcCgoKSA9PiB7XG4gICAgICAgICAgc2h1dGRvd25Ib29rJC5uZXh0KCgpID0+IHtcbiAgICAgICAgICAgIGxvZy5pbmZvKCdTYXZlIGNoYW5nZWQgbnBtLXJlZ2lzdHJ5LWNhY2hlJyk7XG4gICAgICAgICAgICByZXR1cm4gZnMucHJvbWlzZXMud3JpdGVGaWxlKFNUQVRFX0ZJTEUsIEpTT04uc3RyaW5naWZ5KHBrZ0Rvd25sb2FkQ3RsLmdldFN0YXRlKCkpKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSlcbiAgICAgICksXG4gICAgICBhY3Rpb25CeVR5cGUuZmV0Y2hUYXJiYWxsLnBpcGUoXG4gICAgICAgIG9wLm1lcmdlTWFwKCh7cGF5bG9hZH0pID0+IHtcbiAgICAgICAgICByZXR1cm4gcGtnRG93bmxvYWRDdGwuZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgICAgICAgb3AubWFwKHMgPT4gXy5nZXQocywgW3BheWxvYWQucGtnTmFtZSwgcGF5bG9hZC52ZXJzaW9uXSkpLFxuICAgICAgICAgICAgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgICAgICAgIG9wLmZpbHRlcih2YWx1ZSA9PiB2YWx1ZSAhPSBudWxsKSxcbiAgICAgICAgICAgIG9wLnRha2UoMSksXG4gICAgICAgICAgICBvcC5tYXAodXJsID0+IHtcbiAgICAgICAgICAgICAgY29uc3Qge29yaWdpbiwgcGF0aG5hbWV9ID0gbmV3IFVSTCh1cmwpO1xuICAgICAgICAgICAgICBsZXQgc2VydmljZSA9IGNhY2hlU3ZjQnlPcmlnaW4uZ2V0KG9yaWdpbik7XG4gICAgICAgICAgICAgIGlmIChzZXJ2aWNlID09IG51bGwpIHtcbiAgICAgICAgICAgICAgICBzZXJ2aWNlID0gY3JlYXRlUHJveHlXaXRoQ2FjaGUoYC8ke3BheWxvYWQucGtnTmFtZX0vJHtwYXlsb2FkLnZlcnNpb259YCwgb3JpZ2luLFxuICAgICAgICAgICAgICAgICAgICAgIHRhcmJhbGxEaXIsXG4gICAgICAgICAgICAgICAgICAgICAgeyBtYW51YWw6IHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXRoUmV3cml0ZShfcGF0aCwgX3JlcSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gcGF0aG5hbWU7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgY2FjaGVTdmNCeU9yaWdpbi5zZXQob3JpZ2luLCBzZXJ2aWNlKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBzZXJ2aWNlLmFjdGlvbkRpc3BhdGNoZXIuaGl0Q2FjaGUoe1xuICAgICAgICAgICAgICAgIGtleToga2V5T2ZVcmkocGF5bG9hZC5yZXEubWV0aG9kLCB1cmwpLFxuICAgICAgICAgICAgICAgIHJlcTogcGF5bG9hZC5yZXEsIHJlczogcGF5bG9hZC5yZXMsXG4gICAgICAgICAgICAgICAgbmV4dDogKCkgPT4ge31cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICk7XG4gICAgICAgIH0pXG4gICAgICApXG4gICAgKS5waXBlKFxuICAgICAgb3AuaWdub3JlRWxlbWVudHMoKSxcbiAgICAgIG9wLmNhdGNoRXJyb3IoKGVyciwgc3JjKSA9PiB7XG4gICAgICAgIGxvZy5lcnJvcihlcnIpO1xuICAgICAgICByZXR1cm4gc3JjOyAvLyByZS1zdWJzcmliZSBvbiBmYWlsXG4gICAgICB9KVxuICAgICk7XG4gIH0pO1xuXG5cbiAgdmVyc2lvbnNDYWNoZUN0bC5hY3Rpb25EaXNwYXRjaGVyLmNvbmZpZ3VyZVByb3h5KHtcbiAgICBzZWxmSGFuZGxlUmVzcG9uc2U6IHRydWVcbiAgfSk7XG5cbiAgdmVyc2lvbnNDYWNoZUN0bC5hY3Rpb25EaXNwYXRjaGVyLmNvbmZpZ1RyYW5zZm9ybWVyKFtcbiAgICAoaGVhZGVycykgPT4ge1xuICAgICAgbGV0IGJ1ZmZlciA9ICcnO1xuICAgICAgbGV0IGRlY29tcHJlc3M6IFRyYW5zZm9ybSB8IHVuZGVmaW5lZDtcbiAgICAgIGxldCBjb21wcmVzc2VyOiBUcmFuc2Zvcm0gfCB1bmRlZmluZWQ7XG4gICAgICBzd2l0Y2ggKGhlYWRlcnNbJ2NvbnRlbnQtZW5jb2RpbmcnXSkge1xuICAgICAgICBjYXNlICdicic6XG4gICAgICAgICAgZGVjb21wcmVzcyA9IHpsaWIuY3JlYXRlQnJvdGxpRGVjb21wcmVzcygpO1xuICAgICAgICAgIGNvbXByZXNzZXIgPSB6bGliLmNyZWF0ZUJyb3RsaUNvbXByZXNzKCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vIE9yLCBqdXN0IHVzZSB6bGliLmNyZWF0ZVVuemlwKCkgdG8gaGFuZGxlIGJvdGggb2YgdGhlIGZvbGxvd2luZyBjYXNlczpcbiAgICAgICAgY2FzZSAnZ3ppcCc6XG4gICAgICAgICAgZGVjb21wcmVzcyA9IHpsaWIuY3JlYXRlR3VuemlwKCk7XG4gICAgICAgICAgY29tcHJlc3NlciA9IHpsaWIuY3JlYXRlR3ppcCgpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdkZWZsYXRlJzpcbiAgICAgICAgICBkZWNvbXByZXNzID0gemxpYi5jcmVhdGVJbmZsYXRlKCk7XG4gICAgICAgICAgY29tcHJlc3NlciA9IHpsaWIuY3JlYXRlRGVmbGF0ZSgpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgfVxuICAgICAgY29uc3QgdHJhbnNmb3JtZXJzID0gZGVjb21wcmVzcyA/IFtkZWNvbXByZXNzXSA6IFtdO1xuICAgICAgdHJhbnNmb3JtZXJzLnB1c2goKTtcbiAgICAgIGNvbnN0IHByb2Nlc3NUcmFucyA9IG5ldyBUcmFuc2Zvcm0oe1xuICAgICAgIHRyYW5zZm9ybShjaHVuaywgX2VuY29kZSwgY2IpIHtcbiAgICAgICAgICAgIGlmIChCdWZmZXIuaXNCdWZmZXIoY2h1bmspKSB7XG4gICAgICAgICAgICBidWZmZXIgKz0gY2h1bmsudG9TdHJpbmcoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYnVmZmVyICs9IGNodW5rIGFzIHN0cmluZztcbiAgICAgICAgICB9XG4gICAgICAgICAgY2IoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZmx1c2goY2IpIHtcbiAgICAgICAgICBjb25zdCBqc29uID0gSlNPTi5wYXJzZShidWZmZXIpIGFzIE5wbVJlZ2lzdHJ5VmVyc2lvbkpzb247XG4gICAgICAgICAgY29uc3QgaG9zdEhlYWRlciA9IGhlYWRlcnMuZmluZCgoW2hlYWRlck5hbWUsIHZhbHVlXSkgPT4gaGVhZGVyTmFtZS50b0xvd2VyQ2FzZSgpID09PSAnaG9zdCcpITtcbiAgICAgICAgICBjb25zdCBob3N0ID0gaG9zdEhlYWRlclsxXSBhcyBzdHJpbmc7XG4gICAgICAgICAgZm9yIChjb25zdCBbdmVyLCB2ZXJzaW9uRW50cnldIG9mIE9iamVjdC5lbnRyaWVzKGpzb24udmVyc2lvbnMpKSB7XG4gICAgICAgICAgICBwa2dEb3dubG9hZEN0bC5hY3Rpb25EaXNwYXRjaGVyLmFkZCh7cGtnTmFtZToganNvbi5uYW1lLCB2ZXJzaW9uOiB2ZXIsIG9yaWdVcmw6IHZlcnNpb25FbnRyeS5kaXN0LnRhcmJhbGx9KTtcbiAgICAgICAgICAgIHZlcnNpb25FbnRyeS5kaXN0LnRhcmJhbGwgPSBob3N0ICsgYC9fdGFyYmFsbHMvJHtlbmNvZGVVUklDb21wb25lbnQoanNvbi5uYW1lKX0vJHtlbmNvZGVVUklDb21wb25lbnQodmVyKX1gO1xuICAgICAgICAgICAgbG9nLmluZm8oJ3Jld3JpdGUgdGFyYmFsbCBkb3dubG9hZCBVUkwgdG8gJyArIHZlcnNpb25FbnRyeS5kaXN0LnRhcmJhbGwpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYihudWxsLCBKU09OLnN0cmluZ2lmeShqc29uKSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgdHJhbnNmb3JtZXJzLnB1c2gocHJvY2Vzc1RyYW5zKTtcbiAgICAgIGlmIChjb21wcmVzc2VyKVxuICAgICAgICB0cmFuc2Zvcm1lcnMucHVzaChjb21wcmVzc2VyKTtcbiAgICAgIHJldHVybiB0cmFuc2Zvcm1lcnM7XG4gICAgfVxuICBdKTtcbn1cblxuXG4iXX0=