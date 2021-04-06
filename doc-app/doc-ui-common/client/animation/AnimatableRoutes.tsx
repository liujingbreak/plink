import React from 'react';
// import classnames from 'classnames/bind';
import styles from './AnimatableRoutes.module.scss';
import {SwitchAnim, SwitchAnimProps} from './SwitchAnim';
import {useLocation, matchPath, RouteProps, match} from 'react-router-dom';
import {PayloadAction} from '@reduxjs/toolkit';

export type AnimatableRoutesProps = React.PropsWithChildren<{
  /** imutable */
  routes: Array<{[p in 'path' | 'strict' | 'exact' | 'sensitive']?: RouteProps[p]} & {children: SwitchAnimProps['children']}>;
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
  // const location = useLocation();
  // const [matchedIdx, setMatchedIdx] = React.useState<number>();
  const [state, dispatcher] = React.useReducer(reducer, {matchedIdx: undefined, routeMatch: null} as AnimatableRoutesState);
  const location = useLocation();


  React.useEffect(() => {
    // console.log('location path:', location.pathname);
    let i = 0;
    let matched = false;
    for (const route of prop.routes) {
      const match = matchPath<{[p: string]: string}>(location.pathname, route);
      if (match) {
        dispatcher({type: 'setMatched', payload: (s) => {
          return {...s, matchedIdx: i, routeMatch: match};
        }});
        matched = true;
        console.log(match);
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
  }, [location.pathname]);

  // const routes = React.useMemo(() => prop.routes.map(({path, component}, idx) => {
  //   // tslint:disable-next-line: no-console
  //   // console.log('render', location);

  //   const DynamicComp: React.FC = function(dynamicCompProp) {
  //     const routeParams = useParams<{mdKey: string}>();
  //     React.useEffect(() => {
  //       // tslint:disable-next-line: no-console
  //       console.log('create route comp ', idx, path, routeParams);

  //       setMatchedIdx(idx);
  //       return () => {
  //         // console.log('destroy', path);
  //       };
  //     }, []);
  //     return null;
  //   };
  //   return <Route key={path} path={path}><DynamicComp/></Route>;
  // }), [prop.routes]);

  return (
    <div className={styles.scope}>
      <RouteMatchCtx.Provider value={state.routeMatch}>
      { state.matchedIdx != null ?
          <SwitchAnim contentHash={state.matchedIdx}>{prop.routes[state.matchedIdx].children}</SwitchAnim> :
          prop.children ? prop.children : <></>
      }
      </RouteMatchCtx.Provider>
    </div>
  );
};


export {AnimatableRoutes};

export function useParams<Params extends { [K in keyof Params]?: string } = {}>(): Params {
  const match = React.useContext(RouteMatchCtx);
  return (match?.params || {}) as Params;
}

export function useMatch<Params extends { [K in keyof Params]?: string } = {}>()  {
  return React.useContext(RouteMatchCtx) as match<Params>;
}
