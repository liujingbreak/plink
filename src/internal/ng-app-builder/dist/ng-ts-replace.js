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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy10cy1yZXBsYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG9DQUFvQztBQUNwQyxzRUFBdUY7QUFDdkYsK0NBQXlCO0FBQ3pCLGtEQUE0QjtBQUM1Qix1REFBaUM7QUFDakMsK0JBQStCO0FBQy9CLCtCQUFrRDtBQUVsRCwwREFBd0I7QUFDeEIsbURBQThDO0FBRTlDLCtEQUFxRTtBQUVyRSxnRkFBNEM7QUFDNUMsa0ZBQW1EO0FBQ25ELE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUUvQixNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUU5QyxNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDOzt1QkFFTixDQUFDLENBQUM7QUFDekIsOEVBQThFO0FBSTlFLE1BQXFCLFlBQVk7SUFLL0IsWUFBWSxPQUF3QjtRQUg1QixrQkFBYSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1FBQzFDLFlBQU8sR0FBRyxJQUFJLEdBQUcsRUFBdUIsQ0FBQztRQUcvQyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNqRCxDQUFDO0lBRUQsS0FBSztRQUNILElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDdkIsQ0FBQztJQUVPLFFBQVEsQ0FBQyxJQUFZLEVBQUUsZ0JBQXlCO1FBQ3RELGdDQUFnQztRQUNoQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM5QyxJQUFJLFFBQVEsS0FBSyxTQUFTO1lBQ3hCLE9BQU8sUUFBUSxDQUFDO1FBQ2xCLElBQUksRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxjQUFj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RCxPQUFPO0FBQ1Asc0JBQXNCO0FBQ3RCLE1BQU07QUFDTixZQUFZO0FBQ1osbURBQW1EO0FBQ25ELHNCQUFzQjtBQUN0QixNQUFNO0FBQ04sS0FBSztBQUVMLHNEQUFzRDtBQUN0RCxpREFBaUQ7QUFDakQsYUFBYTtBQUViLGtDQUFrQztBQUNsQyxpQ0FBaUM7QUFDakMsMEJBQTBCO0FBRTFCLGdDQUFnQztBQUNoQyxxQ0FBcUM7QUFDckMsK0JBQStCO0FBQy9CLGlDQUFpQztBQUNqQywyQ0FBMkM7QUFDM0MsV0FBVztBQUNYLDJDQUEyQztBQUMzQyxjQUFjO0FBQ2Qsd0dBQXdHO0FBQ3hHLGlDQUFpQztBQUNqQywrRkFBK0Y7QUFDL0YseUZBQXlGO0FBQ3pGLHlDQUF5QztBQUN6Qyx3RUFBd0U7QUFDeEUsdUNBQXVDO0FBQ3ZDLGlDQUFpQztBQUNqQywyQkFBMkI7QUFDM0Isc0JBQXNCO0FBQ3RCLE9BQU87QUFDUCxNQUFNO0FBQ04sS0FBSztBQUNMLGVBQWU7QUFDZixJQUFJO0FBRUo7Ozs7R0FJRztBQUNILHFHQUFxRztBQUNyRyw0REFBNEQ7QUFDNUQsSUFBSSIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9uZy10cy1yZXBsYWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbWF4LWxpbmUtbGVuZ3RoICovXG5pbXBvcnQgeyByZWFkVHNDb25maWcsIHRyYW5zcGlsZVNpbmdsZVRzIH0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3RzLWNvbXBpbGVyJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHsgcmVzb2x2ZSB9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsgT2JzZXJ2YWJsZSwgb2YsIHRocm93RXJyb3IgfSBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgeyByZXBsYWNlSHRtbCB9IGZyb20gJy4vbmctYW90LWFzc2V0cyc7XG5pbXBvcnQgeyBBbmd1bGFyQ2xpUGFyYW0gfSBmcm9tICcuL25nL2NvbW1vbic7XG5pbXBvcnQgeyBmaW5kQXBwTW9kdWxlRmlsZUZyb21NYWluIH0gZnJvbSAnLi91dGlscy9wYXJzZS1hcHAtbW9kdWxlJztcbmltcG9ydCB7IEhvb2tSZWFkRnVuYyB9IGZyb20gJy4vdXRpbHMvcmVhZC1ob29rLXZmc2hvc3QnO1xuaW1wb3J0IFNlbGVjdG9yIGZyb20gJy4vdXRpbHMvdHMtYXN0LXF1ZXJ5JztcbmltcG9ydCBBcGlBb3RDb21waWxlciBmcm9tICcuL3V0aWxzL3RzLWJlZm9yZS1hb3QnO1xuY29uc3QgY2hhbGsgPSByZXF1aXJlKCdjaGFsaycpO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSk7XG5cbmNvbnN0IGFwaVRtcGxUcyA9IF8udGVtcGxhdGUoJ2ltcG9ydCBfX0RyQXBpIGZyb20gXFwnQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvc3JjL2FwcC9hcGlcXCc7XFxcbnZhciBfX2FwaSA9IF9fRHJBcGkuZ2V0Q2FjaGVkQXBpKFxcJzwlPXBhY2thZ2VOYW1lJT5cXCcpIHx8IG5ldyBfX0RyQXBpKFxcJzwlPXBhY2thZ2VOYW1lJT5cXCcpO1xcXG5fX2FwaS5kZWZhdWx0ID0gX19hcGk7Jyk7XG4vLyBjb25zdCBpbmNsdWRlVHNGaWxlID0gUGF0aC5qb2luKF9fZGlybmFtZSwgJy4uJywgJ3NyYycsICdkcmNwLWluY2x1ZGUudHMnKTtcblxuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRTUmVhZEhvb2tlciB7XG4gIGhvb2tGdW5jOiBIb29rUmVhZEZ1bmM7XG4gIHByaXZhdGUgcmVhbEZpbGVDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIHByaXZhdGUgdHNDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBBcnJheUJ1ZmZlcj4oKTtcblxuICBjb25zdHJ1Y3RvcihuZ1BhcmFtOiBBbmd1bGFyQ2xpUGFyYW0pIHtcbiAgICB0aGlzLmhvb2tGdW5jID0gdGhpcy5jcmVhdGVUc1JlYWRIb29rKG5nUGFyYW0pO1xuICB9XG5cbiAgY2xlYXIoKSB7XG4gICAgdGhpcy50c0NhY2hlLmNsZWFyKCk7XG4gIH1cblxuICBwcml2YXRlIHJlYWxGaWxlKGZpbGU6IHN0cmluZywgcHJlc2VydmVTeW1saW5rczogYm9vbGVhbik6IHN0cmluZyB7XG4gICAgLy8gbG9nLmluZm8oYHJlYWRGaWxlICR7ZmlsZX1gKTtcbiAgICBjb25zdCByZWFsRmlsZSA9IHRoaXMucmVhbEZpbGVDYWNoZS5nZXQoZmlsZSk7XG4gICAgaWYgKHJlYWxGaWxlICE9PSB1bmRlZmluZWQpXG4gICAgICByZXR1cm4gcmVhbEZpbGU7XG4gICAgaWYgKGZzLmxzdGF0U3luYyhmaWxlKS5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICBpZiAoIXByZXNlcnZlU3ltbGlua3MpXG4gICAgICAgIGxvZy53YXJuKGBSZWFkaW5nIGEgc3ltbGluazogJHtmaWxlfSwgYnV0IFwicHJlc2VydmVTeW1saW5rc1wiIGlzIGZhbHNlLmApO1xuICAgICAgY29uc3QgcmYgPSBmcy5yZWFscGF0aFN5bmMoZmlsZSk7XG4gICAgICB0aGlzLnJlYWxGaWxlQ2FjaGUuc2V0KGZpbGUsIHJmKTtcbiAgICAgIHJldHVybiByZjtcbiAgICB9IGVsc2VcbiAgICAgIHJldHVybiBmaWxlO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVUc1JlYWRIb29rKG5nUGFyYW06IEFuZ3VsYXJDbGlQYXJhbSk6IEhvb2tSZWFkRnVuYyB7XG4gICAgLy8gbGV0IGRyY3BJbmNsdWRlQnVmOiBBcnJheUJ1ZmZlcjtcblxuICAgIGNvbnN0IHRzY29uZmlnRmlsZSA9IG5nUGFyYW0uYnJvd3Nlck9wdGlvbnMudHNDb25maWc7XG5cbiAgICAvLyBjb25zdCBobXJFbmFibGVkID0gXy5nZXQobmdQYXJhbSwgJ2J1aWxkZXJDb25maWcub3B0aW9ucy5obXInKSB8fCBhcGkuYXJndi5obXI7XG4gICAgY29uc3QgcHJlc2VydmVTeW1saW5rcyA9IG5nUGFyYW0uYnJvd3Nlck9wdGlvbnMucHJlc2VydmVTeW1saW5rcyAhPSBudWxsID8gbmdQYXJhbS5icm93c2VyT3B0aW9ucy5wcmVzZXJ2ZVN5bWxpbmtzIDpcbiAgICAgIGZhbHNlO1xuICAgIGNvbnN0IHRzQ29tcGlsZXJPcHRpb25zID0gcmVhZFRzQ29uZmlnKHRzY29uZmlnRmlsZSk7XG4gICAgLy8gbGV0IHBvbHlmaWxsc0ZpbGU6IHN0cmluZyA9ICcnO1xuICAgIC8vIGlmIChuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLnBvbHlmaWxscylcbiAgICAvLyBcdHBvbHlmaWxsc0ZpbGUgPSBuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLnBvbHlmaWxscy5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cbiAgICBjb25zdCBhcHBNb2R1bGVGaWxlID0gZmluZEFwcE1vZHVsZUZpbGVGcm9tTWFpbihyZXNvbHZlKG5nUGFyYW0uYnJvd3Nlck9wdGlvbnMubWFpbikpO1xuICAgIGxvZy5pbmZvKCdhcHAgbW9kdWxlIGZpbGU6ICcsIGFwcE1vZHVsZUZpbGUpO1xuXG4gICAgY29uc3QgaXNBb3QgPSBuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLmFvdDtcblxuICAgIHJldHVybiAoZmlsZTogc3RyaW5nLCBidWY6IEFycmF5QnVmZmVyKTogT2JzZXJ2YWJsZTxBcnJheUJ1ZmZlcj4gPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKGlzQW90ICYmIGZpbGUuZW5kc1dpdGgoJy5jb21wb25lbnQuaHRtbCcpKSB7XG4gICAgICAgICAgY29uc3QgY2FjaGVkID0gdGhpcy50c0NhY2hlLmdldCh0aGlzLnJlYWxGaWxlKGZpbGUsIHByZXNlcnZlU3ltbGlua3MpKTtcbiAgICAgICAgICBpZiAoY2FjaGVkICE9IG51bGwpXG4gICAgICAgICAgICByZXR1cm4gb2YoY2FjaGVkKTtcbiAgICAgICAgICByZXR1cm4gb2Yoc3RyaW5nMmJ1ZmZlcihyZXBsYWNlSHRtbChmaWxlLCBCdWZmZXIuZnJvbShidWYpLnRvU3RyaW5nKCkpKSk7XG5cbiAgICAgICAgfSBlbHNlIGlmICghZmlsZS5lbmRzV2l0aCgnLnRzJykgfHwgZmlsZS5lbmRzV2l0aCgnLmQudHMnKSkge1xuICAgICAgICAgIHJldHVybiBvZihidWYpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY2FjaGVkID0gdGhpcy50c0NhY2hlLmdldCh0aGlzLnJlYWxGaWxlKGZpbGUsIHByZXNlcnZlU3ltbGlua3MpKTtcbiAgICAgICAgaWYgKGNhY2hlZCAhPSBudWxsKVxuICAgICAgICAgIHJldHVybiBvZihjYWNoZWQpO1xuICAgICAgICAvLyBsZXQgbm9ybWFsRmlsZSA9IHJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGZpbGUpO1xuICAgICAgICAvLyBpZiAoU0VQID09PSAnXFxcXCcpXG4gICAgICAgIC8vIFx0bm9ybWFsRmlsZSA9IG5vcm1hbEZpbGUucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICAvLyBpZiAoaG1yRW5hYmxlZCAmJiBwb2x5ZmlsbHNGaWxlICYmIG5vcm1hbEZpbGUgPT09IHBvbHlmaWxsc0ZpbGUpIHtcbiAgICAgICAgLy8gXHRjb25zdCBobXJDbGllbnQgPSAnXFxuaW1wb3J0IFxcJ3dlYnBhY2staG90LW1pZGRsZXdhcmUvY2xpZW50XFwnOyc7XG4gICAgICAgIC8vIFx0Y29uc3QgY29udGVudCA9IEJ1ZmZlci5mcm9tKGJ1ZikudG9TdHJpbmcoKSArIGhtckNsaWVudDtcbiAgICAgICAgLy8gXHRsb2cuaW5mbyhgQXBwZW5kIHRvICR7bm9ybWFsRmlsZX06IFxcbmltcG9ydCBcXCd3ZWJwYWNrLWhvdC1taWRkbGV3YXJlL2NsaWVudFxcJztgKTtcbiAgICAgICAgLy8gXHRjb25zdCBiZiA9IHN0cmluZzJidWZmZXIoY29udGVudCk7XG4gICAgICAgIC8vIFx0dGhpcy50c0NhY2hlLnNldCh0aGlzLnJlYWxGaWxlKGZpbGUsIHByZXNlcnZlU3ltbGlua3MpLCBiZik7XG4gICAgICAgIC8vIFx0cmV0dXJuIG9mKGJmKTtcbiAgICAgICAgLy8gfSBlbHNlIGlmIChub3JtYWxGaWxlLmVuZHNXaXRoKCcvZHJjcC1pbmNsdWRlLnRzJykpIHtcbiAgICAgICAgLy8gXHRpZiAoZHJjcEluY2x1ZGVCdWYpXG4gICAgICAgIC8vIFx0XHRyZXR1cm4gb2YoZHJjcEluY2x1ZGVCdWYpO1xuICAgICAgICAvLyBcdGxldCBjb250ZW50ID0gQnVmZmVyLmZyb20oYnVmKS50b1N0cmluZygpO1xuICAgICAgICAvLyBcdGNvbnN0IGxlZ29Db25maWcgPSBicm93c2VyTGVnb0NvbmZpZygpO1xuICAgICAgICAvLyBcdGxldCBobXJCb290OiBzdHJpbmc7XG4gICAgICAgIC8vIFx0aWYgKGhtckVuYWJsZWQpIHtcbiAgICAgICAgLy8gXHRcdGNvbnRlbnQgPSAnaW1wb3J0IGhtckJvb3RzdHJhcCBmcm9tIFxcJy4vaG1yXFwnO1xcbicgKyBjb250ZW50O1xuICAgICAgICAvLyBcdFx0aG1yQm9vdCA9ICdobXJCb290c3RyYXAobW9kdWxlLCBib290c3RyYXApJztcbiAgICAgICAgLy8gXHR9XG4gICAgICAgIC8vIFx0aWYgKCFuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLmFvdCkge1xuICAgICAgICAvLyBcdFx0Y29udGVudCA9ICdpbXBvcnQgXFwnY29yZS1qcy9lczcvcmVmbGVjdFxcJztcXG4nICsgY29udGVudDtcbiAgICAgICAgLy8gXHR9XG4gICAgICAgIC8vIFx0aWYgKGhtckJvb3QpXG4gICAgICAgIC8vIFx0XHRjb250ZW50ID0gY29udGVudC5yZXBsYWNlKC9cXC9cXCogcmVwbGFjZSBcXCpcXC9ib290c3RyYXBcXChcXCkvZywgaG1yQm9vdCk7XG4gICAgICAgIC8vIFx0aWYgKG5nUGFyYW0uc3NyKSB7XG4gICAgICAgIC8vIFx0XHRjb250ZW50ICs9ICdcXG5jb25zb2xlLmxvZyhcInNldCBnbG9iYWwuTEVHT19DT05GSUdcIik7JztcbiAgICAgICAgLy8gXHRcdGNvbnRlbnQgKz0gJ1xcbk9iamVjdC5hc3NpZ24oZ2xvYmFsLCB7XFxcbiAgICAgICAgLy8gXHRcdFx0X19kcmNwRW50cnlQYWdlOiBudWxsLCBcXFxuICAgICAgICAvLyBcdFx0XHRfX2RyY3BFbnRyeVBhY2thZ2U6IG51bGxcXFxuICAgICAgICAvLyBcdFx0fSk7XFxuJztcbiAgICAgICAgLy8gXHRcdGNvbnRlbnQgKz0gJyhnbG9iYWwgYXMgYW55KSc7XG4gICAgICAgIC8vIFx0fSBlbHNlIHtcbiAgICAgICAgLy8gXHRcdGNvbnRlbnQgKz0gJ1xcbk9iamVjdC5hc3NpZ24od2luZG93LCB7XFxcbiAgICAgICAgLy8gXHRcdFx0X19kcmNwRW50cnlQYWdlOiBudWxsLCBcXFxuICAgICAgICAvLyBcdFx0XHRfX2RyY3BFbnRyeVBhY2thZ2U6IG51bGxcXFxuICAgICAgICAvLyBcdFx0fSk7XFxuJztcbiAgICAgICAgLy8gXHRcdGNvbnRlbnQgKz0gJ1xcbih3aW5kb3cgYXMgYW55KSc7XG4gICAgICAgIC8vIFx0fVxuICAgICAgICAvLyBcdGNvbnRlbnQgKz0gYC5MRUdPX0NPTkZJRyA9ICR7SlNPTi5zdHJpbmdpZnkobGVnb0NvbmZpZywgbnVsbCwgJyAgJyl9O1xcbmA7XG4gICAgICAgIC8vIFx0ZHJjcEluY2x1ZGVCdWYgPSBzdHJpbmcyYnVmZmVyKGNvbnRlbnQpO1xuICAgICAgICAvLyBcdGxvZy5pbmZvKGNoYWxrLmN5YW4oZmlsZSkgKyAnOlxcbicgKyBjb250ZW50KTtcbiAgICAgICAgLy8gXHR0aGlzLnRzQ2FjaGUuc2V0KHRoaXMucmVhbEZpbGUoZmlsZSwgcHJlc2VydmVTeW1saW5rcyksIGRyY3BJbmNsdWRlQnVmKTtcbiAgICAgICAgLy8gXHRyZXR1cm4gb2YoZHJjcEluY2x1ZGVCdWYpO1xuICAgICAgICAvLyB9XG4gICAgICAgIGNvbnN0IGNvbXBQa2cgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoZmlsZSk7XG4gICAgICAgIGxldCBjb250ZW50ID0gQnVmZmVyLmZyb20oYnVmKS50b1N0cmluZygpO1xuICAgICAgICBsZXQgbmVlZExvZ0ZpbGUgPSBmYWxzZTtcbiAgICAgICAgLy8gcGF0Y2ggYXBwLm1vZHVsZS50c1xuICAgICAgICAvLyBpZiAoYXBwTW9kdWxlRmlsZSA9PT0gZmlsZSkge1xuICAgICAgICAvLyBcdGxvZy5pbmZvKCdwYXRjaCcsIGZpbGUpO1xuICAgICAgICAvLyBcdGNvbnN0IGFwcE1vZHVsZVBhY2thZ2UgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoYXBwTW9kdWxlRmlsZSk7XG4gICAgICAgIC8vIFx0Y29uc3QgcmVtb3ZhYmxlcyA9IHJlbW92YWJsZU5nTW9kdWxlcyhhcHBNb2R1bGVQYWNrYWdlLCBkaXJuYW1lKGFwcE1vZHVsZUZpbGUpKTtcbiAgICAgICAgLy8gXHRjb25zdCBuZ01vZHVsZXM6IHN0cmluZ1tdID0gZ2V0Um91dGVyTW9kdWxlcyhhcHBNb2R1bGVQYWNrYWdlLCBkaXJuYW1lKGFwcE1vZHVsZUZpbGUpKSB8fCByZW1vdmFibGVzO1xuICAgICAgICAvLyBcdC8vIG5nTW9kdWxlcy5wdXNoKGFwaS5wYWNrYWdlTmFtZSArICcvc3JjL2FwcCNEZXZlbG9wZXJNb2R1bGUnKTtcbiAgICAgICAgLy8gXHRsb2cuaW5mbygnSW5zZXJ0IG9wdGlvbmFsIE5nTW9kdWxlcyB0byBBcHBNb2R1bGU6XFxuICAnICsgbmdNb2R1bGVzLmpvaW4oJ1xcbiAgJykpO1xuICAgICAgICAvLyBcdGNvbnRlbnQgPSBuZXcgQXBwTW9kdWxlUGFyc2VyKClcbiAgICAgICAgLy8gXHRcdC5wYXRjaEZpbGUoZmlsZSwgY29udGVudCwgcmVtb3ZhYmxlcywgbmdNb2R1bGVzKTtcbiAgICAgICAgLy8gXHRuZWVkTG9nRmlsZSA9IHRydWU7XG4gICAgICAgIC8vIH1cbiAgICAgICAgY29uc3QgdHNTZWxlY3RvciA9IG5ldyBTZWxlY3Rvcihjb250ZW50LCBmaWxlKTtcbiAgICAgICAgY29uc3QgaGFzSW1wb3J0QXBpID0gdHNTZWxlY3Rvci5maW5kQWxsKCc6SW1wb3J0RGVjbGFyYXRpb24+Lm1vZHVsZVNwZWNpZmllcjpTdHJpbmdMaXRlcmFsJykuc29tZShhc3QgPT4ge1xuICAgICAgICAgIHJldHVybiAoYXN0IGFzIHRzLlN0cmluZ0xpdGVyYWwpLnRleHQgPT09ICdfX2FwaSc7XG4gICAgICAgIH0pO1xuICAgICAgICBsZXQgY2hhbmdlZCA9IGFwaS5icm93c2VySW5qZWN0b3IuaW5qZWN0VG9GaWxlKGZpbGUsIGNvbnRlbnQpO1xuXG4gICAgICAgIGNoYW5nZWQgPSBuZXcgQXBpQW90Q29tcGlsZXIoZmlsZSwgY2hhbmdlZCkucGFyc2Uoc291cmNlID0+IHRyYW5zcGlsZVNpbmdsZVRzKHNvdXJjZSwgdHNDb21waWxlck9wdGlvbnMpKTtcbiAgICAgICAgaWYgKGhhc0ltcG9ydEFwaSlcbiAgICAgICAgICBjaGFuZ2VkID0gYXBpVG1wbFRzKHtwYWNrYWdlTmFtZTogY29tcFBrZy5sb25nTmFtZX0pICsgJ1xcbicgKyBjaGFuZ2VkO1xuICAgICAgICAvLyBpZiAoY2hhbmdlZCAhPT0gY29udGVudCAmJiBuZ1BhcmFtLnNzcikge1xuICAgICAgICAvLyBcdGNoYW5nZWQgPSAnaW1wb3J0IFwiQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvc3JjL2RyY3AtaW5jbHVkZVwiO1xcbicgKyBjaGFuZ2VkO1xuICAgICAgICAvLyB9XG4gICAgICAgIGlmIChuZWVkTG9nRmlsZSlcbiAgICAgICAgICBsb2cuaW5mbyhjaGFsay5jeWFuKGZpbGUpICsgJzpcXG4nICsgY2hhbmdlZCk7XG4gICAgICAgIGNvbnN0IGJmID0gc3RyaW5nMmJ1ZmZlcihjaGFuZ2VkKTtcbiAgICAgICAgdGhpcy50c0NhY2hlLnNldCh0aGlzLnJlYWxGaWxlKGZpbGUsIHByZXNlcnZlU3ltbGlua3MpLCBiZik7XG4gICAgICAgIHJldHVybiBvZihiZik7XG4gICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICBsb2cuZXJyb3IoZXgpO1xuICAgICAgICByZXR1cm4gdGhyb3dFcnJvcihleCk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RyaW5nMmJ1ZmZlcihpbnB1dDogc3RyaW5nKTogQXJyYXlCdWZmZXIge1xuICBjb25zdCBub2RlQnVmID0gQnVmZmVyLmZyb20oaW5wdXQpO1xuICBjb25zdCBsZW4gPSBub2RlQnVmLmJ5dGVMZW5ndGg7XG4gIGNvbnN0IG5ld0J1ZiA9IG5ldyBBcnJheUJ1ZmZlcihsZW4pO1xuICBjb25zdCBkYXRhVmlldyA9IG5ldyBEYXRhVmlldyhuZXdCdWYpO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgZGF0YVZpZXcuc2V0VWludDgoaSwgbm9kZUJ1Zi5yZWFkVUludDgoaSkpO1xuICB9XG4gIHJldHVybiBuZXdCdWY7XG59XG5cbi8vIGZ1bmN0aW9uIGJyb3dzZXJMZWdvQ29uZmlnKCkge1xuLy8gXHR2YXIgYnJvd3NlclByb3BTZXQ6IGFueSA9IHt9O1xuLy8gXHR2YXIgbGVnb0NvbmZpZzogYW55ID0ge307IC8vIGxlZ29Db25maWcgaXMgZ2xvYmFsIGNvbmZpZ3VyYXRpb24gcHJvcGVydGllcyB3aGljaCBhcHBseSB0byBhbGwgZW50cmllcyBhbmQgbW9kdWxlc1xuLy8gXHRfLmVhY2goW1xuLy8gXHRcdCdzdGF0aWNBc3NldHNVUkwnLCAnc2VydmVyVVJMJywgJ3BhY2thZ2VDb250ZXh0UGF0aE1hcHBpbmcnLFxuLy8gXHRcdCdsb2NhbGVzJywgJ2Rldk1vZGUnLCAnb3V0cHV0UGF0aE1hcCdcbi8vIFx0XSwgcHJvcCA9PiBicm93c2VyUHJvcFNldFtwcm9wXSA9IDEpO1xuLy8gXHRfLmVhY2goYXBpLmNvbmZpZygpLmJyb3dzZXJTaWRlQ29uZmlnUHJvcCwgcHJvcCA9PiBicm93c2VyUHJvcFNldFtwcm9wXSA9IHRydWUpO1xuLy8gXHRfLmZvck93bihicm93c2VyUHJvcFNldCwgKG5vdGhpbmcsIHByb3BQYXRoKSA9PiBfLnNldChsZWdvQ29uZmlnLCBwcm9wUGF0aCwgXy5nZXQoYXBpLmNvbmZpZygpLCBwcm9wUGF0aCkpKTtcbi8vIFx0dmFyIGNvbXByZXNzZWRJbmZvID0gY29tcHJlc3NPdXRwdXRQYXRoTWFwKGxlZ29Db25maWcub3V0cHV0UGF0aE1hcCk7XG4vLyBcdGxlZ29Db25maWcub3V0cHV0UGF0aE1hcCA9IGNvbXByZXNzZWRJbmZvLmRpZmZNYXA7XG4vLyBcdGxlZ29Db25maWcuX291dHB1dEFzTmFtZXMgPSBjb21wcmVzc2VkSW5mby5zYW1lcztcbi8vIFx0bGVnb0NvbmZpZy5idWlsZExvY2FsZSA9IGFwaS5nZXRCdWlsZExvY2FsZSgpO1xuLy8gXHRsb2cuZGVidWcoJ0RlZmluZVBsdWdpbiBMRUdPX0NPTkZJRzogJywgbGVnb0NvbmZpZyk7XG4vLyBcdHJldHVybiBsZWdvQ29uZmlnO1xuLy8gfVxuXG4vLyBmdW5jdGlvbiBjb21wcmVzc091dHB1dFBhdGhNYXAocGF0aE1hcDogYW55KSB7XG4vLyBcdHZhciBuZXdNYXA6IGFueSA9IHt9O1xuLy8gXHR2YXIgc2FtZUFzTmFtZXM6IHN0cmluZ1tdID0gW107XG4vLyBcdF8uZWFjaChwYXRoTWFwLCAodmFsdWUsIGtleSkgPT4ge1xuLy8gXHRcdHZhciBwYXJzZWQgPSBhcGkucGFja2FnZVV0aWxzLnBhcnNlTmFtZShrZXkpO1xuLy8gXHRcdGlmIChwYXJzZWQubmFtZSAhPT0gdmFsdWUpIHtcbi8vIFx0XHRcdG5ld01hcFtrZXldID0gdmFsdWU7XG4vLyBcdFx0fSBlbHNlIHtcbi8vIFx0XHRcdHNhbWVBc05hbWVzLnB1c2goa2V5KTtcbi8vIFx0XHR9XG4vLyBcdH0pO1xuLy8gXHRyZXR1cm4ge1xuLy8gXHRcdHNhbWVzOiBzYW1lQXNOYW1lcyxcbi8vIFx0XHRkaWZmTWFwOiBuZXdNYXBcbi8vIFx0fTtcbi8vIH1cblxuLy8gZnVuY3Rpb24gZ2V0Um91dGVyTW9kdWxlcyhhcHBNb2R1bGVQYWNrYWdlOiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlLCBhcHBNb2R1bGVEaXI6IHN0cmluZykge1xuLy8gXHRjb25zdCBuZ01vZHVsZXM6IHN0cmluZ1tdID0gYXBpLmNvbmZpZy5nZXQoW2FwaS5wYWNrYWdlTmFtZSwgJ25nTW9kdWxlJ10pIHx8IFtdO1xuLy8gXHRjb25zdCBuZ1BhY2thZ2VNb2R1bGVzID0gbmV3IFNldChwYWNrYWdlTmFtZXMyTmdNb2R1bGUoYXBwTW9kdWxlUGFja2FnZSwgYXBwTW9kdWxlRGlyLFxuLy8gXHRcdGFwaS5jb25maWcuZ2V0KFthcGkucGFja2FnZU5hbWUsICduZ1BhY2thZ2UnXSkgfHwgW10pKTtcbi8vIFx0bmdNb2R1bGVzLmZvckVhY2gobSA9PiBuZ1BhY2thZ2VNb2R1bGVzLmFkZChtKSk7XG4vLyBcdHJldHVybiBBcnJheS5mcm9tKG5nUGFja2FnZU1vZHVsZXMpO1xuLy8gfVxuXG4vLyBmdW5jdGlvbiBwYWNrYWdlTmFtZXMyTmdNb2R1bGUoYXBwTW9kdWxlUGs6IFBhY2thZ2VCcm93c2VySW5zdGFuY2UsIGFwcE1vZHVsZURpcjogc3RyaW5nLCBpbmNsdWRlUGFja2FnZXM/OiBzdHJpbmdbXSk6IHN0cmluZ1tdIHtcbi8vIFx0Y29uc3QgcmVzOiBzdHJpbmdbXSA9IFtdO1xuLy8gXHRpZiAoaW5jbHVkZVBhY2thZ2VzKSB7XG4vLyBcdFx0Zm9yIChjb25zdCBuYW1lIG9mIGluY2x1ZGVQYWNrYWdlcykge1xuLy8gXHRcdFx0bGV0IHBrID0gYXBpLnBhY2thZ2VJbmZvLm1vZHVsZU1hcFtuYW1lXTtcbi8vIFx0XHRcdGlmIChwayA9PSBudWxsKSB7XG4vLyBcdFx0XHRcdGNvbnN0IHNjb3BlID0gKGFwaS5jb25maWcuZ2V0KCdwYWNrYWdlU2NvcGVzJykgYXMgc3RyaW5nW10pLmZpbmQoc2NvcGUgPT4ge1xuLy8gXHRcdFx0XHRcdHJldHVybiBhcGkucGFja2FnZUluZm8ubW9kdWxlTWFwW2BAJHtzY29wZX0vJHtuYW1lfWBdICE9IG51bGw7XG4vLyBcdFx0XHRcdH0pO1xuLy8gXHRcdFx0XHRpZiAoc2NvcGUgPT0gbnVsbCkge1xuLy8gXHRcdFx0XHRcdGxvZy5lcnJvcignUGFja2FnZSBuYW1lZDogXCIlc1wiIGlzIG5vdCBmb3VuZCB3aXRoIHBvc3NpYmxlIHNjb3BlIG5hbWUgaW4gXCIlc1wiJywgbmFtZSxcbi8vIFx0XHRcdFx0XHRcdChhcGkuY29uZmlnLmdldCgncGFja2FnZVNjb3BlcycpIGFzIHN0cmluZ1tdKS5qb2luKCcsICcpKTtcbi8vIFx0XHRcdFx0XHRicmVhaztcbi8vIFx0XHRcdFx0fVxuLy8gXHRcdFx0XHRwayA9IGFwaS5wYWNrYWdlSW5mby5tb2R1bGVNYXBbYEAke3Njb3BlfS8ke25hbWV9YF07XG4vLyBcdFx0XHR9XG4vLyBcdFx0XHRlYWNoUGFja2FnZShwayk7XG4vLyBcdFx0fVxuLy8gXHR9IGVsc2Uge1xuLy8gXHRcdGZvciAoY29uc3QgcGsgb2YgYXBpLnBhY2thZ2VJbmZvLmFsbE1vZHVsZXMpIHtcbi8vIFx0XHRcdGVhY2hQYWNrYWdlKHBrKTtcbi8vIFx0XHR9XG4vLyBcdH1cblxuLy8gXHRmdW5jdGlvbiBlYWNoUGFja2FnZShwazogUGFja2FnZUJyb3dzZXJJbnN0YW5jZSkge1xuLy8gXHRcdGlmIChway5kciA9PSBudWxsIHx8IHBrLmRyLm5nTW9kdWxlID09IG51bGwpXG4vLyBcdFx0XHRyZXR1cm47XG5cbi8vIFx0XHRsZXQgbW9kdWxlcyA9IHBrLmRyLm5nTW9kdWxlO1xuLy8gXHRcdGlmICghQXJyYXkuaXNBcnJheShtb2R1bGVzKSlcbi8vIFx0XHRcdG1vZHVsZXMgPSBbbW9kdWxlc107XG5cbi8vIFx0XHRmb3IgKGxldCBuYW1lIG9mIG1vZHVsZXMpIHtcbi8vIFx0XHRcdG5hbWUgPSBfLnRyaW1TdGFydChuYW1lLCAnLi8nKTtcbi8vIFx0XHRcdGlmIChwayAhPT0gYXBwTW9kdWxlUGspIHtcbi8vIFx0XHRcdFx0aWYgKG5hbWUuaW5kZXhPZignIycpIDwgMClcbi8vIFx0XHRcdFx0XHRyZXMucHVzaChway5sb25nTmFtZSArICcjJyArIG5hbWUpO1xuLy8gXHRcdFx0XHRlbHNlXG4vLyBcdFx0XHRcdFx0cmVzLnB1c2gocGsubG9uZ05hbWUgKyAnLycgKyBuYW1lKTtcbi8vIFx0XHRcdH0gZWxzZSB7XG4vLyBcdFx0XHRcdC8vIHBhY2thZ2UgaXMgc2FtZSBhcyB0aGUgb25lIGFwcC5tb2R1bGUgYmVsb25ncyB0bywgd2UgdXNlIHJlbGF0aXZlIHBhdGggaW5zdGVhZCBvZiBwYWNrYWdlIG5hbWVcbi8vIFx0XHRcdFx0aWYgKG5hbWUuaW5kZXhPZignIycpIDwgMClcbi8vIFx0XHRcdFx0XHR0aHJvdyBuZXcgRXJyb3IoYEluICR7cGsucmVhbFBhY2thZ2VQYXRofS9wYWNrYWdlLmpzb24sIHZhbHVlIG9mIFwiZHIubmdNb2R1bGVcIiBhcnJheWAgK1xuLy8gXHRcdFx0XHRcdFx0YG11c3QgYmUgaW4gZm9ybSBvZiAnPHBhdGg+IzxleHBvcnQgTmdNb2R1bGUgbmFtZT4nLCBidXQgaGVyZSBpdCBpcyAnJHtuYW1lfSdgKTtcbi8vIFx0XHRcdFx0Y29uc3QgbmFtZVBhcnRzID0gbmFtZS5zcGxpdCgnIycpO1xuLy8gXHRcdFx0XHRuYW1lID0gcmVsYXRpdmUoYXBwTW9kdWxlRGlyLCBuYW1lUGFydHNbMF0pICsgJyMnICsgbmFtZVBhcnRzWzFdO1xuLy8gXHRcdFx0XHRuYW1lID0gbmFtZS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4vLyBcdFx0XHRcdGlmICghbmFtZS5zdGFydHNXaXRoKCcuJykpXG4vLyBcdFx0XHRcdFx0bmFtZSA9ICcuLycgKyBuYW1lO1xuLy8gXHRcdFx0XHRyZXMucHVzaChuYW1lKTtcbi8vIFx0XHRcdH1cbi8vIFx0XHR9XG4vLyBcdH1cbi8vIFx0cmV0dXJuIHJlcztcbi8vIH1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSBhcHBNb2R1bGVQa05hbWUgcGFja2FnZSBuYW1lIG9mIHRoZSBvbmUgY29udGFpbnMgYXBwLm1vZHVsZS50c1xuICogQHBhcmFtIGFwcE1vZHVsZURpciBhcHAubW9kdWxlLnRzJ3MgZGlyZWN0b3J5LCB1c2VkIHRvIGNhbGN1bGF0ZSByZWxhdGl2ZSBwYXRoXG4gKi9cbi8vIGZ1bmN0aW9uIHJlbW92YWJsZU5nTW9kdWxlcyhhcHBNb2R1bGVQazogUGFja2FnZUJyb3dzZXJJbnN0YW5jZSwgYXBwTW9kdWxlRGlyOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4vLyBcdHJldHVybiBwYWNrYWdlTmFtZXMyTmdNb2R1bGUoYXBwTW9kdWxlUGssIGFwcE1vZHVsZURpcik7XG4vLyB9XG4iXX0=
