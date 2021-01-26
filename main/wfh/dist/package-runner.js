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
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapPackagesByType = exports.prepareLazyNodeInjector = exports.initWebInjector = exports.initInjectorForNodePackages = exports.runPackages = exports.runSinglePackage = exports.runServer = exports.readPriorityProperty = exports.isServerPackage = void 0;
/* tslint:disable max-line-length */
const _ = __importStar(require("lodash"));
const lru_cache_1 = __importDefault(require("lru-cache"));
const package_info_gathering_1 = require("./package-mgr/package-info-gathering");
const injector_factory_1 = require("./injector-factory");
const package_priority_helper_1 = require("./package-priority-helper");
const packageNodeInstance_1 = __importDefault(require("./packageNodeInstance"));
const path_1 = __importDefault(require("path"));
const package_utils_1 = require("./package-utils");
const log4js_1 = __importDefault(require("log4js"));
const config_1 = __importDefault(require("./config"));
const package_mgr_1 = require("./package-mgr");
const package_list_helper_1 = require("./package-mgr/package-list-helper");
const chalk_1 = __importDefault(require("chalk"));
const log = log4js_1.default.getLogger('package-runner');
function isServerPackage(pkg) {
    return pkg.json.dr && pkg.json.dr.type && (pkg.json.dr.type === 'server' || pkg.json.dr.type.includes('server'));
}
exports.isServerPackage = isServerPackage;
function readPriorityProperty(json) {
    return _.get(json, 'dr.serverPriority');
}
exports.readPriorityProperty = readPriorityProperty;
function runServer() {
    return __awaiter(this, void 0, void 0, function* () {
        let wsKey = package_mgr_1.workspaceKey(process.cwd());
        wsKey = package_mgr_1.getState().workspaces.has(wsKey) ? wsKey : package_mgr_1.getState().currWorkspace;
        if (wsKey == null) {
            throw new Error('Current directory is not a workspace directory');
        }
        const pkgs = Array.from(package_list_helper_1.packages4WorkspaceKey(wsKey, true))
            .filter(isServerPackage)
            .map(item => item.name);
        const reverseOrderPkgExports = yield runPackages('#activate', pkgs);
        yield new Promise(resolve => setTimeout(resolve, 500));
        return () => __awaiter(this, void 0, void 0, function* () {
            log.info('shutting down');
            for (const { name, exp } of reverseOrderPkgExports) {
                if (_.isFunction(exp.deactivate)) {
                    log.info('deactivate', name);
                    yield Promise.resolve(exp.deactivate());
                }
            }
        });
    });
}
exports.runServer = runServer;
const apiCache = {};
// const packageTree = new DirTree<PackageInstance>();
/**
 * Lazily init injector for packages and run specific package only,
 * no fully scanning or ordering on all packages
 */
