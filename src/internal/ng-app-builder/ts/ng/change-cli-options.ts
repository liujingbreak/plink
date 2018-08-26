/* tslint:disable no-console */
import {AngularBuilderOptions, AngularConfigHandler} from './common';
import {
	BuilderConfiguration
} from '@angular-devkit/architect';
// import {DevServerBuilderOptions} from '@angular-devkit/build-angular';
// import { BrowserBuilderSchema } from '@angular-devkit/build-angular/src/browser/schema';
// import {BuildWebpackServerSchema} from '@angular-devkit/build-angular/src/server/schema';
import api from '__api';
type DrcpConfig = typeof api.config;

export default async function changeAngularCliOptions(config: DrcpConfig,
	browserOptions: AngularBuilderOptions,
	configHandlers: Array<{file: string, handler: AngularConfigHandler}>,
	builderConfig?: BuilderConfiguration<AngularBuilderOptions>) {

	const currPackageName = require('../../package.json').name;

	for (const prop of ['deployUrl', 'outputPath', 'styles']) {
		const value = config.get([currPackageName, prop]);
		if (value != null) {
			(browserOptions as any)[prop] = value;
			console.log(currPackageName + ' - override %s: %s', prop, value);
		}
	}
	for (const {file, handler} of configHandlers) {
		console.log('Run %s angularJson()', file);
		await handler.angularJson(config, browserOptions, builderConfig);
	}
	reduceTsConfig(browserOptions);
}

import {sys} from 'typescript';
import Path = require('path');
const log = require('log4js').getLogger('reduceTsConfig');

// Hack ts.sys, so far it is used to read tsconfig.json
function reduceTsConfig(browserOptions: AngularBuilderOptions) {
	const oldReadFile = sys.readFile;
	sys.readFile = function(path: string, encoding?: string): string {
		const res: string = oldReadFile.apply(sys, arguments);
		if (path === Path.resolve(browserOptions.tsConfig))
			log.warn(path + '\n' + res);
		return res;
	};
}
