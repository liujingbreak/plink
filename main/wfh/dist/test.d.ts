import { PayloadAction } from '@reduxjs/toolkit';
export interface ExampleState {
    foo: number;
    _computed: {
        bar: string;
    };
}
export declare const exampleSlice: import("@reduxjs/toolkit").Slice<ExampleState, {
    start(d: {
        foo: number;
        _computed: {
            bar: string;
        };
    }, { payload }: PayloadAction<void>): void;
    exampleAction(draft: {
        foo: number;
        _computed: {
            bar: string;
        };
    }, { payload }: PayloadAction<number>): void;
} & import("../../redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<ExampleState>, "example">;
export declare const exampleActionDispatcher: import("@reduxjs/toolkit").CaseReducerActions<{
    start(d: {
        foo: number;
        _computed: {
            bar: string;
        };
    }, { payload }: PayloadAction<void>): void;
    exampleAction(draft: {
        foo: number;
        _computed: {
            bar: string;
        };
    }, { payload }: PayloadAction<number>): void;
} & import("../../redux-toolkit-observable/dist/redux-toolkit-observable").ExtraSliceReducers<ExampleState>>;
export declare function getState(): ExampleState;
export declare function getStore(): import("rxjs").Observable<ExampleState>;
export default function (): void;
