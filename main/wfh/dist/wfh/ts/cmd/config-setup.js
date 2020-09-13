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
    lodash_1.default.each(src, (sValue, key) => {
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
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLXNldHVwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vdHMvY21kL2NvbmZpZy1zZXR1cC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsa0RBQTBCO0FBQzFCLG9EQUE0QjtBQUM1QixvREFBdUI7QUFDdkIsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QiwrREFBaUQ7QUFDakQsdURBQStCO0FBQy9CLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNsQyxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDO0FBR2hELFNBQWdCLFlBQVksQ0FBQyxVQUF5RDtJQUNwRixNQUFNLGdCQUFnQixHQUFHLEVBQUMsYUFBYSxFQUFFLEVBQUUsRUFBRSxlQUFlLEVBQUUsRUFBRSxFQUFFLHFCQUFxQixFQUFFLEVBQUUsRUFBQyxDQUFDO0lBQzdGLE1BQU0sZUFBZSxHQUFHLGdCQUFnQixDQUFDLGVBQWUsQ0FBQztJQUN6RCxNQUFNLHFCQUFxQixHQUFHLGdCQUFnQixDQUFDLHFCQUFxQixDQUFDO0lBQ3JFLDREQUE0RDtJQUM1RCxNQUFNLG9CQUFvQixHQUFHLEVBQUUsQ0FBQyxDQUFDLCtDQUErQztJQUNoRixNQUFNLGVBQWUsR0FBRyxFQUFFLENBQUMsQ0FBQyx3QkFBd0I7SUFDcEQsWUFBWSxDQUFDLGVBQWUsQ0FDNUIsQ0FBQyxJQUFZLEVBQUUsU0FBaUIsRUFBRSxVQUF5QyxFQUFFLElBQVMsRUFBRSxXQUFtQixFQUFFLEVBQUU7UUFDN0csTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEVBQUUsQ0FBQztRQUNuQixJQUFJLENBQUMsRUFBRTtZQUNMLE9BQU87UUFFVCxnREFBZ0Q7UUFDaEQsb0JBQW9CLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLHFCQUFxQixFQUFFLEVBQUUsQ0FBQyxNQUFN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QyxDQUFDLENBQUM7QUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBwYWNrYWdlVXRpbHMgZnJvbSAnLi4vcGFja2FnZS11dGlscyc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4uL2NvbmZpZyc7XG5jb25zdCBqc1lhbWwgPSByZXF1aXJlKCdqcy15YW1sJyk7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCd3ZmguY2xpQWR2YW5jZWQnKTtcblxuXG5leHBvcnQgZnVuY3Rpb24gYWRkdXBDb25maWdzKG9uRWFjaFlhbWw6IChmaWxlOiBzdHJpbmcsIGNvbmZpZ0NvbnRlbnQ6IHN0cmluZykgPT4gdm9pZCkge1xuICBjb25zdCBjb21wb25lbnRDb25maWdzID0ge291dHB1dFBhdGhNYXA6IHt9LCB2ZW5kb3JCdW5kbGVNYXA6IHt9LCBicm93c2VyU2lkZUNvbmZpZ1Byb3A6IFtdfTtcbiAgY29uc3QgdmVuZG9yQnVuZGxlTWFwID0gY29tcG9uZW50Q29uZmlncy52ZW5kb3JCdW5kbGVNYXA7XG4gIGNvbnN0IGJyb3dzZXJTaWRlQ29uZmlnUHJvcCA9IGNvbXBvbmVudENvbmZpZ3MuYnJvd3NlclNpZGVDb25maWdQcm9wO1xuICAvLyB2YXIgZW50cnlQYWdlTWFwcGluZyA9IGNvbXBvbmVudENvbmZpZ3MuZW50cnlQYWdlTWFwcGluZztcbiAgY29uc3QgY29tcG9uZW50Q29uZmlnczRFbnYgPSB7fTsgLy8ga2V5IGlzIGVudjpzdHJpbmcsIHZhbHVlIGlzIGNvbXBvbmVudENvbmZpZ3NcbiAgY29uc3QgdHJhY2tPdXRwdXRQYXRoID0ge307IC8vIEZvciBjaGVja2luZyBjb25mbGljdFxuICBwYWNrYWdlVXRpbHMuZmluZEFsbFBhY2thZ2VzKFxuICAobmFtZTogc3RyaW5nLCBlbnRyeVBhdGg6IHN0cmluZywgcGFyc2VkTmFtZToge25hbWU6IHN0cmluZywgc2NvcGU6IHN0cmluZ30sIGpzb246IGFueSwgcGFja2FnZVBhdGg6IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IGRyID0ganNvbi5kcjtcbiAgICBpZiAoIWRyKVxuICAgICAgcmV0dXJuO1xuXG4gICAgLy8gY29tcG9uZW50IGN1c3RvbWl6ZWQgY29uZmlndXJhdGlvbiBwcm9wZXJ0aWVzXG4gICAgX2FkZHVwQ29tcENvbmZpZ1Byb3AoY29tcG9uZW50Q29uZmlncywgbmFtZSwgYnJvd3NlclNpZGVDb25maWdQcm9wLCBkci5jb25maWcpO1xuICAgIF8uZWFjaChkciwgKHZhbHVlLCBrZXkpID0+IHtcbiAgICAgIGNvbnN0IG0gPSAvXmNvbmZpZ1xcLiguKikkLy5leGVjKGtleSk7XG4gICAgICBpZiAoIW0pXG4gICAgICAgIHJldHVybjtcbiAgICAgIGNvbnN0IGVudiA9IG1bMV07XG4gICAgICBpZiAoIV8uaGFzKGNvbXBvbmVudENvbmZpZ3M0RW52LCBlbnYpKVxuICAgICAgICBjb21wb25lbnRDb25maWdzNEVudltlbnZdID0ge2Jyb3dzZXJTaWRlQ29uZmlnUHJvcDogW119O1xuICAgICAgX2FkZHVwQ29tcENvbmZpZ1Byb3AoY29tcG9uZW50Q29uZmlnczRFbnZbZW52XSwgbmFtZSwgY29tcG9uZW50Q29uZmlnczRFbnZbZW52XS5icm93c2VyU2lkZUNvbmZpZ1Byb3AsIHZhbHVlKTtcbiAgICB9KTtcblxuICAgIC8vIG91dHB1dFBhdGhcbiAgICB2YXIgb3V0cHV0UGF0aCA9IGRyLm91dHB1dFBhdGg7XG4gICAgaWYgKG91dHB1dFBhdGggPT0gbnVsbClcbiAgICAgIG91dHB1dFBhdGggPSBkci5uZ1JvdXRlclBhdGg7XG4gICAgaWYgKG91dHB1dFBhdGggPT0gbnVsbClcbiAgICAgIG91dHB1dFBhdGggPSBfLmdldChqc29uLCAnZHIub3V0cHV0LnBhdGgnLCBwYXJzZWROYW1lLm5hbWUpO1xuXG4gICAgaWYgKF8uaGFzKHRyYWNrT3V0cHV0UGF0aCwgb3V0cHV0UGF0aCkgJiYgdHJhY2tPdXRwdXRQYXRoW291dHB1dFBhdGhdICE9PSBuYW1lKSB7XG4gICAgICBsb2cud2FybihjaGFsay55ZWxsb3coJ1tXYXJuaW5nXSBDb25mbGljdCBwYWNrYWdlIGxldmVsIG91dHB1dFBhdGggc2V0dGluZyAoYWthIFwibmdSb3V0ZXJQYXRoXCIgaW4gcGFja2FnZS5qc29uKSBcIiVzXCIgZm9yIGJvdGggJXMgYW5kICVzLCByZXNvbHZlIGNvbmZsaWN0IGJ5IGFkZGluZyBhIGNvbmZpZyBmaWxlLCcpLCBvdXRwdXRQYXRoLCB0cmFja091dHB1dFBhdGhbb3V0cHV0UGF0aF0sIG5hbWUpO1xuICAgICAgbG9nLndhcm4oY2hhbGsueWVsbG93KCclc1xcJ3MgXCJvdXRwdXRQYXRoXCIgd2lsbCBiZSBjaGFuZ2VkIHRvICVzJyksIG5hbWUsIHBhcnNlZE5hbWUubmFtZSk7XG4gICAgICBvdXRwdXRQYXRoID0gcGFyc2VkTmFtZS5uYW1lO1xuICAgIH1cbiAgICB0cmFja091dHB1dFBhdGhbb3V0cHV0UGF0aF0gPSBuYW1lO1xuICAgIGNvbXBvbmVudENvbmZpZ3Mub3V0cHV0UGF0aE1hcFtuYW1lXSA9IG91dHB1dFBhdGg7XG4gICAgLy8gY2h1bmtzXG4gICAgdmFyIGNodW5rID0gXy5oYXMoanNvbiwgJ2RyLmNodW5rJykgPyBkci5jaHVuayA6IGRyLmJ1bmRsZTtcbiAgICBpZiAoIWNodW5rKSB7XG4gICAgICBpZiAoKGRyLmVudHJ5UGFnZSB8fCBkci5lbnRyeVZpZXcpKVxuICAgICAgICBjaHVuayA9IHBhcnNlZE5hbWUubmFtZTsgLy8gRW50cnkgcGFja2FnZSBzaG91bGQgaGF2ZSBhIGRlZmF1bHQgY2h1bmsgbmFtZSBhcyBpdHMgcGFja2FnZSBzaG9ydCBuYW1lXG4gICAgfVxuICAgIGlmIChjaHVuaykge1xuICAgICAgaWYgKF8uaGFzKHZlbmRvckJ1bmRsZU1hcCwgY2h1bmspKVxuICAgICAgICB2ZW5kb3JCdW5kbGVNYXBbY2h1bmtdLnB1c2gobmFtZSk7XG4gICAgICBlbHNlXG4gICAgICAgIHZlbmRvckJ1bmRsZU1hcFtjaHVua10gPSBbbmFtZV07XG4gICAgfVxuICB9KTtcblxuICBjb25zdCBzdXBlckNvbmZpZyA9IHJlcXVpcmUoJy4uLy4uL2NvbmZpZy55YW1sJyk7XG4gIGRlZXBseU1lcmdlSnNvbihzdXBlckNvbmZpZywgY29tcG9uZW50Q29uZmlncyk7XG4gIGlmIChvbkVhY2hZYW1sKSB7XG4gICAgb25FYWNoWWFtbCgnY29uZmlnLnlhbWwnLCBqc1lhbWwuc2FmZUR1bXAoc3VwZXJDb25maWcpKTtcbiAgfVxuICAvLyB2YXIgcmVzID0geydjb25maWcueWFtbCc6IGpzWWFtbC5zYWZlRHVtcChzdXBlckNvbmZpZyl9O1xuICBfLmVhY2goY29tcG9uZW50Q29uZmlnczRFbnYsIChjb25maWdzLCBlbnYpID0+IHtcbiAgICBjb25zdCB0bXBsRmlsZSA9IFBhdGguam9pbihfX2Rpcm5hbWUsICd0ZW1wbGF0ZXMnLCAnY29uZmlnLicgKyBlbnYgKyAnLXRlbXBsYXRlLnlhbWwnKTtcbiAgICBpZiAoZnMuZXhpc3RzU3luYyh0bXBsRmlsZSkpIHtcbiAgICAgIGNvbmZpZ3MgPSBPYmplY3QuYXNzaWduKGpzWWFtbC5zYWZlTG9hZChmcy5yZWFkRmlsZVN5bmModG1wbEZpbGUsICd1dGY4JyksIHtmaWxlbmFtZTogdG1wbEZpbGV9KSwgY29uZmlncyk7XG4gICAgfVxuICAgIC8vIHJlc1snY29uZmlnLicgKyBlbnYgKyAnLnlhbWwnXSA9IGpzWWFtbC5zYWZlRHVtcChjb25maWdzKTtcbiAgICBpZiAob25FYWNoWWFtbCkge1xuICAgICAgb25FYWNoWWFtbCgnY29uZmlnLicgKyBlbnYgKyAnLnlhbWwnLCBqc1lhbWwuc2FmZUR1bXAoY29uZmlncykpO1xuICAgIH1cbiAgfSk7XG4gIC8vIGNsZWFuUGFja2FnZXNXYWxrZXJDYWNoZSgpO1xuICBjb25maWcucmVsb2FkKCk7XG4gIHJldHVybiBQcm9taXNlLnJlc29sdmUobnVsbCk7XG59XG5cbmZ1bmN0aW9uIF9hZGR1cENvbXBDb25maWdQcm9wKGNvbXBvbmVudENvbmZpZ3M6IHtbazogc3RyaW5nXTogYW55fSwgY29tcE5hbWU6IHN0cmluZywgYnJvd3NlclNpZGVDb25maWdQcm9wOiBzdHJpbmdbXSxcbiAgY29uZmlnSnNvbjoge3B1YmxpYzogYW55LCBzZXJ2ZXI6IGFueX0pIHtcbiAgaWYgKCFjb25maWdKc29uKVxuICAgIHJldHVybjtcbiAgLy8gY29tcG9uZW50IGN1c3RvbWl6ZWQgY29uZmlndXJhdGlvbiBwcm9wZXJ0aWVzXG4gIGNvbnN0IGNvbXBvbmVudENvbmZpZyA9IF8uYXNzaWduKHt9LCBjb25maWdKc29uLnB1YmxpYyk7XG4gIGRlZXBseU1lcmdlSnNvbihjb21wb25lbnRDb25maWcsIGNvbmZpZ0pzb24uc2VydmVyKTtcblxuICBpZiAoXy5zaXplKGNvbXBvbmVudENvbmZpZykgPiAwIClcbiAgICBjb21wb25lbnRDb25maWdzW2NvbXBOYW1lXSA9IGNvbXBvbmVudENvbmZpZztcblxuICAvLyBicm93c2VyU2lkZUNvbmZpZ1Byb3BcbiAgYnJvd3NlclNpZGVDb25maWdQcm9wLnB1c2goLi4uXy5tYXAoXy5rZXlzKGNvbmZpZ0pzb24ucHVibGljKSwga2V5ID0+IGNvbXBOYW1lICsgJy4nICsga2V5KSk7XG59XG5cbmZ1bmN0aW9uIGRlZXBseU1lcmdlSnNvbih0YXJnZXQ6IHtba2V5OiBzdHJpbmddOiBhbnl9LCBzcmM6IGFueSxcbiAgY3VzdG9taXplcj86ICh0VmFsdWU6IGFueSwgc1ZhbHVlOiBhbnksIGtleTogc3RyaW5nKSA9PiBhbnkpIHtcbiAgXy5lYWNoKHNyYywgKHNWYWx1ZSwga2V5KSA9PiB7XG4gICAgY29uc3QgdFZhbHVlID0gdGFyZ2V0W2tleV07XG4gICAgY29uc3QgYyA9IGN1c3RvbWl6ZXIgPyBjdXN0b21pemVyKHRWYWx1ZSwgc1ZhbHVlLCBrZXkpIDogdW5kZWZpbmVkO1xuICAgIGlmIChjICE9PSB1bmRlZmluZWQpXG4gICAgICB0YXJnZXRba2V5XSA9IGM7XG4gICAgZWxzZSBpZiAoQXJyYXkuaXNBcnJheSh0VmFsdWUpICYmIEFycmF5LmlzQXJyYXkoc1ZhbHVlKSlcbiAgICAgIHRhcmdldFtrZXldID0gXy51bmlvbih0VmFsdWUsIHNWYWx1ZSk7XG4gICAgZWxzZSBpZiAoXy5pc09iamVjdCh0VmFsdWUpICYmIF8uaXNPYmplY3Qoc1ZhbHVlKSlcbiAgICAgIGRlZXBseU1lcmdlSnNvbih0VmFsdWUsIHNWYWx1ZSk7XG4gICAgZWxzZVxuICAgICAgdGFyZ2V0W2tleV0gPSBzVmFsdWU7XG4gIH0pO1xufVxuIl19