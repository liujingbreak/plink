import * as express from 'express';
export declare type HeaderHandler = (req: express.Request, header: {
    [name: string]: any;
}) => void;
export declare type BodyHandler = (req: express.Request, hackedReqHeaders: {
    [name: string]: string;
}, requestBody: any, lastResult: any) => any;
export interface Handlers {
    [path: string]: Set<BodyHandler | HeaderHandler>;
}
export declare function intercept(req: express.Request, headers: {
    [k: string]: any;
}, body: any, resHandlers: Handlers, name: string): Promise<any>;
export declare class ProxyInstanceForBrowser {
    protected options: {
        [k: string]: any;
    };
    name: string;
    resHandlers: Handlers;
    reqHandlers: Handlers;
    mockHandlers: Handlers;
    resHeaderHandlers: {
        [path: string]: Set<HeaderHandler>;
    };
    constructor(name: string, options?: {
        [k: string]: any;
    });
    readonly isRemoveCookieDomain: boolean;
    addOptions(opt: {
        [k: string]: any;
    }): ProxyInstanceForBrowser;
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
export declare type MockSetupFunc = (proxy: ProxyInstanceForBrowser, forName?: (name: string) => ProxyInstanceForBrowser) => void;
