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
//# sourceMappingURL=tsc-util.js.map