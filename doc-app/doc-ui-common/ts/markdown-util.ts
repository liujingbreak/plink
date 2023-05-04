import path from 'path';
import util from 'util';
import os from 'os';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {Pool} from '@wfh/thread-promise-pool';
import {log4File} from '@wfh/plink';
import replaceCode, {ReplacementInf} from '@wfh/plink/wfh/dist/utils/patch-text';
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
    op.mergeMap(imgSrc => resolveImage ? resolveImage(imgSrc) : rx.of(imgSrc)),
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
  resolveImage?: (imgSrc: string) => Promise<string> | rx.Observable<string>,
  transpileCode?: (language: string, innerHTML: string) => Promise<string> | rx.Observable<string> | void
):
rx.Observable<{toc: TOC[]; content: string} | {toc: TOC[]; content: string}> {
  let toc: TOC[] = [];
  return rx.defer(() => {
    try {
      const doc = parse5.parse(html, {sourceCodeLocationInfo: true});
      const done = dfsAccessElement(html, doc, resolveImage, transpileCode, toc);
      toc = createTocTree(toc);
      return rx.from(done);
    } catch (e) {
      console.error('parseHtml() error', e);
      return rx.from([] as rx.Observable<ReplacementInf>[]);
    }
  }).pipe(
    op.mergeMap(replacement => replacement),
    op.reduce<ReplacementInf, ReplacementInf[]>((acc, item) => {
      acc.push(item);
      return acc;
    }, [] as ReplacementInf[]),
    op.map(all => {
      const content = replaceCode(html, all);
      // log.warn(html, '\n=>\n', content);
      return {toc, content};
    }),
    op.catchError(err => {
      log.error('parseHtml error', err);
      // cb(err, JSON.stringify({ toc, content: source }), sourceMap);
      return rx.of({toc, content: html});
    })
  );
}

function dfsAccessElement(
  sourceHtml: string,
  root: parse5.Document,
  resolveImage?: (imgSrc: string) => Promise<string> | rx.Observable<string>,
  transpileCode?: (language: string, sourceCode: string) => Promise<string> | rx.Observable<string> | void,
  toc: TOC[] = []) {
  const chr = new rx.BehaviorSubject<ChildNode[]>(root.childNodes || []);
  const done: (rx.Observable<ReplacementInf>)[] = [];

  chr.pipe(
    op.mergeMap(children => rx.from(children))
  ).pipe(
    op.map(node => {
      const nodeName = node.nodeName.toLowerCase();
      if (nodeName === '#text' || nodeName === '#comment' || nodeName === '#documentType')
        return;
      const el = node as Element;
      if (nodeName === 'img') {
        const imgSrc = el.attrs.find(item => item.name === 'src');
        if (resolveImage && imgSrc && !imgSrc.value.startsWith('/') && !/^https?:\/\//.test(imgSrc.value)) {
          log.info('found img src=' + imgSrc.value);
          done.push(rx.from(resolveImage(imgSrc.value))
            .pipe(
              op.map(resolved => {
                const srcPos = el.sourceCodeLocation?.attrs?.src;
                log.info(`resolve ${imgSrc.value} to ${util.inspect(resolved)}`);
                return {start: srcPos!.startOffset + 'src'.length + 1, end: srcPos!.endOffset, text: resolved};
              })
            ));
        }
      } else if (headerSet.has(nodeName)) {
        toc.push({level: 0, tag: nodeName,
          text: lookupTextNodeIn(el),
          id: ''
        });
      } else if (nodeName === 'code') {
        const classAttr = el.attrs.find(attr => attr.name === 'class' && attr.value?.startsWith('language-'));
        if (classAttr) {
          const lang = classAttr.value.slice('language-'.length);
          if (transpileCode) {
            const transpileDone = transpileCode(lang, sourceHtml.slice(el.sourceCodeLocation!.startTag.endOffset, el.sourceCodeLocation!.endTag.startOffset));
            if (transpileDone == null)
              return;
            done.push(rx.from(transpileDone).pipe(
              op.map(text => ({
                start: (el.parentNode as Element).sourceCodeLocation!.startOffset,
                end: (el.parentNode as Element).sourceCodeLocation!.endOffset,
                text
              }))
            ));
          }
        }
      }

      if (el.childNodes)
        chr.next(el.childNodes);
    })
  ).subscribe();
  return done;
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
