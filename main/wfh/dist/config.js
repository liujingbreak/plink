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
    localConfigPath = argv.config.length > 0 ? argv.config : [path_1.default.join(distDir, 'config.local.yaml')];
    const res = yield load();
    initResolve(res);
    return res;
});
config.initSync = (_argv) => {
    argv = _argv;
    localConfigPath = argv.config.length > 0 ? argv.config : [path_1.default.join(distDir, 'config.local.yaml')];
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
        console.log(cyan('[config]') + ' File does not exist: %s', localConfigPath);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQkFBK0I7QUFDL0IsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDNUIsb0RBQXVCO0FBQ3ZCLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsa0RBQTBCO0FBQzFCLHFEQUEyRjtBQUUzRix1REFBZ0Q7QUFFaEQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2pDLE1BQU0sRUFBQyxPQUFPLEVBQUUsT0FBTyxFQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQVEsQ0FBYSxDQUFDO0FBRXhFLE1BQU0sRUFBQyxJQUFJLEVBQUMsR0FBRyxlQUFLLENBQUM7QUFFckIsSUFBSSxJQUE0QixDQUFDO0FBRWpDLElBQUksUUFBMEIsQ0FBQztBQUMvQixJQUFJLFFBQVEsR0FBRyxPQUFPLENBQUM7QUFFdkIsSUFBSSxPQUFxQixDQUFDO0FBRTFCLElBQUksZUFBeUIsQ0FBQztBQUU3QixPQUFlLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztBQUUvQixTQUFTLEtBQUs7SUFDWixJQUFJLE9BQU8sRUFBRSxNQUFNLENBQUM7SUFDcEIsSUFBSSxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUM7UUFDeEIsT0FBTyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2QixNQUFNLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3hCLENBQUMsQ0FBQyxDQUFDO0lBQ0gsT0FBTztRQUNMLE9BQU87UUFDUCxNQUFNO1FBQ04sT0FBTztLQUNSLENBQUM7QUFDSixDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILE1BQU0sTUFBTSxHQUF3QixHQUFpQixFQUFFO0lBQ3JELE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUMsQ0FB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QUFJLENBQUMsRUFBRTtRQUNmLGFBQWE7UUFDYixPQUFPLEdBQUcsQ0FBQztLQUNaO0lBRUQsSUFBSSxJQUFJLElBQUksQ0FBQyxFQUFFO1FBQ2IsY0FBYztRQUNkLE9BQU8sSUFBSSxDQUFDO0tBQ2I7SUFFRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUM7QUFDRCxpQkFBVSxNQUFxQixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdHNsaW50OmRpc2FibGU6IHByZWZlci1jb25zdFxucmVxdWlyZSgneWFtbGlmeS9yZWdpc3RlcicpO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQge0NvbmZpZ0hhbmRsZXJNZ3IsIERyY3BTZXR0aW5ncywgRHJjcENvbmZpZywgQ29uZmlnSGFuZGxlcn0gZnJvbSAnLi9jb25maWctaGFuZGxlcic7XG5pbXBvcnQge0dsb2JhbE9wdGlvbnMgYXMgQ2xpT3B0aW9uc30gZnJvbSAnLi9jbWQvdHlwZXMnO1xuaW1wb3J0IHtnZXRMYW5JUHY0fSBmcm9tICcuL3V0aWxzL25ldHdvcmstdXRpbCc7XG5pbXBvcnQge1BsaW5rRW52fSBmcm9tICcuL25vZGUtcGF0aCc7XG5jb25zdCB5YW1sanMgPSByZXF1aXJlKCd5YW1sanMnKTtcbmNvbnN0IHtkaXN0RGlyLCByb290RGlyfSA9IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluayEpIGFzIFBsaW5rRW52O1xuXG5jb25zdCB7Y3lhbn0gPSBjaGFsaztcblxubGV0IGFyZ3Y6IENsaU9wdGlvbnMgfCB1bmRlZmluZWQ7XG5cbmxldCBoYW5kbGVyczogQ29uZmlnSGFuZGxlck1ncjtcbmxldCByb290UGF0aCA9IHJvb3REaXI7XG5cbmxldCBzZXR0aW5nOiBEcmNwU2V0dGluZ3M7XG5cbmxldCBsb2NhbENvbmZpZ1BhdGg6IHN0cmluZ1tdO1xuXG4oUHJvbWlzZSBhcyBhbnkpLmRlZmVyID0gZGVmZXI7XG5cbmZ1bmN0aW9uIGRlZmVyKCkge1xuICB2YXIgcmVzb2x2ZSwgcmVqZWN0O1xuICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKCkge1xuICAgIHJlc29sdmUgPSBhcmd1bWVudHNbMF07XG4gICAgcmVqZWN0ID0gYXJndW1lbnRzWzFdO1xuICB9KTtcbiAgcmV0dXJuIHtcbiAgICByZXNvbHZlLFxuICAgIHJlamVjdCxcbiAgICBwcm9taXNlXG4gIH07XG59XG5cbi8qKlxuICogcmVhZCBhbmQgcmV0dXJuIGNvbmZpZ3VyYXRpb25cbiAqIEBuYW1lIGNvbmZpZ1xuICogQHJldHVybiB7b2JqZWN0fSBzZXR0aW5nXG4gKi9cbmNvbnN0IGNvbmZpZzogUGFydGlhbDxEcmNwQ29uZmlnPiA9ICgpOiBEcmNwU2V0dGluZ3MgPT4ge1xuICByZXR1cm4gc2V0dGluZztcbn07XG5cbmxldCBpbml0UmVzb2x2ZTogKHZhbHVlOiBEcmNwU2V0dGluZ3MpID0+IHZvaWQ7XG5jb25maWcuZG9uZSA9IG5ldyBQcm9taXNlPERyY3BTZXR0aW5ncz4ocmVzb2x2ZSA9PiB7XG4gIGluaXRSZXNvbHZlID0gcmVzb2x2ZTtcbn0pO1xuXG5jb25maWcuaW5pdCA9IGFzeW5jIChfYXJndjogQ2xpT3B0aW9ucykgPT4ge1xuICBhcmd2ID0gX2FyZ3Y7XG4gIGxvY2FsQ29uZmlnUGF0aCA9IGFyZ3YuY29uZmlnLmxlbmd0aCA+IDAgPyBhcmd2LmNvbmZpZyA6IFtQYXRoLmpvaW4oZGlzdERpciwgJ2NvbmZpZy5sb2NhbC55YW1sJyldO1xuICBjb25zdCByZXMgPSBhd2FpdCBsb2FkKCk7XG4gIGluaXRSZXNvbHZlKHJlcyk7XG4gIHJldHVybiByZXM7XG59O1xuXG5jb25maWcuaW5pdFN5bmMgPSAoX2FyZ3Y6IENsaU9wdGlvbnMpID0+IHtcbiAgYXJndiA9IF9hcmd2O1xuICBsb2NhbENvbmZpZ1BhdGggPSBhcmd2LmNvbmZpZy5sZW5ndGggPiAwID8gYXJndi5jb25maWcgOiBbUGF0aC5qb2luKGRpc3REaXIsICdjb25maWcubG9jYWwueWFtbCcpXTtcbiAgY29uc3QgcmVzID0gbG9hZFN5bmMoKTtcbiAgcmV0dXJuIHJlcztcbn07XG5cblxuY29uZmlnLnJlbG9hZCA9IGZ1bmN0aW9uIHJlbG9hZCgpIHtcbiAgc2V0dGluZyA9IHt9IGFzIERyY3BTZXR0aW5ncztcbiAgcmV0dXJuIGxvYWQoKTtcbn07XG5cbmNvbmZpZy5zZXQgPSBmdW5jdGlvbihwYXRoOiBzdHJpbmcsIHZhbHVlOiBhbnkpIHtcbiAgXy5zZXQoc2V0dGluZywgcGF0aCwgdmFsdWUpO1xuICByZXR1cm4gc2V0dGluZztcbn07XG5cbmNvbmZpZy5nZXQgPSBmdW5jdGlvbihwcm9wUGF0aDogc3RyaW5nLCBkZWZhdWx0VmFsdWU6IGFueSkge1xuICByZXR1cm4gXy5nZXQoc2V0dGluZywgcHJvcFBhdGgsIGRlZmF1bHRWYWx1ZSk7XG59O1xuXG5jb25maWcuc2V0RGVmYXVsdCA9IGZ1bmN0aW9uKHByb3BQYXRoOiBzdHJpbmcsIHZhbHVlOiBhbnkpIHtcbiAgaWYgKCFfLmhhcyhzZXR0aW5nLCBwcm9wUGF0aCkpIHtcbiAgICBfLnNldChzZXR0aW5nLCBwcm9wUGF0aCwgdmFsdWUpO1xuICB9XG4gIHJldHVybiBzZXR0aW5nO1xufTtcblxuLyoqXG4gKiBSZXNvbHZlIGEgcGF0aCBiYXNlZCBvbiBgcm9vdFBhdGhgXG4gKiBAbmFtZSByZXNvbHZlXG4gKiBAbWVtYmVyb2YgY29uZmlnXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHByb3BlcnR5IG5hbWUgb3IgcHJvcGVydHkgcGF0aCwgbGlrZSBcIm5hbWVcIiwgXCJuYW1lLmNoaWxkUHJvcFsxXVwiXG4gKiBAcmV0dXJuIHtzdHJpbmd9ICAgICBhYnNvbHV0ZSBwYXRoXG4gKi9cbmNvbmZpZy5yZXNvbHZlID0gZnVuY3Rpb24ocGF0aFByb3BOYW1lOiAnZGVzdERpcid8J3N0YXRpY0Rpcid8J3NlcnZlckRpcicsIC4uLnBhdGhzOiBzdHJpbmdbXSkge1xuICBjb25zdCBhcmdzID0gW3Jvb3RQYXRoLCBfLmdldChzZXR0aW5nLCBwYXRoUHJvcE5hbWUpLCAuLi5wYXRoc107XG4gIHJldHVybiBQYXRoLnJlc29sdmUoLi4uYXJncyk7XG59O1xuXG5jb25maWcubG9hZCA9IGxvYWQ7XG5cbmNvbmZpZy5jb25maWdIYW5kbGVyTWdyID0gKCkgPT4gaGFuZGxlcnM7XG4vKipcbiAqIExvYWQgY29uZmlndXJhdGlvbiBmcm9tIGNvbmZpZy55YW1sLlxuICogQmVzaWRlcyB0aG9zZSBwcm9wZXJ0aWVzIGluIGNvbmZpZy55YW1sLCB0aGVyZSBhcmUgZXh0cmEgYXZhaWxhYmxlIHByb3BlcnRpZXM6XG4gKiAtIHJvb3RQYXRoIHtzdHJpbmd9IHJvb3QgcGF0aCwgbm9ybWFsbHkgaXQgaXMgaWRlbnRpY2FsIGFzIHByb2Nlc3MuY3dkKClcbiAqIFx0cmVzb2x2ZWQgdG8gcmVsYXRpdmUgcGF0aCB0byB0aGlzIHBsYXRmb3JtIHBhY2thZ2UgZm9sZGVyLCBldmVuIGl0IGlzIHVuZGVyIG5vZGVfbW9kdWxlc1xuICogXHRmb2xkZXIgbG9hZGVkIGFzIGRlcGVuZGVuY3lcbiAqIC0gcHJvamVjdExpc3RcbiAqIC0gbm9kZVBhdGggPHdvcmtzcGFjZT4vbm9kZV9tb2R1bGVzXG4gKiAtIHdmaFNyY1BhdGggbWVhbmluZyB3Zmggc291cmNlIGNvZGUgaXMgbGlua2VkLCBpdCBpcyBub3QgaW5zdGFsbGVkXG4gKiAtIF9wYWNrYWdlMkNodW5rIGEgaGFzaCBvYmplY3Qgd2hvc2Uga2V5IGlzIGBwYWNrYWdlIG5hbWVgLCB2YWx1ZSBpcyBgY2h1bmsgbmFtZWBcbiAqL1xuYXN5bmMgZnVuY3Rpb24gbG9hZChmaWxlTGlzdD86IHN0cmluZ1tdLCBjbGlPcHRpb24/OiBDbGlPcHRpb25zKTogUHJvbWlzZTxEcmNwU2V0dGluZ3M+IHtcbiAgbGV0IGNsaU9wdCA9IGNsaU9wdGlvbiA9PSBudWxsID8gYXJndiEgOiBjbGlPcHRpb247XG4gIGNvbnN0IGNvbmZpZ0ZpbGVMaXN0ID0gcHJlcGFyZUNvbmZpZ0ZpbGVzKGZpbGVMaXN0LCBjbGlPcHRpb24pO1xuXG4gIGhhbmRsZXJzID0gbmV3IENvbmZpZ0hhbmRsZXJNZ3IoY29uZmlnRmlsZUxpc3QuZmlsdGVyKG5hbWUgPT4gL1xcLlt0al1zJC8udGVzdChuYW1lKSkpO1xuXG4gIGF3YWl0IGhhbmRsZXJzLnJ1bkVhY2g8Q29uZmlnSGFuZGxlcj4oKF9maWxlLCBvYmosIGhhbmRsZXIpID0+IHtcbiAgICBpZiAoaGFuZGxlci5vbkNvbmZpZylcbiAgICAgIHJldHVybiBoYW5kbGVyLm9uQ29uZmlnKG9iaiB8fCBzZXR0aW5nLCBjbGlPcHQpO1xuICB9KTtcbiAgcmV0dXJuIHBvc3RQcm9jZXNzQ29uZmlnKGNsaU9wdCk7XG59XG5cbmZ1bmN0aW9uIGxvYWRTeW5jKGZpbGVMaXN0Pzogc3RyaW5nW10sIGNsaU9wdGlvbj86IENsaU9wdGlvbnMpOiBEcmNwU2V0dGluZ3Mge1xuICBsZXQgY2xpT3B0ID0gY2xpT3B0aW9uID09IG51bGwgPyBhcmd2ISA6IGNsaU9wdGlvbjtcbiAgY29uc3QgY29uZmlnRmlsZUxpc3QgPSBwcmVwYXJlQ29uZmlnRmlsZXMoZmlsZUxpc3QsIGNsaU9wdGlvbik7XG5cbiAgaGFuZGxlcnMgPSBuZXcgQ29uZmlnSGFuZGxlck1ncihjb25maWdGaWxlTGlzdC5maWx0ZXIobmFtZSA9PiAvXFwuW3RqXXMkLy50ZXN0KG5hbWUpKSk7XG5cbiAgaGFuZGxlcnMucnVuRWFjaFN5bmM8Q29uZmlnSGFuZGxlcj4oKF9maWxlLCBvYmosIGhhbmRsZXIpID0+IHtcbiAgICBpZiAoaGFuZGxlci5vbkNvbmZpZylcbiAgICAgIHJldHVybiBoYW5kbGVyLm9uQ29uZmlnKG9iaiB8fCBzZXR0aW5nLCBjbGlPcHQpO1xuICB9KTtcbiAgcmV0dXJuIHBvc3RQcm9jZXNzQ29uZmlnKGNsaU9wdCk7XG59XG5cbmZ1bmN0aW9uIHByZXBhcmVDb25maWdGaWxlcyhmaWxlTGlzdD86IHN0cmluZ1tdLCBjbGlPcHRpb24/OiBDbGlPcHRpb25zKSB7XG4gIGlmIChmaWxlTGlzdClcbiAgICBsb2NhbENvbmZpZ1BhdGggPSBmaWxlTGlzdDtcblxuICAvLyBsb2cuZGVidWcoJ3Jvb3QgUGF0aDogJyArIHJvb3RQYXRoKTtcbiAgc2V0dGluZyA9IHNldHRpbmcgfHwge307XG4gIHNldHRpbmcuZGVzdERpciA9IGRpc3REaXI7XG4gIHNldHRpbmcuc3RhdGljRGlyID0gUGF0aC5yZXNvbHZlKGRpc3REaXIsICdzdGF0aWMnKTtcbiAgc2V0dGluZy5kbGxEZXN0RGlyID0gUGF0aC5yZXNvbHZlKGRpc3REaXIsICdkbGwnKTtcbiAgLy8gc2V0dGluZy5wcm9qZWN0TGlzdCA9IFtdO1xuICAvLyBzb21lIGV4dHJhIGNvbmZpZyBwcm9wZXJ0aWVzXG4gIGNvbnN0IGluaXRTZXR0aW5nOiBQYXJ0aWFsPERyY3BTZXR0aW5ncz4gPSB7XG4gICAgcm9vdFBhdGgsXG4gICAgd2ZoU3JjUGF0aDogd2ZoU3JjUGF0aCgpLFxuICAgIGRldk1vZGU6IGNsaU9wdGlvbiA9PSBudWxsIHx8ICFjbGlPcHRpb24ucHJvZHVjdGlvblxuICB9O1xuICBfLmFzc2lnbihzZXR0aW5nLCBpbml0U2V0dGluZyk7XG4gIC8vIGNvbnNvbGUubG9nKHNldHRpbmcpO1xuICAvLyBNZXJnZSBmcm9tIDxyb290Pi9jb25maWcueWFtbFxuICB2YXIgY29uZmlnRmlsZUxpc3QgPSBbXG4gICAgUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uJywgJ2NvbmZpZy55YW1sJylcbiAgXTtcbiAgdmFyIHJvb3RDb25maWcgPSBQYXRoLmpvaW4oZGlzdERpciwgJ2NvbmZpZy55YW1sJyk7XG4gIGlmIChmcy5leGlzdHNTeW5jKHJvb3RDb25maWcpKVxuICAgIGNvbmZpZ0ZpbGVMaXN0LnB1c2gocm9vdENvbmZpZyk7XG5cbiAgY29uZmlnRmlsZUxpc3QucHVzaCguLi5sb2NhbENvbmZpZ1BhdGgpO1xuXG4gIGNvbmZpZ0ZpbGVMaXN0LmZvckVhY2gobG9jYWxDb25maWdQYXRoID0+IG1lcmdlRnJvbVlhbWxKc29uRmlsZShzZXR0aW5nLCBsb2NhbENvbmZpZ1BhdGgpKTtcblxuICByZXR1cm4gY29uZmlnRmlsZUxpc3Q7XG59XG5cbmZ1bmN0aW9uIHBvc3RQcm9jZXNzQ29uZmlnKGNsaU9wdDogQ2xpT3B0aW9ucykge1xuICB2YWxpZGF0ZUNvbmZpZygpO1xuXG4gIHNldHRpbmcucG9ydCA9IG5vcm1hbGl6ZVBvcnQoc2V0dGluZy5wb3J0KTtcblxuICBpZiAoIXNldHRpbmcuZGV2TW9kZSlcbiAgICBwcm9jZXNzLmVudi5OT0RFX0VOViA9ICdwcm9kdWN0aW9uJztcbiAgc2V0dGluZy5wdWJsaWNQYXRoID0gXy50cmltRW5kKHNldHRpbmcuc3RhdGljQXNzZXRzVVJMIHx8ICcnLCAnLycpICsgJy8nOyAvLyBhbHdheXMgZW5kcyB3aXRoIC9cbiAgc2V0dGluZy5sb2NhbElQID0gZ2V0TGFuSVB2NCgpO1xuXG4gIG1lcmdlRnJvbUNsaUFyZ3Moc2V0dGluZywgY2xpT3B0KTtcbiAgaWYgKHNldHRpbmcuZGV2TW9kZSkge1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGN5YW4oJ1tjb25maWddJykgKyAnIERldmVsb3BtZW50IG1vZGUnKTtcbiAgfSBlbHNlIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhjeWFuKCdbY29uZmlnXScpICsgJyBQcm9kdWN0aW9uIG1vZGUnKTtcbiAgfVxuICByZXR1cm4gc2V0dGluZztcbn1cblxuZnVuY3Rpb24gbWVyZ2VGcm9tWWFtbEpzb25GaWxlKHNldHRpbmc6IERyY3BTZXR0aW5ncywgbG9jYWxDb25maWdQYXRoOiBzdHJpbmcpIHtcbiAgaWYgKCFmcy5leGlzdHNTeW5jKGxvY2FsQ29uZmlnUGF0aCkpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhjeWFuKCdbY29uZmlnXScpICsgJyBGaWxlIGRvZXMgbm90IGV4aXN0OiAlcycsIGxvY2FsQ29uZmlnUGF0aCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBjb25zb2xlLmxvZyhjeWFuKCdbY29uZmlnXScpICsgYCBSZWFkICR7bG9jYWxDb25maWdQYXRofWApO1xuICB2YXIgY29uZmlnT2JqOiB7W2tleTogc3RyaW5nXTogYW55fTtcblxuICBjb25zdCBtYXRjaGVkID0gL1xcLihbXi5dKykkLy5leGVjKGxvY2FsQ29uZmlnUGF0aCk7XG5cbiAgbGV0IHN1ZmZpeCA9IG1hdGNoZWQgPyBtYXRjaGVkWzFdIDogbnVsbDtcbiAgaWYgKHN1ZmZpeCA9PT0gJ3lhbWwnIHx8IHN1ZmZpeCA9PT0gJ3ltbCcpIHtcbiAgICBjb25maWdPYmogPSB5YW1sanMucGFyc2UoZnMucmVhZEZpbGVTeW5jKGxvY2FsQ29uZmlnUGF0aCwgJ3V0ZjgnKSk7XG4gIH0gZWxzZSBpZiAoc3VmZml4ID09PSAnanNvbicpIHtcbiAgICBjb25maWdPYmogPSByZXF1aXJlKFBhdGgucmVzb2x2ZShsb2NhbENvbmZpZ1BhdGgpKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBfLmFzc2lnbldpdGgoc2V0dGluZywgY29uZmlnT2JqLCAob2JqVmFsdWUsIHNyY1ZhbHVlLCBrZXksIG9iamVjdCwgc291cmNlKSA9PiB7XG4gICAgaWYgKF8uaXNPYmplY3Qob2JqVmFsdWUpICYmICFBcnJheS5pc0FycmF5KG9ialZhbHVlKSkge1xuICAgICAgLy8gV2Ugb25seSBtZXJnZSAybmQgbGV2ZWwgcHJvcGVydGllc1xuICAgICAgcmV0dXJuIF8uYXNzaWduKG9ialZhbHVlLCBzcmNWYWx1ZSk7XG4gICAgfVxuICB9KTtcbn1cblxuZnVuY3Rpb24gbWVyZ2VGcm9tQ2xpQXJncyhzZXR0aW5nOiBEcmNwU2V0dGluZ3MsIGNsaU9wdDogQ2xpT3B0aW9ucykge1xuICBpZiAoIWNsaU9wdC5wcm9wKVxuICAgIHJldHVybjtcbiAgZm9yIChsZXQgcHJvcFBhaXIgb2YgY2xpT3B0LnByb3ApIHtcbiAgICBjb25zdCBwcm9wU2V0ID0gcHJvcFBhaXIuc3BsaXQoJz0nKTtcbiAgICBsZXQgcHJvcFBhdGggPSBwcm9wU2V0WzBdO1xuICAgIGlmIChfLnN0YXJ0c1dpdGgocHJvcFNldFswXSwgJ1snKSlcbiAgICAgIHByb3BQYXRoID0gSlNPTi5wYXJzZShwcm9wU2V0WzBdKTtcbiAgICBsZXQgdmFsdWU7XG4gICAgdHJ5IHtcbiAgICAgIHZhbHVlID0gSlNPTi5wYXJzZShwcm9wU2V0WzFdKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB2YWx1ZSA9IHByb3BTZXRbMV0gPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogcHJvcFNldFsxXTtcbiAgICB9XG4gICAgXy5zZXQoc2V0dGluZywgcHJvcFBhdGgsIHZhbHVlKTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhgW2NvbmZpZ10gc2V0ICR7cHJvcFBhdGh9ID0gJHt2YWx1ZX1gKTtcbiAgfVxufVxuXG5jb25maWcud2ZoU3JjUGF0aCA9IHdmaFNyY1BhdGg7XG5cbmZ1bmN0aW9uIHdmaFNyY1BhdGgoKSB7XG4gIHZhciB3ZmhQYXRoID0gUGF0aC5kaXJuYW1lKHJlcXVpcmUucmVzb2x2ZSgnQHdmaC9wbGluay9wYWNrYWdlLmpzb24nKSk7XG4gIC8vIGxvZy5kZWJ1Zygnd2ZoUGF0aDogJXMnLCB3ZmhQYXRoKTtcbiAgLy8gcmV0dXJuIChQYXRoLmJhc2VuYW1lKFBhdGguZGlybmFtZSh3ZmhQYXRoKSkgIT09ICdub2RlX21vZHVsZXMnKSA/IHdmaFBhdGggOiBmYWxzZTtcbiAgcmV0dXJuIHdmaFBhdGg7XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlQ29uZmlnKCkge1xuICBpZiAoIXNldHRpbmcubm9kZVJvdXRlUGF0aCkge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1tjb25maWcgZXJyb3JdOiAnICsgKCdcIm5vZGVSb3V0ZVBhdGhcIiBtdXN0IGJlIHNldCBpbiBjb25maWcueWFtbCcpKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY29uZmlndXJhdGlvbicpO1xuICB9XG5cbiAgWydzdGF0aWNBc3NldHNVUkwnLFxuICAgICdub2RlUm91dGVQYXRoJyxcbiAgICAnY29tcGlsZWREaXInXS5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcbiAgICAgIHNldHRpbmdbcHJvcF0gPSB0cmltVGFpbFNsYXNoKHNldHRpbmdbcHJvcF0pO1xuICAgIH0pO1xuXG4gIHZhciBjb250ZXh0TWFwcGluZyA9IHNldHRpbmcucGFja2FnZUNvbnRleHRQYXRoTWFwcGluZztcbiAgaWYgKGNvbnRleHRNYXBwaW5nKSB7XG4gICAgXy5mb3JPd24oY29udGV4dE1hcHBpbmcsIGZ1bmN0aW9uKHBhdGgsIGtleSkge1xuICAgICAgY29udGV4dE1hcHBpbmdba2V5XSA9IHRyaW1UYWlsU2xhc2gocGF0aCk7XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdHJpbVRhaWxTbGFzaCh1cmw6IHN0cmluZykge1xuICBpZiAodXJsID09PSAnLycpIHtcbiAgICByZXR1cm4gdXJsO1xuICB9XG4gIHJldHVybiBfLmVuZHNXaXRoKHVybCwgJy8nKSA/IHVybC5zdWJzdHJpbmcoMCwgdXJsLmxlbmd0aCAtIDEpIDogdXJsO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVQb3J0KHZhbDogc3RyaW5nIHwgbnVtYmVyKSB7XG4gIGxldCBwb3J0OiBudW1iZXIgPSB0eXBlb2YgdmFsID09PSAnc3RyaW5nJyA/IHBhcnNlSW50KHZhbCwgMTApIDogdmFsO1xuXG4gIGlmIChpc05hTihwb3J0KSkge1xuICAgIC8vIG5hbWVkIHBpcGVcbiAgICByZXR1cm4gdmFsO1xuICB9XG5cbiAgaWYgKHBvcnQgPj0gMCkge1xuICAgIC8vIHBvcnQgbnVtYmVyXG4gICAgcmV0dXJuIHBvcnQ7XG4gIH1cblxuICByZXR1cm4gODA4MDtcbn1cbmV4cG9ydCA9IChjb25maWcgYXMgRHJjcENvbmZpZyk7XG4iXX0=