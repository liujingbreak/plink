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
 * Return an Rx operator function, whose input Observable is so call "contextAction" stream and output Observable contains
 * a tuple of paired actions in form of `[contextAction, respondingEvent]` where the `respondingEvent`'s ActionMeta['r']
 * equals to or contains `contextAction`'s ActionMeta['i']. In another word, the input stream is initial actions stream, the
 * output stream will be corresponding responding event stream.
 */
export declare function pairActionToActionStream<T extends [ActionMeta, ...any[]] | Action<any>, C extends [ActionMeta, ...any[]] | Action<any>>(contextAction$: rx.Observable<C>): (up: rx.Observable<T>) => rx.Observable<readonly [C, T]>;
export declare function throwErrorOnRelated<T extends [ActionMeta, ...any[]] | Action<any>>(actionOrMeta: {
    i: ActionMeta['i'];
}): (up: rx.Observable<T>) => rx.Observable<T>;
/** @deprecated use actionRelatedToAction instead */
export declare const payloadRelatedToAction: typeof actionRelatedToAction;
