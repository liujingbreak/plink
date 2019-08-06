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
const upgrade_viewchild_ng8_1 = require("./utils/upgrade-viewchild-ng8");
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
        const ng8Compliant = __api_1.default.config.get(__api_1.default.packageName + '.ng8Compliant', true);
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
                if (ng8Compliant)
                    changed = upgrade_viewchild_ng8_1.transform(changed, file);
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy10cy1yZXBsYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG9DQUFvQztBQUNwQyxzRUFBdUY7QUFDdkYsK0NBQXlCO0FBQ3pCLGtEQUE0QjtBQUM1Qix1REFBaUM7QUFDakMsK0JBQWtEO0FBQ2xELDhDQUFtQztBQUVuQywwREFBbUM7QUFDbkMsbURBQThDO0FBRzlDLGdGQUE0QztBQUM1QyxrRkFBbUQ7QUFDbkQseUVBQThFO0FBQzlFLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUUvQixNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUU5QyxNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDOzt1QkFFTixDQUFDLENBQUM7QUFDekIsOEVBQThFO0FBRTdFLE1BQU0sQ0FBQyxjQUFjLENBQUMsZUFBRyxDQUFhLENBQUMsZ0JBQWdCLEdBQUcsaUJBQWlCLENBQUM7QUFFN0UsTUFBcUIsWUFBWTtJQUsvQixZQUFZLE9BQXdCO1FBSDVCLGtCQUFhLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFDMUMsWUFBTyxHQUFHLElBQUksR0FBRyxFQUF1QixDQUFDO1FBRy9DLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2pELENBQUM7SUFFRCxLQUFLO1FBQ0gsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN2QixDQUFDO0lBRU8sUUFBUSxDQUFDLElBQVksRUFBRSxnQkFBeUI7UUFDdEQsZ0NBQWdDO1FBQ2hDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzlDLElBQUksUUFBUSxLQUFLLFNBQVM7WUFDeEIs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QywrQ0FBK0M7QUFDL0MsdUJBQXVCO0FBQ3ZCLGtGQUFrRjtBQUNsRixzRUFBc0U7QUFDdEUsVUFBVTtBQUNWLDJCQUEyQjtBQUMzQiw0RkFBNEY7QUFDNUYsbUVBQW1FO0FBQ25FLGNBQWM7QUFDZCxRQUFRO0FBQ1IsMkRBQTJEO0FBQzNELE9BQU87QUFDUCxzQkFBc0I7QUFDdEIsTUFBTTtBQUNOLFlBQVk7QUFDWixtREFBbUQ7QUFDbkQsc0JBQXNCO0FBQ3RCLE1BQU07QUFDTixLQUFLO0FBRUwsc0RBQXNEO0FBQ3RELGlEQUFpRDtBQUNqRCxhQUFhO0FBRWIsa0NBQWtDO0FBQ2xDLGlDQUFpQztBQUNqQywwQkFBMEI7QUFFMUIsZ0NBQWdDO0FBQ2hDLHFDQUFxQztBQUNyQywrQkFBK0I7QUFDL0IsaUNBQWlDO0FBQ2pDLDJDQUEyQztBQUMzQyxXQUFXO0FBQ1gsMkNBQTJDO0FBQzNDLGNBQWM7QUFDZCx3R0FBd0c7QUFDeEcsaUNBQWlDO0FBQ2pDLCtGQUErRjtBQUMvRix5RkFBeUY7QUFDekYseUNBQXlDO0FBQ3pDLHdFQUF3RTtBQUN4RSx1Q0FBdUM7QUFDdkMsaUNBQWlDO0FBQ2pDLDJCQUEyQjtBQUMzQixzQkFBc0I7QUFDdEIsT0FBTztBQUNQLE1BQU07QUFDTixLQUFLO0FBQ0wsZUFBZTtBQUNmLElBQUk7QUFFSjs7OztHQUlHO0FBQ0gscUdBQXFHO0FBQ3JHLDREQUE0RDtBQUM1RCxJQUFJIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L25nLXRzLXJlcGxhY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBtYXgtbGluZS1sZW5ndGggKi9cbmltcG9ydCB7IHJlYWRUc0NvbmZpZywgdHJhbnNwaWxlU2luZ2xlVHMgfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvdHMtY29tcGlsZXInO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgeyBPYnNlcnZhYmxlLCBvZiwgdGhyb3dFcnJvciB9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHttYXB9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IGFwaSwge0RyY3BBcGl9IGZyb20gJ19fYXBpJztcbmltcG9ydCB7IHJlcGxhY2VIdG1sIH0gZnJvbSAnLi9uZy1hb3QtYXNzZXRzJztcbmltcG9ydCB7IEFuZ3VsYXJDbGlQYXJhbSB9IGZyb20gJy4vbmcvY29tbW9uJztcbmltcG9ydCB7IEhvb2tSZWFkRnVuYyB9IGZyb20gJy4vdXRpbHMvcmVhZC1ob29rLXZmc2hvc3QnO1xuaW1wb3J0IFNlbGVjdG9yIGZyb20gJy4vdXRpbHMvdHMtYXN0LXF1ZXJ5JztcbmltcG9ydCBBcGlBb3RDb21waWxlciBmcm9tICcuL3V0aWxzL3RzLWJlZm9yZS1hb3QnO1xuaW1wb3J0IHt0cmFuc2Zvcm0gYXMgdHJhbnNmb3JtVmlld0NoaWxkfSBmcm9tICcuL3V0aWxzL3VwZ3JhZGUtdmlld2NoaWxkLW5nOCc7XG5jb25zdCBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lKTtcblxuY29uc3QgYXBpVG1wbFRzID0gXy50ZW1wbGF0ZSgnaW1wb3J0IF9fRHJBcGkgZnJvbSBcXCdAZHItY29yZS9uZy1hcHAtYnVpbGRlci9zcmMvYXBwL2FwaVxcJztcXFxudmFyIF9fYXBpID0gX19EckFwaS5nZXRDYWNoZWRBcGkoXFwnPCU9cGFja2FnZU5hbWUlPlxcJykgfHwgbmV3IF9fRHJBcGkoXFwnPCU9cGFja2FnZU5hbWUlPlxcJyk7XFxcbl9fYXBpLmRlZmF1bHQgPSBfX2FwaTsnKTtcbi8vIGNvbnN0IGluY2x1ZGVUc0ZpbGUgPSBQYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4nLCAnc3JjJywgJ2RyY3AtaW5jbHVkZS50cycpO1xuXG4oT2JqZWN0LmdldFByb3RvdHlwZU9mKGFwaSkgYXMgRHJjcEFwaSkuYnJvd3NlckFwaUNvbmZpZyA9IGJyb3dzZXJMZWdvQ29uZmlnO1xuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUU1JlYWRIb29rZXIge1xuICBob29rRnVuYzogSG9va1JlYWRGdW5jO1xuICBwcml2YXRlIHJlYWxGaWxlQ2FjaGUgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuICBwcml2YXRlIHRzQ2FjaGUgPSBuZXcgTWFwPHN0cmluZywgQXJyYXlCdWZmZXI+KCk7XG5cbiAgY29uc3RydWN0b3IobmdQYXJhbTogQW5ndWxhckNsaVBhcmFtKSB7XG4gICAgdGhpcy5ob29rRnVuYyA9IHRoaXMuY3JlYXRlVHNSZWFkSG9vayhuZ1BhcmFtKTtcbiAgfVxuXG4gIGNsZWFyKCkge1xuICAgIHRoaXMudHNDYWNoZS5jbGVhcigpO1xuICB9XG5cbiAgcHJpdmF0ZSByZWFsRmlsZShmaWxlOiBzdHJpbmcsIHByZXNlcnZlU3ltbGlua3M6IGJvb2xlYW4pOiBzdHJpbmcge1xuICAgIC8vIGxvZy5pbmZvKGByZWFkRmlsZSAke2ZpbGV9YCk7XG4gICAgY29uc3QgcmVhbEZpbGUgPSB0aGlzLnJlYWxGaWxlQ2FjaGUuZ2V0KGZpbGUpO1xuICAgIGlmIChyZWFsRmlsZSAhPT0gdW5kZWZpbmVkKVxuICAgICAgcmV0dXJuIHJlYWxGaWxlO1xuICAgIGlmIChmcy5sc3RhdFN5bmMoZmlsZSkuaXNTeW1ib2xpY0xpbmsoKSkge1xuICAgICAgaWYgKCFwcmVzZXJ2ZVN5bWxpbmtzKVxuICAgICAgICBsb2cud2FybihgUmVhZGluZyBhIHN5bWxpbms6ICR7ZmlsZX0sIGJ1dCBcInByZXNlcnZlU3ltbGlua3NcIiBpcyBmYWxzZS5gKTtcbiAgICAgIGNvbnN0IHJmID0gZnMucmVhbHBhdGhTeW5jKGZpbGUpO1xuICAgICAgdGhpcy5yZWFsRmlsZUNhY2hlLnNldChmaWxlLCByZik7XG4gICAgICByZXR1cm4gcmY7XG4gICAgfSBlbHNlXG4gICAgICByZXR1cm4gZmlsZTtcbiAgfVxuXG4gIHByaXZhdGUgY3JlYXRlVHNSZWFkSG9vayhuZ1BhcmFtOiBBbmd1bGFyQ2xpUGFyYW0pOiBIb29rUmVhZEZ1bmMge1xuICAgIC8vIGxldCBkcmNwSW5jbHVkZUJ1ZjogQXJyYXlCdWZmZXI7XG5cbiAgICBjb25zdCB0c2NvbmZpZ0ZpbGUgPSBuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLnRzQ29uZmlnO1xuXG4gICAgLy8gY29uc3QgaG1yRW5hYmxlZCA9IF8uZ2V0KG5nUGFyYW0sICdidWlsZGVyQ29uZmlnLm9wdGlvbnMuaG1yJykgfHwgYXBpLmFyZ3YuaG1yO1xuICAgIGNvbnN0IHByZXNlcnZlU3ltbGlua3MgPSBuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLnByZXNlcnZlU3ltbGlua3MgIT0gbnVsbCA/IG5nUGFyYW0uYnJvd3Nlck9wdGlvbnMucHJlc2VydmVTeW1saW5rcyA6XG4gICAgICBmYWxzZTtcbiAgICBjb25zdCB0c0NvbXBpbGVyT3B0aW9ucyA9IHJlYWRUc0NvbmZpZyh0c2NvbmZpZ0ZpbGUpO1xuICAgIGNvbnN0IG5nOENvbXBsaWFudCA9IGFwaS5jb25maWcuZ2V0KGFwaS5wYWNrYWdlTmFtZSArICcubmc4Q29tcGxpYW50JywgdHJ1ZSk7XG4gICAgLy8gbGV0IHBvbHlmaWxsc0ZpbGU6IHN0cmluZyA9ICcnO1xuICAgIC8vIGlmIChuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLnBvbHlmaWxscylcbiAgICAvLyBcdHBvbHlmaWxsc0ZpbGUgPSBuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLnBvbHlmaWxscy5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cbiAgICAvLyBjb25zdCBhcHBNb2R1bGVGaWxlID0gZmluZEFwcE1vZHVsZUZpbGVGcm9tTWFpbihyZXNvbHZlKG5nUGFyYW0uYnJvd3Nlck9wdGlvbnMubWFpbikpO1xuICAgIC8vIGxvZy5pbmZvKCdhcHAgbW9kdWxlIGZpbGU6ICcsIGFwcE1vZHVsZUZpbGUpO1xuXG4gICAgLy8gY29uc3QgaXNBb3QgPSBuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLmFvdDtcblxuICAgIHJldHVybiAoZmlsZTogc3RyaW5nLCBidWY6IEFycmF5QnVmZmVyKTogT2JzZXJ2YWJsZTxBcnJheUJ1ZmZlcj4gPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKGZpbGUuZW5kc1dpdGgoJy5jb21wb25lbnQuaHRtbCcpKSB7XG4gICAgICAgICAgY29uc3QgY2FjaGVkID0gdGhpcy50c0NhY2hlLmdldCh0aGlzLnJlYWxGaWxlKGZpbGUsIHByZXNlcnZlU3ltbGlua3MpKTtcbiAgICAgICAgICBpZiAoY2FjaGVkICE9IG51bGwpXG4gICAgICAgICAgICByZXR1cm4gb2YoY2FjaGVkKTtcbiAgICAgICAgICByZXR1cm4gcmVwbGFjZUh0bWwoZmlsZSwgQnVmZmVyLmZyb20oYnVmKS50b1N0cmluZygpKVxuICAgICAgICAgICAgLnBpcGUobWFwKG91dHB1dCA9PiBzdHJpbmcyYnVmZmVyKG91dHB1dCkpKTtcblxuICAgICAgICB9IGVsc2UgaWYgKCFmaWxlLmVuZHNXaXRoKCcudHMnKSB8fCBmaWxlLmVuZHNXaXRoKCcuZC50cycpKSB7XG4gICAgICAgICAgcmV0dXJuIG9mKGJ1Zik7XG4gICAgICAgIH1cblxuICAgICAgICBjb25zdCBjYWNoZWQgPSB0aGlzLnRzQ2FjaGUuZ2V0KHRoaXMucmVhbEZpbGUoZmlsZSwgcHJlc2VydmVTeW1saW5rcykpO1xuICAgICAgICBpZiAoY2FjaGVkICE9IG51bGwpXG4gICAgICAgICAgcmV0dXJuIG9mKGNhY2hlZCk7XG4gICAgICAgIC8vIGxldCBub3JtYWxGaWxlID0gcmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgZmlsZSk7XG4gICAgICAgIC8vIGlmIChTRVAgPT09ICdcXFxcJylcbiAgICAgICAgLy8gXHRub3JtYWxGaWxlID0gbm9ybWFsRmlsZS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIC8vIGlmIChobXJFbmFibGVkICYmIHBvbHlmaWxsc0ZpbGUgJiYgbm9ybWFsRmlsZSA9PT0gcG9seWZpbGxzRmlsZSkge1xuICAgICAgICAvLyBcdGNvbnN0IGhtckNsaWVudCA9ICdcXG5pbXBvcnQgXFwnd2VicGFjay1ob3QtbWlkZGxld2FyZS9jbGllbnRcXCc7JztcbiAgICAgICAgLy8gXHRjb25zdCBjb250ZW50ID0gQnVmZmVyLmZyb20oYnVmKS50b1N0cmluZygpICsgaG1yQ2xpZW50O1xuICAgICAgICAvLyBcdGxvZy5pbmZvKGBBcHBlbmQgdG8gJHtub3JtYWxGaWxlfTogXFxuaW1wb3J0IFxcJ3dlYnBhY2staG90LW1pZGRsZXdhcmUvY2xpZW50XFwnO2ApO1xuICAgICAgICAvLyBcdGNvbnN0IGJmID0gc3RyaW5nMmJ1ZmZlcihjb250ZW50KTtcbiAgICAgICAgLy8gXHR0aGlzLnRzQ2FjaGUuc2V0KHRoaXMucmVhbEZpbGUoZmlsZSwgcHJlc2VydmVTeW1saW5rcyksIGJmKTtcbiAgICAgICAgLy8gXHRyZXR1cm4gb2YoYmYpO1xuICAgICAgICAvLyB9IGVsc2UgaWYgKG5vcm1hbEZpbGUuZW5kc1dpdGgoJy9kcmNwLWluY2x1ZGUudHMnKSkge1xuICAgICAgICAvLyBcdGlmIChkcmNwSW5jbHVkZUJ1ZilcbiAgICAgICAgLy8gXHRcdHJldHVybiBvZihkcmNwSW5jbHVkZUJ1Zik7XG4gICAgICAgIC8vIFx0bGV0IGNvbnRlbnQgPSBCdWZmZXIuZnJvbShidWYpLnRvU3RyaW5nKCk7XG4gICAgICAgIC8vIGNvbnN0IGxlZ29Db25maWcgPSBicm93c2VyTGVnb0NvbmZpZygpO1xuICAgICAgICAvLyBcdGxldCBobXJCb290OiBzdHJpbmc7XG4gICAgICAgIC8vIFx0aWYgKGhtckVuYWJsZWQpIHtcbiAgICAgICAgLy8gXHRcdGNvbnRlbnQgPSAnaW1wb3J0IGhtckJvb3RzdHJhcCBmcm9tIFxcJy4vaG1yXFwnO1xcbicgKyBjb250ZW50O1xuICAgICAgICAvLyBcdFx0aG1yQm9vdCA9ICdobXJCb290c3RyYXAobW9kdWxlLCBib290c3RyYXApJztcbiAgICAgICAgLy8gXHR9XG4gICAgICAgIC8vIFx0aWYgKCFuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLmFvdCkge1xuICAgICAgICAvLyBcdFx0Y29udGVudCA9ICdpbXBvcnQgXFwnY29yZS1qcy9lczcvcmVmbGVjdFxcJztcXG4nICsgY29udGVudDtcbiAgICAgICAgLy8gXHR9XG4gICAgICAgIC8vIFx0aWYgKGhtckJvb3QpXG4gICAgICAgIC8vIFx0XHRjb250ZW50ID0gY29udGVudC5yZXBsYWNlKC9cXC9cXCogcmVwbGFjZSBcXCpcXC9ib290c3RyYXBcXChcXCkvZywgaG1yQm9vdCk7XG4gICAgICAgIC8vIFx0aWYgKG5nUGFyYW0uc3NyKSB7XG4gICAgICAgIC8vIFx0XHRjb250ZW50ICs9ICdcXG5jb25zb2xlLmxvZyhcInNldCBnbG9iYWwuTEVHT19DT05GSUdcIik7JztcbiAgICAgICAgLy8gXHRcdGNvbnRlbnQgKz0gJ1xcbk9iamVjdC5hc3NpZ24oZ2xvYmFsLCB7XFxcbiAgICAgICAgLy8gXHRcdFx0X19kcmNwRW50cnlQYWdlOiBudWxsLCBcXFxuICAgICAgICAvLyBcdFx0XHRfX2RyY3BFbnRyeVBhY2thZ2U6IG51bGxcXFxuICAgICAgICAvLyBcdFx0fSk7XFxuJztcbiAgICAgICAgLy8gXHRcdGNvbnRlbnQgKz0gJyhnbG9iYWwgYXMgYW55KSc7XG4gICAgICAgIC8vIFx0fSBlbHNlIHtcbiAgICAgICAgLy8gXHRcdGNvbnRlbnQgKz0gJ1xcbk9iamVjdC5hc3NpZ24od2luZG93LCB7XFxcbiAgICAgICAgLy8gXHRcdFx0X19kcmNwRW50cnlQYWdlOiBudWxsLCBcXFxuICAgICAgICAvLyBcdFx0XHRfX2RyY3BFbnRyeVBhY2thZ2U6IG51bGxcXFxuICAgICAgICAvLyBcdFx0fSk7XFxuJztcbiAgICAgICAgLy8gXHRcdGNvbnRlbnQgKz0gJ1xcbih3aW5kb3cgYXMgYW55KSc7XG4gICAgICAgIC8vIFx0fVxuICAgICAgICAvLyBcdGNvbnRlbnQgKz0gYC5MRUdPX0NPTkZJRyA9ICR7SlNPTi5zdHJpbmdpZnkobGVnb0NvbmZpZywgbnVsbCwgJyAgJyl9O1xcbmA7XG4gICAgICAgIC8vIFx0ZHJjcEluY2x1ZGVCdWYgPSBzdHJpbmcyYnVmZmVyKGNvbnRlbnQpO1xuICAgICAgICAvLyBcdGxvZy5pbmZvKGNoYWxrLmN5YW4oZmlsZSkgKyAnOlxcbicgKyBjb250ZW50KTtcbiAgICAgICAgLy8gXHR0aGlzLnRzQ2FjaGUuc2V0KHRoaXMucmVhbEZpbGUoZmlsZSwgcHJlc2VydmVTeW1saW5rcyksIGRyY3BJbmNsdWRlQnVmKTtcbiAgICAgICAgLy8gXHRyZXR1cm4gb2YoZHJjcEluY2x1ZGVCdWYpO1xuICAgICAgICAvLyB9XG4gICAgICAgIGNvbnN0IGNvbXBQa2cgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoZmlsZSk7XG4gICAgICAgIGxldCBjb250ZW50ID0gQnVmZmVyLmZyb20oYnVmKS50b1N0cmluZygpO1xuICAgICAgICBsZXQgbmVlZExvZ0ZpbGUgPSBmYWxzZTtcbiAgICAgICAgLy8gcGF0Y2ggYXBwLm1vZHVsZS50c1xuICAgICAgICAvLyBpZiAoYXBwTW9kdWxlRmlsZSA9PT0gZmlsZSkge1xuICAgICAgICAvLyBcdGxvZy5pbmZvKCdwYXRjaCcsIGZpbGUpO1xuICAgICAgICAvLyBcdGNvbnN0IGFwcE1vZHVsZVBhY2thZ2UgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoYXBwTW9kdWxlRmlsZSk7XG4gICAgICAgIC8vIFx0Y29uc3QgcmVtb3ZhYmxlcyA9IHJlbW92YWJsZU5nTW9kdWxlcyhhcHBNb2R1bGVQYWNrYWdlLCBkaXJuYW1lKGFwcE1vZHVsZUZpbGUpKTtcbiAgICAgICAgLy8gXHRjb25zdCBuZ01vZHVsZXM6IHN0cmluZ1tdID0gZ2V0Um91dGVyTW9kdWxlcyhhcHBNb2R1bGVQYWNrYWdlLCBkaXJuYW1lKGFwcE1vZHVsZUZpbGUpKSB8fCByZW1vdmFibGVzO1xuICAgICAgICAvLyBcdC8vIG5nTW9kdWxlcy5wdXNoKGFwaS5wYWNrYWdlTmFtZSArICcvc3JjL2FwcCNEZXZlbG9wZXJNb2R1bGUnKTtcbiAgICAgICAgLy8gXHRsb2cuaW5mbygnSW5zZXJ0IG9wdGlvbmFsIE5nTW9kdWxlcyB0byBBcHBNb2R1bGU6XFxuICAnICsgbmdNb2R1bGVzLmpvaW4oJ1xcbiAgJykpO1xuICAgICAgICAvLyBcdGNvbnRlbnQgPSBuZXcgQXBwTW9kdWxlUGFyc2VyKClcbiAgICAgICAgLy8gXHRcdC5wYXRjaEZpbGUoZmlsZSwgY29udGVudCwgcmVtb3ZhYmxlcywgbmdNb2R1bGVzKTtcbiAgICAgICAgLy8gXHRuZWVkTG9nRmlsZSA9IHRydWU7XG4gICAgICAgIC8vIH1cbiAgICAgICAgY29uc3QgdHNTZWxlY3RvciA9IG5ldyBTZWxlY3Rvcihjb250ZW50LCBmaWxlKTtcbiAgICAgICAgY29uc3QgaGFzSW1wb3J0QXBpID0gdHNTZWxlY3Rvci5maW5kQWxsKCc6SW1wb3J0RGVjbGFyYXRpb24+Lm1vZHVsZVNwZWNpZmllcjpTdHJpbmdMaXRlcmFsJykuc29tZShhc3QgPT4ge1xuICAgICAgICAgIHJldHVybiAoYXN0IGFzIHRzLlN0cmluZ0xpdGVyYWwpLnRleHQgPT09ICdfX2FwaSc7XG4gICAgICAgIH0pO1xuICAgICAgICBsZXQgY2hhbmdlZCA9IGFwaS5icm93c2VySW5qZWN0b3IuaW5qZWN0VG9GaWxlKGZpbGUsIGNvbnRlbnQpO1xuXG4gICAgICAgIGlmIChuZzhDb21wbGlhbnQpXG4gICAgICAgICAgY2hhbmdlZCA9IHRyYW5zZm9ybVZpZXdDaGlsZChjaGFuZ2VkLCBmaWxlKTtcblxuICAgICAgICBjaGFuZ2VkID0gbmV3IEFwaUFvdENvbXBpbGVyKGZpbGUsIGNoYW5nZWQpLnBhcnNlKHNvdXJjZSA9PiB0cmFuc3BpbGVTaW5nbGVUcyhzb3VyY2UsIHRzQ29tcGlsZXJPcHRpb25zKSk7XG4gICAgICAgIGlmIChoYXNJbXBvcnRBcGkgJiYgY29tcFBrZylcbiAgICAgICAgICBjaGFuZ2VkID0gYXBpVG1wbFRzKHtwYWNrYWdlTmFtZTogY29tcFBrZy5sb25nTmFtZX0pICsgJ1xcbicgKyBjaGFuZ2VkO1xuICAgICAgICAvLyBpZiAoY2hhbmdlZCAhPT0gY29udGVudCAmJiBuZ1BhcmFtLnNzcikge1xuICAgICAgICAvLyBcdGNoYW5nZWQgPSAnaW1wb3J0IFwiQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvc3JjL2RyY3AtaW5jbHVkZVwiO1xcbicgKyBjaGFuZ2VkO1xuICAgICAgICAvLyB9XG4gICAgICAgIGlmIChuZWVkTG9nRmlsZSlcbiAgICAgICAgICBsb2cuaW5mbyhjaGFsay5jeWFuKGZpbGUpICsgJzpcXG4nICsgY2hhbmdlZCk7XG4gICAgICAgIGNvbnN0IGJmID0gc3RyaW5nMmJ1ZmZlcihjaGFuZ2VkKTtcbiAgICAgICAgdGhpcy50c0NhY2hlLnNldCh0aGlzLnJlYWxGaWxlKGZpbGUsIHByZXNlcnZlU3ltbGlua3MpLCBiZik7XG4gICAgICAgIHJldHVybiBvZihiZik7XG4gICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICBsb2cuZXJyb3IoZXgpO1xuICAgICAgICByZXR1cm4gdGhyb3dFcnJvcihleCk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RyaW5nMmJ1ZmZlcihpbnB1dDogc3RyaW5nKTogQXJyYXlCdWZmZXIge1xuICBjb25zdCBub2RlQnVmID0gQnVmZmVyLmZyb20oaW5wdXQpO1xuICBjb25zdCBsZW4gPSBub2RlQnVmLmJ5dGVMZW5ndGg7XG4gIGNvbnN0IG5ld0J1ZiA9IG5ldyBBcnJheUJ1ZmZlcihsZW4pO1xuICBjb25zdCBkYXRhVmlldyA9IG5ldyBEYXRhVmlldyhuZXdCdWYpO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgZGF0YVZpZXcuc2V0VWludDgoaSwgbm9kZUJ1Zi5yZWFkVUludDgoaSkpO1xuICB9XG4gIHJldHVybiBuZXdCdWY7XG59XG5cbmZ1bmN0aW9uIGJyb3dzZXJMZWdvQ29uZmlnKCkge1xuICB2YXIgYnJvd3NlclByb3BTZXQ6IGFueSA9IHt9O1xuICB2YXIgbGVnb0NvbmZpZzogYW55ID0ge307IC8vIGxlZ29Db25maWcgaXMgZ2xvYmFsIGNvbmZpZ3VyYXRpb24gcHJvcGVydGllcyB3aGljaCBhcHBseSB0byBhbGwgZW50cmllcyBhbmQgbW9kdWxlc1xuICBfLmVhY2goW1xuICAgICdzdGF0aWNBc3NldHNVUkwnLCAnc2VydmVyVVJMJywgJ3BhY2thZ2VDb250ZXh0UGF0aE1hcHBpbmcnLFxuICAgICdsb2NhbGVzJywgJ2Rldk1vZGUnLCAnb3V0cHV0UGF0aE1hcCdcbiAgXSwgcHJvcCA9PiBicm93c2VyUHJvcFNldFtwcm9wXSA9IDEpO1xuICBfLmVhY2goYXBpLmNvbmZpZygpLmJyb3dzZXJTaWRlQ29uZmlnUHJvcCwgcHJvcCA9PiBicm93c2VyUHJvcFNldFtwcm9wXSA9IHRydWUpO1xuICBfLmZvck93bihicm93c2VyUHJvcFNldCwgKG5vdGhpbmcsIHByb3BQYXRoKSA9PiBfLnNldChsZWdvQ29uZmlnLCBwcm9wUGF0aCwgXy5nZXQoYXBpLmNvbmZpZygpLCBwcm9wUGF0aCkpKTtcbiAgdmFyIGNvbXByZXNzZWRJbmZvID0gY29tcHJlc3NPdXRwdXRQYXRoTWFwKGxlZ29Db25maWcub3V0cHV0UGF0aE1hcCk7XG4gIGxlZ29Db25maWcub3V0cHV0UGF0aE1hcCA9IGNvbXByZXNzZWRJbmZvLmRpZmZNYXA7XG4gIGxlZ29Db25maWcuX291dHB1dEFzTmFtZXMgPSBjb21wcmVzc2VkSW5mby5zYW1lcztcbiAgbGVnb0NvbmZpZy5idWlsZExvY2FsZSA9IGFwaS5nZXRCdWlsZExvY2FsZSgpO1xuICBsb2cuZGVidWcoJ0RlZmluZVBsdWdpbiBMRUdPX0NPTkZJRzogJywgbGVnb0NvbmZpZyk7XG4gIHJldHVybiBsZWdvQ29uZmlnO1xufVxuXG5mdW5jdGlvbiBjb21wcmVzc091dHB1dFBhdGhNYXAocGF0aE1hcDogYW55KSB7XG4gIHZhciBuZXdNYXA6IGFueSA9IHt9O1xuICB2YXIgc2FtZUFzTmFtZXM6IHN0cmluZ1tdID0gW107XG4gIF8uZWFjaChwYXRoTWFwLCAodmFsdWUsIGtleSkgPT4ge1xuICAgIHZhciBwYXJzZWQgPSBhcGkucGFja2FnZVV0aWxzLnBhcnNlTmFtZShrZXkpO1xuICAgIGlmIChwYXJzZWQubmFtZSAhPT0gdmFsdWUpIHtcbiAgICAgIG5ld01hcFtrZXldID0gdmFsdWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNhbWVBc05hbWVzLnB1c2goa2V5KTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4ge1xuICAgIHNhbWVzOiBzYW1lQXNOYW1lcyxcbiAgICBkaWZmTWFwOiBuZXdNYXBcbiAgfTtcbn1cblxuLy8gZnVuY3Rpb24gZ2V0Um91dGVyTW9kdWxlcyhhcHBNb2R1bGVQYWNrYWdlOiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlLCBhcHBNb2R1bGVEaXI6IHN0cmluZykge1xuLy8gXHRjb25zdCBuZ01vZHVsZXM6IHN0cmluZ1tdID0gYXBpLmNvbmZpZy5nZXQoW2FwaS5wYWNrYWdlTmFtZSwgJ25nTW9kdWxlJ10pIHx8IFtdO1xuLy8gXHRjb25zdCBuZ1BhY2thZ2VNb2R1bGVzID0gbmV3IFNldChwYWNrYWdlTmFtZXMyTmdNb2R1bGUoYXBwTW9kdWxlUGFja2FnZSwgYXBwTW9kdWxlRGlyLFxuLy8gXHRcdGFwaS5jb25maWcuZ2V0KFthcGkucGFja2FnZU5hbWUsICduZ1BhY2thZ2UnXSkgfHwgW10pKTtcbi8vIFx0bmdNb2R1bGVzLmZvckVhY2gobSA9PiBuZ1BhY2thZ2VNb2R1bGVzLmFkZChtKSk7XG4vLyBcdHJldHVybiBBcnJheS5mcm9tKG5nUGFja2FnZU1vZHVsZXMpO1xuLy8gfVxuXG4vLyBmdW5jdGlvbiBwYWNrYWdlTmFtZXMyTmdNb2R1bGUoYXBwTW9kdWxlUGs6IFBhY2thZ2VCcm93c2VySW5zdGFuY2UsIGFwcE1vZHVsZURpcjogc3RyaW5nLCBpbmNsdWRlUGFja2FnZXM/OiBzdHJpbmdbXSk6IHN0cmluZ1tdIHtcbi8vIFx0Y29uc3QgcmVzOiBzdHJpbmdbXSA9IFtdO1xuLy8gXHRpZiAoaW5jbHVkZVBhY2thZ2VzKSB7XG4vLyBcdFx0Zm9yIChjb25zdCBuYW1lIG9mIGluY2x1ZGVQYWNrYWdlcykge1xuLy8gXHRcdFx0bGV0IHBrID0gYXBpLnBhY2thZ2VJbmZvLm1vZHVsZU1hcFtuYW1lXTtcbi8vIFx0XHRcdGlmIChwayA9PSBudWxsKSB7XG4vLyBcdFx0XHRcdGNvbnN0IHNjb3BlID0gKGFwaS5jb25maWcuZ2V0KCdwYWNrYWdlU2NvcGVzJykgYXMgc3RyaW5nW10pLmZpbmQoc2NvcGUgPT4ge1xuLy8gXHRcdFx0XHRcdHJldHVybiBhcGkucGFja2FnZUluZm8ubW9kdWxlTWFwW2BAJHtzY29wZX0vJHtuYW1lfWBdICE9IG51bGw7XG4vLyBcdFx0XHRcdH0pO1xuLy8gXHRcdFx0XHRpZiAoc2NvcGUgPT0gbnVsbCkge1xuLy8gXHRcdFx0XHRcdGxvZy5lcnJvcignUGFja2FnZSBuYW1lZDogXCIlc1wiIGlzIG5vdCBmb3VuZCB3aXRoIHBvc3NpYmxlIHNjb3BlIG5hbWUgaW4gXCIlc1wiJywgbmFtZSxcbi8vIFx0XHRcdFx0XHRcdChhcGkuY29uZmlnLmdldCgncGFja2FnZVNjb3BlcycpIGFzIHN0cmluZ1tdKS5qb2luKCcsICcpKTtcbi8vIFx0XHRcdFx0XHRicmVhaztcbi8vIFx0XHRcdFx0fVxuLy8gXHRcdFx0XHRwayA9IGFwaS5wYWNrYWdlSW5mby5tb2R1bGVNYXBbYEAke3Njb3BlfS8ke25hbWV9YF07XG4vLyBcdFx0XHR9XG4vLyBcdFx0XHRlYWNoUGFja2FnZShwayk7XG4vLyBcdFx0fVxuLy8gXHR9IGVsc2Uge1xuLy8gXHRcdGZvciAoY29uc3QgcGsgb2YgYXBpLnBhY2thZ2VJbmZvLmFsbE1vZHVsZXMpIHtcbi8vIFx0XHRcdGVhY2hQYWNrYWdlKHBrKTtcbi8vIFx0XHR9XG4vLyBcdH1cblxuLy8gXHRmdW5jdGlvbiBlYWNoUGFja2FnZShwazogUGFja2FnZUJyb3dzZXJJbnN0YW5jZSkge1xuLy8gXHRcdGlmIChway5kciA9PSBudWxsIHx8IHBrLmRyLm5nTW9kdWxlID09IG51bGwpXG4vLyBcdFx0XHRyZXR1cm47XG5cbi8vIFx0XHRsZXQgbW9kdWxlcyA9IHBrLmRyLm5nTW9kdWxlO1xuLy8gXHRcdGlmICghQXJyYXkuaXNBcnJheShtb2R1bGVzKSlcbi8vIFx0XHRcdG1vZHVsZXMgPSBbbW9kdWxlc107XG5cbi8vIFx0XHRmb3IgKGxldCBuYW1lIG9mIG1vZHVsZXMpIHtcbi8vIFx0XHRcdG5hbWUgPSBfLnRyaW1TdGFydChuYW1lLCAnLi8nKTtcbi8vIFx0XHRcdGlmIChwayAhPT0gYXBwTW9kdWxlUGspIHtcbi8vIFx0XHRcdFx0aWYgKG5hbWUuaW5kZXhPZignIycpIDwgMClcbi8vIFx0XHRcdFx0XHRyZXMucHVzaChway5sb25nTmFtZSArICcjJyArIG5hbWUpO1xuLy8gXHRcdFx0XHRlbHNlXG4vLyBcdFx0XHRcdFx0cmVzLnB1c2gocGsubG9uZ05hbWUgKyAnLycgKyBuYW1lKTtcbi8vIFx0XHRcdH0gZWxzZSB7XG4vLyBcdFx0XHRcdC8vIHBhY2thZ2UgaXMgc2FtZSBhcyB0aGUgb25lIGFwcC5tb2R1bGUgYmVsb25ncyB0bywgd2UgdXNlIHJlbGF0aXZlIHBhdGggaW5zdGVhZCBvZiBwYWNrYWdlIG5hbWVcbi8vIFx0XHRcdFx0aWYgKG5hbWUuaW5kZXhPZignIycpIDwgMClcbi8vIFx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoYEluICR7cGsucmVhbFBhY2thZ2VQYXRofS9wYWNrYWdlLmpzb24sIHZhbHVlIG9mIFwiZHIubmdNb2R1bGVcIiBhcnJheWAgK1xuLy8gXHRcdFx0XHRcdFx0YG11c3QgYmUgaW4gZm9ybSBvZiAnPHBhdGg+IzxleHBvcnQgTmdNb2R1bGUgbmFtZT4nLCBidXQgaGVyZSBpdCBpcyAnJHtuYW1lfSdgKTtcbi8vIFx0XHRcdFx0Y29uc3QgbmFtZVBhcnRzID0gbmFtZS5zcGxpdCgnIycpO1xuLy8gXHRcdFx0XHRuYW1lID0gcmVsYXRpdmUoYXBwTW9kdWxlRGlyLCBuYW1lUGFydHNbMF0pICsgJyMnICsgbmFtZVBhcnRzWzFdO1xuLy8gXHRcdFx0XHRuYW1lID0gbmFtZS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4vLyBcdFx0XHRcdGlmICghbmFtZS5zdGFydHNXaXRoKCcuJykpXG4vLyBcdFx0XHRcdFx0bmFtZSA9ICcuLycgKyBuYW1lO1xuLy8gXHRcdFx0XHRyZXMucHVzaChuYW1lKTtcbi8vIFx0XHRcdH1cbi8vIFx0XHR9XG4vLyBcdH1cbi8vIFx0cmV0dXJuIHJlcztcbi8vIH1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSBhcHBNb2R1bGVQa05hbWUgcGFja2FnZSBuYW1lIG9mIHRoZSBvbmUgY29udGFpbnMgYXBwLm1vZHVsZS50c1xuICogQHBhcmFtIGFwcE1vZHVsZURpciBhcHAubW9kdWxlLnRzJ3MgZGlyZWN0b3J5LCB1c2VkIHRvIGNhbGN1bGF0ZSByZWxhdGl2ZSBwYXRoXG4gKi9cbi8vIGZ1bmN0aW9uIHJlbW92YWJsZU5nTW9kdWxlcyhhcHBNb2R1bGVQazogUGFja2FnZUJyb3dzZXJJbnN0YW5jZSwgYXBwTW9kdWxlRGlyOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4vLyBcdHJldHVybiBwYWNrYWdlTmFtZXMyTmdNb2R1bGUoYXBwTW9kdWxlUGssIGFwcE1vZHVsZURpcik7XG4vLyB9XG4iXX0=
