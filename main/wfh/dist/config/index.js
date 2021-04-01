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
exports.getPackageSettingFiles = exports.handlers$ = void 0;
// tslint:disable: prefer-const max-line-length
require('yamlify/register');
const lodash_1 = __importDefault(require("lodash"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const config_handler_1 = require("../config-handler");
const network_util_1 = require("../utils/network-util");
// import {PlinkEnv} from '../node-path';
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const log4js_1 = __importDefault(require("log4js"));
const config_slice_1 = require("./config-slice");
const misc_1 = require("../utils/misc");
const log = log4js_1.default.getLogger('plink.config');
// const yamljs = require('yamljs');
const yamljs_1 = __importDefault(require("yamljs"));
const { rootDir } = misc_1.plinkEnv;
let rootPath = rootDir;
exports.handlers$ = new rx.BehaviorSubject(undefined);
/**
 * read and return configuration
 * @name config
 * @return {object} setting
 */
const config = () => {
    return config_slice_1.getState();
};
config.initSync = (argv) => {
    config_slice_1.dispatcher.saveCliOption(argv);
    load(argv);
    return config_slice_1.getState();
};
config.reload = function reload() {
    const argv = config_slice_1.getState().cliOptions;
    load(argv);
    return config_slice_1.getState();
};
config.set = function (path, value) {
    config_slice_1.dispatcher._change(setting => {
        lodash_1.default.set(setting, path, value);
    });
    return config_slice_1.getState();
};
config.get = function (propPath, defaultValue) {
    return lodash_1.default.get(config_slice_1.getState(), propPath, defaultValue);
};
/**
 * Resolve a path based on `rootPath`
 * @name resolve
 * @memberof config
 * @param  {string} property name or property path, like "name", "name.childProp[1]"
 * @return {string}     absolute path
 */
config.resolve = function (pathPropName, ...paths) {
    const args = [rootPath, config_slice_1.getState()[pathPropName], ...paths];
    return path_1.default.resolve(...args);
};
// config.configureStore = configureStore;
config.configHandlerMgr = exports.handlers$;
config.configHandlerMgrChanged = function (cb) {
    exports.handlers$.pipe(op.distinctUntilChanged(), op.filter(handler => handler != null), op.tap(handler => cb(handler))).subscribe();
};
config.configHandlerMgrCreated = function (cb) {
    return exports.handlers$.pipe(op.distinctUntilChanged(), op.filter(handler => handler != null), op.concatMap(handler => Promise.resolve(cb(handler))), op.take(1)).toPromise();
};
function load(cliOption) {
    config_slice_1.dispatcher._change(s => {
        s.localIP = network_util_1.getLanIPv4();
    });
    loadPackageSettings();
    const configFileList = cliOption.config || [];
    configFileList.forEach(localConfigPath => mergeFromYamlJsonFile(localConfigPath));
    const handlers = new config_handler_1.ConfigHandlerMgr(configFileList.filter(name => /\.[tj]s$/.test(name)));
    exports.handlers$.next(handlers);
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
    mergeFromCliArgs(config_slice_1.getState().cliOptions);
}
function mergeFromYamlJsonFile(localConfigPath) {
    if (!fs_1.default.existsSync(localConfigPath)) {
        // tslint:disable-next-line: no-console
        log.info(chalk_1.default.yellow(' File does not exist: %s', localConfigPath));
        return;
    }
    // tslint:disable-next-line: no-console
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
        // tslint:disable-next-line: no-console
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
                log.error(`Incorrect package config property format "${setting.type}" in ${pkg.path + path_1.default.sep}package.json` +
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
            const absFile = path_1.default.resolve(pkg.realPath, jsFile);
            const exps = require(absFile);
            const defaultSettingFactory = exps[defaultSettingExport];
            if (typeof defaultSettingFactory === 'function') {
                const value = defaultSettingFactory(config_slice_1.getState().cliOptions);
                config_slice_1.dispatcher._change(s => s[pkg.name] = value);
            }
            else {
                log.warn(`Failed to load package setting from ${pkg.name}/${jsFile}.\n Export name "${defaultSettingExport}" is not found`);
            }
            // Not used for now
            if (exps.default != null) {
                jsFiles.push(absFile);
            }
        }
        catch (err) {
            log.error(`Failed to load package setting from ${pkg.name}/${jsFile}.'${defaultSettingExport}`, err);
        }
    }
    return jsFiles;
}
exports.default = config;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jb25maWcvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtDQUErQztBQUMvQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUM1QixvREFBdUI7QUFDdkIsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QixrREFBMEI7QUFDMUIsc0RBQThFO0FBRTlFLHdEQUFpRDtBQUNqRCx5Q0FBeUM7QUFDekMseUNBQTJCO0FBQzNCLG1EQUFxQztBQUNyQyxvREFBNEI7QUFDNUIsaURBQWtFO0FBSWxFLHdDQUF1QztBQUV2QyxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUM3QyxvQ0FBb0M7QUFDcEMsb0RBQTRCO0FBQzVCLE1BQU0sRUFBQyxPQUFPLEVBQUMsR0FBRyxlQUFRLENBQUM7QUFFM0IsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDO0FBRVYsUUFBQSxTQUFTLEdBQUcsSUFBSSxFQUFFLENBQUMsZUFBZSxDQUErQixTQUFTLENBQUMsQ0FBQztBQUV6Rjs7OztHQUlHO0FBQ0gsTUFBTSxNQUFNLEdBQUcsR0FBaUIsRUFBRTtJQUNoQyxPQUFPLHVCQUFRLEVBQWtCLENBQUM7QUFDcEMsQ0FBQyxDQUFDO0FBRUYsTUFBTSxDQUFDLFFBQVEsR0FBRyxDQUFDLElBQWdCLEVBQUUsRUFBRTtJQUNyQyx5QkFBVSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUMvQixJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDWCxPQUFPLHVCQUFRLEVBQWtCLENBQUM7QUFDcEMsQ0FBQyxDQUFDO0FBR0YsTUFBTSxDQUFDLE1BQU0sR0FBRyxTQUFTLE1BQU07SUFDN0IsTUFBTSxJQUFJLEdBQUcsdUJBQVEsRUFBRSxDQUFDLFVBQVcsQ0FBQztJQUNwQyxJQUFJLENBQUMs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QUFJLENBQUMsT0FBTyxJQUFJLElBQUksRUFBRTtnQkFDeEIsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQzthQUN2QjtTQUNGO1FBQUMsT0FBTyxHQUFHLEVBQUU7WUFDWixHQUFHLENBQUMsS0FBSyxDQUFDLHVDQUF1QyxHQUFHLENBQUMsSUFBSSxJQUFJLE1BQU0sS0FBSyxvQkFBb0IsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1NBQ3RHO0tBQ0Y7SUFDRCxPQUFPLE9BQU8sQ0FBQztBQUNqQixDQUFDO0FBQ0Qsa0JBQWdCLE1BQXFCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTogcHJlZmVyLWNvbnN0IG1heC1saW5lLWxlbmd0aFxucmVxdWlyZSgneWFtbGlmeS9yZWdpc3RlcicpO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQge0NvbmZpZ0hhbmRsZXJNZ3IsIERyY3BDb25maWcsIENvbmZpZ0hhbmRsZXJ9IGZyb20gJy4uL2NvbmZpZy1oYW5kbGVyJztcbmltcG9ydCB7R2xvYmFsT3B0aW9ucyBhcyBDbGlPcHRpb25zfSBmcm9tICcuLi9jbWQvdHlwZXMnO1xuaW1wb3J0IHtnZXRMYW5JUHY0fSBmcm9tICcuLi91dGlscy9uZXR3b3JrLXV0aWwnO1xuLy8gaW1wb3J0IHtQbGlua0Vudn0gZnJvbSAnLi4vbm9kZS1wYXRoJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtkaXNwYXRjaGVyLCBnZXRTdGF0ZSwgRHJjcFNldHRpbmdzfSBmcm9tICcuL2NvbmZpZy1zbGljZSc7XG4vLyBSZWZhY3RvcjogY2lyY3VsYXIgcmVmZXJlbmNlXG5pbXBvcnQgKiBhcyBfcGtnTGlzdCBmcm9tICcuLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCAqIGFzIF9wa2dNZ3IgZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHtwbGlua0Vudn0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLmNvbmZpZycpO1xuLy8gY29uc3QgeWFtbGpzID0gcmVxdWlyZSgneWFtbGpzJyk7XG5pbXBvcnQgeWFtbGpzIGZyb20gJ3lhbWxqcyc7XG5jb25zdCB7cm9vdERpcn0gPSBwbGlua0VudjtcblxubGV0IHJvb3RQYXRoID0gcm9vdERpcjtcblxuZXhwb3J0IGNvbnN0IGhhbmRsZXJzJCA9IG5ldyByeC5CZWhhdmlvclN1YmplY3Q8Q29uZmlnSGFuZGxlck1nciB8IHVuZGVmaW5lZD4odW5kZWZpbmVkKTtcblxuLyoqXG4gKiByZWFkIGFuZCByZXR1cm4gY29uZmlndXJhdGlvblxuICogQG5hbWUgY29uZmlnXG4gKiBAcmV0dXJuIHtvYmplY3R9IHNldHRpbmdcbiAqL1xuY29uc3QgY29uZmlnID0gKCk6IERyY3BTZXR0aW5ncyA9PiB7XG4gIHJldHVybiBnZXRTdGF0ZSgpIGFzIERyY3BTZXR0aW5ncztcbn07XG5cbmNvbmZpZy5pbml0U3luYyA9IChhcmd2OiBDbGlPcHRpb25zKSA9PiB7XG4gIGRpc3BhdGNoZXIuc2F2ZUNsaU9wdGlvbihhcmd2KTtcbiAgbG9hZChhcmd2KTtcbiAgcmV0dXJuIGdldFN0YXRlKCkgYXMgRHJjcFNldHRpbmdzO1xufTtcblxuXG5jb25maWcucmVsb2FkID0gZnVuY3Rpb24gcmVsb2FkKCkge1xuICBjb25zdCBhcmd2ID0gZ2V0U3RhdGUoKS5jbGlPcHRpb25zITtcbiAgbG9hZChhcmd2KTtcbiAgcmV0dXJuIGdldFN0YXRlKCkgYXMgRHJjcFNldHRpbmdzO1xufTtcblxuY29uZmlnLnNldCA9IGZ1bmN0aW9uKHBhdGg6IHN0cmluZywgdmFsdWU6IGFueSkge1xuICBkaXNwYXRjaGVyLl9jaGFuZ2Uoc2V0dGluZyA9PiB7XG4gICAgXy5zZXQoc2V0dGluZywgcGF0aCwgdmFsdWUpO1xuICB9KTtcbiAgcmV0dXJuIGdldFN0YXRlKCk7XG59O1xuXG5jb25maWcuZ2V0ID0gZnVuY3Rpb24ocHJvcFBhdGg6IHN0cmluZywgZGVmYXVsdFZhbHVlOiBhbnkpIHtcbiAgcmV0dXJuIF8uZ2V0KGdldFN0YXRlKCksIHByb3BQYXRoLCBkZWZhdWx0VmFsdWUpO1xufTtcblxuXG4vKipcbiAqIFJlc29sdmUgYSBwYXRoIGJhc2VkIG9uIGByb290UGF0aGBcbiAqIEBuYW1lIHJlc29sdmVcbiAqIEBtZW1iZXJvZiBjb25maWdcbiAqIEBwYXJhbSAge3N0cmluZ30gcHJvcGVydHkgbmFtZSBvciBwcm9wZXJ0eSBwYXRoLCBsaWtlIFwibmFtZVwiLCBcIm5hbWUuY2hpbGRQcm9wWzFdXCJcbiAqIEByZXR1cm4ge3N0cmluZ30gICAgIGFic29sdXRlIHBhdGhcbiAqL1xuY29uZmlnLnJlc29sdmUgPSBmdW5jdGlvbihwYXRoUHJvcE5hbWU6ICdyb290UGF0aCcgfCAnZGVzdERpcid8J3N0YXRpY0Rpcid8J3NlcnZlckRpcicsIC4uLnBhdGhzOiBzdHJpbmdbXSkge1xuICBjb25zdCBhcmdzOiBzdHJpbmdbXSA9IFtyb290UGF0aCwgZ2V0U3RhdGUoKVtwYXRoUHJvcE5hbWVdLCAuLi5wYXRoc107XG4gIHJldHVybiBQYXRoLnJlc29sdmUoLi4uYXJncyk7XG59O1xuXG4vLyBjb25maWcuY29uZmlndXJlU3RvcmUgPSBjb25maWd1cmVTdG9yZTtcblxuY29uZmlnLmNvbmZpZ0hhbmRsZXJNZ3IgPSBoYW5kbGVycyQ7XG5cbmNvbmZpZy5jb25maWdIYW5kbGVyTWdyQ2hhbmdlZCA9IGZ1bmN0aW9uKGNiOiAoaGFuZGxlcjogQ29uZmlnSGFuZGxlck1ncikgPT4gdm9pZCkge1xuICBoYW5kbGVycyQucGlwZShcbiAgICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIG9wLmZpbHRlcihoYW5kbGVyID0+IGhhbmRsZXIgIT0gbnVsbCksXG4gICAgb3AudGFwKGhhbmRsZXIgPT4gY2IoaGFuZGxlciEpKVxuICApLnN1YnNjcmliZSgpO1xufTtcblxuY29uZmlnLmNvbmZpZ0hhbmRsZXJNZ3JDcmVhdGVkID0gZnVuY3Rpb24oY2I6IChoYW5kbGVyOiBDb25maWdIYW5kbGVyTWdyKSA9PiBQcm9taXNlPGFueT4gfCB2b2lkKTogUHJvbWlzZTx2b2lkPiB7XG4gIHJldHVybiBoYW5kbGVycyQucGlwZShcbiAgICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIG9wLmZpbHRlcihoYW5kbGVyID0+IGhhbmRsZXIgIT0gbnVsbCksXG4gICAgb3AuY29uY2F0TWFwKGhhbmRsZXIgPT4gUHJvbWlzZS5yZXNvbHZlKGNiKGhhbmRsZXIhKSkpLFxuICAgIG9wLnRha2UoMSlcbiAgKS50b1Byb21pc2UoKTtcbn07XG5cbmZ1bmN0aW9uIGxvYWQoY2xpT3B0aW9uOiBDbGlPcHRpb25zKSB7XG4gIGRpc3BhdGNoZXIuX2NoYW5nZShzID0+IHtcbiAgICBzLmxvY2FsSVAgPSBnZXRMYW5JUHY0KCk7XG4gIH0pO1xuICBsb2FkUGFja2FnZVNldHRpbmdzKCk7XG4gIGNvbnN0IGNvbmZpZ0ZpbGVMaXN0ID0gY2xpT3B0aW9uLmNvbmZpZyB8fCBbXTtcbiAgY29uZmlnRmlsZUxpc3QuZm9yRWFjaChsb2NhbENvbmZpZ1BhdGggPT4gbWVyZ2VGcm9tWWFtbEpzb25GaWxlKGxvY2FsQ29uZmlnUGF0aCkpO1xuICBjb25zdCBoYW5kbGVycyA9IG5ldyBDb25maWdIYW5kbGVyTWdyKFxuICAgIGNvbmZpZ0ZpbGVMaXN0LmZpbHRlcihuYW1lID0+IC9cXC5bdGpdcyQvLnRlc3QobmFtZSkpKTtcbiAgaGFuZGxlcnMkLm5leHQoaGFuZGxlcnMpO1xuICBkaXNwYXRjaGVyLl9jaGFuZ2UoZHJhZnQgPT4ge1xuICAgIGhhbmRsZXJzLnJ1bkVhY2hTeW5jPENvbmZpZ0hhbmRsZXI+KChfZmlsZSwgb2JqLCBoYW5kbGVyKSA9PiB7XG4gICAgICBpZiAoaGFuZGxlci5vbkNvbmZpZykge1xuICAgICAgICByZXR1cm4gaGFuZGxlci5vbkNvbmZpZyhkcmFmdCBhcyBEcmNwU2V0dGluZ3MsIGRyYWZ0LmNsaU9wdGlvbnMhKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG4gIHZhbGlkYXRlQ29uZmlnKCk7XG5cbiAgZGlzcGF0Y2hlci5fY2hhbmdlKHMgPT4ge1xuICAgIHMucG9ydCA9IG5vcm1hbGl6ZVBvcnQocy5wb3J0KTtcbiAgfSk7XG4gIG1lcmdlRnJvbUNsaUFyZ3MoZ2V0U3RhdGUoKS5jbGlPcHRpb25zISk7XG59XG5cbmZ1bmN0aW9uIG1lcmdlRnJvbVlhbWxKc29uRmlsZShsb2NhbENvbmZpZ1BhdGg6IHN0cmluZykge1xuICBpZiAoIWZzLmV4aXN0c1N5bmMobG9jYWxDb25maWdQYXRoKSkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGxvZy5pbmZvKGNoYWxrLnllbGxvdygnIEZpbGUgZG9lcyBub3QgZXhpc3Q6ICVzJywgbG9jYWxDb25maWdQYXRoKSk7XG4gICAgcmV0dXJuO1xuICB9XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBsb2cuaW5mbyhgIFJlYWQgJHtsb2NhbENvbmZpZ1BhdGh9YCk7XG4gIHZhciBjb25maWdPYmo6IHtba2V5OiBzdHJpbmddOiBhbnl9O1xuXG4gIGNvbnN0IG1hdGNoZWQgPSAvXFwuKFteLl0rKSQvLmV4ZWMobG9jYWxDb25maWdQYXRoKTtcblxuICBsZXQgc3VmZml4ID0gbWF0Y2hlZCA/IG1hdGNoZWRbMV0gOiBudWxsO1xuICBpZiAoc3VmZml4ID09PSAneWFtbCcgfHwgc3VmZml4ID09PSAneW1sJykge1xuICAgIGNvbmZpZ09iaiA9IHlhbWxqcy5wYXJzZShmcy5yZWFkRmlsZVN5bmMobG9jYWxDb25maWdQYXRoLCAndXRmOCcpKTtcbiAgfSBlbHNlIGlmIChzdWZmaXggPT09ICdqc29uJykge1xuICAgIGNvbmZpZ09iaiA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKGxvY2FsQ29uZmlnUGF0aCkpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGRpc3BhdGNoZXIuX2NoYW5nZShzZXR0aW5nID0+IHtcbiAgICBfLmFzc2lnbldpdGgoc2V0dGluZywgY29uZmlnT2JqLCAob2JqVmFsdWUsIHNyY1ZhbHVlLCBrZXksIG9iamVjdCwgc291cmNlKSA9PiB7XG4gICAgICBpZiAoXy5pc09iamVjdChvYmpWYWx1ZSkgJiYgIUFycmF5LmlzQXJyYXkob2JqVmFsdWUpKSB7XG4gICAgICAgIC8vIFdlIG9ubHkgbWVyZ2UgMXN0IGFuZCAybmQgbGV2ZWwgcHJvcGVydGllc1xuICAgICAgICByZXR1cm4gXy5hc3NpZ24ob2JqVmFsdWUsIHNyY1ZhbHVlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIG1lcmdlRnJvbUNsaUFyZ3MoY2xpT3B0OiBDbGlPcHRpb25zKSB7XG4gIGlmICghY2xpT3B0LnByb3ApXG4gICAgcmV0dXJuO1xuICBmb3IgKGxldCBwcm9wUGFpciBvZiBjbGlPcHQucHJvcCkge1xuICAgIGNvbnN0IHByb3BTZXQgPSBwcm9wUGFpci5zcGxpdCgnPScpO1xuICAgIGxldCBwcm9wUGF0aCA9IHByb3BTZXRbMF07XG4gICAgaWYgKF8uc3RhcnRzV2l0aChwcm9wU2V0WzBdLCAnWycpKVxuICAgICAgcHJvcFBhdGggPSBKU09OLnBhcnNlKHByb3BTZXRbMF0pO1xuICAgIGxldCB2YWx1ZTogYW55O1xuICAgIHRyeSB7XG4gICAgICB2YWx1ZSA9IEpTT04ucGFyc2UocHJvcFNldFsxXSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdmFsdWUgPSBwcm9wU2V0WzFdID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IHByb3BTZXRbMV07XG4gICAgfVxuICAgIGRpc3BhdGNoZXIuX2NoYW5nZShzID0+IF8uc2V0KHMsIHByb3BQYXRoLCB2YWx1ZSkpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGxvZy5pbmZvKGBbY29uZmlnXSBzZXQgJHtwcm9wUGF0aH0gPSAke3ZhbHVlfWApO1xuICB9XG59XG5cblxuZnVuY3Rpb24gdmFsaWRhdGVDb25maWcoKSB7XG4gIC8vIFRPRE86IGpzb24gc2NoZW1hIHZhbGlkYXRpb25cbn1cblxuLy8gZnVuY3Rpb24gdHJpbVRhaWxTbGFzaCh1cmw6IHN0cmluZykge1xuLy8gICBpZiAodXJsID09PSAnLycpIHtcbi8vICAgICByZXR1cm4gdXJsO1xuLy8gICB9XG4vLyAgIHJldHVybiBfLmVuZHNXaXRoKHVybCwgJy8nKSA/IHVybC5zdWJzdHJpbmcoMCwgdXJsLmxlbmd0aCAtIDEpIDogdXJsO1xuLy8gfVxuXG5mdW5jdGlvbiBub3JtYWxpemVQb3J0KHZhbDogc3RyaW5nIHwgbnVtYmVyKSB7XG4gIGxldCBwb3J0OiBudW1iZXIgPSB0eXBlb2YgdmFsID09PSAnc3RyaW5nJyA/IHBhcnNlSW50KHZhbCwgMTApIDogdmFsO1xuXG4gIGlmIChpc05hTihwb3J0KSkge1xuICAgIC8vIG5hbWVkIHBpcGVcbiAgICByZXR1cm4gdmFsO1xuICB9XG5cbiAgaWYgKHBvcnQgPj0gMCkge1xuICAgIC8vIHBvcnQgbnVtYmVyXG4gICAgcmV0dXJuIHBvcnQ7XG4gIH1cblxuICByZXR1cm4gODA4MDtcbn1cblxudHlwZSBQYWNrYWdlSW5mbyA9IFJldHVyblR5cGU8KHR5cGVvZiBfcGtnTGlzdClbJ3BhY2thZ2VzNFdvcmtzcGFjZSddPiBleHRlbmRzIEdlbmVyYXRvcjxpbmZlciBUPiA/IFQgOiB1bmtub3duO1xuXG5leHBvcnQgaW50ZXJmYWNlIFdpdGhQYWNrYWdlU2V0dGluZ1Byb3Age1xuICBzZXR0aW5nOiB7XG4gICAgLyoqIEluIGZvcm0gb2YgXCI8cGF0aD4jPGV4cG9ydC1uYW1lPlwiICovXG4gICAgdHlwZTogc3RyaW5nO1xuICAgIC8qKiBJbiBmb3JtIG9mIFwiPG1vZHVsZS1wYXRoPiM8ZXhwb3J0LW5hbWU+XCIgKi9cbiAgICB2YWx1ZTogc3RyaW5nO1xuICB9O1xufVxuLyoqXG4gKiBAcmV0dXJucyBbZGVmYXVsdFZhbHVlRmlsZSwgZXhwb3J0TmFtZSwgZHRzRmlsZV1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uKiBnZXRQYWNrYWdlU2V0dGluZ0ZpbGVzKHdvcmtzcGFjZUtleTogc3RyaW5nLCBpbmNsdWRlUGtnPzogU2V0PHN0cmluZz4pOiBHZW5lcmF0b3I8W1xuICAvKiogcmVsYXRpdmUgcGF0aCB3aXRoaW4gcGFja2FnZSByZWFscGF0aCwgd2l0aG91dCBleHQgZmlsZSBuYW1lICovXG4gIHR5cGVGaWxlV2l0aG91dEV4dDogc3RyaW5nLFxuICB0eXBlRXhwb3J0TmFtZTogc3RyaW5nLFxuICAvKiogcmVsYXRpdmUgcGF0aCBvZiBqcyBmaWxlLCB3aGljaCBleHBvcnRzIGRlZmF1bHQgdmFsdWUgb3IgZmFjdG9yeSBmdW5jdGlvbiBvZiBkZWZhdWx0IHZhbHVlICovXG4gIGpzRmlsZTogc3RyaW5nLFxuICBkZWZhdWx0RXhwb3J0TmFtZTogc3RyaW5nLFxuICBwa2c6IFBhY2thZ2VJbmZvXG5dPiB7XG4gIGNvbnN0IHtwYWNrYWdlczRXb3Jrc3BhY2VLZXl9ID0gcmVxdWlyZSgnLi4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcicpIGFzIHR5cGVvZiBfcGtnTGlzdDtcbiAgZm9yIChjb25zdCBwa2cgb2YgcGFja2FnZXM0V29ya3NwYWNlS2V5KHdvcmtzcGFjZUtleSwgdHJ1ZSkpIHtcbiAgICBpZiAoaW5jbHVkZVBrZyAmJiAhaW5jbHVkZVBrZy5oYXMocGtnLm5hbWUpKVxuICAgICAgY29udGludWU7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgZHI6IFdpdGhQYWNrYWdlU2V0dGluZ1Byb3AgPSBwa2cuanNvbi5kciB8fCBwa2cuanNvbi5wbGluaztcbiAgICAgIGlmIChkciA9PSBudWxsIHx8IHR5cGVvZiBkci5zZXR0aW5nICE9PSAnb2JqZWN0Jykge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHNldHRpbmcgPSBkci5zZXR0aW5nO1xuICAgICAgbG9nLmRlYnVnKCdnZXRQYWNrYWdlU2V0dGluZ0ZpbGVzJywgcGtnLm5hbWUsIHNldHRpbmcpO1xuICAgICAgbGV0IFt2YWx1ZUZpbGUsIHZhbHVlRXhwb3J0XSA9IHNldHRpbmcudmFsdWUuc3BsaXQoJyMnLCAyKTtcblxuICAgICAgLy8gQ2hlY2sgdmFsdWUgZmlsZVxuICAgICAgY29uc3QgZXh0ID0gUGF0aC5leHRuYW1lKHZhbHVlRmlsZSk7XG4gICAgICBpZiAoZXh0ID09PSAnJykge1xuICAgICAgICB2YWx1ZUZpbGUgPSB2YWx1ZUZpbGUgKyAnLmpzJztcbiAgICAgIH1cbiAgICAgIGlmICh2YWx1ZUV4cG9ydCA9PSBudWxsKVxuICAgICAgICB2YWx1ZUV4cG9ydCA9ICdkZWZhdWx0JztcblxuICAgICAgY29uc3QgYWJzRmlsZSA9IFBhdGgucmVzb2x2ZShwa2cucmVhbFBhdGgsIHZhbHVlRmlsZSk7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoYWJzRmlsZSkpIHtcbiAgICAgICAgbG9nLndhcm4oYFBhY2thZ2UgJHtwa2cubmFtZX0ncyBjb25maWd1cmUgZmlsZSBcIiR7YWJzRmlsZX1cIiBkb2VzIG5vdCBleGlzdCwgc2tpcHBlZC5gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICAvLyBDaGVjayBkdHMgdHlwZSBmaWxlXG4gICAgICBsZXQgW3R5cGVGaWxlLCB0eXBlRXhwb3J0TmFtZV0gPSBzZXR0aW5nLnR5cGUuc3BsaXQoJyMnLCAyKTtcbiAgICAgIGxldCB0eXBlRmlsZUV4dCA9IFBhdGguZXh0bmFtZSh0eXBlRmlsZSk7XG4gICAgICBpZiAodHlwZUZpbGVFeHQgPT09ICcnKSB7XG4gICAgICAgIHR5cGVGaWxlICs9ICcuZHRzJztcbiAgICAgIH1cblxuICAgICAgY29uc3QgYWJzVHlwZUZpbGUgPSBQYXRoLnJlc29sdmUocGtnLnJlYWxQYXRoLCB0eXBlRmlsZUV4dCk7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoYWJzVHlwZUZpbGUpKSB7XG4gICAgICAgIGxvZy53YXJuKGBQYWNrYWdlIHNldHRpbmcgJHtwa2cubmFtZX0ncyBkdHMgZmlsZSBcIiR7YWJzVHlwZUZpbGV9XCIgZG9lcyBub3QgZXhpc3QsIHNraXBwZWQuYCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVFeHBvcnROYW1lID09IG51bGwpIHtcbiAgICAgICAgbG9nLmVycm9yKGBJbmNvcnJlY3QgcGFja2FnZSBjb25maWcgcHJvcGVydHkgZm9ybWF0IFwiJHtzZXR0aW5nLnR5cGV9XCIgaW4gJHtwa2cucGF0aCArIFBhdGguc2VwfXBhY2thZ2UuanNvbmAgK1xuICAgICAgICAgICcsIGNvcnJlY3QgZm9ybWF0IGlzIFwiPGR0cy1maWxlLXJlbGF0aXZlLXBhdGg+IzxUUy10eXBlLWV4cG9ydC1uYW1lPlwiJyk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgeWllbGQgW3R5cGVGaWxlLnJlcGxhY2UoL1xcLlteLi9cXFxcXSskL2csICcnKSwgdHlwZUV4cG9ydE5hbWUsIHZhbHVlRmlsZSwgdmFsdWVFeHBvcnQsIHBrZ107XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBsb2cud2FybihgU2tpcCBsb2FkaW5nIHNldHRpbmcgb2YgcGFja2FnZSAke3BrZy5uYW1lfSwgZHVlIHRvICh0aGlzIG1pZ2h0IGJlIGNhdXNlZCBieSBpbmNvcnJlY3QgcGFja2FnZS5qc29uIGZvcm1hdClgLCBlcnIpO1xuICAgIH1cbiAgfVxufVxuLyoqXG4gKiBAcmV0dXJucyBhYnN1bHRlIHBhdGggb2Ygc2V0dGluZyBKUyBmaWxlcyB3aGljaCBjb250YWlucyBleHBvcnRzIG5hbWVkIHdpdGggXCJkZWZhdWx0XCJcbiAqL1xuZnVuY3Rpb24gbG9hZFBhY2thZ2VTZXR0aW5ncygpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IHt3b3Jrc3BhY2VLZXksIGlzQ3dkV29ya3NwYWNlfSA9IHJlcXVpcmUoJy4uL3BhY2thZ2UtbWdyJykgYXMgdHlwZW9mIF9wa2dNZ3I7XG4gIGlmICghaXNDd2RXb3Jrc3BhY2UoKSkge1xuICAgIGxvZy5kZWJ1ZygnTm90IGluIGEgd29ya3NwYWNlLCBza2lwIGxvYWRpbmcgcGFja2FnZSBzZXR0aW5ncycpO1xuICAgIHJldHVybiBbXTtcbiAgfVxuICBjb25zdCBqc0ZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuICBmb3IgKGNvbnN0IFtfdHlwZUZpbGUsIF90eXBlRXhwb3J0LCBqc0ZpbGUsIGRlZmF1bHRTZXR0aW5nRXhwb3J0LCBwa2ddIG9mIGdldFBhY2thZ2VTZXR0aW5nRmlsZXMod29ya3NwYWNlS2V5KHBsaW5rRW52LndvcmtEaXIpKSkge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBhYnNGaWxlID0gUGF0aC5yZXNvbHZlKHBrZy5yZWFsUGF0aCwganNGaWxlKTtcbiAgICAgIGNvbnN0IGV4cHMgPSByZXF1aXJlKGFic0ZpbGUpO1xuICAgICAgY29uc3QgZGVmYXVsdFNldHRpbmdGYWN0b3J5ID0gZXhwc1tkZWZhdWx0U2V0dGluZ0V4cG9ydF07XG5cbiAgICAgIGlmICh0eXBlb2YgZGVmYXVsdFNldHRpbmdGYWN0b3J5ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gZGVmYXVsdFNldHRpbmdGYWN0b3J5KGdldFN0YXRlKCkuY2xpT3B0aW9ucyk7XG4gICAgICAgIGRpc3BhdGNoZXIuX2NoYW5nZShzID0+IHNbcGtnLm5hbWVdID0gdmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLndhcm4oYEZhaWxlZCB0byBsb2FkIHBhY2thZ2Ugc2V0dGluZyBmcm9tICR7cGtnLm5hbWV9LyR7anNGaWxlfS5cXG4gRXhwb3J0IG5hbWUgXCIke2RlZmF1bHRTZXR0aW5nRXhwb3J0fVwiIGlzIG5vdCBmb3VuZGApO1xuICAgICAgfVxuICAgICAgLy8gTm90IHVzZWQgZm9yIG5vd1xuICAgICAgaWYgKGV4cHMuZGVmYXVsdCAhPSBudWxsKSB7XG4gICAgICAgIGpzRmlsZXMucHVzaChhYnNGaWxlKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGxvZy5lcnJvcihgRmFpbGVkIHRvIGxvYWQgcGFja2FnZSBzZXR0aW5nIGZyb20gJHtwa2cubmFtZX0vJHtqc0ZpbGV9Licke2RlZmF1bHRTZXR0aW5nRXhwb3J0fWAsIGVycik7XG4gICAgfVxuICB9XG4gIHJldHVybiBqc0ZpbGVzO1xufVxuZXhwb3J0IGRlZmF1bHQgKGNvbmZpZyBhcyBEcmNwQ29uZmlnKTtcbiJdfQ==