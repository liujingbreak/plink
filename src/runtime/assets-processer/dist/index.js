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
// const buildUtils = api.buildUtils;
const config = __api_1.default.config;
// export function compile() {
//   const argv = api.argv;
//   if (config().devMode && !argv.copyAssets) {
//     log.info('DevMode enabled, skip copying assets to static folder');
//     return;
//   }
//   if (!api.isDefaultLocale() && !argv.copyAssets) {
//     log.info('Build for "%s" which is not default locale, skip copying assets to static folder',
//       api.getBuildLocale());
//     return;
//   }
//   copyRootPackageFavicon();
//   // const {zipStatic} = require('./dist/zip');
//   return copyAssets();
//   // .then(zipStatic);
// }
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
            utils_1.httpProxy(proxyPath, httpProxySet[proxyPath]);
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
    // setupDevAssets(api.config().staticAssetsURL, api.use.bind(api));
}
exports.activate = activate;
// function copyRootPackageFavicon() {
//   var favicon = findFavicon();
//   if (!favicon)
//     return;
//   log.info('Copy favicon.ico from ' + favicon);
//   fs.mkdirpSync(config.resolve('staticDir'));
//   fs.copySync(Path.resolve(favicon), Path.resolve(config().rootPath, config.resolve('staticDir')));
// }
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
// function copyAssets() {
//   var streams: any[] = [];
//   packageUtils.findAllPackages((name: string, _entryPath: string, parsedName: {name: string}, json: any, packagePath: string) => {
//     var assetsFolder = json.dr ? (json.dr.assetsDir ? json.dr.assetsDir : 'assets') : 'assets';
//     var assetsDir = Path.join(packagePath, assetsFolder);
//     if (fs.existsSync(assetsDir)) {
//       var assetsDirMap = api.config.get('outputPathMap.' + name);
//       if (assetsDirMap != null)
//         assetsDirMap = _.trim(assetsDirMap, '/');
//       var src = [Path.join(packagePath, assetsFolder, '**', '*')];
//       var stream = gulp.src(src, {base: Path.join(packagePath, assetsFolder)})
//       .pipe(through.obj(function(file, enc, next) {
//         var pathInPk = Path.relative(assetsDir, file.path);
//         file.path = Path.join(assetsDir, assetsDirMap != null ? assetsDirMap : parsedName.name, pathInPk);
//         log.debug(file.path);
//         next(null, file);
//       }));
//       streams.push(stream);
//     }
//   });
//   if (streams.length === 0) {
//     return null;
//   }
//   // var contextPath = _.get(api, 'ngEntryComponent.shortName', '');
//   var outputDir = api.webpackConfig.output.path;
//   log.info('Output assets to ', outputDir);
//   return new Promise((resolve, reject) => {
//     es.merge(streams)
//     .pipe(gulp.dest(outputDir))
//     .on('end', function() {
//       log.debug('flush');
//       buildUtils.writeTimestamp('assets');
//       resolve();
//     })
//     .on('error', reject);
//   });
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsa0RBQTBCO0FBQzFCLGdGQUFrRTtBQUNsRSx3REFBMEI7QUFDMUIsb0RBQXVCO0FBQ3ZCLGdEQUF3QjtBQUN4Qiw4REFBcUM7QUFDckMsa0RBQXdCO0FBQ3hCLDREQUFzRTtBQUN0RSw0REFBOEM7QUFDOUMsMkRBQWtEO0FBRWxELHlEQUF5RTtBQUN6RSwyREFBd0Q7QUFDeEQsbUNBQW9DO0FBQ3BDLCtFQUE0RDtBQUM1RCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUN6RCxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7QUFFL0MscUNBQXFDO0FBRXJDLE1BQU0sTUFBTSxHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUM7QUFFMUIsOEJBQThCO0FBQzlCLDJCQUEyQjtBQUMzQixnREFBZ0Q7QUFDaEQseUVBQXlFO0FBQ3pFLGNBQWM7QUFDZCxNQUFNO0FBQ04sc0RBQXNEO0FBQ3RELG1HQUFtRztBQUNuRywrQkFBK0I7QUFDL0IsY0FBYztBQUNkLE1BQU07QUFFTiw4QkFBOEI7QUFDOUIsa0RBQWtEO0FBQ2xELHlCQUF5QjtBQUN6Qix5QkFBeUI7QUFDekIsSUFBSTtBQUVKLFNBQWdCLFVBQVU7SUFDeEIsV0FBVyxDQUFDLElBQUksRUFBRSxDQUFDO0FBQ3JCLENBQUM7QUFGRCxnQ0FFQztBQUNELFNBQWdCLFFBQVE7SUFDdEIsSUFBSSxZQUFZLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDbkQsR0FBRyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsR0FBRyxZQUFZLENBQUMsQ0FBQztJQUdsRCxJQUFJLE9BQU8sR0FBRyxX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QUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7b0JBQ3BDLGNBQWMsR0FBRyxRQUFRLENBQUM7aUJBQzNCO1lBQ0gsQ0FBQyxDQUFDLENBQUM7U0FDSjtJQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0gsT0FBTyxXQUFXLENBQUM7QUFDckIsQ0FBQztBQUVELDBCQUEwQjtBQUMxQiw2QkFBNkI7QUFDN0IscUlBQXFJO0FBQ3JJLGtHQUFrRztBQUNsRyw0REFBNEQ7QUFDNUQsc0NBQXNDO0FBQ3RDLG9FQUFvRTtBQUNwRSxrQ0FBa0M7QUFDbEMsb0RBQW9EO0FBQ3BELHFFQUFxRTtBQUNyRSxpRkFBaUY7QUFDakYsc0RBQXNEO0FBQ3RELDhEQUE4RDtBQUM5RCw2R0FBNkc7QUFDN0csZ0NBQWdDO0FBQ2hDLDRCQUE0QjtBQUM1QixhQUFhO0FBQ2IsOEJBQThCO0FBQzlCLFFBQVE7QUFDUixRQUFRO0FBQ1IsZ0NBQWdDO0FBQ2hDLG1CQUFtQjtBQUNuQixNQUFNO0FBQ04sdUVBQXVFO0FBQ3ZFLG1EQUFtRDtBQUNuRCw4Q0FBOEM7QUFDOUMsOENBQThDO0FBQzlDLHdCQUF3QjtBQUN4QixrQ0FBa0M7QUFDbEMsOEJBQThCO0FBQzlCLDRCQUE0QjtBQUM1Qiw2Q0FBNkM7QUFDN0MsbUJBQW1CO0FBQ25CLFNBQVM7QUFDVCw0QkFBNEI7QUFDNUIsUUFBUTtBQUNSLElBQUkiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0ICogYXMgcGFja2FnZVV0aWxzIGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvcGFja2FnZS11dGlscyc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHNlcnZlSW5kZXggZnJvbSAnc2VydmUtaW5kZXgnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgeyBhY3RpdmF0ZSBhcyBhY3RpdmF0ZUNkIH0gZnJvbSAnLi9jb250ZW50LWRlcGxveWVyL2NkLXNlcnZlcic7XG5pbXBvcnQgKiBhcyBmZXRjaFJlbW90ZSBmcm9tICcuL2ZldGNoLXJlbW90ZSc7XG5pbXBvcnQgeyBJbWFwTWFuYWdlciB9IGZyb20gJy4vZmV0Y2gtcmVtb3RlLWltYXAnO1xuaW1wb3J0IHsgV2l0aE1haWxTZXJ2ZXJDb25maWcgfSBmcm9tICcuL2ZldGNoLXR5cGVzJztcbmltcG9ydCB7IGZhbGxiYWNrSW5kZXhIdG1sLCBwcm94eVRvRGV2U2VydmVyIH0gZnJvbSAnLi9pbmRleC1odG1sLXJvdXRlJztcbmltcG9ydCB7IGNyZWF0ZVN0YXRpY1JvdXRlIH0gZnJvbSAnLi9zdGF0aWMtbWlkZGxld2FyZSc7XG5pbXBvcnQgeyBodHRwUHJveHkgfSBmcm9tICcuL3V0aWxzJztcbmltcG9ydCB7Z2V0U2V0dGluZ30gZnJvbSAnLi4vaXNvbS9hc3NldHMtcHJvY2Vzc2VyLXNldHRpbmcnO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSk7XG5jb25zdCBzZXJ2ZXJGYXZpY29uID0gcmVxdWlyZSgnc2VydmUtZmF2aWNvbicpO1xuXG4vLyBjb25zdCBidWlsZFV0aWxzID0gYXBpLmJ1aWxkVXRpbHM7XG5cbmNvbnN0IGNvbmZpZyA9IGFwaS5jb25maWc7XG5cbi8vIGV4cG9ydCBmdW5jdGlvbiBjb21waWxlKCkge1xuLy8gICBjb25zdCBhcmd2ID0gYXBpLmFyZ3Y7XG4vLyAgIGlmIChjb25maWcoKS5kZXZNb2RlICYmICFhcmd2LmNvcHlBc3NldHMpIHtcbi8vICAgICBsb2cuaW5mbygnRGV2TW9kZSBlbmFibGVkLCBza2lwIGNvcHlpbmcgYXNzZXRzIHRvIHN0YXRpYyBmb2xkZXInKTtcbi8vICAgICByZXR1cm47XG4vLyAgIH1cbi8vICAgaWYgKCFhcGkuaXNEZWZhdWx0TG9jYWxlKCkgJiYgIWFyZ3YuY29weUFzc2V0cykge1xuLy8gICAgIGxvZy5pbmZvKCdCdWlsZCBmb3IgXCIlc1wiIHdoaWNoIGlzIG5vdCBkZWZhdWx0IGxvY2FsZSwgc2tpcCBjb3B5aW5nIGFzc2V0cyB0byBzdGF0aWMgZm9sZGVyJyxcbi8vICAgICAgIGFwaS5nZXRCdWlsZExvY2FsZSgpKTtcbi8vICAgICByZXR1cm47XG4vLyAgIH1cblxuLy8gICBjb3B5Um9vdFBhY2thZ2VGYXZpY29uKCk7XG4vLyAgIC8vIGNvbnN0IHt6aXBTdGF0aWN9ID0gcmVxdWlyZSgnLi9kaXN0L3ppcCcpO1xuLy8gICByZXR1cm4gY29weUFzc2V0cygpO1xuLy8gICAvLyAudGhlbih6aXBTdGF0aWMpO1xuLy8gfVxuXG5leHBvcnQgZnVuY3Rpb24gZGVhY3RpdmF0ZSgpIHtcbiAgZmV0Y2hSZW1vdGUuc3RvcCgpO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGFjdGl2YXRlKCkge1xuICB2YXIgc3RhdGljRm9sZGVyID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdzdGF0aWNEaXInKTtcbiAgbG9nLmRlYnVnKCdleHByZXNzIHN0YXRpYyBwYXRoOiAnICsgc3RhdGljRm9sZGVyKTtcblxuXG4gIHZhciBmYXZpY29uID0gZmluZEZhdmljb24oKTtcbiAgaWYgKGZhdmljb24pXG4gICAgYXBpLnVzZShzZXJ2ZXJGYXZpY29uKGZhdmljb24pKTtcblxuICB2YXIgbWF4QWdlTWFwID0gZ2V0U2V0dGluZygpLmNhY2hlQ29udHJvbE1heEFnZTtcbiAgbG9nLmluZm8oJ2NhY2hlIGNvbnRyb2wnLCBtYXhBZ2VNYXApO1xuICBsb2cuaW5mbygnU2VydmUgc3RhdGljIGRpcicsIHN0YXRpY0ZvbGRlcik7XG5cbiAgLy8gYXBpLnVzZSgnLycsIGNyZWF0ZVJlc3BvbnNlVGltZXN0YW1wKTtcbiAgcHJveHlUb0RldlNlcnZlcigpO1xuXG4gIGNvbnN0IGh0dHBQcm94eVNldCA9IGdldFNldHRpbmcoKS5odHRwUHJveHk7XG4gIGlmIChodHRwUHJveHlTZXQpIHtcbiAgICBmb3IgKGNvbnN0IHByb3h5UGF0aCBvZiBPYmplY3Qua2V5cyhodHRwUHJveHlTZXQpKSB7XG4gICAgICBsb2cuaW5mbyhgRW5hYmxlIEhUVFAgcHJveHkgJHtwcm94eVBhdGh9IC0+ICR7aHR0cFByb3h5U2V0W3Byb3h5UGF0aF19YCk7XG4gICAgICBodHRwUHJveHkocHJveHlQYXRoLCBodHRwUHJveHlTZXRbcHJveHlQYXRoXSk7XG4gICAgfVxuICB9XG5cbiAgLy8gY29uc3QgenNzID0gY3JlYXRlWmlwUm91dGUobWF4QWdlTWFwKTtcblxuICAvLyBhcGkudXNlKCcvJywgenNzLmhhbmRsZXIpO1xuICBjb25zdCBzdGF0aWNIYW5kbGVyID0gY3JlYXRlU3RhdGljUm91dGUoc3RhdGljRm9sZGVyLCBtYXhBZ2VNYXApO1xuICBhcGkudXNlKCcvJywgc3RhdGljSGFuZGxlcik7XG4gIC8vIGFwaS51c2UoJy8nLCBjcmVhdGVTdGF0aWNSb3V0ZShhcGkuY29uZmlnLnJlc29sdmUoJ2RsbERlc3REaXInKSwgbWF4QWdlTWFwKSk7XG5cbiAgaWYgKGFwaS5jb25maWcuZ2V0KFthcGkucGFja2FnZU5hbWUsICdzZXJ2ZUluZGV4J10pKSB7XG4gICAgY29uc3Qgc3R5bGVzaGVldCA9IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi9zZXJ2ZS1pbmRleC5jc3MnKTtcbiAgICBwcm9jZXNzLnRpdGxlID0gJ0ZpbGUgc2VydmVyIG9uICcgKyBzdGF0aWNGb2xkZXI7XG4gICAgYXBpLnVzZSgnLycsIHNlcnZlSW5kZXgoc3RhdGljRm9sZGVyLCB7aWNvbnM6IHRydWUsIHN0eWxlc2hlZXR9KSk7XG4gIH0gZWxzZSB7XG4gICAgbG9nLmluZm8oY2hhbGsuYmx1ZUJyaWdodChgSWYgeW91IHdhbnQgdG8gc2VydmUgZGlyZWN0b3J5IGluZGV4IHBhZ2UgZm9yIHJlc291cmNlIGRpcmVjdG9yeSBvdGhlciB0aGFuICR7c3RhdGljRm9sZGVyfVxcbmAgK1xuICAgICAgYCBzdGFydCBjb21tYW5kIHdpdGggXCItYyBub25lIC0tcHJvcCAke2FwaS5wYWNrYWdlTmFtZX0uc2VydmVJbmRleD10cnVlIC0tcHJvcCBzdGF0aWNEaXI9PHJlc291cmNlIGRpcmVjdG9yeT5gKSk7XG4gIH1cbiAgYXBpLmV4cHJlc3NBcHBTZXQoYXBwID0+IGFjdGl2YXRlQ2QoYXBwLCBpbWFwKSk7XG4gIGZhbGxiYWNrSW5kZXhIdG1sKCk7XG4gIGFwaS51c2UoJy8nLCBzdGF0aWNIYW5kbGVyKTsgLy8gU2VydmUgZmFsbGJhY2tlZCByZXF1ZXN0IHRvIGluZGV4Lmh0bWxcblxuICBjb25zdCBtYWlsU2V0dGluZyA9IChhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUpIGFzIFdpdGhNYWlsU2VydmVyQ29uZmlnKS5mZXRjaE1haWxTZXJ2ZXI7XG4gIGNvbnN0IGltYXAgPSBuZXcgSW1hcE1hbmFnZXIobWFpbFNldHRpbmcgPyBtYWlsU2V0dGluZy5lbnYgOiAnbG9jYWwnKTtcblxuICBhcGkuZXZlbnRCdXMub24oJ2FwcENyZWF0ZWQnLCAoKSA9PiB7XG4gICAgLy8gYXBwQ3JlYXRlZCBldmVudCBpcyBlbWl0dGVkIGJ5IGV4cHJlc3MtYXBwXG4gICAgZmV0Y2hSZW1vdGUuc3RhcnQoaW1hcCk7XG4gIH0pO1xuXG4gIGlmICghYXBpLmNvbmZpZygpLmRldk1vZGUpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBzZXR1cERldkFzc2V0cyhhcGkuY29uZmlnKCkuc3RhdGljQXNzZXRzVVJMLCBhcGkudXNlLmJpbmQoYXBpKSk7XG59XG5cbi8vIGZ1bmN0aW9uIGNvcHlSb290UGFja2FnZUZhdmljb24oKSB7XG4vLyAgIHZhciBmYXZpY29uID0gZmluZEZhdmljb24oKTtcbi8vICAgaWYgKCFmYXZpY29uKVxuLy8gICAgIHJldHVybjtcbi8vICAgbG9nLmluZm8oJ0NvcHkgZmF2aWNvbi5pY28gZnJvbSAnICsgZmF2aWNvbik7XG4vLyAgIGZzLm1rZGlycFN5bmMoY29uZmlnLnJlc29sdmUoJ3N0YXRpY0RpcicpKTtcbi8vICAgZnMuY29weVN5bmMoUGF0aC5yZXNvbHZlKGZhdmljb24pLCBQYXRoLnJlc29sdmUoY29uZmlnKCkucm9vdFBhdGgsIGNvbmZpZy5yZXNvbHZlKCdzdGF0aWNEaXInKSkpO1xuLy8gfVxuXG5mdW5jdGlvbiBmaW5kRmF2aWNvbigpIHtcbiAgcmV0dXJuIF9maW5kRmF2aWNvbkluQ29uZmlnKCdwYWNrYWdlQ29udGV4dFBhdGhNYXBwaW5nJykgfHwgX2ZpbmRGYXZpY29uSW5Db25maWcoJ291dHB1dFBhdGhNYXAnKTtcbn1cblxuZnVuY3Rpb24gX2ZpbmRGYXZpY29uSW5Db25maWcocHJvcGVydHk6IHN0cmluZykge1xuICBpZiAoIWFwaS5jb25maWcoKVtwcm9wZXJ0eV0pIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBsZXQgZmF2aWNvbkZpbGU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgbGV0IGZhdmljb25QYWNrYWdlOiBzdHJpbmc7XG4gIF8uZWFjaChjb25maWcoKVtwcm9wZXJ0eV0gYXMgYW55LCAocGF0aCwgcGtOYW1lKSA9PiB7XG4gICAgaWYgKHBhdGggPT09ICcvJykge1xuICAgICAgcGFja2FnZVV0aWxzLmxvb2tGb3JQYWNrYWdlcyhwa05hbWUsIChmdWxsTmFtZTogc3RyaW5nLCBlbnRyeVBhdGg6IHN0cmluZywgcGFyc2VkTmFtZToge30sIGpzb246IGFueSwgcGFja2FnZVBhdGg6IHN0cmluZykgPT4ge1xuICAgICAgICB2YXIgYXNzZXRzRm9sZGVyID0ganNvbi5kciA/IChqc29uLmRyLmFzc2V0c0RpciA/IGpzb24uZHIuYXNzZXRzRGlyIDogJ2Fzc2V0cycpIDogJ2Fzc2V0cyc7XG4gICAgICAgIHZhciBmYXZpY29uID0gUGF0aC5qb2luKHBhY2thZ2VQYXRoLCBhc3NldHNGb2xkZXIsICdmYXZpY29uLmljbycpO1xuICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhmYXZpY29uKSkge1xuICAgICAgICAgIGlmIChmYXZpY29uRmlsZSkge1xuICAgICAgICAgICAgbG9nLndhcm4oJ0ZvdW5kIGR1cGxpY2F0ZSBmYXZpY29uIGZpbGUgaW4nLCBmdWxsTmFtZSwgJ2V4aXN0aW5nJywgZmF2aWNvblBhY2thZ2UpO1xuICAgICAgICAgIH1cbiAgICAgICAgICBmYXZpY29uRmlsZSA9IFBhdGgucmVzb2x2ZShmYXZpY29uKTtcbiAgICAgICAgICBmYXZpY29uUGFja2FnZSA9IGZ1bGxOYW1lO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4gZmF2aWNvbkZpbGU7XG59XG5cbi8vIGZ1bmN0aW9uIGNvcHlBc3NldHMoKSB7XG4vLyAgIHZhciBzdHJlYW1zOiBhbnlbXSA9IFtdO1xuLy8gICBwYWNrYWdlVXRpbHMuZmluZEFsbFBhY2thZ2VzKChuYW1lOiBzdHJpbmcsIF9lbnRyeVBhdGg6IHN0cmluZywgcGFyc2VkTmFtZToge25hbWU6IHN0cmluZ30sIGpzb246IGFueSwgcGFja2FnZVBhdGg6IHN0cmluZykgPT4ge1xuLy8gICAgIHZhciBhc3NldHNGb2xkZXIgPSBqc29uLmRyID8gKGpzb24uZHIuYXNzZXRzRGlyID8ganNvbi5kci5hc3NldHNEaXIgOiAnYXNzZXRzJykgOiAnYXNzZXRzJztcbi8vICAgICB2YXIgYXNzZXRzRGlyID0gUGF0aC5qb2luKHBhY2thZ2VQYXRoLCBhc3NldHNGb2xkZXIpO1xuLy8gICAgIGlmIChmcy5leGlzdHNTeW5jKGFzc2V0c0RpcikpIHtcbi8vICAgICAgIHZhciBhc3NldHNEaXJNYXAgPSBhcGkuY29uZmlnLmdldCgnb3V0cHV0UGF0aE1hcC4nICsgbmFtZSk7XG4vLyAgICAgICBpZiAoYXNzZXRzRGlyTWFwICE9IG51bGwpXG4vLyAgICAgICAgIGFzc2V0c0Rpck1hcCA9IF8udHJpbShhc3NldHNEaXJNYXAsICcvJyk7XG4vLyAgICAgICB2YXIgc3JjID0gW1BhdGguam9pbihwYWNrYWdlUGF0aCwgYXNzZXRzRm9sZGVyLCAnKionLCAnKicpXTtcbi8vICAgICAgIHZhciBzdHJlYW0gPSBndWxwLnNyYyhzcmMsIHtiYXNlOiBQYXRoLmpvaW4ocGFja2FnZVBhdGgsIGFzc2V0c0ZvbGRlcil9KVxuLy8gICAgICAgLnBpcGUodGhyb3VnaC5vYmooZnVuY3Rpb24oZmlsZSwgZW5jLCBuZXh0KSB7XG4vLyAgICAgICAgIHZhciBwYXRoSW5QayA9IFBhdGgucmVsYXRpdmUoYXNzZXRzRGlyLCBmaWxlLnBhdGgpO1xuLy8gICAgICAgICBmaWxlLnBhdGggPSBQYXRoLmpvaW4oYXNzZXRzRGlyLCBhc3NldHNEaXJNYXAgIT0gbnVsbCA/IGFzc2V0c0Rpck1hcCA6IHBhcnNlZE5hbWUubmFtZSwgcGF0aEluUGspO1xuLy8gICAgICAgICBsb2cuZGVidWcoZmlsZS5wYXRoKTtcbi8vICAgICAgICAgbmV4dChudWxsLCBmaWxlKTtcbi8vICAgICAgIH0pKTtcbi8vICAgICAgIHN0cmVhbXMucHVzaChzdHJlYW0pO1xuLy8gICAgIH1cbi8vICAgfSk7XG4vLyAgIGlmIChzdHJlYW1zLmxlbmd0aCA9PT0gMCkge1xuLy8gICAgIHJldHVybiBudWxsO1xuLy8gICB9XG4vLyAgIC8vIHZhciBjb250ZXh0UGF0aCA9IF8uZ2V0KGFwaSwgJ25nRW50cnlDb21wb25lbnQuc2hvcnROYW1lJywgJycpO1xuLy8gICB2YXIgb3V0cHV0RGlyID0gYXBpLndlYnBhY2tDb25maWcub3V0cHV0LnBhdGg7XG4vLyAgIGxvZy5pbmZvKCdPdXRwdXQgYXNzZXRzIHRvICcsIG91dHB1dERpcik7XG4vLyAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4vLyAgICAgZXMubWVyZ2Uoc3RyZWFtcylcbi8vICAgICAucGlwZShndWxwLmRlc3Qob3V0cHV0RGlyKSlcbi8vICAgICAub24oJ2VuZCcsIGZ1bmN0aW9uKCkge1xuLy8gICAgICAgbG9nLmRlYnVnKCdmbHVzaCcpO1xuLy8gICAgICAgYnVpbGRVdGlscy53cml0ZVRpbWVzdGFtcCgnYXNzZXRzJyk7XG4vLyAgICAgICByZXNvbHZlKCk7XG4vLyAgICAgfSlcbi8vICAgICAub24oJ2Vycm9yJywgcmVqZWN0KTtcbi8vICAgfSk7XG4vLyB9XG4iXX0=