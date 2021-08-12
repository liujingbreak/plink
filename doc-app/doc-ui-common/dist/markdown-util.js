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
exports.tocToString = exports.traverseTocTree = exports.markdownToHtml = void 0;
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
        log.debug(html);
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
        return rx.merge(...done).pipe(op.count(), op.mapTo({ toc, content: source }), op.catchError(err => {
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
        child.level = byLevel.length;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd24tdXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1hcmtkb3duLXV0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMsa0VBQThDO0FBRTlDLGdEQUF3QjtBQUN4QixzREFBOEI7QUFDOUIsc0NBQW9DO0FBQ3BDLGdEQUF3QjtBQUN4QixvREFBdUI7QUFDdkIsNENBQW9CO0FBQ3BCLE1BQU0sR0FBRyxHQUFHLGdCQUFRLENBQUMsVUFBVSxDQUFDLENBQUM7QUFFakMsSUFBSSxVQUFnQixDQUFDO0FBRXJCOzs7O0dBSUc7QUFDSCxTQUFnQixjQUFjLENBQUMsTUFBYyxFQUFFLFlBQTBFO0lBRXZILElBQUksVUFBVSxJQUFJLElBQUksRUFBRTtRQUN0QixVQUFVLEdBQUcsSUFBSSwwQkFBSSxFQUFFLENBQUM7S0FDekI7SUFFRCxPQUFPLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBUztRQUN2QyxJQUFJLEVBQUUsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsMkJBQTJCLENBQUMsRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQztLQUNwRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQ04sRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUNqQixJQUFJLEdBQUcsR0FBVSxFQUFFLENBQUM7UUFDcEIsTUFBTSxDQUFDLEdBQUcsaUJBQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0IsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNoQixNQUFNLElBQUksR0FBZ0QsRUFBRSxDQUFDO1FBQzdELElBQUksWUFBWSxFQUFFO1lBQ2hCLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN0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QU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBQzlCLEtBQUssQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUM3QixPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ3RCLENBQUM7SUFDRCxPQUFPLElBQUksQ0FBQyxRQUFTLENBQUM7QUFDeEIsQ0FBQztBQUVELFFBQWUsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxJQUFXO0lBQzFDLEtBQUssTUFBTSxJQUFJLElBQUksSUFBSSxFQUFFO1FBQ3ZCLE1BQU0sSUFBSSxDQUFDO1FBQ1gsSUFBSSxJQUFJLENBQUMsUUFBUTtZQUNmLEtBQUssQ0FBQyxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7S0FDekM7QUFDSCxDQUFDO0FBTkQsMENBTUM7QUFFRCxTQUFnQixXQUFXLENBQUMsSUFBVztJQUNyQyxJQUFJLEdBQUcsR0FBRyxFQUFFLENBQUM7SUFDYixLQUFLLE1BQU0sSUFBSSxJQUFJLGVBQWUsQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUN4QyxHQUFHLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7UUFDL0IsZUFBZTtRQUNmLEdBQUcsSUFBSSxLQUFLLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUN4QixHQUFHLElBQUksWUFBRSxDQUFDLEdBQUcsQ0FBQztLQUNmO0lBQ0QsT0FBTyxHQUFHLENBQUM7QUFDYixDQUFDO0FBVEQsa0NBU0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7UG9vbH0gZnJvbSAnQHdmaC90aHJlYWQtcHJvbWlzZS1wb29sJztcbmltcG9ydCB7VE9DfSBmcm9tICcuLi9pc29tL21kLXR5cGVzJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGNoZWVyaW8gZnJvbSAnY2hlZXJpbyc7XG5pbXBvcnQge2xvZzRGaWxlfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCB1dGlsIGZyb20gJ3V0aWwnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCBvcyBmcm9tICdvcyc7XG5jb25zdCBsb2cgPSBsb2c0RmlsZShfX2ZpbGVuYW1lKTtcblxubGV0IHRocmVhZFBvb2w6IFBvb2w7XG5cbi8qKlxuICogVXNlIFRocmVhZCBwb29sIHRvIHBhcnNlIE1hcmtkb3duIGZpbGUgc2ltdWx0YW5lb3VzbHlcbiAqIEBwYXJhbSBzb3VyY2UgXG4gKiBAcGFyYW0gcmVzb2x2ZUltYWdlIFxuICovXG5leHBvcnQgZnVuY3Rpb24gbWFya2Rvd25Ub0h0bWwoc291cmNlOiBzdHJpbmcsIHJlc29sdmVJbWFnZT86IChpbWdTcmM6IHN0cmluZykgPT4gUHJvbWlzZTxzdHJpbmc+IHwgcnguT2JzZXJ2YWJsZTxzdHJpbmc+KTpcbiAgcnguT2JzZXJ2YWJsZTx7dG9jOiBUT0NbXTsgY29udGVudDogc3RyaW5nfT4ge1xuICBpZiAodGhyZWFkUG9vbCA9PSBudWxsKSB7XG4gICAgdGhyZWFkUG9vbCA9IG5ldyBQb29sKCk7XG4gIH1cblxuICByZXR1cm4gcnguZnJvbSh0aHJlYWRQb29sLnN1Ym1pdDxzdHJpbmc+KHtcbiAgICBmaWxlOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnbWFya2Rvd24tbG9hZGVyLXdvcmtlci5qcycpLCBleHBvcnRGbjogJ3BhcnNlVG9IdG1sJywgYXJnczogW3NvdXJjZV1cbiAgfSkpLnBpcGUoXG4gICAgb3AubWVyZ2VNYXAoaHRtbCA9PiB7XG4gICAgICBsZXQgdG9jOiBUT0NbXSA9IFtdO1xuICAgICAgY29uc3QgJCA9IGNoZWVyaW8ubG9hZChodG1sKTtcbiAgICAgIGxvZy5kZWJ1ZyhodG1sKTtcbiAgICAgIGNvbnN0IGRvbmU6IChyeC5PYnNlcnZhYmxlPHN0cmluZz4gfCBQcm9taXNlPHN0cmluZz4pW10gPSBbXTtcbiAgICAgIGlmIChyZXNvbHZlSW1hZ2UpIHtcbiAgICAgICAgY29uc3QgaW1ncyA9ICQoJ2ltZycpO1xuICAgICAgICBpbWdzLmVhY2goKGlkeCwgaW1nKSA9PiB7XG4gICAgICAgICAgY29uc3QgaW1nUSA9ICQoaW1nKTtcbiAgICAgICAgICBjb25zdCBpbWdTcmMgPSBpbWdRLmF0dHIoJ3NyYycpO1xuICAgICAgICAgIGxvZy5pbmZvKCdmb3VuZCBpbWcgc3JjPScgKyBpbWdRLmF0dHIoJ3NyYycpKTtcbiAgICAgICAgICBpZiAoaW1nU3JjKSB7XG4gICAgICAgICAgICBkb25lLnB1c2gocnguZnJvbShyZXNvbHZlSW1hZ2UoaW1nU3JjKSlcbiAgICAgICAgICAgICAgLnBpcGUoXG4gICAgICAgICAgICAgICAgb3AudGFwKHJlc29sdmVkID0+IHtcbiAgICAgICAgICAgICAgICAgIGltZ1EuYXR0cignc3JjJywgcmVzb2x2ZWQpO1xuICAgICAgICAgICAgICAgICAgbG9nLmluZm8oYHJlc29sdmUgJHtpbWdTcmN9IHRvICR7dXRpbC5pbnNwZWN0KHJlc29sdmVkKX1gKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICApKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY29uc3QgaGVhZGluZ3MgPSAkKCdoMSwgaDIsIGgzLCBoNCwgaDUsIGg2Jyk7XG4gICAgICBoZWFkaW5ncy5lYWNoKChpZHgsIGhlYWRpbmcpID0+IHtcbiAgICAgICAgICBjb25zdCBoZWFkaW5nUSA9ICQoaGVhZGluZyk7XG4gICAgICAgICAgaWYgKGhlYWRpbmdRKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGhlYWRpbmdUZXh0ID0gaGVhZGluZ1EudGV4dCgpO1xuICAgICAgICAgICAgICBjb25zdCBpZCA9IEJ1ZmZlci5mcm9tKGlkeCArIGhlYWRpbmdUZXh0KS50b1N0cmluZygnYmFzZTY0Jyk7XG4gICAgICAgICAgICAgIC8vIGxvZy5pbmZvKGBzZXQgaGVhZGluZyA8JHtoZWFkaW5nLm5hbWV9PiBpZD0ke2lkfWApO1xuICAgICAgICAgICAgICBoZWFkaW5nUS5hdHRyKCdpZCcsIGlkKTtcbiAgICAgICAgICAgICAgdG9jLnB1c2goe2xldmVsOiAwLCB0YWc6IGhlYWRpbmcudGFnTmFtZS50b0xvd2VyQ2FzZSgpLCB0ZXh0OiBoZWFkaW5nVGV4dCwgaWQgfSk7XG4gICAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICB0b2MgPSBjcmVhdGVUb2NUcmVlKHRvYyk7XG4gICAgICByZXR1cm4gcngubWVyZ2UoLi4uZG9uZSkucGlwZShcbiAgICAgICAgb3AuY291bnQoKSxcbiAgICAgICAgb3AubWFwVG8oeyB0b2MsIGNvbnRlbnQ6IHNvdXJjZSB9KSxcbiAgICAgICAgb3AuY2F0Y2hFcnJvcihlcnIgPT4ge1xuICAgICAgICAgIGxvZy5lcnJvcihlcnIpO1xuICAgICAgICAgIC8vIGNiKGVyciwgSlNPTi5zdHJpbmdpZnkoeyB0b2MsIGNvbnRlbnQ6IHNvdXJjZSB9KSwgc291cmNlTWFwKTtcbiAgICAgICAgICByZXR1cm4gcngub2YoeyB0b2MsIGNvbnRlbnQ6IHNvdXJjZSB9KTtcbiAgICAgICAgfSlcbiAgICAgICk7XG4gICAgfSlcbiAgKTtcbn1cblxuZnVuY3Rpb24gY3JlYXRlVG9jVHJlZShpbnB1dDogVE9DW10pIHtcbiAgY29uc3Qgcm9vdDogVE9DID0ge2xldmVsOiAtMSwgdGFnOiAnaDAnLCB0ZXh0OiAnJywgaWQ6ICcnLCBjaGlsZHJlbjogW119O1xuICBsZXQgYnlMZXZlbDogVE9DW10gPSBbcm9vdF07IC8vIGEgc3RhY2sgb2YgcHJldmlvdXMgVE9DIGl0ZW1zIG9yZGVyZWQgYnkgbGV2ZWxcbiAgbGV0IHByZXZIZWFkZXJTaXplID0gTnVtYmVyKHJvb3QudGFnLmNoYXJBdCgxKSk7XG4gIGZvciAoY29uc3QgaXRlbSBvZiBpbnB1dCkge1xuICAgIGNvbnN0IGhlYWRlclNpemUgPSBOdW1iZXIoaXRlbS50YWcuY2hhckF0KDEpKTtcbiAgICBpZiAoaGVhZGVyU2l6ZSA8IHByZXZIZWFkZXJTaXplKSB7XG4gICAgICBjb25zdCBwSWR4ID0gXy5maW5kTGFzdEluZGV4KGJ5TGV2ZWwsIHRvYyA9PiBOdW1iZXIodG9jLnRhZy5jaGFyQXQoMSkpIDwgaGVhZGVyU2l6ZSk7XG4gICAgICBieUxldmVsLnNwbGljZShwSWR4ICsgMSk7XG4gICAgICBhZGRBc0NoaWxkKGJ5TGV2ZWxbcElkeF0sIGl0ZW0pO1xuICAgIH0gZWxzZSBpZiAoaGVhZGVyU2l6ZSA9PT0gcHJldkhlYWRlclNpemUpIHtcbiAgICAgIGJ5TGV2ZWwucG9wKCk7XG4gICAgICBjb25zdCBwYXJlbnQgPSBieUxldmVsW2J5TGV2ZWwubGVuZ3RoIC0gMV07XG4gICAgICBhZGRBc0NoaWxkKHBhcmVudCwgaXRlbSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IHBhcmVudCA9IGJ5TGV2ZWxbYnlMZXZlbC5sZW5ndGggLSAxXTtcbiAgICAgIGFkZEFzQ2hpbGQocGFyZW50LCBpdGVtKTtcbiAgICB9XG4gICAgcHJldkhlYWRlclNpemUgPSBoZWFkZXJTaXplO1xuICB9XG5cbiAgZnVuY3Rpb24gYWRkQXNDaGlsZChwYXJlbnQ6IFRPQywgY2hpbGQ6IFRPQykge1xuICAgIGlmIChwYXJlbnQuY2hpbGRyZW4gPT0gbnVsbClcbiAgICAgIHBhcmVudC5jaGlsZHJlbiA9IFtjaGlsZF07XG4gICAgZWxzZVxuICAgICAgcGFyZW50LmNoaWxkcmVuLnB1c2goY2hpbGQpO1xuICAgIGNoaWxkLmxldmVsID0gYnlMZXZlbC5sZW5ndGg7XG4gICAgYnlMZXZlbC5wdXNoKGNoaWxkKTtcbiAgfVxuICByZXR1cm4gcm9vdC5jaGlsZHJlbiE7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiogdHJhdmVyc2VUb2NUcmVlKHRvY3M6IFRPQ1tdKTogR2VuZXJhdG9yPFRPQz4ge1xuICBmb3IgKGNvbnN0IGl0ZW0gb2YgdG9jcykge1xuICAgIHlpZWxkIGl0ZW07XG4gICAgaWYgKGl0ZW0uY2hpbGRyZW4pXG4gICAgICB5aWVsZCogdHJhdmVyc2VUb2NUcmVlKGl0ZW0uY2hpbGRyZW4pO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB0b2NUb1N0cmluZyh0b2NzOiBUT0NbXSkge1xuICBsZXQgc3RyID0gJyc7XG4gIGZvciAoY29uc3QgaXRlbSBvZiB0cmF2ZXJzZVRvY1RyZWUodG9jcykpIHtcbiAgICBzdHIgKz0gJyB8Jy5yZXBlYXQoaXRlbS5sZXZlbCk7XG4gICAgLy8gc3RyICs9ICctICc7XG4gICAgc3RyICs9IGAtICR7aXRlbS50ZXh0fWA7XG4gICAgc3RyICs9IG9zLkVPTDtcbiAgfVxuICByZXR1cm4gc3RyO1xufVxuIl19