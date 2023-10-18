/// <reference types="node" />
import http from 'node:http';
import HttpProxy from 'http-proxy';
import * as rx from 'rxjs';
declare type Response = Parameters<HttpProxy['web']>[1];
export declare type HttpProxyEventParams = {
    error: Parameters<HttpProxy.ErrorCallback>;
    start: Parameters<HttpProxy.StartCallback>;
    proxyReq: Parameters<HttpProxy.ProxyReqCallback>;
    proxyRes: Parameters<HttpProxy.ProxyResCallback>;
    proxyReqWs: Parameters<HttpProxy.ProxyReqWsCallback>;
    econnreset: Parameters<HttpProxy.EconnresetCallback>;
    end: Parameters<HttpProxy.EndCallback>;
    open: Parameters<HttpProxy.OpenCallback>;
    close: Parameters<HttpProxy.CloseCallback>;
};
export declare type HttpProxyEventObs = {
    [evt in keyof HttpProxyEventParams]: rx.Observable<{
        type: evt;
        payload: HttpProxyEventParams[evt];
    }>;
};
export declare function httpProxyObservable(proxy: HttpProxy): HttpProxyEventObs;
/**
 * e.g.
```
  rx.defer(() => {
    proxy.web(req, res, {timeout: 10000});
    return observeProxyResponse(proxy$, payload.res);
  })
```
 */
export declare function observeProxyResponse(httpProxy$: HttpProxyEventObs, res: Response, skipRedirectRes?: boolean, maxWaitMsecond?: number): HttpProxyEventObs['proxyRes'];
export declare function observeProxyResponseAndChange(httpProxy$: HttpProxyEventObs, res: Response, change: (origContent: Buffer) => Buffer | string | PromiseLike<Buffer | string>, skipRedirectRes?: boolean): rx.Observable<void>;
/**
 * You can use Http-proxy option `cookieDomainRewrite: {'*': ''}` at most of the time,
 * but when you want to `selfHandleResponse: true`, you'll need this function to help:
 *
 * `rewriteResponseSetCookieHeader(res.header['set-cookie'], res)`
*/
export declare function clearSetCookieDomainOfProxyResponse(pRes: http.IncomingMessage): Generator<string, void, unknown>;
export {};
