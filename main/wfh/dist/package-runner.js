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
exports.mapPackagesByType = exports.prepareLazyNodeInjector = exports.initInjectorForNodePackages = exports.runPackages = exports.runSinglePackage = exports.runServer = exports.readPriorityProperty = exports.isServerPackage = void 0;
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
const misc_1 = require("./utils/misc");
const operators_1 = require("rxjs/operators");
const log = log4js_1.default.getLogger('plink.package-runner');
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
        initInjectorForNodePackages();
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
        const [packages, proto] = initInjectorForNodePackages();
        const components = packages.filter(pk => {
            // setupRequireInjects(pk, NodeApi); // All component package should be able to access '__api', even they are not included
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
/**
 * So that we can use `import api from '__plink'` anywhere in our package
 */
function initInjectorForNodePackages() {
    const packageInfo = package_info_gathering_1.walkPackages();
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
    proto.browserInjector = injector_factory_1.webInjector;
    packageInfo.allModules.forEach(pk => {
        setupRequireInjects(pk, NodeApi); // All component package should be able to access '__api', even they are not included
    });
    // console.log('>>>>>>>>>>>>>>>>>>')
    config_1.default.configureStore.pipe(operators_1.filter(setting => setting != null), operators_1.tap(setting => {
        // console.log('>>>>>>>>>++++++>>>>>>>>>')
        injector_factory_1.nodeInjector.readInjectFile();
        injector_factory_1.webInjector.readInjectFile('module-resolve.browser');
    })).subscribe();
    return [packageInfo.allModules, proto];
}
exports.initInjectorForNodePackages = initInjectorForNodePackages;
// function initWebInjector(packages: PackageInstance[], apiPrototype: any) {
//   _.each(packages, pack => {
//     webInjector.addPackage(pack.longName, pack.realPath);
//   });
//   webInjector.fromAllPackages()
//   .replaceCode('__api', '__api')
//   .substitute(/^([^{]*)\{locale\}(.*)$/,
//     (_filePath: string, match: RegExpExecArray) => match[1] + apiPrototype.getBuildLocale() + match[2]);
//   webInjector.readInjectFile('module-resolve.browser');
//   apiPrototype.browserInjector = webInjector;
// }
/**
 * @deprecated
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
function setupRequireInjects(pkInstance, NodeApi) {
    function apiFactory() {
        return getApiForPackage(pkInstance, NodeApi);
    }
    injector_factory_1.nodeInjector.fromDir(pkInstance.realPath)
        .value('__injector', injector_factory_1.nodeInjector)
        .factory('__api', apiFactory)
        .factory('__plink', apiFactory);
    injector_factory_1.webInjector.fromDir(pkInstance.realPath)
        .replaceCode('__api', '__api');
    // .substitute(/^([^{]*)\{locale\}(.*)$/,
    //   (_filePath: string, match: RegExpExecArray) => match[1] + apiPrototype.getBuildLocale() + match[2]);
    const symlinkDir = misc_1.getSymlinkForPackage(pkInstance.name);
    if (symlinkDir) {
        injector_factory_1.nodeInjector.fromDir(symlinkDir)
            .value('__injector', injector_factory_1.nodeInjector)
            .factory('__plink', apiFactory);
        injector_factory_1.webInjector.fromDir(symlinkDir)
            .replaceCode('__api', '__api');
    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wYWNrYWdlLXJ1bm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0NBQW9DO0FBQ3BDLDBDQUE0QjtBQUM1QiwwREFBNEI7QUFDNUIsaUZBQStFO0FBQy9FLHlEQUErRDtBQUcvRCx1RUFBMEQ7QUFDMUQsZ0ZBQWdEO0FBQ2hELGdEQUF3QjtBQUV4QixtREFBZ0Y7QUFDaEYsb0RBQTRCO0FBQzVCLHNEQUE4QjtBQUM5QiwrQ0FBa0c7QUFDbEcsMkVBQXdFO0FBQ3hFLGtEQUEwQjtBQUMxQix1Q0FBa0Q7QUFDbEQsOENBQTJDO0FBRTNDLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLHNCQUFzQixDQUFDLENBQUM7QUFPckQsU0FBZ0IsZUFBZSxDQUFDLEdBQWlCO0lBQy9DLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxLQUFLLFFBQVEsSUFBSyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFrQixDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0FBQ2xJLENBQUM7QUFGRCwwQ0FFQztBQUVELFNBQWdCLG9CQUFvQixDQUFDLElBQVM7SUFDNUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO0FBQzFDLENBQUM7QUFGRCxvREFFQztBQUVELFNBQXNCLFNBQVM7O1FBQzdCLElBQUksS0FBSyxHQUE4QiwwQkFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQ25FLEtBQUssR0FBRyxzQkFBUSxFQUFFLENBQUMsVUFBVSxD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QUFDO2FBQy9CLEtBQUssQ0FBQyxZQUFZLEVBQUUsK0JBQVksQ0FBQzthQUNqQyxPQUFPLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRWhDLDhCQUFXLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQzthQUM5QixXQUFXLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0tBQ2hDO0FBQ0gsQ0FBQztBQUVELFNBQVMsZ0JBQWdCLENBQUMsVUFBdUIsRUFBRSxPQUF3QjtJQUN6RSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxRQUFRLENBQUMsRUFBRTtRQUN4QyxPQUFPLFFBQVEsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDdEM7SUFFRCxNQUFNLEdBQUcsR0FBRyxJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ3pELDZCQUE2QjtJQUM3QixVQUFVLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztJQUNyQixRQUFRLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEdBQUcsQ0FBQztJQUNwQyxHQUFHLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQyxDQUFDLHdCQUF3QjtJQUMzQyxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBtYXgtbGluZS1sZW5ndGggKi9cbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBMUlUgZnJvbSAnbHJ1LWNhY2hlJztcbmltcG9ydCB7UGFja2FnZUluZm8sIHdhbGtQYWNrYWdlc30gZnJvbSAnLi9wYWNrYWdlLW1nci9wYWNrYWdlLWluZm8tZ2F0aGVyaW5nJztcbmltcG9ydCB7IG5vZGVJbmplY3Rvciwgd2ViSW5qZWN0b3IgfSBmcm9tICcuL2luamVjdG9yLWZhY3RvcnknO1xuaW1wb3J0IF9Ob2RlQXBpIGZyb20gJy4vcGFja2FnZS1tZ3Ivbm9kZS1wYWNrYWdlLWFwaSc7XG5pbXBvcnQgUGFja2FnZUluc3RhbmNlIGZyb20gJy4vcGFja2FnZU5vZGVJbnN0YW5jZSc7XG5pbXBvcnQgeyBvcmRlclBhY2thZ2VzIH0gZnJvbSAnLi9wYWNrYWdlLXByaW9yaXR5LWhlbHBlcic7XG5pbXBvcnQgTm9kZVBhY2thZ2UgZnJvbSAnLi9wYWNrYWdlTm9kZUluc3RhbmNlJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IEV2ZW50cyBmcm9tICdldmVudHMnO1xuaW1wb3J0IHtjcmVhdGVMYXp5UGFja2FnZUZpbGVGaW5kZXIsIHBhY2thZ2VzNFdvcmtzcGFjZX0gZnJvbSAnLi9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHtpc0N3ZFdvcmtzcGFjZSwgZ2V0U3RhdGUsIHdvcmtzcGFjZUtleSwgUGFja2FnZUluZm8gYXMgUGFja2FnZVN0YXRlfSBmcm9tICcuL3BhY2thZ2UtbWdyJztcbmltcG9ydCB7cGFja2FnZXM0V29ya3NwYWNlS2V5fSBmcm9tICcuL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCB7Z2V0U3ltbGlua0ZvclBhY2thZ2V9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5pbXBvcnQge2ZpbHRlciwgdGFwfSBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLnBhY2thZ2UtcnVubmVyJyk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VydmVyUnVubmVyRXZlbnQge1xuICBmaWxlOiBzdHJpbmc7XG4gIGZ1bmN0aW9uTmFtZTogc3RyaW5nO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNTZXJ2ZXJQYWNrYWdlKHBrZzogUGFja2FnZVN0YXRlKSB7XG4gIHJldHVybiBwa2cuanNvbi5kciAmJiBwa2cuanNvbi5kci50eXBlICYmIChwa2cuanNvbi5kci50eXBlID09PSAnc2VydmVyJyB8fCAocGtnLmpzb24uZHIudHlwZSAgYXMgc3RyaW5nW10pLmluY2x1ZGVzKCdzZXJ2ZXInKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkUHJpb3JpdHlQcm9wZXJ0eShqc29uOiBhbnkpIHtcbiAgcmV0dXJuIF8uZ2V0KGpzb24sICdkci5zZXJ2ZXJQcmlvcml0eScpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuU2VydmVyKCkge1xuICBsZXQgd3NLZXk6IHN0cmluZyB8IG51bGwgfCB1bmRlZmluZWQgPSB3b3Jrc3BhY2VLZXkocHJvY2Vzcy5jd2QoKSk7XG4gIHdzS2V5ID0gZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmhhcyh3c0tleSkgPyB3c0tleSA6IGdldFN0YXRlKCkuY3VycldvcmtzcGFjZTtcbiAgaWYgKHdzS2V5ID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0N1cnJlbnQgZGlyZWN0b3J5IGlzIG5vdCBhIHdvcmtzcGFjZSBkaXJlY3RvcnknKTtcbiAgfVxuICBjb25zdCBwa2dzID0gQXJyYXkuZnJvbShwYWNrYWdlczRXb3Jrc3BhY2VLZXkod3NLZXksIHRydWUpKVxuICAuZmlsdGVyKGlzU2VydmVyUGFja2FnZSlcbiAgLm1hcChpdGVtID0+IGl0ZW0ubmFtZSk7XG5cbiAgY29uc3QgcmV2ZXJzZU9yZGVyUGtnRXhwb3J0cyA9IGF3YWl0IHJ1blBhY2thZ2VzKCcjYWN0aXZhdGUnLCBwa2dzKTtcblxuICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgNTAwKSk7XG4gIHJldHVybiBhc3luYyAoKSA9PiB7XG4gICAgbG9nLmluZm8oJ3NodXR0aW5nIGRvd24nKTtcbiAgICBmb3IgKGNvbnN0IHtuYW1lLCBleHB9IG9mIHJldmVyc2VPcmRlclBrZ0V4cG9ydHMpIHtcbiAgICAgIGlmIChfLmlzRnVuY3Rpb24oZXhwLmRlYWN0aXZhdGUpKSB7XG4gICAgICAgIGxvZy5pbmZvKCdkZWFjdGl2YXRlJywgbmFtZSk7XG4gICAgICAgIGF3YWl0IFByb21pc2UucmVzb2x2ZShleHAuZGVhY3RpdmF0ZSgpKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG59XG5cbmNvbnN0IGFwaUNhY2hlOiB7W25hbWU6IHN0cmluZ106IGFueX0gPSB7fTtcbi8vIGNvbnN0IHBhY2thZ2VUcmVlID0gbmV3IERpclRyZWU8UGFja2FnZUluc3RhbmNlPigpO1xuXG4vKipcbiAqIExhemlseSBpbml0IGluamVjdG9yIGZvciBwYWNrYWdlcyBhbmQgcnVuIHNwZWNpZmljIHBhY2thZ2Ugb25seSxcbiAqIG5vIGZ1bGx5IHNjYW5uaW5nIG9yIG9yZGVyaW5nIG9uIGFsbCBwYWNrYWdlc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuU2luZ2xlUGFja2FnZSh7dGFyZ2V0LCBhcmdzfToge3RhcmdldDogc3RyaW5nLCBhcmdzOiBzdHJpbmdbXX0pIHtcbiAgaWYgKCFpc0N3ZFdvcmtzcGFjZSgpKSB7XG4gICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcignQ3VycmVudCBkaXJlY3RvcnkgaXMgbm90IGEgd29ya3NwYWNlIGRpcmVjdG9yeScpKTtcbiAgfVxuICBjb25zdCBwYXNzaW5Bcmd2ID0ge307XG4gIC8vIGNvbnNvbGUubG9nKGFyZ3MpO1xuICAvLyB0aHJvdyBuZXcgRXJyb3IoJ3N0b3AnKTtcbiAgZm9yIChsZXQgaSA9IDAsIGwgPSBhcmdzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGNvbnN0IGtleSA9IGFyZ3NbaV07XG4gICAgaWYgKGtleS5zdGFydHNXaXRoKCctJykpIHtcbiAgICAgIGlmIChpID09PSBhcmdzLmxlbmd0aCAtIDEgfHwgYXJnc1tpICsgMV0uc3RhcnRzV2l0aCgnLScpKSB7XG4gICAgICAgIHBhc3NpbkFyZ3ZbXy50cmltU3RhcnQoa2V5LCAnLScpXSA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwYXNzaW5Bcmd2W2tleV0gPSBhcmdzW2kgKyAxXTtcbiAgICAgICAgaSsrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMoKTtcbiAgY29uc3QgW2ZpbGUsIGZ1bmNdID0gdGFyZ2V0LnNwbGl0KCcjJyk7XG5cbiAgY29uc3QgZ3Vlc3NpbmdGaWxlOiBzdHJpbmdbXSA9IFtcbiAgICBmaWxlLFxuICAgIFBhdGgucmVzb2x2ZShmaWxlKSxcbiAgICAuLi4oY29uZmlnKCkucGFja2FnZVNjb3BlcyBhcyBzdHJpbmdbXSkubWFwKHNjb3BlID0+IGBAJHtzY29wZX0vJHtmaWxlfWApXG4gIF07XG4gIGNvbnN0IGZvdW5kTW9kdWxlID0gZ3Vlc3NpbmdGaWxlLmZpbmQodGFyZ2V0ID0+IHtcbiAgICB0cnkge1xuICAgICAgcmVxdWlyZS5yZXNvbHZlKHRhcmdldCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfSk7XG5cbiAgaWYgKCFmb3VuZE1vZHVsZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgdGFyZ2V0IG1vZHVsZSBmcm9tIHBhdGhzIGxpa2U6XFxuJHtndWVzc2luZ0ZpbGUuam9pbignXFxuJyl9YCk7XG4gIH1cbiAgY29uc3QgX2V4cG9ydHMgPSByZXF1aXJlKGZvdW5kTW9kdWxlKTtcbiAgaWYgKCFfLmhhcyhfZXhwb3J0cywgZnVuYykpIHtcbiAgICBsb2cuZXJyb3IoYFRoZXJlIGlzIG5vIGV4cG9ydCBmdW5jdGlvbjogJHtmdW5jfSwgZXhpc3RpbmcgZXhwb3J0IG1lbWJlcnMgYXJlOlxcbmAgK1xuICAgIGAke09iamVjdC5rZXlzKF9leHBvcnRzKS5maWx0ZXIobmFtZSA9PiB0eXBlb2YgKF9leHBvcnRzW25hbWVdKSA9PT0gJ2Z1bmN0aW9uJykubWFwKG5hbWUgPT4gbmFtZSArICcoKScpLmpvaW4oJ1xcbicpfWApO1xuICAgIHJldHVybjtcbiAgfVxuICBhd2FpdCBQcm9taXNlLnJlc29sdmUoX2V4cG9ydHNbZnVuY10uYXBwbHkoZ2xvYmFsLCBhcmdzIHx8IFtdKSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5QYWNrYWdlcyh0YXJnZXQ6IHN0cmluZywgaW5jbHVkZVBhY2thZ2VzOiBJdGVyYWJsZTxzdHJpbmc+KTogUHJvbWlzZTx7bmFtZTogc3RyaW5nOyBleHA6IGFueX1bXT4ge1xuICBjb25zdCBpbmNsdWRlTmFtZVNldCA9IG5ldyBTZXQ8c3RyaW5nPihpbmNsdWRlUGFja2FnZXMpO1xuICBjb25zdCBwa2dFeHBvcnRzSW5SZXZlck9yZGVyOiB7bmFtZTogc3RyaW5nOyBleHA6IGFueX1bXSA9IFtdO1xuXG4gIGNvbnN0IFtmaWxlVG9SdW4sIGZ1bmNUb1J1bl0gPSAodGFyZ2V0IGFzIHN0cmluZykuc3BsaXQoJyMnKTtcbiAgY29uc3QgW3BhY2thZ2VzLCBwcm90b10gPSBpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMoKTtcbiAgY29uc3QgY29tcG9uZW50cyA9IHBhY2thZ2VzLmZpbHRlcihwayA9PiB7XG4gICAgLy8gc2V0dXBSZXF1aXJlSW5qZWN0cyhwaywgTm9kZUFwaSk7IC8vIEFsbCBjb21wb25lbnQgcGFja2FnZSBzaG91bGQgYmUgYWJsZSB0byBhY2Nlc3MgJ19fYXBpJywgZXZlbiB0aGV5IGFyZSBub3QgaW5jbHVkZWRcbiAgICBpZiAoKGluY2x1ZGVOYW1lU2V0LnNpemUgPT09IDAgfHwgaW5jbHVkZU5hbWVTZXQuaGFzKHBrLmxvbmdOYW1lKSB8fCBpbmNsdWRlTmFtZVNldC5oYXMocGsuc2hvcnROYW1lKSkpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmIChmaWxlVG9SdW4pXG4gICAgICAgICAgcmVxdWlyZS5yZXNvbHZlKHBrLmxvbmdOYW1lICsgJy8nICsgZmlsZVRvUnVuKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHJlcXVpcmUucmVzb2x2ZShway5sb25nTmFtZSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcblxuICBjb25zdCBwYWNrYWdlTmFtZXNJbk9yZGVyOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGF3YWl0IG9yZGVyUGFja2FnZXMoY29tcG9uZW50cy5tYXAoaXRlbSA9PiAoe25hbWU6IGl0ZW0ubG9uZ05hbWUsIHByaW9yaXR5OiBfLmdldChpdGVtLmpzb24sICdkci5zZXJ2ZXJQcmlvcml0eScpfSkpLFxuICBwa0luc3RhbmNlICA9PiB7XG4gICAgcGFja2FnZU5hbWVzSW5PcmRlci5wdXNoKHBrSW5zdGFuY2UubmFtZSk7XG4gICAgY29uc3QgbW9kID0gcGtJbnN0YW5jZS5uYW1lICsgKCBmaWxlVG9SdW4gPyAnLycgKyBmaWxlVG9SdW4gOiAnJyk7XG4gICAgbG9nLmRlYnVnKCdyZXF1aXJlKCVzKScsIEpTT04uc3RyaW5naWZ5KG1vZCkpO1xuICAgIGNvbnN0IGZpbGVFeHBvcnRzID0gcmVxdWlyZShtb2QpO1xuICAgIHBrZ0V4cG9ydHNJblJldmVyT3JkZXIudW5zaGlmdCh7bmFtZTogcGtJbnN0YW5jZS5uYW1lLCBleHA6IGZpbGVFeHBvcnRzfSk7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihmaWxlRXhwb3J0c1tmdW5jVG9SdW5dKSkge1xuICAgICAgbG9nLmluZm8oZnVuY1RvUnVuICsgYCAke2NoYWxrLmN5YW4obW9kKX1gKTtcbiAgICAgIHJldHVybiBmaWxlRXhwb3J0c1tmdW5jVG9SdW5dKCk7XG4gICAgfVxuICB9KTtcbiAgKHByb3RvLmV2ZW50QnVzIGFzIEV2ZW50cy5FdmVudEVtaXR0ZXIpLmVtaXQoJ2RvbmUnLCB7ZmlsZTogZmlsZVRvUnVuLCBmdW5jdGlvbk5hbWU6IGZ1bmNUb1J1bn0gYXMgU2VydmVyUnVubmVyRXZlbnQpO1xuICBjb25zdCBOb2RlQXBpOiB0eXBlb2YgX05vZGVBcGkgPSByZXF1aXJlKCcuL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGknKTtcbiAgTm9kZUFwaS5wcm90b3R5cGUuZXZlbnRCdXMuZW1pdCgncGFja2FnZXNBY3RpdmF0ZWQnLCBpbmNsdWRlTmFtZVNldCk7XG4gIHJldHVybiBwa2dFeHBvcnRzSW5SZXZlck9yZGVyO1xufVxuXG4vKipcbiAqIFNvIHRoYXQgd2UgY2FuIHVzZSBgaW1wb3J0IGFwaSBmcm9tICdfX3BsaW5rJ2AgYW55d2hlcmUgaW4gb3VyIHBhY2thZ2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGluaXRJbmplY3RvckZvck5vZGVQYWNrYWdlcygpOlxuICBbUGFja2FnZUluc3RhbmNlW10sIF9Ob2RlQXBpXSB7XG4gIGNvbnN0IHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbyA9IHdhbGtQYWNrYWdlcygpO1xuICBjb25zdCBOb2RlQXBpOiB0eXBlb2YgX05vZGVBcGkgPSByZXF1aXJlKCcuL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGknKTtcbiAgY29uc3QgcHJvdG8gPSBOb2RlQXBpLnByb3RvdHlwZTtcbiAgcHJvdG8uYXJndiA9IHt9O1xuICBwcm90by5wYWNrYWdlSW5mbyA9IHBhY2thZ2VJbmZvO1xuICBjb25zdCBjYWNoZSA9IG5ldyBMUlU8c3RyaW5nLCBQYWNrYWdlSW5zdGFuY2U+KHttYXg6IDIwLCBtYXhBZ2U6IDIwMDAwfSk7XG4gIHByb3RvLmZpbmRQYWNrYWdlQnlGaWxlID0gZnVuY3Rpb24oZmlsZTogc3RyaW5nKTogUGFja2FnZUluc3RhbmNlIHwgdW5kZWZpbmVkIHtcbiAgICB2YXIgZm91bmQgPSBjYWNoZS5nZXQoZmlsZSk7XG4gICAgaWYgKCFmb3VuZCkge1xuICAgICAgZm91bmQgPSBwYWNrYWdlSW5mby5kaXJUcmVlLmdldEFsbERhdGEoZmlsZSkucG9wKCk7XG4gICAgICBpZiAoZm91bmQpXG4gICAgICAgIGNhY2hlLnNldChmaWxlLCBmb3VuZCk7XG4gICAgfVxuICAgIHJldHVybiBmb3VuZDtcbiAgfTtcbiAgcHJvdG8uZ2V0Tm9kZUFwaUZvclBhY2thZ2UgPSBmdW5jdGlvbihwYWNrYWdlSW5zdGFuY2U6IFBhY2thZ2VJbnN0YW5jZSkge1xuICAgIHJldHVybiBnZXRBcGlGb3JQYWNrYWdlKHBhY2thZ2VJbnN0YW5jZSwgTm9kZUFwaSk7XG4gIH07XG4gIHByb3RvLmJyb3dzZXJJbmplY3RvciA9IHdlYkluamVjdG9yO1xuICBwYWNrYWdlSW5mby5hbGxNb2R1bGVzLmZvckVhY2gocGsgPT4ge1xuICAgIHNldHVwUmVxdWlyZUluamVjdHMocGssIE5vZGVBcGkpOyAvLyBBbGwgY29tcG9uZW50IHBhY2thZ2Ugc2hvdWxkIGJlIGFibGUgdG8gYWNjZXNzICdfX2FwaScsIGV2ZW4gdGhleSBhcmUgbm90IGluY2x1ZGVkXG4gIH0pO1xuICAvLyBjb25zb2xlLmxvZygnPj4+Pj4+Pj4+Pj4+Pj4+Pj4+JylcbiAgY29uZmlnLmNvbmZpZ3VyZVN0b3JlLnBpcGUoXG4gICAgZmlsdGVyKHNldHRpbmcgPT4gc2V0dGluZyAhPSBudWxsKSxcbiAgICB0YXAoc2V0dGluZyA9PiB7XG4gICAgICAvLyBjb25zb2xlLmxvZygnPj4+Pj4+Pj4+KysrKysrPj4+Pj4+Pj4+JylcbiAgICAgIG5vZGVJbmplY3Rvci5yZWFkSW5qZWN0RmlsZSgpO1xuICAgICAgd2ViSW5qZWN0b3IucmVhZEluamVjdEZpbGUoJ21vZHVsZS1yZXNvbHZlLmJyb3dzZXInKTtcbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xuICByZXR1cm4gW3BhY2thZ2VJbmZvLmFsbE1vZHVsZXMsIHByb3RvXTtcbn1cblxuLy8gZnVuY3Rpb24gaW5pdFdlYkluamVjdG9yKHBhY2thZ2VzOiBQYWNrYWdlSW5zdGFuY2VbXSwgYXBpUHJvdG90eXBlOiBhbnkpIHtcbi8vICAgXy5lYWNoKHBhY2thZ2VzLCBwYWNrID0+IHtcbi8vICAgICB3ZWJJbmplY3Rvci5hZGRQYWNrYWdlKHBhY2subG9uZ05hbWUsIHBhY2sucmVhbFBhdGgpO1xuLy8gICB9KTtcbi8vICAgd2ViSW5qZWN0b3IuZnJvbUFsbFBhY2thZ2VzKClcbi8vICAgLnJlcGxhY2VDb2RlKCdfX2FwaScsICdfX2FwaScpXG4vLyAgIC5zdWJzdGl0dXRlKC9eKFtee10qKVxce2xvY2FsZVxcfSguKikkLyxcbi8vICAgICAoX2ZpbGVQYXRoOiBzdHJpbmcsIG1hdGNoOiBSZWdFeHBFeGVjQXJyYXkpID0+IG1hdGNoWzFdICsgYXBpUHJvdG90eXBlLmdldEJ1aWxkTG9jYWxlKCkgKyBtYXRjaFsyXSk7XG5cbi8vICAgd2ViSW5qZWN0b3IucmVhZEluamVjdEZpbGUoJ21vZHVsZS1yZXNvbHZlLmJyb3dzZXInKTtcbi8vICAgYXBpUHJvdG90eXBlLmJyb3dzZXJJbmplY3RvciA9IHdlYkluamVjdG9yO1xuLy8gfVxuXG4vKipcbiAqIEBkZXByZWNhdGVkXG4gKiBTdXBwb3J0IGBpbXBvcnQgYXBpIGZyb20gJ19fYXBpJztgXG4gKiBAcGFyYW0gYXJndiBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByZXBhcmVMYXp5Tm9kZUluamVjdG9yKGFyZ3Y/OiB7W2tleTogc3RyaW5nXTogYW55fSkge1xuICBjb25zdCBOb2RlQXBpOiB0eXBlb2YgX05vZGVBcGkgPSByZXF1aXJlKCcuL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGknKTtcbiAgY29uc3QgcHJvdG8gPSBOb2RlQXBpLnByb3RvdHlwZTtcbiAgcHJvdG8uYXJndiA9IGFyZ3YgfHwge307XG4gIGxldCBwYWNrYWdlSW5mbzogUGFja2FnZUluZm87XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCAncGFja2FnZUluZm8nLCB7XG4gICAgZ2V0KCkge1xuICAgICAgaWYgKHBhY2thZ2VJbmZvID09IG51bGwpXG4gICAgICAgIHBhY2thZ2VJbmZvID0gd2Fsa1BhY2thZ2VzKCk7XG4gICAgICByZXR1cm4gcGFja2FnZUluZm87XG4gICAgfVxuICB9KTtcbiAgcHJvdG8uZmluZFBhY2thZ2VCeUZpbGUgPSBjcmVhdGVMYXp5UGFja2FnZUZpbGVGaW5kZXIoKTtcbiAgcHJvdG8uZ2V0Tm9kZUFwaUZvclBhY2thZ2UgPSBmdW5jdGlvbihwYWNrYWdlSW5zdGFuY2U6IE5vZGVQYWNrYWdlKSB7XG4gICAgcmV0dXJuIGdldEFwaUZvclBhY2thZ2UocGFja2FnZUluc3RhbmNlLCBOb2RlQXBpKTtcbiAgfTtcbiAgbm9kZUluamVjdG9yLmZyb21Sb290KClcbiAgLy8gLmFsaWFzKCdsb2c0anMnLCBQYXRoLnJlc29sdmUoY29uZmlnKCkucm9vdFBhdGgsICdub2RlX21vZHVsZXMvbG9nNGpzJykpXG4gIC52YWx1ZSgnX19pbmplY3RvcicsIG5vZGVJbmplY3RvcilcbiAgLmZhY3RvcnkoJ19fYXBpJywgKHNvdXJjZUZpbGVQYXRoOiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCBwYWNrYWdlSW5zdGFuY2UgPSBwcm90by5maW5kUGFja2FnZUJ5RmlsZShzb3VyY2VGaWxlUGF0aCk7XG4gICAgaWYgKHBhY2thZ2VJbnN0YW5jZSlcbiAgICAgIHJldHVybiBnZXRBcGlGb3JQYWNrYWdlKHBhY2thZ2VJbnN0YW5jZSwgTm9kZUFwaSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWFwUGFja2FnZXNCeVR5cGUodHlwZXM6IHN0cmluZ1tdLCBvbkVhY2hQYWNrYWdlOiAobm9kZVBhY2thZ2U6IE5vZGVQYWNrYWdlKSA9PiB2b2lkKSB7XG4gIGNvbnN0IHBhY2thZ2VzTWFwOiB7W3R5cGU6IHN0cmluZ106IE5vZGVQYWNrYWdlW119ID0ge307XG4gIHR5cGVzLmZvckVhY2godHlwZSA9PiB7XG4gICAgcGFja2FnZXNNYXBbdHlwZV0gPSBbXTtcbiAgfSk7XG5cbiAgZm9yIChjb25zdCBwa2cgb2YgcGFja2FnZXM0V29ya3NwYWNlKCkpIHtcbiAgICBjb25zdCBuYW1lID0gcGtnLm5hbWU7XG4gICAgY29uc3QgcGtJbnN0YW5jZSA9IG5ldyBOb2RlUGFja2FnZSh7XG4gICAgICBtb2R1bGVOYW1lOiBuYW1lLFxuICAgICAgc2hvcnROYW1lOiBwa2cuc2hvcnROYW1lLFxuICAgICAgbmFtZSxcbiAgICAgIGxvbmdOYW1lOiBuYW1lLFxuICAgICAgc2NvcGU6IHBrZy5zY29wZSxcbiAgICAgIHBhdGg6IHBrZy5wYXRoLFxuICAgICAganNvbjogcGtnLmpzb24sXG4gICAgICByZWFsUGF0aDogcGtnLnJlYWxQYXRoXG4gICAgfSk7XG4gICAgY29uc3QgZHJUeXBlcyA9IChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KF8uZ2V0KHBrZywgJ2pzb24uZHIudHlwZScpKTtcbiAgICBmb3IgKGNvbnN0IHR5cGUgb2YgdHlwZXMpIHtcbiAgICAgIGlmICghXy5pbmNsdWRlcyhkclR5cGVzLCB0eXBlKSlcbiAgICAgICAgY29udGludWU7XG4gICAgICBwYWNrYWdlc01hcFt0eXBlXS5wdXNoKHBrSW5zdGFuY2UpO1xuICAgIH1cbiAgICBpZiAob25FYWNoUGFja2FnZSkge1xuICAgICAgb25FYWNoUGFja2FnZShwa0luc3RhbmNlKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHBhY2thZ2VzTWFwO1xufVxuXG5mdW5jdGlvbiBzZXR1cFJlcXVpcmVJbmplY3RzKHBrSW5zdGFuY2U6IFBhY2thZ2VJbnN0YW5jZSwgTm9kZUFwaTogdHlwZW9mIF9Ob2RlQXBpICkge1xuICBmdW5jdGlvbiBhcGlGYWN0b3J5KCkge1xuICAgIHJldHVybiBnZXRBcGlGb3JQYWNrYWdlKHBrSW5zdGFuY2UsIE5vZGVBcGkpO1xuICB9XG4gIG5vZGVJbmplY3Rvci5mcm9tRGlyKHBrSW5zdGFuY2UucmVhbFBhdGgpXG4gIC52YWx1ZSgnX19pbmplY3RvcicsIG5vZGVJbmplY3RvcilcbiAgLmZhY3RvcnkoJ19fYXBpJywgYXBpRmFjdG9yeSlcbiAgLmZhY3RvcnkoJ19fcGxpbmsnLCBhcGlGYWN0b3J5KTtcblxuICB3ZWJJbmplY3Rvci5mcm9tRGlyKHBrSW5zdGFuY2UucmVhbFBhdGgpXG4gIC5yZXBsYWNlQ29kZSgnX19hcGknLCAnX19hcGknKTtcbiAgLy8gLnN1YnN0aXR1dGUoL14oW157XSopXFx7bG9jYWxlXFx9KC4qKSQvLFxuICAvLyAgIChfZmlsZVBhdGg6IHN0cmluZywgbWF0Y2g6IFJlZ0V4cEV4ZWNBcnJheSkgPT4gbWF0Y2hbMV0gKyBhcGlQcm90b3R5cGUuZ2V0QnVpbGRMb2NhbGUoKSArIG1hdGNoWzJdKTtcbiAgY29uc3Qgc3ltbGlua0RpciA9IGdldFN5bWxpbmtGb3JQYWNrYWdlKHBrSW5zdGFuY2UubmFtZSk7XG4gIGlmIChzeW1saW5rRGlyKSB7XG4gICAgbm9kZUluamVjdG9yLmZyb21EaXIoc3ltbGlua0RpcilcbiAgICAudmFsdWUoJ19faW5qZWN0b3InLCBub2RlSW5qZWN0b3IpXG4gICAgLmZhY3RvcnkoJ19fcGxpbmsnLCBhcGlGYWN0b3J5KTtcblxuICAgIHdlYkluamVjdG9yLmZyb21EaXIoc3ltbGlua0RpcilcbiAgICAucmVwbGFjZUNvZGUoJ19fYXBpJywgJ19fYXBpJyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0QXBpRm9yUGFja2FnZShwa0luc3RhbmNlOiBOb2RlUGFja2FnZSwgTm9kZUFwaTogdHlwZW9mIF9Ob2RlQXBpKSB7XG4gIGlmIChfLmhhcyhhcGlDYWNoZSwgcGtJbnN0YW5jZS5sb25nTmFtZSkpIHtcbiAgICByZXR1cm4gYXBpQ2FjaGVbcGtJbnN0YW5jZS5sb25nTmFtZV07XG4gIH1cblxuICBjb25zdCBhcGkgPSBuZXcgTm9kZUFwaShwa0luc3RhbmNlLmxvbmdOYW1lLCBwa0luc3RhbmNlKTtcbiAgLy8gYXBpLmNvbnN0cnVjdG9yID0gTm9kZUFwaTtcbiAgcGtJbnN0YW5jZS5hcGkgPSBhcGk7XG4gIGFwaUNhY2hlW3BrSW5zdGFuY2UubG9uZ05hbWVdID0gYXBpO1xuICBhcGkuZGVmYXVsdCA9IGFwaTsgLy8gRm9yIEVTNiBpbXBvcnQgc3ludGF4XG4gIHJldHVybiBhcGk7XG59XG4iXX0=