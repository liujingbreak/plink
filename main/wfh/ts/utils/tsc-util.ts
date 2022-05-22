import _ts from 'typescript';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {createSlice} from '../../../packages/redux-toolkit-observable/dist/tiny-redux-toolkit';
import {parseConfigFileToJson} from '../ts-cmd-util';

export type WatchStatusChange = {
  type: 'watchStatusChange';
  payload: _ts.Diagnostic;
};

export type OnWriteFile = {
  type: 'onWriteFile';
};

type WatchState = {
  error?: Error;
};

const actions = {
  onWriteFile(_s: WatchState, ..._args: Parameters<_ts.WriteFileCallback>) {},
  onDiagnosticString(_s: WatchState, _text: string, _isWatchStateChange: boolean) {},
  _watchStatusChange(_s: WatchState, _diagnostic: _ts.Diagnostic) {},
  _reportDiagnostic(_s: WatchState, _diagnostic: _ts.Diagnostic) {}
};

export type Options = {
  ts: typeof _ts;
  mode: 'watch' | 'compile';
  formatDiagnosticFileName?(path: string): string;
  transformSrcFile?(file: string, content: string, encoding?: string): string | null | undefined;
};

export function watch(rootFiles: string[], jsonCompilerOpt?: Record<string, any> | null, opts: Options = {
  mode: 'compile',
  ts: require('typescript') as typeof _ts
}) {
  const {actionDispatcher: dispatcher, addEpic, action$ByType, getState} = createSlice({
    name: 'watchContorl',
    initialState: {} as WatchState,
    reducers: actions
  });

  const formatHost: _ts.FormatDiagnosticsHost = {
    getCanonicalFileName: opts.formatDiagnosticFileName || (path => path),
    getCurrentDirectory: _ts.sys.getCurrentDirectory,
    getNewLine: () => _ts.sys.newLine
  };

  const ts = opts.ts || require('typescript');
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const compilerOptions = ts.parseJsonConfigFileContent({compilerOptions: jsonCompilerOpt || plinkNodeJsCompilerOption(ts, {jsx: true})}, ts.sys,
    process.cwd().replace(/\\/g, '/'),
    undefined, 'tsconfig.json').options;

  const programHost = ts.createWatchCompilerHost(
    rootFiles, compilerOptions, ts.sys,
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
  programHost.createProgram = function(rootNames: readonly string[] | undefined, options: _ts.CompilerOptions | undefined,
    host?: _ts.CompilerHost, ...rest: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (host && (host as any)._overrided == null) {
      patchCompilerHost(host, dispatcher.onWriteFile);
    }
    const program = origCreateProgram.call(this, rootNames, options, host, ...rest) ;
    return program;
  };

  ts.createWatchProgram(programHost);
  addEpic(_slice => _action$ => {
    return rx.merge(
      action$ByType._reportDiagnostic.pipe(
        op.map(({payload: diagnostic}) => {
          dispatcher.onDiagnosticString(ts.formatDiagnosticsWithColorAndContext([diagnostic], formatHost), false);
        })
      ),
      action$ByType._watchStatusChange.pipe(
        op.map(({payload: diagnostic}) => {
          dispatcher.onDiagnosticString(ts.formatDiagnosticsWithColorAndContext([diagnostic], formatHost), true);
        })
      )
    ).pipe(
      op.ignoreElements()
    );
  });

  if (getState().error) {
    throw getState().error;
  }

  return action$ByType;
}

function patchWatchCompilerHost(host: _ts.WatchCompilerHostOfFilesAndCompilerOptions<_ts.EmitAndSemanticDiagnosticsBuilderProgram> | _ts.CompilerHost,
  transform: NonNullable<Options['transformSrcFile']>) {
  const readFile = host.readFile;

  host.readFile = function(path: string, encoding?: string) {
    const content = readFile.call(this, path, encoding) ;
    if (content) {
      const changed = transform(path, content, encoding);
      if (changed != null && changed !== content) {
        return changed;
      }
    }
    return content;
  };
}

function patchCompilerHost(host: _ts.CompilerHost,
  write: _ts.WriteFileCallback) {
  // It seems to not able to write file through symlink in Windows
  // const _writeFile = host.writeFile;
  host.writeFile = write;
}

export function plinkNodeJsCompilerOption(
  ts: typeof _ts,
  opts: {jsx?: boolean; inlineSourceMap?: boolean; emitDeclarationOnly?: boolean} = {}
) {
  const {jsx = false, inlineSourceMap = true, emitDeclarationOnly = false} = opts;
  let baseCompilerOptions: any;
  if (jsx) {
    const baseTsconfigFile2 = require.resolve('../tsconfig-tsx.json');
    // log.info('Use tsconfig file:', baseTsconfigFile2);
    const tsxTsconfig = parseConfigFileToJson(ts, baseTsconfigFile2);
    baseCompilerOptions = tsxTsconfig.compilerOptions;
    // baseCompilerOptions = {...baseCompilerOptions, ...tsxTsconfig.config.compilerOptions};
  } else {
    const baseTsconfigFile = require.resolve('../tsconfig-base.json');
    const baseTsconfig = parseConfigFileToJson(ts, baseTsconfigFile);
    // log.info('Use tsconfig file:', baseTsconfigFile);
    baseCompilerOptions = baseTsconfig.compilerOptions;
  }
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const compilerOptions: Record<string, any> = {
    ...baseCompilerOptions,
    target: 'ES2017',
    importHelpers: false,
    declaration: true,
    // module: 'ESNext',
    /**
     * for gulp-sourcemaps usage:
     *  If you set the outDir option to the same value as the directory in gulp.dest, you should set the sourceRoot to ./.
     */
    outDir: '',
    rootDir: '',
    skipLibCheck: true,
    inlineSourceMap,
    sourceMap: inlineSourceMap,
    inlineSources: inlineSourceMap,
    emitDeclarationOnly,
    preserveSymlinks: true
  };
  return compilerOptions;
}

export function transpileSingleFile(content: string, fileName: string, ts = require('typescript') as typeof _ts) {
  const {outputText, diagnostics, sourceMapText} = ts.transpileModule(content, {
    compilerOptions: {...plinkNodeJsCompilerOption(ts), isolatedModules: true}
  });

  return {
    outputText,
    sourceMapText,
    diagnostics,
    diagnosticsText: diagnostics
  };
}

