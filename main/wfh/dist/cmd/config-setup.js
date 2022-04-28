"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLXNldHVwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NvbmZpZy1zZXR1cC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGtEQUEwQjtBQUMxQixvREFBNEI7QUFDNUIsb0RBQXVCO0FBQ3ZCLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsK0RBQWlEO0FBQ2pELHVEQUErQjtBQUMvQixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDbEMsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsbUJBQW1CLENBQUMsQ0FBQztBQUVsRCxTQUFnQixZQUFZLENBQUMsVUFBeUQ7SUFDcEYsTUFBTSxnQkFBZ0IsR0FHbEIsRUFBQyxhQUFhLEVBQUUsRUFBRSxFQUFFLHFCQUFxQixFQUFFLEVBQUUsRUFBQyxDQUFDO0lBQ25ELE1BQU0scUJBQXFCLEdBQUcsZ0JBQWdCLENBQUMscUJBQXFCLENBQUM7SUFFckUsTUFBTSxvQkFBb0IsR0FBRyxFQUFFLENBQUMsQ0FBQywrQ0FBK0M7SUFDaEYsTUFBTSxlQUFlLEdBQUcsRUFBRSxDQUFDLENBQUMsd0JBQXdCO0lBQ3BELEtBQUssTUFBTSxHQUFHLElBQUksWUFBWSxDQUFDLFdBQVcsRUFBRSxFQUFFO1FBQzVDLE1BQU0sRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBQyxHQUFHLEdBQUcsQ0FBQztRQUVwQyxNQUFNLEVBQUUsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUN2QixJQUFJLENBQUMsRUFBRTtZQUNMLFNBQVM7UUFFWCxnREFBZ0Q7UUFDaEQsb0JBQW9CLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLHFCQUFxQixFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMvRSxnQkFBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEVB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QzNCLE1BQU0sQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztRQUNuRSxJQUFJLENBQUMsS0FBSyxTQUFTO1lBQ2pCLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDYixJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUM7WUFDckQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLGdCQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQzthQUNuQyxJQUFJLGdCQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLGdCQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ2pELGVBQWUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7U0FDakM7YUFBTTtZQUNMLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUM7U0FDdEI7S0FDRjtBQUNILENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCAqIGFzIHBhY2thZ2VVdGlscyBmcm9tICcuLi9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi4vY29uZmlnJztcbmNvbnN0IGpzWWFtbCA9IHJlcXVpcmUoJ2pzLXlhbWwnKTtcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLmNsaUFkdmFuY2VkJyk7XG5cbmV4cG9ydCBmdW5jdGlvbiBhZGR1cENvbmZpZ3Mob25FYWNoWWFtbDogKGZpbGU6IHN0cmluZywgY29uZmlnQ29udGVudDogc3RyaW5nKSA9PiB2b2lkKSB7XG4gIGNvbnN0IGNvbXBvbmVudENvbmZpZ3M6IHtcbiAgICBvdXRwdXRQYXRoTWFwOiB7W2s6IHN0cmluZ106IHN0cmluZ307XG4gICAgYnJvd3NlclNpZGVDb25maWdQcm9wOiBzdHJpbmdbXVxuICB9ID0ge291dHB1dFBhdGhNYXA6IHt9LCBicm93c2VyU2lkZUNvbmZpZ1Byb3A6IFtdfTtcbiAgY29uc3QgYnJvd3NlclNpZGVDb25maWdQcm9wID0gY29tcG9uZW50Q29uZmlncy5icm93c2VyU2lkZUNvbmZpZ1Byb3A7XG5cbiAgY29uc3QgY29tcG9uZW50Q29uZmlnczRFbnYgPSB7fTsgLy8ga2V5IGlzIGVudjpzdHJpbmcsIHZhbHVlIGlzIGNvbXBvbmVudENvbmZpZ3NcbiAgY29uc3QgdHJhY2tPdXRwdXRQYXRoID0ge307IC8vIEZvciBjaGVja2luZyBjb25mbGljdFxuICBmb3IgKGNvbnN0IHBrZyBvZiBwYWNrYWdlVXRpbHMuYWxsUGFja2FnZXMoKSkge1xuICAgIGNvbnN0IHtuYW1lLCBqc29uLCBzaG9ydE5hbWV9ID0gcGtnO1xuXG4gICAgY29uc3QgZHIgPSBwa2cuanNvbi5kcjtcbiAgICBpZiAoIWRyKVxuICAgICAgY29udGludWU7XG5cbiAgICAvLyBjb21wb25lbnQgY3VzdG9taXplZCBjb25maWd1cmF0aW9uIHByb3BlcnRpZXNcbiAgICBfYWRkdXBDb21wQ29uZmlnUHJvcChjb21wb25lbnRDb25maWdzLCBuYW1lLCBicm93c2VyU2lkZUNvbmZpZ1Byb3AsIGRyLmNvbmZpZyk7XG4gICAgXy5lYWNoKGRyLCAodmFsdWUsIGtleSkgPT4ge1xuICAgICAgY29uc3QgbSA9IC9eY29uZmlnXFwuKC4qKSQvLmV4ZWMoa2V5KTtcbiAgICAgIGlmICghbSlcbiAgICAgICAgcmV0dXJuO1xuICAgICAgY29uc3QgZW52ID0gbVsxXTtcbiAgICAgIGlmICghXy5oYXMoY29tcG9uZW50Q29uZmlnczRFbnYsIGVudikpXG4gICAgICAgIGNvbXBvbmVudENvbmZpZ3M0RW52W2Vudl0gPSB7YnJvd3NlclNpZGVDb25maWdQcm9wOiBbXX07XG4gICAgICBfYWRkdXBDb21wQ29uZmlnUHJvcChjb21wb25lbnRDb25maWdzNEVudltlbnZdLCBuYW1lLCBjb21wb25lbnRDb25maWdzNEVudltlbnZdLmJyb3dzZXJTaWRlQ29uZmlnUHJvcCwgdmFsdWUpO1xuICAgIH0pO1xuXG4gICAgLy8gb3V0cHV0UGF0aFxuICAgIHZhciBvdXRwdXRQYXRoID0gZHIub3V0cHV0UGF0aDtcbiAgICBpZiAob3V0cHV0UGF0aCA9PSBudWxsKVxuICAgICAgb3V0cHV0UGF0aCA9IGRyLm5nUm91dGVyUGF0aDtcbiAgICBpZiAob3V0cHV0UGF0aCA9PSBudWxsKVxuICAgICAgb3V0cHV0UGF0aCA9IF8uZ2V0KGpzb24sICdkci5vdXRwdXQucGF0aCcsIHNob3J0TmFtZSk7XG5cbiAgICBpZiAoXy5oYXModHJhY2tPdXRwdXRQYXRoLCBvdXRwdXRQYXRoKSAmJiB0cmFja091dHB1dFBhdGhbb3V0cHV0UGF0aF0gIT09IG5hbWUpIHtcbiAgICAgIGxvZy53YXJuKGNoYWxrLnllbGxvdygnW1dhcm5pbmddIENvbmZsaWN0IHBhY2thZ2UgbGV2ZWwgb3V0cHV0UGF0aCBzZXR0aW5nIChha2EgXCJuZ1JvdXRlclBhdGhcIiBpbiBwYWNrYWdlLmpzb24pIFwiJXNcIiBmb3IgYm90aCAlcyBhbmQgJXMsIHJlc29sdmUgY29uZmxpY3QgYnkgYWRkaW5nIGEgY29uZmlnIGZpbGUsJyksIG91dHB1dFBhdGgsIHRyYWNrT3V0cHV0UGF0aFtvdXRwdXRQYXRoXSwgbmFtZSk7XG4gICAgICBsb2cud2FybihjaGFsay55ZWxsb3coJyVzXFwncyBcIm91dHB1dFBhdGhcIiB3aWxsIGJlIGNoYW5nZWQgdG8gJXMnKSwgbmFtZSwgc2hvcnROYW1lKTtcbiAgICAgIG91dHB1dFBhdGggPSBzaG9ydE5hbWU7XG4gICAgfVxuICAgIHRyYWNrT3V0cHV0UGF0aFtvdXRwdXRQYXRoXSA9IG5hbWU7XG4gICAgY29tcG9uZW50Q29uZmlncy5vdXRwdXRQYXRoTWFwW25hbWVdID0gb3V0cHV0UGF0aDtcbiAgfVxuXG4gIGNvbnN0IHN1cGVyQ29uZmlnID0gcmVxdWlyZSgnLi4vLi4vY29uZmlnLnlhbWwnKTtcbiAgZGVlcGx5TWVyZ2VKc29uKHN1cGVyQ29uZmlnLCBjb21wb25lbnRDb25maWdzKTtcbiAgaWYgKG9uRWFjaFlhbWwpIHtcbiAgICBvbkVhY2hZYW1sKCdjb25maWcueWFtbCcsIGpzWWFtbC5zYWZlRHVtcChzdXBlckNvbmZpZykpO1xuICB9XG4gIC8vIHZhciByZXMgPSB7J2NvbmZpZy55YW1sJzoganNZYW1sLnNhZmVEdW1wKHN1cGVyQ29uZmlnKX07XG4gIF8uZWFjaChjb21wb25lbnRDb25maWdzNEVudiwgKGNvbmZpZ3MsIGVudikgPT4ge1xuICAgIGNvbnN0IHRtcGxGaWxlID0gUGF0aC5qb2luKF9fZGlybmFtZSwgJy4uLy4uL3RlbXBsYXRlcycsICdjb25maWcuJyArIGVudiArICctdGVtcGxhdGUueWFtbCcpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHRtcGxGaWxlKSkge1xuICAgICAgY29uZmlncyA9IE9iamVjdC5hc3NpZ24oanNZYW1sLnNhZmVMb2FkKGZzLnJlYWRGaWxlU3luYyh0bXBsRmlsZSwgJ3V0ZjgnKSwge2ZpbGVuYW1lOiB0bXBsRmlsZX0pLCBjb25maWdzKTtcbiAgICB9XG4gICAgLy8gcmVzWydjb25maWcuJyArIGVudiArICcueWFtbCddID0ganNZYW1sLnNhZmVEdW1wKGNvbmZpZ3MpO1xuICAgIGlmIChvbkVhY2hZYW1sKSB7XG4gICAgICBvbkVhY2hZYW1sKCdjb25maWcuJyArIGVudiArICcueWFtbCcsIGpzWWFtbC5zYWZlRHVtcChjb25maWdzKSk7XG4gICAgfVxuICB9KTtcbiAgLy8gY2xlYW5QYWNrYWdlc1dhbGtlckNhY2hlKCk7XG4gIGNvbmZpZy5yZWxvYWQoKTtcbiAgcmV0dXJuIFByb21pc2UucmVzb2x2ZShudWxsKTtcbn1cblxuZnVuY3Rpb24gX2FkZHVwQ29tcENvbmZpZ1Byb3AoY29tcG9uZW50Q29uZmlnczoge1trOiBzdHJpbmddOiBhbnl9LCBjb21wTmFtZTogc3RyaW5nLCBicm93c2VyU2lkZUNvbmZpZ1Byb3A6IHN0cmluZ1tdLFxuICBjb25maWdKc29uOiB7cHVibGljOiBhbnksIHNlcnZlcjogYW55fSkge1xuICBpZiAoIWNvbmZpZ0pzb24pXG4gICAgcmV0dXJuO1xuICAvLyBjb21wb25lbnQgY3VzdG9taXplZCBjb25maWd1cmF0aW9uIHByb3BlcnRpZXNcblxuICAvLyBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KCkpIGlzIHRvIGNsb25lIG9yaWdpbmFsIG9iamVjdCB3aGljaCBpc1xuICAvLyBzdG9yZWQgaW4gYSByZWR1eCBzdG9yZSBhcyBpbW11dGFibGUgc3RhdGUgKGJ5IGltbWVySlMpLFxuICAvLyBJIHRyaWVkIGxvZGFzaCBjbG9uZSwgYnV0IGl0IHN0aWxsIGtlZXBzIFwicmVhZCBvbmx5XCIgcHJvdGVjdGlvbiBvbiBvYmplY3QsXG4gIC8vIHNvIEkgaGF2ZSB0byB1c2UgSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSgpKSBpbnN0ZWFkXG4gIGNvbnN0IGNvbXBvbmVudENvbmZpZyA9IEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoY29uZmlnSnNvbi5wdWJsaWMgfHwge30pKTtcbiAgZGVlcGx5TWVyZ2VKc29uKGNvbXBvbmVudENvbmZpZywgSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeShjb25maWdKc29uLnNlcnZlcikpKTtcblxuICBpZiAoXy5zaXplKGNvbXBvbmVudENvbmZpZykgPiAwIClcbiAgICBjb21wb25lbnRDb25maWdzW2NvbXBOYW1lXSA9IGNvbXBvbmVudENvbmZpZztcblxuICAvLyBicm93c2VyU2lkZUNvbmZpZ1Byb3BcbiAgYnJvd3NlclNpZGVDb25maWdQcm9wLnB1c2goLi4uXy5tYXAoXy5rZXlzKGNvbmZpZ0pzb24ucHVibGljKSwga2V5ID0+IGNvbXBOYW1lICsgJy4nICsga2V5KSk7XG59XG5cbmZ1bmN0aW9uIGRlZXBseU1lcmdlSnNvbih0YXJnZXQ6IHtba2V5OiBzdHJpbmddOiBhbnl9LCBzcmM6IGFueSxcbiAgY3VzdG9taXplcj86ICh0VmFsdWU6IGFueSwgc1ZhbHVlOiBhbnksIGtleTogc3RyaW5nKSA9PiBhbnkpIHtcbiAgZm9yIChjb25zdCBba2V5LCBzVmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKHNyYykpIHtcbiAgICBjb25zdCB0VmFsdWUgPSB0YXJnZXRba2V5XTtcbiAgICBjb25zdCBjID0gY3VzdG9taXplciA/IGN1c3RvbWl6ZXIodFZhbHVlLCBzVmFsdWUsIGtleSkgOiB1bmRlZmluZWQ7XG4gICAgaWYgKGMgIT09IHVuZGVmaW5lZClcbiAgICAgIHRhcmdldFtrZXldID0gYztcbiAgICBlbHNlIGlmIChBcnJheS5pc0FycmF5KHRWYWx1ZSkgJiYgQXJyYXkuaXNBcnJheShzVmFsdWUpKVxuICAgICAgdGFyZ2V0W2tleV0gPSBfLnVuaW9uKHRWYWx1ZSwgc1ZhbHVlKTtcbiAgICBlbHNlIGlmIChfLmlzT2JqZWN0KHRWYWx1ZSkgJiYgXy5pc09iamVjdChzVmFsdWUpKSB7XG4gICAgICBkZWVwbHlNZXJnZUpzb24odFZhbHVlLCBzVmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB0YXJnZXRba2V5XSA9IHNWYWx1ZTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==