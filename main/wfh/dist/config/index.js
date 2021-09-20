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
    load((0, config_slice_1.getState)().cliOptions);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jb25maWcvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDBDQUEwQztBQUMxQyxvREFBdUI7QUFDdkIsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QixrREFBMEI7QUFDMUIsc0RBQThFO0FBRTlFLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMsb0RBQTRCO0FBQzVCLGlEQUE2RTtBQUk3RSx3Q0FBdUM7QUFFdkMsb0NBQW9DO0FBQ3BDLG9EQUE0QjtBQUM1QixPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUU1QixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUM3QyxNQUFNLEVBQUMsT0FBTyxFQUFDLEdBQUcsZUFBUSxDQUFDO0FBRTNCLElBQUksUUFBUSxHQUFHLE9BQU8sQ0FBQztBQUVWLFFBQUEsaUJBQWlCLEdBQUcsSUFBSSxFQUFFLENBQUMsZUFBZSxDQUErQixTQUFTLENBQUMsQ0FBQztBQUVqRzs7OztHQUlHO0FBQ0gsTUFBTSxNQUFNLEdBQUcsR0FBa0IsRUFBRTtJQUNqQyxPQUFPLElBQUEsdUJBQVEsR0FBRSxDQUFDO0FBQ3BCLENBQUMsQ0FBQztBQUVGLE1BQU0sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxJQUFnQixFQUFFLEVBQUU7SUFDckMseUJBQVUsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDL0IseURBQXlEO0lBQ3pELE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEQsSUFBSSxDQUFDLElBQUEsdUJBQVEsR0FBRSxDQUFDLFVBQVcsQ0FBQyxDQUFDO0lBQzdCLE9BQU8sSUFBQSx1QkFBUSxHQUFFLENBQUM7QUFDcEIsQ0FBQyxDQUFDO0FBR0YsTUFB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LENBQUMsSUFBSSxJQUFJLE1BQU0sb0JBQW9CLG9CQUFvQixnQkFBZ0IsQ0FBQyxDQUFDO2FBQzdIO1lBQ0QsSUFBSSxxQkFBcUIsSUFBSSxJQUFJLEVBQUU7Z0JBQ2pDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO2FBQy9DO1NBQ0Y7UUFBQyxPQUFPLEdBQUcsRUFBRTtZQUNaLEdBQUcsQ0FBQyxLQUFLLENBQUMsdUNBQXVDLEdBQUcsQ0FBQyxJQUFJLElBQUksTUFBTSxLQUFLLG9CQUFvQixFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FDdEc7S0FDRjtJQUNELE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUM7QUFDRCxrQkFBZ0IsTUFBcUIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIHByZWZlci1jb25zdCwgbWF4LWxlbiAqL1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQge0NvbmZpZ0hhbmRsZXJNZ3IsIERyY3BDb25maWcsIENvbmZpZ0hhbmRsZXJ9IGZyb20gJy4uL2NvbmZpZy1oYW5kbGVyJztcbmltcG9ydCB7R2xvYmFsT3B0aW9ucyBhcyBDbGlPcHRpb25zfSBmcm9tICcuLi9jbWQvdHlwZXMnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQge2Rpc3BhdGNoZXIsIGdldFN0YXRlLCBQbGlua1NldHRpbmdzLCBnZXRTdG9yZX0gZnJvbSAnLi9jb25maWctc2xpY2UnO1xuLy8gUmVmYWN0b3I6IGNpcmN1bGFyIHJlZmVyZW5jZVxuaW1wb3J0ICogYXMgX3BrZ0xpc3QgZnJvbSAnLi4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcic7XG5pbXBvcnQgKiBhcyBfcGtnTWdyIGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCB7cGxpbmtFbnZ9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0IHtQYWNrYWdlU2V0dGluZ0ludGVyZn0gZnJvbSAnLi9jb25maWcudHlwZXMnO1xuLy8gY29uc3QgeWFtbGpzID0gcmVxdWlyZSgneWFtbGpzJyk7XG5pbXBvcnQgeWFtbGpzIGZyb20gJ3lhbWxqcyc7XG5yZXF1aXJlKCd5YW1saWZ5L3JlZ2lzdGVyJyk7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLmNvbmZpZycpO1xuY29uc3Qge3Jvb3REaXJ9ID0gcGxpbmtFbnY7XG5cbmxldCByb290UGF0aCA9IHJvb3REaXI7XG5cbmV4cG9ydCBjb25zdCBjb25maWdIYW5kbGVyTWdyJCA9IG5ldyByeC5CZWhhdmlvclN1YmplY3Q8Q29uZmlnSGFuZGxlck1nciB8IHVuZGVmaW5lZD4odW5kZWZpbmVkKTtcblxuLyoqXG4gKiByZWFkIGFuZCByZXR1cm4gY29uZmlndXJhdGlvblxuICogQG5hbWUgY29uZmlnXG4gKiBAcmV0dXJuIHtvYmplY3R9IHNldHRpbmdcbiAqL1xuY29uc3QgY29uZmlnID0gKCk6IFBsaW5rU2V0dGluZ3MgPT4ge1xuICByZXR1cm4gZ2V0U3RhdGUoKTtcbn07XG5cbmNvbmZpZy5pbml0U3luYyA9IChhcmd2OiBDbGlPcHRpb25zKSA9PiB7XG4gIGRpc3BhdGNoZXIuc2F2ZUNsaU9wdGlvbihhcmd2KTtcbiAgLy8gRm9yIGNoaWxkIHByb2Nlc3MsIHdvcmtlciB0aHJlYWQgdG8gYWNjZXNzIGNsaSBvcHRpb25zXG4gIHByb2Nlc3MuZW52LlBMSU5LX0NMSV9PUFRTID0gSlNPTi5zdHJpbmdpZnkoYXJndik7XG4gIGxvYWQoZ2V0U3RhdGUoKS5jbGlPcHRpb25zISk7XG4gIHJldHVybiBnZXRTdGF0ZSgpO1xufTtcblxuXG5jb25maWcucmVsb2FkID0gZnVuY3Rpb24gcmVsb2FkKCkge1xuICBjb25zdCBhcmd2ID0gZ2V0U3RhdGUoKS5jbGlPcHRpb25zITtcbiAgbG9hZChhcmd2KTtcbiAgcmV0dXJuIGdldFN0YXRlKCk7XG59O1xuXG5jb25maWcuc2V0ID0gZnVuY3Rpb24ocGF0aDogc3RyaW5nLCB2YWx1ZTogYW55KSB7XG4gIGRpc3BhdGNoZXIuX2NoYW5nZShzZXR0aW5nID0+IHtcbiAgICBfLnNldChzZXR0aW5nLCBwYXRoLCB2YWx1ZSk7XG4gIH0pO1xuICByZXR1cm4gZ2V0U3RhdGUoKTtcbn07XG5cbmNvbmZpZy5nZXQgPSBmdW5jdGlvbihwcm9wUGF0aDogc3RyaW5nLCBkZWZhdWx0VmFsdWU6IGFueSkge1xuICByZXR1cm4gXy5nZXQoZ2V0U3RhdGUoKSwgcHJvcFBhdGgsIGRlZmF1bHRWYWx1ZSk7XG59O1xuXG5cbi8qKlxuICogUmVzb2x2ZSBhIHBhdGggYmFzZWQgb24gYHJvb3RQYXRoYFxuICogQG5hbWUgcmVzb2x2ZVxuICogQG1lbWJlcm9mIGNvbmZpZ1xuICogQHBhcmFtICB7c3RyaW5nfSBwcm9wZXJ0eSBuYW1lIG9yIHByb3BlcnR5IHBhdGgsIGxpa2UgXCJuYW1lXCIsIFwibmFtZS5jaGlsZFByb3BbMV1cIlxuICogQHJldHVybiB7c3RyaW5nfSAgICAgYWJzb2x1dGUgcGF0aFxuICovXG5jb25maWcucmVzb2x2ZSA9IGZ1bmN0aW9uKHBhdGhQcm9wTmFtZTogJ3Jvb3RQYXRoJyB8ICdkZXN0RGlyJyB8ICdzdGF0aWNEaXInIHwgJ3NlcnZlckRpcicsIC4uLnBhdGhzOiBzdHJpbmdbXSkge1xuICBjb25zdCBhcmdzOiBzdHJpbmdbXSA9IFtyb290UGF0aCwgZ2V0U3RhdGUoKVtwYXRoUHJvcE5hbWVdLCAuLi5wYXRoc107XG4gIHJldHVybiBQYXRoLnJlc29sdmUoLi4uYXJncyk7XG59O1xuXG4vLyBjb25maWcuY29uZmlndXJlU3RvcmUgPSBjb25maWd1cmVTdG9yZTtcblxuY29uZmlnLmNvbmZpZ0hhbmRsZXJNZ3IgPSBjb25maWdIYW5kbGVyTWdyJDtcblxuY29uZmlnLmNvbmZpZ0hhbmRsZXJNZ3JDaGFuZ2VkID0gZnVuY3Rpb24oY2I6IChoYW5kbGVyOiBDb25maWdIYW5kbGVyTWdyKSA9PiB2b2lkKSB7XG4gIGNvbmZpZ0hhbmRsZXJNZ3IkLnBpcGUoXG4gICAgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICBvcC5maWx0ZXIoaGFuZGxlciA9PiBoYW5kbGVyICE9IG51bGwpLFxuICAgIG9wLnRhcChoYW5kbGVyID0+IGNiKGhhbmRsZXIhKSlcbiAgKS5zdWJzY3JpYmUoKTtcbn07XG5cbmNvbmZpZy5jaGFuZ2UgPSBmdW5jdGlvbihyZWR1Y2VyOiAoc2V0dGluZzogUGxpbmtTZXR0aW5ncykgPT4gdm9pZCApIHtcbiAgcmV0dXJuIGRpc3BhdGNoZXIuX2NoYW5nZShyZWR1Y2VyKTtcbn07XG5cbmNvbmZpZy5nZXRTdG9yZSA9IGdldFN0b3JlO1xuXG4vLyBjb25maWcuY29uZmlnSGFuZGxlck1nckNyZWF0ZWQgPSBmdW5jdGlvbihjYjogKGhhbmRsZXI6IENvbmZpZ0hhbmRsZXJNZ3IpID0+IFByb21pc2U8YW55PiB8IHZvaWQpOiBQcm9taXNlPHZvaWQ+IHtcbi8vICAgcmV0dXJuIGNvbmZpZ0hhbmRsZXJNZ3IkLnBpcGUoXG4vLyAgICAgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbi8vICAgICBvcC5maWx0ZXIoaGFuZGxlciA9PiBoYW5kbGVyICE9IG51bGwpLFxuLy8gICAgIG9wLmNvbmNhdE1hcChoYW5kbGVyID0+IFByb21pc2UucmVzb2x2ZShjYihoYW5kbGVyISkpKSxcbi8vICAgICBvcC50YWtlKDEpXG4vLyAgICkudG9Qcm9taXNlKCk7XG4vLyB9O1xuXG5mdW5jdGlvbiBsb2FkKGNsaU9wdGlvbjogQ2xpT3B0aW9ucykge1xuICBjb25zdCBwa2dTZXR0aW5nRmlsZXMgPSBsb2FkUGFja2FnZVNldHRpbmdzKCk7XG4gIGNvbnN0IGNvbmZpZ0ZpbGVMaXN0ID0gY2xpT3B0aW9uLmNvbmZpZyB8fCBbXTtcbiAgY29uZmlnRmlsZUxpc3QuZm9yRWFjaChsb2NhbENvbmZpZ1BhdGggPT4gbWVyZ2VGcm9tWWFtbEpzb25GaWxlKGxvY2FsQ29uZmlnUGF0aCkpO1xuICBjb25zdCBoYW5kbGVycyA9IG5ldyBDb25maWdIYW5kbGVyTWdyKFxuICAgIGNvbmZpZ0ZpbGVMaXN0LmZpbHRlcihuYW1lID0+IC9cXC5bdGpdcyQvLnRlc3QobmFtZSkpXG4gICAgICAubWFwPFtmaWxlOiBzdHJpbmcsIGV4cE5hbWU6IHN0cmluZ10+KGl0ZW0gPT4gW1BhdGgucmVzb2x2ZShpdGVtKSwgJ2RlZmF1bHQnXSlcbiAgICAgIC5jb25jYXQocGtnU2V0dGluZ0ZpbGVzKVxuICApO1xuICBjb25maWdIYW5kbGVyTWdyJC5uZXh0KGhhbmRsZXJzKTtcbiAgZGlzcGF0Y2hlci5fY2hhbmdlKGRyYWZ0ID0+IHtcbiAgICBoYW5kbGVycy5ydW5FYWNoU3luYzxDb25maWdIYW5kbGVyPigoX2ZpbGUsIG9iaiwgaGFuZGxlcikgPT4ge1xuICAgICAgaWYgKGhhbmRsZXIub25Db25maWcpIHtcbiAgICAgICAgcmV0dXJuIGhhbmRsZXIub25Db25maWcoZHJhZnQgLCBkcmFmdC5jbGlPcHRpb25zISk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xuICB2YWxpZGF0ZUNvbmZpZygpO1xuXG4gIGRpc3BhdGNoZXIuX2NoYW5nZShzID0+IHtcbiAgICBzLnBvcnQgPSBub3JtYWxpemVQb3J0KHMucG9ydCk7XG4gIH0pO1xuICBtZXJnZUZyb21DbGlBcmdzKGdldFN0YXRlKCkuY2xpT3B0aW9ucyEpO1xufVxuXG5mdW5jdGlvbiBtZXJnZUZyb21ZYW1sSnNvbkZpbGUobG9jYWxDb25maWdQYXRoOiBzdHJpbmcpIHtcbiAgaWYgKCFmcy5leGlzdHNTeW5jKGxvY2FsQ29uZmlnUGF0aCkpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGxvZy5pbmZvKGNoYWxrLnllbGxvdygnIEZpbGUgZG9lcyBub3QgZXhpc3Q6ICVzJywgbG9jYWxDb25maWdQYXRoKSk7XG4gICAgcmV0dXJuO1xuICB9XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gIGxvZy5pbmZvKGAgUmVhZCAke2xvY2FsQ29uZmlnUGF0aH1gKTtcbiAgdmFyIGNvbmZpZ09iajoge1trZXk6IHN0cmluZ106IGFueX07XG5cbiAgY29uc3QgbWF0Y2hlZCA9IC9cXC4oW14uXSspJC8uZXhlYyhsb2NhbENvbmZpZ1BhdGgpO1xuXG4gIGxldCBzdWZmaXggPSBtYXRjaGVkID8gbWF0Y2hlZFsxXSA6IG51bGw7XG4gIGlmIChzdWZmaXggPT09ICd5YW1sJyB8fCBzdWZmaXggPT09ICd5bWwnKSB7XG4gICAgY29uZmlnT2JqID0geWFtbGpzLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhsb2NhbENvbmZpZ1BhdGgsICd1dGY4JykpO1xuICB9IGVsc2UgaWYgKHN1ZmZpeCA9PT0gJ2pzb24nKSB7XG4gICAgY29uZmlnT2JqID0gcmVxdWlyZShQYXRoLnJlc29sdmUobG9jYWxDb25maWdQYXRoKSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgZGlzcGF0Y2hlci5fY2hhbmdlKHNldHRpbmcgPT4ge1xuICAgIF8uYXNzaWduV2l0aChzZXR0aW5nLCBjb25maWdPYmosIChvYmpWYWx1ZSwgc3JjVmFsdWUsIGtleSwgb2JqZWN0LCBzb3VyY2UpID0+IHtcbiAgICAgIGlmIChfLmlzT2JqZWN0KG9ialZhbHVlKSAmJiAhQXJyYXkuaXNBcnJheShvYmpWYWx1ZSkpIHtcbiAgICAgICAgLy8gV2Ugb25seSBtZXJnZSAxc3QgYW5kIDJuZCBsZXZlbCBwcm9wZXJ0aWVzXG4gICAgICAgIHJldHVybiBfLmFzc2lnbihvYmpWYWx1ZSwgc3JjVmFsdWUpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gbWVyZ2VGcm9tQ2xpQXJncyhjbGlPcHQ6IENsaU9wdGlvbnMpIHtcbiAgaWYgKCFjbGlPcHQucHJvcClcbiAgICByZXR1cm47XG4gIGZvciAobGV0IHByb3BQYWlyIG9mIGNsaU9wdC5wcm9wKSB7XG4gICAgY29uc3QgcHJvcFNldCA9IHByb3BQYWlyLnNwbGl0KCc9Jyk7XG4gICAgbGV0IHByb3BQYXRoID0gcHJvcFNldFswXTtcbiAgICBpZiAoXy5zdGFydHNXaXRoKHByb3BTZXRbMF0sICdbJykpXG4gICAgICBwcm9wUGF0aCA9IEpTT04ucGFyc2UocHJvcFNldFswXSk7XG4gICAgbGV0IHZhbHVlOiBhbnk7XG4gICAgdHJ5IHtcbiAgICAgIHZhbHVlID0gSlNPTi5wYXJzZShwcm9wU2V0WzFdKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB2YWx1ZSA9IHByb3BTZXRbMV0gPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogcHJvcFNldFsxXTtcbiAgICB9XG4gICAgZGlzcGF0Y2hlci5fY2hhbmdlKHMgPT4gXy5zZXQocywgcHJvcFBhdGgsIHZhbHVlKSk7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBsb2cuaW5mbyhgW2NvbmZpZ10gc2V0ICR7cHJvcFBhdGh9ID0gJHt2YWx1ZSBhcyBzdHJpbmd9YCk7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiB2YWxpZGF0ZUNvbmZpZygpIHtcbiAgLy8gVE9ETzoganNvbiBzY2hlbWEgdmFsaWRhdGlvblxufVxuXG4vLyBmdW5jdGlvbiB0cmltVGFpbFNsYXNoKHVybDogc3RyaW5nKSB7XG4vLyAgIGlmICh1cmwgPT09ICcvJykge1xuLy8gICAgIHJldHVybiB1cmw7XG4vLyAgIH1cbi8vICAgcmV0dXJuIF8uZW5kc1dpdGgodXJsLCAnLycpID8gdXJsLnN1YnN0cmluZygwLCB1cmwubGVuZ3RoIC0gMSkgOiB1cmw7XG4vLyB9XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZVBvcnQodmFsOiBzdHJpbmcgfCBudW1iZXIpIHtcbiAgbGV0IHBvcnQ6IG51bWJlciA9IHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnID8gcGFyc2VJbnQodmFsLCAxMCkgOiB2YWw7XG5cbiAgaWYgKGlzTmFOKHBvcnQpKSB7XG4gICAgLy8gbmFtZWQgcGlwZVxuICAgIHJldHVybiB2YWw7XG4gIH1cblxuICBpZiAocG9ydCA+PSAwKSB7XG4gICAgLy8gcG9ydCBudW1iZXJcbiAgICByZXR1cm4gcG9ydDtcbiAgfVxuXG4gIHJldHVybiA4MDgwO1xufVxuXG50eXBlIFBhY2thZ2VJbmZvID0gUmV0dXJuVHlwZTwodHlwZW9mIF9wa2dMaXN0KVsncGFja2FnZXM0V29ya3NwYWNlJ10+IGV4dGVuZHMgR2VuZXJhdG9yPGluZmVyIFQ+ID8gVCA6IHVua25vd247XG5cbi8qKlxuICogQHJldHVybnMgW2RlZmF1bHRWYWx1ZUZpbGUsIGV4cG9ydE5hbWUsIGR0c0ZpbGVdXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiogZ2V0UGFja2FnZVNldHRpbmdGaWxlcyh3b3Jrc3BhY2VLZXk6IHN0cmluZywgaW5jbHVkZVBrZz86IFNldDxzdHJpbmc+KTogR2VuZXJhdG9yPFtcbiAgLyoqIHJlbGF0aXZlIHBhdGggd2l0aGluIHBhY2thZ2UgcmVhbHBhdGgsIHdpdGhvdXQgZXh0IGZpbGUgbmFtZSAqL1xuICB0eXBlRmlsZVdpdGhvdXRFeHQ6IHN0cmluZyxcbiAgdHlwZUV4cG9ydE5hbWU6IHN0cmluZyxcbiAgLyoqIHJlbGF0aXZlIHBhdGggb2YganMgZmlsZSwgd2hpY2ggZXhwb3J0cyBkZWZhdWx0IHZhbHVlIG9yIGZhY3RvcnkgZnVuY3Rpb24gb2YgZGVmYXVsdCB2YWx1ZSAqL1xuICBqc0ZpbGU6IHN0cmluZyxcbiAgZGVmYXVsdEV4cG9ydE5hbWU6IHN0cmluZyxcbiAgcGtnOiBQYWNrYWdlSW5mb1xuXT4ge1xuICBjb25zdCB7cGFja2FnZXM0V29ya3NwYWNlS2V5fSA9IHJlcXVpcmUoJy4uL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInKSBhcyB0eXBlb2YgX3BrZ0xpc3Q7XG4gIGZvciAoY29uc3QgcGtnIG9mIHBhY2thZ2VzNFdvcmtzcGFjZUtleSh3b3Jrc3BhY2VLZXksIHRydWUpKSB7XG4gICAgaWYgKGluY2x1ZGVQa2cgJiYgIWluY2x1ZGVQa2cuaGFzKHBrZy5uYW1lKSlcbiAgICAgIGNvbnRpbnVlO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGRyID0gcGtnLmpzb24uZHIgfHwgcGtnLmpzb24ucGxpbmshO1xuICAgICAgaWYgKGRyID09IG51bGwgfHwgdHlwZW9mIGRyLnNldHRpbmcgIT09ICdvYmplY3QnKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY29uc3Qgc2V0dGluZyA9IGRyLnNldHRpbmc7XG4gICAgICBsb2cuZGVidWcoJ2dldFBhY2thZ2VTZXR0aW5nRmlsZXMnLCBwa2cubmFtZSwgc2V0dGluZyk7XG4gICAgICBsZXQgW3ZhbHVlRmlsZSwgdmFsdWVFeHBvcnRdID0gc2V0dGluZy52YWx1ZS5zcGxpdCgnIycsIDIpO1xuXG4gICAgICAvLyBDaGVjayB2YWx1ZSBmaWxlXG4gICAgICBjb25zdCBleHQgPSBQYXRoLmV4dG5hbWUodmFsdWVGaWxlKTtcbiAgICAgIGlmIChleHQgPT09ICcnKSB7XG4gICAgICAgIHZhbHVlRmlsZSA9IHZhbHVlRmlsZSArICcuanMnO1xuICAgICAgfVxuICAgICAgaWYgKHZhbHVlRXhwb3J0ID09IG51bGwpXG4gICAgICAgIHZhbHVlRXhwb3J0ID0gJ2RlZmF1bHQnO1xuXG4gICAgICBjb25zdCBhYnNGaWxlID0gUGF0aC5yZXNvbHZlKHBrZy5yZWFsUGF0aCwgdmFsdWVGaWxlKTtcbiAgICAgIGlmICghZnMuZXhpc3RzU3luYyhhYnNGaWxlKSkge1xuICAgICAgICBsb2cud2FybihgUGFja2FnZSAke3BrZy5uYW1lfSdzIGNvbmZpZ3VyZSBmaWxlIFwiJHthYnNGaWxlfVwiIGRvZXMgbm90IGV4aXN0LCBza2lwcGVkLmApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIC8vIENoZWNrIGR0cyB0eXBlIGZpbGVcbiAgICAgIGxldCBbdHlwZUZpbGUsIHR5cGVFeHBvcnROYW1lXSA9IHNldHRpbmcudHlwZS5zcGxpdCgnIycsIDIpO1xuICAgICAgbGV0IHR5cGVGaWxlRXh0ID0gUGF0aC5leHRuYW1lKHR5cGVGaWxlKTtcbiAgICAgIGlmICh0eXBlRmlsZUV4dCA9PT0gJycpIHtcbiAgICAgICAgdHlwZUZpbGUgKz0gJy5kdHMnO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBhYnNUeXBlRmlsZSA9IFBhdGgucmVzb2x2ZShwa2cucmVhbFBhdGgsIHR5cGVGaWxlRXh0KTtcbiAgICAgIGlmICghZnMuZXhpc3RzU3luYyhhYnNUeXBlRmlsZSkpIHtcbiAgICAgICAgbG9nLndhcm4oYFBhY2thZ2Ugc2V0dGluZyAke3BrZy5uYW1lfSdzIGR0cyBmaWxlIFwiJHthYnNUeXBlRmlsZX1cIiBkb2VzIG5vdCBleGlzdCwgc2tpcHBlZC5gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBpZiAodHlwZUV4cG9ydE5hbWUgPT0gbnVsbCkge1xuICAgICAgICBsb2cuZXJyb3IoYEluY29ycmVjdCBwYWNrYWdlIGNvbmZpZyBwcm9wZXJ0eSBmb3JtYXQgXCIke3NldHRpbmcudHlwZX1cIiBpbiAke3BrZy5yZWFsUGF0aCArIFBhdGguc2VwfXBhY2thZ2UuanNvbmAgK1xuICAgICAgICAgICcsIGNvcnJlY3QgZm9ybWF0IGlzIFwiPGR0cy1maWxlLXJlbGF0aXZlLXBhdGg+IzxUUy10eXBlLWV4cG9ydC1uYW1lPlwiJyk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgeWllbGQgW3R5cGVGaWxlLnJlcGxhY2UoL1xcLlteLi9cXFxcXSskL2csICcnKSwgdHlwZUV4cG9ydE5hbWUsIHZhbHVlRmlsZSwgdmFsdWVFeHBvcnQsIHBrZ107XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBsb2cud2FybihgU2tpcCBsb2FkaW5nIHNldHRpbmcgb2YgcGFja2FnZSAke3BrZy5uYW1lfSwgZHVlIHRvICh0aGlzIG1pZ2h0IGJlIGNhdXNlZCBieSBpbmNvcnJlY3QgcGFja2FnZS5qc29uIGZvcm1hdClgLCBlcnIpO1xuICAgIH1cbiAgfVxufVxuLyoqXG4gKiBAcmV0dXJucyBhYnN1bHRlIHBhdGggb2Ygc2V0dGluZyBKUyBmaWxlcyB3aGljaCBjb250YWlucyBleHBvcnRzIG5hbWVkIHdpdGggXCJkZWZhdWx0XCJcbiAqL1xuZnVuY3Rpb24gbG9hZFBhY2thZ2VTZXR0aW5ncygpOiBbZmlsZTogc3RyaW5nLCBleHBvcnROYW1lOiBzdHJpbmddW10ge1xuICBjb25zdCB7d29ya3NwYWNlS2V5LCBpc0N3ZFdvcmtzcGFjZX0gPSByZXF1aXJlKCcuLi9wYWNrYWdlLW1ncicpIGFzIHR5cGVvZiBfcGtnTWdyO1xuICBpZiAoIWlzQ3dkV29ya3NwYWNlKCkpIHtcbiAgICBsb2cuZGVidWcoJ05vdCBpbiBhIHdvcmtzcGFjZSwgc2tpcCBsb2FkaW5nIHBhY2thZ2Ugc2V0dGluZ3MnKTtcbiAgICByZXR1cm4gW107XG4gIH1cbiAgY29uc3QganNGaWxlczogW2ZpbGU6IHN0cmluZywgZXhwb3J0TmFtZTogc3RyaW5nXVtdID0gW107XG5cbiAgZm9yIChjb25zdCBbX3R5cGVGaWxlLCBfdHlwZUV4cG9ydCwganNGaWxlLCBkZWZhdWx0U2V0dGluZ0V4cG9ydCwgcGtnXSBvZiBnZXRQYWNrYWdlU2V0dGluZ0ZpbGVzKHdvcmtzcGFjZUtleShwbGlua0Vudi53b3JrRGlyKSkpIHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgYWJzRmlsZSA9IFBhdGgucmVzb2x2ZShwbGlua0Vudi53b3JrRGlyLCBwa2cucGF0aCwganNGaWxlKTtcbiAgICAgIGNvbnN0IGV4cHMgPSByZXF1aXJlKGFic0ZpbGUpO1xuICAgICAgY29uc3QgZGVmYXVsdFNldHRpbmdGYWN0b3J5OiBQYWNrYWdlU2V0dGluZ0ludGVyZjxhbnk+ID0gZXhwc1tkZWZhdWx0U2V0dGluZ0V4cG9ydF07XG5cbiAgICAgIGlmICh0eXBlb2YgZGVmYXVsdFNldHRpbmdGYWN0b3J5ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gZGVmYXVsdFNldHRpbmdGYWN0b3J5KGdldFN0YXRlKCkuY2xpT3B0aW9ucyEpO1xuICAgICAgICBkaXNwYXRjaGVyLl9jaGFuZ2UocyA9PiBzW3BrZy5uYW1lXSA9IHZhbHVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy53YXJuKGBGYWlsZWQgdG8gbG9hZCBwYWNrYWdlIHNldHRpbmcgZnJvbSAke3BrZy5uYW1lfS8ke2pzRmlsZX0uXFxuIEV4cG9ydCBuYW1lIFwiJHtkZWZhdWx0U2V0dGluZ0V4cG9ydH1cIiBpcyBub3QgZm91bmRgKTtcbiAgICAgIH1cbiAgICAgIGlmIChkZWZhdWx0U2V0dGluZ0ZhY3RvcnkgIT0gbnVsbCkge1xuICAgICAgICBqc0ZpbGVzLnB1c2goW2Fic0ZpbGUsIGRlZmF1bHRTZXR0aW5nRXhwb3J0XSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBsb2cuZXJyb3IoYEZhaWxlZCB0byBsb2FkIHBhY2thZ2Ugc2V0dGluZyBmcm9tICR7cGtnLm5hbWV9LyR7anNGaWxlfS4nJHtkZWZhdWx0U2V0dGluZ0V4cG9ydH1gLCBlcnIpO1xuICAgIH1cbiAgfVxuICByZXR1cm4ganNGaWxlcztcbn1cbmV4cG9ydCBkZWZhdWx0IChjb25maWcgYXMgRHJjcENvbmZpZyk7XG4iXX0=