import * as rx from 'rxjs';
import { ActionMeta, Action } from './stream-core';
/** Rx operator function, filter action or payload stream by:
 *  action ID (Action['i'])
 **/
export declare function actionRelatedToAction<T extends [ActionMeta, ...any[]] | Action<any>>(actionOrMeta: {
    i: ActionMeta['i'];
}): (up: rx.Observable<T>) => rx.Observable<T>;
/** Rx operator function, filter action or payload stream by:
 *  action's reference IDs (Action['r'])
 **/
export declare function actionRelatedToActionRelatives<T extends [ActionMeta, ...any[]] | Action<any>>(actionOrMeta: {
    r?: ActionMeta['r'];
}): (up: rx.Observable<T>) => rx.Observable<T>;
/**
 * Logically, the result stream is a union of actionRelatedToAction() and actionRelatedToActionRelatives()
 */
export declare function actionOfContext<T extends [ActionMeta, ...any[]] | Action<any>>(actionOrMeta: {
    i?: ActionMeta['i'];
    r?: ActionMeta['r'];
}): (up: rx.Observable<T>) => rx.Observable<T>;
/**
 * Combine multiple observables of action or mapped payload to create an observable whose values are calculated from
 * the input observables in form of a tuple like:
 *
 * When a, b, c earch one is corresponding value of observable of input parameters,
 * if c is related to b and b is related to a (latter parameter is under context of preceding parameter presented action observable)
 * i.e. `a.i` or `a[0].i` equals values of `b.r` or `b[0].r` and
 *    `b.i` or `b[0].i` equals values of `c.r` or `c[0].r`
 *    then `[a, b, c]` is in the returned observable
 *
 * > Caution
 *  Be aware of "problem of synchronous observation and the order of subscription",
 *  when the actions in parameters are dispatched in synchronous mode by producer.
 *  It is better the input parameters are "forked" controllers of producers.
* */
export declare function combineLastestRelated<T extends [ActionMeta, ...any[]] | Action<any>, T2 extends [ActionMeta, ...any[]] | Action<any>>(initial: rx.Observable<T>, related: rx.Observable<T2>): rx.Observable<[T, T2]>;
export declare function combineLastestRelated<T extends [ActionMeta, ...any[]] | Action<any>, T2 extends [ActionMeta, ...any[]] | Action<any>, T3 extends [ActionMeta, ...any[]] | Action<any>>(initial: rx.Observable<T>, related: rx.Observable<T2>, relatedToRelated: rx.Observable<T3>): rx.Observable<[T, T2, T3]>;
export declare function combineLastestRelated<T extends [ActionMeta, ...any[]] | Action<any>, T2 extends [ActionMeta, ...any[]] | Action<any>, T3 extends [ActionMeta, ...any[]] | Action<any>, T4 extends [ActionMeta, ...any[]] | Action<any>>(initial: rx.Observable<T>, related: rx.Observable<T2>, relatedToRelated: rx.Observable<T3>, relatedToRelatedToR: rx.Observable<T4>): rx.Observable<[T, T2, T3, T4]>;
export declare function combineLastestRelated<T extends [ActionMeta, ...any[]] | Action<any>, T2 extends [ActionMeta, ...any[]] | Action<any>, T3 extends [ActionMeta, ...any[]] | Action<any>, T4 extends [ActionMeta, ...any[]] | Action<any>, T5 extends [ActionMeta, ...any[]] | Action<any>>(initial: rx.Observable<T>, related: rx.Observable<T2>, relatedToRelated: rx.Observable<T3>, relatedToRelatedToR: rx.Observable<T4>, relatedToR5: rx.Observable<T5>): rx.Observable<[T, T2, T3, T4, T5]>;
/**
 * Return an Rx operator function, the upstream Observable is so call "contextAction" stream (observable of initial actions),
 * the parameter `responding$` is observable of any actions which is supposed to be filtered by this operator,
 * the downstream is an high-order observable of which the elements are nested observables of filted "responding event" actions,
 * of which respondingEvent's ActionMeta['r'] equals to ActionMeta['i'].
 * In another word, the upstream is initial actions, the downstream stream will be a stream of corresponding responding event streams
 */
export declare function pairActionToActionStream<T extends [ActionMeta, ...any[]] | Action<any>, C extends [ActionMeta, ...any[]] | Action<any>, R = rx.Observable<T>>(responding$: rx.Observable<T>, mapFn?: (contextAction: C, responding$: rx.Observable<T>) => R): (up: rx.Observable<C>) => rx.Observable<R>;
export declare function pairActionToActionStream<T extends [ActionMeta, ...any[]] | Action<any>, C extends [ActionMeta, ...any[]] | Action<any>, R = rx.Observable<T>>(responding$: rx.Observable<T>, syncCacheSize: number, mapFn?: (contextAction: C, responding$: rx.Observable<T>) => R): (up: rx.Observable<C>) => rx.Observable<R>;
export declare function throwErrorOnRelated<T extends [ActionMeta, ...any[]] | Action<any>>(actionOrMeta: {
    i: ActionMeta['i'];
}): (up: rx.Observable<T>) => rx.Observable<T>;
/** @deprecated use actionRelatedToAction instead */
export declare const payloadRelatedToAction: typeof actionRelatedToAction;
