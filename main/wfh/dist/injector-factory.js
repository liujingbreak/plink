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
    constructor(resolve, noNode = false) {
        super({
            basedir: misc_1.getRootDir(),
            resolve,
            // debug: config.devMode,
            noNode
        });
        this.noNode = noNode;
    }
    addPackage(name, dir, symlinkDir) {
        log.debug('add %s %s', name, dir);
        packageNamePathMap.set(name, { symlink: symlinkDir, realPath: dir });
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
                log.debug(file1 + ' doesn\'t exist, skip it.');
            }
        });
        return require_injectors_1.doInjectorConfigSync(this, !this.noNode);
    }
}
exports.DrPackageInjector = DrPackageInjector;
exports.nodeInjector = new DrPackageInjector(require.resolve, false);
exports.webInjector = new DrPackageInjector(undefined, true);
function emptryChainableFunction() {
    return emptyFactoryMap;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5qZWN0b3ItZmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2luamVjdG9yLWZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHdFQUFvRDtBQUNwRCwyREFBeUQ7QUFDekQsbUVBQXlGO0FBQ3pGLDBDQUE0QjtBQUM1Qix1Q0FBeUI7QUFDekIsMkNBQTZCO0FBQzdCLG9EQUE0QjtBQUM1Qix1Q0FBd0M7QUFDeEMsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsd0JBQXdCLENBQUMsQ0FBQztBQUV2RCxNQUFNLGtCQUFrQixHQUFHLElBQUksR0FBRyxFQUFpRCxDQUFDO0FBRXBGLE1BQU0sZUFBZSxHQUFHO0lBQ3RCLE9BQU8sRUFBRSx1QkFBdUI7SUFDaEMsVUFBVSxFQUFFLHVCQUF1QjtJQUNuQyxLQUFLLEVBQUUsdUJBQXVCO0lBQzlCLEtBQUssRUFBRSx1QkFBdUI7Q0FDL0IsQ0FBQztBQUVGLE1BQWEsaUJBQWtCLFNBQVEsMEJBQUU7SUFDdkMsWUFBWSxPQUFrQyxFQUFZLFNBQVMsS0FBSztRQUN0RSxLQUFLLENBQUM7WUFDSixPQUFPLEVBQUUsaUJBQVUsRUFBRTtZQUNyQixPQUFPO1lBQ1AseUJBQXlCO1lBQ3pCLE1BQU07U0FDUCxDQUFDLENBQUM7UUFOcUQsV0FBTSxHQUFOLE1BQU0sQ0FBUTtJQU94RSxDQUFDO0lBRUQsVUFBVSxDQUFDLElBQVksRUFBRSxHQUFXLEVBQUUsVUFBbUI7UUFDdkQsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2xDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsRUFBQyxPQUFPLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDO0lBQ3JFLENBQUM7SUFFRCxhQUFhLENBQUMsSUFBdUIsRUFBRSxHQUF1QjtRQUM1RCxNQUFNLEtBQUssR0FBSSxFQUFlLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzVDLElBQUksR0FBRyxFQUFFO1lBQ1AsTUFBTSxJQUFJLEdBQUksRUFBZSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUMxQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDVixJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLE1BQU07Z0JBQzlCLE1BQU0sSUFBSSxLQUFLLENBQUMsbUVBQW1FLENBQUMsQ0FBQztZQUN2RixLQUFLLE1BQU0sRUFBRSxJQUFJLEtBQWlCLEVBQUU7Z0JBQ2xDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDaEM7U0FDRjtRQUNELE1BQU0sV0FBVyxHQUF1QixFQUFFLENBQUM7UUFDM0MsS0FBSyxNQUFNLEVBQUUsSUFBSSxLQUFLLEVBQUU7WUFDdEIsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLGtCQUFrQixFQUFFLEVBQUUsQ0FBQyxFQUFFO2dCQUNqQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ3pEO2lCQUFNO2dCQUNMLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ3pDO1NBQ0Y7UUFDRCxPQUFPLElBQUksa0NBQW9CLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVELGlCQUFpQjtRQUNmLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLENBQUM7YUFDdEQsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBQzlCLE1BQU0sUUFBUSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLENBQUM7YUFDdkQsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsQ0FBQztRQUN0RCxPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxRQUFvQixDQUFDLENBQUMsQ0FBQztJQUMvRCxDQUFDO0lBRUQsZUFBZTtRQUNiLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7SUFDbEMsQ0FBQztJQUVELGVBQWUsQ0FBQyxHQUFHLGVBQXlCO1FBQzFDLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ3hFLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQzdELEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQzFCLE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBRUQsY0FBYyxDQUFDLGtCQUEyQjtRQUV4QyxJQUFJLENBQUMsa0JBQWtCO1lBQ3JCLGtCQUFrQixHQUFHLHVCQUF1QixDQUFDO1FBQy9DLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDTCxJQUFJLENBQUMsT0FBTyxDQUFDLGlCQUFVLEVBQUUsRUFBRSxrQkFBa0IsQ0FBQztZQUM5QyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxrQkFBa0IsQ0FBQztTQUNoRCxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ2hCLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO1lBQ3hFLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDeEIsR0FBRyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsR0FBRyxLQUFLLENBQUMsQ0FBQztnQkFDdkMsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUM5QixJQUFJLFFBQVEsQ0FBQyxPQUFPO29CQUNsQixRQUFRLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQztnQkFDOUIsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ2hCO2lCQUFNO2dCQUNMLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLDJCQUEyQixDQUFDLENBQUM7YUFDaEQ7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sd0NBQW9CLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ2xELENBQUM7Q0FHRjtBQWhGRCw4Q0FnRkM7QUFFVSxRQUFBLFlBQVksR0FBRyxJQUFJLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFFN0QsUUFBQSxXQUFXLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFHaEUsU0FBUyx1QkFBdUI7SUFDOUIsT0FBTyxlQUFlLENBQUM7QUFDekIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBSSiwge0luamVjdG9yT3B0aW9ufSBmcm9tICdyZXF1aXJlLWluamVjdG9yJztcbmltcG9ydCB7ZG9JbmplY3RvckNvbmZpZ1N5bmN9IGZyb20gJy4vcmVxdWlyZS1pbmplY3RvcnMnO1xuaW1wb3J0IHtGYWN0b3J5TWFwQ29sbGVjdGlvbiwgRmFjdG9yeU1hcEludGVyZn0gZnJvbSAncmVxdWlyZS1pbmplY3Rvci9kaXN0L2ZhY3RvcnktbWFwJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQge2dldFJvb3REaXJ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5pbmplY3Rvci1mYWN0b3J5Jyk7XG5cbmNvbnN0IHBhY2thZ2VOYW1lUGF0aE1hcCA9IG5ldyBNYXA8c3RyaW5nLCB7c3ltbGluaz86IHN0cmluZzsgcmVhbFBhdGg6IHN0cmluZzt9PigpO1xuXG5jb25zdCBlbXB0eUZhY3RvcnlNYXAgPSB7XG4gIGZhY3Rvcnk6IGVtcHRyeUNoYWluYWJsZUZ1bmN0aW9uLFxuICBzdWJzdGl0dXRlOiBlbXB0cnlDaGFpbmFibGVGdW5jdGlvbixcbiAgdmFsdWU6IGVtcHRyeUNoYWluYWJsZUZ1bmN0aW9uLFxuICBhbGlhczogZW1wdHJ5Q2hhaW5hYmxlRnVuY3Rpb25cbn07XG5cbmV4cG9ydCBjbGFzcyBEclBhY2thZ2VJbmplY3RvciBleHRlbmRzIFJKIHtcbiAgY29uc3RydWN0b3IocmVzb2x2ZTogSW5qZWN0b3JPcHRpb25bJ3Jlc29sdmUnXSwgcHJvdGVjdGVkIG5vTm9kZSA9IGZhbHNlKSB7XG4gICAgc3VwZXIoe1xuICAgICAgYmFzZWRpcjogZ2V0Um9vdERpcigpLFxuICAgICAgcmVzb2x2ZSxcbiAgICAgIC8vIGRlYnVnOiBjb25maWcuZGV2TW9kZSxcbiAgICAgIG5vTm9kZVxuICAgIH0pO1xuICB9XG5cbiAgYWRkUGFja2FnZShuYW1lOiBzdHJpbmcsIGRpcjogc3RyaW5nLCBzeW1saW5rRGlyPzogc3RyaW5nKSB7XG4gICAgbG9nLmRlYnVnKCdhZGQgJXMgJXMnLCBuYW1lLCBkaXIpO1xuICAgIHBhY2thZ2VOYW1lUGF0aE1hcC5zZXQobmFtZSwge3N5bWxpbms6IHN5bWxpbmtEaXIsIHJlYWxQYXRoOiBkaXJ9KTtcbiAgfVxuXG4gIGZyb21Db21wb25lbnQobmFtZTogc3RyaW5nIHwgc3RyaW5nW10sIGRpcj86IHN0cmluZyB8IHN0cmluZ1tdKSB7XG4gICAgY29uc3QgbmFtZXMgPSAoW10gYXMgc3RyaW5nW10pLmNvbmNhdChuYW1lKTtcbiAgICBpZiAoZGlyKSB7XG4gICAgICBjb25zdCBkaXJzID0gKFtdIGFzIHN0cmluZ1tdKS5jb25jYXQoZGlyKTtcbiAgICAgIGxldCBpID0gMDtcbiAgICAgIGlmIChuYW1lcy5sZW5ndGggIT09IGRpcnMubGVuZ3RoKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2Zyb21Db21wb25lbnQobmFtZSwgZGlyKVxcJ3MgYmUgY2FsbGVkIHdpdGggMiBBcnJheSBvZiBzYW1lIGxlbmd0aCcpO1xuICAgICAgZm9yIChjb25zdCBubSBvZiBuYW1lcyBhcyBzdHJpbmdbXSkge1xuICAgICAgICB0aGlzLmFkZFBhY2thZ2Uobm0sIGRpcnNbaSsrXSk7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IGZhY3RvcnlNYXBzOiBGYWN0b3J5TWFwSW50ZXJmW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IG5tIG9mIG5hbWVzKSB7XG4gICAgICBpZiAoXy5oYXMocGFja2FnZU5hbWVQYXRoTWFwLCBubSkpIHtcbiAgICAgICAgZmFjdG9yeU1hcHMucHVzaChzdXBlci5mcm9tRGlyKHBhY2thZ2VOYW1lUGF0aE1hcFtubV0pKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZhY3RvcnlNYXBzLnB1c2goc3VwZXIuZnJvbVBhY2thZ2Uobm0pKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5ldyBGYWN0b3J5TWFwQ29sbGVjdGlvbihmYWN0b3J5TWFwcyk7XG4gIH1cblxuICBmcm9tQWxsQ29tcG9uZW50cygpIHtcbiAgICBjb25zdCByZWFscGF0aHMgPSBBcnJheS5mcm9tKHBhY2thZ2VOYW1lUGF0aE1hcC52YWx1ZXMoKSlcbiAgICAgIC5tYXAoaXRlbSA9PiBpdGVtLnJlYWxQYXRoKTtcbiAgICBjb25zdCBzeW1saW5rcyA9IEFycmF5LmZyb20ocGFja2FnZU5hbWVQYXRoTWFwLnZhbHVlcygpKVxuICAgIC5tYXAoaXRlbSA9PiBpdGVtLnN5bWxpbmspLmZpbHRlcihkaXIgPT4gZGlyICE9IG51bGwpO1xuICAgIHJldHVybiBzdXBlci5mcm9tRGlyKHJlYWxwYXRocy5jb25jYXQoc3ltbGlua3MgYXMgc3RyaW5nW10pKTtcbiAgfVxuXG4gIGZyb21BbGxQYWNrYWdlcygpIHtcbiAgICByZXR1cm4gdGhpcy5mcm9tQWxsQ29tcG9uZW50cygpO1xuICB9XG5cbiAgbm90RnJvbVBhY2thZ2VzKC4uLmV4Y2x1ZGVQYWNrYWdlczogc3RyaW5nW10pIHtcbiAgICBjb25zdCBuYW1lcyA9IF8uZGlmZmVyZW5jZShfLmtleXMocGFja2FnZU5hbWVQYXRoTWFwKSwgZXhjbHVkZVBhY2thZ2VzKTtcbiAgICBjb25zdCBkaXJzID0gbmFtZXMubWFwKHBrTmFtZSA9PiBwYWNrYWdlTmFtZVBhdGhNYXBbcGtOYW1lXSk7XG4gICAgbG9nLmRlYnVnKCdmcm9tICcgKyBkaXJzKTtcbiAgICByZXR1cm4gc3VwZXIuZnJvbURpcihkaXJzKTtcbiAgfVxuXG4gIHJlYWRJbmplY3RGaWxlKGZpbGVOYW1lV2l0aG91dEV4dD86IHN0cmluZykge1xuXG4gICAgaWYgKCFmaWxlTmFtZVdpdGhvdXRFeHQpXG4gICAgICBmaWxlTmFtZVdpdGhvdXRFeHQgPSAnbW9kdWxlLXJlc29sdmUuc2VydmVyJztcbiAgICBfLnVuaXEoW1xuICAgICAgUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgZmlsZU5hbWVXaXRob3V0RXh0KSxcbiAgICAgIFBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCBmaWxlTmFtZVdpdGhvdXRFeHQpXG4gICAgXSkuZm9yRWFjaChmaWxlID0+IHtcbiAgICAgIGNvbnN0IGZpbGUxID0gZnMuZXhpc3RzU3luYyhmaWxlICsgJy50cycpID8gZmlsZSArICcudHMnIDogZmlsZSArICcuanMnO1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoZmlsZTEpKSB7XG4gICAgICAgIGxvZy5kZWJ1ZygnZXhlY3V0ZSBpbnRlcm5hbCAnICsgZmlsZTEpO1xuICAgICAgICBsZXQgZXhwb3J0ZWQgPSByZXF1aXJlKGZpbGUxKTtcbiAgICAgICAgaWYgKGV4cG9ydGVkLmRlZmF1bHQpXG4gICAgICAgICAgZXhwb3J0ZWQgPSBleHBvcnRlZC5kZWZhdWx0O1xuICAgICAgICBleHBvcnRlZCh0aGlzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhmaWxlMSArICcgZG9lc25cXCd0IGV4aXN0LCBza2lwIGl0LicpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGRvSW5qZWN0b3JDb25maWdTeW5jKHRoaXMsICF0aGlzLm5vTm9kZSk7XG4gIH1cblxuXG59XG5cbmV4cG9ydCBsZXQgbm9kZUluamVjdG9yID0gbmV3IERyUGFja2FnZUluamVjdG9yKHJlcXVpcmUucmVzb2x2ZSwgZmFsc2UpO1xuXG5leHBvcnQgbGV0IHdlYkluamVjdG9yID0gbmV3IERyUGFja2FnZUluamVjdG9yKHVuZGVmaW5lZCwgdHJ1ZSk7XG5cblxuZnVuY3Rpb24gZW1wdHJ5Q2hhaW5hYmxlRnVuY3Rpb24oKSB7XG4gIHJldHVybiBlbXB0eUZhY3RvcnlNYXA7XG59XG4iXX0=