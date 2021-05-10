/**
 * This Webpack resolve plugin is experimental and debug purposed.
 * Not being used anywhere.
 */
import {Hook} from 'tapable';
// import {} from 'enhanced-resolve';

interface Resolver {
  hooks: {
    resolve: Hook<Request, RequestContext>;
  };
}

interface RequestContext {
  stack: Set<string>;
}

interface Request {
  context: {issuer?: string; compiler?: unknown;};
  path: string;
  request: string;
}

export class PlinkWebpackResolvePlugin {
  apply(resolver: Resolver /* EnhancedResolve.Resolver */) {
    resolver.hooks.resolve.tapPromise('PlinkModuleResolver', async (req, ctx) => {
      console.log(req.path, req.request);
    });
  }
}
