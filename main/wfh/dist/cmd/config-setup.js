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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
const log = log4js_1.default.getLogger('plink.cliAdvanced');
function addupConfigs(onEachYaml) {
    const componentConfigs = { outputPathMap: {}, browserSideConfigProp: [] };
    const browserSideConfigProp = componentConfigs.browserSideConfigProp;
    const componentConfigs4Env = {}; // key is env:string, value is componentConfigs
    const trackOutputPath = {}; // For checking conflict
    for (const pkg of packageUtils.allPackages()) {
        const { name, json, shortName } = pkg;
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
    }
    const superConfig = require('../../config.yaml');
    deeplyMergeJson(superConfig, componentConfigs);
    if (onEachYaml) {
        onEachYaml('config.yaml', jsYaml.safeDump(superConfig));
    }
    // var res = {'config.yaml': jsYaml.safeDump(superConfig)};
    lodash_1.default.each(componentConfigs4Env, (configs, env) => {
        const tmplFile = path_1.default.join(__dirname, '../../templates', 'config.' + env + '-template.yaml');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLXNldHVwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NvbmZpZy1zZXR1cC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsa0RBQTBCO0FBQzFCLG9EQUE0QjtBQUM1QixvREFBdUI7QUFDdkIsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QiwrREFBaUQ7QUFDakQsdURBQStCO0FBQy9CLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNsQyxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO0FBRWxELFNBQWdCLFlBQVksQ0FBQyxVQUF5RDtJQUNwRixNQUFNLGdCQUFnQixHQUdsQixFQUFDLGFBQWEsRUFBRSxFQUFFLEVBQUUscUJBQXFCLEVBQUUsRUFBRSxFQUFDLENBQUM7SUFDbkQsTUFBTSxxQkFBcUIsR0FBRyxnQkFBZ0IsQ0FBQyxxQkFBcUIsQ0FBQztJQUVyRSxNQUFNLG9CQUFvQixHQUFHLEVBQUUsQ0FBQyxDQUFDLCtDQUErQztJQUNoRixNQUFNLGVBQWUsR0FBRyxFQUFFLENBQUMsQ0FBQyx3QkFBd0I7SUFDcEQsS0FBSyxNQUFNLEdBQUcsSUFBSSxZQUFZLENBQUMsV0FBVyxFQUFFLEVBQUU7UUFDNUMsTUFBTSxFQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFDLEdBQUcsR0FBRyxDQUFDO1FBRXBDLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxFQUFFO1lBQ0wsU0FBUztRQUVYLGdEQUFnRDtRQUNoRCxvQkFBb0IsQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUscUJBQXFCLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQy9FLGdCQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxD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TUFBTSxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBQ25FLElBQUksQ0FBQyxLQUFLLFNBQVM7WUFDakIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNiLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQztZQUNyRCxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsZ0JBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO2FBQ25DLElBQUksZ0JBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksZ0JBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDakQsZUFBZSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztTQUNqQzthQUFNO1lBQ0wsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQztTQUN0QjtLQUNGO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgcGFja2FnZVV0aWxzIGZyb20gJy4uL3BhY2thZ2UtdXRpbHMnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuY29uc3QganNZYW1sID0gcmVxdWlyZSgnanMteWFtbCcpO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuY2xpQWR2YW5jZWQnKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGFkZHVwQ29uZmlncyhvbkVhY2hZYW1sOiAoZmlsZTogc3RyaW5nLCBjb25maWdDb250ZW50OiBzdHJpbmcpID0+IHZvaWQpIHtcbiAgY29uc3QgY29tcG9uZW50Q29uZmlnczoge1xuICAgIG91dHB1dFBhdGhNYXA6IHtbazogc3RyaW5nXTogc3RyaW5nfTtcbiAgICBicm93c2VyU2lkZUNvbmZpZ1Byb3A6IHN0cmluZ1tdXG4gIH0gPSB7b3V0cHV0UGF0aE1hcDoge30sIGJyb3dzZXJTaWRlQ29uZmlnUHJvcDogW119O1xuICBjb25zdCBicm93c2VyU2lkZUNvbmZpZ1Byb3AgPSBjb21wb25lbnRDb25maWdzLmJyb3dzZXJTaWRlQ29uZmlnUHJvcDtcblxuICBjb25zdCBjb21wb25lbnRDb25maWdzNEVudiA9IHt9OyAvLyBrZXkgaXMgZW52OnN0cmluZywgdmFsdWUgaXMgY29tcG9uZW50Q29uZmlnc1xuICBjb25zdCB0cmFja091dHB1dFBhdGggPSB7fTsgLy8gRm9yIGNoZWNraW5nIGNvbmZsaWN0XG4gIGZvciAoY29uc3QgcGtnIG9mIHBhY2thZ2VVdGlscy5hbGxQYWNrYWdlcygpKSB7XG4gICAgY29uc3Qge25hbWUsIGpzb24sIHNob3J0TmFtZX0gPSBwa2c7XG5cbiAgICBjb25zdCBkciA9IHBrZy5qc29uLmRyO1xuICAgIGlmICghZHIpXG4gICAgICBjb250aW51ZTtcblxuICAgIC8vIGNvbXBvbmVudCBjdXN0b21pemVkIGNvbmZpZ3VyYXRpb24gcHJvcGVydGllc1xuICAgIF9hZGR1cENvbXBDb25maWdQcm9wKGNvbXBvbmVudENvbmZpZ3MsIG5hbWUsIGJyb3dzZXJTaWRlQ29uZmlnUHJvcCwgZHIuY29uZmlnKTtcbiAgICBfLmVhY2goZHIsICh2YWx1ZSwga2V5KSA9PiB7XG4gICAgICBjb25zdCBtID0gL15jb25maWdcXC4oLiopJC8uZXhlYyhrZXkpO1xuICAgICAgaWYgKCFtKVxuICAgICAgICByZXR1cm47XG4gICAgICBjb25zdCBlbnYgPSBtWzFdO1xuICAgICAgaWYgKCFfLmhhcyhjb21wb25lbnRDb25maWdzNEVudiwgZW52KSlcbiAgICAgICAgY29tcG9uZW50Q29uZmlnczRFbnZbZW52XSA9IHticm93c2VyU2lkZUNvbmZpZ1Byb3A6IFtdfTtcbiAgICAgIF9hZGR1cENvbXBDb25maWdQcm9wKGNvbXBvbmVudENvbmZpZ3M0RW52W2Vudl0sIG5hbWUsIGNvbXBvbmVudENvbmZpZ3M0RW52W2Vudl0uYnJvd3NlclNpZGVDb25maWdQcm9wLCB2YWx1ZSk7XG4gICAgfSk7XG5cbiAgICAvLyBvdXRwdXRQYXRoXG4gICAgdmFyIG91dHB1dFBhdGggPSBkci5vdXRwdXRQYXRoO1xuICAgIGlmIChvdXRwdXRQYXRoID09IG51bGwpXG4gICAgICBvdXRwdXRQYXRoID0gZHIubmdSb3V0ZXJQYXRoO1xuICAgIGlmIChvdXRwdXRQYXRoID09IG51bGwpXG4gICAgICBvdXRwdXRQYXRoID0gXy5nZXQoanNvbiwgJ2RyLm91dHB1dC5wYXRoJywgc2hvcnROYW1lKTtcblxuICAgIGlmIChfLmhhcyh0cmFja091dHB1dFBhdGgsIG91dHB1dFBhdGgpICYmIHRyYWNrT3V0cHV0UGF0aFtvdXRwdXRQYXRoXSAhPT0gbmFtZSkge1xuICAgICAgbG9nLndhcm4oY2hhbGsueWVsbG93KCdbV2FybmluZ10gQ29uZmxpY3QgcGFja2FnZSBsZXZlbCBvdXRwdXRQYXRoIHNldHRpbmcgKGFrYSBcIm5nUm91dGVyUGF0aFwiIGluIHBhY2thZ2UuanNvbikgXCIlc1wiIGZvciBib3RoICVzIGFuZCAlcywgcmVzb2x2ZSBjb25mbGljdCBieSBhZGRpbmcgYSBjb25maWcgZmlsZSwnKSwgb3V0cHV0UGF0aCwgdHJhY2tPdXRwdXRQYXRoW291dHB1dFBhdGhdLCBuYW1lKTtcbiAgICAgIGxvZy53YXJuKGNoYWxrLnllbGxvdygnJXNcXCdzIFwib3V0cHV0UGF0aFwiIHdpbGwgYmUgY2hhbmdlZCB0byAlcycpLCBuYW1lLCBzaG9ydE5hbWUpO1xuICAgICAgb3V0cHV0UGF0aCA9IHNob3J0TmFtZTtcbiAgICB9XG4gICAgdHJhY2tPdXRwdXRQYXRoW291dHB1dFBhdGhdID0gbmFtZTtcbiAgICBjb21wb25lbnRDb25maWdzLm91dHB1dFBhdGhNYXBbbmFtZV0gPSBvdXRwdXRQYXRoO1xuICB9XG5cbiAgY29uc3Qgc3VwZXJDb25maWcgPSByZXF1aXJlKCcuLi8uLi9jb25maWcueWFtbCcpO1xuICBkZWVwbHlNZXJnZUpzb24oc3VwZXJDb25maWcsIGNvbXBvbmVudENvbmZpZ3MpO1xuICBpZiAob25FYWNoWWFtbCkge1xuICAgIG9uRWFjaFlhbWwoJ2NvbmZpZy55YW1sJywganNZYW1sLnNhZmVEdW1wKHN1cGVyQ29uZmlnKSk7XG4gIH1cbiAgLy8gdmFyIHJlcyA9IHsnY29uZmlnLnlhbWwnOiBqc1lhbWwuc2FmZUR1bXAoc3VwZXJDb25maWcpfTtcbiAgXy5lYWNoKGNvbXBvbmVudENvbmZpZ3M0RW52LCAoY29uZmlncywgZW52KSA9PiB7XG4gICAgY29uc3QgdG1wbEZpbGUgPSBQYXRoLmpvaW4oX19kaXJuYW1lLCAnLi4vLi4vdGVtcGxhdGVzJywgJ2NvbmZpZy4nICsgZW52ICsgJy10ZW1wbGF0ZS55YW1sJyk7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmModG1wbEZpbGUpKSB7XG4gICAgICBjb25maWdzID0gT2JqZWN0LmFzc2lnbihqc1lhbWwuc2FmZUxvYWQoZnMucmVhZEZpbGVTeW5jKHRtcGxGaWxlLCAndXRmOCcpLCB7ZmlsZW5hbWU6IHRtcGxGaWxlfSksIGNvbmZpZ3MpO1xuICAgIH1cbiAgICAvLyByZXNbJ2NvbmZpZy4nICsgZW52ICsgJy55YW1sJ10gPSBqc1lhbWwuc2FmZUR1bXAoY29uZmlncyk7XG4gICAgaWYgKG9uRWFjaFlhbWwpIHtcbiAgICAgIG9uRWFjaFlhbWwoJ2NvbmZpZy4nICsgZW52ICsgJy55YW1sJywganNZYW1sLnNhZmVEdW1wKGNvbmZpZ3MpKTtcbiAgICB9XG4gIH0pO1xuICAvLyBjbGVhblBhY2thZ2VzV2Fsa2VyQ2FjaGUoKTtcbiAgY29uZmlnLnJlbG9hZCgpO1xuICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKG51bGwpO1xufVxuXG5mdW5jdGlvbiBfYWRkdXBDb21wQ29uZmlnUHJvcChjb21wb25lbnRDb25maWdzOiB7W2s6IHN0cmluZ106IGFueX0sIGNvbXBOYW1lOiBzdHJpbmcsIGJyb3dzZXJTaWRlQ29uZmlnUHJvcDogc3RyaW5nW10sXG4gIGNvbmZpZ0pzb246IHtwdWJsaWM6IGFueSwgc2VydmVyOiBhbnl9KSB7XG4gIGlmICghY29uZmlnSnNvbilcbiAgICByZXR1cm47XG4gIC8vIGNvbXBvbmVudCBjdXN0b21pemVkIGNvbmZpZ3VyYXRpb24gcHJvcGVydGllc1xuXG4gIC8vIEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoKSkgaXMgdG8gY2xvbmUgb3JpZ2luYWwgb2JqZWN0IHdoaWNoIGlzXG4gIC8vIHN0b3JlZCBpbiBhIHJlZHV4IHN0b3JlIGFzIGltbXV0YWJsZSBzdGF0ZSAoYnkgaW1tZXJKUyksXG4gIC8vIEkgdHJpZWQgbG9kYXNoIGNsb25lLCBidXQgaXQgc3RpbGwga2VlcHMgXCJyZWFkIG9ubHlcIiBwcm90ZWN0aW9uIG9uIG9iamVjdCxcbiAgLy8gc28gSSBoYXZlIHRvIHVzZSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KCkpIGluc3RlYWRcbiAgY29uc3QgY29tcG9uZW50Q29uZmlnID0gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShjb25maWdKc29uLnB1YmxpYyB8fCB7fSkpO1xuICBkZWVwbHlNZXJnZUpzb24oY29tcG9uZW50Q29uZmlnLCBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGNvbmZpZ0pzb24uc2VydmVyKSkpO1xuXG4gIGlmIChfLnNpemUoY29tcG9uZW50Q29uZmlnKSA+IDAgKVxuICAgIGNvbXBvbmVudENvbmZpZ3NbY29tcE5hbWVdID0gY29tcG9uZW50Q29uZmlnO1xuXG4gIC8vIGJyb3dzZXJTaWRlQ29uZmlnUHJvcFxuICBicm93c2VyU2lkZUNvbmZpZ1Byb3AucHVzaCguLi5fLm1hcChfLmtleXMoY29uZmlnSnNvbi5wdWJsaWMpLCBrZXkgPT4gY29tcE5hbWUgKyAnLicgKyBrZXkpKTtcbn1cblxuZnVuY3Rpb24gZGVlcGx5TWVyZ2VKc29uKHRhcmdldDoge1trZXk6IHN0cmluZ106IGFueX0sIHNyYzogYW55LFxuICBjdXN0b21pemVyPzogKHRWYWx1ZTogYW55LCBzVmFsdWU6IGFueSwga2V5OiBzdHJpbmcpID0+IGFueSkge1xuICBmb3IgKGNvbnN0IFtrZXksIHNWYWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMoc3JjKSkge1xuICAgIGNvbnN0IHRWYWx1ZSA9IHRhcmdldFtrZXldO1xuICAgIGNvbnN0IGMgPSBjdXN0b21pemVyID8gY3VzdG9taXplcih0VmFsdWUsIHNWYWx1ZSwga2V5KSA6IHVuZGVmaW5lZDtcbiAgICBpZiAoYyAhPT0gdW5kZWZpbmVkKVxuICAgICAgdGFyZ2V0W2tleV0gPSBjO1xuICAgIGVsc2UgaWYgKEFycmF5LmlzQXJyYXkodFZhbHVlKSAmJiBBcnJheS5pc0FycmF5KHNWYWx1ZSkpXG4gICAgICB0YXJnZXRba2V5XSA9IF8udW5pb24odFZhbHVlLCBzVmFsdWUpO1xuICAgIGVsc2UgaWYgKF8uaXNPYmplY3QodFZhbHVlKSAmJiBfLmlzT2JqZWN0KHNWYWx1ZSkpIHtcbiAgICAgIGRlZXBseU1lcmdlSnNvbih0VmFsdWUsIHNWYWx1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRhcmdldFtrZXldID0gc1ZhbHVlO1xuICAgIH1cbiAgfVxufVxuIl19