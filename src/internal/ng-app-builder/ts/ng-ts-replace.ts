/* tslint:disable max-line-length */
import { readTsConfig, transpileSingleTs } from 'dr-comp-package/wfh/dist/ts-compiler';
import * as fs from 'fs';
import * as _ from 'lodash';
import * as log4js from 'log4js';
import { Observable, of, throwError } from 'rxjs';
import {map} from 'rxjs/operators';
import * as ts from 'typescript';
import api, {DrcpApi} from '__api';
import { replaceHtml } from './ng-aot-assets';
import { AngularCliParam } from './ng/common';
import { HookReadFunc } from './utils/read-hook-vfshost';
import Selector from './utils/ts-ast-query';
import ApiAotCompiler from './utils/ts-before-aot';
const chalk = require('chalk');

const log = log4js.getLogger(api.packageName);

const apiTmplTs = _.template('import __DrApi from \'@dr-core/ng-app-builder/src/app/api\';\
var __api = __DrApi.getCachedApi(\'<%=packageName%>\') || new __DrApi(\'<%=packageName%>\');\
__api.default = __api;');
// const includeTsFile = Path.join(__dirname, '..', 'src', 'drcp-include.ts');

(Object.getPrototypeOf(api) as DrcpApi).browserApiConfig = browserLegoConfig;

export default class TSReadHooker {
  hookFunc: HookReadFunc;
  private realFileCache = new Map<string, string>();
  private tsCache = new Map<string, ArrayBuffer>();

  constructor(ngParam: AngularCliParam) {
    this.hookFunc = this.createTsReadHook(ngParam);
  }

  clear() {
    this.tsCache.clear();
  }

  private realFile(file: string, preserveSymlinks: boolean): string {
    // log.info(`readFile ${file}`);
    const realFile = this.realFileCache.get(file);
    if (realFile !== undefined)
      return realFile;
    if (fs.lstatSync(file).isSymbolicLink()) {
      if (!preserveSymlinks)
        log.warn(`Reading a symlink: ${file}, but "preserveSymlinks" is false.`);
      const rf = fs.realpathSync(file);
      this.realFileCache.set(file, rf);
      return rf;
    } else
      return file;
  }

