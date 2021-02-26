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
    const baseUrlAbsPath = path_1.default.resolve(tsconfigDir, baseUrl);
    // if (opts.workspaceDir != null) {
    //   assigneeOptions.paths['_package-settings'] = [
    //     Path.relative(baseUrlAbsPath, opts.workspaceDir).replace(/\\/g, '/') + '/_package-settings'];
    // }
    assigneeOptions.baseUrl = baseUrl.replace(/\\/g, '/');
    if (opts.realPackagePaths) {
        Object.assign(assigneeOptions.paths, pathMappingForLinkedPkgs(baseUrlAbsPath));
    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1saXN0LWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsbUNBQTJFO0FBQzNFLGdEQUF3QjtBQUN4Qiw0Q0FBcUQ7QUFDckQsb0RBQXVCO0FBQ3ZCLG1DQUFpQztBQUdqQyxNQUFNLEdBQUcsR0FBRyxrQkFBUyxDQUFDLDJCQUEyQixDQUFDLENBQUM7QUFFbkQsUUFBZSxDQUFDLENBQUMsV0FBVyxDQUFDLE1BQW9DLEVBQy9ELFVBQWdDLEVBQUUsV0FBc0I7SUFFeEQsZ0RBQWdEO0lBRWhELElBQUksVUFBVSxLQUFLLFdBQVcsRUFBRTtRQUM5QixJQUFJLFdBQVcsRUFBRTtZQUNmLEtBQUssTUFBTSxVQUFVLElBQUksV0FBVyxFQUFFO2dCQUNwQyxNQUFNLE9BQU8sR0FBRyxxQkFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUMxQyxNQUFNLFFBQVEsR0FBRyxnQkFBUSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUMxRCxJQUFJLFFBQVEsSUFBSSxJQUFJO29CQUNsQixPQUFPO2dCQUNULEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFO29CQUM5QixNQUFNLEdBQUcsR0FBRyxnQkFBUSxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDaEQsSUFBSSxHQUFHLEVBQUU7d0JBQ1AsTUFBTSxHQUFHLENBQUM7cUJBQ1g7aUJBQ0Y7YUFDRjtTQUNGO2FBQU07WUFDTCxLQUFLLE1BQU0sR0FBRyxJQUFJLGdCQUFRLEVBQUUsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQ2pELE1BQU0sR0FBRyxDQUFDO2FBQ1g7U0FDRjtLQUNGO0lBQ0QsSUFBSSxVQUFVLEtBQUssS0FBSyxFQUFFO1FBQ3hC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Q0FBQyxTQUFTLEdBQUcsZ0JBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzlELElBQUksZUFBZSxDQUFDLFNBQVMsSUFBSSxJQUFJLElBQUksZUFBZSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQztRQUM3RSxPQUFPLGVBQWUsQ0FBQyxTQUFTLENBQUM7QUFDckMsQ0FBQztBQUVELFNBQVMsbUJBQW1CLENBQUMsb0JBQTZCO0lBQ3hELDZFQUE2RTtJQUM3RSxNQUFNLE1BQU0sR0FBRyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxvQkFBWSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUMxRyxNQUFNLElBQUksR0FBYSxFQUFFLENBQUM7SUFDMUIsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUU7UUFDMUIsS0FBSyxNQUFNLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUM5QyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRTtnQkFDeEIsTUFBTSxHQUFHLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUM3RCxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ2hCO1NBQ0Y7S0FDRjtJQUNELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Z2V0U3RhdGUsIHBhdGhUb1Byb2pLZXksIHdvcmtzcGFjZUtleSwgUGFja2FnZUluZm99IGZyb20gJy4vaW5kZXgnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge1BsaW5rRW52LCBjYWxjTm9kZVBhdGhzfSBmcm9tICcuLi9ub2RlLXBhdGgnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuXG5leHBvcnQgdHlwZSBQYWNrYWdlVHlwZSA9ICcqJyB8ICdidWlsZCcgfCAnY29yZSc7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLnBhY2thZ2UtbGlzdC1oZWxwZXInKTtcblxuZXhwb3J0IGZ1bmN0aW9uKiBhbGxQYWNrYWdlcyhfdHlwZXM/OiBQYWNrYWdlVHlwZSB8IFBhY2thZ2VUeXBlW10sXG4gIHJlY2lwZVR5cGU/OiAnc3JjJyB8ICdpbnN0YWxsZWQnLCBwcm9qZWN0RGlycz86IHN0cmluZ1tdKTogR2VuZXJhdG9yPFBhY2thZ2VJbmZvPiB7XG5cbiAgLy8gY29uc3Qgd3NLZXkgPSBwYXRoVG9Xb3Jrc3BhY2UocHJvY2Vzcy5jd2QoKSk7XG5cbiAgaWYgKHJlY2lwZVR5cGUgIT09ICdpbnN0YWxsZWQnKSB7XG4gICAgaWYgKHByb2plY3REaXJzKSB7XG4gICAgICBmb3IgKGNvbnN0IHByb2plY3REaXIgb2YgcHJvamVjdERpcnMpIHtcbiAgICAgICAgY29uc3QgcHJvaktleSA9IHBhdGhUb1Byb2pLZXkocHJvamVjdERpcik7XG4gICAgICAgIGNvbnN0IHBrZ05hbWVzID0gZ2V0U3RhdGUoKS5wcm9qZWN0MlBhY2thZ2VzLmdldChwcm9qS2V5KTtcbiAgICAgICAgaWYgKHBrZ05hbWVzID09IG51bGwpXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICBmb3IgKGNvbnN0IHBrZ05hbWUgb2YgcGtnTmFtZXMpIHtcbiAgICAgICAgICBjb25zdCBwa2cgPSBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmdldChwa2dOYW1lKTtcbiAgICAgICAgICBpZiAocGtnKSB7XG4gICAgICAgICAgICB5aWVsZCBwa2c7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAoY29uc3QgcGtnIG9mIGdldFN0YXRlKCkuc3JjUGFja2FnZXMudmFsdWVzKCkpIHtcbiAgICAgICAgeWllbGQgcGtnO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBpZiAocmVjaXBlVHlwZSAhPT0gJ3NyYycpIHtcbiAgICBmb3IgKGNvbnN0IHdzIG9mIGdldFN0YXRlKCkud29ya3NwYWNlcy52YWx1ZXMoKSkge1xuICAgICAgY29uc3QgaW5zdGFsbGVkID0gd3MuaW5zdGFsbGVkQ29tcG9uZW50cztcbiAgICAgIGlmIChpbnN0YWxsZWQpIHtcbiAgICAgICAgZm9yIChjb25zdCBjb21wIG9mIGluc3RhbGxlZC52YWx1ZXMoKSkge1xuICAgICAgICAgIHlpZWxkIGNvbXA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uKiBwYWNrYWdlczRXb3Jrc3BhY2VLZXkod3NLZXk6IHN0cmluZywgaW5jbHVkZUluc3RhbGxlZCA9IHRydWUpOiBHZW5lcmF0b3I8UGFja2FnZUluZm8+IHtcbiAgY29uc3Qgd3MgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KTtcbiAgaWYgKCF3cylcbiAgICByZXR1cm47XG5cbiAgY29uc3QgbGlua2VkID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcztcbiAgY29uc3QgaW5zdGFsbGVkID0gd3MuaW5zdGFsbGVkQ29tcG9uZW50cztcbiAgZm9yIChjb25zdCBbcGtOYW1lXSBvZiB3cy5saW5rZWREZXBlbmRlbmNpZXMpIHtcbiAgICBjb25zdCBwayA9IGxpbmtlZC5nZXQocGtOYW1lKTtcbiAgICBpZiAocGsgPT0gbnVsbClcbiAgICAgIGxvZy5lcnJvcihgTWlzc2luZyBwYWNrYWdlICR7cGtOYW1lfSBpbiB3b3Jrc3BhY2UgJHt3c0tleX1gKTtcbiAgICBlbHNlXG4gICAgICB5aWVsZCBwaztcbiAgfVxuICBmb3IgKGNvbnN0IFtwa05hbWVdIG9mIHdzLmxpbmtlZERldkRlcGVuZGVuY2llcykge1xuICAgIGNvbnN0IHBrID0gbGlua2VkLmdldChwa05hbWUpO1xuICAgIGlmIChwayA9PSBudWxsKVxuICAgICAgbG9nLmVycm9yKGBNaXNzaW5nIHBhY2thZ2UgJHtwa05hbWV9IGluIHdvcmtzcGFjZSAke3dzS2V5fWApO1xuICAgIGVsc2VcbiAgICAgIHlpZWxkIHBrO1xuICB9XG4gIGlmIChpbmNsdWRlSW5zdGFsbGVkICYmIGluc3RhbGxlZCkge1xuICAgIGZvciAoY29uc3QgY29tcCBvZiBpbnN0YWxsZWQudmFsdWVzKCkpIHtcbiAgICAgIHlpZWxkIGNvbXA7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYWNrYWdlczRXb3Jrc3BhY2Uod29ya3NwYWNlRGlyPzogc3RyaW5nLCBpbmNsdWRlSW5zdGFsbGVkID0gdHJ1ZSkge1xuICBjb25zdCB3c0tleSA9IHdvcmtzcGFjZUtleSh3b3Jrc3BhY2VEaXIgfHwgcHJvY2Vzcy5jd2QoKSk7XG4gIHJldHVybiBwYWNrYWdlczRXb3Jrc3BhY2VLZXkod3NLZXksIGluY2x1ZGVJbnN0YWxsZWQpO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVyT3B0aW9uU2V0T3B0IHtcbiAgLyoqIFdpbGwgYWRkIHR5cGVSb290cyBwcm9wZXJ0eSBmb3Igc3BlY2lmaWMgd29ya3NwYWNlLCBhbmQgYWRkIHBhdGhzIG9mIGZpbGUgXCJfcGFja2FnZS1zZXR0aW5ncy5kLnRzXCIgKi9cbiAgd29ya3NwYWNlRGlyPzogc3RyaW5nO1xuICAvKiogQWRkIHJlYWwgcGF0aCBvZiBhbGwgbGluayBwYWNrYWdlIHRvIFwicGF0aHNcIiBwcm9wZXJ0eSAqL1xuICByZWFsUGFja2FnZVBhdGhzPzogYm9vbGVhbjtcbiAgZW5hYmxlVHlwZVJvb3RzPzogYm9vbGVhbjtcbiAgbm9UeXBlUm9vdHNJblBhY2thZ2VzPzogYm9vbGVhbjtcbiAgLyoqIERlZmF1bHQgZmFsc2UsIERvIG5vdCBpbmNsdWRlIGxpbmtlZCBwYWNrYWdlIHN5bWxpbmtzIGRpcmVjdG9yeSBpbiBwYXRoKi9cbiAgbm9TeW1saW5rcz86IGJvb2xlYW47XG4gIGV4dHJhTm9kZVBhdGg/OiBzdHJpbmdbXTtcbiAgZXh0cmFUeXBlUm9vdD86IHN0cmluZ1tdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVyT3B0aW9ucyB7XG4gIGJhc2VVcmw6IHN0cmluZztcbiAgdHlwZVJvb3RzOiBzdHJpbmdbXTtcbiAgcGF0aHM6IHtbcGF0aDogc3RyaW5nXTogc3RyaW5nW119O1xuICBba2V5OiBzdHJpbmddOiBhbnk7XG59XG4vKipcbiAqIFNldCBcImJhc2VVcmxcIiwgXCJwYXRoc1wiIGFuZCBcInR5cGVSb290c1wiIHByb3BlcnR5IHJlbGF0aXZlIHRvIHRzY29uZmlnRGlyLCBwcm9jZXNzLmN3ZCgpXG4gKiBhbmQgcHJvY2Vzcy5lbnYuTk9ERV9QQVRIU1xuICogQHBhcmFtIHRzY29uZmlnRGlyIHByb2plY3QgZGlyZWN0b3J5IHdoZXJlIHRzY29uZmlnIGZpbGUgaXMgKHZpcnR1YWwpLFxuICogXCJiYXNlVXJsXCIsIFwidHlwZVJvb3RzXCIgaXMgcmVsYXRpdmUgdG8gdGhpcyBwYXJhbWV0ZXJcbiAqIEBwYXJhbSBiYXNlVXJsIGNvbXBpbGVyIG9wdGlvbiBcImJhc2VVcmxcIiwgXCJwYXRoc1wiIHdpbGwgYmUgcmVsYXRpdmUgdG8gdGhpcyBwYXJlbXRlclxuICogQHBhcmFtIGFzc2lnbmVlT3B0aW9ucyBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aChcbiAgdHNjb25maWdEaXI6IHN0cmluZyxcbiAgYmFzZVVybCA9ICcuLycsXG4gIGFzc2lnbmVlT3B0aW9uczogUGFydGlhbDxDb21waWxlck9wdGlvbnM+LFxuICBvcHRzOiBDb21waWxlck9wdGlvblNldE9wdCA9IHtlbmFibGVUeXBlUm9vdHM6IGZhbHNlfSkge1xuXG4gIGNvbnN0IHtyb290RGlyLCBwbGlua0Rpcn0gPSBKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmshKSBhcyBQbGlua0VudjtcbiAgbGV0IHN5bWxpbmtzRGlyOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGxldCBwYXRoc0RpcnM6IHN0cmluZ1tdID0gW107XG4gIC8vIHdvcmtzcGFjZSBub2RlX21vZHVsZXMgc2hvdWxkIGJlIHRoZSBmaXJzdFxuICBpZiAob3B0cy53b3Jrc3BhY2VEaXIgIT0gbnVsbCkge1xuICAgIHN5bWxpbmtzRGlyID0gUGF0aC5yZXNvbHZlKG9wdHMud29ya3NwYWNlRGlyLCAnLmxpbmtzJyk7XG4gICAgLy8gcGF0aHNEaXJzLnB1c2goUGF0aC5yZXNvbHZlKG9wdHMud29ya3NwYWNlRGlyLCAnbm9kZV9tb2R1bGVzJykpO1xuICAgIHBhdGhzRGlycy5wdXNoKC4uLmNhbGNOb2RlUGF0aHMocm9vdERpciwgc3ltbGlua3NEaXIsIG9wdHMud29ya3NwYWNlRGlyIHx8IHByb2Nlc3MuY3dkKCksIHBsaW5rRGlyKSk7XG4gIH1cblxuICBpZiAob3B0cy5leHRyYU5vZGVQYXRoICYmIG9wdHMuZXh0cmFOb2RlUGF0aC5sZW5ndGggPiAwKSB7XG4gICAgcGF0aHNEaXJzLnB1c2goLi4ub3B0cy5leHRyYU5vZGVQYXRoKTtcbiAgfVxuXG4gIHBhdGhzRGlycyA9IF8udW5pcShwYXRoc0RpcnMpO1xuXG4gIGlmIChvcHRzLm5vU3ltbGlua3MgJiYgc3ltbGlua3NEaXIpIHtcbiAgICBjb25zdCBpZHggPSBwYXRoc0RpcnMuaW5kZXhPZihzeW1saW5rc0Rpcik7XG4gICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICBwYXRoc0RpcnMuc3BsaWNlKGlkeCwgMSk7XG4gICAgfVxuICB9XG5cbiAgaWYgKFBhdGguaXNBYnNvbHV0ZShiYXNlVXJsKSkge1xuICAgIGxldCByZWxCYXNlVXJsID0gUGF0aC5yZWxhdGl2ZSh0c2NvbmZpZ0RpciwgYmFzZVVybCk7XG4gICAgaWYgKCFyZWxCYXNlVXJsLnN0YXJ0c1dpdGgoJy4nKSlcbiAgICAgIHJlbEJhc2VVcmwgPSAnLi8nICsgcmVsQmFzZVVybDtcbiAgICBiYXNlVXJsID0gcmVsQmFzZVVybDtcbiAgfVxuXG4gIGlmIChhc3NpZ25lZU9wdGlvbnMucGF0aHMgPT0gbnVsbClcbiAgICBhc3NpZ25lZU9wdGlvbnMucGF0aHMgPSB7fTtcblxuICBjb25zdCBiYXNlVXJsQWJzUGF0aCA9IFBhdGgucmVzb2x2ZSh0c2NvbmZpZ0RpciwgYmFzZVVybCk7XG4gIC8vIGlmIChvcHRzLndvcmtzcGFjZURpciAhPSBudWxsKSB7XG4gIC8vICAgYXNzaWduZWVPcHRpb25zLnBhdGhzWydfcGFja2FnZS1zZXR0aW5ncyddID0gW1xuICAvLyAgICAgUGF0aC5yZWxhdGl2ZShiYXNlVXJsQWJzUGF0aCwgb3B0cy53b3Jrc3BhY2VEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSArICcvX3BhY2thZ2Utc2V0dGluZ3MnXTtcbiAgLy8gfVxuXG4gIGFzc2lnbmVlT3B0aW9ucy5iYXNlVXJsID0gYmFzZVVybC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIGlmIChvcHRzLnJlYWxQYWNrYWdlUGF0aHMpIHtcbiAgICBPYmplY3QuYXNzaWduKGFzc2lnbmVlT3B0aW9ucy5wYXRocywgcGF0aE1hcHBpbmdGb3JMaW5rZWRQa2dzKGJhc2VVcmxBYnNQYXRoKSk7XG4gIH1cbiAgaWYgKGFzc2lnbmVlT3B0aW9ucy5wYXRoc1snKiddID09IG51bGwpXG4gICAgYXNzaWduZWVPcHRpb25zLnBhdGhzWycqJ10gPSBbXSBhcyBzdHJpbmdbXTtcbiAgY29uc3Qgd2lsZGNhcmRQYXRoczogc3RyaW5nW10gPSBhc3NpZ25lZU9wdGlvbnMucGF0aHNbJyonXTtcblxuICBmb3IgKGNvbnN0IGRpciBvZiBwYXRoc0RpcnMpIHtcbiAgICBjb25zdCByZWxhdGl2ZURpciA9IFBhdGgucmVsYXRpdmUoYmFzZVVybEFic1BhdGgsIGRpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIC8vIElNUE9SVEFOVDogYEB0eXBlLypgIG11c3QgYmUgcHJpbyB0byBgLypgLCBmb3IgdGhvc2UgcGFja2FnZXMgaGF2ZSBubyB0eXBlIGRlZmluaW50aW9uXG4gICAgd2lsZGNhcmRQYXRocy5wdXNoKFBhdGguam9pbihyZWxhdGl2ZURpciwgJ0B0eXBlcy8qJykucmVwbGFjZSgvXFxcXC9nLCAnLycpKTtcbiAgICB3aWxkY2FyZFBhdGhzLnB1c2goUGF0aC5qb2luKHJlbGF0aXZlRGlyLCAnKicpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSk7XG4gIH1cbiAgYXNzaWduZWVPcHRpb25zLnBhdGhzWycqJ10gPSBfLnVuaXEod2lsZGNhcmRQYXRocyk7XG4gIGFwcGVuZFR5cGVSb290cyhwYXRoc0RpcnMsIHRzY29uZmlnRGlyLCBhc3NpZ25lZU9wdGlvbnMsIG9wdHMpO1xuXG4gIHJldHVybiBhc3NpZ25lZU9wdGlvbnMgYXMgQ29tcGlsZXJPcHRpb25zO1xufVxuXG5mdW5jdGlvbiBwYXRoTWFwcGluZ0ZvckxpbmtlZFBrZ3MoYmFzZVVybEFic1BhdGg6IHN0cmluZykge1xuICBsZXQgZHJjcERpciA9IChnZXRTdGF0ZSgpLmxpbmtlZERyY3AgfHwgZ2V0U3RhdGUoKS5pbnN0YWxsZWREcmNwKSEucmVhbFBhdGg7XG5cbiAgY29uc3QgcGF0aE1hcHBpbmc6IHtba2V5OiBzdHJpbmddOiBzdHJpbmdbXX0gPSB7fTtcblxuICBmb3IgKGNvbnN0IFtuYW1lLCB7cmVhbFBhdGh9XSBvZiBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmVudHJpZXMoKSB8fCBbXSkge1xuICAgIGNvbnN0IHJlYWxEaXIgPSBQYXRoLnJlbGF0aXZlKGJhc2VVcmxBYnNQYXRoLCByZWFsUGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIHBhdGhNYXBwaW5nW25hbWVdID0gW3JlYWxEaXJdO1xuICAgIHBhdGhNYXBwaW5nW25hbWUgKyAnLyonXSA9IFtyZWFsRGlyICsgJy8qJ107XG4gIH1cblxuICAvLyBpZiAocGtnTmFtZSAhPT0gJ0B3ZmgvcGxpbmsnKSB7XG4gIGRyY3BEaXIgPSBQYXRoLnJlbGF0aXZlKGJhc2VVcmxBYnNQYXRoLCBkcmNwRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIHBhdGhNYXBwaW5nWydAd2ZoL3BsaW5rJ10gPSBbZHJjcERpcl07XG4gIHBhdGhNYXBwaW5nWydAd2ZoL3BsaW5rLyonXSA9IFtkcmNwRGlyICsgJy8qJ107XG4gIHJldHVybiBwYXRoTWFwcGluZztcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSBwYXRoc0RpcnMgTm9kZSBwYXRoIGxpa2UgcGF0aCBpbmZvcm1hdGlvblxuICogQHBhcmFtIHRzY29uZmlnRGlyIFxuICogQHBhcmFtIGFzc2lnbmVlT3B0aW9ucyBcbiAqIEBwYXJhbSBvcHRzIFxuICovXG5mdW5jdGlvbiBhcHBlbmRUeXBlUm9vdHMocGF0aHNEaXJzOiBzdHJpbmdbXSwgdHNjb25maWdEaXI6IHN0cmluZywgYXNzaWduZWVPcHRpb25zOiBQYXJ0aWFsPENvbXBpbGVyT3B0aW9ucz4sXG4gIG9wdHM6IENvbXBpbGVyT3B0aW9uU2V0T3B0KSB7XG5cbiAgaWYgKCFvcHRzLm5vVHlwZVJvb3RzSW5QYWNrYWdlcykge1xuICAgIGlmIChhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzID09IG51bGwpXG4gICAgICBhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzID0gW107XG4gICAgYXNzaWduZWVPcHRpb25zLnR5cGVSb290cy5wdXNoKFxuICAgICAgUGF0aC5yZWxhdGl2ZSh0c2NvbmZpZ0RpciwgUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3R5cGVzJykpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSxcbiAgICAgIC4uLnR5cGVSb290c0luUGFja2FnZXMob3B0cy53b3Jrc3BhY2VEaXIpLm1hcChkaXIgPT4gUGF0aC5yZWxhdGl2ZSh0c2NvbmZpZ0RpciwgZGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJykpXG4gICAgKTtcbiAgfVxuXG4gIGlmIChvcHRzLmVuYWJsZVR5cGVSb290cyApIHtcbiAgICBpZiAoYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyA9PSBudWxsKVxuICAgICAgYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyA9IFtdO1xuICAgIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMucHVzaCguLi5wYXRoc0RpcnMubWFwKGRpciA9PiB7XG4gICAgICBjb25zdCByZWxhdGl2ZURpciA9IFBhdGgucmVsYXRpdmUodHNjb25maWdEaXIsIGRpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgcmV0dXJuIHJlbGF0aXZlRGlyICsgJy9AdHlwZXMnO1xuICAgIH0pKTtcbiAgfVxuXG4gIGlmIChvcHRzLmV4dHJhVHlwZVJvb3QpIHtcbiAgICBpZiAoYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyA9PSBudWxsKVxuICAgICAgYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyA9IFtdO1xuICAgIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMucHVzaCguLi5vcHRzLmV4dHJhVHlwZVJvb3QubWFwKFxuICAgICAgZGlyID0+IFBhdGgucmVsYXRpdmUodHNjb25maWdEaXIsIGRpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpKSk7XG4gIH1cblxuICBhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzID0gXy51bmlxKGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMpO1xuICBpZiAoYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyAhPSBudWxsICYmIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMubGVuZ3RoID09PSAwKVxuICAgIGRlbGV0ZSBhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzO1xufVxuXG5mdW5jdGlvbiB0eXBlUm9vdHNJblBhY2thZ2VzKG9ubHlJbmNsdWRlV29ya3NwYWNlPzogc3RyaW5nKSB7XG4gIC8vIGNvbnN0IHtnZXRTdGF0ZSwgd29ya3NwYWNlS2V5fTogdHlwZW9mIF9wa2dNZ3IgPSByZXF1aXJlKCcuL3BhY2thZ2UtbWdyJyk7XG4gIGNvbnN0IHdzS2V5cyA9IG9ubHlJbmNsdWRlV29ya3NwYWNlID8gW3dvcmtzcGFjZUtleShvbmx5SW5jbHVkZVdvcmtzcGFjZSldIDogZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKTtcbiAgY29uc3QgZGlyczogc3RyaW5nW10gPSBbXTtcbiAgZm9yIChjb25zdCB3c0tleSBvZiB3c0tleXMpIHtcbiAgICBmb3IgKGNvbnN0IHBrZyBvZiBwYWNrYWdlczRXb3Jrc3BhY2VLZXkod3NLZXkpKSB7XG4gICAgICBpZiAocGtnLmpzb24uZHIudHlwZVJvb3QpIHtcbiAgICAgICAgY29uc3QgZGlyID0gUGF0aC5yZXNvbHZlKHBrZy5yZWFsUGF0aCwgcGtnLmpzb24uZHIudHlwZVJvb3QpO1xuICAgICAgICBkaXJzLnB1c2goZGlyKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRpcnM7XG59XG4iXX0=