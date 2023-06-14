import { CreateSliceOptions, SliceCaseReducers, Slice, PayloadAction, CaseReducerActions, PayloadActionCreator, Action, Draft, ActionCreatorWithPayload } from '@reduxjs/toolkit';
import { Epic } from 'redux-observable';
import { Observable, OperatorFunction } from 'rxjs';
import { immerable } from 'immer';
import { StateFactory, ExtraSliceReducers } from './redux-toolkit-observable';
export type EpicFactory<S, R extends SliceCaseReducers<S>, Name extends string = string> = (slice: SliceHelper<S, R, Name>) => Epic<PayloadAction<any>, any, {
    [sliceName in Name]: S;
}> | void;
/**
 * A separate Redux slice which has its own life cycle, works for component internal state management.
 * Compare to React's useReducer() hook, sliceHelper offers more strong functionality for complicated component,
 * it uses redux-observable to resolve async action needs.
 */
export type SliceHelper<S, R extends SliceCaseReducers<S>, Name extends string = string> = Slice<S, R, Name> & {
    /** You don't have to create en Epic for subscribing action stream, you subscribe this property
     * to react on 'done' reducer action, and you may call actionDispatcher to emit a new action
     */
    action$: Observable<PayloadAction | Action>;
    action$ByType: ActionByType<CaseReducerActions<R & ExtraSliceReducers<S>, Name>>;
    actionDispatcher: CaseReducerActions<R & ExtraSliceReducers<S>, Name>;
    destroy$: Observable<any>;
    addEpic(epicFactory: EpicFactory<S, R>): () => void;
    addEpic$(epicFactory: Observable<EpicFactory<S, R> | null | undefined>): () => void;
    destroy(): void;
    getStore(): Observable<S>;
    getState(): S;
};
export declare function createSliceHelper<S extends Record<string, any>, R extends SliceCaseReducers<S>>(stateFactory: StateFactory, opts: CreateSliceOptions<S, R>): SliceHelper<S, R>;
type SimpleReducers<S> = {
    [K: string]: (draft: S | Draft<S>, payload?: any) => S | void | Draft<S>;
};
export type RegularReducers<S, R extends SimpleReducers<S>> = {
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
type ActionByType<R> = {
    [K in keyof R]: Observable<R[K] extends PayloadActionCreator<infer P> ? PayloadAction<P> : PayloadAction<unknown>>;
};
/**
 * Map action stream to multiple action streams by their action type.
 * This is an alternative way to categorize action stream, compare to "ofPayloadAction()"
 * Usage:
```
slice.addEpic(slice => action$ => {
  const actionsByType = castByActionType(slice.actions, action$);
  return merge(
    actionsByType.REDUCER_NAME_A.pipe(
      ...
    ),
    actionsByType.REDUCER_NAME_B.pipe(
      ...
    ),
  )
})
```
 * @param actionCreators
 * @param action$
 */
export declare function castByActionType<Name extends string, R extends CaseReducerActions<SliceCaseReducers<any>, Name>>(actionCreators: R, action$: Observable<PayloadAction | Action>): ActionByType<R>;
export declare function action$ByType<S, R extends SliceCaseReducers<S>>(stateFactory: StateFactory, slice: Slice<S, R> | SliceHelper<S, R>): ActionByType<CaseReducerActions<R & ExtraSliceReducers<S>, string>>;
export declare function isActionOfCreator<P, T extends string>(action: PayloadAction<any, any>, actionCreator: ActionCreatorWithPayload<P, T>): action is PayloadAction<P, T>;
/**
 * Add an epicFactory to another component's sliceHelper
 * e.g.
 * ```
 * action$.pipe(ofPayloadAction(slice.actionDispatcher._onChildSliceRef),
 *  childSliceOp((childSlice) => {
 *    return childAction$ => {
 *      return childAction$.pipe(...);
 *    };
 *  })
 * ```
 * @param epicFactory
 */
export declare function sliceRefActionOp<S, R extends SliceCaseReducers<S>>(epicFactory: EpicFactory<S, R>): OperatorFunction<PayloadAction<SliceHelper<S, R>>, PayloadAction<any>>;
type ActionOfReducer<S, R extends SliceCaseReducers<S>, T extends keyof R> = R[T] extends (s: any, action: infer A) => any ? (A extends {
    payload: infer P;
} ? {
    payload: P;
    type: T;
} : {
    type: T;
}) : never;
export declare function action$Of<P, T extends string>(stateFactory: StateFactory, actionCreator: ActionCreatorWithPayload<P, T>): Observable<P extends undefined ? {
    type: T;
} : {
    payload: P;
    type: T;
}>;
export declare function action$OfSlice<S, R extends SliceCaseReducers<S>, T extends keyof R>(sliceHelper: SliceHelper<S, R>, actionType: T): Observable<ActionOfReducer<S, R, T>>;
/**
 * ImmerJS does not work with some large object (like HTMLElement), meaning you can not directly defined a
 * Redux-toolkit state to contain such a large object, this class provides a wrapper to those
 * "large object", and avoid ImmerJs to recursively freeze it by pre-freeze itself.
 *
 * Use it with `Immutable` to inform Redux-toolkit and ImmerJS that this type should be ignored from `drafting`
 * Usage:
 * ```
    import {Immutable} from 'immer';

    interface YourState {
      someDom: Immutable<Refrigerator<HTMLElement>>;
    }
 * ```
 */
export declare class Refrigerator<T> {
    private ref;
    [immerable]: boolean;
    static [immerable]: boolean;
    constructor(originRef: T);
    creatNewIfNoEqual(ref: T): Refrigerator<T>;
    getRef(): T;
}
export {};
