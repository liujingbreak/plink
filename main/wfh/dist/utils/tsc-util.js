"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
exports.transpileSingleFile = exports.plinkNodeJsCompilerOption = exports.watch = void 0;
const typescript_1 = __importDefault(require("typescript"));
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const tiny_redux_toolkit_1 = require("../../../packages/redux-toolkit-observable/dist/tiny-redux-toolkit");
const ts_cmd_util_1 = require("../ts-cmd-util");
const actions = {
    onWriteFile(_s, ..._args) { },
    onDiagnosticString(_s, _text, _isWatchStateChange) { },
    _watchStatusChange(_s, _diagnostic) { },
    _reportDiagnostic(_s, _diagnostic) { }
};
function watch(rootFiles, jsonCompilerOpt, opts = {
    mode: 'compile',
    ts: require('typescript')
}) {
    const { actionDispatcher: dispatcher, addEpic, action$ByType, getState } = (0, tiny_redux_toolkit_1.createSlice)({
        name: 'watchContorl',
        initialState: {},
        reducers: actions
    });
    const formatHost = {
        getCanonicalFileName: opts.formatDiagnosticFileName || (path => path),
        getCurrentDirectory: typescript_1.default.sys.getCurrentDirectory,
        getNewLine: () => typescript_1.default.sys.newLine
    };
    const ts = opts.ts || require('typescript');
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const compilerOptions = ts.parseJsonConfigFileContent({ compilerOptions: jsonCompilerOpt || plinkNodeJsCompilerOption(ts, { jsx: true }) }, ts.sys, process.cwd().replace(/\\/g, '/'), undefined, 'tsconfig.json').options;
    const programHost = ts.createWatchCompilerHost(rootFiles, compilerOptions, ts.sys, ts.createEmitAndSemanticDiagnosticsBuilderProgram, dispatcher._reportDiagnostic, dispatcher._watchStatusChange);
    if (opts.transformSrcFile)
        patchWatchCompilerHost(programHost, opts.transformSrcFile);
    const origCreateProgram = programHost.createProgram;
    // Ts's createWatchProgram will call WatchCompilerHost.createProgram(), this is where we patch "CompilerHost"
    programHost.createProgram = function (rootNames, options, host, ...rest) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (host && host._overrided == null) {
            patchCompilerHost(host, dispatcher.onWriteFile);
        }
        const program = origCreateProgram.call(this, rootNames, options, host, ...rest);
        return program;
    };
    ts.createWatchProgram(programHost);
    addEpic(_slice => _action$ => {
        return rx.merge(action$ByType._reportDiagnostic.pipe(op.map(({ payload: diagnostic }) => {
            dispatcher.onDiagnosticString(ts.formatDiagnosticsWithColorAndContext([diagnostic], formatHost), false);
        })), action$ByType._watchStatusChange.pipe(op.map(({ payload: diagnostic }) => {
            dispatcher.onDiagnosticString(ts.formatDiagnosticsWithColorAndContext([diagnostic], formatHost), true);
        }))).pipe(op.ignoreElements());
    });
    if (getState().error) {
        throw getState().error;
    }
    return action$ByType;
}
exports.watch = watch;
function patchWatchCompilerHost(host, transform) {
    const readFile = host.readFile;
    host.readFile = function (path, encoding) {
        const content = readFile.call(this, path, encoding);
        if (content) {
            const changed = transform(path, content, encoding);
            if (changed != null && changed !== content) {
                return changed;
            }
        }
        return content;
    };
}
function patchCompilerHost(host, write) {
    // It seems to not able to write file through symlink in Windows
    // const _writeFile = host.writeFile;
    host.writeFile = write;
}
function plinkNodeJsCompilerOption(ts, opts = {}) {
    const { jsx = false, inlineSourceMap = true, emitDeclarationOnly = false } = opts;
    let baseCompilerOptions;
    if (jsx) {
        const baseTsconfigFile2 = require.resolve('../tsconfig-tsx.json');
        // log.info('Use tsconfig file:', baseTsconfigFile2);
        const tsxTsconfig = (0, ts_cmd_util_1.parseConfigFileToJson)(ts, baseTsconfigFile2);
        baseCompilerOptions = tsxTsconfig.compilerOptions;
        // baseCompilerOptions = {...baseCompilerOptions, ...tsxTsconfig.config.compilerOptions};
    }
    else {
        const baseTsconfigFile = require.resolve('../tsconfig-base.json');
        const baseTsconfig = (0, ts_cmd_util_1.parseConfigFileToJson)(ts, baseTsconfigFile);
        // log.info('Use tsconfig file:', baseTsconfigFile);
        baseCompilerOptions = baseTsconfig.compilerOptions;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const compilerOptions = Object.assign(Object.assign({}, baseCompilerOptions), { target: 'ES2017', importHelpers: false, declaration: true, 
        // module: 'ESNext',
        /**
         * for gulp-sourcemaps usage:
         *  If you set the outDir option to the same value as the directory in gulp.dest, you should set the sourceRoot to ./.
         */
        outDir: '', rootDir: '', skipLibCheck: true, inlineSourceMap, sourceMap: inlineSourceMap, inlineSources: inlineSourceMap, emitDeclarationOnly, preserveSymlinks: true });
    return compilerOptions;
}
exports.plinkNodeJsCompilerOption = plinkNodeJsCompilerOption;
function transpileSingleFile(content, fileName, ts = require('typescript')) {
    const { outputText, diagnostics, sourceMapText } = ts.transpileModule(content, {
        compilerOptions: Object.assign(Object.assign({}, plinkNodeJsCompilerOption(ts)), { isolatedModules: true })
    });
    return {
        outputText,
        sourceMapText,
        diagnostics,
        diagnosticsText: diagnostics
    };
}
exports.transpileSingleFile = transpileSingleFile;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNjLXV0aWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy90c2MtdXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDREQUE2QjtBQUM3Qix5Q0FBMkI7QUFDM0IsbURBQXFDO0FBQ3JDLDJHQUErRjtBQUMvRixnREFBcUQ7QUFlckQsTUFBTSxPQUFPLEdBQUc7SUFDZCxXQUFXLENBQUMsRUFBYyxFQUFFLEdBQUcsS0FBd0MsSUFBRyxDQUFDO0lBQzNFLGtCQUFrQixDQUFDLEVBQWMsRUFBRSxLQUFhLEVBQUUsbUJBQTRCLElBQUcsQ0FBQztJQUNsRixrQkFBa0IsQ0FBQyxFQUFjLEVBQUUsV0FBMkIsSUFBRyxDQUFDO0lBQ2xFLGlCQUFpQixDQUFDLEVBQWMsRUFBRSxXQUEyQixJQUFHLENBQUM7Q0FDbEUsQ0FBQztBQVNGLFNBQWdCLEtBQUssQ0FBQyxTQUFtQixFQUFFLGVBQTRDLEVBQUUsT0FBZ0I7SUFDdkcsSUFBSSxFQUFFLFNBQVM7SUFDZixFQUFFLEVBQUUsT0FBTyxDQUFDLFlBQVksQ0FBZTtDQUN4QztJQUNDLE1BQU0sRUFBQyxnQkFBZ0IsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUMsR0FBRyxJQUFBLGdDQUFXLEVBQUM7UUFDbkYsSUFBSSxFQUFFLGNBQWM7UUFDcEIsWUFBWSxFQUFFLEVBQWdCO1FBQzlCLFFBQVEsRUFBRSxPQUFPO0tBQ2xCLENBQUMsQ0FBQztJQUVILE1BQU0sVUFBVSxHQUE4QjtRQUM1QyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsd0JBQXdCLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQztRQUNyRSxtQkFBbUIsRUFBRSxvQkFBRyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUI7UUFDaEQsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLG9CQUFHLENBQUMsR0FBRyxDQUFD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LE1BQU0sWUFBWSxHQUFHLElBQUEsbUNBQXFCLEVBQUMsRUFBRSxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDakUsb0RBQW9EO1FBQ3BELG1CQUFtQixHQUFHLFlBQVksQ0FBQyxlQUFlLENBQUM7S0FDcEQ7SUFDRCxtRUFBbUU7SUFDbkUsTUFBTSxlQUFlLG1DQUNoQixtQkFBbUIsS0FDdEIsTUFBTSxFQUFFLFFBQVEsRUFDaEIsYUFBYSxFQUFFLEtBQUssRUFDcEIsV0FBVyxFQUFFLElBQUk7UUFDakIsb0JBQW9CO1FBQ3BCOzs7V0FHRztRQUNILE1BQU0sRUFBRSxFQUFFLEVBQ1YsT0FBTyxFQUFFLEVBQUUsRUFDWCxZQUFZLEVBQUUsSUFBSSxFQUNsQixlQUFlLEVBQ2YsU0FBUyxFQUFFLGVBQWUsRUFDMUIsYUFBYSxFQUFFLGVBQWUsRUFDOUIsbUJBQW1CLEVBQ25CLGdCQUFnQixFQUFFLElBQUksR0FDdkIsQ0FBQztJQUNGLE9BQU8sZUFBZSxDQUFDO0FBQ3pCLENBQUM7QUF2Q0QsOERBdUNDO0FBRUQsU0FBZ0IsbUJBQW1CLENBQUMsT0FBZSxFQUFFLFFBQWdCLEVBQUUsS0FBSyxPQUFPLENBQUMsWUFBWSxDQUFlO0lBQzdHLE1BQU0sRUFBQyxVQUFVLEVBQUUsV0FBVyxFQUFFLGFBQWEsRUFBQyxHQUFHLEVBQUUsQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFO1FBQzNFLGVBQWUsa0NBQU0seUJBQXlCLENBQUMsRUFBRSxDQUFDLEtBQUUsZUFBZSxFQUFFLElBQUksR0FBQztLQUMzRSxDQUFDLENBQUM7SUFFSCxPQUFPO1FBQ0wsVUFBVTtRQUNWLGFBQWE7UUFDYixXQUFXO1FBQ1gsZUFBZSxFQUFFLFdBQVc7S0FDN0IsQ0FBQztBQUNKLENBQUM7QUFYRCxrREFXQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCBfdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgKiBhcyByeCBmcm9tICdyeGpzJztcbmltcG9ydCAqIGFzIG9wIGZyb20gJ3J4anMvb3BlcmF0b3JzJztcbmltcG9ydCB7Y3JlYXRlU2xpY2V9IGZyb20gJy4uLy4uLy4uL3BhY2thZ2VzL3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZS9kaXN0L3RpbnktcmVkdXgtdG9vbGtpdCc7XG5pbXBvcnQge3BhcnNlQ29uZmlnRmlsZVRvSnNvbn0gZnJvbSAnLi4vdHMtY21kLXV0aWwnO1xuXG5leHBvcnQgdHlwZSBXYXRjaFN0YXR1c0NoYW5nZSA9IHtcbiAgdHlwZTogJ3dhdGNoU3RhdHVzQ2hhbmdlJztcbiAgcGF5bG9hZDogX3RzLkRpYWdub3N0aWM7XG59O1xuXG5leHBvcnQgdHlwZSBPbldyaXRlRmlsZSA9IHtcbiAgdHlwZTogJ29uV3JpdGVGaWxlJztcbn07XG5cbnR5cGUgV2F0Y2hTdGF0ZSA9IHtcbiAgZXJyb3I/OiBFcnJvcjtcbn07XG5cbmNvbnN0IGFjdGlvbnMgPSB7XG4gIG9uV3JpdGVGaWxlKF9zOiBXYXRjaFN0YXRlLCAuLi5fYXJnczogUGFyYW1ldGVyczxfdHMuV3JpdGVGaWxlQ2FsbGJhY2s+KSB7fSxcbiAgb25EaWFnbm9zdGljU3RyaW5nKF9zOiBXYXRjaFN0YXRlLCBfdGV4dDogc3RyaW5nLCBfaXNXYXRjaFN0YXRlQ2hhbmdlOiBib29sZWFuKSB7fSxcbiAgX3dhdGNoU3RhdHVzQ2hhbmdlKF9zOiBXYXRjaFN0YXRlLCBfZGlhZ25vc3RpYzogX3RzLkRpYWdub3N0aWMpIHt9LFxuICBfcmVwb3J0RGlhZ25vc3RpYyhfczogV2F0Y2hTdGF0ZSwgX2RpYWdub3N0aWM6IF90cy5EaWFnbm9zdGljKSB7fVxufTtcblxuZXhwb3J0IHR5cGUgT3B0aW9ucyA9IHtcbiAgdHM6IHR5cGVvZiBfdHM7XG4gIG1vZGU6ICd3YXRjaCcgfCAnY29tcGlsZSc7XG4gIGZvcm1hdERpYWdub3N0aWNGaWxlTmFtZT8ocGF0aDogc3RyaW5nKTogc3RyaW5nO1xuICB0cmFuc2Zvcm1TcmNGaWxlPyhmaWxlOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZywgZW5jb2Rpbmc/OiBzdHJpbmcpOiBzdHJpbmcgfCBudWxsIHwgdW5kZWZpbmVkO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIHdhdGNoKHJvb3RGaWxlczogc3RyaW5nW10sIGpzb25Db21waWxlck9wdD86IFJlY29yZDxzdHJpbmcsIGFueT4gfCBudWxsLCBvcHRzOiBPcHRpb25zID0ge1xuICBtb2RlOiAnY29tcGlsZScsXG4gIHRzOiByZXF1aXJlKCd0eXBlc2NyaXB0JykgYXMgdHlwZW9mIF90c1xufSkge1xuICBjb25zdCB7YWN0aW9uRGlzcGF0Y2hlcjogZGlzcGF0Y2hlciwgYWRkRXBpYywgYWN0aW9uJEJ5VHlwZSwgZ2V0U3RhdGV9ID0gY3JlYXRlU2xpY2Uoe1xuICAgIG5hbWU6ICd3YXRjaENvbnRvcmwnLFxuICAgIGluaXRpYWxTdGF0ZToge30gYXMgV2F0Y2hTdGF0ZSxcbiAgICByZWR1Y2VyczogYWN0aW9uc1xuICB9KTtcblxuICBjb25zdCBmb3JtYXRIb3N0OiBfdHMuRm9ybWF0RGlhZ25vc3RpY3NIb3N0ID0ge1xuICAgIGdldENhbm9uaWNhbEZpbGVOYW1lOiBvcHRzLmZvcm1hdERpYWdub3N0aWNGaWxlTmFtZSB8fCAocGF0aCA9PiBwYXRoKSxcbiAgICBnZXRDdXJyZW50RGlyZWN0b3J5OiBfdHMuc3lzLmdldEN1cnJlbnREaXJlY3RvcnksXG4gICAgZ2V0TmV3TGluZTogKCkgPT4gX3RzLnN5cy5uZXdMaW5lXG4gIH07XG5cbiAgY29uc3QgdHMgPSBvcHRzLnRzIHx8IHJlcXVpcmUoJ3R5cGVzY3JpcHQnKTtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudFxuICBjb25zdCBjb21waWxlck9wdGlvbnMgPSB0cy5wYXJzZUpzb25Db25maWdGaWxlQ29udGVudCh7Y29tcGlsZXJPcHRpb25zOiBqc29uQ29tcGlsZXJPcHQgfHwgcGxpbmtOb2RlSnNDb21waWxlck9wdGlvbih0cywge2pzeDogdHJ1ZX0pfSwgdHMuc3lzLFxuICAgIHByb2Nlc3MuY3dkKCkucmVwbGFjZSgvXFxcXC9nLCAnLycpLFxuICAgIHVuZGVmaW5lZCwgJ3RzY29uZmlnLmpzb24nKS5vcHRpb25zO1xuXG4gIGNvbnN0IHByb2dyYW1Ib3N0ID0gdHMuY3JlYXRlV2F0Y2hDb21waWxlckhvc3Qocm9vdEZpbGVzLCBjb21waWxlck9wdGlvbnMsIHRzLnN5cyxcbiAgICB0cy5jcmVhdGVFbWl0QW5kU2VtYW50aWNEaWFnbm9zdGljc0J1aWxkZXJQcm9ncmFtLCBkaXNwYXRjaGVyLl9yZXBvcnREaWFnbm9zdGljLCBkaXNwYXRjaGVyLl93YXRjaFN0YXR1c0NoYW5nZSk7XG4gIGlmIChvcHRzLnRyYW5zZm9ybVNyY0ZpbGUpXG4gICAgcGF0Y2hXYXRjaENvbXBpbGVySG9zdChwcm9ncmFtSG9zdCwgb3B0cy50cmFuc2Zvcm1TcmNGaWxlKTtcblxuICBjb25zdCBvcmlnQ3JlYXRlUHJvZ3JhbSA9IHByb2dyYW1Ib3N0LmNyZWF0ZVByb2dyYW07XG4gIC8vIFRzJ3MgY3JlYXRlV2F0Y2hQcm9ncmFtIHdpbGwgY2FsbCBXYXRjaENvbXBpbGVySG9zdC5jcmVhdGVQcm9ncmFtKCksIHRoaXMgaXMgd2hlcmUgd2UgcGF0Y2ggXCJDb21waWxlckhvc3RcIlxuICBwcm9ncmFtSG9zdC5jcmVhdGVQcm9ncmFtID0gZnVuY3Rpb24ocm9vdE5hbWVzOiByZWFkb25seSBzdHJpbmdbXSB8IHVuZGVmaW5lZCwgb3B0aW9uczogX3RzLkNvbXBpbGVyT3B0aW9ucyB8IHVuZGVmaW5lZCxcbiAgICBob3N0PzogX3RzLkNvbXBpbGVySG9zdCwgLi4ucmVzdDogYW55W10pIHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1tZW1iZXItYWNjZXNzXG4gICAgaWYgKGhvc3QgJiYgKGhvc3QgYXMgYW55KS5fb3ZlcnJpZGVkID09IG51bGwpIHtcbiAgICAgIHBhdGNoQ29tcGlsZXJIb3N0KGhvc3QsIGRpc3BhdGNoZXIub25Xcml0ZUZpbGUpO1xuICAgIH1cbiAgICBjb25zdCBwcm9ncmFtID0gb3JpZ0NyZWF0ZVByb2dyYW0uY2FsbCh0aGlzLCByb290TmFtZXMsIG9wdGlvbnMsIGhvc3QsIC4uLnJlc3QpIDtcbiAgICByZXR1cm4gcHJvZ3JhbTtcbiAgfTtcblxuICB0cy5jcmVhdGVXYXRjaFByb2dyYW0ocHJvZ3JhbUhvc3QpO1xuICBhZGRFcGljKF9zbGljZSA9PiBfYWN0aW9uJCA9PiB7XG4gICAgcmV0dXJuIHJ4Lm1lcmdlKFxuICAgICAgYWN0aW9uJEJ5VHlwZS5fcmVwb3J0RGlhZ25vc3RpYy5waXBlKFxuICAgICAgICBvcC5tYXAoKHtwYXlsb2FkOiBkaWFnbm9zdGljfSkgPT4ge1xuICAgICAgICAgIGRpc3BhdGNoZXIub25EaWFnbm9zdGljU3RyaW5nKHRzLmZvcm1hdERpYWdub3N0aWNzV2l0aENvbG9yQW5kQ29udGV4dChbZGlhZ25vc3RpY10sIGZvcm1hdEhvc3QpLCBmYWxzZSk7XG4gICAgICAgIH0pXG4gICAgICApLFxuICAgICAgYWN0aW9uJEJ5VHlwZS5fd2F0Y2hTdGF0dXNDaGFuZ2UucGlwZShcbiAgICAgICAgb3AubWFwKCh7cGF5bG9hZDogZGlhZ25vc3RpY30pID0+IHtcbiAgICAgICAgICBkaXNwYXRjaGVyLm9uRGlhZ25vc3RpY1N0cmluZyh0cy5mb3JtYXREaWFnbm9zdGljc1dpdGhDb2xvckFuZENvbnRleHQoW2RpYWdub3N0aWNdLCBmb3JtYXRIb3N0KSwgdHJ1ZSk7XG4gICAgICAgIH0pXG4gICAgICApXG4gICAgKS5waXBlKFxuICAgICAgb3AuaWdub3JlRWxlbWVudHMoKVxuICAgICk7XG4gIH0pO1xuXG4gIGlmIChnZXRTdGF0ZSgpLmVycm9yKSB7XG4gICAgdGhyb3cgZ2V0U3RhdGUoKS5lcnJvcjtcbiAgfVxuXG4gIHJldHVybiBhY3Rpb24kQnlUeXBlO1xufVxuXG5mdW5jdGlvbiBwYXRjaFdhdGNoQ29tcGlsZXJIb3N0KGhvc3Q6IF90cy5XYXRjaENvbXBpbGVySG9zdE9mRmlsZXNBbmRDb21waWxlck9wdGlvbnM8X3RzLkVtaXRBbmRTZW1hbnRpY0RpYWdub3N0aWNzQnVpbGRlclByb2dyYW0+IHwgX3RzLkNvbXBpbGVySG9zdCxcbiAgdHJhbnNmb3JtOiBOb25OdWxsYWJsZTxPcHRpb25zWyd0cmFuc2Zvcm1TcmNGaWxlJ10+KSB7XG4gIGNvbnN0IHJlYWRGaWxlID0gaG9zdC5yZWFkRmlsZTtcblxuICBob3N0LnJlYWRGaWxlID0gZnVuY3Rpb24ocGF0aDogc3RyaW5nLCBlbmNvZGluZz86IHN0cmluZykge1xuICAgIGNvbnN0IGNvbnRlbnQgPSByZWFkRmlsZS5jYWxsKHRoaXMsIHBhdGgsIGVuY29kaW5nKSA7XG4gICAgaWYgKGNvbnRlbnQpIHtcbiAgICAgIGNvbnN0IGNoYW5nZWQgPSB0cmFuc2Zvcm0ocGF0aCwgY29udGVudCwgZW5jb2RpbmcpO1xuICAgICAgaWYgKGNoYW5nZWQgIT0gbnVsbCAmJiBjaGFuZ2VkICE9PSBjb250ZW50KSB7XG4gICAgICAgIHJldHVybiBjaGFuZ2VkO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gY29udGVudDtcbiAgfTtcbn1cblxuZnVuY3Rpb24gcGF0Y2hDb21waWxlckhvc3QoaG9zdDogX3RzLkNvbXBpbGVySG9zdCxcbiAgd3JpdGU6IF90cy5Xcml0ZUZpbGVDYWxsYmFjaykge1xuICAvLyBJdCBzZWVtcyB0byBub3QgYWJsZSB0byB3cml0ZSBmaWxlIHRocm91Z2ggc3ltbGluayBpbiBXaW5kb3dzXG4gIC8vIGNvbnN0IF93cml0ZUZpbGUgPSBob3N0LndyaXRlRmlsZTtcbiAgaG9zdC53cml0ZUZpbGUgPSB3cml0ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBsaW5rTm9kZUpzQ29tcGlsZXJPcHRpb24oXG4gIHRzOiB0eXBlb2YgX3RzLFxuICBvcHRzOiB7anN4PzogYm9vbGVhbjsgaW5saW5lU291cmNlTWFwPzogYm9vbGVhbjsgZW1pdERlY2xhcmF0aW9uT25seT86IGJvb2xlYW59ID0ge31cbikge1xuICBjb25zdCB7anN4ID0gZmFsc2UsIGlubGluZVNvdXJjZU1hcCA9IHRydWUsIGVtaXREZWNsYXJhdGlvbk9ubHkgPSBmYWxzZX0gPSBvcHRzO1xuICBsZXQgYmFzZUNvbXBpbGVyT3B0aW9uczogYW55O1xuICBpZiAoanN4KSB7XG4gICAgY29uc3QgYmFzZVRzY29uZmlnRmlsZTIgPSByZXF1aXJlLnJlc29sdmUoJy4uL3RzY29uZmlnLXRzeC5qc29uJyk7XG4gICAgLy8gbG9nLmluZm8oJ1VzZSB0c2NvbmZpZyBmaWxlOicsIGJhc2VUc2NvbmZpZ0ZpbGUyKTtcbiAgICBjb25zdCB0c3hUc2NvbmZpZyA9IHBhcnNlQ29uZmlnRmlsZVRvSnNvbih0cywgYmFzZVRzY29uZmlnRmlsZTIpO1xuICAgIGJhc2VDb21waWxlck9wdGlvbnMgPSB0c3hUc2NvbmZpZy5jb21waWxlck9wdGlvbnM7XG4gICAgLy8gYmFzZUNvbXBpbGVyT3B0aW9ucyA9IHsuLi5iYXNlQ29tcGlsZXJPcHRpb25zLCAuLi50c3hUc2NvbmZpZy5jb25maWcuY29tcGlsZXJPcHRpb25zfTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBiYXNlVHNjb25maWdGaWxlID0gcmVxdWlyZS5yZXNvbHZlKCcuLi90c2NvbmZpZy1iYXNlLmpzb24nKTtcbiAgICBjb25zdCBiYXNlVHNjb25maWcgPSBwYXJzZUNvbmZpZ0ZpbGVUb0pzb24odHMsIGJhc2VUc2NvbmZpZ0ZpbGUpO1xuICAgIC8vIGxvZy5pbmZvKCdVc2UgdHNjb25maWcgZmlsZTonLCBiYXNlVHNjb25maWdGaWxlKTtcbiAgICBiYXNlQ29tcGlsZXJPcHRpb25zID0gYmFzZVRzY29uZmlnLmNvbXBpbGVyT3B0aW9ucztcbiAgfVxuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50XG4gIGNvbnN0IGNvbXBpbGVyT3B0aW9uczogUmVjb3JkPHN0cmluZywgYW55PiA9IHtcbiAgICAuLi5iYXNlQ29tcGlsZXJPcHRpb25zLFxuICAgIHRhcmdldDogJ0VTMjAxNycsXG4gICAgaW1wb3J0SGVscGVyczogZmFsc2UsXG4gICAgZGVjbGFyYXRpb246IHRydWUsXG4gICAgLy8gbW9kdWxlOiAnRVNOZXh0JyxcbiAgICAvKipcbiAgICAgKiBmb3IgZ3VscC1zb3VyY2VtYXBzIHVzYWdlOlxuICAgICAqICBJZiB5b3Ugc2V0IHRoZSBvdXREaXIgb3B0aW9uIHRvIHRoZSBzYW1lIHZhbHVlIGFzIHRoZSBkaXJlY3RvcnkgaW4gZ3VscC5kZXN0LCB5b3Ugc2hvdWxkIHNldCB0aGUgc291cmNlUm9vdCB0byAuLy5cbiAgICAgKi9cbiAgICBvdXREaXI6ICcnLFxuICAgIHJvb3REaXI6ICcnLFxuICAgIHNraXBMaWJDaGVjazogdHJ1ZSxcbiAgICBpbmxpbmVTb3VyY2VNYXAsXG4gICAgc291cmNlTWFwOiBpbmxpbmVTb3VyY2VNYXAsXG4gICAgaW5saW5lU291cmNlczogaW5saW5lU291cmNlTWFwLFxuICAgIGVtaXREZWNsYXJhdGlvbk9ubHksXG4gICAgcHJlc2VydmVTeW1saW5rczogdHJ1ZVxuICB9O1xuICByZXR1cm4gY29tcGlsZXJPcHRpb25zO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdHJhbnNwaWxlU2luZ2xlRmlsZShjb250ZW50OiBzdHJpbmcsIGZpbGVOYW1lOiBzdHJpbmcsIHRzID0gcmVxdWlyZSgndHlwZXNjcmlwdCcpIGFzIHR5cGVvZiBfdHMpIHtcbiAgY29uc3Qge291dHB1dFRleHQsIGRpYWdub3N0aWNzLCBzb3VyY2VNYXBUZXh0fSA9IHRzLnRyYW5zcGlsZU1vZHVsZShjb250ZW50LCB7XG4gICAgY29tcGlsZXJPcHRpb25zOiB7Li4ucGxpbmtOb2RlSnNDb21waWxlck9wdGlvbih0cyksIGlzb2xhdGVkTW9kdWxlczogdHJ1ZX1cbiAgfSk7XG5cbiAgcmV0dXJuIHtcbiAgICBvdXRwdXRUZXh0LFxuICAgIHNvdXJjZU1hcFRleHQsXG4gICAgZGlhZ25vc3RpY3MsXG4gICAgZGlhZ25vc3RpY3NUZXh0OiBkaWFnbm9zdGljc1xuICB9O1xufVxuXG4iXX0=