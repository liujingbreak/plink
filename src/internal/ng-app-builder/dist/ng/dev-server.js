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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy9kZXYtc2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLGlDQUFpQztBQUNqQyx5QkFBdUI7QUFNdkIsK0NBQWdFO0FBRWhFLCtCQUFzQztBQUN0Qyw4Q0FBcUQ7QUFDckQsaURBQTJCO0FBSTNCLG1FQUFpRjtBQUNqRixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUM7QUFFMUIsT0FBTztBQUNSLGlFQUF3RjtBQUN4Riw2REFBdUM7QUFFdkMsZ0dBQWdHO0FBRWhHLE1BQXFCLGFBQWMsU0FBUSxnQ0FBZ0I7SUFDMUQsR0FBRyxDQUFDLGFBQTREO1FBQy9ELE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUM7UUFDdEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDO1FBQ3pDLE1BQU0sV0FBVyxHQUFHLGNBQU8sQ0FBQyxJQUFJLEVBQUUsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RELE1BQU0sSUFBSSxHQUFHLElBQUksZ0JBQVMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUE2QixDQUFDLENBQUM7UUFDakYsMEZBQTBGO1FBQzFGLElBQUksY0FBOEMsQ0FBQztRQUNuRCxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUM7UUFDakIsSUFBSSxVQUFrQixDQUFDO1FBRXZCLHFEQUFxRDtRQUNyRCxPQUFPLFNBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUMzQixlQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEVBQ2xDLHFCQUFTLENBQUMsR0FBRyxFQUFFLENBQUUsSUFBWSxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQzFELGVBQUcs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QWEsR0FBRyxjQUFjLENBQUMsU0FBUyxDQUFDO2dCQUN0RCxzREFBc0Q7Z0JBRXRELHNEQUFzRDtnQkFDdEQsMEVBQTBFO2dCQUMxRSxLQUFLO2dCQUNMLE9BQU8sYUFBYSxDQUFDO1lBQ3RCLENBQUMsQ0FBQyxDQUFDO1FBQ0osQ0FBQyxDQUFDLEVBQ0YsZUFBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFO1lBQ2hCLElBQUksS0FBSyxJQUFJLE9BQU8sQ0FBQyxJQUFJLEVBQUU7Z0JBQzFCLEtBQUssR0FBRyxLQUFLLENBQUM7Z0JBQ2QsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDO2FBQ2hCO1lBRUQsT0FBTyxVQUFVLENBQUM7UUFDbkIsQ0FBQyxDQUFDO1FBQ0Ysa0VBQWtFO1NBQ3hDLENBQUM7SUFDN0IsQ0FBQztDQUNEO0FBakhELGdDQWlIQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9uZy9kZXYtc2VydmVyLmpzIiwic291cmNlc0NvbnRlbnQiOlsiXG4vLyB0c2xpbnQ6ZGlzYWJsZTptYXgtbGluZS1sZW5ndGhcbmltcG9ydCAnLi9ub2RlLWluamVjdCc7XG5cbmltcG9ydCB7XG5cdEJ1aWxkRXZlbnQsXG5cdEJ1aWxkZXJDb25maWd1cmF0aW9uXG59IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9hcmNoaXRlY3QnO1xuaW1wb3J0IHsgcmVzb2x2ZSwgdGFncywgdmlydHVhbEZzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHsgU3RhdHN9IGZyb20gJ2ZzJztcbmltcG9ydCB7IE9ic2VydmFibGUsIG9mIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBjb25jYXRNYXAsIG1hcCwgdGFwIH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMgdXJsIGZyb20gJ3VybCc7XG4vLyBpbXBvcnQgeyBjaGVja1BvcnQgfSBmcm9tICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9zcmMvYW5ndWxhci1jbGktZmlsZXMvdXRpbGl0aWVzL2NoZWNrLXBvcnQnO1xuLy8gaW1wb3J0IHsgTm9ybWFsaXplZEJyb3dzZXJCdWlsZGVyU2NoZW1hIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvc3JjL2Jyb3dzZXIvJztcbmltcG9ydCB7IE5vcm1hbGl6ZWRCcm93c2VyQnVpbGRlclNjaGVtYSB9IGZyb20gJ0Bhbmd1bGFyLWRldmtpdC9idWlsZC1hbmd1bGFyL3NyYy9icm93c2VyL3NjaGVtYSc7XG5pbXBvcnQgeyBub3JtYWxpemVCdWlsZGVyU2NoZW1hIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXIvc3JjL3V0aWxzJztcbmNvbnN0IG9wbiA9IHJlcXVpcmUoJ29wbicpO1xuXG4gLy8gRFJDUFxuaW1wb3J0IHtEZXZTZXJ2ZXJCdWlsZGVyLCBEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9uc30gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInO1xuaW1wb3J0ICogYXMgZHJjcENvbW1vbiBmcm9tICcuL2NvbW1vbic7XG5cbi8vIGV4cG9ydCB0eXBlIGJ1aWxkV2VicGFja0NvbmZpZ0Z1bmMgPSAoYnJvd3Nlck9wdGlvbnM6IE5vcm1hbGl6ZWRCcm93c2VyQnVpbGRlclNjaGVtYSkgPT4gYW55O1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBEcmNwRGV2U2VydmVyIGV4dGVuZHMgRGV2U2VydmVyQnVpbGRlciB7XG5cdHJ1bihidWlsZGVyQ29uZmlnOiBCdWlsZGVyQ29uZmlndXJhdGlvbjxEZXZTZXJ2ZXJCdWlsZGVyT3B0aW9ucz4pOiBPYnNlcnZhYmxlPEJ1aWxkRXZlbnQ+IHtcblx0XHRjb25zdCBvcHRpb25zID0gYnVpbGRlckNvbmZpZy5vcHRpb25zO1xuXHRcdGNvbnN0IHJvb3QgPSB0aGlzLmNvbnRleHQud29ya3NwYWNlLnJvb3Q7XG5cdFx0Y29uc3QgcHJvamVjdFJvb3QgPSByZXNvbHZlKHJvb3QsIGJ1aWxkZXJDb25maWcucm9vdCk7XG5cdFx0Y29uc3QgaG9zdCA9IG5ldyB2aXJ0dWFsRnMuQWxpYXNIb3N0KHRoaXMuY29udGV4dC5ob3N0IGFzIHZpcnR1YWxGcy5Ib3N0PFN0YXRzPik7XG5cdFx0Ly8gY29uc3Qgd2VicGFja0RldlNlcnZlckJ1aWxkZXIgPSBuZXcgV2VicGFja0RldlNlcnZlckJ1aWxkZXIoeyAuLi50aGlzLmNvbnRleHQsIGhvc3QgfSk7XG5cdFx0bGV0IGJyb3dzZXJPcHRpb25zOiBOb3JtYWxpemVkQnJvd3NlckJ1aWxkZXJTY2hlbWE7XG5cdFx0bGV0IGZpcnN0ID0gdHJ1ZTtcblx0XHRsZXQgb3BuQWRkcmVzczogc3RyaW5nO1xuXG5cdFx0Ly8gcmV0dXJuIGNoZWNrUG9ydChvcHRpb25zLnBvcnQsIG9wdGlvbnMuaG9zdCkucGlwZShcblx0XHRyZXR1cm4gb2Yob3B0aW9ucy5wb3J0KS5waXBlKFxuXHRcdFx0dGFwKChwb3J0KSA9PiBvcHRpb25zLnBvcnQgPSBwb3J0KSxcblx0XHRcdGNvbmNhdE1hcCgoKSA9PiAodGhpcyBhcyBhbnkpLl9nZXRCcm93c2VyT3B0aW9ucyhvcHRpb25zKSksXG5cdFx0XHR0YXAob3B0cyA9PiBicm93c2VyT3B0aW9ucyA9IG5vcm1hbGl6ZUJ1aWxkZXJTY2hlbWEoXG5cdFx0XHRcdGhvc3QsXG5cdFx0XHRcdHJvb3QsXG5cdFx0XHRcdG9wdHMgYXMgYW55XG5cdFx0XHQpKSxcblx0XHRcdGNvbmNhdE1hcCgoKSA9PiB7XG5cdFx0XHRcdHJldHVybiBkcmNwQ29tbW9uLnN0YXJ0RHJjcFNlcnZlcihidWlsZGVyQ29uZmlnLnJvb3QsIGJ1aWxkZXJDb25maWcsXG5cdFx0XHRcdFx0YnJvd3Nlck9wdGlvbnMgYXMgZHJjcENvbW1vbi5Bbmd1bGFyQnVpbGRlck9wdGlvbnMsICgpPT4ge1xuXHRcdFx0XHRcdGNvbnN0IHdlYnBhY2tDb25maWcgPSB0aGlzLmJ1aWxkV2VicGFja0NvbmZpZyhyb290LCBwcm9qZWN0Um9vdCwgaG9zdCwgYnJvd3Nlck9wdGlvbnMpO1xuXG5cdFx0XHRcdFx0Ly8gbGV0IHdlYnBhY2tEZXZTZXJ2ZXJDb25maWc6IFdlYnBhY2tEZXZTZXJ2ZXIuQ29uZmlndXJhdGlvbjtcblx0XHRcdFx0XHQvLyB0cnkge1xuXHRcdFx0XHRcdC8vIFx0d2VicGFja0RldlNlcnZlckNvbmZpZyA9ICh0aGlzIGFzIGFueSlfYnVpbGRTZXJ2ZXJDb25maWcoXG5cdFx0XHRcdFx0Ly8gXHRcdHJvb3QsXG5cdFx0XHRcdFx0Ly8gXHRcdG9wdGlvbnMsXG5cdFx0XHRcdFx0Ly8gXHRcdGJyb3dzZXJPcHRpb25zXG5cdFx0XHRcdFx0Ly8gXHQpO1xuXHRcdFx0XHRcdC8vIH0gY2F0Y2ggKGVycikge1xuXHRcdFx0XHRcdC8vIFx0cmV0dXJuIHRocm93RXJyb3IoZXJyKTtcblx0XHRcdFx0XHQvLyB9XG5cblx0XHRcdFx0XHQvLyBSZXNvbHZlIHB1YmxpYyBob3N0IGFuZCBjbGllbnQgYWRkcmVzcy5cblx0XHRcdFx0XHQvLyBsZXQgY2xpZW50QWRkcmVzcyA9IGAke29wdGlvbnMuc3NsID8gJ2h0dHBzJyA6ICdodHRwJ306Ly8wLjAuMC4wOjBgO1xuXHRcdFx0XHRcdGlmIChvcHRpb25zLnB1YmxpY0hvc3QpIHtcblx0XHRcdFx0XHRcdGxldCBwdWJsaWNIb3N0ID0gb3B0aW9ucy5wdWJsaWNIb3N0O1xuXHRcdFx0XHRcdFx0aWYgKCEvXlxcdys6XFwvXFwvLy50ZXN0KHB1YmxpY0hvc3QpKSB7XG5cdFx0XHRcdFx0XHRcdHB1YmxpY0hvc3QgPSBgJHtvcHRpb25zLnNzbCA/ICdodHRwcycgOiAnaHR0cCd9Oi8vJHtwdWJsaWNIb3N0fWA7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRjb25zdCBjbGllbnRVcmwgPSB1cmwucGFyc2UocHVibGljSG9zdCk7XG5cdFx0XHRcdFx0XHRvcHRpb25zLnB1YmxpY0hvc3QgPSBjbGllbnRVcmwuaG9zdDtcblx0XHRcdFx0XHRcdC8vIGNsaWVudEFkZHJlc3MgPSB1cmwuZm9ybWF0KGNsaWVudFVybCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0Ly8gUmVzb2x2ZSBzZXJ2ZSBhZGRyZXNzLlxuXHRcdFx0XHRcdGNvbnN0IHNlcnZlckFkZHJlc3MgPSB1cmwuZm9ybWF0KHtcblx0XHRcdFx0XHRcdHByb3RvY29sOiBvcHRpb25zLnNzbCA/ICdodHRwcycgOiAnaHR0cCcsXG5cdFx0XHRcdFx0XHRob3N0bmFtZTogb3B0aW9ucy5ob3N0ID09PSAnMC4wLjAuMCcgPyAnbG9jYWxob3N0JyA6IG9wdGlvbnMuaG9zdCxcblx0XHRcdFx0XHRcdHBvcnQ6IG9wdGlvbnMucG9ydC50b1N0cmluZygpXG5cdFx0XHRcdFx0fSk7XG5cblx0XHRcdFx0XHQvLyBBZGQgbGl2ZSByZWxvYWQgY29uZmlnLlxuXHRcdFx0XHRcdC8vIGlmIChvcHRpb25zLmxpdmVSZWxvYWQpIHtcblx0XHRcdFx0XHQvLyBcdHRoaXMuX2FkZExpdmVSZWxvYWQob3B0aW9ucywgYnJvd3Nlck9wdGlvbnMsIHdlYnBhY2tDb25maWcsIGNsaWVudEFkZHJlc3MpO1xuXHRcdFx0XHRcdC8vIH0gZWxzZSBpZiAob3B0aW9ucy5obXIpIHtcblx0XHRcdFx0XHQvLyBcdHRoaXMuY29udGV4dC5sb2dnZXIud2FybignTGl2ZSByZWxvYWQgaXMgZGlzYWJsZWQuIEhNUiBvcHRpb24gaWdub3JlZC4nKTtcblx0XHRcdFx0XHQvLyB9XG5cblx0XHRcdFx0XHRpZiAoIW9wdGlvbnMud2F0Y2gpIHtcblx0XHRcdFx0XHRcdC8vIFRoZXJlJ3Mgbm8gb3B0aW9uIHRvIHR1cm4gb2ZmIGZpbGUgd2F0Y2hpbmcgaW4gd2VicGFjay1kZXYtc2VydmVyLCBidXRcblx0XHRcdFx0XHRcdC8vIHdlIGNhbiBvdmVycmlkZSB0aGUgZmlsZSB3YXRjaGVyIGluc3RlYWQuXG5cdFx0XHRcdFx0XHR3ZWJwYWNrQ29uZmlnLnBsdWdpbnMudW5zaGlmdCh7XG5cdFx0XHRcdFx0XHRcdC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTpuby1hbnlcblx0XHRcdFx0XHRcdFx0YXBwbHk6IChjb21waWxlcjogYW55KSA9PiB7XG5cdFx0XHRcdFx0XHRcdFx0Y29tcGlsZXIuaG9va3MuYWZ0ZXJFbnZpcm9ubWVudC50YXAoJ2FuZ3VsYXItY2xpJywgKCkgPT4ge1xuXHRcdFx0XHRcdFx0XHRcdFx0Y29tcGlsZXIud2F0Y2hGaWxlU3lzdGVtID0geyB3YXRjaDogKCkgPT4geyB9IH07XG5cdFx0XHRcdFx0XHRcdFx0fSk7XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH0pO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmIChicm93c2VyT3B0aW9ucy5vcHRpbWl6YXRpb24pIHtcblx0XHRcdFx0XHRcdHRoaXMuY29udGV4dC5sb2dnZXIuZXJyb3IodGFncy5zdHJpcEluZGVudHNgXG5cdFx0XHRcdFx0XHRcdCoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKipcblx0XHRcdFx0XHRcdFx0VGhpcyBpcyBhIHNpbXBsZSBzZXJ2ZXIgZm9yIHVzZSBpbiB0ZXN0aW5nIG9yIGRlYnVnZ2luZyBBbmd1bGFyIGFwcGxpY2F0aW9ucyBsb2NhbGx5LlxuXHRcdFx0XHRcdFx0XHRJdCBoYXNuJ3QgYmVlbiByZXZpZXdlZCBmb3Igc2VjdXJpdHkgaXNzdWVzLlxuXG5cdFx0XHRcdFx0XHRcdERPTidUIFVTRSBJVCBGT1IgUFJPRFVDVElPTiFcblx0XHRcdFx0XHRcdFx0KioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxuXHRcdFx0XHRcdFx0YCk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0dGhpcy5jb250ZXh0LmxvZ2dlci5pbmZvKHRhZ3Mub25lTGluZWBcblx0XHRcdFx0XHRcdCoqXG5cdFx0XHRcdFx0XHRBbmd1bGFyIExpdmUgRGV2ZWxvcG1lbnQgU2VydmVyIGlzIGxpc3RlbmluZyBvbiAke29wdGlvbnMuaG9zdH06JHtvcHRpb25zLnBvcnR9LFxuXHRcdFx0XHRcdFx0b3BlbiB5b3VyIGJyb3dzZXIgb24gJHtzZXJ2ZXJBZGRyZXNzfSR7YnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsfVxuXHRcdFx0XHRcdFx0Kipcblx0XHRcdFx0XHRgKTtcblxuXHRcdFx0XHRcdG9wbkFkZHJlc3MgPSBzZXJ2ZXJBZGRyZXNzICsgYnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsO1xuXHRcdFx0XHRcdC8vIHdlYnBhY2tDb25maWcuZGV2U2VydmVyID0gYnJvd3Nlck9wdGlvbnMuZGVwbG95VXJsO1xuXG5cdFx0XHRcdFx0Ly8gcmV0dXJuIHdlYnBhY2tEZXZTZXJ2ZXJCdWlsZGVyLnJ1bldlYnBhY2tEZXZTZXJ2ZXIoXG5cdFx0XHRcdFx0Ly8gXHR3ZWJwYWNrQ29uZmlnLCB1bmRlZmluZWQsIGdldEJyb3dzZXJMb2dnaW5nQ2IoYnJvd3Nlck9wdGlvbnMudmVyYm9zZSksXG5cdFx0XHRcdFx0Ly8gKTtcblx0XHRcdFx0XHRyZXR1cm4gd2VicGFja0NvbmZpZztcblx0XHRcdFx0fSk7XG5cdFx0XHR9KSxcblx0XHRcdG1hcChidWlsZEV2ZW50ID0+IHtcblx0XHRcdFx0aWYgKGZpcnN0ICYmIG9wdGlvbnMub3Blbikge1xuXHRcdFx0XHRcdGZpcnN0ID0gZmFsc2U7XG5cdFx0XHRcdFx0b3BuKG9wbkFkZHJlc3MpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0cmV0dXJuIGJ1aWxkRXZlbnQ7XG5cdFx0XHR9KVxuXHRcdFx0Ly8gdXNpbmcgbW9yZSB0aGFuIDEwIG9wZXJhdG9ycyB3aWxsIGNhdXNlIHJ4anMgdG8gbG9vc2UgdGhlIHR5cGVzXG5cdFx0KSBhcyBPYnNlcnZhYmxlPEJ1aWxkRXZlbnQ+O1xuXHR9XG59XG4iXX0=
