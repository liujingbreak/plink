"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// tslint:disable:max-line-length
require("./node-inject");
const core_1 = require("@angular-devkit/core");
const operators_1 = require("rxjs/operators");
const url = require("url");
const check_port_1 = require("@angular-devkit/build-angular/src/angular-cli-files/utilities/check-port");
const utils_1 = require("@angular-devkit/build-angular/src/utils");
const opn = require('opn');
// DRCP
const build_angular_1 = require("@angular-devkit/build-angular");
const drcpCommon = require("./common");
// export type buildWebpackConfigFunc = (browserOptions: NormalizedBrowserBuilderSchema) => any;
class DrcpDevServer extends build_angular_1.DevServerBuilder {
    run(builderConfig) {
        const options = builderConfig.options;
        const root = this.context.workspace.root;
        const projectRoot = core_1.resolve(root, builderConfig.root);
        const host = new core_1.virtualFs.AliasHost(this.context.host);
        // const webpackDevServerBuilder = new WebpackDevServerBuilder({ ...this.context, host });
        let browserOptions;
        let first = true;
        let opnAddress;
        return check_port_1.checkPort(options.port, options.host).pipe(operators_1.tap((port) => options.port = port), operators_1.concatMap(() => this._getBrowserOptions(options)), operators_1.tap(opts => browserOptions = utils_1.normalizeBuilderSchema(host, root, opts)), operators_1.concatMap(() => {
            return drcpCommon.startDrcpServer(builderConfig.root, builderConfig, browserOptions, () => {
                const webpackConfig = this.buildWebpackConfig(root, projectRoot, host, browserOptions);
                // let webpackDevServerConfig: WebpackDevServer.Configuration;
                // try {
                // 	webpackDevServerConfig = (this as any)_buildServerConfig(
                // 		root,
                // 		options,
                // 		browserOptions
                // 	);
                // } catch (err) {
                // 	return throwError(err);
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
                    // clientAddress = url.format(clientUrl);
                }
                // Resolve serve address.
                const serverAddress = url.format({
                    protocol: options.ssl ? 'https' : 'http',
                    hostname: options.host === '0.0.0.0' ? 'localhost' : options.host,
                    port: options.port.toString()
                });
                // Add live reload config.
                // if (options.liveReload) {
                // 	this._addLiveReload(options, browserOptions, webpackConfig, clientAddress);
                // } else if (options.hmr) {
                // 	this.context.logger.warn('Live reload is disabled. HMR option ignored.');
                // }
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
						Angular Live Development Server is listening on ${options.host}:${options.port},
						open your browser on ${serverAddress}${browserOptions.deployUrl}
						**
					`);
                opnAddress = serverAddress + browserOptions.deployUrl;
                // webpackConfig.devServer = browserOptions.deployUrl;
                // return webpackDevServerBuilder.runWebpackDevServer(
                // 	webpackConfig, undefined, getBrowserLoggingCb(browserOptions.verbose),
                // );
                return webpackConfig;
            });
        }), operators_1.map(buildEvent => {
            if (first && options.open) {
                first = false;
                opn(opnAddress);
            }
            return buildEvent;
        })
        // using more than 10 operators will cause rxjs to loose the types
        );
    }
}
exports.default = DrcpDevServer;

//# sourceMappingURL=dev-server.js.map
