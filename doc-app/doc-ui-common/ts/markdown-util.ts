import path from 'path';
import os from 'os';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {Pool} from '@wfh/thread-promise-pool';
import {log4File} from '@wfh/plink';
import _ from 'lodash';
import parse5, {ChildNode, Element, TextNode} from 'parse5';
import {TOC} from '../isom/md-types';
const log = log4File(__filename);

let threadPool: Pool;
const headerSet = new Set<string>('h1 h2 h3 h4 h5'.split(' '));

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
    op.tap(imgUrl => {
      threadTask.thread?.postMessage({type: 'resolveImageSrc', data: imgUrl});
      log.info('send resolved image', imgUrl);
    }, undefined, () => {
      threadTask.thread!.off('message', handleThreadMsg);
      log.info('done');
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

export function parseHtml(
  html: string,
  resolveImage?: (imgSrc: string) => Promise<string> | rx.Observable<string> | null | undefined
): rx.Observable<{toc: TOC[]; content: string}> {
  let toc: TOC[] = [];
  try {
    const doc = parse5.parse(html, {sourceCodeLocationInfo: true});
    const content$ = dfsAccessElement(html, doc, resolveImage, toc);
    toc = createTocTree(toc);
    return content$.pipe(op.map(content => ({toc, content})));
  } catch (e) {
    console.error('parseHtml() error', e);
    return rx.of({toc, content: html});
  }
}

function dfsAccessElement(
  sourceHtml: string,
  root: parse5.Document,
  resolveImage?: (imgSrc: string) => Promise<string> | rx.Observable<string> | null | undefined,
  // transpileCode?: (language: string, sourceCode: string) => Promise<string> | rx.Observable<string> | void,
  toc: TOC[] = []
) {
  const chr = new rx.BehaviorSubject<ChildNode[]>(root.childNodes || []);
  const output = [] as Array<string | Promise<string> | rx.Observable<string> | null | undefined>;
  let htmlOffset = 0;

  chr.pipe(
    op.mergeMap(children => rx.from(children)),
    op.map(node => {
      const nodeName = node.nodeName.toLowerCase();
      if (nodeName === '#text' || nodeName === '#comment' || nodeName === '#documentType')
        return;
      const el = node as Element;
      if (nodeName === 'img') {
        const imgSrc = el.attrs.find(item => item.name === 'src');
        if (resolveImage && imgSrc && !imgSrc.value.startsWith('/') && !/^https?:\/\//.test(imgSrc.value)) {
          log.info('found img src=' + imgSrc.value);
          output.push(sourceHtml.slice(htmlOffset, el.sourceCodeLocation!.attrs.src.startOffset + 'src'.length + 2));
          htmlOffset = el.sourceCodeLocation!.attrs.src.endOffset - 1;
          return output.push(resolveImage(imgSrc.value));
        }
      } else if (headerSet.has(nodeName)) {
        toc.push({level: 0, tag: nodeName,
          text: lookupTextNodeIn(el),
          id: ''
        });
      } else if (el.childNodes) {
        chr.next(el.childNodes);
      }
    })
  ).subscribe();

  output.push(sourceHtml.slice(htmlOffset));

  return rx.from(output).pipe(
    op.concatMap(item => typeof item === 'string' ? rx.of(JSON.stringify(item)) : item == null ? ' + img + ' : item),
    op.reduce<string, string[]>((acc, item) => {
      acc.push(item);
      return acc;
    }, []),
    op.map(frags => frags.join(''))
  );
}

function lookupTextNodeIn(el: Element) {
  const chr = new rx.BehaviorSubject<ChildNode[]>(el.childNodes || []);
  let text = '';
  chr.pipe(
    op.mergeMap(children => rx.from(children))
  ).pipe(
    op.map(node => {
      if (node.nodeName === '#text') {
        text += (node as TextNode).value;
      } else if ((node as Element).childNodes) {
        chr.next((node as Element).childNodes);
      }
    })
  ).subscribe();
  return text;
}

function createTocTree(input: TOC[]) {
  const root: TOC = {level: -1, tag: 'h0', text: '', id: '', children: []};
  const byLevel: TOC[] = [root]; // a stack of previous TOC items ordered by level
  let prevHeaderSize = Number(root.tag.charAt(1));
  for (const item of input) {
    const headerSize = Number(item.tag.charAt(1));
    // console.log(`${headerSize} ${prevHeaderSize}, ${item.text}`);
    if (headerSize < prevHeaderSize) {
      const pIdx = _.findLastIndex(byLevel, toc => Number(toc.tag.charAt(1)) < headerSize);
      byLevel.splice(pIdx + 1);
      addAsChild(byLevel[pIdx], item);
    } else if (headerSize === prevHeaderSize) {
      byLevel.pop();
      const parent = byLevel[byLevel.length - 1];
      addAsChild(parent, item);
    } else {
      const parent = byLevel[byLevel.length - 1];
      addAsChild(parent, item);
    }
    prevHeaderSize = headerSize;
  }

  function addAsChild(parent: TOC, child: TOC) {
    if (parent.children == null)
      parent.children = [child];
    else
      parent.children.push(child);
    child.level = byLevel[byLevel.length - 1] ? byLevel[byLevel.length - 1].level + 1 : 0;
    byLevel.push(child);
  }
  return root.children!;
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
