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
exports.configHandlerMgr$ = new rx.BehaviorSubject(undefined);
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
    if (process.env.PLINK_CLI_OPTS == null) {
        // For child process, worker thread to access cli options
        process.env.PLINK_CLI_OPTS = JSON.stringify(argv);
    }
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
config.configHandlerMgr = exports.configHandlerMgr$;
config.configHandlerMgrChanged = function (cb) {
    exports.configHandlerMgr$.pipe(op.distinctUntilChanged(), op.filter(handler => handler != null), op.tap(handler => cb(handler))).subscribe();
};
config.change = function (reducer) {
    return config_slice_1.dispatcher._change(reducer);
};
// config.configHandlerMgrCreated = function(cb: (handler: ConfigHandlerMgr) => Promise<any> | void): Promise<void> {
//   return configHandlerMgr$.pipe(
//     op.distinctUntilChanged(),
//     op.filter(handler => handler != null),
//     op.concatMap(handler => Promise.resolve(cb(handler!))),
//     op.take(1)
//   ).toPromise();
// };
function load(cliOption) {
    config_slice_1.dispatcher._change(s => {
        s.localIP = network_util_1.getLanIPv4();
    });
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
    mergeFromCliArgs(config_slice_1.getState().cliOptions);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jb25maWcvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDBDQUEwQztBQUMxQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUM1QixvREFBdUI7QUFDdkIsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QixrREFBMEI7QUFDMUIsc0RBQThFO0FBRTlFLHdEQUFpRDtBQUNqRCx5Q0FBeUM7QUFDekMseUNBQTJCO0FBQzNCLG1EQUFxQztBQUNyQyxvREFBNEI7QUFDNUIsaURBQWtFO0FBSWxFLHdDQUF1QztBQUd2QyxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUM3QyxvQ0FBb0M7QUFDcEMsb0RBQTRCO0FBQzVCLE1BQU0sRUFBQyxPQUFPLEVBQUMsR0FBRyxlQUFRLENBQUM7QUFFM0IsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDO0FBRVYsUUFBQSxpQkFBaUIsR0FBRyxJQUFJLEVBQUUsQ0FBQyxlQUFlLENBQStCLFNBQVMsQ0FBQyxDQUFDO0FBRWpHOzs7O0dBSUc7QUFDSCxNQUFNLE1BQU0sR0FBRyxHQUFpQixFQUFFO0lBQ2hDLE9BQU8sdUJBQVEsRUFBa0IsQ0FBQztBQUNwQyxDQUFDLENBQUM7QUFFRixNQUFNLENBQUMsUUFBUSxHQUFHLENBQUMsSUFBZ0IsRUFBRSxFQUFFO0lBQ3JDLHlCQUFVLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQy9CLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLElBQUksSUFBSSxFQUFFO1FBQ3RDLHlEQUF5RDtRQUN6RCxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ25EO0lBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFD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RyxLQUFLLENBQUMsQ0FBQzthQUM5QztpQkFBTTtnQkFDTCxHQUFHLENBQUMsSUFBSSxDQUFDLHVDQUF1QyxHQUFHLENBQUMsSUFBSSxJQUFJLE1BQU0sb0JBQW9CLG9CQUFvQixnQkFBZ0IsQ0FBQyxDQUFDO2FBQzdIO1lBQ0QsSUFBSSxxQkFBcUIsSUFBSSxJQUFJLEVBQUU7Z0JBQ2pDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO2FBQy9DO1NBQ0Y7UUFBQyxPQUFPLEdBQUcsRUFBRTtZQUNaLEdBQUcsQ0FBQyxLQUFLLENBQUMsdUNBQXVDLEdBQUcsQ0FBQyxJQUFJLElBQUksTUFBTSxLQUFLLG9CQUFvQixFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FDdEc7S0FDRjtJQUNELE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUM7QUFDRCxrQkFBZ0IsTUFBcUIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIHByZWZlci1jb25zdCwgbWF4LWxlbiAqL1xucmVxdWlyZSgneWFtbGlmeS9yZWdpc3RlcicpO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQge0NvbmZpZ0hhbmRsZXJNZ3IsIERyY3BDb25maWcsIENvbmZpZ0hhbmRsZXJ9IGZyb20gJy4uL2NvbmZpZy1oYW5kbGVyJztcbmltcG9ydCB7R2xvYmFsT3B0aW9ucyBhcyBDbGlPcHRpb25zfSBmcm9tICcuLi9jbWQvdHlwZXMnO1xuaW1wb3J0IHtnZXRMYW5JUHY0fSBmcm9tICcuLi91dGlscy9uZXR3b3JrLXV0aWwnO1xuLy8gaW1wb3J0IHtQbGlua0Vudn0gZnJvbSAnLi4vbm9kZS1wYXRoJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtkaXNwYXRjaGVyLCBnZXRTdGF0ZSwgRHJjcFNldHRpbmdzfSBmcm9tICcuL2NvbmZpZy1zbGljZSc7XG4vLyBSZWZhY3RvcjogY2lyY3VsYXIgcmVmZXJlbmNlXG5pbXBvcnQgKiBhcyBfcGtnTGlzdCBmcm9tICcuLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCAqIGFzIF9wa2dNZ3IgZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHtwbGlua0Vudn0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5pbXBvcnQge1BhY2thZ2VTZXR0aW5nSW50ZXJmfSBmcm9tICcuL2NvbmZpZy50eXBlcyc7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLmNvbmZpZycpO1xuLy8gY29uc3QgeWFtbGpzID0gcmVxdWlyZSgneWFtbGpzJyk7XG5pbXBvcnQgeWFtbGpzIGZyb20gJ3lhbWxqcyc7XG5jb25zdCB7cm9vdERpcn0gPSBwbGlua0VudjtcblxubGV0IHJvb3RQYXRoID0gcm9vdERpcjtcblxuZXhwb3J0IGNvbnN0IGNvbmZpZ0hhbmRsZXJNZ3IkID0gbmV3IHJ4LkJlaGF2aW9yU3ViamVjdDxDb25maWdIYW5kbGVyTWdyIHwgdW5kZWZpbmVkPih1bmRlZmluZWQpO1xuXG4vKipcbiAqIHJlYWQgYW5kIHJldHVybiBjb25maWd1cmF0aW9uXG4gKiBAbmFtZSBjb25maWdcbiAqIEByZXR1cm4ge29iamVjdH0gc2V0dGluZ1xuICovXG5jb25zdCBjb25maWcgPSAoKTogRHJjcFNldHRpbmdzID0+IHtcbiAgcmV0dXJuIGdldFN0YXRlKCkgYXMgRHJjcFNldHRpbmdzO1xufTtcblxuY29uZmlnLmluaXRTeW5jID0gKGFyZ3Y6IENsaU9wdGlvbnMpID0+IHtcbiAgZGlzcGF0Y2hlci5zYXZlQ2xpT3B0aW9uKGFyZ3YpO1xuICBpZiAocHJvY2Vzcy5lbnYuUExJTktfQ0xJX09QVFMgPT0gbnVsbCkge1xuICAgIC8vIEZvciBjaGlsZCBwcm9jZXNzLCB3b3JrZXIgdGhyZWFkIHRvIGFjY2VzcyBjbGkgb3B0aW9uc1xuICAgIHByb2Nlc3MuZW52LlBMSU5LX0NMSV9PUFRTID0gSlNPTi5zdHJpbmdpZnkoYXJndik7XG4gIH1cbiAgbG9hZChhcmd2KTtcbiAgcmV0dXJuIGdldFN0YXRlKCkgYXMgRHJjcFNldHRpbmdzO1xufTtcblxuXG5jb25maWcucmVsb2FkID0gZnVuY3Rpb24gcmVsb2FkKCkge1xuICBjb25zdCBhcmd2ID0gZ2V0U3RhdGUoKS5jbGlPcHRpb25zITtcbiAgbG9hZChhcmd2KTtcbiAgcmV0dXJuIGdldFN0YXRlKCkgYXMgRHJjcFNldHRpbmdzO1xufTtcblxuY29uZmlnLnNldCA9IGZ1bmN0aW9uKHBhdGg6IHN0cmluZywgdmFsdWU6IGFueSkge1xuICBkaXNwYXRjaGVyLl9jaGFuZ2Uoc2V0dGluZyA9PiB7XG4gICAgXy5zZXQoc2V0dGluZywgcGF0aCwgdmFsdWUpO1xuICB9KTtcbiAgcmV0dXJuIGdldFN0YXRlKCk7XG59O1xuXG5jb25maWcuZ2V0ID0gZnVuY3Rpb24ocHJvcFBhdGg6IHN0cmluZywgZGVmYXVsdFZhbHVlOiBhbnkpIHtcbiAgcmV0dXJuIF8uZ2V0KGdldFN0YXRlKCksIHByb3BQYXRoLCBkZWZhdWx0VmFsdWUpO1xufTtcblxuXG4vKipcbiAqIFJlc29sdmUgYSBwYXRoIGJhc2VkIG9uIGByb290UGF0aGBcbiAqIEBuYW1lIHJlc29sdmVcbiAqIEBtZW1iZXJvZiBjb25maWdcbiAqIEBwYXJhbSAge3N0cmluZ30gcHJvcGVydHkgbmFtZSBvciBwcm9wZXJ0eSBwYXRoLCBsaWtlIFwibmFtZVwiLCBcIm5hbWUuY2hpbGRQcm9wWzFdXCJcbiAqIEByZXR1cm4ge3N0cmluZ30gICAgIGFic29sdXRlIHBhdGhcbiAqL1xuY29uZmlnLnJlc29sdmUgPSBmdW5jdGlvbihwYXRoUHJvcE5hbWU6ICdyb290UGF0aCcgfCAnZGVzdERpcid8J3N0YXRpY0Rpcid8J3NlcnZlckRpcicsIC4uLnBhdGhzOiBzdHJpbmdbXSkge1xuICBjb25zdCBhcmdzOiBzdHJpbmdbXSA9IFtyb290UGF0aCwgZ2V0U3RhdGUoKVtwYXRoUHJvcE5hbWVdLCAuLi5wYXRoc107XG4gIHJldHVybiBQYXRoLnJlc29sdmUoLi4uYXJncyk7XG59O1xuXG4vLyBjb25maWcuY29uZmlndXJlU3RvcmUgPSBjb25maWd1cmVTdG9yZTtcblxuY29uZmlnLmNvbmZpZ0hhbmRsZXJNZ3IgPSBjb25maWdIYW5kbGVyTWdyJDtcblxuY29uZmlnLmNvbmZpZ0hhbmRsZXJNZ3JDaGFuZ2VkID0gZnVuY3Rpb24oY2I6IChoYW5kbGVyOiBDb25maWdIYW5kbGVyTWdyKSA9PiB2b2lkKSB7XG4gIGNvbmZpZ0hhbmRsZXJNZ3IkLnBpcGUoXG4gICAgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICBvcC5maWx0ZXIoaGFuZGxlciA9PiBoYW5kbGVyICE9IG51bGwpLFxuICAgIG9wLnRhcChoYW5kbGVyID0+IGNiKGhhbmRsZXIhKSlcbiAgKS5zdWJzY3JpYmUoKTtcbn07XG5cbmNvbmZpZy5jaGFuZ2UgPSBmdW5jdGlvbihyZWR1Y2VyOiAoc2V0dGluZzogRHJjcFNldHRpbmdzKSA9PiB2b2lkICkge1xuICByZXR1cm4gZGlzcGF0Y2hlci5fY2hhbmdlKHJlZHVjZXIpO1xufVxuXG4vLyBjb25maWcuY29uZmlnSGFuZGxlck1nckNyZWF0ZWQgPSBmdW5jdGlvbihjYjogKGhhbmRsZXI6IENvbmZpZ0hhbmRsZXJNZ3IpID0+IFByb21pc2U8YW55PiB8IHZvaWQpOiBQcm9taXNlPHZvaWQ+IHtcbi8vICAgcmV0dXJuIGNvbmZpZ0hhbmRsZXJNZ3IkLnBpcGUoXG4vLyAgICAgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbi8vICAgICBvcC5maWx0ZXIoaGFuZGxlciA9PiBoYW5kbGVyICE9IG51bGwpLFxuLy8gICAgIG9wLmNvbmNhdE1hcChoYW5kbGVyID0+IFByb21pc2UucmVzb2x2ZShjYihoYW5kbGVyISkpKSxcbi8vICAgICBvcC50YWtlKDEpXG4vLyAgICkudG9Qcm9taXNlKCk7XG4vLyB9O1xuXG5mdW5jdGlvbiBsb2FkKGNsaU9wdGlvbjogQ2xpT3B0aW9ucykge1xuICBkaXNwYXRjaGVyLl9jaGFuZ2UocyA9PiB7XG4gICAgcy5sb2NhbElQID0gZ2V0TGFuSVB2NCgpO1xuICB9KTtcbiAgY29uc3QgcGtnU2V0dGluZ0ZpbGVzID0gbG9hZFBhY2thZ2VTZXR0aW5ncygpO1xuICBjb25zdCBjb25maWdGaWxlTGlzdCA9IGNsaU9wdGlvbi5jb25maWcgfHwgW107XG4gIGNvbmZpZ0ZpbGVMaXN0LmZvckVhY2gobG9jYWxDb25maWdQYXRoID0+IG1lcmdlRnJvbVlhbWxKc29uRmlsZShsb2NhbENvbmZpZ1BhdGgpKTtcbiAgY29uc3QgaGFuZGxlcnMgPSBuZXcgQ29uZmlnSGFuZGxlck1ncihcbiAgICBjb25maWdGaWxlTGlzdC5maWx0ZXIobmFtZSA9PiAvXFwuW3RqXXMkLy50ZXN0KG5hbWUpKVxuICAgICAgLm1hcDxbZmlsZTogc3RyaW5nLCBleHBOYW1lOiBzdHJpbmddPihpdGVtID0+IFtQYXRoLnJlc29sdmUoaXRlbSksICdkZWZhdWx0J10pXG4gICAgICAuY29uY2F0KHBrZ1NldHRpbmdGaWxlcylcbiAgKTtcbiAgY29uZmlnSGFuZGxlck1nciQubmV4dChoYW5kbGVycyk7XG4gIGRpc3BhdGNoZXIuX2NoYW5nZShkcmFmdCA9PiB7XG4gICAgaGFuZGxlcnMucnVuRWFjaFN5bmM8Q29uZmlnSGFuZGxlcj4oKF9maWxlLCBvYmosIGhhbmRsZXIpID0+IHtcbiAgICAgIGlmIChoYW5kbGVyLm9uQ29uZmlnKSB7XG4gICAgICAgIHJldHVybiBoYW5kbGVyLm9uQ29uZmlnKGRyYWZ0IGFzIERyY3BTZXR0aW5ncywgZHJhZnQuY2xpT3B0aW9ucyEpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbiAgdmFsaWRhdGVDb25maWcoKTtcblxuICBkaXNwYXRjaGVyLl9jaGFuZ2UocyA9PiB7XG4gICAgcy5wb3J0ID0gbm9ybWFsaXplUG9ydChzLnBvcnQpO1xuICB9KTtcbiAgbWVyZ2VGcm9tQ2xpQXJncyhnZXRTdGF0ZSgpLmNsaU9wdGlvbnMhKTtcbn1cblxuZnVuY3Rpb24gbWVyZ2VGcm9tWWFtbEpzb25GaWxlKGxvY2FsQ29uZmlnUGF0aDogc3RyaW5nKSB7XG4gIGlmICghZnMuZXhpc3RzU3luYyhsb2NhbENvbmZpZ1BhdGgpKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBsb2cuaW5mbyhjaGFsay55ZWxsb3coJyBGaWxlIGRvZXMgbm90IGV4aXN0OiAlcycsIGxvY2FsQ29uZmlnUGF0aCkpO1xuICAgIHJldHVybjtcbiAgfVxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICBsb2cuaW5mbyhgIFJlYWQgJHtsb2NhbENvbmZpZ1BhdGh9YCk7XG4gIHZhciBjb25maWdPYmo6IHtba2V5OiBzdHJpbmddOiBhbnl9O1xuXG4gIGNvbnN0IG1hdGNoZWQgPSAvXFwuKFteLl0rKSQvLmV4ZWMobG9jYWxDb25maWdQYXRoKTtcblxuICBsZXQgc3VmZml4ID0gbWF0Y2hlZCA/IG1hdGNoZWRbMV0gOiBudWxsO1xuICBpZiAoc3VmZml4ID09PSAneWFtbCcgfHwgc3VmZml4ID09PSAneW1sJykge1xuICAgIGNvbmZpZ09iaiA9IHlhbWxqcy5wYXJzZShmcy5yZWFkRmlsZVN5bmMobG9jYWxDb25maWdQYXRoLCAndXRmOCcpKTtcbiAgfSBlbHNlIGlmIChzdWZmaXggPT09ICdqc29uJykge1xuICAgIGNvbmZpZ09iaiA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKGxvY2FsQ29uZmlnUGF0aCkpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGRpc3BhdGNoZXIuX2NoYW5nZShzZXR0aW5nID0+IHtcbiAgICBfLmFzc2lnbldpdGgoc2V0dGluZywgY29uZmlnT2JqLCAob2JqVmFsdWUsIHNyY1ZhbHVlLCBrZXksIG9iamVjdCwgc291cmNlKSA9PiB7XG4gICAgICBpZiAoXy5pc09iamVjdChvYmpWYWx1ZSkgJiYgIUFycmF5LmlzQXJyYXkob2JqVmFsdWUpKSB7XG4gICAgICAgIC8vIFdlIG9ubHkgbWVyZ2UgMXN0IGFuZCAybmQgbGV2ZWwgcHJvcGVydGllc1xuICAgICAgICByZXR1cm4gXy5hc3NpZ24ob2JqVmFsdWUsIHNyY1ZhbHVlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIG1lcmdlRnJvbUNsaUFyZ3MoY2xpT3B0OiBDbGlPcHRpb25zKSB7XG4gIGlmICghY2xpT3B0LnByb3ApXG4gICAgcmV0dXJuO1xuICBmb3IgKGxldCBwcm9wUGFpciBvZiBjbGlPcHQucHJvcCkge1xuICAgIGNvbnN0IHByb3BTZXQgPSBwcm9wUGFpci5zcGxpdCgnPScpO1xuICAgIGxldCBwcm9wUGF0aCA9IHByb3BTZXRbMF07XG4gICAgaWYgKF8uc3RhcnRzV2l0aChwcm9wU2V0WzBdLCAnWycpKVxuICAgICAgcHJvcFBhdGggPSBKU09OLnBhcnNlKHByb3BTZXRbMF0pO1xuICAgIGxldCB2YWx1ZTogYW55O1xuICAgIHRyeSB7XG4gICAgICB2YWx1ZSA9IEpTT04ucGFyc2UocHJvcFNldFsxXSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdmFsdWUgPSBwcm9wU2V0WzFdID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IHByb3BTZXRbMV07XG4gICAgfVxuICAgIGRpc3BhdGNoZXIuX2NoYW5nZShzID0+IF8uc2V0KHMsIHByb3BQYXRoLCB2YWx1ZSkpO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgbG9nLmluZm8oYFtjb25maWddIHNldCAke3Byb3BQYXRofSA9ICR7dmFsdWUgYXMgc3RyaW5nfWApO1xuICB9XG59XG5cblxuZnVuY3Rpb24gdmFsaWRhdGVDb25maWcoKSB7XG4gIC8vIFRPRE86IGpzb24gc2NoZW1hIHZhbGlkYXRpb25cbn1cblxuLy8gZnVuY3Rpb24gdHJpbVRhaWxTbGFzaCh1cmw6IHN0cmluZykge1xuLy8gICBpZiAodXJsID09PSAnLycpIHtcbi8vICAgICByZXR1cm4gdXJsO1xuLy8gICB9XG4vLyAgIHJldHVybiBfLmVuZHNXaXRoKHVybCwgJy8nKSA/IHVybC5zdWJzdHJpbmcoMCwgdXJsLmxlbmd0aCAtIDEpIDogdXJsO1xuLy8gfVxuXG5mdW5jdGlvbiBub3JtYWxpemVQb3J0KHZhbDogc3RyaW5nIHwgbnVtYmVyKSB7XG4gIGxldCBwb3J0OiBudW1iZXIgPSB0eXBlb2YgdmFsID09PSAnc3RyaW5nJyA/IHBhcnNlSW50KHZhbCwgMTApIDogdmFsO1xuXG4gIGlmIChpc05hTihwb3J0KSkge1xuICAgIC8vIG5hbWVkIHBpcGVcbiAgICByZXR1cm4gdmFsO1xuICB9XG5cbiAgaWYgKHBvcnQgPj0gMCkge1xuICAgIC8vIHBvcnQgbnVtYmVyXG4gICAgcmV0dXJuIHBvcnQ7XG4gIH1cblxuICByZXR1cm4gODA4MDtcbn1cblxudHlwZSBQYWNrYWdlSW5mbyA9IFJldHVyblR5cGU8KHR5cGVvZiBfcGtnTGlzdClbJ3BhY2thZ2VzNFdvcmtzcGFjZSddPiBleHRlbmRzIEdlbmVyYXRvcjxpbmZlciBUPiA/IFQgOiB1bmtub3duO1xuXG4vKipcbiAqIEByZXR1cm5zIFtkZWZhdWx0VmFsdWVGaWxlLCBleHBvcnROYW1lLCBkdHNGaWxlXVxuICovXG5leHBvcnQgZnVuY3Rpb24qIGdldFBhY2thZ2VTZXR0aW5nRmlsZXMod29ya3NwYWNlS2V5OiBzdHJpbmcsIGluY2x1ZGVQa2c/OiBTZXQ8c3RyaW5nPik6IEdlbmVyYXRvcjxbXG4gIC8qKiByZWxhdGl2ZSBwYXRoIHdpdGhpbiBwYWNrYWdlIHJlYWxwYXRoLCB3aXRob3V0IGV4dCBmaWxlIG5hbWUgKi9cbiAgdHlwZUZpbGVXaXRob3V0RXh0OiBzdHJpbmcsXG4gIHR5cGVFeHBvcnROYW1lOiBzdHJpbmcsXG4gIC8qKiByZWxhdGl2ZSBwYXRoIG9mIGpzIGZpbGUsIHdoaWNoIGV4cG9ydHMgZGVmYXVsdCB2YWx1ZSBvciBmYWN0b3J5IGZ1bmN0aW9uIG9mIGRlZmF1bHQgdmFsdWUgKi9cbiAganNGaWxlOiBzdHJpbmcsXG4gIGRlZmF1bHRFeHBvcnROYW1lOiBzdHJpbmcsXG4gIHBrZzogUGFja2FnZUluZm9cbl0+IHtcbiAgY29uc3Qge3BhY2thZ2VzNFdvcmtzcGFjZUtleX0gPSByZXF1aXJlKCcuLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJykgYXMgdHlwZW9mIF9wa2dMaXN0O1xuICBmb3IgKGNvbnN0IHBrZyBvZiBwYWNrYWdlczRXb3Jrc3BhY2VLZXkod29ya3NwYWNlS2V5LCB0cnVlKSkge1xuICAgIGlmIChpbmNsdWRlUGtnICYmICFpbmNsdWRlUGtnLmhhcyhwa2cubmFtZSkpXG4gICAgICBjb250aW51ZTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBkciA9IHBrZy5qc29uLmRyIHx8IHBrZy5qc29uLnBsaW5rITtcbiAgICAgIGlmIChkciA9PSBudWxsIHx8IHR5cGVvZiBkci5zZXR0aW5nICE9PSAnb2JqZWN0Jykge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHNldHRpbmcgPSBkci5zZXR0aW5nO1xuICAgICAgbG9nLmRlYnVnKCdnZXRQYWNrYWdlU2V0dGluZ0ZpbGVzJywgcGtnLm5hbWUsIHNldHRpbmcpO1xuICAgICAgbGV0IFt2YWx1ZUZpbGUsIHZhbHVlRXhwb3J0XSA9IHNldHRpbmcudmFsdWUuc3BsaXQoJyMnLCAyKTtcblxuICAgICAgLy8gQ2hlY2sgdmFsdWUgZmlsZVxuICAgICAgY29uc3QgZXh0ID0gUGF0aC5leHRuYW1lKHZhbHVlRmlsZSk7XG4gICAgICBpZiAoZXh0ID09PSAnJykge1xuICAgICAgICB2YWx1ZUZpbGUgPSB2YWx1ZUZpbGUgKyAnLmpzJztcbiAgICAgIH1cbiAgICAgIGlmICh2YWx1ZUV4cG9ydCA9PSBudWxsKVxuICAgICAgICB2YWx1ZUV4cG9ydCA9ICdkZWZhdWx0JztcblxuICAgICAgY29uc3QgYWJzRmlsZSA9IFBhdGgucmVzb2x2ZShwa2cucmVhbFBhdGgsIHZhbHVlRmlsZSk7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoYWJzRmlsZSkpIHtcbiAgICAgICAgbG9nLndhcm4oYFBhY2thZ2UgJHtwa2cubmFtZX0ncyBjb25maWd1cmUgZmlsZSBcIiR7YWJzRmlsZX1cIiBkb2VzIG5vdCBleGlzdCwgc2tpcHBlZC5gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICAvLyBDaGVjayBkdHMgdHlwZSBmaWxlXG4gICAgICBsZXQgW3R5cGVGaWxlLCB0eXBlRXhwb3J0TmFtZV0gPSBzZXR0aW5nLnR5cGUuc3BsaXQoJyMnLCAyKTtcbiAgICAgIGxldCB0eXBlRmlsZUV4dCA9IFBhdGguZXh0bmFtZSh0eXBlRmlsZSk7XG4gICAgICBpZiAodHlwZUZpbGVFeHQgPT09ICcnKSB7XG4gICAgICAgIHR5cGVGaWxlICs9ICcuZHRzJztcbiAgICAgIH1cblxuICAgICAgY29uc3QgYWJzVHlwZUZpbGUgPSBQYXRoLnJlc29sdmUocGtnLnJlYWxQYXRoLCB0eXBlRmlsZUV4dCk7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoYWJzVHlwZUZpbGUpKSB7XG4gICAgICAgIGxvZy53YXJuKGBQYWNrYWdlIHNldHRpbmcgJHtwa2cubmFtZX0ncyBkdHMgZmlsZSBcIiR7YWJzVHlwZUZpbGV9XCIgZG9lcyBub3QgZXhpc3QsIHNraXBwZWQuYCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVFeHBvcnROYW1lID09IG51bGwpIHtcbiAgICAgICAgbG9nLmVycm9yKGBJbmNvcnJlY3QgcGFja2FnZSBjb25maWcgcHJvcGVydHkgZm9ybWF0IFwiJHtzZXR0aW5nLnR5cGV9XCIgaW4gJHtwa2cucmVhbFBhdGggKyBQYXRoLnNlcH1wYWNrYWdlLmpzb25gICtcbiAgICAgICAgICAnLCBjb3JyZWN0IGZvcm1hdCBpcyBcIjxkdHMtZmlsZS1yZWxhdGl2ZS1wYXRoPiM8VFMtdHlwZS1leHBvcnQtbmFtZT5cIicpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHlpZWxkIFt0eXBlRmlsZS5yZXBsYWNlKC9cXC5bXi4vXFxcXF0rJC9nLCAnJyksIHR5cGVFeHBvcnROYW1lLCB2YWx1ZUZpbGUsIHZhbHVlRXhwb3J0LCBwa2ddO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgbG9nLndhcm4oYFNraXAgbG9hZGluZyBzZXR0aW5nIG9mIHBhY2thZ2UgJHtwa2cubmFtZX0sIGR1ZSB0byAodGhpcyBtaWdodCBiZSBjYXVzZWQgYnkgaW5jb3JyZWN0IHBhY2thZ2UuanNvbiBmb3JtYXQpYCwgZXJyKTtcbiAgICB9XG4gIH1cbn1cbi8qKlxuICogQHJldHVybnMgYWJzdWx0ZSBwYXRoIG9mIHNldHRpbmcgSlMgZmlsZXMgd2hpY2ggY29udGFpbnMgZXhwb3J0cyBuYW1lZCB3aXRoIFwiZGVmYXVsdFwiXG4gKi9cbmZ1bmN0aW9uIGxvYWRQYWNrYWdlU2V0dGluZ3MoKTogW2ZpbGU6IHN0cmluZywgZXhwb3J0TmFtZTogc3RyaW5nXVtdIHtcbiAgY29uc3Qge3dvcmtzcGFjZUtleSwgaXNDd2RXb3Jrc3BhY2V9ID0gcmVxdWlyZSgnLi4vcGFja2FnZS1tZ3InKSBhcyB0eXBlb2YgX3BrZ01ncjtcbiAgaWYgKCFpc0N3ZFdvcmtzcGFjZSgpKSB7XG4gICAgbG9nLmRlYnVnKCdOb3QgaW4gYSB3b3Jrc3BhY2UsIHNraXAgbG9hZGluZyBwYWNrYWdlIHNldHRpbmdzJyk7XG4gICAgcmV0dXJuIFtdO1xuICB9XG4gIGNvbnN0IGpzRmlsZXM6IFtmaWxlOiBzdHJpbmcsIGV4cG9ydE5hbWU6IHN0cmluZ11bXSA9IFtdO1xuICBmb3IgKGNvbnN0IFtfdHlwZUZpbGUsIF90eXBlRXhwb3J0LCBqc0ZpbGUsIGRlZmF1bHRTZXR0aW5nRXhwb3J0LCBwa2ddIG9mIGdldFBhY2thZ2VTZXR0aW5nRmlsZXMod29ya3NwYWNlS2V5KHBsaW5rRW52LndvcmtEaXIpKSkge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBhYnNGaWxlID0gUGF0aC5yZXNvbHZlKHBrZy5yZWFsUGF0aCwganNGaWxlKTtcbiAgICAgIGNvbnN0IGV4cHMgPSByZXF1aXJlKGFic0ZpbGUpO1xuICAgICAgY29uc3QgZGVmYXVsdFNldHRpbmdGYWN0b3J5OiBQYWNrYWdlU2V0dGluZ0ludGVyZjxhbnk+ID0gZXhwc1tkZWZhdWx0U2V0dGluZ0V4cG9ydF07XG5cbiAgICAgIGlmICh0eXBlb2YgZGVmYXVsdFNldHRpbmdGYWN0b3J5ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gZGVmYXVsdFNldHRpbmdGYWN0b3J5KGdldFN0YXRlKCkuY2xpT3B0aW9ucyEpO1xuICAgICAgICBkaXNwYXRjaGVyLl9jaGFuZ2UocyA9PiBzW3BrZy5uYW1lXSA9IHZhbHVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy53YXJuKGBGYWlsZWQgdG8gbG9hZCBwYWNrYWdlIHNldHRpbmcgZnJvbSAke3BrZy5uYW1lfS8ke2pzRmlsZX0uXFxuIEV4cG9ydCBuYW1lIFwiJHtkZWZhdWx0U2V0dGluZ0V4cG9ydH1cIiBpcyBub3QgZm91bmRgKTtcbiAgICAgIH1cbiAgICAgIGlmIChkZWZhdWx0U2V0dGluZ0ZhY3RvcnkgIT0gbnVsbCkge1xuICAgICAgICBqc0ZpbGVzLnB1c2goW2Fic0ZpbGUsIGRlZmF1bHRTZXR0aW5nRXhwb3J0XSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBsb2cuZXJyb3IoYEZhaWxlZCB0byBsb2FkIHBhY2thZ2Ugc2V0dGluZyBmcm9tICR7cGtnLm5hbWV9LyR7anNGaWxlfS4nJHtkZWZhdWx0U2V0dGluZ0V4cG9ydH1gLCBlcnIpO1xuICAgIH1cbiAgfVxuICByZXR1cm4ganNGaWxlcztcbn1cbmV4cG9ydCBkZWZhdWx0IChjb25maWcgYXMgRHJjcENvbmZpZyk7XG4iXX0=