import { PayloadAction } from '@reduxjs/toolkit';
import * as rx from 'rxjs';
import { PackageInfo } from '../package-mgr';
import { PropertyMeta } from './config.types';
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
    loadPackageSettingMeta(_d: import("immer/dist/internal.js").WritableDraft<ConfigViewState>, _action: PayloadAction<{
        workspaceKey: string;
        packageName?: string;
    }>): void;
    _packageSettingMetaLoaded(s: import("immer/dist/internal.js").WritableDraft<ConfigViewState>, { payload: [propMetas, dtsFile, pkg] }: PayloadAction<[PropertyMeta[], string, PackageInfo]>): void;
    packageSettingsMetaLoaded(s: import("immer/dist/internal.js").WritableDraft<ConfigViewState>): void;
} & import("@wfh/redux-toolkit-observable").ExtraSliceReducers<ConfigViewState>, "configView">;
export declare const dispatcher: import("@reduxjs/toolkit").CaseReducerActions<{
    loadPackageSettingMeta(_d: import("immer/dist/internal.js").WritableDraft<ConfigViewState>, _action: PayloadAction<{
        workspaceKey: string;
        packageName?: string;
    }>): void;
    _packageSettingMetaLoaded(s: import("immer/dist/internal.js").WritableDraft<ConfigViewState>, { payload: [propMetas, dtsFile, pkg] }: PayloadAction<[PropertyMeta[], string, PackageInfo]>): void;
    packageSettingsMetaLoaded(s: import("immer/dist/internal.js").WritableDraft<ConfigViewState>): void;
} & import("@wfh/redux-toolkit-observable").ExtraSliceReducers<ConfigViewState>, "configView">;
export declare function getState(): ConfigViewState;
export declare function getStore(): rx.Observable<ConfigViewState>;
