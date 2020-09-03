import { PayloadAction } from '@reduxjs/toolkit';
export interface CliState {
    extensions: {
        pkgFilePath: string;
        funcName?: string;
    }[];
}
export declare const cliSlice: import("@reduxjs/toolkit").Slice<CliState, {
    updateExtensions(draft: {
        extensions: {
            pkgFilePath: string;
            funcName?: string | undefined;
        }[];
    }, { payload }: PayloadAction<boolean>): void;
} & import("../../../redux-toolkit-abservable/dist/redux-toolkit-observable").ExtraSliceReducers<CliState>, "cli">;
export declare const exampleActionDispatcher: import("@reduxjs/toolkit").CaseReducerActions<{
    updateExtensions(draft: {
        extensions: {
            pkgFilePath: string;
            funcName?: string | undefined;
        }[];
    }, { payload }: PayloadAction<boolean>): void;
} & import("../../../redux-toolkit-abservable/dist/redux-toolkit-observable").ExtraSliceReducers<CliState>>;
export declare function getState(): CliState;
export declare function getStore(): import("rxjs").Observable<CliState>;
