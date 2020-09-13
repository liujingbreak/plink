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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi90cy9wYWNrYWdlLXJ1bm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsb0NBQW9DO0FBQ3BDLDBDQUE0QjtBQUM1QiwwREFBNEI7QUFDNUIsd0NBQXVHO0FBQ3ZHLDZDQUE2QztBQUM3Qyw0REFBNEQ7QUFDNUQseURBQStEO0FBRS9ELCtDQUErQztBQUMvQyx1RUFBMkU7QUFDM0UsZ0ZBQWdEO0FBQ2hELGdEQUF3QjtBQUV4QixtREFBZ0Y7QUFDaEYsb0RBQTRCO0FBQzVCLHNEQUE4QjtBQUU5QixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBTS9DLE1BQWEsWUFBWTtJQUtqQixjQUFjOztZQUNsQixHQUFHLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQzFCLE1BQU0sSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQzFELENBQUM7S0FBQTtJQUVlLG1CQUFtQixDQUFDLEtBQW9COztZQUN0RCxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRTtnQkFDeEIsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDbkMsSUFBSSxDQUFDLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsRUFBRTtvQkFDaEMsR0FBRyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO29CQUN0QyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUM7aUJBQ3pDO2FBQ0Y7UUFDSCxDQUFDO0tBQUE7Q0FDRjtBQW5CRCxvQ0FtQkM7QUFFRCxNQUFNLFFBQVEs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O0FBQ3BDLDZIQUE2SDtBQUU3SCw0RkFBNEY7QUFDNUYsVUFBVTtBQUVWLHFEQUFxRDtBQUNyRCw2QkFBNkI7QUFDN0Isb0NBQW9DO0FBQ3BDLHNDQUFzQztBQUN0QywwQ0FBMEM7QUFDMUMsK0JBQStCO0FBQy9CLG9EQUFvRDtBQUNwRCw0REFBNEQ7QUFDNUQsbUJBQW1CO0FBQ25CLHlDQUF5QztBQUN6QyxPQUFPO0FBQ1AsSUFBSTtBQUVKLDZDQUE2QztBQUM3Qyw2Q0FBNkM7QUFDN0MsOEJBQThCO0FBQzlCLHNDQUFzQztBQUN0QywwQkFBMEI7QUFFMUIsZ0RBQWdEO0FBRWhELGlEQUFpRDtBQUNqRCwyREFBMkQ7QUFDM0QsY0FBYztBQUNkLE9BQU87QUFDUCxvRUFBb0U7QUFDcEUscUNBQXFDO0FBQ3JDLGNBQWM7QUFDZCxxQ0FBcUM7QUFDckMsT0FBTztBQUNQLHVCQUF1QjtBQUN2Qiw0Q0FBNEM7QUFDNUMsUUFBUTtBQUNSLDRDQUE0QztBQUM1Qyw0QkFBNEI7QUFDNUIsT0FBTztBQUNQLElBQUkiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBtYXgtbGluZS1sZW5ndGggKi9cbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBMUlUgZnJvbSAnbHJ1LWNhY2hlJztcbmltcG9ydCB7IFBhY2thZ2VJbmZvLCBwYWNrYWdlSW5zdGFuY2UgYXMgUGFja2FnZUJyb3dzZXJJbnN0YW5jZSwgd2Fsa1BhY2thZ2VzIH0gZnJvbSAnLi9idWlsZC11dGlsL3RzJztcbi8vIGNvbnN0IE5vZGVBcGkgPSByZXF1aXJlKCcuLi9saWIvbm9kZUFwaScpO1xuLy8gY29uc3Qge25vZGVJbmplY3Rvcn0gPSByZXF1aXJlKCcuLi9saWIvaW5qZWN0b3JGYWN0b3J5Jyk7XG5pbXBvcnQgeyBub2RlSW5qZWN0b3IsIHdlYkluamVjdG9yIH0gZnJvbSAnLi9pbmplY3Rvci1mYWN0b3J5JztcbmltcG9ydCBfTm9kZUFwaSBmcm9tICcuL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGknO1xuLy8gaW1wb3J0IFBhY2thZ2UgZnJvbSAnLi9wYWNrYWdlTm9kZUluc3RhbmNlJztcbmltcG9ydCB7IG9yZGVyUGFja2FnZXMsIFBhY2thZ2VJbnN0YW5jZSB9IGZyb20gJy4vcGFja2FnZS1wcmlvcml0eS1oZWxwZXInO1xuaW1wb3J0IE5vZGVQYWNrYWdlIGZyb20gJy4vcGFja2FnZU5vZGVJbnN0YW5jZSc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBFdmVudHMgZnJvbSAnZXZlbnRzJztcbmltcG9ydCB7Y3JlYXRlTGF6eVBhY2thZ2VGaWxlRmluZGVyLCBwYWNrYWdlczRXb3Jrc3BhY2V9IGZyb20gJy4vcGFja2FnZS11dGlscyc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgY29uZmlnIGZyb20gJy4vY29uZmlnJztcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGFja2FnZS1ydW5uZXInKTtcblxuZXhwb3J0IGludGVyZmFjZSBTZXJ2ZXJSdW5uZXJFdmVudCB7XG4gIGZpbGU6IHN0cmluZztcbiAgZnVuY3Rpb25OYW1lOiBzdHJpbmc7XG59XG5leHBvcnQgY2xhc3MgU2VydmVyUnVubmVyIHtcbiAgLy8gcGFja2FnZUNhY2hlOiB7W3Nob3J0TmFtZTogc3RyaW5nXTogTm9kZVBhY2thZ2V9ID0ge307XG4gIC8vIGNvcmVQYWNrYWdlczoge1tzaG9ydE5hbWU6IHN0cmluZ106IE5vZGVQYWNrYWdlfSA9IHt9O1xuICBkZWFjdGl2YXRlUGFja2FnZXM6IE5vZGVQYWNrYWdlW107XG5cbiAgYXN5bmMgc2h1dGRvd25TZXJ2ZXIoKSB7XG4gICAgbG9nLmluZm8oJ3NodXR0aW5nIGRvd24nKTtcbiAgICBhd2FpdCB0aGlzLl9kZWFjdGl2YXRlUGFja2FnZXModGhpcy5kZWFjdGl2YXRlUGFja2FnZXMpO1xuICB9XG5cbiAgcHJvdGVjdGVkIGFzeW5jIF9kZWFjdGl2YXRlUGFja2FnZXMoY29tcHM6IE5vZGVQYWNrYWdlW10pIHtcbiAgICBmb3IgKGNvbnN0IGNvbXAgb2YgY29tcHMpIHtcbiAgICAgIGNvbnN0IGV4cCA9IHJlcXVpcmUoY29tcC5sb25nTmFtZSk7XG4gICAgICBpZiAoXy5pc0Z1bmN0aW9uKGV4cC5kZWFjdGl2YXRlKSkge1xuICAgICAgICBsb2cuaW5mbygnZGVhY3RpdmF0ZScsIGNvbXAubG9uZ05hbWUpO1xuICAgICAgICBhd2FpdCBQcm9taXNlLnJlc29sdmUoZXhwLmRlYWN0aXZhdGUoKSk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmNvbnN0IGFwaUNhY2hlOiB7W25hbWU6IHN0cmluZ106IGFueX0gPSB7fTtcbi8vIGNvbnN0IHBhY2thZ2VUcmVlID0gbmV3IERpclRyZWU8UGFja2FnZUJyb3dzZXJJbnN0YW5jZT4oKTtcblxuLyoqXG4gKiBMYXppbHkgaW5pdCBpbmplY3RvciBmb3IgcGFja2FnZXMgYW5kIHJ1biBzcGVjaWZpYyBwYWNrYWdlIG9ubHksXG4gKiBubyBmdWxseSBzY2FubmluZyBvciBvcmRlcmluZyBvbiBhbGwgcGFja2FnZXNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJ1blNpbmdsZVBhY2thZ2Uoe3RhcmdldCwgYXJnc306IHt0YXJnZXQ6IHN0cmluZywgYXJnczogc3RyaW5nW119KSB7XG4gIGNvbnN0IHBhc3NpbkFyZ3YgPSB7fTtcbiAgLy8gY29uc29sZS5sb2coYXJncyk7XG4gIC8vIHRocm93IG5ldyBFcnJvcignc3RvcCcpO1xuICBmb3IgKGxldCBpID0gMCwgbCA9IGFyZ3MubGVuZ3RoOyBpIDwgbDsgaSsrKSB7XG4gICAgY29uc3Qga2V5ID0gYXJnc1tpXTtcbiAgICBpZiAoa2V5LnN0YXJ0c1dpdGgoJy0nKSkge1xuICAgICAgaWYgKGkgPT09IGFyZ3MubGVuZ3RoIC0gMSB8fCBhcmdzW2kgKyAxXS5zdGFydHNXaXRoKCctJykpIHtcbiAgICAgICAgcGFzc2luQXJndltfLnRyaW1TdGFydChrZXksICctJyldID0gdHJ1ZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHBhc3NpbkFyZ3Zba2V5XSA9IGFyZ3NbaSArIDFdO1xuICAgICAgICBpKys7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHByZXBhcmVMYXp5Tm9kZUluamVjdG9yKHBhc3NpbkFyZ3YpO1xuICBjb25zdCBbZmlsZSwgZnVuY10gPSB0YXJnZXQuc3BsaXQoJyMnKTtcblxuICBjb25zdCBndWVzc2luZ0ZpbGU6IHN0cmluZ1tdID0gW1xuICAgIGZpbGUsXG4gICAgUGF0aC5yZXNvbHZlKGZpbGUpLFxuICAgIC4uLihjb25maWcoKS5wYWNrYWdlU2NvcGVzIGFzIHN0cmluZ1tdKS5tYXAoc2NvcGUgPT4gYEAke3Njb3BlfS8ke2ZpbGV9YClcbiAgXTtcbiAgY29uc3QgZm91bmRNb2R1bGUgPSBndWVzc2luZ0ZpbGUuZmluZCh0YXJnZXQgPT4ge1xuICAgIHRyeSB7XG4gICAgICByZXF1aXJlLnJlc29sdmUodGFyZ2V0KTtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gY2F0Y2ggKGV4KSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9KTtcblxuICBpZiAoIWZvdW5kTW9kdWxlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKGBDb3VsZCBub3QgZmluZCB0YXJnZXQgbW9kdWxlIGZyb20gcGF0aHMgbGlrZTpcXG4ke2d1ZXNzaW5nRmlsZS5qb2luKCdcXG4nKX1gKTtcbiAgfVxuICBjb25zdCBfZXhwb3J0cyA9IHJlcXVpcmUoZm91bmRNb2R1bGUpO1xuICBpZiAoIV8uaGFzKF9leHBvcnRzLCBmdW5jKSkge1xuICAgIGxvZy5lcnJvcihgVGhlcmUgaXMgbm8gZXhwb3J0IGZ1bmN0aW9uOiAke2Z1bmN9LCBleGlzdGluZyBleHBvcnQgbWVtYmVycyBhcmU6XFxuYCArXG4gICAgYCR7T2JqZWN0LmtleXMoX2V4cG9ydHMpLmZpbHRlcihuYW1lID0+IHR5cGVvZiAoX2V4cG9ydHNbbmFtZV0pID09PSAnZnVuY3Rpb24nKS5tYXAobmFtZSA9PiBuYW1lICsgJygpJykuam9pbignXFxuJyl9YCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGF3YWl0IFByb21pc2UucmVzb2x2ZShfZXhwb3J0c1tmdW5jXS5hcHBseShnbG9iYWwsIGFyZ3MgfHwgW10pKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJ1blBhY2thZ2VzKGFyZ3Y6IHt0YXJnZXQ6IHN0cmluZywgcGFja2FnZTogc3RyaW5nW10sIFtrZXk6IHN0cmluZ106IGFueX0pIHtcbiAgY29uc3QgaW5jbHVkZU5hbWVTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgYXJndi5wYWNrYWdlLmZvckVhY2gobmFtZSA9PiBpbmNsdWRlTmFtZVNldC5hZGQobmFtZSkpO1xuICBjb25zdCBbZmlsZVRvUnVuLCBmdW5jVG9SdW5dID0gKGFyZ3YudGFyZ2V0IGFzIHN0cmluZykuc3BsaXQoJyMnKTtcbiAgY29uc3QgW3BhY2thZ2VzLCBwcm90b10gPSBpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMoYXJndiwgd2Fsa1BhY2thZ2VzKCkpO1xuICBjb25zdCBjb21wb25lbnRzID0gcGFja2FnZXMuZmlsdGVyKHBrID0+IHtcbiAgICAvLyBzZXR1cE5vZGVJbmplY3RvckZvcihwaywgTm9kZUFwaSk7IC8vIEFsbCBjb21wb25lbnQgcGFja2FnZSBzaG91bGQgYmUgYWJsZSB0byBhY2Nlc3MgJ19fYXBpJywgZXZlbiB0aGV5IGFyZSBub3QgaW5jbHVkZWRcbiAgICBpZiAoKGluY2x1ZGVOYW1lU2V0LnNpemUgPT09IDAgfHwgaW5jbHVkZU5hbWVTZXQuaGFzKHBrLmxvbmdOYW1lKSB8fCBpbmNsdWRlTmFtZVNldC5oYXMocGsuc2hvcnROYW1lKSkgJiZcbiAgICAgIHBrLmRyICE9IG51bGwpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlcXVpcmUucmVzb2x2ZShway5sb25nTmFtZSArICcvJyArIGZpbGVUb1J1bik7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcbiAgcmV0dXJuIG9yZGVyUGFja2FnZXMoY29tcG9uZW50cywgKHBrSW5zdGFuY2U6IFBhY2thZ2VJbnN0YW5jZSkgID0+IHtcbiAgICBjb25zdCBtb2QgPSBwa0luc3RhbmNlLmxvbmdOYW1lICsgJy8nICsgZmlsZVRvUnVuO1xuICAgIGxvZy5pbmZvKCdyZXF1aXJlKCVzKScsIEpTT04uc3RyaW5naWZ5KG1vZCkpO1xuICAgIGNvbnN0IGZpbGVFeHBvcnRzOiBhbnkgPSByZXF1aXJlKG1vZCk7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihmaWxlRXhwb3J0c1tmdW5jVG9SdW5dKSkge1xuICAgICAgbG9nLmluZm8oJ1J1biAlcyAlcygpJywgbW9kLCBmdW5jVG9SdW4pO1xuICAgICAgcmV0dXJuIGZpbGVFeHBvcnRzW2Z1bmNUb1J1bl0oKTtcbiAgICB9XG4gIH0pXG4gIC50aGVuKCgpID0+IHtcbiAgICAocHJvdG8uZXZlbnRCdXMgYXMgRXZlbnRzKS5lbWl0KCdkb25lJywge2ZpbGU6IGZpbGVUb1J1biwgZnVuY3Rpb25OYW1lOiBmdW5jVG9SdW59IGFzIFNlcnZlclJ1bm5lckV2ZW50KTtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMoYXJndjoge1trZXk6IHN0cmluZ106IGFueX0sIHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbyk6XG4gIFtQYWNrYWdlQnJvd3Nlckluc3RhbmNlW10sIHtldmVudEJ1czogRXZlbnRzfV0ge1xuICBjb25zdCBOb2RlQXBpOiB0eXBlb2YgX05vZGVBcGkgPSByZXF1aXJlKCcuL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGknKTtcbiAgY29uc3QgcHJvdG8gPSBOb2RlQXBpLnByb3RvdHlwZTtcbiAgcHJvdG8uYXJndiA9IGFyZ3Y7XG4gIC8vIGNvbnN0IHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbyA9IHdhbGtQYWNrYWdlcyhjb25maWcsIHBhY2thZ2VVdGlscyk7XG4gIHByb3RvLnBhY2thZ2VJbmZvID0gcGFja2FnZUluZm87XG4gIGNvbnN0IGNhY2hlID0gbmV3IExSVTxzdHJpbmcsIFBhY2thZ2VCcm93c2VySW5zdGFuY2U+KHttYXg6IDIwLCBtYXhBZ2U6IDIwMDAwfSk7XG4gIHByb3RvLmZpbmRQYWNrYWdlQnlGaWxlID0gZnVuY3Rpb24oZmlsZTogc3RyaW5nKTogUGFja2FnZUJyb3dzZXJJbnN0YW5jZSB8IHVuZGVmaW5lZCB7XG4gICAgdmFyIGZvdW5kID0gY2FjaGUuZ2V0KGZpbGUpO1xuICAgIGlmICghZm91bmQpIHtcbiAgICAgIGZvdW5kID0gcGFja2FnZUluZm8uZGlyVHJlZS5nZXRBbGxEYXRhKGZpbGUpLnBvcCgpO1xuICAgICAgaWYgKGZvdW5kKVxuICAgICAgICBjYWNoZS5zZXQoZmlsZSwgZm91bmQpO1xuICAgIH1cbiAgICByZXR1cm4gZm91bmQ7XG4gIH07XG4gIHByb3RvLmdldE5vZGVBcGlGb3JQYWNrYWdlID0gZnVuY3Rpb24ocGFja2FnZUluc3RhbmNlOiBhbnkpIHtcbiAgICByZXR1cm4gZ2V0QXBpRm9yUGFja2FnZShwYWNrYWdlSW5zdGFuY2UsIE5vZGVBcGkpO1xuICB9O1xuICBjb25zdCBkclBhY2thZ2VzID0gcGFja2FnZUluZm8uYWxsTW9kdWxlcy5maWx0ZXIocGsgPT4ge1xuICAgIGlmIChway5kcikge1xuICAgICAgc2V0dXBOb2RlSW5qZWN0b3JGb3IocGssIE5vZGVBcGkpOyAvLyBBbGwgY29tcG9uZW50IHBhY2thZ2Ugc2hvdWxkIGJlIGFibGUgdG8gYWNjZXNzICdfX2FwaScsIGV2ZW4gdGhleSBhcmUgbm90IGluY2x1ZGVkXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcbiAgcmV0dXJuIFtkclBhY2thZ2VzLCBwcm90b107XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbml0V2ViSW5qZWN0b3IocGFja2FnZXM6IFBhY2thZ2VCcm93c2VySW5zdGFuY2VbXSwgYXBpUHJvdG90eXBlOiBhbnkpIHtcbiAgXy5lYWNoKHBhY2thZ2VzLCBwYWNrID0+IHtcbiAgICBpZiAocGFjay5kcikge1xuICAgICAgLy8gbm8gdmVuZG9yIHBhY2thZ2UncyBwYXRoIGluZm9ybWF0aW9uXG4gICAgICB3ZWJJbmplY3Rvci5hZGRQYWNrYWdlKHBhY2subG9uZ05hbWUsIHBhY2sucGFja2FnZVBhdGgpO1xuICAgIH1cbiAgfSk7XG4gIHdlYkluamVjdG9yLmZyb21BbGxQYWNrYWdlcygpXG4gIC5yZXBsYWNlQ29kZSgnX19hcGknLCAnX19hcGknKVxuICAuc3Vic3RpdHV0ZSgvXihbXntdKilcXHtsb2NhbGVcXH0oLiopJC8sXG4gICAgKF9maWxlUGF0aDogc3RyaW5nLCBtYXRjaDogUmVnRXhwRXhlY0FycmF5KSA9PiBtYXRjaFsxXSArIGFwaVByb3RvdHlwZS5nZXRCdWlsZExvY2FsZSgpICsgbWF0Y2hbMl0pO1xuXG4gIGNvbnN0IGRvbmUgPSB3ZWJJbmplY3Rvci5yZWFkSW5qZWN0RmlsZSgnbW9kdWxlLXJlc29sdmUuYnJvd3NlcicpO1xuICBhcGlQcm90b3R5cGUuYnJvd3NlckluamVjdG9yID0gd2ViSW5qZWN0b3I7XG4gIHJldHVybiBkb25lO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcHJlcGFyZUxhenlOb2RlSW5qZWN0b3IoYXJndjoge1trZXk6IHN0cmluZ106IGFueX0pIHtcbiAgY29uc3QgTm9kZUFwaTogdHlwZW9mIF9Ob2RlQXBpID0gcmVxdWlyZSgnLi9wYWNrYWdlLW1nci9ub2RlLXBhY2thZ2UtYXBpJyk7XG4gIGNvbnN0IHByb3RvID0gTm9kZUFwaS5wcm90b3R5cGU7XG4gIHByb3RvLmFyZ3YgPSBhcmd2O1xuICBsZXQgcGFja2FnZUluZm86IFBhY2thZ2VJbmZvO1xuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90bywgJ3BhY2thZ2VJbmZvJywge1xuICAgIGdldCgpIHtcbiAgICAgIGlmIChwYWNrYWdlSW5mbyA9PSBudWxsKVxuICAgICAgICBwYWNrYWdlSW5mbyA9IHdhbGtQYWNrYWdlcygpO1xuICAgICAgcmV0dXJuIHBhY2thZ2VJbmZvO1xuICAgIH1cbiAgfSk7XG4gIHByb3RvLmZpbmRQYWNrYWdlQnlGaWxlID0gY3JlYXRlTGF6eVBhY2thZ2VGaWxlRmluZGVyKCk7XG4gIHByb3RvLmdldE5vZGVBcGlGb3JQYWNrYWdlID0gZnVuY3Rpb24ocGFja2FnZUluc3RhbmNlOiBhbnkpIHtcbiAgICByZXR1cm4gZ2V0QXBpRm9yUGFja2FnZShwYWNrYWdlSW5zdGFuY2UsIE5vZGVBcGkpO1xuICB9O1xuICBub2RlSW5qZWN0b3IuZnJvbVJvb3QoKVxuICAvLyAuYWxpYXMoJ2xvZzRqcycsIFBhdGgucmVzb2x2ZShjb25maWcoKS5yb290UGF0aCwgJ25vZGVfbW9kdWxlcy9sb2c0anMnKSlcbiAgLnZhbHVlKCdfX2luamVjdG9yJywgbm9kZUluamVjdG9yKVxuICAuZmFjdG9yeSgnX19hcGknLCAoc291cmNlRmlsZVBhdGg6IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IHBhY2thZ2VJbnN0YW5jZSA9IHByb3RvLmZpbmRQYWNrYWdlQnlGaWxlKHNvdXJjZUZpbGVQYXRoKTtcbiAgICByZXR1cm4gZ2V0QXBpRm9yUGFja2FnZShwYWNrYWdlSW5zdGFuY2UsIE5vZGVBcGkpO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1hcFBhY2thZ2VzQnlUeXBlKHR5cGVzOiBzdHJpbmdbXSwgb25FYWNoUGFja2FnZTogKG5vZGVQYWNrYWdlOiBOb2RlUGFja2FnZSkgPT4gdm9pZCkge1xuICBjb25zdCBwYWNrYWdlc01hcDoge1t0eXBlOiBzdHJpbmddOiBOb2RlUGFja2FnZVtdfSA9IHt9O1xuICB0eXBlcy5mb3JFYWNoKHR5cGUgPT4ge1xuICAgIHBhY2thZ2VzTWFwW3R5cGVdID0gW107XG4gIH0pO1xuXG4gIGZvciAoY29uc3QgcGtnIG9mIHBhY2thZ2VzNFdvcmtzcGFjZSgpKSB7XG4gICAgY29uc3QgbmFtZSA9IHBrZy5uYW1lO1xuICAgIGNvbnN0IHBrSW5zdGFuY2UgPSBuZXcgTm9kZVBhY2thZ2Uoe1xuICAgICAgbW9kdWxlTmFtZTogbmFtZSxcbiAgICAgIHNob3J0TmFtZTogcGtnLnNob3J0TmFtZSxcbiAgICAgIG5hbWUsXG4gICAgICBsb25nTmFtZTogbmFtZSxcbiAgICAgIHNjb3BlOiBwa2cuc2NvcGUsXG4gICAgICBwYXRoOiBwa2cucGF0aCxcbiAgICAgIGpzb246IHBrZy5qc29uLFxuICAgICAgcmVhbFBhdGg6IHBrZy5yZWFsUGF0aFxuICAgIH0pO1xuICAgIGNvbnN0IGRyVHlwZXMgPSAoW10gYXMgc3RyaW5nW10pLmNvbmNhdChfLmdldChwa2csICdqc29uLmRyLnR5cGUnKSk7XG4gICAgZm9yIChjb25zdCB0eXBlIG9mIHR5cGVzKSB7XG4gICAgICBpZiAoIV8uaW5jbHVkZXMoZHJUeXBlcywgdHlwZSkpXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgcGFja2FnZXNNYXBbdHlwZV0ucHVzaChwa0luc3RhbmNlKTtcbiAgICB9XG4gICAgaWYgKG9uRWFjaFBhY2thZ2UpIHtcbiAgICAgIG9uRWFjaFBhY2thZ2UocGtJbnN0YW5jZSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBwYWNrYWdlc01hcDtcbn1cblxuZnVuY3Rpb24gc2V0dXBOb2RlSW5qZWN0b3JGb3IocGtJbnN0YW5jZTogUGFja2FnZUJyb3dzZXJJbnN0YW5jZSwgTm9kZUFwaTogdHlwZW9mIF9Ob2RlQXBpICkge1xuICBmdW5jdGlvbiBhcGlGYWN0b3J5KCkge1xuICAgIHJldHVybiBnZXRBcGlGb3JQYWNrYWdlKHBrSW5zdGFuY2UsIE5vZGVBcGkpO1xuICB9XG4gIG5vZGVJbmplY3Rvci5mcm9tRGlyKHBrSW5zdGFuY2UucmVhbFBhY2thZ2VQYXRoKVxuICAudmFsdWUoJ19faW5qZWN0b3InLCBub2RlSW5qZWN0b3IpXG4gIC5mYWN0b3J5KCdfX2FwaScsIGFwaUZhY3RvcnkpO1xuICBub2RlSW5qZWN0b3IuZnJvbURpcihwa0luc3RhbmNlLnBhY2thZ2VQYXRoKVxuICAudmFsdWUoJ19faW5qZWN0b3InLCBub2RlSW5qZWN0b3IpXG4gIC5mYWN0b3J5KCdfX2FwaScsIGFwaUZhY3RvcnkpO1xufVxuXG5mdW5jdGlvbiBnZXRBcGlGb3JQYWNrYWdlKHBrSW5zdGFuY2U6IGFueSwgTm9kZUFwaTogdHlwZW9mIF9Ob2RlQXBpKSB7XG4gIGlmIChfLmhhcyhhcGlDYWNoZSwgcGtJbnN0YW5jZS5sb25nTmFtZSkpIHtcbiAgICByZXR1cm4gYXBpQ2FjaGVbcGtJbnN0YW5jZS5sb25nTmFtZV07XG4gIH1cblxuICBjb25zdCBhcGkgPSBuZXcgTm9kZUFwaShwa0luc3RhbmNlLmxvbmdOYW1lLCBwa0luc3RhbmNlKTtcbiAgLy8gYXBpLmNvbnN0cnVjdG9yID0gTm9kZUFwaTtcbiAgcGtJbnN0YW5jZS5hcGkgPSBhcGk7XG4gIGFwaUNhY2hlW3BrSW5zdGFuY2UubG9uZ05hbWVdID0gYXBpO1xuICBhcGkuZGVmYXVsdCA9IGFwaTsgLy8gRm9yIEVTNiBpbXBvcnQgc3ludGF4XG4gIHJldHVybiBhcGk7XG59XG5cbi8vIGV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5TZXJ2ZXIoKSB7XG4vLyAgIGxldCBwYWNrYWdlc1R5cGVNYXA7XG4vLyAgIC8vIE5vZGVBcGkucHJvdG90eXBlLmFyZ3YgPSBhcmd2O1xuLy8gICAvLyBOb2RlQXBpLnByb3RvdHlwZS5ydW5CdWlsZGVyID0gZnVuY3Rpb24oYnVpbGRBcmd2LCBza2lwTmFtZXMpIHtcbi8vICAgLy8gICBfLmFzc2lnbihidWlsZEFyZ3YsIGFyZ3YpO1xuLy8gICAvLyAgIGlmICghQXJyYXkuaXNBcnJheShza2lwTmFtZXMpKVxuLy8gICAvLyAgICAgc2tpcE5hbWVzID0gW3NraXBOYW1lc107XG4vLyAgIC8vICAgLy8gdmFyIGJ1aWxkZXJzID0gXy5maWx0ZXIocGFja2FnZXNUeXBlTWFwLmJ1aWxkZXIsIHBhY2thZ2VJbnMgPT4gIV8uaW5jbHVkZXMoZXhjbHVkZU5hbWVzLCBwYWNrYWdlSW5zLmxvbmdOYW1lKSApO1xuXG4vLyAgIC8vICAgcmV0dXJuIGhlbHBlci5ydW5CdWlsZGVyQ29tcG9uZW50cyhwYWNrYWdlc1R5cGVNYXAuYnVpbGRlciwgYnVpbGRBcmd2LCBza2lwTmFtZXMpO1xuLy8gICAvLyB9O1xuXG4vLyAgIHBhY2thZ2VzVHlwZU1hcCA9IGF3YWl0IHJlcXVpcmVTZXJ2ZXJQYWNrYWdlcygpO1xuLy8gICAvLyBkZWFjdGl2YXRlT3JkZXIgPSBbXTtcbi8vICAgYXdhaXQgYWN0aXZhdGVDb3JlQ29tcG9uZW50cygpO1xuLy8gICBhd2FpdCBhY3RpdmF0ZU5vcm1hbENvbXBvbmVudHMoKTtcbi8vICAgY29uc3QgbmV3UnVubmVyID0gbmV3IFNlcnZlclJ1bm5lcigpO1xuLy8gICBkZWFjdGl2YXRlT3JkZXIucmV2ZXJzZSgpO1xuLy8gICBuZXdSdW5uZXIuZGVhY3RpdmF0ZVBhY2thZ2VzID0gZGVhY3RpdmF0ZU9yZGVyO1xuLy8gICBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgNTAwKSk7XG4vLyAgIHJldHVybiAoKSA9PiB7XG4vLyAgICAgcmV0dXJuIG5ld1J1bm5lci5zaHV0ZG93blNlcnZlcigpO1xuLy8gICB9O1xuLy8gfVxuXG4vLyBmdW5jdGlvbiByZXF1aXJlU2VydmVyUGFja2FnZXMoZG9udExvYWQpIHtcbi8vIFx0cmV0dXJuIGhlbHBlci50cmF2ZXJzZVBhY2thZ2VzKCFkb250TG9hZClcbi8vIFx0LnRoZW4ocGFja2FnZXNUeXBlTWFwID0+IHtcbi8vIFx0XHQvLyB2YXIgcHJvdG8gPSBOb2RlQXBpLnByb3RvdHlwZTtcbi8vIFx0XHQvLyBwcm90by5hcmd2ID0gYXJndjtcblxuLy8gXHRcdC8vIGNyZWF0ZSBBUEkgaW5zdGFuY2UgYW5kIGluamVjdCBmYWN0b3JpZXNcblxuLy8gXHRcdF8uZWFjaChwYWNrYWdlc1R5cGVNYXAuc2VydmVyLCAocCwgaWR4KSA9PiB7XG4vLyBcdFx0XHRpZiAoIWNoZWNrUGFja2FnZU5hbWUocC5zY29wZSwgcC5zaG9ydE5hbWUsIGZhbHNlKSkge1xuLy8gXHRcdFx0XHRyZXR1cm47XG4vLyBcdFx0XHR9XG4vLyBcdFx0XHRpZiAoXy5pbmNsdWRlcyhbXS5jb25jYXQoXy5nZXQocCwgJ2pzb24uZHIudHlwZScpKSwgJ2NvcmUnKSkge1xuLy8gXHRcdFx0XHRjb3JlUGFja2FnZXNbcC5zaG9ydE5hbWVdID0gcDtcbi8vIFx0XHRcdH0gZWxzZSB7XG4vLyBcdFx0XHRcdHBhY2thZ2VDYWNoZVtwLnNob3J0TmFtZV0gPSBwO1xuLy8gXHRcdFx0fVxuLy8gXHRcdFx0Ly8gaWYgKCFkb250TG9hZClcbi8vIFx0XHRcdC8vIFx0cC5leHBvcnRzID0gcmVxdWlyZShwLm1vZHVsZU5hbWUpO1xuLy8gXHRcdH0pO1xuLy8gXHRcdGV2ZW50QnVzLmVtaXQoJ2xvYWRFbmQnLCBwYWNrYWdlQ2FjaGUpO1xuLy8gXHRcdHJldHVybiBwYWNrYWdlc1R5cGVNYXA7XG4vLyBcdH0pO1xuLy8gfVxuXG4iXX0=