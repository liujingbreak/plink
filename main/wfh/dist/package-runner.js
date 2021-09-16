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
const _ = __importStar(require("lodash"));
const package_info_gathering_1 = require("./package-mgr/package-info-gathering");
const injector_factory_1 = require("./injector-factory");
const package_priority_helper_1 = require("./package-priority-helper");
const packageNodeInstance_1 = __importDefault(require("./packageNodeInstance"));
const path_1 = __importDefault(require("path"));
const package_utils_1 = require("./package-utils");
const log4js_1 = __importDefault(require("log4js"));
const package_mgr_1 = require("./package-mgr");
const package_list_helper_1 = require("./package-mgr/package-list-helper");
const chalk_1 = __importDefault(require("chalk"));
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
            for (const { name, exp } of reverseOrderPkgExports) {
                if (_.isFunction(exp.deactivate)) {
                    log.info('deactivate', name);
                    await Promise.resolve(exp.deactivate());
                }
            }
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
    const pkgExportsInReverOrder = [];
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
        pkgExportsInReverOrder.unshift({ name: pkInstance.name, exp: fileExports });
        if (_.isFunction(fileExports[funcToRun])) {
            log.info(funcToRun + ` ${chalk_1.default.cyan(mod)}`);
            return fileExports[funcToRun](getApiForPackage(packageInfo.moduleMap[pkInstance.name], NodeApi));
        }
    });
    (proto.eventBus).emit('done', {});
    NodeApi.prototype.eventBus.emit('packagesActivated', includeNameSet);
    return pkgExportsInReverOrder;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wYWNrYWdlLXJ1bm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNERBQTREO0FBQzVELDZCQUE2QjtBQUM3QiwwQ0FBNEI7QUFDNUIsaUZBQXFHO0FBQ3JHLHlEQUErRDtBQUcvRCx1RUFBMEQ7QUFDMUQsZ0ZBQWdEO0FBQ2hELGdEQUF3QjtBQUN4QixtREFBZ0Y7QUFDaEYsb0RBQTRCO0FBQzVCLCtDQUFrRztBQUNsRywyRUFBd0U7QUFDeEUsa0RBQTBCO0FBRTFCLHVDQUF3QztBQUV4QyxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0FBT3JELFNBQWdCLGVBQWUsQ0FBQyxHQUFpQjtJQUMvQyxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztJQUNoRCxPQUFPLFNBQVMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEtBQUssUUFBUSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzVILENBQUM7QUFIRCwwQ0FHQztBQUVELFNBQWdCLG9CQUFvQixDQUFDLElBQVM7SUFDNUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxzQkFBc0IsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7QUFDL0UsQ0FBQztBQUZELG9EQUVDO0FBRUQsU0FBZ0IsU0FBUztJQUN2QixJQUFJLEtBQUssR0FBOEIsSUFBQSwwQkFBWSxFQUFDLElBQUEsaUJBQVUsR0FBRSxD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YixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyogZXNsaW50LWRpc2FibGUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50ICovXG4vKiBlc2xpbnQtZGlzYWJsZSAgbWF4LWxlbiAqL1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtQYWNrYWdlSW5mbywgcGFja2FnZU9mRmlsZUZhY3RvcnksIHdhbGtQYWNrYWdlc30gZnJvbSAnLi9wYWNrYWdlLW1nci9wYWNrYWdlLWluZm8tZ2F0aGVyaW5nJztcbmltcG9ydCB7IG5vZGVJbmplY3Rvciwgd2ViSW5qZWN0b3IgfSBmcm9tICcuL2luamVjdG9yLWZhY3RvcnknO1xuaW1wb3J0IF9Ob2RlQXBpIGZyb20gJy4vcGFja2FnZS1tZ3Ivbm9kZS1wYWNrYWdlLWFwaSc7XG5pbXBvcnQgUGFja2FnZUluc3RhbmNlIGZyb20gJy4vcGFja2FnZU5vZGVJbnN0YW5jZSc7XG5pbXBvcnQgeyBvcmRlclBhY2thZ2VzIH0gZnJvbSAnLi9wYWNrYWdlLXByaW9yaXR5LWhlbHBlcic7XG5pbXBvcnQgTm9kZVBhY2thZ2UgZnJvbSAnLi9wYWNrYWdlTm9kZUluc3RhbmNlJztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtjcmVhdGVMYXp5UGFja2FnZUZpbGVGaW5kZXIsIHBhY2thZ2VzNFdvcmtzcGFjZX0gZnJvbSAnLi9wYWNrYWdlLXV0aWxzJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7aXNDd2RXb3Jrc3BhY2UsIGdldFN0YXRlLCB3b3Jrc3BhY2VLZXksIFBhY2thZ2VJbmZvIGFzIFBhY2thZ2VTdGF0ZX0gZnJvbSAnLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQge3BhY2thZ2VzNFdvcmtzcGFjZUtleX0gZnJvbSAnLi9wYWNrYWdlLW1nci9wYWNrYWdlLWxpc3QtaGVscGVyJztcbmltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5cbmltcG9ydCB7Z2V0V29ya0Rpcn0gZnJvbSAnLi91dGlscy9taXNjJztcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsucGFja2FnZS1ydW5uZXInKTtcblxuZXhwb3J0IGludGVyZmFjZSBTZXJ2ZXJSdW5uZXJFdmVudCB7XG4gIGZpbGU6IHN0cmluZztcbiAgZnVuY3Rpb25OYW1lOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1NlcnZlclBhY2thZ2UocGtnOiBQYWNrYWdlU3RhdGUpIHtcbiAgY29uc3QgcGxpbmtQcm9wID0gcGtnLmpzb24ucGxpbmsgfHwgcGtnLmpzb24uZHI7XG4gIHJldHVybiBwbGlua1Byb3AgJiYgKHBsaW5rUHJvcC50eXBlID09PSAnc2VydmVyJyB8fCAoQXJyYXkuaXNBcnJheShwbGlua1Byb3AudHlwZSkgJiYgcGxpbmtQcm9wLnR5cGUuaW5jbHVkZXMoJ3NlcnZlcicpKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkUHJpb3JpdHlQcm9wZXJ0eShqc29uOiBhbnkpIHtcbiAgcmV0dXJuIF8uZ2V0KGpzb24sICdwbGluay5zZXJ2ZXJQcmlvcml0eScsIF8uZ2V0KGpzb24sICdkci5zZXJ2ZXJQcmlvcml0eScpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJ1blNlcnZlcigpOiB7c3RhcnRlZDogUHJvbWlzZTx1bmtub3duPjsgc2h1dGRvd24oKTogUHJvbWlzZTx2b2lkPn0ge1xuICBsZXQgd3NLZXk6IHN0cmluZyB8IG51bGwgfCB1bmRlZmluZWQgPSB3b3Jrc3BhY2VLZXkoZ2V0V29ya0RpcigpKTtcbiAgd3NLZXkgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuaGFzKHdzS2V5KSA/IHdzS2V5IDogZ2V0U3RhdGUoKS5jdXJyV29ya3NwYWNlO1xuICBpZiAod3NLZXkgPT0gbnVsbCkge1xuICAgIHRocm93IG5ldyBFcnJvcignQ3VycmVudCBkaXJlY3RvcnkgaXMgbm90IGEgd29ya3NwYWNlIGRpcmVjdG9yeScpO1xuICB9XG4gIGNvbnN0IHBrZ3MgPSBBcnJheS5mcm9tKHBhY2thZ2VzNFdvcmtzcGFjZUtleSh3c0tleSwgdHJ1ZSkpXG4gIC5maWx0ZXIoaXNTZXJ2ZXJQYWNrYWdlKTtcblxuICBjb25zdCBwa2dOYW1lcyA9IHBrZ3MubWFwKGl0ZW0gPT4gaXRlbS5uYW1lKTtcbiAgY29uc3QgcGtnRW50cnlNYXAgPSBuZXcgTWFwPHN0cmluZywgW2ZpbGU6IHN0cmluZyB8IHVuZGVmaW5lZCwgZnVuYzogc3RyaW5nXT4ocGtncy5tYXAoaXRlbSA9PiB7XG4gICAgY29uc3QgaW5mbyA9IGl0ZW0uanNvbi5wbGluayB8fCBpdGVtLmpzb24uZHIhO1xuICAgIGxldCBtYWluRmlsZSA9IGluZm8uc2VydmVyRW50cnkgfHwgaXRlbS5qc29uLm1haW4gYXMgc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAgIGxldCBmdW5jTmFtZSA9ICdhY3RpdmF0ZSc7XG4gICAgaWYgKG1haW5GaWxlKSB7XG4gICAgICBjb25zdCB0bXAgPSBtYWluRmlsZS5zcGxpdCgnIycpO1xuICAgICAgbWFpbkZpbGUgPSB0bXBbMF07XG4gICAgICBpZiAodG1wWzFdKVxuICAgICAgICBmdW5jTmFtZSA9IHRtcFsxXTtcbiAgICB9XG5cbiAgICByZXR1cm4gW2l0ZW0ubmFtZSwgW21haW5GaWxlLCBmdW5jTmFtZV1dO1xuICB9KSk7XG5cbiAgY29uc3Qgc3RhcnRlZCA9IF9ydW5QYWNrYWdlcyhwa2dOYW1lcywgcGtnTmFtZSA9PiBwa2dFbnRyeU1hcC5nZXQocGtnTmFtZSkpXG4gIC50aGVuKHJldmVyc2VPcmRlclBrZ0V4cG9ydHMgPT4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZTx0eXBlb2YgcmV2ZXJzZU9yZGVyUGtnRXhwb3J0cz4ocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHJlc29sdmUocmV2ZXJzZU9yZGVyUGtnRXhwb3J0cyk7XG4gICAgfSwgNTAwKSk7XG4gIH0pO1xuXG4gIC8vIGNvbnN0IHJldmVyc2VPcmRlclBrZ0V4cG9ydHMgPSBhd2FpdCBydW5QYWNrYWdlcygnI2FjdGl2YXRlJywgcGtncyk7XG5cbiAgLy8gYXdhaXQgbmV3IFByb21pc2UocmVzb2x2ZSA9PiBzZXRUaW1lb3V0KHJlc29sdmUsIDUwMCkpO1xuICByZXR1cm4ge1xuICAgIHN0YXJ0ZWQsXG4gICAgYXN5bmMgc2h1dGRvd24oKSB7XG4gICAgICBjb25zdCByZXZlcnNlT3JkZXJQa2dFeHBvcnRzID0gYXdhaXQgc3RhcnRlZDtcbiAgICAgIGxvZy5pbmZvKCdTaHV0dGluZyBkb3duJyk7XG4gICAgICBmb3IgKGNvbnN0IHtuYW1lLCBleHB9IG9mIHJldmVyc2VPcmRlclBrZ0V4cG9ydHMpIHtcbiAgICAgICAgaWYgKF8uaXNGdW5jdGlvbihleHAuZGVhY3RpdmF0ZSkpIHtcbiAgICAgICAgICBsb2cuaW5mbygnZGVhY3RpdmF0ZScsIG5hbWUpO1xuICAgICAgICAgIGF3YWl0IFByb21pc2UucmVzb2x2ZShleHAuZGVhY3RpdmF0ZSgpKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgbG9nLmluZm8oJ1NodXRkb3duIGNvbXBsZXRlZCcpO1xuICAgIH1cbiAgfTtcbn1cblxuY29uc3QgYXBpQ2FjaGU6IHtbbmFtZTogc3RyaW5nXTogYW55fSA9IHt9O1xuLy8gY29uc3QgcGFja2FnZVRyZWUgPSBuZXcgRGlyVHJlZTxQYWNrYWdlSW5zdGFuY2U+KCk7XG5cbi8qKlxuICogTGF6aWx5IGluaXQgaW5qZWN0b3IgZm9yIHBhY2thZ2VzIGFuZCBydW4gc3BlY2lmaWMgcGFja2FnZSBvbmx5LFxuICogbm8gZnVsbHkgc2Nhbm5pbmcgb3Igb3JkZXJpbmcgb24gYWxsIHBhY2thZ2VzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5TaW5nbGVQYWNrYWdlKHt0YXJnZXQsIGFyZ3N9OiB7dGFyZ2V0OiBzdHJpbmc7IGFyZ3M6IHN0cmluZ1tdfSkge1xuICBpZiAoIWlzQ3dkV29ya3NwYWNlKCkpIHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKCdDdXJyZW50IGRpcmVjdG9yeSBpcyBub3QgYSB3b3Jrc3BhY2UgZGlyZWN0b3J5JykpO1xuICB9XG4gIGNvbnN0IFtwa2dJbmZvXSA9IGluaXRJbmplY3RvckZvck5vZGVQYWNrYWdlcygpO1xuXG4gIGNvbnN0IFtmaWxlLCBmdW5jXSA9IHRhcmdldC5zcGxpdCgnIycpO1xuICBjb25zdCBwa2dOYW1lTWF0Y2ggPSAvKCg/OkBbXi9dK1xcLyk/W2EtekEtWjAtOV8tXSspXFwvJC8uZXhlYyhmaWxlKTtcbiAgbGV0IG1vZHVsZU5hbWUgPSBQYXRoLnJlc29sdmUoZmlsZSk7XG4gIGlmIChwa2dOYW1lTWF0Y2ggJiYgcGtnTmFtZU1hdGNoWzFdICYmIF8uaGFzKHBrZ0luZm8ubW9kdWxlTWFwLCBwa2dOYW1lTWF0Y2hbMV0pKSB7XG4gICAgbW9kdWxlTmFtZSA9IGZpbGU7XG4gIH1cbiAgY29uc3QgX2V4cG9ydHMgPSByZXF1aXJlKFBhdGgucmVzb2x2ZShnZXRXb3JrRGlyKCksICdub2RlX21vZHVsZXMnLCBtb2R1bGVOYW1lKSk7XG4gIGlmICghXy5oYXMoX2V4cG9ydHMsIGZ1bmMpKSB7XG4gICAgbG9nLmVycm9yKGBUaGVyZSBpcyBubyBleHBvcnQgZnVuY3Rpb246ICR7ZnVuY30sIGV4aXN0aW5nIGV4cG9ydCBtZW1iZXJzIGFyZTpcXG5gICtcbiAgICBgJHtPYmplY3Qua2V5cyhfZXhwb3J0cykuZmlsdGVyKG5hbWUgPT4gdHlwZW9mIChfZXhwb3J0c1tuYW1lXSkgPT09ICdmdW5jdGlvbicpLm1hcChuYW1lID0+IG5hbWUgKyAnKCknKS5qb2luKCdcXG4nKX1gKTtcbiAgICByZXR1cm47XG4gIH1cbiAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKF9leHBvcnRzW2Z1bmNdLmFwcGx5KGdsb2JhbCwgYXJncyB8fCBbXSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcnVuUGFja2FnZXModGFyZ2V0OiBzdHJpbmcsIGluY2x1ZGVQYWNrYWdlczogSXRlcmFibGU8c3RyaW5nPik6IFByb21pc2U8e25hbWU6IHN0cmluZzsgZXhwOiBhbnl9W10+IHtcblxuICByZXR1cm4gX3J1blBhY2thZ2VzKGluY2x1ZGVQYWNrYWdlcywgKCkgPT4gdGFyZ2V0LnNwbGl0KCcjJykgYXMgW3N0cmluZywgc3RyaW5nXSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIF9ydW5QYWNrYWdlcyhpbmNsdWRlUGFja2FnZXM6IEl0ZXJhYmxlPHN0cmluZz4sXG4gIHRhcmdldE9mUGtnOiAocGtnOiBzdHJpbmcpID0+IFtmaWxlVG9SdW46IHN0cmluZyB8IHVuZGVmaW5lZCwgZnVuY1RvUnVuOiBzdHJpbmddIHwgdW5kZWZpbmVkIHwgbnVsbFxuKTogUHJvbWlzZTx7bmFtZTogc3RyaW5nOyBleHA6IGFueX1bXT4ge1xuICBjb25zdCBpbmNsdWRlTmFtZVNldCA9IG5ldyBTZXQ8c3RyaW5nPihpbmNsdWRlUGFja2FnZXMpO1xuICBjb25zdCBwa2dFeHBvcnRzSW5SZXZlck9yZGVyOiB7bmFtZTogc3RyaW5nOyBleHA6IGFueX1bXSA9IFtdO1xuXG4gIGNvbnN0IFtwYWNrYWdlSW5mbywgcHJvdG9dID0gaW5pdEluamVjdG9yRm9yTm9kZVBhY2thZ2VzKCk7XG4gIGNvbnN0IGNvbXBvbmVudHMgPSBwYWNrYWdlSW5mby5hbGxNb2R1bGVzLmZpbHRlcihwayA9PiB7XG4gICAgY29uc3QgdGFyZ2V0ID0gdGFyZ2V0T2ZQa2cocGsubmFtZSk7XG4gICAgaWYgKHRhcmdldCA9PSBudWxsKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGNvbnN0IFtmaWxlVG9SdW5dID0gdGFyZ2V0O1xuICAgIC8vIHNldHVwUmVxdWlyZUluamVjdHMocGssIE5vZGVBcGkpOyAvLyBBbGwgY29tcG9uZW50IHBhY2thZ2Ugc2hvdWxkIGJlIGFibGUgdG8gYWNjZXNzICdfX2FwaScsIGV2ZW4gdGhleSBhcmUgbm90IGluY2x1ZGVkXG4gICAgaWYgKChpbmNsdWRlTmFtZVNldC5zaXplID09PSAwIHx8IGluY2x1ZGVOYW1lU2V0Lmhhcyhway5sb25nTmFtZSkgfHwgaW5jbHVkZU5hbWVTZXQuaGFzKHBrLnNob3J0TmFtZSkpKSB7XG4gICAgICB0cnkge1xuICAgICAgICBpZiAoZmlsZVRvUnVuKVxuICAgICAgICAgIHJlcXVpcmUucmVzb2x2ZShQYXRoLnJlc29sdmUoZ2V0V29ya0RpcigpLCAnbm9kZV9tb2R1bGVzJywgcGsubG9uZ05hbWUsIGZpbGVUb1J1bikpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgcmVxdWlyZS5yZXNvbHZlKFBhdGgucmVzb2x2ZShnZXRXb3JrRGlyKCksICdub2RlX21vZHVsZXMnLCBway5sb25nTmFtZSkpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG5cbiAgY29uc3QgcGFja2FnZU5hbWVzSW5PcmRlcjogc3RyaW5nW10gPSBbXTtcbiAgY29uc3QgTm9kZUFwaTogdHlwZW9mIF9Ob2RlQXBpID0gcmVxdWlyZSgnLi9wYWNrYWdlLW1nci9ub2RlLXBhY2thZ2UtYXBpJykuZGVmYXVsdDtcblxuXG4gIGF3YWl0IG9yZGVyUGFja2FnZXMoY29tcG9uZW50cy5tYXAoaXRlbSA9PiAoe1xuICAgIG5hbWU6IGl0ZW0ubG9uZ05hbWUsXG4gICAgcHJpb3JpdHk6IF8uZ2V0KGl0ZW0uanNvbiwgJ3BsaW5rLnNlcnZlclByaW9yaXR5JywgXy5nZXQoaXRlbS5qc29uLCAnZHIuc2VydmVyUHJpb3JpdHknKSlcbiAgfSkpLFxuICAgIHBrSW5zdGFuY2UgID0+IHtcbiAgICAgIGNvbnN0IFtmaWxlVG9SdW4sIGZ1bmNUb1J1bl0gPSB0YXJnZXRPZlBrZyhwa0luc3RhbmNlLm5hbWUpITtcbiAgICAgIHBhY2thZ2VOYW1lc0luT3JkZXIucHVzaChwa0luc3RhbmNlLm5hbWUpO1xuICAgICAgY29uc3QgbW9kID0gcGtJbnN0YW5jZS5uYW1lICsgKCBmaWxlVG9SdW4gPyAnLycgKyBmaWxlVG9SdW4gOiAnJyk7XG4gICAgICBsb2cuZGVidWcoJ3JlcXVpcmUoJXNmKScsIEpTT04uc3RyaW5naWZ5KG1vZCkpO1xuICAgICAgY29uc3QgZmlsZUV4cG9ydHMgPSByZXF1aXJlKFBhdGgucmVzb2x2ZShnZXRXb3JrRGlyKCksICdub2RlX21vZHVsZXMnLCBtb2QpKTtcbiAgICAgIHBrZ0V4cG9ydHNJblJldmVyT3JkZXIudW5zaGlmdCh7bmFtZTogcGtJbnN0YW5jZS5uYW1lLCBleHA6IGZpbGVFeHBvcnRzfSk7XG4gICAgICBpZiAoXy5pc0Z1bmN0aW9uKGZpbGVFeHBvcnRzW2Z1bmNUb1J1bl0pKSB7XG4gICAgICAgIGxvZy5pbmZvKGZ1bmNUb1J1biArIGAgJHtjaGFsay5jeWFuKG1vZCl9YCk7XG4gICAgICAgIHJldHVybiBmaWxlRXhwb3J0c1tmdW5jVG9SdW5dKGdldEFwaUZvclBhY2thZ2UocGFja2FnZUluZm8ubW9kdWxlTWFwW3BrSW5zdGFuY2UubmFtZV0sIE5vZGVBcGkpKTtcbiAgICAgIH1cbiAgfSk7XG4gIChwcm90by5ldmVudEJ1cyApLmVtaXQoJ2RvbmUnLCB7fSk7XG4gIE5vZGVBcGkucHJvdG90eXBlLmV2ZW50QnVzLmVtaXQoJ3BhY2thZ2VzQWN0aXZhdGVkJywgaW5jbHVkZU5hbWVTZXQpO1xuICByZXR1cm4gcGtnRXhwb3J0c0luUmV2ZXJPcmRlcjtcbn1cblxuLyoqXG4gKiBTbyB0aGF0IHdlIGNhbiB1c2UgYGltcG9ydCBhcGkgZnJvbSAnX19wbGluaydgIGFueXdoZXJlIGluIG91ciBwYWNrYWdlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMoKTpcbiAgW1BhY2thZ2VJbmZvLCBfTm9kZUFwaV0ge1xuICBjb25zdCB7Z2V0UGtnT2ZGaWxlLCBwYWNrYWdlSW5mb30gPSBwYWNrYWdlT2ZGaWxlRmFjdG9yeSgpO1xuICAvLyBjb25zdCBwYWNrYWdlSW5mbzogUGFja2FnZUluZm8gPSB3YWxrUGFja2FnZXMoKTtcbiAgY29uc3QgTm9kZUFwaTogdHlwZW9mIF9Ob2RlQXBpID0gcmVxdWlyZSgnLi9wYWNrYWdlLW1nci9ub2RlLXBhY2thZ2UtYXBpJykuZGVmYXVsdDtcbiAgY29uc3QgcHJvdG8gPSBOb2RlQXBpLnByb3RvdHlwZTtcbiAgcHJvdG8uYXJndiA9IHt9O1xuICBwcm90by5wYWNrYWdlSW5mbyA9IHBhY2thZ2VJbmZvO1xuXG4gIHByb3RvLmZpbmRQYWNrYWdlQnlGaWxlID0gZ2V0UGtnT2ZGaWxlO1xuICBwcm90by5nZXROb2RlQXBpRm9yUGFja2FnZSA9IGZ1bmN0aW9uKHBhY2thZ2VJbnN0YW5jZTogUGFja2FnZUluc3RhbmNlKSB7XG4gICAgcmV0dXJuIGdldEFwaUZvclBhY2thZ2UocGFja2FnZUluc3RhbmNlLCBOb2RlQXBpKTtcbiAgfTtcbiAgcHJvdG8uYnJvd3NlckluamVjdG9yID0gd2ViSW5qZWN0b3I7XG4gIHBhY2thZ2VJbmZvLmFsbE1vZHVsZXMuZm9yRWFjaChwayA9PiB7XG4gICAgc2V0dXBSZXF1aXJlSW5qZWN0cyhwaywgTm9kZUFwaSk7IC8vIEFsbCBjb21wb25lbnQgcGFja2FnZSBzaG91bGQgYmUgYWJsZSB0byBhY2Nlc3MgJ19fYXBpJywgZXZlbiB0aGV5IGFyZSBub3QgaW5jbHVkZWRcbiAgfSk7XG4gIG5vZGVJbmplY3Rvci5yZWFkSW5qZWN0RmlsZSgpO1xuICB3ZWJJbmplY3Rvci5yZWFkSW5qZWN0RmlsZSgnbW9kdWxlLXJlc29sdmUuYnJvd3NlcicpO1xuICByZXR1cm4gW3BhY2thZ2VJbmZvLCBwcm90b107XG59XG5cbi8qKlxuICogQGRlcHJlY2F0ZWRcbiAqIFN1cHBvcnQgYGltcG9ydCBhcGkgZnJvbSAnX19hcGknO2BcbiAqIEBwYXJhbSBhcmd2IFxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJlcGFyZUxhenlOb2RlSW5qZWN0b3IoYXJndj86IHtba2V5OiBzdHJpbmddOiBhbnl9KSB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLW1lbWJlci1hY2Nlc3NcbiAgY29uc3QgTm9kZUFwaTogdHlwZW9mIF9Ob2RlQXBpID0gcmVxdWlyZSgnLi9wYWNrYWdlLW1nci9ub2RlLXBhY2thZ2UtYXBpJykuZGVmYXVsdDtcbiAgY29uc3QgcHJvdG8gPSBOb2RlQXBpLnByb3RvdHlwZTtcbiAgcHJvdG8uYXJndiA9IGFyZ3YgfHwge307XG4gIGxldCBwYWNrYWdlSW5mbzogUGFja2FnZUluZm87XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCAncGFja2FnZUluZm8nLCB7XG4gICAgZ2V0KCkge1xuICAgICAgaWYgKHBhY2thZ2VJbmZvID09IG51bGwpXG4gICAgICAgIHBhY2thZ2VJbmZvID0gd2Fsa1BhY2thZ2VzKCk7XG4gICAgICByZXR1cm4gcGFja2FnZUluZm87XG4gICAgfVxuICB9KTtcbiAgcHJvdG8uZmluZFBhY2thZ2VCeUZpbGUgPSBjcmVhdGVMYXp5UGFja2FnZUZpbGVGaW5kZXIoKTtcbiAgcHJvdG8uZ2V0Tm9kZUFwaUZvclBhY2thZ2UgPSBmdW5jdGlvbihwYWNrYWdlSW5zdGFuY2U6IE5vZGVQYWNrYWdlKSB7XG4gICAgcmV0dXJuIGdldEFwaUZvclBhY2thZ2UocGFja2FnZUluc3RhbmNlLCBOb2RlQXBpKTtcbiAgfTtcbiAgbm9kZUluamVjdG9yLmZyb21Sb290KClcbiAgLy8gLmFsaWFzKCdsb2c0anMnLCBQYXRoLnJlc29sdmUoY29uZmlnKCkucm9vdFBhdGgsICdub2RlX21vZHVsZXMvbG9nNGpzJykpXG4gIC52YWx1ZSgnX19pbmplY3RvcicsIG5vZGVJbmplY3RvcilcbiAgLmZhY3RvcnkoJ19fYXBpJywgKHNvdXJjZUZpbGVQYXRoOiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCBwYWNrYWdlSW5zdGFuY2UgPSBwcm90by5maW5kUGFja2FnZUJ5RmlsZShzb3VyY2VGaWxlUGF0aCk7XG4gICAgaWYgKHBhY2thZ2VJbnN0YW5jZSlcbiAgICAgIHJldHVybiBnZXRBcGlGb3JQYWNrYWdlKHBhY2thZ2VJbnN0YW5jZSwgTm9kZUFwaSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWFwUGFja2FnZXNCeVR5cGUodHlwZXM6IHN0cmluZ1tdLCBvbkVhY2hQYWNrYWdlOiAobm9kZVBhY2thZ2U6IE5vZGVQYWNrYWdlKSA9PiB2b2lkKSB7XG4gIGNvbnN0IHBhY2thZ2VzTWFwOiB7W3R5cGU6IHN0cmluZ106IE5vZGVQYWNrYWdlW119ID0ge307XG4gIHR5cGVzLmZvckVhY2godHlwZSA9PiB7XG4gICAgcGFja2FnZXNNYXBbdHlwZV0gPSBbXTtcbiAgfSk7XG5cbiAgZm9yIChjb25zdCBwa2cgb2YgcGFja2FnZXM0V29ya3NwYWNlKCkpIHtcbiAgICBjb25zdCBuYW1lID0gcGtnLm5hbWU7XG4gICAgY29uc3QgcGtJbnN0YW5jZSA9IG5ldyBOb2RlUGFja2FnZSh7XG4gICAgICBtb2R1bGVOYW1lOiBuYW1lLFxuICAgICAgc2hvcnROYW1lOiBwa2cuc2hvcnROYW1lLFxuICAgICAgbmFtZSxcbiAgICAgIGxvbmdOYW1lOiBuYW1lLFxuICAgICAgc2NvcGU6IHBrZy5zY29wZSxcbiAgICAgIHBhdGg6IFBhdGgucmVzb2x2ZShnZXRXb3JrRGlyKCksIHBrZy5wYXRoKSxcbiAgICAgIGpzb246IHBrZy5qc29uLFxuICAgICAgcmVhbFBhdGg6IHBrZy5yZWFsUGF0aFxuICAgIH0pO1xuICAgIGNvbnN0IGRyVHlwZXMgPSAoW10gYXMgc3RyaW5nW10pLmNvbmNhdChfLmdldChwa2cuanNvbiwgJ3BsaW5rLnR5cGUnLCBfLmdldChwa2cuanNvbiwgJ2RyLnR5cGUnKSkpO1xuICAgIGZvciAoY29uc3QgdHlwZSBvZiB0eXBlcykge1xuICAgICAgaWYgKCFfLmluY2x1ZGVzKGRyVHlwZXMsIHR5cGUpKVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIHBhY2thZ2VzTWFwW3R5cGVdLnB1c2gocGtJbnN0YW5jZSk7XG4gICAgfVxuICAgIGlmIChvbkVhY2hQYWNrYWdlKSB7XG4gICAgICBvbkVhY2hQYWNrYWdlKHBrSW5zdGFuY2UpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcGFja2FnZXNNYXA7XG59XG5cbmZ1bmN0aW9uIHNldHVwUmVxdWlyZUluamVjdHMocGtJbnN0YW5jZTogUGFja2FnZUluc3RhbmNlLCBOb2RlQXBpOiB0eXBlb2YgX05vZGVBcGkgKSB7XG4gIGZ1bmN0aW9uIGFwaUZhY3RvcnkoKSB7XG4gICAgcmV0dXJuIGdldEFwaUZvclBhY2thZ2UocGtJbnN0YW5jZSwgTm9kZUFwaSkgYXMgdW5rbm93bjtcbiAgfVxuICBub2RlSW5qZWN0b3IuYWRkUGFja2FnZShwa0luc3RhbmNlLmxvbmdOYW1lLCBwa0luc3RhbmNlLnJlYWxQYXRoLFxuICAgIHBrSW5zdGFuY2UucGF0aCA9PT0gcGtJbnN0YW5jZS5yZWFsUGF0aCA/IHVuZGVmaW5lZCA6IHBrSW5zdGFuY2UucGF0aCk7XG4gIG5vZGVJbmplY3Rvci5mcm9tRGlyKHBrSW5zdGFuY2UucmVhbFBhdGgpXG4gIC52YWx1ZSgnX19pbmplY3RvcicsIG5vZGVJbmplY3RvcilcbiAgLmZhY3RvcnkoJ19fYXBpJywgYXBpRmFjdG9yeSlcbiAgLmZhY3RvcnkoJ19fcGxpbmsnLCBhcGlGYWN0b3J5KTtcblxuICAvLyB3ZWJJbmplY3Rvci5mcm9tRGlyKHBrSW5zdGFuY2UucmVhbFBhdGgpXG4gIC8vIC5yZXBsYWNlQ29kZSgnX19hcGknLCAnX19hcGknKTtcbiAgLy8gLnN1YnN0aXR1dGUoL14oW157XSopXFx7bG9jYWxlXFx9KC4qKSQvLFxuICAvLyAgIChfZmlsZVBhdGg6IHN0cmluZywgbWF0Y2g6IFJlZ0V4cEV4ZWNBcnJheSkgPT4gbWF0Y2hbMV0gKyBhcGlQcm90b3R5cGUuZ2V0QnVpbGRMb2NhbGUoKSArIG1hdGNoWzJdKTtcbiAgY29uc3Qgc3ltbGlua0RpciA9IHBrSW5zdGFuY2UucGF0aCAhPT0gcGtJbnN0YW5jZS5yZWFsUGF0aCA/IHBrSW5zdGFuY2UucGF0aCA6IG51bGw7XG4gIGlmIChzeW1saW5rRGlyKSB7XG4gICAgbm9kZUluamVjdG9yLmZyb21EaXIoc3ltbGlua0RpcilcbiAgICAudmFsdWUoJ19faW5qZWN0b3InLCBub2RlSW5qZWN0b3IpXG4gICAgLmZhY3RvcnkoJ19fcGxpbmsnLCBhcGlGYWN0b3J5KTtcblxuICAgIC8vIHdlYkluamVjdG9yLmZyb21EaXIoc3ltbGlua0RpcilcbiAgICAvLyAucmVwbGFjZUNvZGUoJ19fYXBpJywgJ19fYXBpJyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0QXBpRm9yUGFja2FnZShwa0luc3RhbmNlOiBOb2RlUGFja2FnZSwgTm9kZUFwaTogdHlwZW9mIF9Ob2RlQXBpKSB7XG4gIGlmIChfLmhhcyhhcGlDYWNoZSwgcGtJbnN0YW5jZS5sb25nTmFtZSkpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1yZXR1cm5cbiAgICByZXR1cm4gYXBpQ2FjaGVbcGtJbnN0YW5jZS5sb25nTmFtZV07XG4gIH1cblxuICBjb25zdCBhcGkgPSBuZXcgTm9kZUFwaShwa0luc3RhbmNlLmxvbmdOYW1lLCBwa0luc3RhbmNlKTtcbiAgYXBpQ2FjaGVbcGtJbnN0YW5jZS5sb25nTmFtZV0gPSBhcGk7XG4gIGFwaS5kZWZhdWx0ID0gYXBpOyAvLyBGb3IgRVM2IGltcG9ydCBzeW50YXhcbiAgcmV0dXJuIGFwaTtcbn1cbiJdfQ==