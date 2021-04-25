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
 * Create and use an HTTP request proxy for specific request path
 * @param proxyPath
 * @param targetUrl
 */
export declare function setupHttpProxy(proxyPath: string, apiUrl: string, opts?: {
    /** Bypass CORS restrict on target server */
    deleteOrigin?: boolean;
    onProxyReq?: ProxyOptions['onProxyReq'];
}): void;
