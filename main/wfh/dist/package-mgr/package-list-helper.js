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
            log.info(`Missing package ${pkName} in workspace ${wsKey}`);
        else
            yield pk;
    }
    for (const [pkName] of ws.linkedDevDependencies) {
        if (avoidDuplicateSet.has(pkName)) {
            continue;
        }
        const pk = linked.get(pkName);
        if (pk == null)
            log.info(`Missing package ${pkName} in workspace ${wsKey}`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1saXN0LWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsbUNBQTJFO0FBQzNFLGdEQUF3QjtBQUN4QixzREFBZ0Q7QUFDaEQsb0RBQXVCO0FBQ3ZCLG1DQUFpQztBQUNqQyx3Q0FBMEQ7QUFJMUQsTUFBTSxHQUFHLEdBQUcsSUFBQSxrQkFBUyxFQUFDLDJCQUEyQixDQUFDLENBQUM7QUFFbkQsUUFBZSxDQUFDLENBQUMsV0FBVyxDQUFDLE1BQW9DLEVBQy9ELFVBQWdDLEVBQUUsV0FBc0I7SUFFeEQsSUFBSSxVQUFVLEtBQUssV0FBVyxFQUFFO1FBQzlCLElBQUksV0FBVyxFQUFFO1lBQ2YsS0FBSyxNQUFNLFVBQVUsSUFBSSxXQUFXLEVBQUU7Z0JBQ3BDLE1BQU0sT0FBTyxHQUFHLElBQUEscUJBQWEsRUFBQyxVQUFVLENBQUMsQ0FBQztnQkFDMUMsTUFBTSxRQUFRLEdBQUcsSUFBQSxnQkFBUSxHQUFFLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUMxRCxJQUFJLFFBQVEsSUFBSSxJQUFJO29CQUNsQixPQUFPO2dCQUNULEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFO29CQUM5QixNQUFNLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEdBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUNoRCxJQUFJLEdBQUcsRUFBRTt3QkFDUCxNQUFNLEdBQUcsQ0FBQztxQkFDWDtpQkFDRjthQUNGO1NBQ0Y7YUFBTTtZQUNMLEtBQUssTUFBTSxHQUFHLElBQUksSUFBQSxnQkFBUSxHQUFFLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUNqRCxNQUFNLEdBQUcsQ0FBQzthQUNYO1NBQ0Y7S0FDRjtJQUNELElBQUks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Q0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztZQUN0RyxJQUFJLFFBQVEsRUFBRTtnQkFDWixNQUFNLEdBQUcsR0FBRyxjQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUM7Z0JBQzdDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDaEI7U0FDRjtLQUNGO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtnZXRTdGF0ZSwgcGF0aFRvUHJvaktleSwgd29ya3NwYWNlS2V5LCBQYWNrYWdlSW5mb30gZnJvbSAnLi9pbmRleCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7Y2FsY05vZGVQYXRoc30gZnJvbSAnLi4vbm9kZS1wYXRoLWNhbGMnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtwbGlua0VudiwgZ2V0VHNjQ29uZmlnT2ZQa2d9IGZyb20gJy4uL3V0aWxzL21pc2MnO1xuaW1wb3J0IHRzIGZyb20gJ3R5cGVzY3JpcHQnO1xuXG5leHBvcnQgdHlwZSBQYWNrYWdlVHlwZSA9ICcqJyB8ICdidWlsZCcgfCAnY29yZSc7XG5jb25zdCBsb2cgPSBnZXRMb2dnZXIoJ3BsaW5rLnBhY2thZ2UtbGlzdC1oZWxwZXInKTtcblxuZXhwb3J0IGZ1bmN0aW9uKiBhbGxQYWNrYWdlcyhfdHlwZXM/OiBQYWNrYWdlVHlwZSB8IFBhY2thZ2VUeXBlW10sXG4gIHJlY2lwZVR5cGU/OiAnc3JjJyB8ICdpbnN0YWxsZWQnLCBwcm9qZWN0RGlycz86IHN0cmluZ1tdKTogR2VuZXJhdG9yPFBhY2thZ2VJbmZvPiB7XG5cbiAgaWYgKHJlY2lwZVR5cGUgIT09ICdpbnN0YWxsZWQnKSB7XG4gICAgaWYgKHByb2plY3REaXJzKSB7XG4gICAgICBmb3IgKGNvbnN0IHByb2plY3REaXIgb2YgcHJvamVjdERpcnMpIHtcbiAgICAgICAgY29uc3QgcHJvaktleSA9IHBhdGhUb1Byb2pLZXkocHJvamVjdERpcik7XG4gICAgICAgIGNvbnN0IHBrZ05hbWVzID0gZ2V0U3RhdGUoKS5wcm9qZWN0MlBhY2thZ2VzLmdldChwcm9qS2V5KTtcbiAgICAgICAgaWYgKHBrZ05hbWVzID09IG51bGwpXG4gICAgICAgICAgcmV0dXJuO1xuICAgICAgICBmb3IgKGNvbnN0IHBrZ05hbWUgb2YgcGtnTmFtZXMpIHtcbiAgICAgICAgICBjb25zdCBwa2cgPSBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmdldChwa2dOYW1lKTtcbiAgICAgICAgICBpZiAocGtnKSB7XG4gICAgICAgICAgICB5aWVsZCBwa2c7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGZvciAoY29uc3QgcGtnIG9mIGdldFN0YXRlKCkuc3JjUGFja2FnZXMudmFsdWVzKCkpIHtcbiAgICAgICAgeWllbGQgcGtnO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICBpZiAocmVjaXBlVHlwZSAhPT0gJ3NyYycpIHtcbiAgICBmb3IgKGNvbnN0IHdzIG9mIGdldFN0YXRlKCkud29ya3NwYWNlcy52YWx1ZXMoKSkge1xuICAgICAgY29uc3QgaW5zdGFsbGVkID0gd3MuaW5zdGFsbGVkQ29tcG9uZW50cztcbiAgICAgIGlmIChpbnN0YWxsZWQpIHtcbiAgICAgICAgZm9yIChjb25zdCBjb21wIG9mIGluc3RhbGxlZC52YWx1ZXMoKSkge1xuICAgICAgICAgIHlpZWxkIGNvbXA7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uKiBwYWNrYWdlczRXb3Jrc3BhY2VLZXkod3NLZXk6IHN0cmluZywgaW5jbHVkZUluc3RhbGxlZCA9IHRydWUpOiBHZW5lcmF0b3I8UGFja2FnZUluZm8+IHtcbiAgY29uc3Qgd3MgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KTtcbiAgaWYgKCF3cylcbiAgICByZXR1cm47XG5cbiAgY29uc3QgbGlua2VkID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcztcbiAgY29uc3QgaW5zdGFsbGVkID0gd3MuaW5zdGFsbGVkQ29tcG9uZW50cztcbiAgY29uc3QgYXZvaWREdXBsaWNhdGVTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgZm9yIChjb25zdCBbcGtOYW1lXSBvZiB3cy5saW5rZWREZXBlbmRlbmNpZXMpIHtcbiAgICBhdm9pZER1cGxpY2F0ZVNldC5hZGQocGtOYW1lKTtcbiAgICBjb25zdCBwayA9IGxpbmtlZC5nZXQocGtOYW1lKTtcbiAgICBpZiAocGsgPT0gbnVsbClcbiAgICAgIGxvZy5pbmZvKGBNaXNzaW5nIHBhY2thZ2UgJHtwa05hbWV9IGluIHdvcmtzcGFjZSAke3dzS2V5fWApO1xuICAgIGVsc2VcbiAgICAgIHlpZWxkIHBrO1xuICB9XG4gIGZvciAoY29uc3QgW3BrTmFtZV0gb2Ygd3MubGlua2VkRGV2RGVwZW5kZW5jaWVzKSB7XG4gICAgaWYgKGF2b2lkRHVwbGljYXRlU2V0Lmhhcyhwa05hbWUpKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgY29uc3QgcGsgPSBsaW5rZWQuZ2V0KHBrTmFtZSk7XG4gICAgaWYgKHBrID09IG51bGwpXG4gICAgICBsb2cuaW5mbyhgTWlzc2luZyBwYWNrYWdlICR7cGtOYW1lfSBpbiB3b3Jrc3BhY2UgJHt3c0tleX1gKTtcbiAgICBlbHNlXG4gICAgICB5aWVsZCBwaztcbiAgfVxuICBpZiAoaW5jbHVkZUluc3RhbGxlZCAmJiBpbnN0YWxsZWQpIHtcbiAgICBmb3IgKGNvbnN0IGNvbXAgb2YgaW5zdGFsbGVkLnZhbHVlcygpKSB7XG4gICAgICBpZiAoYXZvaWREdXBsaWNhdGVTZXQuaGFzKGNvbXAubmFtZSkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICB5aWVsZCBjb21wO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFja2FnZXM0V29ya3NwYWNlKHdvcmtzcGFjZURpcj86IHN0cmluZywgaW5jbHVkZUluc3RhbGxlZCA9IHRydWUpIHtcbiAgY29uc3Qgd3NLZXkgPSB3b3Jrc3BhY2VLZXkod29ya3NwYWNlRGlyIHx8IHBsaW5rRW52LndvcmtEaXIpO1xuICByZXR1cm4gcGFja2FnZXM0V29ya3NwYWNlS2V5KHdzS2V5LCBpbmNsdWRlSW5zdGFsbGVkKTtcbn1cblxuLyoqXG4gKiBAcmV0dXJucyBhIG1hcCBvZiB3b3Jrc3BhY2Uga2V5cyBvZiB3aGljaCBoYXMgc3BlY2lmaWVkIGRlcGVuZGVuY3lcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdvcmtzcGFjZXNPZkRlcGVuZGVuY2llcyguLi5kZXBQa2dOYW1lczogc3RyaW5nW10pIHtcbiAgY29uc3QgZGVwcyA9IG5ldyBTZXQoZGVwUGtnTmFtZXMpO1xuICBjb25zdCB3c0tleXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgZm9yIChjb25zdCBba2V5LCB3c1N0YXRlXSBvZiBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZW50cmllcygpKSB7XG4gICAgZm9yIChjb25zdCBbcGtnTmFtZV0gb2Ygd3NTdGF0ZS5saW5rZWREZXBlbmRlbmNpZXMuY29uY2F0KHdzU3RhdGUubGlua2VkRGV2RGVwZW5kZW5jaWVzKSkge1xuICAgICAgaWYgKGRlcHMuaGFzKHBrZ05hbWUpKSB7XG4gICAgICAgIHdzS2V5cy5hZGQoa2V5KTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBbcGtnTmFtZV0gb2Ygd3NTdGF0ZS5pbnN0YWxsZWRDb21wb25lbnRzPy5rZXlzKCkgfHwgW10pIHtcbiAgICAgIGlmIChkZXBzLmhhcyhwa2dOYW1lKSkge1xuICAgICAgICB3c0tleXMuYWRkKGtleSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiB3c0tleXM7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZXJPcHRpb25TZXRPcHQge1xuICAvKiogV2lsbCBhZGQgdHlwZVJvb3RzIHByb3BlcnR5IGZvciBzcGVjaWZpYyB3b3Jrc3BhY2UsIGFuZCBhZGQgcGF0aHMgb2YgZmlsZSBcInBhY2thZ2Utc2V0dGluZ3MuZC50c1wiICovXG4gIHdvcmtzcGFjZURpcj86IHN0cmluZztcbiAgLyoqIEFkZCByZWFsIHBhdGggb2YgYWxsIGxpbmsgcGFja2FnZSB0byBcInBhdGhzXCIgcHJvcGVydHkgKi9cbiAgcmVhbFBhY2thZ2VQYXRocz86IGJvb2xlYW47XG4gIGVuYWJsZVR5cGVSb290cz86IGJvb2xlYW47XG4gIG5vVHlwZVJvb3RzSW5QYWNrYWdlcz86IGJvb2xlYW47XG4gIC8qKiBEZWZhdWx0IGZhbHNlLCBEbyBub3QgaW5jbHVkZSBsaW5rZWQgcGFja2FnZSBzeW1saW5rcyBkaXJlY3RvcnkgaW4gcGF0aCovXG4gIG5vU3ltbGlua3M/OiBib29sZWFuO1xuICBleHRyYU5vZGVQYXRoPzogc3RyaW5nW107XG4gIGV4dHJhVHlwZVJvb3Q/OiBzdHJpbmdbXTtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBDb21waWxlck9wdGlvbnMge1xuICBiYXNlVXJsOiBzdHJpbmc7XG4gIHR5cGVSb290czogc3RyaW5nW107XG4gIHBhdGhzPzogeyBbcGF0aDogc3RyaW5nXTogc3RyaW5nW119O1xuICBbcHJvcDogc3RyaW5nXTogdHMuQ29tcGlsZXJPcHRpb25zVmFsdWU7XG59XG5cbi8qKlxuICogU2V0IFwiYmFzZVVybFwiLCBcInBhdGhzXCIgYW5kIFwidHlwZVJvb3RzXCIgcHJvcGVydHkgcmVsYXRpdmUgdG8gdHNjb25maWdEaXIsIHByb2Nlc3MuY3dkKClcbiAqIGFuZCBwcm9jZXNzLmVudi5OT0RFX1BBVEhTXG4gKiBAcGFyYW0gdHNjb25maWdEaXIgcHJvamVjdCBkaXJlY3Rvcnkgd2hlcmUgdHNjb25maWcgZmlsZSBpcyAodmlydHVhbCksXG4gKiBcImJhc2VVcmxcIiwgXCJ0eXBlUm9vdHNcIiBpcyByZWxhdGl2ZSB0byB0aGlzIHBhcmFtZXRlclxuICogQHBhcmFtIGJhc2VVcmwgY29tcGlsZXIgb3B0aW9uIFwiYmFzZVVybFwiLCBcInBhdGhzXCIgd2lsbCBiZSByZWxhdGl2ZSB0byB0aGlzIHBhcmVtdGVyXG4gKiBAcGFyYW0gYXNzaWduZWVPcHRpb25zIFxuICogQHBhcmFtIG9wdHMgQ29tcGlsZXJPcHRpb25TZXRPcHRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aChcbiAgdHNjb25maWdEaXI6IHN0cmluZyxcbiAgYmFzZVVybCA9ICcuLycsXG4gIGFzc2lnbmVlT3B0aW9uczogUGFydGlhbDxDb21waWxlck9wdGlvbnM+LFxuICBvcHRzOiBDb21waWxlck9wdGlvblNldE9wdCA9IHtlbmFibGVUeXBlUm9vdHM6IGZhbHNlfSkge1xuXG4gIC8vIGNvbnN0IHtyb290RGlyLCBwbGlua0Rpciwgc3ltbGlua0Rpck5hbWV9ID0gSlNPTi5wYXJzZShwcm9jZXNzLmVudi5fX3BsaW5rISkgYXMgUGxpbmtFbnY7XG4gIGxldCBzeW1saW5rc0Rpcjogc3RyaW5nIHwgdW5kZWZpbmVkO1xuICAvKiogZm9yIHBhdGhzIG1hcHBpbmcgXCIqXCIgKi9cbiAgbGV0IHBhdGhzRGlyczogc3RyaW5nW10gPSBbXTtcbiAgLy8gd29ya3NwYWNlIG5vZGVfbW9kdWxlcyBzaG91bGQgYmUgdGhlIGZpcnN0XG4gIGNvbnN0IGJhc2VVcmxBYnNQYXRoID0gUGF0aC5yZXNvbHZlKHRzY29uZmlnRGlyLCBiYXNlVXJsKTtcblxuICBpZiAob3B0cy5yZWFsUGFja2FnZVBhdGhzKSB7XG4gICAgaWYgKGFzc2lnbmVlT3B0aW9ucy5wYXRocyA9PSBudWxsKSB7XG4gICAgICBhc3NpZ25lZU9wdGlvbnMucGF0aHMgPSB7fTtcbiAgICB9XG4gICAgT2JqZWN0LmFzc2lnbihhc3NpZ25lZU9wdGlvbnMucGF0aHMsIHBhdGhNYXBwaW5nRm9yTGlua2VkUGtncyhiYXNlVXJsQWJzUGF0aCkpO1xuICB9XG5cbiAgLy8gbGV0IHdzU3RhdGU6IFdvcmtzcGFjZVN0YXRlIHwgdW5kZWZpbmVkO1xuICAvLyBsZXQgd3NLZXk6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgaWYgKG9wdHMud29ya3NwYWNlRGlyICE9IG51bGwpIHtcbiAgICBzeW1saW5rc0RpciA9IFBhdGgucmVzb2x2ZShvcHRzLndvcmtzcGFjZURpciwgcGxpbmtFbnYuc3ltbGlua0Rpck5hbWUpO1xuICAgIHBhdGhzRGlycy5wdXNoKC4uLmNhbGNOb2RlUGF0aHMocGxpbmtFbnYucm9vdERpciwgc3ltbGlua3NEaXIsXG4gICAgICBvcHRzLndvcmtzcGFjZURpciB8fCBwbGlua0Vudi53b3JrRGlyLCBwbGlua0Vudi5wbGlua0RpcikpO1xuXG4gICAgLy8gd3NLZXkgPSB3b3Jrc3BhY2VLZXkob3B0cy53b3Jrc3BhY2VEaXIpO1xuICAgIC8vIHdzU3RhdGUgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdzS2V5KTtcbiAgfVxuXG4gIGlmIChvcHRzLmV4dHJhTm9kZVBhdGggJiYgb3B0cy5leHRyYU5vZGVQYXRoLmxlbmd0aCA+IDApIHtcbiAgICBwYXRoc0RpcnMucHVzaCguLi5vcHRzLmV4dHJhTm9kZVBhdGgpO1xuICB9XG5cbiAgcGF0aHNEaXJzID0gXy51bmlxKHBhdGhzRGlycyk7XG5cbiAgaWYgKG9wdHMubm9TeW1saW5rcyAmJiBzeW1saW5rc0Rpcikge1xuICAgIGNvbnN0IGlkeCA9IHBhdGhzRGlycy5pbmRleE9mKHN5bWxpbmtzRGlyKTtcbiAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgIHBhdGhzRGlycy5zcGxpY2UoaWR4LCAxKTtcbiAgICB9XG4gIH1cblxuICBpZiAoUGF0aC5pc0Fic29sdXRlKGJhc2VVcmwpKSB7XG4gICAgbGV0IHJlbEJhc2VVcmwgPSBQYXRoLnJlbGF0aXZlKHRzY29uZmlnRGlyLCBiYXNlVXJsKTtcbiAgICBpZiAoIXJlbEJhc2VVcmwuc3RhcnRzV2l0aCgnLicpKVxuICAgICAgcmVsQmFzZVVybCA9ICcuLycgKyByZWxCYXNlVXJsO1xuICAgIGJhc2VVcmwgPSByZWxCYXNlVXJsO1xuICB9XG5cbiAgaWYgKGFzc2lnbmVlT3B0aW9ucy5wYXRocyA9PSBudWxsKVxuICAgIGFzc2lnbmVlT3B0aW9ucy5wYXRocyA9IHt9O1xuXG4gIC8vIGlmIChvcHRzLndvcmtzcGFjZURpcikge1xuICAvLyAgIGFzc2lnbmVlT3B0aW9ucy5wYXRoc1sncGFja2FnZS1zZXR0aW5ncyddID0gW1xuICAvLyAgICAgUGF0aC5yZWxhdGl2ZShiYXNlVXJsQWJzUGF0aCwgUGF0aC5qb2luKHBsaW5rRW52LmRpc3REaXIsIHdzS2V5ICsgJy5wYWNrYWdlLXNldHRpbmdzJykpXG4gIC8vICAgICAgIC5yZXBsYWNlKC9cXFxcL2csICcvJylcbiAgLy8gICBdO1xuICAvLyB9XG4gIC8vIGlmICh3c1N0YXRlKSB7XG4gIC8vICAgYXNzaWduU3BlY2lhbFBhdGhzKHdzU3RhdGUuaW5zdGFsbEpzb24uZGVwZW5kZW5jaWVzLCBwYXRoc0RpcnMsIGFzc2lnbmVlT3B0aW9ucywgYmFzZVVybEFic1BhdGgpO1xuICAvLyAgIGFzc2lnblNwZWNpYWxQYXRocyh3c1N0YXRlLmluc3RhbGxKc29uLmRldkRlcGVuZGVuY2llcywgcGF0aHNEaXJzLCBhc3NpZ25lZU9wdGlvbnMsIGJhc2VVcmxBYnNQYXRoKTtcbiAgLy8gICBhc3NpZ25TcGVjaWFsUGF0aHMod3NTdGF0ZS5pbnN0YWxsSnNvbi5wZWVyRGVwZW5kZW5jaWVzLCBwYXRoc0RpcnMsIGFzc2lnbmVlT3B0aW9ucywgYmFzZVVybEFic1BhdGgpO1xuICAvLyB9XG5cbiAgYXNzaWduZWVPcHRpb25zLmJhc2VVcmwgPSBiYXNlVXJsLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcblxuICAvLyBpZiAoYXNzaWduZWVPcHRpb25zLnBhdGhzWycqJ10gPT0gbnVsbClcbiAgLy8gICBhc3NpZ25lZU9wdGlvbnMucGF0aHNbJyonXSA9IFtdIGFzIHN0cmluZ1tdO1xuICAvLyBjb25zdCB3aWxkY2FyZFBhdGhzOiBzdHJpbmdbXSA9IGFzc2lnbmVlT3B0aW9ucy5wYXRoc1snKiddO1xuXG4gIC8vIGZvciAoY29uc3QgZGlyIG9mIHBhdGhzRGlycykge1xuICAvLyAgIGNvbnN0IHJlbGF0aXZlRGlyID0gUGF0aC5yZWxhdGl2ZShiYXNlVXJsQWJzUGF0aCwgZGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIC8vICAgLy8gSU1QT1JUQU5UOiBgQHR5cGUvKmAgbXVzdCBiZSBwcmlvIHRvIGAvKmAsIGZvciB0aG9zZSBwYWNrYWdlcyBoYXZlIG5vIHR5cGUgZGVmaW5pbnRpb25cbiAgLy8gICB3aWxkY2FyZFBhdGhzLnB1c2goUGF0aC5qb2luKHJlbGF0aXZlRGlyLCAnQHR5cGVzLyonKS5yZXBsYWNlKC9cXFxcL2csICcvJykpO1xuICAvLyAgIHdpbGRjYXJkUGF0aHMucHVzaChQYXRoLmpvaW4ocmVsYXRpdmVEaXIsICcqJykucmVwbGFjZSgvXFxcXC9nLCAnLycpKTtcbiAgLy8gfVxuICAvLyBhc3NpZ25lZU9wdGlvbnMucGF0aHNbJyonXSA9IF8udW5pcSh3aWxkY2FyZFBhdGhzKTtcbiAgYXBwZW5kVHlwZVJvb3RzKHBhdGhzRGlycywgdHNjb25maWdEaXIsIGFzc2lnbmVlT3B0aW9ucywgb3B0cyk7XG5cbiAgcmV0dXJuIGFzc2lnbmVlT3B0aW9ucyBhcyBDb21waWxlck9wdGlvbnM7XG59XG5cbi8qKlxuICogRm9yIHRob3NlIHNwZWNpYWwgc2NvcGVkIHBhY2thZ2Ugd2hpY2ggaXMgbGlrZSBAbG9hZGFibGUvY29tcG9uZW50LCBpdHMgdHlwZSBkZWZpbml0aW9uIHBhY2thZ2UgaXNcbiAqIEB0eXBlcy9sb2FkYWJsZV9fY29tcG9uZW50XG4gKi9cbi8vIGZ1bmN0aW9uIGFzc2lnblNwZWNpYWxQYXRocyhkZXBlbmRlbmNpZXM6IHtbZGVwOiBzdHJpbmddOiBzdHJpbmd9IHwgdW5kZWZpbmVkLFxuLy8gICBub2RlUGF0aHM6IEl0ZXJhYmxlPHN0cmluZz4sXG4vLyAgIGFzc2lnbmVlT3B0aW9uczogUGFydGlhbDxDb21waWxlck9wdGlvbnM+LCBhYnNCYXNlVXJsUGF0aDogc3RyaW5nKSB7XG4vLyAgIGlmIChkZXBlbmRlbmNpZXMgPT0gbnVsbClcbi8vICAgICByZXR1cm47XG5cbi8vICAgLy8gaWYgKGFzc2lnbmVlT3B0aW9ucy5wYXRocyA9PSBudWxsKVxuLy8gICAvLyAgIGFzc2lnbmVlT3B0aW9ucy5wYXRocyA9IHt9O1xuLy8gICBmb3IgKGNvbnN0IGl0ZW0gb2YgT2JqZWN0LmtleXMoZGVwZW5kZW5jaWVzKSkge1xuLy8gICAgIGNvbnN0IG0gPSAvXkB0eXBlc1xcLyguKj8pX18oLio/KSQvLmV4ZWMoaXRlbSk7XG4vLyAgICAgaWYgKG0pIHtcbi8vICAgICAgIGNvbnN0IG9yaWdpblBrZ05hbWUgPSBgQCR7bVsxXX0vJHttWzJdfWA7XG4vLyAgICAgICBjb25zdCBleGFjdE9uZTogc3RyaW5nW10gPSBhc3NpZ25lZU9wdGlvbnMucGF0aHMhW29yaWdpblBrZ05hbWVdID0gW107XG4vLyAgICAgICBjb25zdCB3aWxkT25lOiBzdHJpbmdbXSA9IGFzc2lnbmVlT3B0aW9ucy5wYXRocyFbb3JpZ2luUGtnTmFtZSArICcvKiddID0gW107XG4vLyAgICAgICBmb3IgKGNvbnN0IGRpciBvZiBub2RlUGF0aHMpIHtcbi8vICAgICAgICAgY29uc3QgcmVsYXRpdmVEaXIgPSBQYXRoLnJlbGF0aXZlKGFic0Jhc2VVcmxQYXRoLCBkaXIgKyAnLycgKyBpdGVtKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4vLyAgICAgICAgIGV4YWN0T25lLnB1c2gocmVsYXRpdmVEaXIpO1xuLy8gICAgICAgICB3aWxkT25lLnB1c2gocmVsYXRpdmVEaXIgKyAnLyonKTtcbi8vICAgICAgIH1cbi8vICAgICB9XG4vLyAgIH1cbi8vIH1cblxuZnVuY3Rpb24gcGF0aE1hcHBpbmdGb3JMaW5rZWRQa2dzKGJhc2VVcmxBYnNQYXRoOiBzdHJpbmcpIHtcbiAgbGV0IGRyY3BEaXIgPSAoZ2V0U3RhdGUoKS5saW5rZWREcmNwIHx8IGdldFN0YXRlKCkuaW5zdGFsbGVkRHJjcCkhLnJlYWxQYXRoO1xuXG4gIGNvbnN0IHBhdGhNYXBwaW5nOiB7W2tleTogc3RyaW5nXTogc3RyaW5nW119ID0ge307XG5cbiAgZm9yIChjb25zdCBbbmFtZSwge3JlYWxQYXRoLCBqc29ufV0gb2YgZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy5lbnRyaWVzKCkgfHwgW10pIHtcbiAgICBjb25zdCB0c0RpcnMgPSBnZXRUc2NDb25maWdPZlBrZyhqc29uKTtcbiAgICBjb25zdCByZWFsRGlyID0gUGF0aC5yZWxhdGl2ZShiYXNlVXJsQWJzUGF0aCwgcmVhbFBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBwYXRoTWFwcGluZ1tuYW1lXSA9IFtyZWFsRGlyXTtcblxuICAgIHBhdGhNYXBwaW5nW2Ake25hbWV9LyR7dHNEaXJzLmRlc3REaXJ9LypgXSA9IFtgJHtyZWFsRGlyfS8ke3RzRGlycy5zcmNEaXJ9LypgXTtcbiAgICAvLyBwYXRoTWFwcGluZ1tgJHtuYW1lfS8ke3RzRGlycy5pc29tRGlyfS8qYF0gPSBbYCR7cmVhbERpcn0vJHt0c0RpcnMuaXNvbURpcn0vKmBdO1xuICAgIHBhdGhNYXBwaW5nW25hbWUgKyAnLyonXSA9IFtgJHtyZWFsRGlyfS8qYF07XG4gIH1cblxuICAvLyBpZiAocGtnTmFtZSAhPT0gJ0B3ZmgvcGxpbmsnKSB7XG4gIGRyY3BEaXIgPSBQYXRoLnJlbGF0aXZlKGJhc2VVcmxBYnNQYXRoLCBkcmNwRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIHBhdGhNYXBwaW5nWydAd2ZoL3BsaW5rJ10gPSBbZHJjcERpcl07XG4gIHBhdGhNYXBwaW5nWydAd2ZoL3BsaW5rL3dmaC9kaXN0LyonXSA9IFtkcmNwRGlyICsgJy93ZmgvdHMvKiddO1xuICByZXR1cm4gcGF0aE1hcHBpbmc7XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gcGF0aHNEaXJzIE5vZGUgcGF0aCBsaWtlIHBhdGggaW5mb3JtYXRpb25cbiAqIEBwYXJhbSB0c2NvbmZpZ0RpciBcbiAqIEBwYXJhbSBhc3NpZ25lZU9wdGlvbnMgXG4gKiBAcGFyYW0gb3B0cyBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFwcGVuZFR5cGVSb290cyhwYXRoc0RpcnM6IHN0cmluZ1tdLCB0c2NvbmZpZ0Rpcjogc3RyaW5nLCBhc3NpZ25lZU9wdGlvbnM6IFBhcnRpYWw8Q29tcGlsZXJPcHRpb25zPixcbiAgb3B0czogQ29tcGlsZXJPcHRpb25TZXRPcHQpIHtcbiAgaWYgKG9wdHMubm9UeXBlUm9vdHNJblBhY2thZ2VzID09IG51bGwgfHwgIW9wdHMubm9UeXBlUm9vdHNJblBhY2thZ2VzKSB7XG4gICAgaWYgKGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMgPT0gbnVsbClcbiAgICAgIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMgPSBbXTtcbiAgICBhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzLnB1c2goXG4gICAgICAvLyBwbGluayBkaXJlY3Rvcnk6IHdmaC90eXBlcywgaXQgaXMgYSBzeW1saW5rIGF0IHJ1bnRpbWUsIGR1ZSB0byBQbGluayB1c2VzIHByZXNlcnZlLXN5bWxpbmtzIHRvIHJ1biBjb21tYW5kc1xuICAgICAgUGF0aC5yZWxhdGl2ZSh0c2NvbmZpZ0RpciwgUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3R5cGVzJykpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSxcbiAgICAgIC4uLnR5cGVSb290c0luUGFja2FnZXMob3B0cy53b3Jrc3BhY2VEaXIpLm1hcChkaXIgPT4gUGF0aC5yZWxhdGl2ZSh0c2NvbmZpZ0RpciwgZGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJykpXG4gICAgKTtcbiAgfVxuXG4gIGlmIChvcHRzLmVuYWJsZVR5cGVSb290cyApIHtcbiAgICBpZiAoYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyA9PSBudWxsKVxuICAgICAgYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyA9IFtdO1xuICAgIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMucHVzaCguLi5wYXRoc0RpcnMubWFwKGRpciA9PiB7XG4gICAgICBjb25zdCByZWxhdGl2ZURpciA9IFBhdGgucmVsYXRpdmUodHNjb25maWdEaXIsIGRpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgcmV0dXJuIHJlbGF0aXZlRGlyICsgJy9AdHlwZXMnO1xuICAgIH0pKTtcbiAgfVxuXG4gIGlmIChvcHRzLmV4dHJhVHlwZVJvb3QpIHtcbiAgICBpZiAoYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyA9PSBudWxsKVxuICAgICAgYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyA9IFtdO1xuICAgIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMucHVzaCguLi5vcHRzLmV4dHJhVHlwZVJvb3QubWFwKFxuICAgICAgZGlyID0+IFBhdGgucmVsYXRpdmUodHNjb25maWdEaXIsIGRpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpKSk7XG4gIH1cblxuICBhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzID0gXy51bmlxKGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMpO1xuICBpZiAoYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyAhPSBudWxsICYmIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMubGVuZ3RoID09PSAwKVxuICAgIGRlbGV0ZSBhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzO1xufVxuXG5mdW5jdGlvbiB0eXBlUm9vdHNJblBhY2thZ2VzKG9ubHlJbmNsdWRlZFdvcmtzcGFjZT86IHN0cmluZykge1xuICAvLyBjb25zdCB7Z2V0U3RhdGUsIHdvcmtzcGFjZUtleX06IHR5cGVvZiBfcGtnTWdyID0gcmVxdWlyZSgnLi9wYWNrYWdlLW1ncicpO1xuICBjb25zdCB3c0tleXMgPSBvbmx5SW5jbHVkZWRXb3Jrc3BhY2UgPyBbd29ya3NwYWNlS2V5KG9ubHlJbmNsdWRlZFdvcmtzcGFjZSldIDogZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKTtcbiAgY29uc3QgZGlyczogc3RyaW5nW10gPSBbXTtcbiAgZm9yIChjb25zdCB3c0tleSBvZiB3c0tleXMpIHtcbiAgICBmb3IgKGNvbnN0IHBrZyBvZiBwYWNrYWdlczRXb3Jrc3BhY2VLZXkod3NLZXkpKSB7XG4gICAgICBjb25zdCB0eXBlUm9vdCA9IHBrZy5qc29uLnBsaW5rID8gcGtnLmpzb24ucGxpbmsudHlwZVJvb3QgOiBwa2cuanNvbi5kciA/IHBrZy5qc29uLmRyLnR5cGVSb290IDogbnVsbDtcbiAgICAgIGlmICh0eXBlUm9vdCkge1xuICAgICAgICBjb25zdCBkaXIgPSBQYXRoLnJlc29sdmUocGtnLnBhdGgsIHR5cGVSb290KTtcbiAgICAgICAgZGlycy5wdXNoKGRpcik7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiBkaXJzO1xufVxuIl19