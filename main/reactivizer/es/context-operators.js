import * as rx from 'rxjs';
/** Rx operator function, filter action or payload stream by:
 *  action ID (Action['i'])
 **/
export function actionRelatedToAction(actionOrMeta) {
    return function (up) {
        const helper = createActRelationshipPredHelper();
        return up.pipe(rx.filter(a => helper(actionOrMeta, a)));
    };
}
/** Rx operator function, filter action or payload stream by:
 *  action's reference IDs (Action['r'])
 **/
export function actionRelatedToActionRelatives(actionOrMeta) {
    return function (up) {
        let isPayload;
        return up.pipe(rx.filter(a => {
            isPayload !== null && isPayload !== void 0 ? isPayload : (isPayload = Array.isArray(a));
            const m = isPayload ? a[0] : a;
            if (m.r == null || actionOrMeta.r == null)
                return false;
            if (!Array.isArray(m.r)) {
                if (!Array.isArray(actionOrMeta.r)) {
                    return m.r === actionOrMeta.r;
                }
                else {
                    return actionOrMeta.r.some(item => item === m.r);
                }
            }
            else {
                if (Array.isArray(actionOrMeta.r)) {
                    return m.r.some(item => actionOrMeta.r.some(ai => ai === item));
                }
                else {
                    return m.r.some(item => actionOrMeta.r === item);
                }
            }
            // const left = Array.isArray(m.r) ? m.r : [m.r];
            // const right = Array.isArray(actionOrMeta.r) ? actionOrMeta.r : [actionOrMeta.r];
            // return left.some(lItem => right.some(rItem => rItem === lItem));
        }));
    };
}
function createActRelationshipPredHelper() {
    let isPayload;
    return function (initialAct, related) {
        isPayload !== null && isPayload !== void 0 ? isPayload : (isPayload = Array.isArray(related));
        const m = isPayload ? related[0] : related;
        return (m.r != null && m.r === initialAct.i) || (Array.isArray(m.r) && m.r.some(r => r === initialAct.i));
    };
}
/**
 * Logically, the result stream is a union of actionRelatedToAction() and actionRelatedToActionRelatives()
 */
export function actionOfContext(actionOrMeta) {
    return function (up) {
        return rx.merge(actionOrMeta.i ? up.pipe(actionRelatedToAction(actionOrMeta)) : rx.EMPTY, up.pipe(actionRelatedToActionRelatives(actionOrMeta)));
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
export function combineLastestRelated(initial, ...related) {
    if (related.length === 0) {
        return initial.pipe(rx.map(a => [a]));
    }
    const isRelated = createActRelationshipPredHelper();
    const relates = combineLastestRelated(...related);
    return initial.pipe(rx.mergeMap(a => relates.pipe(rx.filter(b => isRelated(Array.isArray(a) ? a[0] : a, b[0])), rx.map(b => [a, ...b]))), rx.share());
}
export function pairActionToActionStream(responding$, syncCacheSize, mapFn) {
    return function (up) {
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
        return rx.defer(() => rx.of(new rx.ReplaySubject(replayCnt))).pipe(rx.switchMap(replay$ => {
            return rx.merge(responding$.pipe(rx.tap(replay$), rx.ignoreElements()), up.pipe(rx.map(ctxAction => {
                const filted$ = replay$.pipe(actionRelatedToAction(Array.isArray(ctxAction) ? ctxAction[0] : ctxAction));
                return mapFn ? mapFn(ctxAction, filted$) : filted$;
            })));
        }));
    };
}
export function throwErrorOnRelated(actionOrMeta) {
    return function (up) {
        return up.pipe(rx.map(actionOrPayload => {
            const isPayload = Array.isArray(actionOrPayload);
            // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
            const m = isPayload ? actionOrPayload[0] : actionOrPayload;
            if ((m.r != null && m.r === actionOrMeta.i) || (Array.isArray(m.r) && m.r.some(r => r === actionOrMeta.i))) {
                throw isPayload ? actionOrPayload[1] : actionOrPayload.p[0];
            }
            return actionOrPayload;
        }));
    };
}
/** @deprecated use actionRelatedToAction instead */
export const payloadRelatedToAction = actionRelatedToAction;
//# sourceMappingURL=context-operators.js.map