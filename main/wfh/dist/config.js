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
const lodash_1 = __importDefault(require("lodash"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const config_handler_1 = require("./config-handler");
const network_util_1 = require("./utils/network-util");
const misc_1 = require("./utils/misc");
// import {getStore as getPckStore} from './package-mgr';
// import {map, distinctUntilChanged} from 'rxjs/operators';
const { cyan } = chalk_1.default;
const yamljs = require('yamljs');
let argv;
// var argv = require('yargs').argv;
require('yamlify/register');
// var publicPath = require('./publicPath');
let handlers;
let rootPath = misc_1.getRootDir();
let setting;
// let localDisabled = false;
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
    localConfigPath = argv.config.length > 0 ? argv.config : [path_1.default.join(rootPath, 'dist', 'config.local.yaml')];
    const res = yield load();
    initResolve(res);
    return res;
});
config.initSync = (_argv) => {
    argv = _argv;
    localConfigPath = argv.config.length > 0 ? argv.config : [path_1.default.join(rootPath, 'dist', 'config.local.yaml')];
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
        if (setting.recipeFolder) {
            setting.recipeFolderPath = path_1.default.resolve(rootPath, setting.recipeFolder);
        }
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
    if (setting.recipeFolder) {
        setting.recipeFolderPath = path_1.default.resolve(rootPath, setting.recipeFolder);
    }
    return postProcessConfig(cliOpt);
}
function prepareConfigFiles(fileList, cliOption) {
    if (fileList)
        localConfigPath = fileList;
    // log.debug('root Path: ' + rootPath);
    setting = setting || {};
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
    var rootConfig = path_1.default.resolve(rootPath, 'dist', 'config.yaml');
    if (fs_1.default.existsSync(rootConfig))
        configFileList.push(rootConfig);
    configFileList.push(...localConfigPath);
    configFileList.forEach(localConfigPath => mergeFromYamlJsonFile(setting, localConfigPath));
    return configFileList;
}
function postProcessConfig(cliOpt) {
    validateConfig();
    setting.port = normalizePort(setting.port);
    // console.log(setting);
    if (!setting.devMode)
        process.env.NODE_ENV = 'production';
    setting.publicPath = lodash_1.default.trimEnd(setting.staticAssetsURL || '', '/') + '/'; // always ends with /
    setting.localIP = network_util_1.getLanIPv4();
    // setting.hostnamePath = publicPath.getHostnamePath(setting);
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
        console.log(cyan('[config]') + ' File does not exist: %s', localConfigPath);
        return;
    }
    // tslint:disable-next-line: no-console
    console.log(cyan('[config]') + ` Read ${localConfigPath}`);
    // var package2Chunk = setting._package2Chunk;
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
        // if (key === 'vendorBundleMap') {
        //   if (!_.isObject(objValue) || !_.isObject(srcValue))
        //     return;
        //   _.each(srcValue, (packageList, chunk) => {
        //     if (!_.isArray(packageList))
        //       return;
        //     for (const p of packageList) {
        //       package2Chunk[p] = chunk;
        //     }
        //   });
        // } else if (key === 'outputPathMap') {
        //   if (!objValue)
        //     objValue = object.outputPathMap = {};
        //   return _.assign(objValue, srcValue);
        // } else 
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
    var wfhPath = path_1.default.dirname(require.resolve('dr-comp-package/package.json'));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQkFBK0I7QUFDL0Isb0RBQXVCO0FBQ3ZCLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsa0RBQTBCO0FBQzFCLHFEQUEyRjtBQUUzRix1REFBZ0Q7QUFDaEQsdUNBQXdDO0FBQ3hDLHlEQUF5RDtBQUN6RCw0REFBNEQ7QUFFNUQsTUFBTSxFQUFDLElBQUksRUFBQyxHQUFHLGVBQUssQ0FBQztBQUNyQixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDakMsSUFBSSxJQUE0QixDQUFDO0FBQ2pDLG9DQUFvQztBQUNwQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUM1Qiw0Q0FBNEM7QUFDNUMsSUFBSSxRQUEwQixDQUFDO0FBQy9CLElBQUksUUFBUSxHQUFHLGlCQUFVLEVBQUUsQ0FBQztBQUU1QixJQUFJLE9BQXFCLENBQUM7QUFDMUIsNkJBQTZCO0FBQzdCLElBQUksZUFBeUIsQ0FBQztBQUU3QixPQUFlLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztBQUUvQixTQUFTLEtBQUs7SUFDWixJQUFJLE9BQU8sRUFBRSxNQUFNLENBQUM7SUFDcEIsSUFBSSxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUM7UUFDeEIsT0FBTyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2QixNQUFNLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3hCLENBQUMsQ0FBQyxDQUFDO0lBQ0gsT0FBTztRQUNMLE9BQU87UUFDUCxNQUFNO1FBQ04sT0FBTztLQUNSLENBQUM7QUFDSixDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILE1BQU0sTUFBTSxHQUF3QixHQUFpQixFQUFFO0lBQ3JELE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUMsQ0FBQztBQUVGLElBQUks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UUFBUSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQ3ZFLENBQUM7QUFFRCxTQUFTLGFBQWEsQ0FBQyxHQUFvQjtJQUN6QyxJQUFJLElBQUksR0FBVyxPQUFPLEdBQUcsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztJQUVyRSxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNmLGFBQWE7UUFDYixPQUFPLEdBQUcsQ0FBQztLQUNaO0lBRUQsSUFBSSxJQUFJLElBQUksQ0FBQyxFQUFFO1FBQ2IsY0FBYztRQUNkLE9BQU8sSUFBSSxDQUFDO0tBQ2I7SUFFRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUM7QUFDRCxpQkFBVSxNQUFxQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IHByZWZlci1jb25zdFxuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQge0NvbmZpZ0hhbmRsZXJNZ3IsIERyY3BTZXR0aW5ncywgRHJjcENvbmZpZywgQ29uZmlnSGFuZGxlcn0gZnJvbSAnLi9jb25maWctaGFuZGxlcic7XG5pbXBvcnQge0dsb2JhbE9wdGlvbnMgYXMgQ2xpT3B0aW9uc30gZnJvbSAnLi9jbWQvdHlwZXMnO1xuaW1wb3J0IHtnZXRMYW5JUHY0fSBmcm9tICcuL3V0aWxzL25ldHdvcmstdXRpbCc7XG5pbXBvcnQge2dldFJvb3REaXJ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG4vLyBpbXBvcnQge2dldFN0b3JlIGFzIGdldFBja1N0b3JlfSBmcm9tICcuL3BhY2thZ2UtbWdyJztcbi8vIGltcG9ydCB7bWFwLCBkaXN0aW5jdFVudGlsQ2hhbmdlZH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5jb25zdCB7Y3lhbn0gPSBjaGFsaztcbmNvbnN0IHlhbWxqcyA9IHJlcXVpcmUoJ3lhbWxqcycpO1xubGV0IGFyZ3Y6IENsaU9wdGlvbnMgfCB1bmRlZmluZWQ7XG4vLyB2YXIgYXJndiA9IHJlcXVpcmUoJ3lhcmdzJykuYXJndjtcbnJlcXVpcmUoJ3lhbWxpZnkvcmVnaXN0ZXInKTtcbi8vIHZhciBwdWJsaWNQYXRoID0gcmVxdWlyZSgnLi9wdWJsaWNQYXRoJyk7XG5sZXQgaGFuZGxlcnM6IENvbmZpZ0hhbmRsZXJNZ3I7XG5sZXQgcm9vdFBhdGggPSBnZXRSb290RGlyKCk7XG5cbmxldCBzZXR0aW5nOiBEcmNwU2V0dGluZ3M7XG4vLyBsZXQgbG9jYWxEaXNhYmxlZCA9IGZhbHNlO1xubGV0IGxvY2FsQ29uZmlnUGF0aDogc3RyaW5nW107XG5cbihQcm9taXNlIGFzIGFueSkuZGVmZXIgPSBkZWZlcjtcblxuZnVuY3Rpb24gZGVmZXIoKSB7XG4gIHZhciByZXNvbHZlLCByZWplY3Q7XG4gIHZhciBwcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24oKSB7XG4gICAgcmVzb2x2ZSA9IGFyZ3VtZW50c1swXTtcbiAgICByZWplY3QgPSBhcmd1bWVudHNbMV07XG4gIH0pO1xuICByZXR1cm4ge1xuICAgIHJlc29sdmUsXG4gICAgcmVqZWN0LFxuICAgIHByb21pc2VcbiAgfTtcbn1cblxuLyoqXG4gKiByZWFkIGFuZCByZXR1cm4gY29uZmlndXJhdGlvblxuICogQG5hbWUgY29uZmlnXG4gKiBAcmV0dXJuIHtvYmplY3R9IHNldHRpbmdcbiAqL1xuY29uc3QgY29uZmlnOiBQYXJ0aWFsPERyY3BDb25maWc+ID0gKCk6IERyY3BTZXR0aW5ncyA9PiB7XG4gIHJldHVybiBzZXR0aW5nO1xufTtcblxubGV0IGluaXRSZXNvbHZlOiAodmFsdWU6IERyY3BTZXR0aW5ncykgPT4gdm9pZDtcbmNvbmZpZy5kb25lID0gbmV3IFByb21pc2U8RHJjcFNldHRpbmdzPihyZXNvbHZlID0+IHtcbiAgaW5pdFJlc29sdmUgPSByZXNvbHZlO1xufSk7XG5cbmNvbmZpZy5pbml0ID0gYXN5bmMgKF9hcmd2OiBDbGlPcHRpb25zKSA9PiB7XG4gIGFyZ3YgPSBfYXJndjtcbiAgbG9jYWxDb25maWdQYXRoID0gYXJndi5jb25maWcubGVuZ3RoID4gMCA/IGFyZ3YuY29uZmlnIDogW1BhdGguam9pbihyb290UGF0aCwgJ2Rpc3QnLCAnY29uZmlnLmxvY2FsLnlhbWwnKV07XG4gIGNvbnN0IHJlcyA9IGF3YWl0IGxvYWQoKTtcbiAgaW5pdFJlc29sdmUocmVzKTtcbiAgcmV0dXJuIHJlcztcbn07XG5cbmNvbmZpZy5pbml0U3luYyA9IChfYXJndjogQ2xpT3B0aW9ucykgPT4ge1xuICBhcmd2ID0gX2FyZ3Y7XG4gIGxvY2FsQ29uZmlnUGF0aCA9IGFyZ3YuY29uZmlnLmxlbmd0aCA+IDAgPyBhcmd2LmNvbmZpZyA6IFtQYXRoLmpvaW4ocm9vdFBhdGgsICdkaXN0JywgJ2NvbmZpZy5sb2NhbC55YW1sJyldO1xuICBjb25zdCByZXMgPSBsb2FkU3luYygpO1xuICByZXR1cm4gcmVzO1xufTtcblxuXG5jb25maWcucmVsb2FkID0gZnVuY3Rpb24gcmVsb2FkKCkge1xuICBzZXR0aW5nID0ge30gYXMgRHJjcFNldHRpbmdzO1xuICByZXR1cm4gbG9hZCgpO1xufTtcblxuY29uZmlnLnNldCA9IGZ1bmN0aW9uKHBhdGg6IHN0cmluZywgdmFsdWU6IGFueSkge1xuICBfLnNldChzZXR0aW5nLCBwYXRoLCB2YWx1ZSk7XG4gIHJldHVybiBzZXR0aW5nO1xufTtcblxuY29uZmlnLmdldCA9IGZ1bmN0aW9uKHByb3BQYXRoOiBzdHJpbmcsIGRlZmF1bHRWYWx1ZTogYW55KSB7XG4gIHJldHVybiBfLmdldChzZXR0aW5nLCBwcm9wUGF0aCwgZGVmYXVsdFZhbHVlKTtcbn07XG5cbmNvbmZpZy5zZXREZWZhdWx0ID0gZnVuY3Rpb24ocHJvcFBhdGg6IHN0cmluZywgdmFsdWU6IGFueSkge1xuICBpZiAoIV8uaGFzKHNldHRpbmcsIHByb3BQYXRoKSkge1xuICAgIF8uc2V0KHNldHRpbmcsIHByb3BQYXRoLCB2YWx1ZSk7XG4gIH1cbiAgcmV0dXJuIHNldHRpbmc7XG59O1xuXG4vKipcbiAqIFJlc29sdmUgYSBwYXRoIGJhc2VkIG9uIGByb290UGF0aGBcbiAqIEBuYW1lIHJlc29sdmVcbiAqIEBtZW1iZXJvZiBjb25maWdcbiAqIEBwYXJhbSAge3N0cmluZ30gcHJvcGVydHkgbmFtZSBvciBwcm9wZXJ0eSBwYXRoLCBsaWtlIFwibmFtZVwiLCBcIm5hbWUuY2hpbGRQcm9wWzFdXCJcbiAqIEByZXR1cm4ge3N0cmluZ30gICAgIGFic29sdXRlIHBhdGhcbiAqL1xuY29uZmlnLnJlc29sdmUgPSBmdW5jdGlvbihwYXRoUHJvcE5hbWU6ICdkZXN0RGlyJ3wnc3RhdGljRGlyJ3wnc2VydmVyRGlyJywgLi4ucGF0aHM6IHN0cmluZ1tdKSB7XG4gIGNvbnN0IGFyZ3MgPSBbcm9vdFBhdGgsIF8uZ2V0KHNldHRpbmcsIHBhdGhQcm9wTmFtZSksIC4uLnBhdGhzXTtcbiAgcmV0dXJuIFBhdGgucmVzb2x2ZSguLi5hcmdzKTtcbn07XG5cbmNvbmZpZy5sb2FkID0gbG9hZDtcblxuY29uZmlnLmNvbmZpZ0hhbmRsZXJNZ3IgPSAoKSA9PiBoYW5kbGVycztcbi8qKlxuICogTG9hZCBjb25maWd1cmF0aW9uIGZyb20gY29uZmlnLnlhbWwuXG4gKiBCZXNpZGVzIHRob3NlIHByb3BlcnRpZXMgaW4gY29uZmlnLnlhbWwsIHRoZXJlIGFyZSBleHRyYSBhdmFpbGFibGUgcHJvcGVydGllczpcbiAqIC0gcm9vdFBhdGgge3N0cmluZ30gcm9vdCBwYXRoLCBub3JtYWxseSBpdCBpcyBpZGVudGljYWwgYXMgcHJvY2Vzcy5jd2QoKVxuICogXHRyZXNvbHZlZCB0byByZWxhdGl2ZSBwYXRoIHRvIHRoaXMgcGxhdGZvcm0gcGFja2FnZSBmb2xkZXIsIGV2ZW4gaXQgaXMgdW5kZXIgbm9kZV9tb2R1bGVzXG4gKiBcdGZvbGRlciBsb2FkZWQgYXMgZGVwZW5kZW5jeVxuICogLSBwcm9qZWN0TGlzdFxuICogLSBub2RlUGF0aCA8d29ya3NwYWNlPi9ub2RlX21vZHVsZXNcbiAqIC0gd2ZoU3JjUGF0aCBtZWFuaW5nIHdmaCBzb3VyY2UgY29kZSBpcyBsaW5rZWQsIGl0IGlzIG5vdCBpbnN0YWxsZWRcbiAqIC0gX3BhY2thZ2UyQ2h1bmsgYSBoYXNoIG9iamVjdCB3aG9zZSBrZXkgaXMgYHBhY2thZ2UgbmFtZWAsIHZhbHVlIGlzIGBjaHVuayBuYW1lYFxuICovXG5hc3luYyBmdW5jdGlvbiBsb2FkKGZpbGVMaXN0Pzogc3RyaW5nW10sIGNsaU9wdGlvbj86IENsaU9wdGlvbnMpOiBQcm9taXNlPERyY3BTZXR0aW5ncz4ge1xuICBsZXQgY2xpT3B0ID0gY2xpT3B0aW9uID09IG51bGwgPyBhcmd2ISA6IGNsaU9wdGlvbjtcbiAgY29uc3QgY29uZmlnRmlsZUxpc3QgPSBwcmVwYXJlQ29uZmlnRmlsZXMoZmlsZUxpc3QsIGNsaU9wdGlvbik7XG5cbiAgaGFuZGxlcnMgPSBuZXcgQ29uZmlnSGFuZGxlck1ncihjb25maWdGaWxlTGlzdC5maWx0ZXIobmFtZSA9PiAvXFwuW3RqXXMkLy50ZXN0KG5hbWUpKSk7XG5cbiAgYXdhaXQgaGFuZGxlcnMucnVuRWFjaDxDb25maWdIYW5kbGVyPigoX2ZpbGUsIG9iaiwgaGFuZGxlcikgPT4ge1xuICAgIGlmIChoYW5kbGVyLm9uQ29uZmlnKVxuICAgICAgcmV0dXJuIGhhbmRsZXIub25Db25maWcob2JqIHx8IHNldHRpbmcsIGNsaU9wdCk7XG4gIH0pO1xuICBpZiAoc2V0dGluZy5yZWNpcGVGb2xkZXIpIHtcbiAgICBzZXR0aW5nLnJlY2lwZUZvbGRlclBhdGggPSBQYXRoLnJlc29sdmUocm9vdFBhdGgsIHNldHRpbmcucmVjaXBlRm9sZGVyKTtcbiAgfVxuICByZXR1cm4gcG9zdFByb2Nlc3NDb25maWcoY2xpT3B0KTtcbn1cblxuZnVuY3Rpb24gbG9hZFN5bmMoZmlsZUxpc3Q/OiBzdHJpbmdbXSwgY2xpT3B0aW9uPzogQ2xpT3B0aW9ucyk6IERyY3BTZXR0aW5ncyB7XG4gIGxldCBjbGlPcHQgPSBjbGlPcHRpb24gPT0gbnVsbCA/IGFyZ3YhIDogY2xpT3B0aW9uO1xuICBjb25zdCBjb25maWdGaWxlTGlzdCA9IHByZXBhcmVDb25maWdGaWxlcyhmaWxlTGlzdCwgY2xpT3B0aW9uKTtcblxuICBoYW5kbGVycyA9IG5ldyBDb25maWdIYW5kbGVyTWdyKGNvbmZpZ0ZpbGVMaXN0LmZpbHRlcihuYW1lID0+IC9cXC5bdGpdcyQvLnRlc3QobmFtZSkpKTtcblxuICBoYW5kbGVycy5ydW5FYWNoU3luYzxDb25maWdIYW5kbGVyPigoX2ZpbGUsIG9iaiwgaGFuZGxlcikgPT4ge1xuICAgIGlmIChoYW5kbGVyLm9uQ29uZmlnKVxuICAgICAgcmV0dXJuIGhhbmRsZXIub25Db25maWcob2JqIHx8IHNldHRpbmcsIGNsaU9wdCk7XG4gIH0pO1xuICBpZiAoc2V0dGluZy5yZWNpcGVGb2xkZXIpIHtcbiAgICBzZXR0aW5nLnJlY2lwZUZvbGRlclBhdGggPSBQYXRoLnJlc29sdmUocm9vdFBhdGgsIHNldHRpbmcucmVjaXBlRm9sZGVyKTtcbiAgfVxuICByZXR1cm4gcG9zdFByb2Nlc3NDb25maWcoY2xpT3B0KTtcbn1cblxuZnVuY3Rpb24gcHJlcGFyZUNvbmZpZ0ZpbGVzKGZpbGVMaXN0Pzogc3RyaW5nW10sIGNsaU9wdGlvbj86IENsaU9wdGlvbnMpIHtcbiAgaWYgKGZpbGVMaXN0KVxuICAgIGxvY2FsQ29uZmlnUGF0aCA9IGZpbGVMaXN0O1xuXG4gIC8vIGxvZy5kZWJ1Zygncm9vdCBQYXRoOiAnICsgcm9vdFBhdGgpO1xuICBzZXR0aW5nID0gc2V0dGluZyB8fCB7fTtcbiAgLy8gc2V0dGluZy5wcm9qZWN0TGlzdCA9IFtdO1xuICAvLyBzb21lIGV4dHJhIGNvbmZpZyBwcm9wZXJ0aWVzXG4gIGNvbnN0IGluaXRTZXR0aW5nOiBQYXJ0aWFsPERyY3BTZXR0aW5ncz4gPSB7XG4gICAgcm9vdFBhdGgsXG4gICAgd2ZoU3JjUGF0aDogd2ZoU3JjUGF0aCgpLFxuICAgIGRldk1vZGU6IGNsaU9wdGlvbiA9PSBudWxsIHx8ICFjbGlPcHRpb24ucHJvZHVjdGlvblxuICB9O1xuICBfLmFzc2lnbihzZXR0aW5nLCBpbml0U2V0dGluZyk7XG4gIC8vIGNvbnNvbGUubG9nKHNldHRpbmcpO1xuICAvLyBNZXJnZSBmcm9tIDxyb290Pi9jb25maWcueWFtbFxuICB2YXIgY29uZmlnRmlsZUxpc3QgPSBbXG4gICAgUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uJywgJ2NvbmZpZy55YW1sJylcbiAgXTtcbiAgdmFyIHJvb3RDb25maWcgPSBQYXRoLnJlc29sdmUocm9vdFBhdGgsICdkaXN0JywgJ2NvbmZpZy55YW1sJyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKHJvb3RDb25maWcpKVxuICAgIGNvbmZpZ0ZpbGVMaXN0LnB1c2gocm9vdENvbmZpZyk7XG5cbiAgY29uZmlnRmlsZUxpc3QucHVzaCguLi5sb2NhbENvbmZpZ1BhdGgpO1xuXG4gIGNvbmZpZ0ZpbGVMaXN0LmZvckVhY2gobG9jYWxDb25maWdQYXRoID0+IG1lcmdlRnJvbVlhbWxKc29uRmlsZShzZXR0aW5nLCBsb2NhbENvbmZpZ1BhdGgpKTtcblxuICByZXR1cm4gY29uZmlnRmlsZUxpc3Q7XG59XG5cbmZ1bmN0aW9uIHBvc3RQcm9jZXNzQ29uZmlnKGNsaU9wdDogQ2xpT3B0aW9ucykge1xuICB2YWxpZGF0ZUNvbmZpZygpO1xuXG4gIHNldHRpbmcucG9ydCA9IG5vcm1hbGl6ZVBvcnQoc2V0dGluZy5wb3J0KTtcbiAgLy8gY29uc29sZS5sb2coc2V0dGluZyk7XG4gIGlmICghc2V0dGluZy5kZXZNb2RlKVxuICAgIHByb2Nlc3MuZW52Lk5PREVfRU5WID0gJ3Byb2R1Y3Rpb24nO1xuICBzZXR0aW5nLnB1YmxpY1BhdGggPSBfLnRyaW1FbmQoc2V0dGluZy5zdGF0aWNBc3NldHNVUkwgfHwgJycsICcvJykgKyAnLyc7IC8vIGFsd2F5cyBlbmRzIHdpdGggL1xuICBzZXR0aW5nLmxvY2FsSVAgPSBnZXRMYW5JUHY0KCk7XG4gIC8vIHNldHRpbmcuaG9zdG5hbWVQYXRoID0gcHVibGljUGF0aC5nZXRIb3N0bmFtZVBhdGgoc2V0dGluZyk7XG4gIG1lcmdlRnJvbUNsaUFyZ3Moc2V0dGluZywgY2xpT3B0KTtcbiAgaWYgKHNldHRpbmcuZGV2TW9kZSkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGN5YW4oJ1tjb25maWddJykgKyAnIERldmVsb3BtZW50IG1vZGUnKTtcbiAgfSBlbHNlIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhjeWFuKCdbY29uZmlnXScpICsgJyBQcm9kdWN0aW9uIG1vZGUnKTtcbiAgfVxuICByZXR1cm4gc2V0dGluZztcbn1cblxuZnVuY3Rpb24gbWVyZ2VGcm9tWWFtbEpzb25GaWxlKHNldHRpbmc6IERyY3BTZXR0aW5ncywgbG9jYWxDb25maWdQYXRoOiBzdHJpbmcpIHtcbiAgaWYgKCFmcy5leGlzdHNTeW5jKGxvY2FsQ29uZmlnUGF0aCkpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhjeWFuKCdbY29uZmlnXScpICsgJyBGaWxlIGRvZXMgbm90IGV4aXN0OiAlcycsIGxvY2FsQ29uZmlnUGF0aCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBjb25zb2xlLmxvZyhjeWFuKCdbY29uZmlnXScpICsgYCBSZWFkICR7bG9jYWxDb25maWdQYXRofWApO1xuICAvLyB2YXIgcGFja2FnZTJDaHVuayA9IHNldHRpbmcuX3BhY2thZ2UyQ2h1bms7XG4gIHZhciBjb25maWdPYmo6IHtba2V5OiBzdHJpbmddOiBhbnl9O1xuXG4gIGNvbnN0IG1hdGNoZWQgPSAvXFwuKFteLl0rKSQvLmV4ZWMobG9jYWxDb25maWdQYXRoKTtcblxuICBsZXQgc3VmZml4ID0gbWF0Y2hlZCA/IG1hdGNoZWRbMV0gOiBudWxsO1xuICBpZiAoc3VmZml4ID09PSAneWFtbCcgfHwgc3VmZml4ID09PSAneW1sJykge1xuICAgIGNvbmZpZ09iaiA9IHlhbWxqcy5wYXJzZShmcy5yZWFkRmlsZVN5bmMobG9jYWxDb25maWdQYXRoLCAndXRmOCcpKTtcbiAgfSBlbHNlIGlmIChzdWZmaXggPT09ICdqc29uJykge1xuICAgIGNvbmZpZ09iaiA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKGxvY2FsQ29uZmlnUGF0aCkpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIF8uYXNzaWduV2l0aChzZXR0aW5nLCBjb25maWdPYmosIChvYmpWYWx1ZSwgc3JjVmFsdWUsIGtleSwgb2JqZWN0LCBzb3VyY2UpID0+IHtcbiAgICAvLyBpZiAoa2V5ID09PSAndmVuZG9yQnVuZGxlTWFwJykge1xuICAgIC8vICAgaWYgKCFfLmlzT2JqZWN0KG9ialZhbHVlKSB8fCAhXy5pc09iamVjdChzcmNWYWx1ZSkpXG4gICAgLy8gICAgIHJldHVybjtcbiAgICAvLyAgIF8uZWFjaChzcmNWYWx1ZSwgKHBhY2thZ2VMaXN0LCBjaHVuaykgPT4ge1xuICAgIC8vICAgICBpZiAoIV8uaXNBcnJheShwYWNrYWdlTGlzdCkpXG4gICAgLy8gICAgICAgcmV0dXJuO1xuICAgIC8vICAgICBmb3IgKGNvbnN0IHAgb2YgcGFja2FnZUxpc3QpIHtcbiAgICAvLyAgICAgICBwYWNrYWdlMkNodW5rW3BdID0gY2h1bms7XG4gICAgLy8gICAgIH1cbiAgICAvLyAgIH0pO1xuICAgIC8vIH0gZWxzZSBpZiAoa2V5ID09PSAnb3V0cHV0UGF0aE1hcCcpIHtcbiAgICAvLyAgIGlmICghb2JqVmFsdWUpXG4gICAgLy8gICAgIG9ialZhbHVlID0gb2JqZWN0Lm91dHB1dFBhdGhNYXAgPSB7fTtcbiAgICAvLyAgIHJldHVybiBfLmFzc2lnbihvYmpWYWx1ZSwgc3JjVmFsdWUpO1xuICAgIC8vIH0gZWxzZSBcbiAgICBpZiAoXy5pc09iamVjdChvYmpWYWx1ZSkgJiYgIUFycmF5LmlzQXJyYXkob2JqVmFsdWUpKSB7XG4gICAgICAvLyBXZSBvbmx5IG1lcmdlIDJuZCBsZXZlbCBwcm9wZXJ0aWVzXG4gICAgICByZXR1cm4gXy5hc3NpZ24ob2JqVmFsdWUsIHNyY1ZhbHVlKTtcbiAgICB9XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBtZXJnZUZyb21DbGlBcmdzKHNldHRpbmc6IERyY3BTZXR0aW5ncywgY2xpT3B0OiBDbGlPcHRpb25zKSB7XG4gIGlmICghY2xpT3B0LnByb3ApXG4gICAgcmV0dXJuO1xuICBmb3IgKGxldCBwcm9wUGFpciBvZiBjbGlPcHQucHJvcCkge1xuICAgIGNvbnN0IHByb3BTZXQgPSBwcm9wUGFpci5zcGxpdCgnPScpO1xuICAgIGxldCBwcm9wUGF0aCA9IHByb3BTZXRbMF07XG4gICAgaWYgKF8uc3RhcnRzV2l0aChwcm9wU2V0WzBdLCAnWycpKVxuICAgICAgcHJvcFBhdGggPSBKU09OLnBhcnNlKHByb3BTZXRbMF0pO1xuICAgIGxldCB2YWx1ZTtcbiAgICB0cnkge1xuICAgICAgdmFsdWUgPSBKU09OLnBhcnNlKHByb3BTZXRbMV0pO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHZhbHVlID0gcHJvcFNldFsxXSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBwcm9wU2V0WzFdO1xuICAgIH1cbiAgICBfLnNldChzZXR0aW5nLCBwcm9wUGF0aCwgdmFsdWUpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGBbY29uZmlnXSBzZXQgJHtwcm9wUGF0aH0gPSAke3ZhbHVlfWApO1xuICB9XG59XG5cbmNvbmZpZy53ZmhTcmNQYXRoID0gd2ZoU3JjUGF0aDtcblxuZnVuY3Rpb24gd2ZoU3JjUGF0aCgpIHtcbiAgdmFyIHdmaFBhdGggPSBQYXRoLmRpcm5hbWUocmVxdWlyZS5yZXNvbHZlKCdkci1jb21wLXBhY2thZ2UvcGFja2FnZS5qc29uJykpO1xuICAvLyBsb2cuZGVidWcoJ3dmaFBhdGg6ICVzJywgd2ZoUGF0aCk7XG4gIC8vIHJldHVybiAoUGF0aC5iYXNlbmFtZShQYXRoLmRpcm5hbWUod2ZoUGF0aCkpICE9PSAnbm9kZV9tb2R1bGVzJykgPyB3ZmhQYXRoIDogZmFsc2U7XG4gIHJldHVybiB3ZmhQYXRoO1xufVxuXG5mdW5jdGlvbiB2YWxpZGF0ZUNvbmZpZygpIHtcbiAgaWYgKCFzZXR0aW5nLm5vZGVSb3V0ZVBhdGgpIHtcbiAgICBjb25zb2xlLmVycm9yKCdbY29uZmlnIGVycm9yXTogJyArICgnXCJub2RlUm91dGVQYXRoXCIgbXVzdCBiZSBzZXQgaW4gY29uZmlnLnlhbWwnKSk7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGNvbmZpZ3VyYXRpb24nKTtcbiAgfVxuXG4gIFsnc3RhdGljQXNzZXRzVVJMJyxcbiAgICAnbm9kZVJvdXRlUGF0aCcsXG4gICAgJ2NvbXBpbGVkRGlyJ10uZm9yRWFjaChmdW5jdGlvbihwcm9wKSB7XG4gICAgICBzZXR0aW5nW3Byb3BdID0gdHJpbVRhaWxTbGFzaChzZXR0aW5nW3Byb3BdKTtcbiAgICB9KTtcblxuICB2YXIgY29udGV4dE1hcHBpbmcgPSBzZXR0aW5nLnBhY2thZ2VDb250ZXh0UGF0aE1hcHBpbmc7XG4gIGlmIChjb250ZXh0TWFwcGluZykge1xuICAgIF8uZm9yT3duKGNvbnRleHRNYXBwaW5nLCBmdW5jdGlvbihwYXRoLCBrZXkpIHtcbiAgICAgIGNvbnRleHRNYXBwaW5nW2tleV0gPSB0cmltVGFpbFNsYXNoKHBhdGgpO1xuICAgIH0pO1xuICB9XG59XG5cbmZ1bmN0aW9uIHRyaW1UYWlsU2xhc2godXJsOiBzdHJpbmcpIHtcbiAgaWYgKHVybCA9PT0gJy8nKSB7XG4gICAgcmV0dXJuIHVybDtcbiAgfVxuICByZXR1cm4gXy5lbmRzV2l0aCh1cmwsICcvJykgPyB1cmwuc3Vic3RyaW5nKDAsIHVybC5sZW5ndGggLSAxKSA6IHVybDtcbn1cblxuZnVuY3Rpb24gbm9ybWFsaXplUG9ydCh2YWw6IHN0cmluZyB8IG51bWJlcikge1xuICBsZXQgcG9ydDogbnVtYmVyID0gdHlwZW9mIHZhbCA9PT0gJ3N0cmluZycgPyBwYXJzZUludCh2YWwsIDEwKSA6IHZhbDtcblxuICBpZiAoaXNOYU4ocG9ydCkpIHtcbiAgICAvLyBuYW1lZCBwaXBlXG4gICAgcmV0dXJuIHZhbDtcbiAgfVxuXG4gIGlmIChwb3J0ID49IDApIHtcbiAgICAvLyBwb3J0IG51bWJlclxuICAgIHJldHVybiBwb3J0O1xuICB9XG5cbiAgcmV0dXJuIDgwODA7XG59XG5leHBvcnQgPSAoY29uZmlnIGFzIERyY3BDb25maWcpO1xuIl19