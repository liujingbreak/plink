import * as rx from 'rxjs';
import { Action, ActionMeta, ArrayOrTuple, ControllerCore, CoreOptions } from './stream-core';
import { InferMapParam } from './control';
import { PayloadByType, ActionByType } from './inferred-types';
export type ActionFactory = {
    [k: string]: (...args: any[]) => SingleActionFactory;
};
export interface SingleActionFactory {
    dp(...origActionMeta: ArrayOrTuple<ActionMeta | undefined>): void;
    /** At the moment this method is called, the message is sent, not the moment that the returned
     * observable is subscribed.
     * Retuened is an observable of ReplaySuvbject(1), NOTE: if you are expecting more than one "associated"
     * responding messages, only first responsive message is recorded by ReplaySubject and returned,
     * see ddo<F> as alternative
     **/
    do<F>(waitForAction$: rx.Observable<Action<F>>, origActionMeta?: ActionMeta | ArrayOrTuple<ActionMeta>): rx.Observable<InferMapParam<F>>;
    /**
     * Unlike `do()`, the message is not sent until the returned observable is subscribed, all associated
     * responding messages will be recieved
     */
    ddo<F>(waitForAction$: rx.Observable<Action<F>>, origActionMeta?: ActionMeta | ArrayOrTuple<ActionMeta>): rx.Observable<InferMapParam<F>>;
}
export declare class RxController2<I> extends ControllerCore<I> {
    opts?: (CoreOptions<I> & {
        debugTableAction?: boolean | undefined;
    }) | undefined;
    /** Abbrevation of payloadByType */
    pt: PayloadByType<I>;
    /** Action observable streamby type */
    at: ActionByType<I>;
    /** Action factory by type */
    ft: I;
    /** Rx operator for `do()`, we can change it by emit new value to this observable,
     * you don't need to use this Subject directory, it is meant to be extended by Reactivizer internally
     * */
    doOperator$: rx.BehaviorSubject<(<A, F>(dispatchingAction: Action<A>) => (response$: rx.Observable<Action<F>>) => rx.Observable<Action<F>>)>;
    constructor(opts?: (CoreOptions<I> & {
        debugTableAction?: boolean | undefined;
    }) | undefined);
    /** This method internally uses [groupBy](https://rxjs.dev/api/index/function/groupBy#groupby) */
    groupControllerBy<K>(keySelector: (action: Action<I[keyof I]>) => K, groupedCtlOptionsFn?: (key: K) => CoreOptions<I>): rx.Observable<[newGroup: GroupedRxController2<I, K>, allGroups: Map<K, GroupedRxController2<I, K>>]>;
    /**
     * create a new RxController whose action$ is filtered for action types which are included in `actionTypes`
     */
    subForTypes<KS extends Array<keyof I> | ReadonlyArray<keyof I & string>>(actionTypes: KS, opts?: CoreOptions<Pick<I, KS[number]>>): RxController2<Pick<I, KS[number]>>;
    /**
     * create a new RxController whose action$ is filtered for action types that is included in `actionTypes`
     */
    subForExcludeTypes<KS extends Array<keyof I> | ReadonlyArray<keyof I>>(excludeActionTypes: KS, opts?: CoreOptions<Pick<I, KS[number]>>): RxController2<Pick<I, KS[number]>>;
}
export declare class GroupedRxController2<I, K> extends RxController2<I> {
    key: K;
    constructor(key: K, opts?: CoreOptions<I>);
}
/**
 * Create a new Action with same "p", "i" and "r" properties and dispatched to RxController,
 * but changed "t" property which comfort to target "toRxController"
 * @return that dispatched new action object
 */
export declare function deserializeAction2<I>(actionObj: any, toController: RxController2<I>): Action<I[keyof I]>;
