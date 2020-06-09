"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const config = require('../lib/config');
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
            ...config().packageScopes.map(scope => `@${scope}/${file}`)
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
    const [packages, proto] = initInjectorForNodePackages(argv, ts_1.walkPackages(config, packageUtils));
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
                packageInfo = ts_1.walkPackages(config, packageUtils);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wYWNrYWdlLXJ1bm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG9DQUFvQztBQUNwQywwQ0FBNEI7QUFDNUIsMERBQTRCO0FBQzVCLHdDQUF1RztBQUN2Ryw2Q0FBNkM7QUFDN0MsNERBQTREO0FBQzVELHlEQUErRDtBQUUvRCwrQ0FBK0M7QUFDL0MsdUVBQTJFO0FBRzNFLGdEQUF3QjtBQUN4QixtREFBNEQ7QUFFNUQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3hDLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO0FBRS9ELE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQU0xRCxNQUFhLFlBQVk7SUFLakIsY0FBYzs7WUFDbEIsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUMxQixNQUFNLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUMxRCxDQUFDO0tBQUE7SUFFZSxtQkFBbUIsQ0FBQyxLQUFvQjs7WUFDdEQsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUU7Z0JBQ3hCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ25DLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUU7b0JBQ2hDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDdEMsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO2lCQUN6QzthQUNG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QztBQUVELFNBQVMsZ0JBQWdCLENBQUMsVUFBZSxFQUFFLE9BQXdCO0lBQ2pFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUFFO1FBQ3hDLE9BQU8sUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztLQUN0QztJQUVELE1BQU0sR0FBRyxHQUFHLElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDekQsNkJBQTZCO0lBQzdCLFVBQVUsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO0lBQ3JCLFFBQVEsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEdBQUcsR0FBRyxDQUFDO0lBQ3BDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLENBQUMsd0JBQXdCO0lBQzNDLE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG1heC1saW5lLWxlbmd0aCAqL1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IExSVSBmcm9tICdscnUtY2FjaGUnO1xuaW1wb3J0IHsgUGFja2FnZUluZm8sIHBhY2thZ2VJbnN0YW5jZSBhcyBQYWNrYWdlQnJvd3Nlckluc3RhbmNlLCB3YWxrUGFja2FnZXMgfSBmcm9tICcuL2J1aWxkLXV0aWwvdHMnO1xuLy8gY29uc3QgTm9kZUFwaSA9IHJlcXVpcmUoJy4uL2xpYi9ub2RlQXBpJyk7XG4vLyBjb25zdCB7bm9kZUluamVjdG9yfSA9IHJlcXVpcmUoJy4uL2xpYi9pbmplY3RvckZhY3RvcnknKTtcbmltcG9ydCB7IG5vZGVJbmplY3Rvciwgd2ViSW5qZWN0b3IgfSBmcm9tICcuL2luamVjdG9yLWZhY3RvcnknO1xuaW1wb3J0IF9Ob2RlQXBpIGZyb20gJy4vcGFja2FnZS1tZ3Ivbm9kZS1wYWNrYWdlLWFwaSc7XG4vLyBpbXBvcnQgUGFja2FnZSBmcm9tICcuL3BhY2thZ2VOb2RlSW5zdGFuY2UnO1xuaW1wb3J0IHsgb3JkZXJQYWNrYWdlcywgUGFja2FnZUluc3RhbmNlIH0gZnJvbSAnLi9wYWNrYWdlLXByaW9yaXR5LWhlbHBlcic7XG5pbXBvcnQgTm9kZVBhY2thZ2UgZnJvbSAnLi9wYWNrYWdlTm9kZUluc3RhbmNlJztcbmltcG9ydCBFdmVudHMgPSByZXF1aXJlKCdldmVudHMnKTtcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtjcmVhdGVMYXp5UGFja2FnZUZpbGVGaW5kZXJ9IGZyb20gJy4vcGFja2FnZS11dGlscyc7XG5cbmNvbnN0IGNvbmZpZyA9IHJlcXVpcmUoJy4uL2xpYi9jb25maWcnKTtcbmNvbnN0IHBhY2thZ2VVdGlscyA9IHJlcXVpcmUoJy4uL2xpYi9wYWNrYWdlTWdyL3BhY2thZ2VVdGlscycpO1xuXG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ3BhY2thZ2UtcnVubmVyJyk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VydmVyUnVubmVyRXZlbnQge1xuICBmaWxlOiBzdHJpbmc7XG4gIGZ1bmN0aW9uTmFtZTogc3RyaW5nO1xufVxuZXhwb3J0IGNsYXNzIFNlcnZlclJ1bm5lciB7XG4gIC8vIHBhY2thZ2VDYWNoZToge1tzaG9ydE5hbWU6IHN0cmluZ106IE5vZGVQYWNrYWdlfSA9IHt9O1xuICAvLyBjb3JlUGFja2FnZXM6IHtbc2hvcnROYW1lOiBzdHJpbmddOiBOb2RlUGFja2FnZX0gPSB7fTtcbiAgZGVhY3RpdmF0ZVBhY2thZ2VzOiBOb2RlUGFja2FnZVtdO1xuXG4gIGFzeW5jIHNodXRkb3duU2VydmVyKCkge1xuICAgIGxvZy5pbmZvKCdzaHV0dGluZyBkb3duJyk7XG4gICAgYXdhaXQgdGhpcy5fZGVhY3RpdmF0ZVBhY2thZ2VzKHRoaXMuZGVhY3RpdmF0ZVBhY2thZ2VzKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBfZGVhY3RpdmF0ZVBhY2thZ2VzKGNvbXBzOiBOb2RlUGFja2FnZVtdKSB7XG4gICAgZm9yIChjb25zdCBjb21wIG9mIGNvbXBzKSB7XG4gICAgICBjb25zdCBleHAgPSByZXF1aXJlKGNvbXAubG9uZ05hbWUpO1xuICAgICAgaWYgKF8uaXNGdW5jdGlvbihleHAuZGVhY3RpdmF0ZSkpIHtcbiAgICAgICAgbG9nLmluZm8oJ2RlYWN0aXZhdGUnLCBjb21wLmxvbmdOYW1lKTtcbiAgICAgICAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKGV4cC5kZWFjdGl2YXRlKCkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5jb25zdCBhcGlDYWNoZToge1tuYW1lOiBzdHJpbmddOiBhbnl9ID0ge307XG4vLyBjb25zdCBwYWNrYWdlVHJlZSA9IG5ldyBEaXJUcmVlPFBhY2thZ2VCcm93c2VySW5zdGFuY2U+KCk7XG5cbi8qKlxuICogTGF6aWx5IGluaXQgaW5qZWN0b3IgZm9yIHBhY2thZ2VzIGFuZCBydW4gc3BlY2lmaWMgcGFja2FnZSBvbmx5LFxuICogbm8gZnVsbHkgc2Nhbm5pbmcgb3Igb3JkZXJpbmcgb24gYWxsIHBhY2thZ2VzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5TaW5nbGVQYWNrYWdlKGFyZ3Y6IHt0YXJnZXQ6IHN0cmluZywgYXJndW1lbnRzOiBzdHJpbmdbXSwgW2tleTogc3RyaW5nXTogYW55fSkge1xuICBwcmVwYXJlTGF6eU5vZGVJbmplY3Rvcihhcmd2KTtcblxuICBjb25zdCBbZmlsZSwgZnVuY10gPSBhcmd2LnRhcmdldC5zcGxpdCgnIycpO1xuICBjb25zdCBndWVzc2luZ0ZpbGU6IHN0cmluZ1tdID0gW1xuICAgIGZpbGUsXG4gICAgUGF0aC5yZXNvbHZlKGZpbGUpLFxuICAgIC4uLihjb25maWcoKS5wYWNrYWdlU2NvcGVzIGFzIHN0cmluZ1tdKS5tYXAoc2NvcGUgPT4gYEAke3Njb3BlfS8ke2ZpbGV9YClcbiAgXTtcbiAgY29uc3QgZm91bmRNb2R1bGUgPSBndWVzc2luZ0ZpbGUuZmluZCh0YXJnZXQgPT4ge1xuICAgIHRyeSB7XG4gICAgICByZXF1aXJlLnJlc29sdmUodGFyZ2V0KTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9KTtcblxuICBpZiAoIWZvdW5kTW9kdWxlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCB0YXJnZXQgbW9kdWxlIGZyb20gcGF0aHMgbGlrZTpcXG4ke2d1ZXNzaW5nRmlsZS5qb2luKCdcXG4nKX1gKTtcbiAgfVxuXG4gIGNvbnN0IF9leHBvcnRzID0gcmVxdWlyZShmb3VuZE1vZHVsZSk7XG4gIGlmICghXy5oYXMoX2V4cG9ydHMsIGZ1bmMpKSB7XG4gICAgbG9nLmVycm9yKGBUaGVyZSBpcyBubyBleHBvcnQgZnVuY3Rpb246ICR7ZnVuY30sIGV4aXN0aW5nIGV4cG9ydCBtZW1iZXJzIGFyZTpcXG5gICtcbiAgICBgJHtPYmplY3Qua2V5cyhfZXhwb3J0cykuZmlsdGVyKG5hbWUgPT4gdHlwZW9mIChfZXhwb3J0c1tuYW1lXSkgPT09ICdmdW5jdGlvbicpLm1hcChuYW1lID0+IG5hbWUgKyAnKCknKS5qb2luKCdcXG4nKX1gKTtcbiAgICByZXR1cm47XG4gIH1cbiAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKF9leHBvcnRzW2Z1bmNdLmFwcGx5KGdsb2JhbCwgYXJndi5fLnNsaWNlKDEpIHx8IFtdKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBydW5QYWNrYWdlcyhhcmd2OiB7dGFyZ2V0OiBzdHJpbmcsIHBhY2thZ2U6IHN0cmluZ1tdLCBba2V5OiBzdHJpbmddOiBhbnl9KSB7XG4gIC8vIGNvbnN0IE5vZGVBcGkgPSByZXF1aXJlKCcuLi9saWIvbm9kZUFwaScpO1xuICBjb25zdCBpbmNsdWRlTmFtZVNldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBhcmd2LnBhY2thZ2UuZm9yRWFjaChuYW1lID0+IGluY2x1ZGVOYW1lU2V0LmFkZChuYW1lKSk7XG4gIGNvbnN0IFtmaWxlVG9SdW4sIGZ1bmNUb1J1bl0gPSAoYXJndi50YXJnZXQgYXMgc3RyaW5nKS5zcGxpdCgnIycpO1xuICBjb25zdCBbcGFja2FnZXMsIHByb3RvXSA9IGluaXRJbmplY3RvckZvck5vZGVQYWNrYWdlcyhhcmd2LCB3YWxrUGFja2FnZXMoY29uZmlnLCBwYWNrYWdlVXRpbHMpKTtcbiAgY29uc3QgY29tcG9uZW50cyA9IHBhY2thZ2VzLmZpbHRlcihwayA9PiB7XG4gICAgLy8gc2V0dXBOb2RlSW5qZWN0b3JGb3IocGssIE5vZGVBcGkpOyAvLyBBbGwgY29tcG9uZW50IHBhY2thZ2Ugc2hvdWxkIGJlIGFibGUgdG8gYWNjZXNzICdfX2FwaScsIGV2ZW4gdGhleSBhcmUgbm90IGluY2x1ZGVkXG4gICAgaWYgKChpbmNsdWRlTmFtZVNldC5zaXplID09PSAwIHx8IGluY2x1ZGVOYW1lU2V0Lmhhcyhway5sb25nTmFtZSkgfHwgaW5jbHVkZU5hbWVTZXQuaGFzKHBrLnNob3J0TmFtZSkpICYmXG4gICAgICBway5kciAhPSBudWxsKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXF1aXJlLnJlc29sdmUocGsubG9uZ05hbWUgKyAnLycgKyBmaWxlVG9SdW4pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG4gIHJldHVybiBvcmRlclBhY2thZ2VzKGNvbXBvbmVudHMsIChwa0luc3RhbmNlOiBQYWNrYWdlSW5zdGFuY2UpICA9PiB7XG4gICAgY29uc3QgbW9kID0gcGtJbnN0YW5jZS5sb25nTmFtZSArICcvJyArIGZpbGVUb1J1bjtcbiAgICBsb2cuaW5mbygncmVxdWlyZSglcyknLCBKU09OLnN0cmluZ2lmeShtb2QpKTtcbiAgICBjb25zdCBmaWxlRXhwb3J0czogYW55ID0gcmVxdWlyZShtb2QpO1xuICAgIGlmIChfLmlzRnVuY3Rpb24oZmlsZUV4cG9ydHNbZnVuY1RvUnVuXSkpIHtcbiAgICAgIGxvZy5pbmZvKCdSdW4gJXMgJXMoKScsIG1vZCwgZnVuY1RvUnVuKTtcbiAgICAgIHJldHVybiBmaWxlRXhwb3J0c1tmdW5jVG9SdW5dKCk7XG4gICAgfVxuICB9KVxuICAudGhlbigoKSA9PiB7XG4gICAgKHByb3RvLmV2ZW50QnVzIGFzIEV2ZW50cykuZW1pdCgnZG9uZScsIHtmaWxlOiBmaWxlVG9SdW4sIGZ1bmN0aW9uTmFtZTogZnVuY1RvUnVufSBhcyBTZXJ2ZXJSdW5uZXJFdmVudCk7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaW5pdEluamVjdG9yRm9yTm9kZVBhY2thZ2VzKGFyZ3Y6IHtba2V5OiBzdHJpbmddOiBhbnl9LCBwYWNrYWdlSW5mbzogUGFja2FnZUluZm8pOlxuICBbUGFja2FnZUJyb3dzZXJJbnN0YW5jZVtdLCB7ZXZlbnRCdXM6IEV2ZW50c31dIHtcbiAgY29uc3QgTm9kZUFwaTogdHlwZW9mIF9Ob2RlQXBpID0gcmVxdWlyZSgnLi9wYWNrYWdlLW1nci9ub2RlLXBhY2thZ2UtYXBpJyk7XG4gIGNvbnN0IHByb3RvID0gTm9kZUFwaS5wcm90b3R5cGU7XG4gIHByb3RvLmFyZ3YgPSBhcmd2O1xuICAvLyBjb25zdCBwYWNrYWdlSW5mbzogUGFja2FnZUluZm8gPSB3YWxrUGFja2FnZXMoY29uZmlnLCBwYWNrYWdlVXRpbHMpO1xuICBwcm90by5wYWNrYWdlSW5mbyA9IHBhY2thZ2VJbmZvO1xuICBjb25zdCBjYWNoZSA9IG5ldyBMUlU8c3RyaW5nLCBQYWNrYWdlQnJvd3Nlckluc3RhbmNlPih7bWF4OiAyMCwgbWF4QWdlOiAyMDAwMH0pO1xuICBwcm90by5maW5kUGFja2FnZUJ5RmlsZSA9IGZ1bmN0aW9uKGZpbGU6IHN0cmluZyk6IFBhY2thZ2VCcm93c2VySW5zdGFuY2UgfCB1bmRlZmluZWQge1xuICAgIHZhciBmb3VuZCA9IGNhY2hlLmdldChmaWxlKTtcbiAgICBpZiAoIWZvdW5kKSB7XG4gICAgICBmb3VuZCA9IHBhY2thZ2VJbmZvLmRpclRyZWUuZ2V0QWxsRGF0YShmaWxlKS5wb3AoKTtcbiAgICAgIGlmIChmb3VuZClcbiAgICAgICAgY2FjaGUuc2V0KGZpbGUsIGZvdW5kKTtcbiAgICB9XG4gICAgcmV0dXJuIGZvdW5kO1xuICB9O1xuICBwcm90by5nZXROb2RlQXBpRm9yUGFja2FnZSA9IGZ1bmN0aW9uKHBhY2thZ2VJbnN0YW5jZTogYW55KSB7XG4gICAgcmV0dXJuIGdldEFwaUZvclBhY2thZ2UocGFja2FnZUluc3RhbmNlLCBOb2RlQXBpKTtcbiAgfTtcbiAgY29uc3QgZHJQYWNrYWdlcyA9IHBhY2thZ2VJbmZvLmFsbE1vZHVsZXMuZmlsdGVyKHBrID0+IHtcbiAgICBpZiAocGsuZHIpIHtcbiAgICAgIHNldHVwTm9kZUluamVjdG9yRm9yKHBrLCBOb2RlQXBpKTsgLy8gQWxsIGNvbXBvbmVudCBwYWNrYWdlIHNob3VsZCBiZSBhYmxlIHRvIGFjY2VzcyAnX19hcGknLCBldmVuIHRoZXkgYXJlIG5vdCBpbmNsdWRlZFxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG4gIHJldHVybiBbZHJQYWNrYWdlcywgcHJvdG9dO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaW5pdFdlYkluamVjdG9yKHBhY2thZ2VzOiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlW10sIGFwaVByb3RvdHlwZTogYW55KSB7XG4gIF8uZWFjaChwYWNrYWdlcywgcGFjayA9PiB7XG4gICAgaWYgKHBhY2suZHIpIHtcbiAgICAgIC8vIG5vIHZlbmRvciBwYWNrYWdlJ3MgcGF0aCBpbmZvcm1hdGlvblxuICAgICAgd2ViSW5qZWN0b3IuYWRkUGFja2FnZShwYWNrLmxvbmdOYW1lLCBwYWNrLnBhY2thZ2VQYXRoKTtcbiAgICB9XG4gIH0pO1xuICB3ZWJJbmplY3Rvci5mcm9tQWxsUGFja2FnZXMoKVxuICAucmVwbGFjZUNvZGUoJ19fYXBpJywgJ19fYXBpJylcbiAgLnN1YnN0aXR1dGUoL14oW157XSopXFx7bG9jYWxlXFx9KC4qKSQvLFxuICAgIChfZmlsZVBhdGg6IHN0cmluZywgbWF0Y2g6IFJlZ0V4cEV4ZWNBcnJheSkgPT4gbWF0Y2hbMV0gKyBhcGlQcm90b3R5cGUuZ2V0QnVpbGRMb2NhbGUoKSArIG1hdGNoWzJdKTtcblxuICBjb25zdCBkb25lID0gd2ViSW5qZWN0b3IucmVhZEluamVjdEZpbGUoJ21vZHVsZS1yZXNvbHZlLmJyb3dzZXInKTtcbiAgYXBpUHJvdG90eXBlLmJyb3dzZXJJbmplY3RvciA9IHdlYkluamVjdG9yO1xuICByZXR1cm4gZG9uZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHByZXBhcmVMYXp5Tm9kZUluamVjdG9yKGFyZ3Y6IHtba2V5OiBzdHJpbmddOiBhbnl9KSB7XG4gIGNvbnN0IE5vZGVBcGk6IHR5cGVvZiBfTm9kZUFwaSA9IHJlcXVpcmUoJy4vcGFja2FnZS1tZ3Ivbm9kZS1wYWNrYWdlLWFwaScpO1xuICBjb25zdCBwcm90byA9IE5vZGVBcGkucHJvdG90eXBlO1xuICBwcm90by5hcmd2ID0gYXJndjtcbiAgbGV0IHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbztcblxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sICdwYWNrYWdlSW5mbycsIHtcbiAgICBnZXQoKSB7XG4gICAgICBpZiAocGFja2FnZUluZm8gPT0gbnVsbClcbiAgICAgICAgcGFja2FnZUluZm8gPSB3YWxrUGFja2FnZXMoY29uZmlnLCBwYWNrYWdlVXRpbHMpO1xuICAgICAgcmV0dXJuIHBhY2thZ2VJbmZvO1xuICAgIH1cbiAgfSk7XG4gIHByb3RvLmZpbmRQYWNrYWdlQnlGaWxlID0gY3JlYXRlTGF6eVBhY2thZ2VGaWxlRmluZGVyKCk7XG4gIHByb3RvLmdldE5vZGVBcGlGb3JQYWNrYWdlID0gZnVuY3Rpb24ocGFja2FnZUluc3RhbmNlOiBhbnkpIHtcbiAgICByZXR1cm4gZ2V0QXBpRm9yUGFja2FnZShwYWNrYWdlSW5zdGFuY2UsIE5vZGVBcGkpO1xuICB9O1xuICBub2RlSW5qZWN0b3IuZnJvbVJvb3QoKVxuICAudmFsdWUoJ19faW5qZWN0b3InLCBub2RlSW5qZWN0b3IpXG4gIC5mYWN0b3J5KCdfX2FwaScsIChzb3VyY2VGaWxlUGF0aDogc3RyaW5nKSA9PiB7XG4gICAgY29uc3QgcGFja2FnZUluc3RhbmNlID0gcHJvdG8uZmluZFBhY2thZ2VCeUZpbGUoc291cmNlRmlsZVBhdGgpO1xuICAgIHJldHVybiBnZXRBcGlGb3JQYWNrYWdlKHBhY2thZ2VJbnN0YW5jZSwgTm9kZUFwaSk7XG4gIH0pO1xufVxuXG5mdW5jdGlvbiBzZXR1cE5vZGVJbmplY3RvckZvcihwa0luc3RhbmNlOiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlLCBOb2RlQXBpOiB0eXBlb2YgX05vZGVBcGkgKSB7XG4gIGZ1bmN0aW9uIGFwaUZhY3RvcnkoKSB7XG4gICAgcmV0dXJuIGdldEFwaUZvclBhY2thZ2UocGtJbnN0YW5jZSwgTm9kZUFwaSk7XG4gIH1cbiAgbm9kZUluamVjdG9yLmZyb21EaXIocGtJbnN0YW5jZS5yZWFsUGFja2FnZVBhdGgpXG4gIC52YWx1ZSgnX19pbmplY3RvcicsIG5vZGVJbmplY3RvcilcbiAgLmZhY3RvcnkoJ19fYXBpJywgYXBpRmFjdG9yeSk7XG4gIG5vZGVJbmplY3Rvci5mcm9tRGlyKHBrSW5zdGFuY2UucGFja2FnZVBhdGgpXG4gIC52YWx1ZSgnX19pbmplY3RvcicsIG5vZGVJbmplY3RvcilcbiAgLmZhY3RvcnkoJ19fYXBpJywgYXBpRmFjdG9yeSk7XG4gIC8vIG5vZGVJbmplY3Rvci5kZWZhdWx0ID0gbm9kZUluamVjdG9yOyAvLyBGb3IgRVM2IGltcG9ydCBzeW50YXhcbn1cblxuZnVuY3Rpb24gZ2V0QXBpRm9yUGFja2FnZShwa0luc3RhbmNlOiBhbnksIE5vZGVBcGk6IHR5cGVvZiBfTm9kZUFwaSkge1xuICBpZiAoXy5oYXMoYXBpQ2FjaGUsIHBrSW5zdGFuY2UubG9uZ05hbWUpKSB7XG4gICAgcmV0dXJuIGFwaUNhY2hlW3BrSW5zdGFuY2UubG9uZ05hbWVdO1xuICB9XG5cbiAgY29uc3QgYXBpID0gbmV3IE5vZGVBcGkocGtJbnN0YW5jZS5sb25nTmFtZSwgcGtJbnN0YW5jZSk7XG4gIC8vIGFwaS5jb25zdHJ1Y3RvciA9IE5vZGVBcGk7XG4gIHBrSW5zdGFuY2UuYXBpID0gYXBpO1xuICBhcGlDYWNoZVtwa0luc3RhbmNlLmxvbmdOYW1lXSA9IGFwaTtcbiAgYXBpLmRlZmF1bHQgPSBhcGk7IC8vIEZvciBFUzYgaW1wb3J0IHN5bnRheFxuICByZXR1cm4gYXBpO1xufVxuXG5cbiJdfQ==