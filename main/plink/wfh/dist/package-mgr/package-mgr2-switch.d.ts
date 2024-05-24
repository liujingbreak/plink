import { ReactorComposite2, ReactorCompositeExtendType, SingleActionFactory } from '@wfh/reactivizer';
import type { PackageInfo } from './index';
export declare const INSTALLATION_JSON_FILE = ".plink.install.json";
export interface PackageMgr2SpaceSwitchActions {
    doingSwitchSpace(rootDir: string, key: string, pkgSet: Set<string>, projPkgMap: Map<string, Set<string>>, allPackages: Map<string, PackageInfo>, spaceDependency: Map<string, Set<string>>): SingleActionFactory;
    createArbitraryTsConfig(spaceKey: string, tsconfigDir: string): SingleActionFactory;
}
export interface PackageMgr2SpaceSwitchEvents {
    didCreatingSymlinksToInstallDir(createdNmParentDirs: string[], links: string[]): SingleActionFactory;
    didCreatingWorkspaceSymlinks(numOfWorkspace: number): SingleActionFactory;
    didWriteTsConfigFiles(fileWrittenCount: number): SingleActionFactory;
    updateTypeRootPackages(spaceKey: string): SingleActionFactory;
    didUpdateTypeRootPackages(spaceKey: string, data: Map<string, PackageInfo>): SingleActionFactory;
    updateCommonSrcDir(dir: string): SingleActionFactory;
    didArbitraryTsConfig(spaceKey: string, json: any): SingleActionFactory;
}
export declare function createSwitchSpaceService<R extends ReactorComposite2<any, any, any, any>>(origService: R): ReactorCompositeExtendType<R, PackageMgr2SpaceSwitchActions, PackageMgr2SpaceSwitchEvents, [], []>;
