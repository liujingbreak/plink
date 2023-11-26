import trim from 'lodash/trim';
import escapeRegExp from 'lodash/escapeRegExp';
import React from 'react';
import {ReactorComposite, RxController} from '@wfh/reactivizer';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';

type RouteActions = {
  /** @param relativePath the path relative to "basenameOrParent" */
  navigateTo(relativePath: string): void;
  /** @param relativePath the path relative to current "matchedRoute.location.pathname" */
  navigateToRel(relativePath: string): void;
  setRoutes(r: RouteObject[]): void;
  /** Redirect another path */
  replaceUrl(relativePath: string): void;
  setBasenameOrParent(value: string): void;
  /** for switch animation */
  setRootElement(div: HTMLDivElement | null): void;
};

const routeInputTableFor = ['setBasenameOrParent', 'setRootElement'] as const;
const routeOutputTableFor = ['routeCompiled', 'routeMatched'] as const;

type RouteEvents = {
  onBrowserHistoryPopstate(): void;
  routeCompiled(routeObjs: CompiledRouteObject[]): void;
  matchingUrl(pathWithQueryAndHash: {
    pathname: string; hash: string; search: string; searchParams: URLSearchParams
  }, isPopState?: boolean): void;
  routeMatched(r: MatchedRouteObject): void;
};

type PathWithQueryAndHash = {pathname: string; hash: string; search: string; searchParams: URLSearchParams};

export type RouteObject = {
  path: string;
  element?: React.ReactNode;
  redirect?: string;
};

export type Router = {
  matchedRoute: MatchedRouteObject | null;
  rootElement?: HTMLDivElement;
  control?: RxController<RouteActions>;
};

type CompiledRouteObject = RouteObject & {
  pathPattern?: RegExp;
  paramNames: string[];
};

export type MatchedRouteObject = CompiledRouteObject & {
  matchedParams: Record<string, string>;
  isPopState: boolean;
  /** The original location being navigated to */
  location: PathWithQueryAndHash;
};

