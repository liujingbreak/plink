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
// nodeInjector.fromRoot().factory('log4js', file => {
//   return log4js;
// }); // .alias('log4js', '@wfh/plink/wfh/dist/logger');
exports.webInjector = new DrPackageInjector(undefined, true);
function emptryChainableFunction() {
    return emptyFactoryMap;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5qZWN0b3ItZmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2luamVjdG9yLWZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHdFQUFvRDtBQUNwRCwyREFBeUQ7QUFDekQsbUVBQXlGO0FBQ3pGLG1FQUFtRTtBQUNuRSwwQ0FBNEI7QUFDNUIsdUNBQXlCO0FBQ3pCLDJDQUE2QjtBQUM3QixvREFBNEI7QUFDNUIsdUNBQXdDO0FBQ3hDLE1BQU0sR0FBRyxHQUFHLGdCQUFNLENBQUMsU0FBUyxDQUFDLHFCQUFxQixDQUFDLENBQUM7QUFFcEQsTUFBTSxrQkFBa0IsR0FBNkIsRUFBRSxDQUFDO0FBRXhELE1BQU0sZUFBZSxHQUFHO0lBQ3RCLE9BQU8sRUFBRSx1QkFBdUI7SUFDaEMsVUFBVSxFQUFFLHVCQUF1QjtJQUNuQyxLQUFLLEVBQUUsdUJBQXVCO0lBQzlCLEtBQUssRUFBRSx1QkFBdUI7Q0FDL0IsQ0FBQztBQUVGLE1BQWEsaUJBQWtCLFNBQVEsMEJBQUU7SUFDdkMsWUFBWSxPQUFrQyxFQUFZLFNBQVMsS0FBSztRQUN0RSxLQUFLLENBQUM7WUFDSixPQUFPLEVBQUUsaUJBQVUsRUFBRTtZQUNyQixPQUFPO1lBQ1AseUJBQXlCO1lBQ3pCLE1BQU07U0FDUCxDQUFDLENBQUM7UUFOcUQsV0FBTSxHQUFOLE1BQU0sQ0FBUTtJQU94RSxDQUFDO0lBRUQsVUFBVSxDQUFDLElBQVksRUFBRSxHQUFXO1FBQ2xDLEdBQUcsQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztRQUNsQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLENBQUM7SUFDakMsQ0FBQztJQUVELGFBQWEsQ0FBQyxJQUF1QixFQUFFLEdBQXVCO1FBQzVELE1BQU0sS0FBSyxHQUFJLEVBQWUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7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Q0FBQyxLQUFLLEdBQUcsMkJBQTJCLENBQUMsQ0FBQzthQUMvQztRQUNILENBQUMsQ0FBQyxDQUFDO1FBRUgsT0FBTyx3Q0FBb0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7SUFDbEQsQ0FBQztDQUdGO0FBNUVELDhDQTRFQztBQUVVLFFBQUEsWUFBWSxHQUFHLElBQUksaUJBQWlCLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQztBQUN4RSx5Q0FBeUM7QUFDekM7O0dBRUc7QUFDSCxzREFBc0Q7QUFDdEQsbUJBQW1CO0FBQ25CLHlEQUF5RDtBQUU5QyxRQUFBLFdBQVcsR0FBRyxJQUFJLGlCQUFpQixDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQztBQUdoRSxTQUFTLHVCQUF1QjtJQUM5QixPQUFPLGVBQWUsQ0FBQztBQUN6QixDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IFJKLCB7SW5qZWN0b3JPcHRpb259IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3InO1xuaW1wb3J0IHtkb0luamVjdG9yQ29uZmlnU3luY30gZnJvbSAnLi9yZXF1aXJlLWluamVjdG9ycyc7XG5pbXBvcnQge0ZhY3RvcnlNYXBDb2xsZWN0aW9uLCBGYWN0b3J5TWFwSW50ZXJmfSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3QvZmFjdG9yeS1tYXAnO1xuLy8gaW1wb3J0IHtSZXNvbHZlT3B0aW9ufSBmcm9tICdyZXF1aXJlLWluamVjdG9yL2Rpc3Qvbm9kZS1pbmplY3QnO1xuaW1wb3J0ICogYXMgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCB7Z2V0Um9vdERpcn0gZnJvbSAnLi91dGlscy9taXNjJztcbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3dmaC5pbmplY3RvckZhY3RvcnknKTtcblxuY29uc3QgcGFja2FnZU5hbWVQYXRoTWFwOiB7W25hbWU6IHN0cmluZ106IHN0cmluZ30gPSB7fTtcblxuY29uc3QgZW1wdHlGYWN0b3J5TWFwID0ge1xuICBmYWN0b3J5OiBlbXB0cnlDaGFpbmFibGVGdW5jdGlvbixcbiAgc3Vic3RpdHV0ZTogZW1wdHJ5Q2hhaW5hYmxlRnVuY3Rpb24sXG4gIHZhbHVlOiBlbXB0cnlDaGFpbmFibGVGdW5jdGlvbixcbiAgYWxpYXM6IGVtcHRyeUNoYWluYWJsZUZ1bmN0aW9uXG59O1xuXG5leHBvcnQgY2xhc3MgRHJQYWNrYWdlSW5qZWN0b3IgZXh0ZW5kcyBSSiB7XG4gIGNvbnN0cnVjdG9yKHJlc29sdmU6IEluamVjdG9yT3B0aW9uWydyZXNvbHZlJ10sIHByb3RlY3RlZCBub05vZGUgPSBmYWxzZSkge1xuICAgIHN1cGVyKHtcbiAgICAgIGJhc2VkaXI6IGdldFJvb3REaXIoKSxcbiAgICAgIHJlc29sdmUsXG4gICAgICAvLyBkZWJ1ZzogY29uZmlnLmRldk1vZGUsXG4gICAgICBub05vZGVcbiAgICB9KTtcbiAgfVxuXG4gIGFkZFBhY2thZ2UobmFtZTogc3RyaW5nLCBkaXI6IHN0cmluZykge1xuICAgIGxvZy5kZWJ1ZygnYWRkICVzICVzJywgbmFtZSwgZGlyKTtcbiAgICBwYWNrYWdlTmFtZVBhdGhNYXBbbmFtZV0gPSBkaXI7XG4gIH1cblxuICBmcm9tQ29tcG9uZW50KG5hbWU6IHN0cmluZyB8IHN0cmluZ1tdLCBkaXI/OiBzdHJpbmcgfCBzdHJpbmdbXSkge1xuICAgIGNvbnN0IG5hbWVzID0gKFtdIGFzIHN0cmluZ1tdKS5jb25jYXQobmFtZSk7XG4gICAgaWYgKGRpcikge1xuICAgICAgY29uc3QgZGlycyA9IChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KGRpcik7XG4gICAgICBsZXQgaSA9IDA7XG4gICAgICBpZiAobmFtZXMubGVuZ3RoICE9PSBkaXJzLmxlbmd0aClcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdmcm9tQ29tcG9uZW50KG5hbWUsIGRpcilcXCdzIGJlIGNhbGxlZCB3aXRoIDIgQXJyYXkgb2Ygc2FtZSBsZW5ndGgnKTtcbiAgICAgIGZvciAoY29uc3Qgbm0gb2YgbmFtZXMgYXMgc3RyaW5nW10pIHtcbiAgICAgICAgdGhpcy5hZGRQYWNrYWdlKG5tLCBkaXJzW2krK10pO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBmYWN0b3J5TWFwczogRmFjdG9yeU1hcEludGVyZltdID0gW107XG4gICAgZm9yIChjb25zdCBubSBvZiBuYW1lcykge1xuICAgICAgaWYgKF8uaGFzKHBhY2thZ2VOYW1lUGF0aE1hcCwgbm0pKSB7XG4gICAgICAgIGZhY3RvcnlNYXBzLnB1c2goc3VwZXIuZnJvbURpcihwYWNrYWdlTmFtZVBhdGhNYXBbbm1dKSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmYWN0b3J5TWFwcy5wdXNoKHN1cGVyLmZyb21QYWNrYWdlKG5tKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZXcgRmFjdG9yeU1hcENvbGxlY3Rpb24oZmFjdG9yeU1hcHMpO1xuICB9XG5cbiAgZnJvbUFsbENvbXBvbmVudHMoKSB7XG4gICAgcmV0dXJuIHN1cGVyLmZyb21EaXIoXy52YWx1ZXMocGFja2FnZU5hbWVQYXRoTWFwKSk7XG4gIH1cblxuICBmcm9tQWxsUGFja2FnZXMoKSB7XG4gICAgcmV0dXJuIHRoaXMuZnJvbUFsbENvbXBvbmVudHMoKTtcbiAgfVxuXG4gIG5vdEZyb21QYWNrYWdlcyguLi5leGNsdWRlUGFja2FnZXM6IHN0cmluZ1tdKSB7XG4gICAgY29uc3QgbmFtZXMgPSBfLmRpZmZlcmVuY2UoXy5rZXlzKHBhY2thZ2VOYW1lUGF0aE1hcCksIGV4Y2x1ZGVQYWNrYWdlcyk7XG4gICAgY29uc3QgZGlycyA9IG5hbWVzLm1hcChwa05hbWUgPT4gcGFja2FnZU5hbWVQYXRoTWFwW3BrTmFtZV0pO1xuICAgIGxvZy5kZWJ1ZygnZnJvbSAnICsgZGlycyk7XG4gICAgcmV0dXJuIHN1cGVyLmZyb21EaXIoZGlycyk7XG4gIH1cblxuICByZWFkSW5qZWN0RmlsZShmaWxlTmFtZVdpdGhvdXRFeHQ/OiBzdHJpbmcpIHtcblxuICAgIGlmICghZmlsZU5hbWVXaXRob3V0RXh0KVxuICAgICAgZmlsZU5hbWVXaXRob3V0RXh0ID0gJ21vZHVsZS1yZXNvbHZlLnNlcnZlcic7XG4gICAgXy51bmlxKFtcbiAgICAgIFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIGZpbGVOYW1lV2l0aG91dEV4dCksXG4gICAgICBQYXRoLnJlc29sdmUocHJvY2Vzcy5jd2QoKSwgZmlsZU5hbWVXaXRob3V0RXh0KVxuICAgIF0pLmZvckVhY2goZmlsZSA9PiB7XG4gICAgICBjb25zdCBmaWxlMSA9IGZzLmV4aXN0c1N5bmMoZmlsZSArICcudHMnKSA/IGZpbGUgKyAnLnRzJyA6IGZpbGUgKyAnLmpzJztcbiAgICAgIGlmIChmcy5leGlzdHNTeW5jKGZpbGUxKSkge1xuICAgICAgICBsb2cuZGVidWcoJ2V4ZWN1dGUgaW50ZXJuYWwgJyArIGZpbGUxKTtcbiAgICAgICAgbGV0IGV4cG9ydGVkID0gcmVxdWlyZShmaWxlMSk7XG4gICAgICAgIGlmIChleHBvcnRlZC5kZWZhdWx0KVxuICAgICAgICAgIGV4cG9ydGVkID0gZXhwb3J0ZWQuZGVmYXVsdDtcbiAgICAgICAgZXhwb3J0ZWQodGhpcyk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBsb2cuaW5mbyhmaWxlMSArICcgZG9lc25cXCd0IGV4aXN0LCBza2lwIGl0LicpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGRvSW5qZWN0b3JDb25maWdTeW5jKHRoaXMsICF0aGlzLm5vTm9kZSk7XG4gIH1cblxuXG59XG5cbmV4cG9ydCBsZXQgbm9kZUluamVjdG9yID0gbmV3IERyUGFja2FnZUluamVjdG9yKHJlcXVpcmUucmVzb2x2ZSwgZmFsc2UpO1xuLy8gY29uc29sZS5sb2coJ35+fn5+fn5+fn5+fn5+fn5+fn5+fn5+Jylcbi8qKlxuICogQXZvaWQgcGFja2FnZSBsb2FkIGRpZmZlcmVudCBsb2c0anMgdGhhbiBQbGluaydzXG4gKi9cbi8vIG5vZGVJbmplY3Rvci5mcm9tUm9vdCgpLmZhY3RvcnkoJ2xvZzRqcycsIGZpbGUgPT4ge1xuLy8gICByZXR1cm4gbG9nNGpzO1xuLy8gfSk7IC8vIC5hbGlhcygnbG9nNGpzJywgJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvbG9nZ2VyJyk7XG5cbmV4cG9ydCBsZXQgd2ViSW5qZWN0b3IgPSBuZXcgRHJQYWNrYWdlSW5qZWN0b3IodW5kZWZpbmVkLCB0cnVlKTtcblxuXG5mdW5jdGlvbiBlbXB0cnlDaGFpbmFibGVGdW5jdGlvbigpIHtcbiAgcmV0dXJuIGVtcHR5RmFjdG9yeU1hcDtcbn1cbiJdfQ==