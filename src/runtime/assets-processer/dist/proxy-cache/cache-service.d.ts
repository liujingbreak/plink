import { IncomingMessage } from 'http';
import { Request, Response, NextFunction } from 'express';
import { Options as HpmOptions } from 'http-proxy-middleware';
import { ProxyCacheState, CacheData } from './types';
export declare function createProxyWithCache(proxyPath: string, targetUrl: string, cacheRootDir: string, opts?: {
    manual: boolean;
    pathRewrite?: HpmOptions['pathRewrite'];
}): import("@wfh/redux-toolkit-observable/dist/tiny-redux-toolkit").Slice<ProxyCacheState, {
    configureProxy(s: ProxyCacheState, payload: HpmOptions): void;
    configTransformer(s: ProxyCacheState, payload: ProxyCacheState['responseTransformer']): void;
    hitCache(s: ProxyCacheState, payload: {
        key: string;
        req: Request;
        res: Response;
        next: NextFunction;
    }): void;
    _addToCache(s: ProxyCacheState, payload: {
        key: string;
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
    _gotCache(s: ProxyCacheState, payload: {
        key: string;
        data: CacheData;
    }): void;
}>;
export declare function keyOfUri(method: string, uri: string): string;
