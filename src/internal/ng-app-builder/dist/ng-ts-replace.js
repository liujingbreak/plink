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
const fs = tslib_1.__importStar(require("fs"));
const chalk = require('chalk');
const log = log4js.getLogger(__api_1.default.packageName);
// const apiTmpl = _.template('var __DrApi = require(\'@dr-core/webpack2-builder/browser/api\');\
// var __api = __DrApi.getCachedApi(\'<%=packageName%>\') || __DrApi(\'<%=packageName%>\');\
//  __api.default = __api;');
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
        return (file, buf) => {
            try {
                if (!file.endsWith('.ts') || file.endsWith('.d.ts')) {
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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy10cy1yZXBsYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG9DQUFvQztBQUNwQywwREFBd0I7QUFDeEIsa0RBQTRCO0FBQzVCLHVEQUFpQztBQUNqQywrQkFBZ0Q7QUFHaEQsa0ZBQW1EO0FBQ25ELHFGQUFvRjtBQUNwRiwrQkFBNEQ7QUFDNUQsc0VBQXFGO0FBRXJGLGdGQUE0QztBQUU1QywrQ0FBeUI7QUFDekIsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBRS9CLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUMsZUFBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBRTlDLGlHQUFpRztBQUNqRyw0RkFBNEY7QUFDNUYsNkJBQTZCO0FBRTdCLE1BQU0sU0FBUyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUM7O3VCQUVOLENBQUMsQ0FBQztBQUN6Qiw4RUFBOEU7QUFJOUUsTUFBcUIsWUFBWTtJQUtoQyxZQUFZLE9BQXdCO1FBSDVCLGtCQUFhLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7UUFDMUMsWUFBTyxHQUFHLElBQUksR0FBRyxFQUF1QixDQUFDO1FBR2hELElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFFRCxLQUFLO1FBQ0osSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN0QixDQUFDO0lBRU8sUUFBUSxDQUFDLElBQVksRUFBRSxnQkFBeUI7UUFDdkQsZ0NBQWdDO1FBQ2hDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzlDLElBQUksUUFBUSxLQUFLLFNBQVM7WUFDekIsT0FBTyxRQUFRLENBQUM7UUFDakIsSUFBSSxFQUFFLENBQUMsU0FB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LEdBQUcsSUFBSSxDQUFDLENBQUM7O29CQUVuQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDO2FBQ3BDO2lCQUFNO2dCQUNOLGlHQUFpRztnQkFDakcsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUM7b0JBQ3hCLE1BQU0sSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUMsZUFBZSw2Q0FBNkM7d0JBQ3BGLHVFQUF1RSxJQUFJLEdBQUcsQ0FBQyxDQUFDO2dCQUNsRixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNsQyxJQUFJLEdBQUcsZUFBUSxDQUFDLFlBQVksRUFBRSxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNqRSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQ2hDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQztvQkFDeEIsSUFBSSxHQUFHLElBQUksR0FBRyxJQUFJLENBQUM7Z0JBQ3BCLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7YUFDZjtTQUNEO0lBQ0YsQ0FBQztJQUNELE9BQU8sR0FBRyxDQUFDO0FBQ1osQ0FBQztBQUVEOzs7O0dBSUc7QUFDSCxTQUFTLGtCQUFrQixDQUFDLFdBQW1DLEVBQUUsWUFBb0I7SUFDcEYsT0FBTyxxQkFBcUIsQ0FBQyxXQUFXLEVBQUUsWUFBWSxDQUFDLENBQUM7QUFDekQsQ0FBQyIsImZpbGUiOiJub2RlX21vZHVsZXMvQGRyLWNvcmUvbmctYXBwLWJ1aWxkZXIvZGlzdC9uZy10cy1yZXBsYWNlLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbWF4LWxpbmUtbGVuZ3RoICovXG5pbXBvcnQgYXBpIGZyb20gJ19fYXBpJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtvZiwgdGhyb3dFcnJvciwgT2JzZXJ2YWJsZX0gZnJvbSAncnhqcyc7XG5pbXBvcnQge0hvb2tSZWFkRnVuY30gZnJvbSAnLi91dGlscy9yZWFkLWhvb2stdmZzaG9zdCc7XG5pbXBvcnQge0FuZ3VsYXJDbGlQYXJhbX0gZnJvbSAnLi9uZy9jb21tb24nO1xuaW1wb3J0IEFwaUFvdENvbXBpbGVyIGZyb20gJy4vdXRpbHMvdHMtYmVmb3JlLWFvdCc7XG5pbXBvcnQgQXBwTW9kdWxlUGFyc2VyLCB7ZmluZEFwcE1vZHVsZUZpbGVGcm9tTWFpbn0gZnJvbSAnLi91dGlscy9wYXJzZS1hcHAtbW9kdWxlJztcbmltcG9ydCB7c2VwIGFzIFNFUCwgcmVsYXRpdmUsIHJlc29sdmUsIGRpcm5hbWV9IGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtyZWFkVHNDb25maWcsIHRyYW5zcGlsZVNpbmdsZVRzfSBmcm9tICdkci1jb21wLXBhY2thZ2Uvd2ZoL2Rpc3QvdHMtY29tcGlsZXInO1xuaW1wb3J0IFBhY2thZ2VCcm93c2VySW5zdGFuY2UgZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L2J1aWxkLXV0aWwvdHMvcGFja2FnZS1pbnN0YW5jZSc7XG5pbXBvcnQgU2VsZWN0b3IgZnJvbSAnLi91dGlscy90cy1hc3QtcXVlcnknO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5jb25zdCBjaGFsayA9IHJlcXVpcmUoJ2NoYWxrJyk7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoYXBpLnBhY2thZ2VOYW1lKTtcblxuLy8gY29uc3QgYXBpVG1wbCA9IF8udGVtcGxhdGUoJ3ZhciBfX0RyQXBpID0gcmVxdWlyZShcXCdAZHItY29yZS93ZWJwYWNrMi1idWlsZGVyL2Jyb3dzZXIvYXBpXFwnKTtcXFxuLy8gdmFyIF9fYXBpID0gX19EckFwaS5nZXRDYWNoZWRBcGkoXFwnPCU9cGFja2FnZU5hbWUlPlxcJykgfHwgX19EckFwaShcXCc8JT1wYWNrYWdlTmFtZSU+XFwnKTtcXFxuLy8gIF9fYXBpLmRlZmF1bHQgPSBfX2FwaTsnKTtcblxuY29uc3QgYXBpVG1wbFRzID0gXy50ZW1wbGF0ZSgnaW1wb3J0IF9fRHJBcGkgZnJvbSBcXCdAZHItY29yZS9uZy1hcHAtYnVpbGRlci9zcmMvYXBwL2FwaVxcJztcXFxudmFyIF9fYXBpID0gX19EckFwaS5nZXRDYWNoZWRBcGkoXFwnPCU9cGFja2FnZU5hbWUlPlxcJykgfHwgbmV3IF9fRHJBcGkoXFwnPCU9cGFja2FnZU5hbWUlPlxcJyk7XFxcbl9fYXBpLmRlZmF1bHQgPSBfX2FwaTsnKTtcbi8vIGNvbnN0IGluY2x1ZGVUc0ZpbGUgPSBQYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4nLCAnc3JjJywgJ2RyY3AtaW5jbHVkZS50cycpO1xuXG5cblxuZXhwb3J0IGRlZmF1bHQgY2xhc3MgVFNSZWFkSG9va2VyIHtcblx0aG9va0Z1bmM6IEhvb2tSZWFkRnVuYztcblx0cHJpdmF0ZSByZWFsRmlsZUNhY2hlID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKTtcblx0cHJpdmF0ZSB0c0NhY2hlID0gbmV3IE1hcDxzdHJpbmcsIEFycmF5QnVmZmVyPigpO1xuXG5cdGNvbnN0cnVjdG9yKG5nUGFyYW06IEFuZ3VsYXJDbGlQYXJhbSkge1xuXHRcdHRoaXMuaG9va0Z1bmMgPSB0aGlzLmNyZWF0ZVRzUmVhZEhvb2sobmdQYXJhbSk7XG5cdH1cblxuXHRjbGVhcigpIHtcblx0XHR0aGlzLnRzQ2FjaGUuY2xlYXIoKTtcblx0fVxuXG5cdHByaXZhdGUgcmVhbEZpbGUoZmlsZTogc3RyaW5nLCBwcmVzZXJ2ZVN5bWxpbmtzOiBib29sZWFuKTogc3RyaW5nIHtcblx0XHQvLyBsb2cuaW5mbyhgcmVhZEZpbGUgJHtmaWxlfWApO1xuXHRcdGNvbnN0IHJlYWxGaWxlID0gdGhpcy5yZWFsRmlsZUNhY2hlLmdldChmaWxlKTtcblx0XHRpZiAocmVhbEZpbGUgIT09IHVuZGVmaW5lZClcblx0XHRcdHJldHVybiByZWFsRmlsZTtcblx0XHRpZiAoZnMubHN0YXRTeW5jKGZpbGUpLmlzU3ltYm9saWNMaW5rKCkpIHtcblx0XHRcdGlmICghcHJlc2VydmVTeW1saW5rcylcblx0XHRcdFx0bG9nLndhcm4oYFJlYWRpbmcgYSBzeW1saW5rOiAke2ZpbGV9LCBidXQgXCJwcmVzZXJ2ZVN5bWxpbmtzXCIgaXMgZmFsc2UuYCk7XG5cdFx0XHRjb25zdCByZiA9IGZzLnJlYWxwYXRoU3luYyhmaWxlKTtcblx0XHRcdHRoaXMucmVhbEZpbGVDYWNoZS5zZXQoZmlsZSwgcmYpO1xuXHRcdFx0cmV0dXJuIHJmO1xuXHRcdH0gZWxzZVxuXHRcdFx0cmV0dXJuIGZpbGU7XG5cdH1cblxuXHRwcml2YXRlIGNyZWF0ZVRzUmVhZEhvb2sobmdQYXJhbTogQW5ndWxhckNsaVBhcmFtKTogSG9va1JlYWRGdW5jIHtcblx0XHRsZXQgZHJjcEluY2x1ZGVCdWY6IEFycmF5QnVmZmVyO1xuXG5cdFx0Y29uc3QgdHNjb25maWdGaWxlID0gbmdQYXJhbS5icm93c2VyT3B0aW9ucy50c0NvbmZpZztcblxuXHRcdGNvbnN0IGhtckVuYWJsZWQgPSBfLmdldChuZ1BhcmFtLCAnYnVpbGRlckNvbmZpZy5vcHRpb25zLmhtcicpIHx8IGFwaS5hcmd2Lmhtcjtcblx0XHRjb25zdCBwcmVzZXJ2ZVN5bWxpbmtzID0gbmdQYXJhbS5icm93c2VyT3B0aW9ucy5wcmVzZXJ2ZVN5bWxpbmtzO1xuXHRcdGNvbnN0IHRzQ29tcGlsZXJPcHRpb25zID0gcmVhZFRzQ29uZmlnKHRzY29uZmlnRmlsZSk7XG5cdFx0bGV0IHBvbHlmaWxsc0ZpbGU6IHN0cmluZyA9ICcnO1xuXHRcdGlmIChuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLnBvbHlmaWxscylcblx0XHRcdHBvbHlmaWxsc0ZpbGUgPSBuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLnBvbHlmaWxscy5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cblx0XHRjb25zdCBhcHBNb2R1bGVGaWxlID0gZmluZEFwcE1vZHVsZUZpbGVGcm9tTWFpbihyZXNvbHZlKG5nUGFyYW0uYnJvd3Nlck9wdGlvbnMubWFpbikpO1xuXHRcdGxvZy5pbmZvKCdhcHAgbW9kdWxlIGZpbGU6ICcsIGFwcE1vZHVsZUZpbGUpO1xuXG5cdFx0cmV0dXJuIChmaWxlOiBzdHJpbmcsIGJ1ZjogQXJyYXlCdWZmZXIpOiBPYnNlcnZhYmxlPEFycmF5QnVmZmVyPiA9PiB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRpZiAoIWZpbGUuZW5kc1dpdGgoJy50cycpIHx8IGZpbGUuZW5kc1dpdGgoJy5kLnRzJykpIHtcblx0XHRcdFx0XHRyZXR1cm4gb2YoYnVmKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRjb25zdCBjYWNoZWQgPSB0aGlzLnRzQ2FjaGUuZ2V0KHRoaXMucmVhbEZpbGUoZmlsZSwgcHJlc2VydmVTeW1saW5rcykpO1xuXHRcdFx0XHRpZiAoY2FjaGVkICE9IG51bGwpXG5cdFx0XHRcdFx0cmV0dXJuIG9mKGNhY2hlZCk7XG5cdFx0XHRcdGxldCBub3JtYWxGaWxlID0gcmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgZmlsZSk7XG5cdFx0XHRcdGlmIChTRVAgPT09ICdcXFxcJylcblx0XHRcdFx0XHRub3JtYWxGaWxlID0gbm9ybWFsRmlsZS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cdFx0XHRcdGlmIChobXJFbmFibGVkICYmIHBvbHlmaWxsc0ZpbGUgJiYgbm9ybWFsRmlsZSA9PT0gcG9seWZpbGxzRmlsZSkge1xuXHRcdFx0XHRcdGNvbnN0IGhtckNsaWVudCA9ICdcXG5pbXBvcnQgXFwnd2VicGFjay1ob3QtbWlkZGxld2FyZS9jbGllbnRcXCc7Jztcblx0XHRcdFx0XHRjb25zdCBjb250ZW50ID0gQnVmZmVyLmZyb20oYnVmKS50b1N0cmluZygpICsgaG1yQ2xpZW50O1xuXHRcdFx0XHRcdGxvZy5pbmZvKGBBcHBlbmQgdG8gJHtub3JtYWxGaWxlfTogXFxuaW1wb3J0IFxcJ3dlYnBhY2staG90LW1pZGRsZXdhcmUvY2xpZW50XFwnO2ApO1xuXHRcdFx0XHRcdGNvbnN0IGJmID0gc3RyaW5nMmJ1ZmZlcihjb250ZW50KTtcblx0XHRcdFx0XHR0aGlzLnRzQ2FjaGUuc2V0KHRoaXMucmVhbEZpbGUoZmlsZSwgcHJlc2VydmVTeW1saW5rcyksIGJmKTtcblx0XHRcdFx0XHRyZXR1cm4gb2YoYmYpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKG5vcm1hbEZpbGUuZW5kc1dpdGgoJy9kcmNwLWluY2x1ZGUudHMnKSkge1xuXHRcdFx0XHRcdGlmIChkcmNwSW5jbHVkZUJ1Zilcblx0XHRcdFx0XHRcdHJldHVybiBvZihkcmNwSW5jbHVkZUJ1Zik7XG5cdFx0XHRcdFx0bGV0IGNvbnRlbnQgPSBCdWZmZXIuZnJvbShidWYpLnRvU3RyaW5nKCk7XG5cdFx0XHRcdFx0Y29uc3QgbGVnb0NvbmZpZyA9IGJyb3dzZXJMZWdvQ29uZmlnKCk7XG5cdFx0XHRcdFx0bGV0IGhtckJvb3Q6IHN0cmluZztcblx0XHRcdFx0XHRpZiAoaG1yRW5hYmxlZCkge1xuXHRcdFx0XHRcdFx0Y29udGVudCA9ICdpbXBvcnQgaG1yQm9vdHN0cmFwIGZyb20gXFwnLi9obXJcXCc7XFxuJyArIGNvbnRlbnQ7XG5cdFx0XHRcdFx0XHRobXJCb290ID0gJ2htckJvb3RzdHJhcChtb2R1bGUsIGJvb3RzdHJhcCknO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoIW5nUGFyYW0uYnJvd3Nlck9wdGlvbnMuYW90KSB7XG5cdFx0XHRcdFx0XHRjb250ZW50ID0gJ2ltcG9ydCBcXCdjb3JlLWpzL2VzNy9yZWZsZWN0XFwnO1xcbicgKyBjb250ZW50O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoaG1yQm9vdClcblx0XHRcdFx0XHRcdGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoL1xcL1xcKiByZXBsYWNlIFxcKlxcL2Jvb3RzdHJhcFxcKFxcKS9nLCBobXJCb290KTtcblx0XHRcdFx0XHRpZiAobmdQYXJhbS5zc3IpIHtcblx0XHRcdFx0XHRcdGNvbnRlbnQgKz0gJ1xcbmNvbnNvbGUubG9nKFwic2V0IGdsb2JhbC5MRUdPX0NPTkZJR1wiKTsnO1xuXHRcdFx0XHRcdFx0Y29udGVudCArPSAnXFxuT2JqZWN0LmFzc2lnbihnbG9iYWwsIHtcXFxuXHRcdFx0XHRcdFx0XHRfX2RyY3BFbnRyeVBhZ2U6IG51bGwsIFxcXG5cdFx0XHRcdFx0XHRcdF9fZHJjcEVudHJ5UGFja2FnZTogbnVsbFxcXG5cdFx0XHRcdFx0XHR9KTtcXG4nO1xuXHRcdFx0XHRcdFx0Y29udGVudCArPSAnKGdsb2JhbCBhcyBhbnkpJztcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Y29udGVudCArPSAnXFxuT2JqZWN0LmFzc2lnbih3aW5kb3csIHtcXFxuXHRcdFx0XHRcdFx0XHRfX2RyY3BFbnRyeVBhZ2U6IG51bGwsIFxcXG5cdFx0XHRcdFx0XHRcdF9fZHJjcEVudHJ5UGFja2FnZTogbnVsbFxcXG5cdFx0XHRcdFx0XHR9KTtcXG4nO1xuXHRcdFx0XHRcdFx0Y29udGVudCArPSAnXFxuKHdpbmRvdyBhcyBhbnkpJztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Y29udGVudCArPSBgLkxFR09fQ09ORklHID0gJHtKU09OLnN0cmluZ2lmeShsZWdvQ29uZmlnLCBudWxsLCAnICAnKX07XFxuYDtcblx0XHRcdFx0XHRkcmNwSW5jbHVkZUJ1ZiA9IHN0cmluZzJidWZmZXIoY29udGVudCk7XG5cdFx0XHRcdFx0bG9nLmluZm8oY2hhbGsuY3lhbihmaWxlKSArICc6XFxuJyArIGNvbnRlbnQpO1xuXHRcdFx0XHRcdHRoaXMudHNDYWNoZS5zZXQodGhpcy5yZWFsRmlsZShmaWxlLCBwcmVzZXJ2ZVN5bWxpbmtzKSwgZHJjcEluY2x1ZGVCdWYpO1xuXHRcdFx0XHRcdHJldHVybiBvZihkcmNwSW5jbHVkZUJ1Zik7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y29uc3QgY29tcFBrZyA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShmaWxlKTtcblx0XHRcdFx0bGV0IGNvbnRlbnQgPSBCdWZmZXIuZnJvbShidWYpLnRvU3RyaW5nKCk7XG5cdFx0XHRcdGxldCBuZWVkTG9nRmlsZSA9IGZhbHNlO1xuXHRcdFx0XHQvLyBwYXRjaCBhcHAubW9kdWxlLnRzXG5cdFx0XHRcdGlmIChhcHBNb2R1bGVGaWxlID09PSBmaWxlKSB7XG5cdFx0XHRcdFx0bG9nLmluZm8oJ3BhdGNoJywgZmlsZSk7XG5cdFx0XHRcdFx0Y29uc3QgYXBwTW9kdWxlUGFja2FnZSA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShhcHBNb2R1bGVGaWxlKTtcblx0XHRcdFx0XHRjb25zdCByZW1vdmFibGVzID0gcmVtb3ZhYmxlTmdNb2R1bGVzKGFwcE1vZHVsZVBhY2thZ2UsIGRpcm5hbWUoYXBwTW9kdWxlRmlsZSkpO1xuXHRcdFx0XHRcdGNvbnN0IG5nTW9kdWxlczogc3RyaW5nW10gPSBnZXRSb3V0ZXJNb2R1bGVzKGFwcE1vZHVsZVBhY2thZ2UsIGRpcm5hbWUoYXBwTW9kdWxlRmlsZSkpIHx8IHJlbW92YWJsZXM7XG5cdFx0XHRcdFx0Ly8gbmdNb2R1bGVzLnB1c2goYXBpLnBhY2thZ2VOYW1lICsgJy9zcmMvYXBwI0RldmVsb3Blck1vZHVsZScpO1xuXHRcdFx0XHRcdGxvZy5pbmZvKCdJbnNlcnQgb3B0aW9uYWwgTmdNb2R1bGVzIHRvIEFwcE1vZHVsZTpcXG4gICcgKyBuZ01vZHVsZXMuam9pbignXFxuICAnKSk7XG5cdFx0XHRcdFx0Y29udGVudCA9IG5ldyBBcHBNb2R1bGVQYXJzZXIoKVxuXHRcdFx0XHRcdFx0LnBhdGNoRmlsZShmaWxlLCBjb250ZW50LCByZW1vdmFibGVzLCBuZ01vZHVsZXMpO1xuXHRcdFx0XHRcdG5lZWRMb2dGaWxlID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRjb25zdCB0c1NlbGVjdG9yID0gbmV3IFNlbGVjdG9yKGNvbnRlbnQsIGZpbGUpO1xuXHRcdFx0XHRjb25zdCBoYXNJbXBvcnRBcGkgPSB0c1NlbGVjdG9yLmZpbmRBbGwoJzpJbXBvcnREZWNsYXJhdGlvbj4ubW9kdWxlU3BlY2lmaWVyOlN0cmluZ0xpdGVyYWwnKS5zb21lKGFzdCA9PiB7XG5cdFx0XHRcdFx0cmV0dXJuIChhc3QgYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dCA9PT0gJ19fYXBpJztcblx0XHRcdFx0fSk7XG5cdFx0XHRcdGxldCBjaGFuZ2VkID0gYXBpLmJyb3dzZXJJbmplY3Rvci5pbmplY3RUb0ZpbGUoZmlsZSwgY29udGVudCk7XG5cblx0XHRcdFx0Y2hhbmdlZCA9IG5ldyBBcGlBb3RDb21waWxlcihmaWxlLCBjaGFuZ2VkKS5wYXJzZShzb3VyY2UgPT4gdHJhbnNwaWxlU2luZ2xlVHMoc291cmNlLCB0c0NvbXBpbGVyT3B0aW9ucykpO1xuXHRcdFx0XHRpZiAoaGFzSW1wb3J0QXBpKVxuXHRcdFx0XHRcdGNoYW5nZWQgPSBhcGlUbXBsVHMoe3BhY2thZ2VOYW1lOiBjb21wUGtnLmxvbmdOYW1lfSkgKyAnXFxuJyArIGNoYW5nZWQ7XG5cdFx0XHRcdGlmIChjaGFuZ2VkICE9PSBjb250ZW50ICYmIG5nUGFyYW0uc3NyKSB7XG5cdFx0XHRcdFx0Y2hhbmdlZCA9ICdpbXBvcnQgXCJAZHItY29yZS9uZy1hcHAtYnVpbGRlci9zcmMvZHJjcC1pbmNsdWRlXCI7XFxuJyArIGNoYW5nZWQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKG5lZWRMb2dGaWxlKVxuXHRcdFx0XHRcdGxvZy5pbmZvKGNoYWxrLmN5YW4oZmlsZSkgKyAnOlxcbicgKyBjaGFuZ2VkKTtcblx0XHRcdFx0Y29uc3QgYmYgPSBzdHJpbmcyYnVmZmVyKGNoYW5nZWQpO1xuXHRcdFx0XHR0aGlzLnRzQ2FjaGUuc2V0KHRoaXMucmVhbEZpbGUoZmlsZSwgcHJlc2VydmVTeW1saW5rcyksIGJmKTtcblx0XHRcdFx0cmV0dXJuIG9mKGJmKTtcblx0XHRcdH0gY2F0Y2ggKGV4KSB7XG5cdFx0XHRcdGxvZy5lcnJvcihleCk7XG5cdFx0XHRcdHJldHVybiB0aHJvd0Vycm9yKGV4KTtcblx0XHRcdH1cblx0XHR9O1xuXHR9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdHJpbmcyYnVmZmVyKGlucHV0OiBzdHJpbmcpOiBBcnJheUJ1ZmZlciB7XG5cdGNvbnN0IG5vZGVCdWYgPSBCdWZmZXIuZnJvbShpbnB1dCk7XG5cdGNvbnN0IGxlbiA9IG5vZGVCdWYuYnl0ZUxlbmd0aDtcblx0Y29uc3QgbmV3QnVmID0gbmV3IEFycmF5QnVmZmVyKGxlbik7XG5cdGNvbnN0IGRhdGFWaWV3ID0gbmV3IERhdGFWaWV3KG5ld0J1Zik7XG5cdGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcblx0XHRkYXRhVmlldy5zZXRVaW50OChpLCBub2RlQnVmLnJlYWRVSW50OChpKSk7XG5cdH1cblx0cmV0dXJuIG5ld0J1Zjtcbn1cblxuZnVuY3Rpb24gYnJvd3NlckxlZ29Db25maWcoKSB7XG5cdHZhciBicm93c2VyUHJvcFNldDogYW55ID0ge307XG5cdHZhciBsZWdvQ29uZmlnOiBhbnkgPSB7fTsgLy8gbGVnb0NvbmZpZyBpcyBnbG9iYWwgY29uZmlndXJhdGlvbiBwcm9wZXJ0aWVzIHdoaWNoIGFwcGx5IHRvIGFsbCBlbnRyaWVzIGFuZCBtb2R1bGVzXG5cdF8uZWFjaChbXG5cdFx0J3N0YXRpY0Fzc2V0c1VSTCcsICdzZXJ2ZXJVUkwnLCAncGFja2FnZUNvbnRleHRQYXRoTWFwcGluZycsXG5cdFx0J2xvY2FsZXMnLCAnZGV2TW9kZScsICdvdXRwdXRQYXRoTWFwJ1xuXHRdLCBwcm9wID0+IGJyb3dzZXJQcm9wU2V0W3Byb3BdID0gMSk7XG5cdF8uZWFjaChhcGkuY29uZmlnKCkuYnJvd3NlclNpZGVDb25maWdQcm9wLCBwcm9wID0+IGJyb3dzZXJQcm9wU2V0W3Byb3BdID0gdHJ1ZSk7XG5cdF8uZm9yT3duKGJyb3dzZXJQcm9wU2V0LCAobm90aGluZywgcHJvcFBhdGgpID0+IF8uc2V0KGxlZ29Db25maWcsIHByb3BQYXRoLCBfLmdldChhcGkuY29uZmlnKCksIHByb3BQYXRoKSkpO1xuXHR2YXIgY29tcHJlc3NlZEluZm8gPSBjb21wcmVzc091dHB1dFBhdGhNYXAobGVnb0NvbmZpZy5vdXRwdXRQYXRoTWFwKTtcblx0bGVnb0NvbmZpZy5vdXRwdXRQYXRoTWFwID0gY29tcHJlc3NlZEluZm8uZGlmZk1hcDtcblx0bGVnb0NvbmZpZy5fb3V0cHV0QXNOYW1lcyA9IGNvbXByZXNzZWRJbmZvLnNhbWVzO1xuXHRsZWdvQ29uZmlnLmJ1aWxkTG9jYWxlID0gYXBpLmdldEJ1aWxkTG9jYWxlKCk7XG5cdGxvZy5kZWJ1ZygnRGVmaW5lUGx1Z2luIExFR09fQ09ORklHOiAnLCBsZWdvQ29uZmlnKTtcblx0cmV0dXJuIGxlZ29Db25maWc7XG59XG5cbmZ1bmN0aW9uIGNvbXByZXNzT3V0cHV0UGF0aE1hcChwYXRoTWFwOiBhbnkpIHtcblx0dmFyIG5ld01hcDogYW55ID0ge307XG5cdHZhciBzYW1lQXNOYW1lczogc3RyaW5nW10gPSBbXTtcblx0Xy5lYWNoKHBhdGhNYXAsICh2YWx1ZSwga2V5KSA9PiB7XG5cdFx0dmFyIHBhcnNlZCA9IGFwaS5wYWNrYWdlVXRpbHMucGFyc2VOYW1lKGtleSk7XG5cdFx0aWYgKHBhcnNlZC5uYW1lICE9PSB2YWx1ZSkge1xuXHRcdFx0bmV3TWFwW2tleV0gPSB2YWx1ZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c2FtZUFzTmFtZXMucHVzaChrZXkpO1xuXHRcdH1cblx0fSk7XG5cdHJldHVybiB7XG5cdFx0c2FtZXM6IHNhbWVBc05hbWVzLFxuXHRcdGRpZmZNYXA6IG5ld01hcFxuXHR9O1xufVxuXG5mdW5jdGlvbiBnZXRSb3V0ZXJNb2R1bGVzKGFwcE1vZHVsZVBhY2thZ2U6IFBhY2thZ2VCcm93c2VySW5zdGFuY2UsIGFwcE1vZHVsZURpcjogc3RyaW5nKSB7XG5cdGNvbnN0IG5nTW9kdWxlczogc3RyaW5nW10gPSBhcGkuY29uZmlnLmdldChbYXBpLnBhY2thZ2VOYW1lLCAnbmdNb2R1bGUnXSkgfHwgW107XG5cdGNvbnN0IG5nUGFja2FnZU1vZHVsZXMgPSBuZXcgU2V0KHBhY2thZ2VOYW1lczJOZ01vZHVsZShhcHBNb2R1bGVQYWNrYWdlLCBhcHBNb2R1bGVEaXIsXG5cdFx0YXBpLmNvbmZpZy5nZXQoW2FwaS5wYWNrYWdlTmFtZSwgJ25nUGFja2FnZSddKSB8fCBbXSkpO1xuXHRuZ01vZHVsZXMuZm9yRWFjaChtID0+IG5nUGFja2FnZU1vZHVsZXMuYWRkKG0pKTtcblx0cmV0dXJuIEFycmF5LmZyb20obmdQYWNrYWdlTW9kdWxlcyk7XG59XG5cbmZ1bmN0aW9uIHBhY2thZ2VOYW1lczJOZ01vZHVsZShhcHBNb2R1bGVQazogUGFja2FnZUJyb3dzZXJJbnN0YW5jZSwgYXBwTW9kdWxlRGlyOiBzdHJpbmcsIGluY2x1ZGVQYWNrYWdlcz86IHN0cmluZ1tdKTogc3RyaW5nW10ge1xuXHRjb25zdCByZXM6IHN0cmluZ1tdID0gW107XG5cdGlmIChpbmNsdWRlUGFja2FnZXMpIHtcblx0XHRmb3IgKGNvbnN0IG5hbWUgb2YgaW5jbHVkZVBhY2thZ2VzKSB7XG5cdFx0XHRsZXQgcGsgPSBhcGkucGFja2FnZUluZm8ubW9kdWxlTWFwW25hbWVdO1xuXHRcdFx0aWYgKHBrID09IG51bGwpIHtcblx0XHRcdFx0Y29uc3Qgc2NvcGUgPSAoYXBpLmNvbmZpZy5nZXQoJ3BhY2thZ2VTY29wZXMnKSBhcyBzdHJpbmdbXSkuZmluZChzY29wZSA9PiB7XG5cdFx0XHRcdFx0cmV0dXJuIGFwaS5wYWNrYWdlSW5mby5tb2R1bGVNYXBbYEAke3Njb3BlfS8ke25hbWV9YF0gIT0gbnVsbDtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdGlmIChzY29wZSA9PSBudWxsKSB7XG5cdFx0XHRcdFx0bG9nLmVycm9yKCdQYWNrYWdlIG5hbWVkOiBcIiVzXCIgaXMgbm90IGZvdW5kIHdpdGggcG9zc2libGUgc2NvcGUgbmFtZSBpbiBcIiVzXCInLCBuYW1lLFxuXHRcdFx0XHRcdFx0KGFwaS5jb25maWcuZ2V0KCdwYWNrYWdlU2NvcGVzJykgYXMgc3RyaW5nW10pLmpvaW4oJywgJykpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHBrID0gYXBpLnBhY2thZ2VJbmZvLm1vZHVsZU1hcFtgQCR7c2NvcGV9LyR7bmFtZX1gXTtcblx0XHRcdH1cblx0XHRcdGVhY2hQYWNrYWdlKHBrKTtcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0Zm9yIChjb25zdCBwayBvZiBhcGkucGFja2FnZUluZm8uYWxsTW9kdWxlcykge1xuXHRcdFx0ZWFjaFBhY2thZ2UocGspO1xuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIGVhY2hQYWNrYWdlKHBrOiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlKSB7XG5cdFx0aWYgKHBrLmRyID09IG51bGwgfHwgcGsuZHIubmdNb2R1bGUgPT0gbnVsbClcblx0XHRcdHJldHVybjtcblxuXHRcdGxldCBtb2R1bGVzID0gcGsuZHIubmdNb2R1bGU7XG5cdFx0aWYgKCFBcnJheS5pc0FycmF5KG1vZHVsZXMpKVxuXHRcdFx0bW9kdWxlcyA9IFttb2R1bGVzXTtcblxuXHRcdGZvciAobGV0IG5hbWUgb2YgbW9kdWxlcykge1xuXHRcdFx0bmFtZSA9IF8udHJpbVN0YXJ0KG5hbWUsICcuLycpO1xuXHRcdFx0aWYgKHBrICE9PSBhcHBNb2R1bGVQaykge1xuXHRcdFx0XHRpZiAobmFtZS5pbmRleE9mKCcjJykgPCAwKVxuXHRcdFx0XHRcdHJlcy5wdXNoKHBrLmxvbmdOYW1lICsgJyMnICsgbmFtZSk7XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRyZXMucHVzaChway5sb25nTmFtZSArICcvJyArIG5hbWUpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Ly8gcGFja2FnZSBpcyBzYW1lIGFzIHRoZSBvbmUgYXBwLm1vZHVsZSBiZWxvbmdzIHRvLCB3ZSB1c2UgcmVsYXRpdmUgcGF0aCBpbnN0ZWFkIG9mIHBhY2thZ2UgbmFtZVxuXHRcdFx0XHRpZiAobmFtZS5pbmRleE9mKCcjJykgPCAwKVxuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihgSW4gJHtway5yZWFsUGFja2FnZVBhdGh9L3BhY2thZ2UuanNvbiwgdmFsdWUgb2YgXCJkci5uZ01vZHVsZVwiIGFycmF5YCArXG5cdFx0XHRcdFx0XHRgbXVzdCBiZSBpbiBmb3JtIG9mICc8cGF0aD4jPGV4cG9ydCBOZ01vZHVsZSBuYW1lPicsIGJ1dCBoZXJlIGl0IGlzICcke25hbWV9J2ApO1xuXHRcdFx0XHRjb25zdCBuYW1lUGFydHMgPSBuYW1lLnNwbGl0KCcjJyk7XG5cdFx0XHRcdG5hbWUgPSByZWxhdGl2ZShhcHBNb2R1bGVEaXIsIG5hbWVQYXJ0c1swXSkgKyAnIycgKyBuYW1lUGFydHNbMV07XG5cdFx0XHRcdG5hbWUgPSBuYW1lLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcblx0XHRcdFx0aWYgKCFuYW1lLnN0YXJ0c1dpdGgoJy4nKSlcblx0XHRcdFx0XHRuYW1lID0gJy4vJyArIG5hbWU7XG5cdFx0XHRcdHJlcy5wdXNoKG5hbWUpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXHRyZXR1cm4gcmVzO1xufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIGFwcE1vZHVsZVBrTmFtZSBwYWNrYWdlIG5hbWUgb2YgdGhlIG9uZSBjb250YWlucyBhcHAubW9kdWxlLnRzXG4gKiBAcGFyYW0gYXBwTW9kdWxlRGlyIGFwcC5tb2R1bGUudHMncyBkaXJlY3RvcnksIHVzZWQgdG8gY2FsY3VsYXRlIHJlbGF0aXZlIHBhdGhcbiAqL1xuZnVuY3Rpb24gcmVtb3ZhYmxlTmdNb2R1bGVzKGFwcE1vZHVsZVBrOiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlLCBhcHBNb2R1bGVEaXI6IHN0cmluZyk6IHN0cmluZ1tdIHtcblx0cmV0dXJuIHBhY2thZ2VOYW1lczJOZ01vZHVsZShhcHBNb2R1bGVQaywgYXBwTW9kdWxlRGlyKTtcbn1cbiJdfQ==
