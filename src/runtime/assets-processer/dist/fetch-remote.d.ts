import { ImapManager } from './fetch-remote-imap';
export declare const zipDownloadDir: any;
export declare function start(imap: ImapManager): Promise<void>;
/**
 * It seems ok to quit process without calling this function
 */
export declare function stop(): void;
export declare function getPm2Info(): {
    isPm2: any;
    pm2InstanceId: any;
    isMainProcess: boolean;
};
export declare function retry<T>(times: number, func: (...args: any[]) => Promise<T>, ...args: any[]): Promise<T>;
export declare function forkExtractExstingZip(zipDir?: string, outputDir?: string, doNotDelete?: boolean): Promise<string>;
