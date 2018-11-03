/* tslint:disable no-console */
import {AngularBuilderOptions} from './common';
import {
	BuilderConfiguration
} from '@angular-devkit/architect';
import * as _ from 'lodash';
import * as Path from 'path';
import * as fs from 'fs';
import {DrcpConfig, ConfigHandler} from 'dr-comp-package/wfh/dist/config-handler';
import {PackageInfo} from '@dr-core/build-util';
import {findAppModuleFileFromMain} from '../utils/parse-app-module';
const {cyan, green, red} = require('chalk');
const {walkPackages} = require('@dr-core/build-util');
const packageUtils = require('dr-comp-package/wfh/lib/packageMgr/packageUtils');
const currPackageName = require('../../package.json').name;
const cjson = require('comment-json');
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
	const pkJson = lookupEntryPackage(Path.resolve(browserOptions.main));
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
	hackTsConfig(browserOptions, config);
}

import {sys} from 'typescript';
// import Path = require('path');
// const log = require('log4js').getLogger('hackTsConfig');

// Hack ts.sys, so far it is used to read tsconfig.json
function hackTsConfig(browserOptions: AngularBuilderOptions, config: DrcpConfig) {
	const oldReadFile = sys.readFile;
	const tsConfigFile = Path.resolve(browserOptions.tsConfig);

	sys.readFile = function(path: string, encoding?: string): string {
		const res: string = oldReadFile.apply(sys, arguments);
		if (Path.sep === '\\') {
			// Angular somehow reads tsconfig.json twice and passes in `path`
			// with different path seperator `\` and `/` in Windows 
			// `cachedTsConfigFor` is lodash memoize function which needs a
			// consistent `path` value as cache key
			path = path.replace(/\//g, Path.sep);
		}
		try {
			if (path === tsConfigFile)
				return cachedTsConfigFor(path, res, browserOptions, config);
			else
				return res;
		} catch (err) {
			console.error(red('change-cli-options - ') + `Read ${path}`, err);
		}
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

/**
 * Angular cli will read tsconfig.json twice due to some junk code, 
 * let's memoize the result by file path as cache key.
 */
const cachedTsConfigFor = _.memoize(overrideTsConfig);
/**
 * Let's override tsconfig.json files for Angular at rutime :)
 * - Read into memory
 * - Do not override properties of compilerOptions,angularCompilerOptions that exists in current file
 * - "extends" must be ...
 * - Traverse packages to build proper includes and excludes list and ...
 * - Find file where AppModule is in, find its package, move its directory to top of includes list,
 * 	which fixes ng cli windows bug
 */
function overrideTsConfig(file: string, content: string,
	browserOptions: AngularBuilderOptions, config: DrcpConfig): string {

	const root = config().rootPath;
	const oldJson = cjson.parse(content);
	const pkInfo: PackageInfo = walkPackages(config, null, packageUtils, true);
	// var packageScopes: string[] = config().packageScopes;
	// var components = pkInfo.moduleMap;

	type PackageInstances = typeof pkInfo.allModules;
	let ngPackages: PackageInstances = pkInfo.allModules;

	// const excludePkSet = new Set<string>();
	const excludePackage: Array<RegExp | string> = config.get(currPackageName + '.excludePackage') || [];
	const excludePath: string[] = config.get(currPackageName + '.excludePath') || [];
	// if (excludePackage)
	// 	excludePackage.forEach(pname => excludePkSet.add(pname));

	ngPackages = ngPackages.filter(comp =>
		!excludePackage.some(reg => _.isString(reg) ? comp.longName.includes(reg) : reg.test(comp.longName)) &&
		(comp.dr && comp.dr.angularCompiler || comp.parsedName.scope === 'bk'));

	const tsInclude: string[] = [];
	const tsExclude: string[] = [];
	const appModuleFile = findAppModuleFileFromMain(Path.resolve(browserOptions.main));
	const appPackageJson = lookupEntryPackage(appModuleFile);
	if (appPackageJson == null)
		throw new Error('Error, can not find package.json of ' + appModuleFile);

	ngPackages.forEach(pk => {
		// TODO: doc for dr.ngAppModule
		const isNgAppModule: boolean = pk.longName === appPackageJson.name;
		const dir = Path.relative(Path.dirname(file),
			isNgAppModule ? pk.realPackagePath : pk.packagePath)
			.replace(/\\/g, '/');
		if (isNgAppModule) {
			tsInclude.unshift(dir + '/**/*.ts');
			// entry package must be at first of TS include list, otherwise will encounter:
			// "Error: No NgModule metadata found for 'AppModule'
		} else {
			tsInclude.push(dir + '/**/*.ts');
		}
		tsExclude.push(dir + '/ts',
			dir + '/spec',
			dir + '/dist',
			dir + '/**/*.spec.ts');
	});
	tsInclude.push(Path.relative(Path.dirname(file), 'node_modules/dr-comp-package/wfh/share').replace(/\\/g, '/'));
	tsExclude.push('**/test.ts');
	tsExclude.push(...excludePath.map(expath =>
		Path.relative(Path.dirname(file), expath).replace(/\\/g, '/')));

	var tsjson: any = {
		extends: require.resolve('@dr-core/webpack2-builder/configs/tsconfig.json'),
		include: tsInclude,
		exclude: tsExclude,
		compilerOptions: {
			baseUrl: root,
			typeRoots: [
				Path.resolve(root, 'node_modules/@types'),
				Path.resolve(root, 'node_modules/@dr-types'),
				Path.resolve(root, 'node_modules/dr-comp-package/wfh/types')
			],
			module: 'esnext'
		},
		angularCompilerOptions: {
			trace: true,
			strictMetadataEmit: true
		}
	};
	Object.assign(tsjson.compilerOptions, oldJson.compilerOptions);
	Object.assign(tsjson.angularCompilerOptions, oldJson.angularCompilerOptions);
	console.log(green('change-cli-options - ') + `${file}:\n`, tsjson);
	return JSON.stringify(tsjson, null, '  ');
}
