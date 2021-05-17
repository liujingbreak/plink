import React from 'react';
import loadable from '@loadable/component';
import {ShowTopLoading} from '@wfh/doc-ui-common/client/components/ShowTopLoading';

export type RoutesCompProps = React.PropsWithChildren<{
}>;

const LazyDocComponent = loadable(async () => {
  return (await import('../feature/article/ArticalePage')).ArticalePage;
}, {fallback: <ShowTopLoading/>});

const LazyDemoComponent = loadable(async () => {
  return (await import('../feature/demo/DemoPage')).DemoPage;
}, {fallback: <ShowTopLoading/>});


export const routes = [
  {path: '/test', children: 'test ok'},
  {path: '/demo/:demoId', children: <LazyDemoComponent/>},
  {path: '/demo', children: <LazyDemoComponent/>},
  {path: '/doc/:mdKey', children: <LazyDocComponent/>}
];

export const defaultRedirect = '/demo';
