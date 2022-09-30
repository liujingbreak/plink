import _ts from 'typescript';
import * as rx from 'rxjs';
import chokidar from 'chokidar';
declare type TscOptions = {
    jsx?: boolean;
    inlineSourceMap?: boolean;
    emitDeclarationOnly?: boolean;
    changeCompilerOptions?: (co: Record<string, any>) => void;
    traceResolution?: boolean;
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
declare type LangServiceActionCreator = {
    watch(dirs: string[]): void;
    addSourceFile(file: string, sync: boolean, content?: string): void;
    changeSourceFile(file: string, content: string | undefined | null): void;
    onCompilerOptions(co: _ts.CompilerOptions): void;
    onEmitFailure(file: string, diagnostics: string, type: 'compilerOptions' | 'syntactic' | 'semantic'): void;
    onSuggest(file: string, msg: string): void;
    emitFile(file: string, content: string): void;
    log(level: LogLevel, msg: string): void;
    /** stop watch */
    stop(): void;
};
export declare function languageServices(ts?: any, opts?: {
    formatDiagnosticFileName?(path: string): string;
    transformSourceFile?(path: string, content: string): string;
    watcher?: chokidar.WatchOptions;
    tscOpts?: NonNullable<Parameters<typeof plinkNodeJsCompilerOption>[1]>;
}): {
    dispatcher: LangServiceActionCreator;
    dispatchFactory: <K extends keyof LangServiceActionCreator>(type: K) => LangServiceActionCreator[K];
    action$: rx.Observable<{
        type: string;
        payload: string[];
    } | {
        type: string;
        payload: [file: string, sync: boolean, content?: string | undefined];
    } | {
        type: string;
        payload: [file: string, content: string | null | undefined];
    } | {
        type: string;
        payload: _ts.CompilerOptions;
    } | {
        type: string;
        payload: [file: string, diagnostics: string, type: "compilerOptions" | "syntactic" | "semantic"];
    } | {
        type: string;
        payload: [file: string, msg: string];
    } | {
        type: string;
        payload: [file: string, content: string];
    } | {
        type: string;
        payload: [level: LogLevel, msg: string];
    } | {
        type: string;
        payload: unknown;
    }>;
    ofType: import("../../../packages/redux-toolkit-observable/dist/rx-utils").OfTypeFn<LangServiceActionCreator>;
    store: rx.Observable<Set<string>>;
};
export declare function registerNode(): void;
export declare function test(dir: string): void;
export {};
