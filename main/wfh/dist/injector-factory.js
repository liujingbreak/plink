"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.doInjectorConfig = exports.doInjectorConfigSync = exports.webInjector = exports.nodeInjector = exports.DrPackageInjector = void 0;
const tslib_1 = require("tslib");
const require_injector_1 = tslib_1.__importDefault(require("require-injector"));
const factory_map_1 = require("require-injector/dist/factory-map");
const _ = tslib_1.__importStar(require("lodash"));
const fs = tslib_1.__importStar(require("fs"));
const Path = tslib_1.__importStar(require("path"));
const log4js_1 = tslib_1.__importDefault(require("log4js"));
const misc_1 = require("./utils/misc");
const log = log4js_1.default.getLogger('plink.injector-factory');
const packageNamePathMap = new Map();
const emptyFactoryMap = {
    factory: emptryChainableFunction,
    substitute: emptryChainableFunction,
    value: emptryChainableFunction,
    alias: emptryChainableFunction
};
class DrPackageInjector extends require_injector_1.default {
    constructor(noNode = false) {
        super({
            basedir: (0, misc_1.getRootDir)(),
            // debug: config.devMode,
            noNode
        });
        this.noNode = noNode;
    }
    addPackage(name, dir, symlinkDir) {
        log.debug('add %s %s', name, dir);
        packageNamePathMap.set(name, { symlink: symlinkDir, realPath: dir });
    }
    fromPlinkPackage(name, dir) {
        const names = [].concat(name);
        if (dir) {
            const dirs = [].concat(dir);
            let i = 0;
            if (names.length !== dirs.length)
                throw new Error('fromComponent(name, dir)\'s be called with 2 Array of same length');
            for (const nm of names) {
                this.addPackage(nm, dirs[i++]);
            }
        }
        const factoryMaps = [];
        for (const nm of names) {
            const paths = packageNamePathMap.get(nm);
            if (paths) {
                factoryMaps.push(super.fromDir(paths.realPath));
                if (paths.symlink) {
                    factoryMaps.push(super.fromDir(paths.symlink));
                }
            }
            else {
                factoryMaps.push(super.fromPackage(nm));
            }
        }
        return new factory_map_1.FactoryMapCollection(factoryMaps);
    }
    fromAllComponents() {
        const realpaths = Array.from(packageNamePathMap.values())
            .map(item => item.realPath);
        const symlinks = Array.from(packageNamePathMap.values())
            .map(item => item.symlink).filter(dir => dir != null);
        return super.fromDir(realpaths.concat(symlinks));
    }
    fromAllPackages() {
        return this.fromAllComponents();
    }
    notFromPackages(...excludePackages) {
        const names = _.difference(_.keys(packageNamePathMap), excludePackages);
        const dirs = names.map(pkName => packageNamePathMap[pkName]);
        log.debug('from ' + dirs);
        return super.fromDir(dirs);
    }
    readInjectFile(fileNameWithoutExt) {
        if (!fileNameWithoutExt)
            fileNameWithoutExt = 'module-resolve.server';
        _.uniq([
            Path.resolve((0, misc_1.getRootDir)(), fileNameWithoutExt),
            Path.resolve((0, misc_1.getWorkDir)(), fileNameWithoutExt)
        ]).forEach(file => {
            const file1 = fs.existsSync(file + '.ts') ? file + '.ts' : file + '.js';
            if (fs.existsSync(file1)) {
                log.debug('execute internal ' + file1);
                let exported = require(file1);
                if (exported.default)
                    exported = exported.default;
                exported(this);
            }
            else {
                log.debug(file1 + ' doesn\'t exist, skip it.');
            }
        });
        return doInjectorConfigSync(this, !this.noNode);
    }
}
exports.DrPackageInjector = DrPackageInjector;
exports.nodeInjector = new DrPackageInjector(false);
exports.webInjector = new DrPackageInjector(true);
function doInjectorConfigSync(factory, isNode = false) {
    const config = require('./config').default;
    config.configHandlerMgrChanged(handler => {
        handler.runEachSync((_file, _lastResult, handler) => {
            if (isNode && handler.setupNodeInjector)
                handler.setupNodeInjector(factory, config());
            else if (!isNode && handler.setupWebInjector)
                handler.setupWebInjector(factory, config());
        }, 'Injector configuration for ' + (isNode ? 'Node.js runtime' : 'client side build tool'));
    });
}
exports.doInjectorConfigSync = doInjectorConfigSync;
function emptryChainableFunction() {
    return emptyFactoryMap;
}
/** @deprecated */
function doInjectorConfig(factory, isNode = false) {
    const config = require('./config').default;
    config.configHandlerMgrChanged(handler => {
        void handler.runEach((_file, _lastResult, handler) => {
            if (isNode && handler.setupNodeInjector)
                handler.setupNodeInjector(factory, config());
            else if (!isNode && handler.setupWebInjector)
                handler.setupWebInjector(factory, config());
        }, 'Injector configuration for ' + (isNode ? 'Node.js runtime' : 'client side build tool'));
    });
}
exports.doInjectorConfig = doInjectorConfig;
//# sourceMappingURL=injector-factory.js.map