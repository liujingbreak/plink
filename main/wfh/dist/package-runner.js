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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
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
exports.prepareLazyNodeInjector = exports.initWebInjector = exports.initInjectorForNodePackages = exports.runPackages = exports.runSinglePackage = exports.ServerRunner = void 0;
/* tslint:disable max-line-length */
const _ = __importStar(require("lodash"));
const lru_cache_1 = __importDefault(require("lru-cache"));
const ts_1 = require("./build-util/ts");
// const NodeApi = require('../lib/nodeApi');
// const {nodeInjector} = require('../lib/injectorFactory');
const injector_factory_1 = require("./injector-factory");
// import Package from './packageNodeInstance';
const package_priority_helper_1 = require("./package-priority-helper");
const path_1 = __importDefault(require("path"));
const package_utils_1 = require("./package-utils");
const config_1 = __importDefault(require("./config"));
const packageUtils = require('../lib/packageMgr/packageUtils');
const log = require('log4js').getLogger('package-runner');
class ServerRunner {
    shutdownServer() {
        return __awaiter(this, void 0, void 0, function* () {
            log.info('shutting down');
            yield this._deactivatePackages(this.deactivatePackages);
        });
    }
    _deactivatePackages(comps) {
        return __awaiter(this, void 0, void 0, function* () {
            for (const comp of comps) {
                const exp = require(comp.longName);
                if (_.isFunction(exp.deactivate)) {
                    log.info('deactivate', comp.longName);
                    yield Promise.resolve(exp.deactivate());
                }
            }
        });
    }
}
exports.ServerRunner = ServerRunner;
const apiCache = {};
// const packageTree = new DirTree<PackageBrowserInstance>();
/**
 * Lazily init injector for packages and run specific package only,
 * no fully scanning or ordering on all packages
 */
