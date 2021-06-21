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
exports.doInjectorConfig = exports.doInjectorConfigSync = exports.webInjector = exports.nodeInjector = exports.DrPackageInjector = void 0;
const require_injector_1 = __importDefault(require("require-injector"));
const factory_map_1 = require("require-injector/dist/factory-map");
const _ = __importStar(require("lodash"));
const fs = __importStar(require("fs"));
const Path = __importStar(require("path"));
const log4js_1 = __importDefault(require("log4js"));
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
            basedir: misc_1.getRootDir(),
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
            Path.resolve(misc_1.getRootDir(), fileNameWithoutExt),
            Path.resolve(misc_1.getWorkDir(), fileNameWithoutExt)
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
        handler.runEachSync((file, lastResult, handler) => {
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
        handler.runEach((file, lastResult, handler) => {
            if (isNode && handler.setupNodeInjector)
                handler.setupNodeInjector(factory, config());
            else if (!isNode && handler.setupWebInjector)
                handler.setupWebInjector(factory, config());
        }, 'Injector configuration for ' + (isNode ? 'Node.js runtime' : 'client side build tool'));
    });
}
exports.doInjectorConfig = doInjectorConfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5qZWN0b3ItZmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2luamVjdG9yLWZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHdFQUFrQztBQUdsQyxtRUFBeUY7QUFDekYsMENBQTRCO0FBQzVCLHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFDN0Isb0RBQTRCO0FBQzVCLHVDQUFvRDtBQUNwRCxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO0FBRXZELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxHQUFHLEVBQWlELENBQUM7QUFFcEYsTUFBTSxlQUFlLEdBQUc7SUFDdEIsT0FBTyxFQUFFLHVCQUF1QjtJQUNoQyxVQUFVLEVBQUUsdUJBQXVCO0lBQ25DLEtBQUssRUFBRSx1QkFBdUI7SUFDOUIsS0FBSyxFQUFFLHVCQUF1QjtDQUMvQixDQUFDO0FBRUYsTUFBYSxpQkFBa0IsU0FBUSwwQkFBRTtJQUN2QyxZQUFzQixTQUFTLEtBQUs7UUFDbEMsS0FBSyxDQUFDO1lBQ0osT0FBTyxFQUFFLGlCQUFVLEVBQUU7WUFDckIseUJBQXlCO1lBQ3pCLE1BQU07U0FDUCxDQUFDLENBQUM7UUFMaUIsV0FBTSxHQUFOLE1BQU0sQ0FBUTtJQU1wQyxDQUFDO0lBRUQsVUFBVSxDQUFDLElBQVksRUFBRSxHQUFXLEVBQUUsVUFBbUI7UUFDdkQsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2xDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsRUFBQyxPQUFPLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDO0lBQ3JFLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxJQUF1QixFQUFFLEdBQXVCO1FBQy9ELE1BQU0sS0FBSyxHQUFJLEVBQWUsQ0FB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QkFBaUIsQ0FBQyxDQUFDLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDO0lBQzlGLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQVZELDRDQVVDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFJKIGZyb20gJ3JlcXVpcmUtaW5qZWN0b3InO1xuaW1wb3J0IF9jb25maWcgZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHtEcmNwU2V0dGluZ3N9IGZyb20gJy4vY29uZmlnL2NvbmZpZy1zbGljZSc7XG5pbXBvcnQge0ZhY3RvcnlNYXBDb2xsZWN0aW9uLCBGYWN0b3J5TWFwSW50ZXJmfSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvZmFjdG9yeS1tYXAnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7Z2V0Um9vdERpciwgZ2V0V29ya0Rpcn0gZnJvbSAnLi91dGlscy9taXNjJztcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3BsaW5rLmluamVjdG9yLWZhY3RvcnknKTtcblxuY29uc3QgcGFja2FnZU5hbWVQYXRoTWFwID0gbmV3IE1hcDxzdHJpbmcsIHtzeW1saW5rPzogc3RyaW5nOyByZWFsUGF0aDogc3RyaW5nO30+KCk7XG5cbmNvbnN0IGVtcHR5RmFjdG9yeU1hcCA9IHtcbiAgZmFjdG9yeTogZW1wdHJ5Q2hhaW5hYmxlRnVuY3Rpb24sXG4gIHN1YnN0aXR1dGU6IGVtcHRyeUNoYWluYWJsZUZ1bmN0aW9uLFxuICB2YWx1ZTogZW1wdHJ5Q2hhaW5hYmxlRnVuY3Rpb24sXG4gIGFsaWFzOiBlbXB0cnlDaGFpbmFibGVGdW5jdGlvblxufTtcblxuZXhwb3J0IGNsYXNzIERyUGFja2FnZUluamVjdG9yIGV4dGVuZHMgUkoge1xuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgbm9Ob2RlID0gZmFsc2UpIHtcbiAgICBzdXBlcih7XG4gICAgICBiYXNlZGlyOiBnZXRSb290RGlyKCksXG4gICAgICAvLyBkZWJ1ZzogY29uZmlnLmRldk1vZGUsXG4gICAgICBub05vZGVcbiAgICB9KTtcbiAgfVxuXG4gIGFkZFBhY2thZ2UobmFtZTogc3RyaW5nLCBkaXI6IHN0cmluZywgc3ltbGlua0Rpcj86IHN0cmluZykge1xuICAgIGxvZy5kZWJ1ZygnYWRkICVzICVzJywgbmFtZSwgZGlyKTtcbiAgICBwYWNrYWdlTmFtZVBhdGhNYXAuc2V0KG5hbWUsIHtzeW1saW5rOiBzeW1saW5rRGlyLCByZWFsUGF0aDogZGlyfSk7XG4gIH1cblxuICBmcm9tUGxpbmtQYWNrYWdlKG5hbWU6IHN0cmluZyB8IHN0cmluZ1tdLCBkaXI/OiBzdHJpbmcgfCBzdHJpbmdbXSkge1xuICAgIGNvbnN0IG5hbWVzID0gKFtdIGFzIHN0cmluZ1tdKS5jb25jYXQobmFtZSk7XG4gICAgaWYgKGRpcikge1xuICAgICAgY29uc3QgZGlycyA9IChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KGRpcik7XG4gICAgICBsZXQgaSA9IDA7XG4gICAgICBpZiAobmFtZXMubGVuZ3RoICE9PSBkaXJzLmxlbmd0aClcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdmcm9tQ29tcG9uZW50KG5hbWUsIGRpcilcXCdzIGJlIGNhbGxlZCB3aXRoIDIgQXJyYXkgb2Ygc2FtZSBsZW5ndGgnKTtcbiAgICAgIGZvciAoY29uc3Qgbm0gb2YgbmFtZXMgYXMgc3RyaW5nW10pIHtcbiAgICAgICAgdGhpcy5hZGRQYWNrYWdlKG5tLCBkaXJzW2krK10pO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBmYWN0b3J5TWFwczogRmFjdG9yeU1hcEludGVyZltdID0gW107XG4gICAgZm9yIChjb25zdCBubSBvZiBuYW1lcykge1xuICAgICAgY29uc3QgcGF0aHMgPSBwYWNrYWdlTmFtZVBhdGhNYXAuZ2V0KG5tKTtcbiAgICAgIGlmIChwYXRocykge1xuICAgICAgICBmYWN0b3J5TWFwcy5wdXNoKHN1cGVyLmZyb21EaXIocGF0aHMucmVhbFBhdGgpKTtcbiAgICAgICAgaWYgKHBhdGhzLnN5bWxpbmspIHtcbiAgICAgICAgICBmYWN0b3J5TWFwcy5wdXNoKHN1cGVyLmZyb21EaXIocGF0aHMuc3ltbGluaykpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmYWN0b3J5TWFwcy5wdXNoKHN1cGVyLmZyb21QYWNrYWdlKG5tKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZXcgRmFjdG9yeU1hcENvbGxlY3Rpb24oZmFjdG9yeU1hcHMpO1xuICB9XG5cbiAgZnJvbUFsbENvbXBvbmVudHMoKSB7XG4gICAgY29uc3QgcmVhbHBhdGhzID0gQXJyYXkuZnJvbShwYWNrYWdlTmFtZVBhdGhNYXAudmFsdWVzKCkpXG4gICAgICAubWFwKGl0ZW0gPT4gaXRlbS5yZWFsUGF0aCk7XG4gICAgY29uc3Qgc3ltbGlua3MgPSBBcnJheS5mcm9tKHBhY2thZ2VOYW1lUGF0aE1hcC52YWx1ZXMoKSlcbiAgICAubWFwKGl0ZW0gPT4gaXRlbS5zeW1saW5rKS5maWx0ZXIoZGlyID0+IGRpciAhPSBudWxsKTtcbiAgICByZXR1cm4gc3VwZXIuZnJvbURpcihyZWFscGF0aHMuY29uY2F0KHN5bWxpbmtzIGFzIHN0cmluZ1tdKSk7XG4gIH1cblxuICBmcm9tQWxsUGFja2FnZXMoKSB7XG4gICAgcmV0dXJuIHRoaXMuZnJvbUFsbENvbXBvbmVudHMoKTtcbiAgfVxuXG4gIG5vdEZyb21QYWNrYWdlcyguLi5leGNsdWRlUGFja2FnZXM6IHN0cmluZ1tdKSB7XG4gICAgY29uc3QgbmFtZXMgPSBfLmRpZmZlcmVuY2UoXy5rZXlzKHBhY2thZ2VOYW1lUGF0aE1hcCksIGV4Y2x1ZGVQYWNrYWdlcyk7XG4gICAgY29uc3QgZGlycyA9IG5hbWVzLm1hcChwa05hbWUgPT4gcGFja2FnZU5hbWVQYXRoTWFwW3BrTmFtZV0pO1xuICAgIGxvZy5kZWJ1ZygnZnJvbSAnICsgZGlycyk7XG4gICAgcmV0dXJuIHN1cGVyLmZyb21EaXIoZGlycyk7XG4gIH1cblxuICByZWFkSW5qZWN0RmlsZShmaWxlTmFtZVdpdGhvdXRFeHQ/OiBzdHJpbmcpIHtcblxuICAgIGlmICghZmlsZU5hbWVXaXRob3V0RXh0KVxuICAgICAgZmlsZU5hbWVXaXRob3V0RXh0ID0gJ21vZHVsZS1yZXNvbHZlLnNlcnZlcic7XG4gICAgXy51bmlxKFtcbiAgICAgIFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIGZpbGVOYW1lV2l0aG91dEV4dCksXG4gICAgICBQYXRoLnJlc29sdmUoZ2V0V29ya0RpcigpLCBmaWxlTmFtZVdpdGhvdXRFeHQpXG4gICAgXSkuZm9yRWFjaChmaWxlID0+IHtcbiAgICAgIGNvbnN0IGZpbGUxID0gZnMuZXhpc3RzU3luYyhmaWxlICsgJy50cycpID8gZmlsZSArICcudHMnIDogZmlsZSArICcuanMnO1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoZmlsZTEpKSB7XG4gICAgICAgIGxvZy5kZWJ1ZygnZXhlY3V0ZSBpbnRlcm5hbCAnICsgZmlsZTEpO1xuICAgICAgICBsZXQgZXhwb3J0ZWQgPSByZXF1aXJlKGZpbGUxKTtcbiAgICAgICAgaWYgKGV4cG9ydGVkLmRlZmF1bHQpXG4gICAgICAgICAgZXhwb3J0ZWQgPSBleHBvcnRlZC5kZWZhdWx0O1xuICAgICAgICBleHBvcnRlZCh0aGlzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhmaWxlMSArICcgZG9lc25cXCd0IGV4aXN0LCBza2lwIGl0LicpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGRvSW5qZWN0b3JDb25maWdTeW5jKHRoaXMsICF0aGlzLm5vTm9kZSk7XG4gIH1cbn1cblxuZXhwb3J0IGxldCBub2RlSW5qZWN0b3IgPSBuZXcgRHJQYWNrYWdlSW5qZWN0b3IoZmFsc2UpO1xuXG5leHBvcnQgbGV0IHdlYkluamVjdG9yID0gbmV3IERyUGFja2FnZUluamVjdG9yKHRydWUpO1xuXG5leHBvcnQgaW50ZXJmYWNlIEluamVjdG9yQ29uZmlnSGFuZGxlciB7XG4gIC8qKiBGb3IgQ2xpZW50IGZyYW1ld29yayBidWlsZCB0b29sIChSZWFjdCwgQW5ndWxhciksIHJlcGxhY2UgbW9kdWxlIGluIFwicmVxdWlyZSgpXCIgb3IgaW1wb3J0IHN5bnRheCAqL1xuICBzZXR1cFdlYkluamVjdG9yPyhmYWN0b3J5OiBEclBhY2thZ2VJbmplY3RvciwgYWxsU2V0dGluZzogRHJjcFNldHRpbmdzKTogdm9pZDtcbiAgLyoqIEZvciBOb2RlLmpzIHJ1bnRpbWUsIHJlcGxhY2UgbW9kdWxlIGluIFwicmVxdWlyZSgpXCIgb3IgaW1wb3J0IHN5bnRheCAqL1xuICBzZXR1cE5vZGVJbmplY3Rvcj8oZmFjdG9yeTogRHJQYWNrYWdlSW5qZWN0b3IsIGFsbFNldHRpbmc6IERyY3BTZXR0aW5ncyk6IHZvaWQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkb0luamVjdG9yQ29uZmlnU3luYyhmYWN0b3J5OiBEclBhY2thZ2VJbmplY3RvciwgaXNOb2RlID0gZmFsc2UpIHtcbiAgY29uc3QgY29uZmlnOiB0eXBlb2YgX2NvbmZpZyA9IHJlcXVpcmUoJy4vY29uZmlnJykuZGVmYXVsdDtcbiAgY29uZmlnLmNvbmZpZ0hhbmRsZXJNZ3JDaGFuZ2VkKGhhbmRsZXIgPT4ge1xuICAgIGhhbmRsZXIucnVuRWFjaFN5bmM8SW5qZWN0b3JDb25maWdIYW5kbGVyPigoZmlsZTogc3RyaW5nLCBsYXN0UmVzdWx0OiBhbnksIGhhbmRsZXIpID0+IHtcbiAgICAgIGlmIChpc05vZGUgJiYgaGFuZGxlci5zZXR1cE5vZGVJbmplY3RvcilcbiAgICAgICAgaGFuZGxlci5zZXR1cE5vZGVJbmplY3RvcihmYWN0b3J5LCBjb25maWcoKSk7XG4gICAgICBlbHNlIGlmICghaXNOb2RlICYmIGhhbmRsZXIuc2V0dXBXZWJJbmplY3RvcilcbiAgICAgICAgaGFuZGxlci5zZXR1cFdlYkluamVjdG9yKGZhY3RvcnksIGNvbmZpZygpKTtcbiAgICB9LCAnSW5qZWN0b3IgY29uZmlndXJhdGlvbiBmb3IgJyArIChpc05vZGUgPyAnTm9kZS5qcyBydW50aW1lJyA6ICdjbGllbnQgc2lkZSBidWlsZCB0b29sJykpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gZW1wdHJ5Q2hhaW5hYmxlRnVuY3Rpb24oKSB7XG4gIHJldHVybiBlbXB0eUZhY3RvcnlNYXA7XG59XG5cbi8qKiBAZGVwcmVjYXRlZCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRvSW5qZWN0b3JDb25maWcoZmFjdG9yeTogRHJQYWNrYWdlSW5qZWN0b3IsIGlzTm9kZSA9IGZhbHNlKSB7XG4gIGNvbnN0IGNvbmZpZzogdHlwZW9mIF9jb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZycpLmRlZmF1bHQ7XG4gIGNvbmZpZy5jb25maWdIYW5kbGVyTWdyQ2hhbmdlZChoYW5kbGVyID0+IHtcbiAgICBoYW5kbGVyLnJ1bkVhY2g8SW5qZWN0b3JDb25maWdIYW5kbGVyPigoZmlsZTogc3RyaW5nLCBsYXN0UmVzdWx0OiBhbnksIGhhbmRsZXIpID0+IHtcbiAgICAgIGlmIChpc05vZGUgJiYgaGFuZGxlci5zZXR1cE5vZGVJbmplY3RvcilcbiAgICAgICAgaGFuZGxlci5zZXR1cE5vZGVJbmplY3RvcihmYWN0b3J5LCBjb25maWcoKSk7XG4gICAgICBlbHNlIGlmICghaXNOb2RlICYmIGhhbmRsZXIuc2V0dXBXZWJJbmplY3RvcilcbiAgICAgICAgaGFuZGxlci5zZXR1cFdlYkluamVjdG9yKGZhY3RvcnksIGNvbmZpZygpKTtcbiAgICB9LCAnSW5qZWN0b3IgY29uZmlndXJhdGlvbiBmb3IgJyArIChpc05vZGUgPyAnTm9kZS5qcyBydW50aW1lJyA6ICdjbGllbnQgc2lkZSBidWlsZCB0b29sJykpO1xuICB9KTtcbn1cbiJdfQ==