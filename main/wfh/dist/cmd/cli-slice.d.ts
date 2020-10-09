import { PayloadAction } from '@reduxjs/toolkit';
export interface CliState {
    /** key is package name */
    extensions: Map<string, CliExtension>;
    version: string;
    osLang?: string;
    osCountry?: string;
    /** key: command name, value: file path */
    loadedExtensionCmds: Map<string, string>;
}
export interface CliExtension {
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
        osLang?: string | undefined;
        osCountry?: string | undefined;
        loadedExtensionCmds: Map<string, string>;
    }, { payload }: PayloadAction<CliExtension[]>): void;
    plinkUpgraded(d: {
        extensions: Map<string, {
            pkName: string;
            pkgFilePath: string;
            funcName?: string | undefined;
        }>;
        version: string;
        osLang?: string | undefined;
        osCountry?: string | undefined;
        loadedExtensionCmds: Map<string, string>;
    }, { payload: newVersion }: PayloadAction<string>): void;
    updateLocale(d: {
        extensions: Map<string, {
            pkName: string;
            pkgFilePath: string;
            funcName?: string | undefined;
        }>;
        version: string;
        osLang?: string | undefined;
        osCountry?: string | undefined;
        loadedExtensionCmds: Map<string, string>;
    }, { payload: [lang, country] }: PayloadAction<[string, string]>): void;
    updateLoadedCmd(d: {
        extensions: Map<string, {
            pkName: string;
            pkgFilePath: string;
            funcName?: string | undefined;
        }>;
        version: string;
        osLang?: string | undefined;
        osCountry?: string | undefined;
        loadedExtensionCmds: Map<string, string>;
    }, { payload }: PayloadAction<{
        cmd: string;
        file: string;
    }[]>): void;
} & import("../../../redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<CliState>, "cli">;
export declare const cliActionDispatcher: import("@reduxjs/toolkit").CaseReducerActions<{
    updateExtensions(draft: {
        extensions: Map<string, {
            pkName: string;
            pkgFilePath: string;
            funcName?: string | undefined;
        }>;
        version: string;
        osLang?: string | undefined;
        osCountry?: string | undefined;
        loadedExtensionCmds: Map<string, string>;
    }, { payload }: PayloadAction<CliExtension[]>): void;
    plinkUpgraded(d: {
        extensions: Map<string, {
            pkName: string;
            pkgFilePath: string;
            funcName?: string | undefined;
        }>;
        version: string;
        osLang?: string | undefined;
        osCountry?: string | undefined;
        loadedExtensionCmds: Map<string, string>;
    }, { payload: newVersion }: PayloadAction<string>): void;
    updateLocale(d: {
        extensions: Map<string, {
            pkName: string;
            pkgFilePath: string;
            funcName?: string | undefined;
        }>;
        version: string;
        osLang?: string | undefined;
        osCountry?: string | undefined;
        loadedExtensionCmds: Map<string, string>;
    }, { payload: [lang, country] }: PayloadAction<[string, string]>): void;
    updateLoadedCmd(d: {
        extensions: Map<string, {
            pkName: string;
            pkgFilePath: string;
            funcName?: string | undefined;
        }>;
        version: string;
        osLang?: string | undefined;
        osCountry?: string | undefined;
        loadedExtensionCmds: Map<string, string>;
    }, { payload }: PayloadAction<{
        cmd: string;
        file: string;
    }[]>): void;
} & import("../../../redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<CliState>>;
export declare function getState(): CliState;
export declare function getStore(): import("rxjs").Observable<CliState>;
export declare function availabeCliExtension(): void;
