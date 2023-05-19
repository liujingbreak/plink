/// <reference path="./types.d.ts"/>
import {dispatcher} from '@wfh/doc-ui-common/client/markdown/markdownSlice';
import loadable from '@loadable/component';
import {ShowTopLoading} from '@wfh/doc-ui-common/client/components/ShowTopLoading';
import {AnimatableRoutesProps} from '@wfh/doc-ui-common/client/animation/AnimatableRoutes';
import {bootstrap} from './main/clientApp';
// import intro from '@wfh/doc-ui-common/dist/markdown-loader!../docs/zh/architecture/intro.md';
// import sample from './sample.md.js!=!@wfh/doc-ui-common/dist/markdown-loader!../docs/zh/architecture/sample.md';
// import design1 from '@wfh/doc-ui-common/dist/markdown-loader!@wfh/assets-processer/ts/proxy-cache/design.md';

export default function() {
  dispatcher.registerFiles({
    // intro
    sample: () => import(
      './sample.md.js!=!@wfh/doc-ui-common/dist/markdown-loader!./docs/zh/architecture/sample.md'
    ).then(res => res.default)
    // design1
  });
}

const LazyDocComponent = loadable(async () => {
  return (await import('./feature/article/ArticalePage')).ArticalePage;
}, {fallback: <ShowTopLoading/>});

const LazyDemoComponent = loadable(async () => {
  return (await import('./feature/demo/DemoPage')).DemoPage;
}, {fallback: <ShowTopLoading/>});

const BgBlurDemo = loadable(async () => {
  return (await import('./feature/demo/BackgroundBlurDemo')).BackgroundBlurDemo;
}, {fallback: <ShowTopLoading/>});

const BgDemo = loadable(async () => {
  return (await import('./feature/demo/BackgroundDemo')).BackgroundDemo;
}, {fallback: <ShowTopLoading/>});

const SurfaceDemo = loadable(async () => {
  return (await import('./feature/demo/SurfaceBackgroundDemo')).SurfaceBackgroundDemo;
});

export const routes: AnimatableRoutesProps['routes'] = [
  {path: '/test', element: 'test ok'},
  {path: '/demo/background', element: <BgDemo/>},
  {path: '/demo/background-blur', element: <BgBlurDemo/>},
  {path: '/demo/surface', element: <SurfaceDemo/>},
  {path: '/demo', element: <LazyDemoComponent/>},
  {path: '/doc/:mdKey', element: <LazyDocComponent/>},
  {path: '/*', redirect: '/test'}
];

bootstrap({routes});

