import * as rx from 'rxjs';
import {ActionMeta, Action} from './stream-core';

/** Rx operator function, filter action or payload stream by:
 *  action ID (Action['i'])
 **/
export function actionRelatedToAction<T extends [ActionMeta, ...any[]] | Action<any>>(actionOrMeta: {i: ActionMeta['i']}): (up: rx.Observable<T>) => rx.Observable<T> {
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

// export function groupMapRelatedAction<C extends ActionOrPayloadLike<any>, P extends [ActionMeta, ...any[]] | Action<any>, PA extends any[]>(
//   responding: rx.Observable<P>,
//   ...more: {[K in keyof PA]: rx.Observable<PA[K]>}
// ) {
//   return function(up: rx.Observable<C>): PA['length'] extends 0 ? rx.Observable<[C, rx.Observable<P>]> : {[K in keyof PA]: rx.Observable<PA[K]>} {
//     const streams = [responding, ...more].map(r$ => up.pipe(
//       rx.map(c => {
//         return [
//           c, (r$ as rx.Observable<P>).pipe(
//             actionRelatedToAction(Array.isArray(c) ? c[0] : c)
//           )
//         ] as const;
//       })
//     ));
//     return (streams.length > 1 ? streams : streams[0]) as any;
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
    const upStreamDone = new rx.Subject<void>();
    const downStreamUnsub = new rx.BehaviorSubject(0);
    const countDownStream = new rx.BehaviorSubject(0);

    const replay$ = new rx.ReplaySubject<T>(replayCnt);

    return rx.merge(
      responding$.pipe(
        rx.tap(replay$),
        rx.ignoreElements(),
        rx.takeUntil(rx.combineLatest([upStreamDone, downStreamUnsub, countDownStream]).pipe(
          rx.filter(([, unsub, count]) => unsub === count)
        ))
      ),
      up.pipe(
        rx.map((ctxAction, idx) => {
          countDownStream.next(idx + 1);
          const filted$ = replay$.pipe(
            actionRelatedToAction(Array.isArray(ctxAction) ? ctxAction[0] : ctxAction),
            rx.finalize(() => downStreamUnsub.next(downStreamUnsub.getValue() + 1))
          );
          return mapFn ? mapFn(ctxAction, filted$) : filted$ as R;
        }),
        rx.finalize(() => {
          upStreamDone.next();
          upStreamDone.complete();
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

