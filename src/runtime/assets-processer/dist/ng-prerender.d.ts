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
     *
     * @param routeMapFiles array of dist/static/<app>/prerender-routes.json
     */
    constructor(...routeMapFiles: string[]);
    asMiddleware(): (req: Request, res: Response, next: NextFunction) => void;
    protected queryPrerenderPages(routeMapFiles: string[]): Promise<{
        [route: string]: string;
    }>;
}
