// import type {ShowTopLoading as ShowTopLoadingType} from '@wfh/doc-ui-common/client/components/ShowTopLoading';
import loadable from '@loadable/component';
import {dispatcher as mdDispatcher} from '@wfh/doc-ui-common/client/markdown/markdownSlice';
import {bootstrapRoutesWith} from '../../dll/shell-entry';

bootstrapRoutesWith((ShowTopLoading) => {
  const LazyDocComponent = loadable(async () => {
    return (await import('../article/ArticalePage')).ArticalePage;
  }, {fallback: <ShowTopLoading/>});

  mdDispatcher.registerFiles({
    reactivizer: () => import('@wfh/reactivizer/README.md.js!=!@wfh/doc-ui-common/dist/markdown-loader!@wfh/reactivizer/README.md').then(res => res.default),
    algorithms: () => import('@wfh/algorithms/README.md.js!=!@wfh/doc-ui-common/dist/markdown-loader!@wfh/algorithms/README.md').then(res => res.default),
    reactivizerP2: () => import('@wfh/algorithms/README.md.js!=!@wfh/doc-ui-common/dist/markdown-loader!@wfh/reactivizer/docs/compare-with-OOP.md').then(res => res.default)
  });
  return [
    {path: '/readme/:mdKey', element: <LazyDocComponent/>},
    {path: '/*', redirect: '/readme/reactivizer'}
  ];
});
