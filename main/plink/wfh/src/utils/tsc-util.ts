import fs from 'fs';
import Path from 'path';
import _ts from 'typescript';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import chokidar from 'chokidar';
import {ReactorComposite2, SingleActionFactory, ActionMeta} from '@wfh/reactivizer';
import {setTsCompilerOptForNodePath} from '../package-mgr/package-list-helper';
import {parseConfigFileToJson} from '../ts-cmd-util';
import {plinkEnv} from './misc';
// require('inspector').open(9229, '0.0.0.0', true);

type TscOptions = {
  jsx?: boolean;
  inlineSourceMap?: boolean;
  emitDeclarationOnly?: boolean;
  changeCompilerOptions?: (co: Record<string, any>) => void;
  traceResolution?: boolean;
  tsBuildInfoFile?: string;
};

function plinkNodeJsCompilerOptionJson(ts: typeof _ts, opts: TscOptions = {}) {
  const {
    jsx = false,
    inlineSourceMap = false,
    emitDeclarationOnly = false
  } = opts;
  let baseCompilerOptions: any;
  if (jsx) {
    const baseTsconfigFile2 = require.resolve('../../tsconfig-tsx.json');
    // log.info('Use tsconfig file:', baseTsconfigFile2);
    const tsxTsconfig = parseConfigFileToJson(ts, baseTsconfigFile2);
    baseCompilerOptions = tsxTsconfig.compilerOptions;
    // baseCompilerOptions = {...baseCompilerOptions, ...tsxTsconfig.config.compilerOptions};
  } else {
    const baseTsconfigFile = require.resolve('../../tsconfig-base.json');
    const baseTsconfig = parseConfigFileToJson(ts, baseTsconfigFile);
    // log.info('Use tsconfig file:', baseTsconfigFile);
    baseCompilerOptions = baseTsconfig.compilerOptions;
  }

  const coRootDir = Path.parse(process.cwd()).root;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const compilerOptions = {
    ...baseCompilerOptions,
    target: 'ES2017',
    importHelpers: true,
    declaration: true,
    tsBuildInfoFile: opts.tsBuildInfoFile,
    // diagnostics: true,
    outDir: coRootDir, // must be same as rootDir
    rootDir: coRootDir,
    skipLibCheck: true,
    inlineSourceMap,
    sourceMap: !inlineSourceMap,
    inlineSources: true,
    emitDeclarationOnly,
    traceResolution: opts.traceResolution,
    preserveSymlinks: false
  } as Record<keyof _ts.CompilerOptions, any>;
  if (opts.changeCompilerOptions) opts.changeCompilerOptions(compilerOptions);

  return compilerOptions;
}

