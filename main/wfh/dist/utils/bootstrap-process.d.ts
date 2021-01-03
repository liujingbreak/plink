import '../node-path';
import { GlobalOptions } from '../cmd/types';
export declare function initConfigAsync(options: GlobalOptions): Promise<import("..").DrcpConfig>;
export declare function initConfig(options: GlobalOptions): import("..").DrcpConfig;
/**
 * - Register process event handler for SIGINT and shutdown command
 * - Initialize redux-store for Plink
 * @param onShutdownSignal
 */
export declare function initProcess(onShutdownSignal?: () => void | Promise<any>): void;
