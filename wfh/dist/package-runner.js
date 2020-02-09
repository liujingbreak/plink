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
        // console.log(nodeInjector.dirTree.traverse());
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wYWNrYWdlLXJ1bm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLG9DQUFvQztBQUNwQywwQ0FBNEI7QUFDNUIsMERBQTRCO0FBQzVCLHdDQUF1RztBQUN2Ryw2Q0FBNkM7QUFDN0MsNERBQTREO0FBQzVELHlEQUErRDtBQUUvRCwrQ0FBK0M7QUFDL0MsdUVBQTJFO0FBRzNFLGdEQUF3QjtBQUN4QixtREFBNEQ7QUFFNUQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3hDLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO0FBRS9ELE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQU0xRCxNQUFhLFlBQVk7SUFLakIsY0FBYzs7WUFDbEIsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUMxQixNQUFNLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUMxRCxDQUFDO0tBQUE7SUFFZSxtQkFBbUIsQ0FBQyxLQUFvQjs7WUFDdEQsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUU7Z0JBQ3hCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ25DLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUU7b0JBQ2hDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDdEMsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO2lCQUN6QzthQUNG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UUFBUSxFQUFFLFVBQVUsQ0FBQyxRQUFRLENBQUMsRUFBRTtRQUN4QyxPQUFPLFFBQVEsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDdEM7SUFFRCxNQUFNLEdBQUcsR0FBRyxJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ3pELDZCQUE2QjtJQUM3QixVQUFVLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztJQUNyQixRQUFRLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEdBQUcsQ0FBQztJQUNwQyxHQUFHLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQyxDQUFDLHdCQUF3QjtJQUMzQyxPQUFPLEdBQUcsQ0FBQztBQUNiLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKiB0c2xpbnQ6ZGlzYWJsZSBtYXgtbGluZS1sZW5ndGggKi9cbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBMUlUgZnJvbSAnbHJ1LWNhY2hlJztcbmltcG9ydCB7IFBhY2thZ2VJbmZvLCBwYWNrYWdlSW5zdGFuY2UgYXMgUGFja2FnZUJyb3dzZXJJbnN0YW5jZSwgd2Fsa1BhY2thZ2VzIH0gZnJvbSAnLi9idWlsZC11dGlsL3RzJztcbi8vIGNvbnN0IE5vZGVBcGkgPSByZXF1aXJlKCcuLi9saWIvbm9kZUFwaScpO1xuLy8gY29uc3Qge25vZGVJbmplY3Rvcn0gPSByZXF1aXJlKCcuLi9saWIvaW5qZWN0b3JGYWN0b3J5Jyk7XG5pbXBvcnQgeyBub2RlSW5qZWN0b3IsIHdlYkluamVjdG9yIH0gZnJvbSAnLi9pbmplY3Rvci1mYWN0b3J5JztcbmltcG9ydCBfTm9kZUFwaSBmcm9tICcuL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGknO1xuLy8gaW1wb3J0IFBhY2thZ2UgZnJvbSAnLi9wYWNrYWdlTm9kZUluc3RhbmNlJztcbmltcG9ydCB7IG9yZGVyUGFja2FnZXMsIFBhY2thZ2VJbnN0YW5jZSB9IGZyb20gJy4vcGFja2FnZS1wcmlvcml0eS1oZWxwZXInO1xuaW1wb3J0IE5vZGVQYWNrYWdlIGZyb20gJy4vcGFja2FnZU5vZGVJbnN0YW5jZSc7XG5pbXBvcnQgRXZlbnRzID0gcmVxdWlyZSgnZXZlbnRzJyk7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7Y3JlYXRlTGF6eVBhY2thZ2VGaWxlRmluZGVyfSBmcm9tICcuL3BhY2thZ2UtdXRpbHMnO1xuXG5jb25zdCBjb25maWcgPSByZXF1aXJlKCcuLi9saWIvY29uZmlnJyk7XG5jb25zdCBwYWNrYWdlVXRpbHMgPSByZXF1aXJlKCcuLi9saWIvcGFja2FnZU1nci9wYWNrYWdlVXRpbHMnKTtcblxuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdwYWNrYWdlLXJ1bm5lcicpO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNlcnZlclJ1bm5lckV2ZW50IHtcbiAgZmlsZTogc3RyaW5nO1xuICBmdW5jdGlvbk5hbWU6IHN0cmluZztcbn1cbmV4cG9ydCBjbGFzcyBTZXJ2ZXJSdW5uZXIge1xuICAvLyBwYWNrYWdlQ2FjaGU6IHtbc2hvcnROYW1lOiBzdHJpbmddOiBOb2RlUGFja2FnZX0gPSB7fTtcbiAgLy8gY29yZVBhY2thZ2VzOiB7W3Nob3J0TmFtZTogc3RyaW5nXTogTm9kZVBhY2thZ2V9ID0ge307XG4gIGRlYWN0aXZhdGVQYWNrYWdlczogTm9kZVBhY2thZ2VbXTtcblxuICBhc3luYyBzaHV0ZG93blNlcnZlcigpIHtcbiAgICBsb2cuaW5mbygnc2h1dHRpbmcgZG93bicpO1xuICAgIGF3YWl0IHRoaXMuX2RlYWN0aXZhdGVQYWNrYWdlcyh0aGlzLmRlYWN0aXZhdGVQYWNrYWdlcyk7XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgX2RlYWN0aXZhdGVQYWNrYWdlcyhjb21wczogTm9kZVBhY2thZ2VbXSkge1xuICAgIGZvciAoY29uc3QgY29tcCBvZiBjb21wcykge1xuICAgICAgY29uc3QgZXhwID0gcmVxdWlyZShjb21wLmxvbmdOYW1lKTtcbiAgICAgIGlmIChfLmlzRnVuY3Rpb24oZXhwLmRlYWN0aXZhdGUpKSB7XG4gICAgICAgIGxvZy5pbmZvKCdkZWFjdGl2YXRlJywgY29tcC5sb25nTmFtZSk7XG4gICAgICAgIGF3YWl0IFByb21pc2UucmVzb2x2ZShleHAuZGVhY3RpdmF0ZSgpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuY29uc3QgYXBpQ2FjaGU6IHtbbmFtZTogc3RyaW5nXTogYW55fSA9IHt9O1xuLy8gY29uc3QgcGFja2FnZVRyZWUgPSBuZXcgRGlyVHJlZTxQYWNrYWdlQnJvd3Nlckluc3RhbmNlPigpO1xuXG4vKipcbiAqIExhemlseSBpbml0IGluamVjdG9yIGZvciBwYWNrYWdlcyBhbmQgcnVuIHNwZWNpZmljIHBhY2thZ2Ugb25seSxcbiAqIG5vIGZ1bGx5IHNjYW5uaW5nIG9yIG9yZGVyaW5nIG9uIGFsbCBwYWNrYWdlc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuU2luZ2xlUGFja2FnZShhcmd2OiB7dGFyZ2V0OiBzdHJpbmcsIGFyZ3VtZW50czogc3RyaW5nW10sIFtrZXk6IHN0cmluZ106IGFueX0pIHtcbiAgY29uc3QgTm9kZUFwaTogdHlwZW9mIF9Ob2RlQXBpID0gcmVxdWlyZSgnLi9wYWNrYWdlLW1nci9ub2RlLXBhY2thZ2UtYXBpJyk7XG4gIGNvbnN0IHByb3RvID0gTm9kZUFwaS5wcm90b3R5cGU7XG4gIHByb3RvLmFyZ3YgPSBhcmd2O1xuICBsZXQgcGFja2FnZUluZm86IFBhY2thZ2VJbmZvO1xuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90bywgJ3BhY2thZ2VJbmZvJywge1xuICAgIGdldCgpIHtcbiAgICAgIGlmIChwYWNrYWdlSW5mbyA9PSBudWxsKVxuICAgICAgICBwYWNrYWdlSW5mbyA9IHdhbGtQYWNrYWdlcyhjb25maWcsIHBhY2thZ2VVdGlscyk7XG4gICAgICByZXR1cm4gcGFja2FnZUluZm87XG4gICAgfVxuICB9KTtcbiAgcHJvdG8uZmluZFBhY2thZ2VCeUZpbGUgPSBjcmVhdGVMYXp5UGFja2FnZUZpbGVGaW5kZXIoKTtcbiAgcHJvdG8uZ2V0Tm9kZUFwaUZvclBhY2thZ2UgPSBmdW5jdGlvbihwYWNrYWdlSW5zdGFuY2U6IGFueSkge1xuICAgIHJldHVybiBnZXRBcGlGb3JQYWNrYWdlKHBhY2thZ2VJbnN0YW5jZSwgTm9kZUFwaSk7XG4gIH07XG4gIG5vZGVJbmplY3Rvci5mcm9tUm9vdCgpXG4gIC52YWx1ZSgnX19pbmplY3RvcicsIG5vZGVJbmplY3RvcilcbiAgLmZhY3RvcnkoJ19fYXBpJywgKHNvdXJjZUZpbGVQYXRoOiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCBwYWNrYWdlSW5zdGFuY2UgPSBwcm90by5maW5kUGFja2FnZUJ5RmlsZShzb3VyY2VGaWxlUGF0aCk7XG4gICAgcmV0dXJuIGdldEFwaUZvclBhY2thZ2UocGFja2FnZUluc3RhbmNlLCBOb2RlQXBpKTtcbiAgfSk7XG4gIC8vIGNvbnNvbGUubG9nKG5vZGVJbmplY3Rvci5kaXJUcmVlLnRyYXZlcnNlKCkpO1xuXG4gIGNvbnN0IFtmaWxlLCBmdW5jXSA9IGFyZ3YudGFyZ2V0LnNwbGl0KCcjJyk7XG4gIGNvbnN0IGd1ZXNzaW5nRmlsZTogc3RyaW5nW10gPSBbXG4gICAgZmlsZSxcbiAgICBQYXRoLnJlc29sdmUoZmlsZSksXG4gICAgLi4uKGNvbmZpZygpLnBhY2thZ2VTY29wZXMgYXMgc3RyaW5nW10pLm1hcChzY29wZSA9PiBgQCR7c2NvcGV9LyR7ZmlsZX1gKVxuICBdO1xuICBjb25zdCBmb3VuZE1vZHVsZSA9IGd1ZXNzaW5nRmlsZS5maW5kKHRhcmdldCA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIHJlcXVpcmUucmVzb2x2ZSh0YXJnZXQpO1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSBjYXRjaCAoZXgpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gIH0pO1xuXG4gIGlmICghZm91bmRNb2R1bGUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kIHRhcmdldCBtb2R1bGUgZnJvbSBwYXRocyBsaWtlOlxcbiR7Z3Vlc3NpbmdGaWxlLmpvaW4oJ1xcbicpfWApO1xuICB9XG5cbiAgY29uc3QgX2V4cG9ydHMgPSByZXF1aXJlKGZvdW5kTW9kdWxlKTtcbiAgaWYgKCFfLmhhcyhfZXhwb3J0cywgZnVuYykpIHtcbiAgICBsb2cuZXJyb3IoYFRoZXJlIGlzIG5vIGV4cG9ydCBmdW5jdGlvbjogJHtmdW5jfSwgZXhpc3RpbmcgZXhwb3J0IG1lbWJlcnMgYXJlOlxcbmAgK1xuICAgIGAke09iamVjdC5rZXlzKF9leHBvcnRzKS5maWx0ZXIobmFtZSA9PiB0eXBlb2YgKF9leHBvcnRzW25hbWVdKSA9PT0gJ2Z1bmN0aW9uJykubWFwKG5hbWUgPT4gbmFtZSArICcoKScpLmpvaW4oJ1xcbicpfWApO1xuICAgIHJldHVybjtcbiAgfVxuICBhd2FpdCBQcm9taXNlLnJlc29sdmUoX2V4cG9ydHNbZnVuY10uYXBwbHkoZ2xvYmFsLCBhcmd2Ll8uc2xpY2UoMSkgfHwgW10pKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJ1blBhY2thZ2VzKGFyZ3Y6IHt0YXJnZXQ6IHN0cmluZywgcGFja2FnZTogc3RyaW5nW10sIFtrZXk6IHN0cmluZ106IGFueX0pIHtcbiAgLy8gY29uc3QgTm9kZUFwaSA9IHJlcXVpcmUoJy4uL2xpYi9ub2RlQXBpJyk7XG4gIGNvbnN0IGluY2x1ZGVOYW1lU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGFyZ3YucGFja2FnZS5mb3JFYWNoKG5hbWUgPT4gaW5jbHVkZU5hbWVTZXQuYWRkKG5hbWUpKTtcbiAgY29uc3QgW2ZpbGVUb1J1biwgZnVuY1RvUnVuXSA9IChhcmd2LnRhcmdldCBhcyBzdHJpbmcpLnNwbGl0KCcjJyk7XG4gIGNvbnN0IFtwYWNrYWdlcywgcHJvdG9dID0gaW5pdEluamVjdG9yRm9yTm9kZVBhY2thZ2VzKGFyZ3YsIHdhbGtQYWNrYWdlcyhjb25maWcsIHBhY2thZ2VVdGlscykpO1xuICBjb25zdCBjb21wb25lbnRzID0gcGFja2FnZXMuZmlsdGVyKHBrID0+IHtcbiAgICAvLyBzZXR1cE5vZGVJbmplY3RvckZvcihwaywgTm9kZUFwaSk7IC8vIEFsbCBjb21wb25lbnQgcGFja2FnZSBzaG91bGQgYmUgYWJsZSB0byBhY2Nlc3MgJ19fYXBpJywgZXZlbiB0aGV5IGFyZSBub3QgaW5jbHVkZWRcbiAgICBpZiAoKGluY2x1ZGVOYW1lU2V0LnNpemUgPT09IDAgfHwgaW5jbHVkZU5hbWVTZXQuaGFzKHBrLmxvbmdOYW1lKSB8fCBpbmNsdWRlTmFtZVNldC5oYXMocGsuc2hvcnROYW1lKSkgJiZcbiAgICAgIHBrLmRyICE9IG51bGwpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlcXVpcmUucmVzb2x2ZShway5sb25nTmFtZSArICcvJyArIGZpbGVUb1J1bik7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcbiAgcmV0dXJuIG9yZGVyUGFja2FnZXMoY29tcG9uZW50cywgKHBrSW5zdGFuY2U6IFBhY2thZ2VJbnN0YW5jZSkgID0+IHtcbiAgICBjb25zdCBtb2QgPSBwa0luc3RhbmNlLmxvbmdOYW1lICsgJy8nICsgZmlsZVRvUnVuO1xuICAgIGxvZy5pbmZvKCdyZXF1aXJlKCVzKScsIEpTT04uc3RyaW5naWZ5KG1vZCkpO1xuICAgIGNvbnN0IGZpbGVFeHBvcnRzOiBhbnkgPSByZXF1aXJlKG1vZCk7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihmaWxlRXhwb3J0c1tmdW5jVG9SdW5dKSkge1xuICAgICAgbG9nLmluZm8oJ1J1biAlcyAlcygpJywgbW9kLCBmdW5jVG9SdW4pO1xuICAgICAgcmV0dXJuIGZpbGVFeHBvcnRzW2Z1bmNUb1J1bl0oKTtcbiAgICB9XG4gIH0pXG4gIC50aGVuKCgpID0+IHtcbiAgICAocHJvdG8uZXZlbnRCdXMgYXMgRXZlbnRzKS5lbWl0KCdkb25lJywge2ZpbGU6IGZpbGVUb1J1biwgZnVuY3Rpb25OYW1lOiBmdW5jVG9SdW59IGFzIFNlcnZlclJ1bm5lckV2ZW50KTtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMoYXJndjoge1trZXk6IHN0cmluZ106IGFueX0sIHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbyk6XG4gIFtQYWNrYWdlQnJvd3Nlckluc3RhbmNlW10sIHtldmVudEJ1czogRXZlbnRzfV0ge1xuICBjb25zdCBOb2RlQXBpOiB0eXBlb2YgX05vZGVBcGkgPSByZXF1aXJlKCcuL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGknKTtcbiAgY29uc3QgcHJvdG8gPSBOb2RlQXBpLnByb3RvdHlwZTtcbiAgcHJvdG8uYXJndiA9IGFyZ3Y7XG4gIC8vIGNvbnN0IHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbyA9IHdhbGtQYWNrYWdlcyhjb25maWcsIHBhY2thZ2VVdGlscyk7XG4gIHByb3RvLnBhY2thZ2VJbmZvID0gcGFja2FnZUluZm87XG4gIGNvbnN0IGNhY2hlID0gbmV3IExSVTxzdHJpbmcsIFBhY2thZ2VCcm93c2VySW5zdGFuY2U+KHttYXg6IDIwLCBtYXhBZ2U6IDIwMDAwfSk7XG4gIHByb3RvLmZpbmRQYWNrYWdlQnlGaWxlID0gZnVuY3Rpb24oZmlsZTogc3RyaW5nKTogUGFja2FnZUJyb3dzZXJJbnN0YW5jZSB8IHVuZGVmaW5lZCB7XG4gICAgdmFyIGZvdW5kID0gY2FjaGUuZ2V0KGZpbGUpO1xuICAgIGlmICghZm91bmQpIHtcbiAgICAgIGZvdW5kID0gcGFja2FnZUluZm8uZGlyVHJlZS5nZXRBbGxEYXRhKGZpbGUpLnBvcCgpO1xuICAgICAgaWYgKGZvdW5kKVxuICAgICAgICBjYWNoZS5zZXQoZmlsZSwgZm91bmQpO1xuICAgIH1cbiAgICByZXR1cm4gZm91bmQ7XG4gIH07XG4gIHByb3RvLmdldE5vZGVBcGlGb3JQYWNrYWdlID0gZnVuY3Rpb24ocGFja2FnZUluc3RhbmNlOiBhbnkpIHtcbiAgICByZXR1cm4gZ2V0QXBpRm9yUGFja2FnZShwYWNrYWdlSW5zdGFuY2UsIE5vZGVBcGkpO1xuICB9O1xuICBjb25zdCBkclBhY2thZ2VzID0gcGFja2FnZUluZm8uYWxsTW9kdWxlcy5maWx0ZXIocGsgPT4ge1xuICAgIGlmIChway5kcikge1xuICAgICAgc2V0dXBOb2RlSW5qZWN0b3JGb3IocGssIE5vZGVBcGkpOyAvLyBBbGwgY29tcG9uZW50IHBhY2thZ2Ugc2hvdWxkIGJlIGFibGUgdG8gYWNjZXNzICdfX2FwaScsIGV2ZW4gdGhleSBhcmUgbm90IGluY2x1ZGVkXG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcbiAgcmV0dXJuIFtkclBhY2thZ2VzLCBwcm90b107XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpbml0V2ViSW5qZWN0b3IocGFja2FnZXM6IFBhY2thZ2VCcm93c2VySW5zdGFuY2VbXSwgYXBpUHJvdG90eXBlOiBhbnkpIHtcbiAgXy5lYWNoKHBhY2thZ2VzLCBwYWNrID0+IHtcbiAgICBpZiAocGFjay5kcikge1xuICAgICAgLy8gbm8gdmVuZG9yIHBhY2thZ2UncyBwYXRoIGluZm9ybWF0aW9uXG4gICAgICB3ZWJJbmplY3Rvci5hZGRQYWNrYWdlKHBhY2subG9uZ05hbWUsIHBhY2sucGFja2FnZVBhdGgpO1xuICAgIH1cbiAgfSk7XG4gIHdlYkluamVjdG9yLmZyb21BbGxQYWNrYWdlcygpXG4gIC5yZXBsYWNlQ29kZSgnX19hcGknLCAnX19hcGknKVxuICAuc3Vic3RpdHV0ZSgvXihbXntdKilcXHtsb2NhbGVcXH0oLiopJC8sXG4gICAgKF9maWxlUGF0aDogc3RyaW5nLCBtYXRjaDogUmVnRXhwRXhlY0FycmF5KSA9PiBtYXRjaFsxXSArIGFwaVByb3RvdHlwZS5nZXRCdWlsZExvY2FsZSgpICsgbWF0Y2hbMl0pO1xuXG4gIGNvbnN0IGRvbmUgPSB3ZWJJbmplY3Rvci5yZWFkSW5qZWN0RmlsZSgnbW9kdWxlLXJlc29sdmUuYnJvd3NlcicpO1xuICBhcGlQcm90b3R5cGUuYnJvd3NlckluamVjdG9yID0gd2ViSW5qZWN0b3I7XG4gIHJldHVybiBkb25lO1xufVxuXG5mdW5jdGlvbiBzZXR1cE5vZGVJbmplY3RvckZvcihwa0luc3RhbmNlOiBQYWNrYWdlQnJvd3Nlckluc3RhbmNlLCBOb2RlQXBpOiB0eXBlb2YgX05vZGVBcGkgKSB7XG4gIGZ1bmN0aW9uIGFwaUZhY3RvcnkoKSB7XG4gICAgcmV0dXJuIGdldEFwaUZvclBhY2thZ2UocGtJbnN0YW5jZSwgTm9kZUFwaSk7XG4gIH1cbiAgbm9kZUluamVjdG9yLmZyb21EaXIocGtJbnN0YW5jZS5yZWFsUGFja2FnZVBhdGgpXG4gIC52YWx1ZSgnX19pbmplY3RvcicsIG5vZGVJbmplY3RvcilcbiAgLmZhY3RvcnkoJ19fYXBpJywgYXBpRmFjdG9yeSk7XG4gIG5vZGVJbmplY3Rvci5mcm9tRGlyKHBrSW5zdGFuY2UucGFja2FnZVBhdGgpXG4gIC52YWx1ZSgnX19pbmplY3RvcicsIG5vZGVJbmplY3RvcilcbiAgLmZhY3RvcnkoJ19fYXBpJywgYXBpRmFjdG9yeSk7XG4gIC8vIG5vZGVJbmplY3Rvci5kZWZhdWx0ID0gbm9kZUluamVjdG9yOyAvLyBGb3IgRVM2IGltcG9ydCBzeW50YXhcbn1cblxuZnVuY3Rpb24gZ2V0QXBpRm9yUGFja2FnZShwa0luc3RhbmNlOiBhbnksIE5vZGVBcGk6IHR5cGVvZiBfTm9kZUFwaSkge1xuICBpZiAoXy5oYXMoYXBpQ2FjaGUsIHBrSW5zdGFuY2UubG9uZ05hbWUpKSB7XG4gICAgcmV0dXJuIGFwaUNhY2hlW3BrSW5zdGFuY2UubG9uZ05hbWVdO1xuICB9XG5cbiAgY29uc3QgYXBpID0gbmV3IE5vZGVBcGkocGtJbnN0YW5jZS5sb25nTmFtZSwgcGtJbnN0YW5jZSk7XG4gIC8vIGFwaS5jb25zdHJ1Y3RvciA9IE5vZGVBcGk7XG4gIHBrSW5zdGFuY2UuYXBpID0gYXBpO1xuICBhcGlDYWNoZVtwa0luc3RhbmNlLmxvbmdOYW1lXSA9IGFwaTtcbiAgYXBpLmRlZmF1bHQgPSBhcGk7IC8vIEZvciBFUzYgaW1wb3J0IHN5bnRheFxuICByZXR1cm4gYXBpO1xufVxuXG5cbiJdfQ==