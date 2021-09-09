import commander from 'commander';
import { WorkspaceState, PackageInfo } from '../package-mgr';
import { OurCommandMetadata } from './types';
export { commander };
interface CommandContext {
    currClieCreatorFile: string;
    currCliCreatorPkg: PackageInfo | null;
    metaMap: WeakMap<PlinkCommand, Partial<OurCommandMetadata>>;
    currCliPkgMataInfos: OurCommandMetadata[];
    nameStyler?: (cmdName: string) => string;
}
export declare class PlinkCommandHelp extends commander.Help {
    subcommandTerm(cmd: commander.Command): string;
    optionTerm(option: PlinkCmdOption): string;
    longestSubcommandTermLengthForReal(cmd: commander.Command, helper: PlinkCommandHelp): number;
    longestOptionTermLengthForReal(cmd: commander.Command, helper: PlinkCommandHelp): number;
    realPadWidth(cmd: commander.Command, helper: PlinkCommandHelp): number;
    formatHelp(cmd: commander.Command, helper: PlinkCommandHelp): string;
}
/**
 * Extend commander, check commander API at https://www.npmjs.com/package/commander
 */
export declare class PlinkCommand extends commander.Command {
    ctx: CommandContext;
    nameStyler?: (cmdName: string) => string;
    optionStyler?: (cmdName: string) => string;
    subCmds: PlinkCommand[];
    /** value is file path for pkg name */
    loadedCmdMap: Map<string, string>;
    pkgName: string;
    constructor(ctx: CommandContext, name?: string);
    addGlobalOptionsToSubCmds(): void;
    createCommand(cmdName?: string): commander.Command;
    description(str?: string, argsDescription?: {
        [argName: string]: string;
    }): any;
    alias(alias?: string): any;
    createOption(flags: string, description?: string, ...remaining: any[]): PlinkCmdOption;
    option(...args: any[]): any;
    requiredOption(...args: any[]): any;
    action(fn: (...args: any[]) => void | Promise<void>): this;
    createHelp(): PlinkCommandHelp & Partial<commander.Help>;
    _saveOptions(isRequired: boolean, flags: string, desc: string, ...remaining: any[]): void;
}
export declare type CliExtension = (program: PlinkCommand) => void;
declare class PlinkCmdOption extends commander.Option {
    optionStyler?: (cmdName: string) => string;
}
export declare class CommandOverrider {
    private program;
    private pkgMetasMap;
    private ctx;
    set nameStyler(v: PlinkCommand['nameStyler']);
    constructor(program: commander.Command, ws?: WorkspaceState);
    forPackage(pk: PackageInfo, pkgFilePath: string, funcName: string): void;
    forPackage(pk: null, commandCreation: (program: commander.Command) => void): void;
    appendGlobalOptions(saveToStore: boolean): void;
}
export declare function withCwdOption(cmd: commander.Command): commander.Command;
export declare function withGlobalOptions(cmd: commander.Command | PlinkCommand): commander.Command;
