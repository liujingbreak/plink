import {getState, pathToProjKey, workspaceKey, PackageInfo} from './index';
import Path from 'path';
import {calcNodePaths} from '../node-path-calc';
import _ from 'lodash';
import {getLogger} from 'log4js';
import {plinkEnv} from '../utils/misc';
import ts from 'typescript';
import fs from 'fs';

export type PackageType = '*' | 'build' | 'core';
const log = getLogger('plink.package-list-helper');

export function* allPackages(_types?: PackageType | PackageType[],
  recipeType?: 'src' | 'installed', projectDirs?: string[]): Generator<PackageInfo> {

  if (recipeType !== 'installed') {
    if (projectDirs) {
      for (const projectDir of projectDirs) {
        const projKey = pathToProjKey(projectDir);
        const pkgNames = getState().project2Packages.get(projKey);
        if (pkgNames == null)
          return;
        for (const pkgName of pkgNames) {
          const pkg = getState().srcPackages.get(pkgName);
          if (pkg) {
            yield pkg;
          }
        }
      }
    } else {
      for (const pkg of getState().srcPackages.values()) {
        yield pkg;
      }
    }
  }
  if (recipeType !== 'src') {
    for (const ws of getState().workspaces.values()) {
      const installed = ws.installedComponents;
      if (installed) {
        for (const comp of installed.values()) {
          yield comp;
        }
      }
    }
  }
}

