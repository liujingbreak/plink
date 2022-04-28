"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5qZWN0b3ItZmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL2luamVjdG9yLWZhY3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSx3RUFBa0M7QUFHbEMsbUVBQXlGO0FBQ3pGLDBDQUE0QjtBQUM1Qix1Q0FBeUI7QUFDekIsMkNBQTZCO0FBQzdCLG9EQUE0QjtBQUM1Qix1Q0FBb0Q7QUFDcEQsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsd0JBQXdCLENBQUMsQ0FBQztBQUV2RCxNQUFNLGtCQUFrQixHQUFHLElBQUksR0FBRyxFQUFpRCxDQUFDO0FBRXBGLE1BQU0sZUFBZSxHQUFHO0lBQ3RCLE9BQU8sRUFBRSx1QkFBdUI7SUFDaEMsVUFBVSxFQUFFLHVCQUF1QjtJQUNuQyxLQUFLLEVBQUUsdUJBQXVCO0lBQzlCLEtBQUssRUFBRSx1QkFBdUI7Q0FDL0IsQ0FBQztBQUVGLE1BQWEsaUJBQWtCLFNBQVEsMEJBQUU7SUFDdkMsWUFBc0IsU0FBUyxLQUFLO1FBQ2xDLEtBQUssQ0FBQztZQUNKLE9BQU8sRUFBRSxJQUFBLGlCQUFVLEdBQUU7WUFDckIseUJBQXlCO1lBQ3pCLE1BQU07U0FDUCxDQUFDLENBQUM7UUFMaUIsV0FBTSxHQUFOLE1BQU0sQ0FBUTtJQU1wQyxDQUFDO0lBRUQsVUFBVSxDQUFDLElBQVksRUFBRSxHQUFXLEVBQUUsVUFBbUI7UUFDdkQsR0FBRyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2xDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsRUFBQyxPQUFPLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUMsQ0FBQyxDQUFDO0lBQ3JFLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxJQUF1QixFQUFFLEdBQXVCO1FBQy9ELE1BQU0sS0FBSyxHQUFJ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QUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQztJQUM5RixDQUFDLENBQUMsQ0FBQztBQUNMLENBQUM7QUFWRCw0Q0FVQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBSSiBmcm9tICdyZXF1aXJlLWluamVjdG9yJztcbmltcG9ydCBfY29uZmlnIGZyb20gJy4vY29uZmlnJztcbmltcG9ydCB7UGxpbmtTZXR0aW5nc30gZnJvbSAnLi9jb25maWcvY29uZmlnLXNsaWNlJztcbmltcG9ydCB7RmFjdG9yeU1hcENvbGxlY3Rpb24sIEZhY3RvcnlNYXBJbnRlcmZ9IGZyb20gJ3JlcXVpcmUtaW5qZWN0b3IvZGlzdC9mYWN0b3J5LW1hcCc7XG5pbXBvcnQgKiBhcyBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGxvZzRqcyBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtnZXRSb290RGlyLCBnZXRXb3JrRGlyfSBmcm9tICcuL3V0aWxzL21pc2MnO1xuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcigncGxpbmsuaW5qZWN0b3ItZmFjdG9yeScpO1xuXG5jb25zdCBwYWNrYWdlTmFtZVBhdGhNYXAgPSBuZXcgTWFwPHN0cmluZywge3N5bWxpbms/OiBzdHJpbmc7IHJlYWxQYXRoOiBzdHJpbmc7fT4oKTtcblxuY29uc3QgZW1wdHlGYWN0b3J5TWFwID0ge1xuICBmYWN0b3J5OiBlbXB0cnlDaGFpbmFibGVGdW5jdGlvbixcbiAgc3Vic3RpdHV0ZTogZW1wdHJ5Q2hhaW5hYmxlRnVuY3Rpb24sXG4gIHZhbHVlOiBlbXB0cnlDaGFpbmFibGVGdW5jdGlvbixcbiAgYWxpYXM6IGVtcHRyeUNoYWluYWJsZUZ1bmN0aW9uXG59O1xuXG5leHBvcnQgY2xhc3MgRHJQYWNrYWdlSW5qZWN0b3IgZXh0ZW5kcyBSSiB7XG4gIGNvbnN0cnVjdG9yKHByb3RlY3RlZCBub05vZGUgPSBmYWxzZSkge1xuICAgIHN1cGVyKHtcbiAgICAgIGJhc2VkaXI6IGdldFJvb3REaXIoKSxcbiAgICAgIC8vIGRlYnVnOiBjb25maWcuZGV2TW9kZSxcbiAgICAgIG5vTm9kZVxuICAgIH0pO1xuICB9XG5cbiAgYWRkUGFja2FnZShuYW1lOiBzdHJpbmcsIGRpcjogc3RyaW5nLCBzeW1saW5rRGlyPzogc3RyaW5nKSB7XG4gICAgbG9nLmRlYnVnKCdhZGQgJXMgJXMnLCBuYW1lLCBkaXIpO1xuICAgIHBhY2thZ2VOYW1lUGF0aE1hcC5zZXQobmFtZSwge3N5bWxpbms6IHN5bWxpbmtEaXIsIHJlYWxQYXRoOiBkaXJ9KTtcbiAgfVxuXG4gIGZyb21QbGlua1BhY2thZ2UobmFtZTogc3RyaW5nIHwgc3RyaW5nW10sIGRpcj86IHN0cmluZyB8IHN0cmluZ1tdKSB7XG4gICAgY29uc3QgbmFtZXMgPSAoW10gYXMgc3RyaW5nW10pLmNvbmNhdChuYW1lKTtcbiAgICBpZiAoZGlyKSB7XG4gICAgICBjb25zdCBkaXJzID0gKFtdIGFzIHN0cmluZ1tdKS5jb25jYXQoZGlyKTtcbiAgICAgIGxldCBpID0gMDtcbiAgICAgIGlmIChuYW1lcy5sZW5ndGggIT09IGRpcnMubGVuZ3RoKVxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ2Zyb21Db21wb25lbnQobmFtZSwgZGlyKVxcJ3MgYmUgY2FsbGVkIHdpdGggMiBBcnJheSBvZiBzYW1lIGxlbmd0aCcpO1xuICAgICAgZm9yIChjb25zdCBubSBvZiBuYW1lcyApIHtcbiAgICAgICAgdGhpcy5hZGRQYWNrYWdlKG5tLCBkaXJzW2krK10pO1xuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBmYWN0b3J5TWFwczogRmFjdG9yeU1hcEludGVyZltdID0gW107XG4gICAgZm9yIChjb25zdCBubSBvZiBuYW1lcykge1xuICAgICAgY29uc3QgcGF0aHMgPSBwYWNrYWdlTmFtZVBhdGhNYXAuZ2V0KG5tKTtcbiAgICAgIGlmIChwYXRocykge1xuICAgICAgICBmYWN0b3J5TWFwcy5wdXNoKHN1cGVyLmZyb21EaXIocGF0aHMucmVhbFBhdGgpKTtcbiAgICAgICAgaWYgKHBhdGhzLnN5bWxpbmspIHtcbiAgICAgICAgICBmYWN0b3J5TWFwcy5wdXNoKHN1cGVyLmZyb21EaXIocGF0aHMuc3ltbGluaykpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmYWN0b3J5TWFwcy5wdXNoKHN1cGVyLmZyb21QYWNrYWdlKG5tKSk7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBuZXcgRmFjdG9yeU1hcENvbGxlY3Rpb24oZmFjdG9yeU1hcHMpO1xuICB9XG5cbiAgZnJvbUFsbENvbXBvbmVudHMoKSB7XG4gICAgY29uc3QgcmVhbHBhdGhzID0gQXJyYXkuZnJvbShwYWNrYWdlTmFtZVBhdGhNYXAudmFsdWVzKCkpXG4gICAgICAubWFwKGl0ZW0gPT4gaXRlbS5yZWFsUGF0aCk7XG4gICAgY29uc3Qgc3ltbGlua3MgPSBBcnJheS5mcm9tKHBhY2thZ2VOYW1lUGF0aE1hcC52YWx1ZXMoKSlcbiAgICAubWFwKGl0ZW0gPT4gaXRlbS5zeW1saW5rKS5maWx0ZXIoZGlyID0+IGRpciAhPSBudWxsKTtcbiAgICByZXR1cm4gc3VwZXIuZnJvbURpcihyZWFscGF0aHMuY29uY2F0KHN5bWxpbmtzIGFzIHN0cmluZ1tdKSk7XG4gIH1cblxuICBmcm9tQWxsUGFja2FnZXMoKSB7XG4gICAgcmV0dXJuIHRoaXMuZnJvbUFsbENvbXBvbmVudHMoKTtcbiAgfVxuXG4gIG5vdEZyb21QYWNrYWdlcyguLi5leGNsdWRlUGFja2FnZXM6IHN0cmluZ1tdKSB7XG4gICAgY29uc3QgbmFtZXMgPSBfLmRpZmZlcmVuY2UoXy5rZXlzKHBhY2thZ2VOYW1lUGF0aE1hcCksIGV4Y2x1ZGVQYWNrYWdlcyk7XG4gICAgY29uc3QgZGlycyA9IG5hbWVzLm1hcChwa05hbWUgPT4gcGFja2FnZU5hbWVQYXRoTWFwW3BrTmFtZV0pO1xuICAgIGxvZy5kZWJ1ZygnZnJvbSAnICsgZGlycyk7XG4gICAgcmV0dXJuIHN1cGVyLmZyb21EaXIoZGlycyk7XG4gIH1cblxuICByZWFkSW5qZWN0RmlsZShmaWxlTmFtZVdpdGhvdXRFeHQ/OiBzdHJpbmcpIHtcblxuICAgIGlmICghZmlsZU5hbWVXaXRob3V0RXh0KVxuICAgICAgZmlsZU5hbWVXaXRob3V0RXh0ID0gJ21vZHVsZS1yZXNvbHZlLnNlcnZlcic7XG4gICAgXy51bmlxKFtcbiAgICAgIFBhdGgucmVzb2x2ZShnZXRSb290RGlyKCksIGZpbGVOYW1lV2l0aG91dEV4dCksXG4gICAgICBQYXRoLnJlc29sdmUoZ2V0V29ya0RpcigpLCBmaWxlTmFtZVdpdGhvdXRFeHQpXG4gICAgXSkuZm9yRWFjaChmaWxlID0+IHtcbiAgICAgIGNvbnN0IGZpbGUxID0gZnMuZXhpc3RzU3luYyhmaWxlICsgJy50cycpID8gZmlsZSArICcudHMnIDogZmlsZSArICcuanMnO1xuICAgICAgaWYgKGZzLmV4aXN0c1N5bmMoZmlsZTEpKSB7XG4gICAgICAgIGxvZy5kZWJ1ZygnZXhlY3V0ZSBpbnRlcm5hbCAnICsgZmlsZTEpO1xuICAgICAgICBsZXQgZXhwb3J0ZWQgPSByZXF1aXJlKGZpbGUxKTtcbiAgICAgICAgaWYgKGV4cG9ydGVkLmRlZmF1bHQpXG4gICAgICAgICAgZXhwb3J0ZWQgPSBleHBvcnRlZC5kZWZhdWx0O1xuICAgICAgICBleHBvcnRlZCh0aGlzKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGxvZy5kZWJ1ZyhmaWxlMSArICcgZG9lc25cXCd0IGV4aXN0LCBza2lwIGl0LicpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGRvSW5qZWN0b3JDb25maWdTeW5jKHRoaXMsICF0aGlzLm5vTm9kZSk7XG4gIH1cbn1cblxuZXhwb3J0IGxldCBub2RlSW5qZWN0b3IgPSBuZXcgRHJQYWNrYWdlSW5qZWN0b3IoZmFsc2UpO1xuXG5leHBvcnQgbGV0IHdlYkluamVjdG9yID0gbmV3IERyUGFja2FnZUluamVjdG9yKHRydWUpO1xuXG5leHBvcnQgaW50ZXJmYWNlIEluamVjdG9yQ29uZmlnSGFuZGxlciB7XG4gIC8qKiBGb3IgQ2xpZW50IGZyYW1ld29yayBidWlsZCB0b29sIChSZWFjdCwgQW5ndWxhciksIHJlcGxhY2UgbW9kdWxlIGluIFwicmVxdWlyZSgpXCIgb3IgaW1wb3J0IHN5bnRheCAqL1xuICBzZXR1cFdlYkluamVjdG9yPyhmYWN0b3J5OiBEclBhY2thZ2VJbmplY3RvciwgYWxsU2V0dGluZzogUGxpbmtTZXR0aW5ncyk6IHZvaWQ7XG4gIC8qKiBGb3IgTm9kZS5qcyBydW50aW1lLCByZXBsYWNlIG1vZHVsZSBpbiBcInJlcXVpcmUoKVwiIG9yIGltcG9ydCBzeW50YXggKi9cbiAgc2V0dXBOb2RlSW5qZWN0b3I/KGZhY3Rvcnk6IERyUGFja2FnZUluamVjdG9yLCBhbGxTZXR0aW5nOiBQbGlua1NldHRpbmdzKTogdm9pZDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRvSW5qZWN0b3JDb25maWdTeW5jKGZhY3Rvcnk6IERyUGFja2FnZUluamVjdG9yLCBpc05vZGUgPSBmYWxzZSkge1xuICBjb25zdCBjb25maWc6IHR5cGVvZiBfY29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcnKS5kZWZhdWx0O1xuICBjb25maWcuY29uZmlnSGFuZGxlck1nckNoYW5nZWQoaGFuZGxlciA9PiB7XG4gICAgaGFuZGxlci5ydW5FYWNoU3luYzxJbmplY3RvckNvbmZpZ0hhbmRsZXI+KChfZmlsZTogc3RyaW5nLCBfbGFzdFJlc3VsdDogYW55LCBoYW5kbGVyKSA9PiB7XG4gICAgICBpZiAoaXNOb2RlICYmIGhhbmRsZXIuc2V0dXBOb2RlSW5qZWN0b3IpXG4gICAgICAgIGhhbmRsZXIuc2V0dXBOb2RlSW5qZWN0b3IoZmFjdG9yeSwgY29uZmlnKCkpO1xuICAgICAgZWxzZSBpZiAoIWlzTm9kZSAmJiBoYW5kbGVyLnNldHVwV2ViSW5qZWN0b3IpXG4gICAgICAgIGhhbmRsZXIuc2V0dXBXZWJJbmplY3RvcihmYWN0b3J5LCBjb25maWcoKSk7XG4gICAgfSwgJ0luamVjdG9yIGNvbmZpZ3VyYXRpb24gZm9yICcgKyAoaXNOb2RlID8gJ05vZGUuanMgcnVudGltZScgOiAnY2xpZW50IHNpZGUgYnVpbGQgdG9vbCcpKTtcbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGVtcHRyeUNoYWluYWJsZUZ1bmN0aW9uKCkge1xuICByZXR1cm4gZW1wdHlGYWN0b3J5TWFwO1xufVxuXG4vKiogQGRlcHJlY2F0ZWQgKi9cbmV4cG9ydCBmdW5jdGlvbiBkb0luamVjdG9yQ29uZmlnKGZhY3Rvcnk6IERyUGFja2FnZUluamVjdG9yLCBpc05vZGUgPSBmYWxzZSkge1xuICBjb25zdCBjb25maWc6IHR5cGVvZiBfY29uZmlnID0gcmVxdWlyZSgnLi9jb25maWcnKS5kZWZhdWx0O1xuICBjb25maWcuY29uZmlnSGFuZGxlck1nckNoYW5nZWQoaGFuZGxlciA9PiB7XG4gICAgdm9pZCBoYW5kbGVyLnJ1bkVhY2g8SW5qZWN0b3JDb25maWdIYW5kbGVyPigoX2ZpbGU6IHN0cmluZywgX2xhc3RSZXN1bHQ6IGFueSwgaGFuZGxlcikgPT4ge1xuICAgICAgaWYgKGlzTm9kZSAmJiBoYW5kbGVyLnNldHVwTm9kZUluamVjdG9yKVxuICAgICAgICBoYW5kbGVyLnNldHVwTm9kZUluamVjdG9yKGZhY3RvcnksIGNvbmZpZygpKTtcbiAgICAgIGVsc2UgaWYgKCFpc05vZGUgJiYgaGFuZGxlci5zZXR1cFdlYkluamVjdG9yKVxuICAgICAgICBoYW5kbGVyLnNldHVwV2ViSW5qZWN0b3IoZmFjdG9yeSwgY29uZmlnKCkpO1xuICAgIH0sICdJbmplY3RvciBjb25maWd1cmF0aW9uIGZvciAnICsgKGlzTm9kZSA/ICdOb2RlLmpzIHJ1bnRpbWUnIDogJ2NsaWVudCBzaWRlIGJ1aWxkIHRvb2wnKSk7XG4gIH0pO1xufVxuIl19