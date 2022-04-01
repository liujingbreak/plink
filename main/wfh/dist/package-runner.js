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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapPackagesByType = exports.prepareLazyNodeInjector = exports.initInjectorForNodePackages = exports.runPackages = exports.runSinglePackage = exports.runServer = exports.readPriorityProperty = exports.isServerPackage = void 0;
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable  max-len */
const path_1 = __importDefault(require("path"));
const _ = __importStar(require("lodash"));
const log4js_1 = __importDefault(require("log4js"));
const chalk_1 = __importDefault(require("chalk"));
const op = __importStar(require("rxjs/operators"));
const rx = __importStar(require("rxjs"));
const package_info_gathering_1 = require("./package-mgr/package-info-gathering");
const injector_factory_1 = require("./injector-factory");
const package_priority_helper_1 = require("./package-priority-helper");
const packageNodeInstance_1 = __importDefault(require("./packageNodeInstance"));
const package_utils_1 = require("./package-utils");
const package_mgr_1 = require("./package-mgr");
const package_list_helper_1 = require("./package-mgr/package-list-helper");
const misc_1 = require("./utils/misc");
const log = log4js_1.default.getLogger('plink.package-runner');
function isServerPackage(pkg) {
    const plinkProp = pkg.json.plink || pkg.json.dr;
    return plinkProp && (plinkProp.type === 'server' || (Array.isArray(plinkProp.type) && plinkProp.type.includes('server')));
}
exports.isServerPackage = isServerPackage;
function readPriorityProperty(json) {
    return _.get(json, 'plink.serverPriority', _.get(json, 'dr.serverPriority'));
}
exports.readPriorityProperty = readPriorityProperty;
function runServer() {
    let wsKey = (0, package_mgr_1.workspaceKey)((0, misc_1.getWorkDir)());
    wsKey = (0, package_mgr_1.getState)().workspaces.has(wsKey) ? wsKey : (0, package_mgr_1.getState)().currWorkspace;
    if (wsKey == null) {
        throw new Error('Current directory is not a workspace directory');
    }
    const pkgs = Array.from((0, package_list_helper_1.packages4WorkspaceKey)(wsKey, true))
        .filter(isServerPackage);
    const pkgNames = pkgs.map(item => item.name);
    const pkgEntryMap = new Map(pkgs.map(item => {
        const info = item.json.plink || item.json.dr;
        let mainFile = info.serverEntry || item.json.main;
        let funcName = 'activate';
        if (mainFile) {
            const tmp = mainFile.split('#');
            mainFile = tmp[0];
            if (tmp[1])
                funcName = tmp[1];
        }
        return [item.name, [mainFile, funcName]];
    }));
    const started = _runPackages(pkgNames, pkgName => pkgEntryMap.get(pkgName))
        .then(reverseOrderPkgExports => {
        return new Promise(resolve => setTimeout(() => {
            resolve(reverseOrderPkgExports);
        }, 500));
    });
    // const reverseOrderPkgExports = await runPackages('#activate', pkgs);
    // await new Promise(resolve => setTimeout(resolve, 500));
    return {
        started,
        async shutdown() {
            const reverseOrderPkgExports = await started;
            log.info('Shutting down');
            await rx.from(reverseOrderPkgExports).pipe(op.concatMap(({ name, exp }) => {
                log.info('deactivate', name);
                if (_.isFunction(exp.deactivate)) {
                    return rx.from(Promise.resolve(exp.deactivate())).pipe(op.timeoutWith(5000, rx.of(`deactivate ${name} timeout`)), op.catchError(err => {
                        log.warn(err);
                        return rx.EMPTY;
                    }));
                }
                return rx.EMPTY;
            })).toPromise();
            log.info('Shutdown completed');
        }
    };
}
exports.runServer = runServer;
const apiCache = {};
// const packageTree = new DirTree<PackageInstance>();
/**
 * Lazily init injector for packages and run specific package only,
 * no fully scanning or ordering on all packages
 */
async function runSinglePackage({ target, args }) {
    if (!(0, package_mgr_1.isCwdWorkspace)()) {
        return Promise.reject(new Error('Current directory is not a workspace directory'));
    }
    const [pkgInfo] = initInjectorForNodePackages();
    const [file, func] = target.split('#');
    const pkgNameMatch = /((?:@[^/]+\/)?[a-zA-Z0-9_-]+)\/$/.exec(file);
    let moduleName = path_1.default.resolve(file);
    if (pkgNameMatch && pkgNameMatch[1] && _.has(pkgInfo.moduleMap, pkgNameMatch[1])) {
        moduleName = file;
    }
    const _exports = require(path_1.default.resolve((0, misc_1.getWorkDir)(), 'node_modules', moduleName));
    if (!_.has(_exports, func)) {
        log.error(`There is no export function: ${func}, existing export members are:\n` +
            `${Object.keys(_exports).filter(name => typeof (_exports[name]) === 'function').map(name => name + '()').join('\n')}`);
        return;
    }
    await Promise.resolve(_exports[func].apply(global, args || []));
}
exports.runSinglePackage = runSinglePackage;
function runPackages(target, includePackages) {
    return _runPackages(includePackages, () => target.split('#'));
}
exports.runPackages = runPackages;
async function _runPackages(includePackages, targetOfPkg) {
    const includeNameSet = new Set(includePackages);
    const pkgExportsInDescendOrder = [];
    const [packageInfo, proto] = initInjectorForNodePackages();
    const components = packageInfo.allModules.filter(pk => {
        const target = targetOfPkg(pk.name);
        if (target == null)
            return false;
        const [fileToRun] = target;
        // setupRequireInjects(pk, NodeApi); // All component package should be able to access '__api', even they are not included
        if ((includeNameSet.size === 0 || includeNameSet.has(pk.longName) || includeNameSet.has(pk.shortName))) {
            try {
                if (fileToRun)
                    require.resolve(path_1.default.resolve((0, misc_1.getWorkDir)(), 'node_modules', pk.longName, fileToRun));
                else
                    require.resolve(path_1.default.resolve((0, misc_1.getWorkDir)(), 'node_modules', pk.longName));
                return true;
            }
            catch (err) {
                return false;
            }
        }
        return false;
    });
    const packageNamesInOrder = [];
    const NodeApi = require('./package-mgr/node-package-api').default;
    await (0, package_priority_helper_1.orderPackages)(components.map(item => ({
        name: item.longName,
        priority: _.get(item.json, 'plink.serverPriority', _.get(item.json, 'dr.serverPriority'))
    })), pkInstance => {
        const [fileToRun, funcToRun] = targetOfPkg(pkInstance.name);
        packageNamesInOrder.push(pkInstance.name);
        const mod = pkInstance.name + (fileToRun ? '/' + fileToRun : '');
        log.debug('require(%sf)', JSON.stringify(mod));
        const fileExports = require(path_1.default.resolve((0, misc_1.getWorkDir)(), 'node_modules', mod));
        pkgExportsInDescendOrder.unshift({ name: pkInstance.name, exp: fileExports });
        if (_.isFunction(fileExports[funcToRun])) {
            log.info(funcToRun + ` ${chalk_1.default.cyan(mod)}`);
            return fileExports[funcToRun](getApiForPackage(packageInfo.moduleMap[pkInstance.name], NodeApi));
        }
    });
    (proto.eventBus).emit('done', {});
    NodeApi.prototype.eventBus.emit('packagesActivated', includeNameSet);
    return pkgExportsInDescendOrder;
}
/**
 * So that we can use `import api from '__plink'` anywhere in our package
 */
