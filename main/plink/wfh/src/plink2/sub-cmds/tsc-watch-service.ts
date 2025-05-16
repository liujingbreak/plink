import Path from 'path';
import fs from 'fs';
import * as rx from 'rxjs';
import ts from 'typescript';
import {ReactorComposite2, SingleActionFactory, actionOfContext} from '@wfh/reactivizer';
import {conciseConsoleLogger} from '@wfh/reactivizer/dist/nodejs-utils';

export interface PackageTsDirs {
  /** srcDir works like "rootDir" in tsconfig compilerOptions */
  srcDir: string;
  destDir: string;
  isomDir?: string;
  /** For plink command tsc, "isomDir" will be ignored if "include" is set in package.json */
  include?: string[] | string;
  files?: string[] | string;
  pkgDir: string;
}

export type TsconfigType = {
  extends?: string;
  include?: string[];
  exclude?: string[];
  compilerOptions: {
    paths: Record<string, string[]>;
    [prop: string]: any;
  };
};
interface TscServiceInput {
  setbaseTsConfig(json: TsconfigType, baseDirOfTsconfigFile: string): SingleActionFactory;
  /** stop this watcher by `tscService.o.ft.stopWatch().(contextActionMeta)`, contextActionMeta can be
   * the action meta of startWatch or any action that startWatch is related to */
  startWatch(opts: ts.WatchFileKind, rootFiles: string[]): SingleActionFactory;
  /** must provide actionMeta when being dispatched */
  stopWatch(): SingleActionFactory;
  addSourceFile(files: string[]): SingleActionFactory;
}

interface TscServiceOutput {
  onCompilerOptionsParsed(parsedCmdLine: ts.ParsedCommandLine): SingleActionFactory;
  onDiagnostic(formated: string, d: ts.Diagnostic): SingleActionFactory;
  onCompilerCompleted(formated: string, d: ts.Diagnostic): SingleActionFactory;
  onWriteFile(file: string, content: string): SingleActionFactory;
}

const inputTableFor = ['setbaseTsConfig'] as const;
export const tscService = new ReactorComposite2<TscServiceInput, TscServiceOutput, typeof inputTableFor>({
  name: 'tscService',
  debug: true,
  log: conciseConsoleLogger,
  inputTableFor
});

const formatHost: ts.FormatDiagnosticsHost = {
  getCanonicalFileName: path => path,
  getCurrentDirectory: ts.sys.getCurrentDirectory,
  getNewLine: () => ts.sys.newLine
};
const {i, o, r, inputTable} = tscService;

r('startWatch, addSourceFile, stopWatch -> onCompilerOptionsParsed, onDiagnostic, onCompilerCompleted', i.pt.startWatch.pipe(
  rx.mergeMap(a => inputTable.l.setbaseTsConfig.pipe(rx.map(b => [a, b] as const))),
  rx.mergeMap(([[m, opts, rootFiles], [, tsconfigJson, tsconfigDir]]) => {
    delete tsconfigJson.include;
    tsconfigJson.compilerOptions.incremental = false;
    tsconfigJson.compilerOptions.inlineSourceMap = true;
    const parsed = ts.parseJsonConfigFileContent(tsconfigJson, ts.sys, tsconfigDir);
    o.ft.onCompilerOptionsParsed(parsed).dp(m);

    const host = ts.createWatchCompilerHost(
      rootFiles,
      parsed.options,
      ts.sys,
      ts.createEmitAndSemanticDiagnosticsBuilderProgram,
      diagnostic => {
        const formated = ['Error', diagnostic.code, ':', ts.flattenDiagnosticMessageText(diagnostic.messageText, formatHost.getNewLine())].join(' ');
        o.ft.onDiagnostic(formated, diagnostic).dp(m);
      },
      (diagnostic, _newLine, _compilerOptions, _errorCount?: number) => {
        o.ft.onCompilerCompleted(ts.formatDiagnostic(diagnostic, formatHost), diagnostic).dp(m);
      }
    );
    const program = ts.createWatchProgram(host);
    return rx.merge(
      i.pt.addSourceFile.pipe(
        rx.map(([, files]) => {
          rootFiles.push(...files);
          program.updateRootFileNames(rootFiles);
        })
      )
    ).pipe(
      rx.takeUntil(
        i.pt.stopWatch.pipe(
          actionOfContext(m),
          rx.tap(() => program.close())
        )
      )
    );
  })
));

const baseTsconfigFile = Path.resolve(__dirname, '../../../tsconfig-base.json');
const baseTsconfig = JSON.parse(fs.readFileSync(baseTsconfigFile, 'utf8')) as TsconfigType;
i.ft.setbaseTsConfig(baseTsconfig, Path.dirname(baseTsconfigFile)).dp();
