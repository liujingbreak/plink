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
const network_util_1 = require("../utils/network-util");
// import {PlinkEnv} from '../node-path';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jb25maWcvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDBDQUEwQztBQUMxQyxvREFBdUI7QUFDdkIsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QixrREFBMEI7QUFDMUIsc0RBQThFO0FBRTlFLHdEQUFpRDtBQUNqRCx5Q0FBeUM7QUFDekMseUNBQTJCO0FBQzNCLG1EQUFxQztBQUNyQyxvREFBNEI7QUFDNUIsaURBQWtFO0FBSWxFLHdDQUF1QztBQUV2QyxvQ0FBb0M7QUFDcEMsb0RBQTRCO0FBQzVCLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBRTVCLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQzdDLE1BQU0sRUFBQyxPQUFPLEVBQUMsR0FBRyxlQUFRLENBQUM7QUFFM0IsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDO0FBRVYsUUFBQSxpQkFBaUIsR0FBRyxJQUFJLEVBQUUsQ0FBQyxlQUFlLENBQStCLFNBQVMsQ0FBQyxDQUFDO0FBRWpHOzs7O0dBSUc7QUFDSCxNQUFNLE1BQU0sR0FBRyxHQUFpQixFQUFFO0lBQ2hDLE9BQU8sdUJBQVEsRUFBa0IsQ0FBQztBQUNwQyxDQUFDLENBQUM7QUFFRixNQUFNLENBQUMsUUFBUSxHQUFHLENBQUMsSUFBZ0IsRUFBRSxFQUFFO0lBQ3JDLHlCQUFVLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQy9CLElBQUksT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLElBQUksSUFBSSxFQUFFO1FBQ3RDLHlEQUF5RDtRQUN6RCxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO0tBQ25EO0lBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFD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RyxLQUFLLENBQUMsQ0FBQzthQUM5QztpQkFBTTtnQkFDTCxHQUFHLENBQUMsSUFBSSxDQUFDLHVDQUF1QyxHQUFHLENBQUMsSUFBSSxJQUFJLE1BQU0sb0JBQW9CLG9CQUFvQixnQkFBZ0IsQ0FBQyxDQUFDO2FBQzdIO1lBQ0QsSUFBSSxxQkFBcUIsSUFBSSxJQUFJLEVBQUU7Z0JBQ2pDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO2FBQy9DO1NBQ0Y7UUFBQyxPQUFPLEdBQUcsRUFBRTtZQUNaLEdBQUcsQ0FBQyxLQUFLLENBQUMsdUNBQXVDLEdBQUcsQ0FBQyxJQUFJLElBQUksTUFBTSxLQUFLLG9CQUFvQixFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FDdEc7S0FDRjtJQUNELE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUM7QUFDRCxrQkFBZ0IsTUFBcUIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIHByZWZlci1jb25zdCwgbWF4LWxlbiAqL1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQge0NvbmZpZ0hhbmRsZXJNZ3IsIERyY3BDb25maWcsIENvbmZpZ0hhbmRsZXJ9IGZyb20gJy4uL2NvbmZpZy1oYW5kbGVyJztcbmltcG9ydCB7R2xvYmFsT3B0aW9ucyBhcyBDbGlPcHRpb25zfSBmcm9tICcuLi9jbWQvdHlwZXMnO1xuaW1wb3J0IHtnZXRMYW5JUHY0fSBmcm9tICcuLi91dGlscy9uZXR3b3JrLXV0aWwnO1xuLy8gaW1wb3J0IHtQbGlua0Vudn0gZnJvbSAnLi4vbm9kZS1wYXRoJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtkaXNwYXRjaGVyLCBnZXRTdGF0ZSwgRHJjcFNldHRpbmdzfSBmcm9tICcuL2NvbmZpZy1zbGljZSc7XG4vLyBSZWZhY3RvcjogY2lyY3VsYXIgcmVmZXJlbmNlXG5pbXBvcnQgKiBhcyBfcGtnTGlzdCBmcm9tICcuLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCAqIGFzIF9wa2dNZ3IgZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHtwbGlua0Vudn0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5pbXBvcnQge1BhY2thZ2VTZXR0aW5nSW50ZXJmfSBmcm9tICcuL2NvbmZpZy50eXBlcyc7XG4vLyBjb25zdCB5YW1sanMgPSByZXF1aXJlKCd5YW1sanMnKTtcbmltcG9ydCB5YW1sanMgZnJvbSAneWFtbGpzJztcbnJlcXVpcmUoJ3lhbWxpZnkvcmVnaXN0ZXInKTtcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuY29uZmlnJyk7XG5jb25zdCB7cm9vdERpcn0gPSBwbGlua0VudjtcblxubGV0IHJvb3RQYXRoID0gcm9vdERpcjtcblxuZXhwb3J0IGNvbnN0IGNvbmZpZ0hhbmRsZXJNZ3IkID0gbmV3IHJ4LkJlaGF2aW9yU3ViamVjdDxDb25maWdIYW5kbGVyTWdyIHwgdW5kZWZpbmVkPih1bmRlZmluZWQpO1xuXG4vKipcbiAqIHJlYWQgYW5kIHJldHVybiBjb25maWd1cmF0aW9uXG4gKiBAbmFtZSBjb25maWdcbiAqIEByZXR1cm4ge29iamVjdH0gc2V0dGluZ1xuICovXG5jb25zdCBjb25maWcgPSAoKTogRHJjcFNldHRpbmdzID0+IHtcbiAgcmV0dXJuIGdldFN0YXRlKCkgYXMgRHJjcFNldHRpbmdzO1xufTtcblxuY29uZmlnLmluaXRTeW5jID0gKGFyZ3Y6IENsaU9wdGlvbnMpID0+IHtcbiAgZGlzcGF0Y2hlci5zYXZlQ2xpT3B0aW9uKGFyZ3YpO1xuICBpZiAocHJvY2Vzcy5lbnYuUExJTktfQ0xJX09QVFMgPT0gbnVsbCkge1xuICAgIC8vIEZvciBjaGlsZCBwcm9jZXNzLCB3b3JrZXIgdGhyZWFkIHRvIGFjY2VzcyBjbGkgb3B0aW9uc1xuICAgIHByb2Nlc3MuZW52LlBMSU5LX0NMSV9PUFRTID0gSlNPTi5zdHJpbmdpZnkoYXJndik7XG4gIH1cbiAgbG9hZChhcmd2KTtcbiAgcmV0dXJuIGdldFN0YXRlKCkgYXMgRHJjcFNldHRpbmdzO1xufTtcblxuXG5jb25maWcucmVsb2FkID0gZnVuY3Rpb24gcmVsb2FkKCkge1xuICBjb25zdCBhcmd2ID0gZ2V0U3RhdGUoKS5jbGlPcHRpb25zITtcbiAgbG9hZChhcmd2KTtcbiAgcmV0dXJuIGdldFN0YXRlKCkgYXMgRHJjcFNldHRpbmdzO1xufTtcblxuY29uZmlnLnNldCA9IGZ1bmN0aW9uKHBhdGg6IHN0cmluZywgdmFsdWU6IGFueSkge1xuICBkaXNwYXRjaGVyLl9jaGFuZ2Uoc2V0dGluZyA9PiB7XG4gICAgXy5zZXQoc2V0dGluZywgcGF0aCwgdmFsdWUpO1xuICB9KTtcbiAgcmV0dXJuIGdldFN0YXRlKCk7XG59O1xuXG5jb25maWcuZ2V0ID0gZnVuY3Rpb24ocHJvcFBhdGg6IHN0cmluZywgZGVmYXVsdFZhbHVlOiBhbnkpIHtcbiAgcmV0dXJuIF8uZ2V0KGdldFN0YXRlKCksIHByb3BQYXRoLCBkZWZhdWx0VmFsdWUpO1xufTtcblxuXG4vKipcbiAqIFJlc29sdmUgYSBwYXRoIGJhc2VkIG9uIGByb290UGF0aGBcbiAqIEBuYW1lIHJlc29sdmVcbiAqIEBtZW1iZXJvZiBjb25maWdcbiAqIEBwYXJhbSAge3N0cmluZ30gcHJvcGVydHkgbmFtZSBvciBwcm9wZXJ0eSBwYXRoLCBsaWtlIFwibmFtZVwiLCBcIm5hbWUuY2hpbGRQcm9wWzFdXCJcbiAqIEByZXR1cm4ge3N0cmluZ30gICAgIGFic29sdXRlIHBhdGhcbiAqL1xuY29uZmlnLnJlc29sdmUgPSBmdW5jdGlvbihwYXRoUHJvcE5hbWU6ICdyb290UGF0aCcgfCAnZGVzdERpcicgfCAnc3RhdGljRGlyJyB8ICdzZXJ2ZXJEaXInLCAuLi5wYXRoczogc3RyaW5nW10pIHtcbiAgY29uc3QgYXJnczogc3RyaW5nW10gPSBbcm9vdFBhdGgsIGdldFN0YXRlKClbcGF0aFByb3BOYW1lXSwgLi4ucGF0aHNdO1xuICByZXR1cm4gUGF0aC5yZXNvbHZlKC4uLmFyZ3MpO1xufTtcblxuLy8gY29uZmlnLmNvbmZpZ3VyZVN0b3JlID0gY29uZmlndXJlU3RvcmU7XG5cbmNvbmZpZy5jb25maWdIYW5kbGVyTWdyID0gY29uZmlnSGFuZGxlck1nciQ7XG5cbmNvbmZpZy5jb25maWdIYW5kbGVyTWdyQ2hhbmdlZCA9IGZ1bmN0aW9uKGNiOiAoaGFuZGxlcjogQ29uZmlnSGFuZGxlck1ncikgPT4gdm9pZCkge1xuICBjb25maWdIYW5kbGVyTWdyJC5waXBlKFxuICAgIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgb3AuZmlsdGVyKGhhbmRsZXIgPT4gaGFuZGxlciAhPSBudWxsKSxcbiAgICBvcC50YXAoaGFuZGxlciA9PiBjYihoYW5kbGVyISkpXG4gICkuc3Vic2NyaWJlKCk7XG59O1xuXG5jb25maWcuY2hhbmdlID0gZnVuY3Rpb24ocmVkdWNlcjogKHNldHRpbmc6IERyY3BTZXR0aW5ncykgPT4gdm9pZCApIHtcbiAgcmV0dXJuIGRpc3BhdGNoZXIuX2NoYW5nZShyZWR1Y2VyKTtcbn07XG5cbi8vIGNvbmZpZy5jb25maWdIYW5kbGVyTWdyQ3JlYXRlZCA9IGZ1bmN0aW9uKGNiOiAoaGFuZGxlcjogQ29uZmlnSGFuZGxlck1ncikgPT4gUHJvbWlzZTxhbnk+IHwgdm9pZCk6IFByb21pc2U8dm9pZD4ge1xuLy8gICByZXR1cm4gY29uZmlnSGFuZGxlck1nciQucGlwZShcbi8vICAgICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuLy8gICAgIG9wLmZpbHRlcihoYW5kbGVyID0+IGhhbmRsZXIgIT0gbnVsbCksXG4vLyAgICAgb3AuY29uY2F0TWFwKGhhbmRsZXIgPT4gUHJvbWlzZS5yZXNvbHZlKGNiKGhhbmRsZXIhKSkpLFxuLy8gICAgIG9wLnRha2UoMSlcbi8vICAgKS50b1Byb21pc2UoKTtcbi8vIH07XG5cbmZ1bmN0aW9uIGxvYWQoY2xpT3B0aW9uOiBDbGlPcHRpb25zKSB7XG4gIGRpc3BhdGNoZXIuX2NoYW5nZShzID0+IHtcbiAgICBzLmxvY2FsSVAgPSBnZXRMYW5JUHY0KCk7XG4gIH0pO1xuICBjb25zdCBwa2dTZXR0aW5nRmlsZXMgPSBsb2FkUGFja2FnZVNldHRpbmdzKCk7XG4gIGNvbnN0IGNvbmZpZ0ZpbGVMaXN0ID0gY2xpT3B0aW9uLmNvbmZpZyB8fCBbXTtcbiAgY29uZmlnRmlsZUxpc3QuZm9yRWFjaChsb2NhbENvbmZpZ1BhdGggPT4gbWVyZ2VGcm9tWWFtbEpzb25GaWxlKGxvY2FsQ29uZmlnUGF0aCkpO1xuICBjb25zdCBoYW5kbGVycyA9IG5ldyBDb25maWdIYW5kbGVyTWdyKFxuICAgIGNvbmZpZ0ZpbGVMaXN0LmZpbHRlcihuYW1lID0+IC9cXC5bdGpdcyQvLnRlc3QobmFtZSkpXG4gICAgICAubWFwPFtmaWxlOiBzdHJpbmcsIGV4cE5hbWU6IHN0cmluZ10+KGl0ZW0gPT4gW1BhdGgucmVzb2x2ZShpdGVtKSwgJ2RlZmF1bHQnXSlcbiAgICAgIC5jb25jYXQocGtnU2V0dGluZ0ZpbGVzKVxuICApO1xuICBjb25maWdIYW5kbGVyTWdyJC5uZXh0KGhhbmRsZXJzKTtcbiAgZGlzcGF0Y2hlci5fY2hhbmdlKGRyYWZ0ID0+IHtcbiAgICBoYW5kbGVycy5ydW5FYWNoU3luYzxDb25maWdIYW5kbGVyPigoX2ZpbGUsIG9iaiwgaGFuZGxlcikgPT4ge1xuICAgICAgaWYgKGhhbmRsZXIub25Db25maWcpIHtcbiAgICAgICAgcmV0dXJuIGhhbmRsZXIub25Db25maWcoZHJhZnQgYXMgRHJjcFNldHRpbmdzLCBkcmFmdC5jbGlPcHRpb25zISk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xuICB2YWxpZGF0ZUNvbmZpZygpO1xuXG4gIGRpc3BhdGNoZXIuX2NoYW5nZShzID0+IHtcbiAgICBzLnBvcnQgPSBub3JtYWxpemVQb3J0KHMucG9ydCk7XG4gIH0pO1xuICBtZXJnZUZyb21DbGlBcmdzKGdldFN0YXRlKCkuY2xpT3B0aW9ucyEpO1xufVxuXG5mdW5jdGlvbiBtZXJnZUZyb21ZYW1sSnNvbkZpbGUobG9jYWxDb25maWdQYXRoOiBzdHJpbmcpIHtcbiAgaWYgKCFmcy5leGlzdHNTeW5jKGxvY2FsQ29uZmlnUGF0aCkpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGxvZy5pbmZvKGNoYWxrLnllbGxvdygnIEZpbGUgZG9lcyBub3QgZXhpc3Q6ICVzJywgbG9jYWxDb25maWdQYXRoKSk7XG4gICAgcmV0dXJuO1xuICB9XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gIGxvZy5pbmZvKGAgUmVhZCAke2xvY2FsQ29uZmlnUGF0aH1gKTtcbiAgdmFyIGNvbmZpZ09iajoge1trZXk6IHN0cmluZ106IGFueX07XG5cbiAgY29uc3QgbWF0Y2hlZCA9IC9cXC4oW14uXSspJC8uZXhlYyhsb2NhbENvbmZpZ1BhdGgpO1xuXG4gIGxldCBzdWZmaXggPSBtYXRjaGVkID8gbWF0Y2hlZFsxXSA6IG51bGw7XG4gIGlmIChzdWZmaXggPT09ICd5YW1sJyB8fCBzdWZmaXggPT09ICd5bWwnKSB7XG4gICAgY29uZmlnT2JqID0geWFtbGpzLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhsb2NhbENvbmZpZ1BhdGgsICd1dGY4JykpO1xuICB9IGVsc2UgaWYgKHN1ZmZpeCA9PT0gJ2pzb24nKSB7XG4gICAgY29uZmlnT2JqID0gcmVxdWlyZShQYXRoLnJlc29sdmUobG9jYWxDb25maWdQYXRoKSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgZGlzcGF0Y2hlci5fY2hhbmdlKHNldHRpbmcgPT4ge1xuICAgIF8uYXNzaWduV2l0aChzZXR0aW5nLCBjb25maWdPYmosIChvYmpWYWx1ZSwgc3JjVmFsdWUsIGtleSwgb2JqZWN0LCBzb3VyY2UpID0+IHtcbiAgICAgIGlmIChfLmlzT2JqZWN0KG9ialZhbHVlKSAmJiAhQXJyYXkuaXNBcnJheShvYmpWYWx1ZSkpIHtcbiAgICAgICAgLy8gV2Ugb25seSBtZXJnZSAxc3QgYW5kIDJuZCBsZXZlbCBwcm9wZXJ0aWVzXG4gICAgICAgIHJldHVybiBfLmFzc2lnbihvYmpWYWx1ZSwgc3JjVmFsdWUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gbWVyZ2VGcm9tQ2xpQXJncyhjbGlPcHQ6IENsaU9wdGlvbnMpIHtcbiAgaWYgKCFjbGlPcHQucHJvcClcbiAgICByZXR1cm47XG4gIGZvciAobGV0IHByb3BQYWlyIG9mIGNsaU9wdC5wcm9wKSB7XG4gICAgY29uc3QgcHJvcFNldCA9IHByb3BQYWlyLnNwbGl0KCc9Jyk7XG4gICAgbGV0IHByb3BQYXRoID0gcHJvcFNldFswXTtcbiAgICBpZiAoXy5zdGFydHNXaXRoKHByb3BTZXRbMF0sICdbJykpXG4gICAgICBwcm9wUGF0aCA9IEpTT04ucGFyc2UocHJvcFNldFswXSk7XG4gICAgbGV0IHZhbHVlOiBhbnk7XG4gICAgdHJ5IHtcbiAgICAgIHZhbHVlID0gSlNPTi5wYXJzZShwcm9wU2V0WzFdKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB2YWx1ZSA9IHByb3BTZXRbMV0gPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogcHJvcFNldFsxXTtcbiAgICB9XG4gICAgZGlzcGF0Y2hlci5fY2hhbmdlKHMgPT4gXy5zZXQocywgcHJvcFBhdGgsIHZhbHVlKSk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBsb2cuaW5mbyhgW2NvbmZpZ10gc2V0ICR7cHJvcFBhdGh9ID0gJHt2YWx1ZSBhcyBzdHJpbmd9YCk7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiB2YWxpZGF0ZUNvbmZpZygpIHtcbiAgLy8gVE9ETzoganNvbiBzY2hlbWEgdmFsaWRhdGlvblxufVxuXG4vLyBmdW5jdGlvbiB0cmltVGFpbFNsYXNoKHVybDogc3RyaW5nKSB7XG4vLyAgIGlmICh1cmwgPT09ICcvJykge1xuLy8gICAgIHJldHVybiB1cmw7XG4vLyAgIH1cbi8vICAgcmV0dXJuIF8uZW5kc1dpdGgodXJsLCAnLycpID8gdXJsLnN1YnN0cmluZygwLCB1cmwubGVuZ3RoIC0gMSkgOiB1cmw7XG4vLyB9XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZVBvcnQodmFsOiBzdHJpbmcgfCBudW1iZXIpIHtcbiAgbGV0IHBvcnQ6IG51bWJlciA9IHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnID8gcGFyc2VJbnQodmFsLCAxMCkgOiB2YWw7XG5cbiAgaWYgKGlzTmFOKHBvcnQpKSB7XG4gICAgLy8gbmFtZWQgcGlwZVxuICAgIHJldHVybiB2YWw7XG4gIH1cblxuICBpZiAocG9ydCA+PSAwKSB7XG4gICAgLy8gcG9ydCBudW1iZXJcbiAgICByZXR1cm4gcG9ydDtcbiAgfVxuXG4gIHJldHVybiA4MDgwO1xufVxuXG50eXBlIFBhY2thZ2VJbmZvID0gUmV0dXJuVHlwZTwodHlwZW9mIF9wa2dMaXN0KVsncGFja2FnZXM0V29ya3NwYWNlJ10+IGV4dGVuZHMgR2VuZXJhdG9yPGluZmVyIFQ+ID8gVCA6IHVua25vd247XG5cbi8qKlxuICogQHJldHVybnMgW2RlZmF1bHRWYWx1ZUZpbGUsIGV4cG9ydE5hbWUsIGR0c0ZpbGVdXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiogZ2V0UGFja2FnZVNldHRpbmdGaWxlcyh3b3Jrc3BhY2VLZXk6IHN0cmluZywgaW5jbHVkZVBrZz86IFNldDxzdHJpbmc+KTogR2VuZXJhdG9yPFtcbiAgLyoqIHJlbGF0aXZlIHBhdGggd2l0aGluIHBhY2thZ2UgcmVhbHBhdGgsIHdpdGhvdXQgZXh0IGZpbGUgbmFtZSAqL1xuICB0eXBlRmlsZVdpdGhvdXRFeHQ6IHN0cmluZyxcbiAgdHlwZUV4cG9ydE5hbWU6IHN0cmluZyxcbiAgLyoqIHJlbGF0aXZlIHBhdGggb2YganMgZmlsZSwgd2hpY2ggZXhwb3J0cyBkZWZhdWx0IHZhbHVlIG9yIGZhY3RvcnkgZnVuY3Rpb24gb2YgZGVmYXVsdCB2YWx1ZSAqL1xuICBqc0ZpbGU6IHN0cmluZyxcbiAgZGVmYXVsdEV4cG9ydE5hbWU6IHN0cmluZyxcbiAgcGtnOiBQYWNrYWdlSW5mb1xuXT4ge1xuICBjb25zdCB7cGFja2FnZXM0V29ya3NwYWNlS2V5fSA9IHJlcXVpcmUoJy4uL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInKSBhcyB0eXBlb2YgX3BrZ0xpc3Q7XG4gIGZvciAoY29uc3QgcGtnIG9mIHBhY2thZ2VzNFdvcmtzcGFjZUtleSh3b3Jrc3BhY2VLZXksIHRydWUpKSB7XG4gICAgaWYgKGluY2x1ZGVQa2cgJiYgIWluY2x1ZGVQa2cuaGFzKHBrZy5uYW1lKSlcbiAgICAgIGNvbnRpbnVlO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGRyID0gcGtnLmpzb24uZHIgfHwgcGtnLmpzb24ucGxpbmshO1xuICAgICAgaWYgKGRyID09IG51bGwgfHwgdHlwZW9mIGRyLnNldHRpbmcgIT09ICdvYmplY3QnKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY29uc3Qgc2V0dGluZyA9IGRyLnNldHRpbmc7XG4gICAgICBsb2cuZGVidWcoJ2dldFBhY2thZ2VTZXR0aW5nRmlsZXMnLCBwa2cubmFtZSwgc2V0dGluZyk7XG4gICAgICBsZXQgW3ZhbHVlRmlsZSwgdmFsdWVFeHBvcnRdID0gc2V0dGluZy52YWx1ZS5zcGxpdCgnIycsIDIpO1xuXG4gICAgICAvLyBDaGVjayB2YWx1ZSBmaWxlXG4gICAgICBjb25zdCBleHQgPSBQYXRoLmV4dG5hbWUodmFsdWVGaWxlKTtcbiAgICAgIGlmIChleHQgPT09ICcnKSB7XG4gICAgICAgIHZhbHVlRmlsZSA9IHZhbHVlRmlsZSArICcuanMnO1xuICAgICAgfVxuICAgICAgaWYgKHZhbHVlRXhwb3J0ID09IG51bGwpXG4gICAgICAgIHZhbHVlRXhwb3J0ID0gJ2RlZmF1bHQnO1xuXG4gICAgICBjb25zdCBhYnNGaWxlID0gUGF0aC5yZXNvbHZlKHBrZy5yZWFsUGF0aCwgdmFsdWVGaWxlKTtcbiAgICAgIGlmICghZnMuZXhpc3RzU3luYyhhYnNGaWxlKSkge1xuICAgICAgICBsb2cud2FybihgUGFja2FnZSAke3BrZy5uYW1lfSdzIGNvbmZpZ3VyZSBmaWxlIFwiJHthYnNGaWxlfVwiIGRvZXMgbm90IGV4aXN0LCBza2lwcGVkLmApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIC8vIENoZWNrIGR0cyB0eXBlIGZpbGVcbiAgICAgIGxldCBbdHlwZUZpbGUsIHR5cGVFeHBvcnROYW1lXSA9IHNldHRpbmcudHlwZS5zcGxpdCgnIycsIDIpO1xuICAgICAgbGV0IHR5cGVGaWxlRXh0ID0gUGF0aC5leHRuYW1lKHR5cGVGaWxlKTtcbiAgICAgIGlmICh0eXBlRmlsZUV4dCA9PT0gJycpIHtcbiAgICAgICAgdHlwZUZpbGUgKz0gJy5kdHMnO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBhYnNUeXBlRmlsZSA9IFBhdGgucmVzb2x2ZShwa2cucmVhbFBhdGgsIHR5cGVGaWxlRXh0KTtcbiAgICAgIGlmICghZnMuZXhpc3RzU3luYyhhYnNUeXBlRmlsZSkpIHtcbiAgICAgICAgbG9nLndhcm4oYFBhY2thZ2Ugc2V0dGluZyAke3BrZy5uYW1lfSdzIGR0cyBmaWxlIFwiJHthYnNUeXBlRmlsZX1cIiBkb2VzIG5vdCBleGlzdCwgc2tpcHBlZC5gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAodHlwZUV4cG9ydE5hbWUgPT0gbnVsbCkge1xuICAgICAgICBsb2cuZXJyb3IoYEluY29ycmVjdCBwYWNrYWdlIGNvbmZpZyBwcm9wZXJ0eSBmb3JtYXQgXCIke3NldHRpbmcudHlwZX1cIiBpbiAke3BrZy5yZWFsUGF0aCArIFBhdGguc2VwfXBhY2thZ2UuanNvbmAgK1xuICAgICAgICAgICcsIGNvcnJlY3QgZm9ybWF0IGlzIFwiPGR0cy1maWxlLXJlbGF0aXZlLXBhdGg+IzxUUy10eXBlLWV4cG9ydC1uYW1lPlwiJyk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgeWllbGQgW3R5cGVGaWxlLnJlcGxhY2UoL1xcLlteLi9cXFxcXSskL2csICcnKSwgdHlwZUV4cG9ydE5hbWUsIHZhbHVlRmlsZSwgdmFsdWVFeHBvcnQsIHBrZ107XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBsb2cud2FybihgU2tpcCBsb2FkaW5nIHNldHRpbmcgb2YgcGFja2FnZSAke3BrZy5uYW1lfSwgZHVlIHRvICh0aGlzIG1pZ2h0IGJlIGNhdXNlZCBieSBpbmNvcnJlY3QgcGFja2FnZS5qc29uIGZvcm1hdClgLCBlcnIpO1xuICAgIH1cbiAgfVxufVxuLyoqXG4gKiBAcmV0dXJucyBhYnN1bHRlIHBhdGggb2Ygc2V0dGluZyBKUyBmaWxlcyB3aGljaCBjb250YWlucyBleHBvcnRzIG5hbWVkIHdpdGggXCJkZWZhdWx0XCJcbiAqL1xuZnVuY3Rpb24gbG9hZFBhY2thZ2VTZXR0aW5ncygpOiBbZmlsZTogc3RyaW5nLCBleHBvcnROYW1lOiBzdHJpbmddW10ge1xuICBjb25zdCB7d29ya3NwYWNlS2V5LCBpc0N3ZFdvcmtzcGFjZX0gPSByZXF1aXJlKCcuLi9wYWNrYWdlLW1ncicpIGFzIHR5cGVvZiBfcGtnTWdyO1xuICBpZiAoIWlzQ3dkV29ya3NwYWNlKCkpIHtcbiAgICBsb2cuZGVidWcoJ05vdCBpbiBhIHdvcmtzcGFjZSwgc2tpcCBsb2FkaW5nIHBhY2thZ2Ugc2V0dGluZ3MnKTtcbiAgICByZXR1cm4gW107XG4gIH1cbiAgY29uc3QganNGaWxlczogW2ZpbGU6IHN0cmluZywgZXhwb3J0TmFtZTogc3RyaW5nXVtdID0gW107XG4gIGZvciAoY29uc3QgW190eXBlRmlsZSwgX3R5cGVFeHBvcnQsIGpzRmlsZSwgZGVmYXVsdFNldHRpbmdFeHBvcnQsIHBrZ10gb2YgZ2V0UGFja2FnZVNldHRpbmdGaWxlcyh3b3Jrc3BhY2VLZXkocGxpbmtFbnYud29ya0RpcikpKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGFic0ZpbGUgPSBQYXRoLnJlc29sdmUocGtnLnJlYWxQYXRoLCBqc0ZpbGUpO1xuICAgICAgY29uc3QgZXhwcyA9IHJlcXVpcmUoYWJzRmlsZSk7XG4gICAgICBjb25zdCBkZWZhdWx0U2V0dGluZ0ZhY3Rvcnk6IFBhY2thZ2VTZXR0aW5nSW50ZXJmPGFueT4gPSBleHBzW2RlZmF1bHRTZXR0aW5nRXhwb3J0XTtcblxuICAgICAgaWYgKHR5cGVvZiBkZWZhdWx0U2V0dGluZ0ZhY3RvcnkgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBkZWZhdWx0U2V0dGluZ0ZhY3RvcnkoZ2V0U3RhdGUoKS5jbGlPcHRpb25zISk7XG4gICAgICAgIGRpc3BhdGNoZXIuX2NoYW5nZShzID0+IHNbcGtnLm5hbWVdID0gdmFsdWUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLndhcm4oYEZhaWxlZCB0byBsb2FkIHBhY2thZ2Ugc2V0dGluZyBmcm9tICR7cGtnLm5hbWV9LyR7anNGaWxlfS5cXG4gRXhwb3J0IG5hbWUgXCIke2RlZmF1bHRTZXR0aW5nRXhwb3J0fVwiIGlzIG5vdCBmb3VuZGApO1xuICAgICAgfVxuICAgICAgaWYgKGRlZmF1bHRTZXR0aW5nRmFjdG9yeSAhPSBudWxsKSB7XG4gICAgICAgIGpzRmlsZXMucHVzaChbYWJzRmlsZSwgZGVmYXVsdFNldHRpbmdFeHBvcnRdKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGxvZy5lcnJvcihgRmFpbGVkIHRvIGxvYWQgcGFja2FnZSBzZXR0aW5nIGZyb20gJHtwa2cubmFtZX0vJHtqc0ZpbGV9Licke2RlZmF1bHRTZXR0aW5nRXhwb3J0fWAsIGVycik7XG4gICAgfVxuICB9XG4gIHJldHVybiBqc0ZpbGVzO1xufVxuZXhwb3J0IGRlZmF1bHQgKGNvbmZpZyBhcyBEcmNwQ29uZmlnKTtcbiJdfQ==