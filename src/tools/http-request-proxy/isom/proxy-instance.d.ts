import * as express from 'express';
export declare type HeaderHandler = (req: express.Request, header: {
    [name: string]: any;
}) => void;
export declare type BodyHandler = (req: express.Request, hackedReqHeaders: {
    [name: string]: string;
}, requestBody: any, lastResult: any) => any;
export declare class ProxyInstanceForBrowser {
    protected options: {
        [k: string]: any;
    };
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
