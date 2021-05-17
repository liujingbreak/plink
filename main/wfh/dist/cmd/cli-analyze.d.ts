import { AnalyzeOptions } from './types';
import { Context } from './cli-analyse-worker';
export default function (packages: string[], opts: AnalyzeOptions): Promise<void>;
export declare function printResult(result: NonNullable<AnalyzeState['result']>, opts: {
    j: AnalyzeOptions['j'];
}): void;
interface AnalyzeState {
    inputFiles?: string[];
    result?: ReturnType<Context['toPlainObject']>;
}
export declare function getStore(): import("rxjs").Observable<AnalyzeState>;
export declare const dispatcher: import("@reduxjs/toolkit").CaseReducerActions<import("../../../redux-toolkit-observable/dist/helper").RegularReducers<AnalyzeState, {
    /** payload: glob patterns */
    analyzeFile(d: AnalyzeState, payload: {
        files: string[];
        tsconfig?: string;
        alias: [pattern: string, replace: string][];
    }): void;
}> & import("../../../redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<AnalyzeState>>;
export {};
