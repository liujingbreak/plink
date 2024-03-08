import * as rx from 'rxjs';
import {mapActionToPayload} from '@wfh/reactivizer';
import {MarkdownProcessor} from './markdown-process-common';
import {setupReacting} from './markdown-process-common';

/** no JSON stringify */
export function setupReactingForPlain(markdownProcessor: MarkdownProcessor) {
  setupReacting(markdownProcessor);
  const {o} = markdownProcessor;
  o.interceptor$.next(a$ => rx.merge(
    a$.pipe(
      o.ofType('onHtmlParsedSnippet'),
      mapActionToPayload(),
      rx.mergeMap(([m, snippets]) => {
        return rx.from(snippets).pipe(
          rx.concatMap(item => typeof item === 'string' ? rx.of(item) : item),
          rx.reduce<string, string[]>((acc, item) => {
            acc.push(item);
            return acc;
          }, []),
          rx.map(frags => {
            o.ft.htmlParsedSnippetAssembled(frags.join('')).dp(m);
          })
        );
      }),
      rx.ignoreElements()
    ),
    a$.pipe(
      o.notOfType('onHtmlParsedSnippet')
    )
  ));
}

