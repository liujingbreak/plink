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
        const [packageInfo, proto] = initInjectorForNodePackages();
        const components = packageInfo.allModules.filter(pk => {
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
        const NodeApi = require('./package-mgr/node-package-api').default;
        yield package_priority_helper_1.orderPackages(components.map(item => ({ name: item.longName, priority: _.get(item.json, 'dr.serverPriority') })), pkInstance => {
            packageNamesInOrder.push(pkInstance.name);
            const mod = pkInstance.name + (fileToRun ? '/' + fileToRun : '');
            log.debug('require(%s)', JSON.stringify(mod));
            const fileExports = require(mod);
            pkgExportsInReverOrder.unshift({ name: pkInstance.name, exp: fileExports });
            if (_.isFunction(fileExports[funcToRun])) {
                log.info(funcToRun + ` ${chalk_1.default.cyan(mod)}`);
                return fileExports[funcToRun](getApiForPackage(packageInfo.moduleMap[pkInstance.name], NodeApi));
            }
        });
        proto.eventBus.emit('done', { file: fileToRun, functionName: funcToRun });
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
    const NodeApi = require('./package-mgr/node-package-api').default;
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
    injector_factory_1.nodeInjector.readInjectFile();
    injector_factory_1.webInjector.readInjectFile('module-resolve.browser');
    return [packageInfo, proto];
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
    const NodeApi = require('./package-mgr/node-package-api').default;
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
    injector_factory_1.nodeInjector.addPackage(pkInstance.longName, pkInstance.realPath, pkInstance.path === pkInstance.realPath ? undefined : pkInstance.path);
    injector_factory_1.nodeInjector.fromDir(pkInstance.realPath)
        .value('__injector', injector_factory_1.nodeInjector)
        .factory('__api', apiFactory)
        .factory('__plink', apiFactory);
    injector_factory_1.webInjector.fromDir(pkInstance.realPath)
        .replaceCode('__api', '__api');
    // .substitute(/^([^{]*)\{locale\}(.*)$/,
    //   (_filePath: string, match: RegExpExecArray) => match[1] + apiPrototype.getBuildLocale() + match[2]);
    const symlinkDir = pkInstance.path !== pkInstance.realPath ? pkInstance.path : null;
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
    apiCache[pkInstance.longName] = api;
    api.default = api; // For ES6 import syntax
    return api;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wYWNrYWdlLXJ1bm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0NBQW9DO0FBQ3BDLDBDQUE0QjtBQUM1QiwwREFBNEI7QUFDNUIsaUZBQStFO0FBQy9FLHlEQUErRDtBQUcvRCx1RUFBMEQ7QUFDMUQsZ0ZBQWdEO0FBQ2hELGdEQUF3QjtBQUV4QixtREFBZ0Y7QUFDaEYsb0RBQTRCO0FBQzVCLHNEQUE4QjtBQUM5QiwrQ0FBa0c7QUFDbEcsMkVBQXdFO0FBQ3hFLGtEQUEwQjtBQUUxQixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0FBT3JELFNBQWdCLGVBQWUsQ0FBQyxHQUFpQjtJQUMvQyxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksS0FBSyxRQUFRLElBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBa0IsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztBQUNsSSxDQUFDO0FBRkQsMENBRUM7QUFFRCxTQUFnQixvQkFBb0IsQ0FBQyxJQUFTO0lBQzVDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLENBQUMsQ0FBQztBQUMxQyxDQUFDO0FBRkQsb0RBRUM7QUFFRCxTQUFzQixTQUFTOztRQUM3QixJQUFJLEtBQUssR0FBOEIsMEJBQVksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUNuRSxLQUFLLEdBQUcsc0JBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENB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QUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7SUFDcEYsSUFBSSxVQUFVLEVBQUU7UUFDZCwrQkFBWSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUM7YUFDL0IsS0FBSyxDQUFDLFlBQVksRUFBRSwrQkFBWSxDQUFDO2FBQ2pDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFFaEMsOEJBQVcsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDO2FBQzlCLFdBQVcsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUM7S0FDaEM7QUFDSCxDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxVQUF1QixFQUFFLE9BQXdCO0lBQ3pFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUFFO1FBQ3hDLE9BQU8sUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztLQUN0QztJQUVELE1BQU0sR0FBRyxHQUFHLElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDekQsUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsR0FBRyxHQUFHLENBQUM7SUFDcEMsR0FBRyxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUMsQ0FBQyx3QkFBd0I7SUFDM0MsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbWF4LWxpbmUtbGVuZ3RoICovXG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgTFJVIGZyb20gJ2xydS1jYWNoZSc7XG5pbXBvcnQge1BhY2thZ2VJbmZvLCB3YWxrUGFja2FnZXN9IGZyb20gJy4vcGFja2FnZS1tZ3IvcGFja2FnZS1pbmZvLWdhdGhlcmluZyc7XG5pbXBvcnQgeyBub2RlSW5qZWN0b3IsIHdlYkluamVjdG9yIH0gZnJvbSAnLi9pbmplY3Rvci1mYWN0b3J5JztcbmltcG9ydCBfTm9kZUFwaSBmcm9tICcuL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGknO1xuaW1wb3J0IFBhY2thZ2VJbnN0YW5jZSBmcm9tICcuL3BhY2thZ2VOb2RlSW5zdGFuY2UnO1xuaW1wb3J0IHsgb3JkZXJQYWNrYWdlcyB9IGZyb20gJy4vcGFja2FnZS1wcmlvcml0eS1oZWxwZXInO1xuaW1wb3J0IE5vZGVQYWNrYWdlIGZyb20gJy4vcGFja2FnZU5vZGVJbnN0YW5jZSc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBFdmVudHMgZnJvbSAnZXZlbnRzJztcbmltcG9ydCB7Y3JlYXRlTGF6eVBhY2thZ2VGaWxlRmluZGVyLCBwYWNrYWdlczRXb3Jrc3BhY2V9IGZyb20gJy4vcGFja2FnZS11dGlscyc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7aXNDd2RXb3Jrc3BhY2UsIGdldFN0YXRlLCB3b3Jrc3BhY2VLZXksIFBhY2thZ2VJbmZvIGFzIFBhY2thZ2VTdGF0ZX0gZnJvbSAnLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQge3BhY2thZ2VzNFdvcmtzcGFjZUtleX0gZnJvbSAnLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLnBhY2thZ2UtcnVubmVyJyk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VydmVyUnVubmVyRXZlbnQge1xuICBmaWxlOiBzdHJpbmc7XG4gIGZ1bmN0aW9uTmFtZTogc3RyaW5nO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNTZXJ2ZXJQYWNrYWdlKHBrZzogUGFja2FnZVN0YXRlKSB7XG4gIHJldHVybiBwa2cuanNvbi5kciAmJiBwa2cuanNvbi5kci50eXBlICYmIChwa2cuanNvbi5kci50eXBlID09PSAnc2VydmVyJyB8fCAocGtnLmpzb24uZHIudHlwZSAgYXMgc3RyaW5nW10pLmluY2x1ZGVzKCdzZXJ2ZXInKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkUHJpb3JpdHlQcm9wZXJ0eShqc29uOiBhbnkpIHtcbiAgcmV0dXJuIF8uZ2V0KGpzb24sICdkci5zZXJ2ZXJQcmlvcml0eScpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuU2VydmVyKCkge1xuICBsZXQgd3NLZXk6IHN0cmluZyB8IG51bGwgfCB1bmRlZmluZWQgPSB3b3Jrc3BhY2VLZXkocHJvY2Vzcy5jd2QoKSk7XG4gIHdzS2V5ID0gZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmhhcyh3c0tleSkgPyB3c0tleSA6IGdldFN0YXRlKCkuY3VycldvcmtzcGFjZTtcbiAgaWYgKHdzS2V5ID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0N1cnJlbnQgZGlyZWN0b3J5IGlzIG5vdCBhIHdvcmtzcGFjZSBkaXJlY3RvcnknKTtcbiAgfVxuICBjb25zdCBwa2dzID0gQXJyYXkuZnJvbShwYWNrYWdlczRXb3Jrc3BhY2VLZXkod3NLZXksIHRydWUpKVxuICAuZmlsdGVyKGlzU2VydmVyUGFja2FnZSlcbiAgLm1hcChpdGVtID0+IGl0ZW0ubmFtZSk7XG5cbiAgY29uc3QgcmV2ZXJzZU9yZGVyUGtnRXhwb3J0cyA9IGF3YWl0IHJ1blBhY2thZ2VzKCcjYWN0aXZhdGUnLCBwa2dzKTtcblxuICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgNTAwKSk7XG4gIHJldHVybiBhc3luYyAoKSA9PiB7XG4gICAgbG9nLmluZm8oJ3NodXR0aW5nIGRvd24nKTtcbiAgICBmb3IgKGNvbnN0IHtuYW1lLCBleHB9IG9mIHJldmVyc2VPcmRlclBrZ0V4cG9ydHMpIHtcbiAgICAgIGlmIChfLmlzRnVuY3Rpb24oZXhwLmRlYWN0aXZhdGUpKSB7XG4gICAgICAgIGxvZy5pbmZvKCdkZWFjdGl2YXRlJywgbmFtZSk7XG4gICAgICAgIGF3YWl0IFByb21pc2UucmVzb2x2ZShleHAuZGVhY3RpdmF0ZSgpKTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG59XG5cbmNvbnN0IGFwaUNhY2hlOiB7W25hbWU6IHN0cmluZ106IGFueX0gPSB7fTtcbi8vIGNvbnN0IHBhY2thZ2VUcmVlID0gbmV3IERpclRyZWU8UGFja2FnZUluc3RhbmNlPigpO1xuXG4vKipcbiAqIExhemlseSBpbml0IGluamVjdG9yIGZvciBwYWNrYWdlcyBhbmQgcnVuIHNwZWNpZmljIHBhY2thZ2Ugb25seSxcbiAqIG5vIGZ1bGx5IHNjYW5uaW5nIG9yIG9yZGVyaW5nIG9uIGFsbCBwYWNrYWdlc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuU2luZ2xlUGFja2FnZSh7dGFyZ2V0LCBhcmdzfToge3RhcmdldDogc3RyaW5nLCBhcmdzOiBzdHJpbmdbXX0pIHtcbiAgaWYgKCFpc0N3ZFdvcmtzcGFjZSgpKSB7XG4gICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcignQ3VycmVudCBkaXJlY3RvcnkgaXMgbm90IGEgd29ya3NwYWNlIGRpcmVjdG9yeScpKTtcbiAgfVxuICBjb25zdCBwYXNzaW5Bcmd2ID0ge307XG4gIC8vIGNvbnNvbGUubG9nKGFyZ3MpO1xuICAvLyB0aHJvdyBuZXcgRXJyb3IoJ3N0b3AnKTtcbiAgZm9yIChsZXQgaSA9IDAsIGwgPSBhcmdzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGNvbnN0IGtleSA9IGFyZ3NbaV07XG4gICAgaWYgKGtleS5zdGFydHNXaXRoKCctJykpIHtcbiAgICAgIGlmIChpID09PSBhcmdzLmxlbmd0aCAtIDEgfHwgYXJnc1tpICsgMV0uc3RhcnRzV2l0aCgnLScpKSB7XG4gICAgICAgIHBhc3NpbkFyZ3ZbXy50cmltU3RhcnQoa2V5LCAnLScpXSA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwYXNzaW5Bcmd2W2tleV0gPSBhcmdzW2kgKyAxXTtcbiAgICAgICAgaSsrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMoKTtcbiAgY29uc3QgW2ZpbGUsIGZ1bmNdID0gdGFyZ2V0LnNwbGl0KCcjJyk7XG5cbiAgY29uc3QgZ3Vlc3NpbmdGaWxlOiBzdHJpbmdbXSA9IFtcbiAgICBmaWxlLFxuICAgIFBhdGgucmVzb2x2ZShmaWxlKSxcbiAgICAuLi4oY29uZmlnKCkucGFja2FnZVNjb3BlcyBhcyBzdHJpbmdbXSkubWFwKHNjb3BlID0+IGBAJHtzY29wZX0vJHtmaWxlfWApXG4gIF07XG4gIGNvbnN0IGZvdW5kTW9kdWxlID0gZ3Vlc3NpbmdGaWxlLmZpbmQodGFyZ2V0ID0+IHtcbiAgICB0cnkge1xuICAgICAgcmVxdWlyZS5yZXNvbHZlKHRhcmdldCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfSk7XG5cbiAgaWYgKCFmb3VuZE1vZHVsZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgdGFyZ2V0IG1vZHVsZSBmcm9tIHBhdGhzIGxpa2U6XFxuJHtndWVzc2luZ0ZpbGUuam9pbignXFxuJyl9YCk7XG4gIH1cbiAgY29uc3QgX2V4cG9ydHMgPSByZXF1aXJlKGZvdW5kTW9kdWxlKTtcbiAgaWYgKCFfLmhhcyhfZXhwb3J0cywgZnVuYykpIHtcbiAgICBsb2cuZXJyb3IoYFRoZXJlIGlzIG5vIGV4cG9ydCBmdW5jdGlvbjogJHtmdW5jfSwgZXhpc3RpbmcgZXhwb3J0IG1lbWJlcnMgYXJlOlxcbmAgK1xuICAgIGAke09iamVjdC5rZXlzKF9leHBvcnRzKS5maWx0ZXIobmFtZSA9PiB0eXBlb2YgKF9leHBvcnRzW25hbWVdKSA9PT0gJ2Z1bmN0aW9uJykubWFwKG5hbWUgPT4gbmFtZSArICcoKScpLmpvaW4oJ1xcbicpfWApO1xuICAgIHJldHVybjtcbiAgfVxuICBhd2FpdCBQcm9taXNlLnJlc29sdmUoX2V4cG9ydHNbZnVuY10uYXBwbHkoZ2xvYmFsLCBhcmdzIHx8IFtdKSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5QYWNrYWdlcyh0YXJnZXQ6IHN0cmluZywgaW5jbHVkZVBhY2thZ2VzOiBJdGVyYWJsZTxzdHJpbmc+KTogUHJvbWlzZTx7bmFtZTogc3RyaW5nOyBleHA6IGFueX1bXT4ge1xuICBjb25zdCBpbmNsdWRlTmFtZVNldCA9IG5ldyBTZXQ8c3RyaW5nPihpbmNsdWRlUGFja2FnZXMpO1xuICBjb25zdCBwa2dFeHBvcnRzSW5SZXZlck9yZGVyOiB7bmFtZTogc3RyaW5nOyBleHA6IGFueX1bXSA9IFtdO1xuXG4gIGNvbnN0IFtmaWxlVG9SdW4sIGZ1bmNUb1J1bl0gPSAodGFyZ2V0IGFzIHN0cmluZykuc3BsaXQoJyMnKTtcbiAgY29uc3QgW3BhY2thZ2VJbmZvLCBwcm90b10gPSBpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMoKTtcbiAgY29uc3QgY29tcG9uZW50cyA9IHBhY2thZ2VJbmZvLmFsbE1vZHVsZXMuZmlsdGVyKHBrID0+IHtcbiAgICAvLyBzZXR1cFJlcXVpcmVJbmplY3RzKHBrLCBOb2RlQXBpKTsgLy8gQWxsIGNvbXBvbmVudCBwYWNrYWdlIHNob3VsZCBiZSBhYmxlIHRvIGFjY2VzcyAnX19hcGknLCBldmVuIHRoZXkgYXJlIG5vdCBpbmNsdWRlZFxuICAgIGlmICgoaW5jbHVkZU5hbWVTZXQuc2l6ZSA9PT0gMCB8fCBpbmNsdWRlTmFtZVNldC5oYXMocGsubG9uZ05hbWUpIHx8IGluY2x1ZGVOYW1lU2V0Lmhhcyhway5zaG9ydE5hbWUpKSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKGZpbGVUb1J1bilcbiAgICAgICAgICByZXF1aXJlLnJlc29sdmUocGsubG9uZ05hbWUgKyAnLycgKyBmaWxlVG9SdW4pO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgcmVxdWlyZS5yZXNvbHZlKHBrLmxvbmdOYW1lKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xuXG4gIGNvbnN0IHBhY2thZ2VOYW1lc0luT3JkZXI6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IE5vZGVBcGk6IHR5cGVvZiBfTm9kZUFwaSA9IHJlcXVpcmUoJy4vcGFja2FnZS1tZ3Ivbm9kZS1wYWNrYWdlLWFwaScpLmRlZmF1bHQ7XG5cblxuICBhd2FpdCBvcmRlclBhY2thZ2VzKGNvbXBvbmVudHMubWFwKGl0ZW0gPT4gKHtuYW1lOiBpdGVtLmxvbmdOYW1lLCBwcmlvcml0eTogXy5nZXQoaXRlbS5qc29uLCAnZHIuc2VydmVyUHJpb3JpdHknKX0pKSxcbiAgcGtJbnN0YW5jZSAgPT4ge1xuICAgIHBhY2thZ2VOYW1lc0luT3JkZXIucHVzaChwa0luc3RhbmNlLm5hbWUpO1xuICAgIGNvbnN0IG1vZCA9IHBrSW5zdGFuY2UubmFtZSArICggZmlsZVRvUnVuID8gJy8nICsgZmlsZVRvUnVuIDogJycpO1xuICAgIGxvZy5kZWJ1ZygncmVxdWlyZSglcyknLCBKU09OLnN0cmluZ2lmeShtb2QpKTtcbiAgICBjb25zdCBmaWxlRXhwb3J0cyA9IHJlcXVpcmUobW9kKTtcbiAgICBwa2dFeHBvcnRzSW5SZXZlck9yZGVyLnVuc2hpZnQoe25hbWU6IHBrSW5zdGFuY2UubmFtZSwgZXhwOiBmaWxlRXhwb3J0c30pO1xuICAgIGlmIChfLmlzRnVuY3Rpb24oZmlsZUV4cG9ydHNbZnVuY1RvUnVuXSkpIHtcbiAgICAgIGxvZy5pbmZvKGZ1bmNUb1J1biArIGAgJHtjaGFsay5jeWFuKG1vZCl9YCk7XG4gICAgICByZXR1cm4gZmlsZUV4cG9ydHNbZnVuY1RvUnVuXShnZXRBcGlGb3JQYWNrYWdlKHBhY2thZ2VJbmZvLm1vZHVsZU1hcFtwa0luc3RhbmNlLm5hbWVdLCBOb2RlQXBpKSk7XG4gICAgfVxuICB9KTtcbiAgKHByb3RvLmV2ZW50QnVzIGFzIEV2ZW50cy5FdmVudEVtaXR0ZXIpLmVtaXQoJ2RvbmUnLCB7ZmlsZTogZmlsZVRvUnVuLCBmdW5jdGlvbk5hbWU6IGZ1bmNUb1J1bn0gYXMgU2VydmVyUnVubmVyRXZlbnQpO1xuICBOb2RlQXBpLnByb3RvdHlwZS5ldmVudEJ1cy5lbWl0KCdwYWNrYWdlc0FjdGl2YXRlZCcsIGluY2x1ZGVOYW1lU2V0KTtcbiAgcmV0dXJuIHBrZ0V4cG9ydHNJblJldmVyT3JkZXI7XG59XG5cbi8qKlxuICogU28gdGhhdCB3ZSBjYW4gdXNlIGBpbXBvcnQgYXBpIGZyb20gJ19fcGxpbmsnYCBhbnl3aGVyZSBpbiBvdXIgcGFja2FnZVxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5pdEluamVjdG9yRm9yTm9kZVBhY2thZ2VzKCk6XG4gIFtQYWNrYWdlSW5mbywgX05vZGVBcGldIHtcbiAgY29uc3QgcGFja2FnZUluZm86IFBhY2thZ2VJbmZvID0gd2Fsa1BhY2thZ2VzKCk7XG4gIGNvbnN0IE5vZGVBcGk6IHR5cGVvZiBfTm9kZUFwaSA9IHJlcXVpcmUoJy4vcGFja2FnZS1tZ3Ivbm9kZS1wYWNrYWdlLWFwaScpLmRlZmF1bHQ7XG4gIGNvbnN0IHByb3RvID0gTm9kZUFwaS5wcm90b3R5cGU7XG4gIHByb3RvLmFyZ3YgPSB7fTtcbiAgcHJvdG8ucGFja2FnZUluZm8gPSBwYWNrYWdlSW5mbztcbiAgY29uc3QgY2FjaGUgPSBuZXcgTFJVPHN0cmluZywgUGFja2FnZUluc3RhbmNlPih7bWF4OiAyMCwgbWF4QWdlOiAyMDAwMH0pO1xuICBwcm90by5maW5kUGFja2FnZUJ5RmlsZSA9IGZ1bmN0aW9uKGZpbGU6IHN0cmluZyk6IFBhY2thZ2VJbnN0YW5jZSB8IHVuZGVmaW5lZCB7XG4gICAgdmFyIGZvdW5kID0gY2FjaGUuZ2V0KGZpbGUpO1xuICAgIGlmICghZm91bmQpIHtcbiAgICAgIGZvdW5kID0gcGFja2FnZUluZm8uZGlyVHJlZS5nZXRBbGxEYXRhKGZpbGUpLnBvcCgpO1xuICAgICAgaWYgKGZvdW5kKVxuICAgICAgICBjYWNoZS5zZXQoZmlsZSwgZm91bmQpO1xuICAgIH1cbiAgICByZXR1cm4gZm91bmQ7XG4gIH07XG4gIHByb3RvLmdldE5vZGVBcGlGb3JQYWNrYWdlID0gZnVuY3Rpb24ocGFja2FnZUluc3RhbmNlOiBQYWNrYWdlSW5zdGFuY2UpIHtcbiAgICByZXR1cm4gZ2V0QXBpRm9yUGFja2FnZShwYWNrYWdlSW5zdGFuY2UsIE5vZGVBcGkpO1xuICB9O1xuICBwcm90by5icm93c2VySW5qZWN0b3IgPSB3ZWJJbmplY3RvcjtcbiAgcGFja2FnZUluZm8uYWxsTW9kdWxlcy5mb3JFYWNoKHBrID0+IHtcbiAgICBzZXR1cFJlcXVpcmVJbmplY3RzKHBrLCBOb2RlQXBpKTsgLy8gQWxsIGNvbXBvbmVudCBwYWNrYWdlIHNob3VsZCBiZSBhYmxlIHRvIGFjY2VzcyAnX19hcGknLCBldmVuIHRoZXkgYXJlIG5vdCBpbmNsdWRlZFxuICB9KTtcbiAgbm9kZUluamVjdG9yLnJlYWRJbmplY3RGaWxlKCk7XG4gIHdlYkluamVjdG9yLnJlYWRJbmplY3RGaWxlKCdtb2R1bGUtcmVzb2x2ZS5icm93c2VyJyk7XG4gIHJldHVybiBbcGFja2FnZUluZm8sIHByb3RvXTtcbn1cblxuLy8gZnVuY3Rpb24gaW5pdFdlYkluamVjdG9yKHBhY2thZ2VzOiBQYWNrYWdlSW5zdGFuY2VbXSwgYXBpUHJvdG90eXBlOiBhbnkpIHtcbi8vICAgXy5lYWNoKHBhY2thZ2VzLCBwYWNrID0+IHtcbi8vICAgICB3ZWJJbmplY3Rvci5hZGRQYWNrYWdlKHBhY2subG9uZ05hbWUsIHBhY2sucmVhbFBhdGgpO1xuLy8gICB9KTtcbi8vICAgd2ViSW5qZWN0b3IuZnJvbUFsbFBhY2thZ2VzKClcbi8vICAgLnJlcGxhY2VDb2RlKCdfX2FwaScsICdfX2FwaScpXG4vLyAgIC5zdWJzdGl0dXRlKC9eKFtee10qKVxce2xvY2FsZVxcfSguKikkLyxcbi8vICAgICAoX2ZpbGVQYXRoOiBzdHJpbmcsIG1hdGNoOiBSZWdFeHBFeGVjQXJyYXkpID0+IG1hdGNoWzFdICsgYXBpUHJvdG90eXBlLmdldEJ1aWxkTG9jYWxlKCkgKyBtYXRjaFsyXSk7XG5cbi8vICAgd2ViSW5qZWN0b3IucmVhZEluamVjdEZpbGUoJ21vZHVsZS1yZXNvbHZlLmJyb3dzZXInKTtcbi8vICAgYXBpUHJvdG90eXBlLmJyb3dzZXJJbmplY3RvciA9IHdlYkluamVjdG9yO1xuLy8gfVxuXG4vKipcbiAqIEBkZXByZWNhdGVkXG4gKiBTdXBwb3J0IGBpbXBvcnQgYXBpIGZyb20gJ19fYXBpJztgXG4gKiBAcGFyYW0gYXJndiBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByZXBhcmVMYXp5Tm9kZUluamVjdG9yKGFyZ3Y/OiB7W2tleTogc3RyaW5nXTogYW55fSkge1xuICBjb25zdCBOb2RlQXBpOiB0eXBlb2YgX05vZGVBcGkgPSByZXF1aXJlKCcuL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGknKS5kZWZhdWx0O1xuICBjb25zdCBwcm90byA9IE5vZGVBcGkucHJvdG90eXBlO1xuICBwcm90by5hcmd2ID0gYXJndiB8fCB7fTtcbiAgbGV0IHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbztcblxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sICdwYWNrYWdlSW5mbycsIHtcbiAgICBnZXQoKSB7XG4gICAgICBpZiAocGFja2FnZUluZm8gPT0gbnVsbClcbiAgICAgICAgcGFja2FnZUluZm8gPSB3YWxrUGFja2FnZXMoKTtcbiAgICAgIHJldHVybiBwYWNrYWdlSW5mbztcbiAgICB9XG4gIH0pO1xuICBwcm90by5maW5kUGFja2FnZUJ5RmlsZSA9IGNyZWF0ZUxhenlQYWNrYWdlRmlsZUZpbmRlcigpO1xuICBwcm90by5nZXROb2RlQXBpRm9yUGFja2FnZSA9IGZ1bmN0aW9uKHBhY2thZ2VJbnN0YW5jZTogTm9kZVBhY2thZ2UpIHtcbiAgICByZXR1cm4gZ2V0QXBpRm9yUGFja2FnZShwYWNrYWdlSW5zdGFuY2UsIE5vZGVBcGkpO1xuICB9O1xuICBub2RlSW5qZWN0b3IuZnJvbVJvb3QoKVxuICAvLyAuYWxpYXMoJ2xvZzRqcycsIFBhdGgucmVzb2x2ZShjb25maWcoKS5yb290UGF0aCwgJ25vZGVfbW9kdWxlcy9sb2c0anMnKSlcbiAgLnZhbHVlKCdfX2luamVjdG9yJywgbm9kZUluamVjdG9yKVxuICAuZmFjdG9yeSgnX19hcGknLCAoc291cmNlRmlsZVBhdGg6IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IHBhY2thZ2VJbnN0YW5jZSA9IHByb3RvLmZpbmRQYWNrYWdlQnlGaWxlKHNvdXJjZUZpbGVQYXRoKTtcbiAgICBpZiAocGFja2FnZUluc3RhbmNlKVxuICAgICAgcmV0dXJuIGdldEFwaUZvclBhY2thZ2UocGFja2FnZUluc3RhbmNlLCBOb2RlQXBpKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYXBQYWNrYWdlc0J5VHlwZSh0eXBlczogc3RyaW5nW10sIG9uRWFjaFBhY2thZ2U6IChub2RlUGFja2FnZTogTm9kZVBhY2thZ2UpID0+IHZvaWQpIHtcbiAgY29uc3QgcGFja2FnZXNNYXA6IHtbdHlwZTogc3RyaW5nXTogTm9kZVBhY2thZ2VbXX0gPSB7fTtcbiAgdHlwZXMuZm9yRWFjaCh0eXBlID0+IHtcbiAgICBwYWNrYWdlc01hcFt0eXBlXSA9IFtdO1xuICB9KTtcblxuICBmb3IgKGNvbnN0IHBrZyBvZiBwYWNrYWdlczRXb3Jrc3BhY2UoKSkge1xuICAgIGNvbnN0IG5hbWUgPSBwa2cubmFtZTtcbiAgICBjb25zdCBwa0luc3RhbmNlID0gbmV3IE5vZGVQYWNrYWdlKHtcbiAgICAgIG1vZHVsZU5hbWU6IG5hbWUsXG4gICAgICBzaG9ydE5hbWU6IHBrZy5zaG9ydE5hbWUsXG4gICAgICBuYW1lLFxuICAgICAgbG9uZ05hbWU6IG5hbWUsXG4gICAgICBzY29wZTogcGtnLnNjb3BlLFxuICAgICAgcGF0aDogcGtnLnBhdGgsXG4gICAgICBqc29uOiBwa2cuanNvbixcbiAgICAgIHJlYWxQYXRoOiBwa2cucmVhbFBhdGhcbiAgICB9KTtcbiAgICBjb25zdCBkclR5cGVzID0gKFtdIGFzIHN0cmluZ1tdKS5jb25jYXQoXy5nZXQocGtnLCAnanNvbi5kci50eXBlJykpO1xuICAgIGZvciAoY29uc3QgdHlwZSBvZiB0eXBlcykge1xuICAgICAgaWYgKCFfLmluY2x1ZGVzKGRyVHlwZXMsIHR5cGUpKVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIHBhY2thZ2VzTWFwW3R5cGVdLnB1c2gocGtJbnN0YW5jZSk7XG4gICAgfVxuICAgIGlmIChvbkVhY2hQYWNrYWdlKSB7XG4gICAgICBvbkVhY2hQYWNrYWdlKHBrSW5zdGFuY2UpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcGFja2FnZXNNYXA7XG59XG5cbmZ1bmN0aW9uIHNldHVwUmVxdWlyZUluamVjdHMocGtJbnN0YW5jZTogUGFja2FnZUluc3RhbmNlLCBOb2RlQXBpOiB0eXBlb2YgX05vZGVBcGkgKSB7XG4gIGZ1bmN0aW9uIGFwaUZhY3RvcnkoKSB7XG4gICAgcmV0dXJuIGdldEFwaUZvclBhY2thZ2UocGtJbnN0YW5jZSwgTm9kZUFwaSk7XG4gIH1cbiAgbm9kZUluamVjdG9yLmFkZFBhY2thZ2UocGtJbnN0YW5jZS5sb25nTmFtZSwgcGtJbnN0YW5jZS5yZWFsUGF0aCxcbiAgICBwa0luc3RhbmNlLnBhdGggPT09IHBrSW5zdGFuY2UucmVhbFBhdGggPyB1bmRlZmluZWQgOiBwa0luc3RhbmNlLnBhdGgpO1xuICBub2RlSW5qZWN0b3IuZnJvbURpcihwa0luc3RhbmNlLnJlYWxQYXRoKVxuICAudmFsdWUoJ19faW5qZWN0b3InLCBub2RlSW5qZWN0b3IpXG4gIC5mYWN0b3J5KCdfX2FwaScsIGFwaUZhY3RvcnkpXG4gIC5mYWN0b3J5KCdfX3BsaW5rJywgYXBpRmFjdG9yeSk7XG5cbiAgd2ViSW5qZWN0b3IuZnJvbURpcihwa0luc3RhbmNlLnJlYWxQYXRoKVxuICAucmVwbGFjZUNvZGUoJ19fYXBpJywgJ19fYXBpJyk7XG4gIC8vIC5zdWJzdGl0dXRlKC9eKFtee10qKVxce2xvY2FsZVxcfSguKikkLyxcbiAgLy8gICAoX2ZpbGVQYXRoOiBzdHJpbmcsIG1hdGNoOiBSZWdFeHBFeGVjQXJyYXkpID0+IG1hdGNoWzFdICsgYXBpUHJvdG90eXBlLmdldEJ1aWxkTG9jYWxlKCkgKyBtYXRjaFsyXSk7XG4gIGNvbnN0IHN5bWxpbmtEaXIgPSBwa0luc3RhbmNlLnBhdGggIT09IHBrSW5zdGFuY2UucmVhbFBhdGggPyBwa0luc3RhbmNlLnBhdGggOiBudWxsO1xuICBpZiAoc3ltbGlua0Rpcikge1xuICAgIG5vZGVJbmplY3Rvci5mcm9tRGlyKHN5bWxpbmtEaXIpXG4gICAgLnZhbHVlKCdfX2luamVjdG9yJywgbm9kZUluamVjdG9yKVxuICAgIC5mYWN0b3J5KCdfX3BsaW5rJywgYXBpRmFjdG9yeSk7XG5cbiAgICB3ZWJJbmplY3Rvci5mcm9tRGlyKHN5bWxpbmtEaXIpXG4gICAgLnJlcGxhY2VDb2RlKCdfX2FwaScsICdfX2FwaScpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldEFwaUZvclBhY2thZ2UocGtJbnN0YW5jZTogTm9kZVBhY2thZ2UsIE5vZGVBcGk6IHR5cGVvZiBfTm9kZUFwaSkge1xuICBpZiAoXy5oYXMoYXBpQ2FjaGUsIHBrSW5zdGFuY2UubG9uZ05hbWUpKSB7XG4gICAgcmV0dXJuIGFwaUNhY2hlW3BrSW5zdGFuY2UubG9uZ05hbWVdO1xuICB9XG5cbiAgY29uc3QgYXBpID0gbmV3IE5vZGVBcGkocGtJbnN0YW5jZS5sb25nTmFtZSwgcGtJbnN0YW5jZSk7XG4gIGFwaUNhY2hlW3BrSW5zdGFuY2UubG9uZ05hbWVdID0gYXBpO1xuICBhcGkuZGVmYXVsdCA9IGFwaTsgLy8gRm9yIEVTNiBpbXBvcnQgc3ludGF4XG4gIHJldHVybiBhcGk7XG59XG4iXX0=