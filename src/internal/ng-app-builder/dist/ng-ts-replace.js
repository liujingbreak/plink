"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable max-line-length */
const __api_1 = require("__api");
const _ = require("lodash");
const log4js = require("log4js");
const rxjs_1 = require("rxjs");
const ts_before_aot_1 = require("./utils/ts-before-aot");
const parse_app_module_1 = require("./utils/parse-app-module");
const path_1 = require("path");
const ts_compiler_1 = require("dr-comp-package/wfh/dist/ts-compiler");
const chalk = require('chalk');
const log = log4js.getLogger(__api_1.default.packageName);
const apiTmpl = _.template('var __DrApi = require(\'@dr-core/webpack2-builder/browser/api\');\
var __api = __DrApi.getCachedApi(\'<%=packageName%>\') || __DrApi(\'<%=packageName%>\');\
 __api.default = __api;');
// const includeTsFile = Path.join(__dirname, '..', 'src', 'drcp-include.ts');
function createTsReadHook(ngParam) {
    let drcpIncludeBuf;
    const tsconfigFile = ngParam.browserOptions.tsConfig;
    const hmrEnabled = _.get(ngParam, 'builderConfig.options.hmr') || __api_1.default.argv.hmr;
    const tsCompilerOptions = ts_compiler_1.readTsConfig(tsconfigFile);
    let polyfillsFile = '';
    if (ngParam.browserOptions.polyfills)
        polyfillsFile = ngParam.browserOptions.polyfills.replace(/\\/g, '/');
    let appModuleFile = parse_app_module_1.findAppModuleFileFromMain(path_1.resolve(ngParam.browserOptions.main));
    log.info('app module file: ', appModuleFile);
    return function (file, buf) {
        try {
            if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
                let normalFile = path_1.relative(process.cwd(), file);
                if (path_1.sep === '\\')
                    normalFile = normalFile.replace(/\\/g, '/');
                if (hmrEnabled && polyfillsFile && normalFile === polyfillsFile) {
                    const hmrClient = '\nimport \'webpack-hot-middleware/client\';';
                    const content = Buffer.from(buf).toString() + hmrClient;
                    log.info(`Append to ${normalFile}: \nimport \'webpack-hot-middleware/client\';`);
                    return rxjs_1.of(string2buffer(content));
                }
                else if (normalFile.endsWith('/drcp-include.ts')) {
                    if (drcpIncludeBuf)
                        return rxjs_1.of(drcpIncludeBuf);
                    let content = Buffer.from(buf).toString();
                    const legoConfig = browserLegoConfig();
                    let hmrBoot;
                    if (hmrEnabled) {
                        content = `// Used for reflect-metadata in JIT. If you use AOT (and only Angular decorators), you can remove.
						import hmrBootstrap from './hmr';
						`.replace(/^[ \t]+/gm, '') + content;
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
                    ngModules.push(__api_1.default.packageName + '/src/app#DeveloperModule');
                    log.info('Insert optional NgModules to AppModule:\n  ' + ngModules.join('\n  '));
                    content = new parse_app_module_1.default()
                        .patchFile(file, content, removables, ngModules);
                    needLogFile = true;
                }
                let changed = __api_1.default.browserInjector.injectToFile(file, content);
                changed = new ts_before_aot_1.default(file, changed).parse(source => ts_compiler_1.transpileSingleTs(source, tsCompilerOptions));
                if (changed !== content) {
                    changed = apiTmpl({ packageName: compPkg.longName }) + '\n' + changed;
                    if (ngParam.ssr)
                        changed = 'import "@dr-core/ng-app-builder/src/drcp-include";\n' + changed;
                }
                if (needLogFile)
                    log.info(chalk.cyan(file) + ':\n' + changed);
                return rxjs_1.of(string2buffer(changed));
            }
            return rxjs_1.of(buf);
        }
        catch (ex) {
            log.error(ex);
            return rxjs_1.throwError(ex);
        }
    };
}
exports.default = createTsReadHook;
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

//# sourceMappingURL=ng-ts-replace.js.map
