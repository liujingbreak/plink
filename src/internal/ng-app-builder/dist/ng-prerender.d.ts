import 'zone.js/dist/zone-node';
import 'reflect-metadata';
/**
 * Write static prerender pages
 * @param staticDir dist/static
 * @param htmlFile dist/static/<app>/index.html
 * @param mainFile dist/server/main.js file path which can be require.resolve, should be corresponding to angular.json
 * @param ROUTES
 */
export declare function writeRoutesWithLocalServer(staticDir: string, htmlFile: string, mainFile: string, ROUTES: string[], outputFolder?: string): Promise<string>;
export declare function renderRouteWithLocalServer(html: string, mainFile: string, route: string): Promise<string>;
