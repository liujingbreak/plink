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
exports.test = exports.languageServices = exports.LogLevel = exports.transpileSingleFile = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const typescript_1 = __importDefault(require("typescript"));
// import inspector from 'inspector';
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const chokidar_1 = __importDefault(require("chokidar"));
const rx_utils_1 = require("../../../packages/redux-toolkit-observable/dist/rx-utils");
// import {createActionStream} from '../../../packages/redux-toolkit-observable/rx-utils';
const ts_cmd_util_1 = require("../ts-cmd-util");
function plinkNodeJsCompilerOptionJson(ts, opts = {}) {
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
    const coRootDir = path_1.default.parse(process.cwd()).root;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const compilerOptions = Object.assign(Object.assign({}, baseCompilerOptions), { target: 'ES2017', importHelpers: true, declaration: true, 
        // diagnostics: true,
        // module: 'ESNext',
        /**
         * for gulp-sourcemaps usage:
         *  If you set the outDir option to the same value as the directory in gulp.dest, you should set the sourceRoot to ./.
         */
        outDir: coRootDir, rootDir: coRootDir, skipLibCheck: true, inlineSourceMap, sourceMap: !inlineSourceMap, inlineSources: inlineSourceMap, emitDeclarationOnly, traceResolution: opts.traceResolution, preserveSymlinks: false });
    if (opts.changeCompilerOptions)
        opts.changeCompilerOptions(compilerOptions);
    return compilerOptions;
}
function plinkNodeJsCompilerOption(ts, opts = {}) {
    const json = plinkNodeJsCompilerOptionJson(ts, opts);
    const basePath = (opts.basePath || process.cwd()).replace(/\\/g, '/');
    const { options } = ts.parseJsonConfigFileContent({ compilerOptions: json }, ts.sys, basePath, undefined, path_1.default.resolve(basePath, 'tsconfig-in-memory.json'));
    return options;
}
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
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["trace"] = 0] = "trace";
    LogLevel[LogLevel["log"] = 1] = "log";
    LogLevel[LogLevel["error"] = 2] = "error";
})(LogLevel = exports.LogLevel || (exports.LogLevel = {}));
function languageServices(ts = typescript_1.default, opts = {}) {
    const ts0 = ts;
    const { dispatchFactory, action$, ofType } = (0, rx_utils_1.createActionStreamByType)();
    const store = new rx.BehaviorSubject({
        versions: new Map(),
        files: new Set(),
        unemitted: new Set(),
        isStopped: false
    });
    function setState(cb) {
        store.next(cb(store.getValue()));
    }
    const formatHost = {
        getCanonicalFileName: opts.formatDiagnosticFileName || (path => path),
        getCurrentDirectory: typescript_1.default.sys.getCurrentDirectory,
        getNewLine: () => typescript_1.default.sys.newLine
    };
    const co = plinkNodeJsCompilerOption(ts0, opts.tscOpts);
    const serviceHost = Object.assign(Object.assign({}, ts0.sys), { // Important, default language service host does not implement methods like fileExists
        getScriptFileNames() {
            return Array.from(store.getValue().files.values());
        },
        getScriptVersion(fileName) {
            return store.getValue().versions.get(fileName) + '' || '-1';
        },
        getCompilationSettings() {
            dispatchFactory('onCompilerOptions')(co);
            return co;
        },
        getScriptSnapshot(fileName) {
            if (!fs_1.default.existsSync(fileName)) {
                return undefined;
            }
            const originContent = fs_1.default.readFileSync(fileName).toString();
            return ts0.ScriptSnapshot.fromString(opts.transformSourceFile ? opts.transformSourceFile(fileName, originContent) : originContent);
        },
        getCancellationToken() {
            return {
                isCancellationRequested() {
                    return store.getValue().isStopped;
                }
            };
        },
        useCaseSensitiveFileNames() { return ts0.sys.useCaseSensitiveFileNames; }, getDefaultLibFileName: options => ts0.getDefaultLibFilePath(options), trace(s) {
            dispatchFactory('log')(LogLevel.log, s);
            console.log('[lang-service trace]', s);
        },
        error(s) {
            dispatchFactory('log')(LogLevel.error, s);
            console.log('[lang-service error]', s);
        },
        log(s) {
            dispatchFactory('log')(LogLevel.log, s);
            console.log('[lang-service log]', s);
        } });
    const documentRegistry = ts0.createDocumentRegistry();
    let services;
    const addSourceFile$ = action$.pipe(ofType('addSourceFile'));
    const changeSourceFile$ = action$.pipe(ofType('changeSourceFile'));
    const stop$ = action$.pipe(ofType('stop'));
    let watcher;
    rx.merge(action$.pipe(ofType('watch'), op.exhaustMap(({ payload: dirs }) => new rx.Observable(() => {
        if (watcher == null)
            watcher = chokidar_1.default.watch(dirs.map(dir => dir.replace(/\\/g, '/')), opts.watcher);
        watcher.on('add', path => dispatchFactory('addSourceFile')(path, false));
        watcher.on('change', path => dispatchFactory('changeSourceFile')(path));
        return () => {
            void watcher.close().then(() => {
                // eslint-disable-next-line no-console
                console.log('[tsc-util] chokidar watcher stops');
            });
        };
    }))), addSourceFile$.pipe(op.filter(({ payload: [file] }) => /\.(?:tsx?|json)$/.test(file)), op.map(({ payload: [fileName, sync] }) => {
        setState(s => {
            s.files.add(fileName);
            s.versions.set(fileName, 0);
            return s;
        });
        if (sync)
            getEmitFile(fileName);
        else {
            setState(s => {
                s.unemitted.add(fileName);
                return s;
            });
            return fileName;
        }
    }), op.filter((file) => file != null), op.debounceTime(333), op.map(() => {
        for (const file of store.getValue().unemitted.values()) {
            getEmitFile(file);
        }
        setState(s => {
            s.unemitted.clear();
            return s;
        });
    })), changeSourceFile$.pipe(op.filter(({ payload: file }) => /\.(?:tsx?|json)$/.test(file)), 
    // TODO: debounce on same file changes
    op.map(({ payload: fileName }) => {
        setState(s => {
            const version = s.versions.get(fileName);
            s.versions.set(fileName, (version != null ? version : 0) + 1);
            return s;
        });
        getEmitFile(fileName);
    }))).pipe(op.takeUntil(stop$), op.catchError((err, src) => {
        console.error('Language service error', err);
        return src;
    }), op.finalize(() => {
        setState(s => {
            s.isStopped = true;
            return s;
        });
    })).subscribe();
    function getEmitFile(fileName) {
        if (services == null) {
            services = ts0.createLanguageService(serviceHost, documentRegistry);
            const coDiag = services.getCompilerOptionsDiagnostics();
            if (coDiag.length > 0)
                dispatchFactory('onEmitFailure')(fileName, ts0.formatDiagnosticsWithColorAndContext(coDiag, formatHost), 'compilerOptions');
        }
        const output = services.getEmitOutput(fileName);
        if (output.emitSkipped) {
            // console.log(`Emitting ${fileName} failed`);
        }
        const syntDiag = services.getSyntacticDiagnostics(fileName);
        if (syntDiag.length > 0) {
            dispatchFactory('onEmitFailure')(fileName, ts0.formatDiagnosticsWithColorAndContext(syntDiag, formatHost), 'syntactic');
        }
        const semanticDiag = services.getSemanticDiagnostics(fileName);
        if (semanticDiag.length > 0) {
            dispatchFactory('onEmitFailure')(fileName, ts0.formatDiagnosticsWithColorAndContext(semanticDiag, formatHost), 'semantic');
        }
        const suggests = services.getSuggestionDiagnostics(fileName);
        for (const sug of suggests) {
            const { line, character } = sug.file.getLineAndCharacterOfPosition(sug.start);
            dispatchFactory('onSuggest')(fileName, `${fileName}:${line + 1}:${character + 1} ` +
                ts0.flattenDiagnosticMessageText(sug.messageText, '\n', 2));
        }
        output.outputFiles.forEach(o => {
            dispatchFactory('_emitFile')(o.name, o.text);
        });
    }
    return {
        dispatchFactory, action$, ofType,
        store: store.pipe(op.map(s => s.files))
    };
}
exports.languageServices = languageServices;
function test(dir) {
    const { action$, ofType } = languageServices([dir]);
    action$.pipe(ofType('_emitFile'), 
    // eslint-disable-next-line no-console
    op.map(({ payload: [file] }) => console.log('emit', file))).subscribe();
}
exports.test = test;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNjLXV0aWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy90c2MtdXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsNERBQTZCO0FBQzdCLHFDQUFxQztBQUNyQyx5Q0FBMkI7QUFDM0IsbURBQXFDO0FBQ3JDLHdEQUFnQztBQUNoQyx1RkFBa0c7QUFDbEcsMEZBQTBGO0FBQzFGLGdEQUFxRDtBQVdyRCxTQUFTLDZCQUE2QixDQUNwQyxFQUFjLEVBQ2QsT0FBbUIsRUFBRTtJQUVyQixNQUFNLEVBQUMsR0FBRyxHQUFHLEtBQUssRUFBRSxlQUFlLEdBQUcsSUFBSSxFQUFFLG1CQUFtQixHQUFHLEtBQUssRUFBQyxHQUFHLElBQUksQ0FBQztJQUNoRixJQUFJLG1CQUF3QixDQUFDO0lBQzdCLElBQUksR0FBRyxFQUFFO1FBQ1AsTUFBTSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDbEUscURBQXFEO1FBQ3JELE1BQU0sV0FBVyxHQUFHLElBQUEsbUNBQXFCLEVBQUMsRUFBRSxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDakUsbUJBQW1CLEdBQUcsV0FBVyxDQUFDLGVBQWUsQ0FBQztRQUNsRCx5RkFBeUY7S0FDMUY7U0FBTTtRQUNMLE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBQ3JFLE1BQU0sWUFBWSxHQUFHLElBQUEsbUNBQXFCLEVBQUMsRUFBRSxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDakUsb0RBQW9EO1FBQ3BELG1CQUFtQixHQUFHLFlBQVksQ0FBQyxlQUFlLENBQUM7S0FDcEQ7SUFFRCxNQUFNLFNBQVMsR0FBRyxjQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxD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QUFDO0lBQ2xELE9BQU8sQ0FBQyxJQUFJLENBQ1YsTUFBTSxDQUFDLFdBQVcsQ0FBQztJQUNuQixzQ0FBc0M7SUFDdEMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUMsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FDekQsQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUNoQixDQUFDO0FBUEQsb0JBT0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgX3RzIGZyb20gJ3R5cGVzY3JpcHQnO1xuLy8gaW1wb3J0IGluc3BlY3RvciBmcm9tICdpbnNwZWN0b3InO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgY2hva2lkYXIgZnJvbSAnY2hva2lkYXInO1xuaW1wb3J0IHtjcmVhdGVBY3Rpb25TdHJlYW1CeVR5cGV9IGZyb20gJy4uLy4uLy4uL3BhY2thZ2VzL3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZS9kaXN0L3J4LXV0aWxzJztcbi8vIGltcG9ydCB7Y3JlYXRlQWN0aW9uU3RyZWFtfSBmcm9tICcuLi8uLi8uLi9wYWNrYWdlcy9yZWR1eC10b29sa2l0LW9ic2VydmFibGUvcngtdXRpbHMnO1xuaW1wb3J0IHtwYXJzZUNvbmZpZ0ZpbGVUb0pzb259IGZyb20gJy4uL3RzLWNtZC11dGlsJztcbi8vIGluc3BlY3Rvci5vcGVuKDkyMjIsICdsb2NhbGhvc3QnLCB0cnVlKTtcblxudHlwZSBUc2NPcHRpb25zID0ge1xuICBqc3g/OiBib29sZWFuO1xuICBpbmxpbmVTb3VyY2VNYXA/OiBib29sZWFuO1xuICBlbWl0RGVjbGFyYXRpb25Pbmx5PzogYm9vbGVhbjtcbiAgY2hhbmdlQ29tcGlsZXJPcHRpb25zPzogKGNvOiBSZWNvcmQ8c3RyaW5nLCBhbnk+KSA9PiB2b2lkO1xuICB0cmFjZVJlc29sdXRpb24/OiBib29sZWFuO1xufTtcblxuZnVuY3Rpb24gcGxpbmtOb2RlSnNDb21waWxlck9wdGlvbkpzb24oXG4gIHRzOiB0eXBlb2YgX3RzLFxuICBvcHRzOiBUc2NPcHRpb25zID0ge31cbikge1xuICBjb25zdCB7anN4ID0gZmFsc2UsIGlubGluZVNvdXJjZU1hcCA9IHRydWUsIGVtaXREZWNsYXJhdGlvbk9ubHkgPSBmYWxzZX0gPSBvcHRzO1xuICBsZXQgYmFzZUNvbXBpbGVyT3B0aW9uczogYW55O1xuICBpZiAoanN4KSB7XG4gICAgY29uc3QgYmFzZVRzY29uZmlnRmlsZTIgPSByZXF1aXJlLnJlc29sdmUoJy4uL3RzY29uZmlnLXRzeC5qc29uJyk7XG4gICAgLy8gbG9nLmluZm8oJ1VzZSB0c2NvbmZpZyBmaWxlOicsIGJhc2VUc2NvbmZpZ0ZpbGUyKTtcbiAgICBjb25zdCB0c3hUc2NvbmZpZyA9IHBhcnNlQ29uZmlnRmlsZVRvSnNvbih0cywgYmFzZVRzY29uZmlnRmlsZTIpO1xuICAgIGJhc2VDb21waWxlck9wdGlvbnMgPSB0c3hUc2NvbmZpZy5jb21waWxlck9wdGlvbnM7XG4gICAgLy8gYmFzZUNvbXBpbGVyT3B0aW9ucyA9IHsuLi5iYXNlQ29tcGlsZXJPcHRpb25zLCAuLi50c3hUc2NvbmZpZy5jb25maWcuY29tcGlsZXJPcHRpb25zfTtcbiAgfSBlbHNlIHtcbiAgICBjb25zdCBiYXNlVHNjb25maWdGaWxlID0gcmVxdWlyZS5yZXNvbHZlKCcuLi8uLi90c2NvbmZpZy1iYXNlLmpzb24nKTtcbiAgICBjb25zdCBiYXNlVHNjb25maWcgPSBwYXJzZUNvbmZpZ0ZpbGVUb0pzb24odHMsIGJhc2VUc2NvbmZpZ0ZpbGUpO1xuICAgIC8vIGxvZy5pbmZvKCdVc2UgdHNjb25maWcgZmlsZTonLCBiYXNlVHNjb25maWdGaWxlKTtcbiAgICBiYXNlQ29tcGlsZXJPcHRpb25zID0gYmFzZVRzY29uZmlnLmNvbXBpbGVyT3B0aW9ucztcbiAgfVxuXG4gIGNvbnN0IGNvUm9vdERpciA9IFBhdGgucGFyc2UocHJvY2Vzcy5jd2QoKSkucm9vdDtcbiAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudFxuICBjb25zdCBjb21waWxlck9wdGlvbnMgPSB7XG4gICAgLi4uYmFzZUNvbXBpbGVyT3B0aW9ucyxcbiAgICB0YXJnZXQ6ICdFUzIwMTcnLFxuICAgIGltcG9ydEhlbHBlcnM6IHRydWUsXG4gICAgZGVjbGFyYXRpb246IHRydWUsXG4gICAgLy8gZGlhZ25vc3RpY3M6IHRydWUsXG4gICAgLy8gbW9kdWxlOiAnRVNOZXh0JyxcbiAgICAvKipcbiAgICAgKiBmb3IgZ3VscC1zb3VyY2VtYXBzIHVzYWdlOlxuICAgICAqICBJZiB5b3Ugc2V0IHRoZSBvdXREaXIgb3B0aW9uIHRvIHRoZSBzYW1lIHZhbHVlIGFzIHRoZSBkaXJlY3RvcnkgaW4gZ3VscC5kZXN0LCB5b3Ugc2hvdWxkIHNldCB0aGUgc291cmNlUm9vdCB0byAuLy5cbiAgICAgKi9cbiAgICBvdXREaXI6IGNvUm9vdERpciwgLy8gbXVzdCBiZSBzYW1lIGFzIHJvb3REaXJcbiAgICByb290RGlyOiBjb1Jvb3REaXIsXG4gICAgc2tpcExpYkNoZWNrOiB0cnVlLFxuICAgIGlubGluZVNvdXJjZU1hcCxcbiAgICBzb3VyY2VNYXA6ICFpbmxpbmVTb3VyY2VNYXAsXG4gICAgaW5saW5lU291cmNlczogaW5saW5lU291cmNlTWFwLFxuICAgIGVtaXREZWNsYXJhdGlvbk9ubHksXG4gICAgdHJhY2VSZXNvbHV0aW9uOiBvcHRzLnRyYWNlUmVzb2x1dGlvbixcbiAgICBwcmVzZXJ2ZVN5bWxpbmtzOiBmYWxzZVxuICB9IGFzIFJlY29yZDxrZXlvZiBfdHMuQ29tcGlsZXJPcHRpb25zLCBhbnk+O1xuICBpZiAob3B0cy5jaGFuZ2VDb21waWxlck9wdGlvbnMpXG4gICAgb3B0cy5jaGFuZ2VDb21waWxlck9wdGlvbnMoY29tcGlsZXJPcHRpb25zKTtcblxuICByZXR1cm4gY29tcGlsZXJPcHRpb25zO1xufVxuXG5mdW5jdGlvbiBwbGlua05vZGVKc0NvbXBpbGVyT3B0aW9uKFxuICB0czogdHlwZW9mIF90cyxcbiAgb3B0czogVHNjT3B0aW9ucyAmIHtiYXNlUGF0aD86IHN0cmluZ30gPSB7fVxuKSB7XG4gIGNvbnN0IGpzb24gPSBwbGlua05vZGVKc0NvbXBpbGVyT3B0aW9uSnNvbih0cywgb3B0cyk7XG4gIGNvbnN0IGJhc2VQYXRoID0gKG9wdHMuYmFzZVBhdGggfHwgcHJvY2Vzcy5jd2QoKSkucmVwbGFjZSgvXFxcXC9nLCAnLycpO1xuICBjb25zdCB7b3B0aW9uc30gPSB0cy5wYXJzZUpzb25Db25maWdGaWxlQ29udGVudChcbiAgICB7Y29tcGlsZXJPcHRpb25zOiBqc29ufSxcbiAgICB0cy5zeXMsXG4gICAgYmFzZVBhdGgsXG4gICAgdW5kZWZpbmVkLFxuICAgIFBhdGgucmVzb2x2ZShiYXNlUGF0aCwgJ3RzY29uZmlnLWluLW1lbW9yeS5qc29uJylcbiAgKTtcbiAgcmV0dXJuIG9wdGlvbnM7XG59XG5cbi8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnRcbmV4cG9ydCBmdW5jdGlvbiB0cmFuc3BpbGVTaW5nbGVGaWxlKGNvbnRlbnQ6IHN0cmluZywgdHM6IGFueSA9IF90cykge1xuICBjb25zdCB7b3V0cHV0VGV4dCwgZGlhZ25vc3RpY3MsIHNvdXJjZU1hcFRleHR9ID0gKHRzIGFzIHR5cGVvZiBfdHMpXG4gICAgLnRyYW5zcGlsZU1vZHVsZShjb250ZW50LCB7XG4gICAgICBjb21waWxlck9wdGlvbnM6IHsuLi5wbGlua05vZGVKc0NvbXBpbGVyT3B0aW9uKHRzKSwgaXNvbGF0ZWRNb2R1bGVzOiB0cnVlLCBpbmxpbmVTb3VyY2VNYXA6IGZhbHNlfVxuICAgIH0pO1xuXG4gIHJldHVybiB7XG4gICAgb3V0cHV0VGV4dCxcbiAgICBzb3VyY2VNYXBUZXh0LFxuICAgIGRpYWdub3N0aWNzLFxuICAgIGRpYWdub3N0aWNzVGV4dDogZGlhZ25vc3RpY3NcbiAgfTtcbn1cblxuZXhwb3J0IGVudW0gTG9nTGV2ZWwge1xuICB0cmFjZSwgbG9nLCBlcnJvclxufVxuXG50eXBlIExhbmdTZXJ2aWNlQWN0aW9uQ3JlYXRvciA9IHtcbiAgd2F0Y2goZGlyczogc3RyaW5nW10pOiB2b2lkO1xuICBhZGRTb3VyY2VGaWxlKGZpbGU6IHN0cmluZywgc3luYzogYm9vbGVhbikgOiB2b2lkO1xuICBjaGFuZ2VTb3VyY2VGaWxlKGZpbGU6IHN0cmluZykgOiB2b2lkO1xuICBvbkNvbXBpbGVyT3B0aW9ucyhjbzogX3RzLkNvbXBpbGVyT3B0aW9ucyk6IHZvaWQ7XG4gIG9uRW1pdEZhaWx1cmUoZmlsZTogc3RyaW5nLCBkaWFnbm9zdGljczogc3RyaW5nLCB0eXBlOiAnY29tcGlsZXJPcHRpb25zJyB8ICdzeW50YWN0aWMnIHwgJ3NlbWFudGljJykgOiB2b2lkO1xuICBvblN1Z2dlc3QoZmlsZTogc3RyaW5nLCBtc2c6IHN0cmluZyk6IHZvaWQ7XG4gIF9lbWl0RmlsZShmaWxlOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZykgOiB2b2lkO1xuICBsb2cobGV2ZWw6IExvZ0xldmVsLCBtc2c6IHN0cmluZyk6IHZvaWQ7XG4gIC8qKiBzdG9wIHdhdGNoICovXG4gIHN0b3AoKTogdm9pZDtcbn07XG5cbnR5cGUgTGFuZ1NlcnZpY2VTdGF0ZSA9IHtcbiAgdmVyc2lvbnM6IE1hcDxzdHJpbmcsIG51bWJlcj47XG4gIC8qKiByb290IGZpbGVzICovXG4gIGZpbGVzOiBTZXQ8c3RyaW5nPjtcbiAgdW5lbWl0dGVkOiBTZXQ8c3RyaW5nPjtcbiAgaXNTdG9wcGVkOiBib29sZWFuO1xufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGxhbmd1YWdlU2VydmljZXModHM6IGFueSA9IF90cywgb3B0czoge1xuICBmb3JtYXREaWFnbm9zdGljRmlsZU5hbWU/KHBhdGg6IHN0cmluZyk6IHN0cmluZztcbiAgdHJhbnNmb3JtU291cmNlRmlsZT8ocGF0aDogc3RyaW5nLCBjb250ZW50OiBzdHJpbmcpOiBzdHJpbmc7XG4gIHdhdGNoZXI/OiBjaG9raWRhci5XYXRjaE9wdGlvbnM7XG4gIHRzY09wdHM/OiBOb25OdWxsYWJsZTxQYXJhbWV0ZXJzPHR5cGVvZiBwbGlua05vZGVKc0NvbXBpbGVyT3B0aW9uPlsxXT47XG59ID0ge30pIHtcbiAgY29uc3QgdHMwID0gdHMgYXMgdHlwZW9mIF90cztcbiAgY29uc3Qge2Rpc3BhdGNoRmFjdG9yeSwgYWN0aW9uJCwgb2ZUeXBlfSA9IGNyZWF0ZUFjdGlvblN0cmVhbUJ5VHlwZTxMYW5nU2VydmljZUFjdGlvbkNyZWF0b3I+KCk7XG4gIGNvbnN0IHN0b3JlID0gbmV3IHJ4LkJlaGF2aW9yU3ViamVjdDxMYW5nU2VydmljZVN0YXRlPih7XG4gICAgdmVyc2lvbnM6IG5ldyBNYXAoKSxcbiAgICBmaWxlczogbmV3IFNldCgpLFxuICAgIHVuZW1pdHRlZDogbmV3IFNldCgpLFxuICAgIGlzU3RvcHBlZDogZmFsc2VcbiAgfSk7XG5cbiAgZnVuY3Rpb24gc2V0U3RhdGUoY2I6IChjdXJyOiBMYW5nU2VydmljZVN0YXRlKSA9PiBMYW5nU2VydmljZVN0YXRlKSB7XG4gICAgc3RvcmUubmV4dChjYihzdG9yZS5nZXRWYWx1ZSgpKSk7XG4gIH1cblxuICBjb25zdCBmb3JtYXRIb3N0OiBfdHMuRm9ybWF0RGlhZ25vc3RpY3NIb3N0ID0ge1xuICAgIGdldENhbm9uaWNhbEZpbGVOYW1lOiBvcHRzLmZvcm1hdERpYWdub3N0aWNGaWxlTmFtZSB8fCAocGF0aCA9PiBwYXRoKSxcbiAgICBnZXRDdXJyZW50RGlyZWN0b3J5OiBfdHMuc3lzLmdldEN1cnJlbnREaXJlY3RvcnksXG4gICAgZ2V0TmV3TGluZTogKCkgPT4gX3RzLnN5cy5uZXdMaW5lXG4gIH07XG5cbiAgY29uc3QgY28gPSBwbGlua05vZGVKc0NvbXBpbGVyT3B0aW9uKHRzMCwgb3B0cy50c2NPcHRzKTtcblxuICBjb25zdCBzZXJ2aWNlSG9zdDogX3RzLkxhbmd1YWdlU2VydmljZUhvc3QgPSB7XG4gICAgLi4udHMwLnN5cywgLy8gSW1wb3J0YW50LCBkZWZhdWx0IGxhbmd1YWdlIHNlcnZpY2UgaG9zdCBkb2VzIG5vdCBpbXBsZW1lbnQgbWV0aG9kcyBsaWtlIGZpbGVFeGlzdHNcbiAgICBnZXRTY3JpcHRGaWxlTmFtZXMoKSB7XG4gICAgICByZXR1cm4gQXJyYXkuZnJvbShzdG9yZS5nZXRWYWx1ZSgpLmZpbGVzLnZhbHVlcygpKTtcbiAgICB9LFxuICAgIGdldFNjcmlwdFZlcnNpb24oZmlsZU5hbWU6IHN0cmluZykge1xuICAgICAgcmV0dXJuIHN0b3JlLmdldFZhbHVlKCkudmVyc2lvbnMuZ2V0KGZpbGVOYW1lKSArICcnIHx8ICctMSc7XG4gICAgfSxcbiAgICBnZXRDb21waWxhdGlvblNldHRpbmdzKCkge1xuICAgICAgZGlzcGF0Y2hGYWN0b3J5KCdvbkNvbXBpbGVyT3B0aW9ucycpKGNvKTtcbiAgICAgIHJldHVybiBjbztcbiAgICB9LFxuICAgIGdldFNjcmlwdFNuYXBzaG90KGZpbGVOYW1lOiBzdHJpbmcpIHtcbiAgICAgIGlmICghZnMuZXhpc3RzU3luYyhmaWxlTmFtZSkpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgIH1cblxuICAgICAgY29uc3Qgb3JpZ2luQ29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhmaWxlTmFtZSkudG9TdHJpbmcoKTtcbiAgICAgIHJldHVybiB0czAuU2NyaXB0U25hcHNob3QuZnJvbVN0cmluZyhvcHRzLnRyYW5zZm9ybVNvdXJjZUZpbGUgPyBvcHRzLnRyYW5zZm9ybVNvdXJjZUZpbGUoZmlsZU5hbWUsIG9yaWdpbkNvbnRlbnQpIDogb3JpZ2luQ29udGVudCk7XG4gICAgfSxcbiAgICBnZXRDYW5jZWxsYXRpb25Ub2tlbigpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGlzQ2FuY2VsbGF0aW9uUmVxdWVzdGVkKCkge1xuICAgICAgICAgIHJldHVybiBzdG9yZS5nZXRWYWx1ZSgpLmlzU3RvcHBlZDtcbiAgICAgICAgfVxuICAgICAgfTtcbiAgICB9LFxuICAgIHVzZUNhc2VTZW5zaXRpdmVGaWxlTmFtZXMoKSB7IHJldHVybiB0czAuc3lzLnVzZUNhc2VTZW5zaXRpdmVGaWxlTmFtZXM7IH0sXG4gICAgZ2V0RGVmYXVsdExpYkZpbGVOYW1lOiBvcHRpb25zID0+IHRzMC5nZXREZWZhdWx0TGliRmlsZVBhdGgob3B0aW9ucyksXG5cbiAgICB0cmFjZShzKSB7XG4gICAgICBkaXNwYXRjaEZhY3RvcnkoJ2xvZycpKExvZ0xldmVsLmxvZywgcyk7XG4gICAgICBjb25zb2xlLmxvZygnW2xhbmctc2VydmljZSB0cmFjZV0nLCBzKTtcbiAgICB9LFxuICAgIGVycm9yKHMpIHtcbiAgICAgIGRpc3BhdGNoRmFjdG9yeSgnbG9nJykoTG9nTGV2ZWwuZXJyb3IsIHMpO1xuICAgICAgY29uc29sZS5sb2coJ1tsYW5nLXNlcnZpY2UgZXJyb3JdJywgcyk7XG4gICAgfSxcbiAgICBsb2cocykge1xuICAgICAgZGlzcGF0Y2hGYWN0b3J5KCdsb2cnKShMb2dMZXZlbC5sb2csIHMpO1xuICAgICAgY29uc29sZS5sb2coJ1tsYW5nLXNlcnZpY2UgbG9nXScsIHMpO1xuICAgIH1cbiAgfTtcbiAgY29uc3QgZG9jdW1lbnRSZWdpc3RyeSA9IHRzMC5jcmVhdGVEb2N1bWVudFJlZ2lzdHJ5KCk7XG4gIGxldCBzZXJ2aWNlczogX3RzLkxhbmd1YWdlU2VydmljZSB8IHVuZGVmaW5lZDtcbiAgY29uc3QgYWRkU291cmNlRmlsZSQgPSBhY3Rpb24kLnBpcGUob2ZUeXBlKCdhZGRTb3VyY2VGaWxlJykpO1xuICBjb25zdCBjaGFuZ2VTb3VyY2VGaWxlJCA9IGFjdGlvbiQucGlwZShvZlR5cGUoJ2NoYW5nZVNvdXJjZUZpbGUnKSk7XG4gIGNvbnN0IHN0b3AkID0gYWN0aW9uJC5waXBlKG9mVHlwZSgnc3RvcCcpKTtcblxuICBsZXQgd2F0Y2hlcjogUmV0dXJuVHlwZTx0eXBlb2YgY2hva2lkYXIud2F0Y2g+O1xuXG4gIHJ4Lm1lcmdlKFxuICAgIGFjdGlvbiQucGlwZShcbiAgICAgIG9mVHlwZSgnd2F0Y2gnKSxcbiAgICAgIG9wLmV4aGF1c3RNYXAoKHtwYXlsb2FkOiBkaXJzfSkgPT4gIG5ldyByeC5PYnNlcnZhYmxlPG5ldmVyPigoKSA9PiB7XG4gICAgICAgIGlmICh3YXRjaGVyID09IG51bGwpXG4gICAgICAgICAgd2F0Y2hlciA9IGNob2tpZGFyLndhdGNoKGRpcnMubWFwKGRpciA9PiBkaXIucmVwbGFjZSgvXFxcXC9nLCAnLycpKSwgb3B0cy53YXRjaGVyKTtcblxuICAgICAgICB3YXRjaGVyLm9uKCdhZGQnLCBwYXRoID0+IGRpc3BhdGNoRmFjdG9yeSgnYWRkU291cmNlRmlsZScpKHBhdGgsIGZhbHNlKSk7XG4gICAgICAgIHdhdGNoZXIub24oJ2NoYW5nZScsIHBhdGggPT4gZGlzcGF0Y2hGYWN0b3J5KCdjaGFuZ2VTb3VyY2VGaWxlJykocGF0aCkpO1xuICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgIHZvaWQgd2F0Y2hlci5jbG9zZSgpLnRoZW4oKCkgPT4ge1xuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdbdHNjLXV0aWxdIGNob2tpZGFyIHdhdGNoZXIgc3RvcHMnKTtcbiAgICAgICAgICB9KTtcbiAgICAgICAgfTtcbiAgICAgIH0pXG4gICAgICApXG4gICAgKSxcbiAgICBhZGRTb3VyY2VGaWxlJC5waXBlKFxuICAgICAgb3AuZmlsdGVyKCh7cGF5bG9hZDogW2ZpbGVdfSkgPT4gL1xcLig/OnRzeD98anNvbikkLy50ZXN0KGZpbGUpKSxcbiAgICAgIG9wLm1hcCgoe3BheWxvYWQ6IFtmaWxlTmFtZSwgc3luY119KSA9PiB7XG4gICAgICAgIHNldFN0YXRlKHMgPT4ge1xuICAgICAgICAgIHMuZmlsZXMuYWRkKGZpbGVOYW1lKTtcbiAgICAgICAgICBzLnZlcnNpb25zLnNldChmaWxlTmFtZSwgMCk7XG4gICAgICAgICAgcmV0dXJuIHM7XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoc3luYylcbiAgICAgICAgICBnZXRFbWl0RmlsZShmaWxlTmFtZSk7XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgIHNldFN0YXRlKHMgPT4ge1xuICAgICAgICAgICAgcy51bmVtaXR0ZWQuYWRkKGZpbGVOYW1lKTtcbiAgICAgICAgICAgIHJldHVybiBzO1xuICAgICAgICAgIH0pO1xuICAgICAgICAgIHJldHVybiBmaWxlTmFtZTtcbiAgICAgICAgfVxuICAgICAgfSksXG4gICAgICBvcC5maWx0ZXIoKGZpbGUpIDogZmlsZSBpcyBzdHJpbmcgPT4gZmlsZSAhPSBudWxsKSxcbiAgICAgIG9wLmRlYm91bmNlVGltZSgzMzMpLFxuICAgICAgb3AubWFwKCgpID0+IHtcbiAgICAgICAgZm9yIChjb25zdCBmaWxlIG9mIHN0b3JlLmdldFZhbHVlKCkudW5lbWl0dGVkLnZhbHVlcygpKSB7XG4gICAgICAgICAgZ2V0RW1pdEZpbGUoZmlsZSk7XG4gICAgICAgIH1cbiAgICAgICAgc2V0U3RhdGUocyA9PiB7XG4gICAgICAgICAgcy51bmVtaXR0ZWQuY2xlYXIoKTtcbiAgICAgICAgICByZXR1cm4gcztcbiAgICAgICAgfSk7XG4gICAgICB9KVxuICAgICksXG4gICAgY2hhbmdlU291cmNlRmlsZSQucGlwZShcbiAgICAgIG9wLmZpbHRlcigoe3BheWxvYWQ6IGZpbGV9KSA9PiAvXFwuKD86dHN4P3xqc29uKSQvLnRlc3QoZmlsZSkpLFxuICAgICAgLy8gVE9ETzogZGVib3VuY2Ugb24gc2FtZSBmaWxlIGNoYW5nZXNcbiAgICAgIG9wLm1hcCgoe3BheWxvYWQ6IGZpbGVOYW1lfSkgPT4ge1xuICAgICAgICBzZXRTdGF0ZShzID0+IHtcbiAgICAgICAgICBjb25zdCB2ZXJzaW9uID0gcy52ZXJzaW9ucy5nZXQoZmlsZU5hbWUpO1xuICAgICAgICAgIHMudmVyc2lvbnMuc2V0KGZpbGVOYW1lLCAodmVyc2lvbiAhPSBudWxsID8gdmVyc2lvbiA6IDApICsgMSk7XG4gICAgICAgICAgcmV0dXJuIHM7XG4gICAgICAgIH0pO1xuICAgICAgICBnZXRFbWl0RmlsZShmaWxlTmFtZSk7XG4gICAgICB9KVxuICAgIClcbiAgKS5waXBlKFxuICAgIG9wLnRha2VVbnRpbChzdG9wJCksXG4gICAgb3AuY2F0Y2hFcnJvcigoZXJyLCBzcmMpID0+IHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0xhbmd1YWdlIHNlcnZpY2UgZXJyb3InLCBlcnIpO1xuICAgICAgcmV0dXJuIHNyYztcbiAgICB9KSxcbiAgICBvcC5maW5hbGl6ZSgoKSA9PiB7XG4gICAgICBzZXRTdGF0ZShzID0+IHtcbiAgICAgICAgcy5pc1N0b3BwZWQgPSB0cnVlO1xuICAgICAgICByZXR1cm4gcztcbiAgICAgIH0pO1xuICAgIH0pXG4gICkuc3Vic2NyaWJlKCk7XG5cbiAgZnVuY3Rpb24gZ2V0RW1pdEZpbGUoZmlsZU5hbWU6IHN0cmluZykge1xuICAgIGlmIChzZXJ2aWNlcyA9PSBudWxsKSB7XG4gICAgICBzZXJ2aWNlcyA9IHRzMC5jcmVhdGVMYW5ndWFnZVNlcnZpY2Uoc2VydmljZUhvc3QsIGRvY3VtZW50UmVnaXN0cnkpO1xuICAgICAgY29uc3QgY29EaWFnID0gc2VydmljZXMuZ2V0Q29tcGlsZXJPcHRpb25zRGlhZ25vc3RpY3MoKTtcbiAgICAgIGlmIChjb0RpYWcubGVuZ3RoID4gMClcbiAgICAgICAgZGlzcGF0Y2hGYWN0b3J5KCdvbkVtaXRGYWlsdXJlJykoXG4gICAgICAgICAgZmlsZU5hbWUsXG4gICAgICAgICAgdHMwLmZvcm1hdERpYWdub3N0aWNzV2l0aENvbG9yQW5kQ29udGV4dChjb0RpYWcsIGZvcm1hdEhvc3QpLFxuICAgICAgICAgICdjb21waWxlck9wdGlvbnMnKTtcbiAgICB9XG4gICAgY29uc3Qgb3V0cHV0ID0gc2VydmljZXMuZ2V0RW1pdE91dHB1dChmaWxlTmFtZSk7XG4gICAgaWYgKG91dHB1dC5lbWl0U2tpcHBlZCkge1xuICAgICAgLy8gY29uc29sZS5sb2coYEVtaXR0aW5nICR7ZmlsZU5hbWV9IGZhaWxlZGApO1xuICAgIH1cblxuICAgIGNvbnN0IHN5bnREaWFnID0gc2VydmljZXMuZ2V0U3ludGFjdGljRGlhZ25vc3RpY3MoZmlsZU5hbWUpO1xuICAgIGlmIChzeW50RGlhZy5sZW5ndGggPiAwKSB7XG4gICAgICBkaXNwYXRjaEZhY3RvcnkoJ29uRW1pdEZhaWx1cmUnKShcbiAgICAgICAgZmlsZU5hbWUsXG4gICAgICAgIHRzMC5mb3JtYXREaWFnbm9zdGljc1dpdGhDb2xvckFuZENvbnRleHQoc3ludERpYWcsIGZvcm1hdEhvc3QpLFxuICAgICAgICAnc3ludGFjdGljJyk7XG4gICAgfVxuICAgIGNvbnN0IHNlbWFudGljRGlhZyA9IHNlcnZpY2VzLmdldFNlbWFudGljRGlhZ25vc3RpY3MoZmlsZU5hbWUpO1xuXG4gICAgaWYgKHNlbWFudGljRGlhZy5sZW5ndGggPiAwKSB7XG4gICAgICBkaXNwYXRjaEZhY3RvcnkoJ29uRW1pdEZhaWx1cmUnKShcbiAgICAgICAgZmlsZU5hbWUsXG4gICAgICAgIHRzMC5mb3JtYXREaWFnbm9zdGljc1dpdGhDb2xvckFuZENvbnRleHQoc2VtYW50aWNEaWFnLCBmb3JtYXRIb3N0KSxcbiAgICAgICAgJ3NlbWFudGljJyk7XG4gICAgfVxuXG4gICAgY29uc3Qgc3VnZ2VzdHMgPSBzZXJ2aWNlcy5nZXRTdWdnZXN0aW9uRGlhZ25vc3RpY3MoZmlsZU5hbWUpO1xuXG4gICAgZm9yIChjb25zdCBzdWcgb2Ygc3VnZ2VzdHMpIHtcbiAgICAgIGNvbnN0IHtsaW5lLCBjaGFyYWN0ZXJ9ID0gc3VnLmZpbGUuZ2V0TGluZUFuZENoYXJhY3Rlck9mUG9zaXRpb24oc3VnLnN0YXJ0KTtcbiAgICAgIGRpc3BhdGNoRmFjdG9yeSgnb25TdWdnZXN0JykoZmlsZU5hbWUsIGAke2ZpbGVOYW1lfToke2xpbmUgKyAxfToke2NoYXJhY3RlciArIDF9IGAgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0czAuZmxhdHRlbkRpYWdub3N0aWNNZXNzYWdlVGV4dChzdWcubWVzc2FnZVRleHQsICdcXG4nLCAyKSk7XG4gICAgfVxuXG4gICAgb3V0cHV0Lm91dHB1dEZpbGVzLmZvckVhY2gobyA9PiB7XG4gICAgICBkaXNwYXRjaEZhY3RvcnkoJ19lbWl0RmlsZScpKG8ubmFtZSwgby50ZXh0KTtcbiAgICB9KTtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgZGlzcGF0Y2hGYWN0b3J5LCBhY3Rpb24kLCBvZlR5cGUsXG4gICAgc3RvcmU6IHN0b3JlLnBpcGUoXG4gICAgICBvcC5tYXAocyA9PiBzLmZpbGVzKVxuICAgIClcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHRlc3QoZGlyOiBzdHJpbmcpIHtcbiAgY29uc3Qge2FjdGlvbiQsIG9mVHlwZX0gPSBsYW5ndWFnZVNlcnZpY2VzKFtkaXJdKTtcbiAgYWN0aW9uJC5waXBlKFxuICAgIG9mVHlwZSgnX2VtaXRGaWxlJyksXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnNvbGVcbiAgICBvcC5tYXAoKHtwYXlsb2FkOiBbZmlsZV19KSA9PiBjb25zb2xlLmxvZygnZW1pdCcsIGZpbGUpKVxuICApLnN1YnNjcmliZSgpO1xufVxuIl19