import '../node-path';
import * as rx from 'rxjs';
import { GlobalOptions } from '../cmd/types';
import * as store from '../store';
/** When process is on 'SIGINT' and "beforeExit", all functions will be executed */
export declare const exitHooks: (() => (rx.ObservableInput<unknown> | void | number))[];
/**
 * Must invoke initProcess() or initAsChildProcess() before this function.
 * If this function is called from a child process or thread worker of Plink,
 * you may pass `JSON.parse(process.env.PLINK_CLI_OPTS!)` as parameter since
 * Plink's main process save `GlobalOptions` in environment variable "PLINK_CLI_OPTS",
 * so that child process gets same GlobalOptions as the main process does.
 * @param options
 */
export declare function initConfig(options?: GlobalOptions): import("..").DrcpConfig;
/**
 * - Register process event handler for SIGINT and shutdown command
 * - Initialize redux-store for Plink
 *
 * DO NOT fork a child process on this function
 * @param _onShutdownSignal
 */
export declare function initProcess(saveState?: store.StoreSetting['actionOnExit'], _onShutdownSignal?: (code: number) => void | Promise<any>, handleShutdownMsg?: boolean): import("@reduxjs/toolkit").CaseReducerActions<import("../../../packages/redux-toolkit-observable/dist/helper").RegularReducers<store.StoreSetting, {
    changeActionOnExit(s: store.StoreSetting, mode: "send" | "save" | "none"): void;
    processExit(): void;
    storeSaved(): void;
}> & import("../../../packages/redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<store.StoreSetting>>;
/**
 * Initialize redux-store for Plink.
 *
 * Use this function instead of initProcess() in case it is in a forked child process or worker thread of Plink.
 * So that plink won't listener to PM2's shutdown message in this case.
 * Be aware that Plink main process could be a child process of PM2 or any other Node.js process manager,
 * that's what initProcess() does to listener to PM2's message.

 * Unlink initProcess() which registers process event handler for SIGINT and shutdown command,
 * in case this is running as a forked child process, it will stand by until parent process explicitly
 *  sends a signal to exit
 * @param syncState send changed state back to main process
 */
export declare function initAsChildProcess(saveState?: store.StoreSetting['actionOnExit'], onShutdownSignal?: () => void | Promise<any>): import("@reduxjs/toolkit").CaseReducerActions<import("../../../packages/redux-toolkit-observable/dist/helper").RegularReducers<store.StoreSetting, {
    changeActionOnExit(s: store.StoreSetting, mode: "send" | "save" | "none"): void;
    processExit(): void;
    storeSaved(): void;
}> & import("../../../packages/redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<store.StoreSetting>>;