function plinkNodeJsCompilerOption(
  ts: typeof _ts,
  opts: TscOptions & {basePath?: string} = {}
) {
  const json = plinkNodeJsCompilerOptionJson(ts, opts);
  const basePath = (opts.basePath || process.cwd()).replace(/\\/g, '/');
  const {options} = ts.parseJsonConfigFileContent(
    {compilerOptions: json},
    ts.sys,
    basePath,
    undefined,
    Path.resolve(basePath, 'tsconfig-in-memory.json')
  );
  return options;
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
export function transpileSingleFile(content: string, ts: any = _ts) {
  const {outputText, diagnostics, sourceMapText} = (
    ts as typeof _ts
  ).transpileModule(content, {
    compilerOptions: {
      ...plinkNodeJsCompilerOption(ts),
      isolatedModules: true,
      inlineSourceMap: false
    }
  });

  return {
    outputText,
    sourceMapText,
    diagnostics,
    diagnosticsText: diagnostics
  };
}

export function createTranspileFileWithTsCheck(
  ts: any = _ts,
  opts?: NonNullable<Parameters<typeof languageServices>[1]>
) {
  const {i, o} = languageServices(ts, opts);

  // r('onCompilerOptions -> console.log', o.pt.onCompilerOptions.pipe(
  //   // eslint-disable-next-line no-console
  //   rx.tap(([, co]) => console.log('Transpile TS file with compilerOptions:', co)),
  //   rx.take(1)
  // ));

  return function(content: string, file: string) {
    let destFile: string | undefined;
    let sourceMap: string | undefined;
    let unknownOutputFile: string | undefined;
    let error: Error | undefined;

    i.ft.addSourceFile(file, true, content)
      .ddo(o.at.emitFile).pipe(
        rx.map(([, outputFile, outputContent]) => {
          if (/\.[mc]?js/.test(outputFile)) {
            destFile = outputContent;
          } else if (outputFile.endsWith('.map')) {
            sourceMap = outputContent;
          } else {
            unknownOutputFile = outputFile;
          }
        }),
        rx.take(1),
        rx.takeUntil(rx.merge( o.pt.onEmitFailure, o.pt.onSuggest).pipe(
          rx.map(([, file, diagnostics]) => {
            // eslint-disable-next-line no-console
            console.log('[tsc-util]', file, diagnostics);
          })
        )),
        rx.catchError((err, src) => {
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

    return {
      code: destFile,
      map: sourceMap!
    };
  };
}

export enum LogLevel {
  trace,
  log,
  error
}

type LangServiceActionCreator = {
  watch(dirs: string[]): SingleActionFactory;
  addSourceFile(file: string, sync: boolean, content?: string): SingleActionFactory;
  changeSourceFile(file: string, content: string | undefined | null): SingleActionFactory;
  /** stop watch */
  stop(): SingleActionFactory;
};

type LangServiceEvents = {
  log(level: LogLevel, msg: string): SingleActionFactory;
  onCompilerOptions(co: _ts.CompilerOptions): SingleActionFactory;
  onSuggest(file: string, msg: string): SingleActionFactory;
  onEmitFailure(
    file: string,
    diagnostics: string,
    type: 'compilerOptions' | 'syntactic' | 'semantic'
  ): SingleActionFactory;
  emitFile(file: string, content: string): SingleActionFactory;
  versionsUpdated(versions: Map<string, number>): SingleActionFactory;
  fileChanged(files: Set<string>): SingleActionFactory;
  unemittedUpdated(files: Set<[file: string, forActionId: ActionMeta['i']]>): SingleActionFactory;
  setStopped(stopped: boolean): SingleActionFactory;
  fileContentCache(cache: Map<string, string>): SingleActionFactory;
};

const forTable = [
  'versionsUpdated', 'fileChanged', 'unemittedUpdated',
  'setStopped', 'fileContentCache'
] as const;

export function languageServices( ts: any = _ts, opts: {
  formatDiagnosticFileName?(path: string): string;
  transformSourceFile?(path: string, content: string): string;
  watcher?: chokidar.WatchOptions;
  tscOpts?: NonNullable<Parameters<typeof plinkNodeJsCompilerOption>[1]> | (() => _ts.CompilerOptions);
} = {}
) {
  const ts0 = ts as typeof _ts;
  const rc = new ReactorComposite2<LangServiceActionCreator, LangServiceEvents, [], typeof forTable>({
    name: 'Plink TS lang service',
    debug: false,
    logStyle: 'noParam',
    debugExcludeTypes: ['onCompilerOptions'],
    outputTableFor: forTable
  });

  const {i, o, outputTable, r} = rc;

  const formatHost: _ts.FormatDiagnosticsHost = {
    getCanonicalFileName: opts.formatDiagnosticFileName || (path => path),
    getCurrentDirectory: _ts.sys.getCurrentDirectory,
    getNewLine: () => _ts.sys.newLine
  };

  const co = typeof opts.tscOpts === 'function' ? opts.tscOpts() : plinkNodeJsCompilerOption(ts0, opts.tscOpts);

  const serviceHost: _ts.LanguageServiceHost = {
    ...ts0.sys, // Important, default language service host does not implement methods like fileExists
    getScriptFileNames() {
      return Array.from(outputTable.getData().fileChanged[0]!.values());
    },
    getScriptVersion(fileName: string) {
      return outputTable.getData().versionsUpdated[0]!.get(fileName.replace(/\\/g, '/')) + '' || '-1';
    },
    getCompilationSettings() {
      o.ft.onCompilerOptions(co).dp();
      return co;
    },
    getScriptSnapshot(fileName: string) {
      // console.log('getScriptSnapshot()', fileName);
      if (!fs.existsSync(fileName)) {
        return undefined;
      }

      const cached = outputTable.getData().fileContentCache[0]!.get(fileName.replace(/\\/g, '/'));
      const originContent = cached != null ? cached : fs.readFileSync(fileName, 'utf8');
      return ts0.ScriptSnapshot.fromString(
        opts.transformSourceFile
          ? opts.transformSourceFile(fileName, originContent)
          : originContent
      );
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
  const documentRegistry = ts0.createDocumentRegistry();
  let services: _ts.LanguageService | undefined;

  let watcher: ReturnType<typeof chokidar.watch>;

  r('watch', i.pt.watch.pipe(
    rx.exhaustMap(([, dirs]) =>
      new rx.Observable<never>(() => {
        if (watcher == null)
          watcher = chokidar.watch(
            dirs.map(dir => dir.replace(/\\/g, '/')),
            opts.watcher
          );

        watcher.on('add', path => {
          i.ft.addSourceFile(path, false).dp();
        });
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

  r('addSourceFile', i.pt.addSourceFile.pipe(
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
          if (sync) getEmitFile(fileName, m);
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
        getEmitFile(file, {i: id});
      }
      o.ft.unemittedUpdated(unemitted).dp();
    })
  ));

  r('changeSourceFile', i.pt.changeSourceFile.pipe(
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
      getEmitFile(fileName, m);
    })
  ));

  r('stop', i.pt.stop.pipe(
    rx.tap(([m]) => {
      o.ft.setStopped(true).dp(m);
      rc.dispose();
    })
  ));

  o.ft.setStopped(false).dp();
  o.ft.fileContentCache(new Map()).dp();
  o.ft.versionsUpdated(new Map()).dp();
  o.ft.unemittedUpdated(new Set()).dp();
  o.ft.fileChanged(new Set()).dp();

  function getEmitFile(fileName: string, meta: ActionMeta) {
    if (services == null) {
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
      o.ft.emitFile(file.name, file.text).dp(meta);
    });
  }

  return rc;
}

export function registerNode() {
  const compile = createTranspileFileWithTsCheck(_ts, {
    tscOpts: {
      inlineSourceMap: true, basePath: plinkEnv.workDir,
      changeCompilerOptions(co) {
        co.preserveSymlinks = true;
        setTsCompilerOptForNodePath(process.cwd(), co, {
          workspaceDir: plinkEnv.workDir,
          enableTypeRoots: true,
          realPackagePaths: true
        });
      }
    }
  });
  const ext = '.ts';
  const old = require.extensions[ext] || require.extensions['.js'];
  require.extensions[ext] = function(m: any, filename) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const _compile = m._compile;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    m._compile = function(code: string, fileName: string) {
      const {code: jscode} = compile(code, fileName);
      // console.log(jscode);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      return _compile.call(this, jscode, fileName);
    };
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return old(m, filename);
  };
}

export function test(dir: string) {
  const {o} = languageServices([dir]);
  o.pt.emitFile.pipe(
    // eslint-disable-next-line no-console
    op.map(([, file]) => console.log('emit', file))
  ).subscribe();
}
