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
// const yamljs = require('yamljs');
const yamljs_1 = __importDefault(require("yamljs"));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jb25maWcvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLCtDQUErQztBQUMvQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUM1QixvREFBdUI7QUFDdkIsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QixrREFBMEI7QUFDMUIsc0RBQThFO0FBRTlFLHdEQUFpRDtBQUVqRCx5Q0FBMkI7QUFDM0IsbURBQXFDO0FBQ3JDLG9EQUE0QjtBQUM1QixpREFBa0U7QUFJbEUsbURBQTRDO0FBRTVDLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQzdDLG9DQUFvQztBQUNwQyxvREFBNEI7QUFDNUIsTUFBTSxFQUFDLE9BQU8sRUFBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFRLENBQWEsQ0FBQztBQUUvRCxJQUFJLFFBQVEsR0FBRyxPQUFPLENBQUM7QUFFVixRQUFBLFNBQVMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxlQUFlLENBQStCLFNBQVMsQ0FBQyxDQUFDO0FBRXpGLGdCQUFnQixFQUFFLENBQUM7QUFFbkIsU0FBUyxnQkFBZ0I7SUFDdkIsSUFBSSxnQkFBZ0IsR0FBRyxFQUFFLENBQUM7SUFDMUIsSUFBSSxPQUFPLENBQUMsSUFBSTtRQUNkLGdCQUFnQixHQUFHLFNBQVMsQ0FBQztTQUMxQixJQUFJLENBQUMsNkJBQVk7UUFDcEIsZ0JBQWdCLEdBQUcsVUFBVSxDQUFDO0lBQ2hDLGdCQUFNLENBQUMsU0FBUyxDQUFDO1FBQ2YsU0FBUyxFQUFFO1lBQ1QsR0FBRyxFQUFFO2dCQUNILElBQUksRUFBRSxRQUFRO2dCQUNkLE1BQU0sRUFBRSxFQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixHQUFH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aW5lLWxlbmd0aFxucmVxdWlyZSgneWFtbGlmeS9yZWdpc3RlcicpO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQge0NvbmZpZ0hhbmRsZXJNZ3IsIERyY3BDb25maWcsIENvbmZpZ0hhbmRsZXJ9IGZyb20gJy4uL2NvbmZpZy1oYW5kbGVyJztcbmltcG9ydCB7R2xvYmFsT3B0aW9ucyBhcyBDbGlPcHRpb25zfSBmcm9tICcuLi9jbWQvdHlwZXMnO1xuaW1wb3J0IHtnZXRMYW5JUHY0fSBmcm9tICcuLi91dGlscy9uZXR3b3JrLXV0aWwnO1xuaW1wb3J0IHtQbGlua0Vudn0gZnJvbSAnLi4vbm9kZS1wYXRoJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtkaXNwYXRjaGVyLCBnZXRTdGF0ZSwgRHJjcFNldHRpbmdzfSBmcm9tICcuL2NvbmZpZy1zbGljZSc7XG4vLyBSZWZhY3RvcjogY2lyY3VsYXIgcmVmZXJlbmNlXG5pbXBvcnQgKiBhcyBfcGtnTGlzdCBmcm9tICcuLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCAqIGFzIF9wa2dNZ3IgZnJvbSAnLi4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHtpc01haW5UaHJlYWR9IGZyb20gJ3dvcmtlcl90aHJlYWRzJztcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuY29uZmlnJyk7XG4vLyBjb25zdCB5YW1sanMgPSByZXF1aXJlKCd5YW1sanMnKTtcbmltcG9ydCB5YW1sanMgZnJvbSAneWFtbGpzJztcbmNvbnN0IHtyb290RGlyfSA9IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluayEpIGFzIFBsaW5rRW52O1xuXG5sZXQgcm9vdFBhdGggPSByb290RGlyO1xuXG5leHBvcnQgY29uc3QgaGFuZGxlcnMkID0gbmV3IHJ4LkJlaGF2aW9yU3ViamVjdDxDb25maWdIYW5kbGVyTWdyIHwgdW5kZWZpbmVkPih1bmRlZmluZWQpO1xuXG5jb25maWdEZWZhdWx0TG9nKCk7XG5cbmZ1bmN0aW9uIGNvbmZpZ0RlZmF1bHRMb2coKSB7XG4gIGxldCBsb2dQYXR0ZXJuUHJlZml4ID0gJyc7XG4gIGlmIChwcm9jZXNzLnNlbmQpXG4gICAgbG9nUGF0dGVyblByZWZpeCA9ICdwaWQ6JXogJztcbiAgZWxzZSBpZiAoIWlzTWFpblRocmVhZClcbiAgICBsb2dQYXR0ZXJuUHJlZml4ID0gJ1t0aHJlYWRdJztcbiAgbG9nNGpzLmNvbmZpZ3VyZSh7XG4gICAgYXBwZW5kZXJzOiB7XG4gICAgICBvdXQ6IHtcbiAgICAgICAgdHlwZTogJ3N0ZG91dCcsXG4gICAgICAgIGxheW91dDoge3R5cGU6ICdwYXR0ZXJuJywgcGF0dGVybjogbG9nUGF0dGVyblByZWZpeCArICclWyVjJV0gLSAlbSd9XG4gICAgICB9XG4gICAgfSxcbiAgICBjYXRlZ29yaWVzOiB7XG4gICAgICBkZWZhdWx0OiB7YXBwZW5kZXJzOiBbJ291dCddLCBsZXZlbDogJ2luZm8nfVxuICAgIH1cbiAgfSk7XG4gIC8qKlxuICAgLSAlciB0aW1lIGluIHRvTG9jYWxlVGltZVN0cmluZyBmb3JtYXRcbiAgIC0gJXAgbG9nIGxldmVsXG4gICAtICVjIGxvZyBjYXRlZ29yeVxuICAgLSAlaCBob3N0bmFtZVxuICAgLSAlbSBsb2cgZGF0YVxuICAgLSAlZCBkYXRlLCBmb3JtYXR0ZWQgLSBkZWZhdWx0IGlzIElTTzg2MDEsIGZvcm1hdCBvcHRpb25zIGFyZTogSVNPODYwMSwgSVNPODYwMV9XSVRIX1RaX09GRlNFVCwgQUJTT0xVVEUsIERBVEUsIG9yIGFueSBzdHJpbmcgY29tcGF0aWJsZSB3aXRoIHRoZSBkYXRlLWZvcm1hdCBsaWJyYXJ5LiBlLmcuICVke0RBVEV9LCAlZHt5eXl5L01NL2RkLWhoLm1tLnNzfVxuICAgLSAlJSAlIC0gZm9yIHdoZW4geW91IHdhbnQgYSBsaXRlcmFsICUgaW4geW91ciBvdXRwdXRcbiAgIC0gJW4gbmV3bGluZVxuICAgLSAleiBwcm9jZXNzIGlkIChmcm9tIHByb2Nlc3MucGlkKVxuICAgLSAlZiBmdWxsIHBhdGggb2YgZmlsZW5hbWUgKHJlcXVpcmVzIGVuYWJsZUNhbGxTdGFjazogdHJ1ZSBvbiB0aGUgY2F0ZWdvcnksIHNlZSBjb25maWd1cmF0aW9uIG9iamVjdClcbiAgIC0gJWZ7ZGVwdGh9IHBhdGjigJlzIGRlcHRoIGxldCB5b3UgY2hvc2UgdG8gaGF2ZSBvbmx5IGZpbGVuYW1lICglZnsxfSkgb3IgYSBjaG9zZW4gbnVtYmVyIG9mIGRpcmVjdG9yaWVzXG4gICAtICVsIGxpbmUgbnVtYmVyIChyZXF1aXJlcyBlbmFibGVDYWxsU3RhY2s6IHRydWUgb24gdGhlIGNhdGVnb3J5LCBzZWUgY29uZmlndXJhdGlvbiBvYmplY3QpXG4gICAtICVvIGNvbHVtbiBwb3N0aW9uIChyZXF1aXJlcyBlbmFibGVDYWxsU3RhY2s6IHRydWUgb24gdGhlIGNhdGVnb3J5LCBzZWUgY29uZmlndXJhdGlvbiBvYmplY3QpXG4gICAtICVzIGNhbGwgc3RhY2sgKHJlcXVpcmVzIGVuYWJsZUNhbGxTdGFjazogdHJ1ZSBvbiB0aGUgY2F0ZWdvcnksIHNlZSBjb25maWd1cmF0aW9uIG9iamVjdClcbiAgIC0gJXh7PHRva2VubmFtZT59IGFkZCBkeW5hbWljIHRva2VucyB0byB5b3VyIGxvZy4gVG9rZW5zIGFyZSBzcGVjaWZpZWQgaW4gdGhlIHRva2VucyBwYXJhbWV0ZXIuXG4gICAtICVYezx0b2tlbm5hbWU+fSBhZGQgdmFsdWVzIGZyb20gdGhlIExvZ2dlciBjb250ZXh0LiBUb2tlbnMgYXJlIGtleXMgaW50byB0aGUgY29udGV4dCB2YWx1ZXMuXG4gICAtICVbIHN0YXJ0IGEgY29sb3VyZWQgYmxvY2sgKGNvbG91ciB3aWxsIGJlIHRha2VuIGZyb20gdGhlIGxvZyBsZXZlbCwgc2ltaWxhciB0byBjb2xvdXJlZExheW91dClcbiAgIC0gJV0gZW5kIGEgY29sb3VyZWQgYmxvY2tcbiAgICovXG59XG5cbi8qKlxuICogcmVhZCBhbmQgcmV0dXJuIGNvbmZpZ3VyYXRpb25cbiAqIEBuYW1lIGNvbmZpZ1xuICogQHJldHVybiB7b2JqZWN0fSBzZXR0aW5nXG4gKi9cbmNvbnN0IGNvbmZpZyA9ICgpOiBEcmNwU2V0dGluZ3MgPT4ge1xuICByZXR1cm4gZ2V0U3RhdGUoKSBhcyBEcmNwU2V0dGluZ3M7XG59O1xuXG5jb25maWcuaW5pdFN5bmMgPSAoYXJndjogQ2xpT3B0aW9ucykgPT4ge1xuICBkaXNwYXRjaGVyLnNhdmVDbGlPcHRpb24oYXJndik7XG4gIGxvYWQoYXJndik7XG4gIHJldHVybiBnZXRTdGF0ZSgpIGFzIERyY3BTZXR0aW5ncztcbn07XG5cblxuY29uZmlnLnJlbG9hZCA9IGZ1bmN0aW9uIHJlbG9hZCgpIHtcbiAgY29uc3QgYXJndiA9IGdldFN0YXRlKCkuY2xpT3B0aW9ucyE7XG4gIGxvYWQoYXJndik7XG4gIHJldHVybiBnZXRTdGF0ZSgpIGFzIERyY3BTZXR0aW5ncztcbn07XG5cbmNvbmZpZy5zZXQgPSBmdW5jdGlvbihwYXRoOiBzdHJpbmcsIHZhbHVlOiBhbnkpIHtcbiAgZGlzcGF0Y2hlci5fY2hhbmdlKHNldHRpbmcgPT4ge1xuICAgIF8uc2V0KHNldHRpbmcsIHBhdGgsIHZhbHVlKTtcbiAgfSk7XG4gIHJldHVybiBnZXRTdGF0ZSgpO1xufTtcblxuY29uZmlnLmdldCA9IGZ1bmN0aW9uKHByb3BQYXRoOiBzdHJpbmcsIGRlZmF1bHRWYWx1ZTogYW55KSB7XG4gIHJldHVybiBfLmdldChnZXRTdGF0ZSgpLCBwcm9wUGF0aCwgZGVmYXVsdFZhbHVlKTtcbn07XG5cbi8vIGNvbmZpZy5zZXREZWZhdWx0ID0gZnVuY3Rpb24ocHJvcFBhdGg6IHN0cmluZywgdmFsdWU6IGFueSkge1xuLy8gICBpZiAoIV8uaGFzKHNldHRpbmcsIHByb3BQYXRoKSkge1xuLy8gICAgIF8uc2V0KHNldHRpbmcsIHByb3BQYXRoLCB2YWx1ZSk7XG4vLyAgIH1cbi8vICAgcmV0dXJuIHNldHRpbmc7XG4vLyB9O1xuXG4vKipcbiAqIFJlc29sdmUgYSBwYXRoIGJhc2VkIG9uIGByb290UGF0aGBcbiAqIEBuYW1lIHJlc29sdmVcbiAqIEBtZW1iZXJvZiBjb25maWdcbiAqIEBwYXJhbSAge3N0cmluZ30gcHJvcGVydHkgbmFtZSBvciBwcm9wZXJ0eSBwYXRoLCBsaWtlIFwibmFtZVwiLCBcIm5hbWUuY2hpbGRQcm9wWzFdXCJcbiAqIEByZXR1cm4ge3N0cmluZ30gICAgIGFic29sdXRlIHBhdGhcbiAqL1xuY29uZmlnLnJlc29sdmUgPSBmdW5jdGlvbihwYXRoUHJvcE5hbWU6ICdyb290UGF0aCcgfCAnZGVzdERpcid8J3N0YXRpY0Rpcid8J3NlcnZlckRpcicsIC4uLnBhdGhzOiBzdHJpbmdbXSkge1xuICBjb25zdCBhcmdzOiBzdHJpbmdbXSA9IFtyb290UGF0aCwgZ2V0U3RhdGUoKVtwYXRoUHJvcE5hbWVdLCAuLi5wYXRoc107XG4gIHJldHVybiBQYXRoLnJlc29sdmUoLi4uYXJncyk7XG59O1xuXG4vLyBjb25maWcuY29uZmlndXJlU3RvcmUgPSBjb25maWd1cmVTdG9yZTtcblxuY29uZmlnLmNvbmZpZ0hhbmRsZXJNZ3IgPSBoYW5kbGVycyQ7XG5cbmNvbmZpZy5jb25maWdIYW5kbGVyTWdyQ2hhbmdlZCA9IGZ1bmN0aW9uKGNiOiAoaGFuZGxlcjogQ29uZmlnSGFuZGxlck1ncikgPT4gdm9pZCkge1xuICBoYW5kbGVycyQucGlwZShcbiAgICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIG9wLmZpbHRlcihoYW5kbGVyID0+IGhhbmRsZXIgIT0gbnVsbCksXG4gICAgb3AudGFwKGhhbmRsZXIgPT4gY2IoaGFuZGxlciEpKVxuICApLnN1YnNjcmliZSgpO1xufTtcblxuY29uZmlnLmNvbmZpZ0hhbmRsZXJNZ3JDcmVhdGVkID0gZnVuY3Rpb24oY2I6IChoYW5kbGVyOiBDb25maWdIYW5kbGVyTWdyKSA9PiBQcm9taXNlPGFueT4gfCB2b2lkKTogUHJvbWlzZTx2b2lkPiB7XG4gIHJldHVybiBoYW5kbGVycyQucGlwZShcbiAgICBvcC5kaXN0aW5jdFVudGlsQ2hhbmdlZCgpLFxuICAgIG9wLmZpbHRlcihoYW5kbGVyID0+IGhhbmRsZXIgIT0gbnVsbCksXG4gICAgb3AuY29uY2F0TWFwKGhhbmRsZXIgPT4gUHJvbWlzZS5yZXNvbHZlKGNiKGhhbmRsZXIhKSkpLFxuICAgIG9wLnRha2UoMSlcbiAgKS50b1Byb21pc2UoKTtcbn07XG5cbmZ1bmN0aW9uIGxvYWQoY2xpT3B0aW9uOiBDbGlPcHRpb25zKSB7XG4gIGRpc3BhdGNoZXIuX2NoYW5nZShzID0+IHtcbiAgICBzLmxvY2FsSVAgPSBnZXRMYW5JUHY0KCk7XG4gIH0pO1xuICBsb2FkUGFja2FnZVNldHRpbmdzKCk7XG4gIGNvbnN0IGNvbmZpZ0ZpbGVMaXN0ID0gY2xpT3B0aW9uLmNvbmZpZyB8fCBbXTtcbiAgY29uZmlnRmlsZUxpc3QuZm9yRWFjaChsb2NhbENvbmZpZ1BhdGggPT4gbWVyZ2VGcm9tWWFtbEpzb25GaWxlKGxvY2FsQ29uZmlnUGF0aCkpO1xuICBjb25zdCBoYW5kbGVycyA9IG5ldyBDb25maWdIYW5kbGVyTWdyKFxuICAgIGNvbmZpZ0ZpbGVMaXN0LmZpbHRlcihuYW1lID0+IC9cXC5bdGpdcyQvLnRlc3QobmFtZSkpKTtcbiAgaGFuZGxlcnMkLm5leHQoaGFuZGxlcnMpO1xuICBkaXNwYXRjaGVyLl9jaGFuZ2UoZHJhZnQgPT4ge1xuICAgIGhhbmRsZXJzLnJ1bkVhY2hTeW5jPENvbmZpZ0hhbmRsZXI+KChfZmlsZSwgb2JqLCBoYW5kbGVyKSA9PiB7XG4gICAgICBpZiAoaGFuZGxlci5vbkNvbmZpZykge1xuICAgICAgICByZXR1cm4gaGFuZGxlci5vbkNvbmZpZyhkcmFmdCBhcyBEcmNwU2V0dGluZ3MsIGRyYWZ0LmNsaU9wdGlvbnMhKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG4gIHZhbGlkYXRlQ29uZmlnKCk7XG5cbiAgZGlzcGF0Y2hlci5fY2hhbmdlKHMgPT4ge1xuICAgIHMucG9ydCA9IG5vcm1hbGl6ZVBvcnQocy5wb3J0KTtcbiAgfSk7XG4gIG1lcmdlRnJvbUNsaUFyZ3MoZ2V0U3RhdGUoKS5jbGlPcHRpb25zISk7XG59XG5cbmZ1bmN0aW9uIG1lcmdlRnJvbVlhbWxKc29uRmlsZShsb2NhbENvbmZpZ1BhdGg6IHN0cmluZykge1xuICBpZiAoIWZzLmV4aXN0c1N5bmMobG9jYWxDb25maWdQYXRoKSkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGxvZy5pbmZvKGNoYWxrLnllbGxvdygnIEZpbGUgZG9lcyBub3QgZXhpc3Q6ICVzJywgbG9jYWxDb25maWdQYXRoKSk7XG4gICAgcmV0dXJuO1xuICB9XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBsb2cuaW5mbyhgIFJlYWQgJHtsb2NhbENvbmZpZ1BhdGh9YCk7XG4gIHZhciBjb25maWdPYmo6IHtba2V5OiBzdHJpbmddOiBhbnl9O1xuXG4gIGNvbnN0IG1hdGNoZWQgPSAvXFwuKFteLl0rKSQvLmV4ZWMobG9jYWxDb25maWdQYXRoKTtcblxuICBsZXQgc3VmZml4ID0gbWF0Y2hlZCA/IG1hdGNoZWRbMV0gOiBudWxsO1xuICBpZiAoc3VmZml4ID09PSAneWFtbCcgfHwgc3VmZml4ID09PSAneW1sJykge1xuICAgIGNvbmZpZ09iaiA9IHlhbWxqcy5wYXJzZShmcy5yZWFkRmlsZVN5bmMobG9jYWxDb25maWdQYXRoLCAndXRmOCcpKTtcbiAgfSBlbHNlIGlmIChzdWZmaXggPT09ICdqc29uJykge1xuICAgIGNvbmZpZ09iaiA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKGxvY2FsQ29uZmlnUGF0aCkpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGRpc3BhdGNoZXIuX2NoYW5nZShzZXR0aW5nID0+IHtcbiAgICBfLmFzc2lnbldpdGgoc2V0dGluZywgY29uZmlnT2JqLCAob2JqVmFsdWUsIHNyY1ZhbHVlLCBrZXksIG9iamVjdCwgc291cmNlKSA9PiB7XG4gICAgICBpZiAoXy5pc09iamVjdChvYmpWYWx1ZSkgJiYgIUFycmF5LmlzQXJyYXkob2JqVmFsdWUpKSB7XG4gICAgICAgIC8vIFdlIG9ubHkgbWVyZ2UgMXN0IGFuZCAybmQgbGV2ZWwgcHJvcGVydGllc1xuICAgICAgICByZXR1cm4gXy5hc3NpZ24ob2JqVmFsdWUsIHNyY1ZhbHVlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIG1lcmdlRnJvbUNsaUFyZ3MoY2xpT3B0OiBDbGlPcHRpb25zKSB7XG4gIGlmICghY2xpT3B0LnByb3ApXG4gICAgcmV0dXJuO1xuICBmb3IgKGxldCBwcm9wUGFpciBvZiBjbGlPcHQucHJvcCkge1xuICAgIGNvbnN0IHByb3BTZXQgPSBwcm9wUGFpci5zcGxpdCgnPScpO1xuICAgIGxldCBwcm9wUGF0aCA9IHByb3BTZXRbMF07XG4gICAgaWYgKF8uc3RhcnRzV2l0aChwcm9wU2V0WzBdLCAnWycpKVxuICAgICAgcHJvcFBhdGggPSBKU09OLnBhcnNlKHByb3BTZXRbMF0pO1xuICAgIGxldCB2YWx1ZTogYW55O1xuICAgIHRyeSB7XG4gICAgICB2YWx1ZSA9IEpTT04ucGFyc2UocHJvcFNldFsxXSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdmFsdWUgPSBwcm9wU2V0WzFdID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IHByb3BTZXRbMV07XG4gICAgfVxuICAgIGRpc3BhdGNoZXIuX2NoYW5nZShzID0+IF8uc2V0KHMsIHByb3BQYXRoLCB2YWx1ZSkpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGxvZy5pbmZvKGBbY29uZmlnXSBzZXQgJHtwcm9wUGF0aH0gPSAke3ZhbHVlfWApO1xuICB9XG59XG5cblxuZnVuY3Rpb24gdmFsaWRhdGVDb25maWcoKSB7XG4gIC8vIFRPRE86IGpzb24gc2NoZW1hIHZhbGlkYXRpb25cbn1cblxuLy8gZnVuY3Rpb24gdHJpbVRhaWxTbGFzaCh1cmw6IHN0cmluZykge1xuLy8gICBpZiAodXJsID09PSAnLycpIHtcbi8vICAgICByZXR1cm4gdXJsO1xuLy8gICB9XG4vLyAgIHJldHVybiBfLmVuZHNXaXRoKHVybCwgJy8nKSA/IHVybC5zdWJzdHJpbmcoMCwgdXJsLmxlbmd0aCAtIDEpIDogdXJsO1xuLy8gfVxuXG5mdW5jdGlvbiBub3JtYWxpemVQb3J0KHZhbDogc3RyaW5nIHwgbnVtYmVyKSB7XG4gIGxldCBwb3J0OiBudW1iZXIgPSB0eXBlb2YgdmFsID09PSAnc3RyaW5nJyA/IHBhcnNlSW50KHZhbCwgMTApIDogdmFsO1xuXG4gIGlmIChpc05hTihwb3J0KSkge1xuICAgIC8vIG5hbWVkIHBpcGVcbiAgICByZXR1cm4gdmFsO1xuICB9XG5cbiAgaWYgKHBvcnQgPj0gMCkge1xuICAgIC8vIHBvcnQgbnVtYmVyXG4gICAgcmV0dXJuIHBvcnQ7XG4gIH1cblxuICByZXR1cm4gODA4MDtcbn1cblxudHlwZSBQYWNrYWdlSW5mbyA9IFJldHVyblR5cGU8KHR5cGVvZiBfcGtnTGlzdClbJ3BhY2thZ2VzNFdvcmtzcGFjZSddPiBleHRlbmRzIEdlbmVyYXRvcjxpbmZlciBUPiA/IFQgOiB1bmtub3duO1xuXG5leHBvcnQgaW50ZXJmYWNlIFdpdGhQYWNrYWdlU2V0dGluZ1Byb3Age1xuICBzZXR0aW5nOiB7XG4gICAgLyoqIEluIGZvcm0gb2YgXCI8cGF0aD4jPGV4cG9ydC1uYW1lPlwiICovXG4gICAgdHlwZTogc3RyaW5nO1xuICAgIC8qKiBJbiBmb3JtIG9mIFwiPG1vZHVsZS1wYXRoPiM8ZXhwb3J0LW5hbWU+XCIgKi9cbiAgICB2YWx1ZTogc3RyaW5nO1xuICB9O1xufVxuLyoqXG4gKiBAcmV0dXJucyBbZGVmYXVsdFZhbHVlRmlsZSwgZXhwb3J0TmFtZSwgZHRzRmlsZV1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uKiBnZXRQYWNrYWdlU2V0dGluZ0ZpbGVzKHdvcmtzcGFjZUtleTogc3RyaW5nLCBpbmNsdWRlUGtnPzogU2V0PHN0cmluZz4pOiBHZW5lcmF0b3I8W1xuICAvKiogcmVsYXRpdmUgcGF0aCB3aXRoaW4gcGFja2FnZSByZWFscGF0aCwgd2l0aG91dCBleHQgZmlsZSBuYW1lICovXG4gIHR5cGVGaWxlV2l0aG91dEV4dDogc3RyaW5nLFxuICB0eXBlRXhwb3J0TmFtZTogc3RyaW5nLFxuICAvKiogcmVsYXRpdmUgcGF0aCBvZiBqcyBmaWxlLCB3aGljaCBleHBvcnRzIGRlZmF1bHQgdmFsdWUgb3IgZmFjdG9yeSBmdW5jdGlvbiBvZiBkZWZhdWx0IHZhbHVlICovXG4gIGpzRmlsZTogc3RyaW5nLFxuICBkZWZhdWx0RXhwb3J0TmFtZTogc3RyaW5nLFxuICBwa2c6IFBhY2thZ2VJbmZvXG5dPiB7XG4gIGNvbnN0IHtwYWNrYWdlczRXb3Jrc3BhY2VLZXl9ID0gcmVxdWlyZSgnLi4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcicpIGFzIHR5cGVvZiBfcGtnTGlzdDtcbiAgZm9yIChjb25zdCBwa2cgb2YgcGFja2FnZXM0V29ya3NwYWNlS2V5KHdvcmtzcGFjZUtleSwgdHJ1ZSkpIHtcbiAgICBpZiAoaW5jbHVkZVBrZyAmJiAhaW5jbHVkZVBrZy5oYXMocGtnLm5hbWUpKVxuICAgICAgY29udGludWU7XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgZHI6IFdpdGhQYWNrYWdlU2V0dGluZ1Byb3AgPSBwa2cuanNvbi5kciB8fCBwa2cuanNvbi5wbGluaztcbiAgICAgIGlmIChkciA9PSBudWxsIHx8IHR5cGVvZiBkci5zZXR0aW5nICE9PSAnb2JqZWN0Jykge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHNldHRpbmcgPSBkci5zZXR0aW5nO1xuICAgICAgbG9nLmRlYnVnKCdnZXRQYWNrYWdlU2V0dGluZ0ZpbGVzJywgcGtnLm5hbWUsIHNldHRpbmcpO1xuICAgICAgbGV0IFt2YWx1ZUZpbGUsIHZhbHVlRXhwb3J0XSA9IHNldHRpbmcudmFsdWUuc3BsaXQoJyMnLCAyKTtcblxuICAgICAgLy8gQ2hlY2sgdmFsdWUgZmlsZVxuICAgICAgY29uc3QgZXh0ID0gUGF0aC5leHRuYW1lKHZhbHVlRmlsZSk7XG4gICAgICBpZiAoZXh0ID09PSAnJykge1xuICAgICAgICB2YWx1ZUZpbGUgPSB2YWx1ZUZpbGUgKyAnLmpzJztcbiAgICAgIH1cbiAgICAgIGlmICh2YWx1ZUV4cG9ydCA9PSBudWxsKVxuICAgICAgICB2YWx1ZUV4cG9ydCA9ICdkZWZhdWx0JztcblxuICAgICAgY29uc3QgYWJzRmlsZSA9IFBhdGgucmVzb2x2ZShwa2cucmVhbFBhdGgsIHZhbHVlRmlsZSk7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoYWJzRmlsZSkpIHtcbiAgICAgICAgbG9nLndhcm4oYFBhY2thZ2UgJHtwa2cubmFtZX0ncyBjb25maWd1cmUgZmlsZSBcIiR7YWJzRmlsZX1cIiBkb2VzIG5vdCBleGlzdCwgc2tpcHBlZC5gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICAvLyBDaGVjayBkdHMgdHlwZSBmaWxlXG4gICAgICBsZXQgW3R5cGVGaWxlLCB0eXBlRXhwb3J0TmFtZV0gPSBzZXR0aW5nLnR5cGUuc3BsaXQoJyMnLCAyKTtcbiAgICAgIGxldCB0eXBlRmlsZUV4dCA9IFBhdGguZXh0bmFtZSh0eXBlRmlsZSk7XG4gICAgICBpZiAodHlwZUZpbGVFeHQgPT09ICcnKSB7XG4gICAgICAgIHR5cGVGaWxlICs9ICcuZHRzJztcbiAgICAgIH1cblxuICAgICAgY29uc3QgYWJzVHlwZUZpbGUgPSBQYXRoLnJlc29sdmUocGtnLnJlYWxQYXRoLCB0eXBlRmlsZUV4dCk7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoYWJzVHlwZUZpbGUpKSB7XG4gICAgICAgIGxvZy53YXJuKGBQYWNrYWdlIHNldHRpbmcgJHtwa2cubmFtZX0ncyBkdHMgZmlsZSBcIiR7YWJzVHlwZUZpbGV9XCIgZG9lcyBub3QgZXhpc3QsIHNraXBwZWQuYCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVFeHBvcnROYW1lID09IG51bGwpIHtcbiAgICAgICAgbG9nLmVycm9yKGBJbmNvcnJlY3QgcGFja2FnZSBjb25maWcgcHJvcGVydHkgZm9ybWF0IFwiJHtzZXR0aW5nLnR5cGV9XCIgaW4gJHtwa2cucGF0aCArIFBhdGguc2VwfXBhY2thZ2UuanNvbmAgK1xuICAgICAgICAgICcsIGNvcnJlY3QgZm9ybWF0IGlzIFwiPGR0cy1maWxlLXJlbGF0aXZlLXBhdGg+IzxUUy10eXBlLWV4cG9ydC1uYW1lPlwiJyk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgeWllbGQgW3R5cGVGaWxlLnJlcGxhY2UoL1xcLlteLi9cXFxcXSskL2csICcnKSwgdHlwZUV4cG9ydE5hbWUsIHZhbHVlRmlsZSwgdmFsdWVFeHBvcnQsIHBrZ107XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBsb2cud2FybihgU2tpcCBsb2FkaW5nIHNldHRpbmcgb2YgcGFja2FnZSAke3BrZy5uYW1lfSwgZHVlIHRvICh0aGlzIG1pZ2h0IGJlIGNhdXNlZCBieSBpbmNvcnJlY3QgcGFja2FnZS5qc29uIGZvcm1hdClgLCBlcnIpO1xuICAgIH1cbiAgfVxufVxuLyoqXG4gKiBAcmV0dXJucyBhYnN1bHRlIHBhdGggb2Ygc2V0dGluZyBKUyBmaWxlcyB3aGljaCBjb250YWlucyBleHBvcnRzIG5hbWVkIHdpdGggXCJkZWZhdWx0XCJcbiAqL1xuZnVuY3Rpb24gbG9hZFBhY2thZ2VTZXR0aW5ncygpOiBzdHJpbmdbXSB7XG4gIGNvbnN0IHt3b3Jrc3BhY2VLZXksIGlzQ3dkV29ya3NwYWNlfSA9IHJlcXVpcmUoJy4uL3BhY2thZ2UtbWdyJykgYXMgdHlwZW9mIF9wa2dNZ3I7XG4gIGlmICghaXNDd2RXb3Jrc3BhY2UoKSkge1xuICAgIGxvZy5kZWJ1ZygnTm90IGluIGEgd29ya3NwYWNlLCBza2lwIGxvYWRpbmcgcGFja2FnZSBzZXR0aW5ncycpO1xuICAgIHJldHVybiBbXTtcbiAgfVxuICBjb25zdCBqc0ZpbGVzOiBzdHJpbmdbXSA9IFtdO1xuICBmb3IgKGNvbnN0IFtfdHlwZUZpbGUsIF90eXBlRXhwb3J0LCBqc0ZpbGUsIGRlZmF1bHRTZXR0aW5nRXhwb3J0LCBwa2ddIG9mIGdldFBhY2thZ2VTZXR0aW5nRmlsZXMod29ya3NwYWNlS2V5KHByb2Nlc3MuY3dkKCkpKSkge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCBhYnNGaWxlID0gUGF0aC5yZXNvbHZlKHBrZy5yZWFsUGF0aCwganNGaWxlKTtcbiAgICAgIGNvbnN0IGV4cHMgPSByZXF1aXJlKGFic0ZpbGUpO1xuICAgICAgY29uc3QgZGVmYXVsdFNldHRpbmdGYWN0b3J5ID0gZXhwc1tkZWZhdWx0U2V0dGluZ0V4cG9ydF07XG5cbiAgICAgIGlmICh0eXBlb2YgZGVmYXVsdFNldHRpbmdGYWN0b3J5ID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIGNvbnN0IHZhbHVlID0gZGVmYXVsdFNldHRpbmdGYWN0b3J5KGdldFN0YXRlKCkpO1xuICAgICAgICBkaXNwYXRjaGVyLl9jaGFuZ2UocyA9PiBzW3BrZy5uYW1lXSA9IHZhbHVlKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy53YXJuKGBGYWlsZWQgdG8gbG9hZCBwYWNrYWdlIHNldHRpbmcgZnJvbSAke3BrZy5uYW1lfS8ke2pzRmlsZX0uXFxuIEV4cG9ydCBuYW1lIFwiJHtkZWZhdWx0U2V0dGluZ0V4cG9ydH1cIiBpcyBub3QgZm91bmRgKTtcbiAgICAgIH1cbiAgICAgIC8vIE5vdCB1c2VkIGZvciBub3dcbiAgICAgIGlmIChleHBzLmRlZmF1bHQgIT0gbnVsbCkge1xuICAgICAgICBqc0ZpbGVzLnB1c2goYWJzRmlsZSk7XG4gICAgICB9XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBsb2cuZXJyb3IoYEZhaWxlZCB0byBsb2FkIHBhY2thZ2Ugc2V0dGluZyBmcm9tICR7cGtnLm5hbWV9LyR7anNGaWxlfS4nJHtkZWZhdWx0U2V0dGluZ0V4cG9ydH1gLCBlcnIpO1xuICAgIH1cbiAgfVxuICByZXR1cm4ganNGaWxlcztcbn1cbmV4cG9ydCBkZWZhdWx0IChjb25maWcgYXMgRHJjcENvbmZpZyk7XG4iXX0=