/* tslint:disable max-line-length */
import api from '__api';
import * as _ from 'lodash';
import * as log4js from 'log4js';
import {of, throwError} from 'rxjs';
import {HookReadFunc} from './utils/read-hook-vfshost';
import {AngularCliParam} from './ng/common';
import ApiAotCompiler from './utils/ts-before-aot';
import AppModuleParser, {findAppModuleFileFromMain} from './utils/parse-app-module';
import {sep as SEP, relative, resolve, dirname} from 'path';
import {readTsConfig, transpileSingleTs} from './utils/ts-compiler';
import PackageBrowserInstance from '@dr-core/build-util/dist/package-instance';
const chalk = require('chalk');

const log = log4js.getLogger(api.packageName);

const apiTmpl = _.template('var __DrApi = require(\'@dr-core/webpack2-builder/browser/api\');\
var __api = __DrApi.getCachedApi(\'<%=packageName%>\') || __DrApi(\'<%=packageName%>\');\
 __api.default = __api;');
// const includeTsFile = Path.join(__dirname, '..', 'src', 'drcp-include.ts');

export default function createTsReadHook(ngParam: AngularCliParam): HookReadFunc {
	let drcpIncludeBuf: ArrayBuffer;

	const tsconfigFile = ngParam.browserOptions.tsConfig;

	const hmrEnabled = _.get(ngParam, 'builderConfig.options.hmr') || api.argv.hmr;
	const tsCompilerOptions = readTsConfig(tsconfigFile);
	let polyfillsFile: string = '';
	if (ngParam.browserOptions.polyfills)
		polyfillsFile = ngParam.browserOptions.polyfills.replace(/\\/g, '/');

	let appModuleFile = findAppModuleFileFromMain(resolve(ngParam.browserOptions.main));
	log.info('app module file: ', appModuleFile);
	if (!appModuleFile.endsWith('.ts'))
		appModuleFile = appModuleFile + '.ts';

	return function(file: string, buf: ArrayBuffer) {
		try {
			if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
				let normalFile = relative(process.cwd(), file);
				if (SEP === '\\')
					normalFile = normalFile.replace(/\\/g, '/');
				if (hmrEnabled && polyfillsFile && normalFile === polyfillsFile) {
					const hmrClient = '\nimport \'webpack-hot-middleware/client\';';
					const content = Buffer.from(buf).toString() + hmrClient;
					log.info(`Append to ${normalFile}: \nimport \'webpack-hot-middleware/client\';`);
					return of(string2buffer(content));
				} else if (normalFile.endsWith('/drcp-include.ts')) {
					if (drcpIncludeBuf)
						return of(drcpIncludeBuf);
					let content = Buffer.from(buf).toString();
					const legoConfig = browserLegoConfig();
					let hmrBoot: string;
					if (hmrEnabled) {
						content = `// Used for reflect-metadata in JIT. If you use AOT (and only Angular decorators), you can remove.
						import hmrBootstrap from './hmr';
						`.replace(/^[ \t]+/gm, '') + content;

						hmrBoot = 'hmrBootstrap(module, bootstrap)';
					}
					if (!ngParam.browserOptions.aot) {
						content = 'import \'core-js/es7/reflect\';\n' + content;
					}
					if (hmrBoot)
						content = content.replace(/\/\* replace \*\/bootstrap\(\)/g, hmrBoot);
					if (ngParam.ssr) {
						content += '\nconsole.log("set global.LEGO_CONFIG");';
						content += '\nObject.assign(global, {\
							__drcpEntryPage: null, \
							__drcpEntryPackage: null\
						});\n';
						content += '(global as any)';
					} else {
						content += '\nObject.assign(window, {\
							__drcpEntryPage: null, \
							__drcpEntryPackage: null\
						});\n';
						content += '\n(window as any)';
					}
					content += `.LEGO_CONFIG = ${JSON.stringify(legoConfig, null, '  ')};\n`;
					drcpIncludeBuf = string2buffer(content);
					log.info(chalk.cyan(file) + ':\n' + content);
					return of(drcpIncludeBuf);
				}
				const compPkg = api.findPackageByFile(file);
				let content = Buffer.from(buf).toString();
				let needLogFile = false;
				// patch app.module.ts
				if (appModuleFile === file) {
					log.info('patch', file);
					const appModulePackage = api.findPackageByFile(appModuleFile);
					const removables = removableNgModules(appModulePackage, dirname(appModuleFile));
					const ngModules: string[] = getRouterModules(appModulePackage, dirname(appModuleFile)) || removables;
					ngModules.push(api.packageName + '/src/app#DeveloperModule');
					log.info('Insert optional NgModules to AppModule:\n  ' + ngModules.join('\n  '));
					content = new AppModuleParser()
						.patchFile(file, content, removables, ngModules);
					needLogFile = true;
				}
				let changed = api.browserInjector.injectToFile(file, content);

				changed = new ApiAotCompiler(file, changed).parse(source => transpileSingleTs(source, tsCompilerOptions));
				if (changed !== content) {
					changed = apiTmpl({packageName: compPkg.longName}) + '\n' + changed;
					if (ngParam.ssr)
						changed = 'import "@dr-core/ng-app-builder/src/drcp-include";\n' + changed;
				}
				if (needLogFile)
					log.info(chalk.cyan(file) + ':\n' + changed);
				return of(string2buffer(changed));
			}
			return of(buf);
		} catch (ex) {
			log.error(ex);
			return throwError(ex);
		}
	};
}

