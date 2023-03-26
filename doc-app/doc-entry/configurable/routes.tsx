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
  {path: '/test', element: 'test ok'},
  {path: '/demo/background', element: <BgDemo/>},
  {path: '/demo/background-blur', element: <BgBlurDemo/>},
  {path: '/demo/surface', element: <SurfaceDemo/>},
  {path: '/demo', element: <LazyDemoComponent/>},
  {path: '/doc/:mdKey', element: <LazyDocComponent/>}
];

export const defaultRedirect = '/demo';
