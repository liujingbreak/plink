import { Request, Response, NextFunction } from 'express';
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
    deleteOrigin?: boolean;
}): void;
