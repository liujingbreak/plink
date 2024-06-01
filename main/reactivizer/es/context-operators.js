import * as rx from 'rxjs';
/** Rx operator function, filter action or payload stream by:
 *  action ID (Action['i'])
 **/
export function actionRelatedToAction(actionOrMeta) {
    return function (up) {
        let isPayload;
        return up.pipe(rx.filter(a => {
            if (isPayload == null)
                isPayload = Array.isArray(a);
            const m = isPayload ? a[0] : a;
            return (m.r != null && m.r === actionOrMeta.i) || (Array.isArray(m.r) && m.r.some(r => r === actionOrMeta.i));
        }));
    };
}
/** Rx operator function, filter action or payload stream by:
 *  action's reference IDs (Action['r'])
 **/
export function actionRelatedToActionRelatives(actionOrMeta) {
    return function (up) {
        let isPayload;
        return up.pipe(rx.filter(a => {
            if (isPayload == null)
                isPayload = Array.isArray(a);
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
/**
 * Logically, the result stream is a union of actionRelatedToAction() and actionRelatedToActionRelatives()
 */
export function actionOfContext(actionOrMeta) {
    return function (up) {
        return rx.merge(actionOrMeta.i ? up.pipe(actionRelatedToAction(actionOrMeta)) : rx.EMPTY, up.pipe(actionRelatedToActionRelatives(actionOrMeta)));
    };
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
        const replay$ = new rx.ReplaySubject(replayCnt);
        return rx.merge(responding$.pipe(rx.tap(replay$), rx.ignoreElements()), up.pipe(rx.map(ctxAction => {
            const filted$ = replay$.pipe(actionRelatedToAction(Array.isArray(ctxAction) ? ctxAction[0] : ctxAction));
            return mapFn ? mapFn(ctxAction, filted$) : filted$;
        })));
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