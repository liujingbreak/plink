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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibnBtLXJlZ2lzdHJ5LWNhY2hlLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJucG0tcmVnaXN0cnktY2FjaGUtc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSx3REFBd0I7QUFDeEIsb0RBQW9CO0FBQ3BCLG1DQUE2RTtBQUM3RSxvREFBb0I7QUFDcEIsd0RBQXdCO0FBQ3hCLHNDQUE4RDtBQUM5RCxpREFBMkI7QUFDM0IsMkRBQXFDO0FBQ3JDLGtEQUE0QjtBQUU1QixzRUFBcUM7QUFDckMsOEZBQW9HO0FBQ3BHLDBEQUEwQjtBQUUxQixtREFBcUQ7QUFDckQsZ0NBQWdDO0FBQ2hDLG9DQUFvQztBQUNwQyxNQUFNLEtBQUssR0FBRyxZQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNsRCxNQUFNLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUM7QUFPakMsU0FBd0IsdUJBQXVCLENBQUMsR0FBcUI7O0lBQ25FLE1BQU0sT0FBTyxHQUFHLElBQUEsY0FBTSxHQUFFLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQztJQUN6RSxJQUFJLE9BQU8sSUFBSSxJQUFJO1FBQ2pCLE9BQU87SUFDVCxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsSUFBSSxJQUFJLENBQUMsbUJBQW1CLElBQUEsY0FBTSxHQUFFLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLElBQUEsY0FBTSxHQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzVHLE1BQU0sVUFBVSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsSUFBSSxjQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLHlCQUF5QixDQUFDLENBQUM7SUFFMUcsTUFBTSxT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Q0FBQztJQUVELE9BQU8sR0FBRyxFQUFFO1FBQ1YsR0FBRyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFDckMsT0FBTyxZQUFFLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDbEcsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQWpPRCwwQ0FpT0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5pbXBvcnQge1RyYW5zZm9ybSwgV3JpdGFibGUsIFJlYWRhYmxlLCBwcm9taXNlcyBhcyBzdHJlYW1Qcm9tfSBmcm9tICdzdHJlYW0nO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCB6bGliIGZyb20gJ3psaWInO1xuaW1wb3J0IHtjb25maWcsIGxvZzRGaWxlLCBFeHRlbnNpb25Db250ZXh0fSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtSZXF1ZXN0LCBSZXNwb25zZX0gZnJvbSAnZXhwcmVzcyc7XG5pbXBvcnQgUHJveHlBZ2VudCBmcm9tICdwcm94eS1hZ2VudCc7XG5pbXBvcnQge2NyZWF0ZVNsaWNlLCBjYXN0QnlBY3Rpb25UeXBlfSBmcm9tICdAd2ZoL3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZS9kaXN0L3RpbnktcmVkdXgtdG9vbGtpdCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHtDYWNoZURhdGEsIE5wbVJlZ2lzdHJ5VmVyc2lvbkpzb24sIFRhcmJhbGxzSW5mbywgVHJhbnNmb3JtZXJ9IGZyb20gJy4vdHlwZXMnO1xuaW1wb3J0IHtjcmVhdGVQcm94eVdpdGhDYWNoZX0gZnJvbSAnLi9jYWNoZS1zZXJ2aWNlJztcbi8vIGltcG9ydCBpbnNwIGZyb20gJ2luc3BlY3Rvcic7XG4vLyBpbnNwLm9wZW4oOTIyMiwgJzAuMC4wLjAnLCB0cnVlKTtcbmNvbnN0IGlzV2luID0gb3MucGxhdGZvcm0oKS5pbmRleE9mKCd3aW4zMicpID49IDA7XG5jb25zdCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcblxudHlwZSBQa2dEb3dubG9hZFJlcXVlc3RQYXJhbXMgPSB7XG4gIHBrZ05hbWU6IHN0cmluZztcbiAgdmVyc2lvbjogc3RyaW5nO1xufTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY3JlYXRlTnBtUmVnaXN0cnlTZXJ2ZXIoYXBpOiBFeHRlbnNpb25Db250ZXh0KSB7XG4gIGNvbnN0IHNldHRpbmcgPSBjb25maWcoKVsnQHdmaC9hc3NldHMtcHJvY2Vzc2VyJ10ubnBtUmVnaXN0cnlDYWNoZVNlcnZlcjtcbiAgaWYgKHNldHRpbmcgPT0gbnVsbClcbiAgICByZXR1cm47XG4gIGNvbnN0IERFRkFVTFRfSE9TVCA9IHNldHRpbmcuaG9zdCB8fCAoYGh0dHA6Ly9sb2NhbGhvc3Qke2NvbmZpZygpLnBvcnQgIT09IDgwID8gJzonICsgY29uZmlnKCkucG9ydCA6ICcnfWApO1xuICBjb25zdCBTVEFURV9GSUxFID0gUGF0aC5yZXNvbHZlKHNldHRpbmcuY2FjaGVEaXIgfHwgY29uZmlnLnJlc29sdmUoJ2Rlc3REaXInKSwgJ25wbS1yZWdpc3RyeS1jYWNoZS5qc29uJyk7XG5cbiAgY29uc3Qgc2VydmVQYXRoID0gUGF0aC5wb3NpeC5qb2luKHNldHRpbmcucGF0aCB8fCAnL3JlZ2lzdHJ5JywgJ3ZlcnNpb25zJyk7XG4gIGNvbnN0IGVudlZhckRlc2MgPSBgJHtpc1dpbiA/ICdzZXQnIDogJ2V4cG9ydCd9IG5wbV9jb25maWdfcmVnaXN0cnk9aHR0cDovLyR7Y29uZmlnKCkubG9jYWxJUH06JHtjb25maWcoKS5wb3J0fSR7c2VydmVQYXRofWA7XG4gIGxvZy5pbmZvKCdOUE0gcmVnaXN0cnkgY2FjaGUgaXMgc2VydmluZyBhdCAnLCBzZXJ2ZVBhdGgsICdcXG4nICtcbiAgICBgWW91IGNhbiBzZXQgZW52aXJvbm1lbnQgdmFyaWFibGU6ICR7Y2hhbGsuY3lhbihlbnZWYXJEZXNjKX1gKTtcblxuICBjb25zdCB2ZXJzaW9uc0NhY2hlQ3RsID0gY3JlYXRlUHJveHlXaXRoQ2FjaGUoc2VydmVQYXRoLCB7XG4gICAgICBzZWxmSGFuZGxlUmVzcG9uc2U6IHRydWUsXG4gICAgICB0YXJnZXQ6IHNldHRpbmcucmVnaXN0cnkgfHwgJ2h0dHBzOi8vcmVnaXN0cnkubnBtanMub3JnJyxcbiAgICAgIGFnZW50OiBzZXR0aW5nLnByb3h5ID8gbmV3IFByb3h5QWdlbnQoc2V0dGluZy5wcm94eSkgOiB1bmRlZmluZWRcbiAgICB9LFxuICAgIFBhdGgucG9zaXguam9pbihzZXR0aW5nLmNhY2hlRGlyIHx8IGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJyksICd2ZXJzaW9ucycpXG4gICk7XG5cbiAgY29uc3QgdGFyYmFsbERpciA9IFBhdGgucmVzb2x2ZShzZXR0aW5nLmNhY2hlRGlyIHx8IGNvbmZpZy5yZXNvbHZlKCdkZXN0RGlyJyksICdkb3dubG9hZC10YXJiYWxscycpO1xuICBjb25zdCBwa2dEb3dubG9hZFJvdXRlciA9IGFwaS5leHByZXNzLlJvdXRlcigpO1xuICBjb25zdCBzZXJ2ZVRhcmJhbGxQYXRoID0gUGF0aC5wb3NpeC5qb2luKHNldHRpbmcucGF0aCB8fCAnL3JlZ2lzdHJ5JywgJ190YXJiYWxscycpO1xuXG4gIGFwaS5leHByZXNzQXBwU2V0KGFwcCA9PiBhcHAudXNlKHNlcnZlVGFyYmFsbFBhdGgsIHBrZ0Rvd25sb2FkUm91dGVyKSk7XG5cbiAgcGtnRG93bmxvYWRSb3V0ZXIuZ2V0PFBrZ0Rvd25sb2FkUmVxdWVzdFBhcmFtcz4oJy86cGtnTmFtZS86dmVyc2lvbicsIChyZXEsIHJlcykgPT4ge1xuICAgIHBrZ0Rvd25sb2FkQ3RsLmFjdGlvbkRpc3BhdGNoZXIuZmV0Y2hUYXJiYWxsKHtcbiAgICAgIHJlcSwgcmVzLCBwa2dOYW1lOiByZXEucGFyYW1zLnBrZ05hbWUsIHZlcnNpb246IHJlcS5wYXJhbXMudmVyc2lvbn0pO1xuICB9KTtcblxuICBjb25zdCBwa2dEb3dubG9hZEN0bCA9IGNyZWF0ZVNsaWNlKHtcbiAgICBuYW1lOiAncGtnQ2FjaGUnLFxuICAgIGluaXRpYWxTdGF0ZToge30gYXMgVGFyYmFsbHNJbmZvLFxuICAgIHJlZHVjZXJzOiB7XG4gICAgICBsb2FkKHM6IFRhcmJhbGxzSW5mbywgZGF0YTogVGFyYmFsbHNJbmZvKSB7XG4gICAgICAgIE9iamVjdC5hc3NpZ24ocywgZGF0YSk7XG4gICAgICB9LFxuICAgICAgYWRkKHM6IFRhcmJhbGxzSW5mbywgcGF5bG9hZDoge3BrZ05hbWU6IHN0cmluZzsgdmVyc2lvbnM6IHtbdmVyc2lvbjogc3RyaW5nXTogc3RyaW5nfX0pIHtcbiAgICAgICAgbGV0IHBrZ0VudHJ5ID0gc1twYXlsb2FkLnBrZ05hbWVdO1xuICAgICAgICBpZiAocGtnRW50cnkgPT0gbnVsbClcbiAgICAgICAgICBzW3BheWxvYWQucGtnTmFtZV0gPSBwYXlsb2FkLnZlcnNpb25zO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgc1twYXlsb2FkLnBrZ05hbWVdID0gey4uLnBrZ0VudHJ5LCAuLi5wYXlsb2FkLnZlcnNpb25zfTtcbiAgICAgIH0sXG4gICAgICBmZXRjaFRhcmJhbGwoX3M6IFRhcmJhbGxzSW5mbyxcbiAgICAgICAgX3BheWxvYWQ6IHtyZXE6IFJlcXVlc3Q8UGtnRG93bmxvYWRSZXF1ZXN0UGFyYW1zPjsgcmVzOiBSZXNwb25zZTsgcGtnTmFtZTogc3RyaW5nOyB2ZXJzaW9uOiBzdHJpbmd9KSB7XG4gICAgICB9XG4gICAgfSxcbiAgICBkZWJ1Z0FjdGlvbk9ubHk6ICEhY29uZmlnKCkuY2xpT3B0aW9ucz8udmVyYm9zZVxuICB9KTtcblxuICBwa2dEb3dubG9hZEN0bC5lcGljKGFjdGlvbiQgPT4ge1xuICAgIGNvbnN0IGFjdGlvbkJ5VHlwZSA9IGNhc3RCeUFjdGlvblR5cGUocGtnRG93bmxvYWRDdGwuYWN0aW9ucywgYWN0aW9uJCk7XG4gICAgLy8gY29uc3QgZmV0Y2hBY3Rpb25TdGF0ZSA9IG5ldyBNYXA8c3RyaW5nLCBSZXNwb25zZVtdPigpO1xuICAgIC8vIG1hcCBrZXkgaXMgaG9zdCBuYW1lIG9mIHJlbW90ZSB0YXJiYWxsIHNlcnZlclxuICAgIC8vIGNvbnN0IGNhY2hlU3ZjQnlPcmlnaW4gPSBuZXcgTWFwPHN0cmluZywgUmV0dXJuVHlwZTx0eXBlb2YgY3JlYXRlUHJveHlXaXRoQ2FjaGU+PigpO1xuICAgIGNvbnN0IHRhcmJhbGxDYWNoZVNlcml2Y2UgPSBjcmVhdGVQcm94eVdpdGhDYWNoZSgnJywge2ZvbGxvd1JlZGlyZWN0czogdHJ1ZSwgc2VsZkhhbmRsZVJlc3BvbnNlOiB0cnVlfSxcbiAgICAgIHRhcmJhbGxEaXIpO1xuXG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoU1RBVEVfRklMRSkpIHtcbiAgICAgIHZvaWQgZnMucHJvbWlzZXMucmVhZEZpbGUoU1RBVEVfRklMRSwgJ3V0Zi04JylcbiAgICAgIC50aGVuKGNvbnRlbnQgPT4ge1xuICAgICAgICBsb2cuaW5mbygnUmVhZCBjYWNoZSBzdGF0ZSBmaWxlOicsIFNUQVRFX0ZJTEUpO1xuICAgICAgICBwa2dEb3dubG9hZEN0bC5hY3Rpb25EaXNwYXRjaGVyLmxvYWQoSlNPTi5wYXJzZShjb250ZW50KSk7XG4gICAgICB9KTtcbiAgICB9XG5cbiAgICByZXR1cm4gcngubWVyZ2UoXG4gICAgICAgYWN0aW9uQnlUeXBlLmZldGNoVGFyYmFsbC5waXBlKFxuICAgICAgICBvcC5tZXJnZU1hcCgoe3BheWxvYWR9KSA9PiB7XG4gICAgICAgICAgcmV0dXJuIHBrZ0Rvd25sb2FkQ3RsLmdldFN0b3JlKCkucGlwZShcbiAgICAgICAgICAgIG9wLm1hcChzID0+IF8uZ2V0KHMsIFtwYXlsb2FkLnBrZ05hbWUsIHBheWxvYWQudmVyc2lvbl0pKSxcbiAgICAgICAgICAgIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgICAgICAgICBvcC5maWx0ZXIodmFsdWUgPT4gdmFsdWUgIT0gbnVsbCksXG4gICAgICAgICAgICBvcC50YWtlKDEpLFxuICAgICAgICAgICAgb3AubWFwKHVybCA9PiB7XG4gICAgICAgICAgICAgIGxvZy5pbmZvKCdpbmNvbWluZyByZXF1ZXN0IGRvd25sb2FkJywgdXJsKTtcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICB0YXJiYWxsQ2FjaGVTZXJpdmNlLmFjdGlvbkRpc3BhdGNoZXIuaGl0Q2FjaGUoe1xuICAgICAgICAgICAgICAgICAga2V5OiB1cmwucmVwbGFjZSgvXmh0dHBzPzpcXC8vZywgJycpLFxuICAgICAgICAgICAgICAgICAgcmVxOiBwYXlsb2FkLnJlcSwgcmVzOiBwYXlsb2FkLnJlcyxcbiAgICAgICAgICAgICAgICAgIG5leHQ6ICgpID0+IHt9LFxuICAgICAgICAgICAgICAgICAgdGFyZ2V0OiB1cmxcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAgICAgICAgIGxvZy5lcnJvcignRmFpbGVkIGZvciBkb3dubG9hZCBVUkw6JyArIHVybCwgZSk7XG4gICAgICAgICAgICAgICAgdGhyb3cgZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICApO1xuICAgICAgICB9KVxuICAgICAgKVxuICAgICkucGlwZShcbiAgICAgIG9wLmlnbm9yZUVsZW1lbnRzKCksXG4gICAgICBvcC5jYXRjaEVycm9yKChlcnIsIHNyYykgPT4ge1xuICAgICAgICBsb2cuZXJyb3IoZXJyKTtcbiAgICAgICAgcmV0dXJuIHNyYzsgLy8gcmUtc3Vic3JpYmUgb24gZmFpbFxuICAgICAgfSlcbiAgICApO1xuICB9KTtcblxuICB2ZXJzaW9uc0NhY2hlQ3RsLmFjdGlvbkRpc3BhdGNoZXIuY29uZmlnVHJhbnNmb3JtZXIoe1xuICAgIHJlbW90ZTogY3JlYXRlVHJhbnNmb3JtZXIodHJ1ZSksXG4gICAgY2FjaGVkOiBjcmVhdGVUcmFuc2Zvcm1lcihmYWxzZSlcbiAgfSk7XG5cbiAgZnVuY3Rpb24gY3JlYXRlVHJhbnNmb3JtZXIodHJhY2tSZW1vdGVVcmw6IGJvb2xlYW4pOiBUcmFuc2Zvcm1lciB7XG4gICAgcmV0dXJuIGFzeW5jIChoZWFkZXJzOiBDYWNoZURhdGFbJ2hlYWRlcnMnXSwgcmVxSG9zdDogc3RyaW5nIHwgdW5kZWZpbmVkLFxuICAgICAgc291cmNlOiBOb2RlSlMuUmVhZGFibGVTdHJlYW0pID0+IHtcbiAgICAgIGxldCBmcmFnbWVudHMgPSAnJztcbiAgICAgIGxldCBidWZMZW5ndGggPSAwO1xuICAgICAgY29uc3Qgc3ViamVjdCA9IG5ldyByeC5SZXBsYXlTdWJqZWN0PEJ1ZmZlcj4oKTtcbiAgICAgIGxldCBkZWNvbXByZXNzOiBOb2RlSlMuUmVhZFdyaXRlU3RyZWFtIHwgdW5kZWZpbmVkO1xuICAgICAgbGV0IGNvbXByZXNzZXI6IE5vZGVKUy5SZWFkV3JpdGVTdHJlYW0gfCB1bmRlZmluZWQ7XG4gICAgICBjb25zdCBlbmNvZGluZ0hlYWRlciA9IGhlYWRlcnMuZmluZCgoW25hbWVdKSA9PiBuYW1lID09PSAnY29udGVudC1lbmNvZGluZycpO1xuICAgICAgY29uc3QgY29udGVudEVuY29kaW5nID0gZW5jb2RpbmdIZWFkZXIgPyBlbmNvZGluZ0hlYWRlclsxXSA6ICcnO1xuICAgICAgc3dpdGNoIChjb250ZW50RW5jb2RpbmcpIHtcbiAgICAgICAgY2FzZSAnYnInOlxuICAgICAgICAgIGRlY29tcHJlc3MgPSB6bGliLmNyZWF0ZUJyb3RsaURlY29tcHJlc3MoKTtcbiAgICAgICAgICBjb21wcmVzc2VyID0gemxpYi5jcmVhdGVCcm90bGlDb21wcmVzcygpO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICAvLyBPciwganVzdCB1c2UgemxpYi5jcmVhdGVVbnppcCgpIHRvIGhhbmRsZSBib3RoIG9mIHRoZSBmb2xsb3dpbmcgY2FzZXM6XG4gICAgICAgIGNhc2UgJ2d6aXAnOlxuICAgICAgICAgIGRlY29tcHJlc3MgPSB6bGliLmNyZWF0ZUd1bnppcCgpO1xuICAgICAgICAgIGNvbXByZXNzZXIgPSB6bGliLmNyZWF0ZUd6aXAoKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAnZGVmbGF0ZSc6XG4gICAgICAgICAgZGVjb21wcmVzcyA9IHpsaWIuY3JlYXRlSW5mbGF0ZSgpO1xuICAgICAgICAgIGNvbXByZXNzZXIgPSB6bGliLmNyZWF0ZURlZmxhdGUoKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgZGVmYXVsdDpcbiAgICAgIH1cbiAgICAgIGNvbnN0IHRyYW5zZm9ybWVyczogYW55W10gPSBkZWNvbXByZXNzID8gW2RlY29tcHJlc3NdIDogW107XG4gICAgICBjb25zdCBwcm9jZXNzVHJhbnMgPSBuZXcgVHJhbnNmb3JtKHtcbiAgICAgICAgdHJhbnNmb3JtKGNodW5rLCBfZW5jb2RlLCBjYikge1xuICAgICAgICAgIGlmIChCdWZmZXIuaXNCdWZmZXIoY2h1bmspKSB7XG4gICAgICAgICAgICBmcmFnbWVudHMgKz0gY2h1bmsudG9TdHJpbmcoKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZnJhZ21lbnRzICs9IGNodW5rIGFzIHN0cmluZztcbiAgICAgICAgICB9XG4gICAgICAgICAgY2IoKTtcbiAgICAgICAgfSxcbiAgICAgICAgZmx1c2goY2IpIHtcbiAgICAgICAgICBpZiAoZnJhZ21lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGNiKG51bGwsICcnKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGpzb24gPSBKU09OLnBhcnNlKGZyYWdtZW50cykgYXMgTnBtUmVnaXN0cnlWZXJzaW9uSnNvbjtcbiAgICAgICAgICAgIGNvbnN0IHBhcmFtOiB7W3Zlcjogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuXG4gICAgICAgICAgICBpZiAoanNvbi52ZXJzaW9ucykge1xuICAgICAgICAgICAgICBmb3IgKGNvbnN0IFt2ZXIsIHZlcnNpb25FbnRyeV0gb2YgT2JqZWN0LmVudHJpZXMoanNvbi52ZXJzaW9ucykpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBvcmlnVGFyYmFsbFVybCA9IHBhcmFtW3Zlcl0gPSB2ZXJzaW9uRW50cnkuZGlzdC50YXJiYWxsO1xuICAgICAgICAgICAgICAgIGNvbnN0IHVybE9iaiA9IG5ldyBVUkwob3JpZ1RhcmJhbGxVcmwpO1xuICAgICAgICAgICAgICAgIGNvbnN0IHVybCA9IHZlcnNpb25FbnRyeS5kaXN0LnRhcmJhbGwgPSAocmVxSG9zdCB8fCBERUZBVUxUX0hPU1QpICtcbiAgICAgICAgICAgICAgICAgIGAke3NlcnZlVGFyYmFsbFBhdGh9LyR7ZW5jb2RlVVJJQ29tcG9uZW50KGpzb24ubmFtZSl9LyR7ZW5jb2RlVVJJQ29tcG9uZW50KHZlcil9JHt1cmxPYmouc2VhcmNofWA7XG4gICAgICAgICAgICAgICAgaWYgKCF1cmwuc3RhcnRzV2l0aCgnaHR0cCcpKVxuICAgICAgICAgICAgICAgICAgdmVyc2lvbkVudHJ5LmRpc3QudGFyYmFsbCA9ICdodHRwOi8vJyArIHVybDtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBpZiAodHJhY2tSZW1vdGVVcmwpXG4gICAgICAgICAgICAgICAgcGtnRG93bmxvYWRDdGwuYWN0aW9uRGlzcGF0Y2hlci5hZGQoe3BrZ05hbWU6IGpzb24ubmFtZSwgdmVyc2lvbnM6IHBhcmFtfSk7XG5cbiAgICAgICAgICAgICAgY2IobnVsbCwgSlNPTi5zdHJpbmdpZnkoanNvbikpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgbG9nLmluZm8oJ1NraXAgdHJhbnNmb3JtJywgZnJhZ21lbnRzKTtcbiAgICAgICAgICAgICAgY2IobnVsbCwgZnJhZ21lbnRzKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgICAgIGxvZy5lcnJvcihmcmFnbWVudHMsIGUpO1xuICAgICAgICAgICAgcmV0dXJuIGNiKG51bGwsICcnKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgdHJhbnNmb3JtZXJzLnB1c2gocHJvY2Vzc1RyYW5zKTtcbiAgICAgIGlmIChjb21wcmVzc2VyKVxuICAgICAgICB0cmFuc2Zvcm1lcnMucHVzaChjb21wcmVzc2VyKTtcblxuICAgICAgdHJhbnNmb3JtZXJzLnB1c2goIG5ldyBXcml0YWJsZSh7XG4gICAgICAgICAgd3JpdGUoY2h1bmtfMSwgX2VuYywgY2JfMikge1xuICAgICAgICAgICAgY29uc3QgYnVmZmVyID0gQnVmZmVyLmlzQnVmZmVyKGNodW5rXzEpID8gY2h1bmtfMSA6IEJ1ZmZlci5mcm9tKGNodW5rXzEgYXMgc3RyaW5nKTtcbiAgICAgICAgICAgIGJ1Zkxlbmd0aCArPSBidWZmZXIubGVuZ3RoO1xuICAgICAgICAgICAgc3ViamVjdC5uZXh0KGJ1ZmZlcik7XG4gICAgICAgICAgICBjYl8yKCk7XG4gICAgICAgICAgfSxcbiAgICAgICAgICBmaW5hbChjYl8zKSB7XG4gICAgICAgICAgICBzdWJqZWN0LmNvbXBsZXRlKCk7XG4gICAgICAgICAgICBjYl8zKCk7XG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgKTtcbiAgICAgIC8vIE5vZGVKUyBidWc6IGh0dHBzOi8vZ2l0aHViLmNvbS9ub2RlanMvbm9kZS9pc3N1ZXMvNDAxOTE6XG4gICAgICAvLyBzdHJlYW0ucHJvbWlzZXMucGlwZWxpbmUgZG9lc24ndCBzdXBwb3J0IGFycmF5cyBvZiBzdHJlYW1zIHNpbmNlIG5vZGUgMTYuMTBcbiAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnQsIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtY2FsbFxuICAgICAgY29uc3QgZG9uZTogUHJvbWlzZTx1bmtub3duPiA9IChzdHJlYW1Qcm9tLnBpcGVsaW5lIGFzIGFueSkoc291cmNlLCAuLi50cmFuc2Zvcm1lcnMpO1xuICAgICAgYXdhaXQgZG9uZTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbGVuZ3RoOiBidWZMZW5ndGgsXG4gICAgICAgIHJlYWRhYmxlOiAoKSA9PiBuZXcgUmVhZGFibGUoe1xuICAgICAgICAgIHJlYWQoKSB7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXRoaXMtYWxpYXNcbiAgICAgICAgICAgIGNvbnN0IHNlbGYgPSB0aGlzO1xuICAgICAgICAgICAgc3ViamVjdC5zdWJzY3JpYmUoe1xuICAgICAgICAgICAgICBuZXh0KGJ1Zikge1xuICAgICAgICAgICAgICAgIHNlbGYucHVzaChidWYpO1xuICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICBlcnJvcihlcnIpIHtcbiAgICAgICAgICAgICAgICBzZWxmLmRlc3Ryb3koZXJyKTtcbiAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgY29tcGxldGUoKSB7XG4gICAgICAgICAgICAgICAgc2VsZi5wdXNoKG51bGwpO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgICB9O1xuICAgIH07XG4gIH1cblxuICByZXR1cm4gKCkgPT4ge1xuICAgIGxvZy5pbmZvKCdTYXZlIGNoYW5nZWQnLCBTVEFURV9GSUxFKTtcbiAgICByZXR1cm4gZnMucHJvbWlzZXMud3JpdGVGaWxlKFNUQVRFX0ZJTEUsIEpTT04uc3RyaW5naWZ5KHBrZ0Rvd25sb2FkQ3RsLmdldFN0YXRlKCksIG51bGwsICcgICcpKTtcbiAgfTtcbn1cbiJdfQ==