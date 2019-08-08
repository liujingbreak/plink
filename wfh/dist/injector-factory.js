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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5qZWN0b3ItZmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2luamVjdG9yLWZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsd0VBQW9EO0FBQ3BELDJEQUFxRDtBQUNyRCxtRUFBeUY7QUFDekYsbUVBQW1FO0FBQ25FLDBDQUE0QjtBQUM1Qix1Q0FBeUI7QUFDekIsMkNBQTZCO0FBRTdCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUUvRCxNQUFNLGtCQUFrQixHQUE2QixFQUFFLENBQUM7QUFFeEQsTUFBTSxlQUFlLEdBQUc7SUFDdEIsT0FBTyxFQUFFLHVCQUF1QjtJQUNoQyxVQUFVLEVBQUUsdUJBQXVCO0lBQ25DLEtBQUssRUFBRSx1QkFBdUI7SUFDOUIsS0FBSyxFQUFFLHVCQUF1QjtDQUMvQixDQUFDO0FBRUYsTUFBYSxpQkFBa0IsU0FBUSwwQkFBRTtJQUN2QyxZQUFZLE9BQWtDLEVBQVksU0FBUyxLQUFLO1FBQ3RFLEtBQUssQ0FBQztZQUNKLE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFO1lBQ3RCLE9BQU87WUFDUCx5QkFBeUI7WUFDekIsTUFBTTtTQUNQLENBQUMsQ0FBQztRQU5xRCxXQUFNLEdBQU4sTUFBTSxDQUFRO0lBT3hFLENBQUM7SUFFRCxVQUFVLENBQUMsSUFBWSxFQUFFLEdBQVc7UUFDbEMsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2xDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQztJQUNqQyxDQUFDO0lBRUQsYUFBYSxDQUFDLElBQXVCLEVBQUUsR0FBdUI7UUFDNUQsTUFBTSxLQUFLLEdBQUksRUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1QyxJQUFJLEdBQUcs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Q0FBQyxDQUFDO2FBQ3JDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7UUFFSCxPQUFPLG9DQUFnQixDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztJQUM5QyxDQUFDO0NBQ0Y7QUExRUQsOENBMEVDO0FBRVUsUUFBQSxZQUFZLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQzdELFFBQUEsV0FBVyxHQUFHLElBQUksaUJBQWlCLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxDQUFDO0FBR2hFLFNBQVMsdUJBQXVCO0lBQzlCLE9BQU8sZUFBZSxDQUFDO0FBQ3pCLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgUkosIHtJbmplY3Rvck9wdGlvbn0gZnJvbSAncmVxdWlyZS1pbmplY3Rvcic7XG5pbXBvcnQge2RvSW5qZWN0b3JDb25maWd9IGZyb20gJy4vcmVxdWlyZS1pbmplY3RvcnMnO1xuaW1wb3J0IHtGYWN0b3J5TWFwQ29sbGVjdGlvbiwgRmFjdG9yeU1hcEludGVyZn0gZnJvbSAncmVxdWlyZS1pbmplY3Rvci9kaXN0L2ZhY3RvcnktbWFwJztcbi8vIGltcG9ydCB7UmVzb2x2ZU9wdGlvbn0gZnJvbSAncmVxdWlyZS1pbmplY3Rvci9kaXN0L25vZGUtaW5qZWN0JztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5cbmNvbnN0IGxvZyA9IHJlcXVpcmUoJ2xvZzRqcycpLmdldExvZ2dlcignbGliLmluamVjdG9yRmFjdG9yeScpO1xuXG5jb25zdCBwYWNrYWdlTmFtZVBhdGhNYXA6IHtbbmFtZTogc3RyaW5nXTogc3RyaW5nfSA9IHt9O1xuXG5jb25zdCBlbXB0eUZhY3RvcnlNYXAgPSB7XG4gIGZhY3Rvcnk6IGVtcHRyeUNoYWluYWJsZUZ1bmN0aW9uLFxuICBzdWJzdGl0dXRlOiBlbXB0cnlDaGFpbmFibGVGdW5jdGlvbixcbiAgdmFsdWU6IGVtcHRyeUNoYWluYWJsZUZ1bmN0aW9uLFxuICBhbGlhczogZW1wdHJ5Q2hhaW5hYmxlRnVuY3Rpb25cbn07XG5cbmV4cG9ydCBjbGFzcyBEclBhY2thZ2VJbmplY3RvciBleHRlbmRzIFJKIHtcbiAgY29uc3RydWN0b3IocmVzb2x2ZTogSW5qZWN0b3JPcHRpb25bJ3Jlc29sdmUnXSwgcHJvdGVjdGVkIG5vTm9kZSA9IGZhbHNlKSB7XG4gICAgc3VwZXIoe1xuICAgICAgYmFzZWRpcjogcHJvY2Vzcy5jd2QoKSxcbiAgICAgIHJlc29sdmUsXG4gICAgICAvLyBkZWJ1ZzogY29uZmlnLmRldk1vZGUsXG4gICAgICBub05vZGVcbiAgICB9KTtcbiAgfVxuXG4gIGFkZFBhY2thZ2UobmFtZTogc3RyaW5nLCBkaXI6IHN0cmluZykge1xuICAgIGxvZy5kZWJ1ZygnYWRkICVzICVzJywgbmFtZSwgZGlyKTtcbiAgICBwYWNrYWdlTmFtZVBhdGhNYXBbbmFtZV0gPSBkaXI7XG4gIH1cblxuICBmcm9tQ29tcG9uZW50KG5hbWU6IHN0cmluZyB8IHN0cmluZ1tdLCBkaXI/OiBzdHJpbmcgfCBzdHJpbmdbXSkge1xuICAgIGNvbnN0IG5hbWVzID0gKFtdIGFzIHN0cmluZ1tdKS5jb25jYXQobmFtZSk7XG4gICAgaWYgKGRpcikge1xuICAgICAgY29uc3QgZGlycyA9IChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KGRpcik7XG4gICAgICBsZXQgaSA9IDA7XG4gICAgICBpZiAobmFtZXMubGVuZ3RoICE9PSBkaXJzLmxlbmd0aClcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdmcm9tQ29tcG9uZW50KG5hbWUsIGRpcilcXCdzIGJlIGNhbGxlZCB3aXRoIDIgQXJyYXkgb2Ygc2FtZSBsZW5ndGgnKTtcbiAgICAgIGZvciAoY29uc3Qgbm0gb2YgbmFtZXMgYXMgc3RyaW5nW10pIHtcbiAgICAgICAgdGhpcy5hZGRQYWNrYWdlKG5tLCBkaXJzW2krK10pO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBmYWN0b3J5TWFwczogRmFjdG9yeU1hcEludGVyZltdID0gW107XG4gICAgZm9yIChjb25zdCBubSBvZiBuYW1lcykge1xuICAgICAgaWYgKF8uaGFzKHBhY2thZ2VOYW1lUGF0aE1hcCwgbm0pKSB7XG4gICAgICAgIGZhY3RvcnlNYXBzLnB1c2goc3VwZXIuZnJvbURpcihwYWNrYWdlTmFtZVBhdGhNYXBbbm1dKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmYWN0b3J5TWFwcy5wdXNoKHN1cGVyLmZyb21QYWNrYWdlKG5tKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZXcgRmFjdG9yeU1hcENvbGxlY3Rpb24oZmFjdG9yeU1hcHMpO1xuICB9XG5cbiAgZnJvbUFsbENvbXBvbmVudHMoKSB7XG4gICAgcmV0dXJuIHN1cGVyLmZyb21EaXIoXy52YWx1ZXMocGFja2FnZU5hbWVQYXRoTWFwKSk7XG4gIH1cblxuICBmcm9tQWxsUGFja2FnZXMoKSB7XG4gICAgcmV0dXJuIHRoaXMuZnJvbUFsbENvbXBvbmVudHMoKTtcbiAgfVxuXG4gIG5vdEZyb21QYWNrYWdlcyguLi5leGNsdWRlUGFja2FnZXM6IHN0cmluZ1tdKSB7XG4gICAgY29uc3QgbmFtZXMgPSBfLmRpZmZlcmVuY2UoXy5rZXlzKHBhY2thZ2VOYW1lUGF0aE1hcCksIGV4Y2x1ZGVQYWNrYWdlcyk7XG4gICAgY29uc3QgZGlycyA9IG5hbWVzLm1hcChwa05hbWUgPT4gcGFja2FnZU5hbWVQYXRoTWFwW3BrTmFtZV0pO1xuICAgIGxvZy5kZWJ1ZygnZnJvbSAnICsgZGlycyk7XG4gICAgcmV0dXJuIHN1cGVyLmZyb21EaXIoZGlycyk7XG4gIH1cblxuICByZWFkSW5qZWN0RmlsZShmaWxlTmFtZVdpdGhvdXRFeHQ6IHN0cmluZykge1xuXG4gICAgaWYgKCFmaWxlTmFtZVdpdGhvdXRFeHQpXG4gICAgICBmaWxlTmFtZVdpdGhvdXRFeHQgPSAnbW9kdWxlLXJlc29sdmUuc2VydmVyJztcbiAgICBfLnVuaXEoW1xuICAgICAgUGF0aC5yZXNvbHZlKCcuLycsIGZpbGVOYW1lV2l0aG91dEV4dCksXG4gICAgICBQYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgZmlsZU5hbWVXaXRob3V0RXh0KVxuICAgIF0pLmZvckVhY2goZmlsZSA9PiB7XG4gICAgICBjb25zdCBmaWxlMSA9IGZzLmV4aXN0c1N5bmMoZmlsZSArICcudHMnKSA/IGZpbGUgKyAnLnRzJyA6IGZpbGUgKyAnLmpzJztcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKGZpbGUxKSkge1xuICAgICAgICBsb2cuZGVidWcoJ2V4ZWN1dGUgaW50ZXJuYWwgJyArIGZpbGUxKTtcbiAgICAgICAgbGV0IGV4cG9ydGVkID0gcmVxdWlyZShmaWxlMSk7XG4gICAgICAgIGlmIChleHBvcnRlZC5kZWZhdWx0KVxuICAgICAgICAgIGV4cG9ydGVkID0gZXhwb3J0ZWQuZGVmYXVsdDtcbiAgICAgICAgZXhwb3J0ZWQodGhpcyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cuaW5mbyhmaWxlMSArICcgZG9lc25cXCd0IGV4aXN0Jyk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZG9JbmplY3RvckNvbmZpZyh0aGlzLCAhdGhpcy5ub05vZGUpO1xuICB9XG59XG5cbmV4cG9ydCBsZXQgbm9kZUluamVjdG9yID0gbmV3IERyUGFja2FnZUluamVjdG9yKHJlcXVpcmUucmVzb2x2ZSwgZmFsc2UpO1xuZXhwb3J0IGxldCB3ZWJJbmplY3RvciA9IG5ldyBEclBhY2thZ2VJbmplY3Rvcih1bmRlZmluZWQsIHRydWUpO1xuXG5cbmZ1bmN0aW9uIGVtcHRyeUNoYWluYWJsZUZ1bmN0aW9uKCkge1xuICByZXR1cm4gZW1wdHlGYWN0b3J5TWFwO1xufVxuIl19