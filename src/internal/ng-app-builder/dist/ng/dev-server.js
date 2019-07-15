"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
// tslint:disable:max-line-length
require("./node-inject");
const core_1 = require("@angular-devkit/core");
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const url = tslib_1.__importStar(require("url"));
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
        // return checkPort(options.port, options.host).pipe(
        return rxjs_1.of(options.port).pipe(operators_1.tap((port) => options.port = port), operators_1.concatMap(() => this._getBrowserOptions(options)), operators_1.tap(opts => browserOptions = utils_1.normalizeBuilderSchema(host, root, opts)), operators_1.concatMap(() => {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9kZXYtc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLGlDQUFpQztBQUNqQyx5QkFBdUI7QUFNdkIsK0NBQWdFO0FBRWhFLCtCQUFzQztBQUN0Qyw4Q0FBcUQ7QUFDckQsaURBQTJCO0FBSTNCLG1FQUFpRjtBQUNqRixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7QUFFMUIsT0FBTztBQUNSLGlFQUF3RjtBQUN4Riw2REFBdUM7QUFFdkMsZ0dBQWdHO0FBRWhHLE1BQXFCLGFBQWMsU0FBUSxnQ0FBZ0I7SUFDekQsR0FBRyxDQUFDLGFBQTREO1FBQzlELE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUM7UUFDdEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDO1FBQ3pDLE1BQU0sV0FBVyxHQUFHLGNBQU8sQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RELE1BQU0sSUFBSSxHQUFHLElBQUksZ0JBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUE2QixDQUFDLENBQUM7UUFDakYsMEZBQTBGO1FBQzFGLElBQUksY0FBOEMsQ0FBQztRQUNuRCxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUM7UUFDakIsSUFBSSxVQUFrQixDQUFDO1FBRXZCLHFEQUFxRDtRQUNyRCxPQUFPLFNBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUMxQixlQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQ2xDLHFCQUFTLENBQUMsR0FBRyxFQUFFLENBQUUsSUFBWSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQzFELGVBQUcs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QWEsR0FBRyxjQUFjLENBQUMsU0FBUyxDQUFDO2dCQUN0RCxzREFBc0Q7Z0JBRXRELHNEQUFzRDtnQkFDdEQsMEVBQTBFO2dCQUMxRSxLQUFLO2dCQUNMLE9BQU8sYUFBYSxDQUFDO1lBQ3ZCLENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDLEVBQ0YsZUFBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQ2YsSUFBSSxLQUFLLElBQUksT0FBTyxDQUFDLElBQUksRUFBRTtnQkFDekIsS0FBSyxHQUFHLEtBQUssQ0FBQztnQkFDZCxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUM7YUFDakI7WUFFRCxPQUFPLFVBQVUsQ0FBQztRQUNwQixDQUFDLENBQUM7UUFDRixrRUFBa0U7U0FDekMsQ0FBQztJQUM5QixDQUFDO0NBQ0Y7QUFqSEQsZ0NBaUhDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L25nL2Rldi1zZXJ2ZXIuanMiLCJzb3VyY2VzQ29udGVudCI6WyJcbi8vIHRzbGludDpkaXNhYmxlOm1heC1saW5lLWxlbmd0aFxuaW1wb3J0ICcuL25vZGUtaW5qZWN0JztcblxuaW1wb3J0IHtcbiAgQnVpbGRFdmVudCxcbiAgQnVpbGRlckNvbmZpZ3VyYXRpb25cbn0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQgeyByZXNvbHZlLCB0YWdzLCB2aXJ0dWFsRnMgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvY29yZSc7XG5pbXBvcnQgeyBTdGF0c30gZnJvbSAnZnMnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZSwgb2YgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7IGNvbmNhdE1hcCwgbWFwLCB0YXAgfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgKiBhcyB1cmwgZnJvbSAndXJsJztcbi8vIGltcG9ydCB7IGNoZWNrUG9ydCB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL3NyYy9hbmd1bGFyLWNsaS1maWxlcy91dGlsaXRpZXMvY2hlY2stcG9ydCc7XG4vLyBpbXBvcnQgeyBOb3JtYWxpemVkQnJvd3NlckJ1aWxkZXJTY2hlbWEgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9zcmMvYnJvd3Nlci8nO1xuaW1wb3J0IHsgTm9ybWFsaXplZEJyb3dzZXJCdWlsZGVyU2NoZW1hIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvc3JjL2Jyb3dzZXIvc2NoZW1hJztcbmltcG9ydCB7IG5vcm1hbGl6ZUJ1aWxkZXJTY2hlbWEgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9zcmMvdXRpbHMnO1xuY29uc3Qgb3BuID0gcmVxdWlyZSgnb3BuJyk7XG5cbiAvLyBEUkNQXG5pbXBvcnQge0RldlNlcnZlckJ1aWxkZXIsIERldlNlcnZlckJ1aWxkZXJPcHRpb25zfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhcic7XG5pbXBvcnQgKiBhcyBkcmNwQ29tbW9uIGZyb20gJy4vY29tbW9uJztcblxuLy8gZXhwb3J0IHR5cGUgYnVpbGRXZWJwYWNrQ29uZmlnRnVuYyA9IChicm93c2VyT3B0aW9uczogTm9ybWFsaXplZEJyb3dzZXJCdWlsZGVyU2NoZW1hKSA9PiBhbnk7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIERyY3BEZXZTZXJ2ZXIgZXh0ZW5kcyBEZXZTZXJ2ZXJCdWlsZGVyIHtcbiAgcnVuKGJ1aWxkZXJDb25maWc6IEJ1aWxkZXJDb25maWd1cmF0aW9uPERldlNlcnZlckJ1aWxkZXJPcHRpb25zPik6IE9ic2VydmFibGU8QnVpbGRFdmVudD4ge1xuICAgIGNvbnN0IG9wdGlvbnMgPSBidWlsZGVyQ29uZmlnLm9wdGlvbnM7XG4gICAgY29uc3Qgcm9vdCA9IHRoaXMuY29udGV4dC53b3Jrc3BhY2Uucm9vdDtcbiAgICBjb25zdCBwcm9qZWN0Um9vdCA9IHJlc29sdmUocm9vdCwgYnVpbGRlckNvbmZpZy5yb290KTtcbiAgICBjb25zdCBob3N0ID0gbmV3IHZpcnR1YWxGcy5BbGlhc0hvc3QodGhpcy5jb250ZXh0Lmhvc3QgYXMgdmlydHVhbEZzLkhvc3Q8U3RhdHM+KTtcbiAgICAvLyBjb25zdCB3ZWJwYWNrRGV2U2VydmVyQnVpbGRlciA9IG5ldyBXZWJwYWNrRGV2U2VydmVyQnVpbGRlcih7IC4uLnRoaXMuY29udGV4dCwgaG9zdCB9KTtcbiAgICBsZXQgYnJvd3Nlck9wdGlvbnM6IE5vcm1hbGl6ZWRCcm93c2VyQnVpbGRlclNjaGVtYTtcbiAgICBsZXQgZmlyc3QgPSB0cnVlO1xuICAgIGxldCBvcG5BZGRyZXNzOiBzdHJpbmc7XG5cbiAgICAvLyByZXR1cm4gY2hlY2tQb3J0KG9wdGlvbnMucG9ydCwgb3B0aW9ucy5ob3N0KS5waXBlKFxuICAgIHJldHVybiBvZihvcHRpb25zLnBvcnQpLnBpcGUoXG4gICAgICB0YXAoKHBvcnQpID0+IG9wdGlvbnMucG9ydCA9IHBvcnQpLFxuICAgICAgY29uY2F0TWFwKCgpID0+ICh0aGlzIGFzIGFueSkuX2dldEJyb3dzZXJPcHRpb25zKG9wdGlvbnMpKSxcbiAgICAgIHRhcChvcHRzID0+IGJyb3dzZXJPcHRpb25zID0gbm9ybWFsaXplQnVpbGRlclNjaGVtYShcbiAgICAgICAgaG9zdCxcbiAgICAgICAgcm9vdCxcbiAgICAgICAgb3B0cyBhcyBhbnlcbiAgICAgICkpLFxuICAgICAgY29uY2F0TWFwKCgpID0+IHtcbiAgICAgICAgcmV0dXJuIGRyY3BDb21tb24uc3RhcnREcmNwU2VydmVyKGJ1aWxkZXJDb25maWcucm9vdCwgYnVpbGRlckNvbmZpZyxcbiAgICAgICAgICBicm93c2VyT3B0aW9ucyBhcyBkcmNwQ29tbW9uLkFuZ3VsYXJCdWlsZGVyT3B0aW9ucywgKCk9PiB7XG4gICAgICAgICAgY29uc3Qgd2VicGFja0NvbmZpZyA9IHRoaXMuYnVpbGRXZWJwYWNrQ29uZmlnKHJvb3QsIHByb2plY3RSb290LCBob3N0LCBicm93c2VyT3B0aW9ucyk7XG5cbiAgICAgICAgICAvLyBsZXQgd2VicGFja0RldlNlcnZlckNvbmZpZzogV2VicGFja0RldlNlcnZlci5Db25maWd1cmF0aW9uO1xuICAgICAgICAgIC8vIHRyeSB7XG4gICAgICAgICAgLy8gXHR3ZWJwYWNrRGV2U2VydmVyQ29uZmlnID0gKHRoaXMgYXMgYW55KV9idWlsZFNlcnZlckNvbmZpZyhcbiAgICAgICAgICAvLyBcdFx0cm9vdCxcbiAgICAgICAgICAvLyBcdFx0b3B0aW9ucyxcbiAgICAgICAgICAvLyBcdFx0YnJvd3Nlck9wdGlvbnNcbiAgICAgICAgICAvLyBcdCk7XG4gICAgICAgICAgLy8gfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgLy8gXHRyZXR1cm4gdGhyb3dFcnJvcihlcnIpO1xuICAgICAgICAgIC8vIH1cblxuICAgICAgICAgIC8vIFJlc29sdmUgcHVibGljIGhvc3QgYW5kIGNsaWVudCBhZGRyZXNzLlxuICAgICAgICAgIC8vIGxldCBjbGllbnRBZGRyZXNzID0gYCR7b3B0aW9ucy5zc2wgPyAnaHR0cHMnIDogJ2h0dHAnfTovLzAuMC4wLjA6MGA7XG4gICAgICAgICAgaWYgKG9wdGlvbnMucHVibGljSG9zdCkge1xuICAgICAgICAgICAgbGV0IHB1YmxpY0hvc3QgPSBvcHRpb25zLnB1YmxpY0hvc3Q7XG4gICAgICAgICAgICBpZiAoIS9eXFx3KzpcXC9cXC8vLnRlc3QocHVibGljSG9zdCkpIHtcbiAgICAgICAgICAgICAgcHVibGljSG9zdCA9IGAke29wdGlvbnMuc3NsID8gJ2h0dHBzJyA6ICdodHRwJ306Ly8ke3B1YmxpY0hvc3R9YDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNvbnN0IGNsaWVudFVybCA9IHVybC5wYXJzZShwdWJsaWNIb3N0KTtcbiAgICAgICAgICAgIG9wdGlvbnMucHVibGljSG9zdCA9IGNsaWVudFVybC5ob3N0O1xuICAgICAgICAgICAgLy8gY2xpZW50QWRkcmVzcyA9IHVybC5mb3JtYXQoY2xpZW50VXJsKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBSZXNvbHZlIHNlcnZlIGFkZHJlc3MuXG4gICAgICAgICAgY29uc3Qgc2VydmVyQWRkcmVzcyA9IHVybC5mb3JtYXQoe1xuICAgICAgICAgICAgcHJvdG9jb2w6IG9wdGlvbnMuc3NsID8gJ2h0dHBzJyA6ICdodHRwJyxcbiAgICAgICAgICAgIGhvc3RuYW1lOiBvcHRpb25zLmhvc3QgPT09ICcwLjAuMC4wJyA/ICdsb2NhbGhvc3QnIDogb3B0aW9ucy5ob3N0LFxuICAgICAgICAgICAgcG9ydDogb3B0aW9ucy5wb3J0LnRvU3RyaW5nKClcbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIC8vIEFkZCBsaXZlIHJlbG9hZCBjb25maWcuXG4gICAgICAgICAgLy8gaWYgKG9wdGlvbnMubGl2ZVJlbG9hZCkge1xuICAgICAgICAgIC8vIFx0dGhpcy5fYWRkTGl2ZVJlbG9hZChvcHRpb25zLCBicm93c2VyT3B0aW9ucywgd2VicGFja0NvbmZpZywgY2xpZW50QWRkcmVzcyk7XG4gICAgICAgICAgLy8gfSBlbHNlIGlmIChvcHRpb25zLmhtcikge1xuICAgICAgICAgIC8vIFx0dGhpcy5jb250ZXh0LmxvZ2dlci53YXJuKCdMaXZlIHJlbG9hZCBpcyBkaXNhYmxlZC4gSE1SIG9wdGlvbiBpZ25vcmVkLicpO1xuICAgICAgICAgIC8vIH1cblxuICAgICAgICAgIGlmICghb3B0aW9ucy53YXRjaCkge1xuICAgICAgICAgICAgLy8gVGhlcmUncyBubyBvcHRpb24gdG8gdHVybiBvZmYgZmlsZSB3YXRjaGluZyBpbiB3ZWJwYWNrLWRldi1zZXJ2ZXIsIGJ1dFxuICAgICAgICAgICAgLy8gd2UgY2FuIG92ZXJyaWRlIHRoZSBmaWxlIHdhdGNoZXIgaW5zdGVhZC5cbiAgICAgICAgICAgIHdlYnBhY2tDb25maWcucGx1Z2lucy51bnNoaWZ0KHtcbiAgICAgICAgICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOm5vLWFueVxuICAgICAgICAgICAgICBhcHBseTogKGNvbXBpbGVyOiBhbnkpID0+IHtcbiAgICAgICAgICAgICAgICBjb21waWxlci5ob29rcy5hZnRlckVudmlyb25tZW50LnRhcCgnYW5ndWxhci1jbGknLCAoKSA9PiB7XG4gICAgICAgICAgICAgICAgICBjb21waWxlci53YXRjaEZpbGVTeXN0ZW0gPSB7IHdhdGNoOiAoKSA9PiB7IH0gfTtcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKGJyb3dzZXJPcHRpb25zLm9wdGltaXphdGlvbikge1xuICAgICAgICAgICAgdGhpcy5jb250ZXh0LmxvZ2dlci5lcnJvcih0YWdzLnN0cmlwSW5kZW50c2Bcblx0XHRcdFx0XHRcdFx0KioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXHRcdFx0XHRcdFx0XHRUaGlzIGlzIGEgc2ltcGxlIHNlcnZlciBmb3IgdXNlIGluIHRlc3Rpbmcgb3IgZGVidWdnaW5nIEFuZ3VsYXIgYXBwbGljYXRpb25zIGxvY2FsbHkuXG5cdFx0XHRcdFx0XHRcdEl0IGhhc24ndCBiZWVuIHJldmlld2VkIGZvciBzZWN1cml0eSBpc3N1ZXMuXG5cblx0XHRcdFx0XHRcdFx0RE9OJ1QgVVNFIElUIEZPUiBQUk9EVUNUSU9OIVxuXHRcdFx0XHRcdFx0XHQqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXG5cdFx0XHRcdFx0XHRgKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICB0aGlzLmNvbnRleHQubG9nZ2VyLmluZm8odGFncy5vbmVMaW5lYFxuXHRcdFx0XHRcdFx0Kipcblx0XHRcdFx0XHRcdEFuZ3VsYXIgTGl2ZSBEZXZlbG9wbWVudCBTZXJ2ZXIgaXMgbGlzdGVuaW5nIG9uICR7b3B0aW9ucy5ob3N0fToke29wdGlvbnMucG9ydH0sXG5cdFx0XHRcdFx0XHRvcGVuIHlvdXIgYnJvd3NlciBvbiAke3NlcnZlckFkZHJlc3N9JHticm93c2VyT3B0aW9ucy5kZXBsb3lVcmx9XG5cdFx0XHRcdFx0XHQqKlxuXHRcdFx0XHRcdGApO1xuXG4gICAgICAgICAgb3BuQWRkcmVzcyA9IHNlcnZlckFkZHJlc3MgKyBicm93c2VyT3B0aW9ucy5kZXBsb3lVcmw7XG4gICAgICAgICAgLy8gd2VicGFja0NvbmZpZy5kZXZTZXJ2ZXIgPSBicm93c2VyT3B0aW9ucy5kZXBsb3lVcmw7XG5cbiAgICAgICAgICAvLyByZXR1cm4gd2VicGFja0RldlNlcnZlckJ1aWxkZXIucnVuV2VicGFja0RldlNlcnZlcihcbiAgICAgICAgICAvLyBcdHdlYnBhY2tDb25maWcsIHVuZGVmaW5lZCwgZ2V0QnJvd3NlckxvZ2dpbmdDYihicm93c2VyT3B0aW9ucy52ZXJib3NlKSxcbiAgICAgICAgICAvLyApO1xuICAgICAgICAgIHJldHVybiB3ZWJwYWNrQ29uZmlnO1xuICAgICAgICB9KTtcbiAgICAgIH0pLFxuICAgICAgbWFwKGJ1aWxkRXZlbnQgPT4ge1xuICAgICAgICBpZiAoZmlyc3QgJiYgb3B0aW9ucy5vcGVuKSB7XG4gICAgICAgICAgZmlyc3QgPSBmYWxzZTtcbiAgICAgICAgICBvcG4ob3BuQWRkcmVzcyk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gYnVpbGRFdmVudDtcbiAgICAgIH0pXG4gICAgICAvLyB1c2luZyBtb3JlIHRoYW4gMTAgb3BlcmF0b3JzIHdpbGwgY2F1c2UgcnhqcyB0byBsb29zZSB0aGUgdHlwZXNcbiAgICApIGFzIE9ic2VydmFibGU8QnVpbGRFdmVudD47XG4gIH1cbn1cbiJdfQ==
