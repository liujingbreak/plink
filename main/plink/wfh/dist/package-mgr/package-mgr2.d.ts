import { ReactorComposite2, SingleActionFactory } from '@wfh/reactivizer';
import { RepoPackageJson } from './package-mgr2-model';
import { PackageJsonInterf } from './package-mgr2-utils';
import type { PackageInfo } from './index';
type PackageMgrActions = {
    /** scan current project,
     * Related by actions: rootPackageJson
     **/
    scan(rootDir: string): SingleActionFactory;
    /** Create symlinks and install dependency */
    runInstall(spaceKey: string): SingleActionFactory;
};
interface PackagesInternalSteps {
    checkSpace(spaceKey: string): SingleActionFactory;
    /** Respond to switchToSpace  */
    didRemoveSymlink(link: string): SingleActionFactory;
    didScanSource(): SingleActionFactory;
    didPackagesScan(changedOrAdded: PackageInfo[], deleted: PackageInfo[]): SingleActionFactory;
    didSyncSpacePackages(): SingleActionFactory;
    didCheckSpace(key: string, spacePackageJson: PackageJsonInterf): SingleActionFactory;
    didSwitchSpace(spaceKey: string, symlinksToSpace: string[], actuallyCreated: string[], workspaceCount: number, tsconfiFileWritten: number): SingleActionFactory;
    didRunInstall(spaceKey: string): SingleActionFactory;
}
/** Intercept these messages to replace with virtual file operations, in case we need to test or for "dry run" */
interface PackageMgrFileEvents {
    createOrChangeSymlink(linkTarget: string, link: string): SingleActionFactory;
    /** @return false in case symlink already exists or other reason (but not include errors) */
    didSymlinkCreation(success: boolean): SingleActionFactory;
    writeFile(file: string, content: string): SingleActionFactory;
    /** Relates to writeFile */
    didWriteFile(): SingleActionFactory;
}
interface PackageMgrEvents extends PackagesInternalSteps, PackageMgrFileEvents {
    /** related to input action "scan" */
    onScanCompleted(): SingleActionFactory;
    onSpaceSynced(spaceKey: string): SingleActionFactory;
    rootPackageJson(json: RepoPackageJson): SingleActionFactory;
    /** @param dirs each directory string must ends with path.sep */
    repoNoModuleSymlinkDirs(projDir: string, dirs: string[]): SingleActionFactory;
    rootDir(dir: string): SingleActionFactory;
    onProjectLinked(projDir: string): SingleActionFactory;
    /** Associate an external dirctory which contains source packages */
    onDirLinked(dir: string): SingleActionFactory;
    onNotifiableError(content: string): SingleActionFactory;
    linkedDrcp(pkgInfo: PackageInfo | null): SingleActionFactory;
    installedDrcp(pkgInfo: PackageInfo | null): SingleActionFactory;
}
declare const inputTableFor: readonly ["scan"];
declare const outputTableFor: readonly ["rootPackageJson", "rootDir", "linkedDrcp", "installedDrcp"];
export type PackageMgrServiceType = ReactorComposite2<PackageMgrActions, PackageMgrEvents, typeof inputTableFor, typeof outputTableFor>;
export declare function createPackageMgrService(): import("@wfh/reactivizer").ReactorCompositeExtendType<import("@wfh/reactivizer").ReactorCompositeExtendType<ReactorComposite2<PackageMgrActions, PackageMgrEvents, readonly ["scan"], readonly ["rootPackageJson", "rootDir", "linkedDrcp", "installedDrcp"]>, import("./package-mgr2-model").PackageMgrModelInput, import("./package-mgr2-model").PackageMgr2ModuleOutput, readonly ["switchToSpace"], readonly ["data_spacePkgMap", "data_spaceDependencyMap", "data_allPackages", "data_projPkgMap"]>, import("./package-mgr2-switch").PackageMgr2SpaceSwitchActions, import("./package-mgr2-switch").PackageMgr2SpaceSwitchEvents, [], []>;
export {};
