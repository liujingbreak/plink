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
/**
 * Return an Rx operator function, whose input Observable is so call "contextAction" stream and output Observable contains
 * a tuple of paired actions in form of `[contextAction, respondingEvent]` where the `respondingEvent`'s ActionMeta['r']
 * equals to or contains `contextAction`'s ActionMeta['i']. In another word, the input stream is initial actions stream, the
 * output stream will be corresponding responding event stream.
 */
function pairActionToActionStream(contextAction$) {
    return function (up) {
        // Use replaySubject to remedy case that context action message and corresponding responding message is sent in a synchronous invocation,
        // by the time context action being recieved, the responding message has also been sent, it will be too late to subscribe and catch
        // the responding message
        const replay$ = new rx.ReplaySubject(10);
        return rx.merge(new rx.Observable(sink => {
            up.subscribe(replay$);
            sink.complete();
        }), contextAction$.pipe(rx.mergeMap(ctxAction => {
            return replay$.pipe(actionRelatedToAction(Array.isArray(ctxAction) ? ctxAction[0] : ctxAction), rx.map(t => [ctxAction, t]));
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