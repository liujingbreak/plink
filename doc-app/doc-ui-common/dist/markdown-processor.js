"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markdownProcessor = void 0;
const tslib_1 = require("tslib");
const rx = tslib_1.__importStar(require("rxjs"));
const plink_1 = require("@wfh/plink");
const node_worker_1 = require("@wfh/reactivizer/dist/fork-join/node-worker");
const md5_1 = tslib_1.__importDefault(require("md5"));
const markdown_it_1 = tslib_1.__importDefault(require("markdown-it"));
const highlight_js_1 = tslib_1.__importDefault(require("highlight.js"));
const markdown_processor_helper_1 = require("./markdown-processor-helper");
const log = (0, plink_1.log4File)(__filename);
const headerSet = new Set('h1 h2 h3 h4 h5'.split(' '));
const md = new markdown_it_1.default({
    html: true,
    highlight(str, lang, _attrs) {
        if (lang && lang !== 'mermaid') {
            try {
                const parsed = highlight_js_1.default.highlight(str, { language: lang }).value;
                return parsed;
            }
            catch (e) {
                log.debug(e); // skip non-important error like: Unknown language: "mermaid"
            }
        }
        return str;
    }
});
exports.markdownProcessor = (0, node_worker_1.createWorkerControl)({ name: 'markdownProcessor', debug: true });
const { r, i, o } = exports.markdownProcessor;
r('forkProcessFile', i.pt.forkProcessFile.pipe(rx.mergeMap(async ([m, content, file]) => {
    const result = (0, node_worker_1.fork)(exports.markdownProcessor, 'processFile', [content, file], 'processFileDone');
    o.dp.wait();
    const [html, toc] = await result;
    o.dp.stopWaiting();
    o.dpf.processFileDone(m, html, toc);
})));
r('processFile', i.pt.processFile.pipe(rx.combineLatestWith(import('parse5')), rx.mergeMap(([[m, content, file], parse5]) => {
    const html = md.render(content);
    const doc = parse5.parse(html, { sourceCodeLocationInfo: true });
    const content$ = dfsAccessElement(m, html, file, doc);
    return content$.pipe(rx.map(([content, toc]) => ({ toc: (0, markdown_processor_helper_1.createTocTree)(toc), content })));
}), rx.catchError(err => {
    log.error(err);
    return rx.of({ toc: [], content: err.toString() });
})));
function dfsAccessElement(processFileActionMeta, sourceHtml, file, root) {
    const toc = [];
    const chr = new rx.BehaviorSubject(root.childNodes || []);
    const output = [];
    let htmlOffset = 0;
    chr.pipe(rx.mergeMap(children => rx.from(children)), rx.map(node => {
        var _a;
        const nodeName = node.nodeName.toLowerCase();
        if (nodeName === '#text' || nodeName === '#comment' || nodeName === '#documentType')
            return;
        const el = node;
        if (nodeName === 'code') {
            const classAttr = el.attrs.find(item => item.name === 'class');
            if (classAttr) {
                log.warn('markdown code for language:', classAttr.value);
                const endQuoteSyntaxPos = el.sourceCodeLocation.attrs.class.endOffset - 1;
                output.push(sourceHtml.slice(htmlOffset, endQuoteSyntaxPos), ' hljs');
                htmlOffset = endQuoteSyntaxPos;
            }
        }
        else if (nodeName === 'img') {
            const imgSrc = el.attrs.find(item => item.name === 'src');
            if (imgSrc && !imgSrc.value.startsWith('/') && !/^https?:\/\//.test(imgSrc.value)) {
                log.info('found img src=' + imgSrc.value);
                output.push(sourceHtml.slice(htmlOffset, el.sourceCodeLocation.attrs.src.startOffset + 'src="'.length));
                // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
                htmlOffset = ((_a = el.sourceCodeLocation.attrs) === null || _a === void 0 ? void 0 : _a.src.endOffset) - 1;
                return output.push(rx.merge(new rx.Observable(() => {
                    o.dp.wait();
                }), o.dfo.imageToBeResolved(i.at.imageResolved, processFileActionMeta, imgSrc.value, file)).pipe(rx.take(1), rx.map(([, url]) => url), rx.finalize(() => o.dp.stopWaiting())));
            }
        }
        else if (headerSet.has(nodeName)) {
            const text = (0, markdown_processor_helper_1.lookupTextNodeIn)(el);
            const hash = btoa((0, md5_1.default)(text, { asString: true }));
            const posBeforeStartTagEnd = el.sourceCodeLocation.startTag.endOffset - 1;
            output.push(sourceHtml.slice(htmlOffset, posBeforeStartTagEnd), ` id="mdt-${hash}"`);
            htmlOffset = posBeforeStartTagEnd;
            toc.push({
                level: 0,
                tag: nodeName,
                text: (0, markdown_processor_helper_1.lookupTextNodeIn)(el),
                id: hash
            });
        }
        else if (el.childNodes) {
            chr.next(el.childNodes);
        }
    })).subscribe();
    output.push(sourceHtml.slice(htmlOffset));
    return rx.from(output).pipe(rx.concatMap(item => typeof item === 'string' ? rx.of(JSON.stringify(item)) : item == null ? ' + img + ' : item), rx.reduce((acc, item) => {
        acc.push(item);
        return acc;
    }, []), rx.map(frags => [frags.join(' + '), toc]));
}
//# sourceMappingURL=markdown-processor.js.map