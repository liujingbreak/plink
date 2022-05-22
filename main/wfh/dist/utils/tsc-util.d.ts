import _ts from 'typescript';
import * as rx from 'rxjs';
export declare type WatchStatusChange = {
    type: 'watchStatusChange';
    payload: _ts.Diagnostic;
};
export declare type OnWriteFile = {
    type: 'onWriteFile';
};
declare type WatchState = {
    error?: Error;
};
export declare type Options = {
    ts: typeof _ts;
    mode: 'watch' | 'compile';
    formatDiagnosticFileName?(path: string): string;
    transformSrcFile?(file: string, content: string, encoding?: string): string | null | undefined;
};
export declare function watch(rootFiles: string[], jsonCompilerOpt?: Record<string, any> | null, opts?: Options): {
    onWriteFile: rx.Observable<import("../../../packages/redux-toolkit-observable/dist/tiny-redux-toolkit").PayloadAction<WatchState, [fileName: string, data: string, writeByteOrderMark: boolean, onError?: ((message: string) => void) | undefined, sourceFiles?: readonly _ts.SourceFile[] | undefined]>>;
    onDiagnosticString: rx.Observable<import("../../../packages/redux-toolkit-observable/dist/tiny-redux-toolkit").PayloadAction<WatchState, [_text: string, _isWatchStateChange: boolean]>>;
    _watchStatusChange: rx.Observable<import("../../../packages/redux-toolkit-observable/dist/tiny-redux-toolkit").PayloadAction<WatchState, _ts.Diagnostic>>;
    _reportDiagnostic: rx.Observable<import("../../../packages/redux-toolkit-observable/dist/tiny-redux-toolkit").PayloadAction<WatchState, _ts.Diagnostic>>;
};
export declare function plinkNodeJsCompilerOption(ts: typeof _ts, opts?: {
    jsx?: boolean;
    inlineSourceMap?: boolean;
    emitDeclarationOnly?: boolean;
}): Record<string, any>;
export declare function transpileSingleFile(content: string, fileName: string, ts?: typeof _ts): {
    outputText: string;
    sourceMapText: string | undefined;
    diagnostics: _ts.Diagnostic[] | undefined;
    diagnosticsText: _ts.Diagnostic[] | undefined;
};
export {};
