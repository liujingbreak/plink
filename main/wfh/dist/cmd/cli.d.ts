import commander from 'commander';
import './cli-store';
export declare function drcpCommand(startTime: number): Promise<void>;
export declare function withGlobalOptions(program: commander.Command): commander.Command;
