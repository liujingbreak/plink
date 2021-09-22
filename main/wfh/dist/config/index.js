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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jb25maWcvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDBDQUEwQztBQUMxQyxvREFBdUI7QUFDdkIsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QixrREFBMEI7QUFDMUIsc0RBQThFO0FBRTlFLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMsb0RBQTRCO0FBQzVCLGlEQUE2RTtBQUk3RSx3Q0FBdUM7QUFFdkMsb0NBQW9DO0FBQ3BDLG9EQUE0QjtBQUM1QixPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUU1QixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUM3QyxNQUFNLEVBQUMsT0FBTyxFQUFDLEdBQUcsZUFBUSxDQUFDO0FBRTNCLElBQUksUUFBUSxHQUFHLE9BQU8sQ0FBQztBQUVWLFFBQUEsaUJBQWlCLEdBQUcsSUFBSSxFQUFFLENBQUMsZUFBZSxDQUErQixTQUFTLENBQUMsQ0FBQztBQUVqRzs7OztHQUlHO0FBQ0gsTUFBTSxNQUFNLEdBQUcsR0FBa0IsRUFBRTtJQUNqQyxPQUFPLElBQUEsdUJBQVEsR0FBRSxDQUFDO0FBQ3BCLENBQUMsQ0FBQztBQUVGLE1BQU0sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxJQUFnQixFQUFFLEVBQUU7SUFDckMseUJBQVUsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDL0IseURBQXlEO0lBQ3pELE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDbEQsSUFBSSxDQUFDLElBQUEsdUJBQVEsR0FBRSxDQUFDLFVBQVcsQ0FBQyxDQUFDO0lBQzdCLE9BQU8sSUFBQSx1QkFBUSxHQUFFLENBQUM7QUFDcEIsQ0FBQyxDQUFDO0FBR0YsTUFB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LENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLG9CQUFvQixDQUFDLENBQUMsQ0FBQzthQUMvQztTQUNGO1FBQUMsT0FBTyxHQUFHLEVBQUU7WUFDWixHQUFHLENBQUMsS0FBSyxDQUFDLHVDQUF1QyxHQUFHLENBQUMsSUFBSSxJQUFJLE1BQU0sS0FBSyxvQkFBb0IsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1NBQ3RHO0tBQ0Y7SUFDRCxPQUFPLE9BQU8sQ0FBQztBQUNqQixDQUFDO0FBQ0Qsa0JBQWdCLE1BQXFCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiBlc2xpbnQtZGlzYWJsZSBwcmVmZXItY29uc3QsIG1heC1sZW4gKi9cbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHtDb25maWdIYW5kbGVyTWdyLCBEcmNwQ29uZmlnLCBDb25maWdIYW5kbGVyfSBmcm9tICcuLi9jb25maWctaGFuZGxlcic7XG5pbXBvcnQge0dsb2JhbE9wdGlvbnMgYXMgQ2xpT3B0aW9uc30gZnJvbSAnLi4vY21kL3R5cGVzJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtkaXNwYXRjaGVyLCBnZXRTdGF0ZSwgUGxpbmtTZXR0aW5ncywgZ2V0U3RvcmV9IGZyb20gJy4vY29uZmlnLXNsaWNlJztcbi8vIFJlZmFjdG9yOiBjaXJjdWxhciByZWZlcmVuY2VcbmltcG9ydCAqIGFzIF9wa2dMaXN0IGZyb20gJy4uL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0ICogYXMgX3BrZ01nciBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQge3BsaW5rRW52fSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCB7UGFja2FnZVNldHRpbmdJbnRlcmZ9IGZyb20gJy4vY29uZmlnLnR5cGVzJztcbi8vIGNvbnN0IHlhbWxqcyA9IHJlcXVpcmUoJ3lhbWxqcycpO1xuaW1wb3J0IHlhbWxqcyBmcm9tICd5YW1sanMnO1xucmVxdWlyZSgneWFtbGlmeS9yZWdpc3RlcicpO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5jb25maWcnKTtcbmNvbnN0IHtyb290RGlyfSA9IHBsaW5rRW52O1xuXG5sZXQgcm9vdFBhdGggPSByb290RGlyO1xuXG5leHBvcnQgY29uc3QgY29uZmlnSGFuZGxlck1nciQgPSBuZXcgcnguQmVoYXZpb3JTdWJqZWN0PENvbmZpZ0hhbmRsZXJNZ3IgfCB1bmRlZmluZWQ+KHVuZGVmaW5lZCk7XG5cbi8qKlxuICogcmVhZCBhbmQgcmV0dXJuIGNvbmZpZ3VyYXRpb25cbiAqIEBuYW1lIGNvbmZpZ1xuICogQHJldHVybiB7b2JqZWN0fSBzZXR0aW5nXG4gKi9cbmNvbnN0IGNvbmZpZyA9ICgpOiBQbGlua1NldHRpbmdzID0+IHtcbiAgcmV0dXJuIGdldFN0YXRlKCk7XG59O1xuXG5jb25maWcuaW5pdFN5bmMgPSAoYXJndjogQ2xpT3B0aW9ucykgPT4ge1xuICBkaXNwYXRjaGVyLnNhdmVDbGlPcHRpb24oYXJndik7XG4gIC8vIEZvciBjaGlsZCBwcm9jZXNzLCB3b3JrZXIgdGhyZWFkIHRvIGFjY2VzcyBjbGkgb3B0aW9uc1xuICBwcm9jZXNzLmVudi5QTElOS19DTElfT1BUUyA9IEpTT04uc3RyaW5naWZ5KGFyZ3YpO1xuICBsb2FkKGdldFN0YXRlKCkuY2xpT3B0aW9ucyEpO1xuICByZXR1cm4gZ2V0U3RhdGUoKTtcbn07XG5cblxuY29uZmlnLnJlbG9hZCA9IGZ1bmN0aW9uIHJlbG9hZCgpIHtcbiAgY29uc3QgYXJndiA9IGdldFN0YXRlKCkuY2xpT3B0aW9ucyE7XG4gIGxvYWQoYXJndik7XG4gIHJldHVybiBnZXRTdGF0ZSgpO1xufTtcblxuY29uZmlnLnNldCA9IGZ1bmN0aW9uKHBhdGg6IHN0cmluZywgdmFsdWU6IGFueSkge1xuICBkaXNwYXRjaGVyLl9jaGFuZ2Uoc2V0dGluZyA9PiB7XG4gICAgXy5zZXQoc2V0dGluZywgcGF0aCwgdmFsdWUpO1xuICB9KTtcbiAgcmV0dXJuIGdldFN0YXRlKCk7XG59O1xuXG5jb25maWcuZ2V0ID0gZnVuY3Rpb24ocHJvcFBhdGg6IHN0cmluZywgZGVmYXVsdFZhbHVlOiBhbnkpIHtcbiAgcmV0dXJuIF8uZ2V0KGdldFN0YXRlKCksIHByb3BQYXRoLCBkZWZhdWx0VmFsdWUpO1xufTtcblxuXG4vKipcbiAqIFJlc29sdmUgYSBwYXRoIGJhc2VkIG9uIGByb290UGF0aGBcbiAqIEBuYW1lIHJlc29sdmVcbiAqIEBtZW1iZXJvZiBjb25maWdcbiAqIEBwYXJhbSAge3N0cmluZ30gcHJvcGVydHkgbmFtZSBvciBwcm9wZXJ0eSBwYXRoLCBsaWtlIFwibmFtZVwiLCBcIm5hbWUuY2hpbGRQcm9wWzFdXCJcbiAqIEByZXR1cm4ge3N0cmluZ30gICAgIGFic29sdXRlIHBhdGhcbiAqL1xuY29uZmlnLnJlc29sdmUgPSBmdW5jdGlvbihwYXRoUHJvcE5hbWU6ICdyb290UGF0aCcgfCAnZGVzdERpcicgfCAnc3RhdGljRGlyJyB8ICdzZXJ2ZXJEaXInLCAuLi5wYXRoczogc3RyaW5nW10pIHtcbiAgY29uc3QgYXJnczogc3RyaW5nW10gPSBbcm9vdFBhdGgsIGdldFN0YXRlKClbcGF0aFByb3BOYW1lXSwgLi4ucGF0aHNdO1xuICByZXR1cm4gUGF0aC5yZXNvbHZlKC4uLmFyZ3MpO1xufTtcblxuLy8gY29uZmlnLmNvbmZpZ3VyZVN0b3JlID0gY29uZmlndXJlU3RvcmU7XG5cbmNvbmZpZy5jb25maWdIYW5kbGVyTWdyID0gY29uZmlnSGFuZGxlck1nciQ7XG5cbmNvbmZpZy5jb25maWdIYW5kbGVyTWdyQ2hhbmdlZCA9IGZ1bmN0aW9uKGNiOiAoaGFuZGxlcjogQ29uZmlnSGFuZGxlck1ncikgPT4gdm9pZCkge1xuICBjb25maWdIYW5kbGVyTWdyJC5waXBlKFxuICAgIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4gICAgb3AuZmlsdGVyKGhhbmRsZXIgPT4gaGFuZGxlciAhPSBudWxsKSxcbiAgICBvcC50YXAoaGFuZGxlciA9PiBjYihoYW5kbGVyISkpXG4gICkuc3Vic2NyaWJlKCk7XG59O1xuXG5jb25maWcuY2hhbmdlID0gZnVuY3Rpb24ocmVkdWNlcjogKHNldHRpbmc6IFBsaW5rU2V0dGluZ3MpID0+IHZvaWQgKSB7XG4gIHJldHVybiBkaXNwYXRjaGVyLl9jaGFuZ2UocmVkdWNlcik7XG59O1xuXG5jb25maWcuZ2V0U3RvcmUgPSBnZXRTdG9yZTtcblxuZnVuY3Rpb24gbG9hZChjbGlPcHRpb246IENsaU9wdGlvbnMpIHtcbiAgY29uc3QgcGtnU2V0dGluZ0ZpbGVzID0gbG9hZFBhY2thZ2VTZXR0aW5ncygpO1xuICBjb25zdCBjb25maWdGaWxlTGlzdCA9IGNsaU9wdGlvbi5jb25maWcgfHwgW107XG4gIGNvbmZpZ0ZpbGVMaXN0LmZvckVhY2gobG9jYWxDb25maWdQYXRoID0+IG1lcmdlRnJvbVlhbWxKc29uRmlsZShsb2NhbENvbmZpZ1BhdGgpKTtcbiAgY29uc3QgaGFuZGxlcnMgPSBuZXcgQ29uZmlnSGFuZGxlck1ncihcbiAgICBjb25maWdGaWxlTGlzdC5maWx0ZXIobmFtZSA9PiAvXFwuW3RqXXMkLy50ZXN0KG5hbWUpKVxuICAgICAgLm1hcDxbZmlsZTogc3RyaW5nLCBleHBOYW1lOiBzdHJpbmddPihpdGVtID0+IFtQYXRoLnJlc29sdmUoaXRlbSksICdkZWZhdWx0J10pXG4gICAgICAuY29uY2F0KHBrZ1NldHRpbmdGaWxlcylcbiAgKTtcbiAgY29uZmlnSGFuZGxlck1nciQubmV4dChoYW5kbGVycyk7XG4gIGRpc3BhdGNoZXIuX2NoYW5nZShkcmFmdCA9PiB7XG4gICAgaGFuZGxlcnMucnVuRWFjaFN5bmM8Q29uZmlnSGFuZGxlcj4oKF9maWxlLCBvYmosIGhhbmRsZXIpID0+IHtcbiAgICAgIGlmIChoYW5kbGVyLm9uQ29uZmlnKSB7XG4gICAgICAgIHJldHVybiBoYW5kbGVyLm9uQ29uZmlnKGRyYWZ0ICwgZHJhZnQuY2xpT3B0aW9ucyEpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbiAgdmFsaWRhdGVDb25maWcoKTtcblxuICBkaXNwYXRjaGVyLl9jaGFuZ2UocyA9PiB7XG4gICAgcy5wb3J0ID0gbm9ybWFsaXplUG9ydChzLnBvcnQpO1xuICB9KTtcbiAgbWVyZ2VGcm9tQ2xpQXJncyhnZXRTdGF0ZSgpLmNsaU9wdGlvbnMhKTtcbn1cblxuZnVuY3Rpb24gbWVyZ2VGcm9tWWFtbEpzb25GaWxlKGxvY2FsQ29uZmlnUGF0aDogc3RyaW5nKSB7XG4gIGlmICghZnMuZXhpc3RzU3luYyhsb2NhbENvbmZpZ1BhdGgpKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBsb2cuaW5mbyhjaGFsay55ZWxsb3coJyBGaWxlIGRvZXMgbm90IGV4aXN0OiAlcycsIGxvY2FsQ29uZmlnUGF0aCkpO1xuICAgIHJldHVybjtcbiAgfVxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICBsb2cuaW5mbyhgIFJlYWQgJHtsb2NhbENvbmZpZ1BhdGh9YCk7XG4gIHZhciBjb25maWdPYmo6IHtba2V5OiBzdHJpbmddOiBhbnl9O1xuXG4gIGNvbnN0IG1hdGNoZWQgPSAvXFwuKFteLl0rKSQvLmV4ZWMobG9jYWxDb25maWdQYXRoKTtcblxuICBsZXQgc3VmZml4ID0gbWF0Y2hlZCA/IG1hdGNoZWRbMV0gOiBudWxsO1xuICBpZiAoc3VmZml4ID09PSAneWFtbCcgfHwgc3VmZml4ID09PSAneW1sJykge1xuICAgIGNvbmZpZ09iaiA9IHlhbWxqcy5wYXJzZShmcy5yZWFkRmlsZVN5bmMobG9jYWxDb25maWdQYXRoLCAndXRmOCcpKTtcbiAgfSBlbHNlIGlmIChzdWZmaXggPT09ICdqc29uJykge1xuICAgIGNvbmZpZ09iaiA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKGxvY2FsQ29uZmlnUGF0aCkpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGRpc3BhdGNoZXIuX2NoYW5nZShzZXR0aW5nID0+IHtcbiAgICBfLmFzc2lnbldpdGgoc2V0dGluZywgY29uZmlnT2JqLCAob2JqVmFsdWUsIHNyY1ZhbHVlLCBrZXksIG9iamVjdCwgc291cmNlKSA9PiB7XG4gICAgICBpZiAoXy5pc09iamVjdChvYmpWYWx1ZSkgJiYgIUFycmF5LmlzQXJyYXkob2JqVmFsdWUpKSB7XG4gICAgICAgIC8vIFdlIG9ubHkgbWVyZ2UgMXN0IGFuZCAybmQgbGV2ZWwgcHJvcGVydGllc1xuICAgICAgICByZXR1cm4gXy5hc3NpZ24ob2JqVmFsdWUsIHNyY1ZhbHVlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIG1lcmdlRnJvbUNsaUFyZ3MoY2xpT3B0OiBDbGlPcHRpb25zKSB7XG4gIGlmICghY2xpT3B0LnByb3ApXG4gICAgcmV0dXJuO1xuICBmb3IgKGxldCBwcm9wUGFpciBvZiBjbGlPcHQucHJvcCkge1xuICAgIGNvbnN0IHByb3BTZXQgPSBwcm9wUGFpci5zcGxpdCgnPScpO1xuICAgIGxldCBwcm9wUGF0aCA9IHByb3BTZXRbMF07XG4gICAgaWYgKF8uc3RhcnRzV2l0aChwcm9wU2V0WzBdLCAnWycpKVxuICAgICAgcHJvcFBhdGggPSBKU09OLnBhcnNlKHByb3BTZXRbMF0pO1xuICAgIGxldCB2YWx1ZTogYW55O1xuICAgIHRyeSB7XG4gICAgICB2YWx1ZSA9IEpTT04ucGFyc2UocHJvcFNldFsxXSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdmFsdWUgPSBwcm9wU2V0WzFdID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IHByb3BTZXRbMV07XG4gICAgfVxuICAgIGRpc3BhdGNoZXIuX2NoYW5nZShzID0+IF8uc2V0KHMsIHByb3BQYXRoLCB2YWx1ZSkpO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgbG9nLmluZm8oYFtjb25maWddIHNldCAke3Byb3BQYXRofSA9ICR7dmFsdWUgYXMgc3RyaW5nfWApO1xuICB9XG59XG5cblxuZnVuY3Rpb24gdmFsaWRhdGVDb25maWcoKSB7XG4gIC8vIFRPRE86IGpzb24gc2NoZW1hIHZhbGlkYXRpb25cbn1cblxuLy8gZnVuY3Rpb24gdHJpbVRhaWxTbGFzaCh1cmw6IHN0cmluZykge1xuLy8gICBpZiAodXJsID09PSAnLycpIHtcbi8vICAgICByZXR1cm4gdXJsO1xuLy8gICB9XG4vLyAgIHJldHVybiBfLmVuZHNXaXRoKHVybCwgJy8nKSA/IHVybC5zdWJzdHJpbmcoMCwgdXJsLmxlbmd0aCAtIDEpIDogdXJsO1xuLy8gfVxuXG5mdW5jdGlvbiBub3JtYWxpemVQb3J0KHZhbDogc3RyaW5nIHwgbnVtYmVyKSB7XG4gIGxldCBwb3J0OiBudW1iZXIgPSB0eXBlb2YgdmFsID09PSAnc3RyaW5nJyA/IHBhcnNlSW50KHZhbCwgMTApIDogdmFsO1xuXG4gIGlmIChpc05hTihwb3J0KSkge1xuICAgIC8vIG5hbWVkIHBpcGVcbiAgICByZXR1cm4gdmFsO1xuICB9XG5cbiAgaWYgKHBvcnQgPj0gMCkge1xuICAgIC8vIHBvcnQgbnVtYmVyXG4gICAgcmV0dXJuIHBvcnQ7XG4gIH1cblxuICByZXR1cm4gODA4MDtcbn1cblxudHlwZSBQYWNrYWdlSW5mbyA9IFJldHVyblR5cGU8KHR5cGVvZiBfcGtnTGlzdClbJ3BhY2thZ2VzNFdvcmtzcGFjZSddPiBleHRlbmRzIEdlbmVyYXRvcjxpbmZlciBUPiA/IFQgOiB1bmtub3duO1xuXG4vKipcbiAqIEByZXR1cm5zIFtkZWZhdWx0VmFsdWVGaWxlLCBleHBvcnROYW1lLCBkdHNGaWxlXVxuICovXG5leHBvcnQgZnVuY3Rpb24qIGdldFBhY2thZ2VTZXR0aW5nRmlsZXMod29ya3NwYWNlS2V5OiBzdHJpbmcsIGluY2x1ZGVQa2c/OiBTZXQ8c3RyaW5nPik6IEdlbmVyYXRvcjxbXG4gIC8qKiByZWxhdGl2ZSBwYXRoIHdpdGhpbiBwYWNrYWdlIHJlYWxwYXRoLCB3aXRob3V0IGV4dCBmaWxlIG5hbWUgKi9cbiAgdHlwZUZpbGVXaXRob3V0RXh0OiBzdHJpbmcsXG4gIHR5cGVFeHBvcnROYW1lOiBzdHJpbmcsXG4gIC8qKiByZWxhdGl2ZSBwYXRoIG9mIGpzIGZpbGUsIHdoaWNoIGV4cG9ydHMgZGVmYXVsdCB2YWx1ZSBvciBmYWN0b3J5IGZ1bmN0aW9uIG9mIGRlZmF1bHQgdmFsdWUgKi9cbiAganNGaWxlOiBzdHJpbmcsXG4gIGRlZmF1bHRFeHBvcnROYW1lOiBzdHJpbmcsXG4gIHBrZzogUGFja2FnZUluZm9cbl0+IHtcbiAgY29uc3Qge3BhY2thZ2VzNFdvcmtzcGFjZUtleX0gPSByZXF1aXJlKCcuLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJykgYXMgdHlwZW9mIF9wa2dMaXN0O1xuICBmb3IgKGNvbnN0IHBrZyBvZiBwYWNrYWdlczRXb3Jrc3BhY2VLZXkod29ya3NwYWNlS2V5LCB0cnVlKSkge1xuICAgIGlmIChpbmNsdWRlUGtnICYmICFpbmNsdWRlUGtnLmhhcyhwa2cubmFtZSkpXG4gICAgICBjb250aW51ZTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBkciA9IHBrZy5qc29uLmRyIHx8IHBrZy5qc29uLnBsaW5rITtcbiAgICAgIGlmIChkciA9PSBudWxsIHx8IHR5cGVvZiBkci5zZXR0aW5nICE9PSAnb2JqZWN0Jykge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHNldHRpbmcgPSBkci5zZXR0aW5nO1xuICAgICAgbG9nLmRlYnVnKCdnZXRQYWNrYWdlU2V0dGluZ0ZpbGVzJywgcGtnLm5hbWUsIHNldHRpbmcpO1xuICAgICAgbGV0IFt2YWx1ZUZpbGUsIHZhbHVlRXhwb3J0XSA9IHNldHRpbmcudmFsdWUuc3BsaXQoJyMnLCAyKTtcblxuICAgICAgLy8gQ2hlY2sgdmFsdWUgZmlsZVxuICAgICAgY29uc3QgZXh0ID0gUGF0aC5leHRuYW1lKHZhbHVlRmlsZSk7XG4gICAgICBpZiAoZXh0ID09PSAnJykge1xuICAgICAgICB2YWx1ZUZpbGUgPSB2YWx1ZUZpbGUgKyAnLmpzJztcbiAgICAgIH1cbiAgICAgIGlmICh2YWx1ZUV4cG9ydCA9PSBudWxsKVxuICAgICAgICB2YWx1ZUV4cG9ydCA9ICdkZWZhdWx0JztcblxuICAgICAgY29uc3QgYWJzRmlsZSA9IFBhdGgucmVzb2x2ZShwa2cucmVhbFBhdGgsIHZhbHVlRmlsZSk7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoYWJzRmlsZSkpIHtcbiAgICAgICAgbG9nLndhcm4oYFBhY2thZ2UgJHtwa2cubmFtZX0ncyBjb25maWd1cmUgZmlsZSBcIiR7YWJzRmlsZX1cIiBkb2VzIG5vdCBleGlzdCwgc2tpcHBlZC5gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICAvLyBDaGVjayBkdHMgdHlwZSBmaWxlXG4gICAgICBsZXQgW3R5cGVGaWxlLCB0eXBlRXhwb3J0TmFtZV0gPSBzZXR0aW5nLnR5cGUuc3BsaXQoJyMnLCAyKTtcbiAgICAgIGxldCB0eXBlRmlsZUV4dCA9IFBhdGguZXh0bmFtZSh0eXBlRmlsZSk7XG4gICAgICBpZiAodHlwZUZpbGVFeHQgPT09ICcnKSB7XG4gICAgICAgIHR5cGVGaWxlICs9ICcuZHRzJztcbiAgICAgIH1cblxuICAgICAgY29uc3QgYWJzVHlwZUZpbGUgPSBQYXRoLnJlc29sdmUocGtnLnJlYWxQYXRoLCB0eXBlRmlsZUV4dCk7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoYWJzVHlwZUZpbGUpKSB7XG4gICAgICAgIGxvZy53YXJuKGBQYWNrYWdlIHNldHRpbmcgJHtwa2cubmFtZX0ncyBkdHMgZmlsZSBcIiR7YWJzVHlwZUZpbGV9XCIgZG9lcyBub3QgZXhpc3QsIHNraXBwZWQuYCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVFeHBvcnROYW1lID09IG51bGwpIHtcbiAgICAgICAgbG9nLmVycm9yKGBJbmNvcnJlY3QgcGFja2FnZSBjb25maWcgcHJvcGVydHkgZm9ybWF0IFwiJHtzZXR0aW5nLnR5cGV9XCIgaW4gJHtwa2cucmVhbFBhdGggKyBQYXRoLnNlcH1wYWNrYWdlLmpzb25gICtcbiAgICAgICAgICAnLCBjb3JyZWN0IGZvcm1hdCBpcyBcIjxkdHMtZmlsZS1yZWxhdGl2ZS1wYXRoPiM8VFMtdHlwZS1leHBvcnQtbmFtZT5cIicpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHlpZWxkIFt0eXBlRmlsZS5yZXBsYWNlKC9cXC5bXi4vXFxcXF0rJC9nLCAnJyksIHR5cGVFeHBvcnROYW1lLCB2YWx1ZUZpbGUsIHZhbHVlRXhwb3J0LCBwa2ddO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgbG9nLndhcm4oYFNraXAgbG9hZGluZyBzZXR0aW5nIG9mIHBhY2thZ2UgJHtwa2cubmFtZX0sIGR1ZSB0byAodGhpcyBtaWdodCBiZSBjYXVzZWQgYnkgaW5jb3JyZWN0IHBhY2thZ2UuanNvbiBmb3JtYXQpYCwgZXJyKTtcbiAgICB9XG4gIH1cbn1cbi8qKlxuICogQHJldHVybnMgYWJzdWx0ZSBwYXRoIG9mIHNldHRpbmcgSlMgZmlsZXMgd2hpY2ggY29udGFpbnMgZXhwb3J0cyBuYW1lZCB3aXRoIFwiZGVmYXVsdFwiXG4gKi9cbmZ1bmN0aW9uIGxvYWRQYWNrYWdlU2V0dGluZ3MoKTogW2ZpbGU6IHN0cmluZywgZXhwb3J0TmFtZTogc3RyaW5nXVtdIHtcbiAgY29uc3Qge3dvcmtzcGFjZUtleSwgaXNDd2RXb3Jrc3BhY2V9ID0gcmVxdWlyZSgnLi4vcGFja2FnZS1tZ3InKSBhcyB0eXBlb2YgX3BrZ01ncjtcbiAgaWYgKCFpc0N3ZFdvcmtzcGFjZSgpKSB7XG4gICAgbG9nLmRlYnVnKCdOb3QgaW4gYSB3b3Jrc3BhY2UsIHNraXAgbG9hZGluZyBwYWNrYWdlIHNldHRpbmdzJyk7XG4gICAgcmV0dXJuIFtdO1xuICB9XG4gIGNvbnN0IGpzRmlsZXM6IFtmaWxlOiBzdHJpbmcsIGV4cG9ydE5hbWU6IHN0cmluZ11bXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgW190eXBlRmlsZSwgX3R5cGVFeHBvcnQsIGpzRmlsZSwgZGVmYXVsdFNldHRpbmdFeHBvcnQsIHBrZ10gb2YgZ2V0UGFja2FnZVNldHRpbmdGaWxlcyh3b3Jrc3BhY2VLZXkocGxpbmtFbnYud29ya0RpcikpKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGFic0ZpbGUgPSBQYXRoLnJlc29sdmUocGxpbmtFbnYud29ya0RpciwgcGtnLnBhdGgsIGpzRmlsZSk7XG4gICAgICBjb25zdCBleHBzID0gcmVxdWlyZShhYnNGaWxlKTtcbiAgICAgIGNvbnN0IGRlZmF1bHRTZXR0aW5nRmFjdG9yeTogUGFja2FnZVNldHRpbmdJbnRlcmY8YW55PiA9IGV4cHNbZGVmYXVsdFNldHRpbmdFeHBvcnRdO1xuXG4gICAgICBpZiAodHlwZW9mIGRlZmF1bHRTZXR0aW5nRmFjdG9yeSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGRlZmF1bHRTZXR0aW5nRmFjdG9yeShnZXRTdGF0ZSgpLmNsaU9wdGlvbnMhKTtcbiAgICAgICAgZGlzcGF0Y2hlci5fY2hhbmdlKHMgPT4gc1twa2cubmFtZV0gPSB2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cud2FybihgRmFpbGVkIHRvIGxvYWQgcGFja2FnZSBzZXR0aW5nIGZyb20gJHtwa2cubmFtZX0vJHtqc0ZpbGV9LlxcbiBFeHBvcnQgbmFtZSBcIiR7ZGVmYXVsdFNldHRpbmdFeHBvcnR9XCIgaXMgbm90IGZvdW5kYCk7XG4gICAgICB9XG4gICAgICBpZiAoZGVmYXVsdFNldHRpbmdGYWN0b3J5ICE9IG51bGwpIHtcbiAgICAgICAganNGaWxlcy5wdXNoKFthYnNGaWxlLCBkZWZhdWx0U2V0dGluZ0V4cG9ydF0pO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgbG9nLmVycm9yKGBGYWlsZWQgdG8gbG9hZCBwYWNrYWdlIHNldHRpbmcgZnJvbSAke3BrZy5uYW1lfS8ke2pzRmlsZX0uJyR7ZGVmYXVsdFNldHRpbmdFeHBvcnR9YCwgZXJyKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGpzRmlsZXM7XG59XG5leHBvcnQgZGVmYXVsdCAoY29uZmlnIGFzIERyY3BDb25maWcpO1xuIl19