import './node-inject';

import {
	BuildEvent,
	BuilderConfiguration
} from '@angular-devkit/architect';
import { resolve, tags, virtualFs } from '@angular-devkit/core';
import * as fs from 'fs';
import { Observable } from 'rxjs';
import { concatMap, map, tap } from 'rxjs/operators';
import * as url from 'url';
import { checkPort } from '@angular-devkit/build-angular/src/angular-cli-files/utilities/check-port';
import { NormalizedBrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser/';
import { BrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser/schema';
import { normalizeAssetPatterns, normalizeFileReplacements } from '@angular-devkit/build-angular/src/utils';
const opn = require('opn');

 // DRCP
import {DevServerBuilder, DevServerBuilderOptions} from '@angular-devkit/build-angular';
import * as common from './common';

export type buildWebpackConfigFunc = (browserOptions: NormalizedBrowserBuilderSchema) => any;

export default class DrcpDevServer extends DevServerBuilder {
	run(builderConfig: BuilderConfiguration<DevServerBuilderOptions>): Observable<BuildEvent> {
		const options = builderConfig.options;
		const root = this.context.workspace.root;
		const projectRoot = resolve(root, builderConfig.root);
		 // DRCP replaces virtualFs with ReadHookHost
		const host = new virtualFs.AliasHost(this.context.host as virtualFs.Host<fs.Stats>);
		// const webpackDevServerBuilder = new WebpackDevServerBuilder({ ...this.context, host });
		let browserOptions: BrowserBuilderSchema;
		let first = true;
		let opnAddress: string;

		return checkPort(options.port, options.host).pipe(
			tap((port) => options.port = port),
			concatMap(() => this._getBrowserOptions1(options)),
			tap((opts) => browserOptions = opts),
			concatMap(() => normalizeFileReplacements(browserOptions.fileReplacements, host, root)),
			tap(fileReplacements => browserOptions.fileReplacements = fileReplacements),
			concatMap(() => normalizeAssetPatterns(
				browserOptions.assets, host, root, projectRoot, builderConfig.sourceRoot)),
			// Replace the assets in options with the normalized version.
			tap((assetPatternObjects => browserOptions.assets = assetPatternObjects)),
			concatMap(() => {
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
					this.context.logger.error(tags.stripIndents`
						****************************************************************************************
						This is a simple server for use in testing or debugging Angular applications locally.
						It hasn't been reviewed for security issues.
			
						DON'T USE IT FOR PRODUCTION!
						****************************************************************************************
					`);
				}

				this.context.logger.info(tags.oneLine`
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
				return common.startDrcpServer(builderConfig.root, builderConfig, browserOptions as common.AngularBuilderOptions,
					() => {
						const webpackConfig = this.buildWebpackConfig(
							root, projectRoot, host, browserOptions as NormalizedBrowserBuilderSchema);
						if (!options.watch) {
							// There's no option to turn off file watching in webpack-dev-server, but
							// we can override the file watcher instead.
							webpackConfig.plugins.unshift({
								// tslint:disable-next-line:no-any
								apply: (compiler: any) => {
								compiler.hooks.afterEnvironment.tap('angular-cli', () => {
									compiler.watchFileSystem = { watch: () => { } };
								});
								}
							});
						}
						opnAddress = serverAddress; // TODO: publicPath
						return webpackConfig;
					});
			}),
			map(buildEvent => {
				if (first && options.open) {
				first = false;
				opn(opnAddress);
				}

				return buildEvent;
			})
		);
	}

	private _getBrowserOptions1(options: DevServerBuilderOptions) {
		const architect = this.context.architect;
		const [project, target, configuration] = options.browserTarget.split(':');

		const overrides = {
		  // Override browser build watch setting.
		  watch: options.watch,

		  // Update the browser options with the same options we support in serve, if defined.
		  ...(options.optimization !== undefined ? { optimization: options.optimization } : {}),
		  ...(options.aot !== undefined ? { aot: options.aot } : {}),
		  ...(options.sourceMap !== undefined ? { sourceMap: options.sourceMap } : {}),
		  ...(options.vendorSourceMap !== undefined ?
			 { vendorSourceMap: options.vendorSourceMap } : {}),
		  ...(options.evalSourceMap !== undefined ? { evalSourceMap: options.evalSourceMap } : {}),
		  ...(options.vendorChunk !== undefined ? { vendorChunk: options.vendorChunk } : {}),
		  ...(options.commonChunk !== undefined ? { commonChunk: options.commonChunk } : {}),
		  ...(options.baseHref !== undefined ? { baseHref: options.baseHref } : {}),
		  ...(options.progress !== undefined ? { progress: options.progress } : {}),
		  ...(options.poll !== undefined ? { poll: options.poll } : {})
		};

		const browserTargetSpec = { project, target, configuration, overrides };
		const builderConfig = architect.getBuilderConfiguration<BrowserBuilderSchema>(
		  browserTargetSpec);

		return architect.getBuilderDescription(builderConfig).pipe(
		  concatMap(browserDescription =>
			architect.validateBuilderOptions(builderConfig, browserDescription)),
		  map(browserConfig => browserConfig.options)
		);
	}
}
