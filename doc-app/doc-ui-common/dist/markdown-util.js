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
    if (threadPool == null) {
        threadPool = new thread_promise_pool_1.Pool();
    }
    return rx.from(threadPool.submit({
        file: path_1.default.resolve(__dirname, 'markdown-loader-worker.js'), exportFn: 'parseToHtml', args: [source]
    })).pipe(op.mergeMap(html => {
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
        const headings = $('h1, h2, h3, h4, h5, h6');
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
        return rx.merge(...done).pipe(op.count(), op.mapTo({ toc, content: source }), op.catchError(err => {
            log.error(err);
            // cb(err, JSON.stringify({ toc, content: source }), sourceMap);
            return rx.of({ toc, content: source });
        }));
    }));
}
exports.markdownToHtml = markdownToHtml;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd24tdXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm1hcmtkb3duLXV0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMsa0VBQThDO0FBRTlDLGdEQUF3QjtBQUN4QixzREFBOEI7QUFDOUIsc0NBQW9DO0FBQ3BDLGdEQUF3QjtBQUd4QixNQUFNLEdBQUcsR0FBRyxnQkFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBRWpDLElBQUksVUFBZ0IsQ0FBQztBQUVyQjs7OztHQUlHO0FBQ0gsU0FBZ0IsY0FBYyxDQUFDLE1BQWMsRUFBRSxZQUEwRTtJQUV2SCxJQUFJLFVBQVUsSUFBSSxJQUFJLEVBQUU7UUFDdEIsVUFBVSxHQUFHLElBQUksMEJBQUksRUFBRSxDQUFDO0tBQ3pCO0lBRUQsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQVM7UUFDdkMsSUFBSSxFQUFFLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLDJCQUEyQixDQUFDLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUM7S0FDcEcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUNOLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7UUFDakIsTUFBTSxHQUFHLEdBQVUsRUFBRSxDQUFDO1FBQ3RCLE1BQU0sQ0FBQyxHQUFHLGlCQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdCLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDaEIsTUFBTSxJQUFJLEdBQWdELEVBQUUsQ0FBQztRQUM3RCxJQUFJLFlBQVksRUFBRTtZQUNoQixNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDdEIsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtnQkFDckIsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO2dCQUNwQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO2dCQUNoQyxHQUFHLENBQUMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFDOUMsSUFBSSxNQUFNLEVBQUU7b0JBQ1YsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQzt5QkFDcEMsSUFBSSxDQUNILEVBQUUsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUU7d0JBQ2hCLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFDO3dCQUMzQixHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsTUFBTSxPQUFPLGNBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUM3RCxDQUFDLENBQUMsQ0FDSCxDQUFDLENBQUM7aUJBQ047WUFDSCxDQUFDLENBQUMsQ0FBQztTQUNKO1FBQ0QsTUFBTSxRQUFRLEdBQUcsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLENBQUM7UUFDN0MsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBRTtZQUMzQixNQUFNLFFBQVEsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDNUIsSUFBSSxRQUFRLEVBQUU7Z0JBQ1YsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUNwQyxNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsR0FBRyxXQUFXLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7Z0JBQzdELHNEQUFzRDtnQkFDdEQsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQ3hCLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsT0FBTyxDQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7YUFDN0Q7UUFDTCxDQUFDLENBQUMsQ0FBQztRQUNILE9BQU8sRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLElBQUksQ0FDM0IsRUFBRSxDQUFDLEtBQUssRUFBRSxFQUNWLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLEVBQ2xDLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDbEIsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNmLGdFQUFnRTtZQUNoRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLENBQUMsRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFDekMsQ0FBQyxDQUFDLENBQ0gsQ0FBQztJQUNKLENBQUMsQ0FBQyxDQUNILENBQUM7QUFDSixDQUFDO0FBckRELHdDQXFEQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtQb29sfSBmcm9tICdAd2ZoL3RocmVhZC1wcm9taXNlLXBvb2wnO1xuaW1wb3J0IHtUT0N9IGZyb20gJy4uL2lzb20vbWQtdHlwZXMnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgY2hlZXJpbyBmcm9tICdjaGVlcmlvJztcbmltcG9ydCB7bG9nNEZpbGV9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IHV0aWwgZnJvbSAndXRpbCc7XG5cblxuY29uc3QgbG9nID0gbG9nNEZpbGUoX19maWxlbmFtZSk7XG5cbmxldCB0aHJlYWRQb29sOiBQb29sO1xuXG4vKipcbiAqIFVzZSBUaHJlYWQgcG9vbCB0byBwYXJzZSBNYXJrZG93biBmaWxlIHNpbXVsdGFuZW91c2x5XG4gKiBAcGFyYW0gc291cmNlIFxuICogQHBhcmFtIHJlc29sdmVJbWFnZSBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1hcmtkb3duVG9IdG1sKHNvdXJjZTogc3RyaW5nLCByZXNvbHZlSW1hZ2U/OiAoaW1nU3JjOiBzdHJpbmcpID0+IFByb21pc2U8c3RyaW5nPiB8IHJ4Lk9ic2VydmFibGU8c3RyaW5nPik6XG4gIHJ4Lk9ic2VydmFibGU8e3RvYzogVE9DW107IGNvbnRlbnQ6IHN0cmluZ30+IHtcbiAgaWYgKHRocmVhZFBvb2wgPT0gbnVsbCkge1xuICAgIHRocmVhZFBvb2wgPSBuZXcgUG9vbCgpO1xuICB9XG5cbiAgcmV0dXJuIHJ4LmZyb20odGhyZWFkUG9vbC5zdWJtaXQ8c3RyaW5nPih7XG4gICAgZmlsZTogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ21hcmtkb3duLWxvYWRlci13b3JrZXIuanMnKSwgZXhwb3J0Rm46ICdwYXJzZVRvSHRtbCcsIGFyZ3M6IFtzb3VyY2VdXG4gIH0pKS5waXBlKFxuICAgIG9wLm1lcmdlTWFwKGh0bWwgPT4ge1xuICAgICAgY29uc3QgdG9jOiBUT0NbXSA9IFtdO1xuICAgICAgY29uc3QgJCA9IGNoZWVyaW8ubG9hZChodG1sKTtcbiAgICAgIGxvZy5kZWJ1ZyhodG1sKTtcbiAgICAgIGNvbnN0IGRvbmU6IChyeC5PYnNlcnZhYmxlPHN0cmluZz4gfCBQcm9taXNlPHN0cmluZz4pW10gPSBbXTtcbiAgICAgIGlmIChyZXNvbHZlSW1hZ2UpIHtcbiAgICAgICAgY29uc3QgaW1ncyA9ICQoJ2ltZycpO1xuICAgICAgICBpbWdzLmVhY2goKGlkeCwgaW1nKSA9PiB7XG4gICAgICAgICAgY29uc3QgaW1nUSA9ICQoaW1nKTtcbiAgICAgICAgICBjb25zdCBpbWdTcmMgPSBpbWdRLmF0dHIoJ3NyYycpO1xuICAgICAgICAgIGxvZy5pbmZvKCdmb3VuZCBpbWcgc3JjPScgKyBpbWdRLmF0dHIoJ3NyYycpKTtcbiAgICAgICAgICBpZiAoaW1nU3JjKSB7XG4gICAgICAgICAgICBkb25lLnB1c2gocnguZnJvbShyZXNvbHZlSW1hZ2UoaW1nU3JjKSlcbiAgICAgICAgICAgICAgLnBpcGUoXG4gICAgICAgICAgICAgICAgb3AudGFwKHJlc29sdmVkID0+IHtcbiAgICAgICAgICAgICAgICAgIGltZ1EuYXR0cignc3JjJywgcmVzb2x2ZWQpO1xuICAgICAgICAgICAgICAgICAgbG9nLmluZm8oYHJlc29sdmUgJHtpbWdTcmN9IHRvICR7dXRpbC5pbnNwZWN0KHJlc29sdmVkKX1gKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICApKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgICAgY29uc3QgaGVhZGluZ3MgPSAkKCdoMSwgaDIsIGgzLCBoNCwgaDUsIGg2Jyk7XG4gICAgICBoZWFkaW5ncy5lYWNoKChpZHgsIGhlYWRpbmcpID0+IHtcbiAgICAgICAgICBjb25zdCBoZWFkaW5nUSA9ICQoaGVhZGluZyk7XG4gICAgICAgICAgaWYgKGhlYWRpbmdRKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGhlYWRpbmdUZXh0ID0gaGVhZGluZ1EudGV4dCgpO1xuICAgICAgICAgICAgICBjb25zdCBpZCA9IEJ1ZmZlci5mcm9tKGlkeCArIGhlYWRpbmdUZXh0KS50b1N0cmluZygnYmFzZTY0Jyk7XG4gICAgICAgICAgICAgIC8vIGxvZy5pbmZvKGBzZXQgaGVhZGluZyA8JHtoZWFkaW5nLm5hbWV9PiBpZD0ke2lkfWApO1xuICAgICAgICAgICAgICBoZWFkaW5nUS5hdHRyKCdpZCcsIGlkKTtcbiAgICAgICAgICAgICAgdG9jLnB1c2goeyB0YWc6IGhlYWRpbmcudGFnTmFtZSwgdGV4dDogaGVhZGluZ1RleHQsIGlkIH0pO1xuICAgICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgcmV0dXJuIHJ4Lm1lcmdlKC4uLmRvbmUpLnBpcGUoXG4gICAgICAgIG9wLmNvdW50KCksXG4gICAgICAgIG9wLm1hcFRvKHsgdG9jLCBjb250ZW50OiBzb3VyY2UgfSksXG4gICAgICAgIG9wLmNhdGNoRXJyb3IoZXJyID0+IHtcbiAgICAgICAgICBsb2cuZXJyb3IoZXJyKTtcbiAgICAgICAgICAvLyBjYihlcnIsIEpTT04uc3RyaW5naWZ5KHsgdG9jLCBjb250ZW50OiBzb3VyY2UgfSksIHNvdXJjZU1hcCk7XG4gICAgICAgICAgcmV0dXJuIHJ4Lm9mKHsgdG9jLCBjb250ZW50OiBzb3VyY2UgfSk7XG4gICAgICAgIH0pXG4gICAgICApO1xuICAgIH0pXG4gICk7XG59XG5cbiJdfQ==