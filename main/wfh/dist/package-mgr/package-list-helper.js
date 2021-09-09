"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.appendTypeRoots = exports.setTsCompilerOptForNodePath = exports.workspacesOfDependencies = exports.packages4Workspace = exports.packages4WorkspaceKey = exports.allPackages = void 0;
const index_1 = require("./index");
const path_1 = __importDefault(require("path"));
const node_path_calc_1 = require("../node-path-calc");
const lodash_1 = __importDefault(require("lodash"));
const log4js_1 = require("log4js");
const misc_1 = require("../utils/misc");
const fs_1 = __importDefault(require("fs"));
const log = (0, log4js_1.getLogger)('plink.package-list-helper');
function* allPackages(_types, recipeType, projectDirs) {
    if (recipeType !== 'installed') {
        if (projectDirs) {
            for (const projectDir of projectDirs) {
                const projKey = (0, index_1.pathToProjKey)(projectDir);
                const pkgNames = (0, index_1.getState)().project2Packages.get(projKey);
                if (pkgNames == null)
                    return;
                for (const pkgName of pkgNames) {
                    const pkg = (0, index_1.getState)().srcPackages.get(pkgName);
                    if (pkg) {
                        yield pkg;
                    }
                }
            }
        }
        else {
            for (const pkg of (0, index_1.getState)().srcPackages.values()) {
                yield pkg;
            }
        }
    }
    if (recipeType !== 'src') {
        for (const ws of (0, index_1.getState)().workspaces.values()) {
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
    const ws = (0, index_1.getState)().workspaces.get(wsKey);
    if (!ws)
        return;
    const linked = (0, index_1.getState)().srcPackages;
    const installed = ws.installedComponents;
    const avoidDuplicateSet = new Set();
    for (const [pkName] of ws.linkedDependencies) {
        avoidDuplicateSet.add(pkName);
        const pk = linked.get(pkName);
        if (pk == null)
            log.error(`Missing package ${pkName} in workspace ${wsKey}`);
        else
            yield pk;
    }
    for (const [pkName] of ws.linkedDevDependencies) {
        if (avoidDuplicateSet.has(pkName)) {
            continue;
        }
        const pk = linked.get(pkName);
        if (pk == null)
            log.error(`Missing package ${pkName} in workspace ${wsKey}`);
        else
            yield pk;
    }
    if (includeInstalled && installed) {
        for (const comp of installed.values()) {
            if (avoidDuplicateSet.has(comp.name)) {
                continue;
            }
            yield comp;
        }
    }
}
exports.packages4WorkspaceKey = packages4WorkspaceKey;
function packages4Workspace(workspaceDir, includeInstalled = true) {
    const wsKey = (0, index_1.workspaceKey)(workspaceDir || misc_1.plinkEnv.workDir);
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
    for (const [key, wsState] of (0, index_1.getState)().workspaces.entries()) {
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
    // let wsState: WorkspaceState | undefined;
    let wsKey;
    if (opts.workspaceDir != null) {
        symlinksDir = path_1.default.resolve(opts.workspaceDir, misc_1.plinkEnv.symlinkDirName);
        pathsDirs.push(...(0, node_path_calc_1.calcNodePaths)(misc_1.plinkEnv.rootDir, symlinksDir, opts.workspaceDir || misc_1.plinkEnv.workDir, misc_1.plinkEnv.plinkDir));
        wsKey = (0, index_1.workspaceKey)(opts.workspaceDir);
        // wsState = getState().workspaces.get(wsKey);
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
    if (opts.workspaceDir) {
        assigneeOptions.paths['package-settings'] = [
            path_1.default.relative(baseUrlAbsPath, path_1.default.join(misc_1.plinkEnv.distDir, wsKey + '.package-settings'))
                .replace(/\\/g, '/')
        ];
    }
    // if (wsState) {
    //   assignSpecialPaths(wsState.installJson.dependencies, pathsDirs, assigneeOptions, baseUrlAbsPath);
    //   assignSpecialPaths(wsState.installJson.devDependencies, pathsDirs, assigneeOptions, baseUrlAbsPath);
    //   assignSpecialPaths(wsState.installJson.peerDependencies, pathsDirs, assigneeOptions, baseUrlAbsPath);
    // }
    assigneeOptions.baseUrl = baseUrl.replace(/\\/g, '/');
    // if (assigneeOptions.paths['*'] == null)
    //   assigneeOptions.paths['*'] = [] as string[];
    // const wildcardPaths: string[] = assigneeOptions.paths['*'];
    // for (const dir of pathsDirs) {
    //   const relativeDir = Path.relative(baseUrlAbsPath, dir).replace(/\\/g, '/');
    //   // IMPORTANT: `@type/*` must be prio to `/*`, for those packages have no type definintion
    //   wildcardPaths.push(Path.join(relativeDir, '@types/*').replace(/\\/g, '/'));
    //   wildcardPaths.push(Path.join(relativeDir, '*').replace(/\\/g, '/'));
    // }
    // assigneeOptions.paths['*'] = _.uniq(wildcardPaths);
    appendTypeRoots(pathsDirs, tsconfigDir, assigneeOptions, opts);
    return assigneeOptions;
}
exports.setTsCompilerOptForNodePath = setTsCompilerOptForNodePath;
/**
 * For those special scoped package which is like @loadable/component, its type definition package is
 * @types/loadable__component
 */
// function assignSpecialPaths(dependencies: {[dep: string]: string} | undefined,
//   nodePaths: Iterable<string>,
//   assigneeOptions: Partial<CompilerOptions>, absBaseUrlPath: string) {
//   if (dependencies == null)
//     return;
//   // if (assigneeOptions.paths == null)
//   //   assigneeOptions.paths = {};
//   for (const item of Object.keys(dependencies)) {
//     const m = /^@types\/(.*?)__(.*?)$/.exec(item);
//     if (m) {
//       const originPkgName = `@${m[1]}/${m[2]}`;
//       const exactOne: string[] = assigneeOptions.paths![originPkgName] = [];
//       const wildOne: string[] = assigneeOptions.paths![originPkgName + '/*'] = [];
//       for (const dir of nodePaths) {
//         const relativeDir = Path.relative(absBaseUrlPath, dir + '/' + item).replace(/\\/g, '/');
//         exactOne.push(relativeDir);
//         wildOne.push(relativeDir + '/*');
//       }
//     }
//   }
// }
function pathMappingForLinkedPkgs(baseUrlAbsPath) {
    let drcpDir = ((0, index_1.getState)().linkedDrcp || (0, index_1.getState)().installedDrcp).realPath;
    const pathMapping = {};
    for (const [name, { realPath }] of (0, index_1.getState)().srcPackages.entries() || []) {
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
    if (opts.noTypeRootsInPackages == null || !opts.noTypeRootsInPackages) {
        if (assigneeOptions.typeRoots == null)
            assigneeOptions.typeRoots = [];
        assigneeOptions.typeRoots.push(
        // plink directory: wfh/types, it is a symlink at runtime, due to Plink uses preserve-symlinks to run commands
        path_1.default.relative(tsconfigDir, fs_1.default.realpathSync(path_1.default.resolve(__dirname, '../../types'))).replace(/\\/g, '/'), ...typeRootsInPackages(opts.workspaceDir).map(dir => path_1.default.relative(tsconfigDir, dir).replace(/\\/g, '/')));
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
exports.appendTypeRoots = appendTypeRoots;
function typeRootsInPackages(onlyIncludeWorkspace) {
    // const {getState, workspaceKey}: typeof _pkgMgr = require('./package-mgr');
    const wsKeys = onlyIncludeWorkspace ? [(0, index_1.workspaceKey)(onlyIncludeWorkspace)] : (0, index_1.getState)().workspaces.keys();
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1saXN0LWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsbUNBQTJFO0FBQzNFLGdEQUF3QjtBQUN4QixzREFBZ0Q7QUFDaEQsb0RBQXVCO0FBQ3ZCLG1DQUFpQztBQUNqQyx3Q0FBdUM7QUFFdkMsNENBQW9CO0FBR3BCLE1BQU0sR0FBRyxHQUFHLElBQUEsa0JBQVMsRUFBQywyQkFBMkIsQ0FBQyxDQUFDO0FBRW5ELFFBQWUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxNQUFvQyxFQUMvRCxVQUFnQyxFQUFFLFdBQXNCO0lBRXhELElBQUksVUFBVSxLQUFLLFdBQVcsRUFBRTtRQUM5QixJQUFJLFdBQVcsRUFBRTtZQUNmLEtBQUssTUFBTSxVQUFVLElBQUksV0FBVyxFQUFFO2dCQUNwQyxNQUFNLE9BQU8sR0FBRyxJQUFBLHFCQUFhLEVBQUMsVUFBVSxDQUFDLENBQUM7Z0JBQzFDLE1BQU0sUUFBUSxHQUFHLElBQUEsZ0JBQVEsR0FBRSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztnQkFDMUQsSUFBSSxRQUFRLElBQUksSUFBSTtvQkFDbEIsT0FBTztnQkFDVCxLQUFLLE1BQU0sT0FBTyxJQUFJLFFBQVEsRUFBRTtvQkFDOUIsTUFBTSxHQUFHLEdBQUcsSUFBQSxnQkFBUSxHQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDaEQsSUFBSSxHQUFHLEVBQUU7d0JBQ1AsTUFBTSxHQUFHLENBQUM7cUJBQ1g7aUJBQ0Y7YUFDRjtTQUNGO2FBQU07WUFDTCxLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUEsZ0JBQVEsR0FBRSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsRUFBRTtnQkFDakQsTUFBTSxHQUFHLENBQUM7YUFDWDtTQUNGO0tB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QUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ3RHLElBQUksUUFBUSxFQUFFO2dCQUNaLE1BQU0sR0FBRyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDakQsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNoQjtTQUNGO0tBQ0Y7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge2dldFN0YXRlLCBwYXRoVG9Qcm9qS2V5LCB3b3Jrc3BhY2VLZXksIFBhY2thZ2VJbmZvfSBmcm9tICcuL2luZGV4JztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtjYWxjTm9kZVBhdGhzfSBmcm9tICcuLi9ub2RlLXBhdGgtY2FsYyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHtnZXRMb2dnZXJ9IGZyb20gJ2xvZzRqcyc7XG5pbXBvcnQge3BsaW5rRW52fSBmcm9tICcuLi91dGlscy9taXNjJztcbmltcG9ydCB0cyBmcm9tICd0eXBlc2NyaXB0JztcbmltcG9ydCBmcyBmcm9tICdmcyc7XG5cbmV4cG9ydCB0eXBlIFBhY2thZ2VUeXBlID0gJyonIHwgJ2J1aWxkJyB8ICdjb3JlJztcbmNvbnN0IGxvZyA9IGdldExvZ2dlcigncGxpbmsucGFja2FnZS1saXN0LWhlbHBlcicpO1xuXG5leHBvcnQgZnVuY3Rpb24qIGFsbFBhY2thZ2VzKF90eXBlcz86IFBhY2thZ2VUeXBlIHwgUGFja2FnZVR5cGVbXSxcbiAgcmVjaXBlVHlwZT86ICdzcmMnIHwgJ2luc3RhbGxlZCcsIHByb2plY3REaXJzPzogc3RyaW5nW10pOiBHZW5lcmF0b3I8UGFja2FnZUluZm8+IHtcblxuICBpZiAocmVjaXBlVHlwZSAhPT0gJ2luc3RhbGxlZCcpIHtcbiAgICBpZiAocHJvamVjdERpcnMpIHtcbiAgICAgIGZvciAoY29uc3QgcHJvamVjdERpciBvZiBwcm9qZWN0RGlycykge1xuICAgICAgICBjb25zdCBwcm9qS2V5ID0gcGF0aFRvUHJvaktleShwcm9qZWN0RGlyKTtcbiAgICAgICAgY29uc3QgcGtnTmFtZXMgPSBnZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMuZ2V0KHByb2pLZXkpO1xuICAgICAgICBpZiAocGtnTmFtZXMgPT0gbnVsbClcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIGZvciAoY29uc3QgcGtnTmFtZSBvZiBwa2dOYW1lcykge1xuICAgICAgICAgIGNvbnN0IHBrZyA9IGdldFN0YXRlKCkuc3JjUGFja2FnZXMuZ2V0KHBrZ05hbWUpO1xuICAgICAgICAgIGlmIChwa2cpIHtcbiAgICAgICAgICAgIHlpZWxkIHBrZztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yIChjb25zdCBwa2cgb2YgZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy52YWx1ZXMoKSkge1xuICAgICAgICB5aWVsZCBwa2c7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmIChyZWNpcGVUeXBlICE9PSAnc3JjJykge1xuICAgIGZvciAoY29uc3Qgd3Mgb2YgZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLnZhbHVlcygpKSB7XG4gICAgICBjb25zdCBpbnN0YWxsZWQgPSB3cy5pbnN0YWxsZWRDb21wb25lbnRzO1xuICAgICAgaWYgKGluc3RhbGxlZCkge1xuICAgICAgICBmb3IgKGNvbnN0IGNvbXAgb2YgaW5zdGFsbGVkLnZhbHVlcygpKSB7XG4gICAgICAgICAgeWllbGQgY29tcDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24qIHBhY2thZ2VzNFdvcmtzcGFjZUtleSh3c0tleTogc3RyaW5nLCBpbmNsdWRlSW5zdGFsbGVkID0gdHJ1ZSk6IEdlbmVyYXRvcjxQYWNrYWdlSW5mbz4ge1xuICBjb25zdCB3cyA9IGdldFN0YXRlKCkud29ya3NwYWNlcy5nZXQod3NLZXkpO1xuICBpZiAoIXdzKVxuICAgIHJldHVybjtcblxuICBjb25zdCBsaW5rZWQgPSBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzO1xuICBjb25zdCBpbnN0YWxsZWQgPSB3cy5pbnN0YWxsZWRDb21wb25lbnRzO1xuICBjb25zdCBhdm9pZER1cGxpY2F0ZVNldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBmb3IgKGNvbnN0IFtwa05hbWVdIG9mIHdzLmxpbmtlZERlcGVuZGVuY2llcykge1xuICAgIGF2b2lkRHVwbGljYXRlU2V0LmFkZChwa05hbWUpO1xuICAgIGNvbnN0IHBrID0gbGlua2VkLmdldChwa05hbWUpO1xuICAgIGlmIChwayA9PSBudWxsKVxuICAgICAgbG9nLmVycm9yKGBNaXNzaW5nIHBhY2thZ2UgJHtwa05hbWV9IGluIHdvcmtzcGFjZSAke3dzS2V5fWApO1xuICAgIGVsc2VcbiAgICAgIHlpZWxkIHBrO1xuICB9XG4gIGZvciAoY29uc3QgW3BrTmFtZV0gb2Ygd3MubGlua2VkRGV2RGVwZW5kZW5jaWVzKSB7XG4gICAgaWYgKGF2b2lkRHVwbGljYXRlU2V0Lmhhcyhwa05hbWUpKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgY29uc3QgcGsgPSBsaW5rZWQuZ2V0KHBrTmFtZSk7XG4gICAgaWYgKHBrID09IG51bGwpXG4gICAgICBsb2cuZXJyb3IoYE1pc3NpbmcgcGFja2FnZSAke3BrTmFtZX0gaW4gd29ya3NwYWNlICR7d3NLZXl9YCk7XG4gICAgZWxzZVxuICAgICAgeWllbGQgcGs7XG4gIH1cbiAgaWYgKGluY2x1ZGVJbnN0YWxsZWQgJiYgaW5zdGFsbGVkKSB7XG4gICAgZm9yIChjb25zdCBjb21wIG9mIGluc3RhbGxlZC52YWx1ZXMoKSkge1xuICAgICAgaWYgKGF2b2lkRHVwbGljYXRlU2V0Lmhhcyhjb21wLm5hbWUpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgeWllbGQgY29tcDtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhY2thZ2VzNFdvcmtzcGFjZSh3b3Jrc3BhY2VEaXI/OiBzdHJpbmcsIGluY2x1ZGVJbnN0YWxsZWQgPSB0cnVlKSB7XG4gIGNvbnN0IHdzS2V5ID0gd29ya3NwYWNlS2V5KHdvcmtzcGFjZURpciB8fCBwbGlua0Vudi53b3JrRGlyKTtcbiAgcmV0dXJuIHBhY2thZ2VzNFdvcmtzcGFjZUtleSh3c0tleSwgaW5jbHVkZUluc3RhbGxlZCk7XG59XG5cbi8qKlxuICogQHJldHVybnMgYSBtYXAgb2Ygd29ya3NwYWNlIGtleXMgb2Ygd2hpY2ggaGFzIHNwZWNpZmllZCBkZXBlbmRlbmN5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3b3Jrc3BhY2VzT2ZEZXBlbmRlbmNpZXMoLi4uZGVwUGtnTmFtZXM6IHN0cmluZ1tdKSB7XG4gIGNvbnN0IGRlcHMgPSBuZXcgU2V0KGRlcFBrZ05hbWVzKTtcbiAgY29uc3Qgd3NLZXlzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGZvciAoY29uc3QgW2tleSwgd3NTdGF0ZV0gb2YgZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmVudHJpZXMoKSkge1xuICAgIGZvciAoY29uc3QgW3BrZ05hbWVdIG9mIHdzU3RhdGUubGlua2VkRGVwZW5kZW5jaWVzLmNvbmNhdCh3c1N0YXRlLmxpbmtlZERldkRlcGVuZGVuY2llcykpIHtcbiAgICAgIGlmIChkZXBzLmhhcyhwa2dOYW1lKSkge1xuICAgICAgICB3c0tleXMuYWRkKGtleSk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgW3BrZ05hbWVdIG9mIHdzU3RhdGUuaW5zdGFsbGVkQ29tcG9uZW50cz8ua2V5cygpIHx8IFtdKSB7XG4gICAgICBpZiAoZGVwcy5oYXMocGtnTmFtZSkpIHtcbiAgICAgICAgd3NLZXlzLmFkZChrZXkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gd3NLZXlzO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVyT3B0aW9uU2V0T3B0IHtcbiAgLyoqIFdpbGwgYWRkIHR5cGVSb290cyBwcm9wZXJ0eSBmb3Igc3BlY2lmaWMgd29ya3NwYWNlLCBhbmQgYWRkIHBhdGhzIG9mIGZpbGUgXCJwYWNrYWdlLXNldHRpbmdzLmQudHNcIiAqL1xuICB3b3Jrc3BhY2VEaXI/OiBzdHJpbmc7XG4gIC8qKiBBZGQgcmVhbCBwYXRoIG9mIGFsbCBsaW5rIHBhY2thZ2UgdG8gXCJwYXRoc1wiIHByb3BlcnR5ICovXG4gIHJlYWxQYWNrYWdlUGF0aHM/OiBib29sZWFuO1xuICBlbmFibGVUeXBlUm9vdHM/OiBib29sZWFuO1xuICBub1R5cGVSb290c0luUGFja2FnZXM/OiBib29sZWFuO1xuICAvKiogRGVmYXVsdCBmYWxzZSwgRG8gbm90IGluY2x1ZGUgbGlua2VkIHBhY2thZ2Ugc3ltbGlua3MgZGlyZWN0b3J5IGluIHBhdGgqL1xuICBub1N5bWxpbmtzPzogYm9vbGVhbjtcbiAgZXh0cmFOb2RlUGF0aD86IHN0cmluZ1tdO1xuICBleHRyYVR5cGVSb290Pzogc3RyaW5nW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZXJPcHRpb25zIHtcbiAgYmFzZVVybDogc3RyaW5nO1xuICB0eXBlUm9vdHM6IHN0cmluZ1tdO1xuICBwYXRocz86IHsgW3BhdGg6IHN0cmluZ106IHN0cmluZ1tdfTtcbiAgW3Byb3A6IHN0cmluZ106IHRzLkNvbXBpbGVyT3B0aW9uc1ZhbHVlO1xufVxuXG4vKipcbiAqIFNldCBcImJhc2VVcmxcIiwgXCJwYXRoc1wiIGFuZCBcInR5cGVSb290c1wiIHByb3BlcnR5IHJlbGF0aXZlIHRvIHRzY29uZmlnRGlyLCBwcm9jZXNzLmN3ZCgpXG4gKiBhbmQgcHJvY2Vzcy5lbnYuTk9ERV9QQVRIU1xuICogQHBhcmFtIHRzY29uZmlnRGlyIHByb2plY3QgZGlyZWN0b3J5IHdoZXJlIHRzY29uZmlnIGZpbGUgaXMgKHZpcnR1YWwpLFxuICogXCJiYXNlVXJsXCIsIFwidHlwZVJvb3RzXCIgaXMgcmVsYXRpdmUgdG8gdGhpcyBwYXJhbWV0ZXJcbiAqIEBwYXJhbSBiYXNlVXJsIGNvbXBpbGVyIG9wdGlvbiBcImJhc2VVcmxcIiwgXCJwYXRoc1wiIHdpbGwgYmUgcmVsYXRpdmUgdG8gdGhpcyBwYXJlbXRlclxuICogQHBhcmFtIGFzc2lnbmVlT3B0aW9ucyBcbiAqIEBwYXJhbSBvcHRzIENvbXBpbGVyT3B0aW9uU2V0T3B0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgoXG4gIHRzY29uZmlnRGlyOiBzdHJpbmcsXG4gIGJhc2VVcmwgPSAnLi8nLFxuICBhc3NpZ25lZU9wdGlvbnM6IFBhcnRpYWw8Q29tcGlsZXJPcHRpb25zPixcbiAgb3B0czogQ29tcGlsZXJPcHRpb25TZXRPcHQgPSB7ZW5hYmxlVHlwZVJvb3RzOiBmYWxzZX0pIHtcblxuICAvLyBjb25zdCB7cm9vdERpciwgcGxpbmtEaXIsIHN5bWxpbmtEaXJOYW1lfSA9IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluayEpIGFzIFBsaW5rRW52O1xuICBsZXQgc3ltbGlua3NEaXI6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgLyoqIGZvciBwYXRocyBtYXBwaW5nIFwiKlwiICovXG4gIGxldCBwYXRoc0RpcnM6IHN0cmluZ1tdID0gW107XG4gIC8vIHdvcmtzcGFjZSBub2RlX21vZHVsZXMgc2hvdWxkIGJlIHRoZSBmaXJzdFxuICBjb25zdCBiYXNlVXJsQWJzUGF0aCA9IFBhdGgucmVzb2x2ZSh0c2NvbmZpZ0RpciwgYmFzZVVybCk7XG5cbiAgaWYgKG9wdHMucmVhbFBhY2thZ2VQYXRocykge1xuICAgIGlmIChhc3NpZ25lZU9wdGlvbnMucGF0aHMgPT0gbnVsbCkge1xuICAgICAgYXNzaWduZWVPcHRpb25zLnBhdGhzID0ge307XG4gICAgfVxuICAgIE9iamVjdC5hc3NpZ24oYXNzaWduZWVPcHRpb25zLnBhdGhzLCBwYXRoTWFwcGluZ0ZvckxpbmtlZFBrZ3MoYmFzZVVybEFic1BhdGgpKTtcbiAgfVxuXG4gIC8vIGxldCB3c1N0YXRlOiBXb3Jrc3BhY2VTdGF0ZSB8IHVuZGVmaW5lZDtcbiAgbGV0IHdzS2V5OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGlmIChvcHRzLndvcmtzcGFjZURpciAhPSBudWxsKSB7XG4gICAgc3ltbGlua3NEaXIgPSBQYXRoLnJlc29sdmUob3B0cy53b3Jrc3BhY2VEaXIsIHBsaW5rRW52LnN5bWxpbmtEaXJOYW1lKTtcbiAgICBwYXRoc0RpcnMucHVzaCguLi5jYWxjTm9kZVBhdGhzKHBsaW5rRW52LnJvb3REaXIsIHN5bWxpbmtzRGlyLFxuICAgICAgb3B0cy53b3Jrc3BhY2VEaXIgfHwgcGxpbmtFbnYud29ya0RpciwgcGxpbmtFbnYucGxpbmtEaXIpKTtcblxuICAgIHdzS2V5ID0gd29ya3NwYWNlS2V5KG9wdHMud29ya3NwYWNlRGlyKTtcbiAgICAvLyB3c1N0YXRlID0gZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmdldCh3c0tleSk7XG4gIH1cblxuICBpZiAob3B0cy5leHRyYU5vZGVQYXRoICYmIG9wdHMuZXh0cmFOb2RlUGF0aC5sZW5ndGggPiAwKSB7XG4gICAgcGF0aHNEaXJzLnB1c2goLi4ub3B0cy5leHRyYU5vZGVQYXRoKTtcbiAgfVxuXG4gIHBhdGhzRGlycyA9IF8udW5pcShwYXRoc0RpcnMpO1xuXG4gIGlmIChvcHRzLm5vU3ltbGlua3MgJiYgc3ltbGlua3NEaXIpIHtcbiAgICBjb25zdCBpZHggPSBwYXRoc0RpcnMuaW5kZXhPZihzeW1saW5rc0Rpcik7XG4gICAgaWYgKGlkeCA+PSAwKSB7XG4gICAgICBwYXRoc0RpcnMuc3BsaWNlKGlkeCwgMSk7XG4gICAgfVxuICB9XG5cbiAgaWYgKFBhdGguaXNBYnNvbHV0ZShiYXNlVXJsKSkge1xuICAgIGxldCByZWxCYXNlVXJsID0gUGF0aC5yZWxhdGl2ZSh0c2NvbmZpZ0RpciwgYmFzZVVybCk7XG4gICAgaWYgKCFyZWxCYXNlVXJsLnN0YXJ0c1dpdGgoJy4nKSlcbiAgICAgIHJlbEJhc2VVcmwgPSAnLi8nICsgcmVsQmFzZVVybDtcbiAgICBiYXNlVXJsID0gcmVsQmFzZVVybDtcbiAgfVxuXG4gIGlmIChhc3NpZ25lZU9wdGlvbnMucGF0aHMgPT0gbnVsbClcbiAgICBhc3NpZ25lZU9wdGlvbnMucGF0aHMgPSB7fTtcblxuICBpZiAob3B0cy53b3Jrc3BhY2VEaXIpIHtcbiAgICBhc3NpZ25lZU9wdGlvbnMucGF0aHNbJ3BhY2thZ2Utc2V0dGluZ3MnXSA9IFtcbiAgICAgIFBhdGgucmVsYXRpdmUoYmFzZVVybEFic1BhdGgsIFBhdGguam9pbihwbGlua0Vudi5kaXN0RGlyLCB3c0tleSArICcucGFja2FnZS1zZXR0aW5ncycpKVxuICAgICAgICAucmVwbGFjZSgvXFxcXC9nLCAnLycpXG4gICAgXTtcbiAgfVxuICAvLyBpZiAod3NTdGF0ZSkge1xuICAvLyAgIGFzc2lnblNwZWNpYWxQYXRocyh3c1N0YXRlLmluc3RhbGxKc29uLmRlcGVuZGVuY2llcywgcGF0aHNEaXJzLCBhc3NpZ25lZU9wdGlvbnMsIGJhc2VVcmxBYnNQYXRoKTtcbiAgLy8gICBhc3NpZ25TcGVjaWFsUGF0aHMod3NTdGF0ZS5pbnN0YWxsSnNvbi5kZXZEZXBlbmRlbmNpZXMsIHBhdGhzRGlycywgYXNzaWduZWVPcHRpb25zLCBiYXNlVXJsQWJzUGF0aCk7XG4gIC8vICAgYXNzaWduU3BlY2lhbFBhdGhzKHdzU3RhdGUuaW5zdGFsbEpzb24ucGVlckRlcGVuZGVuY2llcywgcGF0aHNEaXJzLCBhc3NpZ25lZU9wdGlvbnMsIGJhc2VVcmxBYnNQYXRoKTtcbiAgLy8gfVxuXG4gIGFzc2lnbmVlT3B0aW9ucy5iYXNlVXJsID0gYmFzZVVybC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cbiAgLy8gaWYgKGFzc2lnbmVlT3B0aW9ucy5wYXRoc1snKiddID09IG51bGwpXG4gIC8vICAgYXNzaWduZWVPcHRpb25zLnBhdGhzWycqJ10gPSBbXSBhcyBzdHJpbmdbXTtcbiAgLy8gY29uc3Qgd2lsZGNhcmRQYXRoczogc3RyaW5nW10gPSBhc3NpZ25lZU9wdGlvbnMucGF0aHNbJyonXTtcblxuICAvLyBmb3IgKGNvbnN0IGRpciBvZiBwYXRoc0RpcnMpIHtcbiAgLy8gICBjb25zdCByZWxhdGl2ZURpciA9IFBhdGgucmVsYXRpdmUoYmFzZVVybEFic1BhdGgsIGRpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAvLyAgIC8vIElNUE9SVEFOVDogYEB0eXBlLypgIG11c3QgYmUgcHJpbyB0byBgLypgLCBmb3IgdGhvc2UgcGFja2FnZXMgaGF2ZSBubyB0eXBlIGRlZmluaW50aW9uXG4gIC8vICAgd2lsZGNhcmRQYXRocy5wdXNoKFBhdGguam9pbihyZWxhdGl2ZURpciwgJ0B0eXBlcy8qJykucmVwbGFjZSgvXFxcXC9nLCAnLycpKTtcbiAgLy8gICB3aWxkY2FyZFBhdGhzLnB1c2goUGF0aC5qb2luKHJlbGF0aXZlRGlyLCAnKicpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSk7XG4gIC8vIH1cbiAgLy8gYXNzaWduZWVPcHRpb25zLnBhdGhzWycqJ10gPSBfLnVuaXEod2lsZGNhcmRQYXRocyk7XG4gIGFwcGVuZFR5cGVSb290cyhwYXRoc0RpcnMsIHRzY29uZmlnRGlyLCBhc3NpZ25lZU9wdGlvbnMsIG9wdHMpO1xuXG4gIHJldHVybiBhc3NpZ25lZU9wdGlvbnMgYXMgQ29tcGlsZXJPcHRpb25zO1xufVxuXG4vKipcbiAqIEZvciB0aG9zZSBzcGVjaWFsIHNjb3BlZCBwYWNrYWdlIHdoaWNoIGlzIGxpa2UgQGxvYWRhYmxlL2NvbXBvbmVudCwgaXRzIHR5cGUgZGVmaW5pdGlvbiBwYWNrYWdlIGlzXG4gKiBAdHlwZXMvbG9hZGFibGVfX2NvbXBvbmVudFxuICovXG4vLyBmdW5jdGlvbiBhc3NpZ25TcGVjaWFsUGF0aHMoZGVwZW5kZW5jaWVzOiB7W2RlcDogc3RyaW5nXTogc3RyaW5nfSB8IHVuZGVmaW5lZCxcbi8vICAgbm9kZVBhdGhzOiBJdGVyYWJsZTxzdHJpbmc+LFxuLy8gICBhc3NpZ25lZU9wdGlvbnM6IFBhcnRpYWw8Q29tcGlsZXJPcHRpb25zPiwgYWJzQmFzZVVybFBhdGg6IHN0cmluZykge1xuLy8gICBpZiAoZGVwZW5kZW5jaWVzID09IG51bGwpXG4vLyAgICAgcmV0dXJuO1xuXG4vLyAgIC8vIGlmIChhc3NpZ25lZU9wdGlvbnMucGF0aHMgPT0gbnVsbClcbi8vICAgLy8gICBhc3NpZ25lZU9wdGlvbnMucGF0aHMgPSB7fTtcbi8vICAgZm9yIChjb25zdCBpdGVtIG9mIE9iamVjdC5rZXlzKGRlcGVuZGVuY2llcykpIHtcbi8vICAgICBjb25zdCBtID0gL15AdHlwZXNcXC8oLio/KV9fKC4qPykkLy5leGVjKGl0ZW0pO1xuLy8gICAgIGlmIChtKSB7XG4vLyAgICAgICBjb25zdCBvcmlnaW5Qa2dOYW1lID0gYEAke21bMV19LyR7bVsyXX1gO1xuLy8gICAgICAgY29uc3QgZXhhY3RPbmU6IHN0cmluZ1tdID0gYXNzaWduZWVPcHRpb25zLnBhdGhzIVtvcmlnaW5Qa2dOYW1lXSA9IFtdO1xuLy8gICAgICAgY29uc3Qgd2lsZE9uZTogc3RyaW5nW10gPSBhc3NpZ25lZU9wdGlvbnMucGF0aHMhW29yaWdpblBrZ05hbWUgKyAnLyonXSA9IFtdO1xuLy8gICAgICAgZm9yIChjb25zdCBkaXIgb2Ygbm9kZVBhdGhzKSB7XG4vLyAgICAgICAgIGNvbnN0IHJlbGF0aXZlRGlyID0gUGF0aC5yZWxhdGl2ZShhYnNCYXNlVXJsUGF0aCwgZGlyICsgJy8nICsgaXRlbSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuLy8gICAgICAgICBleGFjdE9uZS5wdXNoKHJlbGF0aXZlRGlyKTtcbi8vICAgICAgICAgd2lsZE9uZS5wdXNoKHJlbGF0aXZlRGlyICsgJy8qJyk7XG4vLyAgICAgICB9XG4vLyAgICAgfVxuLy8gICB9XG4vLyB9XG5cbmZ1bmN0aW9uIHBhdGhNYXBwaW5nRm9yTGlua2VkUGtncyhiYXNlVXJsQWJzUGF0aDogc3RyaW5nKSB7XG4gIGxldCBkcmNwRGlyID0gKGdldFN0YXRlKCkubGlua2VkRHJjcCB8fCBnZXRTdGF0ZSgpLmluc3RhbGxlZERyY3ApIS5yZWFsUGF0aDtcblxuICBjb25zdCBwYXRoTWFwcGluZzoge1trZXk6IHN0cmluZ106IHN0cmluZ1tdfSA9IHt9O1xuXG4gIGZvciAoY29uc3QgW25hbWUsIHtyZWFsUGF0aH1dIG9mIGdldFN0YXRlKCkuc3JjUGFja2FnZXMuZW50cmllcygpIHx8IFtdKSB7XG4gICAgY29uc3QgcmVhbERpciA9IFBhdGgucmVsYXRpdmUoYmFzZVVybEFic1BhdGgsIHJlYWxQYXRoKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgcGF0aE1hcHBpbmdbbmFtZV0gPSBbcmVhbERpcl07XG4gICAgcGF0aE1hcHBpbmdbbmFtZSArICcvKiddID0gW3JlYWxEaXIgKyAnLyonXTtcbiAgfVxuXG4gIC8vIGlmIChwa2dOYW1lICE9PSAnQHdmaC9wbGluaycpIHtcbiAgZHJjcERpciA9IFBhdGgucmVsYXRpdmUoYmFzZVVybEFic1BhdGgsIGRyY3BEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgcGF0aE1hcHBpbmdbJ0B3ZmgvcGxpbmsnXSA9IFtkcmNwRGlyXTtcbiAgcGF0aE1hcHBpbmdbJ0B3ZmgvcGxpbmsvKiddID0gW2RyY3BEaXIgKyAnLyonXTtcbiAgcmV0dXJuIHBhdGhNYXBwaW5nO1xufVxuXG4vKipcbiAqIFxuICogQHBhcmFtIHBhdGhzRGlycyBOb2RlIHBhdGggbGlrZSBwYXRoIGluZm9ybWF0aW9uXG4gKiBAcGFyYW0gdHNjb25maWdEaXIgXG4gKiBAcGFyYW0gYXNzaWduZWVPcHRpb25zIFxuICogQHBhcmFtIG9wdHMgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhcHBlbmRUeXBlUm9vdHMocGF0aHNEaXJzOiBzdHJpbmdbXSwgdHNjb25maWdEaXI6IHN0cmluZywgYXNzaWduZWVPcHRpb25zOiBQYXJ0aWFsPENvbXBpbGVyT3B0aW9ucz4sXG4gIG9wdHM6IENvbXBpbGVyT3B0aW9uU2V0T3B0KSB7XG4gIGlmIChvcHRzLm5vVHlwZVJvb3RzSW5QYWNrYWdlcyA9PSBudWxsIHx8ICFvcHRzLm5vVHlwZVJvb3RzSW5QYWNrYWdlcykge1xuICAgIGlmIChhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzID09IG51bGwpXG4gICAgICBhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzID0gW107XG4gICAgYXNzaWduZWVPcHRpb25zLnR5cGVSb290cy5wdXNoKFxuICAgICAgLy8gcGxpbmsgZGlyZWN0b3J5OiB3ZmgvdHlwZXMsIGl0IGlzIGEgc3ltbGluayBhdCBydW50aW1lLCBkdWUgdG8gUGxpbmsgdXNlcyBwcmVzZXJ2ZS1zeW1saW5rcyB0byBydW4gY29tbWFuZHNcbiAgICAgIFBhdGgucmVsYXRpdmUodHNjb25maWdEaXIsIGZzLnJlYWxwYXRoU3luYyhQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHlwZXMnKSkpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSxcbiAgICAgIC4uLnR5cGVSb290c0luUGFja2FnZXMob3B0cy53b3Jrc3BhY2VEaXIpLm1hcChkaXIgPT4gUGF0aC5yZWxhdGl2ZSh0c2NvbmZpZ0RpciwgZGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJykpXG4gICAgKTtcbiAgfVxuXG4gIGlmIChvcHRzLmVuYWJsZVR5cGVSb290cyApIHtcbiAgICBpZiAoYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyA9PSBudWxsKVxuICAgICAgYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyA9IFtdO1xuICAgIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMucHVzaCguLi5wYXRoc0RpcnMubWFwKGRpciA9PiB7XG4gICAgICBjb25zdCByZWxhdGl2ZURpciA9IFBhdGgucmVsYXRpdmUodHNjb25maWdEaXIsIGRpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgcmV0dXJuIHJlbGF0aXZlRGlyICsgJy9AdHlwZXMnO1xuICAgIH0pKTtcbiAgfVxuXG4gIGlmIChvcHRzLmV4dHJhVHlwZVJvb3QpIHtcbiAgICBpZiAoYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyA9PSBudWxsKVxuICAgICAgYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyA9IFtdO1xuICAgIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMucHVzaCguLi5vcHRzLmV4dHJhVHlwZVJvb3QubWFwKFxuICAgICAgZGlyID0+IFBhdGgucmVsYXRpdmUodHNjb25maWdEaXIsIGRpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpKSk7XG4gIH1cblxuICBhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzID0gXy51bmlxKGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMpO1xuICBpZiAoYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyAhPSBudWxsICYmIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMubGVuZ3RoID09PSAwKVxuICAgIGRlbGV0ZSBhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzO1xufVxuXG5mdW5jdGlvbiB0eXBlUm9vdHNJblBhY2thZ2VzKG9ubHlJbmNsdWRlV29ya3NwYWNlPzogc3RyaW5nKSB7XG4gIC8vIGNvbnN0IHtnZXRTdGF0ZSwgd29ya3NwYWNlS2V5fTogdHlwZW9mIF9wa2dNZ3IgPSByZXF1aXJlKCcuL3BhY2thZ2UtbWdyJyk7XG4gIGNvbnN0IHdzS2V5cyA9IG9ubHlJbmNsdWRlV29ya3NwYWNlID8gW3dvcmtzcGFjZUtleShvbmx5SW5jbHVkZVdvcmtzcGFjZSldIDogZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKTtcbiAgY29uc3QgZGlyczogc3RyaW5nW10gPSBbXTtcbiAgZm9yIChjb25zdCB3c0tleSBvZiB3c0tleXMpIHtcbiAgICBmb3IgKGNvbnN0IHBrZyBvZiBwYWNrYWdlczRXb3Jrc3BhY2VLZXkod3NLZXkpKSB7XG4gICAgICBjb25zdCB0eXBlUm9vdCA9IHBrZy5qc29uLnBsaW5rID8gcGtnLmpzb24ucGxpbmsudHlwZVJvb3QgOiBwa2cuanNvbi5kciA/IHBrZy5qc29uLmRyLnR5cGVSb290IDogbnVsbDtcbiAgICAgIGlmICh0eXBlUm9vdCkge1xuICAgICAgICBjb25zdCBkaXIgPSBQYXRoLnJlc29sdmUocGtnLnJlYWxQYXRoLCB0eXBlUm9vdCk7XG4gICAgICAgIGRpcnMucHVzaChkaXIpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gZGlycztcbn1cbiJdfQ==