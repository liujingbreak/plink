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
const utils_1 = require("./utils");
// import {getStore as getPckStore} from './package-mgr';
// import {map, distinctUntilChanged} from 'rxjs/operators';
const { cyan } = chalk_1.default;
const yamljs = require('yamljs');
let argv;
// var argv = require('yargs').argv;
require('yamlify/register');
// var publicPath = require('./publicPath');
let handlers;
let rootPath = utils_1.getRootDir();
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
            lodash_1.default.assign(setting, {
                /** @name rootPath
                      * @memberof setting
                      */
                rootPath,
                nodePath: path_1.default.join(rootPath, 'node_modules'),
                wfhSrcPath: wfhSrcPath(),
                _package2Chunk: {}
            });
            // Merge from <root>/config.yaml
            var configFileList = [
                path_1.default.resolve(__dirname, '..', 'config.yaml')
            ];
            var rootConfig = path_1.default.resolve(rootPath, 'dist', 'config.yaml');
            if (fs_1.default.existsSync(rootConfig))
                configFileList.push(rootConfig);
            configFileList.push(...localConfigPath);
            configFileList.forEach(localConfigPath => mergeFromYamlJsonFile(setting, localConfigPath));
            handlers = new config_handler_1.ConfigHandlerMgr(configFileList.filter(name => /\.[tj]s$/.test(name)), rootPath);
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
    return (path_1.default.basename(path_1.default.dirname(wfhPath)) !== 'node_modules') ? wfhPath : false;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQkFBK0I7QUFDL0Isb0RBQXVCO0FBQ3ZCLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsa0RBQTBCO0FBQzFCLHFEQUEyRjtBQUUzRix1REFBZ0Q7QUFDaEQsbUNBQW1DO0FBQ25DLHlEQUF5RDtBQUN6RCw0REFBNEQ7QUFFNUQsTUFBTSxFQUFDLElBQUksRUFBQyxHQUFHLGVBQUssQ0FBQztBQUNyQixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDakMsSUFBSSxJQUE0QixDQUFDO0FBQ2pDLG9DQUFvQztBQUNwQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUM1Qiw0Q0FBNEM7QUFDNUMsSUFBSSxRQUEwQixDQUFDO0FBQy9CLElBQUksUUFBUSxHQUFHLGtCQUFVLEVBQUUsQ0FBQztBQUU1QixJQUFJLE9BQXFCLENBQUM7QUFDMUIsNkJBQTZCO0FBQzdCLElBQUksZUFBeUIsQ0FBQztBQUU3QixPQUFlLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztBQUUvQixTQUFTLEtBQUs7SUFDWixJQUFJLE9BQU8sRUFBRSxNQUFNLENBQUM7SUFDcEIsSUFBSSxPQUFPLEdBQUcsSUFBSSxPQUFPLENBQUM7UUFDeEIsT0FBTyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN2QixNQUFNLEdBQUcsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3hCLENBQUMsQ0FBQyxDQUFDO0lBQ0gsT0FBTztRQUNMLE9BQU87UUFDUCxNQUFNO1FBQ04sT0FBTztLQUNSLENBQUM7QUFDSixDQUFDO0FBRUQ7Ozs7R0FJRztBQUNILE1BQU0sTUFBTSxHQUF3QixHQUFpQixFQUFFO0lBQ3JELE9BQU8sT0FBTyxDQUFDO0FBQ2pCLENBQUMsQ0FBQztBQUVGLElBQUks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QUU7UUFDZixPQUFPLEdBQUcsQ0FBQztLQUNaO0lBQ0QsT0FBTyxnQkFBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUN2RSxDQUFDO0FBRUQsU0FBUyxhQUFhLENBQUMsR0FBb0I7SUFDekMsSUFBSSxJQUFJLEdBQVcsT0FBTyxHQUFHLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7SUFFckUsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDZixhQUFhO1FBQ2IsT0FBTyxHQUFHLENBQUM7S0FDWjtJQUVELElBQUksSUFBSSxJQUFJLENBQUMsRUFBRTtRQUNiLGNBQWM7UUFDZCxPQUFPLElBQUksQ0FBQztLQUNiO0lBRUQsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBQ0QsaUJBQVUsTUFBcUIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBwcmVmZXItY29uc3RcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHtDb25maWdIYW5kbGVyTWdyLCBEcmNwU2V0dGluZ3MsIERyY3BDb25maWcsIENvbmZpZ0hhbmRsZXJ9IGZyb20gJy4vY29uZmlnLWhhbmRsZXInO1xuaW1wb3J0IHtHbG9iYWxPcHRpb25zIGFzIENsaU9wdGlvbnN9IGZyb20gJy4vY21kL3R5cGVzJztcbmltcG9ydCB7Z2V0TGFuSVB2NH0gZnJvbSAnLi91dGlscy9uZXR3b3JrLXV0aWwnO1xuaW1wb3J0IHtnZXRSb290RGlyfSBmcm9tICcuL3V0aWxzJztcbi8vIGltcG9ydCB7Z2V0U3RvcmUgYXMgZ2V0UGNrU3RvcmV9IGZyb20gJy4vcGFja2FnZS1tZ3InO1xuLy8gaW1wb3J0IHttYXAsIGRpc3RpbmN0VW50aWxDaGFuZ2VkfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmNvbnN0IHtjeWFufSA9IGNoYWxrO1xuY29uc3QgeWFtbGpzID0gcmVxdWlyZSgneWFtbGpzJyk7XG5sZXQgYXJndjogQ2xpT3B0aW9ucyB8IHVuZGVmaW5lZDtcbi8vIHZhciBhcmd2ID0gcmVxdWlyZSgneWFyZ3MnKS5hcmd2O1xucmVxdWlyZSgneWFtbGlmeS9yZWdpc3RlcicpO1xuLy8gdmFyIHB1YmxpY1BhdGggPSByZXF1aXJlKCcuL3B1YmxpY1BhdGgnKTtcbmxldCBoYW5kbGVyczogQ29uZmlnSGFuZGxlck1ncjtcbmxldCByb290UGF0aCA9IGdldFJvb3REaXIoKTtcblxubGV0IHNldHRpbmc6IERyY3BTZXR0aW5ncztcbi8vIGxldCBsb2NhbERpc2FibGVkID0gZmFsc2U7XG5sZXQgbG9jYWxDb25maWdQYXRoOiBzdHJpbmdbXTtcblxuKFByb21pc2UgYXMgYW55KS5kZWZlciA9IGRlZmVyO1xuXG5mdW5jdGlvbiBkZWZlcigpIHtcbiAgdmFyIHJlc29sdmUsIHJlamVjdDtcbiAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbigpIHtcbiAgICByZXNvbHZlID0gYXJndW1lbnRzWzBdO1xuICAgIHJlamVjdCA9IGFyZ3VtZW50c1sxXTtcbiAgfSk7XG4gIHJldHVybiB7XG4gICAgcmVzb2x2ZSxcbiAgICByZWplY3QsXG4gICAgcHJvbWlzZVxuICB9O1xufVxuXG4vKipcbiAqIHJlYWQgYW5kIHJldHVybiBjb25maWd1cmF0aW9uXG4gKiBAbmFtZSBjb25maWdcbiAqIEByZXR1cm4ge29iamVjdH0gc2V0dGluZ1xuICovXG5jb25zdCBjb25maWc6IFBhcnRpYWw8RHJjcENvbmZpZz4gPSAoKTogRHJjcFNldHRpbmdzID0+IHtcbiAgcmV0dXJuIHNldHRpbmc7XG59O1xuXG5sZXQgaW5pdFJlc29sdmU6ICh2YWx1ZTogRHJjcFNldHRpbmdzKSA9PiB2b2lkO1xuY29uZmlnLmRvbmUgPSBuZXcgUHJvbWlzZTxEcmNwU2V0dGluZ3M+KHJlc29sdmUgPT4ge1xuICBpbml0UmVzb2x2ZSA9IHJlc29sdmU7XG59KTtcblxuY29uZmlnLmluaXQgPSBhc3luYyAoX2FyZ3Y6IENsaU9wdGlvbnMpID0+IHtcbiAgYXJndiA9IF9hcmd2O1xuICBsb2NhbENvbmZpZ1BhdGggPSBhcmd2LmNvbmZpZy5sZW5ndGggPiAwID8gYXJndi5jb25maWcgOiBbUGF0aC5qb2luKHJvb3RQYXRoLCAnZGlzdCcsICdjb25maWcubG9jYWwueWFtbCcpXTtcbiAgY29uc3QgcmVzID0gYXdhaXQgbG9hZCgpO1xuICBpbml0UmVzb2x2ZShyZXMpO1xuICByZXR1cm4gcmVzO1xufTtcblxuY29uZmlnLnJlbG9hZCA9IGZ1bmN0aW9uIHJlbG9hZCgpIHtcbiAgc2V0dGluZyA9IHt9IGFzIERyY3BTZXR0aW5ncztcbiAgcmV0dXJuIGxvYWQoKTtcbn07XG5cbmNvbmZpZy5zZXQgPSBmdW5jdGlvbihwYXRoOiBzdHJpbmcsIHZhbHVlOiBhbnkpIHtcbiAgXy5zZXQoc2V0dGluZywgcGF0aCwgdmFsdWUpO1xuICByZXR1cm4gc2V0dGluZztcbn07XG5cbmNvbmZpZy5nZXQgPSBmdW5jdGlvbihwcm9wUGF0aDogc3RyaW5nLCBkZWZhdWx0VmFsdWU6IGFueSkge1xuICByZXR1cm4gXy5nZXQoc2V0dGluZywgcHJvcFBhdGgsIGRlZmF1bHRWYWx1ZSk7XG59O1xuXG5jb25maWcuc2V0RGVmYXVsdCA9IGZ1bmN0aW9uKHByb3BQYXRoOiBzdHJpbmcsIHZhbHVlOiBhbnkpIHtcbiAgaWYgKCFfLmhhcyhzZXR0aW5nLCBwcm9wUGF0aCkpIHtcbiAgICBfLnNldChzZXR0aW5nLCBwcm9wUGF0aCwgdmFsdWUpO1xuICB9XG4gIHJldHVybiBzZXR0aW5nO1xufTtcblxuLyoqXG4gKiBSZXNvbHZlIGEgcGF0aCBiYXNlZCBvbiBgcm9vdFBhdGhgXG4gKiBAbmFtZSByZXNvbHZlXG4gKiBAbWVtYmVyb2YgY29uZmlnXG4gKiBAcGFyYW0gIHtzdHJpbmd9IHByb3BlcnR5IG5hbWUgb3IgcHJvcGVydHkgcGF0aCwgbGlrZSBcIm5hbWVcIiwgXCJuYW1lLmNoaWxkUHJvcFsxXVwiXG4gKiBAcmV0dXJuIHtzdHJpbmd9ICAgICBhYnNvbHV0ZSBwYXRoXG4gKi9cbmNvbmZpZy5yZXNvbHZlID0gZnVuY3Rpb24ocGF0aFByb3BOYW1lOiAnZGVzdERpcid8J3N0YXRpY0Rpcid8J3NlcnZlckRpcicsIC4uLnBhdGhzOiBzdHJpbmdbXSkge1xuICBjb25zdCBhcmdzID0gW3Jvb3RQYXRoLCBfLmdldChzZXR0aW5nLCBwYXRoUHJvcE5hbWUpLCAuLi5wYXRoc107XG4gIHJldHVybiBQYXRoLnJlc29sdmUoLi4uYXJncyk7XG59O1xuXG5jb25maWcubG9hZCA9IGxvYWQ7XG5cbmNvbmZpZy5jb25maWdIYW5kbGVyTWdyID0gKCkgPT4gaGFuZGxlcnM7XG4vKipcbiAqIExvYWQgY29uZmlndXJhdGlvbiBmcm9tIGNvbmZpZy55YW1sLlxuICogQmVzaWRlcyB0aG9zZSBwcm9wZXJ0aWVzIGluIGNvbmZpZy55YW1sLCB0aGVyZSBhcmUgZXh0cmEgYXZhaWxhYmxlIHByb3BlcnRpZXM6XG4gKiAtIHJvb3RQYXRoIHtzdHJpbmd9IHJvb3QgcGF0aCwgbm9ybWFsbHkgaXQgaXMgaWRlbnRpY2FsIGFzIHByb2Nlc3MuY3dkKClcbiAqIFx0cmVzb2x2ZWQgdG8gcmVsYXRpdmUgcGF0aCB0byB0aGlzIHBsYXRmb3JtIHBhY2thZ2UgZm9sZGVyLCBldmVuIGl0IGlzIHVuZGVyIG5vZGVfbW9kdWxlc1xuICogXHRmb2xkZXIgbG9hZGVkIGFzIGRlcGVuZGVuY3lcbiAqIC0gcHJvamVjdExpc3RcbiAqIC0gbm9kZVBhdGggPHdvcmtzcGFjZT4vbm9kZV9tb2R1bGVzXG4gKiAtIHdmaFNyY1BhdGggbWVhbmluZyB3Zmggc291cmNlIGNvZGUgaXMgbGlua2VkLCBpdCBpcyBub3QgaW5zdGFsbGVkXG4gKiAtIF9wYWNrYWdlMkNodW5rIGEgaGFzaCBvYmplY3Qgd2hvc2Uga2V5IGlzIGBwYWNrYWdlIG5hbWVgLCB2YWx1ZSBpcyBgY2h1bmsgbmFtZWBcbiAqL1xuYXN5bmMgZnVuY3Rpb24gbG9hZChmaWxlTGlzdD86IHN0cmluZ1tdLCBjbGlPcHRpb24/OiBDbGlPcHRpb25zKTogUHJvbWlzZTxEcmNwU2V0dGluZ3M+IHtcbiAgaWYgKGZpbGVMaXN0KVxuICAgIGxvY2FsQ29uZmlnUGF0aCA9IGZpbGVMaXN0O1xuXG4gIGxldCBjbGlPcHQgPSBjbGlPcHRpb24gPT0gbnVsbCA/IGFyZ3YhIDogY2xpT3B0aW9uO1xuXG4gIHRyeSB7XG4gICAgLy8gbG9nLmRlYnVnKCdyb290IFBhdGg6ICcgKyByb290UGF0aCk7XG4gICAgc2V0dGluZyA9IHNldHRpbmcgfHwge307XG4gICAgLy8gc2V0dGluZy5wcm9qZWN0TGlzdCA9IFtdO1xuICAgIC8vIHNvbWUgZXh0cmEgY29uZmlnIHByb3BlcnRpZXNcbiAgICBfLmFzc2lnbihzZXR0aW5nLCB7XG4gICAgICAvKiogQG5hbWUgcm9vdFBhdGhcblx0XHRcdCogQG1lbWJlcm9mIHNldHRpbmdcblx0XHRcdCovXG4gICAgICByb290UGF0aCxcbiAgICAgIG5vZGVQYXRoOiBQYXRoLmpvaW4ocm9vdFBhdGgsICdub2RlX21vZHVsZXMnKSxcbiAgICAgIHdmaFNyY1BhdGg6IHdmaFNyY1BhdGgoKSxcbiAgICAgIF9wYWNrYWdlMkNodW5rOiB7fVxuICAgIH0pO1xuXG4gICAgLy8gTWVyZ2UgZnJvbSA8cm9vdD4vY29uZmlnLnlhbWxcbiAgICB2YXIgY29uZmlnRmlsZUxpc3QgPSBbXG4gICAgICBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4nLCAnY29uZmlnLnlhbWwnKVxuICAgIF07XG4gICAgdmFyIHJvb3RDb25maWcgPSBQYXRoLnJlc29sdmUocm9vdFBhdGgsICdkaXN0JywgJ2NvbmZpZy55YW1sJyk7XG4gICAgaWYgKGZzLmV4aXN0c1N5bmMocm9vdENvbmZpZykpXG4gICAgICBjb25maWdGaWxlTGlzdC5wdXNoKHJvb3RDb25maWcpO1xuXG4gICAgY29uZmlnRmlsZUxpc3QucHVzaCguLi5sb2NhbENvbmZpZ1BhdGgpO1xuXG4gICAgY29uZmlnRmlsZUxpc3QuZm9yRWFjaChsb2NhbENvbmZpZ1BhdGggPT4gbWVyZ2VGcm9tWWFtbEpzb25GaWxlKHNldHRpbmcsIGxvY2FsQ29uZmlnUGF0aCkpO1xuICAgIGhhbmRsZXJzID0gbmV3IENvbmZpZ0hhbmRsZXJNZ3IoY29uZmlnRmlsZUxpc3QuZmlsdGVyKG5hbWUgPT4gL1xcLlt0al1zJC8udGVzdChuYW1lKSksIHJvb3RQYXRoKTtcblxuICAgIGF3YWl0IGhhbmRsZXJzLnJ1bkVhY2g8Q29uZmlnSGFuZGxlcj4oKF9maWxlLCBvYmosIGhhbmRsZXIpID0+IHtcbiAgICAgIGlmIChoYW5kbGVyLm9uQ29uZmlnKVxuICAgICAgICByZXR1cm4gaGFuZGxlci5vbkNvbmZpZyhvYmogfHwgc2V0dGluZywgY2xpT3B0KTtcbiAgICB9KTtcbiAgICBpZiAoc2V0dGluZy5yZWNpcGVGb2xkZXIpIHtcbiAgICAgIHNldHRpbmcucmVjaXBlRm9sZGVyUGF0aCA9IFBhdGgucmVzb2x2ZShyb290UGF0aCwgc2V0dGluZy5yZWNpcGVGb2xkZXIpO1xuICAgIH1cbiAgICB2YWxpZGF0ZUNvbmZpZygpO1xuXG4gICAgLy8gdmFyIGRlZmF1bHRFbnRyeVNldCA9IHNldHRpbmcuZGVmYXVsdEVudHJ5U2V0ID0ge307XG4gICAgLy8gaWYgKHNldHRpbmcuZGVmYXVsdEVudHJ5UGFja2FnZXMpIHtcbiAgICAvLyAgIFtdLmNvbmNhdChzZXR0aW5nLmRlZmF1bHRFbnRyeVBhY2thZ2VzKS5mb3JFYWNoKGZ1bmN0aW9uKGVudHJ5RmlsZSkge1xuICAgIC8vICAgICBkZWZhdWx0RW50cnlTZXRbZW50cnlGaWxlXSA9IHRydWU7XG4gICAgLy8gICB9KTtcbiAgICAvLyB9XG4gICAgc2V0dGluZy5wb3J0ID0gbm9ybWFsaXplUG9ydChzZXR0aW5nLnBvcnQpO1xuXG4gICAgaWYgKCFzZXR0aW5nLmRldk1vZGUpXG4gICAgICBwcm9jZXNzLmVudi5OT0RFX0VOViA9ICdwcm9kdWN0aW9uJztcbiAgICBzZXR0aW5nLnB1YmxpY1BhdGggPSBfLnRyaW1FbmQoc2V0dGluZy5zdGF0aWNBc3NldHNVUkwgfHwgJycsICcvJykgKyAnLyc7IC8vIGFsd2F5cyBlbmRzIHdpdGggL1xuICAgIHNldHRpbmcubG9jYWxJUCA9IGdldExhbklQdjQoKTtcbiAgICAvLyBzZXR0aW5nLmhvc3RuYW1lUGF0aCA9IHB1YmxpY1BhdGguZ2V0SG9zdG5hbWVQYXRoKHNldHRpbmcpO1xuICAgIG1lcmdlRnJvbUNsaUFyZ3Moc2V0dGluZywgY2xpT3B0KTtcbiAgICBpZiAoc2V0dGluZy5kZXZNb2RlKSB7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICAgIGNvbnNvbGUubG9nKGN5YW4oJ1tjb25maWddJykgKyAnIERldmVsb3BtZW50IG1vZGUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgICBjb25zb2xlLmxvZyhjeWFuKCdbY29uZmlnXScpICsgJyBQcm9kdWN0aW9uIG1vZGUnKTtcbiAgICB9XG4gICAgcmV0dXJuIHNldHRpbmc7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGNvbnNvbGUuZXJyb3IoX19maWxlbmFtZSArICcgZmFpbGVkIHRvIHJlYWQgY29uZmlnIGZpbGVzJywgZXJyLnN0YWNrKTtcbiAgICB0aHJvdyBlcnI7XG4gIH1cbn1cblxuZnVuY3Rpb24gbWVyZ2VGcm9tWWFtbEpzb25GaWxlKHNldHRpbmc6IERyY3BTZXR0aW5ncywgbG9jYWxDb25maWdQYXRoOiBzdHJpbmcpIHtcbiAgaWYgKCFmcy5leGlzdHNTeW5jKGxvY2FsQ29uZmlnUGF0aCkpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBjb25zb2xlLmxvZyhjeWFuKCdbY29uZmlnXScpICsgJyBGaWxlIGRvZXMgbm90IGV4aXN0OiAlcycsIGxvY2FsQ29uZmlnUGF0aCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICBjb25zb2xlLmxvZyhjeWFuKCdbY29uZmlnXScpICsgYCBSZWFkICR7bG9jYWxDb25maWdQYXRofWApO1xuICAvLyB2YXIgcGFja2FnZTJDaHVuayA9IHNldHRpbmcuX3BhY2thZ2UyQ2h1bms7XG4gIHZhciBjb25maWdPYmo6IHtba2V5OiBzdHJpbmddOiBhbnl9O1xuXG4gIGNvbnN0IG1hdGNoZWQgPSAvXFwuKFteLl0rKSQvLmV4ZWMobG9jYWxDb25maWdQYXRoKTtcblxuICBsZXQgc3VmZml4ID0gbWF0Y2hlZCA/IG1hdGNoZWRbMV0gOiBudWxsO1xuICBpZiAoc3VmZml4ID09PSAneWFtbCcgfHwgc3VmZml4ID09PSAneW1sJykge1xuICAgIGNvbmZpZ09iaiA9IHlhbWxqcy5wYXJzZShmcy5yZWFkRmlsZVN5bmMobG9jYWxDb25maWdQYXRoLCAndXRmOCcpKTtcbiAgfSBlbHNlIGlmIChzdWZmaXggPT09ICdqc29uJykge1xuICAgIGNvbmZpZ09iaiA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKGxvY2FsQ29uZmlnUGF0aCkpO1xuICB9IGVsc2Uge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIF8uYXNzaWduV2l0aChzZXR0aW5nLCBjb25maWdPYmosIChvYmpWYWx1ZSwgc3JjVmFsdWUsIGtleSwgb2JqZWN0LCBzb3VyY2UpID0+IHtcbiAgICAvLyBpZiAoa2V5ID09PSAndmVuZG9yQnVuZGxlTWFwJykge1xuICAgIC8vICAgaWYgKCFfLmlzT2JqZWN0KG9ialZhbHVlKSB8fCAhXy5pc09iamVjdChzcmNWYWx1ZSkpXG4gICAgLy8gICAgIHJldHVybjtcbiAgICAvLyAgIF8uZWFjaChzcmNWYWx1ZSwgKHBhY2thZ2VMaXN0LCBjaHVuaykgPT4ge1xuICAgIC8vICAgICBpZiAoIV8uaXNBcnJheShwYWNrYWdlTGlzdCkpXG4gICAgLy8gICAgICAgcmV0dXJuO1xuICAgIC8vICAgICBmb3IgKGNvbnN0IHAgb2YgcGFja2FnZUxpc3QpIHtcbiAgICAvLyAgICAgICBwYWNrYWdlMkNodW5rW3BdID0gY2h1bms7XG4gICAgLy8gICAgIH1cbiAgICAvLyAgIH0pO1xuICAgIC8vIH0gZWxzZSBpZiAoa2V5ID09PSAnb3V0cHV0UGF0aE1hcCcpIHtcbiAgICAvLyAgIGlmICghb2JqVmFsdWUpXG4gICAgLy8gICAgIG9ialZhbHVlID0gb2JqZWN0Lm91dHB1dFBhdGhNYXAgPSB7fTtcbiAgICAvLyAgIHJldHVybiBfLmFzc2lnbihvYmpWYWx1ZSwgc3JjVmFsdWUpO1xuICAgIC8vIH0gZWxzZSBcbiAgICBpZiAoXy5pc09iamVjdChvYmpWYWx1ZSkgJiYgIUFycmF5LmlzQXJyYXkob2JqVmFsdWUpKSB7XG4gICAgICAvLyBXZSBvbmx5IG1lcmdlIDJuZCBsZXZlbCBwcm9wZXJ0aWVzXG4gICAgICByZXR1cm4gXy5hc3NpZ24ob2JqVmFsdWUsIHNyY1ZhbHVlKTtcbiAgICB9XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBtZXJnZUZyb21DbGlBcmdzKHNldHRpbmc6IERyY3BTZXR0aW5ncywgY2xpT3B0OiBDbGlPcHRpb25zKSB7XG4gIGlmICghY2xpT3B0LnByb3ApXG4gICAgcmV0dXJuO1xuICBmb3IgKGxldCBwcm9wUGFpciBvZiBjbGlPcHQucHJvcCkge1xuICAgIGNvbnN0IHByb3BTZXQgPSBwcm9wUGFpci5zcGxpdCgnPScpO1xuICAgIGxldCBwcm9wUGF0aCA9IHByb3BTZXRbMF07XG4gICAgaWYgKF8uc3RhcnRzV2l0aChwcm9wU2V0WzBdLCAnWycpKVxuICAgICAgcHJvcFBhdGggPSBKU09OLnBhcnNlKHByb3BTZXRbMF0pO1xuICAgIGxldCB2YWx1ZTtcbiAgICB0cnkge1xuICAgICAgdmFsdWUgPSBKU09OLnBhcnNlKHByb3BTZXRbMV0pO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIHZhbHVlID0gcHJvcFNldFsxXSA9PT0gJ3VuZGVmaW5lZCcgPyB1bmRlZmluZWQgOiBwcm9wU2V0WzFdO1xuICAgIH1cbiAgICBfLnNldChzZXR0aW5nLCBwcm9wUGF0aCwgdmFsdWUpO1xuICAgIC8vIHRzbGludDpkaXNhYmxlLW5leHQtbGluZTogbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKGBbY29uZmlnXSBzZXQgJHtwcm9wUGF0aH0gPSAke3ZhbHVlfWApO1xuICB9XG59XG5cbmNvbmZpZy53ZmhTcmNQYXRoID0gd2ZoU3JjUGF0aDtcblxuZnVuY3Rpb24gd2ZoU3JjUGF0aCgpIHtcbiAgdmFyIHdmaFBhdGggPSBQYXRoLmRpcm5hbWUocmVxdWlyZS5yZXNvbHZlKCdkci1jb21wLXBhY2thZ2UvcGFja2FnZS5qc29uJykpO1xuICAvLyBsb2cuZGVidWcoJ3dmaFBhdGg6ICVzJywgd2ZoUGF0aCk7XG4gIHJldHVybiAoUGF0aC5iYXNlbmFtZShQYXRoLmRpcm5hbWUod2ZoUGF0aCkpICE9PSAnbm9kZV9tb2R1bGVzJykgPyB3ZmhQYXRoIDogZmFsc2U7XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlQ29uZmlnKCkge1xuICBpZiAoIXNldHRpbmcubm9kZVJvdXRlUGF0aCkge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1tjb25maWcgZXJyb3JdOiAnICsgKCdcIm5vZGVSb3V0ZVBhdGhcIiBtdXN0IGJlIHNldCBpbiBjb25maWcueWFtbCcpKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY29uZmlndXJhdGlvbicpO1xuICB9XG5cbiAgWydzdGF0aWNBc3NldHNVUkwnLFxuICAgICdub2RlUm91dGVQYXRoJyxcbiAgICAnY29tcGlsZWREaXInXS5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcbiAgICAgIHNldHRpbmdbcHJvcF0gPSB0cmltVGFpbFNsYXNoKHNldHRpbmdbcHJvcF0pO1xuICAgIH0pO1xuXG4gIHZhciBjb250ZXh0TWFwcGluZyA9IHNldHRpbmcucGFja2FnZUNvbnRleHRQYXRoTWFwcGluZztcbiAgaWYgKGNvbnRleHRNYXBwaW5nKSB7XG4gICAgXy5mb3JPd24oY29udGV4dE1hcHBpbmcsIGZ1bmN0aW9uKHBhdGgsIGtleSkge1xuICAgICAgY29udGV4dE1hcHBpbmdba2V5XSA9IHRyaW1UYWlsU2xhc2gocGF0aCk7XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdHJpbVRhaWxTbGFzaCh1cmw6IHN0cmluZykge1xuICBpZiAodXJsID09PSAnLycpIHtcbiAgICByZXR1cm4gdXJsO1xuICB9XG4gIHJldHVybiBfLmVuZHNXaXRoKHVybCwgJy8nKSA/IHVybC5zdWJzdHJpbmcoMCwgdXJsLmxlbmd0aCAtIDEpIDogdXJsO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVQb3J0KHZhbDogc3RyaW5nIHwgbnVtYmVyKSB7XG4gIGxldCBwb3J0OiBudW1iZXIgPSB0eXBlb2YgdmFsID09PSAnc3RyaW5nJyA/IHBhcnNlSW50KHZhbCwgMTApIDogdmFsO1xuXG4gIGlmIChpc05hTihwb3J0KSkge1xuICAgIC8vIG5hbWVkIHBpcGVcbiAgICByZXR1cm4gdmFsO1xuICB9XG5cbiAgaWYgKHBvcnQgPj0gMCkge1xuICAgIC8vIHBvcnQgbnVtYmVyXG4gICAgcmV0dXJuIHBvcnQ7XG4gIH1cblxuICByZXR1cm4gODA4MDtcbn1cbmV4cG9ydCA9IChjb25maWcgYXMgRHJjcENvbmZpZyk7XG4iXX0=