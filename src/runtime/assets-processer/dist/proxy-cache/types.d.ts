/// <reference types="node" />
import stream from 'stream';
export declare type ProxyCacheState = {
    cacheDir: string;
    cacheByUri: Map<string, CacheData | 'loading' | 'requesting'>;
    responseTransformer: ((headers: CacheData['headers']) => stream.Transform[])[];
    error?: Error;
};
export declare type CacheData = {
    statusCode: number;
    headers: [string, string | string[]][];
    body: Buffer;
};
export declare type NpmRegistryVersionJson = {
    name: string;
    'dist-tags': {
        [key: string]: string;
    };
    versions: {
        [version: string]: {
            version: string;
            dist: {
                shasum: string;
                size: number;
                noattachment: boolean;
                tarball: string;
            };
        };
    };
};
/**
 * Store original tarball download URL
 */
export declare type TarballsInfo = {
    [pkgName: string]: {
        [version: string]: string;
    };
};
