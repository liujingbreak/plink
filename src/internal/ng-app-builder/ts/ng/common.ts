/* tslint:disable no-console */
import {
	BuildEvent,
	// Builder,
	BuilderConfiguration
	// BuilderContext,
} from '@angular-devkit/architect';
// import {NormalizedBrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser';
import { NormalizedBrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser/schema';
import {NormalizedServerBuilderServerSchema} from '@angular-devkit/build-angular/src/server/schema';
import {NormalizedKarmaBuilderSchema} from '@angular-devkit/build-angular/src/karma/schema';
import { checkPort } from '@angular-devkit/build-angular/src/angular-cli-files/utilities/check-port';
import {DevServerBuilderOptions} from '@angular-devkit/build-angular';
import * as Rx from 'rxjs';
import * as _ from 'lodash';
import changeAngularCliOptions from './change-cli-options';
import api from '__api';
import PackageMgr from 'dr-comp-package/wfh/lib/packageMgr';

export type DrcpConfig = typeof api.config;

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

export type NormalizedAngularBuildSchema = NormalizedBrowserBuilderSchema | NormalizedServerBuilderServerSchema |
NormalizedKarmaBuilderSchema;

export type AngularBuilderOptions =
	NormalizedBrowserBuilderSchema & NormalizedServerBuilderServerSchema & NormalizedKarmaBuilderSchema &
	DrcpBuilderOptions;

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
		const startServer = async (): Promise<() => void> => {
			config = await initDrcp(options.drcpArgs, drcpConfigFiles);
			await checkPort(config().port, builderConfig.options.host).toPromise();
			await changeAngularCliOptions(config, browserOptions,
					builderConfig);
			try {
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
				// config.set('port', options.port);
				const log4js = require('log4js');
				const log = log4js.getLogger('ng-app-builder.ng.dev-server');
				const pkMgr: typeof PackageMgr = require('dr-comp-package/wfh/lib/packageMgr');
				// let shutdownable: Promise<() => void>;

				// process.on('uncaughtException', function(err) {
				// 	log.error('Uncaught exception: ', err, err.stack);
				// 	// throw err; // let PM2 handle exception
				// 	obs.error(err);
				// });
				process.on('SIGINT', function() {
					log.info('Recieve SIGINT.');
					startDone.then(shut => shut())
					.then(() => {
						log4js.shutdown();
						log.info('Bye.');
						process.exit(0);
					});
				});
				process.on('message', function(msg) {
					if (msg === 'shutdown') {
						log.info('Recieve shutdown message from PM2');
						startDone.then(shut => shut())
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

				const shutdown = await pkMgr.runServer(param.argv);
				if (_.get(options, 'drcpArgs.noWebpack')) {
					obs.next({success: true});
				}
				return shutdown;
			} catch (err) {
				console.error('ng.command -  Failed to start server:', err);
				obs.error(err);
			}
		};
		const startDone = startServer();

		return async function() {
			const shutdown = await startDone;
			shutdown();
		};
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
	builderConfig: NormalizedAngularBuildSchema,
	buildWebpackConfig: buildWebpackConfigFunc, isSSR = false) {
	return Rx.from(compileAsync(projectRoot, builderConfig, buildWebpackConfig, isSSR));
}

async function compileAsync(projectRoot: string,
	builderConfig: NormalizedAngularBuildSchema,
	buildWebpackConfig: buildWebpackConfigFunc, ssr: boolean) {
	const browserOptions: AngularBuilderOptions = builderConfig as AngularBuilderOptions;
	const options = browserOptions;
	const drcpConfigFiles = options.drcpConfig ? options.drcpConfig.split(/\s*[,;:]\s*/) : [];
	const config = await initDrcp(options.drcpArgs, drcpConfigFiles);
	await changeAngularCliOptions(config, browserOptions);
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
