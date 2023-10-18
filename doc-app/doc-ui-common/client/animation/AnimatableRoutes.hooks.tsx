import trim from 'lodash/trim';
import escapeRegExp from 'lodash/escapeRegExp';
import React from 'react';
import {ReactorComposite, RxController} from '@wfh/reactivizer';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';

type RouteActions = {
  navigateTo(relativePath: string): void;
  /** Redirect another path */
  replaceUrl(relativePath: string): void;
};

type RouteEvents = {
  onBrowserHistoryPopstate(): void;
};

export type RouteObject = {
  path: string;
  element?: React.ReactNode;
  redirect?: string;
};

export type Router = {
  matchedRoute: MatchedRouteObject | null;
  control: RxController<RouteActions>;
};

type CompiledRouteObject = RouteObject & {
  pathPattern?: RegExp;
  paramNames: string[];
};

export type MatchedRouteObject = CompiledRouteObject & {
  matchedParams: Record<string, string>;
};

export type RouterState = {
  baseHref?: string;
  routes?: RouteObject[];
  basenameOrParent?: string;
  compiledRoutes?: CompiledRouteObject[];
  matchedRoute?: RouteObject;
};

export function useRouterProvider(basenameOrParent = '', routes: RouteObject[]) {
  const state$ = React.useMemo(() => new rx.BehaviorSubject<RouterState>({}), []);
  const composite = React.useMemo(() => new ReactorComposite<RouteActions, RouteEvents>(
    {name: 'router', debug: process.env.NODE_ENV === 'development'}), []);
  const [router, setRouter] = React.useState<Router>({matchedRoute: null, control: composite.i});
  const {i, o, r} = composite;

  React.useMemo(() => {
    state$.next({...state$.getValue(), basenameOrParent});
  }, [basenameOrParent, state$]);

  React.useMemo(() => {
    state$.next({...state$.getValue(), routes});
  }, [routes, state$]);

  React.useMemo(() => {
    function onPopstate(evt: PopStateEvent) {
      o.dp.onBrowserHistoryPopstate();
    }

    const basenameOrParent$ = state$.pipe(
      op.map(s => s.basenameOrParent),
      op.distinctUntilChanged(),
      op.filter((v): v is string => v != null)
      // op.share()
    );

    const compiledRoutes$ = state$.pipe(
      op.map(s => s.compiledRoutes),
      op.distinctUntilChanged(),
      op.filter((v): v is NonNullable<RouterState['compiledRoutes']> => v != null)
    );

    r('Listen to popstate event', new rx.Observable<void>(sub => {
      if (typeof window !== 'undefined') {
        window.addEventListener('popstate', onPopstate);
        return () => window.removeEventListener('popstate', onPopstate);
      }
    }));

    r('build compiledRoutes', state$.pipe(
      op.map(s => s.routes),
      op.distinctUntilChanged(),
      op.map(routes => {
        if (routes)
          state$.next({
            ...state$.getValue(),
            compiledRoutes: compileRoutes(routes)
          });
      })
    ));

    r(rx.merge(
      o.at.onBrowserHistoryPopstate.pipe(
        op.withLatestFrom(basenameOrParent$),
        op.concatMap(([, basenameOrParent]) => rx.timer(16).pipe(op.mapTo(basenameOrParent))),
        op.map(basenameOrParent => {
          return subPathOf(basenameOrParent, window.location.pathname) ?? window.location.pathname;
        })
      ),
      i.pt.navigateTo.pipe(
        op.withLatestFrom(basenameOrParent$),
        op.map(([[, toPath], basenameOrParent]) => {
          if (typeof window !== 'undefined') {
            window.history.pushState({}, '', resolvePath(basenameOrParent, toPath));
          }
          return toPath;
        })
      ),
      i.pt.replaceUrl.pipe(
        op.withLatestFrom(basenameOrParent$),
        op.map(([[, toPath], basenameOrParent]) => {
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', resolvePath(basenameOrParent, toPath));
          }
          return toPath;
        })
      ),
      rx.of(typeof window !== 'undefined' ? window.location.pathname : '').pipe(
        op.filter(url => !!url),
        op.switchMap(url => basenameOrParent$.pipe(
          op.take(1),
          op.map(basenameOrParent => [url, basenameOrParent] as const)
        )),
        op.map(([toPath, basenameOrParent]) => subPathOf(basenameOrParent, toPath) ?? toPath)
      )
    ).pipe(
      op.switchMap(toPath => compiledRoutes$.pipe(
        op.take(1),
        op.map(compiled => [toPath, compiled] as const)
      )),
      op.map(([toPath, compiledRoutes]) => {
        // eslint-disable-next-line no-console
        console.log('Route to', toPath);
        const matched = matchRoute(compiledRoutes, toPath);
        if (matched)
          setRouter(s => ({...s, matchedRoute: matched}));

        return matched?.redirect;
      }),
      op.filter((r): r is string => r != null),
      op.observeOn(rx.asyncScheduler),
      op.map(redirect => i.dp.replaceUrl(redirect))
    ));
  }, [r, i, o, state$]);

  React.useEffect(() => {
    return () => {composite.destory(); };
  }, [composite]);

  return router;
}

export const RouterContext = React.createContext<Router | null>(null);

export const RouterProvider: React.FC<React.PropsWithChildren<{basenameOrParent?: string; routes: RouteObject[]}>> = (props) => {
  const router = useRouterProvider(props.basenameOrParent, props.routes);
  return <RouterContext.Provider value={router}>{props.children}</RouterContext.Provider>;
};

export function useRouter() {
  return React.useContext(RouterContext);
}

export function useNavigateHandler<C extends(...args: any[]) => void>(path: string) {
  const router = useRouter();
  return React.useCallback(() => {
    router?.control.dispatcher.navigateTo(path);
  }, [path, router?.control.dispatcher]) as C;
}

function resolvePath(...strs: string[]) {
  return '/' + strs.map(item => trim(item, '/')).join('/');
}

function subPathOf(base: string, absPath: string) {
  if (!base.endsWith('/'))
    base = base + '/';
  return absPath.startsWith(base) ? absPath.slice(base.length - 1) : null;
}

function compileRoutes(routes: RouteObject[]) {
  return routes.map(route => {
    const paramNames = [] as string[];
    const pathRegExpStr = trim(route.path, '/').split('/').map(item => {
      const hasParam = /^:([^:/]+)$/.exec(item);
      if (hasParam) {
        paramNames.push(hasParam[1]);
        return '([^/]+)';
      } else if ('*' === item) {
        return '.+';
      } else {
        return escapeRegExp(item);
      }
    })
      .join('/');

    return {...route, pathPattern: new RegExp('^/' + pathRegExpStr + '$'), paramNames};
  }) as CompiledRouteObject[];
}

function matchRoute(routes: CompiledRouteObject[], location: string) {
  let matched: MatchedRouteObject | undefined;
  location = /^(.*?)\/*$/.exec(location)![1];
  for (const route of routes) {
    if (route.pathPattern) {
      const res = route.pathPattern.exec(location);
      if (res == null)
        continue;
      matched = route as RouteObject as MatchedRouteObject;
      let i = 1;
      matched.matchedParams = {};
      for (const param of route.paramNames) {
        matched.matchedParams[param] = res[i++];
      }
      return matched;
    } else if (route.path === location) {
      (route as RouteObject as MatchedRouteObject).matchedParams = {};
      return (route as RouteObject as MatchedRouteObject);
    }
  }
}

export const testable = {compileRoutes, matchRoute};

