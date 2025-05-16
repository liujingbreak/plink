import * as rx from 'rxjs';
import {WorkerControl, setIdleDuring} from '@wfh/reactivizer/dist/fork-join/node-worker';
import {SingleActionFactory, ActionMeta, str2ArrayBuffer, arrayBuffer2str} from '@wfh/reactivizer';
import MarkdownIt from 'markdown-it';
import highlight from 'highlight.js';
import {parse as parseHtml, DefaultTreeAdapterMap} from 'parse5';
import {TOC} from './types';
import {ChildNode, Element, lookupTextNodeIn, createTocTree} from './markdown-processor-helper';

export type MdInputActions = {
  forkProcessFile(markdownFileContent: string, filePath: string): SingleActionFactory;
  processFile(markdownFileContent: SharedArrayBuffer, filePath: string): SingleActionFactory;
  processFileDone(res: {resultHtml: ArrayBuffer; toc: TOC[]; mermaid: ArrayBuffer[]; transferList: ArrayBuffer[]}): SingleActionFactory;
  /** Consumer should dispatach to be related to "resolveImage" event */
  imageResolved(resultUrl: string): SingleActionFactory;
  linkResolved(hash?: string): SingleActionFactory;
  /** Consumer should dispatch */
  anchorLinkResolved(url: string): SingleActionFactory;
};

export type MdOutputEvents = {
  processFileDone: MdInputActions['processFileDone'];
  /** Consumer program should react on this event */
  imageToBeResolved(imgSrc: string, mdFilePath: string): SingleActionFactory;
  /** Consumer program should react on this event */
  linkToBeResolved(urlSrc: string, mdFilePath: string): SingleActionFactory;
  /** Consumer should react and dispatach "anchorLinkResolved" */
  anchorLinkToBeResolved(linkSrc: string, mdFilePath: string): SingleActionFactory;

  htmlRendered(file: string, html: string): SingleActionFactory;
  /** Implementation should intercept this message and reduce and respond it with message htmlParsedSnippetAssembled */
  onHtmlParsedSnippet(snippets: Array<string | Promise<string> | rx.Observable<string>>): SingleActionFactory;
  htmlParsedSnippetAssembled(content: string): SingleActionFactory;
};

const headerSet = new Set<string>('h1 h2 h3 h4 h5'.split(' '));
const md = new MarkdownIt({
  html: true,
  highlight(str, lang, _attrs) {
    if (lang && lang !== 'mermaid') {
      try {
        const parsed = highlight.highlight(lang, str).value;
        return parsed;
      } catch (e) {
        console.error(e); // skip non-important error like: Unknown language: "mermaid"
      }
    }
    return str;
  }
});
export type MarkdownProcessor = WorkerControl<MdInputActions & MdOutputEvents>;

export function setupReacting(markdownProcessor: MarkdownProcessor) {
  const {r, s} = markdownProcessor;
  r('forkProcessFile -> fork processFile, processFileDone', s.pt.forkProcessFile.pipe(
    rx.mergeMap(async ([m, content, file]) => {
      try {
        const resultDone = s.ft.fork('processFile', str2ArrayBuffer<SharedArrayBuffer>(content, true), file)
          .do(s.pt.processFileDone, m);
        const [, result] = await setIdleDuring.asPromise(markdownProcessor, resultDone);
        s.ft.processFileDone(result).dp(m);
      } catch (e) {
        markdownProcessor.dispatchErrorFor(e, m);
      }
    })
  ));

  r('processFile -> processFileDone', s.pt.processFile.pipe(
    rx.mergeMap(([m, content, file]) => {
      return rx.defer(() => {
        const html = md.render(arrayBuffer2str(content));
        const doc = parseHtml(html, {sourceCodeLocationInfo: true});
        const content$ = dfsAccessElement(markdownProcessor, m, html, file, doc);
        return content$;
      }).pipe(
        rx.map(([content, toc, mermaidCodes]) => {
          const buf = str2ArrayBuffer<ArrayBuffer>(content);
          const mermaidBufs = mermaidCodes.map(code => str2ArrayBuffer<ArrayBuffer>(code));
          s.ft.processFileDone({resultHtml: buf, toc: createTocTree(toc), mermaid: mermaidBufs, transferList: [buf, ...mermaidBufs]}).dp(m);
        }),
        markdownProcessor.catchErrorFor(m)
      );
    })
  ));

  r('onHtmlParsedSnippet -> htmlParsedSnippetAssembled', s.pt.onHtmlParsedSnippet.pipe(
    rx.mergeMap(([m, snippets]) => {
      return rx.from(snippets).pipe(
        rx.concatMap(item => typeof item === 'string' ? rx.of(JSON.stringify(item)) : item),
        rx.reduce<string, string[]>((acc, item) => {
          acc.push(item);
          return acc;
        }, []),
        rx.map(frags => {
          s.ft.htmlParsedSnippetAssembled(frags.join(' + ')).dp(m);
        })
      );
    })
  ));

  s.ft.setLiftUpActions(rx.merge(
    s.at.imageToBeResolved,
    s.at.linkToBeResolved
  )).dp();
}

