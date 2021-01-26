import {getState, pathToProjKey, workspaceKey, PackageInfo} from './index';
export type PackageType = '*' | 'build' | 'core';

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
      console.error(`Missing package ${pkName} in workspace ${wsKey}`);
    else
      yield pk;
  }
  for (const [pkName] of ws.linkedDevDependencies) {
    const pk = linked.get(pkName);
    if (pk == null)
      console.error(`Missing package ${pkName} in workspace ${wsKey}`);
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
