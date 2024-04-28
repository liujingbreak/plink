import { ReactorComposite2, SingleActionFactory } from '../../../packages/reactivizer';
import { RepoPackageJson } from './package-mgr2-model';
import { PackageJsonInterf } from './package-mgr2-utils';
import type { NpmOptions, PackageInfo } from './index';
type PackageMgrActions = {
    /** scan current project,
     * Related by actions: rootPackageJson
     **/
    scan(rootDir: string): SingleActionFactory;
    /** Create symlinks and install dependency */
    syncWorkspace(spaceDir: string, npmOpts?: NpmOptions): SingleActionFactory;
};
interface PackagesInternalSteps {
    checkSpace(spaceKey: string): SingleActionFactory;
    didRemoveSymlink(link: string): SingleActionFactory;
    didScanSource(): SingleActionFactory;
    didPackagesScan(changedOrAdded: PackageInfo[], deleted: PackageInfo[]): SingleActionFactory;
    didCheckSpace(spacePackageJson: PackageJsonInterf): SingleActionFactory;
    didSwitchSpace(spaceKey: string, symlinksToSpace: string[], actuallyCreated: string[], tsconfiFileWritten: number): SingleActionFactory;
    doAllSymlinks(): SingleActionFactory;
    didAllSymlinks(countCreated: number, countDeleted: number): SingleActionFactory;
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
    repoPkgJson(projKey: string, json: RepoPackageJson): SingleActionFactory;
    /** @param dirs each directory string must ends with path.sep */
    repoNoModuleSymlinkDirs(projDir: string, dirs: string[]): SingleActionFactory;
    rootDir(dir: string): SingleActionFactory;
    onProjectLinked(projDir: string): SingleActionFactory;
    onDirLinked(dir: string): SingleActionFactory;
    onNotifiableError(content: string): SingleActionFactory;
    linkedDrcp(pkgInfo: PackageInfo | null): SingleActionFactory;
    installedDrcp(pkgInfo: PackageInfo | null): SingleActionFactory;
}
declare const service: import("../../../packages/reactivizer").ReactorCompositeMergeType2<ReactorComposite2<PackageMgrActions, PackageMgrEvents, readonly ["scan"], readonly ["rootPackageJson", "rootDir", "linkedDrcp", "installedDrcp"]>, import("./package-mgr2-model").PackageManager2ModelAction, import("./package-mgr2-model").PackageManager2ModuleEvent, readonly ["updateCurrentSpace"], readonly []>, spaceDependencyMap: Map<string, Set<string>>, spacePkgMap: Map<string, Set<string>>, allPackages: Map<string, PackageInfo>, projPkgMap: Map<string, Set<string>>;
export { spaceDependencyMap, service, allPackages, spacePkgMap, projPkgMap };
