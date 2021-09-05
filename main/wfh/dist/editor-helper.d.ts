import * as rx from 'rxjs';
import { PayloadAction } from '@reduxjs/toolkit';
interface EditorHelperState {
    /** tsconfig files should be changed according to linked packages state */
    tsconfigByRelPath: Map<string, HookedTsconfig>;
}
interface HookedTsconfig {
    /** absolute path or path relative to root path, any path that is stored in Redux store, the better it is in form of
     * relative path of Root path
     */
    relPath: string;
    baseUrl: string;
    originJson: any;
}
export declare const dispatcher: import("@reduxjs/toolkit").CaseReducerActions<{
    hookTsconfig(s: import("immer/dist/internal").WritableDraft<EditorHelperState>, { payload }: PayloadAction<string[]>): void;
    unHookTsconfig(s: import("immer/dist/internal").WritableDraft<EditorHelperState>, { payload }: PayloadAction<string[]>): void;
    unHookAll(): void;
} & import("../redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<EditorHelperState>>;
export declare function getState(): EditorHelperState;
export declare function getStore(): rx.Observable<EditorHelperState>;
export {};
