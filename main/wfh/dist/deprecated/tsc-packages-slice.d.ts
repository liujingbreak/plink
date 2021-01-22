import { PayloadAction } from '@reduxjs/toolkit';
import { Observable } from 'rxjs';
export interface PackageJsonTscPropertyItem {
    rootDir: string;
    outDir: string;
    files?: string[];
    /** "references" in tsconfig https://www.typescriptlang.org/docs/handbook/project-references.html */
    references?: string[];
}
export interface TscState {
    /** key is package name */
    configs: Map<string, PackageJsonTscPropertyItem[]>;
}
export declare const tscSlice: import("@reduxjs/toolkit").Slice<TscState, {
    putConfig(draft: {
        configs: Map<string, {
            rootDir: string;
            outDir: string;
            files?: string[] | undefined;
            references?: string[] | undefined;
        }[]>;
    }, { payload }: PayloadAction<{
        pkg: string;
        items: PackageJsonTscPropertyItem[];
    }[]>): void;
} & import("../../../redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<TscState>, "tsc">;
export declare const tscActionDispatcher: import("@reduxjs/toolkit").CaseReducerActions<{
    putConfig(draft: {
        configs: Map<string, {
            rootDir: string;
            outDir: string;
            files?: string[] | undefined;
            references?: string[] | undefined;
        }[]>;
    }, { payload }: PayloadAction<{
        pkg: string;
        items: PackageJsonTscPropertyItem[];
    }[]>): void;
} & import("../../../redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<TscState>>;
export declare function getState(): TscState;
export declare function getStore(): Observable<TscState>;
