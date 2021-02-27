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
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const log4js_1 = __importDefault(require("log4js"));
const config_slice_1 = require("./config-slice");
const worker_threads_1 = require("worker_threads");
const log = log4js_1.default.getLogger('plink.config');
const yamljs = require('yamljs');
const { rootDir } = JSON.parse(process.env.__plink);
let rootPath = rootDir;
exports.handlers$ = new rx.BehaviorSubject(undefined);
configDefaultLog();
function configDefaultLog() {
    let logPatternPrefix = '';
    if (process.send)
        logPatternPrefix = 'pid:%z ';
    else if (!worker_threads_1.isMainThread)
        logPatternPrefix = '[thread]';
    log4js_1.default.configure({
        appenders: {
            out: {
                type: 'stdout',
                layout: { type: 'pattern', pattern: logPatternPrefix + '%[%c%] - %m' }
            }
        },
        categories: {
            default: { appenders: ['out'], level: 'info' }
        }
    });
    /**
     - %r time in toLocaleTimeString format
     - %p log level
     - %c log category
     - %h hostname
     - %m log data
     - %d date, formatted - default is ISO8601, format options are: ISO8601, ISO8601_WITH_TZ_OFFSET, ABSOLUTE, DATE, or any string compatible with the date-format library. e.g. %d{DATE}, %d{yyyy/MM/dd-hh.mm.ss}
     - %% % - for when you want a literal % in your output
     - %n newline
     - %z process id (from process.pid)
     - %f full path of filename (requires enableCallStack: true on the category, see configuration object)
     - %f{depth} path’s depth let you chose to have only filename (%f{1}) or a chosen number of directories
     - %l line number (requires enableCallStack: true on the category, see configuration object)
     - %o column postion (requires enableCallStack: true on the category, see configuration object)
     - %s call stack (requires enableCallStack: true on the category, see configuration object)
     - %x{<tokenname>} add dynamic tokens to your log. Tokens are specified in the tokens parameter.
     - %X{<tokenname>} add values from the Logger context. Tokens are keys into the context values.
     - %[ start a coloured block (colour will be taken from the log level, similar to colouredLayout)
     - %] end a coloured block
     */
}
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
// config.setDefault = function(propPath: string, value: any) {
//   if (!_.has(setting, propPath)) {
//     _.set(setting, propPath, value);
//   }
//   return setting;
// };
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
        configObj = yamljs.parse(fs_1.default.readFileSync(localConfigPath, 'utf8'));
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
            log.warn(`Skip loading setting of package ${pkg.name}, due to (this might be caused by incorrect package.json format stored last time)`, err);
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
    for (const [_typeFile, _typeExport, jsFile, defaultSettingExport, pkg] of getPackageSettingFiles(workspaceKey(process.cwd()))) {
        try {
            const absFile = path_1.default.resolve(pkg.realPath, jsFile);
            const exps = require(absFile);
            const defaultSettingFactory = exps[defaultSettingExport];
            if (typeof defaultSettingFactory === 'function') {
                const value = defaultSettingFactory(config_slice_1.getState());
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jb25maWcvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtDQUErQztBQUMvQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUM1QixvREFBdUI7QUFDdkIsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QixrREFBMEI7QUFDMUIsc0RBQThFO0FBRTlFLHdEQUFpRDtBQUVqRCx5Q0FBMkI7QUFDM0IsbURBQXFDO0FBQ3JDLG9EQUE0QjtBQUM1QixpREFBa0U7QUFJbEUsbURBQTRDO0FBRTVDLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQzdDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNqQyxNQUFNLEVBQUMsT0FBTyxFQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQVEsQ0FBYSxDQUFDO0FBRS9ELElBQUksUUFBUSxHQUFHLE9BQU8sQ0FBQztBQUVWLFFBQUEsU0FBUyxHQUFHLElBQUksRUFBRSxDQUFDLGVBQWUsQ0FBK0IsU0FBUyxDQUFDLENBQUM7QUFFekYsZ0JBQWdCLEVBQUUsQ0FBQztBQUVuQixTQUFTLGdCQUFnQjtJQUN2QixJQUFJLGdCQUFnQixHQUFHLEVBQUUsQ0FBQztJQUMxQixJQUFJLE9BQU8sQ0FBQyxJQUFJO1FBQ2QsZ0JBQWdCLEdBQUcsU0FBUyxDQUFDO1NBQzFCLElBQUksQ0FBQyw2QkFBWTtRQUNwQixnQkFBZ0IsR0FBRyxVQUFVLENBQUM7SUFDaEMsZ0JBQU0sQ0FBQyxTQUFTLENBQUM7UUFDZixTQUFTLEVBQUU7WUFDVCxHQUFHLEVBQUU7Z0JBQ0gsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsTUFBTSxFQUFFLEVBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxP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IHByZWZlci1jb25zdCBtYXgtbGluZS1sZW5ndGhcbnJlcXVpcmUoJ3lhbWxpZnkvcmVnaXN0ZXInKTtcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHtDb25maWdIYW5kbGVyTWdyLCBEcmNwQ29uZmlnLCBDb25maWdIYW5kbGVyfSBmcm9tICcuLi9jb25maWctaGFuZGxlcic7XG5pbXBvcnQge0dsb2JhbE9wdGlvbnMgYXMgQ2xpT3B0aW9uc30gZnJvbSAnLi4vY21kL3R5cGVzJztcbmltcG9ydCB7Z2V0TGFuSVB2NH0gZnJvbSAnLi4vdXRpbHMvbmV0d29yay11dGlsJztcbmltcG9ydCB7UGxpbmtFbnZ9IGZyb20gJy4uL25vZGUtcGF0aCc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7ZGlzcGF0Y2hlciwgZ2V0U3RhdGUsIERyY3BTZXR0aW5nc30gZnJvbSAnLi9jb25maWctc2xpY2UnO1xuLy8gUmVmYWN0b3I6IGNpcmN1bGFyIHJlZmVyZW5jZVxuaW1wb3J0ICogYXMgX3BrZ0xpc3QgZnJvbSAnLi4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcic7XG5pbXBvcnQgKiBhcyBfcGtnTWdyIGZyb20gJy4uL3BhY2thZ2UtbWdyJztcbmltcG9ydCB7aXNNYWluVGhyZWFkfSBmcm9tICd3b3JrZXJfdGhyZWFkcyc7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLmNvbmZpZycpO1xuY29uc3QgeWFtbGpzID0gcmVxdWlyZSgneWFtbGpzJyk7XG5jb25zdCB7cm9vdERpcn0gPSBKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmshKSBhcyBQbGlua0VudjtcblxubGV0IHJvb3RQYXRoID0gcm9vdERpcjtcblxuZXhwb3J0IGNvbnN0IGhhbmRsZXJzJCA9IG5ldyByeC5CZWhhdmlvclN1YmplY3Q8Q29uZmlnSGFuZGxlck1nciB8IHVuZGVmaW5lZD4odW5kZWZpbmVkKTtcblxuY29uZmlnRGVmYXVsdExvZygpO1xuXG5mdW5jdGlvbiBjb25maWdEZWZhdWx0TG9nKCkge1xuICBsZXQgbG9nUGF0dGVyblByZWZpeCA9ICcnO1xuICBpZiAocHJvY2Vzcy5zZW5kKVxuICAgIGxvZ1BhdHRlcm5QcmVmaXggPSAncGlkOiV6ICc7XG4gIGVsc2UgaWYgKCFpc01haW5UaHJlYWQpXG4gICAgbG9nUGF0dGVyblByZWZpeCA9ICdbdGhyZWFkXSc7XG4gIGxvZzRqcy5jb25maWd1cmUoe1xuICAgIGFwcGVuZGVyczoge1xuICAgICAgb3V0OiB7XG4gICAgICAgIHR5cGU6ICdzdGRvdXQnLFxuICAgICAgICBsYXlvdXQ6IHt0eXBlOiAncGF0dGVybicsIHBhdHRlcm46IGxvZ1BhdHRlcm5QcmVmaXggKyAnJVslYyVdIC0gJW0nfVxuICAgICAgfVxuICAgIH0sXG4gICAgY2F0ZWdvcmllczoge1xuICAgICAgZGVmYXVsdDoge2FwcGVuZGVyczogWydvdXQnXSwgbGV2ZWw6ICdpbmZvJ31cbiAgICB9XG4gIH0pO1xuICAvKipcbiAgIC0gJXIgdGltZSBpbiB0b0xvY2FsZVRpbWVTdHJpbmcgZm9ybWF0XG4gICAtICVwIGxvZyBsZXZlbFxuICAgLSAlYyBsb2cgY2F0ZWdvcnlcbiAgIC0gJWggaG9zdG5hbWVcbiAgIC0gJW0gbG9nIGRhdGFcbiAgIC0gJWQgZGF0ZSwgZm9ybWF0dGVkIC0gZGVmYXVsdCBpcyBJU084NjAxLCBmb3JtYXQgb3B0aW9ucyBhcmU6IElTTzg2MDEsIElTTzg2MDFfV0lUSF9UWl9PRkZTRVQsIEFCU09MVVRFLCBEQVRFLCBvciBhbnkgc3RyaW5nIGNvbXBhdGlibGUgd2l0aCB0aGUgZGF0ZS1mb3JtYXQgbGlicmFyeS4gZS5nLiAlZHtEQVRFfSwgJWR7eXl5eS9NTS9kZC1oaC5tbS5zc31cbiAgIC0gJSUgJSAtIGZvciB3aGVuIHlvdSB3YW50IGEgbGl0ZXJhbCAlIGluIHlvdXIgb3V0cHV0XG4gICAtICVuIG5ld2xpbmVcbiAgIC0gJXogcHJvY2VzcyBpZCAoZnJvbSBwcm9jZXNzLnBpZClcbiAgIC0gJWYgZnVsbCBwYXRoIG9mIGZpbGVuYW1lIChyZXF1aXJlcyBlbmFibGVDYWxsU3RhY2s6IHRydWUgb24gdGhlIGNhdGVnb3J5LCBzZWUgY29uZmlndXJhdGlvbiBvYmplY3QpXG4gICAtICVme2RlcHRofSBwYXRo4oCZcyBkZXB0aCBsZXQgeW91IGNob3NlIHRvIGhhdmUgb25seSBmaWxlbmFtZSAoJWZ7MX0pIG9yIGEgY2hvc2VuIG51bWJlciBvZiBkaXJlY3Rvcmllc1xuICAgLSAlbCBsaW5lIG51bWJlciAocmVxdWlyZXMgZW5hYmxlQ2FsbFN0YWNrOiB0cnVlIG9uIHRoZSBjYXRlZ29yeSwgc2VlIGNvbmZpZ3VyYXRpb24gb2JqZWN0KVxuICAgLSAlbyBjb2x1bW4gcG9zdGlvbiAocmVxdWlyZXMgZW5hYmxlQ2FsbFN0YWNrOiB0cnVlIG9uIHRoZSBjYXRlZ29yeSwgc2VlIGNvbmZpZ3VyYXRpb24gb2JqZWN0KVxuICAgLSAlcyBjYWxsIHN0YWNrIChyZXF1aXJlcyBlbmFibGVDYWxsU3RhY2s6IHRydWUgb24gdGhlIGNhdGVnb3J5LCBzZWUgY29uZmlndXJhdGlvbiBvYmplY3QpXG4gICAtICV4ezx0b2tlbm5hbWU+fSBhZGQgZHluYW1pYyB0b2tlbnMgdG8geW91ciBsb2cuIFRva2VucyBhcmUgc3BlY2lmaWVkIGluIHRoZSB0b2tlbnMgcGFyYW1ldGVyLlxuICAgLSAlWHs8dG9rZW5uYW1lPn0gYWRkIHZhbHVlcyBmcm9tIHRoZSBMb2dnZXIgY29udGV4dC4gVG9rZW5zIGFyZSBrZXlzIGludG8gdGhlIGNvbnRleHQgdmFsdWVzLlxuICAgLSAlWyBzdGFydCBhIGNvbG91cmVkIGJsb2NrIChjb2xvdXIgd2lsbCBiZSB0YWtlbiBmcm9tIHRoZSBsb2cgbGV2ZWwsIHNpbWlsYXIgdG8gY29sb3VyZWRMYXlvdXQpXG4gICAtICVdIGVuZCBhIGNvbG91cmVkIGJsb2NrXG4gICAqL1xufVxuXG4vKipcbiAqIHJlYWQgYW5kIHJldHVybiBjb25maWd1cmF0aW9uXG4gKiBAbmFtZSBjb25maWdcbiAqIEByZXR1cm4ge29iamVjdH0gc2V0dGluZ1xuICovXG5jb25zdCBjb25maWcgPSAoKTogRHJjcFNldHRpbmdzID0+IHtcbiAgcmV0dXJuIGdldFN0YXRlKCkgYXMgRHJjcFNldHRpbmdzO1xufTtcblxuY29uZmlnLmluaXRTeW5jID0gKGFyZ3Y6IENsaU9wdGlvbnMpID0+IHtcbiAgZGlzcGF0Y2hlci5zYXZlQ2xpT3B0aW9uKGFyZ3YpO1xuICBsb2FkKGFyZ3YpO1xuICByZXR1cm4gZ2V0U3RhdGUoKSBhcyBEcmNwU2V0dGluZ3M7XG59O1xuXG5cbmNvbmZpZy5yZWxvYWQgPSBmdW5jdGlvbiByZWxvYWQoKSB7XG4gIGNvbnN0IGFyZ3YgPSBnZXRTdGF0ZSgpLmNsaU9wdGlvbnMhO1xuICBsb2FkKGFyZ3YpO1xuICByZXR1cm4gZ2V0U3RhdGUoKSBhcyBEcmNwU2V0dGluZ3M7XG59O1xuXG5jb25maWcuc2V0ID0gZnVuY3Rpb24ocGF0aDogc3RyaW5nLCB2YWx1ZTogYW55KSB7XG4gIGRpc3BhdGNoZXIuX2NoYW5nZShzZXR0aW5nID0+IHtcbiAgICBfLnNldChzZXR0aW5nLCBwYXRoLCB2YWx1ZSk7XG4gIH0pO1xuICByZXR1cm4gZ2V0U3RhdGUoKTtcbn07XG5cbmNvbmZpZy5nZXQgPSBmdW5jdGlvbihwcm9wUGF0aDogc3RyaW5nLCBkZWZhdWx0VmFsdWU6IGFueSkge1xuICByZXR1cm4gXy5nZXQoZ2V0U3RhdGUoKSwgcHJvcFBhdGgsIGRlZmF1bHRWYWx1ZSk7XG59O1xuXG4vLyBjb25maWcuc2V0RGVmYXVsdCA9IGZ1bmN0aW9uKHByb3BQYXRoOiBzdHJpbmcsIHZhbHVlOiBhbnkpIHtcbi8vICAgaWYgKCFfLmhhcyhzZXR0aW5nLCBwcm9wUGF0aCkpIHtcbi8vICAgICBfLnNldChzZXR0aW5nLCBwcm9wUGF0aCwgdmFsdWUpO1xuLy8gICB9XG4vLyAgIHJldHVybiBzZXR0aW5nO1xuLy8gfTtcblxuLyoqXG4gKiBSZXNvbHZlIGEgcGF0aCBiYXNlZCBvbiBgcm9vdFBhdGhgXG4gKiBAbmFtZSByZXNvbHZlXG4gKiBAbWVtYmVyb2YgY29uZmlnXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHByb3BlcnR5IG5hbWUgb3IgcHJvcGVydHkgcGF0aCwgbGlrZSBcIm5hbWVcIiwgXCJuYW1lLmNoaWxkUHJvcFsxXVwiXG4gKiBAcmV0dXJuIHtzdHJpbmd9ICAgICBhYnNvbHV0ZSBwYXRoXG4gKi9cbmNvbmZpZy5yZXNvbHZlID0gZnVuY3Rpb24ocGF0aFByb3BOYW1lOiAncm9vdFBhdGgnIHwgJ2Rlc3REaXInfCdzdGF0aWNEaXInfCdzZXJ2ZXJEaXInLCAuLi5wYXRoczogc3RyaW5nW10pIHtcbiAgY29uc3QgYXJnczogc3RyaW5nW10gPSBbcm9vdFBhdGgsIGdldFN0YXRlKClbcGF0aFByb3BOYW1lXSwgLi4ucGF0aHNdO1xuICByZXR1cm4gUGF0aC5yZXNvbHZlKC4uLmFyZ3MpO1xufTtcblxuLy8gY29uZmlnLmNvbmZpZ3VyZVN0b3JlID0gY29uZmlndXJlU3RvcmU7XG5cbmNvbmZpZy5jb25maWdIYW5kbGVyTWdyID0gaGFuZGxlcnMkO1xuXG5jb25maWcuY29uZmlnSGFuZGxlck1nckNoYW5nZWQgPSBmdW5jdGlvbihjYjogKGhhbmRsZXI6IENvbmZpZ0hhbmRsZXJNZ3IpID0+IHZvaWQpIHtcbiAgaGFuZGxlcnMkLnBpcGUoXG4gICAgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICBvcC5maWx0ZXIoaGFuZGxlciA9PiBoYW5kbGVyICE9IG51bGwpLFxuICAgIG9wLnRhcChoYW5kbGVyID0+IGNiKGhhbmRsZXIhKSlcbiAgKS5zdWJzY3JpYmUoKTtcbn07XG5cbmNvbmZpZy5jb25maWdIYW5kbGVyTWdyQ3JlYXRlZCA9IGZ1bmN0aW9uKGNiOiAoaGFuZGxlcjogQ29uZmlnSGFuZGxlck1ncikgPT4gUHJvbWlzZTxhbnk+IHwgdm9pZCk6IFByb21pc2U8dm9pZD4ge1xuICByZXR1cm4gaGFuZGxlcnMkLnBpcGUoXG4gICAgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICBvcC5maWx0ZXIoaGFuZGxlciA9PiBoYW5kbGVyICE9IG51bGwpLFxuICAgIG9wLmNvbmNhdE1hcChoYW5kbGVyID0+IFByb21pc2UucmVzb2x2ZShjYihoYW5kbGVyISkpKSxcbiAgICBvcC50YWtlKDEpXG4gICkudG9Qcm9taXNlKCk7XG59O1xuXG5mdW5jdGlvbiBsb2FkKGNsaU9wdGlvbjogQ2xpT3B0aW9ucykge1xuICBkaXNwYXRjaGVyLl9jaGFuZ2UocyA9PiB7XG4gICAgcy5sb2NhbElQID0gZ2V0TGFuSVB2NCgpO1xuICB9KTtcbiAgbG9hZFBhY2thZ2VTZXR0aW5ncygpO1xuICBjb25zdCBjb25maWdGaWxlTGlzdCA9IGNsaU9wdGlvbi5jb25maWcgfHwgW107XG4gIGNvbmZpZ0ZpbGVMaXN0LmZvckVhY2gobG9jYWxDb25maWdQYXRoID0+IG1lcmdlRnJvbVlhbWxKc29uRmlsZShsb2NhbENvbmZpZ1BhdGgpKTtcbiAgY29uc3QgaGFuZGxlcnMgPSBuZXcgQ29uZmlnSGFuZGxlck1ncihcbiAgICBjb25maWdGaWxlTGlzdC5maWx0ZXIobmFtZSA9PiAvXFwuW3RqXXMkLy50ZXN0KG5hbWUpKSk7XG4gIGhhbmRsZXJzJC5uZXh0KGhhbmRsZXJzKTtcbiAgZGlzcGF0Y2hlci5fY2hhbmdlKGRyYWZ0ID0+IHtcbiAgICBoYW5kbGVycy5ydW5FYWNoU3luYzxDb25maWdIYW5kbGVyPigoX2ZpbGUsIG9iaiwgaGFuZGxlcikgPT4ge1xuICAgICAgaWYgKGhhbmRsZXIub25Db25maWcpIHtcbiAgICAgICAgcmV0dXJuIGhhbmRsZXIub25Db25maWcoZHJhZnQgYXMgRHJjcFNldHRpbmdzLCBkcmFmdC5jbGlPcHRpb25zISk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xuICB2YWxpZGF0ZUNvbmZpZygpO1xuXG4gIGRpc3BhdGNoZXIuX2NoYW5nZShzID0+IHtcbiAgICBzLnBvcnQgPSBub3JtYWxpemVQb3J0KHMucG9ydCk7XG4gIH0pO1xuICBtZXJnZUZyb21DbGlBcmdzKGdldFN0YXRlKCkuY2xpT3B0aW9ucyEpO1xufVxuXG5mdW5jdGlvbiBtZXJnZUZyb21ZYW1sSnNvbkZpbGUobG9jYWxDb25maWdQYXRoOiBzdHJpbmcpIHtcbiAgaWYgKCFmcy5leGlzdHNTeW5jKGxvY2FsQ29uZmlnUGF0aCkpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBsb2cuaW5mbyhjaGFsay55ZWxsb3coJyBGaWxlIGRvZXMgbm90IGV4aXN0OiAlcycsIGxvY2FsQ29uZmlnUGF0aCkpO1xuICAgIHJldHVybjtcbiAgfVxuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgbG9nLmluZm8oYCBSZWFkICR7bG9jYWxDb25maWdQYXRofWApO1xuICB2YXIgY29uZmlnT2JqOiB7W2tleTogc3RyaW5nXTogYW55fTtcblxuICBjb25zdCBtYXRjaGVkID0gL1xcLihbXi5dKykkLy5leGVjKGxvY2FsQ29uZmlnUGF0aCk7XG5cbiAgbGV0IHN1ZmZpeCA9IG1hdGNoZWQgPyBtYXRjaGVkWzFdIDogbnVsbDtcbiAgaWYgKHN1ZmZpeCA9PT0gJ3lhbWwnIHx8IHN1ZmZpeCA9PT0gJ3ltbCcpIHtcbiAgICBjb25maWdPYmogPSB5YW1sanMucGFyc2UoZnMucmVhZEZpbGVTeW5jKGxvY2FsQ29uZmlnUGF0aCwgJ3V0ZjgnKSk7XG4gIH0gZWxzZSBpZiAoc3VmZml4ID09PSAnanNvbicpIHtcbiAgICBjb25maWdPYmogPSByZXF1aXJlKFBhdGgucmVzb2x2ZShsb2NhbENvbmZpZ1BhdGgpKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBkaXNwYXRjaGVyLl9jaGFuZ2Uoc2V0dGluZyA9PiB7XG4gICAgXy5hc3NpZ25XaXRoKHNldHRpbmcsIGNvbmZpZ09iaiwgKG9ialZhbHVlLCBzcmNWYWx1ZSwga2V5LCBvYmplY3QsIHNvdXJjZSkgPT4ge1xuICAgICAgaWYgKF8uaXNPYmplY3Qob2JqVmFsdWUpICYmICFBcnJheS5pc0FycmF5KG9ialZhbHVlKSkge1xuICAgICAgICAvLyBXZSBvbmx5IG1lcmdlIDFzdCBhbmQgMm5kIGxldmVsIHByb3BlcnRpZXNcbiAgICAgICAgcmV0dXJuIF8uYXNzaWduKG9ialZhbHVlLCBzcmNWYWx1ZSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBtZXJnZUZyb21DbGlBcmdzKGNsaU9wdDogQ2xpT3B0aW9ucykge1xuICBpZiAoIWNsaU9wdC5wcm9wKVxuICAgIHJldHVybjtcbiAgZm9yIChsZXQgcHJvcFBhaXIgb2YgY2xpT3B0LnByb3ApIHtcbiAgICBjb25zdCBwcm9wU2V0ID0gcHJvcFBhaXIuc3BsaXQoJz0nKTtcbiAgICBsZXQgcHJvcFBhdGggPSBwcm9wU2V0WzBdO1xuICAgIGlmIChfLnN0YXJ0c1dpdGgocHJvcFNldFswXSwgJ1snKSlcbiAgICAgIHByb3BQYXRoID0gSlNPTi5wYXJzZShwcm9wU2V0WzBdKTtcbiAgICBsZXQgdmFsdWU6IGFueTtcbiAgICB0cnkge1xuICAgICAgdmFsdWUgPSBKU09OLnBhcnNlKHByb3BTZXRbMV0pO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHZhbHVlID0gcHJvcFNldFsxXSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBwcm9wU2V0WzFdO1xuICAgIH1cbiAgICBkaXNwYXRjaGVyLl9jaGFuZ2UocyA9PiBfLnNldChzLCBwcm9wUGF0aCwgdmFsdWUpKTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBsb2cuaW5mbyhgW2NvbmZpZ10gc2V0ICR7cHJvcFBhdGh9ID0gJHt2YWx1ZX1gKTtcbiAgfVxufVxuXG5cbmZ1bmN0aW9uIHZhbGlkYXRlQ29uZmlnKCkge1xuICAvLyBUT0RPOiBqc29uIHNjaGVtYSB2YWxpZGF0aW9uXG59XG5cbi8vIGZ1bmN0aW9uIHRyaW1UYWlsU2xhc2godXJsOiBzdHJpbmcpIHtcbi8vICAgaWYgKHVybCA9PT0gJy8nKSB7XG4vLyAgICAgcmV0dXJuIHVybDtcbi8vICAgfVxuLy8gICByZXR1cm4gXy5lbmRzV2l0aCh1cmwsICcvJykgPyB1cmwuc3Vic3RyaW5nKDAsIHVybC5sZW5ndGggLSAxKSA6IHVybDtcbi8vIH1cblxuZnVuY3Rpb24gbm9ybWFsaXplUG9ydCh2YWw6IHN0cmluZyB8IG51bWJlcikge1xuICBsZXQgcG9ydDogbnVtYmVyID0gdHlwZW9mIHZhbCA9PT0gJ3N0cmluZycgPyBwYXJzZUludCh2YWwsIDEwKSA6IHZhbDtcblxuICBpZiAoaXNOYU4ocG9ydCkpIHtcbiAgICAvLyBuYW1lZCBwaXBlXG4gICAgcmV0dXJuIHZhbDtcbiAgfVxuXG4gIGlmIChwb3J0ID49IDApIHtcbiAgICAvLyBwb3J0IG51bWJlclxuICAgIHJldHVybiBwb3J0O1xuICB9XG5cbiAgcmV0dXJuIDgwODA7XG59XG5cbnR5cGUgUGFja2FnZUluZm8gPSBSZXR1cm5UeXBlPCh0eXBlb2YgX3BrZ0xpc3QpWydwYWNrYWdlczRXb3Jrc3BhY2UnXT4gZXh0ZW5kcyBHZW5lcmF0b3I8aW5mZXIgVD4gPyBUIDogdW5rbm93bjtcblxuZXhwb3J0IGludGVyZmFjZSBXaXRoUGFja2FnZVNldHRpbmdQcm9wIHtcbiAgc2V0dGluZzoge1xuICAgIC8qKiBJbiBmb3JtIG9mIFwiPHBhdGg+IzxleHBvcnQtbmFtZT5cIiAqL1xuICAgIHR5cGU6IHN0cmluZztcbiAgICAvKiogSW4gZm9ybSBvZiBcIjxtb2R1bGUtcGF0aD4jPGV4cG9ydC1uYW1lPlwiICovXG4gICAgdmFsdWU6IHN0cmluZztcbiAgfTtcbn1cbi8qKlxuICogQHJldHVybnMgW2RlZmF1bHRWYWx1ZUZpbGUsIGV4cG9ydE5hbWUsIGR0c0ZpbGVdXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiogZ2V0UGFja2FnZVNldHRpbmdGaWxlcyh3b3Jrc3BhY2VLZXk6IHN0cmluZywgaW5jbHVkZVBrZz86IFNldDxzdHJpbmc+KTogR2VuZXJhdG9yPFtcbiAgLyoqIHJlbGF0aXZlIHBhdGggd2l0aGluIHBhY2thZ2UgcmVhbHBhdGgsIHdpdGhvdXQgZXh0IGZpbGUgbmFtZSAqL1xuICB0eXBlRmlsZVdpdGhvdXRFeHQ6IHN0cmluZyxcbiAgdHlwZUV4cG9ydE5hbWU6IHN0cmluZyxcbiAgLyoqIHJlbGF0aXZlIHBhdGggb2YganMgZmlsZSwgd2hpY2ggZXhwb3J0cyBkZWZhdWx0IHZhbHVlIG9yIGZhY3RvcnkgZnVuY3Rpb24gb2YgZGVmYXVsdCB2YWx1ZSAqL1xuICBqc0ZpbGU6IHN0cmluZyxcbiAgZGVmYXVsdEV4cG9ydE5hbWU6IHN0cmluZyxcbiAgcGtnOiBQYWNrYWdlSW5mb1xuXT4ge1xuICBjb25zdCB7cGFja2FnZXM0V29ya3NwYWNlS2V5fSA9IHJlcXVpcmUoJy4uL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInKSBhcyB0eXBlb2YgX3BrZ0xpc3Q7XG4gIGZvciAoY29uc3QgcGtnIG9mIHBhY2thZ2VzNFdvcmtzcGFjZUtleSh3b3Jrc3BhY2VLZXksIHRydWUpKSB7XG4gICAgaWYgKGluY2x1ZGVQa2cgJiYgIWluY2x1ZGVQa2cuaGFzKHBrZy5uYW1lKSlcbiAgICAgIGNvbnRpbnVlO1xuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGRyOiBXaXRoUGFja2FnZVNldHRpbmdQcm9wID0gcGtnLmpzb24uZHIgfHwgcGtnLmpzb24ucGxpbms7XG4gICAgICBpZiAoZHIgPT0gbnVsbCB8fCB0eXBlb2YgZHIuc2V0dGluZyAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCBzZXR0aW5nID0gZHIuc2V0dGluZztcbiAgICAgIGxvZy5kZWJ1ZygnZ2V0UGFja2FnZVNldHRpbmdGaWxlcycsIHBrZy5uYW1lLCBzZXR0aW5nKTtcbiAgICAgIGxldCBbdmFsdWVGaWxlLCB2YWx1ZUV4cG9ydF0gPSBzZXR0aW5nLnZhbHVlLnNwbGl0KCcjJywgMik7XG5cbiAgICAgIC8vIENoZWNrIHZhbHVlIGZpbGVcbiAgICAgIGNvbnN0IGV4dCA9IFBhdGguZXh0bmFtZSh2YWx1ZUZpbGUpO1xuICAgICAgaWYgKGV4dCA9PT0gJycpIHtcbiAgICAgICAgdmFsdWVGaWxlID0gdmFsdWVGaWxlICsgJy5qcyc7XG4gICAgICB9XG4gICAgICBpZiAodmFsdWVFeHBvcnQgPT0gbnVsbClcbiAgICAgICAgdmFsdWVFeHBvcnQgPSAnZGVmYXVsdCc7XG5cbiAgICAgIGNvbnN0IGFic0ZpbGUgPSBQYXRoLnJlc29sdmUocGtnLnJlYWxQYXRoLCB2YWx1ZUZpbGUpO1xuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGFic0ZpbGUpKSB7XG4gICAgICAgIGxvZy53YXJuKGBQYWNrYWdlICR7cGtnLm5hbWV9J3MgY29uZmlndXJlIGZpbGUgXCIke2Fic0ZpbGV9XCIgZG9lcyBub3QgZXhpc3QsIHNraXBwZWQuYCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgLy8gQ2hlY2sgZHRzIHR5cGUgZmlsZVxuICAgICAgbGV0IFt0eXBlRmlsZSwgdHlwZUV4cG9ydE5hbWVdID0gc2V0dGluZy50eXBlLnNwbGl0KCcjJywgMik7XG4gICAgICBsZXQgdHlwZUZpbGVFeHQgPSBQYXRoLmV4dG5hbWUodHlwZUZpbGUpO1xuICAgICAgaWYgKHR5cGVGaWxlRXh0ID09PSAnJykge1xuICAgICAgICB0eXBlRmlsZSArPSAnLmR0cyc7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGFic1R5cGVGaWxlID0gUGF0aC5yZXNvbHZlKHBrZy5yZWFsUGF0aCwgdHlwZUZpbGVFeHQpO1xuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGFic1R5cGVGaWxlKSkge1xuICAgICAgICBsb2cud2FybihgUGFja2FnZSBzZXR0aW5nICR7cGtnLm5hbWV9J3MgZHRzIGZpbGUgXCIke2Fic1R5cGVGaWxlfVwiIGRvZXMgbm90IGV4aXN0LCBza2lwcGVkLmApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGlmICh0eXBlRXhwb3J0TmFtZSA9PSBudWxsKSB7XG4gICAgICAgIGxvZy5lcnJvcihgSW5jb3JyZWN0IHBhY2thZ2UgY29uZmlnIHByb3BlcnR5IGZvcm1hdCBcIiR7c2V0dGluZy50eXBlfVwiIGluICR7cGtnLnBhdGggKyBQYXRoLnNlcH1wYWNrYWdlLmpzb25gICtcbiAgICAgICAgICAnLCBjb3JyZWN0IGZvcm1hdCBpcyBcIjxkdHMtZmlsZS1yZWxhdGl2ZS1wYXRoPiM8VFMtdHlwZS1leHBvcnQtbmFtZT5cIicpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHlpZWxkIFt0eXBlRmlsZS5yZXBsYWNlKC9cXC5bXi4vXFxcXF0rJC9nLCAnJyksIHR5cGVFeHBvcnROYW1lLCB2YWx1ZUZpbGUsIHZhbHVlRXhwb3J0LCBwa2ddO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgbG9nLndhcm4oYFNraXAgbG9hZGluZyBzZXR0aW5nIG9mIHBhY2thZ2UgJHtwa2cubmFtZX0sIGR1ZSB0byAodGhpcyBtaWdodCBiZSBjYXVzZWQgYnkgaW5jb3JyZWN0IHBhY2thZ2UuanNvbiBmb3JtYXQgc3RvcmVkIGxhc3QgdGltZSlgLCBlcnIpO1xuICAgIH1cbiAgfVxufVxuLyoqXG4gKiBAcmV0dXJucyBhYnN1bHRlIHBhdGggb2Ygc2V0dGluZyBKUyBmaWxlcyB3aGljaCBjb250YWlucyBleHBvcnRzIG5hbWVkIHdpdGggXCJkZWZhdWx0XCJcbiAqL1xuZnVuY3Rpb24gbG9hZFBhY2thZ2VTZXR0aW5ncygpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IHt3b3Jrc3BhY2VLZXksIGlzQ3dkV29ya3NwYWNlfSA9IHJlcXVpcmUoJy4uL3BhY2thZ2UtbWdyJykgYXMgdHlwZW9mIF9wa2dNZ3I7XG4gIGlmICghaXNDd2RXb3Jrc3BhY2UoKSkge1xuICAgIGxvZy5kZWJ1ZygnTm90IGluIGEgd29ya3NwYWNlLCBza2lwIGxvYWRpbmcgcGFja2FnZSBzZXR0aW5ncycpO1xuICAgIHJldHVybiBbXTtcbiAgfVxuICBjb25zdCBqc0ZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuICBmb3IgKGNvbnN0IFtfdHlwZUZpbGUsIF90eXBlRXhwb3J0LCBqc0ZpbGUsIGRlZmF1bHRTZXR0aW5nRXhwb3J0LCBwa2ddIG9mIGdldFBhY2thZ2VTZXR0aW5nRmlsZXMod29ya3NwYWNlS2V5KHByb2Nlc3MuY3dkKCkpKSkge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBhYnNGaWxlID0gUGF0aC5yZXNvbHZlKHBrZy5yZWFsUGF0aCwganNGaWxlKTtcbiAgICAgIGNvbnN0IGV4cHMgPSByZXF1aXJlKGFic0ZpbGUpO1xuICAgICAgY29uc3QgZGVmYXVsdFNldHRpbmdGYWN0b3J5ID0gZXhwc1tkZWZhdWx0U2V0dGluZ0V4cG9ydF07XG5cbiAgICAgIGlmICh0eXBlb2YgZGVmYXVsdFNldHRpbmdGYWN0b3J5ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gZGVmYXVsdFNldHRpbmdGYWN0b3J5KGdldFN0YXRlKCkpO1xuICAgICAgICBkaXNwYXRjaGVyLl9jaGFuZ2UocyA9PiBzW3BrZy5uYW1lXSA9IHZhbHVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy53YXJuKGBGYWlsZWQgdG8gbG9hZCBwYWNrYWdlIHNldHRpbmcgZnJvbSAke3BrZy5uYW1lfS8ke2pzRmlsZX0uXFxuIEV4cG9ydCBuYW1lIFwiJHtkZWZhdWx0U2V0dGluZ0V4cG9ydH1cIiBpcyBub3QgZm91bmRgKTtcbiAgICAgIH1cbiAgICAgIC8vIE5vdCB1c2VkIGZvciBub3dcbiAgICAgIGlmIChleHBzLmRlZmF1bHQgIT0gbnVsbCkge1xuICAgICAgICBqc0ZpbGVzLnB1c2goYWJzRmlsZSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBsb2cuZXJyb3IoYEZhaWxlZCB0byBsb2FkIHBhY2thZ2Ugc2V0dGluZyBmcm9tICR7cGtnLm5hbWV9LyR7anNGaWxlfS4nJHtkZWZhdWx0U2V0dGluZ0V4cG9ydH1gLCBlcnIpO1xuICAgIH1cbiAgfVxuICByZXR1cm4ganNGaWxlcztcbn1cbmV4cG9ydCBkZWZhdWx0IChjb25maWcgYXMgRHJjcENvbmZpZyk7XG4iXX0=