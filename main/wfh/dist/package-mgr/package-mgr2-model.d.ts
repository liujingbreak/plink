import { SingleActionFactory, ReactorComposite2 } from '../../../packages/reactivizer';
import { PackageInfo } from './index';
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
export declare function createStoreService<R extends ReactorComposite2<any, any, any, any>>(base: R): {
    projPkgMap: Map<string, Set<string>>;
    allPackages: Map<string, PackageInfo>;
    spacePkgMap: Map<string, Set<string>>;
    spaceDependencyMap: Map<string, Set<string>>;
    service: import("../../../packages/reactivizer").ReactorCompositeMergeType2<R, PackageManager2ModelAction, PackageManager2ModuleEvent, readonly ["updateCurrentSpace"], readonly []>;
};
