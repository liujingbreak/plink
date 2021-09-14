import MarkdownIt from 'markdown-it';
import * as highlight from 'highlight.js';
import {log4File, initAsChildProcess} from '@wfh/plink';

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

export function parseToHtml(source: string) {
  return md.render(source );
}
