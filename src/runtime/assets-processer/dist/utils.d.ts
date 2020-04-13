import { Request, Response, NextFunction } from 'express';
export declare function createResponseTimestamp(req: Request, res: Response, next: NextFunction): void;
export declare function commandProxy(proxyPath: string, targetUrl: string): void;
