import commander from 'commander';
import { WorkspaceState, PackageInfo } from '../package-mgr';
export declare class CommandOverrider {
    private program;
    private loadedCmdMap;
    private origPgmCommand;
    constructor(program: commander.Command, ws?: WorkspaceState);
    forPackage(pk: PackageInfo, pkgFilePath: string, funcName: string): void;
    forPackage(pk: null, commandCreation: (program: commander.Command) => void): void;
}
export declare function withGlobalOptions(program: commander.Command): commander.Command;
