"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupReactingForPlain = void 0;
const tslib_1 = require("tslib");
const rx = tslib_1.__importStar(require("rxjs"));
const reactivizer_1 = require("@wfh/reactivizer");
const markdown_process_common_1 = require("./markdown-process-common");
/** no JSON stringify */
function setupReactingForPlain(markdownProcessor) {
    (0, markdown_process_common_1.setupReacting)(markdownProcessor);
    const { o } = markdownProcessor;
    o.interceptor$.next(a$ => rx.merge(a$.pipe(o.ofType('onHtmlParsedSnippet'), (0, reactivizer_1.mapActionToPayload)(), rx.mergeMap(([m, snippets]) => {
        return rx.from(snippets).pipe(rx.concatMap(item => typeof item === 'string' ? rx.of(item) : item), 
        // rx.tap(item => {
        //   o.ft.log('==>', typeof item === 'string' ? item : typeof item).dp();
        // }),
        rx.reduce((acc, item) => {
            acc.push(item);
            return acc;
        }, []), rx.map(frags => {
            o.ft.htmlParsedSnippetAssembled(frags.join('')).dp(m);
        }));
    }), rx.ignoreElements()), a$.pipe(o.notOfType('onHtmlParsedSnippet'))));
}
exports.setupReactingForPlain = setupReactingForPlain;
//# sourceMappingURL=markdown-process-extend.js.map