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
const __api_1 = __importDefault(require("__api"));
const cd_server_1 = require("./content-deployer/cd-server");
const fetchRemote = __importStar(require("./fetch-remote"));
const fetch_remote_imap_1 = require("./fetch-remote-imap");
const index_html_route_1 = require("./index-html-route");
const static_middleware_1 = require("./static-middleware");
const utils_1 = require("./utils");
const assets_processer_setting_1 = require("../isom/assets-processer-setting");
const plink_1 = require("@wfh/plink");
const log = plink_1.log4File(__filename);
// const log = require('log4js').getLogger(api.packageName);
const serverFavicon = require('serve-favicon');
function deactivate() {
    fetchRemote.stop();
}
exports.deactivate = deactivate;
function activate() {
    var staticFolder = __api_1.default.config.resolve('staticDir');
    log.debug('express static path: ' + staticFolder);
    var favicon = findFavicon();
    if (favicon)
        __api_1.default.use(serverFavicon(favicon));
    var maxAgeMap = assets_processer_setting_1.getSetting().cacheControlMaxAge;
    log.info('cache control', maxAgeMap);
    log.info('Serve static dir', staticFolder);
    // api.use('/', createResponseTimestamp);
    index_html_route_1.proxyToDevServer();
    const httpProxySet = assets_processer_setting_1.getSetting().httpProxy;
    if (httpProxySet) {
        for (const proxyPath of Object.keys(httpProxySet)) {
            log.info(`Enable HTTP proxy ${proxyPath} -> ${httpProxySet[proxyPath]}`);
            utils_1.setupHttpProxy(proxyPath, httpProxySet[proxyPath]);
        }
    }
    // const zss = createZipRoute(maxAgeMap);
    // api.use('/', zss.handler);
    const staticHandler = static_middleware_1.createStaticRoute(staticFolder, maxAgeMap);
    __api_1.default.use('/', staticHandler);
    // api.use('/', createStaticRoute(api.config.resolve('dllDestDir'), maxAgeMap));
    if (__api_1.default.config.get([__api_1.default.packageName, 'serveIndex'])) {
        const stylesheet = path_1.default.resolve(__dirname, '../serve-index.css');
        process.title = 'File server on ' + staticFolder;
        __api_1.default.use('/', serve_index_1.default(staticFolder, { icons: true, stylesheet }));
    }
    else {
        log.info(chalk_1.default.blueBright(`If you want to serve directory index page for resource directory other than ${staticFolder}\n` +
            ` start command with "--prop ${__api_1.default.packageName}.serveIndex=true --prop staticDir=<resource directory>`));
    }
    __api_1.default.expressAppSet(app => cd_server_1.activate(app, imap));
    index_html_route_1.fallbackIndexHtml();
    __api_1.default.use('/', staticHandler); // Serve fallbacked request to index.html
    const mailSetting = __api_1.default.config.get(__api_1.default.packageName).fetchMailServer;
    const imap = new fetch_remote_imap_1.ImapManager(mailSetting ? mailSetting.env : 'local');
    __api_1.default.eventBus.on('appCreated', () => {
        // appCreated event is emitted by express-app
        void fetchRemote.start(imap);
    });
    if (!__api_1.default.config().devMode) {
        return;
    }
}
exports.activate = activate;
function findFavicon() {
    return _findFaviconInConfig('packageContextPathMapping') || _findFaviconInConfig('outputPathMap');
}
function _findFaviconInConfig(property) {
    if (!plink_1.config()[property]) {
        return null;
    }
    let faviconFile;
    let faviconPackage;
    lodash_1.default.each(plink_1.config()[property], (path, pkName) => {
        var _a, _b;
        if (path === '/') {
            const pkg = [...plink_1.findPackagesByNames([pkName])][0];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsa0RBQTBCO0FBQzFCLHdEQUEwQjtBQUMxQixvREFBdUI7QUFDdkIsZ0RBQXdCO0FBQ3hCLDhEQUFxQztBQUNyQyxrREFBd0I7QUFDeEIsNERBQXNFO0FBQ3RFLDREQUE4QztBQUM5QywyREFBa0Q7QUFFbEQseURBQXlFO0FBQ3pFLDJEQUF3RDtBQUN4RCxtQ0FBeUM7QUFDekMsK0VBQTREO0FBQzVELHNDQUErRTtBQUMvRSxNQUFNLEdBQUcsR0FBRyxnQkFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pDLDREQUE0RDtBQUM1RCxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7QUFFL0MsU0FBZ0IsVUFBVTtJQUN4QixXQUFXLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDckIsQ0FBQztBQUZELGdDQUVDO0FBQ0QsU0FBZ0IsUUFBUTtJQUN0QixJQUFJLFlBQVksR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNuRCxHQUFHLENBQUMsS0FBSyxDQUFDLHVCQUF1QixHQUFHLFlBQVksQ0FBQyxDQUFDO0lBR2xELElBQUksT0FBTyxHQUFHLFdBQVcsRUFBRSxDQUFDO0lBQzVCLElBQUksT0FBTztRQUNULGVBQUcsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFFbEMsSUFBSSxTQUFTLEdBQUcscUNBQVUsRUFBRSxDQUFDLGtCQUFrQixDQUFDO0lBQ2hELEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ3JDLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsWUFBWSxDQUFDLENBQUM7SUFFM0MseUNBQXlDO0lBQ3pDLG1DQUFnQixFQUFFLENBQUM7SUFFbkIsTUFBTSxZQUFZLEdBQUcscUNBQVUsRUFBRSxDQUFDLFNBQVMsQ0FBQztJQUM1QyxJQUFJLFlBQVksRUFBRTtRQUNoQixLQUFLLE1BQU0sU0FBUyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQUU7WUFDakQsR0FBRyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsU0FBUyxPQUFPLFlBQVksQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDekUsc0JBQWMsQ0FBQyxTQUFTLEVBQUUsWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7U0FDcEQ7S0FDRjtJQUVELHlDQUF5QztJQUV6Qyw2QkFBNkI7SUFDN0IsTUFBTSxhQUFhLEdBQUcscUNBQWlCLENBQUMsWUFBWSxFQUFFLFNBQVMsQ0FBQyxDQUFDO0lBQ2pFLGVBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLGFBQWEsQ0FBQyxDQUFDO0lBQzVCLGdGQUFnRjtJQUVoRixJQUFJLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsZUFBRyxDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUMsQ0FBQyxFQUFFO1FBQ25ELE1BQU0sVUFBVSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFDakUsT0FBTyxDQUFDLEtBQUssR0FBRyxpQkFBaUIsR0FBRyxZQUFZLENBQUM7UUFDakQsZUFBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUscUJBQVUsQ0FBQyxZQUFZLEVBQUUsRUFBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBQyxDQUFDLENBQUMsQ0FBQztLQUNuRTtTQUFNO1FBQ0wsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFLLENBQUMsVUFBVSxDQUFDLCtFQUErRSxZQUFZLElBQUk7WUFDdkgsK0JBQStCLGVBQUcsQ0FBQyxXQUFXLHdEQUF3RCxDQUFDLENBQUMsQ0FBQztLQUM1RztJQUNELGVBQUcsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxvQkFBVSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ2hELG9DQUFpQixFQUFFLENBQUM7SUFDcEIsZUFBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQyx5Q0FBeUM7SUFFdEUsTUFBTSxXQUFXLEdBQUksZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBMEIsQ0FBQyxlQUFlLENBQUM7SUFDOUYsTUFBTSxJQUFJLEdBQUcsSUFBSSwrQkFBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7SUFFdEUsZUFBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtRQUNqQyw2Q0FBNkM7UUFDN0MsS0FBSyxXQUFXLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQy9CLENBQUMsQ0FBQyxDQUFDO0lBRUgsSUFBSSxDQUFDLGVBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxPQUFPLEVBQUU7UUFDekIsT0FBTztLQUNSO0FBQ0gsQ0FBQztBQXRERCw0QkFzREM7QUFHRCxTQUFTLFdBQVc7SUFDbEIsT0FBTyxvQkFBb0IsQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLG9CQUFvQixDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3BHLENBQUM7QUFFRCxTQUFTLG9CQUFvQixDQUFDLFFBQTRCO0lBQ3hELElBQUksQ0FBQyxjQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRTtRQUN2QixPQUFPLElBQUksQ0FBQztLQUNiO0lBQ0QsSUFBSSxXQUErQixDQUFDO0lBQ3BDLElBQUksY0FBc0IsQ0FBQztJQUMzQixnQkFBQyxDQUFDLElBQUksQ0FBQyxjQUFNLEVBQUUsQ0FBQyxRQUFRLENBQVEsRUFBRSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsRUFBRTs7UUFDakQsSUFBSSxJQUFJLEtBQUssR0FBRyxFQUFFO1lBQ2hCLE1BQU0sR0FBRyxHQUFHLENBQUMsR0FBRywyQkFBbUIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsRCxJQUFJLEdBQUcsRUFBRTtnQkFDUCxNQUFNLFlBQVksR0FBRyxPQUFBLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSywwQ0FBRSxTQUFTLFlBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLDBDQUFFLFNBQVMsQ0FBQSxJQUFJLFFBQVEsQ0FBQztnQkFDckYsSUFBSSxPQUFPLEdBQUcsY0FBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLFlBQVksRUFBRSxhQUFhLENBQUMsQ0FBQztnQkFDbkUsSUFBSSxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRTtvQkFDMUIsSUFBSSxXQUFXLEVBQUU7d0JBQ2YsR0FBRyxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRSxjQUFjLENBQUMsQ0FBQztxQkFDbkY7b0JBQ0QsV0FBVyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7b0JBQ3BDLGNBQWMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDO2lCQUMzQjthQUNGO1NBRUY7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUNILE9BQU8sV0FBVyxDQUFDO0FBQ3JCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBzZXJ2ZUluZGV4IGZyb20gJ3NlcnZlLWluZGV4JztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHsgYWN0aXZhdGUgYXMgYWN0aXZhdGVDZCB9IGZyb20gJy4vY29udGVudC1kZXBsb3llci9jZC1zZXJ2ZXInO1xuaW1wb3J0ICogYXMgZmV0Y2hSZW1vdGUgZnJvbSAnLi9mZXRjaC1yZW1vdGUnO1xuaW1wb3J0IHsgSW1hcE1hbmFnZXIgfSBmcm9tICcuL2ZldGNoLXJlbW90ZS1pbWFwJztcbmltcG9ydCB7IFdpdGhNYWlsU2VydmVyQ29uZmlnIH0gZnJvbSAnLi9mZXRjaC10eXBlcyc7XG5pbXBvcnQgeyBmYWxsYmFja0luZGV4SHRtbCwgcHJveHlUb0RldlNlcnZlciB9IGZyb20gJy4vaW5kZXgtaHRtbC1yb3V0ZSc7XG5pbXBvcnQgeyBjcmVhdGVTdGF0aWNSb3V0ZSB9IGZyb20gJy4vc3RhdGljLW1pZGRsZXdhcmUnO1xuaW1wb3J0IHsgc2V0dXBIdHRwUHJveHkgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7Z2V0U2V0dGluZ30gZnJvbSAnLi4vaXNvbS9hc3NldHMtcHJvY2Vzc2VyLXNldHRpbmcnO1xuaW1wb3J0IHtsb2c0RmlsZSwgY29uZmlnLCBEcmNwU2V0dGluZ3MsIGZpbmRQYWNrYWdlc0J5TmFtZXN9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuY29uc3QgbG9nID0gbG9nNEZpbGUoX19maWxlbmFtZSk7XG4vLyBjb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lKTtcbmNvbnN0IHNlcnZlckZhdmljb24gPSByZXF1aXJlKCdzZXJ2ZS1mYXZpY29uJyk7XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWFjdGl2YXRlKCkge1xuICBmZXRjaFJlbW90ZS5zdG9wKCk7XG59XG5leHBvcnQgZnVuY3Rpb24gYWN0aXZhdGUoKSB7XG4gIHZhciBzdGF0aWNGb2xkZXIgPSBhcGkuY29uZmlnLnJlc29sdmUoJ3N0YXRpY0RpcicpO1xuICBsb2cuZGVidWcoJ2V4cHJlc3Mgc3RhdGljIHBhdGg6ICcgKyBzdGF0aWNGb2xkZXIpO1xuXG5cbiAgdmFyIGZhdmljb24gPSBmaW5kRmF2aWNvbigpO1xuICBpZiAoZmF2aWNvbilcbiAgICBhcGkudXNlKHNlcnZlckZhdmljb24oZmF2aWNvbikpO1xuXG4gIHZhciBtYXhBZ2VNYXAgPSBnZXRTZXR0aW5nKCkuY2FjaGVDb250cm9sTWF4QWdlO1xuICBsb2cuaW5mbygnY2FjaGUgY29udHJvbCcsIG1heEFnZU1hcCk7XG4gIGxvZy5pbmZvKCdTZXJ2ZSBzdGF0aWMgZGlyJywgc3RhdGljRm9sZGVyKTtcblxuICAvLyBhcGkudXNlKCcvJywgY3JlYXRlUmVzcG9uc2VUaW1lc3RhbXApO1xuICBwcm94eVRvRGV2U2VydmVyKCk7XG5cbiAgY29uc3QgaHR0cFByb3h5U2V0ID0gZ2V0U2V0dGluZygpLmh0dHBQcm94eTtcbiAgaWYgKGh0dHBQcm94eVNldCkge1xuICAgIGZvciAoY29uc3QgcHJveHlQYXRoIG9mIE9iamVjdC5rZXlzKGh0dHBQcm94eVNldCkpIHtcbiAgICAgIGxvZy5pbmZvKGBFbmFibGUgSFRUUCBwcm94eSAke3Byb3h5UGF0aH0gLT4gJHtodHRwUHJveHlTZXRbcHJveHlQYXRoXX1gKTtcbiAgICAgIHNldHVwSHR0cFByb3h5KHByb3h5UGF0aCwgaHR0cFByb3h5U2V0W3Byb3h5UGF0aF0pO1xuICAgIH1cbiAgfVxuXG4gIC8vIGNvbnN0IHpzcyA9IGNyZWF0ZVppcFJvdXRlKG1heEFnZU1hcCk7XG5cbiAgLy8gYXBpLnVzZSgnLycsIHpzcy5oYW5kbGVyKTtcbiAgY29uc3Qgc3RhdGljSGFuZGxlciA9IGNyZWF0ZVN0YXRpY1JvdXRlKHN0YXRpY0ZvbGRlciwgbWF4QWdlTWFwKTtcbiAgYXBpLnVzZSgnLycsIHN0YXRpY0hhbmRsZXIpO1xuICAvLyBhcGkudXNlKCcvJywgY3JlYXRlU3RhdGljUm91dGUoYXBpLmNvbmZpZy5yZXNvbHZlKCdkbGxEZXN0RGlyJyksIG1heEFnZU1hcCkpO1xuXG4gIGlmIChhcGkuY29uZmlnLmdldChbYXBpLnBhY2thZ2VOYW1lLCAnc2VydmVJbmRleCddKSkge1xuICAgIGNvbnN0IHN0eWxlc2hlZXQgPSBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vc2VydmUtaW5kZXguY3NzJyk7XG4gICAgcHJvY2Vzcy50aXRsZSA9ICdGaWxlIHNlcnZlciBvbiAnICsgc3RhdGljRm9sZGVyO1xuICAgIGFwaS51c2UoJy8nLCBzZXJ2ZUluZGV4KHN0YXRpY0ZvbGRlciwge2ljb25zOiB0cnVlLCBzdHlsZXNoZWV0fSkpO1xuICB9IGVsc2Uge1xuICAgIGxvZy5pbmZvKGNoYWxrLmJsdWVCcmlnaHQoYElmIHlvdSB3YW50IHRvIHNlcnZlIGRpcmVjdG9yeSBpbmRleCBwYWdlIGZvciByZXNvdXJjZSBkaXJlY3Rvcnkgb3RoZXIgdGhhbiAke3N0YXRpY0ZvbGRlcn1cXG5gICtcbiAgICAgIGAgc3RhcnQgY29tbWFuZCB3aXRoIFwiLS1wcm9wICR7YXBpLnBhY2thZ2VOYW1lfS5zZXJ2ZUluZGV4PXRydWUgLS1wcm9wIHN0YXRpY0Rpcj08cmVzb3VyY2UgZGlyZWN0b3J5PmApKTtcbiAgfVxuICBhcGkuZXhwcmVzc0FwcFNldChhcHAgPT4gYWN0aXZhdGVDZChhcHAsIGltYXApKTtcbiAgZmFsbGJhY2tJbmRleEh0bWwoKTtcbiAgYXBpLnVzZSgnLycsIHN0YXRpY0hhbmRsZXIpOyAvLyBTZXJ2ZSBmYWxsYmFja2VkIHJlcXVlc3QgdG8gaW5kZXguaHRtbFxuXG4gIGNvbnN0IG1haWxTZXR0aW5nID0gKGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSkgYXMgV2l0aE1haWxTZXJ2ZXJDb25maWcpLmZldGNoTWFpbFNlcnZlcjtcbiAgY29uc3QgaW1hcCA9IG5ldyBJbWFwTWFuYWdlcihtYWlsU2V0dGluZyA/IG1haWxTZXR0aW5nLmVudiA6ICdsb2NhbCcpO1xuXG4gIGFwaS5ldmVudEJ1cy5vbignYXBwQ3JlYXRlZCcsICgpID0+IHtcbiAgICAvLyBhcHBDcmVhdGVkIGV2ZW50IGlzIGVtaXR0ZWQgYnkgZXhwcmVzcy1hcHBcbiAgICB2b2lkIGZldGNoUmVtb3RlLnN0YXJ0KGltYXApO1xuICB9KTtcblxuICBpZiAoIWFwaS5jb25maWcoKS5kZXZNb2RlKSB7XG4gICAgcmV0dXJuO1xuICB9XG59XG5cblxuZnVuY3Rpb24gZmluZEZhdmljb24oKSB7XG4gIHJldHVybiBfZmluZEZhdmljb25JbkNvbmZpZygncGFja2FnZUNvbnRleHRQYXRoTWFwcGluZycpIHx8IF9maW5kRmF2aWNvbkluQ29uZmlnKCdvdXRwdXRQYXRoTWFwJyk7XG59XG5cbmZ1bmN0aW9uIF9maW5kRmF2aWNvbkluQ29uZmlnKHByb3BlcnR5OiBrZXlvZiBEcmNwU2V0dGluZ3MpIHtcbiAgaWYgKCFjb25maWcoKVtwcm9wZXJ0eV0pIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBsZXQgZmF2aWNvbkZpbGU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgbGV0IGZhdmljb25QYWNrYWdlOiBzdHJpbmc7XG4gIF8uZWFjaChjb25maWcoKVtwcm9wZXJ0eV0gYXMgYW55LCAocGF0aCwgcGtOYW1lKSA9PiB7XG4gICAgaWYgKHBhdGggPT09ICcvJykge1xuICAgICAgY29uc3QgcGtnID0gWy4uLmZpbmRQYWNrYWdlc0J5TmFtZXMoW3BrTmFtZV0pXVswXTtcbiAgICAgIGlmIChwa2cpIHtcbiAgICAgICAgY29uc3QgYXNzZXRzRm9sZGVyID0gcGtnLmpzb24ucGxpbms/LmFzc2V0c0RpciB8fCBwa2cuanNvbi5kcj8uYXNzZXRzRGlyIHx8ICdhc3NldHMnO1xuICAgICAgICB2YXIgZmF2aWNvbiA9IFBhdGguam9pbihwa2cucmVhbFBhdGgsIGFzc2V0c0ZvbGRlciwgJ2Zhdmljb24uaWNvJyk7XG4gICAgICAgIGlmIChmcy5leGlzdHNTeW5jKGZhdmljb24pKSB7XG4gICAgICAgICAgaWYgKGZhdmljb25GaWxlKSB7XG4gICAgICAgICAgICBsb2cud2FybignRm91bmQgZHVwbGljYXRlIGZhdmljb24gZmlsZSBpbicsIHBrZy5uYW1lLCAnZXhpc3RpbmcnLCBmYXZpY29uUGFja2FnZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGZhdmljb25GaWxlID0gUGF0aC5yZXNvbHZlKGZhdmljb24pO1xuICAgICAgICAgIGZhdmljb25QYWNrYWdlID0gcGtnLm5hbWU7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgIH1cbiAgfSk7XG4gIHJldHVybiBmYXZpY29uRmlsZTtcbn1cblxuIl19