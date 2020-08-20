import { PayloadAction } from '@reduxjs/toolkit';
export default function clean(onlySymlink?: boolean): Promise<void>;
/**
 * Files needs to be clean
 */
export interface CleanState {
    workspace: {
        [path: string]: boolean;
    };
    projectSource: {
        [project: string]: {
            [path: string]: boolean;
        };
    };
}
export declare const slice: import("@reduxjs/toolkit").Slice<CleanState, {
    addWorkspaceFile(state: {
        workspace: {
            [x: string]: boolean;
        };
        projectSource: {
            [x: string]: {
                [x: string]: boolean;
            };
        };
    }, { payload: files }: PayloadAction<string[]>): void;
    addSourceFile(state: {
        workspace: {
            [x: string]: boolean;
        };
        projectSource: {
            [x: string]: {
                [x: string]: boolean;
            };
        };
    }, { payload: { project, files } }: {
        payload: {
            project: string;
            files: string[];
        };
        type: string;
    }): void;
} & import("../../../redux-toolkit-abservable/dist/redux-toolkit-observable").ExtraSliceReducers<CleanState>, "clean">;
export declare function getState(): CleanState;
export declare function getStore(): import("rxjs").Observable<CleanState>;
export declare const actions: import("@reduxjs/toolkit").CaseReducerActions<{
    addWorkspaceFile(state: {
        workspace: {
            [x: string]: boolean;
        };
        projectSource: {
            [x: string]: {
                [x: string]: boolean;
            };
        };
    }, { payload: files }: PayloadAction<string[]>): void;
    addSourceFile(state: {
        workspace: {
            [x: string]: boolean;
        };
        projectSource: {
            [x: string]: {
                [x: string]: boolean;
            };
        };
    }, { payload: { project, files } }: {
        payload: {
            project: string;
            files: string[];
        };
        type: string;
    }): void;
} & import("../../../redux-toolkit-abservable/dist/redux-toolkit-observable").ExtraSliceReducers<CleanState>>;
export declare type ActionsType = typeof actions extends Promise<infer T> ? T : unknown;
