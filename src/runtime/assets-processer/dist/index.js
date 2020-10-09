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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
    const zss = static_middleware_1.createZipRoute(maxAgeMap);
    __api_1.default.use('/', zss.handler);
    const staticHandler = static_middleware_1.createStaticRoute(staticFolder, maxAgeMap);
    __api_1.default.use('/', staticHandler);
    __api_1.default.use('/', static_middleware_1.createStaticRoute(__api_1.default.config.resolve('dllDestDir'), maxAgeMap));
    if (__api_1.default.config.get([__api_1.default.packageName, 'serveIndex'])) {
        const stylesheet = path_1.default.resolve(__dirname, '../serve-index.css');
        process.title = 'File server on ' + staticFolder;
        __api_1.default.use('/', serve_index_1.default(staticFolder, { icons: true, stylesheet }));
    }
    else {
        log.info(chalk_1.default.blueBright(`If you want to serve directory index page of static resource folder ${staticFolder}\n` +
            ` start command with "-c --prop ${__api_1.default.packageName}.serveIndex=true staticDir=<resource directory>`));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3dlYi1mdW4taG91c2Uvc3JjL3J1bnRpbWUvYXNzZXRzLXByb2Nlc3Nlci90cy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsa0RBQTBCO0FBQzFCLGdGQUFrRTtBQUNsRSx3REFBMEI7QUFDMUIsb0RBQXVCO0FBQ3ZCLGdEQUF3QjtBQUN4Qiw4REFBcUM7QUFDckMsa0RBQXdCO0FBQ3hCLDREQUFzRTtBQUN0RSw0REFBOEM7QUFDOUMsMkRBQWtEO0FBRWxELHlEQUF5RTtBQUN6RSwyREFBd0U7QUFDeEUsbUNBQXVDO0FBQ3ZDLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3pELE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUUvQyxxQ0FBcUM7QUFFckMsTUFBTSxNQUFNLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQztBQUUxQiw4QkFBOEI7QUFDOUIsMkJBQTJCO0FBQzNCLGdEQUFnRDtBQUNoRCx5RUFBeUU7QUFDekUsY0FBYztBQUNkLE1BQU07QUFDTixzREFBc0Q7QUFDdEQsbUdBQW1HO0FBQ25HLCtCQUErQjtBQUMvQixjQUFjO0FBQ2QsTUFBTTtBQUVOLDhCQUE4QjtBQUM5QixrREFBa0Q7QUFDbEQseUJBQXlCO0FBQ3pCLHlCQUF5QjtBQUN6QixJQUFJO0FBRUosU0FBZ0IsVUFBVTtJQUN4QixXQUFXLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDckIsQ0FBQztBQUZELGdDQUVDO0FBQ0QsU0FBZ0IsUUFBUTtJQUN0QixJQUFJLFlBQVksR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNuRCxHQUFHLENBQUMsS0FBSyxDQUFDLHVCQUF1QixHQUFHLFlBQVksQ0FBQyxDQUFDO0lBR2xELElBQUksT0FBTyxHQUFHLFdBQVcsRUFBRSxDQUFDO0lBQzVCLElBQUksT0FBTztRQUNULGVBQUcsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFFbEMsSUFBSSxTQUFTLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxxQkFBcUIsRUFBRTtJQUN0RSwwQ0FBMEM7SUFDMUMsa0JBQWtCO0lBQ2xCLG1CQUFtQjtJQUNuQixvQkFBb0I7SUFDcEIscURBQXFEO0lBQ3JELG1CQUFtQjtJQUNuQixtQkFBbUI7SUFDbkIsbUJBQW1CO0lBQ25CLG1CQUFtQjtJQUNuQixnQkFBZ0I7SUFDaEIsZ0JBQWdCO0lBQ2hCLGlCQUFpQjtJQUNqQixrQkFBa0I7S0FDbkIsQ0FBQyxDQUFDO0lBQ0gsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDckMsR0FBRyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUUzQyx5Q0FBeUM7SUFDekMsbUNBQWdCLEVBQUUsQ0FBQztJQUVuQixNQUFNLFlBQVksR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQWtDLENBQUM7SUFDckcsSUFBSSxZQUFZLEVBQUU7UUFDaEIsS0FBSyxNQUFNLFNBQVMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFO1lBQ2pELEdBQUcsQ0FBQyxJQUFJLENBQUMscUJBQXFCLFNBQVMsT0FBTyxZQUFZLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3pFLG9CQUFZLENBQUMsU0FBUyxFQUFFLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDO1NBQ2xEO0tBQ0Y7SUFFRCxNQUFNLEdBQUcsR0FBRyxrQ0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBRXRDLGVBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUMxQixNQUFNLGFBQWEsR0FBRyxxQ0FBaUIsQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDakUsZUFBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsYUFBYSxDQUFDLENBQUM7SUFDNUIsZUFBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUscUNBQWlCLENBQUMsZUFBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQztJQUU3RSxJQUFJLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsZUFBRyxDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUMsQ0FBQyxFQUFFO1FBQ25ELE1BQU0sVUFBVSxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLG9CQUFvQixDQUFDLENBQUM7UUFDakUsT0FBTyxDQUFDLEtBQUssR0FBRyxpQkFBaUIsR0FBRyxZQUFZLENBQUM7UUFDakQsZUFBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUscUJBQVUsQ0FBQyxZQUFZLEVBQUUsRUFBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBQyxDQUFDLENBQUMsQ0FBQztLQUNuRTtTQUFNO1FBQ0wsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFLLENBQUMsVUFBVSxDQUFDLHVFQUF1RSxZQUFZLElBQUk7WUFDL0csa0NBQWtDLGVBQUcsQ0FBQyxXQUFXLGlEQUFpRCxDQUFDLENBQUMsQ0FBQztLQUN4RztJQUNELGVBQUcsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxvQkFBVSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ2hELG9DQUFpQixFQUFFLENBQUM7SUFDcEIsZUFBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQyx5Q0FBeUM7SUFFdEUsTUFBTSxXQUFXLEdBQUksZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBMEIsQ0FBQyxlQUFlLENBQUM7SUFDOUYsTUFBTSxJQUFJLEdBQUcsSUFBSSwrQkFBVyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7SUFFdEUsZUFBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtRQUNqQyw2Q0FBNkM7UUFDN0MsV0FBVyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMxQixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxlQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsT0FBTyxFQUFFO1FBQ3pCLE9BQU87S0FDUjtJQUVELG1FQUFtRTtBQUNyRSxDQUFDO0FBdEVELDRCQXNFQztBQUVELHNDQUFzQztBQUN0QyxpQ0FBaUM7QUFDakMsa0JBQWtCO0FBQ2xCLGNBQWM7QUFDZCxrREFBa0Q7QUFDbEQsZ0RBQWdEO0FBQ2hELHNHQUFzRztBQUN0RyxJQUFJO0FBRUosU0FBUyxXQUFXO0lBQ2xCLE9BQU8sb0JBQW9CLENBQUMsMkJBQTJCLENBQUMsSUFBSSxvQkFBb0IsQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUNwRyxDQUFDO0FBRUQsU0FBUyxvQkFBb0IsQ0FBQyxRQUFnQjtJQUM1QyxJQUFJLENBQUMsZUFBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFO1FBQzNCLE9BQU8sSUFBSSxDQUFDO0tBQ2I7SUFDRCxJQUFJLFdBQStCLENBQUM7SUFDcEMsSUFBSSxjQUFzQixDQUFDO0lBQzNCLGdCQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQzFDLElBQUksSUFBSSxLQUFLLEdBQUcsRUFBRTtZQUNoQixZQUFZLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxDQUFDLFFBQWdCLEVBQUUsU0FBaUIsRUFBRSxVQUFjLEVBQUUsSUFBUyxFQUFFLFdBQW1CLEVBQUUsRUFBRTtnQkFDM0gsSUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7Z0JBQzNGLElBQUksT0FBTyxHQUFHLGNBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLFlBQVksRUFBRSxhQUFhLENBQUMsQ0FBQztnQkFDbEUsSUFBSSxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRTtvQkFDMUIsSUFBSSxXQUFXLEVBQUU7d0JBQ2YsR0FBRyxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLGNBQWMsQ0FBQyxDQUFDO3FCQUNuRjtvQkFDRCxXQUFXLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDcEMsY0FBYyxHQUFHLFFBQVEsQ0FBQztpQkFDM0I7WUFDSCxDQUFDLENBQUMsQ0FBQztTQUNKO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDSCxPQUFPLFdBQVcsQ0FBQztBQUNyQixDQUFDO0FBRUQsMEJBQTBCO0FBQzFCLDZCQUE2QjtBQUM3QixxSUFBcUk7QUFDckksa0dBQWtHO0FBQ2xHLDREQUE0RDtBQUM1RCxzQ0FBc0M7QUFDdEMsb0VBQW9FO0FBQ3BFLGtDQUFrQztBQUNsQyxvREFBb0Q7QUFDcEQscUVBQXFFO0FBQ3JFLGlGQUFpRjtBQUNqRixzREFBc0Q7QUFDdEQsOERBQThEO0FBQzlELDZHQUE2RztBQUM3RyxnQ0FBZ0M7QUFDaEMsNEJBQTRCO0FBQzVCLGFBQWE7QUFDYiw4QkFBOEI7QUFDOUIsUUFBUTtBQUNSLFFBQVE7QUFDUixnQ0FBZ0M7QUFDaEMsbUJBQW1CO0FBQ25CLE1BQU07QUFDTix1RUFBdUU7QUFDdkUsbURBQW1EO0FBQ25ELDhDQUE4QztBQUM5Qyw4Q0FBOEM7QUFDOUMsd0JBQXdCO0FBQ3hCLGtDQUFrQztBQUNsQyw4QkFBOEI7QUFDOUIsNEJBQTRCO0FBQzVCLDZDQUE2QztBQUM3QyxtQkFBbUI7QUFDbkIsU0FBUztBQUNULDRCQUE0QjtBQUM1QixRQUFRO0FBQ1IsSUFBSSIsImZpbGUiOiJydW50aW1lL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9pbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbbnVsbF19
