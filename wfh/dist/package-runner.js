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
Object.defineProperty(exports, "__esModule", { value: true });
const _ = __importStar(require("lodash"));
// import Package from './packageNodeInstance';
const package_priority_helper_1 = require("./package-priority-helper");
const ts_1 = require("./build-util/ts");
const LRU = require('lru-cache');
const config = require('../lib/config');
const packageUtils = require('../lib/packageMgr/packageUtils');
// const NodeApi = require('../lib/nodeApi');
// const {nodeInjector} = require('../lib/injectorFactory');
const injector_factory_1 = require("./injector-factory");
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
    const NodeApi = require('../lib/nodeApi');
    const proto = NodeApi.prototype;
    proto.argv = argv;
    const packageInfo = ts_1.walkPackages(config, packageUtils);
    proto.packageInfo = packageInfo;
    const cache = LRU(20);
    proto.findPackageByFile = function (file) {
        var found = cache.get(file);
        if (!found) {
            found = packageInfo.dirTree.getAllData(file).pop();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wYWNrYWdlLXJ1bm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7OztBQUdBLDBDQUE0QjtBQUU1QiwrQ0FBK0M7QUFDL0MsdUVBQXdEO0FBQ3hELHdDQUE2QztBQUM3QyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDakMsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3hDLE1BQU0sWUFBWSxHQUFHLE9BQU8sQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDO0FBQy9ELDZDQUE2QztBQUM3Qyw0REFBNEQ7QUFDNUQseURBQTZEO0FBRTdELE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQU0xRCxNQUFhLFlBQVk7SUFLakIsY0FBYzs7WUFDbEIsR0FBRyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQztZQUMxQixNQUFNLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQztRQUMxRCxDQUFDO0tBQUE7SUFFZSxtQkFBbUIsQ0FBQyxLQUFvQjs7WUFDdEQsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUU7Z0JBQ3hCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQ25DLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUU7b0JBQ2hDLEdBQUcsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQztvQkFDdEMsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDO2lCQUN6QzthQUNGO1FBQ0gsQ0FB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QUcsR0FBRyxHQUFHLENBQUM7SUFDckIsUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsR0FBRyxHQUFHLENBQUM7SUFDcEMsR0FBRyxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUMsQ0FBQyx3QkFBd0I7SUFDM0MsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogdHNsaW50OmRpc2FibGUgbWF4LWxpbmUtbGVuZ3RoICovXG5pbXBvcnQgTm9kZVBhY2thZ2UgZnJvbSAnLi9wYWNrYWdlTm9kZUluc3RhbmNlJztcbmltcG9ydCBFdmVudHMgPSByZXF1aXJlKCdldmVudHMnKTtcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7UGFja2FnZUluZm8sIHBhY2thZ2VJbnN0YW5jZX0gZnJvbSAnLi9idWlsZC11dGlsL3RzJztcbi8vIGltcG9ydCBQYWNrYWdlIGZyb20gJy4vcGFja2FnZU5vZGVJbnN0YW5jZSc7XG5pbXBvcnQge29yZGVyUGFja2FnZXN9IGZyb20gJy4vcGFja2FnZS1wcmlvcml0eS1oZWxwZXInO1xuaW1wb3J0IHt3YWxrUGFja2FnZXN9IGZyb20gJy4vYnVpbGQtdXRpbC90cyc7XG5jb25zdCBMUlUgPSByZXF1aXJlKCdscnUtY2FjaGUnKTtcbmNvbnN0IGNvbmZpZyA9IHJlcXVpcmUoJy4uL2xpYi9jb25maWcnKTtcbmNvbnN0IHBhY2thZ2VVdGlscyA9IHJlcXVpcmUoJy4uL2xpYi9wYWNrYWdlTWdyL3BhY2thZ2VVdGlscycpO1xuLy8gY29uc3QgTm9kZUFwaSA9IHJlcXVpcmUoJy4uL2xpYi9ub2RlQXBpJyk7XG4vLyBjb25zdCB7bm9kZUluamVjdG9yfSA9IHJlcXVpcmUoJy4uL2xpYi9pbmplY3RvckZhY3RvcnknKTtcbmltcG9ydCB7d2ViSW5qZWN0b3IsIG5vZGVJbmplY3Rvcn0gZnJvbSAnLi9pbmplY3Rvci1mYWN0b3J5JztcblxuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdwYWNrYWdlLXJ1bm5lcicpO1xuXG5leHBvcnQgaW50ZXJmYWNlIFNlcnZlclJ1bm5lckV2ZW50IHtcbiAgZmlsZTogc3RyaW5nO1xuICBmdW5jdGlvbk5hbWU6IHN0cmluZztcbn1cbmV4cG9ydCBjbGFzcyBTZXJ2ZXJSdW5uZXIge1xuICAvLyBwYWNrYWdlQ2FjaGU6IHtbc2hvcnROYW1lOiBzdHJpbmddOiBOb2RlUGFja2FnZX0gPSB7fTtcbiAgLy8gY29yZVBhY2thZ2VzOiB7W3Nob3J0TmFtZTogc3RyaW5nXTogTm9kZVBhY2thZ2V9ID0ge307XG4gIGRlYWN0aXZhdGVQYWNrYWdlczogTm9kZVBhY2thZ2VbXTtcblxuICBhc3luYyBzaHV0ZG93blNlcnZlcigpIHtcbiAgICBsb2cuaW5mbygnc2h1dHRpbmcgZG93bicpO1xuICAgIGF3YWl0IHRoaXMuX2RlYWN0aXZhdGVQYWNrYWdlcyh0aGlzLmRlYWN0aXZhdGVQYWNrYWdlcyk7XG4gIH1cblxuICBwcm90ZWN0ZWQgYXN5bmMgX2RlYWN0aXZhdGVQYWNrYWdlcyhjb21wczogTm9kZVBhY2thZ2VbXSkge1xuICAgIGZvciAoY29uc3QgY29tcCBvZiBjb21wcykge1xuICAgICAgY29uc3QgZXhwID0gcmVxdWlyZShjb21wLmxvbmdOYW1lKTtcbiAgICAgIGlmIChfLmlzRnVuY3Rpb24oZXhwLmRlYWN0aXZhdGUpKSB7XG4gICAgICAgIGxvZy5pbmZvKCdkZWFjdGl2YXRlJywgY29tcC5sb25nTmFtZSk7XG4gICAgICAgIGF3YWl0IFByb21pc2UucmVzb2x2ZShleHAuZGVhY3RpdmF0ZSgpKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuY29uc3QgYXBpQ2FjaGU6IHtbbmFtZTogc3RyaW5nXTogYW55fSA9IHt9O1xuXG5leHBvcnQgZnVuY3Rpb24gcnVuUGFja2FnZXMoYXJndjoge3RhcmdldDogc3RyaW5nLCBwYWNrYWdlOiBzdHJpbmdbXSwgW2tleTogc3RyaW5nXTogYW55fSkge1xuICAvLyBjb25zdCBOb2RlQXBpID0gcmVxdWlyZSgnLi4vbGliL25vZGVBcGknKTtcbiAgY29uc3QgaW5jbHVkZU5hbWVTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgYXJndi5wYWNrYWdlLmZvckVhY2gobmFtZSA9PiBpbmNsdWRlTmFtZVNldC5hZGQobmFtZSkpO1xuICBjb25zdCBbZmlsZVRvUnVuLCBmdW5jVG9SdW5dID0gKGFyZ3YudGFyZ2V0IGFzIHN0cmluZykuc3BsaXQoJyMnKTtcbiAgY29uc3QgW3BhY2thZ2VzLCBwcm90b10gPSBpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMoYXJndik7XG4gIGNvbnN0IGNvbXBvbmVudHMgPSBwYWNrYWdlcy5maWx0ZXIocGsgPT4ge1xuICAgIC8vIHNldHVwTm9kZUluamVjdG9yRm9yKHBrLCBOb2RlQXBpKTsgLy8gQWxsIGNvbXBvbmVudCBwYWNrYWdlIHNob3VsZCBiZSBhYmxlIHRvIGFjY2VzcyAnX19hcGknLCBldmVuIHRoZXkgYXJlIG5vdCBpbmNsdWRlZFxuICAgIGlmICgoaW5jbHVkZU5hbWVTZXQuc2l6ZSA9PT0gMCB8fCBpbmNsdWRlTmFtZVNldC5oYXMocGsubG9uZ05hbWUpIHx8IGluY2x1ZGVOYW1lU2V0Lmhhcyhway5zaG9ydE5hbWUpKSAmJlxuICAgICAgcGsuZHIgIT0gbnVsbCkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVxdWlyZS5yZXNvbHZlKHBrLmxvbmdOYW1lICsgJy8nICsgZmlsZVRvUnVuKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xuICByZXR1cm4gb3JkZXJQYWNrYWdlcyhjb21wb25lbnRzLCAocGtJbnN0YW5jZTogcGFja2FnZUluc3RhbmNlKSAgPT4ge1xuICAgIGNvbnN0IG1vZCA9IHBrSW5zdGFuY2UubG9uZ05hbWUgKyAnLycgKyBmaWxlVG9SdW47XG4gICAgbG9nLmluZm8oJ3JlcXVpcmUoJXMpJywgSlNPTi5zdHJpbmdpZnkobW9kKSk7XG4gICAgY29uc3QgZmlsZUV4cG9ydHM6IGFueSA9IHJlcXVpcmUobW9kKTtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKGZpbGVFeHBvcnRzW2Z1bmNUb1J1bl0pKSB7XG4gICAgICBsb2cuaW5mbygnUnVuICVzICVzKCknLCBtb2QsIGZ1bmNUb1J1bik7XG4gICAgICByZXR1cm4gZmlsZUV4cG9ydHNbZnVuY1RvUnVuXSgpO1xuICAgIH1cbiAgfSlcbiAgLnRoZW4oKCkgPT4ge1xuICAgIChwcm90by5ldmVudEJ1cyBhcyBFdmVudHMpLmVtaXQoJ2RvbmUnLCB7ZmlsZTogZmlsZVRvUnVuLCBmdW5jdGlvbk5hbWU6IGZ1bmNUb1J1bn0gYXMgU2VydmVyUnVubmVyRXZlbnQpO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGluaXRJbmplY3RvckZvck5vZGVQYWNrYWdlcyhhcmd2OiB7W2tleTogc3RyaW5nXTogYW55fSk6XG4gIFtwYWNrYWdlSW5zdGFuY2VbXSwge2V2ZW50QnVzOiBFdmVudHN9XSB7XG4gIGNvbnN0IE5vZGVBcGkgPSByZXF1aXJlKCcuLi9saWIvbm9kZUFwaScpO1xuICBjb25zdCBwcm90byA9IE5vZGVBcGkucHJvdG90eXBlO1xuICBwcm90by5hcmd2ID0gYXJndjtcbiAgY29uc3QgcGFja2FnZUluZm86IFBhY2thZ2VJbmZvID0gd2Fsa1BhY2thZ2VzKGNvbmZpZywgcGFja2FnZVV0aWxzKTtcbiAgcHJvdG8ucGFja2FnZUluZm8gPSBwYWNrYWdlSW5mbztcbiAgY29uc3QgY2FjaGUgPSBMUlUoMjApO1xuICBwcm90by5maW5kUGFja2FnZUJ5RmlsZSA9IGZ1bmN0aW9uKGZpbGU6IHN0cmluZykge1xuICAgIHZhciBmb3VuZCA9IGNhY2hlLmdldChmaWxlKTtcbiAgICBpZiAoIWZvdW5kKSB7XG4gICAgICBmb3VuZCA9IHBhY2thZ2VJbmZvLmRpclRyZWUuZ2V0QWxsRGF0YShmaWxlKS5wb3AoKTtcbiAgICAgIGNhY2hlLnNldChmaWxlLCBmb3VuZCk7XG4gICAgfVxuICAgIHJldHVybiBmb3VuZDtcbiAgfTtcbiAgcHJvdG8uZ2V0Tm9kZUFwaUZvclBhY2thZ2UgPSBmdW5jdGlvbihwYWNrYWdlSW5zdGFuY2U6IGFueSkge1xuICAgIHJldHVybiBnZXRBcGlGb3JQYWNrYWdlKHBhY2thZ2VJbnN0YW5jZSwgTm9kZUFwaSk7XG4gIH07XG4gIGNvbnN0IGRyUGFja2FnZXMgPSBwYWNrYWdlSW5mby5hbGxNb2R1bGVzLmZpbHRlcihwayA9PiB7XG4gICAgaWYgKHBrLmRyKSB7XG4gICAgICBzZXR1cE5vZGVJbmplY3RvckZvcihwaywgTm9kZUFwaSk7IC8vIEFsbCBjb21wb25lbnQgcGFja2FnZSBzaG91bGQgYmUgYWJsZSB0byBhY2Nlc3MgJ19fYXBpJywgZXZlbiB0aGV5IGFyZSBub3QgaW5jbHVkZWRcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xuICByZXR1cm4gW2RyUGFja2FnZXMsIHByb3RvXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGluaXRXZWJJbmplY3RvcihwYWNrYWdlczogcGFja2FnZUluc3RhbmNlW10sIGFwaVByb3RvdHlwZTogYW55KSB7XG4gIF8uZWFjaChwYWNrYWdlcywgcGFjayA9PiB7XG4gICAgaWYgKHBhY2suZHIpIHtcbiAgICAgIC8vIG5vIHZlbmRvciBwYWNrYWdlJ3MgcGF0aCBpbmZvcm1hdGlvblxuICAgICAgd2ViSW5qZWN0b3IuYWRkUGFja2FnZShwYWNrLmxvbmdOYW1lLCBwYWNrLnBhY2thZ2VQYXRoKTtcbiAgICB9XG4gIH0pO1xuICB3ZWJJbmplY3Rvci5mcm9tQWxsUGFja2FnZXMoKVxuICAucmVwbGFjZUNvZGUoJ19fYXBpJywgJ19fYXBpJylcbiAgLnN1YnN0aXR1dGUoL14oW157XSopXFx7bG9jYWxlXFx9KC4qKSQvLFxuICAgIChfZmlsZVBhdGg6IHN0cmluZywgbWF0Y2g6IFJlZ0V4cEV4ZWNBcnJheSkgPT4gbWF0Y2hbMV0gKyBhcGlQcm90b3R5cGUuZ2V0QnVpbGRMb2NhbGUoKSArIG1hdGNoWzJdKTtcblxuICBjb25zdCBkb25lID0gd2ViSW5qZWN0b3IucmVhZEluamVjdEZpbGUoJ21vZHVsZS1yZXNvbHZlLmJyb3dzZXInKTtcbiAgYXBpUHJvdG90eXBlLmJyb3dzZXJJbmplY3RvciA9IHdlYkluamVjdG9yO1xuICByZXR1cm4gZG9uZTtcbn1cblxuZnVuY3Rpb24gc2V0dXBOb2RlSW5qZWN0b3JGb3IocGtJbnN0YW5jZTogcGFja2FnZUluc3RhbmNlLCBOb2RlQXBpOiBhbnkpIHtcbiAgZnVuY3Rpb24gYXBpRmFjdG9yeSgpIHtcbiAgICByZXR1cm4gZ2V0QXBpRm9yUGFja2FnZShwa0luc3RhbmNlLCBOb2RlQXBpKTtcbiAgfVxuICBub2RlSW5qZWN0b3IuZnJvbURpcihwa0luc3RhbmNlLnJlYWxQYWNrYWdlUGF0aClcbiAgLnZhbHVlKCdfX2luamVjdG9yJywgbm9kZUluamVjdG9yKVxuICAuZmFjdG9yeSgnX19hcGknLCBhcGlGYWN0b3J5KTtcbiAgbm9kZUluamVjdG9yLmZyb21EaXIocGtJbnN0YW5jZS5wYWNrYWdlUGF0aClcbiAgLnZhbHVlKCdfX2luamVjdG9yJywgbm9kZUluamVjdG9yKVxuICAuZmFjdG9yeSgnX19hcGknLCBhcGlGYWN0b3J5KTtcbiAgLy8gbm9kZUluamVjdG9yLmRlZmF1bHQgPSBub2RlSW5qZWN0b3I7IC8vIEZvciBFUzYgaW1wb3J0IHN5bnRheFxufVxuXG5mdW5jdGlvbiBnZXRBcGlGb3JQYWNrYWdlKHBrSW5zdGFuY2U6IGFueSwgTm9kZUFwaTogYW55KSB7XG4gIGlmIChfLmhhcyhhcGlDYWNoZSwgcGtJbnN0YW5jZS5sb25nTmFtZSkpIHtcbiAgICByZXR1cm4gYXBpQ2FjaGVbcGtJbnN0YW5jZS5sb25nTmFtZV07XG4gIH1cblxuICBjb25zdCBhcGkgPSBuZXcgTm9kZUFwaShwa0luc3RhbmNlLmxvbmdOYW1lLCBwa0luc3RhbmNlKTtcbiAgLy8gYXBpLmNvbnN0cnVjdG9yID0gTm9kZUFwaTtcbiAgcGtJbnN0YW5jZS5hcGkgPSBhcGk7XG4gIGFwaUNhY2hlW3BrSW5zdGFuY2UubG9uZ05hbWVdID0gYXBpO1xuICBhcGkuZGVmYXVsdCA9IGFwaTsgLy8gRm9yIEVTNiBpbXBvcnQgc3ludGF4XG4gIHJldHVybiBhcGk7XG59XG4iXX0=