/* tslint:disable no-console */

import {
	BuildEvent,
	// Builder,
	BuilderConfiguration
	// BuilderContext,
} from '@angular-devkit/architect';
import {DevServerBuilderOptions} from '@angular-devkit/build-angular';
import {NormalizedBrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser';
import * as Rx from 'rxjs';

export function initDrcp(drcpArgs: any) {
	var config = require('dr-comp-package/wfh/lib/config');
	if (Array.isArray(drcpArgs.c)) {
		config.load(drcpArgs.c);
	}
	require('dr-comp-package/wfh/lib/logConfig')(config().rootPath, config().log4jsReloadSeconds);
	return config;
}

export type buildWebpackConfigFunc = (browserOptions: NormalizedBrowserBuilderSchema) => any;

export interface AngularCliParam {
	builderConfig: BuilderConfiguration<DevServerBuilderOptions>;
	buildWebpackConfig: buildWebpackConfigFunc;
	browserOptions: NormalizedBrowserBuilderSchema;
	argv: any;
}

export interface DrcpBuilderOptions {
	drcpArgs: any;
}

export function startDrcpServer(builderConfig: BuilderConfiguration<DevServerBuilderOptions>,
	browserOptions: NormalizedBrowserBuilderSchema,
	buildWebpackConfig: buildWebpackConfigFunc): Rx.Observable<BuildEvent> {
	let argv: any = {};
	let options = builderConfig.options as (DevServerBuilderOptions & DrcpBuilderOptions);

	let config = initDrcp(options.drcpArgs);

	return Rx.Observable.create((obs: Rx.Observer<BuildEvent>) => {
		let param: AngularCliParam = {
			builderConfig,
			browserOptions,
			buildWebpackConfig,
			argv: {
				poll: options.poll,
				hmr: options.hmr,
				...options.drcpArgs
			}
		};
		config.set('_angularCli', param);
		config.set('port', options.port);

		var log = require('log4js').getLogger('ng-app-builder.ng.dev-server');
		var pkMgr = require('dr-comp-package/wfh/lib/packageMgr');

		try {
			process.on('uncaughtException', function(err) {
				log.error('Uncaught exception: ', err, err.stack);
				// throw err; // let PM2 handle exception
				obs.error(err);
			});
			process.on('SIGINT', function() {
				log.info('Recieve SIGINT, bye.');
				obs.next({ success: true });
				obs.complete();
				setTimeout(() => process.exit(0), 500);
			});
			process.on('message', function(msg) {
				if (msg === 'shutdown') {
					log.info('Recieve shutdown message from PM2, bye.');
					process.exit(0);
					obs.next({ success: true });
					obs.complete();
				}
			});
			(process as any)._config = config;
			pkMgr.runServer(argv)
			.catch((err: Error) => {
				console.error('Failed to start server:', err);
				// process.exit(1); // Log4js "log4jsReloadSeconds" will hang process event loop, so we have to explicitly quit.
				obs.error(err);
			});
		} catch (err) {
			console.error('Failed to start server:', err);
			obs.error(err);
		}
	});
}

import ChunkInfoPlugin from '../plugins/chunk-info';

export function changeWebpackConfig(options: DrcpBuilderOptions, webpackConfig: any): any {
	const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
	console.log('>>>>>>>>>>>>>>>>> changeWebpackConfig >>>>>>>>>>>>>>>>>>>>>>');
	if (options.drcpArgs.report ||(options.drcpArgs.openReport)) {
		webpackConfig.plugins.unshift(new BundleAnalyzerPlugin({
			analyzerMode: 'static',
			reportFilename: 'bundle-report.html',
			openAnalyzer: options.drcpArgs.openReport
		}));
		webpackConfig.plugins.push(
			new ChunkInfoPlugin()
		);
	}
	return webpackConfig;
}
