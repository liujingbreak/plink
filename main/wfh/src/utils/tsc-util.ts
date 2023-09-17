import fs from 'fs';
import Path from 'path';
// import inspector from 'inspector';
import _ts from 'typescript';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import chokidar from 'chokidar';
import {createActionStreamByType} from '../../../packages/redux-toolkit-observable/dist/rx-utils';
// import {createActionStream} from '../../../packages/redux-toolkit-observable/rx-utils';
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
    // module: 'ESNext',
    /**
     * for gulp-sourcemaps usage:
     *  If you set the outDir option to the same value as the directory in gulp.dest, you should set the sourceRoot to ./.
     */
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
  const {action$, ofType, dispatcher} = languageServices(ts, opts);

  return function(content: string, file: string) {
    let destFile: string | undefined;
    let sourceMap: string | undefined;
    rx.merge(
      action$.pipe(
        ofType('emitFile'),
        op.map(({payload: [outputFile, outputContent]}) => {
          if (/\.[mc]?js/.test(outputFile)) {
            destFile = outputContent;
          } else if (outputFile.endsWith('.map')) {
            sourceMap = outputContent;
          }
        }),
        op.takeWhile(() => destFile == null || sourceMap == null)
      ),
      action$.pipe(
        ofType('onEmitFailure', 'onSuggest'),
        op.map(({payload: [_file, diagnostics]}) => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          console.error('[tsc-util]', diagnostics);
        })
      )
    ).subscribe();
    dispatcher.addSourceFile(file, true, content);

    return {
      code: destFile!,
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
  watch(dirs: string[]): void;
  addSourceFile(file: string, sync: boolean, content?: string): void;
  changeSourceFile(file: string, content: string | undefined | null): void;
  onCompilerOptions(co: _ts.CompilerOptions): void;
  onEmitFailure(
    file: string,
    diagnostics: string,
    type: 'compilerOptions' | 'syntactic' | 'semantic'
  ): void;
  onSuggest(file: string, msg: string): void;
  emitFile(file: string, content: string): void;
  log(level: LogLevel, msg: string): void;
  /** stop watch */
  stop(): void;
};

type LangServiceState = {
  versions: Map<string, number>;
  /** root files */
  files: Set<string>;
  unemitted: Set<string>;
  isStopped: boolean;
  fileContentCache: Map<string, string>;
};

