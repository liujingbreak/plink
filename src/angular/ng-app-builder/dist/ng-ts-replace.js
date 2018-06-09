"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const __api_1 = require("__api");
/* tslint:disable max-line-length */
const _ = require("lodash");
const log4js = require("log4js");
const rxjs_1 = require("rxjs");
const Path = require("path");
const log = log4js.getLogger(__api_1.default.packageName);
const apiTmpl = _.template('var __DrApi = require(\'@dr-core/webpack2-builder\'); var __api = __DrApi.getCachedApi(\'<%=packageName%>\') || __DrApi(\'<%=packageName%>\'); __api.default = __api;');
const includeTsFile = Path.join(__dirname, '..', 'src', 'drcp-include.ts');
exports.readHook = virtualHostReadHook;
function virtualHostReadHook(file, buf) {
    // log.warn(file);
    if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
        log.warn(file);
        if (file === includeTsFile) {
            browserLegoConfig();
            log.warn('here');
        }
        let compPkg = __api_1.default.findPackageByFile(file);
        let len = buf.byteLength;
        let content = Buffer.from(buf).toString();
        let changed = __api_1.default.browserInjector.injectToFile(file, content);
        if (changed !== content) {
            changed = apiTmpl({ packageName: compPkg.longName }) + '\n' + changed;
            let nodeBuf = Buffer.from(changed);
            len = nodeBuf.byteLength;
            let newBuf = new ArrayBuffer(len);
            let dataView = new DataView(newBuf);
            for (let i = 0; i < len; i++) {
                dataView.setUint8(i, nodeBuf.readUInt8(i));
            }
            log.info('Replacing content in ' + file);
            return rxjs_1.of(newBuf);
        }
    }
    return rxjs_1.of(buf);
}
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
