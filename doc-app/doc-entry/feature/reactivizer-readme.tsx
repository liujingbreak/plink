// import type {ShowTopLoading as ShowTopLoadingType} from '@wfh/doc-ui-common/client/components/ShowTopLoading';
import {bootstrapRoutesWith} from '@wfh/doc-entry/dll/shell-entry';
import loadable from '@loadable/component';
import {markdownsControl} from '@wfh/doc-ui-common/client/markdown/markdownSlice';
import {ShowTopLoading} from '@wfh/doc-ui-common/client/components/ShowTopLoading';

bootstrapRoutesWith(() => {
  const LazyDocComponent = loadable(async () => {
    return (await import('./article/ArticalePage')).ArticalePage;
  }, {fallback: <ShowTopLoading/>});

  const SurfaceDemo = loadable(async () => {
    return (await import('./demo/SurfaceBackgroundDemo')).SurfaceBackgroundDemo;
  });
  markdownsControl.i.dp.registerFiles({
    reactivizer: () => import('@wfh/reactivizer/README.md.js!=!@wfh/doc-ui-common/dist/markdown-loader!@wfh/reactivizer/README.md').then(res => res.default),
    'compare-with-OOP': () => import('@wfh/reactivizer/README.md.js!=!@wfh/doc-ui-common/dist/markdown-loader!@wfh/reactivizer/docs/compare-with-OOP.md').then(res => res.default),
    algorithms: () => import('@wfh/algorithms/README.md.js!=!@wfh/doc-ui-common/dist/markdown-loader!@wfh/algorithms/README.md').then(res => res.default),
    reactivizerP2: () => import('@wfh/algorithms/README.md.js!=!@wfh/doc-ui-common/dist/markdown-loader!@wfh/reactivizer/docs/compare-with-OOP.md').then(res => res.default),
    reactivizerForkJoin: () => import('@wfh/algorithms/README.md.js!=!@wfh/doc-ui-common/dist/markdown-loader!@wfh/reactivizer/docs/fork-join.md').then(res => res.default)
  });
  return [
    {path: '/readme/:mdKey', element: <LazyDocComponent/>},
    {path: '/markdown/open', element: <LazyDocComponent/>},
    {path: '/demo/surface', element: <SurfaceDemo/>},
    {path: '/*', redirect: '/readme/reactivizer'}
  ];
});
