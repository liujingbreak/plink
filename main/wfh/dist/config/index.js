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
exports.getPackageSettingFiles = exports.configHandlerMgr$ = void 0;
/* eslint-disable prefer-const, max-len */
const lodash_1 = __importDefault(require("lodash"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const config_handler_1 = require("../config-handler");
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const log4js_1 = __importDefault(require("log4js"));
const config_slice_1 = require("./config-slice");
const misc_1 = require("../utils/misc");
// const yamljs = require('yamljs');
const yamljs_1 = __importDefault(require("yamljs"));
require('yamlify/register');
const log = log4js_1.default.getLogger('plink.config');
const { rootDir } = misc_1.plinkEnv;
let rootPath = rootDir;
exports.configHandlerMgr$ = new rx.BehaviorSubject(undefined);
/**
 * read and return configuration
 * @name config
 * @return {object} setting
 */
const config = () => {
    return (0, config_slice_1.getState)();
};
config.initSync = (argv) => {
    config_slice_1.dispatcher.saveCliOption(argv);
    // For child process, worker thread to access cli options
    process.env.PLINK_CLI_OPTS = JSON.stringify(argv);
    load(argv);
    return (0, config_slice_1.getState)();
};
config.reload = function reload() {
    const argv = (0, config_slice_1.getState)().cliOptions;
    load(argv);
    return (0, config_slice_1.getState)();
};
config.set = function (path, value) {
    config_slice_1.dispatcher._change(setting => {
        lodash_1.default.set(setting, path, value);
    });
    return (0, config_slice_1.getState)();
};
config.get = function (propPath, defaultValue) {
    return lodash_1.default.get((0, config_slice_1.getState)(), propPath, defaultValue);
};
/**
 * Resolve a path based on `rootPath`
 * @name resolve
 * @memberof config
 * @param  {string} property name or property path, like "name", "name.childProp[1]"
 * @return {string}     absolute path
 */
config.resolve = function (pathPropName, ...paths) {
    const args = [rootPath, (0, config_slice_1.getState)()[pathPropName], ...paths];
    return path_1.default.resolve(...args);
};
// config.configureStore = configureStore;
config.configHandlerMgr = exports.configHandlerMgr$;
config.configHandlerMgrChanged = function (cb) {
    exports.configHandlerMgr$.pipe(op.distinctUntilChanged(), op.filter(handler => handler != null), op.tap(handler => cb(handler))).subscribe();
};
config.change = function (reducer) {
    return config_slice_1.dispatcher._change(reducer);
};
config.getStore = config_slice_1.getStore;
// config.configHandlerMgrCreated = function(cb: (handler: ConfigHandlerMgr) => Promise<any> | void): Promise<void> {
//   return configHandlerMgr$.pipe(
//     op.distinctUntilChanged(),
//     op.filter(handler => handler != null),
//     op.concatMap(handler => Promise.resolve(cb(handler!))),
//     op.take(1)
//   ).toPromise();
// };
function load(cliOption) {
    const pkgSettingFiles = loadPackageSettings();
    const configFileList = cliOption.config || [];
    configFileList.forEach(localConfigPath => mergeFromYamlJsonFile(localConfigPath));
    const handlers = new config_handler_1.ConfigHandlerMgr(configFileList.filter(name => /\.[tj]s$/.test(name))
        .map(item => [path_1.default.resolve(item), 'default'])
        .concat(pkgSettingFiles));
    exports.configHandlerMgr$.next(handlers);
    config_slice_1.dispatcher._change(draft => {
        handlers.runEachSync((_file, obj, handler) => {
            if (handler.onConfig) {
                return handler.onConfig(draft, draft.cliOptions);
            }
        });
    });
    validateConfig();
    config_slice_1.dispatcher._change(s => {
        s.port = normalizePort(s.port);
    });
    mergeFromCliArgs((0, config_slice_1.getState)().cliOptions);
}
function mergeFromYamlJsonFile(localConfigPath) {
    if (!fs_1.default.existsSync(localConfigPath)) {
        // eslint-disable-next-line no-console
        log.info(chalk_1.default.yellow(' File does not exist: %s', localConfigPath));
        return;
    }
    // eslint-disable-next-line no-console
    log.info(` Read ${localConfigPath}`);
    var configObj;
    const matched = /\.([^.]+)$/.exec(localConfigPath);
    let suffix = matched ? matched[1] : null;
    if (suffix === 'yaml' || suffix === 'yml') {
        configObj = yamljs_1.default.parse(fs_1.default.readFileSync(localConfigPath, 'utf8'));
    }
    else if (suffix === 'json') {
        configObj = require(path_1.default.resolve(localConfigPath));
    }
    else {
        return;
    }
    config_slice_1.dispatcher._change(setting => {
        lodash_1.default.assignWith(setting, configObj, (objValue, srcValue, key, object, source) => {
            if (lodash_1.default.isObject(objValue) && !Array.isArray(objValue)) {
                // We only merge 1st and 2nd level properties
                return lodash_1.default.assign(objValue, srcValue);
            }
        });
    });
}
function mergeFromCliArgs(cliOpt) {
    if (!cliOpt.prop)
        return;
    for (let propPair of cliOpt.prop) {
        const propSet = propPair.split('=');
        let propPath = propSet[0];
        if (lodash_1.default.startsWith(propSet[0], '['))
            propPath = JSON.parse(propSet[0]);
        let value;
        try {
            value = JSON.parse(propSet[1]);
        }
        catch (e) {
            value = propSet[1] === 'undefined' ? undefined : propSet[1];
        }
        config_slice_1.dispatcher._change(s => lodash_1.default.set(s, propPath, value));
        // eslint-disable-next-line no-console
        log.info(`[config] set ${propPath} = ${value}`);
    }
}
function validateConfig() {
    // TODO: json schema validation
}
// function trimTailSlash(url: string) {
//   if (url === '/') {
//     return url;
//   }
//   return _.endsWith(url, '/') ? url.substring(0, url.length - 1) : url;
// }
function normalizePort(val) {
    let port = typeof val === 'string' ? parseInt(val, 10) : val;
    if (isNaN(port)) {
        // named pipe
        return val;
    }
    if (port >= 0) {
        // port number
        return port;
    }
    return 8080;
}
/**
 * @returns [defaultValueFile, exportName, dtsFile]
 */
function* getPackageSettingFiles(workspaceKey, includePkg) {
    const { packages4WorkspaceKey } = require('../package-mgr/package-list-helper');
    for (const pkg of packages4WorkspaceKey(workspaceKey, true)) {
        if (includePkg && !includePkg.has(pkg.name))
            continue;
        try {
            const dr = pkg.json.dr || pkg.json.plink;
            if (dr == null || typeof dr.setting !== 'object') {
                continue;
            }
            const setting = dr.setting;
            log.debug('getPackageSettingFiles', pkg.name, setting);
            let [valueFile, valueExport] = setting.value.split('#', 2);
            // Check value file
            const ext = path_1.default.extname(valueFile);
            if (ext === '') {
                valueFile = valueFile + '.js';
            }
            if (valueExport == null)
                valueExport = 'default';
            const absFile = path_1.default.resolve(pkg.realPath, valueFile);
            if (!fs_1.default.existsSync(absFile)) {
                log.warn(`Package ${pkg.name}'s configure file "${absFile}" does not exist, skipped.`);
                continue;
            }
            // Check dts type file
            let [typeFile, typeExportName] = setting.type.split('#', 2);
            let typeFileExt = path_1.default.extname(typeFile);
            if (typeFileExt === '') {
                typeFile += '.dts';
            }
            const absTypeFile = path_1.default.resolve(pkg.realPath, typeFileExt);
            if (!fs_1.default.existsSync(absTypeFile)) {
                log.warn(`Package setting ${pkg.name}'s dts file "${absTypeFile}" does not exist, skipped.`);
                continue;
            }
            if (typeExportName == null) {
                log.error(`Incorrect package config property format "${setting.type}" in ${pkg.realPath + path_1.default.sep}package.json` +
                    ', correct format is "<dts-file-relative-path>#<TS-type-export-name>"');
                continue;
            }
            yield [typeFile.replace(/\.[^./\\]+$/g, ''), typeExportName, valueFile, valueExport, pkg];
        }
        catch (err) {
            log.warn(`Skip loading setting of package ${pkg.name}, due to (this might be caused by incorrect package.json format)`, err);
        }
    }
}
exports.getPackageSettingFiles = getPackageSettingFiles;
/**
 * @returns absulte path of setting JS files which contains exports named with "default"
 */
function loadPackageSettings() {
    const { workspaceKey, isCwdWorkspace } = require('../package-mgr');
    if (!isCwdWorkspace()) {
        log.debug('Not in a workspace, skip loading package settings');
        return [];
    }
    const jsFiles = [];
    for (const [_typeFile, _typeExport, jsFile, defaultSettingExport, pkg] of getPackageSettingFiles(workspaceKey(misc_1.plinkEnv.workDir))) {
        try {
            const absFile = path_1.default.resolve(misc_1.plinkEnv.workDir, pkg.path, jsFile);
            const exps = require(absFile);
            const defaultSettingFactory = exps[defaultSettingExport];
            if (typeof defaultSettingFactory === 'function') {
                const value = defaultSettingFactory((0, config_slice_1.getState)().cliOptions);
                config_slice_1.dispatcher._change(s => s[pkg.name] = value);
            }
            else {
                log.warn(`Failed to load package setting from ${pkg.name}/${jsFile}.\n Export name "${defaultSettingExport}" is not found`);
            }
            if (defaultSettingFactory != null) {
                jsFiles.push([absFile, defaultSettingExport]);
            }
        }
        catch (err) {
            log.error(`Failed to load package setting from ${pkg.name}/${jsFile}.'${defaultSettingExport}`, err);
        }
    }
    return jsFiles;
}
exports.default = config;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jb25maWcvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDBDQUEwQztBQUMxQyxvREFBdUI7QUFDdkIsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QixrREFBMEI7QUFDMUIsc0RBQThFO0FBRTlFLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMsb0RBQTRCO0FBQzVCLGlEQUE2RTtBQUk3RSx3Q0FBdUM7QUFFdkMsb0NBQW9DO0FBQ3BDLG9EQUE0QjtBQUM1QixPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUU1QixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUM3QyxNQUFNLEVBQUMsT0FBTyxFQUFDLEdBQUcsZUFBUSxDQUFDO0FBRTNCLElBQUksUUFBUSxHQUFHLE9BQU8sQ0FBQztBQUVWLFFBQUEsaUJBQWlCLEdBQUcsSUFBSSxFQUFFLENBQUMsZUFBZSxDQUErQixTQUFTLENBQUMsQ0FBQztBQUVqRzs7OztHQUlHO0FBQ0gsTUFBTSxNQUFNLEdBQUcsR0FBa0IsRUFBRTtJQUNqQyxPQUFPLElBQUEsdUJBQVEsR0FBRSxDQUFDO0FBQ3BCLENBQUMsQ0FBQztBQUVGLE1BQU0sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxJQUFnQixFQUFFLEVBQUU7SUFDckMseUJBQVUsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDL0IseURBQXlEO0lBQ3pELE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEQsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ1gsT0FBTyxJQUFBLHVCQUFRLEdBQUUsQ0FBQztBQUNwQixDQUFDLENBQUM7QUFHRixNQUFNLENBQUMsTUFBTSxHQUFHLFNBQVMs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QkFBb0Isb0JBQW9CLGdCQUFnQixDQUFDLENBQUM7YUFDN0g7WUFDRCxJQUFJLHFCQUFxQixJQUFJLElBQUksRUFBRTtnQkFDakMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRSxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7YUFDL0M7U0FDRjtRQUFDLE9BQU8sR0FBRyxFQUFFO1lBQ1osR0FBRyxDQUFDLEtBQUssQ0FBQyx1Q0FBdUMsR0FBRyxDQUFDLElBQUksSUFBSSxNQUFNLEtBQUssb0JBQW9CLEVBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztTQUN0RztLQUNGO0lBQ0QsT0FBTyxPQUFPLENBQUM7QUFDakIsQ0FBQztBQUNELGtCQUFnQixNQUFxQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgcHJlZmVyLWNvbnN0LCBtYXgtbGVuICovXG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7Q29uZmlnSGFuZGxlck1nciwgRHJjcENvbmZpZywgQ29uZmlnSGFuZGxlcn0gZnJvbSAnLi4vY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IHtHbG9iYWxPcHRpb25zIGFzIENsaU9wdGlvbnN9IGZyb20gJy4uL2NtZC90eXBlcyc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7ZGlzcGF0Y2hlciwgZ2V0U3RhdGUsIFBsaW5rU2V0dGluZ3MsIGdldFN0b3JlfSBmcm9tICcuL2NvbmZpZy1zbGljZSc7XG4vLyBSZWZhY3RvcjogY2lyY3VsYXIgcmVmZXJlbmNlXG5pbXBvcnQgKiBhcyBfcGtnTGlzdCBmcm9tICcuLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCAqIGFzIF9wa2dNZ3IgZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHtwbGlua0Vudn0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5pbXBvcnQge1BhY2thZ2VTZXR0aW5nSW50ZXJmfSBmcm9tICcuL2NvbmZpZy50eXBlcyc7XG4vLyBjb25zdCB5YW1sanMgPSByZXF1aXJlKCd5YW1sanMnKTtcbmltcG9ydCB5YW1sanMgZnJvbSAneWFtbGpzJztcbnJlcXVpcmUoJ3lhbWxpZnkvcmVnaXN0ZXInKTtcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuY29uZmlnJyk7XG5jb25zdCB7cm9vdERpcn0gPSBwbGlua0VudjtcblxubGV0IHJvb3RQYXRoID0gcm9vdERpcjtcblxuZXhwb3J0IGNvbnN0IGNvbmZpZ0hhbmRsZXJNZ3IkID0gbmV3IHJ4LkJlaGF2aW9yU3ViamVjdDxDb25maWdIYW5kbGVyTWdyIHwgdW5kZWZpbmVkPih1bmRlZmluZWQpO1xuXG4vKipcbiAqIHJlYWQgYW5kIHJldHVybiBjb25maWd1cmF0aW9uXG4gKiBAbmFtZSBjb25maWdcbiAqIEByZXR1cm4ge29iamVjdH0gc2V0dGluZ1xuICovXG5jb25zdCBjb25maWcgPSAoKTogUGxpbmtTZXR0aW5ncyA9PiB7XG4gIHJldHVybiBnZXRTdGF0ZSgpO1xufTtcblxuY29uZmlnLmluaXRTeW5jID0gKGFyZ3Y6IENsaU9wdGlvbnMpID0+IHtcbiAgZGlzcGF0Y2hlci5zYXZlQ2xpT3B0aW9uKGFyZ3YpO1xuICAvLyBGb3IgY2hpbGQgcHJvY2Vzcywgd29ya2VyIHRocmVhZCB0byBhY2Nlc3MgY2xpIG9wdGlvbnNcbiAgcHJvY2Vzcy5lbnYuUExJTktfQ0xJX09QVFMgPSBKU09OLnN0cmluZ2lmeShhcmd2KTtcbiAgbG9hZChhcmd2KTtcbiAgcmV0dXJuIGdldFN0YXRlKCk7XG59O1xuXG5cbmNvbmZpZy5yZWxvYWQgPSBmdW5jdGlvbiByZWxvYWQoKSB7XG4gIGNvbnN0IGFyZ3YgPSBnZXRTdGF0ZSgpLmNsaU9wdGlvbnMhO1xuICBsb2FkKGFyZ3YpO1xuICByZXR1cm4gZ2V0U3RhdGUoKTtcbn07XG5cbmNvbmZpZy5zZXQgPSBmdW5jdGlvbihwYXRoOiBzdHJpbmcsIHZhbHVlOiBhbnkpIHtcbiAgZGlzcGF0Y2hlci5fY2hhbmdlKHNldHRpbmcgPT4ge1xuICAgIF8uc2V0KHNldHRpbmcsIHBhdGgsIHZhbHVlKTtcbiAgfSk7XG4gIHJldHVybiBnZXRTdGF0ZSgpO1xufTtcblxuY29uZmlnLmdldCA9IGZ1bmN0aW9uKHByb3BQYXRoOiBzdHJpbmcsIGRlZmF1bHRWYWx1ZTogYW55KSB7XG4gIHJldHVybiBfLmdldChnZXRTdGF0ZSgpLCBwcm9wUGF0aCwgZGVmYXVsdFZhbHVlKTtcbn07XG5cblxuLyoqXG4gKiBSZXNvbHZlIGEgcGF0aCBiYXNlZCBvbiBgcm9vdFBhdGhgXG4gKiBAbmFtZSByZXNvbHZlXG4gKiBAbWVtYmVyb2YgY29uZmlnXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHByb3BlcnR5IG5hbWUgb3IgcHJvcGVydHkgcGF0aCwgbGlrZSBcIm5hbWVcIiwgXCJuYW1lLmNoaWxkUHJvcFsxXVwiXG4gKiBAcmV0dXJuIHtzdHJpbmd9ICAgICBhYnNvbHV0ZSBwYXRoXG4gKi9cbmNvbmZpZy5yZXNvbHZlID0gZnVuY3Rpb24ocGF0aFByb3BOYW1lOiAncm9vdFBhdGgnIHwgJ2Rlc3REaXInIHwgJ3N0YXRpY0RpcicgfCAnc2VydmVyRGlyJywgLi4ucGF0aHM6IHN0cmluZ1tdKSB7XG4gIGNvbnN0IGFyZ3M6IHN0cmluZ1tdID0gW3Jvb3RQYXRoLCBnZXRTdGF0ZSgpW3BhdGhQcm9wTmFtZV0sIC4uLnBhdGhzXTtcbiAgcmV0dXJuIFBhdGgucmVzb2x2ZSguLi5hcmdzKTtcbn07XG5cbi8vIGNvbmZpZy5jb25maWd1cmVTdG9yZSA9IGNvbmZpZ3VyZVN0b3JlO1xuXG5jb25maWcuY29uZmlnSGFuZGxlck1nciA9IGNvbmZpZ0hhbmRsZXJNZ3IkO1xuXG5jb25maWcuY29uZmlnSGFuZGxlck1nckNoYW5nZWQgPSBmdW5jdGlvbihjYjogKGhhbmRsZXI6IENvbmZpZ0hhbmRsZXJNZ3IpID0+IHZvaWQpIHtcbiAgY29uZmlnSGFuZGxlck1nciQucGlwZShcbiAgICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIG9wLmZpbHRlcihoYW5kbGVyID0+IGhhbmRsZXIgIT0gbnVsbCksXG4gICAgb3AudGFwKGhhbmRsZXIgPT4gY2IoaGFuZGxlciEpKVxuICApLnN1YnNjcmliZSgpO1xufTtcblxuY29uZmlnLmNoYW5nZSA9IGZ1bmN0aW9uKHJlZHVjZXI6IChzZXR0aW5nOiBQbGlua1NldHRpbmdzKSA9PiB2b2lkICkge1xuICByZXR1cm4gZGlzcGF0Y2hlci5fY2hhbmdlKHJlZHVjZXIpO1xufTtcblxuY29uZmlnLmdldFN0b3JlID0gZ2V0U3RvcmU7XG5cbi8vIGNvbmZpZy5jb25maWdIYW5kbGVyTWdyQ3JlYXRlZCA9IGZ1bmN0aW9uKGNiOiAoaGFuZGxlcjogQ29uZmlnSGFuZGxlck1ncikgPT4gUHJvbWlzZTxhbnk+IHwgdm9pZCk6IFByb21pc2U8dm9pZD4ge1xuLy8gICByZXR1cm4gY29uZmlnSGFuZGxlck1nciQucGlwZShcbi8vICAgICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuLy8gICAgIG9wLmZpbHRlcihoYW5kbGVyID0+IGhhbmRsZXIgIT0gbnVsbCksXG4vLyAgICAgb3AuY29uY2F0TWFwKGhhbmRsZXIgPT4gUHJvbWlzZS5yZXNvbHZlKGNiKGhhbmRsZXIhKSkpLFxuLy8gICAgIG9wLnRha2UoMSlcbi8vICAgKS50b1Byb21pc2UoKTtcbi8vIH07XG5cbmZ1bmN0aW9uIGxvYWQoY2xpT3B0aW9uOiBDbGlPcHRpb25zKSB7XG4gIGNvbnN0IHBrZ1NldHRpbmdGaWxlcyA9IGxvYWRQYWNrYWdlU2V0dGluZ3MoKTtcbiAgY29uc3QgY29uZmlnRmlsZUxpc3QgPSBjbGlPcHRpb24uY29uZmlnIHx8IFtdO1xuICBjb25maWdGaWxlTGlzdC5mb3JFYWNoKGxvY2FsQ29uZmlnUGF0aCA9PiBtZXJnZUZyb21ZYW1sSnNvbkZpbGUobG9jYWxDb25maWdQYXRoKSk7XG4gIGNvbnN0IGhhbmRsZXJzID0gbmV3IENvbmZpZ0hhbmRsZXJNZ3IoXG4gICAgY29uZmlnRmlsZUxpc3QuZmlsdGVyKG5hbWUgPT4gL1xcLlt0al1zJC8udGVzdChuYW1lKSlcbiAgICAgIC5tYXA8W2ZpbGU6IHN0cmluZywgZXhwTmFtZTogc3RyaW5nXT4oaXRlbSA9PiBbUGF0aC5yZXNvbHZlKGl0ZW0pLCAnZGVmYXVsdCddKVxuICAgICAgLmNvbmNhdChwa2dTZXR0aW5nRmlsZXMpXG4gICk7XG4gIGNvbmZpZ0hhbmRsZXJNZ3IkLm5leHQoaGFuZGxlcnMpO1xuICBkaXNwYXRjaGVyLl9jaGFuZ2UoZHJhZnQgPT4ge1xuICAgIGhhbmRsZXJzLnJ1bkVhY2hTeW5jPENvbmZpZ0hhbmRsZXI+KChfZmlsZSwgb2JqLCBoYW5kbGVyKSA9PiB7XG4gICAgICBpZiAoaGFuZGxlci5vbkNvbmZpZykge1xuICAgICAgICByZXR1cm4gaGFuZGxlci5vbkNvbmZpZyhkcmFmdCAsIGRyYWZ0LmNsaU9wdGlvbnMhKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG4gIHZhbGlkYXRlQ29uZmlnKCk7XG5cbiAgZGlzcGF0Y2hlci5fY2hhbmdlKHMgPT4ge1xuICAgIHMucG9ydCA9IG5vcm1hbGl6ZVBvcnQocy5wb3J0KTtcbiAgfSk7XG4gIG1lcmdlRnJvbUNsaUFyZ3MoZ2V0U3RhdGUoKS5jbGlPcHRpb25zISk7XG59XG5cbmZ1bmN0aW9uIG1lcmdlRnJvbVlhbWxKc29uRmlsZShsb2NhbENvbmZpZ1BhdGg6IHN0cmluZykge1xuICBpZiAoIWZzLmV4aXN0c1N5bmMobG9jYWxDb25maWdQYXRoKSkge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgbG9nLmluZm8oY2hhbGsueWVsbG93KCcgRmlsZSBkb2VzIG5vdCBleGlzdDogJXMnLCBsb2NhbENvbmZpZ1BhdGgpKTtcbiAgICByZXR1cm47XG4gIH1cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgbG9nLmluZm8oYCBSZWFkICR7bG9jYWxDb25maWdQYXRofWApO1xuICB2YXIgY29uZmlnT2JqOiB7W2tleTogc3RyaW5nXTogYW55fTtcblxuICBjb25zdCBtYXRjaGVkID0gL1xcLihbXi5dKykkLy5leGVjKGxvY2FsQ29uZmlnUGF0aCk7XG5cbiAgbGV0IHN1ZmZpeCA9IG1hdGNoZWQgPyBtYXRjaGVkWzFdIDogbnVsbDtcbiAgaWYgKHN1ZmZpeCA9PT0gJ3lhbWwnIHx8IHN1ZmZpeCA9PT0gJ3ltbCcpIHtcbiAgICBjb25maWdPYmogPSB5YW1sanMucGFyc2UoZnMucmVhZEZpbGVTeW5jKGxvY2FsQ29uZmlnUGF0aCwgJ3V0ZjgnKSk7XG4gIH0gZWxzZSBpZiAoc3VmZml4ID09PSAnanNvbicpIHtcbiAgICBjb25maWdPYmogPSByZXF1aXJlKFBhdGgucmVzb2x2ZShsb2NhbENvbmZpZ1BhdGgpKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBkaXNwYXRjaGVyLl9jaGFuZ2Uoc2V0dGluZyA9PiB7XG4gICAgXy5hc3NpZ25XaXRoKHNldHRpbmcsIGNvbmZpZ09iaiwgKG9ialZhbHVlLCBzcmNWYWx1ZSwga2V5LCBvYmplY3QsIHNvdXJjZSkgPT4ge1xuICAgICAgaWYgKF8uaXNPYmplY3Qob2JqVmFsdWUpICYmICFBcnJheS5pc0FycmF5KG9ialZhbHVlKSkge1xuICAgICAgICAvLyBXZSBvbmx5IG1lcmdlIDFzdCBhbmQgMm5kIGxldmVsIHByb3BlcnRpZXNcbiAgICAgICAgcmV0dXJuIF8uYXNzaWduKG9ialZhbHVlLCBzcmNWYWx1ZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBtZXJnZUZyb21DbGlBcmdzKGNsaU9wdDogQ2xpT3B0aW9ucykge1xuICBpZiAoIWNsaU9wdC5wcm9wKVxuICAgIHJldHVybjtcbiAgZm9yIChsZXQgcHJvcFBhaXIgb2YgY2xpT3B0LnByb3ApIHtcbiAgICBjb25zdCBwcm9wU2V0ID0gcHJvcFBhaXIuc3BsaXQoJz0nKTtcbiAgICBsZXQgcHJvcFBhdGggPSBwcm9wU2V0WzBdO1xuICAgIGlmIChfLnN0YXJ0c1dpdGgocHJvcFNldFswXSwgJ1snKSlcbiAgICAgIHByb3BQYXRoID0gSlNPTi5wYXJzZShwcm9wU2V0WzBdKTtcbiAgICBsZXQgdmFsdWU6IGFueTtcbiAgICB0cnkge1xuICAgICAgdmFsdWUgPSBKU09OLnBhcnNlKHByb3BTZXRbMV0pO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHZhbHVlID0gcHJvcFNldFsxXSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBwcm9wU2V0WzFdO1xuICAgIH1cbiAgICBkaXNwYXRjaGVyLl9jaGFuZ2UocyA9PiBfLnNldChzLCBwcm9wUGF0aCwgdmFsdWUpKTtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGxvZy5pbmZvKGBbY29uZmlnXSBzZXQgJHtwcm9wUGF0aH0gPSAke3ZhbHVlIGFzIHN0cmluZ31gKTtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIHZhbGlkYXRlQ29uZmlnKCkge1xuICAvLyBUT0RPOiBqc29uIHNjaGVtYSB2YWxpZGF0aW9uXG59XG5cbi8vIGZ1bmN0aW9uIHRyaW1UYWlsU2xhc2godXJsOiBzdHJpbmcpIHtcbi8vICAgaWYgKHVybCA9PT0gJy8nKSB7XG4vLyAgICAgcmV0dXJuIHVybDtcbi8vICAgfVxuLy8gICByZXR1cm4gXy5lbmRzV2l0aCh1cmwsICcvJykgPyB1cmwuc3Vic3RyaW5nKDAsIHVybC5sZW5ndGggLSAxKSA6IHVybDtcbi8vIH1cblxuZnVuY3Rpb24gbm9ybWFsaXplUG9ydCh2YWw6IHN0cmluZyB8IG51bWJlcikge1xuICBsZXQgcG9ydDogbnVtYmVyID0gdHlwZW9mIHZhbCA9PT0gJ3N0cmluZycgPyBwYXJzZUludCh2YWwsIDEwKSA6IHZhbDtcblxuICBpZiAoaXNOYU4ocG9ydCkpIHtcbiAgICAvLyBuYW1lZCBwaXBlXG4gICAgcmV0dXJuIHZhbDtcbiAgfVxuXG4gIGlmIChwb3J0ID49IDApIHtcbiAgICAvLyBwb3J0IG51bWJlclxuICAgIHJldHVybiBwb3J0O1xuICB9XG5cbiAgcmV0dXJuIDgwODA7XG59XG5cbnR5cGUgUGFja2FnZUluZm8gPSBSZXR1cm5UeXBlPCh0eXBlb2YgX3BrZ0xpc3QpWydwYWNrYWdlczRXb3Jrc3BhY2UnXT4gZXh0ZW5kcyBHZW5lcmF0b3I8aW5mZXIgVD4gPyBUIDogdW5rbm93bjtcblxuLyoqXG4gKiBAcmV0dXJucyBbZGVmYXVsdFZhbHVlRmlsZSwgZXhwb3J0TmFtZSwgZHRzRmlsZV1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uKiBnZXRQYWNrYWdlU2V0dGluZ0ZpbGVzKHdvcmtzcGFjZUtleTogc3RyaW5nLCBpbmNsdWRlUGtnPzogU2V0PHN0cmluZz4pOiBHZW5lcmF0b3I8W1xuICAvKiogcmVsYXRpdmUgcGF0aCB3aXRoaW4gcGFja2FnZSByZWFscGF0aCwgd2l0aG91dCBleHQgZmlsZSBuYW1lICovXG4gIHR5cGVGaWxlV2l0aG91dEV4dDogc3RyaW5nLFxuICB0eXBlRXhwb3J0TmFtZTogc3RyaW5nLFxuICAvKiogcmVsYXRpdmUgcGF0aCBvZiBqcyBmaWxlLCB3aGljaCBleHBvcnRzIGRlZmF1bHQgdmFsdWUgb3IgZmFjdG9yeSBmdW5jdGlvbiBvZiBkZWZhdWx0IHZhbHVlICovXG4gIGpzRmlsZTogc3RyaW5nLFxuICBkZWZhdWx0RXhwb3J0TmFtZTogc3RyaW5nLFxuICBwa2c6IFBhY2thZ2VJbmZvXG5dPiB7XG4gIGNvbnN0IHtwYWNrYWdlczRXb3Jrc3BhY2VLZXl9ID0gcmVxdWlyZSgnLi4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcicpIGFzIHR5cGVvZiBfcGtnTGlzdDtcbiAgZm9yIChjb25zdCBwa2cgb2YgcGFja2FnZXM0V29ya3NwYWNlS2V5KHdvcmtzcGFjZUtleSwgdHJ1ZSkpIHtcbiAgICBpZiAoaW5jbHVkZVBrZyAmJiAhaW5jbHVkZVBrZy5oYXMocGtnLm5hbWUpKVxuICAgICAgY29udGludWU7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgZHIgPSBwa2cuanNvbi5kciB8fCBwa2cuanNvbi5wbGluayE7XG4gICAgICBpZiAoZHIgPT0gbnVsbCB8fCB0eXBlb2YgZHIuc2V0dGluZyAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCBzZXR0aW5nID0gZHIuc2V0dGluZztcbiAgICAgIGxvZy5kZWJ1ZygnZ2V0UGFja2FnZVNldHRpbmdGaWxlcycsIHBrZy5uYW1lLCBzZXR0aW5nKTtcbiAgICAgIGxldCBbdmFsdWVGaWxlLCB2YWx1ZUV4cG9ydF0gPSBzZXR0aW5nLnZhbHVlLnNwbGl0KCcjJywgMik7XG5cbiAgICAgIC8vIENoZWNrIHZhbHVlIGZpbGVcbiAgICAgIGNvbnN0IGV4dCA9IFBhdGguZXh0bmFtZSh2YWx1ZUZpbGUpO1xuICAgICAgaWYgKGV4dCA9PT0gJycpIHtcbiAgICAgICAgdmFsdWVGaWxlID0gdmFsdWVGaWxlICsgJy5qcyc7XG4gICAgICB9XG4gICAgICBpZiAodmFsdWVFeHBvcnQgPT0gbnVsbClcbiAgICAgICAgdmFsdWVFeHBvcnQgPSAnZGVmYXVsdCc7XG5cbiAgICAgIGNvbnN0IGFic0ZpbGUgPSBQYXRoLnJlc29sdmUocGtnLnJlYWxQYXRoLCB2YWx1ZUZpbGUpO1xuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGFic0ZpbGUpKSB7XG4gICAgICAgIGxvZy53YXJuKGBQYWNrYWdlICR7cGtnLm5hbWV9J3MgY29uZmlndXJlIGZpbGUgXCIke2Fic0ZpbGV9XCIgZG9lcyBub3QgZXhpc3QsIHNraXBwZWQuYCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgLy8gQ2hlY2sgZHRzIHR5cGUgZmlsZVxuICAgICAgbGV0IFt0eXBlRmlsZSwgdHlwZUV4cG9ydE5hbWVdID0gc2V0dGluZy50eXBlLnNwbGl0KCcjJywgMik7XG4gICAgICBsZXQgdHlwZUZpbGVFeHQgPSBQYXRoLmV4dG5hbWUodHlwZUZpbGUpO1xuICAgICAgaWYgKHR5cGVGaWxlRXh0ID09PSAnJykge1xuICAgICAgICB0eXBlRmlsZSArPSAnLmR0cyc7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGFic1R5cGVGaWxlID0gUGF0aC5yZXNvbHZlKHBrZy5yZWFsUGF0aCwgdHlwZUZpbGVFeHQpO1xuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGFic1R5cGVGaWxlKSkge1xuICAgICAgICBsb2cud2FybihgUGFja2FnZSBzZXR0aW5nICR7cGtnLm5hbWV9J3MgZHRzIGZpbGUgXCIke2Fic1R5cGVGaWxlfVwiIGRvZXMgbm90IGV4aXN0LCBza2lwcGVkLmApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlRXhwb3J0TmFtZSA9PSBudWxsKSB7XG4gICAgICAgIGxvZy5lcnJvcihgSW5jb3JyZWN0IHBhY2thZ2UgY29uZmlnIHByb3BlcnR5IGZvcm1hdCBcIiR7c2V0dGluZy50eXBlfVwiIGluICR7cGtnLnJlYWxQYXRoICsgUGF0aC5zZXB9cGFja2FnZS5qc29uYCArXG4gICAgICAgICAgJywgY29ycmVjdCBmb3JtYXQgaXMgXCI8ZHRzLWZpbGUtcmVsYXRpdmUtcGF0aD4jPFRTLXR5cGUtZXhwb3J0LW5hbWU+XCInKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICB5aWVsZCBbdHlwZUZpbGUucmVwbGFjZSgvXFwuW14uL1xcXFxdKyQvZywgJycpLCB0eXBlRXhwb3J0TmFtZSwgdmFsdWVGaWxlLCB2YWx1ZUV4cG9ydCwgcGtnXTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGxvZy53YXJuKGBTa2lwIGxvYWRpbmcgc2V0dGluZyBvZiBwYWNrYWdlICR7cGtnLm5hbWV9LCBkdWUgdG8gKHRoaXMgbWlnaHQgYmUgY2F1c2VkIGJ5IGluY29ycmVjdCBwYWNrYWdlLmpzb24gZm9ybWF0KWAsIGVycik7XG4gICAgfVxuICB9XG59XG4vKipcbiAqIEByZXR1cm5zIGFic3VsdGUgcGF0aCBvZiBzZXR0aW5nIEpTIGZpbGVzIHdoaWNoIGNvbnRhaW5zIGV4cG9ydHMgbmFtZWQgd2l0aCBcImRlZmF1bHRcIlxuICovXG5mdW5jdGlvbiBsb2FkUGFja2FnZVNldHRpbmdzKCk6IFtmaWxlOiBzdHJpbmcsIGV4cG9ydE5hbWU6IHN0cmluZ11bXSB7XG4gIGNvbnN0IHt3b3Jrc3BhY2VLZXksIGlzQ3dkV29ya3NwYWNlfSA9IHJlcXVpcmUoJy4uL3BhY2thZ2UtbWdyJykgYXMgdHlwZW9mIF9wa2dNZ3I7XG4gIGlmICghaXNDd2RXb3Jrc3BhY2UoKSkge1xuICAgIGxvZy5kZWJ1ZygnTm90IGluIGEgd29ya3NwYWNlLCBza2lwIGxvYWRpbmcgcGFja2FnZSBzZXR0aW5ncycpO1xuICAgIHJldHVybiBbXTtcbiAgfVxuICBjb25zdCBqc0ZpbGVzOiBbZmlsZTogc3RyaW5nLCBleHBvcnROYW1lOiBzdHJpbmddW10gPSBbXTtcblxuICBmb3IgKGNvbnN0IFtfdHlwZUZpbGUsIF90eXBlRXhwb3J0LCBqc0ZpbGUsIGRlZmF1bHRTZXR0aW5nRXhwb3J0LCBwa2ddIG9mIGdldFBhY2thZ2VTZXR0aW5nRmlsZXMod29ya3NwYWNlS2V5KHBsaW5rRW52LndvcmtEaXIpKSkge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBhYnNGaWxlID0gUGF0aC5yZXNvbHZlKHBsaW5rRW52LndvcmtEaXIsIHBrZy5wYXRoLCBqc0ZpbGUpO1xuICAgICAgY29uc3QgZXhwcyA9IHJlcXVpcmUoYWJzRmlsZSk7XG4gICAgICBjb25zdCBkZWZhdWx0U2V0dGluZ0ZhY3Rvcnk6IFBhY2thZ2VTZXR0aW5nSW50ZXJmPGFueT4gPSBleHBzW2RlZmF1bHRTZXR0aW5nRXhwb3J0XTtcblxuICAgICAgaWYgKHR5cGVvZiBkZWZhdWx0U2V0dGluZ0ZhY3RvcnkgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBkZWZhdWx0U2V0dGluZ0ZhY3RvcnkoZ2V0U3RhdGUoKS5jbGlPcHRpb25zISk7XG4gICAgICAgIGRpc3BhdGNoZXIuX2NoYW5nZShzID0+IHNbcGtnLm5hbWVdID0gdmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLndhcm4oYEZhaWxlZCB0byBsb2FkIHBhY2thZ2Ugc2V0dGluZyBmcm9tICR7cGtnLm5hbWV9LyR7anNGaWxlfS5cXG4gRXhwb3J0IG5hbWUgXCIke2RlZmF1bHRTZXR0aW5nRXhwb3J0fVwiIGlzIG5vdCBmb3VuZGApO1xuICAgICAgfVxuICAgICAgaWYgKGRlZmF1bHRTZXR0aW5nRmFjdG9yeSAhPSBudWxsKSB7XG4gICAgICAgIGpzRmlsZXMucHVzaChbYWJzRmlsZSwgZGVmYXVsdFNldHRpbmdFeHBvcnRdKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGxvZy5lcnJvcihgRmFpbGVkIHRvIGxvYWQgcGFja2FnZSBzZXR0aW5nIGZyb20gJHtwa2cubmFtZX0vJHtqc0ZpbGV9Licke2RlZmF1bHRTZXR0aW5nRXhwb3J0fWAsIGVycik7XG4gICAgfVxuICB9XG4gIHJldHVybiBqc0ZpbGVzO1xufVxuZXhwb3J0IGRlZmF1bHQgKGNvbmZpZyBhcyBEcmNwQ29uZmlnKTtcbiJdfQ==