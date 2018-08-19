/* tslint:disable no-console */
import {
	BuildEvent,
	// Builder,
	BuilderConfiguration
	// BuilderContext,
} from '@angular-devkit/architect';
import {DevServerBuilderOptions} from '@angular-devkit/build-angular';
import {NormalizedBrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser';
import {BuildWebpackServerSchema} from '@angular-devkit/build-angular/src/server/schema';
import * as Rx from 'rxjs';
import * as _ from 'lodash';
import changeAngularCliOptions from './change-cli-options';

function initDrcp(drcpArgs: any, drcpConfig: string) {
	var config = require('dr-comp-package/wfh/lib/config');

	const files = drcpConfig ? drcpConfig.split(/\s*[,;]\s*/) : [];
	if (drcpArgs.c == null)
		drcpArgs.c = [];
	drcpArgs.c.push(...files);
	config.init(drcpArgs);
	require('dr-comp-package/wfh/lib/logConfig')(config());
	return config;
}

export type buildWebpackConfigFunc = (browserOptions: AngularBuilderOptions) => any;

export interface AngularCliParam {
	builderConfig?: BuilderConfiguration<DevServerBuilderOptions>;
	// buildWebpackConfig: buildWebpackConfigFunc;
	browserOptions: AngularBuilderOptions;
	ssr: boolean; // Is server side / prerender
	webpackConfig: any;
	projectRoot: string;
	argv: any;
}

export type AngularBuilderOptions =
	NormalizedBrowserBuilderSchema & BuildWebpackServerSchema & DrcpBuilderOptions;

export interface DrcpBuilderOptions {
	drcpArgs: any;
	drcpConfig: string;
}

/**
 * Invoke this function from dev server builder
 * @param projectRoot 
 * @param builderConfig 
 * @param browserOptions 
 * @param buildWebpackConfig 
 * @param vfsHost 
 */
export function startDrcpServer(projectRoot: string, builderConfig: BuilderConfiguration<DevServerBuilderOptions>,
	browserOptions: AngularBuilderOptions,
	buildWebpackConfig: buildWebpackConfigFunc): Rx.Observable<BuildEvent> {
	// let argv: any = {};
	const options = builderConfig.options as (DevServerBuilderOptions & DrcpBuilderOptions);

	const config = initDrcp(options.drcpArgs, options.drcpConfig);
	changeAngularCliOptions(config, browserOptions, builderConfig);

	return Rx.Observable.create((obs: Rx.Observer<BuildEvent>) => {
		const param: AngularCliParam = {
			ssr: false,
			builderConfig,
			browserOptions: browserOptions as any as NormalizedBrowserBuilderSchema & DrcpBuilderOptions,
			webpackConfig: buildWebpackConfig(browserOptions),
			projectRoot,
			argv: {
				poll: options.poll,
				hmr: options.hmr,
				...options.drcpArgs
			}
		};
		if (!_.get(options, 'drcpArgs.noWebpack'))
			config.set('_angularCli', param);
		config.set('port', options.port);
		var log4js = require('log4js');
		var log = log4js.getLogger('ng-app-builder.ng.dev-server');
		var pkMgr = require('dr-comp-package/wfh/lib/packageMgr');
		let shutdownable: Promise<() => void>;
		try {
			// process.on('uncaughtException', function(err) {
			// 	log.error('Uncaught exception: ', err, err.stack);
			// 	// throw err; // let PM2 handle exception
			// 	obs.error(err);
			// });
			process.on('SIGINT', function() {
				log.info('Recieve SIGINT.');
				shutdownable.then(shut => shut())
				.then(() => {
					log4js.shutdown();
					log.info('Bye.');
					process.exit(0);
				});
			});
			process.on('message', function(msg) {
				if (msg === 'shutdown') {
					log.info('Recieve shutdown message from PM2');
					shutdownable.then(shut => shut())
					.then(() => {
						log4js.shutdown();
						log.info('Bye.');
						process.exit(0);
					});
				}
			});
			pkMgr.eventBus.on('webpackDone', (buildEvent: BuildEvent) => {
				obs.next(buildEvent);
			});
			shutdownable = pkMgr.runServer(param.argv)
			.then((shutdownable: any) => {
				if (_.get(options, 'drcpArgs.noWebpack')) {
					obs.next({success: true});
				}
				return shutdownable;
			})
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

/**
 * Invoke this function from browser builder
 * @param projectRoot 
 * @param browserOptions 
 * @param buildWebpackConfig 
 * @param vfsHost 
 */
export function compile(projectRoot: string, browserOptions: AngularBuilderOptions,
	buildWebpackConfig: buildWebpackConfigFunc, isSSR = false) {
	return new Rx.Observable((obs) => {
		try {
			compileAsync(projectRoot, browserOptions, buildWebpackConfig, isSSR).then((webpackConfig: any) => {
				obs.next(webpackConfig);
				obs.complete();
			})
			.catch((err: Error) => obs.error(err));
		} catch (err) {
			obs.error(err);
		}
	});
}

function compileAsync(projectRoot: string, browserOptions: AngularBuilderOptions,
	buildWebpackConfig: buildWebpackConfigFunc, ssr: boolean) {
	const options = browserOptions;
	const config = initDrcp(options.drcpArgs, options.drcpConfig);
	changeAngularCliOptions(config, browserOptions);
	const param: AngularCliParam = {
		ssr,
		browserOptions: options,
		webpackConfig: buildWebpackConfig(browserOptions),
		projectRoot,
		argv: {
			...options.drcpArgs
		}
	};
	config.set('_angularCli', param);
	return require('dr-comp-package/wfh/lib/packageMgr/packageRunner').runBuilder(param.argv)
	.then(() => param.webpackConfig);
}
