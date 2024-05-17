/// <reference path="../../src/cmd/cfont.d.ts" />
import commander from 'commander';
export declare const cliPackageArgDesc: string;
export declare function createCommands(argv: string[], manualExitProcess?: () => any): Promise<void>;
export declare function defineCommander(manualExitProcess?: () => any): Promise<commander.Command>;
export declare function parseCommand(program: commander.Command, argv: string[]): Promise<void>;
