import '../node-path';
import { GlobalOptions } from '../cmd/types';
/**
 * Must invoke initProcess() or initAsChildProcess() before this function.
 * If this function is called from a child process or thread worker of Plink,
 * you may pass `JSON.parse(process.env.PLINK_CLI_OPTS!)` as parameter since
 * Plink's main process save `GlobalOptions` in environment variable "PLINK_CLI_OPTS",
 * so that child process gets same GlobalOptions as the main process does.
 * @param options
 */
export declare function initConfig(options: GlobalOptions): import("..").DrcpConfig;
/**
 * - Register process event handler for SIGINT and shutdown command
 * - Initialize redux-store for Plink
 *
 * DO NOT fork a child process on this function
 * @param onShutdownSignal
 */
export declare function initProcess(saveState?: boolean, onShutdownSignal?: () => void | Promise<any>): import("@reduxjs/toolkit").CaseReducerActions<import("../../../packages/redux-toolkit-observable/dist/helper").RegularReducers<{
    actionOnExit: "none" | "save" | "send";
    stateChangeCount: number;
}, {
    changeActionOnExit(s: {
        actionOnExit: "none" | "save" | "send";
        stateChangeCount: number;
    }, mode: "none" | "save" | "send"): void;
    processExit(s: {
        actionOnExit: "none" | "save" | "send";
        stateChangeCount: number;
    }): void;
    storeSaved(s: {
        actionOnExit: "none" | "save" | "send";
        stateChangeCount: number;
    }): void;
}> & import("../../../packages/redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<{
    actionOnExit: "none" | "save" | "send";
    stateChangeCount: number;
}>>;
/**
 * Initialize redux-store for Plink.
 *
 * Use this function instead of initProcess() in case it is in a forked child process or worker thread.
 *
 * Unlink initProcess() which registers process event handler for SIGINT and shutdown command,
 * in case this is running as a forked child process, it will stand by until parent process explicitly
 *  sends a signal to exit
 * @param syncState send changed state back to main process
 */
export declare function initAsChildProcess(saveState?: boolean, onShutdownSignal?: () => void | Promise<any>): void;