  private createTsReadHook(ngParam: AngularCliParam): HookReadFunc {
    // let drcpIncludeBuf: ArrayBuffer;

    const tsconfigFile = ngParam.browserOptions.tsConfig;

    // const hmrEnabled = _.get(ngParam, 'builderConfig.options.hmr') || api.argv.hmr;
    const preserveSymlinks = ngParam.browserOptions.preserveSymlinks != null ? ngParam.browserOptions.preserveSymlinks :
      false;
    const tsCompilerOptions = readTsConfig(tsconfigFile);
    // let polyfillsFile: string = '';
    // if (ngParam.browserOptions.polyfills)
    // 	polyfillsFile = ngParam.browserOptions.polyfills.replace(/\\/g, '/');

    // const appModuleFile = findAppModuleFileFromMain(resolve(ngParam.browserOptions.main));
    // log.info('app module file: ', appModuleFile);

    // const isAot = ngParam.browserOptions.aot;

    return (file: string, buf: ArrayBuffer): Observable<ArrayBuffer> => {
      try {
        if (file.endsWith('.component.html')) {
          const cached = this.tsCache.get(this.realFile(file, preserveSymlinks));
          if (cached != null)
            return of(cached);
          return replaceHtml(file, Buffer.from(buf).toString())
            .pipe(map(output => string2buffer(output)));

        } else if (!file.endsWith('.ts') || file.endsWith('.d.ts')) {
          return of(buf);
        }

        const cached = this.tsCache.get(this.realFile(file, preserveSymlinks));
        if (cached != null)
          return of(cached);
        // let normalFile = relative(process.cwd(), file);
        // if (SEP === '\\')
        // 	normalFile = normalFile.replace(/\\/g, '/');
        // if (hmrEnabled && polyfillsFile && normalFile === polyfillsFile) {
        // 	const hmrClient = '\nimport \'webpack-hot-middleware/client\';';
        // 	const content = Buffer.from(buf).toString() + hmrClient;
        // 	log.info(`Append to ${normalFile}: \nimport \'webpack-hot-middleware/client\';`);
        // 	const bf = string2buffer(content);
        // 	this.tsCache.set(this.realFile(file, preserveSymlinks), bf);
        // 	return of(bf);
        // } else if (normalFile.endsWith('/drcp-include.ts')) {
        // 	if (drcpIncludeBuf)
        // 		return of(drcpIncludeBuf);
        // 	let content = Buffer.from(buf).toString();
        // const legoConfig = browserLegoConfig();
        // 	let hmrBoot: string;
        // 	if (hmrEnabled) {
        // 		content = 'import hmrBootstrap from \'./hmr\';\n' + content;
        // 		hmrBoot = 'hmrBootstrap(module, bootstrap)';
        // 	}
        // 	if (!ngParam.browserOptions.aot) {
        // 		content = 'import \'core-js/es7/reflect\';\n' + content;
        // 	}
        // 	if (hmrBoot)
        // 		content = content.replace(/\/\* replace \*\/bootstrap\(\)/g, hmrBoot);
        // 	if (ngParam.ssr) {
        // 		content += '\nconsole.log("set global.LEGO_CONFIG");';
        // 		content += '\nObject.assign(global, {\
        // 			__drcpEntryPage: null, \
        // 			__drcpEntryPackage: null\
        // 		});\n';
        // 		content += '(global as any)';
        // 	} else {
        // 		content += '\nObject.assign(window, {\
        // 			__drcpEntryPage: null, \
        // 			__drcpEntryPackage: null\
        // 		});\n';
        // 		content += '\n(window as any)';
        // 	}
        // 	content += `.LEGO_CONFIG = ${JSON.stringify(legoConfig, null, '  ')};\n`;
        // 	drcpIncludeBuf = string2buffer(content);
        // 	log.info(chalk.cyan(file) + ':\n' + content);
        // 	this.tsCache.set(this.realFile(file, preserveSymlinks), drcpIncludeBuf);
        // 	return of(drcpIncludeBuf);
        // }
        const compPkg = api.findPackageByFile(file);
        let content = Buffer.from(buf).toString();
        let needLogFile = false;
        // patch app.module.ts
        // if (appModuleFile === file) {
        // 	log.info('patch', file);
        // 	const appModulePackage = api.findPackageByFile(appModuleFile);
        // 	const removables = removableNgModules(appModulePackage, dirname(appModuleFile));
        // 	const ngModules: string[] = getRouterModules(appModulePackage, dirname(appModuleFile)) || removables;
        // 	// ngModules.push(api.packageName + '/src/app#DeveloperModule');
        // 	log.info('Insert optional NgModules to AppModule:\n  ' + ngModules.join('\n  '));
        // 	content = new AppModuleParser()
        // 		.patchFile(file, content, removables, ngModules);
        // 	needLogFile = true;
        // }
        const tsSelector = new Selector(content, file);
        const hasImportApi = tsSelector.findAll(':ImportDeclaration>.moduleSpecifier:StringLiteral').some(ast => {
          return (ast as ts.StringLiteral).text === '__api';
        });
        let changed = api.browserInjector.injectToFile(file, content);

        changed = new ApiAotCompiler(file, changed).parse(source => transpileSingleTs(source, tsCompilerOptions));
        if (hasImportApi && compPkg)
          changed = apiTmplTs({packageName: compPkg.longName}) + '\n' + changed;
        // if (changed !== content && ngParam.ssr) {
        // 	changed = 'import "@dr-core/ng-app-builder/src/drcp-include";\n' + changed;
        // }
        if (needLogFile)
          log.info(chalk.cyan(file) + ':\n' + changed);
        const bf = string2buffer(changed);
        this.tsCache.set(this.realFile(file, preserveSymlinks), bf);
        return of(bf);
      } catch (ex) {
        log.error(ex);
        return throwError(ex);
      }
    };
  }
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

// function getRouterModules(appModulePackage: PackageBrowserInstance, appModuleDir: string) {
// 	const ngModules: string[] = api.config.get([api.packageName, 'ngModule']) || [];
// 	const ngPackageModules = new Set(packageNames2NgModule(appModulePackage, appModuleDir,
// 		api.config.get([api.packageName, 'ngPackage']) || []));
// 	ngModules.forEach(m => ngPackageModules.add(m));
// 	return Array.from(ngPackageModules);
// }

// function packageNames2NgModule(appModulePk: PackageBrowserInstance, appModuleDir: string, includePackages?: string[]): string[] {
// 	const res: string[] = [];
// 	if (includePackages) {
// 		for (const name of includePackages) {
// 			let pk = api.packageInfo.moduleMap[name];
// 			if (pk == null) {
// 				const scope = (api.config.get('packageScopes') as string[]).find(scope => {
// 					return api.packageInfo.moduleMap[`@${scope}/${name}`] != null;
// 				});
// 				if (scope == null) {
// 					log.error('Package named: "%s" is not found with possible scope name in "%s"', name,
// 						(api.config.get('packageScopes') as string[]).join(', '));
// 					break;
// 				}
// 				pk = api.packageInfo.moduleMap[`@${scope}/${name}`];
// 			}
// 			eachPackage(pk);
// 		}
// 	} else {
// 		for (const pk of api.packageInfo.allModules) {
// 			eachPackage(pk);
// 		}
// 	}

// 	function eachPackage(pk: PackageBrowserInstance) {
// 		if (pk.dr == null || pk.dr.ngModule == null)
// 			return;

// 		let modules = pk.dr.ngModule;
// 		if (!Array.isArray(modules))
// 			modules = [modules];

// 		for (let name of modules) {
// 			name = _.trimStart(name, './');
// 			if (pk !== appModulePk) {
// 				if (name.indexOf('#') < 0)
// 					res.push(pk.longName + '#' + name);
// 				else
// 					res.push(pk.longName + '/' + name);
// 			} else {
// 				// package is same as the one app.module belongs to, we use relative path instead of package name
// 				if (name.indexOf('#') < 0)
// 					throw new Error(`In ${pk.realPackagePath}/package.json, value of "dr.ngModule" array` +
// 						`must be in form of '<path>#<export NgModule name>', but here it is '${name}'`);
// 				const nameParts = name.split('#');
// 				name = relative(appModuleDir, nameParts[0]) + '#' + nameParts[1];
// 				name = name.replace(/\\/g, '/');
// 				if (!name.startsWith('.'))
// 					name = './' + name;
// 				res.push(name);
// 			}
// 		}
// 	}
// 	return res;
// }

/**
 * 
 * @param appModulePkName package name of the one contains app.module.ts
 * @param appModuleDir app.module.ts's directory, used to calculate relative path
 */
// function removableNgModules(appModulePk: PackageBrowserInstance, appModuleDir: string): string[] {
// 	return packageNames2NgModule(appModulePk, appModuleDir);
// }
