import '../node-path';
import { GlobalOptions } from '../cmd/types';
export declare function initConfigAsync(options: GlobalOptions): Promise<void>;
export declare function initConfig(options: GlobalOptions): void;
export declare function initProcess(onShutdownSignal?: () => void | Promise<any>): void;
