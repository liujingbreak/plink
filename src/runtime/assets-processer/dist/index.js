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

//# sourceMappingURL=index.js.map
