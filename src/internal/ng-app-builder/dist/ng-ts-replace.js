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

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9AZHItY29yZS9uZy1hcHAtYnVpbGRlci90cy9uZy10cy1yZXBsYWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLG9DQUFvQztBQUNwQywwREFBd0I7QUFDeEIsa0RBQTRCO0FBQzVCLHVEQUFpQztBQUNqQywrQkFBZ0Q7QUFHaEQsa0ZBQW1EO0FBQ25ELHFGQUFvRjtBQUNwRiwrQkFBNEQ7QUFDNUQsc0VBQXFGO0FBRXJGLGdGQUE0QztBQUM1QyxtREFBNEM7QUFFNUMsK0NBQXlCO0FBQ3pCLE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUUvQixNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsU0FBUyxDQUFDLGVBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUU5QyxNQUFNLFNBQVMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDOzt1QkFFTixDQUFDLENBQUM7QUFDekIsOEVBQThFO0FBSTlFLE1BQXFCLFlBQVk7SUFLaEMsWUFBWSxPQUF3QjtRQUg1QixrQkFBYSxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFDO1FBQzFDLFlBQU8sR0FBRyxJQUFJLEdBQUcsRUFBdUIsQ0FBQztRQUdoRCxJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNoRCxDQUFDO0lBRUQsS0FBSztRQUNKLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDdEIsQ0FBQztJQUVPLFFBQVEsQ0FBQyxJQUFZLEVBQUUsZ0JBQXlCO1FBQ3ZELGdDQUFnQztRQUNoQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM5QyxJQUFJLFFBQVEsS0FBSyxTQUFTO1lBQ3pCLE9BQU8sUUFBUSxDQUFDO1FBQ2pCLElBQUksRUFBRSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxjQUFjLEVBQUUsRUFBRTtZQUN4QyxJQUFJLENBQUMsZ0JBQWdCO2dCQUNwQixHQUFHLENBQUMsSUFBSSxDQUFDLHNCQUFzQixJQUFJLG9DQUFvQyxDQUFDLENBQUM7WUFDMUUsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNqQyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDakMsT0FBTyxFQUFFLENBQUM7U0FDVjs7WUFDQSxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFTyxnQkFBZ0IsQ0FBQyxPQUF3QjtRQUNoRCxJQUFJLGNBQTJCLENBQUM7UUFFaEMsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUM7UUFFckQsTUFBTSxVQUFVLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsMkJBQTJCLENBQUMsSUFBSSxlQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztRQUMvRSxNQUFNLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUM7UUFDakUsTUFBTSxpQkFBaUIsR0FBRywwQkFBWSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3JELElBQUksYUFBYSxHQUFXLEVBQUUsQ0FBQztRQUMvQixJQUFJLE9BQU8sQ0FBQyxjQUFjLENBQUMsU0FBUztZQUNuQyxhQUFhLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztRQUV0RSxNQUFNLGFBQWEsR0FBRyw0Q0FBeUIsQ0FBQyxjQUFPLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3RGLEdBQUcsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsYUFBYSxDQUFDLENBQUM7UUFFN0MsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUM7UUFFekMsT0FBTyxDQUFDLElBQVksRUFBRSxHQUFnQixFQUEyQixFQUFFO1lBQ2xFLElBQUk7Z0JBQ0gsSUFBSSxLQUFLLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFO29CQUM5QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7b0JBQ3ZFLElBQUksTUFBTSxJQUFJLElBQUk7d0JBQ2pCLE9BQU8sU0FBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO29CQUNuQixPQUFPLFNBQUUsQ0FBQyxhQUFhLENBQUMsMkJBQVcsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFFekU7cUJBQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRTtvQkFDM0QsT0FBTyxTQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7aUJBQ2Y7Z0JBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDO2dCQUN2RSxJQUFJLE1BQU0sSUFBSSxJQUFJO29CQUNqQixPQUFPLFNBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDbkIsSUFBSSxVQUFVLEdBQUcsZUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztnQkFDL0MsSUFBSSxVQUFHLEtBQUssSUFBSTtvQkFDZixVQUFVLEdBQUcsVUFBVSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7Z0JBQzdDLElBQUksVUFBVSxJQUFJLGFBQWEsSUFBSSxVQUFVLEtBQUssYUFBYSxFQUFFO29CQUNoRSxNQUFNLFNBQVMsR0FBRyw2Q0FBNkMsQ0FBQztvQkFDaEUsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsR0FBRyxTQUFTLENBQUM7b0JBQ3hELEdBQUcsQ0FBQyxJQUFJLENBQUMsYUFBYSxVQUFVLCtDQUErQyxDQUFDLENBQUM7b0JBQ2pGLE1BQU0sRUFBRSxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDbEMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDNUQsT0FBTyxTQUFFLENBQUMsRUFBRSxDQUFDLENBQUM7aUJBQ2Q7cUJBQU0sSUFBSSxVQUFVLENBQUMsUUFBUSxDQUFDLGtCQUFrQixDQUFDLEVBQUU7b0JBQ25ELElBQUksY0FBYzt3QkFDakIsT0FBTyxTQUFFLENBQUMsY0FBYyxDQUFDLENBQUM7b0JBQzNCLElBQUksT0FBTyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7b0JBQzFDLE1BQU0sVUFBVSxHQUFHLGlCQUFpQixFQUFFLENBQUM7b0JBQ3ZDLElBQUksT0FBZSxDQUFDO29CQUNwQixJQUFJLFVBQVUsRUFBRTt3QkFDZixPQUFPLEdBQUcsdUNBQXVDLEdBQUcsT0FBTyxDQUFDO3dCQUM1RCxPQUFPLEdBQUcsaUNBQWlDLENBQUM7cUJBQzVDO29CQUNELElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLEdBQUcsRUFBRTt3QkFDaEMsT0FBTyxHQUFHLG1DQUFtQyxHQUFHLE9BQU8sQ0FBQztxQkFDeEQ7b0JBQ0QsSUFBSSxPQUFPO3dCQUNWLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLGlDQUFpQyxFQUFFLE9BQU8sQ0FBQyxDQUFDO29CQUN2RSxJQUFJLE9BQU8sQ0FBQyxHQUFHLEVBQUU7d0JBQ2hCLE9BQU8sSUFBSSwwQ0FBMEMsQ0FBQzt3QkFDdEQsT0FBTyxJQUFJOzs7WUFHTCxDQUFDO3dCQUNQLE9BQU8sSUFBSSxpQkFBaUIsQ0FBQztxQkFDN0I7eUJBQU07d0JBQ04sT0FBTyxJQUFJOzs7WUFHTCxDQUFDO3dCQUNQLE9BQU8sSUFBSSxtQkFBbUIsQ0FBQztxQkFDL0I7b0JBQ0QsT0FBTyxJQUFJLGtCQUFrQixJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQztvQkFDekUsY0FBYyxHQUFHLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDeEMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssR0FBRyxPQUFPLENBQUMsQ0FBQztvQkFDN0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsZ0JBQWdCLENBQUMsRUFBRSxjQUFjLENBQUMsQ0FBQztvQkFDeEUsT0FBTyxTQUFFLENBQUMsY0FBYyxDQUFDLENBQUM7aUJBQzFCO2dCQUNELE1BQU0sT0FBTyxHQUFHLGVBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDNUMsSUFBSSxPQUFPLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDMUMsSUFBSSxXQUFXLEdBQUcsS0FBSyxDQUFDO2dCQUN4QixzQkFBc0I7Z0JBQ3RCLElBQUksYUFBYSxLQUFLLElBQUksRUFBRTtvQkFDM0IsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBQ3hCLE1BQU0sZ0JBQWdCLEdBQUcsZUFBRyxDQUFDLGlCQUFpQixDQUFDLGFBQWEsQ0FBQyxDQUFDO29CQUM5RCxNQUFNLFVBQVUsR0FBRyxrQkFBa0IsQ0FBQyxnQkFBZ0IsRUFBRSxjQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQztvQkFDaEYsTUFBTSxTQUFTLEdBQWEsZ0JBQWdCLENBQUMsZ0JBQWdCLEVBQUUsY0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLElBQUksVUFBVSxDQUFDO29CQUNyRyxnRUFBZ0U7b0JBQ2hFLEdBQUcsQ0FBQyxJQUFJLENBQUMsNkNBQTZDLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO29CQUNqRixPQUFPLEdBQUcsSUFBSSwwQkFBZSxFQUFFO3lCQUM3QixTQUFTLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsU0FBUyxDQUFDLENBQUM7b0JBQ2xELFdBQVcsR0FBRyxJQUFJLENBQUM7aUJBQ25CO2dCQUNELE1BQU0sVUFBVSxHQUFHLElBQUksc0JBQVEsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7Z0JBQy9DLE1BQU0sWUFBWSxHQUFHLFVBQVUsQ0FBQyxPQUFPLENBQUMsbURBQW1ELENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7b0JBQ3ZHLE9BQVEsR0FBd0IsQ0FBQyxJQUFJLEtBQUssT0FBTyxDQUFDO2dCQUNuRCxDQUFDLENBQUMsQ0FBQztnQkFDSCxJQUFJLE9BQU8sR0FBRyxlQUFHLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUM7Z0JBRTlELE9BQU8sR0FBRyxJQUFJLHVCQUFjLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLCtCQUFpQixDQUFDLE1BQU0sRUFBRSxpQkFBaUIsQ0FBQyxDQUFDLENBQUM7Z0JBQzFHLElBQUksWUFBWTtvQkFDZixPQUFPLEdBQUcsU0FBUyxDQUFDLEVBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUMsQ0FBQyxHQUFHLElBQUksR0FBRyxPQUFPLENBQUM7Z0JBQ3ZFLElBQUksT0FBTyxLQUFLLE9BQU8sSUFBSSxPQUFPLENBQUMsR0FBRyxFQUFFO29CQUN2QyxPQUFPLEdBQUcsc0RBQXNELEdBQUcsT0FBTyxDQUFDO2lCQUMzRTtnQkFDRCxJQUFJLFdBQVc7b0JBQ2QsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssR0FBRyxPQUFPLENBQUMsQ0FBQztnQkFDOUMsTUFBTSxFQUFFLEdBQUcsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUNsQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM1RCxPQUFPLFNBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQzthQUNkO1lBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQ1osR0FBRyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQztnQkFDZCxPQUFPLGlCQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7YUFDdEI7UUFDRixDQUFDLENBQUM7SUFDSCxDQUFDO0NBQ0Q7QUEvSUQsK0JBK0lDO0FBRUQsU0FBZ0IsYUFBYSxDQUFDLEtBQWE7SUFDMUMsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUNuQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDO0lBQy9CLE1BQU0sTUFBTSxHQUFHLElBQUksV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQ3BDLE1BQU0sUUFBUSxHQUFHLElBQUksUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ3RDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUU7UUFDN0IsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQzNDO0lBQ0QsT0FBTyxNQUFNLENBQUM7QUFDZixDQUFDO0FBVEQsc0NBU0M7QUFFRCxTQUFTLGlCQUFpQjtJQUN6QixJQUFJLGNBQWMsR0FBUSxFQUFFLENBQUM7SUFDN0IsSUFBSSxVQUFVLEdBQVEsRUFBRSxDQUFDLENBQUMsdUZBQXVGO0lBQ2pILENBQUMsQ0FBQyxJQUFJLENBQUM7UUFDTixpQkFBaUIsRUFBRSxXQUFXLEVBQUUsMkJBQTJCO1FBQzNELFNBQVMsRUFBRSxTQUFTLEVBQUUsZUFBZTtLQUNyQyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3JDLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBRyxDQUFDLE1BQU0sRUFBRSxDQUFDLHFCQUFxQixFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQ2hGLENBQUMsQ0FBQyxNQUFNLENBQUMsY0FBYyxFQUFFLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsZUFBRyxDQUFDLE1BQU0sRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUM1RyxJQUFJLGNBQWMsR0FBRyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUM7SUFDckUsVUFBVSxDQUFDLGFBQWEsR0FBRyxjQUFjLENBQUMsT0FBTyxDQUFDO0lBQ2xELFVBQVUsQ0FBQyxjQUFjLEdBQUcsY0FBYyxDQUFDLEtBQUssQ0FBQztJQUNqRCxVQUFVLENBQUMsV0FBVyxHQUFHLGVBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUM5QyxHQUFHLENBQUMsS0FBSyxDQUFDLDRCQUE0QixFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ3BELE9BQU8sVUFBVSxDQUFDO0FBQ25CLENBQUM7QUFFRCxTQUFTLHFCQUFxQixDQUFDLE9BQVk7SUFDMUMsSUFBSSxNQUFNLEdBQVEsRUFBRSxDQUFDO0lBQ3JCLElBQUksV0FBVyxHQUFhLEVBQUUsQ0FBQztJQUMvQixDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsRUFBRTtRQUM5QixJQUFJLE1BQU0sR0FBRyxlQUFHLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM3QyxJQUFJLE1BQU0sQ0FBQyxJQUFJLEtBQUssS0FBSyxFQUFFO1lBQzFCLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUM7U0FDcEI7YUFBTTtZQUNOLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7U0FDdEI7SUFDRixDQUFDLENBQUMsQ0FBQztJQUNILE9BQU87UUFDTixLQUFLLEVBQUUsV0FBVztRQUNsQixPQUFPLEVBQUUsTUFBTTtLQUNmLENBQUM7QUFDSCxDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxnQkFBd0MsRUFBRSxZQUFvQjtJQUN2RixNQUFNLFNBQVMsR0FBYSxlQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLGVBQUcsQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDaEYsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxnQkFBZ0IsRUFBRSxZQUFZLEVBQ3BGLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsZUFBRyxDQUFDLFdBQVcsRUFBRSxXQUFXLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDeEQsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ2hELE9BQU8sS0FBSyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3JDLENBQUM7QUFFRCxTQUFTLHFCQUFxQixDQUFDLFdBQW1DLEVBQUUsWUFBb0IsRUFBRSxlQUEwQjtJQUNuSCxNQUFNLEdBQUcsR0FBYSxFQUFFLENBQUM7SUFDekIsSUFBSSxlQUFlLEVBQUU7UUFDcEIsS0FBSyxNQUFNLElBQUksSUFBSSxlQUFlLEVBQUU7WUFDbkMsSUFBSSxFQUFFLEdBQUcsZUFBRyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDekMsSUFBSSxFQUFFLElBQUksSUFBSSxFQUFFO2dCQUNmLE1BQU0sS0FBSyxHQUFJLGVBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBYyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRTtvQkFDeEUsT0FBTyxlQUFHLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEtBQUssSUFBSSxJQUFJLEVBQUUsQ0FBQyxJQUFJLElBQUksQ0FBQztnQkFDL0QsQ0FBQyxDQUFDLENBQUM7Z0JBQ0gsSUFBSSxLQUFLLElBQUksSUFBSSxFQUFFO29CQUNsQixHQUFHLENBQUMsS0FBSyxDQUFDLG1FQUFtRSxFQUFFLElBQUksRUFDakYsZUFBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFjLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7b0JBQzNELE1BQU07aUJBQ047Z0JBQ0QsRUFBRSxHQUFHLGVBQUcsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLElBQUksS0FBSyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUM7YUFDcEQ7WUFDRCxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDaEI7S0FDRDtTQUFNO1FBQ04sS0FBSyxNQUFNLEVBQUUsSUFBSSxlQUFHLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRTtZQUM1QyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUM7U0FDaEI7S0FDRDtJQUVELFNBQVMsV0FBVyxDQUFDLEVBQTBCO1FBQzlDLElBQUksRUFBRSxDQUFDLEVBQUUsSUFBSSxJQUFJLElBQUksRUFBRSxDQUFDLEVBQUUsQ0FBQyxRQUFRLElBQUksSUFBSTtZQUMxQyxPQUFPO1FBRVIsSUFBSSxPQUFPLEdBQUcsRUFBRSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUM7UUFDN0IsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO1lBQzFCLE9BQU8sR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBRXJCLEtBQUssSUFBSSxJQUFJLElBQUksT0FBTyxFQUFFO1lBQ3pCLElBQUksR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztZQUMvQixJQUFJLEVBQUUsS0FBSyxXQUFXLEVBQUU7Z0JBQ3ZCLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO29CQUN4QixHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDOztvQkFFbkMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsQ0FBQzthQUNwQztpQkFBTTtnQkFDTixpR0FBaUc7Z0JBQ2pHLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO29CQUN4QixNQUFNLElBQUksS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLGVBQWUsNkNBQTZDO3dCQUNwRix1RUFBdUUsSUFBSSxHQUFHLENBQUMsQ0FBQztnQkFDbEYsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFDbEMsSUFBSSxHQUFHLGVBQVEsQ0FBQyxZQUFZLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDakUsSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO2dCQUNoQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7b0JBQ3hCLElBQUksR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDO2dCQUNwQixHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ2Y7U0FDRDtJQUNGLENBQUM7SUFDRCxPQUFPLEdBQUcsQ0FBQztBQUNaLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsU0FBUyxrQkFBa0IsQ0FBQyxXQUFtQyxFQUFFLFlBQW9CO0lBQ3BGLE9BQU8scUJBQXFCLENBQUMsV0FBVyxFQUFFLFlBQVksQ0FBQyxDQUFDO0FBQ3pELENBQUMiLCJmaWxlIjoibm9kZV9tb2R1bGVzL0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL2Rpc3QvbmctdHMtcmVwbGFjZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG1heC1saW5lLWxlbmd0aCAqL1xuaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7b2YsIHRocm93RXJyb3IsIE9ic2VydmFibGV9IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtIb29rUmVhZEZ1bmN9IGZyb20gJy4vdXRpbHMvcmVhZC1ob29rLXZmc2hvc3QnO1xuaW1wb3J0IHtBbmd1bGFyQ2xpUGFyYW19IGZyb20gJy4vbmcvY29tbW9uJztcbmltcG9ydCBBcGlBb3RDb21waWxlciBmcm9tICcuL3V0aWxzL3RzLWJlZm9yZS1hb3QnO1xuaW1wb3J0IEFwcE1vZHVsZVBhcnNlciwge2ZpbmRBcHBNb2R1bGVGaWxlRnJvbU1haW59IGZyb20gJy4vdXRpbHMvcGFyc2UtYXBwLW1vZHVsZSc7XG5pbXBvcnQge3NlcCBhcyBTRVAsIHJlbGF0aXZlLCByZXNvbHZlLCBkaXJuYW1lfSBmcm9tICdwYXRoJztcbmltcG9ydCB7cmVhZFRzQ29uZmlnLCB0cmFuc3BpbGVTaW5nbGVUc30gZnJvbSAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L3RzLWNvbXBpbGVyJztcbmltcG9ydCBQYWNrYWdlQnJvd3Nlckluc3RhbmNlIGZyb20gJ2RyLWNvbXAtcGFja2FnZS93ZmgvZGlzdC9idWlsZC11dGlsL3RzL3BhY2thZ2UtaW5zdGFuY2UnO1xuaW1wb3J0IFNlbGVjdG9yIGZyb20gJy4vdXRpbHMvdHMtYXN0LXF1ZXJ5JztcbmltcG9ydCB7cmVwbGFjZUh0bWx9IGZyb20gJy4vbmctYW90LWFzc2V0cyc7XG5pbXBvcnQgKiBhcyB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmNvbnN0IGNoYWxrID0gcmVxdWlyZSgnY2hhbGsnKTtcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcihhcGkucGFja2FnZU5hbWUpO1xuXG5jb25zdCBhcGlUbXBsVHMgPSBfLnRlbXBsYXRlKCdpbXBvcnQgX19EckFwaSBmcm9tIFxcJ0Bkci1jb3JlL25nLWFwcC1idWlsZGVyL3NyYy9hcHAvYXBpXFwnO1xcXG52YXIgX19hcGkgPSBfX0RyQXBpLmdldENhY2hlZEFwaShcXCc8JT1wYWNrYWdlTmFtZSU+XFwnKSB8fCBuZXcgX19EckFwaShcXCc8JT1wYWNrYWdlTmFtZSU+XFwnKTtcXFxuX19hcGkuZGVmYXVsdCA9IF9fYXBpOycpO1xuLy8gY29uc3QgaW5jbHVkZVRzRmlsZSA9IFBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICdzcmMnLCAnZHJjcC1pbmNsdWRlLnRzJyk7XG5cblxuXG5leHBvcnQgZGVmYXVsdCBjbGFzcyBUU1JlYWRIb29rZXIge1xuXHRob29rRnVuYzogSG9va1JlYWRGdW5jO1xuXHRwcml2YXRlIHJlYWxGaWxlQ2FjaGUgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpO1xuXHRwcml2YXRlIHRzQ2FjaGUgPSBuZXcgTWFwPHN0cmluZywgQXJyYXlCdWZmZXI+KCk7XG5cblx0Y29uc3RydWN0b3IobmdQYXJhbTogQW5ndWxhckNsaVBhcmFtKSB7XG5cdFx0dGhpcy5ob29rRnVuYyA9IHRoaXMuY3JlYXRlVHNSZWFkSG9vayhuZ1BhcmFtKTtcblx0fVxuXG5cdGNsZWFyKCkge1xuXHRcdHRoaXMudHNDYWNoZS5jbGVhcigpO1xuXHR9XG5cblx0cHJpdmF0ZSByZWFsRmlsZShmaWxlOiBzdHJpbmcsIHByZXNlcnZlU3ltbGlua3M6IGJvb2xlYW4pOiBzdHJpbmcge1xuXHRcdC8vIGxvZy5pbmZvKGByZWFkRmlsZSAke2ZpbGV9YCk7XG5cdFx0Y29uc3QgcmVhbEZpbGUgPSB0aGlzLnJlYWxGaWxlQ2FjaGUuZ2V0KGZpbGUpO1xuXHRcdGlmIChyZWFsRmlsZSAhPT0gdW5kZWZpbmVkKVxuXHRcdFx0cmV0dXJuIHJlYWxGaWxlO1xuXHRcdGlmIChmcy5sc3RhdFN5bmMoZmlsZSkuaXNTeW1ib2xpY0xpbmsoKSkge1xuXHRcdFx0aWYgKCFwcmVzZXJ2ZVN5bWxpbmtzKVxuXHRcdFx0XHRsb2cud2FybihgUmVhZGluZyBhIHN5bWxpbms6ICR7ZmlsZX0sIGJ1dCBcInByZXNlcnZlU3ltbGlua3NcIiBpcyBmYWxzZS5gKTtcblx0XHRcdGNvbnN0IHJmID0gZnMucmVhbHBhdGhTeW5jKGZpbGUpO1xuXHRcdFx0dGhpcy5yZWFsRmlsZUNhY2hlLnNldChmaWxlLCByZik7XG5cdFx0XHRyZXR1cm4gcmY7XG5cdFx0fSBlbHNlXG5cdFx0XHRyZXR1cm4gZmlsZTtcblx0fVxuXG5cdHByaXZhdGUgY3JlYXRlVHNSZWFkSG9vayhuZ1BhcmFtOiBBbmd1bGFyQ2xpUGFyYW0pOiBIb29rUmVhZEZ1bmMge1xuXHRcdGxldCBkcmNwSW5jbHVkZUJ1ZjogQXJyYXlCdWZmZXI7XG5cblx0XHRjb25zdCB0c2NvbmZpZ0ZpbGUgPSBuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLnRzQ29uZmlnO1xuXG5cdFx0Y29uc3QgaG1yRW5hYmxlZCA9IF8uZ2V0KG5nUGFyYW0sICdidWlsZGVyQ29uZmlnLm9wdGlvbnMuaG1yJykgfHwgYXBpLmFyZ3YuaG1yO1xuXHRcdGNvbnN0IHByZXNlcnZlU3ltbGlua3MgPSBuZ1BhcmFtLmJyb3dzZXJPcHRpb25zLnByZXNlcnZlU3ltbGlua3M7XG5cdFx0Y29uc3QgdHNDb21waWxlck9wdGlvbnMgPSByZWFkVHNDb25maWcodHNjb25maWdGaWxlKTtcblx0XHRsZXQgcG9seWZpbGxzRmlsZTogc3RyaW5nID0gJyc7XG5cdFx0aWYgKG5nUGFyYW0uYnJvd3Nlck9wdGlvbnMucG9seWZpbGxzKVxuXHRcdFx0cG9seWZpbGxzRmlsZSA9IG5nUGFyYW0uYnJvd3Nlck9wdGlvbnMucG9seWZpbGxzLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcblxuXHRcdGNvbnN0IGFwcE1vZHVsZUZpbGUgPSBmaW5kQXBwTW9kdWxlRmlsZUZyb21NYWluKHJlc29sdmUobmdQYXJhbS5icm93c2VyT3B0aW9ucy5tYWluKSk7XG5cdFx0bG9nLmluZm8oJ2FwcCBtb2R1bGUgZmlsZTogJywgYXBwTW9kdWxlRmlsZSk7XG5cblx0XHRjb25zdCBpc0FvdCA9IG5nUGFyYW0uYnJvd3Nlck9wdGlvbnMuYW90O1xuXG5cdFx0cmV0dXJuIChmaWxlOiBzdHJpbmcsIGJ1ZjogQXJyYXlCdWZmZXIpOiBPYnNlcnZhYmxlPEFycmF5QnVmZmVyPiA9PiB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRpZiAoaXNBb3QgJiYgZmlsZS5lbmRzV2l0aCgnLmNvbXBvbmVudC5odG1sJykpIHtcblx0XHRcdFx0XHRjb25zdCBjYWNoZWQgPSB0aGlzLnRzQ2FjaGUuZ2V0KHRoaXMucmVhbEZpbGUoZmlsZSwgcHJlc2VydmVTeW1saW5rcykpO1xuXHRcdFx0XHRcdGlmIChjYWNoZWQgIT0gbnVsbClcblx0XHRcdFx0XHRcdHJldHVybiBvZihjYWNoZWQpO1xuXHRcdFx0XHRcdHJldHVybiBvZihzdHJpbmcyYnVmZmVyKHJlcGxhY2VIdG1sKGZpbGUsIEJ1ZmZlci5mcm9tKGJ1ZikudG9TdHJpbmcoKSkpKTtcblxuXHRcdFx0XHR9IGVsc2UgaWYgKCFmaWxlLmVuZHNXaXRoKCcudHMnKSB8fCBmaWxlLmVuZHNXaXRoKCcuZC50cycpKSB7XG5cdFx0XHRcdFx0cmV0dXJuIG9mKGJ1Zik7XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjb25zdCBjYWNoZWQgPSB0aGlzLnRzQ2FjaGUuZ2V0KHRoaXMucmVhbEZpbGUoZmlsZSwgcHJlc2VydmVTeW1saW5rcykpO1xuXHRcdFx0XHRpZiAoY2FjaGVkICE9IG51bGwpXG5cdFx0XHRcdFx0cmV0dXJuIG9mKGNhY2hlZCk7XG5cdFx0XHRcdGxldCBub3JtYWxGaWxlID0gcmVsYXRpdmUocHJvY2Vzcy5jd2QoKSwgZmlsZSk7XG5cdFx0XHRcdGlmIChTRVAgPT09ICdcXFxcJylcblx0XHRcdFx0XHRub3JtYWxGaWxlID0gbm9ybWFsRmlsZS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cdFx0XHRcdGlmIChobXJFbmFibGVkICYmIHBvbHlmaWxsc0ZpbGUgJiYgbm9ybWFsRmlsZSA9PT0gcG9seWZpbGxzRmlsZSkge1xuXHRcdFx0XHRcdGNvbnN0IGhtckNsaWVudCA9ICdcXG5pbXBvcnQgXFwnd2VicGFjay1ob3QtbWlkZGxld2FyZS9jbGllbnRcXCc7Jztcblx0XHRcdFx0XHRjb25zdCBjb250ZW50ID0gQnVmZmVyLmZyb20oYnVmKS50b1N0cmluZygpICsgaG1yQ2xpZW50O1xuXHRcdFx0XHRcdGxvZy5pbmZvKGBBcHBlbmQgdG8gJHtub3JtYWxGaWxlfTogXFxuaW1wb3J0IFxcJ3dlYnBhY2staG90LW1pZGRsZXdhcmUvY2xpZW50XFwnO2ApO1xuXHRcdFx0XHRcdGNvbnN0IGJmID0gc3RyaW5nMmJ1ZmZlcihjb250ZW50KTtcblx0XHRcdFx0XHR0aGlzLnRzQ2FjaGUuc2V0KHRoaXMucmVhbEZpbGUoZmlsZSwgcHJlc2VydmVTeW1saW5rcyksIGJmKTtcblx0XHRcdFx0XHRyZXR1cm4gb2YoYmYpO1xuXHRcdFx0XHR9IGVsc2UgaWYgKG5vcm1hbEZpbGUuZW5kc1dpdGgoJy9kcmNwLWluY2x1ZGUudHMnKSkge1xuXHRcdFx0XHRcdGlmIChkcmNwSW5jbHVkZUJ1Zilcblx0XHRcdFx0XHRcdHJldHVybiBvZihkcmNwSW5jbHVkZUJ1Zik7XG5cdFx0XHRcdFx0bGV0IGNvbnRlbnQgPSBCdWZmZXIuZnJvbShidWYpLnRvU3RyaW5nKCk7XG5cdFx0XHRcdFx0Y29uc3QgbGVnb0NvbmZpZyA9IGJyb3dzZXJMZWdvQ29uZmlnKCk7XG5cdFx0XHRcdFx0bGV0IGhtckJvb3Q6IHN0cmluZztcblx0XHRcdFx0XHRpZiAoaG1yRW5hYmxlZCkge1xuXHRcdFx0XHRcdFx0Y29udGVudCA9ICdpbXBvcnQgaG1yQm9vdHN0cmFwIGZyb20gXFwnLi9obXJcXCc7XFxuJyArIGNvbnRlbnQ7XG5cdFx0XHRcdFx0XHRobXJCb290ID0gJ2htckJvb3RzdHJhcChtb2R1bGUsIGJvb3RzdHJhcCknO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoIW5nUGFyYW0uYnJvd3Nlck9wdGlvbnMuYW90KSB7XG5cdFx0XHRcdFx0XHRjb250ZW50ID0gJ2ltcG9ydCBcXCdjb3JlLWpzL2VzNy9yZWZsZWN0XFwnO1xcbicgKyBjb250ZW50O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoaG1yQm9vdClcblx0XHRcdFx0XHRcdGNvbnRlbnQgPSBjb250ZW50LnJlcGxhY2UoL1xcL1xcKiByZXBsYWNlIFxcKlxcL2Jvb3RzdHJhcFxcKFxcKS9nLCBobXJCb290KTtcblx0XHRcdFx0XHRpZiAobmdQYXJhbS5zc3IpIHtcblx0XHRcdFx0XHRcdGNvbnRlbnQgKz0gJ1xcbmNvbnNvbGUubG9nKFwic2V0IGdsb2JhbC5MRUdPX0NPTkZJR1wiKTsnO1xuXHRcdFx0XHRcdFx0Y29udGVudCArPSAnXFxuT2JqZWN0LmFzc2lnbihnbG9iYWwsIHtcXFxuXHRcdFx0XHRcdFx0XHRfX2RyY3BFbnRyeVBhZ2U6IG51bGwsIFxcXG5cdFx0XHRcdFx0XHRcdF9fZHJjcEVudHJ5UGFja2FnZTogbnVsbFxcXG5cdFx0XHRcdFx0XHR9KTtcXG4nO1xuXHRcdFx0XHRcdFx0Y29udGVudCArPSAnKGdsb2JhbCBhcyBhbnkpJztcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0Y29udGVudCArPSAnXFxuT2JqZWN0LmFzc2lnbih3aW5kb3csIHtcXFxuXHRcdFx0XHRcdFx0XHRfX2RyY3BFbnRyeVBhZ2U6IG51bGwsIFxcXG5cdFx0XHRcdFx0XHRcdF9fZHJjcEVudHJ5UGFja2FnZTogbnVsbFxcXG5cdFx0XHRcdFx0XHR9KTtcXG4nO1xuXHRcdFx0XHRcdFx0Y29udGVudCArPSAnXFxuKHdpbmRvdyBhcyBhbnkpJztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0Y29udGVudCArPSBgLkxFR09fQ09ORklHID0gJHtKU09OLnN0cmluZ2lmeShsZWdvQ29uZmlnLCBudWxsLCAnICAnKX07XFxuYDtcblx0XHRcdFx0XHRkcmNwSW5jbHVkZUJ1ZiA9IHN0cmluZzJidWZmZXIoY29udGVudCk7XG5cdFx0XHRcdFx0bG9nLmluZm8oY2hhbGsuY3lhbihmaWxlKSArICc6XFxuJyArIGNvbnRlbnQpO1xuXHRcdFx0XHRcdHRoaXMudHNDYWNoZS5zZXQodGhpcy5yZWFsRmlsZShmaWxlLCBwcmVzZXJ2ZVN5bWxpbmtzKSwgZHJjcEluY2x1ZGVCdWYpO1xuXHRcdFx0XHRcdHJldHVybiBvZihkcmNwSW5jbHVkZUJ1Zik7XG5cdFx0XHRcdH1cblx0XHRcdFx0Y29uc3QgY29tcFBrZyA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShmaWxlKTtcblx0XHRcdFx0bGV0IGNvbnRlbnQgPSBCdWZmZXIuZnJvbShidWYpLnRvU3RyaW5nKCk7XG5cdFx0XHRcdGxldCBuZWVkTG9nRmlsZSA9IGZhbHNlO1xuXHRcdFx0XHQvLyBwYXRjaCBhcHAubW9kdWxlLnRzXG5cdFx0XHRcdGlmIChhcHBNb2R1bGVGaWxlID09PSBmaWxlKSB7XG5cdFx0XHRcdFx0bG9nLmluZm8oJ3BhdGNoJywgZmlsZSk7XG5cdFx0XHRcdFx0Y29uc3QgYXBwTW9kdWxlUGFja2FnZSA9IGFwaS5maW5kUGFja2FnZUJ5RmlsZShhcHBNb2R1bGVGaWxlKTtcblx0XHRcdFx0XHRjb25zdCByZW1vdmFibGVzID0gcmVtb3ZhYmxlTmdNb2R1bGVzKGFwcE1vZHVsZVBhY2thZ2UsIGRpcm5hbWUoYXBwTW9kdWxlRmlsZSkpO1xuXHRcdFx0XHRcdGNvbnN0IG5nTW9kdWxlczogc3RyaW5nW10gPSBnZXRSb3V0ZXJNb2R1bGVzKGFwcE1vZHVsZVBhY2thZ2UsIGRpcm5hbWUoYXBwTW9kdWxlRmlsZSkpIHx8IHJlbW92YWJsZXM7XG5cdFx0XHRcdFx0Ly8gbmdNb2R1bGVzLnB1c2goYXBpLnBhY2thZ2VOYW1lICsgJy9zcmMvYXBwI0RldmVsb3Blck1vZHVsZScpO1xuXHRcdFx0XHRcdGxvZy5pbmZvKCdJbnNlcnQgb3B0aW9uYWwgTmdNb2R1bGVzIHRvIEFwcE1vZHVsZTpcXG4gICcgKyBuZ01vZHVsZXMuam9pbignXFxuICAnKSk7XG5cdFx0XHRcdFx0Y29udGVudCA9IG5ldyBBcHBNb2R1bGVQYXJzZXIoKVxuXHRcdFx0XHRcdFx0LnBhdGNoRmlsZShmaWxlLCBjb250ZW50LCByZW1vdmFibGVzLCBuZ01vZHVsZXMpO1xuXHRcdFx0XHRcdG5lZWRMb2dGaWxlID0gdHJ1ZTtcblx0XHRcdFx0fVxuXHRcdFx0XHRjb25zdCB0c1NlbGVjdG9yID0gbmV3IFNlbGVjdG9yKGNvbnRlbnQsIGZpbGUpO1xuXHRcdFx0XHRjb25zdCBoYXNJbXBvcnRBcGkgPSB0c1NlbGVjdG9yLmZpbmRBbGwoJzpJbXBvcnREZWNsYXJhdGlvbj4ubW9kdWxlU3BlY2lmaWVyOlN0cmluZ0xpdGVyYWwnKS5zb21lKGFzdCA9PiB7XG5cdFx0XHRcdFx0cmV0dXJuIChhc3QgYXMgdHMuU3RyaW5nTGl0ZXJhbCkudGV4dCA9PT0gJ19fYXBpJztcblx0XHRcdFx0fSk7XG5cdFx0XHRcdGxldCBjaGFuZ2VkID0gYXBpLmJyb3dzZXJJbmplY3Rvci5pbmplY3RUb0ZpbGUoZmlsZSwgY29udGVudCk7XG5cblx0XHRcdFx0Y2hhbmdlZCA9IG5ldyBBcGlBb3RDb21waWxlcihmaWxlLCBjaGFuZ2VkKS5wYXJzZShzb3VyY2UgPT4gdHJhbnNwaWxlU2luZ2xlVHMoc291cmNlLCB0c0NvbXBpbGVyT3B0aW9ucykpO1xuXHRcdFx0XHRpZiAoaGFzSW1wb3J0QXBpKVxuXHRcdFx0XHRcdGNoYW5nZWQgPSBhcGlUbXBsVHMoe3BhY2thZ2VOYW1lOiBjb21wUGtnLmxvbmdOYW1lfSkgKyAnXFxuJyArIGNoYW5nZWQ7XG5cdFx0XHRcdGlmIChjaGFuZ2VkICE9PSBjb250ZW50ICYmIG5nUGFyYW0uc3NyKSB7XG5cdFx0XHRcdFx0Y2hhbmdlZCA9ICdpbXBvcnQgXCJAZHItY29yZS9uZy1hcHAtYnVpbGRlci9zcmMvZHJjcC1pbmNsdWRlXCI7XFxuJyArIGNoYW5nZWQ7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKG5lZWRMb2dGaWxlKVxuXHRcdFx0XHRcdGxvZy5pbmZvKGNoYWxrLmN5YW4oZmlsZSkgKyAnOlxcbicgKyBjaGFuZ2VkKTtcblx0XHRcdFx0Y29uc3QgYmYgPSBzdHJpbmcyYnVmZmVyKGNoYW5nZWQpO1xuXHRcdFx0XHR0aGlzLnRzQ2FjaGUuc2V0KHRoaXMucmVhbEZpbGUoZmlsZSwgcHJlc2VydmVTeW1saW5rcyksIGJmKTtcblx0XHRcdFx0cmV0dXJuIG9mKGJmKTtcblx0XHRcdH0gY2F0Y2ggKGV4KSB7XG5cdFx0XHRcdGxvZy5lcnJvcihleCk7XG5cdFx0XHRcdHJldHVybiB0aHJvd0Vycm9yKGV4KTtcblx0XHRcdH1cblx0XHR9O1xuXHR9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzdHJpbmcyYnVmZmVyKGlucHV0OiBzdHJpbmcpOiBBcnJheUJ1ZmZlciB7XG5cdGNvbnN0IG5vZGVCdWYgPSBCdWZmZXIuZnJvbShpbnB1dCk7XG5cdGNvbnN0IGxlbiA9IG5vZGVCdWYuYnl0ZUxlbmd0aDtcblx0Y29uc3QgbmV3QnVmID0gbmV3IEFycmF5QnVmZmVyKGxlbik7XG5cdGNvbnN0IGRhdGFWaWV3ID0gbmV3IERhdGFWaWV3KG5ld0J1Zik7XG5cdGZvciAobGV0IGkgPSAwOyBpIDwgbGVuOyBpKyspIHtcblx0XHRkYXRhVmlldy5zZXRVaW50OChpLCBub2RlQnVmLnJlYWRVSW50OChpKSk7XG5cdH1cblx0cmV0dXJuIG5ld0J1Zjtcbn1cblxuZnVuY3Rpb24gYnJvd3NlckxlZ29Db25maWcoKSB7XG5cdHZhciBicm93c2VyUHJvcFNldDogYW55ID0ge307XG5cdHZhciBsZWdvQ29uZmlnOiBhbnkgPSB7fTsgLy8gbGVnb0NvbmZpZyBpcyBnbG9iYWwgY29uZmlndXJhdGlvbiBwcm9wZXJ0aWVzIHdoaWNoIGFwcGx5IHRvIGFsbCBlbnRyaWVzIGFuZCBtb2R1bGVzXG5cdF8uZWFjaChbXG5cdFx0J3N0YXRpY0Fzc2V0c1VSTCcsICdzZXJ2ZXJVUkwnLCAncGFja2FnZUNvbnRleHRQYXRoTWFwcGluZycsXG5cdFx0J2xvY2FsZXMnLCAnZGV2TW9kZScsICdvdXRwdXRQYXRoTWFwJ1xuXHRdLCBwcm9wID0+IGJyb3dzZXJQcm9wU2V0W3Byb3BdID0gMSk7XG5cdF8uZWFjaChhcGkuY29uZmlnKCkuYnJvd3NlclNpZGVDb25maWdQcm9wLCBwcm9wID0+IGJyb3dzZXJQcm9wU2V0W3Byb3BdID0gdHJ1ZSk7XG5cdF8uZm9yT3duKGJyb3dzZXJQcm9wU2V0LCAobm90aGluZywgcHJvcFBhdGgpID0+IF8uc2V0KGxlZ29Db25maWcsIHByb3BQYXRoLCBfLmdldChhcGkuY29uZmlnKCksIHByb3BQYXRoKSkpO1xuXHR2YXIgY29tcHJlc3NlZEluZm8gPSBjb21wcmVzc091dHB1dFBhdGhNYXAobGVnb0NvbmZpZy5vdXRwdXRQYXRoTWFwKTtcblx0bGVnb0NvbmZpZy5vdXRwdXRQYXRoTWFwID0gY29tcHJlc3NlZEluZm8uZGlmZk1hcDtcblx0bGVnb0NvbmZpZy5fb3V0cHV0QXNOYW1lcyA9IGNvbXByZXNzZWRJbmZvLnNhbWVzO1xuXHRsZWdvQ29uZmlnLmJ1aWxkTG9jYWxlID0gYXBpLmdldEJ1aWxkTG9jYWxlKCk7XG5cdGxvZy5kZWJ1ZygnRGVmaW5lUGx1Z2luIExFR09fQ09ORklHOiAnLCBsZWdvQ29uZmlnKTtcblx0cmV0dXJuIGxlZ29Db25maWc7XG59XG5cbmZ1bmN0aW9uIGNvbXByZXNzT3V0cHV0UGF0aE1hcChwYXRoTWFwOiBhbnkpIHtcblx0dmFyIG5ld01hcDogYW55ID0ge307XG5cdHZhciBzYW1lQXNOYW1lczogc3RyaW5nW10gPSBbXTtcblx0Xy5lYWNoKHBhdGhNYXAsICh2YWx1ZSwga2V5KSA9PiB7XG5cdFx0dmFyIHBhcnNlZCA9IGFwaS5wYWNrYWdlVXRpbHMucGFyc2VOYW1lKGtleSk7XG5cdFx0aWYgKHBhcnNlZC5uYW1lICE9PSB2YWx1ZSkge1xuXHRcdFx0bmV3TWFwW2tleV0gPSB2YWx1ZTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0c2FtZUFzTmFtZXMucHVzaChrZXkpO1xuXHRcdH1cblx0fSk7XG5cdHJldHVybiB7XG5cdFx0c2FtZXM6IHNhbWVBc05hbWVzLFxuXHRcdGRpZmZNYXA6IG5ld01hcFxuXHR9O1xufVxuXG5mdW5jdGlvbiBnZXRSb3V0ZXJNb2R1bGVzKGFwcE1vZHVsZVBhY2thZ2U6IFBhY2thZ2VCcm93c2VySW5zdGFuY2UsIGFwcE1vZHVsZURpcjogc3RyaW5nKSB7XG5cdGNvbnN0IG5nTW9kdWxlczogc3RyaW5nW10gPSBhcGkuY29uZmlnLmdldChbYXBpLnBhY2thZ2VOYW1lLCAnbmdNb2R1bGUnXSkgfHwgW107XG5cdGNvbnN0IG5nUGFja2FnZU1vZHVsZXMgPSBuZXcgU2V0KHBhY2thZ2VOYW1lczJOZ01vZHVsZShhcHBNb2R1bGVQYWNrYWdlLCBhcHBNb2R1bGVEaXIsXG5cdFx0YXBpLmNvbmZpZy5nZXQoW2FwaS5wYWNrYWdlTmFtZSwgJ25nUGFja2FnZSddKSB8fCBbXSkpO1xuXHRuZ01vZHVsZXMuZm9yRWFjaChtID0+IG5nUGFja2FnZU1vZHVsZXMuYWRkKG0pKTtcblx0cmV0dXJuIEFycmF5LmZyb20obmdQYWNrYWdlTW9kdWxlcyk7XG59XG5cbmZ1bmN0aW9uIHBhY2thZ2VOYW1lczJOZ01vZHVsZShhcHBNb2R1bGVQazogUGFja2FnZUJyb3dzZXJJbnN0YW5jZSwgYXBwTW9kdWxlRGlyOiBzdHJpbmcsIGluY2x1ZGVQYWNrYWdlcz86IHN0cmluZ1tdKTogc3RyaW5nW10ge1xuXHRjb25zdCByZXM6IHN0cmluZ1tdID0gW107XG5cdGlmIChpbmNsdWRlUGFja2FnZXMpIHtcblx0XHRmb3IgKGNvbnN0IG5hbWUgb2YgaW5jbHVkZVBhY2thZ2VzKSB7XG5cdFx0XHRsZXQgcGsgPSBhcGkucGFja2FnZUluZm8ubW9kdWxlTWFwW25hbWVdO1xuXHRcdFx0aWYgKHBrID09IG51bGwpIHtcblx0XHRcdFx0Y29uc3Qgc2NvcGUgPSAoYXBpLmNvbmZpZy5nZXQoJ3BhY2thZ2VTY29wZXMnKSBhcyBzdHJpbmdbXSkuZmluZChzY29wZSA9PiB7XG5cdFx0XHRcdFx0cmV0dXJuIGFwaS5wYWNrYWdlSW5mby5tb2R1bGVNYXBbYEAke3Njb3BlfS8ke25hbWV9YF0gIT0gbnVsbDtcblx0XHRcdFx0fSk7XG5cdFx0XHRcdGlmIChzY29wZSA9PSBudWxsKSB7XG5cdFx0XHRcdFx0bG9nLmVycm9yKCdQYWNrYWdlIG5hbWVkOiBcIiVzXCIgaXMgbm90IGZvdW5kIHdpdGggcG9zc2libGUgc2NvcGUgbmFtZSBpbiBcIiVzXCInLCBuYW1lLFxuXHRcdFx0XHRcdFx0KGFwaS5jb25maWcuZ2V0KCdwYWNrYWdlU2NvcGVzJykgYXMgc3RyaW5nW10pLmpvaW4oJywgJykpO1xuXHRcdFx0XHRcdGJyZWFrO1xuXHRcdFx0XHR9XG5cdFx0XHRcdHBrID0gYXBpLnBhY2thZ2VJbmZvLm1vZHVsZU1hcFtgQCR7c2NvcGV9LyR7bmFtZX1gXTtcblx0XHRcdH1cblx0XHRcdGVhY2hQYWNrYWdlKHBrKTtcblx0XHR9XG5cdH0gZWxzZSB7XG5cdFx0Zm9yIChjb25zdCBwayBvZiBhcGkucGFja2FnZUluZm8uYWxsTW9kdWxlcykge1xuXHRcdFx0ZWFjaFBhY2thZ2UocGspO1xuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIGVhY2hQYWNrYWdlKHBrOiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlKSB7XG5cdFx0aWYgKHBrLmRyID09IG51bGwgfHwgcGsuZHIubmdNb2R1bGUgPT0gbnVsbClcblx0XHRcdHJldHVybjtcblxuXHRcdGxldCBtb2R1bGVzID0gcGsuZHIubmdNb2R1bGU7XG5cdFx0aWYgKCFBcnJheS5pc0FycmF5KG1vZHVsZXMpKVxuXHRcdFx0bW9kdWxlcyA9IFttb2R1bGVzXTtcblxuXHRcdGZvciAobGV0IG5hbWUgb2YgbW9kdWxlcykge1xuXHRcdFx0bmFtZSA9IF8udHJpbVN0YXJ0KG5hbWUsICcuLycpO1xuXHRcdFx0aWYgKHBrICE9PSBhcHBNb2R1bGVQaykge1xuXHRcdFx0XHRpZiAobmFtZS5pbmRleE9mKCcjJykgPCAwKVxuXHRcdFx0XHRcdHJlcy5wdXNoKHBrLmxvbmdOYW1lICsgJyMnICsgbmFtZSk7XG5cdFx0XHRcdGVsc2Vcblx0XHRcdFx0XHRyZXMucHVzaChway5sb25nTmFtZSArICcvJyArIG5hbWUpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0Ly8gcGFja2FnZSBpcyBzYW1lIGFzIHRoZSBvbmUgYXBwLm1vZHVsZSBiZWxvbmdzIHRvLCB3ZSB1c2UgcmVsYXRpdmUgcGF0aCBpbnN0ZWFkIG9mIHBhY2thZ2UgbmFtZVxuXHRcdFx0XHRpZiAobmFtZS5pbmRleE9mKCcjJykgPCAwKVxuXHRcdFx0XHRcdHRocm93IG5ldyBFcnJvcihgSW4gJHtway5yZWFsUGFja2FnZVBhdGh9L3BhY2thZ2UuanNvbiwgdmFsdWUgb2YgXCJkci5uZ01vZHVsZVwiIGFycmF5YCArXG5cdFx0XHRcdFx0XHRgbXVzdCBiZSBpbiBmb3JtIG9mICc8cGF0aD4jPGV4cG9ydCBOZ01vZHVsZSBuYW1lPicsIGJ1dCBoZXJlIGl0IGlzICcke25hbWV9J2ApO1xuXHRcdFx0XHRjb25zdCBuYW1lUGFydHMgPSBuYW1lLnNwbGl0KCcjJyk7XG5cdFx0XHRcdG5hbWUgPSByZWxhdGl2ZShhcHBNb2R1bGVEaXIsIG5hbWVQYXJ0c1swXSkgKyAnIycgKyBuYW1lUGFydHNbMV07XG5cdFx0XHRcdG5hbWUgPSBuYW1lLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcblx0XHRcdFx0aWYgKCFuYW1lLnN0YXJ0c1dpdGgoJy4nKSlcblx0XHRcdFx0XHRuYW1lID0gJy4vJyArIG5hbWU7XG5cdFx0XHRcdHJlcy5wdXNoKG5hbWUpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXHRyZXR1cm4gcmVzO1xufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIGFwcE1vZHVsZVBrTmFtZSBwYWNrYWdlIG5hbWUgb2YgdGhlIG9uZSBjb250YWlucyBhcHAubW9kdWxlLnRzXG4gKiBAcGFyYW0gYXBwTW9kdWxlRGlyIGFwcC5tb2R1bGUudHMncyBkaXJlY3RvcnksIHVzZWQgdG8gY2FsY3VsYXRlIHJlbGF0aXZlIHBhdGhcbiAqL1xuZnVuY3Rpb24gcmVtb3ZhYmxlTmdNb2R1bGVzKGFwcE1vZHVsZVBrOiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlLCBhcHBNb2R1bGVEaXI6IHN0cmluZyk6IHN0cmluZ1tdIHtcblx0cmV0dXJuIHBhY2thZ2VOYW1lczJOZ01vZHVsZShhcHBNb2R1bGVQaywgYXBwTW9kdWxlRGlyKTtcbn1cbiJdfQ==
