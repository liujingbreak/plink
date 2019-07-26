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
const log = require('log4js').getLogger('lib.injectorFactory');
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
            Path.resolve(__dirname, '..', fileNameWithoutExt),
            Path.resolve(process.cwd(), fileNameWithoutExt)
        ]).forEach(file => {
            const file1 = fs.existsSync(file + '.ts') ? file + '.ts' : file + '.js';
            if (fs.existsSync(file1)) {
                log.debug('execute internal ' + file1);
                require(file1)(this);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5qZWN0b3ItZmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2luamVjdG9yLWZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsd0VBQW9EO0FBQ3BELDJEQUFxRDtBQUNyRCxtRUFBeUY7QUFDekYsbUVBQW1FO0FBQ25FLDBDQUE0QjtBQUM1Qix1Q0FBeUI7QUFDekIsMkNBQTZCO0FBRTdCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUUvRCxNQUFNLGtCQUFrQixHQUE2QixFQUFFLENBQUM7QUFFeEQsTUFBTSxlQUFlLEdBQUc7SUFDdEIsT0FBTyxFQUFFLHVCQUF1QjtJQUNoQyxVQUFVLEVBQUUsdUJBQXVCO0lBQ25DLEtBQUssRUFBRSx1QkFBdUI7SUFDOUIsS0FBSyxFQUFFLHVCQUF1QjtDQUMvQixDQUFDO0FBRUYsTUFBYSxpQkFBa0IsU0FBUSwwQkFBRTtJQUN2QyxZQUFZLE9BQWtDLEVBQVksU0FBUyxLQUFLO1FBQ3RFLEtBQUssQ0FBQztZQUNKLE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFO1lBQ3RCLE9BQU87WUFDUCx5QkFBeUI7WUFDekIsTUFBTTtTQUNQLENBQUMsQ0FBQztRQU5xRCxXQUFNLEdBQU4sTUFBTSxDQUFRO0lBT3hFLENBQUM7SUFFRCxVQUFVLENBQUMsSUFBWSxFQUFFLEdBQVc7UUFDbEMsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2xDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQztJQUNqQyxDQUFDO0lBRUQsYUFBYSxDQUFDLElBQXVCLEVBQUUsR0FBdUI7UUFDNUQsTUFBTSxLQUFLLEdBQUksRUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1QyxJQUFJLEdBQUcs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TSxDQUFDLENBQUM7SUFDOUMsQ0FBQztDQUNGO0FBdkVELDhDQXVFQztBQUVVLFFBQUEsWUFBWSxHQUFHLElBQUksaUJBQWlCLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztBQUM3RCxRQUFBLFdBQVcsR0FBRyxJQUFJLGlCQUFpQixDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUdoRSxTQUFTLHVCQUF1QjtJQUM5QixPQUFPLGVBQWUsQ0FBQztBQUN6QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFJKLCB7SW5qZWN0b3JPcHRpb259IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3InO1xuaW1wb3J0IHtkb0luamVjdG9yQ29uZmlnfSBmcm9tICcuL3JlcXVpcmUtaW5qZWN0b3JzJztcbmltcG9ydCB7RmFjdG9yeU1hcENvbGxlY3Rpb24sIEZhY3RvcnlNYXBJbnRlcmZ9IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3IvZGlzdC9mYWN0b3J5LW1hcCc7XG4vLyBpbXBvcnQge1Jlc29sdmVPcHRpb259IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3IvZGlzdC9ub2RlLWluamVjdCc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuXG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ2xpYi5pbmplY3RvckZhY3RvcnknKTtcblxuY29uc3QgcGFja2FnZU5hbWVQYXRoTWFwOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcblxuY29uc3QgZW1wdHlGYWN0b3J5TWFwID0ge1xuICBmYWN0b3J5OiBlbXB0cnlDaGFpbmFibGVGdW5jdGlvbixcbiAgc3Vic3RpdHV0ZTogZW1wdHJ5Q2hhaW5hYmxlRnVuY3Rpb24sXG4gIHZhbHVlOiBlbXB0cnlDaGFpbmFibGVGdW5jdGlvbixcbiAgYWxpYXM6IGVtcHRyeUNoYWluYWJsZUZ1bmN0aW9uXG59O1xuXG5leHBvcnQgY2xhc3MgRHJQYWNrYWdlSW5qZWN0b3IgZXh0ZW5kcyBSSiB7XG4gIGNvbnN0cnVjdG9yKHJlc29sdmU6IEluamVjdG9yT3B0aW9uWydyZXNvbHZlJ10sIHByb3RlY3RlZCBub05vZGUgPSBmYWxzZSkge1xuICAgIHN1cGVyKHtcbiAgICAgIGJhc2VkaXI6IHByb2Nlc3MuY3dkKCksXG4gICAgICByZXNvbHZlLFxuICAgICAgLy8gZGVidWc6IGNvbmZpZy5kZXZNb2RlLFxuICAgICAgbm9Ob2RlXG4gICAgfSk7XG4gIH1cblxuICBhZGRQYWNrYWdlKG5hbWU6IHN0cmluZywgZGlyOiBzdHJpbmcpIHtcbiAgICBsb2cuZGVidWcoJ2FkZCAlcyAlcycsIG5hbWUsIGRpcik7XG4gICAgcGFja2FnZU5hbWVQYXRoTWFwW25hbWVdID0gZGlyO1xuICB9XG5cbiAgZnJvbUNvbXBvbmVudChuYW1lOiBzdHJpbmcgfCBzdHJpbmdbXSwgZGlyPzogc3RyaW5nIHwgc3RyaW5nW10pIHtcbiAgICBjb25zdCBuYW1lcyA9IChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KG5hbWUpO1xuICAgIGlmIChkaXIpIHtcbiAgICAgIGNvbnN0IGRpcnMgPSAoW10gYXMgc3RyaW5nW10pLmNvbmNhdChkaXIpO1xuICAgICAgbGV0IGkgPSAwO1xuICAgICAgaWYgKG5hbWVzLmxlbmd0aCAhPT0gZGlycy5sZW5ndGgpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignZnJvbUNvbXBvbmVudChuYW1lLCBkaXIpXFwncyBiZSBjYWxsZWQgd2l0aCAyIEFycmF5IG9mIHNhbWUgbGVuZ3RoJyk7XG4gICAgICBmb3IgKGNvbnN0IG5tIG9mIG5hbWVzIGFzIHN0cmluZ1tdKSB7XG4gICAgICAgIHRoaXMuYWRkUGFja2FnZShubSwgZGlyc1tpKytdKTtcbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3QgZmFjdG9yeU1hcHM6IEZhY3RvcnlNYXBJbnRlcmZbXSA9IFtdO1xuICAgIGZvciAoY29uc3Qgbm0gb2YgbmFtZXMpIHtcbiAgICAgIGlmIChfLmhhcyhwYWNrYWdlTmFtZVBhdGhNYXAsIG5tKSkge1xuICAgICAgICBmYWN0b3J5TWFwcy5wdXNoKHN1cGVyLmZyb21EaXIocGFja2FnZU5hbWVQYXRoTWFwW25tXSkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZmFjdG9yeU1hcHMucHVzaChzdXBlci5mcm9tUGFja2FnZShubSkpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbmV3IEZhY3RvcnlNYXBDb2xsZWN0aW9uKGZhY3RvcnlNYXBzKTtcbiAgfVxuXG4gIGZyb21BbGxDb21wb25lbnRzKCkge1xuICAgIHJldHVybiBzdXBlci5mcm9tRGlyKF8udmFsdWVzKHBhY2thZ2VOYW1lUGF0aE1hcCkpO1xuICB9XG5cbiAgZnJvbUFsbFBhY2thZ2VzKCkge1xuICAgIHJldHVybiB0aGlzLmZyb21BbGxDb21wb25lbnRzKCk7XG4gIH1cblxuICBub3RGcm9tUGFja2FnZXMoLi4uZXhjbHVkZVBhY2thZ2VzOiBzdHJpbmdbXSkge1xuICAgIGNvbnN0IG5hbWVzID0gXy5kaWZmZXJlbmNlKF8ua2V5cyhwYWNrYWdlTmFtZVBhdGhNYXApLCBleGNsdWRlUGFja2FnZXMpO1xuICAgIGNvbnN0IGRpcnMgPSBuYW1lcy5tYXAocGtOYW1lID0+IHBhY2thZ2VOYW1lUGF0aE1hcFtwa05hbWVdKTtcbiAgICBsb2cuZGVidWcoJ2Zyb20gJyArIGRpcnMpO1xuICAgIHJldHVybiBzdXBlci5mcm9tRGlyKGRpcnMpO1xuICB9XG5cbiAgcmVhZEluamVjdEZpbGUoZmlsZU5hbWVXaXRob3V0RXh0OiBzdHJpbmcpIHtcblxuICAgIGlmICghZmlsZU5hbWVXaXRob3V0RXh0KVxuICAgICAgZmlsZU5hbWVXaXRob3V0RXh0ID0gJ21vZHVsZS1yZXNvbHZlLnNlcnZlcic7XG4gICAgXy51bmlxKFtcbiAgICAgIFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLicsIGZpbGVOYW1lV2l0aG91dEV4dCksXG4gICAgICBQYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgZmlsZU5hbWVXaXRob3V0RXh0KVxuICAgIF0pLmZvckVhY2goZmlsZSA9PiB7XG4gICAgICBjb25zdCBmaWxlMSA9IGZzLmV4aXN0c1N5bmMoZmlsZSArICcudHMnKSA/IGZpbGUgKyAnLnRzJyA6IGZpbGUgKyAnLmpzJztcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKGZpbGUxKSkge1xuICAgICAgICBsb2cuZGVidWcoJ2V4ZWN1dGUgaW50ZXJuYWwgJyArIGZpbGUxKTtcbiAgICAgICAgcmVxdWlyZShmaWxlMSkodGhpcyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cuaW5mbyhmaWxlMSArICcgZG9lc25cXCd0IGV4aXN0Jyk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZG9JbmplY3RvckNvbmZpZyh0aGlzLCAhdGhpcy5ub05vZGUpO1xuICB9XG59XG5cbmV4cG9ydCBsZXQgbm9kZUluamVjdG9yID0gbmV3IERyUGFja2FnZUluamVjdG9yKHJlcXVpcmUucmVzb2x2ZSwgZmFsc2UpO1xuZXhwb3J0IGxldCB3ZWJJbmplY3RvciA9IG5ldyBEclBhY2thZ2VJbmplY3Rvcih1bmRlZmluZWQsIHRydWUpO1xuXG5cbmZ1bmN0aW9uIGVtcHRyeUNoYWluYWJsZUZ1bmN0aW9uKCkge1xuICByZXR1cm4gZW1wdHlGYWN0b3J5TWFwO1xufVxuIl19