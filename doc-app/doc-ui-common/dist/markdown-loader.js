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
    const toc = [];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd24tbG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWFya2Rvd24tbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHNEQUE4QjtBQUM5QixzQ0FBa0M7QUFDbEMseUNBQTJCO0FBQzNCLG1EQUFxQztBQUNyQyw0Q0FBb0I7QUFFcEIsZ0RBQXdCO0FBQ3hCLGdEQUF3QjtBQUN4QixpRUFBMkY7QUFDM0Ysa0VBQThDO0FBRzlDLE1BQU0sR0FBRyxHQUFHLGNBQU0sQ0FBQyxTQUFTLENBQUMsb0NBQW9DLENBQUMsQ0FBQztBQUduRSxJQUFJLFVBQWdCLENBQUM7QUFFckIsTUFBTSxNQUFNLEdBQWtCLFVBQVMsTUFBTSxFQUFFLFNBQVM7SUFDdEQsSUFBSSxVQUFVLElBQUksSUFBSSxFQUFFO1FBQ3RCLFVBQVUsR0FBRyxJQUFJLDBCQUFJLEVBQUUsQ0FBQztLQUN6QjtJQUNELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN4QixNQUFNLEdBQUcsR0FBVSxFQUFFLENBQUM7SUFDdEIsSUFBSSxFQUFFLEVBQUU7UUFDTixFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQVM7WUFDaEMsSUFBSSxFQUFFLGNBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLDJCQUEyQixDQUFDLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUM7U0FDcEcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUNOLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDakIsTUFBTSxDQUFDLEdBQUcsaUJBQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDN0IsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNoQixNQUFNLElBQUksR0FBOEMsRUFBRSxDQUFDO1lBRTNE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QUFNLE9BQU8sR0FBRztnQkFDZCx1QkFBdUI7Z0JBQ3ZCLE1BQU0sRUFBRTtvQkFDTixPQUFPLEVBQUUsUUFBUTtpQkFDbEI7Z0JBQ0QsT0FBTyxFQUFFLFFBQVE7YUFDbEIsQ0FBQztZQUNGLE1BQU0sR0FBRywrQkFBaUIsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDdkMsWUFBRSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsWUFBRSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ3RELFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN6QyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDeEIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge2xvYWRlcn0gZnJvbSAnd2VicGFjayc7XG5pbXBvcnQgY2hlZXJpbyBmcm9tICdjaGVlcmlvJztcbmltcG9ydCB7bG9nZ2VyfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHZtIGZyb20gJ3ZtJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgdXRpbCBmcm9tICd1dGlsJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsganNvblRvQ29tcGlsZXJPcHRpb25zLCB0cmFuc3BpbGVTaW5nbGVUcyB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdHMtY29tcGlsZXInO1xuaW1wb3J0IHtQb29sfSBmcm9tICdAd2ZoL3RocmVhZC1wcm9taXNlLXBvb2wnO1xuaW1wb3J0IHtUT0N9IGZyb20gJy4uL2lzb20vbWQtdHlwZXMnO1xuXG5jb25zdCBsb2cgPSBsb2dnZXIuZ2V0TG9nZ2VyKCdAd2ZoL2RvYy11aS1jb21tb24ubWFya2Rvd24tbG9hZGVyJyk7XG5cblxubGV0IHRocmVhZFBvb2w6IFBvb2w7XG5cbmNvbnN0IGxvYWRlcjogbG9hZGVyLkxvYWRlciA9IGZ1bmN0aW9uKHNvdXJjZSwgc291cmNlTWFwKSB7XG4gIGlmICh0aHJlYWRQb29sID09IG51bGwpIHtcbiAgICB0aHJlYWRQb29sID0gbmV3IFBvb2woKTtcbiAgfVxuICBjb25zdCBjYiA9IHRoaXMuYXN5bmMoKTtcbiAgY29uc3QgdG9jOiBUT0NbXSA9IFtdO1xuICBpZiAoY2IpIHtcbiAgICByeC5mcm9tKHRocmVhZFBvb2wuc3VibWl0PHN0cmluZz4oe1xuICAgICAgZmlsZTogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ21hcmtkb3duLWxvYWRlci13b3JrZXIuanMnKSwgZXhwb3J0Rm46ICdwYXJzZVRvSHRtbCcsIGFyZ3M6IFtzb3VyY2VdXG4gICAgfSkpLnBpcGUoXG4gICAgICBvcC5tZXJnZU1hcChodG1sID0+IHtcbiAgICAgICAgY29uc3QgJCA9IGNoZWVyaW8ubG9hZChodG1sKTtcbiAgICAgICAgbG9nLmRlYnVnKGh0bWwpO1xuICAgICAgICBjb25zdCBkb25lOiAocnguT2JzZXJ2YWJsZTxzdHJpbmc+fFByb21pc2U8c3RyaW5nPilbXSA9IFtdO1xuXG4gICAgICAgIGNvbnN0IGltZ3MgPSAkKCdpbWcnKTtcbiAgICAgICAgaW1ncy5lYWNoKChpZHgsIGltZykgPT4ge1xuICAgICAgICAgIGNvbnN0IGltZ1EgPSAkKGltZyk7XG4gICAgICAgICAgY29uc3QgaW1nU3JjID0gaW1nUS5hdHRyKCdzcmMnKTtcbiAgICAgICAgICBsb2cuaW5mbygnZm91bmQgaW1nIHNyYz0nICsgaW1nUS5hdHRyKCdzcmMnKSk7XG4gICAgICAgICAgaWYgKGltZ1NyYykge1xuICAgICAgICAgICAgZG9uZS5wdXNoKGxvYWRNb2R1bGVJbldlYnBhY2soaW1nU3JjLnN0YXJ0c1dpdGgoJy4nKSA/IGltZ1NyYyA6ICcuLycgKyBpbWdTcmMsIHRoaXMpXG4gICAgICAgICAgICAgIC5waXBlKFxuICAgICAgICAgICAgICAgIG9wLnRhcChyZXNvbHZlZCA9PiB7XG4gICAgICAgICAgICAgICAgICBpbWdRLmF0dHIoJ3NyYycsIHJlc29sdmVkKTtcbiAgICAgICAgICAgICAgICAgIGxvZy5pbmZvKGByZXNvbHZlICR7aW1nU3JjfSB0byAke3V0aWwuaW5zcGVjdChyZXNvbHZlZCl9YCk7XG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgKSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgICAgY29uc3QgaGVhZGluZ3MgPSAkKCdoMSwgaDIsIGgzLCBoNSwgaDUsIGg2Jyk7XG4gICAgICAgIGhlYWRpbmdzLmVhY2goKGlkeCwgaGVhZGluZykgPT4ge1xuICAgICAgICAgICAgY29uc3QgaGVhZGluZ1EgPSAkKGhlYWRpbmcpO1xuICAgICAgICAgICAgaWYgKGhlYWRpbmdRKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgaGVhZGluZ1RleHQgPSBoZWFkaW5nUS50ZXh0KCk7XG4gICAgICAgICAgICAgICAgY29uc3QgaWQgPSBCdWZmZXIuZnJvbShpZHggKyBoZWFkaW5nVGV4dCkudG9TdHJpbmcoJ2Jhc2U2NCcpO1xuICAgICAgICAgICAgICAgIC8vIGxvZy5pbmZvKGBzZXQgaGVhZGluZyA8JHtoZWFkaW5nLm5hbWV9PiBpZD0ke2lkfWApO1xuICAgICAgICAgICAgICAgIGhlYWRpbmdRLmF0dHIoJ2lkJywgaWQpO1xuICAgICAgICAgICAgICAgIHRvYy5wdXNoKHsgdGFnOiBoZWFkaW5nLnRhZ05hbWUsIHRleHQ6IGhlYWRpbmdUZXh0LCBpZCB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIC8vIGNvbnNvbGUubG9nKCd0b2M6ICcsIHRvYyk7XG4gICAgICAgIHJldHVybiByeC5tZXJnZSguLi5kb25lKS5waXBlKFxuICAgICAgICAgIG9wLmNhdGNoRXJyb3IoZXJyID0+IHtcbiAgICAgICAgICAgIGxvZy5lcnJvcihlcnIpO1xuICAgICAgICAgICAgY2IoZXJyLCBKU09OLnN0cmluZ2lmeSh7IHRvYywgY29udGVudDogc291cmNlIH0pLCBzb3VyY2VNYXApO1xuICAgICAgICAgICAgcmV0dXJuIHJ4Lm9mKCk7XG4gICAgICAgICAgfSksXG4gICAgICAgICAgb3AuZmluYWxpemUoKCkgPT4ge1xuICAgICAgICAgICAgY2IobnVsbCwgSlNPTi5zdHJpbmdpZnkoeyB0b2MsIGNvbnRlbnQ6ICQuaHRtbCgpIH0pLCBzb3VyY2VNYXApO1xuICAgICAgICAgIH0pXG4gICAgICAgICk7XG4gICAgICB9KVxuICAgICkuc3Vic2NyaWJlKCk7XG4gIH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IGxvYWRlcjtcblxuY29uc3QgY28gPSBqc29uVG9Db21waWxlck9wdGlvbnMoe1xuICAgIGJhc2VVcmw6ICcuJyxcbiAgICBvdXREaXI6ICdkaXN0JyxcbiAgICBkZWNsYXJhdGlvbjogZmFsc2UsXG4gICAgbW9kdWxlOidjb21tb25qcycsXG4gICAgdGFyZ2V0OidlczIwMTUnLFxuICAgIG5vSW1wbGljaXRBbnk6IHRydWUsXG4gICAgc3VwcHJlc3NJbXBsaWNpdEFueUluZGV4RXJyb3JzOiB0cnVlLFxuICAgIGFsbG93U3ludGhldGljRGVmYXVsdEltcG9ydHM6IHRydWUsXG4gICAgZXNNb2R1bGVJbnRlcm9wOiB0cnVlLFxuICAgIGlubGluZVNvdXJjZU1hcDogZmFsc2UsXG4gICAgaW5saW5lU291cmNlczogZmFsc2UsXG4gICAgbW9kdWxlUmVzb2x1dGlvbjogJ25vZGUnLFxuICAgIGV4cGVyaW1lbnRhbERlY29yYXRvcnM6IHRydWUsXG4gICAgZW1pdERlY29yYXRvck1ldGFkYXRhOiB0cnVlLFxuICAgIG5vVW51c2VkTG9jYWxzOiB0cnVlLFxuICAgIHByZXNlcnZlU3ltbGlua3M6IGZhbHNlLFxuICAgIGRvd25sZXZlbEl0ZXJhdGlvbjogZmFsc2UsXG4gICAgc3RyaWN0TnVsbENoZWNrczogdHJ1ZSxcbiAgICByZXNvbHZlSnNvbk1vZHVsZTogdHJ1ZSxcbiAgICBkaWFnbm9zdGljczogZmFsc2UsXG4gICAgbmV3TGluZTogJ2xmJyxcbiAgICBsaWI6IFsnZXMyMDE2JyxcbiAgICAgICdlczIwMTUnLFxuICAgICAgJ2RvbSdcbiAgICBdLFxuICAgIHByZXR0eTogdHJ1ZSxcbiAgICByb290RGlyOiAndHMnXG4gIH1cbik7XG5cbmZ1bmN0aW9uIGxvYWRNb2R1bGVJbldlYnBhY2socmVxdWVzdDogc3RyaW5nLCBjdHg6IGxvYWRlci5Mb2FkZXJDb250ZXh0KSB7XG4gIHJldHVybiBuZXcgcnguT2JzZXJ2YWJsZTxzdHJpbmc+KHN1YnNjcmliZXIgPT4ge1xuICAgIC8vIFVubGlrZSBleHRyYWN0LWxvYWRlciwgd2UgZG9lcyBub3Qgc3VwcG9ydCBlbWJlZGRlZCByZXF1aXJlIHN0YXRlbWVudCBpbiBzb3VyY2UgY29kZSBcbiAgICBjdHgubG9hZE1vZHVsZShyZXF1ZXN0LCAoZXJyOiBFcnJvciwgc291cmNlKSA9PiB7XG4gICAgICBjb25zdCBfX3dlYnBhY2tfcHVibGljX3BhdGhfXyA9IGN0eC5fY29tcGlsZXIub3B0aW9ucy5vdXRwdXQ/LnB1YmxpY1BhdGg7XG4gICAgICBpZiAoZXJyKVxuICAgICAgICByZXR1cm4gc3Vic2NyaWJlci5lcnJvcihlcnIpO1xuICAgICAgY29uc3QgX2V4cG9ydHM6IHtkZWZhdWx0Pzogc3RyaW5nfSA9IHt9O1xuICAgICAgY29uc3Qgc2FuZGJveCA9IHtcbiAgICAgICAgX193ZWJwYWNrX3B1YmxpY19wYXRoX18sXG4gICAgICAgIG1vZHVsZToge1xuICAgICAgICAgIGV4cG9ydHM6IF9leHBvcnRzXG4gICAgICAgIH0sXG4gICAgICAgIGV4cG9ydHM6IF9leHBvcnRzXG4gICAgICB9O1xuICAgICAgc291cmNlID0gdHJhbnNwaWxlU2luZ2xlVHMoc291cmNlLCBjbyk7XG4gICAgICB2bS5ydW5Jbk5ld0NvbnRleHQoc291cmNlLCB2bS5jcmVhdGVDb250ZXh0KHNhbmRib3gpKTtcbiAgICAgIHN1YnNjcmliZXIubmV4dChzYW5kYm94LmV4cG9ydHMuZGVmYXVsdCk7XG4gICAgICBzdWJzY3JpYmVyLmNvbXBsZXRlKCk7XG4gICAgfSk7XG4gIH0pO1xufVxuXG4iXX0=