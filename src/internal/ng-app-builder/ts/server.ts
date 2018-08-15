/* tslint:disable max-line-length */
import api, {DrcpApi} from '__api';
import * as log4js from 'log4js';
import * as _ from 'lodash';
import * as Path from 'path';
import * as _fs from 'fs';
// import { PrerenderForExpress } from './ng-prerender';
import {AngularCliParam} from './ng/common';
import changeWebpackConfig from './config-webpack';
import Url = require('url');
const semver = require('semver');
const {red, yellow} = require('chalk');

const fs = require('fs-extra');
const sysFs = fs as typeof _fs & {mkdirsSync: (file: string) => void};
const log = log4js.getLogger(api.packageName);

export function compile() {
	setupApiForAngularCli();
}

export function init() {
	// printHelp();
	checkAngularVersion();
	writeTsconfig();
}

export function activate() {
	// setupApiForAngularCli();
	// const prerenderExpress = new PrerenderForExpress(api.config().staticDir, '...');
	// api.expressAppUse(app => {
	// 	app.use(prerenderExpress.asMiddleware());
	// });
}

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
		// TODO: doc for dr.ngAppModule
		let isNgAppModule: boolean = _.get(pk, 'dr.ngAppModule');
		const dir = Path.relative(tempDir,
			isNgAppModule ? pk.realPackagePath : pk.packagePath)
			// pk.packagePath)
			// pk.realPackagePath.startsWith(root) ? pk.realPackagePath : pk.packagePath)
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
	tsExclude.push('**/test.ts');

	var tsjson: any = {
		extends: require.resolve('@dr-core/webpack2-builder/configs/tsconfig.json'),
		include: tsInclude,
		exclude: tsExclude,
		compilerOptions: {
			baseUrl: root,
			// paths: {
			// 	'*': [
			// 		'node_modules/*'
			// 	]
			// },
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
		ssr: ngParam.ssr,
		ngBaseRouterPath: _.trim(publicUrlObj.pathname, '/'),
		/**@function ngRouterPath
		 * @memberOf __api
		 * e.g.
		 * Assume application is deployed on 'http://foobar.com/base-href' as "deployUrl" in angular.json.
		 * Current feature package is `@bk/feature-a`, its `ngRoutePath` is by default 'feature-a',
		 * feature package `@bk/feature-b`'s `ngRoutePath` is by default 'feature-b'
		 *  ```ts
		 * __api.ngRouterPath('action')  // "/base-href/feature-a/action"
		 * __api.ngRouterPath('@bk/feature-b', 'action')   // "/base-href/feature-b/action"
		 * ```
		 * @return the configured Angular router path for specific (current) feature package
		 */
		ngRouterPath(this: DrcpApi, packageName: string, subPath?: string) {
			const url = this.assetsUrl(packageName, subPath);
			return _.trimStart(Url.parse(url).pathname, '/');
		},
		ssrRequire(requirePath: string) {
			if (ngParam.ssr)
				return require(Path.join(this.__dirname, requirePath));
		}
	});
	api.config.set(['outputPathMap', ngEntryComponent.longName], '/');
	if (!api.config.get('staticAssetsURL'))
		api.config.set('staticAssetsURL', deployUrl);
	changeWebpackConfig(ngParam, webpackConfig, api.config());

	// ngParam.vfsHost.hookRead = createTsReadHook(ngParam);
	log.info('Setup api object for Angular');
}

function checkAngularVersion() {
	const deps: {[k: string]: string} = {
		'@angular-devkit/build-angular': '~0.7.3',
		'@angular/cli': '6.1.3',
		'@angular/compiler-cli': '6.1.3',
		'@angular/language-service': '6.1.3'
	};
	let valid = true;
	_.each(deps, (expectVer, mod) => {
		const ver = require(mod + '/package.json').version;
		if (!semver.satisfies(ver, expectVer)) {
			valid = false;
			log.error(yellow(`Installed dependency "${mod}@`) + red(ver) + yellow(`" version is not supported, install ${expectVer} instead.`));
		}
	});
	return valid;
}

// function printHelp() {
// 	// tslint:disable no-console
// 	console.log('\n\n  If you want to narrow down to only specific modules for Angular to build/serve, try\n    ' +
// 		yellow('drcp init --prop @dr-core/ng-app-builder.packages=<packageName,...>') + '\n  ' +
// 		'Or through a configuration file:\n' +
// 		yellow('    drcp init -c <other files> modules.yaml\n') +
// 		'  modules.yaml:\n' +
// 		cyan('  '.repeat(1) + '@dr-core/ng-app-builder:\n' +
// 			'  '.repeat(2) + 'packages:\n' +
// 			'  '.repeat(3) + '- <packageName 1>\n' +
// 			'  '.repeat(3) + '- <packageName 2>\n')
// 	);
// }
