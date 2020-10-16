/**
 * Files needs to be clean
 */
export interface CleanState {
}
export declare const slice: import("@reduxjs/toolkit").Slice<CleanState, {
    deleteSymlinks(): void;
} & import("../../../redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<CleanState>, "clean">;
declare const deleteSymlinks: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<string>;
export { deleteSymlinks };
export declare function getState(): CleanState;
export declare function getStore(): import("rxjs").Observable<CleanState>;
export declare const actions: import("@reduxjs/toolkit").CaseReducerActions<{
    deleteSymlinks(): void;
} & import("../../../redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<CleanState>>;
