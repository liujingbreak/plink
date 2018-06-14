/* tslint:disable no-console */
import {
	BuildEvent,
	// Builder,
	BuilderConfiguration
	// BuilderContext,
} from '@angular-devkit/architect';
import {DevServerBuilderOptions} from '@angular-devkit/build-angular';
import {NormalizedBrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser';
import ReadHookHost from '../utils/read-hook-vfshost';
import * as Rx from 'rxjs';

function initDrcp(drcpArgs: any) {
	var config = require('dr-comp-package/wfh/lib/config');
	if (Array.isArray(drcpArgs.c)) {
		config.load(drcpArgs.c);
	}
	require('dr-comp-package/wfh/lib/logConfig')(config());
	return config;
}

export type buildWebpackConfigFunc = (browserOptions: NormalizedBrowserBuilderSchema) => any;

export interface AngularCliParam {
	builderConfig?: BuilderConfiguration<DevServerBuilderOptions>;
	// buildWebpackConfig: buildWebpackConfigFunc;
	browserOptions: NormalizedBrowserBuilderSchema & DrcpBuilderOptions;
	webpackConfig: any;
	projectRoot: string;
	vfsHost: ReadHookHost;
	argv: any;
}

export interface DrcpBuilderOptions {
	drcpArgs: any;
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
	browserOptions: NormalizedBrowserBuilderSchema,
	buildWebpackConfig: buildWebpackConfigFunc,
	vfsHost: ReadHookHost): Rx.Observable<BuildEvent> {
	// let argv: any = {};
	let options = builderConfig.options as (DevServerBuilderOptions & DrcpBuilderOptions);

	let config = initDrcp(options.drcpArgs);

	return Rx.Observable.create((obs: Rx.Observer<BuildEvent>) => {
		let param: AngularCliParam = {
			builderConfig,
			browserOptions: browserOptions as any as NormalizedBrowserBuilderSchema & DrcpBuilderOptions,
			webpackConfig: buildWebpackConfig(browserOptions),
			projectRoot,
			vfsHost,
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
			pkMgr.runServer(param.argv)
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
export function compile(projectRoot: string, browserOptions: NormalizedBrowserBuilderSchema,
	buildWebpackConfig: buildWebpackConfigFunc, vfsHost: ReadHookHost) {
	return new Rx.Observable((obs: any) => {
		compileAsync(projectRoot, browserOptions, buildWebpackConfig, vfsHost).then((webpackConfig: any) => {
			obs.next(webpackConfig);
			obs.complete();
		});
	});
}

function compileAsync(projectRoot: string, browserOptions: NormalizedBrowserBuilderSchema,
	buildWebpackConfig: buildWebpackConfigFunc, vfsHost: ReadHookHost) {
	let options = browserOptions as (NormalizedBrowserBuilderSchema & DrcpBuilderOptions);
	let config = initDrcp(options.drcpArgs);
	let param: AngularCliParam = {
		browserOptions: options,
		webpackConfig: buildWebpackConfig(browserOptions),
		projectRoot,
		vfsHost,
		argv: {
			poll: options.poll,
			...options.drcpArgs
		}
	};
	config.set('_angularCli', param);
	return require('dr-comp-package/wfh/lib/packageMgr/packageRunner').runBuilder(param.argv)
	.then(() => param.webpackConfig);
}
