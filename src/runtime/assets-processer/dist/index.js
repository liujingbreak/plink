"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = exports.deactivate = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const rx = tslib_1.__importStar(require("rxjs"));
const op = tslib_1.__importStar(require("rxjs/operators"));
const serve_index_1 = tslib_1.__importDefault(require("serve-index"));
const plink_1 = require("@wfh/plink");
const assets_processer_setting_1 = require("../isom/assets-processer-setting");
const cd_server_1 = require("./content-deployer/cd-server");
const fetchRemote = tslib_1.__importStar(require("./fetch-remote"));
const fetch_remote_imap_1 = require("./fetch-remote-imap");
const index_html_route_1 = require("./index-html-route");
const static_middleware_1 = require("./static-middleware");
const cache_service_1 = require("./proxy-cache/cache-service");
const npm_registry_cache_service_1 = tslib_1.__importDefault(require("./proxy-cache/npm-registry-cache-service"));
const utils_1 = require("./utils");
const log = (0, plink_1.log4File)(__filename);
// const log = require('log4js').getLogger(api.packageName);
const serverFavicon = require('serve-favicon');
const deactivateSubj = new rx.ReplaySubject();
function deactivate() {
    fetchRemote.stop();
    return deactivateSubj.pipe(op.mergeMap(shutdown => rx.defer(() => shutdown()))).toPromise();
}
exports.deactivate = deactivate;
function activate(api) {
    var staticFolder = api.config.resolve('staticDir');
    log.debug('express static path: ' + staticFolder);
    var favicon = findFavicon();
    if (favicon)
        api.use(serverFavicon(favicon));
    var maxAgeMap = (0, assets_processer_setting_1.getSetting)().cacheControlMaxAge;
    log.info('cache control', maxAgeMap);
    log.info('Serve static dir', staticFolder);
    // api.use('/', createResponseTimestamp);
    (0, index_html_route_1.proxyToDevServer)(api);
    const httpProxySet = (0, assets_processer_setting_1.getSetting)().httpProxy;
    if (httpProxySet) {
        for (const proxyPath of Object.keys(httpProxySet)) {
            log.info(`Enable HTTP proxy ${proxyPath} -> ${httpProxySet[proxyPath]}`);
            (0, utils_1.setupHttpProxy)(proxyPath, httpProxySet[proxyPath]);
        }
    }
    const httpProxyWithCacheSet = (0, assets_processer_setting_1.getSetting)().httpProxyWithCache;
    if (httpProxyWithCacheSet) {
        for (const proxyPath of Object.keys(httpProxyWithCacheSet)) {
            const dir = path_1.default.join((0, plink_1.config)().destDir, 'http-proxy-cache', lodash_1.default.trimStart(proxyPath, '/'));
            const endPoint = httpProxyWithCacheSet[proxyPath];
            log.info(`Enable HTTP proxy ${proxyPath} --> ${endPoint}, cache directory: ${dir}`);
            (0, cache_service_1.createProxyWithCache)(proxyPath, { target: endPoint }, dir);
        }
    }
    const saveNpmRegistry = (0, npm_registry_cache_service_1.default)(api);
    if (saveNpmRegistry)
        deactivateSubj.next(saveNpmRegistry);
    // const zss = createZipRoute(maxAgeMap);
    // api.use('/', zss.handler);
    const staticHandler = (0, static_middleware_1.createStaticRoute)(staticFolder, maxAgeMap);
    api.use('/', staticHandler);
    // api.use('/', createStaticRoute(api.config.resolve('dllDestDir'), maxAgeMap));
    if (api.config.get([api.packageName, 'serveIndex'])) {
        const stylesheet = path_1.default.resolve(__dirname, '../serve-index.css');
        process.title = 'File server on ' + staticFolder;
        api.use('/', (0, serve_index_1.default)(staticFolder, { icons: true, stylesheet }));
    }
    else {
        log.info(chalk_1.default.blueBright(`If you want to serve directory index page for resource directory other than ${staticFolder}\n` +
            ` start command with "--prop ${api.packageName}.serveIndex=true --prop staticDir=<resource directory>`));
    }
    api.expressAppSet(app => (0, cd_server_1.activate)(app, imap));
    (0, index_html_route_1.fallbackIndexHtml)(api);
    api.use('/', staticHandler); // Serve fallbacked request to index.html
    const mailSetting = api.config.get(api.packageName).fetchMailServer;
    const imap = new fetch_remote_imap_1.ImapManager(mailSetting ? mailSetting.env : 'local');
    api.eventBus.on('appCreated', () => {
        // appCreated event is emitted by express-app
        void fetchRemote.start(imap);
    });
    deactivateSubj.complete();
}
exports.activate = activate;
function findFavicon() {
    return _findFaviconInConfig('packageContextPathMapping') || _findFaviconInConfig('outputPathMap');
}
function _findFaviconInConfig(property) {
    if (!(0, plink_1.config)()[property]) {
        return null;
    }
    let faviconFile;
    let faviconPackage;
    lodash_1.default.each((0, plink_1.config)()[property], (path, pkName) => {
        var _a, _b;
        if (path === '/') {
            const pkg = [...(0, plink_1.findPackagesByNames)([pkName])][0];
            if (pkg) {
                const assetsFolder = ((_a = pkg.json.plink) === null || _a === void 0 ? void 0 : _a.assetsDir) || ((_b = pkg.json.dr) === null || _b === void 0 ? void 0 : _b.assetsDir) || 'assets';
                var favicon = path_1.default.join(pkg.realPath, assetsFolder, 'favicon.ico');
                if (fs_extra_1.default.existsSync(favicon)) {
                    if (faviconFile) {
                        log.warn('Found duplicate favicon file in', pkg.name, 'existing', faviconPackage);
                    }
                    faviconFile = path_1.default.resolve(favicon);
                    faviconPackage = pkg.name;
                }
            }
        }
    });
    return faviconFile;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0FBQUEsd0RBQXdCO0FBQ3hCLDBEQUEwQjtBQUMxQixnRUFBMEI7QUFDMUIsNERBQXVCO0FBQ3ZCLGlEQUEyQjtBQUMzQiwyREFBcUM7QUFDckMsc0VBQXFDO0FBQ3JDLHNDQUFpRztBQUNqRywrRUFBNEQ7QUFDNUQsNERBQXNFO0FBQ3RFLG9FQUE4QztBQUM5QywyREFBa0Q7QUFFbEQseURBQXlFO0FBQ3pFLDJEQUF3RDtBQUN4RCwrREFBbUU7QUFDbkUsa0hBQStFO0FBQy9FLG1DQUF1QztBQUV2QyxNQUFNLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUM7QUFDakMsNERBQTREO0FBQzVELE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUMvQyxNQUFNLGNBQWMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxhQUFhLEVBQW1DLENBQUM7QUFFL0UsU0FBZ0IsVUFBVTtJQUN4QixXQUFXLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDbkIsT0FBTyxjQUFjLENBQUMsSUFBSSxDQUN4QixFQUFFLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQ3BELENBQUMsU0FBUyxFQUFFLENBQUM7QUFDaEIsQ0FBQztBQUxELGdDQUtDO0FBQ0QsU0FBZ0IsUUFBUSxDQUFDLEdBQXFCO0lBQzVDLElBQUksWUFBWSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ25ELEdBQUcsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEdBQUcsWUFBWSxDQUFDLENBQUM7SUFHbEQsSUFBSSxPQUFPLEdBQUcsV0FBVyxFQUFFLENBQUM7SUFDNUIsSUFBSSxPQUFP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QUFDLEdBQUcsSUFBQSwyQkFBbUIsRUFBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsRCxJQUFJLEdBQUcsRUFBRTtnQkFDUCxNQUFNLFlBQVksR0FBRyxDQUFBLE1BQUEsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLDBDQUFFLFNBQVMsTUFBSSxNQUFBLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSwwQ0FBRSxTQUFTLENBQUEsSUFBSSxRQUFRLENBQUM7Z0JBQ3JGLElBQUksT0FBTyxHQUFHLGNBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxZQUFZLEVBQUUsYUFBYSxDQUFDLENBQUM7Z0JBQ25FLElBQUksa0JBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEVBQUU7b0JBQzFCLElBQUksV0FBVyxFQUFFO3dCQUNmLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUNBQWlDLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUUsY0FBYyxDQUFDLENBQUM7cUJBQ25GO29CQUNELFdBQVcsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUNwQyxjQUFjLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztpQkFDM0I7YUFDRjtTQUVGO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDSCxPQUFPLFdBQVcsQ0FBQztBQUNyQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCBzZXJ2ZUluZGV4IGZyb20gJ3NlcnZlLWluZGV4JztcbmltcG9ydCB7bG9nNEZpbGUsIGNvbmZpZywgRHJjcFNldHRpbmdzLCBmaW5kUGFja2FnZXNCeU5hbWVzLCBFeHRlbnNpb25Db250ZXh0fSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCB7Z2V0U2V0dGluZ30gZnJvbSAnLi4vaXNvbS9hc3NldHMtcHJvY2Vzc2VyLXNldHRpbmcnO1xuaW1wb3J0IHsgYWN0aXZhdGUgYXMgYWN0aXZhdGVDZCB9IGZyb20gJy4vY29udGVudC1kZXBsb3llci9jZC1zZXJ2ZXInO1xuaW1wb3J0ICogYXMgZmV0Y2hSZW1vdGUgZnJvbSAnLi9mZXRjaC1yZW1vdGUnO1xuaW1wb3J0IHsgSW1hcE1hbmFnZXIgfSBmcm9tICcuL2ZldGNoLXJlbW90ZS1pbWFwJztcbmltcG9ydCB7IFdpdGhNYWlsU2VydmVyQ29uZmlnIH0gZnJvbSAnLi9mZXRjaC10eXBlcyc7XG5pbXBvcnQgeyBmYWxsYmFja0luZGV4SHRtbCwgcHJveHlUb0RldlNlcnZlciB9IGZyb20gJy4vaW5kZXgtaHRtbC1yb3V0ZSc7XG5pbXBvcnQgeyBjcmVhdGVTdGF0aWNSb3V0ZSB9IGZyb20gJy4vc3RhdGljLW1pZGRsZXdhcmUnO1xuaW1wb3J0IHsgY3JlYXRlUHJveHlXaXRoQ2FjaGUgfSBmcm9tICcuL3Byb3h5LWNhY2hlL2NhY2hlLXNlcnZpY2UnO1xuaW1wb3J0IGNyZWF0ZU5wbVJlZ2lzdHJ5U2VydmVyIGZyb20gJy4vcHJveHktY2FjaGUvbnBtLXJlZ2lzdHJ5LWNhY2hlLXNlcnZpY2UnO1xuaW1wb3J0IHtzZXR1cEh0dHBQcm94eX0gZnJvbSAnLi91dGlscyc7XG5cbmNvbnN0IGxvZyA9IGxvZzRGaWxlKF9fZmlsZW5hbWUpO1xuLy8gY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSk7XG5jb25zdCBzZXJ2ZXJGYXZpY29uID0gcmVxdWlyZSgnc2VydmUtZmF2aWNvbicpO1xuY29uc3QgZGVhY3RpdmF0ZVN1YmogPSBuZXcgcnguUmVwbGF5U3ViamVjdDwoKSA9PiAoUHJvbWlzZUxpa2U8YW55PiB8IHZvaWQpPigpO1xuXG5leHBvcnQgZnVuY3Rpb24gZGVhY3RpdmF0ZSgpIHtcbiAgZmV0Y2hSZW1vdGUuc3RvcCgpO1xuICByZXR1cm4gZGVhY3RpdmF0ZVN1YmoucGlwZShcbiAgICBvcC5tZXJnZU1hcChzaHV0ZG93biA9PiByeC5kZWZlcigoKSA9PiBzaHV0ZG93bigpKSlcbiAgKS50b1Byb21pc2UoKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBhY3RpdmF0ZShhcGk6IEV4dGVuc2lvbkNvbnRleHQpIHtcbiAgdmFyIHN0YXRpY0ZvbGRlciA9IGFwaS5jb25maWcucmVzb2x2ZSgnc3RhdGljRGlyJyk7XG4gIGxvZy5kZWJ1ZygnZXhwcmVzcyBzdGF0aWMgcGF0aDogJyArIHN0YXRpY0ZvbGRlcik7XG5cblxuICB2YXIgZmF2aWNvbiA9IGZpbmRGYXZpY29uKCk7XG4gIGlmIChmYXZpY29uKVxuICAgIGFwaS51c2Uoc2VydmVyRmF2aWNvbihmYXZpY29uKSk7XG5cbiAgdmFyIG1heEFnZU1hcCA9IGdldFNldHRpbmcoKS5jYWNoZUNvbnRyb2xNYXhBZ2U7XG4gIGxvZy5pbmZvKCdjYWNoZSBjb250cm9sJywgbWF4QWdlTWFwKTtcbiAgbG9nLmluZm8oJ1NlcnZlIHN0YXRpYyBkaXInLCBzdGF0aWNGb2xkZXIpO1xuXG4gIC8vIGFwaS51c2UoJy8nLCBjcmVhdGVSZXNwb25zZVRpbWVzdGFtcCk7XG4gIHByb3h5VG9EZXZTZXJ2ZXIoYXBpKTtcblxuICBjb25zdCBodHRwUHJveHlTZXQgPSBnZXRTZXR0aW5nKCkuaHR0cFByb3h5O1xuICBpZiAoaHR0cFByb3h5U2V0KSB7XG4gICAgZm9yIChjb25zdCBwcm94eVBhdGggb2YgT2JqZWN0LmtleXMoaHR0cFByb3h5U2V0KSkge1xuICAgICAgbG9nLmluZm8oYEVuYWJsZSBIVFRQIHByb3h5ICR7cHJveHlQYXRofSAtPiAke2h0dHBQcm94eVNldFtwcm94eVBhdGhdfWApO1xuICAgICAgc2V0dXBIdHRwUHJveHkocHJveHlQYXRoLCBodHRwUHJveHlTZXRbcHJveHlQYXRoXSk7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgaHR0cFByb3h5V2l0aENhY2hlU2V0ID0gZ2V0U2V0dGluZygpLmh0dHBQcm94eVdpdGhDYWNoZTtcbiAgaWYgKGh0dHBQcm94eVdpdGhDYWNoZVNldCkge1xuICAgIGZvciAoY29uc3QgcHJveHlQYXRoIG9mIE9iamVjdC5rZXlzKGh0dHBQcm94eVdpdGhDYWNoZVNldCkpIHtcbiAgICAgIGNvbnN0IGRpciA9IFBhdGguam9pbihjb25maWcoKS5kZXN0RGlyLCAnaHR0cC1wcm94eS1jYWNoZScsIF8udHJpbVN0YXJ0KHByb3h5UGF0aCwgJy8nKSk7XG4gICAgICBjb25zdCBlbmRQb2ludCA9IGh0dHBQcm94eVdpdGhDYWNoZVNldFtwcm94eVBhdGhdO1xuICAgICAgbG9nLmluZm8oYEVuYWJsZSBIVFRQIHByb3h5ICR7cHJveHlQYXRofSAtLT4gJHtlbmRQb2ludH0sIGNhY2hlIGRpcmVjdG9yeTogJHtkaXJ9YCk7XG4gICAgICBjcmVhdGVQcm94eVdpdGhDYWNoZShwcm94eVBhdGgsIHt0YXJnZXQ6IGVuZFBvaW50fSwgZGlyKTtcbiAgICB9XG4gIH1cblxuICBjb25zdCBzYXZlTnBtUmVnaXN0cnkgPSBjcmVhdGVOcG1SZWdpc3RyeVNlcnZlcihhcGkpO1xuICBpZiAoc2F2ZU5wbVJlZ2lzdHJ5KVxuICAgIGRlYWN0aXZhdGVTdWJqLm5leHQoc2F2ZU5wbVJlZ2lzdHJ5KTtcbiAgLy8gY29uc3QgenNzID0gY3JlYXRlWmlwUm91dGUobWF4QWdlTWFwKTtcblxuICAvLyBhcGkudXNlKCcvJywgenNzLmhhbmRsZXIpO1xuICBjb25zdCBzdGF0aWNIYW5kbGVyID0gY3JlYXRlU3RhdGljUm91dGUoc3RhdGljRm9sZGVyLCBtYXhBZ2VNYXApO1xuICBhcGkudXNlKCcvJywgc3RhdGljSGFuZGxlcik7XG4gIC8vIGFwaS51c2UoJy8nLCBjcmVhdGVTdGF0aWNSb3V0ZShhcGkuY29uZmlnLnJlc29sdmUoJ2RsbERlc3REaXInKSwgbWF4QWdlTWFwKSk7XG5cbiAgaWYgKGFwaS5jb25maWcuZ2V0KFthcGkucGFja2FnZU5hbWUsICdzZXJ2ZUluZGV4J10pKSB7XG4gICAgY29uc3Qgc3R5bGVzaGVldCA9IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi9zZXJ2ZS1pbmRleC5jc3MnKTtcbiAgICBwcm9jZXNzLnRpdGxlID0gJ0ZpbGUgc2VydmVyIG9uICcgKyBzdGF0aWNGb2xkZXI7XG4gICAgYXBpLnVzZSgnLycsIHNlcnZlSW5kZXgoc3RhdGljRm9sZGVyLCB7aWNvbnM6IHRydWUsIHN0eWxlc2hlZXR9KSk7XG4gIH0gZWxzZSB7XG4gICAgbG9nLmluZm8oY2hhbGsuYmx1ZUJyaWdodChgSWYgeW91IHdhbnQgdG8gc2VydmUgZGlyZWN0b3J5IGluZGV4IHBhZ2UgZm9yIHJlc291cmNlIGRpcmVjdG9yeSBvdGhlciB0aGFuICR7c3RhdGljRm9sZGVyfVxcbmAgK1xuICAgICAgYCBzdGFydCBjb21tYW5kIHdpdGggXCItLXByb3AgJHthcGkucGFja2FnZU5hbWV9LnNlcnZlSW5kZXg9dHJ1ZSAtLXByb3Agc3RhdGljRGlyPTxyZXNvdXJjZSBkaXJlY3Rvcnk+YCkpO1xuICB9XG4gIGFwaS5leHByZXNzQXBwU2V0KGFwcCA9PiBhY3RpdmF0ZUNkKGFwcCwgaW1hcCkpO1xuICBmYWxsYmFja0luZGV4SHRtbChhcGkpO1xuICBhcGkudXNlKCcvJywgc3RhdGljSGFuZGxlcik7IC8vIFNlcnZlIGZhbGxiYWNrZWQgcmVxdWVzdCB0byBpbmRleC5odG1sXG5cbiAgY29uc3QgbWFpbFNldHRpbmcgPSAoYXBpLmNvbmZpZy5nZXQoYXBpLnBhY2thZ2VOYW1lKSBhcyBXaXRoTWFpbFNlcnZlckNvbmZpZykuZmV0Y2hNYWlsU2VydmVyO1xuICBjb25zdCBpbWFwID0gbmV3IEltYXBNYW5hZ2VyKG1haWxTZXR0aW5nID8gbWFpbFNldHRpbmcuZW52IDogJ2xvY2FsJyk7XG5cbiAgYXBpLmV2ZW50QnVzLm9uKCdhcHBDcmVhdGVkJywgKCkgPT4ge1xuICAgIC8vIGFwcENyZWF0ZWQgZXZlbnQgaXMgZW1pdHRlZCBieSBleHByZXNzLWFwcFxuICAgIHZvaWQgZmV0Y2hSZW1vdGUuc3RhcnQoaW1hcCk7XG4gIH0pO1xuXG4gIGRlYWN0aXZhdGVTdWJqLmNvbXBsZXRlKCk7XG59XG5cblxuZnVuY3Rpb24gZmluZEZhdmljb24oKSB7XG4gIHJldHVybiBfZmluZEZhdmljb25JbkNvbmZpZygncGFja2FnZUNvbnRleHRQYXRoTWFwcGluZycpIHx8IF9maW5kRmF2aWNvbkluQ29uZmlnKCdvdXRwdXRQYXRoTWFwJyk7XG59XG5cbmZ1bmN0aW9uIF9maW5kRmF2aWNvbkluQ29uZmlnKHByb3BlcnR5OiBrZXlvZiBEcmNwU2V0dGluZ3MpIHtcbiAgaWYgKCFjb25maWcoKVtwcm9wZXJ0eV0pIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBsZXQgZmF2aWNvbkZpbGU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgbGV0IGZhdmljb25QYWNrYWdlOiBzdHJpbmc7XG4gIF8uZWFjaChjb25maWcoKVtwcm9wZXJ0eV0gYXMgYW55LCAocGF0aCwgcGtOYW1lKSA9PiB7XG4gICAgaWYgKHBhdGggPT09ICcvJykge1xuICAgICAgY29uc3QgcGtnID0gWy4uLmZpbmRQYWNrYWdlc0J5TmFtZXMoW3BrTmFtZV0pXVswXTtcbiAgICAgIGlmIChwa2cpIHtcbiAgICAgICAgY29uc3QgYXNzZXRzRm9sZGVyID0gcGtnLmpzb24ucGxpbms/LmFzc2V0c0RpciB8fCBwa2cuanNvbi5kcj8uYXNzZXRzRGlyIHx8ICdhc3NldHMnO1xuICAgICAgICB2YXIgZmF2aWNvbiA9IFBhdGguam9pbihwa2cucmVhbFBhdGgsIGFzc2V0c0ZvbGRlciwgJ2Zhdmljb24uaWNvJyk7XG4gICAgICAgIGlmIChmcy5leGlzdHNTeW5jKGZhdmljb24pKSB7XG4gICAgICAgICAgaWYgKGZhdmljb25GaWxlKSB7XG4gICAgICAgICAgICBsb2cud2FybignRm91bmQgZHVwbGljYXRlIGZhdmljb24gZmlsZSBpbicsIHBrZy5uYW1lLCAnZXhpc3RpbmcnLCBmYXZpY29uUGFja2FnZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGZhdmljb25GaWxlID0gUGF0aC5yZXNvbHZlKGZhdmljb24pO1xuICAgICAgICAgIGZhdmljb25QYWNrYWdlID0gcGtnLm5hbWU7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgIH1cbiAgfSk7XG4gIHJldHVybiBmYXZpY29uRmlsZTtcbn1cblxuIl19