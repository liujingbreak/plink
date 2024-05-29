"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.languageServices = exports.LogLevel = exports.createTranspileFileWithTsCheck = void 0;
const tslib_1 = require("tslib");
const fs_1 = tslib_1.__importDefault(require("fs"));
const typescript_1 = tslib_1.__importDefault(require("typescript"));
const rx = tslib_1.__importStar(require("rxjs"));
const op = tslib_1.__importStar(require("rxjs/operators"));
const reactivizer_1 = require("@wfh/reactivizer");
// import {conciseConsoleLogger} from '@wfh/reactivizer/dist/nodejs-utils';
const chokidar_1 = tslib_1.__importDefault(require("chokidar"));
function createTranspileFileWithTsCheck(ts = typescript_1.default, tsconfigJson, tsconfigDir) {
    const service = languageServices(ts);
    const { i, o } = service;
    i.ft.setTsConfig(tsconfigJson, tsconfigDir).dp();
    // service.config({debug: true});
    // service.r('doneResolveCompilerOption', service.ot.l.doneResolveCompilerOption.pipe(
    //   rx.map(([, co]) => {
    //     console.log('compilerOoptions:', co);
    //   })
    // ));
    return function (content, file) {
        var _a;
        let destFile;
        let sourceMap;
        let unknownOutputFile;
        let error;
        i.ft.addSourceFile(file, true, content)
            .od(o.at.emitFile).pipe(rx.map(([, outputFile, outputContent]) => {
            if (/\.[mc]?js/.test(outputFile)) {
                destFile = outputContent;
            }
            else if (outputFile.endsWith('.map')) {
                sourceMap = outputContent;
            }
            else {
                unknownOutputFile = outputFile;
            }
        }), 
        // rx.take(1),
        rx.takeUntil(rx.merge(o.pt.onEmitFailure, o.pt.onSuggest).pipe(rx.map(([, file, diagnostics]) => {
            // eslint-disable-next-line no-console
            console.log('[tsc-util]', file, diagnostics);
        }))), rx.catchError(err => {
            // eslint-disable-next-line no-console
            console.log('[tsc-util] catch error', err);
            error = err;
            return rx.EMPTY;
        }))
            .subscribe();
        if (destFile == null) {
            throw new Error(`Failed to compile ${file} (unknown: ${unknownOutputFile !== null && unknownOutputFile !== void 0 ? unknownOutputFile : ''}) ${error ? (_a = error.stack) !== null && _a !== void 0 ? _a : '' : ''}`);
        }
        return [destFile, sourceMap];
    };
}
exports.createTranspileFileWithTsCheck = createTranspileFileWithTsCheck;
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["trace"] = 0] = "trace";
    LogLevel[LogLevel["log"] = 1] = "log";
    LogLevel[LogLevel["error"] = 2] = "error";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
