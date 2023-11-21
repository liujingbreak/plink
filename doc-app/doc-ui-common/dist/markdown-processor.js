"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markdownProcessor = void 0;
const tslib_1 = require("tslib");
const rx = tslib_1.__importStar(require("rxjs"));
const plink_1 = require("@wfh/plink");
const node_worker_1 = require("@wfh/reactivizer/dist/fork-join/node-worker");
const reactivizer_1 = require("@wfh/reactivizer");
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
exports.markdownProcessor = (0, node_worker_1.createWorkerControl)({
    name: 'markdownProcessor',
    debug: true,
    log(...msg) {
        log.info(...msg);
    }
});
const { r, i, o } = exports.markdownProcessor;
r('forkProcessFile -> fork processFile, processFileDone', i.pt.forkProcessFile.pipe(rx.mergeMap(async ([m, content, file]) => {
    const resultDone = (0, node_worker_1.fork)(exports.markdownProcessor, 'processFile', [(0, reactivizer_1.str2ArrayBuffer)(content, true), file], 'processFileDone', m);
    o.dp.wait();
    const [result] = await resultDone;
    o.dp.stopWaiting();
    o.dpf.processFileDone(m, result);
})));
r('processFile -> processFileDone', i.pt.processFile.pipe(rx.combineLatestWith(import('parse5')), rx.mergeMap(([[m, content, file], parse5]) => {
    const html = md.render((0, reactivizer_1.arrayBuffer2str)(content));
    const doc = parse5.parse(html, { sourceCodeLocationInfo: true });
    const content$ = dfsAccessElement(m, html, file, doc);
    return content$.pipe(rx.map(([content, toc, mermaidCodes]) => {
        const buf = (0, reactivizer_1.str2ArrayBuffer)(content);
        const mermaidBufs = mermaidCodes.map(code => (0, reactivizer_1.str2ArrayBuffer)(code));
        o.dpf.processFileDone(m, { resultHtml: buf, toc: (0, markdown_processor_helper_1.createTocTree)(toc), mermaid: mermaidBufs, transferList: [buf, ...mermaidBufs] });
    }));
}), rx.catchError(err => {
    log.error(err);
    // o.dpf.processFileDone({toc: [], content: (err as Error).toString()});
    return rx.EMPTY;
})));
i.dp.setLiftUpActions(rx.merge(o.at.imageToBeResolved, o.at.linkToBeResolved));
function dfsAccessElement(processFileActionMeta, sourceHtml, file, root
// transpileCode?: (language: string, sourceCode: string) => Promise<string> | rx.Observable<string> | void,
) {
    const toc = [];
    const mermaidCode = [];
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
                const langMatch = /^language-(.*)$/.exec(classAttr.value);
                const lang = langMatch ? langMatch[1] : null;
                const endQuoteSyntaxPos = el.sourceCodeLocation.attrs.class.endOffset - 1;
                output.push(sourceHtml.slice(htmlOffset, endQuoteSyntaxPos), ' hljs');
                htmlOffset = endQuoteSyntaxPos;
                if (lang === 'mermaid' && el.childNodes.length > 0) {
                    const mermaidCodeStart = el.childNodes[0].sourceCodeLocation.startOffset;
                    const mermaidCodeEnd = el.childNodes[el.childNodes.length - 1].sourceCodeLocation.endOffset;
                    mermaidCode.push(sourceHtml.slice(mermaidCodeStart, mermaidCodeEnd));
                    output.push(sourceHtml.slice(htmlOffset, mermaidCodeStart));
                    htmlOffset = mermaidCodeEnd;
                }
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
                }), o.do.imageToBeResolved(i.at.imageResolved, imgSrc.value, file)).pipe(rx.take(1), rx.map(([, url]) => url), rx.finalize(() => o.dp.stopWaiting())));
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
        else if (nodeName === 'a') {
            const hrefAttr = el.attrs.find(attr => attr.name === 'href');
            if ((hrefAttr === null || hrefAttr === void 0 ? void 0 : hrefAttr.value) && hrefAttr.value.startsWith('.')) {
                output.push(sourceHtml.slice(htmlOffset, el.sourceCodeLocation.attrs.href.startOffset + 'href="'.length));
                htmlOffset = el.sourceCodeLocation.attrs.href.endOffset - 1;
                return output.push(rx.merge(new rx.Observable(() => {
                    o.dp.wait();
                }), o.do.linkToBeResolved(i.at.linkResolved, hrefAttr === null || hrefAttr === void 0 ? void 0 : hrefAttr.value, file)).pipe(rx.take(1), (0, reactivizer_1.timeoutLog)(3000, () => log.warn('link resolve timeout')), rx.map(([, url]) => url), rx.finalize(() => o.dp.stopWaiting())));
            }
        }
        else if (el.childNodes) {
            chr.next(el.childNodes);
        }
    })).subscribe();
    output.push(sourceHtml.slice(htmlOffset));
    return rx.from(output).pipe(rx.concatMap(item => typeof item === 'string' ? rx.of(JSON.stringify(item)) : item == null ? ' + img + ' : item), rx.reduce((acc, item) => {
        acc.push(item);
        return acc;
    }, []), rx.map(frags => [frags.join(' + '), toc, mermaidCode]));
}
//# sourceMappingURL=markdown-processor.js.map