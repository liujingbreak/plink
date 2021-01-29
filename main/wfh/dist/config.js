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
// tslint:disable: prefer-const max-line-length
require('yamlify/register');
const lodash_1 = __importDefault(require("lodash"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const chalk_1 = __importDefault(require("chalk"));
const config_handler_1 = require("./config-handler");
const network_util_1 = require("./utils/network-util");
const rxjs_1 = require("rxjs");
const log4js_1 = __importDefault(require("log4js"));
const log = log4js_1.default.getLogger('plink.config');
const yamljs = require('yamljs');
const { distDir, rootDir } = JSON.parse(process.env.__plink);
let argv;
let handlers;
let rootPath = rootDir;
let setting;
let localConfigPath;
const configureStore = new rxjs_1.BehaviorSubject(null);
configDefaultLog();
function configDefaultLog() {
    log4js_1.default.configure({
        appenders: {
            out: {
                type: 'stdout',
                layout: { type: 'pattern', pattern: '%[%c%] - %m' }
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
config.configureStore = configureStore;
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
    // log.info(setting);
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
        log.info(' Development mode');
    }
    else {
        // tslint:disable-next-line: no-console
        log.info(' Production mode');
    }
    configureStore.next(setting);
    return setting;
}
function mergeFromYamlJsonFile(setting, localConfigPath) {
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
        log.info(`[config] set ${propPath} = ${value}`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vdHMvY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7QUFBQSwrQ0FBK0M7QUFDL0MsT0FBTyxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDNUIsb0RBQXVCO0FBQ3ZCLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsa0RBQTBCO0FBQzFCLHFEQUEyRjtBQUUzRix1REFBZ0Q7QUFFaEQsK0JBQXFDO0FBQ3JDLG9EQUE0QjtBQUM1QixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUU3QyxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDakMsTUFBTSxFQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsT0FBUSxDQUFhLENBQUM7QUFFeEUsSUFBSSxJQUE0QixDQUFDO0FBRWpDLElBQUksUUFBMEIsQ0FBQztBQUMvQixJQUFJLFFBQVEsR0FBRyxPQUFPLENBQUM7QUFFdkIsSUFBSSxPQUFxQixDQUFDO0FBRTFCLElBQUksZUFBeUIsQ0FBQztBQUM5QixNQUFNLGNBQWMsR0FBRyxJQUFJLHNCQUFlLENBQXNCLElBQUksQ0FBQyxDQUFDO0FBRXRFLGdCQUFnQixFQUFFLENBQUM7QUFFbkIsU0FBUyxnQkFBZ0I7SUFDdkIsZ0JBQU0sQ0FBQyxTQUFTLENBQUM7UUFDZixTQUFTLEVBQUU7WUFDVCxHQUFHLEVBQUU7Z0JBQ0gsSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsTUFBTSxFQUFFLEVBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFDO2FBQ2xEO1NBQ0Y7UUFDRCxVQUFVLEVBQUU7WUFDVixPQUFPLEVBQUUsRUFBQyxTQUFTLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLEVBQUUs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QUFDLEdBQUcsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzVDLENBQUMsQ0FBQyxDQUFDO0tBQ0o7QUFDSCxDQUFDO0FBRUQsU0FBUyxhQUFhLENBQUMsR0FBVztJQUNoQyxJQUFJLEdBQUcsS0FBSyxHQUFHLEVBQUU7UUFDZixPQUFPLEdBQUcsQ0FBQztLQUNaO0lBQ0QsT0FBTyxnQkFBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUN2RSxDQUFDO0FBRUQsU0FBUyxhQUFhLENBQUMsR0FBb0I7SUFDekMsSUFBSSxJQUFJLEdBQVcsT0FBTyxHQUFHLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7SUFFckUsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDZixhQUFhO1FBQ2IsT0FBTyxHQUFHLENBQUM7S0FDWjtJQUVELElBQUksSUFBSSxJQUFJLENBQUMsRUFBRTtRQUNiLGNBQWM7UUFDZCxPQUFPLElBQUksQ0FBQztLQUNiO0lBRUQsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBQ0QsaUJBQVUsTUFBcUIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHRzbGludDpkaXNhYmxlOiBwcmVmZXItY29uc3QgbWF4LWxpbmUtbGVuZ3RoXG5yZXF1aXJlKCd5YW1saWZ5L3JlZ2lzdGVyJyk7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGZzIGZyb20gJ2ZzJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7Q29uZmlnSGFuZGxlck1nciwgRHJjcFNldHRpbmdzLCBEcmNwQ29uZmlnLCBDb25maWdIYW5kbGVyfSBmcm9tICcuL2NvbmZpZy1oYW5kbGVyJztcbmltcG9ydCB7R2xvYmFsT3B0aW9ucyBhcyBDbGlPcHRpb25zfSBmcm9tICcuL2NtZC90eXBlcyc7XG5pbXBvcnQge2dldExhbklQdjR9IGZyb20gJy4vdXRpbHMvbmV0d29yay11dGlsJztcbmltcG9ydCB7UGxpbmtFbnZ9IGZyb20gJy4vbm9kZS1wYXRoJztcbmltcG9ydCB7QmVoYXZpb3JTdWJqZWN0fSBmcm9tICdyeGpzJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLmNvbmZpZycpO1xuXG5jb25zdCB5YW1sanMgPSByZXF1aXJlKCd5YW1sanMnKTtcbmNvbnN0IHtkaXN0RGlyLCByb290RGlyfSA9IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluayEpIGFzIFBsaW5rRW52O1xuXG5sZXQgYXJndjogQ2xpT3B0aW9ucyB8IHVuZGVmaW5lZDtcblxubGV0IGhhbmRsZXJzOiBDb25maWdIYW5kbGVyTWdyO1xubGV0IHJvb3RQYXRoID0gcm9vdERpcjtcblxubGV0IHNldHRpbmc6IERyY3BTZXR0aW5ncztcblxubGV0IGxvY2FsQ29uZmlnUGF0aDogc3RyaW5nW107XG5jb25zdCBjb25maWd1cmVTdG9yZSA9IG5ldyBCZWhhdmlvclN1YmplY3Q8RHJjcFNldHRpbmdzIHwgbnVsbD4obnVsbCk7XG5cbmNvbmZpZ0RlZmF1bHRMb2coKTtcblxuZnVuY3Rpb24gY29uZmlnRGVmYXVsdExvZygpIHtcbiAgbG9nNGpzLmNvbmZpZ3VyZSh7XG4gICAgYXBwZW5kZXJzOiB7XG4gICAgICBvdXQ6IHtcbiAgICAgICAgdHlwZTogJ3N0ZG91dCcsXG4gICAgICAgIGxheW91dDoge3R5cGU6ICdwYXR0ZXJuJywgcGF0dGVybjogJyVbJWMlXSAtICVtJ31cbiAgICAgIH1cbiAgICB9LFxuICAgIGNhdGVnb3JpZXM6IHtcbiAgICAgIGRlZmF1bHQ6IHthcHBlbmRlcnM6IFsnb3V0J10sIGxldmVsOiAnaW5mbyd9XG4gICAgfVxuICB9KTtcbiAgLyoqXG4gICAtICVyIHRpbWUgaW4gdG9Mb2NhbGVUaW1lU3RyaW5nIGZvcm1hdFxuICAgLSAlcCBsb2cgbGV2ZWxcbiAgIC0gJWMgbG9nIGNhdGVnb3J5XG4gICAtICVoIGhvc3RuYW1lXG4gICAtICVtIGxvZyBkYXRhXG4gICAtICVkIGRhdGUsIGZvcm1hdHRlZCAtIGRlZmF1bHQgaXMgSVNPODYwMSwgZm9ybWF0IG9wdGlvbnMgYXJlOiBJU084NjAxLCBJU084NjAxX1dJVEhfVFpfT0ZGU0VULCBBQlNPTFVURSwgREFURSwgb3IgYW55IHN0cmluZyBjb21wYXRpYmxlIHdpdGggdGhlIGRhdGUtZm9ybWF0IGxpYnJhcnkuIGUuZy4gJWR7REFURX0sICVke3l5eXkvTU0vZGQtaGgubW0uc3N9XG4gICAtICUlICUgLSBmb3Igd2hlbiB5b3Ugd2FudCBhIGxpdGVyYWwgJSBpbiB5b3VyIG91dHB1dFxuICAgLSAlbiBuZXdsaW5lXG4gICAtICV6IHByb2Nlc3MgaWQgKGZyb20gcHJvY2Vzcy5waWQpXG4gICAtICVmIGZ1bGwgcGF0aCBvZiBmaWxlbmFtZSAocmVxdWlyZXMgZW5hYmxlQ2FsbFN0YWNrOiB0cnVlIG9uIHRoZSBjYXRlZ29yeSwgc2VlIGNvbmZpZ3VyYXRpb24gb2JqZWN0KVxuICAgLSAlZntkZXB0aH0gcGF0aOKAmXMgZGVwdGggbGV0IHlvdSBjaG9zZSB0byBoYXZlIG9ubHkgZmlsZW5hbWUgKCVmezF9KSBvciBhIGNob3NlbiBudW1iZXIgb2YgZGlyZWN0b3JpZXNcbiAgIC0gJWwgbGluZSBudW1iZXIgKHJlcXVpcmVzIGVuYWJsZUNhbGxTdGFjazogdHJ1ZSBvbiB0aGUgY2F0ZWdvcnksIHNlZSBjb25maWd1cmF0aW9uIG9iamVjdClcbiAgIC0gJW8gY29sdW1uIHBvc3Rpb24gKHJlcXVpcmVzIGVuYWJsZUNhbGxTdGFjazogdHJ1ZSBvbiB0aGUgY2F0ZWdvcnksIHNlZSBjb25maWd1cmF0aW9uIG9iamVjdClcbiAgIC0gJXMgY2FsbCBzdGFjayAocmVxdWlyZXMgZW5hYmxlQ2FsbFN0YWNrOiB0cnVlIG9uIHRoZSBjYXRlZ29yeSwgc2VlIGNvbmZpZ3VyYXRpb24gb2JqZWN0KVxuICAgLSAleHs8dG9rZW5uYW1lPn0gYWRkIGR5bmFtaWMgdG9rZW5zIHRvIHlvdXIgbG9nLiBUb2tlbnMgYXJlIHNwZWNpZmllZCBpbiB0aGUgdG9rZW5zIHBhcmFtZXRlci5cbiAgIC0gJVh7PHRva2VubmFtZT59IGFkZCB2YWx1ZXMgZnJvbSB0aGUgTG9nZ2VyIGNvbnRleHQuIFRva2VucyBhcmUga2V5cyBpbnRvIHRoZSBjb250ZXh0IHZhbHVlcy5cbiAgIC0gJVsgc3RhcnQgYSBjb2xvdXJlZCBibG9jayAoY29sb3VyIHdpbGwgYmUgdGFrZW4gZnJvbSB0aGUgbG9nIGxldmVsLCBzaW1pbGFyIHRvIGNvbG91cmVkTGF5b3V0KVxuICAgLSAlXSBlbmQgYSBjb2xvdXJlZCBibG9ja1xuICAgKi9cbn1cblxuKFByb21pc2UgYXMgYW55KS5kZWZlciA9IGRlZmVyO1xuXG5mdW5jdGlvbiBkZWZlcigpIHtcbiAgdmFyIHJlc29sdmUsIHJlamVjdDtcbiAgdmFyIHByb21pc2UgPSBuZXcgUHJvbWlzZShmdW5jdGlvbigpIHtcbiAgICByZXNvbHZlID0gYXJndW1lbnRzWzBdO1xuICAgIHJlamVjdCA9IGFyZ3VtZW50c1sxXTtcbiAgfSk7XG4gIHJldHVybiB7XG4gICAgcmVzb2x2ZSxcbiAgICByZWplY3QsXG4gICAgcHJvbWlzZVxuICB9O1xufVxuXG4vKipcbiAqIHJlYWQgYW5kIHJldHVybiBjb25maWd1cmF0aW9uXG4gKiBAbmFtZSBjb25maWdcbiAqIEByZXR1cm4ge29iamVjdH0gc2V0dGluZ1xuICovXG5jb25zdCBjb25maWc6IFBhcnRpYWw8RHJjcENvbmZpZz4gPSAoKTogRHJjcFNldHRpbmdzID0+IHtcbiAgcmV0dXJuIHNldHRpbmc7XG59O1xuXG5sZXQgaW5pdFJlc29sdmU6ICh2YWx1ZTogRHJjcFNldHRpbmdzKSA9PiB2b2lkO1xuY29uZmlnLmRvbmUgPSBuZXcgUHJvbWlzZTxEcmNwU2V0dGluZ3M+KHJlc29sdmUgPT4ge1xuICBpbml0UmVzb2x2ZSA9IHJlc29sdmU7XG59KTtcblxuY29uZmlnLmluaXQgPSBhc3luYyAoX2FyZ3Y6IENsaU9wdGlvbnMpID0+IHtcbiAgYXJndiA9IF9hcmd2O1xuICBsb2NhbENvbmZpZ1BhdGggPSBhcmd2LmNvbmZpZyAmJiBhcmd2LmNvbmZpZy5sZW5ndGggPiAwID8gYXJndi5jb25maWcgOiBbUGF0aC5qb2luKGRpc3REaXIsICdjb25maWcubG9jYWwueWFtbCcpXTtcbiAgY29uc3QgcmVzID0gYXdhaXQgbG9hZCgpO1xuICBpbml0UmVzb2x2ZShyZXMpO1xuICByZXR1cm4gcmVzO1xufTtcblxuY29uZmlnLmluaXRTeW5jID0gKF9hcmd2OiBDbGlPcHRpb25zKSA9PiB7XG4gIGFyZ3YgPSBfYXJndjtcbiAgbG9jYWxDb25maWdQYXRoID0gYXJndi5jb25maWcgJiYgYXJndi5jb25maWcubGVuZ3RoID4gMCA/IGFyZ3YuY29uZmlnIDogW1BhdGguam9pbihkaXN0RGlyLCAnY29uZmlnLmxvY2FsLnlhbWwnKV07XG4gIGNvbnN0IHJlcyA9IGxvYWRTeW5jKCk7XG4gIHJldHVybiByZXM7XG59O1xuXG5cbmNvbmZpZy5yZWxvYWQgPSBmdW5jdGlvbiByZWxvYWQoKSB7XG4gIHNldHRpbmcgPSB7fSBhcyBEcmNwU2V0dGluZ3M7XG4gIHJldHVybiBsb2FkKCk7XG59O1xuXG5jb25maWcuc2V0ID0gZnVuY3Rpb24ocGF0aDogc3RyaW5nLCB2YWx1ZTogYW55KSB7XG4gIF8uc2V0KHNldHRpbmcsIHBhdGgsIHZhbHVlKTtcbiAgcmV0dXJuIHNldHRpbmc7XG59O1xuXG5jb25maWcuZ2V0ID0gZnVuY3Rpb24ocHJvcFBhdGg6IHN0cmluZywgZGVmYXVsdFZhbHVlOiBhbnkpIHtcbiAgcmV0dXJuIF8uZ2V0KHNldHRpbmcsIHByb3BQYXRoLCBkZWZhdWx0VmFsdWUpO1xufTtcblxuY29uZmlnLnNldERlZmF1bHQgPSBmdW5jdGlvbihwcm9wUGF0aDogc3RyaW5nLCB2YWx1ZTogYW55KSB7XG4gIGlmICghXy5oYXMoc2V0dGluZywgcHJvcFBhdGgpKSB7XG4gICAgXy5zZXQoc2V0dGluZywgcHJvcFBhdGgsIHZhbHVlKTtcbiAgfVxuICByZXR1cm4gc2V0dGluZztcbn07XG5cbi8qKlxuICogUmVzb2x2ZSBhIHBhdGggYmFzZWQgb24gYHJvb3RQYXRoYFxuICogQG5hbWUgcmVzb2x2ZVxuICogQG1lbWJlcm9mIGNvbmZpZ1xuICogQHBhcmFtICB7c3RyaW5nfSBwcm9wZXJ0eSBuYW1lIG9yIHByb3BlcnR5IHBhdGgsIGxpa2UgXCJuYW1lXCIsIFwibmFtZS5jaGlsZFByb3BbMV1cIlxuICogQHJldHVybiB7c3RyaW5nfSAgICAgYWJzb2x1dGUgcGF0aFxuICovXG5jb25maWcucmVzb2x2ZSA9IGZ1bmN0aW9uKHBhdGhQcm9wTmFtZTogJ2Rlc3REaXInfCdzdGF0aWNEaXInfCdzZXJ2ZXJEaXInLCAuLi5wYXRoczogc3RyaW5nW10pIHtcbiAgY29uc3QgYXJncyA9IFtyb290UGF0aCwgXy5nZXQoc2V0dGluZywgcGF0aFByb3BOYW1lKSwgLi4ucGF0aHNdO1xuICByZXR1cm4gUGF0aC5yZXNvbHZlKC4uLmFyZ3MpO1xufTtcblxuY29uZmlnLmxvYWQgPSBsb2FkO1xuXG5jb25maWcuY29uZmlndXJlU3RvcmUgPSBjb25maWd1cmVTdG9yZTtcblxuY29uZmlnLmNvbmZpZ0hhbmRsZXJNZ3IgPSAoKSA9PiBoYW5kbGVycztcbi8qKlxuICogTG9hZCBjb25maWd1cmF0aW9uIGZyb20gY29uZmlnLnlhbWwuXG4gKiBCZXNpZGVzIHRob3NlIHByb3BlcnRpZXMgaW4gY29uZmlnLnlhbWwsIHRoZXJlIGFyZSBleHRyYSBhdmFpbGFibGUgcHJvcGVydGllczpcbiAqIC0gcm9vdFBhdGgge3N0cmluZ30gcm9vdCBwYXRoLCBub3JtYWxseSBpdCBpcyBpZGVudGljYWwgYXMgcHJvY2Vzcy5jd2QoKVxuICogXHRyZXNvbHZlZCB0byByZWxhdGl2ZSBwYXRoIHRvIHRoaXMgcGxhdGZvcm0gcGFja2FnZSBmb2xkZXIsIGV2ZW4gaXQgaXMgdW5kZXIgbm9kZV9tb2R1bGVzXG4gKiBcdGZvbGRlciBsb2FkZWQgYXMgZGVwZW5kZW5jeVxuICogLSBwcm9qZWN0TGlzdFxuICogLSBub2RlUGF0aCA8d29ya3NwYWNlPi9ub2RlX21vZHVsZXNcbiAqIC0gd2ZoU3JjUGF0aCBtZWFuaW5nIHdmaCBzb3VyY2UgY29kZSBpcyBsaW5rZWQsIGl0IGlzIG5vdCBpbnN0YWxsZWRcbiAqIC0gX3BhY2thZ2UyQ2h1bmsgYSBoYXNoIG9iamVjdCB3aG9zZSBrZXkgaXMgYHBhY2thZ2UgbmFtZWAsIHZhbHVlIGlzIGBjaHVuayBuYW1lYFxuICovXG5hc3luYyBmdW5jdGlvbiBsb2FkKGZpbGVMaXN0Pzogc3RyaW5nW10sIGNsaU9wdGlvbj86IENsaU9wdGlvbnMpOiBQcm9taXNlPERyY3BTZXR0aW5ncz4ge1xuICBsZXQgY2xpT3B0ID0gY2xpT3B0aW9uID09IG51bGwgPyBhcmd2ISA6IGNsaU9wdGlvbjtcbiAgY29uc3QgY29uZmlnRmlsZUxpc3QgPSBwcmVwYXJlQ29uZmlnRmlsZXMoZmlsZUxpc3QsIGNsaU9wdGlvbik7XG5cbiAgaGFuZGxlcnMgPSBuZXcgQ29uZmlnSGFuZGxlck1ncihjb25maWdGaWxlTGlzdC5maWx0ZXIobmFtZSA9PiAvXFwuW3RqXXMkLy50ZXN0KG5hbWUpKSk7XG5cbiAgYXdhaXQgaGFuZGxlcnMucnVuRWFjaDxDb25maWdIYW5kbGVyPigoX2ZpbGUsIG9iaiwgaGFuZGxlcikgPT4ge1xuICAgIGlmIChoYW5kbGVyLm9uQ29uZmlnKVxuICAgICAgcmV0dXJuIGhhbmRsZXIub25Db25maWcob2JqIHx8IHNldHRpbmcsIGNsaU9wdCk7XG4gIH0pO1xuICByZXR1cm4gcG9zdFByb2Nlc3NDb25maWcoY2xpT3B0KTtcbn1cblxuZnVuY3Rpb24gbG9hZFN5bmMoZmlsZUxpc3Q/OiBzdHJpbmdbXSwgY2xpT3B0aW9uPzogQ2xpT3B0aW9ucyk6IERyY3BTZXR0aW5ncyB7XG4gIGxldCBjbGlPcHQgPSBjbGlPcHRpb24gPT0gbnVsbCA/IGFyZ3YhIDogY2xpT3B0aW9uO1xuICBjb25zdCBjb25maWdGaWxlTGlzdCA9IHByZXBhcmVDb25maWdGaWxlcyhmaWxlTGlzdCwgY2xpT3B0aW9uKTtcblxuICBoYW5kbGVycyA9IG5ldyBDb25maWdIYW5kbGVyTWdyKGNvbmZpZ0ZpbGVMaXN0LmZpbHRlcihuYW1lID0+IC9cXC5bdGpdcyQvLnRlc3QobmFtZSkpKTtcblxuICBoYW5kbGVycy5ydW5FYWNoU3luYzxDb25maWdIYW5kbGVyPigoX2ZpbGUsIG9iaiwgaGFuZGxlcikgPT4ge1xuICAgIGlmIChoYW5kbGVyLm9uQ29uZmlnKVxuICAgICAgcmV0dXJuIGhhbmRsZXIub25Db25maWcob2JqIHx8IHNldHRpbmcsIGNsaU9wdCk7XG4gIH0pO1xuICByZXR1cm4gcG9zdFByb2Nlc3NDb25maWcoY2xpT3B0KTtcbn1cblxuZnVuY3Rpb24gcHJlcGFyZUNvbmZpZ0ZpbGVzKGZpbGVMaXN0Pzogc3RyaW5nW10sIGNsaU9wdGlvbj86IENsaU9wdGlvbnMpIHtcbiAgaWYgKGZpbGVMaXN0KVxuICAgIGxvY2FsQ29uZmlnUGF0aCA9IGZpbGVMaXN0O1xuXG4gIC8vIGxvZy5kZWJ1Zygncm9vdCBQYXRoOiAnICsgcm9vdFBhdGgpO1xuICBzZXR0aW5nID0gc2V0dGluZyB8fCB7fTtcbiAgc2V0dGluZy5kZXN0RGlyID0gZGlzdERpcjtcbiAgc2V0dGluZy5zdGF0aWNEaXIgPSBQYXRoLnJlc29sdmUoZGlzdERpciwgJ3N0YXRpYycpO1xuICBzZXR0aW5nLmRsbERlc3REaXIgPSBQYXRoLnJlc29sdmUoZGlzdERpciwgJ2RsbCcpO1xuICAvLyBzZXR0aW5nLnByb2plY3RMaXN0ID0gW107XG4gIC8vIHNvbWUgZXh0cmEgY29uZmlnIHByb3BlcnRpZXNcbiAgY29uc3QgaW5pdFNldHRpbmc6IFBhcnRpYWw8RHJjcFNldHRpbmdzPiA9IHtcbiAgICByb290UGF0aCxcbiAgICB3ZmhTcmNQYXRoOiB3ZmhTcmNQYXRoKCksXG4gICAgZGV2TW9kZTogY2xpT3B0aW9uID09IG51bGwgfHwgIWNsaU9wdGlvbi5wcm9kdWN0aW9uXG4gIH07XG4gIF8uYXNzaWduKHNldHRpbmcsIGluaXRTZXR0aW5nKTtcbiAgLy8gbG9nLmluZm8oc2V0dGluZyk7XG4gIC8vIE1lcmdlIGZyb20gPHJvb3Q+L2NvbmZpZy55YW1sXG4gIHZhciBjb25maWdGaWxlTGlzdCA9IFtcbiAgICBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4nLCAnY29uZmlnLnlhbWwnKVxuICBdO1xuICB2YXIgcm9vdENvbmZpZyA9IFBhdGguam9pbihkaXN0RGlyLCAnY29uZmlnLnlhbWwnKTtcbiAgaWYgKGZzLmV4aXN0c1N5bmMocm9vdENvbmZpZykpXG4gICAgY29uZmlnRmlsZUxpc3QucHVzaChyb290Q29uZmlnKTtcblxuICBjb25maWdGaWxlTGlzdC5wdXNoKC4uLmxvY2FsQ29uZmlnUGF0aCk7XG5cbiAgY29uZmlnRmlsZUxpc3QuZm9yRWFjaChsb2NhbENvbmZpZ1BhdGggPT4gbWVyZ2VGcm9tWWFtbEpzb25GaWxlKHNldHRpbmcsIGxvY2FsQ29uZmlnUGF0aCkpO1xuXG4gIHJldHVybiBjb25maWdGaWxlTGlzdDtcbn1cblxuZnVuY3Rpb24gcG9zdFByb2Nlc3NDb25maWcoY2xpT3B0OiBDbGlPcHRpb25zKSB7XG4gIHZhbGlkYXRlQ29uZmlnKCk7XG5cbiAgc2V0dGluZy5wb3J0ID0gbm9ybWFsaXplUG9ydChzZXR0aW5nLnBvcnQpO1xuXG4gIGlmICghc2V0dGluZy5kZXZNb2RlKVxuICAgIHByb2Nlc3MuZW52Lk5PREVfRU5WID0gJ3Byb2R1Y3Rpb24nO1xuICBzZXR0aW5nLnB1YmxpY1BhdGggPSBfLnRyaW1FbmQoc2V0dGluZy5zdGF0aWNBc3NldHNVUkwgfHwgJycsICcvJykgKyAnLyc7IC8vIGFsd2F5cyBlbmRzIHdpdGggL1xuICBzZXR0aW5nLmxvY2FsSVAgPSBnZXRMYW5JUHY0KCk7XG5cbiAgbWVyZ2VGcm9tQ2xpQXJncyhzZXR0aW5nLCBjbGlPcHQpO1xuICBpZiAoc2V0dGluZy5kZXZNb2RlKSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgbG9nLmluZm8oJyBEZXZlbG9wbWVudCBtb2RlJyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gdHNsaW50OmRpc2FibGUtbmV4dC1saW5lOiBuby1jb25zb2xlXG4gICAgbG9nLmluZm8oJyBQcm9kdWN0aW9uIG1vZGUnKTtcbiAgfVxuICBjb25maWd1cmVTdG9yZS5uZXh0KHNldHRpbmcpO1xuICByZXR1cm4gc2V0dGluZztcbn1cblxuZnVuY3Rpb24gbWVyZ2VGcm9tWWFtbEpzb25GaWxlKHNldHRpbmc6IERyY3BTZXR0aW5ncywgbG9jYWxDb25maWdQYXRoOiBzdHJpbmcpIHtcbiAgaWYgKCFmcy5leGlzdHNTeW5jKGxvY2FsQ29uZmlnUGF0aCkpIHtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBsb2cuaW5mbyhjaGFsay55ZWxsb3coJyBGaWxlIGRvZXMgbm90IGV4aXN0OiAlcycsIGxvY2FsQ29uZmlnUGF0aCkpO1xuICAgIHJldHVybjtcbiAgfVxuICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgbG9nLmluZm8oYCBSZWFkICR7bG9jYWxDb25maWdQYXRofWApO1xuICB2YXIgY29uZmlnT2JqOiB7W2tleTogc3RyaW5nXTogYW55fTtcblxuICBjb25zdCBtYXRjaGVkID0gL1xcLihbXi5dKykkLy5leGVjKGxvY2FsQ29uZmlnUGF0aCk7XG5cbiAgbGV0IHN1ZmZpeCA9IG1hdGNoZWQgPyBtYXRjaGVkWzFdIDogbnVsbDtcbiAgaWYgKHN1ZmZpeCA9PT0gJ3lhbWwnIHx8IHN1ZmZpeCA9PT0gJ3ltbCcpIHtcbiAgICBjb25maWdPYmogPSB5YW1sanMucGFyc2UoZnMucmVhZEZpbGVTeW5jKGxvY2FsQ29uZmlnUGF0aCwgJ3V0ZjgnKSk7XG4gIH0gZWxzZSBpZiAoc3VmZml4ID09PSAnanNvbicpIHtcbiAgICBjb25maWdPYmogPSByZXF1aXJlKFBhdGgucmVzb2x2ZShsb2NhbENvbmZpZ1BhdGgpKTtcbiAgfSBlbHNlIHtcbiAgICByZXR1cm47XG4gIH1cblxuICBfLmFzc2lnbldpdGgoc2V0dGluZywgY29uZmlnT2JqLCAob2JqVmFsdWUsIHNyY1ZhbHVlLCBrZXksIG9iamVjdCwgc291cmNlKSA9PiB7XG4gICAgaWYgKF8uaXNPYmplY3Qob2JqVmFsdWUpICYmICFBcnJheS5pc0FycmF5KG9ialZhbHVlKSkge1xuICAgICAgLy8gV2Ugb25seSBtZXJnZSAybmQgbGV2ZWwgcHJvcGVydGllc1xuICAgICAgcmV0dXJuIF8uYXNzaWduKG9ialZhbHVlLCBzcmNWYWx1ZSk7XG4gICAgfVxuICB9KTtcbn1cblxuZnVuY3Rpb24gbWVyZ2VGcm9tQ2xpQXJncyhzZXR0aW5nOiBEcmNwU2V0dGluZ3MsIGNsaU9wdDogQ2xpT3B0aW9ucykge1xuICBpZiAoIWNsaU9wdC5wcm9wKVxuICAgIHJldHVybjtcbiAgZm9yIChsZXQgcHJvcFBhaXIgb2YgY2xpT3B0LnByb3ApIHtcbiAgICBjb25zdCBwcm9wU2V0ID0gcHJvcFBhaXIuc3BsaXQoJz0nKTtcbiAgICBsZXQgcHJvcFBhdGggPSBwcm9wU2V0WzBdO1xuICAgIGlmIChfLnN0YXJ0c1dpdGgocHJvcFNldFswXSwgJ1snKSlcbiAgICAgIHByb3BQYXRoID0gSlNPTi5wYXJzZShwcm9wU2V0WzBdKTtcbiAgICBsZXQgdmFsdWU7XG4gICAgdHJ5IHtcbiAgICAgIHZhbHVlID0gSlNPTi5wYXJzZShwcm9wU2V0WzFdKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICB2YWx1ZSA9IHByb3BTZXRbMV0gPT09ICd1bmRlZmluZWQnID8gdW5kZWZpbmVkIDogcHJvcFNldFsxXTtcbiAgICB9XG4gICAgXy5zZXQoc2V0dGluZywgcHJvcFBhdGgsIHZhbHVlKTtcbiAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmU6IG5vLWNvbnNvbGVcbiAgICBsb2cuaW5mbyhgW2NvbmZpZ10gc2V0ICR7cHJvcFBhdGh9ID0gJHt2YWx1ZX1gKTtcbiAgfVxufVxuXG5jb25maWcud2ZoU3JjUGF0aCA9IHdmaFNyY1BhdGg7XG5cbmZ1bmN0aW9uIHdmaFNyY1BhdGgoKSB7XG4gIHZhciB3ZmhQYXRoID0gUGF0aC5kaXJuYW1lKHJlcXVpcmUucmVzb2x2ZSgnQHdmaC9wbGluay9wYWNrYWdlLmpzb24nKSk7XG4gIC8vIGxvZy5kZWJ1Zygnd2ZoUGF0aDogJXMnLCB3ZmhQYXRoKTtcbiAgLy8gcmV0dXJuIChQYXRoLmJhc2VuYW1lKFBhdGguZGlybmFtZSh3ZmhQYXRoKSkgIT09ICdub2RlX21vZHVsZXMnKSA/IHdmaFBhdGggOiBmYWxzZTtcbiAgcmV0dXJuIHdmaFBhdGg7XG59XG5cbmZ1bmN0aW9uIHZhbGlkYXRlQ29uZmlnKCkge1xuICBpZiAoIXNldHRpbmcubm9kZVJvdXRlUGF0aCkge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1tjb25maWcgZXJyb3JdOiAnICsgKCdcIm5vZGVSb3V0ZVBhdGhcIiBtdXN0IGJlIHNldCBpbiBjb25maWcueWFtbCcpKTtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY29uZmlndXJhdGlvbicpO1xuICB9XG5cbiAgWydzdGF0aWNBc3NldHNVUkwnLFxuICAgICdub2RlUm91dGVQYXRoJyxcbiAgICAnY29tcGlsZWREaXInXS5mb3JFYWNoKGZ1bmN0aW9uKHByb3ApIHtcbiAgICAgIHNldHRpbmdbcHJvcF0gPSB0cmltVGFpbFNsYXNoKHNldHRpbmdbcHJvcF0pO1xuICAgIH0pO1xuXG4gIHZhciBjb250ZXh0TWFwcGluZyA9IHNldHRpbmcucGFja2FnZUNvbnRleHRQYXRoTWFwcGluZztcbiAgaWYgKGNvbnRleHRNYXBwaW5nKSB7XG4gICAgXy5mb3JPd24oY29udGV4dE1hcHBpbmcsIGZ1bmN0aW9uKHBhdGgsIGtleSkge1xuICAgICAgY29udGV4dE1hcHBpbmdba2V5XSA9IHRyaW1UYWlsU2xhc2gocGF0aCk7XG4gICAgfSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gdHJpbVRhaWxTbGFzaCh1cmw6IHN0cmluZykge1xuICBpZiAodXJsID09PSAnLycpIHtcbiAgICByZXR1cm4gdXJsO1xuICB9XG4gIHJldHVybiBfLmVuZHNXaXRoKHVybCwgJy8nKSA/IHVybC5zdWJzdHJpbmcoMCwgdXJsLmxlbmd0aCAtIDEpIDogdXJsO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVQb3J0KHZhbDogc3RyaW5nIHwgbnVtYmVyKSB7XG4gIGxldCBwb3J0OiBudW1iZXIgPSB0eXBlb2YgdmFsID09PSAnc3RyaW5nJyA/IHBhcnNlSW50KHZhbCwgMTApIDogdmFsO1xuXG4gIGlmIChpc05hTihwb3J0KSkge1xuICAgIC8vIG5hbWVkIHBpcGVcbiAgICByZXR1cm4gdmFsO1xuICB9XG5cbiAgaWYgKHBvcnQgPj0gMCkge1xuICAgIC8vIHBvcnQgbnVtYmVyXG4gICAgcmV0dXJuIHBvcnQ7XG4gIH1cblxuICByZXR1cm4gODA4MDtcbn1cbmV4cG9ydCA9IChjb25maWcgYXMgRHJjcENvbmZpZyk7XG4iXX0=