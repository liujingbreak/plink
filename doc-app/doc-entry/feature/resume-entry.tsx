import {bootstrapRoutesWith} from '@wfh/doc-entry/dll/shell-entry';
import loadable from '@loadable/component';
import {markdownsControl} from '@wfh/doc-ui-common/client/markdown/markdownSlice';
import {ShowTopLoading} from '@wfh/doc-ui-common/client/components/ShowTopLoading';

bootstrapRoutesWith(() => {
  const LazyDocComponent = loadable(async () => {
    return (await import('@wfh/doc-entry/feature/article/ArticalePage')).ArticalePage;
  }, {fallback: <ShowTopLoading/>});

  markdownsControl.i.dp.registerFiles({
    index: () => import('@wfh/resumes/README.md.js!=!@wfh/doc-ui-common/dist/markdown-loader!@wfh/resumes/4mgr/index.md').then(res => res.default),
    'bio-en': () => import('@wfh/resumes/README.md.js!=!@wfh/doc-ui-common/dist/markdown-loader!@wfh/resumes/4mgr/liujing.2023.b1.en.md').then(res => res.default),
    'bio-zh': () => import('@wfh/resumes/README.md.js!=!@wfh/doc-ui-common/dist/markdown-loader!@wfh/resumes/4mgr/liujing.2023.b1.zh.md').then(res => res.default),
    coupang: () => import('@wfh/resumes/README.md.js!=!@wfh/doc-ui-common/dist/markdown-loader!@wfh/resumes/4mgr/coupang.md').then(res => res.default),
    'coupang-gallery.md': () => import('@wfh/resumes/README.md.js!=!@wfh/doc-ui-common/dist/markdown-loader!@wfh/resumes/4mgr/coupang-gallery.md').then(res => res.default),
    'beike.md': () => import('@wfh/resumes/README.md.js!=!@wfh/doc-ui-common/dist/markdown-loader!@wfh/resumes/4mgr/beike.md').then(res => res.default)
  });
  return [
    {path: '/doc/:mdKey', element: <LazyDocComponent/>},
    {path: '/markdown/open', element: <LazyDocComponent/>},
    {path: '/bio/:mdKey', element: <LazyDocComponent/>},
    {path: '/*', redirect: '/bio/index'}
  ];
});
