import * as rx from 'rxjs';
import { Action, InferPayload, ActionMeta, ArrayOrTuple, ControllerCore, CoreOptions, InferMapParam } from './stream-core';
import { PayloadByType, ActionByType } from './inferred-types';
import { ActionDataTable } from './action-table';
export type ActionFactory = {
    [k: string]: (...args: any[]) => SingleActionFactory;
};
type ActionOrPayloadLike<P extends unknown[]> = {
    i: Action<unknown>['i'];
    t: Action<unknown>['t'];
    p: P;
} | [ActionMeta, ...P];
type ActionOrPayloadStreamTuple<T extends [...any[]]> = {
    [K in keyof T]: rx.Observable<ActionOrPayloadLike<T[K]>>;
};
type ActionStreamTuple<T extends [...any[]]> = {
    [K in keyof T]: rx.Observable<[ActionMeta, ...T[K]]>;
};
export interface SingleActionFactory {
    re(...actionMeta: ArrayOrTuple<ActionMeta | ActionMeta['r']>): this;
    /** Dispatch message */
    dp(...actionMetaRelated: ArrayOrTuple<ActionMeta | ActionMeta['r']>): Action<unknown>;
    /**
     * `Dispatch and observe` response message
     * At the moment this method is called, the message is sent, not the moment that the returned
     * observable is subscribed.
     * Retuened is an observable of ReplaySuvbject(1), NOTE: if you are expecting more than one "associated"
     * responding messages, only first responsive message is recorded by ReplaySubject and returned,
     * see od<F> as alternative
     **/
    do<P extends [...any[]]>(response$: rx.Observable<ActionOrPayloadLike<P>>, referActionMeta?: ActionMeta | ActionMeta['r'] | ArrayOrTuple<ActionMeta | ActionMeta['r']>): rx.Observable<[ActionMeta, ...P]>;
    /**
     * @deprecated use `od(...response$)`
     * `Deferred dispatch and observe` response message.
     * Unlike `do()`, the message is not sent until the returned observable is subscribed, all associated
     * responding messages will be recieved. A new message will be dispatched everytime when the returned
     * observable is subscribed.
     * An asyncronized form of this method is `rx.firstValueFrom(...)` which returns a Promise
     */
    ddo<P extends [...any[]]>(response$: rx.Observable<ActionOrPayloadLike<P>>, referActionMeta?: ActionMeta | ActionMeta['r'] | ArrayOrTuple<ActionMeta | ActionMeta['r']>): rx.Observable<[ActionMeta, ...P]>;
    /**
     * "Observe and Dispatch", the action message is sent only when response messages are all subscribed.
     * This method accept multiple types of "observable response message" as parameter, and it
     * returns filtered response messages in form of tuple type, or return single observable if
     * there is only one parameter.
     * - The action message will not be dispatched until all of returned response streams are subscribed.
     * - The action message will be dispatched only once, even any of the returned response streams are re-subscribe
     * */
    od<P extends unknown[], PA extends any[]>(response$: rx.Observable<ActionOrPayloadLike<P>>, ...moreResponses: [...ActionOrPayloadStreamTuple<PA>]): PA['length'] extends 0 ? rx.Observable<[ActionMeta, ...P]> : [rx.Observable<[ActionMeta, ...P]>, ...ActionStreamTuple<PA>];
}
export declare class RxController2<I> extends ControllerCore<I> {
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
    constructor(opts?: CoreOptions<I> & {
        debugTableAction?: boolean;
    });
    /** This method internally uses [groupBy](https://rxjs.dev/api/index/function/groupBy#groupby) */
    groupControllerBy<K>(keySelector: (action: Action<I[keyof I]>) => K, groupedCtlOptionsFn?: (key: K) => CoreOptions<I>): rx.Observable<[newGroup: GroupedRxController2<I, K>, allGroups: Map<K, GroupedRxController2<I, K>>]>;
    /**
     * create a new RxController whose action$ is filtered for action types which are included in `actionTypes`
     */
    subForTypes<KS extends Array<keyof I> | ReadonlyArray<keyof I & string>>(actionTypes: KS, opts?: CoreOptions<Pick<I, KS[number]>>): RxController2<Pick<I, KS[number]>>;
    /**
     * Create an very simple and naive version Apache Kafka KTable like "observable Map<K, Action>",
     * a table which retains latest action by "key"
     **/
    createDataTable<T extends keyof I, K>(actionType: T, keySelector: (action: InferMapParam<I[T]>) => K): ActionDataTable<I, T, K>;
    /**
     * create a new RxController whose action$ is filtered for action types that is included in `actionTypes`
     */
    subForExcludeTypes<KS extends Array<keyof I> | ReadonlyArray<keyof I>>(excludeActionTypes: KS, opts?: CoreOptions<Omit<I, KS[number]>>): RxController2<Omit<I, KS[number]>>;
    /**
     * Create a variant of calling .ft(...).dp(...)`
     **/
    createDispatcherFor<K extends keyof I>(type: K, ...actionMetaRelated: ArrayOrTuple<ActionMeta | undefined>): (...params: InferPayload<I[K]>) => void;
    /**
     * Create a variant of interface of functions `<I>.ft(...).dp(...)`
     **/
    createDispatchers(...actionMetaRelated: ArrayOrTuple<ActionMeta | undefined>): {
        [K in keyof I]: (...params: InferPayload<I[K]>) => void;
    };
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
export {};
