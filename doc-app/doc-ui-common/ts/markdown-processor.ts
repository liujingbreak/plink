import * as rx from 'rxjs';
import {log4File} from '@wfh/plink';
import {createWorkerControl, fork, WorkerControl} from '@wfh/reactivizer/dist/fork-join/node-worker';
import {timeoutLog, ActionMeta, str2ArrayBuffer, arrayBuffer2str} from '@wfh/reactivizer';
import md5 from 'md5';
import MarkdownIt from 'markdown-it';
import highlight from 'highlight.js';
import type {DefaultTreeAdapterMap} from 'parse5';
import {TOC} from '../isom/md-types';
import {ChildNode, Element, lookupTextNodeIn, createTocTree} from './markdown-processor-helper';

const log = log4File(__filename);

type MdInputActions = {
  forkProcessFile(markdownFileContent: string, filePath: string): void;
  processFile(markdownFileContent: SharedArrayBuffer, filePath: string): void;
  processFileDone(res: {resultHtml: ArrayBuffer; toc: TOC[]; mermaid: ArrayBuffer[]; transferList: ArrayBuffer[]}): void;
  /** Consumer should dispatach to be related to "resolveImage" event */
  imageResolved(resultUrl: string): void;
  linkResolved(resultUrl: string): void;
  /** Consumer should dispatch */
  anchorLinkResolved(url: string): void;
};

export type MdOutputEvents = {
  processFileDone: MdInputActions['processFileDone'];
  /** Consumer program should react on this event */
  imageToBeResolved(imgSrc: string, mdFilePath: string): void;
  /** Consumer program should react on this event */
  linkToBeResolved(urlSrc: string, mdFilePath: string): void;
  /** Consumer should react and dispatach "anchorLinkResolved" */
  anchorLinkToBeResolved(linkSrc: string, mdFilePath: string): void;

  htmlRendered(file: string, html: string): void;
};

const headerSet = new Set<string>('h1 h2 h3 h4 h5'.split(' '));
const md = new MarkdownIt({
  html: true,
  highlight(str, lang, _attrs) {
    if (lang && lang !== 'mermaid') {
      try {
        const parsed = highlight.highlight(str, {language: lang}).value;
        return parsed;
      } catch (e) {
        log.debug(e); // skip non-important error like: Unknown language: "mermaid"
      }
    }
    return str;
  }
});
export type MarkdownProcessor = WorkerControl<MdInputActions, MdOutputEvents>;

export const markdownProcessor: MarkdownProcessor = createWorkerControl<MdInputActions, MdOutputEvents>({
  name: 'markdownProcessor',
  debug: true,
  log(...msg) {
    log.info(...msg);
  }
});

const {r, i, o} = markdownProcessor;

r('forkProcessFile -> fork processFile, processFileDone', i.pt.forkProcessFile.pipe(
  rx.mergeMap(async ([m, content, file]) => {
    const resultDone = fork(markdownProcessor, 'processFile', [str2ArrayBuffer<SharedArrayBuffer>(content, true), file], 'processFileDone', m);
    o.dp.wait();
    const [result] = await resultDone;
    o.dp.stopWaiting();
    o.dpf.processFileDone(m, result);
  })
));

r('processFile -> processFileDone', i.pt.processFile.pipe(
  rx.combineLatestWith(import('parse5')),
  rx.mergeMap(([[m, content, file], parse5]) => {
    const html = md.render(arrayBuffer2str(content));
    const doc = parse5.parse(html, {sourceCodeLocationInfo: true});
    const content$ = dfsAccessElement(m, html, file, doc);
    return content$.pipe(
      rx.map(([content, toc, mermaidCodes]) => {
        const buf = str2ArrayBuffer<ArrayBuffer>(content);
        const mermaidBufs = mermaidCodes.map(code => str2ArrayBuffer<ArrayBuffer>(code));
        o.dpf.processFileDone(m, {resultHtml: buf, toc: createTocTree(toc), mermaid: mermaidBufs, transferList: [buf, ...mermaidBufs]});
      })
    );
  }),
  rx.catchError(err => {
    log.error(err);
    // o.dpf.processFileDone({toc: [], content: (err as Error).toString()});
    return rx.EMPTY;
  })
));

i.dp.setLiftUpActions(rx.merge(
  o.at.imageToBeResolved,
  o.at.linkToBeResolved
));

