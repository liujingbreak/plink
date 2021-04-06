import React from 'react';
// import classnames from 'classnames/bind';
// import styles from './RoutesComp.module.scss';
import {Redirect, Switch} from 'react-router-dom';
import loadable from '@loadable/component';
// import {SwitchAnim} from '@wfh/doc-ui-common/client/animation//SwitchAnim';

import {AnimatableRoutes} from '@wfh/doc-ui-common/client/animation/AnimatableRoutes';
import { TopAppBar } from '@wfh/doc-ui-common/client/material/TopAppBar';

export type RoutesCompProps = React.PropsWithChildren<{
}>;

const LazyDocComponent = loadable(async () => {
  return (await import('../feature/article/ArticalePage')).ArticalePage;
}, {fallback: <>...</>});

const LazyDemoComponent = loadable(async () => {
  return (await import('../feature/demo/DemoPage')).DemoPage;
}, {fallback: <>...</>});

const RoutesComp: React.FC<RoutesCompProps> = function(prop) {
  return (
    <>
    <TopAppBar title='' type='short'/>
    <AnimatableRoutes routes={[
      {path: '/test', children: 'test ok'},
      {path: '/demo/:demoId', children: <LazyDemoComponent/>},
      {path: '/demo', children: <LazyDemoComponent/>},
      {path: '/doc/:mdKey', children: <LazyDocComponent/>}
    ]}>
      <Switch>
        <Redirect from='/' exact to='/demo'/>
      </Switch>
    </AnimatableRoutes></>
  );
};

export {RoutesComp};
