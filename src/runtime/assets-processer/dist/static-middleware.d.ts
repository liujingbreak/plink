import { Handler } from 'express';
export declare function createStaticRoute(staticDir: string, maxAgeMap?: {
    [extname: string]: string | number;
}): Handler;
