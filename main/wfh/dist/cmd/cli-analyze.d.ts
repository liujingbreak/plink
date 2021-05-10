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
export declare const dispatcher: import("@reduxjs/toolkit").CaseReducerActions<{
    analyzeFile: (s: import("immer/dist/internal").WritableDraft<AnalyzeState>, action: {
        payload: {
            files: string[];
            tsconfig?: string | undefined;
            alias: [pattern: string, replace: string][];
        };
        type: string;
    }) => void | import("immer/dist/internal").WritableDraft<AnalyzeState>;
} & import("../../../redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<AnalyzeState>>;
export {};
