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
const lazyPackageFactory = new ts_1.LazyPackageFactory();
/**
 * Lazily init injector for packages and run specific package only,
 * no fully scanning or ordering on all packages
 */
function runSinglePackage(argv) {
    return __awaiter(this, void 0, void 0, function* () {
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
        const cache = new lru_cache_1.default({ max: 20, maxAge: 20000 });
        proto.findPackageByFile = function (file) {
            let found = cache.get(file);
            if (!found) {
                found = lazyPackageFactory.getPackageByPath(file);
                if (found)
                    cache.set(file, found);
            }
            return found;
        };
        proto.getNodeApiForPackage = function (packageInstance) {
            return getApiForPackage(packageInstance, NodeApi);
        };
        injector_factory_1.nodeInjector.fromRoot()
            .value('__injector', injector_factory_1.nodeInjector)
            .factory('__api', (sourceFilePath) => {
            const packageInstance = proto.findPackageByFile(sourceFilePath);
            return getApiForPackage(packageInstance, NodeApi);
        });
        // console.log(nodeInjector.dirTree.traverse());
        const [file, func] = argv.target.split('#');
        const packageScopes = config().packageScopes;
        let guessingFile = file;
        for (const scope of packageScopes) {
            try {
                require.resolve(guessingFile);
                break;
            }
            catch (ex) {
                guessingFile = `@${scope}/${file}`;
            }
        }
        const _exports = require(guessingFile);
        if (!_.has(_exports, func)) {
            log.error(`There is no export function: ${func}, existing export members are:\n` +
                `${Object.keys(_exports).filter(name => typeof (_exports[name]) === 'function').map(name => name + '()').join('\n')}`);
            return;
        }
        yield Promise.resolve(_exports[func].apply(global, argv.arguments || []));
    });
}
exports.runSinglePackage = runSinglePackage;
function runPackages(argv) {
    // const NodeApi = require('../lib/nodeApi');
    const includeNameSet = new Set();
    argv.package.forEach(name => includeNameSet.add(name));
    const [fileToRun, funcToRun] = argv.target.split('#');
    const [packages, proto] = initInjectorForNodePackages(argv);
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
function initInjectorForNodePackages(argv) {
    const NodeApi = require('./package-mgr/node-package-api');
    const proto = NodeApi.prototype;
    proto.argv = argv;
    const packageInfo = ts_1.walkPackages(config, packageUtils);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wYWNrYWdlLXJ1bm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG9DQUFvQztBQUNwQywwQ0FBNEI7QUFDNUIsMERBQTRCO0FBQzVCLHdDQUEySDtBQUMzSCw2Q0FBNkM7QUFDN0MsNERBQTREO0FBQzVELHlEQUErRDtBQUUvRCwrQ0FBK0M7QUFDL0MsdUVBQTJFO0FBSTNFLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUN4QyxNQUFNLFlBQVksR0FBRyxPQUFPLENBQUMsZ0NBQWdDLENBQUMsQ0FBQztBQUUvRCxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFNMUQsTUFBYSxZQUFZO0lBS2pCLGNBQWM7O1lBQ2xCLEdBQUcsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDMUIsTUFBTSxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLENBQUM7UUFDMUQsQ0FBQztLQUFBO0lBRWUsbUJBQW1CLENBQUMsS0FBb0I7O1lBQ3RELEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFO2dCQUN4QixNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUNuQyxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFO29CQUNoQyxHQUFHLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7b0JBQ3RDLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztpQkFDekM7YUFDRjtRQUNILENBQUM7S0FBQTtDQUNGO0FBbkJE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Q0FBQztJQUM5QixnRUFBZ0U7QUFDbEUsQ0FBQztBQUVELFNBQVMsZ0JBQWdCLENBQUMsVUFBZSxFQUFFLE9BQXdCO0lBQ2pFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUFFO1FBQ3hDLE9BQU8sUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztLQUN0QztJQUVELE1BQU0sR0FBRyxHQUFHLElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDekQsNkJBQTZCO0lBQzdCLFVBQVUsQ0FBQyxHQUFHLEdBQUcsR0FBRyxDQUFDO0lBQ3JCLFFBQVEsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEdBQUcsR0FBRyxDQUFDO0lBQ3BDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLENBQUMsd0JBQXdCO0lBQzNDLE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG1heC1saW5lLWxlbmd0aCAqL1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IExSVSBmcm9tICdscnUtY2FjaGUnO1xuaW1wb3J0IHsgTGF6eVBhY2thZ2VGYWN0b3J5LCBQYWNrYWdlSW5mbywgcGFja2FnZUluc3RhbmNlIGFzIFBhY2thZ2VCcm93c2VySW5zdGFuY2UsIHdhbGtQYWNrYWdlcyB9IGZyb20gJy4vYnVpbGQtdXRpbC90cyc7XG4vLyBjb25zdCBOb2RlQXBpID0gcmVxdWlyZSgnLi4vbGliL25vZGVBcGknKTtcbi8vIGNvbnN0IHtub2RlSW5qZWN0b3J9ID0gcmVxdWlyZSgnLi4vbGliL2luamVjdG9yRmFjdG9yeScpO1xuaW1wb3J0IHsgbm9kZUluamVjdG9yLCB3ZWJJbmplY3RvciB9IGZyb20gJy4vaW5qZWN0b3ItZmFjdG9yeSc7XG5pbXBvcnQgX05vZGVBcGkgZnJvbSAnLi9wYWNrYWdlLW1nci9ub2RlLXBhY2thZ2UtYXBpJztcbi8vIGltcG9ydCBQYWNrYWdlIGZyb20gJy4vcGFja2FnZU5vZGVJbnN0YW5jZSc7XG5pbXBvcnQgeyBvcmRlclBhY2thZ2VzLCBQYWNrYWdlSW5zdGFuY2UgfSBmcm9tICcuL3BhY2thZ2UtcHJpb3JpdHktaGVscGVyJztcbmltcG9ydCBOb2RlUGFja2FnZSBmcm9tICcuL3BhY2thZ2VOb2RlSW5zdGFuY2UnO1xuaW1wb3J0IEV2ZW50cyA9IHJlcXVpcmUoJ2V2ZW50cycpO1xuXG5jb25zdCBjb25maWcgPSByZXF1aXJlKCcuLi9saWIvY29uZmlnJyk7XG5jb25zdCBwYWNrYWdlVXRpbHMgPSByZXF1aXJlKCcuLi9saWIvcGFja2FnZU1nci9wYWNrYWdlVXRpbHMnKTtcblxuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdwYWNrYWdlLXJ1bm5lcicpO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNlcnZlclJ1bm5lckV2ZW50IHtcbiAgZmlsZTogc3RyaW5nO1xuICBmdW5jdGlvbk5hbWU6IHN0cmluZztcbn1cbmV4cG9ydCBjbGFzcyBTZXJ2ZXJSdW5uZXIge1xuICAvLyBwYWNrYWdlQ2FjaGU6IHtbc2hvcnROYW1lOiBzdHJpbmddOiBOb2RlUGFja2FnZX0gPSB7fTtcbiAgLy8gY29yZVBhY2thZ2VzOiB7W3Nob3J0TmFtZTogc3RyaW5nXTogTm9kZVBhY2thZ2V9ID0ge307XG4gIGRlYWN0aXZhdGVQYWNrYWdlczogTm9kZVBhY2thZ2VbXTtcblxuICBhc3luYyBzaHV0ZG93blNlcnZlcigpIHtcbiAgICBsb2cuaW5mbygnc2h1dHRpbmcgZG93bicpO1xuICAgIGF3YWl0IHRoaXMuX2RlYWN0aXZhdGVQYWNrYWdlcyh0aGlzLmRlYWN0aXZhdGVQYWNrYWdlcyk7XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgX2RlYWN0aXZhdGVQYWNrYWdlcyhjb21wczogTm9kZVBhY2thZ2VbXSkge1xuICAgIGZvciAoY29uc3QgY29tcCBvZiBjb21wcykge1xuICAgICAgY29uc3QgZXhwID0gcmVxdWlyZShjb21wLmxvbmdOYW1lKTtcbiAgICAgIGlmIChfLmlzRnVuY3Rpb24oZXhwLmRlYWN0aXZhdGUpKSB7XG4gICAgICAgIGxvZy5pbmZvKCdkZWFjdGl2YXRlJywgY29tcC5sb25nTmFtZSk7XG4gICAgICAgIGF3YWl0IFByb21pc2UucmVzb2x2ZShleHAuZGVhY3RpdmF0ZSgpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuY29uc3QgYXBpQ2FjaGU6IHtbbmFtZTogc3RyaW5nXTogYW55fSA9IHt9O1xuLy8gY29uc3QgcGFja2FnZVRyZWUgPSBuZXcgRGlyVHJlZTxQYWNrYWdlQnJvd3Nlckluc3RhbmNlPigpO1xuY29uc3QgbGF6eVBhY2thZ2VGYWN0b3J5ID0gbmV3IExhenlQYWNrYWdlRmFjdG9yeSgpO1xuXG4vKipcbiAqIExhemlseSBpbml0IGluamVjdG9yIGZvciBwYWNrYWdlcyBhbmQgcnVuIHNwZWNpZmljIHBhY2thZ2Ugb25seSxcbiAqIG5vIGZ1bGx5IHNjYW5uaW5nIG9yIG9yZGVyaW5nIG9uIGFsbCBwYWNrYWdlc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuU2luZ2xlUGFja2FnZShhcmd2OiB7dGFyZ2V0OiBzdHJpbmcsIGFyZ3VtZW50czogc3RyaW5nW10sIFtrZXk6IHN0cmluZ106IGFueX0pIHtcbiAgY29uc3QgTm9kZUFwaTogdHlwZW9mIF9Ob2RlQXBpID0gcmVxdWlyZSgnLi9wYWNrYWdlLW1nci9ub2RlLXBhY2thZ2UtYXBpJyk7XG4gIGNvbnN0IHByb3RvID0gTm9kZUFwaS5wcm90b3R5cGU7XG4gIHByb3RvLmFyZ3YgPSBhcmd2O1xuICBsZXQgcGFja2FnZUluZm86IFBhY2thZ2VJbmZvO1xuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90bywgJ3BhY2thZ2VJbmZvJywge1xuICAgIGdldCgpIHtcbiAgICAgIGlmIChwYWNrYWdlSW5mbyA9PSBudWxsKVxuICAgICAgICBwYWNrYWdlSW5mbyA9IHdhbGtQYWNrYWdlcyhjb25maWcsIHBhY2thZ2VVdGlscyk7XG4gICAgICByZXR1cm4gcGFja2FnZUluZm87XG4gICAgfVxuICB9KTtcbiAgY29uc3QgY2FjaGUgPSBuZXcgTFJVPHN0cmluZywgUGFja2FnZUJyb3dzZXJJbnN0YW5jZT4oe21heDogMjAsIG1heEFnZTogMjAwMDB9KTtcbiAgcHJvdG8uZmluZFBhY2thZ2VCeUZpbGUgPSBmdW5jdGlvbihmaWxlOiBzdHJpbmcpOiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlIHwgdW5kZWZpbmVkIHtcbiAgICBsZXQgZm91bmQgPSBjYWNoZS5nZXQoZmlsZSk7XG4gICAgaWYgKCFmb3VuZCkge1xuICAgICAgZm91bmQgPSBsYXp5UGFja2FnZUZhY3RvcnkuZ2V0UGFja2FnZUJ5UGF0aChmaWxlKSE7XG4gICAgICBpZiAoZm91bmQpXG4gICAgICAgIGNhY2hlLnNldChmaWxlLCBmb3VuZCk7XG4gICAgfVxuICAgIHJldHVybiBmb3VuZDtcbiAgfTtcbiAgcHJvdG8uZ2V0Tm9kZUFwaUZvclBhY2thZ2UgPSBmdW5jdGlvbihwYWNrYWdlSW5zdGFuY2U6IGFueSkge1xuICAgIHJldHVybiBnZXRBcGlGb3JQYWNrYWdlKHBhY2thZ2VJbnN0YW5jZSwgTm9kZUFwaSk7XG4gIH07XG4gIG5vZGVJbmplY3Rvci5mcm9tUm9vdCgpXG4gIC52YWx1ZSgnX19pbmplY3RvcicsIG5vZGVJbmplY3RvcilcbiAgLmZhY3RvcnkoJ19fYXBpJywgKHNvdXJjZUZpbGVQYXRoOiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCBwYWNrYWdlSW5zdGFuY2UgPSBwcm90by5maW5kUGFja2FnZUJ5RmlsZShzb3VyY2VGaWxlUGF0aCk7XG4gICAgcmV0dXJuIGdldEFwaUZvclBhY2thZ2UocGFja2FnZUluc3RhbmNlLCBOb2RlQXBpKTtcbiAgfSk7XG4gIC8vIGNvbnNvbGUubG9nKG5vZGVJbmplY3Rvci5kaXJUcmVlLnRyYXZlcnNlKCkpO1xuXG4gIGNvbnN0IFtmaWxlLCBmdW5jXSA9IGFyZ3YudGFyZ2V0LnNwbGl0KCcjJyk7XG4gIGNvbnN0IHBhY2thZ2VTY29wZXMgPSBjb25maWcoKS5wYWNrYWdlU2NvcGVzO1xuICBsZXQgZ3Vlc3NpbmdGaWxlID0gZmlsZTtcbiAgZm9yIChjb25zdCBzY29wZSBvZiBwYWNrYWdlU2NvcGVzKSB7XG4gICAgdHJ5IHtcbiAgICAgIHJlcXVpcmUucmVzb2x2ZShndWVzc2luZ0ZpbGUpO1xuICAgICAgYnJlYWs7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIGd1ZXNzaW5nRmlsZSA9IGBAJHtzY29wZX0vJHtmaWxlfWA7XG4gICAgfVxuICB9XG4gIGNvbnN0IF9leHBvcnRzID0gcmVxdWlyZShndWVzc2luZ0ZpbGUpO1xuICBpZiAoIV8uaGFzKF9leHBvcnRzLCBmdW5jKSkge1xuICAgIGxvZy5lcnJvcihgVGhlcmUgaXMgbm8gZXhwb3J0IGZ1bmN0aW9uOiAke2Z1bmN9LCBleGlzdGluZyBleHBvcnQgbWVtYmVycyBhcmU6XFxuYCArXG4gICAgYCR7T2JqZWN0LmtleXMoX2V4cG9ydHMpLmZpbHRlcihuYW1lID0+IHR5cGVvZiAoX2V4cG9ydHNbbmFtZV0pID09PSAnZnVuY3Rpb24nKS5tYXAobmFtZSA9PiBuYW1lICsgJygpJykuam9pbignXFxuJyl9YCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGF3YWl0IFByb21pc2UucmVzb2x2ZShfZXhwb3J0c1tmdW5jXS5hcHBseShnbG9iYWwsIGFyZ3YuYXJndW1lbnRzIHx8IFtdKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBydW5QYWNrYWdlcyhhcmd2OiB7dGFyZ2V0OiBzdHJpbmcsIHBhY2thZ2U6IHN0cmluZ1tdLCBba2V5OiBzdHJpbmddOiBhbnl9KSB7XG4gIC8vIGNvbnN0IE5vZGVBcGkgPSByZXF1aXJlKCcuLi9saWIvbm9kZUFwaScpO1xuICBjb25zdCBpbmNsdWRlTmFtZVNldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBhcmd2LnBhY2thZ2UuZm9yRWFjaChuYW1lID0+IGluY2x1ZGVOYW1lU2V0LmFkZChuYW1lKSk7XG4gIGNvbnN0IFtmaWxlVG9SdW4sIGZ1bmNUb1J1bl0gPSAoYXJndi50YXJnZXQgYXMgc3RyaW5nKS5zcGxpdCgnIycpO1xuICBjb25zdCBbcGFja2FnZXMsIHByb3RvXSA9IGluaXRJbmplY3RvckZvck5vZGVQYWNrYWdlcyhhcmd2KTtcbiAgY29uc3QgY29tcG9uZW50cyA9IHBhY2thZ2VzLmZpbHRlcihwayA9PiB7XG4gICAgLy8gc2V0dXBOb2RlSW5qZWN0b3JGb3IocGssIE5vZGVBcGkpOyAvLyBBbGwgY29tcG9uZW50IHBhY2thZ2Ugc2hvdWxkIGJlIGFibGUgdG8gYWNjZXNzICdfX2FwaScsIGV2ZW4gdGhleSBhcmUgbm90IGluY2x1ZGVkXG4gICAgaWYgKChpbmNsdWRlTmFtZVNldC5zaXplID09PSAwIHx8IGluY2x1ZGVOYW1lU2V0Lmhhcyhway5sb25nTmFtZSkgfHwgaW5jbHVkZU5hbWVTZXQuaGFzKHBrLnNob3J0TmFtZSkpICYmXG4gICAgICBway5kciAhPSBudWxsKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXF1aXJlLnJlc29sdmUocGsubG9uZ05hbWUgKyAnLycgKyBmaWxlVG9SdW4pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG4gIHJldHVybiBvcmRlclBhY2thZ2VzKGNvbXBvbmVudHMsIChwa0luc3RhbmNlOiBQYWNrYWdlSW5zdGFuY2UpICA9PiB7XG4gICAgY29uc3QgbW9kID0gcGtJbnN0YW5jZS5sb25nTmFtZSArICcvJyArIGZpbGVUb1J1bjtcbiAgICBsb2cuaW5mbygncmVxdWlyZSglcyknLCBKU09OLnN0cmluZ2lmeShtb2QpKTtcbiAgICBjb25zdCBmaWxlRXhwb3J0czogYW55ID0gcmVxdWlyZShtb2QpO1xuICAgIGlmIChfLmlzRnVuY3Rpb24oZmlsZUV4cG9ydHNbZnVuY1RvUnVuXSkpIHtcbiAgICAgIGxvZy5pbmZvKCdSdW4gJXMgJXMoKScsIG1vZCwgZnVuY1RvUnVuKTtcbiAgICAgIHJldHVybiBmaWxlRXhwb3J0c1tmdW5jVG9SdW5dKCk7XG4gICAgfVxuICB9KVxuICAudGhlbigoKSA9PiB7XG4gICAgKHByb3RvLmV2ZW50QnVzIGFzIEV2ZW50cykuZW1pdCgnZG9uZScsIHtmaWxlOiBmaWxlVG9SdW4sIGZ1bmN0aW9uTmFtZTogZnVuY1RvUnVufSBhcyBTZXJ2ZXJSdW5uZXJFdmVudCk7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaW5pdEluamVjdG9yRm9yTm9kZVBhY2thZ2VzKGFyZ3Y6IHtba2V5OiBzdHJpbmddOiBhbnl9KTpcbiAgW1BhY2thZ2VCcm93c2VySW5zdGFuY2VbXSwge2V2ZW50QnVzOiBFdmVudHN9XSB7XG4gIGNvbnN0IE5vZGVBcGk6IHR5cGVvZiBfTm9kZUFwaSA9IHJlcXVpcmUoJy4vcGFja2FnZS1tZ3Ivbm9kZS1wYWNrYWdlLWFwaScpO1xuICBjb25zdCBwcm90byA9IE5vZGVBcGkucHJvdG90eXBlO1xuICBwcm90by5hcmd2ID0gYXJndjtcbiAgY29uc3QgcGFja2FnZUluZm86IFBhY2thZ2VJbmZvID0gd2Fsa1BhY2thZ2VzKGNvbmZpZywgcGFja2FnZVV0aWxzKTtcbiAgcHJvdG8ucGFja2FnZUluZm8gPSBwYWNrYWdlSW5mbztcbiAgY29uc3QgY2FjaGUgPSBuZXcgTFJVPHN0cmluZywgUGFja2FnZUJyb3dzZXJJbnN0YW5jZT4oe21heDogMjAsIG1heEFnZTogMjAwMDB9KTtcbiAgcHJvdG8uZmluZFBhY2thZ2VCeUZpbGUgPSBmdW5jdGlvbihmaWxlOiBzdHJpbmcpOiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlIHwgdW5kZWZpbmVkIHtcbiAgICB2YXIgZm91bmQgPSBjYWNoZS5nZXQoZmlsZSk7XG4gICAgaWYgKCFmb3VuZCkge1xuICAgICAgZm91bmQgPSBwYWNrYWdlSW5mby5kaXJUcmVlLmdldEFsbERhdGEoZmlsZSkucG9wKCk7XG4gICAgICBpZiAoZm91bmQpXG4gICAgICAgIGNhY2hlLnNldChmaWxlLCBmb3VuZCk7XG4gICAgfVxuICAgIHJldHVybiBmb3VuZDtcbiAgfTtcbiAgcHJvdG8uZ2V0Tm9kZUFwaUZvclBhY2thZ2UgPSBmdW5jdGlvbihwYWNrYWdlSW5zdGFuY2U6IGFueSkge1xuICAgIHJldHVybiBnZXRBcGlGb3JQYWNrYWdlKHBhY2thZ2VJbnN0YW5jZSwgTm9kZUFwaSk7XG4gIH07XG4gIGNvbnN0IGRyUGFja2FnZXMgPSBwYWNrYWdlSW5mby5hbGxNb2R1bGVzLmZpbHRlcihwayA9PiB7XG4gICAgaWYgKHBrLmRyKSB7XG4gICAgICBzZXR1cE5vZGVJbmplY3RvckZvcihwaywgTm9kZUFwaSk7IC8vIEFsbCBjb21wb25lbnQgcGFja2FnZSBzaG91bGQgYmUgYWJsZSB0byBhY2Nlc3MgJ19fYXBpJywgZXZlbiB0aGV5IGFyZSBub3QgaW5jbHVkZWRcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xuICByZXR1cm4gW2RyUGFja2FnZXMsIHByb3RvXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGluaXRXZWJJbmplY3RvcihwYWNrYWdlczogUGFja2FnZUJyb3dzZXJJbnN0YW5jZVtdLCBhcGlQcm90b3R5cGU6IGFueSkge1xuICBfLmVhY2gocGFja2FnZXMsIHBhY2sgPT4ge1xuICAgIGlmIChwYWNrLmRyKSB7XG4gICAgICAvLyBubyB2ZW5kb3IgcGFja2FnZSdzIHBhdGggaW5mb3JtYXRpb25cbiAgICAgIHdlYkluamVjdG9yLmFkZFBhY2thZ2UocGFjay5sb25nTmFtZSwgcGFjay5wYWNrYWdlUGF0aCk7XG4gICAgfVxuICB9KTtcbiAgd2ViSW5qZWN0b3IuZnJvbUFsbFBhY2thZ2VzKClcbiAgLnJlcGxhY2VDb2RlKCdfX2FwaScsICdfX2FwaScpXG4gIC5zdWJzdGl0dXRlKC9eKFtee10qKVxce2xvY2FsZVxcfSguKikkLyxcbiAgICAoX2ZpbGVQYXRoOiBzdHJpbmcsIG1hdGNoOiBSZWdFeHBFeGVjQXJyYXkpID0+IG1hdGNoWzFdICsgYXBpUHJvdG90eXBlLmdldEJ1aWxkTG9jYWxlKCkgKyBtYXRjaFsyXSk7XG5cbiAgY29uc3QgZG9uZSA9IHdlYkluamVjdG9yLnJlYWRJbmplY3RGaWxlKCdtb2R1bGUtcmVzb2x2ZS5icm93c2VyJyk7XG4gIGFwaVByb3RvdHlwZS5icm93c2VySW5qZWN0b3IgPSB3ZWJJbmplY3RvcjtcbiAgcmV0dXJuIGRvbmU7XG59XG5cbmZ1bmN0aW9uIHNldHVwTm9kZUluamVjdG9yRm9yKHBrSW5zdGFuY2U6IFBhY2thZ2VCcm93c2VySW5zdGFuY2UsIE5vZGVBcGk6IHR5cGVvZiBfTm9kZUFwaSApIHtcbiAgZnVuY3Rpb24gYXBpRmFjdG9yeSgpIHtcbiAgICByZXR1cm4gZ2V0QXBpRm9yUGFja2FnZShwa0luc3RhbmNlLCBOb2RlQXBpKTtcbiAgfVxuICBub2RlSW5qZWN0b3IuZnJvbURpcihwa0luc3RhbmNlLnJlYWxQYWNrYWdlUGF0aClcbiAgLnZhbHVlKCdfX2luamVjdG9yJywgbm9kZUluamVjdG9yKVxuICAuZmFjdG9yeSgnX19hcGknLCBhcGlGYWN0b3J5KTtcbiAgbm9kZUluamVjdG9yLmZyb21EaXIocGtJbnN0YW5jZS5wYWNrYWdlUGF0aClcbiAgLnZhbHVlKCdfX2luamVjdG9yJywgbm9kZUluamVjdG9yKVxuICAuZmFjdG9yeSgnX19hcGknLCBhcGlGYWN0b3J5KTtcbiAgLy8gbm9kZUluamVjdG9yLmRlZmF1bHQgPSBub2RlSW5qZWN0b3I7IC8vIEZvciBFUzYgaW1wb3J0IHN5bnRheFxufVxuXG5mdW5jdGlvbiBnZXRBcGlGb3JQYWNrYWdlKHBrSW5zdGFuY2U6IGFueSwgTm9kZUFwaTogdHlwZW9mIF9Ob2RlQXBpKSB7XG4gIGlmIChfLmhhcyhhcGlDYWNoZSwgcGtJbnN0YW5jZS5sb25nTmFtZSkpIHtcbiAgICByZXR1cm4gYXBpQ2FjaGVbcGtJbnN0YW5jZS5sb25nTmFtZV07XG4gIH1cblxuICBjb25zdCBhcGkgPSBuZXcgTm9kZUFwaShwa0luc3RhbmNlLmxvbmdOYW1lLCBwa0luc3RhbmNlKTtcbiAgLy8gYXBpLmNvbnN0cnVjdG9yID0gTm9kZUFwaTtcbiAgcGtJbnN0YW5jZS5hcGkgPSBhcGk7XG4gIGFwaUNhY2hlW3BrSW5zdGFuY2UubG9uZ05hbWVdID0gYXBpO1xuICBhcGkuZGVmYXVsdCA9IGFwaTsgLy8gRm9yIEVTNiBpbXBvcnQgc3ludGF4XG4gIHJldHVybiBhcGk7XG59XG5cbiJdfQ==