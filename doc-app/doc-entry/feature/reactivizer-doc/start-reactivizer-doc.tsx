import loadable from '@loadable/component';

void import('@wfh/doc-entry/remote-entries/shell/shell-entry')
  .then((shell) => {
    const {bootstrapRoutesWith} = shell;
    bootstrapRoutesWith((ShowTopLoading, mdDispatcher) => {
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
  });

export {};
