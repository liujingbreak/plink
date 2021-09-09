import chalk from 'chalk';
import fs from 'fs-extra';
import _ from 'lodash';
import Path from 'path';
import serveIndex from 'serve-index';
import { activate as activateCd } from './content-deployer/cd-server';
import * as fetchRemote from './fetch-remote';
import { ImapManager } from './fetch-remote-imap';
import { WithMailServerConfig } from './fetch-types';
import { fallbackIndexHtml, proxyToDevServer } from './index-html-route';
import { createStaticRoute } from './static-middleware';
import { setupHttpProxy } from './utils';
import {getSetting} from '../isom/assets-processer-setting';
import {log4File, config, DrcpSettings, findPackagesByNames, ExtensionContext} from '@wfh/plink';
const log = log4File(__filename);
// const log = require('log4js').getLogger(api.packageName);
const serverFavicon = require('serve-favicon');

export function deactivate() {
  fetchRemote.stop();
}
export function activate(api: ExtensionContext) {
  var staticFolder = api.config.resolve('staticDir');
  log.debug('express static path: ' + staticFolder);


  var favicon = findFavicon();
  if (favicon)
    api.use(serverFavicon(favicon));

  var maxAgeMap = getSetting().cacheControlMaxAge;
  log.info('cache control', maxAgeMap);
  log.info('Serve static dir', staticFolder);

  // api.use('/', createResponseTimestamp);
  proxyToDevServer();

  const httpProxySet = getSetting().httpProxy;
  if (httpProxySet) {
    for (const proxyPath of Object.keys(httpProxySet)) {
      log.info(`Enable HTTP proxy ${proxyPath} -> ${httpProxySet[proxyPath]}`);
      setupHttpProxy(proxyPath, httpProxySet[proxyPath]);
    }
  }
  // const zss = createZipRoute(maxAgeMap);

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
  fallbackIndexHtml();
  api.use('/', staticHandler); // Serve fallbacked request to index.html

  const mailSetting = (api.config.get(api.packageName) as WithMailServerConfig).fetchMailServer;
  const imap = new ImapManager(mailSetting ? mailSetting.env : 'local');

  api.eventBus.on('appCreated', () => {
    // appCreated event is emitted by express-app
    void fetchRemote.start(imap);
  });

  if (!api.config().devMode) {
    return;
  }
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
        var favicon = Path.join(pkg.realPath, assetsFolder, 'favicon.ico');
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