function runSinglePackage(argv) {
    return __awaiter(this, void 0, void 0, function* () {
        prepareLazyNodeInjector(argv);
        const [file, func] = argv.target.split('#');
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
        yield Promise.resolve(_exports[func].apply(global, argv._.slice(1) || []));
    });
}
exports.runSinglePackage = runSinglePackage;
function runPackages(argv) {
    // const NodeApi = require('../lib/nodeApi');
    const includeNameSet = new Set();
    argv.package.forEach(name => includeNameSet.add(name));
    const [fileToRun, funcToRun] = argv.target.split('#');
    const [packages, proto] = initInjectorForNodePackages(argv, ts_1.walkPackages(config_1.default, packageUtils));
    const components = packages.filter(pk => {
        // setupNodeInjectorFor(pk, NodeApi); // All component package should be able to access '__api', even they are not included
        if ((includeNameSet.size === 0 || includeNameSet.has(pk.longName) || includeNameSet.has(pk.shortName)) &&
            pk.dr != null) {
            try {
                require.resolve(pk.longName + '/' + fileToRun);
                return true;
            }
            catch (err) {
                return false;
            }
        }
        return false;
    });
    return package_priority_helper_1.orderPackages(components, (pkInstance) => {
        const mod = pkInstance.longName + '/' + fileToRun;
        log.info('require(%s)', JSON.stringify(mod));
        const fileExports = require(mod);
        if (_.isFunction(fileExports[funcToRun])) {
            log.info('Run %s %s()', mod, funcToRun);
            return fileExports[funcToRun]();
        }
    })
        .then(() => {
        proto.eventBus.emit('done', { file: fileToRun, functionName: funcToRun });
    });
}
exports.runPackages = runPackages;
function initInjectorForNodePackages(argv, packageInfo) {
    const NodeApi = require('./package-mgr/node-package-api');
    const proto = NodeApi.prototype;
    proto.argv = argv;
    // const packageInfo: PackageInfo = walkPackages(config, packageUtils);
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
    const drPackages = packageInfo.allModules.filter(pk => {
        if (pk.dr) {
            setupNodeInjectorFor(pk, NodeApi); // All component package should be able to access '__api', even they are not included
            return true;
        }
        return false;
    });
    return [drPackages, proto];
}
exports.initInjectorForNodePackages = initInjectorForNodePackages;
function initWebInjector(packages, apiPrototype) {
    _.each(packages, pack => {
        if (pack.dr) {
            // no vendor package's path information
            injector_factory_1.webInjector.addPackage(pack.longName, pack.packagePath);
        }
    });
    injector_factory_1.webInjector.fromAllPackages()
        .replaceCode('__api', '__api')
        .substitute(/^([^{]*)\{locale\}(.*)$/, (_filePath, match) => match[1] + apiPrototype.getBuildLocale() + match[2]);
    const done = injector_factory_1.webInjector.readInjectFile('module-resolve.browser');
    apiPrototype.browserInjector = injector_factory_1.webInjector;
    return done;
}
exports.initWebInjector = initWebInjector;
function prepareLazyNodeInjector(argv) {
    const NodeApi = require('./package-mgr/node-package-api');
    const proto = NodeApi.prototype;
    proto.argv = argv;
    let packageInfo;
    Object.defineProperty(proto, 'packageInfo', {
        get() {
            if (packageInfo == null)
                packageInfo = ts_1.walkPackages(config_1.default, packageUtils);
            return packageInfo;
        }
    });
    proto.findPackageByFile = package_utils_1.createLazyPackageFileFinder();
    proto.getNodeApiForPackage = function (packageInstance) {
        return getApiForPackage(packageInstance, NodeApi);
    };
    injector_factory_1.nodeInjector.fromRoot()
        .value('__injector', injector_factory_1.nodeInjector)
        .factory('__api', (sourceFilePath) => {
        const packageInstance = proto.findPackageByFile(sourceFilePath);
        return getApiForPackage(packageInstance, NodeApi);
    });
}
exports.prepareLazyNodeInjector = prepareLazyNodeInjector;
function setupNodeInjectorFor(pkInstance, NodeApi) {
    function apiFactory() {
        return getApiForPackage(pkInstance, NodeApi);
    }
    injector_factory_1.nodeInjector.fromDir(pkInstance.realPackagePath)
        .value('__injector', injector_factory_1.nodeInjector)
        .factory('__api', apiFactory);
    injector_factory_1.nodeInjector.fromDir(pkInstance.packagePath)
        .value('__injector', injector_factory_1.nodeInjector)
        .factory('__api', apiFactory);
    // nodeInjector.default = nodeInjector; // For ES6 import syntax
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wYWNrYWdlLXJ1bm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0NBQW9DO0FBQ3BDLDBDQUE0QjtBQUM1QiwwREFBNEI7QUFDNUIsd0NBQXVHO0FBQ3ZHLDZDQUE2QztBQUM3Qyw0REFBNEQ7QUFDNUQseURBQStEO0FBRS9ELCtDQUErQztBQUMvQyx1RUFBMkU7QUFHM0UsZ0RBQXdCO0FBQ3hCLG1EQUE0RDtBQUU1RCxzREFBOEI7QUFDOUIsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7QUFFL0QsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBTTFELE1BQWEsWUFBWTtJQUtqQixjQUFjOztZQUNsQixHQUFHLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQzFCLE1BQU0sSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQzFELENBQUM7S0FBQTtJQUVlLG1CQUFtQixDQUFDLEtBQW9COztZQUN0RCxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRTtnQkFDeEIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDbkMsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRTtvQkFDaEMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUN0QyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7aUJBQ3pDO2FBQ0Y7UUFDSCxDQUFDO0tBQUE7Q0FD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Z0IsQ0FBQyxVQUFlLEVBQUUsT0FBd0I7SUFDakUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsUUFBUSxDQUFDLEVBQUU7UUFDeEMsT0FBTyxRQUFRLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0tBQ3RDO0lBRUQsTUFBTSxHQUFHLEdBQUcsSUFBSSxPQUFPLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsQ0FBQztJQUN6RCw2QkFBNkI7SUFDN0IsVUFBVSxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7SUFDckIsUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsR0FBRyxHQUFHLENBQUM7SUFDcEMsR0FBRyxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUMsQ0FBQyx3QkFBd0I7SUFDM0MsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbWF4LWxpbmUtbGVuZ3RoICovXG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgTFJVIGZyb20gJ2xydS1jYWNoZSc7XG5pbXBvcnQgeyBQYWNrYWdlSW5mbywgcGFja2FnZUluc3RhbmNlIGFzIFBhY2thZ2VCcm93c2VySW5zdGFuY2UsIHdhbGtQYWNrYWdlcyB9IGZyb20gJy4vYnVpbGQtdXRpbC90cyc7XG4vLyBjb25zdCBOb2RlQXBpID0gcmVxdWlyZSgnLi4vbGliL25vZGVBcGknKTtcbi8vIGNvbnN0IHtub2RlSW5qZWN0b3J9ID0gcmVxdWlyZSgnLi4vbGliL2luamVjdG9yRmFjdG9yeScpO1xuaW1wb3J0IHsgbm9kZUluamVjdG9yLCB3ZWJJbmplY3RvciB9IGZyb20gJy4vaW5qZWN0b3ItZmFjdG9yeSc7XG5pbXBvcnQgX05vZGVBcGkgZnJvbSAnLi9wYWNrYWdlLW1nci9ub2RlLXBhY2thZ2UtYXBpJztcbi8vIGltcG9ydCBQYWNrYWdlIGZyb20gJy4vcGFja2FnZU5vZGVJbnN0YW5jZSc7XG5pbXBvcnQgeyBvcmRlclBhY2thZ2VzLCBQYWNrYWdlSW5zdGFuY2UgfSBmcm9tICcuL3BhY2thZ2UtcHJpb3JpdHktaGVscGVyJztcbmltcG9ydCBOb2RlUGFja2FnZSBmcm9tICcuL3BhY2thZ2VOb2RlSW5zdGFuY2UnO1xuaW1wb3J0IEV2ZW50cyA9IHJlcXVpcmUoJ2V2ZW50cycpO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge2NyZWF0ZUxhenlQYWNrYWdlRmlsZUZpbmRlcn0gZnJvbSAnLi9wYWNrYWdlLXV0aWxzJztcblxuaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG5jb25zdCBwYWNrYWdlVXRpbHMgPSByZXF1aXJlKCcuLi9saWIvcGFja2FnZU1nci9wYWNrYWdlVXRpbHMnKTtcblxuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdwYWNrYWdlLXJ1bm5lcicpO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNlcnZlclJ1bm5lckV2ZW50IHtcbiAgZmlsZTogc3RyaW5nO1xuICBmdW5jdGlvbk5hbWU6IHN0cmluZztcbn1cbmV4cG9ydCBjbGFzcyBTZXJ2ZXJSdW5uZXIge1xuICAvLyBwYWNrYWdlQ2FjaGU6IHtbc2hvcnROYW1lOiBzdHJpbmddOiBOb2RlUGFja2FnZX0gPSB7fTtcbiAgLy8gY29yZVBhY2thZ2VzOiB7W3Nob3J0TmFtZTogc3RyaW5nXTogTm9kZVBhY2thZ2V9ID0ge307XG4gIGRlYWN0aXZhdGVQYWNrYWdlczogTm9kZVBhY2thZ2VbXTtcblxuICBhc3luYyBzaHV0ZG93blNlcnZlcigpIHtcbiAgICBsb2cuaW5mbygnc2h1dHRpbmcgZG93bicpO1xuICAgIGF3YWl0IHRoaXMuX2RlYWN0aXZhdGVQYWNrYWdlcyh0aGlzLmRlYWN0aXZhdGVQYWNrYWdlcyk7XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgX2RlYWN0aXZhdGVQYWNrYWdlcyhjb21wczogTm9kZVBhY2thZ2VbXSkge1xuICAgIGZvciAoY29uc3QgY29tcCBvZiBjb21wcykge1xuICAgICAgY29uc3QgZXhwID0gcmVxdWlyZShjb21wLmxvbmdOYW1lKTtcbiAgICAgIGlmIChfLmlzRnVuY3Rpb24oZXhwLmRlYWN0aXZhdGUpKSB7XG4gICAgICAgIGxvZy5pbmZvKCdkZWFjdGl2YXRlJywgY29tcC5sb25nTmFtZSk7XG4gICAgICAgIGF3YWl0IFByb21pc2UucmVzb2x2ZShleHAuZGVhY3RpdmF0ZSgpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuY29uc3QgYXBpQ2FjaGU6IHtbbmFtZTogc3RyaW5nXTogYW55fSA9IHt9O1xuLy8gY29uc3QgcGFja2FnZVRyZWUgPSBuZXcgRGlyVHJlZTxQYWNrYWdlQnJvd3Nlckluc3RhbmNlPigpO1xuXG4vKipcbiAqIExhemlseSBpbml0IGluamVjdG9yIGZvciBwYWNrYWdlcyBhbmQgcnVuIHNwZWNpZmljIHBhY2thZ2Ugb25seSxcbiAqIG5vIGZ1bGx5IHNjYW5uaW5nIG9yIG9yZGVyaW5nIG9uIGFsbCBwYWNrYWdlc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuU2luZ2xlUGFja2FnZShhcmd2OiB7dGFyZ2V0OiBzdHJpbmcsIF86IHN0cmluZ1tdfSkge1xuICBwcmVwYXJlTGF6eU5vZGVJbmplY3Rvcihhcmd2KTtcblxuICBjb25zdCBbZmlsZSwgZnVuY10gPSBhcmd2LnRhcmdldC5zcGxpdCgnIycpO1xuICBjb25zdCBndWVzc2luZ0ZpbGU6IHN0cmluZ1tdID0gW1xuICAgIGZpbGUsXG4gICAgUGF0aC5yZXNvbHZlKGZpbGUpLFxuICAgIC4uLihjb25maWcoKS5wYWNrYWdlU2NvcGVzIGFzIHN0cmluZ1tdKS5tYXAoc2NvcGUgPT4gYEAke3Njb3BlfS8ke2ZpbGV9YClcbiAgXTtcbiAgY29uc3QgZm91bmRNb2R1bGUgPSBndWVzc2luZ0ZpbGUuZmluZCh0YXJnZXQgPT4ge1xuICAgIHRyeSB7XG4gICAgICByZXF1aXJlLnJlc29sdmUodGFyZ2V0KTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9KTtcblxuICBpZiAoIWZvdW5kTW9kdWxlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCB0YXJnZXQgbW9kdWxlIGZyb20gcGF0aHMgbGlrZTpcXG4ke2d1ZXNzaW5nRmlsZS5qb2luKCdcXG4nKX1gKTtcbiAgfVxuICBjb25zdCBfZXhwb3J0cyA9IHJlcXVpcmUoZm91bmRNb2R1bGUpO1xuICBpZiAoIV8uaGFzKF9leHBvcnRzLCBmdW5jKSkge1xuICAgIGxvZy5lcnJvcihgVGhlcmUgaXMgbm8gZXhwb3J0IGZ1bmN0aW9uOiAke2Z1bmN9LCBleGlzdGluZyBleHBvcnQgbWVtYmVycyBhcmU6XFxuYCArXG4gICAgYCR7T2JqZWN0LmtleXMoX2V4cG9ydHMpLmZpbHRlcihuYW1lID0+IHR5cGVvZiAoX2V4cG9ydHNbbmFtZV0pID09PSAnZnVuY3Rpb24nKS5tYXAobmFtZSA9PiBuYW1lICsgJygpJykuam9pbignXFxuJyl9YCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGF3YWl0IFByb21pc2UucmVzb2x2ZShfZXhwb3J0c1tmdW5jXS5hcHBseShnbG9iYWwsIGFyZ3YuXy5zbGljZSgxKSB8fCBbXSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcnVuUGFja2FnZXMoYXJndjoge3RhcmdldDogc3RyaW5nLCBwYWNrYWdlOiBzdHJpbmdbXSwgW2tleTogc3RyaW5nXTogYW55fSkge1xuICAvLyBjb25zdCBOb2RlQXBpID0gcmVxdWlyZSgnLi4vbGliL25vZGVBcGknKTtcbiAgY29uc3QgaW5jbHVkZU5hbWVTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgYXJndi5wYWNrYWdlLmZvckVhY2gobmFtZSA9PiBpbmNsdWRlTmFtZVNldC5hZGQobmFtZSkpO1xuICBjb25zdCBbZmlsZVRvUnVuLCBmdW5jVG9SdW5dID0gKGFyZ3YudGFyZ2V0IGFzIHN0cmluZykuc3BsaXQoJyMnKTtcbiAgY29uc3QgW3BhY2thZ2VzLCBwcm90b10gPSBpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMoYXJndiwgd2Fsa1BhY2thZ2VzKGNvbmZpZywgcGFja2FnZVV0aWxzKSk7XG4gIGNvbnN0IGNvbXBvbmVudHMgPSBwYWNrYWdlcy5maWx0ZXIocGsgPT4ge1xuICAgIC8vIHNldHVwTm9kZUluamVjdG9yRm9yKHBrLCBOb2RlQXBpKTsgLy8gQWxsIGNvbXBvbmVudCBwYWNrYWdlIHNob3VsZCBiZSBhYmxlIHRvIGFjY2VzcyAnX19hcGknLCBldmVuIHRoZXkgYXJlIG5vdCBpbmNsdWRlZFxuICAgIGlmICgoaW5jbHVkZU5hbWVTZXQuc2l6ZSA9PT0gMCB8fCBpbmNsdWRlTmFtZVNldC5oYXMocGsubG9uZ05hbWUpIHx8IGluY2x1ZGVOYW1lU2V0Lmhhcyhway5zaG9ydE5hbWUpKSAmJlxuICAgICAgcGsuZHIgIT0gbnVsbCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVxdWlyZS5yZXNvbHZlKHBrLmxvbmdOYW1lICsgJy8nICsgZmlsZVRvUnVuKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xuICByZXR1cm4gb3JkZXJQYWNrYWdlcyhjb21wb25lbnRzLCAocGtJbnN0YW5jZTogUGFja2FnZUluc3RhbmNlKSAgPT4ge1xuICAgIGNvbnN0IG1vZCA9IHBrSW5zdGFuY2UubG9uZ05hbWUgKyAnLycgKyBmaWxlVG9SdW47XG4gICAgbG9nLmluZm8oJ3JlcXVpcmUoJXMpJywgSlNPTi5zdHJpbmdpZnkobW9kKSk7XG4gICAgY29uc3QgZmlsZUV4cG9ydHM6IGFueSA9IHJlcXVpcmUobW9kKTtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGZpbGVFeHBvcnRzW2Z1bmNUb1J1bl0pKSB7XG4gICAgICBsb2cuaW5mbygnUnVuICVzICVzKCknLCBtb2QsIGZ1bmNUb1J1bik7XG4gICAgICByZXR1cm4gZmlsZUV4cG9ydHNbZnVuY1RvUnVuXSgpO1xuICAgIH1cbiAgfSlcbiAgLnRoZW4oKCkgPT4ge1xuICAgIChwcm90by5ldmVudEJ1cyBhcyBFdmVudHMpLmVtaXQoJ2RvbmUnLCB7ZmlsZTogZmlsZVRvUnVuLCBmdW5jdGlvbk5hbWU6IGZ1bmNUb1J1bn0gYXMgU2VydmVyUnVubmVyRXZlbnQpO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGluaXRJbmplY3RvckZvck5vZGVQYWNrYWdlcyhhcmd2OiB7W2tleTogc3RyaW5nXTogYW55fSwgcGFja2FnZUluZm86IFBhY2thZ2VJbmZvKTpcbiAgW1BhY2thZ2VCcm93c2VySW5zdGFuY2VbXSwge2V2ZW50QnVzOiBFdmVudHN9XSB7XG4gIGNvbnN0IE5vZGVBcGk6IHR5cGVvZiBfTm9kZUFwaSA9IHJlcXVpcmUoJy4vcGFja2FnZS1tZ3Ivbm9kZS1wYWNrYWdlLWFwaScpO1xuICBjb25zdCBwcm90byA9IE5vZGVBcGkucHJvdG90eXBlO1xuICBwcm90by5hcmd2ID0gYXJndjtcbiAgLy8gY29uc3QgcGFja2FnZUluZm86IFBhY2thZ2VJbmZvID0gd2Fsa1BhY2thZ2VzKGNvbmZpZywgcGFja2FnZVV0aWxzKTtcbiAgcHJvdG8ucGFja2FnZUluZm8gPSBwYWNrYWdlSW5mbztcbiAgY29uc3QgY2FjaGUgPSBuZXcgTFJVPHN0cmluZywgUGFja2FnZUJyb3dzZXJJbnN0YW5jZT4oe21heDogMjAsIG1heEFnZTogMjAwMDB9KTtcbiAgcHJvdG8uZmluZFBhY2thZ2VCeUZpbGUgPSBmdW5jdGlvbihmaWxlOiBzdHJpbmcpOiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlIHwgdW5kZWZpbmVkIHtcbiAgICB2YXIgZm91bmQgPSBjYWNoZS5nZXQoZmlsZSk7XG4gICAgaWYgKCFmb3VuZCkge1xuICAgICAgZm91bmQgPSBwYWNrYWdlSW5mby5kaXJUcmVlLmdldEFsbERhdGEoZmlsZSkucG9wKCk7XG4gICAgICBpZiAoZm91bmQpXG4gICAgICAgIGNhY2hlLnNldChmaWxlLCBmb3VuZCk7XG4gICAgfVxuICAgIHJldHVybiBmb3VuZDtcbiAgfTtcbiAgcHJvdG8uZ2V0Tm9kZUFwaUZvclBhY2thZ2UgPSBmdW5jdGlvbihwYWNrYWdlSW5zdGFuY2U6IGFueSkge1xuICAgIHJldHVybiBnZXRBcGlGb3JQYWNrYWdlKHBhY2thZ2VJbnN0YW5jZSwgTm9kZUFwaSk7XG4gIH07XG4gIGNvbnN0IGRyUGFja2FnZXMgPSBwYWNrYWdlSW5mby5hbGxNb2R1bGVzLmZpbHRlcihwayA9PiB7XG4gICAgaWYgKHBrLmRyKSB7XG4gICAgICBzZXR1cE5vZGVJbmplY3RvckZvcihwaywgTm9kZUFwaSk7IC8vIEFsbCBjb21wb25lbnQgcGFja2FnZSBzaG91bGQgYmUgYWJsZSB0byBhY2Nlc3MgJ19fYXBpJywgZXZlbiB0aGV5IGFyZSBub3QgaW5jbHVkZWRcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xuICByZXR1cm4gW2RyUGFja2FnZXMsIHByb3RvXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGluaXRXZWJJbmplY3RvcihwYWNrYWdlczogUGFja2FnZUJyb3dzZXJJbnN0YW5jZVtdLCBhcGlQcm90b3R5cGU6IGFueSkge1xuICBfLmVhY2gocGFja2FnZXMsIHBhY2sgPT4ge1xuICAgIGlmIChwYWNrLmRyKSB7XG4gICAgICAvLyBubyB2ZW5kb3IgcGFja2FnZSdzIHBhdGggaW5mb3JtYXRpb25cbiAgICAgIHdlYkluamVjdG9yLmFkZFBhY2thZ2UocGFjay5sb25nTmFtZSwgcGFjay5wYWNrYWdlUGF0aCk7XG4gICAgfVxuICB9KTtcbiAgd2ViSW5qZWN0b3IuZnJvbUFsbFBhY2thZ2VzKClcbiAgLnJlcGxhY2VDb2RlKCdfX2FwaScsICdfX2FwaScpXG4gIC5zdWJzdGl0dXRlKC9eKFtee10qKVxce2xvY2FsZVxcfSguKikkLyxcbiAgICAoX2ZpbGVQYXRoOiBzdHJpbmcsIG1hdGNoOiBSZWdFeHBFeGVjQXJyYXkpID0+IG1hdGNoWzFdICsgYXBpUHJvdG90eXBlLmdldEJ1aWxkTG9jYWxlKCkgKyBtYXRjaFsyXSk7XG5cbiAgY29uc3QgZG9uZSA9IHdlYkluamVjdG9yLnJlYWRJbmplY3RGaWxlKCdtb2R1bGUtcmVzb2x2ZS5icm93c2VyJyk7XG4gIGFwaVByb3RvdHlwZS5icm93c2VySW5qZWN0b3IgPSB3ZWJJbmplY3RvcjtcbiAgcmV0dXJuIGRvbmU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwcmVwYXJlTGF6eU5vZGVJbmplY3Rvcihhcmd2OiB7W2tleTogc3RyaW5nXTogYW55fSkge1xuICBjb25zdCBOb2RlQXBpOiB0eXBlb2YgX05vZGVBcGkgPSByZXF1aXJlKCcuL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGknKTtcbiAgY29uc3QgcHJvdG8gPSBOb2RlQXBpLnByb3RvdHlwZTtcbiAgcHJvdG8uYXJndiA9IGFyZ3Y7XG4gIGxldCBwYWNrYWdlSW5mbzogUGFja2FnZUluZm87XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCAncGFja2FnZUluZm8nLCB7XG4gICAgZ2V0KCkge1xuICAgICAgaWYgKHBhY2thZ2VJbmZvID09IG51bGwpXG4gICAgICAgIHBhY2thZ2VJbmZvID0gd2Fsa1BhY2thZ2VzKGNvbmZpZywgcGFja2FnZVV0aWxzKTtcbiAgICAgIHJldHVybiBwYWNrYWdlSW5mbztcbiAgICB9XG4gIH0pO1xuICBwcm90by5maW5kUGFja2FnZUJ5RmlsZSA9IGNyZWF0ZUxhenlQYWNrYWdlRmlsZUZpbmRlcigpO1xuICBwcm90by5nZXROb2RlQXBpRm9yUGFja2FnZSA9IGZ1bmN0aW9uKHBhY2thZ2VJbnN0YW5jZTogYW55KSB7XG4gICAgcmV0dXJuIGdldEFwaUZvclBhY2thZ2UocGFja2FnZUluc3RhbmNlLCBOb2RlQXBpKTtcbiAgfTtcbiAgbm9kZUluamVjdG9yLmZyb21Sb290KClcbiAgLnZhbHVlKCdfX2luamVjdG9yJywgbm9kZUluamVjdG9yKVxuICAuZmFjdG9yeSgnX19hcGknLCAoc291cmNlRmlsZVBhdGg6IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IHBhY2thZ2VJbnN0YW5jZSA9IHByb3RvLmZpbmRQYWNrYWdlQnlGaWxlKHNvdXJjZUZpbGVQYXRoKTtcbiAgICByZXR1cm4gZ2V0QXBpRm9yUGFja2FnZShwYWNrYWdlSW5zdGFuY2UsIE5vZGVBcGkpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gc2V0dXBOb2RlSW5qZWN0b3JGb3IocGtJbnN0YW5jZTogUGFja2FnZUJyb3dzZXJJbnN0YW5jZSwgTm9kZUFwaTogdHlwZW9mIF9Ob2RlQXBpICkge1xuICBmdW5jdGlvbiBhcGlGYWN0b3J5KCkge1xuICAgIHJldHVybiBnZXRBcGlGb3JQYWNrYWdlKHBrSW5zdGFuY2UsIE5vZGVBcGkpO1xuICB9XG4gIG5vZGVJbmplY3Rvci5mcm9tRGlyKHBrSW5zdGFuY2UucmVhbFBhY2thZ2VQYXRoKVxuICAudmFsdWUoJ19faW5qZWN0b3InLCBub2RlSW5qZWN0b3IpXG4gIC5mYWN0b3J5KCdfX2FwaScsIGFwaUZhY3RvcnkpO1xuICBub2RlSW5qZWN0b3IuZnJvbURpcihwa0luc3RhbmNlLnBhY2thZ2VQYXRoKVxuICAudmFsdWUoJ19faW5qZWN0b3InLCBub2RlSW5qZWN0b3IpXG4gIC5mYWN0b3J5KCdfX2FwaScsIGFwaUZhY3RvcnkpO1xuICAvLyBub2RlSW5qZWN0b3IuZGVmYXVsdCA9IG5vZGVJbmplY3RvcjsgLy8gRm9yIEVTNiBpbXBvcnQgc3ludGF4XG59XG5cbmZ1bmN0aW9uIGdldEFwaUZvclBhY2thZ2UocGtJbnN0YW5jZTogYW55LCBOb2RlQXBpOiB0eXBlb2YgX05vZGVBcGkpIHtcbiAgaWYgKF8uaGFzKGFwaUNhY2hlLCBwa0luc3RhbmNlLmxvbmdOYW1lKSkge1xuICAgIHJldHVybiBhcGlDYWNoZVtwa0luc3RhbmNlLmxvbmdOYW1lXTtcbiAgfVxuXG4gIGNvbnN0IGFwaSA9IG5ldyBOb2RlQXBpKHBrSW5zdGFuY2UubG9uZ05hbWUsIHBrSW5zdGFuY2UpO1xuICAvLyBhcGkuY29uc3RydWN0b3IgPSBOb2RlQXBpO1xuICBwa0luc3RhbmNlLmFwaSA9IGFwaTtcbiAgYXBpQ2FjaGVbcGtJbnN0YW5jZS5sb25nTmFtZV0gPSBhcGk7XG4gIGFwaS5kZWZhdWx0ID0gYXBpOyAvLyBGb3IgRVM2IGltcG9ydCBzeW50YXhcbiAgcmV0dXJuIGFwaTtcbn1cblxuXG4iXX0=