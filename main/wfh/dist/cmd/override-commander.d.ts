import commander from 'commander';
import { WorkspaceState, PackageInfo } from '../package-mgr';
import { OurAugmentedCommander } from './types';
export declare class CommandOverrider {
    private program;
    private loadedCmdMap;
    private origPgmCommand;
    private currClieCreatorFile;
    private currCliCreatorPkg;
    private currCliPkgMataInfos;
    private allSubCmds;
    private metaMap;
    private pkgMetasMap;
    constructor(program: commander.Command, ws?: WorkspaceState);
    forPackage(pk: PackageInfo, pkgFilePath: string, funcName: string): void;
    forPackage(pk: null, commandCreation: (program: commander.Command) => void): void;
    appendGlobalOptions(): void;
}
export declare function withGlobalOptions(program: OurAugmentedCommander | commander.Command): commander.Command;
