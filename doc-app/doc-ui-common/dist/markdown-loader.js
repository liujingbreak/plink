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
            catch (e) {
                log.error(e);
            }
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
        const done = [];
        const imgs = $('img');
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
        // const componentIds = $('div[id]');
        // componentIds.each((idx, div) => {
        //   const id = (div as unknown as HTMLDivElement).id;
        //   if (id.startsWith('component:')) {
        //   }
        // });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd24tbG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWFya2Rvd24tbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLDhEQUFxQztBQUNyQyx3REFBMEM7QUFDMUMsc0RBQThCO0FBQzlCLHNDQUFrQztBQUNsQyx5Q0FBMkI7QUFDM0IsbURBQXFDO0FBQ3JDLDRDQUFvQjtBQUVwQixnREFBd0I7QUFDeEIsaUVBQTJGO0FBQzNGLDJCQUEyQjtBQUUzQixNQUFNLEdBQUcsR0FBRyxjQUFNLENBQUMsU0FBUyxDQUFDLG9DQUFvQyxDQUFDLENBQUM7QUFFbkUsTUFBTSxFQUFFLEdBQUcsSUFBSSxxQkFBVSxDQUFDO0lBQ3hCLElBQUksRUFBRSxJQUFJO0lBQ1YsU0FBUyxDQUFDLEdBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSztRQUN4QixJQUFJLElBQUksRUFBRTtZQUNSLElBQUk7Z0JBQ0YsT0FBTyxTQUFTLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDO2FBQ25EO1lBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQ1YsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQzthQUNkO1NBQ0Y7UUFDRCxPQUFPLEdBQUcsQ0FBQztJQUNiLENBQUM7Q0FDRixDQUFDLENBQUM7QUFFSCxNQUFNLE1BQU0sR0FBa0IsVUFBUyxNQUFNLEVBQUUsU0FBUztJQUN0RCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFDeEIsSUFBSSxFQUFFLEVBQUU7UUFDTixNQUFNLElBQUksR0FBRyxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQWdCLENBQUMsQ0FBQztRQUN6QyxNQUFNLENBQUMsR0FBRyxpQkFBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUM3QixHQUFHLENBQUMsS0FBSyxDQUFDLElB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Q0FBQyxHQUFVLEVBQUUsTUFBTSxFQUFFLEVBQUU7O1lBQzdDLE1BQU0sdUJBQXVCLFNBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsTUFBTSwwQ0FBRSxVQUFVLENBQUM7WUFDekUsSUFBSSxHQUFHO2dCQUNMLE9BQU8sVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUMvQixNQUFNLFFBQVEsR0FBdUIsRUFBRSxDQUFDO1lBQ3hDLE1BQU0sT0FBTyxHQUFHO2dCQUNkLHVCQUF1QjtnQkFDdkIsTUFBTSxFQUFFO29CQUNOLE9BQU8sRUFBRSxRQUFRO2lCQUNsQjtnQkFDRCxPQUFPLEVBQUUsUUFBUTthQUNsQixDQUFDO1lBQ0YsTUFBTSxHQUFHLCtCQUFpQixDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztZQUN2QyxZQUFFLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxZQUFFLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDdEQsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3pDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN4QixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7bG9hZGVyfSBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCBNYXJrZG93bkl0IGZyb20gJ21hcmtkb3duLWl0JztcbmltcG9ydCAqIGFzIGhpZ2hsaWdodCBmcm9tICdoaWdobGlnaHQuanMnO1xuaW1wb3J0IGNoZWVyaW8gZnJvbSAnY2hlZXJpbyc7XG5pbXBvcnQge2xvZ2dlcn0gZnJvbSAnQHdmaC9wbGluayc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB2bSBmcm9tICd2bSc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHV0aWwgZnJvbSAndXRpbCc7XG5pbXBvcnQgeyBqc29uVG9Db21waWxlck9wdGlvbnMsIHRyYW5zcGlsZVNpbmdsZVRzIH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC90cy1jb21waWxlcic7XG4vLyBpbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcblxuY29uc3QgbG9nID0gbG9nZ2VyLmdldExvZ2dlcignQHdmaC9kb2MtdWktY29tbW9uLm1hcmtkb3duLWxvYWRlcicpO1xuXG5jb25zdCBtZCA9IG5ldyBNYXJrZG93bkl0KHtcbiAgaHRtbDogdHJ1ZSxcbiAgaGlnaGxpZ2h0KHN0ciwgbGFuZywgYXR0cnMpIHtcbiAgICBpZiAobGFuZykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmV0dXJuIGhpZ2hsaWdodC5oaWdobGlnaHQobGFuZywgc3RyLCB0cnVlKS52YWx1ZTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgbG9nLmVycm9yKGUpO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gc3RyO1xuICB9XG59KTtcblxuY29uc3QgbG9hZGVyOiBsb2FkZXIuTG9hZGVyID0gZnVuY3Rpb24oc291cmNlLCBzb3VyY2VNYXApIHtcbiAgY29uc3QgY2IgPSB0aGlzLmFzeW5jKCk7XG4gIGlmIChjYikge1xuICAgIGNvbnN0IGh0bWwgPSBtZC5yZW5kZXIoc291cmNlIGFzIHN0cmluZyk7XG4gICAgY29uc3QgJCA9IGNoZWVyaW8ubG9hZChodG1sKTtcbiAgICBsb2cuZGVidWcoaHRtbCk7XG5cbiAgICBjb25zdCBkb25lOiAocnguT2JzZXJ2YWJsZTxzdHJpbmc+fFByb21pc2U8c3RyaW5nPilbXSA9IFtdO1xuXG4gICAgY29uc3QgaW1ncyA9ICQoJ2ltZycpO1xuICAgIGltZ3MuZWFjaCgoaWR4LCBpbWcpID0+IHtcbiAgICAgIGNvbnN0IGltZ1EgPSAkKGltZyk7XG4gICAgICBjb25zdCBpbWdTcmMgPSBpbWdRLmF0dHIoJ3NyYycpO1xuICAgICAgbG9nLmluZm8oJ2ZvdW5kIGltZyBzcmM9JyArIGltZ1EuYXR0cignc3JjJykpO1xuICAgICAgaWYgKGltZ1NyYykge1xuICAgICAgICBkb25lLnB1c2gobG9hZChpbWdTcmMuc3RhcnRzV2l0aCgnLicpID8gaW1nU3JjIDogJy4vJyArIGltZ1NyYywgdGhpcylcbiAgICAgICAgICAucGlwZShcbiAgICAgICAgICAgIG9wLnRhcChyZXNvbHZlZCA9PiB7XG4gICAgICAgICAgICAgIGltZ1EuYXR0cignc3JjJywgcmVzb2x2ZWQpO1xuICAgICAgICAgICAgICBsb2cuaW5mbyhgcmVzb2x2ZSAke2ltZ1NyY30gdG8gJHt1dGlsLmluc3BlY3QocmVzb2x2ZWQpfWApO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICApKTtcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIC8vIGNvbnN0IGNvbXBvbmVudElkcyA9ICQoJ2RpdltpZF0nKTtcbiAgICAvLyBjb21wb25lbnRJZHMuZWFjaCgoaWR4LCBkaXYpID0+IHtcbiAgICAvLyAgIGNvbnN0IGlkID0gKGRpdiBhcyB1bmtub3duIGFzIEhUTUxEaXZFbGVtZW50KS5pZDtcbiAgICAvLyAgIGlmIChpZC5zdGFydHNXaXRoKCdjb21wb25lbnQ6JykpIHtcbiAgICAvLyAgIH1cbiAgICAvLyB9KTtcblxuICAgIHJ4Lm1lcmdlKC4uLmRvbmUpLnN1YnNjcmliZSh7XG4gICAgICBlcnJvcihlcnIpIHtcbiAgICAgICAgbG9nLmVycm9yKGVycik7XG4gICAgICB9LFxuICAgICAgY29tcGxldGUoKSB7XG4gICAgICAgIGNiKG51bGwsICQuaHRtbCgpLCBzb3VyY2VNYXApO1xuICAgICAgfVxuICAgIH0pO1xuICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCBsb2FkZXI7XG5cbmNvbnN0IGNvID0ganNvblRvQ29tcGlsZXJPcHRpb25zKHtcbiAgICBiYXNlVXJsOiAnLicsXG4gICAgb3V0RGlyOiAnZGlzdCcsXG4gICAgZGVjbGFyYXRpb246IGZhbHNlLFxuICAgIG1vZHVsZTonY29tbW9uanMnLFxuICAgIHRhcmdldDonZXMyMDE1JyxcbiAgICBub0ltcGxpY2l0QW55OiB0cnVlLFxuICAgIHN1cHByZXNzSW1wbGljaXRBbnlJbmRleEVycm9yczogdHJ1ZSxcbiAgICBhbGxvd1N5bnRoZXRpY0RlZmF1bHRJbXBvcnRzOiB0cnVlLFxuICAgIGVzTW9kdWxlSW50ZXJvcDogdHJ1ZSxcbiAgICBpbmxpbmVTb3VyY2VNYXA6IGZhbHNlLFxuICAgIGlubGluZVNvdXJjZXM6IGZhbHNlLFxuICAgIG1vZHVsZVJlc29sdXRpb246ICdub2RlJyxcbiAgICBleHBlcmltZW50YWxEZWNvcmF0b3JzOiB0cnVlLFxuICAgIGVtaXREZWNvcmF0b3JNZXRhZGF0YTogdHJ1ZSxcbiAgICBub1VudXNlZExvY2FsczogdHJ1ZSxcbiAgICBwcmVzZXJ2ZVN5bWxpbmtzOiBmYWxzZSxcbiAgICBkb3dubGV2ZWxJdGVyYXRpb246IGZhbHNlLFxuICAgIHN0cmljdE51bGxDaGVja3M6IHRydWUsXG4gICAgcmVzb2x2ZUpzb25Nb2R1bGU6IHRydWUsXG4gICAgZGlhZ25vc3RpY3M6IGZhbHNlLFxuICAgIG5ld0xpbmU6ICdsZicsXG4gICAgbGliOiBbJ2VzMjAxNicsXG4gICAgICAnZXMyMDE1JyxcbiAgICAgICdkb20nXG4gICAgXSxcbiAgICBwcmV0dHk6IHRydWUsXG4gICAgcm9vdERpcjogJ3RzJ1xuICB9XG4pO1xuXG5mdW5jdGlvbiBsb2FkKHJlcXVlc3Q6IHN0cmluZywgY3R4OiBsb2FkZXIuTG9hZGVyQ29udGV4dCkge1xuICByZXR1cm4gbmV3IHJ4Lk9ic2VydmFibGU8c3RyaW5nPihzdWJzY3JpYmVyID0+IHtcbiAgICAvLyBVbmxpa2UgZXh0cmFjdC1sb2FkZXIsIHdlIGRvZXMgbm90IHN1cHBvcnQgZW1iZWRkZWQgcmVxdWlyZSBzdGF0ZW1lbnQgaW4gc291cmNlIGNvZGUgXG4gICAgY3R4LmxvYWRNb2R1bGUocmVxdWVzdCwgKGVycjogRXJyb3IsIHNvdXJjZSkgPT4ge1xuICAgICAgY29uc3QgX193ZWJwYWNrX3B1YmxpY19wYXRoX18gPSBjdHguX2NvbXBpbGVyLm9wdGlvbnMub3V0cHV0Py5wdWJsaWNQYXRoO1xuICAgICAgaWYgKGVycilcbiAgICAgICAgcmV0dXJuIHN1YnNjcmliZXIuZXJyb3IoZXJyKTtcbiAgICAgIGNvbnN0IF9leHBvcnRzOiB7ZGVmYXVsdD86IHN0cmluZ30gPSB7fTtcbiAgICAgIGNvbnN0IHNhbmRib3ggPSB7XG4gICAgICAgIF9fd2VicGFja19wdWJsaWNfcGF0aF9fLFxuICAgICAgICBtb2R1bGU6IHtcbiAgICAgICAgICBleHBvcnRzOiBfZXhwb3J0c1xuICAgICAgICB9LFxuICAgICAgICBleHBvcnRzOiBfZXhwb3J0c1xuICAgICAgfTtcbiAgICAgIHNvdXJjZSA9IHRyYW5zcGlsZVNpbmdsZVRzKHNvdXJjZSwgY28pO1xuICAgICAgdm0ucnVuSW5OZXdDb250ZXh0KHNvdXJjZSwgdm0uY3JlYXRlQ29udGV4dChzYW5kYm94KSk7XG4gICAgICBzdWJzY3JpYmVyLm5leHQoc2FuZGJveC5leHBvcnRzLmRlZmF1bHQpO1xuICAgICAgc3Vic2NyaWJlci5jb21wbGV0ZSgpO1xuICAgIH0pO1xuICB9KTtcbn1cblxuIl19