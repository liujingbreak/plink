/* tslint:disable no-console */
import {
	BuildEvent,
	// Builder,
	BuilderConfiguration
	// BuilderContext,
} from '@angular-devkit/architect';

// import {NormalizedBrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser';
import { BrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser/schema';
import {DevServerBuilderOptions} from '@angular-devkit/build-angular';
import {BuildWebpackServerSchema} from '@angular-devkit/build-angular/src/server/schema';
import * as Rx from 'rxjs';
import * as _ from 'lodash';
import changeAngularCliOptions from './change-cli-options';
import api from '__api';

export type DrcpConfig = typeof api.config;
export interface AngularConfigHandler {
	angularJson(options: AngularBuilderOptions,
		builderConfig: BuilderConfiguration<AngularBuilderOptions>)
	: Promise<void> | void;
}

async function initDrcp(drcpArgs: any, drcpConfigFiles: string[]): Promise<DrcpConfig> {
	var config = require('dr-comp-package/wfh/lib/config');

	if (drcpArgs.c == null)
		drcpArgs.c = [];
	drcpArgs.c.push(...drcpConfigFiles);
	await config.init(drcpArgs);
	require('dr-comp-package/wfh/lib/logConfig')(config());
	return config;
}

export type buildWebpackConfigFunc = (browserOptions: AngularBuilderOptions) => any;

export interface AngularCliParam {
	builderConfig?: BuilderConfiguration<DevServerBuilderOptions>;
	browserOptions: AngularBuilderOptions;
	ssr: boolean; // Is server side / prerender
	webpackConfig: any;
	projectRoot: string;
	argv: any;
}

export type AngularBuilderOptions =
	BrowserBuilderSchema & BuildWebpackServerSchema & DevServerBuilderOptions & DrcpBuilderOptions;

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
	const drcpConfigFiles = options.drcpConfig ? options.drcpConfig.split(/\s*[,;:]\s*/) : [];
	let config: DrcpConfig;

	return Rx.Observable.create((obs: Rx.Observer<BuildEvent>) => {
		initDrcp(options.drcpArgs, drcpConfigFiles)
		.then((cfg) => {
			config = cfg;
			return changeAngularCliOptions(config, browserOptions,
				builderConfig as BuilderConfiguration<AngularBuilderOptions>);
		})
		.then(() => {
			const param: AngularCliParam = {
				ssr: false,
				builderConfig,
				browserOptions,
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
				console.error('ng.command -  Failed to start server:', err);
				// process.exit(1); // Log4js "log4jsReloadSeconds" will hang process event loop, so we have to explicitly quit.
				obs.error(err);
			});
		})
		.catch((err: Error) => {
			console.error('ng.command -  Failed to start server:', err);
			obs.error(err);
		});
	});
}

/**
 * Invoke this function from browser builder
 * @param projectRoot 
 * @param browserOptions 
 * @param buildWebpackConfig 
 * @param vfsHost 
 */
export function compile(projectRoot: string,
	builderConfig: BuilderConfiguration<BrowserBuilderSchema | BuildWebpackServerSchema>,
	buildWebpackConfig: buildWebpackConfigFunc, isSSR = false) {
	return new Rx.Observable((obs) => {
		compileAsync(projectRoot, builderConfig, buildWebpackConfig, isSSR)
		.then((webpackConfig: any) => {
			obs.next(webpackConfig);
			obs.complete();
		})
		.catch((err: Error) => {
			console.error('ng.command - Angular cli error', err);
			obs.error(err);
		});
	});
}

async function compileAsync(projectRoot: string,
	builderConfig: BuilderConfiguration<BrowserBuilderSchema | BuildWebpackServerSchema>,
	buildWebpackConfig: buildWebpackConfigFunc, ssr: boolean) {
	const browserOptions: AngularBuilderOptions = builderConfig.options as AngularBuilderOptions;
	const options = browserOptions;
	const drcpConfigFiles = options.drcpConfig ? options.drcpConfig.split(/\s*[,;:]\s*/) : [];
	const config = await initDrcp(options.drcpArgs, drcpConfigFiles);
	await changeAngularCliOptions(config, browserOptions,
		builderConfig as BuilderConfiguration<AngularBuilderOptions>);
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
	await require('dr-comp-package/wfh/lib/packageMgr/packageRunner').runBuilder(param.argv);
	return param.webpackConfig;
}
