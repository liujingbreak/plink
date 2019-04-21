import * as express from 'express';
import { BodyHandler, HeaderHandler } from './path-matcher';
import * as pm from './path-matcher';
interface HandlerParams {
    req: express.Request;
    headers: {
        [k: string]: any;
    };
    body: any;
    result?: any;
}
export declare function intercept(req: express.Request, headers: {
    [k: string]: any;
}, body: any, resHandlers: pm.DirTree<pm.StoredHandler<BodyHandler>>, name: string): Promise<HandlerParams | null>;
export declare class ProxyInstanceForBrowser {
    protected options: {
        [k: string]: any;
    };
    name: string;
    resHandlers: pm.DirTree<pm.StoredHandler<BodyHandler>>;
    reqHandlers: pm.DirTree<pm.StoredHandler<BodyHandler>>;
    mockHandlers: pm.DirTree<pm.StoredHandler<BodyHandler>>;
    resHeaderHandlers: pm.DirTree<pm.StoredHandler<HeaderHandler>>;
    constructor(name: string, options?: {
        [k: string]: any;
    });
    readonly isRemoveCookieDomain: boolean;
    addOptions(opt: {
        [k: string]: any;
    }): ProxyInstanceForBrowser;
    /**
     * @deprecated
     * @param {*} path sub path after '/http-request-proxy'
     * @param {*} handler (url: string, method:string,
     * 	responseHeaders: {[name: string]:string}, responseBody: string | Buffer) => null | Promise<string>
     */
    interceptResponse(path: string, handler: BodyHandler): void;
    /** @deprecated */
    interceptRequest(path: string, handler: BodyHandler): void;
    mockResponse(path: string, handler: BodyHandler): void;
    /**@deprecated */
    interceptResHeader(path: string, handler: HeaderHandler): void;
}
export declare type MockSetupFunc = (proxy: ProxyInstanceForBrowser, forName?: (name: string) => ProxyInstanceForBrowser) => void;
export {};
