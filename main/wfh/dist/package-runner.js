"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapPackagesByType = exports.prepareLazyNodeInjector = exports.initInjectorForNodePackages = exports.runPackages = exports.runSinglePackage = exports.runServer = exports.readPriorityProperty = exports.isServerPackage = void 0;
const tslib_1 = require("tslib");
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable  max-len */
const path_1 = tslib_1.__importDefault(require("path"));
const _ = tslib_1.__importStar(require("lodash"));
const log4js_1 = tslib_1.__importDefault(require("log4js"));
const chalk_1 = tslib_1.__importDefault(require("chalk"));
const op = tslib_1.__importStar(require("rxjs/operators"));
const rx = tslib_1.__importStar(require("rxjs"));
const package_info_gathering_1 = require("./package-mgr/package-info-gathering");
const injector_factory_1 = require("./injector-factory");
const package_priority_helper_1 = require("./package-priority-helper");
const packageNodeInstance_1 = tslib_1.__importDefault(require("./packageNodeInstance"));
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
//# sourceMappingURL=package-runner.js.map