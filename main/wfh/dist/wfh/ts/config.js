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
        if (fileList)
            localConfigPath = fileList;
        let cliOpt = cliOption == null ? argv : cliOption;
        try {
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
            handlers = new config_handler_1.ConfigHandlerMgr(configFileList.filter(name => /\.[tj]s$/.test(name)));
            yield handlers.runEach((_file, obj, handler) => {
                if (handler.onConfig)
                    return handler.onConfig(obj || setting, cliOpt);
            });
            if (setting.recipeFolder) {
                setting.recipeFolderPath = path_1.default.resolve(rootPath, setting.recipeFolder);
            }
            validateConfig();
            // var defaultEntrySet = setting.defaultEntrySet = {};
            // if (setting.defaultEntryPackages) {
            //   [].concat(setting.defaultEntryPackages).forEach(function(entryFile) {
            //     defaultEntrySet[entryFile] = true;
            //   });
            // }
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
        catch (err) {
            console.error(__filename + ' failed to read config files', err.stack);
            throw err;
        }
    });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vdHMvY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQkFBK0I7QUFDL0Isb0RBQXVCO0FBQ3ZCLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsa0RBQTBCO0FBQzFCLHFEQUEyRjtBQUUzRix1REFBZ0Q7QUFDaEQsdUNBQXdDO0FBQ3hDLHlEQUF5RDtBQUN6RCw0REFBNEQ7QUFFNUQsTUFBTSxFQUFDLElBQUksRUFBQyxHQUFHLGVBQUssQ0FBQztBQUNyQixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDakMsSUFBSSxJQUE0QixDQUFDO0FBQ2pDLG9DQUFvQztBQUNwQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUM1Qiw0Q0FBNEM7QUFDNUMsSUFBSSxRQUEwQixDQUFDO0FBQy9CLElBQUksUUFBUSxHQUFHLGlCQUFVLEVBQUUsQ0FBQztBQUU1QixJQUFJLE9BQXFCLENBQUM7QUFDMUIsNkJBQTZCO0FBQzdCLElBQUksZUFBeUIsQ0FBQztBQUU3QixPQUFlLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztBQUUvQixTQUFTLEtBQUs7SUFDWixJQUFJLE9BQU8sRUFBRSxNQUFNLENBQUM7SUFDcEIsSUFBSSxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUM7UUFDeEIsT0FBTyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2QixNQUFNLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3hCLENBQUMsQ0FBQyxDQUFDO0lBQ0gsT0FBTztRQUNMLE9BQU87UUFDUCxNQUFNO1FBQ04sT0FBTztLQUNSLENBQUM7QUFDSixDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILE1BQU0sTUFBTSxHQUF3QixHQUFpQixFQUFFO0lBQ3JELE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUMsQ0FBQztBQUVG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LENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUN2RSxDQUFDO0FBRUQsU0FBUyxhQUFhLENBQUMsR0FBb0I7SUFDekMsSUFBSSxJQUFJLEdBQVcsT0FBTyxHQUFHLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7SUFFckUsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDZixhQUFhO1FBQ2IsT0FBTyxHQUFHLENBQUM7S0FDWjtJQUVELElBQUksSUFBSSxJQUFJLENBQUMsRUFBRTtRQUNiLGNBQWM7UUFDZCxPQUFPLElBQUksQ0FBQztLQUNiO0lBRUQsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBQ0QsaUJBQVUsTUFBcUIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBwcmVmZXItY29uc3RcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHtDb25maWdIYW5kbGVyTWdyLCBEcmNwU2V0dGluZ3MsIERyY3BDb25maWcsIENvbmZpZ0hhbmRsZXJ9IGZyb20gJy4vY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IHtHbG9iYWxPcHRpb25zIGFzIENsaU9wdGlvbnN9IGZyb20gJy4vY21kL3R5cGVzJztcbmltcG9ydCB7Z2V0TGFuSVB2NH0gZnJvbSAnLi91dGlscy9uZXR3b3JrLXV0aWwnO1xuaW1wb3J0IHtnZXRSb290RGlyfSBmcm9tICcuL3V0aWxzL21pc2MnO1xuLy8gaW1wb3J0IHtnZXRTdG9yZSBhcyBnZXRQY2tTdG9yZX0gZnJvbSAnLi9wYWNrYWdlLW1ncic7XG4vLyBpbXBvcnQge21hcCwgZGlzdGluY3RVbnRpbENoYW5nZWR9IGZyb20gJ3J4anMvb3BlcmF0b3JzJztcblxuY29uc3Qge2N5YW59ID0gY2hhbGs7XG5jb25zdCB5YW1sanMgPSByZXF1aXJlKCd5YW1sanMnKTtcbmxldCBhcmd2OiBDbGlPcHRpb25zIHwgdW5kZWZpbmVkO1xuLy8gdmFyIGFyZ3YgPSByZXF1aXJlKCd5YXJncycpLmFyZ3Y7XG5yZXF1aXJlKCd5YW1saWZ5L3JlZ2lzdGVyJyk7XG4vLyB2YXIgcHVibGljUGF0aCA9IHJlcXVpcmUoJy4vcHVibGljUGF0aCcpO1xubGV0IGhhbmRsZXJzOiBDb25maWdIYW5kbGVyTWdyO1xubGV0IHJvb3RQYXRoID0gZ2V0Um9vdERpcigpO1xuXG5sZXQgc2V0dGluZzogRHJjcFNldHRpbmdzO1xuLy8gbGV0IGxvY2FsRGlzYWJsZWQgPSBmYWxzZTtcbmxldCBsb2NhbENvbmZpZ1BhdGg6IHN0cmluZ1tdO1xuXG4oUHJvbWlzZSBhcyBhbnkpLmRlZmVyID0gZGVmZXI7XG5cbmZ1bmN0aW9uIGRlZmVyKCkge1xuICB2YXIgcmVzb2x2ZSwgcmVqZWN0O1xuICB2YXIgcHJvbWlzZSA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uKCkge1xuICAgIHJlc29sdmUgPSBhcmd1bWVudHNbMF07XG4gICAgcmVqZWN0ID0gYXJndW1lbnRzWzFdO1xuICB9KTtcbiAgcmV0dXJuIHtcbiAgICByZXNvbHZlLFxuICAgIHJlamVjdCxcbiAgICBwcm9taXNlXG4gIH07XG59XG5cbi8qKlxuICogcmVhZCBhbmQgcmV0dXJuIGNvbmZpZ3VyYXRpb25cbiAqIEBuYW1lIGNvbmZpZ1xuICogQHJldHVybiB7b2JqZWN0fSBzZXR0aW5nXG4gKi9cbmNvbnN0IGNvbmZpZzogUGFydGlhbDxEcmNwQ29uZmlnPiA9ICgpOiBEcmNwU2V0dGluZ3MgPT4ge1xuICByZXR1cm4gc2V0dGluZztcbn07XG5cbmxldCBpbml0UmVzb2x2ZTogKHZhbHVlOiBEcmNwU2V0dGluZ3MpID0+IHZvaWQ7XG5jb25maWcuZG9uZSA9IG5ldyBQcm9taXNlPERyY3BTZXR0aW5ncz4ocmVzb2x2ZSA9PiB7XG4gIGluaXRSZXNvbHZlID0gcmVzb2x2ZTtcbn0pO1xuXG5jb25maWcuaW5pdCA9IGFzeW5jIChfYXJndjogQ2xpT3B0aW9ucykgPT4ge1xuICBhcmd2ID0gX2FyZ3Y7XG4gIGxvY2FsQ29uZmlnUGF0aCA9IGFyZ3YuY29uZmlnLmxlbmd0aCA+IDAgPyBhcmd2LmNvbmZpZyA6IFtQYXRoLmpvaW4ocm9vdFBhdGgsICdkaXN0JywgJ2NvbmZpZy5sb2NhbC55YW1sJyldO1xuICBjb25zdCByZXMgPSBhd2FpdCBsb2FkKCk7XG4gIGluaXRSZXNvbHZlKHJlcyk7XG4gIHJldHVybiByZXM7XG59O1xuXG5jb25maWcucmVsb2FkID0gZnVuY3Rpb24gcmVsb2FkKCkge1xuICBzZXR0aW5nID0ge30gYXMgRHJjcFNldHRpbmdzO1xuICByZXR1cm4gbG9hZCgpO1xufTtcblxuY29uZmlnLnNldCA9IGZ1bmN0aW9uKHBhdGg6IHN0cmluZywgdmFsdWU6IGFueSkge1xuICBfLnNldChzZXR0aW5nLCBwYXRoLCB2YWx1ZSk7XG4gIHJldHVybiBzZXR0aW5nO1xufTtcblxuY29uZmlnLmdldCA9IGZ1bmN0aW9uKHByb3BQYXRoOiBzdHJpbmcsIGRlZmF1bHRWYWx1ZTogYW55KSB7XG4gIHJldHVybiBfLmdldChzZXR0aW5nLCBwcm9wUGF0aCwgZGVmYXVsdFZhbHVlKTtcbn07XG5cbmNvbmZpZy5zZXREZWZhdWx0ID0gZnVuY3Rpb24ocHJvcFBhdGg6IHN0cmluZywgdmFsdWU6IGFueSkge1xuICBpZiAoIV8uaGFzKHNldHRpbmcsIHByb3BQYXRoKSkge1xuICAgIF8uc2V0KHNldHRpbmcsIHByb3BQYXRoLCB2YWx1ZSk7XG4gIH1cbiAgcmV0dXJuIHNldHRpbmc7XG59O1xuXG4vKipcbiAqIFJlc29sdmUgYSBwYXRoIGJhc2VkIG9uIGByb290UGF0aGBcbiAqIEBuYW1lIHJlc29sdmVcbiAqIEBtZW1iZXJvZiBjb25maWdcbiAqIEBwYXJhbSAge3N0cmluZ30gcHJvcGVydHkgbmFtZSBvciBwcm9wZXJ0eSBwYXRoLCBsaWtlIFwibmFtZVwiLCBcIm5hbWUuY2hpbGRQcm9wWzFdXCJcbiAqIEByZXR1cm4ge3N0cmluZ30gICAgIGFic29sdXRlIHBhdGhcbiAqL1xuY29uZmlnLnJlc29sdmUgPSBmdW5jdGlvbihwYXRoUHJvcE5hbWU6ICdkZXN0RGlyJ3wnc3RhdGljRGlyJ3wnc2VydmVyRGlyJywgLi4ucGF0aHM6IHN0cmluZ1tdKSB7XG4gIGNvbnN0IGFyZ3MgPSBbcm9vdFBhdGgsIF8uZ2V0KHNldHRpbmcsIHBhdGhQcm9wTmFtZSksIC4uLnBhdGhzXTtcbiAgcmV0dXJuIFBhdGgucmVzb2x2ZSguLi5hcmdzKTtcbn07XG5cbmNvbmZpZy5sb2FkID0gbG9hZDtcblxuY29uZmlnLmNvbmZpZ0hhbmRsZXJNZ3IgPSAoKSA9PiBoYW5kbGVycztcbi8qKlxuICogTG9hZCBjb25maWd1cmF0aW9uIGZyb20gY29uZmlnLnlhbWwuXG4gKiBCZXNpZGVzIHRob3NlIHByb3BlcnRpZXMgaW4gY29uZmlnLnlhbWwsIHRoZXJlIGFyZSBleHRyYSBhdmFpbGFibGUgcHJvcGVydGllczpcbiAqIC0gcm9vdFBhdGgge3N0cmluZ30gcm9vdCBwYXRoLCBub3JtYWxseSBpdCBpcyBpZGVudGljYWwgYXMgcHJvY2Vzcy5jd2QoKVxuICogXHRyZXNvbHZlZCB0byByZWxhdGl2ZSBwYXRoIHRvIHRoaXMgcGxhdGZvcm0gcGFja2FnZSBmb2xkZXIsIGV2ZW4gaXQgaXMgdW5kZXIgbm9kZV9tb2R1bGVzXG4gKiBcdGZvbGRlciBsb2FkZWQgYXMgZGVwZW5kZW5jeVxuICogLSBwcm9qZWN0TGlzdFxuICogLSBub2RlUGF0aCA8d29ya3NwYWNlPi9ub2RlX21vZHVsZXNcbiAqIC0gd2ZoU3JjUGF0aCBtZWFuaW5nIHdmaCBzb3VyY2UgY29kZSBpcyBsaW5rZWQsIGl0IGlzIG5vdCBpbnN0YWxsZWRcbiAqIC0gX3BhY2thZ2UyQ2h1bmsgYSBoYXNoIG9iamVjdCB3aG9zZSBrZXkgaXMgYHBhY2thZ2UgbmFtZWAsIHZhbHVlIGlzIGBjaHVuayBuYW1lYFxuICovXG5hc3luYyBmdW5jdGlvbiBsb2FkKGZpbGVMaXN0Pzogc3RyaW5nW10sIGNsaU9wdGlvbj86IENsaU9wdGlvbnMpOiBQcm9taXNlPERyY3BTZXR0aW5ncz4ge1xuICBpZiAoZmlsZUxpc3QpXG4gICAgbG9jYWxDb25maWdQYXRoID0gZmlsZUxpc3Q7XG5cbiAgbGV0IGNsaU9wdCA9IGNsaU9wdGlvbiA9PSBudWxsID8gYXJndiEgOiBjbGlPcHRpb247XG5cbiAgdHJ5IHtcbiAgICAvLyBsb2cuZGVidWcoJ3Jvb3QgUGF0aDogJyArIHJvb3RQYXRoKTtcbiAgICBzZXR0aW5nID0gc2V0dGluZyB8fCB7fTtcbiAgICAvLyBzZXR0aW5nLnByb2plY3RMaXN0ID0gW107XG4gICAgLy8gc29tZSBleHRyYSBjb25maWcgcHJvcGVydGllc1xuICAgIGNvbnN0IGluaXRTZXR0aW5nOiBQYXJ0aWFsPERyY3BTZXR0aW5ncz4gPSB7XG4gICAgICByb290UGF0aCxcbiAgICAgIHdmaFNyY1BhdGg6IHdmaFNyY1BhdGgoKSxcbiAgICAgIGRldk1vZGU6IGNsaU9wdGlvbiA9PSBudWxsIHx8ICFjbGlPcHRpb24ucHJvZHVjdGlvblxuICAgIH07XG4gICAgXy5hc3NpZ24oc2V0dGluZywgaW5pdFNldHRpbmcpO1xuICAgIC8vIGNvbnNvbGUubG9nKHNldHRpbmcpO1xuICAgIC8vIE1lcmdlIGZyb20gPHJvb3Q+L2NvbmZpZy55YW1sXG4gICAgdmFyIGNvbmZpZ0ZpbGVMaXN0ID0gW1xuICAgICAgUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uJywgJ2NvbmZpZy55YW1sJylcbiAgICBdO1xuICAgIHZhciByb290Q29uZmlnID0gUGF0aC5yZXNvbHZlKHJvb3RQYXRoLCAnZGlzdCcsICdjb25maWcueWFtbCcpO1xuICAgIGlmIChmcy5leGlzdHNTeW5jKHJvb3RDb25maWcpKVxuICAgICAgY29uZmlnRmlsZUxpc3QucHVzaChyb290Q29uZmlnKTtcblxuICAgIGNvbmZpZ0ZpbGVMaXN0LnB1c2goLi4ubG9jYWxDb25maWdQYXRoKTtcblxuICAgIGNvbmZpZ0ZpbGVMaXN0LmZvckVhY2gobG9jYWxDb25maWdQYXRoID0+IG1lcmdlRnJvbVlhbWxKc29uRmlsZShzZXR0aW5nLCBsb2NhbENvbmZpZ1BhdGgpKTtcbiAgICBoYW5kbGVycyA9IG5ldyBDb25maWdIYW5kbGVyTWdyKGNvbmZpZ0ZpbGVMaXN0LmZpbHRlcihuYW1lID0+IC9cXC5bdGpdcyQvLnRlc3QobmFtZSkpKTtcblxuICAgIGF3YWl0IGhhbmRsZXJzLnJ1bkVhY2g8Q29uZmlnSGFuZGxlcj4oKF9maWxlLCBvYmosIGhhbmRsZXIpID0+IHtcbiAgICAgIGlmIChoYW5kbGVyLm9uQ29uZmlnKVxuICAgICAgICByZXR1cm4gaGFuZGxlci5vbkNvbmZpZyhvYmogfHwgc2V0dGluZywgY2xpT3B0KTtcbiAgICB9KTtcbiAgICBpZiAoc2V0dGluZy5yZWNpcGVGb2xkZXIpIHtcbiAgICAgIHNldHRpbmcucmVjaXBlRm9sZGVyUGF0aCA9IFBhdGgucmVzb2x2ZShyb290UGF0aCwgc2V0dGluZy5yZWNpcGVGb2xkZXIpO1xuICAgIH1cbiAgICB2YWxpZGF0ZUNvbmZpZygpO1xuXG4gICAgLy8gdmFyIGRlZmF1bHRFbnRyeVNldCA9IHNldHRpbmcuZGVmYXVsdEVudHJ5U2V0ID0ge307XG4gICAgLy8gaWYgKHNldHRpbmcuZGVmYXVsdEVudHJ5UGFja2FnZXMpIHtcbiAgICAvLyAgIFtdLmNvbmNhdChzZXR0aW5nLmRlZmF1bHRFbnRyeVBhY2thZ2VzKS5mb3JFYWNoKGZ1bmN0aW9uKGVudHJ5RmlsZSkge1xuICAgIC8vICAgICBkZWZhdWx0RW50cnlTZXRbZW50cnlGaWxlXSA9IHRydWU7XG4gICAgLy8gICB9KTtcbiAgICAvLyB9XG4gICAgc2V0dGluZy5wb3J0ID0gbm9ybWFsaXplUG9ydChzZXR0aW5nLnBvcnQpO1xuICAgIC8vIGNvbnNvbGUubG9nKHNldHRpbmcpO1xuICAgIGlmICghc2V0dGluZy5kZXZNb2RlKVxuICAgICAgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPSAncHJvZHVjdGlvbic7XG4gICAgc2V0dGluZy5wdWJsaWNQYXRoID0gXy50cmltRW5kKHNldHRpbmcuc3RhdGljQXNzZXRzVVJMIHx8ICcnLCAnLycpICsgJy8nOyAvLyBhbHdheXMgZW5kcyB3aXRoIC9cbiAgICBzZXR0aW5nLmxvY2FsSVAgPSBnZXRMYW5JUHY0KCk7XG4gICAgLy8gc2V0dGluZy5ob3N0bmFtZVBhdGggPSBwdWJsaWNQYXRoLmdldEhvc3RuYW1lUGF0aChzZXR0aW5nKTtcbiAgICBtZXJnZUZyb21DbGlBcmdzKHNldHRpbmcsIGNsaU9wdCk7XG4gICAgaWYgKHNldHRpbmcuZGV2TW9kZSkge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhjeWFuKCdbY29uZmlnXScpICsgJyBEZXZlbG9wbWVudCBtb2RlJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coY3lhbignW2NvbmZpZ10nKSArICcgUHJvZHVjdGlvbiBtb2RlJyk7XG4gICAgfVxuICAgIHJldHVybiBzZXR0aW5nO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLmVycm9yKF9fZmlsZW5hbWUgKyAnIGZhaWxlZCB0byByZWFkIGNvbmZpZyBmaWxlcycsIGVyci5zdGFjayk7XG4gICAgdGhyb3cgZXJyO1xuICB9XG59XG5cbmZ1bmN0aW9uIG1lcmdlRnJvbVlhbWxKc29uRmlsZShzZXR0aW5nOiBEcmNwU2V0dGluZ3MsIGxvY2FsQ29uZmlnUGF0aDogc3RyaW5nKSB7XG4gIGlmICghZnMuZXhpc3RzU3luYyhsb2NhbENvbmZpZ1BhdGgpKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgY29uc29sZS5sb2coY3lhbignW2NvbmZpZ10nKSArICcgRmlsZSBkb2VzIG5vdCBleGlzdDogJXMnLCBsb2NhbENvbmZpZ1BhdGgpO1xuICAgIHJldHVybjtcbiAgfVxuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgY29uc29sZS5sb2coY3lhbignW2NvbmZpZ10nKSArIGAgUmVhZCAke2xvY2FsQ29uZmlnUGF0aH1gKTtcbiAgLy8gdmFyIHBhY2thZ2UyQ2h1bmsgPSBzZXR0aW5nLl9wYWNrYWdlMkNodW5rO1xuICB2YXIgY29uZmlnT2JqOiB7W2tleTogc3RyaW5nXTogYW55fTtcblxuICBjb25zdCBtYXRjaGVkID0gL1xcLihbXi5dKykkLy5leGVjKGxvY2FsQ29uZmlnUGF0aCk7XG5cbiAgbGV0IHN1ZmZpeCA9IG1hdGNoZWQgPyBtYXRjaGVkWzFdIDogbnVsbDtcbiAgaWYgKHN1ZmZpeCA9PT0gJ3lhbWwnIHx8IHN1ZmZpeCA9PT0gJ3ltbCcpIHtcbiAgICBjb25maWdPYmogPSB5YW1sanMucGFyc2UoZnMucmVhZEZpbGVTeW5jKGxvY2FsQ29uZmlnUGF0aCwgJ3V0ZjgnKSk7XG4gIH0gZWxzZSBpZiAoc3VmZml4ID09PSAnanNvbicpIHtcbiAgICBjb25maWdPYmogPSByZXF1aXJlKFBhdGgucmVzb2x2ZShsb2NhbENvbmZpZ1BhdGgpKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBfLmFzc2lnbldpdGgoc2V0dGluZywgY29uZmlnT2JqLCAob2JqVmFsdWUsIHNyY1ZhbHVlLCBrZXksIG9iamVjdCwgc291cmNlKSA9PiB7XG4gICAgLy8gaWYgKGtleSA9PT0gJ3ZlbmRvckJ1bmRsZU1hcCcpIHtcbiAgICAvLyAgIGlmICghXy5pc09iamVjdChvYmpWYWx1ZSkgfHwgIV8uaXNPYmplY3Qoc3JjVmFsdWUpKVxuICAgIC8vICAgICByZXR1cm47XG4gICAgLy8gICBfLmVhY2goc3JjVmFsdWUsIChwYWNrYWdlTGlzdCwgY2h1bmspID0+IHtcbiAgICAvLyAgICAgaWYgKCFfLmlzQXJyYXkocGFja2FnZUxpc3QpKVxuICAgIC8vICAgICAgIHJldHVybjtcbiAgICAvLyAgICAgZm9yIChjb25zdCBwIG9mIHBhY2thZ2VMaXN0KSB7XG4gICAgLy8gICAgICAgcGFja2FnZTJDaHVua1twXSA9IGNodW5rO1xuICAgIC8vICAgICB9XG4gICAgLy8gICB9KTtcbiAgICAvLyB9IGVsc2UgaWYgKGtleSA9PT0gJ291dHB1dFBhdGhNYXAnKSB7XG4gICAgLy8gICBpZiAoIW9ialZhbHVlKVxuICAgIC8vICAgICBvYmpWYWx1ZSA9IG9iamVjdC5vdXRwdXRQYXRoTWFwID0ge307XG4gICAgLy8gICByZXR1cm4gXy5hc3NpZ24ob2JqVmFsdWUsIHNyY1ZhbHVlKTtcbiAgICAvLyB9IGVsc2UgXG4gICAgaWYgKF8uaXNPYmplY3Qob2JqVmFsdWUpICYmICFBcnJheS5pc0FycmF5KG9ialZhbHVlKSkge1xuICAgICAgLy8gV2Ugb25seSBtZXJnZSAybmQgbGV2ZWwgcHJvcGVydGllc1xuICAgICAgcmV0dXJuIF8uYXNzaWduKG9ialZhbHVlLCBzcmNWYWx1ZSk7XG4gICAgfVxuICB9KTtcbn1cblxuZnVuY3Rpb24gbWVyZ2VGcm9tQ2xpQXJncyhzZXR0aW5nOiBEcmNwU2V0dGluZ3MsIGNsaU9wdDogQ2xpT3B0aW9ucykge1xuICBpZiAoIWNsaU9wdC5wcm9wKVxuICAgIHJldHVybjtcbiAgZm9yIChsZXQgcHJvcFBhaXIgb2YgY2xpT3B0LnByb3ApIHtcbiAgICBjb25zdCBwcm9wU2V0ID0gcHJvcFBhaXIuc3BsaXQoJz0nKTtcbiAgICBsZXQgcHJvcFBhdGggPSBwcm9wU2V0WzBdO1xuICAgIGlmIChfLnN0YXJ0c1dpdGgocHJvcFNldFswXSwgJ1snKSlcbiAgICAgIHByb3BQYXRoID0gSlNPTi5wYXJzZShwcm9wU2V0WzBdKTtcbiAgICBsZXQgdmFsdWU7XG4gICAgdHJ5IHtcbiAgICAgIHZhbHVlID0gSlNPTi5wYXJzZShwcm9wU2V0WzFdKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB2YWx1ZSA9IHByb3BTZXRbMV0gPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogcHJvcFNldFsxXTtcbiAgICB9XG4gICAgXy5zZXQoc2V0dGluZywgcHJvcFBhdGgsIHZhbHVlKTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhgW2NvbmZpZ10gc2V0ICR7cHJvcFBhdGh9ID0gJHt2YWx1ZX1gKTtcbiAgfVxufVxuXG5jb25maWcud2ZoU3JjUGF0aCA9IHdmaFNyY1BhdGg7XG5cbmZ1bmN0aW9uIHdmaFNyY1BhdGgoKSB7XG4gIHZhciB3ZmhQYXRoID0gUGF0aC5kaXJuYW1lKHJlcXVpcmUucmVzb2x2ZSgnZHItY29tcC1wYWNrYWdlL3BhY2thZ2UuanNvbicpKTtcbiAgLy8gbG9nLmRlYnVnKCd3ZmhQYXRoOiAlcycsIHdmaFBhdGgpO1xuICAvLyByZXR1cm4gKFBhdGguYmFzZW5hbWUoUGF0aC5kaXJuYW1lKHdmaFBhdGgpKSAhPT0gJ25vZGVfbW9kdWxlcycpID8gd2ZoUGF0aCA6IGZhbHNlO1xuICByZXR1cm4gd2ZoUGF0aDtcbn1cblxuZnVuY3Rpb24gdmFsaWRhdGVDb25maWcoKSB7XG4gIGlmICghc2V0dGluZy5ub2RlUm91dGVQYXRoKSB7XG4gICAgY29uc29sZS5lcnJvcignW2NvbmZpZyBlcnJvcl06ICcgKyAoJ1wibm9kZVJvdXRlUGF0aFwiIG11c3QgYmUgc2V0IGluIGNvbmZpZy55YW1sJykpO1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjb25maWd1cmF0aW9uJyk7XG4gIH1cblxuICBbJ3N0YXRpY0Fzc2V0c1VSTCcsXG4gICAgJ25vZGVSb3V0ZVBhdGgnLFxuICAgICdjb21waWxlZERpciddLmZvckVhY2goZnVuY3Rpb24ocHJvcCkge1xuICAgICAgc2V0dGluZ1twcm9wXSA9IHRyaW1UYWlsU2xhc2goc2V0dGluZ1twcm9wXSk7XG4gICAgfSk7XG5cbiAgdmFyIGNvbnRleHRNYXBwaW5nID0gc2V0dGluZy5wYWNrYWdlQ29udGV4dFBhdGhNYXBwaW5nO1xuICBpZiAoY29udGV4dE1hcHBpbmcpIHtcbiAgICBfLmZvck93bihjb250ZXh0TWFwcGluZywgZnVuY3Rpb24ocGF0aCwga2V5KSB7XG4gICAgICBjb250ZXh0TWFwcGluZ1trZXldID0gdHJpbVRhaWxTbGFzaChwYXRoKTtcbiAgICB9KTtcbiAgfVxufVxuXG5mdW5jdGlvbiB0cmltVGFpbFNsYXNoKHVybDogc3RyaW5nKSB7XG4gIGlmICh1cmwgPT09ICcvJykge1xuICAgIHJldHVybiB1cmw7XG4gIH1cbiAgcmV0dXJuIF8uZW5kc1dpdGgodXJsLCAnLycpID8gdXJsLnN1YnN0cmluZygwLCB1cmwubGVuZ3RoIC0gMSkgOiB1cmw7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZVBvcnQodmFsOiBzdHJpbmcgfCBudW1iZXIpIHtcbiAgbGV0IHBvcnQ6IG51bWJlciA9IHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnID8gcGFyc2VJbnQodmFsLCAxMCkgOiB2YWw7XG5cbiAgaWYgKGlzTmFOKHBvcnQpKSB7XG4gICAgLy8gbmFtZWQgcGlwZVxuICAgIHJldHVybiB2YWw7XG4gIH1cblxuICBpZiAocG9ydCA+PSAwKSB7XG4gICAgLy8gcG9ydCBudW1iZXJcbiAgICByZXR1cm4gcG9ydDtcbiAgfVxuXG4gIHJldHVybiA4MDgwO1xufVxuZXhwb3J0ID0gKGNvbmZpZyBhcyBEcmNwQ29uZmlnKTtcbiJdfQ==