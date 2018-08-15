"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./node-inject");
const core_1 = require("@angular-devkit/core");
const operators_1 = require("rxjs/operators");
const url = require("url");
const check_port_1 = require("@angular-devkit/build-angular/src/angular-cli-files/utilities/check-port");
const utils_1 = require("@angular-devkit/build-angular/src/utils");
const opn = require('opn');
// DRCP
const build_angular_1 = require("@angular-devkit/build-angular");
const common = require("./common");
class DrcpDevServer extends build_angular_1.DevServerBuilder {
    run(builderConfig) {
        const options = builderConfig.options;
        const root = this.context.workspace.root;
        const projectRoot = core_1.resolve(root, builderConfig.root);
        // DRCP replaces virtualFs with ReadHookHost
        const host = new core_1.virtualFs.AliasHost(this.context.host);
        // const webpackDevServerBuilder = new WebpackDevServerBuilder({ ...this.context, host });
        let browserOptions;
        let first = true;
        let opnAddress;
        return check_port_1.checkPort(options.port, options.host).pipe(operators_1.tap((port) => options.port = port), operators_1.concatMap(() => this._getBrowserOptions1(options)), operators_1.tap((opts) => browserOptions = opts), operators_1.concatMap(() => utils_1.normalizeFileReplacements(browserOptions.fileReplacements, host, root)), operators_1.tap(fileReplacements => browserOptions.fileReplacements = fileReplacements), operators_1.concatMap(() => utils_1.normalizeAssetPatterns(browserOptions.assets, host, root, projectRoot, builderConfig.sourceRoot)), 
        // Replace the assets in options with the normalized version.
        operators_1.tap((assetPatternObjects => browserOptions.assets = assetPatternObjects)), operators_1.concatMap(() => {
            // let webpackDevServerConfig: any;
            // try {
            //   webpackDevServerConfig = this._buildServerConfig(
            // 	root, projectRoot, options, browserOptions);
            // } catch (err) {
            //   return throwError(err);
            // }
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
            // DRCP: I will do live reload
            // Add live reload config.
            // if (options.liveReload) {
            //   this._addLiveReload(options, browserOptions, webpackConfig, clientAddress);
            // } else if (options.hmr) {
            //   this.context.logger.warn('Live reload is disabled. HMR option ignored.');
            // }
            if (browserOptions.optimization) {
                this.context.logger.error(core_1.tags.stripIndents `
						****************************************************************************************
						This is a simple server for use in testing or debugging Angular applications locally.
						It hasn't been reviewed for security issues.
			
						DON'T USE IT FOR PRODUCTION!
						****************************************************************************************
					`);
            }
            this.context.logger.info(core_1.tags.oneLine `
				**
				DRCP Live Development Server is listening on ${options.host}:${options.port},
				open your browser on ${serverAddress}
				**
				`);
            // opnAddress = serverAddress + webpackDevServerConfig.publicPath;
            // webpackConfig.devServer = webpackDevServerConfig;
            // return webpackDevServerBuilder.runWebpackDevServer(
            //   webpackConfig, undefined, getBrowserLoggingCb(browserOptions.verbose)
            // );
            // DRCP
            return common.startDrcpServer(builderConfig.root, builderConfig, browserOptions, () => {
                const webpackConfig = this.buildWebpackConfig(root, projectRoot, host, browserOptions);
                if (!options.watch) {
                    // There's no option to turn off file watching in webpack-dev-server, but
                    // we can override the file watcher instead.
                    webpackConfig.plugins.unshift({
                        // tslint:disable-next-line:no-any
                        apply: (compiler) => {
                            compiler.hooks.afterEnvironment.tap('angular-cli', () => {
                                compiler.watchFileSystem = { watch: () => { } };
                            });
                        }
                    });
                }
                opnAddress = serverAddress; // TODO: publicPath
                return webpackConfig;
            });
        }), operators_1.map(buildEvent => {
            if (first && options.open) {
                first = false;
                opn(opnAddress);
            }
            return buildEvent;
        }));
    }
    _getBrowserOptions1(options) {
        const architect = this.context.architect;
        const [project, target, configuration] = options.browserTarget.split(':');
        const overrides = Object.assign({ 
            // Override browser build watch setting.
            watch: options.watch }, (options.optimization !== undefined ? { optimization: options.optimization } : {}), (options.aot !== undefined ? { aot: options.aot } : {}), (options.sourceMap !== undefined ? { sourceMap: options.sourceMap } : {}), (options.vendorSourceMap !== undefined ?
            { vendorSourceMap: options.vendorSourceMap } : {}), (options.evalSourceMap !== undefined ? { evalSourceMap: options.evalSourceMap } : {}), (options.vendorChunk !== undefined ? { vendorChunk: options.vendorChunk } : {}), (options.commonChunk !== undefined ? { commonChunk: options.commonChunk } : {}), (options.baseHref !== undefined ? { baseHref: options.baseHref } : {}), (options.progress !== undefined ? { progress: options.progress } : {}), (options.poll !== undefined ? { poll: options.poll } : {}));
        const browserTargetSpec = { project, target, configuration, overrides };
        const builderConfig = architect.getBuilderConfiguration(browserTargetSpec);
        return architect.getBuilderDescription(builderConfig).pipe(operators_1.concatMap(browserDescription => architect.validateBuilderOptions(builderConfig, browserDescription)), operators_1.map(browserConfig => browserConfig.options));
    }
}
exports.default = DrcpDevServer;

//# sourceMappingURL=dev-server.js.map
