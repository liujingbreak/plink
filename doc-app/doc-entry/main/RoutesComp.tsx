import React from 'react';
// import classnames from 'classnames/bind';
// import styles from './RoutesComp.module.scss';
import {Redirect, Switch} from 'react-router-dom';
import loadable from '@loadable/component';
import {ShowTopLoading} from '@wfh/doc-ui-common/client/components/ShowTopLoading';
// import {SwitchAnim} from '@wfh/doc-ui-common/client/animation//SwitchAnim';

import {AnimatableRoutes} from '@wfh/doc-ui-common/client/animation/AnimatableRoutes';

export type RoutesCompProps = React.PropsWithChildren<{
}>;

const LazyDocComponent = loadable(async () => {
  return (await import('../feature/article/ArticalePage')).ArticalePage;
}, {fallback: <ShowTopLoading/>});

const LazyDemoComponent = loadable(async () => {
  return (await import('../feature/demo/DemoPage')).DemoPage;
}, {fallback: <ShowTopLoading/>});

const RoutesComp: React.FC<RoutesCompProps> = function(prop) {
  return (
    // <TopAppBar title='' type='dense'>
      <AnimatableRoutes routes={[
        {path: '/test', children: 'test ok'},
        {path: '/demo/:demoId', children: <LazyDemoComponent/>},
        {path: '/demo', children: <LazyDemoComponent/>},
        {path: '/doc/:mdKey', children: <LazyDocComponent/>}
      ]}>
        <Switch>
          <Redirect from='/' exact to='/demo'/>
        </Switch>
      </AnimatableRoutes>
    // </TopAppBar>
  );
};

export {RoutesComp};
