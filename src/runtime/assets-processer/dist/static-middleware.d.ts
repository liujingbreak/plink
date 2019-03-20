import serveZip from 'serve-static-zip';
import { Handler } from 'express';
export declare function createStaticRoute(staticDir: string, maxAgeMap?: {
    [extname: string]: string | number;
}): Handler;
export declare function createZipRoute(maxAgeMap?: {
    [extname: string]: string;
}): serveZip.ZipResourceMiddleware;
