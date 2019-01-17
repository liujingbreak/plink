"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable:max-line-length
require("./node-inject");
const core_1 = require("@angular-devkit/core");
const operators_1 = require("rxjs/operators");
const url = tslib_1.__importStar(require("url"));
const check_port_1 = require("@angular-devkit/build-angular/src/angular-cli-files/utilities/check-port");
const utils_1 = require("@angular-devkit/build-angular/src/utils");
const opn = require('opn');
// DRCP
const build_angular_1 = require("@angular-devkit/build-angular");
const drcpCommon = tslib_1.__importStar(require("./common"));
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9kZXYtc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLGlDQUFpQztBQUNqQyx5QkFBdUI7QUFNdkIsK0NBQWdFO0FBR2hFLDhDQUFxRDtBQUNyRCxpREFBMkI7QUFDM0IseUdBQXFHO0FBR3JHLG1FQUFpRjtBQUNqRixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7QUFFMUIsT0FBTztBQUNSLGlFQUF3RjtBQUN4Riw2REFBdUM7QUFFdkMsZ0dBQWdHO0FBRWhHLE1BQXFCLGFBQWMsU0FBUSxnQ0FBZ0I7SUFDMUQsR0FBRyxDQUFDLGFBQTREO1FBQy9ELE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUM7UUFDdEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDO1FBQ3pDLE1BQU0sV0FBVyxHQUFHLGNBQU8sQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RELE1BQU0sSUFBSSxHQUFHLElBQUksZ0JBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUE2QixDQUFDLENBQUM7UUFDakYsMEZBQTBGO1FBQzFGLElBQUksY0FBOEMsQ0FBQztRQUNuRCxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUM7UUFDakIsSUFBSSxVQUFrQixDQUFDO1FBRXZCLE9BQU8sc0JBQVMsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQ2hELGVBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsRUFDbEMscUJBQVMsQ0FBQyxHQUFHLEVBQUUsQ0FBRSxJQUFZLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUMsRUFD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LEdBQUcsYUFBYSxHQUFHLGNBQWMsQ0FBQyxTQUFTLENBQUM7Z0JBQ3RELHNEQUFzRDtnQkFFdEQsc0RBQXNEO2dCQUN0RCwwRUFBMEU7Z0JBQzFFLEtBQUs7Z0JBQ0wsT0FBTyxhQUFhLENBQUM7WUFDdEIsQ0FBQyxDQUFDLENBQUM7UUFDSixDQUFDLENBQUMsRUFDRixlQUFHLENBQUMsVUFBVSxDQUFDLEVBQUU7WUFDaEIsSUFBSSxLQUFLLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtnQkFDMUIsS0FBSyxHQUFHLEtBQUssQ0FBQztnQkFDZCxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7YUFDaEI7WUFFRCxPQUFPLFVBQVUsQ0FBQztRQUNuQixDQUFDLENBQUM7UUFDRixrRUFBa0U7U0FDeEMsQ0FBQztJQUM3QixDQUFDO0NBQ0Q7QUFoSEQsZ0NBZ0hDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L25nL2Rldi1zZXJ2ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcbi8vIHRzbGludDpkaXNhYmxlOm1heC1saW5lLWxlbmd0aFxuaW1wb3J0ICcuL25vZGUtaW5qZWN0JztcblxuaW1wb3J0IHtcblx0QnVpbGRFdmVudCxcblx0QnVpbGRlckNvbmZpZ3VyYXRpb25cbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQgeyByZXNvbHZlLCB0YWdzLCB2aXJ0dWFsRnMgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBTdGF0c30gZnJvbSAnZnMnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZSB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHsgY29uY2F0TWFwLCBtYXAsIHRhcCB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIHVybCBmcm9tICd1cmwnO1xuaW1wb3J0IHsgY2hlY2tQb3J0IH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvc3JjL2FuZ3VsYXItY2xpLWZpbGVzL3V0aWxpdGllcy9jaGVjay1wb3J0Jztcbi8vIGltcG9ydCB7IE5vcm1hbGl6ZWRCcm93c2VyQnVpbGRlclNjaGVtYSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL3NyYy9icm93c2VyLyc7XG5pbXBvcnQgeyBOb3JtYWxpemVkQnJvd3NlckJ1aWxkZXJTY2hlbWEgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9zcmMvYnJvd3Nlci9zY2hlbWEnO1xuaW1wb3J0IHsgbm9ybWFsaXplQnVpbGRlclNjaGVtYSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL3NyYy91dGlscyc7XG5jb25zdCBvcG4gPSByZXF1aXJlKCdvcG4nKTtcblxuIC8vIERSQ1BcbmltcG9ydCB7RGV2U2VydmVyQnVpbGRlciwgRGV2U2VydmVyQnVpbGRlck9wdGlvbnN9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyJztcbmltcG9ydCAqIGFzIGRyY3BDb21tb24gZnJvbSAnLi9jb21tb24nO1xuXG4vLyBleHBvcnQgdHlwZSBidWlsZFdlYnBhY2tDb25maWdGdW5jID0gKGJyb3dzZXJPcHRpb25zOiBOb3JtYWxpemVkQnJvd3NlckJ1aWxkZXJTY2hlbWEpID0+IGFueTtcblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgRHJjcERldlNlcnZlciBleHRlbmRzIERldlNlcnZlckJ1aWxkZXIge1xuXHRydW4oYnVpbGRlckNvbmZpZzogQnVpbGRlckNvbmZpZ3VyYXRpb248RGV2U2VydmVyQnVpbGRlck9wdGlvbnM+KTogT2JzZXJ2YWJsZTxCdWlsZEV2ZW50PiB7XG5cdFx0Y29uc3Qgb3B0aW9ucyA9IGJ1aWxkZXJDb25maWcub3B0aW9ucztcblx0XHRjb25zdCByb290ID0gdGhpcy5jb250ZXh0LndvcmtzcGFjZS5yb290O1xuXHRcdGNvbnN0IHByb2plY3RSb290ID0gcmVzb2x2ZShyb290LCBidWlsZGVyQ29uZmlnLnJvb3QpO1xuXHRcdGNvbnN0IGhvc3QgPSBuZXcgdmlydHVhbEZzLkFsaWFzSG9zdCh0aGlzLmNvbnRleHQuaG9zdCBhcyB2aXJ0dWFsRnMuSG9zdDxTdGF0cz4pO1xuXHRcdC8vIGNvbnN0IHdlYnBhY2tEZXZTZXJ2ZXJCdWlsZGVyID0gbmV3IFdlYnBhY2tEZXZTZXJ2ZXJCdWlsZGVyKHsgLi4udGhpcy5jb250ZXh0LCBob3N0IH0pO1xuXHRcdGxldCBicm93c2VyT3B0aW9uczogTm9ybWFsaXplZEJyb3dzZXJCdWlsZGVyU2NoZW1hO1xuXHRcdGxldCBmaXJzdCA9IHRydWU7XG5cdFx0bGV0IG9wbkFkZHJlc3M6IHN0cmluZztcblxuXHRcdHJldHVybiBjaGVja1BvcnQob3B0aW9ucy5wb3J0LCBvcHRpb25zLmhvc3QpLnBpcGUoXG5cdFx0XHR0YXAoKHBvcnQpID0+IG9wdGlvbnMucG9ydCA9IHBvcnQpLFxuXHRcdFx0Y29uY2F0TWFwKCgpID0+ICh0aGlzIGFzIGFueSkuX2dldEJyb3dzZXJPcHRpb25zKG9wdGlvbnMpKSxcblx0XHRcdHRhcChvcHRzID0+IGJyb3dzZXJPcHRpb25zID0gbm9ybWFsaXplQnVpbGRlclNjaGVtYShcblx0XHRcdFx0aG9zdCxcblx0XHRcdFx0cm9vdCxcblx0XHRcdFx0b3B0cyBhcyBhbnlcblx0XHRcdCkpLFxuXHRcdFx0Y29uY2F0TWFwKCgpID0+IHtcblx0XHRcdFx0cmV0dXJuIGRyY3BDb21tb24uc3RhcnREcmNwU2VydmVyKGJ1aWxkZXJDb25maWcucm9vdCwgYnVpbGRlckNvbmZpZyxcblx0XHRcdFx0XHRicm93c2VyT3B0aW9ucyBhcyBkcmNwQ29tbW9uLkFuZ3VsYXJCdWlsZGVyT3B0aW9ucywgKCk9PiB7XG5cdFx0XHRcdFx0Y29uc3Qgd2VicGFja0NvbmZpZyA9IHRoaXMuYnVpbGRXZWJwYWNrQ29uZmlnKHJvb3QsIHByb2plY3RSb290LCBob3N0LCBicm93c2VyT3B0aW9ucyk7XG5cblx0XHRcdFx0XHQvLyBsZXQgd2VicGFja0RldlNlcnZlckNvbmZpZzogV2VicGFja0RldlNlcnZlci5Db25maWd1cmF0aW9uO1xuXHRcdFx0XHRcdC8vIHRyeSB7XG5cdFx0XHRcdFx0Ly8gXHR3ZWJwYWNrRGV2U2VydmVyQ29uZmlnID0gKHRoaXMgYXMgYW55KV9idWlsZFNlcnZlckNvbmZpZyhcblx0XHRcdFx0XHQvLyBcdFx0cm9vdCxcblx0XHRcdFx0XHQvLyBcdFx0b3B0aW9ucyxcblx0XHRcdFx0XHQvLyBcdFx0YnJvd3Nlck9wdGlvbnNcblx0XHRcdFx0XHQvLyBcdCk7XG5cdFx0XHRcdFx0Ly8gfSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRcdFx0Ly8gXHRyZXR1cm4gdGhyb3dFcnJvcihlcnIpO1xuXHRcdFx0XHRcdC8vIH1cblxuXHRcdFx0XHRcdC8vIFJlc29sdmUgcHVibGljIGhvc3QgYW5kIGNsaWVudCBhZGRyZXNzLlxuXHRcdFx0XHRcdC8vIGxldCBjbGllbnRBZGRyZXNzID0gYCR7b3B0aW9ucy5zc2wgPyAnaHR0cHMnIDogJ2h0dHAnfTovLzAuMC4wLjA6MGA7XG5cdFx0XHRcdFx0aWYgKG9wdGlvbnMucHVibGljSG9zdCkge1xuXHRcdFx0XHRcdFx0bGV0IHB1YmxpY0hvc3QgPSBvcHRpb25zLnB1YmxpY0hvc3Q7XG5cdFx0XHRcdFx0XHRpZiAoIS9eXFx3KzpcXC9cXC8vLnRlc3QocHVibGljSG9zdCkpIHtcblx0XHRcdFx0XHRcdFx0cHVibGljSG9zdCA9IGAke29wdGlvbnMuc3NsID8gJ2h0dHBzJyA6ICdodHRwJ306Ly8ke3B1YmxpY0hvc3R9YDtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGNvbnN0IGNsaWVudFVybCA9IHVybC5wYXJzZShwdWJsaWNIb3N0KTtcblx0XHRcdFx0XHRcdG9wdGlvbnMucHVibGljSG9zdCA9IGNsaWVudFVybC5ob3N0O1xuXHRcdFx0XHRcdFx0Ly8gY2xpZW50QWRkcmVzcyA9IHVybC5mb3JtYXQoY2xpZW50VXJsKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQvLyBSZXNvbHZlIHNlcnZlIGFkZHJlc3MuXG5cdFx0XHRcdFx0Y29uc3Qgc2VydmVyQWRkcmVzcyA9IHVybC5mb3JtYXQoe1xuXHRcdFx0XHRcdFx0cHJvdG9jb2w6IG9wdGlvbnMuc3NsID8gJ2h0dHBzJyA6ICdodHRwJyxcblx0XHRcdFx0XHRcdGhvc3RuYW1lOiBvcHRpb25zLmhvc3QgPT09ICcwLjAuMC4wJyA/ICdsb2NhbGhvc3QnIDogb3B0aW9ucy5ob3N0LFxuXHRcdFx0XHRcdFx0cG9ydDogb3B0aW9ucy5wb3J0LnRvU3RyaW5nKClcblx0XHRcdFx0XHR9KTtcblxuXHRcdFx0XHRcdC8vIEFkZCBsaXZlIHJlbG9hZCBjb25maWcuXG5cdFx0XHRcdFx0Ly8gaWYgKG9wdGlvbnMubGl2ZVJlbG9hZCkge1xuXHRcdFx0XHRcdC8vIFx0dGhpcy5fYWRkTGl2ZVJlbG9hZChvcHRpb25zLCBicm93c2VyT3B0aW9ucywgd2VicGFja0NvbmZpZywgY2xpZW50QWRkcmVzcyk7XG5cdFx0XHRcdFx0Ly8gfSBlbHNlIGlmIChvcHRpb25zLmhtcikge1xuXHRcdFx0XHRcdC8vIFx0dGhpcy5jb250ZXh0LmxvZ2dlci53YXJuKCdMaXZlIHJlbG9hZCBpcyBkaXNhYmxlZC4gSE1SIG9wdGlvbiBpZ25vcmVkLicpO1xuXHRcdFx0XHRcdC8vIH1cblxuXHRcdFx0XHRcdGlmICghb3B0aW9ucy53YXRjaCkge1xuXHRcdFx0XHRcdFx0Ly8gVGhlcmUncyBubyBvcHRpb24gdG8gdHVybiBvZmYgZmlsZSB3YXRjaGluZyBpbiB3ZWJwYWNrLWRldi1zZXJ2ZXIsIGJ1dFxuXHRcdFx0XHRcdFx0Ly8gd2UgY2FuIG92ZXJyaWRlIHRoZSBmaWxlIHdhdGNoZXIgaW5zdGVhZC5cblx0XHRcdFx0XHRcdHdlYnBhY2tDb25maWcucGx1Z2lucy51bnNoaWZ0KHtcblx0XHRcdFx0XHRcdFx0Ly8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuXHRcdFx0XHRcdFx0XHRhcHBseTogKGNvbXBpbGVyOiBhbnkpID0+IHtcblx0XHRcdFx0XHRcdFx0XHRjb21waWxlci5ob29rcy5hZnRlckVudmlyb25tZW50LnRhcCgnYW5ndWxhci1jbGknLCAoKSA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0XHRjb21waWxlci53YXRjaEZpbGVTeXN0ZW0gPSB7IHdhdGNoOiAoKSA9PiB7IH0gfTtcblx0XHRcdFx0XHRcdFx0XHR9KTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0aWYgKGJyb3dzZXJPcHRpb25zLm9wdGltaXphdGlvbikge1xuXHRcdFx0XHRcdFx0dGhpcy5jb250ZXh0LmxvZ2dlci5lcnJvcih0YWdzLnN0cmlwSW5kZW50c2Bcblx0XHRcdFx0XHRcdFx0KioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXHRcdFx0XHRcdFx0XHRUaGlzIGlzIGEgc2ltcGxlIHNlcnZlciBmb3IgdXNlIGluIHRlc3Rpbmcgb3IgZGVidWdnaW5nIEFuZ3VsYXIgYXBwbGljYXRpb25zIGxvY2FsbHkuXG5cdFx0XHRcdFx0XHRcdEl0IGhhc24ndCBiZWVuIHJldmlld2VkIGZvciBzZWN1cml0eSBpc3N1ZXMuXG5cblx0XHRcdFx0XHRcdFx0RE9OJ1QgVVNFIElUIEZPUiBQUk9EVUNUSU9OIVxuXHRcdFx0XHRcdFx0XHQqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cdFx0XHRcdFx0XHRgKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR0aGlzLmNvbnRleHQubG9nZ2VyLmluZm8odGFncy5vbmVMaW5lYFxuXHRcdFx0XHRcdFx0Kipcblx0XHRcdFx0XHRcdEFuZ3VsYXIgTGl2ZSBEZXZlbG9wbWVudCBTZXJ2ZXIgaXMgbGlzdGVuaW5nIG9uICR7b3B0aW9ucy5ob3N0fToke29wdGlvbnMucG9ydH0sXG5cdFx0XHRcdFx0XHRvcGVuIHlvdXIgYnJvd3NlciBvbiAke3NlcnZlckFkZHJlc3N9JHticm93c2VyT3B0aW9ucy5kZXBsb3lVcmx9XG5cdFx0XHRcdFx0XHQqKlxuXHRcdFx0XHRcdGApO1xuXG5cdFx0XHRcdFx0b3BuQWRkcmVzcyA9IHNlcnZlckFkZHJlc3MgKyBicm93c2VyT3B0aW9ucy5kZXBsb3lVcmw7XG5cdFx0XHRcdFx0Ly8gd2VicGFja0NvbmZpZy5kZXZTZXJ2ZXIgPSBicm93c2VyT3B0aW9ucy5kZXBsb3lVcmw7XG5cblx0XHRcdFx0XHQvLyByZXR1cm4gd2VicGFja0RldlNlcnZlckJ1aWxkZXIucnVuV2VicGFja0RldlNlcnZlcihcblx0XHRcdFx0XHQvLyBcdHdlYnBhY2tDb25maWcsIHVuZGVmaW5lZCwgZ2V0QnJvd3NlckxvZ2dpbmdDYihicm93c2VyT3B0aW9ucy52ZXJib3NlKSxcblx0XHRcdFx0XHQvLyApO1xuXHRcdFx0XHRcdHJldHVybiB3ZWJwYWNrQ29uZmlnO1xuXHRcdFx0XHR9KTtcblx0XHRcdH0pLFxuXHRcdFx0bWFwKGJ1aWxkRXZlbnQgPT4ge1xuXHRcdFx0XHRpZiAoZmlyc3QgJiYgb3B0aW9ucy5vcGVuKSB7XG5cdFx0XHRcdFx0Zmlyc3QgPSBmYWxzZTtcblx0XHRcdFx0XHRvcG4ob3BuQWRkcmVzcyk7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRyZXR1cm4gYnVpbGRFdmVudDtcblx0XHRcdH0pXG5cdFx0XHQvLyB1c2luZyBtb3JlIHRoYW4gMTAgb3BlcmF0b3JzIHdpbGwgY2F1c2UgcnhqcyB0byBsb29zZSB0aGUgdHlwZXNcblx0XHQpIGFzIE9ic2VydmFibGU8QnVpbGRFdmVudD47XG5cdH1cbn1cbiJdfQ==
