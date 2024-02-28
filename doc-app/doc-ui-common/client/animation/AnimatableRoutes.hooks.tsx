import trim from 'lodash/trim';
import escapeRegExp from 'lodash/escapeRegExp';
import React from 'react';
import {ReactorComposite2, SingleActionFactory, RxController2} from '@wfh/reactivizer';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';

type RouteActions = {
  /** @param relativePath the path relative to "basenameOrParent" */
  navigateTo(relativePath: string): SingleActionFactory;
  /** @param relativePath the path relative to current "matchedRoute.location.pathname" */
  navigateToRel(relativePath: string): SingleActionFactory;
  setRoutes(r: RouteObject[]): SingleActionFactory;
  /** Redirect another path */
  replaceUrl(relativePath: string): SingleActionFactory;
  setBasenameOrParent(value: string): SingleActionFactory;
  /** for switch animation */
  setRootElement(div: HTMLDivElement | null): SingleActionFactory;
};

const routeInputTableFor = ['setBasenameOrParent', 'setRootElement'] as const;
const routeOutputTableFor = ['routeCompiled', 'routeMatched'] as const;

type RouteEvents = {
  onBrowserHistoryPopstate(): SingleActionFactory;
  routeCompiled(routeObjs: CompiledRouteObject[]): SingleActionFactory;
  matchingUrl(pathWithQueryAndHash: {
    pathname: string; hash: string; search: string; searchParams: URLSearchParams;
  }, isPopState?: boolean): SingleActionFactory;
  routeMatched(r: MatchedRouteObject): SingleActionFactory;
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
  control?: RxController2<RouteActions>;
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
    const composite = new ReactorComposite2<RouteActions, RouteEvents, typeof routeInputTableFor, typeof routeOutputTableFor>({
      name: 'router',
      debug: process.env.NODE_ENV === 'development',
      inputTableFor: routeInputTableFor,
      outputTableFor: routeOutputTableFor
    });
    const {i, o, r, inputTable, outputTable} = composite;
    i.ft.setBasenameOrParent(basenameOrParent).dp();
    function onPopstate(evt: PopStateEvent) {
      o.ft.onBrowserHistoryPopstate().dp();
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
        o.ft.matchingUrl(matchingUrl).dp();
      })
    ));

    r('navigateTo -> matchingUrl', i.pt.navigateTo.pipe(
      op.withLatestFrom(inputTable.l.setBasenameOrParent),
      op.map(([[, toPath], [, basenameOrParent]]) => {
        if (typeof window !== 'undefined') {
          window.history.pushState({}, '', resolvePath(basenameOrParent, toPath));
        }
        const tempURL = new URL(toPath, 'http://w.g.c');
        o.ft.matchingUrl(tempURL).dp();
      })
    ));

    r('replaceUrl -> matchingUrl', i.pt.replaceUrl.pipe(
      op.withLatestFrom(inputTable.l.setBasenameOrParent),
      op.map(([[, toPath], [, basenameOrParent]]) => {
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, '', resolvePath(basenameOrParent, toPath));
        }
        o.ft.matchingUrl(new URL(toPath, 'http://w.g.c')).dp();
      })
    ));

    r('setRoutes', i.pt.setRoutes.pipe(
      op.map(([, routes]) => {
        if (routes)
          o.ft.routeCompiled(compileRoutes(routes)).dp();
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
            o.ft.routeMatched(matched).dp(m);
          }

          return matched?.redirect;
        })
      )),
      op.filter((r): r is string => r != null),
      op.observeOn(rx.asyncScheduler),
      op.map(redirect => i.ft.replaceUrl(redirect).dp())
    ));

    r('onBrowserHistoryPopstate -> matchingUrl', o.at.onBrowserHistoryPopstate.pipe(
      op.withLatestFrom(inputTable.l.setBasenameOrParent),
      op.concatMap(([, [, basenameOrParent]]) => rx.timer(16).pipe(op.map(() => basenameOrParent))),
      op.map(basenameOrParent => {
        const temp = new URL((subPathOf(basenameOrParent, window.location.pathname) ?? window.location.pathname) + window.location.search + window.location.hash, window.location.href);
        o.ft.matchingUrl(temp, true).dp();
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
          o.ft.matchingUrl(new URL((subPathOf(basenameOrParent, pathname) ?? pathname) + window.location.search + window.location.hash, window.location.href)).dp();
        })
      )
    );


    i.ft.setRoutes(routes).dp();
    setRouter(s => ({...s, control: composite.i}));
    return composite;
  }, [basenameOrParent, routes]);


  React.useEffect(() => {
    return () => {composite.dispose(); };
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
    router?.control?.ft.navigateTo(path).dp();
  }, [path, router?.control?.ft]) as C;
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
        matched.matchedParams[param] = decodeURIComponent(res[i++]);
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

