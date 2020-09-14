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
    packageUtils.findAllPackages((name, entryPath, parsedName, json, packagePath) => {
        const dr = json.dr;
        if (!dr)
            return;
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
            outputPath = lodash_1.default.get(json, 'dr.output.path', parsedName.name);
        if (lodash_1.default.has(trackOutputPath, outputPath) && trackOutputPath[outputPath] !== name) {
            log.warn(chalk_1.default.yellow('[Warning] Conflict package level outputPath setting (aka "ngRouterPath" in package.json) "%s" for both %s and %s, resolve conflict by adding a config file,'), outputPath, trackOutputPath[outputPath], name);
            log.warn(chalk_1.default.yellow('%s\'s "outputPath" will be changed to %s'), name, parsedName.name);
            outputPath = parsedName.name;
        }
        trackOutputPath[outputPath] = name;
        componentConfigs.outputPathMap[name] = outputPath;
        // chunks
        var chunk = lodash_1.default.has(json, 'dr.chunk') ? dr.chunk : dr.bundle;
        if (!chunk) {
            if ((dr.entryPage || dr.entryView))
                chunk = parsedName.name; // Entry package should have a default chunk name as its package short name
        }
        if (chunk) {
            if (lodash_1.default.has(vendorBundleMap, chunk))
                vendorBundleMap[chunk].push(name);
            else
                vendorBundleMap[chunk] = [name];
        }
    });
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
    const componentConfig = lodash_1.default.assign({}, configJson.public);
    deeplyMergeJson(componentConfig, configJson.server);
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
        else if (lodash_1.default.isObject(tValue) && lodash_1.default.isObject(sValue))
            deeplyMergeJson(tValue, sValue);
        else
            target[key] = sValue;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLXNldHVwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NvbmZpZy1zZXR1cC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsa0RBQTBCO0FBQzFCLG9EQUE0QjtBQUM1QixvREFBdUI7QUFDdkIsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QiwrREFBaUQ7QUFDakQsdURBQStCO0FBQy9CLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNsQyxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBR2hELFNBQWdCLFlBQVksQ0FBQyxVQUF5RDtJQUNwRixNQUFNLGdCQUFnQixHQUFHLEVBQUMsYUFBYSxFQUFFLEVBQUUsRUFBRSxlQUFlLEVBQUUsRUFBRSxFQUFFLHFCQUFxQixFQUFFLEVBQUUsRUFBQyxDQUFDO0lBQzdGLE1BQU0sZUFBZSxHQUFHLGdCQUFnQixDQUFDLGVBQWUsQ0FBQztJQUN6RCxNQUFNLHFCQUFxQixHQUFHLGdCQUFnQixDQUFDLHFCQUFxQixDQUFDO0lBQ3JFLDREQUE0RDtJQUM1RCxNQUFNLG9CQUFvQixHQUFHLEVBQUUsQ0FBQyxDQUFDLCtDQUErQztJQUNoRixNQUFNLGVBQWUsR0FBRyxFQUFFLENBQUMsQ0FBQyx3QkFBd0I7SUFDcEQsWUFBWSxDQUFDLGVBQWUsQ0FDNUIsQ0FBQyxJQUFZLEVBQUUsU0FBaUIsRUFBRSxVQUF5QyxFQUFFLElBQVMsRUFBRSxXQUFtQixFQUFFLEVBQUU7UUFDN0csTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUNuQixJQUFJLENBQUMsRUFBRTtZQUNMLE9BQU87UUFFVCxnREFBZ0Q7UUFDaEQsb0JBQW9CLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLHFCQUFxQixFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMs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QUN4QjtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHBhY2thZ2VVdGlscyBmcm9tICcuLi9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbmNvbnN0IGpzWWFtbCA9IHJlcXVpcmUoJ2pzLXlhbWwnKTtcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3dmaC5jbGlBZHZhbmNlZCcpO1xuXG5cbmV4cG9ydCBmdW5jdGlvbiBhZGR1cENvbmZpZ3Mob25FYWNoWWFtbDogKGZpbGU6IHN0cmluZywgY29uZmlnQ29udGVudDogc3RyaW5nKSA9PiB2b2lkKSB7XG4gIGNvbnN0IGNvbXBvbmVudENvbmZpZ3MgPSB7b3V0cHV0UGF0aE1hcDoge30sIHZlbmRvckJ1bmRsZU1hcDoge30sIGJyb3dzZXJTaWRlQ29uZmlnUHJvcDogW119O1xuICBjb25zdCB2ZW5kb3JCdW5kbGVNYXAgPSBjb21wb25lbnRDb25maWdzLnZlbmRvckJ1bmRsZU1hcDtcbiAgY29uc3QgYnJvd3NlclNpZGVDb25maWdQcm9wID0gY29tcG9uZW50Q29uZmlncy5icm93c2VyU2lkZUNvbmZpZ1Byb3A7XG4gIC8vIHZhciBlbnRyeVBhZ2VNYXBwaW5nID0gY29tcG9uZW50Q29uZmlncy5lbnRyeVBhZ2VNYXBwaW5nO1xuICBjb25zdCBjb21wb25lbnRDb25maWdzNEVudiA9IHt9OyAvLyBrZXkgaXMgZW52OnN0cmluZywgdmFsdWUgaXMgY29tcG9uZW50Q29uZmlnc1xuICBjb25zdCB0cmFja091dHB1dFBhdGggPSB7fTsgLy8gRm9yIGNoZWNraW5nIGNvbmZsaWN0XG4gIHBhY2thZ2VVdGlscy5maW5kQWxsUGFja2FnZXMoXG4gIChuYW1lOiBzdHJpbmcsIGVudHJ5UGF0aDogc3RyaW5nLCBwYXJzZWROYW1lOiB7bmFtZTogc3RyaW5nLCBzY29wZTogc3RyaW5nfSwganNvbjogYW55LCBwYWNrYWdlUGF0aDogc3RyaW5nKSA9PiB7XG4gICAgY29uc3QgZHIgPSBqc29uLmRyO1xuICAgIGlmICghZHIpXG4gICAgICByZXR1cm47XG5cbiAgICAvLyBjb21wb25lbnQgY3VzdG9taXplZCBjb25maWd1cmF0aW9uIHByb3BlcnRpZXNcbiAgICBfYWRkdXBDb21wQ29uZmlnUHJvcChjb21wb25lbnRDb25maWdzLCBuYW1lLCBicm93c2VyU2lkZUNvbmZpZ1Byb3AsIGRyLmNvbmZpZyk7XG4gICAgXy5lYWNoKGRyLCAodmFsdWUsIGtleSkgPT4ge1xuICAgICAgY29uc3QgbSA9IC9eY29uZmlnXFwuKC4qKSQvLmV4ZWMoa2V5KTtcbiAgICAgIGlmICghbSlcbiAgICAgICAgcmV0dXJuO1xuICAgICAgY29uc3QgZW52ID0gbVsxXTtcbiAgICAgIGlmICghXy5oYXMoY29tcG9uZW50Q29uZmlnczRFbnYsIGVudikpXG4gICAgICAgIGNvbXBvbmVudENvbmZpZ3M0RW52W2Vudl0gPSB7YnJvd3NlclNpZGVDb25maWdQcm9wOiBbXX07XG4gICAgICBfYWRkdXBDb21wQ29uZmlnUHJvcChjb21wb25lbnRDb25maWdzNEVudltlbnZdLCBuYW1lLCBjb21wb25lbnRDb25maWdzNEVudltlbnZdLmJyb3dzZXJTaWRlQ29uZmlnUHJvcCwgdmFsdWUpO1xuICAgIH0pO1xuXG4gICAgLy8gb3V0cHV0UGF0aFxuICAgIHZhciBvdXRwdXRQYXRoID0gZHIub3V0cHV0UGF0aDtcbiAgICBpZiAob3V0cHV0UGF0aCA9PSBudWxsKVxuICAgICAgb3V0cHV0UGF0aCA9IGRyLm5nUm91dGVyUGF0aDtcbiAgICBpZiAob3V0cHV0UGF0aCA9PSBudWxsKVxuICAgICAgb3V0cHV0UGF0aCA9IF8uZ2V0KGpzb24sICdkci5vdXRwdXQucGF0aCcsIHBhcnNlZE5hbWUubmFtZSk7XG5cbiAgICBpZiAoXy5oYXModHJhY2tPdXRwdXRQYXRoLCBvdXRwdXRQYXRoKSAmJiB0cmFja091dHB1dFBhdGhbb3V0cHV0UGF0aF0gIT09IG5hbWUpIHtcbiAgICAgIGxvZy53YXJuKGNoYWxrLnllbGxvdygnW1dhcm5pbmddIENvbmZsaWN0IHBhY2thZ2UgbGV2ZWwgb3V0cHV0UGF0aCBzZXR0aW5nIChha2EgXCJuZ1JvdXRlclBhdGhcIiBpbiBwYWNrYWdlLmpzb24pIFwiJXNcIiBmb3IgYm90aCAlcyBhbmQgJXMsIHJlc29sdmUgY29uZmxpY3QgYnkgYWRkaW5nIGEgY29uZmlnIGZpbGUsJyksIG91dHB1dFBhdGgsIHRyYWNrT3V0cHV0UGF0aFtvdXRwdXRQYXRoXSwgbmFtZSk7XG4gICAgICBsb2cud2FybihjaGFsay55ZWxsb3coJyVzXFwncyBcIm91dHB1dFBhdGhcIiB3aWxsIGJlIGNoYW5nZWQgdG8gJXMnKSwgbmFtZSwgcGFyc2VkTmFtZS5uYW1lKTtcbiAgICAgIG91dHB1dFBhdGggPSBwYXJzZWROYW1lLm5hbWU7XG4gICAgfVxuICAgIHRyYWNrT3V0cHV0UGF0aFtvdXRwdXRQYXRoXSA9IG5hbWU7XG4gICAgY29tcG9uZW50Q29uZmlncy5vdXRwdXRQYXRoTWFwW25hbWVdID0gb3V0cHV0UGF0aDtcbiAgICAvLyBjaHVua3NcbiAgICB2YXIgY2h1bmsgPSBfLmhhcyhqc29uLCAnZHIuY2h1bmsnKSA/IGRyLmNodW5rIDogZHIuYnVuZGxlO1xuICAgIGlmICghY2h1bmspIHtcbiAgICAgIGlmICgoZHIuZW50cnlQYWdlIHx8IGRyLmVudHJ5VmlldykpXG4gICAgICAgIGNodW5rID0gcGFyc2VkTmFtZS5uYW1lOyAvLyBFbnRyeSBwYWNrYWdlIHNob3VsZCBoYXZlIGEgZGVmYXVsdCBjaHVuayBuYW1lIGFzIGl0cyBwYWNrYWdlIHNob3J0IG5hbWVcbiAgICB9XG4gICAgaWYgKGNodW5rKSB7XG4gICAgICBpZiAoXy5oYXModmVuZG9yQnVuZGxlTWFwLCBjaHVuaykpXG4gICAgICAgIHZlbmRvckJ1bmRsZU1hcFtjaHVua10ucHVzaChuYW1lKTtcbiAgICAgIGVsc2VcbiAgICAgICAgdmVuZG9yQnVuZGxlTWFwW2NodW5rXSA9IFtuYW1lXTtcbiAgICB9XG4gIH0pO1xuXG4gIGNvbnN0IHN1cGVyQ29uZmlnID0gcmVxdWlyZSgnLi4vLi4vY29uZmlnLnlhbWwnKTtcbiAgZGVlcGx5TWVyZ2VKc29uKHN1cGVyQ29uZmlnLCBjb21wb25lbnRDb25maWdzKTtcbiAgaWYgKG9uRWFjaFlhbWwpIHtcbiAgICBvbkVhY2hZYW1sKCdjb25maWcueWFtbCcsIGpzWWFtbC5zYWZlRHVtcChzdXBlckNvbmZpZykpO1xuICB9XG4gIC8vIHZhciByZXMgPSB7J2NvbmZpZy55YW1sJzoganNZYW1sLnNhZmVEdW1wKHN1cGVyQ29uZmlnKX07XG4gIF8uZWFjaChjb21wb25lbnRDb25maWdzNEVudiwgKGNvbmZpZ3MsIGVudikgPT4ge1xuICAgIGNvbnN0IHRtcGxGaWxlID0gUGF0aC5qb2luKF9fZGlybmFtZSwgJ3RlbXBsYXRlcycsICdjb25maWcuJyArIGVudiArICctdGVtcGxhdGUueWFtbCcpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHRtcGxGaWxlKSkge1xuICAgICAgY29uZmlncyA9IE9iamVjdC5hc3NpZ24oanNZYW1sLnNhZmVMb2FkKGZzLnJlYWRGaWxlU3luYyh0bXBsRmlsZSwgJ3V0ZjgnKSwge2ZpbGVuYW1lOiB0bXBsRmlsZX0pLCBjb25maWdzKTtcbiAgICB9XG4gICAgLy8gcmVzWydjb25maWcuJyArIGVudiArICcueWFtbCddID0ganNZYW1sLnNhZmVEdW1wKGNvbmZpZ3MpO1xuICAgIGlmIChvbkVhY2hZYW1sKSB7XG4gICAgICBvbkVhY2hZYW1sKCdjb25maWcuJyArIGVudiArICcueWFtbCcsIGpzWWFtbC5zYWZlRHVtcChjb25maWdzKSk7XG4gICAgfVxuICB9KTtcbiAgLy8gY2xlYW5QYWNrYWdlc1dhbGtlckNhY2hlKCk7XG4gIGNvbmZpZy5yZWxvYWQoKTtcbiAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShudWxsKTtcbn1cblxuZnVuY3Rpb24gX2FkZHVwQ29tcENvbmZpZ1Byb3AoY29tcG9uZW50Q29uZmlnczoge1trOiBzdHJpbmddOiBhbnl9LCBjb21wTmFtZTogc3RyaW5nLCBicm93c2VyU2lkZUNvbmZpZ1Byb3A6IHN0cmluZ1tdLFxuICBjb25maWdKc29uOiB7cHVibGljOiBhbnksIHNlcnZlcjogYW55fSkge1xuICBpZiAoIWNvbmZpZ0pzb24pXG4gICAgcmV0dXJuO1xuICAvLyBjb21wb25lbnQgY3VzdG9taXplZCBjb25maWd1cmF0aW9uIHByb3BlcnRpZXNcbiAgY29uc3QgY29tcG9uZW50Q29uZmlnID0gXy5hc3NpZ24oe30sIGNvbmZpZ0pzb24ucHVibGljKTtcbiAgZGVlcGx5TWVyZ2VKc29uKGNvbXBvbmVudENvbmZpZywgY29uZmlnSnNvbi5zZXJ2ZXIpO1xuXG4gIGlmIChfLnNpemUoY29tcG9uZW50Q29uZmlnKSA+IDAgKVxuICAgIGNvbXBvbmVudENvbmZpZ3NbY29tcE5hbWVdID0gY29tcG9uZW50Q29uZmlnO1xuXG4gIC8vIGJyb3dzZXJTaWRlQ29uZmlnUHJvcFxuICBicm93c2VyU2lkZUNvbmZpZ1Byb3AucHVzaCguLi5fLm1hcChfLmtleXMoY29uZmlnSnNvbi5wdWJsaWMpLCBrZXkgPT4gY29tcE5hbWUgKyAnLicgKyBrZXkpKTtcbn1cblxuZnVuY3Rpb24gZGVlcGx5TWVyZ2VKc29uKHRhcmdldDoge1trZXk6IHN0cmluZ106IGFueX0sIHNyYzogYW55LFxuICBjdXN0b21pemVyPzogKHRWYWx1ZTogYW55LCBzVmFsdWU6IGFueSwga2V5OiBzdHJpbmcpID0+IGFueSkge1xuICBmb3IgKGNvbnN0IFtrZXksIHNWYWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMoc3JjKSkge1xuICAgIGNvbnN0IHRWYWx1ZSA9IHRhcmdldFtrZXldO1xuICAgIGNvbnN0IGMgPSBjdXN0b21pemVyID8gY3VzdG9taXplcih0VmFsdWUsIHNWYWx1ZSwga2V5KSA6IHVuZGVmaW5lZDtcbiAgICBpZiAoYyAhPT0gdW5kZWZpbmVkKVxuICAgICAgdGFyZ2V0W2tleV0gPSBjO1xuICAgIGVsc2UgaWYgKEFycmF5LmlzQXJyYXkodFZhbHVlKSAmJiBBcnJheS5pc0FycmF5KHNWYWx1ZSkpXG4gICAgICB0YXJnZXRba2V5XSA9IF8udW5pb24odFZhbHVlLCBzVmFsdWUpO1xuICAgIGVsc2UgaWYgKF8uaXNPYmplY3QodFZhbHVlKSAmJiBfLmlzT2JqZWN0KHNWYWx1ZSkpXG4gICAgICBkZWVwbHlNZXJnZUpzb24odFZhbHVlLCBzVmFsdWUpO1xuICAgIGVsc2VcbiAgICAgIHRhcmdldFtrZXldID0gc1ZhbHVlO1xuICB9XG59XG4iXX0=