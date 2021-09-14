import { AnalyzeOptions } from './types';
import { Context } from './cli-analyse-worker';
export default function (packages: string[], opts: AnalyzeOptions): void;
export declare function printResult(result: NonNullable<AnalyzeState['result']>, opts: {
    j: AnalyzeOptions['j'];
}): void;
interface AnalyzeState {
    inputFiles?: string[];
    result?: ReturnType<Context['toPlainObject']>;
}
export declare function getStore(): import("rxjs").Observable<AnalyzeState>;
export declare const dispatcher: import("@reduxjs/toolkit").CaseReducerActions<import("../../../packages/redux-toolkit-observable/dist/helper").RegularReducers<AnalyzeState, {
    /** payload: glob patterns */
    analyzeFile(d: AnalyzeState, payload: {
        files: string[];
        tsconfig?: string;
        alias: [pattern: string, replace: string][];
        ignore?: string;
    }): void;
}> & import("../../../packages/redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<AnalyzeState>>;
export declare function analyseFiles(files: string[], tsconfigFile: string | undefined, alias: [pattern: string, replace: string][], ignore?: string): Promise<{
    commonDir: string;
    relativeDepsOutSideDir: string[];
    cyclic: string[];
    canNotResolve: {
        target: string;
        file: string;
        pos: string;
        reasone: string;
    }[];
    externalDeps: string[];
    nodeModuleDeps: string[];
    matchAlias: string[];
    files: string[];
}>;
export {};
