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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLXNldHVwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vdHMvY21kL2NvbmZpZy1zZXR1cC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsa0RBQTBCO0FBQzFCLG9EQUE0QjtBQUM1QixvREFBdUI7QUFDdkIsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QiwrREFBaUQ7QUFDakQsdURBQStCO0FBQy9CLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNsQyxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBRWhELFNBQWdCLFlBQVksQ0FBQyxVQUF5RDtJQUNwRixNQUFNLGdCQUFnQixHQUlsQixFQUFDLGFBQWEsRUFBRSxFQUFFLEVBQUUsZUFBZSxFQUFFLEVBQUUsRUFBRSxxQkFBcUIsRUFBRSxFQUFFLEVBQUMsQ0FBQztJQUN4RSxNQUFNLGVBQWUsR0FBRyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUM7SUFDekQsTUFBTSxxQkFBcUIsR0FBRyxnQkFBZ0IsQ0FBQyxxQkFBcUIsQ0FBQztJQUNyRSw0REFBNEQ7SUFDNUQsTUFBTSxvQkFBb0IsR0FBRyxFQUFFLENBQUMsQ0FBQywrQ0FBK0M7SUFDaEYsTUFBTSxlQUFlLEdBQUcsRUFBRSxDQUFDLENBQUMsd0JBQXdCO0lBQ3BELEtBQUssTUFBTSxHQUFHLElBQUksWUFBWSxDQUFDLFdBQVcsRUFBRSxFQUFFO1FBQzVDLE1BQU0sRUFBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBQyxHQUFHLEdBQUcsQ0FBQztRQUN0QyxnQ0FBZ0M7UUFDaEMsb0hBQW9IO1FBQ2xILE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxFQUFFO1lBQ0wsU0FBUztRQUVYLGdEQUFnRDtRQUNoRCxvQkFBb0Is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TUFBTSxDQUFDLElBQUksZ0JBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDakQsZUFBZSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztTQUNqQzthQUFNO1lBQ0wsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLE1BQU0sQ0FBQztTQUN0QjtLQUNGO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgcGFja2FnZVV0aWxzIGZyb20gJy4uL3BhY2thZ2UtdXRpbHMnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuLi9jb25maWcnO1xuY29uc3QganNZYW1sID0gcmVxdWlyZSgnanMteWFtbCcpO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignd2ZoLmNsaUFkdmFuY2VkJyk7XG5cbmV4cG9ydCBmdW5jdGlvbiBhZGR1cENvbmZpZ3Mob25FYWNoWWFtbDogKGZpbGU6IHN0cmluZywgY29uZmlnQ29udGVudDogc3RyaW5nKSA9PiB2b2lkKSB7XG4gIGNvbnN0IGNvbXBvbmVudENvbmZpZ3M6IHtcbiAgICBvdXRwdXRQYXRoTWFwOiB7W2s6IHN0cmluZ106IHN0cmluZ307XG4gICAgdmVuZG9yQnVuZGxlTWFwOiB7W2s6IHN0cmluZ106IHN0cmluZ1tdfTtcbiAgICBicm93c2VyU2lkZUNvbmZpZ1Byb3A6IHN0cmluZ1tdXG4gIH0gPSB7b3V0cHV0UGF0aE1hcDoge30sIHZlbmRvckJ1bmRsZU1hcDoge30sIGJyb3dzZXJTaWRlQ29uZmlnUHJvcDogW119O1xuICBjb25zdCB2ZW5kb3JCdW5kbGVNYXAgPSBjb21wb25lbnRDb25maWdzLnZlbmRvckJ1bmRsZU1hcDtcbiAgY29uc3QgYnJvd3NlclNpZGVDb25maWdQcm9wID0gY29tcG9uZW50Q29uZmlncy5icm93c2VyU2lkZUNvbmZpZ1Byb3A7XG4gIC8vIHZhciBlbnRyeVBhZ2VNYXBwaW5nID0gY29tcG9uZW50Q29uZmlncy5lbnRyeVBhZ2VNYXBwaW5nO1xuICBjb25zdCBjb21wb25lbnRDb25maWdzNEVudiA9IHt9OyAvLyBrZXkgaXMgZW52OnN0cmluZywgdmFsdWUgaXMgY29tcG9uZW50Q29uZmlnc1xuICBjb25zdCB0cmFja091dHB1dFBhdGggPSB7fTsgLy8gRm9yIGNoZWNraW5nIGNvbmZsaWN0XG4gIGZvciAoY29uc3QgcGtnIG9mIHBhY2thZ2VVdGlscy5hbGxQYWNrYWdlcygpKSB7XG4gICAgY29uc3Qge25hbWUsIGpzb24sIHNob3J0TmFtZX0gPSBwa2c7XG4gIC8vIHBhY2thZ2VVdGlscy5maW5kQWxsUGFja2FnZXMoXG4gIC8vIChuYW1lOiBzdHJpbmcsIGVudHJ5UGF0aDogc3RyaW5nLCBwYXJzZWROYW1lOiB7bmFtZTogc3RyaW5nLCBzY29wZTogc3RyaW5nfSwganNvbjogYW55LCBwYWNrYWdlUGF0aDogc3RyaW5nKSA9PiB7XG4gICAgY29uc3QgZHIgPSBwa2cuanNvbi5kcjtcbiAgICBpZiAoIWRyKVxuICAgICAgY29udGludWU7XG5cbiAgICAvLyBjb21wb25lbnQgY3VzdG9taXplZCBjb25maWd1cmF0aW9uIHByb3BlcnRpZXNcbiAgICBfYWRkdXBDb21wQ29uZmlnUHJvcChjb21wb25lbnRDb25maWdzLCBuYW1lLCBicm93c2VyU2lkZUNvbmZpZ1Byb3AsIGRyLmNvbmZpZyk7XG4gICAgXy5lYWNoKGRyLCAodmFsdWUsIGtleSkgPT4ge1xuICAgICAgY29uc3QgbSA9IC9eY29uZmlnXFwuKC4qKSQvLmV4ZWMoa2V5KTtcbiAgICAgIGlmICghbSlcbiAgICAgICAgcmV0dXJuO1xuICAgICAgY29uc3QgZW52ID0gbVsxXTtcbiAgICAgIGlmICghXy5oYXMoY29tcG9uZW50Q29uZmlnczRFbnYsIGVudikpXG4gICAgICAgIGNvbXBvbmVudENvbmZpZ3M0RW52W2Vudl0gPSB7YnJvd3NlclNpZGVDb25maWdQcm9wOiBbXX07XG4gICAgICBfYWRkdXBDb21wQ29uZmlnUHJvcChjb21wb25lbnRDb25maWdzNEVudltlbnZdLCBuYW1lLCBjb21wb25lbnRDb25maWdzNEVudltlbnZdLmJyb3dzZXJTaWRlQ29uZmlnUHJvcCwgdmFsdWUpO1xuICAgIH0pO1xuXG4gICAgLy8gb3V0cHV0UGF0aFxuICAgIHZhciBvdXRwdXRQYXRoID0gZHIub3V0cHV0UGF0aDtcbiAgICBpZiAob3V0cHV0UGF0aCA9PSBudWxsKVxuICAgICAgb3V0cHV0UGF0aCA9IGRyLm5nUm91dGVyUGF0aDtcbiAgICBpZiAob3V0cHV0UGF0aCA9PSBudWxsKVxuICAgICAgb3V0cHV0UGF0aCA9IF8uZ2V0KGpzb24sICdkci5vdXRwdXQucGF0aCcsIHNob3J0TmFtZSk7XG5cbiAgICBpZiAoXy5oYXModHJhY2tPdXRwdXRQYXRoLCBvdXRwdXRQYXRoKSAmJiB0cmFja091dHB1dFBhdGhbb3V0cHV0UGF0aF0gIT09IG5hbWUpIHtcbiAgICAgIGxvZy53YXJuKGNoYWxrLnllbGxvdygnW1dhcm5pbmddIENvbmZsaWN0IHBhY2thZ2UgbGV2ZWwgb3V0cHV0UGF0aCBzZXR0aW5nIChha2EgXCJuZ1JvdXRlclBhdGhcIiBpbiBwYWNrYWdlLmpzb24pIFwiJXNcIiBmb3IgYm90aCAlcyBhbmQgJXMsIHJlc29sdmUgY29uZmxpY3QgYnkgYWRkaW5nIGEgY29uZmlnIGZpbGUsJyksIG91dHB1dFBhdGgsIHRyYWNrT3V0cHV0UGF0aFtvdXRwdXRQYXRoXSwgbmFtZSk7XG4gICAgICBsb2cud2FybihjaGFsay55ZWxsb3coJyVzXFwncyBcIm91dHB1dFBhdGhcIiB3aWxsIGJlIGNoYW5nZWQgdG8gJXMnKSwgbmFtZSwgc2hvcnROYW1lKTtcbiAgICAgIG91dHB1dFBhdGggPSBzaG9ydE5hbWU7XG4gICAgfVxuICAgIHRyYWNrT3V0cHV0UGF0aFtvdXRwdXRQYXRoXSA9IG5hbWU7XG4gICAgY29tcG9uZW50Q29uZmlncy5vdXRwdXRQYXRoTWFwW25hbWVdID0gb3V0cHV0UGF0aDtcbiAgICAvLyBjaHVua3NcbiAgICB2YXIgY2h1bmsgPSBfLmhhcyhqc29uLCAnZHIuY2h1bmsnKSA/IGRyLmNodW5rIDogZHIuYnVuZGxlO1xuICAgIGlmICghY2h1bmspIHtcbiAgICAgIGlmICgoZHIuZW50cnlQYWdlIHx8IGRyLmVudHJ5VmlldykpXG4gICAgICAgIGNodW5rID0gc2hvcnROYW1lOyAvLyBFbnRyeSBwYWNrYWdlIHNob3VsZCBoYXZlIGEgZGVmYXVsdCBjaHVuayBuYW1lIGFzIGl0cyBwYWNrYWdlIHNob3J0IG5hbWVcbiAgICB9XG4gICAgaWYgKGNodW5rKSB7XG4gICAgICBpZiAoXy5oYXModmVuZG9yQnVuZGxlTWFwLCBjaHVuaykpXG4gICAgICAgIHZlbmRvckJ1bmRsZU1hcFtjaHVua10ucHVzaChuYW1lKTtcbiAgICAgIGVsc2VcbiAgICAgICAgdmVuZG9yQnVuZGxlTWFwW2NodW5rXSA9IFtuYW1lXTtcbiAgICB9XG4gIH1cblxuICBjb25zdCBzdXBlckNvbmZpZyA9IHJlcXVpcmUoJy4uLy4uL2NvbmZpZy55YW1sJyk7XG4gIGRlZXBseU1lcmdlSnNvbihzdXBlckNvbmZpZywgY29tcG9uZW50Q29uZmlncyk7XG4gIGlmIChvbkVhY2hZYW1sKSB7XG4gICAgb25FYWNoWWFtbCgnY29uZmlnLnlhbWwnLCBqc1lhbWwuc2FmZUR1bXAoc3VwZXJDb25maWcpKTtcbiAgfVxuICAvLyB2YXIgcmVzID0geydjb25maWcueWFtbCc6IGpzWWFtbC5zYWZlRHVtcChzdXBlckNvbmZpZyl9O1xuICBfLmVhY2goY29tcG9uZW50Q29uZmlnczRFbnYsIChjb25maWdzLCBlbnYpID0+IHtcbiAgICBjb25zdCB0bXBsRmlsZSA9IFBhdGguam9pbihfX2Rpcm5hbWUsICd0ZW1wbGF0ZXMnLCAnY29uZmlnLicgKyBlbnYgKyAnLXRlbXBsYXRlLnlhbWwnKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyh0bXBsRmlsZSkpIHtcbiAgICAgIGNvbmZpZ3MgPSBPYmplY3QuYXNzaWduKGpzWWFtbC5zYWZlTG9hZChmcy5yZWFkRmlsZVN5bmModG1wbEZpbGUsICd1dGY4JyksIHtmaWxlbmFtZTogdG1wbEZpbGV9KSwgY29uZmlncyk7XG4gICAgfVxuICAgIC8vIHJlc1snY29uZmlnLicgKyBlbnYgKyAnLnlhbWwnXSA9IGpzWWFtbC5zYWZlRHVtcChjb25maWdzKTtcbiAgICBpZiAob25FYWNoWWFtbCkge1xuICAgICAgb25FYWNoWWFtbCgnY29uZmlnLicgKyBlbnYgKyAnLnlhbWwnLCBqc1lhbWwuc2FmZUR1bXAoY29uZmlncykpO1xuICAgIH1cbiAgfSk7XG4gIC8vIGNsZWFuUGFja2FnZXNXYWxrZXJDYWNoZSgpO1xuICBjb25maWcucmVsb2FkKCk7XG4gIHJldHVybiBQcm9taXNlLnJlc29sdmUobnVsbCk7XG59XG5cbmZ1bmN0aW9uIF9hZGR1cENvbXBDb25maWdQcm9wKGNvbXBvbmVudENvbmZpZ3M6IHtbazogc3RyaW5nXTogYW55fSwgY29tcE5hbWU6IHN0cmluZywgYnJvd3NlclNpZGVDb25maWdQcm9wOiBzdHJpbmdbXSxcbiAgY29uZmlnSnNvbjoge3B1YmxpYzogYW55LCBzZXJ2ZXI6IGFueX0pIHtcbiAgaWYgKCFjb25maWdKc29uKVxuICAgIHJldHVybjtcbiAgLy8gY29tcG9uZW50IGN1c3RvbWl6ZWQgY29uZmlndXJhdGlvbiBwcm9wZXJ0aWVzXG5cbiAgLy8gSlNPTi5wYXJzZShKU09OLnN0cmluZ2lmeSgpKSBpcyB0byBjbG9uZSBvcmlnaW5hbCBvYmplY3Qgd2hpY2ggaXNcbiAgLy8gc3RvcmVkIGluIGEgcmVkdXggc3RvcmUgYXMgaW1tdXRhYmxlIHN0YXRlIChieSBpbW1lckpTKSxcbiAgLy8gSSB0cmllZCBsb2Rhc2ggY2xvbmUsIGJ1dCBpdCBzdGlsbCBrZWVwcyBcInJlYWQgb25seVwiIHByb3RlY3Rpb24gb24gb2JqZWN0LFxuICAvLyBzbyBJIGhhdmUgdG8gdXNlIEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoKSkgaW5zdGVhZFxuICBjb25zdCBjb21wb25lbnRDb25maWcgPSBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KGNvbmZpZ0pzb24ucHVibGljIHx8IHt9KSk7XG4gIGRlZXBseU1lcmdlSnNvbihjb21wb25lbnRDb25maWcsIEpTT04ucGFyc2UoSlNPTi5zdHJpbmdpZnkoY29uZmlnSnNvbi5zZXJ2ZXIpKSk7XG5cbiAgaWYgKF8uc2l6ZShjb21wb25lbnRDb25maWcpID4gMCApXG4gICAgY29tcG9uZW50Q29uZmlnc1tjb21wTmFtZV0gPSBjb21wb25lbnRDb25maWc7XG5cbiAgLy8gYnJvd3NlclNpZGVDb25maWdQcm9wXG4gIGJyb3dzZXJTaWRlQ29uZmlnUHJvcC5wdXNoKC4uLl8ubWFwKF8ua2V5cyhjb25maWdKc29uLnB1YmxpYyksIGtleSA9PiBjb21wTmFtZSArICcuJyArIGtleSkpO1xufVxuXG5mdW5jdGlvbiBkZWVwbHlNZXJnZUpzb24odGFyZ2V0OiB7W2tleTogc3RyaW5nXTogYW55fSwgc3JjOiBhbnksXG4gIGN1c3RvbWl6ZXI/OiAodFZhbHVlOiBhbnksIHNWYWx1ZTogYW55LCBrZXk6IHN0cmluZykgPT4gYW55KSB7XG4gIGZvciAoY29uc3QgW2tleSwgc1ZhbHVlXSBvZiBPYmplY3QuZW50cmllcyhzcmMpKSB7XG4gICAgY29uc3QgdFZhbHVlID0gdGFyZ2V0W2tleV07XG4gICAgY29uc3QgYyA9IGN1c3RvbWl6ZXIgPyBjdXN0b21pemVyKHRWYWx1ZSwgc1ZhbHVlLCBrZXkpIDogdW5kZWZpbmVkO1xuICAgIGlmIChjICE9PSB1bmRlZmluZWQpXG4gICAgICB0YXJnZXRba2V5XSA9IGM7XG4gICAgZWxzZSBpZiAoQXJyYXkuaXNBcnJheSh0VmFsdWUpICYmIEFycmF5LmlzQXJyYXkoc1ZhbHVlKSlcbiAgICAgIHRhcmdldFtrZXldID0gXy51bmlvbih0VmFsdWUsIHNWYWx1ZSk7XG4gICAgZWxzZSBpZiAoXy5pc09iamVjdCh0VmFsdWUpICYmIF8uaXNPYmplY3Qoc1ZhbHVlKSkge1xuICAgICAgZGVlcGx5TWVyZ2VKc29uKHRWYWx1ZSwgc1ZhbHVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGFyZ2V0W2tleV0gPSBzVmFsdWU7XG4gICAgfVxuICB9XG59XG4iXX0=