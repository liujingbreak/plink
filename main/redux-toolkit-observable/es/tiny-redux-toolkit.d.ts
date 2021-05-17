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
export interface Reducers<S> {
    /** Returning `undefined / void` has same effect of returning old state reference,
     * Returning a brand new state object for immutability in normal case.
     */
    [type: string]: (state: S, payload?: any) => S | void;
}
export declare type Actions<S, R extends Reducers<S>> = {
    [K in keyof R]: R[K] extends (s: any) => any ? ActionCreatorWithoutPayload<S> : R[K] extends (s: any, payload: infer P) => any ? ActionCreatorWithPayload<S, P> : ActionCreatorWithPayload<S, unknown>;
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
    dispatch: (action: PayloadAction<S> | Action<S>) => void;
    /** Action creators bound with dispatcher */
    actionDispatcher: Actions<S, R>;
    /** Action creators */
    actions: Actions<S, R>;
    destroy: () => void;
    addEpic(epicFactory: EpicFactory<S, R>): () => void;
    addEpic$(epicFactory$: rx.Observable<EpicFactory<S, R> | null | undefined>): () => void;
    getStore(): rx.Observable<S>;
    getState(): S;
}
export declare type Epic<S> = (actions: rx.Observable<PayloadAction<any> | Action<any>>, states: rx.BehaviorSubject<S>) => rx.Observable<Action<any>>;
declare type PayloadTypeOfAction<ActionCreatorType> = ActionCreatorType extends ActionCreatorWithoutPayload<any> ? void : ActionCreatorType extends ActionCreatorWithPayload<any, infer P> ? P : never;
/** filter action stream by type */
export declare function ofPayloadAction<S, A extends ActionCreator<S, any>>(actionCreators: A): (source: rx.Observable<PayloadAction<any> | Action<any>>) => rx.Observable<PayloadAction<S, PayloadTypeOfAction<A>>>;
export declare function ofPayloadAction<S, A extends ActionCreator<S, any>, S1, A1 extends ActionCreator<S1, any>>(actionCreators: A, actionCreators1: A1): (source: rx.Observable<PayloadAction<any> | Action<any>>) => rx.Observable<PayloadAction<S, PayloadTypeOfAction<A>> | PayloadAction<S1, PayloadTypeOfAction<A1>>>;
export declare function ofPayloadAction<S, A extends ActionCreator<S, any>, S1, A1 extends ActionCreator<S1, any>, S2, A2 extends ActionCreator<S2, any>>(actionCreators: A, actionCreators1: A1, actionCreators2: A2): (source: rx.Observable<PayloadAction<any> | Action<any>>) => rx.Observable<PayloadAction<S, PayloadTypeOfAction<A>> | PayloadAction<S1, PayloadTypeOfAction<A1>> | PayloadAction<S2, PayloadTypeOfAction<A2>>>;
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
export {};
