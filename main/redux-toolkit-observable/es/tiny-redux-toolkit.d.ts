import * as rx from 'rxjs';
export interface ActionWithReducer<S, P = any, T = any> {
    type: T;
    payload?: P;
    /** Returning `undefined / void` has same effect of returning old state reference,
     * Returning a brand new state object for immutability in normal case.
     */
    reducer?(old: S, payload: P): S | void;
}
export interface Reducers<S> {
    /** Returning `undefined / void` has same effect of returning old state reference,
     * Returning a brand new state object for immutability in normal case.
     */
    [type: string]: (state: S, payload?: any) => S | void;
}
export declare type Actions<S, R extends Reducers<S>> = {
    [Type in keyof R]: ActionCreator<Parameters<R[Type]>[1] extends undefined ? void : Parameters<R[Type]>[1], Type>;
};
export interface ActionCreator<P, Type> {
    (payload: P): {
        type: Type;
        payload: P;
    };
    type: Type;
}
export declare function ofAction<P1, T1>(actionCreators1: ActionCreator<P1, T1>): (src: rx.Observable<ActionWithReducer<any>>) => rx.Observable<ActionWithReducer<any, P1, T1>>;
export declare function ofAction<P1, P2, T1, T2>(actionCreators1: ActionCreator<P1, T1>, actionCreators2: ActionCreator<P2, T2>): (src: rx.Observable<ActionWithReducer<any>>) => rx.Observable<ActionWithReducer<any, P1 | P2, T1 | T2>>;
export declare function ofAction<P1, P2, P3, T1, T2, T3>(actionCreators1: ActionCreator<P1, T1>, actionCreators2: ActionCreator<P2, T2>, actionCreators3: ActionCreator<P3, T3>): (src: rx.Observable<ActionWithReducer<any>>) => rx.Observable<ActionWithReducer<any, P1 | P2 | P3, T1 | T2 | T3>>;
export declare function ofAction<P1, P2, P3, P4, T1, T2, T3, T4>(actionCreators1: ActionCreator<P1, T1>, actionCreators2: ActionCreator<P2, T2>, actionCreators3: ActionCreator<P3, T3>, actionCreators4: ActionCreator<P4, T4>): (src: rx.Observable<ActionWithReducer<any>>) => rx.Observable<ActionWithReducer<any, P1 | P2 | P3 | P4, T1 | T2 | T3 | T4>>;
export interface CreateOptions<S, R extends Reducers<S>> {
    initialState: S;
    reducers: R;
    logPrefix?: string;
    onStateChange(snapshot: S): void;
}
/**
 * This file provide some hooks which leverages RxJS to mimic Redux-toolkit + Redux-observable
 * which is supposed to be used independently within any React component in case your component has
 * complicated async state change logic.
 *
 * - it is small and supposed to be well performed
 * - it does not use ImmerJS, you should take care of immutability of state by yourself
 * - because there is no ImmerJS, you can put any type of Object in state including those are not friendly by ImmerJS
 */
export default function createTinyReduxToolkit<S extends {
    error?: Error;
}, R extends Reducers<S>>({ initialState, reducers, logPrefix, onStateChange }: CreateOptions<S, R>): {
    addEpic: (epic: (actions: rx.Observable<ActionWithReducer<S>>, states: rx.BehaviorSubject<S>) => rx.Observable<ActionWithReducer<S>>) => void;
    dispatch: (action: ActionWithReducer<S>) => void;
    destroy: () => void;
    actionDispatcher: Actions<S, R>;
};
