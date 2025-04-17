import * as rx from 'rxjs';
import {ActionMeta, Action} from './stream-core';

/** Rx operator function, filter action or payload stream by:
 *  action ID (Action['i'])
 **/
export function actionRelatedToAction<T extends [ActionMeta, ...any[]] | Action<any>>(actionOrMeta: {i: ActionMeta['i']}): (up: rx.Observable<T>) => rx.Observable<T> {
  return function(up: rx.Observable<T>) {
    const helper = createActRelationshipPredHelper();
    return up.pipe(
      rx.filter(a => helper(actionOrMeta, a))
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
        isPayload ??= Array.isArray(a);
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

function createActRelationshipPredHelper() {
  let isPayload: boolean | undefined;
  return function(initialAct: {i: ActionMeta['i']}, related: [ActionMeta, ...any[]] | Action<any>) {
    isPayload ??= Array.isArray(related);
    const m = isPayload ? (related as [ActionMeta])[0] : related as Action<any>;
    return (m.r != null && m.r === initialAct.i) || (
      Array.isArray(m.r) && m.r.some(r => r === initialAct.i));
  };
}

/**
 * Logically, the result stream is a union of actionRelatedToAction() and actionRelatedToActionRelatives()
 */
export function actionOfContext<T extends [ActionMeta, ...any[]] | Action<any>>(actionOrMeta: {i?: ActionMeta['i']; r?: ActionMeta['r']}) {
  return function(up: rx.Observable<T>) {
    return rx.merge(
      actionOrMeta.i ? up.pipe(actionRelatedToAction(actionOrMeta as {i: ActionMeta['i']})) : rx.EMPTY,
      up.pipe(actionRelatedToActionRelatives(actionOrMeta))
    );
  };
}

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
export function combineLastestRelated<
  T extends [ActionMeta, ...any[]] | Action<any>,
  TA extends ([ActionMeta, ...any[]] | Action<any>)[]
>(
  initial: rx.Observable<T>,
  ...related: {[I in keyof TA]: rx.Observable<TA[I]>}
): rx.Observable<[T, ...TA]> {
  if (related.length === 0) {
    return initial.pipe(
      rx.map(a => [a] as unknown as [T, ...TA])
    );
  }
  const isRelated = createActRelationshipPredHelper();
  const relates = combineLastestRelated(...(related as [any, any]));
  return initial.pipe(
    rx.mergeMap(a => relates.pipe(
      rx.filter(b => isRelated(Array.isArray(a) ? a[0] : a, b[0])),
      rx.map(b => [a, ...b] as unknown as [T, ...TA])
    )),
    rx.share()
  );
}

// export function withLatestRelated<T extends [ActionMeta, ...any[]] | Action<any>>(actionMeta: {i: ActionMeta['i']}) {
//   return (up: rx.Observable<T>) => {
//     return up.pipe(
//       actionRelatedToAction(actionMeta)
//     );
//   };
// }

/**
 * Return an Rx operator function, the upstream Observable is so call "contextAction" stream (observable of initial actions),
 * the parameter `responding$` is observable of any actions which is supposed to be filtered by this operator,
 * the downstream is an high-order observable of which the elements are nested observables of filted "responding event" actions,
 * of which respondingEvent's ActionMeta['r'] equals to ActionMeta['i'].
 * In another word, the upstream is initial actions, the downstream stream will be a stream of corresponding responding event streams
 */
export function pairActionToActionStream<T extends [ActionMeta, ...any[]] | Action<any>, C extends [ActionMeta, ...any[]] | Action<any>, R = rx.Observable<T>>(
  responding$: rx.Observable<T>,
  mapFn?: (contextAction: C, responding$: rx.Observable<T>) => R
): (up: rx.Observable<C>) => rx.Observable<R>;
export function pairActionToActionStream<T extends [ActionMeta, ...any[]] | Action<any>, C extends [ActionMeta, ...any[]] | Action<any>, R = rx.Observable<T>>(
  responding$: rx.Observable<T>,
  syncCacheSize: number,
  mapFn?: (contextAction: C, responding$: rx.Observable<T>) => R
): (up: rx.Observable<C>) => rx.Observable<R>;
export function pairActionToActionStream<T extends [ActionMeta, ...any[]] | Action<any>, C extends [ActionMeta, ...any[]] | Action<any>, R = rx.Observable<T>>(
  responding$: rx.Observable<T>,
  syncCacheSize?: number | ((contextAction: C, responding$: rx.Observable<T>) => R),
  mapFn?: (contextAction: C, responding$: rx.Observable<T>) => R
): (up: rx.Observable<C>) => rx.Observable<R> {
  return function(up: rx.Observable<C>) {
    // Use replaySubject to remedy case that context action message and corresponding responding message is sent in a synchronous invocation,
    // by the time context action being recieved, the responding message has also been sent, it will be too late to subscribe and catch
    // the responding message
    const replayCntProvided = typeof syncCacheSize === 'number';
    const replayCnt = replayCntProvided ? syncCacheSize : 5;
    if (!replayCntProvided && typeof syncCacheSize === 'function') {
      mapFn = syncCacheSize;
    }
    // When up stream completes and all mapped down streams are unsubscribed (completed),
    // stop recording messages to replay subject, otherwise it will continue until the main output stream being explicitly unsubscribed
    return rx.defer(() => rx.of(new rx.ReplaySubject<T>(replayCnt))).pipe(
      rx.switchMap(replay$ => {
        return rx.merge(
          responding$.pipe(
            rx.tap(replay$),
            rx.ignoreElements()
          ),
          up.pipe(
            rx.map(ctxAction => {
              const filted$ = replay$.pipe(
                actionRelatedToAction(Array.isArray(ctxAction) ? ctxAction[0] : ctxAction)
              );
              return mapFn ? mapFn(ctxAction, filted$) : filted$ as R;
            })
          )
        );
      })
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

