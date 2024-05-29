import fs from 'fs';
import _ts from 'typescript';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {ReactorComposite2, SingleActionFactory, ActionMeta} from '@wfh/reactivizer';
// import {conciseConsoleLogger} from '@wfh/reactivizer/dist/nodejs-utils';
import chokidar from 'chokidar';
import {TsconfigType} from '../../package-mgr/package-mgr2-utils';

export function createTranspileFileWithTsCheck(ts: any = _ts, tsconfigJson: TsconfigType, tsconfigDir: string) {
  const {i, o} = languageServices(ts);
  i.ft.setTsConfig(tsconfigJson, tsconfigDir).dp();
  return function(content: string, file: string) {
    let destFile: string | undefined;
    let sourceMap: string | undefined;
    let unknownOutputFile: string | undefined;
    let error: Error | undefined;
    i.ft.addSourceFile(file, true, content)
      .od(o.at.emitFile).pipe(
        rx.map(([, outputFile, outputContent]) => {
          if (/\.[mc]?js/.test(outputFile)) {
            destFile = outputContent;
          } else if (outputFile.endsWith('.map')) {
            sourceMap = outputContent;
          } else {
            unknownOutputFile = outputFile;
          }
        }),
        // rx.take(1),
        rx.takeUntil(rx.merge( o.pt.onEmitFailure, o.pt.onSuggest).pipe(
          rx.map(([, file, diagnostics]) => {
            // eslint-disable-next-line no-console
            console.log('[tsc-util]', file, diagnostics);
          })
        )),
        rx.catchError(err => {
          // eslint-disable-next-line no-console
          console.log('[tsc-util] catch error', err);
          error = err as Error;
          return rx.EMPTY;
        })
      )
      .subscribe();
    if (destFile == null) {
      throw new Error(`Failed to compile ${file} (unknown: ${unknownOutputFile ?? ''}) ${error ? error.stack ?? '' : ''}`);
    }

    return [destFile, sourceMap!] as const;
  };
}
export enum LogLevel {
  trace,
  log,
  error
}
type LangServiceInput = {
  setTsConfig(json: TsconfigType, baseDirOfTsconfigFile: string): SingleActionFactory;
  watch(dirs: string[], watchOptions?: chokidar.WatchOptions): SingleActionFactory;
  addSourceFile(file: string, sync: boolean, content?: string): SingleActionFactory;
  changeSourceFile(file: string, content: string | undefined | null): SingleActionFactory;
  setSourceFileTranspiler(transpiler: (file: string, content: string) => string): SingleActionFactory;
  setDiagnosticFileNameFormatter(cb: (file: string) => string): SingleActionFactory;
  /** stop watch */
  stop(): SingleActionFactory;
};

type LangServiceOutput = {
  doneResolveCompilerOption(co: _ts.CompilerOptions): SingleActionFactory;
  compileFile(fileName: string): SingleActionFactory;
  log(level: LogLevel, msg: string): SingleActionFactory;
  onSuggest(file: string, msg: string): SingleActionFactory;
  onEmitFailure(
    file: string,
    diagnostics: string,
    type: 'compilerOptions' | 'syntactic' | 'semantic'
  ): SingleActionFactory;
  /** Under context of addSourceFile */
  emitFile(file: string, content: string): SingleActionFactory;
};

interface LangServiceStore {
  versionsUpdated(versions: Map<string, number>): SingleActionFactory;
  fileChanged(files: Set<string>): SingleActionFactory;
  unemittedUpdated(files: Set<[file: string, forActionId: ActionMeta['i']]>): SingleActionFactory;
  setStopped(stopped: boolean): SingleActionFactory;
  fileContentCache(cache: Map<string, string>): SingleActionFactory;
}

const inputTableFor = ['setTsConfig', 'setSourceFileTranspiler', 'setDiagnosticFileNameFormatter'] as const;

const outputTableFor = [
  'versionsUpdated', 'fileChanged', 'unemittedUpdated',
  'setStopped', 'fileContentCache', 'doneResolveCompilerOption'
] as const;

