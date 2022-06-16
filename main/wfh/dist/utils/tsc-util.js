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
const chokidar_1 = __importDefault(require("chokidar"));
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
    changeSourceFile(file) { },
    onEmitFailure(file, diagnostics) { },
    _emitFile(file, content) { },
    stop() { }
};
function languageServices(globs, ts = typescript_1.default, opts = {}) {
    const ts0 = ts;
    const { dispatcher, action$, ofType } = (0, rx_utils_1.createActionStream)(langServiceActionCreator, true);
    const store = new rx.BehaviorSubject({
        versions: new Map(),
        files: new Set()
    });
    function setState(cb) {
        store.next(cb(store.getValue()));
    }
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
            return store.getValue().versions.get(fileName) + '' || '-1';
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
    const stop$ = action$.pipe(ofType('stop'));
    let watcher;
    rx.merge(addSourceFile$.pipe(op.map(({ payload: [fileName, content] }) => {
        setState(s => {
            s.files.add(fileName);
            s.versions.set(fileName, 0);
            return s;
        });
        // TODO: debounce
        getEmitFile(fileName);
    })), changeSourceFile$.pipe(op.map(({ payload: [fileName, content] }) => {
        setState(s => {
            const version = s.versions.get(fileName);
            s.versions.set(fileName, (version != null ? version : 0) + 1);
            return s;
        });
    })), new rx.Observable(sub => {
        if (watcher == null)
            watcher = chokidar_1.default.watch(globs, opts.watcher);
        watcher.on('change', path => dispatcher.changeSourceFile(path));
        return () => {
            void watcher.close().then(() => {
                // eslint-disable-next-line no-console
                console.log('[tsc-util] chokidar watcher stops');
            });
        };
    })).pipe(op.takeUntil(stop$), op.catchError((err, src) => {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNjLXV0aWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy90c2MtdXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDRDQUFvQjtBQUNwQiw0REFBNkI7QUFDN0IscUNBQXFDO0FBQ3JDLHlDQUEyQjtBQUMzQixtREFBcUM7QUFDckMsd0RBQWdDO0FBQ2hDLDJHQUErRjtBQUMvRix1RkFBNEY7QUFDNUYsMEZBQTBGO0FBQzFGLGdEQUFxRDtBQWlCckQsTUFBTSxPQUFPLEdBQUc7SUFDZCxXQUFXLENBQUMsRUFBYyxFQUFFLEdBQUcsS0FBd0MsSUFBRyxDQUFDO0lBQzNFLGtCQUFrQixDQUFDLEVBQWMsRUFBRSxLQUFhLEVBQUUsbUJBQTRCLElBQUcsQ0FBQztJQUNsRixrQkFBa0IsQ0FBQyxFQUFjLEVBQUUsV0FBMkIsSUFBRyxDQUFDO0lBQ2xFLGlCQUFpQixDQUFDLEVBQWMsRUFBRSxXQUEyQixJQUFHLENBQUM7Q0FDbEUsQ0FBQztBQVNGLFNBQWdCLEtBQUssQ0FBQyxTQUFtQixFQUFFLGVBQTRDLEVBQUUsT0FBZ0I7SUFDdkcsSUFBSSxFQUFFLFNBQVM7SUFDZixFQUFFLEVBQUUsT0FBTyxDQUFDLFlBQVksQ0FBZTtDQUN4QztJQUNDLE1BQU0sRUFBQyxnQkFBZ0IsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUMsR0FBRyxJQUFBLGdDQUFXLEVBQUM7UUFDbkYsSUFBSSxFQUFFLGNBQWM7UUFDcEIsWUFBWSxFQUFFLEVBQWdCO1FBQzlCLFFBQVEsRUFBRSxPQUFPO0tBQ2xCLENBQUMsQ0FBQztJQUVILE1BQU0sVUFBVSxHQUE4QjtRQUM1QyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsd0JBQXdCLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQztRQUNyRSxtQkFBbUIsRUFBRSxvQkFBRyxDQUFDLEdB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LDhDQUE4QztZQUM5QyxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsdUJBQXVCLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDNUQsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1lBQy9ELFVBQVUsQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLEdBQUcsUUFBUSxFQUFFLEdBQUcsWUFBWSxDQUFDLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQztTQUMxSDtRQUVELE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQzdCLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkMsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsT0FBTyxVQUFVLENBQUM7QUFDcEIsQ0FBQztBQTlHRCw0Q0E4R0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IF90cyBmcm9tICd0eXBlc2NyaXB0Jztcbi8vIGltcG9ydCBpbnNwZWN0b3IgZnJvbSAnaW5zcGVjdG9yJztcbmltcG9ydCAqIGFzIHJ4IGZyb20gJ3J4anMnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuaW1wb3J0IGNob2tpZGFyIGZyb20gJ2Nob2tpZGFyJztcbmltcG9ydCB7Y3JlYXRlU2xpY2V9IGZyb20gJy4uLy4uLy4uL3BhY2thZ2VzL3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZS9kaXN0L3RpbnktcmVkdXgtdG9vbGtpdCc7XG5pbXBvcnQge2NyZWF0ZUFjdGlvblN0cmVhbX0gZnJvbSAnLi4vLi4vLi4vcGFja2FnZXMvcmVkdXgtdG9vbGtpdC1vYnNlcnZhYmxlL2Rpc3QvcngtdXRpbHMnO1xuLy8gaW1wb3J0IHtjcmVhdGVBY3Rpb25TdHJlYW19IGZyb20gJy4uLy4uLy4uL3BhY2thZ2VzL3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZS9yeC11dGlscyc7XG5pbXBvcnQge3BhcnNlQ29uZmlnRmlsZVRvSnNvbn0gZnJvbSAnLi4vdHMtY21kLXV0aWwnO1xuXG4vLyBpbnNwZWN0b3Iub3Blbig5MjIyLCAnbG9jYWxob3N0JywgdHJ1ZSk7XG5cbmV4cG9ydCB0eXBlIFdhdGNoU3RhdHVzQ2hhbmdlID0ge1xuICB0eXBlOiAnd2F0Y2hTdGF0dXNDaGFuZ2UnO1xuICBwYXlsb2FkOiBfdHMuRGlhZ25vc3RpYztcbn07XG5cbmV4cG9ydCB0eXBlIE9uV3JpdGVGaWxlID0ge1xuICB0eXBlOiAnb25Xcml0ZUZpbGUnO1xufTtcblxudHlwZSBXYXRjaFN0YXRlID0ge1xuICBlcnJvcj86IEVycm9yO1xufTtcblxuY29uc3QgYWN0aW9ucyA9IHtcbiAgb25Xcml0ZUZpbGUoX3M6IFdhdGNoU3RhdGUsIC4uLl9hcmdzOiBQYXJhbWV0ZXJzPF90cy5Xcml0ZUZpbGVDYWxsYmFjaz4pIHt9LFxuICBvbkRpYWdub3N0aWNTdHJpbmcoX3M6IFdhdGNoU3RhdGUsIF90ZXh0OiBzdHJpbmcsIF9pc1dhdGNoU3RhdGVDaGFuZ2U6IGJvb2xlYW4pIHt9LFxuICBfd2F0Y2hTdGF0dXNDaGFuZ2UoX3M6IFdhdGNoU3RhdGUsIF9kaWFnbm9zdGljOiBfdHMuRGlhZ25vc3RpYykge30sXG4gIF9yZXBvcnREaWFnbm9zdGljKF9zOiBXYXRjaFN0YXRlLCBfZGlhZ25vc3RpYzogX3RzLkRpYWdub3N0aWMpIHt9XG59O1xuXG5leHBvcnQgdHlwZSBPcHRpb25zID0ge1xuICB0czogdHlwZW9mIF90cztcbiAgbW9kZTogJ3dhdGNoJyB8ICdjb21waWxlJztcbiAgZm9ybWF0RGlhZ25vc3RpY0ZpbGVOYW1lPyhwYXRoOiBzdHJpbmcpOiBzdHJpbmc7XG4gIHRyYW5zZm9ybVNyY0ZpbGU/KGZpbGU6IHN0cmluZywgY29udGVudDogc3RyaW5nLCBlbmNvZGluZz86IHN0cmluZyk6IHN0cmluZyB8IG51bGwgfCB1bmRlZmluZWQ7XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gd2F0Y2gocm9vdEZpbGVzOiBzdHJpbmdbXSwganNvbkNvbXBpbGVyT3B0PzogUmVjb3JkPHN0cmluZywgYW55PiB8IG51bGwsIG9wdHM6IE9wdGlvbnMgPSB7XG4gIG1vZGU6ICdjb21waWxlJyxcbiAgdHM6IHJlcXVpcmUoJ3R5cGVzY3JpcHQnKSBhcyB0eXBlb2YgX3RzXG59KSB7XG4gIGNvbnN0IHthY3Rpb25EaXNwYXRjaGVyOiBkaXNwYXRjaGVyLCBhZGRFcGljLCBhY3Rpb24kQnlUeXBlLCBnZXRTdGF0ZX0gPSBjcmVhdGVTbGljZSh7XG4gICAgbmFtZTogJ3dhdGNoQ29udG9ybCcsXG4gICAgaW5pdGlhbFN0YXRlOiB7fSBhcyBXYXRjaFN0YXRlLFxuICAgIHJlZHVjZXJzOiBhY3Rpb25zXG4gIH0pO1xuXG4gIGNvbnN0IGZvcm1hdEhvc3Q6IF90cy5Gb3JtYXREaWFnbm9zdGljc0hvc3QgPSB7XG4gICAgZ2V0Q2Fub25pY2FsRmlsZU5hbWU6IG9wdHMuZm9ybWF0RGlhZ25vc3RpY0ZpbGVOYW1lIHx8IChwYXRoID0+IHBhdGgpLFxuICAgIGdldEN1cnJlbnREaXJlY3Rvcnk6IF90cy5zeXMuZ2V0Q3VycmVudERpcmVjdG9yeSxcbiAgICBnZXROZXdMaW5lOiAoKSA9PiBfdHMuc3lzLm5ld0xpbmVcbiAgfTtcblxuICBjb25zdCB0cyA9IG9wdHMudHMgfHwgcmVxdWlyZSgndHlwZXNjcmlwdCcpO1xuICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLXVuc2FmZS1hc3NpZ25tZW50XG4gIGNvbnN0IGNvbXBpbGVyT3B0aW9ucyA9IHRzLnBhcnNlSnNvbkNvbmZpZ0ZpbGVDb250ZW50KHtjb21waWxlck9wdGlvbnM6IGpzb25Db21waWxlck9wdCB8fCBwbGlua05vZGVKc0NvbXBpbGVyT3B0aW9uKHRzLCB7anN4OiB0cnVlfSl9LCB0cy5zeXMsXG4gICAgcHJvY2Vzcy5jd2QoKS5yZXBsYWNlKC9cXFxcL2csICcvJyksXG4gICAgdW5kZWZpbmVkLCAndHNjb25maWcuanNvbicpLm9wdGlvbnM7XG5cbiAgY29uc3QgcHJvZ3JhbUhvc3QgPSB0cy5jcmVhdGVXYXRjaENvbXBpbGVySG9zdChcbiAgICByb290RmlsZXMsIGNvbXBpbGVyT3B0aW9ucywgdHMuc3lzLFxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9taWNyb3NvZnQvVHlwZVNjcmlwdC93aWtpL1VzaW5nLXRoZS1Db21waWxlci1BUElcbiAgICAvLyBUeXBlU2NyaXB0IGNhbiB1c2Ugc2V2ZXJhbCBkaWZmZXJlbnQgcHJvZ3JhbSBjcmVhdGlvbiBcInN0cmF0ZWdpZXNcIjpcbiAgICAvLyAgKiB0cy5jcmVhdGVFbWl0QW5kU2VtYW50aWNEaWFnbm9zdGljc0J1aWxkZXJQcm9ncmFtLFxuICAgIC8vICAqIHRzLmNyZWF0ZVNlbWFudGljRGlhZ25vc3RpY3NCdWlsZGVyUHJvZ3JhbVxuICAgIC8vICAqIHRzLmNyZWF0ZUFic3RyYWN0QnVpbGRlclxuICAgIC8vIFRoZSBmaXJzdCB0d28gcHJvZHVjZSBcImJ1aWxkZXIgcHJvZ3JhbXNcIi4gVGhlc2UgdXNlIGFuIGluY3JlbWVudGFsIHN0cmF0ZWd5XG4gICAgLy8gdG8gb25seSByZS1jaGVjayBhbmQgZW1pdCBmaWxlcyB3aG9zZSBjb250ZW50cyBtYXkgaGF2ZSBjaGFuZ2VkLCBvciB3aG9zZVxuICAgIC8vIGRlcGVuZGVuY2llcyBtYXkgaGF2ZSBjaGFuZ2VzIHdoaWNoIG1heSBpbXBhY3QgY2hhbmdlIHRoZSByZXN1bHQgb2YgcHJpb3JcbiAgICAvLyB0eXBlLWNoZWNrIGFuZCBlbWl0LlxuICAgIC8vIFRoZSBsYXN0IHVzZXMgYW4gb3JkaW5hcnkgcHJvZ3JhbSB3aGljaCBkb2VzIGEgZnVsbCB0eXBlIGNoZWNrIGFmdGVyIGV2ZXJ5XG4gICAgLy8gY2hhbmdlLlxuICAgIC8vIEJldHdlZW4gYGNyZWF0ZUVtaXRBbmRTZW1hbnRpY0RpYWdub3N0aWNzQnVpbGRlclByb2dyYW1gIGFuZFxuICAgIC8vIGBjcmVhdGVTZW1hbnRpY0RpYWdub3N0aWNzQnVpbGRlclByb2dyYW1gLCB0aGUgb25seSBkaWZmZXJlbmNlIGlzIGVtaXQuXG4gICAgLy8gRm9yIHB1cmUgdHlwZS1jaGVja2luZyBzY2VuYXJpb3MsIG9yIHdoZW4gYW5vdGhlciB0b29sL3Byb2Nlc3MgaGFuZGxlcyBlbWl0LFxuICAgIC8vIHVzaW5nIGBjcmVhdGVTZW1hbnRpY0RpYWdub3N0aWNzQnVpbGRlclByb2dyYW1gIG1heSBiZSBtb3JlIGRlc2lyYWJsZVxuICAgIHRzLmNyZWF0ZUVtaXRBbmRTZW1hbnRpY0RpYWdub3N0aWNzQnVpbGRlclByb2dyYW0sIGRpc3BhdGNoZXIuX3JlcG9ydERpYWdub3N0aWMsIGRpc3BhdGNoZXIuX3dhdGNoU3RhdHVzQ2hhbmdlKTtcbiAgaWYgKG9wdHMudHJhbnNmb3JtU3JjRmlsZSlcbiAgICBwYXRjaFdhdGNoQ29tcGlsZXJIb3N0KHByb2dyYW1Ib3N0LCBvcHRzLnRyYW5zZm9ybVNyY0ZpbGUpO1xuXG4gIGNvbnN0IG9yaWdDcmVhdGVQcm9ncmFtID0gcHJvZ3JhbUhvc3QuY3JlYXRlUHJvZ3JhbTtcbiAgLy8gVHMncyBjcmVhdGVXYXRjaFByb2dyYW0gd2lsbCBjYWxsIFdhdGNoQ29tcGlsZXJIb3N0LmNyZWF0ZVByb2dyYW0oKSwgdGhpcyBpcyB3aGVyZSB3ZSBwYXRjaCBcIkNvbXBpbGVySG9zdFwiXG4gIHByb2dyYW1Ib3N0LmNyZWF0ZVByb2dyYW0gPSBmdW5jdGlvbihyb290TmFtZXM6IHJlYWRvbmx5IHN0cmluZ1tdIHwgdW5kZWZpbmVkLCBvcHRpb25zOiBfdHMuQ29tcGlsZXJPcHRpb25zIHwgdW5kZWZpbmVkLFxuICAgIGhvc3Q/OiBfdHMuQ29tcGlsZXJIb3N0LCAuLi5yZXN0OiBhbnlbXSkge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLW1lbWJlci1hY2Nlc3NcbiAgICBpZiAoaG9zdCAmJiAoaG9zdCBhcyBhbnkpLl9vdmVycmlkZWQgPT0gbnVsbCkge1xuICAgICAgcGF0Y2hDb21waWxlckhvc3QoaG9zdCwgZGlzcGF0Y2hlci5vbldyaXRlRmlsZSk7XG4gICAgfVxuICAgIGNvbnN0IHByb2dyYW0gPSBvcmlnQ3JlYXRlUHJvZ3JhbS5jYWxsKHRoaXMsIHJvb3ROYW1lcywgb3B0aW9ucywgaG9zdCwgLi4ucmVzdCkgO1xuICAgIHJldHVybiBwcm9ncmFtO1xuICB9O1xuXG4gIHRzLmNyZWF0ZVdhdGNoUHJvZ3JhbShwcm9ncmFtSG9zdCk7XG4gIGFkZEVwaWMoX3NsaWNlID0+IF9hY3Rpb24kID0+IHtcbiAgICByZXR1cm4gcngubWVyZ2UoXG4gICAgICBhY3Rpb24kQnlUeXBlLl9yZXBvcnREaWFnbm9zdGljLnBpcGUoXG4gICAgICAgIG9wLm1hcCgoe3BheWxvYWQ6IGRpYWdub3N0aWN9KSA9PiB7XG4gICAgICAgICAgZGlzcGF0Y2hlci5vbkRpYWdub3N0aWNTdHJpbmcodHMuZm9ybWF0RGlhZ25vc3RpY3NXaXRoQ29sb3JBbmRDb250ZXh0KFtkaWFnbm9zdGljXSwgZm9ybWF0SG9zdCksIGZhbHNlKTtcbiAgICAgICAgfSlcbiAgICAgICksXG4gICAgICBhY3Rpb24kQnlUeXBlLl93YXRjaFN0YXR1c0NoYW5nZS5waXBlKFxuICAgICAgICBvcC5tYXAoKHtwYXlsb2FkOiBkaWFnbm9zdGljfSkgPT4ge1xuICAgICAgICAgIGRpc3BhdGNoZXIub25EaWFnbm9zdGljU3RyaW5nKHRzLmZvcm1hdERpYWdub3N0aWNzV2l0aENvbG9yQW5kQ29udGV4dChbZGlhZ25vc3RpY10sIGZvcm1hdEhvc3QpLCB0cnVlKTtcbiAgICAgICAgfSlcbiAgICAgIClcbiAgICApLnBpcGUoXG4gICAgICBvcC5pZ25vcmVFbGVtZW50cygpXG4gICAgKTtcbiAgfSk7XG5cbiAgaWYgKGdldFN0YXRlKCkuZXJyb3IpIHtcbiAgICB0aHJvdyBnZXRTdGF0ZSgpLmVycm9yO1xuICB9XG5cbiAgcmV0dXJuIGFjdGlvbiRCeVR5cGU7XG59XG5cbmZ1bmN0aW9uIHBhdGNoV2F0Y2hDb21waWxlckhvc3QoaG9zdDogX3RzLldhdGNoQ29tcGlsZXJIb3N0T2ZGaWxlc0FuZENvbXBpbGVyT3B0aW9uczxfdHMuRW1pdEFuZFNlbWFudGljRGlhZ25vc3RpY3NCdWlsZGVyUHJvZ3JhbT4gfCBfdHMuQ29tcGlsZXJIb3N0LFxuICB0cmFuc2Zvcm06IE5vbk51bGxhYmxlPE9wdGlvbnNbJ3RyYW5zZm9ybVNyY0ZpbGUnXT4pIHtcbiAgY29uc3QgcmVhZEZpbGUgPSBob3N0LnJlYWRGaWxlO1xuXG4gIGhvc3QucmVhZEZpbGUgPSBmdW5jdGlvbihwYXRoOiBzdHJpbmcsIGVuY29kaW5nPzogc3RyaW5nKSB7XG4gICAgY29uc3QgY29udGVudCA9IHJlYWRGaWxlLmNhbGwodGhpcywgcGF0aCwgZW5jb2RpbmcpIDtcbiAgICBpZiAoY29udGVudCkge1xuICAgICAgY29uc3QgY2hhbmdlZCA9IHRyYW5zZm9ybShwYXRoLCBjb250ZW50LCBlbmNvZGluZyk7XG4gICAgICBpZiAoY2hhbmdlZCAhPSBudWxsICYmIGNoYW5nZWQgIT09IGNvbnRlbnQpIHtcbiAgICAgICAgcmV0dXJuIGNoYW5nZWQ7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiBjb250ZW50O1xuICB9O1xufVxuXG5mdW5jdGlvbiBwYXRjaENvbXBpbGVySG9zdChob3N0OiBfdHMuQ29tcGlsZXJIb3N0LFxuICB3cml0ZTogX3RzLldyaXRlRmlsZUNhbGxiYWNrKSB7XG4gIC8vIEl0IHNlZW1zIHRvIG5vdCBhYmxlIHRvIHdyaXRlIGZpbGUgdGhyb3VnaCBzeW1saW5rIGluIFdpbmRvd3NcbiAgLy8gY29uc3QgX3dyaXRlRmlsZSA9IGhvc3Qud3JpdGVGaWxlO1xuICBob3N0LndyaXRlRmlsZSA9IHdyaXRlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGxpbmtOb2RlSnNDb21waWxlck9wdGlvbihcbiAgdHM6IHR5cGVvZiBfdHMsXG4gIG9wdHM6IHtqc3g/OiBib29sZWFuOyBpbmxpbmVTb3VyY2VNYXA/OiBib29sZWFuOyBlbWl0RGVjbGFyYXRpb25Pbmx5PzogYm9vbGVhbn0gPSB7fVxuKSB7XG4gIGNvbnN0IHtqc3ggPSBmYWxzZSwgaW5saW5lU291cmNlTWFwID0gdHJ1ZSwgZW1pdERlY2xhcmF0aW9uT25seSA9IGZhbHNlfSA9IG9wdHM7XG4gIGxldCBiYXNlQ29tcGlsZXJPcHRpb25zOiBhbnk7XG4gIGlmIChqc3gpIHtcbiAgICBjb25zdCBiYXNlVHNjb25maWdGaWxlMiA9IHJlcXVpcmUucmVzb2x2ZSgnLi4vdHNjb25maWctdHN4Lmpzb24nKTtcbiAgICAvLyBsb2cuaW5mbygnVXNlIHRzY29uZmlnIGZpbGU6JywgYmFzZVRzY29uZmlnRmlsZTIpO1xuICAgIGNvbnN0IHRzeFRzY29uZmlnID0gcGFyc2VDb25maWdGaWxlVG9Kc29uKHRzLCBiYXNlVHNjb25maWdGaWxlMik7XG4gICAgYmFzZUNvbXBpbGVyT3B0aW9ucyA9IHRzeFRzY29uZmlnLmNvbXBpbGVyT3B0aW9ucztcbiAgICAvLyBiYXNlQ29tcGlsZXJPcHRpb25zID0gey4uLmJhc2VDb21waWxlck9wdGlvbnMsIC4uLnRzeFRzY29uZmlnLmNvbmZpZy5jb21waWxlck9wdGlvbnN9O1xuICB9IGVsc2Uge1xuICAgIGNvbnN0IGJhc2VUc2NvbmZpZ0ZpbGUgPSByZXF1aXJlLnJlc29sdmUoJy4uLy4uL3RzY29uZmlnLWJhc2UuanNvbicpO1xuICAgIGNvbnN0IGJhc2VUc2NvbmZpZyA9IHBhcnNlQ29uZmlnRmlsZVRvSnNvbih0cywgYmFzZVRzY29uZmlnRmlsZSk7XG4gICAgLy8gbG9nLmluZm8oJ1VzZSB0c2NvbmZpZyBmaWxlOicsIGJhc2VUc2NvbmZpZ0ZpbGUpO1xuICAgIGJhc2VDb21waWxlck9wdGlvbnMgPSBiYXNlVHNjb25maWcuY29tcGlsZXJPcHRpb25zO1xuICB9XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnRcbiAgY29uc3QgY29tcGlsZXJPcHRpb25zOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0ge1xuICAgIC4uLmJhc2VDb21waWxlck9wdGlvbnMsXG4gICAgdGFyZ2V0OiAnRVMyMDE3JyxcbiAgICBpbXBvcnRIZWxwZXJzOiBmYWxzZSxcbiAgICBkZWNsYXJhdGlvbjogdHJ1ZSxcbiAgICAvLyBtb2R1bGU6ICdFU05leHQnLFxuICAgIC8qKlxuICAgICAqIGZvciBndWxwLXNvdXJjZW1hcHMgdXNhZ2U6XG4gICAgICogIElmIHlvdSBzZXQgdGhlIG91dERpciBvcHRpb24gdG8gdGhlIHNhbWUgdmFsdWUgYXMgdGhlIGRpcmVjdG9yeSBpbiBndWxwLmRlc3QsIHlvdSBzaG91bGQgc2V0IHRoZSBzb3VyY2VSb290IHRvIC4vLlxuICAgICAqL1xuICAgIG91dERpcjogJycsXG4gICAgcm9vdERpcjogJycsXG4gICAgc2tpcExpYkNoZWNrOiB0cnVlLFxuICAgIGlubGluZVNvdXJjZU1hcCxcbiAgICBzb3VyY2VNYXA6IGlubGluZVNvdXJjZU1hcCxcbiAgICBpbmxpbmVTb3VyY2VzOiBpbmxpbmVTb3VyY2VNYXAsXG4gICAgZW1pdERlY2xhcmF0aW9uT25seSxcbiAgICBwcmVzZXJ2ZVN5bWxpbmtzOiB0cnVlXG4gIH07XG4gIHJldHVybiBjb21waWxlck9wdGlvbnM7XG59XG5cbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnRcbmV4cG9ydCBmdW5jdGlvbiB0cmFuc3BpbGVTaW5nbGVGaWxlKGNvbnRlbnQ6IHN0cmluZywgdHM6IGFueSA9IF90cykge1xuICBjb25zdCB7b3V0cHV0VGV4dCwgZGlhZ25vc3RpY3MsIHNvdXJjZU1hcFRleHR9ID0gKHRzIGFzIHR5cGVvZiBfdHMpXG4gICAgLnRyYW5zcGlsZU1vZHVsZShjb250ZW50LCB7XG4gICAgICBjb21waWxlck9wdGlvbnM6IHsuLi5wbGlua05vZGVKc0NvbXBpbGVyT3B0aW9uKHRzKSwgaXNvbGF0ZWRNb2R1bGVzOiB0cnVlLCBpbmxpbmVTb3VyY2VNYXA6IGZhbHNlfVxuICAgIH0pO1xuXG4gIHJldHVybiB7XG4gICAgb3V0cHV0VGV4dCxcbiAgICBzb3VyY2VNYXBUZXh0LFxuICAgIGRpYWdub3N0aWNzLFxuICAgIGRpYWdub3N0aWNzVGV4dDogZGlhZ25vc3RpY3NcbiAgfTtcbn1cblxuY29uc3QgbGFuZ1NlcnZpY2VBY3Rpb25DcmVhdG9yID0ge1xuICBhZGRTb3VyY2VGaWxlKGZpbGU6IHN0cmluZywgY29udGVudDogc3RyaW5nKSB7fSxcbiAgY2hhbmdlU291cmNlRmlsZShmaWxlOiBzdHJpbmcpIHt9LFxuICBvbkVtaXRGYWlsdXJlKGZpbGU6IHN0cmluZywgZGlhZ25vc3RpY3M6IHN0cmluZykge30sXG4gIF9lbWl0RmlsZShmaWxlOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZykge30sXG4gIHN0b3AoKSB7fVxufTtcblxudHlwZSBMYW5nU2VydmljZVN0YXRlID0ge1xuICB2ZXJzaW9uczogTWFwPHN0cmluZywgbnVtYmVyPjtcbiAgLyoqIHJvb3QgZmlsZXMgKi9cbiAgZmlsZXM6IFNldDxzdHJpbmc+O1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGxhbmd1YWdlU2VydmljZXMoZ2xvYnM6IHN0cmluZ1tdLCB0czogYW55ID0gX3RzLCBvcHRzOiB7XG4gIGZvcm1hdERpYWdub3N0aWNGaWxlTmFtZT8ocGF0aDogc3RyaW5nKTogc3RyaW5nO1xuICB3YXRjaGVyPzogY2hva2lkYXIuV2F0Y2hPcHRpb25zO1xufSA9IHt9KSB7XG4gIGNvbnN0IHRzMCA9IHRzIGFzIHR5cGVvZiBfdHM7XG4gIGNvbnN0IHtkaXNwYXRjaGVyLCBhY3Rpb24kLCBvZlR5cGV9ID0gY3JlYXRlQWN0aW9uU3RyZWFtKGxhbmdTZXJ2aWNlQWN0aW9uQ3JlYXRvciwgdHJ1ZSk7XG4gIGNvbnN0IHN0b3JlID0gbmV3IHJ4LkJlaGF2aW9yU3ViamVjdDxMYW5nU2VydmljZVN0YXRlPih7XG4gICAgdmVyc2lvbnM6IG5ldyBNYXAoKSxcbiAgICBmaWxlczogbmV3IFNldCgpXG4gIH0pO1xuXG4gIGZ1bmN0aW9uIHNldFN0YXRlKGNiOiAoY3VycjogTGFuZ1NlcnZpY2VTdGF0ZSkgPT4gTGFuZ1NlcnZpY2VTdGF0ZSkge1xuICAgIHN0b3JlLm5leHQoY2Ioc3RvcmUuZ2V0VmFsdWUoKSkpO1xuICB9XG5cbiAgY29uc3QgZm9ybWF0SG9zdDogX3RzLkZvcm1hdERpYWdub3N0aWNzSG9zdCA9IHtcbiAgICBnZXRDYW5vbmljYWxGaWxlTmFtZTogb3B0cy5mb3JtYXREaWFnbm9zdGljRmlsZU5hbWUgfHwgKHBhdGggPT4gcGF0aCksXG4gICAgZ2V0Q3VycmVudERpcmVjdG9yeTogX3RzLnN5cy5nZXRDdXJyZW50RGlyZWN0b3J5LFxuICAgIGdldE5ld0xpbmU6ICgpID0+IF90cy5zeXMubmV3TGluZVxuICB9O1xuXG4gIGNvbnN0IHNlcnZpY2VIb3N0OiBfdHMuTGFuZ3VhZ2VTZXJ2aWNlSG9zdCA9IHtcbiAgICBnZXRTY3JpcHRGaWxlTmFtZXMoKSB7XG4gICAgICByZXR1cm4gQXJyYXkuZnJvbShzdG9yZS5nZXRWYWx1ZSgpLmZpbGVzLnZhbHVlcygpKTtcbiAgICB9LFxuICAgIGdldFNjcmlwdFZlcnNpb24oZmlsZU5hbWU6IHN0cmluZykge1xuICAgICAgcmV0dXJuIHN0b3JlLmdldFZhbHVlKCkudmVyc2lvbnMuZ2V0KGZpbGVOYW1lKSArICcnIHx8ICctMSc7XG4gICAgfSxcbiAgICBnZXRDb21waWxhdGlvblNldHRpbmdzKCkge1xuICAgICAgcmV0dXJuIHsuLi5wbGlua05vZGVKc0NvbXBpbGVyT3B0aW9uKHRzMCksIGlzb2xhdGVkTW9kdWxlczogdHJ1ZSwgaW5saW5lU291cmNlTWFwOiBmYWxzZX07XG4gICAgfSxcbiAgICBnZXRTY3JpcHRTbmFwc2hvdChmaWxlTmFtZTogc3RyaW5nKSB7XG4gICAgICBpZiAoIWZzLmV4aXN0c1N5bmMoZmlsZU5hbWUpKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiB0czAuU2NyaXB0U25hcHNob3QuZnJvbVN0cmluZyhmcy5yZWFkRmlsZVN5bmMoZmlsZU5hbWUpLnRvU3RyaW5nKCkpO1xuICAgIH0sXG4gICAgZ2V0Q3VycmVudERpcmVjdG9yeTogKCkgPT4gcHJvY2Vzcy5jd2QoKSxcblxuICAgIGdldERlZmF1bHRMaWJGaWxlTmFtZTogb3B0aW9ucyA9PiB0czAuZ2V0RGVmYXVsdExpYkZpbGVQYXRoKG9wdGlvbnMpXG4gIH07XG4gIGNvbnN0IGRvY3VtZW50UmVnaXN0cnkgPSB0czAuY3JlYXRlRG9jdW1lbnRSZWdpc3RyeSgpO1xuICBjb25zdCBzZXJ2aWNlcyA9IHRzMC5jcmVhdGVMYW5ndWFnZVNlcnZpY2Uoc2VydmljZUhvc3QsIGRvY3VtZW50UmVnaXN0cnkpO1xuICBjb25zdCBhZGRTb3VyY2VGaWxlJCA9IGFjdGlvbiQucGlwZShvZlR5cGUoJ2FkZFNvdXJjZUZpbGUnKSk7XG4gIGNvbnN0IGNoYW5nZVNvdXJjZUZpbGUkID0gYWN0aW9uJC5waXBlKG9mVHlwZSgnY2hhbmdlU291cmNlRmlsZScpKTtcbiAgY29uc3Qgc3RvcCQgPSBhY3Rpb24kLnBpcGUob2ZUeXBlKCdzdG9wJykpO1xuXG4gIGxldCB3YXRjaGVyOiBSZXR1cm5UeXBlPHR5cGVvZiBjaG9raWRhci53YXRjaD47XG5cbiAgcngubWVyZ2UoXG4gICAgYWRkU291cmNlRmlsZSQucGlwZShcbiAgICAgIG9wLm1hcCgoe3BheWxvYWQ6IFtmaWxlTmFtZSwgY29udGVudF19KSA9PiB7XG4gICAgICAgIHNldFN0YXRlKHMgPT4ge1xuICAgICAgICAgIHMuZmlsZXMuYWRkKGZpbGVOYW1lKTtcbiAgICAgICAgICBzLnZlcnNpb25zLnNldChmaWxlTmFtZSwgMCk7XG4gICAgICAgICAgcmV0dXJuIHM7XG4gICAgICAgIH0pO1xuICAgICAgICAvLyBUT0RPOiBkZWJvdW5jZVxuICAgICAgICBnZXRFbWl0RmlsZShmaWxlTmFtZSk7XG4gICAgICB9KVxuICAgICksXG4gICAgY2hhbmdlU291cmNlRmlsZSQucGlwZShcbiAgICAgIG9wLm1hcCgoe3BheWxvYWQ6IFtmaWxlTmFtZSwgY29udGVudF19KSA9PiB7XG4gICAgICAgIHNldFN0YXRlKHMgPT4ge1xuICAgICAgICAgIGNvbnN0IHZlcnNpb24gPSBzLnZlcnNpb25zLmdldChmaWxlTmFtZSk7XG4gICAgICAgICAgcy52ZXJzaW9ucy5zZXQoZmlsZU5hbWUsICh2ZXJzaW9uICE9IG51bGwgPyB2ZXJzaW9uIDogMCkgKyAxKTtcbiAgICAgICAgICByZXR1cm4gcztcbiAgICAgICAgfSk7XG4gICAgICB9KVxuICAgICksXG5cbiAgICBuZXcgcnguT2JzZXJ2YWJsZTxuZXZlcj4oc3ViID0+IHtcbiAgICAgIGlmICh3YXRjaGVyID09IG51bGwpXG4gICAgICAgIHdhdGNoZXIgPSBjaG9raWRhci53YXRjaChnbG9icywgb3B0cy53YXRjaGVyKTtcblxuICAgICAgd2F0Y2hlci5vbignY2hhbmdlJywgcGF0aCA9PiBkaXNwYXRjaGVyLmNoYW5nZVNvdXJjZUZpbGUocGF0aCkpO1xuICAgICAgcmV0dXJuICgpID0+IHtcbiAgICAgICAgdm9pZCB3YXRjaGVyLmNsb3NlKCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICBjb25zb2xlLmxvZygnW3RzYy11dGlsXSBjaG9raWRhciB3YXRjaGVyIHN0b3BzJyk7XG4gICAgICAgIH0pO1xuICAgICAgfTtcbiAgICB9KVxuICApLnBpcGUoXG4gICAgb3AudGFrZVVudGlsKHN0b3AkKSxcbiAgICBvcC5jYXRjaEVycm9yKChlcnIsIHNyYykgPT4ge1xuICAgICAgY29uc29sZS5lcnJvcignTGFuZ3VhZ2Ugc2VydmljZSBlcnJvcicsIGVycik7XG4gICAgICByZXR1cm4gc3JjO1xuICAgIH0pXG4gICkuc3Vic2NyaWJlKCk7XG5cbiAgZnVuY3Rpb24gZ2V0RW1pdEZpbGUoZmlsZU5hbWU6IHN0cmluZykge1xuICAgIGNvbnN0IG91dHB1dCA9IHNlcnZpY2VzLmdldEVtaXRPdXRwdXQoZmlsZU5hbWUpO1xuXG4gICAgaWYgKCFvdXRwdXQuZW1pdFNraXBwZWQpIHtcbiAgICAgIC8vIGNvbnNvbGUubG9nKGBFbWl0dGluZyAke2ZpbGVOYW1lfWApO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBjb25zb2xlLmxvZyhgRW1pdHRpbmcgJHtmaWxlTmFtZX0gZmFpbGVkYCk7XG4gICAgICBjb25zdCBzeW50RGlhZyA9IHNlcnZpY2VzLmdldFN5bnRhY3RpY0RpYWdub3N0aWNzKGZpbGVOYW1lKTtcbiAgICAgIGNvbnN0IHNlbWFudGljRGlhZyA9IHNlcnZpY2VzLmdldFNlbWFudGljRGlhZ25vc3RpY3MoZmlsZU5hbWUpO1xuICAgICAgZGlzcGF0Y2hlci5vbkVtaXRGYWlsdXJlKGZpbGVOYW1lLCB0czAuZm9ybWF0RGlhZ25vc3RpY3NXaXRoQ29sb3JBbmRDb250ZXh0KFsuLi5zeW50RGlhZywgLi4uc2VtYW50aWNEaWFnXSwgZm9ybWF0SG9zdCkpO1xuICAgIH1cblxuICAgIG91dHB1dC5vdXRwdXRGaWxlcy5mb3JFYWNoKG8gPT4ge1xuICAgICAgZGlzcGF0Y2hlci5fZW1pdEZpbGUoby5uYW1lLCBvLnRleHQpO1xuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIGRpc3BhdGNoZXI7XG59XG5cbiJdfQ==