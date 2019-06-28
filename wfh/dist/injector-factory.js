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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5qZWN0b3ItZmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2luamVjdG9yLWZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7O0FBQUEsd0VBQW9EO0FBQ3BELDJEQUFxRDtBQUNyRCxtRUFBeUY7QUFDekYsbUVBQW1FO0FBQ25FLDBDQUE0QjtBQUM1Qix1Q0FBeUI7QUFDekIsMkNBQTZCO0FBRTdCLE1BQU0sR0FBRyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxTQUFTLENBQUMscUJBQXFCLENBQUMsQ0FBQztBQUUvRCxNQUFNLGtCQUFrQixHQUE2QixFQUFFLENBQUM7QUFFeEQsTUFBTSxlQUFlLEdBQUc7SUFDdEIsT0FBTyxFQUFFLHVCQUF1QjtJQUNoQyxVQUFVLEVBQUUsdUJBQXVCO0lBQ25DLEtBQUssRUFBRSx1QkFBdUI7SUFDOUIsS0FBSyxFQUFFLHVCQUF1QjtDQUMvQixDQUFDO0FBRUYsTUFBYSxpQkFBa0IsU0FBUSwwQkFBRTtJQUN2QyxZQUFZLE9BQWtDLEVBQVksU0FBUyxLQUFLO1FBQ3RFLEtBQUssQ0FBQztZQUNKLE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxFQUFFO1lBQ3RCLE9BQU87WUFDUCx5QkFBeUI7WUFDekIsTUFBTTtTQUNQLENBQUMsQ0FBQztRQU5xRCxXQUFNLEdBQU4sTUFBTSxDQUFRO0lBT3hFLENBQUM7SUFFRCxVQUFVLENBQUMsSUFBWSxFQUFFLEdBQVc7UUFDbEMsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2xDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxHQUFHLEdBQUcsQ0FBQztJQUNqQyxDQUFDO0lBRUQsYUFBYSxDQUFDLElBQXVCLEVBQUUsR0FBdUI7UUFDNUQsTUFBTSxLQUFLLEdBQUksRUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1QyxJQUFJLEdBQUcs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RjtBQXZFRCw4Q0F1RUM7QUFFVSxRQUFBLFlBQVksR0FBRyxJQUFJLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUM7QUFDN0QsUUFBQSxXQUFXLEdBQUcsSUFBSSxpQkFBaUIsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLENBQUM7QUFHaEUsU0FBUyx1QkFBdUI7SUFDOUIsT0FBTyxlQUFlLENBQUM7QUFDekIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBSSiwge0luamVjdG9yT3B0aW9ufSBmcm9tICdyZXF1aXJlLWluamVjdG9yJztcbmltcG9ydCB7ZG9JbmplY3RvckNvbmZpZ30gZnJvbSAnLi9yZXF1aXJlLWluamVjdG9ycyc7XG5pbXBvcnQge0ZhY3RvcnlNYXBDb2xsZWN0aW9uLCBGYWN0b3J5TWFwSW50ZXJmfSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvZmFjdG9yeS1tYXAnO1xuLy8gaW1wb3J0IHtSZXNvbHZlT3B0aW9ufSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3Qvbm9kZS1pbmplY3QnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcblxuY29uc3QgbG9nID0gcmVxdWlyZSgnbG9nNGpzJykuZ2V0TG9nZ2VyKCdsaWIuaW5qZWN0b3JGYWN0b3J5Jyk7XG5cbmNvbnN0IHBhY2thZ2VOYW1lUGF0aE1hcDoge1tuYW1lOiBzdHJpbmddOiBzdHJpbmd9ID0ge307XG5cbmNvbnN0IGVtcHR5RmFjdG9yeU1hcCA9IHtcbiAgZmFjdG9yeTogZW1wdHJ5Q2hhaW5hYmxlRnVuY3Rpb24sXG4gIHN1YnN0aXR1dGU6IGVtcHRyeUNoYWluYWJsZUZ1bmN0aW9uLFxuICB2YWx1ZTogZW1wdHJ5Q2hhaW5hYmxlRnVuY3Rpb24sXG4gIGFsaWFzOiBlbXB0cnlDaGFpbmFibGVGdW5jdGlvblxufTtcblxuZXhwb3J0IGNsYXNzIERyUGFja2FnZUluamVjdG9yIGV4dGVuZHMgUkoge1xuICBjb25zdHJ1Y3RvcihyZXNvbHZlOiBJbmplY3Rvck9wdGlvblsncmVzb2x2ZSddLCBwcm90ZWN0ZWQgbm9Ob2RlID0gZmFsc2UpIHtcbiAgICBzdXBlcih7XG4gICAgICBiYXNlZGlyOiBwcm9jZXNzLmN3ZCgpLFxuICAgICAgcmVzb2x2ZSxcbiAgICAgIC8vIGRlYnVnOiBjb25maWcuZGV2TW9kZSxcbiAgICAgIG5vTm9kZVxuICAgIH0pO1xuICB9XG5cbiAgYWRkUGFja2FnZShuYW1lOiBzdHJpbmcsIGRpcjogc3RyaW5nKSB7XG4gICAgbG9nLmRlYnVnKCdhZGQgJXMgJXMnLCBuYW1lLCBkaXIpO1xuICAgIHBhY2thZ2VOYW1lUGF0aE1hcFtuYW1lXSA9IGRpcjtcbiAgfVxuXG4gIGZyb21Db21wb25lbnQobmFtZTogc3RyaW5nIHwgc3RyaW5nW10sIGRpcj86IHN0cmluZyB8IHN0cmluZ1tdKSB7XG4gICAgY29uc3QgbmFtZXMgPSAoW10gYXMgc3RyaW5nW10pLmNvbmNhdChuYW1lKTtcbiAgICBpZiAoZGlyKSB7XG4gICAgICBjb25zdCBkaXJzID0gKFtdIGFzIHN0cmluZ1tdKS5jb25jYXQoZGlyKTtcbiAgICAgIGxldCBpID0gMDtcbiAgICAgIGlmIChuYW1lcy5sZW5ndGggIT09IGRpcnMubGVuZ3RoKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2Zyb21Db21wb25lbnQobmFtZSwgZGlyKVxcJ3MgYmUgY2FsbGVkIHdpdGggMiBBcnJheSBvZiBzYW1lIGxlbmd0aCcpO1xuICAgICAgZm9yIChjb25zdCBubSBvZiBuYW1lcyBhcyBzdHJpbmdbXSkge1xuICAgICAgICB0aGlzLmFkZFBhY2thZ2Uobm0sIGRpcnNbaSsrXSk7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IGZhY3RvcnlNYXBzOiBGYWN0b3J5TWFwSW50ZXJmW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IG5tIG9mIG5hbWVzKSB7XG4gICAgICBpZiAoXy5oYXMocGFja2FnZU5hbWVQYXRoTWFwLCBubSkpIHtcbiAgICAgICAgZmFjdG9yeU1hcHMucHVzaChzdXBlci5mcm9tRGlyKHBhY2thZ2VOYW1lUGF0aE1hcFtubV0pKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZhY3RvcnlNYXBzLnB1c2goc3VwZXIuZnJvbVBhY2thZ2Uobm0pKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5ldyBGYWN0b3J5TWFwQ29sbGVjdGlvbihmYWN0b3J5TWFwcyk7XG4gIH1cblxuICBmcm9tQWxsQ29tcG9uZW50cygpIHtcbiAgICByZXR1cm4gc3VwZXIuZnJvbURpcihfLnZhbHVlcyhwYWNrYWdlTmFtZVBhdGhNYXApKTtcbiAgfVxuXG4gIGZyb21BbGxQYWNrYWdlcygpIHtcbiAgICByZXR1cm4gdGhpcy5mcm9tQWxsQ29tcG9uZW50cygpO1xuICB9XG5cbiAgbm90RnJvbVBhY2thZ2VzKC4uLmV4Y2x1ZGVQYWNrYWdlczogc3RyaW5nW10pIHtcbiAgICBjb25zdCBuYW1lcyA9IF8uZGlmZmVyZW5jZShfLmtleXMocGFja2FnZU5hbWVQYXRoTWFwKSwgZXhjbHVkZVBhY2thZ2VzKTtcbiAgICBjb25zdCBkaXJzID0gbmFtZXMubWFwKHBrTmFtZSA9PiBwYWNrYWdlTmFtZVBhdGhNYXBbcGtOYW1lXSk7XG4gICAgbG9nLmRlYnVnKCdmcm9tICcgKyBkaXJzKTtcbiAgICByZXR1cm4gc3VwZXIuZnJvbURpcihkaXJzKTtcbiAgfVxuXG4gIHJlYWRJbmplY3RGaWxlKGZpbGVOYW1lV2l0aG91dEV4dDogc3RyaW5nKSB7XG5cbiAgICBpZiAoIWZpbGVOYW1lV2l0aG91dEV4dClcbiAgICAgIGZpbGVOYW1lV2l0aG91dEV4dCA9ICdtb2R1bGUtcmVzb2x2ZS5zZXJ2ZXInO1xuICAgIFtcbiAgICAgIFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLicsIGZpbGVOYW1lV2l0aG91dEV4dCksXG4gICAgICBQYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgZmlsZU5hbWVXaXRob3V0RXh0KVxuICAgIF0uZm9yRWFjaChmaWxlID0+IHtcbiAgICAgIGNvbnN0IGZpbGUxID0gZnMuZXhpc3RzU3luYyhmaWxlICsgJy50cycpID8gZmlsZSArICcudHMnIDogZmlsZSArICcuanMnO1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoZmlsZTEpKSB7XG4gICAgICAgIGxvZy5kZWJ1ZygnZXhlY3V0ZSBpbnRlcm5hbCAnICsgZmlsZTEpO1xuICAgICAgICByZXF1aXJlKGZpbGUxKSh0aGlzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy5pbmZvKGZpbGUxICsgJyBkb2VzblxcJ3QgZXhpc3QnKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIHJldHVybiBkb0luamVjdG9yQ29uZmlnKHRoaXMsICF0aGlzLm5vTm9kZSk7XG4gIH1cbn1cblxuZXhwb3J0IGxldCBub2RlSW5qZWN0b3IgPSBuZXcgRHJQYWNrYWdlSW5qZWN0b3IocmVxdWlyZS5yZXNvbHZlLCBmYWxzZSk7XG5leHBvcnQgbGV0IHdlYkluamVjdG9yID0gbmV3IERyUGFja2FnZUluamVjdG9yKHVuZGVmaW5lZCwgdHJ1ZSk7XG5cblxuZnVuY3Rpb24gZW1wdHJ5Q2hhaW5hYmxlRnVuY3Rpb24oKSB7XG4gIHJldHVybiBlbXB0eUZhY3RvcnlNYXA7XG59XG4iXX0=