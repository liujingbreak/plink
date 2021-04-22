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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markdownToHtml = void 0;
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const thread_promise_pool_1 = require("@wfh/thread-promise-pool");
const path_1 = __importDefault(require("path"));
const cheerio_1 = __importDefault(require("cheerio"));
const plink_1 = require("@wfh/plink");
const util_1 = __importDefault(require("util"));
const log = plink_1.log4File(__filename);
let threadPool;
/**
 * Use Thread pool to parse Markdown file simultaneously
 * @param source
 * @param resolveImage
 */
function markdownToHtml(source, resolveImage) {
    return __awaiter(this, void 0, void 0, function* () {
        if (threadPool == null) {
            threadPool = new thread_promise_pool_1.Pool();
        }
        const html = yield threadPool.submit({
            file: path_1.default.resolve(__dirname, 'markdown-loader-worker.js'), exportFn: 'parseToHtml', args: [source]
        });
        const toc = [];
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
        const headings = $('h1, h2, h3, h5, h5, h6');
        headings.each((idx, heading) => {
            const headingQ = $(heading);
            if (headingQ) {
                const headingText = headingQ.text();
                const id = Buffer.from(idx + headingText).toString('base64');
                // log.info(`set heading <${heading.name}> id=${id}`);
                headingQ.attr('id', id);
                toc.push({ tag: heading.tagName, text: headingText, id });
            }
        });
        // console.log('toc: ', toc);
        yield rx.merge(...done).pipe(op.catchError(err => {
            log.error(err);
            // cb(err, JSON.stringify({ toc, content: source }), sourceMap);
            return rx.of(JSON.stringify({ toc, content: source }));
        }), op.finalize(() => {
            // cb(null, JSON.stringify({ toc, content: $.html() }), sourceMap);
        })).toPromise();
        return { toc, content: $.html() };
    });
}
exports.markdownToHtml = markdownToHtml;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd24tdXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1hcmtkb3duLXV0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMsa0VBQThDO0FBRTlDLGdEQUF3QjtBQUN4QixzREFBOEI7QUFDOUIsc0NBQW9DO0FBQ3BDLGdEQUF3QjtBQUd4QixNQUFNLEdBQUcsR0FBRyxnQkFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBRWpDLElBQUksVUFBZ0IsQ0FBQztBQUVyQjs7OztHQUlHO0FBQ0gsU0FBc0IsY0FBYyxDQUFDLE1BQWMsRUFBRSxZQUEwRTs7UUFDN0gsSUFBSSxVQUFVLElBQUksSUFBSSxFQUFFO1lBQ3RCLFVBQVUsR0FBRyxJQUFJLDBCQUFJLEVBQUUsQ0FBQztTQUN6QjtRQUNELE1BQU0sSUFBSSxHQUFHLE1BQU0sVUFBVSxDQUFDLE1BQU0sQ0FBUztZQUMzQyxJQUFJLEVBQUUsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsMkJBQTJCLENBQUMsRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQztTQUNwRyxDQUFDLENBQUM7UUFDSCxNQUFNLEdBQUcsR0FBVSxFQUFFLENBQUM7UUFDdEIsTUFBTSxDQUFDLEdBQUcsaUJBQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0IsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNoQixNQUFNLElBQUksR0FBOEMsRUFBRSxDQUFDO1FBRTNELElBQUksWUFBWSxFQUFFO1lBQ2hCLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN0QixJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFO2dCQUNyQixNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3BCLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ2hDLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO2dCQUM5QyxJQUFJLE1BQU0sRUFBRTtvQkFDVixJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDO3lCQUNwQyxJQUFJLENBQ0gsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRTt3QkFDaEIsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUM7d0JBQzNCLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxNQUFNLE9BQU8sY0FBSSxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQzdELENBQUMsQ0FBQyxDQUNILENBQUMsQ0FBQztpQkFDTjtZQUNILENBQUMsQ0FBQyxDQUFDO1NBQ0o7UUFDRCxNQUFNLFFBQVEsR0FBRyxDQUFDLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUM3QyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRSxFQUFFO1lBQzNCLE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUM1QixJQUFJLFFBQVEsRUFBRTtnQkFDVixNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ3BDLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxHQUFHLFdBQVcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztnQkFDN0Qsc0RBQXNEO2dCQUN0RCxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsQ0FBQztnQkFDeEIsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxPQUFPLENBQUMsT0FBTyxFQUFFLElBQUksRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQzthQUM3RDtRQUNMLENBQUMsQ0FBQyxDQUFDO1FBQ0gsNkJBQTZCO1FBQzdCLE1BQU0sRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLElBQUksQ0FDMUIsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNsQixHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ2YsZ0VBQWdFO1lBQ2hFLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekQsQ0FBQyxDQUFDLEVBQ0YsRUFBRSxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7WUFDZixtRUFBbUU7UUFDckUsQ0FBQyxDQUFDLENBQ0gsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUNkLE9BQU8sRUFBQyxHQUFHLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBQyxDQUFDO0lBQ2xDLENBQUM7Q0FBQTtBQXBERCx3Q0FvREMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7UG9vbH0gZnJvbSAnQHdmaC90aHJlYWQtcHJvbWlzZS1wb29sJztcbmltcG9ydCB7VE9DfSBmcm9tICcuLi9pc29tL21kLXR5cGVzJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IGNoZWVyaW8gZnJvbSAnY2hlZXJpbyc7XG5pbXBvcnQge2xvZzRGaWxlfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCB1dGlsIGZyb20gJ3V0aWwnO1xuXG5cbmNvbnN0IGxvZyA9IGxvZzRGaWxlKF9fZmlsZW5hbWUpO1xuXG5sZXQgdGhyZWFkUG9vbDogUG9vbDtcblxuLyoqXG4gKiBVc2UgVGhyZWFkIHBvb2wgdG8gcGFyc2UgTWFya2Rvd24gZmlsZSBzaW11bHRhbmVvdXNseVxuICogQHBhcmFtIHNvdXJjZSBcbiAqIEBwYXJhbSByZXNvbHZlSW1hZ2UgXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBtYXJrZG93blRvSHRtbChzb3VyY2U6IHN0cmluZywgcmVzb2x2ZUltYWdlPzogKGltZ1NyYzogc3RyaW5nKSA9PiBQcm9taXNlPHN0cmluZz4gfCByeC5PYnNlcnZhYmxlPHN0cmluZz4pIHtcbiAgaWYgKHRocmVhZFBvb2wgPT0gbnVsbCkge1xuICAgIHRocmVhZFBvb2wgPSBuZXcgUG9vbCgpO1xuICB9XG4gIGNvbnN0IGh0bWwgPSBhd2FpdCB0aHJlYWRQb29sLnN1Ym1pdDxzdHJpbmc+KHtcbiAgICBmaWxlOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnbWFya2Rvd24tbG9hZGVyLXdvcmtlci5qcycpLCBleHBvcnRGbjogJ3BhcnNlVG9IdG1sJywgYXJnczogW3NvdXJjZV1cbiAgfSk7XG4gIGNvbnN0IHRvYzogVE9DW10gPSBbXTtcbiAgY29uc3QgJCA9IGNoZWVyaW8ubG9hZChodG1sKTtcbiAgbG9nLmRlYnVnKGh0bWwpO1xuICBjb25zdCBkb25lOiAocnguT2JzZXJ2YWJsZTxzdHJpbmc+fFByb21pc2U8c3RyaW5nPilbXSA9IFtdO1xuXG4gIGlmIChyZXNvbHZlSW1hZ2UpIHtcbiAgICBjb25zdCBpbWdzID0gJCgnaW1nJyk7XG4gICAgaW1ncy5lYWNoKChpZHgsIGltZykgPT4ge1xuICAgICAgY29uc3QgaW1nUSA9ICQoaW1nKTtcbiAgICAgIGNvbnN0IGltZ1NyYyA9IGltZ1EuYXR0cignc3JjJyk7XG4gICAgICBsb2cuaW5mbygnZm91bmQgaW1nIHNyYz0nICsgaW1nUS5hdHRyKCdzcmMnKSk7XG4gICAgICBpZiAoaW1nU3JjKSB7XG4gICAgICAgIGRvbmUucHVzaChyeC5mcm9tKHJlc29sdmVJbWFnZShpbWdTcmMpKVxuICAgICAgICAgIC5waXBlKFxuICAgICAgICAgICAgb3AudGFwKHJlc29sdmVkID0+IHtcbiAgICAgICAgICAgICAgaW1nUS5hdHRyKCdzcmMnLCByZXNvbHZlZCk7XG4gICAgICAgICAgICAgIGxvZy5pbmZvKGByZXNvbHZlICR7aW1nU3JjfSB0byAke3V0aWwuaW5zcGVjdChyZXNvbHZlZCl9YCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICkpO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG4gIGNvbnN0IGhlYWRpbmdzID0gJCgnaDEsIGgyLCBoMywgaDUsIGg1LCBoNicpO1xuICBoZWFkaW5ncy5lYWNoKChpZHgsIGhlYWRpbmcpID0+IHtcbiAgICAgIGNvbnN0IGhlYWRpbmdRID0gJChoZWFkaW5nKTtcbiAgICAgIGlmIChoZWFkaW5nUSkge1xuICAgICAgICAgIGNvbnN0IGhlYWRpbmdUZXh0ID0gaGVhZGluZ1EudGV4dCgpO1xuICAgICAgICAgIGNvbnN0IGlkID0gQnVmZmVyLmZyb20oaWR4ICsgaGVhZGluZ1RleHQpLnRvU3RyaW5nKCdiYXNlNjQnKTtcbiAgICAgICAgICAvLyBsb2cuaW5mbyhgc2V0IGhlYWRpbmcgPCR7aGVhZGluZy5uYW1lfT4gaWQ9JHtpZH1gKTtcbiAgICAgICAgICBoZWFkaW5nUS5hdHRyKCdpZCcsIGlkKTtcbiAgICAgICAgICB0b2MucHVzaCh7IHRhZzogaGVhZGluZy50YWdOYW1lLCB0ZXh0OiBoZWFkaW5nVGV4dCwgaWQgfSk7XG4gICAgICB9XG4gIH0pO1xuICAvLyBjb25zb2xlLmxvZygndG9jOiAnLCB0b2MpO1xuICBhd2FpdCByeC5tZXJnZSguLi5kb25lKS5waXBlKFxuICAgIG9wLmNhdGNoRXJyb3IoZXJyID0+IHtcbiAgICAgIGxvZy5lcnJvcihlcnIpO1xuICAgICAgLy8gY2IoZXJyLCBKU09OLnN0cmluZ2lmeSh7IHRvYywgY29udGVudDogc291cmNlIH0pLCBzb3VyY2VNYXApO1xuICAgICAgcmV0dXJuIHJ4Lm9mKEpTT04uc3RyaW5naWZ5KHsgdG9jLCBjb250ZW50OiBzb3VyY2UgfSkpO1xuICAgIH0pLFxuICAgIG9wLmZpbmFsaXplKCgpID0+IHtcbiAgICAgIC8vIGNiKG51bGwsIEpTT04uc3RyaW5naWZ5KHsgdG9jLCBjb250ZW50OiAkLmh0bWwoKSB9KSwgc291cmNlTWFwKTtcbiAgICB9KVxuICApLnRvUHJvbWlzZSgpO1xuICByZXR1cm4ge3RvYywgY29udGVudDogJC5odG1sKCl9O1xufVxuIl19