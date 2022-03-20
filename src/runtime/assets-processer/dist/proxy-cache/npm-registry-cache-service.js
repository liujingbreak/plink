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
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const _ = __importStar(require("lodash"));
const tiny_redux_toolkit_1 = require("@wfh/redux-toolkit-observable/dist/tiny-redux-toolkit");
const cache_service_1 = require("./cache-service");
// import insp from 'inspector';
// insp.open(9222, '0.0.0.0', true);
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
    api.expressAppSet(app => app.use(serveTarballPath, pkgDownloadRouter));
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
        // const cacheSvcByOrigin = new Map<string, ReturnType<typeof createProxyWithCache>>();
        const tarballCacheSerivce = (0, cache_service_1.createProxyWithCache)('', { followRedirects: true }, tarballDir);
        if (fs_1.default.existsSync(STATE_FILE)) {
            void fs_1.default.promises.readFile(STATE_FILE, 'utf-8')
                .then(content => {
                log.info('Read cache state file:', STATE_FILE);
                pkgDownloadCtl.actionDispatcher.load(JSON.parse(content));
            });
        }
        return rx.merge(actionByType.fetchTarball.pipe(op.mergeMap(({ payload }) => {
            return pkgDownloadCtl.getStore().pipe(op.map(s => _.get(s, [payload.pkgName, payload.version])), op.distinctUntilChanged(), op.filter(value => value != null), op.take(1), op.map(url => {
                try {
                    log.warn('download', url);
                    tarballCacheSerivce.actionDispatcher.hitCache({
                        key: url.replace(/:/g, '.'),
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
    return () => {
        log.info('Save changed', STATE_FILE);
        return fs_1.default.promises.writeFile(STATE_FILE, JSON.stringify(pkgDownloadCtl.getState(), null, '  '));
    };
}
exports.default = createNpmRegistryServer;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnBtLXJlZ2lzdHJ5LWNhY2hlLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJucG0tcmVnaXN0cnktY2FjaGUtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxnREFBd0I7QUFDeEIsbUNBQTZFO0FBQzdFLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsc0NBQThEO0FBQzlELHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMsMENBQTRCO0FBRTVCLDhGQUFvRztBQUVwRyxtREFBcUQ7QUFDckQsZ0NBQWdDO0FBQ2hDLG9DQUFvQztBQUVwQyxNQUFNLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUM7QUFPakMsU0FBd0IsdUJBQXVCLENBQUMsR0FBcUI7O0lBQ25FLE1BQU0sT0FBTyxHQUFHLElBQUEsY0FBTSxHQUFFLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQztJQUN6RSxJQUFJLE9BQU8sSUFBSSxJQUFJO1FBQ2pCLE9BQU87SUFDVCxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUMsbUJBQW1CLElBQUEsY0FBTSxHQUFFLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUEsY0FBTSxHQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzVHLE1BQU0sVUFBVSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsSUFBSSxjQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLHlCQUF5QixDQUFDLENBQUM7SUFFMUcsTUFBTSxTQUFTLEdBQUcsY0FBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDM0UsR0FBRyxDQUFD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QUM7b0JBQzNCLElBQUk7d0JBQ0YsNERBQTREO3dCQUM1RCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUM7d0JBQ2xCLE9BQU8sQ0FBQyxTQUFTLENBQUM7NEJBQ2hCLElBQUksQ0FBQyxHQUFHO2dDQUNOLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7NEJBQ2pCLENBQUM7NEJBQ0QsS0FBSyxDQUFDLEdBQUc7Z0NBQ1AsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQzs0QkFDcEIsQ0FBQzs0QkFDRCxRQUFRO2dDQUNOLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7NEJBQ2xCLENBQUM7eUJBQ0YsQ0FBQyxDQUFDO29CQUNMLENBQUM7aUJBQ0YsQ0FBQzthQUNILENBQUM7UUFDSixDQUFDLENBQUM7SUFDSixDQUFDO0lBRUQsT0FBTyxHQUFHLEVBQUU7UUFDVixHQUFHLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUNyQyxPQUFPLFlBQUUsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUNsRyxDQUFDLENBQUM7QUFDSixDQUFDO0FBdk5ELDBDQXVOQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtUcmFuc2Zvcm0sIFdyaXRhYmxlLCBSZWFkYWJsZSwgcHJvbWlzZXMgYXMgc3RyZWFtUHJvbX0gZnJvbSAnc3RyZWFtJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgemxpYiBmcm9tICd6bGliJztcbmltcG9ydCB7Y29uZmlnLCBsb2c0RmlsZSwgRXh0ZW5zaW9uQ29udGV4dH0gZnJvbSAnQHdmaC9wbGluayc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7UmVxdWVzdCwgUmVzcG9uc2V9IGZyb20gJ2V4cHJlc3MnO1xuaW1wb3J0IHtjcmVhdGVTbGljZSwgY2FzdEJ5QWN0aW9uVHlwZX0gZnJvbSAnQHdmaC9yZWR1eC10b29sa2l0LW9ic2VydmFibGUvZGlzdC90aW55LXJlZHV4LXRvb2xraXQnO1xuaW1wb3J0IHtDYWNoZURhdGEsIE5wbVJlZ2lzdHJ5VmVyc2lvbkpzb24sIFRhcmJhbGxzSW5mbywgVHJhbnNmb3JtZXJ9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtjcmVhdGVQcm94eVdpdGhDYWNoZX0gZnJvbSAnLi9jYWNoZS1zZXJ2aWNlJztcbi8vIGltcG9ydCBpbnNwIGZyb20gJ2luc3BlY3Rvcic7XG4vLyBpbnNwLm9wZW4oOTIyMiwgJzAuMC4wLjAnLCB0cnVlKTtcblxuY29uc3QgbG9nID0gbG9nNEZpbGUoX19maWxlbmFtZSk7XG5cbnR5cGUgUGtnRG93bmxvYWRSZXF1ZXN0UGFyYW1zID0ge1xuICBwa2dOYW1lOiBzdHJpbmc7XG4gIHZlcnNpb246IHN0cmluZztcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGZ1bmN0aW9uIGNyZWF0ZU5wbVJlZ2lzdHJ5U2VydmVyKGFwaTogRXh0ZW5zaW9uQ29udGV4dCkge1xuICBjb25zdCBzZXR0aW5nID0gY29uZmlnKClbJ0B3ZmgvYXNzZXRzLXByb2Nlc3NlciddLm5wbVJlZ2lzdHJ5Q2FjaGVTZXJ2ZXI7XG4gIGlmIChzZXR0aW5nID09IG51bGwpXG4gICAgcmV0dXJuO1xuICBjb25zdCBERUZBVUxUX0hPU1QgPSBzZXR0aW5nLmhvc3QgfHwgKGBodHRwOi8vbG9jYWxob3N0JHtjb25maWcoKS5wb3J0ICE9PSA4MCA/ICc6JyArIGNvbmZpZygpLnBvcnQgOiAnJ31gKTtcbiAgY29uc3QgU1RBVEVfRklMRSA9IFBhdGgucmVzb2x2ZShzZXR0aW5nLmNhY2hlRGlyIHx8IGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJyksICducG0tcmVnaXN0cnktY2FjaGUuanNvbicpO1xuXG4gIGNvbnN0IHNlcnZlUGF0aCA9IFBhdGgucG9zaXguam9pbihzZXR0aW5nLnBhdGggfHwgJy9yZWdpc3RyeScsICd2ZXJzaW9ucycpO1xuICBsb2cuaW5mbygnTlBNIHJlZ2lzdHJ5IGNhY2hlIGlzIHNlcnZpbmcgYXQgJywgc2VydmVQYXRoKTtcbiAgY29uc3QgdmVyc2lvbnNDYWNoZUN0bCA9IGNyZWF0ZVByb3h5V2l0aENhY2hlKHNlcnZlUGF0aCwge1xuICAgICAgc2VsZkhhbmRsZVJlc3BvbnNlOiB0cnVlLFxuICAgICAgdGFyZ2V0OiBzZXR0aW5nLnJlZ2lzdHJ5IHx8ICdodHRwczovL3JlZ2lzdHJ5Lm5wbWpzLm9yZydcbiAgICB9LFxuICAgIFBhdGgucG9zaXguam9pbihzZXR0aW5nLmNhY2hlRGlyIHx8IGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJyksICd2ZXJzaW9ucycpXG4gICk7XG5cbiAgY29uc3QgdGFyYmFsbERpciA9IFBhdGgucmVzb2x2ZShzZXR0aW5nLmNhY2hlRGlyIHx8IGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJyksICdkb3dubG9hZC10YXJiYWxscycpO1xuICBjb25zdCBwa2dEb3dubG9hZFJvdXRlciA9IGFwaS5leHByZXNzLlJvdXRlcigpO1xuICBjb25zdCBzZXJ2ZVRhcmJhbGxQYXRoID0gUGF0aC5wb3NpeC5qb2luKHNldHRpbmcucGF0aCB8fCAnL3JlZ2lzdHJ5JywgJ190YXJiYWxscycpO1xuXG4gIGFwaS5leHByZXNzQXBwU2V0KGFwcCA9PiBhcHAudXNlKHNlcnZlVGFyYmFsbFBhdGgsIHBrZ0Rvd25sb2FkUm91dGVyKSk7XG5cbiAgcGtnRG93bmxvYWRSb3V0ZXIuZ2V0PFBrZ0Rvd25sb2FkUmVxdWVzdFBhcmFtcz4oJy86cGtnTmFtZS86dmVyc2lvbicsIChyZXEsIHJlcykgPT4ge1xuICAgIGxvZy5pbmZvKCdpbmNvbWluZyByZXF1ZXN0IGRvd25sb2FkIHRhcmJhbGwnLCByZXEudXJsKTtcbiAgICBwa2dEb3dubG9hZEN0bC5hY3Rpb25EaXNwYXRjaGVyLmZldGNoVGFyYmFsbCh7XG4gICAgICByZXEsIHJlcywgcGtnTmFtZTogcmVxLnBhcmFtcy5wa2dOYW1lLCB2ZXJzaW9uOiByZXEucGFyYW1zLnZlcnNpb259KTtcbiAgfSk7XG5cbiAgY29uc3QgcGtnRG93bmxvYWRDdGwgPSBjcmVhdGVTbGljZSh7XG4gICAgbmFtZTogJ3BrZ0NhY2hlJyxcbiAgICBpbml0aWFsU3RhdGU6IHt9IGFzIFRhcmJhbGxzSW5mbyxcbiAgICByZWR1Y2Vyczoge1xuICAgICAgbG9hZChzOiBUYXJiYWxsc0luZm8sIGRhdGE6IFRhcmJhbGxzSW5mbykge1xuICAgICAgICBPYmplY3QuYXNzaWduKHMsIGRhdGEpO1xuICAgICAgfSxcbiAgICAgIGFkZChzOiBUYXJiYWxsc0luZm8sIHBheWxvYWQ6IHtwa2dOYW1lOiBzdHJpbmc7IHZlcnNpb25zOiB7W3ZlcnNpb246IHN0cmluZ106IHN0cmluZ319KSB7XG4gICAgICAgIGxldCBwa2dFbnRyeSA9IHNbcGF5bG9hZC5wa2dOYW1lXTtcbiAgICAgICAgaWYgKHBrZ0VudHJ5ID09IG51bGwpXG4gICAgICAgICAgc1twYXlsb2FkLnBrZ05hbWVdID0gcGF5bG9hZC52ZXJzaW9ucztcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHNbcGF5bG9hZC5wa2dOYW1lXSA9IHsuLi5wa2dFbnRyeSwgLi4ucGF5bG9hZC52ZXJzaW9uc307XG4gICAgICB9LFxuICAgICAgZmV0Y2hUYXJiYWxsKF9zOiBUYXJiYWxsc0luZm8sXG4gICAgICAgIF9wYXlsb2FkOiB7cmVxOiBSZXF1ZXN0PFBrZ0Rvd25sb2FkUmVxdWVzdFBhcmFtcz47IHJlczogUmVzcG9uc2U7IHBrZ05hbWU6IHN0cmluZzsgdmVyc2lvbjogc3RyaW5nfSkge1xuICAgICAgfVxuICAgIH0sXG4gICAgZGVidWdBY3Rpb25Pbmx5OiAhIWNvbmZpZygpLmNsaU9wdGlvbnM/LnZlcmJvc2VcbiAgfSk7XG5cbiAgcGtnRG93bmxvYWRDdGwuZXBpYyhhY3Rpb24kID0+IHtcbiAgICBjb25zdCBhY3Rpb25CeVR5cGUgPSBjYXN0QnlBY3Rpb25UeXBlKHBrZ0Rvd25sb2FkQ3RsLmFjdGlvbnMsIGFjdGlvbiQpO1xuICAgIC8vIGNvbnN0IGZldGNoQWN0aW9uU3RhdGUgPSBuZXcgTWFwPHN0cmluZywgUmVzcG9uc2VbXT4oKTtcbiAgICAvLyBtYXAga2V5IGlzIGhvc3QgbmFtZSBvZiByZW1vdGUgdGFyYmFsbCBzZXJ2ZXJcbiAgICAvLyBjb25zdCBjYWNoZVN2Y0J5T3JpZ2luID0gbmV3IE1hcDxzdHJpbmcsIFJldHVyblR5cGU8dHlwZW9mIGNyZWF0ZVByb3h5V2l0aENhY2hlPj4oKTtcbiAgICBjb25zdCB0YXJiYWxsQ2FjaGVTZXJpdmNlID0gY3JlYXRlUHJveHlXaXRoQ2FjaGUoJycsIHtmb2xsb3dSZWRpcmVjdHM6IHRydWV9LFxuICAgICAgdGFyYmFsbERpcik7XG5cbiAgICBpZiAoZnMuZXhpc3RzU3luYyhTVEFURV9GSUxFKSkge1xuICAgICAgdm9pZCBmcy5wcm9taXNlcy5yZWFkRmlsZShTVEFURV9GSUxFLCAndXRmLTgnKVxuICAgICAgLnRoZW4oY29udGVudCA9PiB7XG4gICAgICAgIGxvZy5pbmZvKCdSZWFkIGNhY2hlIHN0YXRlIGZpbGU6JywgU1RBVEVfRklMRSk7XG4gICAgICAgIHBrZ0Rvd25sb2FkQ3RsLmFjdGlvbkRpc3BhdGNoZXIubG9hZChKU09OLnBhcnNlKGNvbnRlbnQpKTtcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIHJldHVybiByeC5tZXJnZShcbiAgICAgICBhY3Rpb25CeVR5cGUuZmV0Y2hUYXJiYWxsLnBpcGUoXG4gICAgICAgIG9wLm1lcmdlTWFwKCh7cGF5bG9hZH0pID0+IHtcbiAgICAgICAgICByZXR1cm4gcGtnRG93bmxvYWRDdGwuZ2V0U3RvcmUoKS5waXBlKFxuICAgICAgICAgICAgb3AubWFwKHMgPT4gXy5nZXQocywgW3BheWxvYWQucGtnTmFtZSwgcGF5bG9hZC52ZXJzaW9uXSkpLFxuICAgICAgICAgICAgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICAgICAgICAgIG9wLmZpbHRlcih2YWx1ZSA9PiB2YWx1ZSAhPSBudWxsKSxcbiAgICAgICAgICAgIG9wLnRha2UoMSksXG4gICAgICAgICAgICBvcC5tYXAodXJsID0+IHtcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBsb2cud2FybignZG93bmxvYWQnLCB1cmwpO1xuICAgICAgICAgICAgICAgIHRhcmJhbGxDYWNoZVNlcml2Y2UuYWN0aW9uRGlzcGF0Y2hlci5oaXRDYWNoZSh7XG4gICAgICAgICAgICAgICAgICBrZXk6IHVybC5yZXBsYWNlKC86L2csICcuJyksXG4gICAgICAgICAgICAgICAgICByZXE6IHBheWxvYWQucmVxLCByZXM6IHBheWxvYWQucmVzLFxuICAgICAgICAgICAgICAgICAgbmV4dDogKCkgPT4ge30sXG4gICAgICAgICAgICAgICAgICB0YXJnZXQ6IHVybFxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICAgICAgbG9nLmVycm9yKCdGYWlsZWQgZm9yIGRvd25sb2FkIFVSTDonICsgdXJsLCBlKTtcbiAgICAgICAgICAgICAgICB0aHJvdyBlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICk7XG4gICAgICAgIH0pXG4gICAgICApXG4gICAgKS5waXBlKFxuICAgICAgb3AuaWdub3JlRWxlbWVudHMoKSxcbiAgICAgIG9wLmNhdGNoRXJyb3IoKGVyciwgc3JjKSA9PiB7XG4gICAgICAgIGxvZy5lcnJvcihlcnIpO1xuICAgICAgICByZXR1cm4gc3JjOyAvLyByZS1zdWJzcmliZSBvbiBmYWlsXG4gICAgICB9KVxuICAgICk7XG4gIH0pO1xuXG4gIHZlcnNpb25zQ2FjaGVDdGwuYWN0aW9uRGlzcGF0Y2hlci5jb25maWdUcmFuc2Zvcm1lcih7XG4gICAgcmVtb3RlOiBjcmVhdGVUcmFuc2Zvcm1lcih0cnVlKSxcbiAgICBjYWNoZWQ6IGNyZWF0ZVRyYW5zZm9ybWVyKGZhbHNlKVxuICB9KTtcblxuICBmdW5jdGlvbiBjcmVhdGVUcmFuc2Zvcm1lcih0cmFja1JlbW90ZVVybDogYm9vbGVhbik6IFRyYW5zZm9ybWVyIHtcbiAgICByZXR1cm4gYXN5bmMgKGhlYWRlcnM6IENhY2hlRGF0YVsnaGVhZGVycyddLCByZXFIb3N0OiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gICAgICBzb3VyY2U6IE5vZGVKUy5SZWFkYWJsZVN0cmVhbSkgPT4ge1xuICAgICAgbGV0IGZyYWdtZW50cyA9ICcnO1xuICAgICAgbGV0IGJ1Zkxlbmd0aCA9IDA7XG4gICAgICBjb25zdCBzdWJqZWN0ID0gbmV3IHJ4LlJlcGxheVN1YmplY3Q8QnVmZmVyPigpO1xuICAgICAgbGV0IGRlY29tcHJlc3M6IE5vZGVKUy5SZWFkV3JpdGVTdHJlYW0gfCB1bmRlZmluZWQ7XG4gICAgICBsZXQgY29tcHJlc3NlcjogTm9kZUpTLlJlYWRXcml0ZVN0cmVhbSB8IHVuZGVmaW5lZDtcbiAgICAgIGNvbnN0IGVuY29kaW5nSGVhZGVyID0gaGVhZGVycy5maW5kKChbbmFtZV0pID0+IG5hbWUgPT09ICdjb250ZW50LWVuY29kaW5nJyk7XG4gICAgICBjb25zdCBjb250ZW50RW5jb2RpbmcgPSBlbmNvZGluZ0hlYWRlciA/IGVuY29kaW5nSGVhZGVyWzFdIDogJyc7XG4gICAgICBzd2l0Y2ggKGNvbnRlbnRFbmNvZGluZykge1xuICAgICAgICBjYXNlICdicic6XG4gICAgICAgICAgZGVjb21wcmVzcyA9IHpsaWIuY3JlYXRlQnJvdGxpRGVjb21wcmVzcygpO1xuICAgICAgICAgIGNvbXByZXNzZXIgPSB6bGliLmNyZWF0ZUJyb3RsaUNvbXByZXNzKCk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIC8vIE9yLCBqdXN0IHVzZSB6bGliLmNyZWF0ZVVuemlwKCkgdG8gaGFuZGxlIGJvdGggb2YgdGhlIGZvbGxvd2luZyBjYXNlczpcbiAgICAgICAgY2FzZSAnZ3ppcCc6XG4gICAgICAgICAgZGVjb21wcmVzcyA9IHpsaWIuY3JlYXRlR3VuemlwKCk7XG4gICAgICAgICAgY29tcHJlc3NlciA9IHpsaWIuY3JlYXRlR3ppcCgpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlICdkZWZsYXRlJzpcbiAgICAgICAgICBkZWNvbXByZXNzID0gemxpYi5jcmVhdGVJbmZsYXRlKCk7XG4gICAgICAgICAgY29tcHJlc3NlciA9IHpsaWIuY3JlYXRlRGVmbGF0ZSgpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICBkZWZhdWx0OlxuICAgICAgfVxuICAgICAgY29uc3QgdHJhbnNmb3JtZXJzOiBhbnlbXSA9IGRlY29tcHJlc3MgPyBbZGVjb21wcmVzc10gOiBbXTtcbiAgICAgIGNvbnN0IHByb2Nlc3NUcmFucyA9IG5ldyBUcmFuc2Zvcm0oe1xuICAgICAgICB0cmFuc2Zvcm0oY2h1bmssIF9lbmNvZGUsIGNiKSB7XG4gICAgICAgICAgaWYgKEJ1ZmZlci5pc0J1ZmZlcihjaHVuaykpIHtcbiAgICAgICAgICAgIGZyYWdtZW50cyArPSBjaHVuay50b1N0cmluZygpO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBmcmFnbWVudHMgKz0gY2h1bmsgYXMgc3RyaW5nO1xuICAgICAgICAgIH1cbiAgICAgICAgICBjYigpO1xuICAgICAgICB9LFxuICAgICAgICBmbHVzaChjYikge1xuICAgICAgICAgIGlmIChmcmFnbWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICByZXR1cm4gY2IobnVsbCwgJycpO1xuICAgICAgICAgIH1cbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QganNvbiA9IEpTT04ucGFyc2UoZnJhZ21lbnRzKSBhcyBOcG1SZWdpc3RyeVZlcnNpb25Kc29uO1xuICAgICAgICAgICAgY29uc3QgcGFyYW06IHtbdmVyOiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG5cbiAgICAgICAgICAgIGZvciAoY29uc3QgW3ZlciwgdmVyc2lvbkVudHJ5XSBvZiBPYmplY3QuZW50cmllcyhqc29uLnZlcnNpb25zKSkge1xuICAgICAgICAgICAgICBjb25zdCBvcmlnVGFyYmFsbFVybCA9IHBhcmFtW3Zlcl0gPSB2ZXJzaW9uRW50cnkuZGlzdC50YXJiYWxsO1xuICAgICAgICAgICAgICBjb25zdCB1cmxPYmogPSBuZXcgVVJMKG9yaWdUYXJiYWxsVXJsKTtcbiAgICAgICAgICAgICAgY29uc3QgdXJsID0gdmVyc2lvbkVudHJ5LmRpc3QudGFyYmFsbCA9IChyZXFIb3N0IHx8IERFRkFVTFRfSE9TVCkgK1xuICAgICAgICAgICAgICAgIGAke3NlcnZlVGFyYmFsbFBhdGh9LyR7ZW5jb2RlVVJJQ29tcG9uZW50KGpzb24ubmFtZSl9LyR7ZW5jb2RlVVJJQ29tcG9uZW50KHZlcil9JHt1cmxPYmouc2VhcmNofWA7XG4gICAgICAgICAgICAgIGlmICghdXJsLnN0YXJ0c1dpdGgoJ2h0dHAnKSlcbiAgICAgICAgICAgICAgICB2ZXJzaW9uRW50cnkuZGlzdC50YXJiYWxsID0gJ2h0dHA6Ly8nICsgdXJsO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHRyYWNrUmVtb3RlVXJsKVxuICAgICAgICAgICAgICBwa2dEb3dubG9hZEN0bC5hY3Rpb25EaXNwYXRjaGVyLmFkZCh7cGtnTmFtZToganNvbi5uYW1lLCB2ZXJzaW9uczogcGFyYW19KTtcblxuICAgICAgICAgICAgY2IobnVsbCwgSlNPTi5zdHJpbmdpZnkoanNvbikpO1xuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGxvZy5lcnJvcihmcmFnbWVudHMsIGUpO1xuICAgICAgICAgICAgcmV0dXJuIGNiKG51bGwsICcnKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgdHJhbnNmb3JtZXJzLnB1c2gocHJvY2Vzc1RyYW5zKTtcbiAgICAgIGlmIChjb21wcmVzc2VyKVxuICAgICAgICB0cmFuc2Zvcm1lcnMucHVzaChjb21wcmVzc2VyKTtcblxuICAgICAgdHJhbnNmb3JtZXJzLnB1c2goIG5ldyBXcml0YWJsZSh7XG4gICAgICAgICAgd3JpdGUoY2h1bmtfMSwgX2VuYywgY2JfMikge1xuICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gQnVmZmVyLmlzQnVmZmVyKGNodW5rXzEpID8gY2h1bmtfMSA6IEJ1ZmZlci5mcm9tKGNodW5rXzEgYXMgc3RyaW5nKTtcbiAgICAgICAgICAgIGJ1Zkxlbmd0aCArPSBidWZmZXIubGVuZ3RoO1xuICAgICAgICAgICAgc3ViamVjdC5uZXh0KGJ1ZmZlcik7XG4gICAgICAgICAgICBjYl8yKCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBmaW5hbChjYl8zKSB7XG4gICAgICAgICAgICBzdWJqZWN0LmNvbXBsZXRlKCk7XG4gICAgICAgICAgICBjYl8zKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgKTtcbiAgICAgIC8vIE5vZGVKUyBidWc6IGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlanMvbm9kZS9pc3N1ZXMvNDAxOTE6XG4gICAgICAvLyBzdHJlYW0ucHJvbWlzZXMucGlwZWxpbmUgZG9lc24ndCBzdXBwb3J0IGFycmF5cyBvZiBzdHJlYW1zIHNpbmNlIG5vZGUgMTYuMTBcbiAgICAgIGNvbnN0IGRvbmU6IFByb21pc2U8dW5rbm93bj4gPSAoc3RyZWFtUHJvbS5waXBlbGluZSBhcyBhbnkpKHNvdXJjZSwgLi4udHJhbnNmb3JtZXJzKTtcbiAgICAgIGF3YWl0IGRvbmU7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGxlbmd0aDogYnVmTGVuZ3RoLFxuICAgICAgICByZWFkYWJsZTogKCkgPT4gbmV3IFJlYWRhYmxlKHtcbiAgICAgICAgICByZWFkKCkge1xuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby10aGlzLWFsaWFzXG4gICAgICAgICAgICBjb25zdCBzZWxmID0gdGhpcztcbiAgICAgICAgICAgIHN1YmplY3Quc3Vic2NyaWJlKHtcbiAgICAgICAgICAgICAgbmV4dChidWYpIHtcbiAgICAgICAgICAgICAgICBzZWxmLnB1c2goYnVmKTtcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgZXJyb3IoZXJyKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5kZXN0cm95KGVycik7XG4gICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIGNvbXBsZXRlKCkge1xuICAgICAgICAgICAgICAgIHNlbGYucHVzaChudWxsKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgfTtcbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuICgpID0+IHtcbiAgICBsb2cuaW5mbygnU2F2ZSBjaGFuZ2VkJywgU1RBVEVfRklMRSk7XG4gICAgcmV0dXJuIGZzLnByb21pc2VzLndyaXRlRmlsZShTVEFURV9GSUxFLCBKU09OLnN0cmluZ2lmeShwa2dEb3dubG9hZEN0bC5nZXRTdGF0ZSgpLCBudWxsLCAnICAnKSk7XG4gIH07XG59XG4iXX0=