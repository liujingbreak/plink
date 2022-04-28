"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
exports.activate = exports.deactivate = void 0;
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const serve_index_1 = __importDefault(require("serve-index"));
const plink_1 = require("@wfh/plink");
const assets_processer_setting_1 = require("../isom/assets-processer-setting");
const cd_server_1 = require("./content-deployer/cd-server");
const fetchRemote = __importStar(require("./fetch-remote"));
const fetch_remote_imap_1 = require("./fetch-remote-imap");
const index_html_route_1 = require("./index-html-route");
const static_middleware_1 = require("./static-middleware");
const cache_service_1 = require("./proxy-cache/cache-service");
const npm_registry_cache_service_1 = __importDefault(require("./proxy-cache/npm-registry-cache-service"));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGdEQUF3QjtBQUN4QixrREFBMEI7QUFDMUIsd0RBQTBCO0FBQzFCLG9EQUF1QjtBQUN2Qix5Q0FBMkI7QUFDM0IsbURBQXFDO0FBQ3JDLDhEQUFxQztBQUNyQyxzQ0FBaUc7QUFDakcsK0VBQTREO0FBQzVELDREQUFzRTtBQUN0RSw0REFBOEM7QUFDOUMsMkRBQWtEO0FBRWxELHlEQUF5RTtBQUN6RSwyREFBd0Q7QUFDeEQsK0RBQW1FO0FBQ25FLDBHQUErRTtBQUMvRSxtQ0FBdUM7QUFFdkMsTUFBTSxHQUFHLEdBQUcsSUFBQSxnQkFBUSxFQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pDLDREQUE0RDtBQUM1RCxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDL0MsTUFBTSxjQUFjLEdBQUcsSUFBSSxFQUFFLENBQUMsYUFBYSxFQUFtQyxDQUFDO0FBRS9FLFNBQWdCLFVBQVU7SUFDeEIsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDO0lBQ25CLE9BQU8sY0FBYyxDQUFDLElBQUksQ0FDeEIsRUFBRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUNwRCxDQUFDLFNBQVMsRUFBRSxDQUFDO0FBQ2hCLENBQUM7QUFMRCxnQ0FLQztBQUNELFNBQWdCLFFBQVEsQ0FBQyxHQUFxQjtJQUM1QyxJQUFJLFlBQVksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNuRCxHQUFHLENBQUMsS0FBSyxDQUFDLHVCQUF1QixHQUFHLFlBQVksQ0FBQyxDQUFDO0lBR2xELElBQUksT0FBTyxHQUFHLFdBQVcs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QUU7WUFDaEIsTUFBTSxHQUFHLEdBQUcsQ0FBQyxHQUFHLElBQUEsMkJBQW1CLEVBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDbEQsSUFBSSxHQUFHLEVBQUU7Z0JBQ1AsTUFBTSxZQUFZLEdBQUcsQ0FBQSxNQUFBLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSywwQ0FBRSxTQUFTLE1BQUksTUFBQSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsMENBQUUsU0FBUyxDQUFBLElBQUksUUFBUSxDQUFDO2dCQUNyRixJQUFJLE9BQU8sR0FBRyxjQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsWUFBWSxFQUFFLGFBQWEsQ0FBQyxDQUFDO2dCQUNuRSxJQUFJLGtCQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxFQUFFO29CQUMxQixJQUFJLFdBQVcsRUFBRTt3QkFDZixHQUFHLENBQUMsSUFBSSxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFLGNBQWMsQ0FBQyxDQUFDO3FCQUNuRjtvQkFDRCxXQUFXLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDcEMsY0FBYyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7aUJBQzNCO2FBQ0Y7U0FFRjtJQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0gsT0FBTyxXQUFXLENBQUM7QUFDckIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgc2VydmVJbmRleCBmcm9tICdzZXJ2ZS1pbmRleCc7XG5pbXBvcnQge2xvZzRGaWxlLCBjb25maWcsIERyY3BTZXR0aW5ncywgZmluZFBhY2thZ2VzQnlOYW1lcywgRXh0ZW5zaW9uQ29udGV4dH0gZnJvbSAnQHdmaC9wbGluayc7XG5pbXBvcnQge2dldFNldHRpbmd9IGZyb20gJy4uL2lzb20vYXNzZXRzLXByb2Nlc3Nlci1zZXR0aW5nJztcbmltcG9ydCB7IGFjdGl2YXRlIGFzIGFjdGl2YXRlQ2QgfSBmcm9tICcuL2NvbnRlbnQtZGVwbG95ZXIvY2Qtc2VydmVyJztcbmltcG9ydCAqIGFzIGZldGNoUmVtb3RlIGZyb20gJy4vZmV0Y2gtcmVtb3RlJztcbmltcG9ydCB7IEltYXBNYW5hZ2VyIH0gZnJvbSAnLi9mZXRjaC1yZW1vdGUtaW1hcCc7XG5pbXBvcnQgeyBXaXRoTWFpbFNlcnZlckNvbmZpZyB9IGZyb20gJy4vZmV0Y2gtdHlwZXMnO1xuaW1wb3J0IHsgZmFsbGJhY2tJbmRleEh0bWwsIHByb3h5VG9EZXZTZXJ2ZXIgfSBmcm9tICcuL2luZGV4LWh0bWwtcm91dGUnO1xuaW1wb3J0IHsgY3JlYXRlU3RhdGljUm91dGUgfSBmcm9tICcuL3N0YXRpYy1taWRkbGV3YXJlJztcbmltcG9ydCB7IGNyZWF0ZVByb3h5V2l0aENhY2hlIH0gZnJvbSAnLi9wcm94eS1jYWNoZS9jYWNoZS1zZXJ2aWNlJztcbmltcG9ydCBjcmVhdGVOcG1SZWdpc3RyeVNlcnZlciBmcm9tICcuL3Byb3h5LWNhY2hlL25wbS1yZWdpc3RyeS1jYWNoZS1zZXJ2aWNlJztcbmltcG9ydCB7c2V0dXBIdHRwUHJveHl9IGZyb20gJy4vdXRpbHMnO1xuXG5jb25zdCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcbi8vIGNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUpO1xuY29uc3Qgc2VydmVyRmF2aWNvbiA9IHJlcXVpcmUoJ3NlcnZlLWZhdmljb24nKTtcbmNvbnN0IGRlYWN0aXZhdGVTdWJqID0gbmV3IHJ4LlJlcGxheVN1YmplY3Q8KCkgPT4gKFByb21pc2VMaWtlPGFueT4gfCB2b2lkKT4oKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGRlYWN0aXZhdGUoKSB7XG4gIGZldGNoUmVtb3RlLnN0b3AoKTtcbiAgcmV0dXJuIGRlYWN0aXZhdGVTdWJqLnBpcGUoXG4gICAgb3AubWVyZ2VNYXAoc2h1dGRvd24gPT4gcnguZGVmZXIoKCkgPT4gc2h1dGRvd24oKSkpXG4gICkudG9Qcm9taXNlKCk7XG59XG5leHBvcnQgZnVuY3Rpb24gYWN0aXZhdGUoYXBpOiBFeHRlbnNpb25Db250ZXh0KSB7XG4gIHZhciBzdGF0aWNGb2xkZXIgPSBhcGkuY29uZmlnLnJlc29sdmUoJ3N0YXRpY0RpcicpO1xuICBsb2cuZGVidWcoJ2V4cHJlc3Mgc3RhdGljIHBhdGg6ICcgKyBzdGF0aWNGb2xkZXIpO1xuXG5cbiAgdmFyIGZhdmljb24gPSBmaW5kRmF2aWNvbigpO1xuICBpZiAoZmF2aWNvbilcbiAgICBhcGkudXNlKHNlcnZlckZhdmljb24oZmF2aWNvbikpO1xuXG4gIHZhciBtYXhBZ2VNYXAgPSBnZXRTZXR0aW5nKCkuY2FjaGVDb250cm9sTWF4QWdlO1xuICBsb2cuaW5mbygnY2FjaGUgY29udHJvbCcsIG1heEFnZU1hcCk7XG4gIGxvZy5pbmZvKCdTZXJ2ZSBzdGF0aWMgZGlyJywgc3RhdGljRm9sZGVyKTtcblxuICAvLyBhcGkudXNlKCcvJywgY3JlYXRlUmVzcG9uc2VUaW1lc3RhbXApO1xuICBwcm94eVRvRGV2U2VydmVyKGFwaSk7XG5cbiAgY29uc3QgaHR0cFByb3h5U2V0ID0gZ2V0U2V0dGluZygpLmh0dHBQcm94eTtcbiAgaWYgKGh0dHBQcm94eVNldCkge1xuICAgIGZvciAoY29uc3QgcHJveHlQYXRoIG9mIE9iamVjdC5rZXlzKGh0dHBQcm94eVNldCkpIHtcbiAgICAgIGxvZy5pbmZvKGBFbmFibGUgSFRUUCBwcm94eSAke3Byb3h5UGF0aH0gLT4gJHtodHRwUHJveHlTZXRbcHJveHlQYXRoXX1gKTtcbiAgICAgIHNldHVwSHR0cFByb3h5KHByb3h5UGF0aCwgaHR0cFByb3h5U2V0W3Byb3h5UGF0aF0pO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGh0dHBQcm94eVdpdGhDYWNoZVNldCA9IGdldFNldHRpbmcoKS5odHRwUHJveHlXaXRoQ2FjaGU7XG4gIGlmIChodHRwUHJveHlXaXRoQ2FjaGVTZXQpIHtcbiAgICBmb3IgKGNvbnN0IHByb3h5UGF0aCBvZiBPYmplY3Qua2V5cyhodHRwUHJveHlXaXRoQ2FjaGVTZXQpKSB7XG4gICAgICBjb25zdCBkaXIgPSBQYXRoLmpvaW4oY29uZmlnKCkuZGVzdERpciwgJ2h0dHAtcHJveHktY2FjaGUnLCBfLnRyaW1TdGFydChwcm94eVBhdGgsICcvJykpO1xuICAgICAgY29uc3QgZW5kUG9pbnQgPSBodHRwUHJveHlXaXRoQ2FjaGVTZXRbcHJveHlQYXRoXTtcbiAgICAgIGxvZy5pbmZvKGBFbmFibGUgSFRUUCBwcm94eSAke3Byb3h5UGF0aH0gLS0+ICR7ZW5kUG9pbnR9LCBjYWNoZSBkaXJlY3Rvcnk6ICR7ZGlyfWApO1xuICAgICAgY3JlYXRlUHJveHlXaXRoQ2FjaGUocHJveHlQYXRoLCB7dGFyZ2V0OiBlbmRQb2ludH0sIGRpcik7XG4gICAgfVxuICB9XG5cbiAgY29uc3Qgc2F2ZU5wbVJlZ2lzdHJ5ID0gY3JlYXRlTnBtUmVnaXN0cnlTZXJ2ZXIoYXBpKTtcbiAgaWYgKHNhdmVOcG1SZWdpc3RyeSlcbiAgICBkZWFjdGl2YXRlU3Viai5uZXh0KHNhdmVOcG1SZWdpc3RyeSk7XG4gIC8vIGNvbnN0IHpzcyA9IGNyZWF0ZVppcFJvdXRlKG1heEFnZU1hcCk7XG5cbiAgLy8gYXBpLnVzZSgnLycsIHpzcy5oYW5kbGVyKTtcbiAgY29uc3Qgc3RhdGljSGFuZGxlciA9IGNyZWF0ZVN0YXRpY1JvdXRlKHN0YXRpY0ZvbGRlciwgbWF4QWdlTWFwKTtcbiAgYXBpLnVzZSgnLycsIHN0YXRpY0hhbmRsZXIpO1xuICAvLyBhcGkudXNlKCcvJywgY3JlYXRlU3RhdGljUm91dGUoYXBpLmNvbmZpZy5yZXNvbHZlKCdkbGxEZXN0RGlyJyksIG1heEFnZU1hcCkpO1xuXG4gIGlmIChhcGkuY29uZmlnLmdldChbYXBpLnBhY2thZ2VOYW1lLCAnc2VydmVJbmRleCddKSkge1xuICAgIGNvbnN0IHN0eWxlc2hlZXQgPSBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vc2VydmUtaW5kZXguY3NzJyk7XG4gICAgcHJvY2Vzcy50aXRsZSA9ICdGaWxlIHNlcnZlciBvbiAnICsgc3RhdGljRm9sZGVyO1xuICAgIGFwaS51c2UoJy8nLCBzZXJ2ZUluZGV4KHN0YXRpY0ZvbGRlciwge2ljb25zOiB0cnVlLCBzdHlsZXNoZWV0fSkpO1xuICB9IGVsc2Uge1xuICAgIGxvZy5pbmZvKGNoYWxrLmJsdWVCcmlnaHQoYElmIHlvdSB3YW50IHRvIHNlcnZlIGRpcmVjdG9yeSBpbmRleCBwYWdlIGZvciByZXNvdXJjZSBkaXJlY3Rvcnkgb3RoZXIgdGhhbiAke3N0YXRpY0ZvbGRlcn1cXG5gICtcbiAgICAgIGAgc3RhcnQgY29tbWFuZCB3aXRoIFwiLS1wcm9wICR7YXBpLnBhY2thZ2VOYW1lfS5zZXJ2ZUluZGV4PXRydWUgLS1wcm9wIHN0YXRpY0Rpcj08cmVzb3VyY2UgZGlyZWN0b3J5PmApKTtcbiAgfVxuICBhcGkuZXhwcmVzc0FwcFNldChhcHAgPT4gYWN0aXZhdGVDZChhcHAsIGltYXApKTtcbiAgZmFsbGJhY2tJbmRleEh0bWwoYXBpKTtcbiAgYXBpLnVzZSgnLycsIHN0YXRpY0hhbmRsZXIpOyAvLyBTZXJ2ZSBmYWxsYmFja2VkIHJlcXVlc3QgdG8gaW5kZXguaHRtbFxuXG4gIGNvbnN0IG1haWxTZXR0aW5nID0gKGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSkgYXMgV2l0aE1haWxTZXJ2ZXJDb25maWcpLmZldGNoTWFpbFNlcnZlcjtcbiAgY29uc3QgaW1hcCA9IG5ldyBJbWFwTWFuYWdlcihtYWlsU2V0dGluZyA/IG1haWxTZXR0aW5nLmVudiA6ICdsb2NhbCcpO1xuXG4gIGFwaS5ldmVudEJ1cy5vbignYXBwQ3JlYXRlZCcsICgpID0+IHtcbiAgICAvLyBhcHBDcmVhdGVkIGV2ZW50IGlzIGVtaXR0ZWQgYnkgZXhwcmVzcy1hcHBcbiAgICB2b2lkIGZldGNoUmVtb3RlLnN0YXJ0KGltYXApO1xuICB9KTtcblxuICBkZWFjdGl2YXRlU3Viai5jb21wbGV0ZSgpO1xufVxuXG5cbmZ1bmN0aW9uIGZpbmRGYXZpY29uKCkge1xuICByZXR1cm4gX2ZpbmRGYXZpY29uSW5Db25maWcoJ3BhY2thZ2VDb250ZXh0UGF0aE1hcHBpbmcnKSB8fCBfZmluZEZhdmljb25JbkNvbmZpZygnb3V0cHV0UGF0aE1hcCcpO1xufVxuXG5mdW5jdGlvbiBfZmluZEZhdmljb25JbkNvbmZpZyhwcm9wZXJ0eToga2V5b2YgRHJjcFNldHRpbmdzKSB7XG4gIGlmICghY29uZmlnKClbcHJvcGVydHldKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgbGV0IGZhdmljb25GaWxlOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGxldCBmYXZpY29uUGFja2FnZTogc3RyaW5nO1xuICBfLmVhY2goY29uZmlnKClbcHJvcGVydHldIGFzIGFueSwgKHBhdGgsIHBrTmFtZSkgPT4ge1xuICAgIGlmIChwYXRoID09PSAnLycpIHtcbiAgICAgIGNvbnN0IHBrZyA9IFsuLi5maW5kUGFja2FnZXNCeU5hbWVzKFtwa05hbWVdKV1bMF07XG4gICAgICBpZiAocGtnKSB7XG4gICAgICAgIGNvbnN0IGFzc2V0c0ZvbGRlciA9IHBrZy5qc29uLnBsaW5rPy5hc3NldHNEaXIgfHwgcGtnLmpzb24uZHI/LmFzc2V0c0RpciB8fCAnYXNzZXRzJztcbiAgICAgICAgdmFyIGZhdmljb24gPSBQYXRoLmpvaW4ocGtnLnJlYWxQYXRoLCBhc3NldHNGb2xkZXIsICdmYXZpY29uLmljbycpO1xuICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhmYXZpY29uKSkge1xuICAgICAgICAgIGlmIChmYXZpY29uRmlsZSkge1xuICAgICAgICAgICAgbG9nLndhcm4oJ0ZvdW5kIGR1cGxpY2F0ZSBmYXZpY29uIGZpbGUgaW4nLCBwa2cubmFtZSwgJ2V4aXN0aW5nJywgZmF2aWNvblBhY2thZ2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBmYXZpY29uRmlsZSA9IFBhdGgucmVzb2x2ZShmYXZpY29uKTtcbiAgICAgICAgICBmYXZpY29uUGFja2FnZSA9IHBrZy5uYW1lO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICB9XG4gIH0pO1xuICByZXR1cm4gZmF2aWNvbkZpbGU7XG59XG5cbiJdfQ==