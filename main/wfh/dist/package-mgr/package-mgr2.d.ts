import { ReactorComposite2, SingleActionFactory, ActionTableDataType } from '../../../packages/reactivizer';
import { NpmOptions, PackageInfo, WorkspaceState } from './index';
type PackagesInput = {
    /** load project state from file */
    loadCache(): SingleActionFactory;
    /** scan current project */
    scan(): SingleActionFactory;
    /** Create symlinks and install dependency */
    syncWorkspace(workspace: string): SingleActionFactory;
};
interface PackagesChangeTable {
    npmInstallOpt(data: NpmOptions): SingleActionFactory;
    inited(d: boolean): SingleActionFactory;
    srcPackages(d: Map<string, PackageInfo>): SingleActionFactory;
    /** Key is relative path to root workspace */
    workspaces(d: Map<string, WorkspaceState>): SingleActionFactory;
    /** key of current "workspaces" */
    currWorkspace(d?: string | null): SingleActionFactory;
    project2Packages(data: Map<string, string[]>): SingleActionFactory;
    srcDir2Packages(data: Map<string, string[]>): SingleActionFactory;
    /** Drcp is the original name of Plink project */
    linkedDrcp(data?: PackageInfo | null): SingleActionFactory;
    linkedDrcpProject(data?: string | null): SingleActionFactory;
    installedDrcp(data?: PackageInfo | null): SingleActionFactory;
    gitIgnores(data: {
        [file: string]: string[];
    }): SingleActionFactory;
    isInChina(data?: boolean): SingleActionFactory;
    /** Everytime a hoist workspace state calculation is basically done, it is increased by 1 */
    workspaceUpdateChecksum(data: number): SingleActionFactory;
    packagesUpdateChecksum(data: number): SingleActionFactory;
    /** workspace key */
    lastCreatedWorkspace(data?: string): SingleActionFactory;
}
interface PackagesChanges {
    onProjectLinked(projDir: string): SingleActionFactory;
    onProjectUnlinked(projDir: string): SingleActionFactory;
    onDirLinked(dir: string): SingleActionFactory;
    onDirUnlinked(dir: string): SingleActionFactory;
    onPackageRemoved(projOrDirKey: string, pkg: PackageInfo): SingleActionFactory;
    /** package.json is changed */
    onPackageUpdated(projOrDirKey: string, pkg: PackageInfo): SingleActionFactory;
    onSpaceRemoved(wsKey: string): SingleActionFactory;
    /** "dependencies, devDependencies" property of package.json were changed */
    onSpaceUpdated(wsKey: string): SingleActionFactory;
}
declare const packageChangesTable: readonly ["onPackageUpdated", "onPackageUpdated", "onSpaceRemoved", "onSpaceUpdated"];
interface PackagesEvents extends PackagesChangeTable {
    onScanned(changes: ActionTableDataType<PackagesChanges, typeof packageChangesTable>): SingleActionFactory;
    currentSpace(wsKey: string): SingleActionFactory;
}
export declare const packagesService: ReactorComposite2<PackagesInput, PackagesEvents, [], readonly ["currentSpace", "inited", "workspaces", "project2Packages", "srcDir2Packages", "srcPackages", "gitIgnores", "workspaceUpdateChecksum", "packagesUpdateChecksum", "npmInstallOpt", "currWorkspace", "linkedDrcp", "linkedDrcpProject", "installedDrcp", "isInChina"]>;
export {};
