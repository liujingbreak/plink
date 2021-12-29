import { IncomingMessage, ServerResponse } from 'http';
import { Request, Response, NextFunction } from 'express';
import { Options as HpmOptions } from 'http-proxy-middleware';
import { ProxyCacheState, CacheData } from './types';
export declare function createProxyWithCache(proxyPath: string, targetUrl: string, cacheRootDir: string, opts?: {
    manual: boolean;
    memCacheLength?: number;
}): import("@wfh/redux-toolkit-observable/dist/tiny-redux-toolkit").Slice<ProxyCacheState, {
    configureProxy(s: ProxyCacheState, payload: HpmOptions): void;
    configTransformer(s: ProxyCacheState, payload: {
        remote?: ProxyCacheState['responseTransformer'];
        cached?: ProxyCacheState['cacheTransformer'];
    }): void;
    hitCache(s: ProxyCacheState, payload: {
        key: string;
        req: Request;
        res: Response;
        next: NextFunction;
    }): void;
    _requestRemoteDone(s: ProxyCacheState, payload: {
        key: string;
        reqHost: string | undefined;
        res: ServerResponse;
        data: {
            headers: CacheData['headers'];
            readable: IncomingMessage;
        };
    }): void;
    _loadFromStorage(s: ProxyCacheState, payload: {
        key: string;
        req: Request;
        res: Response;
        next: NextFunction;
    }): void;
    _requestRemote(s: ProxyCacheState, payload: {
        key: string;
        req: Request;
        res: Response;
        next: NextFunction;
    }): void;
    _savingFile(s: ProxyCacheState, payload: {
        key: string;
        res: ServerResponse;
        data: CacheData;
    }): void;
    _done(s: ProxyCacheState, payload: {
        key: string;
        res: ServerResponse;
        data: CacheData;
    }): void;
    _clean(s: ProxyCacheState, key: string): void;
}>;
export declare function keyOfUri(method: string, path: string): string;
