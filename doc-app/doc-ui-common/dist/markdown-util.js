"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertOrUpdateMarkdownToc = exports.tocToString = exports.traverseTocTree = exports.parseHtml = exports.markdownToHtml = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const util_1 = tslib_1.__importDefault(require("util"));
const os_1 = tslib_1.__importDefault(require("os"));
const rx = tslib_1.__importStar(require("rxjs"));
const op = tslib_1.__importStar(require("rxjs/operators"));
const thread_promise_pool_1 = require("@wfh/thread-promise-pool");
const plink_1 = require("@wfh/plink");
const patch_text_1 = tslib_1.__importDefault(require("@wfh/plink/wfh/dist/utils/patch-text"));
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
    threadMsg$.pipe(op.filter(msg => msg.type === 'resolveImageSrc'), op.map(msg => msg.data), op.mergeMap(imgSrc => resolveImage ? resolveImage(imgSrc) : rx.of(imgSrc)), op.tap(imgUrl => {
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
function parseHtml(html, resolveImage, transpileCode) {
    let toc = [];
    return rx.defer(() => {
        try {
            const doc = parse5_1.default.parse(html, { sourceCodeLocationInfo: true });
            const done = dfsAccessElement(html, doc, resolveImage, transpileCode, toc);
            toc = createTocTree(toc);
            return rx.from(done);
        }
        catch (e) {
            console.error('parseHtml() error', e);
            return rx.from([]);
        }
    }).pipe(op.mergeMap(replacement => replacement), op.reduce((acc, item) => {
        acc.push(item);
        return acc;
    }, []), op.map(all => {
        const content = (0, patch_text_1.default)(html, all);
        // log.warn(html, '\n=>\n', content);
        return { toc, content };
    }), op.catchError(err => {
        log.error('parseHtml error', err);
        // cb(err, JSON.stringify({ toc, content: source }), sourceMap);
        return rx.of({ toc, content: html });
    }));
}
exports.parseHtml = parseHtml;
function dfsAccessElement(sourceHtml, root, resolveImage, transpileCode, toc = []) {
    const chr = new rx.BehaviorSubject(root.childNodes || []);
    const done = [];
    chr.pipe(op.mergeMap(children => rx.from(children))).pipe(op.map(node => {
        const nodeName = node.nodeName.toLowerCase();
        if (nodeName === '#text' || nodeName === '#comment' || nodeName === '#documentType')
            return;
        const el = node;
        if (nodeName === 'img') {
            const imgSrc = el.attrs.find(item => item.name === 'src');
            if (resolveImage && imgSrc && !imgSrc.value.startsWith('/') && !/^https?:\/\//.test(imgSrc.value)) {
                log.info('found img src=' + imgSrc.value);
                done.push(rx.from(resolveImage(imgSrc.value))
                    .pipe(op.map(resolved => {
                    var _a, _b;
                    const srcPos = (_b = (_a = el.sourceCodeLocation) === null || _a === void 0 ? void 0 : _a.attrs) === null || _b === void 0 ? void 0 : _b.src;
                    log.info(`resolve ${imgSrc.value} to ${util_1.default.inspect(resolved)}`);
                    return { start: srcPos.startOffset + 'src'.length + 1, end: srcPos.endOffset, text: resolved };
                })));
            }
        }
        else if (headerSet.has(nodeName)) {
            toc.push({ level: 0, tag: nodeName,
                text: lookupTextNodeIn(el),
                id: ''
            });
        }
        else if (nodeName === 'code') {
            const classAttr = el.attrs.find(attr => { var _a; return attr.name === 'class' && ((_a = attr.value) === null || _a === void 0 ? void 0 : _a.startsWith('language-')); });
            if (classAttr) {
                const lang = classAttr.value.slice('language-'.length);
                if (transpileCode) {
                    const transpileDone = transpileCode(lang, sourceHtml.slice(el.sourceCodeLocation.startTag.endOffset, el.sourceCodeLocation.endTag.startOffset));
                    if (transpileDone == null)
                        return;
                    done.push(rx.from(transpileDone).pipe(op.map(text => ({
                        start: el.parentNode.sourceCodeLocation.startOffset,
                        end: el.parentNode.sourceCodeLocation.endOffset,
                        text
                    }))));
                }
            }
        }
        if (el.childNodes)
            chr.next(el.childNodes);
    })).subscribe();
    return done;
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