function initInjectorForNodePackages() {
    const { getPkgOfFile, packageInfo } = (0, package_info_gathering_1.packageOfFileFactory)();
    // const packageInfo: PackageInfo = walkPackages();
    const NodeApi = require('./package-mgr/node-package-api').default;
    const proto = NodeApi.prototype;
    proto.argv = {};
    proto.packageInfo = packageInfo;
    proto.findPackageByFile = getPkgOfFile;
    proto.getNodeApiForPackage = function (packageInstance) {
        return getApiForPackage(packageInstance, NodeApi);
    };
    proto.browserInjector = injector_factory_1.webInjector;
    packageInfo.allModules.forEach(pk => {
        setupRequireInjects(pk, NodeApi); // All component package should be able to access '__api', even they are not included
    });
    injector_factory_1.nodeInjector.readInjectFile();
    injector_factory_1.webInjector.readInjectFile('module-resolve.browser');
    return [packageInfo, proto];
}
exports.initInjectorForNodePackages = initInjectorForNodePackages;
/**
 * @deprecated
 * Support `import api from '__api';`
 * @param argv
 */
function prepareLazyNodeInjector(argv) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const NodeApi = require('./package-mgr/node-package-api').default;
    const proto = NodeApi.prototype;
    proto.argv = argv || {};
    let packageInfo;
    Object.defineProperty(proto, 'packageInfo', {
        get() {
            if (packageInfo == null)
                packageInfo = (0, package_info_gathering_1.walkPackages)();
            return packageInfo;
        }
    });
    proto.findPackageByFile = (0, package_utils_1.createLazyPackageFileFinder)();
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
    for (const pkg of (0, package_utils_1.packages4Workspace)()) {
        const name = pkg.name;
        const pkInstance = new packageNodeInstance_1.default({
            moduleName: name,
            shortName: pkg.shortName,
            name,
            longName: name,
            scope: pkg.scope,
            path: path_1.default.resolve((0, misc_1.getWorkDir)(), pkg.path),
            json: pkg.json,
            realPath: pkg.realPath
        });
        const drTypes = [].concat(_.get(pkg.json, 'plink.type', _.get(pkg.json, 'dr.type')));
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
function setupRequireInjects(pkInstance, NodeApi) {
    function apiFactory() {
        return getApiForPackage(pkInstance, NodeApi);
    }
    injector_factory_1.nodeInjector.addPackage(pkInstance.longName, pkInstance.realPath, pkInstance.path === pkInstance.realPath ? undefined : pkInstance.path);
    injector_factory_1.nodeInjector.fromDir(pkInstance.realPath)
        .value('__injector', injector_factory_1.nodeInjector)
        .factory('__api', apiFactory)
        .factory('__plink', apiFactory);
    // webInjector.fromDir(pkInstance.realPath)
    // .replaceCode('__api', '__api');
    // .substitute(/^([^{]*)\{locale\}(.*)$/,
    //   (_filePath: string, match: RegExpExecArray) => match[1] + apiPrototype.getBuildLocale() + match[2]);
    const symlinkDir = pkInstance.path !== pkInstance.realPath ? pkInstance.path : null;
    if (symlinkDir) {
        injector_factory_1.nodeInjector.fromDir(symlinkDir)
            .value('__injector', injector_factory_1.nodeInjector)
            .factory('__plink', apiFactory);
        // webInjector.fromDir(symlinkDir)
        // .replaceCode('__api', '__api');
    }
}
function getApiForPackage(pkInstance, NodeApi) {
    if (_.has(apiCache, pkInstance.longName)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return apiCache[pkInstance.longName];
    }
    const api = new NodeApi(pkInstance.longName, pkInstance);
    apiCache[pkInstance.longName] = api;
    api.default = api; // For ES6 import syntax
    return api;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wYWNrYWdlLXJ1bm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNERBQTREO0FBQzVELDZCQUE2QjtBQUM3QixnREFBd0I7QUFDeEIsMENBQTRCO0FBQzVCLG9EQUE0QjtBQUM1QixrREFBMEI7QUFDMUIsbURBQXFDO0FBQ3JDLHlDQUEyQjtBQUMzQixpRkFBcUc7QUFDckcseURBQStEO0FBRy9ELHVFQUEwRDtBQUMxRCxnRkFBZ0Q7QUFFaEQsbURBQWdGO0FBQ2hGLCtDQUFrRztBQUNsRywyRUFBd0U7QUFFeEUsdUNBQXdDO0FBRXhDLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLHNCQUFzQixDQUFDLENBQUM7QUFZckQsU0FBZ0IsZUFBZSxDQUFDLEdBQWlCO0lBQy9DLE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO0lBQ2hELE9BQU8sU0FBUyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksS0FBSyxRQUFRLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUgsQ0FBQztBQUhELDBDQUdDO0FBRUQsU0FBZ0Isb0JBQW9CLENBQUMsSUFBUztJQUM1QyxPQUFPLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLHNCQUFzQixFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLG1CQUFtQixDQUFDLENBQUMsQ0FBQztBQUMvRSxDQUFDO0FBRkQsb0RBRUM7QUFFRCxTQUFnQixTQUFTO0lBSXZCLElBQUksS0FBSyxHQUE4QixJQUFBLDBC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UUFFaEMsa0NBQWtDO1FBQ2xDLGtDQUFrQztLQUNuQztBQUNILENBQUM7QUFFRCxTQUFTLGdCQUFnQixDQUFDLFVBQXVCLEVBQUUsT0FBd0I7SUFDekUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsUUFBUSxDQUFDLEVBQUU7UUFDeEMsK0RBQStEO1FBQy9ELE9BQU8sUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsQ0FBQztLQUN0QztJQUVELE1BQU0sR0FBRyxHQUFHLElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLENBQUM7SUFDekQsUUFBUSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsR0FBRyxHQUFHLENBQUM7SUFDcEMsR0FBRyxDQUFDLE9BQU8sR0FBRyxHQUFHLENBQUMsQ0FBQyx3QkFBd0I7SUFDM0MsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50ICovXG4vKiBlc2xpbnQtZGlzYWJsZSAgbWF4LWxlbiAqL1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQge1BhY2thZ2VJbmZvLCBwYWNrYWdlT2ZGaWxlRmFjdG9yeSwgd2Fsa1BhY2thZ2VzfSBmcm9tICcuL3BhY2thZ2UtbWdyL3BhY2thZ2UtaW5mby1nYXRoZXJpbmcnO1xuaW1wb3J0IHsgbm9kZUluamVjdG9yLCB3ZWJJbmplY3RvciB9IGZyb20gJy4vaW5qZWN0b3ItZmFjdG9yeSc7XG5pbXBvcnQgX05vZGVBcGkgZnJvbSAnLi9wYWNrYWdlLW1nci9ub2RlLXBhY2thZ2UtYXBpJztcbmltcG9ydCBQYWNrYWdlSW5zdGFuY2UgZnJvbSAnLi9wYWNrYWdlTm9kZUluc3RhbmNlJztcbmltcG9ydCB7IG9yZGVyUGFja2FnZXMgfSBmcm9tICcuL3BhY2thZ2UtcHJpb3JpdHktaGVscGVyJztcbmltcG9ydCBOb2RlUGFja2FnZSBmcm9tICcuL3BhY2thZ2VOb2RlSW5zdGFuY2UnO1xuaW1wb3J0IHR5cGUge2RlZmF1bHQgYXMgRXh0ZW5zaW9uQ29udGV4dH0gZnJvbSAnLi9wYWNrYWdlLW1nci9ub2RlLXBhY2thZ2UtYXBpJztcbmltcG9ydCB7Y3JlYXRlTGF6eVBhY2thZ2VGaWxlRmluZGVyLCBwYWNrYWdlczRXb3Jrc3BhY2V9IGZyb20gJy4vcGFja2FnZS11dGlscyc7XG5pbXBvcnQge2lzQ3dkV29ya3NwYWNlLCBnZXRTdGF0ZSwgd29ya3NwYWNlS2V5LCBQYWNrYWdlSW5mbyBhcyBQYWNrYWdlU3RhdGV9IGZyb20gJy4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHtwYWNrYWdlczRXb3Jrc3BhY2VLZXl9IGZyb20gJy4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcic7XG5cbmltcG9ydCB7Z2V0V29ya0Rpcn0gZnJvbSAnLi91dGlscy9taXNjJztcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsucGFja2FnZS1ydW5uZXInKTtcblxuZXhwb3J0IGludGVyZmFjZSBTZXJ2ZXJSdW5uZXJFdmVudCB7XG4gIGZpbGU6IHN0cmluZztcbiAgZnVuY3Rpb25OYW1lOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBFeHRlbnNpb25FeHBvcnQge1xuICBhY3RpdmF0ZT8oY3R4OiBFeHRlbnNpb25Db250ZXh0KTogdm9pZCB8IFByb21pc2U8dm9pZD47XG4gIGRlYWN0aXZhdGU/KCk6IGFueTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGlzU2VydmVyUGFja2FnZShwa2c6IFBhY2thZ2VTdGF0ZSkge1xuICBjb25zdCBwbGlua1Byb3AgPSBwa2cuanNvbi5wbGluayB8fCBwa2cuanNvbi5kcjtcbiAgcmV0dXJuIHBsaW5rUHJvcCAmJiAocGxpbmtQcm9wLnR5cGUgPT09ICdzZXJ2ZXInIHx8IChBcnJheS5pc0FycmF5KHBsaW5rUHJvcC50eXBlKSAmJiBwbGlua1Byb3AudHlwZS5pbmNsdWRlcygnc2VydmVyJykpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlYWRQcmlvcml0eVByb3BlcnR5KGpzb246IGFueSkge1xuICByZXR1cm4gXy5nZXQoanNvbiwgJ3BsaW5rLnNlcnZlclByaW9yaXR5JywgXy5nZXQoanNvbiwgJ2RyLnNlcnZlclByaW9yaXR5JykpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcnVuU2VydmVyKCk6IHtcbiAgc3RhcnRlZDogUHJvbWlzZTx7bmFtZTogc3RyaW5nOyBleHA6ICBFeHRlbnNpb25FeHBvcnR9W10+O1xuICBzaHV0ZG93bigpOiBQcm9taXNlPHZvaWQ+XG59IHtcbiAgbGV0IHdzS2V5OiBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkID0gd29ya3NwYWNlS2V5KGdldFdvcmtEaXIoKSk7XG4gIHdzS2V5ID0gZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmhhcyh3c0tleSkgPyB3c0tleSA6IGdldFN0YXRlKCkuY3VycldvcmtzcGFjZTtcbiAgaWYgKHdzS2V5ID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0N1cnJlbnQgZGlyZWN0b3J5IGlzIG5vdCBhIHdvcmtzcGFjZSBkaXJlY3RvcnknKTtcbiAgfVxuICBjb25zdCBwa2dzID0gQXJyYXkuZnJvbShwYWNrYWdlczRXb3Jrc3BhY2VLZXkod3NLZXksIHRydWUpKVxuICAuZmlsdGVyKGlzU2VydmVyUGFja2FnZSk7XG5cbiAgY29uc3QgcGtnTmFtZXMgPSBwa2dzLm1hcChpdGVtID0+IGl0ZW0ubmFtZSk7XG4gIGNvbnN0IHBrZ0VudHJ5TWFwID0gbmV3IE1hcDxzdHJpbmcsIFtmaWxlOiBzdHJpbmcgfCB1bmRlZmluZWQsIGZ1bmM6IHN0cmluZ10+KHBrZ3MubWFwKGl0ZW0gPT4ge1xuICAgIGNvbnN0IGluZm8gPSBpdGVtLmpzb24ucGxpbmsgfHwgaXRlbS5qc29uLmRyITtcbiAgICBsZXQgbWFpbkZpbGUgPSBpbmZvLnNlcnZlckVudHJ5IHx8IGl0ZW0uanNvbi5tYWluIGFzIHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICBsZXQgZnVuY05hbWUgPSAnYWN0aXZhdGUnO1xuICAgIGlmIChtYWluRmlsZSkge1xuICAgICAgY29uc3QgdG1wID0gbWFpbkZpbGUuc3BsaXQoJyMnKTtcbiAgICAgIG1haW5GaWxlID0gdG1wWzBdO1xuICAgICAgaWYgKHRtcFsxXSlcbiAgICAgICAgZnVuY05hbWUgPSB0bXBbMV07XG4gICAgfVxuXG4gICAgcmV0dXJuIFtpdGVtLm5hbWUsIFttYWluRmlsZSwgZnVuY05hbWVdXTtcbiAgfSkpO1xuXG4gIGNvbnN0IHN0YXJ0ZWQgPSBfcnVuUGFja2FnZXMocGtnTmFtZXMsIHBrZ05hbWUgPT4gcGtnRW50cnlNYXAuZ2V0KHBrZ05hbWUpKVxuICAudGhlbihyZXZlcnNlT3JkZXJQa2dFeHBvcnRzID0+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2U8dHlwZW9mIHJldmVyc2VPcmRlclBrZ0V4cG9ydHM+KHJlc29sdmUgPT4gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICByZXNvbHZlKHJldmVyc2VPcmRlclBrZ0V4cG9ydHMpO1xuICAgIH0sIDUwMCkpO1xuICB9KTtcblxuICAvLyBjb25zdCByZXZlcnNlT3JkZXJQa2dFeHBvcnRzID0gYXdhaXQgcnVuUGFja2FnZXMoJyNhY3RpdmF0ZScsIHBrZ3MpO1xuXG4gIC8vIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCA1MDApKTtcbiAgcmV0dXJuIHtcbiAgICBzdGFydGVkLFxuICAgIGFzeW5jIHNodXRkb3duKCkge1xuICAgICAgY29uc3QgcmV2ZXJzZU9yZGVyUGtnRXhwb3J0cyA9IGF3YWl0IHN0YXJ0ZWQ7XG4gICAgICBsb2cuaW5mbygnU2h1dHRpbmcgZG93bicpO1xuICAgICAgYXdhaXQgcnguZnJvbShyZXZlcnNlT3JkZXJQa2dFeHBvcnRzKS5waXBlKFxuICAgICAgICBvcC5jb25jYXRNYXAoKHtuYW1lLCBleHB9KSA9PiB7XG4gICAgICAgICAgbG9nLmluZm8oJ2RlYWN0aXZhdGUnLCBuYW1lKTtcbiAgICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKGV4cC5kZWFjdGl2YXRlKSkge1xuICAgICAgICAgICAgcmV0dXJuIHJ4LmZyb20oUHJvbWlzZS5yZXNvbHZlKGV4cC5kZWFjdGl2YXRlKCkpKS5waXBlKFxuICAgICAgICAgICAgICBvcC50aW1lb3V0V2l0aCg1MDAwLCByeC5vZihgZGVhY3RpdmF0ZSAke25hbWV9IHRpbWVvdXRgKSksXG4gICAgICAgICAgICAgIG9wLmNhdGNoRXJyb3IoZXJyID0+IHtcbiAgICAgICAgICAgICAgICBsb2cud2FybihlcnIpO1xuICAgICAgICAgICAgICAgIHJldHVybiByeC5FTVBUWTtcbiAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJldHVybiByeC5FTVBUWTtcbiAgICAgICAgfSlcbiAgICAgICkudG9Qcm9taXNlKCk7XG4gICAgICBsb2cuaW5mbygnU2h1dGRvd24gY29tcGxldGVkJyk7XG4gICAgfVxuICB9O1xufVxuXG5jb25zdCBhcGlDYWNoZToge1tuYW1lOiBzdHJpbmddOiBhbnl9ID0ge307XG4vLyBjb25zdCBwYWNrYWdlVHJlZSA9IG5ldyBEaXJUcmVlPFBhY2thZ2VJbnN0YW5jZT4oKTtcblxuLyoqXG4gKiBMYXppbHkgaW5pdCBpbmplY3RvciBmb3IgcGFja2FnZXMgYW5kIHJ1biBzcGVjaWZpYyBwYWNrYWdlIG9ubHksXG4gKiBubyBmdWxseSBzY2FubmluZyBvciBvcmRlcmluZyBvbiBhbGwgcGFja2FnZXNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHJ1blNpbmdsZVBhY2thZ2Uoe3RhcmdldCwgYXJnc306IHt0YXJnZXQ6IHN0cmluZzsgYXJnczogc3RyaW5nW119KSB7XG4gIGlmICghaXNDd2RXb3Jrc3BhY2UoKSkge1xuICAgIHJldHVybiBQcm9taXNlLnJlamVjdChuZXcgRXJyb3IoJ0N1cnJlbnQgZGlyZWN0b3J5IGlzIG5vdCBhIHdvcmtzcGFjZSBkaXJlY3RvcnknKSk7XG4gIH1cbiAgY29uc3QgW3BrZ0luZm9dID0gaW5pdEluamVjdG9yRm9yTm9kZVBhY2thZ2VzKCk7XG5cbiAgY29uc3QgW2ZpbGUsIGZ1bmNdID0gdGFyZ2V0LnNwbGl0KCcjJyk7XG4gIGNvbnN0IHBrZ05hbWVNYXRjaCA9IC8oKD86QFteL10rXFwvKT9bYS16QS1aMC05Xy1dKylcXC8kLy5leGVjKGZpbGUpO1xuICBsZXQgbW9kdWxlTmFtZSA9IFBhdGgucmVzb2x2ZShmaWxlKTtcbiAgaWYgKHBrZ05hbWVNYXRjaCAmJiBwa2dOYW1lTWF0Y2hbMV0gJiYgXy5oYXMocGtnSW5mby5tb2R1bGVNYXAsIHBrZ05hbWVNYXRjaFsxXSkpIHtcbiAgICBtb2R1bGVOYW1lID0gZmlsZTtcbiAgfVxuICBjb25zdCBfZXhwb3J0cyA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKGdldFdvcmtEaXIoKSwgJ25vZGVfbW9kdWxlcycsIG1vZHVsZU5hbWUpKTtcbiAgaWYgKCFfLmhhcyhfZXhwb3J0cywgZnVuYykpIHtcbiAgICBsb2cuZXJyb3IoYFRoZXJlIGlzIG5vIGV4cG9ydCBmdW5jdGlvbjogJHtmdW5jfSwgZXhpc3RpbmcgZXhwb3J0IG1lbWJlcnMgYXJlOlxcbmAgK1xuICAgIGAke09iamVjdC5rZXlzKF9leHBvcnRzKS5maWx0ZXIobmFtZSA9PiB0eXBlb2YgKF9leHBvcnRzW25hbWVdKSA9PT0gJ2Z1bmN0aW9uJykubWFwKG5hbWUgPT4gbmFtZSArICcoKScpLmpvaW4oJ1xcbicpfWApO1xuICAgIHJldHVybjtcbiAgfVxuICBhd2FpdCBQcm9taXNlLnJlc29sdmUoX2V4cG9ydHNbZnVuY10uYXBwbHkoZ2xvYmFsLCBhcmdzIHx8IFtdKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBydW5QYWNrYWdlcyh0YXJnZXQ6IHN0cmluZywgaW5jbHVkZVBhY2thZ2VzOiBJdGVyYWJsZTxzdHJpbmc+KTogUHJvbWlzZTx7bmFtZTogc3RyaW5nOyBleHA6ICBFeHRlbnNpb25FeHBvcnR9W10+IHtcblxuICByZXR1cm4gX3J1blBhY2thZ2VzKGluY2x1ZGVQYWNrYWdlcywgKCkgPT4gdGFyZ2V0LnNwbGl0KCcjJykgYXMgW3N0cmluZywgc3RyaW5nXSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIF9ydW5QYWNrYWdlcyhpbmNsdWRlUGFja2FnZXM6IEl0ZXJhYmxlPHN0cmluZz4sXG4gIHRhcmdldE9mUGtnOiAocGtnOiBzdHJpbmcpID0+IFtmaWxlVG9SdW46IHN0cmluZyB8IHVuZGVmaW5lZCwgZnVuY1RvUnVuOiBzdHJpbmddIHwgdW5kZWZpbmVkIHwgbnVsbFxuKTogUHJvbWlzZTx7bmFtZTogc3RyaW5nOyBleHA6IEV4dGVuc2lvbkV4cG9ydH1bXT4ge1xuICBjb25zdCBpbmNsdWRlTmFtZVNldCA9IG5ldyBTZXQ8c3RyaW5nPihpbmNsdWRlUGFja2FnZXMpO1xuICBjb25zdCBwa2dFeHBvcnRzSW5EZXNjZW5kT3JkZXI6IHtuYW1lOiBzdHJpbmc7IGV4cDogRXh0ZW5zaW9uRXhwb3J0fVtdID0gW107XG5cbiAgY29uc3QgW3BhY2thZ2VJbmZvLCBwcm90b10gPSBpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMoKTtcbiAgY29uc3QgY29tcG9uZW50cyA9IHBhY2thZ2VJbmZvLmFsbE1vZHVsZXMuZmlsdGVyKHBrID0+IHtcbiAgICBjb25zdCB0YXJnZXQgPSB0YXJnZXRPZlBrZyhway5uYW1lKTtcbiAgICBpZiAodGFyZ2V0ID09IG51bGwpXG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgY29uc3QgW2ZpbGVUb1J1bl0gPSB0YXJnZXQ7XG4gICAgLy8gc2V0dXBSZXF1aXJlSW5qZWN0cyhwaywgTm9kZUFwaSk7IC8vIEFsbCBjb21wb25lbnQgcGFja2FnZSBzaG91bGQgYmUgYWJsZSB0byBhY2Nlc3MgJ19fYXBpJywgZXZlbiB0aGV5IGFyZSBub3QgaW5jbHVkZWRcbiAgICBpZiAoKGluY2x1ZGVOYW1lU2V0LnNpemUgPT09IDAgfHwgaW5jbHVkZU5hbWVTZXQuaGFzKHBrLmxvbmdOYW1lKSB8fCBpbmNsdWRlTmFtZVNldC5oYXMocGsuc2hvcnROYW1lKSkpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGlmIChmaWxlVG9SdW4pXG4gICAgICAgICAgcmVxdWlyZS5yZXNvbHZlKFBhdGgucmVzb2x2ZShnZXRXb3JrRGlyKCksICdub2RlX21vZHVsZXMnLCBway5sb25nTmFtZSwgZmlsZVRvUnVuKSk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICByZXF1aXJlLnJlc29sdmUoUGF0aC5yZXNvbHZlKGdldFdvcmtEaXIoKSwgJ25vZGVfbW9kdWxlcycsIHBrLmxvbmdOYW1lKSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9KTtcblxuICBjb25zdCBwYWNrYWdlTmFtZXNJbk9yZGVyOiBzdHJpbmdbXSA9IFtdO1xuICBjb25zdCBOb2RlQXBpOiB0eXBlb2YgX05vZGVBcGkgPSByZXF1aXJlKCcuL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGknKS5kZWZhdWx0O1xuXG5cbiAgYXdhaXQgb3JkZXJQYWNrYWdlcyhjb21wb25lbnRzLm1hcChpdGVtID0+ICh7XG4gICAgbmFtZTogaXRlbS5sb25nTmFtZSxcbiAgICBwcmlvcml0eTogXy5nZXQoaXRlbS5qc29uLCAncGxpbmsuc2VydmVyUHJpb3JpdHknLCBfLmdldChpdGVtLmpzb24sICdkci5zZXJ2ZXJQcmlvcml0eScpKVxuICB9KSksXG4gICAgcGtJbnN0YW5jZSAgPT4ge1xuICAgICAgY29uc3QgW2ZpbGVUb1J1biwgZnVuY1RvUnVuXSA9IHRhcmdldE9mUGtnKHBrSW5zdGFuY2UubmFtZSkhO1xuICAgICAgcGFja2FnZU5hbWVzSW5PcmRlci5wdXNoKHBrSW5zdGFuY2UubmFtZSk7XG4gICAgICBjb25zdCBtb2QgPSBwa0luc3RhbmNlLm5hbWUgKyAoIGZpbGVUb1J1biA/ICcvJyArIGZpbGVUb1J1biA6ICcnKTtcbiAgICAgIGxvZy5kZWJ1ZygncmVxdWlyZSglc2YpJywgSlNPTi5zdHJpbmdpZnkobW9kKSk7XG4gICAgICBjb25zdCBmaWxlRXhwb3J0cyA9IHJlcXVpcmUoUGF0aC5yZXNvbHZlKGdldFdvcmtEaXIoKSwgJ25vZGVfbW9kdWxlcycsIG1vZCkpO1xuICAgICAgcGtnRXhwb3J0c0luRGVzY2VuZE9yZGVyLnVuc2hpZnQoe25hbWU6IHBrSW5zdGFuY2UubmFtZSwgZXhwOiBmaWxlRXhwb3J0c30pO1xuICAgICAgaWYgKF8uaXNGdW5jdGlvbihmaWxlRXhwb3J0c1tmdW5jVG9SdW5dKSkge1xuICAgICAgICBsb2cuaW5mbyhmdW5jVG9SdW4gKyBgICR7Y2hhbGsuY3lhbihtb2QpfWApO1xuICAgICAgICByZXR1cm4gZmlsZUV4cG9ydHNbZnVuY1RvUnVuXShnZXRBcGlGb3JQYWNrYWdlKHBhY2thZ2VJbmZvLm1vZHVsZU1hcFtwa0luc3RhbmNlLm5hbWVdLCBOb2RlQXBpKSk7XG4gICAgICB9XG4gIH0pO1xuICAocHJvdG8uZXZlbnRCdXMgKS5lbWl0KCdkb25lJywge30pO1xuICBOb2RlQXBpLnByb3RvdHlwZS5ldmVudEJ1cy5lbWl0KCdwYWNrYWdlc0FjdGl2YXRlZCcsIGluY2x1ZGVOYW1lU2V0KTtcbiAgcmV0dXJuIHBrZ0V4cG9ydHNJbkRlc2NlbmRPcmRlcjtcbn1cblxuLyoqXG4gKiBTbyB0aGF0IHdlIGNhbiB1c2UgYGltcG9ydCBhcGkgZnJvbSAnX19wbGluaydgIGFueXdoZXJlIGluIG91ciBwYWNrYWdlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMoKTpcbiAgW1BhY2thZ2VJbmZvLCBfTm9kZUFwaV0ge1xuICBjb25zdCB7Z2V0UGtnT2ZGaWxlLCBwYWNrYWdlSW5mb30gPSBwYWNrYWdlT2ZGaWxlRmFjdG9yeSgpO1xuICAvLyBjb25zdCBwYWNrYWdlSW5mbzogUGFja2FnZUluZm8gPSB3YWxrUGFja2FnZXMoKTtcbiAgY29uc3QgTm9kZUFwaSA9IHJlcXVpcmUoJy4vcGFja2FnZS1tZ3Ivbm9kZS1wYWNrYWdlLWFwaScpLmRlZmF1bHQgYXMgdHlwZW9mIF9Ob2RlQXBpO1xuICBjb25zdCBwcm90byA9IE5vZGVBcGkucHJvdG90eXBlO1xuICBwcm90by5hcmd2ID0ge307XG4gIHByb3RvLnBhY2thZ2VJbmZvID0gcGFja2FnZUluZm87XG5cbiAgcHJvdG8uZmluZFBhY2thZ2VCeUZpbGUgPSBnZXRQa2dPZkZpbGU7XG4gIHByb3RvLmdldE5vZGVBcGlGb3JQYWNrYWdlID0gZnVuY3Rpb24ocGFja2FnZUluc3RhbmNlOiBQYWNrYWdlSW5zdGFuY2UpIHtcbiAgICByZXR1cm4gZ2V0QXBpRm9yUGFja2FnZShwYWNrYWdlSW5zdGFuY2UsIE5vZGVBcGkpO1xuICB9O1xuICBwcm90by5icm93c2VySW5qZWN0b3IgPSB3ZWJJbmplY3RvcjtcbiAgcGFja2FnZUluZm8uYWxsTW9kdWxlcy5mb3JFYWNoKHBrID0+IHtcbiAgICBzZXR1cFJlcXVpcmVJbmplY3RzKHBrLCBOb2RlQXBpKTsgLy8gQWxsIGNvbXBvbmVudCBwYWNrYWdlIHNob3VsZCBiZSBhYmxlIHRvIGFjY2VzcyAnX19hcGknLCBldmVuIHRoZXkgYXJlIG5vdCBpbmNsdWRlZFxuICB9KTtcbiAgbm9kZUluamVjdG9yLnJlYWRJbmplY3RGaWxlKCk7XG4gIHdlYkluamVjdG9yLnJlYWRJbmplY3RGaWxlKCdtb2R1bGUtcmVzb2x2ZS5icm93c2VyJyk7XG4gIHJldHVybiBbcGFja2FnZUluZm8sIHByb3RvXTtcbn1cblxuLyoqXG4gKiBAZGVwcmVjYXRlZFxuICogU3VwcG9ydCBgaW1wb3J0IGFwaSBmcm9tICdfX2FwaSc7YFxuICogQHBhcmFtIGFyZ3YgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwcmVwYXJlTGF6eU5vZGVJbmplY3Rvcihhcmd2Pzoge1trZXk6IHN0cmluZ106IGFueX0pIHtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtbWVtYmVyLWFjY2Vzc1xuICBjb25zdCBOb2RlQXBpOiB0eXBlb2YgX05vZGVBcGkgPSByZXF1aXJlKCcuL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGknKS5kZWZhdWx0O1xuICBjb25zdCBwcm90byA9IE5vZGVBcGkucHJvdG90eXBlO1xuICBwcm90by5hcmd2ID0gYXJndiB8fCB7fTtcbiAgbGV0IHBhY2thZ2VJbmZvOiBQYWNrYWdlSW5mbztcblxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkocHJvdG8sICdwYWNrYWdlSW5mbycsIHtcbiAgICBnZXQoKSB7XG4gICAgICBpZiAocGFja2FnZUluZm8gPT0gbnVsbClcbiAgICAgICAgcGFja2FnZUluZm8gPSB3YWxrUGFja2FnZXMoKTtcbiAgICAgIHJldHVybiBwYWNrYWdlSW5mbztcbiAgICB9XG4gIH0pO1xuICBwcm90by5maW5kUGFja2FnZUJ5RmlsZSA9IGNyZWF0ZUxhenlQYWNrYWdlRmlsZUZpbmRlcigpO1xuICBwcm90by5nZXROb2RlQXBpRm9yUGFja2FnZSA9IGZ1bmN0aW9uKHBhY2thZ2VJbnN0YW5jZTogTm9kZVBhY2thZ2UpIHtcbiAgICByZXR1cm4gZ2V0QXBpRm9yUGFja2FnZShwYWNrYWdlSW5zdGFuY2UsIE5vZGVBcGkpO1xuICB9O1xuICBub2RlSW5qZWN0b3IuZnJvbVJvb3QoKVxuICAvLyAuYWxpYXMoJ2xvZzRqcycsIFBhdGgucmVzb2x2ZShjb25maWcoKS5yb290UGF0aCwgJ25vZGVfbW9kdWxlcy9sb2c0anMnKSlcbiAgLnZhbHVlKCdfX2luamVjdG9yJywgbm9kZUluamVjdG9yKVxuICAuZmFjdG9yeSgnX19hcGknLCAoc291cmNlRmlsZVBhdGg6IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IHBhY2thZ2VJbnN0YW5jZSA9IHByb3RvLmZpbmRQYWNrYWdlQnlGaWxlKHNvdXJjZUZpbGVQYXRoKTtcbiAgICBpZiAocGFja2FnZUluc3RhbmNlKVxuICAgICAgcmV0dXJuIGdldEFwaUZvclBhY2thZ2UocGFja2FnZUluc3RhbmNlLCBOb2RlQXBpKTtcbiAgICByZXR1cm4gbnVsbDtcbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtYXBQYWNrYWdlc0J5VHlwZSh0eXBlczogc3RyaW5nW10sIG9uRWFjaFBhY2thZ2U6IChub2RlUGFja2FnZTogTm9kZVBhY2thZ2UpID0+IHZvaWQpIHtcbiAgY29uc3QgcGFja2FnZXNNYXA6IHtbdHlwZTogc3RyaW5nXTogTm9kZVBhY2thZ2VbXX0gPSB7fTtcbiAgdHlwZXMuZm9yRWFjaCh0eXBlID0+IHtcbiAgICBwYWNrYWdlc01hcFt0eXBlXSA9IFtdO1xuICB9KTtcblxuICBmb3IgKGNvbnN0IHBrZyBvZiBwYWNrYWdlczRXb3Jrc3BhY2UoKSkge1xuICAgIGNvbnN0IG5hbWUgPSBwa2cubmFtZTtcbiAgICBjb25zdCBwa0luc3RhbmNlID0gbmV3IE5vZGVQYWNrYWdlKHtcbiAgICAgIG1vZHVsZU5hbWU6IG5hbWUsXG4gICAgICBzaG9ydE5hbWU6IHBrZy5zaG9ydE5hbWUsXG4gICAgICBuYW1lLFxuICAgICAgbG9uZ05hbWU6IG5hbWUsXG4gICAgICBzY29wZTogcGtnLnNjb3BlLFxuICAgICAgcGF0aDogUGF0aC5yZXNvbHZlKGdldFdvcmtEaXIoKSwgcGtnLnBhdGgpLFxuICAgICAganNvbjogcGtnLmpzb24sXG4gICAgICByZWFsUGF0aDogcGtnLnJlYWxQYXRoXG4gICAgfSk7XG4gICAgY29uc3QgZHJUeXBlcyA9IChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KF8uZ2V0KHBrZy5qc29uLCAncGxpbmsudHlwZScsIF8uZ2V0KHBrZy5qc29uLCAnZHIudHlwZScpKSk7XG4gICAgZm9yIChjb25zdCB0eXBlIG9mIHR5cGVzKSB7XG4gICAgICBpZiAoIV8uaW5jbHVkZXMoZHJUeXBlcywgdHlwZSkpXG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgcGFja2FnZXNNYXBbdHlwZV0ucHVzaChwa0luc3RhbmNlKTtcbiAgICB9XG4gICAgaWYgKG9uRWFjaFBhY2thZ2UpIHtcbiAgICAgIG9uRWFjaFBhY2thZ2UocGtJbnN0YW5jZSk7XG4gICAgfVxuICB9XG4gIHJldHVybiBwYWNrYWdlc01hcDtcbn1cblxuZnVuY3Rpb24gc2V0dXBSZXF1aXJlSW5qZWN0cyhwa0luc3RhbmNlOiBQYWNrYWdlSW5zdGFuY2UsIE5vZGVBcGk6IHR5cGVvZiBfTm9kZUFwaSApIHtcbiAgZnVuY3Rpb24gYXBpRmFjdG9yeSgpIHtcbiAgICByZXR1cm4gZ2V0QXBpRm9yUGFja2FnZShwa0luc3RhbmNlLCBOb2RlQXBpKSBhcyB1bmtub3duO1xuICB9XG4gIG5vZGVJbmplY3Rvci5hZGRQYWNrYWdlKHBrSW5zdGFuY2UubG9uZ05hbWUsIHBrSW5zdGFuY2UucmVhbFBhdGgsXG4gICAgcGtJbnN0YW5jZS5wYXRoID09PSBwa0luc3RhbmNlLnJlYWxQYXRoID8gdW5kZWZpbmVkIDogcGtJbnN0YW5jZS5wYXRoKTtcbiAgbm9kZUluamVjdG9yLmZyb21EaXIocGtJbnN0YW5jZS5yZWFsUGF0aClcbiAgLnZhbHVlKCdfX2luamVjdG9yJywgbm9kZUluamVjdG9yKVxuICAuZmFjdG9yeSgnX19hcGknLCBhcGlGYWN0b3J5KVxuICAuZmFjdG9yeSgnX19wbGluaycsIGFwaUZhY3RvcnkpO1xuXG4gIC8vIHdlYkluamVjdG9yLmZyb21EaXIocGtJbnN0YW5jZS5yZWFsUGF0aClcbiAgLy8gLnJlcGxhY2VDb2RlKCdfX2FwaScsICdfX2FwaScpO1xuICAvLyAuc3Vic3RpdHV0ZSgvXihbXntdKilcXHtsb2NhbGVcXH0oLiopJC8sXG4gIC8vICAgKF9maWxlUGF0aDogc3RyaW5nLCBtYXRjaDogUmVnRXhwRXhlY0FycmF5KSA9PiBtYXRjaFsxXSArIGFwaVByb3RvdHlwZS5nZXRCdWlsZExvY2FsZSgpICsgbWF0Y2hbMl0pO1xuICBjb25zdCBzeW1saW5rRGlyID0gcGtJbnN0YW5jZS5wYXRoICE9PSBwa0luc3RhbmNlLnJlYWxQYXRoID8gcGtJbnN0YW5jZS5wYXRoIDogbnVsbDtcbiAgaWYgKHN5bWxpbmtEaXIpIHtcbiAgICBub2RlSW5qZWN0b3IuZnJvbURpcihzeW1saW5rRGlyKVxuICAgIC52YWx1ZSgnX19pbmplY3RvcicsIG5vZGVJbmplY3RvcilcbiAgICAuZmFjdG9yeSgnX19wbGluaycsIGFwaUZhY3RvcnkpO1xuXG4gICAgLy8gd2ViSW5qZWN0b3IuZnJvbURpcihzeW1saW5rRGlyKVxuICAgIC8vIC5yZXBsYWNlQ29kZSgnX19hcGknLCAnX19hcGknKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXRBcGlGb3JQYWNrYWdlKHBrSW5zdGFuY2U6IE5vZGVQYWNrYWdlLCBOb2RlQXBpOiB0eXBlb2YgX05vZGVBcGkpIHtcbiAgaWYgKF8uaGFzKGFwaUNhY2hlLCBwa0luc3RhbmNlLmxvbmdOYW1lKSkge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLXJldHVyblxuICAgIHJldHVybiBhcGlDYWNoZVtwa0luc3RhbmNlLmxvbmdOYW1lXTtcbiAgfVxuXG4gIGNvbnN0IGFwaSA9IG5ldyBOb2RlQXBpKHBrSW5zdGFuY2UubG9uZ05hbWUsIHBrSW5zdGFuY2UpO1xuICBhcGlDYWNoZVtwa0luc3RhbmNlLmxvbmdOYW1lXSA9IGFwaTtcbiAgYXBpLmRlZmF1bHQgPSBhcGk7IC8vIEZvciBFUzYgaW1wb3J0IHN5bnRheFxuICByZXR1cm4gYXBpO1xufVxuIl19