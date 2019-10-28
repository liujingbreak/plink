import Markdown from 'markdown-it';
import * as hljs from 'highlight.js';
import {createHash} from 'crypto';

const hash = createHash('sha256');

const mk = new Markdown({
  html: true,
  highlight(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(lang, str, true).value;
      } catch (__) {}
    }
    return ''; // use external default escaping
  }
});

export function compileToHtml(markdown: string, genHash = false) {
  const html = mk.render(markdown);
  return {
    content: html,
    hash: genHash ? hash.update(html).digest('hex') : undefined
  };
}

