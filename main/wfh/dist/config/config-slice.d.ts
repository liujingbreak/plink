import * as rx from 'rxjs';
import { GlobalOptions } from '../cmd/types';
import { PayloadAction } from '@reduxjs/toolkit';
import { PackagesConfig } from 'package-settings';
export declare type BasePlinkSettings = {
    /** Node.js server port number */
    port: number | string;
    publicPath: string;
    localIP: string;
    /**
     * process.env.NODE_ENV will be automatically
     * updated to 'developement' or 'production corresponding to this property
     * */
    devMode: boolean;
    /** default directory is <rootDir>/dist */
    destDir: string;
    /** default directory is <rootDir>/dist/static */
    staticDir: string;
    /** default directory is <rootDir>/dist/server server side render resource directory */
    serverDir: string;
    /** Repository directory */
    rootPath: string;
    /** Node package scope names, omit leading "@" and tailing "/" character,
     * when we type package names in command line, we can omit scope name part,
     * Plink can guess complete package name based on this property
     */
    packageScopes: string[];
    /** Plink command line options */
    cliOptions?: GlobalOptions;
    logger?: {
        noFileLimit: boolean;
        onlyFileOut: boolean;
    };
    /** command line "--prop <json-path>=<json-value>" arguments */
    [cliProp: string]: unknown;
    /** @deprecated */
    outputPathMap: {
        [pkgName: string]: string;
    };
    /** default is '/' */
    nodeRoutePath: string;
    /** @deprecated */
    staticAssetsURL: string;
    /** @deprecated */
    packageContextPathMapping: {
        [path: string]: string;
    };
    browserSideConfigProp: string[];
    /** @deprecated */
    enableSourceMaps: boolean;
};
export declare type DrcpSettings = BasePlinkSettings & PackagesConfig;
export declare const configSlice: import("@reduxjs/toolkit").Slice<DrcpSettings, {
    saveCliOption(s: import("immer/dist/internal").WritableDraft<DrcpSettings>, { payload }: PayloadAction<GlobalOptions>): void;
} & import("../../../packages/redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<DrcpSettings>, "config">;
export declare const dispatcher: import("@reduxjs/toolkit").CaseReducerActions<{
    saveCliOption(s: import("immer/dist/internal").WritableDraft<DrcpSettings>, { payload }: PayloadAction<GlobalOptions>): void;
} & import("../../../packages/redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<DrcpSettings>>;
export declare function getState(): DrcpSettings;
export declare function getStore(): rx.Observable<DrcpSettings>;
