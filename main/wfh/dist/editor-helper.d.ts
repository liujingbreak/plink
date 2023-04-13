import * as rx from 'rxjs';
import { PayloadAction } from '@reduxjs/toolkit';
interface EditorHelperState {
    /** tsconfig files should be changed according to linked packages state */
    tsconfigByRelPath: Map<string, HookedTsconfig>;
    /** Problematic symlinks which must be removed before running:
     *
     * When node_modules symlink is under source package directory (if there is only one source package in this project, and its parent directory
     * is root directory directly, then Plink must create a symlink "node_modules" to linked to node_modules which is under current worktree space,
     * and the symlink have to be inside source package), it will not work with "--preserve-symlinks",
     * in which case, Node.js will regard a workspace node_module and its symlink inside source package as
     * two different directory, and causes problem like same 3rd party module is loaded twice for the dependent source package
     */
    nodeModuleSymlinks?: Set<string>;
}
interface HookedTsconfig {
    /** absolute path or path relative to root path, any path that is stored in Redux store, the better it is in form of
     * relative path of Root path
     */
    relPath: string;
    baseUrl: string;
    originJson: any;
}
declare const slice: import("@reduxjs/toolkit").Slice<EditorHelperState, {
    clearSymlinks(): void;
    hookTsconfig(s: import("immer/dist/internal").WritableDraft<EditorHelperState>, { payload }: PayloadAction<string[]>): void;
    unHookTsconfig(s: import("immer/dist/internal").WritableDraft<EditorHelperState>, { payload }: PayloadAction<string[]>): void;
    unHookAll(): void;
    clearSymlinksDone(S: import("immer/dist/internal").WritableDraft<EditorHelperState>): void;
} & import("../../packages/redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<EditorHelperState>, "editor-helper">;
export declare const dispatcher: import("@reduxjs/toolkit").CaseReducerActions<{
    clearSymlinks(): void;
    hookTsconfig(s: import("immer/dist/internal").WritableDraft<EditorHelperState>, { payload }: PayloadAction<string[]>): void;
    unHookTsconfig(s: import("immer/dist/internal").WritableDraft<EditorHelperState>, { payload }: PayloadAction<string[]>): void;
    unHookAll(): void;
    clearSymlinksDone(S: import("immer/dist/internal").WritableDraft<EditorHelperState>): void;
} & import("../../packages/redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<EditorHelperState>, "editor-helper">;
export declare function getAction$(type: keyof (typeof slice)['caseReducers']): rx.Observable<{
    type: any;
} | {
    payload: any;
    type: any;
}>;
export declare function getState(): EditorHelperState;
export declare function getStore(): rx.Observable<EditorHelperState>;
export {};
