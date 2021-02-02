import { AnalyzeOptions } from './types';
import { PayloadAction } from '@reduxjs/toolkit';
import { Context } from './cli-analyse-worker';
export default function (packages: string[], opts: AnalyzeOptions): Promise<void>;
interface AnalyzeState {
    inputFiles?: string[];
    result?: ReturnType<Context['toPlainObject']>;
}
export declare function getStore(): import("rxjs").Observable<AnalyzeState>;
export declare const dispatcher: import("@reduxjs/toolkit").CaseReducerActions<{
    /** payload: glob patterns */
    analyzeFile(d: import("immer/dist/internal").WritableDraft<AnalyzeState>, { payload }: PayloadAction<string[]>): void;
} & import("../../../redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<AnalyzeState>>;
export {};