export function string2buffer(input: string): ArrayBuffer {
	const nodeBuf = Buffer.from(input);
	const len = nodeBuf.byteLength;
	const newBuf = new ArrayBuffer(len);
	const dataView = new DataView(newBuf);
	for (let i = 0; i < len; i++) {
		dataView.setUint8(i, nodeBuf.readUInt8(i));
	}
	return newBuf;
}

function browserLegoConfig() {
	var browserPropSet: any = {};
	var legoConfig: any = {}; // legoConfig is global configuration properties which apply to all entries and modules
	_.each([
		'staticAssetsURL', 'serverURL', 'packageContextPathMapping',
		'locales', 'devMode', 'outputPathMap'
	], prop => browserPropSet[prop] = 1);
	_.each(api.config().browserSideConfigProp, prop => browserPropSet[prop] = true);
	_.forOwn(browserPropSet, (nothing, propPath) => _.set(legoConfig, propPath, _.get(api.config(), propPath)));
	var compressedInfo = compressOutputPathMap(legoConfig.outputPathMap);
	legoConfig.outputPathMap = compressedInfo.diffMap;
	legoConfig._outputAsNames = compressedInfo.sames;
	legoConfig.buildLocale = api.getBuildLocale();
	log.debug('DefinePlugin LEGO_CONFIG: ', legoConfig);
	return legoConfig;
}

function compressOutputPathMap(pathMap: any) {
	var newMap: any = {};
	var sameAsNames: string[] = [];
	_.each(pathMap, (value, key) => {
		var parsed = api.packageUtils.parseName(key);
		if (parsed.name !== value) {
			newMap[key] = value;
		} else {
			sameAsNames.push(key);
		}
	});
	return {
		sames: sameAsNames,
		diffMap: newMap
	};
}

function getRouterModules(appModulePackage: PackageBrowserInstance, appModuleDir: string) {
	const ngModules: string[] = api.config.get([api.packageName, 'ngModule']) || [];
	const ngPackageModules = new Set(packageNames2NgModule(appModulePackage, appModuleDir,
		api.config.get([api.packageName, 'ngPackage']) || []));
	ngModules.forEach(m => ngPackageModules.add(m));
	return Array.from(ngPackageModules);
}

function packageNames2NgModule(appModulePk: PackageBrowserInstance, appModuleDir: string, includePackages?: string[]): string[] {
	const res: string[] = [];
	if (includePackages) {
		for (const name of includePackages) {
			let pk = api.packageInfo.moduleMap[name];
			if (pk == null) {
				const scope = (api.config.get('packageScopes') as string[]).find(scope => {
					return api.packageInfo.moduleMap[`@${scope}/${name}`] != null;
				});
				if (scope == null) {
					log.error('Package named: "%s" is not found with possible scope name in "%s"', name,
						(api.config.get('packageScopes') as string[]).join(', '));
					break;
				}
				pk = api.packageInfo.moduleMap[`@${scope}/${name}`];
			}
			eachPackage(pk);
		}
	} else {
		for (const pk of api.packageInfo.allModules) {
			eachPackage(pk);
		}
	}

	function eachPackage(pk: PackageBrowserInstance) {
		if (pk.dr == null || pk.dr.ngModule == null)
			return;

		let modules = pk.dr.ngModule;
		if (!Array.isArray(modules))
			modules = [modules];

		for (let name of modules) {
			name = _.trimStart(name, './');
			if (pk !== appModulePk) {
				if (name.indexOf('#') < 0)
					res.push(pk.longName + '#' + name);
				else
					res.push(pk.longName + '/' + name);
			} else {
				// package is same as the one app.module belongs to, we use relative path instead of package name
				if (name.indexOf('#') < 0)
					throw new Error(`In ${pk.realPackagePath}/package.json, value of "dr.ngModule" array` +
						`must be in form of '<path>#<export NgModule name>', but here it is '${name}'`);
				const nameParts = name.split('#');
				name = relative(appModuleDir, nameParts[0]) + '#' + nameParts[1];
				name = name.replace(/\\/g, '/');
				if (!name.startsWith('.'))
					name = './' + name;
				res.push(name);
			}
		}
	}
	return res;
}

/**
 * 
 * @param appModulePkName package name of the one contains app.module.ts
 * @param appModuleDir app.module.ts's directory, used to calculate relative path
 */
function removableNgModules(appModulePk: PackageBrowserInstance, appModuleDir: string): string[] {
	return packageNames2NgModule(appModulePk, appModuleDir);
}
