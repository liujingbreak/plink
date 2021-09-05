"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setTsCompilerOptForNodePath = exports.workspacesOfDependencies = exports.packages4Workspace = exports.packages4WorkspaceKey = exports.allPackages = void 0;
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
    let wsState;
    let wsKey;
    if (opts.workspaceDir != null) {
        symlinksDir = path_1.default.resolve(opts.workspaceDir, misc_1.plinkEnv.symlinkDirName);
        // pathsDirs.push(Path.resolve(opts.workspaceDir, 'node_modules'));
        pathsDirs.push(...(0, node_path_calc_1.calcNodePaths)(misc_1.plinkEnv.rootDir, symlinksDir, opts.workspaceDir || misc_1.plinkEnv.workDir, misc_1.plinkEnv.plinkDir));
        wsKey = (0, index_1.workspaceKey)(opts.workspaceDir);
        wsState = (0, index_1.getState)().workspaces.get(wsKey);
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
    // if (assigneeOptions.paths == null)
    //   assigneeOptions.paths = {};
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFja2FnZS1saXN0LWhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3RzL3BhY2thZ2UtbWdyL3BhY2thZ2UtbGlzdC1oZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7O0FBQUEsbUNBQTJGO0FBQzNGLGdEQUF3QjtBQUN4QixzREFBZ0Q7QUFDaEQsb0RBQXVCO0FBQ3ZCLG1DQUFpQztBQUNqQyx3Q0FBdUM7QUFJdkMsTUFBTSxHQUFHLEdBQUcsSUFBQSxrQkFBUyxFQUFDLDJCQUEyQixDQUFDLENBQUM7QUFFbkQsUUFBZSxDQUFDLENBQUMsV0FBVyxDQUFDLE1BQW9DLEVBQy9ELFVBQWdDLEVBQUUsV0FBc0I7SUFFeEQsSUFBSSxVQUFVLEtBQUssV0FBVyxFQUFFO1FBQzlCLElBQUksV0FBVyxFQUFFO1lBQ2YsS0FBSyxNQUFNLFVBQVUsSUFBSSxXQUFXLEVBQUU7Z0JBQ3BDLE1BQU0sT0FBTyxHQUFHLElBQUEscUJBQWEsRUFBQyxVQUFVLENBQUMsQ0FBQztnQkFDMUMsTUFBTSxRQUFRLEdBQUcsSUFBQSxnQkFBUSxHQUFFLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUMxRCxJQUFJLFFBQVEsSUFBSSxJQUFJO29CQUNsQixPQUFPO2dCQUNULEtBQUssTUFBTSxPQUFPLElBQUksUUFBUSxFQUFFO29CQUM5QixNQUFNLEdBQUcsR0FBRyxJQUFBLGdCQUFRLEdBQUUsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDO29CQUNoRCxJQUFJLEdBQUcsRUFBRTt3QkFDUCxNQUFNLEdBQUcsQ0FBQztxQkFDWDtpQkFDRjthQUNGO1NBQ0Y7YUFBTTtZQUNMLEtBQUssTUFBTSxHQUFHLElBQUksSUFBQSxnQkFBUSxHQUFFLENBQUMsV0FBVyxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUNqRCxNQUFNLEdBQUcsQ0FBQzthQUNYO1NBQ0Y7S0FDRjtJQUNELElBQUks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LENBQUMsQ0FBQyxJQUFBLG9CQUFZLEVBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFBLGdCQUFRLEdBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFLENBQUM7SUFDMUcsTUFBTSxJQUFJLEdBQWEsRUFBRSxDQUFDO0lBQzFCLEtBQUssTUFBTSxLQUFLLElBQUksTUFBTSxFQUFFO1FBQzFCLEtBQUssTUFBTSxHQUFHLElBQUkscUJBQXFCLENBQUMsS0FBSyxDQUFDLEVBQUU7WUFDOUMsTUFBTSxRQUFRLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ3RHLElBQUksUUFBUSxFQUFFO2dCQUNaLE1BQU0sR0FBRyxHQUFHLGNBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQztnQkFDakQsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQzthQUNoQjtTQUNGO0tBQ0Y7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge2dldFN0YXRlLCBwYXRoVG9Qcm9qS2V5LCB3b3Jrc3BhY2VLZXksIFBhY2thZ2VJbmZvLCBXb3Jrc3BhY2VTdGF0ZX0gZnJvbSAnLi9pbmRleCc7XG5pbXBvcnQgUGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7Y2FsY05vZGVQYXRoc30gZnJvbSAnLi4vbm9kZS1wYXRoLWNhbGMnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB7Z2V0TG9nZ2VyfSBmcm9tICdsb2c0anMnO1xuaW1wb3J0IHtwbGlua0Vudn0gZnJvbSAnLi4vdXRpbHMvbWlzYyc7XG5pbXBvcnQgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5cbmV4cG9ydCB0eXBlIFBhY2thZ2VUeXBlID0gJyonIHwgJ2J1aWxkJyB8ICdjb3JlJztcbmNvbnN0IGxvZyA9IGdldExvZ2dlcigncGxpbmsucGFja2FnZS1saXN0LWhlbHBlcicpO1xuXG5leHBvcnQgZnVuY3Rpb24qIGFsbFBhY2thZ2VzKF90eXBlcz86IFBhY2thZ2VUeXBlIHwgUGFja2FnZVR5cGVbXSxcbiAgcmVjaXBlVHlwZT86ICdzcmMnIHwgJ2luc3RhbGxlZCcsIHByb2plY3REaXJzPzogc3RyaW5nW10pOiBHZW5lcmF0b3I8UGFja2FnZUluZm8+IHtcblxuICBpZiAocmVjaXBlVHlwZSAhPT0gJ2luc3RhbGxlZCcpIHtcbiAgICBpZiAocHJvamVjdERpcnMpIHtcbiAgICAgIGZvciAoY29uc3QgcHJvamVjdERpciBvZiBwcm9qZWN0RGlycykge1xuICAgICAgICBjb25zdCBwcm9qS2V5ID0gcGF0aFRvUHJvaktleShwcm9qZWN0RGlyKTtcbiAgICAgICAgY29uc3QgcGtnTmFtZXMgPSBnZXRTdGF0ZSgpLnByb2plY3QyUGFja2FnZXMuZ2V0KHByb2pLZXkpO1xuICAgICAgICBpZiAocGtnTmFtZXMgPT0gbnVsbClcbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIGZvciAoY29uc3QgcGtnTmFtZSBvZiBwa2dOYW1lcykge1xuICAgICAgICAgIGNvbnN0IHBrZyA9IGdldFN0YXRlKCkuc3JjUGFja2FnZXMuZ2V0KHBrZ05hbWUpO1xuICAgICAgICAgIGlmIChwa2cpIHtcbiAgICAgICAgICAgIHlpZWxkIHBrZztcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgZm9yIChjb25zdCBwa2cgb2YgZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy52YWx1ZXMoKSkge1xuICAgICAgICB5aWVsZCBwa2c7XG4gICAgICB9XG4gICAgfVxuICB9XG4gIGlmIChyZWNpcGVUeXBlICE9PSAnc3JjJykge1xuICAgIGZvciAoY29uc3Qgd3Mgb2YgZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLnZhbHVlcygpKSB7XG4gICAgICBjb25zdCBpbnN0YWxsZWQgPSB3cy5pbnN0YWxsZWRDb21wb25lbnRzO1xuICAgICAgaWYgKGluc3RhbGxlZCkge1xuICAgICAgICBmb3IgKGNvbnN0IGNvbXAgb2YgaW5zdGFsbGVkLnZhbHVlcygpKSB7XG4gICAgICAgICAgeWllbGQgY29tcDtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24qIHBhY2thZ2VzNFdvcmtzcGFjZUtleSh3c0tleTogc3RyaW5nLCBpbmNsdWRlSW5zdGFsbGVkID0gdHJ1ZSk6IEdlbmVyYXRvcjxQYWNrYWdlSW5mbz4ge1xuICBjb25zdCB3cyA9IGdldFN0YXRlKCkud29ya3NwYWNlcy5nZXQod3NLZXkpO1xuICBpZiAoIXdzKVxuICAgIHJldHVybjtcblxuICBjb25zdCBsaW5rZWQgPSBnZXRTdGF0ZSgpLnNyY1BhY2thZ2VzO1xuICBjb25zdCBpbnN0YWxsZWQgPSB3cy5pbnN0YWxsZWRDb21wb25lbnRzO1xuICBjb25zdCBhdm9pZER1cGxpY2F0ZVNldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICBmb3IgKGNvbnN0IFtwa05hbWVdIG9mIHdzLmxpbmtlZERlcGVuZGVuY2llcykge1xuICAgIGF2b2lkRHVwbGljYXRlU2V0LmFkZChwa05hbWUpO1xuICAgIGNvbnN0IHBrID0gbGlua2VkLmdldChwa05hbWUpO1xuICAgIGlmIChwayA9PSBudWxsKVxuICAgICAgbG9nLmVycm9yKGBNaXNzaW5nIHBhY2thZ2UgJHtwa05hbWV9IGluIHdvcmtzcGFjZSAke3dzS2V5fWApO1xuICAgIGVsc2VcbiAgICAgIHlpZWxkIHBrO1xuICB9XG4gIGZvciAoY29uc3QgW3BrTmFtZV0gb2Ygd3MubGlua2VkRGV2RGVwZW5kZW5jaWVzKSB7XG4gICAgaWYgKGF2b2lkRHVwbGljYXRlU2V0Lmhhcyhwa05hbWUpKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgY29uc3QgcGsgPSBsaW5rZWQuZ2V0KHBrTmFtZSk7XG4gICAgaWYgKHBrID09IG51bGwpXG4gICAgICBsb2cuZXJyb3IoYE1pc3NpbmcgcGFja2FnZSAke3BrTmFtZX0gaW4gd29ya3NwYWNlICR7d3NLZXl9YCk7XG4gICAgZWxzZVxuICAgICAgeWllbGQgcGs7XG4gIH1cbiAgaWYgKGluY2x1ZGVJbnN0YWxsZWQgJiYgaW5zdGFsbGVkKSB7XG4gICAgZm9yIChjb25zdCBjb21wIG9mIGluc3RhbGxlZC52YWx1ZXMoKSkge1xuICAgICAgaWYgKGF2b2lkRHVwbGljYXRlU2V0Lmhhcyhjb21wLm5hbWUpKSB7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgeWllbGQgY29tcDtcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhY2thZ2VzNFdvcmtzcGFjZSh3b3Jrc3BhY2VEaXI/OiBzdHJpbmcsIGluY2x1ZGVJbnN0YWxsZWQgPSB0cnVlKSB7XG4gIGNvbnN0IHdzS2V5ID0gd29ya3NwYWNlS2V5KHdvcmtzcGFjZURpciB8fCBwbGlua0Vudi53b3JrRGlyKTtcbiAgcmV0dXJuIHBhY2thZ2VzNFdvcmtzcGFjZUtleSh3c0tleSwgaW5jbHVkZUluc3RhbGxlZCk7XG59XG5cbi8qKlxuICogQHJldHVybnMgYSBtYXAgb2Ygd29ya3NwYWNlIGtleXMgb2Ygd2hpY2ggaGFzIHNwZWNpZmllZCBkZXBlbmRlbmN5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB3b3Jrc3BhY2VzT2ZEZXBlbmRlbmNpZXMoLi4uZGVwUGtnTmFtZXM6IHN0cmluZ1tdKSB7XG4gIGNvbnN0IGRlcHMgPSBuZXcgU2V0KGRlcFBrZ05hbWVzKTtcbiAgY29uc3Qgd3NLZXlzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGZvciAoY29uc3QgW2tleSwgd3NTdGF0ZV0gb2YgZ2V0U3RhdGUoKS53b3Jrc3BhY2VzLmVudHJpZXMoKSkge1xuICAgIGZvciAoY29uc3QgW3BrZ05hbWVdIG9mIHdzU3RhdGUubGlua2VkRGVwZW5kZW5jaWVzLmNvbmNhdCh3c1N0YXRlLmxpbmtlZERldkRlcGVuZGVuY2llcykpIHtcbiAgICAgIGlmIChkZXBzLmhhcyhwa2dOYW1lKSkge1xuICAgICAgICB3c0tleXMuYWRkKGtleSk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoY29uc3QgW3BrZ05hbWVdIG9mIHdzU3RhdGUuaW5zdGFsbGVkQ29tcG9uZW50cz8ua2V5cygpIHx8IFtdKSB7XG4gICAgICBpZiAoZGVwcy5oYXMocGtnTmFtZSkpIHtcbiAgICAgICAgd3NLZXlzLmFkZChrZXkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gd3NLZXlzO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIENvbXBpbGVyT3B0aW9uU2V0T3B0IHtcbiAgLyoqIFdpbGwgYWRkIHR5cGVSb290cyBwcm9wZXJ0eSBmb3Igc3BlY2lmaWMgd29ya3NwYWNlLCBhbmQgYWRkIHBhdGhzIG9mIGZpbGUgXCJwYWNrYWdlLXNldHRpbmdzLmQudHNcIiAqL1xuICB3b3Jrc3BhY2VEaXI/OiBzdHJpbmc7XG4gIC8qKiBBZGQgcmVhbCBwYXRoIG9mIGFsbCBsaW5rIHBhY2thZ2UgdG8gXCJwYXRoc1wiIHByb3BlcnR5ICovXG4gIHJlYWxQYWNrYWdlUGF0aHM/OiBib29sZWFuO1xuICBlbmFibGVUeXBlUm9vdHM/OiBib29sZWFuO1xuICBub1R5cGVSb290c0luUGFja2FnZXM/OiBib29sZWFuO1xuICAvKiogRGVmYXVsdCBmYWxzZSwgRG8gbm90IGluY2x1ZGUgbGlua2VkIHBhY2thZ2Ugc3ltbGlua3MgZGlyZWN0b3J5IGluIHBhdGgqL1xuICBub1N5bWxpbmtzPzogYm9vbGVhbjtcbiAgZXh0cmFOb2RlUGF0aD86IHN0cmluZ1tdO1xuICBleHRyYVR5cGVSb290Pzogc3RyaW5nW107XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tcGlsZXJPcHRpb25zIHtcbiAgYmFzZVVybDogc3RyaW5nO1xuICB0eXBlUm9vdHM6IHN0cmluZ1tdO1xuICBwYXRocz86IHsgW3BhdGg6IHN0cmluZ106IHN0cmluZ1tdfTtcbiAgW3Byb3A6IHN0cmluZ106IHRzLkNvbXBpbGVyT3B0aW9uc1ZhbHVlO1xufVxuXG4vKipcbiAqIFNldCBcImJhc2VVcmxcIiwgXCJwYXRoc1wiIGFuZCBcInR5cGVSb290c1wiIHByb3BlcnR5IHJlbGF0aXZlIHRvIHRzY29uZmlnRGlyLCBwcm9jZXNzLmN3ZCgpXG4gKiBhbmQgcHJvY2Vzcy5lbnYuTk9ERV9QQVRIU1xuICogQHBhcmFtIHRzY29uZmlnRGlyIHByb2plY3QgZGlyZWN0b3J5IHdoZXJlIHRzY29uZmlnIGZpbGUgaXMgKHZpcnR1YWwpLFxuICogXCJiYXNlVXJsXCIsIFwidHlwZVJvb3RzXCIgaXMgcmVsYXRpdmUgdG8gdGhpcyBwYXJhbWV0ZXJcbiAqIEBwYXJhbSBiYXNlVXJsIGNvbXBpbGVyIG9wdGlvbiBcImJhc2VVcmxcIiwgXCJwYXRoc1wiIHdpbGwgYmUgcmVsYXRpdmUgdG8gdGhpcyBwYXJlbXRlclxuICogQHBhcmFtIGFzc2lnbmVlT3B0aW9ucyBcbiAqIEBwYXJhbSBvcHRzIENvbXBpbGVyT3B0aW9uU2V0T3B0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzZXRUc0NvbXBpbGVyT3B0Rm9yTm9kZVBhdGgoXG4gIHRzY29uZmlnRGlyOiBzdHJpbmcsXG4gIGJhc2VVcmwgPSAnLi8nLFxuICBhc3NpZ25lZU9wdGlvbnM6IFBhcnRpYWw8Q29tcGlsZXJPcHRpb25zPixcbiAgb3B0czogQ29tcGlsZXJPcHRpb25TZXRPcHQgPSB7ZW5hYmxlVHlwZVJvb3RzOiBmYWxzZX0pIHtcblxuICAvLyBjb25zdCB7cm9vdERpciwgcGxpbmtEaXIsIHN5bWxpbmtEaXJOYW1lfSA9IEpTT04ucGFyc2UocHJvY2Vzcy5lbnYuX19wbGluayEpIGFzIFBsaW5rRW52O1xuICBsZXQgc3ltbGlua3NEaXI6IHN0cmluZyB8IHVuZGVmaW5lZDtcbiAgLyoqIGZvciBwYXRocyBtYXBwaW5nIFwiKlwiICovXG4gIGxldCBwYXRoc0RpcnM6IHN0cmluZ1tdID0gW107XG4gIC8vIHdvcmtzcGFjZSBub2RlX21vZHVsZXMgc2hvdWxkIGJlIHRoZSBmaXJzdFxuICBjb25zdCBiYXNlVXJsQWJzUGF0aCA9IFBhdGgucmVzb2x2ZSh0c2NvbmZpZ0RpciwgYmFzZVVybCk7XG5cbiAgaWYgKG9wdHMucmVhbFBhY2thZ2VQYXRocykge1xuICAgIGlmIChhc3NpZ25lZU9wdGlvbnMucGF0aHMgPT0gbnVsbCkge1xuICAgICAgYXNzaWduZWVPcHRpb25zLnBhdGhzID0ge307XG4gICAgfVxuICAgIE9iamVjdC5hc3NpZ24oYXNzaWduZWVPcHRpb25zLnBhdGhzLCBwYXRoTWFwcGluZ0ZvckxpbmtlZFBrZ3MoYmFzZVVybEFic1BhdGgpKTtcbiAgfVxuXG4gIGxldCB3c1N0YXRlOiBXb3Jrc3BhY2VTdGF0ZSB8IHVuZGVmaW5lZDtcbiAgbGV0IHdzS2V5OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gIGlmIChvcHRzLndvcmtzcGFjZURpciAhPSBudWxsKSB7XG4gICAgc3ltbGlua3NEaXIgPSBQYXRoLnJlc29sdmUob3B0cy53b3Jrc3BhY2VEaXIsIHBsaW5rRW52LnN5bWxpbmtEaXJOYW1lKTtcbiAgICAvLyBwYXRoc0RpcnMucHVzaChQYXRoLnJlc29sdmUob3B0cy53b3Jrc3BhY2VEaXIsICdub2RlX21vZHVsZXMnKSk7XG4gICAgcGF0aHNEaXJzLnB1c2goLi4uY2FsY05vZGVQYXRocyhwbGlua0Vudi5yb290RGlyLCBzeW1saW5rc0RpcixcbiAgICAgIG9wdHMud29ya3NwYWNlRGlyIHx8IHBsaW5rRW52LndvcmtEaXIsIHBsaW5rRW52LnBsaW5rRGlyKSk7XG5cbiAgICB3c0tleSA9IHdvcmtzcGFjZUtleShvcHRzLndvcmtzcGFjZURpcik7XG4gICAgd3NTdGF0ZSA9IGdldFN0YXRlKCkud29ya3NwYWNlcy5nZXQod3NLZXkpO1xuICB9XG5cbiAgaWYgKG9wdHMuZXh0cmFOb2RlUGF0aCAmJiBvcHRzLmV4dHJhTm9kZVBhdGgubGVuZ3RoID4gMCkge1xuICAgIHBhdGhzRGlycy5wdXNoKC4uLm9wdHMuZXh0cmFOb2RlUGF0aCk7XG4gIH1cblxuICBwYXRoc0RpcnMgPSBfLnVuaXEocGF0aHNEaXJzKTtcblxuICBpZiAob3B0cy5ub1N5bWxpbmtzICYmIHN5bWxpbmtzRGlyKSB7XG4gICAgY29uc3QgaWR4ID0gcGF0aHNEaXJzLmluZGV4T2Yoc3ltbGlua3NEaXIpO1xuICAgIGlmIChpZHggPj0gMCkge1xuICAgICAgcGF0aHNEaXJzLnNwbGljZShpZHgsIDEpO1xuICAgIH1cbiAgfVxuXG4gIGlmIChQYXRoLmlzQWJzb2x1dGUoYmFzZVVybCkpIHtcbiAgICBsZXQgcmVsQmFzZVVybCA9IFBhdGgucmVsYXRpdmUodHNjb25maWdEaXIsIGJhc2VVcmwpO1xuICAgIGlmICghcmVsQmFzZVVybC5zdGFydHNXaXRoKCcuJykpXG4gICAgICByZWxCYXNlVXJsID0gJy4vJyArIHJlbEJhc2VVcmw7XG4gICAgYmFzZVVybCA9IHJlbEJhc2VVcmw7XG4gIH1cblxuICBpZiAoYXNzaWduZWVPcHRpb25zLnBhdGhzID09IG51bGwpXG4gICAgYXNzaWduZWVPcHRpb25zLnBhdGhzID0ge307XG5cbiAgaWYgKG9wdHMud29ya3NwYWNlRGlyKSB7XG4gICAgYXNzaWduZWVPcHRpb25zLnBhdGhzWydwYWNrYWdlLXNldHRpbmdzJ10gPSBbXG4gICAgICBQYXRoLnJlbGF0aXZlKGJhc2VVcmxBYnNQYXRoLCBQYXRoLmpvaW4ocGxpbmtFbnYuZGlzdERpciwgd3NLZXkgKyAnLnBhY2thZ2Utc2V0dGluZ3MnKSlcbiAgICAgICAgLnJlcGxhY2UoL1xcXFwvZywgJy8nKVxuICAgIF07XG4gIH1cbiAgaWYgKHdzU3RhdGUpIHtcbiAgICBhc3NpZ25TcGVjaWFsUGF0aHMod3NTdGF0ZS5pbnN0YWxsSnNvbi5kZXBlbmRlbmNpZXMsIHBhdGhzRGlycywgYXNzaWduZWVPcHRpb25zLCBiYXNlVXJsQWJzUGF0aCk7XG4gICAgYXNzaWduU3BlY2lhbFBhdGhzKHdzU3RhdGUuaW5zdGFsbEpzb24uZGV2RGVwZW5kZW5jaWVzLCBwYXRoc0RpcnMsIGFzc2lnbmVlT3B0aW9ucywgYmFzZVVybEFic1BhdGgpO1xuICAgIGFzc2lnblNwZWNpYWxQYXRocyh3c1N0YXRlLmluc3RhbGxKc29uLnBlZXJEZXBlbmRlbmNpZXMsIHBhdGhzRGlycywgYXNzaWduZWVPcHRpb25zLCBiYXNlVXJsQWJzUGF0aCk7XG4gIH1cbiAgLy8gaWYgKG9wdHMud29ya3NwYWNlRGlyICE9IG51bGwpIHtcbiAgLy8gICBhc3NpZ25lZU9wdGlvbnMucGF0aHNbJ19wYWNrYWdlLXNldHRpbmdzJ10gPSBbXG4gIC8vICAgICBQYXRoLnJlbGF0aXZlKGJhc2VVcmxBYnNQYXRoLCBvcHRzLndvcmtzcGFjZURpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpICsgJy9fcGFja2FnZS1zZXR0aW5ncyddO1xuICAvLyB9XG5cbiAgYXNzaWduZWVPcHRpb25zLmJhc2VVcmwgPSBiYXNlVXJsLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcblxuICBpZiAoYXNzaWduZWVPcHRpb25zLnBhdGhzWycqJ10gPT0gbnVsbClcbiAgICBhc3NpZ25lZU9wdGlvbnMucGF0aHNbJyonXSA9IFtdIGFzIHN0cmluZ1tdO1xuICBjb25zdCB3aWxkY2FyZFBhdGhzOiBzdHJpbmdbXSA9IGFzc2lnbmVlT3B0aW9ucy5wYXRoc1snKiddO1xuXG4gIGZvciAoY29uc3QgZGlyIG9mIHBhdGhzRGlycykge1xuICAgIGNvbnN0IHJlbGF0aXZlRGlyID0gUGF0aC5yZWxhdGl2ZShiYXNlVXJsQWJzUGF0aCwgZGlyKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgLy8gSU1QT1JUQU5UOiBgQHR5cGUvKmAgbXVzdCBiZSBwcmlvIHRvIGAvKmAsIGZvciB0aG9zZSBwYWNrYWdlcyBoYXZlIG5vIHR5cGUgZGVmaW5pbnRpb25cbiAgICB3aWxkY2FyZFBhdGhzLnB1c2goUGF0aC5qb2luKHJlbGF0aXZlRGlyLCAnQHR5cGVzLyonKS5yZXBsYWNlKC9cXFxcL2csICcvJykpO1xuICAgIHdpbGRjYXJkUGF0aHMucHVzaChQYXRoLmpvaW4ocmVsYXRpdmVEaXIsICcqJykucmVwbGFjZSgvXFxcXC9nLCAnLycpKTtcbiAgfVxuICBhc3NpZ25lZU9wdGlvbnMucGF0aHNbJyonXSA9IF8udW5pcSh3aWxkY2FyZFBhdGhzKTtcbiAgYXBwZW5kVHlwZVJvb3RzKHBhdGhzRGlycywgdHNjb25maWdEaXIsIGFzc2lnbmVlT3B0aW9ucywgb3B0cyk7XG5cbiAgcmV0dXJuIGFzc2lnbmVlT3B0aW9ucyBhcyBDb21waWxlck9wdGlvbnM7XG59XG5cbi8qKlxuICogRm9yIHRob3NlIHNwZWNpYWwgc2NvcGVkIHBhY2thZ2Ugd2hpY2ggaXMgbGlrZSBAbG9hZGFibGUvY29tcG9uZW50LCBpdHMgdHlwZSBkZWZpbml0aW9uIHBhY2thZ2UgaXNcbiAqIEB0eXBlcy9sb2FkYWJsZV9fY29tcG9uZW50XG4gKi9cbmZ1bmN0aW9uIGFzc2lnblNwZWNpYWxQYXRocyhkZXBlbmRlbmNpZXM6IHtbZGVwOiBzdHJpbmddOiBzdHJpbmd9IHwgdW5kZWZpbmVkLFxuICBub2RlUGF0aHM6IEl0ZXJhYmxlPHN0cmluZz4sXG4gIGFzc2lnbmVlT3B0aW9uczogUGFydGlhbDxDb21waWxlck9wdGlvbnM+LCBhYnNCYXNlVXJsUGF0aDogc3RyaW5nKSB7XG4gIGlmIChkZXBlbmRlbmNpZXMgPT0gbnVsbClcbiAgICByZXR1cm47XG5cbiAgLy8gaWYgKGFzc2lnbmVlT3B0aW9ucy5wYXRocyA9PSBudWxsKVxuICAvLyAgIGFzc2lnbmVlT3B0aW9ucy5wYXRocyA9IHt9O1xuICBmb3IgKGNvbnN0IGl0ZW0gb2YgT2JqZWN0LmtleXMoZGVwZW5kZW5jaWVzKSkge1xuICAgIGNvbnN0IG0gPSAvXkB0eXBlc1xcLyguKj8pX18oLio/KSQvLmV4ZWMoaXRlbSk7XG4gICAgaWYgKG0pIHtcbiAgICAgIGNvbnN0IG9yaWdpblBrZ05hbWUgPSBgQCR7bVsxXX0vJHttWzJdfWA7XG4gICAgICBjb25zdCBleGFjdE9uZTogc3RyaW5nW10gPSBhc3NpZ25lZU9wdGlvbnMucGF0aHMhW29yaWdpblBrZ05hbWVdID0gW107XG4gICAgICBjb25zdCB3aWxkT25lOiBzdHJpbmdbXSA9IGFzc2lnbmVlT3B0aW9ucy5wYXRocyFbb3JpZ2luUGtnTmFtZSArICcvKiddID0gW107XG4gICAgICBmb3IgKGNvbnN0IGRpciBvZiBub2RlUGF0aHMpIHtcbiAgICAgICAgY29uc3QgcmVsYXRpdmVEaXIgPSBQYXRoLnJlbGF0aXZlKGFic0Jhc2VVcmxQYXRoLCBkaXIgKyAnLycgKyBpdGVtKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gICAgICAgIGV4YWN0T25lLnB1c2gocmVsYXRpdmVEaXIpO1xuICAgICAgICB3aWxkT25lLnB1c2gocmVsYXRpdmVEaXIgKyAnLyonKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZnVuY3Rpb24gcGF0aE1hcHBpbmdGb3JMaW5rZWRQa2dzKGJhc2VVcmxBYnNQYXRoOiBzdHJpbmcpIHtcbiAgbGV0IGRyY3BEaXIgPSAoZ2V0U3RhdGUoKS5saW5rZWREcmNwIHx8IGdldFN0YXRlKCkuaW5zdGFsbGVkRHJjcCkhLnJlYWxQYXRoO1xuXG4gIGNvbnN0IHBhdGhNYXBwaW5nOiB7W2tleTogc3RyaW5nXTogc3RyaW5nW119ID0ge307XG5cbiAgZm9yIChjb25zdCBbbmFtZSwge3JlYWxQYXRofV0gb2YgZ2V0U3RhdGUoKS5zcmNQYWNrYWdlcy5lbnRyaWVzKCkgfHwgW10pIHtcbiAgICBjb25zdCByZWFsRGlyID0gUGF0aC5yZWxhdGl2ZShiYXNlVXJsQWJzUGF0aCwgcmVhbFBhdGgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICBwYXRoTWFwcGluZ1tuYW1lXSA9IFtyZWFsRGlyXTtcbiAgICBwYXRoTWFwcGluZ1tuYW1lICsgJy8qJ10gPSBbcmVhbERpciArICcvKiddO1xuICB9XG5cbiAgLy8gaWYgKHBrZ05hbWUgIT09ICdAd2ZoL3BsaW5rJykge1xuICBkcmNwRGlyID0gUGF0aC5yZWxhdGl2ZShiYXNlVXJsQWJzUGF0aCwgZHJjcERpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICBwYXRoTWFwcGluZ1snQHdmaC9wbGluayddID0gW2RyY3BEaXJdO1xuICBwYXRoTWFwcGluZ1snQHdmaC9wbGluay8qJ10gPSBbZHJjcERpciArICcvKiddO1xuICByZXR1cm4gcGF0aE1hcHBpbmc7XG59XG5cbi8qKlxuICogXG4gKiBAcGFyYW0gcGF0aHNEaXJzIE5vZGUgcGF0aCBsaWtlIHBhdGggaW5mb3JtYXRpb25cbiAqIEBwYXJhbSB0c2NvbmZpZ0RpciBcbiAqIEBwYXJhbSBhc3NpZ25lZU9wdGlvbnMgXG4gKiBAcGFyYW0gb3B0cyBcbiAqL1xuZnVuY3Rpb24gYXBwZW5kVHlwZVJvb3RzKHBhdGhzRGlyczogc3RyaW5nW10sIHRzY29uZmlnRGlyOiBzdHJpbmcsIGFzc2lnbmVlT3B0aW9uczogUGFydGlhbDxDb21waWxlck9wdGlvbnM+LFxuICBvcHRzOiBDb21waWxlck9wdGlvblNldE9wdCkge1xuXG4gIGlmICghb3B0cy5ub1R5cGVSb290c0luUGFja2FnZXMpIHtcbiAgICBpZiAoYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyA9PSBudWxsKVxuICAgICAgYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyA9IFtdO1xuICAgIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMucHVzaChcbiAgICAgIFBhdGgucmVsYXRpdmUodHNjb25maWdEaXIsIFBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi90eXBlcycpKS5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4gICAgICAuLi50eXBlUm9vdHNJblBhY2thZ2VzKG9wdHMud29ya3NwYWNlRGlyKS5tYXAoZGlyID0+IFBhdGgucmVsYXRpdmUodHNjb25maWdEaXIsIGRpcikucmVwbGFjZSgvXFxcXC9nLCAnLycpKVxuICAgICk7XG4gIH1cblxuICBpZiAob3B0cy5lbmFibGVUeXBlUm9vdHMgKSB7XG4gICAgaWYgKGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMgPT0gbnVsbClcbiAgICAgIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMgPSBbXTtcbiAgICBhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzLnB1c2goLi4ucGF0aHNEaXJzLm1hcChkaXIgPT4ge1xuICAgICAgY29uc3QgcmVsYXRpdmVEaXIgPSBQYXRoLnJlbGF0aXZlKHRzY29uZmlnRGlyLCBkaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcbiAgICAgIHJldHVybiByZWxhdGl2ZURpciArICcvQHR5cGVzJztcbiAgICB9KSk7XG4gIH1cblxuICBpZiAob3B0cy5leHRyYVR5cGVSb290KSB7XG4gICAgaWYgKGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMgPT0gbnVsbClcbiAgICAgIGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMgPSBbXTtcbiAgICBhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzLnB1c2goLi4ub3B0cy5leHRyYVR5cGVSb290Lm1hcChcbiAgICAgIGRpciA9PiBQYXRoLnJlbGF0aXZlKHRzY29uZmlnRGlyLCBkaXIpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSkpO1xuICB9XG5cbiAgYXNzaWduZWVPcHRpb25zLnR5cGVSb290cyA9IF8udW5pcShhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzKTtcbiAgaWYgKGFzc2lnbmVlT3B0aW9ucy50eXBlUm9vdHMgIT0gbnVsbCAmJiBhc3NpZ25lZU9wdGlvbnMudHlwZVJvb3RzLmxlbmd0aCA9PT0gMClcbiAgICBkZWxldGUgYXNzaWduZWVPcHRpb25zLnR5cGVSb290cztcbn1cblxuZnVuY3Rpb24gdHlwZVJvb3RzSW5QYWNrYWdlcyhvbmx5SW5jbHVkZVdvcmtzcGFjZT86IHN0cmluZykge1xuICAvLyBjb25zdCB7Z2V0U3RhdGUsIHdvcmtzcGFjZUtleX06IHR5cGVvZiBfcGtnTWdyID0gcmVxdWlyZSgnLi9wYWNrYWdlLW1ncicpO1xuICBjb25zdCB3c0tleXMgPSBvbmx5SW5jbHVkZVdvcmtzcGFjZSA/IFt3b3Jrc3BhY2VLZXkob25seUluY2x1ZGVXb3Jrc3BhY2UpXSA6IGdldFN0YXRlKCkud29ya3NwYWNlcy5rZXlzKCk7XG4gIGNvbnN0IGRpcnM6IHN0cmluZ1tdID0gW107XG4gIGZvciAoY29uc3Qgd3NLZXkgb2Ygd3NLZXlzKSB7XG4gICAgZm9yIChjb25zdCBwa2cgb2YgcGFja2FnZXM0V29ya3NwYWNlS2V5KHdzS2V5KSkge1xuICAgICAgY29uc3QgdHlwZVJvb3QgPSBwa2cuanNvbi5wbGluayA/IHBrZy5qc29uLnBsaW5rLnR5cGVSb290IDogcGtnLmpzb24uZHIgPyBwa2cuanNvbi5kci50eXBlUm9vdCA6IG51bGw7XG4gICAgICBpZiAodHlwZVJvb3QpIHtcbiAgICAgICAgY29uc3QgZGlyID0gUGF0aC5yZXNvbHZlKHBrZy5yZWFsUGF0aCwgdHlwZVJvb3QpO1xuICAgICAgICBkaXJzLnB1c2goZGlyKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRpcnM7XG59XG4iXX0=