"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const gulp = require('gulp');
const through2_1 = tslib_1.__importDefault(require("through2"));
const path_1 = tslib_1.__importDefault(require("path"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const __api_1 = tslib_1.__importDefault(require("__api"));
const es = require('event-stream');
const log = require('log4js').getLogger(__api_1.default.packageName);
const fetchRemote = tslib_1.__importStar(require("./fetch-remote"));
const serverFavicon = require('serve-favicon');
const static_middleware_1 = require("./static-middleware");
const index_html_route_1 = require("./index-html-route");
const cd_server_1 = require("./content-deployer/cd-server");
const fetch_remote_imap_1 = require("./fetch-remote-imap");
const serve_index_1 = tslib_1.__importDefault(require("serve-index"));
// const setupDevAssets = require('./dist/dev-serve-assets').default;
const buildUtils = __api_1.default.buildUtils;
const packageUtils = __api_1.default.packageUtils;
const config = __api_1.default.config;
function compile() {
    const argv = __api_1.default.argv;
    if (config().devMode && !argv.copyAssets) {
        log.info('DevMode enabled, skip copying assets to static folder');
        return;
    }
    if (!__api_1.default.isDefaultLocale() && !argv.copyAssets) {
        log.info('Build for "%s" which is not default locale, skip copying assets to static folder', __api_1.default.getBuildLocale());
        return;
    }
    copyRootPackageFavicon();
    // const {zipStatic} = require('./dist/zip');
    return copyAssets();
    // .then(zipStatic);
}
exports.compile = compile;
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
    index_html_route_1.proxyToDevServer();
    const zss = static_middleware_1.createZipRoute(maxAgeMap);
    __api_1.default.use('/', zss.handler);
    const staticHandler = static_middleware_1.createStaticRoute(staticFolder, maxAgeMap);
    __api_1.default.use('/', staticHandler);
    __api_1.default.use('/', static_middleware_1.createStaticRoute(__api_1.default.config.resolve('dllDestDir'), maxAgeMap));
    if (__api_1.default.config.get([__api_1.default.packageName, 'serveIndex'])) {
        const stylesheet = path_1.default.resolve(__dirname, '../serve-index.css');
        __api_1.default.use('/', serve_index_1.default(staticFolder, { icons: true, stylesheet }));
    }
    else {
        log.info(`If you want to serve directory index page of static resource folder ${staticFolder}\n` +
            ` start command with "--prop ${__api_1.default.packageName}.serveIndex=true staticDir=<resource directory>`);
    }
    index_html_route_1.fallbackIndexHtml();
    __api_1.default.use('/', staticHandler); // Serve fallbacked request to index.html
    const mailSetting = __api_1.default.config.get(__api_1.default.packageName).fetchMailServer;
    const imap = new fetch_remote_imap_1.ImapManager(mailSetting ? mailSetting.env : 'local');
    __api_1.default.expressAppSet(app => cd_server_1.activate(app, imap));
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
function copyRootPackageFavicon() {
    var favicon = findFavicon();
    if (!favicon)
        return;
    log.info('Copy favicon.ico from ' + favicon);
    fs_extra_1.default.mkdirpSync(config.resolve('staticDir'));
    fs_extra_1.default.copySync(path_1.default.resolve(favicon), path_1.default.resolve(config().rootPath, config.resolve('staticDir')));
}
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
function copyAssets() {
    var streams = [];
    packageUtils.findBrowserPackageByType(['*'], function (name, _entryPath, parsedName, json, packagePath) {
        var assetsFolder = json.dr ? (json.dr.assetsDir ? json.dr.assetsDir : 'assets') : 'assets';
        var assetsDir = path_1.default.join(packagePath, assetsFolder);
        if (fs_extra_1.default.existsSync(assetsDir)) {
            var assetsDirMap = __api_1.default.config.get('outputPathMap.' + name);
            if (assetsDirMap != null)
                assetsDirMap = lodash_1.default.trim(assetsDirMap, '/');
            var src = [path_1.default.join(packagePath, assetsFolder, '**', '*')];
            var stream = gulp.src(src, { base: path_1.default.join(packagePath, assetsFolder) })
                .pipe(through2_1.default.obj(function (file, enc, next) {
                var pathInPk = path_1.default.relative(assetsDir, file.path);
                file.path = path_1.default.join(assetsDir, assetsDirMap != null ? assetsDirMap : parsedName.name, pathInPk);
                log.debug(file.path);
                next(null, file);
            }));
            streams.push(stream);
        }
    });
    if (streams.length === 0) {
        return null;
    }
    // var contextPath = _.get(api, 'ngEntryComponent.shortName', '');
    var outputDir = __api_1.default.webpackConfig.output.path;
    log.info('Output assets to ', outputDir);
    return new Promise((resolve, reject) => {
        es.merge(streams)
            .pipe(gulp.dest(outputDir))
            .on('end', function () {
            log.debug('flush');
            buildUtils.writeTimestamp('assets');
            resolve();
        })
            .on('error', reject);
    });
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM3QixnRUFBK0I7QUFDL0Isd0RBQXdCO0FBQ3hCLGdFQUEwQjtBQUMxQiw0REFBdUI7QUFDdkIsMERBQXdCO0FBQ3hCLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUNuQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUN6RCxvRUFBOEM7QUFDOUMsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQy9DLDJEQUFzRTtBQUN0RSx5REFBdUU7QUFDdkUsNERBQW9FO0FBQ3BFLDJEQUFnRDtBQUVoRCxzRUFBcUM7QUFDckMscUVBQXFFO0FBRXJFLE1BQU0sVUFBVSxHQUFHLGVBQUcsQ0FBQyxVQUFVLENBQUM7QUFFbEMsTUFBTSxZQUFZLEdBQUcsZUFBRyxDQUFDLFlBQVksQ0FBQztBQUN0QyxNQUFNLE1BQU0sR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDO0FBRTFCLFNBQWdCLE9BQU87SUFDckIsTUFBTSxJQUFJLEdBQUcsZUFBRyxDQUFDLElBQUksQ0FBQztJQUN0QixJQUFJLE1BQU0sRUFBRSxDQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUU7UUFDeEMsR0FBRyxDQUFDLElBQUksQ0FBQyx1REFBdUQsQ0FBQyxDQUFDO1FBQ2xFLE9BQU87S0FDUjtJQUNELElBQUksQ0FBQyxlQUFHLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFO1FBQzlDLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0ZBQWtGLEVBQ3pGLGVBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO1FBQ3hCLE9BQU87S0FDUjtJQUVELHNCQUFzQixFQUFFLENBQUM7SUFDekIsNkNBQTZDO0lBQzdDLE9BQU8sVUFBVSxFQUFFLENBQUM7SUFDcEIsb0JBQW9CO0FBQ3RCLENBQUM7QUFoQkQsMEJBZ0JDO0FBRUQsU0FBZ0IsVUFBVTtJQUN4QixXQUFXLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDckIsQ0FBQztBQUZELGdDQUVDO0FBQ0QsU0FBZ0IsUUFBUTtJQUN0QixJQUFJLFlBQVksR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNuRCxHQUFHLENBQUMsS0FBSyxDQUFDLHVCQUF1QixHQUFHLFlBQVksQ0FBQyxDQUFDO0lBR2xELElBQUksT0FBTyxHQUFHLFdBQVcsRUFBRSxDQUFDO0lBQzVCLElBQUksT0FBTztRQUNULGVBQUcsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFFbEMsSUFBSSxTQUFTLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxxQkFBcUIsRUFBRTtJQUN0RSwwQ0FBMEM7SUFDMUMsa0JBQWtCO0lBQ2xCLG1CQUFtQjtJQUNuQixvQkFBb0I7SUFDcEIscURBQXFEO0lBQ3JELG1CQUFtQjtJQUNuQixtQkFBbUI7SUFDbkIsbUJBQW1CO0lBQ25CLG1CQUFtQjtJQUNuQixnQkFBZ0I7SUFDaEIsZ0JBQWdCO0lBQ2hCLGlCQUFpQjtJQUNqQixrQkFBa0I7S0FDbkIsQ0FBQyxDQUFDO0lBQ0gsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDckMsR0FBRyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUUzQyxtQ0FBZ0IsRUFBRSxDQUFDO0lBRW5CLE1BQU0sR0FBRyxHQUFHLGtDQUFjLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDdEMsZUFBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzFCLE1BQU0sYUFBYSxHQUFHLHFDQUFpQixDQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsQ0FBQztJQUNqRSxlQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxhQUFhLENBQUMsQ0FBQztJQUM1QixlQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxxQ0FBaUIsQ0FBQyxlQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBRTdFLElBQUksZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxlQUFHLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQyxDQUFDLEVBQUU7UUFDbkQsTUFBTSxVQUFVLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsb0JBQW9CLENBQUMsQ0FBQztRQUNqRSxlQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxxQkFBVSxDQUFDLFlBQVksRUFBRSxFQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ25FO1NBQU07UUFDTCxHQUFHLENBQUMsSUFBSSxDQUFDLHVFQUF1RSxZQUFZLElBQUk7WUFDOUYsK0JBQStCLGVBQUcsQ0FBQyxXQUFXLGlEQUFpRCxDQUFDLENBQUM7S0FDcEc7SUFFRCxvQ0FBaUIsRUFBRSxDQUFDO0lBQ3BCLGVBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLGFBQWEsQ0FBQyxDQUFDLENBQUMseUNBQXlDO0lBRXRFLE1BQU0sV0FBVyxHQUFJLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQTBCLENBQUMsZUFBZSxDQUFDO0lBQzlGLE1BQU0sSUFBSSxHQUFHLElBQUksK0JBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBRXRFLGVBQUcsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxvQkFBVSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBRWhELGVBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLFlBQVksRUFBRSxHQUFHLEVBQUU7UUFDakMsNkNBQTZDO1FBQzdDLFdBQVcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDMUIsQ0FBQyxDQUFDLENBQUM7SUFFSCxJQUFJLENBQUMsZUFBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLE9BQU8sRUFBRTtRQUN6QixPQUFPO0tBQ1I7SUFFRCxtRUFBbUU7QUFDckUsQ0FBQztBQTdERCw0QkE2REM7QUFFRCxTQUFTLHNCQUFzQjtJQUM3QixJQUFJLE9BQU8sR0FBRyxXQUFXLEVBQUUsQ0FBQztJQUM1QixJQUFJLENBQUMsT0FBTztRQUNWLE9BQU87SUFDVCxHQUFHLENBQUMsSUFBSSxDQUFDLHdCQUF3QixHQUFHLE9BQU8sQ0FBQyxDQUFDO0lBQzdDLGtCQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQztJQUMzQyxrQkFBRSxDQUFDLFFBQVEsQ0FBQyxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLGNBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25HLENBQUM7QUFFRCxTQUFTLFdBQVc7SUFDbEIsT0FBTyxvQkFBb0IsQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLG9CQUFvQixDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3BHLENBQUM7QUFFRCxTQUFTLG9CQUFvQixDQUFDLFFBQWdCO0lBQzVDLElBQUksQ0FBQyxlQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUU7UUFDM0IsT0FBTyxJQUFJLENBQUM7S0FDYjtJQUNELElBQUksV0FBK0IsQ0FBQztJQUNwQyxJQUFJLGNBQXNCLENBQUM7SUFDM0IsZ0JBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEVBQUU7UUFDMUMsSUFBSSxJQUFJLEtBQUssR0FBRyxFQUFFO1lBQ2hCLFlBQVksQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLENBQUMsUUFBZ0IsRUFBRSxTQUFpQixFQUFFLFVBQWMsRUFBRSxJQUFTLEVBQUUsV0FBbUIsRUFBRSxFQUFFO2dCQUMzSCxJQUFJLFlBQVksR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztnQkFDM0YsSUFBSSxPQUFPLEdBQUcsY0FBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsWUFBWSxFQUFFLGFBQWEsQ0FBQyxDQUFDO2dCQUNsRSxJQUFJLGtCQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxFQUFFO29CQUMxQixJQUFJLFdBQVcsRUFBRTt3QkFDZixHQUFHLENBQUMsSUFBSSxDQUFDLGlDQUFpQyxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsY0FBYyxDQUFDLENBQUM7cUJBQ25GO29CQUNELFdBQVcsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUNwQyxjQUFjLEdBQUcsUUFBUSxDQUFDO2lCQUMzQjtZQUNILENBQUMsQ0FBQyxDQUFDO1NBQ0o7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUNILE9BQU8sV0FBVyxDQUFDO0FBQ3JCLENBQUM7QUFFRCxTQUFTLFVBQVU7SUFDakIsSUFBSSxPQUFPLEdBQVUsRUFBRSxDQUFDO0lBQ3hCLFlBQVksQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUMzQyxVQUFTLElBQVksRUFBRSxVQUFrQixFQUFFLFVBQTBCLEVBQUUsSUFBUyxFQUFFLFdBQW1CO1FBQ25HLElBQUksWUFBWSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO1FBQzNGLElBQUksU0FBUyxHQUFHLGNBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ3JELElBQUksa0JBQUUsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUU7WUFDNUIsSUFBSSxZQUFZLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLENBQUM7WUFDM0QsSUFBSSxZQUFZLElBQUksSUFBSTtnQkFDdEIsWUFBWSxHQUFHLGdCQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxHQUFHLENBQUMsQ0FBQztZQUMzQyxJQUFJLEdBQUcsR0FBRyxDQUFDLGNBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQztZQUM1RCxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxFQUFDLElBQUksRUFBRSxjQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUMsRUFBQyxDQUFDO2lCQUN2RSxJQUFJLENBQUMsa0JBQU8sQ0FBQyxHQUFHLENBQUMsVUFBUyxJQUFJLEVBQUUsR0FBRyxFQUFFLElBQUk7Z0JBQ3hDLElBQUksUUFBUSxHQUFHLGNBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDbkQsSUFBSSxDQUFDLElBQUksR0FBRyxjQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxZQUFZLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQ2xHLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNyQixJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO1lBQ25CLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDSixPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1NBQ3RCO0lBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDSCxJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFO1FBQ3hCLE9BQU8sSUFBSSxDQUFDO0tBQ2I7SUFDRCxrRUFBa0U7SUFDbEUsSUFBSSxTQUFTLEdBQUcsZUFBRyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO0lBQzlDLEdBQUcsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDekMsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUNyQyxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQzthQUNoQixJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQzthQUMxQixFQUFFLENBQUMsS0FBSyxFQUFFO1lBQ1QsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUNuQixVQUFVLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3BDLE9BQU8sRUFBRSxDQUFDO1FBQ1osQ0FBQyxDQUFDO2FBQ0QsRUFBRSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztJQUN2QixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9pbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IGd1bHAgPSByZXF1aXJlKCdndWxwJyk7XG5pbXBvcnQgdGhyb3VnaCBmcm9tICd0aHJvdWdoMic7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5jb25zdCBlcyA9IHJlcXVpcmUoJ2V2ZW50LXN0cmVhbScpO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSk7XG5pbXBvcnQgKiBhcyBmZXRjaFJlbW90ZSBmcm9tICcuL2ZldGNoLXJlbW90ZSc7XG5jb25zdCBzZXJ2ZXJGYXZpY29uID0gcmVxdWlyZSgnc2VydmUtZmF2aWNvbicpO1xuaW1wb3J0IHtjcmVhdGVTdGF0aWNSb3V0ZSwgY3JlYXRlWmlwUm91dGV9IGZyb20gJy4vc3RhdGljLW1pZGRsZXdhcmUnO1xuaW1wb3J0IHtmYWxsYmFja0luZGV4SHRtbCwgcHJveHlUb0RldlNlcnZlcn0gZnJvbSAnLi9pbmRleC1odG1sLXJvdXRlJztcbmltcG9ydCB7YWN0aXZhdGUgYXMgYWN0aXZhdGVDZH0gZnJvbSAnLi9jb250ZW50LWRlcGxveWVyL2NkLXNlcnZlcic7XG5pbXBvcnQge0ltYXBNYW5hZ2VyfSBmcm9tICcuL2ZldGNoLXJlbW90ZS1pbWFwJztcbmltcG9ydCB7V2l0aE1haWxTZXJ2ZXJDb25maWd9IGZyb20gJy4vZmV0Y2gtdHlwZXMnO1xuaW1wb3J0IHNlcnZlSW5kZXggZnJvbSAnc2VydmUtaW5kZXgnO1xuLy8gY29uc3Qgc2V0dXBEZXZBc3NldHMgPSByZXF1aXJlKCcuL2Rpc3QvZGV2LXNlcnZlLWFzc2V0cycpLmRlZmF1bHQ7XG5cbmNvbnN0IGJ1aWxkVXRpbHMgPSBhcGkuYnVpbGRVdGlscztcblxuY29uc3QgcGFja2FnZVV0aWxzID0gYXBpLnBhY2thZ2VVdGlscztcbmNvbnN0IGNvbmZpZyA9IGFwaS5jb25maWc7XG5cbmV4cG9ydCBmdW5jdGlvbiBjb21waWxlKCkge1xuICBjb25zdCBhcmd2ID0gYXBpLmFyZ3Y7XG4gIGlmIChjb25maWcoKS5kZXZNb2RlICYmICFhcmd2LmNvcHlBc3NldHMpIHtcbiAgICBsb2cuaW5mbygnRGV2TW9kZSBlbmFibGVkLCBza2lwIGNvcHlpbmcgYXNzZXRzIHRvIHN0YXRpYyBmb2xkZXInKTtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKCFhcGkuaXNEZWZhdWx0TG9jYWxlKCkgJiYgIWFyZ3YuY29weUFzc2V0cykge1xuICAgIGxvZy5pbmZvKCdCdWlsZCBmb3IgXCIlc1wiIHdoaWNoIGlzIG5vdCBkZWZhdWx0IGxvY2FsZSwgc2tpcCBjb3B5aW5nIGFzc2V0cyB0byBzdGF0aWMgZm9sZGVyJyxcbiAgICAgIGFwaS5nZXRCdWlsZExvY2FsZSgpKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb3B5Um9vdFBhY2thZ2VGYXZpY29uKCk7XG4gIC8vIGNvbnN0IHt6aXBTdGF0aWN9ID0gcmVxdWlyZSgnLi9kaXN0L3ppcCcpO1xuICByZXR1cm4gY29weUFzc2V0cygpO1xuICAvLyAudGhlbih6aXBTdGF0aWMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVhY3RpdmF0ZSgpIHtcbiAgZmV0Y2hSZW1vdGUuc3RvcCgpO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGFjdGl2YXRlKCkge1xuICB2YXIgc3RhdGljRm9sZGVyID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdzdGF0aWNEaXInKTtcbiAgbG9nLmRlYnVnKCdleHByZXNzIHN0YXRpYyBwYXRoOiAnICsgc3RhdGljRm9sZGVyKTtcblxuXG4gIHZhciBmYXZpY29uID0gZmluZEZhdmljb24oKTtcbiAgaWYgKGZhdmljb24pXG4gICAgYXBpLnVzZShzZXJ2ZXJGYXZpY29uKGZhdmljb24pKTtcblxuICB2YXIgbWF4QWdlTWFwID0gYXBpLmNvbmZpZy5nZXQoYXBpLnBhY2thZ2VOYW1lICsgJy5jYWNoZUNvbnRyb2xNYXhBZ2UnLCB7XG4gICAgLy8gRm9ybWF0IGh0dHBzOi8vd3d3Lm5wbWpzLmNvbS9wYWNrYWdlL21zXG4gICAgLy8ganM6ICczNjUgZGF5cycsXG4gICAgLy8gY3NzOiAnMzY1IGRheXMnLFxuICAgIC8vIGxlc3M6ICczNjUgZGF5cycsXG4gICAgLy8gaHRtbDogMCwgLy8gbnVsbCBtZWFuaW5nICdjYWNoZS1jb250cm9sOiBuby1zdG9yZSdcbiAgICAvLyBwbmc6ICczNjUgZGF5cycsXG4gICAgLy8ganBnOiAnMzY1IGRheXMnLFxuICAgIC8vIGdpZjogJzM2NSBkYXlzJyxcbiAgICAvLyBzdmc6ICczNjUgZGF5cycsXG4gICAgLy8gZW90OiAzNjUgZGF5c1xuICAgIC8vIHR0ZjogMzY1IGRheXNcbiAgICAvLyB3b2ZmOiAzNjUgZGF5c1xuICAgIC8vIHdvZmYyOiAzNjUgZGF5c1xuICB9KTtcbiAgbG9nLmluZm8oJ2NhY2hlIGNvbnRyb2wnLCBtYXhBZ2VNYXApO1xuICBsb2cuaW5mbygnU2VydmUgc3RhdGljIGRpcicsIHN0YXRpY0ZvbGRlcik7XG5cbiAgcHJveHlUb0RldlNlcnZlcigpO1xuXG4gIGNvbnN0IHpzcyA9IGNyZWF0ZVppcFJvdXRlKG1heEFnZU1hcCk7XG4gIGFwaS51c2UoJy8nLCB6c3MuaGFuZGxlcik7XG4gIGNvbnN0IHN0YXRpY0hhbmRsZXIgPSBjcmVhdGVTdGF0aWNSb3V0ZShzdGF0aWNGb2xkZXIsIG1heEFnZU1hcCk7XG4gIGFwaS51c2UoJy8nLCBzdGF0aWNIYW5kbGVyKTtcbiAgYXBpLnVzZSgnLycsIGNyZWF0ZVN0YXRpY1JvdXRlKGFwaS5jb25maWcucmVzb2x2ZSgnZGxsRGVzdERpcicpLCBtYXhBZ2VNYXApKTtcblxuICBpZiAoYXBpLmNvbmZpZy5nZXQoW2FwaS5wYWNrYWdlTmFtZSwgJ3NlcnZlSW5kZXgnXSkpIHtcbiAgICBjb25zdCBzdHlsZXNoZWV0ID0gUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uL3NlcnZlLWluZGV4LmNzcycpO1xuICAgIGFwaS51c2UoJy8nLCBzZXJ2ZUluZGV4KHN0YXRpY0ZvbGRlciwge2ljb25zOiB0cnVlLCBzdHlsZXNoZWV0fSkpO1xuICB9IGVsc2Uge1xuICAgIGxvZy5pbmZvKGBJZiB5b3Ugd2FudCB0byBzZXJ2ZSBkaXJlY3RvcnkgaW5kZXggcGFnZSBvZiBzdGF0aWMgcmVzb3VyY2UgZm9sZGVyICR7c3RhdGljRm9sZGVyfVxcbmAgK1xuICAgICAgYCBzdGFydCBjb21tYW5kIHdpdGggXCItLXByb3AgJHthcGkucGFja2FnZU5hbWV9LnNlcnZlSW5kZXg9dHJ1ZSBzdGF0aWNEaXI9PHJlc291cmNlIGRpcmVjdG9yeT5gKTtcbiAgfVxuXG4gIGZhbGxiYWNrSW5kZXhIdG1sKCk7XG4gIGFwaS51c2UoJy8nLCBzdGF0aWNIYW5kbGVyKTsgLy8gU2VydmUgZmFsbGJhY2tlZCByZXF1ZXN0IHRvIGluZGV4Lmh0bWxcblxuICBjb25zdCBtYWlsU2V0dGluZyA9IChhcGkuY29uZmlnLmdldChhcGkucGFja2FnZU5hbWUpIGFzIFdpdGhNYWlsU2VydmVyQ29uZmlnKS5mZXRjaE1haWxTZXJ2ZXI7XG4gIGNvbnN0IGltYXAgPSBuZXcgSW1hcE1hbmFnZXIobWFpbFNldHRpbmcgPyBtYWlsU2V0dGluZy5lbnYgOiAnbG9jYWwnKTtcblxuICBhcGkuZXhwcmVzc0FwcFNldChhcHAgPT4gYWN0aXZhdGVDZChhcHAsIGltYXApKTtcblxuICBhcGkuZXZlbnRCdXMub24oJ2FwcENyZWF0ZWQnLCAoKSA9PiB7XG4gICAgLy8gYXBwQ3JlYXRlZCBldmVudCBpcyBlbWl0dGVkIGJ5IGV4cHJlc3MtYXBwXG4gICAgZmV0Y2hSZW1vdGUuc3RhcnQoaW1hcCk7XG4gIH0pO1xuXG4gIGlmICghYXBpLmNvbmZpZygpLmRldk1vZGUpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBzZXR1cERldkFzc2V0cyhhcGkuY29uZmlnKCkuc3RhdGljQXNzZXRzVVJMLCBhcGkudXNlLmJpbmQoYXBpKSk7XG59XG5cbmZ1bmN0aW9uIGNvcHlSb290UGFja2FnZUZhdmljb24oKSB7XG4gIHZhciBmYXZpY29uID0gZmluZEZhdmljb24oKTtcbiAgaWYgKCFmYXZpY29uKVxuICAgIHJldHVybjtcbiAgbG9nLmluZm8oJ0NvcHkgZmF2aWNvbi5pY28gZnJvbSAnICsgZmF2aWNvbik7XG4gIGZzLm1rZGlycFN5bmMoY29uZmlnLnJlc29sdmUoJ3N0YXRpY0RpcicpKTtcbiAgZnMuY29weVN5bmMoUGF0aC5yZXNvbHZlKGZhdmljb24pLCBQYXRoLnJlc29sdmUoY29uZmlnKCkucm9vdFBhdGgsIGNvbmZpZy5yZXNvbHZlKCdzdGF0aWNEaXInKSkpO1xufVxuXG5mdW5jdGlvbiBmaW5kRmF2aWNvbigpIHtcbiAgcmV0dXJuIF9maW5kRmF2aWNvbkluQ29uZmlnKCdwYWNrYWdlQ29udGV4dFBhdGhNYXBwaW5nJykgfHwgX2ZpbmRGYXZpY29uSW5Db25maWcoJ291dHB1dFBhdGhNYXAnKTtcbn1cblxuZnVuY3Rpb24gX2ZpbmRGYXZpY29uSW5Db25maWcocHJvcGVydHk6IHN0cmluZykge1xuICBpZiAoIWFwaS5jb25maWcoKVtwcm9wZXJ0eV0pIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBsZXQgZmF2aWNvbkZpbGU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgbGV0IGZhdmljb25QYWNrYWdlOiBzdHJpbmc7XG4gIF8uZWFjaChjb25maWcoKVtwcm9wZXJ0eV0sIChwYXRoLCBwa05hbWUpID0+IHtcbiAgICBpZiAocGF0aCA9PT0gJy8nKSB7XG4gICAgICBwYWNrYWdlVXRpbHMubG9va0ZvclBhY2thZ2VzKHBrTmFtZSwgKGZ1bGxOYW1lOiBzdHJpbmcsIGVudHJ5UGF0aDogc3RyaW5nLCBwYXJzZWROYW1lOiB7fSwganNvbjogYW55LCBwYWNrYWdlUGF0aDogc3RyaW5nKSA9PiB7XG4gICAgICAgIHZhciBhc3NldHNGb2xkZXIgPSBqc29uLmRyID8gKGpzb24uZHIuYXNzZXRzRGlyID8ganNvbi5kci5hc3NldHNEaXIgOiAnYXNzZXRzJykgOiAnYXNzZXRzJztcbiAgICAgICAgdmFyIGZhdmljb24gPSBQYXRoLmpvaW4ocGFja2FnZVBhdGgsIGFzc2V0c0ZvbGRlciwgJ2Zhdmljb24uaWNvJyk7XG4gICAgICAgIGlmIChmcy5leGlzdHNTeW5jKGZhdmljb24pKSB7XG4gICAgICAgICAgaWYgKGZhdmljb25GaWxlKSB7XG4gICAgICAgICAgICBsb2cud2FybignRm91bmQgZHVwbGljYXRlIGZhdmljb24gZmlsZSBpbicsIGZ1bGxOYW1lLCAnZXhpc3RpbmcnLCBmYXZpY29uUGFja2FnZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGZhdmljb25GaWxlID0gUGF0aC5yZXNvbHZlKGZhdmljb24pO1xuICAgICAgICAgIGZhdmljb25QYWNrYWdlID0gZnVsbE5hbWU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBmYXZpY29uRmlsZTtcbn1cblxuZnVuY3Rpb24gY29weUFzc2V0cygpIHtcbiAgdmFyIHN0cmVhbXM6IGFueVtdID0gW107XG4gIHBhY2thZ2VVdGlscy5maW5kQnJvd3NlclBhY2thZ2VCeVR5cGUoWycqJ10sXG4gIGZ1bmN0aW9uKG5hbWU6IHN0cmluZywgX2VudHJ5UGF0aDogc3RyaW5nLCBwYXJzZWROYW1lOiB7bmFtZTogc3RyaW5nfSwganNvbjogYW55LCBwYWNrYWdlUGF0aDogc3RyaW5nKSB7XG4gICAgdmFyIGFzc2V0c0ZvbGRlciA9IGpzb24uZHIgPyAoanNvbi5kci5hc3NldHNEaXIgPyBqc29uLmRyLmFzc2V0c0RpciA6ICdhc3NldHMnKSA6ICdhc3NldHMnO1xuICAgIHZhciBhc3NldHNEaXIgPSBQYXRoLmpvaW4ocGFja2FnZVBhdGgsIGFzc2V0c0ZvbGRlcik7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoYXNzZXRzRGlyKSkge1xuICAgICAgdmFyIGFzc2V0c0Rpck1hcCA9IGFwaS5jb25maWcuZ2V0KCdvdXRwdXRQYXRoTWFwLicgKyBuYW1lKTtcbiAgICAgIGlmIChhc3NldHNEaXJNYXAgIT0gbnVsbClcbiAgICAgICAgYXNzZXRzRGlyTWFwID0gXy50cmltKGFzc2V0c0Rpck1hcCwgJy8nKTtcbiAgICAgIHZhciBzcmMgPSBbUGF0aC5qb2luKHBhY2thZ2VQYXRoLCBhc3NldHNGb2xkZXIsICcqKicsICcqJyldO1xuICAgICAgdmFyIHN0cmVhbSA9IGd1bHAuc3JjKHNyYywge2Jhc2U6IFBhdGguam9pbihwYWNrYWdlUGF0aCwgYXNzZXRzRm9sZGVyKX0pXG4gICAgICAucGlwZSh0aHJvdWdoLm9iaihmdW5jdGlvbihmaWxlLCBlbmMsIG5leHQpIHtcbiAgICAgICAgdmFyIHBhdGhJblBrID0gUGF0aC5yZWxhdGl2ZShhc3NldHNEaXIsIGZpbGUucGF0aCk7XG4gICAgICAgIGZpbGUucGF0aCA9IFBhdGguam9pbihhc3NldHNEaXIsIGFzc2V0c0Rpck1hcCAhPSBudWxsID8gYXNzZXRzRGlyTWFwIDogcGFyc2VkTmFtZS5uYW1lLCBwYXRoSW5Qayk7XG4gICAgICAgIGxvZy5kZWJ1ZyhmaWxlLnBhdGgpO1xuICAgICAgICBuZXh0KG51bGwsIGZpbGUpO1xuICAgICAgfSkpO1xuICAgICAgc3RyZWFtcy5wdXNoKHN0cmVhbSk7XG4gICAgfVxuICB9KTtcbiAgaWYgKHN0cmVhbXMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgLy8gdmFyIGNvbnRleHRQYXRoID0gXy5nZXQoYXBpLCAnbmdFbnRyeUNvbXBvbmVudC5zaG9ydE5hbWUnLCAnJyk7XG4gIHZhciBvdXRwdXREaXIgPSBhcGkud2VicGFja0NvbmZpZy5vdXRwdXQucGF0aDtcbiAgbG9nLmluZm8oJ091dHB1dCBhc3NldHMgdG8gJywgb3V0cHV0RGlyKTtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBlcy5tZXJnZShzdHJlYW1zKVxuICAgIC5waXBlKGd1bHAuZGVzdChvdXRwdXREaXIpKVxuICAgIC5vbignZW5kJywgZnVuY3Rpb24oKSB7XG4gICAgICBsb2cuZGVidWcoJ2ZsdXNoJyk7XG4gICAgICBidWlsZFV0aWxzLndyaXRlVGltZXN0YW1wKCdhc3NldHMnKTtcbiAgICAgIHJlc29sdmUoKTtcbiAgICB9KVxuICAgIC5vbignZXJyb3InLCByZWplY3QpO1xuICB9KTtcbn1cbiJdfQ==
