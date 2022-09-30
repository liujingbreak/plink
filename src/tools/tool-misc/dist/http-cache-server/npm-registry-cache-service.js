"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const os_1 = tslib_1.__importDefault(require("os"));
const stream_1 = require("stream");
const fs_1 = tslib_1.__importDefault(require("fs"));
const zlib_1 = tslib_1.__importDefault(require("zlib"));
const plink_1 = require("@wfh/plink");
const rx = tslib_1.__importStar(require("rxjs"));
const op = tslib_1.__importStar(require("rxjs/operators"));
const _ = tslib_1.__importStar(require("lodash"));
const proxy_agent_1 = tslib_1.__importDefault(require("proxy-agent"));
const tiny_redux_toolkit_1 = require("@wfh/redux-toolkit-observable/dist/tiny-redux-toolkit");
const chalk_1 = tslib_1.__importDefault(require("chalk"));
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
//# sourceMappingURL=npm-registry-cache-service.js.map