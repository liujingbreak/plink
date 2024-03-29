/// <reference types="node" />
import stream from 'stream';
import { ClientRequest, IncomingMessage } from 'http';
import { Request, Response, NextFunction } from 'express';
import proxy, { ServerOptions } from 'http-proxy';
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
}): void;
interface RedirectableRequest {
    _currentRequest: ClientRequest;
}
export declare function isRedirectableRequest(req: unknown): req is RedirectableRequest;
/**
 * Options of http-proxy-middleware
 */
export declare function defaultProxyOptions(proxyPath: string, targetUrl: string): proxy.ServerOptions;
/** Options of http-proxy
 */
export declare function defaultHttpProxyOptions(target?: string): ServerOptions;
export declare function createReplayReadableFactory(readable: NodeJS.ReadableStream, transforms?: NodeJS.ReadWriteStream[], opts?: {
    debugInfo?: string;
    expectLen?: number;
}): () => stream.Readable;
/**
 * Use createBufferForHttpProxy() instead.
 *
 * This is not working for POST request according to my experience in Node 16.3.0, due to
 * by the time node-http-proxy emits event "proxyReq", `req.pipe(proxyReq)` has already
 * been executed, meaning the proxyReq has "end" itself as reacting to req.complete: true
 * or end event.
 *
 * Fix proxied body if bodyParser is involved.
 * Copied from https://github.com/chimurai/http-proxy-middleware/blob/master/src/handlers/fix-request-body.ts
 */
export declare function fixRequestBody(proxyReq: ClientRequest, req: IncomingMessage): void;
/**
 * create stream for http-proxy web option "buffer"
 */
export declare function createBufferForHttpProxy(req: IncomingMessage, replaceBody?: any): {
    readable: stream.Readable;
    length: number;
} | undefined;
export declare function testHttpProxyServer(): void;
export {};
