"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* tslint:disable max-line-length */
const __api_1 = tslib_1.__importDefault(require("__api"));
const _ = tslib_1.__importStar(require("lodash"));
const log4js = tslib_1.__importStar(require("log4js"));
const rxjs_1 = require("rxjs");
const ts_before_aot_1 = tslib_1.__importDefault(require("./utils/ts-before-aot"));
const parse_app_module_1 = tslib_1.__importStar(require("./utils/parse-app-module"));
const path_1 = require("path");
const ts_compiler_1 = require("dr-comp-package/wfh/dist/ts-compiler");
const ts_ast_query_1 = tslib_1.__importDefault(require("./utils/ts-ast-query"));
const ng_aot_assets_1 = require("./ng-aot-assets");
const fs = tslib_1.__importStar(require("fs"));
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
        let drcpIncludeBuf;
        const tsconfigFile = ngParam.browserOptions.tsConfig;
        const hmrEnabled = _.get(ngParam, 'builderConfig.options.hmr') || __api_1.default.argv.hmr;
        const preserveSymlinks = ngParam.browserOptions.preserveSymlinks;
        const tsCompilerOptions = ts_compiler_1.readTsConfig(tsconfigFile);
        let polyfillsFile = '';
        if (ngParam.browserOptions.polyfills)
            polyfillsFile = ngParam.browserOptions.polyfills.replace(/\\/g, '/');
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
                let normalFile = path_1.relative(process.cwd(), file);
                if (path_1.sep === '\\')
                    normalFile = normalFile.replace(/\\/g, '/');
                if (hmrEnabled && polyfillsFile && normalFile === polyfillsFile) {
                    const hmrClient = '\nimport \'webpack-hot-middleware/client\';';
                    const content = Buffer.from(buf).toString() + hmrClient;
                    log.info(`Append to ${normalFile}: \nimport \'webpack-hot-middleware/client\';`);
                    const bf = string2buffer(content);
                    this.tsCache.set(this.realFile(file, preserveSymlinks), bf);
                    return rxjs_1.of(bf);
                }
                else if (normalFile.endsWith('/drcp-include.ts')) {
                    if (drcpIncludeBuf)
                        return rxjs_1.of(drcpIncludeBuf);
                    let content = Buffer.from(buf).toString();
                    const legoConfig = browserLegoConfig();
                    let hmrBoot;
                    if (hmrEnabled) {
                        content = 'import hmrBootstrap from \'./hmr\';\n' + content;
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
                    }
                    else {
                        content += '\nObject.assign(window, {\
							__drcpEntryPage: null, \
							__drcpEntryPackage: null\
						});\n';
                        content += '\n(window as any)';
                    }
                    content += `.LEGO_CONFIG = ${JSON.stringify(legoConfig, null, '  ')};\n`;
                    drcpIncludeBuf = string2buffer(content);
                    log.info(chalk.cyan(file) + ':\n' + content);
                    this.tsCache.set(this.realFile(file, preserveSymlinks), drcpIncludeBuf);
                    return rxjs_1.of(drcpIncludeBuf);
                }
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy10cy1yZXBsYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG9DQUFvQztBQUNwQywwREFBd0I7QUFDeEIsa0RBQTRCO0FBQzVCLHVEQUFpQztBQUNqQywrQkFBZ0Q7QUFHaEQsa0ZBQW1EO0FBQ25ELHFGQUFvRjtBQUNwRiwrQkFBNEQ7QUFDNUQsc0VBQXFGO0FBRXJGLGdGQUE0QztBQUM1QyxtREFBNEM7QUFFNUMsK0NBQXlCO0FBQ3pCLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUUvQixNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUU5QyxNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDOzt1QkFFTixDQUFDLENBQUM7QUFDekIsOEVBQThFO0FBSTlFLE1BQXFCLFlBQVk7SUFLL0IsWUFBWSxPQUF3QjtRQUg1QixrQkFBYSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1FBQzFDLFlBQU8sR0FBRyxJQUFJLEdBQUcsRUFBdUIsQ0FBQztRQUcvQyxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNqRCxDQUFDO0lBRUQsS0FBSztRQUNILElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDdkIsQ0FBQztJQUVPLFFBQVEsQ0FBQyxJQUFZLEVBQUUsZ0JBQXlCO1FBQ3RELGdDQUFnQztRQUNoQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM5QyxJQUFJLFFBQVEsS0FBSyxTQUFTO1lBQ3hCLE9BQU8sUUFBUSxDQUFDO1FBQ2xCLElBQUksRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxjQUFj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LENBQUM7b0JBQ3ZCLElBQUksR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDO2dCQUNyQixHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ2hCO1NBQ0Y7SUFDSCxDQUFDO0lBQ0QsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILFNBQVMsa0JBQWtCLENBQUMsV0FBbUMsRUFBRSxZQUFvQjtJQUNuRixPQUFPLHFCQUFxQixDQUFDLFdBQVcsRUFBRSxZQUFZLENBQUMsQ0FBQztBQUMxRCxDQUFDIiwiZmlsZSI6Im5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci9kaXN0L25nLXRzLXJlcGxhY2UuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBtYXgtbGluZS1sZW5ndGggKi9cbmltcG9ydCBhcGkgZnJvbSAnX19hcGknO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQge29mLCB0aHJvd0Vycm9yLCBPYnNlcnZhYmxlfSBmcm9tICdyeGpzJztcbmltcG9ydCB7SG9va1JlYWRGdW5jfSBmcm9tICcuL3V0aWxzL3JlYWQtaG9vay12ZnNob3N0JztcbmltcG9ydCB7QW5ndWxhckNsaVBhcmFtfSBmcm9tICcuL25nL2NvbW1vbic7XG5pbXBvcnQgQXBpQW90Q29tcGlsZXIgZnJvbSAnLi91dGlscy90cy1iZWZvcmUtYW90JztcbmltcG9ydCBBcHBNb2R1bGVQYXJzZXIsIHtmaW5kQXBwTW9kdWxlRmlsZUZyb21NYWlufSBmcm9tICcuL3V0aWxzL3BhcnNlLWFwcC1tb2R1bGUnO1xuaW1wb3J0IHtzZXAgYXMgU0VQLCByZWxhdGl2ZSwgcmVzb2x2ZSwgZGlybmFtZX0gZnJvbSAncGF0aCc7XG5pbXBvcnQge3JlYWRUc0NvbmZpZywgdHJhbnNwaWxlU2luZ2xlVHN9IGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC90cy1jb21waWxlcic7XG5pbXBvcnQgUGFja2FnZUJyb3dzZXJJbnN0YW5jZSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvYnVpbGQtdXRpbC90cy9wYWNrYWdlLWluc3RhbmNlJztcbmltcG9ydCBTZWxlY3RvciBmcm9tICcuL3V0aWxzL3RzLWFzdC1xdWVyeSc7XG5pbXBvcnQge3JlcGxhY2VIdG1sfSBmcm9tICcuL25nLWFvdC1hc3NldHMnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5jb25zdCBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lKTtcblxuY29uc3QgYXBpVG1wbFRzID0gXy50ZW1wbGF0ZSgnaW1wb3J0IF9fRHJBcGkgZnJvbSBcXCdAZHItY29yZS9uZy1hcHAtYnVpbGRlci9zcmMvYXBwL2FwaVxcJztcXFxudmFyIF9fYXBpID0gX19EckFwaS5nZXRDYWNoZWRBcGkoXFwnPCU9cGFja2FnZU5hbWUlPlxcJykgfHwgbmV3IF9fRHJBcGkoXFwnPCU9cGFja2FnZU5hbWUlPlxcJyk7XFxcbl9fYXBpLmRlZmF1bHQgPSBfX2FwaTsnKTtcbi8vIGNvbnN0IGluY2x1ZGVUc0ZpbGUgPSBQYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4nLCAnc3JjJywgJ2RyY3AtaW5jbHVkZS50cycpO1xuXG5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVFNSZWFkSG9va2VyIHtcbiAgaG9va0Z1bmM6IEhvb2tSZWFkRnVuYztcbiAgcHJpdmF0ZSByZWFsRmlsZUNhY2hlID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcbiAgcHJpdmF0ZSB0c0NhY2hlID0gbmV3IE1hcDxzdHJpbmcsIEFycmF5QnVmZmVyPigpO1xuXG4gIGNvbnN0cnVjdG9yKG5nUGFyYW06IEFuZ3VsYXJDbGlQYXJhbSkge1xuICAgIHRoaXMuaG9va0Z1bmMgPSB0aGlzLmNyZWF0ZVRzUmVhZEhvb2sobmdQYXJhbSk7XG4gIH1cblxuICBjbGVhcigpIHtcbiAgICB0aGlzLnRzQ2FjaGUuY2xlYXIoKTtcbiAgfVxuXG4gIHByaXZhdGUgcmVhbEZpbGUoZmlsZTogc3RyaW5nLCBwcmVzZXJ2ZVN5bWxpbmtzOiBib29sZWFuKTogc3RyaW5nIHtcbiAgICAvLyBsb2cuaW5mbyhgcmVhZEZpbGUgJHtmaWxlfWApO1xuICAgIGNvbnN0IHJlYWxGaWxlID0gdGhpcy5yZWFsRmlsZUNhY2hlLmdldChmaWxlKTtcbiAgICBpZiAocmVhbEZpbGUgIT09IHVuZGVmaW5lZClcbiAgICAgIHJldHVybiByZWFsRmlsZTtcbiAgICBpZiAoZnMubHN0YXRTeW5jKGZpbGUpLmlzU3ltYm9saWNMaW5rKCkpIHtcbiAgICAgIGlmICghcHJlc2VydmVTeW1saW5rcylcbiAgICAgICAgbG9nLndhcm4oYFJlYWRpbmcgYSBzeW1saW5rOiAke2ZpbGV9LCBidXQgXCJwcmVzZXJ2ZVN5bWxpbmtzXCIgaXMgZmFsc2UuYCk7XG4gICAgICBjb25zdCByZiA9IGZzLnJlYWxwYXRoU3luYyhmaWxlKTtcbiAgICAgIHRoaXMucmVhbEZpbGVDYWNoZS5zZXQoZmlsZSwgcmYpO1xuICAgICAgcmV0dXJuIHJmO1xuICAgIH0gZWxzZVxuICAgICAgcmV0dXJuIGZpbGU7XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZVRzUmVhZEhvb2sobmdQYXJhbTogQW5ndWxhckNsaVBhcmFtKTogSG9va1JlYWRGdW5jIHtcbiAgICBsZXQgZHJjcEluY2x1ZGVCdWY6IEFycmF5QnVmZmVyO1xuXG4gICAgY29uc3QgdHNjb25maWdGaWxlID0gbmdQYXJhbS5icm93c2VyT3B0aW9ucy50c0NvbmZpZztcblxuICAgIGNvbnN0IGhtckVuYWJsZWQgPSBfLmdldChuZ1BhcmFtLCAnYnVpbGRlckNvbmZpZy5vcHRpb25zLmhtcicpIHx8IGFwaS5hcmd2LmhtcjtcbiAgICBjb25zdCBwcmVzZXJ2ZVN5bWxpbmtzID0gbmdQYXJhbS5icm93c2VyT3B0aW9ucy5wcmVzZXJ2ZVN5bWxpbmtzO1xuICAgIGNvbnN0IHRzQ29tcGlsZXJPcHRpb25zID0gcmVhZFRzQ29uZmlnKHRzY29uZmlnRmlsZSk7XG4gICAgbGV0IHBvbHlmaWxsc0ZpbGU6IHN0cmluZyA9ICcnO1xuICAgIGlmIChuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLnBvbHlmaWxscylcbiAgICAgIHBvbHlmaWxsc0ZpbGUgPSBuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLnBvbHlmaWxscy5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cbiAgICBjb25zdCBhcHBNb2R1bGVGaWxlID0gZmluZEFwcE1vZHVsZUZpbGVGcm9tTWFpbihyZXNvbHZlKG5nUGFyYW0uYnJvd3Nlck9wdGlvbnMubWFpbikpO1xuICAgIGxvZy5pbmZvKCdhcHAgbW9kdWxlIGZpbGU6ICcsIGFwcE1vZHVsZUZpbGUpO1xuXG4gICAgY29uc3QgaXNBb3QgPSBuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLmFvdDtcblxuICAgIHJldHVybiAoZmlsZTogc3RyaW5nLCBidWY6IEFycmF5QnVmZmVyKTogT2JzZXJ2YWJsZTxBcnJheUJ1ZmZlcj4gPT4ge1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKGlzQW90ICYmIGZpbGUuZW5kc1dpdGgoJy5jb21wb25lbnQuaHRtbCcpKSB7XG4gICAgICAgICAgY29uc3QgY2FjaGVkID0gdGhpcy50c0NhY2hlLmdldCh0aGlzLnJlYWxGaWxlKGZpbGUsIHByZXNlcnZlU3ltbGlua3MpKTtcbiAgICAgICAgICBpZiAoY2FjaGVkICE9IG51bGwpXG4gICAgICAgICAgICByZXR1cm4gb2YoY2FjaGVkKTtcbiAgICAgICAgICByZXR1cm4gb2Yoc3RyaW5nMmJ1ZmZlcihyZXBsYWNlSHRtbChmaWxlLCBCdWZmZXIuZnJvbShidWYpLnRvU3RyaW5nKCkpKSk7XG5cbiAgICAgICAgfSBlbHNlIGlmICghZmlsZS5lbmRzV2l0aCgnLnRzJykgfHwgZmlsZS5lbmRzV2l0aCgnLmQudHMnKSkge1xuICAgICAgICAgIHJldHVybiBvZihidWYpO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgY2FjaGVkID0gdGhpcy50c0NhY2hlLmdldCh0aGlzLnJlYWxGaWxlKGZpbGUsIHByZXNlcnZlU3ltbGlua3MpKTtcbiAgICAgICAgaWYgKGNhY2hlZCAhPSBudWxsKVxuICAgICAgICAgIHJldHVybiBvZihjYWNoZWQpO1xuICAgICAgICBsZXQgbm9ybWFsRmlsZSA9IHJlbGF0aXZlKHByb2Nlc3MuY3dkKCksIGZpbGUpO1xuICAgICAgICBpZiAoU0VQID09PSAnXFxcXCcpXG4gICAgICAgICAgbm9ybWFsRmlsZSA9IG5vcm1hbEZpbGUucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICBpZiAoaG1yRW5hYmxlZCAmJiBwb2x5ZmlsbHNGaWxlICYmIG5vcm1hbEZpbGUgPT09IHBvbHlmaWxsc0ZpbGUpIHtcbiAgICAgICAgICBjb25zdCBobXJDbGllbnQgPSAnXFxuaW1wb3J0IFxcJ3dlYnBhY2staG90LW1pZGRsZXdhcmUvY2xpZW50XFwnOyc7XG4gICAgICAgICAgY29uc3QgY29udGVudCA9IEJ1ZmZlci5mcm9tKGJ1ZikudG9TdHJpbmcoKSArIGhtckNsaWVudDtcbiAgICAgICAgICBsb2cuaW5mbyhgQXBwZW5kIHRvICR7bm9ybWFsRmlsZX06IFxcbmltcG9ydCBcXCd3ZWJwYWNrLWhvdC1taWRkbGV3YXJlL2NsaWVudFxcJztgKTtcbiAgICAgICAgICBjb25zdCBiZiA9IHN0cmluZzJidWZmZXIoY29udGVudCk7XG4gICAgICAgICAgdGhpcy50c0NhY2hlLnNldCh0aGlzLnJlYWxGaWxlKGZpbGUsIHByZXNlcnZlU3ltbGlua3MpLCBiZik7XG4gICAgICAgICAgcmV0dXJuIG9mKGJmKTtcbiAgICAgICAgfSBlbHNlIGlmIChub3JtYWxGaWxlLmVuZHNXaXRoKCcvZHJjcC1pbmNsdWRlLnRzJykpIHtcbiAgICAgICAgICBpZiAoZHJjcEluY2x1ZGVCdWYpXG4gICAgICAgICAgICByZXR1cm4gb2YoZHJjcEluY2x1ZGVCdWYpO1xuICAgICAgICAgIGxldCBjb250ZW50ID0gQnVmZmVyLmZyb20oYnVmKS50b1N0cmluZygpO1xuICAgICAgICAgIGNvbnN0IGxlZ29Db25maWcgPSBicm93c2VyTGVnb0NvbmZpZygpO1xuICAgICAgICAgIGxldCBobXJCb290OiBzdHJpbmc7XG4gICAgICAgICAgaWYgKGhtckVuYWJsZWQpIHtcbiAgICAgICAgICAgIGNvbnRlbnQgPSAnaW1wb3J0IGhtckJvb3RzdHJhcCBmcm9tIFxcJy4vaG1yXFwnO1xcbicgKyBjb250ZW50O1xuICAgICAgICAgICAgaG1yQm9vdCA9ICdobXJCb290c3RyYXAobW9kdWxlLCBib290c3RyYXApJztcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKCFuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLmFvdCkge1xuICAgICAgICAgICAgY29udGVudCA9ICdpbXBvcnQgXFwnY29yZS1qcy9lczcvcmVmbGVjdFxcJztcXG4nICsgY29udGVudDtcbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGhtckJvb3QpXG4gICAgICAgICAgICBjb250ZW50ID0gY29udGVudC5yZXBsYWNlKC9cXC9cXCogcmVwbGFjZSBcXCpcXC9ib290c3RyYXBcXChcXCkvZywgaG1yQm9vdCk7XG4gICAgICAgICAgaWYgKG5nUGFyYW0uc3NyKSB7XG4gICAgICAgICAgICBjb250ZW50ICs9ICdcXG5jb25zb2xlLmxvZyhcInNldCBnbG9iYWwuTEVHT19DT05GSUdcIik7JztcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gJ1xcbk9iamVjdC5hc3NpZ24oZ2xvYmFsLCB7XFxcblx0XHRcdFx0XHRcdFx0X19kcmNwRW50cnlQYWdlOiBudWxsLCBcXFxuXHRcdFx0XHRcdFx0XHRfX2RyY3BFbnRyeVBhY2thZ2U6IG51bGxcXFxuXHRcdFx0XHRcdFx0fSk7XFxuJztcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gJyhnbG9iYWwgYXMgYW55KSc7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gJ1xcbk9iamVjdC5hc3NpZ24od2luZG93LCB7XFxcblx0XHRcdFx0XHRcdFx0X19kcmNwRW50cnlQYWdlOiBudWxsLCBcXFxuXHRcdFx0XHRcdFx0XHRfX2RyY3BFbnRyeVBhY2thZ2U6IG51bGxcXFxuXHRcdFx0XHRcdFx0fSk7XFxuJztcbiAgICAgICAgICAgIGNvbnRlbnQgKz0gJ1xcbih3aW5kb3cgYXMgYW55KSc7XG4gICAgICAgICAgfVxuICAgICAgICAgIGNvbnRlbnQgKz0gYC5MRUdPX0NPTkZJRyA9ICR7SlNPTi5zdHJpbmdpZnkobGVnb0NvbmZpZywgbnVsbCwgJyAgJyl9O1xcbmA7XG4gICAgICAgICAgZHJjcEluY2x1ZGVCdWYgPSBzdHJpbmcyYnVmZmVyKGNvbnRlbnQpO1xuICAgICAgICAgIGxvZy5pbmZvKGNoYWxrLmN5YW4oZmlsZSkgKyAnOlxcbicgKyBjb250ZW50KTtcbiAgICAgICAgICB0aGlzLnRzQ2FjaGUuc2V0KHRoaXMucmVhbEZpbGUoZmlsZSwgcHJlc2VydmVTeW1saW5rcyksIGRyY3BJbmNsdWRlQnVmKTtcbiAgICAgICAgICByZXR1cm4gb2YoZHJjcEluY2x1ZGVCdWYpO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IGNvbXBQa2cgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoZmlsZSk7XG4gICAgICAgIGxldCBjb250ZW50ID0gQnVmZmVyLmZyb20oYnVmKS50b1N0cmluZygpO1xuICAgICAgICBsZXQgbmVlZExvZ0ZpbGUgPSBmYWxzZTtcbiAgICAgICAgLy8gcGF0Y2ggYXBwLm1vZHVsZS50c1xuICAgICAgICBpZiAoYXBwTW9kdWxlRmlsZSA9PT0gZmlsZSkge1xuICAgICAgICAgIGxvZy5pbmZvKCdwYXRjaCcsIGZpbGUpO1xuICAgICAgICAgIGNvbnN0IGFwcE1vZHVsZVBhY2thZ2UgPSBhcGkuZmluZFBhY2thZ2VCeUZpbGUoYXBwTW9kdWxlRmlsZSk7XG4gICAgICAgICAgY29uc3QgcmVtb3ZhYmxlcyA9IHJlbW92YWJsZU5nTW9kdWxlcyhhcHBNb2R1bGVQYWNrYWdlLCBkaXJuYW1lKGFwcE1vZHVsZUZpbGUpKTtcbiAgICAgICAgICBjb25zdCBuZ01vZHVsZXM6IHN0cmluZ1tdID0gZ2V0Um91dGVyTW9kdWxlcyhhcHBNb2R1bGVQYWNrYWdlLCBkaXJuYW1lKGFwcE1vZHVsZUZpbGUpKSB8fCByZW1vdmFibGVzO1xuICAgICAgICAgIC8vIG5nTW9kdWxlcy5wdXNoKGFwaS5wYWNrYWdlTmFtZSArICcvc3JjL2FwcCNEZXZlbG9wZXJNb2R1bGUnKTtcbiAgICAgICAgICBsb2cuaW5mbygnSW5zZXJ0IG9wdGlvbmFsIE5nTW9kdWxlcyB0byBBcHBNb2R1bGU6XFxuICAnICsgbmdNb2R1bGVzLmpvaW4oJ1xcbiAgJykpO1xuICAgICAgICAgIGNvbnRlbnQgPSBuZXcgQXBwTW9kdWxlUGFyc2VyKClcbiAgICAgICAgICAgIC5wYXRjaEZpbGUoZmlsZSwgY29udGVudCwgcmVtb3ZhYmxlcywgbmdNb2R1bGVzKTtcbiAgICAgICAgICBuZWVkTG9nRmlsZSA9IHRydWU7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgdHNTZWxlY3RvciA9IG5ldyBTZWxlY3Rvcihjb250ZW50LCBmaWxlKTtcbiAgICAgICAgY29uc3QgaGFzSW1wb3J0QXBpID0gdHNTZWxlY3Rvci5maW5kQWxsKCc6SW1wb3J0RGVjbGFyYXRpb24+Lm1vZHVsZVNwZWNpZmllcjpTdHJpbmdMaXRlcmFsJykuc29tZShhc3QgPT4ge1xuICAgICAgICAgIHJldHVybiAoYXN0IGFzIHRzLlN0cmluZ0xpdGVyYWwpLnRleHQgPT09ICdfX2FwaSc7XG4gICAgICAgIH0pO1xuICAgICAgICBsZXQgY2hhbmdlZCA9IGFwaS5icm93c2VySW5qZWN0b3IuaW5qZWN0VG9GaWxlKGZpbGUsIGNvbnRlbnQpO1xuXG4gICAgICAgIGNoYW5nZWQgPSBuZXcgQXBpQW90Q29tcGlsZXIoZmlsZSwgY2hhbmdlZCkucGFyc2Uoc291cmNlID0+IHRyYW5zcGlsZVNpbmdsZVRzKHNvdXJjZSwgdHNDb21waWxlck9wdGlvbnMpKTtcbiAgICAgICAgaWYgKGhhc0ltcG9ydEFwaSlcbiAgICAgICAgICBjaGFuZ2VkID0gYXBpVG1wbFRzKHtwYWNrYWdlTmFtZTogY29tcFBrZy5sb25nTmFtZX0pICsgJ1xcbicgKyBjaGFuZ2VkO1xuICAgICAgICBpZiAoY2hhbmdlZCAhPT0gY29udGVudCAmJiBuZ1BhcmFtLnNzcikge1xuICAgICAgICAgIGNoYW5nZWQgPSAnaW1wb3J0IFwiQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvc3JjL2RyY3AtaW5jbHVkZVwiO1xcbicgKyBjaGFuZ2VkO1xuICAgICAgICB9XG4gICAgICAgIGlmIChuZWVkTG9nRmlsZSlcbiAgICAgICAgICBsb2cuaW5mbyhjaGFsay5jeWFuKGZpbGUpICsgJzpcXG4nICsgY2hhbmdlZCk7XG4gICAgICAgIGNvbnN0IGJmID0gc3RyaW5nMmJ1ZmZlcihjaGFuZ2VkKTtcbiAgICAgICAgdGhpcy50c0NhY2hlLnNldCh0aGlzLnJlYWxGaWxlKGZpbGUsIHByZXNlcnZlU3ltbGlua3MpLCBiZik7XG4gICAgICAgIHJldHVybiBvZihiZik7XG4gICAgICB9IGNhdGNoIChleCkge1xuICAgICAgICBsb2cuZXJyb3IoZXgpO1xuICAgICAgICByZXR1cm4gdGhyb3dFcnJvcihleCk7XG4gICAgICB9XG4gICAgfTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RyaW5nMmJ1ZmZlcihpbnB1dDogc3RyaW5nKTogQXJyYXlCdWZmZXIge1xuICBjb25zdCBub2RlQnVmID0gQnVmZmVyLmZyb20oaW5wdXQpO1xuICBjb25zdCBsZW4gPSBub2RlQnVmLmJ5dGVMZW5ndGg7XG4gIGNvbnN0IG5ld0J1ZiA9IG5ldyBBcnJheUJ1ZmZlcihsZW4pO1xuICBjb25zdCBkYXRhVmlldyA9IG5ldyBEYXRhVmlldyhuZXdCdWYpO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgZGF0YVZpZXcuc2V0VWludDgoaSwgbm9kZUJ1Zi5yZWFkVUludDgoaSkpO1xuICB9XG4gIHJldHVybiBuZXdCdWY7XG59XG5cbmZ1bmN0aW9uIGJyb3dzZXJMZWdvQ29uZmlnKCkge1xuICB2YXIgYnJvd3NlclByb3BTZXQ6IGFueSA9IHt9O1xuICB2YXIgbGVnb0NvbmZpZzogYW55ID0ge307IC8vIGxlZ29Db25maWcgaXMgZ2xvYmFsIGNvbmZpZ3VyYXRpb24gcHJvcGVydGllcyB3aGljaCBhcHBseSB0byBhbGwgZW50cmllcyBhbmQgbW9kdWxlc1xuICBfLmVhY2goW1xuICAgICdzdGF0aWNBc3NldHNVUkwnLCAnc2VydmVyVVJMJywgJ3BhY2thZ2VDb250ZXh0UGF0aE1hcHBpbmcnLFxuICAgICdsb2NhbGVzJywgJ2Rldk1vZGUnLCAnb3V0cHV0UGF0aE1hcCdcbiAgXSwgcHJvcCA9PiBicm93c2VyUHJvcFNldFtwcm9wXSA9IDEpO1xuICBfLmVhY2goYXBpLmNvbmZpZygpLmJyb3dzZXJTaWRlQ29uZmlnUHJvcCwgcHJvcCA9PiBicm93c2VyUHJvcFNldFtwcm9wXSA9IHRydWUpO1xuICBfLmZvck93bihicm93c2VyUHJvcFNldCwgKG5vdGhpbmcsIHByb3BQYXRoKSA9PiBfLnNldChsZWdvQ29uZmlnLCBwcm9wUGF0aCwgXy5nZXQoYXBpLmNvbmZpZygpLCBwcm9wUGF0aCkpKTtcbiAgdmFyIGNvbXByZXNzZWRJbmZvID0gY29tcHJlc3NPdXRwdXRQYXRoTWFwKGxlZ29Db25maWcub3V0cHV0UGF0aE1hcCk7XG4gIGxlZ29Db25maWcub3V0cHV0UGF0aE1hcCA9IGNvbXByZXNzZWRJbmZvLmRpZmZNYXA7XG4gIGxlZ29Db25maWcuX291dHB1dEFzTmFtZXMgPSBjb21wcmVzc2VkSW5mby5zYW1lcztcbiAgbGVnb0NvbmZpZy5idWlsZExvY2FsZSA9IGFwaS5nZXRCdWlsZExvY2FsZSgpO1xuICBsb2cuZGVidWcoJ0RlZmluZVBsdWdpbiBMRUdPX0NPTkZJRzogJywgbGVnb0NvbmZpZyk7XG4gIHJldHVybiBsZWdvQ29uZmlnO1xufVxuXG5mdW5jdGlvbiBjb21wcmVzc091dHB1dFBhdGhNYXAocGF0aE1hcDogYW55KSB7XG4gIHZhciBuZXdNYXA6IGFueSA9IHt9O1xuICB2YXIgc2FtZUFzTmFtZXM6IHN0cmluZ1tdID0gW107XG4gIF8uZWFjaChwYXRoTWFwLCAodmFsdWUsIGtleSkgPT4ge1xuICAgIHZhciBwYXJzZWQgPSBhcGkucGFja2FnZVV0aWxzLnBhcnNlTmFtZShrZXkpO1xuICAgIGlmIChwYXJzZWQubmFtZSAhPT0gdmFsdWUpIHtcbiAgICAgIG5ld01hcFtrZXldID0gdmFsdWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHNhbWVBc05hbWVzLnB1c2goa2V5KTtcbiAgICB9XG4gIH0pO1xuICByZXR1cm4ge1xuICAgIHNhbWVzOiBzYW1lQXNOYW1lcyxcbiAgICBkaWZmTWFwOiBuZXdNYXBcbiAgfTtcbn1cblxuZnVuY3Rpb24gZ2V0Um91dGVyTW9kdWxlcyhhcHBNb2R1bGVQYWNrYWdlOiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlLCBhcHBNb2R1bGVEaXI6IHN0cmluZykge1xuICBjb25zdCBuZ01vZHVsZXM6IHN0cmluZ1tdID0gYXBpLmNvbmZpZy5nZXQoW2FwaS5wYWNrYWdlTmFtZSwgJ25nTW9kdWxlJ10pIHx8IFtdO1xuICBjb25zdCBuZ1BhY2thZ2VNb2R1bGVzID0gbmV3IFNldChwYWNrYWdlTmFtZXMyTmdNb2R1bGUoYXBwTW9kdWxlUGFja2FnZSwgYXBwTW9kdWxlRGlyLFxuICAgIGFwaS5jb25maWcuZ2V0KFthcGkucGFja2FnZU5hbWUsICduZ1BhY2thZ2UnXSkgfHwgW10pKTtcbiAgbmdNb2R1bGVzLmZvckVhY2gobSA9PiBuZ1BhY2thZ2VNb2R1bGVzLmFkZChtKSk7XG4gIHJldHVybiBBcnJheS5mcm9tKG5nUGFja2FnZU1vZHVsZXMpO1xufVxuXG5mdW5jdGlvbiBwYWNrYWdlTmFtZXMyTmdNb2R1bGUoYXBwTW9kdWxlUGs6IFBhY2thZ2VCcm93c2VySW5zdGFuY2UsIGFwcE1vZHVsZURpcjogc3RyaW5nLCBpbmNsdWRlUGFja2FnZXM/OiBzdHJpbmdbXSk6IHN0cmluZ1tdIHtcbiAgY29uc3QgcmVzOiBzdHJpbmdbXSA9IFtdO1xuICBpZiAoaW5jbHVkZVBhY2thZ2VzKSB7XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIGluY2x1ZGVQYWNrYWdlcykge1xuICAgICAgbGV0IHBrID0gYXBpLnBhY2thZ2VJbmZvLm1vZHVsZU1hcFtuYW1lXTtcbiAgICAgIGlmIChwayA9PSBudWxsKSB7XG4gICAgICAgIGNvbnN0IHNjb3BlID0gKGFwaS5jb25maWcuZ2V0KCdwYWNrYWdlU2NvcGVzJykgYXMgc3RyaW5nW10pLmZpbmQoc2NvcGUgPT4ge1xuICAgICAgICAgIHJldHVybiBhcGkucGFja2FnZUluZm8ubW9kdWxlTWFwW2BAJHtzY29wZX0vJHtuYW1lfWBdICE9IG51bGw7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoc2NvcGUgPT0gbnVsbCkge1xuICAgICAgICAgIGxvZy5lcnJvcignUGFja2FnZSBuYW1lZDogXCIlc1wiIGlzIG5vdCBmb3VuZCB3aXRoIHBvc3NpYmxlIHNjb3BlIG5hbWUgaW4gXCIlc1wiJywgbmFtZSxcbiAgICAgICAgICAgIChhcGkuY29uZmlnLmdldCgncGFja2FnZVNjb3BlcycpIGFzIHN0cmluZ1tdKS5qb2luKCcsICcpKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBwayA9IGFwaS5wYWNrYWdlSW5mby5tb2R1bGVNYXBbYEAke3Njb3BlfS8ke25hbWV9YF07XG4gICAgICB9XG4gICAgICBlYWNoUGFja2FnZShwayk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGZvciAoY29uc3QgcGsgb2YgYXBpLnBhY2thZ2VJbmZvLmFsbE1vZHVsZXMpIHtcbiAgICAgIGVhY2hQYWNrYWdlKHBrKTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBlYWNoUGFja2FnZShwazogUGFja2FnZUJyb3dzZXJJbnN0YW5jZSkge1xuICAgIGlmIChway5kciA9PSBudWxsIHx8IHBrLmRyLm5nTW9kdWxlID09IG51bGwpXG4gICAgICByZXR1cm47XG5cbiAgICBsZXQgbW9kdWxlcyA9IHBrLmRyLm5nTW9kdWxlO1xuICAgIGlmICghQXJyYXkuaXNBcnJheShtb2R1bGVzKSlcbiAgICAgIG1vZHVsZXMgPSBbbW9kdWxlc107XG5cbiAgICBmb3IgKGxldCBuYW1lIG9mIG1vZHVsZXMpIHtcbiAgICAgIG5hbWUgPSBfLnRyaW1TdGFydChuYW1lLCAnLi8nKTtcbiAgICAgIGlmIChwayAhPT0gYXBwTW9kdWxlUGspIHtcbiAgICAgICAgaWYgKG5hbWUuaW5kZXhPZignIycpIDwgMClcbiAgICAgICAgICByZXMucHVzaChway5sb25nTmFtZSArICcjJyArIG5hbWUpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgcmVzLnB1c2gocGsubG9uZ05hbWUgKyAnLycgKyBuYW1lKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIHBhY2thZ2UgaXMgc2FtZSBhcyB0aGUgb25lIGFwcC5tb2R1bGUgYmVsb25ncyB0bywgd2UgdXNlIHJlbGF0aXZlIHBhdGggaW5zdGVhZCBvZiBwYWNrYWdlIG5hbWVcbiAgICAgICAgaWYgKG5hbWUuaW5kZXhPZignIycpIDwgMClcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEluICR7cGsucmVhbFBhY2thZ2VQYXRofS9wYWNrYWdlLmpzb24sIHZhbHVlIG9mIFwiZHIubmdNb2R1bGVcIiBhcnJheWAgK1xuICAgICAgICAgICAgYG11c3QgYmUgaW4gZm9ybSBvZiAnPHBhdGg+IzxleHBvcnQgTmdNb2R1bGUgbmFtZT4nLCBidXQgaGVyZSBpdCBpcyAnJHtuYW1lfSdgKTtcbiAgICAgICAgY29uc3QgbmFtZVBhcnRzID0gbmFtZS5zcGxpdCgnIycpO1xuICAgICAgICBuYW1lID0gcmVsYXRpdmUoYXBwTW9kdWxlRGlyLCBuYW1lUGFydHNbMF0pICsgJyMnICsgbmFtZVBhcnRzWzFdO1xuICAgICAgICBuYW1lID0gbmFtZS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIGlmICghbmFtZS5zdGFydHNXaXRoKCcuJykpXG4gICAgICAgICAgbmFtZSA9ICcuLycgKyBuYW1lO1xuICAgICAgICByZXMucHVzaChuYW1lKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHJlcztcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSBhcHBNb2R1bGVQa05hbWUgcGFja2FnZSBuYW1lIG9mIHRoZSBvbmUgY29udGFpbnMgYXBwLm1vZHVsZS50c1xuICogQHBhcmFtIGFwcE1vZHVsZURpciBhcHAubW9kdWxlLnRzJ3MgZGlyZWN0b3J5LCB1c2VkIHRvIGNhbGN1bGF0ZSByZWxhdGl2ZSBwYXRoXG4gKi9cbmZ1bmN0aW9uIHJlbW92YWJsZU5nTW9kdWxlcyhhcHBNb2R1bGVQazogUGFja2FnZUJyb3dzZXJJbnN0YW5jZSwgYXBwTW9kdWxlRGlyOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIHJldHVybiBwYWNrYWdlTmFtZXMyTmdNb2R1bGUoYXBwTW9kdWxlUGssIGFwcE1vZHVsZURpcik7XG59XG4iXX0=
