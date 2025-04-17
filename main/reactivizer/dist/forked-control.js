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
exports.ForkedRxController = void 0;
exports.isForked = isForked;
const rx = __importStar(require("rxjs"));
const control2_1 = require("./control2");
/**
 * Use a forked RxController to extend functionality of existing reactors of another RxController or ForkedRxController.
 *
 * A forkes controller shares same message dispatch stream (actionUpstream) from the source controller's
 * So that messages dispatched from both controller can be recieved by both controller's `action$`
 * subscription stream.
 *
 * A message interceptor of source RxController can impact all forked controller.
 */
class ForkedRxController extends control2_1.RxController2 {
    constructor(src) {
        super();
        this.src = src;
        /** The forked base upStream, message being emitted to this stream will not go to any subscriber of current stream or controller */
        this.srcUpStream = new rx.Subject();
        this.haltActionId = null;
        this.config(Object.assign(Object.assign({}, src.opts), { debug: false }));
        src.configChange.pipe(rx.map(c => {
            c.delete('debug');
            return c;
        })).subscribe(this.configChange);
        this.forkUpStream = this.actionUpstream;
        this.actionUpstream = src.actionUpstream;
        src.appendInterceptor(a$ => {
            return rx.merge(a$.pipe(rx.map(a => {
                this.interceptableAction = a;
                // Ensure forked one recieve earlier than current controller
                this.forkUpStream.next(a);
                // Ensure action emitted later than prependController
                return a;
            }), rx.filter(a => a.i !== this.haltActionId)), this.srcUpStream);
        });
    }
    /**
     * This method is supposed to be invoked when a certain Action message is recieved, at the moment
     * source forked stream has not recieved the same message yet.
     * By executing this method, current action message will be prevented from being emitted to any subscribers
     * of source forked stream.
     *
     * @return a function to continue emitting the intercepted message to source forked stream with chance to
     *    change the payload content of the message.
     *    the returned emit function has one parameter to allow replacing action payload, or executed with no
     *    parameter to emit same action message without any change.
    **/
    interceptSrcAction(metaOrId) {
        var _a;
        const actionId = typeof metaOrId === 'number' ? metaOrId : metaOrId.i;
        if (actionId !== ((_a = this.interceptableAction) === null || _a === void 0 ? void 0 : _a.i)) {
            throw new Error(`Current interceptable action is ${this.interceptableAction ? '[id: ' + this.interceptableAction.i + ', type: ' + this.interceptableAction.t + ']' : this.interceptableAction}, ` +
                'which does not match action ID: ' + actionId);
        }
        this.haltActionId = actionId;
        return (...overridePayload) => {
            this.srcUpStream.next(overridePayload.length > 0 ? Object.assign(Object.assign({}, this.interceptableAction), { p: overridePayload }) :
                this.interceptableAction);
        };
    }
    /** @override */
    prependInterceptor(...interceptor) {
        return this.src.prependInterceptor(...interceptor);
    }
    /** @override */
    removeInterceptor(...interc) {
        this.src.removeInterceptor(...interc);
    }
    /** append interceptor to all source controllers
     * @returns a function to remove added interceptors
    **/
    appendInterceptorToSrc(...interceptors) {
        if (isForked(this.src))
            this.src.appendInterceptorToSrc(...interceptors);
        this.src.appendInterceptor(...interceptors);
        return () => {
            this.removeInterceptorFromSrc(...interceptors);
        };
    }
    removeInterceptorFromSrc(...interceptors) {
        if (isForked(this.src))
            this.src.removeInterceptorFromSrc(...interceptors);
        this.src.removeInterceptor(...interceptors);
    }
}
exports.ForkedRxController = ForkedRxController;
function isForked(t) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return t.appendInterceptorToSrc != null;
}
//# sourceMappingURL=forked-control.js.map