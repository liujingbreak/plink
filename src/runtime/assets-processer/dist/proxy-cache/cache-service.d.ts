import { ServerOptions } from 'http-proxy';
export declare function createProxyWithCache(proxyPath: string, serverOptions: ServerOptions, cacheRootDir: string, opts?: {
    manual: boolean;
    memCacheLength?: number;
}): any;
export declare function keyOfUri(method: string, path: string): string;
