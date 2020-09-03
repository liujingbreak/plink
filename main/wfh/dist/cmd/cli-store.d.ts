import { PayloadAction } from '@reduxjs/toolkit';
export interface CliState {
    extensions: {
        pkgFilePath: string;
        funcName?: string;
    }[];
    version: string;
}
export declare const cliSlice: import("@reduxjs/toolkit").Slice<CliState, {
    updateExtensions(draft: {
        extensions: {
            pkgFilePath: string;
            funcName?: string | undefined;
        }[];
        version: string;
    }, { payload }: PayloadAction<boolean>): void;
    plinkUpgraded(d: {
        extensions: {
            pkgFilePath: string;
            funcName?: string | undefined;
        }[];
        version: string;
    }, { payload: newVersion }: PayloadAction<string>): void;
} & import("../../../redux-toolkit-abservable/dist/redux-toolkit-observable").ExtraSliceReducers<CliState>, "cli">;
export declare const cliActionDispatcher: import("@reduxjs/toolkit").CaseReducerActions<{
    updateExtensions(draft: {
        extensions: {
            pkgFilePath: string;
            funcName?: string | undefined;
        }[];
        version: string;
    }, { payload }: PayloadAction<boolean>): void;
    plinkUpgraded(d: {
        extensions: {
            pkgFilePath: string;
            funcName?: string | undefined;
        }[];
        version: string;
    }, { payload: newVersion }: PayloadAction<string>): void;
} & import("../../../redux-toolkit-abservable/dist/redux-toolkit-observable").ExtraSliceReducers<CliState>>;
export declare function getState(): CliState;
export declare function getStore(): import("rxjs").Observable<CliState>;
