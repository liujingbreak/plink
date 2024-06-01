import _ts from 'typescript';
import { SimplexReactor, SingleActionFactory, ActionMeta } from '@wfh/reactivizer';
import chokidar from 'chokidar';
import { TsconfigType } from '../../package-mgr/package-mgr2-utils';
export declare function createTranspileFileWithTsCheck(ts: any, tsconfigJson: TsconfigType, tsconfigDir: string): (content: string, file: string) => readonly [string, string];
export declare enum LogLevel {
    trace = 0,
    log = 1,
    error = 2
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
export type LangServiceOutput = {
    doneResolveCompilerOption(co: _ts.CompilerOptions): SingleActionFactory;
    /** In context of addSourceFile */
    compileFile(fileName: string): SingleActionFactory;
    /** In context of compileFile */
    didCompileFile(): SingleActionFactory;
    log(level: LogLevel, msg: string): SingleActionFactory;
    /** In context of "compileFile" */
    onSuggest(file: string, msg: string): SingleActionFactory;
    /** In context of "compileFile" */
    onEmitFailure(file: string, diagnostics: string, type: 'compilerOptions' | 'syntactic' | 'semantic'): SingleActionFactory;
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
declare const tableFor: readonly ["setTsConfig", "setSourceFileTranspiler", "setDiagnosticFileNameFormatter", "versionsUpdated", "fileChanged", "unemittedUpdated", "setStopped", "fileContentCache", "doneResolveCompilerOption"];
export declare function languageServices(ts?: any): LanguageServiceType;
export type LanguageServiceType = SimplexReactor<LangServiceInput & LangServiceOutput & LangServiceStore, typeof tableFor> & {
    i: SimplexReactor<LangServiceInput & LangServiceOutput & LangServiceStore>['s'];
    o: SimplexReactor<LangServiceInput & LangServiceOutput & LangServiceStore>['s'];
};
export {};
