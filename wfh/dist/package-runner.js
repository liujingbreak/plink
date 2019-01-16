"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const _ = tslib_1.__importStar(require("lodash"));
// import Package from './packageNodeInstance';
const package_priority_helper_1 = require("./package-priority-helper");
const ts_1 = require("./build-util/ts");
const LRU = require('lru-cache');
const config = require('../lib/config');
const packageUtils = require('../lib/packageMgr/packageUtils');
const NodeApi = require('../lib/nodeApi');
const { nodeInjector } = require('../lib/injectorFactory');
const log = require('log4js').getLogger('package-runner');
class ServerRunner {
    shutdownServer() {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
            log.info('shutting down');
            yield this._deactivatePackages(this.deactivatePackages);
        });
    }
    _deactivatePackages(comps) {
        return tslib_1.__awaiter(this, void 0, void 0, function* () {
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
    const includeNameSet = new Set();
    argv.package.forEach(name => includeNameSet.add(name));
    const [fileToRun, funcToRun] = argv.target.split('#');
    const NodeApi = require('../lib/nodeApi');
    const proto = NodeApi.prototype;
    proto.argv = argv;
    // const walkPackages = require('./build-util/ts').walkPackages;
    const packageInfo = ts_1.walkPackages(config, argv, packageUtils);
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
        return getApiForPackage(packageInstance);
    };
    const components = packageInfo.allModules.filter(pk => {
        setupNodeInjectorFor(pk); // All component package should be able to access '__api', even they are not included
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
function setupNodeInjectorFor(pkInstance) {
    function apiFactory() {
        return getApiForPackage(pkInstance);
    }
    nodeInjector.fromPackage(pkInstance.longName, pkInstance.realPackagePath)
        .value('__injector', nodeInjector)
        .factory('__api', apiFactory);
    nodeInjector.fromPackage(pkInstance.longName, pkInstance.packagePath)
        .value('__injector', nodeInjector)
        .factory('__api', apiFactory);
    nodeInjector.default = nodeInjector; // For ES6 import syntax
}
function getApiForPackage(pkInstance) {
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
//# sourceMappingURL=package-runner.js.map