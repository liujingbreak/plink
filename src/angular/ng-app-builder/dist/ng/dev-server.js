"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const build_angular_1 = require("@angular-devkit/build-angular");
const core_1 = require("@angular-devkit/core");
const check_port_1 = require("@angular-devkit/build-angular/src/angular-cli-files/utilities/check-port");
const url = require("url");
// import {
// 	statsErrorsToString,
// 	statsToString,
// 	statsWarningsToString
// 	} from '@angular-devkit/build-angular/src/angular-cli-files/utilities/stats';
const browser_1 = require("@angular-devkit/build-angular/src/browser");
const utils_1 = require("@angular-devkit/build-angular/src/utils");
const Rx = require("rxjs");
const operators_1 = require("rxjs/operators");
class DrcpDevServer extends build_angular_1.DevServerBuilder {
    run(builderConfig) {
        this.context.logger.info('Hellow from DRCP with Angular');
        const options = builderConfig.options;
        const root = this.context.workspace.root;
        const projectRoot = core_1.resolve(root, builderConfig.root);
        const host = new core_1.virtualFs.AliasHost(this.context.host);
        let browserOptions;
        return check_port_1.checkPort(options.port, options.host)
            .pipe(operators_1.tap((port) => options.port = port), operators_1.concatMap(() => this._getBrowserOptions1(options)), operators_1.tap((opts) => browserOptions = opts), operators_1.concatMap(() => utils_1.addFileReplacements(root, host, browserOptions.fileReplacements)), operators_1.concatMap(() => utils_1.normalizeAssetPatterns(browserOptions.assets, host, root, projectRoot, builderConfig.sourceRoot)), 
        // Replace the assets in options with the normalized version.
        operators_1.tap((assetPatternObjects => browserOptions.assets = assetPatternObjects)), operators_1.concatMap(() => new Rx.Observable(obs => {
            const browserBuilder = new browser_1.BrowserBuilder(this.context);
            // DRCP
            // browserOptions.tsConfig = Path.join(process.cwd(), 'dist', 'webpack-temp', 'angular-app-tsconfig.json');
            function buildWebpackConfig(browserOptions) {
                return browserBuilder.buildWebpackConfig(root, projectRoot, host, browserOptions);
            }
            // const webpackConfig = browserBuilder.buildWebpackConfig(
            // 	root, projectRoot, host, browserOptions as NormalizedBrowserBuilderSchema);
            // const statsConfig = getWebpackStatsConfig(browserOptions.verbose);
            // Resolve public host and client address.
            // let clientAddress = `${options.ssl ? 'https' : 'http'}://0.0.0.0:0`;
            if (options.publicHost) {
                let publicHost = options.publicHost;
                if (!/^\w+:\/\//.test(publicHost)) {
                    publicHost = `${options.ssl ? 'https' : 'http'}://${publicHost}`;
                }
                const clientUrl = url.parse(publicHost);
                options.publicHost = clientUrl.host;
                //   clientAddress = url.format(clientUrl);
            }
            // Resolve serve address.
            const serverAddress = url.format({
                protocol: options.ssl ? 'https' : 'http',
                hostname: options.host === '0.0.0.0' ? 'localhost' : options.host,
                port: options.port.toString()
            });
            // Add live reload config.
            // if (options.liveReload) {
            //   this._addLiveReload(options, browserOptions, webpackConfig, clientAddress);
            // } else if (options.hmr) {
            //   this.context.logger.warn('Live reload is disabled. HMR option ignored.');
            // }
            this.context.logger.info(core_1.tags.oneLine `
					**
					Angular Live Development Server is listening on ${options.host}:
					${options.port}, open your browser on ${serverAddress}
					**
				`);
            obs.next(buildWebpackConfig);
            obs.complete();
        })), operators_1.concatMap((buildWebpackConfig) => {
            return this.startDrcpServer(builderConfig, browserOptions, buildWebpackConfig);
        }), operators_1.tap((msg) => console.log));
    }
    startDrcpServer(builderConfig, browserOptions, buildWebpackConfig) {
        let argv = {};
        var config = require('dr-comp-package/wfh/lib/config');
        return Rx.Observable.create((obs) => {
            require('dr-comp-package/wfh/lib/logConfig')(config().rootPath, config().log4jsReloadSeconds);
            let param = {
                builderConfig,
                browserOptions,
                buildWebpackConfig,
                argv: {
                    poll: builderConfig.options.poll,
                    hmr: builderConfig.options.hmr
                }
            };
            config.set('_angularCli', param);
            config.set('port', builderConfig.options.port);
            var log = require('log4js').getLogger('ng-app-builder.ng.dev-server');
            var pkMgr = require('dr-comp-package/wfh/lib/packageMgr');
            try {
                process.on('uncaughtException', function (err) {
                    log.error('Uncaught exception: ', err, err.stack);
                    // throw err; // let PM2 handle exception
                    obs.error(err);
                });
                process.on('SIGINT', function () {
                    log.info('Recieve SIGINT, bye.');
                    obs.next({ success: true });
                    obs.complete();
                    setTimeout(() => process.exit(0), 500);
                });
                process.on('message', function (msg) {
                    if (msg === 'shutdown') {
                        log.info('Recieve shutdown message from PM2, bye.');
                        process.exit(0);
                        obs.next({ success: true });
                        obs.complete();
                    }
                });
                process._config = config;
                pkMgr.runServer(argv)
                    .catch((err) => {
                    console.error('Failed to start server:', err);
                    // process.exit(1); // Log4js "log4jsReloadSeconds" will hang process event loop, so we have to explicitly quit.
                    obs.error(err);
                });
            }
            catch (err) {
                console.error('Failed to start server:', err);
                obs.error(err);
            }
        });
    }
    _getBrowserOptions1(options) {
        const architect = this.context.architect;
        const [project, target, configuration] = options.browserTarget.split(':');
        // Override browser build watch setting.
        const overrides = { watch: options.watch };
        const browserTargetSpec = { project, target, configuration, overrides };
        const builderConfig = architect.getBuilderConfiguration(browserTargetSpec);
        // Update the browser options with the same options we support in serve, if defined.
        builderConfig.options = Object.assign({}, (options.optimization !== undefined ? { optimization: options.optimization } : {}), (options.aot !== undefined ? { aot: options.aot } : {}), (options.sourceMap !== undefined ? { sourceMap: options.sourceMap } : {}), (options.evalSourceMap !== undefined ? { evalSourceMap: options.evalSourceMap } : {}), (options.vendorChunk !== undefined ? { vendorChunk: options.vendorChunk } : {}), (options.commonChunk !== undefined ? { commonChunk: options.commonChunk } : {}), (options.baseHref !== undefined ? { baseHref: options.baseHref } : {}), (options.progress !== undefined ? { progress: options.progress } : {}), (options.poll !== undefined ? { poll: options.poll } : {}), builderConfig.options);
        return architect.getBuilderDescription(builderConfig).pipe(operators_1.concatMap(browserDescription => architect.validateBuilderOptions(builderConfig, browserDescription)), operators_1.map(browserConfig => browserConfig.options));
    }
}
exports.default = DrcpDevServer;
// export default DevServerBuilder;

//# sourceMappingURL=dev-server.js.map
