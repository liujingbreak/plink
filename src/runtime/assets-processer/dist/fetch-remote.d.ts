import { ZipResourceMiddleware } from 'serve-static-zip';
export declare function start(serveStaticZip: ZipResourceMiddleware): Promise<void>;
/**
 * It seems ok to quit process without calling this function
 */
export declare function stop(): void;
export declare function forkExtractExstingZip(): Promise<string>;
