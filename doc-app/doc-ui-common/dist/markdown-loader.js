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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd24tbG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibWFya2Rvd24tbG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHlDQUEyQjtBQUMzQixtREFBcUM7QUFFckMsNENBQW9CO0FBQ3BCLGlFQUEyRjtBQUMzRixtREFBK0M7QUFFL0MsTUFBTSxjQUFjLEdBQWtCLFVBQVMsTUFBTSxFQUFFLFNBQVM7SUFFOUQsTUFBTSxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO0lBRXhCLElBQUksRUFBRSxFQUFFO1FBQ04sOEJBQWMsQ0FBQyxNQUFnQixFQUM3QixNQUFNLENBQUMsRUFBRSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQzthQUNwRixJQUFJLENBQ0gsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFDVixFQUFFLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFO1lBQ2QsRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQzlDLENBQUMsQ0FBQyxFQUNGLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDbEIsRUFBRSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ3hDLE9BQU8sRUFBRSxDQUFDLEtBQUssQ0FBQztRQUNsQixDQUFDLENBQUMsQ0FDSDthQUNGLFNBQVMsRUFBRSxDQUFDO0tBQ2Q7QUFDSCxDQUFDLENBQUM7QUFFRixrQkFBZSxjQUFjLENBQUM7QUFFOUIsTUFBTSxFQUFFLEdBQUcsbUNBQXFCLENBQUM7SUFDN0IsT0FBTyxFQUFFLEdBQUc7SUFDWixNQUFNLEVBQUUsTUFBTTtJQUNkLFdBQVcsRUFBRSxLQUFLO0lBQ2xCLE1BQU0sRUFBRSxVQUFVO0lBQ2xCLE1BQU0sRUFBRSxRQUFRO0lBQ2hCLGFBQWEsRUFBRSxJQUFJO0lBQ25CLDhCQUE4QixFQUFFLElBQUk7SUFDcEMsNEJBQTRCLEVBQUUsSUFBSTtJQUNsQyxlQUFlLEVBQUUsSUFBSTtJQUNyQixlQUFlLEVBQUUsS0FBSztJQUN0QixhQUFhLEVBQUUsS0FBSztJQUNwQixnQkFBZ0IsRUFBRSxNQUFNO0lBQ3hCLHNCQUFzQixFQUFFLElBQUk7SUFDNUIscUJBQXFCLEVBQUUsSUFBSTtJQUMzQixjQUFjLEVBQUUsSUFBSTtJQUNwQixnQkFBZ0IsRUFBRSxLQUFLO0lBQ3ZCLGtCQUFrQixFQUFFLEtBQUs7SUFDekIsZ0JBQWdCLEVBQUUsSUFBSTtJQUN0QixpQkFBaUIsRUFBRSxJQUFJO0lBQ3ZCLFdBQVcsRUFBRSxLQUFLO0lBQ2xCLE9BQU8sRUFBRSxJQUFJO0lBQ2IsR0FBRyxFQUFFLENBQUMsUUFBUTtRQUNaLFFBQVE7UUFDUixLQUFLO0tBQ047SUFDRCxNQUFNLEVBQUUsSUFBSTtJQUNaLE9BQU8sRUFBRSxJQUFJO0NBQ2QsQ0FDRixDQUFDO0FBRUYsU0FBUyxtQkFBbUIsQ0FBQyxPQUFlLEVBQUUsR0FBeUI7SUFDckUsT0FBTyxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQVMsVUFBVSxDQUFDLEVBQUU7UUFDNUMsd0ZBQXdGO1FBQ3hGLEdBQUcsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUMsR0FBaUIsRUFBRSxNQUFNLEVBQUUsRUFBRTs7WUFDcEQsTUFBTSx1QkFBdUIsU0FBRyxHQUFHLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxNQUFNLDBDQUFFLFVBQVUsQ0FBQztZQUN6RSxJQUFJLEdBQUc7Z0JBQ0wsT0FBTyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQy9CLE1BQU0sUUFBUSxHQUF1QixFQUFFLENBQUM7WUFDeEMsTUFBTSxPQUFPLEdBQUc7Z0JBQ2QsdUJBQXVCO2dCQUN2QixNQUFNLEVBQUU7b0JBQ04sT0FBTyxFQUFFLFFBQVE7aUJBQ2xCO2dCQUNELE9BQU8sRUFBRSxRQUFRO2FBQ2xCLENBQUM7WUFDRixNQUFNLEdBQUcsK0JBQWlCLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZDLFlBQUUsQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFlBQUUsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUN0RCxVQUFVLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDekMsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3hCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtsb2FkZXJ9IGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgXyBmcm9tICdsb2Rhc2gnO1xuaW1wb3J0IHZtIGZyb20gJ3ZtJztcbmltcG9ydCB7IGpzb25Ub0NvbXBpbGVyT3B0aW9ucywgdHJhbnNwaWxlU2luZ2xlVHMgfSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0L3RzLWNvbXBpbGVyJztcbmltcG9ydCB7bWFya2Rvd25Ub0h0bWx9IGZyb20gJy4vbWFya2Rvd24tdXRpbCc7XG5cbmNvbnN0IG1hcmtkb3duTG9hZGVyOiBsb2FkZXIuTG9hZGVyID0gZnVuY3Rpb24oc291cmNlLCBzb3VyY2VNYXApIHtcblxuICBjb25zdCBjYiA9IHRoaXMuYXN5bmMoKTtcblxuICBpZiAoY2IpIHtcbiAgICBtYXJrZG93blRvSHRtbChzb3VyY2UgYXMgc3RyaW5nLFxuICAgICAgaW1nU3JjID0+IGxvYWRNb2R1bGVJbldlYnBhY2soaW1nU3JjLnN0YXJ0c1dpdGgoJy4nKSA/IGltZ1NyYyA6ICcuLycgKyBpbWdTcmMsIHRoaXMpKVxuICAgICAgLnBpcGUoXG4gICAgICAgIG9wLnRha2UoMSksXG4gICAgICAgIG9wLm1hcChyZXN1bHQgPT4ge1xuICAgICAgICAgIGNiKG51bGwsIEpTT04uc3RyaW5naWZ5KHJlc3VsdCksIHNvdXJjZU1hcCk7XG4gICAgICAgIH0pLFxuICAgICAgICBvcC5jYXRjaEVycm9yKGVyciA9PiB7XG4gICAgICAgICAgY2IoZXJyLCBKU09OLnN0cmluZ2lmeShlcnIpLCBzb3VyY2VNYXApO1xuICAgICAgICAgIHJldHVybiByeC5FTVBUWTtcbiAgICAgICAgfSlcbiAgICAgIClcbiAgICAuc3Vic2NyaWJlKCk7XG4gIH1cbn07XG5cbmV4cG9ydCBkZWZhdWx0IG1hcmtkb3duTG9hZGVyO1xuXG5jb25zdCBjbyA9IGpzb25Ub0NvbXBpbGVyT3B0aW9ucyh7XG4gICAgYmFzZVVybDogJy4nLFxuICAgIG91dERpcjogJ2Rpc3QnLFxuICAgIGRlY2xhcmF0aW9uOiBmYWxzZSxcbiAgICBtb2R1bGU6ICdjb21tb25qcycsXG4gICAgdGFyZ2V0OiAnZXMyMDE1JyxcbiAgICBub0ltcGxpY2l0QW55OiB0cnVlLFxuICAgIHN1cHByZXNzSW1wbGljaXRBbnlJbmRleEVycm9yczogdHJ1ZSxcbiAgICBhbGxvd1N5bnRoZXRpY0RlZmF1bHRJbXBvcnRzOiB0cnVlLFxuICAgIGVzTW9kdWxlSW50ZXJvcDogdHJ1ZSxcbiAgICBpbmxpbmVTb3VyY2VNYXA6IGZhbHNlLFxuICAgIGlubGluZVNvdXJjZXM6IGZhbHNlLFxuICAgIG1vZHVsZVJlc29sdXRpb246ICdub2RlJyxcbiAgICBleHBlcmltZW50YWxEZWNvcmF0b3JzOiB0cnVlLFxuICAgIGVtaXREZWNvcmF0b3JNZXRhZGF0YTogdHJ1ZSxcbiAgICBub1VudXNlZExvY2FsczogdHJ1ZSxcbiAgICBwcmVzZXJ2ZVN5bWxpbmtzOiBmYWxzZSxcbiAgICBkb3dubGV2ZWxJdGVyYXRpb246IGZhbHNlLFxuICAgIHN0cmljdE51bGxDaGVja3M6IHRydWUsXG4gICAgcmVzb2x2ZUpzb25Nb2R1bGU6IHRydWUsXG4gICAgZGlhZ25vc3RpY3M6IGZhbHNlLFxuICAgIG5ld0xpbmU6ICdsZicsXG4gICAgbGliOiBbJ2VzMjAxNicsXG4gICAgICAnZXMyMDE1JyxcbiAgICAgICdkb20nXG4gICAgXSxcbiAgICBwcmV0dHk6IHRydWUsXG4gICAgcm9vdERpcjogJ3RzJ1xuICB9XG4pO1xuXG5mdW5jdGlvbiBsb2FkTW9kdWxlSW5XZWJwYWNrKHJlcXVlc3Q6IHN0cmluZywgY3R4OiBsb2FkZXIuTG9hZGVyQ29udGV4dCkge1xuICByZXR1cm4gbmV3IHJ4Lk9ic2VydmFibGU8c3RyaW5nPihzdWJzY3JpYmVyID0+IHtcbiAgICAvLyBVbmxpa2UgZXh0cmFjdC1sb2FkZXIsIHdlIGRvZXMgbm90IHN1cHBvcnQgZW1iZWRkZWQgcmVxdWlyZSBzdGF0ZW1lbnQgaW4gc291cmNlIGNvZGUgXG4gICAgY3R4LmxvYWRNb2R1bGUocmVxdWVzdCwgKGVycjogRXJyb3IgfCBudWxsLCBzb3VyY2UpID0+IHtcbiAgICAgIGNvbnN0IF9fd2VicGFja19wdWJsaWNfcGF0aF9fID0gY3R4Ll9jb21waWxlci5vcHRpb25zLm91dHB1dD8ucHVibGljUGF0aDtcbiAgICAgIGlmIChlcnIpXG4gICAgICAgIHJldHVybiBzdWJzY3JpYmVyLmVycm9yKGVycik7XG4gICAgICBjb25zdCBfZXhwb3J0czoge2RlZmF1bHQ/OiBzdHJpbmd9ID0ge307XG4gICAgICBjb25zdCBzYW5kYm94ID0ge1xuICAgICAgICBfX3dlYnBhY2tfcHVibGljX3BhdGhfXyxcbiAgICAgICAgbW9kdWxlOiB7XG4gICAgICAgICAgZXhwb3J0czogX2V4cG9ydHNcbiAgICAgICAgfSxcbiAgICAgICAgZXhwb3J0czogX2V4cG9ydHNcbiAgICAgIH07XG4gICAgICBzb3VyY2UgPSB0cmFuc3BpbGVTaW5nbGVUcyhzb3VyY2UsIGNvKTtcbiAgICAgIHZtLnJ1bkluTmV3Q29udGV4dChzb3VyY2UsIHZtLmNyZWF0ZUNvbnRleHQoc2FuZGJveCkpO1xuICAgICAgc3Vic2NyaWJlci5uZXh0KHNhbmRib3guZXhwb3J0cy5kZWZhdWx0KTtcbiAgICAgIHN1YnNjcmliZXIuY29tcGxldGUoKTtcbiAgICB9KTtcbiAgfSk7XG59XG5cbiJdfQ==