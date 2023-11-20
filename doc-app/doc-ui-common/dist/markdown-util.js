"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertOrUpdateMarkdownToc = exports.tocToString = exports.traverseTocTree = exports.markdownToHtml = void 0;
const tslib_1 = require("tslib");
const path_1 = tslib_1.__importDefault(require("path"));
const os_1 = tslib_1.__importDefault(require("os"));
const rx = tslib_1.__importStar(require("rxjs"));
const op = tslib_1.__importStar(require("rxjs/operators"));
const thread_promise_pool_1 = require("@wfh/thread-promise-pool");
const plink_1 = require("@wfh/plink");
const log = (0, plink_1.log4File)(__filename);
let threadPool;
/**
 * Use Thread pool to parse Markdown file simultaneously
 * @param source
 * @param resolveImage
 */
function markdownToHtml(source, srcFile, resolveImage, resolveLink) {
    if (threadPool == null) {
        threadPool = new thread_promise_pool_1.Pool(os_1.default.cpus().length > 1 ? os_1.default.cpus().length - 1 : 3, 1000);
    }
    const threadTask = threadPool.submitAndReturnTask({
        file: path_1.default.resolve(__dirname, 'markdown-loader-worker.js'),
        exportFn: 'toContentAndToc',
        args: [source]
    });
    const threadMsg$ = new rx.Subject();
    threadMsg$.pipe(op.filter(msg => msg.type === 'resolveImageSrc'), op.map(msg => msg.data), op.mergeMap(imgSrc => resolveImage ? resolveImage(imgSrc) : rx.of(JSON.stringify(imgSrc))), op.tap({
        next: imgUrl => {
            var _a;
            (_a = threadTask.thread) === null || _a === void 0 ? void 0 : _a.postMessage({ type: 'resolveImageSrc', data: imgUrl });
            log.info('send resolved image', imgUrl);
        },
        complete: () => {
            threadTask.thread.off('message', handleThreadMsg);
            log.info('done');
        }
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
function insertOrUpdateMarkdownToc(input, srcFile) {
    return rx.firstValueFrom(markdownToHtml(input, srcFile, img => rx.of(img)).pipe(op.map(({ toc, content: html }) => {
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
    })));
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