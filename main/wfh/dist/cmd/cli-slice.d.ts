import { PayloadAction } from '@reduxjs/toolkit';
import { OurCommandMetadata } from './types';
export interface CliState {
    /** key is package name, value is Command name and args */
    commandByPackage: Map<string, OurCommandMetadata['nameAndArgs'][]>;
    commandInfoByName: Map<OurCommandMetadata['nameAndArgs'], OurCommandMetadata>;
    version: string;
    osLang?: string;
    osCountry?: string;
}
export interface CliExtension {
    pkName: string;
    pkgFilePath: string;
    funcName?: string;
}
export declare const cliSlice: import("@reduxjs/toolkit").Slice<CliState, {
    plinkUpgraded(d: import("immer/dist/internal").WritableDraft<CliState>, { payload: newVersion }: PayloadAction<string>): void;
    updateLocale(d: import("immer/dist/internal").WritableDraft<CliState>, { payload: [lang, country] }: PayloadAction<[string, string]>): void;
    addCommandMeta(d: import("immer/dist/internal").WritableDraft<CliState>, { payload: { pkg, metas } }: {
        payload: {
            pkg: string;
            metas: OurCommandMetadata[];
        };
        type: string;
    }): void;
} & import("../../../redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<CliState>, "cli">;
export declare const cliActionDispatcher: import("@reduxjs/toolkit").CaseReducerActions<{
    plinkUpgraded(d: import("immer/dist/internal").WritableDraft<CliState>, { payload: newVersion }: PayloadAction<string>): void;
    updateLocale(d: import("immer/dist/internal").WritableDraft<CliState>, { payload: [lang, country] }: PayloadAction<[string, string]>): void;
    addCommandMeta(d: import("immer/dist/internal").WritableDraft<CliState>, { payload: { pkg, metas } }: {
        payload: {
            pkg: string;
            metas: OurCommandMetadata[];
        };
        type: string;
    }): void;
} & import("../../../redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<CliState>>;
export declare function getState(): CliState;
export declare function getStore(): import("rxjs").Observable<CliState>;
export declare function availabeCliExtension(): void;
