import { ZipResourceMiddleware } from 'serve-static-zip';
interface OldChecksum {
    version: number;
    path: string;
    changeFetchUrl?: string;
}
export interface Checksum extends OldChecksum {
    versions?: {
        [key: string]: {
            version: number;
            path: string;
        };
    };
}
export declare function start(serveStaticZip: ZipResourceMiddleware): Promise<void>;
/**
 * It seems ok to quit process without calling this function
 */
export declare function stop(): void;
export {};
