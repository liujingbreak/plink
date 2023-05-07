import trim from 'lodash/trim';
import escapeRegExp from 'lodash/escapeRegExp';
import React from 'react';
import {ActionStreamControl, createActionStreamByType} from '@wfh/redux-toolkit-observable/rx-utils';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';

type RouteActions = {
  onBrowserHistoryPopstate(): void;
  navigateTo(relativePath: string): void;
  /** Redirect another path */
  replaceUrl(relativePath: string): void;
  unmount(): void;
};

export type RouteObject = {
  path: string;
  element?: React.ReactNode;
  redirect?: string;
};

export type Router = {
  matchedRoute: MatchedRouteObject | null;
  control: ActionStreamControl<RouteActions>;
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

export function useRouter(basenameOrParent = '', routes: RouteObject[]) {
  const state$ = React.useMemo(() => new rx.BehaviorSubject<RouterState>({}), []);
  const control = React.useMemo(() => createActionStreamByType<RouteActions>({debug: 'router'}), []);
  const [matchedRoute, setMatchedRoute] = React.useState<Router>({matchedRoute: null, control});

  React.useMemo(() => {
    state$.next({...state$.getValue(), basenameOrParent});
  }, [basenameOrParent, state$]);

  React.useMemo(() => {
    state$.next({...state$.getValue(), routes});
  }, [routes, state$]);

  React.useMemo(() => {
    function onPopstate(evt: PopStateEvent) {
      control.dispatcher.onBrowserHistoryPopstate();
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

    rx.merge(
      new rx.Observable<void>(sub => {
        if (typeof window !== 'undefined') {
          window.addEventListener('popstate', onPopstate);
          return () => window.removeEventListener('popstate', onPopstate);
        }
      }),

      rx.merge(
        control.actionOfType('onBrowserHistoryPopstate').pipe(
          op.withLatestFrom(basenameOrParent$),
          op.concatMap(([, basenameOrParent]) => rx.timer(16).pipe(op.mapTo(basenameOrParent))),
          op.map(basenameOrParent => {
            return subPathOf(basenameOrParent, window.location.pathname) ?? window.location.pathname;
          })
        ),
        control.actionOfType('navigateTo').pipe(
          op.withLatestFrom(basenameOrParent$),
          op.map(([{payload: toPath}, basenameOrParent]) => {
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', resolvePath(basenameOrParent, toPath));
            }
            return toPath;
          })
        ),
        control.actionOfType('replaceUrl').pipe(
          op.withLatestFrom(basenameOrParent$),
          op.map(([{payload: toPath}, basenameOrParent]) => {
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
            setMatchedRoute(s => ({...s, matchedRoute: matched}));

          return matched?.redirect;
        }),
        op.filter((r): r is string => r != null),
        op.observeOn(rx.asyncScheduler),
        op.map(redirect => control.dispatcher.replaceUrl(redirect))
      ),
      // build compiledRoutes
      state$.pipe(
        op.map(s => s.routes),
        op.distinctUntilChanged(),
        op.map(routes => {
          if (routes)
            state$.next({
              ...state$.getValue(),
              compiledRoutes: compileRoutes(routes)
            });
        })
      )
    ).pipe(
      op.catchError((err, action$) => {
        console.error(err);
        void Promise.resolve().then(() => {throw err; }); // let window level error handler catch it as uncaught rejection
        return action$;
      }),
      op.takeUntil(control.actionOfType('unmount'))
    ).subscribe();
  }, [control, state$]);

  React.useEffect(() => {
    return () => control.dispatcher.unmount();
  }, [control.dispatcher]);

  return matchedRoute;
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

