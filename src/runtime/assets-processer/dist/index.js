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
    var maxAgeMap = __api_1.default.config.get(__api_1.default.packageName + '.cacheControlMaxAge', {
    // Format https://www.npmjs.com/package/ms
    // js: '365 days',
    // css: '365 days',
    // less: '365 days',
    // html: 0, // null meaning 'cache-control: no-store'
    // png: '365 days',
    // jpg: '365 days',
    // gif: '365 days',
    // svg: '365 days',
    // eot: 365 days
    // ttf: 365 days
    // woff: 365 days
    // woff2: 365 days
    });
    log.info('cache control', maxAgeMap);
    log.info('Serve static dir', staticFolder);
    // api.use('/', createResponseTimestamp);
    index_html_route_1.proxyToDevServer();
    const httpProxySet = __api_1.default.config.get([__api_1.default.packageName, 'httpProxy']);
    if (httpProxySet) {
        for (const proxyPath of Object.keys(httpProxySet)) {
            log.info(`Enable HTTP proxy ${proxyPath} -> ${httpProxySet[proxyPath]}`);
            utils_1.commandProxy(proxyPath, httpProxySet[proxyPath]);
        }
    }
    // const zss = createZipRoute(maxAgeMap);
    // api.use('/', zss.handler);
    const staticHandler = static_middleware_1.createStaticRoute(staticFolder, maxAgeMap);
    __api_1.default.use('/', staticHandler);
    __api_1.default.use('/', static_middleware_1.createStaticRoute(__api_1.default.config.resolve('dllDestDir'), maxAgeMap));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsa0RBQTBCO0FBQzFCLGdGQUFrRTtBQUNsRSx3REFBMEI7QUFDMUIsb0RBQXVCO0FBQ3ZCLGdEQUF3QjtBQUN4Qiw4REFBcUM7QUFDckMsa0RBQXdCO0FBQ3hCLDREQUFzRTtBQUN0RSw0REFBOEM7QUFDOUMsMkRBQWtEO0FBRWxELHlEQUF5RTtBQUN6RSwyREFBd0Q7QUFDeEQsbUNBQXVDO0FBQ3ZDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3pELE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUUvQyxxQ0FBcUM7QUFFckMsTUFBTSxNQUFNLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQztBQUUxQiw4QkFBOEI7QUFDOUIsMkJBQTJCO0FBQzNCLGdEQUFnRDtBQUNoRCx5RUFBeUU7QUFDekUsY0FBYztBQUNkLE1BQU07QUFDTixzREFBc0Q7QUFDdEQsbUdBQW1HO0FBQ25HLCtCQUErQjtBQUMvQixjQUFjO0FBQ2QsTUFBTTtBQUVOLDhCQUE4QjtBQUM5QixrREFBa0Q7QUFDbEQseUJBQXlCO0FBQ3pCLHlCQUF5QjtBQUN6QixJQUFJO0FBRUosU0FBZ0IsVUFBVTtJQUN4QixXQUFXLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDckIsQ0FBQztBQUZELGdDQUVDO0FBQ0QsU0FBZ0IsUUFBUTtJQUN0QixJQUFJLFlBQVksR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNuRCxHQUFHLENBQUMsS0FBSyxDQUFDLHVCQUF1QixHQUFHLFlBQVksQ0FBQyxDQUFDO0lBR2xELElBQUksT0FBTyxHQUFHLFdBQVcsRUFBRSxDQUFD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NkNBQTZDO0FBQzdDLG1CQUFtQjtBQUNuQixTQUFTO0FBQ1QsNEJBQTRCO0FBQzVCLFFBQVE7QUFDUixJQUFJIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCAqIGFzIHBhY2thZ2VVdGlscyBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3BhY2thZ2UtdXRpbHMnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBzZXJ2ZUluZGV4IGZyb20gJ3NlcnZlLWluZGV4JztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHsgYWN0aXZhdGUgYXMgYWN0aXZhdGVDZCB9IGZyb20gJy4vY29udGVudC1kZXBsb3llci9jZC1zZXJ2ZXInO1xuaW1wb3J0ICogYXMgZmV0Y2hSZW1vdGUgZnJvbSAnLi9mZXRjaC1yZW1vdGUnO1xuaW1wb3J0IHsgSW1hcE1hbmFnZXIgfSBmcm9tICcuL2ZldGNoLXJlbW90ZS1pbWFwJztcbmltcG9ydCB7IFdpdGhNYWlsU2VydmVyQ29uZmlnIH0gZnJvbSAnLi9mZXRjaC10eXBlcyc7XG5pbXBvcnQgeyBmYWxsYmFja0luZGV4SHRtbCwgcHJveHlUb0RldlNlcnZlciB9IGZyb20gJy4vaW5kZXgtaHRtbC1yb3V0ZSc7XG5pbXBvcnQgeyBjcmVhdGVTdGF0aWNSb3V0ZSB9IGZyb20gJy4vc3RhdGljLW1pZGRsZXdhcmUnO1xuaW1wb3J0IHsgY29tbWFuZFByb3h5IH0gZnJvbSAnLi91dGlscyc7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lKTtcbmNvbnN0IHNlcnZlckZhdmljb24gPSByZXF1aXJlKCdzZXJ2ZS1mYXZpY29uJyk7XG5cbi8vIGNvbnN0IGJ1aWxkVXRpbHMgPSBhcGkuYnVpbGRVdGlscztcblxuY29uc3QgY29uZmlnID0gYXBpLmNvbmZpZztcblxuLy8gZXhwb3J0IGZ1bmN0aW9uIGNvbXBpbGUoKSB7XG4vLyAgIGNvbnN0IGFyZ3YgPSBhcGkuYXJndjtcbi8vICAgaWYgKGNvbmZpZygpLmRldk1vZGUgJiYgIWFyZ3YuY29weUFzc2V0cykge1xuLy8gICAgIGxvZy5pbmZvKCdEZXZNb2RlIGVuYWJsZWQsIHNraXAgY29weWluZyBhc3NldHMgdG8gc3RhdGljIGZvbGRlcicpO1xuLy8gICAgIHJldHVybjtcbi8vICAgfVxuLy8gICBpZiAoIWFwaS5pc0RlZmF1bHRMb2NhbGUoKSAmJiAhYXJndi5jb3B5QXNzZXRzKSB7XG4vLyAgICAgbG9nLmluZm8oJ0J1aWxkIGZvciBcIiVzXCIgd2hpY2ggaXMgbm90IGRlZmF1bHQgbG9jYWxlLCBza2lwIGNvcHlpbmcgYXNzZXRzIHRvIHN0YXRpYyBmb2xkZXInLFxuLy8gICAgICAgYXBpLmdldEJ1aWxkTG9jYWxlKCkpO1xuLy8gICAgIHJldHVybjtcbi8vICAgfVxuXG4vLyAgIGNvcHlSb290UGFja2FnZUZhdmljb24oKTtcbi8vICAgLy8gY29uc3Qge3ppcFN0YXRpY30gPSByZXF1aXJlKCcuL2Rpc3QvemlwJyk7XG4vLyAgIHJldHVybiBjb3B5QXNzZXRzKCk7XG4vLyAgIC8vIC50aGVuKHppcFN0YXRpYyk7XG4vLyB9XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWFjdGl2YXRlKCkge1xuICBmZXRjaFJlbW90ZS5zdG9wKCk7XG59XG5leHBvcnQgZnVuY3Rpb24gYWN0aXZhdGUoKSB7XG4gIHZhciBzdGF0aWNGb2xkZXIgPSBhcGkuY29uZmlnLnJlc29sdmUoJ3N0YXRpY0RpcicpO1xuICBsb2cuZGVidWcoJ2V4cHJlc3Mgc3RhdGljIHBhdGg6ICcgKyBzdGF0aWNGb2xkZXIpO1xuXG5cbiAgdmFyIGZhdmljb24gPSBmaW5kRmF2aWNvbigpO1xuICBpZiAoZmF2aWNvbilcbiAgICBhcGkudXNlKHNlcnZlckZhdmljb24oZmF2aWNvbikpO1xuXG4gIHZhciBtYXhBZ2VNYXAgPSBhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUgKyAnLmNhY2hlQ29udHJvbE1heEFnZScsIHtcbiAgICAvLyBGb3JtYXQgaHR0cHM6Ly93d3cubnBtanMuY29tL3BhY2thZ2UvbXNcbiAgICAvLyBqczogJzM2NSBkYXlzJyxcbiAgICAvLyBjc3M6ICczNjUgZGF5cycsXG4gICAgLy8gbGVzczogJzM2NSBkYXlzJyxcbiAgICAvLyBodG1sOiAwLCAvLyBudWxsIG1lYW5pbmcgJ2NhY2hlLWNvbnRyb2w6IG5vLXN0b3JlJ1xuICAgIC8vIHBuZzogJzM2NSBkYXlzJyxcbiAgICAvLyBqcGc6ICczNjUgZGF5cycsXG4gICAgLy8gZ2lmOiAnMzY1IGRheXMnLFxuICAgIC8vIHN2ZzogJzM2NSBkYXlzJyxcbiAgICAvLyBlb3Q6IDM2NSBkYXlzXG4gICAgLy8gdHRmOiAzNjUgZGF5c1xuICAgIC8vIHdvZmY6IDM2NSBkYXlzXG4gICAgLy8gd29mZjI6IDM2NSBkYXlzXG4gIH0pO1xuICBsb2cuaW5mbygnY2FjaGUgY29udHJvbCcsIG1heEFnZU1hcCk7XG4gIGxvZy5pbmZvKCdTZXJ2ZSBzdGF0aWMgZGlyJywgc3RhdGljRm9sZGVyKTtcblxuICAvLyBhcGkudXNlKCcvJywgY3JlYXRlUmVzcG9uc2VUaW1lc3RhbXApO1xuICBwcm94eVRvRGV2U2VydmVyKCk7XG5cbiAgY29uc3QgaHR0cFByb3h5U2V0ID0gYXBpLmNvbmZpZy5nZXQoW2FwaS5wYWNrYWdlTmFtZSwgJ2h0dHBQcm94eSddKSBhcyB7W3Byb3h5UGF0aDogc3RyaW5nXTogc3RyaW5nfTtcbiAgaWYgKGh0dHBQcm94eVNldCkge1xuICAgIGZvciAoY29uc3QgcHJveHlQYXRoIG9mIE9iamVjdC5rZXlzKGh0dHBQcm94eVNldCkpIHtcbiAgICAgIGxvZy5pbmZvKGBFbmFibGUgSFRUUCBwcm94eSAke3Byb3h5UGF0aH0gLT4gJHtodHRwUHJveHlTZXRbcHJveHlQYXRoXX1gKTtcbiAgICAgIGNvbW1hbmRQcm94eShwcm94eVBhdGgsIGh0dHBQcm94eVNldFtwcm94eVBhdGhdKTtcbiAgICB9XG4gIH1cblxuICAvLyBjb25zdCB6c3MgPSBjcmVhdGVaaXBSb3V0ZShtYXhBZ2VNYXApO1xuXG4gIC8vIGFwaS51c2UoJy8nLCB6c3MuaGFuZGxlcik7XG4gIGNvbnN0IHN0YXRpY0hhbmRsZXIgPSBjcmVhdGVTdGF0aWNSb3V0ZShzdGF0aWNGb2xkZXIsIG1heEFnZU1hcCk7XG4gIGFwaS51c2UoJy8nLCBzdGF0aWNIYW5kbGVyKTtcbiAgYXBpLnVzZSgnLycsIGNyZWF0ZVN0YXRpY1JvdXRlKGFwaS5jb25maWcucmVzb2x2ZSgnZGxsRGVzdERpcicpLCBtYXhBZ2VNYXApKTtcblxuICBpZiAoYXBpLmNvbmZpZy5nZXQoW2FwaS5wYWNrYWdlTmFtZSwgJ3NlcnZlSW5kZXgnXSkpIHtcbiAgICBjb25zdCBzdHlsZXNoZWV0ID0gUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uL3NlcnZlLWluZGV4LmNzcycpO1xuICAgIHByb2Nlc3MudGl0bGUgPSAnRmlsZSBzZXJ2ZXIgb24gJyArIHN0YXRpY0ZvbGRlcjtcbiAgICBhcGkudXNlKCcvJywgc2VydmVJbmRleChzdGF0aWNGb2xkZXIsIHtpY29uczogdHJ1ZSwgc3R5bGVzaGVldH0pKTtcbiAgfSBlbHNlIHtcbiAgICBsb2cuaW5mbyhjaGFsay5ibHVlQnJpZ2h0KGBJZiB5b3Ugd2FudCB0byBzZXJ2ZSBkaXJlY3RvcnkgaW5kZXggcGFnZSBmb3IgcmVzb3VyY2UgZGlyZWN0b3J5IG90aGVyIHRoYW4gJHtzdGF0aWNGb2xkZXJ9XFxuYCArXG4gICAgICBgIHN0YXJ0IGNvbW1hbmQgd2l0aCBcIi1jIG5vbmUgLS1wcm9wICR7YXBpLnBhY2thZ2VOYW1lfS5zZXJ2ZUluZGV4PXRydWUgLS1wcm9wIHN0YXRpY0Rpcj08cmVzb3VyY2UgZGlyZWN0b3J5PmApKTtcbiAgfVxuICBhcGkuZXhwcmVzc0FwcFNldChhcHAgPT4gYWN0aXZhdGVDZChhcHAsIGltYXApKTtcbiAgZmFsbGJhY2tJbmRleEh0bWwoKTtcbiAgYXBpLnVzZSgnLycsIHN0YXRpY0hhbmRsZXIpOyAvLyBTZXJ2ZSBmYWxsYmFja2VkIHJlcXVlc3QgdG8gaW5kZXguaHRtbFxuXG4gIGNvbnN0IG1haWxTZXR0aW5nID0gKGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSkgYXMgV2l0aE1haWxTZXJ2ZXJDb25maWcpLmZldGNoTWFpbFNlcnZlcjtcbiAgY29uc3QgaW1hcCA9IG5ldyBJbWFwTWFuYWdlcihtYWlsU2V0dGluZyA/IG1haWxTZXR0aW5nLmVudiA6ICdsb2NhbCcpO1xuXG4gIGFwaS5ldmVudEJ1cy5vbignYXBwQ3JlYXRlZCcsICgpID0+IHtcbiAgICAvLyBhcHBDcmVhdGVkIGV2ZW50IGlzIGVtaXR0ZWQgYnkgZXhwcmVzcy1hcHBcbiAgICBmZXRjaFJlbW90ZS5zdGFydChpbWFwKTtcbiAgfSk7XG5cbiAgaWYgKCFhcGkuY29uZmlnKCkuZGV2TW9kZSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIHNldHVwRGV2QXNzZXRzKGFwaS5jb25maWcoKS5zdGF0aWNBc3NldHNVUkwsIGFwaS51c2UuYmluZChhcGkpKTtcbn1cblxuLy8gZnVuY3Rpb24gY29weVJvb3RQYWNrYWdlRmF2aWNvbigpIHtcbi8vICAgdmFyIGZhdmljb24gPSBmaW5kRmF2aWNvbigpO1xuLy8gICBpZiAoIWZhdmljb24pXG4vLyAgICAgcmV0dXJuO1xuLy8gICBsb2cuaW5mbygnQ29weSBmYXZpY29uLmljbyBmcm9tICcgKyBmYXZpY29uKTtcbi8vICAgZnMubWtkaXJwU3luYyhjb25maWcucmVzb2x2ZSgnc3RhdGljRGlyJykpO1xuLy8gICBmcy5jb3B5U3luYyhQYXRoLnJlc29sdmUoZmF2aWNvbiksIFBhdGgucmVzb2x2ZShjb25maWcoKS5yb290UGF0aCwgY29uZmlnLnJlc29sdmUoJ3N0YXRpY0RpcicpKSk7XG4vLyB9XG5cbmZ1bmN0aW9uIGZpbmRGYXZpY29uKCkge1xuICByZXR1cm4gX2ZpbmRGYXZpY29uSW5Db25maWcoJ3BhY2thZ2VDb250ZXh0UGF0aE1hcHBpbmcnKSB8fCBfZmluZEZhdmljb25JbkNvbmZpZygnb3V0cHV0UGF0aE1hcCcpO1xufVxuXG5mdW5jdGlvbiBfZmluZEZhdmljb25JbkNvbmZpZyhwcm9wZXJ0eTogc3RyaW5nKSB7XG4gIGlmICghYXBpLmNvbmZpZygpW3Byb3BlcnR5XSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGxldCBmYXZpY29uRmlsZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBsZXQgZmF2aWNvblBhY2thZ2U6IHN0cmluZztcbiAgXy5lYWNoKGNvbmZpZygpW3Byb3BlcnR5XSwgKHBhdGgsIHBrTmFtZSkgPT4ge1xuICAgIGlmIChwYXRoID09PSAnLycpIHtcbiAgICAgIHBhY2thZ2VVdGlscy5sb29rRm9yUGFja2FnZXMocGtOYW1lLCAoZnVsbE5hbWU6IHN0cmluZywgZW50cnlQYXRoOiBzdHJpbmcsIHBhcnNlZE5hbWU6IHt9LCBqc29uOiBhbnksIHBhY2thZ2VQYXRoOiBzdHJpbmcpID0+IHtcbiAgICAgICAgdmFyIGFzc2V0c0ZvbGRlciA9IGpzb24uZHIgPyAoanNvbi5kci5hc3NldHNEaXIgPyBqc29uLmRyLmFzc2V0c0RpciA6ICdhc3NldHMnKSA6ICdhc3NldHMnO1xuICAgICAgICB2YXIgZmF2aWNvbiA9IFBhdGguam9pbihwYWNrYWdlUGF0aCwgYXNzZXRzRm9sZGVyLCAnZmF2aWNvbi5pY28nKTtcbiAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoZmF2aWNvbikpIHtcbiAgICAgICAgICBpZiAoZmF2aWNvbkZpbGUpIHtcbiAgICAgICAgICAgIGxvZy53YXJuKCdGb3VuZCBkdXBsaWNhdGUgZmF2aWNvbiBmaWxlIGluJywgZnVsbE5hbWUsICdleGlzdGluZycsIGZhdmljb25QYWNrYWdlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZmF2aWNvbkZpbGUgPSBQYXRoLnJlc29sdmUoZmF2aWNvbik7XG4gICAgICAgICAgZmF2aWNvblBhY2thZ2UgPSBmdWxsTmFtZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIGZhdmljb25GaWxlO1xufVxuXG4vLyBmdW5jdGlvbiBjb3B5QXNzZXRzKCkge1xuLy8gICB2YXIgc3RyZWFtczogYW55W10gPSBbXTtcbi8vICAgcGFja2FnZVV0aWxzLmZpbmRBbGxQYWNrYWdlcygobmFtZTogc3RyaW5nLCBfZW50cnlQYXRoOiBzdHJpbmcsIHBhcnNlZE5hbWU6IHtuYW1lOiBzdHJpbmd9LCBqc29uOiBhbnksIHBhY2thZ2VQYXRoOiBzdHJpbmcpID0+IHtcbi8vICAgICB2YXIgYXNzZXRzRm9sZGVyID0ganNvbi5kciA/IChqc29uLmRyLmFzc2V0c0RpciA/IGpzb24uZHIuYXNzZXRzRGlyIDogJ2Fzc2V0cycpIDogJ2Fzc2V0cyc7XG4vLyAgICAgdmFyIGFzc2V0c0RpciA9IFBhdGguam9pbihwYWNrYWdlUGF0aCwgYXNzZXRzRm9sZGVyKTtcbi8vICAgICBpZiAoZnMuZXhpc3RzU3luYyhhc3NldHNEaXIpKSB7XG4vLyAgICAgICB2YXIgYXNzZXRzRGlyTWFwID0gYXBpLmNvbmZpZy5nZXQoJ291dHB1dFBhdGhNYXAuJyArIG5hbWUpO1xuLy8gICAgICAgaWYgKGFzc2V0c0Rpck1hcCAhPSBudWxsKVxuLy8gICAgICAgICBhc3NldHNEaXJNYXAgPSBfLnRyaW0oYXNzZXRzRGlyTWFwLCAnLycpO1xuLy8gICAgICAgdmFyIHNyYyA9IFtQYXRoLmpvaW4ocGFja2FnZVBhdGgsIGFzc2V0c0ZvbGRlciwgJyoqJywgJyonKV07XG4vLyAgICAgICB2YXIgc3RyZWFtID0gZ3VscC5zcmMoc3JjLCB7YmFzZTogUGF0aC5qb2luKHBhY2thZ2VQYXRoLCBhc3NldHNGb2xkZXIpfSlcbi8vICAgICAgIC5waXBlKHRocm91Z2gub2JqKGZ1bmN0aW9uKGZpbGUsIGVuYywgbmV4dCkge1xuLy8gICAgICAgICB2YXIgcGF0aEluUGsgPSBQYXRoLnJlbGF0aXZlKGFzc2V0c0RpciwgZmlsZS5wYXRoKTtcbi8vICAgICAgICAgZmlsZS5wYXRoID0gUGF0aC5qb2luKGFzc2V0c0RpciwgYXNzZXRzRGlyTWFwICE9IG51bGwgPyBhc3NldHNEaXJNYXAgOiBwYXJzZWROYW1lLm5hbWUsIHBhdGhJblBrKTtcbi8vICAgICAgICAgbG9nLmRlYnVnKGZpbGUucGF0aCk7XG4vLyAgICAgICAgIG5leHQobnVsbCwgZmlsZSk7XG4vLyAgICAgICB9KSk7XG4vLyAgICAgICBzdHJlYW1zLnB1c2goc3RyZWFtKTtcbi8vICAgICB9XG4vLyAgIH0pO1xuLy8gICBpZiAoc3RyZWFtcy5sZW5ndGggPT09IDApIHtcbi8vICAgICByZXR1cm4gbnVsbDtcbi8vICAgfVxuLy8gICAvLyB2YXIgY29udGV4dFBhdGggPSBfLmdldChhcGksICduZ0VudHJ5Q29tcG9uZW50LnNob3J0TmFtZScsICcnKTtcbi8vICAgdmFyIG91dHB1dERpciA9IGFwaS53ZWJwYWNrQ29uZmlnLm91dHB1dC5wYXRoO1xuLy8gICBsb2cuaW5mbygnT3V0cHV0IGFzc2V0cyB0byAnLCBvdXRwdXREaXIpO1xuLy8gICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuLy8gICAgIGVzLm1lcmdlKHN0cmVhbXMpXG4vLyAgICAgLnBpcGUoZ3VscC5kZXN0KG91dHB1dERpcikpXG4vLyAgICAgLm9uKCdlbmQnLCBmdW5jdGlvbigpIHtcbi8vICAgICAgIGxvZy5kZWJ1ZygnZmx1c2gnKTtcbi8vICAgICAgIGJ1aWxkVXRpbHMud3JpdGVUaW1lc3RhbXAoJ2Fzc2V0cycpO1xuLy8gICAgICAgcmVzb2x2ZSgpO1xuLy8gICAgIH0pXG4vLyAgICAgLm9uKCdlcnJvcicsIHJlamVjdCk7XG4vLyAgIH0pO1xuLy8gfVxuIl19