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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.webInjector = exports.nodeInjector = exports.DrPackageInjector = void 0;
const require_injector_1 = __importDefault(require("require-injector"));
const require_injectors_1 = require("./require-injectors");
const factory_map_1 = require("require-injector/dist/factory-map");
// import {ResolveOption} from 'require-injector/dist/node-inject';
const _ = __importStar(require("lodash"));
const fs = __importStar(require("fs"));
const Path = __importStar(require("path"));
const log4js_1 = __importDefault(require("log4js"));
const config_1 = __importDefault(require("./config"));
const log = log4js_1.default.getLogger('wfh.injectorFactory');
const packageNamePathMap = {};
const emptyFactoryMap = {
    factory: emptryChainableFunction,
    substitute: emptryChainableFunction,
    value: emptryChainableFunction,
    alias: emptryChainableFunction
};
class DrPackageInjector extends require_injector_1.default {
    constructor(resolve, noNode = false) {
        super({
            basedir: config_1.default().rootPath,
            resolve,
            // debug: config.devMode,
            noNode
        });
        this.noNode = noNode;
    }
    addPackage(name, dir) {
        log.debug('add %s %s', name, dir);
        packageNamePathMap[name] = dir;
    }
    fromComponent(name, dir) {
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
            if (_.has(packageNamePathMap, nm)) {
                factoryMaps.push(super.fromDir(packageNamePathMap[nm]));
            }
            else {
                factoryMaps.push(super.fromPackage(nm));
            }
        }
        return new factory_map_1.FactoryMapCollection(factoryMaps);
    }
    fromAllComponents() {
        return super.fromDir(_.values(packageNamePathMap));
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
            Path.resolve('./', fileNameWithoutExt),
            Path.resolve(process.cwd(), fileNameWithoutExt)
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
                log.info(file1 + ' doesn\'t exist, skip it.');
            }
        });
        return require_injectors_1.doInjectorConfig(this, !this.noNode);
    }
}
exports.DrPackageInjector = DrPackageInjector;
exports.nodeInjector = new DrPackageInjector(require.resolve, false);
exports.webInjector = new DrPackageInjector(undefined, true);
function emptryChainableFunction() {
    return emptyFactoryMap;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5qZWN0b3ItZmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2luamVjdG9yLWZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHdFQUFvRDtBQUNwRCwyREFBcUQ7QUFDckQsbUVBQXlGO0FBQ3pGLG1FQUFtRTtBQUNuRSwwQ0FBNEI7QUFDNUIsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUM3QixvREFBNEI7QUFDNUIsc0RBQThCO0FBQzlCLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFDLENBQUM7QUFFcEQsTUFBTSxrQkFBa0IsR0FBNkIsRUFBRSxDQUFDO0FBRXhELE1BQU0sZUFBZSxHQUFHO0lBQ3RCLE9BQU8sRUFBRSx1QkFBdUI7SUFDaEMsVUFBVSxFQUFFLHVCQUF1QjtJQUNuQyxLQUFLLEVBQUUsdUJBQXVCO0lBQzlCLEtBQUssRUFBRSx1QkFBdUI7Q0FDL0IsQ0FBQztBQUVGLE1BQWEsaUJBQWtCLFNBQVEsMEJBQUU7SUFDdkMsWUFBWSxPQUFrQyxFQUFZLFNBQVMsS0FBSztRQUN0RSxLQUFLLENBQUM7WUFDSixPQUFPLEVBQUUsZ0JBQU0sRUFBRSxDQUFDLFFBQVE7WUFDMUIsT0FBTztZQUNQLHlCQUF5QjtZQUN6QixNQUFNO1NBQ1AsQ0FBQyxDQUFDO1FBTnFELFdBQU0sR0FBTixNQUFNLENBQVE7SUFPeEUsQ0FBQztJQUVELFVBQVUsQ0FBQyxJQUFZLEVBQUUsR0FBVztRQUNsQyxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDbEMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDO0lBQ2pDLENBQUM7SUFFRCxhQUFhLENBQUMsSUFBdUIsRUFBRSxHQUF1QjtRQUM1RCxNQUFNLEtBQUssR0FBSSxFQUFlLENBQUMsTUFBTSxDQUFDLElBQUks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QUFJLENBQUMsS0FBSyxHQUFHLDJCQUEyQixDQUFDLENBQUM7YUFDL0M7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sb0NBQWdCLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzlDLENBQUM7Q0FDRjtBQTFFRCw4Q0EwRUM7QUFFVSxRQUFBLFlBQVksR0FBRyxJQUFJLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDN0QsUUFBQSxXQUFXLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFHaEUsU0FBUyx1QkFBdUI7SUFDOUIsT0FBTyxlQUFlLENBQUM7QUFDekIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBSSiwge0luamVjdG9yT3B0aW9ufSBmcm9tICdyZXF1aXJlLWluamVjdG9yJztcbmltcG9ydCB7ZG9JbmplY3RvckNvbmZpZ30gZnJvbSAnLi9yZXF1aXJlLWluamVjdG9ycyc7XG5pbXBvcnQge0ZhY3RvcnlNYXBDb2xsZWN0aW9uLCBGYWN0b3J5TWFwSW50ZXJmfSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvZmFjdG9yeS1tYXAnO1xuLy8gaW1wb3J0IHtSZXNvbHZlT3B0aW9ufSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3Qvbm9kZS1pbmplY3QnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCBjb25maWcgZnJvbSAnLi9jb25maWcnO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignd2ZoLmluamVjdG9yRmFjdG9yeScpO1xuXG5jb25zdCBwYWNrYWdlTmFtZVBhdGhNYXA6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuXG5jb25zdCBlbXB0eUZhY3RvcnlNYXAgPSB7XG4gIGZhY3Rvcnk6IGVtcHRyeUNoYWluYWJsZUZ1bmN0aW9uLFxuICBzdWJzdGl0dXRlOiBlbXB0cnlDaGFpbmFibGVGdW5jdGlvbixcbiAgdmFsdWU6IGVtcHRyeUNoYWluYWJsZUZ1bmN0aW9uLFxuICBhbGlhczogZW1wdHJ5Q2hhaW5hYmxlRnVuY3Rpb25cbn07XG5cbmV4cG9ydCBjbGFzcyBEclBhY2thZ2VJbmplY3RvciBleHRlbmRzIFJKIHtcbiAgY29uc3RydWN0b3IocmVzb2x2ZTogSW5qZWN0b3JPcHRpb25bJ3Jlc29sdmUnXSwgcHJvdGVjdGVkIG5vTm9kZSA9IGZhbHNlKSB7XG4gICAgc3VwZXIoe1xuICAgICAgYmFzZWRpcjogY29uZmlnKCkucm9vdFBhdGgsXG4gICAgICByZXNvbHZlLFxuICAgICAgLy8gZGVidWc6IGNvbmZpZy5kZXZNb2RlLFxuICAgICAgbm9Ob2RlXG4gICAgfSk7XG4gIH1cblxuICBhZGRQYWNrYWdlKG5hbWU6IHN0cmluZywgZGlyOiBzdHJpbmcpIHtcbiAgICBsb2cuZGVidWcoJ2FkZCAlcyAlcycsIG5hbWUsIGRpcik7XG4gICAgcGFja2FnZU5hbWVQYXRoTWFwW25hbWVdID0gZGlyO1xuICB9XG5cbiAgZnJvbUNvbXBvbmVudChuYW1lOiBzdHJpbmcgfCBzdHJpbmdbXSwgZGlyPzogc3RyaW5nIHwgc3RyaW5nW10pIHtcbiAgICBjb25zdCBuYW1lcyA9IChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KG5hbWUpO1xuICAgIGlmIChkaXIpIHtcbiAgICAgIGNvbnN0IGRpcnMgPSAoW10gYXMgc3RyaW5nW10pLmNvbmNhdChkaXIpO1xuICAgICAgbGV0IGkgPSAwO1xuICAgICAgaWYgKG5hbWVzLmxlbmd0aCAhPT0gZGlycy5sZW5ndGgpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignZnJvbUNvbXBvbmVudChuYW1lLCBkaXIpXFwncyBiZSBjYWxsZWQgd2l0aCAyIEFycmF5IG9mIHNhbWUgbGVuZ3RoJyk7XG4gICAgICBmb3IgKGNvbnN0IG5tIG9mIG5hbWVzIGFzIHN0cmluZ1tdKSB7XG4gICAgICAgIHRoaXMuYWRkUGFja2FnZShubSwgZGlyc1tpKytdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgZmFjdG9yeU1hcHM6IEZhY3RvcnlNYXBJbnRlcmZbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgbm0gb2YgbmFtZXMpIHtcbiAgICAgIGlmIChfLmhhcyhwYWNrYWdlTmFtZVBhdGhNYXAsIG5tKSkge1xuICAgICAgICBmYWN0b3J5TWFwcy5wdXNoKHN1cGVyLmZyb21EaXIocGFja2FnZU5hbWVQYXRoTWFwW25tXSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZmFjdG9yeU1hcHMucHVzaChzdXBlci5mcm9tUGFja2FnZShubSkpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbmV3IEZhY3RvcnlNYXBDb2xsZWN0aW9uKGZhY3RvcnlNYXBzKTtcbiAgfVxuXG4gIGZyb21BbGxDb21wb25lbnRzKCkge1xuICAgIHJldHVybiBzdXBlci5mcm9tRGlyKF8udmFsdWVzKHBhY2thZ2VOYW1lUGF0aE1hcCkpO1xuICB9XG5cbiAgZnJvbUFsbFBhY2thZ2VzKCkge1xuICAgIHJldHVybiB0aGlzLmZyb21BbGxDb21wb25lbnRzKCk7XG4gIH1cblxuICBub3RGcm9tUGFja2FnZXMoLi4uZXhjbHVkZVBhY2thZ2VzOiBzdHJpbmdbXSkge1xuICAgIGNvbnN0IG5hbWVzID0gXy5kaWZmZXJlbmNlKF8ua2V5cyhwYWNrYWdlTmFtZVBhdGhNYXApLCBleGNsdWRlUGFja2FnZXMpO1xuICAgIGNvbnN0IGRpcnMgPSBuYW1lcy5tYXAocGtOYW1lID0+IHBhY2thZ2VOYW1lUGF0aE1hcFtwa05hbWVdKTtcbiAgICBsb2cuZGVidWcoJ2Zyb20gJyArIGRpcnMpO1xuICAgIHJldHVybiBzdXBlci5mcm9tRGlyKGRpcnMpO1xuICB9XG5cbiAgcmVhZEluamVjdEZpbGUoZmlsZU5hbWVXaXRob3V0RXh0OiBzdHJpbmcpIHtcblxuICAgIGlmICghZmlsZU5hbWVXaXRob3V0RXh0KVxuICAgICAgZmlsZU5hbWVXaXRob3V0RXh0ID0gJ21vZHVsZS1yZXNvbHZlLnNlcnZlcic7XG4gICAgXy51bmlxKFtcbiAgICAgIFBhdGgucmVzb2x2ZSgnLi8nLCBmaWxlTmFtZVdpdGhvdXRFeHQpLFxuICAgICAgUGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksIGZpbGVOYW1lV2l0aG91dEV4dClcbiAgICBdKS5mb3JFYWNoKGZpbGUgPT4ge1xuICAgICAgY29uc3QgZmlsZTEgPSBmcy5leGlzdHNTeW5jKGZpbGUgKyAnLnRzJykgPyBmaWxlICsgJy50cycgOiBmaWxlICsgJy5qcyc7XG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyhmaWxlMSkpIHtcbiAgICAgICAgbG9nLmRlYnVnKCdleGVjdXRlIGludGVybmFsICcgKyBmaWxlMSk7XG4gICAgICAgIGxldCBleHBvcnRlZCA9IHJlcXVpcmUoZmlsZTEpO1xuICAgICAgICBpZiAoZXhwb3J0ZWQuZGVmYXVsdClcbiAgICAgICAgICBleHBvcnRlZCA9IGV4cG9ydGVkLmRlZmF1bHQ7XG4gICAgICAgIGV4cG9ydGVkKHRoaXMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmluZm8oZmlsZTEgKyAnIGRvZXNuXFwndCBleGlzdCwgc2tpcCBpdC4nKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBkb0luamVjdG9yQ29uZmlnKHRoaXMsICF0aGlzLm5vTm9kZSk7XG4gIH1cbn1cblxuZXhwb3J0IGxldCBub2RlSW5qZWN0b3IgPSBuZXcgRHJQYWNrYWdlSW5qZWN0b3IocmVxdWlyZS5yZXNvbHZlLCBmYWxzZSk7XG5leHBvcnQgbGV0IHdlYkluamVjdG9yID0gbmV3IERyUGFja2FnZUluamVjdG9yKHVuZGVmaW5lZCwgdHJ1ZSk7XG5cblxuZnVuY3Rpb24gZW1wdHJ5Q2hhaW5hYmxlRnVuY3Rpb24oKSB7XG4gIHJldHVybiBlbXB0eUZhY3RvcnlNYXA7XG59XG4iXX0=