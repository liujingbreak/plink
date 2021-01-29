import { PayloadAction } from '@reduxjs/toolkit';
export interface TestState {
    foo: boolean;
    _computed: {
        bar: string;
    };
}
export declare const dispatcher: import("@reduxjs/toolkit").CaseReducerActions<{
    exampleAction(s: import("immer/dist/internal").WritableDraft<TestState>, { payload }: PayloadAction<boolean>): void;
} & import("../redux-toolkit-observable/es/redux-toolkit-observable").ExtraSliceReducers<TestState>>;
export declare function getState(): TestState;
export declare function getStore(): import("rxjs").Observable<TestState>;
