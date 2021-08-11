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
        markdown_util_1.markdownToHtml(source, imgSrc => loadModuleInWebpack(imgSrc.startsWith('.') ? imgSrc : './' + imgSrc, this))
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd24tbG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWFya2Rvd24tbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHlDQUEyQjtBQUMzQixtREFBcUM7QUFFckMsNENBQW9CO0FBQ3BCLGlFQUEyRjtBQUMzRixtREFBK0M7QUFFL0MsTUFBTSxjQUFjLEdBQWtCLFVBQVMsTUFBTSxFQUFFLFNBQVM7SUFFOUQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBRXhCLElBQUksRUFBRSxFQUFFO1FBQ04sOEJBQWMsQ0FBQyxNQUFnQixFQUM3QixNQUFNLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQzthQUNwRixJQUFJLENBQ0gsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFDVixFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ2QsRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzlDLENBQUMsQ0FBQyxFQUNGLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDbEIsRUFBRSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ3hDLE9BQU8sRUFBRSxDQUFDLEtBQUssQ0FBQztRQUNsQixDQUFDLENBQUMsQ0FDSDthQUNGLFNBQVMsRUFBRSxDQUFDO0tBQ2Q7QUFDSCxDQUFDLENBQUM7QUFFRixrQkFBZSxjQUFjLENBQUM7QUFFOUIsTUFBTSxFQUFFLEdBQUcsbUNBQXFCLENBQUM7SUFDN0IsT0FBTyxFQUFFLEdBQUc7SUFDWixNQUFNLEVBQUUsTUFBTTtJQUNkLFdBQVcsRUFBRSxLQUFLO0lBQ2xCLE1BQU0sRUFBQyxVQUFVO0lBQ2pCLE1BQU0sRUFBQyxRQUFRO0lBQ2YsYUFBYSxFQUFFLElBQUk7SUFDbkIsOEJBQThCLEVBQUUsSUFBSTtJQUNwQyw0QkFBNEIsRUFBRSxJQUFJO0lBQ2xDLGVBQWUsRUFBRSxJQUFJO0lBQ3JCLGVBQWUsRUFBRSxLQUFLO0lBQ3RCLGFBQWEsRUFBRSxLQUFLO0lBQ3BCLGdCQUFnQixFQUFFLE1BQU07SUFDeEIsc0JBQXNCLEVBQUUsSUFBSTtJQUM1QixxQkFBcUIsRUFBRSxJQUFJO0lBQzNCLGNBQWMsRUFBRSxJQUFJO0lBQ3BCLGdCQUFnQixFQUFFLEtBQUs7SUFDdkIsa0JBQWtCLEVBQUUsS0FBSztJQUN6QixnQkFBZ0IsRUFBRSxJQUFJO0lBQ3RCLGlCQUFpQixFQUFFLElBQUk7SUFDdkIsV0FBVyxFQUFFLEtBQUs7SUFDbEIsT0FBTyxFQUFFLElBQUk7SUFDYixHQUFHLEVBQUUsQ0FBQyxRQUFRO1FBQ1osUUFBUTtRQUNSLEtBQUs7S0FDTjtJQUNELE1BQU0sRUFBRSxJQUFJO0lBQ1osT0FBTyxFQUFFLElBQUk7Q0FDZCxDQUNGLENBQUM7QUFFRixTQUFTLG1CQUFtQixDQUFDLE9BQWUsRUFBRSxHQUF5QjtJQUNyRSxPQUFPLElBQUksRUFBRSxDQUFDLFVBQVUsQ0FBUyxVQUFVLENBQUMsRUFBRTtRQUM1Qyx3RkFBd0Y7UUFDeEYsR0FBRyxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFpQixFQUFFLE1BQU0sRUFBRSxFQUFFOztZQUNwRCxNQUFNLHVCQUF1QixTQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sMENBQUUsVUFBVSxDQUFDO1lBQ3pFLElBQUksR0FBRztnQkFDTCxPQUFPLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDL0IsTUFBTSxRQUFRLEdBQXVCLEVBQUUsQ0FBQztZQUN4QyxNQUFNLE9BQU8sR0FBRztnQkFDZCx1QkFBdUI7Z0JBQ3ZCLE1BQU0sRUFBRTtvQkFDTixPQUFPLEVBQUUsUUFBUTtpQkFDbEI7Z0JBQ0QsT0FBTyxFQUFFLFFBQVE7YUFDbEIsQ0FBQztZQUNGLE1BQU0sR0FBRywrQkFBaUIsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDdkMsWUFBRSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsWUFBRSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQ3RELFVBQVUsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztZQUN6QyxVQUFVLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDeEIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge2xvYWRlcn0gZnJvbSAnd2VicGFjayc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCBfIGZyb20gJ2xvZGFzaCc7XG5pbXBvcnQgdm0gZnJvbSAndm0nO1xuaW1wb3J0IHsganNvblRvQ29tcGlsZXJPcHRpb25zLCB0cmFuc3BpbGVTaW5nbGVUcyB9IGZyb20gJ0B3ZmgvcGxpbmsvd2ZoL2Rpc3QvdHMtY29tcGlsZXInO1xuaW1wb3J0IHttYXJrZG93blRvSHRtbH0gZnJvbSAnLi9tYXJrZG93bi11dGlsJztcblxuY29uc3QgbWFya2Rvd25Mb2FkZXI6IGxvYWRlci5Mb2FkZXIgPSBmdW5jdGlvbihzb3VyY2UsIHNvdXJjZU1hcCkge1xuXG4gIGNvbnN0IGNiID0gdGhpcy5hc3luYygpO1xuXG4gIGlmIChjYikge1xuICAgIG1hcmtkb3duVG9IdG1sKHNvdXJjZSBhcyBzdHJpbmcsXG4gICAgICBpbWdTcmMgPT4gbG9hZE1vZHVsZUluV2VicGFjayhpbWdTcmMuc3RhcnRzV2l0aCgnLicpID8gaW1nU3JjIDogJy4vJyArIGltZ1NyYywgdGhpcykpXG4gICAgICAucGlwZShcbiAgICAgICAgb3AudGFrZSgxKSxcbiAgICAgICAgb3AubWFwKHJlc3VsdCA9PiB7XG4gICAgICAgICAgY2IobnVsbCwgSlNPTi5zdHJpbmdpZnkocmVzdWx0KSwgc291cmNlTWFwKTtcbiAgICAgICAgfSksXG4gICAgICAgIG9wLmNhdGNoRXJyb3IoZXJyID0+IHtcbiAgICAgICAgICBjYihlcnIsIEpTT04uc3RyaW5naWZ5KGVyciksIHNvdXJjZU1hcCk7XG4gICAgICAgICAgcmV0dXJuIHJ4LkVNUFRZO1xuICAgICAgICB9KVxuICAgICAgKVxuICAgIC5zdWJzY3JpYmUoKTtcbiAgfVxufTtcblxuZXhwb3J0IGRlZmF1bHQgbWFya2Rvd25Mb2FkZXI7XG5cbmNvbnN0IGNvID0ganNvblRvQ29tcGlsZXJPcHRpb25zKHtcbiAgICBiYXNlVXJsOiAnLicsXG4gICAgb3V0RGlyOiAnZGlzdCcsXG4gICAgZGVjbGFyYXRpb246IGZhbHNlLFxuICAgIG1vZHVsZTonY29tbW9uanMnLFxuICAgIHRhcmdldDonZXMyMDE1JyxcbiAgICBub0ltcGxpY2l0QW55OiB0cnVlLFxuICAgIHN1cHByZXNzSW1wbGljaXRBbnlJbmRleEVycm9yczogdHJ1ZSxcbiAgICBhbGxvd1N5bnRoZXRpY0RlZmF1bHRJbXBvcnRzOiB0cnVlLFxuICAgIGVzTW9kdWxlSW50ZXJvcDogdHJ1ZSxcbiAgICBpbmxpbmVTb3VyY2VNYXA6IGZhbHNlLFxuICAgIGlubGluZVNvdXJjZXM6IGZhbHNlLFxuICAgIG1vZHVsZVJlc29sdXRpb246ICdub2RlJyxcbiAgICBleHBlcmltZW50YWxEZWNvcmF0b3JzOiB0cnVlLFxuICAgIGVtaXREZWNvcmF0b3JNZXRhZGF0YTogdHJ1ZSxcbiAgICBub1VudXNlZExvY2FsczogdHJ1ZSxcbiAgICBwcmVzZXJ2ZVN5bWxpbmtzOiBmYWxzZSxcbiAgICBkb3dubGV2ZWxJdGVyYXRpb246IGZhbHNlLFxuICAgIHN0cmljdE51bGxDaGVja3M6IHRydWUsXG4gICAgcmVzb2x2ZUpzb25Nb2R1bGU6IHRydWUsXG4gICAgZGlhZ25vc3RpY3M6IGZhbHNlLFxuICAgIG5ld0xpbmU6ICdsZicsXG4gICAgbGliOiBbJ2VzMjAxNicsXG4gICAgICAnZXMyMDE1JyxcbiAgICAgICdkb20nXG4gICAgXSxcbiAgICBwcmV0dHk6IHRydWUsXG4gICAgcm9vdERpcjogJ3RzJ1xuICB9XG4pO1xuXG5mdW5jdGlvbiBsb2FkTW9kdWxlSW5XZWJwYWNrKHJlcXVlc3Q6IHN0cmluZywgY3R4OiBsb2FkZXIuTG9hZGVyQ29udGV4dCkge1xuICByZXR1cm4gbmV3IHJ4Lk9ic2VydmFibGU8c3RyaW5nPihzdWJzY3JpYmVyID0+IHtcbiAgICAvLyBVbmxpa2UgZXh0cmFjdC1sb2FkZXIsIHdlIGRvZXMgbm90IHN1cHBvcnQgZW1iZWRkZWQgcmVxdWlyZSBzdGF0ZW1lbnQgaW4gc291cmNlIGNvZGUgXG4gICAgY3R4LmxvYWRNb2R1bGUocmVxdWVzdCwgKGVycjogRXJyb3IgfCBudWxsLCBzb3VyY2UpID0+IHtcbiAgICAgIGNvbnN0IF9fd2VicGFja19wdWJsaWNfcGF0aF9fID0gY3R4Ll9jb21waWxlci5vcHRpb25zLm91dHB1dD8ucHVibGljUGF0aDtcbiAgICAgIGlmIChlcnIpXG4gICAgICAgIHJldHVybiBzdWJzY3JpYmVyLmVycm9yKGVycik7XG4gICAgICBjb25zdCBfZXhwb3J0czoge2RlZmF1bHQ/OiBzdHJpbmd9ID0ge307XG4gICAgICBjb25zdCBzYW5kYm94ID0ge1xuICAgICAgICBfX3dlYnBhY2tfcHVibGljX3BhdGhfXyxcbiAgICAgICAgbW9kdWxlOiB7XG4gICAgICAgICAgZXhwb3J0czogX2V4cG9ydHNcbiAgICAgICAgfSxcbiAgICAgICAgZXhwb3J0czogX2V4cG9ydHNcbiAgICAgIH07XG4gICAgICBzb3VyY2UgPSB0cmFuc3BpbGVTaW5nbGVUcyhzb3VyY2UsIGNvKTtcbiAgICAgIHZtLnJ1bkluTmV3Q29udGV4dChzb3VyY2UsIHZtLmNyZWF0ZUNvbnRleHQoc2FuZGJveCkpO1xuICAgICAgc3Vic2NyaWJlci5uZXh0KHNhbmRib3guZXhwb3J0cy5kZWZhdWx0KTtcbiAgICAgIHN1YnNjcmliZXIuY29tcGxldGUoKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbiJdfQ==