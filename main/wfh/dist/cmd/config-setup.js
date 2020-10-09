"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addupConfigs = void 0;
const chalk_1 = __importDefault(require("chalk"));
const log4js_1 = __importDefault(require("log4js"));
const lodash_1 = __importDefault(require("lodash"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const packageUtils = __importStar(require("../package-utils"));
const config_1 = __importDefault(require("../config"));
const jsYaml = require('js-yaml');
const log = log4js_1.default.getLogger('wfh.cliAdvanced');
function addupConfigs(onEachYaml) {
    const componentConfigs = { outputPathMap: {}, vendorBundleMap: {}, browserSideConfigProp: [] };
    const vendorBundleMap = componentConfigs.vendorBundleMap;
    const browserSideConfigProp = componentConfigs.browserSideConfigProp;
    // var entryPageMapping = componentConfigs.entryPageMapping;
    const componentConfigs4Env = {}; // key is env:string, value is componentConfigs
    const trackOutputPath = {}; // For checking conflict
    for (const pkg of packageUtils.allPackages()) {
        const { name, json, shortName } = pkg;
        // packageUtils.findAllPackages(
        // (name: string, entryPath: string, parsedName: {name: string, scope: string}, json: any, packagePath: string) => {
        const dr = pkg.json.dr;
        if (!dr)
            continue;
        // component customized configuration properties
        _addupCompConfigProp(componentConfigs, name, browserSideConfigProp, dr.config);
        lodash_1.default.each(dr, (value, key) => {
            const m = /^config\.(.*)$/.exec(key);
            if (!m)
                return;
            const env = m[1];
            if (!lodash_1.default.has(componentConfigs4Env, env))
                componentConfigs4Env[env] = { browserSideConfigProp: [] };
            _addupCompConfigProp(componentConfigs4Env[env], name, componentConfigs4Env[env].browserSideConfigProp, value);
        });
        // outputPath
        var outputPath = dr.outputPath;
        if (outputPath == null)
            outputPath = dr.ngRouterPath;
        if (outputPath == null)
            outputPath = lodash_1.default.get(json, 'dr.output.path', shortName);
        if (lodash_1.default.has(trackOutputPath, outputPath) && trackOutputPath[outputPath] !== name) {
            log.warn(chalk_1.default.yellow('[Warning] Conflict package level outputPath setting (aka "ngRouterPath" in package.json) "%s" for both %s and %s, resolve conflict by adding a config file,'), outputPath, trackOutputPath[outputPath], name);
            log.warn(chalk_1.default.yellow('%s\'s "outputPath" will be changed to %s'), name, shortName);
            outputPath = shortName;
        }
        trackOutputPath[outputPath] = name;
        componentConfigs.outputPathMap[name] = outputPath;
        // chunks
        var chunk = lodash_1.default.has(json, 'dr.chunk') ? dr.chunk : dr.bundle;
        if (!chunk) {
            if ((dr.entryPage || dr.entryView))
                chunk = shortName; // Entry package should have a default chunk name as its package short name
        }
        if (chunk) {
            if (lodash_1.default.has(vendorBundleMap, chunk))
                vendorBundleMap[chunk].push(name);
            else
                vendorBundleMap[chunk] = [name];
        }
    }
    const superConfig = require('../../config.yaml');
    deeplyMergeJson(superConfig, componentConfigs);
    if (onEachYaml) {
        onEachYaml('config.yaml', jsYaml.safeDump(superConfig));
    }
    // var res = {'config.yaml': jsYaml.safeDump(superConfig)};
    lodash_1.default.each(componentConfigs4Env, (configs, env) => {
        const tmplFile = path_1.default.join(__dirname, 'templates', 'config.' + env + '-template.yaml');
        if (fs_1.default.existsSync(tmplFile)) {
            configs = Object.assign(jsYaml.safeLoad(fs_1.default.readFileSync(tmplFile, 'utf8'), { filename: tmplFile }), configs);
        }
        // res['config.' + env + '.yaml'] = jsYaml.safeDump(configs);
        if (onEachYaml) {
            onEachYaml('config.' + env + '.yaml', jsYaml.safeDump(configs));
        }
    });
    // cleanPackagesWalkerCache();
    config_1.default.reload();
    return Promise.resolve(null);
}
exports.addupConfigs = addupConfigs;
function _addupCompConfigProp(componentConfigs, compName, browserSideConfigProp, configJson) {
    if (!configJson)
        return;
    // component customized configuration properties
    // JSON.parse(JSON.stringify()) is to clone original object which is
    // stored in a redux store as immutable state (by immerJS),
    // I tried lodash clone, but it still keeps "read only" protection on object,
    // so I have to use JSON.parse(JSON.stringify()) instead
    const componentConfig = JSON.parse(JSON.stringify(configJson.public || {}));
    deeplyMergeJson(componentConfig, JSON.parse(JSON.stringify(configJson.server)));
    if (lodash_1.default.size(componentConfig) > 0)
        componentConfigs[compName] = componentConfig;
    // browserSideConfigProp
    browserSideConfigProp.push(...lodash_1.default.map(lodash_1.default.keys(configJson.public), key => compName + '.' + key));
}
function deeplyMergeJson(target, src, customizer) {
    for (const [key, sValue] of Object.entries(src)) {
        const tValue = target[key];
        const c = customizer ? customizer(tValue, sValue, key) : undefined;
        if (c !== undefined)
            target[key] = c;
        else if (Array.isArray(tValue) && Array.isArray(sValue))
            target[key] = lodash_1.default.union(tValue, sValue);
        else if (lodash_1.default.isObject(tValue) && lodash_1.default.isObject(sValue)) {
            deeplyMergeJson(tValue, sValue);
        }
        else {
            target[key] = sValue;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLXNldHVwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NvbmZpZy1zZXR1cC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsa0RBQTBCO0FBQzFCLG9EQUE0QjtBQUM1QixvREFBdUI7QUFDdkIsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QiwrREFBaUQ7QUFDakQsdURBQStCO0FBQy9CLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNsQyxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBR2hELFNBQWdCLFlBQVksQ0FBQyxVQUF5RDtJQUNwRixNQUFNLGdCQUFnQixHQUlsQixFQUFDLGFBQWEsRUFBRSxFQUFFLEVBQUUsZUFBZSxFQUFFLEVBQUUsRUFBRSxxQkFBcUIsRUFBRSxFQUFFLEVBQUMsQ0FBQztJQUN4RSxNQUFNLGVBQWUsR0FBRyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUM7SUFDekQsTUFBTSxxQkFBcUIsR0FBRyxnQkFBZ0IsQ0FBQyxxQkFBcUIsQ0FBQztJQUNyRSw0REFBNEQ7SUFDNUQsTUFBTSxvQkFBb0IsR0FBRyxFQUFFLENBQUMsQ0FBQywrQ0FBK0M7SUFDaEYsTUFBTSxlQUFlLEdBQUcsRUFBRSxDQUFDLENBQUMsd0JBQXdCO0lBQ3BELEtBQUssTUFBTSxHQUFHLElBQUksWUFBWSxDQUFDLFdBQVcsRUFBRSxFQUFFO1FBQzVDLE1BQU0sRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBQyxHQUFHLEdBQUcsQ0FBQztRQUN0QyxnQ0FBZ0M7UUFDaEMsb0hBQW9IO1FBQ2xILE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxFQUFFO1lBQ0wsU0FBUztRQUVYLGdEQUFnRDtRQUNoRCxvQkFBb0Is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TUFBTSxDQUFDLElBQUksZ0JBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDakQsZUFBZSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztTQUNqQzthQUFNO1lBQ0wsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQztTQUN0QjtLQUNGO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgcGFja2FnZVV0aWxzIGZyb20gJy4uL3BhY2thZ2UtdXRpbHMnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuY29uc3QganNZYW1sID0gcmVxdWlyZSgnanMteWFtbCcpO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignd2ZoLmNsaUFkdmFuY2VkJyk7XG5cblxuZXhwb3J0IGZ1bmN0aW9uIGFkZHVwQ29uZmlncyhvbkVhY2hZYW1sOiAoZmlsZTogc3RyaW5nLCBjb25maWdDb250ZW50OiBzdHJpbmcpID0+IHZvaWQpIHtcbiAgY29uc3QgY29tcG9uZW50Q29uZmlnczoge1xuICAgIG91dHB1dFBhdGhNYXA6IHtbazogc3RyaW5nXTogc3RyaW5nfTtcbiAgICB2ZW5kb3JCdW5kbGVNYXA6IHtbazogc3RyaW5nXTogc3RyaW5nW119O1xuICAgIGJyb3dzZXJTaWRlQ29uZmlnUHJvcDogc3RyaW5nW11cbiAgfSA9IHtvdXRwdXRQYXRoTWFwOiB7fSwgdmVuZG9yQnVuZGxlTWFwOiB7fSwgYnJvd3NlclNpZGVDb25maWdQcm9wOiBbXX07XG4gIGNvbnN0IHZlbmRvckJ1bmRsZU1hcCA9IGNvbXBvbmVudENvbmZpZ3MudmVuZG9yQnVuZGxlTWFwO1xuICBjb25zdCBicm93c2VyU2lkZUNvbmZpZ1Byb3AgPSBjb21wb25lbnRDb25maWdzLmJyb3dzZXJTaWRlQ29uZmlnUHJvcDtcbiAgLy8gdmFyIGVudHJ5UGFnZU1hcHBpbmcgPSBjb21wb25lbnRDb25maWdzLmVudHJ5UGFnZU1hcHBpbmc7XG4gIGNvbnN0IGNvbXBvbmVudENvbmZpZ3M0RW52ID0ge307IC8vIGtleSBpcyBlbnY6c3RyaW5nLCB2YWx1ZSBpcyBjb21wb25lbnRDb25maWdzXG4gIGNvbnN0IHRyYWNrT3V0cHV0UGF0aCA9IHt9OyAvLyBGb3IgY2hlY2tpbmcgY29uZmxpY3RcbiAgZm9yIChjb25zdCBwa2cgb2YgcGFja2FnZVV0aWxzLmFsbFBhY2thZ2VzKCkpIHtcbiAgICBjb25zdCB7bmFtZSwganNvbiwgc2hvcnROYW1lfSA9IHBrZztcbiAgLy8gcGFja2FnZVV0aWxzLmZpbmRBbGxQYWNrYWdlcyhcbiAgLy8gKG5hbWU6IHN0cmluZywgZW50cnlQYXRoOiBzdHJpbmcsIHBhcnNlZE5hbWU6IHtuYW1lOiBzdHJpbmcsIHNjb3BlOiBzdHJpbmd9LCBqc29uOiBhbnksIHBhY2thZ2VQYXRoOiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCBkciA9IHBrZy5qc29uLmRyO1xuICAgIGlmICghZHIpXG4gICAgICBjb250aW51ZTtcblxuICAgIC8vIGNvbXBvbmVudCBjdXN0b21pemVkIGNvbmZpZ3VyYXRpb24gcHJvcGVydGllc1xuICAgIF9hZGR1cENvbXBDb25maWdQcm9wKGNvbXBvbmVudENvbmZpZ3MsIG5hbWUsIGJyb3dzZXJTaWRlQ29uZmlnUHJvcCwgZHIuY29uZmlnKTtcbiAgICBfLmVhY2goZHIsICh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICBjb25zdCBtID0gL15jb25maWdcXC4oLiopJC8uZXhlYyhrZXkpO1xuICAgICAgaWYgKCFtKVxuICAgICAgICByZXR1cm47XG4gICAgICBjb25zdCBlbnYgPSBtWzFdO1xuICAgICAgaWYgKCFfLmhhcyhjb21wb25lbnRDb25maWdzNEVudiwgZW52KSlcbiAgICAgICAgY29tcG9uZW50Q29uZmlnczRFbnZbZW52XSA9IHticm93c2VyU2lkZUNvbmZpZ1Byb3A6IFtdfTtcbiAgICAgIF9hZGR1cENvbXBDb25maWdQcm9wKGNvbXBvbmVudENvbmZpZ3M0RW52W2Vudl0sIG5hbWUsIGNvbXBvbmVudENvbmZpZ3M0RW52W2Vudl0uYnJvd3NlclNpZGVDb25maWdQcm9wLCB2YWx1ZSk7XG4gICAgfSk7XG5cbiAgICAvLyBvdXRwdXRQYXRoXG4gICAgdmFyIG91dHB1dFBhdGggPSBkci5vdXRwdXRQYXRoO1xuICAgIGlmIChvdXRwdXRQYXRoID09IG51bGwpXG4gICAgICBvdXRwdXRQYXRoID0gZHIubmdSb3V0ZXJQYXRoO1xuICAgIGlmIChvdXRwdXRQYXRoID09IG51bGwpXG4gICAgICBvdXRwdXRQYXRoID0gXy5nZXQoanNvbiwgJ2RyLm91dHB1dC5wYXRoJywgc2hvcnROYW1lKTtcblxuICAgIGlmIChfLmhhcyh0cmFja091dHB1dFBhdGgsIG91dHB1dFBhdGgpICYmIHRyYWNrT3V0cHV0UGF0aFtvdXRwdXRQYXRoXSAhPT0gbmFtZSkge1xuICAgICAgbG9nLndhcm4oY2hhbGsueWVsbG93KCdbV2FybmluZ10gQ29uZmxpY3QgcGFja2FnZSBsZXZlbCBvdXRwdXRQYXRoIHNldHRpbmcgKGFrYSBcIm5nUm91dGVyUGF0aFwiIGluIHBhY2thZ2UuanNvbikgXCIlc1wiIGZvciBib3RoICVzIGFuZCAlcywgcmVzb2x2ZSBjb25mbGljdCBieSBhZGRpbmcgYSBjb25maWcgZmlsZSwnKSwgb3V0cHV0UGF0aCwgdHJhY2tPdXRwdXRQYXRoW291dHB1dFBhdGhdLCBuYW1lKTtcbiAgICAgIGxvZy53YXJuKGNoYWxrLnllbGxvdygnJXNcXCdzIFwib3V0cHV0UGF0aFwiIHdpbGwgYmUgY2hhbmdlZCB0byAlcycpLCBuYW1lLCBzaG9ydE5hbWUpO1xuICAgICAgb3V0cHV0UGF0aCA9IHNob3J0TmFtZTtcbiAgICB9XG4gICAgdHJhY2tPdXRwdXRQYXRoW291dHB1dFBhdGhdID0gbmFtZTtcbiAgICBjb21wb25lbnRDb25maWdzLm91dHB1dFBhdGhNYXBbbmFtZV0gPSBvdXRwdXRQYXRoO1xuICAgIC8vIGNodW5rc1xuICAgIHZhciBjaHVuayA9IF8uaGFzKGpzb24sICdkci5jaHVuaycpID8gZHIuY2h1bmsgOiBkci5idW5kbGU7XG4gICAgaWYgKCFjaHVuaykge1xuICAgICAgaWYgKChkci5lbnRyeVBhZ2UgfHwgZHIuZW50cnlWaWV3KSlcbiAgICAgICAgY2h1bmsgPSBzaG9ydE5hbWU7IC8vIEVudHJ5IHBhY2thZ2Ugc2hvdWxkIGhhdmUgYSBkZWZhdWx0IGNodW5rIG5hbWUgYXMgaXRzIHBhY2thZ2Ugc2hvcnQgbmFtZVxuICAgIH1cbiAgICBpZiAoY2h1bmspIHtcbiAgICAgIGlmIChfLmhhcyh2ZW5kb3JCdW5kbGVNYXAsIGNodW5rKSlcbiAgICAgICAgdmVuZG9yQnVuZGxlTWFwW2NodW5rXS5wdXNoKG5hbWUpO1xuICAgICAgZWxzZVxuICAgICAgICB2ZW5kb3JCdW5kbGVNYXBbY2h1bmtdID0gW25hbWVdO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IHN1cGVyQ29uZmlnID0gcmVxdWlyZSgnLi4vLi4vY29uZmlnLnlhbWwnKTtcbiAgZGVlcGx5TWVyZ2VKc29uKHN1cGVyQ29uZmlnLCBjb21wb25lbnRDb25maWdzKTtcbiAgaWYgKG9uRWFjaFlhbWwpIHtcbiAgICBvbkVhY2hZYW1sKCdjb25maWcueWFtbCcsIGpzWWFtbC5zYWZlRHVtcChzdXBlckNvbmZpZykpO1xuICB9XG4gIC8vIHZhciByZXMgPSB7J2NvbmZpZy55YW1sJzoganNZYW1sLnNhZmVEdW1wKHN1cGVyQ29uZmlnKX07XG4gIF8uZWFjaChjb21wb25lbnRDb25maWdzNEVudiwgKGNvbmZpZ3MsIGVudikgPT4ge1xuICAgIGNvbnN0IHRtcGxGaWxlID0gUGF0aC5qb2luKF9fZGlybmFtZSwgJ3RlbXBsYXRlcycsICdjb25maWcuJyArIGVudiArICctdGVtcGxhdGUueWFtbCcpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHRtcGxGaWxlKSkge1xuICAgICAgY29uZmlncyA9IE9iamVjdC5hc3NpZ24oanNZYW1sLnNhZmVMb2FkKGZzLnJlYWRGaWxlU3luYyh0bXBsRmlsZSwgJ3V0ZjgnKSwge2ZpbGVuYW1lOiB0bXBsRmlsZX0pLCBjb25maWdzKTtcbiAgICB9XG4gICAgLy8gcmVzWydjb25maWcuJyArIGVudiArICcueWFtbCddID0ganNZYW1sLnNhZmVEdW1wKGNvbmZpZ3MpO1xuICAgIGlmIChvbkVhY2hZYW1sKSB7XG4gICAgICBvbkVhY2hZYW1sKCdjb25maWcuJyArIGVudiArICcueWFtbCcsIGpzWWFtbC5zYWZlRHVtcChjb25maWdzKSk7XG4gICAgfVxuICB9KTtcbiAgLy8gY2xlYW5QYWNrYWdlc1dhbGtlckNhY2hlKCk7XG4gIGNvbmZpZy5yZWxvYWQoKTtcbiAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShudWxsKTtcbn1cblxuZnVuY3Rpb24gX2FkZHVwQ29tcENvbmZpZ1Byb3AoY29tcG9uZW50Q29uZmlnczoge1trOiBzdHJpbmddOiBhbnl9LCBjb21wTmFtZTogc3RyaW5nLCBicm93c2VyU2lkZUNvbmZpZ1Byb3A6IHN0cmluZ1tdLFxuICBjb25maWdKc29uOiB7cHVibGljOiBhbnksIHNlcnZlcjogYW55fSkge1xuICBpZiAoIWNvbmZpZ0pzb24pXG4gICAgcmV0dXJuO1xuICAvLyBjb21wb25lbnQgY3VzdG9taXplZCBjb25maWd1cmF0aW9uIHByb3BlcnRpZXNcblxuICAvLyBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KCkpIGlzIHRvIGNsb25lIG9yaWdpbmFsIG9iamVjdCB3aGljaCBpc1xuICAvLyBzdG9yZWQgaW4gYSByZWR1eCBzdG9yZSBhcyBpbW11dGFibGUgc3RhdGUgKGJ5IGltbWVySlMpLFxuICAvLyBJIHRyaWVkIGxvZGFzaCBjbG9uZSwgYnV0IGl0IHN0aWxsIGtlZXBzIFwicmVhZCBvbmx5XCIgcHJvdGVjdGlvbiBvbiBvYmplY3QsXG4gIC8vIHNvIEkgaGF2ZSB0byB1c2UgSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSgpKSBpbnN0ZWFkXG4gIGNvbnN0IGNvbXBvbmVudENvbmZpZyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoY29uZmlnSnNvbi5wdWJsaWMgfHwge30pKTtcbiAgZGVlcGx5TWVyZ2VKc29uKGNvbXBvbmVudENvbmZpZywgSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShjb25maWdKc29uLnNlcnZlcikpKTtcblxuICBpZiAoXy5zaXplKGNvbXBvbmVudENvbmZpZykgPiAwIClcbiAgICBjb21wb25lbnRDb25maWdzW2NvbXBOYW1lXSA9IGNvbXBvbmVudENvbmZpZztcblxuICAvLyBicm93c2VyU2lkZUNvbmZpZ1Byb3BcbiAgYnJvd3NlclNpZGVDb25maWdQcm9wLnB1c2goLi4uXy5tYXAoXy5rZXlzKGNvbmZpZ0pzb24ucHVibGljKSwga2V5ID0+IGNvbXBOYW1lICsgJy4nICsga2V5KSk7XG59XG5cbmZ1bmN0aW9uIGRlZXBseU1lcmdlSnNvbih0YXJnZXQ6IHtba2V5OiBzdHJpbmddOiBhbnl9LCBzcmM6IGFueSxcbiAgY3VzdG9taXplcj86ICh0VmFsdWU6IGFueSwgc1ZhbHVlOiBhbnksIGtleTogc3RyaW5nKSA9PiBhbnkpIHtcbiAgZm9yIChjb25zdCBba2V5LCBzVmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKHNyYykpIHtcbiAgICBjb25zdCB0VmFsdWUgPSB0YXJnZXRba2V5XTtcbiAgICBjb25zdCBjID0gY3VzdG9taXplciA/IGN1c3RvbWl6ZXIodFZhbHVlLCBzVmFsdWUsIGtleSkgOiB1bmRlZmluZWQ7XG4gICAgaWYgKGMgIT09IHVuZGVmaW5lZClcbiAgICAgIHRhcmdldFtrZXldID0gYztcbiAgICBlbHNlIGlmIChBcnJheS5pc0FycmF5KHRWYWx1ZSkgJiYgQXJyYXkuaXNBcnJheShzVmFsdWUpKVxuICAgICAgdGFyZ2V0W2tleV0gPSBfLnVuaW9uKHRWYWx1ZSwgc1ZhbHVlKTtcbiAgICBlbHNlIGlmIChfLmlzT2JqZWN0KHRWYWx1ZSkgJiYgXy5pc09iamVjdChzVmFsdWUpKSB7XG4gICAgICBkZWVwbHlNZXJnZUpzb24odFZhbHVlLCBzVmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0YXJnZXRba2V5XSA9IHNWYWx1ZTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==