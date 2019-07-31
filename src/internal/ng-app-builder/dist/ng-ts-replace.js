"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* tslint:disable max-line-length */
const ts_compiler_1 = require("dr-comp-package/wfh/dist/ts-compiler");
const fs = tslib_1.__importStar(require("fs"));
const _ = tslib_1.__importStar(require("lodash"));
const log4js = tslib_1.__importStar(require("log4js"));
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const __api_1 = tslib_1.__importDefault(require("__api"));
const ng_aot_assets_1 = require("./ng-aot-assets");
const ts_ast_query_1 = tslib_1.__importDefault(require("./utils/ts-ast-query"));
const ts_before_aot_1 = tslib_1.__importDefault(require("./utils/ts-before-aot"));
const chalk = require('chalk');
const log = log4js.getLogger(__api_1.default.packageName);
const apiTmplTs = _.template('import __DrApi from \'@dr-core/ng-app-builder/src/app/api\';\
var __api = __DrApi.getCachedApi(\'<%=packageName%>\') || new __DrApi(\'<%=packageName%>\');\
__api.default = __api;');
// const includeTsFile = Path.join(__dirname, '..', 'src', 'drcp-include.ts');
Object.getPrototypeOf(__api_1.default).browserApiConfig = browserLegoConfig;
class TSReadHooker {
    constructor(ngParam) {
        this.realFileCache = new Map();
        this.tsCache = new Map();
        this.hookFunc = this.createTsReadHook(ngParam);
    }
    clear() {
        this.tsCache.clear();
    }
    realFile(file, preserveSymlinks) {
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
        }
        else
            return file;
    }
    createTsReadHook(ngParam) {
        // let drcpIncludeBuf: ArrayBuffer;
        const tsconfigFile = ngParam.browserOptions.tsConfig;
        // const hmrEnabled = _.get(ngParam, 'builderConfig.options.hmr') || api.argv.hmr;
        const preserveSymlinks = ngParam.browserOptions.preserveSymlinks != null ? ngParam.browserOptions.preserveSymlinks :
            false;
        const tsCompilerOptions = ts_compiler_1.readTsConfig(tsconfigFile);
        // let polyfillsFile: string = '';
        // if (ngParam.browserOptions.polyfills)
        // 	polyfillsFile = ngParam.browserOptions.polyfills.replace(/\\/g, '/');
        // const appModuleFile = findAppModuleFileFromMain(resolve(ngParam.browserOptions.main));
        // log.info('app module file: ', appModuleFile);
        // const isAot = ngParam.browserOptions.aot;
        return (file, buf) => {
            try {
                if (file.endsWith('.component.html')) {
                    const cached = this.tsCache.get(this.realFile(file, preserveSymlinks));
                    if (cached != null)
                        return rxjs_1.of(cached);
                    return ng_aot_assets_1.replaceHtml(file, Buffer.from(buf).toString())
                        .pipe(operators_1.map(output => string2buffer(output)));
                }
                else if (!file.endsWith('.ts') || file.endsWith('.d.ts')) {
                    return rxjs_1.of(buf);
                }
                const cached = this.tsCache.get(this.realFile(file, preserveSymlinks));
                if (cached != null)
                    return rxjs_1.of(cached);
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
                const compPkg = __api_1.default.findPackageByFile(file);
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
                const tsSelector = new ts_ast_query_1.default(content, file);
                const hasImportApi = tsSelector.findAll(':ImportDeclaration>.moduleSpecifier:StringLiteral').some(ast => {
                    return ast.text === '__api';
                });
                let changed = __api_1.default.browserInjector.injectToFile(file, content);
                changed = new ts_before_aot_1.default(file, changed).parse(source => ts_compiler_1.transpileSingleTs(source, tsCompilerOptions));
                if (hasImportApi && compPkg)
                    changed = apiTmplTs({ packageName: compPkg.longName }) + '\n' + changed;
                // if (changed !== content && ngParam.ssr) {
                // 	changed = 'import "@dr-core/ng-app-builder/src/drcp-include";\n' + changed;
                // }
                if (needLogFile)
                    log.info(chalk.cyan(file) + ':\n' + changed);
                const bf = string2buffer(changed);
                this.tsCache.set(this.realFile(file, preserveSymlinks), bf);
                return rxjs_1.of(bf);
            }
            catch (ex) {
                log.error(ex);
                return rxjs_1.throwError(ex);
            }
        };
    }
}
exports.default = TSReadHooker;
function string2buffer(input) {
    const nodeBuf = Buffer.from(input);
    const len = nodeBuf.byteLength;
    const newBuf = new ArrayBuffer(len);
    const dataView = new DataView(newBuf);
    for (let i = 0; i < len; i++) {
        dataView.setUint8(i, nodeBuf.readUInt8(i));
    }
    return newBuf;
}
exports.string2buffer = string2buffer;
function browserLegoConfig() {
    var browserPropSet = {};
    var legoConfig = {}; // legoConfig is global configuration properties which apply to all entries and modules
    _.each([
        'staticAssetsURL', 'serverURL', 'packageContextPathMapping',
        'locales', 'devMode', 'outputPathMap'
    ], prop => browserPropSet[prop] = 1);
    _.each(__api_1.default.config().browserSideConfigProp, prop => browserPropSet[prop] = true);
    _.forOwn(browserPropSet, (nothing, propPath) => _.set(legoConfig, propPath, _.get(__api_1.default.config(), propPath)));
    var compressedInfo = compressOutputPathMap(legoConfig.outputPathMap);
    legoConfig.outputPathMap = compressedInfo.diffMap;
    legoConfig._outputAsNames = compressedInfo.sames;
    legoConfig.buildLocale = __api_1.default.getBuildLocale();
    log.debug('DefinePlugin LEGO_CONFIG: ', legoConfig);
    return legoConfig;
}
function compressOutputPathMap(pathMap) {
    var newMap = {};
    var sameAsNames = [];
    _.each(pathMap, (value, key) => {
        var parsed = __api_1.default.packageUtils.parseName(key);
        if (parsed.name !== value) {
            newMap[key] = value;
        }
        else {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy10cy1yZXBsYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG9DQUFvQztBQUNwQyxzRUFBdUY7QUFDdkYsK0NBQXlCO0FBQ3pCLGtEQUE0QjtBQUM1Qix1REFBaUM7QUFDakMsK0JBQWtEO0FBQ2xELDhDQUFtQztBQUVuQywwREFBbUM7QUFDbkMsbURBQThDO0FBRzlDLGdGQUE0QztBQUM1QyxrRkFBbUQ7QUFDbkQsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBRS9CLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBRTlDLE1BQU0sU0FBUyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUM7O3VCQUVOLENBQUMsQ0FBQztBQUN6Qiw4RUFBOEU7QUFFN0UsTUFBTSxDQUFDLGNBQWMsQ0FBQyxlQUFHLENBQWEsQ0FBQyxnQkFBZ0IsR0FBRyxpQkFBaUIsQ0FBQztBQUU3RSxNQUFxQixZQUFZO0lBSy9CLFlBQVksT0FBd0I7UUFINUIsa0JBQWEsR0FBRyxJQUFJLEdBQUcsRUFBa0IsQ0FBQztRQUMxQyxZQUFPLEdBQUcsSUFBSSxHQUFHLEVBQXVCLENBQUM7UUFHL0MsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDakQsQ0FBQztJQUVELEtBQUs7UUFDSCxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3ZCLENBQUM7SUFFTyxRQUFRLENBQUMsSUFBWSxFQUFFLGdCQUF5QjtRQUN0RCxnQ0FBZ0M7UUFDaEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDOUMsSUFBSSxRQUFRLEtBQUssU0FBUztZQUN4QixPQUFPLFFBQVEsQ0FBQztRQUNsQixJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsY0FBYyxFQUFFLEVBQUU7WUFDdkMsSUFBSSxDQUFDLGdCQUFnQjtnQkFDbkIsR0FBRyxDQUFDLElBQUksQ0FBQyxzQkFBc0IsSUFBSSxvQ0FBb0MsQ0FBQyxDQUFDO1lBQzNFLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDakMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2pDLE9BQU8sRUFBRSxDQUFDO1NBQ1g7O1lBQ0MsT0FBTyxJQUFJLENBQUM7SUFDaEIsQ0FBQztJQUVPLGdCQUFnQixDQUFDLE9BQXdCO1FBQy9DLG1DQUFtQztRQUVuQyxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLFFBQVEsQ0FBQztRQUVyRCxrRkFBa0Y7UUFDbEYsTUFBTSxnQkFBZ0IsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLGdCQUFnQixJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQ2xILEtBQUssQ0FBQztRQUNSLE1BQU0saUJBQWlCLEdBQUcsMEJBQVksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNyRCxrQ0FBa0M7UUFDbEMsd0NBQXdDO1FBQ3hDLHlFQUF5RTtRQUV6RSx5RkFBeUY7UUFDekYsZ0RBQWdEO1FBRWhELDRDQUE0QztRQUU1QyxPQUFPLENBQUMsSUFBWSxFQUFFLEdBQWdCLEVBQTJCLEVBQUU7WUFDakUsSUFBSTtnQkFDRixJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsaUJBQWlCLENBQUMsRUFBRTtvQkFDcEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO29CQUN2RSxJQUFJLE1BQU0sSUFBSSxJQUFJO3dCQUNoQixPQUFPLFNBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQztvQkFDcEIsT0FBTywyQkFBVyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO3lCQUNsRCxJQUFJLENBQUMsZUFBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFFL0M7cUJBQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRTtvQkFDMUQsT0FBTyxTQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQ2hCO2dCQUVELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQztnQkFDdkUsSUFBSSxNQUFNLElBQUksSUFBSTtvQkFDaEIsT0FBTyxTQUFFLENBQUMsTUFBTSxDQUFDLENBQUM7Z0JBQ3BCLGtEQUFrRDtnQkFDbEQsb0JBQW9CO2dCQUNwQixnREFBZ0Q7Z0JBQ2hELHFFQUFxRTtnQkFDckUsb0VBQW9FO2dCQUNwRSw0REFBNEQ7Z0JBQzVELHFGQUFxRjtnQkFDckYsc0NBQXNDO2dCQUN0QyxnRUFBZ0U7Z0JBQ2hFLGtCQUFrQjtnQkFDbEIsd0RBQXdEO2dCQUN4RCx1QkFBdUI7Z0JBQ3ZCLCtCQUErQjtnQkFDL0IsOENBQThDO2dCQUM5QywwQ0FBMEM7Z0JBQzFDLHdCQUF3QjtnQkFDeEIscUJBQXFCO2dCQUNyQixpRUFBaUU7Z0JBQ2pFLGlEQUFpRDtnQkFDakQsS0FBSztnQkFDTCxzQ0FBc0M7Z0JBQ3RDLDZEQUE2RDtnQkFDN0QsS0FBSztnQkFDTCxnQkFBZ0I7Z0JBQ2hCLDJFQUEyRTtnQkFDM0Usc0JBQXNCO2dCQUN0QiwyREFBMkQ7Z0JBQzNELDJDQUEyQztnQkFDM0MsOEJBQThCO2dCQUM5QiwrQkFBK0I7Z0JBQy9CLFlBQVk7Z0JBQ1osa0NBQWtDO2dCQUNsQyxZQUFZO2dCQUNaLDJDQUEyQztnQkFDM0MsOEJBQThCO2dCQUM5QiwrQkFBK0I7Z0JBQy9CLFlBQVk7Z0JBQ1osb0NBQW9DO2dCQUNwQyxLQUFLO2dCQUNMLDZFQUE2RTtnQkFDN0UsNENBQTRDO2dCQUM1QyxpREFBaUQ7Z0JBQ2pELDRFQUE0RTtnQkFDNUUsOEJBQThCO2dCQUM5QixJQUFJO2dCQUNKLE1BQU0sT0FBTyxHQUFHLGVBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDNUMsSUFBSSxPQUFPLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDMUMsSUFBSSxXQUFXLEdBQUcsS0FBSyxDQUFDO2dCQUN4QixzQkFBc0I7Z0JBQ3RCLGdDQUFnQztnQkFDaEMsNEJBQTRCO2dCQUM1QixrRUFBa0U7Z0JBQ2xFLG9GQUFvRjtnQkFDcEYseUdBQXlHO2dCQUN6RyxvRUFBb0U7Z0JBQ3BFLHFGQUFxRjtnQkFDckYsbUNBQW1DO2dCQUNuQyxzREFBc0Q7Z0JBQ3RELHVCQUF1QjtnQkFDdkIsSUFBSTtnQkFDSixNQUFNLFVBQVUsR0FBRyxJQUFJLHNCQUFRLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO2dCQUMvQyxNQUFNLFlBQVksR0FBRyxVQUFVLENBQUMsT0FBTyxDQUFDLG1EQUFtRCxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFO29CQUN0RyxPQUFRLEdBQXdCLENBQUMsSUFBSSxLQUFLLE9BQU8sQ0FBQztnQkFDcEQsQ0FBQyxDQUFDLENBQUM7Z0JBQ0gsSUFBSSxPQUFPLEdBQUcsZUFBRyxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDO2dCQUU5RCxPQUFPLEdBQUcsSUFBSSx1QkFBYyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQywrQkFBaUIsQ0FBQyxNQUFNLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxDQUFDO2dCQUMxRyxJQUFJLFlBQVksSUFBSSxPQUFPO29CQUN6QixPQUFPLEdBQUcsU0FBUyxDQUFDLEVBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUMsQ0FBQyxHQUFHLElBQUksR0FBRyxPQUFPLENBQUM7Z0JBQ3hFLDRDQUE0QztnQkFDNUMsK0VBQStFO2dCQUMvRSxJQUFJO2dCQUNKLElBQUksV0FBVztvQkFDYixHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsS0FBSyxHQUFHLE9BQU8sQ0FBQyxDQUFDO2dCQUMvQyxNQUFNLEVBQUUsR0FBRyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ2xDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLGdCQUFnQixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzVELE9BQU8sU0FBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO2FBQ2Y7WUFBQyxPQUFPLEVBQUUsRUFBRTtnQkFDWCxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2dCQUNkLE9BQU8saUJBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUN2QjtRQUNILENBQUMsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQWpKRCwrQkFpSkM7QUFFRCxTQUFnQixhQUFhLENBQUMsS0FBYTtJQUN6QyxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ25DLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUM7SUFDL0IsTUFBTSxNQUFNLEdBQUcsSUFBSSxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDcEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDdEMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRTtRQUM1QixRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDNUM7SUFDRCxPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDO0FBVEQsc0NBU0M7QUFFRCxTQUFTLGlCQUFpQjtJQUN4QixJQUFJLGNBQWMsR0FBUSxFQUFFLENBQUM7SUFDN0IsSUFBSSxVQUFVLEdBQVEsRUFBRSxDQUFDLENBQUMsdUZBQXVGO0lBQ2pILENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDTCxpQkFBaUIsRUFBRSxXQUFXLEVBQUUsMkJBQTJCO1FBQzNELFNBQVMsRUFBRSxTQUFTLEVBQUUsZUFBZTtLQUN0QyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3JDLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLHFCQUFxQixFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ2hGLENBQUMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsZUFBRyxDQUFDLE1BQU0sRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM1RyxJQUFJLGNBQWMsR0FBRyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDckUsVUFBVSxDQUFDLGFBQWEsR0FBRyxjQUFjLENBQUMsT0FBTyxDQUFDO0lBQ2xELFVBQVUsQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDLEtBQUssQ0FBQztJQUNqRCxVQUFVLENBQUMsV0FBVyxHQUFHLGVBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUM5QyxHQUFHLENBQUMsS0FBSyxDQUFDLDRCQUE0QixFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ3BELE9BQU8sVUFBVSxDQUFDO0FBQ3BCLENBQUM7QUFFRCxTQUFTLHFCQUFxQixDQUFDLE9BQVk7SUFDekMsSUFBSSxNQUFNLEdBQVEsRUFBRSxDQUFDO0lBQ3JCLElBQUksV0FBVyxHQUFhLEVBQUUsQ0FBQztJQUMvQixDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsRUFBRTtRQUM3QixJQUFJLE1BQU0sR0FBRyxlQUFHLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM3QyxJQUFJLE1BQU0sQ0FBQyxJQUFJLEtBQUssS0FBSyxFQUFFO1lBQ3pCLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUM7U0FDckI7YUFBTTtZQUNMLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDdkI7SUFDSCxDQUFDLENBQUMsQ0FBQztJQUNILE9BQU87UUFDTCxLQUFLLEVBQUUsV0FBVztRQUNsQixPQUFPLEVBQUUsTUFBTTtLQUNoQixDQUFDO0FBQ0osQ0FBQztBQUVELDhGQUE4RjtBQUM5RixvRkFBb0Y7QUFDcEYsMEZBQTBGO0FBQzFGLDREQUE0RDtBQUM1RCxvREFBb0Q7QUFDcEQsd0NBQXdDO0FBQ3hDLElBQUk7QUFFSixvSUFBb0k7QUFDcEksNkJBQTZCO0FBQzdCLDBCQUEwQjtBQUMxQiwwQ0FBMEM7QUFDMUMsK0NBQStDO0FBQy9DLHVCQUF1QjtBQUN2QixrRkFBa0Y7QUFDbEYsc0VBQXNFO0FBQ3RFLFVBQVU7QUFDViwyQkFBMkI7QUFDM0IsNEZBQTRGO0FBQzVGLG1FQUFtRTtBQUNuRSxjQUFjO0FBQ2QsUUFBUTtBQUNSLDJEQUEyRDtBQUMzRCxPQUFPO0FBQ1Asc0JBQXNCO0FBQ3RCLE1BQU07QUFDTixZQUFZO0FBQ1osbURBQW1EO0FBQ25ELHNCQUFzQjtBQUN0QixNQUFNO0FBQ04sS0FBSztBQUVMLHNEQUFzRDtBQUN0RCxpREFBaUQ7QUFDakQsYUFBYTtBQUViLGtDQUFrQztBQUNsQyxpQ0FBaUM7QUFDakMsMEJBQTBCO0FBRTFCLGdDQUFnQztBQUNoQyxxQ0FBcUM7QUFDckMsK0JBQStCO0FBQy9CLGlDQUFpQztBQUNqQywyQ0FBMkM7QUFDM0MsV0FBVztBQUNYLDJDQUEyQztBQUMzQyxjQUFjO0FBQ2Qsd0dBQXdHO0FBQ3hHLGlDQUFpQztBQUNqQywrRkFBK0Y7QUFDL0YseUZBQXlGO0FBQ3pGLHlDQUF5QztBQUN6Qyx3RUFBd0U7QUFDeEUsdUNBQXVDO0FBQ3ZDLGlDQUFpQztBQUNqQywyQkFBMkI7QUFDM0Isc0JBQXNCO0FBQ3RCLE9BQU87QUFDUCxNQUFNO0FBQ04sS0FBSztBQUNMLGVBQWU7QUFDZixJQUFJO0FBRUo7Ozs7R0FJRztBQUNILHFHQUFxRztBQUNyRyw0REFBNEQ7QUFDNUQsSUFBSSIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9uZy10cy1yZXBsYWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbWF4LWxpbmUtbGVuZ3RoICovXG5pbXBvcnQgeyByZWFkVHNDb25maWcsIHRyYW5zcGlsZVNpbmdsZVRzIH0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3RzLWNvbXBpbGVyJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZSwgb2YsIHRocm93RXJyb3IgfSBmcm9tICdyeGpzJztcbmltcG9ydCB7bWFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBhcGksIHtEcmNwQXBpfSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgeyByZXBsYWNlSHRtbCB9IGZyb20gJy4vbmctYW90LWFzc2V0cyc7XG5pbXBvcnQgeyBBbmd1bGFyQ2xpUGFyYW0gfSBmcm9tICcuL25nL2NvbW1vbic7XG5pbXBvcnQgeyBIb29rUmVhZEZ1bmMgfSBmcm9tICcuL3V0aWxzL3JlYWQtaG9vay12ZnNob3N0JztcbmltcG9ydCBTZWxlY3RvciBmcm9tICcuL3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQgQXBpQW90Q29tcGlsZXIgZnJvbSAnLi91dGlscy90cy1iZWZvcmUtYW90JztcbmNvbnN0IGNoYWxrID0gcmVxdWlyZSgnY2hhbGsnKTtcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUpO1xuXG5jb25zdCBhcGlUbXBsVHMgPSBfLnRlbXBsYXRlKCdpbXBvcnQgX19EckFwaSBmcm9tIFxcJ0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL3NyYy9hcHAvYXBpXFwnO1xcXG52YXIgX19hcGkgPSBfX0RyQXBpLmdldENhY2hlZEFwaShcXCc8JT1wYWNrYWdlTmFtZSU+XFwnKSB8fCBuZXcgX19EckFwaShcXCc8JT1wYWNrYWdlTmFtZSU+XFwnKTtcXFxuX19hcGkuZGVmYXVsdCA9IF9fYXBpOycpO1xuLy8gY29uc3QgaW5jbHVkZVRzRmlsZSA9IFBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICdzcmMnLCAnZHJjcC1pbmNsdWRlLnRzJyk7XG5cbihPYmplY3QuZ2V0UHJvdG90eXBlT2YoYXBpKSBhcyBEcmNwQXBpKS5icm93c2VyQXBpQ29uZmlnID0gYnJvd3NlckxlZ29Db25maWc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRTUmVhZEhvb2tlciB7XG4gIGhvb2tGdW5jOiBIb29rUmVhZEZ1bmM7XG4gIHByaXZhdGUgcmVhbEZpbGVDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIHByaXZhdGUgdHNDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBBcnJheUJ1ZmZlcj4oKTtcblxuICBjb25zdHJ1Y3RvcihuZ1BhcmFtOiBBbmd1bGFyQ2xpUGFyYW0pIHtcbiAgICB0aGlzLmhvb2tGdW5jID0gdGhpcy5jcmVhdGVUc1JlYWRIb29rKG5nUGFyYW0pO1xuICB9XG5cbiAgY2xlYXIoKSB7XG4gICAgdGhpcy50c0NhY2hlLmNsZWFyKCk7XG4gIH1cblxuICBwcml2YXRlIHJlYWxGaWxlKGZpbGU6IHN0cmluZywgcHJlc2VydmVTeW1saW5rczogYm9vbGVhbik6IHN0cmluZyB7XG4gICAgLy8gbG9nLmluZm8oYHJlYWRGaWxlICR7ZmlsZX1gKTtcbiAgICBjb25zdCByZWFsRmlsZSA9IHRoaXMucmVhbEZpbGVDYWNoZS5nZXQoZmlsZSk7XG4gICAgaWYgKHJlYWxGaWxlICE9PSB1bmRlZmluZWQpXG4gICAgICByZXR1cm4gcmVhbEZpbGU7XG4gICAgaWYgKGZzLmxzdGF0U3luYyhmaWxlKS5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICBpZiAoIXByZXNlcnZlU3ltbGlua3MpXG4gICAgICAgIGxvZy53YXJuKGBSZWFkaW5nIGEgc3ltbGluazogJHtmaWxlfSwgYnV0IFwicHJlc2VydmVTeW1saW5rc1wiIGlzIGZhbHNlLmApO1xuICAgICAgY29uc3QgcmYgPSBmcy5yZWFscGF0aFN5bmMoZmlsZSk7XG4gICAgICB0aGlzLnJlYWxGaWxlQ2FjaGUuc2V0KGZpbGUsIHJmKTtcbiAgICAgIHJldHVybiByZjtcbiAgICB9IGVsc2VcbiAgICAgIHJldHVybiBmaWxlO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVUc1JlYWRIb29rKG5nUGFyYW06IEFuZ3VsYXJDbGlQYXJhbSk6IEhvb2tSZWFkRnVuYyB7XG4gICAgLy8gbGV0IGRyY3BJbmNsdWRlQnVmOiBBcnJheUJ1ZmZlcjtcblxuICAgIGNvbnN0IHRzY29uZmlnRmlsZSA9IG5nUGFyYW0uYnJvd3Nlck9wdGlvbnMudHNDb25maWc7XG5cbiAgICAvLyBjb25zdCBobXJFbmFibGVkID0gXy5nZXQobmdQYXJhbSwgJ2J1aWxkZXJDb25maWcub3B0aW9ucy5obXInKSB8fCBhcGkuYXJndi5obXI7XG4gICAgY29uc3QgcHJlc2VydmVTeW1saW5rcyA9IG5nUGFyYW0uYnJvd3Nlck9wdGlvbnMucHJlc2VydmVTeW1saW5rcyAhPSBudWxsID8gbmdQYXJhbS5icm93c2VyT3B0aW9ucy5wcmVzZXJ2ZVN5bWxpbmtzIDpcbiAgICAgIGZhbHNlO1xuICAgIGNvbnN0IHRzQ29tcGlsZXJPcHRpb25zID0gcmVhZFRzQ29uZmlnKHRzY29uZmlnRmlsZSk7XG4gICAgLy8gbGV0IHBvbHlmaWxsc0ZpbGU6IHN0cmluZyA9ICcnO1xuICAgIC8vIGlmIChuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLnBvbHlmaWxscylcbiAgICAvLyBcdHBvbHlmaWxsc0ZpbGUgPSBuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLnBvbHlmaWxscy5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cbiAgICAvLyBjb25zdCBhcHBNb2R1bGVGaWxlID0gZmluZEFwcE1vZHVsZUZpbGVGcm9tTWFpbihyZXNvbHZlKG5nUGFyYW0uYnJvd3Nlck9wdGlvbnMubWFpbikpO1xuICAgIC8vIGxvZy5pbmZvKCdhcHAgbW9kdWxlIGZpbGU6ICcsIGFwcE1vZHVsZUZpbGUpO1xuXG4gICAgLy8gY29uc3QgaXNBb3QgPSBuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLmFvdDtcblxuICAgIHJldHVybiAoZmlsZTogc3RyaW5nLCBidWY6IEFycmF5QnVmZmVyKTogT2JzZXJ2YWJsZTxBcnJheUJ1ZmZlcj4gPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKGZpbGUuZW5kc1dpdGgoJy5jb21wb25lbnQuaHRtbCcpKSB7XG4gICAgICAgICAgY29uc3QgY2FjaGVkID0gdGhpcy50c0NhY2hlLmdldCh0aGlzLnJlYWxGaWxlKGZpbGUsIHByZXNlcnZlU3ltbGlua3MpKTtcbiAgICAgICAgICBpZiAoY2FjaGVkICE9IG51bGwpXG4gICAgICAgICAgICByZXR1cm4gb2YoY2FjaGVkKTtcbiAgICAgICAgICByZXR1cm4gcmVwbGFjZUh0bWwoZmlsZSwgQnVmZmVyLmZyb20oYnVmKS50b1N0cmluZygpKVxuICAgICAgICAgICAgLnBpcGUobWFwKG91dHB1dCA9PiBzdHJpbmcyYnVmZmVyKG91dHB1dCkpKTtcblxuICAgICAgICB9IGVsc2UgaWYgKCFmaWxlLmVuZHNXaXRoKCcudHMnKSB8fCBmaWxlLmVuZHNXaXRoKCcuZC50cycpKSB7XG4gICAgICAgICAgcmV0dXJuIG9mKGJ1Zik7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjYWNoZWQgPSB0aGlzLnRzQ2FjaGUuZ2V0KHRoaXMucmVhbEZpbGUoZmlsZSwgcHJlc2VydmVTeW1saW5rcykpO1xuICAgICAgICBpZiAoY2FjaGVkICE9IG51bGwpXG4gICAgICAgICAgcmV0dXJuIG9mKGNhY2hlZCk7XG4gICAgICAgIC8vIGxldCBub3JtYWxGaWxlID0gcmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgZmlsZSk7XG4gICAgICAgIC8vIGlmIChTRVAgPT09ICdcXFxcJylcbiAgICAgICAgLy8gXHRub3JtYWxGaWxlID0gbm9ybWFsRmlsZS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIC8vIGlmIChobXJFbmFibGVkICYmIHBvbHlmaWxsc0ZpbGUgJiYgbm9ybWFsRmlsZSA9PT0gcG9seWZpbGxzRmlsZSkge1xuICAgICAgICAvLyBcdGNvbnN0IGhtckNsaWVudCA9ICdcXG5pbXBvcnQgXFwnd2VicGFjay1ob3QtbWlkZGxld2FyZS9jbGllbnRcXCc7JztcbiAgICAgICAgLy8gXHRjb25zdCBjb250ZW50ID0gQnVmZmVyLmZyb20oYnVmKS50b1N0cmluZygpICsgaG1yQ2xpZW50O1xuICAgICAgICAvLyBcdGxvZy5pbmZvKGBBcHBlbmQgdG8gJHtub3JtYWxGaWxlfTogXFxuaW1wb3J0IFxcJ3dlYnBhY2staG90LW1pZGRsZXdhcmUvY2xpZW50XFwnO2ApO1xuICAgICAgICAvLyBcdGNvbnN0IGJmID0gc3RyaW5nMmJ1ZmZlcihjb250ZW50KTtcbiAgICAgICAgLy8gXHR0aGlzLnRzQ2FjaGUuc2V0KHRoaXMucmVhbEZpbGUoZmlsZSwgcHJlc2VydmVTeW1saW5rcyksIGJmKTtcbiAgICAgICAgLy8gXHRyZXR1cm4gb2YoYmYpO1xuICAgICAgICAvLyB9IGVsc2UgaWYgKG5vcm1hbEZpbGUuZW5kc1dpdGgoJy9kcmNwLWluY2x1ZGUudHMnKSkge1xuICAgICAgICAvLyBcdGlmIChkcmNwSW5jbHVkZUJ1ZilcbiAgICAgICAgLy8gXHRcdHJldHVybiBvZihkcmNwSW5jbHVkZUJ1Zik7XG4gICAgICAgIC8vIFx0bGV0IGNvbnRlbnQgPSBCdWZmZXIuZnJvbShidWYpLnRvU3RyaW5nKCk7XG4gICAgICAgIC8vIGNvbnN0IGxlZ29Db25maWcgPSBicm93c2VyTGVnb0NvbmZpZygpO1xuICAgICAgICAvLyBcdGxldCBobXJCb290OiBzdHJpbmc7XG4gICAgICAgIC8vIFx0aWYgKGhtckVuYWJsZWQpIHtcbiAgICAgICAgLy8gXHRcdGNvbnRlbnQgPSAnaW1wb3J0IGhtckJvb3RzdHJhcCBmcm9tIFxcJy4vaG1yXFwnO1xcbicgKyBjb250ZW50O1xuICAgICAgICAvLyBcdFx0aG1yQm9vdCA9ICdobXJCb290c3RyYXAobW9kdWxlLCBib290c3RyYXApJztcbiAgICAgICAgLy8gXHR9XG4gICAgICAgIC8vIFx0aWYgKCFuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLmFvdCkge1xuICAgICAgICAvLyBcdFx0Y29udGVudCA9ICdpbXBvcnQgXFwnY29yZS1qcy9lczcvcmVmbGVjdFxcJztcXG4nICsgY29udGVudDtcbiAgICAgICAgLy8gXHR9XG4gICAgICAgIC8vIFx0aWYgKGhtckJvb3QpXG4gICAgICAgIC8vIFx0XHRjb250ZW50ID0gY29udGVudC5yZXBsYWNlKC9cXC9cXCogcmVwbGFjZSBcXCpcXC9ib290c3RyYXBcXChcXCkvZywgaG1yQm9vdCk7XG4gICAgICAgIC8vIFx0aWYgKG5nUGFyYW0uc3NyKSB7XG4gICAgICAgIC8vIFx0XHRjb250ZW50ICs9ICdcXG5jb25zb2xlLmxvZyhcInNldCBnbG9iYWwuTEVHT19DT05GSUdcIik7JztcbiAgICAgICAgLy8gXHRcdGNvbnRlbnQgKz0gJ1xcbk9iamVjdC5hc3NpZ24oZ2xvYmFsLCB7XFxcbiAgICAgICAgLy8gXHRcdFx0X19kcmNwRW50cnlQYWdlOiBudWxsLCBcXFxuICAgICAgICAvLyBcdFx0XHRfX2RyY3BFbnRyeVBhY2thZ2U6IG51bGxcXFxuICAgICAgICAvLyBcdFx0fSk7XFxuJztcbiAgICAgICAgLy8gXHRcdGNvbnRlbnQgKz0gJyhnbG9iYWwgYXMgYW55KSc7XG4gICAgICAgIC8vIFx0fSBlbHNlIHtcbiAgICAgICAgLy8gXHRcdGNvbnRlbnQgKz0gJ1xcbk9iamVjdC5hc3NpZ24od2luZG93LCB7XFxcbiAgICAgICAgLy8gXHRcdFx0X19kcmNwRW50cnlQYWdlOiBudWxsLCBcXFxuICAgICAgICAvLyBcdFx0XHRfX2RyY3BFbnRyeVBhY2thZ2U6IG51bGxcXFxuICAgICAgICAvLyBcdFx0fSk7XFxuJztcbiAgICAgICAgLy8gXHRcdGNvbnRlbnQgKz0gJ1xcbih3aW5kb3cgYXMgYW55KSc7XG4gICAgICAgIC8vIFx0fVxuICAgICAgICAvLyBcdGNvbnRlbnQgKz0gYC5MRUdPX0NPTkZJRyA9ICR7SlNPTi5zdHJpbmdpZnkobGVnb0NvbmZpZywgbnVsbCwgJyAgJyl9O1xcbmA7XG4gICAgICAgIC8vIFx0ZHJjcEluY2x1ZGVCdWYgPSBzdHJpbmcyYnVmZmVyKGNvbnRlbnQpO1xuICAgICAgICAvLyBcdGxvZy5pbmZvKGNoYWxrLmN5YW4oZmlsZSkgKyAnOlxcbicgKyBjb250ZW50KTtcbiAgICAgICAgLy8gXHR0aGlzLnRzQ2FjaGUuc2V0KHRoaXMucmVhbEZpbGUoZmlsZSwgcHJlc2VydmVTeW1saW5rcyksIGRyY3BJbmNsdWRlQnVmKTtcbiAgICAgICAgLy8gXHRyZXR1cm4gb2YoZHJjcEluY2x1ZGVCdWYpO1xuICAgICAgICAvLyB9XG4gICAgICAgIGNvbnN0IGNvbXBQa2cgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoZmlsZSk7XG4gICAgICAgIGxldCBjb250ZW50ID0gQnVmZmVyLmZyb20oYnVmKS50b1N0cmluZygpO1xuICAgICAgICBsZXQgbmVlZExvZ0ZpbGUgPSBmYWxzZTtcbiAgICAgICAgLy8gcGF0Y2ggYXBwLm1vZHVsZS50c1xuICAgICAgICAvLyBpZiAoYXBwTW9kdWxlRmlsZSA9PT0gZmlsZSkge1xuICAgICAgICAvLyBcdGxvZy5pbmZvKCdwYXRjaCcsIGZpbGUpO1xuICAgICAgICAvLyBcdGNvbnN0IGFwcE1vZHVsZVBhY2thZ2UgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoYXBwTW9kdWxlRmlsZSk7XG4gICAgICAgIC8vIFx0Y29uc3QgcmVtb3ZhYmxlcyA9IHJlbW92YWJsZU5nTW9kdWxlcyhhcHBNb2R1bGVQYWNrYWdlLCBkaXJuYW1lKGFwcE1vZHVsZUZpbGUpKTtcbiAgICAgICAgLy8gXHRjb25zdCBuZ01vZHVsZXM6IHN0cmluZ1tdID0gZ2V0Um91dGVyTW9kdWxlcyhhcHBNb2R1bGVQYWNrYWdlLCBkaXJuYW1lKGFwcE1vZHVsZUZpbGUpKSB8fCByZW1vdmFibGVzO1xuICAgICAgICAvLyBcdC8vIG5nTW9kdWxlcy5wdXNoKGFwaS5wYWNrYWdlTmFtZSArICcvc3JjL2FwcCNEZXZlbG9wZXJNb2R1bGUnKTtcbiAgICAgICAgLy8gXHRsb2cuaW5mbygnSW5zZXJ0IG9wdGlvbmFsIE5nTW9kdWxlcyB0byBBcHBNb2R1bGU6XFxuICAnICsgbmdNb2R1bGVzLmpvaW4oJ1xcbiAgJykpO1xuICAgICAgICAvLyBcdGNvbnRlbnQgPSBuZXcgQXBwTW9kdWxlUGFyc2VyKClcbiAgICAgICAgLy8gXHRcdC5wYXRjaEZpbGUoZmlsZSwgY29udGVudCwgcmVtb3ZhYmxlcywgbmdNb2R1bGVzKTtcbiAgICAgICAgLy8gXHRuZWVkTG9nRmlsZSA9IHRydWU7XG4gICAgICAgIC8vIH1cbiAgICAgICAgY29uc3QgdHNTZWxlY3RvciA9IG5ldyBTZWxlY3Rvcihjb250ZW50LCBmaWxlKTtcbiAgICAgICAgY29uc3QgaGFzSW1wb3J0QXBpID0gdHNTZWxlY3Rvci5maW5kQWxsKCc6SW1wb3J0RGVjbGFyYXRpb24+Lm1vZHVsZVNwZWNpZmllcjpTdHJpbmdMaXRlcmFsJykuc29tZShhc3QgPT4ge1xuICAgICAgICAgIHJldHVybiAoYXN0IGFzIHRzLlN0cmluZ0xpdGVyYWwpLnRleHQgPT09ICdfX2FwaSc7XG4gICAgICAgIH0pO1xuICAgICAgICBsZXQgY2hhbmdlZCA9IGFwaS5icm93c2VySW5qZWN0b3IuaW5qZWN0VG9GaWxlKGZpbGUsIGNvbnRlbnQpO1xuXG4gICAgICAgIGNoYW5nZWQgPSBuZXcgQXBpQW90Q29tcGlsZXIoZmlsZSwgY2hhbmdlZCkucGFyc2Uoc291cmNlID0+IHRyYW5zcGlsZVNpbmdsZVRzKHNvdXJjZSwgdHNDb21waWxlck9wdGlvbnMpKTtcbiAgICAgICAgaWYgKGhhc0ltcG9ydEFwaSAmJiBjb21wUGtnKVxuICAgICAgICAgIGNoYW5nZWQgPSBhcGlUbXBsVHMoe3BhY2thZ2VOYW1lOiBjb21wUGtnLmxvbmdOYW1lfSkgKyAnXFxuJyArIGNoYW5nZWQ7XG4gICAgICAgIC8vIGlmIChjaGFuZ2VkICE9PSBjb250ZW50ICYmIG5nUGFyYW0uc3NyKSB7XG4gICAgICAgIC8vIFx0Y2hhbmdlZCA9ICdpbXBvcnQgXCJAZHItY29yZS9uZy1hcHAtYnVpbGRlci9zcmMvZHJjcC1pbmNsdWRlXCI7XFxuJyArIGNoYW5nZWQ7XG4gICAgICAgIC8vIH1cbiAgICAgICAgaWYgKG5lZWRMb2dGaWxlKVxuICAgICAgICAgIGxvZy5pbmZvKGNoYWxrLmN5YW4oZmlsZSkgKyAnOlxcbicgKyBjaGFuZ2VkKTtcbiAgICAgICAgY29uc3QgYmYgPSBzdHJpbmcyYnVmZmVyKGNoYW5nZWQpO1xuICAgICAgICB0aGlzLnRzQ2FjaGUuc2V0KHRoaXMucmVhbEZpbGUoZmlsZSwgcHJlc2VydmVTeW1saW5rcyksIGJmKTtcbiAgICAgICAgcmV0dXJuIG9mKGJmKTtcbiAgICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICAgIGxvZy5lcnJvcihleCk7XG4gICAgICAgIHJldHVybiB0aHJvd0Vycm9yKGV4KTtcbiAgICAgIH1cbiAgICB9O1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdHJpbmcyYnVmZmVyKGlucHV0OiBzdHJpbmcpOiBBcnJheUJ1ZmZlciB7XG4gIGNvbnN0IG5vZGVCdWYgPSBCdWZmZXIuZnJvbShpbnB1dCk7XG4gIGNvbnN0IGxlbiA9IG5vZGVCdWYuYnl0ZUxlbmd0aDtcbiAgY29uc3QgbmV3QnVmID0gbmV3IEFycmF5QnVmZmVyKGxlbik7XG4gIGNvbnN0IGRhdGFWaWV3ID0gbmV3IERhdGFWaWV3KG5ld0J1Zik7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcbiAgICBkYXRhVmlldy5zZXRVaW50OChpLCBub2RlQnVmLnJlYWRVSW50OChpKSk7XG4gIH1cbiAgcmV0dXJuIG5ld0J1Zjtcbn1cblxuZnVuY3Rpb24gYnJvd3NlckxlZ29Db25maWcoKSB7XG4gIHZhciBicm93c2VyUHJvcFNldDogYW55ID0ge307XG4gIHZhciBsZWdvQ29uZmlnOiBhbnkgPSB7fTsgLy8gbGVnb0NvbmZpZyBpcyBnbG9iYWwgY29uZmlndXJhdGlvbiBwcm9wZXJ0aWVzIHdoaWNoIGFwcGx5IHRvIGFsbCBlbnRyaWVzIGFuZCBtb2R1bGVzXG4gIF8uZWFjaChbXG4gICAgJ3N0YXRpY0Fzc2V0c1VSTCcsICdzZXJ2ZXJVUkwnLCAncGFja2FnZUNvbnRleHRQYXRoTWFwcGluZycsXG4gICAgJ2xvY2FsZXMnLCAnZGV2TW9kZScsICdvdXRwdXRQYXRoTWFwJ1xuICBdLCBwcm9wID0+IGJyb3dzZXJQcm9wU2V0W3Byb3BdID0gMSk7XG4gIF8uZWFjaChhcGkuY29uZmlnKCkuYnJvd3NlclNpZGVDb25maWdQcm9wLCBwcm9wID0+IGJyb3dzZXJQcm9wU2V0W3Byb3BdID0gdHJ1ZSk7XG4gIF8uZm9yT3duKGJyb3dzZXJQcm9wU2V0LCAobm90aGluZywgcHJvcFBhdGgpID0+IF8uc2V0KGxlZ29Db25maWcsIHByb3BQYXRoLCBfLmdldChhcGkuY29uZmlnKCksIHByb3BQYXRoKSkpO1xuICB2YXIgY29tcHJlc3NlZEluZm8gPSBjb21wcmVzc091dHB1dFBhdGhNYXAobGVnb0NvbmZpZy5vdXRwdXRQYXRoTWFwKTtcbiAgbGVnb0NvbmZpZy5vdXRwdXRQYXRoTWFwID0gY29tcHJlc3NlZEluZm8uZGlmZk1hcDtcbiAgbGVnb0NvbmZpZy5fb3V0cHV0QXNOYW1lcyA9IGNvbXByZXNzZWRJbmZvLnNhbWVzO1xuICBsZWdvQ29uZmlnLmJ1aWxkTG9jYWxlID0gYXBpLmdldEJ1aWxkTG9jYWxlKCk7XG4gIGxvZy5kZWJ1ZygnRGVmaW5lUGx1Z2luIExFR09fQ09ORklHOiAnLCBsZWdvQ29uZmlnKTtcbiAgcmV0dXJuIGxlZ29Db25maWc7XG59XG5cbmZ1bmN0aW9uIGNvbXByZXNzT3V0cHV0UGF0aE1hcChwYXRoTWFwOiBhbnkpIHtcbiAgdmFyIG5ld01hcDogYW55ID0ge307XG4gIHZhciBzYW1lQXNOYW1lczogc3RyaW5nW10gPSBbXTtcbiAgXy5lYWNoKHBhdGhNYXAsICh2YWx1ZSwga2V5KSA9PiB7XG4gICAgdmFyIHBhcnNlZCA9IGFwaS5wYWNrYWdlVXRpbHMucGFyc2VOYW1lKGtleSk7XG4gICAgaWYgKHBhcnNlZC5uYW1lICE9PSB2YWx1ZSkge1xuICAgICAgbmV3TWFwW2tleV0gPSB2YWx1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgc2FtZUFzTmFtZXMucHVzaChrZXkpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiB7XG4gICAgc2FtZXM6IHNhbWVBc05hbWVzLFxuICAgIGRpZmZNYXA6IG5ld01hcFxuICB9O1xufVxuXG4vLyBmdW5jdGlvbiBnZXRSb3V0ZXJNb2R1bGVzKGFwcE1vZHVsZVBhY2thZ2U6IFBhY2thZ2VCcm93c2VySW5zdGFuY2UsIGFwcE1vZHVsZURpcjogc3RyaW5nKSB7XG4vLyBcdGNvbnN0IG5nTW9kdWxlczogc3RyaW5nW10gPSBhcGkuY29uZmlnLmdldChbYXBpLnBhY2thZ2VOYW1lLCAnbmdNb2R1bGUnXSkgfHwgW107XG4vLyBcdGNvbnN0IG5nUGFja2FnZU1vZHVsZXMgPSBuZXcgU2V0KHBhY2thZ2VOYW1lczJOZ01vZHVsZShhcHBNb2R1bGVQYWNrYWdlLCBhcHBNb2R1bGVEaXIsXG4vLyBcdFx0YXBpLmNvbmZpZy5nZXQoW2FwaS5wYWNrYWdlTmFtZSwgJ25nUGFja2FnZSddKSB8fCBbXSkpO1xuLy8gXHRuZ01vZHVsZXMuZm9yRWFjaChtID0+IG5nUGFja2FnZU1vZHVsZXMuYWRkKG0pKTtcbi8vIFx0cmV0dXJuIEFycmF5LmZyb20obmdQYWNrYWdlTW9kdWxlcyk7XG4vLyB9XG5cbi8vIGZ1bmN0aW9uIHBhY2thZ2VOYW1lczJOZ01vZHVsZShhcHBNb2R1bGVQazogUGFja2FnZUJyb3dzZXJJbnN0YW5jZSwgYXBwTW9kdWxlRGlyOiBzdHJpbmcsIGluY2x1ZGVQYWNrYWdlcz86IHN0cmluZ1tdKTogc3RyaW5nW10ge1xuLy8gXHRjb25zdCByZXM6IHN0cmluZ1tdID0gW107XG4vLyBcdGlmIChpbmNsdWRlUGFja2FnZXMpIHtcbi8vIFx0XHRmb3IgKGNvbnN0IG5hbWUgb2YgaW5jbHVkZVBhY2thZ2VzKSB7XG4vLyBcdFx0XHRsZXQgcGsgPSBhcGkucGFja2FnZUluZm8ubW9kdWxlTWFwW25hbWVdO1xuLy8gXHRcdFx0aWYgKHBrID09IG51bGwpIHtcbi8vIFx0XHRcdFx0Y29uc3Qgc2NvcGUgPSAoYXBpLmNvbmZpZy5nZXQoJ3BhY2thZ2VTY29wZXMnKSBhcyBzdHJpbmdbXSkuZmluZChzY29wZSA9PiB7XG4vLyBcdFx0XHRcdFx0cmV0dXJuIGFwaS5wYWNrYWdlSW5mby5tb2R1bGVNYXBbYEAke3Njb3BlfS8ke25hbWV9YF0gIT0gbnVsbDtcbi8vIFx0XHRcdFx0fSk7XG4vLyBcdFx0XHRcdGlmIChzY29wZSA9PSBudWxsKSB7XG4vLyBcdFx0XHRcdFx0bG9nLmVycm9yKCdQYWNrYWdlIG5hbWVkOiBcIiVzXCIgaXMgbm90IGZvdW5kIHdpdGggcG9zc2libGUgc2NvcGUgbmFtZSBpbiBcIiVzXCInLCBuYW1lLFxuLy8gXHRcdFx0XHRcdFx0KGFwaS5jb25maWcuZ2V0KCdwYWNrYWdlU2NvcGVzJykgYXMgc3RyaW5nW10pLmpvaW4oJywgJykpO1xuLy8gXHRcdFx0XHRcdGJyZWFrO1xuLy8gXHRcdFx0XHR9XG4vLyBcdFx0XHRcdHBrID0gYXBpLnBhY2thZ2VJbmZvLm1vZHVsZU1hcFtgQCR7c2NvcGV9LyR7bmFtZX1gXTtcbi8vIFx0XHRcdH1cbi8vIFx0XHRcdGVhY2hQYWNrYWdlKHBrKTtcbi8vIFx0XHR9XG4vLyBcdH0gZWxzZSB7XG4vLyBcdFx0Zm9yIChjb25zdCBwayBvZiBhcGkucGFja2FnZUluZm8uYWxsTW9kdWxlcykge1xuLy8gXHRcdFx0ZWFjaFBhY2thZ2UocGspO1xuLy8gXHRcdH1cbi8vIFx0fVxuXG4vLyBcdGZ1bmN0aW9uIGVhY2hQYWNrYWdlKHBrOiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlKSB7XG4vLyBcdFx0aWYgKHBrLmRyID09IG51bGwgfHwgcGsuZHIubmdNb2R1bGUgPT0gbnVsbClcbi8vIFx0XHRcdHJldHVybjtcblxuLy8gXHRcdGxldCBtb2R1bGVzID0gcGsuZHIubmdNb2R1bGU7XG4vLyBcdFx0aWYgKCFBcnJheS5pc0FycmF5KG1vZHVsZXMpKVxuLy8gXHRcdFx0bW9kdWxlcyA9IFttb2R1bGVzXTtcblxuLy8gXHRcdGZvciAobGV0IG5hbWUgb2YgbW9kdWxlcykge1xuLy8gXHRcdFx0bmFtZSA9IF8udHJpbVN0YXJ0KG5hbWUsICcuLycpO1xuLy8gXHRcdFx0aWYgKHBrICE9PSBhcHBNb2R1bGVQaykge1xuLy8gXHRcdFx0XHRpZiAobmFtZS5pbmRleE9mKCcjJykgPCAwKVxuLy8gXHRcdFx0XHRcdHJlcy5wdXNoKHBrLmxvbmdOYW1lICsgJyMnICsgbmFtZSk7XG4vLyBcdFx0XHRcdGVsc2Vcbi8vIFx0XHRcdFx0XHRyZXMucHVzaChway5sb25nTmFtZSArICcvJyArIG5hbWUpO1xuLy8gXHRcdFx0fSBlbHNlIHtcbi8vIFx0XHRcdFx0Ly8gcGFja2FnZSBpcyBzYW1lIGFzIHRoZSBvbmUgYXBwLm1vZHVsZSBiZWxvbmdzIHRvLCB3ZSB1c2UgcmVsYXRpdmUgcGF0aCBpbnN0ZWFkIG9mIHBhY2thZ2UgbmFtZVxuLy8gXHRcdFx0XHRpZiAobmFtZS5pbmRleE9mKCcjJykgPCAwKVxuLy8gXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihgSW4gJHtway5yZWFsUGFja2FnZVBhdGh9L3BhY2thZ2UuanNvbiwgdmFsdWUgb2YgXCJkci5uZ01vZHVsZVwiIGFycmF5YCArXG4vLyBcdFx0XHRcdFx0XHRgbXVzdCBiZSBpbiBmb3JtIG9mICc8cGF0aD4jPGV4cG9ydCBOZ01vZHVsZSBuYW1lPicsIGJ1dCBoZXJlIGl0IGlzICcke25hbWV9J2ApO1xuLy8gXHRcdFx0XHRjb25zdCBuYW1lUGFydHMgPSBuYW1lLnNwbGl0KCcjJyk7XG4vLyBcdFx0XHRcdG5hbWUgPSByZWxhdGl2ZShhcHBNb2R1bGVEaXIsIG5hbWVQYXJ0c1swXSkgKyAnIycgKyBuYW1lUGFydHNbMV07XG4vLyBcdFx0XHRcdG5hbWUgPSBuYW1lLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbi8vIFx0XHRcdFx0aWYgKCFuYW1lLnN0YXJ0c1dpdGgoJy4nKSlcbi8vIFx0XHRcdFx0XHRuYW1lID0gJy4vJyArIG5hbWU7XG4vLyBcdFx0XHRcdHJlcy5wdXNoKG5hbWUpO1xuLy8gXHRcdFx0fVxuLy8gXHRcdH1cbi8vIFx0fVxuLy8gXHRyZXR1cm4gcmVzO1xuLy8gfVxuXG4vKipcbiAqIFxuICogQHBhcmFtIGFwcE1vZHVsZVBrTmFtZSBwYWNrYWdlIG5hbWUgb2YgdGhlIG9uZSBjb250YWlucyBhcHAubW9kdWxlLnRzXG4gKiBAcGFyYW0gYXBwTW9kdWxlRGlyIGFwcC5tb2R1bGUudHMncyBkaXJlY3RvcnksIHVzZWQgdG8gY2FsY3VsYXRlIHJlbGF0aXZlIHBhdGhcbiAqL1xuLy8gZnVuY3Rpb24gcmVtb3ZhYmxlTmdNb2R1bGVzKGFwcE1vZHVsZVBrOiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlLCBhcHBNb2R1bGVEaXI6IHN0cmluZyk6IHN0cmluZ1tdIHtcbi8vIFx0cmV0dXJuIHBhY2thZ2VOYW1lczJOZ01vZHVsZShhcHBNb2R1bGVQaywgYXBwTW9kdWxlRGlyKTtcbi8vIH1cbiJdfQ==
