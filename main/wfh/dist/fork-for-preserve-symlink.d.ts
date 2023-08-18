/// <reference types="node" />
import { ForkOptions } from 'child_process';
declare global {
    namespace NodeJS {
        interface ProcessEnv {
            __plinkLogMainPid: string | undefined;
        }
    }
}
export declare const isWin32: boolean;
export declare function workDirChangedByCli(): {
    workdir: string | null;
    argv: string[];
};
/**
 * @returns promise<number> if a child process is forked to apply "--preserve-symlinks", or `undefined` no new child process is created
 */
export default function run(moduleName: string, opts?: {
    stateExitAction?: 'save' | 'send' | 'none';
    handleShutdownMsg?: boolean;
}): Promise<number> | undefined;
/** run in main process, mayby in PM2 as a cluster process,
* Unlike `run(modulename, opts)` this function will always fork a child process, it is conditionally executed inside `run(modulename, opts)`
*/
export declare function forkFile(moduleName: string, opts?: {
    stateExitAction?: 'save' | 'send' | 'none';
    handleShutdownMsg?: boolean;
} & ForkOptions): {
    childProcess: import("child_process").ChildProcess;
    exited: Promise<number>;
};
