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
exports.languageServices = exports.transpileSingleFile = exports.plinkNodeJsCompilerOption = exports.watch = void 0;
const fs_1 = __importDefault(require("fs"));
const typescript_1 = __importDefault(require("typescript"));
// import inspector from 'inspector';
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const tiny_redux_toolkit_1 = require("../../../packages/redux-toolkit-observable/dist/tiny-redux-toolkit");
const rx_utils_1 = require("../../../packages/redux-toolkit-observable/dist/rx-utils");
// import {createActionStream} from '../../../packages/redux-toolkit-observable/rx-utils';
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
    const programHost = ts.createWatchCompilerHost(rootFiles, compilerOptions, ts.sys, 
    // https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API
    // TypeScript can use several different program creation "strategies":
    //  * ts.createEmitAndSemanticDiagnosticsBuilderProgram,
    //  * ts.createSemanticDiagnosticsBuilderProgram
    //  * ts.createAbstractBuilder
    // The first two produce "builder programs". These use an incremental strategy
    // to only re-check and emit files whose contents may have changed, or whose
    // dependencies may have changes which may impact change the result of prior
    // type-check and emit.
    // The last uses an ordinary program which does a full type check after every
    // change.
    // Between `createEmitAndSemanticDiagnosticsBuilderProgram` and
    // `createSemanticDiagnosticsBuilderProgram`, the only difference is emit.
    // For pure type-checking scenarios, or when another tool/process handles emit,
    // using `createSemanticDiagnosticsBuilderProgram` may be more desirable
    ts.createEmitAndSemanticDiagnosticsBuilderProgram, dispatcher._reportDiagnostic, dispatcher._watchStatusChange);
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
        const baseTsconfigFile = require.resolve('../../tsconfig-base.json');
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
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
function transpileSingleFile(content, ts = typescript_1.default) {
    const { outputText, diagnostics, sourceMapText } = ts
        .transpileModule(content, {
        compilerOptions: Object.assign(Object.assign({}, plinkNodeJsCompilerOption(ts)), { isolatedModules: true, inlineSourceMap: false })
    });
    return {
        outputText,
        sourceMapText,
        diagnostics,
        diagnosticsText: diagnostics
    };
}
exports.transpileSingleFile = transpileSingleFile;
const langServiceActionCreator = {
    addSourceFile(file, content) { },
    changeSourceFile(file, content) { },
    onEmitFailure(file, diagnostics) { },
    _emitFile(file, content) { }
};
function languageServices(ts = typescript_1.default, opts = {}) {
    const ts0 = ts;
    const { dispatcher, action$, ofType } = (0, rx_utils_1.createActionStream)(langServiceActionCreator, true);
    const store = new rx.BehaviorSubject({
        versions: new Map(),
        files: new Set()
    });
    const formatHost = {
        getCanonicalFileName: opts.formatDiagnosticFileName || (path => path),
        getCurrentDirectory: typescript_1.default.sys.getCurrentDirectory,
        getNewLine: () => typescript_1.default.sys.newLine
    };
    const serviceHost = {
        getScriptFileNames() {
            return Array.from(store.getValue().files.values());
        },
        getScriptVersion(fileName) {
            return store.getValue().versions.get(fileName) || '-1';
        },
        getCompilationSettings() {
            return Object.assign(Object.assign({}, plinkNodeJsCompilerOption(ts0)), { isolatedModules: true, inlineSourceMap: false });
        },
        getScriptSnapshot(fileName) {
            if (!fs_1.default.existsSync(fileName)) {
                return undefined;
            }
            return ts0.ScriptSnapshot.fromString(fs_1.default.readFileSync(fileName).toString());
        },
        getCurrentDirectory: () => process.cwd(),
        getDefaultLibFileName: options => ts0.getDefaultLibFilePath(options)
    };
    const documentRegistry = ts0.createDocumentRegistry();
    const services = ts0.createLanguageService(serviceHost, documentRegistry);
    const addSourceFile$ = action$.pipe(ofType('addSourceFile'));
    const changeSourceFile$ = action$.pipe(ofType('changeSourceFile'));
    rx.merge(addSourceFile$.pipe(op.map(({ payload: [fileName, content] }) => {
        getEmitFile(fileName);
    })), changeSourceFile$.pipe()).pipe(op.catchError((err, src) => {
        console.error('Language service error', err);
        return src;
    })).subscribe();
    function getEmitFile(fileName) {
        const output = services.getEmitOutput(fileName);
        if (!output.emitSkipped) {
            // console.log(`Emitting ${fileName}`);
        }
        else {
            // console.log(`Emitting ${fileName} failed`);
            const syntDiag = services.getSyntacticDiagnostics(fileName);
            const semanticDiag = services.getSemanticDiagnostics(fileName);
            dispatcher.onEmitFailure(fileName, ts0.formatDiagnosticsWithColorAndContext([...syntDiag, ...semanticDiag], formatHost));
        }
        output.outputFiles.forEach(o => {
            dispatcher._emitFile(o.name, o.text);
        });
    }
    return dispatcher;
}
exports.languageServices = languageServices;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNjLXV0aWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy90c2MtdXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDRDQUFvQjtBQUNwQiw0REFBNkI7QUFDN0IscUNBQXFDO0FBQ3JDLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMsMkdBQStGO0FBQy9GLHVGQUE0RjtBQUM1RiwwRkFBMEY7QUFDMUYsZ0RBQXFEO0FBaUJyRCxNQUFNLE9BQU8sR0FBRztJQUNkLFdBQVcsQ0FBQyxFQUFjLEVBQUUsR0FBRyxLQUF3QyxJQUFHLENBQUM7SUFDM0Usa0JBQWtCLENBQUMsRUFBYyxFQUFFLEtBQWEsRUFBRSxtQkFBNEIsSUFBRyxDQUFDO0lBQ2xGLGtCQUFrQixDQUFDLEVBQWMsRUFBRSxXQUEyQixJQUFHLENBQUM7SUFDbEUsaUJBQWlCLENBQUMsRUFBYyxFQUFFLFdBQTJCLElBQUcsQ0FBQztDQUNsRSxDQUFDO0FBU0YsU0FBZ0IsS0FBSyxDQUFDLFNBQW1CLEVBQUUsZUFBNEMsRUFBRSxPQUFnQjtJQUN2RyxJQUFJLEVBQUUsU0FBUztJQUNmLEVBQUUsRUFBRSxPQUFPLENBQUMsWUFBWSxDQUFlO0NBQ3hDO0lBQ0MsTUFBTSxFQUFDLGdCQUFnQixFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLFFBQVEsRUFBQyxHQUFHLElBQUEsZ0NBQVcsRUFBQztRQUNuRixJQUFJLEVBQUUsY0FBYztRQUNwQixZQUFZLEVBQUUsRUFBZ0I7UUFDOUIsUUFBUSxFQUFFLE9BQU87S0FDbEIsQ0FBQyxDQUFDO0lBRUgsTUFBTSxVQUFVLEdBQThCO1FBQzVDLG9CQUFvQixFQUFFLElBQUksQ0FBQyx3QkFBd0IsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDO1FBQ3JFLG1CQUFtQixFQUFFLG9CQUFHLENBQUMsR0FBRyxDQUFDLG1CQUFt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UUFDdkMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBQ0QsT0FBTyxVQUFVLENBQUM7QUFDcEIsQ0FBQztBQXhFRCw0Q0F3RUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IF90cyBmcm9tICd0eXBlc2NyaXB0Jztcbi8vIGltcG9ydCBpbnNwZWN0b3IgZnJvbSAnaW5zcGVjdG9yJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IHtjcmVhdGVTbGljZX0gZnJvbSAnLi4vLi4vLi4vcGFja2FnZXMvcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlL2Rpc3QvdGlueS1yZWR1eC10b29sa2l0JztcbmltcG9ydCB7Y3JlYXRlQWN0aW9uU3RyZWFtfSBmcm9tICcuLi8uLi8uLi9wYWNrYWdlcy9yZWR1eC10b29sa2l0LW9ic2VydmFibGUvZGlzdC9yeC11dGlscyc7XG4vLyBpbXBvcnQge2NyZWF0ZUFjdGlvblN0cmVhbX0gZnJvbSAnLi4vLi4vLi4vcGFja2FnZXMvcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlL3J4LXV0aWxzJztcbmltcG9ydCB7cGFyc2VDb25maWdGaWxlVG9Kc29ufSBmcm9tICcuLi90cy1jbWQtdXRpbCc7XG5cbi8vIGluc3BlY3Rvci5vcGVuKDkyMjIsICdsb2NhbGhvc3QnLCB0cnVlKTtcblxuZXhwb3J0IHR5cGUgV2F0Y2hTdGF0dXNDaGFuZ2UgPSB7XG4gIHR5cGU6ICd3YXRjaFN0YXR1c0NoYW5nZSc7XG4gIHBheWxvYWQ6IF90cy5EaWFnbm9zdGljO1xufTtcblxuZXhwb3J0IHR5cGUgT25Xcml0ZUZpbGUgPSB7XG4gIHR5cGU6ICdvbldyaXRlRmlsZSc7XG59O1xuXG50eXBlIFdhdGNoU3RhdGUgPSB7XG4gIGVycm9yPzogRXJyb3I7XG59O1xuXG5jb25zdCBhY3Rpb25zID0ge1xuICBvbldyaXRlRmlsZShfczogV2F0Y2hTdGF0ZSwgLi4uX2FyZ3M6IFBhcmFtZXRlcnM8X3RzLldyaXRlRmlsZUNhbGxiYWNrPikge30sXG4gIG9uRGlhZ25vc3RpY1N0cmluZyhfczogV2F0Y2hTdGF0ZSwgX3RleHQ6IHN0cmluZywgX2lzV2F0Y2hTdGF0ZUNoYW5nZTogYm9vbGVhbikge30sXG4gIF93YXRjaFN0YXR1c0NoYW5nZShfczogV2F0Y2hTdGF0ZSwgX2RpYWdub3N0aWM6IF90cy5EaWFnbm9zdGljKSB7fSxcbiAgX3JlcG9ydERpYWdub3N0aWMoX3M6IFdhdGNoU3RhdGUsIF9kaWFnbm9zdGljOiBfdHMuRGlhZ25vc3RpYykge31cbn07XG5cbmV4cG9ydCB0eXBlIE9wdGlvbnMgPSB7XG4gIHRzOiB0eXBlb2YgX3RzO1xuICBtb2RlOiAnd2F0Y2gnIHwgJ2NvbXBpbGUnO1xuICBmb3JtYXREaWFnbm9zdGljRmlsZU5hbWU/KHBhdGg6IHN0cmluZyk6IHN0cmluZztcbiAgdHJhbnNmb3JtU3JjRmlsZT8oZmlsZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcsIGVuY29kaW5nPzogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB8IHVuZGVmaW5lZDtcbn07XG5cbmV4cG9ydCBmdW5jdGlvbiB3YXRjaChyb290RmlsZXM6IHN0cmluZ1tdLCBqc29uQ29tcGlsZXJPcHQ/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+IHwgbnVsbCwgb3B0czogT3B0aW9ucyA9IHtcbiAgbW9kZTogJ2NvbXBpbGUnLFxuICB0czogcmVxdWlyZSgndHlwZXNjcmlwdCcpIGFzIHR5cGVvZiBfdHNcbn0pIHtcbiAgY29uc3Qge2FjdGlvbkRpc3BhdGNoZXI6IGRpc3BhdGNoZXIsIGFkZEVwaWMsIGFjdGlvbiRCeVR5cGUsIGdldFN0YXRlfSA9IGNyZWF0ZVNsaWNlKHtcbiAgICBuYW1lOiAnd2F0Y2hDb250b3JsJyxcbiAgICBpbml0aWFsU3RhdGU6IHt9IGFzIFdhdGNoU3RhdGUsXG4gICAgcmVkdWNlcnM6IGFjdGlvbnNcbiAgfSk7XG5cbiAgY29uc3QgZm9ybWF0SG9zdDogX3RzLkZvcm1hdERpYWdub3N0aWNzSG9zdCA9IHtcbiAgICBnZXRDYW5vbmljYWxGaWxlTmFtZTogb3B0cy5mb3JtYXREaWFnbm9zdGljRmlsZU5hbWUgfHwgKHBhdGggPT4gcGF0aCksXG4gICAgZ2V0Q3VycmVudERpcmVjdG9yeTogX3RzLnN5cy5nZXRDdXJyZW50RGlyZWN0b3J5LFxuICAgIGdldE5ld0xpbmU6ICgpID0+IF90cy5zeXMubmV3TGluZVxuICB9O1xuXG4gIGNvbnN0IHRzID0gb3B0cy50cyB8fCByZXF1aXJlKCd0eXBlc2NyaXB0Jyk7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnRcbiAgY29uc3QgY29tcGlsZXJPcHRpb25zID0gdHMucGFyc2VKc29uQ29uZmlnRmlsZUNvbnRlbnQoe2NvbXBpbGVyT3B0aW9uczoganNvbkNvbXBpbGVyT3B0IHx8IHBsaW5rTm9kZUpzQ29tcGlsZXJPcHRpb24odHMsIHtqc3g6IHRydWV9KX0sIHRzLnN5cyxcbiAgICBwcm9jZXNzLmN3ZCgpLnJlcGxhY2UoL1xcXFwvZywgJy8nKSxcbiAgICB1bmRlZmluZWQsICd0c2NvbmZpZy5qc29uJykub3B0aW9ucztcblxuICBjb25zdCBwcm9ncmFtSG9zdCA9IHRzLmNyZWF0ZVdhdGNoQ29tcGlsZXJIb3N0KFxuICAgIHJvb3RGaWxlcywgY29tcGlsZXJPcHRpb25zLCB0cy5zeXMsXG4gICAgLy8gaHR0cHM6Ly9naXRodWIuY29tL21pY3Jvc29mdC9UeXBlU2NyaXB0L3dpa2kvVXNpbmctdGhlLUNvbXBpbGVyLUFQSVxuICAgIC8vIFR5cGVTY3JpcHQgY2FuIHVzZSBzZXZlcmFsIGRpZmZlcmVudCBwcm9ncmFtIGNyZWF0aW9uIFwic3RyYXRlZ2llc1wiOlxuICAgIC8vICAqIHRzLmNyZWF0ZUVtaXRBbmRTZW1hbnRpY0RpYWdub3N0aWNzQnVpbGRlclByb2dyYW0sXG4gICAgLy8gICogdHMuY3JlYXRlU2VtYW50aWNEaWFnbm9zdGljc0J1aWxkZXJQcm9ncmFtXG4gICAgLy8gICogdHMuY3JlYXRlQWJzdHJhY3RCdWlsZGVyXG4gICAgLy8gVGhlIGZpcnN0IHR3byBwcm9kdWNlIFwiYnVpbGRlciBwcm9ncmFtc1wiLiBUaGVzZSB1c2UgYW4gaW5jcmVtZW50YWwgc3RyYXRlZ3lcbiAgICAvLyB0byBvbmx5IHJlLWNoZWNrIGFuZCBlbWl0IGZpbGVzIHdob3NlIGNvbnRlbnRzIG1heSBoYXZlIGNoYW5nZWQsIG9yIHdob3NlXG4gICAgLy8gZGVwZW5kZW5jaWVzIG1heSBoYXZlIGNoYW5nZXMgd2hpY2ggbWF5IGltcGFjdCBjaGFuZ2UgdGhlIHJlc3VsdCBvZiBwcmlvclxuICAgIC8vIHR5cGUtY2hlY2sgYW5kIGVtaXQuXG4gICAgLy8gVGhlIGxhc3QgdXNlcyBhbiBvcmRpbmFyeSBwcm9ncmFtIHdoaWNoIGRvZXMgYSBmdWxsIHR5cGUgY2hlY2sgYWZ0ZXIgZXZlcnlcbiAgICAvLyBjaGFuZ2UuXG4gICAgLy8gQmV0d2VlbiBgY3JlYXRlRW1pdEFuZFNlbWFudGljRGlhZ25vc3RpY3NCdWlsZGVyUHJvZ3JhbWAgYW5kXG4gICAgLy8gYGNyZWF0ZVNlbWFudGljRGlhZ25vc3RpY3NCdWlsZGVyUHJvZ3JhbWAsIHRoZSBvbmx5IGRpZmZlcmVuY2UgaXMgZW1pdC5cbiAgICAvLyBGb3IgcHVyZSB0eXBlLWNoZWNraW5nIHNjZW5hcmlvcywgb3Igd2hlbiBhbm90aGVyIHRvb2wvcHJvY2VzcyBoYW5kbGVzIGVtaXQsXG4gICAgLy8gdXNpbmcgYGNyZWF0ZVNlbWFudGljRGlhZ25vc3RpY3NCdWlsZGVyUHJvZ3JhbWAgbWF5IGJlIG1vcmUgZGVzaXJhYmxlXG4gICAgdHMuY3JlYXRlRW1pdEFuZFNlbWFudGljRGlhZ25vc3RpY3NCdWlsZGVyUHJvZ3JhbSwgZGlzcGF0Y2hlci5fcmVwb3J0RGlhZ25vc3RpYywgZGlzcGF0Y2hlci5fd2F0Y2hTdGF0dXNDaGFuZ2UpO1xuICBpZiAob3B0cy50cmFuc2Zvcm1TcmNGaWxlKVxuICAgIHBhdGNoV2F0Y2hDb21waWxlckhvc3QocHJvZ3JhbUhvc3QsIG9wdHMudHJhbnNmb3JtU3JjRmlsZSk7XG5cbiAgY29uc3Qgb3JpZ0NyZWF0ZVByb2dyYW0gPSBwcm9ncmFtSG9zdC5jcmVhdGVQcm9ncmFtO1xuICAvLyBUcydzIGNyZWF0ZVdhdGNoUHJvZ3JhbSB3aWxsIGNhbGwgV2F0Y2hDb21waWxlckhvc3QuY3JlYXRlUHJvZ3JhbSgpLCB0aGlzIGlzIHdoZXJlIHdlIHBhdGNoIFwiQ29tcGlsZXJIb3N0XCJcbiAgcHJvZ3JhbUhvc3QuY3JlYXRlUHJvZ3JhbSA9IGZ1bmN0aW9uKHJvb3ROYW1lczogcmVhZG9ubHkgc3RyaW5nW10gfCB1bmRlZmluZWQsIG9wdGlvbnM6IF90cy5Db21waWxlck9wdGlvbnMgfCB1bmRlZmluZWQsXG4gICAgaG9zdD86IF90cy5Db21waWxlckhvc3QsIC4uLnJlc3Q6IGFueVtdKSB7XG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtbWVtYmVyLWFjY2Vzc1xuICAgIGlmIChob3N0ICYmIChob3N0IGFzIGFueSkuX292ZXJyaWRlZCA9PSBudWxsKSB7XG4gICAgICBwYXRjaENvbXBpbGVySG9zdChob3N0LCBkaXNwYXRjaGVyLm9uV3JpdGVGaWxlKTtcbiAgICB9XG4gICAgY29uc3QgcHJvZ3JhbSA9IG9yaWdDcmVhdGVQcm9ncmFtLmNhbGwodGhpcywgcm9vdE5hbWVzLCBvcHRpb25zLCBob3N0LCAuLi5yZXN0KSA7XG4gICAgcmV0dXJuIHByb2dyYW07XG4gIH07XG5cbiAgdHMuY3JlYXRlV2F0Y2hQcm9ncmFtKHByb2dyYW1Ib3N0KTtcbiAgYWRkRXBpYyhfc2xpY2UgPT4gX2FjdGlvbiQgPT4ge1xuICAgIHJldHVybiByeC5tZXJnZShcbiAgICAgIGFjdGlvbiRCeVR5cGUuX3JlcG9ydERpYWdub3N0aWMucGlwZShcbiAgICAgICAgb3AubWFwKCh7cGF5bG9hZDogZGlhZ25vc3RpY30pID0+IHtcbiAgICAgICAgICBkaXNwYXRjaGVyLm9uRGlhZ25vc3RpY1N0cmluZyh0cy5mb3JtYXREaWFnbm9zdGljc1dpdGhDb2xvckFuZENvbnRleHQoW2RpYWdub3N0aWNdLCBmb3JtYXRIb3N0KSwgZmFsc2UpO1xuICAgICAgICB9KVxuICAgICAgKSxcbiAgICAgIGFjdGlvbiRCeVR5cGUuX3dhdGNoU3RhdHVzQ2hhbmdlLnBpcGUoXG4gICAgICAgIG9wLm1hcCgoe3BheWxvYWQ6IGRpYWdub3N0aWN9KSA9PiB7XG4gICAgICAgICAgZGlzcGF0Y2hlci5vbkRpYWdub3N0aWNTdHJpbmcodHMuZm9ybWF0RGlhZ25vc3RpY3NXaXRoQ29sb3JBbmRDb250ZXh0KFtkaWFnbm9zdGljXSwgZm9ybWF0SG9zdCksIHRydWUpO1xuICAgICAgICB9KVxuICAgICAgKVxuICAgICkucGlwZShcbiAgICAgIG9wLmlnbm9yZUVsZW1lbnRzKClcbiAgICApO1xuICB9KTtcblxuICBpZiAoZ2V0U3RhdGUoKS5lcnJvcikge1xuICAgIHRocm93IGdldFN0YXRlKCkuZXJyb3I7XG4gIH1cblxuICByZXR1cm4gYWN0aW9uJEJ5VHlwZTtcbn1cblxuZnVuY3Rpb24gcGF0Y2hXYXRjaENvbXBpbGVySG9zdChob3N0OiBfdHMuV2F0Y2hDb21waWxlckhvc3RPZkZpbGVzQW5kQ29tcGlsZXJPcHRpb25zPF90cy5FbWl0QW5kU2VtYW50aWNEaWFnbm9zdGljc0J1aWxkZXJQcm9ncmFtPiB8IF90cy5Db21waWxlckhvc3QsXG4gIHRyYW5zZm9ybTogTm9uTnVsbGFibGU8T3B0aW9uc1sndHJhbnNmb3JtU3JjRmlsZSddPikge1xuICBjb25zdCByZWFkRmlsZSA9IGhvc3QucmVhZEZpbGU7XG5cbiAgaG9zdC5yZWFkRmlsZSA9IGZ1bmN0aW9uKHBhdGg6IHN0cmluZywgZW5jb2Rpbmc/OiBzdHJpbmcpIHtcbiAgICBjb25zdCBjb250ZW50ID0gcmVhZEZpbGUuY2FsbCh0aGlzLCBwYXRoLCBlbmNvZGluZykgO1xuICAgIGlmIChjb250ZW50KSB7XG4gICAgICBjb25zdCBjaGFuZ2VkID0gdHJhbnNmb3JtKHBhdGgsIGNvbnRlbnQsIGVuY29kaW5nKTtcbiAgICAgIGlmIChjaGFuZ2VkICE9IG51bGwgJiYgY2hhbmdlZCAhPT0gY29udGVudCkge1xuICAgICAgICByZXR1cm4gY2hhbmdlZDtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGNvbnRlbnQ7XG4gIH07XG59XG5cbmZ1bmN0aW9uIHBhdGNoQ29tcGlsZXJIb3N0KGhvc3Q6IF90cy5Db21waWxlckhvc3QsXG4gIHdyaXRlOiBfdHMuV3JpdGVGaWxlQ2FsbGJhY2spIHtcbiAgLy8gSXQgc2VlbXMgdG8gbm90IGFibGUgdG8gd3JpdGUgZmlsZSB0aHJvdWdoIHN5bWxpbmsgaW4gV2luZG93c1xuICAvLyBjb25zdCBfd3JpdGVGaWxlID0gaG9zdC53cml0ZUZpbGU7XG4gIGhvc3Qud3JpdGVGaWxlID0gd3JpdGU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwbGlua05vZGVKc0NvbXBpbGVyT3B0aW9uKFxuICB0czogdHlwZW9mIF90cyxcbiAgb3B0czoge2pzeD86IGJvb2xlYW47IGlubGluZVNvdXJjZU1hcD86IGJvb2xlYW47IGVtaXREZWNsYXJhdGlvbk9ubHk/OiBib29sZWFufSA9IHt9XG4pIHtcbiAgY29uc3Qge2pzeCA9IGZhbHNlLCBpbmxpbmVTb3VyY2VNYXAgPSB0cnVlLCBlbWl0RGVjbGFyYXRpb25Pbmx5ID0gZmFsc2V9ID0gb3B0cztcbiAgbGV0IGJhc2VDb21waWxlck9wdGlvbnM6IGFueTtcbiAgaWYgKGpzeCkge1xuICAgIGNvbnN0IGJhc2VUc2NvbmZpZ0ZpbGUyID0gcmVxdWlyZS5yZXNvbHZlKCcuLi90c2NvbmZpZy10c3guanNvbicpO1xuICAgIC8vIGxvZy5pbmZvKCdVc2UgdHNjb25maWcgZmlsZTonLCBiYXNlVHNjb25maWdGaWxlMik7XG4gICAgY29uc3QgdHN4VHNjb25maWcgPSBwYXJzZUNvbmZpZ0ZpbGVUb0pzb24odHMsIGJhc2VUc2NvbmZpZ0ZpbGUyKTtcbiAgICBiYXNlQ29tcGlsZXJPcHRpb25zID0gdHN4VHNjb25maWcuY29tcGlsZXJPcHRpb25zO1xuICAgIC8vIGJhc2VDb21waWxlck9wdGlvbnMgPSB7Li4uYmFzZUNvbXBpbGVyT3B0aW9ucywgLi4udHN4VHNjb25maWcuY29uZmlnLmNvbXBpbGVyT3B0aW9uc307XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgYmFzZVRzY29uZmlnRmlsZSA9IHJlcXVpcmUucmVzb2x2ZSgnLi4vLi4vdHNjb25maWctYmFzZS5qc29uJyk7XG4gICAgY29uc3QgYmFzZVRzY29uZmlnID0gcGFyc2VDb25maWdGaWxlVG9Kc29uKHRzLCBiYXNlVHNjb25maWdGaWxlKTtcbiAgICAvLyBsb2cuaW5mbygnVXNlIHRzY29uZmlnIGZpbGU6JywgYmFzZVRzY29uZmlnRmlsZSk7XG4gICAgYmFzZUNvbXBpbGVyT3B0aW9ucyA9IGJhc2VUc2NvbmZpZy5jb21waWxlck9wdGlvbnM7XG4gIH1cbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudFxuICBjb25zdCBjb21waWxlck9wdGlvbnM6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7XG4gICAgLi4uYmFzZUNvbXBpbGVyT3B0aW9ucyxcbiAgICB0YXJnZXQ6ICdFUzIwMTcnLFxuICAgIGltcG9ydEhlbHBlcnM6IGZhbHNlLFxuICAgIGRlY2xhcmF0aW9uOiB0cnVlLFxuICAgIC8vIG1vZHVsZTogJ0VTTmV4dCcsXG4gICAgLyoqXG4gICAgICogZm9yIGd1bHAtc291cmNlbWFwcyB1c2FnZTpcbiAgICAgKiAgSWYgeW91IHNldCB0aGUgb3V0RGlyIG9wdGlvbiB0byB0aGUgc2FtZSB2YWx1ZSBhcyB0aGUgZGlyZWN0b3J5IGluIGd1bHAuZGVzdCwgeW91IHNob3VsZCBzZXQgdGhlIHNvdXJjZVJvb3QgdG8gLi8uXG4gICAgICovXG4gICAgb3V0RGlyOiAnJyxcbiAgICByb290RGlyOiAnJyxcbiAgICBza2lwTGliQ2hlY2s6IHRydWUsXG4gICAgaW5saW5lU291cmNlTWFwLFxuICAgIHNvdXJjZU1hcDogaW5saW5lU291cmNlTWFwLFxuICAgIGlubGluZVNvdXJjZXM6IGlubGluZVNvdXJjZU1hcCxcbiAgICBlbWl0RGVjbGFyYXRpb25Pbmx5LFxuICAgIHByZXNlcnZlU3ltbGlua3M6IHRydWVcbiAgfTtcbiAgcmV0dXJuIGNvbXBpbGVyT3B0aW9ucztcbn1cblxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudFxuZXhwb3J0IGZ1bmN0aW9uIHRyYW5zcGlsZVNpbmdsZUZpbGUoY29udGVudDogc3RyaW5nLCB0czogYW55ID0gX3RzKSB7XG4gIGNvbnN0IHtvdXRwdXRUZXh0LCBkaWFnbm9zdGljcywgc291cmNlTWFwVGV4dH0gPSAodHMgYXMgdHlwZW9mIF90cylcbiAgICAudHJhbnNwaWxlTW9kdWxlKGNvbnRlbnQsIHtcbiAgICAgIGNvbXBpbGVyT3B0aW9uczogey4uLnBsaW5rTm9kZUpzQ29tcGlsZXJPcHRpb24odHMpLCBpc29sYXRlZE1vZHVsZXM6IHRydWUsIGlubGluZVNvdXJjZU1hcDogZmFsc2V9XG4gICAgfSk7XG5cbiAgcmV0dXJuIHtcbiAgICBvdXRwdXRUZXh0LFxuICAgIHNvdXJjZU1hcFRleHQsXG4gICAgZGlhZ25vc3RpY3MsXG4gICAgZGlhZ25vc3RpY3NUZXh0OiBkaWFnbm9zdGljc1xuICB9O1xufVxuXG5jb25zdCBsYW5nU2VydmljZUFjdGlvbkNyZWF0b3IgPSB7XG4gIGFkZFNvdXJjZUZpbGUoZmlsZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpIHt9LFxuICBjaGFuZ2VTb3VyY2VGaWxlKGZpbGU6IHN0cmluZywgY29udGVudDogc3RyaW5nKSB7fSxcbiAgb25FbWl0RmFpbHVyZShmaWxlOiBzdHJpbmcsIGRpYWdub3N0aWNzOiBzdHJpbmcpIHt9LFxuICBfZW1pdEZpbGUoZmlsZTogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpIHt9XG59O1xuXG50eXBlIExhbmdTZXJ2aWNlU3RhdGUgPSB7XG4gIHZlcnNpb25zOiBNYXA8c3RyaW5nLCBzdHJpbmc+O1xuICBmaWxlczogU2V0PHN0cmluZz47XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gbGFuZ3VhZ2VTZXJ2aWNlcyh0czogYW55ID0gX3RzLCBvcHRzOiB7XG4gIGZvcm1hdERpYWdub3N0aWNGaWxlTmFtZT8ocGF0aDogc3RyaW5nKTogc3RyaW5nO1xufSA9IHt9KSB7XG4gIGNvbnN0IHRzMCA9IHRzIGFzIHR5cGVvZiBfdHM7XG4gIGNvbnN0IHtkaXNwYXRjaGVyLCBhY3Rpb24kLCBvZlR5cGV9ID0gY3JlYXRlQWN0aW9uU3RyZWFtKGxhbmdTZXJ2aWNlQWN0aW9uQ3JlYXRvciwgdHJ1ZSk7XG4gIGNvbnN0IHN0b3JlID0gbmV3IHJ4LkJlaGF2aW9yU3ViamVjdDxMYW5nU2VydmljZVN0YXRlPih7XG4gICAgdmVyc2lvbnM6IG5ldyBNYXAoKSxcbiAgICBmaWxlczogbmV3IFNldCgpXG4gIH0pO1xuXG4gIGNvbnN0IGZvcm1hdEhvc3Q6IF90cy5Gb3JtYXREaWFnbm9zdGljc0hvc3QgPSB7XG4gICAgZ2V0Q2Fub25pY2FsRmlsZU5hbWU6IG9wdHMuZm9ybWF0RGlhZ25vc3RpY0ZpbGVOYW1lIHx8IChwYXRoID0+IHBhdGgpLFxuICAgIGdldEN1cnJlbnREaXJlY3Rvcnk6IF90cy5zeXMuZ2V0Q3VycmVudERpcmVjdG9yeSxcbiAgICBnZXROZXdMaW5lOiAoKSA9PiBfdHMuc3lzLm5ld0xpbmVcbiAgfTtcblxuICBjb25zdCBzZXJ2aWNlSG9zdDogX3RzLkxhbmd1YWdlU2VydmljZUhvc3QgPSB7XG4gICAgZ2V0U2NyaXB0RmlsZU5hbWVzKCkge1xuICAgICAgcmV0dXJuIEFycmF5LmZyb20oc3RvcmUuZ2V0VmFsdWUoKS5maWxlcy52YWx1ZXMoKSk7XG4gICAgfSxcbiAgICBnZXRTY3JpcHRWZXJzaW9uKGZpbGVOYW1lOiBzdHJpbmcpIHtcbiAgICAgIHJldHVybiBzdG9yZS5nZXRWYWx1ZSgpLnZlcnNpb25zLmdldChmaWxlTmFtZSkgfHwgJy0xJztcbiAgICB9LFxuICAgIGdldENvbXBpbGF0aW9uU2V0dGluZ3MoKSB7XG4gICAgICByZXR1cm4gey4uLnBsaW5rTm9kZUpzQ29tcGlsZXJPcHRpb24odHMwKSwgaXNvbGF0ZWRNb2R1bGVzOiB0cnVlLCBpbmxpbmVTb3VyY2VNYXA6IGZhbHNlfTtcbiAgICB9LFxuICAgIGdldFNjcmlwdFNuYXBzaG90KGZpbGVOYW1lOiBzdHJpbmcpIHtcbiAgICAgIGlmICghZnMuZXhpc3RzU3luYyhmaWxlTmFtZSkpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHRzMC5TY3JpcHRTbmFwc2hvdC5mcm9tU3RyaW5nKGZzLnJlYWRGaWxlU3luYyhmaWxlTmFtZSkudG9TdHJpbmcoKSk7XG4gICAgfSxcbiAgICBnZXRDdXJyZW50RGlyZWN0b3J5OiAoKSA9PiBwcm9jZXNzLmN3ZCgpLFxuXG4gICAgZ2V0RGVmYXVsdExpYkZpbGVOYW1lOiBvcHRpb25zID0+IHRzMC5nZXREZWZhdWx0TGliRmlsZVBhdGgob3B0aW9ucylcbiAgfTtcbiAgY29uc3QgZG9jdW1lbnRSZWdpc3RyeSA9IHRzMC5jcmVhdGVEb2N1bWVudFJlZ2lzdHJ5KCk7XG4gIGNvbnN0IHNlcnZpY2VzID0gdHMwLmNyZWF0ZUxhbmd1YWdlU2VydmljZShzZXJ2aWNlSG9zdCwgZG9jdW1lbnRSZWdpc3RyeSk7XG4gIGNvbnN0IGFkZFNvdXJjZUZpbGUkID0gYWN0aW9uJC5waXBlKG9mVHlwZSgnYWRkU291cmNlRmlsZScpKTtcbiAgY29uc3QgY2hhbmdlU291cmNlRmlsZSQgPSBhY3Rpb24kLnBpcGUob2ZUeXBlKCdjaGFuZ2VTb3VyY2VGaWxlJykpO1xuICByeC5tZXJnZShcbiAgICBhZGRTb3VyY2VGaWxlJC5waXBlKFxuICAgICAgb3AubWFwKCh7cGF5bG9hZDogW2ZpbGVOYW1lLCBjb250ZW50XX0pID0+IHtcbiAgICAgICAgZ2V0RW1pdEZpbGUoZmlsZU5hbWUpO1xuICAgICAgfSlcbiAgICApLFxuICAgIGNoYW5nZVNvdXJjZUZpbGUkLnBpcGUoKVxuICApLnBpcGUoXG4gICAgb3AuY2F0Y2hFcnJvcigoZXJyLCBzcmMpID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0xhbmd1YWdlIHNlcnZpY2UgZXJyb3InLCBlcnIpO1xuICAgICAgcmV0dXJuIHNyYztcbiAgICB9KVxuICApLnN1YnNjcmliZSgpO1xuXG4gIGZ1bmN0aW9uIGdldEVtaXRGaWxlKGZpbGVOYW1lOiBzdHJpbmcpIHtcbiAgICBjb25zdCBvdXRwdXQgPSBzZXJ2aWNlcy5nZXRFbWl0T3V0cHV0KGZpbGVOYW1lKTtcblxuICAgIGlmICghb3V0cHV0LmVtaXRTa2lwcGVkKSB7XG4gICAgICAvLyBjb25zb2xlLmxvZyhgRW1pdHRpbmcgJHtmaWxlTmFtZX1gKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gY29uc29sZS5sb2coYEVtaXR0aW5nICR7ZmlsZU5hbWV9IGZhaWxlZGApO1xuICAgICAgY29uc3Qgc3ludERpYWcgPSBzZXJ2aWNlcy5nZXRTeW50YWN0aWNEaWFnbm9zdGljcyhmaWxlTmFtZSk7XG4gICAgICBjb25zdCBzZW1hbnRpY0RpYWcgPSBzZXJ2aWNlcy5nZXRTZW1hbnRpY0RpYWdub3N0aWNzKGZpbGVOYW1lKTtcbiAgICAgIGRpc3BhdGNoZXIub25FbWl0RmFpbHVyZShmaWxlTmFtZSwgdHMwLmZvcm1hdERpYWdub3N0aWNzV2l0aENvbG9yQW5kQ29udGV4dChbLi4uc3ludERpYWcsIC4uLnNlbWFudGljRGlhZ10sIGZvcm1hdEhvc3QpKTtcbiAgICB9XG5cbiAgICBvdXRwdXQub3V0cHV0RmlsZXMuZm9yRWFjaChvID0+IHtcbiAgICAgIGRpc3BhdGNoZXIuX2VtaXRGaWxlKG8ubmFtZSwgby50ZXh0KTtcbiAgICB9KTtcbiAgfVxuICByZXR1cm4gZGlzcGF0Y2hlcjtcbn1cblxuIl19