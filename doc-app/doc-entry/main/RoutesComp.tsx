import React from 'react';
// import classnames from 'classnames/bind';
// import styles from './RoutesComp.module.scss';
// import {Switch, Route} from 'react-router-dom';
import loadable from '@loadable/component';
import {AnimatableRoutes} from '@wfh/doc-ui-common/client/animation/AnimatableRoutes';

export type RoutesCompProps = React.PropsWithChildren<{
}>;

const LazyDocComponent = loadable(async () => {
  return (await import('../feature/article/ArticalePage')).ArticalePage;
}, {fallback: <>loading...</>});

const RoutesComp: React.FC<RoutesCompProps> = function(prop) {
  // const location = useLocation();
  // const [currLocation, setLocation] = React.useState<ReturnType<typeof useLocation>>(location);
  // React.useEffect(() => {
  //   setTimeout(() => setLocation(location), 500);
  // }, [location]);

  return (
    <AnimatableRoutes routes={[
      {path: '/test', component: 'test ok'},
      {path: '/doc/:mdKey', component: <LazyDocComponent/>}
    ]}/>
    // <Switch>
    //   <Route path='/test'>test ok</Route>
    //   <Route path='/doc/:mdKey'><LazyDocComponent/></Route>
    // </Switch>
  );
};

export {RoutesComp};
