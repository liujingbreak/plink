/* tslint:disable max-line-length */
import api, {DrcpApi} from '__api';
import * as log4js from 'log4js';
import * as _ from 'lodash';
import * as Path from 'path';
import * as _fs from 'fs';
import * as express from 'express';
import {AngularCliParam} from './ng/common';
import configWebpack from './config-webpack';
import createHook from './ng-ts-replace';
import Url = require('url');

const fs = require('fs-extra');
const sysFs = fs as typeof _fs & {mkdirsSync: (file: string) => void};
const log = log4js.getLogger(api.packageName);

export function compile() {
	setupApiForAngularCli();
	if (!api.argv.ng)
		return;
	// var tsConfigPath = writeTsconfig();
	// var useHappypack = api.config.get('@dr-core/webpack2-builder.useHappypack', false);
	// var devMode = api.config().devMode;
	// var happyThreadPool = HappyPack.ThreadPool({
	// 	size: api.config.get('@dr-core/webpack2-builder.happyThreadPoolSize', 2)
	// });
	// api.configWebpackLater(
	// 	function(webpackConfig: WebpackConfig): WebpackConfig {
	// 		if (webpackConfig.resolve.alias)
	// 			Object.assign(webpackConfig.resolve.alias, rxPaths());
	// 		else
	// 			webpackConfig.resolve.alias = rxPaths();
	// 		webpackConfig.resolve.mainFields = [
	// 			'browser',
	// 			'module',
	// 			'main'
	// 		];
	// 		if (webpackConfig.resolveLoader.alias)
	// 			Object.assign(webpackConfig.resolveLoader.alias, rxPaths());
	// 		else
	// 			webpackConfig.resolveLoader.alias = rxPaths();
	// 		webpackConfig.module.rules.push(
	// 			{
	// 				test: /\.css$/,
	// 				compiler: AOT ? () => true : undefined,
	// 				issuer: AOT ? undefined: api.isIssuerAngular,
	// 				use: [
	// 					'exports-loader?module.exports.toString()',
	// 					{
	// 						loader: 'css-loader',
	// 						options: {
	// 							sourceMap: api.config().enableSourceMaps,
	// 							import: false
	// 						}
	// 					},
	// 					{
	// 						loader: 'postcss-loader',
	// 						options: {
	// 							ident: 'postcss',
	// 							plugins: postcssPlugins,
	// 							sourceMap: api.config().enableSourceMaps
	// 						}
	// 					},
	// 					{loader: 'lib/css-url-assets-loader'},
	// 					{loader: 'require-injector/css-loader', options: {
	// 						injector: api.browserInjector
	// 					}}
	// 				]
	// 			},
	// 			{
	// 				test: /\.scss$|\.sass$/,
	// 				compiler: AOT ? () => true : undefined,
	// 				issuer: AOT ? undefined: api.isIssuerAngular,
	// 				use: [
	// 					'exports-loader?module.exports.toString()',
	// 					{
	// 						loader: 'css-loader',
	// 						options: {
	// 							sourceMap: api.config().enableSourceMaps,
	// 							import: false
	// 						}
	// 					},
	// 					{
	// 						loader: 'postcss-loader',
	// 						options: {
	// 							ident: 'postcss',
	// 							plugins: postcssPlugins,
	// 							sourceMap: api.config().enableSourceMaps
	// 						}
	// 					},
	// 					{loader: 'lib/css-url-assets-loader'},
	// 					{
	// 						loader: 'sass-loader',
	// 						options: {
	// 							sourceMap: api.config().enableSourceMaps,
	// 							precision: 8,
	// 							includePaths: []
	// 						}
	// 					},
	// 					{loader: 'require-injector/css-loader', options: {
	// 						injector: api.browserInjector
	// 					}}
	// 				]
	// 			  },
	// 			{
	// 				test: /\.less$/,
	// 				compiler: AOT ? () => true : undefined,
	// 				issuer: AOT ? undefined: api.isIssuerAngular,
	// 				use: [
	// 					'exports-loader?module.exports.toString()',
	// 					{
	// 						loader: 'css-loader',
	// 						options: {
	// 							sourceMap: api.config().enableSourceMaps,
	// 							import: false
	// 						}
	// 					},
	// 					{
	// 						loader: 'postcss-loader',
	// 						options: {
	// 							ident: 'postcss',
	// 							plugins: postcssPlugins,
	// 							sourceMap: api.config().enableSourceMaps
	// 						}
	// 					},
	// 					{loader: 'lib/css-url-assets-loader'},
	// 					{loader: 'less-loader', options: {
	// 						sourceMap: api.config().enableSourceMaps
	// 					}},
	// 					{loader: 'require-injector/css-loader', options: {
	// 						injector: api.browserInjector
	// 					}}
	// 				]
	// 			},
	// 			devMode ?
	// 			{
	// 				test: shouldUseNgLoader,
	// 				use: ['@ngtools/webpack']
	// 			} : {
	// 				test: shouldUseNgLoader,
	// 				use: [
	// 					{
	// 						loader: '@angular-devkit/build-optimizer/webpack-loader',
	// 						options: {
	// 							sourceMap: api.config().enableSourceMaps
	// 						}
	// 					},
	// 					'@ngtools/webpack'
	// 				]
	// 			}
	// 		);
	// 		// var entryPackage = api.packageInfo.moduleMap['@dr-core/ng-app-builder'];
	// 		// TODO:
	// 		// var angularCompiler = new AngularCompilerPlugin({
	// 		// 	mainPath: Path.resolve(__dirname, '../browser/main.ts'),
	// 		// 	// mainPath: require.resolve('@dr/angular-app/main.ts'),
	// 		// 	basePath: api.config().rootPath,
	// 		// 	platform: 0,
	// 		// 	skipCodeGeneration: !AOT,
	// 		// 	// forkTypeChecker: true, // Only available at version above 6.0.0
	// 		// 	// Angular 5 has a bug with Typescript > 2.4.2:
	// 		// 	// "Host should not return a redirect source file from `getSourceFile`"
	// 		// 	hostReplacementPaths: environmentMap(),
	// 		// 	sourceMap: api.config().enableSourceMaps,
	// 		// 	tsConfigPath,
	// 		// 	compilerOptions: {
	// 		// 	}
	// 		// });
	// 		// TODO: require-injector
	// 		// (angularCompiler as any)._compilerHost.writeFile();
	// 		// webpackConfig.plugins.push(angularCompiler);
	// 		// let env = api.argv.env;
	// 		// if (env) {
	// 		// 	api.browserInjector.fromAllComponents().alias(
	// 		// 		/^.*\/environment(\?:.ts)?$/, (file: string, result: RegExpExecArray) => {
	// 		// 		if (file.endsWith('.ts')) {
	// 		// 			return result[0] + '.' + env;
	// 		// 		}
	// 		// 		log.warn(file, result);
	// 		// 		return result[0];
	// 		// 	});
	// 		// }
	// 		if (!devMode) {
	// 			webpackConfig.plugins.push(new PurifyPlugin());
	// 		}
	// 		return webpackConfig;
	// 	});
}

