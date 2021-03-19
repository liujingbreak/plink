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
            return rx.merge(...done).pipe(op.catchError(err => { log.error(err); return rx.of(); }), op.finalize(() => {
                cb(null, $.html(), sourceMap);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd24tbG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWFya2Rvd24tbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHNEQUE4QjtBQUM5QixzQ0FBa0M7QUFDbEMseUNBQTJCO0FBQzNCLG1EQUFxQztBQUNyQyw0Q0FBb0I7QUFFcEIsZ0RBQXdCO0FBQ3hCLGdEQUF3QjtBQUN4QixpRUFBMkY7QUFDM0Ysa0VBQThDO0FBRTlDLE1BQU0sR0FBRyxHQUFHLGNBQU0sQ0FBQyxTQUFTLENBQUMsb0NBQW9DLENBQUMsQ0FBQztBQUduRSxJQUFJLFVBQWdCLENBQUM7QUFFckIsTUFBTSxNQUFNLEdBQWtCLFVBQVMsTUFBTSxFQUFFLFNBQVM7SUFDdEQsSUFBSSxVQUFVLElBQUksSUFBSSxFQUFFO1FBQ3RCLFVBQVUsR0FBRyxJQUFJLDBCQUFJLEVBQUUsQ0FBQztLQUN6QjtJQUNELE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztJQUN4QixJQUFJLEVBQUUsRUFBRTtRQUNOLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBUztZQUNoQyxJQUFJLEVBQUUsY0FBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEVBQUUsMkJBQTJCLENBQUMsRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQztTQUNwRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQ04sRUFBRSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUNqQixNQUFNLENBQUMsR0FBRyxpQkFBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM3QixHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2hCLE1BQU0sSUFBSSxHQUE4QyxFQUFFLENBQUM7WUFFM0QsTUFBTSxJQUFJLEdBQUcsQ0FBQyxDQUFDLEtBQUss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RUFBRSxFQUFFOztZQUM3QyxNQUFNLHVCQUF1QixTQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sMENBQUUsVUFBVSxDQUFDO1lBQ3pFLElBQUksR0FBRztnQkFDTCxPQUFPLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDL0IsTUFBTSxRQUFRLEdBQXVCLEVBQUUsQ0FBQztZQUN4QyxNQUFNLE9BQU8sR0FBRztnQkFDZCx1QkFBdUI7Z0JBQ3ZCLE1BQU0sRUFBRTtvQkFDTixPQUFPLEVBQUUsUUFBUTtpQkFDbEI7Z0JBQ0QsT0FBTyxFQUFFLFFBQVE7YUFDbEIsQ0FBQztZQUNGLE1BQU0sR0FBRywrQkFBaUIsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDdkMsWUFBRSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsWUFBRSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ3RELFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN6QyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDeEIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge2xvYWRlcn0gZnJvbSAnd2VicGFjayc7XG5pbXBvcnQgY2hlZXJpbyBmcm9tICdjaGVlcmlvJztcbmltcG9ydCB7bG9nZ2VyfSBmcm9tICdAd2ZoL3BsaW5rJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHZtIGZyb20gJ3ZtJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgdXRpbCBmcm9tICd1dGlsJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuaW1wb3J0IHsganNvblRvQ29tcGlsZXJPcHRpb25zLCB0cmFuc3BpbGVTaW5nbGVUcyB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdHMtY29tcGlsZXInO1xuaW1wb3J0IHtQb29sfSBmcm9tICdAd2ZoL3RocmVhZC1wcm9taXNlLXBvb2wnO1xuXG5jb25zdCBsb2cgPSBsb2dnZXIuZ2V0TG9nZ2VyKCdAd2ZoL2RvYy11aS1jb21tb24ubWFya2Rvd24tbG9hZGVyJyk7XG5cblxubGV0IHRocmVhZFBvb2w6IFBvb2w7XG5cbmNvbnN0IGxvYWRlcjogbG9hZGVyLkxvYWRlciA9IGZ1bmN0aW9uKHNvdXJjZSwgc291cmNlTWFwKSB7XG4gIGlmICh0aHJlYWRQb29sID09IG51bGwpIHtcbiAgICB0aHJlYWRQb29sID0gbmV3IFBvb2woKTtcbiAgfVxuICBjb25zdCBjYiA9IHRoaXMuYXN5bmMoKTtcbiAgaWYgKGNiKSB7XG4gICAgcnguZnJvbSh0aHJlYWRQb29sLnN1Ym1pdDxzdHJpbmc+KHtcbiAgICAgIGZpbGU6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdtYXJrZG93bi1sb2FkZXItd29ya2VyLmpzJyksIGV4cG9ydEZuOiAncGFyc2VUb0h0bWwnLCBhcmdzOiBbc291cmNlXVxuICAgIH0pKS5waXBlKFxuICAgICAgb3AubWVyZ2VNYXAoaHRtbCA9PiB7XG4gICAgICAgIGNvbnN0ICQgPSBjaGVlcmlvLmxvYWQoaHRtbCk7XG4gICAgICAgIGxvZy5kZWJ1ZyhodG1sKTtcbiAgICAgICAgY29uc3QgZG9uZTogKHJ4Lk9ic2VydmFibGU8c3RyaW5nPnxQcm9taXNlPHN0cmluZz4pW10gPSBbXTtcblxuICAgICAgICBjb25zdCBpbWdzID0gJCgnaW1nJyk7XG4gICAgICAgIGltZ3MuZWFjaCgoaWR4LCBpbWcpID0+IHtcbiAgICAgICAgICBjb25zdCBpbWdRID0gJChpbWcpO1xuICAgICAgICAgIGNvbnN0IGltZ1NyYyA9IGltZ1EuYXR0cignc3JjJyk7XG4gICAgICAgICAgbG9nLmluZm8oJ2ZvdW5kIGltZyBzcmM9JyArIGltZ1EuYXR0cignc3JjJykpO1xuICAgICAgICAgIGlmIChpbWdTcmMpIHtcbiAgICAgICAgICAgIGRvbmUucHVzaChsb2FkTW9kdWxlSW5XZWJwYWNrKGltZ1NyYy5zdGFydHNXaXRoKCcuJykgPyBpbWdTcmMgOiAnLi8nICsgaW1nU3JjLCB0aGlzKVxuICAgICAgICAgICAgICAucGlwZShcbiAgICAgICAgICAgICAgICBvcC50YXAocmVzb2x2ZWQgPT4ge1xuICAgICAgICAgICAgICAgICAgaW1nUS5hdHRyKCdzcmMnLCByZXNvbHZlZCk7XG4gICAgICAgICAgICAgICAgICBsb2cuaW5mbyhgcmVzb2x2ZSAke2ltZ1NyY30gdG8gJHt1dGlsLmluc3BlY3QocmVzb2x2ZWQpfWApO1xuICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICkpO1xuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiByeC5tZXJnZSguLi5kb25lKS5waXBlKFxuICAgICAgICAgIG9wLmNhdGNoRXJyb3IoZXJyID0+IHtsb2cuZXJyb3IoZXJyKTsgcmV0dXJuIHJ4Lm9mKCk7fSksXG4gICAgICAgICAgb3AuZmluYWxpemUoKCkgPT4ge1xuICAgICAgICAgICAgY2IobnVsbCwgJC5odG1sKCksIHNvdXJjZU1hcCk7XG4gICAgICAgICAgfSlcbiAgICAgICAgKTtcbiAgICAgIH0pXG4gICAgKS5zdWJzY3JpYmUoKTtcbiAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgbG9hZGVyO1xuXG5jb25zdCBjbyA9IGpzb25Ub0NvbXBpbGVyT3B0aW9ucyh7XG4gICAgYmFzZVVybDogJy4nLFxuICAgIG91dERpcjogJ2Rpc3QnLFxuICAgIGRlY2xhcmF0aW9uOiBmYWxzZSxcbiAgICBtb2R1bGU6J2NvbW1vbmpzJyxcbiAgICB0YXJnZXQ6J2VzMjAxNScsXG4gICAgbm9JbXBsaWNpdEFueTogdHJ1ZSxcbiAgICBzdXBwcmVzc0ltcGxpY2l0QW55SW5kZXhFcnJvcnM6IHRydWUsXG4gICAgYWxsb3dTeW50aGV0aWNEZWZhdWx0SW1wb3J0czogdHJ1ZSxcbiAgICBlc01vZHVsZUludGVyb3A6IHRydWUsXG4gICAgaW5saW5lU291cmNlTWFwOiBmYWxzZSxcbiAgICBpbmxpbmVTb3VyY2VzOiBmYWxzZSxcbiAgICBtb2R1bGVSZXNvbHV0aW9uOiAnbm9kZScsXG4gICAgZXhwZXJpbWVudGFsRGVjb3JhdG9yczogdHJ1ZSxcbiAgICBlbWl0RGVjb3JhdG9yTWV0YWRhdGE6IHRydWUsXG4gICAgbm9VbnVzZWRMb2NhbHM6IHRydWUsXG4gICAgcHJlc2VydmVTeW1saW5rczogZmFsc2UsXG4gICAgZG93bmxldmVsSXRlcmF0aW9uOiBmYWxzZSxcbiAgICBzdHJpY3ROdWxsQ2hlY2tzOiB0cnVlLFxuICAgIHJlc29sdmVKc29uTW9kdWxlOiB0cnVlLFxuICAgIGRpYWdub3N0aWNzOiBmYWxzZSxcbiAgICBuZXdMaW5lOiAnbGYnLFxuICAgIGxpYjogWydlczIwMTYnLFxuICAgICAgJ2VzMjAxNScsXG4gICAgICAnZG9tJ1xuICAgIF0sXG4gICAgcHJldHR5OiB0cnVlLFxuICAgIHJvb3REaXI6ICd0cydcbiAgfVxuKTtcblxuZnVuY3Rpb24gbG9hZE1vZHVsZUluV2VicGFjayhyZXF1ZXN0OiBzdHJpbmcsIGN0eDogbG9hZGVyLkxvYWRlckNvbnRleHQpIHtcbiAgcmV0dXJuIG5ldyByeC5PYnNlcnZhYmxlPHN0cmluZz4oc3Vic2NyaWJlciA9PiB7XG4gICAgLy8gVW5saWtlIGV4dHJhY3QtbG9hZGVyLCB3ZSBkb2VzIG5vdCBzdXBwb3J0IGVtYmVkZGVkIHJlcXVpcmUgc3RhdGVtZW50IGluIHNvdXJjZSBjb2RlIFxuICAgIGN0eC5sb2FkTW9kdWxlKHJlcXVlc3QsIChlcnI6IEVycm9yLCBzb3VyY2UpID0+IHtcbiAgICAgIGNvbnN0IF9fd2VicGFja19wdWJsaWNfcGF0aF9fID0gY3R4Ll9jb21waWxlci5vcHRpb25zLm91dHB1dD8ucHVibGljUGF0aDtcbiAgICAgIGlmIChlcnIpXG4gICAgICAgIHJldHVybiBzdWJzY3JpYmVyLmVycm9yKGVycik7XG4gICAgICBjb25zdCBfZXhwb3J0czoge2RlZmF1bHQ/OiBzdHJpbmd9ID0ge307XG4gICAgICBjb25zdCBzYW5kYm94ID0ge1xuICAgICAgICBfX3dlYnBhY2tfcHVibGljX3BhdGhfXyxcbiAgICAgICAgbW9kdWxlOiB7XG4gICAgICAgICAgZXhwb3J0czogX2V4cG9ydHNcbiAgICAgICAgfSxcbiAgICAgICAgZXhwb3J0czogX2V4cG9ydHNcbiAgICAgIH07XG4gICAgICBzb3VyY2UgPSB0cmFuc3BpbGVTaW5nbGVUcyhzb3VyY2UsIGNvKTtcbiAgICAgIHZtLnJ1bkluTmV3Q29udGV4dChzb3VyY2UsIHZtLmNyZWF0ZUNvbnRleHQoc2FuZGJveCkpO1xuICAgICAgc3Vic2NyaWJlci5uZXh0KHNhbmRib3guZXhwb3J0cy5kZWZhdWx0KTtcbiAgICAgIHN1YnNjcmliZXIuY29tcGxldGUoKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbiJdfQ==