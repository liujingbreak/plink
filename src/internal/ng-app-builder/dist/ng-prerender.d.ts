/// <reference types="express" />
import 'zone.js/dist/zone-node';
import 'reflect-metadata';
import { Request, Response, NextFunction } from 'express';
export declare function writeRoutes(destDir: string, applName: string, ROUTES: string[]): void;
export declare class PrerenderForExpress {
    staticDir: string;
    applName: string;
    noPrerender: boolean;
    prerenderPages: {
        [route: string]: string;
    };
    prerenderMap: {
        [route: string]: string;
    };
    prerenderMapFile: string;
    constructor(staticDir: string, applName: string);
    asMiddleware(): (req: Request, res: Response, next: NextFunction) => void;
    protected queryPrerenderPages(): void;
}
