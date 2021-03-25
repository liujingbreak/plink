"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setTsCompilerOptForNodePath = exports.workspacesOfDependencies = exports.packages4Workspace = exports.packages4WorkspaceKey = exports.allPackages = void 0;
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
 * @returns a map of workspace keys of which has specified dependency
 */
function workspacesOfDependencies(...depPkgNames) {
    var _a;
    const deps = new Set(depPkgNames);
    const wsKeys = new Set();
    for (const [key, wsState] of index_1.getState().workspaces.entries()) {
        for (const [pkgName] of wsState.linkedDependencies.concat(wsState.linkedDevDependencies)) {
            if (deps.has(pkgName)) {
                wsKeys.add(key);
            }
        }
        for (const [pkgName] of ((_a = wsState.installedComponents) === null || _a === void 0 ? void 0 : _a.keys()) || []) {
            if (deps.has(pkgName)) {
                wsKeys.add(key);
            }
        }
    }
    return wsKeys;
}
exports.workspacesOfDependencies = workspacesOfDependencies;
/**
 * Set "baseUrl", "paths" and "typeRoots" property relative to tsconfigDir, process.cwd()
 * and process.env.NODE_PATHS
 * @param tsconfigDir project directory where tsconfig file is (virtual),
 * "baseUrl", "typeRoots" is relative to this parameter
 * @param baseUrl compiler option "baseUrl", "paths" will be relative to this paremter
 * @param assigneeOptions
 */
