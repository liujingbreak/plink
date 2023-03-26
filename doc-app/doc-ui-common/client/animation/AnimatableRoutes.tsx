import React from 'react';
import clsDdp from 'classnames/dedupe';
import {useLocation, matchPath, RouteObject} from 'react-router-dom';
import {PayloadAction} from '@reduxjs/toolkit';
import {useAppLayout} from '../components/appLayout.state';
import {SwitchAnim} from './SwitchAnim';
import styles from './AnimatableRoutes.module.scss';
// import * as rx from 'rxjs';
// import * as op from 'rxjs/operators';

export type AnimatableRoutesProps = React.PropsWithChildren<{
  parentDom?: {className: string} | null;
  className?: string;
  /** imutable */
  routes: RouteObject[];
  /**  */
  otherMatch?: string;
}>;

const RouteMatchCtx = React.createContext<ReturnType<typeof matchPath>>(null);

interface AnimatableRoutesState {
  matchedIdx: number | undefined;
  routeMatch: ReturnType<typeof matchPath> | null;
}

const reducer: React.Reducer<AnimatableRoutesState, PayloadAction<(state: AnimatableRoutesState) => AnimatableRoutesState>> = function(s, action) {
  return action.payload(s);
};

const AnimatableRoutes: React.FC<AnimatableRoutesProps> = function(prop) {
  const [state, dispatcher] = React.useReducer(reducer, {matchedIdx: undefined, routeMatch: null} as AnimatableRoutesState);
  const location = useLocation();

  const rootRef = React.useRef<HTMLDivElement>(null);
  const layout = useAppLayout();

  useMatch();

  React.useEffect(() => {
    // console.log('location path:', location.pathname);
    let i = 0;
    let matched = false;
    for (const route of prop.routes) {
      const match = matchPath(route.path!, location.pathname);
      if (match) {
        const matchedIdx = i;
        dispatcher({type: 'setMatched', payload: (s) => {
          return {...s, matchedIdx, routeMatch: match};
        }});
        matched = true;
        break;
      }
      i++;
    }
    if (!matched) {
      // setMatchedIdx(undefined);
      dispatcher({type: 'clearMatchedIdx', payload: (s) => {
        return {...s, matchedIdx: undefined, routeMatch: null};
      }});
    }
  }, [location.pathname, prop.routes]);

  // When route is switched, scroll to top
  React.useEffect(() => {
    if (state.matchedIdx != null && layout) {
      layout.actionDispatcher.scrollTo([0, 0]);
    }
  }, [layout, state.matchedIdx]);

  React.useEffect(() => {
    if (prop.parentDom) {
      prop.parentDom.className = clsDdp(prop.parentDom.className, styles.scope, prop.className);
    }
  }, [prop.className, prop.parentDom]);

  const content = <RouteMatchCtx.Provider value={state.routeMatch}>
    { state.matchedIdx != null ? // prop.routes[state.matchedIdx].children :
      <SwitchAnim debug={false} size="full" parentDom={prop.parentDom == null ? rootRef.current : prop.parentDom}
        contentHash={state.matchedIdx}>{prop.routes[state.matchedIdx].element}</SwitchAnim> :
      prop.children ? prop.children : <></>
    }
  </RouteMatchCtx.Provider>;

  return prop.parentDom
    ? content
    : (
      <div ref={rootRef} className={clsDdp(styles.scope, prop.className)}>
        {content}
      </div>
    );
};


export {AnimatableRoutes};

export function useParams<Params extends {[K in keyof Params]?: string} = Record<string, any>>(): Params {
  const match = React.useContext(RouteMatchCtx);
  return (match?.params || {}) as Params;
}

/**
 * Unlike react-router's useMatch(path), this function return currently "matched" path
 */
export function useMatch<Params extends {[K in keyof Params]?: string} = Record<string, any>>()  {
  return React.useContext(RouteMatchCtx);
}
