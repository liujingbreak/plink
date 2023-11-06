"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testable = exports.toContentAndToc = void 0;
const tslib_1 = require("tslib");
const node_worker_threads_1 = require("node:worker_threads");
// import inspector from 'node:inspector';
const md5_1 = tslib_1.__importDefault(require("md5"));
const markdown_it_1 = tslib_1.__importDefault(require("markdown-it"));
const op = tslib_1.__importStar(require("rxjs/operators"));
const rx = tslib_1.__importStar(require("rxjs"));
const highlight_js_1 = tslib_1.__importDefault(require("highlight.js"));
const plink_1 = require("@wfh/plink");
const findLastIndex_1 = tslib_1.__importDefault(require("lodash/findLastIndex"));
const headerSet = new Set('h1 h2 h3 h4 h5'.split(' '));
(0, plink_1.initAsChildProcess)();
const log = (0, plink_1.log4File)(__filename);
const md = new markdown_it_1.default({
    html: true,
    highlight(str, lang, _attrs) {
        if (lang && lang !== 'mermaid') {
            try {
                const parsed = highlight_js_1.default.highlight(str, { language: lang }).value;
                // log.info('...........................\n', parsed);
                return parsed;
            }
            catch (e) {
                log.debug(e); // skip non-important error like: Unknown language: "mermaid"
            }
        }
        return str;
    }
});
const THREAD_MSG_TYPE_RESOLVE_IMG = 'resolveImageSrc';
function toContentAndToc(source) {
    return parseHtml(md.render(source), imgSrc => {
        return new rx.Observable(sub => {
            const cb = (msg) => {
                if (msg.type === THREAD_MSG_TYPE_RESOLVE_IMG) {
                    node_worker_threads_1.parentPort.off('message', cb);
                    sub.next(msg.data);
                    sub.complete();
                }
            };
            node_worker_threads_1.parentPort.on('message', cb);
            node_worker_threads_1.parentPort.postMessage({ type: THREAD_MSG_TYPE_RESOLVE_IMG, data: imgSrc });
            return () => node_worker_threads_1.parentPort.off('message', cb);
        });
    }).pipe(op.take(1)).toPromise();
}
exports.toContentAndToc = toContentAndToc;
exports.testable = { parseHtml };
function parseHtml(html, resolveImage) {
    let toc = [];
    return rx.from(import('parse5')).pipe(op.mergeMap(parser => {
        const doc = parser.parse(html, { sourceCodeLocationInfo: true });
        const content$ = dfsAccessElement(html, doc, resolveImage, toc);
        toc = createTocTree(toc);
        return content$.pipe(op.map(content => ({ toc, content })));
    }), op.catchError(err => {
        log.error(err);
        return rx.of({ toc, content: html });
    }));
}
function dfsAccessElement(sourceHtml, root, resolveImage, 
// transpileCode?: (language: string, sourceCode: string) => Promise<string> | rx.Observable<string> | void,
toc = []) {
    const chr = new rx.BehaviorSubject(root.childNodes || []);
    const output = [];
    let htmlOffset = 0;
    chr.pipe(op.mergeMap(children => rx.from(children)), op.map(node => {
        var _a;
        const nodeName = node.nodeName.toLowerCase();
        if (nodeName === '#text' || nodeName === '#comment' || nodeName === '#documentType')
            return;
        const el = node;
        if (nodeName === 'code') {
            const classAttr = el.attrs.find(item => item.name === 'class');
            if (classAttr) {
                const endQuoteSyntaxPos = el.sourceCodeLocation.attrs.class.endOffset - 1;
                output.push(sourceHtml.slice(htmlOffset, endQuoteSyntaxPos), ' hljs');
                htmlOffset = endQuoteSyntaxPos;
            }
        }
        else if (nodeName === 'img') {
            const imgSrc = el.attrs.find(item => item.name === 'src');
            if (resolveImage && imgSrc && !imgSrc.value.startsWith('/') && !/^https?:\/\//.test(imgSrc.value)) {
                log.info('found img src=' + imgSrc.value);
                output.push(sourceHtml.slice(htmlOffset, el.sourceCodeLocation.attrs.src.startOffset + 'src="'.length));
                // eslint-disable-next-line @typescript-eslint/no-non-null-asserted-optional-chain
                htmlOffset = ((_a = el.sourceCodeLocation.attrs) === null || _a === void 0 ? void 0 : _a.src.endOffset) - 1;
                return output.push(resolveImage(imgSrc.value));
            }
        }
        else if (headerSet.has(nodeName)) {
            const text = lookupTextNodeIn(el);
            const hash = btoa((0, md5_1.default)(text, { asString: true }));
            const posBeforeStartTagEnd = el.sourceCodeLocation.startTag.endOffset - 1;
            output.push(sourceHtml.slice(htmlOffset, posBeforeStartTagEnd), ` id="mdt-${hash}"`);
            htmlOffset = posBeforeStartTagEnd;
            toc.push({
                level: 0,
                tag: nodeName,
                text: lookupTextNodeIn(el),
                id: hash
            });
        }
        else if (el.childNodes) {
            chr.next(el.childNodes);
        }
    })).subscribe();
    output.push(sourceHtml.slice(htmlOffset));
    return rx.from(output).pipe(op.concatMap(item => typeof item === 'string' ? rx.of(JSON.stringify(item)) : item == null ? ' + img + ' : item), op.reduce((acc, item) => {
        acc.push(item);
        return acc;
    }, []), op.map(frags => frags.join(' + ')));
}
function lookupTextNodeIn(el) {
    const chr = new rx.BehaviorSubject(el.childNodes || []);
    let text = '';
    chr.pipe(op.mergeMap(children => rx.from(children))).pipe(op.map(node => {
        if (node.nodeName === '#text') {
            text += node.value;
        }
        else if (node.childNodes) {
            chr.next(node.childNodes);
        }
    })).subscribe();
    return text;
}
function createTocTree(input) {
    const root = { level: -1, tag: 'h0', text: '', id: '', children: [] };
    const byLevel = [root]; // a stack of previous TOC items ordered by level
    let prevHeaderWeight = Number(root.tag.charAt(1));
    for (const item of input) {
        const headerWeight = Number(item.tag.charAt(1));
        // console.log(`${headerWeight} ${prevHeaderWeight}, ${item.text}`);
        if (headerWeight < prevHeaderWeight) {
            const pIdx = (0, findLastIndex_1.default)(byLevel, toc => Number(toc.tag.charAt(1)) < headerWeight);
            byLevel.splice(pIdx + 1);
            addAsChild(byLevel[pIdx], item);
        }
        else if (headerWeight === prevHeaderWeight) {
            byLevel.pop();
            const parent = byLevel[byLevel.length - 1];
            addAsChild(parent, item);
        }
        else {
            const parent = byLevel[byLevel.length - 1];
            addAsChild(parent, item);
        }
        prevHeaderWeight = headerWeight;
    }
    function addAsChild(parent, child) {
        if (parent.children == null)
            parent.children = [child];
        else
            parent.children.push(child);
        child.level = byLevel[byLevel.length - 1] ? byLevel[byLevel.length - 1].level + 1 : 0;
        byLevel.push(child);
    }
    return root.children;
}
//# sourceMappingURL=markdown-loader-worker.js.map