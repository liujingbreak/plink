/// <reference types="node" />
import HttpProxy from 'http-proxy';
import * as rx from 'rxjs';
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
export declare function httpProxyObservable(proxy: HttpProxy): {
    error: rx.Observable<{
        type: "error";
        payload: [err: Error, req: import("http").IncomingMessage, res: import("http").ServerResponse, target?: HttpProxy.ProxyTargetUrl | undefined];
    }>;
    start: rx.Observable<{
        type: "start";
        payload: [req: import("http").IncomingMessage, res: import("http").ServerResponse, target: HttpProxy.ProxyTargetUrl];
    }>;
    proxyReq: rx.Observable<{
        type: "proxyReq";
        payload: [proxyReq: import("http").ClientRequest, req: import("http").IncomingMessage, res: import("http").ServerResponse, options: HttpProxy.ServerOptions];
    }>;
    proxyRes: rx.Observable<{
        type: "proxyRes";
        payload: [proxyRes: import("http").IncomingMessage, req: import("http").IncomingMessage, res: import("http").ServerResponse];
    }>;
    proxyReqWs: rx.Observable<{
        type: "proxyReqWs";
        payload: [proxyReq: import("http").ClientRequest, req: import("http").IncomingMessage, socket: import("net").Socket, options: HttpProxy.ServerOptions, head: any];
    }>;
    econnreset: rx.Observable<{
        type: "econnreset";
        payload: [err: Error, req: import("http").IncomingMessage, res: import("http").ServerResponse, target: HttpProxy.ProxyTargetUrl];
    }>;
    end: rx.Observable<{
        type: "end";
        payload: [req: import("http").IncomingMessage, res: import("http").ServerResponse, proxyRes: import("http").IncomingMessage];
    }>;
    open: rx.Observable<{
        type: "open";
        payload: [proxySocket: import("net").Socket];
    }>;
    close: rx.Observable<{
        type: "close";
        payload: [proxyRes: import("http").IncomingMessage, proxySocket: import("net").Socket, proxyHead: any];
    }>;
};
