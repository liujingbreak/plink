import '../node-path';
import { GlobalOptions } from '../cmd/types';
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
 * Unlink initProcess() which registers process event handler for SIGINT and shutdown command,
 * in case this is running as a forked child process, it will stand by until parent process explicitly
 *  sends a signal to exit
 */
export declare function initAsChildProcess(): void;
