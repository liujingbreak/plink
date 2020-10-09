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
const lazy_package_factory_1 = __importDefault(require("./package-mgr/lazy-package-factory"));
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
function* packages4WorkspaceKey(wsKey, includeInstalled = true) {
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
    if (includeInstalled && installed) {
        for (const comp of installed.values()) {
            yield comp;
        }
    }
}
exports.packages4WorkspaceKey = packages4WorkspaceKey;
function packages4Workspace(workspaceDir, includeInstalled = true) {
    const wsKey = package_mgr_1.workspaceKey(workspaceDir || process.cwd());
    return packages4WorkspaceKey(wsKey, includeInstalled);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS11dGlscy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3RzL3BhY2thZ2UtdXRpbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDBEQUE0QjtBQUU1Qiw4RkFBb0U7QUFDcEUsK0NBQWlGO0FBQ2pGLDJDQUE2QjtBQUM3QixvREFBdUI7QUFDdkIsb0RBQTRCO0FBQzVCLHVDQUF5QjtBQUN6Qix1Q0FBbUU7QUFrRXRDLG9HQWxFckIseUJBQWlCLE9Ba0V1QjtBQWhFaEQsTUFBTSxHQUFHLEdBQUcsZ0JBQU0sQ0FBQyxTQUFTLENBQUMsbUJBQW1CLENBQUMsQ0FBQztBQUVsRCxNQUFNLGtCQUFrQixHQUFHLElBQUksOEJBQWtCLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztBQUVqRSxTQUFnQiwyQkFBMkI7SUFDekMsTUFBTSxLQUFLLEdBQUcsSUFBSSxtQkFBRyxDQUFpQyxFQUFDLEdBQUcsRUFBRSxFQUFFLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBQyxDQUFDLENBQUM7SUFFaEYsT0FBTyxVQUFTLElBQVk7UUFDMUIsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM1QixJQUFJLENBQUMsS0FBSyxFQUFFO1lBQ1YsS0FBSyxHQUFHLGtCQUFrQixDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBRSxDQUFDO1lBQ25ELElBQUksS0FBSztnQkFDUCxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztTQUMxQjtRQUNELE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQVpELGtFQVlDO0FBVUQsU0FBZ0IsZUFBZSxDQUFDLFdBQThCLEVBQUUsRUFBaUI7SUFDL0UsS0FBSyxNQUFNLEdBQUcsSUFBSSwyQkFBbUIsQ0FBQyxzQkFBUSxFQUFFLEVBQUUsS0FBSyxDQUFDLE9BQU8sQ0FB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bSAnbHJ1LWNhY2hlJztcbmltcG9ydCBQYWNrYWdlQnJvd3Nlckluc3RhbmNlIGZyb20gJy4vcGFja2FnZS1tZ3IvcGFja2FnZS1pbnN0YW5jZSc7XG5pbXBvcnQgTGF6eVBhY2thZ2VGYWN0b3J5IGZyb20gJy4vcGFja2FnZS1tZ3IvbGF6eS1wYWNrYWdlLWZhY3RvcnknO1xuaW1wb3J0IHtnZXRTdGF0ZSwgcGF0aFRvUHJvaktleSwgd29ya3NwYWNlS2V5LCBQYWNrYWdlSW5mb30gZnJvbSAnLi9wYWNrYWdlLW1ncic7XG5pbXBvcnQgKiBhcyBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBsb2c0anMgZnJvbSAnbG9nNGpzJztcbmltcG9ydCAqIGFzIGZzIGZyb20gJ2ZzJztcbmltcG9ydCB7bG9va3VwUGFja2FnZUpzb24sIGZpbmRQYWNrYWdlc0J5TmFtZXN9IGZyb20gJy4vY21kL3V0aWxzJztcblxuY29uc3QgbG9nID0gbG9nNGpzLmdldExvZ2dlcignd2ZoLnBhY2thZ2UtdXRpbHMnKTtcblxuY29uc3QgbGF6eVBhY2thZ2VGYWN0b3J5ID0gbmV3IExhenlQYWNrYWdlRmFjdG9yeShhbGxQYWNrYWdlcygpKTtcblxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUxhenlQYWNrYWdlRmlsZUZpbmRlcigpIHtcbiAgY29uc3QgY2FjaGUgPSBuZXcgTFJVPHN0cmluZywgUGFja2FnZUJyb3dzZXJJbnN0YW5jZT4oe21heDogMjAsIG1heEFnZTogMjAwMDB9KTtcblxuICByZXR1cm4gZnVuY3Rpb24oZmlsZTogc3RyaW5nKTogUGFja2FnZUJyb3dzZXJJbnN0YW5jZSB8IHVuZGVmaW5lZCB7XG4gICAgbGV0IGZvdW5kID0gY2FjaGUuZ2V0KGZpbGUpO1xuICAgIGlmICghZm91bmQpIHtcbiAgICAgIGZvdW5kID0gbGF6eVBhY2thZ2VGYWN0b3J5LmdldFBhY2thZ2VCeVBhdGgoZmlsZSkhO1xuICAgICAgaWYgKGZvdW5kKVxuICAgICAgICBjYWNoZS5zZXQoZmlsZSwgZm91bmQpO1xuICAgIH1cbiAgICByZXR1cm4gZm91bmQ7XG4gIH07XG59XG5cbmV4cG9ydCB0eXBlIEZpbmRQYWNrYWdlQ2IgPSAoZnVsbE5hbWU6IHN0cmluZyxcbiAgLyoqIEBEZXByZWNhdGVkIGVtcHR5IHN0cmluZyAqL1xuICBwYWNrYWdlUGF0aDogc3RyaW5nLFxuICBwYXJzZWROYW1lOiB7bmFtZTogc3RyaW5nLCBzY29wZTogc3RyaW5nfSxcbiAganNvbjogYW55LFxuICByZWFsUGFja2FnZVBhdGg6IHN0cmluZyxcbiAgaXNJbnN0YWxsZWQ6IGJvb2xlYW4pID0+IHZvaWQ7XG5cbmV4cG9ydCBmdW5jdGlvbiBsb29rRm9yUGFja2FnZXMocGFja2FnZUxpc3Q6IHN0cmluZ1tdIHwgc3RyaW5nLCBjYjogRmluZFBhY2thZ2VDYik6IHZvaWQge1xuICBmb3IgKGNvbnN0IHBrZyBvZiBmaW5kUGFja2FnZXNCeU5hbWVzKGdldFN0YXRlKCksIEFycmF5LmlzQXJyYXkocGFja2FnZUxpc3QpID8gcGFja2FnZUxpc3QgOiBbcGFja2FnZUxpc3RdKSkge1xuICAgIGlmIChwa2cgPT0gbnVsbClcbiAgICAgIGNvbnRpbnVlO1xuICAgIGNiKHBrZy5uYW1lLCBwa2cucGF0aCwge25hbWU6IHBrZy5zaG9ydE5hbWUsIHNjb3BlOiBwa2cuc2NvcGV9LCBwa2cuanNvbiwgcGtnLnJlYWxQYXRoLCBwa2cuaXNJbnN0YWxsZWQpO1xuICB9XG59XG5cbmV4cG9ydCB0eXBlIFBhY2thZ2VUeXBlID0gJyonIHwgJ2J1aWxkJyB8ICdjb3JlJztcblxuZXhwb3J0IGZ1bmN0aW9uIGZpbmRBbGxQYWNrYWdlcyhjYWxsYmFjazogRmluZFBhY2thZ2VDYixcbiAgcmVjaXBlVHlwZT86ICdzcmMnIHwgJ2luc3RhbGxlZCcsXG4gIHByb2plY3REaXI/OiBzdHJpbmcgfCBzdHJpbmdbXSk6IHZvaWQ7XG5leHBvcnQgZnVuY3Rpb24gZmluZEFsbFBhY2thZ2VzKHBhY2thZ2VMaXN0OiBzdHJpbmdbXSB8IHN0cmluZyxcbiAgY2FsbGJhY2s6IEZpbmRQYWNrYWdlQ2IsXG4gIHJlY2lwZVR5cGU/OiAnc3JjJyB8ICdpbnN0YWxsZWQnLFxuICBwcm9qZWN0RGlyPzogc3RyaW5nIHwgc3RyaW5nW10pOiB2b2lkO1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRBbGxQYWNrYWdlcyhwYWNrYWdlTGlzdDogc3RyaW5nW10gfCBzdHJpbmcgfCBGaW5kUGFja2FnZUNiLFxuICBjYWxsYmFjaz86IEZpbmRQYWNrYWdlQ2IgfCAnc3JjJyB8ICdpbnN0YWxsZWQnLFxuICByZWNpcGVUeXBlPzogc3RyaW5nIHwgc3RyaW5nW10sXG4gIHByb2plY3REaXI/OiBzdHJpbmcgfCBzdHJpbmdbXSkge1xuICAvLyBvbGRQdS5maW5kQWxsUGFja2FnZXMuYXBwbHkob2xkUHUsIGFyZ3VtZW50cyk7XG5cbiAgaWYgKF8uaXNGdW5jdGlvbihjYWxsYmFjaykgJiYgcGFja2FnZUxpc3QpIHtcbiAgICBsb29rRm9yUGFja2FnZXMoKFtdIGFzIHN0cmluZ1tdKS5jb25jYXQocGFja2FnZUxpc3QgYXMgKHN0cmluZ1tdIHwgc3RyaW5nKSksIGNhbGxiYWNrKTtcbiAgICByZXR1cm47XG4gIH0gZWxzZSBpZiAoXy5pc0Z1bmN0aW9uKHBhY2thZ2VMaXN0KSkge1xuICAgIC8vIGFyZ3VtZW50cy5sZW5ndGggPD0gMlxuICAgIHByb2plY3REaXIgPSByZWNpcGVUeXBlO1xuICAgIHJlY2lwZVR5cGUgPSBjYWxsYmFjayBhcyAnc3JjJyB8ICdpbnN0YWxsZWQnO1xuICAgIGNhbGxiYWNrID0gcGFja2FnZUxpc3Q7XG4gIH1cbiAgcmV0dXJuIGZpbmRQYWNrYWdlQnlUeXBlKCcqJywgY2FsbGJhY2sgYXMgRmluZFBhY2thZ2VDYiwgcmVjaXBlVHlwZSBhcyAnc3JjJyB8ICdpbnN0YWxsZWQnLFxuICAgIHByb2plY3REaXIpO1xufVxuXG4vLyBleHBvcnQge2VhY2hSZWNpcGV9IGZyb20gJy4vcmVjaXBlLW1hbmFnZXInO1xuXG5leHBvcnQge2xvb2t1cFBhY2thZ2VKc29uIGFzIGZpbmRQYWNrYWdlSnNvblBhdGh9O1xuXG5leHBvcnQgZnVuY3Rpb24gZmluZFBhY2thZ2VCeVR5cGUoX3R5cGVzOiBQYWNrYWdlVHlwZSB8IFBhY2thZ2VUeXBlW10sXG4gIGNhbGxiYWNrOiBGaW5kUGFja2FnZUNiLCByZWNpcGVUeXBlPzogJ3NyYycgfCAnaW5zdGFsbGVkJywgcHJvamVjdERpcj86IHN0cmluZ1tdIHwgc3RyaW5nKSB7XG5cbiAgY29uc3QgYXJyID0gQXJyYXkuaXNBcnJheShwcm9qZWN0RGlyKSA/IHByb2plY3REaXIgOiBwcm9qZWN0RGlyID09IG51bGwgPyBwcm9qZWN0RGlyIDogW3Byb2plY3REaXJdO1xuICBmb3IgKGNvbnN0IHBrZyBvZiBhbGxQYWNrYWdlcyhfdHlwZXMsIHJlY2lwZVR5cGUsIGFycikpIHtcbiAgICBjYWxsYmFjayhwa2cubmFtZSwgcGtnLnBhdGgsIHtzY29wZTogcGtnLnNjb3BlLCBuYW1lOiBwa2cuc2hvcnROYW1lfSwgcGtnLmpzb24sIHBrZy5yZWFsUGF0aCwgcGtnLmlzSW5zdGFsbGVkKTtcbiAgfVxufVxuXG4vKiogSW5jbHVkaW5nIGluc3RhbGxlZCBwYWNrYWdlIGZyb20gYWxsIHdvcmtzcGFjZXMsIHVubGlrZSBwYWNrYWdlczRDdXJyZW50V29ya3NwYWNlKCkgd2hpY2ggb25seSBpbmNsdWRlXG4gKiBsaW5rZWQgYW5kIGluc3RhbGxlZFxuICogcGFja2FnZXMgdGhhdCBhcmUgZGVwZW5kZWQgaW4gY3VycmVudCB3b3Jrc3BhY2UgcGFja2FnZS5qc29uIGZpbGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uKiBhbGxQYWNrYWdlcyhfdHlwZXM/OiBQYWNrYWdlVHlwZSB8IFBhY2thZ2VUeXBlW10sXG4gIHJlY2lwZVR5cGU/OiAnc3JjJyB8ICdpbnN0YWxsZWQnLCBwcm9qZWN0RGlycz86IHN0cmluZ1tdKTogR2VuZXJhdG9yPFBhY2thZ2VJbmZvPiB7XG5cbiAgLy8gY29uc3Qgd3NLZXkgPSBwYXRoVG9Xb3Jrc3BhY2UocHJvY2Vzcy5jd2QoKSk7XG5cbiAgaWYgKHJlY2lwZVR5cGUgIT09ICdpbnN0YWxsZWQnKSB7XG4gICAgaWYgKHByb2plY3REaXJzKSB7XG4gICAgICBmb3IgKGNvbnN0IHByb2plY3REaXIgb2YgcHJvamVjdERpcnMpIHtcbiAgICAgICAgY29uc3QgcHJvaktleSA9IHBhdGhUb1Byb2pLZXkocHJvamVjdERpcik7XG4gICAgICAgIGNvbnN0IHBrZ05hbWVzID0gZ2V0U3RhdGUoKS5wcm9qZWN0MlBhY2thZ2VzLmdldChwcm9qS2V5KTtcbiAgICAgICAgaWYgKHBrZ05hbWVzID09IG51bGwpXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICBmb3IgKGNvbnN0IHBrZ05hbWUgb2YgcGtnTmFtZXMpIHtcbiAgICAgICAgICBjb25zdCBwa2cgPSBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmdldChwa2dOYW1lKTtcbiAgICAgICAgICBpZiAocGtnKSB7XG4gICAgICAgICAgICB5aWVsZCBwa2c7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAoY29uc3QgcGtnIG9mIGdldFN0YXRlKCkuc3JjUGFja2FnZXMudmFsdWVzKCkpIHtcbiAgICAgICAgeWllbGQgcGtnO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBpZiAocmVjaXBlVHlwZSAhPT0gJ3NyYycpIHtcbiAgICBmb3IgKGNvbnN0IHdzIG9mIGdldFN0YXRlKCkud29ya3NwYWNlcy52YWx1ZXMoKSkge1xuICAgICAgY29uc3QgaW5zdGFsbGVkID0gd3MuaW5zdGFsbGVkQ29tcG9uZW50cztcbiAgICAgIGlmIChpbnN0YWxsZWQpIHtcbiAgICAgICAgZm9yIChjb25zdCBjb21wIG9mIGluc3RhbGxlZC52YWx1ZXMoKSkge1xuICAgICAgICAgIHlpZWxkIGNvbXA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uKiBwYWNrYWdlczRXb3Jrc3BhY2VLZXkod3NLZXk6IHN0cmluZywgaW5jbHVkZUluc3RhbGxlZCA9IHRydWUpIHtcbiAgY29uc3Qgd3MgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KTtcbiAgaWYgKCF3cylcbiAgICByZXR1cm47XG5cbiAgY29uc3QgbGlua2VkID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcztcbiAgY29uc3QgaW5zdGFsbGVkID0gd3MuaW5zdGFsbGVkQ29tcG9uZW50cztcbiAgZm9yIChjb25zdCBbcGtOYW1lXSBvZiB3cy5saW5rZWREZXBlbmRlbmNpZXMpIHtcbiAgICBjb25zdCBwayA9IGxpbmtlZC5nZXQocGtOYW1lKTtcbiAgICBpZiAocGsgPT0gbnVsbClcbiAgICAgIGxvZy53YXJuKGBNaXNzaW5nIHBhY2thZ2UgJHtwa05hbWV9IGluIHdvcmtzcGFjZSAke3dzS2V5fWApO1xuICAgIGVsc2VcbiAgICAgIHlpZWxkIHBrO1xuICB9XG4gIGZvciAoY29uc3QgW3BrTmFtZV0gb2Ygd3MubGlua2VkRGV2RGVwZW5kZW5jaWVzKSB7XG4gICAgY29uc3QgcGsgPSBsaW5rZWQuZ2V0KHBrTmFtZSk7XG4gICAgaWYgKHBrID09IG51bGwpXG4gICAgICBsb2cud2FybihgTWlzc2luZyBwYWNrYWdlICR7cGtOYW1lfSBpbiB3b3Jrc3BhY2UgJHt3c0tleX1gKTtcbiAgICBlbHNlXG4gICAgICB5aWVsZCBwaztcbiAgfVxuICBpZiAoaW5jbHVkZUluc3RhbGxlZCAmJiBpbnN0YWxsZWQpIHtcbiAgICBmb3IgKGNvbnN0IGNvbXAgb2YgaW5zdGFsbGVkLnZhbHVlcygpKSB7XG4gICAgICB5aWVsZCBjb21wO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFja2FnZXM0V29ya3NwYWNlKHdvcmtzcGFjZURpcj86IHN0cmluZywgaW5jbHVkZUluc3RhbGxlZCA9IHRydWUpIHtcbiAgY29uc3Qgd3NLZXkgPSB3b3Jrc3BhY2VLZXkod29ya3NwYWNlRGlyIHx8IHByb2Nlc3MuY3dkKCkpO1xuICByZXR1cm4gcGFja2FnZXM0V29ya3NwYWNlS2V5KHdzS2V5LCBpbmNsdWRlSW5zdGFsbGVkKTtcbn1cblxuLyoqXG4gKiBEZWZhdWx0IHR5cGUgcm9vdHMgZGVmaW5lZCBpbiBwYWNrYWdlcywgaW5jbHVkaW5nIGxpbmtlZCBhbmQgaW5zdGFsbGVkIHBhY2thZ2VzXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiAqdHlwZVJvb3RzRnJvbVBhY2thZ2VzKHdza2V5OiBzdHJpbmcpIHtcbiAgZm9yIChjb25zdCBwa2cgb2YgcGFja2FnZXM0V29ya3NwYWNlS2V5KHdza2V5KSkge1xuICAgIGNvbnN0IHR5cGVEaXIgPSBQYXRoLnJlc29sdmUocGtnLnJlYWxQYXRoLCAndHlwZXMnKTtcbiAgICB0cnkge1xuICAgICAgaWYgKGZzLnN0YXRTeW5jKHR5cGVEaXIpLmlzRGlyZWN0b3J5KCkpIHtcbiAgICAgICAgeWllbGQgdHlwZURpcjtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==