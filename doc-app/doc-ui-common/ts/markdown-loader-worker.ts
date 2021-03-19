import MarkdownIt from 'markdown-it';
import * as highlight from 'highlight.js';

const md = new MarkdownIt({
  html: true,
  highlight(str, lang, attrs) {
    if (lang) {
      try {
        return highlight.highlight(lang, str, true).value;
      } catch (e) {
        console.error(e);
      }
    }
    return str;
  }
});

export function parseToHtml(source: string) {
  return md.render(source );
}
