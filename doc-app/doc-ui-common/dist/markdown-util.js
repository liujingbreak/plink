"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertOrUpdateMarkdownToc = exports.tocToString = exports.traverseTocTree = exports.parseHtml = exports.markdownToHtml = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const os_1 = tslib_1.__importDefault(require("os"));
const rx = tslib_1.__importStar(require("rxjs"));
const op = tslib_1.__importStar(require("rxjs/operators"));
const thread_promise_pool_1 = require("@wfh/thread-promise-pool");
const plink_1 = require("@wfh/plink");
const lodash_1 = tslib_1.__importDefault(require("lodash"));
const parse5_1 = tslib_1.__importDefault(require("parse5"));
const log = (0, plink_1.log4File)(__filename);
let threadPool;
const headerSet = new Set('h1 h2 h3 h4 h5'.split(' '));
/**
 * Use Thread pool to parse Markdown file simultaneously
 * @param source
 * @param resolveImage
 */
function markdownToHtml(source, resolveImage) {
    if (threadPool == null) {
        threadPool = new thread_promise_pool_1.Pool(os_1.default.cpus().length > 1 ? os_1.default.cpus().length - 1 : 3, 1000);
    }
    const threadTask = threadPool.submitAndReturnTask({
        file: path_1.default.resolve(__dirname, 'markdown-loader-worker.js'),
        exportFn: 'toContentAndToc',
        args: [source]
    });
    const threadMsg$ = new rx.Subject();
    threadMsg$.pipe(op.filter(msg => msg.type === 'resolveImageSrc'), op.map(msg => msg.data), op.mergeMap(imgSrc => resolveImage ? resolveImage(imgSrc) : rx.of(' + ' + JSON.stringify(imgSrc) + ' + ')), op.tap(imgUrl => {
        var _a;
        (_a = threadTask.thread) === null || _a === void 0 ? void 0 : _a.postMessage({ type: 'resolveImageSrc', data: imgUrl });
        log.info('send resolved image', imgUrl);
    }, undefined, () => {
        threadTask.thread.off('message', handleThreadMsg);
        log.info('done');
    }), op.takeUntil(rx.from(threadTask.promise)), op.catchError(err => {
        log.error('markdownToHtml error', err);
        return rx.of({ toc: [], content: '' });
    })).subscribe();
    const handleThreadMsg = (msg) => {
        threadMsg$.next(msg);
    };
    threadTask.thread.on('message', handleThreadMsg);
    return rx.from(threadTask.promise);
}
exports.markdownToHtml = markdownToHtml;
function parseHtml(html, resolveImage) {
    let toc = [];
    try {
        const doc = parse5_1.default.parse(html, { sourceCodeLocationInfo: true });
        const content$ = dfsAccessElement(html, doc, resolveImage, toc);
        toc = createTocTree(toc);
        return content$.pipe(op.map(content => ({ toc, content })));
    }
    catch (e) {
        console.error('parseHtml() error', e);
        return rx.of({ toc, content: html });
    }
}
exports.parseHtml = parseHtml;
function dfsAccessElement(sourceHtml, root, resolveImage, 
// transpileCode?: (language: string, sourceCode: string) => Promise<string> | rx.Observable<string> | void,
toc = []) {
    const chr = new rx.BehaviorSubject(root.childNodes || []);
    const output = [];
    let htmlOffset = 0;
    chr.pipe(op.mergeMap(children => rx.from(children)), op.map(node => {
        const nodeName = node.nodeName.toLowerCase();
        if (nodeName === '#text' || nodeName === '#comment' || nodeName === '#documentType')
            return;
        const el = node;
        if (nodeName === 'img') {
            const imgSrc = el.attrs.find(item => item.name === 'src');
            if (resolveImage && imgSrc && !imgSrc.value.startsWith('/') && !/^https?:\/\//.test(imgSrc.value)) {
                log.info('found img src=' + imgSrc.value);
                output.push(sourceHtml.slice(htmlOffset, el.sourceCodeLocation.attrs.src.startOffset + 'src'.length + 2));
                htmlOffset = el.sourceCodeLocation.attrs.src.endOffset - 1;
                return output.push(resolveImage(imgSrc.value));
            }
        }
        else if (headerSet.has(nodeName)) {
            toc.push({ level: 0, tag: nodeName,
                text: lookupTextNodeIn(el),
                id: ''
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
    }, []), op.map(frags => frags.join('')));
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
    let prevHeaderSize = Number(root.tag.charAt(1));
    for (const item of input) {
        const headerSize = Number(item.tag.charAt(1));
        // console.log(`${headerSize} ${prevHeaderSize}, ${item.text}`);
        if (headerSize < prevHeaderSize) {
            const pIdx = lodash_1.default.findLastIndex(byLevel, toc => Number(toc.tag.charAt(1)) < headerSize);
            byLevel.splice(pIdx + 1);
            addAsChild(byLevel[pIdx], item);
        }
        else if (headerSize === prevHeaderSize) {
            byLevel.pop();
            const parent = byLevel[byLevel.length - 1];
            addAsChild(parent, item);
        }
        else {
            const parent = byLevel[byLevel.length - 1];
            addAsChild(parent, item);
        }
        prevHeaderSize = headerSize;
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
function* traverseTocTree(tocs) {
    for (const item of tocs) {
        yield item;
        if (item.children)
            yield* traverseTocTree(item.children);
    }
}
exports.traverseTocTree = traverseTocTree;
function tocToString(tocs) {
    let str = '';
    for (const item of traverseTocTree(tocs)) {
        str += ' |'.repeat(item.level);
        // str += '- ';
        str += `- ${item.text}`;
        str += os_1.default.EOL;
    }
    return str;
}
exports.tocToString = tocToString;
function insertOrUpdateMarkdownToc(input) {
    return markdownToHtml(input).pipe(op.map(({ toc, content: html }) => {
        const tocStr = tocMarkdown(toc);
        const BEGIN = '<!-- Plink markdown toc -->';
        const END = '<!-- Plink markdown toc end -->';
        const existing = input.indexOf(BEGIN);
        let changedMd = '';
        if (existing >= 0) {
            const replacePos = existing + BEGIN.length;
            const replaceEnd = input.indexOf(END);
            changedMd = input.slice(0, replacePos) + '\n' + tocStr + '\n' + input.slice(replaceEnd);
        }
        else {
            changedMd = [BEGIN, tocStr, END, input].join('\n');
        }
        return { changedMd, toc: tocToString(toc), html };
    }), op.take(1)).toPromise();
}
exports.insertOrUpdateMarkdownToc = insertOrUpdateMarkdownToc;
function tocMarkdown(tocs) {
    let str = '';
    let i = 0;
    for (const item of traverseTocTree(tocs)) {
        if (item.level > 2)
            continue; // only show title of level 0 - 2
        str += '  '.repeat(item.level);
        str += `${item.level > 0 ? '-' : i > 0 ? os_1.default.EOL : ''} ${item.text}`;
        str += os_1.default.EOL;
        i++;
    }
    return str.slice(0, -1);
}
//# sourceMappingURL=markdown-util.js.map