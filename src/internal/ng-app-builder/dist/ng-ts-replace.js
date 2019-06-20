"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const ts_compiler_1 = require("dr-comp-package/wfh/dist/ts-compiler");
const fs = tslib_1.__importStar(require("fs"));
const _ = tslib_1.__importStar(require("lodash"));
const log4js = tslib_1.__importStar(require("log4js"));
const path_1 = require("path");
const rxjs_1 = require("rxjs");
const __api_1 = tslib_1.__importDefault(require("__api"));
const ng_aot_assets_1 = require("./ng-aot-assets");
const parse_app_module_1 = tslib_1.__importStar(require("./utils/parse-app-module"));
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
        const preserveSymlinks = ngParam.browserOptions.preserveSymlinks;
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
                if (appModuleFile === file) {
                    log.info('patch', file);
                    const appModulePackage = __api_1.default.findPackageByFile(appModuleFile);
                    const removables = removableNgModules(appModulePackage, path_1.dirname(appModuleFile));
                    const ngModules = getRouterModules(appModulePackage, path_1.dirname(appModuleFile)) || removables;
                    // ngModules.push(api.packageName + '/src/app#DeveloperModule');
                    log.info('Insert optional NgModules to AppModule:\n  ' + ngModules.join('\n  '));
                    content = new parse_app_module_1.default()
                        .patchFile(file, content, removables, ngModules);
                    needLogFile = true;
                }
                const tsSelector = new ts_ast_query_1.default(content, file);
                const hasImportApi = tsSelector.findAll(':ImportDeclaration>.moduleSpecifier:StringLiteral').some(ast => {
                    return ast.text === '__api';
                });
                let changed = __api_1.default.browserInjector.injectToFile(file, content);
                changed = new ts_before_aot_1.default(file, changed).parse(source => ts_compiler_1.transpileSingleTs(source, tsCompilerOptions));
                if (hasImportApi)
                    changed = apiTmplTs({ packageName: compPkg.longName }) + '\n' + changed;
                if (changed !== content && ngParam.ssr) {
                    changed = 'import "@dr-core/ng-app-builder/src/drcp-include";\n' + changed;
                }
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
function getRouterModules(appModulePackage, appModuleDir) {
    const ngModules = __api_1.default.config.get([__api_1.default.packageName, 'ngModule']) || [];
    const ngPackageModules = new Set(packageNames2NgModule(appModulePackage, appModuleDir, __api_1.default.config.get([__api_1.default.packageName, 'ngPackage']) || []));
    ngModules.forEach(m => ngPackageModules.add(m));
    return Array.from(ngPackageModules);
}
function packageNames2NgModule(appModulePk, appModuleDir, includePackages) {
    const res = [];
    if (includePackages) {
        for (const name of includePackages) {
            let pk = __api_1.default.packageInfo.moduleMap[name];
            if (pk == null) {
                const scope = __api_1.default.config.get('packageScopes').find(scope => {
                    return __api_1.default.packageInfo.moduleMap[`@${scope}/${name}`] != null;
                });
                if (scope == null) {
                    log.error('Package named: "%s" is not found with possible scope name in "%s"', name, __api_1.default.config.get('packageScopes').join(', '));
                    break;
                }
                pk = __api_1.default.packageInfo.moduleMap[`@${scope}/${name}`];
            }
            eachPackage(pk);
        }
    }
    else {
        for (const pk of __api_1.default.packageInfo.allModules) {
            eachPackage(pk);
        }
    }
    function eachPackage(pk) {
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
            }
            else {
                // package is same as the one app.module belongs to, we use relative path instead of package name
                if (name.indexOf('#') < 0)
                    throw new Error(`In ${pk.realPackagePath}/package.json, value of "dr.ngModule" array` +
                        `must be in form of '<path>#<export NgModule name>', but here it is '${name}'`);
                const nameParts = name.split('#');
                name = path_1.relative(appModuleDir, nameParts[0]) + '#' + nameParts[1];
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
function removableNgModules(appModulePk, appModuleDir) {
    return packageNames2NgModule(appModulePk, appModuleDir);
}

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy10cy1yZXBsYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUVBLHNFQUF1RjtBQUN2RiwrQ0FBeUI7QUFDekIsa0RBQTRCO0FBQzVCLHVEQUFpQztBQUNqQywrQkFBa0Q7QUFDbEQsK0JBQWtEO0FBRWxELDBEQUF3QjtBQUN4QixtREFBOEM7QUFFOUMscUZBQXNGO0FBRXRGLGdGQUE0QztBQUM1QyxrRkFBbUQ7QUFDbkQsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBRS9CLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBRTlDLE1BQU0sU0FBUyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUM7O3VCQUVOLENBQUMsQ0FBQztBQUN6Qiw4RUFBOEU7QUFJOUUsTUFBcUIsWUFBWTtJQUtoQyxZQUFZLE9BQXdCO1FBSDVCLGtCQUFhLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFDMUMsWUFBTyxHQUFHLElBQUksR0FBRyxFQUF1QixDQUFDO1FBR2hELElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFFRCxLQUFLO1FBQ0osSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN0QixDQUFDO0lBRU8sUUFBUSxDQUFDLElBQVksRUFBRSxnQkFBeUI7UUFDdkQsZ0NBQWdDO1FBQ2hDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzlDLElBQUksUUFBUSxLQUFLLFNBQVM7WUFDekIsT0FBTyxRQUFRLENBQUM7UUFDakIsSUFBSSxFQUFFLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLGNBQWMsRUFBRSxFQUFFO1lB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QixHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDOztvQkFFbkMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQzthQUNwQztpQkFBTTtnQkFDTixpR0FBaUc7Z0JBQ2pHLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO29CQUN4QixNQUFNLElBQUksS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLGVBQWUsNkNBQTZDO3dCQUNwRix1RUFBdUUsSUFBSSxHQUFHLENBQUMsQ0FBQztnQkFDbEYsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDbEMsSUFBSSxHQUFHLGVBQVEsQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDakUsSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUNoQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7b0JBQ3hCLElBQUksR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDO2dCQUNwQixHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ2Y7U0FDRDtJQUNGLENBQUM7SUFDRCxPQUFPLEdBQUcsQ0FBQztBQUNaLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsU0FBUyxrQkFBa0IsQ0FBQyxXQUFtQyxFQUFFLFlBQW9CO0lBQ3BGLE9BQU8scUJBQXFCLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQyxDQUFDO0FBQ3pELENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvbmctdHMtcmVwbGFjZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG1heC1saW5lLWxlbmd0aCAqL1xuaW1wb3J0IFBhY2thZ2VCcm93c2VySW5zdGFuY2UgZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L2J1aWxkLXV0aWwvdHMvcGFja2FnZS1pbnN0YW5jZSc7XG5pbXBvcnQgeyByZWFkVHNDb25maWcsIHRyYW5zcGlsZVNpbmdsZVRzIH0gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3RzLWNvbXBpbGVyJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHsgZGlybmFtZSwgcmVsYXRpdmUsIHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IE9ic2VydmFibGUsIG9mLCB0aHJvd0Vycm9yIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0IHsgcmVwbGFjZUh0bWwgfSBmcm9tICcuL25nLWFvdC1hc3NldHMnO1xuaW1wb3J0IHsgQW5ndWxhckNsaVBhcmFtIH0gZnJvbSAnLi9uZy9jb21tb24nO1xuaW1wb3J0IEFwcE1vZHVsZVBhcnNlciwgeyBmaW5kQXBwTW9kdWxlRmlsZUZyb21NYWluIH0gZnJvbSAnLi91dGlscy9wYXJzZS1hcHAtbW9kdWxlJztcbmltcG9ydCB7IEhvb2tSZWFkRnVuYyB9IGZyb20gJy4vdXRpbHMvcmVhZC1ob29rLXZmc2hvc3QnO1xuaW1wb3J0IFNlbGVjdG9yIGZyb20gJy4vdXRpbHMvdHMtYXN0LXF1ZXJ5JztcbmltcG9ydCBBcGlBb3RDb21waWxlciBmcm9tICcuL3V0aWxzL3RzLWJlZm9yZS1hb3QnO1xuY29uc3QgY2hhbGsgPSByZXF1aXJlKCdjaGFsaycpO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKGFwaS5wYWNrYWdlTmFtZSk7XG5cbmNvbnN0IGFwaVRtcGxUcyA9IF8udGVtcGxhdGUoJ2ltcG9ydCBfX0RyQXBpIGZyb20gXFwnQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvc3JjL2FwcC9hcGlcXCc7XFxcbnZhciBfX2FwaSA9IF9fRHJBcGkuZ2V0Q2FjaGVkQXBpKFxcJzwlPXBhY2thZ2VOYW1lJT5cXCcpIHx8IG5ldyBfX0RyQXBpKFxcJzwlPXBhY2thZ2VOYW1lJT5cXCcpO1xcXG5fX2FwaS5kZWZhdWx0ID0gX19hcGk7Jyk7XG4vLyBjb25zdCBpbmNsdWRlVHNGaWxlID0gUGF0aC5qb2luKF9fZGlybmFtZSwgJy4uJywgJ3NyYycsICdkcmNwLWluY2x1ZGUudHMnKTtcblxuXG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRTUmVhZEhvb2tlciB7XG5cdGhvb2tGdW5jOiBIb29rUmVhZEZ1bmM7XG5cdHByaXZhdGUgcmVhbEZpbGVDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG5cdHByaXZhdGUgdHNDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBBcnJheUJ1ZmZlcj4oKTtcblxuXHRjb25zdHJ1Y3RvcihuZ1BhcmFtOiBBbmd1bGFyQ2xpUGFyYW0pIHtcblx0XHR0aGlzLmhvb2tGdW5jID0gdGhpcy5jcmVhdGVUc1JlYWRIb29rKG5nUGFyYW0pO1xuXHR9XG5cblx0Y2xlYXIoKSB7XG5cdFx0dGhpcy50c0NhY2hlLmNsZWFyKCk7XG5cdH1cblxuXHRwcml2YXRlIHJlYWxGaWxlKGZpbGU6IHN0cmluZywgcHJlc2VydmVTeW1saW5rczogYm9vbGVhbik6IHN0cmluZyB7XG5cdFx0Ly8gbG9nLmluZm8oYHJlYWRGaWxlICR7ZmlsZX1gKTtcblx0XHRjb25zdCByZWFsRmlsZSA9IHRoaXMucmVhbEZpbGVDYWNoZS5nZXQoZmlsZSk7XG5cdFx0aWYgKHJlYWxGaWxlICE9PSB1bmRlZmluZWQpXG5cdFx0XHRyZXR1cm4gcmVhbEZpbGU7XG5cdFx0aWYgKGZzLmxzdGF0U3luYyhmaWxlKS5pc1N5bWJvbGljTGluaygpKSB7XG5cdFx0XHRpZiAoIXByZXNlcnZlU3ltbGlua3MpXG5cdFx0XHRcdGxvZy53YXJuKGBSZWFkaW5nIGEgc3ltbGluazogJHtmaWxlfSwgYnV0IFwicHJlc2VydmVTeW1saW5rc1wiIGlzIGZhbHNlLmApO1xuXHRcdFx0Y29uc3QgcmYgPSBmcy5yZWFscGF0aFN5bmMoZmlsZSk7XG5cdFx0XHR0aGlzLnJlYWxGaWxlQ2FjaGUuc2V0KGZpbGUsIHJmKTtcblx0XHRcdHJldHVybiByZjtcblx0XHR9IGVsc2Vcblx0XHRcdHJldHVybiBmaWxlO1xuXHR9XG5cblx0cHJpdmF0ZSBjcmVhdGVUc1JlYWRIb29rKG5nUGFyYW06IEFuZ3VsYXJDbGlQYXJhbSk6IEhvb2tSZWFkRnVuYyB7XG5cdFx0Ly8gbGV0IGRyY3BJbmNsdWRlQnVmOiBBcnJheUJ1ZmZlcjtcblxuXHRcdGNvbnN0IHRzY29uZmlnRmlsZSA9IG5nUGFyYW0uYnJvd3Nlck9wdGlvbnMudHNDb25maWc7XG5cblx0XHQvLyBjb25zdCBobXJFbmFibGVkID0gXy5nZXQobmdQYXJhbSwgJ2J1aWxkZXJDb25maWcub3B0aW9ucy5obXInKSB8fCBhcGkuYXJndi5obXI7XG5cdFx0Y29uc3QgcHJlc2VydmVTeW1saW5rcyA9IG5nUGFyYW0uYnJvd3Nlck9wdGlvbnMucHJlc2VydmVTeW1saW5rcztcblx0XHRjb25zdCB0c0NvbXBpbGVyT3B0aW9ucyA9IHJlYWRUc0NvbmZpZyh0c2NvbmZpZ0ZpbGUpO1xuXHRcdC8vIGxldCBwb2x5ZmlsbHNGaWxlOiBzdHJpbmcgPSAnJztcblx0XHQvLyBpZiAobmdQYXJhbS5icm93c2VyT3B0aW9ucy5wb2x5ZmlsbHMpXG5cdFx0Ly8gXHRwb2x5ZmlsbHNGaWxlID0gbmdQYXJhbS5icm93c2VyT3B0aW9ucy5wb2x5ZmlsbHMucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXG5cdFx0Y29uc3QgYXBwTW9kdWxlRmlsZSA9IGZpbmRBcHBNb2R1bGVGaWxlRnJvbU1haW4ocmVzb2x2ZShuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLm1haW4pKTtcblx0XHRsb2cuaW5mbygnYXBwIG1vZHVsZSBmaWxlOiAnLCBhcHBNb2R1bGVGaWxlKTtcblxuXHRcdGNvbnN0IGlzQW90ID0gbmdQYXJhbS5icm93c2VyT3B0aW9ucy5hb3Q7XG5cblx0XHRyZXR1cm4gKGZpbGU6IHN0cmluZywgYnVmOiBBcnJheUJ1ZmZlcik6IE9ic2VydmFibGU8QXJyYXlCdWZmZXI+ID0+IHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdGlmIChpc0FvdCAmJiBmaWxlLmVuZHNXaXRoKCcuY29tcG9uZW50Lmh0bWwnKSkge1xuXHRcdFx0XHRcdGNvbnN0IGNhY2hlZCA9IHRoaXMudHNDYWNoZS5nZXQodGhpcy5yZWFsRmlsZShmaWxlLCBwcmVzZXJ2ZVN5bWxpbmtzKSk7XG5cdFx0XHRcdFx0aWYgKGNhY2hlZCAhPSBudWxsKVxuXHRcdFx0XHRcdFx0cmV0dXJuIG9mKGNhY2hlZCk7XG5cdFx0XHRcdFx0cmV0dXJuIG9mKHN0cmluZzJidWZmZXIocmVwbGFjZUh0bWwoZmlsZSwgQnVmZmVyLmZyb20oYnVmKS50b1N0cmluZygpKSkpO1xuXG5cdFx0XHRcdH0gZWxzZSBpZiAoIWZpbGUuZW5kc1dpdGgoJy50cycpIHx8IGZpbGUuZW5kc1dpdGgoJy5kLnRzJykpIHtcblx0XHRcdFx0XHRyZXR1cm4gb2YoYnVmKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNvbnN0IGNhY2hlZCA9IHRoaXMudHNDYWNoZS5nZXQodGhpcy5yZWFsRmlsZShmaWxlLCBwcmVzZXJ2ZVN5bWxpbmtzKSk7XG5cdFx0XHRcdGlmIChjYWNoZWQgIT0gbnVsbClcblx0XHRcdFx0XHRyZXR1cm4gb2YoY2FjaGVkKTtcblx0XHRcdFx0Ly8gbGV0IG5vcm1hbEZpbGUgPSByZWxhdGl2ZShwcm9jZXNzLmN3ZCgpLCBmaWxlKTtcblx0XHRcdFx0Ly8gaWYgKFNFUCA9PT0gJ1xcXFwnKVxuXHRcdFx0XHQvLyBcdG5vcm1hbEZpbGUgPSBub3JtYWxGaWxlLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcblx0XHRcdFx0Ly8gaWYgKGhtckVuYWJsZWQgJiYgcG9seWZpbGxzRmlsZSAmJiBub3JtYWxGaWxlID09PSBwb2x5ZmlsbHNGaWxlKSB7XG5cdFx0XHRcdC8vIFx0Y29uc3QgaG1yQ2xpZW50ID0gJ1xcbmltcG9ydCBcXCd3ZWJwYWNrLWhvdC1taWRkbGV3YXJlL2NsaWVudFxcJzsnO1xuXHRcdFx0XHQvLyBcdGNvbnN0IGNvbnRlbnQgPSBCdWZmZXIuZnJvbShidWYpLnRvU3RyaW5nKCkgKyBobXJDbGllbnQ7XG5cdFx0XHRcdC8vIFx0bG9nLmluZm8oYEFwcGVuZCB0byAke25vcm1hbEZpbGV9OiBcXG5pbXBvcnQgXFwnd2VicGFjay1ob3QtbWlkZGxld2FyZS9jbGllbnRcXCc7YCk7XG5cdFx0XHRcdC8vIFx0Y29uc3QgYmYgPSBzdHJpbmcyYnVmZmVyKGNvbnRlbnQpO1xuXHRcdFx0XHQvLyBcdHRoaXMudHNDYWNoZS5zZXQodGhpcy5yZWFsRmlsZShmaWxlLCBwcmVzZXJ2ZVN5bWxpbmtzKSwgYmYpO1xuXHRcdFx0XHQvLyBcdHJldHVybiBvZihiZik7XG5cdFx0XHRcdC8vIH0gZWxzZSBpZiAobm9ybWFsRmlsZS5lbmRzV2l0aCgnL2RyY3AtaW5jbHVkZS50cycpKSB7XG5cdFx0XHRcdC8vIFx0aWYgKGRyY3BJbmNsdWRlQnVmKVxuXHRcdFx0XHQvLyBcdFx0cmV0dXJuIG9mKGRyY3BJbmNsdWRlQnVmKTtcblx0XHRcdFx0Ly8gXHRsZXQgY29udGVudCA9IEJ1ZmZlci5mcm9tKGJ1ZikudG9TdHJpbmcoKTtcblx0XHRcdFx0Ly8gXHRjb25zdCBsZWdvQ29uZmlnID0gYnJvd3NlckxlZ29Db25maWcoKTtcblx0XHRcdFx0Ly8gXHRsZXQgaG1yQm9vdDogc3RyaW5nO1xuXHRcdFx0XHQvLyBcdGlmIChobXJFbmFibGVkKSB7XG5cdFx0XHRcdC8vIFx0XHRjb250ZW50ID0gJ2ltcG9ydCBobXJCb290c3RyYXAgZnJvbSBcXCcuL2htclxcJztcXG4nICsgY29udGVudDtcblx0XHRcdFx0Ly8gXHRcdGhtckJvb3QgPSAnaG1yQm9vdHN0cmFwKG1vZHVsZSwgYm9vdHN0cmFwKSc7XG5cdFx0XHRcdC8vIFx0fVxuXHRcdFx0XHQvLyBcdGlmICghbmdQYXJhbS5icm93c2VyT3B0aW9ucy5hb3QpIHtcblx0XHRcdFx0Ly8gXHRcdGNvbnRlbnQgPSAnaW1wb3J0IFxcJ2NvcmUtanMvZXM3L3JlZmxlY3RcXCc7XFxuJyArIGNvbnRlbnQ7XG5cdFx0XHRcdC8vIFx0fVxuXHRcdFx0XHQvLyBcdGlmIChobXJCb290KVxuXHRcdFx0XHQvLyBcdFx0Y29udGVudCA9IGNvbnRlbnQucmVwbGFjZSgvXFwvXFwqIHJlcGxhY2UgXFwqXFwvYm9vdHN0cmFwXFwoXFwpL2csIGhtckJvb3QpO1xuXHRcdFx0XHQvLyBcdGlmIChuZ1BhcmFtLnNzcikge1xuXHRcdFx0XHQvLyBcdFx0Y29udGVudCArPSAnXFxuY29uc29sZS5sb2coXCJzZXQgZ2xvYmFsLkxFR09fQ09ORklHXCIpOyc7XG5cdFx0XHRcdC8vIFx0XHRjb250ZW50ICs9ICdcXG5PYmplY3QuYXNzaWduKGdsb2JhbCwge1xcXG5cdFx0XHRcdC8vIFx0XHRcdF9fZHJjcEVudHJ5UGFnZTogbnVsbCwgXFxcblx0XHRcdFx0Ly8gXHRcdFx0X19kcmNwRW50cnlQYWNrYWdlOiBudWxsXFxcblx0XHRcdFx0Ly8gXHRcdH0pO1xcbic7XG5cdFx0XHRcdC8vIFx0XHRjb250ZW50ICs9ICcoZ2xvYmFsIGFzIGFueSknO1xuXHRcdFx0XHQvLyBcdH0gZWxzZSB7XG5cdFx0XHRcdC8vIFx0XHRjb250ZW50ICs9ICdcXG5PYmplY3QuYXNzaWduKHdpbmRvdywge1xcXG5cdFx0XHRcdC8vIFx0XHRcdF9fZHJjcEVudHJ5UGFnZTogbnVsbCwgXFxcblx0XHRcdFx0Ly8gXHRcdFx0X19kcmNwRW50cnlQYWNrYWdlOiBudWxsXFxcblx0XHRcdFx0Ly8gXHRcdH0pO1xcbic7XG5cdFx0XHRcdC8vIFx0XHRjb250ZW50ICs9ICdcXG4od2luZG93IGFzIGFueSknO1xuXHRcdFx0XHQvLyBcdH1cblx0XHRcdFx0Ly8gXHRjb250ZW50ICs9IGAuTEVHT19DT05GSUcgPSAke0pTT04uc3RyaW5naWZ5KGxlZ29Db25maWcsIG51bGwsICcgICcpfTtcXG5gO1xuXHRcdFx0XHQvLyBcdGRyY3BJbmNsdWRlQnVmID0gc3RyaW5nMmJ1ZmZlcihjb250ZW50KTtcblx0XHRcdFx0Ly8gXHRsb2cuaW5mbyhjaGFsay5jeWFuKGZpbGUpICsgJzpcXG4nICsgY29udGVudCk7XG5cdFx0XHRcdC8vIFx0dGhpcy50c0NhY2hlLnNldCh0aGlzLnJlYWxGaWxlKGZpbGUsIHByZXNlcnZlU3ltbGlua3MpLCBkcmNwSW5jbHVkZUJ1Zik7XG5cdFx0XHRcdC8vIFx0cmV0dXJuIG9mKGRyY3BJbmNsdWRlQnVmKTtcblx0XHRcdFx0Ly8gfVxuXHRcdFx0XHRjb25zdCBjb21wUGtnID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGZpbGUpO1xuXHRcdFx0XHRsZXQgY29udGVudCA9IEJ1ZmZlci5mcm9tKGJ1ZikudG9TdHJpbmcoKTtcblx0XHRcdFx0bGV0IG5lZWRMb2dGaWxlID0gZmFsc2U7XG5cdFx0XHRcdC8vIHBhdGNoIGFwcC5tb2R1bGUudHNcblx0XHRcdFx0aWYgKGFwcE1vZHVsZUZpbGUgPT09IGZpbGUpIHtcblx0XHRcdFx0XHRsb2cuaW5mbygncGF0Y2gnLCBmaWxlKTtcblx0XHRcdFx0XHRjb25zdCBhcHBNb2R1bGVQYWNrYWdlID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGFwcE1vZHVsZUZpbGUpO1xuXHRcdFx0XHRcdGNvbnN0IHJlbW92YWJsZXMgPSByZW1vdmFibGVOZ01vZHVsZXMoYXBwTW9kdWxlUGFja2FnZSwgZGlybmFtZShhcHBNb2R1bGVGaWxlKSk7XG5cdFx0XHRcdFx0Y29uc3QgbmdNb2R1bGVzOiBzdHJpbmdbXSA9IGdldFJvdXRlck1vZHVsZXMoYXBwTW9kdWxlUGFja2FnZSwgZGlybmFtZShhcHBNb2R1bGVGaWxlKSkgfHwgcmVtb3ZhYmxlcztcblx0XHRcdFx0XHQvLyBuZ01vZHVsZXMucHVzaChhcGkucGFja2FnZU5hbWUgKyAnL3NyYy9hcHAjRGV2ZWxvcGVyTW9kdWxlJyk7XG5cdFx0XHRcdFx0bG9nLmluZm8oJ0luc2VydCBvcHRpb25hbCBOZ01vZHVsZXMgdG8gQXBwTW9kdWxlOlxcbiAgJyArIG5nTW9kdWxlcy5qb2luKCdcXG4gICcpKTtcblx0XHRcdFx0XHRjb250ZW50ID0gbmV3IEFwcE1vZHVsZVBhcnNlcigpXG5cdFx0XHRcdFx0XHQucGF0Y2hGaWxlKGZpbGUsIGNvbnRlbnQsIHJlbW92YWJsZXMsIG5nTW9kdWxlcyk7XG5cdFx0XHRcdFx0bmVlZExvZ0ZpbGUgPSB0cnVlO1xuXHRcdFx0XHR9XG5cdFx0XHRcdGNvbnN0IHRzU2VsZWN0b3IgPSBuZXcgU2VsZWN0b3IoY29udGVudCwgZmlsZSk7XG5cdFx0XHRcdGNvbnN0IGhhc0ltcG9ydEFwaSA9IHRzU2VsZWN0b3IuZmluZEFsbCgnOkltcG9ydERlY2xhcmF0aW9uPi5tb2R1bGVTcGVjaWZpZXI6U3RyaW5nTGl0ZXJhbCcpLnNvbWUoYXN0ID0+IHtcblx0XHRcdFx0XHRyZXR1cm4gKGFzdCBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0ID09PSAnX19hcGknO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0bGV0IGNoYW5nZWQgPSBhcGkuYnJvd3NlckluamVjdG9yLmluamVjdFRvRmlsZShmaWxlLCBjb250ZW50KTtcblxuXHRcdFx0XHRjaGFuZ2VkID0gbmV3IEFwaUFvdENvbXBpbGVyKGZpbGUsIGNoYW5nZWQpLnBhcnNlKHNvdXJjZSA9PiB0cmFuc3BpbGVTaW5nbGVUcyhzb3VyY2UsIHRzQ29tcGlsZXJPcHRpb25zKSk7XG5cdFx0XHRcdGlmIChoYXNJbXBvcnRBcGkpXG5cdFx0XHRcdFx0Y2hhbmdlZCA9IGFwaVRtcGxUcyh7cGFja2FnZU5hbWU6IGNvbXBQa2cubG9uZ05hbWV9KSArICdcXG4nICsgY2hhbmdlZDtcblx0XHRcdFx0aWYgKGNoYW5nZWQgIT09IGNvbnRlbnQgJiYgbmdQYXJhbS5zc3IpIHtcblx0XHRcdFx0XHRjaGFuZ2VkID0gJ2ltcG9ydCBcIkBkci1jb3JlL25nLWFwcC1idWlsZGVyL3NyYy9kcmNwLWluY2x1ZGVcIjtcXG4nICsgY2hhbmdlZDtcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAobmVlZExvZ0ZpbGUpXG5cdFx0XHRcdFx0bG9nLmluZm8oY2hhbGsuY3lhbihmaWxlKSArICc6XFxuJyArIGNoYW5nZWQpO1xuXHRcdFx0XHRjb25zdCBiZiA9IHN0cmluZzJidWZmZXIoY2hhbmdlZCk7XG5cdFx0XHRcdHRoaXMudHNDYWNoZS5zZXQodGhpcy5yZWFsRmlsZShmaWxlLCBwcmVzZXJ2ZVN5bWxpbmtzKSwgYmYpO1xuXHRcdFx0XHRyZXR1cm4gb2YoYmYpO1xuXHRcdFx0fSBjYXRjaCAoZXgpIHtcblx0XHRcdFx0bG9nLmVycm9yKGV4KTtcblx0XHRcdFx0cmV0dXJuIHRocm93RXJyb3IoZXgpO1xuXHRcdFx0fVxuXHRcdH07XG5cdH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0cmluZzJidWZmZXIoaW5wdXQ6IHN0cmluZyk6IEFycmF5QnVmZmVyIHtcblx0Y29uc3Qgbm9kZUJ1ZiA9IEJ1ZmZlci5mcm9tKGlucHV0KTtcblx0Y29uc3QgbGVuID0gbm9kZUJ1Zi5ieXRlTGVuZ3RoO1xuXHRjb25zdCBuZXdCdWYgPSBuZXcgQXJyYXlCdWZmZXIobGVuKTtcblx0Y29uc3QgZGF0YVZpZXcgPSBuZXcgRGF0YVZpZXcobmV3QnVmKTtcblx0Zm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuXHRcdGRhdGFWaWV3LnNldFVpbnQ4KGksIG5vZGVCdWYucmVhZFVJbnQ4KGkpKTtcblx0fVxuXHRyZXR1cm4gbmV3QnVmO1xufVxuXG4vLyBmdW5jdGlvbiBicm93c2VyTGVnb0NvbmZpZygpIHtcbi8vIFx0dmFyIGJyb3dzZXJQcm9wU2V0OiBhbnkgPSB7fTtcbi8vIFx0dmFyIGxlZ29Db25maWc6IGFueSA9IHt9OyAvLyBsZWdvQ29uZmlnIGlzIGdsb2JhbCBjb25maWd1cmF0aW9uIHByb3BlcnRpZXMgd2hpY2ggYXBwbHkgdG8gYWxsIGVudHJpZXMgYW5kIG1vZHVsZXNcbi8vIFx0Xy5lYWNoKFtcbi8vIFx0XHQnc3RhdGljQXNzZXRzVVJMJywgJ3NlcnZlclVSTCcsICdwYWNrYWdlQ29udGV4dFBhdGhNYXBwaW5nJyxcbi8vIFx0XHQnbG9jYWxlcycsICdkZXZNb2RlJywgJ291dHB1dFBhdGhNYXAnXG4vLyBcdF0sIHByb3AgPT4gYnJvd3NlclByb3BTZXRbcHJvcF0gPSAxKTtcbi8vIFx0Xy5lYWNoKGFwaS5jb25maWcoKS5icm93c2VyU2lkZUNvbmZpZ1Byb3AsIHByb3AgPT4gYnJvd3NlclByb3BTZXRbcHJvcF0gPSB0cnVlKTtcbi8vIFx0Xy5mb3JPd24oYnJvd3NlclByb3BTZXQsIChub3RoaW5nLCBwcm9wUGF0aCkgPT4gXy5zZXQobGVnb0NvbmZpZywgcHJvcFBhdGgsIF8uZ2V0KGFwaS5jb25maWcoKSwgcHJvcFBhdGgpKSk7XG4vLyBcdHZhciBjb21wcmVzc2VkSW5mbyA9IGNvbXByZXNzT3V0cHV0UGF0aE1hcChsZWdvQ29uZmlnLm91dHB1dFBhdGhNYXApO1xuLy8gXHRsZWdvQ29uZmlnLm91dHB1dFBhdGhNYXAgPSBjb21wcmVzc2VkSW5mby5kaWZmTWFwO1xuLy8gXHRsZWdvQ29uZmlnLl9vdXRwdXRBc05hbWVzID0gY29tcHJlc3NlZEluZm8uc2FtZXM7XG4vLyBcdGxlZ29Db25maWcuYnVpbGRMb2NhbGUgPSBhcGkuZ2V0QnVpbGRMb2NhbGUoKTtcbi8vIFx0bG9nLmRlYnVnKCdEZWZpbmVQbHVnaW4gTEVHT19DT05GSUc6ICcsIGxlZ29Db25maWcpO1xuLy8gXHRyZXR1cm4gbGVnb0NvbmZpZztcbi8vIH1cblxuLy8gZnVuY3Rpb24gY29tcHJlc3NPdXRwdXRQYXRoTWFwKHBhdGhNYXA6IGFueSkge1xuLy8gXHR2YXIgbmV3TWFwOiBhbnkgPSB7fTtcbi8vIFx0dmFyIHNhbWVBc05hbWVzOiBzdHJpbmdbXSA9IFtdO1xuLy8gXHRfLmVhY2gocGF0aE1hcCwgKHZhbHVlLCBrZXkpID0+IHtcbi8vIFx0XHR2YXIgcGFyc2VkID0gYXBpLnBhY2thZ2VVdGlscy5wYXJzZU5hbWUoa2V5KTtcbi8vIFx0XHRpZiAocGFyc2VkLm5hbWUgIT09IHZhbHVlKSB7XG4vLyBcdFx0XHRuZXdNYXBba2V5XSA9IHZhbHVlO1xuLy8gXHRcdH0gZWxzZSB7XG4vLyBcdFx0XHRzYW1lQXNOYW1lcy5wdXNoKGtleSk7XG4vLyBcdFx0fVxuLy8gXHR9KTtcbi8vIFx0cmV0dXJuIHtcbi8vIFx0XHRzYW1lczogc2FtZUFzTmFtZXMsXG4vLyBcdFx0ZGlmZk1hcDogbmV3TWFwXG4vLyBcdH07XG4vLyB9XG5cbmZ1bmN0aW9uIGdldFJvdXRlck1vZHVsZXMoYXBwTW9kdWxlUGFja2FnZTogUGFja2FnZUJyb3dzZXJJbnN0YW5jZSwgYXBwTW9kdWxlRGlyOiBzdHJpbmcpIHtcblx0Y29uc3QgbmdNb2R1bGVzOiBzdHJpbmdbXSA9IGFwaS5jb25maWcuZ2V0KFthcGkucGFja2FnZU5hbWUsICduZ01vZHVsZSddKSB8fCBbXTtcblx0Y29uc3QgbmdQYWNrYWdlTW9kdWxlcyA9IG5ldyBTZXQocGFja2FnZU5hbWVzMk5nTW9kdWxlKGFwcE1vZHVsZVBhY2thZ2UsIGFwcE1vZHVsZURpcixcblx0XHRhcGkuY29uZmlnLmdldChbYXBpLnBhY2thZ2VOYW1lLCAnbmdQYWNrYWdlJ10pIHx8IFtdKSk7XG5cdG5nTW9kdWxlcy5mb3JFYWNoKG0gPT4gbmdQYWNrYWdlTW9kdWxlcy5hZGQobSkpO1xuXHRyZXR1cm4gQXJyYXkuZnJvbShuZ1BhY2thZ2VNb2R1bGVzKTtcbn1cblxuZnVuY3Rpb24gcGFja2FnZU5hbWVzMk5nTW9kdWxlKGFwcE1vZHVsZVBrOiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlLCBhcHBNb2R1bGVEaXI6IHN0cmluZywgaW5jbHVkZVBhY2thZ2VzPzogc3RyaW5nW10pOiBzdHJpbmdbXSB7XG5cdGNvbnN0IHJlczogc3RyaW5nW10gPSBbXTtcblx0aWYgKGluY2x1ZGVQYWNrYWdlcykge1xuXHRcdGZvciAoY29uc3QgbmFtZSBvZiBpbmNsdWRlUGFja2FnZXMpIHtcblx0XHRcdGxldCBwayA9IGFwaS5wYWNrYWdlSW5mby5tb2R1bGVNYXBbbmFtZV07XG5cdFx0XHRpZiAocGsgPT0gbnVsbCkge1xuXHRcdFx0XHRjb25zdCBzY29wZSA9IChhcGkuY29uZmlnLmdldCgncGFja2FnZVNjb3BlcycpIGFzIHN0cmluZ1tdKS5maW5kKHNjb3BlID0+IHtcblx0XHRcdFx0XHRyZXR1cm4gYXBpLnBhY2thZ2VJbmZvLm1vZHVsZU1hcFtgQCR7c2NvcGV9LyR7bmFtZX1gXSAhPSBudWxsO1xuXHRcdFx0XHR9KTtcblx0XHRcdFx0aWYgKHNjb3BlID09IG51bGwpIHtcblx0XHRcdFx0XHRsb2cuZXJyb3IoJ1BhY2thZ2UgbmFtZWQ6IFwiJXNcIiBpcyBub3QgZm91bmQgd2l0aCBwb3NzaWJsZSBzY29wZSBuYW1lIGluIFwiJXNcIicsIG5hbWUsXG5cdFx0XHRcdFx0XHQoYXBpLmNvbmZpZy5nZXQoJ3BhY2thZ2VTY29wZXMnKSBhcyBzdHJpbmdbXSkuam9pbignLCAnKSk7XG5cdFx0XHRcdFx0YnJlYWs7XG5cdFx0XHRcdH1cblx0XHRcdFx0cGsgPSBhcGkucGFja2FnZUluZm8ubW9kdWxlTWFwW2BAJHtzY29wZX0vJHtuYW1lfWBdO1xuXHRcdFx0fVxuXHRcdFx0ZWFjaFBhY2thZ2UocGspO1xuXHRcdH1cblx0fSBlbHNlIHtcblx0XHRmb3IgKGNvbnN0IHBrIG9mIGFwaS5wYWNrYWdlSW5mby5hbGxNb2R1bGVzKSB7XG5cdFx0XHRlYWNoUGFja2FnZShwayk7XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gZWFjaFBhY2thZ2UocGs6IFBhY2thZ2VCcm93c2VySW5zdGFuY2UpIHtcblx0XHRpZiAocGsuZHIgPT0gbnVsbCB8fCBway5kci5uZ01vZHVsZSA9PSBudWxsKVxuXHRcdFx0cmV0dXJuO1xuXG5cdFx0bGV0IG1vZHVsZXMgPSBway5kci5uZ01vZHVsZTtcblx0XHRpZiAoIUFycmF5LmlzQXJyYXkobW9kdWxlcykpXG5cdFx0XHRtb2R1bGVzID0gW21vZHVsZXNdO1xuXG5cdFx0Zm9yIChsZXQgbmFtZSBvZiBtb2R1bGVzKSB7XG5cdFx0XHRuYW1lID0gXy50cmltU3RhcnQobmFtZSwgJy4vJyk7XG5cdFx0XHRpZiAocGsgIT09IGFwcE1vZHVsZVBrKSB7XG5cdFx0XHRcdGlmIChuYW1lLmluZGV4T2YoJyMnKSA8IDApXG5cdFx0XHRcdFx0cmVzLnB1c2gocGsubG9uZ05hbWUgKyAnIycgKyBuYW1lKTtcblx0XHRcdFx0ZWxzZVxuXHRcdFx0XHRcdHJlcy5wdXNoKHBrLmxvbmdOYW1lICsgJy8nICsgbmFtZSk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyBwYWNrYWdlIGlzIHNhbWUgYXMgdGhlIG9uZSBhcHAubW9kdWxlIGJlbG9uZ3MgdG8sIHdlIHVzZSByZWxhdGl2ZSBwYXRoIGluc3RlYWQgb2YgcGFja2FnZSBuYW1lXG5cdFx0XHRcdGlmIChuYW1lLmluZGV4T2YoJyMnKSA8IDApXG5cdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGBJbiAke3BrLnJlYWxQYWNrYWdlUGF0aH0vcGFja2FnZS5qc29uLCB2YWx1ZSBvZiBcImRyLm5nTW9kdWxlXCIgYXJyYXlgICtcblx0XHRcdFx0XHRcdGBtdXN0IGJlIGluIGZvcm0gb2YgJzxwYXRoPiM8ZXhwb3J0IE5nTW9kdWxlIG5hbWU+JywgYnV0IGhlcmUgaXQgaXMgJyR7bmFtZX0nYCk7XG5cdFx0XHRcdGNvbnN0IG5hbWVQYXJ0cyA9IG5hbWUuc3BsaXQoJyMnKTtcblx0XHRcdFx0bmFtZSA9IHJlbGF0aXZlKGFwcE1vZHVsZURpciwgbmFtZVBhcnRzWzBdKSArICcjJyArIG5hbWVQYXJ0c1sxXTtcblx0XHRcdFx0bmFtZSA9IG5hbWUucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXHRcdFx0XHRpZiAoIW5hbWUuc3RhcnRzV2l0aCgnLicpKVxuXHRcdFx0XHRcdG5hbWUgPSAnLi8nICsgbmFtZTtcblx0XHRcdFx0cmVzLnB1c2gobmFtZSk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cdHJldHVybiByZXM7XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gYXBwTW9kdWxlUGtOYW1lIHBhY2thZ2UgbmFtZSBvZiB0aGUgb25lIGNvbnRhaW5zIGFwcC5tb2R1bGUudHNcbiAqIEBwYXJhbSBhcHBNb2R1bGVEaXIgYXBwLm1vZHVsZS50cydzIGRpcmVjdG9yeSwgdXNlZCB0byBjYWxjdWxhdGUgcmVsYXRpdmUgcGF0aFxuICovXG5mdW5jdGlvbiByZW1vdmFibGVOZ01vZHVsZXMoYXBwTW9kdWxlUGs6IFBhY2thZ2VCcm93c2VySW5zdGFuY2UsIGFwcE1vZHVsZURpcjogc3RyaW5nKTogc3RyaW5nW10ge1xuXHRyZXR1cm4gcGFja2FnZU5hbWVzMk5nTW9kdWxlKGFwcE1vZHVsZVBrLCBhcHBNb2R1bGVEaXIpO1xufVxuIl19
