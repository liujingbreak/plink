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
const misc_1 = require("../utils/misc");
const log = log4js_1.getLogger('plink.package-list-helper');
function* allPackages(_types, recipeType, projectDirs) {
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
    const wsKey = index_1.workspaceKey(workspaceDir || misc_1.plinkEnv.workDir);
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
 * @param opts CompilerOptionSetOpt
 */
function setTsCompilerOptForNodePath(tsconfigDir, baseUrl = './', assigneeOptions, opts = { enableTypeRoots: false }) {
    // const {rootDir, plinkDir, symlinkDirName} = JSON.parse(process.env.__plink!) as PlinkEnv;
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
        symlinksDir = path_1.default.resolve(opts.workspaceDir, misc_1.plinkEnv.symlinkDirName);
        // pathsDirs.push(Path.resolve(opts.workspaceDir, 'node_modules'));
        pathsDirs.push(...node_path_1.calcNodePaths(misc_1.plinkEnv.rootDir, symlinksDir, opts.workspaceDir || misc_1.plinkEnv.workDir, misc_1.plinkEnv.plinkDir));
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
            const typeRoot = pkg.json.plink ? pkg.json.plink.typeRoot : pkg.json.dr ? pkg.json.dr.typeRoot : null;
            if (typeRoot) {
                const dir = path_1.default.resolve(pkg.realPath, typeRoot);
                dirs.push(dir);
            }
        }
    }
    return dirs;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1saXN0LWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsbUNBQTJGO0FBQzNGLGdEQUF3QjtBQUN4Qiw0Q0FBMkM7QUFDM0Msb0RBQXVCO0FBQ3ZCLG1DQUFpQztBQUNqQyx3Q0FBdUM7QUFJdkMsTUFBTSxHQUFHLEdBQUcsa0JBQVMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0FBRW5ELFFBQWUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxNQUFvQyxFQUMvRCxVQUFnQyxFQUFFLFdBQXNCO0lBRXhELElBQUksVUFBVSxLQUFLLFdBQVcsRUFBRTtRQUM5QixJQUFJLFdBQVcsRUFBRTtZQUNmLEtBQUssTUFBTSxVQUFVLElBQUksV0FBVyxFQUFFO2dCQUNwQyxNQUFNLE9BQU8sR0FBRyxxQkFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUMxQyxNQUFNLFFBQVEsR0FBRyxnQkFBUSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUMxRCxJQUFJLFFBQVEsSUFBSSxJQUFJO29CQUNsQixPQUFPO2dCQUNULEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFO29CQUM5QixNQUFNLEdBQUcsR0FBRyxnQkFBUSxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDaEQsSUFBSSxHQUFHLEVBQUU7d0JBQ1AsTUFBTSxHQUFHLENBQUM7cUJBQ1g7aUJBQ0Y7YUFDRjtTQUNGO2FBQU07WUFDTCxLQUFLLE1BQU0sR0FBRyxJQUFJLGdCQUFRLEVBQUUsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQ2pELE1BQU0sR0FBRyxDQUFDO2FBQ1g7U0FDRjtLQUNGO0lBQ0QsSUFBSSxVQUFVLEtBQUssS0FBSyxFQUFFO1FBQ3hC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LENBQUMsR0FBRyxDQUFDLENBQUM7YUFDaEI7U0FDRjtLQUNGO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtnZXRTdGF0ZSwgcGF0aFRvUHJvaktleSwgd29ya3NwYWNlS2V5LCBQYWNrYWdlSW5mbywgV29ya3NwYWNlU3RhdGV9IGZyb20gJy4vaW5kZXgnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge2NhbGNOb2RlUGF0aHN9IGZyb20gJy4uL25vZGUtcGF0aCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQge3BsaW5rRW52fSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCB0cyBmcm9tICd0eXBlc2NyaXB0JztcblxuZXhwb3J0IHR5cGUgUGFja2FnZVR5cGUgPSAnKicgfCAnYnVpbGQnIHwgJ2NvcmUnO1xuY29uc3QgbG9nID0gZ2V0TG9nZ2VyKCdwbGluay5wYWNrYWdlLWxpc3QtaGVscGVyJyk7XG5cbmV4cG9ydCBmdW5jdGlvbiogYWxsUGFja2FnZXMoX3R5cGVzPzogUGFja2FnZVR5cGUgfCBQYWNrYWdlVHlwZVtdLFxuICByZWNpcGVUeXBlPzogJ3NyYycgfCAnaW5zdGFsbGVkJywgcHJvamVjdERpcnM/OiBzdHJpbmdbXSk6IEdlbmVyYXRvcjxQYWNrYWdlSW5mbz4ge1xuXG4gIGlmIChyZWNpcGVUeXBlICE9PSAnaW5zdGFsbGVkJykge1xuICAgIGlmIChwcm9qZWN0RGlycykge1xuICAgICAgZm9yIChjb25zdCBwcm9qZWN0RGlyIG9mIHByb2plY3REaXJzKSB7XG4gICAgICAgIGNvbnN0IHByb2pLZXkgPSBwYXRoVG9Qcm9qS2V5KHByb2plY3REaXIpO1xuICAgICAgICBjb25zdCBwa2dOYW1lcyA9IGdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5nZXQocHJvaktleSk7XG4gICAgICAgIGlmIChwa2dOYW1lcyA9PSBudWxsKVxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgZm9yIChjb25zdCBwa2dOYW1lIG9mIHBrZ05hbWVzKSB7XG4gICAgICAgICAgY29uc3QgcGtnID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy5nZXQocGtnTmFtZSk7XG4gICAgICAgICAgaWYgKHBrZykge1xuICAgICAgICAgICAgeWllbGQgcGtnO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKGNvbnN0IHBrZyBvZiBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLnZhbHVlcygpKSB7XG4gICAgICAgIHlpZWxkIHBrZztcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgaWYgKHJlY2lwZVR5cGUgIT09ICdzcmMnKSB7XG4gICAgZm9yIChjb25zdCB3cyBvZiBnZXRTdGF0ZSgpLndvcmtzcGFjZXMudmFsdWVzKCkpIHtcbiAgICAgIGNvbnN0IGluc3RhbGxlZCA9IHdzLmluc3RhbGxlZENvbXBvbmVudHM7XG4gICAgICBpZiAoaW5zdGFsbGVkKSB7XG4gICAgICAgIGZvciAoY29uc3QgY29tcCBvZiBpbnN0YWxsZWQudmFsdWVzKCkpIHtcbiAgICAgICAgICB5aWVsZCBjb21wO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiogcGFja2FnZXM0V29ya3NwYWNlS2V5KHdzS2V5OiBzdHJpbmcsIGluY2x1ZGVJbnN0YWxsZWQgPSB0cnVlKTogR2VuZXJhdG9yPFBhY2thZ2VJbmZvPiB7XG4gIGNvbnN0IHdzID0gZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmdldCh3c0tleSk7XG4gIGlmICghd3MpXG4gICAgcmV0dXJuO1xuXG4gIGNvbnN0IGxpbmtlZCA9IGdldFN0YXRlKCkuc3JjUGFja2FnZXM7XG4gIGNvbnN0IGluc3RhbGxlZCA9IHdzLmluc3RhbGxlZENvbXBvbmVudHM7XG4gIGZvciAoY29uc3QgW3BrTmFtZV0gb2Ygd3MubGlua2VkRGVwZW5kZW5jaWVzKSB7XG4gICAgY29uc3QgcGsgPSBsaW5rZWQuZ2V0KHBrTmFtZSk7XG4gICAgaWYgKHBrID09IG51bGwpXG4gICAgICBsb2cuZXJyb3IoYE1pc3NpbmcgcGFja2FnZSAke3BrTmFtZX0gaW4gd29ya3NwYWNlICR7d3NLZXl9YCk7XG4gICAgZWxzZVxuICAgICAgeWllbGQgcGs7XG4gIH1cbiAgZm9yIChjb25zdCBbcGtOYW1lXSBvZiB3cy5saW5rZWREZXZEZXBlbmRlbmNpZXMpIHtcbiAgICBjb25zdCBwayA9IGxpbmtlZC5nZXQocGtOYW1lKTtcbiAgICBpZiAocGsgPT0gbnVsbClcbiAgICAgIGxvZy5lcnJvcihgTWlzc2luZyBwYWNrYWdlICR7cGtOYW1lfSBpbiB3b3Jrc3BhY2UgJHt3c0tleX1gKTtcbiAgICBlbHNlXG4gICAgICB5aWVsZCBwaztcbiAgfVxuICBpZiAoaW5jbHVkZUluc3RhbGxlZCAmJiBpbnN0YWxsZWQpIHtcbiAgICBmb3IgKGNvbnN0IGNvbXAgb2YgaW5zdGFsbGVkLnZhbHVlcygpKSB7XG4gICAgICB5aWVsZCBjb21wO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFja2FnZXM0V29ya3NwYWNlKHdvcmtzcGFjZURpcj86IHN0cmluZywgaW5jbHVkZUluc3RhbGxlZCA9IHRydWUpIHtcbiAgY29uc3Qgd3NLZXkgPSB3b3Jrc3BhY2VLZXkod29ya3NwYWNlRGlyIHx8IHBsaW5rRW52LndvcmtEaXIpO1xuICByZXR1cm4gcGFja2FnZXM0V29ya3NwYWNlS2V5KHdzS2V5LCBpbmNsdWRlSW5zdGFsbGVkKTtcbn1cblxuLyoqXG4gKiBAcmV0dXJucyBhIG1hcCBvZiB3b3Jrc3BhY2Uga2V5cyBvZiB3aGljaCBoYXMgc3BlY2lmaWVkIGRlcGVuZGVuY3lcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdvcmtzcGFjZXNPZkRlcGVuZGVuY2llcyguLi5kZXBQa2dOYW1lczogc3RyaW5nW10pIHtcbiAgY29uc3QgZGVwcyA9IG5ldyBTZXQoZGVwUGtnTmFtZXMpO1xuICBjb25zdCB3c0tleXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgZm9yIChjb25zdCBba2V5LCB3c1N0YXRlXSBvZiBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZW50cmllcygpKSB7XG4gICAgZm9yIChjb25zdCBbcGtnTmFtZV0gb2Ygd3NTdGF0ZS5saW5rZWREZXBlbmRlbmNpZXMuY29uY2F0KHdzU3RhdGUubGlua2VkRGV2RGVwZW5kZW5jaWVzKSkge1xuICAgICAgaWYgKGRlcHMuaGFzKHBrZ05hbWUpKSB7XG4gICAgICAgIHdzS2V5cy5hZGQoa2V5KTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBbcGtnTmFtZV0gb2Ygd3NTdGF0ZS5pbnN0YWxsZWRDb21wb25lbnRzPy5rZXlzKCkgfHwgW10pIHtcbiAgICAgIGlmIChkZXBzLmhhcyhwa2dOYW1lKSkge1xuICAgICAgICB3c0tleXMuYWRkKGtleSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiB3c0tleXM7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZXJPcHRpb25TZXRPcHQge1xuICAvKiogV2lsbCBhZGQgdHlwZVJvb3RzIHByb3BlcnR5IGZvciBzcGVjaWZpYyB3b3Jrc3BhY2UsIGFuZCBhZGQgcGF0aHMgb2YgZmlsZSBcIl9wYWNrYWdlLXNldHRpbmdzLmQudHNcIiAqL1xuICB3b3Jrc3BhY2VEaXI/OiBzdHJpbmc7XG4gIC8qKiBBZGQgcmVhbCBwYXRoIG9mIGFsbCBsaW5rIHBhY2thZ2UgdG8gXCJwYXRoc1wiIHByb3BlcnR5ICovXG4gIHJlYWxQYWNrYWdlUGF0aHM/OiBib29sZWFuO1xuICBlbmFibGVUeXBlUm9vdHM/OiBib29sZWFuO1xuICBub1R5cGVSb290c0luUGFja2FnZXM/OiBib29sZWFuO1xuICAvKiogRGVmYXVsdCBmYWxzZSwgRG8gbm90IGluY2x1ZGUgbGlua2VkIHBhY2thZ2Ugc3ltbGlua3MgZGlyZWN0b3J5IGluIHBhdGgqL1xuICBub1N5bWxpbmtzPzogYm9vbGVhbjtcbiAgZXh0cmFOb2RlUGF0aD86IHN0cmluZ1tdO1xuICBleHRyYVR5cGVSb290Pzogc3RyaW5nW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZXJPcHRpb25zIHtcbiAgYmFzZVVybDogc3RyaW5nO1xuICB0eXBlUm9vdHM6IHN0cmluZ1tdO1xuICBwYXRocz86IHsgW3BhdGg6IHN0cmluZ106IHN0cmluZ1tdfTtcbiAgW3Byb3A6IHN0cmluZ106IHRzLkNvbXBpbGVyT3B0aW9uc1ZhbHVlO1xufVxuXG4vKipcbiAqIFNldCBcImJhc2VVcmxcIiwgXCJwYXRoc1wiIGFuZCBcInR5cGVSb290c1wiIHByb3BlcnR5IHJlbGF0aXZlIHRvIHRzY29uZmlnRGlyLCBwcm9jZXNzLmN3ZCgpXG4gKiBhbmQgcHJvY2Vzcy5lbnYuTk9ERV9QQVRIU1xuICogQHBhcmFtIHRzY29uZmlnRGlyIHByb2plY3QgZGlyZWN0b3J5IHdoZXJlIHRzY29uZmlnIGZpbGUgaXMgKHZpcnR1YWwpLFxuICogXCJiYXNlVXJsXCIsIFwidHlwZVJvb3RzXCIgaXMgcmVsYXRpdmUgdG8gdGhpcyBwYXJhbWV0ZXJcbiAqIEBwYXJhbSBiYXNlVXJsIGNvbXBpbGVyIG9wdGlvbiBcImJhc2VVcmxcIiwgXCJwYXRoc1wiIHdpbGwgYmUgcmVsYXRpdmUgdG8gdGhpcyBwYXJlbXRlclxuICogQHBhcmFtIGFzc2lnbmVlT3B0aW9ucyBcbiAqIEBwYXJhbSBvcHRzIENvbXBpbGVyT3B0aW9uU2V0T3B0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgoXG4gIHRzY29uZmlnRGlyOiBzdHJpbmcsXG4gIGJhc2VVcmwgPSAnLi8nLFxuICBhc3NpZ25lZU9wdGlvbnM6IFBhcnRpYWw8Q29tcGlsZXJPcHRpb25zPixcbiAgb3B0czogQ29tcGlsZXJPcHRpb25TZXRPcHQgPSB7ZW5hYmxlVHlwZVJvb3RzOiBmYWxzZX0pIHtcblxuICAvLyBjb25zdCB7cm9vdERpciwgcGxpbmtEaXIsIHN5bWxpbmtEaXJOYW1lfSA9IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluayEpIGFzIFBsaW5rRW52O1xuICBsZXQgc3ltbGlua3NEaXI6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgLyoqIGZvciBwYXRocyBtYXBwaW5nIFwiKlwiICovXG4gIGxldCBwYXRoc0RpcnM6IHN0cmluZ1tdID0gW107XG4gIC8vIHdvcmtzcGFjZSBub2RlX21vZHVsZXMgc2hvdWxkIGJlIHRoZSBmaXJzdFxuICBjb25zdCBiYXNlVXJsQWJzUGF0aCA9IFBhdGgucmVzb2x2ZSh0c2NvbmZpZ0RpciwgYmFzZVVybCk7XG5cbiAgaWYgKG9wdHMucmVhbFBhY2thZ2VQYXRocykge1xuICAgIGlmIChhc3NpZ25lZU9wdGlvbnMucGF0aHMgPT0gbnVsbCkge1xuICAgICAgYXNzaWduZWVPcHRpb25zLnBhdGhzID0ge307XG4gICAgfVxuICAgIE9iamVjdC5hc3NpZ24oYXNzaWduZWVPcHRpb25zLnBhdGhzLCBwYXRoTWFwcGluZ0ZvckxpbmtlZFBrZ3MoYmFzZVVybEFic1BhdGgpKTtcbiAgfVxuXG4gIGxldCB3c1N0YXRlOiBXb3Jrc3BhY2VTdGF0ZSB8IHVuZGVmaW5lZDtcbiAgaWYgKG9wdHMud29ya3NwYWNlRGlyICE9IG51bGwpIHtcbiAgICBzeW1saW5rc0RpciA9IFBhdGgucmVzb2x2ZShvcHRzLndvcmtzcGFjZURpciwgcGxpbmtFbnYuc3ltbGlua0Rpck5hbWUpO1xuICAgIC8vIHBhdGhzRGlycy5wdXNoKFBhdGgucmVzb2x2ZShvcHRzLndvcmtzcGFjZURpciwgJ25vZGVfbW9kdWxlcycpKTtcbiAgICBwYXRoc0RpcnMucHVzaCguLi5jYWxjTm9kZVBhdGhzKHBsaW5rRW52LnJvb3REaXIsIHN5bWxpbmtzRGlyLFxuICAgICAgb3B0cy53b3Jrc3BhY2VEaXIgfHwgcGxpbmtFbnYud29ya0RpciwgcGxpbmtFbnYucGxpbmtEaXIpKTtcblxuICAgIHdzU3RhdGUgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdvcmtzcGFjZUtleShvcHRzLndvcmtzcGFjZURpcikpO1xuICB9XG5cbiAgaWYgKG9wdHMuZXh0cmFOb2RlUGF0aCAmJiBvcHRzLmV4dHJhTm9kZVBhdGgubGVuZ3RoID4gMCkge1xuICAgIHBhdGhzRGlycy5wdXNoKC4uLm9wdHMuZXh0cmFOb2RlUGF0aCk7XG4gIH1cblxuICBwYXRoc0RpcnMgPSBfLnVuaXEocGF0aHNEaXJzKTtcblxuICBpZiAob3B0cy5ub1N5bWxpbmtzICYmIHN5bWxpbmtzRGlyKSB7XG4gICAgY29uc3QgaWR4ID0gcGF0aHNEaXJzLmluZGV4T2Yoc3ltbGlua3NEaXIpO1xuICAgIGlmIChpZHggPj0gMCkge1xuICAgICAgcGF0aHNEaXJzLnNwbGljZShpZHgsIDEpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChQYXRoLmlzQWJzb2x1dGUoYmFzZVVybCkpIHtcbiAgICBsZXQgcmVsQmFzZVVybCA9IFBhdGgucmVsYXRpdmUodHNjb25maWdEaXIsIGJhc2VVcmwpO1xuICAgIGlmICghcmVsQmFzZVVybC5zdGFydHNXaXRoKCcuJykpXG4gICAgICByZWxCYXNlVXJsID0gJy4vJyArIHJlbEJhc2VVcmw7XG4gICAgYmFzZVVybCA9IHJlbEJhc2VVcmw7XG4gIH1cblxuICBpZiAoYXNzaWduZWVPcHRpb25zLnBhdGhzID09IG51bGwpXG4gICAgYXNzaWduZWVPcHRpb25zLnBhdGhzID0ge307XG5cbiAgaWYgKHdzU3RhdGUpIHtcbiAgICBhc3NpZ25TcGVjaWFsUGF0aHMod3NTdGF0ZS5pbnN0YWxsSnNvbi5kZXBlbmRlbmNpZXMsIHBhdGhzRGlycywgYXNzaWduZWVPcHRpb25zLCBiYXNlVXJsQWJzUGF0aCk7XG4gICAgYXNzaWduU3BlY2lhbFBhdGhzKHdzU3RhdGUuaW5zdGFsbEpzb24uZGV2RGVwZW5kZW5jaWVzLCBwYXRoc0RpcnMsIGFzc2lnbmVlT3B0aW9ucywgYmFzZVVybEFic1BhdGgpO1xuICAgIGFzc2lnblNwZWNpYWxQYXRocyh3c1N0YXRlLmluc3RhbGxKc29uLnBlZXJEZXBlbmRlbmNpZXMsIHBhdGhzRGlycywgYXNzaWduZWVPcHRpb25zLCBiYXNlVXJsQWJzUGF0aCk7XG4gIH1cbiAgLy8gaWYgKG9wdHMud29ya3NwYWNlRGlyICE9IG51bGwpIHtcbiAgLy8gICBhc3NpZ25lZU9wdGlvbnMucGF0aHNbJ19wYWNrYWdlLXNldHRpbmdzJ10gPSBbXG4gIC8vICAgICBQYXRoLnJlbGF0aXZlKGJhc2VVcmxBYnNQYXRoLCBvcHRzLndvcmtzcGFjZURpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpICsgJy9fcGFja2FnZS1zZXR0aW5ncyddO1xuICAvLyB9XG5cbiAgYXNzaWduZWVPcHRpb25zLmJhc2VVcmwgPSBiYXNlVXJsLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcblxuICBpZiAoYXNzaWduZWVPcHRpb25zLnBhdGhzWycqJ10gPT0gbnVsbClcbiAgICBhc3NpZ25lZU9wdGlvbnMucGF0aHNbJyonXSA9IFtdIGFzIHN0cmluZ1tdO1xuICBjb25zdCB3aWxkY2FyZFBhdGhzOiBzdHJpbmdbXSA9IGFzc2lnbmVlT3B0aW9ucy5wYXRoc1snKiddO1xuXG4gIGZvciAoY29uc3QgZGlyIG9mIHBhdGhzRGlycykge1xuICAgIGNvbnN0IHJlbGF0aXZlRGlyID0gUGF0aC5yZWxhdGl2ZShiYXNlVXJsQWJzUGF0aCwgZGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgLy8gSU1QT1JUQU5UOiBgQHR5cGUvKmAgbXVzdCBiZSBwcmlvIHRvIGAvKmAsIGZvciB0aG9zZSBwYWNrYWdlcyBoYXZlIG5vIHR5cGUgZGVmaW5pbnRpb25cbiAgICB3aWxkY2FyZFBhdGhzLnB1c2goUGF0aC5qb2luKHJlbGF0aXZlRGlyLCAnQHR5cGVzLyonKS5yZXBsYWNlKC9cXFxcL2csICcvJykpO1xuICAgIHdpbGRjYXJkUGF0aHMucHVzaChQYXRoLmpvaW4ocmVsYXRpdmVEaXIsICcqJykucmVwbGFjZSgvXFxcXC9nLCAnLycpKTtcbiAgfVxuICBhc3NpZ25lZU9wdGlvbnMucGF0aHNbJyonXSA9IF8udW5pcSh3aWxkY2FyZFBhdGhzKTtcbiAgYXBwZW5kVHlwZVJvb3RzKHBhdGhzRGlycywgdHNjb25maWdEaXIsIGFzc2lnbmVlT3B0aW9ucywgb3B0cyk7XG5cbiAgcmV0dXJuIGFzc2lnbmVlT3B0aW9ucyBhcyBDb21waWxlck9wdGlvbnM7XG59XG5cbi8qKlxuICogRm9yIHRob3NlIHNwZWNpYWwgc2NvcGVkIHBhY2thZ2Ugd2hpY2ggaXMgbGlrZSBAbG9hZGFibGUvY29tcG9uZW50LCBpdHMgdHlwZSBkZWZpbml0aW9uIHBhY2thZ2UgaXNcbiAqIEB0eXBlcy9sb2FkYWJsZV9fY29tcG9uZW50XG4gKi9cbmZ1bmN0aW9uIGFzc2lnblNwZWNpYWxQYXRocyhkZXBlbmRlbmNpZXM6IHtbZGVwOiBzdHJpbmddOiBzdHJpbmd9IHwgdW5kZWZpbmVkLFxuICBub2RlUGF0aHM6IEl0ZXJhYmxlPHN0cmluZz4sXG4gIGFzc2lnbmVlT3B0aW9uczogUGFydGlhbDxDb21waWxlck9wdGlvbnM+LCBhYnNCYXNlVXJsUGF0aDogc3RyaW5nKSB7XG4gIGlmIChkZXBlbmRlbmNpZXMgPT0gbnVsbClcbiAgICByZXR1cm47XG5cbiAgaWYgKGFzc2lnbmVlT3B0aW9ucy5wYXRocyA9PSBudWxsKVxuICAgIGFzc2lnbmVlT3B0aW9ucy5wYXRocyA9IHt9O1xuICBmb3IgKGNvbnN0IGl0ZW0gb2YgT2JqZWN0LmtleXMoZGVwZW5kZW5jaWVzKSkge1xuICAgIGNvbnN0IG0gPSAvXkB0eXBlc1xcLyguKj8pX18oLio/KSQvLmV4ZWMoaXRlbSk7XG4gICAgaWYgKG0pIHtcbiAgICAgIGNvbnN0IG9yaWdpblBrZ05hbWUgPSBgQCR7bVsxXX0vJHttWzJdfWA7XG4gICAgICBjb25zdCBleGFjdE9uZTogc3RyaW5nW10gPSBhc3NpZ25lZU9wdGlvbnMucGF0aHNbb3JpZ2luUGtnTmFtZV0gPSBbXTtcbiAgICAgIGNvbnN0IHdpbGRPbmU6IHN0cmluZ1tdID0gYXNzaWduZWVPcHRpb25zLnBhdGhzW29yaWdpblBrZ05hbWUgKyAnLyonXSA9IFtdO1xuICAgICAgZm9yIChjb25zdCBkaXIgb2Ygbm9kZVBhdGhzKSB7XG4gICAgICAgIGNvbnN0IHJlbGF0aXZlRGlyID0gUGF0aC5yZWxhdGl2ZShhYnNCYXNlVXJsUGF0aCwgZGlyICsgJy8nICsgaXRlbSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgICBleGFjdE9uZS5wdXNoKHJlbGF0aXZlRGlyKTtcbiAgICAgICAgd2lsZE9uZS5wdXNoKHJlbGF0aXZlRGlyICsgJy8qJyk7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmZ1bmN0aW9uIHBhdGhNYXBwaW5nRm9yTGlua2VkUGtncyhiYXNlVXJsQWJzUGF0aDogc3RyaW5nKSB7XG4gIGxldCBkcmNwRGlyID0gKGdldFN0YXRlKCkubGlua2VkRHJjcCB8fCBnZXRTdGF0ZSgpLmluc3RhbGxlZERyY3ApIS5yZWFsUGF0aDtcblxuICBjb25zdCBwYXRoTWFwcGluZzoge1trZXk6IHN0cmluZ106IHN0cmluZ1tdfSA9IHt9O1xuXG4gIGZvciAoY29uc3QgW25hbWUsIHtyZWFsUGF0aH1dIG9mIGdldFN0YXRlKCkuc3JjUGFja2FnZXMuZW50cmllcygpIHx8IFtdKSB7XG4gICAgY29uc3QgcmVhbERpciA9IFBhdGgucmVsYXRpdmUoYmFzZVVybEFic1BhdGgsIHJlYWxQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgcGF0aE1hcHBpbmdbbmFtZV0gPSBbcmVhbERpcl07XG4gICAgcGF0aE1hcHBpbmdbbmFtZSArICcvKiddID0gW3JlYWxEaXIgKyAnLyonXTtcbiAgfVxuXG4gIC8vIGlmIChwa2dOYW1lICE9PSAnQHdmaC9wbGluaycpIHtcbiAgZHJjcERpciA9IFBhdGgucmVsYXRpdmUoYmFzZVVybEFic1BhdGgsIGRyY3BEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgcGF0aE1hcHBpbmdbJ0B3ZmgvcGxpbmsnXSA9IFtkcmNwRGlyXTtcbiAgcGF0aE1hcHBpbmdbJ0B3ZmgvcGxpbmsvKiddID0gW2RyY3BEaXIgKyAnLyonXTtcbiAgcmV0dXJuIHBhdGhNYXBwaW5nO1xufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIHBhdGhzRGlycyBOb2RlIHBhdGggbGlrZSBwYXRoIGluZm9ybWF0aW9uXG4gKiBAcGFyYW0gdHNjb25maWdEaXIgXG4gKiBAcGFyYW0gYXNzaWduZWVPcHRpb25zIFxuICogQHBhcmFtIG9wdHMgXG4gKi9cbmZ1bmN0aW9uIGFwcGVuZFR5cGVSb290cyhwYXRoc0RpcnM6IHN0cmluZ1tdLCB0c2NvbmZpZ0Rpcjogc3RyaW5nLCBhc3NpZ25lZU9wdGlvbnM6IFBhcnRpYWw8Q29tcGlsZXJPcHRpb25zPixcbiAgb3B0czogQ29tcGlsZXJPcHRpb25TZXRPcHQpIHtcblxuICBpZiAoIW9wdHMubm9UeXBlUm9vdHNJblBhY2thZ2VzKSB7XG4gICAgaWYgKGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMgPT0gbnVsbClcbiAgICAgIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMgPSBbXTtcbiAgICBhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzLnB1c2goXG4gICAgICBQYXRoLnJlbGF0aXZlKHRzY29uZmlnRGlyLCBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHlwZXMnKSkucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICAgICAgLi4udHlwZVJvb3RzSW5QYWNrYWdlcyhvcHRzLndvcmtzcGFjZURpcikubWFwKGRpciA9PiBQYXRoLnJlbGF0aXZlKHRzY29uZmlnRGlyLCBkaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSlcbiAgICApO1xuICB9XG5cbiAgaWYgKG9wdHMuZW5hYmxlVHlwZVJvb3RzICkge1xuICAgIGlmIChhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzID09IG51bGwpXG4gICAgICBhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzID0gW107XG4gICAgYXNzaWduZWVPcHRpb25zLnR5cGVSb290cy5wdXNoKC4uLnBhdGhzRGlycy5tYXAoZGlyID0+IHtcbiAgICAgIGNvbnN0IHJlbGF0aXZlRGlyID0gUGF0aC5yZWxhdGl2ZSh0c2NvbmZpZ0RpciwgZGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICByZXR1cm4gcmVsYXRpdmVEaXIgKyAnL0B0eXBlcyc7XG4gICAgfSkpO1xuICB9XG5cbiAgaWYgKG9wdHMuZXh0cmFUeXBlUm9vdCkge1xuICAgIGlmIChhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzID09IG51bGwpXG4gICAgICBhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzID0gW107XG4gICAgYXNzaWduZWVPcHRpb25zLnR5cGVSb290cy5wdXNoKC4uLm9wdHMuZXh0cmFUeXBlUm9vdC5tYXAoXG4gICAgICBkaXIgPT4gUGF0aC5yZWxhdGl2ZSh0c2NvbmZpZ0RpciwgZGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJykpKTtcbiAgfVxuXG4gIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMgPSBfLnVuaXEoYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyk7XG4gIGlmIChhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzICE9IG51bGwgJiYgYXNzaWduZWVPcHRpb25zLnR5cGVSb290cy5sZW5ndGggPT09IDApXG4gICAgZGVsZXRlIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHM7XG59XG5cbmZ1bmN0aW9uIHR5cGVSb290c0luUGFja2FnZXMob25seUluY2x1ZGVXb3Jrc3BhY2U/OiBzdHJpbmcpIHtcbiAgLy8gY29uc3Qge2dldFN0YXRlLCB3b3Jrc3BhY2VLZXl9OiB0eXBlb2YgX3BrZ01nciA9IHJlcXVpcmUoJy4vcGFja2FnZS1tZ3InKTtcbiAgY29uc3Qgd3NLZXlzID0gb25seUluY2x1ZGVXb3Jrc3BhY2UgPyBbd29ya3NwYWNlS2V5KG9ubHlJbmNsdWRlV29ya3NwYWNlKV0gOiBnZXRTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpO1xuICBjb25zdCBkaXJzOiBzdHJpbmdbXSA9IFtdO1xuICBmb3IgKGNvbnN0IHdzS2V5IG9mIHdzS2V5cykge1xuICAgIGZvciAoY29uc3QgcGtnIG9mIHBhY2thZ2VzNFdvcmtzcGFjZUtleSh3c0tleSkpIHtcbiAgICAgIGNvbnN0IHR5cGVSb290ID0gcGtnLmpzb24ucGxpbmsgPyBwa2cuanNvbi5wbGluay50eXBlUm9vdCA6IHBrZy5qc29uLmRyID8gcGtnLmpzb24uZHIudHlwZVJvb3QgOiBudWxsO1xuICAgICAgaWYgKHR5cGVSb290KSB7XG4gICAgICAgIGNvbnN0IGRpciA9IFBhdGgucmVzb2x2ZShwa2cucmVhbFBhdGgsIHR5cGVSb290KTtcbiAgICAgICAgZGlycy5wdXNoKGRpcik7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBkaXJzO1xufVxuIl19