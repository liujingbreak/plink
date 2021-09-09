import * as rx from 'rxjs';
import { PayloadAction } from '@reduxjs/toolkit';
import { PropertyMeta } from './config.types';
import { PackageInfo } from '../package-mgr';
export interface ConfigViewState {
    /** key is packageName + ',' + propertyName */
    propertyByName: Map<string, PropertyMeta>;
    /** key is package name */
    packageMetaByName: Map<string, {
        properties: string[];
        typeFile: string;
    }>;
    packageNames?: string[];
    updateChecksum: number;
}
export declare const configViewSlice: import("@reduxjs/toolkit").Slice<ConfigViewState, {
    loadPackageSettingMeta(d: import("immer/dist/internal").WritableDraft<ConfigViewState>, action: PayloadAction<{
        workspaceKey: string;
        packageName?: string;
    }>): void;
    _packageSettingMetaLoaded(s: import("immer/dist/internal").WritableDraft<ConfigViewState>, { payload: [propMetas, dtsFile, pkg] }: PayloadAction<[PropertyMeta[], string, PackageInfo]>): void;
    packageSettingsMetaLoaded(s: import("immer/dist/internal").WritableDraft<ConfigViewState>): void;
} & import("../../../packages/redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<ConfigViewState>, "configView">;
export declare const dispatcher: import("@reduxjs/toolkit").CaseReducerActions<{
    loadPackageSettingMeta(d: import("immer/dist/internal").WritableDraft<ConfigViewState>, action: PayloadAction<{
        workspaceKey: string;
        packageName?: string;
    }>): void;
    _packageSettingMetaLoaded(s: import("immer/dist/internal").WritableDraft<ConfigViewState>, { payload: [propMetas, dtsFile, pkg] }: PayloadAction<[PropertyMeta[], string, PackageInfo]>): void;
    packageSettingsMetaLoaded(s: import("immer/dist/internal").WritableDraft<ConfigViewState>): void;
} & import("../../../packages/redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<ConfigViewState>>;
export declare function getState(): ConfigViewState;
export declare function getStore(): rx.Observable<ConfigViewState>;
