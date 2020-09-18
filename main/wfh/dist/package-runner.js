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
exports.mapPackagesByType = exports.prepareLazyNodeInjector = exports.initWebInjector = exports.initInjectorForNodePackages = exports.runPackages = exports.runSinglePackage = exports.ServerRunner = void 0;
/* tslint:disable max-line-length */
const _ = __importStar(require("lodash"));
const lru_cache_1 = __importDefault(require("lru-cache"));
const ts_1 = require("./build-util/ts");
// const NodeApi = require('../lib/nodeApi');
// const {nodeInjector} = require('../lib/injectorFactory');
const injector_factory_1 = require("./injector-factory");
// import Package from './packageNodeInstance';
const package_priority_helper_1 = require("./package-priority-helper");
const packageNodeInstance_1 = __importDefault(require("./packageNodeInstance"));
const path_1 = __importDefault(require("path"));
const package_utils_1 = require("./package-utils");
const log4js_1 = __importDefault(require("log4js"));
const config_1 = __importDefault(require("./config"));
const log = log4js_1.default.getLogger('package-runner');
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
function runSinglePackage({ target, args }) {
    return __awaiter(this, void 0, void 0, function* () {
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
function runPackages(argv) {
    const includeNameSet = new Set();
    argv.package.forEach(name => includeNameSet.add(name));
    const [fileToRun, funcToRun] = argv.target.split('#');
    const [packages, proto] = initInjectorForNodePackages(argv, ts_1.walkPackages());
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
    injector_factory_1.webInjector.readInjectFile('module-resolve.browser');
    apiPrototype.browserInjector = injector_factory_1.webInjector;
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
                packageInfo = ts_1.walkPackages();
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
        return getApiForPackage(packageInstance, NodeApi);
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
    injector_factory_1.nodeInjector.fromDir(pkInstance.realPackagePath)
        .value('__injector', injector_factory_1.nodeInjector)
        .factory('__api', apiFactory);
    injector_factory_1.nodeInjector.fromDir(pkInstance.packagePath)
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
// export async function runServer() {
//   let packagesTypeMap;
//   // NodeApi.prototype.argv = argv;
//   // NodeApi.prototype.runBuilder = function(buildArgv, skipNames) {
//   //   _.assign(buildArgv, argv);
//   //   if (!Array.isArray(skipNames))
//   //     skipNames = [skipNames];
//   //   // var builders = _.filter(packagesTypeMap.builder, packageIns => !_.includes(excludeNames, packageIns.longName) );
//   //   return helper.runBuilderComponents(packagesTypeMap.builder, buildArgv, skipNames);
//   // };
//   packagesTypeMap = await requireServerPackages();
//   // deactivateOrder = [];
//   await activateCoreComponents();
//   await activateNormalComponents();
//   const newRunner = new ServerRunner();
//   deactivateOrder.reverse();
//   newRunner.deactivatePackages = deactivateOrder;
//   await new Promise(resolve => setTimeout(resolve, 500));
//   return () => {
//     return newRunner.shutdownServer();
//   };
// }
// function requireServerPackages(dontLoad) {
// 	return helper.traversePackages(!dontLoad)
// 	.then(packagesTypeMap => {
// 		// var proto = NodeApi.prototype;
// 		// proto.argv = argv;
// 		// create API instance and inject factories
// 		_.each(packagesTypeMap.server, (p, idx) => {
// 			if (!checkPackageName(p.scope, p.shortName, false)) {
// 				return;
// 			}
// 			if (_.includes([].concat(_.get(p, 'json.dr.type')), 'core')) {
// 				corePackages[p.shortName] = p;
// 			} else {
// 				packageCache[p.shortName] = p;
// 			}
// 			// if (!dontLoad)
// 			// 	p.exports = require(p.moduleName);
// 		});
// 		eventBus.emit('loadEnd', packageCache);
// 		return packagesTypeMap;
// 	});
// }
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wYWNrYWdlLXJ1bm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0NBQW9DO0FBQ3BDLDBDQUE0QjtBQUM1QiwwREFBNEI7QUFDNUIsd0NBQXVHO0FBQ3ZHLDZDQUE2QztBQUM3Qyw0REFBNEQ7QUFDNUQseURBQStEO0FBRS9ELCtDQUErQztBQUMvQyx1RUFBMkU7QUFDM0UsZ0ZBQWdEO0FBQ2hELGdEQUF3QjtBQUV4QixtREFBZ0Y7QUFDaEYsb0RBQTRCO0FBQzVCLHNEQUE4QjtBQUU5QixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBTS9DLE1BQWEsWUFBWTtJQUtqQixjQUFjOztZQUNsQixHQUFHLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQzFCLE1BQU0sSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQzFELENBQUM7S0FBQTtJQUVlLG1CQUFtQixDQUFDLEtBQW9COztZQUN0RCxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRTtnQkFDeEIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDbkMsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRTtvQkFDaEMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUN0QyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7aUJBQ3pDO2FBQ0Y7UUFDSCxDQUFDO0tBQUE7Q0FDRjtBQW5CRCxvQ0FtQkM7QUFFRCxNQUFNLFFBQVEsR0FBMEIs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VixxREFBcUQ7QUFDckQsNkJBQTZCO0FBQzdCLG9DQUFvQztBQUNwQyxzQ0FBc0M7QUFDdEMsMENBQTBDO0FBQzFDLCtCQUErQjtBQUMvQixvREFBb0Q7QUFDcEQsNERBQTREO0FBQzVELG1CQUFtQjtBQUNuQix5Q0FBeUM7QUFDekMsT0FBTztBQUNQLElBQUk7QUFFSiw2Q0FBNkM7QUFDN0MsNkNBQTZDO0FBQzdDLDhCQUE4QjtBQUM5QixzQ0FBc0M7QUFDdEMsMEJBQTBCO0FBRTFCLGdEQUFnRDtBQUVoRCxpREFBaUQ7QUFDakQsMkRBQTJEO0FBQzNELGNBQWM7QUFDZCxPQUFPO0FBQ1Asb0VBQW9FO0FBQ3BFLHFDQUFxQztBQUNyQyxjQUFjO0FBQ2QscUNBQXFDO0FBQ3JDLE9BQU87QUFDUCx1QkFBdUI7QUFDdkIsNENBQTRDO0FBQzVDLFFBQVE7QUFDUiw0Q0FBNEM7QUFDNUMsNEJBQTRCO0FBQzVCLE9BQU87QUFDUCxJQUFJIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbWF4LWxpbmUtbGVuZ3RoICovXG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgTFJVIGZyb20gJ2xydS1jYWNoZSc7XG5pbXBvcnQgeyBQYWNrYWdlSW5mbywgcGFja2FnZUluc3RhbmNlIGFzIFBhY2thZ2VCcm93c2VySW5zdGFuY2UsIHdhbGtQYWNrYWdlcyB9IGZyb20gJy4vYnVpbGQtdXRpbC90cyc7XG4vLyBjb25zdCBOb2RlQXBpID0gcmVxdWlyZSgnLi4vbGliL25vZGVBcGknKTtcbi8vIGNvbnN0IHtub2RlSW5qZWN0b3J9ID0gcmVxdWlyZSgnLi4vbGliL2luamVjdG9yRmFjdG9yeScpO1xuaW1wb3J0IHsgbm9kZUluamVjdG9yLCB3ZWJJbmplY3RvciB9IGZyb20gJy4vaW5qZWN0b3ItZmFjdG9yeSc7XG5pbXBvcnQgX05vZGVBcGkgZnJvbSAnLi9wYWNrYWdlLW1nci9ub2RlLXBhY2thZ2UtYXBpJztcbi8vIGltcG9ydCBQYWNrYWdlIGZyb20gJy4vcGFja2FnZU5vZGVJbnN0YW5jZSc7XG5pbXBvcnQgeyBvcmRlclBhY2thZ2VzLCBQYWNrYWdlSW5zdGFuY2UgfSBmcm9tICcuL3BhY2thZ2UtcHJpb3JpdHktaGVscGVyJztcbmltcG9ydCBOb2RlUGFja2FnZSBmcm9tICcuL3BhY2thZ2VOb2RlSW5zdGFuY2UnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgRXZlbnRzIGZyb20gJ2V2ZW50cyc7XG5pbXBvcnQge2NyZWF0ZUxhenlQYWNrYWdlRmlsZUZpbmRlciwgcGFja2FnZXM0V29ya3NwYWNlfSBmcm9tICcuL3BhY2thZ2UtdXRpbHMnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IGNvbmZpZyBmcm9tICcuL2NvbmZpZyc7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BhY2thZ2UtcnVubmVyJyk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VydmVyUnVubmVyRXZlbnQge1xuICBmaWxlOiBzdHJpbmc7XG4gIGZ1bmN0aW9uTmFtZTogc3RyaW5nO1xufVxuZXhwb3J0IGNsYXNzIFNlcnZlclJ1bm5lciB7XG4gIC8vIHBhY2thZ2VDYWNoZToge1tzaG9ydE5hbWU6IHN0cmluZ106IE5vZGVQYWNrYWdlfSA9IHt9O1xuICAvLyBjb3JlUGFja2FnZXM6IHtbc2hvcnROYW1lOiBzdHJpbmddOiBOb2RlUGFja2FnZX0gPSB7fTtcbiAgZGVhY3RpdmF0ZVBhY2thZ2VzOiBOb2RlUGFja2FnZVtdO1xuXG4gIGFzeW5jIHNodXRkb3duU2VydmVyKCkge1xuICAgIGxvZy5pbmZvKCdzaHV0dGluZyBkb3duJyk7XG4gICAgYXdhaXQgdGhpcy5fZGVhY3RpdmF0ZVBhY2thZ2VzKHRoaXMuZGVhY3RpdmF0ZVBhY2thZ2VzKTtcbiAgfVxuXG4gIHByb3RlY3RlZCBhc3luYyBfZGVhY3RpdmF0ZVBhY2thZ2VzKGNvbXBzOiBOb2RlUGFja2FnZVtdKSB7XG4gICAgZm9yIChjb25zdCBjb21wIG9mIGNvbXBzKSB7XG4gICAgICBjb25zdCBleHAgPSByZXF1aXJlKGNvbXAubG9uZ05hbWUpO1xuICAgICAgaWYgKF8uaXNGdW5jdGlvbihleHAuZGVhY3RpdmF0ZSkpIHtcbiAgICAgICAgbG9nLmluZm8oJ2RlYWN0aXZhdGUnLCBjb21wLmxvbmdOYW1lKTtcbiAgICAgICAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKGV4cC5kZWFjdGl2YXRlKCkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5jb25zdCBhcGlDYWNoZToge1tuYW1lOiBzdHJpbmddOiBhbnl9ID0ge307XG4vLyBjb25zdCBwYWNrYWdlVHJlZSA9IG5ldyBEaXJUcmVlPFBhY2thZ2VCcm93c2VySW5zdGFuY2U+KCk7XG5cbi8qKlxuICogTGF6aWx5IGluaXQgaW5qZWN0b3IgZm9yIHBhY2thZ2VzIGFuZCBydW4gc3BlY2lmaWMgcGFja2FnZSBvbmx5LFxuICogbm8gZnVsbHkgc2Nhbm5pbmcgb3Igb3JkZXJpbmcgb24gYWxsIHBhY2thZ2VzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5TaW5nbGVQYWNrYWdlKHt0YXJnZXQsIGFyZ3N9OiB7dGFyZ2V0OiBzdHJpbmcsIGFyZ3M6IHN0cmluZ1tdfSkge1xuICBjb25zdCBwYXNzaW5Bcmd2ID0ge307XG4gIC8vIGNvbnNvbGUubG9nKGFyZ3MpO1xuICAvLyB0aHJvdyBuZXcgRXJyb3IoJ3N0b3AnKTtcbiAgZm9yIChsZXQgaSA9IDAsIGwgPSBhcmdzLmxlbmd0aDsgaSA8IGw7IGkrKykge1xuICAgIGNvbnN0IGtleSA9IGFyZ3NbaV07XG4gICAgaWYgKGtleS5zdGFydHNXaXRoKCctJykpIHtcbiAgICAgIGlmIChpID09PSBhcmdzLmxlbmd0aCAtIDEgfHwgYXJnc1tpICsgMV0uc3RhcnRzV2l0aCgnLScpKSB7XG4gICAgICAgIHBhc3NpbkFyZ3ZbXy50cmltU3RhcnQoa2V5LCAnLScpXSA9IHRydWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwYXNzaW5Bcmd2W2tleV0gPSBhcmdzW2kgKyAxXTtcbiAgICAgICAgaSsrO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBwcmVwYXJlTGF6eU5vZGVJbmplY3RvcihwYXNzaW5Bcmd2KTtcbiAgY29uc3QgW2ZpbGUsIGZ1bmNdID0gdGFyZ2V0LnNwbGl0KCcjJyk7XG5cbiAgY29uc3QgZ3Vlc3NpbmdGaWxlOiBzdHJpbmdbXSA9IFtcbiAgICBmaWxlLFxuICAgIFBhdGgucmVzb2x2ZShmaWxlKSxcbiAgICAuLi4oY29uZmlnKCkucGFja2FnZVNjb3BlcyBhcyBzdHJpbmdbXSkubWFwKHNjb3BlID0+IGBAJHtzY29wZX0vJHtmaWxlfWApXG4gIF07XG4gIGNvbnN0IGZvdW5kTW9kdWxlID0gZ3Vlc3NpbmdGaWxlLmZpbmQodGFyZ2V0ID0+IHtcbiAgICB0cnkge1xuICAgICAgcmVxdWlyZS5yZXNvbHZlKHRhcmdldCk7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGNhdGNoIChleCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgfSk7XG5cbiAgaWYgKCFmb3VuZE1vZHVsZSkge1xuICAgIHRocm93IG5ldyBFcnJvcihgQ291bGQgbm90IGZpbmQgdGFyZ2V0IG1vZHVsZSBmcm9tIHBhdGhzIGxpa2U6XFxuJHtndWVzc2luZ0ZpbGUuam9pbignXFxuJyl9YCk7XG4gIH1cbiAgY29uc3QgX2V4cG9ydHMgPSByZXF1aXJlKGZvdW5kTW9kdWxlKTtcbiAgaWYgKCFfLmhhcyhfZXhwb3J0cywgZnVuYykpIHtcbiAgICBsb2cuZXJyb3IoYFRoZXJlIGlzIG5vIGV4cG9ydCBmdW5jdGlvbjogJHtmdW5jfSwgZXhpc3RpbmcgZXhwb3J0IG1lbWJlcnMgYXJlOlxcbmAgK1xuICAgIGAke09iamVjdC5rZXlzKF9leHBvcnRzKS5maWx0ZXIobmFtZSA9PiB0eXBlb2YgKF9leHBvcnRzW25hbWVdKSA9PT0gJ2Z1bmN0aW9uJykubWFwKG5hbWUgPT4gbmFtZSArICcoKScpLmpvaW4oJ1xcbicpfWApO1xuICAgIHJldHVybjtcbiAgfVxuICBhd2FpdCBQcm9taXNlLnJlc29sdmUoX2V4cG9ydHNbZnVuY10uYXBwbHkoZ2xvYmFsLCBhcmdzIHx8IFtdKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBydW5QYWNrYWdlcyhhcmd2OiB7dGFyZ2V0OiBzdHJpbmcsIHBhY2thZ2U6IHN0cmluZ1tdLCBba2V5OiBzdHJpbmddOiBhbnl9KSB7XG4gIGNvbnN0IGluY2x1ZGVOYW1lU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGFyZ3YucGFja2FnZS5mb3JFYWNoKG5hbWUgPT4gaW5jbHVkZU5hbWVTZXQuYWRkKG5hbWUpKTtcbiAgY29uc3QgW2ZpbGVUb1J1biwgZnVuY1RvUnVuXSA9IChhcmd2LnRhcmdldCBhcyBzdHJpbmcpLnNwbGl0KCcjJyk7XG4gIGNvbnN0IFtwYWNrYWdlcywgcHJvdG9dID0gaW5pdEluamVjdG9yRm9yTm9kZVBhY2thZ2VzKGFyZ3YsIHdhbGtQYWNrYWdlcygpKTtcbiAgY29uc3QgY29tcG9uZW50cyA9IHBhY2thZ2VzLmZpbHRlcihwayA9PiB7XG4gICAgLy8gc2V0dXBOb2RlSW5qZWN0b3JGb3IocGssIE5vZGVBcGkpOyAvLyBBbGwgY29tcG9uZW50IHBhY2thZ2Ugc2hvdWxkIGJlIGFibGUgdG8gYWNjZXNzICdfX2FwaScsIGV2ZW4gdGhleSBhcmUgbm90IGluY2x1ZGVkXG4gICAgaWYgKChpbmNsdWRlTmFtZVNldC5zaXplID09PSAwIHx8IGluY2x1ZGVOYW1lU2V0Lmhhcyhway5sb25nTmFtZSkgfHwgaW5jbHVkZU5hbWVTZXQuaGFzKHBrLnNob3J0TmFtZSkpICYmXG4gICAgICBway5kciAhPSBudWxsKSB7XG4gICAgICB0cnkge1xuICAgICAgICByZXF1aXJlLnJlc29sdmUocGsubG9uZ05hbWUgKyAnLycgKyBmaWxlVG9SdW4pO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG4gIHJldHVybiBvcmRlclBhY2thZ2VzKGNvbXBvbmVudHMsIChwa0luc3RhbmNlOiBQYWNrYWdlSW5zdGFuY2UpICA9PiB7XG4gICAgY29uc3QgbW9kID0gcGtJbnN0YW5jZS5sb25nTmFtZSArICcvJyArIGZpbGVUb1J1bjtcbiAgICBsb2cuaW5mbygncmVxdWlyZSglcyknLCBKU09OLnN0cmluZ2lmeShtb2QpKTtcbiAgICBjb25zdCBmaWxlRXhwb3J0czogYW55ID0gcmVxdWlyZShtb2QpO1xuICAgIGlmIChfLmlzRnVuY3Rpb24oZmlsZUV4cG9ydHNbZnVuY1RvUnVuXSkpIHtcbiAgICAgIGxvZy5pbmZvKCdSdW4gJXMgJXMoKScsIG1vZCwgZnVuY1RvUnVuKTtcbiAgICAgIHJldHVybiBmaWxlRXhwb3J0c1tmdW5jVG9SdW5dKCk7XG4gICAgfVxuICB9KVxuICAudGhlbigoKSA9PiB7XG4gICAgKHByb3RvLmV2ZW50QnVzIGFzIEV2ZW50cy5FdmVudEVtaXR0ZXIpLmVtaXQoJ2RvbmUnLCB7ZmlsZTogZmlsZVRvUnVuLCBmdW5jdGlvbk5hbWU6IGZ1bmNUb1J1bn0gYXMgU2VydmVyUnVubmVyRXZlbnQpO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGluaXRJbmplY3RvckZvck5vZGVQYWNrYWdlcyhhcmd2OiB7W2tleTogc3RyaW5nXTogYW55fSwgcGFja2FnZUluZm86IFBhY2thZ2VJbmZvKTpcbiAgW1BhY2thZ2VCcm93c2VySW5zdGFuY2VbXSwgX05vZGVBcGldIHtcbiAgY29uc3QgTm9kZUFwaTogdHlwZW9mIF9Ob2RlQXBpID0gcmVxdWlyZSgnLi9wYWNrYWdlLW1nci9ub2RlLXBhY2thZ2UtYXBpJyk7XG4gIGNvbnN0IHByb3RvID0gTm9kZUFwaS5wcm90b3R5cGU7XG4gIHByb3RvLmFyZ3YgPSBhcmd2O1xuICAvLyBjb25zdCBwYWNrYWdlSW5mbzogUGFja2FnZUluZm8gPSB3YWxrUGFja2FnZXMoY29uZmlnLCBwYWNrYWdlVXRpbHMpO1xuICBwcm90by5wYWNrYWdlSW5mbyA9IHBhY2thZ2VJbmZvO1xuICBjb25zdCBjYWNoZSA9IG5ldyBMUlU8c3RyaW5nLCBQYWNrYWdlQnJvd3Nlckluc3RhbmNlPih7bWF4OiAyMCwgbWF4QWdlOiAyMDAwMH0pO1xuICBwcm90by5maW5kUGFja2FnZUJ5RmlsZSA9IGZ1bmN0aW9uKGZpbGU6IHN0cmluZyk6IFBhY2thZ2VCcm93c2VySW5zdGFuY2UgfCB1bmRlZmluZWQge1xuICAgIHZhciBmb3VuZCA9IGNhY2hlLmdldChmaWxlKTtcbiAgICBpZiAoIWZvdW5kKSB7XG4gICAgICBmb3VuZCA9IHBhY2thZ2VJbmZvLmRpclRyZWUuZ2V0QWxsRGF0YShmaWxlKS5wb3AoKTtcbiAgICAgIGlmIChmb3VuZClcbiAgICAgICAgY2FjaGUuc2V0KGZpbGUsIGZvdW5kKTtcbiAgICB9XG4gICAgcmV0dXJuIGZvdW5kO1xuICB9O1xuICBwcm90by5nZXROb2RlQXBpRm9yUGFja2FnZSA9IGZ1bmN0aW9uKHBhY2thZ2VJbnN0YW5jZTogYW55KSB7XG4gICAgcmV0dXJuIGdldEFwaUZvclBhY2thZ2UocGFja2FnZUluc3RhbmNlLCBOb2RlQXBpKTtcbiAgfTtcbiAgY29uc3QgZHJQYWNrYWdlcyA9IHBhY2thZ2VJbmZvLmFsbE1vZHVsZXMuZmlsdGVyKHBrID0+IHtcbiAgICBpZiAocGsuZHIpIHtcbiAgICAgIHNldHVwTm9kZUluamVjdG9yRm9yKHBrLCBOb2RlQXBpKTsgLy8gQWxsIGNvbXBvbmVudCBwYWNrYWdlIHNob3VsZCBiZSBhYmxlIHRvIGFjY2VzcyAnX19hcGknLCBldmVuIHRoZXkgYXJlIG5vdCBpbmNsdWRlZFxuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG4gIHJldHVybiBbZHJQYWNrYWdlcywgcHJvdG9dO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaW5pdFdlYkluamVjdG9yKHBhY2thZ2VzOiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlW10sIGFwaVByb3RvdHlwZTogYW55KSB7XG4gIF8uZWFjaChwYWNrYWdlcywgcGFjayA9PiB7XG4gICAgaWYgKHBhY2suZHIpIHtcbiAgICAgIC8vIG5vIHZlbmRvciBwYWNrYWdlJ3MgcGF0aCBpbmZvcm1hdGlvblxuICAgICAgd2ViSW5qZWN0b3IuYWRkUGFja2FnZShwYWNrLmxvbmdOYW1lLCBwYWNrLnBhY2thZ2VQYXRoKTtcbiAgICB9XG4gIH0pO1xuICB3ZWJJbmplY3Rvci5mcm9tQWxsUGFja2FnZXMoKVxuICAucmVwbGFjZUNvZGUoJ19fYXBpJywgJ19fYXBpJylcbiAgLnN1YnN0aXR1dGUoL14oW157XSopXFx7bG9jYWxlXFx9KC4qKSQvLFxuICAgIChfZmlsZVBhdGg6IHN0cmluZywgbWF0Y2g6IFJlZ0V4cEV4ZWNBcnJheSkgPT4gbWF0Y2hbMV0gKyBhcGlQcm90b3R5cGUuZ2V0QnVpbGRMb2NhbGUoKSArIG1hdGNoWzJdKTtcblxuICB3ZWJJbmplY3Rvci5yZWFkSW5qZWN0RmlsZSgnbW9kdWxlLXJlc29sdmUuYnJvd3NlcicpO1xuICBhcGlQcm90b3R5cGUuYnJvd3NlckluamVjdG9yID0gd2ViSW5qZWN0b3I7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwcmVwYXJlTGF6eU5vZGVJbmplY3Rvcihhcmd2OiB7W2tleTogc3RyaW5nXTogYW55fSkge1xuICBjb25zdCBOb2RlQXBpOiB0eXBlb2YgX05vZGVBcGkgPSByZXF1aXJlKCcuL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGknKTtcbiAgY29uc3QgcHJvdG8gPSBOb2RlQXBpLnByb3RvdHlwZTtcbiAgcHJvdG8uYXJndiA9IGFyZ3Y7XG4gIGxldCBwYWNrYWdlSW5mbzogUGFja2FnZUluZm87XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCAncGFja2FnZUluZm8nLCB7XG4gICAgZ2V0KCkge1xuICAgICAgaWYgKHBhY2thZ2VJbmZvID09IG51bGwpXG4gICAgICAgIHBhY2thZ2VJbmZvID0gd2Fsa1BhY2thZ2VzKCk7XG4gICAgICByZXR1cm4gcGFja2FnZUluZm87XG4gICAgfVxuICB9KTtcbiAgcHJvdG8uZmluZFBhY2thZ2VCeUZpbGUgPSBjcmVhdGVMYXp5UGFja2FnZUZpbGVGaW5kZXIoKTtcbiAgcHJvdG8uZ2V0Tm9kZUFwaUZvclBhY2thZ2UgPSBmdW5jdGlvbihwYWNrYWdlSW5zdGFuY2U6IGFueSkge1xuICAgIHJldHVybiBnZXRBcGlGb3JQYWNrYWdlKHBhY2thZ2VJbnN0YW5jZSwgTm9kZUFwaSk7XG4gIH07XG4gIG5vZGVJbmplY3Rvci5mcm9tUm9vdCgpXG4gIC8vIC5hbGlhcygnbG9nNGpzJywgUGF0aC5yZXNvbHZlKGNvbmZpZygpLnJvb3RQYXRoLCAnbm9kZV9tb2R1bGVzL2xvZzRqcycpKVxuICAudmFsdWUoJ19faW5qZWN0b3InLCBub2RlSW5qZWN0b3IpXG4gIC5mYWN0b3J5KCdfX2FwaScsIChzb3VyY2VGaWxlUGF0aDogc3RyaW5nKSA9PiB7XG4gICAgY29uc3QgcGFja2FnZUluc3RhbmNlID0gcHJvdG8uZmluZFBhY2thZ2VCeUZpbGUoc291cmNlRmlsZVBhdGgpO1xuICAgIHJldHVybiBnZXRBcGlGb3JQYWNrYWdlKHBhY2thZ2VJbnN0YW5jZSwgTm9kZUFwaSk7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWFwUGFja2FnZXNCeVR5cGUodHlwZXM6IHN0cmluZ1tdLCBvbkVhY2hQYWNrYWdlOiAobm9kZVBhY2thZ2U6IE5vZGVQYWNrYWdlKSA9PiB2b2lkKSB7XG4gIGNvbnN0IHBhY2thZ2VzTWFwOiB7W3R5cGU6IHN0cmluZ106IE5vZGVQYWNrYWdlW119ID0ge307XG4gIHR5cGVzLmZvckVhY2godHlwZSA9PiB7XG4gICAgcGFja2FnZXNNYXBbdHlwZV0gPSBbXTtcbiAgfSk7XG5cbiAgZm9yIChjb25zdCBwa2cgb2YgcGFja2FnZXM0V29ya3NwYWNlKCkpIHtcbiAgICBjb25zdCBuYW1lID0gcGtnLm5hbWU7XG4gICAgY29uc3QgcGtJbnN0YW5jZSA9IG5ldyBOb2RlUGFja2FnZSh7XG4gICAgICBtb2R1bGVOYW1lOiBuYW1lLFxuICAgICAgc2hvcnROYW1lOiBwa2cuc2hvcnROYW1lLFxuICAgICAgbmFtZSxcbiAgICAgIGxvbmdOYW1lOiBuYW1lLFxuICAgICAgc2NvcGU6IHBrZy5zY29wZSxcbiAgICAgIHBhdGg6IHBrZy5wYXRoLFxuICAgICAganNvbjogcGtnLmpzb24sXG4gICAgICByZWFsUGF0aDogcGtnLnJlYWxQYXRoXG4gICAgfSk7XG4gICAgY29uc3QgZHJUeXBlcyA9IChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KF8uZ2V0KHBrZywgJ2pzb24uZHIudHlwZScpKTtcbiAgICBmb3IgKGNvbnN0IHR5cGUgb2YgdHlwZXMpIHtcbiAgICAgIGlmICghXy5pbmNsdWRlcyhkclR5cGVzLCB0eXBlKSlcbiAgICAgICAgY29udGludWU7XG4gICAgICBwYWNrYWdlc01hcFt0eXBlXS5wdXNoKHBrSW5zdGFuY2UpO1xuICAgIH1cbiAgICBpZiAob25FYWNoUGFja2FnZSkge1xuICAgICAgb25FYWNoUGFja2FnZShwa0luc3RhbmNlKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHBhY2thZ2VzTWFwO1xufVxuXG5mdW5jdGlvbiBzZXR1cE5vZGVJbmplY3RvckZvcihwa0luc3RhbmNlOiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlLCBOb2RlQXBpOiB0eXBlb2YgX05vZGVBcGkgKSB7XG4gIGZ1bmN0aW9uIGFwaUZhY3RvcnkoKSB7XG4gICAgcmV0dXJuIGdldEFwaUZvclBhY2thZ2UocGtJbnN0YW5jZSwgTm9kZUFwaSk7XG4gIH1cbiAgbm9kZUluamVjdG9yLmZyb21EaXIocGtJbnN0YW5jZS5yZWFsUGFja2FnZVBhdGgpXG4gIC52YWx1ZSgnX19pbmplY3RvcicsIG5vZGVJbmplY3RvcilcbiAgLmZhY3RvcnkoJ19fYXBpJywgYXBpRmFjdG9yeSk7XG4gIG5vZGVJbmplY3Rvci5mcm9tRGlyKHBrSW5zdGFuY2UucGFja2FnZVBhdGgpXG4gIC52YWx1ZSgnX19pbmplY3RvcicsIG5vZGVJbmplY3RvcilcbiAgLmZhY3RvcnkoJ19fYXBpJywgYXBpRmFjdG9yeSk7XG59XG5cbmZ1bmN0aW9uIGdldEFwaUZvclBhY2thZ2UocGtJbnN0YW5jZTogYW55LCBOb2RlQXBpOiB0eXBlb2YgX05vZGVBcGkpIHtcbiAgaWYgKF8uaGFzKGFwaUNhY2hlLCBwa0luc3RhbmNlLmxvbmdOYW1lKSkge1xuICAgIHJldHVybiBhcGlDYWNoZVtwa0luc3RhbmNlLmxvbmdOYW1lXTtcbiAgfVxuXG4gIGNvbnN0IGFwaSA9IG5ldyBOb2RlQXBpKHBrSW5zdGFuY2UubG9uZ05hbWUsIHBrSW5zdGFuY2UpO1xuICAvLyBhcGkuY29uc3RydWN0b3IgPSBOb2RlQXBpO1xuICBwa0luc3RhbmNlLmFwaSA9IGFwaTtcbiAgYXBpQ2FjaGVbcGtJbnN0YW5jZS5sb25nTmFtZV0gPSBhcGk7XG4gIGFwaS5kZWZhdWx0ID0gYXBpOyAvLyBGb3IgRVM2IGltcG9ydCBzeW50YXhcbiAgcmV0dXJuIGFwaTtcbn1cblxuLy8gZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJ1blNlcnZlcigpIHtcbi8vICAgbGV0IHBhY2thZ2VzVHlwZU1hcDtcbi8vICAgLy8gTm9kZUFwaS5wcm90b3R5cGUuYXJndiA9IGFyZ3Y7XG4vLyAgIC8vIE5vZGVBcGkucHJvdG90eXBlLnJ1bkJ1aWxkZXIgPSBmdW5jdGlvbihidWlsZEFyZ3YsIHNraXBOYW1lcykge1xuLy8gICAvLyAgIF8uYXNzaWduKGJ1aWxkQXJndiwgYXJndik7XG4vLyAgIC8vICAgaWYgKCFBcnJheS5pc0FycmF5KHNraXBOYW1lcykpXG4vLyAgIC8vICAgICBza2lwTmFtZXMgPSBbc2tpcE5hbWVzXTtcbi8vICAgLy8gICAvLyB2YXIgYnVpbGRlcnMgPSBfLmZpbHRlcihwYWNrYWdlc1R5cGVNYXAuYnVpbGRlciwgcGFja2FnZUlucyA9PiAhXy5pbmNsdWRlcyhleGNsdWRlTmFtZXMsIHBhY2thZ2VJbnMubG9uZ05hbWUpICk7XG5cbi8vICAgLy8gICByZXR1cm4gaGVscGVyLnJ1bkJ1aWxkZXJDb21wb25lbnRzKHBhY2thZ2VzVHlwZU1hcC5idWlsZGVyLCBidWlsZEFyZ3YsIHNraXBOYW1lcyk7XG4vLyAgIC8vIH07XG5cbi8vICAgcGFja2FnZXNUeXBlTWFwID0gYXdhaXQgcmVxdWlyZVNlcnZlclBhY2thZ2VzKCk7XG4vLyAgIC8vIGRlYWN0aXZhdGVPcmRlciA9IFtdO1xuLy8gICBhd2FpdCBhY3RpdmF0ZUNvcmVDb21wb25lbnRzKCk7XG4vLyAgIGF3YWl0IGFjdGl2YXRlTm9ybWFsQ29tcG9uZW50cygpO1xuLy8gICBjb25zdCBuZXdSdW5uZXIgPSBuZXcgU2VydmVyUnVubmVyKCk7XG4vLyAgIGRlYWN0aXZhdGVPcmRlci5yZXZlcnNlKCk7XG4vLyAgIG5ld1J1bm5lci5kZWFjdGl2YXRlUGFja2FnZXMgPSBkZWFjdGl2YXRlT3JkZXI7XG4vLyAgIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCA1MDApKTtcbi8vICAgcmV0dXJuICgpID0+IHtcbi8vICAgICByZXR1cm4gbmV3UnVubmVyLnNodXRkb3duU2VydmVyKCk7XG4vLyAgIH07XG4vLyB9XG5cbi8vIGZ1bmN0aW9uIHJlcXVpcmVTZXJ2ZXJQYWNrYWdlcyhkb250TG9hZCkge1xuLy8gXHRyZXR1cm4gaGVscGVyLnRyYXZlcnNlUGFja2FnZXMoIWRvbnRMb2FkKVxuLy8gXHQudGhlbihwYWNrYWdlc1R5cGVNYXAgPT4ge1xuLy8gXHRcdC8vIHZhciBwcm90byA9IE5vZGVBcGkucHJvdG90eXBlO1xuLy8gXHRcdC8vIHByb3RvLmFyZ3YgPSBhcmd2O1xuXG4vLyBcdFx0Ly8gY3JlYXRlIEFQSSBpbnN0YW5jZSBhbmQgaW5qZWN0IGZhY3Rvcmllc1xuXG4vLyBcdFx0Xy5lYWNoKHBhY2thZ2VzVHlwZU1hcC5zZXJ2ZXIsIChwLCBpZHgpID0+IHtcbi8vIFx0XHRcdGlmICghY2hlY2tQYWNrYWdlTmFtZShwLnNjb3BlLCBwLnNob3J0TmFtZSwgZmFsc2UpKSB7XG4vLyBcdFx0XHRcdHJldHVybjtcbi8vIFx0XHRcdH1cbi8vIFx0XHRcdGlmIChfLmluY2x1ZGVzKFtdLmNvbmNhdChfLmdldChwLCAnanNvbi5kci50eXBlJykpLCAnY29yZScpKSB7XG4vLyBcdFx0XHRcdGNvcmVQYWNrYWdlc1twLnNob3J0TmFtZV0gPSBwO1xuLy8gXHRcdFx0fSBlbHNlIHtcbi8vIFx0XHRcdFx0cGFja2FnZUNhY2hlW3Auc2hvcnROYW1lXSA9IHA7XG4vLyBcdFx0XHR9XG4vLyBcdFx0XHQvLyBpZiAoIWRvbnRMb2FkKVxuLy8gXHRcdFx0Ly8gXHRwLmV4cG9ydHMgPSByZXF1aXJlKHAubW9kdWxlTmFtZSk7XG4vLyBcdFx0fSk7XG4vLyBcdFx0ZXZlbnRCdXMuZW1pdCgnbG9hZEVuZCcsIHBhY2thZ2VDYWNoZSk7XG4vLyBcdFx0cmV0dXJuIHBhY2thZ2VzVHlwZU1hcDtcbi8vIFx0fSk7XG4vLyB9XG5cbiJdfQ==