import {dispatcher} from '@wfh/doc-ui-common/client/markdown/markdownSlice';
import loadable from '@loadable/component';
import {ShowTopLoading} from '@wfh/doc-ui-common/client/components/ShowTopLoading';
import {AnimatableRoutesProps} from '@wfh/doc-ui-common/client/animation/AnimatableRoutes';
import {bootstrap} from './main/clientApp';
// import intro from '@wfh/doc-ui-common/dist/markdown-loader!../docs/zh/architecture/intro.md';
// import sample from './sample.md.js!=!@wfh/doc-ui-common/dist/markdown-loader!../docs/zh/architecture/sample.md';
// import design1 from '@wfh/doc-ui-common/dist/markdown-loader!@wfh/assets-processer/ts/proxy-cache/design.md';

dispatcher.registerFiles({
  sample: () => import(
    './sample.md.js!=!@wfh/doc-ui-common/dist/markdown-loader!./docs/zh/architecture/sample.md'
  ).then(res => res.default)
  // design1
});

const LazyDocComponent = loadable(async () => {
  return (await import('./feature/article/ArticalePage')).ArticalePage;
}, {fallback: <ShowTopLoading/>});

const routes: AnimatableRoutesProps['routes'] = [
  {path: '/doc/:mdKey', element: <LazyDocComponent/>},
  {path: '/*', redirect: '/doc/sample'}
];
// const worker = new Worker(new URL('./feature/demo/worker', import.meta.url));
bootstrap({routes});

