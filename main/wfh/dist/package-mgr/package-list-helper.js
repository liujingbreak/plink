"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setTsCompilerOptForNodePath = exports.packages4Workspace = exports.packages4WorkspaceKey = exports.allPackages = void 0;
const index_1 = require("./index");
const path_1 = __importDefault(require("path"));
const node_path_1 = require("../node-path");
const lodash_1 = __importDefault(require("lodash"));
const log4js_1 = require("log4js");
const log = log4js_1.getLogger('plink.package-list-helper');
function* allPackages(_types, recipeType, projectDirs) {
    // const wsKey = pathToWorkspace(process.cwd());
    if (recipeType !== 'installed') {
        if (projectDirs) {
            for (const projectDir of projectDirs) {
                const projKey = index_1.pathToProjKey(projectDir);
                const pkgNames = index_1.getState().project2Packages.get(projKey);
                if (pkgNames == null)
                    return;
                for (const pkgName of pkgNames) {
                    const pkg = index_1.getState().srcPackages.get(pkgName);
                    if (pkg) {
                        yield pkg;
                    }
                }
            }
        }
        else {
            for (const pkg of index_1.getState().srcPackages.values()) {
                yield pkg;
            }
        }
    }
    if (recipeType !== 'src') {
        for (const ws of index_1.getState().workspaces.values()) {
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
    const ws = index_1.getState().workspaces.get(wsKey);
    if (!ws)
        return;
    const linked = index_1.getState().srcPackages;
    const installed = ws.installedComponents;
    for (const [pkName] of ws.linkedDependencies) {
        const pk = linked.get(pkName);
        if (pk == null)
            log.error(`Missing package ${pkName} in workspace ${wsKey}`);
        else
            yield pk;
    }
    for (const [pkName] of ws.linkedDevDependencies) {
        const pk = linked.get(pkName);
        if (pk == null)
            log.error(`Missing package ${pkName} in workspace ${wsKey}`);
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
    const wsKey = index_1.workspaceKey(workspaceDir || process.cwd());
    return packages4WorkspaceKey(wsKey, includeInstalled);
}
exports.packages4Workspace = packages4Workspace;
/**
 * Set "baseUrl", "paths" and "typeRoots" property relative to tsconfigDir, process.cwd()
 * and process.env.NODE_PATHS
 * @param tsconfigDir project directory where tsconfig file is (virtual),
 * "baseUrl", "typeRoots" is relative to this parameter
 * @param baseUrl compiler option "baseUrl", "paths" will be relative to this paremter
 * @param assigneeOptions
 */
function setTsCompilerOptForNodePath(tsconfigDir, baseUrl = './', assigneeOptions, opts = { enableTypeRoots: false }) {
    const { rootDir } = JSON.parse(process.env.__plink);
    let symlinkDir;
    let pathsDirs = [];
    // workspace node_modules should be the first
    if (opts.workspaceDir != null) {
        symlinkDir = path_1.default.resolve(opts.workspaceDir, '.links');
        // pathsDirs.push(Path.resolve(opts.workspaceDir, 'node_modules'));
        pathsDirs.push(...node_path_1.calcNodePaths(rootDir, symlinkDir, opts.workspaceDir || process.cwd()));
    }
    if (opts.extraNodePath && opts.extraNodePath.length > 0) {
        pathsDirs.push(...opts.extraNodePath);
    }
    pathsDirs = lodash_1.default.uniq(pathsDirs);
    if (opts.noSymlinks && symlinkDir) {
        const idx = pathsDirs.indexOf(symlinkDir);
        if (idx >= 0) {
            pathsDirs.splice(idx, 1);
        }
    }
    if (path_1.default.isAbsolute(baseUrl)) {
        let relBaseUrl = path_1.default.relative(tsconfigDir, baseUrl);
        if (!relBaseUrl.startsWith('.'))
            relBaseUrl = './' + relBaseUrl;
        baseUrl = relBaseUrl;
    }
    if (assigneeOptions.paths == null)
        assigneeOptions.paths = {};
    const absBaseUrl = path_1.default.resolve(tsconfigDir, baseUrl);
    // if (opts.workspaceDir != null) {
    //   assigneeOptions.paths['_package-settings'] = [
    //     Path.relative(absBaseUrl, opts.workspaceDir).replace(/\\/g, '/') + '/_package-settings'];
    // }
    assigneeOptions.baseUrl = baseUrl.replace(/\\/g, '/');
    const otherPaths = assigneeOptions.paths['*'] = [];
    for (const dir of pathsDirs) {
        const relativeDir = path_1.default.relative(absBaseUrl, dir).replace(/\\/g, '/');
        // IMPORTANT: `@type/*` must be prio to `/*`, for those packages have no type definintion
        otherPaths.push(path_1.default.join(relativeDir, '@types/*').replace(/\\/g, '/'));
        otherPaths.push(path_1.default.join(relativeDir, '*').replace(/\\/g, '/'));
    }
    assigneeOptions.typeRoots = opts.noTypeRootsInPackages ? [] : [
        path_1.default.relative(tsconfigDir, path_1.default.resolve(__dirname, '../../types')).replace(/\\/g, '/'),
        ...typeRootsInPackages(opts.workspaceDir).map(dir => path_1.default.relative(tsconfigDir, dir).replace(/\\/g, '/'))
    ];
    if (opts.enableTypeRoots) {
        assigneeOptions.typeRoots.push(...pathsDirs.map(dir => {
            const relativeDir = path_1.default.relative(tsconfigDir, dir).replace(/\\/g, '/');
            return relativeDir + '/@types';
        }));
    }
    if (opts.extraTypeRoot) {
        assigneeOptions.typeRoots.push(...opts.extraTypeRoot.map(dir => path_1.default.relative(tsconfigDir, dir).replace(/\\/g, '/')));
    }
    if (assigneeOptions.typeRoots.length === 0)
        delete assigneeOptions.typeRoots;
    return assigneeOptions;
}
exports.setTsCompilerOptForNodePath = setTsCompilerOptForNodePath;
function typeRootsInPackages(onlyIncludeWorkspace) {
    // const {getState, workspaceKey}: typeof _pkgMgr = require('./package-mgr');
    const wsKeys = onlyIncludeWorkspace ? [index_1.workspaceKey(onlyIncludeWorkspace)] : index_1.getState().workspaces.keys();
    const dirs = [];
    for (const wsKey of wsKeys) {
        for (const pkg of packages4WorkspaceKey(wsKey)) {
            if (pkg.json.dr.typeRoot) {
                const dir = path_1.default.resolve(pkg.realPath, pkg.json.dr.typeRoot);
                dirs.push(dir);
            }
        }
    }
    return dirs;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1saXN0LWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsbUNBQTJFO0FBQzNFLGdEQUF3QjtBQUN4Qiw0Q0FBcUQ7QUFDckQsb0RBQXVCO0FBQ3ZCLG1DQUFpQztBQUdqQyxNQUFNLEdBQUcsR0FBRyxrQkFBUyxDQUFDLDJCQUEyQixDQUFDLENBQUM7QUFFbkQsUUFBZSxDQUFDLENBQUMsV0FBVyxDQUFDLE1BQW9DLEVBQy9ELFVBQWdDLEVBQUUsV0FBc0I7SUFFeEQsZ0RBQWdEO0lBRWhELElBQUksVUFBVSxLQUFLLFdBQVcsRUFBRTtRQUM5QixJQUFJLFdBQVcsRUFBRTtZQUNmLEtBQUssTUFBTSxVQUFVLElBQUksV0FBVyxFQUFFO2dCQUNwQyxNQUFNLE9BQU8sR0FBRyxxQkFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUMxQyxNQUFNLFFBQVEsR0FBRyxnQkFBUSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUMxRCxJQUFJLFFBQVEsSUFBSSxJQUFJO29CQUNsQixPQUFPO2dCQUNULEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFO29CQUM5QixNQUFNLEdBQUcsR0FBRyxnQkFBUSxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDaEQsSUFBSSxHQUFHLEVBQUU7d0JBQ1AsTUFBTSxHQUFHLENBQUM7cUJBQ1g7aUJBQ0Y7YUFDRjtTQUNGO2FBQU07WUFDTCxLQUFLLE1BQU0sR0FBRyxJQUFJLGdCQUFRLEVBQUUsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQ2pELE1BQU0sR0FBRyxDQUFDO2FBQ1g7U0FDRjtLQUNGO0lBQ0QsSUFBSSxVQUFVLEtBQUssS0FBSyxFQUFFO1FBQ3hC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QUFFLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQzdELElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDaEI7U0FDRjtLQUNGO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtnZXRTdGF0ZSwgcGF0aFRvUHJvaktleSwgd29ya3NwYWNlS2V5LCBQYWNrYWdlSW5mb30gZnJvbSAnLi9pbmRleCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7UGxpbmtFbnYsIGNhbGNOb2RlUGF0aHN9IGZyb20gJy4uL25vZGUtcGF0aCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5cbmV4cG9ydCB0eXBlIFBhY2thZ2VUeXBlID0gJyonIHwgJ2J1aWxkJyB8ICdjb3JlJztcbmNvbnN0IGxvZyA9IGdldExvZ2dlcigncGxpbmsucGFja2FnZS1saXN0LWhlbHBlcicpO1xuXG5leHBvcnQgZnVuY3Rpb24qIGFsbFBhY2thZ2VzKF90eXBlcz86IFBhY2thZ2VUeXBlIHwgUGFja2FnZVR5cGVbXSxcbiAgcmVjaXBlVHlwZT86ICdzcmMnIHwgJ2luc3RhbGxlZCcsIHByb2plY3REaXJzPzogc3RyaW5nW10pOiBHZW5lcmF0b3I8UGFja2FnZUluZm8+IHtcblxuICAvLyBjb25zdCB3c0tleSA9IHBhdGhUb1dvcmtzcGFjZShwcm9jZXNzLmN3ZCgpKTtcblxuICBpZiAocmVjaXBlVHlwZSAhPT0gJ2luc3RhbGxlZCcpIHtcbiAgICBpZiAocHJvamVjdERpcnMpIHtcbiAgICAgIGZvciAoY29uc3QgcHJvamVjdERpciBvZiBwcm9qZWN0RGlycykge1xuICAgICAgICBjb25zdCBwcm9qS2V5ID0gcGF0aFRvUHJvaktleShwcm9qZWN0RGlyKTtcbiAgICAgICAgY29uc3QgcGtnTmFtZXMgPSBnZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMuZ2V0KHByb2pLZXkpO1xuICAgICAgICBpZiAocGtnTmFtZXMgPT0gbnVsbClcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIGZvciAoY29uc3QgcGtnTmFtZSBvZiBwa2dOYW1lcykge1xuICAgICAgICAgIGNvbnN0IHBrZyA9IGdldFN0YXRlKCkuc3JjUGFja2FnZXMuZ2V0KHBrZ05hbWUpO1xuICAgICAgICAgIGlmIChwa2cpIHtcbiAgICAgICAgICAgIHlpZWxkIHBrZztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yIChjb25zdCBwa2cgb2YgZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy52YWx1ZXMoKSkge1xuICAgICAgICB5aWVsZCBwa2c7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmIChyZWNpcGVUeXBlICE9PSAnc3JjJykge1xuICAgIGZvciAoY29uc3Qgd3Mgb2YgZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLnZhbHVlcygpKSB7XG4gICAgICBjb25zdCBpbnN0YWxsZWQgPSB3cy5pbnN0YWxsZWRDb21wb25lbnRzO1xuICAgICAgaWYgKGluc3RhbGxlZCkge1xuICAgICAgICBmb3IgKGNvbnN0IGNvbXAgb2YgaW5zdGFsbGVkLnZhbHVlcygpKSB7XG4gICAgICAgICAgeWllbGQgY29tcDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24qIHBhY2thZ2VzNFdvcmtzcGFjZUtleSh3c0tleTogc3RyaW5nLCBpbmNsdWRlSW5zdGFsbGVkID0gdHJ1ZSk6IEdlbmVyYXRvcjxQYWNrYWdlSW5mbz4ge1xuICBjb25zdCB3cyA9IGdldFN0YXRlKCkud29ya3NwYWNlcy5nZXQod3NLZXkpO1xuICBpZiAoIXdzKVxuICAgIHJldHVybjtcblxuICBjb25zdCBsaW5rZWQgPSBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzO1xuICBjb25zdCBpbnN0YWxsZWQgPSB3cy5pbnN0YWxsZWRDb21wb25lbnRzO1xuICBmb3IgKGNvbnN0IFtwa05hbWVdIG9mIHdzLmxpbmtlZERlcGVuZGVuY2llcykge1xuICAgIGNvbnN0IHBrID0gbGlua2VkLmdldChwa05hbWUpO1xuICAgIGlmIChwayA9PSBudWxsKVxuICAgICAgbG9nLmVycm9yKGBNaXNzaW5nIHBhY2thZ2UgJHtwa05hbWV9IGluIHdvcmtzcGFjZSAke3dzS2V5fWApO1xuICAgIGVsc2VcbiAgICAgIHlpZWxkIHBrO1xuICB9XG4gIGZvciAoY29uc3QgW3BrTmFtZV0gb2Ygd3MubGlua2VkRGV2RGVwZW5kZW5jaWVzKSB7XG4gICAgY29uc3QgcGsgPSBsaW5rZWQuZ2V0KHBrTmFtZSk7XG4gICAgaWYgKHBrID09IG51bGwpXG4gICAgICBsb2cuZXJyb3IoYE1pc3NpbmcgcGFja2FnZSAke3BrTmFtZX0gaW4gd29ya3NwYWNlICR7d3NLZXl9YCk7XG4gICAgZWxzZVxuICAgICAgeWllbGQgcGs7XG4gIH1cbiAgaWYgKGluY2x1ZGVJbnN0YWxsZWQgJiYgaW5zdGFsbGVkKSB7XG4gICAgZm9yIChjb25zdCBjb21wIG9mIGluc3RhbGxlZC52YWx1ZXMoKSkge1xuICAgICAgeWllbGQgY29tcDtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhY2thZ2VzNFdvcmtzcGFjZSh3b3Jrc3BhY2VEaXI/OiBzdHJpbmcsIGluY2x1ZGVJbnN0YWxsZWQgPSB0cnVlKSB7XG4gIGNvbnN0IHdzS2V5ID0gd29ya3NwYWNlS2V5KHdvcmtzcGFjZURpciB8fCBwcm9jZXNzLmN3ZCgpKTtcbiAgcmV0dXJuIHBhY2thZ2VzNFdvcmtzcGFjZUtleSh3c0tleSwgaW5jbHVkZUluc3RhbGxlZCk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZXJPcHRpb25TZXRPcHQge1xuICAvKiogV2lsbCBhZGQgdHlwZVJvb3RzIHByb3BlcnR5IGZvciBzcGVjaWZpYyB3b3Jrc3BhY2UsIGFuZCBhZGQgcGF0aHMgb2YgZmlsZSBcIl9wYWNrYWdlLXNldHRpbmdzLmQudHNcIiAqL1xuICB3b3Jrc3BhY2VEaXI/OiBzdHJpbmc7XG4gIGVuYWJsZVR5cGVSb290cz86IGJvb2xlYW47XG4gIG5vVHlwZVJvb3RzSW5QYWNrYWdlcz86IGJvb2xlYW47XG4gIC8qKiBEZWZhdWx0IGZhbHNlLCBEbyBub3QgaW5jbHVkZSBsaW5rZWQgcGFja2FnZSBzeW1saW5rcyBkaXJlY3RvcnkgaW4gcGF0aCovXG4gIG5vU3ltbGlua3M/OiBib29sZWFuO1xuICBleHRyYU5vZGVQYXRoPzogc3RyaW5nW107XG4gIGV4dHJhVHlwZVJvb3Q/OiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb21waWxlck9wdGlvbnMge1xuICBiYXNlVXJsOiBzdHJpbmc7XG4gIHR5cGVSb290czogc3RyaW5nW107XG4gIHBhdGhzOiB7W3BhdGg6IHN0cmluZ106IHN0cmluZ1tdfTtcbiAgW2tleTogc3RyaW5nXTogYW55O1xufVxuLyoqXG4gKiBTZXQgXCJiYXNlVXJsXCIsIFwicGF0aHNcIiBhbmQgXCJ0eXBlUm9vdHNcIiBwcm9wZXJ0eSByZWxhdGl2ZSB0byB0c2NvbmZpZ0RpciwgcHJvY2Vzcy5jd2QoKVxuICogYW5kIHByb2Nlc3MuZW52Lk5PREVfUEFUSFNcbiAqIEBwYXJhbSB0c2NvbmZpZ0RpciBwcm9qZWN0IGRpcmVjdG9yeSB3aGVyZSB0c2NvbmZpZyBmaWxlIGlzICh2aXJ0dWFsKSxcbiAqIFwiYmFzZVVybFwiLCBcInR5cGVSb290c1wiIGlzIHJlbGF0aXZlIHRvIHRoaXMgcGFyYW1ldGVyXG4gKiBAcGFyYW0gYmFzZVVybCBjb21waWxlciBvcHRpb24gXCJiYXNlVXJsXCIsIFwicGF0aHNcIiB3aWxsIGJlIHJlbGF0aXZlIHRvIHRoaXMgcGFyZW10ZXJcbiAqIEBwYXJhbSBhc3NpZ25lZU9wdGlvbnMgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgoXG4gIHRzY29uZmlnRGlyOiBzdHJpbmcsXG4gIGJhc2VVcmwgPSAnLi8nLFxuICBhc3NpZ25lZU9wdGlvbnM6IFBhcnRpYWw8Q29tcGlsZXJPcHRpb25zPixcbiAgb3B0czogQ29tcGlsZXJPcHRpb25TZXRPcHQgPSB7ZW5hYmxlVHlwZVJvb3RzOiBmYWxzZX0pIHtcblxuICBjb25zdCB7cm9vdERpcn0gPSBKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmshKSBhcyBQbGlua0VudjtcbiAgbGV0IHN5bWxpbmtEaXI6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgbGV0IHBhdGhzRGlyczogc3RyaW5nW10gPSBbXTtcbiAgLy8gd29ya3NwYWNlIG5vZGVfbW9kdWxlcyBzaG91bGQgYmUgdGhlIGZpcnN0XG4gIGlmIChvcHRzLndvcmtzcGFjZURpciAhPSBudWxsKSB7XG4gICAgc3ltbGlua0RpciA9IFBhdGgucmVzb2x2ZShvcHRzLndvcmtzcGFjZURpciwgJy5saW5rcycpO1xuICAgIC8vIHBhdGhzRGlycy5wdXNoKFBhdGgucmVzb2x2ZShvcHRzLndvcmtzcGFjZURpciwgJ25vZGVfbW9kdWxlcycpKTtcbiAgICBwYXRoc0RpcnMucHVzaCguLi5jYWxjTm9kZVBhdGhzKHJvb3REaXIsIHN5bWxpbmtEaXIsIG9wdHMud29ya3NwYWNlRGlyIHx8IHByb2Nlc3MuY3dkKCkpKTtcbiAgfVxuXG4gIGlmIChvcHRzLmV4dHJhTm9kZVBhdGggJiYgb3B0cy5leHRyYU5vZGVQYXRoLmxlbmd0aCA+IDApIHtcbiAgICBwYXRoc0RpcnMucHVzaCguLi5vcHRzLmV4dHJhTm9kZVBhdGgpO1xuICB9XG5cbiAgcGF0aHNEaXJzID0gXy51bmlxKHBhdGhzRGlycyk7XG5cbiAgaWYgKG9wdHMubm9TeW1saW5rcyAmJiBzeW1saW5rRGlyKSB7XG4gICAgY29uc3QgaWR4ID0gcGF0aHNEaXJzLmluZGV4T2Yoc3ltbGlua0Rpcik7XG4gICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICBwYXRoc0RpcnMuc3BsaWNlKGlkeCwgMSk7XG4gICAgfVxuICB9XG5cbiAgaWYgKFBhdGguaXNBYnNvbHV0ZShiYXNlVXJsKSkge1xuICAgIGxldCByZWxCYXNlVXJsID0gUGF0aC5yZWxhdGl2ZSh0c2NvbmZpZ0RpciwgYmFzZVVybCk7XG4gICAgaWYgKCFyZWxCYXNlVXJsLnN0YXJ0c1dpdGgoJy4nKSlcbiAgICAgIHJlbEJhc2VVcmwgPSAnLi8nICsgcmVsQmFzZVVybDtcbiAgICBiYXNlVXJsID0gcmVsQmFzZVVybDtcbiAgfVxuXG4gIGlmIChhc3NpZ25lZU9wdGlvbnMucGF0aHMgPT0gbnVsbClcbiAgICBhc3NpZ25lZU9wdGlvbnMucGF0aHMgPSB7fTtcblxuICBjb25zdCBhYnNCYXNlVXJsID0gUGF0aC5yZXNvbHZlKHRzY29uZmlnRGlyLCBiYXNlVXJsKTtcbiAgLy8gaWYgKG9wdHMud29ya3NwYWNlRGlyICE9IG51bGwpIHtcbiAgLy8gICBhc3NpZ25lZU9wdGlvbnMucGF0aHNbJ19wYWNrYWdlLXNldHRpbmdzJ10gPSBbXG4gIC8vICAgICBQYXRoLnJlbGF0aXZlKGFic0Jhc2VVcmwsIG9wdHMud29ya3NwYWNlRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJykgKyAnL19wYWNrYWdlLXNldHRpbmdzJ107XG4gIC8vIH1cblxuICBhc3NpZ25lZU9wdGlvbnMuYmFzZVVybCA9IGJhc2VVcmwucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICBjb25zdCBvdGhlclBhdGhzOiBzdHJpbmdbXSA9IGFzc2lnbmVlT3B0aW9ucy5wYXRoc1snKiddID0gW107XG5cbiAgZm9yIChjb25zdCBkaXIgb2YgcGF0aHNEaXJzKSB7XG4gICAgY29uc3QgcmVsYXRpdmVEaXIgPSBQYXRoLnJlbGF0aXZlKGFic0Jhc2VVcmwsIGRpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIC8vIElNUE9SVEFOVDogYEB0eXBlLypgIG11c3QgYmUgcHJpbyB0byBgLypgLCBmb3IgdGhvc2UgcGFja2FnZXMgaGF2ZSBubyB0eXBlIGRlZmluaW50aW9uXG4gICAgb3RoZXJQYXRocy5wdXNoKFBhdGguam9pbihyZWxhdGl2ZURpciwgJ0B0eXBlcy8qJykucmVwbGFjZSgvXFxcXC9nLCAnLycpKTtcbiAgICBvdGhlclBhdGhzLnB1c2goUGF0aC5qb2luKHJlbGF0aXZlRGlyLCAnKicpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSk7XG4gIH1cblxuXG4gIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMgPSBvcHRzLm5vVHlwZVJvb3RzSW5QYWNrYWdlcyA/IFtdIDogW1xuICAgIFBhdGgucmVsYXRpdmUodHNjb25maWdEaXIsIFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90eXBlcycpKS5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4gICAgLi4udHlwZVJvb3RzSW5QYWNrYWdlcyhvcHRzLndvcmtzcGFjZURpcikubWFwKGRpciA9PiBQYXRoLnJlbGF0aXZlKHRzY29uZmlnRGlyLCBkaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSlcbiAgXTtcblxuICBpZiAob3B0cy5lbmFibGVUeXBlUm9vdHMgKSB7XG4gICAgYXNzaWduZWVPcHRpb25zLnR5cGVSb290cy5wdXNoKC4uLnBhdGhzRGlycy5tYXAoZGlyID0+IHtcbiAgICAgIGNvbnN0IHJlbGF0aXZlRGlyID0gUGF0aC5yZWxhdGl2ZSh0c2NvbmZpZ0RpciwgZGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICByZXR1cm4gcmVsYXRpdmVEaXIgKyAnL0B0eXBlcyc7XG4gICAgfSkpO1xuICB9XG5cbiAgaWYgKG9wdHMuZXh0cmFUeXBlUm9vdCkge1xuICAgIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMucHVzaCguLi5vcHRzLmV4dHJhVHlwZVJvb3QubWFwKFxuICAgICAgZGlyID0+IFBhdGgucmVsYXRpdmUodHNjb25maWdEaXIsIGRpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpKSk7XG4gIH1cblxuICBpZiAoYXNzaWduZWVPcHRpb25zLnR5cGVSb290cy5sZW5ndGggPT09IDApXG4gICAgZGVsZXRlIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHM7XG5cbiAgcmV0dXJuIGFzc2lnbmVlT3B0aW9ucyBhcyBDb21waWxlck9wdGlvbnM7XG59XG5cbmZ1bmN0aW9uIHR5cGVSb290c0luUGFja2FnZXMob25seUluY2x1ZGVXb3Jrc3BhY2U/OiBzdHJpbmcpIHtcbiAgLy8gY29uc3Qge2dldFN0YXRlLCB3b3Jrc3BhY2VLZXl9OiB0eXBlb2YgX3BrZ01nciA9IHJlcXVpcmUoJy4vcGFja2FnZS1tZ3InKTtcbiAgY29uc3Qgd3NLZXlzID0gb25seUluY2x1ZGVXb3Jrc3BhY2UgPyBbd29ya3NwYWNlS2V5KG9ubHlJbmNsdWRlV29ya3NwYWNlKV0gOiBnZXRTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpO1xuICBjb25zdCBkaXJzOiBzdHJpbmdbXSA9IFtdO1xuICBmb3IgKGNvbnN0IHdzS2V5IG9mIHdzS2V5cykge1xuICAgIGZvciAoY29uc3QgcGtnIG9mIHBhY2thZ2VzNFdvcmtzcGFjZUtleSh3c0tleSkpIHtcbiAgICAgIGlmIChwa2cuanNvbi5kci50eXBlUm9vdCkge1xuICAgICAgICBjb25zdCBkaXIgPSBQYXRoLnJlc29sdmUocGtnLnJlYWxQYXRoLCBwa2cuanNvbi5kci50eXBlUm9vdCk7XG4gICAgICAgIGRpcnMucHVzaChkaXIpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gZGlycztcbn1cbiJdfQ==