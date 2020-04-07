import { Request, Response, NextFunction } from 'express';
export declare const ROUTE_MAP_FILE = "prerender-routes.json";
export declare class PrerenderForExpress {
    prerenderPages: {
        [route: string]: string;
    };
    prerenderMap: {
        [route: string]: string;
    };
    /**
       * constructor
       * @param routeMapFiles array of dist/static/<app>/_prerender/prerender-routes.json
       */
    constructor(...routeMapFiles: string[]);
    asMiddleware(): (req: Request<import("express-serve-static-core").ParamsDictionary>, res: Response<any>, next: NextFunction) => void;
    protected queryPrerenderPages(routeMapFiles: string[]): Promise<{
        [route: string]: string;
    }>;
}
