"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = exports.deactivate = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const fs_extra_1 = tslib_1.__importDefault(require("fs-extra"));
const lodash_1 = tslib_1.__importDefault(require("lodash"));
// import * as rx from 'rxjs';
// import * as op from 'rxjs/operators';
const serve_index_1 = tslib_1.__importDefault(require("serve-index"));
const plink_1 = require("@wfh/plink");
const assets_processer_setting_1 = require("../isom/assets-processer-setting");
const cd_server_1 = require("./content-deployer/cd-server");
const fetchRemote = tslib_1.__importStar(require("./fetch-remote"));
const fetch_remote_imap_1 = require("./fetch-remote-imap");
const index_html_route_1 = require("./index-html-route");
const static_middleware_1 = require("./static-middleware");
// import {createProxyWithCache} from './proxy-cache/cache-service';
// import createNpmRegistryServer from './proxy-cache/npm-registry-cache-service';
const utils_1 = require("./utils");
const log = (0, plink_1.log4File)(__filename);
// const log = require('log4js').getLogger(api.packageName);
const serverFavicon = require('serve-favicon');
// const deactivateSubj = new rx.ReplaySubject<() => (PromiseLike<any> | void)>();
function deactivate() {
    fetchRemote.stop();
    // return deactivateSubj.pipe(
    //   op.mergeMap(shutdown => rx.defer(() => shutdown()))
    // ).toPromise();
}
exports.deactivate = deactivate;
function activate(api) {
    var _a;
    const staticFolder = api.config.resolve('staticDir');
    log.debug('express static path: ' + staticFolder);
    const favicon = findFavicon();
    if (favicon)
        api.use(serverFavicon(favicon));
    const maxAgeMap = (0, assets_processer_setting_1.getSetting)().cacheControlMaxAge;
    log.info('cache control', maxAgeMap);
    log.info('Serve static dir', staticFolder);
    // api.use('/', createResponseTimestamp);
    (0, index_html_route_1.proxyToDevServer)(api);
    const httpProxySet = (0, assets_processer_setting_1.getSetting)().httpProxy;
    if (httpProxySet) {
        for (const proxyPath of Object.keys(httpProxySet)) {
            log.info(`Enable HTTP proxy ${proxyPath} -> ${httpProxySet[proxyPath]}`);
            (0, utils_1.setupHttpProxy)(proxyPath, httpProxySet[proxyPath]);
        }
    }
    const httpProxyWithCacheSet = (0, assets_processer_setting_1.getSetting)().httpProxyWithCache;
    if (httpProxyWithCacheSet) {
        for (const proxyPath of Object.keys(httpProxyWithCacheSet)) {
            const dir = path_1.default.join((0, plink_1.config)().destDir, 'http-proxy-cache', lodash_1.default.trimStart(proxyPath, '/'));
            const endPoint = httpProxyWithCacheSet[proxyPath];
            log.info(`Enable HTTP proxy ${proxyPath} --> ${endPoint}, cache directory: ${dir}`);
            // createProxyWithCache(proxyPath, {target: endPoint}, dir);
        }
    }
    // const saveNpmRegistry = createNpmRegistryServer(api);
    // if (saveNpmRegistry)
    //   deactivateSubj.next(saveNpmRegistry);
    // api.use('/', zss.handler);
    const staticHandler = (0, static_middleware_1.createStaticRoute)(staticFolder, maxAgeMap);
    api.use('/', staticHandler);
    // api.use('/', createStaticRoute(api.config.resolve('dllDestDir'), maxAgeMap));
    if (api.config.get([api.packageName, 'serveIndex'])) {
        const stylesheet = path_1.default.resolve(__dirname, '../serve-index.css');
        process.title = 'File server on ' + staticFolder;
        api.use('/', (0, serve_index_1.default)(staticFolder, { icons: true, stylesheet }));
    }
    else {
        log.info(chalk_1.default.blueBright(`If you want to serve directory index page for resource directory other than ${staticFolder}\n` +
            ` start command with "--prop ${api.packageName}.serveIndex=true --prop staticDir=<resource directory>`));
    }
    api.expressAppSet(app => (0, cd_server_1.activate)(app, imap));
    (0, index_html_route_1.fallbackIndexHtml)(api);
    api.use('/', staticHandler); // Serve fallbacked request to index.html
    const mailSetting = api.config.get(api.packageName).fetchMailServer;
    const imap = new fetch_remote_imap_1.ImapManager(mailSetting ? mailSetting.env : 'local');
    (_a = api.eventBus) === null || _a === void 0 ? void 0 : _a.once('appCreated', () => {
        // appCreated event is emitted by express-app
        void fetchRemote.start(imap);
    });
    // deactivateSubj.complete();
}
exports.activate = activate;
function findFavicon() {
    return _findFaviconInConfig('packageContextPathMapping') || _findFaviconInConfig('outputPathMap');
}
function _findFaviconInConfig(property) {
    if (!(0, plink_1.config)()[property]) {
        return null;
    }
    let faviconFile;
    let faviconPackage;
    lodash_1.default.each((0, plink_1.config)()[property], (path, pkName) => {
        var _a, _b;
        if (path === '/') {
            const pkg = [...(0, plink_1.findPackagesByNames)([pkName])][0];
            if (pkg) {
                const assetsFolder = ((_a = pkg.json.plink) === null || _a === void 0 ? void 0 : _a.assetsDir) || ((_b = pkg.json.dr) === null || _b === void 0 ? void 0 : _b.assetsDir) || 'assets';
                const favicon = path_1.default.join(pkg.realPath, assetsFolder, 'favicon.ico');
                if (fs_extra_1.default.existsSync(favicon)) {
                    if (faviconFile) {
                        log.warn('Found duplicate favicon file in', pkg.name, 'existing', faviconPackage);
                    }
                    faviconFile = path_1.default.resolve(favicon);
                    faviconPackage = pkg.name;
                }
            }
        }
    });
    return faviconFile;
}
//# sourceMappingURL=index.js.map