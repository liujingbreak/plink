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
const op = __importStar(require("rxjs/operators"));
const vm_1 = __importDefault(require("vm"));
const ts_compiler_1 = require("@wfh/plink/wfh/dist/ts-compiler");
const markdown_util_1 = require("./markdown-util");
const markdownLoader = function (source, sourceMap) {
    const cb = this.async();
    if (cb) {
        (0, markdown_util_1.markdownToHtml)(source, imgSrc => loadModuleInWebpack(imgSrc.startsWith('.') ? imgSrc : './' + imgSrc, this))
            .pipe(op.take(1), op.map(result => {
            cb(null, JSON.stringify(result), sourceMap);
        }), op.catchError(err => {
            cb(err, JSON.stringify(err), sourceMap);
            return rx.EMPTY;
        }))
            .subscribe();
    }
};
exports.default = markdownLoader;
const co = (0, ts_compiler_1.jsonToCompilerOptions)({
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
            source = (0, ts_compiler_1.transpileSingleTs)(source, co);
            vm_1.default.runInNewContext(source, vm_1.default.createContext(sandbox));
            subscriber.next(sandbox.exports.default);
            subscriber.complete();
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd24tbG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWFya2Rvd24tbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHlDQUEyQjtBQUMzQixtREFBcUM7QUFFckMsNENBQW9CO0FBQ3BCLGlFQUEyRjtBQUMzRixtREFBK0M7QUFFL0MsTUFBTSxjQUFjLEdBQWtCLFVBQVMsTUFBTSxFQUFFLFNBQVM7SUFFOUQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBRXhCLElBQUksRUFBRSxFQUFFO1FBQ04sSUFBQSw4QkFBYyxFQUFDLE1BQWdCLEVBQzdCLE1BQU0sQ0FBQyxFQUFFLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFDO2FBQ3BGLElBQUksQ0FDSCxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUNWLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUU7WUFDZCxFQUFFLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDOUMsQ0FBQyxDQUFDLEVBQ0YsRUFBRSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNsQixFQUFFLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDeEMsT0FBTyxFQUFFLENBQUMsS0FBSyxDQUFDO1FBQ2xCLENBQUMsQ0FBQyxDQUNIO2FBQ0YsU0FBUyxFQUFFLENBQUM7S0FDZDtBQUNILENBQUMsQ0FBQztBQUVGLGtCQUFlLGNBQWMsQ0FBQztBQUU5QixNQUFNLEVBQUUsR0FBRyxJQUFBLG1DQUFxQixFQUFDO0lBQzdCLE9BQU8sRUFBRSxHQUFHO0lBQ1osTUFBTSxFQUFFLE1BQU07SUFDZCxXQUFXLEVBQUUsS0FBSztJQUNsQixNQUFNLEVBQUUsVUFBVTtJQUNsQixNQUFNLEVBQUUsUUFBUTtJQUNoQixhQUFhLEVBQUUsSUFBSTtJQUNuQiw4QkFBOEIsRUFBRSxJQUFJO0lBQ3BDLDRCQUE0QixFQUFFLElBQUk7SUFDbEMsZUFBZSxFQUFFLElBQUk7SUFDckIsZUFBZSxFQUFFLEtBQUs7SUFDdEIsYUFBYSxFQUFFLEtBQUs7SUFDcEIsZ0JBQWdCLEVBQUUsTUFBTTtJQUN4QixzQkFBc0IsRUFBRSxJQUFJO0lBQzVCLHFCQUFxQixFQUFFLElBQUk7SUFDM0IsY0FBYyxFQUFFLElBQUk7SUFDcEIsZ0JBQWdCLEVBQUUsS0FBSztJQUN2QixrQkFBa0IsRUFBRSxLQUFLO0lBQ3pCLGdCQUFnQixFQUFFLElBQUk7SUFDdEIsaUJBQWlCLEVBQUUsSUFBSTtJQUN2QixXQUFXLEVBQUUsS0FBSztJQUNsQixPQUFPLEVBQUUsSUFBSTtJQUNiLEdBQUcsRUFBRSxDQUFDLFFBQVE7UUFDWixRQUFRO1FBQ1IsS0FBSztLQUNOO0lBQ0QsTUFBTSxFQUFFLElBQUk7SUFDWixPQUFPLEVBQUUsSUFBSTtDQUNkLENBQ0YsQ0FBQztBQUVGLFNBQVMsbUJBQW1CLENBQUMsT0FBZSxFQUFFLEdBQXlCO0lBQ3JFLE9BQU8sSUFBSSxFQUFFLENBQUMsVUFBVSxDQUFTLFVBQVUsQ0FBQyxFQUFFO1FBQzVDLHdGQUF3RjtRQUN4RixHQUFHLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDLEdBQWlCLEVBQUUsTUFBTSxFQUFFLEVBQUU7O1lBQ3BELE1BQU0sdUJBQXVCLEdBQUcsTUFBQSxHQUFHLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxNQUFNLDBDQUFFLFVBQVUsQ0FBQztZQUN6RSxJQUFJLEdBQUc7Z0JBQ0wsT0FBTyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQy9CLE1BQU0sUUFBUSxHQUF1QixFQUFFLENBQUM7WUFDeEMsTUFBTSxPQUFPLEdBQUc7Z0JBQ2QsdUJBQXVCO2dCQUN2QixNQUFNLEVBQUU7b0JBQ04sT0FBTyxFQUFFLFFBQVE7aUJBQ2xCO2dCQUNELE9BQU8sRUFBRSxRQUFRO2FBQ2xCLENBQUM7WUFDRixNQUFNLEdBQUcsSUFBQSwrQkFBaUIsRUFBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDdkMsWUFBRSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsWUFBRSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ3RELFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN6QyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDeEIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge2xvYWRlcn0gZnJvbSAnd2VicGFjayc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgdm0gZnJvbSAndm0nO1xuaW1wb3J0IHsganNvblRvQ29tcGlsZXJPcHRpb25zLCB0cmFuc3BpbGVTaW5nbGVUcyB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdHMtY29tcGlsZXInO1xuaW1wb3J0IHttYXJrZG93blRvSHRtbH0gZnJvbSAnLi9tYXJrZG93bi11dGlsJztcblxuY29uc3QgbWFya2Rvd25Mb2FkZXI6IGxvYWRlci5Mb2FkZXIgPSBmdW5jdGlvbihzb3VyY2UsIHNvdXJjZU1hcCkge1xuXG4gIGNvbnN0IGNiID0gdGhpcy5hc3luYygpO1xuXG4gIGlmIChjYikge1xuICAgIG1hcmtkb3duVG9IdG1sKHNvdXJjZSBhcyBzdHJpbmcsXG4gICAgICBpbWdTcmMgPT4gbG9hZE1vZHVsZUluV2VicGFjayhpbWdTcmMuc3RhcnRzV2l0aCgnLicpID8gaW1nU3JjIDogJy4vJyArIGltZ1NyYywgdGhpcykpXG4gICAgICAucGlwZShcbiAgICAgICAgb3AudGFrZSgxKSxcbiAgICAgICAgb3AubWFwKHJlc3VsdCA9PiB7XG4gICAgICAgICAgY2IobnVsbCwgSlNPTi5zdHJpbmdpZnkocmVzdWx0KSwgc291cmNlTWFwKTtcbiAgICAgICAgfSksXG4gICAgICAgIG9wLmNhdGNoRXJyb3IoZXJyID0+IHtcbiAgICAgICAgICBjYihlcnIsIEpTT04uc3RyaW5naWZ5KGVyciksIHNvdXJjZU1hcCk7XG4gICAgICAgICAgcmV0dXJuIHJ4LkVNUFRZO1xuICAgICAgICB9KVxuICAgICAgKVxuICAgIC5zdWJzY3JpYmUoKTtcbiAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgbWFya2Rvd25Mb2FkZXI7XG5cbmNvbnN0IGNvID0ganNvblRvQ29tcGlsZXJPcHRpb25zKHtcbiAgICBiYXNlVXJsOiAnLicsXG4gICAgb3V0RGlyOiAnZGlzdCcsXG4gICAgZGVjbGFyYXRpb246IGZhbHNlLFxuICAgIG1vZHVsZTogJ2NvbW1vbmpzJyxcbiAgICB0YXJnZXQ6ICdlczIwMTUnLFxuICAgIG5vSW1wbGljaXRBbnk6IHRydWUsXG4gICAgc3VwcHJlc3NJbXBsaWNpdEFueUluZGV4RXJyb3JzOiB0cnVlLFxuICAgIGFsbG93U3ludGhldGljRGVmYXVsdEltcG9ydHM6IHRydWUsXG4gICAgZXNNb2R1bGVJbnRlcm9wOiB0cnVlLFxuICAgIGlubGluZVNvdXJjZU1hcDogZmFsc2UsXG4gICAgaW5saW5lU291cmNlczogZmFsc2UsXG4gICAgbW9kdWxlUmVzb2x1dGlvbjogJ25vZGUnLFxuICAgIGV4cGVyaW1lbnRhbERlY29yYXRvcnM6IHRydWUsXG4gICAgZW1pdERlY29yYXRvck1ldGFkYXRhOiB0cnVlLFxuICAgIG5vVW51c2VkTG9jYWxzOiB0cnVlLFxuICAgIHByZXNlcnZlU3ltbGlua3M6IGZhbHNlLFxuICAgIGRvd25sZXZlbEl0ZXJhdGlvbjogZmFsc2UsXG4gICAgc3RyaWN0TnVsbENoZWNrczogdHJ1ZSxcbiAgICByZXNvbHZlSnNvbk1vZHVsZTogdHJ1ZSxcbiAgICBkaWFnbm9zdGljczogZmFsc2UsXG4gICAgbmV3TGluZTogJ2xmJyxcbiAgICBsaWI6IFsnZXMyMDE2JyxcbiAgICAgICdlczIwMTUnLFxuICAgICAgJ2RvbSdcbiAgICBdLFxuICAgIHByZXR0eTogdHJ1ZSxcbiAgICByb290RGlyOiAndHMnXG4gIH1cbik7XG5cbmZ1bmN0aW9uIGxvYWRNb2R1bGVJbldlYnBhY2socmVxdWVzdDogc3RyaW5nLCBjdHg6IGxvYWRlci5Mb2FkZXJDb250ZXh0KSB7XG4gIHJldHVybiBuZXcgcnguT2JzZXJ2YWJsZTxzdHJpbmc+KHN1YnNjcmliZXIgPT4ge1xuICAgIC8vIFVubGlrZSBleHRyYWN0LWxvYWRlciwgd2UgZG9lcyBub3Qgc3VwcG9ydCBlbWJlZGRlZCByZXF1aXJlIHN0YXRlbWVudCBpbiBzb3VyY2UgY29kZSBcbiAgICBjdHgubG9hZE1vZHVsZShyZXF1ZXN0LCAoZXJyOiBFcnJvciB8IG51bGwsIHNvdXJjZSkgPT4ge1xuICAgICAgY29uc3QgX193ZWJwYWNrX3B1YmxpY19wYXRoX18gPSBjdHguX2NvbXBpbGVyLm9wdGlvbnMub3V0cHV0Py5wdWJsaWNQYXRoO1xuICAgICAgaWYgKGVycilcbiAgICAgICAgcmV0dXJuIHN1YnNjcmliZXIuZXJyb3IoZXJyKTtcbiAgICAgIGNvbnN0IF9leHBvcnRzOiB7ZGVmYXVsdD86IHN0cmluZ30gPSB7fTtcbiAgICAgIGNvbnN0IHNhbmRib3ggPSB7XG4gICAgICAgIF9fd2VicGFja19wdWJsaWNfcGF0aF9fLFxuICAgICAgICBtb2R1bGU6IHtcbiAgICAgICAgICBleHBvcnRzOiBfZXhwb3J0c1xuICAgICAgICB9LFxuICAgICAgICBleHBvcnRzOiBfZXhwb3J0c1xuICAgICAgfTtcbiAgICAgIHNvdXJjZSA9IHRyYW5zcGlsZVNpbmdsZVRzKHNvdXJjZSwgY28pO1xuICAgICAgdm0ucnVuSW5OZXdDb250ZXh0KHNvdXJjZSwgdm0uY3JlYXRlQ29udGV4dChzYW5kYm94KSk7XG4gICAgICBzdWJzY3JpYmVyLm5leHQoc2FuZGJveC5leHBvcnRzLmRlZmF1bHQpO1xuICAgICAgc3Vic2NyaWJlci5jb21wbGV0ZSgpO1xuICAgIH0pO1xuICB9KTtcbn1cblxuIl19