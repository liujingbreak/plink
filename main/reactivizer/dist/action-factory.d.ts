import * as rx from 'rxjs';
import { Action, InferPayload, ActionMeta, ArrayOrTuple } from './stream-core';
import { RxController2 } from './control2';
export type ActionOfUnknownType<P extends any[]> = {
    i: ActionMeta['i'];
    r: ActionMeta['r'];
    p: P;
};
export type ActionOrPayloadLike<P extends any[], A extends [ActionMeta, ...P] | ActionOfUnknownType<P>> = A;
export interface SingleActionFactory {
    re(...actionMeta: ArrayOrTuple<ActionMeta | ActionMeta['r']>): this;
    /** Dispatch message */
    dp(...actionMetaRelated: ArrayOrTuple<ActionMeta | ActionMeta['r']>): Action<unknown>;
    /**
     * `Dispatch and observe` response message
     * At the moment this method is called, the message is sent, not the moment when the returned
     * observable is subscribed.
     * Returned is an observable of ReplaySubject(1), NOTE: if you are expecting more than one "associated"
     * responding messages, only the lastest responsive message is recorded by ReplaySubject and returned,
     * see od<F> as alternative
     **/
    do<A extends [ActionMeta, ...any[]] | Action<any>>(response$: rx.Observable<A>, referActionMeta?: ActionMeta | ActionMeta['r'] | ArrayOrTuple<ActionMeta | ActionMeta['r']>): rx.Observable<A>;
    /**
     * @deprecated use `od(...response$)`
     * `Deferred dispatch and observe` response message.
     * Unlike `do()`, the message is not sent until the returned observable is subscribed, all associated
     * responding messages will be recieved. A new message will be dispatched everytime when the returned
     * observable is subscribed.
     * An asyncronized form of this method is `rx.firstValueFrom(...)` which returns a Promise
     */
    ddo<A extends [ActionMeta, ...any[]] | Action<any>>(response$: rx.Observable<A>, referActionMeta?: ActionMeta | ActionMeta['r'] | ArrayOrTuple<ActionMeta | ActionMeta['r']>): rx.Observable<A>;
    /**
     * "Observe and Dispatch", the action message is sent only when response messages are all subscribed.
     * This method accept multiple types of "observable response message" as parameter, and it
     * returns filtered response messages in form of tuple type, or return single observable if
     * there is only one parameter.
     * - The action message will not be dispatched until all of returned response streams are subscribed.
     * - The action message will be dispatched only once, even any of the returned response streams are re-subscribe
     * */
    od<T extends [ActionMeta, ...any[]] | Action<any>, TA extends Array<[ActionMeta, ...any[]] | Action<any>>>(response$: rx.Observable<T>, ...moreResponses: [...{
        [K in keyof TA]: rx.Observable<TA[K]>;
    }]): TA['length'] extends 0 ? rx.Observable<T> : [rx.Observable<T>, ...{
        [K in keyof TA]: rx.Observable<TA[K]>;
    }];
}
export declare class SingleActionFactoryImpl<I, K extends keyof I> implements SingleActionFactory {
    private type;
    private payload;
    private control;
    private opts;
    relateToAction: ArrayOrTuple<ActionMeta | ActionMeta['r']> | undefined;
    constructor(type: K, payload: InferPayload<I[K]>, control: RxController2<I>, opts?: {
        /** default: 20000 ms */
        slowDispatchObservableTime?: number;
        /** Print a log message or any slow responding message of a dispatched action */
        slowLog?(initialAction: Action<I[K]>): void;
    });
    /** Make this action become related to another action message
     */
    re(...actionMeta: ArrayOrTuple<ActionMeta | ActionMeta['r']>): this;
    dp(...actionMetaRelated: ArrayOrTuple<ActionMeta | ActionMeta['r']>): Action<I[K]>;
    do<A extends [ActionMeta, ...any[]] | Action<any>>(response$: rx.Observable<A>, referAction?: ActionMeta | ActionMeta['r'] | ArrayOrTuple<ActionMeta | ActionMeta['r']>): rx.Observable<A>;
    ddo<A extends [ActionMeta, ...any[]] | Action<any>>(response$: rx.Observable<A>, referAction?: ActionMeta | ActionMeta['r'] | ArrayOrTuple<ActionMeta | ActionMeta['r']>): rx.Observable<A>;
    od<T extends [ActionMeta, ...any[]] | Action<any>, TA extends Array<[ActionMeta, ...any[]] | Action<any>>>(response: rx.Observable<T>, ...moreResponses: [...{
        [K in keyof TA]: rx.Observable<TA[K]>;
    }]): TA['length'] extends 0 ? rx.Observable<T> : [rx.Observable<T>, ...{
        [K in keyof TA]: rx.Observable<TA[K]>;
    }];
}