export function* packages4WorkspaceKey(wsKey: string, includeInstalled = true): Generator<PackageInfo> {
  const ws = getState().workspaces.get(wsKey);
  if (!ws)
    return;

  const linked = getState().srcPackages;
  const installed = ws.installedComponents;
  const avoidDuplicateSet = new Set<string>();
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

export function packages4Workspace(workspaceDir?: string, includeInstalled = true) {
  const wsKey = workspaceKey(workspaceDir || plinkEnv.workDir);
  return packages4WorkspaceKey(wsKey, includeInstalled);
}

/**
 * @returns a map of workspace keys of which has specified dependency
 */
export function workspacesOfDependencies(...depPkgNames: string[]) {
  const deps = new Set(depPkgNames);
  const wsKeys = new Set<string>();
  for (const [key, wsState] of getState().workspaces.entries()) {
    for (const [pkgName] of wsState.linkedDependencies.concat(wsState.linkedDevDependencies)) {
      if (deps.has(pkgName)) {
        wsKeys.add(key);
      }
    }
    for (const [pkgName] of wsState.installedComponents?.keys() || []) {
      if (deps.has(pkgName)) {
        wsKeys.add(key);
      }
    }
  }
  return wsKeys;
}

export interface CompilerOptionSetOpt {
  /** Will add typeRoots property for specific workspace, and add paths of file "package-settings.d.ts" */
  workspaceDir?: string;
  /** Add real path of all link package to "paths" property */
  realPackagePaths?: boolean;
  enableTypeRoots?: boolean;
  noTypeRootsInPackages?: boolean;
  /** Default false, Do not include linked package symlinks directory in path*/
  noSymlinks?: boolean;
  extraNodePath?: string[];
  extraTypeRoot?: string[];
}

export interface CompilerOptions {
  baseUrl: string;
  typeRoots: string[];
  paths?: { [path: string]: string[]};
  [prop: string]: ts.CompilerOptionsValue;
}

/**
 * Set "baseUrl", "paths" and "typeRoots" property relative to tsconfigDir, process.cwd()
 * and process.env.NODE_PATHS
 * @param tsconfigDir project directory where tsconfig file is (virtual),
 * "baseUrl", "typeRoots" is relative to this parameter
 * @param baseUrl compiler option "baseUrl", "paths" will be relative to this paremter
 * @param assigneeOptions 
 * @param opts CompilerOptionSetOpt
 */
export function setTsCompilerOptForNodePath(
  tsconfigDir: string,
  baseUrl = './',
  assigneeOptions: Partial<CompilerOptions>,
  opts: CompilerOptionSetOpt = {enableTypeRoots: false}) {

  // const {rootDir, plinkDir, symlinkDirName} = JSON.parse(process.env.__plink!) as PlinkEnv;
  let symlinksDir: string | undefined;
  /** for paths mapping "*" */
  let pathsDirs: string[] = [];
  // workspace node_modules should be the first
  const baseUrlAbsPath = Path.resolve(tsconfigDir, baseUrl);

  if (opts.realPackagePaths) {
    if (assigneeOptions.paths == null) {
      assigneeOptions.paths = {};
    }
    Object.assign(assigneeOptions.paths, pathMappingForLinkedPkgs(baseUrlAbsPath));
  }

  // let wsState: WorkspaceState | undefined;
  let wsKey: string | undefined;
  if (opts.workspaceDir != null) {
    symlinksDir = Path.resolve(opts.workspaceDir, plinkEnv.symlinkDirName);
    pathsDirs.push(...calcNodePaths(plinkEnv.rootDir, symlinksDir,
      opts.workspaceDir || plinkEnv.workDir, plinkEnv.plinkDir));

    wsKey = workspaceKey(opts.workspaceDir);
    // wsState = getState().workspaces.get(wsKey);
  }

  if (opts.extraNodePath && opts.extraNodePath.length > 0) {
    pathsDirs.push(...opts.extraNodePath);
  }

  pathsDirs = _.uniq(pathsDirs);

  if (opts.noSymlinks && symlinksDir) {
    const idx = pathsDirs.indexOf(symlinksDir);
    if (idx >= 0) {
      pathsDirs.splice(idx, 1);
    }
  }

  if (Path.isAbsolute(baseUrl)) {
    let relBaseUrl = Path.relative(tsconfigDir, baseUrl);
    if (!relBaseUrl.startsWith('.'))
      relBaseUrl = './' + relBaseUrl;
    baseUrl = relBaseUrl;
  }

  if (assigneeOptions.paths == null)
    assigneeOptions.paths = {};

  if (opts.workspaceDir) {
    assigneeOptions.paths['package-settings'] = [
      Path.relative(baseUrlAbsPath, Path.join(plinkEnv.distDir, wsKey + '.package-settings'))
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

  return assigneeOptions as CompilerOptions;
}

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

function pathMappingForLinkedPkgs(baseUrlAbsPath: string) {
  let drcpDir = (getState().linkedDrcp || getState().installedDrcp)!.realPath;

  const pathMapping: {[key: string]: string[]} = {};

  for (const [name, {realPath}] of getState().srcPackages.entries() || []) {
    const realDir = Path.relative(baseUrlAbsPath, realPath).replace(/\\/g, '/');
    pathMapping[name] = [realDir];
    pathMapping[name + '/*'] = [realDir + '/*'];
  }

  // if (pkgName !== '@wfh/plink') {
  drcpDir = Path.relative(baseUrlAbsPath, drcpDir).replace(/\\/g, '/');
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
export function appendTypeRoots(pathsDirs: string[], tsconfigDir: string, assigneeOptions: Partial<CompilerOptions>,
  opts: CompilerOptionSetOpt) {
  if (opts.noTypeRootsInPackages == null || !opts.noTypeRootsInPackages) {
    if (assigneeOptions.typeRoots == null)
      assigneeOptions.typeRoots = [];
    assigneeOptions.typeRoots.push(
      // plink directory: wfh/types, it is a symlink at runtime, due to Plink uses preserve-symlinks to run commands
      Path.relative(tsconfigDir, fs.realpathSync(Path.resolve(__dirname, '../../types'))).replace(/\\/g, '/'),
      ...typeRootsInPackages(opts.workspaceDir).map(dir => Path.relative(tsconfigDir, dir).replace(/\\/g, '/'))
    );
  }

  if (opts.enableTypeRoots ) {
    if (assigneeOptions.typeRoots == null)
      assigneeOptions.typeRoots = [];
    assigneeOptions.typeRoots.push(...pathsDirs.map(dir => {
      const relativeDir = Path.relative(tsconfigDir, dir).replace(/\\/g, '/');
      return relativeDir + '/@types';
    }));
  }

  if (opts.extraTypeRoot) {
    if (assigneeOptions.typeRoots == null)
      assigneeOptions.typeRoots = [];
    assigneeOptions.typeRoots.push(...opts.extraTypeRoot.map(
      dir => Path.relative(tsconfigDir, dir).replace(/\\/g, '/')));
  }

  assigneeOptions.typeRoots = _.uniq(assigneeOptions.typeRoots);
  if (assigneeOptions.typeRoots != null && assigneeOptions.typeRoots.length === 0)
    delete assigneeOptions.typeRoots;
}

function typeRootsInPackages(onlyIncludeWorkspace?: string) {
  // const {getState, workspaceKey}: typeof _pkgMgr = require('./package-mgr');
  const wsKeys = onlyIncludeWorkspace ? [workspaceKey(onlyIncludeWorkspace)] : getState().workspaces.keys();
  const dirs: string[] = [];
  for (const wsKey of wsKeys) {
    for (const pkg of packages4WorkspaceKey(wsKey)) {
      const typeRoot = pkg.json.plink ? pkg.json.plink.typeRoot : pkg.json.dr ? pkg.json.dr.typeRoot : null;
      if (typeRoot) {
        const dir = Path.resolve(pkg.realPath, typeRoot);
        dirs.push(dir);
      }
    }
  }
  return dirs;
}
