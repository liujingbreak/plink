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
    const { rootDir, plinkDir } = JSON.parse(process.env.__plink);
    let symlinksDir;
    let pathsDirs = [];
    // workspace node_modules should be the first
    const baseUrlAbsPath = path_1.default.resolve(tsconfigDir, baseUrl);
    if (opts.realPackagePaths) {
        Object.assign(assigneeOptions.paths, pathMappingForLinkedPkgs(baseUrlAbsPath));
    }
    if (opts.workspaceDir != null) {
        symlinksDir = path_1.default.resolve(opts.workspaceDir, '.links');
        // pathsDirs.push(Path.resolve(opts.workspaceDir, 'node_modules'));
        pathsDirs.push(...node_path_1.calcNodePaths(rootDir, symlinksDir, opts.workspaceDir || process.cwd(), plinkDir));
        const wsState = index_1.getState().workspaces.get(index_1.workspaceKey(opts.workspaceDir));
        if (wsState) {
            assignSpecialPaths(wsState.installJson.dependencies, assigneeOptions, baseUrlAbsPath);
            assignSpecialPaths(wsState.installJson.devDependencies, assigneeOptions, baseUrlAbsPath);
            assignSpecialPaths(wsState.installJson.peerDependencies, assigneeOptions, baseUrlAbsPath);
        }
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
function assignSpecialPaths(dependencies, assigneeOptions, absBaseUrlPath) {
    if (dependencies == null)
        return;
    for (const item of Object.keys(dependencies)) {
        const m = /^@types\/(.*?)__(.*?)$/.exec(item);
        if (m) {
            const originPkgName = `@${m[1]}/${m[2]}`;
            const relativeDir = path_1.default.relative(absBaseUrlPath, 'node_modules/' + item).replace(/\\/g, '/');
            if (assigneeOptions.paths == null)
                assigneeOptions.paths = {};
            assigneeOptions.paths[originPkgName] = [relativeDir];
            assigneeOptions.paths[originPkgName + '/*'] = [relativeDir + '/*'];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1saXN0LWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsbUNBQTJFO0FBQzNFLGdEQUF3QjtBQUN4Qiw0Q0FBcUQ7QUFDckQsb0RBQXVCO0FBQ3ZCLG1DQUFpQztBQUdqQyxNQUFNLEdBQUcsR0FBRyxrQkFBUyxDQUFDLDJCQUEyQixDQUFDLENBQUM7QUFFbkQsUUFBZSxDQUFDLENBQUMsV0FBVyxDQUFDLE1BQW9DLEVBQy9ELFVBQWdDLEVBQUUsV0FBc0I7SUFFeEQsZ0RBQWdEO0lBRWhELElBQUksVUFBVSxLQUFLLFdBQVcsRUFBRTtRQUM5QixJQUFJLFdBQVcsRUFBRTtZQUNmLEtBQUssTUFBTSxVQUFVLElBQUksV0FBVyxFQUFFO2dCQUNwQyxNQUFNLE9BQU8sR0FBRyxxQkFBYSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2dCQUMxQyxNQUFNLFFBQVEsR0FBRyxnQkFBUSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUMxRCxJQUFJLFFBQVEsSUFBSSxJQUFJO29CQUNsQixPQUFPO2dCQUNULEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFO29CQUM5QixNQUFNLEdBQUcsR0FBRyxnQkFBUSxFQUFFLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQztvQkFDaEQsSUFBSSxHQUFHLEVBQUU7d0JBQ1AsTUFBTSxHQUFHLENBQUM7cUJBQ1g7aUJBQ0Y7YUFDRjtTQUNGO2FBQU07WUFDTCxLQUFLLE1BQU0sR0FBRyxJQUFJLGdCQUFRLEVBQUUsQ0FBQyxXQUFXLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQ2pELE1BQU0sR0FBRyxDQUFDO2FBQ1g7U0FDRjtLQUNGO0lBQ0QsSUFBSSxVQUFVLEtBQUssS0FBSyxFQUFFO1FBQ3hCLEtBQUssTUFBTSxFQUFFLElBQUksZ0JBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUMvQyxNQUFNLFNBQVMsR0FBRyxFQUFFLENBQUMsbUJBQW1CLENBQUM7WUFDekMsSUFBSSxTQUFTLEVBQUU7Z0JBQ2IsS0FBSyxNQUFNLElBQUksSUFBSSxTQUFTLENBQUMsTUFBTSxFQUFFLEVBQUU7b0JBQ3JDLE1BQU0sSUFBSSxDQUFDO2lCQUNaO2FBQ0Y7U0FDRjtLQUNGO0FBQ0gsQ0FBQztBQW5DRCxrQ0FtQ0M7QUFFRCxRQUFlLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFhLEVBQUUsZ0JBQWdCLEdBQUcsSUFBSTtJQUMzRSxNQUFNLEVBQUUsR0FBRyxnQkFBUSxFQUFFLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUM1QyxJQUFJLENBQUMsRUFBRTtRQUNMLE9BQU87SUFFVCxNQUFNLE1BQU0sR0FBRyxnQkFBUSxFQUFFLENBQUMsV0FBVyxDQUFDO0lBQ3RDLE1BQU0sU0FBUyxHQUFHLEVBQUUsQ0FBQyxtQkFBbUIsQ0FBQztJQUN6QyxLQUFLLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsa0JBQWtCLEVBQUU7UUFDNUMsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUM5QixJQUFJLEVBQUUsSUFBSSxJQUFJO1lBQ1osR0FBRyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsTUFBTSxpQkFBaUIsS0FBSyxFQUFFLENBQUMsQ0FBQzs7WUFFN0QsTUFBTSxFQUFFLENBQUM7S0FDWjtJQUNELEtBQUssTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxxQkFBcUIsRUFBRTtRQUMvQyxNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzlCLElBQUksRUFBRSxJQUFJLElBQUk7WUFDWixHQUFHLENBQUMsS0FBSyxDQUFDLG1CQUFtQixNQUFNLGlCQUFpQixLQUFLLEVBQUUsQ0FBQyxDQUFDOztZQUU3RCxNQUFNLEVBQUUsQ0FBQztLQUNaO0lBQ0QsSUFBSSxnQkFBZ0IsSUFBSSxTQUFTLEVBQUU7UUFDakMsS0FBSyxNQUFNLElBQUksSUFBSSxTQUFTLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDckMsTUFBTSxJQUFJLENBQUM7U0FDWjtLQUNGO0FBQ0gsQ0FBQztBQTFCRCxzREEwQkM7QUFFRCxTQUFnQixrQkFBa0IsQ0FBQyxZQUFxQixFQUFFLGdCQUFnQixHQUFHLElBQUk7SUFDL0UsTUFBTSxLQUFLLEdBQUcsb0JBQVksQ0FBQyxZQUFZLElBQUksT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7SUFDMUQsT0FBTyxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQztBQUN4RCxDQUFDO0FBSEQsZ0RBR0M7QUFFRDs7R0FFRztBQUNILFNBQWdCLHdCQUF3QixDQUFDLEdBQUcsV0FBcUI7O0lBQy9ELE1BQU0sSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO0lBQ2xDLE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7SUFDakMsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxJQUFJLGdCQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLEVBQUU7UUFDNUQsS0FBSyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksT0FBTyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMscUJBQXFCLENBQUMsRUFBRTtZQUN4RixJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ3JCLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDakI7U0FDRjtRQUNELEtBQUssTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLE9BQUEsT0FBTyxDQUFDLG1CQUFtQiwwQ0FBRSxJQUFJLE9BQU0sRUFBRSxFQUFFO1lBQ2pFLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDckIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNqQjtTQUNGO0tBQ0Y7SUFDRCxPQUFPLE1BQU0sQ0FBQztBQUNoQixDQUFDO0FBaEJELDREQWdCQztBQXFCRDs7Ozs7OztHQU9HO0FBQ0gsU0FBZ0IsMkJBQTJCLENBQ3pDLFdBQW1CLEVBQ25CLE9BQU8sR0FBRyxJQUFJLEVBQ2QsZUFBeUMsRUFDekMsT0FBNkIsRUFBQyxlQUFlLEVBQUUsS0FBSyxFQUFDO0lBRXJELE1BQU0sRUFBQyxPQUFPLEVBQUUsUUFBUSxFQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLE9BQVEsQ0FBYSxDQUFDO0lBQ3pFLElBQUksV0FBK0IsQ0FBQztJQUNwQyxJQUFJLFNBQVMsR0FBYSxFQUFFLENBQUM7SUFDN0IsNkNBQTZDO0lBQzdDLE1BQU0sY0FBYyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFDO0lBRTFELElBQUksSUFBSSxDQUFDLGdCQUFnQixFQUFFO1FBQ3pCLE1BQU0sQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSx3QkFBd0IsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO0tBQ2hGO0lBRUQsSUFBSSxJQUFJLENBQUMsWUFBWSxJQUFJLElBQUksRUFBRTtRQUM3QixXQUFXLEdBQUcsY0FBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBQ3hELG1FQUFtRTtRQUNuRSxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcseUJBQWEsQ0FBQyxPQUFPLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxZQUFZLElBQUksT0FBTyxDQUFDLEdBQUcsRUFBRSxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUM7UUFFckcsTUFBTSxPQUFPLEdBQUcsZ0JBQVEsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsb0JBQVksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztRQUUzRSxJQUFJLE9BQU8sRUFBRTtZQUNYLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLGVBQWUsRUFBRSxjQUFjLENBQUMsQ0FBQztZQUN0RixrQkFBa0IsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLGVBQWUsRUFBRSxlQUFlLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFDekYsa0JBQWtCLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsRUFBRSxlQUFlLEVBQUUsY0FBYyxDQUFDLENBQUM7U0FDM0Y7S0FDRjtJQUVELElBQUksSUFBSSxDQUFDLGFBQWEsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUU7UUFDdkQsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQztLQUN2QztJQUVELFNBQVMsR0FBRyxnQkFBQyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUU5QixJQUFJLElBQUksQ0FBQyxVQUFVLElBQUksV0FBVyxFQUFFO1FBQ2xDLE1BQU0sR0FBRyxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDM0MsSUFBSSxHQUFHLElBQUksQ0FBQyxFQUFFO1lBQ1osU0FBUyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUM7U0FDMUI7S0FDRjtJQUVELElBQUksY0FBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsRUFBRTtRQUM1QixJQUFJLFVBQVUsR0FBRyxjQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNyRCxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7WUFDN0IsVUFBVSxHQUFHLElBQUksR0FBRyxVQUFVLENBQUM7UUFDakMsT0FBTyxHQUFHLFVBQVUsQ0FBQztLQUN0QjtJQUVELElBQUksZUFBZSxDQUFDLEtBQUssSUFBSSxJQUFJO1FBQy9CLGVBQWUsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO0lBQzdCLG1DQUFtQztJQUNuQyxtREFBbUQ7SUFDbkQsb0dBQW9HO0lBQ3BHLElBQUk7SUFFSixlQUFlLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO0lBRXRELElBQUksZUFBZSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxJQUFJO1FBQ3BDLGVBQWUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBYyxDQUFDO0lBQzlDLE1BQU0sYUFBYSxHQUFhLGVBQWUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7SUFFM0QsS0FBSyxNQUFNLEdBQUcsSUFBSSxTQUFTLEVBQUU7UUFDM0IsTUFBTSxXQUFXLEdBQUcsY0FBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztRQUMzRSx5RkFBeUY7UUFDekYsYUFBYSxDQUFDLElBQUksQ0FBQyxjQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7UUFDM0UsYUFBYSxDQUFDLElBQUksQ0FBQyxjQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUM7S0FDckU7SUFDRCxlQUFlLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxHQUFHLGdCQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0lBQ25ELGVBQWUsQ0FBQyxTQUFTLEVBQUUsV0FBVyxFQUFFLGVBQWUsRUFBRSxJQUFJLENBQUMsQ0FBQztJQUUvRCxPQUFPLGVBQWtDLENBQUM7QUFDNUMsQ0FBQztBQXpFRCxrRUF5RUM7QUFFRDs7O0dBR0c7QUFDSCxTQUFTLGtCQUFrQixDQUFDLFlBQWlELEVBQzNFLGVBQXlDLEVBQUUsY0FBc0I7SUFDakUsSUFBSSxZQUFZLElBQUksSUFBSTtRQUN0QixPQUFPO0lBRVQsS0FBSyxNQUFNLElBQUksSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFO1FBQzVDLE1BQU0sQ0FBQyxHQUFHLHdCQUF3QixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM5QyxJQUFJLENBQUMsRUFBRTtZQUNMLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3pDLE1BQU0sV0FBVyxHQUFHLGNBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLGVBQWUsR0FBRyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1lBQzlGLElBQUksZUFBZSxDQUFDLEtBQUssSUFBSSxJQUFJO2dCQUMvQixlQUFlLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztZQUM3QixlQUFlLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDckQsZUFBZSxDQUFDLEtBQUssQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLENBQUM7U0FDcEU7S0FDRjtBQUNILENBQUM7QUFFRCxTQUFTLHdCQUF3QixDQUFDLGNBQXNCO0lBQ3RELElBQUksT0FBTyxHQUFHLENBQUMsZ0JBQVEsRUFBRSxDQUFDLFVBQVUsSUFBSSxnQkFBUSxFQUFFLENBQUMsYUFBYSxDQUFFLENBQUMsUUFBUSxDQUFDO0lBRTVFLE1BQU0sV0FBVyxHQUE4QixFQUFFLENBQUM7SUFFbEQsS0FBSyxNQUFNLENBQUMsSUFBSSxFQUFFLEVBQUMsUUFBUSxFQUFDLENBQUMsSUFBSSxnQkFBUSxFQUFFLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsRUFBRTtRQUN2RSxNQUFNLE9BQU8sR0FBRyxjQUFJLENBQUMsUUFBUSxDQUFDLGNBQWMsRUFBRSxRQUFRLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzVFLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQzlCLFdBQVcsQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLENBQUM7S0FDN0M7SUFFRCxrQ0FBa0M7SUFDbEMsT0FBTyxHQUFHLGNBQUksQ0FBQyxRQUFRLENBQUMsY0FBYyxFQUFFLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDckUsV0FBVyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDdEMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxDQUFDO0lBQy9DLE9BQU8sV0FBVyxDQUFDO0FBQ3JCLENBQUM7QUFFRDs7Ozs7O0dBTUc7QUFDSCxTQUFTLGVBQWUsQ0FBQyxTQUFtQixFQUFFLFdBQW1CLEVBQUUsZUFBeUMsRUFDMUcsSUFBMEI7SUFFMUIsSUFBSSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRTtRQUMvQixJQUFJLGVBQWUsQ0FBQyxTQUFTLElBQUksSUFBSTtZQUNuQyxlQUFlLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQztRQUNqQyxlQUFlLENBQUMsU0FBUyxDQUFDLElBQUksQ0FDNUIsY0FBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxFQUN0RixHQUFHLG1CQUFtQixDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxjQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQzFHLENBQUM7S0FDSDtJQUVELElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRztRQUN6QixJQUFJLGVBQWUsQ0FBQyxTQUFTLElBQUksSUFBSTtZQUNuQyxlQUFlLENBQUMsU0FBUyxHQUFHLEVBQUUsQ0FBQztRQUNqQyxlQUFlLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDcEQsTUFBTSxXQUFXLEdBQUcsY0FBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQztZQUN4RSxPQUFPLFdBQVcsR0FBRyxTQUFTLENBQUM7UUFDakMsQ0FBQyxDQUFDLENBQUMsQ0FBQztLQUNMO0lBRUQsSUFBSSxJQUFJLENBQUMsYUFBYSxFQUFFO1FBQ3RCLElBQUksZUFBZSxDQUFDLFNBQVMsSUFBSSxJQUFJO1lBQ25DLGVBQWUsQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFDO1FBQ2pDLGVBQWUsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQ3RELEdBQUcsQ0FBQyxFQUFFLENBQUMsY0FBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDaEU7SUFFRCxlQUFlLENBQUMsU0FBUyxHQUFHLGdCQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQztJQUM5RCxJQUFJLGVBQWUsQ0FBQyxTQUFTLElBQUksSUFBSSxJQUFJLGVBQWUsQ0FBQyxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUM7UUFDN0UsT0FBTyxlQUFlLENBQUMsU0FBUyxDQUFDO0FBQ3JDLENBQUM7QUFFRCxTQUFTLG1CQUFtQixDQUFDLG9CQUE2QjtJQUN4RCw2RUFBNkU7SUFDN0UsTUFBTSxNQUFNLEdBQUcsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsb0JBQVksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFRLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDMUcsTUFBTSxJQUFJLEdBQWEsRUFBRSxDQUFDO0lBQzFCLEtBQUssTUFBTSxLQUFLLElBQUksTUFBTSxFQUFFO1FBQzFCLEtBQUssTUFBTSxHQUFHLElBQUkscUJBQXFCLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDOUMsSUFBSSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUU7Z0JBQ3hCLE1BQU0sR0FBRyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDN0QsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNoQjtTQUNGO0tBQ0Y7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge2dldFN0YXRlLCBwYXRoVG9Qcm9qS2V5LCB3b3Jrc3BhY2VLZXksIFBhY2thZ2VJbmZvfSBmcm9tICcuL2luZGV4JztcbmltcG9ydCBQYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHtQbGlua0VudiwgY2FsY05vZGVQYXRoc30gZnJvbSAnLi4vbm9kZS1wYXRoJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQge2dldExvZ2dlcn0gZnJvbSAnbG9nNGpzJztcblxuZXhwb3J0IHR5cGUgUGFja2FnZVR5cGUgPSAnKicgfCAnYnVpbGQnIHwgJ2NvcmUnO1xuY29uc3QgbG9nID0gZ2V0TG9nZ2VyKCdwbGluay5wYWNrYWdlLWxpc3QtaGVscGVyJyk7XG5cbmV4cG9ydCBmdW5jdGlvbiogYWxsUGFja2FnZXMoX3R5cGVzPzogUGFja2FnZVR5cGUgfCBQYWNrYWdlVHlwZVtdLFxuICByZWNpcGVUeXBlPzogJ3NyYycgfCAnaW5zdGFsbGVkJywgcHJvamVjdERpcnM/OiBzdHJpbmdbXSk6IEdlbmVyYXRvcjxQYWNrYWdlSW5mbz4ge1xuXG4gIC8vIGNvbnN0IHdzS2V5ID0gcGF0aFRvV29ya3NwYWNlKHByb2Nlc3MuY3dkKCkpO1xuXG4gIGlmIChyZWNpcGVUeXBlICE9PSAnaW5zdGFsbGVkJykge1xuICAgIGlmIChwcm9qZWN0RGlycykge1xuICAgICAgZm9yIChjb25zdCBwcm9qZWN0RGlyIG9mIHByb2plY3REaXJzKSB7XG4gICAgICAgIGNvbnN0IHByb2pLZXkgPSBwYXRoVG9Qcm9qS2V5KHByb2plY3REaXIpO1xuICAgICAgICBjb25zdCBwa2dOYW1lcyA9IGdldFN0YXRlKCkucHJvamVjdDJQYWNrYWdlcy5nZXQocHJvaktleSk7XG4gICAgICAgIGlmIChwa2dOYW1lcyA9PSBudWxsKVxuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgZm9yIChjb25zdCBwa2dOYW1lIG9mIHBrZ05hbWVzKSB7XG4gICAgICAgICAgY29uc3QgcGtnID0gZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy5nZXQocGtnTmFtZSk7XG4gICAgICAgICAgaWYgKHBrZykge1xuICAgICAgICAgICAgeWllbGQgcGtnO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKGNvbnN0IHBrZyBvZiBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLnZhbHVlcygpKSB7XG4gICAgICAgIHlpZWxkIHBrZztcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgaWYgKHJlY2lwZVR5cGUgIT09ICdzcmMnKSB7XG4gICAgZm9yIChjb25zdCB3cyBvZiBnZXRTdGF0ZSgpLndvcmtzcGFjZXMudmFsdWVzKCkpIHtcbiAgICAgIGNvbnN0IGluc3RhbGxlZCA9IHdzLmluc3RhbGxlZENvbXBvbmVudHM7XG4gICAgICBpZiAoaW5zdGFsbGVkKSB7XG4gICAgICAgIGZvciAoY29uc3QgY29tcCBvZiBpbnN0YWxsZWQudmFsdWVzKCkpIHtcbiAgICAgICAgICB5aWVsZCBjb21wO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiogcGFja2FnZXM0V29ya3NwYWNlS2V5KHdzS2V5OiBzdHJpbmcsIGluY2x1ZGVJbnN0YWxsZWQgPSB0cnVlKTogR2VuZXJhdG9yPFBhY2thZ2VJbmZvPiB7XG4gIGNvbnN0IHdzID0gZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmdldCh3c0tleSk7XG4gIGlmICghd3MpXG4gICAgcmV0dXJuO1xuXG4gIGNvbnN0IGxpbmtlZCA9IGdldFN0YXRlKCkuc3JjUGFja2FnZXM7XG4gIGNvbnN0IGluc3RhbGxlZCA9IHdzLmluc3RhbGxlZENvbXBvbmVudHM7XG4gIGZvciAoY29uc3QgW3BrTmFtZV0gb2Ygd3MubGlua2VkRGVwZW5kZW5jaWVzKSB7XG4gICAgY29uc3QgcGsgPSBsaW5rZWQuZ2V0KHBrTmFtZSk7XG4gICAgaWYgKHBrID09IG51bGwpXG4gICAgICBsb2cuZXJyb3IoYE1pc3NpbmcgcGFja2FnZSAke3BrTmFtZX0gaW4gd29ya3NwYWNlICR7d3NLZXl9YCk7XG4gICAgZWxzZVxuICAgICAgeWllbGQgcGs7XG4gIH1cbiAgZm9yIChjb25zdCBbcGtOYW1lXSBvZiB3cy5saW5rZWREZXZEZXBlbmRlbmNpZXMpIHtcbiAgICBjb25zdCBwayA9IGxpbmtlZC5nZXQocGtOYW1lKTtcbiAgICBpZiAocGsgPT0gbnVsbClcbiAgICAgIGxvZy5lcnJvcihgTWlzc2luZyBwYWNrYWdlICR7cGtOYW1lfSBpbiB3b3Jrc3BhY2UgJHt3c0tleX1gKTtcbiAgICBlbHNlXG4gICAgICB5aWVsZCBwaztcbiAgfVxuICBpZiAoaW5jbHVkZUluc3RhbGxlZCAmJiBpbnN0YWxsZWQpIHtcbiAgICBmb3IgKGNvbnN0IGNvbXAgb2YgaW5zdGFsbGVkLnZhbHVlcygpKSB7XG4gICAgICB5aWVsZCBjb21wO1xuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFja2FnZXM0V29ya3NwYWNlKHdvcmtzcGFjZURpcj86IHN0cmluZywgaW5jbHVkZUluc3RhbGxlZCA9IHRydWUpIHtcbiAgY29uc3Qgd3NLZXkgPSB3b3Jrc3BhY2VLZXkod29ya3NwYWNlRGlyIHx8IHByb2Nlc3MuY3dkKCkpO1xuICByZXR1cm4gcGFja2FnZXM0V29ya3NwYWNlS2V5KHdzS2V5LCBpbmNsdWRlSW5zdGFsbGVkKTtcbn1cblxuLyoqXG4gKiBAcmV0dXJucyBhIG1hcCBvZiB3b3Jrc3BhY2Uga2V5cyBvZiB3aGljaCBoYXMgc3BlY2lmaWVkIGRlcGVuZGVuY3lcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHdvcmtzcGFjZXNPZkRlcGVuZGVuY2llcyguLi5kZXBQa2dOYW1lczogc3RyaW5nW10pIHtcbiAgY29uc3QgZGVwcyA9IG5ldyBTZXQoZGVwUGtnTmFtZXMpO1xuICBjb25zdCB3c0tleXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgZm9yIChjb25zdCBba2V5LCB3c1N0YXRlXSBvZiBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZW50cmllcygpKSB7XG4gICAgZm9yIChjb25zdCBbcGtnTmFtZV0gb2Ygd3NTdGF0ZS5saW5rZWREZXBlbmRlbmNpZXMuY29uY2F0KHdzU3RhdGUubGlua2VkRGV2RGVwZW5kZW5jaWVzKSkge1xuICAgICAgaWYgKGRlcHMuaGFzKHBrZ05hbWUpKSB7XG4gICAgICAgIHdzS2V5cy5hZGQoa2V5KTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChjb25zdCBbcGtnTmFtZV0gb2Ygd3NTdGF0ZS5pbnN0YWxsZWRDb21wb25lbnRzPy5rZXlzKCkgfHwgW10pIHtcbiAgICAgIGlmIChkZXBzLmhhcyhwa2dOYW1lKSkge1xuICAgICAgICB3c0tleXMuYWRkKGtleSk7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIHJldHVybiB3c0tleXM7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZXJPcHRpb25TZXRPcHQge1xuICAvKiogV2lsbCBhZGQgdHlwZVJvb3RzIHByb3BlcnR5IGZvciBzcGVjaWZpYyB3b3Jrc3BhY2UsIGFuZCBhZGQgcGF0aHMgb2YgZmlsZSBcIl9wYWNrYWdlLXNldHRpbmdzLmQudHNcIiAqL1xuICB3b3Jrc3BhY2VEaXI/OiBzdHJpbmc7XG4gIC8qKiBBZGQgcmVhbCBwYXRoIG9mIGFsbCBsaW5rIHBhY2thZ2UgdG8gXCJwYXRoc1wiIHByb3BlcnR5ICovXG4gIHJlYWxQYWNrYWdlUGF0aHM/OiBib29sZWFuO1xuICBlbmFibGVUeXBlUm9vdHM/OiBib29sZWFuO1xuICBub1R5cGVSb290c0luUGFja2FnZXM/OiBib29sZWFuO1xuICAvKiogRGVmYXVsdCBmYWxzZSwgRG8gbm90IGluY2x1ZGUgbGlua2VkIHBhY2thZ2Ugc3ltbGlua3MgZGlyZWN0b3J5IGluIHBhdGgqL1xuICBub1N5bWxpbmtzPzogYm9vbGVhbjtcbiAgZXh0cmFOb2RlUGF0aD86IHN0cmluZ1tdO1xuICBleHRyYVR5cGVSb290Pzogc3RyaW5nW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZXJPcHRpb25zIHtcbiAgYmFzZVVybDogc3RyaW5nO1xuICB0eXBlUm9vdHM6IHN0cmluZ1tdO1xuICBwYXRocz86IHtbcGF0aDogc3RyaW5nXTogc3RyaW5nW119O1xuICBba2V5OiBzdHJpbmddOiBhbnk7XG59XG4vKipcbiAqIFNldCBcImJhc2VVcmxcIiwgXCJwYXRoc1wiIGFuZCBcInR5cGVSb290c1wiIHByb3BlcnR5IHJlbGF0aXZlIHRvIHRzY29uZmlnRGlyLCBwcm9jZXNzLmN3ZCgpXG4gKiBhbmQgcHJvY2Vzcy5lbnYuTk9ERV9QQVRIU1xuICogQHBhcmFtIHRzY29uZmlnRGlyIHByb2plY3QgZGlyZWN0b3J5IHdoZXJlIHRzY29uZmlnIGZpbGUgaXMgKHZpcnR1YWwpLFxuICogXCJiYXNlVXJsXCIsIFwidHlwZVJvb3RzXCIgaXMgcmVsYXRpdmUgdG8gdGhpcyBwYXJhbWV0ZXJcbiAqIEBwYXJhbSBiYXNlVXJsIGNvbXBpbGVyIG9wdGlvbiBcImJhc2VVcmxcIiwgXCJwYXRoc1wiIHdpbGwgYmUgcmVsYXRpdmUgdG8gdGhpcyBwYXJlbXRlclxuICogQHBhcmFtIGFzc2lnbmVlT3B0aW9ucyBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldFRzQ29tcGlsZXJPcHRGb3JOb2RlUGF0aChcbiAgdHNjb25maWdEaXI6IHN0cmluZyxcbiAgYmFzZVVybCA9ICcuLycsXG4gIGFzc2lnbmVlT3B0aW9uczogUGFydGlhbDxDb21waWxlck9wdGlvbnM+LFxuICBvcHRzOiBDb21waWxlck9wdGlvblNldE9wdCA9IHtlbmFibGVUeXBlUm9vdHM6IGZhbHNlfSkge1xuXG4gIGNvbnN0IHtyb290RGlyLCBwbGlua0Rpcn0gPSBKU09OLnBhcnNlKHByb2Nlc3MuZW52Ll9fcGxpbmshKSBhcyBQbGlua0VudjtcbiAgbGV0IHN5bWxpbmtzRGlyOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGxldCBwYXRoc0RpcnM6IHN0cmluZ1tdID0gW107XG4gIC8vIHdvcmtzcGFjZSBub2RlX21vZHVsZXMgc2hvdWxkIGJlIHRoZSBmaXJzdFxuICBjb25zdCBiYXNlVXJsQWJzUGF0aCA9IFBhdGgucmVzb2x2ZSh0c2NvbmZpZ0RpciwgYmFzZVVybCk7XG5cbiAgaWYgKG9wdHMucmVhbFBhY2thZ2VQYXRocykge1xuICAgIE9iamVjdC5hc3NpZ24oYXNzaWduZWVPcHRpb25zLnBhdGhzLCBwYXRoTWFwcGluZ0ZvckxpbmtlZFBrZ3MoYmFzZVVybEFic1BhdGgpKTtcbiAgfVxuXG4gIGlmIChvcHRzLndvcmtzcGFjZURpciAhPSBudWxsKSB7XG4gICAgc3ltbGlua3NEaXIgPSBQYXRoLnJlc29sdmUob3B0cy53b3Jrc3BhY2VEaXIsICcubGlua3MnKTtcbiAgICAvLyBwYXRoc0RpcnMucHVzaChQYXRoLnJlc29sdmUob3B0cy53b3Jrc3BhY2VEaXIsICdub2RlX21vZHVsZXMnKSk7XG4gICAgcGF0aHNEaXJzLnB1c2goLi4uY2FsY05vZGVQYXRocyhyb290RGlyLCBzeW1saW5rc0Rpciwgb3B0cy53b3Jrc3BhY2VEaXIgfHwgcHJvY2Vzcy5jd2QoKSwgcGxpbmtEaXIpKTtcblxuICAgIGNvbnN0IHdzU3RhdGUgPSBnZXRTdGF0ZSgpLndvcmtzcGFjZXMuZ2V0KHdvcmtzcGFjZUtleShvcHRzLndvcmtzcGFjZURpcikpO1xuXG4gICAgaWYgKHdzU3RhdGUpIHtcbiAgICAgIGFzc2lnblNwZWNpYWxQYXRocyh3c1N0YXRlLmluc3RhbGxKc29uLmRlcGVuZGVuY2llcywgYXNzaWduZWVPcHRpb25zLCBiYXNlVXJsQWJzUGF0aCk7XG4gICAgICBhc3NpZ25TcGVjaWFsUGF0aHMod3NTdGF0ZS5pbnN0YWxsSnNvbi5kZXZEZXBlbmRlbmNpZXMsIGFzc2lnbmVlT3B0aW9ucywgYmFzZVVybEFic1BhdGgpO1xuICAgICAgYXNzaWduU3BlY2lhbFBhdGhzKHdzU3RhdGUuaW5zdGFsbEpzb24ucGVlckRlcGVuZGVuY2llcywgYXNzaWduZWVPcHRpb25zLCBiYXNlVXJsQWJzUGF0aCk7XG4gICAgfVxuICB9XG5cbiAgaWYgKG9wdHMuZXh0cmFOb2RlUGF0aCAmJiBvcHRzLmV4dHJhTm9kZVBhdGgubGVuZ3RoID4gMCkge1xuICAgIHBhdGhzRGlycy5wdXNoKC4uLm9wdHMuZXh0cmFOb2RlUGF0aCk7XG4gIH1cblxuICBwYXRoc0RpcnMgPSBfLnVuaXEocGF0aHNEaXJzKTtcblxuICBpZiAob3B0cy5ub1N5bWxpbmtzICYmIHN5bWxpbmtzRGlyKSB7XG4gICAgY29uc3QgaWR4ID0gcGF0aHNEaXJzLmluZGV4T2Yoc3ltbGlua3NEaXIpO1xuICAgIGlmIChpZHggPj0gMCkge1xuICAgICAgcGF0aHNEaXJzLnNwbGljZShpZHgsIDEpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChQYXRoLmlzQWJzb2x1dGUoYmFzZVVybCkpIHtcbiAgICBsZXQgcmVsQmFzZVVybCA9IFBhdGgucmVsYXRpdmUodHNjb25maWdEaXIsIGJhc2VVcmwpO1xuICAgIGlmICghcmVsQmFzZVVybC5zdGFydHNXaXRoKCcuJykpXG4gICAgICByZWxCYXNlVXJsID0gJy4vJyArIHJlbEJhc2VVcmw7XG4gICAgYmFzZVVybCA9IHJlbEJhc2VVcmw7XG4gIH1cblxuICBpZiAoYXNzaWduZWVPcHRpb25zLnBhdGhzID09IG51bGwpXG4gICAgYXNzaWduZWVPcHRpb25zLnBhdGhzID0ge307XG4gIC8vIGlmIChvcHRzLndvcmtzcGFjZURpciAhPSBudWxsKSB7XG4gIC8vICAgYXNzaWduZWVPcHRpb25zLnBhdGhzWydfcGFja2FnZS1zZXR0aW5ncyddID0gW1xuICAvLyAgICAgUGF0aC5yZWxhdGl2ZShiYXNlVXJsQWJzUGF0aCwgb3B0cy53b3Jrc3BhY2VEaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSArICcvX3BhY2thZ2Utc2V0dGluZ3MnXTtcbiAgLy8gfVxuXG4gIGFzc2lnbmVlT3B0aW9ucy5iYXNlVXJsID0gYmFzZVVybC5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG5cbiAgaWYgKGFzc2lnbmVlT3B0aW9ucy5wYXRoc1snKiddID09IG51bGwpXG4gICAgYXNzaWduZWVPcHRpb25zLnBhdGhzWycqJ10gPSBbXSBhcyBzdHJpbmdbXTtcbiAgY29uc3Qgd2lsZGNhcmRQYXRoczogc3RyaW5nW10gPSBhc3NpZ25lZU9wdGlvbnMucGF0aHNbJyonXTtcblxuICBmb3IgKGNvbnN0IGRpciBvZiBwYXRoc0RpcnMpIHtcbiAgICBjb25zdCByZWxhdGl2ZURpciA9IFBhdGgucmVsYXRpdmUoYmFzZVVybEFic1BhdGgsIGRpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIC8vIElNUE9SVEFOVDogYEB0eXBlLypgIG11c3QgYmUgcHJpbyB0byBgLypgLCBmb3IgdGhvc2UgcGFja2FnZXMgaGF2ZSBubyB0eXBlIGRlZmluaW50aW9uXG4gICAgd2lsZGNhcmRQYXRocy5wdXNoKFBhdGguam9pbihyZWxhdGl2ZURpciwgJ0B0eXBlcy8qJykucmVwbGFjZSgvXFxcXC9nLCAnLycpKTtcbiAgICB3aWxkY2FyZFBhdGhzLnB1c2goUGF0aC5qb2luKHJlbGF0aXZlRGlyLCAnKicpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSk7XG4gIH1cbiAgYXNzaWduZWVPcHRpb25zLnBhdGhzWycqJ10gPSBfLnVuaXEod2lsZGNhcmRQYXRocyk7XG4gIGFwcGVuZFR5cGVSb290cyhwYXRoc0RpcnMsIHRzY29uZmlnRGlyLCBhc3NpZ25lZU9wdGlvbnMsIG9wdHMpO1xuXG4gIHJldHVybiBhc3NpZ25lZU9wdGlvbnMgYXMgQ29tcGlsZXJPcHRpb25zO1xufVxuXG4vKipcbiAqIEZvciB0aG9zZSBzcGVjaWFsIHNjb3BlZCBwYWNrYWdlIHdoaWNoIGlzIGxpa2UgQGxvYWRhYmxlL2NvbXBvbmVudCwgaXRzIHR5cGUgZGVmaW5pdGlvbiBwYWNrYWdlIGlzXG4gKiBAdHlwZXMvbG9hZGFibGVfX2NvbXBvbmVudFxuICovXG5mdW5jdGlvbiBhc3NpZ25TcGVjaWFsUGF0aHMoZGVwZW5kZW5jaWVzOiB7W2RlcDogc3RyaW5nXTogc3RyaW5nfSB8IHVuZGVmaW5lZCxcbiAgYXNzaWduZWVPcHRpb25zOiBQYXJ0aWFsPENvbXBpbGVyT3B0aW9ucz4sIGFic0Jhc2VVcmxQYXRoOiBzdHJpbmcpIHtcbiAgaWYgKGRlcGVuZGVuY2llcyA9PSBudWxsKVxuICAgIHJldHVybjtcblxuICBmb3IgKGNvbnN0IGl0ZW0gb2YgT2JqZWN0LmtleXMoZGVwZW5kZW5jaWVzKSkge1xuICAgIGNvbnN0IG0gPSAvXkB0eXBlc1xcLyguKj8pX18oLio/KSQvLmV4ZWMoaXRlbSk7XG4gICAgaWYgKG0pIHtcbiAgICAgIGNvbnN0IG9yaWdpblBrZ05hbWUgPSBgQCR7bVsxXX0vJHttWzJdfWA7XG4gICAgICBjb25zdCByZWxhdGl2ZURpciA9IFBhdGgucmVsYXRpdmUoYWJzQmFzZVVybFBhdGgsICdub2RlX21vZHVsZXMvJyArIGl0ZW0pLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIGlmIChhc3NpZ25lZU9wdGlvbnMucGF0aHMgPT0gbnVsbClcbiAgICAgICAgYXNzaWduZWVPcHRpb25zLnBhdGhzID0ge307XG4gICAgICBhc3NpZ25lZU9wdGlvbnMucGF0aHNbb3JpZ2luUGtnTmFtZV0gPSBbcmVsYXRpdmVEaXJdO1xuICAgICAgYXNzaWduZWVPcHRpb25zLnBhdGhzW29yaWdpblBrZ05hbWUgKyAnLyonXSA9IFtyZWxhdGl2ZURpciArICcvKiddO1xuICAgIH1cbiAgfVxufVxuXG5mdW5jdGlvbiBwYXRoTWFwcGluZ0ZvckxpbmtlZFBrZ3MoYmFzZVVybEFic1BhdGg6IHN0cmluZykge1xuICBsZXQgZHJjcERpciA9IChnZXRTdGF0ZSgpLmxpbmtlZERyY3AgfHwgZ2V0U3RhdGUoKS5pbnN0YWxsZWREcmNwKSEucmVhbFBhdGg7XG5cbiAgY29uc3QgcGF0aE1hcHBpbmc6IHtba2V5OiBzdHJpbmddOiBzdHJpbmdbXX0gPSB7fTtcblxuICBmb3IgKGNvbnN0IFtuYW1lLCB7cmVhbFBhdGh9XSBvZiBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzLmVudHJpZXMoKSB8fCBbXSkge1xuICAgIGNvbnN0IHJlYWxEaXIgPSBQYXRoLnJlbGF0aXZlKGJhc2VVcmxBYnNQYXRoLCByZWFsUGF0aCkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgIHBhdGhNYXBwaW5nW25hbWVdID0gW3JlYWxEaXJdO1xuICAgIHBhdGhNYXBwaW5nW25hbWUgKyAnLyonXSA9IFtyZWFsRGlyICsgJy8qJ107XG4gIH1cblxuICAvLyBpZiAocGtnTmFtZSAhPT0gJ0B3ZmgvcGxpbmsnKSB7XG4gIGRyY3BEaXIgPSBQYXRoLnJlbGF0aXZlKGJhc2VVcmxBYnNQYXRoLCBkcmNwRGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIHBhdGhNYXBwaW5nWydAd2ZoL3BsaW5rJ10gPSBbZHJjcERpcl07XG4gIHBhdGhNYXBwaW5nWydAd2ZoL3BsaW5rLyonXSA9IFtkcmNwRGlyICsgJy8qJ107XG4gIHJldHVybiBwYXRoTWFwcGluZztcbn1cblxuLyoqXG4gKiBcbiAqIEBwYXJhbSBwYXRoc0RpcnMgTm9kZSBwYXRoIGxpa2UgcGF0aCBpbmZvcm1hdGlvblxuICogQHBhcmFtIHRzY29uZmlnRGlyIFxuICogQHBhcmFtIGFzc2lnbmVlT3B0aW9ucyBcbiAqIEBwYXJhbSBvcHRzIFxuICovXG5mdW5jdGlvbiBhcHBlbmRUeXBlUm9vdHMocGF0aHNEaXJzOiBzdHJpbmdbXSwgdHNjb25maWdEaXI6IHN0cmluZywgYXNzaWduZWVPcHRpb25zOiBQYXJ0aWFsPENvbXBpbGVyT3B0aW9ucz4sXG4gIG9wdHM6IENvbXBpbGVyT3B0aW9uU2V0T3B0KSB7XG5cbiAgaWYgKCFvcHRzLm5vVHlwZVJvb3RzSW5QYWNrYWdlcykge1xuICAgIGlmIChhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzID09IG51bGwpXG4gICAgICBhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzID0gW107XG4gICAgYXNzaWduZWVPcHRpb25zLnR5cGVSb290cy5wdXNoKFxuICAgICAgUGF0aC5yZWxhdGl2ZSh0c2NvbmZpZ0RpciwgUGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uL3R5cGVzJykpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSxcbiAgICAgIC4uLnR5cGVSb290c0luUGFja2FnZXMob3B0cy53b3Jrc3BhY2VEaXIpLm1hcChkaXIgPT4gUGF0aC5yZWxhdGl2ZSh0c2NvbmZpZ0RpciwgZGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJykpXG4gICAgKTtcbiAgfVxuXG4gIGlmIChvcHRzLmVuYWJsZVR5cGVSb290cyApIHtcbiAgICBpZiAoYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyA9PSBudWxsKVxuICAgICAgYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyA9IFtdO1xuICAgIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMucHVzaCguLi5wYXRoc0RpcnMubWFwKGRpciA9PiB7XG4gICAgICBjb25zdCByZWxhdGl2ZURpciA9IFBhdGgucmVsYXRpdmUodHNjb25maWdEaXIsIGRpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICAgICAgcmV0dXJuIHJlbGF0aXZlRGlyICsgJy9AdHlwZXMnO1xuICAgIH0pKTtcbiAgfVxuXG4gIGlmIChvcHRzLmV4dHJhVHlwZVJvb3QpIHtcbiAgICBpZiAoYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyA9PSBudWxsKVxuICAgICAgYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyA9IFtdO1xuICAgIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMucHVzaCguLi5vcHRzLmV4dHJhVHlwZVJvb3QubWFwKFxuICAgICAgZGlyID0+IFBhdGgucmVsYXRpdmUodHNjb25maWdEaXIsIGRpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpKSk7XG4gIH1cblxuICBhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzID0gXy51bmlxKGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMpO1xuICBpZiAoYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyAhPSBudWxsICYmIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMubGVuZ3RoID09PSAwKVxuICAgIGRlbGV0ZSBhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzO1xufVxuXG5mdW5jdGlvbiB0eXBlUm9vdHNJblBhY2thZ2VzKG9ubHlJbmNsdWRlV29ya3NwYWNlPzogc3RyaW5nKSB7XG4gIC8vIGNvbnN0IHtnZXRTdGF0ZSwgd29ya3NwYWNlS2V5fTogdHlwZW9mIF9wa2dNZ3IgPSByZXF1aXJlKCcuL3BhY2thZ2UtbWdyJyk7XG4gIGNvbnN0IHdzS2V5cyA9IG9ubHlJbmNsdWRlV29ya3NwYWNlID8gW3dvcmtzcGFjZUtleShvbmx5SW5jbHVkZVdvcmtzcGFjZSldIDogZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmtleXMoKTtcbiAgY29uc3QgZGlyczogc3RyaW5nW10gPSBbXTtcbiAgZm9yIChjb25zdCB3c0tleSBvZiB3c0tleXMpIHtcbiAgICBmb3IgKGNvbnN0IHBrZyBvZiBwYWNrYWdlczRXb3Jrc3BhY2VLZXkod3NLZXkpKSB7XG4gICAgICBpZiAocGtnLmpzb24uZHIudHlwZVJvb3QpIHtcbiAgICAgICAgY29uc3QgZGlyID0gUGF0aC5yZXNvbHZlKHBrZy5yZWFsUGF0aCwgcGtnLmpzb24uZHIudHlwZVJvb3QpO1xuICAgICAgICBkaXJzLnB1c2goZGlyKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRpcnM7XG59XG4iXX0=