"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* tslint:disable max-line-length */
const ts_compiler_1 = require("dr-comp-package/wfh/dist/ts-compiler");
const fs = tslib_1.__importStar(require("fs"));
const _ = tslib_1.__importStar(require("lodash"));
const log4js = tslib_1.__importStar(require("log4js"));
const path_1 = require("path");
const rxjs_1 = require("rxjs");
const __api_1 = tslib_1.__importDefault(require("__api"));
const ng_aot_assets_1 = require("./ng-aot-assets");
const parse_app_module_1 = require("./utils/parse-app-module");
const ts_ast_query_1 = tslib_1.__importDefault(require("./utils/ts-ast-query"));
const ts_before_aot_1 = tslib_1.__importDefault(require("./utils/ts-before-aot"));
const chalk = require('chalk');
const log = log4js.getLogger(__api_1.default.packageName);
const apiTmplTs = _.template('import __DrApi from \'@dr-core/ng-app-builder/src/app/api\';\
var __api = __DrApi.getCachedApi(\'<%=packageName%>\') || new __DrApi(\'<%=packageName%>\');\
__api.default = __api;');
// const includeTsFile = Path.join(__dirname, '..', 'src', 'drcp-include.ts');
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
        const appModuleFile = parse_app_module_1.findAppModuleFileFromMain(path_1.resolve(ngParam.browserOptions.main));
        log.info('app module file: ', appModuleFile);
        const isAot = ngParam.browserOptions.aot;
        return (file, buf) => {
            try {
                if (isAot && file.endsWith('.component.html')) {
                    const cached = this.tsCache.get(this.realFile(file, preserveSymlinks));
                    if (cached != null)
                        return rxjs_1.of(cached);
                    return rxjs_1.of(string2buffer(ng_aot_assets_1.replaceHtml(file, Buffer.from(buf).toString())));
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
                // 	const legoConfig = browserLegoConfig();
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
                if (hasImportApi)
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
// function browserLegoConfig() {
// 	var browserPropSet: any = {};
// 	var legoConfig: any = {}; // legoConfig is global configuration properties which apply to all entries and modules
// 	_.each([
// 		'staticAssetsURL', 'serverURL', 'packageContextPathMapping',
// 		'locales', 'devMode', 'outputPathMap'
// 	], prop => browserPropSet[prop] = 1);
// 	_.each(api.config().browserSideConfigProp, prop => browserPropSet[prop] = true);
// 	_.forOwn(browserPropSet, (nothing, propPath) => _.set(legoConfig, propPath, _.get(api.config(), propPath)));
// 	var compressedInfo = compressOutputPathMap(legoConfig.outputPathMap);
// 	legoConfig.outputPathMap = compressedInfo.diffMap;
// 	legoConfig._outputAsNames = compressedInfo.sames;
// 	legoConfig.buildLocale = api.getBuildLocale();
// 	log.debug('DefinePlugin LEGO_CONFIG: ', legoConfig);
// 	return legoConfig;
// }
// function compressOutputPathMap(pathMap: any) {
// 	var newMap: any = {};
// 	var sameAsNames: string[] = [];
// 	_.each(pathMap, (value, key) => {
// 		var parsed = api.packageUtils.parseName(key);
// 		if (parsed.name !== value) {
// 			newMap[key] = value;
// 		} else {
// 			sameAsNames.push(key);
// 		}
// 	});
// 	return {
// 		sames: sameAsNames,
// 		diffMap: newMap
// 	};
// }
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy10cy1yZXBsYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG9DQUFvQztBQUNwQyxzRUFBdUY7QUFDdkYsK0NBQXlCO0FBQ3pCLGtEQUE0QjtBQUM1Qix1REFBaUM7QUFDakMsK0JBQStCO0FBQy9CLCtCQUFrRDtBQUVsRCwwREFBd0I7QUFDeEIsbURBQThDO0FBRTlDLCtEQUFxRTtBQUVyRSxnRkFBNEM7QUFDNUMsa0ZBQW1EO0FBQ25ELE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUUvQixNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUU5QyxNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDOzt1QkFFTixDQUFDLENBQUM7QUFDekIsOEVBQThFO0FBSTlFLE1BQXFCLFlBQVk7SUFLaEMsWUFBWSxPQUF3QjtRQUg1QixrQkFBYSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1FBQzFDLFlBQU8sR0FBRyxJQUFJLEdBQUcsRUFBdUIsQ0FBQztRQUdoRCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBRUQsS0FBSztRQUNKLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDdEIsQ0FBQztJQUVPLFFBQVEsQ0FBQyxJQUFZLEVBQUUsZ0JBQXlCO1FBQ3ZELGdDQUFnQztRQUNoQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM5QyxJQUFJLFFBQVEsS0FBSyxTQUFTO1lBQ3pCLE9BQU8sUUFBUSxDQUFDO1FBQ2pCLElBQUksRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxjQUFj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QUFPO0FBQ1Asc0JBQXNCO0FBQ3RCLE1BQU07QUFDTixZQUFZO0FBQ1osbURBQW1EO0FBQ25ELHNCQUFzQjtBQUN0QixNQUFNO0FBQ04sS0FBSztBQUVMLHNEQUFzRDtBQUN0RCxpREFBaUQ7QUFDakQsYUFBYTtBQUViLGtDQUFrQztBQUNsQyxpQ0FBaUM7QUFDakMsMEJBQTBCO0FBRTFCLGdDQUFnQztBQUNoQyxxQ0FBcUM7QUFDckMsK0JBQStCO0FBQy9CLGlDQUFpQztBQUNqQywyQ0FBMkM7QUFDM0MsV0FBVztBQUNYLDJDQUEyQztBQUMzQyxjQUFjO0FBQ2Qsd0dBQXdHO0FBQ3hHLGlDQUFpQztBQUNqQywrRkFBK0Y7QUFDL0YseUZBQXlGO0FBQ3pGLHlDQUF5QztBQUN6Qyx3RUFBd0U7QUFDeEUsdUNBQXVDO0FBQ3ZDLGlDQUFpQztBQUNqQywyQkFBMkI7QUFDM0Isc0JBQXNCO0FBQ3RCLE9BQU87QUFDUCxNQUFNO0FBQ04sS0FBSztBQUNMLGVBQWU7QUFDZixJQUFJO0FBRUo7Ozs7R0FJRztBQUNILHFHQUFxRztBQUNyRyw0REFBNEQ7QUFDNUQsSUFBSSIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9uZy10cy1yZXBsYWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbWF4LWxpbmUtbGVuZ3RoICovXG5pbXBvcnQgeyByZWFkVHNDb25maWcsIHRyYW5zcGlsZVNpbmdsZVRzIH0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3RzLWNvbXBpbGVyJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZSwgb2YsIHRocm93RXJyb3IgfSBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgeyByZXBsYWNlSHRtbCB9IGZyb20gJy4vbmctYW90LWFzc2V0cyc7XG5pbXBvcnQgeyBBbmd1bGFyQ2xpUGFyYW0gfSBmcm9tICcuL25nL2NvbW1vbic7XG5pbXBvcnQgeyBmaW5kQXBwTW9kdWxlRmlsZUZyb21NYWluIH0gZnJvbSAnLi91dGlscy9wYXJzZS1hcHAtbW9kdWxlJztcbmltcG9ydCB7IEhvb2tSZWFkRnVuYyB9IGZyb20gJy4vdXRpbHMvcmVhZC1ob29rLXZmc2hvc3QnO1xuaW1wb3J0IFNlbGVjdG9yIGZyb20gJy4vdXRpbHMvdHMtYXN0LXF1ZXJ5JztcbmltcG9ydCBBcGlBb3RDb21waWxlciBmcm9tICcuL3V0aWxzL3RzLWJlZm9yZS1hb3QnO1xuY29uc3QgY2hhbGsgPSByZXF1aXJlKCdjaGFsaycpO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSk7XG5cbmNvbnN0IGFwaVRtcGxUcyA9IF8udGVtcGxhdGUoJ2ltcG9ydCBfX0RyQXBpIGZyb20gXFwnQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvc3JjL2FwcC9hcGlcXCc7XFxcbnZhciBfX2FwaSA9IF9fRHJBcGkuZ2V0Q2FjaGVkQXBpKFxcJzwlPXBhY2thZ2VOYW1lJT5cXCcpIHx8IG5ldyBfX0RyQXBpKFxcJzwlPXBhY2thZ2VOYW1lJT5cXCcpO1xcXG5fX2FwaS5kZWZhdWx0ID0gX19hcGk7Jyk7XG4vLyBjb25zdCBpbmNsdWRlVHNGaWxlID0gUGF0aC5qb2luKF9fZGlybmFtZSwgJy4uJywgJ3NyYycsICdkcmNwLWluY2x1ZGUudHMnKTtcblxuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRTUmVhZEhvb2tlciB7XG5cdGhvb2tGdW5jOiBIb29rUmVhZEZ1bmM7XG5cdHByaXZhdGUgcmVhbEZpbGVDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG5cdHByaXZhdGUgdHNDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBBcnJheUJ1ZmZlcj4oKTtcblxuXHRjb25zdHJ1Y3RvcihuZ1BhcmFtOiBBbmd1bGFyQ2xpUGFyYW0pIHtcblx0XHR0aGlzLmhvb2tGdW5jID0gdGhpcy5jcmVhdGVUc1JlYWRIb29rKG5nUGFyYW0pO1xuXHR9XG5cblx0Y2xlYXIoKSB7XG5cdFx0dGhpcy50c0NhY2hlLmNsZWFyKCk7XG5cdH1cblxuXHRwcml2YXRlIHJlYWxGaWxlKGZpbGU6IHN0cmluZywgcHJlc2VydmVTeW1saW5rczogYm9vbGVhbik6IHN0cmluZyB7XG5cdFx0Ly8gbG9nLmluZm8oYHJlYWRGaWxlICR7ZmlsZX1gKTtcblx0XHRjb25zdCByZWFsRmlsZSA9IHRoaXMucmVhbEZpbGVDYWNoZS5nZXQoZmlsZSk7XG5cdFx0aWYgKHJlYWxGaWxlICE9PSB1bmRlZmluZWQpXG5cdFx0XHRyZXR1cm4gcmVhbEZpbGU7XG5cdFx0aWYgKGZzLmxzdGF0U3luYyhmaWxlKS5pc1N5bWJvbGljTGluaygpKSB7XG5cdFx0XHRpZiAoIXByZXNlcnZlU3ltbGlua3MpXG5cdFx0XHRcdGxvZy53YXJuKGBSZWFkaW5nIGEgc3ltbGluazogJHtmaWxlfSwgYnV0IFwicHJlc2VydmVTeW1saW5rc1wiIGlzIGZhbHNlLmApO1xuXHRcdFx0Y29uc3QgcmYgPSBmcy5yZWFscGF0aFN5bmMoZmlsZSk7XG5cdFx0XHR0aGlzLnJlYWxGaWxlQ2FjaGUuc2V0KGZpbGUsIHJmKTtcblx0XHRcdHJldHVybiByZjtcblx0XHR9IGVsc2Vcblx0XHRcdHJldHVybiBmaWxlO1xuXHR9XG5cblx0cHJpdmF0ZSBjcmVhdGVUc1JlYWRIb29rKG5nUGFyYW06IEFuZ3VsYXJDbGlQYXJhbSk6IEhvb2tSZWFkRnVuYyB7XG5cdFx0Ly8gbGV0IGRyY3BJbmNsdWRlQnVmOiBBcnJheUJ1ZmZlcjtcblxuXHRcdGNvbnN0IHRzY29uZmlnRmlsZSA9IG5nUGFyYW0uYnJvd3Nlck9wdGlvbnMudHNDb25maWc7XG5cblx0XHQvLyBjb25zdCBobXJFbmFibGVkID0gXy5nZXQobmdQYXJhbSwgJ2J1aWxkZXJDb25maWcub3B0aW9ucy5obXInKSB8fCBhcGkuYXJndi5obXI7XG5cdFx0Y29uc3QgcHJlc2VydmVTeW1saW5rcyA9IG5nUGFyYW0uYnJvd3Nlck9wdGlvbnMucHJlc2VydmVTeW1saW5rcyAhPSBudWxsID8gbmdQYXJhbS5icm93c2VyT3B0aW9ucy5wcmVzZXJ2ZVN5bWxpbmtzIDpcblx0XHRcdGZhbHNlO1xuXHRcdGNvbnN0IHRzQ29tcGlsZXJPcHRpb25zID0gcmVhZFRzQ29uZmlnKHRzY29uZmlnRmlsZSk7XG5cdFx0Ly8gbGV0IHBvbHlmaWxsc0ZpbGU6IHN0cmluZyA9ICcnO1xuXHRcdC8vIGlmIChuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLnBvbHlmaWxscylcblx0XHQvLyBcdHBvbHlmaWxsc0ZpbGUgPSBuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLnBvbHlmaWxscy5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cblx0XHRjb25zdCBhcHBNb2R1bGVGaWxlID0gZmluZEFwcE1vZHVsZUZpbGVGcm9tTWFpbihyZXNvbHZlKG5nUGFyYW0uYnJvd3Nlck9wdGlvbnMubWFpbikpO1xuXHRcdGxvZy5pbmZvKCdhcHAgbW9kdWxlIGZpbGU6ICcsIGFwcE1vZHVsZUZpbGUpO1xuXG5cdFx0Y29uc3QgaXNBb3QgPSBuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLmFvdDtcblxuXHRcdHJldHVybiAoZmlsZTogc3RyaW5nLCBidWY6IEFycmF5QnVmZmVyKTogT2JzZXJ2YWJsZTxBcnJheUJ1ZmZlcj4gPT4ge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0aWYgKGlzQW90ICYmIGZpbGUuZW5kc1dpdGgoJy5jb21wb25lbnQuaHRtbCcpKSB7XG5cdFx0XHRcdFx0Y29uc3QgY2FjaGVkID0gdGhpcy50c0NhY2hlLmdldCh0aGlzLnJlYWxGaWxlKGZpbGUsIHByZXNlcnZlU3ltbGlua3MpKTtcblx0XHRcdFx0XHRpZiAoY2FjaGVkICE9IG51bGwpXG5cdFx0XHRcdFx0XHRyZXR1cm4gb2YoY2FjaGVkKTtcblx0XHRcdFx0XHRyZXR1cm4gb2Yoc3RyaW5nMmJ1ZmZlcihyZXBsYWNlSHRtbChmaWxlLCBCdWZmZXIuZnJvbShidWYpLnRvU3RyaW5nKCkpKSk7XG5cblx0XHRcdFx0fSBlbHNlIGlmICghZmlsZS5lbmRzV2l0aCgnLnRzJykgfHwgZmlsZS5lbmRzV2l0aCgnLmQudHMnKSkge1xuXHRcdFx0XHRcdHJldHVybiBvZihidWYpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y29uc3QgY2FjaGVkID0gdGhpcy50c0NhY2hlLmdldCh0aGlzLnJlYWxGaWxlKGZpbGUsIHByZXNlcnZlU3ltbGlua3MpKTtcblx0XHRcdFx0aWYgKGNhY2hlZCAhPSBudWxsKVxuXHRcdFx0XHRcdHJldHVybiBvZihjYWNoZWQpO1xuXHRcdFx0XHQvLyBsZXQgbm9ybWFsRmlsZSA9IHJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGZpbGUpO1xuXHRcdFx0XHQvLyBpZiAoU0VQID09PSAnXFxcXCcpXG5cdFx0XHRcdC8vIFx0bm9ybWFsRmlsZSA9IG5vcm1hbEZpbGUucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXHRcdFx0XHQvLyBpZiAoaG1yRW5hYmxlZCAmJiBwb2x5ZmlsbHNGaWxlICYmIG5vcm1hbEZpbGUgPT09IHBvbHlmaWxsc0ZpbGUpIHtcblx0XHRcdFx0Ly8gXHRjb25zdCBobXJDbGllbnQgPSAnXFxuaW1wb3J0IFxcJ3dlYnBhY2staG90LW1pZGRsZXdhcmUvY2xpZW50XFwnOyc7XG5cdFx0XHRcdC8vIFx0Y29uc3QgY29udGVudCA9IEJ1ZmZlci5mcm9tKGJ1ZikudG9TdHJpbmcoKSArIGhtckNsaWVudDtcblx0XHRcdFx0Ly8gXHRsb2cuaW5mbyhgQXBwZW5kIHRvICR7bm9ybWFsRmlsZX06IFxcbmltcG9ydCBcXCd3ZWJwYWNrLWhvdC1taWRkbGV3YXJlL2NsaWVudFxcJztgKTtcblx0XHRcdFx0Ly8gXHRjb25zdCBiZiA9IHN0cmluZzJidWZmZXIoY29udGVudCk7XG5cdFx0XHRcdC8vIFx0dGhpcy50c0NhY2hlLnNldCh0aGlzLnJlYWxGaWxlKGZpbGUsIHByZXNlcnZlU3ltbGlua3MpLCBiZik7XG5cdFx0XHRcdC8vIFx0cmV0dXJuIG9mKGJmKTtcblx0XHRcdFx0Ly8gfSBlbHNlIGlmIChub3JtYWxGaWxlLmVuZHNXaXRoKCcvZHJjcC1pbmNsdWRlLnRzJykpIHtcblx0XHRcdFx0Ly8gXHRpZiAoZHJjcEluY2x1ZGVCdWYpXG5cdFx0XHRcdC8vIFx0XHRyZXR1cm4gb2YoZHJjcEluY2x1ZGVCdWYpO1xuXHRcdFx0XHQvLyBcdGxldCBjb250ZW50ID0gQnVmZmVyLmZyb20oYnVmKS50b1N0cmluZygpO1xuXHRcdFx0XHQvLyBcdGNvbnN0IGxlZ29Db25maWcgPSBicm93c2VyTGVnb0NvbmZpZygpO1xuXHRcdFx0XHQvLyBcdGxldCBobXJCb290OiBzdHJpbmc7XG5cdFx0XHRcdC8vIFx0aWYgKGhtckVuYWJsZWQpIHtcblx0XHRcdFx0Ly8gXHRcdGNvbnRlbnQgPSAnaW1wb3J0IGhtckJvb3RzdHJhcCBmcm9tIFxcJy4vaG1yXFwnO1xcbicgKyBjb250ZW50O1xuXHRcdFx0XHQvLyBcdFx0aG1yQm9vdCA9ICdobXJCb290c3RyYXAobW9kdWxlLCBib290c3RyYXApJztcblx0XHRcdFx0Ly8gXHR9XG5cdFx0XHRcdC8vIFx0aWYgKCFuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLmFvdCkge1xuXHRcdFx0XHQvLyBcdFx0Y29udGVudCA9ICdpbXBvcnQgXFwnY29yZS1qcy9lczcvcmVmbGVjdFxcJztcXG4nICsgY29udGVudDtcblx0XHRcdFx0Ly8gXHR9XG5cdFx0XHRcdC8vIFx0aWYgKGhtckJvb3QpXG5cdFx0XHRcdC8vIFx0XHRjb250ZW50ID0gY29udGVudC5yZXBsYWNlKC9cXC9cXCogcmVwbGFjZSBcXCpcXC9ib290c3RyYXBcXChcXCkvZywgaG1yQm9vdCk7XG5cdFx0XHRcdC8vIFx0aWYgKG5nUGFyYW0uc3NyKSB7XG5cdFx0XHRcdC8vIFx0XHRjb250ZW50ICs9ICdcXG5jb25zb2xlLmxvZyhcInNldCBnbG9iYWwuTEVHT19DT05GSUdcIik7Jztcblx0XHRcdFx0Ly8gXHRcdGNvbnRlbnQgKz0gJ1xcbk9iamVjdC5hc3NpZ24oZ2xvYmFsLCB7XFxcblx0XHRcdFx0Ly8gXHRcdFx0X19kcmNwRW50cnlQYWdlOiBudWxsLCBcXFxuXHRcdFx0XHQvLyBcdFx0XHRfX2RyY3BFbnRyeVBhY2thZ2U6IG51bGxcXFxuXHRcdFx0XHQvLyBcdFx0fSk7XFxuJztcblx0XHRcdFx0Ly8gXHRcdGNvbnRlbnQgKz0gJyhnbG9iYWwgYXMgYW55KSc7XG5cdFx0XHRcdC8vIFx0fSBlbHNlIHtcblx0XHRcdFx0Ly8gXHRcdGNvbnRlbnQgKz0gJ1xcbk9iamVjdC5hc3NpZ24od2luZG93LCB7XFxcblx0XHRcdFx0Ly8gXHRcdFx0X19kcmNwRW50cnlQYWdlOiBudWxsLCBcXFxuXHRcdFx0XHQvLyBcdFx0XHRfX2RyY3BFbnRyeVBhY2thZ2U6IG51bGxcXFxuXHRcdFx0XHQvLyBcdFx0fSk7XFxuJztcblx0XHRcdFx0Ly8gXHRcdGNvbnRlbnQgKz0gJ1xcbih3aW5kb3cgYXMgYW55KSc7XG5cdFx0XHRcdC8vIFx0fVxuXHRcdFx0XHQvLyBcdGNvbnRlbnQgKz0gYC5MRUdPX0NPTkZJRyA9ICR7SlNPTi5zdHJpbmdpZnkobGVnb0NvbmZpZywgbnVsbCwgJyAgJyl9O1xcbmA7XG5cdFx0XHRcdC8vIFx0ZHJjcEluY2x1ZGVCdWYgPSBzdHJpbmcyYnVmZmVyKGNvbnRlbnQpO1xuXHRcdFx0XHQvLyBcdGxvZy5pbmZvKGNoYWxrLmN5YW4oZmlsZSkgKyAnOlxcbicgKyBjb250ZW50KTtcblx0XHRcdFx0Ly8gXHR0aGlzLnRzQ2FjaGUuc2V0KHRoaXMucmVhbEZpbGUoZmlsZSwgcHJlc2VydmVTeW1saW5rcyksIGRyY3BJbmNsdWRlQnVmKTtcblx0XHRcdFx0Ly8gXHRyZXR1cm4gb2YoZHJjcEluY2x1ZGVCdWYpO1xuXHRcdFx0XHQvLyB9XG5cdFx0XHRcdGNvbnN0IGNvbXBQa2cgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoZmlsZSk7XG5cdFx0XHRcdGxldCBjb250ZW50ID0gQnVmZmVyLmZyb20oYnVmKS50b1N0cmluZygpO1xuXHRcdFx0XHRsZXQgbmVlZExvZ0ZpbGUgPSBmYWxzZTtcblx0XHRcdFx0Ly8gcGF0Y2ggYXBwLm1vZHVsZS50c1xuXHRcdFx0XHQvLyBpZiAoYXBwTW9kdWxlRmlsZSA9PT0gZmlsZSkge1xuXHRcdFx0XHQvLyBcdGxvZy5pbmZvKCdwYXRjaCcsIGZpbGUpO1xuXHRcdFx0XHQvLyBcdGNvbnN0IGFwcE1vZHVsZVBhY2thZ2UgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoYXBwTW9kdWxlRmlsZSk7XG5cdFx0XHRcdC8vIFx0Y29uc3QgcmVtb3ZhYmxlcyA9IHJlbW92YWJsZU5nTW9kdWxlcyhhcHBNb2R1bGVQYWNrYWdlLCBkaXJuYW1lKGFwcE1vZHVsZUZpbGUpKTtcblx0XHRcdFx0Ly8gXHRjb25zdCBuZ01vZHVsZXM6IHN0cmluZ1tdID0gZ2V0Um91dGVyTW9kdWxlcyhhcHBNb2R1bGVQYWNrYWdlLCBkaXJuYW1lKGFwcE1vZHVsZUZpbGUpKSB8fCByZW1vdmFibGVzO1xuXHRcdFx0XHQvLyBcdC8vIG5nTW9kdWxlcy5wdXNoKGFwaS5wYWNrYWdlTmFtZSArICcvc3JjL2FwcCNEZXZlbG9wZXJNb2R1bGUnKTtcblx0XHRcdFx0Ly8gXHRsb2cuaW5mbygnSW5zZXJ0IG9wdGlvbmFsIE5nTW9kdWxlcyB0byBBcHBNb2R1bGU6XFxuICAnICsgbmdNb2R1bGVzLmpvaW4oJ1xcbiAgJykpO1xuXHRcdFx0XHQvLyBcdGNvbnRlbnQgPSBuZXcgQXBwTW9kdWxlUGFyc2VyKClcblx0XHRcdFx0Ly8gXHRcdC5wYXRjaEZpbGUoZmlsZSwgY29udGVudCwgcmVtb3ZhYmxlcywgbmdNb2R1bGVzKTtcblx0XHRcdFx0Ly8gXHRuZWVkTG9nRmlsZSA9IHRydWU7XG5cdFx0XHRcdC8vIH1cblx0XHRcdFx0Y29uc3QgdHNTZWxlY3RvciA9IG5ldyBTZWxlY3Rvcihjb250ZW50LCBmaWxlKTtcblx0XHRcdFx0Y29uc3QgaGFzSW1wb3J0QXBpID0gdHNTZWxlY3Rvci5maW5kQWxsKCc6SW1wb3J0RGVjbGFyYXRpb24+Lm1vZHVsZVNwZWNpZmllcjpTdHJpbmdMaXRlcmFsJykuc29tZShhc3QgPT4ge1xuXHRcdFx0XHRcdHJldHVybiAoYXN0IGFzIHRzLlN0cmluZ0xpdGVyYWwpLnRleHQgPT09ICdfX2FwaSc7XG5cdFx0XHRcdH0pO1xuXHRcdFx0XHRsZXQgY2hhbmdlZCA9IGFwaS5icm93c2VySW5qZWN0b3IuaW5qZWN0VG9GaWxlKGZpbGUsIGNvbnRlbnQpO1xuXG5cdFx0XHRcdGNoYW5nZWQgPSBuZXcgQXBpQW90Q29tcGlsZXIoZmlsZSwgY2hhbmdlZCkucGFyc2Uoc291cmNlID0+IHRyYW5zcGlsZVNpbmdsZVRzKHNvdXJjZSwgdHNDb21waWxlck9wdGlvbnMpKTtcblx0XHRcdFx0aWYgKGhhc0ltcG9ydEFwaSlcblx0XHRcdFx0XHRjaGFuZ2VkID0gYXBpVG1wbFRzKHtwYWNrYWdlTmFtZTogY29tcFBrZy5sb25nTmFtZX0pICsgJ1xcbicgKyBjaGFuZ2VkO1xuXHRcdFx0XHQvLyBpZiAoY2hhbmdlZCAhPT0gY29udGVudCAmJiBuZ1BhcmFtLnNzcikge1xuXHRcdFx0XHQvLyBcdGNoYW5nZWQgPSAnaW1wb3J0IFwiQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvc3JjL2RyY3AtaW5jbHVkZVwiO1xcbicgKyBjaGFuZ2VkO1xuXHRcdFx0XHQvLyB9XG5cdFx0XHRcdGlmIChuZWVkTG9nRmlsZSlcblx0XHRcdFx0XHRsb2cuaW5mbyhjaGFsay5jeWFuKGZpbGUpICsgJzpcXG4nICsgY2hhbmdlZCk7XG5cdFx0XHRcdGNvbnN0IGJmID0gc3RyaW5nMmJ1ZmZlcihjaGFuZ2VkKTtcblx0XHRcdFx0dGhpcy50c0NhY2hlLnNldCh0aGlzLnJlYWxGaWxlKGZpbGUsIHByZXNlcnZlU3ltbGlua3MpLCBiZik7XG5cdFx0XHRcdHJldHVybiBvZihiZik7XG5cdFx0XHR9IGNhdGNoIChleCkge1xuXHRcdFx0XHRsb2cuZXJyb3IoZXgpO1xuXHRcdFx0XHRyZXR1cm4gdGhyb3dFcnJvcihleCk7XG5cdFx0XHR9XG5cdFx0fTtcblx0fVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RyaW5nMmJ1ZmZlcihpbnB1dDogc3RyaW5nKTogQXJyYXlCdWZmZXIge1xuXHRjb25zdCBub2RlQnVmID0gQnVmZmVyLmZyb20oaW5wdXQpO1xuXHRjb25zdCBsZW4gPSBub2RlQnVmLmJ5dGVMZW5ndGg7XG5cdGNvbnN0IG5ld0J1ZiA9IG5ldyBBcnJheUJ1ZmZlcihsZW4pO1xuXHRjb25zdCBkYXRhVmlldyA9IG5ldyBEYXRhVmlldyhuZXdCdWYpO1xuXHRmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG5cdFx0ZGF0YVZpZXcuc2V0VWludDgoaSwgbm9kZUJ1Zi5yZWFkVUludDgoaSkpO1xuXHR9XG5cdHJldHVybiBuZXdCdWY7XG59XG5cbi8vIGZ1bmN0aW9uIGJyb3dzZXJMZWdvQ29uZmlnKCkge1xuLy8gXHR2YXIgYnJvd3NlclByb3BTZXQ6IGFueSA9IHt9O1xuLy8gXHR2YXIgbGVnb0NvbmZpZzogYW55ID0ge307IC8vIGxlZ29Db25maWcgaXMgZ2xvYmFsIGNvbmZpZ3VyYXRpb24gcHJvcGVydGllcyB3aGljaCBhcHBseSB0byBhbGwgZW50cmllcyBhbmQgbW9kdWxlc1xuLy8gXHRfLmVhY2goW1xuLy8gXHRcdCdzdGF0aWNBc3NldHNVUkwnLCAnc2VydmVyVVJMJywgJ3BhY2thZ2VDb250ZXh0UGF0aE1hcHBpbmcnLFxuLy8gXHRcdCdsb2NhbGVzJywgJ2Rldk1vZGUnLCAnb3V0cHV0UGF0aE1hcCdcbi8vIFx0XSwgcHJvcCA9PiBicm93c2VyUHJvcFNldFtwcm9wXSA9IDEpO1xuLy8gXHRfLmVhY2goYXBpLmNvbmZpZygpLmJyb3dzZXJTaWRlQ29uZmlnUHJvcCwgcHJvcCA9PiBicm93c2VyUHJvcFNldFtwcm9wXSA9IHRydWUpO1xuLy8gXHRfLmZvck93bihicm93c2VyUHJvcFNldCwgKG5vdGhpbmcsIHByb3BQYXRoKSA9PiBfLnNldChsZWdvQ29uZmlnLCBwcm9wUGF0aCwgXy5nZXQoYXBpLmNvbmZpZygpLCBwcm9wUGF0aCkpKTtcbi8vIFx0dmFyIGNvbXByZXNzZWRJbmZvID0gY29tcHJlc3NPdXRwdXRQYXRoTWFwKGxlZ29Db25maWcub3V0cHV0UGF0aE1hcCk7XG4vLyBcdGxlZ29Db25maWcub3V0cHV0UGF0aE1hcCA9IGNvbXByZXNzZWRJbmZvLmRpZmZNYXA7XG4vLyBcdGxlZ29Db25maWcuX291dHB1dEFzTmFtZXMgPSBjb21wcmVzc2VkSW5mby5zYW1lcztcbi8vIFx0bGVnb0NvbmZpZy5idWlsZExvY2FsZSA9IGFwaS5nZXRCdWlsZExvY2FsZSgpO1xuLy8gXHRsb2cuZGVidWcoJ0RlZmluZVBsdWdpbiBMRUdPX0NPTkZJRzogJywgbGVnb0NvbmZpZyk7XG4vLyBcdHJldHVybiBsZWdvQ29uZmlnO1xuLy8gfVxuXG4vLyBmdW5jdGlvbiBjb21wcmVzc091dHB1dFBhdGhNYXAocGF0aE1hcDogYW55KSB7XG4vLyBcdHZhciBuZXdNYXA6IGFueSA9IHt9O1xuLy8gXHR2YXIgc2FtZUFzTmFtZXM6IHN0cmluZ1tdID0gW107XG4vLyBcdF8uZWFjaChwYXRoTWFwLCAodmFsdWUsIGtleSkgPT4ge1xuLy8gXHRcdHZhciBwYXJzZWQgPSBhcGkucGFja2FnZVV0aWxzLnBhcnNlTmFtZShrZXkpO1xuLy8gXHRcdGlmIChwYXJzZWQubmFtZSAhPT0gdmFsdWUpIHtcbi8vIFx0XHRcdG5ld01hcFtrZXldID0gdmFsdWU7XG4vLyBcdFx0fSBlbHNlIHtcbi8vIFx0XHRcdHNhbWVBc05hbWVzLnB1c2goa2V5KTtcbi8vIFx0XHR9XG4vLyBcdH0pO1xuLy8gXHRyZXR1cm4ge1xuLy8gXHRcdHNhbWVzOiBzYW1lQXNOYW1lcyxcbi8vIFx0XHRkaWZmTWFwOiBuZXdNYXBcbi8vIFx0fTtcbi8vIH1cblxuLy8gZnVuY3Rpb24gZ2V0Um91dGVyTW9kdWxlcyhhcHBNb2R1bGVQYWNrYWdlOiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlLCBhcHBNb2R1bGVEaXI6IHN0cmluZykge1xuLy8gXHRjb25zdCBuZ01vZHVsZXM6IHN0cmluZ1tdID0gYXBpLmNvbmZpZy5nZXQoW2FwaS5wYWNrYWdlTmFtZSwgJ25nTW9kdWxlJ10pIHx8IFtdO1xuLy8gXHRjb25zdCBuZ1BhY2thZ2VNb2R1bGVzID0gbmV3IFNldChwYWNrYWdlTmFtZXMyTmdNb2R1bGUoYXBwTW9kdWxlUGFja2FnZSwgYXBwTW9kdWxlRGlyLFxuLy8gXHRcdGFwaS5jb25maWcuZ2V0KFthcGkucGFja2FnZU5hbWUsICduZ1BhY2thZ2UnXSkgfHwgW10pKTtcbi8vIFx0bmdNb2R1bGVzLmZvckVhY2gobSA9PiBuZ1BhY2thZ2VNb2R1bGVzLmFkZChtKSk7XG4vLyBcdHJldHVybiBBcnJheS5mcm9tKG5nUGFja2FnZU1vZHVsZXMpO1xuLy8gfVxuXG4vLyBmdW5jdGlvbiBwYWNrYWdlTmFtZXMyTmdNb2R1bGUoYXBwTW9kdWxlUGs6IFBhY2thZ2VCcm93c2VySW5zdGFuY2UsIGFwcE1vZHVsZURpcjogc3RyaW5nLCBpbmNsdWRlUGFja2FnZXM/OiBzdHJpbmdbXSk6IHN0cmluZ1tdIHtcbi8vIFx0Y29uc3QgcmVzOiBzdHJpbmdbXSA9IFtdO1xuLy8gXHRpZiAoaW5jbHVkZVBhY2thZ2VzKSB7XG4vLyBcdFx0Zm9yIChjb25zdCBuYW1lIG9mIGluY2x1ZGVQYWNrYWdlcykge1xuLy8gXHRcdFx0bGV0IHBrID0gYXBpLnBhY2thZ2VJbmZvLm1vZHVsZU1hcFtuYW1lXTtcbi8vIFx0XHRcdGlmIChwayA9PSBudWxsKSB7XG4vLyBcdFx0XHRcdGNvbnN0IHNjb3BlID0gKGFwaS5jb25maWcuZ2V0KCdwYWNrYWdlU2NvcGVzJykgYXMgc3RyaW5nW10pLmZpbmQoc2NvcGUgPT4ge1xuLy8gXHRcdFx0XHRcdHJldHVybiBhcGkucGFja2FnZUluZm8ubW9kdWxlTWFwW2BAJHtzY29wZX0vJHtuYW1lfWBdICE9IG51bGw7XG4vLyBcdFx0XHRcdH0pO1xuLy8gXHRcdFx0XHRpZiAoc2NvcGUgPT0gbnVsbCkge1xuLy8gXHRcdFx0XHRcdGxvZy5lcnJvcignUGFja2FnZSBuYW1lZDogXCIlc1wiIGlzIG5vdCBmb3VuZCB3aXRoIHBvc3NpYmxlIHNjb3BlIG5hbWUgaW4gXCIlc1wiJywgbmFtZSxcbi8vIFx0XHRcdFx0XHRcdChhcGkuY29uZmlnLmdldCgncGFja2FnZVNjb3BlcycpIGFzIHN0cmluZ1tdKS5qb2luKCcsICcpKTtcbi8vIFx0XHRcdFx0XHRicmVhaztcbi8vIFx0XHRcdFx0fVxuLy8gXHRcdFx0XHRwayA9IGFwaS5wYWNrYWdlSW5mby5tb2R1bGVNYXBbYEAke3Njb3BlfS8ke25hbWV9YF07XG4vLyBcdFx0XHR9XG4vLyBcdFx0XHRlYWNoUGFja2FnZShwayk7XG4vLyBcdFx0fVxuLy8gXHR9IGVsc2Uge1xuLy8gXHRcdGZvciAoY29uc3QgcGsgb2YgYXBpLnBhY2thZ2VJbmZvLmFsbE1vZHVsZXMpIHtcbi8vIFx0XHRcdGVhY2hQYWNrYWdlKHBrKTtcbi8vIFx0XHR9XG4vLyBcdH1cblxuLy8gXHRmdW5jdGlvbiBlYWNoUGFja2FnZShwazogUGFja2FnZUJyb3dzZXJJbnN0YW5jZSkge1xuLy8gXHRcdGlmIChway5kciA9PSBudWxsIHx8IHBrLmRyLm5nTW9kdWxlID09IG51bGwpXG4vLyBcdFx0XHRyZXR1cm47XG5cbi8vIFx0XHRsZXQgbW9kdWxlcyA9IHBrLmRyLm5nTW9kdWxlO1xuLy8gXHRcdGlmICghQXJyYXkuaXNBcnJheShtb2R1bGVzKSlcbi8vIFx0XHRcdG1vZHVsZXMgPSBbbW9kdWxlc107XG5cbi8vIFx0XHRmb3IgKGxldCBuYW1lIG9mIG1vZHVsZXMpIHtcbi8vIFx0XHRcdG5hbWUgPSBfLnRyaW1TdGFydChuYW1lLCAnLi8nKTtcbi8vIFx0XHRcdGlmIChwayAhPT0gYXBwTW9kdWxlUGspIHtcbi8vIFx0XHRcdFx0aWYgKG5hbWUuaW5kZXhPZignIycpIDwgMClcbi8vIFx0XHRcdFx0XHRyZXMucHVzaChway5sb25nTmFtZSArICcjJyArIG5hbWUpO1xuLy8gXHRcdFx0XHRlbHNlXG4vLyBcdFx0XHRcdFx0cmVzLnB1c2gocGsubG9uZ05hbWUgKyAnLycgKyBuYW1lKTtcbi8vIFx0XHRcdH0gZWxzZSB7XG4vLyBcdFx0XHRcdC8vIHBhY2thZ2UgaXMgc2FtZSBhcyB0aGUgb25lIGFwcC5tb2R1bGUgYmVsb25ncyB0bywgd2UgdXNlIHJlbGF0aXZlIHBhdGggaW5zdGVhZCBvZiBwYWNrYWdlIG5hbWVcbi8vIFx0XHRcdFx0aWYgKG5hbWUuaW5kZXhPZignIycpIDwgMClcbi8vIFx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoYEluICR7cGsucmVhbFBhY2thZ2VQYXRofS9wYWNrYWdlLmpzb24sIHZhbHVlIG9mIFwiZHIubmdNb2R1bGVcIiBhcnJheWAgK1xuLy8gXHRcdFx0XHRcdFx0YG11c3QgYmUgaW4gZm9ybSBvZiAnPHBhdGg+IzxleHBvcnQgTmdNb2R1bGUgbmFtZT4nLCBidXQgaGVyZSBpdCBpcyAnJHtuYW1lfSdgKTtcbi8vIFx0XHRcdFx0Y29uc3QgbmFtZVBhcnRzID0gbmFtZS5zcGxpdCgnIycpO1xuLy8gXHRcdFx0XHRuYW1lID0gcmVsYXRpdmUoYXBwTW9kdWxlRGlyLCBuYW1lUGFydHNbMF0pICsgJyMnICsgbmFtZVBhcnRzWzFdO1xuLy8gXHRcdFx0XHRuYW1lID0gbmFtZS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4vLyBcdFx0XHRcdGlmICghbmFtZS5zdGFydHNXaXRoKCcuJykpXG4vLyBcdFx0XHRcdFx0bmFtZSA9ICcuLycgKyBuYW1lO1xuLy8gXHRcdFx0XHRyZXMucHVzaChuYW1lKTtcbi8vIFx0XHRcdH1cbi8vIFx0XHR9XG4vLyBcdH1cbi8vIFx0cmV0dXJuIHJlcztcbi8vIH1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSBhcHBNb2R1bGVQa05hbWUgcGFja2FnZSBuYW1lIG9mIHRoZSBvbmUgY29udGFpbnMgYXBwLm1vZHVsZS50c1xuICogQHBhcmFtIGFwcE1vZHVsZURpciBhcHAubW9kdWxlLnRzJ3MgZGlyZWN0b3J5LCB1c2VkIHRvIGNhbGN1bGF0ZSByZWxhdGl2ZSBwYXRoXG4gKi9cbi8vIGZ1bmN0aW9uIHJlbW92YWJsZU5nTW9kdWxlcyhhcHBNb2R1bGVQazogUGFja2FnZUJyb3dzZXJJbnN0YW5jZSwgYXBwTW9kdWxlRGlyOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4vLyBcdHJldHVybiBwYWNrYWdlTmFtZXMyTmdNb2R1bGUoYXBwTW9kdWxlUGssIGFwcE1vZHVsZURpcik7XG4vLyB9XG4iXX0=
