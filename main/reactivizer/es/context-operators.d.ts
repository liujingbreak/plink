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
 * Return an Rx operator function, the upstream Observable is so call "contextAction" stream,
 * the parameter `responding$` is observable of any actions which will be filtered by this operator function,
 * the downstream is an observable of a tuple of actions in form of `[contextAction, respondingEvent]`, in which respondingEvent's
 * ActionMeta['r'] equals to ActionMeta['i'].
 * In another word, the upstream is initial actions, the downstream stream will be corresponding responding event stream.
 */
export declare function pairActionToActionStream<T extends [ActionMeta, ...any[]] | Action<any>, C extends [ActionMeta, ...any[]] | Action<any>, R = T>(responding$: rx.Observable<T>, mapFn?: (contextAction: C, responding: T) => R): (up: rx.Observable<C>) => rx.Observable<rx.Observable<R>>;
export declare function throwErrorOnRelated<T extends [ActionMeta, ...any[]] | Action<any>>(actionOrMeta: {
    i: ActionMeta['i'];
}): (up: rx.Observable<T>) => rx.Observable<T>;
/** @deprecated use actionRelatedToAction instead */
export declare const payloadRelatedToAction: typeof actionRelatedToAction;
