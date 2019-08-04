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
const index_html_route_1 = tslib_1.__importDefault(require("./index-html-route"));
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
    index_html_route_1.default();
    const zss = static_middleware_1.createZipRoute(maxAgeMap);
    __api_1.default.use('/', zss.handler);
    __api_1.default.use('/', static_middleware_1.createStaticRoute(staticFolder, maxAgeMap));
    __api_1.default.use('/', static_middleware_1.createStaticRoute(__api_1.default.config.resolve('dllDestDir'), maxAgeMap));
    __api_1.default.eventBus.on('appCreated', () => {
        // appCreated event is emitted by express-app
        fetchRemote.start(zss);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM3QixnRUFBK0I7QUFDL0Isd0RBQXdCO0FBQ3hCLGdFQUEwQjtBQUMxQiw0REFBdUI7QUFDdkIsMERBQXdCO0FBQ3hCLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUNuQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUN6RCxvRUFBOEM7QUFDOUMsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQy9DLDJEQUFzRTtBQUN0RSxrRkFBcUQ7QUFDckQscUVBQXFFO0FBRXJFLE1BQU0sVUFBVSxHQUFHLGVBQUcsQ0FBQyxVQUFVLENBQUM7QUFFbEMsTUFBTSxZQUFZLEdBQUcsZUFBRyxDQUFDLFlBQVksQ0FBQztBQUN0QyxNQUFNLE1BQU0sR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDO0FBRTFCLFNBQWdCLE9BQU87SUFDckIsTUFBTSxJQUFJLEdBQUcsZUFBRyxDQUFDLElBQUksQ0FBQztJQUN0QixJQUFJLE1BQU0sRUFBRSxDQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUU7UUFDeEMsR0FBRyxDQUFDLElBQUksQ0FBQyx1REFBdUQsQ0FBQyxDQUFDO1FBQ2xFLE9BQU87S0FDUjtJQUNELElBQUksQ0FBQyxlQUFHLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFO1FBQzlDLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0ZBQWtGLEVBQ3pGLGVBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO1FBQ3hCLE9BQU87S0FDUjtJQUVELHNCQUFzQixFQUFFLENBQUM7SUFDekIsNkNBQTZDO0lBQzdDLE9BQU8sVUFBVSxFQUFFLENBQUM7SUFDcEIsb0JBQW9CO0FBQ3RCLENBQUM7QUFoQkQsMEJBZ0JDO0FBRUQsU0FBZ0IsVUFBVTtJQUN4QixXQUFXLENBQUMsSUFBSSxFQUFFLENBQUM7QUFDckIsQ0FBQztBQUZELGdDQUVDO0FBQ0QsU0FBZ0IsUUFBUTtJQUN0QixJQUFJLFlBQVksR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUNuRCxHQUFHLENBQUMsS0FBSyxDQUFDLHVCQUF1QixHQUFHLFlBQVksQ0FBQyxDQUFDO0lBRWxELElBQUksT0FBTyxHQUFHLFdBQVcsRUFBRSxDQUFDO0lBQzVCLElBQUksT0FBTztRQUNULGVBQUcsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7SUFFbEMsSUFBSSxTQUFTLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBRyxDQUFDLFdBQVcsR0FBRyxxQkFBcUIsRUFBRTtJQUN0RSwwQ0FBMEM7SUFDMUMsa0JBQWtCO0lBQ2xCLG1CQUFtQjtJQUNuQixvQkFBb0I7SUFDcEIscURBQXFEO0lBQ3JELG1CQUFtQjtJQUNuQixtQkFBbUI7SUFDbkIsbUJBQW1CO0lBQ25CLG1CQUFtQjtJQUNuQixnQkFBZ0I7SUFDaEIsZ0JBQWdCO0lBQ2hCLGlCQUFpQjtJQUNqQixrQkFBa0I7S0FDbkIsQ0FBQyxDQUFDO0lBQ0gsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsU0FBUyxDQUFDLENBQUM7SUFDckMsR0FBRyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxZQUFZLENBQUMsQ0FBQztJQUUzQywwQkFBbUIsRUFBRSxDQUFDO0lBRXRCLE1BQU0sR0FBRyxHQUFHLGtDQUFjLENBQUMsU0FBUyxDQUFDLENBQUM7SUFDdEMsZUFBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzFCLGVBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLHFDQUFpQixDQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDO0lBQ3pELGVBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLHFDQUFpQixDQUFDLGVBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFlBQVksQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUM7SUFFN0UsZUFBRyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsWUFBWSxFQUFFLEdBQUcsRUFBRTtRQUNqQyw2Q0FBNkM7UUFDN0MsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUN6QixDQUFDLENBQUMsQ0FBQztJQUVILElBQUksQ0FBQyxlQUFHLENBQUMsTUFBTSxFQUFFLENBQUMsT0FBTyxFQUFFO1FBQ3pCLE9BQU87S0FDUjtJQUVELG1FQUFtRTtBQUNyRSxDQUFDO0FBM0NELDRCQTJDQztBQUVELFNBQVMsc0JBQXNCO0lBQzdCLElBQUksT0FBTyxHQUFHLFdBQVcsRUFBRSxDQUFDO0lBQzVCLElBQUksQ0FBQyxPQUFPO1FBQ1YsT0FBTztJQUNULEdBQUcsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLEdBQUcsT0FBTyxDQUFDLENBQUM7SUFDN0Msa0JBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO0lBQzNDLGtCQUFFLENBQUMsUUFBUSxDQUFDLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsY0FBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkcsQ0FBQztBQUVELFNBQVMsV0FBVztJQUNsQixPQUFPLG9CQUFvQixDQUFDLDJCQUEyQixDQUFDLElBQUksb0JBQW9CLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDcEcsQ0FBQztBQUVELFNBQVMsb0JBQW9CLENBQUMsUUFBZ0I7SUFDNUMsSUFBSSxDQUFDLGVBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRTtRQUMzQixPQUFPLElBQUksQ0FBQztLQUNiO0lBQ0QsSUFBSSxXQUErQixDQUFDO0lBQ3BDLElBQUksY0FBc0IsQ0FBQztJQUMzQixnQkFBQyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUMxQyxJQUFJLElBQUksS0FBSyxHQUFHLEVBQUU7WUFDaEIsWUFBWSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxRQUFnQixFQUFFLFNBQWlCLEVBQUUsVUFBYyxFQUFFLElBQVMsRUFBRSxXQUFtQixFQUFFLEVBQUU7Z0JBQzNILElBQUksWUFBWSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO2dCQUMzRixJQUFJLE9BQU8sR0FBRyxjQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxZQUFZLEVBQUUsYUFBYSxDQUFDLENBQUM7Z0JBQ2xFLElBQUksa0JBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEVBQUU7b0JBQzFCLElBQUksV0FBVyxFQUFFO3dCQUNmLEdBQUcsQ0FBQyxJQUFJLENBQUMsaUNBQWlDLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxjQUFjLENBQUMsQ0FBQztxQkFDbkY7b0JBQ0QsV0FBVyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7b0JBQ3BDLGNBQWMsR0FBRyxRQUFRLENBQUM7aUJBQzNCO1lBQ0gsQ0FBQyxDQUFDLENBQUM7U0FDSjtJQUNILENBQUMsQ0FBQyxDQUFDO0lBQ0gsT0FBTyxXQUFXLENBQUM7QUFDckIsQ0FBQztBQUVELFNBQVMsVUFBVTtJQUNqQixJQUFJLE9BQU8sR0FBVSxFQUFFLENBQUM7SUFDeEIsWUFBWSxDQUFDLHdCQUF3QixDQUFDLENBQUMsR0FBRyxDQUFDLEVBQzNDLFVBQVMsSUFBWSxFQUFFLFVBQWtCLEVBQUUsVUFBMEIsRUFBRSxJQUFTLEVBQUUsV0FBbUI7UUFDbkcsSUFBSSxZQUFZLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7UUFDM0YsSUFBSSxTQUFTLEdBQUcsY0FBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDLENBQUM7UUFDckQsSUFBSSxrQkFBRSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsRUFBRTtZQUM1QixJQUFJLFlBQVksR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsQ0FBQztZQUMzRCxJQUFJLFlBQVksSUFBSSxJQUFJO2dCQUN0QixZQUFZLEdBQUcsZ0JBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzNDLElBQUksR0FBRyxHQUFHLENBQUMsY0FBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1lBQzVELElBQUksTUFBTSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLEVBQUMsSUFBSSxFQUFFLGNBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQyxFQUFDLENBQUM7aUJBQ3ZFLElBQUksQ0FBQyxrQkFBTyxDQUFDLEdBQUcsQ0FBQyxVQUFTLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSTtnQkFDeEMsSUFBSSxRQUFRLEdBQUcsY0FBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2dCQUNuRCxJQUFJLENBQUMsSUFBSSxHQUFHLGNBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLFlBQVksSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDbEcsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ3JCLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7WUFDbkIsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNKLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7U0FDdEI7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUNILElBQUksT0FBTyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7UUFDeEIsT0FBTyxJQUFJLENBQUM7S0FDYjtJQUNELGtFQUFrRTtJQUNsRSxJQUFJLFNBQVMsR0FBRyxlQUFHLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7SUFDOUMsR0FBRyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxTQUFTLENBQUMsQ0FBQztJQUN6QyxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3JDLEVBQUUsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDO2FBQ2hCLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2FBQzFCLEVBQUUsQ0FBQyxLQUFLLEVBQUU7WUFDVCxHQUFHLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ25CLFVBQVUsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDcEMsT0FBTyxFQUFFLENBQUM7UUFDWixDQUFDLENBQUM7YUFDRCxFQUFFLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ3ZCLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvYXNzZXRzLXByb2Nlc3Nlci9kaXN0L2luZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgZ3VscCA9IHJlcXVpcmUoJ2d1bHAnKTtcbmltcG9ydCB0aHJvdWdoIGZyb20gJ3Rocm91Z2gyJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzLWV4dHJhJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmNvbnN0IGVzID0gcmVxdWlyZSgnZXZlbnQtc3RyZWFtJyk7XG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lKTtcbmltcG9ydCAqIGFzIGZldGNoUmVtb3RlIGZyb20gJy4vZmV0Y2gtcmVtb3RlJztcbmNvbnN0IHNlcnZlckZhdmljb24gPSByZXF1aXJlKCdzZXJ2ZS1mYXZpY29uJyk7XG5pbXBvcnQge2NyZWF0ZVN0YXRpY1JvdXRlLCBjcmVhdGVaaXBSb3V0ZX0gZnJvbSAnLi9zdGF0aWMtbWlkZGxld2FyZSc7XG5pbXBvcnQgcmVzb3VyY2VQYXRoUmV3cml0ZSBmcm9tICcuL2luZGV4LWh0bWwtcm91dGUnO1xuLy8gY29uc3Qgc2V0dXBEZXZBc3NldHMgPSByZXF1aXJlKCcuL2Rpc3QvZGV2LXNlcnZlLWFzc2V0cycpLmRlZmF1bHQ7XG5cbmNvbnN0IGJ1aWxkVXRpbHMgPSBhcGkuYnVpbGRVdGlscztcblxuY29uc3QgcGFja2FnZVV0aWxzID0gYXBpLnBhY2thZ2VVdGlscztcbmNvbnN0IGNvbmZpZyA9IGFwaS5jb25maWc7XG5cbmV4cG9ydCBmdW5jdGlvbiBjb21waWxlKCkge1xuICBjb25zdCBhcmd2ID0gYXBpLmFyZ3Y7XG4gIGlmIChjb25maWcoKS5kZXZNb2RlICYmICFhcmd2LmNvcHlBc3NldHMpIHtcbiAgICBsb2cuaW5mbygnRGV2TW9kZSBlbmFibGVkLCBza2lwIGNvcHlpbmcgYXNzZXRzIHRvIHN0YXRpYyBmb2xkZXInKTtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKCFhcGkuaXNEZWZhdWx0TG9jYWxlKCkgJiYgIWFyZ3YuY29weUFzc2V0cykge1xuICAgIGxvZy5pbmZvKCdCdWlsZCBmb3IgXCIlc1wiIHdoaWNoIGlzIG5vdCBkZWZhdWx0IGxvY2FsZSwgc2tpcCBjb3B5aW5nIGFzc2V0cyB0byBzdGF0aWMgZm9sZGVyJyxcbiAgICAgIGFwaS5nZXRCdWlsZExvY2FsZSgpKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb3B5Um9vdFBhY2thZ2VGYXZpY29uKCk7XG4gIC8vIGNvbnN0IHt6aXBTdGF0aWN9ID0gcmVxdWlyZSgnLi9kaXN0L3ppcCcpO1xuICByZXR1cm4gY29weUFzc2V0cygpO1xuICAvLyAudGhlbih6aXBTdGF0aWMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVhY3RpdmF0ZSgpIHtcbiAgZmV0Y2hSZW1vdGUuc3RvcCgpO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGFjdGl2YXRlKCkge1xuICB2YXIgc3RhdGljRm9sZGVyID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdzdGF0aWNEaXInKTtcbiAgbG9nLmRlYnVnKCdleHByZXNzIHN0YXRpYyBwYXRoOiAnICsgc3RhdGljRm9sZGVyKTtcblxuICB2YXIgZmF2aWNvbiA9IGZpbmRGYXZpY29uKCk7XG4gIGlmIChmYXZpY29uKVxuICAgIGFwaS51c2Uoc2VydmVyRmF2aWNvbihmYXZpY29uKSk7XG5cbiAgdmFyIG1heEFnZU1hcCA9IGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSArICcuY2FjaGVDb250cm9sTWF4QWdlJywge1xuICAgIC8vIEZvcm1hdCBodHRwczovL3d3dy5ucG1qcy5jb20vcGFja2FnZS9tc1xuICAgIC8vIGpzOiAnMzY1IGRheXMnLFxuICAgIC8vIGNzczogJzM2NSBkYXlzJyxcbiAgICAvLyBsZXNzOiAnMzY1IGRheXMnLFxuICAgIC8vIGh0bWw6IDAsIC8vIG51bGwgbWVhbmluZyAnY2FjaGUtY29udHJvbDogbm8tc3RvcmUnXG4gICAgLy8gcG5nOiAnMzY1IGRheXMnLFxuICAgIC8vIGpwZzogJzM2NSBkYXlzJyxcbiAgICAvLyBnaWY6ICczNjUgZGF5cycsXG4gICAgLy8gc3ZnOiAnMzY1IGRheXMnLFxuICAgIC8vIGVvdDogMzY1IGRheXNcbiAgICAvLyB0dGY6IDM2NSBkYXlzXG4gICAgLy8gd29mZjogMzY1IGRheXNcbiAgICAvLyB3b2ZmMjogMzY1IGRheXNcbiAgfSk7XG4gIGxvZy5pbmZvKCdjYWNoZSBjb250cm9sJywgbWF4QWdlTWFwKTtcbiAgbG9nLmluZm8oJ1NlcnZlIHN0YXRpYyBkaXInLCBzdGF0aWNGb2xkZXIpO1xuXG4gIHJlc291cmNlUGF0aFJld3JpdGUoKTtcblxuICBjb25zdCB6c3MgPSBjcmVhdGVaaXBSb3V0ZShtYXhBZ2VNYXApO1xuICBhcGkudXNlKCcvJywgenNzLmhhbmRsZXIpO1xuICBhcGkudXNlKCcvJywgY3JlYXRlU3RhdGljUm91dGUoc3RhdGljRm9sZGVyLCBtYXhBZ2VNYXApKTtcbiAgYXBpLnVzZSgnLycsIGNyZWF0ZVN0YXRpY1JvdXRlKGFwaS5jb25maWcucmVzb2x2ZSgnZGxsRGVzdERpcicpLCBtYXhBZ2VNYXApKTtcblxuICBhcGkuZXZlbnRCdXMub24oJ2FwcENyZWF0ZWQnLCAoKSA9PiB7XG4gICAgLy8gYXBwQ3JlYXRlZCBldmVudCBpcyBlbWl0dGVkIGJ5IGV4cHJlc3MtYXBwXG4gICAgZmV0Y2hSZW1vdGUuc3RhcnQoenNzKTtcbiAgfSk7XG5cbiAgaWYgKCFhcGkuY29uZmlnKCkuZGV2TW9kZSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIHNldHVwRGV2QXNzZXRzKGFwaS5jb25maWcoKS5zdGF0aWNBc3NldHNVUkwsIGFwaS51c2UuYmluZChhcGkpKTtcbn1cblxuZnVuY3Rpb24gY29weVJvb3RQYWNrYWdlRmF2aWNvbigpIHtcbiAgdmFyIGZhdmljb24gPSBmaW5kRmF2aWNvbigpO1xuICBpZiAoIWZhdmljb24pXG4gICAgcmV0dXJuO1xuICBsb2cuaW5mbygnQ29weSBmYXZpY29uLmljbyBmcm9tICcgKyBmYXZpY29uKTtcbiAgZnMubWtkaXJwU3luYyhjb25maWcucmVzb2x2ZSgnc3RhdGljRGlyJykpO1xuICBmcy5jb3B5U3luYyhQYXRoLnJlc29sdmUoZmF2aWNvbiksIFBhdGgucmVzb2x2ZShjb25maWcoKS5yb290UGF0aCwgY29uZmlnLnJlc29sdmUoJ3N0YXRpY0RpcicpKSk7XG59XG5cbmZ1bmN0aW9uIGZpbmRGYXZpY29uKCkge1xuICByZXR1cm4gX2ZpbmRGYXZpY29uSW5Db25maWcoJ3BhY2thZ2VDb250ZXh0UGF0aE1hcHBpbmcnKSB8fCBfZmluZEZhdmljb25JbkNvbmZpZygnb3V0cHV0UGF0aE1hcCcpO1xufVxuXG5mdW5jdGlvbiBfZmluZEZhdmljb25JbkNvbmZpZyhwcm9wZXJ0eTogc3RyaW5nKSB7XG4gIGlmICghYXBpLmNvbmZpZygpW3Byb3BlcnR5XSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGxldCBmYXZpY29uRmlsZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBsZXQgZmF2aWNvblBhY2thZ2U6IHN0cmluZztcbiAgXy5lYWNoKGNvbmZpZygpW3Byb3BlcnR5XSwgKHBhdGgsIHBrTmFtZSkgPT4ge1xuICAgIGlmIChwYXRoID09PSAnLycpIHtcbiAgICAgIHBhY2thZ2VVdGlscy5sb29rRm9yUGFja2FnZXMocGtOYW1lLCAoZnVsbE5hbWU6IHN0cmluZywgZW50cnlQYXRoOiBzdHJpbmcsIHBhcnNlZE5hbWU6IHt9LCBqc29uOiBhbnksIHBhY2thZ2VQYXRoOiBzdHJpbmcpID0+IHtcbiAgICAgICAgdmFyIGFzc2V0c0ZvbGRlciA9IGpzb24uZHIgPyAoanNvbi5kci5hc3NldHNEaXIgPyBqc29uLmRyLmFzc2V0c0RpciA6ICdhc3NldHMnKSA6ICdhc3NldHMnO1xuICAgICAgICB2YXIgZmF2aWNvbiA9IFBhdGguam9pbihwYWNrYWdlUGF0aCwgYXNzZXRzRm9sZGVyLCAnZmF2aWNvbi5pY28nKTtcbiAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoZmF2aWNvbikpIHtcbiAgICAgICAgICBpZiAoZmF2aWNvbkZpbGUpIHtcbiAgICAgICAgICAgIGxvZy53YXJuKCdGb3VuZCBkdXBsaWNhdGUgZmF2aWNvbiBmaWxlIGluJywgZnVsbE5hbWUsICdleGlzdGluZycsIGZhdmljb25QYWNrYWdlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZmF2aWNvbkZpbGUgPSBQYXRoLnJlc29sdmUoZmF2aWNvbik7XG4gICAgICAgICAgZmF2aWNvblBhY2thZ2UgPSBmdWxsTmFtZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIGZhdmljb25GaWxlO1xufVxuXG5mdW5jdGlvbiBjb3B5QXNzZXRzKCkge1xuICB2YXIgc3RyZWFtczogYW55W10gPSBbXTtcbiAgcGFja2FnZVV0aWxzLmZpbmRCcm93c2VyUGFja2FnZUJ5VHlwZShbJyonXSxcbiAgZnVuY3Rpb24obmFtZTogc3RyaW5nLCBfZW50cnlQYXRoOiBzdHJpbmcsIHBhcnNlZE5hbWU6IHtuYW1lOiBzdHJpbmd9LCBqc29uOiBhbnksIHBhY2thZ2VQYXRoOiBzdHJpbmcpIHtcbiAgICB2YXIgYXNzZXRzRm9sZGVyID0ganNvbi5kciA/IChqc29uLmRyLmFzc2V0c0RpciA/IGpzb24uZHIuYXNzZXRzRGlyIDogJ2Fzc2V0cycpIDogJ2Fzc2V0cyc7XG4gICAgdmFyIGFzc2V0c0RpciA9IFBhdGguam9pbihwYWNrYWdlUGF0aCwgYXNzZXRzRm9sZGVyKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhhc3NldHNEaXIpKSB7XG4gICAgICB2YXIgYXNzZXRzRGlyTWFwID0gYXBpLmNvbmZpZy5nZXQoJ291dHB1dFBhdGhNYXAuJyArIG5hbWUpO1xuICAgICAgaWYgKGFzc2V0c0Rpck1hcCAhPSBudWxsKVxuICAgICAgICBhc3NldHNEaXJNYXAgPSBfLnRyaW0oYXNzZXRzRGlyTWFwLCAnLycpO1xuICAgICAgdmFyIHNyYyA9IFtQYXRoLmpvaW4ocGFja2FnZVBhdGgsIGFzc2V0c0ZvbGRlciwgJyoqJywgJyonKV07XG4gICAgICB2YXIgc3RyZWFtID0gZ3VscC5zcmMoc3JjLCB7YmFzZTogUGF0aC5qb2luKHBhY2thZ2VQYXRoLCBhc3NldHNGb2xkZXIpfSlcbiAgICAgIC5waXBlKHRocm91Z2gub2JqKGZ1bmN0aW9uKGZpbGUsIGVuYywgbmV4dCkge1xuICAgICAgICB2YXIgcGF0aEluUGsgPSBQYXRoLnJlbGF0aXZlKGFzc2V0c0RpciwgZmlsZS5wYXRoKTtcbiAgICAgICAgZmlsZS5wYXRoID0gUGF0aC5qb2luKGFzc2V0c0RpciwgYXNzZXRzRGlyTWFwICE9IG51bGwgPyBhc3NldHNEaXJNYXAgOiBwYXJzZWROYW1lLm5hbWUsIHBhdGhJblBrKTtcbiAgICAgICAgbG9nLmRlYnVnKGZpbGUucGF0aCk7XG4gICAgICAgIG5leHQobnVsbCwgZmlsZSk7XG4gICAgICB9KSk7XG4gICAgICBzdHJlYW1zLnB1c2goc3RyZWFtKTtcbiAgICB9XG4gIH0pO1xuICBpZiAoc3RyZWFtcy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICAvLyB2YXIgY29udGV4dFBhdGggPSBfLmdldChhcGksICduZ0VudHJ5Q29tcG9uZW50LnNob3J0TmFtZScsICcnKTtcbiAgdmFyIG91dHB1dERpciA9IGFwaS53ZWJwYWNrQ29uZmlnLm91dHB1dC5wYXRoO1xuICBsb2cuaW5mbygnT3V0cHV0IGFzc2V0cyB0byAnLCBvdXRwdXREaXIpO1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGVzLm1lcmdlKHN0cmVhbXMpXG4gICAgLnBpcGUoZ3VscC5kZXN0KG91dHB1dERpcikpXG4gICAgLm9uKCdlbmQnLCBmdW5jdGlvbigpIHtcbiAgICAgIGxvZy5kZWJ1ZygnZmx1c2gnKTtcbiAgICAgIGJ1aWxkVXRpbHMud3JpdGVUaW1lc3RhbXAoJ2Fzc2V0cycpO1xuICAgICAgcmVzb2x2ZSgpO1xuICAgIH0pXG4gICAgLm9uKCdlcnJvcicsIHJlamVjdCk7XG4gIH0pO1xufVxuIl19
