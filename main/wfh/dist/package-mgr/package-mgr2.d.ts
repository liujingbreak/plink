import { ReactorComposite2, SingleActionFactory } from '../../../packages/reactivizer';
import { RootPackageJson } from './package-mgr2-model';
import { NpmOptions, PackageInfo } from './index';
type PackageMgrActions = {
    /** scan current project,
     * Related by actions: rootPackageJson
     **/
    scan(rootDir: string): SingleActionFactory;
    /** Create symlinks and install dependency */
    syncWorkspace(workspace: string, npmOpts: NpmOptions): SingleActionFactory;
};
interface PackagesInternalSteps {
    checkSpace(wsKey: string): SingleActionFactory;
    createOrChangeSymlink(linkTarget: string, link: string): SingleActionFactory;
    didRemoveSymlink(link: string): SingleActionFactory;
    didScanSource(): SingleActionFactory;
    didPackagesScan(changedOrAdded: PackageInfo[], deleted: PackageInfo[]): SingleActionFactory;
    didCheckSpaces(): SingleActionFactory;
    didSymlinkCreation(): SingleActionFactory;
    didAllSymlinks(countCreated: number, countDeleted: number): SingleActionFactory;
}
interface PackageMgrEvents extends PackagesInternalSteps {
    /** related to input action "scan" */
    onScanCompleted(): SingleActionFactory;
    rootPackageJson(json: RootPackageJson): SingleActionFactory;
    rootDir(dir: string): SingleActionFactory;
    onProjectLinked(projDir: string): SingleActionFactory;
    onDirLinked(dir: string): SingleActionFactory;
    onSpacePackageRemoved(wsKey: string, packageName: string): SingleActionFactory;
}
declare const service: import("../../../packages/reactivizer").ReactorCompositeMergeType2<ReactorComposite2<PackageMgrActions, PackageMgrEvents, readonly ["scan"], readonly ["rootPackageJson", "rootDir"]>, import("./package-mgr2-model").PackageManager2ModelAction, import("./package-mgr2-model").PackageManager2ModuleEvent, readonly [], readonly []>, spacePkgMap: Map<string, Set<string>>, allPackages: Map<string, PackageInfo>;
export { spacePkgMap, service, allPackages };
