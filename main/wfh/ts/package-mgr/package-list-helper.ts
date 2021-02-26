import {getState, pathToProjKey, workspaceKey, PackageInfo} from './index';
import Path from 'path';
import {PlinkEnv, calcNodePaths} from '../node-path';
import _ from 'lodash';
import {getLogger} from 'log4js';

export type PackageType = '*' | 'build' | 'core';
const log = getLogger('plink.package-list-helper');

export function* allPackages(_types?: PackageType | PackageType[],
  recipeType?: 'src' | 'installed', projectDirs?: string[]): Generator<PackageInfo> {

  // const wsKey = pathToWorkspace(process.cwd());

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

export function packages4Workspace(workspaceDir?: string, includeInstalled = true) {
  const wsKey = workspaceKey(workspaceDir || process.cwd());
  return packages4WorkspaceKey(wsKey, includeInstalled);
}

export interface CompilerOptionSetOpt {
  /** Will add typeRoots property for specific workspace, and add paths of file "_package-settings.d.ts" */
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
  paths: {[path: string]: string[]};
  [key: string]: any;
}
/**
 * Set "baseUrl", "paths" and "typeRoots" property relative to tsconfigDir, process.cwd()
 * and process.env.NODE_PATHS
 * @param tsconfigDir project directory where tsconfig file is (virtual),
 * "baseUrl", "typeRoots" is relative to this parameter
 * @param baseUrl compiler option "baseUrl", "paths" will be relative to this paremter
 * @param assigneeOptions 
 */
export function setTsCompilerOptForNodePath(
  tsconfigDir: string,
  baseUrl = './',
  assigneeOptions: Partial<CompilerOptions>,
  opts: CompilerOptionSetOpt = {enableTypeRoots: false}) {

  const {rootDir, plinkDir} = JSON.parse(process.env.__plink!) as PlinkEnv;
  let symlinksDir: string | undefined;
  let pathsDirs: string[] = [];
  // workspace node_modules should be the first
  if (opts.workspaceDir != null) {
    symlinksDir = Path.resolve(opts.workspaceDir, '.links');
    // pathsDirs.push(Path.resolve(opts.workspaceDir, 'node_modules'));
    pathsDirs.push(...calcNodePaths(rootDir, symlinksDir, opts.workspaceDir || process.cwd(), plinkDir));
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

  const baseUrlAbsPath = Path.resolve(tsconfigDir, baseUrl);
  // if (opts.workspaceDir != null) {
  //   assigneeOptions.paths['_package-settings'] = [
  //     Path.relative(baseUrlAbsPath, opts.workspaceDir).replace(/\\/g, '/') + '/_package-settings'];
  // }

  assigneeOptions.baseUrl = baseUrl.replace(/\\/g, '/');
  if (opts.realPackagePaths) {
    Object.assign(assigneeOptions.paths, pathMappingForLinkedPkgs(baseUrlAbsPath));
  }
  if (assigneeOptions.paths['*'] == null)
    assigneeOptions.paths['*'] = [] as string[];
  const wildcardPaths: string[] = assigneeOptions.paths['*'];

  for (const dir of pathsDirs) {
    const relativeDir = Path.relative(baseUrlAbsPath, dir).replace(/\\/g, '/');
    // IMPORTANT: `@type/*` must be prio to `/*`, for those packages have no type definintion
    wildcardPaths.push(Path.join(relativeDir, '@types/*').replace(/\\/g, '/'));
    wildcardPaths.push(Path.join(relativeDir, '*').replace(/\\/g, '/'));
  }
  assigneeOptions.paths['*'] = _.uniq(wildcardPaths);
  appendTypeRoots(pathsDirs, tsconfigDir, assigneeOptions, opts);

  return assigneeOptions as CompilerOptions;
}

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
function appendTypeRoots(pathsDirs: string[], tsconfigDir: string, assigneeOptions: Partial<CompilerOptions>,
  opts: CompilerOptionSetOpt) {

  if (!opts.noTypeRootsInPackages) {
    if (assigneeOptions.typeRoots == null)
      assigneeOptions.typeRoots = [];
    assigneeOptions.typeRoots.push(
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

function typeRootsInPackages(onlyIncludeWorkspace?: string) {
  // const {getState, workspaceKey}: typeof _pkgMgr = require('./package-mgr');
  const wsKeys = onlyIncludeWorkspace ? [workspaceKey(onlyIncludeWorkspace)] : getState().workspaces.keys();
  const dirs: string[] = [];
  for (const wsKey of wsKeys) {
    for (const pkg of packages4WorkspaceKey(wsKey)) {
      if (pkg.json.dr.typeRoot) {
        const dir = Path.resolve(pkg.realPath, pkg.json.dr.typeRoot);
        dirs.push(dir);
      }
    }
  }
  return dirs;
}
