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
        return require_injectors_1.doInjectorConfigSync(this, !this.noNode);
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
}); // .alias('log4js', '@wfh/plink/wfh/dist/logger');
exports.webInjector = new DrPackageInjector(undefined, true);
function emptryChainableFunction() {
    return emptyFactoryMap;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5qZWN0b3ItZmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2luamVjdG9yLWZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHdFQUFvRDtBQUNwRCwyREFBeUQ7QUFDekQsbUVBQXlGO0FBQ3pGLG1FQUFtRTtBQUNuRSwwQ0FBNEI7QUFDNUIsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUM3QixvREFBNEI7QUFDNUIsdUNBQXdDO0FBQ3hDLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFDLENBQUM7QUFFcEQsTUFBTSxrQkFBa0IsR0FBNkIsRUFBRSxDQUFDO0FBRXhELE1BQU0sZUFBZSxHQUFHO0lBQ3RCLE9BQU8sRUFBRSx1QkFBdUI7SUFDaEMsVUFBVSxFQUFFLHVCQUF1QjtJQUNuQyxLQUFLLEVBQUUsdUJBQXVCO0lBQzlCLEtBQUssRUFBRSx1QkFBdUI7Q0FDL0IsQ0FBQztBQUVGLE1BQWEsaUJBQWtCLFNBQVEsMEJBQUU7SUFDdkMsWUFBWSxPQUFrQyxFQUFZLFNBQVMsS0FBSztRQUN0RSxLQUFLLENBQUM7WUFDSixPQUFPLEVBQUUsaUJBQVUsRUFBRTtZQUNyQixPQUFPO1lBQ1AseUJBQXlCO1lBQ3pCLE1BQU07U0FDUCxDQUFDLENBQUM7UUFOcUQsV0FBTSxHQUFOLE1BQU0sQ0FBUTtJQU94RSxDQUFDO0lBRUQsVUFBVSxDQUFDLElBQVksRUFBRSxHQUFXO1FBQ2xDLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNsQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUM7SUFDakMsQ0FBQztJQUVELGFBQWEsQ0FBQyxJQUF1QixFQUFFLEdBQXVCO1FBQzVELE1BQU0sS0FBSyxHQUFJLEVBQWUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7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Q0FBQyxLQUFLLEdBQUcsMkJBQTJCLENBQUMsQ0FBQzthQUMvQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTyx3Q0FBb0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbEQsQ0FBQztDQUdGO0FBNUVELDhDQTRFQztBQUVVLFFBQUEsWUFBWSxHQUFHLElBQUksaUJBQWlCLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztBQUN4RSx5Q0FBeUM7QUFDekM7O0dBRUc7QUFDSCxvQkFBWSxDQUFDLFFBQVEsRUFBRSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLEVBQUU7SUFDL0MsT0FBTyxnQkFBTSxDQUFDO0FBQ2hCLENBQUMsQ0FBQyxDQUFDLENBQUMsa0RBQWtEO0FBRTNDLFFBQUEsV0FBVyxHQUFHLElBQUksaUJBQWlCLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBR2hFLFNBQVMsdUJBQXVCO0lBQzlCLE9BQU8sZUFBZSxDQUFDO0FBQ3pCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUkosIHtJbmplY3Rvck9wdGlvbn0gZnJvbSAncmVxdWlyZS1pbmplY3Rvcic7XG5pbXBvcnQge2RvSW5qZWN0b3JDb25maWdTeW5jfSBmcm9tICcuL3JlcXVpcmUtaW5qZWN0b3JzJztcbmltcG9ydCB7RmFjdG9yeU1hcENvbGxlY3Rpb24sIEZhY3RvcnlNYXBJbnRlcmZ9IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3IvZGlzdC9mYWN0b3J5LW1hcCc7XG4vLyBpbXBvcnQge1Jlc29sdmVPcHRpb259IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3IvZGlzdC9ub2RlLWluamVjdCc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtnZXRSb290RGlyfSBmcm9tICcuL3V0aWxzL21pc2MnO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignd2ZoLmluamVjdG9yRmFjdG9yeScpO1xuXG5jb25zdCBwYWNrYWdlTmFtZVBhdGhNYXA6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuXG5jb25zdCBlbXB0eUZhY3RvcnlNYXAgPSB7XG4gIGZhY3Rvcnk6IGVtcHRyeUNoYWluYWJsZUZ1bmN0aW9uLFxuICBzdWJzdGl0dXRlOiBlbXB0cnlDaGFpbmFibGVGdW5jdGlvbixcbiAgdmFsdWU6IGVtcHRyeUNoYWluYWJsZUZ1bmN0aW9uLFxuICBhbGlhczogZW1wdHJ5Q2hhaW5hYmxlRnVuY3Rpb25cbn07XG5cbmV4cG9ydCBjbGFzcyBEclBhY2thZ2VJbmplY3RvciBleHRlbmRzIFJKIHtcbiAgY29uc3RydWN0b3IocmVzb2x2ZTogSW5qZWN0b3JPcHRpb25bJ3Jlc29sdmUnXSwgcHJvdGVjdGVkIG5vTm9kZSA9IGZhbHNlKSB7XG4gICAgc3VwZXIoe1xuICAgICAgYmFzZWRpcjogZ2V0Um9vdERpcigpLFxuICAgICAgcmVzb2x2ZSxcbiAgICAgIC8vIGRlYnVnOiBjb25maWcuZGV2TW9kZSxcbiAgICAgIG5vTm9kZVxuICAgIH0pO1xuICB9XG5cbiAgYWRkUGFja2FnZShuYW1lOiBzdHJpbmcsIGRpcjogc3RyaW5nKSB7XG4gICAgbG9nLmRlYnVnKCdhZGQgJXMgJXMnLCBuYW1lLCBkaXIpO1xuICAgIHBhY2thZ2VOYW1lUGF0aE1hcFtuYW1lXSA9IGRpcjtcbiAgfVxuXG4gIGZyb21Db21wb25lbnQobmFtZTogc3RyaW5nIHwgc3RyaW5nW10sIGRpcj86IHN0cmluZyB8IHN0cmluZ1tdKSB7XG4gICAgY29uc3QgbmFtZXMgPSAoW10gYXMgc3RyaW5nW10pLmNvbmNhdChuYW1lKTtcbiAgICBpZiAoZGlyKSB7XG4gICAgICBjb25zdCBkaXJzID0gKFtdIGFzIHN0cmluZ1tdKS5jb25jYXQoZGlyKTtcbiAgICAgIGxldCBpID0gMDtcbiAgICAgIGlmIChuYW1lcy5sZW5ndGggIT09IGRpcnMubGVuZ3RoKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2Zyb21Db21wb25lbnQobmFtZSwgZGlyKVxcJ3MgYmUgY2FsbGVkIHdpdGggMiBBcnJheSBvZiBzYW1lIGxlbmd0aCcpO1xuICAgICAgZm9yIChjb25zdCBubSBvZiBuYW1lcyBhcyBzdHJpbmdbXSkge1xuICAgICAgICB0aGlzLmFkZFBhY2thZ2Uobm0sIGRpcnNbaSsrXSk7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IGZhY3RvcnlNYXBzOiBGYWN0b3J5TWFwSW50ZXJmW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IG5tIG9mIG5hbWVzKSB7XG4gICAgICBpZiAoXy5oYXMocGFja2FnZU5hbWVQYXRoTWFwLCBubSkpIHtcbiAgICAgICAgZmFjdG9yeU1hcHMucHVzaChzdXBlci5mcm9tRGlyKHBhY2thZ2VOYW1lUGF0aE1hcFtubV0pKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZhY3RvcnlNYXBzLnB1c2goc3VwZXIuZnJvbVBhY2thZ2Uobm0pKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5ldyBGYWN0b3J5TWFwQ29sbGVjdGlvbihmYWN0b3J5TWFwcyk7XG4gIH1cblxuICBmcm9tQWxsQ29tcG9uZW50cygpIHtcbiAgICByZXR1cm4gc3VwZXIuZnJvbURpcihfLnZhbHVlcyhwYWNrYWdlTmFtZVBhdGhNYXApKTtcbiAgfVxuXG4gIGZyb21BbGxQYWNrYWdlcygpIHtcbiAgICByZXR1cm4gdGhpcy5mcm9tQWxsQ29tcG9uZW50cygpO1xuICB9XG5cbiAgbm90RnJvbVBhY2thZ2VzKC4uLmV4Y2x1ZGVQYWNrYWdlczogc3RyaW5nW10pIHtcbiAgICBjb25zdCBuYW1lcyA9IF8uZGlmZmVyZW5jZShfLmtleXMocGFja2FnZU5hbWVQYXRoTWFwKSwgZXhjbHVkZVBhY2thZ2VzKTtcbiAgICBjb25zdCBkaXJzID0gbmFtZXMubWFwKHBrTmFtZSA9PiBwYWNrYWdlTmFtZVBhdGhNYXBbcGtOYW1lXSk7XG4gICAgbG9nLmRlYnVnKCdmcm9tICcgKyBkaXJzKTtcbiAgICByZXR1cm4gc3VwZXIuZnJvbURpcihkaXJzKTtcbiAgfVxuXG4gIHJlYWRJbmplY3RGaWxlKGZpbGVOYW1lV2l0aG91dEV4dD86IHN0cmluZykge1xuXG4gICAgaWYgKCFmaWxlTmFtZVdpdGhvdXRFeHQpXG4gICAgICBmaWxlTmFtZVdpdGhvdXRFeHQgPSAnbW9kdWxlLXJlc29sdmUuc2VydmVyJztcbiAgICBfLnVuaXEoW1xuICAgICAgUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgZmlsZU5hbWVXaXRob3V0RXh0KSxcbiAgICAgIFBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCBmaWxlTmFtZVdpdGhvdXRFeHQpXG4gICAgXSkuZm9yRWFjaChmaWxlID0+IHtcbiAgICAgIGNvbnN0IGZpbGUxID0gZnMuZXhpc3RzU3luYyhmaWxlICsgJy50cycpID8gZmlsZSArICcudHMnIDogZmlsZSArICcuanMnO1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoZmlsZTEpKSB7XG4gICAgICAgIGxvZy5kZWJ1ZygnZXhlY3V0ZSBpbnRlcm5hbCAnICsgZmlsZTEpO1xuICAgICAgICBsZXQgZXhwb3J0ZWQgPSByZXF1aXJlKGZpbGUxKTtcbiAgICAgICAgaWYgKGV4cG9ydGVkLmRlZmF1bHQpXG4gICAgICAgICAgZXhwb3J0ZWQgPSBleHBvcnRlZC5kZWZhdWx0O1xuICAgICAgICBleHBvcnRlZCh0aGlzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy5pbmZvKGZpbGUxICsgJyBkb2VzblxcJ3QgZXhpc3QsIHNraXAgaXQuJyk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZG9JbmplY3RvckNvbmZpZ1N5bmModGhpcywgIXRoaXMubm9Ob2RlKTtcbiAgfVxuXG5cbn1cblxuZXhwb3J0IGxldCBub2RlSW5qZWN0b3IgPSBuZXcgRHJQYWNrYWdlSW5qZWN0b3IocmVxdWlyZS5yZXNvbHZlLCBmYWxzZSk7XG4vLyBjb25zb2xlLmxvZygnfn5+fn5+fn5+fn5+fn5+fn5+fn5+fn4nKVxuLyoqXG4gKiBBdm9pZCBwYWNrYWdlIGxvYWQgZGlmZmVyZW50IGxvZzRqcyB0aGFuIFBsaW5rJ3NcbiAqL1xubm9kZUluamVjdG9yLmZyb21Sb290KCkuZmFjdG9yeSgnbG9nNGpzJywgZmlsZSA9PiB7XG4gIHJldHVybiBsb2c0anM7XG59KTsgLy8gLmFsaWFzKCdsb2c0anMnLCAnQHdmaC9wbGluay93ZmgvZGlzdC9sb2dnZXInKTtcblxuZXhwb3J0IGxldCB3ZWJJbmplY3RvciA9IG5ldyBEclBhY2thZ2VJbmplY3Rvcih1bmRlZmluZWQsIHRydWUpO1xuXG5cbmZ1bmN0aW9uIGVtcHRyeUNoYWluYWJsZUZ1bmN0aW9uKCkge1xuICByZXR1cm4gZW1wdHlGYWN0b3J5TWFwO1xufVxuIl19