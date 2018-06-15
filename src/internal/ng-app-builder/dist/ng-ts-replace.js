"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __api_1 = require("__api");
/* tslint:disable max-line-length */
const _ = require("lodash");
const log4js = require("log4js");
const rxjs_1 = require("rxjs");
const log = log4js.getLogger(__api_1.default.packageName);
const apiTmpl = _.template('var __DrApi = require(\'@dr-core/webpack2-builder\'); var __api = __DrApi.getCachedApi(\'<%=packageName%>\') || __DrApi(\'<%=packageName%>\'); __api.default = __api;');
// const includeTsFile = Path.join(__dirname, '..', 'src', 'drcp-include.ts');
function createTsReadHook(ngParam) {
    let drcpIncludeBuf;
    return function (file, buf) {
        try {
            // log.warn(file);
            if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
                if (/[\\\/]drcp-include\.ts/.test(file)) {
                    if (drcpIncludeBuf)
                        return rxjs_1.of(drcpIncludeBuf);
                    let content = Buffer.from(buf).toString();
                    let legoConfig = browserLegoConfig();
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
                    content += `\n(window as any).LEGO_CONFIG = ${JSON.stringify(legoConfig, null, '  ')};\n`;
                    drcpIncludeBuf = string2buffer(content);
                    log.info(file + ':\n' + content);
                    return rxjs_1.of(drcpIncludeBuf);
                }
                let compPkg = __api_1.default.findPackageByFile(file);
                let content = Buffer.from(buf).toString();
                let changed = __api_1.default.browserInjector.injectToFile(file, content);
                if (changed !== content) {
                    changed = apiTmpl({ packageName: compPkg.longName }) + '\n' + changed;
                    log.info('Replacing content in ' + file);
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
function string2buffer(input) {
    let nodeBuf = Buffer.from(input);
    let len = nodeBuf.byteLength;
    let newBuf = new ArrayBuffer(len);
    let dataView = new DataView(newBuf);
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
