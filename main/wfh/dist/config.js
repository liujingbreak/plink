"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
// tslint:disable: prefer-const
require('yamlify/register');
const lodash_1 = __importDefault(require("lodash"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const config_handler_1 = require("./config-handler");
const network_util_1 = require("./utils/network-util");
const yamljs = require('yamljs');
const { distDir, rootDir } = JSON.parse(process.env.__plink);
const { cyan } = chalk_1.default;
let argv;
let handlers;
let rootPath = rootDir;
let setting;
let localConfigPath;
Promise.defer = defer;
function defer() {
    var resolve, reject;
    var promise = new Promise(function () {
        resolve = arguments[0];
        reject = arguments[1];
    });
    return {
        resolve,
        reject,
        promise
    };
}
/**
 * read and return configuration
 * @name config
 * @return {object} setting
 */
const config = () => {
    return setting;
};
let initResolve;
config.done = new Promise(resolve => {
    initResolve = resolve;
});
config.init = (_argv) => __awaiter(void 0, void 0, void 0, function* () {
    argv = _argv;
    localConfigPath = argv.config && argv.config.length > 0 ? argv.config : [path_1.default.join(distDir, 'config.local.yaml')];
    const res = yield load();
    initResolve(res);
    return res;
});
config.initSync = (_argv) => {
    argv = _argv;
    localConfigPath = argv.config && argv.config.length > 0 ? argv.config : [path_1.default.join(distDir, 'config.local.yaml')];
    const res = loadSync();
    return res;
};
config.reload = function reload() {
    setting = {};
    return load();
};
config.set = function (path, value) {
    lodash_1.default.set(setting, path, value);
    return setting;
};
config.get = function (propPath, defaultValue) {
    return lodash_1.default.get(setting, propPath, defaultValue);
};
config.setDefault = function (propPath, value) {
    if (!lodash_1.default.has(setting, propPath)) {
        lodash_1.default.set(setting, propPath, value);
    }
    return setting;
};
/**
 * Resolve a path based on `rootPath`
 * @name resolve
 * @memberof config
 * @param  {string} property name or property path, like "name", "name.childProp[1]"
 * @return {string}     absolute path
 */
config.resolve = function (pathPropName, ...paths) {
    const args = [rootPath, lodash_1.default.get(setting, pathPropName), ...paths];
    return path_1.default.resolve(...args);
};
config.load = load;
config.configHandlerMgr = () => handlers;
/**
 * Load configuration from config.yaml.
 * Besides those properties in config.yaml, there are extra available properties:
 * - rootPath {string} root path, normally it is identical as process.cwd()
 * 	resolved to relative path to this platform package folder, even it is under node_modules
 * 	folder loaded as dependency
 * - projectList
 * - nodePath <workspace>/node_modules
 * - wfhSrcPath meaning wfh source code is linked, it is not installed
 * - _package2Chunk a hash object whose key is `package name`, value is `chunk name`
 */
function load(fileList, cliOption) {
    return __awaiter(this, void 0, void 0, function* () {
        let cliOpt = cliOption == null ? argv : cliOption;
        const configFileList = prepareConfigFiles(fileList, cliOption);
        handlers = new config_handler_1.ConfigHandlerMgr(configFileList.filter(name => /\.[tj]s$/.test(name)));
        yield handlers.runEach((_file, obj, handler) => {
            if (handler.onConfig)
                return handler.onConfig(obj || setting, cliOpt);
        });
        return postProcessConfig(cliOpt);
    });
}
function loadSync(fileList, cliOption) {
    let cliOpt = cliOption == null ? argv : cliOption;
    const configFileList = prepareConfigFiles(fileList, cliOption);
    handlers = new config_handler_1.ConfigHandlerMgr(configFileList.filter(name => /\.[tj]s$/.test(name)));
    handlers.runEachSync((_file, obj, handler) => {
        if (handler.onConfig)
            return handler.onConfig(obj || setting, cliOpt);
    });
    return postProcessConfig(cliOpt);
}
function prepareConfigFiles(fileList, cliOption) {
    if (fileList)
        localConfigPath = fileList;
    // log.debug('root Path: ' + rootPath);
    setting = setting || {};
    setting.destDir = distDir;
    setting.staticDir = path_1.default.resolve(distDir, 'static');
    setting.dllDestDir = path_1.default.resolve(distDir, 'dll');
    // setting.projectList = [];
    // some extra config properties
    const initSetting = {
        rootPath,
        wfhSrcPath: wfhSrcPath(),
        devMode: cliOption == null || !cliOption.production
    };
    lodash_1.default.assign(setting, initSetting);
    // console.log(setting);
    // Merge from <root>/config.yaml
    var configFileList = [
        path_1.default.resolve(__dirname, '..', 'config.yaml')
    ];
    var rootConfig = path_1.default.join(distDir, 'config.yaml');
    if (fs_1.default.existsSync(rootConfig))
        configFileList.push(rootConfig);
    configFileList.push(...localConfigPath);
    configFileList.forEach(localConfigPath => mergeFromYamlJsonFile(setting, localConfigPath));
    return configFileList;
}
function postProcessConfig(cliOpt) {
    validateConfig();
    setting.port = normalizePort(setting.port);
    if (!setting.devMode)
        process.env.NODE_ENV = 'production';
    setting.publicPath = lodash_1.default.trimEnd(setting.staticAssetsURL || '', '/') + '/'; // always ends with /
    setting.localIP = network_util_1.getLanIPv4();
    mergeFromCliArgs(setting, cliOpt);
    if (setting.devMode) {
        // tslint:disable-next-line: no-console
        console.log(cyan('[config]') + ' Development mode');
    }
    else {
        // tslint:disable-next-line: no-console
        console.log(cyan('[config]') + ' Production mode');
    }
    return setting;
}
function mergeFromYamlJsonFile(setting, localConfigPath) {
    if (!fs_1.default.existsSync(localConfigPath)) {
        // tslint:disable-next-line: no-console
        console.log(cyan('[config]') + chalk_1.default.yellow(' File does not exist: %s', localConfigPath));
        return;
    }
    // tslint:disable-next-line: no-console
    console.log(cyan('[config]') + ` Read ${localConfigPath}`);
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
    lodash_1.default.assignWith(setting, configObj, (objValue, srcValue, key, object, source) => {
        if (lodash_1.default.isObject(objValue) && !Array.isArray(objValue)) {
            // We only merge 2nd level properties
            return lodash_1.default.assign(objValue, srcValue);
        }
    });
}
function mergeFromCliArgs(setting, cliOpt) {
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
        lodash_1.default.set(setting, propPath, value);
        // tslint:disable-next-line: no-console
        console.log(`[config] set ${propPath} = ${value}`);
    }
}
config.wfhSrcPath = wfhSrcPath;
function wfhSrcPath() {
    var wfhPath = path_1.default.dirname(require.resolve('@wfh/plink/package.json'));
    // log.debug('wfhPath: %s', wfhPath);
    // return (Path.basename(Path.dirname(wfhPath)) !== 'node_modules') ? wfhPath : false;
    return wfhPath;
}
function validateConfig() {
    if (!setting.nodeRoutePath) {
        console.error('[config error]: ' + ('"nodeRoutePath" must be set in config.yaml'));
        throw new Error('Invalid configuration');
    }
    ['staticAssetsURL',
        'nodeRoutePath',
        'compiledDir'].forEach(function (prop) {
        setting[prop] = trimTailSlash(setting[prop]);
    });
    var contextMapping = setting.packageContextPathMapping;
    if (contextMapping) {
        lodash_1.default.forOwn(contextMapping, function (path, key) {
            contextMapping[key] = trimTailSlash(path);
        });
    }
}
function trimTailSlash(url) {
    if (url === '/') {
        return url;
    }
    return lodash_1.default.endsWith(url, '/') ? url.substring(0, url.length - 1) : url;
}
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
module.exports = config;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQkFBK0I7QUFDL0IsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDNUIsb0RBQXVCO0FBQ3ZCLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsa0RBQTBCO0FBQzFCLHFEQUEyRjtBQUUzRix1REFBZ0Q7QUFFaEQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2pDLE1BQU0sRUFBQyxPQUFPLEVBQUUsT0FBTyxFQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQVEsQ0FBYSxDQUFDO0FBRXhFLE1BQU0sRUFBQyxJQUFJLEVBQUMsR0FBRyxlQUFLLENBQUM7QUFFckIsSUFBSSxJQUE0QixDQUFDO0FBRWpDLElBQUksUUFBMEIsQ0FBQztBQUMvQixJQUFJLFFBQVEsR0FBRyxPQUFPLENBQUM7QUFFdkIsSUFBSSxPQUFxQixDQUFDO0FBRTFCLElBQUksZUFBeUIsQ0FBQztBQUU3QixPQUFlLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztBQUUvQixTQUFTLEtBQUs7SUFDWixJQUFJLE9BQU8sRUFBRSxNQUFNLENBQUM7SUFDcEIsSUFBSSxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUM7UUFDeEIsT0FBTyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2QixNQUFNLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3hCLENBQUMsQ0FBQyxDQUFDO0lBQ0gsT0FBTztRQUNMLE9BQU87UUFDUCxNQUFNO1FBQ04sT0FBTztLQUNSLENBQUM7QUFDSixDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILE1BQU0sTUFBTSxHQUF3QixHQUFpQixFQUFFO0lBQ3JELE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUMsQ0FB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QUcsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0lBRXJFLElBQUksS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ2YsYUFBYTtRQUNiLE9BQU8sR0FBRyxDQUFDO0tBQ1o7SUFFRCxJQUFJLElBQUksSUFBSSxDQUFDLEVBQUU7UUFDYixjQUFjO1FBQ2QsT0FBTyxJQUFJLENBQUM7S0FDYjtJQUVELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQUNELGlCQUFVLE1BQXFCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB0c2xpbnQ6ZGlzYWJsZTogcHJlZmVyLWNvbnN0XG5yZXF1aXJlKCd5YW1saWZ5L3JlZ2lzdGVyJyk7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7Q29uZmlnSGFuZGxlck1nciwgRHJjcFNldHRpbmdzLCBEcmNwQ29uZmlnLCBDb25maWdIYW5kbGVyfSBmcm9tICcuL2NvbmZpZy1oYW5kbGVyJztcbmltcG9ydCB7R2xvYmFsT3B0aW9ucyBhcyBDbGlPcHRpb25zfSBmcm9tICcuL2NtZC90eXBlcyc7XG5pbXBvcnQge2dldExhbklQdjR9IGZyb20gJy4vdXRpbHMvbmV0d29yay11dGlsJztcbmltcG9ydCB7UGxpbmtFbnZ9IGZyb20gJy4vbm9kZS1wYXRoJztcbmNvbnN0IHlhbWxqcyA9IHJlcXVpcmUoJ3lhbWxqcycpO1xuY29uc3Qge2Rpc3REaXIsIHJvb3REaXJ9ID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5fX3BsaW5rISkgYXMgUGxpbmtFbnY7XG5cbmNvbnN0IHtjeWFufSA9IGNoYWxrO1xuXG5sZXQgYXJndjogQ2xpT3B0aW9ucyB8IHVuZGVmaW5lZDtcblxubGV0IGhhbmRsZXJzOiBDb25maWdIYW5kbGVyTWdyO1xubGV0IHJvb3RQYXRoID0gcm9vdERpcjtcblxubGV0IHNldHRpbmc6IERyY3BTZXR0aW5ncztcblxubGV0IGxvY2FsQ29uZmlnUGF0aDogc3RyaW5nW107XG5cbihQcm9taXNlIGFzIGFueSkuZGVmZXIgPSBkZWZlcjtcblxuZnVuY3Rpb24gZGVmZXIoKSB7XG4gIHZhciByZXNvbHZlLCByZWplY3Q7XG4gIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24oKSB7XG4gICAgcmVzb2x2ZSA9IGFyZ3VtZW50c1swXTtcbiAgICByZWplY3QgPSBhcmd1bWVudHNbMV07XG4gIH0pO1xuICByZXR1cm4ge1xuICAgIHJlc29sdmUsXG4gICAgcmVqZWN0LFxuICAgIHByb21pc2VcbiAgfTtcbn1cblxuLyoqXG4gKiByZWFkIGFuZCByZXR1cm4gY29uZmlndXJhdGlvblxuICogQG5hbWUgY29uZmlnXG4gKiBAcmV0dXJuIHtvYmplY3R9IHNldHRpbmdcbiAqL1xuY29uc3QgY29uZmlnOiBQYXJ0aWFsPERyY3BDb25maWc+ID0gKCk6IERyY3BTZXR0aW5ncyA9PiB7XG4gIHJldHVybiBzZXR0aW5nO1xufTtcblxubGV0IGluaXRSZXNvbHZlOiAodmFsdWU6IERyY3BTZXR0aW5ncykgPT4gdm9pZDtcbmNvbmZpZy5kb25lID0gbmV3IFByb21pc2U8RHJjcFNldHRpbmdzPihyZXNvbHZlID0+IHtcbiAgaW5pdFJlc29sdmUgPSByZXNvbHZlO1xufSk7XG5cbmNvbmZpZy5pbml0ID0gYXN5bmMgKF9hcmd2OiBDbGlPcHRpb25zKSA9PiB7XG4gIGFyZ3YgPSBfYXJndjtcbiAgbG9jYWxDb25maWdQYXRoID0gYXJndi5jb25maWcgJiYgYXJndi5jb25maWcubGVuZ3RoID4gMCA/IGFyZ3YuY29uZmlnIDogW1BhdGguam9pbihkaXN0RGlyLCAnY29uZmlnLmxvY2FsLnlhbWwnKV07XG4gIGNvbnN0IHJlcyA9IGF3YWl0IGxvYWQoKTtcbiAgaW5pdFJlc29sdmUocmVzKTtcbiAgcmV0dXJuIHJlcztcbn07XG5cbmNvbmZpZy5pbml0U3luYyA9IChfYXJndjogQ2xpT3B0aW9ucykgPT4ge1xuICBhcmd2ID0gX2FyZ3Y7XG4gIGxvY2FsQ29uZmlnUGF0aCA9IGFyZ3YuY29uZmlnICYmIGFyZ3YuY29uZmlnLmxlbmd0aCA+IDAgPyBhcmd2LmNvbmZpZyA6IFtQYXRoLmpvaW4oZGlzdERpciwgJ2NvbmZpZy5sb2NhbC55YW1sJyldO1xuICBjb25zdCByZXMgPSBsb2FkU3luYygpO1xuICByZXR1cm4gcmVzO1xufTtcblxuXG5jb25maWcucmVsb2FkID0gZnVuY3Rpb24gcmVsb2FkKCkge1xuICBzZXR0aW5nID0ge30gYXMgRHJjcFNldHRpbmdzO1xuICByZXR1cm4gbG9hZCgpO1xufTtcblxuY29uZmlnLnNldCA9IGZ1bmN0aW9uKHBhdGg6IHN0cmluZywgdmFsdWU6IGFueSkge1xuICBfLnNldChzZXR0aW5nLCBwYXRoLCB2YWx1ZSk7XG4gIHJldHVybiBzZXR0aW5nO1xufTtcblxuY29uZmlnLmdldCA9IGZ1bmN0aW9uKHByb3BQYXRoOiBzdHJpbmcsIGRlZmF1bHRWYWx1ZTogYW55KSB7XG4gIHJldHVybiBfLmdldChzZXR0aW5nLCBwcm9wUGF0aCwgZGVmYXVsdFZhbHVlKTtcbn07XG5cbmNvbmZpZy5zZXREZWZhdWx0ID0gZnVuY3Rpb24ocHJvcFBhdGg6IHN0cmluZywgdmFsdWU6IGFueSkge1xuICBpZiAoIV8uaGFzKHNldHRpbmcsIHByb3BQYXRoKSkge1xuICAgIF8uc2V0KHNldHRpbmcsIHByb3BQYXRoLCB2YWx1ZSk7XG4gIH1cbiAgcmV0dXJuIHNldHRpbmc7XG59O1xuXG4vKipcbiAqIFJlc29sdmUgYSBwYXRoIGJhc2VkIG9uIGByb290UGF0aGBcbiAqIEBuYW1lIHJlc29sdmVcbiAqIEBtZW1iZXJvZiBjb25maWdcbiAqIEBwYXJhbSAge3N0cmluZ30gcHJvcGVydHkgbmFtZSBvciBwcm9wZXJ0eSBwYXRoLCBsaWtlIFwibmFtZVwiLCBcIm5hbWUuY2hpbGRQcm9wWzFdXCJcbiAqIEByZXR1cm4ge3N0cmluZ30gICAgIGFic29sdXRlIHBhdGhcbiAqL1xuY29uZmlnLnJlc29sdmUgPSBmdW5jdGlvbihwYXRoUHJvcE5hbWU6ICdkZXN0RGlyJ3wnc3RhdGljRGlyJ3wnc2VydmVyRGlyJywgLi4ucGF0aHM6IHN0cmluZ1tdKSB7XG4gIGNvbnN0IGFyZ3MgPSBbcm9vdFBhdGgsIF8uZ2V0KHNldHRpbmcsIHBhdGhQcm9wTmFtZSksIC4uLnBhdGhzXTtcbiAgcmV0dXJuIFBhdGgucmVzb2x2ZSguLi5hcmdzKTtcbn07XG5cbmNvbmZpZy5sb2FkID0gbG9hZDtcblxuY29uZmlnLmNvbmZpZ0hhbmRsZXJNZ3IgPSAoKSA9PiBoYW5kbGVycztcbi8qKlxuICogTG9hZCBjb25maWd1cmF0aW9uIGZyb20gY29uZmlnLnlhbWwuXG4gKiBCZXNpZGVzIHRob3NlIHByb3BlcnRpZXMgaW4gY29uZmlnLnlhbWwsIHRoZXJlIGFyZSBleHRyYSBhdmFpbGFibGUgcHJvcGVydGllczpcbiAqIC0gcm9vdFBhdGgge3N0cmluZ30gcm9vdCBwYXRoLCBub3JtYWxseSBpdCBpcyBpZGVudGljYWwgYXMgcHJvY2Vzcy5jd2QoKVxuICogXHRyZXNvbHZlZCB0byByZWxhdGl2ZSBwYXRoIHRvIHRoaXMgcGxhdGZvcm0gcGFja2FnZSBmb2xkZXIsIGV2ZW4gaXQgaXMgdW5kZXIgbm9kZV9tb2R1bGVzXG4gKiBcdGZvbGRlciBsb2FkZWQgYXMgZGVwZW5kZW5jeVxuICogLSBwcm9qZWN0TGlzdFxuICogLSBub2RlUGF0aCA8d29ya3NwYWNlPi9ub2RlX21vZHVsZXNcbiAqIC0gd2ZoU3JjUGF0aCBtZWFuaW5nIHdmaCBzb3VyY2UgY29kZSBpcyBsaW5rZWQsIGl0IGlzIG5vdCBpbnN0YWxsZWRcbiAqIC0gX3BhY2thZ2UyQ2h1bmsgYSBoYXNoIG9iamVjdCB3aG9zZSBrZXkgaXMgYHBhY2thZ2UgbmFtZWAsIHZhbHVlIGlzIGBjaHVuayBuYW1lYFxuICovXG5hc3luYyBmdW5jdGlvbiBsb2FkKGZpbGVMaXN0Pzogc3RyaW5nW10sIGNsaU9wdGlvbj86IENsaU9wdGlvbnMpOiBQcm9taXNlPERyY3BTZXR0aW5ncz4ge1xuICBsZXQgY2xpT3B0ID0gY2xpT3B0aW9uID09IG51bGwgPyBhcmd2ISA6IGNsaU9wdGlvbjtcbiAgY29uc3QgY29uZmlnRmlsZUxpc3QgPSBwcmVwYXJlQ29uZmlnRmlsZXMoZmlsZUxpc3QsIGNsaU9wdGlvbik7XG5cbiAgaGFuZGxlcnMgPSBuZXcgQ29uZmlnSGFuZGxlck1ncihjb25maWdGaWxlTGlzdC5maWx0ZXIobmFtZSA9PiAvXFwuW3RqXXMkLy50ZXN0KG5hbWUpKSk7XG5cbiAgYXdhaXQgaGFuZGxlcnMucnVuRWFjaDxDb25maWdIYW5kbGVyPigoX2ZpbGUsIG9iaiwgaGFuZGxlcikgPT4ge1xuICAgIGlmIChoYW5kbGVyLm9uQ29uZmlnKVxuICAgICAgcmV0dXJuIGhhbmRsZXIub25Db25maWcob2JqIHx8IHNldHRpbmcsIGNsaU9wdCk7XG4gIH0pO1xuICByZXR1cm4gcG9zdFByb2Nlc3NDb25maWcoY2xpT3B0KTtcbn1cblxuZnVuY3Rpb24gbG9hZFN5bmMoZmlsZUxpc3Q/OiBzdHJpbmdbXSwgY2xpT3B0aW9uPzogQ2xpT3B0aW9ucyk6IERyY3BTZXR0aW5ncyB7XG4gIGxldCBjbGlPcHQgPSBjbGlPcHRpb24gPT0gbnVsbCA/IGFyZ3YhIDogY2xpT3B0aW9uO1xuICBjb25zdCBjb25maWdGaWxlTGlzdCA9IHByZXBhcmVDb25maWdGaWxlcyhmaWxlTGlzdCwgY2xpT3B0aW9uKTtcblxuICBoYW5kbGVycyA9IG5ldyBDb25maWdIYW5kbGVyTWdyKGNvbmZpZ0ZpbGVMaXN0LmZpbHRlcihuYW1lID0+IC9cXC5bdGpdcyQvLnRlc3QobmFtZSkpKTtcblxuICBoYW5kbGVycy5ydW5FYWNoU3luYzxDb25maWdIYW5kbGVyPigoX2ZpbGUsIG9iaiwgaGFuZGxlcikgPT4ge1xuICAgIGlmIChoYW5kbGVyLm9uQ29uZmlnKVxuICAgICAgcmV0dXJuIGhhbmRsZXIub25Db25maWcob2JqIHx8IHNldHRpbmcsIGNsaU9wdCk7XG4gIH0pO1xuICByZXR1cm4gcG9zdFByb2Nlc3NDb25maWcoY2xpT3B0KTtcbn1cblxuZnVuY3Rpb24gcHJlcGFyZUNvbmZpZ0ZpbGVzKGZpbGVMaXN0Pzogc3RyaW5nW10sIGNsaU9wdGlvbj86IENsaU9wdGlvbnMpIHtcbiAgaWYgKGZpbGVMaXN0KVxuICAgIGxvY2FsQ29uZmlnUGF0aCA9IGZpbGVMaXN0O1xuXG4gIC8vIGxvZy5kZWJ1Zygncm9vdCBQYXRoOiAnICsgcm9vdFBhdGgpO1xuICBzZXR0aW5nID0gc2V0dGluZyB8fCB7fTtcbiAgc2V0dGluZy5kZXN0RGlyID0gZGlzdERpcjtcbiAgc2V0dGluZy5zdGF0aWNEaXIgPSBQYXRoLnJlc29sdmUoZGlzdERpciwgJ3N0YXRpYycpO1xuICBzZXR0aW5nLmRsbERlc3REaXIgPSBQYXRoLnJlc29sdmUoZGlzdERpciwgJ2RsbCcpO1xuICAvLyBzZXR0aW5nLnByb2plY3RMaXN0ID0gW107XG4gIC8vIHNvbWUgZXh0cmEgY29uZmlnIHByb3BlcnRpZXNcbiAgY29uc3QgaW5pdFNldHRpbmc6IFBhcnRpYWw8RHJjcFNldHRpbmdzPiA9IHtcbiAgICByb290UGF0aCxcbiAgICB3ZmhTcmNQYXRoOiB3ZmhTcmNQYXRoKCksXG4gICAgZGV2TW9kZTogY2xpT3B0aW9uID09IG51bGwgfHwgIWNsaU9wdGlvbi5wcm9kdWN0aW9uXG4gIH07XG4gIF8uYXNzaWduKHNldHRpbmcsIGluaXRTZXR0aW5nKTtcbiAgLy8gY29uc29sZS5sb2coc2V0dGluZyk7XG4gIC8vIE1lcmdlIGZyb20gPHJvb3Q+L2NvbmZpZy55YW1sXG4gIHZhciBjb25maWdGaWxlTGlzdCA9IFtcbiAgICBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4nLCAnY29uZmlnLnlhbWwnKVxuICBdO1xuICB2YXIgcm9vdENvbmZpZyA9IFBhdGguam9pbihkaXN0RGlyLCAnY29uZmlnLnlhbWwnKTtcbiAgaWYgKGZzLmV4aXN0c1N5bmMocm9vdENvbmZpZykpXG4gICAgY29uZmlnRmlsZUxpc3QucHVzaChyb290Q29uZmlnKTtcblxuICBjb25maWdGaWxlTGlzdC5wdXNoKC4uLmxvY2FsQ29uZmlnUGF0aCk7XG5cbiAgY29uZmlnRmlsZUxpc3QuZm9yRWFjaChsb2NhbENvbmZpZ1BhdGggPT4gbWVyZ2VGcm9tWWFtbEpzb25GaWxlKHNldHRpbmcsIGxvY2FsQ29uZmlnUGF0aCkpO1xuXG4gIHJldHVybiBjb25maWdGaWxlTGlzdDtcbn1cblxuZnVuY3Rpb24gcG9zdFByb2Nlc3NDb25maWcoY2xpT3B0OiBDbGlPcHRpb25zKSB7XG4gIHZhbGlkYXRlQ29uZmlnKCk7XG5cbiAgc2V0dGluZy5wb3J0ID0gbm9ybWFsaXplUG9ydChzZXR0aW5nLnBvcnQpO1xuXG4gIGlmICghc2V0dGluZy5kZXZNb2RlKVxuICAgIHByb2Nlc3MuZW52Lk5PREVfRU5WID0gJ3Byb2R1Y3Rpb24nO1xuICBzZXR0aW5nLnB1YmxpY1BhdGggPSBfLnRyaW1FbmQoc2V0dGluZy5zdGF0aWNBc3NldHNVUkwgfHwgJycsICcvJykgKyAnLyc7IC8vIGFsd2F5cyBlbmRzIHdpdGggL1xuICBzZXR0aW5nLmxvY2FsSVAgPSBnZXRMYW5JUHY0KCk7XG5cbiAgbWVyZ2VGcm9tQ2xpQXJncyhzZXR0aW5nLCBjbGlPcHQpO1xuICBpZiAoc2V0dGluZy5kZXZNb2RlKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coY3lhbignW2NvbmZpZ10nKSArICcgRGV2ZWxvcG1lbnQgbW9kZScpO1xuICB9IGVsc2Uge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGN5YW4oJ1tjb25maWddJykgKyAnIFByb2R1Y3Rpb24gbW9kZScpO1xuICB9XG4gIHJldHVybiBzZXR0aW5nO1xufVxuXG5mdW5jdGlvbiBtZXJnZUZyb21ZYW1sSnNvbkZpbGUoc2V0dGluZzogRHJjcFNldHRpbmdzLCBsb2NhbENvbmZpZ1BhdGg6IHN0cmluZykge1xuICBpZiAoIWZzLmV4aXN0c1N5bmMobG9jYWxDb25maWdQYXRoKSkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGN5YW4oJ1tjb25maWddJykgKyBjaGFsay55ZWxsb3coJyBGaWxlIGRvZXMgbm90IGV4aXN0OiAlcycsIGxvY2FsQ29uZmlnUGF0aCkpO1xuICAgIHJldHVybjtcbiAgfVxuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coY3lhbignW2NvbmZpZ10nKSArIGAgUmVhZCAke2xvY2FsQ29uZmlnUGF0aH1gKTtcbiAgdmFyIGNvbmZpZ09iajoge1trZXk6IHN0cmluZ106IGFueX07XG5cbiAgY29uc3QgbWF0Y2hlZCA9IC9cXC4oW14uXSspJC8uZXhlYyhsb2NhbENvbmZpZ1BhdGgpO1xuXG4gIGxldCBzdWZmaXggPSBtYXRjaGVkID8gbWF0Y2hlZFsxXSA6IG51bGw7XG4gIGlmIChzdWZmaXggPT09ICd5YW1sJyB8fCBzdWZmaXggPT09ICd5bWwnKSB7XG4gICAgY29uZmlnT2JqID0geWFtbGpzLnBhcnNlKGZzLnJlYWRGaWxlU3luYyhsb2NhbENvbmZpZ1BhdGgsICd1dGY4JykpO1xuICB9IGVsc2UgaWYgKHN1ZmZpeCA9PT0gJ2pzb24nKSB7XG4gICAgY29uZmlnT2JqID0gcmVxdWlyZShQYXRoLnJlc29sdmUobG9jYWxDb25maWdQYXRoKSk7XG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgXy5hc3NpZ25XaXRoKHNldHRpbmcsIGNvbmZpZ09iaiwgKG9ialZhbHVlLCBzcmNWYWx1ZSwga2V5LCBvYmplY3QsIHNvdXJjZSkgPT4ge1xuICAgIGlmIChfLmlzT2JqZWN0KG9ialZhbHVlKSAmJiAhQXJyYXkuaXNBcnJheShvYmpWYWx1ZSkpIHtcbiAgICAgIC8vIFdlIG9ubHkgbWVyZ2UgMm5kIGxldmVsIHByb3BlcnRpZXNcbiAgICAgIHJldHVybiBfLmFzc2lnbihvYmpWYWx1ZSwgc3JjVmFsdWUpO1xuICAgIH1cbiAgfSk7XG59XG5cbmZ1bmN0aW9uIG1lcmdlRnJvbUNsaUFyZ3Moc2V0dGluZzogRHJjcFNldHRpbmdzLCBjbGlPcHQ6IENsaU9wdGlvbnMpIHtcbiAgaWYgKCFjbGlPcHQucHJvcClcbiAgICByZXR1cm47XG4gIGZvciAobGV0IHByb3BQYWlyIG9mIGNsaU9wdC5wcm9wKSB7XG4gICAgY29uc3QgcHJvcFNldCA9IHByb3BQYWlyLnNwbGl0KCc9Jyk7XG4gICAgbGV0IHByb3BQYXRoID0gcHJvcFNldFswXTtcbiAgICBpZiAoXy5zdGFydHNXaXRoKHByb3BTZXRbMF0sICdbJykpXG4gICAgICBwcm9wUGF0aCA9IEpTT04ucGFyc2UocHJvcFNldFswXSk7XG4gICAgbGV0IHZhbHVlO1xuICAgIHRyeSB7XG4gICAgICB2YWx1ZSA9IEpTT04ucGFyc2UocHJvcFNldFsxXSk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgdmFsdWUgPSBwcm9wU2V0WzFdID09PSAndW5kZWZpbmVkJyA/IHVuZGVmaW5lZCA6IHByb3BTZXRbMV07XG4gICAgfVxuICAgIF8uc2V0KHNldHRpbmcsIHByb3BQYXRoLCB2YWx1ZSk7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coYFtjb25maWddIHNldCAke3Byb3BQYXRofSA9ICR7dmFsdWV9YCk7XG4gIH1cbn1cblxuY29uZmlnLndmaFNyY1BhdGggPSB3ZmhTcmNQYXRoO1xuXG5mdW5jdGlvbiB3ZmhTcmNQYXRoKCkge1xuICB2YXIgd2ZoUGF0aCA9IFBhdGguZGlybmFtZShyZXF1aXJlLnJlc29sdmUoJ0B3ZmgvcGxpbmsvcGFja2FnZS5qc29uJykpO1xuICAvLyBsb2cuZGVidWcoJ3dmaFBhdGg6ICVzJywgd2ZoUGF0aCk7XG4gIC8vIHJldHVybiAoUGF0aC5iYXNlbmFtZShQYXRoLmRpcm5hbWUod2ZoUGF0aCkpICE9PSAnbm9kZV9tb2R1bGVzJykgPyB3ZmhQYXRoIDogZmFsc2U7XG4gIHJldHVybiB3ZmhQYXRoO1xufVxuXG5mdW5jdGlvbiB2YWxpZGF0ZUNvbmZpZygpIHtcbiAgaWYgKCFzZXR0aW5nLm5vZGVSb3V0ZVBhdGgpIHtcbiAgICBjb25zb2xlLmVycm9yKCdbY29uZmlnIGVycm9yXTogJyArICgnXCJub2RlUm91dGVQYXRoXCIgbXVzdCBiZSBzZXQgaW4gY29uZmlnLnlhbWwnKSk7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGNvbmZpZ3VyYXRpb24nKTtcbiAgfVxuXG4gIFsnc3RhdGljQXNzZXRzVVJMJyxcbiAgICAnbm9kZVJvdXRlUGF0aCcsXG4gICAgJ2NvbXBpbGVkRGlyJ10uZm9yRWFjaChmdW5jdGlvbihwcm9wKSB7XG4gICAgICBzZXR0aW5nW3Byb3BdID0gdHJpbVRhaWxTbGFzaChzZXR0aW5nW3Byb3BdKTtcbiAgICB9KTtcblxuICB2YXIgY29udGV4dE1hcHBpbmcgPSBzZXR0aW5nLnBhY2thZ2VDb250ZXh0UGF0aE1hcHBpbmc7XG4gIGlmIChjb250ZXh0TWFwcGluZykge1xuICAgIF8uZm9yT3duKGNvbnRleHRNYXBwaW5nLCBmdW5jdGlvbihwYXRoLCBrZXkpIHtcbiAgICAgIGNvbnRleHRNYXBwaW5nW2tleV0gPSB0cmltVGFpbFNsYXNoKHBhdGgpO1xuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHRyaW1UYWlsU2xhc2godXJsOiBzdHJpbmcpIHtcbiAgaWYgKHVybCA9PT0gJy8nKSB7XG4gICAgcmV0dXJuIHVybDtcbiAgfVxuICByZXR1cm4gXy5lbmRzV2l0aCh1cmwsICcvJykgPyB1cmwuc3Vic3RyaW5nKDAsIHVybC5sZW5ndGggLSAxKSA6IHVybDtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplUG9ydCh2YWw6IHN0cmluZyB8IG51bWJlcikge1xuICBsZXQgcG9ydDogbnVtYmVyID0gdHlwZW9mIHZhbCA9PT0gJ3N0cmluZycgPyBwYXJzZUludCh2YWwsIDEwKSA6IHZhbDtcblxuICBpZiAoaXNOYU4ocG9ydCkpIHtcbiAgICAvLyBuYW1lZCBwaXBlXG4gICAgcmV0dXJuIHZhbDtcbiAgfVxuXG4gIGlmIChwb3J0ID49IDApIHtcbiAgICAvLyBwb3J0IG51bWJlclxuICAgIHJldHVybiBwb3J0O1xuICB9XG5cbiAgcmV0dXJuIDgwODA7XG59XG5leHBvcnQgPSAoY29uZmlnIGFzIERyY3BDb25maWcpO1xuIl19