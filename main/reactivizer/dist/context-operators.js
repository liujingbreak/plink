"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.payloadRelatedToAction = exports.throwErrorOnRelated = exports.pairActionToActionStream = exports.actionOfContext = exports.actionRelatedToActionRelatives = exports.actionRelatedToAction = void 0;
const rx = __importStar(require("rxjs"));
/** Rx operator function, filter action or payload stream by:
 *  action ID (Action['i'])
 **/
function actionRelatedToAction(actionOrMeta) {
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
exports.actionRelatedToAction = actionRelatedToAction;
/** Rx operator function, filter action or payload stream by:
 *  action's reference IDs (Action['r'])
 **/
function actionRelatedToActionRelatives(actionOrMeta) {
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
exports.actionRelatedToActionRelatives = actionRelatedToActionRelatives;
/**
 * Logically, the result stream is a union of actionRelatedToAction() and actionRelatedToActionRelatives()
 */
function actionOfContext(actionOrMeta) {
    return function (up) {
        return rx.merge(actionOrMeta.i ? up.pipe(actionRelatedToAction(actionOrMeta)) : rx.EMPTY, up.pipe(actionRelatedToActionRelatives(actionOrMeta)));
    };
}
exports.actionOfContext = actionOfContext;
function pairActionToActionStream(responding$, syncCacheSize, mapFn) {
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
        const upStreamDone = new rx.Subject();
        const downStreamUnsub = new rx.BehaviorSubject(0);
        const countDownStream = new rx.BehaviorSubject(0);
        const replay$ = new rx.ReplaySubject(replayCnt);
        return rx.merge(responding$.pipe(rx.tap(replay$), rx.ignoreElements(), rx.takeUntil(rx.combineLatest([upStreamDone, downStreamUnsub, countDownStream]).pipe(rx.filter(([, unsub, count]) => unsub === count)))), up.pipe(rx.map((ctxAction, idx) => {
            countDownStream.next(idx + 1);
            const filted$ = replay$.pipe(actionRelatedToAction(Array.isArray(ctxAction) ? ctxAction[0] : ctxAction), rx.finalize(() => downStreamUnsub.next(downStreamUnsub.getValue() + 1)));
            return mapFn ? mapFn(ctxAction, filted$) : filted$;
        }), rx.finalize(() => {
            upStreamDone.next();
            upStreamDone.complete();
        })));
    };
}
exports.pairActionToActionStream = pairActionToActionStream;
function throwErrorOnRelated(actionOrMeta) {
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
exports.throwErrorOnRelated = throwErrorOnRelated;
/** @deprecated use actionRelatedToAction instead */
exports.payloadRelatedToAction = actionRelatedToAction;
//# sourceMappingURL=context-operators.js.map