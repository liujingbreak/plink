import { StateFactory, ExtraSliceReducers } from './redux-toolkit-observable';
import { CreateSliceOptions, SliceCaseReducers, Slice, PayloadAction, CaseReducerActions, Draft } from '@reduxjs/toolkit';
import { Epic } from 'redux-observable';
import { Observable } from 'rxjs';
export declare type EpicFactory<S, R extends SliceCaseReducers<S>> = (slice: SliceHelper<S, R>) => Epic<PayloadAction<any>, any, unknown> | void;
export declare type SliceHelper<S, R extends SliceCaseReducers<S>> = Slice<S, R> & {
    actionDispatcher: CaseReducerActions<R & ExtraSliceReducers<S>>;
    addEpic(epicFactory: EpicFactory<S, R>): void;
    addEpic$(epicFactory: Observable<EpicFactory<S, R> | null | undefined>): void;
    destroy(): void;
    getStore(): Observable<S>;
    getState(): S;
};
export declare function createSliceHelper<S, R extends SliceCaseReducers<S>>(stateFactory: StateFactory, opts: CreateSliceOptions<S, R>): SliceHelper<S, R>;
interface SimpleReducers<S> {
    [K: string]: (draft: Draft<S>, payload?: any) => S | void | Draft<S>;
}
declare type RegularReducers<S, R> = {
    [K in keyof R]: R[K] extends (s: any) => any ? (s: Draft<S>) => S | void | Draft<S> : R[K] extends (s: any, payload: infer P) => any ? (s: Draft<S>, action: PayloadAction<P>) => void | Draft<S> : (s: Draft<S>, action: PayloadAction<unknown>) => void | Draft<S>;
};
/**
 * createReducers helps to simplify how we writing definition of SliceCaseReducers,
 * e.g. A regular SliceCaseReducers takes PayloadAction as parameter, like:
 * ```ts
 * const reducers = {
 *   reducerName(state: State, {payload}: PayloadAction<number>) {
 *      // update state with payload data
 *    }
 * };
 * ```
 * Normally reducer's logic only care about `payload` instead of `PayloadAction`,
 * createReducers accepts a simpler format:
 * ```ts
 * const reducers = createReducers({
 *   reducerName(draft: State, payload: number) {
 *   }
 * });
 * ```
 * You can declare payload as reducer's parameter instead of a PayloadAction
 * @param simpleReducers
 * @returns SliceCaseReducers which can be part of parameter of createSliceHelper
 */
export declare function createReducers<S, R extends SimpleReducers<S>>(simpleReducers: R): RegularReducers<S, R>;
export {};
