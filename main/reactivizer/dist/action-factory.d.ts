import * as rx from 'rxjs';
import { Action, InferPayload, ActionMeta, ArrayOrTuple } from './stream-core';
import { RxController2 } from './control2';
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
     * At the moment this method is called, the message is sent, not the moment when the returned
     * observable is subscribed.
     * Returned is an observable of ReplaySubject(1), NOTE: if you are expecting more than one "associated"
     * responding messages, only the lastest responsive message is recorded by ReplaySubject and returned,
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
    do<P extends [...any[]]>(response$: rx.Observable<{
        i: Action<unknown>['i'];
        t: Action<unknown>['t'];
        p: P;
    } | [ActionMeta, ...P]>, referAction?: ActionMeta | ActionMeta['r'] | ArrayOrTuple<ActionMeta | ActionMeta['r']>): rx.Observable<[ActionMeta, ...P]>;
    ddo<P extends [...any[]]>(response$: rx.Observable<ActionOrPayloadLike<P>>, referAction?: ActionMeta | ActionMeta['r'] | ArrayOrTuple<ActionMeta | ActionMeta['r']>): rx.Observable<[ActionMeta, ...P]>;
    od<P extends unknown[], PA extends any[]>(response: rx.Observable<ActionOrPayloadLike<P>>, ...moreResponses: [...ActionOrPayloadStreamTuple<PA>]): PA['length'] extends 0 ? rx.Observable<[ActionMeta, ...P]> : [rx.Observable<[ActionMeta, ...P]>, ...ActionStreamTuple<PA>];
}
export {};
