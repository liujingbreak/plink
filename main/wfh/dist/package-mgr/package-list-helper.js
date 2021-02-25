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
    const { rootDir, plinkDir } = JSON.parse(process.env.__plink);
    let symlinksDir;
    let pathsDirs = [];
    // workspace node_modules should be the first
    if (opts.workspaceDir != null) {
        symlinksDir = path_1.default.resolve(opts.workspaceDir, '.links');
        // pathsDirs.push(Path.resolve(opts.workspaceDir, 'node_modules'));
        pathsDirs.push(...node_path_1.calcNodePaths(rootDir, symlinksDir, opts.workspaceDir || process.cwd(), plinkDir));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1saXN0LWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsbUNBQTJFO0FBQzNFLGdEQUF3QjtBQUN4Qiw0Q0FBcUQ7QUFDckQsb0RBQXVCO0FBQ3ZCLG1DQUFpQztBQUdqQyxNQUFNLEdBQUcsR0FBRyxrQkFBUyxDQUFDLDJCQUEyQixDQUFDLENBQUM7QUFFbkQsUUFBZSxDQUFDLENBQUMsV0FBVyxDQUFDLE1BQW9DLEVBQy9ELFVBQWdDLEVBQUUsV0FBc0I7SUFFeEQsZ0RBQWdEO0lBRWhELElBQUksVUFBVSxLQUFLLFdBQVcsRUFBRTtRQUM5QixJQUFJLFdBQVcsRUFBRTtZQUNmLEtBQUssTUFBTSxVQUFVLElBQUksV0FBVyxFQUFFO2dCQUNwQyxNQUFNLE9BQU8sR0FBRyxxQkFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUMxQyxNQUFNLFFBQVEsR0FBRyxnQkFBUSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUMxRCxJQUFJLFFBQVEsSUFBSSxJQUFJO29CQUNsQixPQUFPO2dCQUNULEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFO29CQUM5QixNQUFNLEdBQUcsR0FBRyxnQkFBUSxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDaEQsSUFBSSxHQUFHLEVBQUU7d0JBQ1AsTUFBTSxHQUFHLENBQUM7cUJBQ1g7aUJBQ0Y7YUFDRjtTQUNGO2FBQU07WUFDTCxLQUFLLE1BQU0sR0FBRyxJQUFJLGdCQUFRLEVBQUUsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQ2pELE1BQU0sR0FBRyxDQUFDO2FBQ1g7U0FDRjtLQUNGO0lBQ0QsSUFBSSxVQUFVLEtBQUssS0FBSyxFQUFFO1FBQ3hC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QUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDN0QsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNoQjtTQUNGO0tBQ0Y7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge2dldFN0YXRlLCBwYXRoVG9Qcm9qS2V5LCB3b3Jrc3BhY2VLZXksIFBhY2thZ2VJbmZvfSBmcm9tICcuL2luZGV4JztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtQbGlua0VudiwgY2FsY05vZGVQYXRoc30gZnJvbSAnLi4vbm9kZS1wYXRoJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcblxuZXhwb3J0IHR5cGUgUGFja2FnZVR5cGUgPSAnKicgfCAnYnVpbGQnIHwgJ2NvcmUnO1xuY29uc3QgbG9nID0gZ2V0TG9nZ2VyKCdwbGluay5wYWNrYWdlLWxpc3QtaGVscGVyJyk7XG5cbmV4cG9ydCBmdW5jdGlvbiogYWxsUGFja2FnZXMoX3R5cGVzPzogUGFja2FnZVR5cGUgfCBQYWNrYWdlVHlwZVtdLFxuICByZWNpcGVUeXBlPzogJ3NyYycgfCAnaW5zdGFsbGVkJywgcHJvamVjdERpcnM/OiBzdHJpbmdbXSk6IEdlbmVyYXRvcjxQYWNrYWdlSW5mbz4ge1xuXG4gIC8vIGNvbnN0IHdzS2V5ID0gcGF0aFRvV29ya3NwYWNlKHByb2Nlc3MuY3dkKCkpO1xuXG4gIGlmIChyZWNpcGVUeXBlICE9PSAnaW5zdGFsbGVkJykge1xuICAgIGlmIChwcm9qZWN0RGlycykge1xuICAgICAgZm9yIChjb25zdCBwcm9qZWN0RGlyIG9mIHByb2plY3REaXJzKSB7XG4gICAgICAgIGNvbnN0IHByb2pLZXkgPSBwYXRoVG9Qcm9qS2V5KHByb2plY3REaXIpO1xuICAgICAgICBjb25zdCBwa2dOYW1lcyA9IGdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5nZXQocHJvaktleSk7XG4gICAgICAgIGlmIChwa2dOYW1lcyA9PSBudWxsKVxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgZm9yIChjb25zdCBwa2dOYW1lIG9mIHBrZ05hbWVzKSB7XG4gICAgICAgICAgY29uc3QgcGtnID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy5nZXQocGtnTmFtZSk7XG4gICAgICAgICAgaWYgKHBrZykge1xuICAgICAgICAgICAgeWllbGQgcGtnO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKGNvbnN0IHBrZyBvZiBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLnZhbHVlcygpKSB7XG4gICAgICAgIHlpZWxkIHBrZztcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgaWYgKHJlY2lwZVR5cGUgIT09ICdzcmMnKSB7XG4gICAgZm9yIChjb25zdCB3cyBvZiBnZXRTdGF0ZSgpLndvcmtzcGFjZXMudmFsdWVzKCkpIHtcbiAgICAgIGNvbnN0IGluc3RhbGxlZCA9IHdzLmluc3RhbGxlZENvbXBvbmVudHM7XG4gICAgICBpZiAoaW5zdGFsbGVkKSB7XG4gICAgICAgIGZvciAoY29uc3QgY29tcCBvZiBpbnN0YWxsZWQudmFsdWVzKCkpIHtcbiAgICAgICAgICB5aWVsZCBjb21wO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiogcGFja2FnZXM0V29ya3NwYWNlS2V5KHdzS2V5OiBzdHJpbmcsIGluY2x1ZGVJbnN0YWxsZWQgPSB0cnVlKTogR2VuZXJhdG9yPFBhY2thZ2VJbmZvPiB7XG4gIGNvbnN0IHdzID0gZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmdldCh3c0tleSk7XG4gIGlmICghd3MpXG4gICAgcmV0dXJuO1xuXG4gIGNvbnN0IGxpbmtlZCA9IGdldFN0YXRlKCkuc3JjUGFja2FnZXM7XG4gIGNvbnN0IGluc3RhbGxlZCA9IHdzLmluc3RhbGxlZENvbXBvbmVudHM7XG4gIGZvciAoY29uc3QgW3BrTmFtZV0gb2Ygd3MubGlua2VkRGVwZW5kZW5jaWVzKSB7XG4gICAgY29uc3QgcGsgPSBsaW5rZWQuZ2V0KHBrTmFtZSk7XG4gICAgaWYgKHBrID09IG51bGwpXG4gICAgICBsb2cuZXJyb3IoYE1pc3NpbmcgcGFja2FnZSAke3BrTmFtZX0gaW4gd29ya3NwYWNlICR7d3NLZXl9YCk7XG4gICAgZWxzZVxuICAgICAgeWllbGQgcGs7XG4gIH1cbiAgZm9yIChjb25zdCBbcGtOYW1lXSBvZiB3cy5saW5rZWREZXZEZXBlbmRlbmNpZXMpIHtcbiAgICBjb25zdCBwayA9IGxpbmtlZC5nZXQocGtOYW1lKTtcbiAgICBpZiAocGsgPT0gbnVsbClcbiAgICAgIGxvZy5lcnJvcihgTWlzc2luZyBwYWNrYWdlICR7cGtOYW1lfSBpbiB3b3Jrc3BhY2UgJHt3c0tleX1gKTtcbiAgICBlbHNlXG4gICAgICB5aWVsZCBwaztcbiAgfVxuICBpZiAoaW5jbHVkZUluc3RhbGxlZCAmJiBpbnN0YWxsZWQpIHtcbiAgICBmb3IgKGNvbnN0IGNvbXAgb2YgaW5zdGFsbGVkLnZhbHVlcygpKSB7XG4gICAgICB5aWVsZCBjb21wO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFja2FnZXM0V29ya3NwYWNlKHdvcmtzcGFjZURpcj86IHN0cmluZywgaW5jbHVkZUluc3RhbGxlZCA9IHRydWUpIHtcbiAgY29uc3Qgd3NLZXkgPSB3b3Jrc3BhY2VLZXkod29ya3NwYWNlRGlyIHx8IHByb2Nlc3MuY3dkKCkpO1xuICByZXR1cm4gcGFja2FnZXM0V29ya3NwYWNlS2V5KHdzS2V5LCBpbmNsdWRlSW5zdGFsbGVkKTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb21waWxlck9wdGlvblNldE9wdCB7XG4gIC8qKiBXaWxsIGFkZCB0eXBlUm9vdHMgcHJvcGVydHkgZm9yIHNwZWNpZmljIHdvcmtzcGFjZSwgYW5kIGFkZCBwYXRocyBvZiBmaWxlIFwiX3BhY2thZ2Utc2V0dGluZ3MuZC50c1wiICovXG4gIHdvcmtzcGFjZURpcj86IHN0cmluZztcbiAgZW5hYmxlVHlwZVJvb3RzPzogYm9vbGVhbjtcbiAgbm9UeXBlUm9vdHNJblBhY2thZ2VzPzogYm9vbGVhbjtcbiAgLyoqIERlZmF1bHQgZmFsc2UsIERvIG5vdCBpbmNsdWRlIGxpbmtlZCBwYWNrYWdlIHN5bWxpbmtzIGRpcmVjdG9yeSBpbiBwYXRoKi9cbiAgbm9TeW1saW5rcz86IGJvb2xlYW47XG4gIGV4dHJhTm9kZVBhdGg/OiBzdHJpbmdbXTtcbiAgZXh0cmFUeXBlUm9vdD86IHN0cmluZ1tdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVyT3B0aW9ucyB7XG4gIGJhc2VVcmw6IHN0cmluZztcbiAgdHlwZVJvb3RzOiBzdHJpbmdbXTtcbiAgcGF0aHM6IHtbcGF0aDogc3RyaW5nXTogc3RyaW5nW119O1xuICBba2V5OiBzdHJpbmddOiBhbnk7XG59XG4vKipcbiAqIFNldCBcImJhc2VVcmxcIiwgXCJwYXRoc1wiIGFuZCBcInR5cGVSb290c1wiIHByb3BlcnR5IHJlbGF0aXZlIHRvIHRzY29uZmlnRGlyLCBwcm9jZXNzLmN3ZCgpXG4gKiBhbmQgcHJvY2Vzcy5lbnYuTk9ERV9QQVRIU1xuICogQHBhcmFtIHRzY29uZmlnRGlyIHByb2plY3QgZGlyZWN0b3J5IHdoZXJlIHRzY29uZmlnIGZpbGUgaXMgKHZpcnR1YWwpLFxuICogXCJiYXNlVXJsXCIsIFwidHlwZVJvb3RzXCIgaXMgcmVsYXRpdmUgdG8gdGhpcyBwYXJhbWV0ZXJcbiAqIEBwYXJhbSBiYXNlVXJsIGNvbXBpbGVyIG9wdGlvbiBcImJhc2VVcmxcIiwgXCJwYXRoc1wiIHdpbGwgYmUgcmVsYXRpdmUgdG8gdGhpcyBwYXJlbXRlclxuICogQHBhcmFtIGFzc2lnbmVlT3B0aW9ucyBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aChcbiAgdHNjb25maWdEaXI6IHN0cmluZyxcbiAgYmFzZVVybCA9ICcuLycsXG4gIGFzc2lnbmVlT3B0aW9uczogUGFydGlhbDxDb21waWxlck9wdGlvbnM+LFxuICBvcHRzOiBDb21waWxlck9wdGlvblNldE9wdCA9IHtlbmFibGVUeXBlUm9vdHM6IGZhbHNlfSkge1xuXG4gIGNvbnN0IHtyb290RGlyLCBwbGlua0Rpcn0gPSBKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmshKSBhcyBQbGlua0VudjtcbiAgbGV0IHN5bWxpbmtzRGlyOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGxldCBwYXRoc0RpcnM6IHN0cmluZ1tdID0gW107XG4gIC8vIHdvcmtzcGFjZSBub2RlX21vZHVsZXMgc2hvdWxkIGJlIHRoZSBmaXJzdFxuICBpZiAob3B0cy53b3Jrc3BhY2VEaXIgIT0gbnVsbCkge1xuICAgIHN5bWxpbmtzRGlyID0gUGF0aC5yZXNvbHZlKG9wdHMud29ya3NwYWNlRGlyLCAnLmxpbmtzJyk7XG4gICAgLy8gcGF0aHNEaXJzLnB1c2goUGF0aC5yZXNvbHZlKG9wdHMud29ya3NwYWNlRGlyLCAnbm9kZV9tb2R1bGVzJykpO1xuICAgIHBhdGhzRGlycy5wdXNoKC4uLmNhbGNOb2RlUGF0aHMocm9vdERpciwgc3ltbGlua3NEaXIsIG9wdHMud29ya3NwYWNlRGlyIHx8IHByb2Nlc3MuY3dkKCksIHBsaW5rRGlyKSk7XG4gIH1cblxuICBpZiAob3B0cy5leHRyYU5vZGVQYXRoICYmIG9wdHMuZXh0cmFOb2RlUGF0aC5sZW5ndGggPiAwKSB7XG4gICAgcGF0aHNEaXJzLnB1c2goLi4ub3B0cy5leHRyYU5vZGVQYXRoKTtcbiAgfVxuXG4gIHBhdGhzRGlycyA9IF8udW5pcShwYXRoc0RpcnMpO1xuXG4gIGlmIChvcHRzLm5vU3ltbGlua3MgJiYgc3ltbGlua3NEaXIpIHtcbiAgICBjb25zdCBpZHggPSBwYXRoc0RpcnMuaW5kZXhPZihzeW1saW5rc0Rpcik7XG4gICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICBwYXRoc0RpcnMuc3BsaWNlKGlkeCwgMSk7XG4gICAgfVxuICB9XG5cbiAgaWYgKFBhdGguaXNBYnNvbHV0ZShiYXNlVXJsKSkge1xuICAgIGxldCByZWxCYXNlVXJsID0gUGF0aC5yZWxhdGl2ZSh0c2NvbmZpZ0RpciwgYmFzZVVybCk7XG4gICAgaWYgKCFyZWxCYXNlVXJsLnN0YXJ0c1dpdGgoJy4nKSlcbiAgICAgIHJlbEJhc2VVcmwgPSAnLi8nICsgcmVsQmFzZVVybDtcbiAgICBiYXNlVXJsID0gcmVsQmFzZVVybDtcbiAgfVxuXG4gIGlmIChhc3NpZ25lZU9wdGlvbnMucGF0aHMgPT0gbnVsbClcbiAgICBhc3NpZ25lZU9wdGlvbnMucGF0aHMgPSB7fTtcblxuICBjb25zdCBhYnNCYXNlVXJsID0gUGF0aC5yZXNvbHZlKHRzY29uZmlnRGlyLCBiYXNlVXJsKTtcbiAgLy8gaWYgKG9wdHMud29ya3NwYWNlRGlyICE9IG51bGwpIHtcbiAgLy8gICBhc3NpZ25lZU9wdGlvbnMucGF0aHNbJ19wYWNrYWdlLXNldHRpbmdzJ10gPSBbXG4gIC8vICAgICBQYXRoLnJlbGF0aXZlKGFic0Jhc2VVcmwsIG9wdHMud29ya3NwYWNlRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJykgKyAnL19wYWNrYWdlLXNldHRpbmdzJ107XG4gIC8vIH1cblxuICBhc3NpZ25lZU9wdGlvbnMuYmFzZVVybCA9IGJhc2VVcmwucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICBjb25zdCBvdGhlclBhdGhzOiBzdHJpbmdbXSA9IGFzc2lnbmVlT3B0aW9ucy5wYXRoc1snKiddID0gW107XG5cbiAgZm9yIChjb25zdCBkaXIgb2YgcGF0aHNEaXJzKSB7XG4gICAgY29uc3QgcmVsYXRpdmVEaXIgPSBQYXRoLnJlbGF0aXZlKGFic0Jhc2VVcmwsIGRpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIC8vIElNUE9SVEFOVDogYEB0eXBlLypgIG11c3QgYmUgcHJpbyB0byBgLypgLCBmb3IgdGhvc2UgcGFja2FnZXMgaGF2ZSBubyB0eXBlIGRlZmluaW50aW9uXG4gICAgb3RoZXJQYXRocy5wdXNoKFBhdGguam9pbihyZWxhdGl2ZURpciwgJ0B0eXBlcy8qJykucmVwbGFjZSgvXFxcXC9nLCAnLycpKTtcbiAgICBvdGhlclBhdGhzLnB1c2goUGF0aC5qb2luKHJlbGF0aXZlRGlyLCAnKicpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSk7XG4gIH1cblxuXG4gIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMgPSBvcHRzLm5vVHlwZVJvb3RzSW5QYWNrYWdlcyA/IFtdIDogW1xuICAgIFBhdGgucmVsYXRpdmUodHNjb25maWdEaXIsIFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90eXBlcycpKS5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4gICAgLi4udHlwZVJvb3RzSW5QYWNrYWdlcyhvcHRzLndvcmtzcGFjZURpcikubWFwKGRpciA9PiBQYXRoLnJlbGF0aXZlKHRzY29uZmlnRGlyLCBkaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSlcbiAgXTtcblxuICBpZiAob3B0cy5lbmFibGVUeXBlUm9vdHMgKSB7XG4gICAgYXNzaWduZWVPcHRpb25zLnR5cGVSb290cy5wdXNoKC4uLnBhdGhzRGlycy5tYXAoZGlyID0+IHtcbiAgICAgIGNvbnN0IHJlbGF0aXZlRGlyID0gUGF0aC5yZWxhdGl2ZSh0c2NvbmZpZ0RpciwgZGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICByZXR1cm4gcmVsYXRpdmVEaXIgKyAnL0B0eXBlcyc7XG4gICAgfSkpO1xuICB9XG5cbiAgaWYgKG9wdHMuZXh0cmFUeXBlUm9vdCkge1xuICAgIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMucHVzaCguLi5vcHRzLmV4dHJhVHlwZVJvb3QubWFwKFxuICAgICAgZGlyID0+IFBhdGgucmVsYXRpdmUodHNjb25maWdEaXIsIGRpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpKSk7XG4gIH1cblxuICBpZiAoYXNzaWduZWVPcHRpb25zLnR5cGVSb290cy5sZW5ndGggPT09IDApXG4gICAgZGVsZXRlIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHM7XG5cbiAgcmV0dXJuIGFzc2lnbmVlT3B0aW9ucyBhcyBDb21waWxlck9wdGlvbnM7XG59XG5cbmZ1bmN0aW9uIHR5cGVSb290c0luUGFja2FnZXMob25seUluY2x1ZGVXb3Jrc3BhY2U/OiBzdHJpbmcpIHtcbiAgLy8gY29uc3Qge2dldFN0YXRlLCB3b3Jrc3BhY2VLZXl9OiB0eXBlb2YgX3BrZ01nciA9IHJlcXVpcmUoJy4vcGFja2FnZS1tZ3InKTtcbiAgY29uc3Qgd3NLZXlzID0gb25seUluY2x1ZGVXb3Jrc3BhY2UgPyBbd29ya3NwYWNlS2V5KG9ubHlJbmNsdWRlV29ya3NwYWNlKV0gOiBnZXRTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpO1xuICBjb25zdCBkaXJzOiBzdHJpbmdbXSA9IFtdO1xuICBmb3IgKGNvbnN0IHdzS2V5IG9mIHdzS2V5cykge1xuICAgIGZvciAoY29uc3QgcGtnIG9mIHBhY2thZ2VzNFdvcmtzcGFjZUtleSh3c0tleSkpIHtcbiAgICAgIGlmIChwa2cuanNvbi5kci50eXBlUm9vdCkge1xuICAgICAgICBjb25zdCBkaXIgPSBQYXRoLnJlc29sdmUocGtnLnJlYWxQYXRoLCBwa2cuanNvbi5kci50eXBlUm9vdCk7XG4gICAgICAgIGRpcnMucHVzaChkaXIpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gZGlycztcbn1cbiJdfQ==