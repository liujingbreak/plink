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
        const guessingFile = [file];
        if (!file.startsWith('.')) {
            let foundModule = false;
            for (const scope of config().packageScopes) {
                guessingFile.push(`@${scope}/${file}`);
                try {
                    require.resolve(guessingFile[guessingFile.length - 1]);
                    foundModule = true;
                    break;
                }
                catch (ex) { }
            }
            if (!foundModule) {
                guessingFile.push(path_1.default.resolve(file));
                try {
                    require.resolve(guessingFile[guessingFile.length - 1]);
                    foundModule = true;
                }
                catch (ex) {
                }
            }
            if (!foundModule) {
                throw new Error(`Could not find target module from paths like:\n${guessingFile.join('\n')}`);
            }
        }
        const _exports = require(guessingFile[guessingFile.length - 1]);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wYWNrYWdlLXJ1bm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG9DQUFvQztBQUNwQywwQ0FBNEI7QUFDNUIsMERBQTRCO0FBQzVCLHdDQUEySDtBQUMzSCw2Q0FBNkM7QUFDN0MsNERBQTREO0FBQzVELHlEQUErRDtBQUUvRCwrQ0FBK0M7QUFDL0MsdUVBQTJFO0FBRzNFLGdEQUF3QjtBQUV4QixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDeEMsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLGdDQUFnQyxDQUFDLENBQUM7QUFFL0QsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBTTFELE1BQWEsWUFBWTtJQUtqQixjQUFjOztZQUNsQixHQUFHLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQzFCLE1BQU0sSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQzFELENBQUM7S0FBQTtJQUVlLG1CQUFtQixDQUFDLEtBQW9COztZQUN0RCxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRTtnQkFDeEIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDbkMsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRTtvQkFDaEMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUN0QyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7aUJBQ3pDO2FBQ0Y7UUFDSCxDQUFDO0tB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LENBQUMsUUFBUSxDQUFDLEdBQUcsR0FBRyxDQUFDO0lBQ3BDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLENBQUMsd0JBQXdCO0lBQzNDLE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIHRzbGludDpkaXNhYmxlIG1heC1saW5lLWxlbmd0aCAqL1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IExSVSBmcm9tICdscnUtY2FjaGUnO1xuaW1wb3J0IHsgTGF6eVBhY2thZ2VGYWN0b3J5LCBQYWNrYWdlSW5mbywgcGFja2FnZUluc3RhbmNlIGFzIFBhY2thZ2VCcm93c2VySW5zdGFuY2UsIHdhbGtQYWNrYWdlcyB9IGZyb20gJy4vYnVpbGQtdXRpbC90cyc7XG4vLyBjb25zdCBOb2RlQXBpID0gcmVxdWlyZSgnLi4vbGliL25vZGVBcGknKTtcbi8vIGNvbnN0IHtub2RlSW5qZWN0b3J9ID0gcmVxdWlyZSgnLi4vbGliL2luamVjdG9yRmFjdG9yeScpO1xuaW1wb3J0IHsgbm9kZUluamVjdG9yLCB3ZWJJbmplY3RvciB9IGZyb20gJy4vaW5qZWN0b3ItZmFjdG9yeSc7XG5pbXBvcnQgX05vZGVBcGkgZnJvbSAnLi9wYWNrYWdlLW1nci9ub2RlLXBhY2thZ2UtYXBpJztcbi8vIGltcG9ydCBQYWNrYWdlIGZyb20gJy4vcGFja2FnZU5vZGVJbnN0YW5jZSc7XG5pbXBvcnQgeyBvcmRlclBhY2thZ2VzLCBQYWNrYWdlSW5zdGFuY2UgfSBmcm9tICcuL3BhY2thZ2UtcHJpb3JpdHktaGVscGVyJztcbmltcG9ydCBOb2RlUGFja2FnZSBmcm9tICcuL3BhY2thZ2VOb2RlSW5zdGFuY2UnO1xuaW1wb3J0IEV2ZW50cyA9IHJlcXVpcmUoJ2V2ZW50cycpO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5cbmNvbnN0IGNvbmZpZyA9IHJlcXVpcmUoJy4uL2xpYi9jb25maWcnKTtcbmNvbnN0IHBhY2thZ2VVdGlscyA9IHJlcXVpcmUoJy4uL2xpYi9wYWNrYWdlTWdyL3BhY2thZ2VVdGlscycpO1xuXG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ3BhY2thZ2UtcnVubmVyJyk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VydmVyUnVubmVyRXZlbnQge1xuICBmaWxlOiBzdHJpbmc7XG4gIGZ1bmN0aW9uTmFtZTogc3RyaW5nO1xufVxuZXhwb3J0IGNsYXNzIFNlcnZlclJ1bm5lciB7XG4gIC8vIHBhY2thZ2VDYWNoZToge1tzaG9ydE5hbWU6IHN0cmluZ106IE5vZGVQYWNrYWdlfSA9IHt9O1xuICAvLyBjb3JlUGFja2FnZXM6IHtbc2hvcnROYW1lOiBzdHJpbmddOiBOb2RlUGFja2FnZX0gPSB7fTtcbiAgZGVhY3RpdmF0ZVBhY2thZ2VzOiBOb2RlUGFja2FnZVtdO1xuXG4gIGFzeW5jIHNodXRkb3duU2VydmVyKCkge1xuICAgIGxvZy5pbmZvKCdzaHV0dGluZyBkb3duJyk7XG4gICAgYXdhaXQgdGhpcy5fZGVhY3RpdmF0ZVBhY2thZ2VzKHRoaXMuZGVhY3RpdmF0ZVBhY2thZ2VzKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBfZGVhY3RpdmF0ZVBhY2thZ2VzKGNvbXBzOiBOb2RlUGFja2FnZVtdKSB7XG4gICAgZm9yIChjb25zdCBjb21wIG9mIGNvbXBzKSB7XG4gICAgICBjb25zdCBleHAgPSByZXF1aXJlKGNvbXAubG9uZ05hbWUpO1xuICAgICAgaWYgKF8uaXNGdW5jdGlvbihleHAuZGVhY3RpdmF0ZSkpIHtcbiAgICAgICAgbG9nLmluZm8oJ2RlYWN0aXZhdGUnLCBjb21wLmxvbmdOYW1lKTtcbiAgICAgICAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKGV4cC5kZWFjdGl2YXRlKCkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5jb25zdCBhcGlDYWNoZToge1tuYW1lOiBzdHJpbmddOiBhbnl9ID0ge307XG4vLyBjb25zdCBwYWNrYWdlVHJlZSA9IG5ldyBEaXJUcmVlPFBhY2thZ2VCcm93c2VySW5zdGFuY2U+KCk7XG5jb25zdCBsYXp5UGFja2FnZUZhY3RvcnkgPSBuZXcgTGF6eVBhY2thZ2VGYWN0b3J5KCk7XG5cbi8qKlxuICogTGF6aWx5IGluaXQgaW5qZWN0b3IgZm9yIHBhY2thZ2VzIGFuZCBydW4gc3BlY2lmaWMgcGFja2FnZSBvbmx5LFxuICogbm8gZnVsbHkgc2Nhbm5pbmcgb3Igb3JkZXJpbmcgb24gYWxsIHBhY2thZ2VzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5TaW5nbGVQYWNrYWdlKGFyZ3Y6IHt0YXJnZXQ6IHN0cmluZywgYXJndW1lbnRzOiBzdHJpbmdbXSwgW2tleTogc3RyaW5nXTogYW55fSkge1xuICBjb25zdCBOb2RlQXBpOiB0eXBlb2YgX05vZGVBcGkgPSByZXF1aXJlKCcuL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGknKTtcbiAgY29uc3QgcHJvdG8gPSBOb2RlQXBpLnByb3RvdHlwZTtcbiAgcHJvdG8uYXJndiA9IGFyZ3Y7XG4gIGxldCBwYWNrYWdlSW5mbzogUGFja2FnZUluZm87XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCAncGFja2FnZUluZm8nLCB7XG4gICAgZ2V0KCkge1xuICAgICAgaWYgKHBhY2thZ2VJbmZvID09IG51bGwpXG4gICAgICAgIHBhY2thZ2VJbmZvID0gd2Fsa1BhY2thZ2VzKGNvbmZpZywgcGFja2FnZVV0aWxzKTtcbiAgICAgIHJldHVybiBwYWNrYWdlSW5mbztcbiAgICB9XG4gIH0pO1xuICBjb25zdCBjYWNoZSA9IG5ldyBMUlU8c3RyaW5nLCBQYWNrYWdlQnJvd3Nlckluc3RhbmNlPih7bWF4OiAyMCwgbWF4QWdlOiAyMDAwMH0pO1xuICBwcm90by5maW5kUGFja2FnZUJ5RmlsZSA9IGZ1bmN0aW9uKGZpbGU6IHN0cmluZyk6IFBhY2thZ2VCcm93c2VySW5zdGFuY2UgfCB1bmRlZmluZWQge1xuICAgIGxldCBmb3VuZCA9IGNhY2hlLmdldChmaWxlKTtcbiAgICBpZiAoIWZvdW5kKSB7XG4gICAgICBmb3VuZCA9IGxhenlQYWNrYWdlRmFjdG9yeS5nZXRQYWNrYWdlQnlQYXRoKGZpbGUpITtcbiAgICAgIGlmIChmb3VuZClcbiAgICAgICAgY2FjaGUuc2V0KGZpbGUsIGZvdW5kKTtcbiAgICB9XG4gICAgcmV0dXJuIGZvdW5kO1xuICB9O1xuICBwcm90by5nZXROb2RlQXBpRm9yUGFja2FnZSA9IGZ1bmN0aW9uKHBhY2thZ2VJbnN0YW5jZTogYW55KSB7XG4gICAgcmV0dXJuIGdldEFwaUZvclBhY2thZ2UocGFja2FnZUluc3RhbmNlLCBOb2RlQXBpKTtcbiAgfTtcbiAgbm9kZUluamVjdG9yLmZyb21Sb290KClcbiAgLnZhbHVlKCdfX2luamVjdG9yJywgbm9kZUluamVjdG9yKVxuICAuZmFjdG9yeSgnX19hcGknLCAoc291cmNlRmlsZVBhdGg6IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IHBhY2thZ2VJbnN0YW5jZSA9IHByb3RvLmZpbmRQYWNrYWdlQnlGaWxlKHNvdXJjZUZpbGVQYXRoKTtcbiAgICByZXR1cm4gZ2V0QXBpRm9yUGFja2FnZShwYWNrYWdlSW5zdGFuY2UsIE5vZGVBcGkpO1xuICB9KTtcbiAgLy8gY29uc29sZS5sb2cobm9kZUluamVjdG9yLmRpclRyZWUudHJhdmVyc2UoKSk7XG5cbiAgY29uc3QgW2ZpbGUsIGZ1bmNdID0gYXJndi50YXJnZXQuc3BsaXQoJyMnKTtcbiAgY29uc3QgZ3Vlc3NpbmdGaWxlOiBzdHJpbmdbXSA9IFtmaWxlXTtcbiAgaWYgKCFmaWxlLnN0YXJ0c1dpdGgoJy4nKSkge1xuICAgIGxldCBmb3VuZE1vZHVsZSA9IGZhbHNlO1xuICAgIGZvciAoY29uc3Qgc2NvcGUgb2YgY29uZmlnKCkucGFja2FnZVNjb3Blcykge1xuICAgICAgZ3Vlc3NpbmdGaWxlLnB1c2goYEAke3Njb3BlfS8ke2ZpbGV9YCk7XG4gICAgICB0cnkge1xuICAgICAgICByZXF1aXJlLnJlc29sdmUoZ3Vlc3NpbmdGaWxlW2d1ZXNzaW5nRmlsZS5sZW5ndGggLSAxXSk7XG4gICAgICAgIGZvdW5kTW9kdWxlID0gdHJ1ZTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9IGNhdGNoIChleCkge31cbiAgICB9XG4gICAgaWYgKCFmb3VuZE1vZHVsZSkge1xuICAgICAgZ3Vlc3NpbmdGaWxlLnB1c2goUGF0aC5yZXNvbHZlKGZpbGUpKTtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlcXVpcmUucmVzb2x2ZShndWVzc2luZ0ZpbGVbZ3Vlc3NpbmdGaWxlLmxlbmd0aCAtIDFdKTtcbiAgICAgICAgZm91bmRNb2R1bGUgPSB0cnVlO1xuICAgICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKCFmb3VuZE1vZHVsZSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCB0YXJnZXQgbW9kdWxlIGZyb20gcGF0aHMgbGlrZTpcXG4ke2d1ZXNzaW5nRmlsZS5qb2luKCdcXG4nKX1gKTtcbiAgICB9XG4gIH1cbiAgY29uc3QgX2V4cG9ydHMgPSByZXF1aXJlKGd1ZXNzaW5nRmlsZVtndWVzc2luZ0ZpbGUubGVuZ3RoIC0gMV0pO1xuICBpZiAoIV8uaGFzKF9leHBvcnRzLCBmdW5jKSkge1xuICAgIGxvZy5lcnJvcihgVGhlcmUgaXMgbm8gZXhwb3J0IGZ1bmN0aW9uOiAke2Z1bmN9LCBleGlzdGluZyBleHBvcnQgbWVtYmVycyBhcmU6XFxuYCArXG4gICAgYCR7T2JqZWN0LmtleXMoX2V4cG9ydHMpLmZpbHRlcihuYW1lID0+IHR5cGVvZiAoX2V4cG9ydHNbbmFtZV0pID09PSAnZnVuY3Rpb24nKS5tYXAobmFtZSA9PiBuYW1lICsgJygpJykuam9pbignXFxuJyl9YCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGF3YWl0IFByb21pc2UucmVzb2x2ZShfZXhwb3J0c1tmdW5jXS5hcHBseShnbG9iYWwsIGFyZ3YuXy5zbGljZSgxKSB8fCBbXSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcnVuUGFja2FnZXMoYXJndjoge3RhcmdldDogc3RyaW5nLCBwYWNrYWdlOiBzdHJpbmdbXSwgW2tleTogc3RyaW5nXTogYW55fSkge1xuICAvLyBjb25zdCBOb2RlQXBpID0gcmVxdWlyZSgnLi4vbGliL25vZGVBcGknKTtcbiAgY29uc3QgaW5jbHVkZU5hbWVTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgYXJndi5wYWNrYWdlLmZvckVhY2gobmFtZSA9PiBpbmNsdWRlTmFtZVNldC5hZGQobmFtZSkpO1xuICBjb25zdCBbZmlsZVRvUnVuLCBmdW5jVG9SdW5dID0gKGFyZ3YudGFyZ2V0IGFzIHN0cmluZykuc3BsaXQoJyMnKTtcbiAgY29uc3QgW3BhY2thZ2VzLCBwcm90b10gPSBpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMoYXJndik7XG4gIGNvbnN0IGNvbXBvbmVudHMgPSBwYWNrYWdlcy5maWx0ZXIocGsgPT4ge1xuICAgIC8vIHNldHVwTm9kZUluamVjdG9yRm9yKHBrLCBOb2RlQXBpKTsgLy8gQWxsIGNvbXBvbmVudCBwYWNrYWdlIHNob3VsZCBiZSBhYmxlIHRvIGFjY2VzcyAnX19hcGknLCBldmVuIHRoZXkgYXJlIG5vdCBpbmNsdWRlZFxuICAgIGlmICgoaW5jbHVkZU5hbWVTZXQuc2l6ZSA9PT0gMCB8fCBpbmNsdWRlTmFtZVNldC5oYXMocGsubG9uZ05hbWUpIHx8IGluY2x1ZGVOYW1lU2V0Lmhhcyhway5zaG9ydE5hbWUpKSAmJlxuICAgICAgcGsuZHIgIT0gbnVsbCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVxdWlyZS5yZXNvbHZlKHBrLmxvbmdOYW1lICsgJy8nICsgZmlsZVRvUnVuKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xuICByZXR1cm4gb3JkZXJQYWNrYWdlcyhjb21wb25lbnRzLCAocGtJbnN0YW5jZTogUGFja2FnZUluc3RhbmNlKSAgPT4ge1xuICAgIGNvbnN0IG1vZCA9IHBrSW5zdGFuY2UubG9uZ05hbWUgKyAnLycgKyBmaWxlVG9SdW47XG4gICAgbG9nLmluZm8oJ3JlcXVpcmUoJXMpJywgSlNPTi5zdHJpbmdpZnkobW9kKSk7XG4gICAgY29uc3QgZmlsZUV4cG9ydHM6IGFueSA9IHJlcXVpcmUobW9kKTtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGZpbGVFeHBvcnRzW2Z1bmNUb1J1bl0pKSB7XG4gICAgICBsb2cuaW5mbygnUnVuICVzICVzKCknLCBtb2QsIGZ1bmNUb1J1bik7XG4gICAgICByZXR1cm4gZmlsZUV4cG9ydHNbZnVuY1RvUnVuXSgpO1xuICAgIH1cbiAgfSlcbiAgLnRoZW4oKCkgPT4ge1xuICAgIChwcm90by5ldmVudEJ1cyBhcyBFdmVudHMpLmVtaXQoJ2RvbmUnLCB7ZmlsZTogZmlsZVRvUnVuLCBmdW5jdGlvbk5hbWU6IGZ1bmNUb1J1bn0gYXMgU2VydmVyUnVubmVyRXZlbnQpO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGluaXRJbmplY3RvckZvck5vZGVQYWNrYWdlcyhhcmd2OiB7W2tleTogc3RyaW5nXTogYW55fSk6XG4gIFtQYWNrYWdlQnJvd3Nlckluc3RhbmNlW10sIHtldmVudEJ1czogRXZlbnRzfV0ge1xuICBjb25zdCBOb2RlQXBpOiB0eXBlb2YgX05vZGVBcGkgPSByZXF1aXJlKCcuL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGknKTtcbiAgY29uc3QgcHJvdG8gPSBOb2RlQXBpLnByb3RvdHlwZTtcbiAgcHJvdG8uYXJndiA9IGFyZ3Y7XG4gIGNvbnN0IHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbyA9IHdhbGtQYWNrYWdlcyhjb25maWcsIHBhY2thZ2VVdGlscyk7XG4gIHByb3RvLnBhY2thZ2VJbmZvID0gcGFja2FnZUluZm87XG4gIGNvbnN0IGNhY2hlID0gbmV3IExSVTxzdHJpbmcsIFBhY2thZ2VCcm93c2VySW5zdGFuY2U+KHttYXg6IDIwLCBtYXhBZ2U6IDIwMDAwfSk7XG4gIHByb3RvLmZpbmRQYWNrYWdlQnlGaWxlID0gZnVuY3Rpb24oZmlsZTogc3RyaW5nKTogUGFja2FnZUJyb3dzZXJJbnN0YW5jZSB8IHVuZGVmaW5lZCB7XG4gICAgdmFyIGZvdW5kID0gY2FjaGUuZ2V0KGZpbGUpO1xuICAgIGlmICghZm91bmQpIHtcbiAgICAgIGZvdW5kID0gcGFja2FnZUluZm8uZGlyVHJlZS5nZXRBbGxEYXRhKGZpbGUpLnBvcCgpO1xuICAgICAgaWYgKGZvdW5kKVxuICAgICAgICBjYWNoZS5zZXQoZmlsZSwgZm91bmQpO1xuICAgIH1cbiAgICByZXR1cm4gZm91bmQ7XG4gIH07XG4gIHByb3RvLmdldE5vZGVBcGlGb3JQYWNrYWdlID0gZnVuY3Rpb24ocGFja2FnZUluc3RhbmNlOiBhbnkpIHtcbiAgICByZXR1cm4gZ2V0QXBpRm9yUGFja2FnZShwYWNrYWdlSW5zdGFuY2UsIE5vZGVBcGkpO1xuICB9O1xuICBjb25zdCBkclBhY2thZ2VzID0gcGFja2FnZUluZm8uYWxsTW9kdWxlcy5maWx0ZXIocGsgPT4ge1xuICAgIGlmIChway5kcikge1xuICAgICAgc2V0dXBOb2RlSW5qZWN0b3JGb3IocGssIE5vZGVBcGkpOyAvLyBBbGwgY29tcG9uZW50IHBhY2thZ2Ugc2hvdWxkIGJlIGFibGUgdG8gYWNjZXNzICdfX2FwaScsIGV2ZW4gdGhleSBhcmUgbm90IGluY2x1ZGVkXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcbiAgcmV0dXJuIFtkclBhY2thZ2VzLCBwcm90b107XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbml0V2ViSW5qZWN0b3IocGFja2FnZXM6IFBhY2thZ2VCcm93c2VySW5zdGFuY2VbXSwgYXBpUHJvdG90eXBlOiBhbnkpIHtcbiAgXy5lYWNoKHBhY2thZ2VzLCBwYWNrID0+IHtcbiAgICBpZiAocGFjay5kcikge1xuICAgICAgLy8gbm8gdmVuZG9yIHBhY2thZ2UncyBwYXRoIGluZm9ybWF0aW9uXG4gICAgICB3ZWJJbmplY3Rvci5hZGRQYWNrYWdlKHBhY2subG9uZ05hbWUsIHBhY2sucGFja2FnZVBhdGgpO1xuICAgIH1cbiAgfSk7XG4gIHdlYkluamVjdG9yLmZyb21BbGxQYWNrYWdlcygpXG4gIC5yZXBsYWNlQ29kZSgnX19hcGknLCAnX19hcGknKVxuICAuc3Vic3RpdHV0ZSgvXihbXntdKilcXHtsb2NhbGVcXH0oLiopJC8sXG4gICAgKF9maWxlUGF0aDogc3RyaW5nLCBtYXRjaDogUmVnRXhwRXhlY0FycmF5KSA9PiBtYXRjaFsxXSArIGFwaVByb3RvdHlwZS5nZXRCdWlsZExvY2FsZSgpICsgbWF0Y2hbMl0pO1xuXG4gIGNvbnN0IGRvbmUgPSB3ZWJJbmplY3Rvci5yZWFkSW5qZWN0RmlsZSgnbW9kdWxlLXJlc29sdmUuYnJvd3NlcicpO1xuICBhcGlQcm90b3R5cGUuYnJvd3NlckluamVjdG9yID0gd2ViSW5qZWN0b3I7XG4gIHJldHVybiBkb25lO1xufVxuXG5mdW5jdGlvbiBzZXR1cE5vZGVJbmplY3RvckZvcihwa0luc3RhbmNlOiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlLCBOb2RlQXBpOiB0eXBlb2YgX05vZGVBcGkgKSB7XG4gIGZ1bmN0aW9uIGFwaUZhY3RvcnkoKSB7XG4gICAgcmV0dXJuIGdldEFwaUZvclBhY2thZ2UocGtJbnN0YW5jZSwgTm9kZUFwaSk7XG4gIH1cbiAgbm9kZUluamVjdG9yLmZyb21EaXIocGtJbnN0YW5jZS5yZWFsUGFja2FnZVBhdGgpXG4gIC52YWx1ZSgnX19pbmplY3RvcicsIG5vZGVJbmplY3RvcilcbiAgLmZhY3RvcnkoJ19fYXBpJywgYXBpRmFjdG9yeSk7XG4gIG5vZGVJbmplY3Rvci5mcm9tRGlyKHBrSW5zdGFuY2UucGFja2FnZVBhdGgpXG4gIC52YWx1ZSgnX19pbmplY3RvcicsIG5vZGVJbmplY3RvcilcbiAgLmZhY3RvcnkoJ19fYXBpJywgYXBpRmFjdG9yeSk7XG4gIC8vIG5vZGVJbmplY3Rvci5kZWZhdWx0ID0gbm9kZUluamVjdG9yOyAvLyBGb3IgRVM2IGltcG9ydCBzeW50YXhcbn1cblxuZnVuY3Rpb24gZ2V0QXBpRm9yUGFja2FnZShwa0luc3RhbmNlOiBhbnksIE5vZGVBcGk6IHR5cGVvZiBfTm9kZUFwaSkge1xuICBpZiAoXy5oYXMoYXBpQ2FjaGUsIHBrSW5zdGFuY2UubG9uZ05hbWUpKSB7XG4gICAgcmV0dXJuIGFwaUNhY2hlW3BrSW5zdGFuY2UubG9uZ05hbWVdO1xuICB9XG5cbiAgY29uc3QgYXBpID0gbmV3IE5vZGVBcGkocGtJbnN0YW5jZS5sb25nTmFtZSwgcGtJbnN0YW5jZSk7XG4gIC8vIGFwaS5jb25zdHJ1Y3RvciA9IE5vZGVBcGk7XG4gIHBrSW5zdGFuY2UuYXBpID0gYXBpO1xuICBhcGlDYWNoZVtwa0luc3RhbmNlLmxvbmdOYW1lXSA9IGFwaTtcbiAgYXBpLmRlZmF1bHQgPSBhcGk7IC8vIEZvciBFUzYgaW1wb3J0IHN5bnRheFxuICByZXR1cm4gYXBpO1xufVxuXG4iXX0=