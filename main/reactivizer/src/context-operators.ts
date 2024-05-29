import * as rx from 'rxjs';
import {ActionMeta, Action} from './stream-core';
/** Rx operator function, filter action or payload stream by:
 *  action ID (Action['i'])
 **/
export function actionRelatedToAction<T extends [ActionMeta, ...any[]] | Action<any>>(actionOrMeta: {i: ActionMeta['i']}) {
  return function(up: rx.Observable<T>) {
    let isPayload: boolean | undefined;
    return up.pipe(
      rx.filter(a => {
        if (isPayload == null)
          isPayload = Array.isArray(a);
        const m = isPayload ? (a as [ActionMeta])[0] : a as Action<any>;
        return (m.r != null && m.r === actionOrMeta.i) || (
          Array.isArray(m.r) && m.r.some(r => r === actionOrMeta.i));
      })
    );
  };
}

/** Rx operator function, filter action or payload stream by:
 *  action's reference IDs (Action['r'])
 **/
export function actionRelatedToActionRelatives<T extends [ActionMeta, ...any[]] | Action<any>>(actionOrMeta: {r?: ActionMeta['r']}) {
  return function(up: rx.Observable<T>) {
    let isPayload: boolean | undefined;
    return up.pipe(
      rx.filter(a => {
        if (isPayload == null)
          isPayload = Array.isArray(a);
        const m = isPayload ? (a as [ActionMeta])[0] : a as Action<any>;
        if (m.r == null || actionOrMeta.r == null)
          return false;
        if (!Array.isArray(m.r)) {
          if (!Array.isArray(actionOrMeta.r)) {
            return m.r === actionOrMeta.r;
          } else {
            return actionOrMeta.r.some(item => item === m.r);
          }
        } else {
          if (Array.isArray(actionOrMeta.r)) {
            return m.r.some(item => (actionOrMeta.r as number[]).some(ai => ai === item));
          } else {
            return m.r.some(item => actionOrMeta.r === item);
          }
        }
        // const left = Array.isArray(m.r) ? m.r : [m.r];
        // const right = Array.isArray(actionOrMeta.r) ? actionOrMeta.r : [actionOrMeta.r];
        // return left.some(lItem => right.some(rItem => rItem === lItem));
      })
    );
  };
}

/**
 * Logically, the result stream is a union of actionRelatedToAction() and actionRelatedToActionRelatives()
 */
export function actionOfContext<T extends [ActionMeta, ...any[]] | Action<any>>(actionOrMeta: {i?: ActionMeta['i']; r?: ActionMeta['r']}) {
  return function(up : rx.Observable<T>) {
    return rx.merge(
      actionOrMeta.i ? up.pipe(actionRelatedToAction(actionOrMeta as {i: ActionMeta['i']})) : rx.EMPTY,
      up.pipe(actionRelatedToActionRelatives(actionOrMeta))
    );
  };
}

/**
 * Return an Rx operator function, the upstream Observable is so call "contextAction" stream,
 * the parameter `responding$` is observable of any actions which will be filtered by this operator function,
 * the downstream is an observable of a tuple of actions in form of `[contextAction, respondingEvent]`, in which respondingEvent's
 * ActionMeta['r'] equals to ActionMeta['i'].
 * In another word, the upstream is initial actions, the downstream stream will be corresponding responding event stream.
 */
export function pairActionToActionStream<T extends [ActionMeta, ...any[]] | Action<any>, C extends [ActionMeta, ...any[]] | Action<any>, R = T>(
  responding$: rx.Observable<T>,
  mapFn?: (contextAction: C, responding: T) => R
): (up: rx.Observable<C>) => rx.Observable<rx.Observable<R>> {
  return function(up: rx.Observable<C>) {
    // Use replaySubject to remedy case that context action message and corresponding responding message is sent in a synchronous invocation,
    // by the time context action being recieved, the responding message has also been sent, it will be too late to subscribe and catch
    // the responding message
    const replay$ = new rx.ReplaySubject<T>(10);
    return rx.merge(
      new rx.Observable<never>(sink => {
        responding$.subscribe(replay$);
        sink.complete();
      }),
      up.pipe(
        rx.map(ctxAction => {
          const filted$ = replay$.pipe( actionRelatedToAction(Array.isArray(ctxAction) ? ctxAction[0] : ctxAction));
          return (mapFn ?
            filted$.pipe(
              rx.map(responding => mapFn(ctxAction, responding))
            ) :
            filted$) as rx.Observable<R>;
        })
      )
    );
  };
}

export function throwErrorOnRelated<T extends [ActionMeta, ...any[]] | Action<any>>(
  actionOrMeta: {i: ActionMeta['i']}
) {
  return function(up: rx.Observable<T>): rx.Observable<T> {
    return up.pipe(
      rx.map(actionOrPayload => {
        const isPayload = Array.isArray(actionOrPayload);
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        const m = isPayload ? actionOrPayload[0] : actionOrPayload as Action<any>;
        if ((m.r != null && m.r === actionOrMeta.i) || (
          Array.isArray(m.r) && m.r.some(r => r === actionOrMeta.i)
        )) {
          throw isPayload ? actionOrPayload[1] : actionOrPayload.p[0];
        }
        return actionOrPayload;
      })
    );
  };
}
/** @deprecated use actionRelatedToAction instead */
export const payloadRelatedToAction = actionRelatedToAction;

