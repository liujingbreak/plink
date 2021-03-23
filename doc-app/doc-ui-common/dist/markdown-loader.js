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
const cheerio_1 = __importDefault(require("cheerio"));
const plink_1 = require("@wfh/plink");
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const vm_1 = __importDefault(require("vm"));
const util_1 = __importDefault(require("util"));
const path_1 = __importDefault(require("path"));
const ts_compiler_1 = require("@wfh/plink/wfh/dist/ts-compiler");
const thread_promise_pool_1 = require("@wfh/thread-promise-pool");
const log = plink_1.logger.getLogger('@wfh/doc-ui-common.markdown-loader');
let threadPool;
const loader = function (source, sourceMap) {
    if (threadPool == null) {
        threadPool = new thread_promise_pool_1.Pool();
    }
    const cb = this.async();
    const toc = []
    if (cb) {
        rx.from(threadPool.submit({
            file: path_1.default.resolve(__dirname, 'markdown-loader-worker.js'), exportFn: 'parseToHtml', args: [source]
        })).pipe(op.mergeMap(html => {
            const $ = cheerio_1.default.load(html);
            log.debug(html);
            const done = [];
            const imgs = $('img');
            imgs.each((idx, img) => {
                const imgQ = $(img);
                const imgSrc = imgQ.attr('src');
                log.info('found img src=' + imgQ.attr('src'));
                if (imgSrc) {
                    done.push(loadModuleInWebpack(imgSrc.startsWith('.') ? imgSrc : './' + imgSrc, this)
                        .pipe(op.tap(resolved => {
                        imgQ.attr('src', resolved);
                        log.info(`resolve ${imgSrc} to ${util_1.default.inspect(resolved)}`);
                    })));
                }
            });
            const headings = $('h1, h2, h3, h5, h5, h6')
            headings.each((idx, heading) => {
                const headingQ = $(heading);
                if (headingQ) {
                    const headingText = headingQ.text();
                    const id = encodeURI(headingText)
                    log.info(`set heading <${heading.name}> id=${id}`);
                    headingQ.attr('id', id)
                    toc.push({ tag: heading.name, text: headingText, id })
                }
            });
            console.log('toc: ', toc)
            return rx.merge(...done).pipe(op.catchError(err => {
                log.error(err);
                cb(err, JSON.stringify({ toc, content: source }), sourceMap);
                return rx.of();
            }), op.finalize(() => {
                cb(null, JSON.stringify({ toc, content: $.html() }), sourceMap);
            }));
        })).subscribe();
    }
};
exports.default = loader;
const co = ts_compiler_1.jsonToCompilerOptions({
    baseUrl: '.',
    outDir: 'dist',
    declaration: false,
    module: 'commonjs',
    target: 'es2015',
    noImplicitAny: true,
    suppressImplicitAnyIndexErrors: true,
    allowSyntheticDefaultImports: true,
    esModuleInterop: true,
    inlineSourceMap: false,
    inlineSources: false,
    moduleResolution: 'node',
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    noUnusedLocals: true,
    preserveSymlinks: false,
    downlevelIteration: false,
    strictNullChecks: true,
    resolveJsonModule: true,
    diagnostics: false,
    newLine: 'lf',
    lib: ['es2016',
        'es2015',
        'dom'
    ],
    pretty: true,
    rootDir: 'ts'
});
function loadModuleInWebpack(request, ctx) {
    return new rx.Observable(subscriber => {
        // Unlike extract-loader, we does not support embedded require statement in source code 
        ctx.loadModule(request, (err, source) => {
            var _a;
            const __webpack_public_path__ = (_a = ctx._compiler.options.output) === null || _a === void 0 ? void 0 : _a.publicPath;
            if (err)
                return subscriber.error(err);
            const _exports = {};
            const sandbox = {
                __webpack_public_path__,
                module: {
                    exports: _exports
                },
                exports: _exports
            };
            source = ts_compiler_1.transpileSingleTs(source, co);
            vm_1.default.runInNewContext(source, vm_1.default.createContext(sandbox));
            subscriber.next(sandbox.exports.default);
            subscriber.complete();
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd24tbG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWFya2Rvd24tbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHNEQUE4QjtBQUM5QixzQ0FBa0M7QUFDbEMseUNBQTJCO0FBQzNCLG1EQUFxQztBQUNyQyw0Q0FBb0I7QUFFcEIsZ0RBQXdCO0FBQ3hCLGdEQUF3QjtBQUN4QixpRUFBMkY7QUFDM0Ysa0VBQThDO0FBRTlDLE1BQU0sR0FBRyxHQUFHLGNBQU0sQ0FBQyxTQUFTLENBQUMsb0NBQW9DLENBQUMsQ0FBQztBQUduRSxJQUFJLFVBQWdCLENBQUM7QUFFckIsTUFBTSxNQUFNLEdBQWtCLFVBQVMsTUFBTSxFQUFFLFNBQVM7SUFDdEQsSUFBSSxVQUFVLElBQUksSUFBSSxFQUFFO1FBQ3RCLFVBQVUsR0FBRyxJQUFJLDBCQUFJLEVBQUUsQ0FBQztLQUN6QjtJQUNELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN4QixJQUFJLEVBQUUsRUFBRTtRQUNOLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBUztZQUNoQyxJQUFJLEVBQUUsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsMkJBQTJCLENBQUMsRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQztTQUNwRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQ04sRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNqQixNQUFNLENBQUMsR0FBRyxpQkFBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM3QixHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2hCLE1BQU0sSUFBSSxHQUE4QyxFQUFFLENBQUM7WUFFM0QsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEtBQUss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QUN4RixHQUFHLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQVUsRUFBRSxNQUFNLEVBQUUsRUFBRTs7WUFDN0MsTUFBTSx1QkFBdUIsU0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxNQUFNLDBDQUFFLFVBQVUsQ0FBQztZQUN6RSxJQUFJLEdBQUc7Z0JBQ0wsT0FBTyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQy9CLE1BQU0sUUFBUSxHQUF1QixFQUFFLENBQUM7WUFDeEMsTUFBTSxPQUFPLEdBQUc7Z0JBQ2QsdUJBQXVCO2dCQUN2QixNQUFNLEVBQUU7b0JBQ04sT0FBTyxFQUFFLFFBQVE7aUJBQ2xCO2dCQUNELE9BQU8sRUFBRSxRQUFRO2FBQ2xCLENBQUM7WUFDRixNQUFNLEdBQUcsK0JBQWlCLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZDLFlBQUUsQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFlBQUUsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUN0RCxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDekMsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3hCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtsb2FkZXJ9IGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IGNoZWVyaW8gZnJvbSAnY2hlZXJpbyc7XG5pbXBvcnQge2xvZ2dlcn0gZnJvbSAnQHdmaC9wbGluayc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB2bSBmcm9tICd2bSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHV0aWwgZnJvbSAndXRpbCc7XG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGpzb25Ub0NvbXBpbGVyT3B0aW9ucywgdHJhbnNwaWxlU2luZ2xlVHMgfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3RzLWNvbXBpbGVyJztcbmltcG9ydCB7UG9vbH0gZnJvbSAnQHdmaC90aHJlYWQtcHJvbWlzZS1wb29sJztcblxuY29uc3QgbG9nID0gbG9nZ2VyLmdldExvZ2dlcignQHdmaC9kb2MtdWktY29tbW9uLm1hcmtkb3duLWxvYWRlcicpO1xuXG5cbmxldCB0aHJlYWRQb29sOiBQb29sO1xuXG5jb25zdCBsb2FkZXI6IGxvYWRlci5Mb2FkZXIgPSBmdW5jdGlvbihzb3VyY2UsIHNvdXJjZU1hcCkge1xuICBpZiAodGhyZWFkUG9vbCA9PSBudWxsKSB7XG4gICAgdGhyZWFkUG9vbCA9IG5ldyBQb29sKCk7XG4gIH1cbiAgY29uc3QgY2IgPSB0aGlzLmFzeW5jKCk7XG4gIGlmIChjYikge1xuICAgIHJ4LmZyb20odGhyZWFkUG9vbC5zdWJtaXQ8c3RyaW5nPih7XG4gICAgICBmaWxlOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnbWFya2Rvd24tbG9hZGVyLXdvcmtlci5qcycpLCBleHBvcnRGbjogJ3BhcnNlVG9IdG1sJywgYXJnczogW3NvdXJjZV1cbiAgICB9KSkucGlwZShcbiAgICAgIG9wLm1lcmdlTWFwKGh0bWwgPT4ge1xuICAgICAgICBjb25zdCAkID0gY2hlZXJpby5sb2FkKGh0bWwpO1xuICAgICAgICBsb2cuZGVidWcoaHRtbCk7XG4gICAgICAgIGNvbnN0IGRvbmU6IChyeC5PYnNlcnZhYmxlPHN0cmluZz58UHJvbWlzZTxzdHJpbmc+KVtdID0gW107XG5cbiAgICAgICAgY29uc3QgaW1ncyA9ICQoJ2ltZycpO1xuICAgICAgICBpbWdzLmVhY2goKGlkeCwgaW1nKSA9PiB7XG4gICAgICAgICAgY29uc3QgaW1nUSA9ICQoaW1nKTtcbiAgICAgICAgICBjb25zdCBpbWdTcmMgPSBpbWdRLmF0dHIoJ3NyYycpO1xuICAgICAgICAgIGxvZy5pbmZvKCdmb3VuZCBpbWcgc3JjPScgKyBpbWdRLmF0dHIoJ3NyYycpKTtcbiAgICAgICAgICBpZiAoaW1nU3JjKSB7XG4gICAgICAgICAgICBkb25lLnB1c2gobG9hZE1vZHVsZUluV2VicGFjayhpbWdTcmMuc3RhcnRzV2l0aCgnLicpID8gaW1nU3JjIDogJy4vJyArIGltZ1NyYywgdGhpcylcbiAgICAgICAgICAgICAgLnBpcGUoXG4gICAgICAgICAgICAgICAgb3AudGFwKHJlc29sdmVkID0+IHtcbiAgICAgICAgICAgICAgICAgIGltZ1EuYXR0cignc3JjJywgcmVzb2x2ZWQpO1xuICAgICAgICAgICAgICAgICAgbG9nLmluZm8oYHJlc29sdmUgJHtpbWdTcmN9IHRvICR7dXRpbC5pbnNwZWN0KHJlc29sdmVkKX1gKTtcbiAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICApKTtcbiAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gcngubWVyZ2UoLi4uZG9uZSkucGlwZShcbiAgICAgICAgICBvcC5jYXRjaEVycm9yKGVyciA9PiB7XG4gICAgICAgICAgICBsb2cuZXJyb3IoZXJyKTtcbiAgICAgICAgICAgIGNiKGVyciwgc291cmNlLCBzb3VyY2VNYXApO1xuICAgICAgICAgICAgcmV0dXJuIHJ4Lm9mKCk7XG4gICAgICAgICAgfSksXG4gICAgICAgICAgb3AuZmluYWxpemUoKCkgPT4ge1xuICAgICAgICAgICAgY2IobnVsbCwgJC5odG1sKCksIHNvdXJjZU1hcCk7XG4gICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICAgIH0pXG4gICAgKS5zdWJzY3JpYmUoKTtcbiAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgbG9hZGVyO1xuXG5jb25zdCBjbyA9IGpzb25Ub0NvbXBpbGVyT3B0aW9ucyh7XG4gICAgYmFzZVVybDogJy4nLFxuICAgIG91dERpcjogJ2Rpc3QnLFxuICAgIGRlY2xhcmF0aW9uOiBmYWxzZSxcbiAgICBtb2R1bGU6J2NvbW1vbmpzJyxcbiAgICB0YXJnZXQ6J2VzMjAxNScsXG4gICAgbm9JbXBsaWNpdEFueTogdHJ1ZSxcbiAgICBzdXBwcmVzc0ltcGxpY2l0QW55SW5kZXhFcnJvcnM6IHRydWUsXG4gICAgYWxsb3dTeW50aGV0aWNEZWZhdWx0SW1wb3J0czogdHJ1ZSxcbiAgICBlc01vZHVsZUludGVyb3A6IHRydWUsXG4gICAgaW5saW5lU291cmNlTWFwOiBmYWxzZSxcbiAgICBpbmxpbmVTb3VyY2VzOiBmYWxzZSxcbiAgICBtb2R1bGVSZXNvbHV0aW9uOiAnbm9kZScsXG4gICAgZXhwZXJpbWVudGFsRGVjb3JhdG9yczogdHJ1ZSxcbiAgICBlbWl0RGVjb3JhdG9yTWV0YWRhdGE6IHRydWUsXG4gICAgbm9VbnVzZWRMb2NhbHM6IHRydWUsXG4gICAgcHJlc2VydmVTeW1saW5rczogZmFsc2UsXG4gICAgZG93bmxldmVsSXRlcmF0aW9uOiBmYWxzZSxcbiAgICBzdHJpY3ROdWxsQ2hlY2tzOiB0cnVlLFxuICAgIHJlc29sdmVKc29uTW9kdWxlOiB0cnVlLFxuICAgIGRpYWdub3N0aWNzOiBmYWxzZSxcbiAgICBuZXdMaW5lOiAnbGYnLFxuICAgIGxpYjogWydlczIwMTYnLFxuICAgICAgJ2VzMjAxNScsXG4gICAgICAnZG9tJ1xuICAgIF0sXG4gICAgcHJldHR5OiB0cnVlLFxuICAgIHJvb3REaXI6ICd0cydcbiAgfVxuKTtcblxuZnVuY3Rpb24gbG9hZE1vZHVsZUluV2VicGFjayhyZXF1ZXN0OiBzdHJpbmcsIGN0eDogbG9hZGVyLkxvYWRlckNvbnRleHQpIHtcbiAgcmV0dXJuIG5ldyByeC5PYnNlcnZhYmxlPHN0cmluZz4oc3Vic2NyaWJlciA9PiB7XG4gICAgLy8gVW5saWtlIGV4dHJhY3QtbG9hZGVyLCB3ZSBkb2VzIG5vdCBzdXBwb3J0IGVtYmVkZGVkIHJlcXVpcmUgc3RhdGVtZW50IGluIHNvdXJjZSBjb2RlIFxuICAgIGN0eC5sb2FkTW9kdWxlKHJlcXVlc3QsIChlcnI6IEVycm9yLCBzb3VyY2UpID0+IHtcbiAgICAgIGNvbnN0IF9fd2VicGFja19wdWJsaWNfcGF0aF9fID0gY3R4Ll9jb21waWxlci5vcHRpb25zLm91dHB1dD8ucHVibGljUGF0aDtcbiAgICAgIGlmIChlcnIpXG4gICAgICAgIHJldHVybiBzdWJzY3JpYmVyLmVycm9yKGVycik7XG4gICAgICBjb25zdCBfZXhwb3J0czoge2RlZmF1bHQ/OiBzdHJpbmd9ID0ge307XG4gICAgICBjb25zdCBzYW5kYm94ID0ge1xuICAgICAgICBfX3dlYnBhY2tfcHVibGljX3BhdGhfXyxcbiAgICAgICAgbW9kdWxlOiB7XG4gICAgICAgICAgZXhwb3J0czogX2V4cG9ydHNcbiAgICAgICAgfSxcbiAgICAgICAgZXhwb3J0czogX2V4cG9ydHNcbiAgICAgIH07XG4gICAgICBzb3VyY2UgPSB0cmFuc3BpbGVTaW5nbGVUcyhzb3VyY2UsIGNvKTtcbiAgICAgIHZtLnJ1bkluTmV3Q29udGV4dChzb3VyY2UsIHZtLmNyZWF0ZUNvbnRleHQoc2FuZGJveCkpO1xuICAgICAgc3Vic2NyaWJlci5uZXh0KHNhbmRib3guZXhwb3J0cy5kZWZhdWx0KTtcbiAgICAgIHN1YnNjcmliZXIuY29tcGxldGUoKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbiJdfQ==