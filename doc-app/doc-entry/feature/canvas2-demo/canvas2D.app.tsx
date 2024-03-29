import loadable from '@loadable/component';
import {ShowTopLoading} from '@wfh/doc-ui-common/client/components/ShowTopLoading';
import {AnimatableRoutesProps} from '@wfh/doc-ui-common/client/animation/AnimatableRoutes';
import {markdownsControl} from '@wfh/doc-ui-common/client/markdown/markdownSlice';
import {bootstrapRoutesWith} from '@wfh/doc-entry/dll/shell-entry';

bootstrapRoutesWith(() => {
  const LazyCanvasDemo = loadable(async () => {
    return (await import('./Canvas2Demo')).Canvas2Demo;
  }, {fallback: <ShowTopLoading/>});

  const LazyCanvasFake3dDemo = loadable(async () => {
    return (await import('./CanvasFake3dDemo')).Canvas2Demo;
  }, {fallback: <ShowTopLoading/>});

  markdownsControl.i.dp.registerFiles({
    understand3d: () => import(
      './understand.md.js!=!@wfh/doc-ui-common/dist/markdown-loader!@wfh/doc-ui-common/client/graphics/understand-transformation-matrix.md'
    ).then(res => res.default),

    'fork-worker': () => import(
      './fork-worker-pool.md.js!=!@wfh/doc-ui-common/dist/markdown-loader!@wfh/doc-ui-common/client/utils/fork-worker-pool.md'
    ).then(res => res.default)
    // design1
  });

  const LazyDocComponent = loadable(async () => {
    return (await import('../article/ArticalePage')).ArticalePage;
  }, {fallback: <ShowTopLoading/>});

  const routes: AnimatableRoutesProps['routes'] = [
    {path: '/doc/:mdKey', element: <LazyDocComponent/>},
    {path: '/demo-2d', element: <LazyCanvasDemo/>},
    {path: '/demo-3d', element: <LazyCanvasFake3dDemo/>},
    {path: '/*', redirect: '/demo-2d'}
  ];

  return routes;
});
// const worker = new Worker(new URL('./feature/demo/worker', import.meta.url));
// bootstrapRoutes({routes});
