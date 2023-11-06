import {parentPort, MessagePort} from 'node:worker_threads';
// import inspector from 'node:inspector';
import md5 from 'md5';
import MarkdownIt from 'markdown-it';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import highlight from 'highlight.js';
import {type DefaultTreeAdapterMap} from 'parse5';
import {log4File, initAsChildProcess} from '@wfh/plink';
import findLastIndex from 'lodash/findLastIndex';
import {TOC} from '../isom/md-types';
// inspector.open(9222, '0.0.0.0', true);

type ChildNode = DefaultTreeAdapterMap['childNode'];
type Element = DefaultTreeAdapterMap['element'];
type TextNode = DefaultTreeAdapterMap['textNode'];

const headerSet = new Set<string>('h1 h2 h3 h4 h5'.split(' '));


initAsChildProcess();

const log = log4File(__filename);

const md = new MarkdownIt({
  html: true,
  highlight(str, lang, _attrs) {
    if (lang && lang !== 'mermaid') {
      try {
        const parsed = highlight.highlight(str, {language: lang}).value;
        // log.info('...........................\n', parsed);
        return parsed;
      } catch (e) {
        log.debug(e); // skip non-important error like: Unknown language: "mermaid"
      }
    }
    return str;
  }
});

const THREAD_MSG_TYPE_RESOLVE_IMG = 'resolveImageSrc';

export function toContentAndToc(source: string) {
  return parseHtml(
    md.render(source ),
    imgSrc => {
      return new rx.Observable<string>(sub => {
        const cb: Parameters<MessagePort['addListener']>[1] = (msg: {type: string; data: string}) => {
          if (msg.type === THREAD_MSG_TYPE_RESOLVE_IMG) {
            parentPort!.off('message', cb);
            sub.next(msg.data);
            sub.complete();
          }
        };
        parentPort!.on('message', cb);
        parentPort!.postMessage({type: THREAD_MSG_TYPE_RESOLVE_IMG, data: imgSrc});
        return () => parentPort!.off('message', cb);
      });
    }
  ).pipe(
    op.take(1)
  ).toPromise();
}

export const testable = {parseHtml};

function parseHtml(
  html: string,
  resolveImage?: (imgSrc: string) => Promise<string> | rx.Observable<string> | null | undefined
): rx.Observable<{toc: TOC[]; content: string}> {
  let toc: TOC[] = [];
  return rx.from(import('parse5')).pipe(
    op.mergeMap(parser => {
      const doc = parser.parse(html, {sourceCodeLocationInfo: true});
      const content$ = dfsAccessElement(html, doc, resolveImage, toc);
      toc = createTocTree(toc);
      return content$.pipe(op.map(content => ({toc, content})));
    }),
    op.catchError(err => {
      log.error(err);
      return rx.of({toc, content: html});
    })
  );
}

function dfsAccessElement(
  sourceHtml: string,
  root: DefaultTreeAdapterMap['document'],
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
      if (nodeName === 'code') {
        const classAttr = el.attrs.find(item => item.name === 'class');
        if (classAttr) {
          const endQuoteSyntaxPos = el.sourceCodeLocation!.attrs!.class!.endOffset - 1;
          output.push(
            sourceHtml.slice(htmlOffset, endQuoteSyntaxPos),
            ' hljs'
          );
          htmlOffset = endQuoteSyntaxPos;
        }
      } else if (nodeName === 'img') {
        const imgSrc = el.attrs.find(item => item.name === 'src');
        if (resolveImage && imgSrc && !imgSrc.value.startsWith('/') && !/^https?:\/\//.test(imgSrc.value)) {
          log.info('found img src=' + imgSrc.value);
          output.push(sourceHtml.slice(htmlOffset, el.sourceCodeLocation!.attrs!.src!.startOffset + 'src="'.length));
          // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
          htmlOffset = el.sourceCodeLocation!.attrs?.src.endOffset! - 1;
          return output.push(resolveImage(imgSrc.value));
        }
      } else if (headerSet.has(nodeName)) {
        const text = lookupTextNodeIn(el);
        const hash = btoa(md5(text, {asString: true}));
        const posBeforeStartTagEnd = el.sourceCodeLocation!.startTag!.endOffset - 1;
        output.push(sourceHtml.slice(htmlOffset, posBeforeStartTagEnd), ` id="mdt-${hash}"`);
        htmlOffset = posBeforeStartTagEnd;
        toc.push({
          level: 0,
          tag: nodeName,
          text: lookupTextNodeIn(el),
          id: hash
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
    op.map(frags => frags.join(' + '))
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
  let prevHeaderWeight = Number(root.tag.charAt(1));
  for (const item of input) {
    const headerWeight = Number(item.tag.charAt(1));
    // console.log(`${headerWeight} ${prevHeaderWeight}, ${item.text}`);
    if (headerWeight < prevHeaderWeight) {
      const pIdx = findLastIndex(byLevel, toc => Number(toc.tag.charAt(1)) < headerWeight);
      byLevel.splice(pIdx + 1);
      addAsChild(byLevel[pIdx], item);
    } else if (headerWeight === prevHeaderWeight) {
      byLevel.pop();
      const parent = byLevel[byLevel.length - 1];
      addAsChild(parent, item);
    } else {
      const parent = byLevel[byLevel.length - 1];
      addAsChild(parent, item);
    }
    prevHeaderWeight = headerWeight;
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


