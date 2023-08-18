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
exports.test = exports.registerNode = exports.languageServices = exports.LogLevel = exports.createTranspileFileWithTsCheck = exports.transpileSingleFile = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
// import inspector from 'inspector';
const typescript_1 = __importDefault(require("typescript"));
const rx = __importStar(require("rxjs"));
const op = __importStar(require("rxjs/operators"));
const chokidar_1 = __importDefault(require("chokidar"));
const rx_utils_1 = require("../../../packages/redux-toolkit-observable/dist/rx-utils");
// import {createActionStream} from '../../../packages/redux-toolkit-observable/rx-utils';
const ts_cmd_util_1 = require("../ts-cmd-util");
const misc_1 = require("./misc");
function plinkNodeJsCompilerOptionJson(ts, opts = {}) {
    const { jsx = false, inlineSourceMap = false, emitDeclarationOnly = false } = opts;
    let baseCompilerOptions;
    if (jsx) {
        const baseTsconfigFile2 = require.resolve('../../tsconfig-tsx.json');
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
    const compilerOptions = Object.assign(Object.assign({}, baseCompilerOptions), { target: 'ES2017', importHelpers: true, declaration: true, tsBuildInfoFile: opts.tsBuildInfoFile, 
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
    const { outputText, diagnostics, sourceMapText } = ts.transpileModule(content, {
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
function createTranspileFileWithTsCheck(ts = typescript_1.default, opts) {
    const { action$, ofType, dispatcher } = languageServices(ts, opts);
    return function (content, file) {
        let destFile;
        let sourceMap;
        rx.merge(action$.pipe(ofType('emitFile'), op.map(({ payload: [outputFile, outputContent] }) => {
            if (/\.[mc]?js/.test(outputFile)) {
                destFile = outputContent;
            }
            else if (outputFile.endsWith('.map')) {
                sourceMap = outputContent;
            }
        }), op.takeWhile(() => destFile == null || sourceMap == null)), action$.pipe(ofType('onEmitFailure', 'onSuggest'), op.map(({ payload: [file, diagnostics] }) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            console.error('[tsc-util]', diagnostics);
        }))).subscribe();
        dispatcher.addSourceFile(file, true, content);
        return {
            code: destFile,
            map: sourceMap
        };
    };
}
exports.createTranspileFileWithTsCheck = createTranspileFileWithTsCheck;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["trace"] = 0] = "trace";
    LogLevel[LogLevel["log"] = 1] = "log";
    LogLevel[LogLevel["error"] = 2] = "error";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
function languageServices(ts = typescript_1.default, opts = {}) {
    const ts0 = ts;
    const { dispatcher, dispatchFactory, action$, actionOfType, ofType } = (0, rx_utils_1.createActionStreamByType)();
    const store = new rx.BehaviorSubject({
        versions: new Map(),
        files: new Set(),
        unemitted: new Set(),
        isStopped: false,
        fileContentCache: new Map()
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
            return store.getValue().versions.get(fileName.replace(/\\/g, '/')) + '' || '-1';
        },
        getCompilationSettings() {
            dispatcher.onCompilerOptions(co);
            return co;
        },
        getScriptSnapshot(fileName) {
            // console.log('getScriptSnapshot()', fileName);
            if (!fs_1.default.existsSync(fileName)) {
                return undefined;
            }
            const cached = store.getValue().fileContentCache.get(fileName.replace(/\\/g, '/'));
            const originContent = cached != null ? cached : fs_1.default.readFileSync(fileName, 'utf8');
            return ts0.ScriptSnapshot.fromString(opts.transformSourceFile
                ? opts.transformSourceFile(fileName, originContent)
                : originContent);
        },
        getCancellationToken() {
            return {
                isCancellationRequested() {
                    return store.getValue().isStopped;
                }
            };
        },
        useCaseSensitiveFileNames() {
            return ts0.sys.useCaseSensitiveFileNames;
        }, getDefaultLibFileName: options => ts0.getDefaultLibFilePath(options), trace(s) {
            dispatcher.log(LogLevel.log, s);
            // console.log('[lang-service trace]', s);
        },
        error(s) {
            dispatcher.log(LogLevel.error, s);
            // eslint-disable-next-line no-console
            console.log('[lang-service error]', s);
        },
        log(s) {
            dispatcher.log(LogLevel.log, s);
            // eslint-disable-next-line no-console
            console.log('[lang-service log]', s);
        } });
    const documentRegistry = ts0.createDocumentRegistry();
    let services;
    const stop$ = action$.pipe(ofType('stop'));
    let watcher;
    rx.merge(actionOfType('watch').pipe(op.exhaustMap(({ payload: dirs }) => new rx.Observable(() => {
        if (watcher == null)
            watcher = chokidar_1.default.watch(dirs.map(dir => dir.replace(/\\/g, '/')), opts.watcher);
        watcher.on('add', path => dispatcher.addSourceFile(path, false));
        watcher.on('change', path => {
            void fs_1.default.promises.readFile(path, 'utf8')
                .then(content => {
                dispatcher.changeSourceFile(path, content);
            });
        });
        return () => {
            void watcher.close().then(() => {
                // eslint-disable-next-line no-console
                console.log('[tsc-util] chokidar watcher stops');
            });
        };
    }))), actionOfType('addSourceFile').pipe(op.filter(({ payload: [file] }) => !file.endsWith('.d.ts') && /\.(?:[mc]?tsx?|json)$/.test(file)), op.map(({ payload: [fileName, sync, content] }) => {
        setState(s => {
            s.files.add(fileName);
            s.versions.set(fileName.replace(/\\/g, '/'), 0);
            if (content != null)
                s.fileContentCache.set(fileName.replace(/\\/g, '/'), content);
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
    })), actionOfType('changeSourceFile').pipe(op.filter(({ payload: [file] }) => !file.endsWith('.d.ts') && /\.(?:tsx?|json)$/.test(file)), 
    // TODO: debounce on same file changes
    op.map(({ payload: [fileName, content] }) => {
        setState(s => {
            const normFile = fileName.replace(/\\/g, '/');
            const version = s.versions.get(normFile);
            s.versions.set(normFile, (version != null ? version : 0) + 1);
            if (content != null) {
                s.fileContentCache.set(normFile, content);
            }
            return s;
        });
        getEmitFile(fileName);
    })))
        .pipe(op.takeUntil(stop$), op.catchError((err, src) => {
        console.error('Language service error', err);
        return src;
    }), op.finalize(() => {
        setState(s => {
            s.isStopped = true;
            return s;
        });
    }))
        .subscribe();
    function getEmitFile(fileName) {
        if (services == null) {
            services = ts0.createLanguageService(serviceHost, documentRegistry);
            const coDiag = services.getCompilerOptionsDiagnostics();
            if (coDiag.length > 0)
                dispatcher.onEmitFailure(fileName, ts0.formatDiagnosticsWithColorAndContext(coDiag, formatHost), 'compilerOptions');
        }
        const output = services.getEmitOutput(fileName);
        if (output.emitSkipped) {
            // console.log(`Emitting ${fileName} failed`);
        }
        const syntDiag = services.getSyntacticDiagnostics(fileName);
        if (syntDiag.length > 0) {
            dispatcher.onEmitFailure(fileName, ts0.formatDiagnosticsWithColorAndContext(syntDiag, formatHost), 'syntactic');
        }
        const semanticDiag = services.getSemanticDiagnostics(fileName);
        if (semanticDiag.length > 0) {
            dispatcher.onEmitFailure(fileName, ts0.formatDiagnosticsWithColorAndContext(semanticDiag, formatHost), 'semantic');
        }
        const suggests = services.getSuggestionDiagnostics(fileName);
        for (const sug of suggests) {
            const { line, character } = sug.file.getLineAndCharacterOfPosition(sug.start);
            dispatcher.onSuggest(fileName, `${fileName}:${line + 1}:${character + 1} ` +
                ts0.flattenDiagnosticMessageText(sug.messageText, '\n', 2));
        }
        output.outputFiles.forEach(o => {
            dispatcher.emitFile(o.name, o.text);
        });
    }
    return {
        dispatcher,
        dispatchFactory,
        action$,
        ofType,
        store: store.pipe(op.map(s => s.files))
    };
}
exports.languageServices = languageServices;
function registerNode() {
    const compile = createTranspileFileWithTsCheck(typescript_1.default, {
        tscOpts: { inlineSourceMap: true, basePath: misc_1.plinkEnv.workDir }
    });
    const ext = '.ts';
    const old = require.extensions[ext] || require.extensions['.js'];
    require.extensions[ext] = function (m, filename) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        const _compile = m._compile;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        m._compile = function (code, fileName) {
            const { code: jscode } = compile(code, fileName);
            // console.log(jscode);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
            return _compile.call(this, jscode, fileName);
        };
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return old(m, filename);
    };
}
exports.registerNode = registerNode;
function test(dir) {
    const { action$, ofType } = languageServices([dir]);
    action$
        .pipe(ofType('emitFile'), 
    // eslint-disable-next-line no-console
    op.map(({ payload: [file] }) => console.log('emit', file)))
        .subscribe();
}
exports.test = test;
//# sourceMappingURL=tsc-util.js.map