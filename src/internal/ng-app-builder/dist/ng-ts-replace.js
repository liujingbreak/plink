"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* tslint:disable max-line-length */
const ts_compiler_1 = require("dr-comp-package/wfh/dist/ts-compiler");
const fs = tslib_1.__importStar(require("fs"));
const _ = tslib_1.__importStar(require("lodash"));
const log4js = tslib_1.__importStar(require("log4js"));
const rxjs_1 = require("rxjs");
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy10cy1yZXBsYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG9DQUFvQztBQUNwQyxzRUFBdUY7QUFDdkYsK0NBQXlCO0FBQ3pCLGtEQUE0QjtBQUM1Qix1REFBaUM7QUFDakMsK0JBQWtEO0FBRWxELDBEQUFtQztBQUNuQyxtREFBOEM7QUFHOUMsZ0ZBQTRDO0FBQzVDLGtGQUFtRDtBQUNuRCxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7QUFFL0IsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLFNBQVMsQ0FBQyxlQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7QUFFOUMsTUFBTSxTQUFTLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQzs7dUJBRU4sQ0FBQyxDQUFDO0FBQ3pCLDhFQUE4RTtBQUU3RSxNQUFNLENBQUMsY0FBYyxDQUFDLGVBQUcsQ0FBYSxDQUFDLGdCQUFnQixHQUFHLGlCQUFpQixDQUFDO0FBRTdFLE1BQXFCLFlBQVk7SUFLL0IsWUFBWSxPQUF3QjtRQUg1QixrQkFBYSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1FBQzFDLFlBQU8sR0FBRyxJQUFJLEdBQUcsRUFBdUIsQ0FBQztRQUcvQyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNqRCxDQUFDO0lBRUQsS0FBSztRQUNILElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDdkIsQ0FBQztJQUVPLFFBQVEsQ0FBQyxJQUFZLEVBQUUsZ0JBQXlCO1FBQ3RELGdDQUFnQztRQUNoQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM5QyxJQUFJLFFBQVEsS0FBSyxTQUFTO1lBQ3hCLE9BQU8sUUFBUSxDQUFDO1FBQ2xCLElBQUks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LGFBQWE7QUFFYixrQ0FBa0M7QUFDbEMsaUNBQWlDO0FBQ2pDLDBCQUEwQjtBQUUxQixnQ0FBZ0M7QUFDaEMscUNBQXFDO0FBQ3JDLCtCQUErQjtBQUMvQixpQ0FBaUM7QUFDakMsMkNBQTJDO0FBQzNDLFdBQVc7QUFDWCwyQ0FBMkM7QUFDM0MsY0FBYztBQUNkLHdHQUF3RztBQUN4RyxpQ0FBaUM7QUFDakMsK0ZBQStGO0FBQy9GLHlGQUF5RjtBQUN6Rix5Q0FBeUM7QUFDekMsd0VBQXdFO0FBQ3hFLHVDQUF1QztBQUN2QyxpQ0FBaUM7QUFDakMsMkJBQTJCO0FBQzNCLHNCQUFzQjtBQUN0QixPQUFPO0FBQ1AsTUFBTTtBQUNOLEtBQUs7QUFDTCxlQUFlO0FBQ2YsSUFBSTtBQUVKOzs7O0dBSUc7QUFDSCxxR0FBcUc7QUFDckcsNERBQTREO0FBQzVELElBQUkiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvbmctdHMtcmVwbGFjZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG1heC1saW5lLWxlbmd0aCAqL1xuaW1wb3J0IHsgcmVhZFRzQ29uZmlnLCB0cmFuc3BpbGVTaW5nbGVUcyB9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC90cy1jb21waWxlcic7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7IE9ic2VydmFibGUsIG9mLCB0aHJvd0Vycm9yIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBhcGksIHtEcmNwQXBpfSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgeyByZXBsYWNlSHRtbCB9IGZyb20gJy4vbmctYW90LWFzc2V0cyc7XG5pbXBvcnQgeyBBbmd1bGFyQ2xpUGFyYW0gfSBmcm9tICcuL25nL2NvbW1vbic7XG5pbXBvcnQgeyBIb29rUmVhZEZ1bmMgfSBmcm9tICcuL3V0aWxzL3JlYWQtaG9vay12ZnNob3N0JztcbmltcG9ydCBTZWxlY3RvciBmcm9tICcuL3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQgQXBpQW90Q29tcGlsZXIgZnJvbSAnLi91dGlscy90cy1iZWZvcmUtYW90JztcbmNvbnN0IGNoYWxrID0gcmVxdWlyZSgnY2hhbGsnKTtcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUpO1xuXG5jb25zdCBhcGlUbXBsVHMgPSBfLnRlbXBsYXRlKCdpbXBvcnQgX19EckFwaSBmcm9tIFxcJ0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL3NyYy9hcHAvYXBpXFwnO1xcXG52YXIgX19hcGkgPSBfX0RyQXBpLmdldENhY2hlZEFwaShcXCc8JT1wYWNrYWdlTmFtZSU+XFwnKSB8fCBuZXcgX19EckFwaShcXCc8JT1wYWNrYWdlTmFtZSU+XFwnKTtcXFxuX19hcGkuZGVmYXVsdCA9IF9fYXBpOycpO1xuLy8gY29uc3QgaW5jbHVkZVRzRmlsZSA9IFBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICdzcmMnLCAnZHJjcC1pbmNsdWRlLnRzJyk7XG5cbihPYmplY3QuZ2V0UHJvdG90eXBlT2YoYXBpKSBhcyBEcmNwQXBpKS5icm93c2VyQXBpQ29uZmlnID0gYnJvd3NlckxlZ29Db25maWc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFRTUmVhZEhvb2tlciB7XG4gIGhvb2tGdW5jOiBIb29rUmVhZEZ1bmM7XG4gIHByaXZhdGUgcmVhbEZpbGVDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KCk7XG4gIHByaXZhdGUgdHNDYWNoZSA9IG5ldyBNYXA8c3RyaW5nLCBBcnJheUJ1ZmZlcj4oKTtcblxuICBjb25zdHJ1Y3RvcihuZ1BhcmFtOiBBbmd1bGFyQ2xpUGFyYW0pIHtcbiAgICB0aGlzLmhvb2tGdW5jID0gdGhpcy5jcmVhdGVUc1JlYWRIb29rKG5nUGFyYW0pO1xuICB9XG5cbiAgY2xlYXIoKSB7XG4gICAgdGhpcy50c0NhY2hlLmNsZWFyKCk7XG4gIH1cblxuICBwcml2YXRlIHJlYWxGaWxlKGZpbGU6IHN0cmluZywgcHJlc2VydmVTeW1saW5rczogYm9vbGVhbik6IHN0cmluZyB7XG4gICAgLy8gbG9nLmluZm8oYHJlYWRGaWxlICR7ZmlsZX1gKTtcbiAgICBjb25zdCByZWFsRmlsZSA9IHRoaXMucmVhbEZpbGVDYWNoZS5nZXQoZmlsZSk7XG4gICAgaWYgKHJlYWxGaWxlICE9PSB1bmRlZmluZWQpXG4gICAgICByZXR1cm4gcmVhbEZpbGU7XG4gICAgaWYgKGZzLmxzdGF0U3luYyhmaWxlKS5pc1N5bWJvbGljTGluaygpKSB7XG4gICAgICBpZiAoIXByZXNlcnZlU3ltbGlua3MpXG4gICAgICAgIGxvZy53YXJuKGBSZWFkaW5nIGEgc3ltbGluazogJHtmaWxlfSwgYnV0IFwicHJlc2VydmVTeW1saW5rc1wiIGlzIGZhbHNlLmApO1xuICAgICAgY29uc3QgcmYgPSBmcy5yZWFscGF0aFN5bmMoZmlsZSk7XG4gICAgICB0aGlzLnJlYWxGaWxlQ2FjaGUuc2V0KGZpbGUsIHJmKTtcbiAgICAgIHJldHVybiByZjtcbiAgICB9IGVsc2VcbiAgICAgIHJldHVybiBmaWxlO1xuICB9XG5cbiAgcHJpdmF0ZSBjcmVhdGVUc1JlYWRIb29rKG5nUGFyYW06IEFuZ3VsYXJDbGlQYXJhbSk6IEhvb2tSZWFkRnVuYyB7XG4gICAgLy8gbGV0IGRyY3BJbmNsdWRlQnVmOiBBcnJheUJ1ZmZlcjtcblxuICAgIGNvbnN0IHRzY29uZmlnRmlsZSA9IG5nUGFyYW0uYnJvd3Nlck9wdGlvbnMudHNDb25maWc7XG5cbiAgICAvLyBjb25zdCBobXJFbmFibGVkID0gXy5nZXQobmdQYXJhbSwgJ2J1aWxkZXJDb25maWcub3B0aW9ucy5obXInKSB8fCBhcGkuYXJndi5obXI7XG4gICAgY29uc3QgcHJlc2VydmVTeW1saW5rcyA9IG5nUGFyYW0uYnJvd3Nlck9wdGlvbnMucHJlc2VydmVTeW1saW5rcyAhPSBudWxsID8gbmdQYXJhbS5icm93c2VyT3B0aW9ucy5wcmVzZXJ2ZVN5bWxpbmtzIDpcbiAgICAgIGZhbHNlO1xuICAgIGNvbnN0IHRzQ29tcGlsZXJPcHRpb25zID0gcmVhZFRzQ29uZmlnKHRzY29uZmlnRmlsZSk7XG4gICAgLy8gbGV0IHBvbHlmaWxsc0ZpbGU6IHN0cmluZyA9ICcnO1xuICAgIC8vIGlmIChuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLnBvbHlmaWxscylcbiAgICAvLyBcdHBvbHlmaWxsc0ZpbGUgPSBuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLnBvbHlmaWxscy5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cbiAgICAvLyBjb25zdCBhcHBNb2R1bGVGaWxlID0gZmluZEFwcE1vZHVsZUZpbGVGcm9tTWFpbihyZXNvbHZlKG5nUGFyYW0uYnJvd3Nlck9wdGlvbnMubWFpbikpO1xuICAgIC8vIGxvZy5pbmZvKCdhcHAgbW9kdWxlIGZpbGU6ICcsIGFwcE1vZHVsZUZpbGUpO1xuXG4gICAgLy8gY29uc3QgaXNBb3QgPSBuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLmFvdDtcblxuICAgIHJldHVybiAoZmlsZTogc3RyaW5nLCBidWY6IEFycmF5QnVmZmVyKTogT2JzZXJ2YWJsZTxBcnJheUJ1ZmZlcj4gPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKGZpbGUuZW5kc1dpdGgoJy5jb21wb25lbnQuaHRtbCcpKSB7XG4gICAgICAgICAgY29uc3QgY2FjaGVkID0gdGhpcy50c0NhY2hlLmdldCh0aGlzLnJlYWxGaWxlKGZpbGUsIHByZXNlcnZlU3ltbGlua3MpKTtcbiAgICAgICAgICBpZiAoY2FjaGVkICE9IG51bGwpXG4gICAgICAgICAgICByZXR1cm4gb2YoY2FjaGVkKTtcbiAgICAgICAgICByZXR1cm4gb2Yoc3RyaW5nMmJ1ZmZlcihyZXBsYWNlSHRtbChmaWxlLCBCdWZmZXIuZnJvbShidWYpLnRvU3RyaW5nKCkpKSk7XG5cbiAgICAgICAgfSBlbHNlIGlmICghZmlsZS5lbmRzV2l0aCgnLnRzJykgfHwgZmlsZS5lbmRzV2l0aCgnLmQudHMnKSkge1xuICAgICAgICAgIHJldHVybiBvZihidWYpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY2FjaGVkID0gdGhpcy50c0NhY2hlLmdldCh0aGlzLnJlYWxGaWxlKGZpbGUsIHByZXNlcnZlU3ltbGlua3MpKTtcbiAgICAgICAgaWYgKGNhY2hlZCAhPSBudWxsKVxuICAgICAgICAgIHJldHVybiBvZihjYWNoZWQpO1xuICAgICAgICAvLyBsZXQgbm9ybWFsRmlsZSA9IHJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGZpbGUpO1xuICAgICAgICAvLyBpZiAoU0VQID09PSAnXFxcXCcpXG4gICAgICAgIC8vIFx0bm9ybWFsRmlsZSA9IG5vcm1hbEZpbGUucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICAvLyBpZiAoaG1yRW5hYmxlZCAmJiBwb2x5ZmlsbHNGaWxlICYmIG5vcm1hbEZpbGUgPT09IHBvbHlmaWxsc0ZpbGUpIHtcbiAgICAgICAgLy8gXHRjb25zdCBobXJDbGllbnQgPSAnXFxuaW1wb3J0IFxcJ3dlYnBhY2staG90LW1pZGRsZXdhcmUvY2xpZW50XFwnOyc7XG4gICAgICAgIC8vIFx0Y29uc3QgY29udGVudCA9IEJ1ZmZlci5mcm9tKGJ1ZikudG9TdHJpbmcoKSArIGhtckNsaWVudDtcbiAgICAgICAgLy8gXHRsb2cuaW5mbyhgQXBwZW5kIHRvICR7bm9ybWFsRmlsZX06IFxcbmltcG9ydCBcXCd3ZWJwYWNrLWhvdC1taWRkbGV3YXJlL2NsaWVudFxcJztgKTtcbiAgICAgICAgLy8gXHRjb25zdCBiZiA9IHN0cmluZzJidWZmZXIoY29udGVudCk7XG4gICAgICAgIC8vIFx0dGhpcy50c0NhY2hlLnNldCh0aGlzLnJlYWxGaWxlKGZpbGUsIHByZXNlcnZlU3ltbGlua3MpLCBiZik7XG4gICAgICAgIC8vIFx0cmV0dXJuIG9mKGJmKTtcbiAgICAgICAgLy8gfSBlbHNlIGlmIChub3JtYWxGaWxlLmVuZHNXaXRoKCcvZHJjcC1pbmNsdWRlLnRzJykpIHtcbiAgICAgICAgLy8gXHRpZiAoZHJjcEluY2x1ZGVCdWYpXG4gICAgICAgIC8vIFx0XHRyZXR1cm4gb2YoZHJjcEluY2x1ZGVCdWYpO1xuICAgICAgICAvLyBcdGxldCBjb250ZW50ID0gQnVmZmVyLmZyb20oYnVmKS50b1N0cmluZygpO1xuICAgICAgICAvLyBjb25zdCBsZWdvQ29uZmlnID0gYnJvd3NlckxlZ29Db25maWcoKTtcbiAgICAgICAgLy8gXHRsZXQgaG1yQm9vdDogc3RyaW5nO1xuICAgICAgICAvLyBcdGlmIChobXJFbmFibGVkKSB7XG4gICAgICAgIC8vIFx0XHRjb250ZW50ID0gJ2ltcG9ydCBobXJCb290c3RyYXAgZnJvbSBcXCcuL2htclxcJztcXG4nICsgY29udGVudDtcbiAgICAgICAgLy8gXHRcdGhtckJvb3QgPSAnaG1yQm9vdHN0cmFwKG1vZHVsZSwgYm9vdHN0cmFwKSc7XG4gICAgICAgIC8vIFx0fVxuICAgICAgICAvLyBcdGlmICghbmdQYXJhbS5icm93c2VyT3B0aW9ucy5hb3QpIHtcbiAgICAgICAgLy8gXHRcdGNvbnRlbnQgPSAnaW1wb3J0IFxcJ2NvcmUtanMvZXM3L3JlZmxlY3RcXCc7XFxuJyArIGNvbnRlbnQ7XG4gICAgICAgIC8vIFx0fVxuICAgICAgICAvLyBcdGlmIChobXJCb290KVxuICAgICAgICAvLyBcdFx0Y29udGVudCA9IGNvbnRlbnQucmVwbGFjZSgvXFwvXFwqIHJlcGxhY2UgXFwqXFwvYm9vdHN0cmFwXFwoXFwpL2csIGhtckJvb3QpO1xuICAgICAgICAvLyBcdGlmIChuZ1BhcmFtLnNzcikge1xuICAgICAgICAvLyBcdFx0Y29udGVudCArPSAnXFxuY29uc29sZS5sb2coXCJzZXQgZ2xvYmFsLkxFR09fQ09ORklHXCIpOyc7XG4gICAgICAgIC8vIFx0XHRjb250ZW50ICs9ICdcXG5PYmplY3QuYXNzaWduKGdsb2JhbCwge1xcXG4gICAgICAgIC8vIFx0XHRcdF9fZHJjcEVudHJ5UGFnZTogbnVsbCwgXFxcbiAgICAgICAgLy8gXHRcdFx0X19kcmNwRW50cnlQYWNrYWdlOiBudWxsXFxcbiAgICAgICAgLy8gXHRcdH0pO1xcbic7XG4gICAgICAgIC8vIFx0XHRjb250ZW50ICs9ICcoZ2xvYmFsIGFzIGFueSknO1xuICAgICAgICAvLyBcdH0gZWxzZSB7XG4gICAgICAgIC8vIFx0XHRjb250ZW50ICs9ICdcXG5PYmplY3QuYXNzaWduKHdpbmRvdywge1xcXG4gICAgICAgIC8vIFx0XHRcdF9fZHJjcEVudHJ5UGFnZTogbnVsbCwgXFxcbiAgICAgICAgLy8gXHRcdFx0X19kcmNwRW50cnlQYWNrYWdlOiBudWxsXFxcbiAgICAgICAgLy8gXHRcdH0pO1xcbic7XG4gICAgICAgIC8vIFx0XHRjb250ZW50ICs9ICdcXG4od2luZG93IGFzIGFueSknO1xuICAgICAgICAvLyBcdH1cbiAgICAgICAgLy8gXHRjb250ZW50ICs9IGAuTEVHT19DT05GSUcgPSAke0pTT04uc3RyaW5naWZ5KGxlZ29Db25maWcsIG51bGwsICcgICcpfTtcXG5gO1xuICAgICAgICAvLyBcdGRyY3BJbmNsdWRlQnVmID0gc3RyaW5nMmJ1ZmZlcihjb250ZW50KTtcbiAgICAgICAgLy8gXHRsb2cuaW5mbyhjaGFsay5jeWFuKGZpbGUpICsgJzpcXG4nICsgY29udGVudCk7XG4gICAgICAgIC8vIFx0dGhpcy50c0NhY2hlLnNldCh0aGlzLnJlYWxGaWxlKGZpbGUsIHByZXNlcnZlU3ltbGlua3MpLCBkcmNwSW5jbHVkZUJ1Zik7XG4gICAgICAgIC8vIFx0cmV0dXJuIG9mKGRyY3BJbmNsdWRlQnVmKTtcbiAgICAgICAgLy8gfVxuICAgICAgICBjb25zdCBjb21wUGtnID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGZpbGUpO1xuICAgICAgICBsZXQgY29udGVudCA9IEJ1ZmZlci5mcm9tKGJ1ZikudG9TdHJpbmcoKTtcbiAgICAgICAgbGV0IG5lZWRMb2dGaWxlID0gZmFsc2U7XG4gICAgICAgIC8vIHBhdGNoIGFwcC5tb2R1bGUudHNcbiAgICAgICAgLy8gaWYgKGFwcE1vZHVsZUZpbGUgPT09IGZpbGUpIHtcbiAgICAgICAgLy8gXHRsb2cuaW5mbygncGF0Y2gnLCBmaWxlKTtcbiAgICAgICAgLy8gXHRjb25zdCBhcHBNb2R1bGVQYWNrYWdlID0gYXBpLmZpbmRQYWNrYWdlQnlGaWxlKGFwcE1vZHVsZUZpbGUpO1xuICAgICAgICAvLyBcdGNvbnN0IHJlbW92YWJsZXMgPSByZW1vdmFibGVOZ01vZHVsZXMoYXBwTW9kdWxlUGFja2FnZSwgZGlybmFtZShhcHBNb2R1bGVGaWxlKSk7XG4gICAgICAgIC8vIFx0Y29uc3QgbmdNb2R1bGVzOiBzdHJpbmdbXSA9IGdldFJvdXRlck1vZHVsZXMoYXBwTW9kdWxlUGFja2FnZSwgZGlybmFtZShhcHBNb2R1bGVGaWxlKSkgfHwgcmVtb3ZhYmxlcztcbiAgICAgICAgLy8gXHQvLyBuZ01vZHVsZXMucHVzaChhcGkucGFja2FnZU5hbWUgKyAnL3NyYy9hcHAjRGV2ZWxvcGVyTW9kdWxlJyk7XG4gICAgICAgIC8vIFx0bG9nLmluZm8oJ0luc2VydCBvcHRpb25hbCBOZ01vZHVsZXMgdG8gQXBwTW9kdWxlOlxcbiAgJyArIG5nTW9kdWxlcy5qb2luKCdcXG4gICcpKTtcbiAgICAgICAgLy8gXHRjb250ZW50ID0gbmV3IEFwcE1vZHVsZVBhcnNlcigpXG4gICAgICAgIC8vIFx0XHQucGF0Y2hGaWxlKGZpbGUsIGNvbnRlbnQsIHJlbW92YWJsZXMsIG5nTW9kdWxlcyk7XG4gICAgICAgIC8vIFx0bmVlZExvZ0ZpbGUgPSB0cnVlO1xuICAgICAgICAvLyB9XG4gICAgICAgIGNvbnN0IHRzU2VsZWN0b3IgPSBuZXcgU2VsZWN0b3IoY29udGVudCwgZmlsZSk7XG4gICAgICAgIGNvbnN0IGhhc0ltcG9ydEFwaSA9IHRzU2VsZWN0b3IuZmluZEFsbCgnOkltcG9ydERlY2xhcmF0aW9uPi5tb2R1bGVTcGVjaWZpZXI6U3RyaW5nTGl0ZXJhbCcpLnNvbWUoYXN0ID0+IHtcbiAgICAgICAgICByZXR1cm4gKGFzdCBhcyB0cy5TdHJpbmdMaXRlcmFsKS50ZXh0ID09PSAnX19hcGknO1xuICAgICAgICB9KTtcbiAgICAgICAgbGV0IGNoYW5nZWQgPSBhcGkuYnJvd3NlckluamVjdG9yLmluamVjdFRvRmlsZShmaWxlLCBjb250ZW50KTtcblxuICAgICAgICBjaGFuZ2VkID0gbmV3IEFwaUFvdENvbXBpbGVyKGZpbGUsIGNoYW5nZWQpLnBhcnNlKHNvdXJjZSA9PiB0cmFuc3BpbGVTaW5nbGVUcyhzb3VyY2UsIHRzQ29tcGlsZXJPcHRpb25zKSk7XG4gICAgICAgIGlmIChoYXNJbXBvcnRBcGkpXG4gICAgICAgICAgY2hhbmdlZCA9IGFwaVRtcGxUcyh7cGFja2FnZU5hbWU6IGNvbXBQa2cubG9uZ05hbWV9KSArICdcXG4nICsgY2hhbmdlZDtcbiAgICAgICAgLy8gaWYgKGNoYW5nZWQgIT09IGNvbnRlbnQgJiYgbmdQYXJhbS5zc3IpIHtcbiAgICAgICAgLy8gXHRjaGFuZ2VkID0gJ2ltcG9ydCBcIkBkci1jb3JlL25nLWFwcC1idWlsZGVyL3NyYy9kcmNwLWluY2x1ZGVcIjtcXG4nICsgY2hhbmdlZDtcbiAgICAgICAgLy8gfVxuICAgICAgICBpZiAobmVlZExvZ0ZpbGUpXG4gICAgICAgICAgbG9nLmluZm8oY2hhbGsuY3lhbihmaWxlKSArICc6XFxuJyArIGNoYW5nZWQpO1xuICAgICAgICBjb25zdCBiZiA9IHN0cmluZzJidWZmZXIoY2hhbmdlZCk7XG4gICAgICAgIHRoaXMudHNDYWNoZS5zZXQodGhpcy5yZWFsRmlsZShmaWxlLCBwcmVzZXJ2ZVN5bWxpbmtzKSwgYmYpO1xuICAgICAgICByZXR1cm4gb2YoYmYpO1xuICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgICAgbG9nLmVycm9yKGV4KTtcbiAgICAgICAgcmV0dXJuIHRocm93RXJyb3IoZXgpO1xuICAgICAgfVxuICAgIH07XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0cmluZzJidWZmZXIoaW5wdXQ6IHN0cmluZyk6IEFycmF5QnVmZmVyIHtcbiAgY29uc3Qgbm9kZUJ1ZiA9IEJ1ZmZlci5mcm9tKGlucHV0KTtcbiAgY29uc3QgbGVuID0gbm9kZUJ1Zi5ieXRlTGVuZ3RoO1xuICBjb25zdCBuZXdCdWYgPSBuZXcgQXJyYXlCdWZmZXIobGVuKTtcbiAgY29uc3QgZGF0YVZpZXcgPSBuZXcgRGF0YVZpZXcobmV3QnVmKTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBsZW47IGkrKykge1xuICAgIGRhdGFWaWV3LnNldFVpbnQ4KGksIG5vZGVCdWYucmVhZFVJbnQ4KGkpKTtcbiAgfVxuICByZXR1cm4gbmV3QnVmO1xufVxuXG5mdW5jdGlvbiBicm93c2VyTGVnb0NvbmZpZygpIHtcbiAgdmFyIGJyb3dzZXJQcm9wU2V0OiBhbnkgPSB7fTtcbiAgdmFyIGxlZ29Db25maWc6IGFueSA9IHt9OyAvLyBsZWdvQ29uZmlnIGlzIGdsb2JhbCBjb25maWd1cmF0aW9uIHByb3BlcnRpZXMgd2hpY2ggYXBwbHkgdG8gYWxsIGVudHJpZXMgYW5kIG1vZHVsZXNcbiAgXy5lYWNoKFtcbiAgICAnc3RhdGljQXNzZXRzVVJMJywgJ3NlcnZlclVSTCcsICdwYWNrYWdlQ29udGV4dFBhdGhNYXBwaW5nJyxcbiAgICAnbG9jYWxlcycsICdkZXZNb2RlJywgJ291dHB1dFBhdGhNYXAnXG4gIF0sIHByb3AgPT4gYnJvd3NlclByb3BTZXRbcHJvcF0gPSAxKTtcbiAgXy5lYWNoKGFwaS5jb25maWcoKS5icm93c2VyU2lkZUNvbmZpZ1Byb3AsIHByb3AgPT4gYnJvd3NlclByb3BTZXRbcHJvcF0gPSB0cnVlKTtcbiAgXy5mb3JPd24oYnJvd3NlclByb3BTZXQsIChub3RoaW5nLCBwcm9wUGF0aCkgPT4gXy5zZXQobGVnb0NvbmZpZywgcHJvcFBhdGgsIF8uZ2V0KGFwaS5jb25maWcoKSwgcHJvcFBhdGgpKSk7XG4gIHZhciBjb21wcmVzc2VkSW5mbyA9IGNvbXByZXNzT3V0cHV0UGF0aE1hcChsZWdvQ29uZmlnLm91dHB1dFBhdGhNYXApO1xuICBsZWdvQ29uZmlnLm91dHB1dFBhdGhNYXAgPSBjb21wcmVzc2VkSW5mby5kaWZmTWFwO1xuICBsZWdvQ29uZmlnLl9vdXRwdXRBc05hbWVzID0gY29tcHJlc3NlZEluZm8uc2FtZXM7XG4gIGxlZ29Db25maWcuYnVpbGRMb2NhbGUgPSBhcGkuZ2V0QnVpbGRMb2NhbGUoKTtcbiAgbG9nLmRlYnVnKCdEZWZpbmVQbHVnaW4gTEVHT19DT05GSUc6ICcsIGxlZ29Db25maWcpO1xuICByZXR1cm4gbGVnb0NvbmZpZztcbn1cblxuZnVuY3Rpb24gY29tcHJlc3NPdXRwdXRQYXRoTWFwKHBhdGhNYXA6IGFueSkge1xuICB2YXIgbmV3TWFwOiBhbnkgPSB7fTtcbiAgdmFyIHNhbWVBc05hbWVzOiBzdHJpbmdbXSA9IFtdO1xuICBfLmVhY2gocGF0aE1hcCwgKHZhbHVlLCBrZXkpID0+IHtcbiAgICB2YXIgcGFyc2VkID0gYXBpLnBhY2thZ2VVdGlscy5wYXJzZU5hbWUoa2V5KTtcbiAgICBpZiAocGFyc2VkLm5hbWUgIT09IHZhbHVlKSB7XG4gICAgICBuZXdNYXBba2V5XSA9IHZhbHVlO1xuICAgIH0gZWxzZSB7XG4gICAgICBzYW1lQXNOYW1lcy5wdXNoKGtleSk7XG4gICAgfVxuICB9KTtcbiAgcmV0dXJuIHtcbiAgICBzYW1lczogc2FtZUFzTmFtZXMsXG4gICAgZGlmZk1hcDogbmV3TWFwXG4gIH07XG59XG5cbi8vIGZ1bmN0aW9uIGdldFJvdXRlck1vZHVsZXMoYXBwTW9kdWxlUGFja2FnZTogUGFja2FnZUJyb3dzZXJJbnN0YW5jZSwgYXBwTW9kdWxlRGlyOiBzdHJpbmcpIHtcbi8vIFx0Y29uc3QgbmdNb2R1bGVzOiBzdHJpbmdbXSA9IGFwaS5jb25maWcuZ2V0KFthcGkucGFja2FnZU5hbWUsICduZ01vZHVsZSddKSB8fCBbXTtcbi8vIFx0Y29uc3QgbmdQYWNrYWdlTW9kdWxlcyA9IG5ldyBTZXQocGFja2FnZU5hbWVzMk5nTW9kdWxlKGFwcE1vZHVsZVBhY2thZ2UsIGFwcE1vZHVsZURpcixcbi8vIFx0XHRhcGkuY29uZmlnLmdldChbYXBpLnBhY2thZ2VOYW1lLCAnbmdQYWNrYWdlJ10pIHx8IFtdKSk7XG4vLyBcdG5nTW9kdWxlcy5mb3JFYWNoKG0gPT4gbmdQYWNrYWdlTW9kdWxlcy5hZGQobSkpO1xuLy8gXHRyZXR1cm4gQXJyYXkuZnJvbShuZ1BhY2thZ2VNb2R1bGVzKTtcbi8vIH1cblxuLy8gZnVuY3Rpb24gcGFja2FnZU5hbWVzMk5nTW9kdWxlKGFwcE1vZHVsZVBrOiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlLCBhcHBNb2R1bGVEaXI6IHN0cmluZywgaW5jbHVkZVBhY2thZ2VzPzogc3RyaW5nW10pOiBzdHJpbmdbXSB7XG4vLyBcdGNvbnN0IHJlczogc3RyaW5nW10gPSBbXTtcbi8vIFx0aWYgKGluY2x1ZGVQYWNrYWdlcykge1xuLy8gXHRcdGZvciAoY29uc3QgbmFtZSBvZiBpbmNsdWRlUGFja2FnZXMpIHtcbi8vIFx0XHRcdGxldCBwayA9IGFwaS5wYWNrYWdlSW5mby5tb2R1bGVNYXBbbmFtZV07XG4vLyBcdFx0XHRpZiAocGsgPT0gbnVsbCkge1xuLy8gXHRcdFx0XHRjb25zdCBzY29wZSA9IChhcGkuY29uZmlnLmdldCgncGFja2FnZVNjb3BlcycpIGFzIHN0cmluZ1tdKS5maW5kKHNjb3BlID0+IHtcbi8vIFx0XHRcdFx0XHRyZXR1cm4gYXBpLnBhY2thZ2VJbmZvLm1vZHVsZU1hcFtgQCR7c2NvcGV9LyR7bmFtZX1gXSAhPSBudWxsO1xuLy8gXHRcdFx0XHR9KTtcbi8vIFx0XHRcdFx0aWYgKHNjb3BlID09IG51bGwpIHtcbi8vIFx0XHRcdFx0XHRsb2cuZXJyb3IoJ1BhY2thZ2UgbmFtZWQ6IFwiJXNcIiBpcyBub3QgZm91bmQgd2l0aCBwb3NzaWJsZSBzY29wZSBuYW1lIGluIFwiJXNcIicsIG5hbWUsXG4vLyBcdFx0XHRcdFx0XHQoYXBpLmNvbmZpZy5nZXQoJ3BhY2thZ2VTY29wZXMnKSBhcyBzdHJpbmdbXSkuam9pbignLCAnKSk7XG4vLyBcdFx0XHRcdFx0YnJlYWs7XG4vLyBcdFx0XHRcdH1cbi8vIFx0XHRcdFx0cGsgPSBhcGkucGFja2FnZUluZm8ubW9kdWxlTWFwW2BAJHtzY29wZX0vJHtuYW1lfWBdO1xuLy8gXHRcdFx0fVxuLy8gXHRcdFx0ZWFjaFBhY2thZ2UocGspO1xuLy8gXHRcdH1cbi8vIFx0fSBlbHNlIHtcbi8vIFx0XHRmb3IgKGNvbnN0IHBrIG9mIGFwaS5wYWNrYWdlSW5mby5hbGxNb2R1bGVzKSB7XG4vLyBcdFx0XHRlYWNoUGFja2FnZShwayk7XG4vLyBcdFx0fVxuLy8gXHR9XG5cbi8vIFx0ZnVuY3Rpb24gZWFjaFBhY2thZ2UocGs6IFBhY2thZ2VCcm93c2VySW5zdGFuY2UpIHtcbi8vIFx0XHRpZiAocGsuZHIgPT0gbnVsbCB8fCBway5kci5uZ01vZHVsZSA9PSBudWxsKVxuLy8gXHRcdFx0cmV0dXJuO1xuXG4vLyBcdFx0bGV0IG1vZHVsZXMgPSBway5kci5uZ01vZHVsZTtcbi8vIFx0XHRpZiAoIUFycmF5LmlzQXJyYXkobW9kdWxlcykpXG4vLyBcdFx0XHRtb2R1bGVzID0gW21vZHVsZXNdO1xuXG4vLyBcdFx0Zm9yIChsZXQgbmFtZSBvZiBtb2R1bGVzKSB7XG4vLyBcdFx0XHRuYW1lID0gXy50cmltU3RhcnQobmFtZSwgJy4vJyk7XG4vLyBcdFx0XHRpZiAocGsgIT09IGFwcE1vZHVsZVBrKSB7XG4vLyBcdFx0XHRcdGlmIChuYW1lLmluZGV4T2YoJyMnKSA8IDApXG4vLyBcdFx0XHRcdFx0cmVzLnB1c2gocGsubG9uZ05hbWUgKyAnIycgKyBuYW1lKTtcbi8vIFx0XHRcdFx0ZWxzZVxuLy8gXHRcdFx0XHRcdHJlcy5wdXNoKHBrLmxvbmdOYW1lICsgJy8nICsgbmFtZSk7XG4vLyBcdFx0XHR9IGVsc2Uge1xuLy8gXHRcdFx0XHQvLyBwYWNrYWdlIGlzIHNhbWUgYXMgdGhlIG9uZSBhcHAubW9kdWxlIGJlbG9uZ3MgdG8sIHdlIHVzZSByZWxhdGl2ZSBwYXRoIGluc3RlYWQgb2YgcGFja2FnZSBuYW1lXG4vLyBcdFx0XHRcdGlmIChuYW1lLmluZGV4T2YoJyMnKSA8IDApXG4vLyBcdFx0XHRcdFx0dGhyb3cgbmV3IEVycm9yKGBJbiAke3BrLnJlYWxQYWNrYWdlUGF0aH0vcGFja2FnZS5qc29uLCB2YWx1ZSBvZiBcImRyLm5nTW9kdWxlXCIgYXJyYXlgICtcbi8vIFx0XHRcdFx0XHRcdGBtdXN0IGJlIGluIGZvcm0gb2YgJzxwYXRoPiM8ZXhwb3J0IE5nTW9kdWxlIG5hbWU+JywgYnV0IGhlcmUgaXQgaXMgJyR7bmFtZX0nYCk7XG4vLyBcdFx0XHRcdGNvbnN0IG5hbWVQYXJ0cyA9IG5hbWUuc3BsaXQoJyMnKTtcbi8vIFx0XHRcdFx0bmFtZSA9IHJlbGF0aXZlKGFwcE1vZHVsZURpciwgbmFtZVBhcnRzWzBdKSArICcjJyArIG5hbWVQYXJ0c1sxXTtcbi8vIFx0XHRcdFx0bmFtZSA9IG5hbWUucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuLy8gXHRcdFx0XHRpZiAoIW5hbWUuc3RhcnRzV2l0aCgnLicpKVxuLy8gXHRcdFx0XHRcdG5hbWUgPSAnLi8nICsgbmFtZTtcbi8vIFx0XHRcdFx0cmVzLnB1c2gobmFtZSk7XG4vLyBcdFx0XHR9XG4vLyBcdFx0fVxuLy8gXHR9XG4vLyBcdHJldHVybiByZXM7XG4vLyB9XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gYXBwTW9kdWxlUGtOYW1lIHBhY2thZ2UgbmFtZSBvZiB0aGUgb25lIGNvbnRhaW5zIGFwcC5tb2R1bGUudHNcbiAqIEBwYXJhbSBhcHBNb2R1bGVEaXIgYXBwLm1vZHVsZS50cydzIGRpcmVjdG9yeSwgdXNlZCB0byBjYWxjdWxhdGUgcmVsYXRpdmUgcGF0aFxuICovXG4vLyBmdW5jdGlvbiByZW1vdmFibGVOZ01vZHVsZXMoYXBwTW9kdWxlUGs6IFBhY2thZ2VCcm93c2VySW5zdGFuY2UsIGFwcE1vZHVsZURpcjogc3RyaW5nKTogc3RyaW5nW10ge1xuLy8gXHRyZXR1cm4gcGFja2FnZU5hbWVzMk5nTW9kdWxlKGFwcE1vZHVsZVBrLCBhcHBNb2R1bGVEaXIpO1xuLy8gfVxuIl19
