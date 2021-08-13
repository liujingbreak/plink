"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertOrUpdateMarkdownToc = exports.tocToString = exports.traverseTocTree = exports.markdownToHtml = void 0;
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const thread_promise_pool_1 = require("@wfh/thread-promise-pool");
const path_1 = __importDefault(require("path"));
const cheerio_1 = __importDefault(require("cheerio"));
const plink_1 = require("@wfh/plink");
const util_1 = __importDefault(require("util"));
const lodash_1 = __importDefault(require("lodash"));
const os_1 = __importDefault(require("os"));
const log = plink_1.log4File(__filename);
let threadPool;
/**
 * Use Thread pool to parse Markdown file simultaneously
 * @param source
 * @param resolveImage
 */
function markdownToHtml(source, resolveImage) {
    if (threadPool == null) {
        threadPool = new thread_promise_pool_1.Pool();
    }
    return rx.from(threadPool.submit({
        file: path_1.default.resolve(__dirname, 'markdown-loader-worker.js'), exportFn: 'parseToHtml', args: [source]
    })).pipe(op.mergeMap(html => {
        let toc = [];
        const $ = cheerio_1.default.load(html);
        // log.debug(html);
        const done = [];
        if (resolveImage) {
            const imgs = $('img');
            imgs.each((idx, img) => {
                const imgQ = $(img);
                const imgSrc = imgQ.attr('src');
                log.info('found img src=' + imgQ.attr('src'));
                if (imgSrc) {
                    done.push(rx.from(resolveImage(imgSrc))
                        .pipe(op.tap(resolved => {
                        imgQ.attr('src', resolved);
                        log.info(`resolve ${imgSrc} to ${util_1.default.inspect(resolved)}`);
                    })));
                }
            });
        }
        const headings = $('h1, h2, h3, h4, h5, h6');
        headings.each((idx, heading) => {
            const headingQ = $(heading);
            if (headingQ) {
                const headingText = headingQ.text();
                const id = Buffer.from(idx + headingText).toString('base64');
                // log.info(`set heading <${heading.name}> id=${id}`);
                headingQ.attr('id', id);
                toc.push({ level: 0, tag: heading.tagName.toLowerCase(), text: headingText, id });
            }
        });
        toc = createTocTree(toc);
        return rx.merge(...done).pipe(op.count(), op.mapTo({ toc, content: html }), op.catchError(err => {
            log.error(err);
            // cb(err, JSON.stringify({ toc, content: source }), sourceMap);
            return rx.of({ toc, content: source });
        }));
    }));
}
exports.markdownToHtml = markdownToHtml;
function createTocTree(input) {
    const root = { level: -1, tag: 'h0', text: '', id: '', children: [] };
    let byLevel = [root]; // a stack of previous TOC items ordered by level
    let prevHeaderSize = Number(root.tag.charAt(1));
    for (const item of input) {
        const headerSize = Number(item.tag.charAt(1));
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
            let replacePos = existing + BEGIN.length;
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
    for (const item of traverseTocTree(tocs)) {
        str += '  '.repeat(item.level);
        str += `${item.level > 0 ? '-' : ''} ${item.text}`;
        str += '\n';
    }
    return str.slice(0, -1);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd24tdXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1hcmtkb3duLXV0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMsa0VBQThDO0FBRTlDLGdEQUF3QjtBQUN4QixzREFBOEI7QUFDOUIsc0NBQW9DO0FBQ3BDLGdEQUF3QjtBQUN4QixvREFBdUI7QUFDdkIsNENBQW9CO0FBQ3BCLE1BQU0sR0FBRyxHQUFHLGdCQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7QUFFakMsSUFBSSxVQUFnQixDQUFDO0FBRXJCOzs7O0dBSUc7QUFDSCxTQUFnQixjQUFjLENBQUMsTUFBYyxFQUFFLFlBQTBFO0lBRXZILElBQUksVUFBVSxJQUFJLElBQUksRUFBRTtRQUN0QixVQUFVLEdBQUcsSUFBSSwwQkFBSSxFQUFFLENBQUM7S0FDekI7SUFFRCxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBUztRQUN2QyxJQUFJLEVBQUUsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsMkJBQTJCLENBQUMsRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQztLQUNwRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQ04sRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNqQixJQUFJLEdBQUcsR0FBVSxFQUFFLENBQUM7UUFDcEIsTUFBTSxDQUFDLEdBQUcsaUJBQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0IsbUJBQW1CO1FBQ25CLE1BQU0sSUFBSSxHQUFnRCxFQUFFLENBQUM7UUFDN0QsSUFBSSxZQUFZLEVBQUU7WUFDaEIsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3RCLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxH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LE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDL0IsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUNuRCxHQUFHLElBQUksSUFBSSxDQUFDO0tBQ2I7SUFDRCxPQUFPLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUIsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtQb29sfSBmcm9tICdAd2ZoL3RocmVhZC1wcm9taXNlLXBvb2wnO1xuaW1wb3J0IHtUT0N9IGZyb20gJy4uL2lzb20vbWQtdHlwZXMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY2hlZXJpbyBmcm9tICdjaGVlcmlvJztcbmltcG9ydCB7bG9nNEZpbGV9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IHV0aWwgZnJvbSAndXRpbCc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IG9zIGZyb20gJ29zJztcbmNvbnN0IGxvZyA9IGxvZzRGaWxlKF9fZmlsZW5hbWUpO1xuXG5sZXQgdGhyZWFkUG9vbDogUG9vbDtcblxuLyoqXG4gKiBVc2UgVGhyZWFkIHBvb2wgdG8gcGFyc2UgTWFya2Rvd24gZmlsZSBzaW11bHRhbmVvdXNseVxuICogQHBhcmFtIHNvdXJjZSBcbiAqIEBwYXJhbSByZXNvbHZlSW1hZ2UgXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBtYXJrZG93blRvSHRtbChzb3VyY2U6IHN0cmluZywgcmVzb2x2ZUltYWdlPzogKGltZ1NyYzogc3RyaW5nKSA9PiBQcm9taXNlPHN0cmluZz4gfCByeC5PYnNlcnZhYmxlPHN0cmluZz4pOlxuICByeC5PYnNlcnZhYmxlPHt0b2M6IFRPQ1tdOyBjb250ZW50OiBzdHJpbmd9PiB7XG4gIGlmICh0aHJlYWRQb29sID09IG51bGwpIHtcbiAgICB0aHJlYWRQb29sID0gbmV3IFBvb2woKTtcbiAgfVxuXG4gIHJldHVybiByeC5mcm9tKHRocmVhZFBvb2wuc3VibWl0PHN0cmluZz4oe1xuICAgIGZpbGU6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdtYXJrZG93bi1sb2FkZXItd29ya2VyLmpzJyksIGV4cG9ydEZuOiAncGFyc2VUb0h0bWwnLCBhcmdzOiBbc291cmNlXVxuICB9KSkucGlwZShcbiAgICBvcC5tZXJnZU1hcChodG1sID0+IHtcbiAgICAgIGxldCB0b2M6IFRPQ1tdID0gW107XG4gICAgICBjb25zdCAkID0gY2hlZXJpby5sb2FkKGh0bWwpO1xuICAgICAgLy8gbG9nLmRlYnVnKGh0bWwpO1xuICAgICAgY29uc3QgZG9uZTogKHJ4Lk9ic2VydmFibGU8c3RyaW5nPiB8IFByb21pc2U8c3RyaW5nPilbXSA9IFtdO1xuICAgICAgaWYgKHJlc29sdmVJbWFnZSkge1xuICAgICAgICBjb25zdCBpbWdzID0gJCgnaW1nJyk7XG4gICAgICAgIGltZ3MuZWFjaCgoaWR4LCBpbWcpID0+IHtcbiAgICAgICAgICBjb25zdCBpbWdRID0gJChpbWcpO1xuICAgICAgICAgIGNvbnN0IGltZ1NyYyA9IGltZ1EuYXR0cignc3JjJyk7XG4gICAgICAgICAgbG9nLmluZm8oJ2ZvdW5kIGltZyBzcmM9JyArIGltZ1EuYXR0cignc3JjJykpO1xuICAgICAgICAgIGlmIChpbWdTcmMpIHtcbiAgICAgICAgICAgIGRvbmUucHVzaChyeC5mcm9tKHJlc29sdmVJbWFnZShpbWdTcmMpKVxuICAgICAgICAgICAgICAucGlwZShcbiAgICAgICAgICAgICAgICBvcC50YXAocmVzb2x2ZWQgPT4ge1xuICAgICAgICAgICAgICAgICAgaW1nUS5hdHRyKCdzcmMnLCByZXNvbHZlZCk7XG4gICAgICAgICAgICAgICAgICBsb2cuaW5mbyhgcmVzb2x2ZSAke2ltZ1NyY30gdG8gJHt1dGlsLmluc3BlY3QocmVzb2x2ZWQpfWApO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICBjb25zdCBoZWFkaW5ncyA9ICQoJ2gxLCBoMiwgaDMsIGg0LCBoNSwgaDYnKTtcbiAgICAgIGhlYWRpbmdzLmVhY2goKGlkeCwgaGVhZGluZykgPT4ge1xuICAgICAgICAgIGNvbnN0IGhlYWRpbmdRID0gJChoZWFkaW5nKTtcbiAgICAgICAgICBpZiAoaGVhZGluZ1EpIHtcbiAgICAgICAgICAgICAgY29uc3QgaGVhZGluZ1RleHQgPSBoZWFkaW5nUS50ZXh0KCk7XG4gICAgICAgICAgICAgIGNvbnN0IGlkID0gQnVmZmVyLmZyb20oaWR4ICsgaGVhZGluZ1RleHQpLnRvU3RyaW5nKCdiYXNlNjQnKTtcbiAgICAgICAgICAgICAgLy8gbG9nLmluZm8oYHNldCBoZWFkaW5nIDwke2hlYWRpbmcubmFtZX0+IGlkPSR7aWR9YCk7XG4gICAgICAgICAgICAgIGhlYWRpbmdRLmF0dHIoJ2lkJywgaWQpO1xuICAgICAgICAgICAgICB0b2MucHVzaCh7bGV2ZWw6IDAsIHRhZzogaGVhZGluZy50YWdOYW1lLnRvTG93ZXJDYXNlKCksIHRleHQ6IGhlYWRpbmdUZXh0LCBpZCB9KTtcbiAgICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIHRvYyA9IGNyZWF0ZVRvY1RyZWUodG9jKTtcbiAgICAgIHJldHVybiByeC5tZXJnZSguLi5kb25lKS5waXBlKFxuICAgICAgICBvcC5jb3VudCgpLFxuICAgICAgICBvcC5tYXBUbyh7IHRvYywgY29udGVudDogaHRtbCB9KSxcbiAgICAgICAgb3AuY2F0Y2hFcnJvcihlcnIgPT4ge1xuICAgICAgICAgIGxvZy5lcnJvcihlcnIpO1xuICAgICAgICAgIC8vIGNiKGVyciwgSlNPTi5zdHJpbmdpZnkoeyB0b2MsIGNvbnRlbnQ6IHNvdXJjZSB9KSwgc291cmNlTWFwKTtcbiAgICAgICAgICByZXR1cm4gcngub2YoeyB0b2MsIGNvbnRlbnQ6IHNvdXJjZSB9KTtcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfSlcbiAgKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlVG9jVHJlZShpbnB1dDogVE9DW10pIHtcbiAgY29uc3Qgcm9vdDogVE9DID0ge2xldmVsOiAtMSwgdGFnOiAnaDAnLCB0ZXh0OiAnJywgaWQ6ICcnLCBjaGlsZHJlbjogW119O1xuICBsZXQgYnlMZXZlbDogVE9DW10gPSBbcm9vdF07IC8vIGEgc3RhY2sgb2YgcHJldmlvdXMgVE9DIGl0ZW1zIG9yZGVyZWQgYnkgbGV2ZWxcbiAgbGV0IHByZXZIZWFkZXJTaXplID0gTnVtYmVyKHJvb3QudGFnLmNoYXJBdCgxKSk7XG4gIGZvciAoY29uc3QgaXRlbSBvZiBpbnB1dCkge1xuICAgIGNvbnN0IGhlYWRlclNpemUgPSBOdW1iZXIoaXRlbS50YWcuY2hhckF0KDEpKTtcbiAgICBpZiAoaGVhZGVyU2l6ZSA8IHByZXZIZWFkZXJTaXplKSB7XG4gICAgICBjb25zdCBwSWR4ID0gXy5maW5kTGFzdEluZGV4KGJ5TGV2ZWwsIHRvYyA9PiBOdW1iZXIodG9jLnRhZy5jaGFyQXQoMSkpIDwgaGVhZGVyU2l6ZSk7XG4gICAgICBieUxldmVsLnNwbGljZShwSWR4ICsgMSk7XG4gICAgICBhZGRBc0NoaWxkKGJ5TGV2ZWxbcElkeF0sIGl0ZW0pO1xuICAgIH0gZWxzZSBpZiAoaGVhZGVyU2l6ZSA9PT0gcHJldkhlYWRlclNpemUpIHtcbiAgICAgIGJ5TGV2ZWwucG9wKCk7XG4gICAgICBjb25zdCBwYXJlbnQgPSBieUxldmVsW2J5TGV2ZWwubGVuZ3RoIC0gMV07XG4gICAgICBhZGRBc0NoaWxkKHBhcmVudCwgaXRlbSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHBhcmVudCA9IGJ5TGV2ZWxbYnlMZXZlbC5sZW5ndGggLSAxXTtcbiAgICAgIGFkZEFzQ2hpbGQocGFyZW50LCBpdGVtKTtcbiAgICB9XG4gICAgcHJldkhlYWRlclNpemUgPSBoZWFkZXJTaXplO1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkQXNDaGlsZChwYXJlbnQ6IFRPQywgY2hpbGQ6IFRPQykge1xuICAgIGlmIChwYXJlbnQuY2hpbGRyZW4gPT0gbnVsbClcbiAgICAgIHBhcmVudC5jaGlsZHJlbiA9IFtjaGlsZF07XG4gICAgZWxzZVxuICAgICAgcGFyZW50LmNoaWxkcmVuLnB1c2goY2hpbGQpO1xuICAgIGNoaWxkLmxldmVsID0gYnlMZXZlbFtieUxldmVsLmxlbmd0aCAtIDFdID8gYnlMZXZlbFtieUxldmVsLmxlbmd0aCAtIDFdLmxldmVsICsgMSA6IDA7XG4gICAgYnlMZXZlbC5wdXNoKGNoaWxkKTtcbiAgfVxuICByZXR1cm4gcm9vdC5jaGlsZHJlbiE7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiogdHJhdmVyc2VUb2NUcmVlKHRvY3M6IFRPQ1tdKTogR2VuZXJhdG9yPFRPQz4ge1xuICBmb3IgKGNvbnN0IGl0ZW0gb2YgdG9jcykge1xuICAgIHlpZWxkIGl0ZW07XG4gICAgaWYgKGl0ZW0uY2hpbGRyZW4pXG4gICAgICB5aWVsZCogdHJhdmVyc2VUb2NUcmVlKGl0ZW0uY2hpbGRyZW4pO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b2NUb1N0cmluZyh0b2NzOiBUT0NbXSkge1xuICBsZXQgc3RyID0gJyc7XG4gIGZvciAoY29uc3QgaXRlbSBvZiB0cmF2ZXJzZVRvY1RyZWUodG9jcykpIHtcbiAgICBzdHIgKz0gJyB8Jy5yZXBlYXQoaXRlbS5sZXZlbCk7XG4gICAgLy8gc3RyICs9ICctICc7XG4gICAgc3RyICs9IGAtICR7aXRlbS50ZXh0fWA7XG4gICAgc3RyICs9IG9zLkVPTDtcbiAgfVxuICByZXR1cm4gc3RyO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaW5zZXJ0T3JVcGRhdGVNYXJrZG93blRvYyhpbnB1dDogc3RyaW5nKSB7XG4gIHJldHVybiBtYXJrZG93blRvSHRtbChpbnB1dCkucGlwZShcbiAgICBvcC5tYXAoKHt0b2MsIGNvbnRlbnQ6IGh0bWx9KSA9PiB7XG4gICAgICBjb25zdCB0b2NTdHIgPSB0b2NNYXJrZG93bih0b2MpO1xuICAgICAgY29uc3QgQkVHSU4gPSAnPCEtLSBQbGluayBtYXJrZG93biB0b2MgLS0+JztcbiAgICAgIGNvbnN0IEVORCA9ICc8IS0tIFBsaW5rIG1hcmtkb3duIHRvYyBlbmQgLS0+JztcbiAgICAgIGNvbnN0IGV4aXN0aW5nID0gaW5wdXQuaW5kZXhPZihCRUdJTik7XG4gICAgICBsZXQgY2hhbmdlZE1kID0gJyc7XG4gICAgICBpZiAoZXhpc3RpbmcgPj0gMCkge1xuICAgICAgICBsZXQgcmVwbGFjZVBvcyA9IGV4aXN0aW5nICsgQkVHSU4ubGVuZ3RoO1xuICAgICAgICBjb25zdCByZXBsYWNlRW5kID0gaW5wdXQuaW5kZXhPZihFTkQpO1xuICAgICAgICBjaGFuZ2VkTWQgPSBpbnB1dC5zbGljZSgwLCByZXBsYWNlUG9zKSArICdcXG4nICsgdG9jU3RyICsgJ1xcbicgKyBpbnB1dC5zbGljZShyZXBsYWNlRW5kKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNoYW5nZWRNZCA9IFtCRUdJTiAsIHRvY1N0ciwgRU5ELCBpbnB1dF0uam9pbignXFxuJyk7XG4gICAgICB9XG4gICAgICByZXR1cm4geyBjaGFuZ2VkTWQsIHRvYzogdG9jVG9TdHJpbmcodG9jKSwgaHRtbCB9O1xuICAgIH0pLFxuICAgIG9wLnRha2UoMSlcbiAgKS50b1Byb21pc2UoKTtcbn1cblxuZnVuY3Rpb24gdG9jTWFya2Rvd24odG9jczogVE9DW10pIHtcbiAgbGV0IHN0ciA9ICcnO1xuICBmb3IgKGNvbnN0IGl0ZW0gb2YgdHJhdmVyc2VUb2NUcmVlKHRvY3MpKSB7XG4gICAgc3RyICs9ICcgICcucmVwZWF0KGl0ZW0ubGV2ZWwpO1xuICAgIHN0ciArPSBgJHtpdGVtLmxldmVsID4gMCA/ICctJyA6ICcnfSAke2l0ZW0udGV4dH1gO1xuICAgIHN0ciArPSAnXFxuJztcbiAgfVxuICByZXR1cm4gc3RyLnNsaWNlKDAsIC0xKTtcbn1cbiJdfQ==