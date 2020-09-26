"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.packages4Workspace = exports.allPackages = exports.findPackageByType = exports.findPackageJsonPath = exports.findAllPackages = exports.lookForPackages = exports.createLazyPackageFileFinder = void 0;
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
function* packages4Workspace(workspaceDir) {
    const wsKey = package_mgr_1.workspaceKey(workspaceDir || process.cwd());
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
    for (const [pkName] of ws.linkedDevDependencies) {
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
exports.packages4Workspace = packages4Workspace;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS11dGlscy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3BhY2thZ2UtdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsMERBQTRCO0FBRTVCLGdHQUFzRTtBQUN0RSwrQ0FBaUY7QUFDakYsZ0NBQWdDO0FBQ2hDLG9EQUF1QjtBQUN2QiwrQkFBK0I7QUFDL0IsNEJBQTRCO0FBQzVCLHVDQUFtRTtBQWtFdEMsb0dBbEVyQix5QkFBaUIsT0FrRXVCO0FBaEVoRCxxREFBcUQ7QUFFckQsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLDhCQUFrQixDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7QUFFakUsU0FBZ0IsMkJBQTJCO0lBQ3pDLE1BQU0sS0FBSyxHQUFHLElBQUksbUJBQUcsQ0FBaUMsRUFBQyxHQUFHLEVBQUUsRUFBRSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUMsQ0FBQyxDQUFDO0lBRWhGLE9BQU8sVUFBUyxJQUFZO1FBQzFCLElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDNUIsSUFBSSxDQUFDLEtBQUssRUFBRTtZQUNWLEtBQUssR0FBRyxrQkFBa0IsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUUsQ0FBQztZQUNuRCxJQUFJLEtBQUs7Z0JBQ1AsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7U0FDMUI7UUFDRCxPQUFPLEtBQUssQ0FBQztJQUNmLENBQUMsQ0FBQztBQUNKLENBQUM7QUFaRCxrRUFZQztBQVVELFNBQWdCLGVBQWUsQ0FBQyxXQUE4QixFQUFFLEVBQWlCO0lBQy9FLEtBQUssTUFBTSxHQUFHLElBQUksMkJBQW1CLENBQUMsc0JBQVEsRUFBRSxFQUFFLEtBQUssQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FB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TUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM5QixJQUFJLEVBQUUsSUFBSSxJQUFJO1lBQ1osTUFBTSxJQUFJLEtBQUssQ0FBQyxtQkFBbUIsTUFBTSx1QkFBdUIsQ0FBQyxDQUFDO1FBQ3BFLE1BQU0sRUFBRSxDQUFDO0tBQ1Y7SUFDRCxJQUFJLFNBQVMsRUFBRTtRQUNiLEtBQUssTUFBTSxJQUFJLElBQUksU0FBUyxDQUFDLE1BQU0sRUFBRSxFQUFFO1lBQ3JDLE1BQU0sSUFBSSxDQUFDO1NBQ1o7S0FDRjtBQUNILENBQUM7QUF6QkQsZ0RBeUJDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IExSVSBmcm9tICdscnUtY2FjaGUnO1xuaW1wb3J0IFBhY2thZ2VCcm93c2VySW5zdGFuY2UgZnJvbSAnLi9idWlsZC11dGlsL3RzL3BhY2thZ2UtaW5zdGFuY2UnO1xuaW1wb3J0IExhenlQYWNrYWdlRmFjdG9yeSBmcm9tICcuL2J1aWxkLXV0aWwvdHMvbGF6eS1wYWNrYWdlLWZhY3RvcnknO1xuaW1wb3J0IHtnZXRTdGF0ZSwgcGF0aFRvUHJvaktleSwgd29ya3NwYWNlS2V5LCBQYWNrYWdlSW5mb30gZnJvbSAnLi9wYWNrYWdlLW1ncic7XG4vLyBpbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbi8vIGltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbi8vIGltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7bG9va3VwUGFja2FnZUpzb24sIGZpbmRQYWNrYWdlc0J5TmFtZXN9IGZyb20gJy4vY21kL3V0aWxzJztcblxuLy8gY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignd2ZoLnBhY2thZ2UtdXRpbHMnKTtcblxuY29uc3QgbGF6eVBhY2thZ2VGYWN0b3J5ID0gbmV3IExhenlQYWNrYWdlRmFjdG9yeShhbGxQYWNrYWdlcygpKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUxhenlQYWNrYWdlRmlsZUZpbmRlcigpIHtcbiAgY29uc3QgY2FjaGUgPSBuZXcgTFJVPHN0cmluZywgUGFja2FnZUJyb3dzZXJJbnN0YW5jZT4oe21heDogMjAsIG1heEFnZTogMjAwMDB9KTtcblxuICByZXR1cm4gZnVuY3Rpb24oZmlsZTogc3RyaW5nKTogUGFja2FnZUJyb3dzZXJJbnN0YW5jZSB8IHVuZGVmaW5lZCB7XG4gICAgbGV0IGZvdW5kID0gY2FjaGUuZ2V0KGZpbGUpO1xuICAgIGlmICghZm91bmQpIHtcbiAgICAgIGZvdW5kID0gbGF6eVBhY2thZ2VGYWN0b3J5LmdldFBhY2thZ2VCeVBhdGgoZmlsZSkhO1xuICAgICAgaWYgKGZvdW5kKVxuICAgICAgICBjYWNoZS5zZXQoZmlsZSwgZm91bmQpO1xuICAgIH1cbiAgICByZXR1cm4gZm91bmQ7XG4gIH07XG59XG5cbmV4cG9ydCB0eXBlIEZpbmRQYWNrYWdlQ2IgPSAoZnVsbE5hbWU6IHN0cmluZyxcbiAgLyoqIEBEZXByZWNhdGVkIGVtcHR5IHN0cmluZyAqL1xuICBwYWNrYWdlUGF0aDogc3RyaW5nLFxuICBwYXJzZWROYW1lOiB7bmFtZTogc3RyaW5nLCBzY29wZTogc3RyaW5nfSxcbiAganNvbjogYW55LFxuICByZWFsUGFja2FnZVBhdGg6IHN0cmluZyxcbiAgaXNJbnN0YWxsZWQ6IGJvb2xlYW4pID0+IHZvaWQ7XG5cbmV4cG9ydCBmdW5jdGlvbiBsb29rRm9yUGFja2FnZXMocGFja2FnZUxpc3Q6IHN0cmluZ1tdIHwgc3RyaW5nLCBjYjogRmluZFBhY2thZ2VDYik6IHZvaWQge1xuICBmb3IgKGNvbnN0IHBrZyBvZiBmaW5kUGFja2FnZXNCeU5hbWVzKGdldFN0YXRlKCksIEFycmF5LmlzQXJyYXkocGFja2FnZUxpc3QpID8gcGFja2FnZUxpc3QgOiBbcGFja2FnZUxpc3RdKSkge1xuICAgIGlmIChwa2cgPT0gbnVsbClcbiAgICAgIGNvbnRpbnVlO1xuICAgIGNiKHBrZy5uYW1lLCBwa2cucGF0aCwge25hbWU6IHBrZy5zaG9ydE5hbWUsIHNjb3BlOiBwa2cuc2NvcGV9LCBwa2cuanNvbiwgcGtnLnJlYWxQYXRoLCBwa2cuaXNJbnN0YWxsZWQpO1xuICB9XG59XG5cbmV4cG9ydCB0eXBlIFBhY2thZ2VUeXBlID0gJyonIHwgJ2J1aWxkJyB8ICdjb3JlJztcblxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRBbGxQYWNrYWdlcyhjYWxsYmFjazogRmluZFBhY2thZ2VDYixcbiAgcmVjaXBlVHlwZT86ICdzcmMnIHwgJ2luc3RhbGxlZCcsXG4gIHByb2plY3REaXI/OiBzdHJpbmcgfCBzdHJpbmdbXSk6IHZvaWQ7XG5leHBvcnQgZnVuY3Rpb24gZmluZEFsbFBhY2thZ2VzKHBhY2thZ2VMaXN0OiBzdHJpbmdbXSB8IHN0cmluZyxcbiAgY2FsbGJhY2s6IEZpbmRQYWNrYWdlQ2IsXG4gIHJlY2lwZVR5cGU/OiAnc3JjJyB8ICdpbnN0YWxsZWQnLFxuICBwcm9qZWN0RGlyPzogc3RyaW5nIHwgc3RyaW5nW10pOiB2b2lkO1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRBbGxQYWNrYWdlcyhwYWNrYWdlTGlzdDogc3RyaW5nW10gfCBzdHJpbmcgfCBGaW5kUGFja2FnZUNiLFxuICBjYWxsYmFjaz86IEZpbmRQYWNrYWdlQ2IgfCAnc3JjJyB8ICdpbnN0YWxsZWQnLFxuICByZWNpcGVUeXBlPzogc3RyaW5nIHwgc3RyaW5nW10sXG4gIHByb2plY3REaXI/OiBzdHJpbmcgfCBzdHJpbmdbXSkge1xuICAvLyBvbGRQdS5maW5kQWxsUGFja2FnZXMuYXBwbHkob2xkUHUsIGFyZ3VtZW50cyk7XG5cbiAgaWYgKF8uaXNGdW5jdGlvbihjYWxsYmFjaykgJiYgcGFja2FnZUxpc3QpIHtcbiAgICBsb29rRm9yUGFja2FnZXMoKFtdIGFzIHN0cmluZ1tdKS5jb25jYXQocGFja2FnZUxpc3QgYXMgKHN0cmluZ1tdIHwgc3RyaW5nKSksIGNhbGxiYWNrKTtcbiAgICByZXR1cm47XG4gIH0gZWxzZSBpZiAoXy5pc0Z1bmN0aW9uKHBhY2thZ2VMaXN0KSkge1xuICAgIC8vIGFyZ3VtZW50cy5sZW5ndGggPD0gMlxuICAgIHByb2plY3REaXIgPSByZWNpcGVUeXBlO1xuICAgIHJlY2lwZVR5cGUgPSBjYWxsYmFjayBhcyAnc3JjJyB8ICdpbnN0YWxsZWQnO1xuICAgIGNhbGxiYWNrID0gcGFja2FnZUxpc3Q7XG4gIH1cbiAgcmV0dXJuIGZpbmRQYWNrYWdlQnlUeXBlKCcqJywgY2FsbGJhY2sgYXMgRmluZFBhY2thZ2VDYiwgcmVjaXBlVHlwZSBhcyAnc3JjJyB8ICdpbnN0YWxsZWQnLFxuICAgIHByb2plY3REaXIpO1xufVxuXG4vLyBleHBvcnQge2VhY2hSZWNpcGV9IGZyb20gJy4vcmVjaXBlLW1hbmFnZXInO1xuXG5leHBvcnQge2xvb2t1cFBhY2thZ2VKc29uIGFzIGZpbmRQYWNrYWdlSnNvblBhdGh9O1xuXG5leHBvcnQgZnVuY3Rpb24gZmluZFBhY2thZ2VCeVR5cGUoX3R5cGVzOiBQYWNrYWdlVHlwZSB8IFBhY2thZ2VUeXBlW10sXG4gIGNhbGxiYWNrOiBGaW5kUGFja2FnZUNiLCByZWNpcGVUeXBlPzogJ3NyYycgfCAnaW5zdGFsbGVkJywgcHJvamVjdERpcj86IHN0cmluZ1tdIHwgc3RyaW5nKSB7XG5cbiAgY29uc3QgYXJyID0gQXJyYXkuaXNBcnJheShwcm9qZWN0RGlyKSA/IHByb2plY3REaXIgOiBwcm9qZWN0RGlyID09IG51bGwgPyBwcm9qZWN0RGlyIDogW3Byb2plY3REaXJdO1xuICBmb3IgKGNvbnN0IHBrZyBvZiBhbGxQYWNrYWdlcyhfdHlwZXMsIHJlY2lwZVR5cGUsIGFycikpIHtcbiAgICBjYWxsYmFjayhwa2cubmFtZSwgcGtnLnBhdGgsIHtzY29wZTogcGtnLnNjb3BlLCBuYW1lOiBwa2cuc2hvcnROYW1lfSwgcGtnLmpzb24sIHBrZy5yZWFsUGF0aCwgcGtnLmlzSW5zdGFsbGVkKTtcbiAgfVxufVxuXG4vKiogSW5jbHVkaW5nIGluc3RhbGxlZCBwYWNrYWdlIGZyb20gYWxsIHdvcmtzcGFjZXMsIHVubGlrZSBwYWNrYWdlczRDdXJyZW50V29ya3NwYWNlKCkgd2hpY2ggb25seSBpbmNsdWRlXG4gKiBsaW5rZWQgYW5kIGluc3RhbGxlZFxuICogcGFja2FnZXMgdGhhdCBhcmUgZGVwZW5kZWQgaW4gY3VycmVudCB3b3Jrc3BhY2UgcGFja2FnZS5qc29uIGZpbGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uKiBhbGxQYWNrYWdlcyhfdHlwZXM/OiBQYWNrYWdlVHlwZSB8IFBhY2thZ2VUeXBlW10sXG4gIHJlY2lwZVR5cGU/OiAnc3JjJyB8ICdpbnN0YWxsZWQnLCBwcm9qZWN0RGlycz86IHN0cmluZ1tdKTogR2VuZXJhdG9yPFBhY2thZ2VJbmZvPiB7XG5cbiAgLy8gY29uc3Qgd3NLZXkgPSBwYXRoVG9Xb3Jrc3BhY2UocHJvY2Vzcy5jd2QoKSk7XG5cbiAgaWYgKHJlY2lwZVR5cGUgIT09ICdpbnN0YWxsZWQnKSB7XG4gICAgaWYgKHByb2plY3REaXJzKSB7XG4gICAgICBmb3IgKGNvbnN0IHByb2plY3REaXIgb2YgcHJvamVjdERpcnMpIHtcbiAgICAgICAgY29uc3QgcHJvaktleSA9IHBhdGhUb1Byb2pLZXkocHJvamVjdERpcik7XG4gICAgICAgIGNvbnN0IHBrZ05hbWVzID0gZ2V0U3RhdGUoKS5wcm9qZWN0MlBhY2thZ2VzLmdldChwcm9qS2V5KTtcbiAgICAgICAgaWYgKHBrZ05hbWVzID09IG51bGwpXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICBmb3IgKGNvbnN0IHBrZ05hbWUgb2YgcGtnTmFtZXMpIHtcbiAgICAgICAgICBjb25zdCBwa2cgPSBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmdldChwa2dOYW1lKTtcbiAgICAgICAgICBpZiAocGtnKSB7XG4gICAgICAgICAgICB5aWVsZCBwa2c7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAoY29uc3QgcGtnIG9mIGdldFN0YXRlKCkuc3JjUGFja2FnZXMudmFsdWVzKCkpIHtcbiAgICAgICAgeWllbGQgcGtnO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBpZiAocmVjaXBlVHlwZSAhPT0gJ3NyYycpIHtcbiAgICBmb3IgKGNvbnN0IHdzIG9mIGdldFN0YXRlKCkud29ya3NwYWNlcy52YWx1ZXMoKSkge1xuICAgICAgY29uc3QgaW5zdGFsbGVkID0gd3MuaW5zdGFsbGVkQ29tcG9uZW50cztcbiAgICAgIGlmIChpbnN0YWxsZWQpIHtcbiAgICAgICAgZm9yIChjb25zdCBjb21wIG9mIGluc3RhbGxlZC52YWx1ZXMoKSkge1xuICAgICAgICAgIHlpZWxkIGNvbXA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uKiBwYWNrYWdlczRXb3Jrc3BhY2Uod29ya3NwYWNlRGlyPzogc3RyaW5nKSB7XG4gIGNvbnN0IHdzS2V5ID0gd29ya3NwYWNlS2V5KHdvcmtzcGFjZURpciB8fCBwcm9jZXNzLmN3ZCgpKTtcbiAgY29uc3Qgd3MgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KTtcbiAgaWYgKCF3cylcbiAgICByZXR1cm47XG5cbiAgY29uc3QgbGlua2VkID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcztcbiAgY29uc3QgaW5zdGFsbGVkID0gd3MuaW5zdGFsbGVkQ29tcG9uZW50cztcbiAgZm9yIChjb25zdCBbcGtOYW1lXSBvZiB3cy5saW5rZWREZXBlbmRlbmNpZXMpIHtcbiAgICBjb25zdCBwayA9IGxpbmtlZC5nZXQocGtOYW1lKTtcbiAgICBpZiAocGsgPT0gbnVsbClcbiAgICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyBwYWNrYWdlICR7cGtOYW1lfSBpbiBjdXJyZW50IHdvcmtzcGFjZWApO1xuICAgIHlpZWxkIHBrO1xuICB9XG4gIGZvciAoY29uc3QgW3BrTmFtZV0gb2Ygd3MubGlua2VkRGV2RGVwZW5kZW5jaWVzKSB7XG4gICAgY29uc3QgcGsgPSBsaW5rZWQuZ2V0KHBrTmFtZSk7XG4gICAgaWYgKHBrID09IG51bGwpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgcGFja2FnZSAke3BrTmFtZX0gaW4gY3VycmVudCB3b3Jrc3BhY2VgKTtcbiAgICB5aWVsZCBwaztcbiAgfVxuICBpZiAoaW5zdGFsbGVkKSB7XG4gICAgZm9yIChjb25zdCBjb21wIG9mIGluc3RhbGxlZC52YWx1ZXMoKSkge1xuICAgICAgeWllbGQgY29tcDtcbiAgICB9XG4gIH1cbn1cbiJdfQ==