const inputTableFor = ['setTsConfig', 'setSourceFileTranspiler', 'setDiagnosticFileNameFormatter'];
const outputTableFor = [
    'versionsUpdated', 'fileChanged', 'unemittedUpdated',
    'setStopped', 'fileContentCache', 'doneResolveCompilerOption'
];
function languageServices(ts = typescript_1.default) {
    const ts0 = ts;
    const rc = new reactivizer_1.ReactorComposite2({
        name: 'Plink TS lang service',
        debug: false,
        // log: conciseConsoleLogger,
        logStyle: 'noParam',
        inputTableFor,
        outputTableFor,
        debugExcludeTypes: ['versionsUpdated', 'unemittedUpdated', 'addSourceFile']
    });
    const { i, o, inputTable, outputTable, r } = rc;
    r('setTsConfig -> doneResolveCompilerOption', i.pt.setTsConfig.pipe(rx.map(([m, tsconfigJson, dir]) => {
        tsconfigJson.include = ['nothing.ts'];
        tsconfigJson.compilerOptions.incremental = false;
        // console.log(tsconfigJson);
        const parsed = ts0.parseJsonConfigFileContent(tsconfigJson, ts0.sys, dir);
        const { options } = parsed;
        if (parsed.errors.length > 1) {
            const errorMsgs = parsed.errors.map(err => err.messageText).join('\n');
            o.ft.log(LogLevel.error, errorMsgs).dp();
            console.error(errorMsgs);
        }
        o.ft.doneResolveCompilerOption(options).dp(m);
    })));
    // const co = typeof opts.tscOpts === 'function' ? opts.tscOpts() : plinkNodeJsCompilerOption(ts0, opts.tscOpts);
    let services;
    let watcher;
    r('watch -> addSourceFile, changeSourceFile', i.pt.watch.pipe(rx.exhaustMap(([, dirs, watchOpts]) => new rx.Observable(() => {
        if (watcher == null)
            watcher = chokidar_1.default.watch(dirs.map(dir => dir.replace(/\\/g, '/')), watchOpts);
        watcher.on('add', path => i.ft.addSourceFile(path, false).dp());
        watcher.on('change', path => {
            void fs_1.default.promises.readFile(path, 'utf8')
                .then(content => {
                i.ft.changeSourceFile(path, content).dp();
            });
        });
        return () => {
            void watcher.close().then(() => {
                // eslint-disable-next-line no-console
                console.log('[tsc-util] chokidar watcher stops');
            });
        };
    }))));
    const state$ = rx.combineLatest([
        outputTable.l.fileChanged, outputTable.l.versionsUpdated,
        outputTable.l.fileContentCache, outputTable.l.unemittedUpdated
    ]).pipe(rx.map(([[, files], [, versions], [, fileContentCache], [, unemitted]]) => [files, versions, fileContentCache, unemitted]));
    r('addSourceFile - > compileFile, fileChanged..., unemittedUpdated', i.pt.addSourceFile.pipe(rx.filter(([, file]) => !file.endsWith('.d.ts') && /\.(?:[mc]?tsx?|json)$/.test(file)), rx.switchMap(([m, fileName, sync, content]) => {
        return state$.pipe(rx.take(1), rx.map(([files, versions, fileContentCache, unemitted]) => {
            files.add(fileName);
            versions.set(fileName.replace(/\\/g, '/'), 0);
            o.ft.fileChanged(files).dp(m);
            o.ft.versionsUpdated(versions).dp(m);
            if (content != null) {
                fileContentCache.set(fileName.replace(/\\/g, '/'), content);
                o.ft.fileContentCache(fileContentCache).dp(m);
            }
            if (sync)
                o.ft.compileFile(fileName).dp(m);
            else {
                unemitted.add([fileName, m.i]);
                o.ft.unemittedUpdated(unemitted).dp(m);
                return fileName;
            }
        }));
    }), rx.filter((file) => file != null), rx.debounceTime(333), rx.withLatestFrom(outputTable.l.unemittedUpdated), rx.map(([, [, unemitted]]) => {
        for (const [file, id] of unemitted.values()) {
            o.ft.compileFile(file).dp(id);
        }
        o.ft.unemittedUpdated(unemitted).dp();
    })));
    r('changeSourceFile -> compileFile', i.pt.changeSourceFile.pipe(rx.filter(([, file]) => !file.endsWith('.d.ts') && /\.(?:tsx?|json)$/.test(file)), rx.withLatestFrom(outputTable.l.versionsUpdated, outputTable.l.fileContentCache), 
    // TODO: debounce on same file changes
    op.map(([[m, fileName, content], [, versions], [, fileContentCache]]) => {
        const normFile = fileName.replace(/\\/g, '/');
        const version = versions.get(normFile);
        versions.set(normFile, (version != null ? version : 0) + 1);
        o.ft.versionsUpdated(versions).dp(m);
        if (content != null) {
            fileContentCache.set(normFile, content);
            o.ft.fileContentCache(fileContentCache).dp(m);
        }
        o.ft.compileFile(fileName).dp(m);
    })));
    r('stop', i.pt.stop.pipe(rx.tap(([m]) => {
        o.ft.setStopped(true).dp(m);
    })));
    r('compileFile -> didCompileFile, emitFile', o.pt.compileFile.pipe(rx.mergeMap(a => rx.combineLatest([
        outputTable.l.doneResolveCompilerOption,
        inputTable.l.setSourceFileTranspiler,
        inputTable.l.setDiagnosticFileNameFormatter
    ]).pipe(rx.take(1), rx.map(b => [a, ...b]))), rx.map(([[meta, fileName], [, co], [, sourceFileTranspiler], [, fileNameFormatter]]) => {
        const formatHost = {
            getCanonicalFileName: fileNameFormatter,
            getCurrentDirectory: typescript_1.default.sys.getCurrentDirectory,
            getNewLine: () => typescript_1.default.sys.newLine
        };
        if (services == null) {
            const documentRegistry = ts0.createDocumentRegistry();
            const serviceHost = Object.assign(Object.assign({}, ts0.sys), { // Important, default language service host does not implement methods like fileExists
                getScriptFileNames() {
                    return Array.from(outputTable.getData().fileChanged[0].values());
                },
                getScriptVersion(fileName) {
                    return outputTable.getData().versionsUpdated[0].get(fileName.replace(/\\/g, '/')) + '' || '-1';
                },
                getCompilationSettings() {
                    return co;
                },
                getScriptSnapshot(fileName) {
                    // console.log('getScriptSnapshot()', fileName);
                    if (!fs_1.default.existsSync(fileName)) {
                        return undefined;
                    }
                    const cached = outputTable.getData().fileContentCache[0].get(fileName.replace(/\\/g, '/'));
                    const originContent = cached != null ? cached : fs_1.default.readFileSync(fileName, 'utf8');
                    return ts0.ScriptSnapshot.fromString(sourceFileTranspiler(fileName, originContent));
                },
                getCancellationToken() {
                    return {
                        isCancellationRequested() {
                            return outputTable.getData().setStopped[0];
                        }
                    };
                },
                useCaseSensitiveFileNames() {
                    return ts0.sys.useCaseSensitiveFileNames;
                }, getDefaultLibFileName: options => ts0.getDefaultLibFilePath(options), trace(s) {
                    o.ft.log(LogLevel.log, s).dp();
                    // console.log('[lang-service trace]', s);
                },
                error(s) {
                    o.ft.log(LogLevel.error, s).dp();
                    // eslint-disable-next-line no-console
                    console.log('[lang-service error]', s);
                },
                log(s) {
                    o.ft.log(LogLevel.log, s).dp();
                    // eslint-disable-next-line no-console
                    console.log('[lang-service log]', s);
                } });
            services = ts0.createLanguageService(serviceHost, documentRegistry);
            const coDiag = services.getCompilerOptionsDiagnostics();
            if (coDiag.length > 0)
                o.ft.onEmitFailure(fileName, ts0.formatDiagnosticsWithColorAndContext(coDiag, formatHost), 'compilerOptions').dp(meta);
        }
        const output = services.getEmitOutput(fileName);
        if (output.emitSkipped) {
            // console.log(`Emitting ${fileName} failed`);
        }
        const syntDiag = services.getSyntacticDiagnostics(fileName);
        if (syntDiag.length > 0) {
            o.ft.onEmitFailure(fileName, ts0.formatDiagnosticsWithColorAndContext(syntDiag, formatHost), 'syntactic').dp(meta);
        }
        const semanticDiag = services.getSemanticDiagnostics(fileName);
        if (semanticDiag.length > 0) {
            o.ft.onEmitFailure(fileName, ts0.formatDiagnosticsWithColorAndContext(semanticDiag, formatHost), 'semantic').dp(meta);
        }
        const suggests = services.getSuggestionDiagnostics(fileName);
        for (const sug of suggests) {
            const { line, character } = sug.file.getLineAndCharacterOfPosition(sug.start);
            o.ft.onSuggest(fileName, `${fileName}:${line + 1}:${character + 1} ` +
                ts0.flattenDiagnosticMessageText(sug.messageText, '\n', 2)).dp(meta);
        }
        output.outputFiles.forEach(file => {
            o.ft.emitFile(file.name, file.text).dp(meta.r);
        });
        o.ft.didCompileFile().dp(meta);
    })));
    o.ft.setStopped(false).dp();
    o.ft.fileContentCache(new Map()).dp();
    o.ft.versionsUpdated(new Map()).dp();
    o.ft.unemittedUpdated(new Set()).dp();
    o.ft.fileChanged(new Set()).dp();
    i.ft.setSourceFileTranspiler((_file, content) => content).dp();
    i.ft.setDiagnosticFileNameFormatter(file => file).dp();
    return rc;
}
exports.languageServices = languageServices;
//# sourceMappingURL=tsc-language-service.js.map