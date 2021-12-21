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
        pkgDownloadCtl.actionDispatcher.fetchTarball({ req, res, pkgName: req.params.pkgName, version: req.params.version });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnBtLXJlZ2lzdHJ5LWNhY2hlLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJucG0tcmVnaXN0cnktY2FjaGUtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnREFBd0I7QUFDeEIsbUNBQWlDO0FBQ2pDLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsc0NBQThEO0FBQzlELCtEQUE2RDtBQUM3RCx5Q0FBMkI7QUFDM0IsbURBQXFDO0FBQ3JDLDBDQUE0QjtBQUU1Qiw4RkFBb0c7QUFFcEcsbURBQStEO0FBRS9ELE1BQU0sR0FBRyxHQUFHLElBQUEsZ0JBQVEsRUFBQyxVQUFVLENBQUMsQ0FBQztBQUVqQyxTQUF3Qix1QkFBdUIsQ0FBQyxHQUFxQjs7SUFDbkUsTUFBTSxPQUFPLEdBQUcsSUFBQSxjQUFNLEdBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLHNCQUFzQixDQUFDO0lBQ3pFLElBQUksT0FBTyxJQUFJLElBQUk7UUFDakIsT0FBTztJQUNULE1BQU0sVUFBVSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsSUFBSSxjQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLHlCQUF5QixDQUFDLENBQUM7SUFFMUcsTUFBTSxnQkFBZ0IsR0FBRyxJQUFBLG9DQUFvQixFQUFDLGNBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksV0FBVyxFQUFFLFVBQVUsQ0FBQyxFQUNwRyxPQUFPLENBQUMsUUFBUSxJQUFJLDRCQUE0QixFQUNoRCxjQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxJQUFJLGNBQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQzNFLENBQUM7SUFFRixNQUFNLFVBQVUsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLElBQUksY0FBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUUzRixNQUFNLGlCQUFpQixHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7SUFFL0MsR0FBRyxDQUFDLEdBQUcsQ0FBQyxjQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLFdBQVcsRUFBRSxXQUFXLENBQUMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0lBQ3RGLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtRQUN2RCxjQUFjLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLEVBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFDLENBQUMsQ0FBQztJQUNySCxDQUFDLENBQUMsQ0FBQztJQUVILE1BQU0sY0FBYyxHQUFHLElBQUEsZ0NBQVcsRUFBQztRQUNqQyxJQUFJLEVBQUUsVUFBVTtRQUNoQixZQUFZLEVBQUUsRUFBa0I7UUFDaEMsUUFBUSxFQUFFO1lBQ1IsSUFBSSxDQUFDLENBQWUsRUFBRSxJQUFrQjtnQkFDdEMsQ0FBQyxxQkFDSSxJQUFJLENBQ1IsQ0FBQztZQUNKLENBQUM7WUFDRCxHQUFHLENBQUMsQ0FBZSxFQUFFLE9BQTREO2dCQUMvRSxJQUFJLFFBQVEsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNsQyxJQUFJLFFBQVEsSUFBSSxJQUFJO29CQUNsQixRQUFRLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7Z0JBQ3JDLFFBQVEsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQztZQUM5QyxDQUFDO1lBQ0QsWUFBWSxDQUFDLEVBQWdCLEVBQzNCLFFBQXlFO1lBQzNFLENBQUM7U0FDRjtRQUNELEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQSxNQUFBLElBQUEsY0FBTSxHQUFFLENBQUMsVUFBVSwwQ0FBRSxPQUFPLENBQUE7S0FDdEMsQ0FBQyxDQUFDO0lBRUgsY0FBYyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUM1QixNQUFNLFlBQVksR0FBRyxJQUFBLHFDQUFnQixFQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDdkUsMERBQTBEO1FBQzFELGdEQUFnRDtRQUNoRCxNQUFNLGdCQUFnQixHQUFHLElBQUksR0FBRyxFQUFtRCxDQUFDO1FBRXBGLElBQUksWUFBRSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsRUFBRTtZQUM3QixLQUFLLFlBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxPQUFPLENBQUM7aUJBQzdDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDZCxjQUFjLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUM1RCxDQUFDLENBQUMsQ0FBQztTQUNKO1FBQ0QsT0FBTyxFQUFFLENBQUMsS0FBSztRQUNiLHNGQUFzRjtRQUN0RixZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FDcEIsRUFBRSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUNsRCxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUNWLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFO1lBQ1YsMEJBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFO2dCQUN0QixHQUFHLENBQUMsSUFBSSxDQUFDLGlDQUFpQyxDQUFDLENBQUM7Z0JBQzVDLE9BQU8sWUFBRSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN0RixDQUFDLENBQUMsQ0FBQztRQUNMLENBQUMsQ0FBQyxDQUNILEVBQ0QsWUFBWSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQzVCLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFDLE9BQU8sRUFBQyxFQUFFLEVBQUU7WUFDeEIsT0FBTyxjQUFjLENBQUMsUUFBUSxFQUFFLENBQUMsSUFBSSxDQUNuQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQ3pELEVBQUUsQ0FBQyxvQkFBb0IsRUFBRSxFQUN6QixFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxFQUNqQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUNWLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQ1gsTUFBTSxFQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDeEMsSUFBSSxPQUFPLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUMzQyxJQUFJLE9BQU8sSUFBSSxJQUFJLEVBQUU7b0JBQ25CLE9BQU8sR0FBRyxJQUFBLG9DQUFvQixFQUFDLElBQUksT0FBTyxDQUFDLE9BQU8sSUFBSSxPQUFPLENBQUMsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUN6RSxVQUFVLEVBQ1YsRUFBRSxNQUFNLEVBQUUsSUFBSTt3QkFDWixXQUFXLENBQUMsS0FBSyxFQUFFLElBQUk7NEJBQ3JCLE9BQU8sUUFBUSxDQUFDO3dCQUNsQixDQUFDO3FCQUNSLENBQUMsQ0FBQztvQkFDSCxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2lCQUN2QztnQkFDRCxPQUFPLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxDQUFDO29CQUNoQyxHQUFHLEVBQUUsSUFBQSx3QkFBUSxFQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQztvQkFDdEMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLE9BQU8sQ0FBQyxHQUFHO29CQUNsQyxJQUFJLEVBQUUsR0FBRyxFQUFFLEdBQUUsQ0FBQztpQkFDZixDQUFDLENBQUM7WUFDTCxDQUFDLENBQUMsQ0FDSCxDQUFDO1FBQ0osQ0FBQyxDQUFDLENBQ0gsQ0FDRixDQUFDLElBQUksQ0FDSixFQUFFLENBQUMsY0FBYyxFQUFFLEVBQ25CLEVBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7WUFDekIsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNmLE9BQU8sR0FBRyxDQUFDLENBQUMsc0JBQXNCO1FBQ3BDLENBQUMsQ0FBQyxDQUNILENBQUM7SUFDSixDQUFDLENBQUMsQ0FBQztJQUdILGdCQUFnQixDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQztRQUMvQyxrQkFBa0IsRUFBRSxJQUFJO0tBQ3pCLENBQUMsQ0FBQztJQUVILGdCQUFnQixDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDO1FBQ2xELENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDVixJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUM7WUFDaEIsSUFBSSxVQUFpQyxDQUFDO1lBQ3RDLElBQUksVUFBaUMsQ0FBQztZQUN0QyxRQUFRLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFO2dCQUNuQyxLQUFLLElBQUk7b0JBQ1AsVUFBVSxHQUFHLGNBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO29CQUMzQyxVQUFVLEdBQUcsY0FBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7b0JBQ3pDLE1BQU07Z0JBQ1IseUVBQXlFO2dCQUN6RSxLQUFLLE1BQU07b0JBQ1QsVUFBVSxHQUFHLGNBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztvQkFDakMsVUFBVSxHQUFHLGNBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztvQkFDL0IsTUFBTTtnQkFDUixLQUFLLFNBQVM7b0JBQ1osVUFBVSxHQUFHLGNBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztvQkFDbEMsVUFBVSxHQUFHLGNBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztvQkFDbEMsTUFBTTtnQkFDUixRQUFRO2FBQ1Q7WUFDRCxNQUFNLFlBQVksR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNwRCxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDcEIsTUFBTSxZQUFZLEdBQUcsSUFBSSxrQkFBUyxDQUFDO2dCQUNsQyxTQUFTLENBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFO29CQUN2QixJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUU7d0JBQzVCLE1BQU0sSUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7cUJBQzVCO3lCQUFNO3dCQUNMLE1BQU0sSUFBSSxLQUFlLENBQUM7cUJBQzNCO29CQUNELEVBQUUsRUFBRSxDQUFDO2dCQUNQLENBQUM7Z0JBQ0QsS0FBSyxDQUFDLEVBQUU7b0JBQ04sTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQTJCLENBQUM7b0JBQzFELE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFBRSxLQUFLLE1BQU0sQ0FBRSxDQUFDO29CQUMvRixNQUFNLElBQUksR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFXLENBQUM7b0JBQ3JDLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxZQUFZLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRTt3QkFDL0QsY0FBYyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxFQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFDLENBQUMsQ0FBQzt3QkFDNUcsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxHQUFHLGNBQWMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7d0JBQzVHLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0NBQWtDLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztxQkFDMUU7b0JBQ0QsRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7Z0JBQ2pDLENBQUM7YUFDRixDQUFDLENBQUM7WUFDSCxZQUFZLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1lBQ2hDLElBQUksVUFBVTtnQkFDWixZQUFZLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2hDLE9BQU8sWUFBWSxDQUFDO1FBQ3RCLENBQUM7S0FDRixDQUFDLENBQUM7QUFDTCxDQUFDO0FBL0pELDBDQStKQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtUcmFuc2Zvcm19IGZyb20gJ3N0cmVhbSc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHpsaWIgZnJvbSAnemxpYic7XG5pbXBvcnQge2NvbmZpZywgbG9nNEZpbGUsIEV4dGVuc2lvbkNvbnRleHR9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IHtzaHV0ZG93bkhvb2skfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L2FwcC1zZXJ2ZXInO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge1JlcXVlc3QsIFJlc3BvbnNlfSBmcm9tICdleHByZXNzJztcbmltcG9ydCB7Y3JlYXRlU2xpY2UsIGNhc3RCeUFjdGlvblR5cGV9IGZyb20gJ0B3ZmgvcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlL2Rpc3QvdGlueS1yZWR1eC10b29sa2l0JztcbmltcG9ydCB7TnBtUmVnaXN0cnlWZXJzaW9uSnNvbiwgVGFyYmFsbHNJbmZvfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7Y3JlYXRlUHJveHlXaXRoQ2FjaGUsIGtleU9mVXJpfSBmcm9tICcuL2NhY2hlLXNlcnZpY2UnO1xuXG5jb25zdCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY3JlYXRlTnBtUmVnaXN0cnlTZXJ2ZXIoYXBpOiBFeHRlbnNpb25Db250ZXh0KSB7XG4gIGNvbnN0IHNldHRpbmcgPSBjb25maWcoKVsnQHdmaC9hc3NldHMtcHJvY2Vzc2VyJ10ubnBtUmVnaXN0cnlDYWNoZVNlcnZlcjtcbiAgaWYgKHNldHRpbmcgPT0gbnVsbClcbiAgICByZXR1cm47XG4gIGNvbnN0IFNUQVRFX0ZJTEUgPSBQYXRoLnJlc29sdmUoc2V0dGluZy5jYWNoZURpciB8fCBjb25maWcucmVzb2x2ZSgnZGVzdERpcicpLCAnbnBtLXJlZ2lzdHJ5LWNhY2hlLmpzb24nKTtcblxuICBjb25zdCB2ZXJzaW9uc0NhY2hlQ3RsID0gY3JlYXRlUHJveHlXaXRoQ2FjaGUoUGF0aC5wb3NpeC5qb2luKHNldHRpbmcucGF0aCB8fCAnL3JlZ2lzdHJ5JywgJ3ZlcnNpb25zJyksXG4gICAgc2V0dGluZy5yZWdpc3RyeSB8fCAnaHR0cHM6Ly9yZWdpc3RyeS5ucG1qcy5vcmcnLFxuICAgIFBhdGgucG9zaXguam9pbihzZXR0aW5nLmNhY2hlRGlyIHx8IGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJyksICd2ZXJzaW9ucycpXG4gICk7XG5cbiAgY29uc3QgdGFyYmFsbERpciA9IFBhdGgucmVzb2x2ZShzZXR0aW5nLmNhY2hlRGlyIHx8IGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJyksICd0YXJiYWxscycpO1xuXG4gIGNvbnN0IHBrZ0Rvd25sb2FkUm91dGVyID0gYXBpLmV4cHJlc3MuUm91dGVyKCk7XG5cbiAgYXBpLnVzZShQYXRoLnBvc2l4LmpvaW4oc2V0dGluZy5wYXRoIHx8ICcvcmVnaXN0cnknLCAnX3RhcmJhbGxzJyksIHBrZ0Rvd25sb2FkUm91dGVyKTtcbiAgcGtnRG93bmxvYWRSb3V0ZXIuZ2V0KCcvOnBrZ05hbWUvOnZlcnNpb24nLCAocmVxLCByZXMpID0+IHtcbiAgICBwa2dEb3dubG9hZEN0bC5hY3Rpb25EaXNwYXRjaGVyLmZldGNoVGFyYmFsbCh7cmVxLCByZXMsIHBrZ05hbWU6IHJlcS5wYXJhbXMucGtnTmFtZSwgdmVyc2lvbjogcmVxLnBhcmFtcy52ZXJzaW9ufSk7XG4gIH0pO1xuXG4gIGNvbnN0IHBrZ0Rvd25sb2FkQ3RsID0gY3JlYXRlU2xpY2Uoe1xuICAgIG5hbWU6ICdwa2dDYWNoZScsXG4gICAgaW5pdGlhbFN0YXRlOiB7fSBhcyBUYXJiYWxsc0luZm8sXG4gICAgcmVkdWNlcnM6IHtcbiAgICAgIGxvYWQoczogVGFyYmFsbHNJbmZvLCBkYXRhOiBUYXJiYWxsc0luZm8pIHtcbiAgICAgICAgcyA9IHtcbiAgICAgICAgICAuLi5kYXRhXG4gICAgICAgIH07XG4gICAgICB9LFxuICAgICAgYWRkKHM6IFRhcmJhbGxzSW5mbywgcGF5bG9hZDoge3BrZ05hbWU6IHN0cmluZzsgdmVyc2lvbjogc3RyaW5nOyBvcmlnVXJsOiBzdHJpbmd9KSB7XG4gICAgICAgIGxldCBwa2dFbnRyeSA9IHNbcGF5bG9hZC5wa2dOYW1lXTtcbiAgICAgICAgaWYgKHBrZ0VudHJ5ID09IG51bGwpXG4gICAgICAgICAgcGtnRW50cnkgPSBzW3BheWxvYWQucGtnTmFtZV0gPSB7fTtcbiAgICAgICAgcGtnRW50cnlbcGF5bG9hZC52ZXJzaW9uXSA9IHBheWxvYWQub3JpZ1VybDtcbiAgICAgIH0sXG4gICAgICBmZXRjaFRhcmJhbGwoX3M6IFRhcmJhbGxzSW5mbyxcbiAgICAgICAgX3BheWxvYWQ6IHtyZXE6IFJlcXVlc3Q7IHJlczogUmVzcG9uc2UsIHBrZ05hbWU6IHN0cmluZzsgdmVyc2lvbjogc3RyaW5nfSkge1xuICAgICAgfVxuICAgIH0sXG4gICAgZGVidWc6ICEhY29uZmlnKCkuY2xpT3B0aW9ucz8udmVyYm9zZVxuICB9KTtcblxuICBwa2dEb3dubG9hZEN0bC5lcGljKGFjdGlvbiQgPT4ge1xuICAgIGNvbnN0IGFjdGlvbkJ5VHlwZSA9IGNhc3RCeUFjdGlvblR5cGUocGtnRG93bmxvYWRDdGwuYWN0aW9ucywgYWN0aW9uJCk7XG4gICAgLy8gY29uc3QgZmV0Y2hBY3Rpb25TdGF0ZSA9IG5ldyBNYXA8c3RyaW5nLCBSZXNwb25zZVtdPigpO1xuICAgIC8vIG1hcCBrZXkgaXMgaG9zdCBuYW1lIG9mIHJlbW90ZSB0YXJiYWxsIHNlcnZlclxuICAgIGNvbnN0IGNhY2hlU3ZjQnlPcmlnaW4gPSBuZXcgTWFwPHN0cmluZywgUmV0dXJuVHlwZTx0eXBlb2YgY3JlYXRlUHJveHlXaXRoQ2FjaGU+PigpO1xuXG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoU1RBVEVfRklMRSkpIHtcbiAgICAgIHZvaWQgZnMucHJvbWlzZXMucmVhZEZpbGUoU1RBVEVfRklMRSwgJ3V0Zi04JylcbiAgICAgIC50aGVuKGNvbnRlbnQgPT4ge1xuICAgICAgICBwa2dEb3dubG9hZEN0bC5hY3Rpb25EaXNwYXRjaGVyLmxvYWQoSlNPTi5wYXJzZShjb250ZW50KSk7XG4gICAgICB9KTtcbiAgICB9XG4gICAgcmV0dXJuIHJ4Lm1lcmdlKFxuICAgICAgLy8gQWZ0ZXIgc3RhdGUgaXMgbG9hZGVkIGFuZCBjaGFuZ2VkLCBhZGQgYSBzZXJ2ZXIgc2h1dGRvd24gaG9vayB0byBzYXZlIHN0YXRlIHRvIGZpbGVcbiAgICAgIGFjdGlvbkJ5VHlwZS5sb2FkLnBpcGUoXG4gICAgICAgIG9wLnN3aXRjaE1hcChfYWN0aW9uID0+IHBrZ0Rvd25sb2FkQ3RsLmdldFN0b3JlKCkpLFxuICAgICAgICBvcC50YWtlKDEpLFxuICAgICAgICBvcC5tYXAoKCkgPT4ge1xuICAgICAgICAgIHNodXRkb3duSG9vayQubmV4dCgoKSA9PiB7XG4gICAgICAgICAgICBsb2cuaW5mbygnU2F2ZSBjaGFuZ2VkIG5wbS1yZWdpc3RyeS1jYWNoZScpO1xuICAgICAgICAgICAgcmV0dXJuIGZzLnByb21pc2VzLndyaXRlRmlsZShTVEFURV9GSUxFLCBKU09OLnN0cmluZ2lmeShwa2dEb3dubG9hZEN0bC5nZXRTdGF0ZSgpKSk7XG4gICAgICAgICAgfSk7XG4gICAgICAgIH0pXG4gICAgICApLFxuICAgICAgYWN0aW9uQnlUeXBlLmZldGNoVGFyYmFsbC5waXBlKFxuICAgICAgICBvcC5tZXJnZU1hcCgoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHBrZ0Rvd25sb2FkQ3RsLmdldFN0b3JlKCkucGlwZShcbiAgICAgICAgICAgIG9wLm1hcChzID0+IF8uZ2V0KHMsIFtwYXlsb2FkLnBrZ05hbWUsIHBheWxvYWQudmVyc2lvbl0pKSxcbiAgICAgICAgICAgIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICAgICAgICBvcC5maWx0ZXIodmFsdWUgPT4gdmFsdWUgIT0gbnVsbCksXG4gICAgICAgICAgICBvcC50YWtlKDEpLFxuICAgICAgICAgICAgb3AubWFwKHVybCA9PiB7XG4gICAgICAgICAgICAgIGNvbnN0IHtvcmlnaW4sIHBhdGhuYW1lfSA9IG5ldyBVUkwodXJsKTtcbiAgICAgICAgICAgICAgbGV0IHNlcnZpY2UgPSBjYWNoZVN2Y0J5T3JpZ2luLmdldChvcmlnaW4pO1xuICAgICAgICAgICAgICBpZiAoc2VydmljZSA9PSBudWxsKSB7XG4gICAgICAgICAgICAgICAgc2VydmljZSA9IGNyZWF0ZVByb3h5V2l0aENhY2hlKGAvJHtwYXlsb2FkLnBrZ05hbWV9LyR7cGF5bG9hZC52ZXJzaW9ufWAsIG9yaWdpbixcbiAgICAgICAgICAgICAgICAgICAgICB0YXJiYWxsRGlyLFxuICAgICAgICAgICAgICAgICAgICAgIHsgbWFudWFsOiB0cnVlLFxuICAgICAgICAgICAgICAgICAgICAgICAgcGF0aFJld3JpdGUoX3BhdGgsIF9yZXEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHBhdGhuYW1lO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIGNhY2hlU3ZjQnlPcmlnaW4uc2V0KG9yaWdpbiwgc2VydmljZSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgc2VydmljZS5hY3Rpb25EaXNwYXRjaGVyLmhpdENhY2hlKHtcbiAgICAgICAgICAgICAgICBrZXk6IGtleU9mVXJpKHBheWxvYWQucmVxLm1ldGhvZCwgdXJsKSxcbiAgICAgICAgICAgICAgICByZXE6IHBheWxvYWQucmVxLCByZXM6IHBheWxvYWQucmVzLFxuICAgICAgICAgICAgICAgIG5leHQ6ICgpID0+IHt9XG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICApO1xuICAgICAgICB9KVxuICAgICAgKVxuICAgICkucGlwZShcbiAgICAgIG9wLmlnbm9yZUVsZW1lbnRzKCksXG4gICAgICBvcC5jYXRjaEVycm9yKChlcnIsIHNyYykgPT4ge1xuICAgICAgICBsb2cuZXJyb3IoZXJyKTtcbiAgICAgICAgcmV0dXJuIHNyYzsgLy8gcmUtc3Vic3JpYmUgb24gZmFpbFxuICAgICAgfSlcbiAgICApO1xuICB9KTtcblxuXG4gIHZlcnNpb25zQ2FjaGVDdGwuYWN0aW9uRGlzcGF0Y2hlci5jb25maWd1cmVQcm94eSh7XG4gICAgc2VsZkhhbmRsZVJlc3BvbnNlOiB0cnVlXG4gIH0pO1xuXG4gIHZlcnNpb25zQ2FjaGVDdGwuYWN0aW9uRGlzcGF0Y2hlci5jb25maWdUcmFuc2Zvcm1lcihbXG4gICAgKGhlYWRlcnMpID0+IHtcbiAgICAgIGxldCBidWZmZXIgPSAnJztcbiAgICAgIGxldCBkZWNvbXByZXNzOiBUcmFuc2Zvcm0gfCB1bmRlZmluZWQ7XG4gICAgICBsZXQgY29tcHJlc3NlcjogVHJhbnNmb3JtIHwgdW5kZWZpbmVkO1xuICAgICAgc3dpdGNoIChoZWFkZXJzWydjb250ZW50LWVuY29kaW5nJ10pIHtcbiAgICAgICAgY2FzZSAnYnInOlxuICAgICAgICAgIGRlY29tcHJlc3MgPSB6bGliLmNyZWF0ZUJyb3RsaURlY29tcHJlc3MoKTtcbiAgICAgICAgICBjb21wcmVzc2VyID0gemxpYi5jcmVhdGVCcm90bGlDb21wcmVzcygpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBPciwganVzdCB1c2UgemxpYi5jcmVhdGVVbnppcCgpIHRvIGhhbmRsZSBib3RoIG9mIHRoZSBmb2xsb3dpbmcgY2FzZXM6XG4gICAgICAgIGNhc2UgJ2d6aXAnOlxuICAgICAgICAgIGRlY29tcHJlc3MgPSB6bGliLmNyZWF0ZUd1bnppcCgpO1xuICAgICAgICAgIGNvbXByZXNzZXIgPSB6bGliLmNyZWF0ZUd6aXAoKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnZGVmbGF0ZSc6XG4gICAgICAgICAgZGVjb21wcmVzcyA9IHpsaWIuY3JlYXRlSW5mbGF0ZSgpO1xuICAgICAgICAgIGNvbXByZXNzZXIgPSB6bGliLmNyZWF0ZURlZmxhdGUoKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgIH1cbiAgICAgIGNvbnN0IHRyYW5zZm9ybWVycyA9IGRlY29tcHJlc3MgPyBbZGVjb21wcmVzc10gOiBbXTtcbiAgICAgIHRyYW5zZm9ybWVycy5wdXNoKCk7XG4gICAgICBjb25zdCBwcm9jZXNzVHJhbnMgPSBuZXcgVHJhbnNmb3JtKHtcbiAgICAgICB0cmFuc2Zvcm0oY2h1bmssIF9lbmNvZGUsIGNiKSB7XG4gICAgICAgICAgICBpZiAoQnVmZmVyLmlzQnVmZmVyKGNodW5rKSkge1xuICAgICAgICAgICAgYnVmZmVyICs9IGNodW5rLnRvU3RyaW5nKCk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGJ1ZmZlciArPSBjaHVuayBhcyBzdHJpbmc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNiKCk7XG4gICAgICAgIH0sXG4gICAgICAgIGZsdXNoKGNiKSB7XG4gICAgICAgICAgY29uc3QganNvbiA9IEpTT04ucGFyc2UoYnVmZmVyKSBhcyBOcG1SZWdpc3RyeVZlcnNpb25Kc29uO1xuICAgICAgICAgIGNvbnN0IGhvc3RIZWFkZXIgPSBoZWFkZXJzLmZpbmQoKFtoZWFkZXJOYW1lLCB2YWx1ZV0pID0+IGhlYWRlck5hbWUudG9Mb3dlckNhc2UoKSA9PT0gJ2hvc3QnKSE7XG4gICAgICAgICAgY29uc3QgaG9zdCA9IGhvc3RIZWFkZXJbMV0gYXMgc3RyaW5nO1xuICAgICAgICAgIGZvciAoY29uc3QgW3ZlciwgdmVyc2lvbkVudHJ5XSBvZiBPYmplY3QuZW50cmllcyhqc29uLnZlcnNpb25zKSkge1xuICAgICAgICAgICAgcGtnRG93bmxvYWRDdGwuYWN0aW9uRGlzcGF0Y2hlci5hZGQoe3BrZ05hbWU6IGpzb24ubmFtZSwgdmVyc2lvbjogdmVyLCBvcmlnVXJsOiB2ZXJzaW9uRW50cnkuZGlzdC50YXJiYWxsfSk7XG4gICAgICAgICAgICB2ZXJzaW9uRW50cnkuZGlzdC50YXJiYWxsID0gaG9zdCArIGAvX3RhcmJhbGxzLyR7ZW5jb2RlVVJJQ29tcG9uZW50KGpzb24ubmFtZSl9LyR7ZW5jb2RlVVJJQ29tcG9uZW50KHZlcil9YDtcbiAgICAgICAgICAgIGxvZy5pbmZvKCdyZXdyaXRlIHRhcmJhbGwgZG93bmxvYWQgVVJMIHRvICcgKyB2ZXJzaW9uRW50cnkuZGlzdC50YXJiYWxsKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgY2IobnVsbCwgSlNPTi5zdHJpbmdpZnkoanNvbikpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHRyYW5zZm9ybWVycy5wdXNoKHByb2Nlc3NUcmFucyk7XG4gICAgICBpZiAoY29tcHJlc3NlcilcbiAgICAgICAgdHJhbnNmb3JtZXJzLnB1c2goY29tcHJlc3Nlcik7XG4gICAgICByZXR1cm4gdHJhbnNmb3JtZXJzO1xuICAgIH1cbiAgXSk7XG59XG5cblxuIl19