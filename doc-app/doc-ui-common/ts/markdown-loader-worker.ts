import {parentPort, MessagePort, threadId} from 'node:worker_threads';
import MarkdownIt from 'markdown-it';
import * as op from 'rxjs/operators';
import * as rx from 'rxjs';
import * as highlight from 'highlight.js';
import {log4File, initAsChildProcess} from '@wfh/plink';
import type * as markdownUtil from './markdown-util';

initAsChildProcess();

const log = log4File(__filename);

const md = new MarkdownIt({
  html: true,
  highlight(str, lang, attrs) {
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

export function toContentAndToc(source: string) {
  const {parseHtml}  = require('./markdown-util') as typeof markdownUtil;
  return parseHtml(md.render(source ), imgSrc => {
    return new rx.Observable<string>(sub => {
      const cb: Parameters<MessagePort['addListener']>[1] = (msg: {type: string; data: string}) => {
        if (msg.type === THREAD_MSG_TYPE_RESOLVE_IMG) {
          parentPort!.off('message', cb);
          log.info('thread', threadId, 'recieved resolved URL', msg.data);
          sub.next(msg.data);
          sub.complete();
        }
      };
      parentPort!.on('message', cb);
      parentPort!.postMessage({type: THREAD_MSG_TYPE_RESOLVE_IMG, data: imgSrc});
      return () => parentPort!.off('message', cb);
    });
  }).pipe(
    op.take(1)
  ).toPromise();
}
