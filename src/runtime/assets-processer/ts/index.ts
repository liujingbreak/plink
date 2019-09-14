const gulp = require('gulp');
import through from 'through2';
import Path from 'path';
import fs from 'fs-extra';
import _ from 'lodash';
import api from '__api';
const es = require('event-stream');
const log = require('log4js').getLogger(api.packageName);
import * as fetchRemote from './fetch-remote';
const serverFavicon = require('serve-favicon');
import {createStaticRoute, createZipRoute} from './static-middleware';
import {fallbackIndexHtml, proxyToDevServer} from './index-html-route';
// const setupDevAssets = require('./dist/dev-serve-assets').default;

const buildUtils = api.buildUtils;

const packageUtils = api.packageUtils;
const config = api.config;

export function compile() {
  const argv = api.argv;
  if (config().devMode && !argv.copyAssets) {
    log.info('DevMode enabled, skip copying assets to static folder');
    return;
  }
  if (!api.isDefaultLocale() && !argv.copyAssets) {
    log.info('Build for "%s" which is not default locale, skip copying assets to static folder',
      api.getBuildLocale());
    return;
  }

  copyRootPackageFavicon();
  // const {zipStatic} = require('./dist/zip');
  return copyAssets();
  // .then(zipStatic);
}

export function deactivate() {
  fetchRemote.stop();
}
export function activate() {
  var staticFolder = api.config.resolve('staticDir');
  log.debug('express static path: ' + staticFolder);

  var favicon = findFavicon();
  if (favicon)
    api.use(serverFavicon(favicon));

  var maxAgeMap = api.config.get(api.packageName + '.cacheControlMaxAge', {
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

  proxyToDevServer();

  const zss = createZipRoute(maxAgeMap);
  api.use('/', zss.handler);
  const staticHandler = createStaticRoute(staticFolder, maxAgeMap);
  api.use('/', staticHandler);
  api.use('/', createStaticRoute(api.config.resolve('dllDestDir'), maxAgeMap));

  fallbackIndexHtml();
  api.use('/', staticHandler); // Serve fallbacked request to index.html

  api.eventBus.on('appCreated', () => {
    // appCreated event is emitted by express-app
    fetchRemote.start();
  });

  if (!api.config().devMode) {
    return;
  }

  // setupDevAssets(api.config().staticAssetsURL, api.use.bind(api));
}

function copyRootPackageFavicon() {
  var favicon = findFavicon();
  if (!favicon)
    return;
  log.info('Copy favicon.ico from ' + favicon);
  fs.mkdirpSync(config.resolve('staticDir'));
  fs.copySync(Path.resolve(favicon), Path.resolve(config().rootPath, config.resolve('staticDir')));
}

function findFavicon() {
  return _findFaviconInConfig('packageContextPathMapping') || _findFaviconInConfig('outputPathMap');
}

function _findFaviconInConfig(property: string) {
  if (!api.config()[property]) {
    return null;
  }
  let faviconFile: string | undefined;
  let faviconPackage: string;
  _.each(config()[property], (path, pkName) => {
    if (path === '/') {
      packageUtils.lookForPackages(pkName, (fullName: string, entryPath: string, parsedName: {}, json: any, packagePath: string) => {
        var assetsFolder = json.dr ? (json.dr.assetsDir ? json.dr.assetsDir : 'assets') : 'assets';
        var favicon = Path.join(packagePath, assetsFolder, 'favicon.ico');
        if (fs.existsSync(favicon)) {
          if (faviconFile) {
            log.warn('Found duplicate favicon file in', fullName, 'existing', faviconPackage);
          }
          faviconFile = Path.resolve(favicon);
          faviconPackage = fullName;
        }
      });
    }
  });
  return faviconFile;
}

function copyAssets() {
  var streams: any[] = [];
  packageUtils.findBrowserPackageByType(['*'],
  function(name: string, _entryPath: string, parsedName: {name: string}, json: any, packagePath: string) {
    var assetsFolder = json.dr ? (json.dr.assetsDir ? json.dr.assetsDir : 'assets') : 'assets';
    var assetsDir = Path.join(packagePath, assetsFolder);
    if (fs.existsSync(assetsDir)) {
      var assetsDirMap = api.config.get('outputPathMap.' + name);
      if (assetsDirMap != null)
        assetsDirMap = _.trim(assetsDirMap, '/');
      var src = [Path.join(packagePath, assetsFolder, '**', '*')];
      var stream = gulp.src(src, {base: Path.join(packagePath, assetsFolder)})
      .pipe(through.obj(function(file, enc, next) {
        var pathInPk = Path.relative(assetsDir, file.path);
        file.path = Path.join(assetsDir, assetsDirMap != null ? assetsDirMap : parsedName.name, pathInPk);
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
  var outputDir = api.webpackConfig.output.path;
  log.info('Output assets to ', outputDir);
  return new Promise((resolve, reject) => {
    es.merge(streams)
    .pipe(gulp.dest(outputDir))
    .on('end', function() {
      log.debug('flush');
      buildUtils.writeTimestamp('assets');
      resolve();
    })
    .on('error', reject);
  });
}
