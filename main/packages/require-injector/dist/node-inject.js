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
exports.parseSymlink = exports.NodeInjector = exports.default = exports.FactoryMapCollection = exports.FactoryMap = void 0;
const module_1 = __importDefault(require("module"));
const events_1 = __importDefault(require("events"));
const path_1 = __importDefault(require("path"));
const fs = __importStar(require("fs"));
const lodash_1 = __importDefault(require("lodash"));
const log4js_1 = __importDefault(require("log4js"));
const dir_tree_1 = require("./dir-tree");
const factory_map_1 = require("./factory-map");
Object.defineProperty(exports, "FactoryMap", { enumerable: true, get: function () { return factory_map_1.FactoryMap; } });
Object.defineProperty(exports, "FactoryMapCollection", { enumerable: true, get: function () { return factory_map_1.FactoryMapCollection; } });
const log = log4js_1.default.getLogger('require-injector.node-inject');
const emptyFactoryMap = {
    factory: emptryChainableFunction,
    substitute: emptryChainableFunction,
    alias: emptryChainableFunction,
    replaceCode: emptryChainableFunction,
    value: emptryChainableFunction
};
class Injector extends events_1.default.EventEmitter {
    constructor(opts) {
        super();
        this.config = {};
        // this.sortedDirs = [];
        this.dirTree = new dir_tree_1.DirTree();
        // this.injectionScopeMap = {};
        this.oldRequire = module_1.default.prototype.require;
        this._initOption(opts);
    }
    cleanup() {
        module_1.default.prototype.require = this.oldRequire;
        // this.sortedDirs.splice(0);
        this.dirTree = new dir_tree_1.DirTree();
        // var self = this;
        // _.each(_.keys(self.injectionScopeMap), function(key) {
        // 	delete self.injectionScopeMap[key];
        // });
        this.config = {};
        if (this.config.debug)
            log.debug('cleanup');
    }
    fromPackage(packageName, resolveOpts) {
        if (Array.isArray(packageName)) {
            // eslint-disable-next-line prefer-rest-params
            const args = [].slice.call(arguments);
            const factoryMaps = lodash_1.default.map(packageName, single => {
                args[0] = single;
                // eslint-disable-next-line prefer-spread
                return this._fromPackage.apply(this, args);
            });
            return new factory_map_1.FactoryMapCollection(factoryMaps);
        }
        else {
            return this._fromPackage(packageName, resolveOpts);
        }
    }
    _fromPackage(packageName, resolveOpts) {
        // var resolveSync = resolve;
        if (!resolveOpts) {
            resolveOpts = this.config.resolveOpts;
        }
        let dir = (resolveOpts === null || resolveOpts === void 0 ? void 0 : resolveOpts.basedir) || process.cwd();
        const { root: rootDir } = path_1.default.parse(dir);
        let jsonPath;
        do {
            const testPkgJson = path_1.default.resolve(dir, 'node_modules', packageName, 'package.json');
            if (fs.existsSync(testPkgJson)) {
                jsonPath = testPkgJson;
                break;
            }
            else {
                dir = path_1.default.dirname(dir);
            }
        } while (dir !== rootDir);
        if (jsonPath == null) {
            log.info(packageName + ' is not Found, will be skipped from .fromPackage()');
            return emptyFactoryMap;
        }
        const path = path_1.default.dirname(jsonPath);
        return this._fromDir(path, this.dirTree);
    }
    fromRoot() {
        return this._fromDir('', this.dirTree);
    }
    fromDir(dir) {
        if (lodash_1.default.isArray(dir)) {
            const args = [].slice.call(arguments);
            const factoryMaps = lodash_1.default.map(dir, single => {
                args[0] = single;
                return this.resolveFromDir.apply(this, args);
            });
            return new factory_map_1.FactoryMapCollection(factoryMaps);
        }
        else {
            return this.resolveFromDir(dir);
        }
    }
    resolveFromDir(dir) {
        const path = this.config.basedir ?
            path_1.default.resolve(this.config.basedir, dir) : path_1.default.resolve(dir);
        return this._fromDir(path, this.dirTree);
    }
    /**
       * Recursively build dirTree, subDirMap
       * @param  {string} path new directory
       * @param  {Array<string>} dirs [description]
       * @return {[type]}      [description]
       */
    _fromDir(path, tree) {
        let factory;
        const linked = parseSymlink(path);
        if (linked !== path) {
            log.debug('%s is symbolic link path to %s', path, linked);
            factory = this._createFactoryMapFor(linked, tree);
        }
        return this._createFactoryMapFor(path, tree, factory);
    }
    _createFactoryMapFor(path = '', tree, existingFactory) {
        // path = this._pathToSortKey(path);
        if (!existingFactory) {
            let f = tree.getData(path);
            if (f) {
                return f;
            }
            else {
                f = new factory_map_1.FactoryMap(this.config);
                tree.putData(path, f);
                return f;
            }
        }
        else {
            tree.putData(path, existingFactory);
            return existingFactory;
        }
    }
    /**
       * Return array of configured FactoryMap for source code file depends on the file's location.
       * Later on, you can call `factoryMap.matchRequire(name)` to get exact inject value
       * @return {FactoryMap[]} Empty array if there is no injector configured for current file
       */
    factoryMapsForFile(fromFile) {
        const fmaps = this.dirTree.getAllData(fromFile);
        return lodash_1.default.reverse(fmaps);
    }
    testable() {
        return this;
    }
    _initOption(opts) {
        if (opts)
            this.config = opts;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        if (!lodash_1.default.get(opts, 'noNode')) {
            module_1.default.prototype.require = function (path) {
                return self.replacingRequire(this, path);
            };
        }
    }
    inject(calleeModule, name) {
        if (calleeModule.filename == null)
            return this.oldRequire.call(calleeModule, name);
        const fmaps = this.factoryMapsForFile(calleeModule.filename);
        if (fmaps.length === 0)
            return this.oldRequire.call(calleeModule, name);
        let injected;
        const match = lodash_1.default.some(fmaps, factoryMap => {
            const injector = factoryMap.matchRequire(name);
            if (injector == null) {
                return false;
            }
            if (this.config.debug) {
                log.debug('inject %s', name);
            }
            injected = factoryMap.getInjected(injector, calleeModule.filename, calleeModule, this.oldRequire);
            this.emit('inject', calleeModule.filename);
            return true;
        });
        if (!match)
            return this.oldRequire.call(calleeModule, name);
        return injected;
    }
    replacingRequire(calleeModule, path) {
        try {
            return this.inject(calleeModule, path);
        }
        catch (e) {
            if (this.config.debug)
                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                log.debug('require from : ', calleeModule.filename, e.message);
            throw e;
        }
    }
}
exports.default = Injector;
exports.NodeInjector = Injector;
/**
 * If a path contains symbolic link, return the exact real path
 * Unlike fs.realpath, it also works for nonexist path
 */
function parseSymlink(path) {
    try {
        fs.accessSync(path, fs.constants.F_OK);
        return fs.realpathSync(path);
    }
    catch (e) { }
    path = path_1.default.resolve(path);
    const parsed = path_1.default.parse(path);
    let dir = parsed.root;
    const pathElements = path.split(path_1.default.sep).slice(1);
    pathElements.some((el, index) => {
        if (!lodash_1.default.endsWith(dir, path_1.default.sep))
            dir += path_1.default.sep;
        dir += el;
        try {
            fs.accessSync(dir, fs.constants.F_OK);
        }
        catch (e) {
            const restPart = pathElements.slice(index + 1).join(path_1.default.sep);
            dir += restPart.length > 0 ? path_1.default.sep + restPart : restPart;
            return true;
        }
        if (fs.lstatSync(dir).isSymbolicLink()) {
            const link = fs.readlinkSync(dir);
            dir = path_1.default.resolve(path_1.default.dirname(dir), link);
        }
        return false;
    });
    return dir;
}
exports.parseSymlink = parseSymlink;
function emptryChainableFunction(name, RegExp) {
    return emptyFactoryMap;
}
//# sourceMappingURL=node-inject.js.map