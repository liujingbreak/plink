"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable max-line-length */
const __api_1 = require("__api");
const _ = require("lodash");
const log4js = require("log4js");
const rxjs_1 = require("rxjs");
const ts_before_aot_1 = require("./utils/ts-before-aot");
const typescript_1 = require("typescript");
const fs_1 = require("fs");
const ts = require("typescript");
const log = log4js.getLogger(__api_1.default.packageName);
const apiTmpl = _.template('var __DrApi = require(\'@dr-core/webpack2-builder/browser/api\');\
var __api = __DrApi.getCachedApi(\'<%=packageName%>\') || __DrApi(\'<%=packageName%>\');\
 __api.default = __api;');
// const includeTsFile = Path.join(__dirname, '..', 'src', 'drcp-include.ts');
function createTsReadHook(ngParam) {
    let drcpIncludeBuf;
    let tsconfigFile = ngParam.browserOptions.tsConfig;
    let tsCompilerOptions = readTsConfig(tsconfigFile);
    return function (file, buf) {
        try {
            if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
                if (/[\\\/]drcp-include\.ts/.test(file)) {
                    if (drcpIncludeBuf)
                        return rxjs_1.of(drcpIncludeBuf);
                    let content = Buffer.from(buf).toString();
                    const legoConfig = browserLegoConfig();
                    let body;
                    if (_.get(ngParam, 'builderConfig.options.hmr')) {
                        content = `import 'webpack-hot-middleware/client';
						// Used for reflect-metadata in JIT. If you use AOT (and only Angular decorators), you can remove.
						import hmrBootstrap from './hmr';
						`.replace(/^[ \t]+/gm, '') + content;
                        body = 'hmrBootstrap(module, bootstrap);';
                    }
                    else {
                        body = 'bootstrap();';
                    }
                    if (!ngParam.browserOptions.aot) {
                        content = 'import \'core-js/es7/reflect\';\n' + content;
                    }
                    content = content.replace(/\/\/ handleBootStrap placeholder/, body);
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
                    log.info(file + ':\n' + content);
                    return rxjs_1.of(drcpIncludeBuf);
                }
                const compPkg = __api_1.default.findPackageByFile(file);
                const content = Buffer.from(buf).toString();
                let changed = __api_1.default.browserInjector.injectToFile(file, content);
                changed = new ts_before_aot_1.default(file, changed).parse(source => transpileSingleTs(source, tsCompilerOptions));
                if (changed !== content) {
                    changed = apiTmpl({ packageName: compPkg.longName }) + '\n' + changed;
                    if (ngParam.ssr)
                        changed = 'import "@dr-core/ng-app-builder/src/drcp-include";\n' + changed;
                    return rxjs_1.of(string2buffer(changed));
                }
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
function readTsConfig(tsconfigFile) {
    let tsconfig = ts.readConfigFile(tsconfigFile, (file) => fs_1.readFileSync(file, 'utf-8')).config;
    return ts.parseJsonConfigFileContent(tsconfig, ts.sys, process.cwd().replace(/\\/g, '/'), undefined, tsconfigFile).options;
}
/**
 * Refer to https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API#transpiling-a-single-file
 * @param tsCode
 */
function transpileSingleTs(tsCode, compilerOptions) {
    let res = typescript_1.transpileModule(tsCode, { compilerOptions });
    if (res.diagnostics && res.diagnostics.length > 0) {
        let msg = `Failed to transpile TS expression: ${tsCode}\n` + res.diagnostics.join('\n');
        log.error(msg);
        throw new Error(msg);
    }
    return res.outputText;
}
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

//# sourceMappingURL=ng-ts-replace.js.map
