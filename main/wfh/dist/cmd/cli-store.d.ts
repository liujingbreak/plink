import { PayloadAction } from '@reduxjs/toolkit';
export interface CliState {
    extensions: Map<string, CliExtension>;
    version: string;
}
interface CliExtension {
    pkName: string;
    pkgFilePath: string;
    funcName?: string;
}
export declare const cliSlice: import("@reduxjs/toolkit").Slice<CliState, {
    updateExtensions(draft: {
        extensions: Map<string, {
            pkName: string;
            pkgFilePath: string;
            funcName?: string | undefined;
        }>;
        version: string;
    }, { payload }: PayloadAction<CliExtension[]>): void;
    plinkUpgraded(d: {
        extensions: Map<string, {
            pkName: string;
            pkgFilePath: string;
            funcName?: string | undefined;
        }>;
        version: string;
    }, { payload: newVersion }: PayloadAction<string>): void;
} & import("../../../redux-toolkit-abservable/dist/redux-toolkit-observable").ExtraSliceReducers<CliState>, "cli">;
export declare const cliActionDispatcher: import("@reduxjs/toolkit").CaseReducerActions<{
    updateExtensions(draft: {
        extensions: Map<string, {
            pkName: string;
            pkgFilePath: string;
            funcName?: string | undefined;
        }>;
        version: string;
    }, { payload }: PayloadAction<CliExtension[]>): void;
    plinkUpgraded(d: {
        extensions: Map<string, {
            pkName: string;
            pkgFilePath: string;
            funcName?: string | undefined;
        }>;
        version: string;
    }, { payload: newVersion }: PayloadAction<string>): void;
} & import("../../../redux-toolkit-abservable/dist/redux-toolkit-observable").ExtraSliceReducers<CliState>>;
export declare function getState(): CliState;
export declare function getStore(): import("rxjs").Observable<CliState>;
export declare function availabeCliExtension(): void;
export {};
