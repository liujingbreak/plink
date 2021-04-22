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
const rx = __importStar(require("rxjs"));
const vm_1 = __importDefault(require("vm"));
const ts_compiler_1 = require("@wfh/plink/wfh/dist/ts-compiler");
const markdown_util_1 = require("./markdown-util");
const loader = function (source, sourceMap) {
    const cb = this.async();
    if (cb) {
        markdown_util_1.markdownToHtml(source, imgSrc => loadModuleInWebpack(imgSrc.startsWith('.') ? imgSrc : './' + imgSrc, this))
            .then(result => {
            cb(null, JSON.stringify(result), sourceMap);
        })
            .catch(err => {
            cb(err, JSON.stringify(err), sourceMap);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd24tbG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWFya2Rvd24tbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHlDQUEyQjtBQUUzQiw0Q0FBb0I7QUFDcEIsaUVBQTJGO0FBQzNGLG1EQUErQztBQUUvQyxNQUFNLE1BQU0sR0FBa0IsVUFBUyxNQUFNLEVBQUUsU0FBUztJQUV0RCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFFeEIsSUFBSSxFQUFFLEVBQUU7UUFDTiw4QkFBYyxDQUFDLE1BQWdCLEVBQzdCLE1BQU0sQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO2FBQ3RGLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUNiLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUM5QyxDQUFDLENBQUM7YUFDRCxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDWCxFQUFFLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDMUMsQ0FBQyxDQUFDLENBQUM7S0FDSjtBQUNILENBQUMsQ0FBQztBQUVGLGtCQUFlLE1BQU0sQ0FBQztBQUV0QixNQUFNLEVBQUUsR0FBRyxtQ0FBcUIsQ0FBQztJQUM3QixPQUFPLEVBQUUsR0FBRztJQUNaLE1BQU0sRUFBRSxNQUFNO0lBQ2QsV0FBVyxFQUFFLEtBQUs7SUFDbEIsTUFBTSxFQUFDLFVBQVU7SUFDakIsTUFBTSxFQUFDLFFBQVE7SUFDZixhQUFhLEVBQUUsSUFBSTtJQUNuQiw4QkFBOEIsRUFBRSxJQUFJO0lBQ3BDLDRCQUE0QixFQUFFLElBQUk7SUFDbEMsZUFBZSxFQUFFLElBQUk7SUFDckIsZUFBZSxFQUFFLEtBQUs7SUFDdEIsYUFBYSxFQUFFLEtBQUs7SUFDcEIsZ0JBQWdCLEVBQUUsTUFBTTtJQUN4QixzQkFBc0IsRUFBRSxJQUFJO0lBQzVCLHFCQUFxQixFQUFFLElBQUk7SUFDM0IsY0FBYyxFQUFFLElBQUk7SUFDcEIsZ0JBQWdCLEVBQUUsS0FBSztJQUN2QixrQkFBa0IsRUFBRSxLQUFLO0lBQ3pCLGdCQUFnQixFQUFFLElBQUk7SUFDdEIsaUJBQWlCLEVBQUUsSUFBSTtJQUN2QixXQUFXLEVBQUUsS0FBSztJQUNsQixPQUFPLEVBQUUsSUFBSTtJQUNiLEdBQUcsRUFBRSxDQUFDLFFBQVE7UUFDWixRQUFRO1FBQ1IsS0FBSztLQUNOO0lBQ0QsTUFBTSxFQUFFLElBQUk7SUFDWixPQUFPLEVBQUUsSUFBSTtDQUNkLENBQ0YsQ0FBQztBQUVGLFNBQVMsbUJBQW1CLENBQUMsT0FBZSxFQUFFLEdBQXlCO0lBQ3JFLE9BQU8sSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFTLFVBQVUsQ0FBQyxFQUFFO1FBQzVDLHdGQUF3RjtRQUN4RixHQUFHLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQVUsRUFBRSxNQUFNLEVBQUUsRUFBRTs7WUFDN0MsTUFBTSx1QkFBdUIsU0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxNQUFNLDBDQUFFLFVBQVUsQ0FBQztZQUN6RSxJQUFJLEdBQUc7Z0JBQ0wsT0FBTyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQy9CLE1BQU0sUUFBUSxHQUF1QixFQUFFLENBQUM7WUFDeEMsTUFBTSxPQUFPLEdBQUc7Z0JBQ2QsdUJBQXVCO2dCQUN2QixNQUFNLEVBQUU7b0JBQ04sT0FBTyxFQUFFLFFBQVE7aUJBQ2xCO2dCQUNELE9BQU8sRUFBRSxRQUFRO2FBQ2xCLENBQUM7WUFDRixNQUFNLEdBQUcsK0JBQWlCLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZDLFlBQUUsQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFlBQUUsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUN0RCxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDekMsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3hCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtsb2FkZXJ9IGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHZtIGZyb20gJ3ZtJztcbmltcG9ydCB7IGpzb25Ub0NvbXBpbGVyT3B0aW9ucywgdHJhbnNwaWxlU2luZ2xlVHMgfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3RzLWNvbXBpbGVyJztcbmltcG9ydCB7bWFya2Rvd25Ub0h0bWx9IGZyb20gJy4vbWFya2Rvd24tdXRpbCc7XG5cbmNvbnN0IGxvYWRlcjogbG9hZGVyLkxvYWRlciA9IGZ1bmN0aW9uKHNvdXJjZSwgc291cmNlTWFwKSB7XG5cbiAgY29uc3QgY2IgPSB0aGlzLmFzeW5jKCk7XG5cbiAgaWYgKGNiKSB7XG4gICAgbWFya2Rvd25Ub0h0bWwoc291cmNlIGFzIHN0cmluZyxcbiAgICAgIGltZ1NyYyA9PiBsb2FkTW9kdWxlSW5XZWJwYWNrKGltZ1NyYy5zdGFydHNXaXRoKCcuJykgPyBpbWdTcmMgOiAnLi8nICsgaW1nU3JjLCB0aGlzKSlcbiAgICAudGhlbihyZXN1bHQgPT4ge1xuICAgICAgY2IobnVsbCwgSlNPTi5zdHJpbmdpZnkocmVzdWx0KSwgc291cmNlTWFwKTtcbiAgICB9KVxuICAgIC5jYXRjaChlcnIgPT4ge1xuICAgICAgY2IoZXJyLCBKU09OLnN0cmluZ2lmeShlcnIpLCBzb3VyY2VNYXApO1xuICAgIH0pO1xuICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCBsb2FkZXI7XG5cbmNvbnN0IGNvID0ganNvblRvQ29tcGlsZXJPcHRpb25zKHtcbiAgICBiYXNlVXJsOiAnLicsXG4gICAgb3V0RGlyOiAnZGlzdCcsXG4gICAgZGVjbGFyYXRpb246IGZhbHNlLFxuICAgIG1vZHVsZTonY29tbW9uanMnLFxuICAgIHRhcmdldDonZXMyMDE1JyxcbiAgICBub0ltcGxpY2l0QW55OiB0cnVlLFxuICAgIHN1cHByZXNzSW1wbGljaXRBbnlJbmRleEVycm9yczogdHJ1ZSxcbiAgICBhbGxvd1N5bnRoZXRpY0RlZmF1bHRJbXBvcnRzOiB0cnVlLFxuICAgIGVzTW9kdWxlSW50ZXJvcDogdHJ1ZSxcbiAgICBpbmxpbmVTb3VyY2VNYXA6IGZhbHNlLFxuICAgIGlubGluZVNvdXJjZXM6IGZhbHNlLFxuICAgIG1vZHVsZVJlc29sdXRpb246ICdub2RlJyxcbiAgICBleHBlcmltZW50YWxEZWNvcmF0b3JzOiB0cnVlLFxuICAgIGVtaXREZWNvcmF0b3JNZXRhZGF0YTogdHJ1ZSxcbiAgICBub1VudXNlZExvY2FsczogdHJ1ZSxcbiAgICBwcmVzZXJ2ZVN5bWxpbmtzOiBmYWxzZSxcbiAgICBkb3dubGV2ZWxJdGVyYXRpb246IGZhbHNlLFxuICAgIHN0cmljdE51bGxDaGVja3M6IHRydWUsXG4gICAgcmVzb2x2ZUpzb25Nb2R1bGU6IHRydWUsXG4gICAgZGlhZ25vc3RpY3M6IGZhbHNlLFxuICAgIG5ld0xpbmU6ICdsZicsXG4gICAgbGliOiBbJ2VzMjAxNicsXG4gICAgICAnZXMyMDE1JyxcbiAgICAgICdkb20nXG4gICAgXSxcbiAgICBwcmV0dHk6IHRydWUsXG4gICAgcm9vdERpcjogJ3RzJ1xuICB9XG4pO1xuXG5mdW5jdGlvbiBsb2FkTW9kdWxlSW5XZWJwYWNrKHJlcXVlc3Q6IHN0cmluZywgY3R4OiBsb2FkZXIuTG9hZGVyQ29udGV4dCkge1xuICByZXR1cm4gbmV3IHJ4Lk9ic2VydmFibGU8c3RyaW5nPihzdWJzY3JpYmVyID0+IHtcbiAgICAvLyBVbmxpa2UgZXh0cmFjdC1sb2FkZXIsIHdlIGRvZXMgbm90IHN1cHBvcnQgZW1iZWRkZWQgcmVxdWlyZSBzdGF0ZW1lbnQgaW4gc291cmNlIGNvZGUgXG4gICAgY3R4LmxvYWRNb2R1bGUocmVxdWVzdCwgKGVycjogRXJyb3IsIHNvdXJjZSkgPT4ge1xuICAgICAgY29uc3QgX193ZWJwYWNrX3B1YmxpY19wYXRoX18gPSBjdHguX2NvbXBpbGVyLm9wdGlvbnMub3V0cHV0Py5wdWJsaWNQYXRoO1xuICAgICAgaWYgKGVycilcbiAgICAgICAgcmV0dXJuIHN1YnNjcmliZXIuZXJyb3IoZXJyKTtcbiAgICAgIGNvbnN0IF9leHBvcnRzOiB7ZGVmYXVsdD86IHN0cmluZ30gPSB7fTtcbiAgICAgIGNvbnN0IHNhbmRib3ggPSB7XG4gICAgICAgIF9fd2VicGFja19wdWJsaWNfcGF0aF9fLFxuICAgICAgICBtb2R1bGU6IHtcbiAgICAgICAgICBleHBvcnRzOiBfZXhwb3J0c1xuICAgICAgICB9LFxuICAgICAgICBleHBvcnRzOiBfZXhwb3J0c1xuICAgICAgfTtcbiAgICAgIHNvdXJjZSA9IHRyYW5zcGlsZVNpbmdsZVRzKHNvdXJjZSwgY28pO1xuICAgICAgdm0ucnVuSW5OZXdDb250ZXh0KHNvdXJjZSwgdm0uY3JlYXRlQ29udGV4dChzYW5kYm94KSk7XG4gICAgICBzdWJzY3JpYmVyLm5leHQoc2FuZGJveC5leHBvcnRzLmRlZmF1bHQpO1xuICAgICAgc3Vic2NyaWJlci5jb21wbGV0ZSgpO1xuICAgIH0pO1xuICB9KTtcbn1cblxuIl19