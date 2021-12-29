/// <reference types="node" />
import stream from 'stream';
import { Request, Response, NextFunction } from 'express';
import { Options as ProxyOptions } from 'http-proxy-middleware';
/**
 * Middleware for printing each response process duration time to log
 * @param req
 * @param res
 * @param next
 */
export declare function createResponseTimestamp(req: Request, res: Response, next: NextFunction): void;
/**
 * This function uses http-proxy-middleware internally.
 *
 * Be aware with command line option "--verbose", once enable "verbose", this function will
 * read (pipe) remote server response body into a string buffer for any message with content-type is "text" or "json" based
 * Create and use an HTTP request proxy for specific request path
 * @param proxyPath
 * @param targetUrl
 */
export declare function setupHttpProxy(proxyPath: string, targetUrl: string, opts?: {
    /** Bypass CORS restrict on target server, default is true */
    deleteOrigin?: boolean;
    pathRewrite?: ProxyOptions['pathRewrite'];
    onProxyReq?: ProxyOptions['onProxyReq'];
    onProxyRes?: ProxyOptions['onProxyRes'];
    onError?: ProxyOptions['onError'];
    buffer?: ProxyOptions['buffer'];
    selfHandleResponse?: ProxyOptions['selfHandleResponse'];
    proxyTimeout?: ProxyOptions['proxyTimeout'];
}): void;
export declare function defaultProxyOptions(proxyPath: string, targetUrl: string): ProxyOptions & {
    pathRewrite: {
        [regexp: string]: string;
    } | ((path: string, req: import("http-proxy-middleware/dist/types").Request) => string) | ((path: string, req: import("http-proxy-middleware/dist/types").Request) => Promise<string>);
    onProxyReq: import("http-proxy-middleware/dist/types").OnProxyReqCallback;
    onProxyRes: import("http-proxy-middleware/dist/types").OnProxyResCallback;
    onError: import("http-proxy-middleware/dist/types").OnErrorCallback;
};
export declare function createReplayReadableFactory(readable: NodeJS.ReadableStream, transforms?: NodeJS.ReadWriteStream[]): () => stream.Readable;
