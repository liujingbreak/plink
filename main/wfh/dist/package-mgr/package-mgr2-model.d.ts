import { SingleActionFactory, ReactorComposite2 } from '../../../packages/reactivizer';
import { PackageInfo } from './index';
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
export declare function createStoreService<R extends ReactorComposite2<any, any, any, any>>(base: R): {
    projPkgMap: Map<string, string[]>;
    allPackages: Map<string, PackageInfo>;
    spacePkgMap: Map<string, Set<string>>;
    service: import("../../../packages/reactivizer").ReactorCompositeMergeType2<R, PackageManager2ModelAction, PackageManager2ModuleEvent, readonly [], readonly []>;
};
