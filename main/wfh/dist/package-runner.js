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
    injector_factory_1.nodeInjector.addPackage(pkInstance.longName, pkInstance.realPath, pkInstance.path === pkInstance.realPath ? undefined : pkInstance.path);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wYWNrYWdlLXJ1bm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0NBQW9DO0FBQ3BDLDBDQUE0QjtBQUM1QiwwREFBNEI7QUFDNUIsaUZBQStFO0FBQy9FLHlEQUErRDtBQUcvRCx1RUFBMEQ7QUFDMUQsZ0ZBQWdEO0FBQ2hELGdEQUF3QjtBQUV4QixtREFBZ0Y7QUFDaEYsb0RBQTRCO0FBQzVCLHNEQUE4QjtBQUM5QiwrQ0FBa0c7QUFDbEcsMkVBQXdFO0FBQ3hFLGtEQUEwQjtBQUMxQix1Q0FBa0Q7QUFDbEQsOENBQTJDO0FBRTNDLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLHNCQUFzQixDQUFDLENBQUM7QUFPckQsU0FBZ0IsZUFBZSxDQUFDLEdBQWlCO0lBQy9DLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxLQUFLLFFBQVEsSUFBSyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFrQixDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0FBQ2xJLENBQUM7QUFGRCwwQ0FFQztBQUVELFNBQWdCLG9CQUFvQixDQUFDLElBQVM7SUFDNUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxtQkFBbUIsQ0FBQyxDQUFDO0FBQzFDLENBQUM7QUFGRCxvREFFQztBQUVELFNBQXNCLFNBQVM7O1FBQzdCLElBQUksS0FBSyxHQUE4QiwwQkFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQ25FLEtBQUssR0FBRyxzQkFBUSxFQUFFLENBQUMsVUFBVSxD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LE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztJQUMvQix5Q0FBeUM7SUFDekMseUdBQXlHO0lBQ3pHLE1BQU0sVUFBVSxHQUFHLDJCQUFvQixDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN6RCxJQUFJLFVBQVUsRUFBRTtRQUNkLCtCQUFZLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQzthQUMvQixLQUFLLENBQUMsWUFBWSxFQUFFLCtCQUFZLENBQUM7YUFDakMsT0FBTyxDQUFDLFNBQVMsRUFBRSxVQUFVLENBQUMsQ0FBQztRQUVoQyw4QkFBVyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUM7YUFDOUIsV0FBVyxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQztLQUNoQztBQUNILENBQUM7QUFFRCxTQUFTLGdCQUFnQixDQUFDLFVBQXVCLEVBQUUsT0FBd0I7SUFDekUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsUUFBUSxDQUFDLEVBQUU7UUFDeEMsT0FBTyxRQUFRLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0tBQ3RDO0lBRUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUN6RCw2QkFBNkI7SUFDN0IsVUFBVSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7SUFDckIsUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsR0FBRyxHQUFHLENBQUM7SUFDcEMsR0FBRyxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUMsQ0FBQyx3QkFBd0I7SUFDM0MsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbWF4LWxpbmUtbGVuZ3RoICovXG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgTFJVIGZyb20gJ2xydS1jYWNoZSc7XG5pbXBvcnQge1BhY2thZ2VJbmZvLCB3YWxrUGFja2FnZXN9IGZyb20gJy4vcGFja2FnZS1tZ3IvcGFja2FnZS1pbmZvLWdhdGhlcmluZyc7XG5pbXBvcnQgeyBub2RlSW5qZWN0b3IsIHdlYkluamVjdG9yIH0gZnJvbSAnLi9pbmplY3Rvci1mYWN0b3J5JztcbmltcG9ydCBfTm9kZUFwaSBmcm9tICcuL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGknO1xuaW1wb3J0IFBhY2thZ2VJbnN0YW5jZSBmcm9tICcuL3BhY2thZ2VOb2RlSW5zdGFuY2UnO1xuaW1wb3J0IHsgb3JkZXJQYWNrYWdlcyB9IGZyb20gJy4vcGFja2FnZS1wcmlvcml0eS1oZWxwZXInO1xuaW1wb3J0IE5vZGVQYWNrYWdlIGZyb20gJy4vcGFja2FnZU5vZGVJbnN0YW5jZSc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBFdmVudHMgZnJvbSAnZXZlbnRzJztcbmltcG9ydCB7Y3JlYXRlTGF6eVBhY2thZ2VGaWxlRmluZGVyLCBwYWNrYWdlczRXb3Jrc3BhY2V9IGZyb20gJy4vcGFja2FnZS11dGlscyc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7aXNDd2RXb3Jrc3BhY2UsIGdldFN0YXRlLCB3b3Jrc3BhY2VLZXksIFBhY2thZ2VJbmZvIGFzIFBhY2thZ2VTdGF0ZX0gZnJvbSAnLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQge3BhY2thZ2VzNFdvcmtzcGFjZUtleX0gZnJvbSAnLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5pbXBvcnQge2dldFN5bWxpbmtGb3JQYWNrYWdlfSBmcm9tICcuL3V0aWxzL21pc2MnO1xuaW1wb3J0IHtmaWx0ZXIsIHRhcH0gZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuXG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5wYWNrYWdlLXJ1bm5lcicpO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNlcnZlclJ1bm5lckV2ZW50IHtcbiAgZmlsZTogc3RyaW5nO1xuICBmdW5jdGlvbk5hbWU6IHN0cmluZztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzU2VydmVyUGFja2FnZShwa2c6IFBhY2thZ2VTdGF0ZSkge1xuICByZXR1cm4gcGtnLmpzb24uZHIgJiYgcGtnLmpzb24uZHIudHlwZSAmJiAocGtnLmpzb24uZHIudHlwZSA9PT0gJ3NlcnZlcicgfHwgKHBrZy5qc29uLmRyLnR5cGUgIGFzIHN0cmluZ1tdKS5pbmNsdWRlcygnc2VydmVyJykpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZFByaW9yaXR5UHJvcGVydHkoanNvbjogYW55KSB7XG4gIHJldHVybiBfLmdldChqc29uLCAnZHIuc2VydmVyUHJpb3JpdHknKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJ1blNlcnZlcigpIHtcbiAgbGV0IHdzS2V5OiBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkID0gd29ya3NwYWNlS2V5KHByb2Nlc3MuY3dkKCkpO1xuICB3c0tleSA9IGdldFN0YXRlKCkud29ya3NwYWNlcy5oYXMod3NLZXkpID8gd3NLZXkgOiBnZXRTdGF0ZSgpLmN1cnJXb3Jrc3BhY2U7XG4gIGlmICh3c0tleSA9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdDdXJyZW50IGRpcmVjdG9yeSBpcyBub3QgYSB3b3Jrc3BhY2UgZGlyZWN0b3J5Jyk7XG4gIH1cbiAgY29uc3QgcGtncyA9IEFycmF5LmZyb20ocGFja2FnZXM0V29ya3NwYWNlS2V5KHdzS2V5LCB0cnVlKSlcbiAgLmZpbHRlcihpc1NlcnZlclBhY2thZ2UpXG4gIC5tYXAoaXRlbSA9PiBpdGVtLm5hbWUpO1xuXG4gIGNvbnN0IHJldmVyc2VPcmRlclBrZ0V4cG9ydHMgPSBhd2FpdCBydW5QYWNrYWdlcygnI2FjdGl2YXRlJywgcGtncyk7XG5cbiAgYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDUwMCkpO1xuICByZXR1cm4gYXN5bmMgKCkgPT4ge1xuICAgIGxvZy5pbmZvKCdzaHV0dGluZyBkb3duJyk7XG4gICAgZm9yIChjb25zdCB7bmFtZSwgZXhwfSBvZiByZXZlcnNlT3JkZXJQa2dFeHBvcnRzKSB7XG4gICAgICBpZiAoXy5pc0Z1bmN0aW9uKGV4cC5kZWFjdGl2YXRlKSkge1xuICAgICAgICBsb2cuaW5mbygnZGVhY3RpdmF0ZScsIG5hbWUpO1xuICAgICAgICBhd2FpdCBQcm9taXNlLnJlc29sdmUoZXhwLmRlYWN0aXZhdGUoKSk7XG4gICAgICB9XG4gICAgfVxuICB9O1xufVxuXG5jb25zdCBhcGlDYWNoZToge1tuYW1lOiBzdHJpbmddOiBhbnl9ID0ge307XG4vLyBjb25zdCBwYWNrYWdlVHJlZSA9IG5ldyBEaXJUcmVlPFBhY2thZ2VJbnN0YW5jZT4oKTtcblxuLyoqXG4gKiBMYXppbHkgaW5pdCBpbmplY3RvciBmb3IgcGFja2FnZXMgYW5kIHJ1biBzcGVjaWZpYyBwYWNrYWdlIG9ubHksXG4gKiBubyBmdWxseSBzY2FubmluZyBvciBvcmRlcmluZyBvbiBhbGwgcGFja2FnZXNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJ1blNpbmdsZVBhY2thZ2Uoe3RhcmdldCwgYXJnc306IHt0YXJnZXQ6IHN0cmluZywgYXJnczogc3RyaW5nW119KSB7XG4gIGlmICghaXNDd2RXb3Jrc3BhY2UoKSkge1xuICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ0N1cnJlbnQgZGlyZWN0b3J5IGlzIG5vdCBhIHdvcmtzcGFjZSBkaXJlY3RvcnknKSk7XG4gIH1cbiAgY29uc3QgcGFzc2luQXJndiA9IHt9O1xuICAvLyBjb25zb2xlLmxvZyhhcmdzKTtcbiAgLy8gdGhyb3cgbmV3IEVycm9yKCdzdG9wJyk7XG4gIGZvciAobGV0IGkgPSAwLCBsID0gYXJncy5sZW5ndGg7IGkgPCBsOyBpKyspIHtcbiAgICBjb25zdCBrZXkgPSBhcmdzW2ldO1xuICAgIGlmIChrZXkuc3RhcnRzV2l0aCgnLScpKSB7XG4gICAgICBpZiAoaSA9PT0gYXJncy5sZW5ndGggLSAxIHx8IGFyZ3NbaSArIDFdLnN0YXJ0c1dpdGgoJy0nKSkge1xuICAgICAgICBwYXNzaW5Bcmd2W18udHJpbVN0YXJ0KGtleSwgJy0nKV0gPSB0cnVlO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcGFzc2luQXJndltrZXldID0gYXJnc1tpICsgMV07XG4gICAgICAgIGkrKztcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgaW5pdEluamVjdG9yRm9yTm9kZVBhY2thZ2VzKCk7XG4gIGNvbnN0IFtmaWxlLCBmdW5jXSA9IHRhcmdldC5zcGxpdCgnIycpO1xuXG4gIGNvbnN0IGd1ZXNzaW5nRmlsZTogc3RyaW5nW10gPSBbXG4gICAgZmlsZSxcbiAgICBQYXRoLnJlc29sdmUoZmlsZSksXG4gICAgLi4uKGNvbmZpZygpLnBhY2thZ2VTY29wZXMgYXMgc3RyaW5nW10pLm1hcChzY29wZSA9PiBgQCR7c2NvcGV9LyR7ZmlsZX1gKVxuICBdO1xuICBjb25zdCBmb3VuZE1vZHVsZSA9IGd1ZXNzaW5nRmlsZS5maW5kKHRhcmdldCA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIHJlcXVpcmUucmVzb2x2ZSh0YXJnZXQpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH0pO1xuXG4gIGlmICghZm91bmRNb2R1bGUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIHRhcmdldCBtb2R1bGUgZnJvbSBwYXRocyBsaWtlOlxcbiR7Z3Vlc3NpbmdGaWxlLmpvaW4oJ1xcbicpfWApO1xuICB9XG4gIGNvbnN0IF9leHBvcnRzID0gcmVxdWlyZShmb3VuZE1vZHVsZSk7XG4gIGlmICghXy5oYXMoX2V4cG9ydHMsIGZ1bmMpKSB7XG4gICAgbG9nLmVycm9yKGBUaGVyZSBpcyBubyBleHBvcnQgZnVuY3Rpb246ICR7ZnVuY30sIGV4aXN0aW5nIGV4cG9ydCBtZW1iZXJzIGFyZTpcXG5gICtcbiAgICBgJHtPYmplY3Qua2V5cyhfZXhwb3J0cykuZmlsdGVyKG5hbWUgPT4gdHlwZW9mIChfZXhwb3J0c1tuYW1lXSkgPT09ICdmdW5jdGlvbicpLm1hcChuYW1lID0+IG5hbWUgKyAnKCknKS5qb2luKCdcXG4nKX1gKTtcbiAgICByZXR1cm47XG4gIH1cbiAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKF9leHBvcnRzW2Z1bmNdLmFwcGx5KGdsb2JhbCwgYXJncyB8fCBbXSkpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuUGFja2FnZXModGFyZ2V0OiBzdHJpbmcsIGluY2x1ZGVQYWNrYWdlczogSXRlcmFibGU8c3RyaW5nPik6IFByb21pc2U8e25hbWU6IHN0cmluZzsgZXhwOiBhbnl9W10+IHtcbiAgY29uc3QgaW5jbHVkZU5hbWVTZXQgPSBuZXcgU2V0PHN0cmluZz4oaW5jbHVkZVBhY2thZ2VzKTtcbiAgY29uc3QgcGtnRXhwb3J0c0luUmV2ZXJPcmRlcjoge25hbWU6IHN0cmluZzsgZXhwOiBhbnl9W10gPSBbXTtcblxuICBjb25zdCBbZmlsZVRvUnVuLCBmdW5jVG9SdW5dID0gKHRhcmdldCBhcyBzdHJpbmcpLnNwbGl0KCcjJyk7XG4gIGNvbnN0IFtwYWNrYWdlcywgcHJvdG9dID0gaW5pdEluamVjdG9yRm9yTm9kZVBhY2thZ2VzKCk7XG4gIGNvbnN0IGNvbXBvbmVudHMgPSBwYWNrYWdlcy5maWx0ZXIocGsgPT4ge1xuICAgIC8vIHNldHVwUmVxdWlyZUluamVjdHMocGssIE5vZGVBcGkpOyAvLyBBbGwgY29tcG9uZW50IHBhY2thZ2Ugc2hvdWxkIGJlIGFibGUgdG8gYWNjZXNzICdfX2FwaScsIGV2ZW4gdGhleSBhcmUgbm90IGluY2x1ZGVkXG4gICAgaWYgKChpbmNsdWRlTmFtZVNldC5zaXplID09PSAwIHx8IGluY2x1ZGVOYW1lU2V0Lmhhcyhway5sb25nTmFtZSkgfHwgaW5jbHVkZU5hbWVTZXQuaGFzKHBrLnNob3J0TmFtZSkpKSB7XG4gICAgICB0cnkge1xuICAgICAgICBpZiAoZmlsZVRvUnVuKVxuICAgICAgICAgIHJlcXVpcmUucmVzb2x2ZShway5sb25nTmFtZSArICcvJyArIGZpbGVUb1J1bik7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICByZXF1aXJlLnJlc29sdmUocGsubG9uZ05hbWUpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG5cbiAgY29uc3QgcGFja2FnZU5hbWVzSW5PcmRlcjogc3RyaW5nW10gPSBbXTtcblxuICBhd2FpdCBvcmRlclBhY2thZ2VzKGNvbXBvbmVudHMubWFwKGl0ZW0gPT4gKHtuYW1lOiBpdGVtLmxvbmdOYW1lLCBwcmlvcml0eTogXy5nZXQoaXRlbS5qc29uLCAnZHIuc2VydmVyUHJpb3JpdHknKX0pKSxcbiAgcGtJbnN0YW5jZSAgPT4ge1xuICAgIHBhY2thZ2VOYW1lc0luT3JkZXIucHVzaChwa0luc3RhbmNlLm5hbWUpO1xuICAgIGNvbnN0IG1vZCA9IHBrSW5zdGFuY2UubmFtZSArICggZmlsZVRvUnVuID8gJy8nICsgZmlsZVRvUnVuIDogJycpO1xuICAgIGxvZy5kZWJ1ZygncmVxdWlyZSglcyknLCBKU09OLnN0cmluZ2lmeShtb2QpKTtcbiAgICBjb25zdCBmaWxlRXhwb3J0cyA9IHJlcXVpcmUobW9kKTtcbiAgICBwa2dFeHBvcnRzSW5SZXZlck9yZGVyLnVuc2hpZnQoe25hbWU6IHBrSW5zdGFuY2UubmFtZSwgZXhwOiBmaWxlRXhwb3J0c30pO1xuICAgIGlmIChfLmlzRnVuY3Rpb24oZmlsZUV4cG9ydHNbZnVuY1RvUnVuXSkpIHtcbiAgICAgIGxvZy5pbmZvKGZ1bmNUb1J1biArIGAgJHtjaGFsay5jeWFuKG1vZCl9YCk7XG4gICAgICByZXR1cm4gZmlsZUV4cG9ydHNbZnVuY1RvUnVuXSgpO1xuICAgIH1cbiAgfSk7XG4gIChwcm90by5ldmVudEJ1cyBhcyBFdmVudHMuRXZlbnRFbWl0dGVyKS5lbWl0KCdkb25lJywge2ZpbGU6IGZpbGVUb1J1biwgZnVuY3Rpb25OYW1lOiBmdW5jVG9SdW59IGFzIFNlcnZlclJ1bm5lckV2ZW50KTtcbiAgY29uc3QgTm9kZUFwaTogdHlwZW9mIF9Ob2RlQXBpID0gcmVxdWlyZSgnLi9wYWNrYWdlLW1nci9ub2RlLXBhY2thZ2UtYXBpJyk7XG4gIE5vZGVBcGkucHJvdG90eXBlLmV2ZW50QnVzLmVtaXQoJ3BhY2thZ2VzQWN0aXZhdGVkJywgaW5jbHVkZU5hbWVTZXQpO1xuICByZXR1cm4gcGtnRXhwb3J0c0luUmV2ZXJPcmRlcjtcbn1cblxuLyoqXG4gKiBTbyB0aGF0IHdlIGNhbiB1c2UgYGltcG9ydCBhcGkgZnJvbSAnX19wbGluaydgIGFueXdoZXJlIGluIG91ciBwYWNrYWdlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMoKTpcbiAgW1BhY2thZ2VJbnN0YW5jZVtdLCBfTm9kZUFwaV0ge1xuICBjb25zdCBwYWNrYWdlSW5mbzogUGFja2FnZUluZm8gPSB3YWxrUGFja2FnZXMoKTtcbiAgY29uc3QgTm9kZUFwaTogdHlwZW9mIF9Ob2RlQXBpID0gcmVxdWlyZSgnLi9wYWNrYWdlLW1nci9ub2RlLXBhY2thZ2UtYXBpJyk7XG4gIGNvbnN0IHByb3RvID0gTm9kZUFwaS5wcm90b3R5cGU7XG4gIHByb3RvLmFyZ3YgPSB7fTtcbiAgcHJvdG8ucGFja2FnZUluZm8gPSBwYWNrYWdlSW5mbztcbiAgY29uc3QgY2FjaGUgPSBuZXcgTFJVPHN0cmluZywgUGFja2FnZUluc3RhbmNlPih7bWF4OiAyMCwgbWF4QWdlOiAyMDAwMH0pO1xuICBwcm90by5maW5kUGFja2FnZUJ5RmlsZSA9IGZ1bmN0aW9uKGZpbGU6IHN0cmluZyk6IFBhY2thZ2VJbnN0YW5jZSB8IHVuZGVmaW5lZCB7XG4gICAgdmFyIGZvdW5kID0gY2FjaGUuZ2V0KGZpbGUpO1xuICAgIGlmICghZm91bmQpIHtcbiAgICAgIGZvdW5kID0gcGFja2FnZUluZm8uZGlyVHJlZS5nZXRBbGxEYXRhKGZpbGUpLnBvcCgpO1xuICAgICAgaWYgKGZvdW5kKVxuICAgICAgICBjYWNoZS5zZXQoZmlsZSwgZm91bmQpO1xuICAgIH1cbiAgICByZXR1cm4gZm91bmQ7XG4gIH07XG4gIHByb3RvLmdldE5vZGVBcGlGb3JQYWNrYWdlID0gZnVuY3Rpb24ocGFja2FnZUluc3RhbmNlOiBQYWNrYWdlSW5zdGFuY2UpIHtcbiAgICByZXR1cm4gZ2V0QXBpRm9yUGFja2FnZShwYWNrYWdlSW5zdGFuY2UsIE5vZGVBcGkpO1xuICB9O1xuICBwcm90by5icm93c2VySW5qZWN0b3IgPSB3ZWJJbmplY3RvcjtcbiAgcGFja2FnZUluZm8uYWxsTW9kdWxlcy5mb3JFYWNoKHBrID0+IHtcbiAgICBzZXR1cFJlcXVpcmVJbmplY3RzKHBrLCBOb2RlQXBpKTsgLy8gQWxsIGNvbXBvbmVudCBwYWNrYWdlIHNob3VsZCBiZSBhYmxlIHRvIGFjY2VzcyAnX19hcGknLCBldmVuIHRoZXkgYXJlIG5vdCBpbmNsdWRlZFxuICB9KTtcbiAgLy8gY29uc29sZS5sb2coJz4+Pj4+Pj4+Pj4+Pj4+Pj4+PicpXG4gIGNvbmZpZy5jb25maWd1cmVTdG9yZS5waXBlKFxuICAgIGZpbHRlcihzZXR0aW5nID0+IHNldHRpbmcgIT0gbnVsbCksXG4gICAgdGFwKHNldHRpbmcgPT4ge1xuICAgICAgLy8gY29uc29sZS5sb2coJz4+Pj4+Pj4+PisrKysrKz4+Pj4+Pj4+PicpXG4gICAgICBub2RlSW5qZWN0b3IucmVhZEluamVjdEZpbGUoKTtcbiAgICAgIHdlYkluamVjdG9yLnJlYWRJbmplY3RGaWxlKCdtb2R1bGUtcmVzb2x2ZS5icm93c2VyJyk7XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcbiAgcmV0dXJuIFtwYWNrYWdlSW5mby5hbGxNb2R1bGVzLCBwcm90b107XG59XG5cbi8vIGZ1bmN0aW9uIGluaXRXZWJJbmplY3RvcihwYWNrYWdlczogUGFja2FnZUluc3RhbmNlW10sIGFwaVByb3RvdHlwZTogYW55KSB7XG4vLyAgIF8uZWFjaChwYWNrYWdlcywgcGFjayA9PiB7XG4vLyAgICAgd2ViSW5qZWN0b3IuYWRkUGFja2FnZShwYWNrLmxvbmdOYW1lLCBwYWNrLnJlYWxQYXRoKTtcbi8vICAgfSk7XG4vLyAgIHdlYkluamVjdG9yLmZyb21BbGxQYWNrYWdlcygpXG4vLyAgIC5yZXBsYWNlQ29kZSgnX19hcGknLCAnX19hcGknKVxuLy8gICAuc3Vic3RpdHV0ZSgvXihbXntdKilcXHtsb2NhbGVcXH0oLiopJC8sXG4vLyAgICAgKF9maWxlUGF0aDogc3RyaW5nLCBtYXRjaDogUmVnRXhwRXhlY0FycmF5KSA9PiBtYXRjaFsxXSArIGFwaVByb3RvdHlwZS5nZXRCdWlsZExvY2FsZSgpICsgbWF0Y2hbMl0pO1xuXG4vLyAgIHdlYkluamVjdG9yLnJlYWRJbmplY3RGaWxlKCdtb2R1bGUtcmVzb2x2ZS5icm93c2VyJyk7XG4vLyAgIGFwaVByb3RvdHlwZS5icm93c2VySW5qZWN0b3IgPSB3ZWJJbmplY3Rvcjtcbi8vIH1cblxuLyoqXG4gKiBAZGVwcmVjYXRlZFxuICogU3VwcG9ydCBgaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7YFxuICogQHBhcmFtIGFyZ3YgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcmVwYXJlTGF6eU5vZGVJbmplY3Rvcihhcmd2Pzoge1trZXk6IHN0cmluZ106IGFueX0pIHtcbiAgY29uc3QgTm9kZUFwaTogdHlwZW9mIF9Ob2RlQXBpID0gcmVxdWlyZSgnLi9wYWNrYWdlLW1nci9ub2RlLXBhY2thZ2UtYXBpJyk7XG4gIGNvbnN0IHByb3RvID0gTm9kZUFwaS5wcm90b3R5cGU7XG4gIHByb3RvLmFyZ3YgPSBhcmd2IHx8IHt9O1xuICBsZXQgcGFja2FnZUluZm86IFBhY2thZ2VJbmZvO1xuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90bywgJ3BhY2thZ2VJbmZvJywge1xuICAgIGdldCgpIHtcbiAgICAgIGlmIChwYWNrYWdlSW5mbyA9PSBudWxsKVxuICAgICAgICBwYWNrYWdlSW5mbyA9IHdhbGtQYWNrYWdlcygpO1xuICAgICAgcmV0dXJuIHBhY2thZ2VJbmZvO1xuICAgIH1cbiAgfSk7XG4gIHByb3RvLmZpbmRQYWNrYWdlQnlGaWxlID0gY3JlYXRlTGF6eVBhY2thZ2VGaWxlRmluZGVyKCk7XG4gIHByb3RvLmdldE5vZGVBcGlGb3JQYWNrYWdlID0gZnVuY3Rpb24ocGFja2FnZUluc3RhbmNlOiBOb2RlUGFja2FnZSkge1xuICAgIHJldHVybiBnZXRBcGlGb3JQYWNrYWdlKHBhY2thZ2VJbnN0YW5jZSwgTm9kZUFwaSk7XG4gIH07XG4gIG5vZGVJbmplY3Rvci5mcm9tUm9vdCgpXG4gIC8vIC5hbGlhcygnbG9nNGpzJywgUGF0aC5yZXNvbHZlKGNvbmZpZygpLnJvb3RQYXRoLCAnbm9kZV9tb2R1bGVzL2xvZzRqcycpKVxuICAudmFsdWUoJ19faW5qZWN0b3InLCBub2RlSW5qZWN0b3IpXG4gIC5mYWN0b3J5KCdfX2FwaScsIChzb3VyY2VGaWxlUGF0aDogc3RyaW5nKSA9PiB7XG4gICAgY29uc3QgcGFja2FnZUluc3RhbmNlID0gcHJvdG8uZmluZFBhY2thZ2VCeUZpbGUoc291cmNlRmlsZVBhdGgpO1xuICAgIGlmIChwYWNrYWdlSW5zdGFuY2UpXG4gICAgICByZXR1cm4gZ2V0QXBpRm9yUGFja2FnZShwYWNrYWdlSW5zdGFuY2UsIE5vZGVBcGkpO1xuICAgIHJldHVybiBudWxsO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1hcFBhY2thZ2VzQnlUeXBlKHR5cGVzOiBzdHJpbmdbXSwgb25FYWNoUGFja2FnZTogKG5vZGVQYWNrYWdlOiBOb2RlUGFja2FnZSkgPT4gdm9pZCkge1xuICBjb25zdCBwYWNrYWdlc01hcDoge1t0eXBlOiBzdHJpbmddOiBOb2RlUGFja2FnZVtdfSA9IHt9O1xuICB0eXBlcy5mb3JFYWNoKHR5cGUgPT4ge1xuICAgIHBhY2thZ2VzTWFwW3R5cGVdID0gW107XG4gIH0pO1xuXG4gIGZvciAoY29uc3QgcGtnIG9mIHBhY2thZ2VzNFdvcmtzcGFjZSgpKSB7XG4gICAgY29uc3QgbmFtZSA9IHBrZy5uYW1lO1xuICAgIGNvbnN0IHBrSW5zdGFuY2UgPSBuZXcgTm9kZVBhY2thZ2Uoe1xuICAgICAgbW9kdWxlTmFtZTogbmFtZSxcbiAgICAgIHNob3J0TmFtZTogcGtnLnNob3J0TmFtZSxcbiAgICAgIG5hbWUsXG4gICAgICBsb25nTmFtZTogbmFtZSxcbiAgICAgIHNjb3BlOiBwa2cuc2NvcGUsXG4gICAgICBwYXRoOiBwa2cucGF0aCxcbiAgICAgIGpzb246IHBrZy5qc29uLFxuICAgICAgcmVhbFBhdGg6IHBrZy5yZWFsUGF0aFxuICAgIH0pO1xuICAgIGNvbnN0IGRyVHlwZXMgPSAoW10gYXMgc3RyaW5nW10pLmNvbmNhdChfLmdldChwa2csICdqc29uLmRyLnR5cGUnKSk7XG4gICAgZm9yIChjb25zdCB0eXBlIG9mIHR5cGVzKSB7XG4gICAgICBpZiAoIV8uaW5jbHVkZXMoZHJUeXBlcywgdHlwZSkpXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgcGFja2FnZXNNYXBbdHlwZV0ucHVzaChwa0luc3RhbmNlKTtcbiAgICB9XG4gICAgaWYgKG9uRWFjaFBhY2thZ2UpIHtcbiAgICAgIG9uRWFjaFBhY2thZ2UocGtJbnN0YW5jZSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBwYWNrYWdlc01hcDtcbn1cblxuZnVuY3Rpb24gc2V0dXBSZXF1aXJlSW5qZWN0cyhwa0luc3RhbmNlOiBQYWNrYWdlSW5zdGFuY2UsIE5vZGVBcGk6IHR5cGVvZiBfTm9kZUFwaSApIHtcbiAgZnVuY3Rpb24gYXBpRmFjdG9yeSgpIHtcbiAgICByZXR1cm4gZ2V0QXBpRm9yUGFja2FnZShwa0luc3RhbmNlLCBOb2RlQXBpKTtcbiAgfVxuICBub2RlSW5qZWN0b3IuYWRkUGFja2FnZShwa0luc3RhbmNlLmxvbmdOYW1lLCBwa0luc3RhbmNlLnJlYWxQYXRoLFxuICAgIHBrSW5zdGFuY2UucGF0aCA9PT0gcGtJbnN0YW5jZS5yZWFsUGF0aCA/IHVuZGVmaW5lZCA6IHBrSW5zdGFuY2UucGF0aCk7XG4gIG5vZGVJbmplY3Rvci5mcm9tRGlyKHBrSW5zdGFuY2UucmVhbFBhdGgpXG4gIC52YWx1ZSgnX19pbmplY3RvcicsIG5vZGVJbmplY3RvcilcbiAgLmZhY3RvcnkoJ19fYXBpJywgYXBpRmFjdG9yeSlcbiAgLmZhY3RvcnkoJ19fcGxpbmsnLCBhcGlGYWN0b3J5KTtcblxuICB3ZWJJbmplY3Rvci5mcm9tRGlyKHBrSW5zdGFuY2UucmVhbFBhdGgpXG4gIC5yZXBsYWNlQ29kZSgnX19hcGknLCAnX19hcGknKTtcbiAgLy8gLnN1YnN0aXR1dGUoL14oW157XSopXFx7bG9jYWxlXFx9KC4qKSQvLFxuICAvLyAgIChfZmlsZVBhdGg6IHN0cmluZywgbWF0Y2g6IFJlZ0V4cEV4ZWNBcnJheSkgPT4gbWF0Y2hbMV0gKyBhcGlQcm90b3R5cGUuZ2V0QnVpbGRMb2NhbGUoKSArIG1hdGNoWzJdKTtcbiAgY29uc3Qgc3ltbGlua0RpciA9IGdldFN5bWxpbmtGb3JQYWNrYWdlKHBrSW5zdGFuY2UubmFtZSk7XG4gIGlmIChzeW1saW5rRGlyKSB7XG4gICAgbm9kZUluamVjdG9yLmZyb21EaXIoc3ltbGlua0RpcilcbiAgICAudmFsdWUoJ19faW5qZWN0b3InLCBub2RlSW5qZWN0b3IpXG4gICAgLmZhY3RvcnkoJ19fcGxpbmsnLCBhcGlGYWN0b3J5KTtcblxuICAgIHdlYkluamVjdG9yLmZyb21EaXIoc3ltbGlua0RpcilcbiAgICAucmVwbGFjZUNvZGUoJ19fYXBpJywgJ19fYXBpJyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0QXBpRm9yUGFja2FnZShwa0luc3RhbmNlOiBOb2RlUGFja2FnZSwgTm9kZUFwaTogdHlwZW9mIF9Ob2RlQXBpKSB7XG4gIGlmIChfLmhhcyhhcGlDYWNoZSwgcGtJbnN0YW5jZS5sb25nTmFtZSkpIHtcbiAgICByZXR1cm4gYXBpQ2FjaGVbcGtJbnN0YW5jZS5sb25nTmFtZV07XG4gIH1cblxuICBjb25zdCBhcGkgPSBuZXcgTm9kZUFwaShwa0luc3RhbmNlLmxvbmdOYW1lLCBwa0luc3RhbmNlKTtcbiAgLy8gYXBpLmNvbnN0cnVjdG9yID0gTm9kZUFwaTtcbiAgcGtJbnN0YW5jZS5hcGkgPSBhcGk7XG4gIGFwaUNhY2hlW3BrSW5zdGFuY2UubG9uZ05hbWVdID0gYXBpO1xuICBhcGkuZGVmYXVsdCA9IGFwaTsgLy8gRm9yIEVTNiBpbXBvcnQgc3ludGF4XG4gIHJldHVybiBhcGk7XG59XG4iXX0=