import { SingleActionFactory, ReactorComposite2, ReactorCompositeMergeType } from '@wfh/reactivizer';
import { PackageInfo } from './index';
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
export interface PackageMgrModelInput {
    switchToSpace(spaceKeyOrDir: string | null): SingleActionFactory;
    updatePackagesBegin(): SingleActionFactory;
    addPackageToProject(proj: string, projectType: 'repo' | 'dir', pkg: PackageInfo): SingleActionFactory;
    updatePackagesEnd(): SingleActionFactory;
    updateDependencyOfSpace(spaceKey: string, pkgNames: string[]): SingleActionFactory;
    removeSpace(spaceKey: string): SingleActionFactory;
    addPackageToSpace(spaceKey: string, pkgName: string): SingleActionFactory;
    deletePackageOfSpace(spaceKey: string, pkgName: string): SingleActionFactory;
}
export interface PackageMgr2ModuleOutput {
    onNewSpace(spaceKey: string): SingleActionFactory;
    onSourcPackageRemoved(pkgs: Iterable<PackageInfo>): SingleActionFactory;
    saveStateToFile(): SingleActionFactory;
    data_allPackages(data: Map<string, PackageInfo>): SingleActionFactory;
    data_spaceDependencyMap(data: Map<string, Set<string>>): SingleActionFactory;
    data_spacePkgMap(data: Map<string, Set<string>>): SingleActionFactory;
    data_projPkgMap(data: Map<string, Set<string>>): SingleActionFactory;
}
declare const inputTableFor: readonly [];
declare const outputTableFor: readonly ["data_spacePkgMap", "data_spaceDependencyMap", "data_allPackages", "data_projPkgMap"];
export declare function createStoreService<R extends ReactorComposite2<any, any, any, any>>(base: R): {
    service: ReactorCompositeMergeType<R, ReactorComposite2<PackageMgrModelInput, PackageMgr2ModuleOutput, readonly [], readonly ["data_spacePkgMap", "data_spaceDependencyMap", "data_allPackages", "data_projPkgMap"]>>;
};
export type PackageMgr2ModelType = ReactorComposite2<PackageMgrModelInput, PackageMgr2ModuleOutput, typeof inputTableFor, typeof outputTableFor>;
export {};
