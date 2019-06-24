import { DirTree } from './dir-tree';
import express from 'express';
export { DirTree };
export interface MockContext {
    urlParam?: {
        [name: string]: string;
    };
}
export declare type BodyHandler = (req: express.Request, hackedReqHeaders: {
    [name: string]: string;
}, requestBody: any, lastResult: any, ctx: MockContext) => any;
export declare type HeaderHandler = (req: express.Request, header: {
    [name: string]: any;
}) => void;
export interface Handlers {
    [path: string]: Set<BodyHandler | HeaderHandler>;
}
export interface StoredHandler<H> {
    treePath: string;
    restingRegex?: RegExp;
    handler: H;
}
export declare function addToHandlerTree<H extends (BodyHandler | HeaderHandler)>(path: string, handler: H, tree: DirTree<StoredHandler<H>[]>): void;
export declare function matchedHandlers<H>(tree: DirTree<StoredHandler<H>[]>, reqUrl: string): H[];