function setTsCompilerOptForNodePath(tsconfigDir, baseUrl = './', assigneeOptions, opts = { enableTypeRoots: false }) {
    const { rootDir, plinkDir, symlinkDirName } = JSON.parse(process.env.__plink);
    let symlinksDir;
    /** for paths mapping "*" */
    let pathsDirs = [];
    // workspace node_modules should be the first
    const baseUrlAbsPath = path_1.default.resolve(tsconfigDir, baseUrl);
    if (opts.realPackagePaths) {
        if (assigneeOptions.paths == null) {
            assigneeOptions.paths = {};
        }
        Object.assign(assigneeOptions.paths, pathMappingForLinkedPkgs(baseUrlAbsPath));
    }
    let wsState;
    if (opts.workspaceDir != null) {
        symlinksDir = path_1.default.resolve(opts.workspaceDir, symlinkDirName);
        // pathsDirs.push(Path.resolve(opts.workspaceDir, 'node_modules'));
        pathsDirs.push(...node_path_1.calcNodePaths(rootDir, symlinksDir, opts.workspaceDir || process.cwd(), plinkDir));
        wsState = index_1.getState().workspaces.get(index_1.workspaceKey(opts.workspaceDir));
    }
    if (opts.extraNodePath && opts.extraNodePath.length > 0) {
        pathsDirs.push(...opts.extraNodePath);
    }
    pathsDirs = lodash_1.default.uniq(pathsDirs);
    if (opts.noSymlinks && symlinksDir) {
        const idx = pathsDirs.indexOf(symlinksDir);
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
    if (wsState) {
        assignSpecialPaths(wsState.installJson.dependencies, pathsDirs, assigneeOptions, baseUrlAbsPath);
        assignSpecialPaths(wsState.installJson.devDependencies, pathsDirs, assigneeOptions, baseUrlAbsPath);
        assignSpecialPaths(wsState.installJson.peerDependencies, pathsDirs, assigneeOptions, baseUrlAbsPath);
    }
    // if (opts.workspaceDir != null) {
    //   assigneeOptions.paths['_package-settings'] = [
    //     Path.relative(baseUrlAbsPath, opts.workspaceDir).replace(/\\/g, '/') + '/_package-settings'];
    // }
    assigneeOptions.baseUrl = baseUrl.replace(/\\/g, '/');
    if (assigneeOptions.paths['*'] == null)
        assigneeOptions.paths['*'] = [];
    const wildcardPaths = assigneeOptions.paths['*'];
    for (const dir of pathsDirs) {
        const relativeDir = path_1.default.relative(baseUrlAbsPath, dir).replace(/\\/g, '/');
        // IMPORTANT: `@type/*` must be prio to `/*`, for those packages have no type definintion
        wildcardPaths.push(path_1.default.join(relativeDir, '@types/*').replace(/\\/g, '/'));
        wildcardPaths.push(path_1.default.join(relativeDir, '*').replace(/\\/g, '/'));
    }
    assigneeOptions.paths['*'] = lodash_1.default.uniq(wildcardPaths);
    appendTypeRoots(pathsDirs, tsconfigDir, assigneeOptions, opts);
    return assigneeOptions;
}
exports.setTsCompilerOptForNodePath = setTsCompilerOptForNodePath;
/**
 * For those special scoped package which is like @loadable/component, its type definition package is
 * @types/loadable__component
 */
function assignSpecialPaths(dependencies, nodePaths, assigneeOptions, absBaseUrlPath) {
    if (dependencies == null)
        return;
    if (assigneeOptions.paths == null)
        assigneeOptions.paths = {};
    for (const item of Object.keys(dependencies)) {
        const m = /^@types\/(.*?)__(.*?)$/.exec(item);
        if (m) {
            const originPkgName = `@${m[1]}/${m[2]}`;
            const exactOne = assigneeOptions.paths[originPkgName] = [];
            const wildOne = assigneeOptions.paths[originPkgName + '/*'] = [];
            for (const dir of nodePaths) {
                const relativeDir = path_1.default.relative(absBaseUrlPath, dir + '/' + item).replace(/\\/g, '/');
                exactOne.push(relativeDir);
                wildOne.push(relativeDir + '/*');
            }
        }
    }
}
function pathMappingForLinkedPkgs(baseUrlAbsPath) {
    let drcpDir = (index_1.getState().linkedDrcp || index_1.getState().installedDrcp).realPath;
    const pathMapping = {};
    for (const [name, { realPath }] of index_1.getState().srcPackages.entries() || []) {
        const realDir = path_1.default.relative(baseUrlAbsPath, realPath).replace(/\\/g, '/');
        pathMapping[name] = [realDir];
        pathMapping[name + '/*'] = [realDir + '/*'];
    }
    // if (pkgName !== '@wfh/plink') {
    drcpDir = path_1.default.relative(baseUrlAbsPath, drcpDir).replace(/\\/g, '/');
    pathMapping['@wfh/plink'] = [drcpDir];
    pathMapping['@wfh/plink/*'] = [drcpDir + '/*'];
    return pathMapping;
}
/**
 *
 * @param pathsDirs Node path like path information
 * @param tsconfigDir
 * @param assigneeOptions
 * @param opts
 */
function appendTypeRoots(pathsDirs, tsconfigDir, assigneeOptions, opts) {
    if (!opts.noTypeRootsInPackages) {
        if (assigneeOptions.typeRoots == null)
            assigneeOptions.typeRoots = [];
        assigneeOptions.typeRoots.push(path_1.default.relative(tsconfigDir, path_1.default.resolve(__dirname, '../../types')).replace(/\\/g, '/'), ...typeRootsInPackages(opts.workspaceDir).map(dir => path_1.default.relative(tsconfigDir, dir).replace(/\\/g, '/')));
    }
    if (opts.enableTypeRoots) {
        if (assigneeOptions.typeRoots == null)
            assigneeOptions.typeRoots = [];
        assigneeOptions.typeRoots.push(...pathsDirs.map(dir => {
            const relativeDir = path_1.default.relative(tsconfigDir, dir).replace(/\\/g, '/');
            return relativeDir + '/@types';
        }));
    }
    if (opts.extraTypeRoot) {
        if (assigneeOptions.typeRoots == null)
            assigneeOptions.typeRoots = [];
        assigneeOptions.typeRoots.push(...opts.extraTypeRoot.map(dir => path_1.default.relative(tsconfigDir, dir).replace(/\\/g, '/')));
    }
    assigneeOptions.typeRoots = lodash_1.default.uniq(assigneeOptions.typeRoots);
    if (assigneeOptions.typeRoots != null && assigneeOptions.typeRoots.length === 0)
        delete assigneeOptions.typeRoots;
}
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1saXN0LWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsbUNBQTJGO0FBQzNGLGdEQUF3QjtBQUN4Qiw0Q0FBcUQ7QUFDckQsb0RBQXVCO0FBQ3ZCLG1DQUFpQztBQUdqQyxNQUFNLEdBQUcsR0FBRyxrQkFBUyxDQUFDLDJCQUEyQixDQUFDLENBQUM7QUFFbkQsUUFBZSxDQUFDLENBQUMsV0FBVyxDQUFDLE1BQW9DLEVBQy9ELFVBQWdDLEVBQUUsV0FBc0I7SUFFeEQsZ0RBQWdEO0lBRWhELElBQUksVUFBVSxLQUFLLFdBQVcsRUFBRTtRQUM5QixJQUFJLFdBQVcsRUFBRTtZQUNmLEtBQUssTUFBTSxVQUFVLElBQUksV0FBVyxFQUFFO2dCQUNwQyxNQUFNLE9BQU8sR0FBRyxxQkFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUMxQyxNQUFNLFFBQVEsR0FBRyxnQkFBUSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUMxRCxJQUFJLFFBQVEsSUFBSSxJQUFJO29CQUNsQixPQUFPO2dCQUNULEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFO29CQUM5QixNQUFNLEdBQUcsR0FBRyxnQkFBUSxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDaEQsSUFBSSxHQUFHLEVBQUU7d0JBQ1AsTUFBTSxHQUFHLENBQUM7cUJBQ1g7aUJBQ0Y7YUFDRjtTQUNGO2FBQU07WUFDTCxLQUFLLE1BQU0sR0FBRyxJQUFJLGdCQUFRLEVBQUUsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQ2pELE1BQU0sR0FBRyxDQUFDO2FBQ1g7U0FDRjtLQUNGO0lBQ0QsSUFBSSxVQUFVLEtBQUssS0FBSyxFQUFFO1FBQ3hC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dGVudCI6WyJpbXBvcnQge2dldFN0YXRlLCBwYXRoVG9Qcm9qS2V5LCB3b3Jrc3BhY2VLZXksIFBhY2thZ2VJbmZvLCBXb3Jrc3BhY2VTdGF0ZX0gZnJvbSAnLi9pbmRleCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7UGxpbmtFbnYsIGNhbGNOb2RlUGF0aHN9IGZyb20gJy4uL25vZGUtcGF0aCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5cbmV4cG9ydCB0eXBlIFBhY2thZ2VUeXBlID0gJyonIHwgJ2J1aWxkJyB8ICdjb3JlJztcbmNvbnN0IGxvZyA9IGdldExvZ2dlcigncGxpbmsucGFja2FnZS1saXN0LWhlbHBlcicpO1xuXG5leHBvcnQgZnVuY3Rpb24qIGFsbFBhY2thZ2VzKF90eXBlcz86IFBhY2thZ2VUeXBlIHwgUGFja2FnZVR5cGVbXSxcbiAgcmVjaXBlVHlwZT86ICdzcmMnIHwgJ2luc3RhbGxlZCcsIHByb2plY3REaXJzPzogc3RyaW5nW10pOiBHZW5lcmF0b3I8UGFja2FnZUluZm8+IHtcblxuICAvLyBjb25zdCB3c0tleSA9IHBhdGhUb1dvcmtzcGFjZShwcm9jZXNzLmN3ZCgpKTtcblxuICBpZiAocmVjaXBlVHlwZSAhPT0gJ2luc3RhbGxlZCcpIHtcbiAgICBpZiAocHJvamVjdERpcnMpIHtcbiAgICAgIGZvciAoY29uc3QgcHJvamVjdERpciBvZiBwcm9qZWN0RGlycykge1xuICAgICAgICBjb25zdCBwcm9qS2V5ID0gcGF0aFRvUHJvaktleShwcm9qZWN0RGlyKTtcbiAgICAgICAgY29uc3QgcGtnTmFtZXMgPSBnZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMuZ2V0KHByb2pLZXkpO1xuICAgICAgICBpZiAocGtnTmFtZXMgPT0gbnVsbClcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIGZvciAoY29uc3QgcGtnTmFtZSBvZiBwa2dOYW1lcykge1xuICAgICAgICAgIGNvbnN0IHBrZyA9IGdldFN0YXRlKCkuc3JjUGFja2FnZXMuZ2V0KHBrZ05hbWUpO1xuICAgICAgICAgIGlmIChwa2cpIHtcbiAgICAgICAgICAgIHlpZWxkIHBrZztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yIChjb25zdCBwa2cgb2YgZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy52YWx1ZXMoKSkge1xuICAgICAgICB5aWVsZCBwa2c7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmIChyZWNpcGVUeXBlICE9PSAnc3JjJykge1xuICAgIGZvciAoY29uc3Qgd3Mgb2YgZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLnZhbHVlcygpKSB7XG4gICAgICBjb25zdCBpbnN0YWxsZWQgPSB3cy5pbnN0YWxsZWRDb21wb25lbnRzO1xuICAgICAgaWYgKGluc3RhbGxlZCkge1xuICAgICAgICBmb3IgKGNvbnN0IGNvbXAgb2YgaW5zdGFsbGVkLnZhbHVlcygpKSB7XG4gICAgICAgICAgeWllbGQgY29tcDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24qIHBhY2thZ2VzNFdvcmtzcGFjZUtleSh3c0tleTogc3RyaW5nLCBpbmNsdWRlSW5zdGFsbGVkID0gdHJ1ZSk6IEdlbmVyYXRvcjxQYWNrYWdlSW5mbz4ge1xuICBjb25zdCB3cyA9IGdldFN0YXRlKCkud29ya3NwYWNlcy5nZXQod3NLZXkpO1xuICBpZiAoIXdzKVxuICAgIHJldHVybjtcblxuICBjb25zdCBsaW5rZWQgPSBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzO1xuICBjb25zdCBpbnN0YWxsZWQgPSB3cy5pbnN0YWxsZWRDb21wb25lbnRzO1xuICBmb3IgKGNvbnN0IFtwa05hbWVdIG9mIHdzLmxpbmtlZERlcGVuZGVuY2llcykge1xuICAgIGNvbnN0IHBrID0gbGlua2VkLmdldChwa05hbWUpO1xuICAgIGlmIChwayA9PSBudWxsKVxuICAgICAgbG9nLmVycm9yKGBNaXNzaW5nIHBhY2thZ2UgJHtwa05hbWV9IGluIHdvcmtzcGFjZSAke3dzS2V5fWApO1xuICAgIGVsc2VcbiAgICAgIHlpZWxkIHBrO1xuICB9XG4gIGZvciAoY29uc3QgW3BrTmFtZV0gb2Ygd3MubGlua2VkRGV2RGVwZW5kZW5jaWVzKSB7XG4gICAgY29uc3QgcGsgPSBsaW5rZWQuZ2V0KHBrTmFtZSk7XG4gICAgaWYgKHBrID09IG51bGwpXG4gICAgICBsb2cuZXJyb3IoYE1pc3NpbmcgcGFja2FnZSAke3BrTmFtZX0gaW4gd29ya3NwYWNlICR7d3NLZXl9YCk7XG4gICAgZWxzZVxuICAgICAgeWllbGQgcGs7XG4gIH1cbiAgaWYgKGluY2x1ZGVJbnN0YWxsZWQgJiYgaW5zdGFsbGVkKSB7XG4gICAgZm9yIChjb25zdCBjb21wIG9mIGluc3RhbGxlZC52YWx1ZXMoKSkge1xuICAgICAgeWllbGQgY29tcDtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhY2thZ2VzNFdvcmtzcGFjZSh3b3Jrc3BhY2VEaXI/OiBzdHJpbmcsIGluY2x1ZGVJbnN0YWxsZWQgPSB0cnVlKSB7XG4gIGNvbnN0IHdzS2V5ID0gd29ya3NwYWNlS2V5KHdvcmtzcGFjZURpciB8fCBwcm9jZXNzLmN3ZCgpKTtcbiAgcmV0dXJuIHBhY2thZ2VzNFdvcmtzcGFjZUtleSh3c0tleSwgaW5jbHVkZUluc3RhbGxlZCk7XG59XG5cbi8qKlxuICogQHJldHVybnMgYSBtYXAgb2Ygd29ya3NwYWNlIGtleXMgb2Ygd2hpY2ggaGFzIHNwZWNpZmllZCBkZXBlbmRlbmN5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3b3Jrc3BhY2VzT2ZEZXBlbmRlbmNpZXMoLi4uZGVwUGtnTmFtZXM6IHN0cmluZ1tdKSB7XG4gIGNvbnN0IGRlcHMgPSBuZXcgU2V0KGRlcFBrZ05hbWVzKTtcbiAgY29uc3Qgd3NLZXlzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGZvciAoY29uc3QgW2tleSwgd3NTdGF0ZV0gb2YgZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmVudHJpZXMoKSkge1xuICAgIGZvciAoY29uc3QgW3BrZ05hbWVdIG9mIHdzU3RhdGUubGlua2VkRGVwZW5kZW5jaWVzLmNvbmNhdCh3c1N0YXRlLmxpbmtlZERldkRlcGVuZGVuY2llcykpIHtcbiAgICAgIGlmIChkZXBzLmhhcyhwa2dOYW1lKSkge1xuICAgICAgICB3c0tleXMuYWRkKGtleSk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgW3BrZ05hbWVdIG9mIHdzU3RhdGUuaW5zdGFsbGVkQ29tcG9uZW50cz8ua2V5cygpIHx8IFtdKSB7XG4gICAgICBpZiAoZGVwcy5oYXMocGtnTmFtZSkpIHtcbiAgICAgICAgd3NLZXlzLmFkZChrZXkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gd3NLZXlzO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVyT3B0aW9uU2V0T3B0IHtcbiAgLyoqIFdpbGwgYWRkIHR5cGVSb290cyBwcm9wZXJ0eSBmb3Igc3BlY2lmaWMgd29ya3NwYWNlLCBhbmQgYWRkIHBhdGhzIG9mIGZpbGUgXCJfcGFja2FnZS1zZXR0aW5ncy5kLnRzXCIgKi9cbiAgd29ya3NwYWNlRGlyPzogc3RyaW5nO1xuICAvKiogQWRkIHJlYWwgcGF0aCBvZiBhbGwgbGluayBwYWNrYWdlIHRvIFwicGF0aHNcIiBwcm9wZXJ0eSAqL1xuICByZWFsUGFja2FnZVBhdGhzPzogYm9vbGVhbjtcbiAgZW5hYmxlVHlwZVJvb3RzPzogYm9vbGVhbjtcbiAgbm9UeXBlUm9vdHNJblBhY2thZ2VzPzogYm9vbGVhbjtcbiAgLyoqIERlZmF1bHQgZmFsc2UsIERvIG5vdCBpbmNsdWRlIGxpbmtlZCBwYWNrYWdlIHN5bWxpbmtzIGRpcmVjdG9yeSBpbiBwYXRoKi9cbiAgbm9TeW1saW5rcz86IGJvb2xlYW47XG4gIGV4dHJhTm9kZVBhdGg/OiBzdHJpbmdbXTtcbiAgZXh0cmFUeXBlUm9vdD86IHN0cmluZ1tdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVyT3B0aW9ucyB7XG4gIGJhc2VVcmw6IHN0cmluZztcbiAgdHlwZVJvb3RzOiBzdHJpbmdbXTtcbiAgcGF0aHM/OiB7W3BhdGg6IHN0cmluZ106IHN0cmluZ1tdfTtcbiAgW2tleTogc3RyaW5nXTogYW55O1xufVxuLyoqXG4gKiBTZXQgXCJiYXNlVXJsXCIsIFwicGF0aHNcIiBhbmQgXCJ0eXBlUm9vdHNcIiBwcm9wZXJ0eSByZWxhdGl2ZSB0byB0c2NvbmZpZ0RpciwgcHJvY2Vzcy5jd2QoKVxuICogYW5kIHByb2Nlc3MuZW52Lk5PREVfUEFUSFNcbiAqIEBwYXJhbSB0c2NvbmZpZ0RpciBwcm9qZWN0IGRpcmVjdG9yeSB3aGVyZSB0c2NvbmZpZyBmaWxlIGlzICh2aXJ0dWFsKSxcbiAqIFwiYmFzZVVybFwiLCBcInR5cGVSb290c1wiIGlzIHJlbGF0aXZlIHRvIHRoaXMgcGFyYW1ldGVyXG4gKiBAcGFyYW0gYmFzZVVybCBjb21waWxlciBvcHRpb24gXCJiYXNlVXJsXCIsIFwicGF0aHNcIiB3aWxsIGJlIHJlbGF0aXZlIHRvIHRoaXMgcGFyZW10ZXJcbiAqIEBwYXJhbSBhc3NpZ25lZU9wdGlvbnMgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgoXG4gIHRzY29uZmlnRGlyOiBzdHJpbmcsXG4gIGJhc2VVcmwgPSAnLi8nLFxuICBhc3NpZ25lZU9wdGlvbnM6IFBhcnRpYWw8Q29tcGlsZXJPcHRpb25zPixcbiAgb3B0czogQ29tcGlsZXJPcHRpb25TZXRPcHQgPSB7ZW5hYmxlVHlwZVJvb3RzOiBmYWxzZX0pIHtcblxuICBjb25zdCB7cm9vdERpciwgcGxpbmtEaXIsIHN5bWxpbmtEaXJOYW1lfSA9IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluayEpIGFzIFBsaW5rRW52O1xuICBsZXQgc3ltbGlua3NEaXI6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgLyoqIGZvciBwYXRocyBtYXBwaW5nIFwiKlwiICovXG4gIGxldCBwYXRoc0RpcnM6IHN0cmluZ1tdID0gW107XG4gIC8vIHdvcmtzcGFjZSBub2RlX21vZHVsZXMgc2hvdWxkIGJlIHRoZSBmaXJzdFxuICBjb25zdCBiYXNlVXJsQWJzUGF0aCA9IFBhdGgucmVzb2x2ZSh0c2NvbmZpZ0RpciwgYmFzZVVybCk7XG5cbiAgaWYgKG9wdHMucmVhbFBhY2thZ2VQYXRocykge1xuICAgIGlmIChhc3NpZ25lZU9wdGlvbnMucGF0aHMgPT0gbnVsbCkge1xuICAgICAgYXNzaWduZWVPcHRpb25zLnBhdGhzID0ge307XG4gICAgfVxuICAgIE9iamVjdC5hc3NpZ24oYXNzaWduZWVPcHRpb25zLnBhdGhzLCBwYXRoTWFwcGluZ0ZvckxpbmtlZFBrZ3MoYmFzZVVybEFic1BhdGgpKTtcbiAgfVxuXG4gIGxldCB3c1N0YXRlOiBXb3Jrc3BhY2VTdGF0ZSB8IHVuZGVmaW5lZDtcbiAgaWYgKG9wdHMud29ya3NwYWNlRGlyICE9IG51bGwpIHtcbiAgICBzeW1saW5rc0RpciA9IFBhdGgucmVzb2x2ZShvcHRzLndvcmtzcGFjZURpciwgc3ltbGlua0Rpck5hbWUpO1xuICAgIC8vIHBhdGhzRGlycy5wdXNoKFBhdGgucmVzb2x2ZShvcHRzLndvcmtzcGFjZURpciwgJ25vZGVfbW9kdWxlcycpKTtcbiAgICBwYXRoc0RpcnMucHVzaCguLi5jYWxjTm9kZVBhdGhzKHJvb3REaXIsIHN5bWxpbmtzRGlyLCBvcHRzLndvcmtzcGFjZURpciB8fCBwcm9jZXNzLmN3ZCgpLCBwbGlua0RpcikpO1xuXG4gICAgd3NTdGF0ZSA9IGdldFN0YXRlKCkud29ya3NwYWNlcy5nZXQod29ya3NwYWNlS2V5KG9wdHMud29ya3NwYWNlRGlyKSk7XG4gIH1cblxuICBpZiAob3B0cy5leHRyYU5vZGVQYXRoICYmIG9wdHMuZXh0cmFOb2RlUGF0aC5sZW5ndGggPiAwKSB7XG4gICAgcGF0aHNEaXJzLnB1c2goLi4ub3B0cy5leHRyYU5vZGVQYXRoKTtcbiAgfVxuXG4gIHBhdGhzRGlycyA9IF8udW5pcShwYXRoc0RpcnMpO1xuXG4gIGlmIChvcHRzLm5vU3ltbGlua3MgJiYgc3ltbGlua3NEaXIpIHtcbiAgICBjb25zdCBpZHggPSBwYXRoc0RpcnMuaW5kZXhPZihzeW1saW5rc0Rpcik7XG4gICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICBwYXRoc0RpcnMuc3BsaWNlKGlkeCwgMSk7XG4gICAgfVxuICB9XG5cbiAgaWYgKFBhdGguaXNBYnNvbHV0ZShiYXNlVXJsKSkge1xuICAgIGxldCByZWxCYXNlVXJsID0gUGF0aC5yZWxhdGl2ZSh0c2NvbmZpZ0RpciwgYmFzZVVybCk7XG4gICAgaWYgKCFyZWxCYXNlVXJsLnN0YXJ0c1dpdGgoJy4nKSlcbiAgICAgIHJlbEJhc2VVcmwgPSAnLi8nICsgcmVsQmFzZVVybDtcbiAgICBiYXNlVXJsID0gcmVsQmFzZVVybDtcbiAgfVxuXG4gIGlmIChhc3NpZ25lZU9wdGlvbnMucGF0aHMgPT0gbnVsbClcbiAgICBhc3NpZ25lZU9wdGlvbnMucGF0aHMgPSB7fTtcblxuICBpZiAod3NTdGF0ZSkge1xuICAgIGFzc2lnblNwZWNpYWxQYXRocyh3c1N0YXRlLmluc3RhbGxKc29uLmRlcGVuZGVuY2llcywgcGF0aHNEaXJzLCBhc3NpZ25lZU9wdGlvbnMsIGJhc2VVcmxBYnNQYXRoKTtcbiAgICBhc3NpZ25TcGVjaWFsUGF0aHMod3NTdGF0ZS5pbnN0YWxsSnNvbi5kZXZEZXBlbmRlbmNpZXMsIHBhdGhzRGlycywgYXNzaWduZWVPcHRpb25zLCBiYXNlVXJsQWJzUGF0aCk7XG4gICAgYXNzaWduU3BlY2lhbFBhdGhzKHdzU3RhdGUuaW5zdGFsbEpzb24ucGVlckRlcGVuZGVuY2llcywgcGF0aHNEaXJzLCBhc3NpZ25lZU9wdGlvbnMsIGJhc2VVcmxBYnNQYXRoKTtcbiAgfVxuICAvLyBpZiAob3B0cy53b3Jrc3BhY2VEaXIgIT0gbnVsbCkge1xuICAvLyAgIGFzc2lnbmVlT3B0aW9ucy5wYXRoc1snX3BhY2thZ2Utc2V0dGluZ3MnXSA9IFtcbiAgLy8gICAgIFBhdGgucmVsYXRpdmUoYmFzZVVybEFic1BhdGgsIG9wdHMud29ya3NwYWNlRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJykgKyAnL19wYWNrYWdlLXNldHRpbmdzJ107XG4gIC8vIH1cblxuICBhc3NpZ25lZU9wdGlvbnMuYmFzZVVybCA9IGJhc2VVcmwucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXG4gIGlmIChhc3NpZ25lZU9wdGlvbnMucGF0aHNbJyonXSA9PSBudWxsKVxuICAgIGFzc2lnbmVlT3B0aW9ucy5wYXRoc1snKiddID0gW10gYXMgc3RyaW5nW107XG4gIGNvbnN0IHdpbGRjYXJkUGF0aHM6IHN0cmluZ1tdID0gYXNzaWduZWVPcHRpb25zLnBhdGhzWycqJ107XG5cbiAgZm9yIChjb25zdCBkaXIgb2YgcGF0aHNEaXJzKSB7XG4gICAgY29uc3QgcmVsYXRpdmVEaXIgPSBQYXRoLnJlbGF0aXZlKGJhc2VVcmxBYnNQYXRoLCBkaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAvLyBJTVBPUlRBTlQ6IGBAdHlwZS8qYCBtdXN0IGJlIHByaW8gdG8gYC8qYCwgZm9yIHRob3NlIHBhY2thZ2VzIGhhdmUgbm8gdHlwZSBkZWZpbmludGlvblxuICAgIHdpbGRjYXJkUGF0aHMucHVzaChQYXRoLmpvaW4ocmVsYXRpdmVEaXIsICdAdHlwZXMvKicpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSk7XG4gICAgd2lsZGNhcmRQYXRocy5wdXNoKFBhdGguam9pbihyZWxhdGl2ZURpciwgJyonKS5yZXBsYWNlKC9cXFxcL2csICcvJykpO1xuICB9XG4gIGFzc2lnbmVlT3B0aW9ucy5wYXRoc1snKiddID0gXy51bmlxKHdpbGRjYXJkUGF0aHMpO1xuICBhcHBlbmRUeXBlUm9vdHMocGF0aHNEaXJzLCB0c2NvbmZpZ0RpciwgYXNzaWduZWVPcHRpb25zLCBvcHRzKTtcblxuICByZXR1cm4gYXNzaWduZWVPcHRpb25zIGFzIENvbXBpbGVyT3B0aW9ucztcbn1cblxuLyoqXG4gKiBGb3IgdGhvc2Ugc3BlY2lhbCBzY29wZWQgcGFja2FnZSB3aGljaCBpcyBsaWtlIEBsb2FkYWJsZS9jb21wb25lbnQsIGl0cyB0eXBlIGRlZmluaXRpb24gcGFja2FnZSBpc1xuICogQHR5cGVzL2xvYWRhYmxlX19jb21wb25lbnRcbiAqL1xuZnVuY3Rpb24gYXNzaWduU3BlY2lhbFBhdGhzKGRlcGVuZGVuY2llczoge1tkZXA6IHN0cmluZ106IHN0cmluZ30gfCB1bmRlZmluZWQsXG4gIG5vZGVQYXRoczogSXRlcmFibGU8c3RyaW5nPixcbiAgYXNzaWduZWVPcHRpb25zOiBQYXJ0aWFsPENvbXBpbGVyT3B0aW9ucz4sIGFic0Jhc2VVcmxQYXRoOiBzdHJpbmcpIHtcbiAgaWYgKGRlcGVuZGVuY2llcyA9PSBudWxsKVxuICAgIHJldHVybjtcblxuICBpZiAoYXNzaWduZWVPcHRpb25zLnBhdGhzID09IG51bGwpXG4gICAgYXNzaWduZWVPcHRpb25zLnBhdGhzID0ge307XG4gIGZvciAoY29uc3QgaXRlbSBvZiBPYmplY3Qua2V5cyhkZXBlbmRlbmNpZXMpKSB7XG4gICAgY29uc3QgbSA9IC9eQHR5cGVzXFwvKC4qPylfXyguKj8pJC8uZXhlYyhpdGVtKTtcbiAgICBpZiAobSkge1xuICAgICAgY29uc3Qgb3JpZ2luUGtnTmFtZSA9IGBAJHttWzFdfS8ke21bMl19YDtcbiAgICAgIGNvbnN0IGV4YWN0T25lOiBzdHJpbmdbXSA9IGFzc2lnbmVlT3B0aW9ucy5wYXRoc1tvcmlnaW5Qa2dOYW1lXSA9IFtdO1xuICAgICAgY29uc3Qgd2lsZE9uZTogc3RyaW5nW10gPSBhc3NpZ25lZU9wdGlvbnMucGF0aHNbb3JpZ2luUGtnTmFtZSArICcvKiddID0gW107XG4gICAgICBmb3IgKGNvbnN0IGRpciBvZiBub2RlUGF0aHMpIHtcbiAgICAgICAgY29uc3QgcmVsYXRpdmVEaXIgPSBQYXRoLnJlbGF0aXZlKGFic0Jhc2VVcmxQYXRoLCBkaXIgKyAnLycgKyBpdGVtKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIGV4YWN0T25lLnB1c2gocmVsYXRpdmVEaXIpO1xuICAgICAgICB3aWxkT25lLnB1c2gocmVsYXRpdmVEaXIgKyAnLyonKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gcGF0aE1hcHBpbmdGb3JMaW5rZWRQa2dzKGJhc2VVcmxBYnNQYXRoOiBzdHJpbmcpIHtcbiAgbGV0IGRyY3BEaXIgPSAoZ2V0U3RhdGUoKS5saW5rZWREcmNwIHx8IGdldFN0YXRlKCkuaW5zdGFsbGVkRHJjcCkhLnJlYWxQYXRoO1xuXG4gIGNvbnN0IHBhdGhNYXBwaW5nOiB7W2tleTogc3RyaW5nXTogc3RyaW5nW119ID0ge307XG5cbiAgZm9yIChjb25zdCBbbmFtZSwge3JlYWxQYXRofV0gb2YgZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy5lbnRyaWVzKCkgfHwgW10pIHtcbiAgICBjb25zdCByZWFsRGlyID0gUGF0aC5yZWxhdGl2ZShiYXNlVXJsQWJzUGF0aCwgcmVhbFBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBwYXRoTWFwcGluZ1tuYW1lXSA9IFtyZWFsRGlyXTtcbiAgICBwYXRoTWFwcGluZ1tuYW1lICsgJy8qJ10gPSBbcmVhbERpciArICcvKiddO1xuICB9XG5cbiAgLy8gaWYgKHBrZ05hbWUgIT09ICdAd2ZoL3BsaW5rJykge1xuICBkcmNwRGlyID0gUGF0aC5yZWxhdGl2ZShiYXNlVXJsQWJzUGF0aCwgZHJjcERpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICBwYXRoTWFwcGluZ1snQHdmaC9wbGluayddID0gW2RyY3BEaXJdO1xuICBwYXRoTWFwcGluZ1snQHdmaC9wbGluay8qJ10gPSBbZHJjcERpciArICcvKiddO1xuICByZXR1cm4gcGF0aE1hcHBpbmc7XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gcGF0aHNEaXJzIE5vZGUgcGF0aCBsaWtlIHBhdGggaW5mb3JtYXRpb25cbiAqIEBwYXJhbSB0c2NvbmZpZ0RpciBcbiAqIEBwYXJhbSBhc3NpZ25lZU9wdGlvbnMgXG4gKiBAcGFyYW0gb3B0cyBcbiAqL1xuZnVuY3Rpb24gYXBwZW5kVHlwZVJvb3RzKHBhdGhzRGlyczogc3RyaW5nW10sIHRzY29uZmlnRGlyOiBzdHJpbmcsIGFzc2lnbmVlT3B0aW9uczogUGFydGlhbDxDb21waWxlck9wdGlvbnM+LFxuICBvcHRzOiBDb21waWxlck9wdGlvblNldE9wdCkge1xuXG4gIGlmICghb3B0cy5ub1R5cGVSb290c0luUGFja2FnZXMpIHtcbiAgICBpZiAoYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyA9PSBudWxsKVxuICAgICAgYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyA9IFtdO1xuICAgIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMucHVzaChcbiAgICAgIFBhdGgucmVsYXRpdmUodHNjb25maWdEaXIsIFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90eXBlcycpKS5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4gICAgICAuLi50eXBlUm9vdHNJblBhY2thZ2VzKG9wdHMud29ya3NwYWNlRGlyKS5tYXAoZGlyID0+IFBhdGgucmVsYXRpdmUodHNjb25maWdEaXIsIGRpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpKVxuICAgICk7XG4gIH1cblxuICBpZiAob3B0cy5lbmFibGVUeXBlUm9vdHMgKSB7XG4gICAgaWYgKGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMgPT0gbnVsbClcbiAgICAgIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMgPSBbXTtcbiAgICBhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzLnB1c2goLi4ucGF0aHNEaXJzLm1hcChkaXIgPT4ge1xuICAgICAgY29uc3QgcmVsYXRpdmVEaXIgPSBQYXRoLnJlbGF0aXZlKHRzY29uZmlnRGlyLCBkaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIHJldHVybiByZWxhdGl2ZURpciArICcvQHR5cGVzJztcbiAgICB9KSk7XG4gIH1cblxuICBpZiAob3B0cy5leHRyYVR5cGVSb290KSB7XG4gICAgaWYgKGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMgPT0gbnVsbClcbiAgICAgIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMgPSBbXTtcbiAgICBhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzLnB1c2goLi4ub3B0cy5leHRyYVR5cGVSb290Lm1hcChcbiAgICAgIGRpciA9PiBQYXRoLnJlbGF0aXZlKHRzY29uZmlnRGlyLCBkaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSkpO1xuICB9XG5cbiAgYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyA9IF8udW5pcShhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzKTtcbiAgaWYgKGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMgIT0gbnVsbCAmJiBhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzLmxlbmd0aCA9PT0gMClcbiAgICBkZWxldGUgYXNzaWduZWVPcHRpb25zLnR5cGVSb290cztcbn1cblxuZnVuY3Rpb24gdHlwZVJvb3RzSW5QYWNrYWdlcyhvbmx5SW5jbHVkZVdvcmtzcGFjZT86IHN0cmluZykge1xuICAvLyBjb25zdCB7Z2V0U3RhdGUsIHdvcmtzcGFjZUtleX06IHR5cGVvZiBfcGtnTWdyID0gcmVxdWlyZSgnLi9wYWNrYWdlLW1ncicpO1xuICBjb25zdCB3c0tleXMgPSBvbmx5SW5jbHVkZVdvcmtzcGFjZSA/IFt3b3Jrc3BhY2VLZXkob25seUluY2x1ZGVXb3Jrc3BhY2UpXSA6IGdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCk7XG4gIGNvbnN0IGRpcnM6IHN0cmluZ1tdID0gW107XG4gIGZvciAoY29uc3Qgd3NLZXkgb2Ygd3NLZXlzKSB7XG4gICAgZm9yIChjb25zdCBwa2cgb2YgcGFja2FnZXM0V29ya3NwYWNlS2V5KHdzS2V5KSkge1xuICAgICAgaWYgKHBrZy5qc29uLmRyLnR5cGVSb290KSB7XG4gICAgICAgIGNvbnN0IGRpciA9IFBhdGgucmVzb2x2ZShwa2cucmVhbFBhdGgsIHBrZy5qc29uLmRyLnR5cGVSb290KTtcbiAgICAgICAgZGlycy5wdXNoKGRpcik7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBkaXJzO1xufVxuIl19