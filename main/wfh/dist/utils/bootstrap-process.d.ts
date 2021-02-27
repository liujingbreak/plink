import '../node-path';
import { GlobalOptions } from '../cmd/types';
/**
 * Must invoke initProcess() before this function
 * @param options
 */
export declare function initConfig(options: GlobalOptions): import("..").DrcpConfig;
/**
 * - Register process event handler for SIGINT and shutdown command
 * - Initialize redux-store for Plink
 * @param onShutdownSignal
 */
export declare function initProcess(onShutdownSignal?: () => void | Promise<any>): void;
/**
 * Initialize redux-store for Plink.
 *
 * Use this function instead of initProcess() in case it is in a forked child process or worker thread.
 *
 * Unlink initProcess() which registers process event handler for SIGINT and shutdown command,
 * in case this is running as a forked child process, it will stand by until parent process explicitly
 *  sends a signal to exit
 */
export declare function initAsChildProcess(): void;
