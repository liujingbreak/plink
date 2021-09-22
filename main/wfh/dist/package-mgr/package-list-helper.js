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
    // let wsKey: string | undefined;
    if (opts.workspaceDir != null) {
        symlinksDir = path_1.default.resolve(opts.workspaceDir, misc_1.plinkEnv.symlinkDirName);
        pathsDirs.push(...(0, node_path_calc_1.calcNodePaths)(misc_1.plinkEnv.rootDir, symlinksDir, opts.workspaceDir || misc_1.plinkEnv.workDir, misc_1.plinkEnv.plinkDir));
        // wsKey = workspaceKey(opts.workspaceDir);
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
    // if (opts.workspaceDir) {
    //   assigneeOptions.paths['package-settings'] = [
    //     Path.relative(baseUrlAbsPath, Path.join(plinkEnv.distDir, wsKey + '.package-settings'))
    //       .replace(/\\/g, '/')
    //   ];
    // }
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
    for (const [name, { realPath, json }] of (0, index_1.getState)().srcPackages.entries() || []) {
        const tsDirs = (0, misc_1.getTscConfigOfPkg)(json);
        const realDir = path_1.default.relative(baseUrlAbsPath, realPath).replace(/\\/g, '/');
        pathMapping[name] = [realDir];
        pathMapping[`${name}/${tsDirs.destDir}/*`] = [`${realDir}/${tsDirs.srcDir}/*`];
        // pathMapping[`${name}/${tsDirs.isomDir}/*`] = [`${realDir}/${tsDirs.isomDir}/*`];
        pathMapping[name + '/*'] = [`${realDir}/*`];
    }
    // if (pkgName !== '@wfh/plink') {
    drcpDir = path_1.default.relative(baseUrlAbsPath, drcpDir).replace(/\\/g, '/');
    pathMapping['@wfh/plink'] = [drcpDir];
    pathMapping['@wfh/plink/wfh/dist/*'] = [drcpDir + '/wfh/ts/*'];
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
        path_1.default.relative(tsconfigDir, path_1.default.resolve(__dirname, '../../types')).replace(/\\/g, '/'), ...typeRootsInPackages(opts.workspaceDir).map(dir => path_1.default.relative(tsconfigDir, dir).replace(/\\/g, '/')));
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
function typeRootsInPackages(onlyIncludedWorkspace) {
    // const {getState, workspaceKey}: typeof _pkgMgr = require('./package-mgr');
    const wsKeys = onlyIncludedWorkspace ? [(0, index_1.workspaceKey)(onlyIncludedWorkspace)] : (0, index_1.getState)().workspaces.keys();
    const dirs = [];
    for (const wsKey of wsKeys) {
        for (const pkg of packages4WorkspaceKey(wsKey)) {
            const typeRoot = pkg.json.plink ? pkg.json.plink.typeRoot : pkg.json.dr ? pkg.json.dr.typeRoot : null;
            if (typeRoot) {
                const dir = path_1.default.resolve(pkg.path, typeRoot);
                dirs.push(dir);
            }
        }
    }
    return dirs;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1saXN0LWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsbUNBQTJFO0FBQzNFLGdEQUF3QjtBQUN4QixzREFBZ0Q7QUFDaEQsb0RBQXVCO0FBQ3ZCLG1DQUFpQztBQUNqQyx3Q0FBMEQ7QUFJMUQsTUFBTSxHQUFHLEdBQUcsSUFBQSxrQkFBUyxFQUFDLDJCQUEyQixDQUFDLENBQUM7QUFFbkQsUUFBZSxDQUFDLENBQUMsV0FBVyxDQUFDLE1BQW9DLEVBQy9ELFVBQWdDLEVBQUUsV0FBc0I7SUFFeEQsSUFBSSxVQUFVLEtBQUssV0FBVyxFQUFFO1FBQzlCLElBQUksV0FBVyxFQUFFO1lBQ2YsS0FBSyxNQUFNLFVBQVUsSUFBSSxXQUFXLEVBQUU7Z0JBQ3BDLE1BQU0sT0FBTyxHQUFHLElBQUEscUJBQWEsRUFBQyxVQUFVLENBQUMsQ0FBQztnQkFDMUMsTUFBTSxRQUFRLEdBQUcsSUFBQSxnQkFBUSxHQUFFLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUMxRCxJQUFJLFFBQVEsSUFBSSxJQUFJO29CQUNsQixPQUFPO2dCQUNULEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFO29CQUM5QixNQUFNLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEdBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUNoRCxJQUFJLEdBQUcsRUFBRTt3QkFDUCxNQUFNLEdBQUcsQ0FBQztxQkFDWDtpQkFDRjthQUNGO1NBQ0Y7YUFBTTtZQUNMLEtBQUssTUFBTSxHQUFHLElBQUksSUFBQSxnQkFBUSxHQUFFLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUNqRCxNQUFNLEdBQUcsQ0FBQzthQUNYO1NBQ0Y7S0FDRjtJQUNELElBQUks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Q0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUN0RyxJQUFJLFFBQVEsRUFBRTtnQkFDWixNQUFNLEdBQUcsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQzdDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDaEI7U0FDRjtLQUNGO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtnZXRTdGF0ZSwgcGF0aFRvUHJvaktleSwgd29ya3NwYWNlS2V5LCBQYWNrYWdlSW5mb30gZnJvbSAnLi9pbmRleCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7Y2FsY05vZGVQYXRoc30gZnJvbSAnLi4vbm9kZS1wYXRoLWNhbGMnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtwbGlua0VudiwgZ2V0VHNjQ29uZmlnT2ZQa2d9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0IHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5leHBvcnQgdHlwZSBQYWNrYWdlVHlwZSA9ICcqJyB8ICdidWlsZCcgfCAnY29yZSc7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLnBhY2thZ2UtbGlzdC1oZWxwZXInKTtcblxuZXhwb3J0IGZ1bmN0aW9uKiBhbGxQYWNrYWdlcyhfdHlwZXM/OiBQYWNrYWdlVHlwZSB8IFBhY2thZ2VUeXBlW10sXG4gIHJlY2lwZVR5cGU/OiAnc3JjJyB8ICdpbnN0YWxsZWQnLCBwcm9qZWN0RGlycz86IHN0cmluZ1tdKTogR2VuZXJhdG9yPFBhY2thZ2VJbmZvPiB7XG5cbiAgaWYgKHJlY2lwZVR5cGUgIT09ICdpbnN0YWxsZWQnKSB7XG4gICAgaWYgKHByb2plY3REaXJzKSB7XG4gICAgICBmb3IgKGNvbnN0IHByb2plY3REaXIgb2YgcHJvamVjdERpcnMpIHtcbiAgICAgICAgY29uc3QgcHJvaktleSA9IHBhdGhUb1Byb2pLZXkocHJvamVjdERpcik7XG4gICAgICAgIGNvbnN0IHBrZ05hbWVzID0gZ2V0U3RhdGUoKS5wcm9qZWN0MlBhY2thZ2VzLmdldChwcm9qS2V5KTtcbiAgICAgICAgaWYgKHBrZ05hbWVzID09IG51bGwpXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICBmb3IgKGNvbnN0IHBrZ05hbWUgb2YgcGtnTmFtZXMpIHtcbiAgICAgICAgICBjb25zdCBwa2cgPSBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmdldChwa2dOYW1lKTtcbiAgICAgICAgICBpZiAocGtnKSB7XG4gICAgICAgICAgICB5aWVsZCBwa2c7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAoY29uc3QgcGtnIG9mIGdldFN0YXRlKCkuc3JjUGFja2FnZXMudmFsdWVzKCkpIHtcbiAgICAgICAgeWllbGQgcGtnO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBpZiAocmVjaXBlVHlwZSAhPT0gJ3NyYycpIHtcbiAgICBmb3IgKGNvbnN0IHdzIG9mIGdldFN0YXRlKCkud29ya3NwYWNlcy52YWx1ZXMoKSkge1xuICAgICAgY29uc3QgaW5zdGFsbGVkID0gd3MuaW5zdGFsbGVkQ29tcG9uZW50cztcbiAgICAgIGlmIChpbnN0YWxsZWQpIHtcbiAgICAgICAgZm9yIChjb25zdCBjb21wIG9mIGluc3RhbGxlZC52YWx1ZXMoKSkge1xuICAgICAgICAgIHlpZWxkIGNvbXA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uKiBwYWNrYWdlczRXb3Jrc3BhY2VLZXkod3NLZXk6IHN0cmluZywgaW5jbHVkZUluc3RhbGxlZCA9IHRydWUpOiBHZW5lcmF0b3I8UGFja2FnZUluZm8+IHtcbiAgY29uc3Qgd3MgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KTtcbiAgaWYgKCF3cylcbiAgICByZXR1cm47XG5cbiAgY29uc3QgbGlua2VkID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcztcbiAgY29uc3QgaW5zdGFsbGVkID0gd3MuaW5zdGFsbGVkQ29tcG9uZW50cztcbiAgY29uc3QgYXZvaWREdXBsaWNhdGVTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgZm9yIChjb25zdCBbcGtOYW1lXSBvZiB3cy5saW5rZWREZXBlbmRlbmNpZXMpIHtcbiAgICBhdm9pZER1cGxpY2F0ZVNldC5hZGQocGtOYW1lKTtcbiAgICBjb25zdCBwayA9IGxpbmtlZC5nZXQocGtOYW1lKTtcbiAgICBpZiAocGsgPT0gbnVsbClcbiAgICAgIGxvZy5lcnJvcihgTWlzc2luZyBwYWNrYWdlICR7cGtOYW1lfSBpbiB3b3Jrc3BhY2UgJHt3c0tleX1gKTtcbiAgICBlbHNlXG4gICAgICB5aWVsZCBwaztcbiAgfVxuICBmb3IgKGNvbnN0IFtwa05hbWVdIG9mIHdzLmxpbmtlZERldkRlcGVuZGVuY2llcykge1xuICAgIGlmIChhdm9pZER1cGxpY2F0ZVNldC5oYXMocGtOYW1lKSkge1xuICAgICAgY29udGludWU7XG4gICAgfVxuICAgIGNvbnN0IHBrID0gbGlua2VkLmdldChwa05hbWUpO1xuICAgIGlmIChwayA9PSBudWxsKVxuICAgICAgbG9nLmVycm9yKGBNaXNzaW5nIHBhY2thZ2UgJHtwa05hbWV9IGluIHdvcmtzcGFjZSAke3dzS2V5fWApO1xuICAgIGVsc2VcbiAgICAgIHlpZWxkIHBrO1xuICB9XG4gIGlmIChpbmNsdWRlSW5zdGFsbGVkICYmIGluc3RhbGxlZCkge1xuICAgIGZvciAoY29uc3QgY29tcCBvZiBpbnN0YWxsZWQudmFsdWVzKCkpIHtcbiAgICAgIGlmIChhdm9pZER1cGxpY2F0ZVNldC5oYXMoY29tcC5uYW1lKSkge1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIHlpZWxkIGNvbXA7XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYWNrYWdlczRXb3Jrc3BhY2Uod29ya3NwYWNlRGlyPzogc3RyaW5nLCBpbmNsdWRlSW5zdGFsbGVkID0gdHJ1ZSkge1xuICBjb25zdCB3c0tleSA9IHdvcmtzcGFjZUtleSh3b3Jrc3BhY2VEaXIgfHwgcGxpbmtFbnYud29ya0Rpcik7XG4gIHJldHVybiBwYWNrYWdlczRXb3Jrc3BhY2VLZXkod3NLZXksIGluY2x1ZGVJbnN0YWxsZWQpO1xufVxuXG4vKipcbiAqIEByZXR1cm5zIGEgbWFwIG9mIHdvcmtzcGFjZSBrZXlzIG9mIHdoaWNoIGhhcyBzcGVjaWZpZWQgZGVwZW5kZW5jeVxuICovXG5leHBvcnQgZnVuY3Rpb24gd29ya3NwYWNlc09mRGVwZW5kZW5jaWVzKC4uLmRlcFBrZ05hbWVzOiBzdHJpbmdbXSkge1xuICBjb25zdCBkZXBzID0gbmV3IFNldChkZXBQa2dOYW1lcyk7XG4gIGNvbnN0IHdzS2V5cyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBmb3IgKGNvbnN0IFtrZXksIHdzU3RhdGVdIG9mIGdldFN0YXRlKCkud29ya3NwYWNlcy5lbnRyaWVzKCkpIHtcbiAgICBmb3IgKGNvbnN0IFtwa2dOYW1lXSBvZiB3c1N0YXRlLmxpbmtlZERlcGVuZGVuY2llcy5jb25jYXQod3NTdGF0ZS5saW5rZWREZXZEZXBlbmRlbmNpZXMpKSB7XG4gICAgICBpZiAoZGVwcy5oYXMocGtnTmFtZSkpIHtcbiAgICAgICAgd3NLZXlzLmFkZChrZXkpO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IFtwa2dOYW1lXSBvZiB3c1N0YXRlLmluc3RhbGxlZENvbXBvbmVudHM/LmtleXMoKSB8fCBbXSkge1xuICAgICAgaWYgKGRlcHMuaGFzKHBrZ05hbWUpKSB7XG4gICAgICAgIHdzS2V5cy5hZGQoa2V5KTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIHdzS2V5cztcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb21waWxlck9wdGlvblNldE9wdCB7XG4gIC8qKiBXaWxsIGFkZCB0eXBlUm9vdHMgcHJvcGVydHkgZm9yIHNwZWNpZmljIHdvcmtzcGFjZSwgYW5kIGFkZCBwYXRocyBvZiBmaWxlIFwicGFja2FnZS1zZXR0aW5ncy5kLnRzXCIgKi9cbiAgd29ya3NwYWNlRGlyPzogc3RyaW5nO1xuICAvKiogQWRkIHJlYWwgcGF0aCBvZiBhbGwgbGluayBwYWNrYWdlIHRvIFwicGF0aHNcIiBwcm9wZXJ0eSAqL1xuICByZWFsUGFja2FnZVBhdGhzPzogYm9vbGVhbjtcbiAgZW5hYmxlVHlwZVJvb3RzPzogYm9vbGVhbjtcbiAgbm9UeXBlUm9vdHNJblBhY2thZ2VzPzogYm9vbGVhbjtcbiAgLyoqIERlZmF1bHQgZmFsc2UsIERvIG5vdCBpbmNsdWRlIGxpbmtlZCBwYWNrYWdlIHN5bWxpbmtzIGRpcmVjdG9yeSBpbiBwYXRoKi9cbiAgbm9TeW1saW5rcz86IGJvb2xlYW47XG4gIGV4dHJhTm9kZVBhdGg/OiBzdHJpbmdbXTtcbiAgZXh0cmFUeXBlUm9vdD86IHN0cmluZ1tdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVyT3B0aW9ucyB7XG4gIGJhc2VVcmw6IHN0cmluZztcbiAgdHlwZVJvb3RzOiBzdHJpbmdbXTtcbiAgcGF0aHM/OiB7IFtwYXRoOiBzdHJpbmddOiBzdHJpbmdbXX07XG4gIFtwcm9wOiBzdHJpbmddOiB0cy5Db21waWxlck9wdGlvbnNWYWx1ZTtcbn1cblxuLyoqXG4gKiBTZXQgXCJiYXNlVXJsXCIsIFwicGF0aHNcIiBhbmQgXCJ0eXBlUm9vdHNcIiBwcm9wZXJ0eSByZWxhdGl2ZSB0byB0c2NvbmZpZ0RpciwgcHJvY2Vzcy5jd2QoKVxuICogYW5kIHByb2Nlc3MuZW52Lk5PREVfUEFUSFNcbiAqIEBwYXJhbSB0c2NvbmZpZ0RpciBwcm9qZWN0IGRpcmVjdG9yeSB3aGVyZSB0c2NvbmZpZyBmaWxlIGlzICh2aXJ0dWFsKSxcbiAqIFwiYmFzZVVybFwiLCBcInR5cGVSb290c1wiIGlzIHJlbGF0aXZlIHRvIHRoaXMgcGFyYW1ldGVyXG4gKiBAcGFyYW0gYmFzZVVybCBjb21waWxlciBvcHRpb24gXCJiYXNlVXJsXCIsIFwicGF0aHNcIiB3aWxsIGJlIHJlbGF0aXZlIHRvIHRoaXMgcGFyZW10ZXJcbiAqIEBwYXJhbSBhc3NpZ25lZU9wdGlvbnMgXG4gKiBAcGFyYW0gb3B0cyBDb21waWxlck9wdGlvblNldE9wdFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoKFxuICB0c2NvbmZpZ0Rpcjogc3RyaW5nLFxuICBiYXNlVXJsID0gJy4vJyxcbiAgYXNzaWduZWVPcHRpb25zOiBQYXJ0aWFsPENvbXBpbGVyT3B0aW9ucz4sXG4gIG9wdHM6IENvbXBpbGVyT3B0aW9uU2V0T3B0ID0ge2VuYWJsZVR5cGVSb290czogZmFsc2V9KSB7XG5cbiAgLy8gY29uc3Qge3Jvb3REaXIsIHBsaW5rRGlyLCBzeW1saW5rRGlyTmFtZX0gPSBKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmshKSBhcyBQbGlua0VudjtcbiAgbGV0IHN5bWxpbmtzRGlyOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIC8qKiBmb3IgcGF0aHMgbWFwcGluZyBcIipcIiAqL1xuICBsZXQgcGF0aHNEaXJzOiBzdHJpbmdbXSA9IFtdO1xuICAvLyB3b3Jrc3BhY2Ugbm9kZV9tb2R1bGVzIHNob3VsZCBiZSB0aGUgZmlyc3RcbiAgY29uc3QgYmFzZVVybEFic1BhdGggPSBQYXRoLnJlc29sdmUodHNjb25maWdEaXIsIGJhc2VVcmwpO1xuXG4gIGlmIChvcHRzLnJlYWxQYWNrYWdlUGF0aHMpIHtcbiAgICBpZiAoYXNzaWduZWVPcHRpb25zLnBhdGhzID09IG51bGwpIHtcbiAgICAgIGFzc2lnbmVlT3B0aW9ucy5wYXRocyA9IHt9O1xuICAgIH1cbiAgICBPYmplY3QuYXNzaWduKGFzc2lnbmVlT3B0aW9ucy5wYXRocywgcGF0aE1hcHBpbmdGb3JMaW5rZWRQa2dzKGJhc2VVcmxBYnNQYXRoKSk7XG4gIH1cblxuICAvLyBsZXQgd3NTdGF0ZTogV29ya3NwYWNlU3RhdGUgfCB1bmRlZmluZWQ7XG4gIC8vIGxldCB3c0tleTogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICBpZiAob3B0cy53b3Jrc3BhY2VEaXIgIT0gbnVsbCkge1xuICAgIHN5bWxpbmtzRGlyID0gUGF0aC5yZXNvbHZlKG9wdHMud29ya3NwYWNlRGlyLCBwbGlua0Vudi5zeW1saW5rRGlyTmFtZSk7XG4gICAgcGF0aHNEaXJzLnB1c2goLi4uY2FsY05vZGVQYXRocyhwbGlua0Vudi5yb290RGlyLCBzeW1saW5rc0RpcixcbiAgICAgIG9wdHMud29ya3NwYWNlRGlyIHx8IHBsaW5rRW52LndvcmtEaXIsIHBsaW5rRW52LnBsaW5rRGlyKSk7XG5cbiAgICAvLyB3c0tleSA9IHdvcmtzcGFjZUtleShvcHRzLndvcmtzcGFjZURpcik7XG4gICAgLy8gd3NTdGF0ZSA9IGdldFN0YXRlKCkud29ya3NwYWNlcy5nZXQod3NLZXkpO1xuICB9XG5cbiAgaWYgKG9wdHMuZXh0cmFOb2RlUGF0aCAmJiBvcHRzLmV4dHJhTm9kZVBhdGgubGVuZ3RoID4gMCkge1xuICAgIHBhdGhzRGlycy5wdXNoKC4uLm9wdHMuZXh0cmFOb2RlUGF0aCk7XG4gIH1cblxuICBwYXRoc0RpcnMgPSBfLnVuaXEocGF0aHNEaXJzKTtcblxuICBpZiAob3B0cy5ub1N5bWxpbmtzICYmIHN5bWxpbmtzRGlyKSB7XG4gICAgY29uc3QgaWR4ID0gcGF0aHNEaXJzLmluZGV4T2Yoc3ltbGlua3NEaXIpO1xuICAgIGlmIChpZHggPj0gMCkge1xuICAgICAgcGF0aHNEaXJzLnNwbGljZShpZHgsIDEpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChQYXRoLmlzQWJzb2x1dGUoYmFzZVVybCkpIHtcbiAgICBsZXQgcmVsQmFzZVVybCA9IFBhdGgucmVsYXRpdmUodHNjb25maWdEaXIsIGJhc2VVcmwpO1xuICAgIGlmICghcmVsQmFzZVVybC5zdGFydHNXaXRoKCcuJykpXG4gICAgICByZWxCYXNlVXJsID0gJy4vJyArIHJlbEJhc2VVcmw7XG4gICAgYmFzZVVybCA9IHJlbEJhc2VVcmw7XG4gIH1cblxuICBpZiAoYXNzaWduZWVPcHRpb25zLnBhdGhzID09IG51bGwpXG4gICAgYXNzaWduZWVPcHRpb25zLnBhdGhzID0ge307XG5cbiAgLy8gaWYgKG9wdHMud29ya3NwYWNlRGlyKSB7XG4gIC8vICAgYXNzaWduZWVPcHRpb25zLnBhdGhzWydwYWNrYWdlLXNldHRpbmdzJ10gPSBbXG4gIC8vICAgICBQYXRoLnJlbGF0aXZlKGJhc2VVcmxBYnNQYXRoLCBQYXRoLmpvaW4ocGxpbmtFbnYuZGlzdERpciwgd3NLZXkgKyAnLnBhY2thZ2Utc2V0dGluZ3MnKSlcbiAgLy8gICAgICAgLnJlcGxhY2UoL1xcXFwvZywgJy8nKVxuICAvLyAgIF07XG4gIC8vIH1cbiAgLy8gaWYgKHdzU3RhdGUpIHtcbiAgLy8gICBhc3NpZ25TcGVjaWFsUGF0aHMod3NTdGF0ZS5pbnN0YWxsSnNvbi5kZXBlbmRlbmNpZXMsIHBhdGhzRGlycywgYXNzaWduZWVPcHRpb25zLCBiYXNlVXJsQWJzUGF0aCk7XG4gIC8vICAgYXNzaWduU3BlY2lhbFBhdGhzKHdzU3RhdGUuaW5zdGFsbEpzb24uZGV2RGVwZW5kZW5jaWVzLCBwYXRoc0RpcnMsIGFzc2lnbmVlT3B0aW9ucywgYmFzZVVybEFic1BhdGgpO1xuICAvLyAgIGFzc2lnblNwZWNpYWxQYXRocyh3c1N0YXRlLmluc3RhbGxKc29uLnBlZXJEZXBlbmRlbmNpZXMsIHBhdGhzRGlycywgYXNzaWduZWVPcHRpb25zLCBiYXNlVXJsQWJzUGF0aCk7XG4gIC8vIH1cblxuICBhc3NpZ25lZU9wdGlvbnMuYmFzZVVybCA9IGJhc2VVcmwucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuXG4gIC8vIGlmIChhc3NpZ25lZU9wdGlvbnMucGF0aHNbJyonXSA9PSBudWxsKVxuICAvLyAgIGFzc2lnbmVlT3B0aW9ucy5wYXRoc1snKiddID0gW10gYXMgc3RyaW5nW107XG4gIC8vIGNvbnN0IHdpbGRjYXJkUGF0aHM6IHN0cmluZ1tdID0gYXNzaWduZWVPcHRpb25zLnBhdGhzWycqJ107XG5cbiAgLy8gZm9yIChjb25zdCBkaXIgb2YgcGF0aHNEaXJzKSB7XG4gIC8vICAgY29uc3QgcmVsYXRpdmVEaXIgPSBQYXRoLnJlbGF0aXZlKGJhc2VVcmxBYnNQYXRoLCBkaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgLy8gICAvLyBJTVBPUlRBTlQ6IGBAdHlwZS8qYCBtdXN0IGJlIHByaW8gdG8gYC8qYCwgZm9yIHRob3NlIHBhY2thZ2VzIGhhdmUgbm8gdHlwZSBkZWZpbmludGlvblxuICAvLyAgIHdpbGRjYXJkUGF0aHMucHVzaChQYXRoLmpvaW4ocmVsYXRpdmVEaXIsICdAdHlwZXMvKicpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSk7XG4gIC8vICAgd2lsZGNhcmRQYXRocy5wdXNoKFBhdGguam9pbihyZWxhdGl2ZURpciwgJyonKS5yZXBsYWNlKC9cXFxcL2csICcvJykpO1xuICAvLyB9XG4gIC8vIGFzc2lnbmVlT3B0aW9ucy5wYXRoc1snKiddID0gXy51bmlxKHdpbGRjYXJkUGF0aHMpO1xuICBhcHBlbmRUeXBlUm9vdHMocGF0aHNEaXJzLCB0c2NvbmZpZ0RpciwgYXNzaWduZWVPcHRpb25zLCBvcHRzKTtcblxuICByZXR1cm4gYXNzaWduZWVPcHRpb25zIGFzIENvbXBpbGVyT3B0aW9ucztcbn1cblxuLyoqXG4gKiBGb3IgdGhvc2Ugc3BlY2lhbCBzY29wZWQgcGFja2FnZSB3aGljaCBpcyBsaWtlIEBsb2FkYWJsZS9jb21wb25lbnQsIGl0cyB0eXBlIGRlZmluaXRpb24gcGFja2FnZSBpc1xuICogQHR5cGVzL2xvYWRhYmxlX19jb21wb25lbnRcbiAqL1xuLy8gZnVuY3Rpb24gYXNzaWduU3BlY2lhbFBhdGhzKGRlcGVuZGVuY2llczoge1tkZXA6IHN0cmluZ106IHN0cmluZ30gfCB1bmRlZmluZWQsXG4vLyAgIG5vZGVQYXRoczogSXRlcmFibGU8c3RyaW5nPixcbi8vICAgYXNzaWduZWVPcHRpb25zOiBQYXJ0aWFsPENvbXBpbGVyT3B0aW9ucz4sIGFic0Jhc2VVcmxQYXRoOiBzdHJpbmcpIHtcbi8vICAgaWYgKGRlcGVuZGVuY2llcyA9PSBudWxsKVxuLy8gICAgIHJldHVybjtcblxuLy8gICAvLyBpZiAoYXNzaWduZWVPcHRpb25zLnBhdGhzID09IG51bGwpXG4vLyAgIC8vICAgYXNzaWduZWVPcHRpb25zLnBhdGhzID0ge307XG4vLyAgIGZvciAoY29uc3QgaXRlbSBvZiBPYmplY3Qua2V5cyhkZXBlbmRlbmNpZXMpKSB7XG4vLyAgICAgY29uc3QgbSA9IC9eQHR5cGVzXFwvKC4qPylfXyguKj8pJC8uZXhlYyhpdGVtKTtcbi8vICAgICBpZiAobSkge1xuLy8gICAgICAgY29uc3Qgb3JpZ2luUGtnTmFtZSA9IGBAJHttWzFdfS8ke21bMl19YDtcbi8vICAgICAgIGNvbnN0IGV4YWN0T25lOiBzdHJpbmdbXSA9IGFzc2lnbmVlT3B0aW9ucy5wYXRocyFbb3JpZ2luUGtnTmFtZV0gPSBbXTtcbi8vICAgICAgIGNvbnN0IHdpbGRPbmU6IHN0cmluZ1tdID0gYXNzaWduZWVPcHRpb25zLnBhdGhzIVtvcmlnaW5Qa2dOYW1lICsgJy8qJ10gPSBbXTtcbi8vICAgICAgIGZvciAoY29uc3QgZGlyIG9mIG5vZGVQYXRocykge1xuLy8gICAgICAgICBjb25zdCByZWxhdGl2ZURpciA9IFBhdGgucmVsYXRpdmUoYWJzQmFzZVVybFBhdGgsIGRpciArICcvJyArIGl0ZW0pLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbi8vICAgICAgICAgZXhhY3RPbmUucHVzaChyZWxhdGl2ZURpcik7XG4vLyAgICAgICAgIHdpbGRPbmUucHVzaChyZWxhdGl2ZURpciArICcvKicpO1xuLy8gICAgICAgfVxuLy8gICAgIH1cbi8vICAgfVxuLy8gfVxuXG5mdW5jdGlvbiBwYXRoTWFwcGluZ0ZvckxpbmtlZFBrZ3MoYmFzZVVybEFic1BhdGg6IHN0cmluZykge1xuICBsZXQgZHJjcERpciA9IChnZXRTdGF0ZSgpLmxpbmtlZERyY3AgfHwgZ2V0U3RhdGUoKS5pbnN0YWxsZWREcmNwKSEucmVhbFBhdGg7XG5cbiAgY29uc3QgcGF0aE1hcHBpbmc6IHtba2V5OiBzdHJpbmddOiBzdHJpbmdbXX0gPSB7fTtcblxuICBmb3IgKGNvbnN0IFtuYW1lLCB7cmVhbFBhdGgsIGpzb259XSBvZiBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmVudHJpZXMoKSB8fCBbXSkge1xuICAgIGNvbnN0IHRzRGlycyA9IGdldFRzY0NvbmZpZ09mUGtnKGpzb24pO1xuICAgIGNvbnN0IHJlYWxEaXIgPSBQYXRoLnJlbGF0aXZlKGJhc2VVcmxBYnNQYXRoLCByZWFsUGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIHBhdGhNYXBwaW5nW25hbWVdID0gW3JlYWxEaXJdO1xuXG4gICAgcGF0aE1hcHBpbmdbYCR7bmFtZX0vJHt0c0RpcnMuZGVzdERpcn0vKmBdID0gW2Ake3JlYWxEaXJ9LyR7dHNEaXJzLnNyY0Rpcn0vKmBdO1xuICAgIC8vIHBhdGhNYXBwaW5nW2Ake25hbWV9LyR7dHNEaXJzLmlzb21EaXJ9LypgXSA9IFtgJHtyZWFsRGlyfS8ke3RzRGlycy5pc29tRGlyfS8qYF07XG4gICAgcGF0aE1hcHBpbmdbbmFtZSArICcvKiddID0gW2Ake3JlYWxEaXJ9LypgXTtcbiAgfVxuXG4gIC8vIGlmIChwa2dOYW1lICE9PSAnQHdmaC9wbGluaycpIHtcbiAgZHJjcERpciA9IFBhdGgucmVsYXRpdmUoYmFzZVVybEFic1BhdGgsIGRyY3BEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgcGF0aE1hcHBpbmdbJ0B3ZmgvcGxpbmsnXSA9IFtkcmNwRGlyXTtcbiAgcGF0aE1hcHBpbmdbJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvKiddID0gW2RyY3BEaXIgKyAnL3dmaC90cy8qJ107XG4gIHJldHVybiBwYXRoTWFwcGluZztcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSBwYXRoc0RpcnMgTm9kZSBwYXRoIGxpa2UgcGF0aCBpbmZvcm1hdGlvblxuICogQHBhcmFtIHRzY29uZmlnRGlyIFxuICogQHBhcmFtIGFzc2lnbmVlT3B0aW9ucyBcbiAqIEBwYXJhbSBvcHRzIFxuICovXG5leHBvcnQgZnVuY3Rpb24gYXBwZW5kVHlwZVJvb3RzKHBhdGhzRGlyczogc3RyaW5nW10sIHRzY29uZmlnRGlyOiBzdHJpbmcsIGFzc2lnbmVlT3B0aW9uczogUGFydGlhbDxDb21waWxlck9wdGlvbnM+LFxuICBvcHRzOiBDb21waWxlck9wdGlvblNldE9wdCkge1xuICBpZiAob3B0cy5ub1R5cGVSb290c0luUGFja2FnZXMgPT0gbnVsbCB8fCAhb3B0cy5ub1R5cGVSb290c0luUGFja2FnZXMpIHtcbiAgICBpZiAoYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyA9PSBudWxsKVxuICAgICAgYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyA9IFtdO1xuICAgIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMucHVzaChcbiAgICAgIC8vIHBsaW5rIGRpcmVjdG9yeTogd2ZoL3R5cGVzLCBpdCBpcyBhIHN5bWxpbmsgYXQgcnVudGltZSwgZHVlIHRvIFBsaW5rIHVzZXMgcHJlc2VydmUtc3ltbGlua3MgdG8gcnVuIGNvbW1hbmRzXG4gICAgICBQYXRoLnJlbGF0aXZlKHRzY29uZmlnRGlyLCBQYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdHlwZXMnKSkucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICAgICAgLi4udHlwZVJvb3RzSW5QYWNrYWdlcyhvcHRzLndvcmtzcGFjZURpcikubWFwKGRpciA9PiBQYXRoLnJlbGF0aXZlKHRzY29uZmlnRGlyLCBkaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSlcbiAgICApO1xuICB9XG5cbiAgaWYgKG9wdHMuZW5hYmxlVHlwZVJvb3RzICkge1xuICAgIGlmIChhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzID09IG51bGwpXG4gICAgICBhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzID0gW107XG4gICAgYXNzaWduZWVPcHRpb25zLnR5cGVSb290cy5wdXNoKC4uLnBhdGhzRGlycy5tYXAoZGlyID0+IHtcbiAgICAgIGNvbnN0IHJlbGF0aXZlRGlyID0gUGF0aC5yZWxhdGl2ZSh0c2NvbmZpZ0RpciwgZGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICByZXR1cm4gcmVsYXRpdmVEaXIgKyAnL0B0eXBlcyc7XG4gICAgfSkpO1xuICB9XG5cbiAgaWYgKG9wdHMuZXh0cmFUeXBlUm9vdCkge1xuICAgIGlmIChhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzID09IG51bGwpXG4gICAgICBhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzID0gW107XG4gICAgYXNzaWduZWVPcHRpb25zLnR5cGVSb290cy5wdXNoKC4uLm9wdHMuZXh0cmFUeXBlUm9vdC5tYXAoXG4gICAgICBkaXIgPT4gUGF0aC5yZWxhdGl2ZSh0c2NvbmZpZ0RpciwgZGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJykpKTtcbiAgfVxuXG4gIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMgPSBfLnVuaXEoYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyk7XG4gIGlmIChhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzICE9IG51bGwgJiYgYXNzaWduZWVPcHRpb25zLnR5cGVSb290cy5sZW5ndGggPT09IDApXG4gICAgZGVsZXRlIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHM7XG59XG5cbmZ1bmN0aW9uIHR5cGVSb290c0luUGFja2FnZXMob25seUluY2x1ZGVkV29ya3NwYWNlPzogc3RyaW5nKSB7XG4gIC8vIGNvbnN0IHtnZXRTdGF0ZSwgd29ya3NwYWNlS2V5fTogdHlwZW9mIF9wa2dNZ3IgPSByZXF1aXJlKCcuL3BhY2thZ2UtbWdyJyk7XG4gIGNvbnN0IHdzS2V5cyA9IG9ubHlJbmNsdWRlZFdvcmtzcGFjZSA/IFt3b3Jrc3BhY2VLZXkob25seUluY2x1ZGVkV29ya3NwYWNlKV0gOiBnZXRTdGF0ZSgpLndvcmtzcGFjZXMua2V5cygpO1xuICBjb25zdCBkaXJzOiBzdHJpbmdbXSA9IFtdO1xuICBmb3IgKGNvbnN0IHdzS2V5IG9mIHdzS2V5cykge1xuICAgIGZvciAoY29uc3QgcGtnIG9mIHBhY2thZ2VzNFdvcmtzcGFjZUtleSh3c0tleSkpIHtcbiAgICAgIGNvbnN0IHR5cGVSb290ID0gcGtnLmpzb24ucGxpbmsgPyBwa2cuanNvbi5wbGluay50eXBlUm9vdCA6IHBrZy5qc29uLmRyID8gcGtnLmpzb24uZHIudHlwZVJvb3QgOiBudWxsO1xuICAgICAgaWYgKHR5cGVSb290KSB7XG4gICAgICAgIGNvbnN0IGRpciA9IFBhdGgucmVzb2x2ZShwa2cucGF0aCwgdHlwZVJvb3QpO1xuICAgICAgICBkaXJzLnB1c2goZGlyKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRpcnM7XG59XG4iXX0=