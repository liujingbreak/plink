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
export interface PayloadAction<S, P = any[]> {
    type: string;
    payload: P;
    reducer?(old: S, ...payload: P extends Array<infer I> ? I[] : [P]): S | void;
}
export type Reducers<S, R = any> = {
    [K in keyof R]: (state: S, ...payload: any[]) => S | void;
};
export type Actions<S, R> = {
    [K in keyof R]: R[K] extends (s: S) => any ? {
        (): ActionTypes<S, R>[K];
        type: string;
    } : R[K] extends (s: S, payload: infer P) => any ? {
        (payload: P): ActionTypes<S, R>[K];
        type: string;
    } : R[K] extends (s: S, ...payload: infer M) => any ? {
        (...payload: M): ActionTypes<S, R>[K];
        type: string;
    } : {
        (): ActionTypes<S, R>[K];
        type: string;
    };
};
type ActionTypes<S, R> = {
    [K in keyof R]: R[K] extends (s: S) => any ? Action<S> : R[K] extends (s: S, payload: infer P) => any ? PayloadAction<S, P> : R[K] extends (s: S, ...payload: infer M) => any ? PayloadAction<S, M> : PayloadAction<S, unknown>;
};
type OutputActionObs<S, R extends Reducers<any>, K extends keyof R> = rx.Observable<R[K] extends (s: S) => any ? Action<S> : R[K] extends (s: S, payload: infer P) => any ? PayloadAction<S, P> : PayloadAction<S, unknown>>;
type OfTypePipeOp<S, R extends Reducers<S>, K extends keyof R> = (src: rx.Observable<PayloadAction<S> | Action<S>>) => OutputActionObs<S, R, K>;
/** same as ofPayloadAction() , to filter action stream by type, unlike ofPayloadAction(), parameter is a string instead of actionCreator */
export interface OfTypeFn<S, R extends Reducers<S>> {
    <K1 extends keyof R>(actionType: K1): OfTypePipeOp<S, R, K1>;
    <K1 extends keyof R, K2 extends keyof R>(actionType: K1, actionType2: K2): OfTypePipeOp<S, R, K1 | K2>;
    <K1 extends keyof R, K2 extends keyof R, K3 extends keyof R>(actionType: K1, actionType2: K2, actionType3: K3): OfTypePipeOp<S, R, K1 | K2 | K3>;
    <K extends keyof R>(...actionTypes: K[]): OfTypePipeOp<S, R, K>;
}
export type EpicFactory<S, R extends Reducers<S>> = (slice: Slice<S, R>, ofType: OfTypeFn<S, R>) => Epic<S> | void;
export interface Slice<S, R extends Reducers<S>> {
    name: string | number;
    state$: rx.BehaviorSubject<S>;
    /** Action creator functions */
    action$: rx.Observable<PayloadAction<any> | Action<S>>;
    action$ByType: ActionByType<S, R>;
    dispatch: (action: PayloadAction<S> | Action<S>) => void;
    /** Action creators bound with dispatcher */
    actionDispatcher: Actions<S, R>;
    /** Action creators */
    actions: Actions<S, R>;
    destroy: () => void;
    destroy$: rx.Observable<any>;
    /**
     *
     * @param epic the "Epic" stream of actions-in, actions-out, refer to https://redux-observable.js.org/docs/basics/Epics.html
     * @returns a function to destory (subscribe from) epic
     */
    epic(epic: Epic<S>): void;
    /**
     * epic(epic) is recommended to be used instead of addEpic(), it has conciser method signature.
     * @param epicFactory a factory function which creates the "Epic" (stream of actions-in and actions-out,
     *  refer to https://redux-observable.js.org/docs/basics/Epics.html)
     * @returns a function to remove/unsubscribe this epic
     */
    addEpic(epicFactory: EpicFactory<S, R>): () => void;
    /**
     * Most of the time you just need epic(epic), this method is convenient in case of constantly "adding"
     * new epic after "unsubscribe" from preceding old epic
     * @param epicFactory$ this observable will be "switchMap()"ed in a pipeline
     */
    addEpic$(epicFactory$: rx.Observable<EpicFactory<S, R> | null | undefined>): () => void;
    getStore(): rx.Observable<S>;
    getState(): S;
    /** un-processed actions go through this operator */
    setActionInterceptor(intec: rx.OperatorFunction<PayloadAction<S, any> | Action<S>, PayloadAction<S, any> | Action<S>>): void;
}
export type Epic<S, A$ = rx.Observable<PayloadAction<S, any> | Action<S>>> = (actions: A$, states: rx.BehaviorSubject<S>) => A$;
type ActionOfCreator<C> = C extends {
    (): any;
    type: string;
} ? {
    type: string;
    payload: undefined;
} : C extends {
    (payload: infer P): any;
    type: string;
} ? {
    type: string;
    payload: P;
} : C extends {
    (...args: infer M): any;
    type: string;
} ? {
    type: string;
    payload: M;
} : unknown;
export interface OfPayloadActionFn {
    <C>(actionCreators: C): rx.OperatorFunction<any, ActionOfCreator<C>>;
    <C1, C2>(actionCreators: C1, actionCreators1: C2): rx.OperatorFunction<any, ActionOfCreator<C1> | ActionOfCreator<C2>>;
    <C1, C2, C3>(actionCreators: C1, actionCreators1: C2, actionCreators2: C3): rx.OperatorFunction<any, ActionOfCreator<C1> | ActionOfCreator<C2> | ActionOfCreator<C3>>;
    (...actionCreators: {
        type: string;
    }[]): rx.OperatorFunction<any, {
        type: string;
        payload?: unknown;
    }>;
}
export declare const ofPayloadAction: OfPayloadActionFn;
type ActionByType<S, R> = {
    [K in keyof R]: rx.Observable<ActionTypes<S, R>[K]>;
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
export declare function castByActionType<S, R extends Reducers<S>>(actionCreators: Actions<S, R>, action$: rx.Observable<PayloadAction<any> | Action<S>>): ActionByType<S, R>;
export declare function isActionOfCreator<C extends {
    type: string;
}>(action: any, actionCreator: C): action is ActionOfCreator<C>;
export interface SliceOptions<RS, R extends Reducers<RS>, S extends RS = RS> {
    name: string;
    initialState: S;
    reducers: R;
    /** Generate unique ID as part of slice's name, default: true */
    generateId?: boolean;
    debug?: boolean;
    debugActionOnly?: boolean;
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
export declare function action$OfSlice<S, R extends Reducers<S>, T extends keyof R>(slice: Slice<S, R>, actionType: T): rx.Observable<R[T] extends (s: any) => any ? {
    type: T;
} : R[T] extends (s: any, p: infer P) => any ? {
    payload: P;
    type: T;
} : never>;
/**
 * @deprecated use Slice['action$ByType'] instead
 */
export declare function action$ByType<S, R extends Reducers<S>>(slice: Slice<S, R>): ActionByType<S, R>;
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
