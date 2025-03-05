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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.payloadRelatedToAction = void 0;
exports.actionRelatedToAction = actionRelatedToAction;
exports.actionRelatedToActionRelatives = actionRelatedToActionRelatives;
exports.actionOfContext = actionOfContext;
exports.combineLastestRelated = combineLastestRelated;
exports.pairActionToActionStream = pairActionToActionStream;
exports.throwErrorOnRelated = throwErrorOnRelated;
const rx = __importStar(require("rxjs"));
/** Rx operator function, filter action or payload stream by:
 *  action ID (Action['i'])
 **/
function actionRelatedToAction(actionOrMeta) {
    return function (up) {
        const helper = createActRelationshipPredHelper();
        return up.pipe(rx.filter(a => helper(actionOrMeta, a)));
    };
}
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
function createActRelationshipPredHelper() {
    let isPayload;
    return function (initialAct, related) {
        if (isPayload == null)
            isPayload = Array.isArray(related);
        const m = isPayload ? related[0] : related;
        return (m.r != null && m.r === initialAct.i) || (Array.isArray(m.r) && m.r.some(r => r === initialAct.i));
    };
}
/**
 * Logically, the result stream is a union of actionRelatedToAction() and actionRelatedToActionRelatives()
 */
function actionOfContext(actionOrMeta) {
    return function (up) {
        return rx.merge(actionOrMeta.i ? up.pipe(actionRelatedToAction(actionOrMeta)) : rx.EMPTY, up.pipe(actionRelatedToActionRelatives(actionOrMeta)));
    };
}
function combineLastestRelated(initial, ...related) {
    if (related.length === 0) {
        return initial.pipe(rx.map(a => [a]));
    }
    const isRelated = createActRelationshipPredHelper();
    const relates = combineLastestRelated(...related);
    return initial.pipe(rx.mergeMap(a => relates.pipe(rx.filter(b => isRelated(Array.isArray(a) ? a[0] : a, b[0])), rx.map(b => [a, ...b]))), rx.share());
}
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
        return rx.defer(() => rx.of(new rx.ReplaySubject(replayCnt))).pipe(rx.switchMap(replay$ => {
            return rx.merge(responding$.pipe(rx.tap(replay$), rx.ignoreElements()), up.pipe(rx.map(ctxAction => {
                const filted$ = replay$.pipe(actionRelatedToAction(Array.isArray(ctxAction) ? ctxAction[0] : ctxAction));
                return mapFn ? mapFn(ctxAction, filted$) : filted$;
            })));
        }));
    };
}
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
/** @deprecated use actionRelatedToAction instead */
exports.payloadRelatedToAction = actionRelatedToAction;
//# sourceMappingURL=context-operators.js.map