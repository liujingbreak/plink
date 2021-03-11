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
        const NodeApi = require('./package-mgr/node-package-api').default;
        yield package_priority_helper_1.orderPackages(components.map(item => ({ name: item.longName, priority: _.get(item.json, 'dr.serverPriority') })), pkInstance => {
            packageNamesInOrder.push(pkInstance.name);
            const mod = pkInstance.name + (fileToRun ? '/' + fileToRun : '');
            log.debug('require(%s)', JSON.stringify(mod));
            const fileExports = require(mod);
            pkgExportsInReverOrder.unshift({ name: pkInstance.name, exp: fileExports });
            if (_.isFunction(fileExports[funcToRun])) {
                log.info(funcToRun + ` ${chalk_1.default.cyan(mod)}`);
                return fileExports[funcToRun](apiCache[pkInstance.name]);
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
    // console.log('>>>>>>>>>>>>>>>>>>')
    // config.configureStore.pipe(
    //   filter(setting => setting != null),
    //   tap(setting => {
    //     // console.log('>>>>>>>>>++++++>>>>>>>>>')
    //     nodeInjector.readInjectFile();
    //     webInjector.readInjectFile('module-resolve.browser');
    //   })
    // ).subscribe();
    injector_factory_1.nodeInjector.readInjectFile();
    injector_factory_1.webInjector.readInjectFile('module-resolve.browser');
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
    apiCache[pkInstance.longName] = api;
    api.default = api; // For ES6 import syntax
    return api;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wYWNrYWdlLXJ1bm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0NBQW9DO0FBQ3BDLDBDQUE0QjtBQUM1QiwwREFBNEI7QUFDNUIsaUZBQStFO0FBQy9FLHlEQUErRDtBQUcvRCx1RUFBMEQ7QUFDMUQsZ0ZBQWdEO0FBQ2hELGdEQUF3QjtBQUV4QixtREFBZ0Y7QUFDaEYsb0RBQTRCO0FBQzVCLHNEQUE4QjtBQUM5QiwrQ0FBa0c7QUFDbEcsMkVBQXdFO0FBQ3hFLGtEQUEwQjtBQUMxQix1Q0FBa0Q7QUFFbEQsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsc0JBQXNCLENBQUMsQ0FBQztBQU9yRCxTQUFnQixlQUFlLENBQUMsR0FBaUI7SUFDL0MsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssUUFBUSxJQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQWtCLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7QUFDbEksQ0FBQztBQUZELDBDQUVDO0FBRUQsU0FBZ0Isb0JBQW9CLENBQUMsSUFBUztJQUM1QyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLG1CQUFtQixDQUFDLENBQUM7QUFDMUMsQ0FBQztBQUZELG9EQUVDO0FBRUQsU0FBc0IsU0FBUzs7UUFDN0IsSUFBSSxLQUFLLEdBQThCLDBCQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDbkUsS0FBSyxHQUFHLHNCQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFD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QyxDQUFDO0lBQy9CLHlDQUF5QztJQUN6Qyx5R0FBeUc7SUFDekcsTUFBTSxVQUFVLEdBQUcsMkJBQW9CLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQ3pELElBQUksVUFBVSxFQUFFO1FBQ2QsK0JBQVksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDO2FBQy9CLEtBQUssQ0FBQyxZQUFZLEVBQUUsK0JBQVksQ0FBQzthQUNqQyxPQUFPLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRWhDLDhCQUFXLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQzthQUM5QixXQUFXLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0tBQ2hDO0FBQ0gsQ0FBQztBQUVELFNBQVMsZ0JBQWdCLENBQUMsVUFBdUIsRUFBRSxPQUF3QjtJQUN6RSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxRQUFRLENBQUMsRUFBRTtRQUN4QyxPQUFPLFFBQVEsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDdEM7SUFFRCxNQUFNLEdBQUcsR0FBRyxJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ3pELFFBQVEsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEdBQUcsR0FBRyxDQUFDO0lBQ3BDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLENBQUMsd0JBQXdCO0lBQzNDLE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG1heC1saW5lLWxlbmd0aCAqL1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IExSVSBmcm9tICdscnUtY2FjaGUnO1xuaW1wb3J0IHtQYWNrYWdlSW5mbywgd2Fsa1BhY2thZ2VzfSBmcm9tICcuL3BhY2thZ2UtbWdyL3BhY2thZ2UtaW5mby1nYXRoZXJpbmcnO1xuaW1wb3J0IHsgbm9kZUluamVjdG9yLCB3ZWJJbmplY3RvciB9IGZyb20gJy4vaW5qZWN0b3ItZmFjdG9yeSc7XG5pbXBvcnQgX05vZGVBcGkgZnJvbSAnLi9wYWNrYWdlLW1nci9ub2RlLXBhY2thZ2UtYXBpJztcbmltcG9ydCBQYWNrYWdlSW5zdGFuY2UgZnJvbSAnLi9wYWNrYWdlTm9kZUluc3RhbmNlJztcbmltcG9ydCB7IG9yZGVyUGFja2FnZXMgfSBmcm9tICcuL3BhY2thZ2UtcHJpb3JpdHktaGVscGVyJztcbmltcG9ydCBOb2RlUGFja2FnZSBmcm9tICcuL3BhY2thZ2VOb2RlSW5zdGFuY2UnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgRXZlbnRzIGZyb20gJ2V2ZW50cyc7XG5pbXBvcnQge2NyZWF0ZUxhenlQYWNrYWdlRmlsZUZpbmRlciwgcGFja2FnZXM0V29ya3NwYWNlfSBmcm9tICcuL3BhY2thZ2UtdXRpbHMnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQge2lzQ3dkV29ya3NwYWNlLCBnZXRTdGF0ZSwgd29ya3NwYWNlS2V5LCBQYWNrYWdlSW5mbyBhcyBQYWNrYWdlU3RhdGV9IGZyb20gJy4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHtwYWNrYWdlczRXb3Jrc3BhY2VLZXl9IGZyb20gJy4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcic7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHtnZXRTeW1saW5rRm9yUGFja2FnZX0gZnJvbSAnLi91dGlscy9taXNjJztcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsucGFja2FnZS1ydW5uZXInKTtcblxuZXhwb3J0IGludGVyZmFjZSBTZXJ2ZXJSdW5uZXJFdmVudCB7XG4gIGZpbGU6IHN0cmluZztcbiAgZnVuY3Rpb25OYW1lOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1NlcnZlclBhY2thZ2UocGtnOiBQYWNrYWdlU3RhdGUpIHtcbiAgcmV0dXJuIHBrZy5qc29uLmRyICYmIHBrZy5qc29uLmRyLnR5cGUgJiYgKHBrZy5qc29uLmRyLnR5cGUgPT09ICdzZXJ2ZXInIHx8IChwa2cuanNvbi5kci50eXBlICBhcyBzdHJpbmdbXSkuaW5jbHVkZXMoJ3NlcnZlcicpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRQcmlvcml0eVByb3BlcnR5KGpzb246IGFueSkge1xuICByZXR1cm4gXy5nZXQoanNvbiwgJ2RyLnNlcnZlclByaW9yaXR5Jyk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5TZXJ2ZXIoKSB7XG4gIGxldCB3c0tleTogc3RyaW5nIHwgbnVsbCB8IHVuZGVmaW5lZCA9IHdvcmtzcGFjZUtleShwcm9jZXNzLmN3ZCgpKTtcbiAgd3NLZXkgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHdzS2V5KSA/IHdzS2V5IDogZ2V0U3RhdGUoKS5jdXJyV29ya3NwYWNlO1xuICBpZiAod3NLZXkgPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcignQ3VycmVudCBkaXJlY3RvcnkgaXMgbm90IGEgd29ya3NwYWNlIGRpcmVjdG9yeScpO1xuICB9XG4gIGNvbnN0IHBrZ3MgPSBBcnJheS5mcm9tKHBhY2thZ2VzNFdvcmtzcGFjZUtleSh3c0tleSwgdHJ1ZSkpXG4gIC5maWx0ZXIoaXNTZXJ2ZXJQYWNrYWdlKVxuICAubWFwKGl0ZW0gPT4gaXRlbS5uYW1lKTtcblxuICBjb25zdCByZXZlcnNlT3JkZXJQa2dFeHBvcnRzID0gYXdhaXQgcnVuUGFja2FnZXMoJyNhY3RpdmF0ZScsIHBrZ3MpO1xuXG4gIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCA1MDApKTtcbiAgcmV0dXJuIGFzeW5jICgpID0+IHtcbiAgICBsb2cuaW5mbygnc2h1dHRpbmcgZG93bicpO1xuICAgIGZvciAoY29uc3Qge25hbWUsIGV4cH0gb2YgcmV2ZXJzZU9yZGVyUGtnRXhwb3J0cykge1xuICAgICAgaWYgKF8uaXNGdW5jdGlvbihleHAuZGVhY3RpdmF0ZSkpIHtcbiAgICAgICAgbG9nLmluZm8oJ2RlYWN0aXZhdGUnLCBuYW1lKTtcbiAgICAgICAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKGV4cC5kZWFjdGl2YXRlKCkpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbn1cblxuY29uc3QgYXBpQ2FjaGU6IHtbbmFtZTogc3RyaW5nXTogYW55fSA9IHt9O1xuLy8gY29uc3QgcGFja2FnZVRyZWUgPSBuZXcgRGlyVHJlZTxQYWNrYWdlSW5zdGFuY2U+KCk7XG5cbi8qKlxuICogTGF6aWx5IGluaXQgaW5qZWN0b3IgZm9yIHBhY2thZ2VzIGFuZCBydW4gc3BlY2lmaWMgcGFja2FnZSBvbmx5LFxuICogbm8gZnVsbHkgc2Nhbm5pbmcgb3Igb3JkZXJpbmcgb24gYWxsIHBhY2thZ2VzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5TaW5nbGVQYWNrYWdlKHt0YXJnZXQsIGFyZ3N9OiB7dGFyZ2V0OiBzdHJpbmcsIGFyZ3M6IHN0cmluZ1tdfSkge1xuICBpZiAoIWlzQ3dkV29ya3NwYWNlKCkpIHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKCdDdXJyZW50IGRpcmVjdG9yeSBpcyBub3QgYSB3b3Jrc3BhY2UgZGlyZWN0b3J5JykpO1xuICB9XG4gIGNvbnN0IHBhc3NpbkFyZ3YgPSB7fTtcbiAgLy8gY29uc29sZS5sb2coYXJncyk7XG4gIC8vIHRocm93IG5ldyBFcnJvcignc3RvcCcpO1xuICBmb3IgKGxldCBpID0gMCwgbCA9IGFyZ3MubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgY29uc3Qga2V5ID0gYXJnc1tpXTtcbiAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJy0nKSkge1xuICAgICAgaWYgKGkgPT09IGFyZ3MubGVuZ3RoIC0gMSB8fCBhcmdzW2kgKyAxXS5zdGFydHNXaXRoKCctJykpIHtcbiAgICAgICAgcGFzc2luQXJndltfLnRyaW1TdGFydChrZXksICctJyldID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhc3NpbkFyZ3Zba2V5XSA9IGFyZ3NbaSArIDFdO1xuICAgICAgICBpKys7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGluaXRJbmplY3RvckZvck5vZGVQYWNrYWdlcygpO1xuICBjb25zdCBbZmlsZSwgZnVuY10gPSB0YXJnZXQuc3BsaXQoJyMnKTtcblxuICBjb25zdCBndWVzc2luZ0ZpbGU6IHN0cmluZ1tdID0gW1xuICAgIGZpbGUsXG4gICAgUGF0aC5yZXNvbHZlKGZpbGUpLFxuICAgIC4uLihjb25maWcoKS5wYWNrYWdlU2NvcGVzIGFzIHN0cmluZ1tdKS5tYXAoc2NvcGUgPT4gYEAke3Njb3BlfS8ke2ZpbGV9YClcbiAgXTtcbiAgY29uc3QgZm91bmRNb2R1bGUgPSBndWVzc2luZ0ZpbGUuZmluZCh0YXJnZXQgPT4ge1xuICAgIHRyeSB7XG4gICAgICByZXF1aXJlLnJlc29sdmUodGFyZ2V0KTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9KTtcblxuICBpZiAoIWZvdW5kTW9kdWxlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCB0YXJnZXQgbW9kdWxlIGZyb20gcGF0aHMgbGlrZTpcXG4ke2d1ZXNzaW5nRmlsZS5qb2luKCdcXG4nKX1gKTtcbiAgfVxuICBjb25zdCBfZXhwb3J0cyA9IHJlcXVpcmUoZm91bmRNb2R1bGUpO1xuICBpZiAoIV8uaGFzKF9leHBvcnRzLCBmdW5jKSkge1xuICAgIGxvZy5lcnJvcihgVGhlcmUgaXMgbm8gZXhwb3J0IGZ1bmN0aW9uOiAke2Z1bmN9LCBleGlzdGluZyBleHBvcnQgbWVtYmVycyBhcmU6XFxuYCArXG4gICAgYCR7T2JqZWN0LmtleXMoX2V4cG9ydHMpLmZpbHRlcihuYW1lID0+IHR5cGVvZiAoX2V4cG9ydHNbbmFtZV0pID09PSAnZnVuY3Rpb24nKS5tYXAobmFtZSA9PiBuYW1lICsgJygpJykuam9pbignXFxuJyl9YCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGF3YWl0IFByb21pc2UucmVzb2x2ZShfZXhwb3J0c1tmdW5jXS5hcHBseShnbG9iYWwsIGFyZ3MgfHwgW10pKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJ1blBhY2thZ2VzKHRhcmdldDogc3RyaW5nLCBpbmNsdWRlUGFja2FnZXM6IEl0ZXJhYmxlPHN0cmluZz4pOiBQcm9taXNlPHtuYW1lOiBzdHJpbmc7IGV4cDogYW55fVtdPiB7XG4gIGNvbnN0IGluY2x1ZGVOYW1lU2V0ID0gbmV3IFNldDxzdHJpbmc+KGluY2x1ZGVQYWNrYWdlcyk7XG4gIGNvbnN0IHBrZ0V4cG9ydHNJblJldmVyT3JkZXI6IHtuYW1lOiBzdHJpbmc7IGV4cDogYW55fVtdID0gW107XG5cbiAgY29uc3QgW2ZpbGVUb1J1biwgZnVuY1RvUnVuXSA9ICh0YXJnZXQgYXMgc3RyaW5nKS5zcGxpdCgnIycpO1xuICBjb25zdCBbcGFja2FnZXMsIHByb3RvXSA9IGluaXRJbmplY3RvckZvck5vZGVQYWNrYWdlcygpO1xuICBjb25zdCBjb21wb25lbnRzID0gcGFja2FnZXMuZmlsdGVyKHBrID0+IHtcbiAgICAvLyBzZXR1cFJlcXVpcmVJbmplY3RzKHBrLCBOb2RlQXBpKTsgLy8gQWxsIGNvbXBvbmVudCBwYWNrYWdlIHNob3VsZCBiZSBhYmxlIHRvIGFjY2VzcyAnX19hcGknLCBldmVuIHRoZXkgYXJlIG5vdCBpbmNsdWRlZFxuICAgIGlmICgoaW5jbHVkZU5hbWVTZXQuc2l6ZSA9PT0gMCB8fCBpbmNsdWRlTmFtZVNldC5oYXMocGsubG9uZ05hbWUpIHx8IGluY2x1ZGVOYW1lU2V0Lmhhcyhway5zaG9ydE5hbWUpKSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKGZpbGVUb1J1bilcbiAgICAgICAgICByZXF1aXJlLnJlc29sdmUocGsubG9uZ05hbWUgKyAnLycgKyBmaWxlVG9SdW4pO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgcmVxdWlyZS5yZXNvbHZlKHBrLmxvbmdOYW1lKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xuXG4gIGNvbnN0IHBhY2thZ2VOYW1lc0luT3JkZXI6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IE5vZGVBcGk6IHR5cGVvZiBfTm9kZUFwaSA9IHJlcXVpcmUoJy4vcGFja2FnZS1tZ3Ivbm9kZS1wYWNrYWdlLWFwaScpLmRlZmF1bHQ7XG5cblxuICBhd2FpdCBvcmRlclBhY2thZ2VzKGNvbXBvbmVudHMubWFwKGl0ZW0gPT4gKHtuYW1lOiBpdGVtLmxvbmdOYW1lLCBwcmlvcml0eTogXy5nZXQoaXRlbS5qc29uLCAnZHIuc2VydmVyUHJpb3JpdHknKX0pKSxcbiAgcGtJbnN0YW5jZSAgPT4ge1xuICAgIHBhY2thZ2VOYW1lc0luT3JkZXIucHVzaChwa0luc3RhbmNlLm5hbWUpO1xuICAgIGNvbnN0IG1vZCA9IHBrSW5zdGFuY2UubmFtZSArICggZmlsZVRvUnVuID8gJy8nICsgZmlsZVRvUnVuIDogJycpO1xuICAgIGxvZy5kZWJ1ZygncmVxdWlyZSglcyknLCBKU09OLnN0cmluZ2lmeShtb2QpKTtcbiAgICBjb25zdCBmaWxlRXhwb3J0cyA9IHJlcXVpcmUobW9kKTtcbiAgICBwa2dFeHBvcnRzSW5SZXZlck9yZGVyLnVuc2hpZnQoe25hbWU6IHBrSW5zdGFuY2UubmFtZSwgZXhwOiBmaWxlRXhwb3J0c30pO1xuICAgIGlmIChfLmlzRnVuY3Rpb24oZmlsZUV4cG9ydHNbZnVuY1RvUnVuXSkpIHtcbiAgICAgIGxvZy5pbmZvKGZ1bmNUb1J1biArIGAgJHtjaGFsay5jeWFuKG1vZCl9YCk7XG4gICAgICByZXR1cm4gZmlsZUV4cG9ydHNbZnVuY1RvUnVuXShhcGlDYWNoZVtwa0luc3RhbmNlLm5hbWVdKTtcbiAgICB9XG4gIH0pO1xuICAocHJvdG8uZXZlbnRCdXMgYXMgRXZlbnRzLkV2ZW50RW1pdHRlcikuZW1pdCgnZG9uZScsIHtmaWxlOiBmaWxlVG9SdW4sIGZ1bmN0aW9uTmFtZTogZnVuY1RvUnVufSBhcyBTZXJ2ZXJSdW5uZXJFdmVudCk7XG4gIE5vZGVBcGkucHJvdG90eXBlLmV2ZW50QnVzLmVtaXQoJ3BhY2thZ2VzQWN0aXZhdGVkJywgaW5jbHVkZU5hbWVTZXQpO1xuICByZXR1cm4gcGtnRXhwb3J0c0luUmV2ZXJPcmRlcjtcbn1cblxuLyoqXG4gKiBTbyB0aGF0IHdlIGNhbiB1c2UgYGltcG9ydCBhcGkgZnJvbSAnX19wbGluaydgIGFueXdoZXJlIGluIG91ciBwYWNrYWdlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMoKTpcbiAgW1BhY2thZ2VJbnN0YW5jZVtdLCBfTm9kZUFwaV0ge1xuICBjb25zdCBwYWNrYWdlSW5mbzogUGFja2FnZUluZm8gPSB3YWxrUGFja2FnZXMoKTtcbiAgY29uc3QgTm9kZUFwaTogdHlwZW9mIF9Ob2RlQXBpID0gcmVxdWlyZSgnLi9wYWNrYWdlLW1nci9ub2RlLXBhY2thZ2UtYXBpJykuZGVmYXVsdDtcbiAgY29uc3QgcHJvdG8gPSBOb2RlQXBpLnByb3RvdHlwZTtcbiAgcHJvdG8uYXJndiA9IHt9O1xuICBwcm90by5wYWNrYWdlSW5mbyA9IHBhY2thZ2VJbmZvO1xuICBjb25zdCBjYWNoZSA9IG5ldyBMUlU8c3RyaW5nLCBQYWNrYWdlSW5zdGFuY2U+KHttYXg6IDIwLCBtYXhBZ2U6IDIwMDAwfSk7XG4gIHByb3RvLmZpbmRQYWNrYWdlQnlGaWxlID0gZnVuY3Rpb24oZmlsZTogc3RyaW5nKTogUGFja2FnZUluc3RhbmNlIHwgdW5kZWZpbmVkIHtcbiAgICB2YXIgZm91bmQgPSBjYWNoZS5nZXQoZmlsZSk7XG4gICAgaWYgKCFmb3VuZCkge1xuICAgICAgZm91bmQgPSBwYWNrYWdlSW5mby5kaXJUcmVlLmdldEFsbERhdGEoZmlsZSkucG9wKCk7XG4gICAgICBpZiAoZm91bmQpXG4gICAgICAgIGNhY2hlLnNldChmaWxlLCBmb3VuZCk7XG4gICAgfVxuICAgIHJldHVybiBmb3VuZDtcbiAgfTtcbiAgcHJvdG8uZ2V0Tm9kZUFwaUZvclBhY2thZ2UgPSBmdW5jdGlvbihwYWNrYWdlSW5zdGFuY2U6IFBhY2thZ2VJbnN0YW5jZSkge1xuICAgIHJldHVybiBnZXRBcGlGb3JQYWNrYWdlKHBhY2thZ2VJbnN0YW5jZSwgTm9kZUFwaSk7XG4gIH07XG4gIHByb3RvLmJyb3dzZXJJbmplY3RvciA9IHdlYkluamVjdG9yO1xuICBwYWNrYWdlSW5mby5hbGxNb2R1bGVzLmZvckVhY2gocGsgPT4ge1xuICAgIHNldHVwUmVxdWlyZUluamVjdHMocGssIE5vZGVBcGkpOyAvLyBBbGwgY29tcG9uZW50IHBhY2thZ2Ugc2hvdWxkIGJlIGFibGUgdG8gYWNjZXNzICdfX2FwaScsIGV2ZW4gdGhleSBhcmUgbm90IGluY2x1ZGVkXG4gIH0pO1xuICAvLyBjb25zb2xlLmxvZygnPj4+Pj4+Pj4+Pj4+Pj4+Pj4+JylcbiAgLy8gY29uZmlnLmNvbmZpZ3VyZVN0b3JlLnBpcGUoXG4gIC8vICAgZmlsdGVyKHNldHRpbmcgPT4gc2V0dGluZyAhPSBudWxsKSxcbiAgLy8gICB0YXAoc2V0dGluZyA9PiB7XG4gIC8vICAgICAvLyBjb25zb2xlLmxvZygnPj4+Pj4+Pj4+KysrKysrPj4+Pj4+Pj4+JylcbiAgLy8gICAgIG5vZGVJbmplY3Rvci5yZWFkSW5qZWN0RmlsZSgpO1xuICAvLyAgICAgd2ViSW5qZWN0b3IucmVhZEluamVjdEZpbGUoJ21vZHVsZS1yZXNvbHZlLmJyb3dzZXInKTtcbiAgLy8gICB9KVxuICAvLyApLnN1YnNjcmliZSgpO1xuICBub2RlSW5qZWN0b3IucmVhZEluamVjdEZpbGUoKTtcbiAgd2ViSW5qZWN0b3IucmVhZEluamVjdEZpbGUoJ21vZHVsZS1yZXNvbHZlLmJyb3dzZXInKTtcbiAgcmV0dXJuIFtwYWNrYWdlSW5mby5hbGxNb2R1bGVzLCBwcm90b107XG59XG5cbi8vIGZ1bmN0aW9uIGluaXRXZWJJbmplY3RvcihwYWNrYWdlczogUGFja2FnZUluc3RhbmNlW10sIGFwaVByb3RvdHlwZTogYW55KSB7XG4vLyAgIF8uZWFjaChwYWNrYWdlcywgcGFjayA9PiB7XG4vLyAgICAgd2ViSW5qZWN0b3IuYWRkUGFja2FnZShwYWNrLmxvbmdOYW1lLCBwYWNrLnJlYWxQYXRoKTtcbi8vICAgfSk7XG4vLyAgIHdlYkluamVjdG9yLmZyb21BbGxQYWNrYWdlcygpXG4vLyAgIC5yZXBsYWNlQ29kZSgnX19hcGknLCAnX19hcGknKVxuLy8gICAuc3Vic3RpdHV0ZSgvXihbXntdKilcXHtsb2NhbGVcXH0oLiopJC8sXG4vLyAgICAgKF9maWxlUGF0aDogc3RyaW5nLCBtYXRjaDogUmVnRXhwRXhlY0FycmF5KSA9PiBtYXRjaFsxXSArIGFwaVByb3RvdHlwZS5nZXRCdWlsZExvY2FsZSgpICsgbWF0Y2hbMl0pO1xuXG4vLyAgIHdlYkluamVjdG9yLnJlYWRJbmplY3RGaWxlKCdtb2R1bGUtcmVzb2x2ZS5icm93c2VyJyk7XG4vLyAgIGFwaVByb3RvdHlwZS5icm93c2VySW5qZWN0b3IgPSB3ZWJJbmplY3Rvcjtcbi8vIH1cblxuLyoqXG4gKiBAZGVwcmVjYXRlZFxuICogU3VwcG9ydCBgaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7YFxuICogQHBhcmFtIGFyZ3YgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcmVwYXJlTGF6eU5vZGVJbmplY3Rvcihhcmd2Pzoge1trZXk6IHN0cmluZ106IGFueX0pIHtcbiAgY29uc3QgTm9kZUFwaTogdHlwZW9mIF9Ob2RlQXBpID0gcmVxdWlyZSgnLi9wYWNrYWdlLW1nci9ub2RlLXBhY2thZ2UtYXBpJykuZGVmYXVsdDtcbiAgY29uc3QgcHJvdG8gPSBOb2RlQXBpLnByb3RvdHlwZTtcbiAgcHJvdG8uYXJndiA9IGFyZ3YgfHwge307XG4gIGxldCBwYWNrYWdlSW5mbzogUGFja2FnZUluZm87XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCAncGFja2FnZUluZm8nLCB7XG4gICAgZ2V0KCkge1xuICAgICAgaWYgKHBhY2thZ2VJbmZvID09IG51bGwpXG4gICAgICAgIHBhY2thZ2VJbmZvID0gd2Fsa1BhY2thZ2VzKCk7XG4gICAgICByZXR1cm4gcGFja2FnZUluZm87XG4gICAgfVxuICB9KTtcbiAgcHJvdG8uZmluZFBhY2thZ2VCeUZpbGUgPSBjcmVhdGVMYXp5UGFja2FnZUZpbGVGaW5kZXIoKTtcbiAgcHJvdG8uZ2V0Tm9kZUFwaUZvclBhY2thZ2UgPSBmdW5jdGlvbihwYWNrYWdlSW5zdGFuY2U6IE5vZGVQYWNrYWdlKSB7XG4gICAgcmV0dXJuIGdldEFwaUZvclBhY2thZ2UocGFja2FnZUluc3RhbmNlLCBOb2RlQXBpKTtcbiAgfTtcbiAgbm9kZUluamVjdG9yLmZyb21Sb290KClcbiAgLy8gLmFsaWFzKCdsb2c0anMnLCBQYXRoLnJlc29sdmUoY29uZmlnKCkucm9vdFBhdGgsICdub2RlX21vZHVsZXMvbG9nNGpzJykpXG4gIC52YWx1ZSgnX19pbmplY3RvcicsIG5vZGVJbmplY3RvcilcbiAgLmZhY3RvcnkoJ19fYXBpJywgKHNvdXJjZUZpbGVQYXRoOiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCBwYWNrYWdlSW5zdGFuY2UgPSBwcm90by5maW5kUGFja2FnZUJ5RmlsZShzb3VyY2VGaWxlUGF0aCk7XG4gICAgaWYgKHBhY2thZ2VJbnN0YW5jZSlcbiAgICAgIHJldHVybiBnZXRBcGlGb3JQYWNrYWdlKHBhY2thZ2VJbnN0YW5jZSwgTm9kZUFwaSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWFwUGFja2FnZXNCeVR5cGUodHlwZXM6IHN0cmluZ1tdLCBvbkVhY2hQYWNrYWdlOiAobm9kZVBhY2thZ2U6IE5vZGVQYWNrYWdlKSA9PiB2b2lkKSB7XG4gIGNvbnN0IHBhY2thZ2VzTWFwOiB7W3R5cGU6IHN0cmluZ106IE5vZGVQYWNrYWdlW119ID0ge307XG4gIHR5cGVzLmZvckVhY2godHlwZSA9PiB7XG4gICAgcGFja2FnZXNNYXBbdHlwZV0gPSBbXTtcbiAgfSk7XG5cbiAgZm9yIChjb25zdCBwa2cgb2YgcGFja2FnZXM0V29ya3NwYWNlKCkpIHtcbiAgICBjb25zdCBuYW1lID0gcGtnLm5hbWU7XG4gICAgY29uc3QgcGtJbnN0YW5jZSA9IG5ldyBOb2RlUGFja2FnZSh7XG4gICAgICBtb2R1bGVOYW1lOiBuYW1lLFxuICAgICAgc2hvcnROYW1lOiBwa2cuc2hvcnROYW1lLFxuICAgICAgbmFtZSxcbiAgICAgIGxvbmdOYW1lOiBuYW1lLFxuICAgICAgc2NvcGU6IHBrZy5zY29wZSxcbiAgICAgIHBhdGg6IHBrZy5wYXRoLFxuICAgICAganNvbjogcGtnLmpzb24sXG4gICAgICByZWFsUGF0aDogcGtnLnJlYWxQYXRoXG4gICAgfSk7XG4gICAgY29uc3QgZHJUeXBlcyA9IChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KF8uZ2V0KHBrZywgJ2pzb24uZHIudHlwZScpKTtcbiAgICBmb3IgKGNvbnN0IHR5cGUgb2YgdHlwZXMpIHtcbiAgICAgIGlmICghXy5pbmNsdWRlcyhkclR5cGVzLCB0eXBlKSlcbiAgICAgICAgY29udGludWU7XG4gICAgICBwYWNrYWdlc01hcFt0eXBlXS5wdXNoKHBrSW5zdGFuY2UpO1xuICAgIH1cbiAgICBpZiAob25FYWNoUGFja2FnZSkge1xuICAgICAgb25FYWNoUGFja2FnZShwa0luc3RhbmNlKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHBhY2thZ2VzTWFwO1xufVxuXG5mdW5jdGlvbiBzZXR1cFJlcXVpcmVJbmplY3RzKHBrSW5zdGFuY2U6IFBhY2thZ2VJbnN0YW5jZSwgTm9kZUFwaTogdHlwZW9mIF9Ob2RlQXBpICkge1xuICBmdW5jdGlvbiBhcGlGYWN0b3J5KCkge1xuICAgIHJldHVybiBnZXRBcGlGb3JQYWNrYWdlKHBrSW5zdGFuY2UsIE5vZGVBcGkpO1xuICB9XG4gIG5vZGVJbmplY3Rvci5hZGRQYWNrYWdlKHBrSW5zdGFuY2UubG9uZ05hbWUsIHBrSW5zdGFuY2UucmVhbFBhdGgsXG4gICAgcGtJbnN0YW5jZS5wYXRoID09PSBwa0luc3RhbmNlLnJlYWxQYXRoID8gdW5kZWZpbmVkIDogcGtJbnN0YW5jZS5wYXRoKTtcbiAgbm9kZUluamVjdG9yLmZyb21EaXIocGtJbnN0YW5jZS5yZWFsUGF0aClcbiAgLnZhbHVlKCdfX2luamVjdG9yJywgbm9kZUluamVjdG9yKVxuICAuZmFjdG9yeSgnX19hcGknLCBhcGlGYWN0b3J5KVxuICAuZmFjdG9yeSgnX19wbGluaycsIGFwaUZhY3RvcnkpO1xuXG4gIHdlYkluamVjdG9yLmZyb21EaXIocGtJbnN0YW5jZS5yZWFsUGF0aClcbiAgLnJlcGxhY2VDb2RlKCdfX2FwaScsICdfX2FwaScpO1xuICAvLyAuc3Vic3RpdHV0ZSgvXihbXntdKilcXHtsb2NhbGVcXH0oLiopJC8sXG4gIC8vICAgKF9maWxlUGF0aDogc3RyaW5nLCBtYXRjaDogUmVnRXhwRXhlY0FycmF5KSA9PiBtYXRjaFsxXSArIGFwaVByb3RvdHlwZS5nZXRCdWlsZExvY2FsZSgpICsgbWF0Y2hbMl0pO1xuICBjb25zdCBzeW1saW5rRGlyID0gZ2V0U3ltbGlua0ZvclBhY2thZ2UocGtJbnN0YW5jZS5uYW1lKTtcbiAgaWYgKHN5bWxpbmtEaXIpIHtcbiAgICBub2RlSW5qZWN0b3IuZnJvbURpcihzeW1saW5rRGlyKVxuICAgIC52YWx1ZSgnX19pbmplY3RvcicsIG5vZGVJbmplY3RvcilcbiAgICAuZmFjdG9yeSgnX19wbGluaycsIGFwaUZhY3RvcnkpO1xuXG4gICAgd2ViSW5qZWN0b3IuZnJvbURpcihzeW1saW5rRGlyKVxuICAgIC5yZXBsYWNlQ29kZSgnX19hcGknLCAnX19hcGknKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRBcGlGb3JQYWNrYWdlKHBrSW5zdGFuY2U6IE5vZGVQYWNrYWdlLCBOb2RlQXBpOiB0eXBlb2YgX05vZGVBcGkpIHtcbiAgaWYgKF8uaGFzKGFwaUNhY2hlLCBwa0luc3RhbmNlLmxvbmdOYW1lKSkge1xuICAgIHJldHVybiBhcGlDYWNoZVtwa0luc3RhbmNlLmxvbmdOYW1lXTtcbiAgfVxuXG4gIGNvbnN0IGFwaSA9IG5ldyBOb2RlQXBpKHBrSW5zdGFuY2UubG9uZ05hbWUsIHBrSW5zdGFuY2UpO1xuICBhcGlDYWNoZVtwa0luc3RhbmNlLmxvbmdOYW1lXSA9IGFwaTtcbiAgYXBpLmRlZmF1bHQgPSBhcGk7IC8vIEZvciBFUzYgaW1wb3J0IHN5bnRheFxuICByZXR1cm4gYXBpO1xufVxuIl19