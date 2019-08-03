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
const fetchRemote = require('./dist/fetch-remote');
const serverFavicon = require('serve-favicon');
const { createStaticRoute, createZipRoute } = require('./dist/static-middleware');
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
    const zss = createZipRoute(maxAgeMap);
    __api_1.default.use('/', zss.handler);
    __api_1.default.use('/', createStaticRoute(staticFolder, maxAgeMap));
    __api_1.default.use('/', createStaticRoute(__api_1.default.config.resolve('dllDestDir'), maxAgeMap));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9hc3NldHMtcHJvY2Vzc2VyL3RzL2luZGV4LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQztBQUM3QixnRUFBK0I7QUFDL0Isd0RBQXdCO0FBQ3hCLGdFQUEwQjtBQUMxQiw0REFBdUI7QUFDdkIsMERBQXdCO0FBQ3hCLE1BQU0sRUFBRSxHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUNuQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUN6RCxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUNuRCxNQUFNLGFBQWEsR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDL0MsTUFBTSxFQUFDLGlCQUFpQixFQUFFLGNBQWMsRUFBQyxHQUFHLE9BQU8sQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO0FBQ2hGLHFFQUFxRTtBQUVyRSxNQUFNLFVBQVUsR0FBRyxlQUFHLENBQUMsVUFBVSxDQUFDO0FBRWxDLE1BQU0sWUFBWSxHQUFHLGVBQUcsQ0FBQyxZQUFZLENBQUM7QUFDdEMsTUFBTSxNQUFNLEdBQUcsZUFBRyxDQUFDLE1BQU0sQ0FBQztBQUUxQixTQUFnQixPQUFPO0lBQ3JCLE1BQU0sSUFBSSxHQUFHLGVBQUcsQ0FBQyxJQUFJLENBQUM7SUFDdEIsSUFBSSxNQUFNLEVBQUUsQ0FBQyxPQUFPLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFO1FBQ3hDLEdBQUcsQ0FBQyxJQUFJLENBQUMsdURBQXVELENBQUMsQ0FBQztRQUNsRSxPQUFPO0tBQ1I7SUFDRCxJQUFJLENBQUMsZUFBRyxDQUFDLGVBQWUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRTtRQUM5QyxHQUFHLENBQUMs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LE9BQU8sRUFBRSxDQUFDO1FBQ1osQ0FBQyxDQUFDO2FBQ0QsRUFBRSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztJQUN2QixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL2Fzc2V0cy1wcm9jZXNzZXIvZGlzdC9pbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImNvbnN0IGd1bHAgPSByZXF1aXJlKCdndWxwJyk7XG5pbXBvcnQgdGhyb3VnaCBmcm9tICd0aHJvdWdoMic7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBmcyBmcm9tICdmcy1leHRyYSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5jb25zdCBlcyA9IHJlcXVpcmUoJ2V2ZW50LXN0cmVhbScpO1xuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSk7XG5jb25zdCBmZXRjaFJlbW90ZSA9IHJlcXVpcmUoJy4vZGlzdC9mZXRjaC1yZW1vdGUnKTtcbmNvbnN0IHNlcnZlckZhdmljb24gPSByZXF1aXJlKCdzZXJ2ZS1mYXZpY29uJyk7XG5jb25zdCB7Y3JlYXRlU3RhdGljUm91dGUsIGNyZWF0ZVppcFJvdXRlfSA9IHJlcXVpcmUoJy4vZGlzdC9zdGF0aWMtbWlkZGxld2FyZScpO1xuLy8gY29uc3Qgc2V0dXBEZXZBc3NldHMgPSByZXF1aXJlKCcuL2Rpc3QvZGV2LXNlcnZlLWFzc2V0cycpLmRlZmF1bHQ7XG5cbmNvbnN0IGJ1aWxkVXRpbHMgPSBhcGkuYnVpbGRVdGlscztcblxuY29uc3QgcGFja2FnZVV0aWxzID0gYXBpLnBhY2thZ2VVdGlscztcbmNvbnN0IGNvbmZpZyA9IGFwaS5jb25maWc7XG5cbmV4cG9ydCBmdW5jdGlvbiBjb21waWxlKCkge1xuICBjb25zdCBhcmd2ID0gYXBpLmFyZ3Y7XG4gIGlmIChjb25maWcoKS5kZXZNb2RlICYmICFhcmd2LmNvcHlBc3NldHMpIHtcbiAgICBsb2cuaW5mbygnRGV2TW9kZSBlbmFibGVkLCBza2lwIGNvcHlpbmcgYXNzZXRzIHRvIHN0YXRpYyBmb2xkZXInKTtcbiAgICByZXR1cm47XG4gIH1cbiAgaWYgKCFhcGkuaXNEZWZhdWx0TG9jYWxlKCkgJiYgIWFyZ3YuY29weUFzc2V0cykge1xuICAgIGxvZy5pbmZvKCdCdWlsZCBmb3IgXCIlc1wiIHdoaWNoIGlzIG5vdCBkZWZhdWx0IGxvY2FsZSwgc2tpcCBjb3B5aW5nIGFzc2V0cyB0byBzdGF0aWMgZm9sZGVyJyxcbiAgICAgIGFwaS5nZXRCdWlsZExvY2FsZSgpKTtcbiAgICByZXR1cm47XG4gIH1cblxuICBjb3B5Um9vdFBhY2thZ2VGYXZpY29uKCk7XG4gIC8vIGNvbnN0IHt6aXBTdGF0aWN9ID0gcmVxdWlyZSgnLi9kaXN0L3ppcCcpO1xuICByZXR1cm4gY29weUFzc2V0cygpO1xuICAvLyAudGhlbih6aXBTdGF0aWMpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVhY3RpdmF0ZSgpIHtcbiAgZmV0Y2hSZW1vdGUuc3RvcCgpO1xufVxuZXhwb3J0IGZ1bmN0aW9uIGFjdGl2YXRlKCkge1xuICB2YXIgc3RhdGljRm9sZGVyID0gYXBpLmNvbmZpZy5yZXNvbHZlKCdzdGF0aWNEaXInKTtcbiAgbG9nLmRlYnVnKCdleHByZXNzIHN0YXRpYyBwYXRoOiAnICsgc3RhdGljRm9sZGVyKTtcblxuICB2YXIgZmF2aWNvbiA9IGZpbmRGYXZpY29uKCk7XG4gIGlmIChmYXZpY29uKVxuICAgIGFwaS51c2Uoc2VydmVyRmF2aWNvbihmYXZpY29uKSk7XG5cbiAgdmFyIG1heEFnZU1hcCA9IGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSArICcuY2FjaGVDb250cm9sTWF4QWdlJywge1xuICAgIC8vIEZvcm1hdCBodHRwczovL3d3dy5ucG1qcy5jb20vcGFja2FnZS9tc1xuICAgIC8vIGpzOiAnMzY1IGRheXMnLFxuICAgIC8vIGNzczogJzM2NSBkYXlzJyxcbiAgICAvLyBsZXNzOiAnMzY1IGRheXMnLFxuICAgIC8vIGh0bWw6IDAsIC8vIG51bGwgbWVhbmluZyAnY2FjaGUtY29udHJvbDogbm8tc3RvcmUnXG4gICAgLy8gcG5nOiAnMzY1IGRheXMnLFxuICAgIC8vIGpwZzogJzM2NSBkYXlzJyxcbiAgICAvLyBnaWY6ICczNjUgZGF5cycsXG4gICAgLy8gc3ZnOiAnMzY1IGRheXMnLFxuICAgIC8vIGVvdDogMzY1IGRheXNcbiAgICAvLyB0dGY6IDM2NSBkYXlzXG4gICAgLy8gd29mZjogMzY1IGRheXNcbiAgICAvLyB3b2ZmMjogMzY1IGRheXNcbiAgfSk7XG4gIGxvZy5pbmZvKCdjYWNoZSBjb250cm9sJywgbWF4QWdlTWFwKTtcbiAgbG9nLmluZm8oJ1NlcnZlIHN0YXRpYyBkaXInLCBzdGF0aWNGb2xkZXIpO1xuICBjb25zdCB6c3MgPSBjcmVhdGVaaXBSb3V0ZShtYXhBZ2VNYXApO1xuICBhcGkudXNlKCcvJywgenNzLmhhbmRsZXIpO1xuICBhcGkudXNlKCcvJywgY3JlYXRlU3RhdGljUm91dGUoc3RhdGljRm9sZGVyLCBtYXhBZ2VNYXApKTtcbiAgYXBpLnVzZSgnLycsIGNyZWF0ZVN0YXRpY1JvdXRlKGFwaS5jb25maWcucmVzb2x2ZSgnZGxsRGVzdERpcicpLCBtYXhBZ2VNYXApKTtcblxuICBhcGkuZXZlbnRCdXMub24oJ2FwcENyZWF0ZWQnLCAoKSA9PiB7XG4gICAgLy8gYXBwQ3JlYXRlZCBldmVudCBpcyBlbWl0dGVkIGJ5IGV4cHJlc3MtYXBwXG4gICAgZmV0Y2hSZW1vdGUuc3RhcnQoenNzKTtcbiAgfSk7XG5cbiAgaWYgKCFhcGkuY29uZmlnKCkuZGV2TW9kZSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIHNldHVwRGV2QXNzZXRzKGFwaS5jb25maWcoKS5zdGF0aWNBc3NldHNVUkwsIGFwaS51c2UuYmluZChhcGkpKTtcbn1cblxuZnVuY3Rpb24gY29weVJvb3RQYWNrYWdlRmF2aWNvbigpIHtcbiAgdmFyIGZhdmljb24gPSBmaW5kRmF2aWNvbigpO1xuICBpZiAoIWZhdmljb24pXG4gICAgcmV0dXJuO1xuICBsb2cuaW5mbygnQ29weSBmYXZpY29uLmljbyBmcm9tICcgKyBmYXZpY29uKTtcbiAgZnMubWtkaXJwU3luYyhjb25maWcucmVzb2x2ZSgnc3RhdGljRGlyJykpO1xuICBmcy5jb3B5U3luYyhQYXRoLnJlc29sdmUoZmF2aWNvbiksIFBhdGgucmVzb2x2ZShjb25maWcoKS5yb290UGF0aCwgY29uZmlnLnJlc29sdmUoJ3N0YXRpY0RpcicpKSk7XG59XG5cbmZ1bmN0aW9uIGZpbmRGYXZpY29uKCkge1xuICByZXR1cm4gX2ZpbmRGYXZpY29uSW5Db25maWcoJ3BhY2thZ2VDb250ZXh0UGF0aE1hcHBpbmcnKSB8fCBfZmluZEZhdmljb25JbkNvbmZpZygnb3V0cHV0UGF0aE1hcCcpO1xufVxuXG5mdW5jdGlvbiBfZmluZEZhdmljb25JbkNvbmZpZyhwcm9wZXJ0eTogc3RyaW5nKSB7XG4gIGlmICghYXBpLmNvbmZpZygpW3Byb3BlcnR5XSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGxldCBmYXZpY29uRmlsZTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBsZXQgZmF2aWNvblBhY2thZ2U6IHN0cmluZztcbiAgXy5lYWNoKGNvbmZpZygpW3Byb3BlcnR5XSwgKHBhdGgsIHBrTmFtZSkgPT4ge1xuICAgIGlmIChwYXRoID09PSAnLycpIHtcbiAgICAgIHBhY2thZ2VVdGlscy5sb29rRm9yUGFja2FnZXMocGtOYW1lLCAoZnVsbE5hbWU6IHN0cmluZywgZW50cnlQYXRoOiBzdHJpbmcsIHBhcnNlZE5hbWU6IHt9LCBqc29uOiBhbnksIHBhY2thZ2VQYXRoOiBzdHJpbmcpID0+IHtcbiAgICAgICAgdmFyIGFzc2V0c0ZvbGRlciA9IGpzb24uZHIgPyAoanNvbi5kci5hc3NldHNEaXIgPyBqc29uLmRyLmFzc2V0c0RpciA6ICdhc3NldHMnKSA6ICdhc3NldHMnO1xuICAgICAgICB2YXIgZmF2aWNvbiA9IFBhdGguam9pbihwYWNrYWdlUGF0aCwgYXNzZXRzRm9sZGVyLCAnZmF2aWNvbi5pY28nKTtcbiAgICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoZmF2aWNvbikpIHtcbiAgICAgICAgICBpZiAoZmF2aWNvbkZpbGUpIHtcbiAgICAgICAgICAgIGxvZy53YXJuKCdGb3VuZCBkdXBsaWNhdGUgZmF2aWNvbiBmaWxlIGluJywgZnVsbE5hbWUsICdleGlzdGluZycsIGZhdmljb25QYWNrYWdlKTtcbiAgICAgICAgICB9XG4gICAgICAgICAgZmF2aWNvbkZpbGUgPSBQYXRoLnJlc29sdmUoZmF2aWNvbik7XG4gICAgICAgICAgZmF2aWNvblBhY2thZ2UgPSBmdWxsTmFtZTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIGZhdmljb25GaWxlO1xufVxuXG5mdW5jdGlvbiBjb3B5QXNzZXRzKCkge1xuICB2YXIgc3RyZWFtczogYW55W10gPSBbXTtcbiAgcGFja2FnZVV0aWxzLmZpbmRCcm93c2VyUGFja2FnZUJ5VHlwZShbJyonXSxcbiAgZnVuY3Rpb24obmFtZTogc3RyaW5nLCBfZW50cnlQYXRoOiBzdHJpbmcsIHBhcnNlZE5hbWU6IHtuYW1lOiBzdHJpbmd9LCBqc29uOiBhbnksIHBhY2thZ2VQYXRoOiBzdHJpbmcpIHtcbiAgICB2YXIgYXNzZXRzRm9sZGVyID0ganNvbi5kciA/IChqc29uLmRyLmFzc2V0c0RpciA/IGpzb24uZHIuYXNzZXRzRGlyIDogJ2Fzc2V0cycpIDogJ2Fzc2V0cyc7XG4gICAgdmFyIGFzc2V0c0RpciA9IFBhdGguam9pbihwYWNrYWdlUGF0aCwgYXNzZXRzRm9sZGVyKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyhhc3NldHNEaXIpKSB7XG4gICAgICB2YXIgYXNzZXRzRGlyTWFwID0gYXBpLmNvbmZpZy5nZXQoJ291dHB1dFBhdGhNYXAuJyArIG5hbWUpO1xuICAgICAgaWYgKGFzc2V0c0Rpck1hcCAhPSBudWxsKVxuICAgICAgICBhc3NldHNEaXJNYXAgPSBfLnRyaW0oYXNzZXRzRGlyTWFwLCAnLycpO1xuICAgICAgdmFyIHNyYyA9IFtQYXRoLmpvaW4ocGFja2FnZVBhdGgsIGFzc2V0c0ZvbGRlciwgJyoqJywgJyonKV07XG4gICAgICB2YXIgc3RyZWFtID0gZ3VscC5zcmMoc3JjLCB7YmFzZTogUGF0aC5qb2luKHBhY2thZ2VQYXRoLCBhc3NldHNGb2xkZXIpfSlcbiAgICAgIC5waXBlKHRocm91Z2gub2JqKGZ1bmN0aW9uKGZpbGUsIGVuYywgbmV4dCkge1xuICAgICAgICB2YXIgcGF0aEluUGsgPSBQYXRoLnJlbGF0aXZlKGFzc2V0c0RpciwgZmlsZS5wYXRoKTtcbiAgICAgICAgZmlsZS5wYXRoID0gUGF0aC5qb2luKGFzc2V0c0RpciwgYXNzZXRzRGlyTWFwICE9IG51bGwgPyBhc3NldHNEaXJNYXAgOiBwYXJzZWROYW1lLm5hbWUsIHBhdGhJblBrKTtcbiAgICAgICAgbG9nLmRlYnVnKGZpbGUucGF0aCk7XG4gICAgICAgIG5leHQobnVsbCwgZmlsZSk7XG4gICAgICB9KSk7XG4gICAgICBzdHJlYW1zLnB1c2goc3RyZWFtKTtcbiAgICB9XG4gIH0pO1xuICBpZiAoc3RyZWFtcy5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICAvLyB2YXIgY29udGV4dFBhdGggPSBfLmdldChhcGksICduZ0VudHJ5Q29tcG9uZW50LnNob3J0TmFtZScsICcnKTtcbiAgdmFyIG91dHB1dERpciA9IGFwaS53ZWJwYWNrQ29uZmlnLm91dHB1dC5wYXRoO1xuICBsb2cuaW5mbygnT3V0cHV0IGFzc2V0cyB0byAnLCBvdXRwdXREaXIpO1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIGVzLm1lcmdlKHN0cmVhbXMpXG4gICAgLnBpcGUoZ3VscC5kZXN0KG91dHB1dERpcikpXG4gICAgLm9uKCdlbmQnLCBmdW5jdGlvbigpIHtcbiAgICAgIGxvZy5kZWJ1ZygnZmx1c2gnKTtcbiAgICAgIGJ1aWxkVXRpbHMud3JpdGVUaW1lc3RhbXAoJ2Fzc2V0cycpO1xuICAgICAgcmVzb2x2ZSgpO1xuICAgIH0pXG4gICAgLm9uKCdlcnJvcicsIHJlamVjdCk7XG4gIH0pO1xufVxuIl19
