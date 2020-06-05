"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const require_injector_1 = __importDefault(require("require-injector"));
const require_injectors_1 = require("./require-injectors");
const factory_map_1 = require("require-injector/dist/factory-map");
// import {ResolveOption} from 'require-injector/dist/node-inject';
const _ = __importStar(require("lodash"));
const fs = __importStar(require("fs"));
const Path = __importStar(require("path"));
const log4js_1 = __importDefault(require("log4js"));
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
            basedir: process.cwd(),
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
                log.info(file1 + ' doesn\'t exist');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5qZWN0b3ItZmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2luamVjdG9yLWZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsd0VBQW9EO0FBQ3BELDJEQUFxRDtBQUNyRCxtRUFBeUY7QUFDekYsbUVBQW1FO0FBQ25FLDBDQUE0QjtBQUM1Qix1Q0FBeUI7QUFDekIsMkNBQTZCO0FBQzdCLG9EQUE0QjtBQUM1QixNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDO0FBRXBELE1BQU0sa0JBQWtCLEdBQTZCLEVBQUUsQ0FBQztBQUV4RCxNQUFNLGVBQWUsR0FBRztJQUN0QixPQUFPLEVBQUUsdUJBQXVCO0lBQ2hDLFVBQVUsRUFBRSx1QkFBdUI7SUFDbkMsS0FBSyxFQUFFLHVCQUF1QjtJQUM5QixLQUFLLEVBQUUsdUJBQXVCO0NBQy9CLENBQUM7QUFFRixNQUFhLGlCQUFrQixTQUFRLDBCQUFFO0lBQ3ZDLFlBQVksT0FBa0MsRUFBWSxTQUFTLEtBQUs7UUFDdEUsS0FBSyxDQUFDO1lBQ0osT0FBTyxFQUFFLE9BQU8sQ0FBQyxHQUFHLEVBQUU7WUFDdEIsT0FBTztZQUNQLHlCQUF5QjtZQUN6QixNQUFNO1NBQ1AsQ0FBQyxDQUFDO1FBTnFELFdBQU0sR0FBTixNQUFNLENBQVE7SUFPeEUsQ0FBQztJQUVELFVBQVUsQ0FBQyxJQUFZLEVBQUUsR0FBVztRQUNsQyxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDbEMsa0JBQWtCLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxDQUFDO0lBQ2pDLENBQUM7SUFFRCxhQUFhLENBQUMsSUFBdUIsRUFBRSxHQUF1QjtRQUM1RCxNQUFNLEtBQUssR0FBSSxFQUFlLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzVDLElBQUksR0FBRyxFQUFFO1lBQ1AsTUFBTSxJQUFJLEdBQUksRUFBZSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUMxQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDVixJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLE1BQU07Z0JBQzlCLE1BQU0sSUFBSSxLQUFLLENBQUMsbUVBQW1FLENBQUMsQ0FBQztZQUN2RixLQUFLLE1BQU0sRUFBRSxJQUFJLEtBQWlCLEVBQUU7Z0JBQ2xDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDaEM7U0FDRjtRQUNELE1BQU0sV0FBVyxHQUF1QixFQUFFLENBQUM7UUFDM0MsS0FBSyxNQUFNLEVBQUUsSUFBSSxLQUFLLEVBQUU7WUFDdEIsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLGtCQUFrQixFQUFFLEVBQUUsQ0FBQyxFQUFFO2dCQUNqQyxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsa0JBQWtCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ3pEO2lCQUFNO2dCQUNMLFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO2FBQ3pDO1NBQ0Y7UUFDRCxPQUFPLElBQUksa0NBQW9CLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDL0MsQ0FBQztJQUVELGlCQUFpQjtRQUNmLE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQztJQUNyRCxDQUFDO0lBRUQsZUFBZTtRQUNiLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7SUFDbEMsQ0FBQztJQUVELGVBQWUsQ0FBQyxHQUFHLGVBQXlCO1FBQzFDLE1BQU0sS0FBSyxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxDQUFDO1FBQ3hFLE1BQU0sSUFBSSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQzdELEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxDQUFDO1FBQzFCLE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUM3QixDQUFDO0lBRUQsY0FBYyxDQUFDLGtCQUEwQjtRQUV2QyxJQUFJLENBQUMsa0JBQWtCO1lBQ3JCLGtCQUFrQixHQUFHLHVCQUF1QixDQUFDO1FBQy9DLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDTCxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxrQkFBa0IsQ0FBQztZQUN0QyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsRUFBRSxrQkFBa0IsQ0FBQztTQUNoRCxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ2hCLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO1lBQ3hFLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDeEIsR0FBRyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsR0FBRyxLQUFLLENBQUMsQ0FBQztnQkFDdkMsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUM5QixJQUFJLFFBQVEsQ0FBQyxPQUFPO29CQUNsQixRQUFRLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQztnQkFDOUIsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ2hCO2lCQUFNO2dCQUNMLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLGlCQUFpQixDQUFDLENBQUM7YUFDckM7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sb0NBQWdCLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzlDLENBQUM7Q0FDRjtBQTFFRCw4Q0EwRUM7QUFFVSxRQUFBLFlBQVksR0FBRyxJQUFJLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDN0QsUUFBQSxXQUFXLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFHaEUsU0FBUyx1QkFBdUI7SUFDOUIsT0FBTyxlQUFlLENBQUM7QUFDekIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBSSiwge0luamVjdG9yT3B0aW9ufSBmcm9tICdyZXF1aXJlLWluamVjdG9yJztcbmltcG9ydCB7ZG9JbmplY3RvckNvbmZpZ30gZnJvbSAnLi9yZXF1aXJlLWluamVjdG9ycyc7XG5pbXBvcnQge0ZhY3RvcnlNYXBDb2xsZWN0aW9uLCBGYWN0b3J5TWFwSW50ZXJmfSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvZmFjdG9yeS1tYXAnO1xuLy8gaW1wb3J0IHtSZXNvbHZlT3B0aW9ufSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3Qvbm9kZS1pbmplY3QnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3dmaC5pbmplY3RvckZhY3RvcnknKTtcblxuY29uc3QgcGFja2FnZU5hbWVQYXRoTWFwOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcblxuY29uc3QgZW1wdHlGYWN0b3J5TWFwID0ge1xuICBmYWN0b3J5OiBlbXB0cnlDaGFpbmFibGVGdW5jdGlvbixcbiAgc3Vic3RpdHV0ZTogZW1wdHJ5Q2hhaW5hYmxlRnVuY3Rpb24sXG4gIHZhbHVlOiBlbXB0cnlDaGFpbmFibGVGdW5jdGlvbixcbiAgYWxpYXM6IGVtcHRyeUNoYWluYWJsZUZ1bmN0aW9uXG59O1xuXG5leHBvcnQgY2xhc3MgRHJQYWNrYWdlSW5qZWN0b3IgZXh0ZW5kcyBSSiB7XG4gIGNvbnN0cnVjdG9yKHJlc29sdmU6IEluamVjdG9yT3B0aW9uWydyZXNvbHZlJ10sIHByb3RlY3RlZCBub05vZGUgPSBmYWxzZSkge1xuICAgIHN1cGVyKHtcbiAgICAgIGJhc2VkaXI6IHByb2Nlc3MuY3dkKCksXG4gICAgICByZXNvbHZlLFxuICAgICAgLy8gZGVidWc6IGNvbmZpZy5kZXZNb2RlLFxuICAgICAgbm9Ob2RlXG4gICAgfSk7XG4gIH1cblxuICBhZGRQYWNrYWdlKG5hbWU6IHN0cmluZywgZGlyOiBzdHJpbmcpIHtcbiAgICBsb2cuZGVidWcoJ2FkZCAlcyAlcycsIG5hbWUsIGRpcik7XG4gICAgcGFja2FnZU5hbWVQYXRoTWFwW25hbWVdID0gZGlyO1xuICB9XG5cbiAgZnJvbUNvbXBvbmVudChuYW1lOiBzdHJpbmcgfCBzdHJpbmdbXSwgZGlyPzogc3RyaW5nIHwgc3RyaW5nW10pIHtcbiAgICBjb25zdCBuYW1lcyA9IChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KG5hbWUpO1xuICAgIGlmIChkaXIpIHtcbiAgICAgIGNvbnN0IGRpcnMgPSAoW10gYXMgc3RyaW5nW10pLmNvbmNhdChkaXIpO1xuICAgICAgbGV0IGkgPSAwO1xuICAgICAgaWYgKG5hbWVzLmxlbmd0aCAhPT0gZGlycy5sZW5ndGgpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignZnJvbUNvbXBvbmVudChuYW1lLCBkaXIpXFwncyBiZSBjYWxsZWQgd2l0aCAyIEFycmF5IG9mIHNhbWUgbGVuZ3RoJyk7XG4gICAgICBmb3IgKGNvbnN0IG5tIG9mIG5hbWVzIGFzIHN0cmluZ1tdKSB7XG4gICAgICAgIHRoaXMuYWRkUGFja2FnZShubSwgZGlyc1tpKytdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgZmFjdG9yeU1hcHM6IEZhY3RvcnlNYXBJbnRlcmZbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgbm0gb2YgbmFtZXMpIHtcbiAgICAgIGlmIChfLmhhcyhwYWNrYWdlTmFtZVBhdGhNYXAsIG5tKSkge1xuICAgICAgICBmYWN0b3J5TWFwcy5wdXNoKHN1cGVyLmZyb21EaXIocGFja2FnZU5hbWVQYXRoTWFwW25tXSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZmFjdG9yeU1hcHMucHVzaChzdXBlci5mcm9tUGFja2FnZShubSkpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbmV3IEZhY3RvcnlNYXBDb2xsZWN0aW9uKGZhY3RvcnlNYXBzKTtcbiAgfVxuXG4gIGZyb21BbGxDb21wb25lbnRzKCkge1xuICAgIHJldHVybiBzdXBlci5mcm9tRGlyKF8udmFsdWVzKHBhY2thZ2VOYW1lUGF0aE1hcCkpO1xuICB9XG5cbiAgZnJvbUFsbFBhY2thZ2VzKCkge1xuICAgIHJldHVybiB0aGlzLmZyb21BbGxDb21wb25lbnRzKCk7XG4gIH1cblxuICBub3RGcm9tUGFja2FnZXMoLi4uZXhjbHVkZVBhY2thZ2VzOiBzdHJpbmdbXSkge1xuICAgIGNvbnN0IG5hbWVzID0gXy5kaWZmZXJlbmNlKF8ua2V5cyhwYWNrYWdlTmFtZVBhdGhNYXApLCBleGNsdWRlUGFja2FnZXMpO1xuICAgIGNvbnN0IGRpcnMgPSBuYW1lcy5tYXAocGtOYW1lID0+IHBhY2thZ2VOYW1lUGF0aE1hcFtwa05hbWVdKTtcbiAgICBsb2cuZGVidWcoJ2Zyb20gJyArIGRpcnMpO1xuICAgIHJldHVybiBzdXBlci5mcm9tRGlyKGRpcnMpO1xuICB9XG5cbiAgcmVhZEluamVjdEZpbGUoZmlsZU5hbWVXaXRob3V0RXh0OiBzdHJpbmcpIHtcblxuICAgIGlmICghZmlsZU5hbWVXaXRob3V0RXh0KVxuICAgICAgZmlsZU5hbWVXaXRob3V0RXh0ID0gJ21vZHVsZS1yZXNvbHZlLnNlcnZlcic7XG4gICAgXy51bmlxKFtcbiAgICAgIFBhdGgucmVzb2x2ZSgnLi8nLCBmaWxlTmFtZVdpdGhvdXRFeHQpLFxuICAgICAgUGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksIGZpbGVOYW1lV2l0aG91dEV4dClcbiAgICBdKS5mb3JFYWNoKGZpbGUgPT4ge1xuICAgICAgY29uc3QgZmlsZTEgPSBmcy5leGlzdHNTeW5jKGZpbGUgKyAnLnRzJykgPyBmaWxlICsgJy50cycgOiBmaWxlICsgJy5qcyc7XG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyhmaWxlMSkpIHtcbiAgICAgICAgbG9nLmRlYnVnKCdleGVjdXRlIGludGVybmFsICcgKyBmaWxlMSk7XG4gICAgICAgIGxldCBleHBvcnRlZCA9IHJlcXVpcmUoZmlsZTEpO1xuICAgICAgICBpZiAoZXhwb3J0ZWQuZGVmYXVsdClcbiAgICAgICAgICBleHBvcnRlZCA9IGV4cG9ydGVkLmRlZmF1bHQ7XG4gICAgICAgIGV4cG9ydGVkKHRoaXMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmluZm8oZmlsZTEgKyAnIGRvZXNuXFwndCBleGlzdCcpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGRvSW5qZWN0b3JDb25maWcodGhpcywgIXRoaXMubm9Ob2RlKTtcbiAgfVxufVxuXG5leHBvcnQgbGV0IG5vZGVJbmplY3RvciA9IG5ldyBEclBhY2thZ2VJbmplY3RvcihyZXF1aXJlLnJlc29sdmUsIGZhbHNlKTtcbmV4cG9ydCBsZXQgd2ViSW5qZWN0b3IgPSBuZXcgRHJQYWNrYWdlSW5qZWN0b3IodW5kZWZpbmVkLCB0cnVlKTtcblxuXG5mdW5jdGlvbiBlbXB0cnlDaGFpbmFibGVGdW5jdGlvbigpIHtcbiAgcmV0dXJuIGVtcHR5RmFjdG9yeU1hcDtcbn1cbiJdfQ==