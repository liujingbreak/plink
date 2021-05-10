/**
 * This Webpack resolve plugin is experimental and debug purposed.
 * Not being used anywhere.
 */
import { Hook } from 'tapable';
interface Resolver {
    hooks: {
        resolve: Hook<Request, RequestContext>;
    };
}
interface RequestContext {
    stack: Set<string>;
}
interface Request {
    context: {
        issuer?: string;
        compiler?: unknown;
    };
    path: string;
    request: string;
}
export declare class PlinkWebpackResolvePlugin {
    apply(resolver: Resolver): void;
}
export {};
