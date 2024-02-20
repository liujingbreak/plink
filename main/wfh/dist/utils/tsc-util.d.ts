import _ts from 'typescript';
import chokidar from 'chokidar';
import { ReactorComposite2, SingleActionFactory, ActionMeta } from '../../../packages/reactivizer';
type TscOptions = {
    jsx?: boolean;
    inlineSourceMap?: boolean;
    emitDeclarationOnly?: boolean;
    changeCompilerOptions?: (co: Record<string, any>) => void;
    traceResolution?: boolean;
    tsBuildInfoFile?: string;
};
declare function plinkNodeJsCompilerOption(ts: typeof _ts, opts?: TscOptions & {
    basePath?: string;
}): _ts.CompilerOptions;
export declare function transpileSingleFile(content: string, ts?: any): {
    outputText: string;
    sourceMapText: string | undefined;
    diagnostics: _ts.Diagnostic[] | undefined;
    diagnosticsText: _ts.Diagnostic[] | undefined;
};
export declare function createTranspileFileWithTsCheck(ts?: any, opts?: NonNullable<Parameters<typeof languageServices>[1]>): (content: string, file: string) => {
    code: string;
    map: string;
};
export declare enum LogLevel {
    trace = 0,
    log = 1,
    error = 2
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
    onEmitFailure(file: string, diagnostics: string, type: 'compilerOptions' | 'syntactic' | 'semantic'): SingleActionFactory;
    emitFile(file: string, content: string): SingleActionFactory;
    versionsUpdated(versions: Map<string, number>): SingleActionFactory;
    fileChanged(files: Set<string>): SingleActionFactory;
    unemittedUpdated(files: Set<[file: string, forActionId: ActionMeta['i']]>): SingleActionFactory;
    setStopped(stopped: boolean): SingleActionFactory;
    fileContentCache(cache: Map<string, string>): SingleActionFactory;
};
export declare function languageServices(ts?: any, opts?: {
    formatDiagnosticFileName?(path: string): string;
    transformSourceFile?(path: string, content: string): string;
    watcher?: chokidar.WatchOptions;
    tscOpts?: NonNullable<Parameters<typeof plinkNodeJsCompilerOption>[1]>;
}): ReactorComposite2<LangServiceActionCreator, LangServiceEvents, [], readonly ["versionsUpdated", "fileChanged", "unemittedUpdated", "setStopped", "fileContentCache"]>;
export declare function registerNode(): void;
export declare function test(dir: string): void;
export {};
