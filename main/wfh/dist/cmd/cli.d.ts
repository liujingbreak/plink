/// <reference types="ts/cmd/cfont" />
import commander from 'commander';
export declare function createCommands(startTime: number): Promise<void>;
export declare function withGlobalOptions(program: commander.Command): commander.Command;
