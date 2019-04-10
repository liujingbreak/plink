import * as express from 'express';
import { ProxyInstanceForBrowser } from '../isom/proxy-instance';
export * from '../isom/proxy-instance';
export declare function activate(): void;
export declare class ProxyInstance extends ProxyInstanceForBrowser {
    constructor(name: string, options?: {
        [k: string]: any;
    });
    useProxy(router: any, target: string): void;
}
export declare function forName(name: string, opts?: {
    [k: string]: any;
}): ProxyInstance;
export declare function forEach(callback: (proxyInstance: ProxyInstance) => void): void;
/**
 * Add proxy middlewares to a specific router path
    * @param {Route} router Express router instance, could be `api.router()`
    * @param {string} target a full http URL, e.g. https://www-demo.foobar.com
    * @param {string} proxyPath sub path the proxy middleware will be handling on
 */
export declare function useProxy(router: express.Router, target: string, proxyPath: string): void;
