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
const chalk_1 = tslib_1.__importDefault(require("chalk"));
// import {createResponseTimestamp} from './utils';
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
    // api.use('/', createResponseTimestamp);
    index_html_route_1.proxyToDevServer();
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM3QixnRUFBK0I7QUFDL0Isd0RBQXdCO0FBQ3hCLGdFQUEwQjtBQUMxQiw0REFBdUI7QUFDdkIsMERBQXdCO0FBQ3hCLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUNuQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUN6RCxvRUFBOEM7QUFDOUMsTUFBTSxhQUFhLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQy9DLDJEQUFzRTtBQUN0RSx5REFBdUU7QUFDdkUsNERBQW9FO0FBQ3BFLDJEQUFnRDtBQUVoRCxzRUFBcUM7QUFDckMsMERBQTBCO0FBQzFCLG1EQUFtRDtBQUNuRCxxRUFBcUU7QUFFckUsTUFBTSxVQUFVLEdBQUcsZUFBRyxDQUFDLFVBQVUsQ0FBQztBQUVsQyxNQUFNLFlBQVksR0FBRyxlQUFHLENBQUMsWUFBWSxDQUFDO0FBQ3RDLE1BQU0sTUFBTSxHQUFHLGVBQUcsQ0FBQyxNQUFNLENBQUM7QUFFMUIsU0FBZ0IsT0FBTztJQUNyQixNQUFNLElBQUksR0FBRyxlQUFHLENBQUMsSUFBSSxDQUFDO0lBQ3RCLElBQUksTUFBTSxFQUFFLENBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRTtRQUN4QyxHQUFHLENBQUMsSUFBSSxDQUFDLHVEQUF1RCxDQUFDLENBQUM7UUFDbEUsT0FBTztLQUNSO0lBQ0QsSUFBSSxDQUFDLGVBQUcsQ0FBQyxlQUFlLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUU7UUFDOUMsR0FBRyxDQUFDLElBQUksQ0FBQyxrRkFB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QUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7SUFDdkIsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL2Rpc3QvaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBndWxwID0gcmVxdWlyZSgnZ3VscCcpO1xuaW1wb3J0IHRocm91Z2ggZnJvbSAndGhyb3VnaDInO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMtZXh0cmEnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuY29uc3QgZXMgPSByZXF1aXJlKCdldmVudC1zdHJlYW0nKTtcbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUpO1xuaW1wb3J0ICogYXMgZmV0Y2hSZW1vdGUgZnJvbSAnLi9mZXRjaC1yZW1vdGUnO1xuY29uc3Qgc2VydmVyRmF2aWNvbiA9IHJlcXVpcmUoJ3NlcnZlLWZhdmljb24nKTtcbmltcG9ydCB7Y3JlYXRlU3RhdGljUm91dGUsIGNyZWF0ZVppcFJvdXRlfSBmcm9tICcuL3N0YXRpYy1taWRkbGV3YXJlJztcbmltcG9ydCB7ZmFsbGJhY2tJbmRleEh0bWwsIHByb3h5VG9EZXZTZXJ2ZXJ9IGZyb20gJy4vaW5kZXgtaHRtbC1yb3V0ZSc7XG5pbXBvcnQge2FjdGl2YXRlIGFzIGFjdGl2YXRlQ2R9IGZyb20gJy4vY29udGVudC1kZXBsb3llci9jZC1zZXJ2ZXInO1xuaW1wb3J0IHtJbWFwTWFuYWdlcn0gZnJvbSAnLi9mZXRjaC1yZW1vdGUtaW1hcCc7XG5pbXBvcnQge1dpdGhNYWlsU2VydmVyQ29uZmlnfSBmcm9tICcuL2ZldGNoLXR5cGVzJztcbmltcG9ydCBzZXJ2ZUluZGV4IGZyb20gJ3NlcnZlLWluZGV4JztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG4vLyBpbXBvcnQge2NyZWF0ZVJlc3BvbnNlVGltZXN0YW1wfSBmcm9tICcuL3V0aWxzJztcbi8vIGNvbnN0IHNldHVwRGV2QXNzZXRzID0gcmVxdWlyZSgnLi9kaXN0L2Rldi1zZXJ2ZS1hc3NldHMnKS5kZWZhdWx0O1xuXG5jb25zdCBidWlsZFV0aWxzID0gYXBpLmJ1aWxkVXRpbHM7XG5cbmNvbnN0IHBhY2thZ2VVdGlscyA9IGFwaS5wYWNrYWdlVXRpbHM7XG5jb25zdCBjb25maWcgPSBhcGkuY29uZmlnO1xuXG5leHBvcnQgZnVuY3Rpb24gY29tcGlsZSgpIHtcbiAgY29uc3QgYXJndiA9IGFwaS5hcmd2O1xuICBpZiAoY29uZmlnKCkuZGV2TW9kZSAmJiAhYXJndi5jb3B5QXNzZXRzKSB7XG4gICAgbG9nLmluZm8oJ0Rldk1vZGUgZW5hYmxlZCwgc2tpcCBjb3B5aW5nIGFzc2V0cyB0byBzdGF0aWMgZm9sZGVyJyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICghYXBpLmlzRGVmYXVsdExvY2FsZSgpICYmICFhcmd2LmNvcHlBc3NldHMpIHtcbiAgICBsb2cuaW5mbygnQnVpbGQgZm9yIFwiJXNcIiB3aGljaCBpcyBub3QgZGVmYXVsdCBsb2NhbGUsIHNraXAgY29weWluZyBhc3NldHMgdG8gc3RhdGljIGZvbGRlcicsXG4gICAgICBhcGkuZ2V0QnVpbGRMb2NhbGUoKSk7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgY29weVJvb3RQYWNrYWdlRmF2aWNvbigpO1xuICAvLyBjb25zdCB7emlwU3RhdGljfSA9IHJlcXVpcmUoJy4vZGlzdC96aXAnKTtcbiAgcmV0dXJuIGNvcHlBc3NldHMoKTtcbiAgLy8gLnRoZW4oemlwU3RhdGljKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlYWN0aXZhdGUoKSB7XG4gIGZldGNoUmVtb3RlLnN0b3AoKTtcbn1cbmV4cG9ydCBmdW5jdGlvbiBhY3RpdmF0ZSgpIHtcbiAgdmFyIHN0YXRpY0ZvbGRlciA9IGFwaS5jb25maWcucmVzb2x2ZSgnc3RhdGljRGlyJyk7XG4gIGxvZy5kZWJ1ZygnZXhwcmVzcyBzdGF0aWMgcGF0aDogJyArIHN0YXRpY0ZvbGRlcik7XG5cblxuICB2YXIgZmF2aWNvbiA9IGZpbmRGYXZpY29uKCk7XG4gIGlmIChmYXZpY29uKVxuICAgIGFwaS51c2Uoc2VydmVyRmF2aWNvbihmYXZpY29uKSk7XG5cbiAgdmFyIG1heEFnZU1hcCA9IGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSArICcuY2FjaGVDb250cm9sTWF4QWdlJywge1xuICAgIC8vIEZvcm1hdCBodHRwczovL3d3dy5ucG1qcy5jb20vcGFja2FnZS9tc1xuICAgIC8vIGpzOiAnMzY1IGRheXMnLFxuICAgIC8vIGNzczogJzM2NSBkYXlzJyxcbiAgICAvLyBsZXNzOiAnMzY1IGRheXMnLFxuICAgIC8vIGh0bWw6IDAsIC8vIG51bGwgbWVhbmluZyAnY2FjaGUtY29udHJvbDogbm8tc3RvcmUnXG4gICAgLy8gcG5nOiAnMzY1IGRheXMnLFxuICAgIC8vIGpwZzogJzM2NSBkYXlzJyxcbiAgICAvLyBnaWY6ICczNjUgZGF5cycsXG4gICAgLy8gc3ZnOiAnMzY1IGRheXMnLFxuICAgIC8vIGVvdDogMzY1IGRheXNcbiAgICAvLyB0dGY6IDM2NSBkYXlzXG4gICAgLy8gd29mZjogMzY1IGRheXNcbiAgICAvLyB3b2ZmMjogMzY1IGRheXNcbiAgfSk7XG4gIGxvZy5pbmZvKCdjYWNoZSBjb250cm9sJywgbWF4QWdlTWFwKTtcbiAgbG9nLmluZm8oJ1NlcnZlIHN0YXRpYyBkaXInLCBzdGF0aWNGb2xkZXIpO1xuXG4gIC8vIGFwaS51c2UoJy8nLCBjcmVhdGVSZXNwb25zZVRpbWVzdGFtcCk7XG4gIHByb3h5VG9EZXZTZXJ2ZXIoKTtcblxuICBjb25zdCB6c3MgPSBjcmVhdGVaaXBSb3V0ZShtYXhBZ2VNYXApO1xuICBhcGkudXNlKCcvJywgenNzLmhhbmRsZXIpO1xuICBjb25zdCBzdGF0aWNIYW5kbGVyID0gY3JlYXRlU3RhdGljUm91dGUoc3RhdGljRm9sZGVyLCBtYXhBZ2VNYXApO1xuICBhcGkudXNlKCcvJywgc3RhdGljSGFuZGxlcik7XG4gIGFwaS51c2UoJy8nLCBjcmVhdGVTdGF0aWNSb3V0ZShhcGkuY29uZmlnLnJlc29sdmUoJ2RsbERlc3REaXInKSwgbWF4QWdlTWFwKSk7XG5cbiAgaWYgKGFwaS5jb25maWcuZ2V0KFthcGkucGFja2FnZU5hbWUsICdzZXJ2ZUluZGV4J10pKSB7XG4gICAgY29uc3Qgc3R5bGVzaGVldCA9IFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi9zZXJ2ZS1pbmRleC5jc3MnKTtcbiAgICBwcm9jZXNzLnRpdGxlID0gJ0ZpbGUgc2VydmVyIG9uICcgKyBzdGF0aWNGb2xkZXI7XG4gICAgYXBpLnVzZSgnLycsIHNlcnZlSW5kZXgoc3RhdGljRm9sZGVyLCB7aWNvbnM6IHRydWUsIHN0eWxlc2hlZXR9KSk7XG4gIH0gZWxzZSB7XG4gICAgbG9nLmluZm8oY2hhbGsuYmx1ZUJyaWdodChgSWYgeW91IHdhbnQgdG8gc2VydmUgZGlyZWN0b3J5IGluZGV4IHBhZ2Ugb2Ygc3RhdGljIHJlc291cmNlIGZvbGRlciAke3N0YXRpY0ZvbGRlcn1cXG5gICtcbiAgICAgIGAgc3RhcnQgY29tbWFuZCB3aXRoIFwiLWMgLS1wcm9wICR7YXBpLnBhY2thZ2VOYW1lfS5zZXJ2ZUluZGV4PXRydWUgc3RhdGljRGlyPTxyZXNvdXJjZSBkaXJlY3Rvcnk+YCkpO1xuICB9XG5cbiAgZmFsbGJhY2tJbmRleEh0bWwoKTtcbiAgYXBpLnVzZSgnLycsIHN0YXRpY0hhbmRsZXIpOyAvLyBTZXJ2ZSBmYWxsYmFja2VkIHJlcXVlc3QgdG8gaW5kZXguaHRtbFxuXG4gIGNvbnN0IG1haWxTZXR0aW5nID0gKGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSkgYXMgV2l0aE1haWxTZXJ2ZXJDb25maWcpLmZldGNoTWFpbFNlcnZlcjtcbiAgY29uc3QgaW1hcCA9IG5ldyBJbWFwTWFuYWdlcihtYWlsU2V0dGluZyA/IG1haWxTZXR0aW5nLmVudiA6ICdsb2NhbCcpO1xuXG4gIGFwaS5leHByZXNzQXBwU2V0KGFwcCA9PiBhY3RpdmF0ZUNkKGFwcCwgaW1hcCkpO1xuXG4gIGFwaS5ldmVudEJ1cy5vbignYXBwQ3JlYXRlZCcsICgpID0+IHtcbiAgICAvLyBhcHBDcmVhdGVkIGV2ZW50IGlzIGVtaXR0ZWQgYnkgZXhwcmVzcy1hcHBcbiAgICBmZXRjaFJlbW90ZS5zdGFydChpbWFwKTtcbiAgfSk7XG5cbiAgaWYgKCFhcGkuY29uZmlnKCkuZGV2TW9kZSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIHNldHVwRGV2QXNzZXRzKGFwaS5jb25maWcoKS5zdGF0aWNBc3NldHNVUkwsIGFwaS51c2UuYmluZChhcGkpKTtcbn1cblxuZnVuY3Rpb24gY29weVJvb3RQYWNrYWdlRmF2aWNvbigpIHtcbiAgdmFyIGZhdmljb24gPSBmaW5kRmF2aWNvbigpO1xuICBpZiAoIWZhdmljb24pXG4gICAgcmV0dXJuO1xuICBsb2cuaW5mbygnQ29weSBmYXZpY29uLmljbyBmcm9tICcgKyBmYXZpY29uKTtcbiAgZnMubWtkaXJwU3luYyhjb25maWcucmVzb2x2ZSgnc3RhdGljRGlyJykpO1xuICBmcy5jb3B5U3luYyhQYXRoLnJlc29sdmUoZmF2aWNvbiksIFBhdGgucmVzb2x2ZShjb25maWcoKS5yb290UGF0aCwgY29uZmlnLnJlc29sdmUoJ3N0YXRpY0RpcicpKSk7XG59XG5cbmZ1bmN0aW9uIGZpbmRGYXZpY29uKCkge1xuICByZXR1cm4gX2ZpbmRGYXZpY29uSW5Db25maWcoJ3BhY2thZ2VDb250ZXh0UGF0aE1hcHBpbmcnKSB8fCBfZmluZEZhdmljb25JbkNvbmZpZygnb3V0cHV0UGF0aE1hcCcpO1xufVxuXG5mdW5jdGlvbiBfZmluZEZhdmljb25JbkNvbmZpZyhwcm9wZXJ0eTogc3RyaW5nKSB7XG4gIGlmICghYXBpLmNvbmZpZygpW3Byb3BlcnR5XSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGxldCBmYXZpY29uRmlsZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBsZXQgZmF2aWNvblBhY2thZ2U6IHN0cmluZztcbiAgXy5lYWNoKGNvbmZpZygpW3Byb3BlcnR5XSwgKHBhdGgsIHBrTmFtZSkgPT4ge1xuICAgIGlmIChwYXRoID09PSAnLycpIHtcbiAgICAgIHBhY2thZ2VVdGlscy5sb29rRm9yUGFja2FnZXMocGtOYW1lLCAoZnVsbE5hbWU6IHN0cmluZywgZW50cnlQYXRoOiBzdHJpbmcsIHBhcnNlZE5hbWU6IHt9LCBqc29uOiBhbnksIHBhY2thZ2VQYXRoOiBzdHJpbmcpID0+IHtcbiAgICAgICAgdmFyIGFzc2V0c0ZvbGRlciA9IGpzb24uZHIgPyAoanNvbi5kci5hc3NldHNEaXIgPyBqc29uLmRyLmFzc2V0c0RpciA6ICdhc3NldHMnKSA6ICdhc3NldHMnO1xuICAgICAgICB2YXIgZmF2aWNvbiA9IFBhdGguam9pbihwYWNrYWdlUGF0aCwgYXNzZXRzRm9sZGVyLCAnZmF2aWNvbi5pY28nKTtcbiAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoZmF2aWNvbikpIHtcbiAgICAgICAgICBpZiAoZmF2aWNvbkZpbGUpIHtcbiAgICAgICAgICAgIGxvZy53YXJuKCdGb3VuZCBkdXBsaWNhdGUgZmF2aWNvbiBmaWxlIGluJywgZnVsbE5hbWUsICdleGlzdGluZycsIGZhdmljb25QYWNrYWdlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZmF2aWNvbkZpbGUgPSBQYXRoLnJlc29sdmUoZmF2aWNvbik7XG4gICAgICAgICAgZmF2aWNvblBhY2thZ2UgPSBmdWxsTmFtZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIGZhdmljb25GaWxlO1xufVxuXG5mdW5jdGlvbiBjb3B5QXNzZXRzKCkge1xuICB2YXIgc3RyZWFtczogYW55W10gPSBbXTtcbiAgcGFja2FnZVV0aWxzLmZpbmRCcm93c2VyUGFja2FnZUJ5VHlwZShbJyonXSxcbiAgZnVuY3Rpb24obmFtZTogc3RyaW5nLCBfZW50cnlQYXRoOiBzdHJpbmcsIHBhcnNlZE5hbWU6IHtuYW1lOiBzdHJpbmd9LCBqc29uOiBhbnksIHBhY2thZ2VQYXRoOiBzdHJpbmcpIHtcbiAgICB2YXIgYXNzZXRzRm9sZGVyID0ganNvbi5kciA/IChqc29uLmRyLmFzc2V0c0RpciA/IGpzb24uZHIuYXNzZXRzRGlyIDogJ2Fzc2V0cycpIDogJ2Fzc2V0cyc7XG4gICAgdmFyIGFzc2V0c0RpciA9IFBhdGguam9pbihwYWNrYWdlUGF0aCwgYXNzZXRzRm9sZGVyKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhhc3NldHNEaXIpKSB7XG4gICAgICB2YXIgYXNzZXRzRGlyTWFwID0gYXBpLmNvbmZpZy5nZXQoJ291dHB1dFBhdGhNYXAuJyArIG5hbWUpO1xuICAgICAgaWYgKGFzc2V0c0Rpck1hcCAhPSBudWxsKVxuICAgICAgICBhc3NldHNEaXJNYXAgPSBfLnRyaW0oYXNzZXRzRGlyTWFwLCAnLycpO1xuICAgICAgdmFyIHNyYyA9IFtQYXRoLmpvaW4ocGFja2FnZVBhdGgsIGFzc2V0c0ZvbGRlciwgJyoqJywgJyonKV07XG4gICAgICB2YXIgc3RyZWFtID0gZ3VscC5zcmMoc3JjLCB7YmFzZTogUGF0aC5qb2luKHBhY2thZ2VQYXRoLCBhc3NldHNGb2xkZXIpfSlcbiAgICAgIC5waXBlKHRocm91Z2gub2JqKGZ1bmN0aW9uKGZpbGUsIGVuYywgbmV4dCkge1xuICAgICAgICB2YXIgcGF0aEluUGsgPSBQYXRoLnJlbGF0aXZlKGFzc2V0c0RpciwgZmlsZS5wYXRoKTtcbiAgICAgICAgZmlsZS5wYXRoID0gUGF0aC5qb2luKGFzc2V0c0RpciwgYXNzZXRzRGlyTWFwICE9IG51bGwgPyBhc3NldHNEaXJNYXAgOiBwYXJzZWROYW1lLm5hbWUsIHBhdGhJblBrKTtcbiAgICAgICAgbG9nLmRlYnVnKGZpbGUucGF0aCk7XG4gICAgICAgIG5leHQobnVsbCwgZmlsZSk7XG4gICAgICB9KSk7XG4gICAgICBzdHJlYW1zLnB1c2goc3RyZWFtKTtcbiAgICB9XG4gIH0pO1xuICBpZiAoc3RyZWFtcy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICAvLyB2YXIgY29udGV4dFBhdGggPSBfLmdldChhcGksICduZ0VudHJ5Q29tcG9uZW50LnNob3J0TmFtZScsICcnKTtcbiAgdmFyIG91dHB1dERpciA9IGFwaS53ZWJwYWNrQ29uZmlnLm91dHB1dC5wYXRoO1xuICBsb2cuaW5mbygnT3V0cHV0IGFzc2V0cyB0byAnLCBvdXRwdXREaXIpO1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGVzLm1lcmdlKHN0cmVhbXMpXG4gICAgLnBpcGUoZ3VscC5kZXN0KG91dHB1dERpcikpXG4gICAgLm9uKCdlbmQnLCBmdW5jdGlvbigpIHtcbiAgICAgIGxvZy5kZWJ1ZygnZmx1c2gnKTtcbiAgICAgIGJ1aWxkVXRpbHMud3JpdGVUaW1lc3RhbXAoJ2Fzc2V0cycpO1xuICAgICAgcmVzb2x2ZSgpO1xuICAgIH0pXG4gICAgLm9uKCdlcnJvcicsIHJlamVjdCk7XG4gIH0pO1xufVxuIl19
