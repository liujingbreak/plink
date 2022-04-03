/// <reference types="node" />
import httpProxy from 'http-proxy';
export declare type Transformer = (resHeaders: CacheData['headers'], reqHost: string | undefined, source: NodeJS.ReadableStream) => PromiseLike<{
    readable: () => NodeJS.ReadableStream;
    length: number;
}>;
export declare type ProxyCacheState = {
    proxy: httpProxy;
    cacheDir: string;
    cacheByUri: Map<string, CacheData | 'loading' | 'requesting' | 'saving'>;
    /** transform remote response */
    responseTransformer?: Transformer;
    /** transform cached response */
    cacheTransformer?: Transformer;
    memCacheLength: number;
    error?: Error;
};
export declare type CacheData = {
    statusCode: number;
    headers: [string, string | string[]][];
    body: () => NodeJS.ReadableStream;
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
