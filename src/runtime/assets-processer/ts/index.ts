import Path from 'path';
import chalk from 'chalk';
import fs from 'fs-extra';
import _ from 'lodash';
// import * as rx from 'rxjs';
// import * as op from 'rxjs/operators';
import serveIndex from 'serve-index';
import {log4File, config, DrcpSettings, findPackagesByNames, ExtensionContext} from '@wfh/plink';
import {getSetting} from '../isom/assets-processer-setting';
import {activate as activateCd} from './content-deployer/cd-server';
import * as fetchRemote from './fetch-remote';
import {ImapManager} from './fetch-remote-imap';
import {WithMailServerConfig} from './fetch-types';
import {fallbackIndexHtml, proxyToDevServer} from './index-html-route';
import {createStaticRoute} from './static-middleware';
// import {createProxyWithCache} from './proxy-cache/cache-service';
// import createNpmRegistryServer from './proxy-cache/npm-registry-cache-service';
import {setupHttpProxy} from './utils';

const log = log4File(__filename);
// const log = require('log4js').getLogger(api.packageName);
const serverFavicon = require('serve-favicon');
// const deactivateSubj = new rx.ReplaySubject<() => (PromiseLike<any> | void)>();

export function deactivate() {
  fetchRemote.stop();
  // return deactivateSubj.pipe(
  //   op.mergeMap(shutdown => rx.defer(() => shutdown()))
  // ).toPromise();
}
export function activate(api: ExtensionContext) {
  const staticFolder = api.config.resolve('staticDir');
  log.debug('express static path: ' + staticFolder);


  const favicon = findFavicon();
  if (favicon)
    api.use(serverFavicon(favicon));

  const maxAgeMap = getSetting().cacheControlMaxAge;
  log.info('cache control', maxAgeMap);
  log.info('Serve static dir', staticFolder);

  // api.use('/', createResponseTimestamp);
  proxyToDevServer(api);

  const httpProxySet = getSetting().httpProxy;
  if (httpProxySet) {
    for (const proxyPath of Object.keys(httpProxySet)) {
      log.info(`Enable HTTP proxy ${proxyPath} -> ${httpProxySet[proxyPath]}`);
      setupHttpProxy(proxyPath, httpProxySet[proxyPath]);
    }
  }

  const httpProxyWithCacheSet = getSetting().httpProxyWithCache;
  if (httpProxyWithCacheSet) {
    for (const proxyPath of Object.keys(httpProxyWithCacheSet)) {
      const dir = Path.join(config().destDir, 'http-proxy-cache', _.trimStart(proxyPath, '/'));
      const endPoint = httpProxyWithCacheSet[proxyPath];
      log.info(`Enable HTTP proxy ${proxyPath} --> ${endPoint}, cache directory: ${dir}`);
      // createProxyWithCache(proxyPath, {target: endPoint}, dir);
    }
  }

  // const saveNpmRegistry = createNpmRegistryServer(api);
  // if (saveNpmRegistry)
  //   deactivateSubj.next(saveNpmRegistry);

  // api.use('/', zss.handler);
  const staticHandler = createStaticRoute(staticFolder, maxAgeMap);
  api.use('/', staticHandler);
  // api.use('/', createStaticRoute(api.config.resolve('dllDestDir'), maxAgeMap));

  if (api.config.get([api.packageName, 'serveIndex'])) {
    const stylesheet = Path.resolve(__dirname, '../serve-index.css');
    process.title = 'File server on ' + staticFolder;
    api.use('/', serveIndex(staticFolder, {icons: true, stylesheet}));
  } else {
    log.info(chalk.blueBright(`If you want to serve directory index page for resource directory other than ${staticFolder}\n` +
      ` start command with "--prop ${api.packageName}.serveIndex=true --prop staticDir=<resource directory>`));
  }
  api.expressAppSet(app => activateCd(app, imap));
  fallbackIndexHtml(api);
  api.use('/', staticHandler); // Serve fallbacked request to index.html

  const mailSetting = (api.config.get(api.packageName) as WithMailServerConfig).fetchMailServer;
  const imap = new ImapManager(mailSetting ? mailSetting.env : 'local');

  api.eventBus?.once('appCreated', () => {
    // appCreated event is emitted by express-app
    void fetchRemote.start(imap);
  });

  // deactivateSubj.complete();
}


function findFavicon() {
  return _findFaviconInConfig('packageContextPathMapping') || _findFaviconInConfig('outputPathMap');
}

function _findFaviconInConfig(property: keyof DrcpSettings) {
  if (!config()[property]) {
    return null;
  }
  let faviconFile: string | undefined;
  let faviconPackage: string;
  _.each(config()[property] as any, (path, pkName) => {
    if (path === '/') {
      const pkg = [...findPackagesByNames([pkName])][0];
      if (pkg) {
        const assetsFolder = pkg.json.plink?.assetsDir || pkg.json.dr?.assetsDir || 'assets';
        const favicon = Path.join(pkg.realPath, assetsFolder, 'favicon.ico');
        if (fs.existsSync(favicon)) {
          if (faviconFile) {
            log.warn('Found duplicate favicon file in', pkg.name, 'existing', faviconPackage);
          }
          faviconFile = Path.resolve(favicon);
          faviconPackage = pkg.name;
        }
      }

    }
  });
  return faviconFile;
}

