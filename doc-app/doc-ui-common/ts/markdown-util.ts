import path from 'path';
import os from 'os';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {Pool} from '@wfh/thread-promise-pool';
import {log4File} from '@wfh/plink';
// import type {ChildNode, Element, TextNode} from 'parse5/dist/cjs/tree-adapters/default';
import {TOC} from '../isom/md-types';

const log = log4File(__filename);

let threadPool: Pool;

/**
 * Use Thread pool to parse Markdown file simultaneously
 * @param source 
 * @param resolveImage 
 */
export function markdownToHtml(source: string, resolveImage?: (imgSrc: string) => Promise<string> | rx.Observable<string>):
rx.Observable<{toc: TOC[]; content: string}> {
  if (threadPool == null) {
    threadPool = new Pool(os.cpus().length > 1 ? os.cpus().length - 1 : 3, 1000);
  }

  const threadTask = threadPool.submitAndReturnTask<{toc: TOC[]; content: string}>({
    file: path.resolve(__dirname, 'markdown-loader-worker.js'),
    exportFn: 'toContentAndToc',
    args: [source]
  });

  const threadMsg$ = new rx.Subject<{type?: string; data: string}>();
  threadMsg$.pipe(
    op.filter(msg => msg.type === 'resolveImageSrc'),
    op.map(msg => msg.data),
    op.mergeMap(imgSrc => resolveImage ? resolveImage(imgSrc) : rx.of(' + ' + JSON.stringify(imgSrc) + ' + ')),
    op.tap({
      next: imgUrl => {
        threadTask.thread?.postMessage({type: 'resolveImageSrc', data: imgUrl});
        log.info('send resolved image', imgUrl);
      },
      complete: () => {
        threadTask.thread!.off('message', handleThreadMsg);
        log.info('done');
      }
    }),
    op.takeUntil(rx.from(threadTask.promise)),
    op.catchError(err => {
      log.error('markdownToHtml error', err);
      return rx.of({toc: [], content: ''});
    })
  ).subscribe();

  const handleThreadMsg = (msg: {type?: string; data: string}) => {
    threadMsg$.next(msg);
  };
  threadTask.thread!.on('message', handleThreadMsg);
  return rx.from(threadTask.promise);
}

export function* traverseTocTree(tocs: TOC[]): Generator<TOC> {
  for (const item of tocs) {
    yield item;
    if (item.children)
      yield* traverseTocTree(item.children);
  }
}

export function tocToString(tocs: TOC[]) {
  let str = '';
  for (const item of traverseTocTree(tocs)) {
    str += ' |'.repeat(item.level);
    // str += '- ';
    str += `- ${item.text}`;
    str += os.EOL;
  }
  return str;
}

export function insertOrUpdateMarkdownToc(input: string) {
  return markdownToHtml(input).pipe(
    op.map(({toc, content: html}) => {
      const tocStr = tocMarkdown(toc);
      const BEGIN = '<!-- Plink markdown toc -->';
      const END = '<!-- Plink markdown toc end -->';
      const existing = input.indexOf(BEGIN);
      let changedMd = '';
      if (existing >= 0) {
        const replacePos = existing + BEGIN.length;
        const replaceEnd = input.indexOf(END);
        changedMd = input.slice(0, replacePos) + '\n' + tocStr + '\n' + input.slice(replaceEnd);
      } else {
        changedMd = [BEGIN, tocStr, END, input].join('\n');
      }
      return {changedMd, toc: tocToString(toc), html};
    }),
    op.take(1)
  ).toPromise();
}

function tocMarkdown(tocs: TOC[]) {
  let str = '';
  let i = 0;
  for (const item of traverseTocTree(tocs)) {
    if (item.level > 2)
      continue; // only show title of level 0 - 2
    str += '  '.repeat(item.level);
    str += `${item.level > 0 ? '-' : i > 0 ? os.EOL : ''} ${item.text}`;
    str += os.EOL;
    i++;
  }
  return str.slice(0, -1);
}
