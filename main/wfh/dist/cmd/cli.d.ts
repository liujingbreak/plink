import commander from 'commander';
import '../tsc-packages-slice';
export declare function drcpCommand(startTime: number): Promise<void>;
export declare function withGlobalOptions(program: commander.Command): commander.Command;
