import commander from 'commander';
import { WorkspaceState, PackageInfo } from '../package-mgr';
export declare function overrideCommand(program: commander.Command, ws: WorkspaceState | undefined): {
    forPackage(pkg: PackageInfo, cmdExecutionFile: string): void;
};