function dfsAccessElement(
  processFileActionMeta: ActionMeta,
  sourceHtml: string,
  file: string,
  root: DefaultTreeAdapterMap['document']
  // transpileCode?: (language: string, sourceCode: string) => Promise<string> | rx.Observable<string> | void,
) {
  const toc: TOC[] = [];
  const mermaidCode = [] as string[];
  const chr = new rx.BehaviorSubject<ChildNode[]>(root.childNodes || []);
  const output = [] as Array<string | Promise<string> | rx.Observable<string> | null | undefined>;
  let htmlOffset = 0;

  chr.pipe(
    rx.mergeMap(children => rx.from(children)),
    rx.map(node => {
      const nodeName = node.nodeName.toLowerCase();
      if (nodeName === '#text' || nodeName === '#comment' || nodeName === '#documentType')
        return;
      const el = node as Element;
      if (nodeName === 'code') {
        const classAttr = el.attrs.find(item => item.name === 'class');
        if (classAttr) {
          const langMatch = /^language-(.*)$/.exec(classAttr.value);
          const lang = langMatch ? langMatch[1] : null;
          const endQuoteSyntaxPos = el.sourceCodeLocation!.attrs!.class!.endOffset - 1;
          output.push(
            sourceHtml.slice(htmlOffset, endQuoteSyntaxPos),
            ' hljs'
          );
          htmlOffset = endQuoteSyntaxPos;

          if (lang === 'mermaid' && el.childNodes.length > 0) {
            const mermaidCodeStart = (el.childNodes[0] as Element).sourceCodeLocation!.startOffset;
            const mermaidCodeEnd = (el.childNodes[el.childNodes.length - 1] as Element).sourceCodeLocation!.endOffset;
            mermaidCode.push(sourceHtml.slice(mermaidCodeStart, mermaidCodeEnd));
            output.push(sourceHtml.slice(htmlOffset, mermaidCodeStart));
            htmlOffset = mermaidCodeEnd;
          }
        }
      } else if (nodeName === 'img') {
        const imgSrc = el.attrs.find(item => item.name === 'src');
        if (imgSrc && !imgSrc.value.startsWith('/') && !/^https?:\/\//.test(imgSrc.value)) {
          log.info('found img src=' + imgSrc.value);
          output.push(sourceHtml.slice(htmlOffset, el.sourceCodeLocation!.attrs!.src!.startOffset + 'src="'.length));
          // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
          htmlOffset = el.sourceCodeLocation!.attrs?.src.endOffset! - 1;
          return output.push(rx.merge(
            new rx.Observable<never>(() => {
              o.dp.wait();
            }),
            o.do.imageToBeResolved(i.at.imageResolved, imgSrc.value, file)
          ).pipe(
            rx.take(1),
            rx.map(([, url]) => url),
            rx.finalize(() => o.dp.stopWaiting())
          ));
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
      } else if (nodeName === 'a') {
        const hrefAttr = el.attrs.find(attr => attr.name === 'href');
        if (hrefAttr?.value && hrefAttr.value.startsWith('.')) {
          output.push(sourceHtml.slice(htmlOffset, el.sourceCodeLocation!.attrs!.href!.startOffset + 'href="'.length));
          htmlOffset = el.sourceCodeLocation!.attrs!.href!.endOffset - 1;
          return output.push(rx.merge(
            new rx.Observable<never>(() => {
              o.dp.wait();
            }),
            o.do.linkToBeResolved(i.at.linkResolved, hrefAttr?.value, file)
          ).pipe(
            rx.take(1),
            timeoutLog(3000, () => log.warn('link resolve timeout')),
            rx.map(([, url]) => url),
            rx.finalize(() => o.dp.stopWaiting())
          ));
        }
      } else if (el.childNodes) {
        chr.next(el.childNodes);
      }
    })
  ).subscribe();

  output.push(sourceHtml.slice(htmlOffset));

  return rx.from(output).pipe(
    rx.concatMap(item => typeof item === 'string' ? rx.of(JSON.stringify(item)) : item == null ? ' + img + ' : item),
    rx.reduce<string, string[]>((acc, item) => {
      acc.push(item);
      return acc;
    }, []),
    rx.map(frags => [frags.join(' + '), toc, mermaidCode] as const)
  );
}
