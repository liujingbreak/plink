import { IncomingMessage, ServerResponse } from 'http';
import { Request, Response, NextFunction } from 'express';
import { ServerOptions } from 'http-proxy';
import { ProxyCacheState, CacheData } from './types';
export declare function createProxyWithCache(proxyPath: string, serverOptions: ServerOptions, cacheRootDir: string, opts?: {
    manual: boolean;
    memCacheLength?: number;
}): import("@wfh/redux-toolkit-observable/dist/tiny-redux-toolkit").Slice<ProxyCacheState, {
    configTransformer(s: ProxyCacheState, payload: {
        remote?: ProxyCacheState['responseTransformer'];
        cached?: ProxyCacheState['cacheTransformer'];
    }): void;
    hitCache(s: ProxyCacheState, payload: {
        key: string;
        req: Request;
        res: Response;
        next: NextFunction;
        /** override remote target */
        target?: string;
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
        target?: string;
    }): void;
    _requestRemote(s: ProxyCacheState, payload: {
        key: string;
        req: Request;
        res: Response;
        next: NextFunction;
        target?: string;
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
