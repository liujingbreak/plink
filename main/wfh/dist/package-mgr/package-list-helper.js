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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1saXN0LWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsbUNBQTJGO0FBQzNGLGdEQUF3QjtBQUN4Qiw0Q0FBMkM7QUFDM0Msb0RBQXVCO0FBQ3ZCLG1DQUFpQztBQUNqQyx3Q0FBdUM7QUFJdkMsTUFBTSxHQUFHLEdBQUcsa0JBQVMsQ0FBQywyQkFBMkIsQ0FBQyxDQUFDO0FBRW5ELFFBQWUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxNQUFvQyxFQUMvRCxVQUFnQyxFQUFFLFdBQXNCO0lBRXhELElBQUksVUFBVSxLQUFLLFdBQVcsRUFBRTtRQUM5QixJQUFJLFdBQVcsRUFBRTtZQUNmLEtBQUssTUFBTSxVQUFVLElBQUksV0FBVyxFQUFFO2dCQUNwQyxNQUFNLE9BQU8sR0FBRyxxQkFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUMxQyxNQUFNLFFBQVEsR0FBRyxnQkFBUSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUMxRCxJQUFJLFFBQVEsSUFBSSxJQUFJO29CQUNsQixPQUFPO2dCQUNULEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFO29CQUM5QixNQUFNLEdBQUcsR0FBRyxnQkFBUSxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDaEQsSUFBSSxHQUFHLEVBQUU7d0JBQ1AsTUFBTSxHQUFHLENBQUM7cUJBQ1g7aUJBQ0Y7YUFDRjtTQUNGO2FBQU07WUFDTCxLQUFLLE1BQU0sR0FBRyxJQUFJLGdCQUFRLEVBQUUsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQ2pELE1BQU0sR0FBRyxDQUFDO2FBQ1g7U0FDRjtLQUNGO0lBQ0QsSUFBSSxVQUFVLEtBQUssS0FBSyxFQUFFO1FBQ3hCLEtBQUssTUFBTSxFQUFFLElBQUksZ0JBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUMvQyxNQUFNLFNBQVMsR0FBRyxFQUFFLENBQUMsbUJBQW1CLENBQUM7WUFDekMsSUFBSSxTQUFTLEVBQUU7Z0JBQ2IsS0FBSyxNQUFNLElBQUksSUFBSSxTQUFTLENBQUMsTUFBTSxFQUFFLEVBQUU7b0JBQ3JDLE1BQU0sSUFBSSxDQUFDO2lCQUNaO2FBQ0Y7U0FDRjtLQUNGO0FBQ0gsQ0FBQztBQWpDRCxrQ0FpQ0M7QUFFRCxRQUFlLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFhLEVBQUUsZ0JBQWdCLEdBQUcsSUFBSTtJQUMzRSxNQUFNLEVBQUUsR0FBRyxnQkFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM1QyxJQUFJLENBQUMsRUFBRTtRQUNMLE9BQU87SUFFVCxNQUFNLE1BQU0sR0FBRyxnQkFBUSxFQUFFLENBQUMsV0FBVyxDQUFDO0lBQ3RDLE1BQU0sU0FBUyxHQUFHLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQztJQUN6QyxNQUFNLGlCQUFpQixHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7SUFDNUMsS0FBSyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLGtCQUFrQixFQUFFO1FBQzVDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM5QixNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzlCLElBQUksRUFBRSxJQUFJLElBQUk7WUFDWixHQUFHLENBQUMsS0FBSyxDQUFDLG1CQUFtQixNQUFNLGlCQUFpQixLQUFLLEVBQUUsQ0FBQyxDQUFDOztZQUU3RCxNQUFNLEVBQUUsQ0FBQztLQUNaO0lBQ0QsS0FBSyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDLHFCQUFxQixFQUFFO1FBQy9DLElBQUksaUJBQWlCLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ2pDLFNBQVM7U0FDVjtRQUNELE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDOUIsSUFBSSxFQUFFLElBQUksSUFBSTtZQUNaLEdBQUcsQ0FBQyxLQUFLLENBQUMsbUJBQW1CLE1BQU0saUJBQWlCLEtBQUssRUFBRSxDQUFDLENBQUM7O1lBRTdELE1BQU0sRUFBRSxDQUFDO0tBQ1o7SUFDRCxJQUFJLGdCQUFnQixJQUFJLFNBQVMsRUFBRTtRQUNqQyxLQUFLLE1BQU0sSUFBSSxJQUFJLFNBQVMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNyQyxJQUFJLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUU7Z0JBQ3BDLFNBQVM7YUFDVjtZQUNELE1BQU0sSUFBSSxDQUFDO1NBQ1o7S0FDRjtBQUNILENBQUM7QUFsQ0Qsc0RBa0NDO0FBRUQsU0FBZ0Isa0JBQWtCLENBQUMsWUFBcUIsRUFBRSxnQkFBZ0IsR0FBRyxJQUFJO0lBQy9FLE1BQU0sS0FBSyxHQUFHLG9CQUFZLENBQUMsWUFBWSxJQUFJLGVBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUM3RCxPQUFPLHFCQUFxQixDQUFDLEtBQUssRUFBRSxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3hELENBQUM7QUFIRCxnREFHQztBQUVEOztHQUVHO0FBQ0gsU0FBZ0Isd0JBQXdCLENBQUMsR0FBRyxXQUFxQjs7SUFDL0QsTUFBTSxJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7SUFDbEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztJQUNqQyxLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLElBQUksZ0JBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsRUFBRTtRQUM1RCxLQUFLLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxPQUFPLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFO1lBQ3hGLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDckIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNqQjtTQUNGO1FBQ0QsS0FBSyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksT0FBQSxPQUFPLENBQUMsbUJBQW1CLDBDQUFFLElBQUksT0FBTSxFQUFFLEVBQUU7WUFDakUsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxFQUFFO2dCQUNyQixNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ2pCO1NBQ0Y7S0FDRjtJQUNELE9BQU8sTUFBTSxDQUFDO0FBQ2hCLENBQUM7QUFoQkQsNERBZ0JDO0FBc0JEOzs7Ozs7OztHQVFHO0FBQ0gsU0FBZ0IsMkJBQTJCLENBQ3pDLFdBQW1CLEVBQ25CLE9BQU8sR0FBRyxJQUFJLEVBQ2QsZUFBeUMsRUFDekMsT0FBNkIsRUFBQyxlQUFlLEVBQUUsS0FBSyxFQUFDO0lBRXJELDRGQUE0RjtJQUM1RixJQUFJLFdBQStCLENBQUM7SUFDcEMsNEJBQTRCO0lBQzVCLElBQUksU0FBUyxHQUFhLEVBQUUsQ0FBQztJQUM3Qiw2Q0FBNkM7SUFDN0MsTUFBTSxjQUFjLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUM7SUFFMUQsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUU7UUFDekIsSUFBSSxlQUFlLENBQUMsS0FBSyxJQUFJLElBQUksRUFBRTtZQUNqQyxlQUFlLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztTQUM1QjtRQUNELE1BQU0sQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSx3QkFBd0IsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO0tBQ2hGO0lBRUQsSUFBSSxPQUFtQyxDQUFDO0lBQ3hDLElBQUksSUFBSSxDQUFDLFlBQVksSUFBSSxJQUFJLEVBQUU7UUFDN0IsV0FBVyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxlQUFRLENBQUMsY0FBYyxDQUFDLENBQUM7UUFDdkUsbUVBQW1FO1FBQ25FLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyx5QkFBYSxDQUFDLGVBQVEsQ0FBQyxPQUFPLEVBQUUsV0FBVyxFQUMzRCxJQUFJLENBQUMsWUFBWSxJQUFJLGVBQVEsQ0FBQyxPQUFPLEVBQUUsZUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFFN0QsT0FBTyxHQUFHLGdCQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLG9CQUFZLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7S0FDdEU7SUFFRCxJQUFJLElBQUksQ0FBQyxhQUFhLElBQUksSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFO1FBQ3ZELFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7S0FDdkM7SUFFRCxTQUFTLEdBQUcsZ0JBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUM7SUFFOUIsSUFBSSxJQUFJLENBQUMsVUFBVSxJQUFJLFdBQVcsRUFBRTtRQUNsQyxNQUFNLEdBQUcsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzNDLElBQUksR0FBRyxJQUFJLENBQUMsRUFBRTtZQUNaLFNBQVMsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1NBQzFCO0tBQ0Y7SUFFRCxJQUFJLGNBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLEVBQUU7UUFDNUIsSUFBSSxVQUFVLEdBQUcsY0FBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFDckQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDO1lBQzdCLFVBQVUsR0FBRyxJQUFJLEdBQUcsVUFBVSxDQUFDO1FBQ2pDLE9BQU8sR0FBRyxVQUFVLENBQUM7S0FDdEI7SUFFRCxJQUFJLGVBQWUsQ0FBQyxLQUFLLElBQUksSUFBSTtRQUMvQixlQUFlLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztJQUU3QixJQUFJLE9BQU8sRUFBRTtRQUNYLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLFNBQVMsRUFBRSxlQUFlLEVBQUUsY0FBYyxDQUFDLENBQUM7UUFDakcsa0JBQWtCLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxlQUFlLEVBQUUsU0FBUyxFQUFFLGVBQWUsRUFBRSxjQUFjLENBQUMsQ0FBQztRQUNwRyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLGdCQUFnQixFQUFFLFNBQVMsRUFBRSxlQUFlLEVBQUUsY0FBYyxDQUFDLENBQUM7S0FDdEc7SUFDRCxtQ0FBbUM7SUFDbkMsbURBQW1EO0lBQ25ELG9HQUFvRztJQUNwRyxJQUFJO0lBRUosZUFBZSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztJQUV0RCxJQUFJLGVBQWUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksSUFBSTtRQUNwQyxlQUFlLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEVBQWMsQ0FBQztJQUM5QyxNQUFNLGFBQWEsR0FBYSxlQUFlLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBRTNELEtBQUssTUFBTSxHQUFHLElBQUksU0FBUyxFQUFFO1FBQzNCLE1BQU0sV0FBVyxHQUFHLGNBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDM0UseUZBQXlGO1FBQ3pGLGFBQWEsQ0FBQyxJQUFJLENBQUMsY0FBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO1FBQzNFLGFBQWEsQ0FBQyxJQUFJLENBQUMsY0FBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0tBQ3JFO0lBQ0QsZUFBZSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBRyxnQkFBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztJQUNuRCxlQUFlLENBQUMsU0FBUyxFQUFFLFdBQVcsRUFBRSxlQUFlLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFFL0QsT0FBTyxlQUFrQyxDQUFDO0FBQzVDLENBQUM7QUEvRUQsa0VBK0VDO0FBRUQ7OztHQUdHO0FBQ0gsU0FBUyxrQkFBa0IsQ0FBQyxZQUFpRCxFQUMzRSxTQUEyQixFQUMzQixlQUF5QyxFQUFFLGNBQXNCO0lBQ2pFLElBQUksWUFBWSxJQUFJLElBQUk7UUFDdEIsT0FBTztJQUVULElBQUksZUFBZSxDQUFDLEtBQUssSUFBSSxJQUFJO1FBQy9CLGVBQWUsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO0lBQzdCLEtBQUssTUFBTSxJQUFJLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsRUFBRTtRQUM1QyxNQUFNLENBQUMsR0FBRyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDOUMsSUFBSSxDQUFDLEVBQUU7WUFDTCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUN6QyxNQUFNLFFBQVEsR0FBYSxlQUFlLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNyRSxNQUFNLE9BQU8sR0FBYSxlQUFlLENBQUMsS0FBSyxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDM0UsS0FBSyxNQUFNLEdBQUcsSUFBSSxTQUFTLEVBQUU7Z0JBQzNCLE1BQU0sV0FBVyxHQUFHLGNBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLEdBQUcsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztnQkFDeEYsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztnQkFDM0IsT0FBTyxDQUFDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLENBQUM7YUFDbEM7U0FDRjtLQUNGO0FBQ0gsQ0FBQztBQUVELFNBQVMsd0JBQXdCLENBQUMsY0FBc0I7SUFDdEQsSUFBSSxPQUFPLEdBQUcsQ0FBQyxnQkFBUSxFQUFFLENBQUMsVUFBVSxJQUFJLGdCQUFRLEVBQUUsQ0FBQyxhQUFhLENBQUUsQ0FBQyxRQUFRLENBQUM7SUFFNUUsTUFBTSxXQUFXLEdBQThCLEVBQUUsQ0FBQztJQUVsRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFBQyxRQUFRLEVBQUMsQ0FBQyxJQUFJLGdCQUFRLEVBQUUsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxFQUFFO1FBQ3ZFLE1BQU0sT0FBTyxHQUFHLGNBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDNUUsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDOUIsV0FBVyxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsQ0FBQztLQUM3QztJQUVELGtDQUFrQztJQUNsQyxPQUFPLEdBQUcsY0FBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztJQUNyRSxXQUFXLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN0QyxXQUFXLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUM7SUFDL0MsT0FBTyxXQUFXLENBQUM7QUFDckIsQ0FBQztBQUVEOzs7Ozs7R0FNRztBQUNILFNBQVMsZUFBZSxDQUFDLFNBQW1CLEVBQUUsV0FBbUIsRUFBRSxlQUF5QyxFQUMxRyxJQUEwQjtJQUUxQixJQUFJLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFO1FBQy9CLElBQUksZUFBZSxDQUFDLFNBQVMsSUFBSSxJQUFJO1lBQ25DLGVBQWUsQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO1FBQ2pDLGVBQWUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUM1QixjQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxjQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLEVBQ3RGLEdBQUcsbUJBQW1CLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLGNBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLEdBQUcsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FDMUcsQ0FBQztLQUNIO0lBRUQsSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFHO1FBQ3pCLElBQUksZUFBZSxDQUFDLFNBQVMsSUFBSSxJQUFJO1lBQ25DLGVBQWUsQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO1FBQ2pDLGVBQWUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNwRCxNQUFNLFdBQVcsR0FBRyxjQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQ3hFLE9BQU8sV0FBVyxHQUFHLFNBQVMsQ0FBQztRQUNqQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0tBQ0w7SUFFRCxJQUFJLElBQUksQ0FBQyxhQUFhLEVBQUU7UUFDdEIsSUFBSSxlQUFlLENBQUMsU0FBUyxJQUFJLElBQUk7WUFDbkMsZUFBZSxDQUFDLFNBQVMsR0FBRyxFQUFFLENBQUM7UUFDakMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FDdEQsR0FBRyxDQUFDLEVBQUUsQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNoRTtJQUVELGVBQWUsQ0FBQyxTQUFTLEdBQUcsZ0JBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDO0lBQzlELElBQUksZUFBZSxDQUFDLFNBQVMsSUFBSSxJQUFJLElBQUksZUFBZSxDQUFDLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQztRQUM3RSxPQUFPLGVBQWUsQ0FBQyxTQUFTLENBQUM7QUFDckMsQ0FBQztBQUVELFNBQVMsbUJBQW1CLENBQUMsb0JBQTZCO0lBQ3hELDZFQUE2RTtJQUM3RSxNQUFNLE1BQU0sR0FBRyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxvQkFBWSxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsQ0FBQztJQUMxRyxNQUFNLElBQUksR0FBYSxFQUFFLENBQUM7SUFDMUIsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUU7UUFDMUIsS0FBSyxNQUFNLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsRUFBRTtZQUM5QyxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7WUFDdEcsSUFBSSxRQUFRLEVBQUU7Z0JBQ1osTUFBTSxHQUFHLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFDO2dCQUNqRCxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO2FBQ2hCO1NBQ0Y7S0FDRjtJQUNELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Z2V0U3RhdGUsIHBhdGhUb1Byb2pLZXksIHdvcmtzcGFjZUtleSwgUGFja2FnZUluZm8sIFdvcmtzcGFjZVN0YXRlfSBmcm9tICcuL2luZGV4JztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtjYWxjTm9kZVBhdGhzfSBmcm9tICcuLi9ub2RlLXBhdGgnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtwbGlua0Vudn0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5pbXBvcnQgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmV4cG9ydCB0eXBlIFBhY2thZ2VUeXBlID0gJyonIHwgJ2J1aWxkJyB8ICdjb3JlJztcbmNvbnN0IGxvZyA9IGdldExvZ2dlcigncGxpbmsucGFja2FnZS1saXN0LWhlbHBlcicpO1xuXG5leHBvcnQgZnVuY3Rpb24qIGFsbFBhY2thZ2VzKF90eXBlcz86IFBhY2thZ2VUeXBlIHwgUGFja2FnZVR5cGVbXSxcbiAgcmVjaXBlVHlwZT86ICdzcmMnIHwgJ2luc3RhbGxlZCcsIHByb2plY3REaXJzPzogc3RyaW5nW10pOiBHZW5lcmF0b3I8UGFja2FnZUluZm8+IHtcblxuICBpZiAocmVjaXBlVHlwZSAhPT0gJ2luc3RhbGxlZCcpIHtcbiAgICBpZiAocHJvamVjdERpcnMpIHtcbiAgICAgIGZvciAoY29uc3QgcHJvamVjdERpciBvZiBwcm9qZWN0RGlycykge1xuICAgICAgICBjb25zdCBwcm9qS2V5ID0gcGF0aFRvUHJvaktleShwcm9qZWN0RGlyKTtcbiAgICAgICAgY29uc3QgcGtnTmFtZXMgPSBnZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMuZ2V0KHByb2pLZXkpO1xuICAgICAgICBpZiAocGtnTmFtZXMgPT0gbnVsbClcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIGZvciAoY29uc3QgcGtnTmFtZSBvZiBwa2dOYW1lcykge1xuICAgICAgICAgIGNvbnN0IHBrZyA9IGdldFN0YXRlKCkuc3JjUGFja2FnZXMuZ2V0KHBrZ05hbWUpO1xuICAgICAgICAgIGlmIChwa2cpIHtcbiAgICAgICAgICAgIHlpZWxkIHBrZztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yIChjb25zdCBwa2cgb2YgZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy52YWx1ZXMoKSkge1xuICAgICAgICB5aWVsZCBwa2c7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmIChyZWNpcGVUeXBlICE9PSAnc3JjJykge1xuICAgIGZvciAoY29uc3Qgd3Mgb2YgZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLnZhbHVlcygpKSB7XG4gICAgICBjb25zdCBpbnN0YWxsZWQgPSB3cy5pbnN0YWxsZWRDb21wb25lbnRzO1xuICAgICAgaWYgKGluc3RhbGxlZCkge1xuICAgICAgICBmb3IgKGNvbnN0IGNvbXAgb2YgaW5zdGFsbGVkLnZhbHVlcygpKSB7XG4gICAgICAgICAgeWllbGQgY29tcDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24qIHBhY2thZ2VzNFdvcmtzcGFjZUtleSh3c0tleTogc3RyaW5nLCBpbmNsdWRlSW5zdGFsbGVkID0gdHJ1ZSk6IEdlbmVyYXRvcjxQYWNrYWdlSW5mbz4ge1xuICBjb25zdCB3cyA9IGdldFN0YXRlKCkud29ya3NwYWNlcy5nZXQod3NLZXkpO1xuICBpZiAoIXdzKVxuICAgIHJldHVybjtcblxuICBjb25zdCBsaW5rZWQgPSBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzO1xuICBjb25zdCBpbnN0YWxsZWQgPSB3cy5pbnN0YWxsZWRDb21wb25lbnRzO1xuICBjb25zdCBhdm9pZER1cGxpY2F0ZVNldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBmb3IgKGNvbnN0IFtwa05hbWVdIG9mIHdzLmxpbmtlZERlcGVuZGVuY2llcykge1xuICAgIGF2b2lkRHVwbGljYXRlU2V0LmFkZChwa05hbWUpO1xuICAgIGNvbnN0IHBrID0gbGlua2VkLmdldChwa05hbWUpO1xuICAgIGlmIChwayA9PSBudWxsKVxuICAgICAgbG9nLmVycm9yKGBNaXNzaW5nIHBhY2thZ2UgJHtwa05hbWV9IGluIHdvcmtzcGFjZSAke3dzS2V5fWApO1xuICAgIGVsc2VcbiAgICAgIHlpZWxkIHBrO1xuICB9XG4gIGZvciAoY29uc3QgW3BrTmFtZV0gb2Ygd3MubGlua2VkRGV2RGVwZW5kZW5jaWVzKSB7XG4gICAgaWYgKGF2b2lkRHVwbGljYXRlU2V0Lmhhcyhwa05hbWUpKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgY29uc3QgcGsgPSBsaW5rZWQuZ2V0KHBrTmFtZSk7XG4gICAgaWYgKHBrID09IG51bGwpXG4gICAgICBsb2cuZXJyb3IoYE1pc3NpbmcgcGFja2FnZSAke3BrTmFtZX0gaW4gd29ya3NwYWNlICR7d3NLZXl9YCk7XG4gICAgZWxzZVxuICAgICAgeWllbGQgcGs7XG4gIH1cbiAgaWYgKGluY2x1ZGVJbnN0YWxsZWQgJiYgaW5zdGFsbGVkKSB7XG4gICAgZm9yIChjb25zdCBjb21wIG9mIGluc3RhbGxlZC52YWx1ZXMoKSkge1xuICAgICAgaWYgKGF2b2lkRHVwbGljYXRlU2V0Lmhhcyhjb21wLm5hbWUpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgeWllbGQgY29tcDtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhY2thZ2VzNFdvcmtzcGFjZSh3b3Jrc3BhY2VEaXI/OiBzdHJpbmcsIGluY2x1ZGVJbnN0YWxsZWQgPSB0cnVlKSB7XG4gIGNvbnN0IHdzS2V5ID0gd29ya3NwYWNlS2V5KHdvcmtzcGFjZURpciB8fCBwbGlua0Vudi53b3JrRGlyKTtcbiAgcmV0dXJuIHBhY2thZ2VzNFdvcmtzcGFjZUtleSh3c0tleSwgaW5jbHVkZUluc3RhbGxlZCk7XG59XG5cbi8qKlxuICogQHJldHVybnMgYSBtYXAgb2Ygd29ya3NwYWNlIGtleXMgb2Ygd2hpY2ggaGFzIHNwZWNpZmllZCBkZXBlbmRlbmN5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3b3Jrc3BhY2VzT2ZEZXBlbmRlbmNpZXMoLi4uZGVwUGtnTmFtZXM6IHN0cmluZ1tdKSB7XG4gIGNvbnN0IGRlcHMgPSBuZXcgU2V0KGRlcFBrZ05hbWVzKTtcbiAgY29uc3Qgd3NLZXlzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGZvciAoY29uc3QgW2tleSwgd3NTdGF0ZV0gb2YgZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmVudHJpZXMoKSkge1xuICAgIGZvciAoY29uc3QgW3BrZ05hbWVdIG9mIHdzU3RhdGUubGlua2VkRGVwZW5kZW5jaWVzLmNvbmNhdCh3c1N0YXRlLmxpbmtlZERldkRlcGVuZGVuY2llcykpIHtcbiAgICAgIGlmIChkZXBzLmhhcyhwa2dOYW1lKSkge1xuICAgICAgICB3c0tleXMuYWRkKGtleSk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgW3BrZ05hbWVdIG9mIHdzU3RhdGUuaW5zdGFsbGVkQ29tcG9uZW50cz8ua2V5cygpIHx8IFtdKSB7XG4gICAgICBpZiAoZGVwcy5oYXMocGtnTmFtZSkpIHtcbiAgICAgICAgd3NLZXlzLmFkZChrZXkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gd3NLZXlzO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVyT3B0aW9uU2V0T3B0IHtcbiAgLyoqIFdpbGwgYWRkIHR5cGVSb290cyBwcm9wZXJ0eSBmb3Igc3BlY2lmaWMgd29ya3NwYWNlLCBhbmQgYWRkIHBhdGhzIG9mIGZpbGUgXCJfcGFja2FnZS1zZXR0aW5ncy5kLnRzXCIgKi9cbiAgd29ya3NwYWNlRGlyPzogc3RyaW5nO1xuICAvKiogQWRkIHJlYWwgcGF0aCBvZiBhbGwgbGluayBwYWNrYWdlIHRvIFwicGF0aHNcIiBwcm9wZXJ0eSAqL1xuICByZWFsUGFja2FnZVBhdGhzPzogYm9vbGVhbjtcbiAgZW5hYmxlVHlwZVJvb3RzPzogYm9vbGVhbjtcbiAgbm9UeXBlUm9vdHNJblBhY2thZ2VzPzogYm9vbGVhbjtcbiAgLyoqIERlZmF1bHQgZmFsc2UsIERvIG5vdCBpbmNsdWRlIGxpbmtlZCBwYWNrYWdlIHN5bWxpbmtzIGRpcmVjdG9yeSBpbiBwYXRoKi9cbiAgbm9TeW1saW5rcz86IGJvb2xlYW47XG4gIGV4dHJhTm9kZVBhdGg/OiBzdHJpbmdbXTtcbiAgZXh0cmFUeXBlUm9vdD86IHN0cmluZ1tdO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVyT3B0aW9ucyB7XG4gIGJhc2VVcmw6IHN0cmluZztcbiAgdHlwZVJvb3RzOiBzdHJpbmdbXTtcbiAgcGF0aHM/OiB7IFtwYXRoOiBzdHJpbmddOiBzdHJpbmdbXX07XG4gIFtwcm9wOiBzdHJpbmddOiB0cy5Db21waWxlck9wdGlvbnNWYWx1ZTtcbn1cblxuLyoqXG4gKiBTZXQgXCJiYXNlVXJsXCIsIFwicGF0aHNcIiBhbmQgXCJ0eXBlUm9vdHNcIiBwcm9wZXJ0eSByZWxhdGl2ZSB0byB0c2NvbmZpZ0RpciwgcHJvY2Vzcy5jd2QoKVxuICogYW5kIHByb2Nlc3MuZW52Lk5PREVfUEFUSFNcbiAqIEBwYXJhbSB0c2NvbmZpZ0RpciBwcm9qZWN0IGRpcmVjdG9yeSB3aGVyZSB0c2NvbmZpZyBmaWxlIGlzICh2aXJ0dWFsKSxcbiAqIFwiYmFzZVVybFwiLCBcInR5cGVSb290c1wiIGlzIHJlbGF0aXZlIHRvIHRoaXMgcGFyYW1ldGVyXG4gKiBAcGFyYW0gYmFzZVVybCBjb21waWxlciBvcHRpb24gXCJiYXNlVXJsXCIsIFwicGF0aHNcIiB3aWxsIGJlIHJlbGF0aXZlIHRvIHRoaXMgcGFyZW10ZXJcbiAqIEBwYXJhbSBhc3NpZ25lZU9wdGlvbnMgXG4gKiBAcGFyYW0gb3B0cyBDb21waWxlck9wdGlvblNldE9wdFxuICovXG5leHBvcnQgZnVuY3Rpb24gc2V0VHNDb21waWxlck9wdEZvck5vZGVQYXRoKFxuICB0c2NvbmZpZ0Rpcjogc3RyaW5nLFxuICBiYXNlVXJsID0gJy4vJyxcbiAgYXNzaWduZWVPcHRpb25zOiBQYXJ0aWFsPENvbXBpbGVyT3B0aW9ucz4sXG4gIG9wdHM6IENvbXBpbGVyT3B0aW9uU2V0T3B0ID0ge2VuYWJsZVR5cGVSb290czogZmFsc2V9KSB7XG5cbiAgLy8gY29uc3Qge3Jvb3REaXIsIHBsaW5rRGlyLCBzeW1saW5rRGlyTmFtZX0gPSBKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmshKSBhcyBQbGlua0VudjtcbiAgbGV0IHN5bWxpbmtzRGlyOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIC8qKiBmb3IgcGF0aHMgbWFwcGluZyBcIipcIiAqL1xuICBsZXQgcGF0aHNEaXJzOiBzdHJpbmdbXSA9IFtdO1xuICAvLyB3b3Jrc3BhY2Ugbm9kZV9tb2R1bGVzIHNob3VsZCBiZSB0aGUgZmlyc3RcbiAgY29uc3QgYmFzZVVybEFic1BhdGggPSBQYXRoLnJlc29sdmUodHNjb25maWdEaXIsIGJhc2VVcmwpO1xuXG4gIGlmIChvcHRzLnJlYWxQYWNrYWdlUGF0aHMpIHtcbiAgICBpZiAoYXNzaWduZWVPcHRpb25zLnBhdGhzID09IG51bGwpIHtcbiAgICAgIGFzc2lnbmVlT3B0aW9ucy5wYXRocyA9IHt9O1xuICAgIH1cbiAgICBPYmplY3QuYXNzaWduKGFzc2lnbmVlT3B0aW9ucy5wYXRocywgcGF0aE1hcHBpbmdGb3JMaW5rZWRQa2dzKGJhc2VVcmxBYnNQYXRoKSk7XG4gIH1cblxuICBsZXQgd3NTdGF0ZTogV29ya3NwYWNlU3RhdGUgfCB1bmRlZmluZWQ7XG4gIGlmIChvcHRzLndvcmtzcGFjZURpciAhPSBudWxsKSB7XG4gICAgc3ltbGlua3NEaXIgPSBQYXRoLnJlc29sdmUob3B0cy53b3Jrc3BhY2VEaXIsIHBsaW5rRW52LnN5bWxpbmtEaXJOYW1lKTtcbiAgICAvLyBwYXRoc0RpcnMucHVzaChQYXRoLnJlc29sdmUob3B0cy53b3Jrc3BhY2VEaXIsICdub2RlX21vZHVsZXMnKSk7XG4gICAgcGF0aHNEaXJzLnB1c2goLi4uY2FsY05vZGVQYXRocyhwbGlua0Vudi5yb290RGlyLCBzeW1saW5rc0RpcixcbiAgICAgIG9wdHMud29ya3NwYWNlRGlyIHx8IHBsaW5rRW52LndvcmtEaXIsIHBsaW5rRW52LnBsaW5rRGlyKSk7XG5cbiAgICB3c1N0YXRlID0gZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmdldCh3b3Jrc3BhY2VLZXkob3B0cy53b3Jrc3BhY2VEaXIpKTtcbiAgfVxuXG4gIGlmIChvcHRzLmV4dHJhTm9kZVBhdGggJiYgb3B0cy5leHRyYU5vZGVQYXRoLmxlbmd0aCA+IDApIHtcbiAgICBwYXRoc0RpcnMucHVzaCguLi5vcHRzLmV4dHJhTm9kZVBhdGgpO1xuICB9XG5cbiAgcGF0aHNEaXJzID0gXy51bmlxKHBhdGhzRGlycyk7XG5cbiAgaWYgKG9wdHMubm9TeW1saW5rcyAmJiBzeW1saW5rc0Rpcikge1xuICAgIGNvbnN0IGlkeCA9IHBhdGhzRGlycy5pbmRleE9mKHN5bWxpbmtzRGlyKTtcbiAgICBpZiAoaWR4ID49IDApIHtcbiAgICAgIHBhdGhzRGlycy5zcGxpY2UoaWR4LCAxKTtcbiAgICB9XG4gIH1cblxuICBpZiAoUGF0aC5pc0Fic29sdXRlKGJhc2VVcmwpKSB7XG4gICAgbGV0IHJlbEJhc2VVcmwgPSBQYXRoLnJlbGF0aXZlKHRzY29uZmlnRGlyLCBiYXNlVXJsKTtcbiAgICBpZiAoIXJlbEJhc2VVcmwuc3RhcnRzV2l0aCgnLicpKVxuICAgICAgcmVsQmFzZVVybCA9ICcuLycgKyByZWxCYXNlVXJsO1xuICAgIGJhc2VVcmwgPSByZWxCYXNlVXJsO1xuICB9XG5cbiAgaWYgKGFzc2lnbmVlT3B0aW9ucy5wYXRocyA9PSBudWxsKVxuICAgIGFzc2lnbmVlT3B0aW9ucy5wYXRocyA9IHt9O1xuXG4gIGlmICh3c1N0YXRlKSB7XG4gICAgYXNzaWduU3BlY2lhbFBhdGhzKHdzU3RhdGUuaW5zdGFsbEpzb24uZGVwZW5kZW5jaWVzLCBwYXRoc0RpcnMsIGFzc2lnbmVlT3B0aW9ucywgYmFzZVVybEFic1BhdGgpO1xuICAgIGFzc2lnblNwZWNpYWxQYXRocyh3c1N0YXRlLmluc3RhbGxKc29uLmRldkRlcGVuZGVuY2llcywgcGF0aHNEaXJzLCBhc3NpZ25lZU9wdGlvbnMsIGJhc2VVcmxBYnNQYXRoKTtcbiAgICBhc3NpZ25TcGVjaWFsUGF0aHMod3NTdGF0ZS5pbnN0YWxsSnNvbi5wZWVyRGVwZW5kZW5jaWVzLCBwYXRoc0RpcnMsIGFzc2lnbmVlT3B0aW9ucywgYmFzZVVybEFic1BhdGgpO1xuICB9XG4gIC8vIGlmIChvcHRzLndvcmtzcGFjZURpciAhPSBudWxsKSB7XG4gIC8vICAgYXNzaWduZWVPcHRpb25zLnBhdGhzWydfcGFja2FnZS1zZXR0aW5ncyddID0gW1xuICAvLyAgICAgUGF0aC5yZWxhdGl2ZShiYXNlVXJsQWJzUGF0aCwgb3B0cy53b3Jrc3BhY2VEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSArICcvX3BhY2thZ2Utc2V0dGluZ3MnXTtcbiAgLy8gfVxuXG4gIGFzc2lnbmVlT3B0aW9ucy5iYXNlVXJsID0gYmFzZVVybC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cbiAgaWYgKGFzc2lnbmVlT3B0aW9ucy5wYXRoc1snKiddID09IG51bGwpXG4gICAgYXNzaWduZWVPcHRpb25zLnBhdGhzWycqJ10gPSBbXSBhcyBzdHJpbmdbXTtcbiAgY29uc3Qgd2lsZGNhcmRQYXRoczogc3RyaW5nW10gPSBhc3NpZ25lZU9wdGlvbnMucGF0aHNbJyonXTtcblxuICBmb3IgKGNvbnN0IGRpciBvZiBwYXRoc0RpcnMpIHtcbiAgICBjb25zdCByZWxhdGl2ZURpciA9IFBhdGgucmVsYXRpdmUoYmFzZVVybEFic1BhdGgsIGRpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIC8vIElNUE9SVEFOVDogYEB0eXBlLypgIG11c3QgYmUgcHJpbyB0byBgLypgLCBmb3IgdGhvc2UgcGFja2FnZXMgaGF2ZSBubyB0eXBlIGRlZmluaW50aW9uXG4gICAgd2lsZGNhcmRQYXRocy5wdXNoKFBhdGguam9pbihyZWxhdGl2ZURpciwgJ0B0eXBlcy8qJykucmVwbGFjZSgvXFxcXC9nLCAnLycpKTtcbiAgICB3aWxkY2FyZFBhdGhzLnB1c2goUGF0aC5qb2luKHJlbGF0aXZlRGlyLCAnKicpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSk7XG4gIH1cbiAgYXNzaWduZWVPcHRpb25zLnBhdGhzWycqJ10gPSBfLnVuaXEod2lsZGNhcmRQYXRocyk7XG4gIGFwcGVuZFR5cGVSb290cyhwYXRoc0RpcnMsIHRzY29uZmlnRGlyLCBhc3NpZ25lZU9wdGlvbnMsIG9wdHMpO1xuXG4gIHJldHVybiBhc3NpZ25lZU9wdGlvbnMgYXMgQ29tcGlsZXJPcHRpb25zO1xufVxuXG4vKipcbiAqIEZvciB0aG9zZSBzcGVjaWFsIHNjb3BlZCBwYWNrYWdlIHdoaWNoIGlzIGxpa2UgQGxvYWRhYmxlL2NvbXBvbmVudCwgaXRzIHR5cGUgZGVmaW5pdGlvbiBwYWNrYWdlIGlzXG4gKiBAdHlwZXMvbG9hZGFibGVfX2NvbXBvbmVudFxuICovXG5mdW5jdGlvbiBhc3NpZ25TcGVjaWFsUGF0aHMoZGVwZW5kZW5jaWVzOiB7W2RlcDogc3RyaW5nXTogc3RyaW5nfSB8IHVuZGVmaW5lZCxcbiAgbm9kZVBhdGhzOiBJdGVyYWJsZTxzdHJpbmc+LFxuICBhc3NpZ25lZU9wdGlvbnM6IFBhcnRpYWw8Q29tcGlsZXJPcHRpb25zPiwgYWJzQmFzZVVybFBhdGg6IHN0cmluZykge1xuICBpZiAoZGVwZW5kZW5jaWVzID09IG51bGwpXG4gICAgcmV0dXJuO1xuXG4gIGlmIChhc3NpZ25lZU9wdGlvbnMucGF0aHMgPT0gbnVsbClcbiAgICBhc3NpZ25lZU9wdGlvbnMucGF0aHMgPSB7fTtcbiAgZm9yIChjb25zdCBpdGVtIG9mIE9iamVjdC5rZXlzKGRlcGVuZGVuY2llcykpIHtcbiAgICBjb25zdCBtID0gL15AdHlwZXNcXC8oLio/KV9fKC4qPykkLy5leGVjKGl0ZW0pO1xuICAgIGlmIChtKSB7XG4gICAgICBjb25zdCBvcmlnaW5Qa2dOYW1lID0gYEAke21bMV19LyR7bVsyXX1gO1xuICAgICAgY29uc3QgZXhhY3RPbmU6IHN0cmluZ1tdID0gYXNzaWduZWVPcHRpb25zLnBhdGhzW29yaWdpblBrZ05hbWVdID0gW107XG4gICAgICBjb25zdCB3aWxkT25lOiBzdHJpbmdbXSA9IGFzc2lnbmVlT3B0aW9ucy5wYXRoc1tvcmlnaW5Qa2dOYW1lICsgJy8qJ10gPSBbXTtcbiAgICAgIGZvciAoY29uc3QgZGlyIG9mIG5vZGVQYXRocykge1xuICAgICAgICBjb25zdCByZWxhdGl2ZURpciA9IFBhdGgucmVsYXRpdmUoYWJzQmFzZVVybFBhdGgsIGRpciArICcvJyArIGl0ZW0pLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgICAgZXhhY3RPbmUucHVzaChyZWxhdGl2ZURpcik7XG4gICAgICAgIHdpbGRPbmUucHVzaChyZWxhdGl2ZURpciArICcvKicpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBwYXRoTWFwcGluZ0ZvckxpbmtlZFBrZ3MoYmFzZVVybEFic1BhdGg6IHN0cmluZykge1xuICBsZXQgZHJjcERpciA9IChnZXRTdGF0ZSgpLmxpbmtlZERyY3AgfHwgZ2V0U3RhdGUoKS5pbnN0YWxsZWREcmNwKSEucmVhbFBhdGg7XG5cbiAgY29uc3QgcGF0aE1hcHBpbmc6IHtba2V5OiBzdHJpbmddOiBzdHJpbmdbXX0gPSB7fTtcblxuICBmb3IgKGNvbnN0IFtuYW1lLCB7cmVhbFBhdGh9XSBvZiBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmVudHJpZXMoKSB8fCBbXSkge1xuICAgIGNvbnN0IHJlYWxEaXIgPSBQYXRoLnJlbGF0aXZlKGJhc2VVcmxBYnNQYXRoLCByZWFsUGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIHBhdGhNYXBwaW5nW25hbWVdID0gW3JlYWxEaXJdO1xuICAgIHBhdGhNYXBwaW5nW25hbWUgKyAnLyonXSA9IFtyZWFsRGlyICsgJy8qJ107XG4gIH1cblxuICAvLyBpZiAocGtnTmFtZSAhPT0gJ0B3ZmgvcGxpbmsnKSB7XG4gIGRyY3BEaXIgPSBQYXRoLnJlbGF0aXZlKGJhc2VVcmxBYnNQYXRoLCBkcmNwRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIHBhdGhNYXBwaW5nWydAd2ZoL3BsaW5rJ10gPSBbZHJjcERpcl07XG4gIHBhdGhNYXBwaW5nWydAd2ZoL3BsaW5rLyonXSA9IFtkcmNwRGlyICsgJy8qJ107XG4gIHJldHVybiBwYXRoTWFwcGluZztcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSBwYXRoc0RpcnMgTm9kZSBwYXRoIGxpa2UgcGF0aCBpbmZvcm1hdGlvblxuICogQHBhcmFtIHRzY29uZmlnRGlyIFxuICogQHBhcmFtIGFzc2lnbmVlT3B0aW9ucyBcbiAqIEBwYXJhbSBvcHRzIFxuICovXG5mdW5jdGlvbiBhcHBlbmRUeXBlUm9vdHMocGF0aHNEaXJzOiBzdHJpbmdbXSwgdHNjb25maWdEaXI6IHN0cmluZywgYXNzaWduZWVPcHRpb25zOiBQYXJ0aWFsPENvbXBpbGVyT3B0aW9ucz4sXG4gIG9wdHM6IENvbXBpbGVyT3B0aW9uU2V0T3B0KSB7XG5cbiAgaWYgKCFvcHRzLm5vVHlwZVJvb3RzSW5QYWNrYWdlcykge1xuICAgIGlmIChhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzID09IG51bGwpXG4gICAgICBhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzID0gW107XG4gICAgYXNzaWduZWVPcHRpb25zLnR5cGVSb290cy5wdXNoKFxuICAgICAgUGF0aC5yZWxhdGl2ZSh0c2NvbmZpZ0RpciwgUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3R5cGVzJykpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSxcbiAgICAgIC4uLnR5cGVSb290c0luUGFja2FnZXMob3B0cy53b3Jrc3BhY2VEaXIpLm1hcChkaXIgPT4gUGF0aC5yZWxhdGl2ZSh0c2NvbmZpZ0RpciwgZGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJykpXG4gICAgKTtcbiAgfVxuXG4gIGlmIChvcHRzLmVuYWJsZVR5cGVSb290cyApIHtcbiAgICBpZiAoYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyA9PSBudWxsKVxuICAgICAgYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyA9IFtdO1xuICAgIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMucHVzaCguLi5wYXRoc0RpcnMubWFwKGRpciA9PiB7XG4gICAgICBjb25zdCByZWxhdGl2ZURpciA9IFBhdGgucmVsYXRpdmUodHNjb25maWdEaXIsIGRpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgcmV0dXJuIHJlbGF0aXZlRGlyICsgJy9AdHlwZXMnO1xuICAgIH0pKTtcbiAgfVxuXG4gIGlmIChvcHRzLmV4dHJhVHlwZVJvb3QpIHtcbiAgICBpZiAoYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyA9PSBudWxsKVxuICAgICAgYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyA9IFtdO1xuICAgIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMucHVzaCguLi5vcHRzLmV4dHJhVHlwZVJvb3QubWFwKFxuICAgICAgZGlyID0+IFBhdGgucmVsYXRpdmUodHNjb25maWdEaXIsIGRpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpKSk7XG4gIH1cblxuICBhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzID0gXy51bmlxKGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMpO1xuICBpZiAoYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyAhPSBudWxsICYmIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMubGVuZ3RoID09PSAwKVxuICAgIGRlbGV0ZSBhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzO1xufVxuXG5mdW5jdGlvbiB0eXBlUm9vdHNJblBhY2thZ2VzKG9ubHlJbmNsdWRlV29ya3NwYWNlPzogc3RyaW5nKSB7XG4gIC8vIGNvbnN0IHtnZXRTdGF0ZSwgd29ya3NwYWNlS2V5fTogdHlwZW9mIF9wa2dNZ3IgPSByZXF1aXJlKCcuL3BhY2thZ2UtbWdyJyk7XG4gIGNvbnN0IHdzS2V5cyA9IG9ubHlJbmNsdWRlV29ya3NwYWNlID8gW3dvcmtzcGFjZUtleShvbmx5SW5jbHVkZVdvcmtzcGFjZSldIDogZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKTtcbiAgY29uc3QgZGlyczogc3RyaW5nW10gPSBbXTtcbiAgZm9yIChjb25zdCB3c0tleSBvZiB3c0tleXMpIHtcbiAgICBmb3IgKGNvbnN0IHBrZyBvZiBwYWNrYWdlczRXb3Jrc3BhY2VLZXkod3NLZXkpKSB7XG4gICAgICBjb25zdCB0eXBlUm9vdCA9IHBrZy5qc29uLnBsaW5rID8gcGtnLmpzb24ucGxpbmsudHlwZVJvb3QgOiBwa2cuanNvbi5kciA/IHBrZy5qc29uLmRyLnR5cGVSb290IDogbnVsbDtcbiAgICAgIGlmICh0eXBlUm9vdCkge1xuICAgICAgICBjb25zdCBkaXIgPSBQYXRoLnJlc29sdmUocGtnLnJlYWxQYXRoLCB0eXBlUm9vdCk7XG4gICAgICAgIGRpcnMucHVzaChkaXIpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gZGlycztcbn1cbiJdfQ==