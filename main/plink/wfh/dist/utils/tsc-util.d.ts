import _ts from 'typescript';
export declare function transpileSingleFile(content: string, ts?: any): {
    outputText: string;
    sourceMapText: string | undefined;
    diagnostics: _ts.Diagnostic[] | undefined;
    diagnosticsText: _ts.Diagnostic[] | undefined;
};
