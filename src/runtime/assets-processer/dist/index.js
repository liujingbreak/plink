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
const log = (0, plink_1.log4File)(__filename);
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
    var maxAgeMap = (0, assets_processer_setting_1.getSetting)().cacheControlMaxAge;
    log.info('cache control', maxAgeMap);
    log.info('Serve static dir', staticFolder);
    // api.use('/', createResponseTimestamp);
    (0, index_html_route_1.proxyToDevServer)();
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
    __api_1.default.use('/', staticHandler);
    // api.use('/', createStaticRoute(api.config.resolve('dllDestDir'), maxAgeMap));
    if (__api_1.default.config.get([__api_1.default.packageName, 'serveIndex'])) {
        const stylesheet = path_1.default.resolve(__dirname, '../serve-index.css');
        process.title = 'File server on ' + staticFolder;
        __api_1.default.use('/', (0, serve_index_1.default)(staticFolder, { icons: true, stylesheet }));
    }
    else {
        log.info(chalk_1.default.blueBright(`If you want to serve directory index page for resource directory other than ${staticFolder}\n` +
            ` start command with "--prop ${__api_1.default.packageName}.serveIndex=true --prop staticDir=<resource directory>`));
    }
    __api_1.default.expressAppSet(app => (0, cd_server_1.activate)(app, imap));
    (0, index_html_route_1.fallbackIndexHtml)();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsa0RBQTBCO0FBQzFCLHdEQUEwQjtBQUMxQixvREFBdUI7QUFDdkIsZ0RBQXdCO0FBQ3hCLDhEQUFxQztBQUNyQyxrREFBd0I7QUFDeEIsNERBQXNFO0FBQ3RFLDREQUE4QztBQUM5QywyREFBa0Q7QUFFbEQseURBQXlFO0FBQ3pFLDJEQUF3RDtBQUN4RCxtQ0FBeUM7QUFDekMsK0VBQTREO0FBQzVELHNDQUErRTtBQUMvRSxNQUFNLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEVBQUMsVUFBVSxDQUFDLENBQUM7QUFDakMsNERBQTREO0FBQzVELE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUUvQyxTQUFnQixVQUFVO0lBQ3hCLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQztBQUNyQixDQUFDO0FBRkQsZ0NBRUM7QUFDRCxTQUFnQixRQUFRO0lBQ3RCLElBQUksWUFBWSxHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ25ELEdBQUcsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEdBQUcsWUFBWSxDQUFDLENBQUM7SUFHbEQsSUFBSSxPQUFPLEdBQUcsV0FBVyxFQUFFLENBQUM7SUFDNUIsSUFBSSxPQUFPO1FBQ1QsZUFBRyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUVsQyxJQUFJLFNBQVMsR0FBRyxJQUFBLHFDQUFVLEdBQUUsQ0FBQyxrQkFBa0IsQ0FBQztJQUNoRCxHQUFHLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUNyQyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLFlBQVksQ0FBQyxDQUFDO0lBRTNDLHlDQUF5QztJQUN6QyxJ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Q0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEVBQUU7O1FBQ2pELElBQUksSUFBSSxLQUFLLEdBQUcsRUFBRTtZQUNoQixNQUFNLEdBQUcsR0FBRyxDQUFDLEdBQUcsSUFBQSwyQkFBbUIsRUFBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNsRCxJQUFJLEdBQUcsRUFBRTtnQkFDUCxNQUFNLFlBQVksR0FBRyxDQUFBLE1BQUEsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLDBDQUFFLFNBQVMsTUFBSSxNQUFBLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSwwQ0FBRSxTQUFTLENBQUEsSUFBSSxRQUFRLENBQUM7Z0JBQ3JGLElBQUksT0FBTyxHQUFHLGNBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxZQUFZLEVBQUUsYUFBYSxDQUFDLENBQUM7Z0JBQ25FLElBQUksa0JBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEVBQUU7b0JBQzFCLElBQUksV0FBVyxFQUFFO3dCQUNmLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUNBQWlDLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUUsY0FBYyxDQUFDLENBQUM7cUJBQ25GO29CQUNELFdBQVcsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUNwQyxjQUFjLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztpQkFDM0I7YUFDRjtTQUVGO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDSCxPQUFPLFdBQVcsQ0FBQztBQUNyQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgc2VydmVJbmRleCBmcm9tICdzZXJ2ZS1pbmRleCc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCB7IGFjdGl2YXRlIGFzIGFjdGl2YXRlQ2QgfSBmcm9tICcuL2NvbnRlbnQtZGVwbG95ZXIvY2Qtc2VydmVyJztcbmltcG9ydCAqIGFzIGZldGNoUmVtb3RlIGZyb20gJy4vZmV0Y2gtcmVtb3RlJztcbmltcG9ydCB7IEltYXBNYW5hZ2VyIH0gZnJvbSAnLi9mZXRjaC1yZW1vdGUtaW1hcCc7XG5pbXBvcnQgeyBXaXRoTWFpbFNlcnZlckNvbmZpZyB9IGZyb20gJy4vZmV0Y2gtdHlwZXMnO1xuaW1wb3J0IHsgZmFsbGJhY2tJbmRleEh0bWwsIHByb3h5VG9EZXZTZXJ2ZXIgfSBmcm9tICcuL2luZGV4LWh0bWwtcm91dGUnO1xuaW1wb3J0IHsgY3JlYXRlU3RhdGljUm91dGUgfSBmcm9tICcuL3N0YXRpYy1taWRkbGV3YXJlJztcbmltcG9ydCB7IHNldHVwSHR0cFByb3h5IH0gZnJvbSAnLi91dGlscyc7XG5pbXBvcnQge2dldFNldHRpbmd9IGZyb20gJy4uL2lzb20vYXNzZXRzLXByb2Nlc3Nlci1zZXR0aW5nJztcbmltcG9ydCB7bG9nNEZpbGUsIGNvbmZpZywgRHJjcFNldHRpbmdzLCBmaW5kUGFja2FnZXNCeU5hbWVzfSBmcm9tICdAd2ZoL3BsaW5rJztcbmNvbnN0IGxvZyA9IGxvZzRGaWxlKF9fZmlsZW5hbWUpO1xuLy8gY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSk7XG5jb25zdCBzZXJ2ZXJGYXZpY29uID0gcmVxdWlyZSgnc2VydmUtZmF2aWNvbicpO1xuXG5leHBvcnQgZnVuY3Rpb24gZGVhY3RpdmF0ZSgpIHtcbiAgZmV0Y2hSZW1vdGUuc3RvcCgpO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGFjdGl2YXRlKCkge1xuICB2YXIgc3RhdGljRm9sZGVyID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdzdGF0aWNEaXInKTtcbiAgbG9nLmRlYnVnKCdleHByZXNzIHN0YXRpYyBwYXRoOiAnICsgc3RhdGljRm9sZGVyKTtcblxuXG4gIHZhciBmYXZpY29uID0gZmluZEZhdmljb24oKTtcbiAgaWYgKGZhdmljb24pXG4gICAgYXBpLnVzZShzZXJ2ZXJGYXZpY29uKGZhdmljb24pKTtcblxuICB2YXIgbWF4QWdlTWFwID0gZ2V0U2V0dGluZygpLmNhY2hlQ29udHJvbE1heEFnZTtcbiAgbG9nLmluZm8oJ2NhY2hlIGNvbnRyb2wnLCBtYXhBZ2VNYXApO1xuICBsb2cuaW5mbygnU2VydmUgc3RhdGljIGRpcicsIHN0YXRpY0ZvbGRlcik7XG5cbiAgLy8gYXBpLnVzZSgnLycsIGNyZWF0ZVJlc3BvbnNlVGltZXN0YW1wKTtcbiAgcHJveHlUb0RldlNlcnZlcigpO1xuXG4gIGNvbnN0IGh0dHBQcm94eVNldCA9IGdldFNldHRpbmcoKS5odHRwUHJveHk7XG4gIGlmIChodHRwUHJveHlTZXQpIHtcbiAgICBmb3IgKGNvbnN0IHByb3h5UGF0aCBvZiBPYmplY3Qua2V5cyhodHRwUHJveHlTZXQpKSB7XG4gICAgICBsb2cuaW5mbyhgRW5hYmxlIEhUVFAgcHJveHkgJHtwcm94eVBhdGh9IC0+ICR7aHR0cFByb3h5U2V0W3Byb3h5UGF0aF19YCk7XG4gICAgICBzZXR1cEh0dHBQcm94eShwcm94eVBhdGgsIGh0dHBQcm94eVNldFtwcm94eVBhdGhdKTtcbiAgICB9XG4gIH1cblxuICAvLyBjb25zdCB6c3MgPSBjcmVhdGVaaXBSb3V0ZShtYXhBZ2VNYXApO1xuXG4gIC8vIGFwaS51c2UoJy8nLCB6c3MuaGFuZGxlcik7XG4gIGNvbnN0IHN0YXRpY0hhbmRsZXIgPSBjcmVhdGVTdGF0aWNSb3V0ZShzdGF0aWNGb2xkZXIsIG1heEFnZU1hcCk7XG4gIGFwaS51c2UoJy8nLCBzdGF0aWNIYW5kbGVyKTtcbiAgLy8gYXBpLnVzZSgnLycsIGNyZWF0ZVN0YXRpY1JvdXRlKGFwaS5jb25maWcucmVzb2x2ZSgnZGxsRGVzdERpcicpLCBtYXhBZ2VNYXApKTtcblxuICBpZiAoYXBpLmNvbmZpZy5nZXQoW2FwaS5wYWNrYWdlTmFtZSwgJ3NlcnZlSW5kZXgnXSkpIHtcbiAgICBjb25zdCBzdHlsZXNoZWV0ID0gUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uL3NlcnZlLWluZGV4LmNzcycpO1xuICAgIHByb2Nlc3MudGl0bGUgPSAnRmlsZSBzZXJ2ZXIgb24gJyArIHN0YXRpY0ZvbGRlcjtcbiAgICBhcGkudXNlKCcvJywgc2VydmVJbmRleChzdGF0aWNGb2xkZXIsIHtpY29uczogdHJ1ZSwgc3R5bGVzaGVldH0pKTtcbiAgfSBlbHNlIHtcbiAgICBsb2cuaW5mbyhjaGFsay5ibHVlQnJpZ2h0KGBJZiB5b3Ugd2FudCB0byBzZXJ2ZSBkaXJlY3RvcnkgaW5kZXggcGFnZSBmb3IgcmVzb3VyY2UgZGlyZWN0b3J5IG90aGVyIHRoYW4gJHtzdGF0aWNGb2xkZXJ9XFxuYCArXG4gICAgICBgIHN0YXJ0IGNvbW1hbmQgd2l0aCBcIi0tcHJvcCAke2FwaS5wYWNrYWdlTmFtZX0uc2VydmVJbmRleD10cnVlIC0tcHJvcCBzdGF0aWNEaXI9PHJlc291cmNlIGRpcmVjdG9yeT5gKSk7XG4gIH1cbiAgYXBpLmV4cHJlc3NBcHBTZXQoYXBwID0+IGFjdGl2YXRlQ2QoYXBwLCBpbWFwKSk7XG4gIGZhbGxiYWNrSW5kZXhIdG1sKCk7XG4gIGFwaS51c2UoJy8nLCBzdGF0aWNIYW5kbGVyKTsgLy8gU2VydmUgZmFsbGJhY2tlZCByZXF1ZXN0IHRvIGluZGV4Lmh0bWxcblxuICBjb25zdCBtYWlsU2V0dGluZyA9IChhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUpIGFzIFdpdGhNYWlsU2VydmVyQ29uZmlnKS5mZXRjaE1haWxTZXJ2ZXI7XG4gIGNvbnN0IGltYXAgPSBuZXcgSW1hcE1hbmFnZXIobWFpbFNldHRpbmcgPyBtYWlsU2V0dGluZy5lbnYgOiAnbG9jYWwnKTtcblxuICBhcGkuZXZlbnRCdXMub24oJ2FwcENyZWF0ZWQnLCAoKSA9PiB7XG4gICAgLy8gYXBwQ3JlYXRlZCBldmVudCBpcyBlbWl0dGVkIGJ5IGV4cHJlc3MtYXBwXG4gICAgdm9pZCBmZXRjaFJlbW90ZS5zdGFydChpbWFwKTtcbiAgfSk7XG5cbiAgaWYgKCFhcGkuY29uZmlnKCkuZGV2TW9kZSkge1xuICAgIHJldHVybjtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIGZpbmRGYXZpY29uKCkge1xuICByZXR1cm4gX2ZpbmRGYXZpY29uSW5Db25maWcoJ3BhY2thZ2VDb250ZXh0UGF0aE1hcHBpbmcnKSB8fCBfZmluZEZhdmljb25JbkNvbmZpZygnb3V0cHV0UGF0aE1hcCcpO1xufVxuXG5mdW5jdGlvbiBfZmluZEZhdmljb25JbkNvbmZpZyhwcm9wZXJ0eToga2V5b2YgRHJjcFNldHRpbmdzKSB7XG4gIGlmICghY29uZmlnKClbcHJvcGVydHldKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgbGV0IGZhdmljb25GaWxlOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGxldCBmYXZpY29uUGFja2FnZTogc3RyaW5nO1xuICBfLmVhY2goY29uZmlnKClbcHJvcGVydHldIGFzIGFueSwgKHBhdGgsIHBrTmFtZSkgPT4ge1xuICAgIGlmIChwYXRoID09PSAnLycpIHtcbiAgICAgIGNvbnN0IHBrZyA9IFsuLi5maW5kUGFja2FnZXNCeU5hbWVzKFtwa05hbWVdKV1bMF07XG4gICAgICBpZiAocGtnKSB7XG4gICAgICAgIGNvbnN0IGFzc2V0c0ZvbGRlciA9IHBrZy5qc29uLnBsaW5rPy5hc3NldHNEaXIgfHwgcGtnLmpzb24uZHI/LmFzc2V0c0RpciB8fCAnYXNzZXRzJztcbiAgICAgICAgdmFyIGZhdmljb24gPSBQYXRoLmpvaW4ocGtnLnJlYWxQYXRoLCBhc3NldHNGb2xkZXIsICdmYXZpY29uLmljbycpO1xuICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhmYXZpY29uKSkge1xuICAgICAgICAgIGlmIChmYXZpY29uRmlsZSkge1xuICAgICAgICAgICAgbG9nLndhcm4oJ0ZvdW5kIGR1cGxpY2F0ZSBmYXZpY29uIGZpbGUgaW4nLCBwa2cubmFtZSwgJ2V4aXN0aW5nJywgZmF2aWNvblBhY2thZ2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBmYXZpY29uRmlsZSA9IFBhdGgucmVzb2x2ZShmYXZpY29uKTtcbiAgICAgICAgICBmYXZpY29uUGFja2FnZSA9IHBrZy5uYW1lO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICB9XG4gIH0pO1xuICByZXR1cm4gZmF2aWNvbkZpbGU7XG59XG5cbiJdfQ==