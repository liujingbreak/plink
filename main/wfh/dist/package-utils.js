"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.packages4CurrentWorkspace = exports.allPackages = exports.findPackageByType = exports.findPackageJsonPath = exports.findAllPackages = exports.lookForPackages = exports.createLazyPackageFileFinder = void 0;
const lru_cache_1 = __importDefault(require("lru-cache"));
const lazy_package_factory_1 = __importDefault(require("./build-util/ts/lazy-package-factory"));
const package_mgr_1 = require("./package-mgr");
// import * as Path from 'path';
const lodash_1 = __importDefault(require("lodash"));
// import log4js from 'log4js';
// import * as fs from 'fs';
const utils_1 = require("./cmd/utils");
Object.defineProperty(exports, "findPackageJsonPath", { enumerable: true, get: function () { return utils_1.lookupPackageJson; } });
// const log = log4js.getLogger('wfh.package-utils');
const lazyPackageFactory = new lazy_package_factory_1.default();
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
    for (const pkg of allPackages(_types, recipeType, projectDir)) {
        callback(pkg.name, pkg.path, { scope: pkg.scope, name: pkg.shortName }, pkg.json, pkg.realPath, pkg.isInstalled);
    }
}
exports.findPackageByType = findPackageByType;
function* allPackages(_types, recipeType, projectDir) {
    // const wsKey = pathToWorkspace(process.cwd());
    if (recipeType !== 'installed') {
        if (projectDir) {
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
function* packages4CurrentWorkspace() {
    const wsKey = package_mgr_1.pathToWorkspace(process.cwd());
    const ws = package_mgr_1.getState().workspaces.get(wsKey);
    if (!ws)
        return;
    const linked = package_mgr_1.getState().srcPackages;
    const installed = ws.installedComponents;
    for (const [pkName] of ws.linkedDependencies) {
        const pk = linked.get(pkName);
        if (pk == null)
            throw new Error(`Missing package ${pkName} in current workspace`);
        yield pk;
    }
    if (installed) {
        for (const comp of installed.values()) {
            yield comp;
        }
    }
}
exports.packages4CurrentWorkspace = packages4CurrentWorkspace;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS11dGlscy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3BhY2thZ2UtdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsMERBQTRCO0FBRTVCLGdHQUFzRTtBQUN0RSwrQ0FBb0Y7QUFDcEYsZ0NBQWdDO0FBQ2hDLG9EQUF1QjtBQUN2QiwrQkFBK0I7QUFDL0IsNEJBQTRCO0FBQzVCLHVDQUFtRTtBQWtFdEMsb0dBbEVyQix5QkFBaUIsT0FrRXVCO0FBaEVoRCxxREFBcUQ7QUFFckQsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLDhCQUFrQixFQUFFLENBQUM7QUFFcEQsU0FBZ0IsMkJBQTJCO0lBQ3pDLE1BQU0sS0FBSyxHQUFHLElBQUksbUJBQUcsQ0FBaUMsRUFBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDO0lBQ2hGLE9BQU8sVUFBUyxJQUFZO1FBQzFCLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDNUIsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNWLEtBQUssR0FBRyxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUUsQ0FBQztZQUNuRCxJQUFJLEtBQUs7Z0JBQ1AsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDMUI7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUMsQ0FBQztBQUNKLENBQUM7QUFYRCxrRUFXQztBQVVELFNBQWdCLGVBQWUsQ0FBQyxXQUE4QixFQUFFLEVBQWlCO0lBQy9FLEtBQUssTUFBTSxHQUFHLElBQUksMkJBQW1CLENBQUMsc0JBQVEsRUFBRSxFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFO1FBQzNHLElBQUksR0FBRyxJQUFJLElBQUk7WUFDYixTQUFTO1FBQ1gsRUFBRSxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxFQUFDLElBQUksRUFBRSxHQUFHLENBQUMsU0FBUyxFQUFFLEtBQUssRUFBRSxHQUFHLENBQUMsS0FBSyxFQUFDLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQztLQUMxRztBQUNILENBQUM7QUFORCwwQ0FNQztBQVdELFNBQWdCLGVBQWUsQ0FBQyxXQUE4QyxFQUM1RSxRQUE4QyxFQUM5QyxVQUE4QixFQUM5QixVQUE4QjtJQUM5QixpREFBaUQ7SUFFakQsSUFBSSxnQkFBQyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsSUFBSSxXQUFXLEVBQUU7UUFDekMsZUFBZSxDQUFFLEVBQWUsQ0FBQyxNQUFNLENBQUMsV0FBa0MsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3ZGLE9BQU87S0FDUjtTQUFNLElBQUksZ0JBQUMsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLEVBQUU7UUFDcEMsd0JBQXdCO1FBQ3hCLFVBQVUsR0FBRyxVQUFnQyxDQUFDO1FBQzlDLFVBQVUsR0FBRyxRQUErQixDQUFDO1FBQzdDLFFBQVEsR0FBRyxXQUFXLENBQUM7S0FDeEI7SUFFRCxPQUFPLGlCQUFpQixDQUFDLEdBQUcsRUFBRSxRQUF5QixFQUFFLFVBQWlDLEVBQ3hGLFVBQWdDLENBQUMsQ0FBQztBQUN0QyxDQUFDO0FBbEJELDBDQWtCQztBQU1ELFNBQWdCLGlCQUFpQixDQUFDLE1BQW1DLEVBQ25FLFFBQXVCLEVBQUUsVUFBZ0MsRUFBRSxVQUFtQjtJQUU5RSxLQUFLLE1BQU0sR0FBRyxJQUFJLFdBQVcsQ0FBQyxNQUFNLEVBQUUsVUFBVSxFQUFFLFVBQVUsQ0FBQyxFQUFFO1FBQzdELFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsRUFBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsR0FBRyxDQUFDLFNBQVMsRUFBQyxFQUFFLEdBQUcsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7S0FDaEg7QUFDSCxDQUFDO0FBTkQsOENBTUM7QUFFRCxRQUFlLENBQUMsQ0FBQyxXQUFXLENBQUMsTUFBbUMsRUFDOUQsVUFBZ0MsRUFBRSxVQUFtQjtJQUVyRCxnREFBZ0Q7SUFFaEQsSUFBSSxVQUFVLEtBQUssV0FBVyxFQUFFO1FBQzlCLElBQUksVUFBVSxFQUFFO1lBQ2QsTUFBTSxPQUFPLEdBQUcsMkJBQWEsQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUMxQyxNQUFNLFFBQVEsR0FBRyxzQkFBUSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQzFELElBQUksUUFBUSxJQUFJLElBQUk7Z0JBQ2xCLE9BQU87WUFDVCxLQUFLLE1BQU0sT0FBTyxJQUFJLFFBQVEsRUFBRTtnQkFDOUIsTUFBTSxHQUFHLEdBQUcsc0JBQVEsRUFBRSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7Z0JBQ2hELElBQUksR0FBRyxFQUFFO29CQUNQLE1BQU0sR0FBRyxDQUFDO2lCQUNYO2FBQ0Y7U0FDRjthQUFNO1lBQ0wsS0FBSyxNQUFNLEdBQUcsSUFBSSxzQkFBUSxFQUFFLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUNqRCxNQUFNLEdBQUcsQ0FBQzthQUNYO1NBQ0Y7S0FDRjtJQUNELElBQUksVUFBVSxLQUFLLEtBQUssRUFBRTtRQUN4QixLQUFLLE1BQU0sRUFBRSxJQUFJLHNCQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDL0MsTUFBTSxTQUFTLEdBQUcsRUFBRSxDQUFDLG1CQUFtQixDQUFDO1lBQ3pDLElBQUksU0FBUyxFQUFFO2dCQUNiLEtBQUssTUFBTSxJQUFJLElBQUksU0FBUyxDQUFDLE1BQU0sRUFBRSxFQUFFO29CQUNyQyxNQUFNLElBQUksQ0FBQztpQkFDWjthQUNGO1NBQ0Y7S0FDRjtBQUNILENBQUM7QUFqQ0Qsa0NBaUNDO0FBRUQsUUFBZSxDQUFDLENBQUMseUJBQXlCO0lBQ3hDLE1BQU0sS0FBSyxHQUFHLDZCQUFlLENBQUMsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDN0MsTUFBTSxFQUFFLEdBQUcsc0JBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUM7SUFDNUMsSUFBSSxDQUFDLEVBQUU7UUFDTCxPQUFPO0lBRVQsTUFBTSxNQUFNLEdBQUcsc0JBQVEsRUFBRSxDQUFDLFdBQVcsQ0FBQztJQUN0QyxNQUFNLFNBQVMsR0FBRyxFQUFFLENBQUMsbUJBQW1CLENBQUM7SUFDekMsS0FBSyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLGtCQUFrQixFQUFFO1FBQzVDLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDOUIsSUFBSSxFQUFFLElBQUksSUFBSTtZQUNaLE1BQU0sSUFBSSxLQUFLLENBQUMsbUJBQW1CLE1BQU0sdUJBQXVCLENBQUMsQ0FBQztRQUNwRSxNQUFNLEVBQUUsQ0FBQztLQUNWO0lBQ0QsSUFBSSxTQUFTLEVBQUU7UUFDYixLQUFLLE1BQU0sSUFBSSxJQUFJLFNBQVMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNyQyxNQUFNLElBQUksQ0FBQztTQUNaO0tBQ0Y7QUFDSCxDQUFDO0FBbkJELDhEQW1CQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBMUlUgZnJvbSAnbHJ1LWNhY2hlJztcbmltcG9ydCBQYWNrYWdlQnJvd3Nlckluc3RhbmNlIGZyb20gJy4vYnVpbGQtdXRpbC90cy9wYWNrYWdlLWluc3RhbmNlJztcbmltcG9ydCBMYXp5UGFja2FnZUZhY3RvcnkgZnJvbSAnLi9idWlsZC11dGlsL3RzL2xhenktcGFja2FnZS1mYWN0b3J5JztcbmltcG9ydCB7Z2V0U3RhdGUsIHBhdGhUb1Byb2pLZXksIHBhdGhUb1dvcmtzcGFjZSwgUGFja2FnZUluZm99IGZyb20gJy4vcGFja2FnZS1tZ3InO1xuLy8gaW1wb3J0ICogYXMgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG4vLyBpbXBvcnQgbG9nNGpzIGZyb20gJ2xvZzRqcyc7XG4vLyBpbXBvcnQgKiBhcyBmcyBmcm9tICdmcyc7XG5pbXBvcnQge2xvb2t1cFBhY2thZ2VKc29uLCBmaW5kUGFja2FnZXNCeU5hbWVzfSBmcm9tICcuL2NtZC91dGlscyc7XG5cbi8vIGNvbnN0IGxvZyA9IGxvZzRqcy5nZXRMb2dnZXIoJ3dmaC5wYWNrYWdlLXV0aWxzJyk7XG5cbmNvbnN0IGxhenlQYWNrYWdlRmFjdG9yeSA9IG5ldyBMYXp5UGFja2FnZUZhY3RvcnkoKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUxhenlQYWNrYWdlRmlsZUZpbmRlcigpIHtcbiAgY29uc3QgY2FjaGUgPSBuZXcgTFJVPHN0cmluZywgUGFja2FnZUJyb3dzZXJJbnN0YW5jZT4oe21heDogMjAsIG1heEFnZTogMjAwMDB9KTtcbiAgcmV0dXJuIGZ1bmN0aW9uKGZpbGU6IHN0cmluZyk6IFBhY2thZ2VCcm93c2VySW5zdGFuY2UgfCB1bmRlZmluZWQge1xuICAgIGxldCBmb3VuZCA9IGNhY2hlLmdldChmaWxlKTtcbiAgICBpZiAoIWZvdW5kKSB7XG4gICAgICBmb3VuZCA9IGxhenlQYWNrYWdlRmFjdG9yeS5nZXRQYWNrYWdlQnlQYXRoKGZpbGUpITtcbiAgICAgIGlmIChmb3VuZClcbiAgICAgICAgY2FjaGUuc2V0KGZpbGUsIGZvdW5kKTtcbiAgICB9XG4gICAgcmV0dXJuIGZvdW5kO1xuICB9O1xufVxuXG5leHBvcnQgdHlwZSBGaW5kUGFja2FnZUNiID0gKGZ1bGxOYW1lOiBzdHJpbmcsXG4gIC8qKiBARGVwcmVjYXRlZCBlbXB0eSBzdHJpbmcgKi9cbiAgcGFja2FnZVBhdGg6IHN0cmluZyxcbiAgcGFyc2VkTmFtZToge25hbWU6IHN0cmluZywgc2NvcGU6IHN0cmluZ30sXG4gIGpzb246IGFueSxcbiAgcmVhbFBhY2thZ2VQYXRoOiBzdHJpbmcsXG4gIGlzSW5zdGFsbGVkOiBib29sZWFuKSA9PiB2b2lkO1xuXG5leHBvcnQgZnVuY3Rpb24gbG9va0ZvclBhY2thZ2VzKHBhY2thZ2VMaXN0OiBzdHJpbmdbXSB8IHN0cmluZywgY2I6IEZpbmRQYWNrYWdlQ2IpOiB2b2lkIHtcbiAgZm9yIChjb25zdCBwa2cgb2YgZmluZFBhY2thZ2VzQnlOYW1lcyhnZXRTdGF0ZSgpLCBBcnJheS5pc0FycmF5KHBhY2thZ2VMaXN0KSA/IHBhY2thZ2VMaXN0IDogW3BhY2thZ2VMaXN0XSkpIHtcbiAgICBpZiAocGtnID09IG51bGwpXG4gICAgICBjb250aW51ZTtcbiAgICBjYihwa2cubmFtZSwgcGtnLnBhdGgsIHtuYW1lOiBwa2cuc2hvcnROYW1lLCBzY29wZTogcGtnLnNjb3BlfSwgcGtnLmpzb24sIHBrZy5yZWFsUGF0aCwgcGtnLmlzSW5zdGFsbGVkKTtcbiAgfVxufVxuXG5leHBvcnQgdHlwZSBQYWNrYWdlVHlwZSA9ICcqJyB8ICdidWlsZCcgfCAnY29yZSc7XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kQWxsUGFja2FnZXMoY2FsbGJhY2s6IEZpbmRQYWNrYWdlQ2IsXG4gIHJlY2lwZVR5cGU/OiAnc3JjJyB8ICdpbnN0YWxsZWQnLFxuICBwcm9qZWN0RGlyPzogc3RyaW5nIHwgc3RyaW5nW10pOiB2b2lkO1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRBbGxQYWNrYWdlcyhwYWNrYWdlTGlzdDogc3RyaW5nW10gfCBzdHJpbmcsXG4gIGNhbGxiYWNrOiBGaW5kUGFja2FnZUNiLFxuICByZWNpcGVUeXBlPzogJ3NyYycgfCAnaW5zdGFsbGVkJyxcbiAgcHJvamVjdERpcj86IHN0cmluZyB8IHN0cmluZ1tdKTogdm9pZDtcbmV4cG9ydCBmdW5jdGlvbiBmaW5kQWxsUGFja2FnZXMocGFja2FnZUxpc3Q6IHN0cmluZ1tdIHwgc3RyaW5nIHwgRmluZFBhY2thZ2VDYixcbiAgY2FsbGJhY2s/OiBGaW5kUGFja2FnZUNiIHwgJ3NyYycgfCAnaW5zdGFsbGVkJyxcbiAgcmVjaXBlVHlwZT86IHN0cmluZyB8IHN0cmluZ1tdLFxuICBwcm9qZWN0RGlyPzogc3RyaW5nIHwgc3RyaW5nW10pIHtcbiAgLy8gb2xkUHUuZmluZEFsbFBhY2thZ2VzLmFwcGx5KG9sZFB1LCBhcmd1bWVudHMpO1xuXG4gIGlmIChfLmlzRnVuY3Rpb24oY2FsbGJhY2spICYmIHBhY2thZ2VMaXN0KSB7XG4gICAgbG9va0ZvclBhY2thZ2VzKChbXSBhcyBzdHJpbmdbXSkuY29uY2F0KHBhY2thZ2VMaXN0IGFzIChzdHJpbmdbXSB8IHN0cmluZykpLCBjYWxsYmFjayk7XG4gICAgcmV0dXJuO1xuICB9IGVsc2UgaWYgKF8uaXNGdW5jdGlvbihwYWNrYWdlTGlzdCkpIHtcbiAgICAvLyBhcmd1bWVudHMubGVuZ3RoIDw9IDJcbiAgICBwcm9qZWN0RGlyID0gcmVjaXBlVHlwZSBhcyBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgcmVjaXBlVHlwZSA9IGNhbGxiYWNrIGFzICdzcmMnIHwgJ2luc3RhbGxlZCc7XG4gICAgY2FsbGJhY2sgPSBwYWNrYWdlTGlzdDtcbiAgfVxuXG4gIHJldHVybiBmaW5kUGFja2FnZUJ5VHlwZSgnKicsIGNhbGxiYWNrIGFzIEZpbmRQYWNrYWdlQ2IsIHJlY2lwZVR5cGUgYXMgJ3NyYycgfCAnaW5zdGFsbGVkJyxcbiAgICBwcm9qZWN0RGlyIGFzIHN0cmluZyB8IHVuZGVmaW5lZCk7XG59XG5cbi8vIGV4cG9ydCB7ZWFjaFJlY2lwZX0gZnJvbSAnLi9yZWNpcGUtbWFuYWdlcic7XG5cbmV4cG9ydCB7bG9va3VwUGFja2FnZUpzb24gYXMgZmluZFBhY2thZ2VKc29uUGF0aH07XG5cbmV4cG9ydCBmdW5jdGlvbiBmaW5kUGFja2FnZUJ5VHlwZShfdHlwZXM6IFBhY2thZ2VUeXBlIHwgUGFja2FnZVR5cGVbXSxcbiAgY2FsbGJhY2s6IEZpbmRQYWNrYWdlQ2IsIHJlY2lwZVR5cGU/OiAnc3JjJyB8ICdpbnN0YWxsZWQnLCBwcm9qZWN0RGlyPzogc3RyaW5nKSB7XG5cbiAgZm9yIChjb25zdCBwa2cgb2YgYWxsUGFja2FnZXMoX3R5cGVzLCByZWNpcGVUeXBlLCBwcm9qZWN0RGlyKSkge1xuICAgIGNhbGxiYWNrKHBrZy5uYW1lLCBwa2cucGF0aCwge3Njb3BlOiBwa2cuc2NvcGUsIG5hbWU6IHBrZy5zaG9ydE5hbWV9LCBwa2cuanNvbiwgcGtnLnJlYWxQYXRoLCBwa2cuaXNJbnN0YWxsZWQpO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiogYWxsUGFja2FnZXMoX3R5cGVzOiBQYWNrYWdlVHlwZSB8IFBhY2thZ2VUeXBlW10sXG4gIHJlY2lwZVR5cGU/OiAnc3JjJyB8ICdpbnN0YWxsZWQnLCBwcm9qZWN0RGlyPzogc3RyaW5nKTogR2VuZXJhdG9yPFBhY2thZ2VJbmZvPiB7XG5cbiAgLy8gY29uc3Qgd3NLZXkgPSBwYXRoVG9Xb3Jrc3BhY2UocHJvY2Vzcy5jd2QoKSk7XG5cbiAgaWYgKHJlY2lwZVR5cGUgIT09ICdpbnN0YWxsZWQnKSB7XG4gICAgaWYgKHByb2plY3REaXIpIHtcbiAgICAgIGNvbnN0IHByb2pLZXkgPSBwYXRoVG9Qcm9qS2V5KHByb2plY3REaXIpO1xuICAgICAgY29uc3QgcGtnTmFtZXMgPSBnZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMuZ2V0KHByb2pLZXkpO1xuICAgICAgaWYgKHBrZ05hbWVzID09IG51bGwpXG4gICAgICAgIHJldHVybjtcbiAgICAgIGZvciAoY29uc3QgcGtnTmFtZSBvZiBwa2dOYW1lcykge1xuICAgICAgICBjb25zdCBwa2cgPSBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmdldChwa2dOYW1lKTtcbiAgICAgICAgaWYgKHBrZykge1xuICAgICAgICAgIHlpZWxkIHBrZztcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKGNvbnN0IHBrZyBvZiBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLnZhbHVlcygpKSB7XG4gICAgICAgIHlpZWxkIHBrZztcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgaWYgKHJlY2lwZVR5cGUgIT09ICdzcmMnKSB7XG4gICAgZm9yIChjb25zdCB3cyBvZiBnZXRTdGF0ZSgpLndvcmtzcGFjZXMudmFsdWVzKCkpIHtcbiAgICAgIGNvbnN0IGluc3RhbGxlZCA9IHdzLmluc3RhbGxlZENvbXBvbmVudHM7XG4gICAgICBpZiAoaW5zdGFsbGVkKSB7XG4gICAgICAgIGZvciAoY29uc3QgY29tcCBvZiBpbnN0YWxsZWQudmFsdWVzKCkpIHtcbiAgICAgICAgICB5aWVsZCBjb21wO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiogcGFja2FnZXM0Q3VycmVudFdvcmtzcGFjZSgpIHtcbiAgY29uc3Qgd3NLZXkgPSBwYXRoVG9Xb3Jrc3BhY2UocHJvY2Vzcy5jd2QoKSk7XG4gIGNvbnN0IHdzID0gZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmdldCh3c0tleSk7XG4gIGlmICghd3MpXG4gICAgcmV0dXJuO1xuXG4gIGNvbnN0IGxpbmtlZCA9IGdldFN0YXRlKCkuc3JjUGFja2FnZXM7XG4gIGNvbnN0IGluc3RhbGxlZCA9IHdzLmluc3RhbGxlZENvbXBvbmVudHM7XG4gIGZvciAoY29uc3QgW3BrTmFtZV0gb2Ygd3MubGlua2VkRGVwZW5kZW5jaWVzKSB7XG4gICAgY29uc3QgcGsgPSBsaW5rZWQuZ2V0KHBrTmFtZSk7XG4gICAgaWYgKHBrID09IG51bGwpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcGFja2FnZSAke3BrTmFtZX0gaW4gY3VycmVudCB3b3Jrc3BhY2VgKTtcbiAgICB5aWVsZCBwaztcbiAgfVxuICBpZiAoaW5zdGFsbGVkKSB7XG4gICAgZm9yIChjb25zdCBjb21wIG9mIGluc3RhbGxlZC52YWx1ZXMoKSkge1xuICAgICAgeWllbGQgY29tcDtcbiAgICB9XG4gIH1cbn1cbiJdfQ==