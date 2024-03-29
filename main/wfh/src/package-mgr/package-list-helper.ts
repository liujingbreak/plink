import Path from 'path';
import _ from 'lodash';
import {getLogger} from 'log4js';
import ts from 'typescript';
import {plinkEnv, getTscConfigOfPkg} from '../utils/misc';
import {calcNodePaths} from '../node-path-calc';
import {getState, pathToProjKey, workspaceKey, PackageInfo, workspaceDir} from './index';

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
  paths?: {[path: string]: string[]};
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

  if (opts.workspaceDir != null) {
    symlinksDir = Path.resolve(opts.workspaceDir, plinkEnv.symlinkDirName);
    pathsDirs.push(...calcNodePaths(plinkEnv.rootDir, symlinksDir,
      opts.workspaceDir || plinkEnv.workDir, plinkEnv.plinkDir));
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

  assigneeOptions.baseUrl = baseUrl.replace(/\\/g, '/');

  appendTypeRoots(pathsDirs, tsconfigDir, assigneeOptions, opts);

  return assigneeOptions as CompilerOptions;
}

function pathMappingForLinkedPkgs(baseUrlAbsPath: string) {
  let drcpDir = (getState().linkedDrcp || getState().installedDrcp)!.realPath;

  const pathMapping: {[key: string]: string[]} = {};

  for (const [name, {realPath, json}] of getState().srcPackages.entries() || []) {
    const tsDirs = getTscConfigOfPkg(json);
    const realDir = Path.relative(baseUrlAbsPath, realPath).replace(/\\/g, '/');
    const typeFile = json.types as string;
    const realDestDir = Path.posix.join(realDir, tsDirs.destDir);
    if (typeFile &&
        Path.posix.join(realDir, typeFile).startsWith(realDestDir + '/')) {
      // In case types file is inside compilation destination directory
      const relTypeFile = Path.basename(Path.posix.relative(tsDirs.destDir, typeFile), '.d.ts');
      const mapped = Path.join(realDir, tsDirs.srcDir, relTypeFile).replace(/\\/g, '/');
      pathMapping[name] = [mapped + '.ts', mapped + '.mts', mapped + '.cts'];
    } else if (typeFile) {
      pathMapping[name] = [typeFile ? Path.join(realDir, typeFile).replace(/\\/g, '/') : realDir];
    }

    pathMapping[`${name}/${tsDirs.destDir}/*`.replace(/\/\//g, '/')] = [`${realDir}/${tsDirs.srcDir}/*`.replace(/\/\//g, '/')];
    // pathMapping[`${name}/${tsDirs.isomDir}/*`] = [`${realDir}/${tsDirs.isomDir}/*`];
    pathMapping[name + '/*'] = [`${realDir}/*`];
  }

  // if (pkgName !== '@wfh/plink') {
  drcpDir = Path.relative(baseUrlAbsPath, drcpDir).replace(/\\/g, '/');
  pathMapping['@wfh/plink'] = [drcpDir + '/wfh/src/index.ts'];
  pathMapping['@wfh/plink/wfh/dist/*'] = [drcpDir + '/wfh/src/*'];
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
      Path.relative(tsconfigDir, Path.resolve(__dirname, '../../types')).replace(/\\/g, '/'),
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

function typeRootsInPackages(onlyIncludedWorkspace?: string) {
  // const {getState, workspaceKey}: typeof _pkgMgr = require('./package-mgr');
  const wsKeys = onlyIncludedWorkspace ? [workspaceKey(onlyIncludedWorkspace)] : getState().workspaces.keys();
  const dirs: string[] = [];
  for (const wsKey of wsKeys) {
    for (const pkg of packages4WorkspaceKey(wsKey)) {
      const typeRoot = pkg.json.plink?.typeRoot || pkg.json.dr?.typeRoot;
      if (typeRoot) {
        const dir = Path.resolve(workspaceDir(wsKey), pkg.realPath, typeRoot);
        dirs.push(dir);
      }
    }
  }
  return dirs;
}
