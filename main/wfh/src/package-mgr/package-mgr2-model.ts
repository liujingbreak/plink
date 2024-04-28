import * as rx from 'rxjs';
import {SingleActionFactory, ReactorComposite2, patch, actionRelatedToAction} from '../../../packages/reactivizer';
import {PackageInfo} from './index';

export interface RepoPackageJson {
  packages: string[];
  /** Connect with another repo directory which contains a packages.json.
   * Allow dependency reference to source packages which is located outside of current monorepo
   **/
  externalRepo?: string[];
  /**
   * The directory which contains source packages.
   * Allow dependency reference to source packages which is located outside of current monorepo
   */
  externalDir?: string[];
  plink?: {
    /**
     * When syncing up space (npm install in space directory), do not create symlinks to
     * the node_modules directory for those packages which is under directories specified by this property
     */
    noModuleSymlink?: string[];
  };
}

export interface PackageManager2ModelAction {
  updateCurrentSpace(spaceKey: string | null): SingleActionFactory;
  updateBegin(): SingleActionFactory;
  addPackageToProject(proj: string, projectType: 'repo' | 'dir', pkg: PackageInfo): SingleActionFactory;
  updateDependencyOfSpace(spaceKey: string, pkgNames: string[]): SingleActionFactory;
  removeSpace(spaceKey: string): SingleActionFactory;
  addPackageToSpace(spaceKey: string, pkgName: string): SingleActionFactory;
  deletePackageOfSpace(spaceKey: string, pkgName: string): SingleActionFactory;
  updateEnd(): SingleActionFactory;
}

export interface PackageManager2ModuleEvent {
  onNewSpace(spaceKey: string): SingleActionFactory;
  onSourcPackageRemoved(pkgs: Iterable<PackageInfo>): SingleActionFactory;
  saveStateToFile(): SingleActionFactory;
}

const inputTableFor = ['updateCurrentSpace'] as const;

export function createStoreService<R extends ReactorComposite2<any, any, any, any>>(base: R) {
  const projPkgMap = new Map<string, Set<string>>();
  const allPackages = new Map<string, PackageInfo>();
  const spaceDependencyMap = new Map<string, Set<string>>();
  const spacePkgMap = new Map<string, Set<string>>();

  const service = patch<PackageManager2ModelAction, PackageManager2ModuleEvent, typeof inputTableFor>({
    debugExcludeTypes: ['addPackageToProject', 'addPackageToSpace', 'updateDependencyOfSpace'],
    inputTableFor
  }, service => {
    const {i, o, r} = service;

    r('updateBegin, addPackageToProject, updateEnd ->', i.pt.updateBegin.pipe(
      rx.concatMap(([m]) => {
        const useless = new Map(allPackages);
        projPkgMap.clear();
        return i.pt.addPackageToProject.pipe(
          actionRelatedToAction(m),
          rx.map(([, proj, type, pkg]) => {
            const pkgsStore = projPkgMap.get(proj);
            allPackages.set(pkg.name, pkg);
            useless.delete(pkg.name);
            if (pkgsStore) {
              pkgsStore.add(pkg.name);
            } else {
              projPkgMap.set(proj, new Set([pkg.name]));
            }
          }),
          rx.takeUntil(i.pt.updateEnd.pipe(
            actionRelatedToAction(m)
          )),
          rx.count(),
          rx.map(() => {
            if (useless.size > 0) {
              o.ft.onSourcPackageRemoved(useless.values()).dp(m.r as number);
            }
          })
        );
      })
    ));

    r('updateDependencyOfSpace -> onNewSpace', i.pt.updateDependencyOfSpace.pipe(
      rx.map(([m, spaceKey, pkgNames]) => {
        let packageSet = spaceDependencyMap.get(spaceKey);
        if (packageSet == null) {
          packageSet = new Set<string>();
          spaceDependencyMap.set(spaceKey, packageSet);
          o.ft.onNewSpace(spaceKey).dp(m.r as number);
        } else {
          packageSet.clear();
        }
        pkgNames.forEach(pkgName => packageSet!.add(pkgName));
      })
    ));

    r('removeSpace', i.pt.removeSpace.pipe(
      rx.map(([, key]) => {
        spacePkgMap.delete(key);
        spaceDependencyMap.delete(key);
      })
    ));

    r('deletePackageOfSpace', i.pt.deletePackageOfSpace.pipe(
      rx.map(([m, key, pkg]) => {
        spacePkgMap.get(key)?.delete(pkg);
      })
    ));

    r('addPackageToSpace', i.pt.addPackageToSpace.pipe(
      rx.map(([, key, pkg]) => {
        let space = spacePkgMap.get(key);
        if (space == null) {
          space = new Set();
          spacePkgMap.set(key, space);
        }
        space.add(pkg);
      })
    ));

    // r('saveStateToFile', o.pt.saveStateToFile.pipe(
    //   rx.concatMap(() => {
    //     return fs.promises.writeFile();
    //   })
    // ));
    service.i.ft.updateCurrentSpace(null).dp();
  }).to(base);

  return {
    projPkgMap,
    allPackages,
    spacePkgMap,
    spaceDependencyMap,
    service
  };
}

