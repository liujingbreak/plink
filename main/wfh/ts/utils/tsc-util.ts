import _ts from 'typescript';
import chalk from 'chalk';
import * as rx from 'rxjs';
import * as op from 'rxjs/operators';
import {createSlice} from '@wfh/redux-toolkit-observable/dist/tiny-redux-toolkit';

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
  onWriteFile(_s: WatchState) {},
  _watchStatusChange(_s: WatchState, diagnostic: _ts.Diagnostic) {},
  _reportDiagnostic(_s: WatchState, diagnostic: _ts.Diagnostic) {}
};

export type Options = {
  ts: typeof _ts;
  formatDiagnosticFileName?(path: string): string;
  transformSrcFile?(file: string, content: string, encoding?: string): string | null | undefined;
};

function watch(rootFiles: string[], jsonCompilerOpt: any, opts: Options = {ts: require('typescript') as typeof _ts}) {
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
  const compilerOptions = ts.parseJsonConfigFileContent({compilerOptions: jsonCompilerOpt}, ts.sys,
    process.cwd().replace(/\\/g, '/'),
    undefined, 'tsconfig.json').options;

  const programHost = ts.createWatchCompilerHost(rootFiles, compilerOptions, ts.sys,
    ts.createEmitAndSemanticDiagnosticsBuilderProgram, dispatcher._reportDiagnostic, dispatcher._watchStatusChange);
  if (opts.transformSrcFile)
    patchWatchCompilerHost(programHost, opts.transformSrcFile);

  const origCreateProgram = programHost.createProgram;
  // Ts's createWatchProgram will call WatchCompilerHost.createProgram(), this is where we patch "CompilerHost"
  programHost.createProgram = function(rootNames: readonly string[] | undefined, options: _ts.CompilerOptions | undefined,
    host?: _ts.CompilerHost, ...rest: any[]) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (host && (host as any)._overrided == null) {
      patchCompilerHost(host, commonRootDir, packageDirTree, compilerOptions, ts);
    }
    const program = origCreateProgram.call(this, rootNames, options, host, ...rest) ;
    return program;
  };

  ts.createWatchProgram(programHost);
  addEpic(slice => action$ => {
    return rx.merge(
      action$ByType._reportDiagnostic.pipe(
        op.map(({payload: diagnostic}) => {
          reportDiagnostic(diagnostic, ts);
        })
      ),
      action$ByType._watchStatusChange.pipe(
        op.map(({payload: diagnostic}) => {
          console.info(chalk.cyan(ts.formatDiagnostic(diagnostic, formatHost)));
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

function reportDiagnostic(diagnostic: _ts.Diagnostic, ts: typeof _ts = _ts) {
  let fileInfo = '';
  if (diagnostic.file) {
    const {line, character} = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
    const realFile = realPathOf(diagnostic.file.fileName, commonRootDir, packageDirTree, true) || diagnostic.file.fileName;
    fileInfo = `${realFile}, line: ${line + 1}, column: ${character + 1}`;
  }
  console.error(chalk.red(`Error ${diagnostic.code} ${fileInfo} :`), ts.flattenDiagnosticMessageText( diagnostic.messageText, formatHost.getNewLine()));
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

function patchCompilerHost(host: _ts.CompilerHost, commonRootDir: string, packageDirTree: DirTree<PackageDirInfo>,
  co: _ts.CompilerOptions, ts: typeof _ts = _ts): string[] {
  const emittedList: string[] = [];
  // It seems to not able to write file through symlink in Windows
  // const _writeFile = host.writeFile;
  const writeFile: _ts.WriteFileCallback = function(fileName, data, writeByteOrderMark, onError, sourceFiles) {
    const destFile = realPathOf(fileName, commonRootDir, packageDirTree);
    if (destFile == null) {
      log.debug('skip', fileName);
      return;
    }
    emittedList.push(destFile);
    log.info('write file', Path.relative(process.cwd(), destFile));
    // Typescript's writeFile() function performs weird with symlinks under watch mode in Windows:
    // Every time a ts file is changed, it triggers the symlink being compiled and to be written which is
    // as expected by me,
    // but late on it triggers the same real file also being written immediately, this is not what I expect,
    // and it does not actually write out any changes to final JS file.
    // So I decide to use original Node.js file system API
    fs.mkdirpSync(Path.dirname(destFile));
    fs.writeFileSync(destFile, data);
    // It seems Typescript compiler always uses slash instead of back slash in file path, even in Windows
    // return _writeFile.call(this, destFile.replace(/\\/g, '/'), ...Array.prototype.slice.call(arguments, 1));
  };
  host.writeFile = writeFile;

  // const _getSourceFile = host.getSourceFile;
  // const getSourceFile: typeof _getSourceFile = function(fileName) {
  //   // console.log('getSourceFile', fileName);
  //   return _getSourceFile.apply(this, arguments);
  // };
  // host.getSourceFile = getSourceFile;
  return emittedList;
}
