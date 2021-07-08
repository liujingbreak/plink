import React from 'react';
import loadable from '@loadable/component';
import {ShowTopLoading} from '@wfh/doc-ui-common/client/components/ShowTopLoading';
import {AnimatableRoutesProps} from '@wfh/doc-ui-common/client/animation/AnimatableRoutes';

const LazyDocComponent = loadable(async () => {
  return (await import('../feature/article/ArticalePage')).ArticalePage;
}, {fallback: <ShowTopLoading/>});

const LazyDemoComponent = loadable(async () => {
  return (await import('../feature/demo/DemoPage')).DemoPage;
}, {fallback: <ShowTopLoading/>});

const BgBlurDemo = loadable(async () => {
  return (await import('../feature/demo/BackgroundBlurDemo')).BackgroundBlurDemo;
}, {fallback: <ShowTopLoading/>});

const BgDemo = loadable(async () => {
  return (await import('../feature/demo/BackgroundDemo')).BackgroundDemo;
}, {fallback: <ShowTopLoading/>});

const SurfaceDemo = loadable(async () => {
  return (await import('../feature/demo/SurfaceBackgroundDemo')).SurfaceBackgroundDemo;
});

export const routes: AnimatableRoutesProps['routes'] = [
  {path: '/test', children: 'test ok'},
  {path: '/demo/background', children: <BgDemo/>},
  {path: '/demo/background-blur', children: <BgBlurDemo/>},
  {path: '/demo/surface', children: <SurfaceDemo/>},
  {path: '/demo', children: <LazyDemoComponent/>},
  {path: '/doc/:mdKey', children: <LazyDocComponent/>}
];

export const defaultRedirect = '/demo';
