// import type {ShowTopLoading as ShowTopLoadingType} from '@wfh/doc-ui-common/client/components/ShowTopLoading';
import {bootstrapRoutesWith} from '@wfh/doc-entry/dll/shell-entry';
import loadable from '@loadable/component';
import {markdownsControl} from '@wfh/doc-ui-common/client/markdown/markdownSlice';

bootstrapRoutesWith((ShowTopLoading) => {
  const LazyDocComponent = loadable(async () => {
    return (await import('../article/ArticalePage')).ArticalePage;
  }, {fallback: <ShowTopLoading/>});

  markdownsControl.i.dp.registerFiles({
    reactivizer: () => import('@wfh/reactivizer/README.md.js!=!@wfh/doc-ui-common/dist/markdown-loader!@wfh/reactivizer/README.md').then(res => res.default),
    algorithms: () => import('@wfh/algorithms/README.md.js!=!@wfh/doc-ui-common/dist/markdown-loader!@wfh/algorithms/README.md').then(res => res.default),
    reactivizerP2: () => import('@wfh/algorithms/README.md.js!=!@wfh/doc-ui-common/dist/markdown-loader!@wfh/reactivizer/docs/compare-with-OOP.md').then(res => res.default)
  });
  return [
    {path: '/readme/:mdKey', element: <LazyDocComponent/>},
    {path: '/*', redirect: '/readme/reactivizer'}
  ];
});
