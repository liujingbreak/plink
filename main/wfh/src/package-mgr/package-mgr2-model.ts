import * as rx from 'rxjs';
import {SingleActionFactory, ReactorComposite2, patch, actionRelatedToAction} from '../../../packages/reactivizer';
import {PackageInfo} from './index';

export interface RootPackageJson {
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
}

export interface PackageManager2ModelAction {
  updateBegin(): SingleActionFactory;
  addPackageToProject(proj: string, projectType: 'repo' | 'dir', pkg: PackageInfo): SingleActionFactory;
  updatePackagesOfSpace(spaceKey: string, pkgNames: string[]): SingleActionFactory;
  removeSpace(spaceKey: string): SingleActionFactory;
  updateEnd(): SingleActionFactory;
}

export interface PackageManager2ModuleEvent {
  onNewSpace(spaceKey: string): SingleActionFactory;
  onSourcPackageRemoved(pkgs: Iterable<PackageInfo>): SingleActionFactory;
}

export function createStoreService<R extends ReactorComposite2<any, any, any, any>>(base: R) {
  const projPkgMap = new Map<string, string[]>();
  const allPackages = new Map<string, PackageInfo>();
  const spacePkgMap = new Map<string, Set<string>>();

  const service = patch<PackageManager2ModelAction, PackageManager2ModuleEvent>({
    debugExcludeTypes: ['addPackageToProject']
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
              pkgsStore.push(pkg.name);
            } else {
              projPkgMap.set(proj, [pkg.name]);
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

    r('updatePackagesOfSpace -> onNewSpace', i.pt.updatePackagesOfSpace.pipe(
      rx.map(([m, spaceKey, pkgNames]) => {
        let packageSet = spacePkgMap.get(spaceKey);
        if (packageSet == null) {
          packageSet = new Set<string>();
          spacePkgMap.set(spaceKey, packageSet);
          o.ft.onNewSpace(spaceKey).dp(m.r as number);
        } else {
          packageSet.clear();
        }
        pkgNames.forEach(pkgName => packageSet!.add(pkgName));
      })
    ));

    r('removeSpace', i.pt.removeSpace.pipe(
      rx.map(([, key]) => spacePkgMap.delete(key))
    ));
  }).to(base);

  return {
    projPkgMap,
    allPackages,
    spacePkgMap,
    service
  };
}