export function useRouterProvider(basenameOrParent = '', routes: RouteObject[]) {
  // const state$ = React.useMemo(() => new rx.BehaviorSubject<RouterState>({}), []);
  const [router, setRouter] = React.useState<Router>({matchedRoute: null});

  const composite = React.useMemo(() => {
    const composite = new ReactorComposite<RouteActions, RouteEvents, typeof routeInputTableFor, typeof routeOutputTableFor>({
      name: 'router',
      debug: process.env.NODE_ENV === 'development',
      inputTableFor: routeInputTableFor,
      outputTableFor: routeOutputTableFor
    });
    const {i, o, r, inputTable, outputTable} = composite;
    i.dp.setBasenameOrParent(basenameOrParent);
    function onPopstate(evt: PopStateEvent) {
      o.dp.onBrowserHistoryPopstate();
    }

    r('Listen to popstate event', new rx.Observable<void>(() => {
      if (typeof window !== 'undefined') {
        window.addEventListener('popstate', onPopstate);
        return () => window.removeEventListener('popstate', onPopstate);
      }
    }));

    r('navigateToRel -> matchingUrl', i.pt.navigateToRel.pipe(
      op.withLatestFrom(outputTable.l.routeMatched, inputTable.l.setBasenameOrParent),
      op.map(([[, toPath], [, matchedRoute], [, basenameOrParent]]) => {
        const matchingUrl = new URL(toPath, new URL(matchedRoute.location.pathname, 'http://w.g.c'));
        const {pathname, search} = matchingUrl;
        if (typeof window !== 'undefined') {
          window.history.pushState({}, '', resolvePath(basenameOrParent, pathname + search));
        }
        o.dp.matchingUrl(matchingUrl);
      })
    ));

    r('navigateTo -> matchingUrl', i.pt.navigateTo.pipe(
      op.withLatestFrom(inputTable.l.setBasenameOrParent),
      op.map(([[, toPath], [, basenameOrParent]]) => {
        if (typeof window !== 'undefined') {
          window.history.pushState({}, '', resolvePath(basenameOrParent, toPath));
        }
        const tempURL = new URL(toPath, 'http://w.g.c');
        o.dp.matchingUrl(tempURL);
      })
    ));

    r('replaceUrl -> matchingUrl', i.pt.replaceUrl.pipe(
      op.withLatestFrom(inputTable.l.setBasenameOrParent),
      op.map(([[, toPath], [, basenameOrParent]]) => {
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, '', resolvePath(basenameOrParent, toPath));
        }
        o.dp.matchingUrl(new URL(toPath, 'http://w.g.c'));
      })
    ));

    r('setRoutes', i.pt.setRoutes.pipe(
      op.map(([, routes]) => {
        if (routes)
          o.dp.routeCompiled(compileRoutes(routes));
      })
    ));

    r('matchingUrl -> call matchRoute, dispatch routeMatched', o.pt.matchingUrl.pipe(
      op.switchMap(([m, url, isPopState]) => outputTable.l.routeCompiled.pipe(
        op.take(1),
        op.map(([, compiledRoutes]) => {
        // eslint-disable-next-line no-console
          console.log('Route to', url);
          const matched = matchRoute(compiledRoutes, url);
          if (matched) {
            matched.isPopState = !!isPopState;
            o.dpf.routeMatched(m, matched);
          }

          return matched?.redirect;
        })
      )),
      op.filter((r): r is string => r != null),
      op.observeOn(rx.asyncScheduler),
      op.map(redirect => i.dp.replaceUrl(redirect))
    ));

    r('onBrowserHistoryPopstate -> matchingUrl', o.at.onBrowserHistoryPopstate.pipe(
      op.withLatestFrom(inputTable.l.setBasenameOrParent),
      op.concatMap(([, [, basenameOrParent]]) => rx.timer(16).pipe(op.map(() => basenameOrParent))),
      op.map(basenameOrParent => {
        const temp = new URL((subPathOf(basenameOrParent, window.location.pathname) ?? window.location.pathname) + window.location.search + window.location.hash, window.location.href);
        o.dp.matchingUrl(temp, true);
      })
    ));

    r('sync setRootElement to setRouter', inputTable.l.setRootElement.pipe(
      rx.filter(([, el]) => el != null),
      rx.tap(([, rootElement]) => setRouter(s => ({...s, rootElement: rootElement!})))
    ));

    r('routeMatched -> sync outputTable to setRouter', outputTable.l.routeMatched.pipe(
      rx.tap(([, matchedRoute]) => setRouter(s => ({...s, matchedRoute})))
    ));

    // must be place after "matchingUrl" reactor
    r('initial window.location -> matchingUrl',
      rx.of(typeof window !== 'undefined' ? window.location.pathname : '').pipe(
        op.filter(url => !!url),
        op.withLatestFrom(inputTable.l.setBasenameOrParent),
        op.map(([pathname, [, basenameOrParent]]) => {
          o.dp.matchingUrl(new URL((subPathOf(basenameOrParent, pathname) ?? pathname) + window.location.search + window.location.hash, window.location.href));
        })
      )
    );


    i.dp.setRoutes(routes);
    setRouter(s => ({...s, control: composite.i}));
    return composite;
  }, [basenameOrParent, routes]);


  React.useEffect(() => {
    return () => {composite.destory(); };
  }, [composite]);

  return router;
}

export const RouterContext = React.createContext<Router | null>(null);

// export const RouterProvider: React.FC<React.PropsWithChildren<{basenameOrParent?: string; routes: RouteObject[]}>> = (props) => {
//   const router = useRouterProvider(props.basenameOrParent, props.routes);
//   return <RouterContext.Provider value={router}>{props.children}</RouterContext.Provider>;
// };

export function useRouter() {
  return React.useContext(RouterContext);
}

export function useNavigateHandler<C extends(...args: any[]) => void>(path: string): C {
  const router = useRouter();
  return React.useCallback(() => {
    router?.control?.dispatcher.navigateTo(path);
  }, [path, router?.control?.dispatcher]) as C;
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

function matchRoute(routes: CompiledRouteObject[], location: PathWithQueryAndHash) {
  let matched: MatchedRouteObject | undefined;
  // location = /^(.*?)\/*$/.exec(location)![1];
  for (const route of routes) {
    if (route.pathPattern) {
      const res = route.pathPattern.exec(location.pathname);
      if (res == null)
        continue;
      matched = route as MatchedRouteObject;
      let i = 1;
      matched.matchedParams = {};
      for (const param of route.paramNames) {
        matched.matchedParams[param] = res[i++];
      }
      matched.location = location;
      return matched;
    } else if (route.path === location.pathname) {
      (route as MatchedRouteObject).matchedParams = {};
      (route as MatchedRouteObject).location = location;
      return (route as MatchedRouteObject);
    }
  }
}

export const testable = {compileRoutes, matchRoute};

