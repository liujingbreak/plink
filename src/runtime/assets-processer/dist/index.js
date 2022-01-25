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
exports.activate = exports.deactivate = void 0;
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
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
function deactivate() {
    fetchRemote.stop();
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
    (0, npm_registry_cache_service_1.default)(api);
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
    if (!api.config().devMode) {
        return;
    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsZ0RBQXdCO0FBQ3hCLGtEQUEwQjtBQUMxQix3REFBMEI7QUFDMUIsb0RBQXVCO0FBQ3ZCLDhEQUFxQztBQUNyQyxzQ0FBaUc7QUFDakcsK0VBQTREO0FBQzVELDREQUFzRTtBQUN0RSw0REFBOEM7QUFDOUMsMkRBQWtEO0FBRWxELHlEQUF5RTtBQUN6RSwyREFBd0Q7QUFDeEQsK0RBQW1FO0FBQ25FLDBHQUErRTtBQUMvRSxtQ0FBdUM7QUFFdkMsTUFBTSxHQUFHLEdBQUcsSUFBQSxnQkFBUSxFQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pDLDREQUE0RDtBQUM1RCxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7QUFFL0MsU0FBZ0IsVUFBVTtJQUN4QixXQUFXLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDckIsQ0FBQztBQUZELGdDQUVDO0FBQ0QsU0FBZ0IsUUFBUSxDQUFDLEdBQXFCO0lBQzVDLElBQUksWUFBWSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ25ELEdBQUcsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEdBQUcsWUFBWSxDQUFDLENBQUM7SUFHbEQsSUFBSSxPQUFPLEdBQUcsV0FBVyxFQUFFLENBQUM7SUFDNUIsSUFBSSxPQUFPO1FBQ1QsR0FBRyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUVsQyxJQUFJLFNBQVMsR0FBRyxJQUFBLHFDQUFVLEdBQUUsQ0FBQyxrQkFBa0IsQ0FBQztJQUNoRCxHQUFHLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUNyQyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLFlBQVksQ0FBQyxD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Y0FBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLFlBQVksRUFBRSxhQUFhLENBQUMsQ0FBQztnQkFDbkUsSUFBSSxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRTtvQkFDMUIsSUFBSSxXQUFXLEVBQUU7d0JBQ2YsR0FBRyxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRSxjQUFjLENBQUMsQ0FBQztxQkFDbkY7b0JBQ0QsV0FBVyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7b0JBQ3BDLGNBQWMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO2lCQUMzQjthQUNGO1NBRUY7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUNILE9BQU8sV0FBVyxDQUFDO0FBQ3JCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBzZXJ2ZUluZGV4IGZyb20gJ3NlcnZlLWluZGV4JztcbmltcG9ydCB7bG9nNEZpbGUsIGNvbmZpZywgRHJjcFNldHRpbmdzLCBmaW5kUGFja2FnZXNCeU5hbWVzLCBFeHRlbnNpb25Db250ZXh0fSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCB7Z2V0U2V0dGluZ30gZnJvbSAnLi4vaXNvbS9hc3NldHMtcHJvY2Vzc2VyLXNldHRpbmcnO1xuaW1wb3J0IHsgYWN0aXZhdGUgYXMgYWN0aXZhdGVDZCB9IGZyb20gJy4vY29udGVudC1kZXBsb3llci9jZC1zZXJ2ZXInO1xuaW1wb3J0ICogYXMgZmV0Y2hSZW1vdGUgZnJvbSAnLi9mZXRjaC1yZW1vdGUnO1xuaW1wb3J0IHsgSW1hcE1hbmFnZXIgfSBmcm9tICcuL2ZldGNoLXJlbW90ZS1pbWFwJztcbmltcG9ydCB7IFdpdGhNYWlsU2VydmVyQ29uZmlnIH0gZnJvbSAnLi9mZXRjaC10eXBlcyc7XG5pbXBvcnQgeyBmYWxsYmFja0luZGV4SHRtbCwgcHJveHlUb0RldlNlcnZlciB9IGZyb20gJy4vaW5kZXgtaHRtbC1yb3V0ZSc7XG5pbXBvcnQgeyBjcmVhdGVTdGF0aWNSb3V0ZSB9IGZyb20gJy4vc3RhdGljLW1pZGRsZXdhcmUnO1xuaW1wb3J0IHsgY3JlYXRlUHJveHlXaXRoQ2FjaGUgfSBmcm9tICcuL3Byb3h5LWNhY2hlL2NhY2hlLXNlcnZpY2UnO1xuaW1wb3J0IGNyZWF0ZU5wbVJlZ2lzdHJ5U2VydmVyIGZyb20gJy4vcHJveHktY2FjaGUvbnBtLXJlZ2lzdHJ5LWNhY2hlLXNlcnZpY2UnO1xuaW1wb3J0IHtzZXR1cEh0dHBQcm94eX0gZnJvbSAnLi91dGlscyc7XG5cbmNvbnN0IGxvZyA9IGxvZzRGaWxlKF9fZmlsZW5hbWUpO1xuLy8gY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSk7XG5jb25zdCBzZXJ2ZXJGYXZpY29uID0gcmVxdWlyZSgnc2VydmUtZmF2aWNvbicpO1xuXG5leHBvcnQgZnVuY3Rpb24gZGVhY3RpdmF0ZSgpIHtcbiAgZmV0Y2hSZW1vdGUuc3RvcCgpO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGFjdGl2YXRlKGFwaTogRXh0ZW5zaW9uQ29udGV4dCkge1xuICB2YXIgc3RhdGljRm9sZGVyID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdzdGF0aWNEaXInKTtcbiAgbG9nLmRlYnVnKCdleHByZXNzIHN0YXRpYyBwYXRoOiAnICsgc3RhdGljRm9sZGVyKTtcblxuXG4gIHZhciBmYXZpY29uID0gZmluZEZhdmljb24oKTtcbiAgaWYgKGZhdmljb24pXG4gICAgYXBpLnVzZShzZXJ2ZXJGYXZpY29uKGZhdmljb24pKTtcblxuICB2YXIgbWF4QWdlTWFwID0gZ2V0U2V0dGluZygpLmNhY2hlQ29udHJvbE1heEFnZTtcbiAgbG9nLmluZm8oJ2NhY2hlIGNvbnRyb2wnLCBtYXhBZ2VNYXApO1xuICBsb2cuaW5mbygnU2VydmUgc3RhdGljIGRpcicsIHN0YXRpY0ZvbGRlcik7XG5cbiAgLy8gYXBpLnVzZSgnLycsIGNyZWF0ZVJlc3BvbnNlVGltZXN0YW1wKTtcbiAgcHJveHlUb0RldlNlcnZlcihhcGkpO1xuXG4gIGNvbnN0IGh0dHBQcm94eVNldCA9IGdldFNldHRpbmcoKS5odHRwUHJveHk7XG4gIGlmIChodHRwUHJveHlTZXQpIHtcbiAgICBmb3IgKGNvbnN0IHByb3h5UGF0aCBvZiBPYmplY3Qua2V5cyhodHRwUHJveHlTZXQpKSB7XG4gICAgICBsb2cuaW5mbyhgRW5hYmxlIEhUVFAgcHJveHkgJHtwcm94eVBhdGh9IC0+ICR7aHR0cFByb3h5U2V0W3Byb3h5UGF0aF19YCk7XG4gICAgICBzZXR1cEh0dHBQcm94eShwcm94eVBhdGgsIGh0dHBQcm94eVNldFtwcm94eVBhdGhdKTtcbiAgICB9XG4gIH1cblxuICBjb25zdCBodHRwUHJveHlXaXRoQ2FjaGVTZXQgPSBnZXRTZXR0aW5nKCkuaHR0cFByb3h5V2l0aENhY2hlO1xuICBpZiAoaHR0cFByb3h5V2l0aENhY2hlU2V0KSB7XG4gICAgZm9yIChjb25zdCBwcm94eVBhdGggb2YgT2JqZWN0LmtleXMoaHR0cFByb3h5V2l0aENhY2hlU2V0KSkge1xuICAgICAgY29uc3QgZGlyID0gUGF0aC5qb2luKGNvbmZpZygpLmRlc3REaXIsICdodHRwLXByb3h5LWNhY2hlJywgXy50cmltU3RhcnQocHJveHlQYXRoLCAnLycpKTtcbiAgICAgIGNvbnN0IGVuZFBvaW50ID0gaHR0cFByb3h5V2l0aENhY2hlU2V0W3Byb3h5UGF0aF07XG4gICAgICBsb2cuaW5mbyhgRW5hYmxlIEhUVFAgcHJveHkgJHtwcm94eVBhdGh9IC0tPiAke2VuZFBvaW50fSwgY2FjaGUgZGlyZWN0b3J5OiAke2Rpcn1gKTtcbiAgICAgIGNyZWF0ZVByb3h5V2l0aENhY2hlKHByb3h5UGF0aCwge3RhcmdldDogZW5kUG9pbnR9LCBkaXIpO1xuICAgIH1cbiAgfVxuXG4gIGNyZWF0ZU5wbVJlZ2lzdHJ5U2VydmVyKGFwaSk7XG4gIC8vIGNvbnN0IHpzcyA9IGNyZWF0ZVppcFJvdXRlKG1heEFnZU1hcCk7XG5cbiAgLy8gYXBpLnVzZSgnLycsIHpzcy5oYW5kbGVyKTtcbiAgY29uc3Qgc3RhdGljSGFuZGxlciA9IGNyZWF0ZVN0YXRpY1JvdXRlKHN0YXRpY0ZvbGRlciwgbWF4QWdlTWFwKTtcbiAgYXBpLnVzZSgnLycsIHN0YXRpY0hhbmRsZXIpO1xuICAvLyBhcGkudXNlKCcvJywgY3JlYXRlU3RhdGljUm91dGUoYXBpLmNvbmZpZy5yZXNvbHZlKCdkbGxEZXN0RGlyJyksIG1heEFnZU1hcCkpO1xuXG4gIGlmIChhcGkuY29uZmlnLmdldChbYXBpLnBhY2thZ2VOYW1lLCAnc2VydmVJbmRleCddKSkge1xuICAgIGNvbnN0IHN0eWxlc2hlZXQgPSBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vc2VydmUtaW5kZXguY3NzJyk7XG4gICAgcHJvY2Vzcy50aXRsZSA9ICdGaWxlIHNlcnZlciBvbiAnICsgc3RhdGljRm9sZGVyO1xuICAgIGFwaS51c2UoJy8nLCBzZXJ2ZUluZGV4KHN0YXRpY0ZvbGRlciwge2ljb25zOiB0cnVlLCBzdHlsZXNoZWV0fSkpO1xuICB9IGVsc2Uge1xuICAgIGxvZy5pbmZvKGNoYWxrLmJsdWVCcmlnaHQoYElmIHlvdSB3YW50IHRvIHNlcnZlIGRpcmVjdG9yeSBpbmRleCBwYWdlIGZvciByZXNvdXJjZSBkaXJlY3Rvcnkgb3RoZXIgdGhhbiAke3N0YXRpY0ZvbGRlcn1cXG5gICtcbiAgICAgIGAgc3RhcnQgY29tbWFuZCB3aXRoIFwiLS1wcm9wICR7YXBpLnBhY2thZ2VOYW1lfS5zZXJ2ZUluZGV4PXRydWUgLS1wcm9wIHN0YXRpY0Rpcj08cmVzb3VyY2UgZGlyZWN0b3J5PmApKTtcbiAgfVxuICBhcGkuZXhwcmVzc0FwcFNldChhcHAgPT4gYWN0aXZhdGVDZChhcHAsIGltYXApKTtcbiAgZmFsbGJhY2tJbmRleEh0bWwoYXBpKTtcbiAgYXBpLnVzZSgnLycsIHN0YXRpY0hhbmRsZXIpOyAvLyBTZXJ2ZSBmYWxsYmFja2VkIHJlcXVlc3QgdG8gaW5kZXguaHRtbFxuXG4gIGNvbnN0IG1haWxTZXR0aW5nID0gKGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSkgYXMgV2l0aE1haWxTZXJ2ZXJDb25maWcpLmZldGNoTWFpbFNlcnZlcjtcbiAgY29uc3QgaW1hcCA9IG5ldyBJbWFwTWFuYWdlcihtYWlsU2V0dGluZyA/IG1haWxTZXR0aW5nLmVudiA6ICdsb2NhbCcpO1xuXG4gIGFwaS5ldmVudEJ1cy5vbignYXBwQ3JlYXRlZCcsICgpID0+IHtcbiAgICAvLyBhcHBDcmVhdGVkIGV2ZW50IGlzIGVtaXR0ZWQgYnkgZXhwcmVzcy1hcHBcbiAgICB2b2lkIGZldGNoUmVtb3RlLnN0YXJ0KGltYXApO1xuICB9KTtcblxuICBpZiAoIWFwaS5jb25maWcoKS5kZXZNb2RlKSB7XG4gICAgcmV0dXJuO1xuICB9XG59XG5cblxuZnVuY3Rpb24gZmluZEZhdmljb24oKSB7XG4gIHJldHVybiBfZmluZEZhdmljb25JbkNvbmZpZygncGFja2FnZUNvbnRleHRQYXRoTWFwcGluZycpIHx8IF9maW5kRmF2aWNvbkluQ29uZmlnKCdvdXRwdXRQYXRoTWFwJyk7XG59XG5cbmZ1bmN0aW9uIF9maW5kRmF2aWNvbkluQ29uZmlnKHByb3BlcnR5OiBrZXlvZiBEcmNwU2V0dGluZ3MpIHtcbiAgaWYgKCFjb25maWcoKVtwcm9wZXJ0eV0pIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBsZXQgZmF2aWNvbkZpbGU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgbGV0IGZhdmljb25QYWNrYWdlOiBzdHJpbmc7XG4gIF8uZWFjaChjb25maWcoKVtwcm9wZXJ0eV0gYXMgYW55LCAocGF0aCwgcGtOYW1lKSA9PiB7XG4gICAgaWYgKHBhdGggPT09ICcvJykge1xuICAgICAgY29uc3QgcGtnID0gWy4uLmZpbmRQYWNrYWdlc0J5TmFtZXMoW3BrTmFtZV0pXVswXTtcbiAgICAgIGlmIChwa2cpIHtcbiAgICAgICAgY29uc3QgYXNzZXRzRm9sZGVyID0gcGtnLmpzb24ucGxpbms/LmFzc2V0c0RpciB8fCBwa2cuanNvbi5kcj8uYXNzZXRzRGlyIHx8ICdhc3NldHMnO1xuICAgICAgICB2YXIgZmF2aWNvbiA9IFBhdGguam9pbihwa2cucmVhbFBhdGgsIGFzc2V0c0ZvbGRlciwgJ2Zhdmljb24uaWNvJyk7XG4gICAgICAgIGlmIChmcy5leGlzdHNTeW5jKGZhdmljb24pKSB7XG4gICAgICAgICAgaWYgKGZhdmljb25GaWxlKSB7XG4gICAgICAgICAgICBsb2cud2FybignRm91bmQgZHVwbGljYXRlIGZhdmljb24gZmlsZSBpbicsIHBrZy5uYW1lLCAnZXhpc3RpbmcnLCBmYXZpY29uUGFja2FnZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGZhdmljb25GaWxlID0gUGF0aC5yZXNvbHZlKGZhdmljb24pO1xuICAgICAgICAgIGZhdmljb25QYWNrYWdlID0gcGtnLm5hbWU7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgIH1cbiAgfSk7XG4gIHJldHVybiBmYXZpY29uRmlsZTtcbn1cblxuIl19