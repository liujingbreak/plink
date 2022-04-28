"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wYWNrYWdlLXJ1bm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDREQUE0RDtBQUM1RCw2QkFBNkI7QUFDN0IsZ0RBQXdCO0FBQ3hCLDBDQUE0QjtBQUM1QixvREFBNEI7QUFDNUIsa0RBQTBCO0FBQzFCLG1EQUFxQztBQUNyQyx5Q0FBMkI7QUFDM0IsaUZBQXFHO0FBQ3JHLHlEQUErRDtBQUcvRCx1RUFBMEQ7QUFDMUQsZ0ZBQWdEO0FBRWhELG1EQUFnRjtBQUNoRiwrQ0FBa0c7QUFDbEcsMkVBQXdFO0FBRXhFLHVDQUF3QztBQUV4QyxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0FBWXJELFNBQWdCLGVBQWUsQ0FBQyxHQUFpQjtJQUMvQyxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztJQUNoRCxPQUFPLFNBQVMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEtBQUssUUFBUSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzVILENBQUM7QUFIRCwwQ0FHQztBQUVELFNBQWdCLG9CQUFvQixDQUFDLElBQVM7SUFDNUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxzQkFBc0IsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7QUFDL0UsQ0FBQztBQUZELG9EQUVDO0FBRUQsU0FBZ0IsU0FBUztJQUl2QixJQUFJLEtBQUssR0FBOEIsSUFB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QUFDO1FBRWhDLGtDQUFrQztRQUNsQyxrQ0FBa0M7S0FDbkM7QUFDSCxDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxVQUF1QixFQUFFLE9BQXdCO0lBQ3pFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxFQUFFO1FBQ3hDLCtEQUErRDtRQUMvRCxPQUFPLFFBQVEsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDdEM7SUFFRCxNQUFNLEdBQUcsR0FBRyxJQUFJLE9BQU8sQ0FBQyxVQUFVLENBQUMsUUFBUSxFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ3pELFFBQVEsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLEdBQUcsR0FBRyxDQUFDO0lBQ3BDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsR0FBRyxDQUFDLENBQUMsd0JBQXdCO0lBQzNDLE9BQU8sR0FBRyxDQUFDO0FBQ2IsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudCAqL1xuLyogZXNsaW50LWRpc2FibGUgIG1heC1sZW4gKi9cbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IGNoYWxrIGZyb20gJ2NoYWxrJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0IHtQYWNrYWdlSW5mbywgcGFja2FnZU9mRmlsZUZhY3RvcnksIHdhbGtQYWNrYWdlc30gZnJvbSAnLi9wYWNrYWdlLW1nci9wYWNrYWdlLWluZm8tZ2F0aGVyaW5nJztcbmltcG9ydCB7IG5vZGVJbmplY3Rvciwgd2ViSW5qZWN0b3IgfSBmcm9tICcuL2luamVjdG9yLWZhY3RvcnknO1xuaW1wb3J0IF9Ob2RlQXBpIGZyb20gJy4vcGFja2FnZS1tZ3Ivbm9kZS1wYWNrYWdlLWFwaSc7XG5pbXBvcnQgUGFja2FnZUluc3RhbmNlIGZyb20gJy4vcGFja2FnZU5vZGVJbnN0YW5jZSc7XG5pbXBvcnQgeyBvcmRlclBhY2thZ2VzIH0gZnJvbSAnLi9wYWNrYWdlLXByaW9yaXR5LWhlbHBlcic7XG5pbXBvcnQgTm9kZVBhY2thZ2UgZnJvbSAnLi9wYWNrYWdlTm9kZUluc3RhbmNlJztcbmltcG9ydCB0eXBlIHtkZWZhdWx0IGFzIEV4dGVuc2lvbkNvbnRleHR9IGZyb20gJy4vcGFja2FnZS1tZ3Ivbm9kZS1wYWNrYWdlLWFwaSc7XG5pbXBvcnQge2NyZWF0ZUxhenlQYWNrYWdlRmlsZUZpbmRlciwgcGFja2FnZXM0V29ya3NwYWNlfSBmcm9tICcuL3BhY2thZ2UtdXRpbHMnO1xuaW1wb3J0IHtpc0N3ZFdvcmtzcGFjZSwgZ2V0U3RhdGUsIHdvcmtzcGFjZUtleSwgUGFja2FnZUluZm8gYXMgUGFja2FnZVN0YXRlfSBmcm9tICcuL3BhY2thZ2UtbWdyJztcbmltcG9ydCB7cGFja2FnZXM0V29ya3NwYWNlS2V5fSBmcm9tICcuL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXInO1xuXG5pbXBvcnQge2dldFdvcmtEaXJ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLnBhY2thZ2UtcnVubmVyJyk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VydmVyUnVubmVyRXZlbnQge1xuICBmaWxlOiBzdHJpbmc7XG4gIGZ1bmN0aW9uTmFtZTogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgRXh0ZW5zaW9uRXhwb3J0IHtcbiAgYWN0aXZhdGU/KGN0eDogRXh0ZW5zaW9uQ29udGV4dCk6IHZvaWQgfCBQcm9taXNlPHZvaWQ+O1xuICBkZWFjdGl2YXRlPygpOiBhbnk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBpc1NlcnZlclBhY2thZ2UocGtnOiBQYWNrYWdlU3RhdGUpIHtcbiAgY29uc3QgcGxpbmtQcm9wID0gcGtnLmpzb24ucGxpbmsgfHwgcGtnLmpzb24uZHI7XG4gIHJldHVybiBwbGlua1Byb3AgJiYgKHBsaW5rUHJvcC50eXBlID09PSAnc2VydmVyJyB8fCAoQXJyYXkuaXNBcnJheShwbGlua1Byb3AudHlwZSkgJiYgcGxpbmtQcm9wLnR5cGUuaW5jbHVkZXMoJ3NlcnZlcicpKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWFkUHJpb3JpdHlQcm9wZXJ0eShqc29uOiBhbnkpIHtcbiAgcmV0dXJuIF8uZ2V0KGpzb24sICdwbGluay5zZXJ2ZXJQcmlvcml0eScsIF8uZ2V0KGpzb24sICdkci5zZXJ2ZXJQcmlvcml0eScpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJ1blNlcnZlcigpOiB7XG4gIHN0YXJ0ZWQ6IFByb21pc2U8e25hbWU6IHN0cmluZzsgZXhwOiAgRXh0ZW5zaW9uRXhwb3J0fVtdPjtcbiAgc2h1dGRvd24oKTogUHJvbWlzZTx2b2lkPlxufSB7XG4gIGxldCB3c0tleTogc3RyaW5nIHwgbnVsbCB8IHVuZGVmaW5lZCA9IHdvcmtzcGFjZUtleShnZXRXb3JrRGlyKCkpO1xuICB3c0tleSA9IGdldFN0YXRlKCkud29ya3NwYWNlcy5oYXMod3NLZXkpID8gd3NLZXkgOiBnZXRTdGF0ZSgpLmN1cnJXb3Jrc3BhY2U7XG4gIGlmICh3c0tleSA9PSBudWxsKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdDdXJyZW50IGRpcmVjdG9yeSBpcyBub3QgYSB3b3Jrc3BhY2UgZGlyZWN0b3J5Jyk7XG4gIH1cbiAgY29uc3QgcGtncyA9IEFycmF5LmZyb20ocGFja2FnZXM0V29ya3NwYWNlS2V5KHdzS2V5LCB0cnVlKSlcbiAgLmZpbHRlcihpc1NlcnZlclBhY2thZ2UpO1xuXG4gIGNvbnN0IHBrZ05hbWVzID0gcGtncy5tYXAoaXRlbSA9PiBpdGVtLm5hbWUpO1xuICBjb25zdCBwa2dFbnRyeU1hcCA9IG5ldyBNYXA8c3RyaW5nLCBbZmlsZTogc3RyaW5nIHwgdW5kZWZpbmVkLCBmdW5jOiBzdHJpbmddPihwa2dzLm1hcChpdGVtID0+IHtcbiAgICBjb25zdCBpbmZvID0gaXRlbS5qc29uLnBsaW5rIHx8IGl0ZW0uanNvbi5kciE7XG4gICAgbGV0IG1haW5GaWxlID0gaW5mby5zZXJ2ZXJFbnRyeSB8fCBpdGVtLmpzb24ubWFpbiBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgbGV0IGZ1bmNOYW1lID0gJ2FjdGl2YXRlJztcbiAgICBpZiAobWFpbkZpbGUpIHtcbiAgICAgIGNvbnN0IHRtcCA9IG1haW5GaWxlLnNwbGl0KCcjJyk7XG4gICAgICBtYWluRmlsZSA9IHRtcFswXTtcbiAgICAgIGlmICh0bXBbMV0pXG4gICAgICAgIGZ1bmNOYW1lID0gdG1wWzFdO1xuICAgIH1cblxuICAgIHJldHVybiBbaXRlbS5uYW1lLCBbbWFpbkZpbGUsIGZ1bmNOYW1lXV07XG4gIH0pKTtcblxuICBjb25zdCBzdGFydGVkID0gX3J1blBhY2thZ2VzKHBrZ05hbWVzLCBwa2dOYW1lID0+IHBrZ0VudHJ5TWFwLmdldChwa2dOYW1lKSlcbiAgLnRoZW4ocmV2ZXJzZU9yZGVyUGtnRXhwb3J0cyA9PiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPHR5cGVvZiByZXZlcnNlT3JkZXJQa2dFeHBvcnRzPihyZXNvbHZlID0+IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgcmVzb2x2ZShyZXZlcnNlT3JkZXJQa2dFeHBvcnRzKTtcbiAgICB9LCA1MDApKTtcbiAgfSk7XG5cbiAgLy8gY29uc3QgcmV2ZXJzZU9yZGVyUGtnRXhwb3J0cyA9IGF3YWl0IHJ1blBhY2thZ2VzKCcjYWN0aXZhdGUnLCBwa2dzKTtcblxuICAvLyBhd2FpdCBuZXcgUHJvbWlzZShyZXNvbHZlID0+IHNldFRpbWVvdXQocmVzb2x2ZSwgNTAwKSk7XG4gIHJldHVybiB7XG4gICAgc3RhcnRlZCxcbiAgICBhc3luYyBzaHV0ZG93bigpIHtcbiAgICAgIGNvbnN0IHJldmVyc2VPcmRlclBrZ0V4cG9ydHMgPSBhd2FpdCBzdGFydGVkO1xuICAgICAgbG9nLmluZm8oJ1NodXR0aW5nIGRvd24nKTtcbiAgICAgIGF3YWl0IHJ4LmZyb20ocmV2ZXJzZU9yZGVyUGtnRXhwb3J0cykucGlwZShcbiAgICAgICAgb3AuY29uY2F0TWFwKCh7bmFtZSwgZXhwfSkgPT4ge1xuICAgICAgICAgIGxvZy5pbmZvKCdkZWFjdGl2YXRlJywgbmFtZSk7XG4gICAgICAgICAgaWYgKF8uaXNGdW5jdGlvbihleHAuZGVhY3RpdmF0ZSkpIHtcbiAgICAgICAgICAgIHJldHVybiByeC5mcm9tKFByb21pc2UucmVzb2x2ZShleHAuZGVhY3RpdmF0ZSgpKSkucGlwZShcbiAgICAgICAgICAgICAgb3AudGltZW91dFdpdGgoNTAwMCwgcngub2YoYGRlYWN0aXZhdGUgJHtuYW1lfSB0aW1lb3V0YCkpLFxuICAgICAgICAgICAgICBvcC5jYXRjaEVycm9yKGVyciA9PiB7XG4gICAgICAgICAgICAgICAgbG9nLndhcm4oZXJyKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gcnguRU1QVFk7XG4gICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXR1cm4gcnguRU1QVFk7XG4gICAgICAgIH0pXG4gICAgICApLnRvUHJvbWlzZSgpO1xuICAgICAgbG9nLmluZm8oJ1NodXRkb3duIGNvbXBsZXRlZCcpO1xuICAgIH1cbiAgfTtcbn1cblxuY29uc3QgYXBpQ2FjaGU6IHtbbmFtZTogc3RyaW5nXTogYW55fSA9IHt9O1xuLy8gY29uc3QgcGFja2FnZVRyZWUgPSBuZXcgRGlyVHJlZTxQYWNrYWdlSW5zdGFuY2U+KCk7XG5cbi8qKlxuICogTGF6aWx5IGluaXQgaW5qZWN0b3IgZm9yIHBhY2thZ2VzIGFuZCBydW4gc3BlY2lmaWMgcGFja2FnZSBvbmx5LFxuICogbm8gZnVsbHkgc2Nhbm5pbmcgb3Igb3JkZXJpbmcgb24gYWxsIHBhY2thZ2VzXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBydW5TaW5nbGVQYWNrYWdlKHt0YXJnZXQsIGFyZ3N9OiB7dGFyZ2V0OiBzdHJpbmc7IGFyZ3M6IHN0cmluZ1tdfSkge1xuICBpZiAoIWlzQ3dkV29ya3NwYWNlKCkpIHtcbiAgICByZXR1cm4gUHJvbWlzZS5yZWplY3QobmV3IEVycm9yKCdDdXJyZW50IGRpcmVjdG9yeSBpcyBub3QgYSB3b3Jrc3BhY2UgZGlyZWN0b3J5JykpO1xuICB9XG4gIGNvbnN0IFtwa2dJbmZvXSA9IGluaXRJbmplY3RvckZvck5vZGVQYWNrYWdlcygpO1xuXG4gIGNvbnN0IFtmaWxlLCBmdW5jXSA9IHRhcmdldC5zcGxpdCgnIycpO1xuICBjb25zdCBwa2dOYW1lTWF0Y2ggPSAvKCg/OkBbXi9dK1xcLyk/W2EtekEtWjAtOV8tXSspXFwvJC8uZXhlYyhmaWxlKTtcbiAgbGV0IG1vZHVsZU5hbWUgPSBQYXRoLnJlc29sdmUoZmlsZSk7XG4gIGlmIChwa2dOYW1lTWF0Y2ggJiYgcGtnTmFtZU1hdGNoWzFdICYmIF8uaGFzKHBrZ0luZm8ubW9kdWxlTWFwLCBwa2dOYW1lTWF0Y2hbMV0pKSB7XG4gICAgbW9kdWxlTmFtZSA9IGZpbGU7XG4gIH1cbiAgY29uc3QgX2V4cG9ydHMgPSByZXF1aXJlKFBhdGgucmVzb2x2ZShnZXRXb3JrRGlyKCksICdub2RlX21vZHVsZXMnLCBtb2R1bGVOYW1lKSk7XG4gIGlmICghXy5oYXMoX2V4cG9ydHMsIGZ1bmMpKSB7XG4gICAgbG9nLmVycm9yKGBUaGVyZSBpcyBubyBleHBvcnQgZnVuY3Rpb246ICR7ZnVuY30sIGV4aXN0aW5nIGV4cG9ydCBtZW1iZXJzIGFyZTpcXG5gICtcbiAgICBgJHtPYmplY3Qua2V5cyhfZXhwb3J0cykuZmlsdGVyKG5hbWUgPT4gdHlwZW9mIChfZXhwb3J0c1tuYW1lXSkgPT09ICdmdW5jdGlvbicpLm1hcChuYW1lID0+IG5hbWUgKyAnKCknKS5qb2luKCdcXG4nKX1gKTtcbiAgICByZXR1cm47XG4gIH1cbiAgYXdhaXQgUHJvbWlzZS5yZXNvbHZlKF9leHBvcnRzW2Z1bmNdLmFwcGx5KGdsb2JhbCwgYXJncyB8fCBbXSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcnVuUGFja2FnZXModGFyZ2V0OiBzdHJpbmcsIGluY2x1ZGVQYWNrYWdlczogSXRlcmFibGU8c3RyaW5nPik6IFByb21pc2U8e25hbWU6IHN0cmluZzsgZXhwOiAgRXh0ZW5zaW9uRXhwb3J0fVtdPiB7XG5cbiAgcmV0dXJuIF9ydW5QYWNrYWdlcyhpbmNsdWRlUGFja2FnZXMsICgpID0+IHRhcmdldC5zcGxpdCgnIycpIGFzIFtzdHJpbmcsIHN0cmluZ10pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBfcnVuUGFja2FnZXMoaW5jbHVkZVBhY2thZ2VzOiBJdGVyYWJsZTxzdHJpbmc+LFxuICB0YXJnZXRPZlBrZzogKHBrZzogc3RyaW5nKSA9PiBbZmlsZVRvUnVuOiBzdHJpbmcgfCB1bmRlZmluZWQsIGZ1bmNUb1J1bjogc3RyaW5nXSB8IHVuZGVmaW5lZCB8IG51bGxcbik6IFByb21pc2U8e25hbWU6IHN0cmluZzsgZXhwOiBFeHRlbnNpb25FeHBvcnR9W10+IHtcbiAgY29uc3QgaW5jbHVkZU5hbWVTZXQgPSBuZXcgU2V0PHN0cmluZz4oaW5jbHVkZVBhY2thZ2VzKTtcbiAgY29uc3QgcGtnRXhwb3J0c0luRGVzY2VuZE9yZGVyOiB7bmFtZTogc3RyaW5nOyBleHA6IEV4dGVuc2lvbkV4cG9ydH1bXSA9IFtdO1xuXG4gIGNvbnN0IFtwYWNrYWdlSW5mbywgcHJvdG9dID0gaW5pdEluamVjdG9yRm9yTm9kZVBhY2thZ2VzKCk7XG4gIGNvbnN0IGNvbXBvbmVudHMgPSBwYWNrYWdlSW5mby5hbGxNb2R1bGVzLmZpbHRlcihwayA9PiB7XG4gICAgY29uc3QgdGFyZ2V0ID0gdGFyZ2V0T2ZQa2cocGsubmFtZSk7XG4gICAgaWYgKHRhcmdldCA9PSBudWxsKVxuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIGNvbnN0IFtmaWxlVG9SdW5dID0gdGFyZ2V0O1xuICAgIC8vIHNldHVwUmVxdWlyZUluamVjdHMocGssIE5vZGVBcGkpOyAvLyBBbGwgY29tcG9uZW50IHBhY2thZ2Ugc2hvdWxkIGJlIGFibGUgdG8gYWNjZXNzICdfX2FwaScsIGV2ZW4gdGhleSBhcmUgbm90IGluY2x1ZGVkXG4gICAgaWYgKChpbmNsdWRlTmFtZVNldC5zaXplID09PSAwIHx8IGluY2x1ZGVOYW1lU2V0Lmhhcyhway5sb25nTmFtZSkgfHwgaW5jbHVkZU5hbWVTZXQuaGFzKHBrLnNob3J0TmFtZSkpKSB7XG4gICAgICB0cnkge1xuICAgICAgICBpZiAoZmlsZVRvUnVuKVxuICAgICAgICAgIHJlcXVpcmUucmVzb2x2ZShQYXRoLnJlc29sdmUoZ2V0V29ya0RpcigpLCAnbm9kZV9tb2R1bGVzJywgcGsubG9uZ05hbWUsIGZpbGVUb1J1bikpO1xuICAgICAgICBlbHNlXG4gICAgICAgICAgcmVxdWlyZS5yZXNvbHZlKFBhdGgucmVzb2x2ZShnZXRXb3JrRGlyKCksICdub2RlX21vZHVsZXMnLCBway5sb25nTmFtZSkpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBmYWxzZTtcbiAgfSk7XG5cbiAgY29uc3QgcGFja2FnZU5hbWVzSW5PcmRlcjogc3RyaW5nW10gPSBbXTtcbiAgY29uc3QgTm9kZUFwaTogdHlwZW9mIF9Ob2RlQXBpID0gcmVxdWlyZSgnLi9wYWNrYWdlLW1nci9ub2RlLXBhY2thZ2UtYXBpJykuZGVmYXVsdDtcblxuXG4gIGF3YWl0IG9yZGVyUGFja2FnZXMoY29tcG9uZW50cy5tYXAoaXRlbSA9PiAoe1xuICAgIG5hbWU6IGl0ZW0ubG9uZ05hbWUsXG4gICAgcHJpb3JpdHk6IF8uZ2V0KGl0ZW0uanNvbiwgJ3BsaW5rLnNlcnZlclByaW9yaXR5JywgXy5nZXQoaXRlbS5qc29uLCAnZHIuc2VydmVyUHJpb3JpdHknKSlcbiAgfSkpLFxuICAgIHBrSW5zdGFuY2UgID0+IHtcbiAgICAgIGNvbnN0IFtmaWxlVG9SdW4sIGZ1bmNUb1J1bl0gPSB0YXJnZXRPZlBrZyhwa0luc3RhbmNlLm5hbWUpITtcbiAgICAgIHBhY2thZ2VOYW1lc0luT3JkZXIucHVzaChwa0luc3RhbmNlLm5hbWUpO1xuICAgICAgY29uc3QgbW9kID0gcGtJbnN0YW5jZS5uYW1lICsgKCBmaWxlVG9SdW4gPyAnLycgKyBmaWxlVG9SdW4gOiAnJyk7XG4gICAgICBsb2cuZGVidWcoJ3JlcXVpcmUoJXNmKScsIEpTT04uc3RyaW5naWZ5KG1vZCkpO1xuICAgICAgY29uc3QgZmlsZUV4cG9ydHMgPSByZXF1aXJlKFBhdGgucmVzb2x2ZShnZXRXb3JrRGlyKCksICdub2RlX21vZHVsZXMnLCBtb2QpKTtcbiAgICAgIHBrZ0V4cG9ydHNJbkRlc2NlbmRPcmRlci51bnNoaWZ0KHtuYW1lOiBwa0luc3RhbmNlLm5hbWUsIGV4cDogZmlsZUV4cG9ydHN9KTtcbiAgICAgIGlmIChfLmlzRnVuY3Rpb24oZmlsZUV4cG9ydHNbZnVuY1RvUnVuXSkpIHtcbiAgICAgICAgbG9nLmluZm8oZnVuY1RvUnVuICsgYCAke2NoYWxrLmN5YW4obW9kKX1gKTtcbiAgICAgICAgcmV0dXJuIGZpbGVFeHBvcnRzW2Z1bmNUb1J1bl0oZ2V0QXBpRm9yUGFja2FnZShwYWNrYWdlSW5mby5tb2R1bGVNYXBbcGtJbnN0YW5jZS5uYW1lXSwgTm9kZUFwaSkpO1xuICAgICAgfVxuICB9KTtcbiAgKHByb3RvLmV2ZW50QnVzICkuZW1pdCgnZG9uZScsIHt9KTtcbiAgTm9kZUFwaS5wcm90b3R5cGUuZXZlbnRCdXMuZW1pdCgncGFja2FnZXNBY3RpdmF0ZWQnLCBpbmNsdWRlTmFtZVNldCk7XG4gIHJldHVybiBwa2dFeHBvcnRzSW5EZXNjZW5kT3JkZXI7XG59XG5cbi8qKlxuICogU28gdGhhdCB3ZSBjYW4gdXNlIGBpbXBvcnQgYXBpIGZyb20gJ19fcGxpbmsnYCBhbnl3aGVyZSBpbiBvdXIgcGFja2FnZVxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5pdEluamVjdG9yRm9yTm9kZVBhY2thZ2VzKCk6XG4gIFtQYWNrYWdlSW5mbywgX05vZGVBcGldIHtcbiAgY29uc3Qge2dldFBrZ09mRmlsZSwgcGFja2FnZUluZm99ID0gcGFja2FnZU9mRmlsZUZhY3RvcnkoKTtcbiAgLy8gY29uc3QgcGFja2FnZUluZm86IFBhY2thZ2VJbmZvID0gd2Fsa1BhY2thZ2VzKCk7XG4gIGNvbnN0IE5vZGVBcGkgPSByZXF1aXJlKCcuL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGknKS5kZWZhdWx0IGFzIHR5cGVvZiBfTm9kZUFwaTtcbiAgY29uc3QgcHJvdG8gPSBOb2RlQXBpLnByb3RvdHlwZTtcbiAgcHJvdG8uYXJndiA9IHt9O1xuICBwcm90by5wYWNrYWdlSW5mbyA9IHBhY2thZ2VJbmZvO1xuXG4gIHByb3RvLmZpbmRQYWNrYWdlQnlGaWxlID0gZ2V0UGtnT2ZGaWxlO1xuICBwcm90by5nZXROb2RlQXBpRm9yUGFja2FnZSA9IGZ1bmN0aW9uKHBhY2thZ2VJbnN0YW5jZTogUGFja2FnZUluc3RhbmNlKSB7XG4gICAgcmV0dXJuIGdldEFwaUZvclBhY2thZ2UocGFja2FnZUluc3RhbmNlLCBOb2RlQXBpKTtcbiAgfTtcbiAgcHJvdG8uYnJvd3NlckluamVjdG9yID0gd2ViSW5qZWN0b3I7XG4gIHBhY2thZ2VJbmZvLmFsbE1vZHVsZXMuZm9yRWFjaChwayA9PiB7XG4gICAgc2V0dXBSZXF1aXJlSW5qZWN0cyhwaywgTm9kZUFwaSk7IC8vIEFsbCBjb21wb25lbnQgcGFja2FnZSBzaG91bGQgYmUgYWJsZSB0byBhY2Nlc3MgJ19fYXBpJywgZXZlbiB0aGV5IGFyZSBub3QgaW5jbHVkZWRcbiAgfSk7XG4gIG5vZGVJbmplY3Rvci5yZWFkSW5qZWN0RmlsZSgpO1xuICB3ZWJJbmplY3Rvci5yZWFkSW5qZWN0RmlsZSgnbW9kdWxlLXJlc29sdmUuYnJvd3NlcicpO1xuICByZXR1cm4gW3BhY2thZ2VJbmZvLCBwcm90b107XG59XG5cbi8qKlxuICogQGRlcHJlY2F0ZWRcbiAqIFN1cHBvcnQgYGltcG9ydCBhcGkgZnJvbSAnX19hcGknO2BcbiAqIEBwYXJhbSBhcmd2IFxuICovXG5leHBvcnQgZnVuY3Rpb24gcHJlcGFyZUxhenlOb2RlSW5qZWN0b3IoYXJndj86IHtba2V5OiBzdHJpbmddOiBhbnl9KSB7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLW1lbWJlci1hY2Nlc3NcbiAgY29uc3QgTm9kZUFwaTogdHlwZW9mIF9Ob2RlQXBpID0gcmVxdWlyZSgnLi9wYWNrYWdlLW1nci9ub2RlLXBhY2thZ2UtYXBpJykuZGVmYXVsdDtcbiAgY29uc3QgcHJvdG8gPSBOb2RlQXBpLnByb3RvdHlwZTtcbiAgcHJvdG8uYXJndiA9IGFyZ3YgfHwge307XG4gIGxldCBwYWNrYWdlSW5mbzogUGFja2FnZUluZm87XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KHByb3RvLCAncGFja2FnZUluZm8nLCB7XG4gICAgZ2V0KCkge1xuICAgICAgaWYgKHBhY2thZ2VJbmZvID09IG51bGwpXG4gICAgICAgIHBhY2thZ2VJbmZvID0gd2Fsa1BhY2thZ2VzKCk7XG4gICAgICByZXR1cm4gcGFja2FnZUluZm87XG4gICAgfVxuICB9KTtcbiAgcHJvdG8uZmluZFBhY2thZ2VCeUZpbGUgPSBjcmVhdGVMYXp5UGFja2FnZUZpbGVGaW5kZXIoKTtcbiAgcHJvdG8uZ2V0Tm9kZUFwaUZvclBhY2thZ2UgPSBmdW5jdGlvbihwYWNrYWdlSW5zdGFuY2U6IE5vZGVQYWNrYWdlKSB7XG4gICAgcmV0dXJuIGdldEFwaUZvclBhY2thZ2UocGFja2FnZUluc3RhbmNlLCBOb2RlQXBpKTtcbiAgfTtcbiAgbm9kZUluamVjdG9yLmZyb21Sb290KClcbiAgLy8gLmFsaWFzKCdsb2c0anMnLCBQYXRoLnJlc29sdmUoY29uZmlnKCkucm9vdFBhdGgsICdub2RlX21vZHVsZXMvbG9nNGpzJykpXG4gIC52YWx1ZSgnX19pbmplY3RvcicsIG5vZGVJbmplY3RvcilcbiAgLmZhY3RvcnkoJ19fYXBpJywgKHNvdXJjZUZpbGVQYXRoOiBzdHJpbmcpID0+IHtcbiAgICBjb25zdCBwYWNrYWdlSW5zdGFuY2UgPSBwcm90by5maW5kUGFja2FnZUJ5RmlsZShzb3VyY2VGaWxlUGF0aCk7XG4gICAgaWYgKHBhY2thZ2VJbnN0YW5jZSlcbiAgICAgIHJldHVybiBnZXRBcGlGb3JQYWNrYWdlKHBhY2thZ2VJbnN0YW5jZSwgTm9kZUFwaSk7XG4gICAgcmV0dXJuIG51bGw7XG4gIH0pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWFwUGFja2FnZXNCeVR5cGUodHlwZXM6IHN0cmluZ1tdLCBvbkVhY2hQYWNrYWdlOiAobm9kZVBhY2thZ2U6IE5vZGVQYWNrYWdlKSA9PiB2b2lkKSB7XG4gIGNvbnN0IHBhY2thZ2VzTWFwOiB7W3R5cGU6IHN0cmluZ106IE5vZGVQYWNrYWdlW119ID0ge307XG4gIHR5cGVzLmZvckVhY2godHlwZSA9PiB7XG4gICAgcGFja2FnZXNNYXBbdHlwZV0gPSBbXTtcbiAgfSk7XG5cbiAgZm9yIChjb25zdCBwa2cgb2YgcGFja2FnZXM0V29ya3NwYWNlKCkpIHtcbiAgICBjb25zdCBuYW1lID0gcGtnLm5hbWU7XG4gICAgY29uc3QgcGtJbnN0YW5jZSA9IG5ldyBOb2RlUGFja2FnZSh7XG4gICAgICBtb2R1bGVOYW1lOiBuYW1lLFxuICAgICAgc2hvcnROYW1lOiBwa2cuc2hvcnROYW1lLFxuICAgICAgbmFtZSxcbiAgICAgIGxvbmdOYW1lOiBuYW1lLFxuICAgICAgc2NvcGU6IHBrZy5zY29wZSxcbiAgICAgIHBhdGg6IFBhdGgucmVzb2x2ZShnZXRXb3JrRGlyKCksIHBrZy5wYXRoKSxcbiAgICAgIGpzb246IHBrZy5qc29uLFxuICAgICAgcmVhbFBhdGg6IHBrZy5yZWFsUGF0aFxuICAgIH0pO1xuICAgIGNvbnN0IGRyVHlwZXMgPSAoW10gYXMgc3RyaW5nW10pLmNvbmNhdChfLmdldChwa2cuanNvbiwgJ3BsaW5rLnR5cGUnLCBfLmdldChwa2cuanNvbiwgJ2RyLnR5cGUnKSkpO1xuICAgIGZvciAoY29uc3QgdHlwZSBvZiB0eXBlcykge1xuICAgICAgaWYgKCFfLmluY2x1ZGVzKGRyVHlwZXMsIHR5cGUpKVxuICAgICAgICBjb250aW51ZTtcbiAgICAgIHBhY2thZ2VzTWFwW3R5cGVdLnB1c2gocGtJbnN0YW5jZSk7XG4gICAgfVxuICAgIGlmIChvbkVhY2hQYWNrYWdlKSB7XG4gICAgICBvbkVhY2hQYWNrYWdlKHBrSW5zdGFuY2UpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gcGFja2FnZXNNYXA7XG59XG5cbmZ1bmN0aW9uIHNldHVwUmVxdWlyZUluamVjdHMocGtJbnN0YW5jZTogUGFja2FnZUluc3RhbmNlLCBOb2RlQXBpOiB0eXBlb2YgX05vZGVBcGkgKSB7XG4gIGZ1bmN0aW9uIGFwaUZhY3RvcnkoKSB7XG4gICAgcmV0dXJuIGdldEFwaUZvclBhY2thZ2UocGtJbnN0YW5jZSwgTm9kZUFwaSkgYXMgdW5rbm93bjtcbiAgfVxuICBub2RlSW5qZWN0b3IuYWRkUGFja2FnZShwa0luc3RhbmNlLmxvbmdOYW1lLCBwa0luc3RhbmNlLnJlYWxQYXRoLFxuICAgIHBrSW5zdGFuY2UucGF0aCA9PT0gcGtJbnN0YW5jZS5yZWFsUGF0aCA/IHVuZGVmaW5lZCA6IHBrSW5zdGFuY2UucGF0aCk7XG4gIG5vZGVJbmplY3Rvci5mcm9tRGlyKHBrSW5zdGFuY2UucmVhbFBhdGgpXG4gIC52YWx1ZSgnX19pbmplY3RvcicsIG5vZGVJbmplY3RvcilcbiAgLmZhY3RvcnkoJ19fYXBpJywgYXBpRmFjdG9yeSlcbiAgLmZhY3RvcnkoJ19fcGxpbmsnLCBhcGlGYWN0b3J5KTtcblxuICAvLyB3ZWJJbmplY3Rvci5mcm9tRGlyKHBrSW5zdGFuY2UucmVhbFBhdGgpXG4gIC8vIC5yZXBsYWNlQ29kZSgnX19hcGknLCAnX19hcGknKTtcbiAgLy8gLnN1YnN0aXR1dGUoL14oW157XSopXFx7bG9jYWxlXFx9KC4qKSQvLFxuICAvLyAgIChfZmlsZVBhdGg6IHN0cmluZywgbWF0Y2g6IFJlZ0V4cEV4ZWNBcnJheSkgPT4gbWF0Y2hbMV0gKyBhcGlQcm90b3R5cGUuZ2V0QnVpbGRMb2NhbGUoKSArIG1hdGNoWzJdKTtcbiAgY29uc3Qgc3ltbGlua0RpciA9IHBrSW5zdGFuY2UucGF0aCAhPT0gcGtJbnN0YW5jZS5yZWFsUGF0aCA/IHBrSW5zdGFuY2UucGF0aCA6IG51bGw7XG4gIGlmIChzeW1saW5rRGlyKSB7XG4gICAgbm9kZUluamVjdG9yLmZyb21EaXIoc3ltbGlua0RpcilcbiAgICAudmFsdWUoJ19faW5qZWN0b3InLCBub2RlSW5qZWN0b3IpXG4gICAgLmZhY3RvcnkoJ19fcGxpbmsnLCBhcGlGYWN0b3J5KTtcblxuICAgIC8vIHdlYkluamVjdG9yLmZyb21EaXIoc3ltbGlua0RpcilcbiAgICAvLyAucmVwbGFjZUNvZGUoJ19fYXBpJywgJ19fYXBpJyk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0QXBpRm9yUGFja2FnZShwa0luc3RhbmNlOiBOb2RlUGFja2FnZSwgTm9kZUFwaTogdHlwZW9mIF9Ob2RlQXBpKSB7XG4gIGlmIChfLmhhcyhhcGlDYWNoZSwgcGtJbnN0YW5jZS5sb25nTmFtZSkpIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1yZXR1cm5cbiAgICByZXR1cm4gYXBpQ2FjaGVbcGtJbnN0YW5jZS5sb25nTmFtZV07XG4gIH1cblxuICBjb25zdCBhcGkgPSBuZXcgTm9kZUFwaShwa0luc3RhbmNlLmxvbmdOYW1lLCBwa0luc3RhbmNlKTtcbiAgYXBpQ2FjaGVbcGtJbnN0YW5jZS5sb25nTmFtZV0gPSBhcGk7XG4gIGFwaS5kZWZhdWx0ID0gYXBpOyAvLyBGb3IgRVM2IGltcG9ydCBzeW50YXhcbiAgcmV0dXJuIGFwaTtcbn1cbiJdfQ==