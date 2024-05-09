import * as rx from 'rxjs';
import {SingleActionFactory, ReactorComposite2, patch, actionRelatedToActionRelatives, actionRelatedToAction} from '@wfh/reactivizer';
import {PackageInfo} from './index';

export interface RepoPackageJson {
  packages: string[];
  workspaces?: string[];
  plink?: {
    /** Connect with another repo directory which contains a packages.json.
   * Allow dependency reference to source packages which is located outside of current monorepo
   **/
    externalRepo?: string[];
    /**
   * The directory which contains source packages.
   * Allow dependency reference to source packages which is located outside of current monorepo
   */
    externalDir?: string[];
    /**
     * When syncing up space (npm install in space directory), do not create symlinks to
     * the node_modules directory for those packages which is under directories specified by this property
     */
    noModuleSymlink?: string[];
  };
}

export interface PackageManager2ModelAction {
  switchToSpace(spaceKeyOrDir: string | null): SingleActionFactory;

  updatePackagesBegin(): SingleActionFactory;
  addPackageToProject(proj: string, projectType: 'repo' | 'dir', pkg: PackageInfo): SingleActionFactory;
  updatePackagesEnd(): SingleActionFactory;

  updateDependencyOfSpace(spaceKey: string, pkgNames: string[]): SingleActionFactory;
  removeSpace(spaceKey: string): SingleActionFactory;

  addPackageToSpace(spaceKey: string, pkgName: string): SingleActionFactory;
  deletePackageOfSpace(spaceKey: string, pkgName: string): SingleActionFactory;
}

export interface PackageManager2ModuleEvent {
  onNewSpace(spaceKey: string): SingleActionFactory;
  onSourcPackageRemoved(pkgs: Iterable<PackageInfo>): SingleActionFactory;
  saveStateToFile(): SingleActionFactory;
  data_allPackages(data: Map<string, PackageInfo>): SingleActionFactory;
  data_spaceDependencyMap(data: Map<string, Set<string>>): SingleActionFactory;
  data_spacePkgMap(data: Map<string, Set<string>>): SingleActionFactory;
  data_projPkgMap(data: Map<string, Set<string>>): SingleActionFactory;
}

const inputTableFor = ['switchToSpace'] as const;
const outputTableFor = ['data_spacePkgMap', 'data_spaceDependencyMap', 'data_allPackages', 'data_projPkgMap'] as const;

export function createStoreService<R extends ReactorComposite2<any, any, any, any>>(base: R) {
  const projPkgMap = new Map<string, Set<string>>();
  const allPackages = new Map<string, PackageInfo>();
  const spaceDependencyMap = new Map<string, Set<string>>();
  const spacePkgMap = new Map<string, Set<string>>();

  const service = patch<PackageManager2ModelAction, PackageManager2ModuleEvent, typeof inputTableFor, typeof outputTableFor>({
    debugExcludeTypes: ['addPackageToProject', 'addPackageToSpace', 'updateDependencyOfSpace'],
    inputTableFor,
    outputTableFor
  }, service => {
    const {i, o, r} = service;

    r('updatePackagesBegin, addPackageToProject, updatePackagesEnd -> data_allPackages', i.pt.updatePackagesBegin.pipe(
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
          rx.takeUntil(i.pt.updatePackagesEnd.pipe(
            actionRelatedToActionRelatives(m)
          )),
          rx.count(),
          rx.map(() => {
            if (useless.size > 0) {
              o.ft.onSourcPackageRemoved(useless.values()).dp(m.r as number);
            }
            o.ft.data_allPackages(allPackages).dp(m);
          })
        );
      })
    ));

    r('updateDependencyOfSpace -> onNewSpace, data_spaceDependencyMap', i.pt.updateDependencyOfSpace.pipe(
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
        o.ft.data_spaceDependencyMap(spaceDependencyMap).dp(m);
      })
    ));

    r('removeSpace -> [spacePkgMap], [spaceDependencyMap]', i.pt.removeSpace.pipe(
      rx.map(([m, key]) => {
        if (spacePkgMap.delete(key))
          o.ft.data_spacePkgMap(spacePkgMap).dp(m);

        if (spaceDependencyMap.delete(key))
          o.ft.data_spaceDependencyMap(spaceDependencyMap).dp(m);
      })
    ));

    r('deletePackageOfSpace', i.pt.deletePackageOfSpace.pipe(
      rx.map(([m, key, pkg]) => {
        const pkgSet = spacePkgMap.get(key);
        if (pkgSet) {
          pkgSet.delete(pkg);
          if (pkgSet.size === 0)
            spacePkgMap.delete(key);
        }
        o.ft.data_spacePkgMap(spacePkgMap).dp(m);
      })
    ));

    r('addPackageToSpace', i.pt.addPackageToSpace.pipe(
      rx.map(([m, key, pkg]) => {
        let space = spacePkgMap.get(key);
        if (space == null) {
          space = new Set();
          spacePkgMap.set(key, space);
        }
        space.add(pkg);
        o.ft.data_spacePkgMap(spacePkgMap).dp(m);
      })
    ));

    // r('saveStateToFile', o.pt.saveStateToFile.pipe(
    //   rx.concatMap(() => {
    //     return fs.promises.writeFile();
    //   })
    // ));
    i.ft.switchToSpace(null).dp();
    o.ft.data_spacePkgMap(spacePkgMap).dp();
    o.ft.data_spaceDependencyMap(spaceDependencyMap).dp();
    o.ft.data_allPackages(allPackages).dp();
    o.ft.data_projPkgMap(projPkgMap).dp();
  }).to(base);

  return {
    // projPkgMap,
    // allPackages,
    // spacePkgMap,
    // spaceDependencyMap,
    service
  };
}

