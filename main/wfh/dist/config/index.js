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
    if (process.env.PLINK_CLI_OPTS == null) {
        // For child process, worker thread to access cli options
        process.env.PLINK_CLI_OPTS = JSON.stringify(argv);
    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy9jb25maWcvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDBDQUEwQztBQUMxQyxvREFBdUI7QUFDdkIsNENBQW9CO0FBQ3BCLGdEQUF3QjtBQUN4QixrREFBMEI7QUFDMUIsc0RBQThFO0FBRTlFLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMsb0RBQTRCO0FBQzVCLGlEQUFrRTtBQUlsRSx3Q0FBdUM7QUFFdkMsb0NBQW9DO0FBQ3BDLG9EQUE0QjtBQUM1QixPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUU1QixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUM3QyxNQUFNLEVBQUMsT0FBTyxFQUFDLEdBQUcsZUFBUSxDQUFDO0FBRTNCLElBQUksUUFBUSxHQUFHLE9BQU8sQ0FBQztBQUVWLFFBQUEsaUJBQWlCLEdBQUcsSUFBSSxFQUFFLENBQUMsZUFBZSxDQUErQixTQUFTLENBQUMsQ0FBQztBQUVqRzs7OztHQUlHO0FBQ0gsTUFBTSxNQUFNLEdBQUcsR0FBaUIsRUFBRTtJQUNoQyxPQUFPLElBQUEsdUJBQVEsR0FBRSxDQUFDO0FBQ3BCLENBQUMsQ0FBQztBQUVGLE1BQU0sQ0FBQyxRQUFRLEdBQUcsQ0FBQyxJQUFnQixFQUFFLEVBQUU7SUFDckMseUJBQVUsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDL0IsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWMsSUFBSSxJQUFJLEVBQUU7UUFDdEMseURBQXlEO1FBQ3pELE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7S0FDbkQ7SUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDWCxPQUFPLElBQUEsdUJBQVEsR0FBRSxDQUFDO0FBQ3BCLENBQUMsQ0FBQztBQUdGLE1BQU0sQ0FBQyxNQUFNLEdBQUcsU0FBUyxNQUFNO0lBQzdCLE1BQU0sSUFBSSxHQUFHLElBQUEsdUJBQVEsR0FBRSxDQUFDLFVBQVcsQ0FBQztJQUNwQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDWCxPQUFPLElBQUEsdUJBQVEsR0FBRSxDQUFDO0FBQ3BCLENBQUMsQ0FBQztBQUVGLE1BQU0sQ0FBQyxHQUFHLEdBQUcsVUFBUyxJQUFZLEVBQUUsS0FBVTtJQUM1Qyx5QkFBVSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUMzQixnQkFBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO0lBQzlCLENBQUMsQ0FBQyxDQUFDO0lBQ0gsT0FBTyxJQUFBLHVCQUFRLEdBQUUsQ0FBQztBQUNwQixDQUFDLENBQUM7QUFFRixNQUFNLENBQUMsR0FBRyxHQUFHLFVBQVMsUUFBZ0IsRUFBRSxZQUFpQjtJQUN2RCxPQUFPLGdCQUFDLENBQUMsR0FBRyxDQUFDLElBQUEsdUJBQVEsR0FBRSxFQUFFLFFBQVEsRUFBRSxZQUFZLENBQUMsQ0FBQztBQUNuRCxDQUFDLENBQUM7QUFHRjs7Ozs7O0dBTUc7QUFDSCxNQUFNLENBQUMsT0FBTyxHQUFHLFVBQVMsWUFBZ0UsRUFBRSxHQUFHLEtBQWU7SUFDNUcsTUFBTSxJQUFJLEdBQWEsQ0FBQyxRQUFRLEVBQUUsSUFBQSx1QkFBUSxHQUFFLENBQUMsWUFBWSxDQUFDLEVBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQztJQUN0RSxPQUFPLGNBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQztBQUMvQixDQUFDLENBQUM7QUFFRiwwQ0FBMEM7QUFFMUMsTUFBTSxDQUFDLGdCQUFnQixHQUFHLHlCQUFpQixDQUFDO0FBRTVDLE1BQU0sQ0FBQyx1QkFBdUIsR0FBRyxVQUFTLEVBQXVDO0lBQy9FLHlCQUFpQixDQUFDLElBQUksQ0FDcEIsRUFBRSxDQUFDLG9CQUFvQixFQUFFLEVBQ3pCLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLEVBQ3JDLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsT0FBUSxDQUFDLENBQUMsQ0FDaEMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUNoQixDQUFDLENBQUM7QUFFRixNQUFNLENBQUMsTUFBTSxHQUFHLFVBQVMsT0FBd0M7SUFDL0QsT0FBTyx5QkFBVSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUNyQyxDQUFDLENBQUM7QUFFRixxSEFBcUg7QUFDckgsbUNBQW1DO0FBQ25DLGlDQUFpQztBQUNqQyw2Q0FBNkM7QUFDN0MsOERBQThEO0FBQzlELGlCQUFpQjtBQUNqQixtQkFBbUI7QUFDbkIsS0FBSztBQUVMLFNBQVMsSUFBSSxDQUFDLFNBQXFCO0lBQ2pDLE1BQU0sZUFBZSxHQUFHLG1CQUFtQixFQUFFLENBQUM7SUFDOUMsTUFBTSxjQUFjLEdBQUcsU0FBUyxDQUFDLE1BQU0sSUFBSSxFQUFFLENBQUM7SUFDOUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsRUFBRSxDQUFDLHFCQUFxQixDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7SUFDbEYsTUFBTSxRQUFRLEdBQUcsSUFBSSxpQ0FBZ0IsQ0FDbkMsY0FBYyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7U0FDakQsR0FBRyxDQUFrQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztTQUM3RSxNQUFNLENBQUMsZUFBZSxDQUFDLENBQzNCLENBQUM7SUFDRix5QkFBaUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDakMseUJBQVUsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUU7UUFDekIsUUFBUSxDQUFDLFdBQVcsQ0FBZ0IsQ0FBQyxLQUFLLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxFQUFFO1lBQzFELElBQUksT0FBTyxDQUFDLFFBQVEsRUFBRTtnQkFDcEIsT0FBTyxPQUFPLENBQUMsUUFBUSxDQUFDLEtBQUssRUFBRyxLQUFLLENBQUMsVUFBVyxDQUFDLENBQUM7YUFDcEQ7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0lBQ0gsY0FBYyxFQUFFLENBQUM7SUFFakIseUJBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUU7UUFDckIsQ0FBQyxDQUFDLElBQUksR0FBRyxhQUFhLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ2pDLENBQUMsQ0FBQyxDQUFDO0lBQ0gsZ0JBQWdCLENBQUMsSUFBQSx1QkFBUSxHQUFFLENBQUMsVUFBVyxDQUFDLENBQUM7QUFDM0MsQ0FBQztBQUVELFNBQVMscUJBQXFCLENBQUMsZUFBdUI7SUFDcEQsSUFBSSxDQUFDLFlBQUUsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLEVBQUU7UUFDbkMsc0NBQXNDO1FBQ3RDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBSyxDQUFDLE1BQU0sQ0FBQywwQkFBMEIsRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFDO1FBQ3BFLE9BQU87S0FDUjtJQUNELHNDQUFzQztJQUN0QyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsZUFBZSxFQUFFLENBQUMsQ0FBQztJQUNyQyxJQUFJLFNBQStCLENBQUM7SUFFcEMsTUFBTSxPQUFPLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztJQUVuRCxJQUFJLE1BQU0sR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0lBQ3pDLElBQUksTUFBTSxLQUFLLE1BQU0sSUFBSSxNQUFNLEtBQUssS0FBSyxFQUFFO1FBQ3pDLFNBQVMsR0FBRyxnQkFBTSxDQUFDLEtBQUssQ0FBQyxZQUFFLENBQUMsWUFBWSxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO0tBQ3BFO1NBQU0sSUFBSSxNQUFNLEtBQUssTUFBTSxFQUFFO1FBQzVCLFNBQVMsR0FBRyxPQUFPLENBQUMsY0FBSSxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO0tBQ3BEO1NBQU07UUFDTCxPQUFPO0tBQ1I7SUFFRCx5QkFBVSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUMzQixnQkFBQyxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsU0FBUyxFQUFFLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQzNFLElBQUksZ0JBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxFQUFFO2dCQUNwRCw2Q0FBNkM7Z0JBQzdDLE9BQU8sZ0JBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2FBQ3JDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFFRCxTQUFTLGdCQUFnQixDQUFDLE1BQWtCO0lBQzFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSTtRQUNkLE9BQU87SUFDVCxLQUFLLElBQUksUUFBUSxJQUFJLE1BQU0sQ0FBQyxJQUFJLEVBQUU7UUFDaEMsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNwQyxJQUFJLFFBQVEsR0FBRyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDMUIsSUFBSSxnQkFBQyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDO1lBQy9CLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3BDLElBQUksS0FBVSxDQUFDO1FBQ2YsSUFBSTtZQUNGLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ2hDO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDVixLQUFLLEdBQUcsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLFdBQVcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDN0Q7UUFDRCx5QkFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLGdCQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNuRCxzQ0FBc0M7UUFDdEMsR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsUUFBUSxNQUFNLEtBQWUsRUFBRSxDQUFDLENBQUM7S0FDM0Q7QUFDSCxDQUFDO0FBR0QsU0FBUyxjQUFjO0lBQ3JCLCtCQUErQjtBQUNqQyxDQUFDO0FBRUQsd0NBQXdDO0FBQ3hDLHVCQUF1QjtBQUN2QixrQkFBa0I7QUFDbEIsTUFBTTtBQUNOLDBFQUEwRTtBQUMxRSxJQUFJO0FBRUosU0FBUyxhQUFhLENBQUMsR0FBb0I7SUFDekMsSUFBSSxJQUFJLEdBQVcsT0FBTyxHQUFHLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7SUFFckUsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDZixhQUFhO1FBQ2IsT0FBTyxHQUFHLENBQUM7S0FDWjtJQUVELElBQUksSUFBSSxJQUFJLENBQUMsRUFBRTtRQUNiLGNBQWM7UUFDZCxPQUFPLElBQUksQ0FBQztLQUNiO0lBRUQsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBSUQ7O0dBRUc7QUFDSCxRQUFlLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxZQUFvQixFQUFFLFVBQXdCO0lBU3BGLE1BQU0sRUFBQyxxQkFBcUIsRUFBQyxHQUFHLE9BQU8sQ0FBQyxvQ0FBb0MsQ0FBb0IsQ0FBQztJQUNqRyxLQUFLLE1BQU0sR0FBRyxJQUFJLHFCQUFxQixDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsRUFBRTtRQUMzRCxJQUFJLFVBQVUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQztZQUN6QyxTQUFTO1FBRVgsSUFBSTtZQUNGLE1BQU0sRUFBRSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBTSxDQUFDO1lBQzFDLElBQUksRUFBRSxJQUFJLElBQUksSUFBSSxPQUFPLEVBQUUsQ0FBQyxPQUFPLEtBQUssUUFBUSxFQUFFO2dCQUNoRCxTQUFTO2FBQ1Y7WUFDRCxNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDO1lBQzNCLEdBQUcsQ0FBQyxLQUFLLENBQUMsd0JBQXdCLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsQ0FBQztZQUN2RCxJQUFJLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUUzRCxtQkFBbUI7WUFDbkIsTUFBTSxHQUFHLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUNwQyxJQUFJLEdBQUcsS0FBSyxFQUFFLEVBQUU7Z0JBQ2QsU0FBUyxHQUFHLFNBQVMsR0FBRyxLQUFLLENBQUM7YUFDL0I7WUFDRCxJQUFJLFdBQVcsSUFBSSxJQUFJO2dCQUNyQixXQUFXLEdBQUcsU0FBUyxDQUFDO1lBRTFCLE1BQU0sT0FBTyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUN0RCxJQUFJLENBQUMsWUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDM0IsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxJQUFJLHNCQUFzQixPQUFPLDRCQUE0QixDQUFDLENBQUM7Z0JBQ3ZGLFNBQVM7YUFDVjtZQUNELHNCQUFzQjtZQUN0QixJQUFJLENBQUMsUUFBUSxFQUFFLGNBQWMsQ0FBQyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUM1RCxJQUFJLFdBQVcsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQ3pDLElBQUksV0FBVyxLQUFLLEVBQUUsRUFBRTtnQkFDdEIsUUFBUSxJQUFJLE1BQU0sQ0FBQzthQUNwQjtZQUVELE1BQU0sV0FBVyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxXQUFXLENBQUMsQ0FBQztZQUM1RCxJQUFJLENBQUMsWUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsRUFBRTtnQkFDL0IsR0FBRyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxDQUFDLElBQUksZ0JBQWdCLFdBQVcsNEJBQTRCLENBQUMsQ0FBQztnQkFDN0YsU0FBUzthQUNWO1lBQ0QsSUFBSSxjQUFjLElBQUksSUFBSSxFQUFFO2dCQUMxQixHQUFHLENBQUMsS0FBSyxDQUFDLDZDQUE2QyxPQUFPLENBQUMsSUFBSSxRQUFRLEdBQUcsQ0FBQyxRQUFRLEdBQUcsY0FBSSxDQUFDLEdBQUcsY0FBYztvQkFDOUcsc0VBQXNFLENBQUMsQ0FBQztnQkFDMUUsU0FBUzthQUNWO1lBQ0QsTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQyxFQUFFLGNBQWMsRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1NBQzNGO1FBQUMsT0FBTyxHQUFHLEVBQUU7WUFDWixHQUFHLENBQUMsSUFBSSxDQUFDLG1DQUFtQyxHQUFHLENBQUMsSUFBSSxrRUFBa0UsRUFBRSxHQUFHLENBQUMsQ0FBQztTQUM5SDtLQUNGO0FBQ0gsQ0FBQztBQTFERCx3REEwREM7QUFDRDs7R0FFRztBQUNILFNBQVMsbUJBQW1CO0lBQzFCLE1BQU0sRUFBQyxZQUFZLEVBQUUsY0FBYyxFQUFDLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFtQixDQUFDO0lBQ25GLElBQUksQ0FBQyxjQUFjLEVBQUUsRUFBRTtRQUNyQixHQUFHLENBQUMsS0FBSyxDQUFDLG1EQUFtRCxDQUFDLENBQUM7UUFDL0QsT0FBTyxFQUFFLENBQUM7S0FDWDtJQUNELE1BQU0sT0FBTyxHQUF5QyxFQUFFLENBQUM7SUFFekQsS0FBSyxNQUFNLENBQUMsU0FBUyxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsb0JBQW9CLEVBQUUsR0FBRyxDQUFDLElBQUksc0JBQXNCLENBQUMsWUFBWSxDQUFDLGVBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFO1FBQ2hJLElBQUk7WUFDRixNQUFNLE9BQU8sR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLGVBQVEsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztZQUNqRSxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDOUIsTUFBTSxxQkFBcUIsR0FBOEIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLENBQUM7WUFFcEYsSUFBSSxPQUFPLHFCQUFxQixLQUFLLFVBQVUsRUFBRTtnQkFDL0MsTUFBTSxLQUFLLEdBQUcscUJBQXFCLENBQUMsSUFBQSx1QkFBUSxHQUFFLENBQUMsVUFBVyxDQUFDLENBQUM7Z0JBQzVELHlCQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQzthQUM5QztpQkFBTTtnQkFDTCxHQUFHLENBQUMsSUFBSSxDQUFDLHVDQUF1QyxHQUFHLENBQUMsSUFBSSxJQUFJLE1BQU0sb0JBQW9CLG9CQUFvQixnQkFBZ0IsQ0FBQyxDQUFDO2FBQzdIO1lBQ0QsSUFBSSxxQkFBcUIsSUFBSSxJQUFJLEVBQUU7Z0JBQ2pDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUUsb0JBQW9CLENBQUMsQ0FBQyxDQUFDO2FBQy9DO1NBQ0Y7UUFBQyxPQUFPLEdBQUcsRUFBRTtZQUNaLEdBQUcsQ0FBQyxLQUFLLENBQUMsdUNBQXVDLEdBQUcsQ0FBQyxJQUFJLElBQUksTUFBTSxLQUFLLG9CQUFvQixFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FDdEc7S0FDRjtJQUNELE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUM7QUFDRCxrQkFBZ0IsTUFBcUIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIHByZWZlci1jb25zdCwgbWF4LWxlbiAqL1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQge0NvbmZpZ0hhbmRsZXJNZ3IsIERyY3BDb25maWcsIENvbmZpZ0hhbmRsZXJ9IGZyb20gJy4uL2NvbmZpZy1oYW5kbGVyJztcbmltcG9ydCB7R2xvYmFsT3B0aW9ucyBhcyBDbGlPcHRpb25zfSBmcm9tICcuLi9jbWQvdHlwZXMnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQge2Rpc3BhdGNoZXIsIGdldFN0YXRlLCBEcmNwU2V0dGluZ3N9IGZyb20gJy4vY29uZmlnLXNsaWNlJztcbi8vIFJlZmFjdG9yOiBjaXJjdWxhciByZWZlcmVuY2VcbmltcG9ydCAqIGFzIF9wa2dMaXN0IGZyb20gJy4uL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0ICogYXMgX3BrZ01nciBmcm9tICcuLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQge3BsaW5rRW52fSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCB7UGFja2FnZVNldHRpbmdJbnRlcmZ9IGZyb20gJy4vY29uZmlnLnR5cGVzJztcbi8vIGNvbnN0IHlhbWxqcyA9IHJlcXVpcmUoJ3lhbWxqcycpO1xuaW1wb3J0IHlhbWxqcyBmcm9tICd5YW1sanMnO1xucmVxdWlyZSgneWFtbGlmeS9yZWdpc3RlcicpO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5jb25maWcnKTtcbmNvbnN0IHtyb290RGlyfSA9IHBsaW5rRW52O1xuXG5sZXQgcm9vdFBhdGggPSByb290RGlyO1xuXG5leHBvcnQgY29uc3QgY29uZmlnSGFuZGxlck1nciQgPSBuZXcgcnguQmVoYXZpb3JTdWJqZWN0PENvbmZpZ0hhbmRsZXJNZ3IgfCB1bmRlZmluZWQ+KHVuZGVmaW5lZCk7XG5cbi8qKlxuICogcmVhZCBhbmQgcmV0dXJuIGNvbmZpZ3VyYXRpb25cbiAqIEBuYW1lIGNvbmZpZ1xuICogQHJldHVybiB7b2JqZWN0fSBzZXR0aW5nXG4gKi9cbmNvbnN0IGNvbmZpZyA9ICgpOiBEcmNwU2V0dGluZ3MgPT4ge1xuICByZXR1cm4gZ2V0U3RhdGUoKTtcbn07XG5cbmNvbmZpZy5pbml0U3luYyA9IChhcmd2OiBDbGlPcHRpb25zKSA9PiB7XG4gIGRpc3BhdGNoZXIuc2F2ZUNsaU9wdGlvbihhcmd2KTtcbiAgaWYgKHByb2Nlc3MuZW52LlBMSU5LX0NMSV9PUFRTID09IG51bGwpIHtcbiAgICAvLyBGb3IgY2hpbGQgcHJvY2Vzcywgd29ya2VyIHRocmVhZCB0byBhY2Nlc3MgY2xpIG9wdGlvbnNcbiAgICBwcm9jZXNzLmVudi5QTElOS19DTElfT1BUUyA9IEpTT04uc3RyaW5naWZ5KGFyZ3YpO1xuICB9XG4gIGxvYWQoYXJndik7XG4gIHJldHVybiBnZXRTdGF0ZSgpO1xufTtcblxuXG5jb25maWcucmVsb2FkID0gZnVuY3Rpb24gcmVsb2FkKCkge1xuICBjb25zdCBhcmd2ID0gZ2V0U3RhdGUoKS5jbGlPcHRpb25zITtcbiAgbG9hZChhcmd2KTtcbiAgcmV0dXJuIGdldFN0YXRlKCk7XG59O1xuXG5jb25maWcuc2V0ID0gZnVuY3Rpb24ocGF0aDogc3RyaW5nLCB2YWx1ZTogYW55KSB7XG4gIGRpc3BhdGNoZXIuX2NoYW5nZShzZXR0aW5nID0+IHtcbiAgICBfLnNldChzZXR0aW5nLCBwYXRoLCB2YWx1ZSk7XG4gIH0pO1xuICByZXR1cm4gZ2V0U3RhdGUoKTtcbn07XG5cbmNvbmZpZy5nZXQgPSBmdW5jdGlvbihwcm9wUGF0aDogc3RyaW5nLCBkZWZhdWx0VmFsdWU6IGFueSkge1xuICByZXR1cm4gXy5nZXQoZ2V0U3RhdGUoKSwgcHJvcFBhdGgsIGRlZmF1bHRWYWx1ZSk7XG59O1xuXG5cbi8qKlxuICogUmVzb2x2ZSBhIHBhdGggYmFzZWQgb24gYHJvb3RQYXRoYFxuICogQG5hbWUgcmVzb2x2ZVxuICogQG1lbWJlcm9mIGNvbmZpZ1xuICogQHBhcmFtICB7c3RyaW5nfSBwcm9wZXJ0eSBuYW1lIG9yIHByb3BlcnR5IHBhdGgsIGxpa2UgXCJuYW1lXCIsIFwibmFtZS5jaGlsZFByb3BbMV1cIlxuICogQHJldHVybiB7c3RyaW5nfSAgICAgYWJzb2x1dGUgcGF0aFxuICovXG5jb25maWcucmVzb2x2ZSA9IGZ1bmN0aW9uKHBhdGhQcm9wTmFtZTogJ3Jvb3RQYXRoJyB8ICdkZXN0RGlyJyB8ICdzdGF0aWNEaXInIHwgJ3NlcnZlckRpcicsIC4uLnBhdGhzOiBzdHJpbmdbXSkge1xuICBjb25zdCBhcmdzOiBzdHJpbmdbXSA9IFtyb290UGF0aCwgZ2V0U3RhdGUoKVtwYXRoUHJvcE5hbWVdLCAuLi5wYXRoc107XG4gIHJldHVybiBQYXRoLnJlc29sdmUoLi4uYXJncyk7XG59O1xuXG4vLyBjb25maWcuY29uZmlndXJlU3RvcmUgPSBjb25maWd1cmVTdG9yZTtcblxuY29uZmlnLmNvbmZpZ0hhbmRsZXJNZ3IgPSBjb25maWdIYW5kbGVyTWdyJDtcblxuY29uZmlnLmNvbmZpZ0hhbmRsZXJNZ3JDaGFuZ2VkID0gZnVuY3Rpb24oY2I6IChoYW5kbGVyOiBDb25maWdIYW5kbGVyTWdyKSA9PiB2b2lkKSB7XG4gIGNvbmZpZ0hhbmRsZXJNZ3IkLnBpcGUoXG4gICAgb3AuZGlzdGluY3RVbnRpbENoYW5nZWQoKSxcbiAgICBvcC5maWx0ZXIoaGFuZGxlciA9PiBoYW5kbGVyICE9IG51bGwpLFxuICAgIG9wLnRhcChoYW5kbGVyID0+IGNiKGhhbmRsZXIhKSlcbiAgKS5zdWJzY3JpYmUoKTtcbn07XG5cbmNvbmZpZy5jaGFuZ2UgPSBmdW5jdGlvbihyZWR1Y2VyOiAoc2V0dGluZzogRHJjcFNldHRpbmdzKSA9PiB2b2lkICkge1xuICByZXR1cm4gZGlzcGF0Y2hlci5fY2hhbmdlKHJlZHVjZXIpO1xufTtcblxuLy8gY29uZmlnLmNvbmZpZ0hhbmRsZXJNZ3JDcmVhdGVkID0gZnVuY3Rpb24oY2I6IChoYW5kbGVyOiBDb25maWdIYW5kbGVyTWdyKSA9PiBQcm9taXNlPGFueT4gfCB2b2lkKTogUHJvbWlzZTx2b2lkPiB7XG4vLyAgIHJldHVybiBjb25maWdIYW5kbGVyTWdyJC5waXBlKFxuLy8gICAgIG9wLmRpc3RpbmN0VW50aWxDaGFuZ2VkKCksXG4vLyAgICAgb3AuZmlsdGVyKGhhbmRsZXIgPT4gaGFuZGxlciAhPSBudWxsKSxcbi8vICAgICBvcC5jb25jYXRNYXAoaGFuZGxlciA9PiBQcm9taXNlLnJlc29sdmUoY2IoaGFuZGxlciEpKSksXG4vLyAgICAgb3AudGFrZSgxKVxuLy8gICApLnRvUHJvbWlzZSgpO1xuLy8gfTtcblxuZnVuY3Rpb24gbG9hZChjbGlPcHRpb246IENsaU9wdGlvbnMpIHtcbiAgY29uc3QgcGtnU2V0dGluZ0ZpbGVzID0gbG9hZFBhY2thZ2VTZXR0aW5ncygpO1xuICBjb25zdCBjb25maWdGaWxlTGlzdCA9IGNsaU9wdGlvbi5jb25maWcgfHwgW107XG4gIGNvbmZpZ0ZpbGVMaXN0LmZvckVhY2gobG9jYWxDb25maWdQYXRoID0+IG1lcmdlRnJvbVlhbWxKc29uRmlsZShsb2NhbENvbmZpZ1BhdGgpKTtcbiAgY29uc3QgaGFuZGxlcnMgPSBuZXcgQ29uZmlnSGFuZGxlck1ncihcbiAgICBjb25maWdGaWxlTGlzdC5maWx0ZXIobmFtZSA9PiAvXFwuW3RqXXMkLy50ZXN0KG5hbWUpKVxuICAgICAgLm1hcDxbZmlsZTogc3RyaW5nLCBleHBOYW1lOiBzdHJpbmddPihpdGVtID0+IFtQYXRoLnJlc29sdmUoaXRlbSksICdkZWZhdWx0J10pXG4gICAgICAuY29uY2F0KHBrZ1NldHRpbmdGaWxlcylcbiAgKTtcbiAgY29uZmlnSGFuZGxlck1nciQubmV4dChoYW5kbGVycyk7XG4gIGRpc3BhdGNoZXIuX2NoYW5nZShkcmFmdCA9PiB7XG4gICAgaGFuZGxlcnMucnVuRWFjaFN5bmM8Q29uZmlnSGFuZGxlcj4oKF9maWxlLCBvYmosIGhhbmRsZXIpID0+IHtcbiAgICAgIGlmIChoYW5kbGVyLm9uQ29uZmlnKSB7XG4gICAgICAgIHJldHVybiBoYW5kbGVyLm9uQ29uZmlnKGRyYWZ0ICwgZHJhZnQuY2xpT3B0aW9ucyEpO1xuICAgICAgfVxuICAgIH0pO1xuICB9KTtcbiAgdmFsaWRhdGVDb25maWcoKTtcblxuICBkaXNwYXRjaGVyLl9jaGFuZ2UocyA9PiB7XG4gICAgcy5wb3J0ID0gbm9ybWFsaXplUG9ydChzLnBvcnQpO1xuICB9KTtcbiAgbWVyZ2VGcm9tQ2xpQXJncyhnZXRTdGF0ZSgpLmNsaU9wdGlvbnMhKTtcbn1cblxuZnVuY3Rpb24gbWVyZ2VGcm9tWWFtbEpzb25GaWxlKGxvY2FsQ29uZmlnUGF0aDogc3RyaW5nKSB7XG4gIGlmICghZnMuZXhpc3RzU3luYyhsb2NhbENvbmZpZ1BhdGgpKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBsb2cuaW5mbyhjaGFsay55ZWxsb3coJyBGaWxlIGRvZXMgbm90IGV4aXN0OiAlcycsIGxvY2FsQ29uZmlnUGF0aCkpO1xuICAgIHJldHVybjtcbiAgfVxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICBsb2cuaW5mbyhgIFJlYWQgJHtsb2NhbENvbmZpZ1BhdGh9YCk7XG4gIHZhciBjb25maWdPYmo6IHtba2V5OiBzdHJpbmddOiBhbnl9O1xuXG4gIGNvbnN0IG1hdGNoZWQgPSAvXFwuKFteLl0rKSQvLmV4ZWMobG9jYWxDb25maWdQYXRoKTtcblxuICBsZXQgc3VmZml4ID0gbWF0Y2hlZCA/IG1hdGNoZWRbMV0gOiBudWxsO1xuICBpZiAoc3VmZml4ID09PSAneWFtbCcgfHwgc3VmZml4ID09PSAneW1sJykge1xuICAgIGNvbmZpZ09iaiA9IHlhbWxqcy5wYXJzZShmcy5yZWFkRmlsZVN5bmMobG9jYWxDb25maWdQYXRoLCAndXRmOCcpKTtcbiAgfSBlbHNlIGlmIChzdWZmaXggPT09ICdqc29uJykge1xuICAgIGNvbmZpZ09iaiA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKGxvY2FsQ29uZmlnUGF0aCkpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGRpc3BhdGNoZXIuX2NoYW5nZShzZXR0aW5nID0+IHtcbiAgICBfLmFzc2lnbldpdGgoc2V0dGluZywgY29uZmlnT2JqLCAob2JqVmFsdWUsIHNyY1ZhbHVlLCBrZXksIG9iamVjdCwgc291cmNlKSA9PiB7XG4gICAgICBpZiAoXy5pc09iamVjdChvYmpWYWx1ZSkgJiYgIUFycmF5LmlzQXJyYXkob2JqVmFsdWUpKSB7XG4gICAgICAgIC8vIFdlIG9ubHkgbWVyZ2UgMXN0IGFuZCAybmQgbGV2ZWwgcHJvcGVydGllc1xuICAgICAgICByZXR1cm4gXy5hc3NpZ24ob2JqVmFsdWUsIHNyY1ZhbHVlKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIG1lcmdlRnJvbUNsaUFyZ3MoY2xpT3B0OiBDbGlPcHRpb25zKSB7XG4gIGlmICghY2xpT3B0LnByb3ApXG4gICAgcmV0dXJuO1xuICBmb3IgKGxldCBwcm9wUGFpciBvZiBjbGlPcHQucHJvcCkge1xuICAgIGNvbnN0IHByb3BTZXQgPSBwcm9wUGFpci5zcGxpdCgnPScpO1xuICAgIGxldCBwcm9wUGF0aCA9IHByb3BTZXRbMF07XG4gICAgaWYgKF8uc3RhcnRzV2l0aChwcm9wU2V0WzBdLCAnWycpKVxuICAgICAgcHJvcFBhdGggPSBKU09OLnBhcnNlKHByb3BTZXRbMF0pO1xuICAgIGxldCB2YWx1ZTogYW55O1xuICAgIHRyeSB7XG4gICAgICB2YWx1ZSA9IEpTT04ucGFyc2UocHJvcFNldFsxXSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdmFsdWUgPSBwcm9wU2V0WzFdID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IHByb3BTZXRbMV07XG4gICAgfVxuICAgIGRpc3BhdGNoZXIuX2NoYW5nZShzID0+IF8uc2V0KHMsIHByb3BQYXRoLCB2YWx1ZSkpO1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgbG9nLmluZm8oYFtjb25maWddIHNldCAke3Byb3BQYXRofSA9ICR7dmFsdWUgYXMgc3RyaW5nfWApO1xuICB9XG59XG5cblxuZnVuY3Rpb24gdmFsaWRhdGVDb25maWcoKSB7XG4gIC8vIFRPRE86IGpzb24gc2NoZW1hIHZhbGlkYXRpb25cbn1cblxuLy8gZnVuY3Rpb24gdHJpbVRhaWxTbGFzaCh1cmw6IHN0cmluZykge1xuLy8gICBpZiAodXJsID09PSAnLycpIHtcbi8vICAgICByZXR1cm4gdXJsO1xuLy8gICB9XG4vLyAgIHJldHVybiBfLmVuZHNXaXRoKHVybCwgJy8nKSA/IHVybC5zdWJzdHJpbmcoMCwgdXJsLmxlbmd0aCAtIDEpIDogdXJsO1xuLy8gfVxuXG5mdW5jdGlvbiBub3JtYWxpemVQb3J0KHZhbDogc3RyaW5nIHwgbnVtYmVyKSB7XG4gIGxldCBwb3J0OiBudW1iZXIgPSB0eXBlb2YgdmFsID09PSAnc3RyaW5nJyA/IHBhcnNlSW50KHZhbCwgMTApIDogdmFsO1xuXG4gIGlmIChpc05hTihwb3J0KSkge1xuICAgIC8vIG5hbWVkIHBpcGVcbiAgICByZXR1cm4gdmFsO1xuICB9XG5cbiAgaWYgKHBvcnQgPj0gMCkge1xuICAgIC8vIHBvcnQgbnVtYmVyXG4gICAgcmV0dXJuIHBvcnQ7XG4gIH1cblxuICByZXR1cm4gODA4MDtcbn1cblxudHlwZSBQYWNrYWdlSW5mbyA9IFJldHVyblR5cGU8KHR5cGVvZiBfcGtnTGlzdClbJ3BhY2thZ2VzNFdvcmtzcGFjZSddPiBleHRlbmRzIEdlbmVyYXRvcjxpbmZlciBUPiA/IFQgOiB1bmtub3duO1xuXG4vKipcbiAqIEByZXR1cm5zIFtkZWZhdWx0VmFsdWVGaWxlLCBleHBvcnROYW1lLCBkdHNGaWxlXVxuICovXG5leHBvcnQgZnVuY3Rpb24qIGdldFBhY2thZ2VTZXR0aW5nRmlsZXMod29ya3NwYWNlS2V5OiBzdHJpbmcsIGluY2x1ZGVQa2c/OiBTZXQ8c3RyaW5nPik6IEdlbmVyYXRvcjxbXG4gIC8qKiByZWxhdGl2ZSBwYXRoIHdpdGhpbiBwYWNrYWdlIHJlYWxwYXRoLCB3aXRob3V0IGV4dCBmaWxlIG5hbWUgKi9cbiAgdHlwZUZpbGVXaXRob3V0RXh0OiBzdHJpbmcsXG4gIHR5cGVFeHBvcnROYW1lOiBzdHJpbmcsXG4gIC8qKiByZWxhdGl2ZSBwYXRoIG9mIGpzIGZpbGUsIHdoaWNoIGV4cG9ydHMgZGVmYXVsdCB2YWx1ZSBvciBmYWN0b3J5IGZ1bmN0aW9uIG9mIGRlZmF1bHQgdmFsdWUgKi9cbiAganNGaWxlOiBzdHJpbmcsXG4gIGRlZmF1bHRFeHBvcnROYW1lOiBzdHJpbmcsXG4gIHBrZzogUGFja2FnZUluZm9cbl0+IHtcbiAgY29uc3Qge3BhY2thZ2VzNFdvcmtzcGFjZUtleX0gPSByZXF1aXJlKCcuLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJykgYXMgdHlwZW9mIF9wa2dMaXN0O1xuICBmb3IgKGNvbnN0IHBrZyBvZiBwYWNrYWdlczRXb3Jrc3BhY2VLZXkod29ya3NwYWNlS2V5LCB0cnVlKSkge1xuICAgIGlmIChpbmNsdWRlUGtnICYmICFpbmNsdWRlUGtnLmhhcyhwa2cubmFtZSkpXG4gICAgICBjb250aW51ZTtcblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBkciA9IHBrZy5qc29uLmRyIHx8IHBrZy5qc29uLnBsaW5rITtcbiAgICAgIGlmIChkciA9PSBudWxsIHx8IHR5cGVvZiBkci5zZXR0aW5nICE9PSAnb2JqZWN0Jykge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHNldHRpbmcgPSBkci5zZXR0aW5nO1xuICAgICAgbG9nLmRlYnVnKCdnZXRQYWNrYWdlU2V0dGluZ0ZpbGVzJywgcGtnLm5hbWUsIHNldHRpbmcpO1xuICAgICAgbGV0IFt2YWx1ZUZpbGUsIHZhbHVlRXhwb3J0XSA9IHNldHRpbmcudmFsdWUuc3BsaXQoJyMnLCAyKTtcblxuICAgICAgLy8gQ2hlY2sgdmFsdWUgZmlsZVxuICAgICAgY29uc3QgZXh0ID0gUGF0aC5leHRuYW1lKHZhbHVlRmlsZSk7XG4gICAgICBpZiAoZXh0ID09PSAnJykge1xuICAgICAgICB2YWx1ZUZpbGUgPSB2YWx1ZUZpbGUgKyAnLmpzJztcbiAgICAgIH1cbiAgICAgIGlmICh2YWx1ZUV4cG9ydCA9PSBudWxsKVxuICAgICAgICB2YWx1ZUV4cG9ydCA9ICdkZWZhdWx0JztcblxuICAgICAgY29uc3QgYWJzRmlsZSA9IFBhdGgucmVzb2x2ZShwa2cucmVhbFBhdGgsIHZhbHVlRmlsZSk7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoYWJzRmlsZSkpIHtcbiAgICAgICAgbG9nLndhcm4oYFBhY2thZ2UgJHtwa2cubmFtZX0ncyBjb25maWd1cmUgZmlsZSBcIiR7YWJzRmlsZX1cIiBkb2VzIG5vdCBleGlzdCwgc2tpcHBlZC5gKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICAvLyBDaGVjayBkdHMgdHlwZSBmaWxlXG4gICAgICBsZXQgW3R5cGVGaWxlLCB0eXBlRXhwb3J0TmFtZV0gPSBzZXR0aW5nLnR5cGUuc3BsaXQoJyMnLCAyKTtcbiAgICAgIGxldCB0eXBlRmlsZUV4dCA9IFBhdGguZXh0bmFtZSh0eXBlRmlsZSk7XG4gICAgICBpZiAodHlwZUZpbGVFeHQgPT09ICcnKSB7XG4gICAgICAgIHR5cGVGaWxlICs9ICcuZHRzJztcbiAgICAgIH1cblxuICAgICAgY29uc3QgYWJzVHlwZUZpbGUgPSBQYXRoLnJlc29sdmUocGtnLnJlYWxQYXRoLCB0eXBlRmlsZUV4dCk7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoYWJzVHlwZUZpbGUpKSB7XG4gICAgICAgIGxvZy53YXJuKGBQYWNrYWdlIHNldHRpbmcgJHtwa2cubmFtZX0ncyBkdHMgZmlsZSBcIiR7YWJzVHlwZUZpbGV9XCIgZG9lcyBub3QgZXhpc3QsIHNraXBwZWQuYCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgaWYgKHR5cGVFeHBvcnROYW1lID09IG51bGwpIHtcbiAgICAgICAgbG9nLmVycm9yKGBJbmNvcnJlY3QgcGFja2FnZSBjb25maWcgcHJvcGVydHkgZm9ybWF0IFwiJHtzZXR0aW5nLnR5cGV9XCIgaW4gJHtwa2cucmVhbFBhdGggKyBQYXRoLnNlcH1wYWNrYWdlLmpzb25gICtcbiAgICAgICAgICAnLCBjb3JyZWN0IGZvcm1hdCBpcyBcIjxkdHMtZmlsZS1yZWxhdGl2ZS1wYXRoPiM8VFMtdHlwZS1leHBvcnQtbmFtZT5cIicpO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHlpZWxkIFt0eXBlRmlsZS5yZXBsYWNlKC9cXC5bXi4vXFxcXF0rJC9nLCAnJyksIHR5cGVFeHBvcnROYW1lLCB2YWx1ZUZpbGUsIHZhbHVlRXhwb3J0LCBwa2ddO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgbG9nLndhcm4oYFNraXAgbG9hZGluZyBzZXR0aW5nIG9mIHBhY2thZ2UgJHtwa2cubmFtZX0sIGR1ZSB0byAodGhpcyBtaWdodCBiZSBjYXVzZWQgYnkgaW5jb3JyZWN0IHBhY2thZ2UuanNvbiBmb3JtYXQpYCwgZXJyKTtcbiAgICB9XG4gIH1cbn1cbi8qKlxuICogQHJldHVybnMgYWJzdWx0ZSBwYXRoIG9mIHNldHRpbmcgSlMgZmlsZXMgd2hpY2ggY29udGFpbnMgZXhwb3J0cyBuYW1lZCB3aXRoIFwiZGVmYXVsdFwiXG4gKi9cbmZ1bmN0aW9uIGxvYWRQYWNrYWdlU2V0dGluZ3MoKTogW2ZpbGU6IHN0cmluZywgZXhwb3J0TmFtZTogc3RyaW5nXVtdIHtcbiAgY29uc3Qge3dvcmtzcGFjZUtleSwgaXNDd2RXb3Jrc3BhY2V9ID0gcmVxdWlyZSgnLi4vcGFja2FnZS1tZ3InKSBhcyB0eXBlb2YgX3BrZ01ncjtcbiAgaWYgKCFpc0N3ZFdvcmtzcGFjZSgpKSB7XG4gICAgbG9nLmRlYnVnKCdOb3QgaW4gYSB3b3Jrc3BhY2UsIHNraXAgbG9hZGluZyBwYWNrYWdlIHNldHRpbmdzJyk7XG4gICAgcmV0dXJuIFtdO1xuICB9XG4gIGNvbnN0IGpzRmlsZXM6IFtmaWxlOiBzdHJpbmcsIGV4cG9ydE5hbWU6IHN0cmluZ11bXSA9IFtdO1xuXG4gIGZvciAoY29uc3QgW190eXBlRmlsZSwgX3R5cGVFeHBvcnQsIGpzRmlsZSwgZGVmYXVsdFNldHRpbmdFeHBvcnQsIHBrZ10gb2YgZ2V0UGFja2FnZVNldHRpbmdGaWxlcyh3b3Jrc3BhY2VLZXkocGxpbmtFbnYud29ya0RpcikpKSB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGFic0ZpbGUgPSBQYXRoLnJlc29sdmUocGxpbmtFbnYud29ya0RpciwgcGtnLnBhdGgsIGpzRmlsZSk7XG4gICAgICBjb25zdCBleHBzID0gcmVxdWlyZShhYnNGaWxlKTtcbiAgICAgIGNvbnN0IGRlZmF1bHRTZXR0aW5nRmFjdG9yeTogUGFja2FnZVNldHRpbmdJbnRlcmY8YW55PiA9IGV4cHNbZGVmYXVsdFNldHRpbmdFeHBvcnRdO1xuXG4gICAgICBpZiAodHlwZW9mIGRlZmF1bHRTZXR0aW5nRmFjdG9yeSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IGRlZmF1bHRTZXR0aW5nRmFjdG9yeShnZXRTdGF0ZSgpLmNsaU9wdGlvbnMhKTtcbiAgICAgICAgZGlzcGF0Y2hlci5fY2hhbmdlKHMgPT4gc1twa2cubmFtZV0gPSB2YWx1ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cud2FybihgRmFpbGVkIHRvIGxvYWQgcGFja2FnZSBzZXR0aW5nIGZyb20gJHtwa2cubmFtZX0vJHtqc0ZpbGV9LlxcbiBFeHBvcnQgbmFtZSBcIiR7ZGVmYXVsdFNldHRpbmdFeHBvcnR9XCIgaXMgbm90IGZvdW5kYCk7XG4gICAgICB9XG4gICAgICBpZiAoZGVmYXVsdFNldHRpbmdGYWN0b3J5ICE9IG51bGwpIHtcbiAgICAgICAganNGaWxlcy5wdXNoKFthYnNGaWxlLCBkZWZhdWx0U2V0dGluZ0V4cG9ydF0pO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgbG9nLmVycm9yKGBGYWlsZWQgdG8gbG9hZCBwYWNrYWdlIHNldHRpbmcgZnJvbSAke3BrZy5uYW1lfS8ke2pzRmlsZX0uJyR7ZGVmYXVsdFNldHRpbmdFeHBvcnR9YCwgZXJyKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGpzRmlsZXM7XG59XG5leHBvcnQgZGVmYXVsdCAoY29uZmlnIGFzIERyY3BDb25maWcpO1xuIl19