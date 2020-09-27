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
    if (mod != null) for (var k in mod) if (k !== "default" && Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.typeRootsFromPackages = exports.packages4Workspace = exports.packages4WorkspaceKey = exports.allPackages = exports.findPackageByType = exports.findPackageJsonPath = exports.findAllPackages = exports.lookForPackages = exports.createLazyPackageFileFinder = void 0;
const lru_cache_1 = __importDefault(require("lru-cache"));
const lazy_package_factory_1 = __importDefault(require("./build-util/ts/lazy-package-factory"));
const package_mgr_1 = require("./package-mgr");
const Path = __importStar(require("path"));
const lodash_1 = __importDefault(require("lodash"));
const log4js_1 = __importDefault(require("log4js"));
const fs = __importStar(require("fs"));
const utils_1 = require("./cmd/utils");
Object.defineProperty(exports, "findPackageJsonPath", { enumerable: true, get: function () { return utils_1.lookupPackageJson; } });
const log = log4js_1.default.getLogger('wfh.package-utils');
const lazyPackageFactory = new lazy_package_factory_1.default(allPackages());
function createLazyPackageFileFinder() {
    const cache = new lru_cache_1.default({ max: 20, maxAge: 20000 });
    return function (file) {
        let found = cache.get(file);
        if (!found) {
            found = lazyPackageFactory.getPackageByPath(file);
            if (found)
                cache.set(file, found);
        }
        return found;
    };
}
exports.createLazyPackageFileFinder = createLazyPackageFileFinder;
function lookForPackages(packageList, cb) {
    for (const pkg of utils_1.findPackagesByNames(package_mgr_1.getState(), Array.isArray(packageList) ? packageList : [packageList])) {
        if (pkg == null)
            continue;
        cb(pkg.name, pkg.path, { name: pkg.shortName, scope: pkg.scope }, pkg.json, pkg.realPath, pkg.isInstalled);
    }
}
exports.lookForPackages = lookForPackages;
function findAllPackages(packageList, callback, recipeType, projectDir) {
    // oldPu.findAllPackages.apply(oldPu, arguments);
    if (lodash_1.default.isFunction(callback) && packageList) {
        lookForPackages([].concat(packageList), callback);
        return;
    }
    else if (lodash_1.default.isFunction(packageList)) {
        // arguments.length <= 2
        projectDir = recipeType;
        recipeType = callback;
        callback = packageList;
    }
    return findPackageByType('*', callback, recipeType, projectDir);
}
exports.findAllPackages = findAllPackages;
function findPackageByType(_types, callback, recipeType, projectDir) {
    const arr = Array.isArray(projectDir) ? projectDir : projectDir == null ? projectDir : [projectDir];
    for (const pkg of allPackages(_types, recipeType, arr)) {
        callback(pkg.name, pkg.path, { scope: pkg.scope, name: pkg.shortName }, pkg.json, pkg.realPath, pkg.isInstalled);
    }
}
exports.findPackageByType = findPackageByType;
/** Including installed package from all workspaces, unlike packages4CurrentWorkspace() which only include
 * linked and installed
 * packages that are depended in current workspace package.json file
 */
function* allPackages(_types, recipeType, projectDirs) {
    // const wsKey = pathToWorkspace(process.cwd());
    if (recipeType !== 'installed') {
        if (projectDirs) {
            for (const projectDir of projectDirs) {
                const projKey = package_mgr_1.pathToProjKey(projectDir);
                const pkgNames = package_mgr_1.getState().project2Packages.get(projKey);
                if (pkgNames == null)
                    return;
                for (const pkgName of pkgNames) {
                    const pkg = package_mgr_1.getState().srcPackages.get(pkgName);
                    if (pkg) {
                        yield pkg;
                    }
                }
            }
        }
        else {
            for (const pkg of package_mgr_1.getState().srcPackages.values()) {
                yield pkg;
            }
        }
    }
    if (recipeType !== 'src') {
        for (const ws of package_mgr_1.getState().workspaces.values()) {
            const installed = ws.installedComponents;
            if (installed) {
                for (const comp of installed.values()) {
                    yield comp;
                }
            }
        }
    }
}
exports.allPackages = allPackages;
function* packages4WorkspaceKey(wsKey) {
    const ws = package_mgr_1.getState().workspaces.get(wsKey);
    if (!ws)
        return;
    const linked = package_mgr_1.getState().srcPackages;
    const installed = ws.installedComponents;
    for (const [pkName] of ws.linkedDependencies) {
        const pk = linked.get(pkName);
        if (pk == null)
            log.warn(`Missing package ${pkName} in workspace ${wsKey}`);
        else
            yield pk;
    }
    for (const [pkName] of ws.linkedDevDependencies) {
        const pk = linked.get(pkName);
        if (pk == null)
            log.warn(`Missing package ${pkName} in workspace ${wsKey}`);
        else
            yield pk;
    }
    if (installed) {
        for (const comp of installed.values()) {
            yield comp;
        }
    }
}
exports.packages4WorkspaceKey = packages4WorkspaceKey;
function packages4Workspace(workspaceDir) {
    const wsKey = package_mgr_1.workspaceKey(workspaceDir || process.cwd());
    return packages4WorkspaceKey(wsKey);
}
exports.packages4Workspace = packages4Workspace;
/**
 * Default type roots defined in packages, including linked and installed packages
 */
function* typeRootsFromPackages(wskey) {
    for (const pkg of packages4WorkspaceKey(wskey)) {
        const typeDir = Path.resolve(pkg.realPath, 'types');
        try {
            if (fs.statSync(typeDir).isDirectory()) {
                yield typeDir;
            }
        }
        catch (e) {
            continue;
        }
    }
}
exports.typeRootsFromPackages = typeRootsFromPackages;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS11dGlscy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3BhY2thZ2UtdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDBEQUE0QjtBQUU1QixnR0FBc0U7QUFDdEUsK0NBQWlGO0FBQ2pGLDJDQUE2QjtBQUM3QixvREFBdUI7QUFDdkIsb0RBQTRCO0FBQzVCLHVDQUF5QjtBQUN6Qix1Q0FBbUU7QUFrRXRDLG9HQWxFckIseUJBQWlCLE9Ba0V1QjtBQWhFaEQsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsbUJBQW1CLENBQUMsQ0FBQztBQUVsRCxNQUFNLGtCQUFrQixHQUFHLElBQUksOEJBQWtCLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztBQUVqRSxTQUFnQiwyQkFBMkI7SUFDekMsTUFBTSxLQUFLLEdBQUcsSUFBSSxtQkFBRyxDQUFpQyxFQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUM7SUFFaEYsT0FBTyxVQUFTLElBQVk7UUFDMUIsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1QixJQUFJLENBQUMsS0FBSyxFQUFFO1lBQ1YsS0FBSyxHQUFHLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBRSxDQUFDO1lBQ25ELElBQUksS0FBSztnQkFDUCxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztTQUMxQjtRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQVpELGtFQVlDO0FBVUQsU0FBZ0IsZUFBZSxDQUFDLFdBQThCLEVBQUUsRUFBaUI7SUFDL0UsS0FBSyxNQUFNLEdBQUcsSUFBSSwyQkFBbUIsQ0FBQyxzQkFBUSxFQUFFLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEVBQUU7UUFDM0csSUFBSSxHQUFHLElBQUksSUFBSTtZQUNiLFNBQVM7UUFDWCxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLEVBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxTQUFTLEVBQUUsS0FBSyxFQUFFLEdBQUcsQ0FBQyxLQUFLLEVBQUMsRUFBRSxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0tBQzFHO0FBQ0gsQ0FBQztBQU5ELDBDQU1DO0FBV0QsU0FBZ0IsZUFBZSxDQUFDLFdBQThDLEVBQzVFLFFBQThDLEVBQzlDLFVBQThCLEVBQzlCLFVBQThCO0lBQzlCLGlEQUFpRDtJQUVqRCxJQUFJLGdCQUFDLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLFdBQVcsRUFBRTtRQUN6QyxlQUFlLENBQUUsRUFBZSxDQUFDLE1BQU0sQ0FBQyxXQUFrQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFDdkYsT0FBTztLQUNSO1NBQU0sSUFBSSxnQkFBQyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsRUFBRTtRQUNwQyx3QkFBd0I7UUFDeEIsVUFBVSxHQUFHLFVBQVUsQ0FBQztRQUN4QixVQUFVLEdBQUcsUUFBK0IsQ0FBQztRQUM3QyxRQUFRLEdBQUcsV0FBVyxDQUFDO0tBQ3hCO0lBQ0QsT0FBTyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsUUFBeUIsRUFBRSxVQUFpQyxFQUN4RixVQUFVLENBQUMsQ0FBQztBQUNoQixDQUFDO0FBakJELDBDQWlCQztBQU1ELFNBQWdCLGlCQUFpQixDQUFDLE1BQW1DLEVBQ25FLFFBQXVCLEVBQUUsVUFBZ0MsRUFBRSxVQUE4QjtJQUV6RixNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUNwRyxLQUFLLE1BQU0sR0FBRyxJQUFJLFdBQVcsQ0FBQyxNQUFNLEVBQUUsVUFBVSxFQUFFLEdBQUcsQ0FBQyxFQUFFO1FBQ3RELFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsRUFBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLFNBQVMsRUFBQyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7S0FDaEg7QUFDSCxDQUFDO0FBUEQsOENBT0M7QUFFRDs7O0dBR0c7QUFDSCxRQUFlLENBQUMsQ0FBQyxXQUFXLENBQUMsTUFBb0MsRUFDL0QsVUFBZ0MsRUFBRSxXQUFzQjtJQUV4RCxnREFBZ0Q7SUFFaEQsSUFBSSxVQUFVLEtBQUssV0FBVyxFQUFFO1FBQzlCLElBQUksV0FBVyxFQUFFO1lBQ2YsS0FBSyxNQUFNLFVBQVUsSUFBSSxXQUFXLEVBQUU7Z0JBQ3BDLE1BQU0sT0FBTyxHQUFHLDJCQUFhLENBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQzFDLE1BQU0sUUFBUSxHQUFHLHNCQUFRLEVBQUUsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQzFELElBQUksUUFBUSxJQUFJLElBQUk7b0JBQ2xCLE9BQU87Z0JBQ1QsS0FBSyxNQUFNLE9BQU8sSUFBSSxRQUFRLEVBQUU7b0JBQzlCLE1BQU0sR0FBRyxHQUFHLHNCQUFRLEVBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUNoRCxJQUFJLEdBQUcsRUFBRTt3QkFDUCxNQUFNLEdBQUcsQ0FBQztxQkFDWDtpQkFDRjthQUNGO1NBQ0Y7YUFBTTtZQUNMLEtBQUssTUFBTSxHQUFHLElBQUksc0JBQVEsRUFBRSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsRUFBRTtnQkFDakQsTUFBTSxHQUFHLENBQUM7YUFDWDtTQUNGO0tBQ0Y7SUFDRCxJQUFJLFVBQVUsS0FBSyxLQUFLLEVBQUU7UUFDeEIsS0FBSyxNQUFNLEVBQUUsSUFBSSxzQkFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQy9DLE1BQU0sU0FBUyxHQUFHLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQztZQUN6QyxJQUFJLFNBQVMsRUFBRTtnQkFDYixLQUFLLE1BQU0sSUFBSSxJQUFJLFNBQVMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtvQkFDckMsTUFBTSxJQUFJLENBQUM7aUJBQ1o7YUFDRjtTQUNGO0tBQ0Y7QUFDSCxDQUFDO0FBbkNELGtDQW1DQztBQUVELFFBQWUsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLEtBQWE7SUFDbEQsTUFBTSxFQUFFLEdBQUcsc0JBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDNUMsSUFBSSxDQUFDLEVBQUU7UUFDTCxPQUFPO0lBRVQsTUFBTSxNQUFNLEdBQUcsc0JBQVEsRUFBRSxDQUFDLFdBQVcsQ0FBQztJQUN0QyxNQUFNLFNBQVMsR0FBRyxFQUFFLENBQUMsbUJBQW1CLENBQUM7SUFDekMsS0FBSyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLGtCQUFrQixFQUFFO1FBQzVDLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDOUIsSUFBSSxFQUFFLElBQUksSUFBSTtZQUNaLEdBQUcsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLE1BQU0saUJBQWlCLEtBQUssRUFBRSxDQUFDLENBQUM7O1lBRTVELE1BQU0sRUFBRSxDQUFDO0tBQ1o7SUFDRCxLQUFLLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMscUJBQXFCLEVBQUU7UUFDL0MsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM5QixJQUFJLEVBQUUsSUFBSSxJQUFJO1lBQ1osR0FBRyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsTUFBTSxpQkFBaUIsS0FBSyxFQUFFLENBQUMsQ0FBQzs7WUFFNUQsTUFBTSxFQUFFLENBQUM7S0FDWjtJQUNELElBQUksU0FBUyxFQUFFO1FBQ2IsS0FBSyxNQUFNLElBQUksSUFBSSxTQUFTLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDckMsTUFBTSxJQUFJLENBQUM7U0FDWjtLQUNGO0FBQ0gsQ0FBQztBQTFCRCxzREEwQkM7QUFFRCxTQUFnQixrQkFBa0IsQ0FBQyxZQUFxQjtJQUN0RCxNQUFNLEtBQUssR0FBRywwQkFBWSxDQUFDLFlBQVksSUFBSSxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztJQUMxRCxPQUFPLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3RDLENBQUM7QUFIRCxnREFHQztBQUVEOztHQUVHO0FBQ0gsUUFBZ0IsQ0FBQyxDQUFBLHFCQUFxQixDQUFDLEtBQWE7SUFDbEQsS0FBSyxNQUFNLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsRUFBRTtRQUM5QyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDcEQsSUFBSTtZQUNGLElBQUksRUFBRSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxXQUFXLEVBQUUsRUFBRTtnQkFDdEMsTUFBTSxPQUFPLENBQUM7YUFDZjtTQUNGO1FBQUMsT0FBTyxDQUFDLEVBQUU7WUFDVixTQUFTO1NBQ1Y7S0FDRjtBQUNILENBQUM7QUFYRCxzREFXQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBMUlUgZnJvbSAnbHJ1LWNhY2hlJztcbmltcG9ydCBQYWNrYWdlQnJvd3Nlckluc3RhbmNlIGZyb20gJy4vYnVpbGQtdXRpbC90cy9wYWNrYWdlLWluc3RhbmNlJztcbmltcG9ydCBMYXp5UGFja2FnZUZhY3RvcnkgZnJvbSAnLi9idWlsZC11dGlsL3RzL2xhenktcGFja2FnZS1mYWN0b3J5JztcbmltcG9ydCB7Z2V0U3RhdGUsIHBhdGhUb1Byb2pLZXksIHdvcmtzcGFjZUtleSwgUGFja2FnZUluZm99IGZyb20gJy4vcGFja2FnZS1tZ3InO1xuaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQge2xvb2t1cFBhY2thZ2VKc29uLCBmaW5kUGFja2FnZXNCeU5hbWVzfSBmcm9tICcuL2NtZC91dGlscyc7XG5cbmNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3dmaC5wYWNrYWdlLXV0aWxzJyk7XG5cbmNvbnN0IGxhenlQYWNrYWdlRmFjdG9yeSA9IG5ldyBMYXp5UGFja2FnZUZhY3RvcnkoYWxsUGFja2FnZXMoKSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVMYXp5UGFja2FnZUZpbGVGaW5kZXIoKSB7XG4gIGNvbnN0IGNhY2hlID0gbmV3IExSVTxzdHJpbmcsIFBhY2thZ2VCcm93c2VySW5zdGFuY2U+KHttYXg6IDIwLCBtYXhBZ2U6IDIwMDAwfSk7XG5cbiAgcmV0dXJuIGZ1bmN0aW9uKGZpbGU6IHN0cmluZyk6IFBhY2thZ2VCcm93c2VySW5zdGFuY2UgfCB1bmRlZmluZWQge1xuICAgIGxldCBmb3VuZCA9IGNhY2hlLmdldChmaWxlKTtcbiAgICBpZiAoIWZvdW5kKSB7XG4gICAgICBmb3VuZCA9IGxhenlQYWNrYWdlRmFjdG9yeS5nZXRQYWNrYWdlQnlQYXRoKGZpbGUpITtcbiAgICAgIGlmIChmb3VuZClcbiAgICAgICAgY2FjaGUuc2V0KGZpbGUsIGZvdW5kKTtcbiAgICB9XG4gICAgcmV0dXJuIGZvdW5kO1xuICB9O1xufVxuXG5leHBvcnQgdHlwZSBGaW5kUGFja2FnZUNiID0gKGZ1bGxOYW1lOiBzdHJpbmcsXG4gIC8qKiBARGVwcmVjYXRlZCBlbXB0eSBzdHJpbmcgKi9cbiAgcGFja2FnZVBhdGg6IHN0cmluZyxcbiAgcGFyc2VkTmFtZToge25hbWU6IHN0cmluZywgc2NvcGU6IHN0cmluZ30sXG4gIGpzb246IGFueSxcbiAgcmVhbFBhY2thZ2VQYXRoOiBzdHJpbmcsXG4gIGlzSW5zdGFsbGVkOiBib29sZWFuKSA9PiB2b2lkO1xuXG5leHBvcnQgZnVuY3Rpb24gbG9va0ZvclBhY2thZ2VzKHBhY2thZ2VMaXN0OiBzdHJpbmdbXSB8IHN0cmluZywgY2I6IEZpbmRQYWNrYWdlQ2IpOiB2b2lkIHtcbiAgZm9yIChjb25zdCBwa2cgb2YgZmluZFBhY2thZ2VzQnlOYW1lcyhnZXRTdGF0ZSgpLCBBcnJheS5pc0FycmF5KHBhY2thZ2VMaXN0KSA/IHBhY2thZ2VMaXN0IDogW3BhY2thZ2VMaXN0XSkpIHtcbiAgICBpZiAocGtnID09IG51bGwpXG4gICAgICBjb250aW51ZTtcbiAgICBjYihwa2cubmFtZSwgcGtnLnBhdGgsIHtuYW1lOiBwa2cuc2hvcnROYW1lLCBzY29wZTogcGtnLnNjb3BlfSwgcGtnLmpzb24sIHBrZy5yZWFsUGF0aCwgcGtnLmlzSW5zdGFsbGVkKTtcbiAgfVxufVxuXG5leHBvcnQgdHlwZSBQYWNrYWdlVHlwZSA9ICcqJyB8ICdidWlsZCcgfCAnY29yZSc7XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kQWxsUGFja2FnZXMoY2FsbGJhY2s6IEZpbmRQYWNrYWdlQ2IsXG4gIHJlY2lwZVR5cGU/OiAnc3JjJyB8ICdpbnN0YWxsZWQnLFxuICBwcm9qZWN0RGlyPzogc3RyaW5nIHwgc3RyaW5nW10pOiB2b2lkO1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRBbGxQYWNrYWdlcyhwYWNrYWdlTGlzdDogc3RyaW5nW10gfCBzdHJpbmcsXG4gIGNhbGxiYWNrOiBGaW5kUGFja2FnZUNiLFxuICByZWNpcGVUeXBlPzogJ3NyYycgfCAnaW5zdGFsbGVkJyxcbiAgcHJvamVjdERpcj86IHN0cmluZyB8IHN0cmluZ1tdKTogdm9pZDtcbmV4cG9ydCBmdW5jdGlvbiBmaW5kQWxsUGFja2FnZXMocGFja2FnZUxpc3Q6IHN0cmluZ1tdIHwgc3RyaW5nIHwgRmluZFBhY2thZ2VDYixcbiAgY2FsbGJhY2s/OiBGaW5kUGFja2FnZUNiIHwgJ3NyYycgfCAnaW5zdGFsbGVkJyxcbiAgcmVjaXBlVHlwZT86IHN0cmluZyB8IHN0cmluZ1tdLFxuICBwcm9qZWN0RGlyPzogc3RyaW5nIHwgc3RyaW5nW10pIHtcbiAgLy8gb2xkUHUuZmluZEFsbFBhY2thZ2VzLmFwcGx5KG9sZFB1LCBhcmd1bWVudHMpO1xuXG4gIGlmIChfLmlzRnVuY3Rpb24oY2FsbGJhY2spICYmIHBhY2thZ2VMaXN0KSB7XG4gICAgbG9va0ZvclBhY2thZ2VzKChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KHBhY2thZ2VMaXN0IGFzIChzdHJpbmdbXSB8IHN0cmluZykpLCBjYWxsYmFjayk7XG4gICAgcmV0dXJuO1xuICB9IGVsc2UgaWYgKF8uaXNGdW5jdGlvbihwYWNrYWdlTGlzdCkpIHtcbiAgICAvLyBhcmd1bWVudHMubGVuZ3RoIDw9IDJcbiAgICBwcm9qZWN0RGlyID0gcmVjaXBlVHlwZTtcbiAgICByZWNpcGVUeXBlID0gY2FsbGJhY2sgYXMgJ3NyYycgfCAnaW5zdGFsbGVkJztcbiAgICBjYWxsYmFjayA9IHBhY2thZ2VMaXN0O1xuICB9XG4gIHJldHVybiBmaW5kUGFja2FnZUJ5VHlwZSgnKicsIGNhbGxiYWNrIGFzIEZpbmRQYWNrYWdlQ2IsIHJlY2lwZVR5cGUgYXMgJ3NyYycgfCAnaW5zdGFsbGVkJyxcbiAgICBwcm9qZWN0RGlyKTtcbn1cblxuLy8gZXhwb3J0IHtlYWNoUmVjaXBlfSBmcm9tICcuL3JlY2lwZS1tYW5hZ2VyJztcblxuZXhwb3J0IHtsb29rdXBQYWNrYWdlSnNvbiBhcyBmaW5kUGFja2FnZUpzb25QYXRofTtcblxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRQYWNrYWdlQnlUeXBlKF90eXBlczogUGFja2FnZVR5cGUgfCBQYWNrYWdlVHlwZVtdLFxuICBjYWxsYmFjazogRmluZFBhY2thZ2VDYiwgcmVjaXBlVHlwZT86ICdzcmMnIHwgJ2luc3RhbGxlZCcsIHByb2plY3REaXI/OiBzdHJpbmdbXSB8IHN0cmluZykge1xuXG4gIGNvbnN0IGFyciA9IEFycmF5LmlzQXJyYXkocHJvamVjdERpcikgPyBwcm9qZWN0RGlyIDogcHJvamVjdERpciA9PSBudWxsID8gcHJvamVjdERpciA6IFtwcm9qZWN0RGlyXTtcbiAgZm9yIChjb25zdCBwa2cgb2YgYWxsUGFja2FnZXMoX3R5cGVzLCByZWNpcGVUeXBlLCBhcnIpKSB7XG4gICAgY2FsbGJhY2socGtnLm5hbWUsIHBrZy5wYXRoLCB7c2NvcGU6IHBrZy5zY29wZSwgbmFtZTogcGtnLnNob3J0TmFtZX0sIHBrZy5qc29uLCBwa2cucmVhbFBhdGgsIHBrZy5pc0luc3RhbGxlZCk7XG4gIH1cbn1cblxuLyoqIEluY2x1ZGluZyBpbnN0YWxsZWQgcGFja2FnZSBmcm9tIGFsbCB3b3Jrc3BhY2VzLCB1bmxpa2UgcGFja2FnZXM0Q3VycmVudFdvcmtzcGFjZSgpIHdoaWNoIG9ubHkgaW5jbHVkZVxuICogbGlua2VkIGFuZCBpbnN0YWxsZWRcbiAqIHBhY2thZ2VzIHRoYXQgYXJlIGRlcGVuZGVkIGluIGN1cnJlbnQgd29ya3NwYWNlIHBhY2thZ2UuanNvbiBmaWxlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiogYWxsUGFja2FnZXMoX3R5cGVzPzogUGFja2FnZVR5cGUgfCBQYWNrYWdlVHlwZVtdLFxuICByZWNpcGVUeXBlPzogJ3NyYycgfCAnaW5zdGFsbGVkJywgcHJvamVjdERpcnM/OiBzdHJpbmdbXSk6IEdlbmVyYXRvcjxQYWNrYWdlSW5mbz4ge1xuXG4gIC8vIGNvbnN0IHdzS2V5ID0gcGF0aFRvV29ya3NwYWNlKHByb2Nlc3MuY3dkKCkpO1xuXG4gIGlmIChyZWNpcGVUeXBlICE9PSAnaW5zdGFsbGVkJykge1xuICAgIGlmIChwcm9qZWN0RGlycykge1xuICAgICAgZm9yIChjb25zdCBwcm9qZWN0RGlyIG9mIHByb2plY3REaXJzKSB7XG4gICAgICAgIGNvbnN0IHByb2pLZXkgPSBwYXRoVG9Qcm9qS2V5KHByb2plY3REaXIpO1xuICAgICAgICBjb25zdCBwa2dOYW1lcyA9IGdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5nZXQocHJvaktleSk7XG4gICAgICAgIGlmIChwa2dOYW1lcyA9PSBudWxsKVxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgZm9yIChjb25zdCBwa2dOYW1lIG9mIHBrZ05hbWVzKSB7XG4gICAgICAgICAgY29uc3QgcGtnID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy5nZXQocGtnTmFtZSk7XG4gICAgICAgICAgaWYgKHBrZykge1xuICAgICAgICAgICAgeWllbGQgcGtnO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKGNvbnN0IHBrZyBvZiBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLnZhbHVlcygpKSB7XG4gICAgICAgIHlpZWxkIHBrZztcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgaWYgKHJlY2lwZVR5cGUgIT09ICdzcmMnKSB7XG4gICAgZm9yIChjb25zdCB3cyBvZiBnZXRTdGF0ZSgpLndvcmtzcGFjZXMudmFsdWVzKCkpIHtcbiAgICAgIGNvbnN0IGluc3RhbGxlZCA9IHdzLmluc3RhbGxlZENvbXBvbmVudHM7XG4gICAgICBpZiAoaW5zdGFsbGVkKSB7XG4gICAgICAgIGZvciAoY29uc3QgY29tcCBvZiBpbnN0YWxsZWQudmFsdWVzKCkpIHtcbiAgICAgICAgICB5aWVsZCBjb21wO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiogcGFja2FnZXM0V29ya3NwYWNlS2V5KHdzS2V5OiBzdHJpbmcpIHtcbiAgY29uc3Qgd3MgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KTtcbiAgaWYgKCF3cylcbiAgICByZXR1cm47XG5cbiAgY29uc3QgbGlua2VkID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcztcbiAgY29uc3QgaW5zdGFsbGVkID0gd3MuaW5zdGFsbGVkQ29tcG9uZW50cztcbiAgZm9yIChjb25zdCBbcGtOYW1lXSBvZiB3cy5saW5rZWREZXBlbmRlbmNpZXMpIHtcbiAgICBjb25zdCBwayA9IGxpbmtlZC5nZXQocGtOYW1lKTtcbiAgICBpZiAocGsgPT0gbnVsbClcbiAgICAgIGxvZy53YXJuKGBNaXNzaW5nIHBhY2thZ2UgJHtwa05hbWV9IGluIHdvcmtzcGFjZSAke3dzS2V5fWApO1xuICAgIGVsc2VcbiAgICAgIHlpZWxkIHBrO1xuICB9XG4gIGZvciAoY29uc3QgW3BrTmFtZV0gb2Ygd3MubGlua2VkRGV2RGVwZW5kZW5jaWVzKSB7XG4gICAgY29uc3QgcGsgPSBsaW5rZWQuZ2V0KHBrTmFtZSk7XG4gICAgaWYgKHBrID09IG51bGwpXG4gICAgICBsb2cud2FybihgTWlzc2luZyBwYWNrYWdlICR7cGtOYW1lfSBpbiB3b3Jrc3BhY2UgJHt3c0tleX1gKTtcbiAgICBlbHNlXG4gICAgICB5aWVsZCBwaztcbiAgfVxuICBpZiAoaW5zdGFsbGVkKSB7XG4gICAgZm9yIChjb25zdCBjb21wIG9mIGluc3RhbGxlZC52YWx1ZXMoKSkge1xuICAgICAgeWllbGQgY29tcDtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhY2thZ2VzNFdvcmtzcGFjZSh3b3Jrc3BhY2VEaXI/OiBzdHJpbmcpIHtcbiAgY29uc3Qgd3NLZXkgPSB3b3Jrc3BhY2VLZXkod29ya3NwYWNlRGlyIHx8IHByb2Nlc3MuY3dkKCkpO1xuICByZXR1cm4gcGFja2FnZXM0V29ya3NwYWNlS2V5KHdzS2V5KTtcbn1cblxuLyoqXG4gKiBEZWZhdWx0IHR5cGUgcm9vdHMgZGVmaW5lZCBpbiBwYWNrYWdlcywgaW5jbHVkaW5nIGxpbmtlZCBhbmQgaW5zdGFsbGVkIHBhY2thZ2VzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiAqdHlwZVJvb3RzRnJvbVBhY2thZ2VzKHdza2V5OiBzdHJpbmcpIHtcbiAgZm9yIChjb25zdCBwa2cgb2YgcGFja2FnZXM0V29ya3NwYWNlS2V5KHdza2V5KSkge1xuICAgIGNvbnN0IHR5cGVEaXIgPSBQYXRoLnJlc29sdmUocGtnLnJlYWxQYXRoLCAndHlwZXMnKTtcbiAgICB0cnkge1xuICAgICAgaWYgKGZzLnN0YXRTeW5jKHR5cGVEaXIpLmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgeWllbGQgdHlwZURpcjtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==