function runSinglePackage({ target, args }) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!package_mgr_1.isCwdWorkspace()) {
            return Promise.reject(new Error('Current directory is not a workspace directory'));
        }
        const passinArgv = {};
        // console.log(args);
        // throw new Error('stop');
        for (let i = 0, l = args.length; i < l; i++) {
            const key = args[i];
            if (key.startsWith('-')) {
                if (i === args.length - 1 || args[i + 1].startsWith('-')) {
                    passinArgv[_.trimStart(key, '-')] = true;
                }
                else {
                    passinArgv[key] = args[i + 1];
                    i++;
                }
            }
        }
        prepareLazyNodeInjector(passinArgv);
        const [file, func] = target.split('#');
        const guessingFile = [
            file,
            path_1.default.resolve(file),
            ...config_1.default().packageScopes.map(scope => `@${scope}/${file}`)
        ];
        const foundModule = guessingFile.find(target => {
            try {
                require.resolve(target);
                return true;
            }
            catch (ex) {
                return false;
            }
        });
        if (!foundModule) {
            throw new Error(`Could not find target module from paths like:\n${guessingFile.join('\n')}`);
        }
        const _exports = require(foundModule);
        if (!_.has(_exports, func)) {
            log.error(`There is no export function: ${func}, existing export members are:\n` +
                `${Object.keys(_exports).filter(name => typeof (_exports[name]) === 'function').map(name => name + '()').join('\n')}`);
            return;
        }
        yield Promise.resolve(_exports[func].apply(global, args || []));
    });
}
exports.runSinglePackage = runSinglePackage;
function runPackages(target, includePackages) {
    return __awaiter(this, void 0, void 0, function* () {
        const includeNameSet = new Set(includePackages);
        const pkgExportsInReverOrder = [];
        const [fileToRun, funcToRun] = target.split('#');
        const [packages, proto] = initInjectorForNodePackages(package_info_gathering_1.walkPackages());
        const components = packages.filter(pk => {
            // setupNodeInjectorFor(pk, NodeApi); // All component package should be able to access '__api', even they are not included
            if ((includeNameSet.size === 0 || includeNameSet.has(pk.longName) || includeNameSet.has(pk.shortName))) {
                try {
                    if (fileToRun)
                        require.resolve(pk.longName + '/' + fileToRun);
                    else
                        require.resolve(pk.longName);
                    return true;
                }
                catch (err) {
                    return false;
                }
            }
            return false;
        });
        const packageNamesInOrder = [];
        yield package_priority_helper_1.orderPackages(components.map(item => ({ name: item.longName, priority: _.get(item.json, 'dr.serverPriority') })), pkInstance => {
            packageNamesInOrder.push(pkInstance.name);
            const mod = pkInstance.name + (fileToRun ? '/' + fileToRun : '');
            log.debug('require(%s)', JSON.stringify(mod));
            const fileExports = require(mod);
            pkgExportsInReverOrder.unshift({ name: pkInstance.name, exp: fileExports });
            if (_.isFunction(fileExports[funcToRun])) {
                log.info(funcToRun + ` ${chalk_1.default.cyan(mod)}`);
                return fileExports[funcToRun]();
            }
        });
        proto.eventBus.emit('done', { file: fileToRun, functionName: funcToRun });
        const NodeApi = require('./package-mgr/node-package-api');
        NodeApi.prototype.eventBus.emit('packagesActivated', includeNameSet);
        return pkgExportsInReverOrder;
    });
}
exports.runPackages = runPackages;
function initInjectorForNodePackages(packageInfo) {
    const NodeApi = require('./package-mgr/node-package-api');
    const proto = NodeApi.prototype;
    proto.argv = {};
    proto.packageInfo = packageInfo;
    const cache = new lru_cache_1.default({ max: 20, maxAge: 20000 });
    proto.findPackageByFile = function (file) {
        var found = cache.get(file);
        if (!found) {
            found = packageInfo.dirTree.getAllData(file).pop();
            if (found)
                cache.set(file, found);
        }
        return found;
    };
    proto.getNodeApiForPackage = function (packageInstance) {
        return getApiForPackage(packageInstance, NodeApi);
    };
    packageInfo.allModules.forEach(pk => {
        setupNodeInjectorFor(pk, NodeApi); // All component package should be able to access '__api', even they are not included
    });
    return [packageInfo.allModules, proto];
}
exports.initInjectorForNodePackages = initInjectorForNodePackages;
function initWebInjector(packages, apiPrototype) {
    _.each(packages, pack => {
        injector_factory_1.webInjector.addPackage(pack.longName, pack.path);
    });
    injector_factory_1.webInjector.fromAllPackages()
        .replaceCode('__api', '__api')
        .substitute(/^([^{]*)\{locale\}(.*)$/, (_filePath, match) => match[1] + apiPrototype.getBuildLocale() + match[2]);
    injector_factory_1.webInjector.readInjectFile('module-resolve.browser');
    apiPrototype.browserInjector = injector_factory_1.webInjector;
}
exports.initWebInjector = initWebInjector;
/**
 * Support `import api from '__api';`
 * @param argv
 */
function prepareLazyNodeInjector(argv) {
    const NodeApi = require('./package-mgr/node-package-api');
    const proto = NodeApi.prototype;
    proto.argv = argv || {};
    let packageInfo;
    Object.defineProperty(proto, 'packageInfo', {
        get() {
            if (packageInfo == null)
                packageInfo = package_info_gathering_1.walkPackages();
            return packageInfo;
        }
    });
    proto.findPackageByFile = package_utils_1.createLazyPackageFileFinder();
    proto.getNodeApiForPackage = function (packageInstance) {
        return getApiForPackage(packageInstance, NodeApi);
    };
    injector_factory_1.nodeInjector.fromRoot()
        // .alias('log4js', Path.resolve(config().rootPath, 'node_modules/log4js'))
        .value('__injector', injector_factory_1.nodeInjector)
        .factory('__api', (sourceFilePath) => {
        const packageInstance = proto.findPackageByFile(sourceFilePath);
        if (packageInstance)
            return getApiForPackage(packageInstance, NodeApi);
        return null;
    });
}
exports.prepareLazyNodeInjector = prepareLazyNodeInjector;
function mapPackagesByType(types, onEachPackage) {
    const packagesMap = {};
    types.forEach(type => {
        packagesMap[type] = [];
    });
    for (const pkg of package_utils_1.packages4Workspace()) {
        const name = pkg.name;
        const pkInstance = new packageNodeInstance_1.default({
            moduleName: name,
            shortName: pkg.shortName,
            name,
            longName: name,
            scope: pkg.scope,
            path: pkg.path,
            json: pkg.json,
            realPath: pkg.realPath
        });
        const drTypes = [].concat(_.get(pkg, 'json.dr.type'));
        for (const type of types) {
            if (!_.includes(drTypes, type))
                continue;
            packagesMap[type].push(pkInstance);
        }
        if (onEachPackage) {
            onEachPackage(pkInstance);
        }
    }
    return packagesMap;
}
exports.mapPackagesByType = mapPackagesByType;
function setupNodeInjectorFor(pkInstance, NodeApi) {
    function apiFactory() {
        return getApiForPackage(pkInstance, NodeApi);
    }
    injector_factory_1.nodeInjector.fromDir(pkInstance.realPath)
        .value('__injector', injector_factory_1.nodeInjector)
        .factory('__api', apiFactory);
    injector_factory_1.nodeInjector.fromDir(pkInstance.path)
        .value('__injector', injector_factory_1.nodeInjector)
        .factory('__api', apiFactory);
}
function getApiForPackage(pkInstance, NodeApi) {
    if (_.has(apiCache, pkInstance.longName)) {
        return apiCache[pkInstance.longName];
    }
    const api = new NodeApi(pkInstance.longName, pkInstance);
    // api.constructor = NodeApi;
    pkInstance.api = api;
    apiCache[pkInstance.longName] = api;
    api.default = api; // For ES6 import syntax
    return api;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wYWNrYWdlLXJ1bm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0NBQW9DO0FBQ3BDLDBDQUE0QjtBQUM1QiwwREFBNEI7QUFDNUIsaUZBQStFO0FBQy9FLHlEQUErRDtBQUcvRCx1RUFBMEQ7QUFDMUQsZ0ZBQWdEO0FBQ2hELGdEQUF3QjtBQUV4QixtREFBZ0Y7QUFDaEYsb0RBQTRCO0FBQzVCLHNEQUE4QjtBQUM5QiwrQ0FBa0c7QUFDbEcsMkVBQXdFO0FBQ3hFLGtEQUEwQjtBQUMxQixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBTy9DLFNBQWdCLGVBQWUsQ0FBQyxHQUFpQjtJQUMvQyxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksS0FBSyxRQUFRLElBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBa0IsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztBQUNsSSxDQUFDO0FBRkQsMENBRUM7QUFFRCxTQUFnQixvQkFBb0IsQ0FBQyxJQUFTO0lBQzVDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztBQUMxQyxDQUFDO0FBRkQsb0RBRUM7QUFFRCxTQUFzQixTQUFTOztRQUM3QixJQUFJLEtBQUssR0FBOEIsMEJBQVksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUNuRSxLQUFLLEdBQUcsc0JBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENB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QUN4QyxPQUFPLFFBQVEsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDdEM7SUFFRCxNQUFNLEdBQUcsR0FBRyxJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ3pELDZCQUE2QjtJQUM3QixVQUFVLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztJQUNyQixRQUFRLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEdBQUcsQ0FBQztJQUNwQyxHQUFHLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQyxDQUFDLHdCQUF3QjtJQUMzQyxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBtYXgtbGluZS1sZW5ndGggKi9cbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBMUlUgZnJvbSAnbHJ1LWNhY2hlJztcbmltcG9ydCB7UGFja2FnZUluZm8sIHdhbGtQYWNrYWdlc30gZnJvbSAnLi9wYWNrYWdlLW1nci9wYWNrYWdlLWluZm8tZ2F0aGVyaW5nJztcbmltcG9ydCB7IG5vZGVJbmplY3Rvciwgd2ViSW5qZWN0b3IgfSBmcm9tICcuL2luamVjdG9yLWZhY3RvcnknO1xuaW1wb3J0IF9Ob2RlQXBpIGZyb20gJy4vcGFja2FnZS1tZ3Ivbm9kZS1wYWNrYWdlLWFwaSc7XG5pbXBvcnQgUGFja2FnZUluc3RhbmNlIGZyb20gJy4vcGFja2FnZU5vZGVJbnN0YW5jZSc7XG5pbXBvcnQgeyBvcmRlclBhY2thZ2VzIH0gZnJvbSAnLi9wYWNrYWdlLXByaW9yaXR5LWhlbHBlcic7XG5pbXBvcnQgTm9kZVBhY2thZ2UgZnJvbSAnLi9wYWNrYWdlTm9kZUluc3RhbmNlJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IEV2ZW50cyBmcm9tICdldmVudHMnO1xuaW1wb3J0IHtjcmVhdGVMYXp5UGFja2FnZUZpbGVGaW5kZXIsIHBhY2thZ2VzNFdvcmtzcGFjZX0gZnJvbSAnLi9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHtpc0N3ZFdvcmtzcGFjZSwgZ2V0U3RhdGUsIHdvcmtzcGFjZUtleSwgUGFja2FnZUluZm8gYXMgUGFja2FnZVN0YXRlfSBmcm9tICcuL3BhY2thZ2UtbWdyJztcbmltcG9ydCB7cGFja2FnZXM0V29ya3NwYWNlS2V5fSBmcm9tICcuL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BhY2thZ2UtcnVubmVyJyk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VydmVyUnVubmVyRXZlbnQge1xuICBmaWxlOiBzdHJpbmc7XG4gIGZ1bmN0aW9uTmFtZTogc3RyaW5nO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNTZXJ2ZXJQYWNrYWdlKHBrZzogUGFja2FnZVN0YXRlKSB7XG4gIHJldHVybiBwa2cuanNvbi5kciAmJiBwa2cuanNvbi5kci50eXBlICYmIChwa2cuanNvbi5kci50eXBlID09PSAnc2VydmVyJyB8fCAocGtnLmpzb24uZHIudHlwZSAgYXMgc3RyaW5nW10pLmluY2x1ZGVzKCdzZXJ2ZXInKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkUHJpb3JpdHlQcm9wZXJ0eShqc29uOiBhbnkpIHtcbiAgcmV0dXJuIF8uZ2V0KGpzb24sICdkci5zZXJ2ZXJQcmlvcml0eScpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuU2VydmVyKCkge1xuICBsZXQgd3NLZXk6IHN0cmluZyB8IG51bGwgfCB1bmRlZmluZWQgPSB3b3Jrc3BhY2VLZXkocHJvY2Vzcy5jd2QoKSk7XG4gIHdzS2V5ID0gZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmhhcyh3c0tleSkgPyB3c0tleSA6IGdldFN0YXRlKCkuY3VycldvcmtzcGFjZTtcbiAgaWYgKHdzS2V5ID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0N1cnJlbnQgZGlyZWN0b3J5IGlzIG5vdCBhIHdvcmtzcGFjZSBkaXJlY3RvcnknKTtcbiAgfVxuICBjb25zdCBwa2dzID0gQXJyYXkuZnJvbShwYWNrYWdlczRXb3Jrc3BhY2VLZXkod3NLZXksIHRydWUpKVxuICAuZmlsdGVyKGlzU2VydmVyUGFja2FnZSlcbiAgLm1hcChpdGVtID0+IGl0ZW0ubmFtZSk7XG5cbiAgY29uc3QgcmV2ZXJzZU9yZGVyUGtnRXhwb3J0cyA9IGF3YWl0IHJ1blBhY2thZ2VzKCcjYWN0aXZhdGUnLCBwa2dzKTtcblxuICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgNTAwKSk7XG4gIHJldHVybiBhc3luYyAoKSA9PiB7XG4gICAgbG9nLmluZm8oJ3NodXR0aW5nIGRvd24nKTtcbiAgICBmb3IgKGNvbnN0IHtuYW1lLCBleHB9IG9mIHJldmVyc2VPcmRlclBrZ0V4cG9ydHMpIHtcbiAgICAgIGlmIChfLmlzRnVuY3Rpb24oZXhwLmRlYWN0aXZhdGUpKSB7XG4gICAgICAgIGxvZy5pbmZvKCdkZWFjdGl2YXRlJywgbmFtZSk7XG4gICAgICAgIGF3YWl0IFByb21pc2UucmVzb2x2ZShleHAuZGVhY3RpdmF0ZSgpKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG59XG5cbmNvbnN0IGFwaUNhY2hlOiB7W25hbWU6IHN0cmluZ106IGFueX0gPSB7fTtcbi8vIGNvbnN0IHBhY2thZ2VUcmVlID0gbmV3IERpclRyZWU8UGFja2FnZUluc3RhbmNlPigpO1xuXG4vKipcbiAqIExhemlseSBpbml0IGluamVjdG9yIGZvciBwYWNrYWdlcyBhbmQgcnVuIHNwZWNpZmljIHBhY2thZ2Ugb25seSxcbiAqIG5vIGZ1bGx5IHNjYW5uaW5nIG9yIG9yZGVyaW5nIG9uIGFsbCBwYWNrYWdlc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuU2luZ2xlUGFja2FnZSh7dGFyZ2V0LCBhcmdzfToge3RhcmdldDogc3RyaW5nLCBhcmdzOiBzdHJpbmdbXX0pIHtcbiAgaWYgKCFpc0N3ZFdvcmtzcGFjZSgpKSB7XG4gICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcignQ3VycmVudCBkaXJlY3RvcnkgaXMgbm90IGEgd29ya3NwYWNlIGRpcmVjdG9yeScpKTtcbiAgfVxuICBjb25zdCBwYXNzaW5Bcmd2ID0ge307XG4gIC8vIGNvbnNvbGUubG9nKGFyZ3MpO1xuICAvLyB0aHJvdyBuZXcgRXJyb3IoJ3N0b3AnKTtcbiAgZm9yIChsZXQgaSA9IDAsIGwgPSBhcmdzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGNvbnN0IGtleSA9IGFyZ3NbaV07XG4gICAgaWYgKGtleS5zdGFydHNXaXRoKCctJykpIHtcbiAgICAgIGlmIChpID09PSBhcmdzLmxlbmd0aCAtIDEgfHwgYXJnc1tpICsgMV0uc3RhcnRzV2l0aCgnLScpKSB7XG4gICAgICAgIHBhc3NpbkFyZ3ZbXy50cmltU3RhcnQoa2V5LCAnLScpXSA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwYXNzaW5Bcmd2W2tleV0gPSBhcmdzW2kgKyAxXTtcbiAgICAgICAgaSsrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBwcmVwYXJlTGF6eU5vZGVJbmplY3RvcihwYXNzaW5Bcmd2KTtcbiAgY29uc3QgW2ZpbGUsIGZ1bmNdID0gdGFyZ2V0LnNwbGl0KCcjJyk7XG5cbiAgY29uc3QgZ3Vlc3NpbmdGaWxlOiBzdHJpbmdbXSA9IFtcbiAgICBmaWxlLFxuICAgIFBhdGgucmVzb2x2ZShmaWxlKSxcbiAgICAuLi4oY29uZmlnKCkucGFja2FnZVNjb3BlcyBhcyBzdHJpbmdbXSkubWFwKHNjb3BlID0+IGBAJHtzY29wZX0vJHtmaWxlfWApXG4gIF07XG4gIGNvbnN0IGZvdW5kTW9kdWxlID0gZ3Vlc3NpbmdGaWxlLmZpbmQodGFyZ2V0ID0+IHtcbiAgICB0cnkge1xuICAgICAgcmVxdWlyZS5yZXNvbHZlKHRhcmdldCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfSk7XG5cbiAgaWYgKCFmb3VuZE1vZHVsZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgdGFyZ2V0IG1vZHVsZSBmcm9tIHBhdGhzIGxpa2U6XFxuJHtndWVzc2luZ0ZpbGUuam9pbignXFxuJyl9YCk7XG4gIH1cbiAgY29uc3QgX2V4cG9ydHMgPSByZXF1aXJlKGZvdW5kTW9kdWxlKTtcbiAgaWYgKCFfLmhhcyhfZXhwb3J0cywgZnVuYykpIHtcbiAgICBsb2cuZXJyb3IoYFRoZXJlIGlzIG5vIGV4cG9ydCBmdW5jdGlvbjogJHtmdW5jfSwgZXhpc3RpbmcgZXhwb3J0IG1lbWJlcnMgYXJlOlxcbmAgK1xuICAgIGAke09iamVjdC5rZXlzKF9leHBvcnRzKS5maWx0ZXIobmFtZSA9PiB0eXBlb2YgKF9leHBvcnRzW25hbWVdKSA9PT0gJ2Z1bmN0aW9uJykubWFwKG5hbWUgPT4gbmFtZSArICcoKScpLmpvaW4oJ1xcbicpfWApO1xuICAgIHJldHVybjtcbiAgfVxuICBhd2FpdCBQcm9taXNlLnJlc29sdmUoX2V4cG9ydHNbZnVuY10uYXBwbHkoZ2xvYmFsLCBhcmdzIHx8IFtdKSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5QYWNrYWdlcyh0YXJnZXQ6IHN0cmluZywgaW5jbHVkZVBhY2thZ2VzOiBJdGVyYWJsZTxzdHJpbmc+KTogUHJvbWlzZTx7bmFtZTogc3RyaW5nOyBleHA6IGFueX1bXT4ge1xuICBjb25zdCBpbmNsdWRlTmFtZVNldCA9IG5ldyBTZXQ8c3RyaW5nPihpbmNsdWRlUGFja2FnZXMpO1xuICBjb25zdCBwa2dFeHBvcnRzSW5SZXZlck9yZGVyOiB7bmFtZTogc3RyaW5nOyBleHA6IGFueX1bXSA9IFtdO1xuXG4gIGNvbnN0IFtmaWxlVG9SdW4sIGZ1bmNUb1J1bl0gPSAodGFyZ2V0IGFzIHN0cmluZykuc3BsaXQoJyMnKTtcbiAgY29uc3QgW3BhY2thZ2VzLCBwcm90b10gPSBpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMod2Fsa1BhY2thZ2VzKCkpO1xuICBjb25zdCBjb21wb25lbnRzID0gcGFja2FnZXMuZmlsdGVyKHBrID0+IHtcbiAgICAvLyBzZXR1cE5vZGVJbmplY3RvckZvcihwaywgTm9kZUFwaSk7IC8vIEFsbCBjb21wb25lbnQgcGFja2FnZSBzaG91bGQgYmUgYWJsZSB0byBhY2Nlc3MgJ19fYXBpJywgZXZlbiB0aGV5IGFyZSBub3QgaW5jbHVkZWRcbiAgICBpZiAoKGluY2x1ZGVOYW1lU2V0LnNpemUgPT09IDAgfHwgaW5jbHVkZU5hbWVTZXQuaGFzKHBrLmxvbmdOYW1lKSB8fCBpbmNsdWRlTmFtZVNldC5oYXMocGsuc2hvcnROYW1lKSkpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmIChmaWxlVG9SdW4pXG4gICAgICAgICAgcmVxdWlyZS5yZXNvbHZlKHBrLmxvbmdOYW1lICsgJy8nICsgZmlsZVRvUnVuKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHJlcXVpcmUucmVzb2x2ZShway5sb25nTmFtZSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcblxuICBjb25zdCBwYWNrYWdlTmFtZXNJbk9yZGVyOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGF3YWl0IG9yZGVyUGFja2FnZXMoY29tcG9uZW50cy5tYXAoaXRlbSA9PiAoe25hbWU6IGl0ZW0ubG9uZ05hbWUsIHByaW9yaXR5OiBfLmdldChpdGVtLmpzb24sICdkci5zZXJ2ZXJQcmlvcml0eScpfSkpLFxuICBwa0luc3RhbmNlICA9PiB7XG4gICAgcGFja2FnZU5hbWVzSW5PcmRlci5wdXNoKHBrSW5zdGFuY2UubmFtZSk7XG4gICAgY29uc3QgbW9kID0gcGtJbnN0YW5jZS5uYW1lICsgKCBmaWxlVG9SdW4gPyAnLycgKyBmaWxlVG9SdW4gOiAnJyk7XG4gICAgbG9nLmRlYnVnKCdyZXF1aXJlKCVzKScsIEpTT04uc3RyaW5naWZ5KG1vZCkpO1xuICAgIGNvbnN0IGZpbGVFeHBvcnRzID0gcmVxdWlyZShtb2QpO1xuICAgIHBrZ0V4cG9ydHNJblJldmVyT3JkZXIudW5zaGlmdCh7bmFtZTogcGtJbnN0YW5jZS5uYW1lLCBleHA6IGZpbGVFeHBvcnRzfSk7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihmaWxlRXhwb3J0c1tmdW5jVG9SdW5dKSkge1xuICAgICAgbG9nLmluZm8oZnVuY1RvUnVuICsgYCAke2NoYWxrLmN5YW4obW9kKX1gKTtcbiAgICAgIHJldHVybiBmaWxlRXhwb3J0c1tmdW5jVG9SdW5dKCk7XG4gICAgfVxuICB9KTtcbiAgKHByb3RvLmV2ZW50QnVzIGFzIEV2ZW50cy5FdmVudEVtaXR0ZXIpLmVtaXQoJ2RvbmUnLCB7ZmlsZTogZmlsZVRvUnVuLCBmdW5jdGlvbk5hbWU6IGZ1bmNUb1J1bn0gYXMgU2VydmVyUnVubmVyRXZlbnQpO1xuICBjb25zdCBOb2RlQXBpOiB0eXBlb2YgX05vZGVBcGkgPSByZXF1aXJlKCcuL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGknKTtcbiAgTm9kZUFwaS5wcm90b3R5cGUuZXZlbnRCdXMuZW1pdCgncGFja2FnZXNBY3RpdmF0ZWQnLCBpbmNsdWRlTmFtZVNldCk7XG4gIHJldHVybiBwa2dFeHBvcnRzSW5SZXZlck9yZGVyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaW5pdEluamVjdG9yRm9yTm9kZVBhY2thZ2VzKHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbyk6XG4gIFtQYWNrYWdlSW5zdGFuY2VbXSwgX05vZGVBcGldIHtcbiAgY29uc3QgTm9kZUFwaTogdHlwZW9mIF9Ob2RlQXBpID0gcmVxdWlyZSgnLi9wYWNrYWdlLW1nci9ub2RlLXBhY2thZ2UtYXBpJyk7XG4gIGNvbnN0IHByb3RvID0gTm9kZUFwaS5wcm90b3R5cGU7XG4gIHByb3RvLmFyZ3YgPSB7fTtcbiAgcHJvdG8ucGFja2FnZUluZm8gPSBwYWNrYWdlSW5mbztcbiAgY29uc3QgY2FjaGUgPSBuZXcgTFJVPHN0cmluZywgUGFja2FnZUluc3RhbmNlPih7bWF4OiAyMCwgbWF4QWdlOiAyMDAwMH0pO1xuICBwcm90by5maW5kUGFja2FnZUJ5RmlsZSA9IGZ1bmN0aW9uKGZpbGU6IHN0cmluZyk6IFBhY2thZ2VJbnN0YW5jZSB8IHVuZGVmaW5lZCB7XG4gICAgdmFyIGZvdW5kID0gY2FjaGUuZ2V0KGZpbGUpO1xuICAgIGlmICghZm91bmQpIHtcbiAgICAgIGZvdW5kID0gcGFja2FnZUluZm8uZGlyVHJlZS5nZXRBbGxEYXRhKGZpbGUpLnBvcCgpO1xuICAgICAgaWYgKGZvdW5kKVxuICAgICAgICBjYWNoZS5zZXQoZmlsZSwgZm91bmQpO1xuICAgIH1cbiAgICByZXR1cm4gZm91bmQ7XG4gIH07XG4gIHByb3RvLmdldE5vZGVBcGlGb3JQYWNrYWdlID0gZnVuY3Rpb24ocGFja2FnZUluc3RhbmNlOiBQYWNrYWdlSW5zdGFuY2UpIHtcbiAgICByZXR1cm4gZ2V0QXBpRm9yUGFja2FnZShwYWNrYWdlSW5zdGFuY2UsIE5vZGVBcGkpO1xuICB9O1xuICBwYWNrYWdlSW5mby5hbGxNb2R1bGVzLmZvckVhY2gocGsgPT4ge1xuICAgIHNldHVwTm9kZUluamVjdG9yRm9yKHBrLCBOb2RlQXBpKTsgLy8gQWxsIGNvbXBvbmVudCBwYWNrYWdlIHNob3VsZCBiZSBhYmxlIHRvIGFjY2VzcyAnX19hcGknLCBldmVuIHRoZXkgYXJlIG5vdCBpbmNsdWRlZFxuICB9KTtcbiAgcmV0dXJuIFtwYWNrYWdlSW5mby5hbGxNb2R1bGVzLCBwcm90b107XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbml0V2ViSW5qZWN0b3IocGFja2FnZXM6IFBhY2thZ2VJbnN0YW5jZVtdLCBhcGlQcm90b3R5cGU6IGFueSkge1xuICBfLmVhY2gocGFja2FnZXMsIHBhY2sgPT4ge1xuICAgIHdlYkluamVjdG9yLmFkZFBhY2thZ2UocGFjay5sb25nTmFtZSwgcGFjay5wYXRoKTtcbiAgfSk7XG4gIHdlYkluamVjdG9yLmZyb21BbGxQYWNrYWdlcygpXG4gIC5yZXBsYWNlQ29kZSgnX19hcGknLCAnX19hcGknKVxuICAuc3Vic3RpdHV0ZSgvXihbXntdKilcXHtsb2NhbGVcXH0oLiopJC8sXG4gICAgKF9maWxlUGF0aDogc3RyaW5nLCBtYXRjaDogUmVnRXhwRXhlY0FycmF5KSA9PiBtYXRjaFsxXSArIGFwaVByb3RvdHlwZS5nZXRCdWlsZExvY2FsZSgpICsgbWF0Y2hbMl0pO1xuXG4gIHdlYkluamVjdG9yLnJlYWRJbmplY3RGaWxlKCdtb2R1bGUtcmVzb2x2ZS5icm93c2VyJyk7XG4gIGFwaVByb3RvdHlwZS5icm93c2VySW5qZWN0b3IgPSB3ZWJJbmplY3Rvcjtcbn1cblxuLyoqXG4gKiBTdXBwb3J0IGBpbXBvcnQgYXBpIGZyb20gJ19fYXBpJztgXG4gKiBAcGFyYW0gYXJndiBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByZXBhcmVMYXp5Tm9kZUluamVjdG9yKGFyZ3Y/OiB7W2tleTogc3RyaW5nXTogYW55fSkge1xuICBjb25zdCBOb2RlQXBpOiB0eXBlb2YgX05vZGVBcGkgPSByZXF1aXJlKCcuL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGknKTtcbiAgY29uc3QgcHJvdG8gPSBOb2RlQXBpLnByb3RvdHlwZTtcbiAgcHJvdG8uYXJndiA9IGFyZ3YgfHwge307XG4gIGxldCBwYWNrYWdlSW5mbzogUGFja2FnZUluZm87XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCAncGFja2FnZUluZm8nLCB7XG4gICAgZ2V0KCkge1xuICAgICAgaWYgKHBhY2thZ2VJbmZvID09IG51bGwpXG4gICAgICAgIHBhY2thZ2VJbmZvID0gd2Fsa1BhY2thZ2VzKCk7XG4gICAgICByZXR1cm4gcGFja2FnZUluZm87XG4gICAgfVxuICB9KTtcbiAgcHJvdG8uZmluZFBhY2thZ2VCeUZpbGUgPSBjcmVhdGVMYXp5UGFja2FnZUZpbGVGaW5kZXIoKTtcbiAgcHJvdG8uZ2V0Tm9kZUFwaUZvclBhY2thZ2UgPSBmdW5jdGlvbihwYWNrYWdlSW5zdGFuY2U6IE5vZGVQYWNrYWdlKSB7XG4gICAgcmV0dXJuIGdldEFwaUZvclBhY2thZ2UocGFja2FnZUluc3RhbmNlLCBOb2RlQXBpKTtcbiAgfTtcbiAgbm9kZUluamVjdG9yLmZyb21Sb290KClcbiAgLy8gLmFsaWFzKCdsb2c0anMnLCBQYXRoLnJlc29sdmUoY29uZmlnKCkucm9vdFBhdGgsICdub2RlX21vZHVsZXMvbG9nNGpzJykpXG4gIC52YWx1ZSgnX19pbmplY3RvcicsIG5vZGVJbmplY3RvcilcbiAgLmZhY3RvcnkoJ19fYXBpJywgKHNvdXJjZUZpbGVQYXRoOiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCBwYWNrYWdlSW5zdGFuY2UgPSBwcm90by5maW5kUGFja2FnZUJ5RmlsZShzb3VyY2VGaWxlUGF0aCk7XG4gICAgaWYgKHBhY2thZ2VJbnN0YW5jZSlcbiAgICAgIHJldHVybiBnZXRBcGlGb3JQYWNrYWdlKHBhY2thZ2VJbnN0YW5jZSwgTm9kZUFwaSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWFwUGFja2FnZXNCeVR5cGUodHlwZXM6IHN0cmluZ1tdLCBvbkVhY2hQYWNrYWdlOiAobm9kZVBhY2thZ2U6IE5vZGVQYWNrYWdlKSA9PiB2b2lkKSB7XG4gIGNvbnN0IHBhY2thZ2VzTWFwOiB7W3R5cGU6IHN0cmluZ106IE5vZGVQYWNrYWdlW119ID0ge307XG4gIHR5cGVzLmZvckVhY2godHlwZSA9PiB7XG4gICAgcGFja2FnZXNNYXBbdHlwZV0gPSBbXTtcbiAgfSk7XG5cbiAgZm9yIChjb25zdCBwa2cgb2YgcGFja2FnZXM0V29ya3NwYWNlKCkpIHtcbiAgICBjb25zdCBuYW1lID0gcGtnLm5hbWU7XG4gICAgY29uc3QgcGtJbnN0YW5jZSA9IG5ldyBOb2RlUGFja2FnZSh7XG4gICAgICBtb2R1bGVOYW1lOiBuYW1lLFxuICAgICAgc2hvcnROYW1lOiBwa2cuc2hvcnROYW1lLFxuICAgICAgbmFtZSxcbiAgICAgIGxvbmdOYW1lOiBuYW1lLFxuICAgICAgc2NvcGU6IHBrZy5zY29wZSxcbiAgICAgIHBhdGg6IHBrZy5wYXRoLFxuICAgICAganNvbjogcGtnLmpzb24sXG4gICAgICByZWFsUGF0aDogcGtnLnJlYWxQYXRoXG4gICAgfSk7XG4gICAgY29uc3QgZHJUeXBlcyA9IChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KF8uZ2V0KHBrZywgJ2pzb24uZHIudHlwZScpKTtcbiAgICBmb3IgKGNvbnN0IHR5cGUgb2YgdHlwZXMpIHtcbiAgICAgIGlmICghXy5pbmNsdWRlcyhkclR5cGVzLCB0eXBlKSlcbiAgICAgICAgY29udGludWU7XG4gICAgICBwYWNrYWdlc01hcFt0eXBlXS5wdXNoKHBrSW5zdGFuY2UpO1xuICAgIH1cbiAgICBpZiAob25FYWNoUGFja2FnZSkge1xuICAgICAgb25FYWNoUGFja2FnZShwa0luc3RhbmNlKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHBhY2thZ2VzTWFwO1xufVxuXG5mdW5jdGlvbiBzZXR1cE5vZGVJbmplY3RvckZvcihwa0luc3RhbmNlOiBQYWNrYWdlSW5zdGFuY2UsIE5vZGVBcGk6IHR5cGVvZiBfTm9kZUFwaSApIHtcbiAgZnVuY3Rpb24gYXBpRmFjdG9yeSgpIHtcbiAgICByZXR1cm4gZ2V0QXBpRm9yUGFja2FnZShwa0luc3RhbmNlLCBOb2RlQXBpKTtcbiAgfVxuICBub2RlSW5qZWN0b3IuZnJvbURpcihwa0luc3RhbmNlLnJlYWxQYXRoKVxuICAudmFsdWUoJ19faW5qZWN0b3InLCBub2RlSW5qZWN0b3IpXG4gIC5mYWN0b3J5KCdfX2FwaScsIGFwaUZhY3RvcnkpO1xuICBub2RlSW5qZWN0b3IuZnJvbURpcihwa0luc3RhbmNlLnBhdGgpXG4gIC52YWx1ZSgnX19pbmplY3RvcicsIG5vZGVJbmplY3RvcilcbiAgLmZhY3RvcnkoJ19fYXBpJywgYXBpRmFjdG9yeSk7XG59XG5cbmZ1bmN0aW9uIGdldEFwaUZvclBhY2thZ2UocGtJbnN0YW5jZTogTm9kZVBhY2thZ2UsIE5vZGVBcGk6IHR5cGVvZiBfTm9kZUFwaSkge1xuICBpZiAoXy5oYXMoYXBpQ2FjaGUsIHBrSW5zdGFuY2UubG9uZ05hbWUpKSB7XG4gICAgcmV0dXJuIGFwaUNhY2hlW3BrSW5zdGFuY2UubG9uZ05hbWVdO1xuICB9XG5cbiAgY29uc3QgYXBpID0gbmV3IE5vZGVBcGkocGtJbnN0YW5jZS5sb25nTmFtZSwgcGtJbnN0YW5jZSk7XG4gIC8vIGFwaS5jb25zdHJ1Y3RvciA9IE5vZGVBcGk7XG4gIHBrSW5zdGFuY2UuYXBpID0gYXBpO1xuICBhcGlDYWNoZVtwa0luc3RhbmNlLmxvbmdOYW1lXSA9IGFwaTtcbiAgYXBpLmRlZmF1bHQgPSBhcGk7IC8vIEZvciBFUzYgaW1wb3J0IHN5bnRheFxuICByZXR1cm4gYXBpO1xufVxuIl19