const textEncoder = new TextEncoder();

function dfsAccessElement(
  processor: MarkdownProcessor,
  _processFileActionMeta: ActionMeta,
  sourceHtml: string,
  file: string,
  root: DefaultTreeAdapterMap['document']
  // transpileCode?: (language: string, sourceCode: string) => Promise<string> | rx.Observable<string> | void,
) {
  const {s} = processor;
  const toc: TOC[] = [];
  const mermaidCode = [] as string[];

  const output = [] as Array<string | Promise<string> | rx.Observable<string>>;
  let htmlOffset = 0;
  const headerTextDuplicationMap = new Map<string, number>();

  async function processHtmlNode(node: ChildNode | DefaultTreeAdapterMap['document']) {
    const nodeName = node.nodeName.trim().toLowerCase();
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
        s.ft.log('Found img src=' + imgSrc.value).dp();
        output.push(sourceHtml.slice(htmlOffset, el.sourceCodeLocation!.attrs!.src!.startOffset + 'src="'.length));
        // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
        htmlOffset = el.sourceCodeLocation!.attrs?.src.endOffset! - 1;

        const result$ = new rx.ReplaySubject<string>(1);
        s.ft.imageToBeResolved(imgSrc.value, file).do(s.pt.imageResolved).pipe(
          rx.take(1),
          rx.map(([, url]) => url)
        ).subscribe(result$);
        return output.push(result$);
      }
    } else if (headerSet.has(nodeName)) {
      const text = lookupTextNodeIn(el);
      const duplicateCount = headerTextDuplicationMap.get(text);
      if (duplicateCount != null) {
        headerTextDuplicationMap.set(text, duplicateCount + 1);
      } else {
        headerTextDuplicationMap.set(text, 0);
      }
      const hash = (await digestSha1(text)) + (duplicateCount != null ? duplicateCount + '' : '');
      const posBeforeStartTagEnd = el.sourceCodeLocation!.startTag!.endOffset - 1;
      output.push(sourceHtml.slice(htmlOffset, posBeforeStartTagEnd), ` id="mdt-${hash}" data-mdt `);
      htmlOffset = posBeforeStartTagEnd;
      toc.push({
        level: 0,
        tag: nodeName,
        text: lookupTextNodeIn(el),
        id: hash
      });
    } else if (nodeName === 'a') {
      const hrefAttr = el.attrs.find(attr => attr.name === 'href');
      if (hrefAttr?.value) {
        // output.push(sourceHtml.slice(htmlOffset, el.sourceCodeLocation!.attrs!.href!.startOffset + 'href="'.length));
        const insertPos = el.sourceCodeLocation!.startTag!.endOffset - 1;
        output.push(sourceHtml.slice(htmlOffset, insertPos));
        htmlOffset = insertPos;
        // const result$ = new rx.ReplaySubject<string>(1);
        await rx.firstValueFrom(s.ft.linkToBeResolved(hrefAttr?.value, file).do(s.pt.linkResolved).pipe(
          rx.take(1),
          rx.map(([, hash]) => {
            if (hash) {
              output.push(` data-md-hash="${hash}"`);
            }
          })
        ));

        // return output.push(result$);
      }
    } else if (el.childNodes) {
      for (const child of el.childNodes) {
        await processHtmlNode(child);
      }
    }
  }

  return rx.concat(
    rx.from(processHtmlNode(root)).pipe(rx.ignoreElements()),
    new rx.Observable<never>(sub => {
      output.push(sourceHtml.slice(htmlOffset));
      sub.complete();
    }),
    setIdleDuring(
      processor,
      s.ft.onHtmlParsedSnippet(output).ddo(s.pt.htmlParsedSnippetAssembled).pipe(
        rx.map(([, content]) => {
          return [content, toc, mermaidCode] as const;
        }),
        rx.take(1)
      )
    )
  );
}

export async function digestSha1(text: string) {
  return btoa(String.fromCodePoint(...new Uint8Array(await globalThis.crypto.subtle.digest('SHA-1', textEncoder.encode(text)))));
}
