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
const chalk_1 = __importDefault(require("chalk"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
const serve_index_1 = __importDefault(require("serve-index"));
const cd_server_1 = require("./content-deployer/cd-server");
const fetchRemote = __importStar(require("./fetch-remote"));
const fetch_remote_imap_1 = require("./fetch-remote-imap");
const index_html_route_1 = require("./index-html-route");
const static_middleware_1 = require("./static-middleware");
const utils_1 = require("./utils");
const assets_processer_setting_1 = require("../isom/assets-processer-setting");
const plink_1 = require("@wfh/plink");
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsa0RBQTBCO0FBQzFCLHdEQUEwQjtBQUMxQixvREFBdUI7QUFDdkIsZ0RBQXdCO0FBQ3hCLDhEQUFxQztBQUNyQyw0REFBc0U7QUFDdEUsNERBQThDO0FBQzlDLDJEQUFrRDtBQUVsRCx5REFBeUU7QUFDekUsMkRBQXdEO0FBQ3hELG1DQUF5QztBQUN6QywrRUFBNEQ7QUFDNUQsc0NBQWlHO0FBQ2pHLE1BQU0sR0FBRyxHQUFHLElBQUEsZ0JBQVEsRUFBQyxVQUFVLENBQUMsQ0FBQztBQUNqQyw0REFBNEQ7QUFDNUQsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBRS9DLFNBQWdCLFVBQVU7SUFDeEIsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ3JCLENBQUM7QUFGRCxnQ0FFQztBQUNELFNBQWdCLFFBQVEsQ0FBQyxHQUFxQjtJQUM1QyxJQUFJLFlBQVksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNuRCxHQUFHLENBQUMsS0FBSyxDQUFDLHVCQUF1QixHQUFHLFlBQVksQ0FBQyxDQUFDO0lBR2xELElBQUksT0FBTyxHQUFHLFdBQVcsRUFBRSxDQUFDO0lBQzVCLElBQUksT0FBTztRQUNULEdBQUcsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFFbEMsSUFBSSxTQUFTLEdBQUcsSUFBQSxxQ0FBVSxHQUFFLENBQUMsa0JBQWtCLENBQUM7SUFDaEQsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDckMsR0FBRyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUUzQyx5Q0FBeUM7SUFDekMsSUFB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QUMsUUFBUSxDQUFRLEVBQUUsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEVBQUU7O1FBQ2pELElBQUksSUFBSSxLQUFLLEdBQUcsRUFBRTtZQUNoQixNQUFNLEdBQUcsR0FBRyxDQUFDLEdBQUcsSUFBQSwyQkFBbUIsRUFBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsRCxJQUFJLEdBQUcsRUFBRTtnQkFDUCxNQUFNLFlBQVksR0FBRyxDQUFBLE1BQUEsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLDBDQUFFLFNBQVMsTUFBSSxNQUFBLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSwwQ0FBRSxTQUFTLENBQUEsSUFBSSxRQUFRLENBQUM7Z0JBQ3JGLElBQUksT0FBTyxHQUFHLGNBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxZQUFZLEVBQUUsYUFBYSxDQUFDLENBQUM7Z0JBQ25FLElBQUksa0JBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEVBQUU7b0JBQzFCLElBQUksV0FBVyxFQUFFO3dCQUNmLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUNBQWlDLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUUsY0FBYyxDQUFDLENBQUM7cUJBQ25GO29CQUNELFdBQVcsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUNwQyxjQUFjLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztpQkFDM0I7YUFDRjtTQUVGO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDSCxPQUFPLFdBQVcsQ0FBQztBQUNyQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgc2VydmVJbmRleCBmcm9tICdzZXJ2ZS1pbmRleCc7XG5pbXBvcnQgeyBhY3RpdmF0ZSBhcyBhY3RpdmF0ZUNkIH0gZnJvbSAnLi9jb250ZW50LWRlcGxveWVyL2NkLXNlcnZlcic7XG5pbXBvcnQgKiBhcyBmZXRjaFJlbW90ZSBmcm9tICcuL2ZldGNoLXJlbW90ZSc7XG5pbXBvcnQgeyBJbWFwTWFuYWdlciB9IGZyb20gJy4vZmV0Y2gtcmVtb3RlLWltYXAnO1xuaW1wb3J0IHsgV2l0aE1haWxTZXJ2ZXJDb25maWcgfSBmcm9tICcuL2ZldGNoLXR5cGVzJztcbmltcG9ydCB7IGZhbGxiYWNrSW5kZXhIdG1sLCBwcm94eVRvRGV2U2VydmVyIH0gZnJvbSAnLi9pbmRleC1odG1sLXJvdXRlJztcbmltcG9ydCB7IGNyZWF0ZVN0YXRpY1JvdXRlIH0gZnJvbSAnLi9zdGF0aWMtbWlkZGxld2FyZSc7XG5pbXBvcnQgeyBzZXR1cEh0dHBQcm94eSB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtnZXRTZXR0aW5nfSBmcm9tICcuLi9pc29tL2Fzc2V0cy1wcm9jZXNzZXItc2V0dGluZyc7XG5pbXBvcnQge2xvZzRGaWxlLCBjb25maWcsIERyY3BTZXR0aW5ncywgZmluZFBhY2thZ2VzQnlOYW1lcywgRXh0ZW5zaW9uQ29udGV4dH0gZnJvbSAnQHdmaC9wbGluayc7XG5jb25zdCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcbi8vIGNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUpO1xuY29uc3Qgc2VydmVyRmF2aWNvbiA9IHJlcXVpcmUoJ3NlcnZlLWZhdmljb24nKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGRlYWN0aXZhdGUoKSB7XG4gIGZldGNoUmVtb3RlLnN0b3AoKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBhY3RpdmF0ZShhcGk6IEV4dGVuc2lvbkNvbnRleHQpIHtcbiAgdmFyIHN0YXRpY0ZvbGRlciA9IGFwaS5jb25maWcucmVzb2x2ZSgnc3RhdGljRGlyJyk7XG4gIGxvZy5kZWJ1ZygnZXhwcmVzcyBzdGF0aWMgcGF0aDogJyArIHN0YXRpY0ZvbGRlcik7XG5cblxuICB2YXIgZmF2aWNvbiA9IGZpbmRGYXZpY29uKCk7XG4gIGlmIChmYXZpY29uKVxuICAgIGFwaS51c2Uoc2VydmVyRmF2aWNvbihmYXZpY29uKSk7XG5cbiAgdmFyIG1heEFnZU1hcCA9IGdldFNldHRpbmcoKS5jYWNoZUNvbnRyb2xNYXhBZ2U7XG4gIGxvZy5pbmZvKCdjYWNoZSBjb250cm9sJywgbWF4QWdlTWFwKTtcbiAgbG9nLmluZm8oJ1NlcnZlIHN0YXRpYyBkaXInLCBzdGF0aWNGb2xkZXIpO1xuXG4gIC8vIGFwaS51c2UoJy8nLCBjcmVhdGVSZXNwb25zZVRpbWVzdGFtcCk7XG4gIHByb3h5VG9EZXZTZXJ2ZXIoYXBpKTtcblxuICBjb25zdCBodHRwUHJveHlTZXQgPSBnZXRTZXR0aW5nKCkuaHR0cFByb3h5O1xuICBpZiAoaHR0cFByb3h5U2V0KSB7XG4gICAgZm9yIChjb25zdCBwcm94eVBhdGggb2YgT2JqZWN0LmtleXMoaHR0cFByb3h5U2V0KSkge1xuICAgICAgbG9nLmluZm8oYEVuYWJsZSBIVFRQIHByb3h5ICR7cHJveHlQYXRofSAtPiAke2h0dHBQcm94eVNldFtwcm94eVBhdGhdfWApO1xuICAgICAgc2V0dXBIdHRwUHJveHkocHJveHlQYXRoLCBodHRwUHJveHlTZXRbcHJveHlQYXRoXSk7XG4gICAgfVxuICB9XG4gIC8vIGNvbnN0IHpzcyA9IGNyZWF0ZVppcFJvdXRlKG1heEFnZU1hcCk7XG5cbiAgLy8gYXBpLnVzZSgnLycsIHpzcy5oYW5kbGVyKTtcbiAgY29uc3Qgc3RhdGljSGFuZGxlciA9IGNyZWF0ZVN0YXRpY1JvdXRlKHN0YXRpY0ZvbGRlciwgbWF4QWdlTWFwKTtcbiAgYXBpLnVzZSgnLycsIHN0YXRpY0hhbmRsZXIpO1xuICAvLyBhcGkudXNlKCcvJywgY3JlYXRlU3RhdGljUm91dGUoYXBpLmNvbmZpZy5yZXNvbHZlKCdkbGxEZXN0RGlyJyksIG1heEFnZU1hcCkpO1xuXG4gIGlmIChhcGkuY29uZmlnLmdldChbYXBpLnBhY2thZ2VOYW1lLCAnc2VydmVJbmRleCddKSkge1xuICAgIGNvbnN0IHN0eWxlc2hlZXQgPSBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vc2VydmUtaW5kZXguY3NzJyk7XG4gICAgcHJvY2Vzcy50aXRsZSA9ICdGaWxlIHNlcnZlciBvbiAnICsgc3RhdGljRm9sZGVyO1xuICAgIGFwaS51c2UoJy8nLCBzZXJ2ZUluZGV4KHN0YXRpY0ZvbGRlciwge2ljb25zOiB0cnVlLCBzdHlsZXNoZWV0fSkpO1xuICB9IGVsc2Uge1xuICAgIGxvZy5pbmZvKGNoYWxrLmJsdWVCcmlnaHQoYElmIHlvdSB3YW50IHRvIHNlcnZlIGRpcmVjdG9yeSBpbmRleCBwYWdlIGZvciByZXNvdXJjZSBkaXJlY3Rvcnkgb3RoZXIgdGhhbiAke3N0YXRpY0ZvbGRlcn1cXG5gICtcbiAgICAgIGAgc3RhcnQgY29tbWFuZCB3aXRoIFwiLS1wcm9wICR7YXBpLnBhY2thZ2VOYW1lfS5zZXJ2ZUluZGV4PXRydWUgLS1wcm9wIHN0YXRpY0Rpcj08cmVzb3VyY2UgZGlyZWN0b3J5PmApKTtcbiAgfVxuICBhcGkuZXhwcmVzc0FwcFNldChhcHAgPT4gYWN0aXZhdGVDZChhcHAsIGltYXApKTtcbiAgZmFsbGJhY2tJbmRleEh0bWwoYXBpKTtcbiAgYXBpLnVzZSgnLycsIHN0YXRpY0hhbmRsZXIpOyAvLyBTZXJ2ZSBmYWxsYmFja2VkIHJlcXVlc3QgdG8gaW5kZXguaHRtbFxuXG4gIGNvbnN0IG1haWxTZXR0aW5nID0gKGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSkgYXMgV2l0aE1haWxTZXJ2ZXJDb25maWcpLmZldGNoTWFpbFNlcnZlcjtcbiAgY29uc3QgaW1hcCA9IG5ldyBJbWFwTWFuYWdlcihtYWlsU2V0dGluZyA/IG1haWxTZXR0aW5nLmVudiA6ICdsb2NhbCcpO1xuXG4gIGFwaS5ldmVudEJ1cy5vbignYXBwQ3JlYXRlZCcsICgpID0+IHtcbiAgICAvLyBhcHBDcmVhdGVkIGV2ZW50IGlzIGVtaXR0ZWQgYnkgZXhwcmVzcy1hcHBcbiAgICB2b2lkIGZldGNoUmVtb3RlLnN0YXJ0KGltYXApO1xuICB9KTtcblxuICBpZiAoIWFwaS5jb25maWcoKS5kZXZNb2RlKSB7XG4gICAgcmV0dXJuO1xuICB9XG59XG5cblxuZnVuY3Rpb24gZmluZEZhdmljb24oKSB7XG4gIHJldHVybiBfZmluZEZhdmljb25JbkNvbmZpZygncGFja2FnZUNvbnRleHRQYXRoTWFwcGluZycpIHx8IF9maW5kRmF2aWNvbkluQ29uZmlnKCdvdXRwdXRQYXRoTWFwJyk7XG59XG5cbmZ1bmN0aW9uIF9maW5kRmF2aWNvbkluQ29uZmlnKHByb3BlcnR5OiBrZXlvZiBEcmNwU2V0dGluZ3MpIHtcbiAgaWYgKCFjb25maWcoKVtwcm9wZXJ0eV0pIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBsZXQgZmF2aWNvbkZpbGU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgbGV0IGZhdmljb25QYWNrYWdlOiBzdHJpbmc7XG4gIF8uZWFjaChjb25maWcoKVtwcm9wZXJ0eV0gYXMgYW55LCAocGF0aCwgcGtOYW1lKSA9PiB7XG4gICAgaWYgKHBhdGggPT09ICcvJykge1xuICAgICAgY29uc3QgcGtnID0gWy4uLmZpbmRQYWNrYWdlc0J5TmFtZXMoW3BrTmFtZV0pXVswXTtcbiAgICAgIGlmIChwa2cpIHtcbiAgICAgICAgY29uc3QgYXNzZXRzRm9sZGVyID0gcGtnLmpzb24ucGxpbms/LmFzc2V0c0RpciB8fCBwa2cuanNvbi5kcj8uYXNzZXRzRGlyIHx8ICdhc3NldHMnO1xuICAgICAgICB2YXIgZmF2aWNvbiA9IFBhdGguam9pbihwa2cucmVhbFBhdGgsIGFzc2V0c0ZvbGRlciwgJ2Zhdmljb24uaWNvJyk7XG4gICAgICAgIGlmIChmcy5leGlzdHNTeW5jKGZhdmljb24pKSB7XG4gICAgICAgICAgaWYgKGZhdmljb25GaWxlKSB7XG4gICAgICAgICAgICBsb2cud2FybignRm91bmQgZHVwbGljYXRlIGZhdmljb24gZmlsZSBpbicsIHBrZy5uYW1lLCAnZXhpc3RpbmcnLCBmYXZpY29uUGFja2FnZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGZhdmljb25GaWxlID0gUGF0aC5yZXNvbHZlKGZhdmljb24pO1xuICAgICAgICAgIGZhdmljb25QYWNrYWdlID0gcGtnLm5hbWU7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgIH1cbiAgfSk7XG4gIHJldHVybiBmYXZpY29uRmlsZTtcbn1cblxuIl19