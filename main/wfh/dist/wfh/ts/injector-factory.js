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
const misc_1 = require("./utils/misc");
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
            basedir: misc_1.getRootDir(),
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
            Path.resolve(misc_1.getRootDir(), fileNameWithoutExt),
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
// console.log('~~~~~~~~~~~~~~~~~~~~~~~')
/**
 * Avoid package load different log4js than Plink's
 */
exports.nodeInjector.fromRoot().factory('log4js', file => {
    return log4js_1.default;
}); // .alias('log4js', 'dr-comp-package/wfh/dist/logger');
exports.webInjector = new DrPackageInjector(undefined, true);
function emptryChainableFunction() {
    return emptyFactoryMap;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5qZWN0b3ItZmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3RzL2luamVjdG9yLWZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHdFQUFvRDtBQUNwRCwyREFBcUQ7QUFDckQsbUVBQXlGO0FBQ3pGLG1FQUFtRTtBQUNuRSwwQ0FBNEI7QUFDNUIsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUM3QixvREFBNEI7QUFDNUIsdUNBQXdDO0FBQ3hDLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFDLENBQUM7QUFFcEQsTUFBTSxrQkFBa0IsR0FBNkIsRUFBRSxDQUFDO0FBRXhELE1BQU0sZUFBZSxHQUFHO0lBQ3RCLE9BQU8sRUFBRSx1QkFBdUI7SUFDaEMsVUFBVSxFQUFFLHVCQUF1QjtJQUNuQyxLQUFLLEVBQUUsdUJBQXVCO0lBQzlCLEtBQUssRUFBRSx1QkFBdUI7Q0FDL0IsQ0FBQztBQUVGLE1BQWEsaUJBQWtCLFNBQVEsMEJBQUU7SUFDdkMsWUFBWSxPQUFrQyxFQUFZLFNBQVMsS0FBSztRQUN0RSxLQUFLLENBQUM7WUFDSixPQUFPLEVBQUUsaUJBQVUsRUFBRTtZQUNyQixPQUFPO1lBQ1AseUJBQXlCO1lBQ3pCLE1BQU07U0FDUCxDQUFDLENBQUM7UUFOcUQsV0FBTSxHQUFOLE1BQU0sQ0FBUTtJQU94RSxDQUFDO0lBRUQsVUFBVSxDQUFDLElBQVksRUFBRSxHQUFXO1FBQ2xDLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNsQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUM7SUFDakMsQ0FBQztJQUVELGFBQWEsQ0FBQyxJQUF1QixFQUFFLEdBQXVCO1FBQzVELE1BQU0sS0FBSyxHQUFJLEVBQWUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFD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LElBQUksQ0FBQyxLQUFLLEdBQUcsMkJBQTJCLENBQUMsQ0FBQzthQUMvQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTyxvQ0FBZ0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDOUMsQ0FBQztDQUNGO0FBMUVELDhDQTBFQztBQUVVLFFBQUEsWUFBWSxHQUFHLElBQUksaUJBQWlCLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztBQUN4RSx5Q0FBeUM7QUFDekM7O0dBRUc7QUFDSCxvQkFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLEVBQUU7SUFDL0MsT0FBTyxnQkFBTSxDQUFDO0FBQ2hCLENBQUMsQ0FBQyxDQUFDLENBQUMsdURBQXVEO0FBRWhELFFBQUEsV0FBVyxHQUFHLElBQUksaUJBQWlCLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBR2hFLFNBQVMsdUJBQXVCO0lBQzlCLE9BQU8sZUFBZSxDQUFDO0FBQ3pCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUkosIHtJbmplY3Rvck9wdGlvbn0gZnJvbSAncmVxdWlyZS1pbmplY3Rvcic7XG5pbXBvcnQge2RvSW5qZWN0b3JDb25maWd9IGZyb20gJy4vcmVxdWlyZS1pbmplY3RvcnMnO1xuaW1wb3J0IHtGYWN0b3J5TWFwQ29sbGVjdGlvbiwgRmFjdG9yeU1hcEludGVyZn0gZnJvbSAncmVxdWlyZS1pbmplY3Rvci9kaXN0L2ZhY3RvcnktbWFwJztcbi8vIGltcG9ydCB7UmVzb2x2ZU9wdGlvbn0gZnJvbSAncmVxdWlyZS1pbmplY3Rvci9kaXN0L25vZGUtaW5qZWN0JztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQge2dldFJvb3REaXJ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCd3ZmguaW5qZWN0b3JGYWN0b3J5Jyk7XG5cbmNvbnN0IHBhY2thZ2VOYW1lUGF0aE1hcDoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG5cbmNvbnN0IGVtcHR5RmFjdG9yeU1hcCA9IHtcbiAgZmFjdG9yeTogZW1wdHJ5Q2hhaW5hYmxlRnVuY3Rpb24sXG4gIHN1YnN0aXR1dGU6IGVtcHRyeUNoYWluYWJsZUZ1bmN0aW9uLFxuICB2YWx1ZTogZW1wdHJ5Q2hhaW5hYmxlRnVuY3Rpb24sXG4gIGFsaWFzOiBlbXB0cnlDaGFpbmFibGVGdW5jdGlvblxufTtcblxuZXhwb3J0IGNsYXNzIERyUGFja2FnZUluamVjdG9yIGV4dGVuZHMgUkoge1xuICBjb25zdHJ1Y3RvcihyZXNvbHZlOiBJbmplY3Rvck9wdGlvblsncmVzb2x2ZSddLCBwcm90ZWN0ZWQgbm9Ob2RlID0gZmFsc2UpIHtcbiAgICBzdXBlcih7XG4gICAgICBiYXNlZGlyOiBnZXRSb290RGlyKCksXG4gICAgICByZXNvbHZlLFxuICAgICAgLy8gZGVidWc6IGNvbmZpZy5kZXZNb2RlLFxuICAgICAgbm9Ob2RlXG4gICAgfSk7XG4gIH1cblxuICBhZGRQYWNrYWdlKG5hbWU6IHN0cmluZywgZGlyOiBzdHJpbmcpIHtcbiAgICBsb2cuZGVidWcoJ2FkZCAlcyAlcycsIG5hbWUsIGRpcik7XG4gICAgcGFja2FnZU5hbWVQYXRoTWFwW25hbWVdID0gZGlyO1xuICB9XG5cbiAgZnJvbUNvbXBvbmVudChuYW1lOiBzdHJpbmcgfCBzdHJpbmdbXSwgZGlyPzogc3RyaW5nIHwgc3RyaW5nW10pIHtcbiAgICBjb25zdCBuYW1lcyA9IChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KG5hbWUpO1xuICAgIGlmIChkaXIpIHtcbiAgICAgIGNvbnN0IGRpcnMgPSAoW10gYXMgc3RyaW5nW10pLmNvbmNhdChkaXIpO1xuICAgICAgbGV0IGkgPSAwO1xuICAgICAgaWYgKG5hbWVzLmxlbmd0aCAhPT0gZGlycy5sZW5ndGgpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignZnJvbUNvbXBvbmVudChuYW1lLCBkaXIpXFwncyBiZSBjYWxsZWQgd2l0aCAyIEFycmF5IG9mIHNhbWUgbGVuZ3RoJyk7XG4gICAgICBmb3IgKGNvbnN0IG5tIG9mIG5hbWVzIGFzIHN0cmluZ1tdKSB7XG4gICAgICAgIHRoaXMuYWRkUGFja2FnZShubSwgZGlyc1tpKytdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgZmFjdG9yeU1hcHM6IEZhY3RvcnlNYXBJbnRlcmZbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgbm0gb2YgbmFtZXMpIHtcbiAgICAgIGlmIChfLmhhcyhwYWNrYWdlTmFtZVBhdGhNYXAsIG5tKSkge1xuICAgICAgICBmYWN0b3J5TWFwcy5wdXNoKHN1cGVyLmZyb21EaXIocGFja2FnZU5hbWVQYXRoTWFwW25tXSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZmFjdG9yeU1hcHMucHVzaChzdXBlci5mcm9tUGFja2FnZShubSkpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbmV3IEZhY3RvcnlNYXBDb2xsZWN0aW9uKGZhY3RvcnlNYXBzKTtcbiAgfVxuXG4gIGZyb21BbGxDb21wb25lbnRzKCkge1xuICAgIHJldHVybiBzdXBlci5mcm9tRGlyKF8udmFsdWVzKHBhY2thZ2VOYW1lUGF0aE1hcCkpO1xuICB9XG5cbiAgZnJvbUFsbFBhY2thZ2VzKCkge1xuICAgIHJldHVybiB0aGlzLmZyb21BbGxDb21wb25lbnRzKCk7XG4gIH1cblxuICBub3RGcm9tUGFja2FnZXMoLi4uZXhjbHVkZVBhY2thZ2VzOiBzdHJpbmdbXSkge1xuICAgIGNvbnN0IG5hbWVzID0gXy5kaWZmZXJlbmNlKF8ua2V5cyhwYWNrYWdlTmFtZVBhdGhNYXApLCBleGNsdWRlUGFja2FnZXMpO1xuICAgIGNvbnN0IGRpcnMgPSBuYW1lcy5tYXAocGtOYW1lID0+IHBhY2thZ2VOYW1lUGF0aE1hcFtwa05hbWVdKTtcbiAgICBsb2cuZGVidWcoJ2Zyb20gJyArIGRpcnMpO1xuICAgIHJldHVybiBzdXBlci5mcm9tRGlyKGRpcnMpO1xuICB9XG5cbiAgcmVhZEluamVjdEZpbGUoZmlsZU5hbWVXaXRob3V0RXh0Pzogc3RyaW5nKSB7XG5cbiAgICBpZiAoIWZpbGVOYW1lV2l0aG91dEV4dClcbiAgICAgIGZpbGVOYW1lV2l0aG91dEV4dCA9ICdtb2R1bGUtcmVzb2x2ZS5zZXJ2ZXInO1xuICAgIF8udW5pcShbXG4gICAgICBQYXRoLnJlc29sdmUoZ2V0Um9vdERpcigpLCBmaWxlTmFtZVdpdGhvdXRFeHQpLFxuICAgICAgUGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksIGZpbGVOYW1lV2l0aG91dEV4dClcbiAgICBdKS5mb3JFYWNoKGZpbGUgPT4ge1xuICAgICAgY29uc3QgZmlsZTEgPSBmcy5leGlzdHNTeW5jKGZpbGUgKyAnLnRzJykgPyBmaWxlICsgJy50cycgOiBmaWxlICsgJy5qcyc7XG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyhmaWxlMSkpIHtcbiAgICAgICAgbG9nLmRlYnVnKCdleGVjdXRlIGludGVybmFsICcgKyBmaWxlMSk7XG4gICAgICAgIGxldCBleHBvcnRlZCA9IHJlcXVpcmUoZmlsZTEpO1xuICAgICAgICBpZiAoZXhwb3J0ZWQuZGVmYXVsdClcbiAgICAgICAgICBleHBvcnRlZCA9IGV4cG9ydGVkLmRlZmF1bHQ7XG4gICAgICAgIGV4cG9ydGVkKHRoaXMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmluZm8oZmlsZTEgKyAnIGRvZXNuXFwndCBleGlzdCwgc2tpcCBpdC4nKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBkb0luamVjdG9yQ29uZmlnKHRoaXMsICF0aGlzLm5vTm9kZSk7XG4gIH1cbn1cblxuZXhwb3J0IGxldCBub2RlSW5qZWN0b3IgPSBuZXcgRHJQYWNrYWdlSW5qZWN0b3IocmVxdWlyZS5yZXNvbHZlLCBmYWxzZSk7XG4vLyBjb25zb2xlLmxvZygnfn5+fn5+fn5+fn5+fn5+fn5+fn5+fn4nKVxuLyoqXG4gKiBBdm9pZCBwYWNrYWdlIGxvYWQgZGlmZmVyZW50IGxvZzRqcyB0aGFuIFBsaW5rJ3NcbiAqL1xubm9kZUluamVjdG9yLmZyb21Sb290KCkuZmFjdG9yeSgnbG9nNGpzJywgZmlsZSA9PiB7XG4gIHJldHVybiBsb2c0anM7XG59KTsgLy8gLmFsaWFzKCdsb2c0anMnLCAnZHItY29tcC1wYWNrYWdlL3dmaC9kaXN0L2xvZ2dlcicpO1xuXG5leHBvcnQgbGV0IHdlYkluamVjdG9yID0gbmV3IERyUGFja2FnZUluamVjdG9yKHVuZGVmaW5lZCwgdHJ1ZSk7XG5cblxuZnVuY3Rpb24gZW1wdHJ5Q2hhaW5hYmxlRnVuY3Rpb24oKSB7XG4gIHJldHVybiBlbXB0eUZhY3RvcnlNYXA7XG59XG4iXX0=