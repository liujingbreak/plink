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
const packageUtils = __importStar(require("@wfh/plink/wfh/dist/package-utils"));
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
const log = require('log4js').getLogger(__api_1.default.packageName);
const serverFavicon = require('serve-favicon');
const config = __api_1.default.config;
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
            ` start command with "-c none --prop ${__api_1.default.packageName}.serveIndex=true --prop staticDir=<resource directory>`));
    }
    __api_1.default.expressAppSet(app => cd_server_1.activate(app, imap));
    index_html_route_1.fallbackIndexHtml();
    __api_1.default.use('/', staticHandler); // Serve fallbacked request to index.html
    const mailSetting = __api_1.default.config.get(__api_1.default.packageName).fetchMailServer;
    const imap = new fetch_remote_imap_1.ImapManager(mailSetting ? mailSetting.env : 'local');
    __api_1.default.eventBus.on('appCreated', () => {
        // appCreated event is emitted by express-app
        fetchRemote.start(imap);
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
    if (!__api_1.default.config()[property]) {
        return null;
    }
    let faviconFile;
    let faviconPackage;
    lodash_1.default.each(config()[property], (path, pkName) => {
        if (path === '/') {
            packageUtils.lookForPackages(pkName, (fullName, entryPath, parsedName, json, packagePath) => {
                var assetsFolder = json.dr ? (json.dr.assetsDir ? json.dr.assetsDir : 'assets') : 'assets';
                var favicon = path_1.default.join(packagePath, assetsFolder, 'favicon.ico');
                if (fs_extra_1.default.existsSync(favicon)) {
                    if (faviconFile) {
                        log.warn('Found duplicate favicon file in', fullName, 'existing', faviconPackage);
                    }
                    faviconFile = path_1.default.resolve(favicon);
                    faviconPackage = fullName;
                }
            });
        }
    });
    return faviconFile;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsa0RBQTBCO0FBQzFCLGdGQUFrRTtBQUNsRSx3REFBMEI7QUFDMUIsb0RBQXVCO0FBQ3ZCLGdEQUF3QjtBQUN4Qiw4REFBcUM7QUFDckMsa0RBQXdCO0FBQ3hCLDREQUFzRTtBQUN0RSw0REFBOEM7QUFDOUMsMkRBQWtEO0FBRWxELHlEQUF5RTtBQUN6RSwyREFBd0Q7QUFDeEQsbUNBQXlDO0FBQ3pDLCtFQUE0RDtBQUM1RCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUN6RCxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7QUFFL0MsTUFBTSxNQUFNLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQztBQUcxQixTQUFnQixVQUFVO0lBQ3hCLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUNyQixDQUFDO0FBRkQsZ0NBRUM7QUFDRCxTQUFnQixRQUFRO0lBQ3RCLElBQUksWUFBWSxHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ25ELEdBQUcsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEdBQUcsWUFBWSxDQUFDLENBQUM7SUFHbEQsSUFBSSxPQUFPLEdBQUcsV0FBVyxFQUFFLENBQUM7SUFDNUIsSUFBSSxPQUFPO1FBQ1QsZUFBRyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUVsQyxJQUFJLFNBQVMsR0FBRyxxQ0FBVSxFQUFFLENBQUMsa0JBQWtCLENBQUM7SUFDaEQsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDckMsR0FBRyxDQUFDLElBQUks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USxDQUFRLEVBQUUsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDakQsSUFBSSxJQUFJLEtBQUssR0FBRyxFQUFFO1lBQ2hCLFlBQVksQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBZ0IsRUFBRSxTQUFpQixFQUFFLFVBQWMsRUFBRSxJQUFTLEVBQUUsV0FBbUIsRUFBRSxFQUFFO2dCQUMzSCxJQUFJLFlBQVksR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztnQkFDM0YsSUFBSSxPQUFPLEdBQUcsY0FBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsWUFBWSxFQUFFLGFBQWEsQ0FBQyxDQUFDO2dCQUNsRSxJQUFJLGtCQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxFQUFFO29CQUMxQixJQUFJLFdBQVcsRUFBRTt3QkFDZixHQUFHLENBQUMsSUFBSSxDQUFDLGlDQUFpQyxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsY0FBYyxDQUFDLENBQUM7cUJBQ25GO29CQUNELFdBQVcsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUNwQyxjQUFjLEdBQUcsUUFBUSxDQUFDO2lCQUMzQjtZQUNILENBQUMsQ0FBQyxDQUFDO1NBQ0o7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUNILE9BQU8sV0FBVyxDQUFDO0FBQ3JCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0ICogYXMgcGFja2FnZVV0aWxzIGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcGFja2FnZS11dGlscyc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHNlcnZlSW5kZXggZnJvbSAnc2VydmUtaW5kZXgnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgeyBhY3RpdmF0ZSBhcyBhY3RpdmF0ZUNkIH0gZnJvbSAnLi9jb250ZW50LWRlcGxveWVyL2NkLXNlcnZlcic7XG5pbXBvcnQgKiBhcyBmZXRjaFJlbW90ZSBmcm9tICcuL2ZldGNoLXJlbW90ZSc7XG5pbXBvcnQgeyBJbWFwTWFuYWdlciB9IGZyb20gJy4vZmV0Y2gtcmVtb3RlLWltYXAnO1xuaW1wb3J0IHsgV2l0aE1haWxTZXJ2ZXJDb25maWcgfSBmcm9tICcuL2ZldGNoLXR5cGVzJztcbmltcG9ydCB7IGZhbGxiYWNrSW5kZXhIdG1sLCBwcm94eVRvRGV2U2VydmVyIH0gZnJvbSAnLi9pbmRleC1odG1sLXJvdXRlJztcbmltcG9ydCB7IGNyZWF0ZVN0YXRpY1JvdXRlIH0gZnJvbSAnLi9zdGF0aWMtbWlkZGxld2FyZSc7XG5pbXBvcnQgeyBzZXR1cEh0dHBQcm94eSB9IGZyb20gJy4vdXRpbHMnO1xuaW1wb3J0IHtnZXRTZXR0aW5nfSBmcm9tICcuLi9pc29tL2Fzc2V0cy1wcm9jZXNzZXItc2V0dGluZyc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lKTtcbmNvbnN0IHNlcnZlckZhdmljb24gPSByZXF1aXJlKCdzZXJ2ZS1mYXZpY29uJyk7XG5cbmNvbnN0IGNvbmZpZyA9IGFwaS5jb25maWc7XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGRlYWN0aXZhdGUoKSB7XG4gIGZldGNoUmVtb3RlLnN0b3AoKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBhY3RpdmF0ZSgpIHtcbiAgdmFyIHN0YXRpY0ZvbGRlciA9IGFwaS5jb25maWcucmVzb2x2ZSgnc3RhdGljRGlyJyk7XG4gIGxvZy5kZWJ1ZygnZXhwcmVzcyBzdGF0aWMgcGF0aDogJyArIHN0YXRpY0ZvbGRlcik7XG5cblxuICB2YXIgZmF2aWNvbiA9IGZpbmRGYXZpY29uKCk7XG4gIGlmIChmYXZpY29uKVxuICAgIGFwaS51c2Uoc2VydmVyRmF2aWNvbihmYXZpY29uKSk7XG5cbiAgdmFyIG1heEFnZU1hcCA9IGdldFNldHRpbmcoKS5jYWNoZUNvbnRyb2xNYXhBZ2U7XG4gIGxvZy5pbmZvKCdjYWNoZSBjb250cm9sJywgbWF4QWdlTWFwKTtcbiAgbG9nLmluZm8oJ1NlcnZlIHN0YXRpYyBkaXInLCBzdGF0aWNGb2xkZXIpO1xuXG4gIC8vIGFwaS51c2UoJy8nLCBjcmVhdGVSZXNwb25zZVRpbWVzdGFtcCk7XG4gIHByb3h5VG9EZXZTZXJ2ZXIoKTtcblxuICBjb25zdCBodHRwUHJveHlTZXQgPSBnZXRTZXR0aW5nKCkuaHR0cFByb3h5O1xuICBpZiAoaHR0cFByb3h5U2V0KSB7XG4gICAgZm9yIChjb25zdCBwcm94eVBhdGggb2YgT2JqZWN0LmtleXMoaHR0cFByb3h5U2V0KSkge1xuICAgICAgbG9nLmluZm8oYEVuYWJsZSBIVFRQIHByb3h5ICR7cHJveHlQYXRofSAtPiAke2h0dHBQcm94eVNldFtwcm94eVBhdGhdfWApO1xuICAgICAgc2V0dXBIdHRwUHJveHkocHJveHlQYXRoLCBodHRwUHJveHlTZXRbcHJveHlQYXRoXSk7XG4gICAgfVxuICB9XG5cbiAgLy8gY29uc3QgenNzID0gY3JlYXRlWmlwUm91dGUobWF4QWdlTWFwKTtcblxuICAvLyBhcGkudXNlKCcvJywgenNzLmhhbmRsZXIpO1xuICBjb25zdCBzdGF0aWNIYW5kbGVyID0gY3JlYXRlU3RhdGljUm91dGUoc3RhdGljRm9sZGVyLCBtYXhBZ2VNYXApO1xuICBhcGkudXNlKCcvJywgc3RhdGljSGFuZGxlcik7XG4gIC8vIGFwaS51c2UoJy8nLCBjcmVhdGVTdGF0aWNSb3V0ZShhcGkuY29uZmlnLnJlc29sdmUoJ2RsbERlc3REaXInKSwgbWF4QWdlTWFwKSk7XG5cbiAgaWYgKGFwaS5jb25maWcuZ2V0KFthcGkucGFja2FnZU5hbWUsICdzZXJ2ZUluZGV4J10pKSB7XG4gICAgY29uc3Qgc3R5bGVzaGVldCA9IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi9zZXJ2ZS1pbmRleC5jc3MnKTtcbiAgICBwcm9jZXNzLnRpdGxlID0gJ0ZpbGUgc2VydmVyIG9uICcgKyBzdGF0aWNGb2xkZXI7XG4gICAgYXBpLnVzZSgnLycsIHNlcnZlSW5kZXgoc3RhdGljRm9sZGVyLCB7aWNvbnM6IHRydWUsIHN0eWxlc2hlZXR9KSk7XG4gIH0gZWxzZSB7XG4gICAgbG9nLmluZm8oY2hhbGsuYmx1ZUJyaWdodChgSWYgeW91IHdhbnQgdG8gc2VydmUgZGlyZWN0b3J5IGluZGV4IHBhZ2UgZm9yIHJlc291cmNlIGRpcmVjdG9yeSBvdGhlciB0aGFuICR7c3RhdGljRm9sZGVyfVxcbmAgK1xuICAgICAgYCBzdGFydCBjb21tYW5kIHdpdGggXCItYyBub25lIC0tcHJvcCAke2FwaS5wYWNrYWdlTmFtZX0uc2VydmVJbmRleD10cnVlIC0tcHJvcCBzdGF0aWNEaXI9PHJlc291cmNlIGRpcmVjdG9yeT5gKSk7XG4gIH1cbiAgYXBpLmV4cHJlc3NBcHBTZXQoYXBwID0+IGFjdGl2YXRlQ2QoYXBwLCBpbWFwKSk7XG4gIGZhbGxiYWNrSW5kZXhIdG1sKCk7XG4gIGFwaS51c2UoJy8nLCBzdGF0aWNIYW5kbGVyKTsgLy8gU2VydmUgZmFsbGJhY2tlZCByZXF1ZXN0IHRvIGluZGV4Lmh0bWxcblxuICBjb25zdCBtYWlsU2V0dGluZyA9IChhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUpIGFzIFdpdGhNYWlsU2VydmVyQ29uZmlnKS5mZXRjaE1haWxTZXJ2ZXI7XG4gIGNvbnN0IGltYXAgPSBuZXcgSW1hcE1hbmFnZXIobWFpbFNldHRpbmcgPyBtYWlsU2V0dGluZy5lbnYgOiAnbG9jYWwnKTtcblxuICBhcGkuZXZlbnRCdXMub24oJ2FwcENyZWF0ZWQnLCAoKSA9PiB7XG4gICAgLy8gYXBwQ3JlYXRlZCBldmVudCBpcyBlbWl0dGVkIGJ5IGV4cHJlc3MtYXBwXG4gICAgZmV0Y2hSZW1vdGUuc3RhcnQoaW1hcCk7XG4gIH0pO1xuXG4gIGlmICghYXBpLmNvbmZpZygpLmRldk1vZGUpIHtcbiAgICByZXR1cm47XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBmaW5kRmF2aWNvbigpIHtcbiAgcmV0dXJuIF9maW5kRmF2aWNvbkluQ29uZmlnKCdwYWNrYWdlQ29udGV4dFBhdGhNYXBwaW5nJykgfHwgX2ZpbmRGYXZpY29uSW5Db25maWcoJ291dHB1dFBhdGhNYXAnKTtcbn1cblxuZnVuY3Rpb24gX2ZpbmRGYXZpY29uSW5Db25maWcocHJvcGVydHk6IHN0cmluZykge1xuICBpZiAoIWFwaS5jb25maWcoKVtwcm9wZXJ0eV0pIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBsZXQgZmF2aWNvbkZpbGU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgbGV0IGZhdmljb25QYWNrYWdlOiBzdHJpbmc7XG4gIF8uZWFjaChjb25maWcoKVtwcm9wZXJ0eV0gYXMgYW55LCAocGF0aCwgcGtOYW1lKSA9PiB7XG4gICAgaWYgKHBhdGggPT09ICcvJykge1xuICAgICAgcGFja2FnZVV0aWxzLmxvb2tGb3JQYWNrYWdlcyhwa05hbWUsIChmdWxsTmFtZTogc3RyaW5nLCBlbnRyeVBhdGg6IHN0cmluZywgcGFyc2VkTmFtZToge30sIGpzb246IGFueSwgcGFja2FnZVBhdGg6IHN0cmluZykgPT4ge1xuICAgICAgICB2YXIgYXNzZXRzRm9sZGVyID0ganNvbi5kciA/IChqc29uLmRyLmFzc2V0c0RpciA/IGpzb24uZHIuYXNzZXRzRGlyIDogJ2Fzc2V0cycpIDogJ2Fzc2V0cyc7XG4gICAgICAgIHZhciBmYXZpY29uID0gUGF0aC5qb2luKHBhY2thZ2VQYXRoLCBhc3NldHNGb2xkZXIsICdmYXZpY29uLmljbycpO1xuICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhmYXZpY29uKSkge1xuICAgICAgICAgIGlmIChmYXZpY29uRmlsZSkge1xuICAgICAgICAgICAgbG9nLndhcm4oJ0ZvdW5kIGR1cGxpY2F0ZSBmYXZpY29uIGZpbGUgaW4nLCBmdWxsTmFtZSwgJ2V4aXN0aW5nJywgZmF2aWNvblBhY2thZ2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBmYXZpY29uRmlsZSA9IFBhdGgucmVzb2x2ZShmYXZpY29uKTtcbiAgICAgICAgICBmYXZpY29uUGFja2FnZSA9IGZ1bGxOYW1lO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gZmF2aWNvbkZpbGU7XG59XG5cbiJdfQ==