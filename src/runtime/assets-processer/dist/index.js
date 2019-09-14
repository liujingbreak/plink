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
    index_html_route_1.fallbackIndexHtml();
    __api_1.default.use('/', staticHandler); // Serve fallbacked request to index.html
    __api_1.default.eventBus.on('appCreated', () => {
        // appCreated event is emitted by express-app
        fetchRemote.start();
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM3QixnRUFBK0I7QUFDL0Isd0RBQXdCO0FBQ3hCLGdFQUEwQjtBQUMxQiw0REFBdUI7QUFDdkIsMERBQXdCO0FBQ3hCLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUNuQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUN6RCxvRUFBOEM7QUFDOUMsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQy9DLDJEQUFzRTtBQUN0RSx5REFBdUU7QUFDdkUscUVBQXFFO0FBRXJFLE1BQU0sVUFBVSxHQUFHLGVBQUcsQ0FBQyxVQUFVLENBQUM7QUFFbEMsTUFBTSxZQUFZLEdBQUcsZUFBRyxDQUFDLFlBQVksQ0FBQztBQUN0QyxNQUFNLE1BQU0sR0FBRyxlQUFHLENBQUMsTUFBTSxDQUFDO0FBRTFCLFNBQWdCLE9BQU87SUFDckIsTUFBTSxJQUFJLEdBQUcsZUFBRyxDQUFDLElBQUksQ0FBQztJQUN0QixJQUFJLE1BQU0sRUFBRSxDQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUU7UUFDeEMsR0FBRyxDQUFDLElBQUksQ0FBQyx1REFBdUQsQ0FBQyxDQUFDO1FBQ2xFLE9BQU87S0FDUjtJQUNELElBQUksQ0FBQyxlQUFHLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFO1FBQzlDLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0ZBQWtGLEVBQ3pGLGVBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO1FBQ3hCLE9BQU87S0FDUjtJQUVELHNCQUFz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LENBQUM7WUFDbkIsVUFBVSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQztZQUNwQyxPQUFPLEVBQUUsQ0FBQztRQUNaLENBQUMsQ0FBQzthQUNELEVBQUUsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDdkIsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBndWxwID0gcmVxdWlyZSgnZ3VscCcpO1xuaW1wb3J0IHRocm91Z2ggZnJvbSAndGhyb3VnaDInO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuY29uc3QgZXMgPSByZXF1aXJlKCdldmVudC1zdHJlYW0nKTtcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUpO1xuaW1wb3J0ICogYXMgZmV0Y2hSZW1vdGUgZnJvbSAnLi9mZXRjaC1yZW1vdGUnO1xuY29uc3Qgc2VydmVyRmF2aWNvbiA9IHJlcXVpcmUoJ3NlcnZlLWZhdmljb24nKTtcbmltcG9ydCB7Y3JlYXRlU3RhdGljUm91dGUsIGNyZWF0ZVppcFJvdXRlfSBmcm9tICcuL3N0YXRpYy1taWRkbGV3YXJlJztcbmltcG9ydCB7ZmFsbGJhY2tJbmRleEh0bWwsIHByb3h5VG9EZXZTZXJ2ZXJ9IGZyb20gJy4vaW5kZXgtaHRtbC1yb3V0ZSc7XG4vLyBjb25zdCBzZXR1cERldkFzc2V0cyA9IHJlcXVpcmUoJy4vZGlzdC9kZXYtc2VydmUtYXNzZXRzJykuZGVmYXVsdDtcblxuY29uc3QgYnVpbGRVdGlscyA9IGFwaS5idWlsZFV0aWxzO1xuXG5jb25zdCBwYWNrYWdlVXRpbHMgPSBhcGkucGFja2FnZVV0aWxzO1xuY29uc3QgY29uZmlnID0gYXBpLmNvbmZpZztcblxuZXhwb3J0IGZ1bmN0aW9uIGNvbXBpbGUoKSB7XG4gIGNvbnN0IGFyZ3YgPSBhcGkuYXJndjtcbiAgaWYgKGNvbmZpZygpLmRldk1vZGUgJiYgIWFyZ3YuY29weUFzc2V0cykge1xuICAgIGxvZy5pbmZvKCdEZXZNb2RlIGVuYWJsZWQsIHNraXAgY29weWluZyBhc3NldHMgdG8gc3RhdGljIGZvbGRlcicpO1xuICAgIHJldHVybjtcbiAgfVxuICBpZiAoIWFwaS5pc0RlZmF1bHRMb2NhbGUoKSAmJiAhYXJndi5jb3B5QXNzZXRzKSB7XG4gICAgbG9nLmluZm8oJ0J1aWxkIGZvciBcIiVzXCIgd2hpY2ggaXMgbm90IGRlZmF1bHQgbG9jYWxlLCBza2lwIGNvcHlpbmcgYXNzZXRzIHRvIHN0YXRpYyBmb2xkZXInLFxuICAgICAgYXBpLmdldEJ1aWxkTG9jYWxlKCkpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGNvcHlSb290UGFja2FnZUZhdmljb24oKTtcbiAgLy8gY29uc3Qge3ppcFN0YXRpY30gPSByZXF1aXJlKCcuL2Rpc3QvemlwJyk7XG4gIHJldHVybiBjb3B5QXNzZXRzKCk7XG4gIC8vIC50aGVuKHppcFN0YXRpYyk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWFjdGl2YXRlKCkge1xuICBmZXRjaFJlbW90ZS5zdG9wKCk7XG59XG5leHBvcnQgZnVuY3Rpb24gYWN0aXZhdGUoKSB7XG4gIHZhciBzdGF0aWNGb2xkZXIgPSBhcGkuY29uZmlnLnJlc29sdmUoJ3N0YXRpY0RpcicpO1xuICBsb2cuZGVidWcoJ2V4cHJlc3Mgc3RhdGljIHBhdGg6ICcgKyBzdGF0aWNGb2xkZXIpO1xuXG4gIHZhciBmYXZpY29uID0gZmluZEZhdmljb24oKTtcbiAgaWYgKGZhdmljb24pXG4gICAgYXBpLnVzZShzZXJ2ZXJGYXZpY29uKGZhdmljb24pKTtcblxuICB2YXIgbWF4QWdlTWFwID0gYXBpLmNvbmZpZy5nZXQoYXBpLnBhY2thZ2VOYW1lICsgJy5jYWNoZUNvbnRyb2xNYXhBZ2UnLCB7XG4gICAgLy8gRm9ybWF0IGh0dHBzOi8vd3d3Lm5wbWpzLmNvbS9wYWNrYWdlL21zXG4gICAgLy8ganM6ICczNjUgZGF5cycsXG4gICAgLy8gY3NzOiAnMzY1IGRheXMnLFxuICAgIC8vIGxlc3M6ICczNjUgZGF5cycsXG4gICAgLy8gaHRtbDogMCwgLy8gbnVsbCBtZWFuaW5nICdjYWNoZS1jb250cm9sOiBuby1zdG9yZSdcbiAgICAvLyBwbmc6ICczNjUgZGF5cycsXG4gICAgLy8ganBnOiAnMzY1IGRheXMnLFxuICAgIC8vIGdpZjogJzM2NSBkYXlzJyxcbiAgICAvLyBzdmc6ICczNjUgZGF5cycsXG4gICAgLy8gZW90OiAzNjUgZGF5c1xuICAgIC8vIHR0ZjogMzY1IGRheXNcbiAgICAvLyB3b2ZmOiAzNjUgZGF5c1xuICAgIC8vIHdvZmYyOiAzNjUgZGF5c1xuICB9KTtcbiAgbG9nLmluZm8oJ2NhY2hlIGNvbnRyb2wnLCBtYXhBZ2VNYXApO1xuICBsb2cuaW5mbygnU2VydmUgc3RhdGljIGRpcicsIHN0YXRpY0ZvbGRlcik7XG5cbiAgcHJveHlUb0RldlNlcnZlcigpO1xuXG4gIGNvbnN0IHpzcyA9IGNyZWF0ZVppcFJvdXRlKG1heEFnZU1hcCk7XG4gIGFwaS51c2UoJy8nLCB6c3MuaGFuZGxlcik7XG4gIGNvbnN0IHN0YXRpY0hhbmRsZXIgPSBjcmVhdGVTdGF0aWNSb3V0ZShzdGF0aWNGb2xkZXIsIG1heEFnZU1hcCk7XG4gIGFwaS51c2UoJy8nLCBzdGF0aWNIYW5kbGVyKTtcbiAgYXBpLnVzZSgnLycsIGNyZWF0ZVN0YXRpY1JvdXRlKGFwaS5jb25maWcucmVzb2x2ZSgnZGxsRGVzdERpcicpLCBtYXhBZ2VNYXApKTtcblxuICBmYWxsYmFja0luZGV4SHRtbCgpO1xuICBhcGkudXNlKCcvJywgc3RhdGljSGFuZGxlcik7IC8vIFNlcnZlIGZhbGxiYWNrZWQgcmVxdWVzdCB0byBpbmRleC5odG1sXG5cbiAgYXBpLmV2ZW50QnVzLm9uKCdhcHBDcmVhdGVkJywgKCkgPT4ge1xuICAgIC8vIGFwcENyZWF0ZWQgZXZlbnQgaXMgZW1pdHRlZCBieSBleHByZXNzLWFwcFxuICAgIGZldGNoUmVtb3RlLnN0YXJ0KCk7XG4gIH0pO1xuXG4gIGlmICghYXBpLmNvbmZpZygpLmRldk1vZGUpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBzZXR1cERldkFzc2V0cyhhcGkuY29uZmlnKCkuc3RhdGljQXNzZXRzVVJMLCBhcGkudXNlLmJpbmQoYXBpKSk7XG59XG5cbmZ1bmN0aW9uIGNvcHlSb290UGFja2FnZUZhdmljb24oKSB7XG4gIHZhciBmYXZpY29uID0gZmluZEZhdmljb24oKTtcbiAgaWYgKCFmYXZpY29uKVxuICAgIHJldHVybjtcbiAgbG9nLmluZm8oJ0NvcHkgZmF2aWNvbi5pY28gZnJvbSAnICsgZmF2aWNvbik7XG4gIGZzLm1rZGlycFN5bmMoY29uZmlnLnJlc29sdmUoJ3N0YXRpY0RpcicpKTtcbiAgZnMuY29weVN5bmMoUGF0aC5yZXNvbHZlKGZhdmljb24pLCBQYXRoLnJlc29sdmUoY29uZmlnKCkucm9vdFBhdGgsIGNvbmZpZy5yZXNvbHZlKCdzdGF0aWNEaXInKSkpO1xufVxuXG5mdW5jdGlvbiBmaW5kRmF2aWNvbigpIHtcbiAgcmV0dXJuIF9maW5kRmF2aWNvbkluQ29uZmlnKCdwYWNrYWdlQ29udGV4dFBhdGhNYXBwaW5nJykgfHwgX2ZpbmRGYXZpY29uSW5Db25maWcoJ291dHB1dFBhdGhNYXAnKTtcbn1cblxuZnVuY3Rpb24gX2ZpbmRGYXZpY29uSW5Db25maWcocHJvcGVydHk6IHN0cmluZykge1xuICBpZiAoIWFwaS5jb25maWcoKVtwcm9wZXJ0eV0pIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBsZXQgZmF2aWNvbkZpbGU6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgbGV0IGZhdmljb25QYWNrYWdlOiBzdHJpbmc7XG4gIF8uZWFjaChjb25maWcoKVtwcm9wZXJ0eV0sIChwYXRoLCBwa05hbWUpID0+IHtcbiAgICBpZiAocGF0aCA9PT0gJy8nKSB7XG4gICAgICBwYWNrYWdlVXRpbHMubG9va0ZvclBhY2thZ2VzKHBrTmFtZSwgKGZ1bGxOYW1lOiBzdHJpbmcsIGVudHJ5UGF0aDogc3RyaW5nLCBwYXJzZWROYW1lOiB7fSwganNvbjogYW55LCBwYWNrYWdlUGF0aDogc3RyaW5nKSA9PiB7XG4gICAgICAgIHZhciBhc3NldHNGb2xkZXIgPSBqc29uLmRyID8gKGpzb24uZHIuYXNzZXRzRGlyID8ganNvbi5kci5hc3NldHNEaXIgOiAnYXNzZXRzJykgOiAnYXNzZXRzJztcbiAgICAgICAgdmFyIGZhdmljb24gPSBQYXRoLmpvaW4ocGFja2FnZVBhdGgsIGFzc2V0c0ZvbGRlciwgJ2Zhdmljb24uaWNvJyk7XG4gICAgICAgIGlmIChmcy5leGlzdHNTeW5jKGZhdmljb24pKSB7XG4gICAgICAgICAgaWYgKGZhdmljb25GaWxlKSB7XG4gICAgICAgICAgICBsb2cud2FybignRm91bmQgZHVwbGljYXRlIGZhdmljb24gZmlsZSBpbicsIGZ1bGxOYW1lLCAnZXhpc3RpbmcnLCBmYXZpY29uUGFja2FnZSk7XG4gICAgICAgICAgfVxuICAgICAgICAgIGZhdmljb25GaWxlID0gUGF0aC5yZXNvbHZlKGZhdmljb24pO1xuICAgICAgICAgIGZhdmljb25QYWNrYWdlID0gZnVsbE5hbWU7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBmYXZpY29uRmlsZTtcbn1cblxuZnVuY3Rpb24gY29weUFzc2V0cygpIHtcbiAgdmFyIHN0cmVhbXM6IGFueVtdID0gW107XG4gIHBhY2thZ2VVdGlscy5maW5kQnJvd3NlclBhY2thZ2VCeVR5cGUoWycqJ10sXG4gIGZ1bmN0aW9uKG5hbWU6IHN0cmluZywgX2VudHJ5UGF0aDogc3RyaW5nLCBwYXJzZWROYW1lOiB7bmFtZTogc3RyaW5nfSwganNvbjogYW55LCBwYWNrYWdlUGF0aDogc3RyaW5nKSB7XG4gICAgdmFyIGFzc2V0c0ZvbGRlciA9IGpzb24uZHIgPyAoanNvbi5kci5hc3NldHNEaXIgPyBqc29uLmRyLmFzc2V0c0RpciA6ICdhc3NldHMnKSA6ICdhc3NldHMnO1xuICAgIHZhciBhc3NldHNEaXIgPSBQYXRoLmpvaW4ocGFja2FnZVBhdGgsIGFzc2V0c0ZvbGRlcik7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMoYXNzZXRzRGlyKSkge1xuICAgICAgdmFyIGFzc2V0c0Rpck1hcCA9IGFwaS5jb25maWcuZ2V0KCdvdXRwdXRQYXRoTWFwLicgKyBuYW1lKTtcbiAgICAgIGlmIChhc3NldHNEaXJNYXAgIT0gbnVsbClcbiAgICAgICAgYXNzZXRzRGlyTWFwID0gXy50cmltKGFzc2V0c0Rpck1hcCwgJy8nKTtcbiAgICAgIHZhciBzcmMgPSBbUGF0aC5qb2luKHBhY2thZ2VQYXRoLCBhc3NldHNGb2xkZXIsICcqKicsICcqJyldO1xuICAgICAgdmFyIHN0cmVhbSA9IGd1bHAuc3JjKHNyYywge2Jhc2U6IFBhdGguam9pbihwYWNrYWdlUGF0aCwgYXNzZXRzRm9sZGVyKX0pXG4gICAgICAucGlwZSh0aHJvdWdoLm9iaihmdW5jdGlvbihmaWxlLCBlbmMsIG5leHQpIHtcbiAgICAgICAgdmFyIHBhdGhJblBrID0gUGF0aC5yZWxhdGl2ZShhc3NldHNEaXIsIGZpbGUucGF0aCk7XG4gICAgICAgIGZpbGUucGF0aCA9IFBhdGguam9pbihhc3NldHNEaXIsIGFzc2V0c0Rpck1hcCAhPSBudWxsID8gYXNzZXRzRGlyTWFwIDogcGFyc2VkTmFtZS5uYW1lLCBwYXRoSW5Qayk7XG4gICAgICAgIGxvZy5kZWJ1ZyhmaWxlLnBhdGgpO1xuICAgICAgICBuZXh0KG51bGwsIGZpbGUpO1xuICAgICAgfSkpO1xuICAgICAgc3RyZWFtcy5wdXNoKHN0cmVhbSk7XG4gICAgfVxuICB9KTtcbiAgaWYgKHN0cmVhbXMubGVuZ3RoID09PSAwKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbiAgLy8gdmFyIGNvbnRleHRQYXRoID0gXy5nZXQoYXBpLCAnbmdFbnRyeUNvbXBvbmVudC5zaG9ydE5hbWUnLCAnJyk7XG4gIHZhciBvdXRwdXREaXIgPSBhcGkud2VicGFja0NvbmZpZy5vdXRwdXQucGF0aDtcbiAgbG9nLmluZm8oJ091dHB1dCBhc3NldHMgdG8gJywgb3V0cHV0RGlyKTtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBlcy5tZXJnZShzdHJlYW1zKVxuICAgIC5waXBlKGd1bHAuZGVzdChvdXRwdXREaXIpKVxuICAgIC5vbignZW5kJywgZnVuY3Rpb24oKSB7XG4gICAgICBsb2cuZGVidWcoJ2ZsdXNoJyk7XG4gICAgICBidWlsZFV0aWxzLndyaXRlVGltZXN0YW1wKCdhc3NldHMnKTtcbiAgICAgIHJlc29sdmUoKTtcbiAgICB9KVxuICAgIC5vbignZXJyb3InLCByZWplY3QpO1xuICB9KTtcbn1cbiJdfQ==
