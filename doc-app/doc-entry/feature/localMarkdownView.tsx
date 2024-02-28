import * as rx from 'rxjs';
import {fromFetch} from 'rxjs/fetch';
import {bootstrapRoutesWith} from '@wfh/doc-entry/dll/shell-entry';
import {LoaderRecivedData} from '@wfh/doc-ui-common/isom/md-types';
import loadable from '@loadable/component';
import {markdownsControl} from '@wfh/doc-ui-common/client/markdown/markdownSlice';
import {ShowTopLoading} from '@wfh/doc-ui-common/client/components/ShowTopLoading';

declare global {
  const __localMarkdownViewLinks: string[];
  interface Window {
    __localMarkdownViewLinks: string[];
  }
}

bootstrapRoutesWith(() => {
  const LazyDocComponent = loadable(async () => {
    return (await import('./article/ArticalePage')).ArticalePage;
  }, {fallback: <ShowTopLoading/>});

  const initialUrl = new URL(window.location.href); // There a query parameter "?file=" in URL
  initialUrl.pathname = '/doc-ui-common/markdown-local/md';

  markdownsControl.i.ft.registerFiles({
    local: () => importMarkdown(initialUrl.toString())
  }).dp();

  if (typeof window.__localMarkdownViewLinks !== 'undefined') {
    importMarkdownOfHashes(initialUrl.toString(), __localMarkdownViewLinks);
  }

  return [
    {path: '/markdown/:mdKey', element: <LazyDocComponent/>},
    {path: '/*', redirect: '/markdown/local'}
  ];
});

function importMarkdown(serverUrl: string) {
  return rx.firstValueFrom(fromFetch(serverUrl, {
    method: 'GET',
    keepalive: false
  }).pipe(
    rx.switchMap(async res => {
      if (res.ok) {
        const data = await res.json() as LoaderRecivedData;
        if (data.linkHashes) {
          importMarkdownOfHashes(serverUrl, data.linkHashes);
        }
        return data;
      } else {
        const resText = await res.text();
        return {
          toc: [],
          mermaids: [],
          html: 'Error: ' + resText
        };
      }
    })
  ));
}

function importMarkdownOfHashes(serverUrl: string, hashes: string[]) {
  markdownsControl.i.ft.registerFiles(
    hashes.reduce(
      (acc, curr) => {
        acc[curr] = () => importMarkdown(new URL('/doc-ui-common/markdown-local/linked-md/' + encodeURIComponent(curr), serverUrl).toString());
        return acc;
      }, {} as Record<string, () => Promise<LoaderRecivedData>>)).dp();
}

