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
const inspector_1 = __importDefault(require("inspector"));
inspector_1.default.open(9222);
const log = (0, plink_1.log4File)(__filename);
function createNpmRegistryServer(api) {
    var _a;
    const setting = (0, plink_1.config)()['@wfh/assets-processer'].npmRegistryCacheServer;
    if (setting == null)
        return;
    const host = setting.host || (`http://localhost${(0, plink_1.config)().port !== 80 ? ':' + (0, plink_1.config)().port : ''}`);
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
        // const cacheSvcByOrigin = new Map<string, ReturnType<typeof createProxyWithCache>>();
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
                const { origin, pathname } = new URL(url);
                // let service = cacheSvcByOrigin.get(origin);
                // if (service == null) {
                const service = (0, cache_service_1.createProxyWithCache)(`${payload.pkgName}-${payload.version}`, origin, tarballDir, { manual: true });
                // cacheSvcByOrigin.set(origin, service);
                service.actionDispatcher.configureProxy({
                    pathRewrite(_path, _req) {
                        return pathname;
                    }
                });
                service.actionDispatcher.hitCache({
                    key: (0, cache_service_1.keyOfUri)(payload.req.method, pathname),
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
            const encodingHeader = headers.find(([name, value]) => name === 'content-encoding');
            const contentEncoding = encodingHeader ? encodingHeader[1] : '';
            log.info('content-encoding:', contentEncoding);
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
                            versionEntry.dist.tarball = host + `${serveTarballPath}/${encodeURIComponent(json.name)}/${encodeURIComponent(ver)}`;
                            // log.info('rewrite tarball download URL to ' + versionEntry.dist.tarball);
                        }
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
        }
    ]);
}
exports.default = createNpmRegistryServer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnBtLXJlZ2lzdHJ5LWNhY2hlLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJucG0tcmVnaXN0cnktY2FjaGUtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnREFBd0I7QUFDeEIsbUNBQWlDO0FBQ2pDLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsc0NBQThEO0FBQzlELCtEQUE2RDtBQUM3RCx5Q0FBMkI7QUFDM0IsbURBQXFDO0FBQ3JDLDBDQUE0QjtBQUU1Qiw4RkFBb0c7QUFFcEcsbURBQStEO0FBQy9ELDBEQUFrQztBQUVsQyxtQkFBUyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUUsQ0FBQztBQUN0QixNQUFNLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUM7QUFFakMsU0FBd0IsdUJBQXVCLENBQUMsR0FBcUI7O0lBQ25FLE1BQU0sT0FBTyxHQUFHLElBQUEsY0FBTSxHQUFFLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQztJQUN6RSxJQUFJLE9BQU8sSUFBSSxJQUFJO1FBQ2pCLE9BQU87SUFDVCxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUMsbUJBQW1CLElBQUEsY0FBTSxHQUFFLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUEsY0FBTSxHQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3BHLE1BQU0sVUFBVSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsSUFBSSxjQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLHlCQUF5QixDQUFDLENBQUM7SUFFMUcsTUFBTSxTQUFTLEdBQUcsY0FBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksSUFB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QkFDdkI7Z0JBQ0gsQ0FBQzthQUNGLENBQUMsQ0FBQztZQUNILFlBQVksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDaEMsSUFBSSxVQUFVO2dCQUNaLFlBQVksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDaEMsT0FBTyxZQUFZLENBQUM7UUFDdEIsQ0FBQztLQUNGLENBQUMsQ0FBQztBQUNMLENBQUM7QUF0S0QsMENBc0tDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge1RyYW5zZm9ybX0gZnJvbSAnc3RyZWFtJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgemxpYiBmcm9tICd6bGliJztcbmltcG9ydCB7Y29uZmlnLCBsb2c0RmlsZSwgRXh0ZW5zaW9uQ29udGV4dH0gZnJvbSAnQHdmaC9wbGluayc7XG5pbXBvcnQge3NodXRkb3duSG9va3N9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvYXBwLXNlcnZlcic7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7UmVxdWVzdCwgUmVzcG9uc2V9IGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IHtjcmVhdGVTbGljZSwgY2FzdEJ5QWN0aW9uVHlwZX0gZnJvbSAnQHdmaC9yZWR1eC10b29sa2l0LW9ic2VydmFibGUvZGlzdC90aW55LXJlZHV4LXRvb2xraXQnO1xuaW1wb3J0IHtOcG1SZWdpc3RyeVZlcnNpb25Kc29uLCBUYXJiYWxsc0luZm99IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtjcmVhdGVQcm94eVdpdGhDYWNoZSwga2V5T2ZVcml9IGZyb20gJy4vY2FjaGUtc2VydmljZSc7XG5pbXBvcnQgaW5zcGVjdG9yIGZyb20gJ2luc3BlY3Rvcic7XG5cbmluc3BlY3Rvci5vcGVuKDkyMjIgKTtcbmNvbnN0IGxvZyA9IGxvZzRGaWxlKF9fZmlsZW5hbWUpO1xuXG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBjcmVhdGVOcG1SZWdpc3RyeVNlcnZlcihhcGk6IEV4dGVuc2lvbkNvbnRleHQpIHtcbiAgY29uc3Qgc2V0dGluZyA9IGNvbmZpZygpWydAd2ZoL2Fzc2V0cy1wcm9jZXNzZXInXS5ucG1SZWdpc3RyeUNhY2hlU2VydmVyO1xuICBpZiAoc2V0dGluZyA9PSBudWxsKVxuICAgIHJldHVybjtcbiAgY29uc3QgaG9zdCA9IHNldHRpbmcuaG9zdCB8fCAoYGh0dHA6Ly9sb2NhbGhvc3Qke2NvbmZpZygpLnBvcnQgIT09IDgwID8gJzonICsgY29uZmlnKCkucG9ydCA6ICcnfWApO1xuICBjb25zdCBTVEFURV9GSUxFID0gUGF0aC5yZXNvbHZlKHNldHRpbmcuY2FjaGVEaXIgfHwgY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInKSwgJ25wbS1yZWdpc3RyeS1jYWNoZS5qc29uJyk7XG5cbiAgY29uc3Qgc2VydmVQYXRoID0gUGF0aC5wb3NpeC5qb2luKHNldHRpbmcucGF0aCB8fCAnL3JlZ2lzdHJ5JywgJ3ZlcnNpb25zJyk7XG4gIGxvZy5pbmZvKCdOUE0gcmVnaXN0cnkgY2FjaGUgaXMgc2VydmluZyBhdCAnLCBzZXJ2ZVBhdGgpO1xuICBjb25zdCB2ZXJzaW9uc0NhY2hlQ3RsID0gY3JlYXRlUHJveHlXaXRoQ2FjaGUoc2VydmVQYXRoLFxuICAgIHNldHRpbmcucmVnaXN0cnkgfHwgJ2h0dHBzOi8vcmVnaXN0cnkubnBtanMub3JnJyxcbiAgICBQYXRoLnBvc2l4LmpvaW4oc2V0dGluZy5jYWNoZURpciB8fCBjb25maWcucmVzb2x2ZSgnZGVzdERpcicpLCAndmVyc2lvbnMnKVxuICApO1xuXG4gIGNvbnN0IHRhcmJhbGxEaXIgPSBQYXRoLnJlc29sdmUoc2V0dGluZy5jYWNoZURpciB8fCBjb25maWcucmVzb2x2ZSgnZGVzdERpcicpLCAnZG93bmxvYWQtdGFyYmFsbHMnKTtcblxuICBjb25zdCBwa2dEb3dubG9hZFJvdXRlciA9IGFwaS5leHByZXNzLlJvdXRlcigpO1xuXG4gIGNvbnN0IHNlcnZlVGFyYmFsbFBhdGggPSBQYXRoLnBvc2l4LmpvaW4oc2V0dGluZy5wYXRoIHx8ICcvcmVnaXN0cnknLCAnX3RhcmJhbGxzJyk7XG5cbiAgYXBpLnVzZShzZXJ2ZVRhcmJhbGxQYXRoLCBwa2dEb3dubG9hZFJvdXRlcik7XG4gIHBrZ0Rvd25sb2FkUm91dGVyLmdldCgnLzpwa2dOYW1lLzp2ZXJzaW9uJywgKHJlcSwgcmVzKSA9PiB7XG4gICAgbG9nLmluZm8oJ2luY29taW5nIHJlcXVlc3QgZG93bmxvYWQgdGFyYmFsbCcsIHJlcS5wYXJhbXMucGtnTmFtZSk7XG4gICAgcGtnRG93bmxvYWRDdGwuYWN0aW9uRGlzcGF0Y2hlci5mZXRjaFRhcmJhbGwoe3JlcSwgcmVzLCBwa2dOYW1lOiByZXEucGFyYW1zLnBrZ05hbWUsIHZlcnNpb246IHJlcS5wYXJhbXMudmVyc2lvbn0pO1xuICB9KTtcblxuICBjb25zdCBwa2dEb3dubG9hZEN0bCA9IGNyZWF0ZVNsaWNlKHtcbiAgICBuYW1lOiAncGtnQ2FjaGUnLFxuICAgIGluaXRpYWxTdGF0ZToge30gYXMgVGFyYmFsbHNJbmZvLFxuICAgIHJlZHVjZXJzOiB7XG4gICAgICBsb2FkKHM6IFRhcmJhbGxzSW5mbywgZGF0YTogVGFyYmFsbHNJbmZvKSB7XG4gICAgICAgIE9iamVjdC5hc3NpZ24ocywgZGF0YSk7XG4gICAgICB9LFxuICAgICAgYWRkKHM6IFRhcmJhbGxzSW5mbywgcGF5bG9hZDoge3BrZ05hbWU6IHN0cmluZzsgdmVyc2lvbnM6IHtbdmVyc2lvbjogc3RyaW5nXTogc3RyaW5nfX0pIHtcbiAgICAgICAgbGV0IHBrZ0VudHJ5ID0gc1twYXlsb2FkLnBrZ05hbWVdO1xuICAgICAgICBpZiAocGtnRW50cnkgPT0gbnVsbClcbiAgICAgICAgICBzW3BheWxvYWQucGtnTmFtZV0gPSBwYXlsb2FkLnZlcnNpb25zO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgc1twYXlsb2FkLnBrZ05hbWVdID0gey4uLnBrZ0VudHJ5LCAuLi5wYXlsb2FkLnZlcnNpb25zfTtcbiAgICAgIH0sXG4gICAgICBmZXRjaFRhcmJhbGwoX3M6IFRhcmJhbGxzSW5mbyxcbiAgICAgICAgX3BheWxvYWQ6IHtyZXE6IFJlcXVlc3Q7IHJlczogUmVzcG9uc2UsIHBrZ05hbWU6IHN0cmluZzsgdmVyc2lvbjogc3RyaW5nfSkge1xuICAgICAgfVxuICAgIH0sXG4gICAgZGVidWc6ICEhY29uZmlnKCkuY2xpT3B0aW9ucz8udmVyYm9zZVxuICB9KTtcblxuICBwa2dEb3dubG9hZEN0bC5lcGljKGFjdGlvbiQgPT4ge1xuICAgIGNvbnN0IGFjdGlvbkJ5VHlwZSA9IGNhc3RCeUFjdGlvblR5cGUocGtnRG93bmxvYWRDdGwuYWN0aW9ucywgYWN0aW9uJCk7XG4gICAgLy8gY29uc3QgZmV0Y2hBY3Rpb25TdGF0ZSA9IG5ldyBNYXA8c3RyaW5nLCBSZXNwb25zZVtdPigpO1xuICAgIC8vIG1hcCBrZXkgaXMgaG9zdCBuYW1lIG9mIHJlbW90ZSB0YXJiYWxsIHNlcnZlclxuICAgIC8vIGNvbnN0IGNhY2hlU3ZjQnlPcmlnaW4gPSBuZXcgTWFwPHN0cmluZywgUmV0dXJuVHlwZTx0eXBlb2YgY3JlYXRlUHJveHlXaXRoQ2FjaGU+PigpO1xuXG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoU1RBVEVfRklMRSkpIHtcbiAgICAgIHZvaWQgZnMucHJvbWlzZXMucmVhZEZpbGUoU1RBVEVfRklMRSwgJ3V0Zi04JylcbiAgICAgIC50aGVuKGNvbnRlbnQgPT4ge1xuICAgICAgICBsb2cuaW5mbygnUmVhZCBjYWNoZSBzdGF0ZSBmaWxlOicsIFNUQVRFX0ZJTEUpO1xuICAgICAgICBwa2dEb3dubG9hZEN0bC5hY3Rpb25EaXNwYXRjaGVyLmxvYWQoSlNPTi5wYXJzZShjb250ZW50KSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgc2h1dGRvd25Ib29rcy5wdXNoKCgpID0+IHtcbiAgICAgIGxvZy5pbmZvKCdTYXZlIGNoYW5nZWQnLCBTVEFURV9GSUxFKTtcbiAgICAgIHJldHVybiBmcy5wcm9taXNlcy53cml0ZUZpbGUoU1RBVEVfRklMRSwgSlNPTi5zdHJpbmdpZnkocGtnRG93bmxvYWRDdGwuZ2V0U3RhdGUoKSwgbnVsbCwgJyAgJykpO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJ4Lm1lcmdlKFxuICAgICAgIGFjdGlvbkJ5VHlwZS5mZXRjaFRhcmJhbGwucGlwZShcbiAgICAgICAgb3AubWVyZ2VNYXAoKHtwYXlsb2FkfSkgPT4ge1xuICAgICAgICAgIHJldHVybiBwa2dEb3dubG9hZEN0bC5nZXRTdG9yZSgpLnBpcGUoXG4gICAgICAgICAgICBvcC5tYXAocyA9PiBfLmdldChzLCBbcGF5bG9hZC5wa2dOYW1lLCBwYXlsb2FkLnZlcnNpb25dKSksXG4gICAgICAgICAgICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgICAgICAgICAgb3AuZmlsdGVyKHZhbHVlID0+IHZhbHVlICE9IG51bGwpLFxuICAgICAgICAgICAgb3AudGFrZSgxKSxcbiAgICAgICAgICAgIG9wLm1hcCh1cmwgPT4ge1xuICAgICAgICAgICAgICBjb25zdCB7b3JpZ2luLCBwYXRobmFtZX0gPSBuZXcgVVJMKHVybCk7XG4gICAgICAgICAgICAgIC8vIGxldCBzZXJ2aWNlID0gY2FjaGVTdmNCeU9yaWdpbi5nZXQob3JpZ2luKTtcbiAgICAgICAgICAgICAgLy8gaWYgKHNlcnZpY2UgPT0gbnVsbCkge1xuICAgICAgICAgICAgICBjb25zdCBzZXJ2aWNlID0gY3JlYXRlUHJveHlXaXRoQ2FjaGUoYCR7cGF5bG9hZC5wa2dOYW1lfS0ke3BheWxvYWQudmVyc2lvbn1gLCBvcmlnaW4sXG4gICAgICAgICAgICAgICAgICAgICAgdGFyYmFsbERpcixcbiAgICAgICAgICAgICAgICAgICAgICB7IG1hbnVhbDogdHJ1ZSB9KTtcbiAgICAgICAgICAgICAgICAvLyBjYWNoZVN2Y0J5T3JpZ2luLnNldChvcmlnaW4sIHNlcnZpY2UpO1xuICAgICAgICAgICAgICBzZXJ2aWNlLmFjdGlvbkRpc3BhdGNoZXIuY29uZmlndXJlUHJveHkoe1xuICAgICAgICAgICAgICAgIHBhdGhSZXdyaXRlKF9wYXRoLCBfcmVxKSB7XG4gICAgICAgICAgICAgICAgICByZXR1cm4gcGF0aG5hbWU7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgc2VydmljZS5hY3Rpb25EaXNwYXRjaGVyLmhpdENhY2hlKHtcbiAgICAgICAgICAgICAgICBrZXk6IGtleU9mVXJpKHBheWxvYWQucmVxLm1ldGhvZCwgcGF0aG5hbWUpLFxuICAgICAgICAgICAgICAgIHJlcTogcGF5bG9hZC5yZXEsIHJlczogcGF5bG9hZC5yZXMsXG4gICAgICAgICAgICAgICAgbmV4dDogKCkgPT4ge31cbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICk7XG4gICAgICAgIH0pXG4gICAgICApXG4gICAgKS5waXBlKFxuICAgICAgb3AuaWdub3JlRWxlbWVudHMoKSxcbiAgICAgIG9wLmNhdGNoRXJyb3IoKGVyciwgc3JjKSA9PiB7XG4gICAgICAgIGxvZy5lcnJvcihlcnIpO1xuICAgICAgICByZXR1cm4gc3JjOyAvLyByZS1zdWJzcmliZSBvbiBmYWlsXG4gICAgICB9KVxuICAgICk7XG4gIH0pO1xuXG5cbiAgdmVyc2lvbnNDYWNoZUN0bC5hY3Rpb25EaXNwYXRjaGVyLmNvbmZpZ3VyZVByb3h5KHtcbiAgICBzZWxmSGFuZGxlUmVzcG9uc2U6IHRydWVcbiAgfSk7XG5cbiAgdmVyc2lvbnNDYWNoZUN0bC5hY3Rpb25EaXNwYXRjaGVyLmNvbmZpZ1RyYW5zZm9ybWVyKFtcbiAgICAoaGVhZGVycykgPT4ge1xuICAgICAgbGV0IGJ1ZmZlciA9ICcnO1xuICAgICAgbGV0IGRlY29tcHJlc3M6IFRyYW5zZm9ybSB8IHVuZGVmaW5lZDtcbiAgICAgIGxldCBjb21wcmVzc2VyOiBUcmFuc2Zvcm0gfCB1bmRlZmluZWQ7XG4gICAgICBjb25zdCBlbmNvZGluZ0hlYWRlciA9IGhlYWRlcnMuZmluZCgoW25hbWUsIHZhbHVlXSkgPT4gbmFtZSA9PT0gJ2NvbnRlbnQtZW5jb2RpbmcnKTtcbiAgICAgIGNvbnN0IGNvbnRlbnRFbmNvZGluZyA9IGVuY29kaW5nSGVhZGVyID8gZW5jb2RpbmdIZWFkZXJbMV0gOiAnJztcbiAgICAgIGxvZy5pbmZvKCdjb250ZW50LWVuY29kaW5nOicsIGNvbnRlbnRFbmNvZGluZyk7XG4gICAgICBzd2l0Y2ggKGNvbnRlbnRFbmNvZGluZykge1xuICAgICAgICBjYXNlICdicic6XG4gICAgICAgICAgZGVjb21wcmVzcyA9IHpsaWIuY3JlYXRlQnJvdGxpRGVjb21wcmVzcygpO1xuICAgICAgICAgIGNvbXByZXNzZXIgPSB6bGliLmNyZWF0ZUJyb3RsaUNvbXByZXNzKCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vIE9yLCBqdXN0IHVzZSB6bGliLmNyZWF0ZVVuemlwKCkgdG8gaGFuZGxlIGJvdGggb2YgdGhlIGZvbGxvd2luZyBjYXNlczpcbiAgICAgICAgY2FzZSAnZ3ppcCc6XG4gICAgICAgICAgZGVjb21wcmVzcyA9IHpsaWIuY3JlYXRlR3VuemlwKCk7XG4gICAgICAgICAgY29tcHJlc3NlciA9IHpsaWIuY3JlYXRlR3ppcCgpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdkZWZsYXRlJzpcbiAgICAgICAgICBkZWNvbXByZXNzID0gemxpYi5jcmVhdGVJbmZsYXRlKCk7XG4gICAgICAgICAgY29tcHJlc3NlciA9IHpsaWIuY3JlYXRlRGVmbGF0ZSgpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgfVxuICAgICAgY29uc3QgdHJhbnNmb3JtZXJzID0gZGVjb21wcmVzcyA/IFtkZWNvbXByZXNzXSA6IFtdO1xuICAgICAgY29uc3QgcHJvY2Vzc1RyYW5zID0gbmV3IFRyYW5zZm9ybSh7XG4gICAgICAgIHRyYW5zZm9ybShjaHVuaywgX2VuY29kZSwgY2IpIHtcbiAgICAgICAgICBpZiAoQnVmZmVyLmlzQnVmZmVyKGNodW5rKSkge1xuICAgICAgICAgICAgYnVmZmVyICs9IGNodW5rLnRvU3RyaW5nKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJ1ZmZlciArPSBjaHVuayBhcyBzdHJpbmc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNiKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGZsdXNoKGNiKSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKGJ1ZmZlcikgYXMgTnBtUmVnaXN0cnlWZXJzaW9uSnNvbjtcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtOiB7W3Zlcjogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuICAgICAgICAgICAgZm9yIChjb25zdCBbdmVyLCB2ZXJzaW9uRW50cnldIG9mIE9iamVjdC5lbnRyaWVzKGpzb24udmVyc2lvbnMpKSB7XG4gICAgICAgICAgICAgIHBhcmFtW3Zlcl0gPSB2ZXJzaW9uRW50cnkuZGlzdC50YXJiYWxsO1xuICAgICAgICAgICAgICB2ZXJzaW9uRW50cnkuZGlzdC50YXJiYWxsID0gaG9zdCArIGAke3NlcnZlVGFyYmFsbFBhdGh9LyR7ZW5jb2RlVVJJQ29tcG9uZW50KGpzb24ubmFtZSl9LyR7ZW5jb2RlVVJJQ29tcG9uZW50KHZlcil9YDtcbiAgICAgICAgICAgICAgLy8gbG9nLmluZm8oJ3Jld3JpdGUgdGFyYmFsbCBkb3dubG9hZCBVUkwgdG8gJyArIHZlcnNpb25FbnRyeS5kaXN0LnRhcmJhbGwpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgcGtnRG93bmxvYWRDdGwuYWN0aW9uRGlzcGF0Y2hlci5hZGQoe3BrZ05hbWU6IGpzb24ubmFtZSwgdmVyc2lvbnM6IHBhcmFtfSk7XG4gICAgICAgICAgICBjYihudWxsLCBKU09OLnN0cmluZ2lmeShqc29uKSk7XG4gICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgbG9nLmVycm9yKGUpO1xuICAgICAgICAgICAgcmV0dXJuIGNiKGUgYXMgRXJyb3IpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICB0cmFuc2Zvcm1lcnMucHVzaChwcm9jZXNzVHJhbnMpO1xuICAgICAgaWYgKGNvbXByZXNzZXIpXG4gICAgICAgIHRyYW5zZm9ybWVycy5wdXNoKGNvbXByZXNzZXIpO1xuICAgICAgcmV0dXJuIHRyYW5zZm9ybWVycztcbiAgICB9XG4gIF0pO1xufVxuXG5cbiJdfQ==