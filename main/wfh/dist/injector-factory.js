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
            basedir: (0, misc_1.getRootDir)(),
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
            Path.resolve((0, misc_1.getRootDir)(), fileNameWithoutExt),
            Path.resolve((0, misc_1.getWorkDir)(), fileNameWithoutExt)
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
        handler.runEachSync((_file, _lastResult, handler) => {
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
        void handler.runEach((_file, _lastResult, handler) => {
            if (isNode && handler.setupNodeInjector)
                handler.setupNodeInjector(factory, config());
            else if (!isNode && handler.setupWebInjector)
                handler.setupWebInjector(factory, config());
        }, 'Injector configuration for ' + (isNode ? 'Node.js runtime' : 'client side build tool'));
    });
}
exports.doInjectorConfig = doInjectorConfig;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5qZWN0b3ItZmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2luamVjdG9yLWZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHdFQUFrQztBQUdsQyxtRUFBeUY7QUFDekYsMENBQTRCO0FBQzVCLHVDQUF5QjtBQUN6QiwyQ0FBNkI7QUFDN0Isb0RBQTRCO0FBQzVCLHVDQUFvRDtBQUNwRCxNQUFNLEdBQUcsR0FBRyxnQkFBTSxDQUFDLFNBQVMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO0FBRXZELE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxHQUFHLEVBQWlELENBQUM7QUFFcEYsTUFBTSxlQUFlLEdBQUc7SUFDdEIsT0FBTyxFQUFFLHVCQUF1QjtJQUNoQyxVQUFVLEVBQUUsdUJBQXVCO0lBQ25DLEtBQUssRUFBRSx1QkFBdUI7SUFDOUIsS0FBSyxFQUFFLHVCQUF1QjtDQUMvQixDQUFDO0FBRUYsTUFBYSxpQkFBa0IsU0FBUSwwQkFBRTtJQUN2QyxZQUFzQixTQUFTLEtBQUs7UUFDbEMsS0FBSyxDQUFDO1lBQ0osT0FBTyxFQUFFLElBQUEsaUJBQVUsR0FBRTtZQUNyQix5QkFBeUI7WUFDekIsTUFBTTtTQUNQLENBQUMsQ0FBQztRQUxpQixXQUFNLEdBQU4sTUFBTSxDQUFRO0lBTXBDLENBQUM7SUFFRCxVQUFVLENBQUMsSUFBWSxFQUFFLEdBQVcsRUFBRSxVQUFtQjtRQUN2RCxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDbEMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxFQUFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBQyxDQUFDLENBQUM7SUFDckUsQ0FBQztJQUVELGdCQUFnQixDQUFDLElBQXVCLEVBQUUsR0FBdUI7UUFDL0QsTUFBTSxLQUFLLEdBQUksRUFBZSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1QyxJQUFJLEdBQUcsRUFBRTtZQUNQLE1BQU0sSUFBSSxHQUFJLEVBQWUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDMUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ1YsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxNQUFNO2dCQUM5QixNQUFNLElBQUksS0FBSyxDQUFDLG1FQUFtRSxDQUFDLENBQUM7WUFDdkYsS0FBSyxNQUFNLEVBQUUsSUFBSSxLQUFLLEVBQUc7Z0JBQ3ZCLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDaEM7U0FDRjtRQUNELE1BQU0sV0FBVyxHQUF1QixFQUFFLENBQUM7UUFDM0MsS0FBSyxNQUFNLEVBQUUsSUFBSSxLQUFLLEVBQUU7WUFDdEIsTUFBTSxLQUFLLEdBQUcsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3pDLElBQUksS0FBSyxFQUFFO2dCQUNULFdBQVcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztnQkFDaEQsSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFO29CQUNqQixXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7aUJBQ2hEO2FBQ0Y7aUJBQU07Z0JBQ0wsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7YUFDekM7U0FDRjtRQUNELE9BQU8sSUFBSSxrQ0FBb0IsQ0FBQyxXQUFXLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBRUQsaUJBQWlCO1FBQ2YsTUFBTSxTQUFTLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQzthQUN0RCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDOUIsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLEVBQUUsQ0FBQzthQUN2RCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDO1FBQ3RELE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFFBQW9CLENBQUMsQ0FBQyxDQUFDO0lBQy9ELENBQUM7SUFFRCxlQUFlO1FBQ2IsT0FBTyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztJQUNsQyxDQUFDO0lBRUQsZUFBZSxDQUFDLEdBQUcsZUFBeUI7UUFDMUMsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEVBQUUsZUFBZSxDQUFDLENBQUM7UUFDeEUsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7UUFDN0QsR0FBRyxDQUFDLEtBQUssQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUM7UUFDMUIsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzdCLENBQUM7SUFFRCxjQUFjLENBQUMsa0JBQTJCO1FBRXhDLElBQUksQ0FBQyxrQkFBa0I7WUFDckIsa0JBQWtCLEdBQUcsdUJBQXVCLENBQUM7UUFDL0MsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUNMLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBQSxpQkFBVSxHQUFFLEVBQUUsa0JBQWtCLENBQUM7WUFDOUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFBLGlCQUFVLEdBQUUsRUFBRSxrQkFBa0IsQ0FBQztTQUMvQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ2hCLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFDO1lBQ3hFLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsRUFBRTtnQkFDeEIsR0FBRyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsR0FBRyxLQUFLLENBQUMsQ0FBQztnQkFDdkMsSUFBSSxRQUFRLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUM5QixJQUFJLFFBQVEsQ0FBQyxPQUFPO29CQUNsQixRQUFRLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQztnQkFDOUIsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDO2FBQ2hCO2lCQUFNO2dCQUNMLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLDJCQUEyQixDQUFDLENBQUM7YUFDaEQ7UUFDSCxDQUFDLENBQUMsQ0FBQztRQUVILE9BQU8sb0JBQW9CLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ2xELENBQUM7Q0FDRjtBQWpGRCw4Q0FpRkM7QUFFVSxRQUFBLFlBQVksR0FBRyxJQUFJLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxDQUFDO0FBRTVDLFFBQUEsV0FBVyxHQUFHLElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUM7QUFTckQsU0FBZ0Isb0JBQW9CLENBQUMsT0FBMEIsRUFBRSxNQUFNLEdBQUcsS0FBSztJQUM3RSxNQUFNLE1BQU0sR0FBbUIsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQztJQUMzRCxNQUFNLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDdkMsT0FBTyxDQUFDLFdBQVcsQ0FBd0IsQ0FBQyxLQUFhLEVBQUUsV0FBZ0IsRUFBRSxPQUFPLEVBQUUsRUFBRTtZQUN0RixJQUFJLE1BQU0sSUFBSSxPQUFPLENBQUMsaUJBQWlCO2dCQUNyQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7aUJBQzFDLElBQUksQ0FBQyxNQUFNLElBQUksT0FBTyxDQUFDLGdCQUFnQjtnQkFDMUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ2hELENBQUMsRUFBRSw2QkFBNkIsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQztJQUM5RixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFWRCxvREFVQztBQUVELFNBQVMsdUJBQXVCO0lBQzlCLE9BQU8sZUFBZSxDQUFDO0FBQ3pCLENBQUM7QUFFRCxrQkFBa0I7QUFDbEIsU0FBZ0IsZ0JBQWdCLENBQUMsT0FBMEIsRUFBRSxNQUFNLEdBQUcsS0FBSztJQUN6RSxNQUFNLE1BQU0sR0FBbUIsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLE9BQU8sQ0FBQztJQUMzRCxNQUFNLENBQUMsdUJBQXVCLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDdkMsS0FBSyxPQUFPLENBQUMsT0FBTyxDQUF3QixDQUFDLEtBQWEsRUFBRSxXQUFnQixFQUFFLE9BQU8sRUFBRSxFQUFFO1lBQ3ZGLElBQUksTUFBTSxJQUFJLE9BQU8sQ0FBQyxpQkFBaUI7Z0JBQ3JDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztpQkFDMUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxPQUFPLENBQUMsZ0JBQWdCO2dCQUMxQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDaEQsQ0FBQyxFQUFFLDZCQUE2QixHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDO0lBQzlGLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQztBQVZELDRDQVVDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFJKIGZyb20gJ3JlcXVpcmUtaW5qZWN0b3InO1xuaW1wb3J0IF9jb25maWcgZnJvbSAnLi9jb25maWcnO1xuaW1wb3J0IHtQbGlua1NldHRpbmdzfSBmcm9tICcuL2NvbmZpZy9jb25maWctc2xpY2UnO1xuaW1wb3J0IHtGYWN0b3J5TWFwQ29sbGVjdGlvbiwgRmFjdG9yeU1hcEludGVyZn0gZnJvbSAncmVxdWlyZS1pbmplY3Rvci9kaXN0L2ZhY3RvcnktbWFwJztcbmltcG9ydCAqIGFzIF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCAqIGFzIFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQge2dldFJvb3REaXIsIGdldFdvcmtEaXJ9IGZyb20gJy4vdXRpbHMvbWlzYyc7XG5jb25zdCBsb2cgPSBsb2c0anMuZ2V0TG9nZ2VyKCdwbGluay5pbmplY3Rvci1mYWN0b3J5Jyk7XG5cbmNvbnN0IHBhY2thZ2VOYW1lUGF0aE1hcCA9IG5ldyBNYXA8c3RyaW5nLCB7c3ltbGluaz86IHN0cmluZzsgcmVhbFBhdGg6IHN0cmluZzt9PigpO1xuXG5jb25zdCBlbXB0eUZhY3RvcnlNYXAgPSB7XG4gIGZhY3Rvcnk6IGVtcHRyeUNoYWluYWJsZUZ1bmN0aW9uLFxuICBzdWJzdGl0dXRlOiBlbXB0cnlDaGFpbmFibGVGdW5jdGlvbixcbiAgdmFsdWU6IGVtcHRyeUNoYWluYWJsZUZ1bmN0aW9uLFxuICBhbGlhczogZW1wdHJ5Q2hhaW5hYmxlRnVuY3Rpb25cbn07XG5cbmV4cG9ydCBjbGFzcyBEclBhY2thZ2VJbmplY3RvciBleHRlbmRzIFJKIHtcbiAgY29uc3RydWN0b3IocHJvdGVjdGVkIG5vTm9kZSA9IGZhbHNlKSB7XG4gICAgc3VwZXIoe1xuICAgICAgYmFzZWRpcjogZ2V0Um9vdERpcigpLFxuICAgICAgLy8gZGVidWc6IGNvbmZpZy5kZXZNb2RlLFxuICAgICAgbm9Ob2RlXG4gICAgfSk7XG4gIH1cblxuICBhZGRQYWNrYWdlKG5hbWU6IHN0cmluZywgZGlyOiBzdHJpbmcsIHN5bWxpbmtEaXI/OiBzdHJpbmcpIHtcbiAgICBsb2cuZGVidWcoJ2FkZCAlcyAlcycsIG5hbWUsIGRpcik7XG4gICAgcGFja2FnZU5hbWVQYXRoTWFwLnNldChuYW1lLCB7c3ltbGluazogc3ltbGlua0RpciwgcmVhbFBhdGg6IGRpcn0pO1xuICB9XG5cbiAgZnJvbVBsaW5rUGFja2FnZShuYW1lOiBzdHJpbmcgfCBzdHJpbmdbXSwgZGlyPzogc3RyaW5nIHwgc3RyaW5nW10pIHtcbiAgICBjb25zdCBuYW1lcyA9IChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KG5hbWUpO1xuICAgIGlmIChkaXIpIHtcbiAgICAgIGNvbnN0IGRpcnMgPSAoW10gYXMgc3RyaW5nW10pLmNvbmNhdChkaXIpO1xuICAgICAgbGV0IGkgPSAwO1xuICAgICAgaWYgKG5hbWVzLmxlbmd0aCAhPT0gZGlycy5sZW5ndGgpXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignZnJvbUNvbXBvbmVudChuYW1lLCBkaXIpXFwncyBiZSBjYWxsZWQgd2l0aCAyIEFycmF5IG9mIHNhbWUgbGVuZ3RoJyk7XG4gICAgICBmb3IgKGNvbnN0IG5tIG9mIG5hbWVzICkge1xuICAgICAgICB0aGlzLmFkZFBhY2thZ2Uobm0sIGRpcnNbaSsrXSk7XG4gICAgICB9XG4gICAgfVxuICAgIGNvbnN0IGZhY3RvcnlNYXBzOiBGYWN0b3J5TWFwSW50ZXJmW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IG5tIG9mIG5hbWVzKSB7XG4gICAgICBjb25zdCBwYXRocyA9IHBhY2thZ2VOYW1lUGF0aE1hcC5nZXQobm0pO1xuICAgICAgaWYgKHBhdGhzKSB7XG4gICAgICAgIGZhY3RvcnlNYXBzLnB1c2goc3VwZXIuZnJvbURpcihwYXRocy5yZWFsUGF0aCkpO1xuICAgICAgICBpZiAocGF0aHMuc3ltbGluaykge1xuICAgICAgICAgIGZhY3RvcnlNYXBzLnB1c2goc3VwZXIuZnJvbURpcihwYXRocy5zeW1saW5rKSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZhY3RvcnlNYXBzLnB1c2goc3VwZXIuZnJvbVBhY2thZ2Uobm0pKTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG5ldyBGYWN0b3J5TWFwQ29sbGVjdGlvbihmYWN0b3J5TWFwcyk7XG4gIH1cblxuICBmcm9tQWxsQ29tcG9uZW50cygpIHtcbiAgICBjb25zdCByZWFscGF0aHMgPSBBcnJheS5mcm9tKHBhY2thZ2VOYW1lUGF0aE1hcC52YWx1ZXMoKSlcbiAgICAgIC5tYXAoaXRlbSA9PiBpdGVtLnJlYWxQYXRoKTtcbiAgICBjb25zdCBzeW1saW5rcyA9IEFycmF5LmZyb20ocGFja2FnZU5hbWVQYXRoTWFwLnZhbHVlcygpKVxuICAgIC5tYXAoaXRlbSA9PiBpdGVtLnN5bWxpbmspLmZpbHRlcihkaXIgPT4gZGlyICE9IG51bGwpO1xuICAgIHJldHVybiBzdXBlci5mcm9tRGlyKHJlYWxwYXRocy5jb25jYXQoc3ltbGlua3MgYXMgc3RyaW5nW10pKTtcbiAgfVxuXG4gIGZyb21BbGxQYWNrYWdlcygpIHtcbiAgICByZXR1cm4gdGhpcy5mcm9tQWxsQ29tcG9uZW50cygpO1xuICB9XG5cbiAgbm90RnJvbVBhY2thZ2VzKC4uLmV4Y2x1ZGVQYWNrYWdlczogc3RyaW5nW10pIHtcbiAgICBjb25zdCBuYW1lcyA9IF8uZGlmZmVyZW5jZShfLmtleXMocGFja2FnZU5hbWVQYXRoTWFwKSwgZXhjbHVkZVBhY2thZ2VzKTtcbiAgICBjb25zdCBkaXJzID0gbmFtZXMubWFwKHBrTmFtZSA9PiBwYWNrYWdlTmFtZVBhdGhNYXBbcGtOYW1lXSk7XG4gICAgbG9nLmRlYnVnKCdmcm9tICcgKyBkaXJzKTtcbiAgICByZXR1cm4gc3VwZXIuZnJvbURpcihkaXJzKTtcbiAgfVxuXG4gIHJlYWRJbmplY3RGaWxlKGZpbGVOYW1lV2l0aG91dEV4dD86IHN0cmluZykge1xuXG4gICAgaWYgKCFmaWxlTmFtZVdpdGhvdXRFeHQpXG4gICAgICBmaWxlTmFtZVdpdGhvdXRFeHQgPSAnbW9kdWxlLXJlc29sdmUuc2VydmVyJztcbiAgICBfLnVuaXEoW1xuICAgICAgUGF0aC5yZXNvbHZlKGdldFJvb3REaXIoKSwgZmlsZU5hbWVXaXRob3V0RXh0KSxcbiAgICAgIFBhdGgucmVzb2x2ZShnZXRXb3JrRGlyKCksIGZpbGVOYW1lV2l0aG91dEV4dClcbiAgICBdKS5mb3JFYWNoKGZpbGUgPT4ge1xuICAgICAgY29uc3QgZmlsZTEgPSBmcy5leGlzdHNTeW5jKGZpbGUgKyAnLnRzJykgPyBmaWxlICsgJy50cycgOiBmaWxlICsgJy5qcyc7XG4gICAgICBpZiAoZnMuZXhpc3RzU3luYyhmaWxlMSkpIHtcbiAgICAgICAgbG9nLmRlYnVnKCdleGVjdXRlIGludGVybmFsICcgKyBmaWxlMSk7XG4gICAgICAgIGxldCBleHBvcnRlZCA9IHJlcXVpcmUoZmlsZTEpO1xuICAgICAgICBpZiAoZXhwb3J0ZWQuZGVmYXVsdClcbiAgICAgICAgICBleHBvcnRlZCA9IGV4cG9ydGVkLmRlZmF1bHQ7XG4gICAgICAgIGV4cG9ydGVkKHRoaXMpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgbG9nLmRlYnVnKGZpbGUxICsgJyBkb2VzblxcJ3QgZXhpc3QsIHNraXAgaXQuJyk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gZG9JbmplY3RvckNvbmZpZ1N5bmModGhpcywgIXRoaXMubm9Ob2RlKTtcbiAgfVxufVxuXG5leHBvcnQgbGV0IG5vZGVJbmplY3RvciA9IG5ldyBEclBhY2thZ2VJbmplY3RvcihmYWxzZSk7XG5cbmV4cG9ydCBsZXQgd2ViSW5qZWN0b3IgPSBuZXcgRHJQYWNrYWdlSW5qZWN0b3IodHJ1ZSk7XG5cbmV4cG9ydCBpbnRlcmZhY2UgSW5qZWN0b3JDb25maWdIYW5kbGVyIHtcbiAgLyoqIEZvciBDbGllbnQgZnJhbWV3b3JrIGJ1aWxkIHRvb2wgKFJlYWN0LCBBbmd1bGFyKSwgcmVwbGFjZSBtb2R1bGUgaW4gXCJyZXF1aXJlKClcIiBvciBpbXBvcnQgc3ludGF4ICovXG4gIHNldHVwV2ViSW5qZWN0b3I/KGZhY3Rvcnk6IERyUGFja2FnZUluamVjdG9yLCBhbGxTZXR0aW5nOiBQbGlua1NldHRpbmdzKTogdm9pZDtcbiAgLyoqIEZvciBOb2RlLmpzIHJ1bnRpbWUsIHJlcGxhY2UgbW9kdWxlIGluIFwicmVxdWlyZSgpXCIgb3IgaW1wb3J0IHN5bnRheCAqL1xuICBzZXR1cE5vZGVJbmplY3Rvcj8oZmFjdG9yeTogRHJQYWNrYWdlSW5qZWN0b3IsIGFsbFNldHRpbmc6IFBsaW5rU2V0dGluZ3MpOiB2b2lkO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZG9JbmplY3RvckNvbmZpZ1N5bmMoZmFjdG9yeTogRHJQYWNrYWdlSW5qZWN0b3IsIGlzTm9kZSA9IGZhbHNlKSB7XG4gIGNvbnN0IGNvbmZpZzogdHlwZW9mIF9jb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZycpLmRlZmF1bHQ7XG4gIGNvbmZpZy5jb25maWdIYW5kbGVyTWdyQ2hhbmdlZChoYW5kbGVyID0+IHtcbiAgICBoYW5kbGVyLnJ1bkVhY2hTeW5jPEluamVjdG9yQ29uZmlnSGFuZGxlcj4oKF9maWxlOiBzdHJpbmcsIF9sYXN0UmVzdWx0OiBhbnksIGhhbmRsZXIpID0+IHtcbiAgICAgIGlmIChpc05vZGUgJiYgaGFuZGxlci5zZXR1cE5vZGVJbmplY3RvcilcbiAgICAgICAgaGFuZGxlci5zZXR1cE5vZGVJbmplY3RvcihmYWN0b3J5LCBjb25maWcoKSk7XG4gICAgICBlbHNlIGlmICghaXNOb2RlICYmIGhhbmRsZXIuc2V0dXBXZWJJbmplY3RvcilcbiAgICAgICAgaGFuZGxlci5zZXR1cFdlYkluamVjdG9yKGZhY3RvcnksIGNvbmZpZygpKTtcbiAgICB9LCAnSW5qZWN0b3IgY29uZmlndXJhdGlvbiBmb3IgJyArIChpc05vZGUgPyAnTm9kZS5qcyBydW50aW1lJyA6ICdjbGllbnQgc2lkZSBidWlsZCB0b29sJykpO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gZW1wdHJ5Q2hhaW5hYmxlRnVuY3Rpb24oKSB7XG4gIHJldHVybiBlbXB0eUZhY3RvcnlNYXA7XG59XG5cbi8qKiBAZGVwcmVjYXRlZCAqL1xuZXhwb3J0IGZ1bmN0aW9uIGRvSW5qZWN0b3JDb25maWcoZmFjdG9yeTogRHJQYWNrYWdlSW5qZWN0b3IsIGlzTm9kZSA9IGZhbHNlKSB7XG4gIGNvbnN0IGNvbmZpZzogdHlwZW9mIF9jb25maWcgPSByZXF1aXJlKCcuL2NvbmZpZycpLmRlZmF1bHQ7XG4gIGNvbmZpZy5jb25maWdIYW5kbGVyTWdyQ2hhbmdlZChoYW5kbGVyID0+IHtcbiAgICB2b2lkIGhhbmRsZXIucnVuRWFjaDxJbmplY3RvckNvbmZpZ0hhbmRsZXI+KChfZmlsZTogc3RyaW5nLCBfbGFzdFJlc3VsdDogYW55LCBoYW5kbGVyKSA9PiB7XG4gICAgICBpZiAoaXNOb2RlICYmIGhhbmRsZXIuc2V0dXBOb2RlSW5qZWN0b3IpXG4gICAgICAgIGhhbmRsZXIuc2V0dXBOb2RlSW5qZWN0b3IoZmFjdG9yeSwgY29uZmlnKCkpO1xuICAgICAgZWxzZSBpZiAoIWlzTm9kZSAmJiBoYW5kbGVyLnNldHVwV2ViSW5qZWN0b3IpXG4gICAgICAgIGhhbmRsZXIuc2V0dXBXZWJJbmplY3RvcihmYWN0b3J5LCBjb25maWcoKSk7XG4gICAgfSwgJ0luamVjdG9yIGNvbmZpZ3VyYXRpb24gZm9yICcgKyAoaXNOb2RlID8gJ05vZGUuanMgcnVudGltZScgOiAnY2xpZW50IHNpZGUgYnVpbGQgdG9vbCcpKTtcbiAgfSk7XG59XG4iXX0=