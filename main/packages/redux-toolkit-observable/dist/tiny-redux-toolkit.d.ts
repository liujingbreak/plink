/**
 * This file provide some hooks which leverages RxJS to mimic Redux-toolkit + Redux-observable
 * which is supposed to be used independently within any React component in case your component has
 * complicated async state change logic.
 *
 * - it is small and supposed to be well performed
 * - it does not use ImmerJS, you should take care of immutability of state by yourself
 * - because there is no ImmerJS, you can put any type of Object in state including those are not friendly by ImmerJS
 */
import * as rx from 'rxjs';
export interface Action<S> {
    type: string;
    reducer?(old: S): S | void;
}
export interface PayloadAction<S, P = any> {
    type: string;
    payload: P;
    reducer?(old: S, payload: P): S | void;
}
export declare type Reducers<S, R = any> = {
    [K in keyof R]: (state: S, payload?: any) => S | void;
};
export declare type Actions<S, R> = {
    [K in keyof R]: R[K] extends (s: S) => any ? ActionCreatorWithoutPayload<S> : R[K] extends (s: S, payload: infer P) => any ? ActionCreatorWithPayload<S, P> : ActionCreatorWithPayload<S, unknown>;
};
export declare type ActionCreator<S, P> = ActionCreatorWithoutPayload<S> | ActionCreatorWithPayload<S, P>;
interface ActionCreatorWithoutPayload<S> {
    (): Action<S>;
    type: string;
}
interface ActionCreatorWithPayload<S, P> {
    (payload: P): PayloadAction<S, P>;
    type: string;
}
declare type OutputActionObs<S, R extends Reducers<any>, K extends keyof R> = rx.Observable<R[K] extends (s: S) => any ? Action<S> : R[K] extends (s: S, payload: infer P) => any ? PayloadAction<S, P> : PayloadAction<S, unknown>>;
declare type OfTypePipeOp<S, R extends Reducers<S>, K extends keyof R> = (src: rx.Observable<PayloadAction<S> | Action<S>>) => OutputActionObs<S, R, K>;
/** same as ofPayloadAction() , to filter action stream by type, unlike ofPayloadAction(), parameter is a string instead of actionCreator */
export interface OfTypeFn<S, R extends Reducers<S>> {
    <K1 extends keyof R>(actionType: K1): OfTypePipeOp<S, R, K1>;
    <K1 extends keyof R, K2 extends keyof R>(actionType: K1, actionType2: K2): OfTypePipeOp<S, R, K1 | K2>;
    <K1 extends keyof R, K2 extends keyof R, K3 extends keyof R>(actionType: K1, actionType2: K2, actionType3: K3): OfTypePipeOp<S, R, K1 | K2 | K3>;
    <K extends keyof R>(...actionTypes: K[]): OfTypePipeOp<S, R, K>;
}
export declare type EpicFactory<S, R extends Reducers<S>> = (slice: Slice<S, R>, ofType: OfTypeFn<S, R>) => Epic<S> | void;
export interface Slice<S, R extends Reducers<S>> {
    name: string | number;
    state$: rx.BehaviorSubject<S>;
    action$: rx.Observable<PayloadAction<any> | Action<S>>;
    dispatch: (action: PayloadAction<S> | Action<S>) => void;
    /** Action creators bound with dispatcher */
    actionDispatcher: Actions<S, R>;
    /** Action creators */
    actions: Actions<S, R>;
    destroy: () => void;
    destroy$: rx.Observable<any>;
    addEpic(epicFactory: EpicFactory<S, R>): () => void;
    addEpic$(epicFactory$: rx.Observable<EpicFactory<S, R> | null | undefined>): () => void;
    getStore(): rx.Observable<S>;
    getState(): S;
}
export declare type Epic<S, A$ = rx.Observable<PayloadAction<S, any> | Action<S>>> = (actions: A$, states: rx.BehaviorSubject<S>) => A$;
/** filter action stream by type */
export declare function ofPayloadAction<S, P>(actionCreators: ActionCreator<S, P>): rx.OperatorFunction<any, PayloadAction<S, P>>;
export declare function ofPayloadAction<S, P, S1, P1>(actionCreators: ActionCreator<S, P>, actionCreators1: ActionCreator<S1, P1>): rx.OperatorFunction<any, PayloadAction<S, P> | PayloadAction<S1, P1>>;
export declare function ofPayloadAction<S, P, S1, P1, S2, P2>(actionCreators: ActionCreator<S, P>, actionCreators1: ActionCreator<S1, P1>, actionCreators2: ActionCreator<S2, P2>): rx.OperatorFunction<any, PayloadAction<S, P> | PayloadAction<S1, P1> | PayloadAction<S2, P2>>;
/**
 * Map action stream to multiple action streams by theire action type.
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
export declare function castByActionType<S, R extends Reducers<S>>(actionCreators: Actions<S, R>, action$: rx.Observable<PayloadAction<any> | Action<S>>): {
    [K in keyof R]: rx.Observable<ReturnType<Actions<S, R>[K]>>;
};
export declare function isActionOfCreator<P, S>(action: PayloadAction<any, any>, actionCreator: ActionCreatorWithPayload<S, P>): action is PayloadAction<S, P>;
export interface SliceOptions<S, R extends Reducers<S>> {
    name: string;
    initialState: S;
    reducers: R;
    /** Generate unique ID as part of slice's name, default: true */
    generateId?: boolean;
    debug?: boolean;
    rootStore?: rx.BehaviorSubject<{
        [k: string]: S;
    }>;
}
/**
 * Reducers and initialState are reused cross multiple component
 *
 *  Slice --- Component instance (state, actions)
 */
export declare function createSlice<S extends {
    error?: Error;
}, R extends Reducers<S>>(opt: SliceOptions<S, R>): Slice<S, R>;
export declare function action$OfSlice<S, R extends Reducers<S>, T extends keyof R>(sliceHelper: Slice<S, R>, actionType: T): rx.Observable<R[T] extends (s: any) => any ? {
    type: T;
} : R[T] extends (s: any, p: infer P) => any ? {
    payload: P;
    type: T;
} : never>;
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
export declare function sliceRefActionOp<S, R extends Reducers<S>>(epicFactory: EpicFactory<S, R>): rx.OperatorFunction<PayloadAction<any, Slice<S, R>>, PayloadAction<any, any>>;
export {};