export function languageServices( ts: any = _ts, opts: {
  formatDiagnosticFileName?(path: string): string;
  transformSourceFile?(path: string, content: string): string;
  watcher?: chokidar.WatchOptions;
  tscOpts?: NonNullable<Parameters<typeof plinkNodeJsCompilerOption>[1]>;
} = {}
) {
  const ts0 = ts as typeof _ts;
  const {dispatcher, dispatchFactory, action$, actionOfType, ofType} =
    createActionStreamByType<LangServiceActionCreator>();
  const store = new rx.BehaviorSubject<LangServiceState>({
    versions: new Map(),
    files: new Set(),
    unemitted: new Set(),
    isStopped: false,
    fileContentCache: new Map()
  });

  function setState(cb: (curr: LangServiceState) => LangServiceState) {
    store.next(cb(store.getValue()));
  }

  const formatHost: _ts.FormatDiagnosticsHost = {
    getCanonicalFileName: opts.formatDiagnosticFileName || (path => path),
    getCurrentDirectory: _ts.sys.getCurrentDirectory,
    getNewLine: () => _ts.sys.newLine
  };

  const co = plinkNodeJsCompilerOption(ts0, opts.tscOpts);

  const serviceHost: _ts.LanguageServiceHost = {
    ...ts0.sys, // Important, default language service host does not implement methods like fileExists
    getScriptFileNames() {
      return Array.from(store.getValue().files.values());
    },
    getScriptVersion(fileName: string) {
      return store.getValue().versions.get(fileName.replace(/\\/g, '/')) + '' || '-1';
    },
    getCompilationSettings() {
      dispatcher.onCompilerOptions(co);
      return co;
    },
    getScriptSnapshot(fileName: string) {
      // console.log('getScriptSnapshot()', fileName);
      if (!fs.existsSync(fileName)) {
        return undefined;
      }

      const cached = store.getValue().fileContentCache.get(fileName.replace(/\\/g, '/'));
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
          return store.getValue().isStopped;
        }
      };
    },
    useCaseSensitiveFileNames() {
      return ts0.sys.useCaseSensitiveFileNames;
    },
    getDefaultLibFileName: options => ts0.getDefaultLibFilePath(options),

    trace(s) {
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
    }
  };
  const documentRegistry = ts0.createDocumentRegistry();
  let services: _ts.LanguageService | undefined;
  const stop$ = action$.pipe(ofType('stop'));

  let watcher: ReturnType<typeof chokidar.watch>;

  rx.merge(
    actionOfType('watch').pipe(
      op.exhaustMap(
        ({payload: dirs}) =>
          new rx.Observable<never>(() => {
            if (watcher == null)
              watcher = chokidar.watch(
                dirs.map(dir => dir.replace(/\\/g, '/')),
                opts.watcher
              );

            watcher.on('add', path =>
              dispatcher.addSourceFile(path, false)
            );
            watcher.on('change', path => {
              void fs.promises.readFile(path, 'utf8')
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
          })
      )
    ),
    actionOfType('addSourceFile').pipe(
      op.filter(({payload: [file]}) => !file.endsWith('.d.ts') && /\.(?:[mc]?tsx?|json)$/.test(file)),
      op.map(({payload: [fileName, sync, content]}) => {
        setState(s => {
          s.files.add(fileName);
          s.versions.set(fileName.replace(/\\/g, '/'), 0);
          if (content != null)
            s.fileContentCache.set(fileName.replace(/\\/g, '/'), content);
          return s;
        });
        if (sync) getEmitFile(fileName);
        else {
          setState(s => {
            s.unemitted.add(fileName);
            return s;
          });
          return fileName;
        }
      }),
      op.filter((file): file is string => file != null),
      op.debounceTime(333),
      op.map(() => {
        for (const file of store.getValue().unemitted.values()) {
          getEmitFile(file);
        }
        setState(s => {
          s.unemitted.clear();
          return s;
        });
      })
    ),
    actionOfType('changeSourceFile').pipe(
      op.filter(({payload: [file]}) => !file.endsWith('.d.ts') && /\.(?:tsx?|json)$/.test(file)),
      // TODO: debounce on same file changes
      op.map(({payload: [fileName, content]}) => {
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
      })
    )
  )
    .pipe(
      op.takeUntil(stop$),
      op.catchError((err, src) => {
        console.error('Language service error', err);
        return src;
      }),
      op.finalize(() => {
        setState(s => {
          s.isStopped = true;
          return s;
        });
      })
    )
    .subscribe();

  function getEmitFile(fileName: string) {
    if (services == null) {
      services = ts0.createLanguageService(serviceHost, documentRegistry);
      const coDiag = services.getCompilerOptionsDiagnostics();
      if (coDiag.length > 0)
        dispatcher.onEmitFailure(
          fileName,
          ts0.formatDiagnosticsWithColorAndContext(coDiag, formatHost),
          'compilerOptions'
        );
    }
    const output = services.getEmitOutput(fileName);
    if (output.emitSkipped) {
      // console.log(`Emitting ${fileName} failed`);
    }

    const syntDiag = services.getSyntacticDiagnostics(fileName);
    if (syntDiag.length > 0) {
      dispatcher.onEmitFailure(
        fileName,
        ts0.formatDiagnosticsWithColorAndContext(syntDiag, formatHost),
        'syntactic'
      );
    }
    const semanticDiag = services.getSemanticDiagnostics(fileName);

    if (semanticDiag.length > 0) {
      dispatcher.onEmitFailure(
        fileName,
        ts0.formatDiagnosticsWithColorAndContext(semanticDiag, formatHost),
        'semantic'
      );
    }

    const suggests = services.getSuggestionDiagnostics(fileName);

    for (const sug of suggests) {
      const {line, character} = sug.file.getLineAndCharacterOfPosition(
        sug.start
      );
      dispatcher.onSuggest(
        fileName,
        `${fileName}:${line + 1}:${character + 1} ` +
          ts0.flattenDiagnosticMessageText(sug.messageText, '\n', 2)
      );
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

export function registerNode() {
  const compile = createTranspileFileWithTsCheck(_ts, {
    tscOpts: {inlineSourceMap: true, basePath: plinkEnv.workDir}
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
  const {action$, ofType} = languageServices([dir]);
  action$
    .pipe(
      ofType('emitFile'),
      // eslint-disable-next-line no-console
      op.map(({payload: [file]}) => console.log('emit', file))
    )
    .subscribe();
}
