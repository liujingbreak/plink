import { OurCommandMetadata } from './types';
export interface CliState {
    /** key is package name, value is Command name and args */
    commandByPackage: Map<string, OurCommandMetadata['name'][]>;
    commandInfoByName: Map<OurCommandMetadata['name'], OurCommandMetadata>;
    version: string;
    osLang?: string;
    osCountry?: string;
}
export interface CliExtension {
    pkName: string;
    pkgFilePath: string;
    funcName?: string;
}
export declare const cliSlice: import("@reduxjs/toolkit").Slice<CliState, import("../../../packages/redux-toolkit-observable/dist/helper").RegularReducers<CliState, {
    plinkUpgraded(d: CliState, newVersion: string): void;
    updateLocale(d: CliState, [lang, country]: [string, string]): void;
    addCommandMeta(d: CliState, { pkg, metas }: {
        pkg: string;
        metas: OurCommandMetadata[];
    }): void;
}> & import("../../../packages/redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<CliState>, "cli">;
export declare const cliActionDispatcher: import("@reduxjs/toolkit").CaseReducerActions<import("../../../packages/redux-toolkit-observable/dist/helper").RegularReducers<CliState, {
    plinkUpgraded(d: CliState, newVersion: string): void;
    updateLocale(d: CliState, [lang, country]: [string, string]): void;
    addCommandMeta(d: CliState, { pkg, metas }: {
        pkg: string;
        metas: OurCommandMetadata[];
    }): void;
}> & import("../../../packages/redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<CliState>>;
export declare function getState(): CliState;
export declare function getStore(): import("rxjs").Observable<CliState>;
export declare function availabeCliExtension(): void;
