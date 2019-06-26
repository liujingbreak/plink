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
        [
            Path.resolve(__dirname, '..', fileNameWithoutExt),
            Path.resolve(process.cwd(), fileNameWithoutExt)
        ].forEach(file => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5qZWN0b3ItZmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2luamVjdG9yLWZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsd0VBQW9EO0FBQ3BELDJEQUFxRDtBQUNyRCxtRUFBeUY7QUFDekYsbUVBQW1FO0FBQ25FLDBDQUE0QjtBQUM1Qix1Q0FBeUI7QUFDekIsMkNBQTZCO0FBRTdCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUUvRCxNQUFNLGtCQUFrQixHQUE2QixFQUFFLENBQUM7QUFFeEQsTUFBTSxlQUFlLEdBQUc7SUFDdkIsT0FBTyxFQUFFLHVCQUF1QjtJQUNoQyxVQUFVLEVBQUUsdUJBQXVCO0lBQ25DLEtBQUssRUFBRSx1QkFBdUI7SUFDOUIsS0FBSyxFQUFFLHVCQUF1QjtDQUM5QixDQUFDO0FBRUYsTUFBYSxpQkFBa0IsU0FBUSwwQkFBRTtJQUN4QyxZQUFZLE9BQWtDLEVBQVksU0FBUyxLQUFLO1FBQ3ZFLEtBQUssQ0FBQztZQUNMLE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFO1lBQ3RCLE9BQU87WUFDUCx5QkFBeUI7WUFDekIsTUFBTTtTQUNOLENBQUMsQ0FBQztRQU5zRCxXQUFNLEdBQU4sTUFBTSxDQUFRO0lBT3hFLENBQUM7SUFFRCxVQUFVLENBQUMsSUFBWSxFQUFFLEdBQVc7UUFDbkMsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2xDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQztJQUNoQyxDQUFDO0lBRUQsYUFBYSxDQUFDLElBQXVCLEVBQUUsR0FBdUI7UUFDN0QsTUFBTSxLQUFLLEdBQUksRUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1QyxJQUFJLEdBQUcs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QUNEO0FBdkVELDhDQXVFQztBQUVVLFFBQUEsWUFBWSxHQUFHLElBQUksaUJBQWlCLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztBQUM3RCxRQUFBLFdBQVcsR0FBRyxJQUFJLGlCQUFpQixDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUdoRSxTQUFTLHVCQUF1QjtJQUMvQixPQUFPLGVBQWUsQ0FBQztBQUN4QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFJKLCB7SW5qZWN0b3JPcHRpb259IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3InO1xuaW1wb3J0IHtkb0luamVjdG9yQ29uZmlnfSBmcm9tICcuL3JlcXVpcmUtaW5qZWN0b3JzJztcbmltcG9ydCB7RmFjdG9yeU1hcENvbGxlY3Rpb24sIEZhY3RvcnlNYXBJbnRlcmZ9IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3IvZGlzdC9mYWN0b3J5LW1hcCc7XG4vLyBpbXBvcnQge1Jlc29sdmVPcHRpb259IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3IvZGlzdC9ub2RlLWluamVjdCc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuXG5jb25zdCBsb2cgPSByZXF1aXJlKCdsb2c0anMnKS5nZXRMb2dnZXIoJ2xpYi5pbmplY3RvckZhY3RvcnknKTtcblxuY29uc3QgcGFja2FnZU5hbWVQYXRoTWFwOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcblxuY29uc3QgZW1wdHlGYWN0b3J5TWFwID0ge1xuXHRmYWN0b3J5OiBlbXB0cnlDaGFpbmFibGVGdW5jdGlvbixcblx0c3Vic3RpdHV0ZTogZW1wdHJ5Q2hhaW5hYmxlRnVuY3Rpb24sXG5cdHZhbHVlOiBlbXB0cnlDaGFpbmFibGVGdW5jdGlvbixcblx0YWxpYXM6IGVtcHRyeUNoYWluYWJsZUZ1bmN0aW9uXG59O1xuXG5leHBvcnQgY2xhc3MgRHJQYWNrYWdlSW5qZWN0b3IgZXh0ZW5kcyBSSiB7XG5cdGNvbnN0cnVjdG9yKHJlc29sdmU6IEluamVjdG9yT3B0aW9uWydyZXNvbHZlJ10sIHByb3RlY3RlZCBub05vZGUgPSBmYWxzZSkge1xuXHRcdHN1cGVyKHtcblx0XHRcdGJhc2VkaXI6IHByb2Nlc3MuY3dkKCksXG5cdFx0XHRyZXNvbHZlLFxuXHRcdFx0Ly8gZGVidWc6IGNvbmZpZy5kZXZNb2RlLFxuXHRcdFx0bm9Ob2RlXG5cdFx0fSk7XG5cdH1cblxuXHRhZGRQYWNrYWdlKG5hbWU6IHN0cmluZywgZGlyOiBzdHJpbmcpIHtcblx0XHRsb2cuZGVidWcoJ2FkZCAlcyAlcycsIG5hbWUsIGRpcik7XG5cdFx0cGFja2FnZU5hbWVQYXRoTWFwW25hbWVdID0gZGlyO1xuXHR9XG5cblx0ZnJvbUNvbXBvbmVudChuYW1lOiBzdHJpbmcgfCBzdHJpbmdbXSwgZGlyPzogc3RyaW5nIHwgc3RyaW5nW10pIHtcblx0XHRjb25zdCBuYW1lcyA9IChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KG5hbWUpO1xuXHRcdGlmIChkaXIpIHtcblx0XHRcdGNvbnN0IGRpcnMgPSAoW10gYXMgc3RyaW5nW10pLmNvbmNhdChkaXIpO1xuXHRcdFx0bGV0IGkgPSAwO1xuXHRcdFx0aWYgKG5hbWVzLmxlbmd0aCAhPT0gZGlycy5sZW5ndGgpXG5cdFx0XHRcdHRocm93IG5ldyBFcnJvcignZnJvbUNvbXBvbmVudChuYW1lLCBkaXIpXFwncyBiZSBjYWxsZWQgd2l0aCAyIEFycmF5IG9mIHNhbWUgbGVuZ3RoJyk7XG5cdFx0XHRmb3IgKGNvbnN0IG5tIG9mIG5hbWVzIGFzIHN0cmluZ1tdKSB7XG5cdFx0XHRcdHRoaXMuYWRkUGFja2FnZShubSwgZGlyc1tpKytdKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0Y29uc3QgZmFjdG9yeU1hcHM6IEZhY3RvcnlNYXBJbnRlcmZbXSA9IFtdO1xuXHRcdGZvciAoY29uc3Qgbm0gb2YgbmFtZXMpIHtcblx0XHRcdGlmIChfLmhhcyhwYWNrYWdlTmFtZVBhdGhNYXAsIG5tKSkge1xuXHRcdFx0XHRmYWN0b3J5TWFwcy5wdXNoKHN1cGVyLmZyb21EaXIocGFja2FnZU5hbWVQYXRoTWFwW25tXSkpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZmFjdG9yeU1hcHMucHVzaChzdXBlci5mcm9tUGFja2FnZShubSkpO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRyZXR1cm4gbmV3IEZhY3RvcnlNYXBDb2xsZWN0aW9uKGZhY3RvcnlNYXBzKTtcblx0fVxuXG5cdGZyb21BbGxDb21wb25lbnRzKCkge1xuXHRcdHJldHVybiBzdXBlci5mcm9tRGlyKF8udmFsdWVzKHBhY2thZ2VOYW1lUGF0aE1hcCkpO1xuXHR9XG5cblx0ZnJvbUFsbFBhY2thZ2VzKCkge1xuXHRcdHJldHVybiB0aGlzLmZyb21BbGxDb21wb25lbnRzKCk7XG5cdH1cblxuXHRub3RGcm9tUGFja2FnZXMoLi4uZXhjbHVkZVBhY2thZ2VzOiBzdHJpbmdbXSkge1xuXHRcdGNvbnN0IG5hbWVzID0gXy5kaWZmZXJlbmNlKF8ua2V5cyhwYWNrYWdlTmFtZVBhdGhNYXApLCBleGNsdWRlUGFja2FnZXMpO1xuXHRcdGNvbnN0IGRpcnMgPSBuYW1lcy5tYXAocGtOYW1lID0+IHBhY2thZ2VOYW1lUGF0aE1hcFtwa05hbWVdKTtcblx0XHRsb2cuZGVidWcoJ2Zyb20gJyArIGRpcnMpO1xuXHRcdHJldHVybiBzdXBlci5mcm9tRGlyKGRpcnMpO1xuXHR9XG5cblx0cmVhZEluamVjdEZpbGUoZmlsZU5hbWVXaXRob3V0RXh0OiBzdHJpbmcpIHtcblxuXHRcdGlmICghZmlsZU5hbWVXaXRob3V0RXh0KVxuXHRcdFx0ZmlsZU5hbWVXaXRob3V0RXh0ID0gJ21vZHVsZS1yZXNvbHZlLnNlcnZlcic7XG5cdFx0W1xuXHRcdFx0UGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uJywgZmlsZU5hbWVXaXRob3V0RXh0KSxcblx0XHRcdFBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCBmaWxlTmFtZVdpdGhvdXRFeHQpXG5cdFx0XS5mb3JFYWNoKGZpbGUgPT4ge1xuXHRcdFx0Y29uc3QgZmlsZTEgPSBmcy5leGlzdHNTeW5jKGZpbGUgKyAnLnRzJykgPyBmaWxlICsgJy50cycgOiBmaWxlICsgJy5qcyc7XG5cdFx0XHRpZiAoZnMuZXhpc3RzU3luYyhmaWxlMSkpIHtcblx0XHRcdFx0bG9nLmRlYnVnKCdleGVjdXRlIGludGVybmFsICcgKyBmaWxlMSk7XG5cdFx0XHRcdHJlcXVpcmUoZmlsZTEpKHRoaXMpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0bG9nLmluZm8oZmlsZTEgKyAnIGRvZXNuXFwndCBleGlzdCcpO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0cmV0dXJuIGRvSW5qZWN0b3JDb25maWcodGhpcywgIXRoaXMubm9Ob2RlKTtcblx0fVxufVxuXG5leHBvcnQgbGV0IG5vZGVJbmplY3RvciA9IG5ldyBEclBhY2thZ2VJbmplY3RvcihyZXF1aXJlLnJlc29sdmUsIGZhbHNlKTtcbmV4cG9ydCBsZXQgd2ViSW5qZWN0b3IgPSBuZXcgRHJQYWNrYWdlSW5qZWN0b3IodW5kZWZpbmVkLCB0cnVlKTtcblxuXG5mdW5jdGlvbiBlbXB0cnlDaGFpbmFibGVGdW5jdGlvbigpIHtcblx0cmV0dXJuIGVtcHR5RmFjdG9yeU1hcDtcbn1cbiJdfQ==