export function init() {
	writeTsconfig();
}

export function activate() {
	// setupApiForAngularCli();
	api.router().get('/ok', (req: express.Request, res: express.Response) => {
		log.warn('cool');
		res.send('cool');
	});
}

// function shouldUseNgLoader(file: string): boolean {
// 	if (!/(?:\.ngfactory\.js|\.ngstyle\.js|\.ts)$/.test(file))
// 		return false;
// 	var component = api.findPackageByFile(file);
// 	if (!component)
// 		return true;
// 	else if (_.get(component, 'dr.angularCompiler'))
// 		return true;
// 	return false;
// }

export function writeTsconfig(): string {
	var root = api.config().rootPath;
	var tempDir = api.config.resolve('destDir', 'webpack-temp');
	sysFs.mkdirsSync(tempDir);
	var packageScopes: string[] = api.config().packageScopes;
	var components = api.packageInfo.moduleMap;

	type PackageInstances = typeof api.packageInfo.allModules;
	var ngPackages: PackageInstances = api.packageInfo.allModules;
	if (api.argv.package && api.argv.package.length > 0) {
		var someComps: PackageInstances = [];
		var packages = _.uniq([...api.argv.package, api.packageName]);
		for (const name of packages) {
			if (_.has(components, name) && _.has(components, [name, 'dr', 'angularCompiler'])) {
				someComps.push(components[name]);
			} else {
				packageScopes.some(scope => {
					const testName = `@${scope}/${name}`;
					if (_.has(components, testName) && _.get(components, [name, 'dr', 'angularCompiler'])) {
						someComps.push(components[testName]);
						return true;
					}
					return false;
				});
			}
		}
		ngPackages = someComps;
	} else {
		ngPackages = ngPackages.filter(comp => comp.dr && comp.dr.angularCompiler || comp.parsedName.scope === 'bk');
	}
	const tsInclude: string[] = [];
	const tsExclude: string[] = [];
	ngPackages.forEach(pk => {
		const dir = Path.relative(tempDir,
			_.get(pk, 'dr.ngAppModule') ? pk.realPackagePath : pk.packagePath)
			// pk.packagePath)
			// pk.realPackagePath.startsWith(root) ? pk.realPackagePath : pk.packagePath)
			.replace(/\\/g, '/');
		tsInclude.push(dir + '/**/*.ts');
		tsExclude.push(dir + '/ts',
			dir + '/spec',
			dir + '/dist',
			dir + '/**/*.spec.ts');
	});
	tsExclude.push('**/test.ts');

	var tsjson: any = {
		extends: require.resolve('@dr-core/webpack2-builder/configs/tsconfig.json'),
		include: tsInclude,
		exclude: tsExclude,
		compilerOptions: {
			baseUrl: root,
			paths: {
				'*': [
					'node_modules/*'
				]
			},
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
	var tsConfigPath = Path.resolve(tempDir, 'angular-app-tsconfig.json');
	fs.writeFileSync(tsConfigPath, JSON.stringify(tsjson, null, '  '));
	return tsConfigPath;
}

function setupApiForAngularCli() {
	const ngParam: AngularCliParam = api.config()._angularCli;
	if (!ngParam || api.ngEntryComponent)
		return;
	if (!ngParam.browserOptions.preserveSymlinks) {
		throw new Error('In order to get DRCP builder work,\
		you must set property `preserveSymlinks` to be true in project\'s angular.json file \
		');
	}
	const webpackConfig = ngParam.webpackConfig;
	const ngEntryComponent = api.findPackageByFile(Path.resolve(ngParam.projectRoot));

	let deployUrl = webpackConfig.output.publicPath || api.config.get('staticAssetsURL');

	const publicUrlObj = Url.parse(deployUrl);
	Object.assign(Object.getPrototypeOf(api), {
		webpackConfig,
		ngEntryComponent,
		deployUrl,
		ngBaseRouterPath: _.trim(publicUrlObj.pathname, '/'),
		/**@function ngRouterPath
		 * @memberOf __api
		 * e.g.
		 * Assume application is deployed on 'http://foobar.com/base-href' as "deployUrl" in angular.json.
		 * Current feature package is `@bk/feature-a`, its `ngRoutePath` is by default 'feature-a',
		 * feature package `@bk/feature-b`'s `ngRoutePath` is by default 'feature-b'
		 ```ts
		__api.ngRouterPath('action')  // "/base-href/feature-a/action"
		__api.ngRouterPath('@bk/feature-b', 'action')   // "/base-href/feature-b/action"
		```
		* @return the configured Angular router path for specific (current) feature package
		*/
		ngRouterPath(this: DrcpApi, packageName: string, subPath?: string) {
			const url = this.assetsUrl(packageName, subPath);
			return _.trimStart(Url.parse(url).pathname, '/');
		}
	});
	api.config.set(['outputPathMap', ngEntryComponent.longName], '/');
	if (!api.config.get('staticAssetsURL'))
		api.config.set('staticAssetsURL', deployUrl);
	configWebpack(ngParam, webpackConfig, api.config());

	// ngParam.vfsHost.hookRead = createTsReadHook(ngParam);
	ngParam.vfsHost.hookRead = createHook(ngParam);
	log.info('Setup api object for Angular');
}
