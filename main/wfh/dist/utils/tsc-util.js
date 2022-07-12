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
    const { jsx = false, inlineSourceMap = false, emitDeclarationOnly = false } = opts;
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
        outDir: coRootDir, rootDir: coRootDir, skipLibCheck: true, inlineSourceMap, sourceMap: !inlineSourceMap, inlineSources: true, emitDeclarationOnly, traceResolution: opts.traceResolution, preserveSymlinks: false });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHNjLXV0aWwuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi90cy91dGlscy90c2MtdXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLDRDQUFvQjtBQUNwQixnREFBd0I7QUFDeEIsNERBQTZCO0FBQzdCLHFDQUFxQztBQUNyQyx5Q0FBMkI7QUFDM0IsbURBQXFDO0FBQ3JDLHdEQUFnQztBQUNoQyx1RkFBa0c7QUFDbEcsMEZBQTBGO0FBQzFGLGdEQUFxRDtBQVdyRCxTQUFTLDZCQUE2QixDQUNwQyxFQUFjLEVBQ2QsT0FBbUIsRUFBRTtJQUVyQixNQUFNLEVBQUMsR0FBRyxHQUFHLEtBQUssRUFBRSxlQUFlLEdBQUcsS0FBSyxFQUFFLG1CQUFtQixHQUFHLEtBQUssRUFBQyxHQUFHLElBQUksQ0FBQztJQUNqRixJQUFJLG1CQUF3QixDQUFDO0lBQzdCLElBQUksR0FBRyxFQUFFO1FBQ1AsTUFBTSxpQkFBaUIsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLHNCQUFzQixDQUFDLENBQUM7UUFDbEUscURBQXFEO1FBQ3JELE1BQU0sV0FBVyxHQUFHLElBQUEsbUNBQXFCLEVBQUMsRUFBRSxFQUFFLGlCQUFpQixDQUFDLENBQUM7UUFDakUsbUJBQW1CLEdBQUcsV0FBVyxDQUFDLGVBQWUsQ0FBQztRQUNsRCx5RkFBeUY7S0FDMUY7U0FBTTtRQUNMLE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQywwQkFBMEIsQ0FBQyxDQUFDO1FBQ3JFLE1BQU0sWUFBWSxHQUFHLElBQUEsbUNBQXFCLEVBQUMsRUFBRSxFQUFFLGdCQUFnQixDQUFDLENBQUM7UUFDakUsb0RBQW9EO1FBQ3BELG1CQUFtQixHQUFHLFlBQVksQ0FBQyxlQUFlLENBQUM7S0FDcEQ7SUFFRCxNQUFNLFNBQVMsR0FBRyxjQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxD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QUFDO0lBQ2xELE9BQU8sQ0FBQyxJQUFJLENBQ1YsTUFBTSxDQUFDLFdBQVcsQ0FBQztJQUNuQixzQ0FBc0M7SUFDdEMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUMsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUMsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FDekQsQ0FBQyxTQUFTLEVBQUUsQ0FBQztBQUNoQixDQUFDO0FBUEQsb0JBT0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IFBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgX3RzIGZyb20gJ3R5cGVzY3JpcHQnO1xuLy8gaW1wb3J0IGluc3BlY3RvciBmcm9tICdpbnNwZWN0b3InO1xuaW1wb3J0ICogYXMgcnggZnJvbSAncnhqcyc7XG5pbXBvcnQgKiBhcyBvcCBmcm9tICdyeGpzL29wZXJhdG9ycyc7XG5pbXBvcnQgY2hva2lkYXIgZnJvbSAnY2hva2lkYXInO1xuaW1wb3J0IHtjcmVhdGVBY3Rpb25TdHJlYW1CeVR5cGV9IGZyb20gJy4uLy4uLy4uL3BhY2thZ2VzL3JlZHV4LXRvb2xraXQtb2JzZXJ2YWJsZS9kaXN0L3J4LXV0aWxzJztcbi8vIGltcG9ydCB7Y3JlYXRlQWN0aW9uU3RyZWFtfSBmcm9tICcuLi8uLi8uLi9wYWNrYWdlcy9yZWR1eC10b29sa2l0LW9ic2VydmFibGUvcngtdXRpbHMnO1xuaW1wb3J0IHtwYXJzZUNvbmZpZ0ZpbGVUb0pzb259IGZyb20gJy4uL3RzLWNtZC11dGlsJztcbi8vIGluc3BlY3Rvci5vcGVuKDkyMjIsICdsb2NhbGhvc3QnLCB0cnVlKTtcblxudHlwZSBUc2NPcHRpb25zID0ge1xuICBqc3g/OiBib29sZWFuO1xuICBpbmxpbmVTb3VyY2VNYXA/OiBib29sZWFuO1xuICBlbWl0RGVjbGFyYXRpb25Pbmx5PzogYm9vbGVhbjtcbiAgY2hhbmdlQ29tcGlsZXJPcHRpb25zPzogKGNvOiBSZWNvcmQ8c3RyaW5nLCBhbnk+KSA9PiB2b2lkO1xuICB0cmFjZVJlc29sdXRpb24/OiBib29sZWFuO1xufTtcblxuZnVuY3Rpb24gcGxpbmtOb2RlSnNDb21waWxlck9wdGlvbkpzb24oXG4gIHRzOiB0eXBlb2YgX3RzLFxuICBvcHRzOiBUc2NPcHRpb25zID0ge31cbikge1xuICBjb25zdCB7anN4ID0gZmFsc2UsIGlubGluZVNvdXJjZU1hcCA9IGZhbHNlLCBlbWl0RGVjbGFyYXRpb25Pbmx5ID0gZmFsc2V9ID0gb3B0cztcbiAgbGV0IGJhc2VDb21waWxlck9wdGlvbnM6IGFueTtcbiAgaWYgKGpzeCkge1xuICAgIGNvbnN0IGJhc2VUc2NvbmZpZ0ZpbGUyID0gcmVxdWlyZS5yZXNvbHZlKCcuLi90c2NvbmZpZy10c3guanNvbicpO1xuICAgIC8vIGxvZy5pbmZvKCdVc2UgdHNjb25maWcgZmlsZTonLCBiYXNlVHNjb25maWdGaWxlMik7XG4gICAgY29uc3QgdHN4VHNjb25maWcgPSBwYXJzZUNvbmZpZ0ZpbGVUb0pzb24odHMsIGJhc2VUc2NvbmZpZ0ZpbGUyKTtcbiAgICBiYXNlQ29tcGlsZXJPcHRpb25zID0gdHN4VHNjb25maWcuY29tcGlsZXJPcHRpb25zO1xuICAgIC8vIGJhc2VDb21waWxlck9wdGlvbnMgPSB7Li4uYmFzZUNvbXBpbGVyT3B0aW9ucywgLi4udHN4VHNjb25maWcuY29uZmlnLmNvbXBpbGVyT3B0aW9uc307XG4gIH0gZWxzZSB7XG4gICAgY29uc3QgYmFzZVRzY29uZmlnRmlsZSA9IHJlcXVpcmUucmVzb2x2ZSgnLi4vLi4vdHNjb25maWctYmFzZS5qc29uJyk7XG4gICAgY29uc3QgYmFzZVRzY29uZmlnID0gcGFyc2VDb25maWdGaWxlVG9Kc29uKHRzLCBiYXNlVHNjb25maWdGaWxlKTtcbiAgICAvLyBsb2cuaW5mbygnVXNlIHRzY29uZmlnIGZpbGU6JywgYmFzZVRzY29uZmlnRmlsZSk7XG4gICAgYmFzZUNvbXBpbGVyT3B0aW9ucyA9IGJhc2VUc2NvbmZpZy5jb21waWxlck9wdGlvbnM7XG4gIH1cblxuICBjb25zdCBjb1Jvb3REaXIgPSBQYXRoLnBhcnNlKHByb2Nlc3MuY3dkKCkpLnJvb3Q7XG4gIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tdW5zYWZlLWFzc2lnbm1lbnRcbiAgY29uc3QgY29tcGlsZXJPcHRpb25zID0ge1xuICAgIC4uLmJhc2VDb21waWxlck9wdGlvbnMsXG4gICAgdGFyZ2V0OiAnRVMyMDE3JyxcbiAgICBpbXBvcnRIZWxwZXJzOiB0cnVlLFxuICAgIGRlY2xhcmF0aW9uOiB0cnVlLFxuICAgIC8vIGRpYWdub3N0aWNzOiB0cnVlLFxuICAgIC8vIG1vZHVsZTogJ0VTTmV4dCcsXG4gICAgLyoqXG4gICAgICogZm9yIGd1bHAtc291cmNlbWFwcyB1c2FnZTpcbiAgICAgKiAgSWYgeW91IHNldCB0aGUgb3V0RGlyIG9wdGlvbiB0byB0aGUgc2FtZSB2YWx1ZSBhcyB0aGUgZGlyZWN0b3J5IGluIGd1bHAuZGVzdCwgeW91IHNob3VsZCBzZXQgdGhlIHNvdXJjZVJvb3QgdG8gLi8uXG4gICAgICovXG4gICAgb3V0RGlyOiBjb1Jvb3REaXIsIC8vIG11c3QgYmUgc2FtZSBhcyByb290RGlyXG4gICAgcm9vdERpcjogY29Sb290RGlyLFxuICAgIHNraXBMaWJDaGVjazogdHJ1ZSxcbiAgICBpbmxpbmVTb3VyY2VNYXAsXG4gICAgc291cmNlTWFwOiAhaW5saW5lU291cmNlTWFwLFxuICAgIGlubGluZVNvdXJjZXM6IHRydWUsXG4gICAgZW1pdERlY2xhcmF0aW9uT25seSxcbiAgICB0cmFjZVJlc29sdXRpb246IG9wdHMudHJhY2VSZXNvbHV0aW9uLFxuICAgIHByZXNlcnZlU3ltbGlua3M6IGZhbHNlXG4gIH0gYXMgUmVjb3JkPGtleW9mIF90cy5Db21waWxlck9wdGlvbnMsIGFueT47XG4gIGlmIChvcHRzLmNoYW5nZUNvbXBpbGVyT3B0aW9ucylcbiAgICBvcHRzLmNoYW5nZUNvbXBpbGVyT3B0aW9ucyhjb21waWxlck9wdGlvbnMpO1xuXG4gIHJldHVybiBjb21waWxlck9wdGlvbnM7XG59XG5cbmZ1bmN0aW9uIHBsaW5rTm9kZUpzQ29tcGlsZXJPcHRpb24oXG4gIHRzOiB0eXBlb2YgX3RzLFxuICBvcHRzOiBUc2NPcHRpb25zICYge2Jhc2VQYXRoPzogc3RyaW5nfSA9IHt9XG4pIHtcbiAgY29uc3QganNvbiA9IHBsaW5rTm9kZUpzQ29tcGlsZXJPcHRpb25Kc29uKHRzLCBvcHRzKTtcbiAgY29uc3QgYmFzZVBhdGggPSAob3B0cy5iYXNlUGF0aCB8fCBwcm9jZXNzLmN3ZCgpKS5yZXBsYWNlKC9cXFxcL2csICcvJyk7XG4gIGNvbnN0IHtvcHRpb25zfSA9IHRzLnBhcnNlSnNvbkNvbmZpZ0ZpbGVDb250ZW50KFxuICAgIHtjb21waWxlck9wdGlvbnM6IGpzb259LFxuICAgIHRzLnN5cyxcbiAgICBiYXNlUGF0aCxcbiAgICB1bmRlZmluZWQsXG4gICAgUGF0aC5yZXNvbHZlKGJhc2VQYXRoLCAndHNjb25maWctaW4tbWVtb3J5Lmpzb24nKVxuICApO1xuICByZXR1cm4gb3B0aW9ucztcbn1cblxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby11bnNhZmUtYXNzaWdubWVudFxuZXhwb3J0IGZ1bmN0aW9uIHRyYW5zcGlsZVNpbmdsZUZpbGUoY29udGVudDogc3RyaW5nLCB0czogYW55ID0gX3RzKSB7XG4gIGNvbnN0IHtvdXRwdXRUZXh0LCBkaWFnbm9zdGljcywgc291cmNlTWFwVGV4dH0gPSAodHMgYXMgdHlwZW9mIF90cylcbiAgICAudHJhbnNwaWxlTW9kdWxlKGNvbnRlbnQsIHtcbiAgICAgIGNvbXBpbGVyT3B0aW9uczogey4uLnBsaW5rTm9kZUpzQ29tcGlsZXJPcHRpb24odHMpLCBpc29sYXRlZE1vZHVsZXM6IHRydWUsIGlubGluZVNvdXJjZU1hcDogZmFsc2V9XG4gICAgfSk7XG5cbiAgcmV0dXJuIHtcbiAgICBvdXRwdXRUZXh0LFxuICAgIHNvdXJjZU1hcFRleHQsXG4gICAgZGlhZ25vc3RpY3MsXG4gICAgZGlhZ25vc3RpY3NUZXh0OiBkaWFnbm9zdGljc1xuICB9O1xufVxuXG5leHBvcnQgZW51bSBMb2dMZXZlbCB7XG4gIHRyYWNlLCBsb2csIGVycm9yXG59XG5cbnR5cGUgTGFuZ1NlcnZpY2VBY3Rpb25DcmVhdG9yID0ge1xuICB3YXRjaChkaXJzOiBzdHJpbmdbXSk6IHZvaWQ7XG4gIGFkZFNvdXJjZUZpbGUoZmlsZTogc3RyaW5nLCBzeW5jOiBib29sZWFuKSA6IHZvaWQ7XG4gIGNoYW5nZVNvdXJjZUZpbGUoZmlsZTogc3RyaW5nKSA6IHZvaWQ7XG4gIG9uQ29tcGlsZXJPcHRpb25zKGNvOiBfdHMuQ29tcGlsZXJPcHRpb25zKTogdm9pZDtcbiAgb25FbWl0RmFpbHVyZShmaWxlOiBzdHJpbmcsIGRpYWdub3N0aWNzOiBzdHJpbmcsIHR5cGU6ICdjb21waWxlck9wdGlvbnMnIHwgJ3N5bnRhY3RpYycgfCAnc2VtYW50aWMnKSA6IHZvaWQ7XG4gIG9uU3VnZ2VzdChmaWxlOiBzdHJpbmcsIG1zZzogc3RyaW5nKTogdm9pZDtcbiAgX2VtaXRGaWxlKGZpbGU6IHN0cmluZywgY29udGVudDogc3RyaW5nKSA6IHZvaWQ7XG4gIGxvZyhsZXZlbDogTG9nTGV2ZWwsIG1zZzogc3RyaW5nKTogdm9pZDtcbiAgLyoqIHN0b3Agd2F0Y2ggKi9cbiAgc3RvcCgpOiB2b2lkO1xufTtcblxudHlwZSBMYW5nU2VydmljZVN0YXRlID0ge1xuICB2ZXJzaW9uczogTWFwPHN0cmluZywgbnVtYmVyPjtcbiAgLyoqIHJvb3QgZmlsZXMgKi9cbiAgZmlsZXM6IFNldDxzdHJpbmc+O1xuICB1bmVtaXR0ZWQ6IFNldDxzdHJpbmc+O1xuICBpc1N0b3BwZWQ6IGJvb2xlYW47XG59O1xuXG5leHBvcnQgZnVuY3Rpb24gbGFuZ3VhZ2VTZXJ2aWNlcyh0czogYW55ID0gX3RzLCBvcHRzOiB7XG4gIGZvcm1hdERpYWdub3N0aWNGaWxlTmFtZT8ocGF0aDogc3RyaW5nKTogc3RyaW5nO1xuICB0cmFuc2Zvcm1Tb3VyY2VGaWxlPyhwYXRoOiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZyk6IHN0cmluZztcbiAgd2F0Y2hlcj86IGNob2tpZGFyLldhdGNoT3B0aW9ucztcbiAgdHNjT3B0cz86IE5vbk51bGxhYmxlPFBhcmFtZXRlcnM8dHlwZW9mIHBsaW5rTm9kZUpzQ29tcGlsZXJPcHRpb24+WzFdPjtcbn0gPSB7fSkge1xuICBjb25zdCB0czAgPSB0cyBhcyB0eXBlb2YgX3RzO1xuICBjb25zdCB7ZGlzcGF0Y2hGYWN0b3J5LCBhY3Rpb24kLCBvZlR5cGV9ID0gY3JlYXRlQWN0aW9uU3RyZWFtQnlUeXBlPExhbmdTZXJ2aWNlQWN0aW9uQ3JlYXRvcj4oKTtcbiAgY29uc3Qgc3RvcmUgPSBuZXcgcnguQmVoYXZpb3JTdWJqZWN0PExhbmdTZXJ2aWNlU3RhdGU+KHtcbiAgICB2ZXJzaW9uczogbmV3IE1hcCgpLFxuICAgIGZpbGVzOiBuZXcgU2V0KCksXG4gICAgdW5lbWl0dGVkOiBuZXcgU2V0KCksXG4gICAgaXNTdG9wcGVkOiBmYWxzZVxuICB9KTtcblxuICBmdW5jdGlvbiBzZXRTdGF0ZShjYjogKGN1cnI6IExhbmdTZXJ2aWNlU3RhdGUpID0+IExhbmdTZXJ2aWNlU3RhdGUpIHtcbiAgICBzdG9yZS5uZXh0KGNiKHN0b3JlLmdldFZhbHVlKCkpKTtcbiAgfVxuXG4gIGNvbnN0IGZvcm1hdEhvc3Q6IF90cy5Gb3JtYXREaWFnbm9zdGljc0hvc3QgPSB7XG4gICAgZ2V0Q2Fub25pY2FsRmlsZU5hbWU6IG9wdHMuZm9ybWF0RGlhZ25vc3RpY0ZpbGVOYW1lIHx8IChwYXRoID0+IHBhdGgpLFxuICAgIGdldEN1cnJlbnREaXJlY3Rvcnk6IF90cy5zeXMuZ2V0Q3VycmVudERpcmVjdG9yeSxcbiAgICBnZXROZXdMaW5lOiAoKSA9PiBfdHMuc3lzLm5ld0xpbmVcbiAgfTtcblxuICBjb25zdCBjbyA9IHBsaW5rTm9kZUpzQ29tcGlsZXJPcHRpb24odHMwLCBvcHRzLnRzY09wdHMpO1xuXG4gIGNvbnN0IHNlcnZpY2VIb3N0OiBfdHMuTGFuZ3VhZ2VTZXJ2aWNlSG9zdCA9IHtcbiAgICAuLi50czAuc3lzLCAvLyBJbXBvcnRhbnQsIGRlZmF1bHQgbGFuZ3VhZ2Ugc2VydmljZSBob3N0IGRvZXMgbm90IGltcGxlbWVudCBtZXRob2RzIGxpa2UgZmlsZUV4aXN0c1xuICAgIGdldFNjcmlwdEZpbGVOYW1lcygpIHtcbiAgICAgIHJldHVybiBBcnJheS5mcm9tKHN0b3JlLmdldFZhbHVlKCkuZmlsZXMudmFsdWVzKCkpO1xuICAgIH0sXG4gICAgZ2V0U2NyaXB0VmVyc2lvbihmaWxlTmFtZTogc3RyaW5nKSB7XG4gICAgICByZXR1cm4gc3RvcmUuZ2V0VmFsdWUoKS52ZXJzaW9ucy5nZXQoZmlsZU5hbWUpICsgJycgfHwgJy0xJztcbiAgICB9LFxuICAgIGdldENvbXBpbGF0aW9uU2V0dGluZ3MoKSB7XG4gICAgICBkaXNwYXRjaEZhY3RvcnkoJ29uQ29tcGlsZXJPcHRpb25zJykoY28pO1xuICAgICAgcmV0dXJuIGNvO1xuICAgIH0sXG4gICAgZ2V0U2NyaXB0U25hcHNob3QoZmlsZU5hbWU6IHN0cmluZykge1xuICAgICAgaWYgKCFmcy5leGlzdHNTeW5jKGZpbGVOYW1lKSkge1xuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBvcmlnaW5Db250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGZpbGVOYW1lKS50b1N0cmluZygpO1xuICAgICAgcmV0dXJuIHRzMC5TY3JpcHRTbmFwc2hvdC5mcm9tU3RyaW5nKG9wdHMudHJhbnNmb3JtU291cmNlRmlsZSA/IG9wdHMudHJhbnNmb3JtU291cmNlRmlsZShmaWxlTmFtZSwgb3JpZ2luQ29udGVudCkgOiBvcmlnaW5Db250ZW50KTtcbiAgICB9LFxuICAgIGdldENhbmNlbGxhdGlvblRva2VuKCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaXNDYW5jZWxsYXRpb25SZXF1ZXN0ZWQoKSB7XG4gICAgICAgICAgcmV0dXJuIHN0b3JlLmdldFZhbHVlKCkuaXNTdG9wcGVkO1xuICAgICAgICB9XG4gICAgICB9O1xuICAgIH0sXG4gICAgdXNlQ2FzZVNlbnNpdGl2ZUZpbGVOYW1lcygpIHsgcmV0dXJuIHRzMC5zeXMudXNlQ2FzZVNlbnNpdGl2ZUZpbGVOYW1lczsgfSxcbiAgICBnZXREZWZhdWx0TGliRmlsZU5hbWU6IG9wdGlvbnMgPT4gdHMwLmdldERlZmF1bHRMaWJGaWxlUGF0aChvcHRpb25zKSxcblxuICAgIHRyYWNlKHMpIHtcbiAgICAgIGRpc3BhdGNoRmFjdG9yeSgnbG9nJykoTG9nTGV2ZWwubG9nLCBzKTtcbiAgICAgIGNvbnNvbGUubG9nKCdbbGFuZy1zZXJ2aWNlIHRyYWNlXScsIHMpO1xuICAgIH0sXG4gICAgZXJyb3Iocykge1xuICAgICAgZGlzcGF0Y2hGYWN0b3J5KCdsb2cnKShMb2dMZXZlbC5lcnJvciwgcyk7XG4gICAgICBjb25zb2xlLmxvZygnW2xhbmctc2VydmljZSBlcnJvcl0nLCBzKTtcbiAgICB9LFxuICAgIGxvZyhzKSB7XG4gICAgICBkaXNwYXRjaEZhY3RvcnkoJ2xvZycpKExvZ0xldmVsLmxvZywgcyk7XG4gICAgICBjb25zb2xlLmxvZygnW2xhbmctc2VydmljZSBsb2ddJywgcyk7XG4gICAgfVxuICB9O1xuICBjb25zdCBkb2N1bWVudFJlZ2lzdHJ5ID0gdHMwLmNyZWF0ZURvY3VtZW50UmVnaXN0cnkoKTtcbiAgbGV0IHNlcnZpY2VzOiBfdHMuTGFuZ3VhZ2VTZXJ2aWNlIHwgdW5kZWZpbmVkO1xuICBjb25zdCBhZGRTb3VyY2VGaWxlJCA9IGFjdGlvbiQucGlwZShvZlR5cGUoJ2FkZFNvdXJjZUZpbGUnKSk7XG4gIGNvbnN0IGNoYW5nZVNvdXJjZUZpbGUkID0gYWN0aW9uJC5waXBlKG9mVHlwZSgnY2hhbmdlU291cmNlRmlsZScpKTtcbiAgY29uc3Qgc3RvcCQgPSBhY3Rpb24kLnBpcGUob2ZUeXBlKCdzdG9wJykpO1xuXG4gIGxldCB3YXRjaGVyOiBSZXR1cm5UeXBlPHR5cGVvZiBjaG9raWRhci53YXRjaD47XG5cbiAgcngubWVyZ2UoXG4gICAgYWN0aW9uJC5waXBlKFxuICAgICAgb2ZUeXBlKCd3YXRjaCcpLFxuICAgICAgb3AuZXhoYXVzdE1hcCgoe3BheWxvYWQ6IGRpcnN9KSA9PiAgbmV3IHJ4Lk9ic2VydmFibGU8bmV2ZXI+KCgpID0+IHtcbiAgICAgICAgaWYgKHdhdGNoZXIgPT0gbnVsbClcbiAgICAgICAgICB3YXRjaGVyID0gY2hva2lkYXIud2F0Y2goZGlycy5tYXAoZGlyID0+IGRpci5yZXBsYWNlKC9cXFxcL2csICcvJykpLCBvcHRzLndhdGNoZXIpO1xuXG4gICAgICAgIHdhdGNoZXIub24oJ2FkZCcsIHBhdGggPT4gZGlzcGF0Y2hGYWN0b3J5KCdhZGRTb3VyY2VGaWxlJykocGF0aCwgZmFsc2UpKTtcbiAgICAgICAgd2F0Y2hlci5vbignY2hhbmdlJywgcGF0aCA9PiBkaXNwYXRjaEZhY3RvcnkoJ2NoYW5nZVNvdXJjZUZpbGUnKShwYXRoKSk7XG4gICAgICAgIHJldHVybiAoKSA9PiB7XG4gICAgICAgICAgdm9pZCB3YXRjaGVyLmNsb3NlKCkudGhlbigoKSA9PiB7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgICAgICAgY29uc29sZS5sb2coJ1t0c2MtdXRpbF0gY2hva2lkYXIgd2F0Y2hlciBzdG9wcycpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9O1xuICAgICAgfSlcbiAgICAgIClcbiAgICApLFxuICAgIGFkZFNvdXJjZUZpbGUkLnBpcGUoXG4gICAgICBvcC5maWx0ZXIoKHtwYXlsb2FkOiBbZmlsZV19KSA9PiAvXFwuKD86dHN4P3xqc29uKSQvLnRlc3QoZmlsZSkpLFxuICAgICAgb3AubWFwKCh7cGF5bG9hZDogW2ZpbGVOYW1lLCBzeW5jXX0pID0+IHtcbiAgICAgICAgc2V0U3RhdGUocyA9PiB7XG4gICAgICAgICAgcy5maWxlcy5hZGQoZmlsZU5hbWUpO1xuICAgICAgICAgIHMudmVyc2lvbnMuc2V0KGZpbGVOYW1lLCAwKTtcbiAgICAgICAgICByZXR1cm4gcztcbiAgICAgICAgfSk7XG4gICAgICAgIGlmIChzeW5jKVxuICAgICAgICAgIGdldEVtaXRGaWxlKGZpbGVOYW1lKTtcbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgc2V0U3RhdGUocyA9PiB7XG4gICAgICAgICAgICBzLnVuZW1pdHRlZC5hZGQoZmlsZU5hbWUpO1xuICAgICAgICAgICAgcmV0dXJuIHM7XG4gICAgICAgICAgfSk7XG4gICAgICAgICAgcmV0dXJuIGZpbGVOYW1lO1xuICAgICAgICB9XG4gICAgICB9KSxcbiAgICAgIG9wLmZpbHRlcigoZmlsZSkgOiBmaWxlIGlzIHN0cmluZyA9PiBmaWxlICE9IG51bGwpLFxuICAgICAgb3AuZGVib3VuY2VUaW1lKDMzMyksXG4gICAgICBvcC5tYXAoKCkgPT4ge1xuICAgICAgICBmb3IgKGNvbnN0IGZpbGUgb2Ygc3RvcmUuZ2V0VmFsdWUoKS51bmVtaXR0ZWQudmFsdWVzKCkpIHtcbiAgICAgICAgICBnZXRFbWl0RmlsZShmaWxlKTtcbiAgICAgICAgfVxuICAgICAgICBzZXRTdGF0ZShzID0+IHtcbiAgICAgICAgICBzLnVuZW1pdHRlZC5jbGVhcigpO1xuICAgICAgICAgIHJldHVybiBzO1xuICAgICAgICB9KTtcbiAgICAgIH0pXG4gICAgKSxcbiAgICBjaGFuZ2VTb3VyY2VGaWxlJC5waXBlKFxuICAgICAgb3AuZmlsdGVyKCh7cGF5bG9hZDogZmlsZX0pID0+IC9cXC4oPzp0c3g/fGpzb24pJC8udGVzdChmaWxlKSksXG4gICAgICAvLyBUT0RPOiBkZWJvdW5jZSBvbiBzYW1lIGZpbGUgY2hhbmdlc1xuICAgICAgb3AubWFwKCh7cGF5bG9hZDogZmlsZU5hbWV9KSA9PiB7XG4gICAgICAgIHNldFN0YXRlKHMgPT4ge1xuICAgICAgICAgIGNvbnN0IHZlcnNpb24gPSBzLnZlcnNpb25zLmdldChmaWxlTmFtZSk7XG4gICAgICAgICAgcy52ZXJzaW9ucy5zZXQoZmlsZU5hbWUsICh2ZXJzaW9uICE9IG51bGwgPyB2ZXJzaW9uIDogMCkgKyAxKTtcbiAgICAgICAgICByZXR1cm4gcztcbiAgICAgICAgfSk7XG4gICAgICAgIGdldEVtaXRGaWxlKGZpbGVOYW1lKTtcbiAgICAgIH0pXG4gICAgKVxuICApLnBpcGUoXG4gICAgb3AudGFrZVVudGlsKHN0b3AkKSxcbiAgICBvcC5jYXRjaEVycm9yKChlcnIsIHNyYykgPT4ge1xuICAgICAgY29uc29sZS5lcnJvcignTGFuZ3VhZ2Ugc2VydmljZSBlcnJvcicsIGVycik7XG4gICAgICByZXR1cm4gc3JjO1xuICAgIH0pLFxuICAgIG9wLmZpbmFsaXplKCgpID0+IHtcbiAgICAgIHNldFN0YXRlKHMgPT4ge1xuICAgICAgICBzLmlzU3RvcHBlZCA9IHRydWU7XG4gICAgICAgIHJldHVybiBzO1xuICAgICAgfSk7XG4gICAgfSlcbiAgKS5zdWJzY3JpYmUoKTtcblxuICBmdW5jdGlvbiBnZXRFbWl0RmlsZShmaWxlTmFtZTogc3RyaW5nKSB7XG4gICAgaWYgKHNlcnZpY2VzID09IG51bGwpIHtcbiAgICAgIHNlcnZpY2VzID0gdHMwLmNyZWF0ZUxhbmd1YWdlU2VydmljZShzZXJ2aWNlSG9zdCwgZG9jdW1lbnRSZWdpc3RyeSk7XG4gICAgICBjb25zdCBjb0RpYWcgPSBzZXJ2aWNlcy5nZXRDb21waWxlck9wdGlvbnNEaWFnbm9zdGljcygpO1xuICAgICAgaWYgKGNvRGlhZy5sZW5ndGggPiAwKVxuICAgICAgICBkaXNwYXRjaEZhY3RvcnkoJ29uRW1pdEZhaWx1cmUnKShcbiAgICAgICAgICBmaWxlTmFtZSxcbiAgICAgICAgICB0czAuZm9ybWF0RGlhZ25vc3RpY3NXaXRoQ29sb3JBbmRDb250ZXh0KGNvRGlhZywgZm9ybWF0SG9zdCksXG4gICAgICAgICAgJ2NvbXBpbGVyT3B0aW9ucycpO1xuICAgIH1cbiAgICBjb25zdCBvdXRwdXQgPSBzZXJ2aWNlcy5nZXRFbWl0T3V0cHV0KGZpbGVOYW1lKTtcbiAgICBpZiAob3V0cHV0LmVtaXRTa2lwcGVkKSB7XG4gICAgICAvLyBjb25zb2xlLmxvZyhgRW1pdHRpbmcgJHtmaWxlTmFtZX0gZmFpbGVkYCk7XG4gICAgfVxuXG4gICAgY29uc3Qgc3ludERpYWcgPSBzZXJ2aWNlcy5nZXRTeW50YWN0aWNEaWFnbm9zdGljcyhmaWxlTmFtZSk7XG4gICAgaWYgKHN5bnREaWFnLmxlbmd0aCA+IDApIHtcbiAgICAgIGRpc3BhdGNoRmFjdG9yeSgnb25FbWl0RmFpbHVyZScpKFxuICAgICAgICBmaWxlTmFtZSxcbiAgICAgICAgdHMwLmZvcm1hdERpYWdub3N0aWNzV2l0aENvbG9yQW5kQ29udGV4dChzeW50RGlhZywgZm9ybWF0SG9zdCksXG4gICAgICAgICdzeW50YWN0aWMnKTtcbiAgICB9XG4gICAgY29uc3Qgc2VtYW50aWNEaWFnID0gc2VydmljZXMuZ2V0U2VtYW50aWNEaWFnbm9zdGljcyhmaWxlTmFtZSk7XG5cbiAgICBpZiAoc2VtYW50aWNEaWFnLmxlbmd0aCA+IDApIHtcbiAgICAgIGRpc3BhdGNoRmFjdG9yeSgnb25FbWl0RmFpbHVyZScpKFxuICAgICAgICBmaWxlTmFtZSxcbiAgICAgICAgdHMwLmZvcm1hdERpYWdub3N0aWNzV2l0aENvbG9yQW5kQ29udGV4dChzZW1hbnRpY0RpYWcsIGZvcm1hdEhvc3QpLFxuICAgICAgICAnc2VtYW50aWMnKTtcbiAgICB9XG5cbiAgICBjb25zdCBzdWdnZXN0cyA9IHNlcnZpY2VzLmdldFN1Z2dlc3Rpb25EaWFnbm9zdGljcyhmaWxlTmFtZSk7XG5cbiAgICBmb3IgKGNvbnN0IHN1ZyBvZiBzdWdnZXN0cykge1xuICAgICAgY29uc3Qge2xpbmUsIGNoYXJhY3Rlcn0gPSBzdWcuZmlsZS5nZXRMaW5lQW5kQ2hhcmFjdGVyT2ZQb3NpdGlvbihzdWcuc3RhcnQpO1xuICAgICAgZGlzcGF0Y2hGYWN0b3J5KCdvblN1Z2dlc3QnKShmaWxlTmFtZSwgYCR7ZmlsZU5hbWV9OiR7bGluZSArIDF9OiR7Y2hhcmFjdGVyICsgMX0gYCArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRzMC5mbGF0dGVuRGlhZ25vc3RpY01lc3NhZ2VUZXh0KHN1Zy5tZXNzYWdlVGV4dCwgJ1xcbicsIDIpKTtcbiAgICB9XG5cbiAgICBvdXRwdXQub3V0cHV0RmlsZXMuZm9yRWFjaChvID0+IHtcbiAgICAgIGRpc3BhdGNoRmFjdG9yeSgnX2VtaXRGaWxlJykoby5uYW1lLCBvLnRleHQpO1xuICAgIH0pO1xuICB9XG5cbiAgcmV0dXJuIHtcbiAgICBkaXNwYXRjaEZhY3RvcnksIGFjdGlvbiQsIG9mVHlwZSxcbiAgICBzdG9yZTogc3RvcmUucGlwZShcbiAgICAgIG9wLm1hcChzID0+IHMuZmlsZXMpXG4gICAgKVxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdGVzdChkaXI6IHN0cmluZykge1xuICBjb25zdCB7YWN0aW9uJCwgb2ZUeXBlfSA9IGxhbmd1YWdlU2VydmljZXMoW2Rpcl0pO1xuICBhY3Rpb24kLnBpcGUoXG4gICAgb2ZUeXBlKCdfZW1pdEZpbGUnKSxcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIG9wLm1hcCgoe3BheWxvYWQ6IFtmaWxlXX0pID0+IGNvbnNvbGUubG9nKCdlbWl0JywgZmlsZSkpXG4gICkuc3Vic2NyaWJlKCk7XG59XG4iXX0=