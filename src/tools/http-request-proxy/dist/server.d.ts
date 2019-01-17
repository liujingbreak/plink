import * as express from 'express';
export declare function activate(): void;
export declare function forName(name: string, opts?: {
    [k: string]: any;
}): ProxyInstance;
export declare function forEach(callback: (proxyInstance: ProxyInstance) => void): void;
export declare type BodyHandler = (req: express.Request, hackedReqHeaders: {
    [name: string]: string;
}, requestBody: any, lastResult: any) => any;
export declare type HeaderHandler = (req: express.Request, header: {
    [name: string]: any;
}) => void;
export declare class ProxyInstance {
    private options;
    name: string;
    resHandlers: {
        [path: string]: Set<BodyHandler | HeaderHandler>;
    };
    reqHandlers: {
        [path: string]: Set<BodyHandler | HeaderHandler>;
    };
    mockHandlers: {
        [path: string]: Set<BodyHandler | HeaderHandler>;
    };
    resHeaderHandlers: {
        [path: string]: Set<HeaderHandler>;
    };
    constructor(name: string, options?: {
        [k: string]: any;
    });
    readonly isRemoveCookieDomain: boolean;
    addOptions(opt: {
        [k: string]: any;
    }): ProxyInstance;
    useProxy(router: any, target: string): void;
    /**
     * @param {*} path sub path after '/http-request-proxy'
     * @param {*} handler (url: string, method:string,
     * 	responseHeaders: {[name: string]:string}, responseBody: string | Buffer) => null | Promise<string>
     */
    interceptResponse(path: string, handler: BodyHandler): void;
    interceptRequest(path: string, handler: BodyHandler): void;
    mockResponse(path: string, handler: BodyHandler): void;
    interceptResHeader(path: string, handler: HeaderHandler): void;
    private addHandler;
}
/**
 * Add proxy middlewares to a specific router path
    * @param {Route} router Express router instance, could be `api.router()`
    * @param {string} target a full http URL, e.g. https://www-demo.foobar.com
    * @param {string} proxyPath sub path the proxy middleware will be handling on
 */
export declare function useProxy(router: express.Router, target: string, proxyPath: string): void;
