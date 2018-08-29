/* tslint:disable no-console */
import {AngularBuilderOptions} from './common';
import {
	BuilderConfiguration
} from '@angular-devkit/architect';
import * as _ from 'lodash';
import * as Path from 'path';
import * as fs from 'fs';
import {DrcpConfig, ConfigHandler} from 'dr-comp-package/wfh/dist/config-handler';
const {cyan, green} = require('chalk');

export interface AngularConfigHandler extends ConfigHandler {
	/**
	 * You may override angular.json in this function
	 * @param options Angular angular.json properties under path <project>.architect.<command>.options
	 * @param builderConfig Angular angular.json properties under path <project>
	 */
	angularJson(options: AngularBuilderOptions,
		builderConfig: BuilderConfiguration<AngularBuilderOptions>)
	: Promise<void> | void;
}

export default async function changeAngularCliOptions(config: DrcpConfig,
	browserOptions: AngularBuilderOptions,
	builderConfig?: BuilderConfiguration<AngularBuilderOptions>) {

	const currPackageName = require('../../package.json').name;

	for (const prop of ['deployUrl', 'outputPath', 'styles']) {
		const value = config.get([currPackageName, prop]);
		if (value != null) {
			(browserOptions as any)[prop] = value;
			console.log(currPackageName + ' - override %s: %s', prop, value);
		}
	}
	await config.configHandlerMgr().runEach<AngularConfigHandler>((file, obj, handler) => {
		console.log(green('change-cli-options - ') + ' run', cyan(file));
		if (handler.angularJson)
			return handler.angularJson(browserOptions, builderConfig);
		else
			return obj;
	});
	const pkJson = lookupEntryPackage(Path.resolve(builderConfig.root));
	if (pkJson) {
		console.log(green('change-cli-options - ') + `Set entry package ${cyan(pkJson.name)}'s output path to /`);
		config.set(['outputPathMap', pkJson.name], '/');
	}
	// Be compatible to old DRCP build tools
	const {deployUrl} = browserOptions;
	if (!config.get('staticAssetsURL'))
		config.set('staticAssetsURL', _.trimEnd(deployUrl, '/'));
	if (!config.get('publicPath'))
		config.set('publicPath', deployUrl);
	reduceTsConfig(browserOptions);
}

import {sys} from 'typescript';
// import Path = require('path');
// const log = require('log4js').getLogger('reduceTsConfig');

// Hack ts.sys, so far it is used to read tsconfig.json
function reduceTsConfig(browserOptions: AngularBuilderOptions) {
	const oldReadFile = sys.readFile;
	sys.readFile = function(path: string, encoding?: string): string {
		const res: string = oldReadFile.apply(sys, arguments);
		// TODO:
		// if (path === Path.resolve(browserOptions.tsConfig))
		// 	log.warn(path + '\n' + res);
		return res;
	};
}

function lookupEntryPackage(lookupDir: string): any {
	while (true) {
		const pk = Path.join(lookupDir, 'package.json');
		if (fs.existsSync(pk)) {
			return require(pk);
		} else if (lookupDir === Path.dirname(lookupDir)) {
			break;
		}
		lookupDir = Path.dirname(lookupDir);
	}
	return null;
}