export function languageServices(ts: any = _ts): LanguageServiceType {
  const ts0 = ts as typeof _ts;
  const rc = new ReactorComposite2<LangServiceInput, LangServiceOutput & LangServiceStore, typeof inputTableFor, typeof outputTableFor>({
    name: 'Plink TS lang service',
    debug: false,
    // log: conciseConsoleLogger,
    logStyle: 'noParam',
    inputTableFor,
    outputTableFor
  });

  const {i, o, inputTable, outputTable, r} = rc;
  r('setTsConfig -> doneResolveCompilerOption', i.pt.setTsConfig.pipe(
    rx.map(([m, tsconfigJson, dir]) => {
      delete tsconfigJson.include;
      tsconfigJson.compilerOptions.incremental = false;
      tsconfigJson.compilerOptions.inlineSourceMap = true;
      const parsed = ts0.parseJsonConfigFileContent(tsconfigJson, ts0.sys, dir);
      const {options} = parsed;
      o.ft.doneResolveCompilerOption(options).dp(m);
    })
  ));
  // const co = typeof opts.tscOpts === 'function' ? opts.tscOpts() : plinkNodeJsCompilerOption(ts0, opts.tscOpts);
  let services: _ts.LanguageService | undefined;
  let watcher: ReturnType<typeof chokidar.watch>;
  r('watch -> addSourceFile, changeSourceFile', i.pt.watch.pipe(
    rx.exhaustMap(([, dirs, watchOpts]) =>
      new rx.Observable<never>(() => {
        if (watcher == null)
          watcher = chokidar.watch(dirs.map(dir => dir.replace(/\\/g, '/')), watchOpts);

        watcher.on('add', path => i.ft.addSourceFile(path, false).dp());
        watcher.on('change', path => {
          void fs.promises.readFile(path, 'utf8')
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
      })
    )
  ));
  const state$ = rx.combineLatest([
    outputTable.l.fileChanged, outputTable.l.versionsUpdated,
    outputTable.l.fileContentCache, outputTable.l.unemittedUpdated
  ]).pipe(
    rx.map(([[, files], [, versions], [, fileContentCache], [, unemitted]]) => [files, versions, fileContentCache, unemitted] as const)
  );
  r('addSourceFile - > compileFile, fileChanged..., unemittedUpdated', i.pt.addSourceFile.pipe(
    rx.filter(([, file]) => !file.endsWith('.d.ts') && /\.(?:[mc]?tsx?|json)$/.test(file)),
    rx.switchMap(([m, fileName, sync, content]) => {
      return state$.pipe(
        rx.take(1),
        rx.map(([files, versions, fileContentCache, unemitted]) => {
          files.add(fileName);
          versions.set(fileName.replace(/\\/g, '/'), 0);
          o.ft.fileChanged(files).dp(m);
          o.ft.versionsUpdated(versions).dp(m);
          if (content != null) {
            fileContentCache.set(fileName.replace(/\\/g, '/'), content);
            o.ft.fileContentCache(fileContentCache).dp(m);
          }
          if (sync) o.ft.compileFile(fileName).dp(m);
          else {
            unemitted.add([fileName, m.i]);
            o.ft.unemittedUpdated(unemitted).dp(m);
            return fileName;
          }
        })
      );
    }),
    rx.filter((file): file is string => file != null),
    rx.debounceTime(333),
    rx.withLatestFrom(outputTable.l.unemittedUpdated),
    rx.map(([, [, unemitted]]) => {
      for (const [file, id] of unemitted.values()) {
        o.ft.compileFile(file).dp(id);
      }
      o.ft.unemittedUpdated(unemitted).dp();
    })
  ));
  r('changeSourceFile -> compileFile', i.pt.changeSourceFile.pipe(
    rx.filter(([, file]) => !file.endsWith('.d.ts') && /\.(?:tsx?|json)$/.test(file)),
    rx.withLatestFrom(outputTable.l.versionsUpdated,
      outputTable.l.fileContentCache),
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
    })
  ));
  r('stop', i.pt.stop.pipe(
    rx.tap(([m]) => {
      o.ft.setStopped(true).dp(m);
    })
  ));
  r('compileFile', o.pt.compileFile.pipe(
    rx.combineLatestWith(outputTable.l.doneResolveCompilerOption),
    rx.mergeMap(a => rx.combineLatest([
      inputTable.l.setSourceFileTranspiler,
      inputTable.l.setDiagnosticFileNameFormatter
    ]).pipe(
      rx.take(1),
      rx.map(b => [...a, ...b] as const)
    )),
    rx.map(([[meta, fileName], [, co], [, sourceFileTranspiler], [, fileNameFormatter]]) => {
      const formatHost: _ts.FormatDiagnosticsHost = {
        getCanonicalFileName: fileNameFormatter,
        getCurrentDirectory: _ts.sys.getCurrentDirectory,
        getNewLine: () => _ts.sys.newLine
      };
      if (services == null) {
        const documentRegistry = ts0.createDocumentRegistry();
        const serviceHost: _ts.LanguageServiceHost = {
          ...ts0.sys, // Important, default language service host does not implement methods like fileExists
          getScriptFileNames() {
            return Array.from(outputTable.getData().fileChanged[0]!.values());
          },
          getScriptVersion(fileName: string) {
            return outputTable.getData().versionsUpdated[0]!.get(fileName.replace(/\\/g, '/')) + '' || '-1';
          },
          getCompilationSettings() {
            return co;
          },
          getScriptSnapshot(fileName: string) {
            // console.log('getScriptSnapshot()', fileName);
            if (!fs.existsSync(fileName)) {
              return undefined;
            }

            const cached = outputTable.getData().fileContentCache[0]!.get(fileName.replace(/\\/g, '/'));
            const originContent = cached != null ? cached : fs.readFileSync(fileName, 'utf8');
            return ts0.ScriptSnapshot.fromString(sourceFileTranspiler(fileName, originContent));
          },
          getCancellationToken() {
            return {
              isCancellationRequested() {
                return outputTable.getData().setStopped[0]!;
              }
            };
          },
          useCaseSensitiveFileNames() {
            return ts0.sys.useCaseSensitiveFileNames;
          },
          getDefaultLibFileName: options => ts0.getDefaultLibFilePath(options),

          trace(s) {
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
          }
        };
        services = ts0.createLanguageService(serviceHost, documentRegistry);
        const coDiag = services.getCompilerOptionsDiagnostics();
        if (coDiag.length > 0)
          o.ft.onEmitFailure(
            fileName,
            ts0.formatDiagnosticsWithColorAndContext(coDiag, formatHost),
            'compilerOptions'
          ).dp(meta);
      }
      const output = services.getEmitOutput(fileName);
      if (output.emitSkipped) {
      // console.log(`Emitting ${fileName} failed`);
      }
      const syntDiag = services.getSyntacticDiagnostics(fileName);
      if (syntDiag.length > 0) {
        o.ft.onEmitFailure(
          fileName,
          ts0.formatDiagnosticsWithColorAndContext(syntDiag, formatHost),
          'syntactic'
        ).dp(meta);
      }
      const semanticDiag = services.getSemanticDiagnostics(fileName);
      if (semanticDiag.length > 0) {
        o.ft.onEmitFailure(
          fileName,
          ts0.formatDiagnosticsWithColorAndContext(semanticDiag, formatHost),
          'semantic'
        ).dp(meta);
      }
      const suggests = services.getSuggestionDiagnostics(fileName);
      for (const sug of suggests) {
        const {line, character} = sug.file.getLineAndCharacterOfPosition(
          sug.start
        );
        o.ft.onSuggest(
          fileName,
          `${fileName}:${line + 1}:${character + 1} ` +
          ts0.flattenDiagnosticMessageText(sug.messageText, '\n', 2)
        ).dp(meta);
      }
      output.outputFiles.forEach(file => {
        o.ft.emitFile(file.name, file.text).dp(meta.r);
      });
    })
  ));
  o.ft.setStopped(false).dp();
  o.ft.fileContentCache(new Map()).dp();
  o.ft.versionsUpdated(new Map()).dp();
  o.ft.unemittedUpdated(new Set()).dp();
  o.ft.fileChanged(new Set()).dp();
  i.ft.setSourceFileTranspiler((_file, content) => content).dp();
  i.ft.setDiagnosticFileNameFormatter(file => file).dp();
  return rc;
}

export type LanguageServiceType = ReactorComposite2<LangServiceInput, LangServiceOutput & LangServiceStore, typeof inputTableFor, typeof outputTableFor>;
