import {parentPort, MessagePort} from 'node:worker_threads';
import MarkdownIt from 'markdown-it';
import vm from 'node:vm';
// import {JSDOM} from 'jsdom';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import * as highlight from 'highlight.js';
import {log4File, initAsChildProcess} from '@wfh/plink';
import type * as markdownUtil from './markdown-util';

initAsChildProcess();

const log = log4File(__filename);

const md = new MarkdownIt({
  html: true,
  highlight(str, lang, _attrs) {
    if (lang && lang !== 'mermaid') {
      try {
        return highlight.highlight(lang, str, true).value;
      } catch (e) {
        log.debug(e); // skip non-important error like: Unknown language: "mermaid"
      }
    }
    return str;
  }
});

const THREAD_MSG_TYPE_RESOLVE_IMG = 'resolveImageSrc';

const mermaidVmScript = new vm.Script(
  `const {runMermaid} = require('./mermaid-vm-script');
   runMermaid(mermaidSource)`);

export function toContentAndToc(source: string) {
  const {parseHtml}  = require('./markdown-util') as typeof markdownUtil;
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
    },
    async (lang, sourceCode) => {
      if (lang !== 'mermaid') {
        log.info('skip language', lang);
        return sourceCode;
      }
      log.info('start to compile Mermaid code', sourceCode);
      const done = mermaidVmScript.runInNewContext({require, sourceCode}) as Promise<{svg: string}>;
      const {svg} = await done;
      log.info('Mermaid output:', svg);
      return svg;
    }
  ).pipe(
    op.take(1)
  ).toPromise();
}
