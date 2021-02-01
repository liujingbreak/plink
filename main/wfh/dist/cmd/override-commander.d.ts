import commander from 'commander';
import { WorkspaceState, PackageInfo } from '../package-mgr';
export declare function overrideCommand(program: commander.Command, ws?: WorkspaceState): {
    forPackage(pkg: PackageInfo, cmdExecutionFile: string): void;
    commandMetaInfos: Map<string, OurCommandMetadata>;
};
export declare function withGlobalOptions(program: commander.Command): commander.Command;
interface OurCommandMetadata {
    nameAndArgs: string;
    alias?: string;
    desc: string;
    usage: string;
    options: OurCommandOption[];
}
interface OurCommandOption<T = string> {
    flags: string;
    desc: string;
    defaultValue: string | boolean | T[] | T;
    isRequired: boolean;
}
export {};
