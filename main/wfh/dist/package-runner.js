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
        shutdown() {
            return __awaiter(this, void 0, void 0, function* () {
                const reverseOrderPkgExports = yield started;
                log.info('shutting down');
                for (const { name, exp } of reverseOrderPkgExports) {
                    if (_.isFunction(exp.deactivate)) {
                        log.info('deactivate', name);
                        yield Promise.resolve(exp.deactivate());
                    }
                }
            });
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
function runSinglePackage({ target, args }) {
    return __awaiter(this, void 0, void 0, function* () {
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
        yield Promise.resolve(_exports[func].apply(global, args || []));
    });
}
exports.runSinglePackage = runSinglePackage;
function runPackages(target, includePackages) {
    return _runPackages(includePackages, () => target.split('#'));
}
exports.runPackages = runPackages;
function _runPackages(includePackages, targetOfPkg) {
    return __awaiter(this, void 0, void 0, function* () {
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
        yield (0, package_priority_helper_1.orderPackages)(components.map(item => ({
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
    });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1ydW5uZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi90cy9wYWNrYWdlLXJ1bm5lci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNERBQTREO0FBQzVELDZCQUE2QjtBQUM3QiwwQ0FBNEI7QUFDNUIsaUZBQXFHO0FBQ3JHLHlEQUErRDtBQUcvRCx1RUFBMEQ7QUFDMUQsZ0ZBQWdEO0FBQ2hELGdEQUF3QjtBQUN4QixtREFBZ0Y7QUFDaEYsb0RBQTRCO0FBQzVCLCtDQUFrRztBQUNsRywyRUFBd0U7QUFDeEUsa0RBQTBCO0FBRTFCLHVDQUF3QztBQUV4QyxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0FBT3JELFNBQWdCLGVBQWUsQ0FBQyxHQUFpQjtJQUMvQyxNQUFNLFNBQVMsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztJQUNoRCxPQUFPLFNBQVMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLEtBQUssUUFBUSxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzVILENBQUM7QUFIRCwwQ0FHQztBQUVELFNBQWdCLG9CQUFvQixDQUFDLElBQVM7SUFDNUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxzQkFBc0IsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxtQkFBbUIsQ0FBQyxDQUFDLENBQUM7QUFDL0UsQ0FBQztBQUZELG9EQUVDO0FBRUQsU0FBZ0IsU0FBUztJQUN2QixJQUFJLEtBQUssR0FBOEIsSUFBQSwwQkFBWSxFQUFDLElBQUEsaUJB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IjpbIi8qIGVzbGludC1kaXNhYmxlIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudCAqL1xuLyogZXNsaW50LWRpc2FibGUgIG1heC1sZW4gKi9cbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7UGFja2FnZUluZm8sIHBhY2thZ2VPZkZpbGVGYWN0b3J5LCB3YWxrUGFja2FnZXN9IGZyb20gJy4vcGFja2FnZS1tZ3IvcGFja2FnZS1pbmZvLWdhdGhlcmluZyc7XG5pbXBvcnQgeyBub2RlSW5qZWN0b3IsIHdlYkluamVjdG9yIH0gZnJvbSAnLi9pbmplY3Rvci1mYWN0b3J5JztcbmltcG9ydCBfTm9kZUFwaSBmcm9tICcuL3BhY2thZ2UtbWdyL25vZGUtcGFja2FnZS1hcGknO1xuaW1wb3J0IFBhY2thZ2VJbnN0YW5jZSBmcm9tICcuL3BhY2thZ2VOb2RlSW5zdGFuY2UnO1xuaW1wb3J0IHsgb3JkZXJQYWNrYWdlcyB9IGZyb20gJy4vcGFja2FnZS1wcmlvcml0eS1oZWxwZXInO1xuaW1wb3J0IE5vZGVQYWNrYWdlIGZyb20gJy4vcGFja2FnZU5vZGVJbnN0YW5jZSc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7Y3JlYXRlTGF6eVBhY2thZ2VGaWxlRmluZGVyLCBwYWNrYWdlczRXb3Jrc3BhY2V9IGZyb20gJy4vcGFja2FnZS11dGlscyc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQge2lzQ3dkV29ya3NwYWNlLCBnZXRTdGF0ZSwgd29ya3NwYWNlS2V5LCBQYWNrYWdlSW5mbyBhcyBQYWNrYWdlU3RhdGV9IGZyb20gJy4vcGFja2FnZS1tZ3InO1xuaW1wb3J0IHtwYWNrYWdlczRXb3Jrc3BhY2VLZXl9IGZyb20gJy4vcGFja2FnZS1tZ3IvcGFja2FnZS1saXN0LWhlbHBlcic7XG5pbXBvcnQgY2hhbGsgZnJvbSAnY2hhbGsnO1xuXG5pbXBvcnQge2dldFdvcmtEaXJ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLnBhY2thZ2UtcnVubmVyJyk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU2VydmVyUnVubmVyRXZlbnQge1xuICBmaWxlOiBzdHJpbmc7XG4gIGZ1bmN0aW9uTmFtZTogc3RyaW5nO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaXNTZXJ2ZXJQYWNrYWdlKHBrZzogUGFja2FnZVN0YXRlKSB7XG4gIGNvbnN0IHBsaW5rUHJvcCA9IHBrZy5qc29uLnBsaW5rIHx8IHBrZy5qc29uLmRyO1xuICByZXR1cm4gcGxpbmtQcm9wICYmIChwbGlua1Byb3AudHlwZSA9PT0gJ3NlcnZlcicgfHwgKEFycmF5LmlzQXJyYXkocGxpbmtQcm9wLnR5cGUpICYmIHBsaW5rUHJvcC50eXBlLmluY2x1ZGVzKCdzZXJ2ZXInKSkpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVhZFByaW9yaXR5UHJvcGVydHkoanNvbjogYW55KSB7XG4gIHJldHVybiBfLmdldChqc29uLCAncGxpbmsuc2VydmVyUHJpb3JpdHknLCBfLmdldChqc29uLCAnZHIuc2VydmVyUHJpb3JpdHknKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBydW5TZXJ2ZXIoKToge3N0YXJ0ZWQ6IFByb21pc2U8dW5rbm93bj47IHNodXRkb3duKCk6IFByb21pc2U8dm9pZD59IHtcbiAgbGV0IHdzS2V5OiBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkID0gd29ya3NwYWNlS2V5KGdldFdvcmtEaXIoKSk7XG4gIHdzS2V5ID0gZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmhhcyh3c0tleSkgPyB3c0tleSA6IGdldFN0YXRlKCkuY3VycldvcmtzcGFjZTtcbiAgaWYgKHdzS2V5ID09IG51bGwpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0N1cnJlbnQgZGlyZWN0b3J5IGlzIG5vdCBhIHdvcmtzcGFjZSBkaXJlY3RvcnknKTtcbiAgfVxuICBjb25zdCBwa2dzID0gQXJyYXkuZnJvbShwYWNrYWdlczRXb3Jrc3BhY2VLZXkod3NLZXksIHRydWUpKVxuICAuZmlsdGVyKGlzU2VydmVyUGFja2FnZSk7XG5cbiAgY29uc3QgcGtnTmFtZXMgPSBwa2dzLm1hcChpdGVtID0+IGl0ZW0ubmFtZSk7XG4gIGNvbnN0IHBrZ0VudHJ5TWFwID0gbmV3IE1hcDxzdHJpbmcsIFtmaWxlOiBzdHJpbmcgfCB1bmRlZmluZWQsIGZ1bmM6IHN0cmluZ10+KHBrZ3MubWFwKGl0ZW0gPT4ge1xuICAgIGNvbnN0IGluZm8gPSBpdGVtLmpzb24ucGxpbmsgfHwgaXRlbS5qc29uLmRyITtcbiAgICBsZXQgbWFpbkZpbGUgPSBpbmZvLnNlcnZlckVudHJ5IHx8IGl0ZW0uanNvbi5tYWluIGFzIHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgICBsZXQgZnVuY05hbWUgPSAnYWN0aXZhdGUnO1xuICAgIGlmIChtYWluRmlsZSkge1xuICAgICAgY29uc3QgdG1wID0gbWFpbkZpbGUuc3BsaXQoJyMnKTtcbiAgICAgIG1haW5GaWxlID0gdG1wWzBdO1xuICAgICAgaWYgKHRtcFsxXSlcbiAgICAgICAgZnVuY05hbWUgPSB0bXBbMV07XG4gICAgfVxuXG4gICAgcmV0dXJuIFtpdGVtLm5hbWUsIFttYWluRmlsZSwgZnVuY05hbWVdXTtcbiAgfSkpO1xuXG4gIGNvbnN0IHN0YXJ0ZWQgPSBfcnVuUGFja2FnZXMocGtnTmFtZXMsIHBrZ05hbWUgPT4gcGtnRW50cnlNYXAuZ2V0KHBrZ05hbWUpKVxuICAudGhlbihyZXZlcnNlT3JkZXJQa2dFeHBvcnRzID0+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2U8dHlwZW9mIHJldmVyc2VPcmRlclBrZ0V4cG9ydHM+KHJlc29sdmUgPT4gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICByZXNvbHZlKHJldmVyc2VPcmRlclBrZ0V4cG9ydHMpO1xuICAgIH0sIDUwMCkpO1xuICB9KTtcblxuICAvLyBjb25zdCByZXZlcnNlT3JkZXJQa2dFeHBvcnRzID0gYXdhaXQgcnVuUGFja2FnZXMoJyNhY3RpdmF0ZScsIHBrZ3MpO1xuXG4gIC8vIGF3YWl0IG5ldyBQcm9taXNlKHJlc29sdmUgPT4gc2V0VGltZW91dChyZXNvbHZlLCA1MDApKTtcbiAgcmV0dXJuIHtcbiAgICBzdGFydGVkLFxuICAgIGFzeW5jIHNodXRkb3duKCkge1xuICAgICAgY29uc3QgcmV2ZXJzZU9yZGVyUGtnRXhwb3J0cyA9IGF3YWl0IHN0YXJ0ZWQ7XG4gICAgICBsb2cuaW5mbygnc2h1dHRpbmcgZG93bicpO1xuICAgICAgZm9yIChjb25zdCB7bmFtZSwgZXhwfSBvZiByZXZlcnNlT3JkZXJQa2dFeHBvcnRzKSB7XG4gICAgICAgIGlmIChfLmlzRnVuY3Rpb24oZXhwLmRlYWN0aXZhdGUpKSB7XG4gICAgICAgICAgbG9nLmluZm8oJ2RlYWN0aXZhdGUnLCBuYW1lKTtcbiAgICAgICAgICBhd2FpdCBQcm9taXNlLnJlc29sdmUoZXhwLmRlYWN0aXZhdGUoKSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH07XG59XG5cbmNvbnN0IGFwaUNhY2hlOiB7W25hbWU6IHN0cmluZ106IGFueX0gPSB7fTtcbi8vIGNvbnN0IHBhY2thZ2VUcmVlID0gbmV3IERpclRyZWU8UGFja2FnZUluc3RhbmNlPigpO1xuXG4vKipcbiAqIExhemlseSBpbml0IGluamVjdG9yIGZvciBwYWNrYWdlcyBhbmQgcnVuIHNwZWNpZmljIHBhY2thZ2Ugb25seSxcbiAqIG5vIGZ1bGx5IHNjYW5uaW5nIG9yIG9yZGVyaW5nIG9uIGFsbCBwYWNrYWdlc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuU2luZ2xlUGFja2FnZSh7dGFyZ2V0LCBhcmdzfToge3RhcmdldDogc3RyaW5nOyBhcmdzOiBzdHJpbmdbXX0pIHtcbiAgaWYgKCFpc0N3ZFdvcmtzcGFjZSgpKSB7XG4gICAgcmV0dXJuIFByb21pc2UucmVqZWN0KG5ldyBFcnJvcignQ3VycmVudCBkaXJlY3RvcnkgaXMgbm90IGEgd29ya3NwYWNlIGRpcmVjdG9yeScpKTtcbiAgfVxuICBjb25zdCBbcGtnSW5mb10gPSBpbml0SW5qZWN0b3JGb3JOb2RlUGFja2FnZXMoKTtcblxuICBjb25zdCBbZmlsZSwgZnVuY10gPSB0YXJnZXQuc3BsaXQoJyMnKTtcbiAgY29uc3QgcGtnTmFtZU1hdGNoID0gLygoPzpAW14vXStcXC8pP1thLXpBLVowLTlfLV0rKVxcLyQvLmV4ZWMoZmlsZSk7XG4gIGxldCBtb2R1bGVOYW1lID0gUGF0aC5yZXNvbHZlKGZpbGUpO1xuICBpZiAocGtnTmFtZU1hdGNoICYmIHBrZ05hbWVNYXRjaFsxXSAmJiBfLmhhcyhwa2dJbmZvLm1vZHVsZU1hcCwgcGtnTmFtZU1hdGNoWzFdKSkge1xuICAgIG1vZHVsZU5hbWUgPSBmaWxlO1xuICB9XG4gIGNvbnN0IF9leHBvcnRzID0gcmVxdWlyZShQYXRoLnJlc29sdmUoZ2V0V29ya0RpcigpLCAnbm9kZV9tb2R1bGVzJywgbW9kdWxlTmFtZSkpO1xuICBpZiAoIV8uaGFzKF9leHBvcnRzLCBmdW5jKSkge1xuICAgIGxvZy5lcnJvcihgVGhlcmUgaXMgbm8gZXhwb3J0IGZ1bmN0aW9uOiAke2Z1bmN9LCBleGlzdGluZyBleHBvcnQgbWVtYmVycyBhcmU6XFxuYCArXG4gICAgYCR7T2JqZWN0LmtleXMoX2V4cG9ydHMpLmZpbHRlcihuYW1lID0+IHR5cGVvZiAoX2V4cG9ydHNbbmFtZV0pID09PSAnZnVuY3Rpb24nKS5tYXAobmFtZSA9PiBuYW1lICsgJygpJykuam9pbignXFxuJyl9YCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGF3YWl0IFByb21pc2UucmVzb2x2ZShfZXhwb3J0c1tmdW5jXS5hcHBseShnbG9iYWwsIGFyZ3MgfHwgW10pKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJ1blBhY2thZ2VzKHRhcmdldDogc3RyaW5nLCBpbmNsdWRlUGFja2FnZXM6IEl0ZXJhYmxlPHN0cmluZz4pOiBQcm9taXNlPHtuYW1lOiBzdHJpbmc7IGV4cDogYW55fVtdPiB7XG5cbiAgcmV0dXJuIF9ydW5QYWNrYWdlcyhpbmNsdWRlUGFja2FnZXMsICgpID0+IHRhcmdldC5zcGxpdCgnIycpIGFzIFtzdHJpbmcsIHN0cmluZ10pO1xufVxuXG5hc3luYyBmdW5jdGlvbiBfcnVuUGFja2FnZXMoaW5jbHVkZVBhY2thZ2VzOiBJdGVyYWJsZTxzdHJpbmc+LFxuICB0YXJnZXRPZlBrZzogKHBrZzogc3RyaW5nKSA9PiBbZmlsZVRvUnVuOiBzdHJpbmcgfCB1bmRlZmluZWQsIGZ1bmNUb1J1bjogc3RyaW5nXSB8IHVuZGVmaW5lZCB8IG51bGxcbik6IFByb21pc2U8e25hbWU6IHN0cmluZzsgZXhwOiBhbnl9W10+IHtcbiAgY29uc3QgaW5jbHVkZU5hbWVTZXQgPSBuZXcgU2V0PHN0cmluZz4oaW5jbHVkZVBhY2thZ2VzKTtcbiAgY29uc3QgcGtnRXhwb3J0c0luUmV2ZXJPcmRlcjoge25hbWU6IHN0cmluZzsgZXhwOiBhbnl9W10gPSBbXTtcblxuICBjb25zdCBbcGFja2FnZUluZm8sIHByb3RvXSA9IGluaXRJbmplY3RvckZvck5vZGVQYWNrYWdlcygpO1xuICBjb25zdCBjb21wb25lbnRzID0gcGFja2FnZUluZm8uYWxsTW9kdWxlcy5maWx0ZXIocGsgPT4ge1xuICAgIGNvbnN0IHRhcmdldCA9IHRhcmdldE9mUGtnKHBrLm5hbWUpO1xuICAgIGlmICh0YXJnZXQgPT0gbnVsbClcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICBjb25zdCBbZmlsZVRvUnVuXSA9IHRhcmdldDtcbiAgICAvLyBzZXR1cFJlcXVpcmVJbmplY3RzKHBrLCBOb2RlQXBpKTsgLy8gQWxsIGNvbXBvbmVudCBwYWNrYWdlIHNob3VsZCBiZSBhYmxlIHRvIGFjY2VzcyAnX19hcGknLCBldmVuIHRoZXkgYXJlIG5vdCBpbmNsdWRlZFxuICAgIGlmICgoaW5jbHVkZU5hbWVTZXQuc2l6ZSA9PT0gMCB8fCBpbmNsdWRlTmFtZVNldC5oYXMocGsubG9uZ05hbWUpIHx8IGluY2x1ZGVOYW1lU2V0Lmhhcyhway5zaG9ydE5hbWUpKSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgaWYgKGZpbGVUb1J1bilcbiAgICAgICAgICByZXF1aXJlLnJlc29sdmUoUGF0aC5yZXNvbHZlKGdldFdvcmtEaXIoKSwgJ25vZGVfbW9kdWxlcycsIHBrLmxvbmdOYW1lLCBmaWxlVG9SdW4pKTtcbiAgICAgICAgZWxzZVxuICAgICAgICAgIHJlcXVpcmUucmVzb2x2ZShQYXRoLnJlc29sdmUoZ2V0V29ya0RpcigpLCAnbm9kZV9tb2R1bGVzJywgcGsubG9uZ05hbWUpKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gZmFsc2U7XG4gIH0pO1xuXG4gIGNvbnN0IHBhY2thZ2VOYW1lc0luT3JkZXI6IHN0cmluZ1tdID0gW107XG4gIGNvbnN0IE5vZGVBcGk6IHR5cGVvZiBfTm9kZUFwaSA9IHJlcXVpcmUoJy4vcGFja2FnZS1tZ3Ivbm9kZS1wYWNrYWdlLWFwaScpLmRlZmF1bHQ7XG5cblxuICBhd2FpdCBvcmRlclBhY2thZ2VzKGNvbXBvbmVudHMubWFwKGl0ZW0gPT4gKHtcbiAgICBuYW1lOiBpdGVtLmxvbmdOYW1lLFxuICAgIHByaW9yaXR5OiBfLmdldChpdGVtLmpzb24sICdwbGluay5zZXJ2ZXJQcmlvcml0eScsIF8uZ2V0KGl0ZW0uanNvbiwgJ2RyLnNlcnZlclByaW9yaXR5JykpXG4gIH0pKSxcbiAgICBwa0luc3RhbmNlICA9PiB7XG4gICAgICBjb25zdCBbZmlsZVRvUnVuLCBmdW5jVG9SdW5dID0gdGFyZ2V0T2ZQa2cocGtJbnN0YW5jZS5uYW1lKSE7XG4gICAgICBwYWNrYWdlTmFtZXNJbk9yZGVyLnB1c2gocGtJbnN0YW5jZS5uYW1lKTtcbiAgICAgIGNvbnN0IG1vZCA9IHBrSW5zdGFuY2UubmFtZSArICggZmlsZVRvUnVuID8gJy8nICsgZmlsZVRvUnVuIDogJycpO1xuICAgICAgbG9nLmRlYnVnKCdyZXF1aXJlKCVzZiknLCBKU09OLnN0cmluZ2lmeShtb2QpKTtcbiAgICAgIGNvbnN0IGZpbGVFeHBvcnRzID0gcmVxdWlyZShQYXRoLnJlc29sdmUoZ2V0V29ya0RpcigpLCAnbm9kZV9tb2R1bGVzJywgbW9kKSk7XG4gICAgICBwa2dFeHBvcnRzSW5SZXZlck9yZGVyLnVuc2hpZnQoe25hbWU6IHBrSW5zdGFuY2UubmFtZSwgZXhwOiBmaWxlRXhwb3J0c30pO1xuICAgICAgaWYgKF8uaXNGdW5jdGlvbihmaWxlRXhwb3J0c1tmdW5jVG9SdW5dKSkge1xuICAgICAgICBsb2cuaW5mbyhmdW5jVG9SdW4gKyBgICR7Y2hhbGsuY3lhbihtb2QpfWApO1xuICAgICAgICByZXR1cm4gZmlsZUV4cG9ydHNbZnVuY1RvUnVuXShnZXRBcGlGb3JQYWNrYWdlKHBhY2thZ2VJbmZvLm1vZHVsZU1hcFtwa0luc3RhbmNlLm5hbWVdLCBOb2RlQXBpKSk7XG4gICAgICB9XG4gIH0pO1xuICAocHJvdG8uZXZlbnRCdXMgKS5lbWl0KCdkb25lJywge30pO1xuICBOb2RlQXBpLnByb3RvdHlwZS5ldmVudEJ1cy5lbWl0KCdwYWNrYWdlc0FjdGl2YXRlZCcsIGluY2x1ZGVOYW1lU2V0KTtcbiAgcmV0dXJuIHBrZ0V4cG9ydHNJblJldmVyT3JkZXI7XG59XG5cbi8qKlxuICogU28gdGhhdCB3ZSBjYW4gdXNlIGBpbXBvcnQgYXBpIGZyb20gJ19fcGxpbmsnYCBhbnl3aGVyZSBpbiBvdXIgcGFja2FnZVxuICovXG5leHBvcnQgZnVuY3Rpb24gaW5pdEluamVjdG9yRm9yTm9kZVBhY2thZ2VzKCk6XG4gIFtQYWNrYWdlSW5mbywgX05vZGVBcGldIHtcbiAgY29uc3Qge2dldFBrZ09mRmlsZSwgcGFja2FnZUluZm99ID0gcGFja2FnZU9mRmlsZUZhY3RvcnkoKTtcbiAgLy8gY29uc3QgcGFja2FnZUluZm86IFBhY2thZ2VJbmZvID0gd2Fsa1BhY2thZ2VzKCk7XG4gIGNvbnN0IE5vZGVBcGk6IHR5cGVvZiBfTm9kZUFwaSA9IHJlcXVpcmUoJy4vcGFja2FnZS1tZ3Ivbm9kZS1wYWNrYWdlLWFwaScpLmRlZmF1bHQ7XG4gIGNvbnN0IHByb3RvID0gTm9kZUFwaS5wcm90b3R5cGU7XG4gIHByb3RvLmFyZ3YgPSB7fTtcbiAgcHJvdG8ucGFja2FnZUluZm8gPSBwYWNrYWdlSW5mbztcblxuICBwcm90by5maW5kUGFja2FnZUJ5RmlsZSA9IGdldFBrZ09mRmlsZTtcbiAgcHJvdG8uZ2V0Tm9kZUFwaUZvclBhY2thZ2UgPSBmdW5jdGlvbihwYWNrYWdlSW5zdGFuY2U6IFBhY2thZ2VJbnN0YW5jZSkge1xuICAgIHJldHVybiBnZXRBcGlGb3JQYWNrYWdlKHBhY2thZ2VJbnN0YW5jZSwgTm9kZUFwaSk7XG4gIH07XG4gIHByb3RvLmJyb3dzZXJJbmplY3RvciA9IHdlYkluamVjdG9yO1xuICBwYWNrYWdlSW5mby5hbGxNb2R1bGVzLmZvckVhY2gocGsgPT4ge1xuICAgIHNldHVwUmVxdWlyZUluamVjdHMocGssIE5vZGVBcGkpOyAvLyBBbGwgY29tcG9uZW50IHBhY2thZ2Ugc2hvdWxkIGJlIGFibGUgdG8gYWNjZXNzICdfX2FwaScsIGV2ZW4gdGhleSBhcmUgbm90IGluY2x1ZGVkXG4gIH0pO1xuICBub2RlSW5qZWN0b3IucmVhZEluamVjdEZpbGUoKTtcbiAgd2ViSW5qZWN0b3IucmVhZEluamVjdEZpbGUoJ21vZHVsZS1yZXNvbHZlLmJyb3dzZXInKTtcbiAgcmV0dXJuIFtwYWNrYWdlSW5mbywgcHJvdG9dO1xufVxuXG4vKipcbiAqIEBkZXByZWNhdGVkXG4gKiBTdXBwb3J0IGBpbXBvcnQgYXBpIGZyb20gJ19fYXBpJztgXG4gKiBAcGFyYW0gYXJndiBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHByZXBhcmVMYXp5Tm9kZUluamVjdG9yKGFyZ3Y/OiB7W2tleTogc3RyaW5nXTogYW55fSkge1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1tZW1iZXItYWNjZXNzXG4gIGNvbnN0IE5vZGVBcGk6IHR5cGVvZiBfTm9kZUFwaSA9IHJlcXVpcmUoJy4vcGFja2FnZS1tZ3Ivbm9kZS1wYWNrYWdlLWFwaScpLmRlZmF1bHQ7XG4gIGNvbnN0IHByb3RvID0gTm9kZUFwaS5wcm90b3R5cGU7XG4gIHByb3RvLmFyZ3YgPSBhcmd2IHx8IHt9O1xuICBsZXQgcGFja2FnZUluZm86IFBhY2thZ2VJbmZvO1xuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShwcm90bywgJ3BhY2thZ2VJbmZvJywge1xuICAgIGdldCgpIHtcbiAgICAgIGlmIChwYWNrYWdlSW5mbyA9PSBudWxsKVxuICAgICAgICBwYWNrYWdlSW5mbyA9IHdhbGtQYWNrYWdlcygpO1xuICAgICAgcmV0dXJuIHBhY2thZ2VJbmZvO1xuICAgIH1cbiAgfSk7XG4gIHByb3RvLmZpbmRQYWNrYWdlQnlGaWxlID0gY3JlYXRlTGF6eVBhY2thZ2VGaWxlRmluZGVyKCk7XG4gIHByb3RvLmdldE5vZGVBcGlGb3JQYWNrYWdlID0gZnVuY3Rpb24ocGFja2FnZUluc3RhbmNlOiBOb2RlUGFja2FnZSkge1xuICAgIHJldHVybiBnZXRBcGlGb3JQYWNrYWdlKHBhY2thZ2VJbnN0YW5jZSwgTm9kZUFwaSk7XG4gIH07XG4gIG5vZGVJbmplY3Rvci5mcm9tUm9vdCgpXG4gIC8vIC5hbGlhcygnbG9nNGpzJywgUGF0aC5yZXNvbHZlKGNvbmZpZygpLnJvb3RQYXRoLCAnbm9kZV9tb2R1bGVzL2xvZzRqcycpKVxuICAudmFsdWUoJ19faW5qZWN0b3InLCBub2RlSW5qZWN0b3IpXG4gIC5mYWN0b3J5KCdfX2FwaScsIChzb3VyY2VGaWxlUGF0aDogc3RyaW5nKSA9PiB7XG4gICAgY29uc3QgcGFja2FnZUluc3RhbmNlID0gcHJvdG8uZmluZFBhY2thZ2VCeUZpbGUoc291cmNlRmlsZVBhdGgpO1xuICAgIGlmIChwYWNrYWdlSW5zdGFuY2UpXG4gICAgICByZXR1cm4gZ2V0QXBpRm9yUGFja2FnZShwYWNrYWdlSW5zdGFuY2UsIE5vZGVBcGkpO1xuICAgIHJldHVybiBudWxsO1xuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1hcFBhY2thZ2VzQnlUeXBlKHR5cGVzOiBzdHJpbmdbXSwgb25FYWNoUGFja2FnZTogKG5vZGVQYWNrYWdlOiBOb2RlUGFja2FnZSkgPT4gdm9pZCkge1xuICBjb25zdCBwYWNrYWdlc01hcDoge1t0eXBlOiBzdHJpbmddOiBOb2RlUGFja2FnZVtdfSA9IHt9O1xuICB0eXBlcy5mb3JFYWNoKHR5cGUgPT4ge1xuICAgIHBhY2thZ2VzTWFwW3R5cGVdID0gW107XG4gIH0pO1xuXG4gIGZvciAoY29uc3QgcGtnIG9mIHBhY2thZ2VzNFdvcmtzcGFjZSgpKSB7XG4gICAgY29uc3QgbmFtZSA9IHBrZy5uYW1lO1xuICAgIGNvbnN0IHBrSW5zdGFuY2UgPSBuZXcgTm9kZVBhY2thZ2Uoe1xuICAgICAgbW9kdWxlTmFtZTogbmFtZSxcbiAgICAgIHNob3J0TmFtZTogcGtnLnNob3J0TmFtZSxcbiAgICAgIG5hbWUsXG4gICAgICBsb25nTmFtZTogbmFtZSxcbiAgICAgIHNjb3BlOiBwa2cuc2NvcGUsXG4gICAgICBwYXRoOiBQYXRoLnJlc29sdmUoZ2V0V29ya0RpcigpLCBwa2cucGF0aCksXG4gICAgICBqc29uOiBwa2cuanNvbixcbiAgICAgIHJlYWxQYXRoOiBwa2cucmVhbFBhdGhcbiAgICB9KTtcbiAgICBjb25zdCBkclR5cGVzID0gKFtdIGFzIHN0cmluZ1tdKS5jb25jYXQoXy5nZXQocGtnLmpzb24sICdwbGluay50eXBlJywgXy5nZXQocGtnLmpzb24sICdkci50eXBlJykpKTtcbiAgICBmb3IgKGNvbnN0IHR5cGUgb2YgdHlwZXMpIHtcbiAgICAgIGlmICghXy5pbmNsdWRlcyhkclR5cGVzLCB0eXBlKSlcbiAgICAgICAgY29udGludWU7XG4gICAgICBwYWNrYWdlc01hcFt0eXBlXS5wdXNoKHBrSW5zdGFuY2UpO1xuICAgIH1cbiAgICBpZiAob25FYWNoUGFja2FnZSkge1xuICAgICAgb25FYWNoUGFja2FnZShwa0luc3RhbmNlKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHBhY2thZ2VzTWFwO1xufVxuXG5mdW5jdGlvbiBzZXR1cFJlcXVpcmVJbmplY3RzKHBrSW5zdGFuY2U6IFBhY2thZ2VJbnN0YW5jZSwgTm9kZUFwaTogdHlwZW9mIF9Ob2RlQXBpICkge1xuICBmdW5jdGlvbiBhcGlGYWN0b3J5KCkge1xuICAgIHJldHVybiBnZXRBcGlGb3JQYWNrYWdlKHBrSW5zdGFuY2UsIE5vZGVBcGkpIGFzIHVua25vd247XG4gIH1cbiAgbm9kZUluamVjdG9yLmFkZFBhY2thZ2UocGtJbnN0YW5jZS5sb25nTmFtZSwgcGtJbnN0YW5jZS5yZWFsUGF0aCxcbiAgICBwa0luc3RhbmNlLnBhdGggPT09IHBrSW5zdGFuY2UucmVhbFBhdGggPyB1bmRlZmluZWQgOiBwa0luc3RhbmNlLnBhdGgpO1xuICBub2RlSW5qZWN0b3IuZnJvbURpcihwa0luc3RhbmNlLnJlYWxQYXRoKVxuICAudmFsdWUoJ19faW5qZWN0b3InLCBub2RlSW5qZWN0b3IpXG4gIC5mYWN0b3J5KCdfX2FwaScsIGFwaUZhY3RvcnkpXG4gIC5mYWN0b3J5KCdfX3BsaW5rJywgYXBpRmFjdG9yeSk7XG5cbiAgLy8gd2ViSW5qZWN0b3IuZnJvbURpcihwa0luc3RhbmNlLnJlYWxQYXRoKVxuICAvLyAucmVwbGFjZUNvZGUoJ19fYXBpJywgJ19fYXBpJyk7XG4gIC8vIC5zdWJzdGl0dXRlKC9eKFtee10qKVxce2xvY2FsZVxcfSguKikkLyxcbiAgLy8gICAoX2ZpbGVQYXRoOiBzdHJpbmcsIG1hdGNoOiBSZWdFeHBFeGVjQXJyYXkpID0+IG1hdGNoWzFdICsgYXBpUHJvdG90eXBlLmdldEJ1aWxkTG9jYWxlKCkgKyBtYXRjaFsyXSk7XG4gIGNvbnN0IHN5bWxpbmtEaXIgPSBwa0luc3RhbmNlLnBhdGggIT09IHBrSW5zdGFuY2UucmVhbFBhdGggPyBwa0luc3RhbmNlLnBhdGggOiBudWxsO1xuICBpZiAoc3ltbGlua0Rpcikge1xuICAgIG5vZGVJbmplY3Rvci5mcm9tRGlyKHN5bWxpbmtEaXIpXG4gICAgLnZhbHVlKCdfX2luamVjdG9yJywgbm9kZUluamVjdG9yKVxuICAgIC5mYWN0b3J5KCdfX3BsaW5rJywgYXBpRmFjdG9yeSk7XG5cbiAgICAvLyB3ZWJJbmplY3Rvci5mcm9tRGlyKHN5bWxpbmtEaXIpXG4gICAgLy8gLnJlcGxhY2VDb2RlKCdfX2FwaScsICdfX2FwaScpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldEFwaUZvclBhY2thZ2UocGtJbnN0YW5jZTogTm9kZVBhY2thZ2UsIE5vZGVBcGk6IHR5cGVvZiBfTm9kZUFwaSkge1xuICBpZiAoXy5oYXMoYXBpQ2FjaGUsIHBrSW5zdGFuY2UubG9uZ05hbWUpKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtcmV0dXJuXG4gICAgcmV0dXJuIGFwaUNhY2hlW3BrSW5zdGFuY2UubG9uZ05hbWVdO1xuICB9XG5cbiAgY29uc3QgYXBpID0gbmV3IE5vZGVBcGkocGtJbnN0YW5jZS5sb25nTmFtZSwgcGtJbnN0YW5jZSk7XG4gIGFwaUNhY2hlW3BrSW5zdGFuY2UubG9uZ05hbWVdID0gYXBpO1xuICBhcGkuZGVmYXVsdCA9IGFwaTsgLy8gRm9yIEVTNiBpbXBvcnQgc3ludGF4XG4gIHJldHVybiBhcGk7XG59XG4iXX0=