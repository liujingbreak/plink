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
const markdown_it_1 = __importDefault(require("markdown-it"));
const highlight = __importStar(require("highlight.js"));
const cheerio_1 = __importDefault(require("cheerio"));
const plink_1 = require("@wfh/plink");
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const vm_1 = __importDefault(require("vm"));
const util_1 = __importDefault(require("util"));
const ts_compiler_1 = require("@wfh/plink/wfh/dist/ts-compiler");
// import path from 'path';
const log = plink_1.logger.getLogger('@wfh/doc-ui-common.markdown-loader');
const md = new markdown_it_1.default({
    html: true,
    highlight(str, lang, attrs) {
        if (lang) {
            try {
                return highlight.highlight(lang, str, true).value;
            }
            catch (e) { }
        }
        return str;
    }
});
const loader = function (source, sourceMap) {
    const cb = this.async();
    if (cb) {
        const html = md.render(source);
        const $ = cheerio_1.default.load(html);
        log.debug(html);
        const imgs = $('img');
        const done = [];
        imgs.each((idx, img) => {
            const imgQ = $(img);
            const imgSrc = imgQ.attr('src');
            log.info('found img src=' + imgQ.attr('src'));
            if (imgSrc) {
                done.push(load(imgSrc.startsWith('.') ? imgSrc : './' + imgSrc, this)
                    .pipe(op.tap(resolved => {
                    imgQ.attr('src', resolved);
                    log.info(`resolve ${imgSrc} to ${util_1.default.inspect(resolved)}`);
                })));
            }
        });
        rx.merge(...done).subscribe({
            error(err) {
                log.error(err);
            },
            complete() {
                cb(null, $.html(), sourceMap);
            }
        });
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
function load(request, ctx) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd24tbG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWFya2Rvd24tbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLDhEQUFxQztBQUNyQyx3REFBMEM7QUFDMUMsc0RBQThCO0FBQzlCLHNDQUFrQztBQUNsQyx5Q0FBMkI7QUFDM0IsbURBQXFDO0FBQ3JDLDRDQUFvQjtBQUVwQixnREFBd0I7QUFDeEIsaUVBQTJGO0FBQzNGLDJCQUEyQjtBQUUzQixNQUFNLEdBQUcsR0FBRyxjQUFNLENBQUMsU0FBUyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7QUFFbkUsTUFBTSxFQUFFLEdBQUcsSUFBSSxxQkFBVSxDQUFDO0lBQ3hCLElBQUksRUFBRSxJQUFJO0lBQ1YsU0FBUyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSztRQUN4QixJQUFJLElBQUksRUFBRTtZQUNSLElBQUk7Z0JBQ0YsT0FBTyxTQUFTLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDO2FBQ25EO1lBQUMsT0FBTyxDQUFDLEVBQUUsR0FBRTtTQUNmO1FBQ0QsT0FBTyxHQUFHLENBQUM7SUFDYixDQUFDO0NBQ0YsQ0FBQyxDQUFDO0FBRUgsTUFBTSxNQUFNLEdBQWtCLFVBQVMsTUFBTSxFQUFFLFNBQVM7SUFDdEQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBQ3hCLElBQUksRUFBRSxFQUFFO1FBQ04sTUFBTSxJQUFJLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxNQUFnQixDQUFDLENBQUM7UUFDekMsTUFBTSxDQUFDLEdBQUcsaUJBQU8sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDN0IsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNoQixNQUFNLElBQUksR0FBRyxDQUFDLENB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QUksR0FBRztnQkFDTCxPQUFPLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDL0IsTUFBTSxRQUFRLEdBQXVCLEVBQUUsQ0FBQztZQUN4QyxNQUFNLE9BQU8sR0FBRztnQkFDZCx1QkFBdUI7Z0JBQ3ZCLE1BQU0sRUFBRTtvQkFDTixPQUFPLEVBQUUsUUFBUTtpQkFDbEI7Z0JBQ0QsT0FBTyxFQUFFLFFBQVE7YUFDbEIsQ0FBQztZQUNGLE1BQU0sR0FBRywrQkFBaUIsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDdkMsWUFBRSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsWUFBRSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ3RELFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN6QyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDeEIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge2xvYWRlcn0gZnJvbSAnd2VicGFjayc7XG5pbXBvcnQgTWFya2Rvd25JdCBmcm9tICdtYXJrZG93bi1pdCc7XG5pbXBvcnQgKiBhcyBoaWdobGlnaHQgZnJvbSAnaGlnaGxpZ2h0LmpzJztcbmltcG9ydCBjaGVlcmlvIGZyb20gJ2NoZWVyaW8nO1xuaW1wb3J0IHtsb2dnZXJ9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgdm0gZnJvbSAndm0nO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB1dGlsIGZyb20gJ3V0aWwnO1xuaW1wb3J0IHsganNvblRvQ29tcGlsZXJPcHRpb25zLCB0cmFuc3BpbGVTaW5nbGVUcyB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdHMtY29tcGlsZXInO1xuLy8gaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5cbmNvbnN0IGxvZyA9IGxvZ2dlci5nZXRMb2dnZXIoJ0B3ZmgvZG9jLXVpLWNvbW1vbi5tYXJrZG93bi1sb2FkZXInKTtcblxuY29uc3QgbWQgPSBuZXcgTWFya2Rvd25JdCh7XG4gIGh0bWw6IHRydWUsXG4gIGhpZ2hsaWdodChzdHIsIGxhbmcsIGF0dHJzKSB7XG4gICAgaWYgKGxhbmcpIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHJldHVybiBoaWdobGlnaHQuaGlnaGxpZ2h0KGxhbmcsIHN0ciwgdHJ1ZSkudmFsdWU7XG4gICAgICB9IGNhdGNoIChlKSB7fVxuICAgIH1cbiAgICByZXR1cm4gc3RyO1xuICB9XG59KTtcblxuY29uc3QgbG9hZGVyOiBsb2FkZXIuTG9hZGVyID0gZnVuY3Rpb24oc291cmNlLCBzb3VyY2VNYXApIHtcbiAgY29uc3QgY2IgPSB0aGlzLmFzeW5jKCk7XG4gIGlmIChjYikge1xuICAgIGNvbnN0IGh0bWwgPSBtZC5yZW5kZXIoc291cmNlIGFzIHN0cmluZyk7XG4gICAgY29uc3QgJCA9IGNoZWVyaW8ubG9hZChodG1sKTtcbiAgICBsb2cuZGVidWcoaHRtbCk7XG4gICAgY29uc3QgaW1ncyA9ICQoJ2ltZycpO1xuICAgIGNvbnN0IGRvbmU6IHJ4Lk9ic2VydmFibGU8c3RyaW5nPltdID0gW107XG4gICAgaW1ncy5lYWNoKChpZHgsIGltZykgPT4ge1xuICAgICAgY29uc3QgaW1nUSA9ICQoaW1nKTtcbiAgICAgIGNvbnN0IGltZ1NyYyA9IGltZ1EuYXR0cignc3JjJyk7XG4gICAgICBsb2cuaW5mbygnZm91bmQgaW1nIHNyYz0nICsgaW1nUS5hdHRyKCdzcmMnKSk7XG4gICAgICBpZiAoaW1nU3JjKSB7XG4gICAgICAgIGRvbmUucHVzaChsb2FkKGltZ1NyYy5zdGFydHNXaXRoKCcuJykgPyBpbWdTcmMgOiAnLi8nICsgaW1nU3JjLCB0aGlzKVxuICAgICAgICAgIC5waXBlKFxuICAgICAgICAgICAgb3AudGFwKHJlc29sdmVkID0+IHtcbiAgICAgICAgICAgICAgaW1nUS5hdHRyKCdzcmMnLCByZXNvbHZlZCk7XG4gICAgICAgICAgICAgIGxvZy5pbmZvKGByZXNvbHZlICR7aW1nU3JjfSB0byAke3V0aWwuaW5zcGVjdChyZXNvbHZlZCl9YCk7XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICkpO1xuICAgICAgfVxuICAgIH0pO1xuICAgIHJ4Lm1lcmdlKC4uLmRvbmUpLnN1YnNjcmliZSh7XG4gICAgICBlcnJvcihlcnIpIHtcbiAgICAgICAgbG9nLmVycm9yKGVycik7XG4gICAgICB9LFxuICAgICAgY29tcGxldGUoKSB7XG4gICAgICAgIGNiKG51bGwsICQuaHRtbCgpLCBzb3VyY2VNYXApO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCBsb2FkZXI7XG5cbmNvbnN0IGNvID0ganNvblRvQ29tcGlsZXJPcHRpb25zKHtcbiAgICBiYXNlVXJsOiAnLicsXG4gICAgb3V0RGlyOiAnZGlzdCcsXG4gICAgZGVjbGFyYXRpb246IGZhbHNlLFxuICAgIG1vZHVsZTonY29tbW9uanMnLFxuICAgIHRhcmdldDonZXMyMDE1JyxcbiAgICBub0ltcGxpY2l0QW55OiB0cnVlLFxuICAgIHN1cHByZXNzSW1wbGljaXRBbnlJbmRleEVycm9yczogdHJ1ZSxcbiAgICBhbGxvd1N5bnRoZXRpY0RlZmF1bHRJbXBvcnRzOiB0cnVlLFxuICAgIGVzTW9kdWxlSW50ZXJvcDogdHJ1ZSxcbiAgICBpbmxpbmVTb3VyY2VNYXA6IGZhbHNlLFxuICAgIGlubGluZVNvdXJjZXM6IGZhbHNlLFxuICAgIG1vZHVsZVJlc29sdXRpb246ICdub2RlJyxcbiAgICBleHBlcmltZW50YWxEZWNvcmF0b3JzOiB0cnVlLFxuICAgIGVtaXREZWNvcmF0b3JNZXRhZGF0YTogdHJ1ZSxcbiAgICBub1VudXNlZExvY2FsczogdHJ1ZSxcbiAgICBwcmVzZXJ2ZVN5bWxpbmtzOiBmYWxzZSxcbiAgICBkb3dubGV2ZWxJdGVyYXRpb246IGZhbHNlLFxuICAgIHN0cmljdE51bGxDaGVja3M6IHRydWUsXG4gICAgcmVzb2x2ZUpzb25Nb2R1bGU6IHRydWUsXG4gICAgZGlhZ25vc3RpY3M6IGZhbHNlLFxuICAgIG5ld0xpbmU6ICdsZicsXG4gICAgbGliOiBbJ2VzMjAxNicsXG4gICAgICAnZXMyMDE1JyxcbiAgICAgICdkb20nXG4gICAgXSxcbiAgICBwcmV0dHk6IHRydWUsXG4gICAgcm9vdERpcjogJ3RzJ1xuICB9XG4pO1xuXG5mdW5jdGlvbiBsb2FkKHJlcXVlc3Q6IHN0cmluZywgY3R4OiBsb2FkZXIuTG9hZGVyQ29udGV4dCkge1xuICByZXR1cm4gbmV3IHJ4Lk9ic2VydmFibGU8c3RyaW5nPihzdWJzY3JpYmVyID0+IHtcbiAgICAvLyBVbmxpa2UgZXh0cmFjdC1sb2FkZXIsIHdlIGRvZXMgbm90IHN1cHBvcnQgZW1iZWRkZWQgcmVxdWlyZSBzdGF0ZW1lbnQgaW4gc291cmNlIGNvZGUgXG4gICAgY3R4LmxvYWRNb2R1bGUocmVxdWVzdCwgKGVycjogRXJyb3IsIHNvdXJjZSkgPT4ge1xuICAgICAgY29uc3QgX193ZWJwYWNrX3B1YmxpY19wYXRoX18gPSBjdHguX2NvbXBpbGVyLm9wdGlvbnMub3V0cHV0Py5wdWJsaWNQYXRoO1xuICAgICAgaWYgKGVycilcbiAgICAgICAgcmV0dXJuIHN1YnNjcmliZXIuZXJyb3IoZXJyKTtcbiAgICAgIGNvbnN0IF9leHBvcnRzOiB7ZGVmYXVsdD86IHN0cmluZ30gPSB7fTtcbiAgICAgIGNvbnN0IHNhbmRib3ggPSB7XG4gICAgICAgIF9fd2VicGFja19wdWJsaWNfcGF0aF9fLFxuICAgICAgICBtb2R1bGU6IHtcbiAgICAgICAgICBleHBvcnRzOiBfZXhwb3J0c1xuICAgICAgICB9LFxuICAgICAgICBleHBvcnRzOiBfZXhwb3J0c1xuICAgICAgfTtcbiAgICAgIHNvdXJjZSA9IHRyYW5zcGlsZVNpbmdsZVRzKHNvdXJjZSwgY28pO1xuICAgICAgdm0ucnVuSW5OZXdDb250ZXh0KHNvdXJjZSwgdm0uY3JlYXRlQ29udGV4dChzYW5kYm94KSk7XG4gICAgICBzdWJzY3JpYmVyLm5leHQoc2FuZGJveC5leHBvcnRzLmRlZmF1bHQpO1xuICAgICAgc3Vic2NyaWJlci5jb21wbGV0ZSgpO1xuICAgIH0pO1xuICB9KTtcbn1cbiJdfQ==