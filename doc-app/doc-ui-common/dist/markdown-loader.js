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
const markdownLoader = function (source, sourceMap) {
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
exports.default = markdownLoader;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd24tbG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWFya2Rvd24tbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHlDQUEyQjtBQUUzQiw0Q0FBb0I7QUFDcEIsaUVBQTJGO0FBQzNGLG1EQUErQztBQUUvQyxNQUFNLGNBQWMsR0FBa0IsVUFBUyxNQUFNLEVBQUUsU0FBUztJQUU5RCxNQUFNLEVBQUUsR0FBRyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7SUFFeEIsSUFBSSxFQUFFLEVBQUU7UUFDTiw4QkFBYyxDQUFDLE1BQWdCLEVBQzdCLE1BQU0sQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO2FBQ3RGLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRTtZQUNiLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUM5QyxDQUFDLENBQUM7YUFDRCxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDWCxFQUFFLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDMUMsQ0FBQyxDQUFDLENBQUM7S0FDSjtBQUNILENBQUMsQ0FBQztBQUVGLGtCQUFlLGNBQWMsQ0FBQztBQUU5QixNQUFNLEVBQUUsR0FBRyxtQ0FBcUIsQ0FBQztJQUM3QixPQUFPLEVBQUUsR0FBRztJQUNaLE1BQU0sRUFBRSxNQUFNO0lBQ2QsV0FBVyxFQUFFLEtBQUs7SUFDbEIsTUFBTSxFQUFDLFVBQVU7SUFDakIsTUFBTSxFQUFDLFFBQVE7SUFDZixhQUFhLEVBQUUsSUFBSTtJQUNuQiw4QkFBOEIsRUFBRSxJQUFJO0lBQ3BDLDRCQUE0QixFQUFFLElBQUk7SUFDbEMsZUFBZSxFQUFFLElBQUk7SUFDckIsZUFBZSxFQUFFLEtBQUs7SUFDdEIsYUFBYSxFQUFFLEtBQUs7SUFDcEIsZ0JBQWdCLEVBQUUsTUFBTTtJQUN4QixzQkFBc0IsRUFBRSxJQUFJO0lBQzVCLHFCQUFxQixFQUFFLElBQUk7SUFDM0IsY0FBYyxFQUFFLElBQUk7SUFDcEIsZ0JBQWdCLEVBQUUsS0FBSztJQUN2QixrQkFBa0IsRUFBRSxLQUFLO0lBQ3pCLGdCQUFnQixFQUFFLElBQUk7SUFDdEIsaUJBQWlCLEVBQUUsSUFBSTtJQUN2QixXQUFXLEVBQUUsS0FBSztJQUNsQixPQUFPLEVBQUUsSUFBSTtJQUNiLEdBQUcsRUFBRSxDQUFDLFFBQVE7UUFDWixRQUFRO1FBQ1IsS0FBSztLQUNOO0lBQ0QsTUFBTSxFQUFFLElBQUk7SUFDWixPQUFPLEVBQUUsSUFBSTtDQUNkLENBQ0YsQ0FBQztBQUVGLFNBQVMsbUJBQW1CLENBQUMsT0FBZSxFQUFFLEdBQXlCO0lBQ3JFLE9BQU8sSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFTLFVBQVUsQ0FBQyxFQUFFO1FBQzVDLHdGQUF3RjtRQUN4RixHQUFHLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQWlCLEVBQUUsTUFBTSxFQUFFLEVBQUU7O1lBQ3BELE1BQU0sdUJBQXVCLFNBQUcsR0FBRyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsTUFBTSwwQ0FBRSxVQUFVLENBQUM7WUFDekUsSUFBSSxHQUFHO2dCQUNMLE9BQU8sVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUMvQixNQUFNLFFBQVEsR0FBdUIsRUFBRSxDQUFDO1lBQ3hDLE1BQU0sT0FBTyxHQUFHO2dCQUNkLHVCQUF1QjtnQkFDdkIsTUFBTSxFQUFFO29CQUNOLE9BQU8sRUFBRSxRQUFRO2lCQUNsQjtnQkFDRCxPQUFPLEVBQUUsUUFBUTthQUNsQixDQUFDO1lBQ0YsTUFBTSxHQUFHLCtCQUFpQixDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQztZQUN2QyxZQUFFLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxZQUFFLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7WUFDdEQsVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3pDLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN4QixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7bG9hZGVyfSBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0IF8gZnJvbSAnbG9kYXNoJztcbmltcG9ydCB2bSBmcm9tICd2bSc7XG5pbXBvcnQgeyBqc29uVG9Db21waWxlck9wdGlvbnMsIHRyYW5zcGlsZVNpbmdsZVRzIH0gZnJvbSAnQHdmaC9wbGluay93ZmgvZGlzdC90cy1jb21waWxlcic7XG5pbXBvcnQge21hcmtkb3duVG9IdG1sfSBmcm9tICcuL21hcmtkb3duLXV0aWwnO1xuXG5jb25zdCBtYXJrZG93bkxvYWRlcjogbG9hZGVyLkxvYWRlciA9IGZ1bmN0aW9uKHNvdXJjZSwgc291cmNlTWFwKSB7XG5cbiAgY29uc3QgY2IgPSB0aGlzLmFzeW5jKCk7XG5cbiAgaWYgKGNiKSB7XG4gICAgbWFya2Rvd25Ub0h0bWwoc291cmNlIGFzIHN0cmluZyxcbiAgICAgIGltZ1NyYyA9PiBsb2FkTW9kdWxlSW5XZWJwYWNrKGltZ1NyYy5zdGFydHNXaXRoKCcuJykgPyBpbWdTcmMgOiAnLi8nICsgaW1nU3JjLCB0aGlzKSlcbiAgICAudGhlbihyZXN1bHQgPT4ge1xuICAgICAgY2IobnVsbCwgSlNPTi5zdHJpbmdpZnkocmVzdWx0KSwgc291cmNlTWFwKTtcbiAgICB9KVxuICAgIC5jYXRjaChlcnIgPT4ge1xuICAgICAgY2IoZXJyLCBKU09OLnN0cmluZ2lmeShlcnIpLCBzb3VyY2VNYXApO1xuICAgIH0pO1xuICB9XG59O1xuXG5leHBvcnQgZGVmYXVsdCBtYXJrZG93bkxvYWRlcjtcblxuY29uc3QgY28gPSBqc29uVG9Db21waWxlck9wdGlvbnMoe1xuICAgIGJhc2VVcmw6ICcuJyxcbiAgICBvdXREaXI6ICdkaXN0JyxcbiAgICBkZWNsYXJhdGlvbjogZmFsc2UsXG4gICAgbW9kdWxlOidjb21tb25qcycsXG4gICAgdGFyZ2V0OidlczIwMTUnLFxuICAgIG5vSW1wbGljaXRBbnk6IHRydWUsXG4gICAgc3VwcHJlc3NJbXBsaWNpdEFueUluZGV4RXJyb3JzOiB0cnVlLFxuICAgIGFsbG93U3ludGhldGljRGVmYXVsdEltcG9ydHM6IHRydWUsXG4gICAgZXNNb2R1bGVJbnRlcm9wOiB0cnVlLFxuICAgIGlubGluZVNvdXJjZU1hcDogZmFsc2UsXG4gICAgaW5saW5lU291cmNlczogZmFsc2UsXG4gICAgbW9kdWxlUmVzb2x1dGlvbjogJ25vZGUnLFxuICAgIGV4cGVyaW1lbnRhbERlY29yYXRvcnM6IHRydWUsXG4gICAgZW1pdERlY29yYXRvck1ldGFkYXRhOiB0cnVlLFxuICAgIG5vVW51c2VkTG9jYWxzOiB0cnVlLFxuICAgIHByZXNlcnZlU3ltbGlua3M6IGZhbHNlLFxuICAgIGRvd25sZXZlbEl0ZXJhdGlvbjogZmFsc2UsXG4gICAgc3RyaWN0TnVsbENoZWNrczogdHJ1ZSxcbiAgICByZXNvbHZlSnNvbk1vZHVsZTogdHJ1ZSxcbiAgICBkaWFnbm9zdGljczogZmFsc2UsXG4gICAgbmV3TGluZTogJ2xmJyxcbiAgICBsaWI6IFsnZXMyMDE2JyxcbiAgICAgICdlczIwMTUnLFxuICAgICAgJ2RvbSdcbiAgICBdLFxuICAgIHByZXR0eTogdHJ1ZSxcbiAgICByb290RGlyOiAndHMnXG4gIH1cbik7XG5cbmZ1bmN0aW9uIGxvYWRNb2R1bGVJbldlYnBhY2socmVxdWVzdDogc3RyaW5nLCBjdHg6IGxvYWRlci5Mb2FkZXJDb250ZXh0KSB7XG4gIHJldHVybiBuZXcgcnguT2JzZXJ2YWJsZTxzdHJpbmc+KHN1YnNjcmliZXIgPT4ge1xuICAgIC8vIFVubGlrZSBleHRyYWN0LWxvYWRlciwgd2UgZG9lcyBub3Qgc3VwcG9ydCBlbWJlZGRlZCByZXF1aXJlIHN0YXRlbWVudCBpbiBzb3VyY2UgY29kZSBcbiAgICBjdHgubG9hZE1vZHVsZShyZXF1ZXN0LCAoZXJyOiBFcnJvciB8IG51bGwsIHNvdXJjZSkgPT4ge1xuICAgICAgY29uc3QgX193ZWJwYWNrX3B1YmxpY19wYXRoX18gPSBjdHguX2NvbXBpbGVyLm9wdGlvbnMub3V0cHV0Py5wdWJsaWNQYXRoO1xuICAgICAgaWYgKGVycilcbiAgICAgICAgcmV0dXJuIHN1YnNjcmliZXIuZXJyb3IoZXJyKTtcbiAgICAgIGNvbnN0IF9leHBvcnRzOiB7ZGVmYXVsdD86IHN0cmluZ30gPSB7fTtcbiAgICAgIGNvbnN0IHNhbmRib3ggPSB7XG4gICAgICAgIF9fd2VicGFja19wdWJsaWNfcGF0aF9fLFxuICAgICAgICBtb2R1bGU6IHtcbiAgICAgICAgICBleHBvcnRzOiBfZXhwb3J0c1xuICAgICAgICB9LFxuICAgICAgICBleHBvcnRzOiBfZXhwb3J0c1xuICAgICAgfTtcbiAgICAgIHNvdXJjZSA9IHRyYW5zcGlsZVNpbmdsZVRzKHNvdXJjZSwgY28pO1xuICAgICAgdm0ucnVuSW5OZXdDb250ZXh0KHNvdXJjZSwgdm0uY3JlYXRlQ29udGV4dChzYW5kYm94KSk7XG4gICAgICBzdWJzY3JpYmVyLm5leHQoc2FuZGJveC5leHBvcnRzLmRlZmF1bHQpO1xuICAgICAgc3Vic2NyaWJlci5jb21wbGV0ZSgpO1xuICAgIH0pO1xuICB9KTtcbn1cblxuIl19