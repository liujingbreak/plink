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
const misc_1 = require("./utils/misc");
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
    const symlinkDir = misc_1.getSymlinkForPackage(pkInstance.name);
    if (symlinkDir) {
        injector_factory_1.nodeInjector.fromDir(symlinkDir)
            .value('__injector', injector_factory_1.nodeInjector)
            .factory('__api', apiFactory);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wYWNrYWdlLXJ1bm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0NBQW9DO0FBQ3BDLDBDQUE0QjtBQUM1QiwwREFBNEI7QUFDNUIsaUZBQStFO0FBQy9FLHlEQUErRDtBQUcvRCx1RUFBMEQ7QUFDMUQsZ0ZBQWdEO0FBQ2hELGdEQUF3QjtBQUV4QixtREFBZ0Y7QUFDaEYsb0RBQTRCO0FBQzVCLHNEQUE4QjtBQUM5QiwrQ0FBa0c7QUFDbEcsMkVBQXdFO0FBQ3hFLGtEQUEwQjtBQUMxQix1Q0FBa0Q7QUFFbEQsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQU8vQyxTQUFnQixlQUFlLENBQUMsR0FBaUI7SUFDL0MsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLEtBQUssUUFBUSxJQUFLLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQWtCLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7QUFDbEksQ0FBQztBQUZELDBDQUVDO0FBRUQsU0FBZ0Isb0JBQW9CLENBQUMsSUFBUztJQUM1QyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLG1CQUFtQixDQUFDLENBQUM7QUFDMUMsQ0FBQztBQUZELG9EQUVDO0FBRUQsU0FBc0IsU0FBUzs7UUFDN0IsSUFBSSxLQUFLLEdBQThCLDBCQUFZLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDbkUsS0FBSyxHQUFHLHNCQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFD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QyxVQUF1QixFQUFFLE9BQXdCO0lBQ3pFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUFFO1FBQ3hDLE9BQU8sUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztLQUN0QztJQUVELE1BQU0sR0FBRyxHQUFHLElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDekQsNkJBQTZCO0lBQzdCLFVBQVUsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO0lBQ3JCLFFBQVEsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEdBQUcsR0FBRyxDQUFDO0lBQ3BDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLENBQUMsd0JBQXdCO0lBQzNDLE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG1heC1saW5lLWxlbmd0aCAqL1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IExSVSBmcm9tICdscnUtY2FjaGUnO1xuaW1wb3J0IHtQYWNrYWdlSW5mbywgd2Fsa1BhY2thZ2VzfSBmcm9tICcuL3BhY2thZ2UtbWdyL3BhY2thZ2UtaW5mby1nYXRoZXJpbmcnO1xuaW1wb3J0IHsgbm9kZUluamVjdG9yLCB3ZWJJbmplY3RvciB9IGZyb20gJy4vaW5qZWN0b3ItZmFjdG9yeSc7XG5pbXBvcnQgX05vZGVBcGkgZnJvbSAnLi9wYWNrYWdlLW1nci9ub2RlLXBhY2thZ2UtYXBpJztcbmltcG9ydCBQYWNrYWdlSW5zdGFuY2UgZnJvbSAnLi9wYWNrYWdlTm9kZUluc3RhbmNlJztcbmltcG9ydCB7IG9yZGVyUGFja2FnZXMgfSBmcm9tICcuL3BhY2thZ2UtcHJpb3JpdHktaGVscGVyJztcbmltcG9ydCBOb2RlUGFja2FnZSBmcm9tICcuL3BhY2thZ2VOb2RlSW5zdGFuY2UnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgRXZlbnRzIGZyb20gJ2V2ZW50cyc7XG5pbXBvcnQge2NyZWF0ZUxhenlQYWNrYWdlRmlsZUZpbmRlciwgcGFja2FnZXM0V29ya3NwYWNlfSBmcm9tICcuL3BhY2thZ2UtdXRpbHMnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG5pbXBvcnQge2lzQ3dkV29ya3NwYWNlLCBnZXRTdGF0ZSwgd29ya3NwYWNlS2V5LCBQYWNrYWdlSW5mbyBhcyBQYWNrYWdlU3RhdGV9IGZyb20gJy4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHtwYWNrYWdlczRXb3Jrc3BhY2VLZXl9IGZyb20gJy4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcic7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0IHtnZXRTeW1saW5rRm9yUGFja2FnZX0gZnJvbSAnLi91dGlscy9taXNjJztcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGFja2FnZS1ydW5uZXInKTtcblxuZXhwb3J0IGludGVyZmFjZSBTZXJ2ZXJSdW5uZXJFdmVudCB7XG4gIGZpbGU6IHN0cmluZztcbiAgZnVuY3Rpb25OYW1lOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1NlcnZlclBhY2thZ2UocGtnOiBQYWNrYWdlU3RhdGUpIHtcbiAgcmV0dXJuIHBrZy5qc29uLmRyICYmIHBrZy5qc29uLmRyLnR5cGUgJiYgKHBrZy5qc29uLmRyLnR5cGUgPT09ICdzZXJ2ZXInIHx8IChwa2cuanNvbi5kci50eXBlICBhcyBzdHJpbmdbXSkuaW5jbHVkZXMoJ3NlcnZlcicpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRQcmlvcml0eVByb3BlcnR5KGpzb246IGFueSkge1xuICByZXR1cm4gXy5nZXQoanNvbiwgJ2RyLnNlcnZlclByaW9yaXR5Jyk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5TZXJ2ZXIoKSB7XG4gIGxldCB3c0tleTogc3RyaW5nIHwgbnVsbCB8IHVuZGVmaW5lZCA9IHdvcmtzcGFjZUtleShwcm9jZXNzLmN3ZCgpKTtcbiAgd3NLZXkgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHdzS2V5KSA/IHdzS2V5IDogZ2V0U3RhdGUoKS5jdXJyV29ya3NwYWNlO1xuICBpZiAod3NLZXkgPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcignQ3VycmVudCBkaXJlY3RvcnkgaXMgbm90IGEgd29ya3NwYWNlIGRpcmVjdG9yeScpO1xuICB9XG4gIGNvbnN0IHBrZ3MgPSBBcnJheS5mcm9tKHBhY2thZ2VzNFdvcmtzcGFjZUtleSh3c0tleSwgdHJ1ZSkpXG4gIC5maWx0ZXIoaXNTZXJ2ZXJQYWNrYWdlKVxuICAubWFwKGl0ZW0gPT4gaXRlbS5uYW1lKTtcblxuICBjb25zdCByZXZlcnNlT3JkZXJQa2dFeHBvcnRzID0gYXdhaXQgcnVuUGFja2FnZXMoJyNhY3RpdmF0ZScsIHBrZ3MpO1xuXG4gIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCA1MDApKTtcbiAgcmV0dXJuIGFzeW5jICgpID0+IHtcbiAgICBsb2cuaW5mbygnc2h1dHRpbmcgZG93bicpO1xuICAgIGZvciAoY29uc3Qge25hbWUsIGV4cH0gb2YgcmV2ZXJzZU9yZGVyUGtnRXhwb3J0cykge1xuICAgICAgaWYgKF8uaXNGdW5jdGlvbihleHAuZGVhY3RpdmF0ZSkpIHtcbiAgICAgICAgbG9nLmluZm8oJ2RlYWN0aXZhdGUnLCBuYW1lKTtcbiAgICAgICAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKGV4cC5kZWFjdGl2YXRlKCkpO1xuICAgICAgfVxuICAgIH1cbiAgfTtcbn1cblxuY29uc3QgYXBpQ2FjaGU6IHtbbmFtZTogc3RyaW5nXTogYW55fSA9IHt9O1xuLy8gY29uc3QgcGFja2FnZVRyZWUgPSBuZXcgRGlyVHJlZTxQYWNrYWdlSW5zdGFuY2U+KCk7XG5cbi8qKlxuICogTGF6aWx5IGluaXQgaW5qZWN0b3IgZm9yIHBhY2thZ2VzIGFuZCBydW4gc3BlY2lmaWMgcGFja2FnZSBvbmx5LFxuICogbm8gZnVsbHkgc2Nhbm5pbmcgb3Igb3JkZXJpbmcgb24gYWxsIHBhY2thZ2VzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5TaW5nbGVQYWNrYWdlKHt0YXJnZXQsIGFyZ3N9OiB7dGFyZ2V0OiBzdHJpbmcsIGFyZ3M6IHN0cmluZ1tdfSkge1xuICBpZiAoIWlzQ3dkV29ya3NwYWNlKCkpIHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKCdDdXJyZW50IGRpcmVjdG9yeSBpcyBub3QgYSB3b3Jrc3BhY2UgZGlyZWN0b3J5JykpO1xuICB9XG4gIGNvbnN0IHBhc3NpbkFyZ3YgPSB7fTtcbiAgLy8gY29uc29sZS5sb2coYXJncyk7XG4gIC8vIHRocm93IG5ldyBFcnJvcignc3RvcCcpO1xuICBmb3IgKGxldCBpID0gMCwgbCA9IGFyZ3MubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgY29uc3Qga2V5ID0gYXJnc1tpXTtcbiAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJy0nKSkge1xuICAgICAgaWYgKGkgPT09IGFyZ3MubGVuZ3RoIC0gMSB8fCBhcmdzW2kgKyAxXS5zdGFydHNXaXRoKCctJykpIHtcbiAgICAgICAgcGFzc2luQXJndltfLnRyaW1TdGFydChrZXksICctJyldID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhc3NpbkFyZ3Zba2V5XSA9IGFyZ3NbaSArIDFdO1xuICAgICAgICBpKys7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHByZXBhcmVMYXp5Tm9kZUluamVjdG9yKHBhc3NpbkFyZ3YpO1xuICBjb25zdCBbZmlsZSwgZnVuY10gPSB0YXJnZXQuc3BsaXQoJyMnKTtcblxuICBjb25zdCBndWVzc2luZ0ZpbGU6IHN0cmluZ1tdID0gW1xuICAgIGZpbGUsXG4gICAgUGF0aC5yZXNvbHZlKGZpbGUpLFxuICAgIC4uLihjb25maWcoKS5wYWNrYWdlU2NvcGVzIGFzIHN0cmluZ1tdKS5tYXAoc2NvcGUgPT4gYEAke3Njb3BlfS8ke2ZpbGV9YClcbiAgXTtcbiAgY29uc3QgZm91bmRNb2R1bGUgPSBndWVzc2luZ0ZpbGUuZmluZCh0YXJnZXQgPT4ge1xuICAgIHRyeSB7XG4gICAgICByZXF1aXJlLnJlc29sdmUodGFyZ2V0KTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9KTtcblxuICBpZiAoIWZvdW5kTW9kdWxlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCB0YXJnZXQgbW9kdWxlIGZyb20gcGF0aHMgbGlrZTpcXG4ke2d1ZXNzaW5nRmlsZS5qb2luKCdcXG4nKX1gKTtcbiAgfVxuICBjb25zdCBfZXhwb3J0cyA9IHJlcXVpcmUoZm91bmRNb2R1bGUpO1xuICBpZiAoIV8uaGFzKF9leHBvcnRzLCBmdW5jKSkge1xuICAgIGxvZy5lcnJvcihgVGhlcmUgaXMgbm8gZXhwb3J0IGZ1bmN0aW9uOiAke2Z1bmN9LCBleGlzdGluZyBleHBvcnQgbWVtYmVycyBhcmU6XFxuYCArXG4gICAgYCR7T2JqZWN0LmtleXMoX2V4cG9ydHMpLmZpbHRlcihuYW1lID0+IHR5cGVvZiAoX2V4cG9ydHNbbmFtZV0pID09PSAnZnVuY3Rpb24nKS5tYXAobmFtZSA9PiBuYW1lICsgJygpJykuam9pbignXFxuJyl9YCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGF3YWl0IFByb21pc2UucmVzb2x2ZShfZXhwb3J0c1tmdW5jXS5hcHBseShnbG9iYWwsIGFyZ3MgfHwgW10pKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJ1blBhY2thZ2VzKHRhcmdldDogc3RyaW5nLCBpbmNsdWRlUGFja2FnZXM6IEl0ZXJhYmxlPHN0cmluZz4pOiBQcm9taXNlPHtuYW1lOiBzdHJpbmc7IGV4cDogYW55fVtdPiB7XG4gIGNvbnN0IGluY2x1ZGVOYW1lU2V0ID0gbmV3IFNldDxzdHJpbmc+KGluY2x1ZGVQYWNrYWdlcyk7XG4gIGNvbnN0IHBrZ0V4cG9ydHNJblJldmVyT3JkZXI6IHtuYW1lOiBzdHJpbmc7IGV4cDogYW55fVtdID0gW107XG5cbiAgY29uc3QgW2ZpbGVUb1J1biwgZnVuY1RvUnVuXSA9ICh0YXJnZXQgYXMgc3RyaW5nKS5zcGxpdCgnIycpO1xuICBjb25zdCBbcGFja2FnZXMsIHByb3RvXSA9IGluaXRJbmplY3RvckZvck5vZGVQYWNrYWdlcyh3YWxrUGFja2FnZXMoKSk7XG4gIGNvbnN0IGNvbXBvbmVudHMgPSBwYWNrYWdlcy5maWx0ZXIocGsgPT4ge1xuICAgIC8vIHNldHVwTm9kZUluamVjdG9yRm9yKHBrLCBOb2RlQXBpKTsgLy8gQWxsIGNvbXBvbmVudCBwYWNrYWdlIHNob3VsZCBiZSBhYmxlIHRvIGFjY2VzcyAnX19hcGknLCBldmVuIHRoZXkgYXJlIG5vdCBpbmNsdWRlZFxuICAgIGlmICgoaW5jbHVkZU5hbWVTZXQuc2l6ZSA9PT0gMCB8fCBpbmNsdWRlTmFtZVNldC5oYXMocGsubG9uZ05hbWUpIHx8IGluY2x1ZGVOYW1lU2V0Lmhhcyhway5zaG9ydE5hbWUpKSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKGZpbGVUb1J1bilcbiAgICAgICAgICByZXF1aXJlLnJlc29sdmUocGsubG9uZ05hbWUgKyAnLycgKyBmaWxlVG9SdW4pO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgcmVxdWlyZS5yZXNvbHZlKHBrLmxvbmdOYW1lKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xuXG4gIGNvbnN0IHBhY2thZ2VOYW1lc0luT3JkZXI6IHN0cmluZ1tdID0gW107XG5cbiAgYXdhaXQgb3JkZXJQYWNrYWdlcyhjb21wb25lbnRzLm1hcChpdGVtID0+ICh7bmFtZTogaXRlbS5sb25nTmFtZSwgcHJpb3JpdHk6IF8uZ2V0KGl0ZW0uanNvbiwgJ2RyLnNlcnZlclByaW9yaXR5Jyl9KSksXG4gIHBrSW5zdGFuY2UgID0+IHtcbiAgICBwYWNrYWdlTmFtZXNJbk9yZGVyLnB1c2gocGtJbnN0YW5jZS5uYW1lKTtcbiAgICBjb25zdCBtb2QgPSBwa0luc3RhbmNlLm5hbWUgKyAoIGZpbGVUb1J1biA/ICcvJyArIGZpbGVUb1J1biA6ICcnKTtcbiAgICBsb2cuZGVidWcoJ3JlcXVpcmUoJXMpJywgSlNPTi5zdHJpbmdpZnkobW9kKSk7XG4gICAgY29uc3QgZmlsZUV4cG9ydHMgPSByZXF1aXJlKG1vZCk7XG4gICAgcGtnRXhwb3J0c0luUmV2ZXJPcmRlci51bnNoaWZ0KHtuYW1lOiBwa0luc3RhbmNlLm5hbWUsIGV4cDogZmlsZUV4cG9ydHN9KTtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGZpbGVFeHBvcnRzW2Z1bmNUb1J1bl0pKSB7XG4gICAgICBsb2cuaW5mbyhmdW5jVG9SdW4gKyBgICR7Y2hhbGsuY3lhbihtb2QpfWApO1xuICAgICAgcmV0dXJuIGZpbGVFeHBvcnRzW2Z1bmNUb1J1bl0oKTtcbiAgICB9XG4gIH0pO1xuICAocHJvdG8uZXZlbnRCdXMgYXMgRXZlbnRzLkV2ZW50RW1pdHRlcikuZW1pdCgnZG9uZScsIHtmaWxlOiBmaWxlVG9SdW4sIGZ1bmN0aW9uTmFtZTogZnVuY1RvUnVufSBhcyBTZXJ2ZXJSdW5uZXJFdmVudCk7XG4gIGNvbnN0IE5vZGVBcGk6IHR5cGVvZiBfTm9kZUFwaSA9IHJlcXVpcmUoJy4vcGFja2FnZS1tZ3Ivbm9kZS1wYWNrYWdlLWFwaScpO1xuICBOb2RlQXBpLnByb3RvdHlwZS5ldmVudEJ1cy5lbWl0KCdwYWNrYWdlc0FjdGl2YXRlZCcsIGluY2x1ZGVOYW1lU2V0KTtcbiAgcmV0dXJuIHBrZ0V4cG9ydHNJblJldmVyT3JkZXI7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMocGFja2FnZUluZm86IFBhY2thZ2VJbmZvKTpcbiAgW1BhY2thZ2VJbnN0YW5jZVtdLCBfTm9kZUFwaV0ge1xuICBjb25zdCBOb2RlQXBpOiB0eXBlb2YgX05vZGVBcGkgPSByZXF1aXJlKCcuL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGknKTtcbiAgY29uc3QgcHJvdG8gPSBOb2RlQXBpLnByb3RvdHlwZTtcbiAgcHJvdG8uYXJndiA9IHt9O1xuICBwcm90by5wYWNrYWdlSW5mbyA9IHBhY2thZ2VJbmZvO1xuICBjb25zdCBjYWNoZSA9IG5ldyBMUlU8c3RyaW5nLCBQYWNrYWdlSW5zdGFuY2U+KHttYXg6IDIwLCBtYXhBZ2U6IDIwMDAwfSk7XG4gIHByb3RvLmZpbmRQYWNrYWdlQnlGaWxlID0gZnVuY3Rpb24oZmlsZTogc3RyaW5nKTogUGFja2FnZUluc3RhbmNlIHwgdW5kZWZpbmVkIHtcbiAgICB2YXIgZm91bmQgPSBjYWNoZS5nZXQoZmlsZSk7XG4gICAgaWYgKCFmb3VuZCkge1xuICAgICAgZm91bmQgPSBwYWNrYWdlSW5mby5kaXJUcmVlLmdldEFsbERhdGEoZmlsZSkucG9wKCk7XG4gICAgICBpZiAoZm91bmQpXG4gICAgICAgIGNhY2hlLnNldChmaWxlLCBmb3VuZCk7XG4gICAgfVxuICAgIHJldHVybiBmb3VuZDtcbiAgfTtcbiAgcHJvdG8uZ2V0Tm9kZUFwaUZvclBhY2thZ2UgPSBmdW5jdGlvbihwYWNrYWdlSW5zdGFuY2U6IFBhY2thZ2VJbnN0YW5jZSkge1xuICAgIHJldHVybiBnZXRBcGlGb3JQYWNrYWdlKHBhY2thZ2VJbnN0YW5jZSwgTm9kZUFwaSk7XG4gIH07XG4gIHBhY2thZ2VJbmZvLmFsbE1vZHVsZXMuZm9yRWFjaChwayA9PiB7XG4gICAgc2V0dXBOb2RlSW5qZWN0b3JGb3IocGssIE5vZGVBcGkpOyAvLyBBbGwgY29tcG9uZW50IHBhY2thZ2Ugc2hvdWxkIGJlIGFibGUgdG8gYWNjZXNzICdfX2FwaScsIGV2ZW4gdGhleSBhcmUgbm90IGluY2x1ZGVkXG4gIH0pO1xuICByZXR1cm4gW3BhY2thZ2VJbmZvLmFsbE1vZHVsZXMsIHByb3RvXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGluaXRXZWJJbmplY3RvcihwYWNrYWdlczogUGFja2FnZUluc3RhbmNlW10sIGFwaVByb3RvdHlwZTogYW55KSB7XG4gIF8uZWFjaChwYWNrYWdlcywgcGFjayA9PiB7XG4gICAgd2ViSW5qZWN0b3IuYWRkUGFja2FnZShwYWNrLmxvbmdOYW1lLCBwYWNrLnBhdGgpO1xuICB9KTtcbiAgd2ViSW5qZWN0b3IuZnJvbUFsbFBhY2thZ2VzKClcbiAgLnJlcGxhY2VDb2RlKCdfX2FwaScsICdfX2FwaScpXG4gIC5zdWJzdGl0dXRlKC9eKFtee10qKVxce2xvY2FsZVxcfSguKikkLyxcbiAgICAoX2ZpbGVQYXRoOiBzdHJpbmcsIG1hdGNoOiBSZWdFeHBFeGVjQXJyYXkpID0+IG1hdGNoWzFdICsgYXBpUHJvdG90eXBlLmdldEJ1aWxkTG9jYWxlKCkgKyBtYXRjaFsyXSk7XG5cbiAgd2ViSW5qZWN0b3IucmVhZEluamVjdEZpbGUoJ21vZHVsZS1yZXNvbHZlLmJyb3dzZXInKTtcbiAgYXBpUHJvdG90eXBlLmJyb3dzZXJJbmplY3RvciA9IHdlYkluamVjdG9yO1xufVxuXG4vKipcbiAqIFN1cHBvcnQgYGltcG9ydCBhcGkgZnJvbSAnX19hcGknO2BcbiAqIEBwYXJhbSBhcmd2IFxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJlcGFyZUxhenlOb2RlSW5qZWN0b3IoYXJndj86IHtba2V5OiBzdHJpbmddOiBhbnl9KSB7XG4gIGNvbnN0IE5vZGVBcGk6IHR5cGVvZiBfTm9kZUFwaSA9IHJlcXVpcmUoJy4vcGFja2FnZS1tZ3Ivbm9kZS1wYWNrYWdlLWFwaScpO1xuICBjb25zdCBwcm90byA9IE5vZGVBcGkucHJvdG90eXBlO1xuICBwcm90by5hcmd2ID0gYXJndiB8fCB7fTtcbiAgbGV0IHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbztcblxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sICdwYWNrYWdlSW5mbycsIHtcbiAgICBnZXQoKSB7XG4gICAgICBpZiAocGFja2FnZUluZm8gPT0gbnVsbClcbiAgICAgICAgcGFja2FnZUluZm8gPSB3YWxrUGFja2FnZXMoKTtcbiAgICAgIHJldHVybiBwYWNrYWdlSW5mbztcbiAgICB9XG4gIH0pO1xuICBwcm90by5maW5kUGFja2FnZUJ5RmlsZSA9IGNyZWF0ZUxhenlQYWNrYWdlRmlsZUZpbmRlcigpO1xuICBwcm90by5nZXROb2RlQXBpRm9yUGFja2FnZSA9IGZ1bmN0aW9uKHBhY2thZ2VJbnN0YW5jZTogTm9kZVBhY2thZ2UpIHtcbiAgICByZXR1cm4gZ2V0QXBpRm9yUGFja2FnZShwYWNrYWdlSW5zdGFuY2UsIE5vZGVBcGkpO1xuICB9O1xuICBub2RlSW5qZWN0b3IuZnJvbVJvb3QoKVxuICAvLyAuYWxpYXMoJ2xvZzRqcycsIFBhdGgucmVzb2x2ZShjb25maWcoKS5yb290UGF0aCwgJ25vZGVfbW9kdWxlcy9sb2c0anMnKSlcbiAgLnZhbHVlKCdfX2luamVjdG9yJywgbm9kZUluamVjdG9yKVxuICAuZmFjdG9yeSgnX19hcGknLCAoc291cmNlRmlsZVBhdGg6IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IHBhY2thZ2VJbnN0YW5jZSA9IHByb3RvLmZpbmRQYWNrYWdlQnlGaWxlKHNvdXJjZUZpbGVQYXRoKTtcbiAgICBpZiAocGFja2FnZUluc3RhbmNlKVxuICAgICAgcmV0dXJuIGdldEFwaUZvclBhY2thZ2UocGFja2FnZUluc3RhbmNlLCBOb2RlQXBpKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYXBQYWNrYWdlc0J5VHlwZSh0eXBlczogc3RyaW5nW10sIG9uRWFjaFBhY2thZ2U6IChub2RlUGFja2FnZTogTm9kZVBhY2thZ2UpID0+IHZvaWQpIHtcbiAgY29uc3QgcGFja2FnZXNNYXA6IHtbdHlwZTogc3RyaW5nXTogTm9kZVBhY2thZ2VbXX0gPSB7fTtcbiAgdHlwZXMuZm9yRWFjaCh0eXBlID0+IHtcbiAgICBwYWNrYWdlc01hcFt0eXBlXSA9IFtdO1xuICB9KTtcblxuICBmb3IgKGNvbnN0IHBrZyBvZiBwYWNrYWdlczRXb3Jrc3BhY2UoKSkge1xuICAgIGNvbnN0IG5hbWUgPSBwa2cubmFtZTtcbiAgICBjb25zdCBwa0luc3RhbmNlID0gbmV3IE5vZGVQYWNrYWdlKHtcbiAgICAgIG1vZHVsZU5hbWU6IG5hbWUsXG4gICAgICBzaG9ydE5hbWU6IHBrZy5zaG9ydE5hbWUsXG4gICAgICBuYW1lLFxuICAgICAgbG9uZ05hbWU6IG5hbWUsXG4gICAgICBzY29wZTogcGtnLnNjb3BlLFxuICAgICAgcGF0aDogcGtnLnBhdGgsXG4gICAgICBqc29uOiBwa2cuanNvbixcbiAgICAgIHJlYWxQYXRoOiBwa2cucmVhbFBhdGhcbiAgICB9KTtcbiAgICBjb25zdCBkclR5cGVzID0gKFtdIGFzIHN0cmluZ1tdKS5jb25jYXQoXy5nZXQocGtnLCAnanNvbi5kci50eXBlJykpO1xuICAgIGZvciAoY29uc3QgdHlwZSBvZiB0eXBlcykge1xuICAgICAgaWYgKCFfLmluY2x1ZGVzKGRyVHlwZXMsIHR5cGUpKVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIHBhY2thZ2VzTWFwW3R5cGVdLnB1c2gocGtJbnN0YW5jZSk7XG4gICAgfVxuICAgIGlmIChvbkVhY2hQYWNrYWdlKSB7XG4gICAgICBvbkVhY2hQYWNrYWdlKHBrSW5zdGFuY2UpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcGFja2FnZXNNYXA7XG59XG5cbmZ1bmN0aW9uIHNldHVwTm9kZUluamVjdG9yRm9yKHBrSW5zdGFuY2U6IFBhY2thZ2VJbnN0YW5jZSwgTm9kZUFwaTogdHlwZW9mIF9Ob2RlQXBpICkge1xuICBmdW5jdGlvbiBhcGlGYWN0b3J5KCkge1xuICAgIHJldHVybiBnZXRBcGlGb3JQYWNrYWdlKHBrSW5zdGFuY2UsIE5vZGVBcGkpO1xuICB9XG4gIG5vZGVJbmplY3Rvci5mcm9tRGlyKHBrSW5zdGFuY2UucmVhbFBhdGgpXG4gIC52YWx1ZSgnX19pbmplY3RvcicsIG5vZGVJbmplY3RvcilcbiAgLmZhY3RvcnkoJ19fYXBpJywgYXBpRmFjdG9yeSk7XG4gIGNvbnN0IHN5bWxpbmtEaXIgPSBnZXRTeW1saW5rRm9yUGFja2FnZShwa0luc3RhbmNlLm5hbWUpO1xuICBpZiAoc3ltbGlua0Rpcikge1xuICAgIG5vZGVJbmplY3Rvci5mcm9tRGlyKHN5bWxpbmtEaXIpXG4gICAgLnZhbHVlKCdfX2luamVjdG9yJywgbm9kZUluamVjdG9yKVxuICAgIC5mYWN0b3J5KCdfX2FwaScsIGFwaUZhY3RvcnkpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldEFwaUZvclBhY2thZ2UocGtJbnN0YW5jZTogTm9kZVBhY2thZ2UsIE5vZGVBcGk6IHR5cGVvZiBfTm9kZUFwaSkge1xuICBpZiAoXy5oYXMoYXBpQ2FjaGUsIHBrSW5zdGFuY2UubG9uZ05hbWUpKSB7XG4gICAgcmV0dXJuIGFwaUNhY2hlW3BrSW5zdGFuY2UubG9uZ05hbWVdO1xuICB9XG5cbiAgY29uc3QgYXBpID0gbmV3IE5vZGVBcGkocGtJbnN0YW5jZS5sb25nTmFtZSwgcGtJbnN0YW5jZSk7XG4gIC8vIGFwaS5jb25zdHJ1Y3RvciA9IE5vZGVBcGk7XG4gIHBrSW5zdGFuY2UuYXBpID0gYXBpO1xuICBhcGlDYWNoZVtwa0luc3RhbmNlLmxvbmdOYW1lXSA9IGFwaTtcbiAgYXBpLmRlZmF1bHQgPSBhcGk7IC8vIEZvciBFUzYgaW1wb3J0IHN5bnRheFxuICByZXR1cm4gYXBpO1xufVxuIl19